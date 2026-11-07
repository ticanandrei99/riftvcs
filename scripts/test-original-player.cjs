const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process'),webpack=require('webpack');
const {WebSocket:ServerSocket}=require('../server/node_modules/ws');
const root=path.resolve(__dirname,'..'),port=32013,webPort=9344,debugPort=9334;
const password='original-player-local-test-password',origin='http://127.0.0.1:'+webPort,api='http://127.0.0.1:'+port;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(read,label){for(let i=0;i<200;i++){const value=await read();if(value)return value;await delay(100);}throw Error('Original player timeout: '+label);}
async function cdp(target){
  const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((yes,no)=>{socket.onopen=yes;socket.onerror=no;});let serial=0;const pending=new Map();
  socket.onmessage=event=>{const msg=JSON.parse(event.data),entry=pending.get(msg.id);if(entry){pending.delete(msg.id);clearTimeout(entry.timer);msg.error?entry.no(Error('Browser command failed')):entry.yes(msg.result);}};
  const call=(method,params={})=>new Promise((yes,no)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);no(Error('Browser command timeout: '+method));},30000);pending.set(id,{yes,no,timer});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const value=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(value.exceptionDetails)throw Error(value.exceptionDetails.exception?.description||'Browser evaluation failed');return value.result.value;};
  await call('Runtime.enable');return {socket,call,evaluate,wait:(expression,label)=>until(()=>evaluate(expression),label),field:(id,value)=>evaluate('document.getElementById('+JSON.stringify(id)+').value='+JSON.stringify(value)),click:id=>evaluate('document.getElementById('+JSON.stringify(id)+').click()')};
}
async function main(){
  const output=path.join(root,'verification/original-player-browser');fs.mkdirSync(output,{recursive:true});
  const config=require('../webpack.config');config.entry=path.join(root,'tests/browser/original-player.js');config.output={path:output,filename:'bundle.js'};config.mode='development';config.devtool=false;
  config.plugins=[...config.plugins.filter(plugin=>plugin.constructor.name==='NormalModuleReplacementPlugin'),new webpack.DefinePlugin({__PROXCHAT_SERVER__:JSON.stringify(api),__VOXDRIA_VERSION__:JSON.stringify(require('../package.json').version)})];
  await new Promise((yes,no)=>webpack(config,(error,stats)=>error?no(error):stats.hasErrors()?no(Error(stats.toString({all:false,errors:true}))):yes()));
  const backend=spawn(process.execPath,['dist/bootstrap.js'],{cwd:path.join(root,'server'),env:{...process.env,PORT:String(port),ORGANIZER_PASSWORD:password,MODERATOR_PASSWORD:'',MODERATOR_ACCOUNTS_JSON:'[]',ORGANIZER_STORE_PATH:'',PLAYER_GRANTS_JSON:'[]',CASTER_GRANTS_JSON:'[]',TURN_KEY_ID:'',TURN_KEY_API_TOKEN:'',TURN_URLS:'turn:test.invalid:3478',TURN_USERNAME:'local-test',TURN_PASSWORD:'local-test',TURN_SERVER:'',TURN_SECRET:'',RIFTVOICE_INSECURE_TEST_MODE:'0',ENEMY_CAMERA_VOICE:'0',CAMERA_MEDIA_LOOPBACK_TEST:'0',ALLOWED_WEB_ORIGINS:origin},windowsHide:true,stdio:'ignore'});
  const caster=fs.readFileSync(path.join(root,'src/caster/caster.html'),'utf8').replace('<script src="caster.js"></script>','<script src="/bundle.js"></script>');
  const player='<!doctype html><html lang="ro"><meta charset="utf-8"><title>Voxdria original player test</title><body><section id="voice-invitation-panel"></section><script src="/bundle.js"></script></body></html>';
  const server=http.createServer((req,res)=>{const script=req.url==='/bundle.js',style=req.url?.endsWith('caster.css');res.setHeader('Content-Type',script?'text/javascript':style?'text/css':'text/html; charset=utf-8');res.end(script?fs.readFileSync(path.join(output,'bundle.js')):style?fs.readFileSync(path.join(root,'src/caster/caster.css')):req.url==='/caster'?caster:player);});
  let edge,casterSocket,ownerSocket;const tabs=[],checks=[];
  try{
    await until(async()=>{try{return(await fetch(api+'/health')).ok;}catch{return false;}},'server startup');await new Promise(resolve=>server.listen(webPort,'127.0.0.1',resolve));
    const health=await(await fetch(api+'/health')).json();if(health.originalPlayerProtocol!==1||health.originalPlayerFiltering!=='upstream-client-camera')throw Error('Original player protocol not advertised');
    if((await fetch(api+'/player/compute-volumes',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status!==403)throw Error('Unauthenticated volume request accepted');
    checks.push('Production authentication remains enabled; new protocol and client filtering are explicit; unauthenticated volumes denied');
    edge=spawn(process.env.EDGE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',['--headless=new','--no-first-run','--no-default-browser-check','--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding','--remote-debugging-port='+debugPort,'--user-data-dir='+path.join(output,'edge-profile-'+Date.now()),origin+'/caster'],{windowsHide:true,stdio:'ignore'});
    const target=await until(async()=>{try{return(await(await fetch('http://127.0.0.1:'+debugPort+'/json')).json()).find(t=>t.url===origin+'/caster');}catch{return false;}},'browser startup');
    const admin=await cdp(target);tabs.push(admin);await admin.wait('!!document.getElementById("organizer-login")?.onclick','organizer mounted');await admin.field('organizer-password',password);await admin.click('organizer-login');await admin.wait('!document.getElementById("organizer-controls").disabled','admin login');await admin.click('organizer-create');await admin.wait('!!document.getElementById("organizer-invite")','event created');
    const invitation=await admin.evaluate('document.getElementById("organizer-invite").value');
    ownerSocket=new ServerSocket('ws://127.0.0.1:'+port+'/organizer');const ownerMessages=[];ownerSocket.on('message',raw=>ownerMessages.push(JSON.parse(raw.toString())));
    await new Promise((yes,no)=>{ownerSocket.once('open',yes);ownerSocket.once('error',no);});ownerSocket.send(JSON.stringify({type:'organizer_auth',password}));
    const ownerState=await until(()=>ownerMessages.find(value=>value.type==='organizer_state'),'organizer protocol state'),casterToken=ownerState.events[0].casterInvitation;
    const row=name=>'Array.from(document.querySelectorAll(".organizer-person")).find(e=>e.textContent.includes('+JSON.stringify(name)+'))';
    const choose=async(scope,label)=>{if(!await admin.evaluate('(()=>{const row='+scope+';const button=row&&Array.from(row.querySelectorAll("button")).find(b=>b.textContent==='+JSON.stringify(label)+');if(!button||button.disabled)return false;button.click();return true;})()'))throw Error('Missing organizer action: '+label);};
    const players=[];
    for(const [name,team] of [['Alice#EU','ORDER'],['Bob#EU','CHAOS']]){
      const target=await(await fetch('http://127.0.0.1:'+debugPort+'/json/new?'+encodeURIComponent(origin+'/player?name='+encodeURIComponent(name)),{method:'PUT'})).json(),tab=await cdp(target);tabs.push(tab);players.push(tab);
      await tab.wait('!!window.fixture','player mounted');await tab.field('voice-invitation',`Voxdria · Test\nServer vocal: ${api}\nCod vocal Voxdria: ${invitation}`);await tab.field('lobby-riot-id',name);await tab.click('voice-invitation-save');await tab.wait('window.fixture.state().phase==="pending"','reservation pending');await admin.wait(row(name)+'!==undefined','request in unchanged Caster');
      await choose(row(name),team==='ORDER'?'Aprobă Albastru':'Aprobă Roșu');await tab.wait('window.fixture.state().phase==="approved"','reservation approved');
      if(await tab.evaluate('window.fixture.state().microphoneRequests')!==0||await tab.evaluate('!!document.getElementById("lobby-voice-connect")'))throw Error('Pregame audio opened or lobby voice control remained');
    }
    checks.push('Unchanged Caster approves real RV reservations on opposing teams; player panel opens no microphone and offers no lobby audio');
    const [alice,bob]=players;for(const tab of players)await tab.evaluate('window.fixture.startGame()');
    for(const tab of players)await tab.wait('window.fixture.state().authorized&&window.fixture.state().peers.some(peer=>peer.connection==="connected"&&peer.volume>.8)','original peer connected and audible');
    const rms={aliceReceivesBob:await alice.evaluate('window.fixture.measure("Bob#EU")'),bobReceivesAlice:await bob.evaluate('window.fixture.measure("Alice#EU")')};if(Object.values(rms).some(value=>!(value>.005)))throw Error('Original audio did not arrive in both directions');
    checks.push('Actual original Orchestrator, AudioService and PeerConnection plus approved adapters negotiate opposing-team WebRTC and carry synthetic microphone audio in BOTH directions');
    await bob.evaluate('window.fixture.far()');for(const tab of players)await tab.wait('window.fixture.state().peers.every(peer=>peer.volume<.01)','far enemy silent');await bob.evaluate('window.fixture.near()');for(const tab of players)await tab.wait('window.fixture.state().peers.every(peer=>peer.volume>.8)','near enemy audible again');
    checks.push('Original distance calculation and original audio gain stop the far opponent and restore the nearby opponent in both directions');
    await alice.evaluate('window.fixture.mutePeer("Bob#EU")');await alice.wait('window.fixture.state().peers[0].muted','individual enemy mute');await alice.evaluate('window.fixture.mutePeer("Bob#EU")');await alice.wait('!window.fixture.state().peers[0].muted','individual enemy unmute');
    await alice.evaluate('window.fixture.deafen()');await alice.wait('window.fixture.state().peers[0].muted','deafen');await alice.evaluate('window.fixture.deafen()');await alice.evaluate('window.fixture.muteSelf()');await alice.wait('window.fixture.state().microphone===false','self mute');await alice.evaluate('window.fixture.muteSelf()');
    await alice.evaluate('window.fixture.ptt(false)');await alice.wait('window.fixture.state().microphone===false','PTT released');await alice.evaluate('window.fixture.ptt(true)');await alice.wait('window.fixture.state().microphone===true','PTT held');
    checks.push('Original individual opponent mute, unmute, receive mute, self mute and push-to-talk operate on real media tracks/elements');
    const bad=await alice.evaluate('window.fixture.api("/player/compute-volumes",{roomId:window.fixture.state().room,name:"Bob#EU",myPosition:{x:1000,y:1000},allyProximity:true})');if(bad.status!==400)throw Error('Another player volume identity accepted');
    casterSocket=new ServerSocket('ws://127.0.0.1:'+port+'/caster');const messages=[];casterSocket.on('message',raw=>messages.push(JSON.parse(raw.toString())));await new Promise((yes,no)=>{casterSocket.once('open',yes);casterSocket.once('error',no);});casterSocket.send(JSON.stringify({type:'caster_join',token:casterToken}));
    const ready=await until(()=>messages.find(value=>value.type==='caster_ready'),'old Caster admitted');if(ready.peers.length)throw Error('Caster discovered active players');
    if((await fetch(api+'/player/compute-volumes',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+ready.sessionToken},body:'{}'})).status!==403)throw Error('Caster queried player volumes');
    checks.push('Caster 0.4.2 protocol still joins its separate empty channel; it cannot discover active players or query their volumes; player impersonation rejected');
    await choose(row('Bob#EU'),'Mute de moderare');await bob.wait('!window.fixture.state().authorized&&window.fixture.state().tracks.every(state=>state==="ended")','moderation closes original media');await alice.wait('window.fixture.state().peers.length===0','revoked peer removed');
    checks.push('Organizer moderation immediately revokes the new player session, closes microphone tracks and removes the remote peer');
    await alice.evaluate('window.fixture.endGame()');await alice.wait('!window.fixture.state().authorized&&window.fixture.state().tracks.every(state=>state==="ended")','end-game cleanup');
    checks.push('Game end tears down the original audio session and microphone; registration alone never keeps voice running');
    for(const tab of players)if((await tab.evaluate('window.fixture.state().errors')).length)throw Error('Unexpected browser errors during original player proof');
    const receipt={version:require('../package.json').version,status:'passed',scope:'Real local HTTP/WebSocket, actual organizer UI and player panel, original game-state parsing, Orchestrator, audio and peer implementations. Native game/capture and microphone are scripted; loopback ICE is an explicit test factory. No real LoL game, physical microphone, GPU, OBS or external TURN test.',syntheticReceivedRms:rms,checks};
    fs.writeFileSync(path.join(root,'verification/original-player-browser-proof.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
  }catch(error){
    const diagnostic=[];for(const tab of tabs){try{diagnostic.push(await tab.evaluate('({player:window.fixture?.state(),status:document.getElementById("voice-invitation-status")?.textContent,organizer:document.getElementById("organizer-status")?.textContent})'));}catch{}}
    fs.writeFileSync(path.join(root,'verification/original-player-browser-failure.json'),JSON.stringify(diagnostic,null,2));throw error;
  }finally{
    ownerSocket?.terminate();casterSocket?.terminate();for(const tab of tabs){try{await tab.evaluate('window.fixture?.stop()');}catch{}}
    if(tabs[0]?.socket.readyState===WebSocket.OPEN)tabs[0].socket.send(JSON.stringify({id:999999,method:'Browser.close'}));for(const tab of tabs)tab.socket.close();edge?.kill();backend.kill();server.closeAllConnections();server.close();
  }
}
main().then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1);});
