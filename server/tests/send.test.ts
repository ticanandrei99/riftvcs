import {describe,it,expect,vi} from 'vitest';
import {sendJson,MAX_QUEUED_BYTES} from '../src/send.js';
const socket=()=>({OPEN:1,readyState:1,bufferedAmount:0,send:vi.fn(),terminate:vi.fn()});
describe('outgoing websocket pressure',()=>{
  it('terminates a slow recipient before allocating another unbounded queue entry',()=>{
    const ws=socket();ws.bufferedAmount=MAX_QUEUED_BYTES-10;expect(sendJson(ws as any,{type:'offer',sdp:'x'.repeat(1000)})).toBe(false);expect(ws.send).not.toHaveBeenCalled();expect(ws.terminate).toHaveBeenCalledTimes(1);
  });
  it('accepts a normal roster and refuses oversized messages or failed writes without throwing',()=>{
    const ws=socket();expect(sendJson(ws as any,{type:'roster',players:['Alice']})).toBe(true);expect(ws.send).toHaveBeenCalledWith(JSON.stringify({type:'roster',players:['Alice']}));
    expect(sendJson(ws as any,{sdp:'x'.repeat(MAX_QUEUED_BYTES)})).toBe(false);ws.send.mockImplementation(()=>{throw Error('Socket gone');});expect(sendJson(ws as any,{type:'left'})).toBe(false);
    ws.readyState=3;ws.terminate.mockClear();expect(sendJson(ws as any,{})).toBe(false);expect(ws.terminate).not.toHaveBeenCalled();
  });
});
