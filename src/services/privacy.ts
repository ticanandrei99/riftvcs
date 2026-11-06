// Player addresses must never be exposed through direct peer connections.
export function getForceTurnRelay(): boolean { return true; }
export function setForceTurnRelay(_enabled: boolean): void {
  try { localStorage.setItem('lolproxchat.forceTurnRelay', '1'); } catch { /* policy is enforced without storage */ }
}
export function hasUsableTurnServers(servers: readonly RTCIceServer[]): boolean {
  return servers.some(server => {
    const urls = typeof server.urls === 'string' ? [server.urls] : server.urls;
    return Array.isArray(urls) && urls.some(url => /^turns?:/i.test(url)) &&
      typeof server.username === 'string' && server.username.length > 0 &&
      typeof server.credential === 'string' && server.credential.length > 0;
  });
}
