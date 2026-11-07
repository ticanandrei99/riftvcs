import { voiceAuthorization,voiceInvitation } from './voice-access';
import { lobbyState } from './lobby-state';
import { hasUsableTurnServers } from './privacy';

export type VoiceConnectionState = 'offline' | 'update' | 'unavailable' | 'ready' | 'invitation' | 'saved' | 'pending' | 'approved' | 'organizer';

/** Checks server readiness, not whether another player's audio is connected. */
export async function checkVoiceConnection(origin: string, fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<VoiceConnectionState> {
  const timeout = AbortSignal.timeout(8000);
  const bounded = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const response = await fetcher(origin + '/health', { signal: bounded, cache: 'no-store' });
    if (!response.ok) return 'offline';
    const health = await response.json();
    if (health?.status !== 'ok') return 'offline';
    if (health.strictProximity !== true) return 'update';
    if (health.authenticationRequired === true && !voiceAuthorization().Authorization) {
      const state=lobbyState();
      if(state.phase==='pending')return 'pending';
      if(state.phase==='approved')return 'approved';
      if(voiceInvitation())return /^RV-[A-Za-z0-9_-]{43}$/.test(voiceInvitation())&&health.organizerAvailable!==true?'organizer':'saved';
      return 'invitation';
    }
  } catch { return 'offline'; }
  try {
    const response = await fetcher(origin + '/turn-credentials', { signal: bounded, cache: 'no-store', headers: voiceAuthorization() });
    if (!response.ok) return 'unavailable';
    const data = await response.json();
    return Array.isArray(data?.iceServers) && hasUsableTurnServers(data.iceServers) ? 'ready' : 'unavailable';
  } catch { return 'unavailable'; }
}
