import { WS_URL } from '../core/config';
import { AudioService } from './audio';
import type { SignalMessage } from './signaling';
import { lobbyReservation,lobbyState,updateLobbyState } from './lobby-state';
import { setVoiceSessionToken } from './voice-access';

export class LobbyVoiceController {
  private ws:WebSocket|null=null;private audio:AudioService|null=null;private epoch=0;private context='';
  private enabled=false;private gameActive=false;private ownSession=false;private stopped=false;
  private reconciling=false;
  private streamMuted=false;
  private peers=new Set<string>();private muted=new Set<string>();private selfMuted=false;private muteAll=false;private held=false;
  private settings:Record<string,unknown>={};private retry:ReturnType<typeof setTimeout>|null=null;private stats:ReturnType<typeof setInterval>|null=null;
  constructor(private createAudio:(send:{sendSignal(signal:SignalMessage):void},name:string)=>AudioService=(send,name)=>new AudioService(send,name)){
    window.addEventListener('riftvoice:lobby-state',this.reconcile);
    window.addEventListener('riftvoice:lobby-voice-request',this.request);
    window.addEventListener('riftvoice:game-active',this.game);
    window.addEventListener('riftvoice:credentials-cleared',this.cleared);
    window.addEventListener('riftvoice:lobby-control',this.control);
    window.addEventListener('overlayUpdate',this.overlay);
    window.addEventListener('overlayAction',this.action);
    window.addEventListener('beforeunload',this.stop,{once:true});
  }
  private request=(event:Event)=>{this.enabled=(event as CustomEvent).detail===true;if(this.retry){clearTimeout(this.retry);this.retry=null;}this.reconcile();};
  private game=(event:Event)=>{this.gameActive=(event as CustomEvent).detail===true;this.reconcile();};
  private cleared=()=>{this.enabled=false;this.disconnect('off');};
  private overlay=(event:Event)=>{const data=(event as CustomEvent).detail;this.selfMuted=data?.selfMuted===true;this.muteAll=data?.muteAll===true;this.audio?.setSelfMuted(this.selfMuted);this.audio?.setMuteAll(this.muteAll);};
  private action=(event:Event)=>{
    const data=(event as CustomEvent).detail;if(!data)return;
    switch(data.action){
      case 'setPTT':this.setPTTState(data.payload.held);break;
      case 'updateSettings':this.settings={...this.settings,...data.payload};this.audio?.updateSettings(data.payload);break;
      case 'setInputDevice':void this.audio?.applyInputDevice(data.payload.id);break;
      case 'setOutputDevice':void this.audio?.applyOutputDevice(data.payload.id);break;
      case 'setAppAudio':void this.audio?.setAppAudio(data.payload.enabled);break;
      case 'setAppAudioDevice':void this.audio?.setAppAudioDevice(data.payload.name);break;
    }
  };
  private control=(event:Event)=>{
    const data=(event as CustomEvent).detail;
    if(data?.action==='streamMute'){this.streamMuted=data.muted===true;this.audio?.setIncomingMuted(this.streamMuted);return;}
    if(data?.action==='mute'&&typeof data.name==='string'&&this.peers.has(data.name)){
      if(data.muted===true)this.muted.add(data.name);else this.muted.delete(data.name);
      if(this.audio&&this.audio.isPlayerMuted(data.name)!==this.muted.has(data.name))this.audio.toggleMutePlayer(data.name);
    }
  };
  setPTTState(held:boolean):void{this.held=held;this.audio?.setPTTState(held);}
  private media(media:ReturnType<typeof lobbyState>['media'],message?:string):void{
    const current=lobbyState(),names=[...this.peers];
    if(current.media!==media||current.peers.join('\0')!==names.join('\0')||(message!==undefined&&message!==current.message))updateLobbyState({media,peers:names,...(message!==undefined?{message}:{})});
  }
  private disconnect(media:ReturnType<typeof lobbyState>['media'],message?:string):void{
    this.context='';this.epoch++;
    const ws=this.ws;this.ws=null;ws?.close();this.audio?.cleanup();this.audio=null;this.peers.clear();
    if(this.stats)clearInterval(this.stats);this.stats=null;
    if(this.ownSession){this.ownSession=false;setVoiceSessionToken(null);}
    this.media(media,message);
  }
  private reconcile=()=>{
    if(this.stopped||this.reconciling)return;
    this.reconciling=true;try{
    const state=lobbyState();
    if(state.muted){this.enabled=false;this.disconnect('blocked','Accesul vocal este oprit de moderare. După reactivare, reconectează manual.');return;}
    if(!this.enabled||this.gameActive||state.started||state.phase!=='approved'||!state.voiceAvailable){
      if(this.ws||this.audio)this.disconnect('off');return;
    }
    if(this.retry)return;
    const credential=lobbyReservation();if(!/^[A-Za-z0-9_-]{43}$/.test(credential))return;
    const context=[state.name,state.team,credential].join('\0');
    if(this.context===context&&this.ws)return;
    this.disconnect('off');this.context=context;
    const epoch=this.epoch,socket=new WebSocket(WS_URL.replace(/\/ws$/,'/lobby-voice'));this.ws=socket;
    let accepted=false,lastError='';let queue=Promise.resolve();
    this.media('connecting','Se conectează vocea echipei în lobby…');
    socket.onopen=()=>{if(epoch===this.epoch)socket.send(JSON.stringify({type:'lobby_join',token:credential}));};
    const send=(signal:SignalMessage)=>{if(epoch===this.epoch&&accepted&&socket.readyState===WebSocket.OPEN&&this.peers.has(signal.to))socket.send(JSON.stringify({type:'lobby_signal',to:signal.to,payload:{type:signal.type,payload:signal.payload}}));};
    socket.onmessage=event=>{queue=queue.then(async()=>{
      if(epoch!==this.epoch)return;
      let msg:any;try{msg=JSON.parse(event.data);}catch{return;}
      if(!msg||typeof msg!=='object')return;
      if(msg.type==='error'){lastError=typeof msg.message==='string'?msg.message.slice(0,180):'Invitație refuzată.';this.enabled=false;this.disconnect('error','Vocea în lobby: '+lastError);return;}
      if(!accepted){
        if(msg.type!=='lobby_ready'||msg.role!=='lobby-player'||msg.name!==state.name||msg.team!==state.team||typeof msg.sessionToken!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(msg.sessionToken)||!Array.isArray(msg.peers)||msg.peers.length>4)return;
        const names=msg.peers.map((p:any)=>p?.name);if(names.some((name:any)=>typeof name!=='string'||!name||name.length>64||name===state.name)||new Set(names).size!==names.length)return;
        accepted=true;this.ownSession=true;setVoiceSessionToken(msg.sessionToken);
        const audio=this.createAudio({sendSignal:send},state.name);this.audio=audio;
        await audio.initMicrophone();if(epoch!==this.epoch){audio.cleanup();return;}
        audio.updateSettings(this.settings);audio.setSelfMuted(this.selfMuted);audio.setMuteAll(this.muteAll);audio.setPTTState(this.held);
        audio.setIncomingMuted(this.streamMuted);
        for(const name of this.muted)if(!audio.isPlayerMuted(name))audio.toggleMutePlayer(name);
        for(const name of names)this.peers.add(name);
        this.media('ready',audio.getMicError()?'Voce în lobby: ascultare activă, microfon indisponibil.':'Voce conectată în lobby.');
        this.stats=setInterval(()=>{if(epoch===this.epoch)window.dispatchEvent(new CustomEvent('riftvoice:lobby-quality',{detail:audio.getConnectionQuality()}));},500);
        for(const name of names)await audio.connectToPeer(name);
        audio.applyPeerVolumes(Object.fromEntries([...this.peers].map(name=>[name,1])));return;
      }
      if(msg.type==='lobby_peer'&&msg.role==='lobby-player'&&typeof msg.name==='string'&&msg.name.length>0&&msg.name.length<=64&&msg.name!==state.name&&this.peers.size<4){
        this.peers.add(msg.name);await this.audio?.connectToPeer(msg.name);this.audio?.applyPeerVolumes(Object.fromEntries([...this.peers].map(name=>[name,1])));this.media('ready');
      }else if(msg.type==='lobby_signal'&&this.peers.has(msg.from)&&['offer','answer','ice-candidate'].includes(msg.payload?.type)){
        await this.audio?.handleSignal({from:msg.from,to:state.name,type:msg.payload.type,payload:msg.payload.payload});
      }else if(msg.type==='lobby_left'&&this.peers.has(msg.name)){this.peers.delete(msg.name);this.audio?.disconnectPeer(msg.name);this.media('ready');}
    }).catch(()=>{if(epoch===this.epoch){this.enabled=false;this.disconnect('error','Conexiunea audio de lobby s-a oprit. Reconectează manual.');}});};
    socket.onerror=()=>{if(epoch===this.epoch)lastError='Serverul nu poate fi contactat.';};
    socket.onclose=event=>{
      if(epoch!==this.epoch)return;
      if(event.code===4000||event.code===4003||event.code===1008){this.enabled=false;this.disconnect('blocked',lastError||(event.code===4000?'Vocea este conectată într-o altă sesiune.':'Accesul vocal de lobby s-a închis. Reconectează după verificarea organizatorului.'));return;}
      this.retry=setTimeout(()=>{this.retry=null;this.reconcile();},1000);
      this.disconnect('error',lastError||'Vocea de lobby este deconectată. Se încearcă reconectarea…');
    };
    }finally{this.reconciling=false;}
  };
  stop=():void=>{
    this.stopped=true;this.enabled=false;if(this.retry)clearTimeout(this.retry);this.retry=null;this.disconnect('off');
    window.removeEventListener('riftvoice:lobby-state',this.reconcile);window.removeEventListener('riftvoice:lobby-voice-request',this.request);window.removeEventListener('riftvoice:game-active',this.game);window.removeEventListener('riftvoice:credentials-cleared',this.cleared);window.removeEventListener('riftvoice:lobby-control',this.control);window.removeEventListener('overlayUpdate',this.overlay);window.removeEventListener('overlayAction',this.action);
  };
}
