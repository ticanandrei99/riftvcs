import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {spawn,type ChildProcess} from 'node:child_process';
import {WebSocket} from 'ws';
const port=32004,base=`http://127.0.0.1:${port}`;
const grants=['Alice','Enemy','OldClient'].map((name,i)=>({name,room:'camera-custom',role:'player',team:i===0?'ORDER':'CHAOS',token:String.fromCharCode(110+i).repeat(40),expiresAt:Date.now()+120000}));
const caster={name:'Caster',room:'camera-custom',role:'caster',token:'z'.repeat(40),expiresAt:Date.now()+120000};
const sockets:WebSocket[]=[],inboxes=new Map<WebSocket,any[]>();let child:ChildProcess;
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
beforeAll(async()=>{
  child=spawn(process.execPath,['dist/index.js'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),ENEMY_CAMERA_VOICE:'1',CAMERA_MEDIA_LOOPBACK_TEST:'0',RIFTVOICE_INSECURE_TEST_MODE:'0',PLAYER_GRANTS_JSON:JSON.stringify(grants),CASTER_GRANTS_JSON:JSON.stringify([caster]),TURN_KEY_ID:'',TURN_KEY_API_TOKEN:'',TURN_URLS:'turn:unused.invalid:3478',TURN_USERNAME:'test',TURN_PASSWORD:'test'},stdio:['ignore','pipe','pipe']});
  await new Promise<void>((yes,no)=>{const timer=setTimeout(()=>no(Error('camera server startup timeout')),10000);child.stdout!.on('data',data=>{if(data.toString().includes('listening on')){clearTimeout(timer);yes();}});child.once('exit',()=>{clearTimeout(timer);no(Error('camera server exited'));});});
},15000);
afterAll(()=>{sockets.forEach(ws=>ws.terminate());child?.kill();});
async function connect(path='/ws'){
  const ws=new WebSocket(`ws://127.0.0.1:${port}${path}`);sockets.push(ws);inboxes.set(ws,[]);ws.on('message',raw=>inboxes.get(ws)!.push(JSON.parse(raw.toString())));
  await new Promise<void>((yes,no)=>{ws.once('open',()=>yes());ws.once('error',no);});return ws;
}
async function send(ws:WebSocket,msg:any,type:string){
  const start=inboxes.get(ws)!.length;ws.send(JSON.stringify(msg));
  for(let i=0;i<150;i++){const found=inboxes.get(ws)!.slice(start).find(v=>v.type===type);if(found)return found;await wait(10);}throw Error('Missing '+type);
}
const join=(ws:WebSocket,i:number,capable=true)=>send(ws,{type:'join',name:grants[i].name,room:grants[i].room,invitation:grants[i].token,enemyCameraProtocol:capable?1:undefined},'room_state');
const camera=(ws:WebSocket,visible=true,sequence=1)=>ws.send(JSON.stringify({type:'enemy_camera',nonce:inboxes.get(ws)!.filter(m=>m.type==='camera_challenge').at(-1)?.nonce,enabled:true,report:{sequence,ageMs:0,self:{x:1000,y:1000},camera:{x:1400,y:1000,w:1600,h:1000},visible:visible?[{name:'Enemy',x:1500,y:1000}]:[]}}));
describe('authenticated camera feature policy over real HTTP and WebSocket',()=>{
  it('keeps old clients isolated and sends challenges only to capable players',async()=>{
    const old=await connect(),a=await connect();const legacy=await join(old,2,false),ready=await join(a,0);
    expect(legacy.enemyCameraVoice).toBe(false);expect(ready.enemyCameraVoice).toBe(true);expect(ready.peers).not.toContain('OldClient');
    await wait(30);expect(inboxes.get(old)!.some(m=>m.type==='camera_challenge')).toBe(false);
    expect(inboxes.get(a)!.some(m=>m.type==='camera_challenge')).toBe(true);old.terminate();a.terminate();await wait(20);
  });
  it('returns enemy volume only with fresh camera permission and never relays enemy SDP/ICE',async()=>{
    const a=await connect(),enemy=await connect();const ready=await join(a,0),other=await join(enemy,1);
    expect(other.peers).toEqual(['Alice']);
    for(const ws of [a,enemy])ws.send(JSON.stringify({type:'position',blob:JSON.stringify({championName:'Synthetic',isDead:false,isMuted:false})}));
    const query=async()=>await(await fetch(base+'/compute-volumes',{method:'POST',headers:{Authorization:'Bearer '+ready.sessionToken,'Content-Type':'application/json'},body:JSON.stringify({roomId:'camera-custom',name:'Alice',myPosition:{x:9999,y:9999}})})).json();
    camera(a);camera(enemy,false);await wait(30);expect((await query()).peerVolumes.Enemy).toBe(1);
    camera(a,false,2);await wait(30);expect((await query()).peerVolumes.Enemy).toBeUndefined();
    camera(a,true,3);await wait(30);expect((await query()).peerVolumes.Enemy).toBe(1);
    // The server's challenge expires even if a delayed report claims ageMs=0.
    const oldNonce=inboxes.get(a)!.filter(m=>m.type==='camera_challenge').at(-1).nonce;
    await wait(500);a.send(JSON.stringify({type:'enemy_camera',nonce:oldNonce,enabled:true,report:{sequence:4,ageMs:0,self:{x:1000,y:1000},camera:{x:1400,y:1000,w:1600,h:1000},visible:[{name:'Enemy',x:1500,y:1000}]}}));
    await wait(20);expect((await query()).peerVolumes.Enemy).toBeUndefined();
    const denied=await send(a,{type:'signal',to:'Enemy',payload:{type:'ice-candidate',payload:{candidate:'candidate:1 1 udp 1 127.0.0.1 3000 typ host'}}},'error');
    expect(denied.message).toContain('Camera audio');expect(inboxes.get(enemy)!.some(m=>m.type==='signal')).toBe(false);
    a.terminate();enemy.terminate();await wait(20);
  });
  it('does not allow caster grants into camera voice or player endpoints',async()=>{
    const ws=await connect('/caster');const ready=await send(ws,{type:'caster_join',token:caster.token},'caster_ready');
    expect((await fetch(base+'/compute-volumes',{method:'POST',headers:{Authorization:'Bearer '+ready.sessionToken,'Content-Type':'application/json'},body:'{}'})).status).toBe(403);
    const player=await connect();expect((await send(player,{type:'join',name:caster.name,room:caster.room,invitation:caster.token,enemyCameraProtocol:1},'error')).message).toContain('Invitație');
    expect(inboxes.get(ws)!.some(m=>m.type==='camera_challenge')).toBe(false);ws.terminate();player.terminate();
  });
});
