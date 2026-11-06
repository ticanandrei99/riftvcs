/** Real HTTP/WS tests of production defaults, distinct from legacy loopback fixtures. */
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { WebSocket } from 'ws';
const port = 32003, base = `http://127.0.0.1:${port}`;
const grants = ['Alice','Bob','Enemy'].map((name,i)=>({ token: String.fromCharCode(97+i).repeat(40), name, room:'secure-custom', role:'player', team:i===2?'CHAOS':'ORDER', expiresAt:Date.now()+120000 }));
const casters = [{ token:'d'.repeat(40),name:'Commentator',room:'secure-custom',role:'caster',expiresAt:Date.now()+120000 }];
let child: ChildProcess;
const sockets: WebSocket[]=[];
beforeAll(async()=>{
  child=spawn(process.execPath,['dist/index.js'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),RIFTVOICE_INSECURE_TEST_MODE:'0',PLAYER_GRANTS_JSON:JSON.stringify(grants),CASTER_GRANTS_JSON:JSON.stringify(casters),TURN_KEY_ID:'',TURN_KEY_API_TOKEN:'',TURN_URLS:'turn:relay.example:3478',TURN_USERNAME:'test',TURN_PASSWORD:'test',TRUSTED_PROXIES:'off'},stdio:['ignore','pipe','pipe']});
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server startup timeout')),10000);child.stdout!.on('data',data=>{if(data.toString().includes('listening on')){clearTimeout(timer);resolve();}});child.on('exit',()=>{clearTimeout(timer);reject(Error('server exited'));});});
},15000);
afterAll(()=>{sockets.forEach(ws=>ws.terminate());child?.kill();});
async function connect(path='/ws'){
  const ws=new WebSocket(`ws://127.0.0.1:${port}${path}`);sockets.push(ws);
  await new Promise<void>((yes,no)=>{ws.once('open',()=>yes());ws.once('error',no);});return ws;
}
function send(ws:WebSocket,msg:unknown,type:string){
  return new Promise<any>((resolve,reject)=>{
    const timer=setTimeout(()=>{ws.off('message',read);reject(Error('message timeout: '+type));},3000);
    const read=(data:any)=>{const value=JSON.parse(data.toString());if(value.type===type){clearTimeout(timer);ws.off('message',read);resolve(value);}};
    ws.on('message',read);ws.send(JSON.stringify(msg));
  });
}
const join=(ws:WebSocket,i:number)=>send(ws,{type:'join',room:grants[i].room,name:grants[i].name,team:'CHAOS',invitation:grants[i].token},'room_state');
describe('production access policy',()=>{
  it('protects volume/relay endpoints and blocks unapproved browser origins',async()=>{
    const health=await(await fetch(base+'/health')).json();expect(health.authenticationRequired).toBe(true);expect(health.teamIsolation).toBe(true);
    expect((await fetch(base+'/turn-credentials')).status).toBe(401);
    expect((await fetch(base+'/compute-volumes',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status).toBe(401);
    expect((await fetch(base+'/health',{headers:{Origin:'https://untrusted.example'}})).status).toBe(403);
    const ws=await connect();const error=await send(ws,{type:'join',room:'secure-custom',name:'Alice',team:'ORDER'},'error');expect(error.message).toContain('Invitație');ws.terminate();
  });
  it('authenticates HTTP to the active socket and never exposes enemy audio/presence/volumes',async()=>{
    const a=await connect(),b=await connect(),enemy=await connect();
    const first=await join(a,0),second=await join(b,1),third=await join(enemy,2);
    expect(second.peers).toEqual(['Alice']);expect(third.peers).toEqual([]);
    const auth={Authorization:'Bearer '+first.sessionToken,'Content-Type':'application/json'};
    expect((await fetch(base+'/turn-credentials',{headers:auth})).status).toBe(200);
    const query={roomId:'secure-custom',name:'Alice',myPosition:{x:1100,y:1000}};
    const volumes=await(await fetch(base+'/compute-volumes',{method:'POST',headers:auth,body:JSON.stringify(query)})).json();
    expect(volumes.peerVolumes).toEqual({Bob:1});
    expect((await fetch(base+'/compute-volumes',{method:'POST',headers:auth,body:JSON.stringify({...query,name:'Enemy'})})).status).toBe(403);
    const denied=await send(a,{type:'signal',to:'Enemy',payload:{type:'ice-candidate',payload:{candidate:'test'}}},'error');expect(denied.message).toContain('not found');
    a.close();await new Promise<void>(resolve=>a.once('close',()=>resolve()));
    expect((await fetch(base+'/turn-credentials',{headers:auth})).status).toBe(401);
    b.terminate();enemy.terminate();
  });
  it('caster credentials cannot query player volumes or enter the player channel',async()=>{
    const ws=await connect('/caster');const ready=await send(ws,{type:'caster_join',token:casters[0].token},'caster_ready');
    const response=await fetch(base+'/compute-volumes',{method:'POST',headers:{Authorization:'Bearer '+ready.sessionToken,'Content-Type':'application/json'},body:JSON.stringify({roomId:'secure-custom',name:'Alice',myPosition:{x:1000,y:1000}})});
    expect(response.status).toBe(403);ws.terminate();
    const player=await connect();const rejected=await send(player,{type:'join',room:'secure-custom',name:'Commentator',invitation:casters[0].token},'error');expect(rejected.message).toContain('Invitație');player.terminate();
  });
});
