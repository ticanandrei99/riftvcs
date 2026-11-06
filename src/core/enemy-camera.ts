/** A bounded lease from actual current minimap pixels, never spectator data. */
export interface EnemyCameraReport {
  sequence: number; ageMs: number;
  self: { x: number; y: number };
  camera: { x: number; y: number; w: number; h: number };
  visible: Array<{ name: string; x: number; y: number }>;
}
export function getEnemyCameraEnabled(): boolean {
  try { return localStorage.getItem('riftvoice.enemy-camera') !== '0'; } catch { return true; }
}
export function setEnemyCameraEnabled(value: boolean): void {
  try { localStorage.setItem('riftvoice.enemy-camera', value ? '1' : '0'); } catch { /* session remains usable */ }
}
