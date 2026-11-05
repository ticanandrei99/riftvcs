import { describe, it, expect } from 'vitest';
import { computeTieredVolumes, TieredRoomClient } from '../src/volumes.js';
import { RoomManager } from '../src/rooms.js';
import type { WebSocket } from 'ws';
describe('RiftVoice fog-of-war reports', () => {
  const volumes = (visibility: TieredRoomClient['visibility']) => {
    const now=Date.now();
    const clients: TieredRoomClient[] = [
      { name:'me',team:'ORDER',position:{x:1000,y:1000,updatedMs:now},visibility },
      { name:'enemy',team:'CHAOS',position:{x:1100,y:1000,updatedMs:now} },
      { name:'ally',team:'ORDER' },
    ];
    return computeTieredVolumes({roomId:'r',name:'me',myPosition:{x:1000,y:1000}},()=>clients).peerVolumes;
  };
  it('nearby enemies need a fresh matching visible icon; allies do not',()=>{
    expect(volumes({points:[],updatedMs:Date.now()})).toEqual({ally:1});
    expect(volumes({points:[{x:1100,y:1000}],updatedMs:Date.now()})).toEqual({ally:1,enemy:1});
    expect(volumes({points:[{x:1100,y:1000}],updatedMs:Date.now()-1000})).toEqual({ally:1});
    expect(volumes({points:[{x:8000,y:8000}],updatedMs:Date.now()})).toEqual({ally:1});
  });
  it('malformed or missing reports cannot remove a latched visibility requirement',()=>{
    const rooms=new RoomManager(), ws={} as WebSocket; rooms.join('r','me',ws,'ORDER');
    rooms.setVisibility(ws,[[1100,1000]]);
    expect(rooms.getRoomClients('r')[0].visibility?.points).toHaveLength(1);
    rooms.setVisibility(ws,undefined);
    expect(rooms.getRoomClients('r')[0].visibility?.points).toEqual([]);
    rooms.setVisibility(ws,[[Infinity,1000]]);
    expect(rooms.getRoomClients('r')[0].visibility?.points).toEqual([]);
  });
});
