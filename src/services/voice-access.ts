/** Credentials stay in this WebView's memory/session storage, never in logs or URLs. */
// Overlay and background are separate webpack bundles in the same WebView.
// Share memory only (not persistent storage), without putting credentials in events.
const key = Symbol.for('riftvoice.voice-session');
const host = globalThis as typeof globalThis & { [key: symbol]: { token: string | null } };
if (!host[key]) Object.defineProperty(host, key, { value: { token: null }, enumerable: false });
const state = host[key];
export function setVoiceSessionToken(token: unknown): void {
  state.token = typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  if (typeof window !== 'undefined' && typeof Event !== 'undefined') window.dispatchEvent(new Event('riftvoice:session-changed'));
}
export function voiceAuthorization(): Record<string, string> {
  return state.token ? { Authorization: 'Bearer ' + state.token } : {};
}
export function voiceInvitation(): string {
  try { return sessionStorage.getItem('riftvoice.invitation') || ''; } catch { return ''; }
}
export function voiceInvitationError(token:string):string|null{
  if(/^(?:https?:\/\/)?gg\.riotgames\.com\//i.test(token)||/joinCode=/i.test(token))return 'Acesta este un link de lobby LoL. Introdu codul vocal RiftVoice generat în Caster.';
  if(!token||!/^[A-Za-z0-9_-]{32,256}$/.test(token))return 'Cod vocal invalid. Copiază codul RiftVoice din invitația organizatorului, fără text suplimentar.';
  return null;
}
export function saveVoiceInvitation(token: string): boolean {
  if (token && !/^[A-Za-z0-9_-]{32,256}$/.test(token)) return false;
  try {
    if (token) sessionStorage.setItem('riftvoice.invitation', token);
    else sessionStorage.removeItem('riftvoice.invitation');
    return true;
  } catch { return false; }
}
