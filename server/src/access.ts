import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { WebSocket } from 'ws';
import { validateJoin } from './validate.js';
export type VoiceRole = 'player' | 'caster' | 'spectator';
export interface VoiceGrant {
  token: string; room: string; name: string; role: VoiceRole;
  team?: 'ORDER' | 'CHAOS'; expiresAt: number;
}
const digest = (token: string) => createHash('sha256').update(token).digest();
export function loadGrants(raw: string | undefined, roles: VoiceRole[]): VoiceGrant[] {
  const parsed: unknown = JSON.parse(raw || '[]');
  if (!Array.isArray(parsed) || parsed.length > 500) throw Error('Invalid voice invitation configuration');
  const identities = new Set<string>(), tokens = new Set<string>();
  for (const g of parsed) {
    if (!g || typeof g !== 'object' || !validateJoin(g.room, g.name).ok || !roles.includes(g.role) ||
      typeof g.token !== 'string' || !/^[A-Za-z0-9_-]{32,256}$/.test(g.token) ||
      !Number.isSafeInteger(g.expiresAt) || g.expiresAt <= 0 ||
      (g.role === 'player' && g.team !== 'ORDER' && g.team !== 'CHAOS')) throw Error('Invalid voice invitation configuration');
    const identity = JSON.stringify([g.room, g.name]);
    if (identities.has(identity) || tokens.has(g.token)) throw Error('Duplicate voice invitation');
    identities.add(identity); tokens.add(g.token);
  }
  return parsed as VoiceGrant[];
}
export function authorizeGrant(grants: VoiceGrant[], token: unknown, now = Date.now()): VoiceGrant | undefined {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32,256}$/.test(token)) return;
  const hash = digest(token);
  return grants.find(g => g.expiresAt > now && timingSafeEqual(digest(g.token), hash));
}
export interface VoiceSession extends Omit<VoiceGrant, 'token'> { ws: WebSocket }
export class SessionRegistry {
  private sessions = new Map<string, VoiceSession>();
  create(grant: VoiceGrant, ws: WebSocket): string {
    this.revoke(ws);
    const token = randomBytes(32).toString('base64url');
    const { token: _invitation, ...identity } = grant;
    this.sessions.set(token, { ...identity, ws });
    return token;
  }
  get(header: unknown): VoiceSession | undefined {
    if (typeof header !== 'string' || !/^Bearer [A-Za-z0-9_-]{43}$/.test(header)) return;
    const session = this.sessions.get(header.slice(7));
    return session && session.ws.readyState === session.ws.OPEN && session.expiresAt > Date.now() ? session : undefined;
  }
  has(ws: WebSocket): boolean { return [...this.sessions.values()].some(s => s.ws === ws && s.expiresAt > Date.now()); }
  revoke(ws: WebSocket): void {
    for (const [token, session] of this.sessions) if (session.ws === ws) this.sessions.delete(token);
  }
}
export interface PlayerSecurity { grants: VoiceGrant[]; sessions: SessionRegistry }
