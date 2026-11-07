// Opt-in network test: RIFTVOICE_TURN_TEST_CREDENTIALS points to a private
// {iceServers:[{urls,username,credential}]} file supplied by the relay operator.
// Uses the production authenticated signaling path and factory, never a mic.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const webpack = require('webpack');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const cameraMode = process.argv.includes('--camera-local') || process.argv.includes('--camera-relay');
const loopbackMedia = process.argv.includes('--camera-local');
const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'verification', cameraMode ? 'camera-media-browser' : 'turn-relay');
const origin = 'http://127.0.0.1:9420';
const api = 'http://127.0.0.1:9419';
const debug = 'http://127.0.0.1:9421';

async function connectCdp(target) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((yes, no) => { socket.onopen = yes; socket.onerror = no; });
  let serial = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data), waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id); clearTimeout(waiter.timeout);
    message.error ? waiter.no(Error('Browser command failed')) : waiter.yes(message.result);
  };
  const call = (method, params) => new Promise((yes, no) => {
    const id = ++serial;
    const timeout = setTimeout(() => { pending.delete(id); no(Error('Browser command timed out: ' + method)); }, 45000);
    pending.set(id, { yes, no, timeout }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) throw Error(response.exceptionDetails.exception?.description || 'Relay browser test failed');
    return response.result.value;
  };
  return { socket, call, evaluate };
}

async function main() {
  if (!loopbackMedia && !process.env.RIFTVOICE_TURN_TEST_CREDENTIALS) throw Error('Set RIFTVOICE_TURN_TEST_CREDENTIALS to an operator-provided private credentials file');
  const credentials = loopbackMedia ? {iceServers:[{urls:'turn:unused.invalid:3478',username:'test',credential:'test'}]} : JSON.parse(fs.readFileSync(process.env.RIFTVOICE_TURN_TEST_CREDENTIALS, 'utf8'));
  const relay = credentials.iceServers?.find(s => s.username && s.credential && [s.urls].flat().some(url => /^turns?:/.test(url)));
  if (!relay || typeof relay.username !== 'string' || typeof relay.credential !== 'string') throw Error('Usable TURN credentials missing');
  const urls = [relay.urls].flat().filter(url => /^turns?:/.test(url));
  fs.mkdirSync(outputDir, { recursive: true });
  const config = require(path.join(root, 'webpack.config.js'));
  config.entry = path.join(root, 'tests/browser/turn-relay.js');
  config.output = { path: outputDir, filename: 'bundle.js' };
  config.plugins = [new webpack.DefinePlugin({ __PROXCHAT_SERVER__: JSON.stringify(api) })];
  config.mode = 'development'; config.devtool = false;
  await new Promise((yes, no) => webpack(config, (error, stats) => error ? no(error) : stats.hasErrors() ? no(Error(stats.toString({ all: false, errors: true }))) : yes()));
  const grants = ['RelayAlice', 'RelayBob'].map((name,i) => ({ name, token: crypto.randomBytes(32).toString('base64url'), room: 'relay-qa-' + process.pid, team: cameraMode && i ? 'CHAOS' : 'ORDER', role: 'player', expiresAt: Date.now() + 180000 }));
  const serverEnv = { ...process.env, PORT: '9419', PLAYER_GRANTS_JSON: JSON.stringify(grants), CASTER_GRANTS_JSON: '[]', ALLOWED_WEB_ORIGINS: origin,
    RIFTVOICE_INSECURE_TEST_MODE: '', TURN_KEY_ID: '', TURN_KEY_API_TOKEN: '', TURN_SERVER: '', TURN_SECRET: '',
    TURN_URLS: loopbackMedia ? '' : urls.join(','), TURN_USERNAME: relay.username, TURN_PASSWORD: relay.credential,
    ENEMY_CAMERA_VOICE:cameraMode?'1':'0',CAMERA_MEDIA_LOOPBACK_TEST:loopbackMedia?'1':'0' };
  const server = spawn(process.execPath, ['server/dist/index.js'], { cwd: root, env: serverEnv, windowsHide: true, stdio: 'ignore' });
  const html = http.createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    if (request.url === '/bundle.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(fs.readFileSync(path.join(outputDir, 'bundle.js'))); }
    else { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><title>Voxdria synthetic relay QA</title><script src="/bundle.js"></script>'); }
  });
  let browser;
  const clients = [];
  let stage = 'server startup';
  try {
    let health;
    for (let i = 0; i < 50; i++) { try { health = await (await fetch(api + '/health')).json(); if (health.status === 'ok') break; } catch {} await wait(100); }
    if (!health?.authenticationRequired || !health.teamIsolation) throw Error('Production security settings not active');
    const unauthenticatedStatus = (await fetch(api + '/turn-credentials')).status;
    if (unauthenticatedStatus !== 401) throw Error('TURN endpoint accepted an unauthenticated request');
    await new Promise((yes, no) => { html.once('error', no); html.listen(9420, '127.0.0.1', yes); });
    stage = 'browser startup';
    browser = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9421', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--user-data-dir=' + path.join(outputDir, 'edge-profile'), origin], { windowsHide: true, stdio: 'ignore' });
    let first;
    for (let i = 0; i < 80 && !first; i++) { try { first = (await (await fetch(debug + '/json')).json()).find(t => t.url.startsWith(origin)); } catch {} if (!first) await wait(100); }
    if (!first) throw Error('Relay test browser did not start');
    clients.push(await connectCdp(first));
    const created = await clients[0].call('Target.createTarget', { url: origin });
    let second;
    for (let i = 0; i < 40 && !second; i++) { second = (await (await fetch(debug + '/json')).json()).find(t => t.id === created.targetId); if (!second) await wait(100); }
    if (!second) throw Error('Second relay participant missing');
    clients.push(await connectCdp(second));
    for (let i = 0; i < 2; i++) {
      stage = 'authenticate participant ' + (i + 1); console.log(stage);
      for (let n = 0; n < 80 && !(await clients[i].evaluate('typeof window.setupRelayParticipant === "function"')); n++) await wait(100);
      await clients[i].evaluate('window.setupRelayParticipant(' + JSON.stringify({ name: grants[i].name, invitation: grants[i].token, room: grants[i].room, frequency: i ? 660 : 440,team:grants[i].team,loopbackTest:loopbackMedia }) + ')');
    }
    await wait(500);
    stage = 'create offer'; console.log(stage);
    await clients[0].evaluate('window.offerRelayConnection("RelayBob")');
    if (cameraMode) {
      stage='camera media delivery assertions';
      await Promise.all(clients.map(c=>c.evaluate('window.waitForRelayConnection()')));
      const configure=(i,value)=>clients[i].evaluate('window.configureCameraProof('+JSON.stringify(value)+')');
      const tests=[];
      const check=async(label,expectedAudible)=>{
        const measured=await clients[0].evaluate('window.sampleCameraProof()');
        const privateRoute=loopbackMedia || (measured.iceTransportPolicy==='relay'&&measured.localCandidateType==='relay'&&measured.remoteCandidateType==='relay');
        const passed=privateRoute && measured.errors.length===0 && (expectedAudible ? measured.receivedBytesDuringSample>0 && measured.rms>0.0001 : measured.receivedBytesDuringSample===0 && measured.rms<0.00001);
        tests.push({label,passed,expectedAudible,...measured});
        console.log(JSON.stringify(tests.at(-1)));if(!passed)throw Error('Camera media assertion failed: '+label);
      };
      await configure(0,{enabled:false});await configure(1,{enabled:false});await check('no consent, no enemy RTP',false);
      await configure(0,{});await check('both participants must opt in',false);
      await configure(1,{});await check('nearby visible enemy inside camera',true);
      const reverse=await clients[1].evaluate('window.sampleCameraProof()');
      if(reverse.receivedBytesDuringSample<=0||reverse.rms<=0.0001)throw Error('Reverse enemy audio missing');
      tests.push({label:'reverse audio direction',passed:true,...reverse});
      await configure(0,{camera:{x:1000,y:1000,w:400,h:400}});await check('nearby but outside camera',false);
      await configure(0,{hidden:true});await clients[0].evaluate('window.forceCameraPlayback()');await check('missing visible icon, client forcibly unmutes',false);
      await configure(0,{enemyX:3000,camera:{x:3000,y:1000,w:6000,h:1000}});await check('inside camera but outside proximity',false);
      await configure(0,{});await check('new visible frame restores voice',true);
      await configure(0,{replay:true});await check('replayed frame cannot renew visibility',false);
      await configure(0,{});await check('fresh frame after replay',true);
      await configure(0,{stopped:true});await check('capture or heartbeat stops',false);
      await configure(0,{dead:true});await check('dead listener cannot receive enemy voice',false);
      await configure(0,{});await configure(1,{dead:true});await check('dead speaker is blocked',false);
      await configure(1,{});await check('respawn plus fresh frame restores voice',true);
      await configure(0,{enabled:false});await check('user disables enemy camera mode',false);
      const report={passed:tests.every(t=>t.passed),transport:loopbackMedia?'real WebRTC gateway on loopback':'real WebRTC gateway through external TURN',productionAuthentication:true,serverDropsBlockedRtp:true,visibilityInput:'synthetic reports, not real LoL',microphoneUsed:false,tests};
      fs.writeFileSync(path.join(root,'verification',loopbackMedia?'camera-media-loopback-result.json':'camera-media-relay-result.json'),JSON.stringify(report,null,2));
      return;
    }
    stage = 'connect relay and measure tone'; console.log(stage);
    const participants = await Promise.all(clients.map((client, i) => client.evaluate('window.inspectRelayConnection(' + (i ? 440 : 660) + ')')));
    const report = { passed: participants.every(p => p.passed), productionAuthentication: true, teamIsolation: true, unauthenticatedTurnStatus: unauthenticatedStatus, microphoneUsed: false, networkScope: 'Two local browser sessions using the real external TURN relay; not a multi-network field test', participants };
    fs.writeFileSync(path.join(root, 'verification', 'real-turn-relay-result.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) throw Error('TURN transport or synthetic audio assertions failed');
  } catch (error) {
    console.error('Failure during ' + stage);
    for (const client of clients) console.error(JSON.stringify(await client.evaluate('window.relayStatus?.()').catch(() => ({ unavailable: true }))));
    throw error;
  } finally {
    for (const client of clients) await client.evaluate('window.closeRelayParticipant?.()').catch(() => {});
    if (clients[0]) await clients[0].call('Browser.close', {}).catch(() => {});
    clients.forEach(client => client.socket.close()); browser?.kill();
    html.closeAllConnections(); html.close(); server.kill();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
