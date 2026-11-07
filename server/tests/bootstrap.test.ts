import { describe,it,expect } from 'vitest';
import { spawn } from 'node:child_process';
async function boot(env:Record<string,string>){
  return new Promise<{code:number|null;output:string}>((resolve,reject)=>{
    const child=spawn(process.execPath,['dist/bootstrap.js'],{cwd:process.cwd(),env:{...process.env,PORT:'32010',ORGANIZER_PASSWORD:'',MODERATOR_PASSWORD:'',MODERATOR_ACCOUNTS_JSON:'[]',ORGANIZER_STORE_PATH:'',PLAYER_GRANTS_JSON:'[]',CASTER_GRANTS_JSON:'[]',RIFTVOICE_INSECURE_TEST_MODE:'0',ENEMY_CAMERA_VOICE:'0',CAMERA_MEDIA_LOOPBACK_TEST:'0',...env},stdio:['ignore','pipe','pipe']});
    let output='';const timer=setTimeout(()=>{child.kill();reject(Error('Bootstrap did not exit'));},5000);
    child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>output+=data);child.on('error',reject);child.on('exit',code=>{clearTimeout(timer);resolve({code,output});});
  });
}
describe('safe startup diagnostics',()=>{
  it('prints a safe configuration failure without leaking malformed JSON credentials',async()=>{
    const secret='test-secret-must-not-appear';const result=await boot({PLAYER_GRANTS_JSON:'{"token":"'+secret+'" broken'});
    expect(result.code).toBe(1);expect(result.output).toContain('[startup] Voxdria');expect(result.output).toContain('Invalid JSON configuration');expect(result.output).not.toContain(secret);
  });
  it('reports an invalid administrator password without printing it',async()=>{
    const result=await boot({ORGANIZER_PASSWORD:'secret123'});expect(result.code).toBe(1);expect(result.output).toContain('ORGANIZER_PASSWORD must contain');expect(result.output).not.toContain('secret123');
  });
  it('refuses partially numeric or out-of-range deployment ports',async()=>{
    for(const port of ['32010suffix','65536'])expect((await boot({PORT:port})).code).toBe(1);
  });
});
