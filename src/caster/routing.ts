export function casterTransmitAllowed(role: string, muted: boolean, deafened: boolean, ptt: boolean, held: boolean): boolean {
  return role === 'caster' && !muted && !deafened && (!ptt || held);
}
