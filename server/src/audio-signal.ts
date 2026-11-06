/** Allow audio SDP and ICE only; never relay arbitrary data-channel or metadata payloads. */
export function audioSignal(value: unknown): { type: string; payload: unknown } | null {
  if (!value || typeof value !== 'object') return null;
  const { type, payload } = value as any;
  if (type === 'offer' || type === 'answer') {
    if (!payload || payload.type !== type || typeof payload.sdp !== 'string' || payload.sdp.length > 48 * 1024) return null;
    const sections = payload.sdp.split(/(?=^m=)/m).slice(1);
    if (!sections.length || sections.length > 4 || sections.some((s: string) => !/^m=audio /.test(s))) return null;
    return { type, payload: { type, sdp: payload.sdp } };
  }
  if (type === 'ice-candidate') {
    if (!payload || typeof payload.candidate !== 'string' || payload.candidate.length > 2048 ||
      (payload.sdpMid != null && (typeof payload.sdpMid !== 'string' || payload.sdpMid.length > 64)) ||
      (payload.sdpMLineIndex != null && (!Number.isInteger(payload.sdpMLineIndex) || payload.sdpMLineIndex < 0 || payload.sdpMLineIndex > 32))) return null;
    return { type, payload: { candidate: payload.candidate, sdpMid: payload.sdpMid ?? null, sdpMLineIndex: payload.sdpMLineIndex ?? null,
      ...(typeof payload.usernameFragment === 'string' && payload.usernameFragment.length <= 256 ? { usernameFragment: payload.usernameFragment } : {}) } };
  }
  return null;
}
