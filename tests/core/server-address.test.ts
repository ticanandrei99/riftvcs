import { validateServerAddress } from '../../src/core/server-address';
test('remote voice servers require TLS; credentials and URL paths are rejected', () => {
  expect(validateServerAddress('https://voice.example.com/')).toBe('https://voice.example.com');
  expect(validateServerAddress('http://127.0.0.1:3100')).toBe('http://127.0.0.1:3100');
  for (const value of ['http://remote.example.com', 'https://user:pass@example.com', 'https://example.com/path', 'file:///tmp', 'javascript:alert(1)', 'https://example.com?token=x']) expect(validateServerAddress(value)).toBeNull();
});

test('Render is the default and the previous local default migrates only once', () => {
  const { configuredServer, DEFAULT_SERVER, LOCAL_SERVER } = require('../../src/core/server-address');
  const store = new Map<string, string>();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  } });
  try {
    expect(configuredServer(DEFAULT_SERVER)).toBe('https://riftvoice-server.onrender.com');
    store.clear(); store.set('riftvoice.server', LOCAL_SERVER);
    expect(configuredServer(DEFAULT_SERVER)).toBe(DEFAULT_SERVER);
    expect(store.get('riftvoice.server')).toBe(DEFAULT_SERVER);
    store.set('riftvoice.server', LOCAL_SERVER);
    expect(configuredServer(DEFAULT_SERVER)).toBe(LOCAL_SERVER);
    store.clear(); store.set('riftvoice.server', 'https://custom.example.com');
    expect(configuredServer(DEFAULT_SERVER)).toBe('https://custom.example.com');
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete (globalThis as any).localStorage;
  }
});
