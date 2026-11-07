import {redactLogText,safeLogArguments} from '../../src/core/redact';
test('removes invitations, bearer sessions and structured credentials from diagnostic output',()=>{
  const reservation='r'.repeat(43),code='RV-'+'s'.repeat(43);
  const result=safeLogArguments(['received '+code+' / '+reservation,'Bearer '+reservation,{username:'visible',password:'short password',nested:{credential:'turn-pass',sessionToken:reservation}},new Error('invitation='+code)]).join(' ');
  for(const secret of [reservation,code,'short password','turn-pass'])expect(result).not.toContain(secret);expect(result).toContain('visible');expect(result).toContain('[redacted]');
});
test('keeps ordinary diagnostic messages useful and does not stringify circular objects unsafely',()=>{
  expect(redactLogText('microphone disconnected; HTTP 401')).toBe('microphone disconnected; HTTP 401');const value:any={};value.self=value;expect(safeLogArguments([value])).toEqual(['[unserializable diagnostic]']);
});
