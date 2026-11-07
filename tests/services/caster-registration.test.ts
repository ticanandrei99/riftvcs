import {registerCaster} from '../../src/caster/registration';
class Socket{
  static current:Socket;sent:any[]=[];closed=false;
  onopen:(()=>void)|null=null;onmessage:((event:any)=>void)|null=null;onerror:(()=>void)|null=null;onclose:(()=>void)|null=null;
  constructor(public url:string){Socket.current=this;}send(raw:string){this.sent.push(JSON.parse(raw));}close(){this.closed=true;this.onclose?.();}receive(value:any){this.onmessage?.({data:JSON.stringify(value)});}
}
let previous:unknown;beforeEach(()=>{previous=globalThis.WebSocket;(globalThis as any).WebSocket=Socket;});afterEach(()=>{(globalThis as any).WebSocket=previous;jest.useRealTimers();});
test('requests no audio grant until an organizer approval follows the pending state',()=>{
  const approved=jest.fn(),notify=jest.fn(),stop=registerCaster('Guest','VC-'+'a'.repeat(43),'caster',notify,approved),socket=Socket.current;socket.onopen?.();
  expect(socket.sent).toEqual([{type:'caster_register',name:'Guest',invitation:'VC-'+'a'.repeat(43),requestedRole:'caster'}]);expect(approved).not.toHaveBeenCalled();
  socket.receive({type:'caster_pending'});expect(approved).not.toHaveBeenCalled();
  socket.receive({type:'caster_approved',invitation:'b'.repeat(43),name:'Guest',role:'spectator',expiresAt:Date.now()+60000,authority:'organizer'});
  expect(approved).toHaveBeenCalledTimes(1);expect(approved.mock.calls[0][0]).not.toHaveProperty('authority');
  socket.receive({type:'caster_approved',invitation:'c'.repeat(43),name:'Guest',role:'caster',expiresAt:Date.now()+60000});expect(approved).toHaveBeenCalledTimes(1);stop();
});
test('never promotes a listener request to microphone or accepts a forged role',()=>{
  const approved=jest.fn(),stop=registerCaster('Listener','VC-'+'a'.repeat(43),'spectator',jest.fn(),approved),socket=Socket.current;
  socket.receive({type:'caster_pending'});socket.receive({type:'caster_approved',invitation:'b'.repeat(43),name:'Listener',role:'caster',expiresAt:Date.now()+60000});
  expect(approved).not.toHaveBeenCalled();expect(socket.closed).toBe(true);stop();
});
test('preserves a rejection after close and ignores approval after cancellation',()=>{
  const approved=jest.fn(),notify=jest.fn(),ended=jest.fn(),stop=registerCaster('Guest','VC-'+'a'.repeat(43),'caster',notify,approved,ended),socket=Socket.current;
  socket.receive({type:'error',message:'Cerere respinsă'});expect(notify).toHaveBeenLastCalledWith('Cerere respinsă');expect(ended).toHaveBeenCalled();stop();
  socket.receive({type:'caster_pending'});socket.receive({type:'caster_approved',invitation:'b'.repeat(43),name:'Guest',role:'caster',expiresAt:Date.now()+60000});expect(approved).not.toHaveBeenCalled();
});
test('a server that never responds cannot leave the request permanently pending',()=>{
  jest.useFakeTimers();const notify=jest.fn(),stop=registerCaster('Guest','VC-'+'a'.repeat(43),'caster',notify,jest.fn());jest.advanceTimersByTime(20001);
  expect(Socket.current.closed).toBe(true);expect(notify).toHaveBeenLastCalledWith(expect.stringContaining('nu a confirmat'));stop();
});

test('approval cannot revive a failed request or change the requested identity',()=>{
  const approved=jest.fn(),stop=registerCaster('Guest','VC-'+'a'.repeat(43),'caster',jest.fn(),approved),socket=Socket.current;
  socket.receive({type:'caster_pending'});socket.onerror?.();
  socket.receive({type:'caster_approved',invitation:'b'.repeat(43),name:'Guest',role:'caster',expiresAt:Date.now()+60000});expect(approved).not.toHaveBeenCalled();stop();
  const cancel=registerCaster('Guest','VC-'+'a'.repeat(43),'caster',jest.fn(),approved),other=Socket.current;other.receive({type:'caster_pending'});
  other.receive({type:'caster_approved',invitation:'b'.repeat(43),name:'Other',role:'caster',expiresAt:Date.now()+60000});expect(approved).not.toHaveBeenCalled();expect(other.closed).toBe(true);cancel();
});
