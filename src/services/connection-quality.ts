export interface PeerQuality {
  state: string;
  rttMs: number | null;
  packetsLost: number | null;
  packetsReceived: number | null;
}
export interface ConnectionQuality {
  peers: number;
  connected: number;
  rttMs: number | null;
  lossPercent: number | null;
}
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
export function summarizeQuality(peers: readonly PeerQuality[]): ConnectionQuality {
  const active = peers.filter(peer => peer.state === 'connected');
  const timings = active.map(peer => peer.rttMs).filter(finite);
  let lost = 0, received = 0;
  for (const peer of active) { if (finite(peer.packetsLost)) lost += peer.packetsLost; if (finite(peer.packetsReceived)) received += peer.packetsReceived; }
  return { peers: peers.length, connected: active.length, rttMs: timings.length ? Math.round(Math.max(...timings)) : null,
    lossPercent: lost + received > 0 ? Math.round(lost / (lost + received) * 1000) / 10 : null };
}
export function safeQuality(value: Partial<ConnectionQuality> | null | undefined): ConnectionQuality {
  return { peers: finite(value?.peers) ? Math.floor(value.peers) : 0, connected: finite(value?.connected) ? Math.floor(value.connected) : 0,
    rttMs: finite(value?.rttMs) ? Math.round(value.rttMs) : null, lossPercent: finite(value?.lossPercent) ? Math.min(100, value.lossPercent) : null };
}
export function qualityGrade(value: ConnectionQuality): 'idle' | 'connecting' | 'measuring' | 'good' | 'fair' | 'poor' {
  if (!value.peers) return 'idle';
  if (!value.connected) return 'connecting';
  if (value.rttMs === null && value.lossPercent === null) return 'measuring';
  if ((value.rttMs ?? 0) > 500 || (value.lossPercent ?? 0) > 5) return 'poor';
  if ((value.rttMs ?? 0) > 250 || (value.lossPercent ?? 0) > 2) return 'fair';
  return 'good';
}
/** A deliberate allow-list: no names, room IDs, URLs, candidates or credentials. */
export function diagnosticReport(input: { version: string; connection: string; quality?: Partial<ConnectionQuality>; mode: string; voice: string; enabled: boolean; strength: number }): string {
  return JSON.stringify({ app: 'Voxdria', version: /^\d+\.\d+\.\d+$/.test(input.version) ? input.version : 'development',
    server: ['checking','ready','offline','update','unavailable','invitation','saved','pending','approved','organizer'].includes(input.connection) ? input.connection : 'checking',
    transport: 'TURN only', quality: safeQuality(input.quality),
    mode: ['nearby','camera','nearby-camera','team'].includes(input.mode) ? input.mode : 'nearby',
    voice: input.voice === 'robot' ? 'robot' : 'clean', effects: input.enabled === true,
    strength: finite(input.strength) ? Math.min(100, Math.round(input.strength * 100)) : 0 }, null, 2);
}
