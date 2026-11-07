import {parseCasterInvitation,validApprovedCaster,saveCaster,savedCaster,forgetCaster} from '../../src/caster/invitation';
const server='https://voice.example',code='VC-'+'a'.repeat(43);
test('commentator links use a separate code and the selected server only',()=>{
  expect(parseCasterInvitation(code,server)).toEqual({kind:'request',code});
  expect(parseCasterInvitation(server+'/caster-invite#'+code,server)).toEqual({kind:'request',code});
  expect(parseCasterInvitation('b'.repeat(43),server)).toEqual({kind:'personal',token:'b'.repeat(43)});
  // A private random token with a coincidental VC prefix is not a request code.
  expect(parseCasterInvitation('VC-'+'c'.repeat(40),server)).toHaveProperty('kind','personal');
  for(const value of ['RV-'+'x'.repeat(43),'https://evil.example/caster-invite#'+code,'https://user:pass@voice.example/caster-invite#'+code,server+'/caster-invite?invite='+code,server+'/wrong#'+code,server+'/caster-invite#'+code+'&role=organizer','x'.repeat(4097)])expect(parseCasterInvitation(value,server)).toHaveProperty('error');
});
test('stored approval is scoped to server, expires and excludes unrelated server fields',()=>{
  const values=new Map<string,string>(),previous=(globalThis as any).sessionStorage;(globalThis as any).sessionStorage={getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)};
  try{
    const grant={invitation:'a'.repeat(43),name:'Guest',role:'spectator' as const,expiresAt:Date.now()+60000};saveCaster(server,{...grant,authority:'organizer'} as any);
    expect(savedCaster(server)).toMatchObject(grant);expect(savedCaster('https://other.example')).toBeNull();expect([...values.values()][0]).not.toContain('authority');
    const entry=JSON.parse([...values.values()][0]);entry.expiresAt=Date.now()-1;values.set([...values.keys()][0],JSON.stringify(entry));expect(savedCaster(server)).toBeNull();
    forgetCaster();expect(values.size).toBe(0);
  }finally{(globalThis as any).sessionStorage=previous;}
});
test('only bounded approved audio roles and valid credentials can be remembered',()=>{
  const grant={invitation:'a'.repeat(43),name:'Guest',role:'caster',expiresAt:Date.now()+60000};expect(validApprovedCaster(grant)).toBe(true);
  for(const bad of [{...grant,role:'organizer'},{...grant,role:'player'},{...grant,name:'x\nY'},{...grant,invitation:code},{...grant,expiresAt:0}])expect(validApprovedCaster(bad)).toBe(false);
});
