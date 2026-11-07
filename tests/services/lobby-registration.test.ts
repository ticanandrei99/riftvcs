import { registerLobby } from '../../src/services/lobby-registration';
import { lobbyState,resetLobbyState } from '../../src/services/lobby-state';
class Socket {
  static current:Socket;sent:any[]=[];closed=false;
  onopen:(()=>void)|null=null;onmessage:((event:any)=>void)|null=null;onerror:(()=>void)|null=null;onclose:((event:any)=>void)|null=null;
  constructor(public url:string){Socket.current=this;}
  send(raw:string){this.sent.push(JSON.parse(raw));}close(){this.closed=true;this.onclose?.({code:1000});}
  receive(msg:unknown){this.onmessage?.({data:JSON.stringify(msg)});}
}
describe('pregame check-in client',()=>{
  let original:unknown,storage:unknown;const values=new Map<string,string>();
  beforeEach(()=>{original=globalThis.WebSocket;storage=(globalThis as any).sessionStorage;values.clear();(globalThis as any).WebSocket=Socket;(globalThis as any).sessionStorage={getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>values.set(k,v)};});
  afterEach(()=>{resetLobbyState();(globalThis as any).WebSocket=original;(globalThis as any).sessionStorage=storage;});
  test('waits for approval, stores only the private reservation and receives safe team changes',()=>{
    const notify=jest.fn(),approved=jest.fn(),stop=registerLobby('Player#EUNE','RV-'+'a'.repeat(43),notify,approved),socket=Socket.current;
    socket.onopen?.();expect(socket.url).toMatch(/\/registration$/);expect(socket.sent[0]).toMatchObject({type:'lobby_register',name:'Player#EUNE'});
    socket.receive({type:'lobby_pending'});expect(values.size).toBe(0);expect(approved).not.toHaveBeenCalled();
    socket.receive({type:'lobby_approved',invitation:'invalid'});expect(approved).not.toHaveBeenCalled();
    socket.receive({type:'lobby_approved',invitation:'b'.repeat(43)});expect(values.get('riftvoice.invitation')).toBe('b'.repeat(43));expect(approved).toHaveBeenCalledTimes(1);
    socket.receive({type:'lobby_state',name:'Player#EUNE',team:'CHAOS',muted:false,started:false});expect(notify).toHaveBeenLastCalledWith(expect.stringContaining('Roșu'));
    stop();expect(socket.closed).toBe(true);const calls=notify.mock.calls.length;socket.receive({type:'error',message:'late'});expect(notify).toHaveBeenCalledTimes(calls);
  });
  test('resuming an approved reservation does not trigger a reload loop',()=>{
    const approved=jest.fn(),stop=registerLobby('Player#EUNE','b'.repeat(43),jest.fn(),approved);
    Socket.current.receive({type:'lobby_approved',invitation:'b'.repeat(43)});expect(approved).not.toHaveBeenCalled();stop();
  });
  test('keeps a server rejection visible after the socket closes and ignores team state before approval',()=>{
    const notify=jest.fn(),stop=registerLobby('Player#EUNE','RV-'+'a'.repeat(43),notify,jest.fn());
    Socket.current.receive({type:'lobby_state',name:'Forged',team:'CHAOS',muted:false,started:false,lobbyVoiceAvailable:true});expect(lobbyState().phase).toBe('connecting');expect(lobbyState().voiceAvailable).toBe(false);
    Socket.current.receive({type:'error',message:'Cod expirat'});Socket.current.onclose?.({code:4003});expect(notify).toHaveBeenLastCalledWith('Cod expirat');expect(lobbyState().phase).toBe('error');stop();
  });
});
