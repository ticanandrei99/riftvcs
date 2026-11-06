jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));
import { invoke } from '@tauri-apps/api/core';
import { checkForUpdate, startStartupUpdateCheck, isAutoUpdateEnabled, setAutoUpdateEnabled, openUpdateDownloads } from '../../src/services/updater';
const native = invoke as jest.Mock;
const info = { current_version: '0.1.0', latest_version: '0.2.0', update_available: true, channel_ready: true, download_url: null, notes: null };
const saved = new Map<string, string>();
beforeEach(() => {
  jest.useFakeTimers(); native.mockReset(); saved.clear();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => saved.get(k) ?? null, setItem: (k: string, v: string) => saved.set(k, v) } });
});
afterEach(() => { jest.useRealTimers(); });
test('checks automatically once after startup and delivers the new-version notice', async () => {
  native.mockResolvedValue(info); const notice = jest.fn();
  startStartupUpdateCheck(notice);
  expect(native).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1500);
  expect(native).toHaveBeenCalledTimes(1);
  expect(native).toHaveBeenCalledWith('check_for_update');
  expect(notice).toHaveBeenCalledWith(info);
});
test('disabling automatic checks keeps manual checking available', async () => {
  setAutoUpdateEnabled(false); expect(isAutoUpdateEnabled()).toBe(false);
  native.mockResolvedValue(info); startStartupUpdateCheck(jest.fn());
  await jest.advanceTimersByTimeAsync(1500); expect(native).not.toHaveBeenCalled();
  await expect(checkForUpdate()).resolves.toEqual(info);
});
test('concurrent checks share a request; failure does not stop subsequent checks', async () => {
  let reject!: (error: Error) => void;
  native.mockImplementationOnce(() => new Promise((_, no) => { reject = no; }));
  const a = checkForUpdate(), b = checkForUpdate(); expect(a).toBe(b);
  const caught = a.catch(() => {}); reject(new Error('offline')); await caught;
  native.mockResolvedValue(info); await expect(checkForUpdate()).resolves.toEqual(info);
  expect(native).toHaveBeenCalledTimes(2);
});
test('offline startup is non-blocking; unmount cancels scheduled checks', async () => {
  const onError = jest.fn(); native.mockRejectedValue(new Error('offline'));
  startStartupUpdateCheck(jest.fn(), onError); await jest.advanceTimersByTimeAsync(1500);
  expect(onError).toHaveBeenCalledTimes(1);
  const stop = startStartupUpdateCheck(jest.fn()); stop();
  await jest.advanceTimersByTimeAsync(1500); expect(native).toHaveBeenCalledTimes(1);
});
test('storage denial cannot break startup and downloads never accept a supplied URL', async () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw Error('blocked'); } });
  expect(isAutoUpdateEnabled()).toBe(true); expect(() => setAutoUpdateEnabled(false)).not.toThrow();
  native.mockResolvedValue(undefined); await openUpdateDownloads();
  expect(native).toHaveBeenCalledWith('open_release_page');
});
