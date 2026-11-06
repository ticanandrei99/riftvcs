import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { WebSocket } from 'ws';
const port=32006,adminPassword='test-only-admin-secret',daniPassword='test-only-dani-secret',mariaPassword='test-only-maria-secret';
let child:ChildProcess;
const sockets:WebSocket[]=[],inboxes=new Map<WebSocket,any[]>();
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function until(read:()=>any){for(let i=0;i<200;i++){const value=read();if(value)return value;await sleep(10);}throw Error('Missing moderation result');}
beforeAll(async()=>{
  child=spawn(process.execPath,['dist/index.js'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),ORGANIZER_PASSWORD:adminPassword,MODERATOR_PASSWORD:'',MODERATOR_ACCOUNTS_JSON:JSON.stringify([{name:'Dani',password:daniPassword},{name:'Maria',password:mariaPassword}]),ORGANIZER_STORE_PATH:'',PLAYER_GRANTS_JSON:'[]',CASTER_GRANTS_JSON:'[]',RIFTVOICE_INSECURE_TEST_MODE:'0',ENEMY_CAMERA_VOICE:'0',CAMERA_MEDIA_LOOPBACK_TEST:'0'},stdio:['ignore','pipe','pipe']});
  await new Promise<void>((yes,no)=>{const timer=setTimeout(()=>no(Error('Server startup timeout')),10000);child.stdout!.on('data',raw=>{if(raw.toString().includes('listening on')){clearTimeout(timer);yes();}});child.once('exit',()=>{clearTimeout(timer);no(Error('Server exited'));});});
},15000);
afterAll(()=>{sockets.forEach(ws=>ws.terminate());child?.kill();});
async function connect(path='/organizer'){
  const ws=new WebSocket(`ws://127.0.0.1:${port}${path}`);sockets.push(ws);inboxes.set(ws,[]);ws.on('message',raw=>inboxes.get(ws)!.push(JSON.parse(raw.toString())));
  await new Promise<void>((yes,no)=>{ws.once('open',()=>yes());ws.once('error',no);});return ws;
}
async function send(ws:WebSocket,msg:unknown,type:string){const from=inboxes.get(ws)!.length;ws.send(JSON.stringify(msg));return until(()=>inboxes.get(ws)!.slice(from).find(m=>m.type===type));}
const state=(ws:WebSocket)=>inboxes.get(ws)!.filter(m=>m.type==='organizer_state').at(-1);
describe('named moderation over the real server',()=>{
  it('binds actor identities to credentials, protects admin voice and audits mute, unmute and denied attempts',async()=>{
    const admin=await connect(),dani=await connect(),maria=await connect();
    await send(admin,{type:'organizer_auth',password:adminPassword},'organizer_ready');
    const daniReady=await send(dani,{type:'organizer_auth',account:'Dani',password:daniPassword,name:'Administrator',role:'organizer'},'organizer_ready');
    expect(daniReady).toMatchObject({name:'Dani',role:'moderator'});
    await send(maria,{type:'organizer_auth',account:'Maria',password:mariaPassword},'organizer_ready');
    const created=await send(dani,{type:'event_create',title:'Moderated custom',casterName:'Streamer',hours:1},'organizer_state');const event=created.events[0];
    const adminInvitation=(await send(admin,{type:'event_caster',eventId:event.id},'organizer_caster_invitation')).invitation;
    expect(JSON.stringify(state(dani))).not.toContain(adminInvitation);
    const adminVoice=await connect('/caster');await send(adminVoice,{type:'caster_join',token:adminInvitation,role:'moderator'},'caster_ready');
    const denied=await send(dani,{type:'event_moderate',eventId:event.id,kind:'staff',targetId:'administrator',muted:true,actorRole:'organizer'},'organizer_error');
    expect(denied.message).toContain('administratorului');expect(adminVoice.readyState).toBe(WebSocket.OPEN);
    await until(()=>state(admin)?.audit.some((a:any)=>a.actorName==='Dani'&&a.action==='mute_denied'));
    expect(state(dani).audit).toBeUndefined();expect(state(maria).audit).toBeUndefined();
    const player=await connect('/registration');await send(player,{type:'lobby_register',name:'Player#EUNE',invitation:event.invite},'lobby_pending');
    const pending=await until(()=>state(dani)?.events[0].pending[0]);
    const start=inboxes.get(player)!.length;await send(dani,{type:'event_approve',requestId:pending.id,team:'ORDER'},'organizer_state');
    const reservation=(await until(()=>inboxes.get(player)!.slice(start).find(m=>m.type==='lobby_approved'))).invitation;
    const game=await connect('/ws');const approval=await send(game,{type:'join',room:'moderated-game',name:'Player#EUNE',team:'ORDER',invitation:reservation,eventInviteProtocol:1},'join_approved');
    const joined=await send(game,{type:'join',room:'moderated-game',name:'Player#EUNE',team:'ORDER',invitation:approval.invitation,eventInviteProtocol:1},'room_state');
    await send(dani,{type:'event_moderate',eventId:event.id,kind:'player',targetId:'Player#EUNE',muted:true,actorName:'Maria'},'organizer_state');
    await until(()=>game.readyState===WebSocket.CLOSED);
    expect((await fetch(`http://127.0.0.1:${port}/turn-credentials`,{headers:{Authorization:'Bearer '+joined.sessionToken}})).status).toBe(401);
    const retry=await connect('/ws');expect((await send(retry,{type:'join',room:'moderated-game',name:'Player#EUNE',team:'ORDER',invitation:approval.invitation,eventInviteProtocol:1},'error')).message).toContain('Invitație');
    await send(maria,{type:'event_moderate',eventId:event.id,kind:'player',targetId:'Player#EUNE',muted:false},'organizer_state');
    await until(()=>state(admin)?.audit.some((a:any)=>a.actorName==='Maria'&&a.action==='unmute'));
    expect(state(admin).audit.find((a:any)=>a.action==='mute')).toMatchObject({actorName:'Dani',actorId:'moderator:dani',targetName:'Player#EUNE'});
    const rejoined=await send(retry,{type:'join',room:'moderated-game',name:'Player#EUNE',team:'ORDER',invitation:approval.invitation,eventInviteProtocol:1},'room_state');expect(rejoined.role).toBe('player');
    await send(dani,{type:'event_move',eventId:event.id,name:'Player#EUNE',team:'CHAOS'},'organizer_error');
    expect(state(admin).events[0].players[0].team).toBe('ORDER');
    await send(admin,{type:'event_close',eventId:event.id},'organizer_state');
    await until(()=>adminVoice.readyState===WebSocket.CLOSED&&retry.readyState===WebSocket.CLOSED);
    expect(state(admin).audit).toHaveLength(3);expect(state(admin).events).toHaveLength(0);
  });
});
