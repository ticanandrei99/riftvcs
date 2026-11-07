/** Player proximity is standard. Operators retain an explicit emergency switch. */
export function enemyProximityEnabled(raw: string | undefined, legacyTestMode: boolean): boolean {
  if (raw !== undefined && raw !== '' && raw !== '0' && raw !== '1') {
    throw new Error('ENEMY_CAMERA_VOICE must be 0 or 1');
  }
  return !legacyTestMode && raw !== '0';
}
