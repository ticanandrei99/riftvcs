import {beforeAll,afterAll,it,expect} from 'vitest';
import {spawn,type ChildProcess} from 'node:child_process';
import {WebSocket} from 'ws';
const port=32016,base=`http://127.0.0.1:${port}`,password='caster-request-test-password';
let child:ChildProcess;const sockets:WebSocket[]=[],messages=new Map<WebSocket,any[]>();
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until<T>(read:()=>T|undefined|false|Promise<T|undefined|false>):Promise<T>{for(let i=0;i<200;i++){const value=await read();if(value)return value as T;await delay(25);}throw Error('Caster request update missing');}
beforeAll(async()=>{
  child=spawn(process.execPath,['dist/bootstrap.js'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),ORGANIZER_PASSWORD:password,MODERATOR_PASSWORD:'',MODERATOR_ACCOUNTS_JSON:'[]',ORGANIZER_STORE_PATH:'',PLAYER_GRANTS_JSON:'[]',CASTER_GRANTS_JSON:'[]',RIFTVOICE_INSECURE_TEST_MODE:'0',ENEMY_CAMERA_VOICE:'0',CAMERA_MEDIA_LOOPBACK_TEST:'0',TURN_KEY_ID:'',TURN_KEY_API_TOKEN:'',TURN_URLS:'',TURN_USERNAME:'',TURN_PASSWORD:'',TURN_SERVER:'',TURN_SECRET:''},windowsHide:true,stdio:'ignore'});
  await until(async()=>{try{return (await fetch(base+'/health')).ok;}catch{return false;}});
},10000);
afterAll(()=>{for(const ws of sockets)ws.terminate();child?.kill();});
async function connect(path:string){const ws=new WebSocket(`ws://127.0.0.1:${port}${path}`);sockets.push(ws);messages.set(ws,[]);ws.on('message',raw=>messages.get(ws)!.push(JSON.parse(raw.toString())));await new Promise<void>((yes,no)=>{ws.once('open',yes);ws.once('error',no);});return ws;}
async function send(ws:WebSocket,value:unknown,type:string){const start=messages.get(ws)!.length;ws.send(JSON.stringify(value));return until(()=>messages.get(ws)!.slice(start).find(m=>m.type===type));}
const state=(ws:WebSocket)=>messages.get(ws)!.filter(m=>m.type==='organizer_state').at(-1)?.events[0];

it('serves an inert invitation landing page without reflecting fragment credentials',async()=>{
  const response=await fetch(base+'/caster-invite#VC-'+'a'.repeat(43)),html=await response.text();
  expect(response.status).toBe(200);expect(html).toContain('Voxdria Caster 0.4.2');expect(html).not.toContain('VC-'+'a'.repeat(43));
  expect(html).not.toContain('<script');expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");expect(response.headers.get('x-frame-options')).toBe('DENY');
  const health=await (await fetch(base+'/health')).json() as any;expect(health).toMatchObject({serverVersion:'0.4.2',casterInviteProtocol:1,casterRequestsAvailable:true});
  expect((await fetch(base+'/caster-invite',{method:'HEAD'})).status).toBe(200);
});

it('requires authenticated approval and keeps admitted guests outside player and organizer privileges',async()=>{
  const admin=await connect('/organizer');expect((await send(admin,{type:'caster_approve',requestId:'forged',role:'organizer'},'organizer_error')).message).toContain('Autentificarea');
  await send(admin,{type:'organizer_auth',password},'organizer_ready');await until(()=>messages.get(admin)!.some(m=>m.type==='organizer_state'));
  await send(admin,{type:'event_create',title:'Guest custom',casterName:'Legacy caster',hours:1},'organizer_state');const event=state(admin);
  const wrong=await connect('/registration');expect((await send(wrong,{type:'caster_register',name:'Wrong',invitation:event.invite,requestedRole:'caster'},'error')).message).toContain('separat');wrong.terminate();
  const publicAudio=await connect('/caster');expect((await send(publicAudio,{type:'caster_join',token:event.casterInvite},'error')).type).toBe('error');publicAudio.terminate();
  const guest=await connect('/registration');await send(guest,{type:'caster_register',name:'Guest',invitation:event.casterInvite,requestedRole:'caster',role:'organizer'},'caster_pending');
  const pending=await until(()=>state(admin)?.casterPending.find((p:any)=>p.name==='Guest'));
  expect(messages.get(guest)!.some(m=>m.type==='caster_approved')).toBe(false);
  expect((await fetch(base+'/turn-credentials',{headers:{Authorization:'Bearer '+event.casterInvite}})).status).toBe(401);
  await send(admin,{type:'caster_approve',requestId:pending.id,role:'caster'},'organizer_state');
  const approved=await until(()=>messages.get(guest)!.find(m=>m.type==='caster_approved'));expect(approved).toMatchObject({name:'Guest',role:'caster'});expect(approved.authority).toBeUndefined();
  await until(()=>state(admin)?.casterPending.length===0);expect(JSON.stringify(state(admin))).not.toContain(approved.invitation);
  const audio=await connect('/caster'),ready=await send(audio,{type:'caster_join',token:approved.invitation,role:'organizer'},'caster_ready');expect(ready.role).toBe('caster');expect(ready.peers).toEqual([]);
  expect((await fetch(base+'/compute-volumes',{method:'POST',headers:{Authorization:'Bearer '+ready.sessionToken,'Content-Type':'application/json'},body:'{}'})).status).toBe(403);
  expect((await send(audio,{type:'coords',x:100,y:100},'error')).message).toContain('denied');
  const player=await connect('/ws');expect((await send(player,{type:'join',room:'fake-game',name:'Guest',team:'ORDER',invitation:approved.invitation,eventInviteProtocol:1},'error')).type).toBe('error');player.terminate();
  const control=await connect('/organizer');expect((await send(control,{type:'caster_approve',password:approved.invitation,requestId:pending.id,role:'caster'},'organizer_error')).message).toContain('Autentificarea');control.terminate();
  const listener=await connect('/registration');await send(listener,{type:'caster_register',name:'Listener',invitation:event.casterInvite,requestedRole:'spectator'},'caster_pending');
  const listenPending=await until(()=>state(admin)?.casterPending.find((p:any)=>p.name==='Listener'));
  expect((await send(admin,{type:'caster_approve',requestId:listenPending.id,role:'caster'},'organizer_error')).message).toContain('doar ascultare');
  await send(admin,{type:'caster_approve',requestId:listenPending.id,role:'spectator'},'organizer_state');const listenGrant=await until(()=>messages.get(listener)!.find(m=>m.type==='caster_approved'));
  const spectator=await connect('/caster');expect((await send(spectator,{type:'caster_join',token:listenGrant.invitation},'caster_ready')).role).toBe('spectator');
  const forbidden={type:'caster_signal',to:'Guest',payload:{type:'offer',payload:{type:'offer',sdp:'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=sendrecv\r\n'}}};
  expect((await send(spectator,forbidden,'error')).message).toContain('Spectator transmission denied');
  expect(messages.get(audio)!.some(m=>m.type==='caster_signal')).toBe(false);
  const guestId=await until(()=>state(admin)?.staff.find((p:any)=>p.name==='Guest')?.id);
  await send(admin,{type:'caster_remove',eventId:event.id,guestId},'organizer_state');await until(()=>audio.readyState===WebSocket.CLOSED);
  const removed=await connect('/caster');expect((await send(removed,{type:'caster_join',token:approved.invitation},'error')).type).toBe('error');removed.terminate();
  await send(admin,{type:'event_close',eventId:event.id},'organizer_state');await until(()=>spectator.readyState===WebSocket.CLOSED);admin.terminate();
},15000);
