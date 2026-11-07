import {ApprovedSignaling} from '../../src/player-original/signaling';
import {ApprovedVolumeClient} from '../../src/player-original/volume-client';
import {SignalingService} from '../../src/services/signaling';
import {clearVoiceCredentials,saveVoiceInvitation,voiceAuthorization,setVoiceSessionToken} from '../../src/services/voice-access';

class Socket {
  static OPEN=1;static instances:Socket[]=[];readyState=1;sent:any[]=[];
  handlers=new Map<string,((event:any)=>void)[]>();
  constructor(readonly url:string){Socket.instances.push(this);}
  addEventListener(type:string,callback:(event:any)=>void){this.handlers.set(type,[...(this.handlers.get(type)||[]),callback]);}
  send(value:string){this.sent.push(JSON.parse(value));}close(){this.readyState=3;}
  fire(type:string,event:any={}){for(const callback of this.handlers.get(type)||[])callback(event);}
  receive(value:unknown){this.fire('message',{data:JSON.stringify(value)});}
}
const oldWindow=globalThis.window,oldSocket=globalThis.WebSocket,oldSession=globalThis.sessionStorage,oldFetch=globalThis.fetch;
const services:Array<{leaveRoom():void}>=[];
beforeEach(()=>{
  const storage=new Map<string,string>();
  globalThis.window=new EventTarget() as any;globalThis.WebSocket=Socket as any;
  globalThis.sessionStorage={getItem:(key:string)=>storage.get(key)||null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)} as any;
  Socket.instances=[];saveVoiceInvitation('a'.repeat(43));setVoiceSessionToken(null);
});
afterEach(()=>{for(const service of services.splice(0))service.leaveRoom();clearVoiceCredentials();globalThis.window=oldWindow;globalThis.WebSocket=oldSocket;globalThis.sessionStorage=oldSession;globalThis.fetch=oldFetch;jest.restoreAllMocks();});
function join(service:SignalingService|ApprovedSignaling,position=jest.fn()){
  services.push(service);service.joinRoom('game','Alice','ORDER',position,()=>{},()=>{});const socket=Socket.instances[Socket.instances.length-1];socket.fire('open');return socket;
}
const ready={type:'room_state',sessionToken:'s'.repeat(43),role:'player',teamIsolation:true,originalPlayerProtocol:1,peers:['Bob']};
const opponent={type:'position',from:'Bob',blob:JSON.stringify({summonerName:'Bob',team:'CHAOS',championName:'Zed',isMuted:false,isDead:false})};
test('original adapter uses its authenticated endpoint and accepts admitted opponent status for original audio discovery',()=>{
  const position=jest.fn(),socket=join(new ApprovedSignaling(),position);expect(socket.url).toMatch(/\/player\/ws$/);expect(socket.sent[0].invitation).toBe('a'.repeat(43));
  socket.receive(opponent);expect(position).not.toHaveBeenCalled();socket.receive(ready);socket.receive(opponent);expect(position).toHaveBeenCalledWith(JSON.parse(opponent.blob));expect(voiceAuthorization().Authorization).toBe('Bearer '+ready.sessionToken);
  socket.receive({...opponent,from:'Unknown'});expect(position).toHaveBeenCalledTimes(1);
});
test('legacy adapter still blocks opponent status when the legacy camera gateway is unavailable',()=>{
  const position=jest.fn(),socket=join(new SignalingService(),position);socket.receive(ready);socket.receive(opponent);expect(position).not.toHaveBeenCalled();
});
test.each([{...ready,originalPlayerProtocol:undefined},{...ready,role:'caster'}])('wrong original protocol or caster role cannot obtain a player session',message=>{
  const stop=jest.fn();window.addEventListener('voxdria:player-access-stopped',stop);const socket=join(new ApprovedSignaling());socket.receive(message);expect(socket.readyState).toBe(3);expect(voiceAuthorization()).toEqual({});expect(stop).toHaveBeenCalledTimes(1);
});
test('denied admission stops the original controller and leaves no bearer',()=>{
  const stop=jest.fn();window.addEventListener('voxdria:player-access-stopped',stop);const socket=join(new ApprovedSignaling());socket.receive({type:'error',message:'Invitation denied'});expect(socket.readyState).toBe(3);expect(stop).toHaveBeenCalledTimes(1);expect(voiceAuthorization()).toEqual({});
});
test('volume adapter needs its bearer, sends no credential in URLs and retains original request values',async()=>{
  const fetchMock=jest.fn(async()=>({ok:true,json:async()=>({peerVolumes:{Bob:.5}})}));globalThis.fetch=fetchMock as any;const client=new ApprovedVolumeClient();
  expect(await client.computeVolumes({x:1000,y:1000},'game','Alice',true)).toEqual({myBlob:'',peerVolumes:{}});expect(fetchMock).not.toHaveBeenCalled();
  setVoiceSessionToken('s'.repeat(43));expect((await client.computeVolumes({x:1000,y:1000},'game','Alice',true)).peerVolumes).toEqual({Bob:.5});
  const [url,options]=(fetchMock.mock.calls as any)[0];expect(url).toMatch(/\/player\/compute-volumes$/);expect(url).not.toContain('s'.repeat(43));expect(options.headers.Authorization).toBe('Bearer '+'s'.repeat(43));expect(JSON.parse(options.body)).toMatchObject({roomId:'game',name:'Alice',allyProximity:true,myPosition:{x:1000,y:1000}});
});
test.each(['network','bad-volume'])('volume failure %s returns silence instead of retaining an unsafe gain',async failure=>{
  setVoiceSessionToken('s'.repeat(43));globalThis.fetch=jest.fn(async()=>{if(failure==='network')throw Error('offline');return {ok:true,json:async()=>({peerVolumes:{Bob:100}})};}) as any;
  expect(await new ApprovedVolumeClient().computeVolumes({x:1000,y:1000},'game','Alice',true)).toEqual({myBlob:'',peerVolumes:{}});
});
