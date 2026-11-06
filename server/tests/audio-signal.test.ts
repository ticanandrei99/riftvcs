import { describe, it, expect } from 'vitest';
import { audioSignal } from '../src/audio-signal.js';
describe('audio-only signaling',()=>{
  it('rejects data channels, video, oversized and malformed messages',()=>{
    for(const sdp of ['v=0\r\nm=application 9 DTLS/SCTP 5000\r\n','m=video 9 RTP/AVP 96\r\n','x'.repeat(50000),'v=0'])
      expect(audioSignal({type:'offer',payload:{type:'offer',sdp}})).toBeNull();
    expect(audioSignal({type:'offer',payload:{type:'answer',sdp:'m=audio 9 RTP/AVP 0\r\n'}})).toBeNull();
    expect(audioSignal({type:'ice-candidate',payload:{candidate:'x'.repeat(3000)}})).toBeNull();
  });
  it('reconstructs known fields and drops arbitrary metadata',()=>{
    const sdp='v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=recvonly\r\n';
    expect(audioSignal({type:'offer',payload:{type:'offer',sdp,x:3000}})).toEqual({type:'offer',payload:{type:'offer',sdp}});
    expect(audioSignal({type:'ice-candidate',payload:{candidate:'test',coords:[100,200]}})).toEqual({type:'ice-candidate',payload:{candidate:'test',sdpMid:null,sdpMLineIndex:null}});
  });
});
