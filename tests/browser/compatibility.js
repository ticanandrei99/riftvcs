// Development fixture only: synthetic microphone and loopback ICE. Production keeps TURN-only peers.
const {mountOrganizer}=require('../../src/caster/organizer');
const {mountInvitationPanel}=require('../../src/overlay/invitation-panel');
const {LobbyVoiceController}=require('../../src/services/lobby-voice');
const {lobbyState}=require('../../src/services/lobby-state');
const {AudioService}=require('../../src/services/audio');
const {PeerConnection}=require('../../src/services/peer-connection');
const {SignalingService}=require('../../src/services/signaling');
const {setAppAudio}=require('../../src/services/audio-prefs');
const {voiceAuthorization}=require('../../src/services/voice-access');
const {checkVoiceConnection}=require('../../src/services/connection-status');
const {SERVER_URL}=require('../../src/core/config');
if(location.pathname==='/caster-audio'){
  const NativeContext=window.AudioContext,gains=[],tracks=[],discordRequests=[];let microphoneRequests=0,releasePageRequests=0;
  window.__TAURI_INTERNALS__={invoke:async (command,args)=>{
    if(command==='check_for_update')return {current_version:__VOXDRIA_VERSION__,latest_version:__VOXDRIA_VERSION__,update_available:false,channel_ready:true,download_url:null,notes:null};
    if(command==='open_release_page'){releasePageRequests++;return;}
    if(command==='open_discord_link'){discordRequests.push(args.destination);return;}
    throw Error('Native command denied in browser fixture');
  }};
  window.AudioContext=class extends NativeContext{createGain(){const gain=super.createGain();gains.push(gain);return gain;}};
  navigator.mediaDevices.getUserMedia=async()=>{
    microphoneRequests++;const ctx=new NativeContext();await ctx.resume();const oscillator=ctx.createOscillator(),gain=ctx.createGain(),destination=ctx.createMediaStreamDestination();
    gain.gain.value=.01;oscillator.connect(gain).connect(destination);oscillator.start();const track=destination.stream.getAudioTracks()[0],stop=track.stop.bind(track);tracks.push(track);
    track.stop=()=>{stop();oscillator.stop();void ctx.close();};return destination.stream;
  };
  window.casterAudioFixture={state:()=>({gains:gains.map(gain=>gain.gain.value),microphoneRequests,releasePageRequests,discordRequests,tracks:tracks.map(track=>track.readyState)})};
  require('../../src/caster/caster');
}else if(document.getElementById('organizer-panel')){
  mountOrganizer(()=>{});
}else{
  setAppAudio(false);
  const audioInstances=[];
  navigator.mediaDevices.getUserMedia=async()=>{
    const ctx=new AudioContext();await ctx.resume();
    const oscillator=ctx.createOscillator(),gain=ctx.createGain(),destination=ctx.createMediaStreamDestination();
    oscillator.frequency.value=220;gain.gain.value=.1;oscillator.connect(gain).connect(destination);oscillator.start();
    const track=destination.stream.getAudioTracks()[0],stop=track.stop.bind(track);track.stop=()=>{stop();oscillator.stop();void ctx.close();};
    return destination.stream;
  };
  const controller=new LobbyVoiceController((send,name)=>{
    const audio=new AudioService(send,name,async remote=>new PeerConnection(remote,[]));audioInstances.push(audio);return audio;
  });
  mountInvitationPanel();
  window.dispatchEvent(new CustomEvent('overlayAction',{detail:{action:'updateSettings',payload:{pushToTalk:false,inputVolume:1}}}));
  window.dispatchEvent(new CustomEvent('overlayAction',{detail:{action:'setPTT',payload:{held:true}}}));
  let game;
  window.fixture={
    state:()=>({...lobbyState(),authorized:!!voiceAuthorization().Authorization,quality:controller.audio?.getConnectionQuality(),microphone:controller.audio?.outputStream?.getAudioTracks().some(track=>track.enabled),muted:[...(controller.audio?.peers||[])].map(([name,peer])=>({name,muted:peer.audioElement.muted}))}),
    health:()=>checkVoiceConnection(SERVER_URL),
    measure:async name=>{
      const peer=controller.audio?.peers.get(name);if(!peer)throw Error('Peer missing');
      const ctx=new AudioContext();await ctx.resume();const analyser=ctx.createAnalyser();analyser.fftSize=2048;
      const source=ctx.createMediaStreamSource(peer.remoteStream);source.connect(analyser);const silent=ctx.createGain();silent.gain.value=0;analyser.connect(silent).connect(ctx.destination);
      await new Promise(resolve=>setTimeout(resolve,500));const samples=new Float32Array(2048);analyser.getFloatTimeDomainData(samples);
      const rms=Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length);source.disconnect();await ctx.close();return rms;
    },
    startGame:()=>{
      const state=lobbyState();window.dispatchEvent(new CustomEvent('riftvoice:game-active',{detail:true}));game=new SignalingService();
      game.joinRoom('compatibility-game',state.name,state.team,()=>{},()=>{},()=>{});
    },
    closedLobby:()=>audioInstances.every(audio=>audio.disposed),
    stop:()=>{controller.stop();game?.leaveRoom();}
  };
}
