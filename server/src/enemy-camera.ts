/** Camera reports contain only locally visible icons, never spectator data.
 * This enforces delivery, not the honesty of an untrusted capture client. */
export const CAMERA_LEASE_MS = 450;
export const ENEMY_RANGE = 1350;
export interface CameraPoint { x: number; y: number }
export interface EnemyCameraState {
  sequence: number; consentUntil: number; expiresAt: number;
  self?: CameraPoint; camera?: CameraPoint & { w: number; h: number };
  visible: Map<string, CameraPoint>;
}
export interface CameraParticipant {
  name: string; team?: string; roomId: string; enemyCamera?: EnemyCameraState;
  isDead?: boolean; isMuted?: boolean;
}
const point = (p: any): p is CameraPoint => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.y >= 0 && p.x <= 16000 && p.y <= 16000;

export function readEnemyCamera(value: any, previous: EnemyCameraState | undefined, now: number): EnemyCameraState {
  const closed: EnemyCameraState = { sequence: previous?.sequence ?? -1, consentUntil: 0, expiresAt: 0, visible: new Map() };
  if (!value || value.enabled !== true) return closed;
  // A fresh heartbeat declares consent, but cannot grant listening by itself.
  closed.consentUntil = now + CAMERA_LEASE_MS;
  const r = value.report;
  if (!r) return closed;
  if (!Number.isSafeInteger(r.sequence) || r.sequence < 0 || r.sequence < closed.sequence ||
      !Number.isFinite(r.ageMs) || r.ageMs < 0 || r.ageMs >= CAMERA_LEASE_MS ||
      !point(r.self) || !point(r.camera) || !Number.isFinite(r.camera.w) || !Number.isFinite(r.camera.h) ||
      r.camera.w <= 0 || r.camera.h <= 0 || r.camera.w > 6000 || r.camera.h > 4000 ||
      !Array.isArray(r.visible) || r.visible.length > 5) return closed;
  const visible = new Map<string, CameraPoint>();
  for (const entry of r.visible) {
    if (!entry || typeof entry.name !== 'string' || entry.name.length < 1 || entry.name.length > 64 || visible.has(entry.name) || !point(entry)) return closed;
    visible.set((entry as CameraPoint & { name: string }).name, { x: entry.x, y: entry.y });
  }
  // Repeating a cached frame cannot extend its original lifetime.
  const expiresAt = previous && r.sequence === previous.sequence
    ? Math.min(previous.expiresAt, now + CAMERA_LEASE_MS - r.ageMs)
    : now + CAMERA_LEASE_MS - r.ageMs;
  return { sequence: r.sequence, consentUntil: closed.consentUntil, expiresAt,
    self: { x: r.self.x, y: r.self.y }, camera: { x: r.camera.x, y: r.camera.y, w: r.camera.w, h: r.camera.h }, visible };
}

export function enemyCameraVolume(listener: CameraParticipant, speaker: CameraParticipant, now = Date.now()): number {
  if (listener === speaker || listener.name === speaker.name || listener.roomId !== speaker.roomId ||
      !listener.team || !speaker.team || listener.team === speaker.team || listener.isDead !== false || speaker.isDead !== false || speaker.isMuted) return 0;
  const report = listener.enemyCamera, consent = speaker.enemyCamera;
  if (!report || !consent || report.expiresAt <= now || report.consentUntil <= now || consent.consentUntil <= now || !report.self || !report.camera) return 0;
  const seen = report.visible.get(speaker.name);
  if (!seen) return 0;
  const camera = report.camera;
  // No rectangle padding, extrapolation, occluded-icon hold or camera-distance fallback.
  if (Math.abs(seen.x - camera.x) > camera.w / 2 || Math.abs(seen.y - camera.y) > camera.h / 2) return 0;
  const distance = Math.hypot(seen.x - report.self.x, seen.y - report.self.y);
  if (distance >= ENEMY_RANGE) return 0;
  return distance <= 900 ? 1 : ((ENEMY_RANGE - distance) / (ENEMY_RANGE - 900)) ** 2;
}
