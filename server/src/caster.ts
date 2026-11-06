import { audioSignal } from './audio-signal.js';
import type { SessionRegistry } from './access.js';
import { timingSafeEqual } from 'node:crypto';
import type { WebSocket } from 'ws';
import { RoomManager } from './rooms.js';
import { validateJoin } from './validate.js';
import { TokenBucket, LIMITS } from './rate-limit.js';

export interface CasterGrant { token: string; room: string; name: string; role: 'caster' | 'spectator'; expiresAt: number; voiceMuted?: boolean; authority?: 'organizer'|'moderator'; subjectId?: string }
export function authorizeCaster(grants: CasterGrant[], token: unknown, now = Date.now()): CasterGrant | undefined {
  if (typeof token !== 'string' || token.length < 32 || token.length > 256) return;
  return grants.find(g => typeof g.token === 'string' && g.token.length >= 32 &&
    Buffer.byteLength(g.token) === Buffer.byteLength(token) &&
    timingSafeEqual(Buffer.from(g.token), Buffer.from(token)) &&
    Number.isFinite(g.expiresAt) && g.expiresAt > now && g.voiceMuted !== true &&
    (g.role === 'caster' || g.role === 'spectator') && validateJoin(g.room, g.name).ok);
}
export function spectatorSdpAllowed(payload: any): boolean {
  if (payload?.type === 'ice-candidate') return true;
  if (typeof payload?.payload?.sdp !== 'string') return false;
  const sections = payload.payload.sdp.split(/(?=^m=)/m).slice(1);
  return sections.length > 0 && sections.every((section: string) =>
    /^m=audio /.test(section) && /^a=(recvonly|inactive)\r?$/m.test(section) &&
    !/^a=(sendrecv|sendonly)\r?$/m.test(section));
}
// This manager is deliberately inaccessible to normal player signaling and volumes.
const rooms = new RoomManager();
export function handleCasterConnection(ws: WebSocket, grants: CasterGrant[], sessions?: SessionRegistry, onRosterChange?: () => void): void {
  let grant: CasterGrant | undefined;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  const limiter = new TokenBucket(LIMITS.WS_MESSAGES);
  const send = (socket: WebSocket, data: unknown) => {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(data));
  };
  ws.on('message', data => {
    try {
      if (!limiter.tryConsume('caster')) return ws.close(1008, 'rate limit');
      const msg = JSON.parse(data.toString());
      if (!msg || typeof msg !== 'object') throw Error('Invalid message');
      if (!grant) {
        if (msg.type !== 'caster_join') throw Error('Caster authentication required');
        const allowed = authorizeCaster(grants, msg.token);
        if (!allowed) throw Error('Invalid or expired invitation');
        if (rooms.findInRoom(allowed.room, allowed.name)) throw Error('Invitation already connected');
        grant = allowed;
        const { peers } = rooms.join(grant.room, grant.name, ws);
        const roleOf = (name: string) => grants.find(g => g.room === grant!.room && g.name === name)?.role;
        send(ws, { type: 'caster_ready', name: grant.name, role: grant.role, ...(sessions ? { sessionToken: sessions.create(grant, ws) } : {}), peers: peers.map(name => ({ name, role: roleOf(name) })) });
        for (const peer of rooms.getOthersInRoom(ws)) send(peer.ws, { type: 'caster_peer', name: grant.name, role: grant.role });
        expiry = setTimeout(() => ws.close(1008, 'Invitation expired'), Math.min(2147483647, grant.expiresAt - Date.now()));
        onRosterChange?.();
        return;
      }
      if (grant.expiresAt <= Date.now()) return ws.close(1008, 'Invitation expired');
      if (sessions && !sessions.has(ws)) return ws.close(4003, 'Voice access revoked');
      // No coords, position, team voice, reset, room switch or arbitrary payload types.
      if (msg.type !== 'caster_signal' || !['offer', 'answer', 'ice-candidate'].includes(msg.payload?.type)) throw Error('Caster message denied');
      const payload = audioSignal(msg.payload);
      if (!payload) throw Error('Only audio signaling is permitted');
      if (grant.role === 'spectator' && !spectatorSdpAllowed(msg.payload)) throw Error('Spectator transmission denied');
      const target = rooms.findInRoom(grant.room, msg.to);
      if (!target || target.ws === ws) throw Error('Caster target denied');
      send(target.ws, { type: 'caster_signal', from: grant.name, payload });
    } catch (error) {
      send(ws, { type: 'error', message: error instanceof Error ? error.message : 'Invalid caster message' });
    }
  });
  ws.on('close', () => {
    clearTimeout(expiry);
    sessions?.revoke(ws);
    const gone = rooms.leave(ws);
    if (gone) for (const peer of gone.remaining) send(peer.ws, { type: 'caster_left', name: gone.name });
    onRosterChange?.();
  });
}
