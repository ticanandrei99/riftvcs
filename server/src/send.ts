import type {WebSocket} from 'ws';
export const MAX_QUEUED_BYTES=512*1024;
/** Slow clients must not turn bounded incoming messages into an unbounded outgoing queue. */
export function sendJson(socket:WebSocket,value:unknown):boolean{
  if(socket.readyState!==socket.OPEN)return false;
  try{
    const raw=JSON.stringify(value);
    if(typeof raw!=='string')return false;
    if((socket.bufferedAmount||0)+Buffer.byteLength(raw)>MAX_QUEUED_BYTES){socket.terminate();return false;}
    socket.send(raw);return true;
  }catch{try{socket.terminate();}catch{}return false;}
}
