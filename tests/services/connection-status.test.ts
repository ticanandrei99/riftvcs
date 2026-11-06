import { checkVoiceConnection } from '../../src/services/connection-status';

const response = (value: unknown, ok = true) => ({ ok, json: async () => value });
test('reports offline when health cannot be reached, without exposing server error text', async () => {
  const fetcher = jest.fn().mockRejectedValue(new Error('internal endpoint details'));
  await expect(checkVoiceConnection('https://voice.example', fetcher)).resolves.toBe('offline');
});
test('requires a healthy server and the current proximity protocol', async () => {
  const fetcher = jest.fn().mockResolvedValue(response({ status: 'ok' }));
  await expect(checkVoiceConnection('https://voice.example', fetcher)).resolves.toBe('update');
  expect(fetcher).toHaveBeenCalledTimes(1);
  fetcher.mockResolvedValue(response({ status: 'error', strictProximity: true }));
  await expect(checkVoiceConnection('https://voice.example', fetcher)).resolves.toBe('offline');
});
test('distinguishes an online server without usable audio from readiness', async () => {
  const fetcher = jest.fn().mockResolvedValueOnce(response({ status: 'ok', strictProximity: true })).mockResolvedValueOnce(response({ iceServers: [] }));
  await expect(checkVoiceConnection('https://voice.example', fetcher)).resolves.toBe('unavailable');
});
test('reports server readiness only after both health and authenticated TURN checks', async () => {
  const fetcher = jest.fn().mockResolvedValueOnce(response({ status: 'ok', strictProximity: true })).mockResolvedValueOnce(response({ iceServers: [{ urls: 'turn:relay.example:3478', username: 'dummy', credential: 'dummy' }] }));
  await expect(checkVoiceConnection('https://voice.example', fetcher)).resolves.toBe('ready');
  expect(fetcher).toHaveBeenLastCalledWith('https://voice.example/turn-credentials', expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }));
});
test('does not treat an HTTP error or malformed TURN configuration as ready', async () => {
  for (const turn of [response({}, false), response({ iceServers: 'invalid' }), response({ iceServers: [{ urls: 'turn:relay.example' }] })]) {
    const fetcher = jest.fn().mockResolvedValueOnce(response({ status: 'ok', strictProximity: true })).mockResolvedValueOnce(turn);
    await expect(checkVoiceConnection('https://voice.example', fetcher)).resolves.toBe('unavailable');
  }
});
