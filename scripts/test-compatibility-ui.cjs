const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process');const webpack=require('webpack');
const root=path.resolve(__dirname,'..'),port=32011,webPort=9342,debugPort=9336;
const password='compatibility-test-admin-only',origin='http://127.0.0.1:'+webPort,api='http://127.0.0.1:'+port;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(read,label){for(let i=0;i<200;i++){const value=await read();if(value)return value;await delay(100);}throw Error('Compatibility timeout: '+label);}
async function cdp(target){
  const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((yes,no)=>{socket.onopen=yes;socket.onerror=no;});let serial=0;const pending=new Map();
  socket.onmessage=event=>{const msg=JSON.parse(event.data),entry=pending.get(msg.id);if(entry){pending.delete(msg.id);clearTimeout(entry.timer);msg.error?entry.no(Error('Browser command failed')):entry.yes(msg.result);}};
  const call=(method,params={})=>new Promise((yes,no)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);no(Error('Browser command timeout: '+method));},30000);pending.set(id,{yes,no,timer});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const value=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(value.exceptionDetails)throw Error(value.exceptionDetails.exception?.description||'Browser evaluation failed');return value.result.value;};
  await call('Runtime.enable');return {socket,call,evaluate,wait:(expr,label)=>until(()=>evaluate(expr),label),field:(id,value)=>evaluate('document.getElementById('+JSON.stringify(id)+').value='+JSON.stringify(value)),click:id=>evaluate('document.getElementById('+JSON.stringify(id)+').click()')};
}
async function main(){
  const output=path.join(root,'verification/compatibility-browser');fs.mkdirSync(output,{recursive:true});
  const config=require('../webpack.config');config.entry=path.join(root,'tests/browser/compatibility.js');config.output={path:output,filename:'bundle.js'};config.mode='development';config.devtool=false;
  config.plugins=[new webpack.DefinePlugin({__PROXCHAT_SERVER__:JSON.stringify(api),__VOXDRIA_VERSION__:JSON.stringify(require('../package.json').version)})];
  await new Promise((yes,no)=>webpack(config,(error,stats)=>error?no(error):stats.hasErrors()?no(Error(stats.toString({all:false,errors:true}))):yes()));
  const audioGrants=[{token:'p'.repeat(43),name:'AudioCaster',role:'caster',room:'audio-ui-fixture',expiresAt:Date.now()+3600000},{token:'q'.repeat(43),name:'AudioSpectator',role:'spectator',room:'audio-ui-fixture',expiresAt:Date.now()+3600000}];
  const backend=spawn(process.execPath,['dist/bootstrap.js'],{cwd:path.join(root,'server'),env:{...process.env,PORT:String(port),ORGANIZER_PASSWORD:password,MODERATOR_PASSWORD:'',MODERATOR_ACCOUNTS_JSON:'[]',ORGANIZER_STORE_PATH:'',PLAYER_GRANTS_JSON:'[]',CASTER_GRANTS_JSON:JSON.stringify(audioGrants),TURN_KEY_ID:'',TURN_KEY_API_TOKEN:'',TURN_URLS:'',TURN_USERNAME:'',TURN_PASSWORD:'',TURN_SERVER:'',TURN_SECRET:'',RIFTVOICE_INSECURE_TEST_MODE:'0',ENEMY_CAMERA_VOICE:'0',CAMERA_MEDIA_LOOPBACK_TEST:'0',ALLOWED_WEB_ORIGINS:origin},windowsHide:true,stdio:'ignore'});
  const caster=fs.readFileSync(path.join(root,'src/caster/caster.html'),'utf8').replace('<script src="caster.js"></script>','<script src="/bundle.js"></script>');
  const player='<!doctype html><html lang="ro"><meta charset="utf-8"><title>Voxdria compatibility fixture</title><body style="background:#10090d;color:#fff"><section id="voice-invitation-panel"></section><script src="/bundle.js"></script></body></html>';
  const server=http.createServer((req,res)=>{const script=req.url==='/bundle.js',style=req.url?.endsWith('caster.css');res.setHeader('Content-Type',script?'text/javascript':style?'text/css':'text/html; charset=utf-8');res.end(script?fs.readFileSync(path.join(output,'bundle.js')):style?fs.readFileSync(path.join(root,'src/caster/caster.css')):req.url?.startsWith('/caster')?caster:player);});
  let edge;const tabs=[],checks=[];
  try{
    await until(async()=>{try{return(await fetch(api+'/health')).ok;}catch{return false;}},'server startup');await new Promise(resolve=>server.listen(webPort,'127.0.0.1',resolve));
    edge=spawn(process.env.EDGE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',['--headless=new','--no-first-run','--no-default-browser-check','--autoplay-policy=no-user-gesture-required','--remote-debugging-port='+debugPort,'--user-data-dir='+path.join(output,'edge-profile-'+Date.now()),origin+'/caster'],{windowsHide:true,stdio:'ignore'});
    const target=await until(async()=>{try{return(await(await fetch('http://127.0.0.1:'+debugPort+'/json')).json()).find(t=>t.url===origin+'/caster');}catch{return false;}},'browser startup');
    const admin=await cdp(target);tabs.push(admin);await admin.wait('!!document.getElementById("organizer-login")','caster loaded');await admin.field('organizer-password',password);await admin.click('organizer-login');await admin.wait('!document.getElementById("organizer-controls").disabled','admin authentication');await admin.click('organizer-create');await admin.wait('!!document.getElementById("organizer-invite")','voice code');
    const invitation=await admin.evaluate('document.getElementById("organizer-invite").value');
    if(!await admin.evaluate('document.title==="Voxdria Caster"&&document.querySelector("h1").textContent.includes("Voxdria Caster")'))throw Error('Caster did not display the Voxdria identity');
    checks.push('Actual Caster title and heading display Voxdria Caster');
    const players=[];
    const row=name=>'Array.from(document.querySelectorAll(".organizer-person")).find(e=>e.textContent.includes('+JSON.stringify(name)+'))';
    for(const name of ['Alice#EU','Bob#EU']){
      const target=await(await fetch('http://127.0.0.1:'+debugPort+'/json/new?'+encodeURIComponent(origin+'/player'),{method:'PUT'})).json();const playerTab=await cdp(target);tabs.push(playerTab);players.push(playerTab);
      await playerTab.wait('!!window.fixture','player loaded');
      await playerTab.field('voice-invitation',`Voxdria · Fixture\nServer vocal: ${api}\nCod vocal${name.startsWith('Alice')?' RiftVoice':' Voxdria'}: ${invitation}`);await playerTab.field('lobby-riot-id',name);await playerTab.click('voice-invitation-save');
      await playerTab.wait('window.fixture.state().phase==="pending"','request pending');await admin.wait(row(name)+'!==undefined','request visible in Caster');
      await admin.evaluate(row(name)+'.querySelector("button").click()');await playerTab.wait('window.fixture.state().media==="ready"','lobby audio admitted');
    }
    const [alice,bob]=players;await alice.wait('window.fixture.state().quality?.connected===1','real WebRTC connected');await bob.wait('window.fixture.state().quality?.connected===1','reverse WebRTC connected');
    const rms=await bob.evaluate('window.fixture.measure("Alice#EU")');if(!(rms>.005))throw Error('Synthetic audio did not reach the other admitted teammate');checks.push('Complete Caster invitation pasted in the actual player panel produces pending approval, private reservation and real same-team WebRTC audio');
    await bob.evaluate('document.getElementById("lobby-stream-mute").checked=true;document.getElementById("lobby-stream-mute").dispatchEvent(new Event("change"))');await bob.wait('window.fixture.state().muted.every(peer=>peer.muted)&&window.fixture.state().microphone===true','incoming gate');checks.push('Stream gate mutes incoming voices while the sender microphone track stays enabled');
    await bob.evaluate('document.getElementById("lobby-stream-mute").checked=false;document.getElementById("lobby-stream-mute").dispatchEvent(new Event("change"))');await bob.wait('window.fixture.state().muted.every(peer=>!peer.muted)','gate reopened');
    await admin.evaluate(row('Bob#EU')+'.querySelectorAll("button")[1].click()');await bob.wait('window.fixture.state().muted===undefined||window.fixture.state().media==="blocked"','moderation stop');
    await bob.wait('window.fixture.state().media==="blocked"','moderated voice blocked');await admin.evaluate(row('Bob#EU')+'.querySelectorAll("button")[1].click()');await delay(500);
    if(await bob.evaluate('window.fixture.state().media==="ready"'))throw Error('Unmute bypassed manual reconnection');await bob.click('lobby-voice-connect');await bob.wait('window.fixture.state().quality?.connected===1','manual reconnection');checks.push('Moderation closes audio; reactivation requires the participant to reconnect');
    await admin.evaluate(row('Alice#EU')+'.querySelectorAll("button")[0].click()');await alice.wait('window.fixture.state().team==="CHAOS"&&window.fixture.state().media==="ready"&&window.fixture.state().peers.length===0','team move');await bob.wait('window.fixture.state().peers.length===0','old team peer removed');checks.push('Moving a player rebuilds the lobby audio on the new team and removes the old peer');
    await alice.evaluate('window.fixture.startGame()');await alice.wait('window.fixture.closedLobby()&&window.fixture.state().authorized&&window.fixture.state().started','authenticated game handoff');await bob.wait('window.fixture.state().started&&window.fixture.closedLobby()','all lobby channels closed');checks.push('Actual SignalingService joins the game through the private reservation and all pregame audio closes at first match admission');
    const health=await alice.evaluate('window.fixture.health()');if(health!=='unavailable')throw Error('Unexpected TURN readiness without configured relay: '+health);checks.push('The UI reports TURN as unavailable when no relay is configured, without claiming playable network audio');
    const audioTarget=await(await fetch('http://127.0.0.1:'+debugPort+'/json/new?'+encodeURIComponent(origin+'/caster-audio'),{method:'PUT'})).json(),audio=await cdp(audioTarget);tabs.push(audio);
    await audio.wait('!!window.casterAudioFixture&&!!document.getElementById("join").onclick','real Caster controls');
    await audio.field('token','invalid');await audio.click('join');await audio.wait('document.getElementById("status").textContent.includes("Invalid")','bad Caster invitation');
    if(await audio.evaluate('window.casterAudioFixture.state().microphoneRequests')!==0)throw Error('Caster requested microphone before admission');
    await audio.field('token',audioGrants[0].token);await audio.click('join');await audio.wait('document.getElementById("status").textContent.includes("AudioCaster")','Caster admitted');
    if(!await audio.evaluate('document.getElementById("mute").checked&&document.getElementById("ptt").checked&&window.casterAudioFixture.state().gains.every(value=>value===0)&&document.getElementById("token").value===""'))throw Error('Caster defaults did not fail closed');
    await audio.click('mute');await audio.click('ptt');await audio.click('monitor');
    await audio.wait('window.casterAudioFixture.state().gains.every(value=>value>.79)','Caster microphone and monitor enabled');
    await audio.click('deafen');if(!await audio.evaluate('window.casterAudioFixture.state().gains.every(value=>value===0)'))throw Error('Caster deafen did not silence TX/monitor');await audio.click('deafen');
    await audio.field('tx','0.4');await audio.evaluate('document.getElementById("tx").dispatchEvent(new Event("input"))');await audio.field('commentary','0.3');await audio.evaluate('document.getElementById("commentary").dispatchEvent(new Event("input"))');
    await audio.click('stream-mute-peers');if(!await audio.evaluate('Math.abs(window.casterAudioFixture.state().gains[0]-.4)<.001&&Math.abs(window.casterAudioFixture.state().gains[1]-.3)<.001'))throw Error('Stream gate changed the local commentary/microphone');
    await audio.click('ptt');await audio.evaluate('window.dispatchEvent(new KeyboardEvent("keydown",{code:"Space"}))');await audio.wait('window.casterAudioFixture.state().gains[0]>.39','PTT press');
    await audio.evaluate('window.dispatchEvent(new KeyboardEvent("keyup",{code:"Space"}))');if(!await audio.evaluate('window.casterAudioFixture.state().gains.every(value=>value===0)'))throw Error('PTT remained held after key release');
    await audio.evaluate('window.dispatchEvent(new KeyboardEvent("keydown",{code:"Space"}));window.dispatchEvent(new Event("blur"))');if(!await audio.evaluate('window.casterAudioFixture.state().gains.every(value=>value===0)'))throw Error('PTT remained held after blur');
    await audio.evaluate('document.getElementById("token").dispatchEvent(new KeyboardEvent("keydown",{code:"Space",bubbles:true}))');if(!await audio.evaluate('window.casterAudioFixture.state().gains[0]===0'))throw Error('Typing in token field activated PTT');
    await audio.click('leave');await audio.wait('window.casterAudioFixture.state().tracks.every(state=>state==="ended")','microphone stopped on leave');
    await audio.field('token',audioGrants[1].token);await audio.click('join');await audio.wait('document.getElementById("status").textContent.includes("AudioSpectator")','spectator admitted');
    if(await audio.evaluate('window.casterAudioFixture.state().microphoneRequests')!==1)throw Error('Spectator opened a microphone');
    await audio.click('caster-check-update');await audio.wait('document.getElementById("caster-update-status").textContent.includes("Ești la zi")','update UI');await audio.click('leave');
    await audio.click('discord-community');await audio.wait('!document.getElementById("discord-community").disabled','community link request');await audio.click('discord-streamer');await audio.wait('!document.getElementById("discord-streamer").disabled','streamer channel request');
    if(!await audio.evaluate('JSON.stringify(window.casterAudioFixture.state().discordRequests)===JSON.stringify(["community","streamer"])'))throw Error('Discord destination mismatch');
    if(await alice.evaluate('!!document.getElementById("discord-streamer")'))throw Error('Player UI exposes the streamer shortcut');
    checks.push('Discord buttons request only native destination names; the private streamer shortcut is absent from the player UI (native calls mocked, no Discord login or channel changes)');
    checks.push('Actual Caster UI: no microphone before admission or for spectators; mute/deafen, TX and commentary sliders, PTT and blur/input safety, stream gate independence, leave cleanup and update display verified');
    const receipt={version:require('../package.json').version,status:'passed',browser:'Microsoft Edge headless',scope:'Actual Caster organizer, actual player invitation panel, LobbyVoiceController, AudioService and SignalingService; synthetic audio over local WebRTC. Explicit test factory permits loopback ICE; production remains TURN only. No Riot client, real microphone, OBS or external TURN used.',syntheticReceivedRms:rms,checks};
    fs.writeFileSync(path.join(root,'verification/compatibility-ui-proof.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
  }finally{
    // Close this test browser, including its renderer/audio children, before reusing the debug port.
    for(const tab of tabs){try{await tab.evaluate('window.fixture?.stop()');}catch{}}
    if(tabs[0]?.socket.readyState===WebSocket.OPEN)tabs[0].socket.send(JSON.stringify({id:999999,method:'Browser.close'}));
    for(const tab of tabs)tab.socket.close();edge?.kill();backend.kill();server.closeAllConnections();server.close();
  }
}
main().then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1);});
