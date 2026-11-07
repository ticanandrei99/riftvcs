import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { spawn,type ChildProcess } from 'node:child_process';
import { WebSocket } from 'ws';
import {SERVER_VERSION} from '../src/version.js';
const port=32009,password='test-only-lobby-admin';let child:ChildProcess;
const sockets:WebSocket[]=[],inboxes=new Map<WebSocket,any[]>(),closes=new Map<WebSocket,number>();
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(read:()=>any){for(let i=0;i<300;i++){const value=read();if(value)return value;await sleep(10);}throw Error('Missing lobby result');}
beforeAll(async()=>{
  child=spawn(process.execPath,['dist/bootstrap.js'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),ORGANIZER_PASSWORD:password,MODERATOR_PASSWORD:'',MODERATOR_ACCOUNTS_JSON:'[]',ORGANIZER_STORE_PATH:'',PLAYER_GRANTS_JSON:'[]',CASTER_GRANTS_JSON:'[]',RIFTVOICE_INSECURE_TEST_MODE:'0',ENEMY_CAMERA_VOICE:'0',CAMERA_MEDIA_LOOPBACK_TEST:'0',TURN_URLS:'turn:relay.example:3478',TURN_USERNAME:'dummy',TURN_CREDENTIAL:'dummy'},stdio:['ignore','pipe','pipe']});
  await new Promise<void>((yes,no)=>{const timer=setTimeout(()=>no(Error('Startup timeout')),10000);child.stdout!.on('data',raw=>{if(raw.toString().includes('listening on')){clearTimeout(timer);yes();}});child.once('exit',()=>{clearTimeout(timer);no(Error('Startup failed'));});});
},15000);
afterAll(()=>{sockets.forEach(socket=>socket.terminate());child?.kill();});
async function connect(path:string){const ws=new WebSocket(`ws://127.0.0.1:${port}${path}`);sockets.push(ws);inboxes.set(ws,[]);ws.on('message',raw=>inboxes.get(ws)!.push(JSON.parse(raw.toString())));ws.on('close',code=>closes.set(ws,code));await new Promise<void>((yes,no)=>{ws.once('open',()=>yes());ws.once('error',no);});return ws;}
async function send(ws:WebSocket,msg:unknown,type:string){const start=inboxes.get(ws)!.length;ws.send(JSON.stringify(msg));return until(()=>inboxes.get(ws)!.slice(start).find(m=>m.type===type));}
const state=(ws:WebSocket)=>inboxes.get(ws)!.filter(m=>m.type==='organizer_state').at(-1);
describe('isolated pregame voice through the real production server',()=>{
  it('enforces admission, team boundaries, revocation, reconnection and game handoff',async()=>{
    const admin=await connect('/organizer');await send(admin,{type:'organizer_auth',password},'organizer_ready');await until(()=>state(admin));
    const created=await send(admin,{type:'event_create',title:'Lobby security',casterName:'Streamer',hours:1},'organizer_state');const event=created.events[0];
    const forbidden=await connect('/lobby-voice');expect((await send(forbidden,{type:'lobby_join',token:event.invite},'error')).message).toContain('Invalid');
    const caster=await connect('/caster');await send(caster,{type:'caster_join',token:event.casterInvitation},'caster_ready');
    expect((await send(forbidden,{type:'lobby_join',token:event.casterInvitation},'error')).message).toContain('Invalid');
    async function register(name:string,team:string){
      const registration=await connect('/registration');await send(registration,{type:'lobby_register',name,invitation:event.invite},'lobby_pending');
      const pending=await until(()=>state(admin)?.events[0].pending.find((p:any)=>p.name===name));
      await send(admin,{type:'event_approve',requestId:pending.id,team},'organizer_state');
      const token=(await until(()=>inboxes.get(registration)!.find(m=>m.type==='lobby_approved'))).invitation;
      expect((await until(()=>inboxes.get(registration)!.find(m=>m.type==='lobby_state'))).lobbyVoiceAvailable).toBe(true);
      return {registration,token,name,team};
    }
    const a=await register('Alice#EU','ORDER'),b=await register('Bob#EU','ORDER'),enemy=await register('Enemy#EU','CHAOS');
    const av=await connect('/lobby-voice'),bv=await connect('/lobby-voice'),ev=await connect('/lobby-voice');
    const ar=await send(av,{type:'lobby_join',token:a.token},'lobby_ready');expect(ar.peers).toEqual([]);expect(ar.role).toBe('lobby-player');
    const br=await send(bv,{type:'lobby_join',token:b.token},'lobby_ready');expect(br.peers).toEqual([{name:a.name,role:'lobby-player'}]);
    expect((await send(ev,{type:'lobby_join',token:enemy.token},'lobby_ready')).peers).toEqual([]);
    expect(inboxes.get(caster)!.some(m=>m.type.startsWith('lobby_'))).toBe(false);
    const ice={type:'ice-candidate',payload:{candidate:'candidate:test',sdpMid:'0',sdpMLineIndex:0}};
    av.send(JSON.stringify({type:'lobby_signal',to:b.name,payload:ice}));expect((await until(()=>inboxes.get(bv)!.find(m=>m.type==='lobby_signal'))).from).toBe(a.name);
    for(const msg of [{type:'lobby_signal',to:enemy.name,payload:ice},{type:'lobby_signal',to:'Streamer',payload:ice},{type:'coords',x:100,y:100},{type:'lobby_signal',to:b.name,payload:{type:'offer',payload:{type:'offer',sdp:'v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n'}}}])expect(await send(av,msg,'error')).toHaveProperty('message');
    const volume=await fetch(`http://127.0.0.1:${port}/compute-volumes`,{method:'POST',headers:{Authorization:'Bearer '+ar.sessionToken,'Content-Type':'application/json'},body:JSON.stringify({roomId:event.id+'-lobby',name:a.name})});expect(volume.status).toBe(403);
    const replacement=await connect('/lobby-voice');const replacementReady=await send(replacement,{type:'lobby_join',token:a.token},'lobby_ready');await until(()=>closes.get(av));expect(closes.get(av)).toBe(4000);
    expect((await fetch(`http://127.0.0.1:${port}/turn-credentials`,{headers:{Authorization:'Bearer '+ar.sessionToken}})).status).toBe(401);
    await send(admin,{type:'event_move',eventId:event.id,name:a.name,team:'CHAOS'},'organizer_state');await until(()=>closes.get(replacement));expect(closes.get(replacement)).toBe(4004);
    expect((await fetch(`http://127.0.0.1:${port}/turn-credentials`,{headers:{Authorization:'Bearer '+replacementReady.sessionToken}})).status).toBe(401);
    const moved=await connect('/lobby-voice');const movedReady=await send(moved,{type:'lobby_join',token:a.token},'lobby_ready');expect(movedReady.team).toBe('CHAOS');expect(movedReady.peers.map((p:any)=>p.name)).toEqual([enemy.name]);
    await send(admin,{type:'event_moderate',eventId:event.id,kind:'player',targetId:a.name,muted:true},'organizer_state');await until(()=>closes.get(moved));expect(closes.get(moved)).toBe(4003);
    expect((await send(forbidden,{type:'lobby_join',token:a.token},'error')).message).toContain('Invalid');
    await send(admin,{type:'event_moderate',eventId:event.id,kind:'player',targetId:a.name,muted:false},'organizer_state');
    const unmuted=await connect('/lobby-voice');await send(unmuted,{type:'lobby_join',token:a.token},'lobby_ready');
    const game=await connect('/ws');const approval=await send(game,{type:'join',room:'lobby-to-game',name:a.name,team:'CHAOS',invitation:a.token,eventInviteProtocol:1},'join_approved');
    await until(()=>closes.get(bv)&&closes.get(ev)&&closes.get(unmuted));expect([bv,ev,unmuted].map(ws=>closes.get(ws))).toEqual([4004,4004,4004]);
    expect((await send(forbidden,{type:'lobby_join',token:b.token},'error')).message).toContain('Invalid');
    expect((await send(game,{type:'join',room:'lobby-to-game',name:a.name,team:'CHAOS',invitation:approval.invitation,eventInviteProtocol:1},'room_state')).role).toBe('player');
    expect(caster.readyState).toBe(WebSocket.OPEN);expect(inboxes.get(game)!.some(m=>m.type.startsWith('caster_')||m.type.startsWith('lobby_'))).toBe(false);
    expect((await fetch(`http://127.0.0.1:${port}/health`).then(r=>r.json()))).toMatchObject({serverVersion:SERVER_VERSION,lobbyVoiceProtocol:1,eventInviteProtocol:1});
  },20000);
});
