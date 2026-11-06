jest.mock('../../src/core/config', () => ({ getIceServers: jest.fn() }));
import { getIceServers } from '../../src/core/config';
import { PeerConnection } from '../../src/services/peer-connection';
import { getForceTurnRelay, hasUsableTurnServers } from '../../src/services/privacy';

const fetchServers = getIceServers as jest.Mock;
const descriptors = new Map<string, PropertyDescriptor | undefined>();
let connection: jest.Mock;
beforeEach(() => {
  for (const key of ['RTCPeerConnection', 'MediaStream']) descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  connection = jest.fn(() => { throw new Error('constructor policy captured'); });
  Object.defineProperty(globalThis, 'RTCPeerConnection', { configurable: true, value: connection });
  Object.defineProperty(globalThis, 'MediaStream', { configurable: true, value: class {} });
});
afterEach(() => {
  for (const [key, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete (globalThis as any)[key];
  }
  jest.clearAllMocks();
});
test('missing TURN stops before constructing any peer connection', async () => {
  fetchServers.mockResolvedValue([{ urls: 'stun:stun.example:3478' }]);
  await expect(PeerConnection.create('peer')).rejects.toThrow('TURN relay is not configured');
  expect(connection).not.toHaveBeenCalled();
});
test('production peer creation always uses relay policy', async () => {
  const servers = [{ urls: 'turn:relay.example:3478', username: 'u', credential: 'c' }];
  fetchServers.mockResolvedValue(servers);
  await expect(PeerConnection.create('peer')).rejects.toThrow('constructor policy captured');
  expect(connection).toHaveBeenCalledWith({ iceServers: servers, iceTransportPolicy: 'relay' });
  expect(getForceTurnRelay()).toBe(true);
});
test('a TURN URL without authentication is not considered configured', () => {
  expect(hasUsableTurnServers([{ urls: 'turn:relay.example:3478' }])).toBe(false);
  expect(hasUsableTurnServers([{ urls: ['stun:relay.example', 'turn:relay.example'], username: 'u', credential: 'c' }])).toBe(true);
});
