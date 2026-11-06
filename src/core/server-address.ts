export const DEFAULT_SERVER = 'https://riftvoice-server.onrender.com';
export const LOCAL_SERVER = 'http://127.0.0.1:3100';
export function validateServerAddress(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) return null;
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) return null;
    return url.origin;
  } catch { return null; }
}
export function configuredServer(fallback: string): string {
  try {
    const saved = validateServerAddress(localStorage.getItem('riftvoice.server') || '');
    const migrated = localStorage.getItem('riftvoice.render-default-v1') === '1';
    const legacyLocal = saved !== null && [LOCAL_SERVER, 'http://localhost:3100', 'http://[::1]:3100'].includes(saved);
    const selected = !migrated && legacyLocal && fallback === DEFAULT_SERVER ? DEFAULT_SERVER : saved || fallback;
    // Migrate once. Subsequent explicit local/development choices remain usable.
    try {
      if (selected !== saved && saved !== null) localStorage.setItem('riftvoice.server', selected);
      localStorage.setItem('riftvoice.render-default-v1', '1');
    } catch { /* Use the selected server even when storage is unavailable. */ }
    return selected;
  } catch { return fallback; }
}
