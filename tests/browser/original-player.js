// Test-only native/game stand-ins and loopback ICE. Production uses TURN.
const {mountOrganizer}=require('../../src/caster/organizer');
if(document.getElementById('organizer-panel')){
  mountOrganizer(()=>{});
}else{
  const {mountInvitationPanel}=require('../../src/overlay/invitation-panel');
  const {PlayerController}=require('../../src/player-original/controller');
  const {AudioService}=require('../../src/upstream/services/audio');
  const {PeerConnection}=require('../../src/upstream/services/peer-connection');
  const {TrackingState}=require('../../src/upstream/services/tracking');
  const {setCameraOnly,setCameraListen,setAppAudio,setAllyProximity}=require('../../src/upstream/services/audio-prefs');
  const {lobbyState}=require('../../src/services/lobby-state');
  const {voiceAuthorization}=require('../../src/services/voice-access');
  const name=new URL(location.href).searchParams.get('name')||'Alice#EU';
  const roster=[{summonerName:'Alice#EU',riotIdGameName:'Alice',riotIdTagLine:'EU',championName:'Ahri',team:'ORDER',isDead:false,respawnTimer:0},{summonerName:'Bob#EU',riotIdGameName:'Bob',riotIdTagLine:'EU',championName:'Zed',team:'CHAOS',isDead:false,respawnTimer:0}];
  const local=roster.find(p=>p.summonerName===name),audioInstances=[],tracks=[],errors=[];
  let inGame=false,microphoneRequests=0;
  window.addEventListener('unhandledrejection',event=>errors.push(String(event.reason?.message||event.reason)));
  window.addEventListener('riftvoice:join-error',event=>errors.push(event.detail));
  window.__TAURI_INTERNALS__={invoke:async(command)=>{
    if(command==='get_game_state')return {isLeagueRunning:true,isInGame:inGame,summonerName:name,isDead:false,gameFlowPhase:inGame?'InProgress':'Lobby',players:roster};
    if(command==='get_live_players')return roster;
    if(command==='get_live_client_data')return {activePlayer:local,allPlayers:roster,gameData:{gameMode:'CLASSIC',mapNumber:11,mapName:'Map11'}};
    if(command==='read_league_config_file')return '[HUD]\nMinimapScale=1.0\n';
    if(command==='get_game_window_info')return {found:true,rect:{x:0,y:0,width:1920,height:1080},matchedBy:'class',windowTitle:'League of Legends (TM) Client',processName:'League of Legends.exe',virtualScreen:{x:0,y:0,width:1920,height:1080},primaryScreen:{x:0,y:0,width:1920,height:1080},error:null};
    return null;
  }};
  navigator.mediaDevices.getUserMedia=async()=>{
    microphoneRequests++;
    const context=new AudioContext();await context.resume();
    const oscillator=context.createOscillator(),gain=context.createGain(),destination=context.createMediaStreamDestination();
    oscillator.frequency.value=local.team==='ORDER'?220:440;gain.gain.value=.12;oscillator.connect(gain).connect(destination);oscillator.start();
    const track=destination.stream.getAudioTracks()[0],stop=track.stop.bind(track);tracks.push(track);
    track.stop=()=>{stop();oscillator.stop();void context.close();};return destination.stream;
  };
  const tracker={position:local.team==='ORDER'?{x:1000,y:1000}:{x:1100,y:1000},started:false,stopped:false,captureBounds:{x:0,y:0,width:376,height:376},
    loadChampionTemplate(){},async initCaptureBounds(){},setClassifier(){},setCameraHearing(){},setMinimapScaleFromConfig(){},setMinimapRegion(){},setCameraTracking(){},
    start(){this.started=true;this.stopped=false;},stop(){this.stopped=true;},getState(){return TrackingState.LOCKED;},getLastPosition(){return this.position;},getHoldDurationSec(){return 0;},getHoldReason(){return null;},getCameraView(){return null;},getCameraPosition(){return null;},getVisibleEnemies(){return [];},getMinimapBounds(){return null;},getFps(){return 30;},getDebugState(){return null;},onDeath(){},onRespawn(){},resetPosition(){return true;}
  };
  // Exercise the original distance path; camera recognition has its own upstream tests.
  setCameraOnly(false);setCameraListen(false);setAppAudio(false);setAllyProximity(true);
  Object.assign(tracker,{getFilteredImageUrl:()=>null,getDetectedMinimapScreenBounds:()=>null,getThresholdImageUrl:()=>null,getRawImageUrl:()=>null,getCandidateImageUrl:()=>null,getMinimapImageUrl:()=>null,getDetectionInfo:()=>null});
  const controller=new PlayerController({
    createAudio:(signaling,localName)=>{const audio=new AudioService(signaling,localName,async remote=>new PeerConnection(remote,[]));audioInstances.push(audio);return audio;},
    createTracking:()=>tracker,createClassifier:async()=>null,loadSkinTemplates:undefined,loadBaseTemplates:undefined,
    timings:{gameStatePollMs:300,volumeTickMs:100,configPollMs:10000,deathPollMs:1000}
  });
  controller.updateSettings({inputMode:'always',inputVolume:1});mountInvitationPanel();controller.start();
  window.addEventListener('riftvoice:invitation-changed',()=>controller.refreshVoiceInvitation());
  const audio=()=>audioInstances.at(-1);
  window.fixture={
    state:()=>({...lobbyState(),inGame,microphoneRequests,authorized:!!voiceAuthorization().Authorization,peers:[...(audio()?.peers||[])].map(([name,peer])=>({name,connection:peer.pc.connectionState,volume:peer.audioElement.volume,muted:peer.audioElement.muted})),microphone:audio()?.outputStream?.getAudioTracks().some(track=>track.enabled),tracks:tracks.map(track=>track.readyState),room:controller.session?.roomId,errors}),
    startGame:()=>{inGame=true;},endGame:()=>{inGame=false;},near:()=>{tracker.position=local.team==='ORDER'?{x:1000,y:1000}:{x:1100,y:1000};},far:()=>{tracker.position=local.team==='ORDER'?{x:1000,y:1000}:{x:13000,y:13000};},
    mutePeer:remote=>controller.toggleMutePlayer(remote),muteSelf:()=>controller.toggleSelfMute(),deafen:()=>controller.toggleMuteAll(),
    ptt:held=>{controller.updateSettings({inputMode:'ptt'});controller.setPTTState(held);},
    measure:async remote=>{
      const peer=audio()?.peers.get(remote);if(!peer)throw Error('Original peer missing');
      const context=new AudioContext();await context.resume();const analyser=context.createAnalyser();analyser.fftSize=2048;
      const source=context.createMediaStreamSource(peer.remoteStream);source.connect(analyser);await new Promise(resolve=>setTimeout(resolve,450));
      const samples=new Float32Array(2048);analyser.getFloatTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length);
      source.disconnect();await context.close();return rms;
    },
    api:async(path,body)=>{const response=await fetch(require('../../src/core/config').SERVER_URL+path,{method:'POST',headers:{'Content-Type':'application/json',...voiceAuthorization()},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};},
    stop:()=>controller.stop()
  };
}
