import { audioSignal } from './audio-signal.js';
import {sendJson} from './send.js';
import type { SessionRegistry, VoiceGrant } from './access.js';
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
export interface LobbyAudioOptions {
  rooms: RoomManager;
  authorize(token: unknown): VoiceGrant | undefined;
}
export function handleCasterConnection(ws: WebSocket, grants: CasterGrant[], sessions?: SessionRegistry, onRosterChange?: () => void, lobby?: LobbyAudioOptions): void {
  const manager = lobby?.rooms ?? rooms;
  const prefix = lobby ? 'lobby' : 'caster';
  let grant: VoiceGrant | undefined;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  const limiter = new TokenBucket(LIMITS.WS_MESSAGES);
  const send = (socket: WebSocket, data: unknown) => {
    sendJson(socket,data);
  };
  ws.on('message', data => {
    try {
      if (!limiter.tryConsume('caster')) return ws.close(1008, 'rate limit');
      const msg = JSON.parse(data.toString());
      if (!msg || typeof msg !== 'object') throw Error('Invalid message');
      if (!grant) {
        if (msg.type !== prefix + '_join') throw Error('Audio authentication required');
        const allowed = lobby ? lobby.authorize(msg.token) : authorizeCaster(grants, msg.token);
        if (!allowed) throw Error('Invalid or expired invitation');
        if(lobby && (allowed.role!=='lobby-player'||!allowed.team))throw Error('Lobby admission required');
        const previous = manager.findInRoom(allowed.room, allowed.name);
        if (previous && !lobby) throw Error('Invitation already connected');
        if (previous) {
          // A reconnect may arrive before the old TCP connection times out.
          // Revoke it before accepting its replacement; the old close cannot remove the new peer.
          sessions?.revoke(previous.ws);
          const gone = manager.leave(previous.ws);
          if (gone) for (const peer of gone.remaining) send(peer.ws, { type: prefix+'_left', name: gone.name });
          previous.ws.close(4000, 'Connected in another session');
        }
        grant = allowed;
        const { peers } = manager.join(grant.room, grant.name, ws, grant.team);
        const roleOf = (name: string) => lobby ? 'lobby-player' : grants.find(g => g.room === grant!.room && g.name === name)?.role;
        send(ws, { type: prefix+'_ready', name: grant.name, role: grant.role, team:grant.team, ...(sessions ? { sessionToken: sessions.create(grant, ws) } : {}), peers: peers.map(name => ({ name, role: roleOf(name) })) });
        for (const peer of manager.getOthersInRoom(ws)) send(peer.ws, { type: prefix+'_peer', name: grant.name, role: grant.role });
        expiry = setTimeout(() => ws.close(1008, 'Invitation expired'), Math.min(2147483647, grant.expiresAt - Date.now()));
        onRosterChange?.();
        return;
      }
      if (grant.expiresAt <= Date.now()) return ws.close(1008, 'Invitation expired');
      if (sessions && !sessions.has(ws)) return ws.close(4003, 'Voice access revoked');
      if(lobby){const current=lobby.authorize(grant.token);if(!current||current.room!==grant.room||current.team!==grant.team)return ws.close(4004,'Lobby permission changed');}
      // No coords, position, team voice, reset, room switch or arbitrary payload types.
      if (msg.type !== prefix+'_signal' || !['offer', 'answer', 'ice-candidate'].includes(msg.payload?.type)) throw Error('Audio message denied');
      const payload = audioSignal(msg.payload);
      if (!payload) throw Error('Only audio signaling is permitted');
      if (grant.role === 'spectator' && !spectatorSdpAllowed(msg.payload)) throw Error('Spectator transmission denied');
      const target = manager.findInRoom(grant.room, msg.to);
      if (!target || target.ws === ws || (lobby && target.team!==grant.team)) throw Error('Audio target denied');
      send(target.ws, { type: prefix+'_signal', from: grant.name, payload });
    } catch (error) {
      send(ws, { type: 'error', message: error instanceof SyntaxError?'Invalid JSON message':error instanceof Error ? error.message : 'Invalid caster message' });
    }
  });
  ws.on('close', () => {
    clearTimeout(expiry);
    sessions?.revoke(ws);
    const gone = manager.leave(ws);
    if (gone) for (const peer of gone.remaining) send(peer.ws, { type: prefix+'_left', name: gone.name });
    onRosterChange?.();
  });
}
