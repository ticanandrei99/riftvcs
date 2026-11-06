import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {spawn,type ChildProcess} from 'node:child_process';
import {WebSocket} from 'ws';
const port=32005,base=`http://127.0.0.1:${port}`,adminPassword='test-only-admin-passphrase',moderatorPassword='test-only-moderator-passphrase';
let child:ChildProcess;const sockets:WebSocket[]=[],inboxes=new Map<WebSocket,any[]>();
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
beforeAll(async()=>{
  child=spawn(process.execPath,['dist/index.js'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),ORGANIZER_PASSWORD:adminPassword,MODERATOR_PASSWORD:moderatorPassword,ORGANIZER_STORE_PATH:'',PLAYER_GRANTS_JSON:'[]',CASTER_GRANTS_JSON:'[]',RIFTVOICE_INSECURE_TEST_MODE:'0',ENEMY_CAMERA_VOICE:'0',CAMERA_MEDIA_LOOPBACK_TEST:'0',TURN_KEY_ID:'',TURN_KEY_API_TOKEN:'',TURN_URLS:'turn:test.invalid:3478',TURN_USERNAME:'test',TURN_PASSWORD:'test'},stdio:['ignore','pipe','pipe']});
  await new Promise<void>((yes,no)=>{const timer=setTimeout(()=>no(Error('organizer server startup timeout')),10000);child.stdout!.on('data',chunk=>{if(chunk.toString().includes('listening on')){clearTimeout(timer);yes();}});child.once('exit',()=>{clearTimeout(timer);no(Error('organizer server exited'));});});
},15000);
afterAll(()=>{sockets.forEach(ws=>ws.terminate());child?.kill();});
async function connect(path='/organizer'){
  const ws=new WebSocket(`ws://127.0.0.1:${port}${path}`);sockets.push(ws);inboxes.set(ws,[]);ws.on('message',raw=>inboxes.get(ws)!.push(JSON.parse(raw.toString())));
  await new Promise<void>((yes,no)=>{ws.once('open',()=>yes());ws.once('error',no);});return ws;
}
async function until<T>(read:()=>T|undefined|false):Promise<T>{for(let i=0;i<200;i++){const value=read();if(value)return value as T;await delay(10);}throw Error('Expected organizer update missing');}
async function send(ws:WebSocket,msg:any,type:string){
  const from=inboxes.get(ws)!.length;ws.send(JSON.stringify(msg));
  const result=await until(()=>inboxes.get(ws)!.slice(from).find(v=>v.type===type&&(type!=='organizer_state'||msg.type!=='event_close'||!v.events.some((e:any)=>e.id===msg.eventId))));
  if(type==='organizer_ready')await until(()=>inboxes.get(ws)!.slice(from).find(v=>v.type==='organizer_state'));
  return result;
}
const latestState=(ws:WebSocket)=>inboxes.get(ws)!.filter(v=>v.type==='organizer_state').at(-1);
const joinMessage=(name:string,invitation:string,team='ORDER')=>({type:'join',room:'actual-custom-game',name,team,invitation,eventInviteProtocol:1});
describe('administrator/moderator live control',()=>{
  it('refuses generation before password and assigns moderator role from the password, not client claims',async()=>{
    const unauthenticated=await connect();
    expect((await send(unauthenticated,{type:'event_create',title:'Unauthorized',casterName:'Caster',hours:1},'organizer_error')).message).toContain('Autentificarea');
    expect((await send(unauthenticated,{type:'organizer_auth',password:'wrong-password',role:'organizer'},'organizer_error')).message).toContain('Parolă');unauthenticated.terminate();
    const moderator=await connect();const ready=await send(moderator,{type:'organizer_auth',password:moderatorPassword,role:'organizer'},'organizer_ready');
    expect(ready.role).toBe('moderator');expect(ready.sessionToken).toBeUndefined();
    const created=await send(moderator,{type:'event_create',title:'Moderator room',casterName:'Moderator caster',hours:1},'organizer_state');
    expect(created.events).toHaveLength(1);await send(moderator,{type:'event_close',eventId:created.events[0].id},'organizer_state');moderator.terminate();
  });
  it('creates one invitation for ten, requires approval, reports real joins and revokes the whole room',async()=>{
    const admin=await connect(),moderator=await connect();
    expect((await send(admin,{type:'organizer_auth',password:adminPassword},'organizer_ready')).role).toBe('organizer');
    expect((await send(moderator,{type:'organizer_auth',password:moderatorPassword},'organizer_ready')).role).toBe('moderator');
    const state=await send(admin,{type:'event_create',title:'Community custom',casterName:'Comentator',hours:8},'organizer_state');const event=state.events[0];
    expect(event.invite).toMatch(/^RV-/);const players:WebSocket[]=[],tokens:string[]=[];
    for(let i=0;i<10;i++){
      const ws=await connect('/ws'),name='Player'+i,team=i<5?'ORDER':'CHAOS';players.push(ws);
      await send(ws,joinMessage(name,event.invite,team),'join_pending');
      expect((await fetch(base+'/turn-credentials',{headers:{Authorization:'Bearer '+event.invite}})).status).toBe(401);
      const pending=await until(()=>latestState(admin)?.events.find((e:any)=>e.id===event.id)?.pending.find((p:any)=>p.name===name));
      const before=inboxes.get(ws)!.length;
      await send(i%2?moderator:admin,{type:'event_approve',requestId:pending.id,team},'organizer_state');
      const approved=await until(()=>inboxes.get(ws)!.slice(before).find(m=>m.type==='join_approved'));tokens.push(approved.invitation);
      const room=await send(ws,joinMessage(name,approved.invitation,team),'room_state');expect(room.role).toBe('player');
      expect(inboxes.get(ws)!.some(m=>m.type==='organizer_state')).toBe(false);
    }
    const online=await until(()=>{const e=latestState(admin)?.events.find((e:any)=>e.id===event.id);return e?.players.filter((p:any)=>p.connected).length===10&&e;});
    expect(online.players.filter((p:any)=>p.team==='ORDER')).toHaveLength(5);expect(JSON.stringify(online)).not.toContain('position');
    const extra=await connect('/ws');expect((await send(extra,joinMessage('Extra',event.invite),'error')).message).toContain('10');extra.terminate();
    const caster=await connect('/caster');const casterReady=await send(caster,{type:'caster_join',token:event.casterInvitation},'caster_ready');expect(casterReady.role).toBe('caster');
    expect(casterReady.peers).toEqual([]);expect((await fetch(base+'/compute-volumes',{method:'POST',headers:{Authorization:'Bearer '+casterReady.sessionToken,'Content-Type':'application/json'},body:'{}'})).status).toBe(403);
    await send(moderator,{type:'event_remove',eventId:event.id,name:'Player0'},'organizer_state');
    await until(()=>players[0].readyState===WebSocket.CLOSED);
    const old=await connect('/ws');expect((await send(old,joinMessage('Player0',tokens[0]),'error')).message).toContain('Invitație');old.terminate();
    await send(moderator,{type:'event_close',eventId:event.id},'organizer_state');
    await until(()=>players.every(ws=>ws.readyState===WebSocket.CLOSED)&&caster.readyState===WebSocket.CLOSED);
    expect(latestState(moderator).events).toEqual([]);admin.terminate();moderator.terminate();
  });
});
