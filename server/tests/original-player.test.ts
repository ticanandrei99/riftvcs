import {afterEach,describe,it,expect} from 'vitest';
import {EventEmitter} from 'node:events';
import {OriginalPlayerVoice} from '../src/original-player.js';
import {SessionRegistry,type VoiceGrant} from '../src/access.js';
import {RoomManager} from '../src/rooms.js';
import {Heartbeat} from '../src/heartbeat.js';
class Socket extends EventEmitter{OPEN=1;readyState=1;bufferedAmount=0;sent:any[]=[];code=0;send(value:string){this.sent.push(JSON.parse(value));}close(code=1000){if(this.readyState===3)return;this.readyState=3;this.code=code;this.emit('close');}terminate(){this.close();}ping(){}message(value:unknown){this.emit('message',Buffer.from(JSON.stringify(value)));}}
const sockets:Socket[]=[];
afterEach(()=>{for(const socket of sockets.splice(0))socket.close();});
function setup(){const grants:VoiceGrant[]=[{token:'a'.repeat(43),room:'original-custom',name:'Alice',team:'ORDER',role:'player',expiresAt:Date.now()+60000},{token:'b'.repeat(43),room:'original-custom',name:'Bob',team:'CHAOS',role:'player',expiresAt:Date.now()+60000},{token:'c'.repeat(43),room:'original-custom',name:'Caster',role:'caster',expiresAt:Date.now()+60000}];const sessions=new SessionRegistry(),control=new RoomManager(true),engine=new OriginalPlayerVoice(grants,sessions,control);return {grants,sessions,control,engine};}
function open(h:ReturnType<typeof setup>,index:number){const socket=new Socket();sockets.push(socket);h.engine.handle(socket as any,new Heartbeat());const grant=h.grants[index];socket.message({type:'join',room:grant.room,name:grant.name,team:grant.team,invitation:grant.token});return socket;}
const status=(name:string,team:string)=>({type:'position',blob:JSON.stringify({summonerName:name,team,championName:'Teemo',isMuted:false,isDead:false})});
describe('original player engine behind invitation admission',()=>{
  it('preserves upstream opposing-team discovery after authenticated admission and returns a socket-bound player bearer',()=>{
    const h=setup(),alice=open(h,0),bob=open(h,1);expect(alice.sent[0]).toMatchObject({type:'room_state',role:'player',originalPlayerProtocol:1,peers:[]});expect(bob.sent[0].peers).toEqual(['Alice']);
    expect(h.sessions.get('Bearer '+bob.sent[0].sessionToken)).toMatchObject({name:'Bob',role:'player'});expect(h.engine.roomCount).toBe(1);
  });
  it('rejects unknown and caster grants before the upstream handler can join',()=>{
    const h=setup(),caster=open(h,2);expect(caster.sent.at(-1).type).toBe('error');expect(h.engine.roomCount).toBe(0);
    const bad=new Socket();sockets.push(bad);h.engine.handle(bad as any,new Heartbeat());bad.message({type:'join',room:'original-custom',name:'Alice',team:'ORDER',invitation:'z'.repeat(43)});expect(bad.sent[0].type).toBe('error');expect(h.sessions.has(bad as any)).toBe(false);
  });
  it('keeps identity fixed and relays only validated audio signaling inside the original player room',()=>{
    const h=setup(),alice=open(h,0),bob=open(h,1);alice.message({type:'join',room:'other',name:'Alice',team:'ORDER'});expect(alice.sent.at(-1).message).toContain('fixed');
    alice.message({type:'signal',to:'Bob',payload:{type:'offer',payload:{type:'offer',sdp:'v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n'}}});expect(alice.sent.at(-1).message).toContain('Only audio');
    alice.message({type:'signal',to:'Bob',payload:{type:'offer',payload:{type:'offer',sdp:'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=sendrecv\r\n'}}});expect(bob.sent.at(-1)).toMatchObject({type:'signal',from:'Alice'});
    alice.message({type:'caster_join',token:h.grants[2].token});expect(alice.sent.at(-1).message).toContain('denied');
  });
  it('uses the unchanged upstream volume calculation and prevents querying another player',()=>{
    const h=setup(),alice=open(h,0),bob=open(h,1);alice.message(status('Alice','ORDER'));bob.message(status('Bob','CHAOS'));
    alice.message({type:'coords',x:1000,y:1000,vis:[[1100,1000]]});bob.message({type:'coords',x:1100,y:1000,vis:[[1000,1000]]});
    const request={roomId:'original-custom',name:'Alice',myPosition:{x:1000,y:1000},allyProximity:true};const result=h.engine.compute(alice as any,request);expect(result.peerVolumes.Bob).toBeGreaterThan(0);expect(result).not.toHaveProperty('positions');
    expect(()=>h.engine.compute(alice as any,{...request,name:'Bob'})).toThrow('Invalid');expect(()=>h.engine.compute(alice as any,{...request,roomId:'other'})).toThrow('Invalid');
    // This upstream server scores proximity. Camera/fog filtering belongs to its
    // unchanged client CameraHearing implementation, not a server RTP gateway.
    alice.message({type:'coords',x:1000,y:1000,vis:[]});expect(h.engine.compute(alice as any,request).peerVolumes.Bob).toBeGreaterThan(0);
  });
  it('revokes an active player and tells the other original peers to remove it',()=>{
    const h=setup(),alice=open(h,0),bob=open(h,1);h.grants[0].voiceMuted=true;alice.message({type:'coords',x:1000,y:1000});expect(alice.code).toBe(4003);expect(h.sessions.has(alice as any)).toBe(false);expect(bob.sent.at(-1)).toEqual({type:'peer_left',name:'Alice'});
  });
  it('does not let a forged position blob impersonate a different player or authority',()=>{
    const h=setup(),alice=open(h,0),bob=open(h,1);const before=bob.sent.length;alice.message(status('Administrator','ORDER'));expect(alice.sent.at(-1).message).toContain('status');expect(bob.sent).toHaveLength(before);
    alice.message(status('Alice','ORDER'));expect(bob.sent.at(-1)).toMatchObject({type:'position',from:'Alice'});
  });
});
