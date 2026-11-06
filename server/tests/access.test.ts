import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import { loadGrants, authorizeGrant, SessionRegistry, type VoiceGrant } from '../src/access.js';
import { handleConnection } from '../src/ws-handler.js';
import { RoomManager } from '../src/rooms.js';
const now = Date.now();
const grants: VoiceGrant[] = [
  {token:'a'.repeat(40),room:'custom-final',name:'Player1',role:'player',team:'ORDER',expiresAt:now+60000},
  {token:'b'.repeat(40),room:'custom-final',name:'Player2',role:'player',team:'ORDER',expiresAt:now+60000},
  {token:'c'.repeat(40),room:'custom-final',name:'Enemy',role:'player',team:'CHAOS',expiresAt:now+60000},
];
class Socket extends EventEmitter {
  OPEN=1;readyState=1;sent:any[]=[];
  send(raw:string){this.sent.push(JSON.parse(raw));}
  close(){this.readyState=3;this.emit('close');}
  message(msg:unknown){this.emit('message',Buffer.from(JSON.stringify(msg)));}
}
describe('secured custom rooms',()=>{
  it('attests the secured player protocol on both fresh and repeated joins',()=>{
    const rooms=new RoomManager(true),sessions=new SessionRegistry(),ws=new Socket();
    handleConnection(ws as any,rooms,{markAlive(){}},undefined,{grants,sessions});
    const join={type:'join',room:grants[0].room,name:grants[0].name,team:'ORDER',invitation:grants[0].token};
    try{
      ws.message(join);
      ws.message(join);
      const states=ws.sent.filter(m=>m.type==='room_state');
      expect(states).toHaveLength(2);
      for(const state of states){
        // These are the fields accepted by the shipped SignalingService.
        expect(state).toMatchObject({role:'player',teamIsolation:true,peers:[]});
        expect(state.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
        expect(sessions.get('Bearer '+state.sessionToken)?.name).toBe(grants[0].name);
      }
      expect(states[0].sessionToken).toBe(states[1].sessionToken);
    }finally{ws.close();}
  });
  it('validates grants and refuses malformed/duplicate configurations',()=>{
    expect(loadGrants(JSON.stringify(grants),['player'])).toHaveLength(3);
    for(const value of [{}, [null], [{...grants[0],role:'admin'}], [{...grants[0],team:undefined}], [grants[0],grants[0]]])
      expect(()=>loadGrants(JSON.stringify(value),['player'])).toThrow();
    expect(authorizeGrant(grants,grants[0].token)?.name).toBe('Player1');
    expect(authorizeGrant(grants,grants[0].token,grants[0].expiresAt)).toBeUndefined();
    expect(authorizeGrant(grants,'bad')).toBeUndefined();
  });
  it('binds identity/team to the invitation, isolates enemy signals and strips presence payloads',()=>{
    const rooms=new RoomManager(true),sessions=new SessionRegistry();
    const sockets=grants.map(()=>new Socket());
    const bad=new Socket();
    for(const ws of [...sockets,bad]) handleConnection(ws as any,rooms,{markAlive(){}},undefined,{grants,sessions});
    try{
      bad.message({type:'join',room:'custom-final',name:'Player1',team:'ORDER'});
      expect(rooms.getClientInfo(bad as any)).toBeUndefined();
      for(let i=0;i<grants.length;i++) sockets[i].message({type:'join',room:grants[i].room,name:grants[i].name,team:'CHAOS',invitation:grants[i].token});
      const [one,two,enemy]=sockets;
      expect(rooms.getClientInfo(one as any)?.team).toBe('ORDER');
      expect(two.sent.find(m=>m.type==='room_state').peers).toEqual(['Player1']);
      expect(enemy.sent.find(m=>m.type==='room_state').peers).toEqual([]);
      expect(one.sent.filter(m=>m.type==='peer_joined').map(m=>m.name)).toEqual(['Player2']);
      const token=one.sent.find(m=>m.type==='room_state').sessionToken;
      expect(sessions.get('Bearer '+token)?.name).toBe('Player1');
      expect(sessions.get('Bearer '+grants[0].token)).toBeUndefined();
      one.message({type:'signal',to:'Enemy',payload:{type:'offer'}});
      expect(enemy.sent.some(m=>m.type==='signal')).toBe(false);
      one.message({type:'signal',to:'Player2',payload:{type:'ice-candidate',payload:{candidate:'test'}}});
      expect(two.sent.at(-1).type).toBe('signal');
      one.message({type:'position',blob:JSON.stringify({summonerName:'Enemy',championName:'Lux',team:'CHAOS',x:2000,secret:'test'})});
      const metadata=JSON.parse(two.sent.at(-1).blob);
      expect(metadata).toEqual({summonerName:'Player1',championName:'Lux',team:'ORDER',isMuted:false,isDead:false});
      expect(enemy.sent.some(m=>m.type==='position')).toBe(false);
      one.close(); expect(sessions.get('Bearer '+token)).toBeUndefined();
    }finally{for(const ws of [...sockets,bad])ws.close();}
  });
});
