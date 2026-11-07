import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import { authorizeCaster, spectatorSdpAllowed, handleCasterConnection } from '../src/caster.js';
const grants = [
  { token: 'a'.repeat(40), room: 'custom-test', name: 'Caster', role: 'caster' as const, expiresAt: Date.now() + 60000 },
  { token: 'b'.repeat(40), room: 'custom-test', name: 'Viewer', role: 'spectator' as const, expiresAt: Date.now() + 60000 },
  { token: 'c'.repeat(40), room: 'other-test', name: 'Other', role: 'caster' as const, expiresAt: Date.now() + 60000 },
];
class Socket extends EventEmitter {
  OPEN = 1; readyState = 1; messages: any[] = [];
  send(raw: string) { this.messages.push(JSON.parse(raw)); }
  close() { this.readyState = 3; this.emit('close'); }
  message(msg: unknown) { this.emit('message', Buffer.from(JSON.stringify(msg))); }
}
describe('caster authorization and routing', () => {
  it('does not reflect credentials from malformed JSON into the error shown on stream',()=>{
    const ws=new Socket();handleCasterConnection(ws as any,grants);
    ws.emit('message',Buffer.from('{"password":"test-sensitive-fragment" broken'));
    expect(ws.messages.at(-1)).toEqual({type:'error',message:'Invalid JSON message'});expect(JSON.stringify(ws.messages)).not.toContain('test-sensitive-fragment');ws.close();
  });
  it('fails closed for missing, expired, short or unknown invitations', () => {
    for (const token of [undefined, '', 'x', 'z'.repeat(40)]) expect(authorizeCaster(grants, token)).toBeUndefined();
    expect(authorizeCaster(grants, grants[0].token, grants[0].expiresAt)).toBeUndefined();
    expect(authorizeCaster(grants, grants[1].token)?.role).toBe('spectator');
  });
  it('requires explicit receive-only audio SDP from spectators', () => {
    for (const direction of ['sendrecv','sendonly','']) expect(spectatorSdpAllowed({type:'offer',payload:{sdp:`v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=${direction}\r\n`}})).toBe(false);
    expect(spectatorSdpAllowed({type:'answer',payload:{sdp:'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=recvonly\r\n'}})).toBe(true);
    expect(spectatorSdpAllowed({type:'offer',payload:{sdp:'m=application 9 DTLS/SCTP 5000\r\na=recvonly\r\n'}})).toBe(false);
  });
  it('isolates rooms and rejects coordinates, role changes, normal joins and spectator sending', () => {
    const sockets = grants.map(g => { const ws = new Socket(); handleCasterConnection(ws as any, grants); ws.message({type:'caster_join',token:g.token}); return ws; });
    try {
      const [caster, viewer, other] = sockets;
      expect(caster.messages[0].type).toBe('caster_ready');
      expect(other.messages[0].peers).toEqual([]);
      for (const type of ['coords','position','join','shared_reset','reset_all']) {
        caster.message({type,room:'other-test',role:'caster'});
        expect(caster.messages.at(-1).type).toBe('error');
      }
      caster.message({type:'caster_signal',to:'Other',payload:{type:'offer'}});
      expect(caster.messages.at(-1).type).toBe('error');
      const before = caster.messages.length;
      viewer.message({type:'caster_signal',to:'Caster',payload:{type:'offer',payload:{sdp:'m=audio 9 RTP/AVP 0\r\na=sendrecv\r\n'}}});
      expect(caster.messages.length).toBe(before);
      caster.message({type:'caster_signal',to:'Viewer',payload:{type:'ice-candidate',payload:{candidate:'test'}}});
      expect(viewer.messages.at(-1).type).toBe('caster_signal');
      const duplicate = new Socket(); handleCasterConnection(duplicate as any, grants); duplicate.message({type:'caster_join',token:grants[0].token});
      expect(duplicate.messages.at(-1).type).toBe('error'); duplicate.close();
    } finally { sockets.forEach(ws => ws.close()); }
  });
});
