import { describe, it, expect } from 'vitest';
import { computeTieredVolumes, TieredRoomClient } from '../src/volumes.js';

function compute(peers: TieredRoomClient[], mine: Partial<TieredRoomClient> = {}) {
  const now = Date.now();
  return computeTieredVolumes({ strictProximity: true, allyProximity: false, myPosition: { x: 1000, y: 1000 }, roomId: 'r', name: 'me' }, () => [
    { name: 'me', team: 'ORDER', position: { x: 1000, y: 1000, updatedMs: now }, ...mine }, ...peers,
  ]);
}
describe('nearby-only voice', () => {
  it('hears nearby allies and visible enemies but never a distant ally', () => {
    const now = Date.now();
    const result = compute([
      { name: 'nearAlly', team: 'ORDER', position: { x: 1100, y: 1000, updatedMs: now } },
      { name: 'nearEnemy', team: 'CHAOS', position: { x: 1150, y: 1000, updatedMs: now } },
      { name: 'farXerath', team: 'ORDER', position: { x: 9000, y: 9000, updatedMs: now } },
    ], { visibility: { points: [{ x: 1150, y: 1000 }], updatedMs: now } });
    expect(result.peerVolumes).toEqual({ nearAlly: 1, nearEnemy: 1 });
    expect(result.strictProximity).toBe(true);
  });
  it('does not turn lost or stale teammates into global voice', () => {
    const now = Date.now();
    expect(compute([
      { name: 'unknown', team: 'ORDER' },
      { name: 'lastSeen', team: 'ORDER', lastSeen: { x: 1100, y: 1000, updatedMs: now } },
      { name: 'stale', team: 'ORDER', position: { x: 1100, y: 1000, updatedMs: now - 6000 } },
    ]).peerVolumes).toEqual({});
  });
  it('ignores distant camera positions even when both users publish them', () => {
    const now = Date.now();
    expect(compute([{ name: 'far', team: 'ORDER', position: { x: 9000, y: 9000, updatedMs: now }, camera: { x: 9000, y: 9000, updatedMs: now } }], {
      camera: { x: 9000, y: 9000, updatedMs: now },
    }).peerVolumes).toEqual({});
  });
  it('mutes everybody if the listener has no fresh position', () => {
    const now = Date.now();
    expect(compute([{ name: 'near', team: 'ORDER', position: { x: 1100, y: 1000, updatedMs: now } }], { position: undefined }).peerVolumes).toEqual({});
  });
});
