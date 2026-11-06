import { MicrophoneTest } from '../../src/voice/mic-test';

jest.mock('../../src/services/devices', () => ({
  getStoredInputDeviceId: () => null, getStoredOutputDeviceId: () => null,
}));
jest.mock('../../src/voice/engine', () => ({ ChampionVoiceEngine: class {
  input = {}; output = { connect: jest.fn() };
  configure() {} dispose() {}
} }));

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const settings = { enabled: false, selection: 'auto' as const, mix: .65 };
let restores: Array<() => void>;
function install(key: string, value: unknown) {
  const old = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, { configurable: true, value });
  restores.push(() => old ? Object.defineProperty(globalThis, key, old) : delete (globalThis as any)[key]);
}
beforeEach(() => { restores = []; jest.useFakeTimers(); });
afterEach(() => { restores.reverse().forEach(fn => fn()); jest.useRealTimers(); });

test('failure from an obsolete preview cannot stop a newer microphone test', async () => {
  const oldResume = deferred();
  const tracks = [{ stop: jest.fn() }, { stop: jest.fn() }];
  let captures = 0, contexts = 0;
  install('navigator', { mediaDevices: { getUserMedia: async () => {
    const track = tracks[captures++]; return { getTracks: () => [track] };
  } } });
  install('AudioContext', class {
    destination = {}; close = jest.fn(async () => {});
    resume = contexts++ === 0 ? () => oldResume.promise : async () => {};
    createMediaStreamSource() { return { connect() {} }; }
    createAnalyser() { return { fftSize: 8, connect() {}, getFloatTimeDomainData(data: Float32Array) { data.fill(.1); } }; }
    createGain() { return { gain: { value: 1 }, connect() {} }; }
  });
  const preview = new MicrophoneTest();
  const first = preview.start(settings, '', undefined, () => {}, () => {});
  const firstCompletion = expect(first).resolves.toBeUndefined();
  await Promise.resolve(); await Promise.resolve();
  const stopped = jest.fn(), level = jest.fn();
  await preview.start(settings, '', undefined, level, stopped);
  oldResume.reject(new Error('old context failed'));
  await firstCompletion;
  expect(tracks[0].stop).toHaveBeenCalledTimes(1);
  expect(tracks[1].stop).not.toHaveBeenCalled();
  expect(stopped).not.toHaveBeenCalled();
  jest.advanceTimersByTime(50);
  expect(level).toHaveBeenCalled();
  preview.stop();
  expect(tracks[1].stop).toHaveBeenCalledTimes(1);
  expect(stopped).toHaveBeenCalledTimes(1);
});



test('stopping during microphone acquisition releases a late stream', async () => {
  let finish!: (value: unknown) => void;
  const pending = new Promise(resolve => { finish = resolve; });
  const track = { stop: jest.fn() };
  install('navigator', { mediaDevices: { getUserMedia: () => pending } });
  const preview = new MicrophoneTest();
  const started = preview.start(settings, '', undefined, jest.fn(), jest.fn());
  preview.stop();
  finish({ getTracks: () => [track] });
  await started;
  expect(track.stop).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});

test('a cancelled acquisition error does not surface as a new preview failure', async () => {
  let fail!: (error: Error) => void;
  const pending = new Promise((_, reject) => { fail = reject; });
  install('navigator', { mediaDevices: { getUserMedia: () => pending } });
  const preview = new MicrophoneTest();
  const started = preview.start(settings, '', undefined, jest.fn(), jest.fn());
  preview.stop();
  fail(new Error('cancelled microphone request'));
  await expect(started).resolves.toBeUndefined();
});
