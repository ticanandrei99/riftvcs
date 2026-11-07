jest.mock('../../src/services/audio',()=>({AudioService:jest.fn()}));
import { LobbyVoiceController } from '../../src/services/lobby-voice';
import { lobbyState,resetLobbyState,updateLobbyState } from '../../src/services/lobby-state';
import { voiceAuthorization,setVoiceSessionToken } from '../../src/services/voice-access';

class Socket {
  static OPEN=1;static instances:Socket[]=[];readyState=1;sent:any[]=[];closed=false;
  onopen:(()=>void)|null=null;onmessage:((event:any)=>void)|null=null;onclose:((event:any)=>void)|null=null;onerror:(()=>void)|null=null;
  constructor(public url:string){Socket.instances.push(this);}
  send(raw:string){this.sent.push(JSON.parse(raw));}close(){this.closed=true;this.readyState=3;}
  receive(value:unknown){this.onmessage?.({data:JSON.stringify(value)});}
}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const ready=(name='Alice#EU',team='ORDER',peers:any[]=[])=>({type:'lobby_ready',role:'lobby-player',name,team,sessionToken:'s'.repeat(43),peers});
describe('lobby audio lifecycle and isolation',()=>{
  let controller:LobbyVoiceController,originalWindow:any,originalSocket:any,originalStorage:any,makeAudio:jest.Mock,audio:any;
  const event=(name:string,detail?:unknown)=>window.dispatchEvent(new CustomEvent(name,{detail}));
  beforeEach(()=>{
    jest.useFakeTimers();originalWindow=(globalThis as any).window;originalSocket=globalThis.WebSocket;originalStorage=(globalThis as any).sessionStorage;
    (globalThis as any).window=new EventTarget();(globalThis as any).WebSocket=Socket;Socket.instances=[];
    (globalThis as any).sessionStorage={getItem:(name:string)=>name==='riftvoice.lobby-reservation'?'r'.repeat(43):null};
    resetLobbyState();setVoiceSessionToken(null);
    audio={initMicrophone:jest.fn().mockResolvedValue(undefined),cleanup:jest.fn(),updateSettings:jest.fn(),setSelfMuted:jest.fn(),setMuteAll:jest.fn(),setPTTState:jest.fn(),setIncomingMuted:jest.fn(),getMicError:jest.fn(),isPlayerMuted:jest.fn().mockReturnValue(false),toggleMutePlayer:jest.fn(),connectToPeer:jest.fn().mockResolvedValue(undefined),disconnectPeer:jest.fn(),applyPeerVolumes:jest.fn(),handleSignal:jest.fn(),getConnectionQuality:jest.fn()};
    makeAudio=jest.fn(()=>audio);controller=new LobbyVoiceController(makeAudio);
  });
  afterEach(()=>{controller.stop();(globalThis as any).window=originalWindow;(globalThis as any).WebSocket=originalSocket;(globalThis as any).sessionStorage=originalStorage;jest.useRealTimers();});
  const approve=()=>updateLobbyState({phase:'approved',name:'Alice#EU',team:'ORDER',voiceAvailable:true});
  test('requires explicit activation, approval and a private reservation before opening audio',async()=>{
    event('riftvoice:lobby-voice-request',true);expect(Socket.instances).toHaveLength(0);approve();expect(Socket.instances).toHaveLength(1);expect(makeAudio).not.toHaveBeenCalled();
    const ws=Socket.instances[0];ws.onopen?.();expect(ws.sent[0]).toMatchObject({type:'lobby_join',token:'r'.repeat(43)});
    ws.receive({...ready(),role:'caster'});await flush();expect(makeAudio).not.toHaveBeenCalled();
    ws.receive(ready());await flush();expect(audio.initMicrophone).toHaveBeenCalledTimes(1);expect(lobbyState().media).toBe('ready');expect(Socket.instances).toHaveLength(1);
  });
  test('accepts signals only from admitted peers and tears down immediately at match start',async()=>{
    approve();event('riftvoice:lobby-voice-request',true);const ws=Socket.instances[0];ws.receive(ready('Alice#EU','ORDER',[{name:'Bob#EU',role:'lobby-player'}]));await flush();
    ws.receive({type:'lobby_signal',from:'Enemy#EU',payload:{type:'offer',payload:{sdp:'forged'}}});await flush();expect(audio.handleSignal).not.toHaveBeenCalled();
    ws.receive({type:'lobby_signal',from:'Bob#EU',payload:{type:'ice-candidate',payload:{candidate:'test'}}});await flush();expect(audio.handleSignal).toHaveBeenCalledTimes(1);
    event('riftvoice:game-active',true);expect(ws.closed).toBe(true);expect(audio.cleanup).toHaveBeenCalled();expect(voiceAuthorization()).toEqual({});
    ws.receive(ready());await flush();expect(makeAudio).toHaveBeenCalledTimes(1);jest.advanceTimersByTime(5000);expect(Socket.instances).toHaveLength(1);
  });
  test('rejects stale async microphone completion and moves to the newly approved team',async()=>{
    let finish!:()=>void;audio.initMicrophone.mockImplementationOnce(()=>new Promise<void>(resolve=>finish=resolve));
    approve();event('riftvoice:lobby-voice-request',true);const old=Socket.instances[0];old.receive(ready());await flush();
    updateLobbyState({team:'CHAOS'});expect(old.closed).toBe(true);expect(Socket.instances).toHaveLength(2);
    finish();await flush();expect(lobbyState().media).toBe('connecting');expect(audio.connectToPeer).not.toHaveBeenCalled();
  });
  test.each([4000,4003,1008])('does not automatically reclaim a revoked or replaced session (%s)',async code=>{
    approve();event('riftvoice:lobby-voice-request',true);const ws=Socket.instances[0];ws.receive(ready());await flush();ws.onclose?.({code});jest.advanceTimersByTime(10000);expect(Socket.instances).toHaveLength(1);expect(lobbyState().media).toBe('blocked');
  });
  test('incoming stream gate leaves microphone and push-to-talk independent',async()=>{
    approve();event('riftvoice:lobby-control',{action:'streamMute',muted:true});event('riftvoice:lobby-voice-request',true);Socket.instances[0].receive(ready());await flush();
    expect(audio.setIncomingMuted).toHaveBeenLastCalledWith(true);expect(audio.setSelfMuted).toHaveBeenLastCalledWith(false);
    event('overlayAction',{action:'setPTT',payload:{held:true}});expect(audio.setPTTState).toHaveBeenLastCalledWith(true);
    event('riftvoice:lobby-control',{action:'streamMute',muted:false});expect(audio.setIncomingMuted).toHaveBeenLastCalledWith(false);expect(audio.setSelfMuted).toHaveBeenCalledTimes(1);
  });
  test('moderation requires a new explicit activation after unmute',async()=>{
    approve();event('riftvoice:lobby-voice-request',true);updateLobbyState({muted:true});expect(Socket.instances[0].closed).toBe(true);
    updateLobbyState({muted:false});jest.advanceTimersByTime(3000);expect(Socket.instances).toHaveLength(1);
    event('riftvoice:lobby-voice-request',true);expect(Socket.instances).toHaveLength(2);
  });
});
