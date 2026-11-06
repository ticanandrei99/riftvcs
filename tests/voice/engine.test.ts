import { automaticVoice, sanitizeVoice } from '../../src/voice/presets';
import { findSkinName, resolveSkinName } from '../../src/voice/catalog';
import { ChampionVoiceEngine, distortionCurve } from '../../src/voice/engine';

test('selects only supported identities; unknown skins fall back to champion', () => {
  expect(automaticVoice('game_character_displayname_Xerath', 'Dark Star Xerath')).toBe('dark-star-xerath');
  expect(automaticVoice('Xerath', 'Unknown future skin')).toBe('xerath');
  expect(automaticVoice('Thresh')).toBe('thresh');
  expect(automaticVoice('Mordekaiser')).toBe('mordekaiser');
  expect(automaticVoice('Lux')).toBe('clean');
});
test('rejects malformed preferences and clamps intensity', () => {
  expect(sanitizeVoice({ enabled: 'yes', selection: '__proto__', mix: NaN })).toEqual({ enabled: false, selection: 'clean', mix: .65 });
  expect(sanitizeVoice({ mix: 99 }).mix).toBe(1);
  expect(sanitizeVoice({ mix: -1 }).mix).toBe(0);
});
test('skin matching uses skin num, never the globally unique skin id', () => {
  const data = { data: { Xerath: { skins: [{ id: '101005', num: 5, name: 'Dark Star Xerath' }] } } };
  expect(findSkinName(data, 'Xerath', 5)).toBe('Dark Star Xerath');
  expect(findSkinName(data, 'Xerath', 101005)).toBeUndefined();
  expect(findSkinName(null, 'Xerath', 5)).toBeUndefined();
});
test('offline catalog safely leaves automatic champion fallback', async () => {
  const spy = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
  try { expect(await resolveSkinName('Xerath', 5, new AbortController().signal)).toBeUndefined(); }
  finally { spy.mockRestore(); }
});
test('distortion is bounded, finite, symmetric and monotonic', () => {
  const curve = distortionCurve(2.8);
  for (let i = 0; i < curve.length; i++) {
    expect(Number.isFinite(curve[i])).toBe(true);
    expect(Math.abs(curve[i])).toBeLessThanOrEqual(1);
    expect(curve[i]).toBeCloseTo(-curve[curve.length - 1 - i], 5);
    if (i) expect(curve[i]).toBeGreaterThanOrEqual(curve[i-1]);
  }
});
class Node {
  links = new Set<unknown>();
  gain = { value: 1 }; frequency = { value: 0 }; Q = { value: 0 };
  delayTime = { value: 0 }; threshold = { value: 0 }; knee = { value: 0 };
  ratio = { value: 0 }; attack = { value: 0 }; release = { value: 0 };
  started = false; stopped = false;
  connect(to: unknown) { this.links.add(to); return to; }
  disconnect() { this.links.clear(); }
  start() { this.started = true; } stop() { this.stopped = true; }
}
function context() {
  const nodes: Node[] = [];
  const make = () => { const n = new Node(); nodes.push(n); return n; };
  return { nodes, context: { createGain: make, createBiquadFilter: make, createWaveShaper: make, createDelay: make, createDynamicsCompressor: make, createOscillator: make } as unknown as AudioContext };
}
test('preset changes keep the output node and stop/disconnect obsolete oscillators', () => {
  const fake = context(); const engine = new ChampionVoiceEngine(fake.context);
  const output = engine.output;
  engine.configure({ enabled: true, selection: 'robot', mix: .6 });
  expect(engine.activeVoice).toBe('robot');
  const oscillator = fake.nodes.find(n => n.started)!;
  expect(oscillator).toBeDefined();
  engine.configure({ enabled: true, selection: 'robot', mix: .8 });
  expect(oscillator.stopped).toBe(true);
  expect(oscillator.links.size).toBe(0);
  expect(engine.output).toBe(output);
  engine.configure({ enabled: false, selection: 'robot', mix: .8 });
  expect((engine.input as unknown as Node).links.has(output)).toBe(true);
  engine.dispose(); engine.dispose();
  expect(fake.nodes.every(n => n.links.size === 0)).toBe(true);
});
test('a DSP construction failure reconnects the clean voice path', () => {
  const fake = context(); fake.context.createOscillator = () => { throw Error('unsupported'); };
  const log = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const engine = new ChampionVoiceEngine(fake.context);
    engine.configure({ enabled: true, selection: 'robot', mix: .6 });
    expect(engine.activeVoice).toBe('clean');
    expect((engine.input as unknown as Node).links.has(engine.output)).toBe(true);
    engine.dispose();
  } finally { log.mockRestore(); }
});

test('legacy automatic settings fall back to Natural and manual Robotic ignores champion identity', () => {
  const fake = context(); const engine = new ChampionVoiceEngine(fake.context);
  const output = engine.output;
  engine.configure({ enabled: true, selection: 'auto', mix: 1 }, 'Xerath', 'Dark Star Xerath');
  expect(engine.activeVoice).toBe('clean');
  engine.configure({ enabled: true, selection: 'auto', mix: 1 }, 'Thresh');
  expect(engine.activeVoice).toBe('clean');
  engine.configure({ enabled: true, selection: 'robot', mix: 1 }, 'Xerath', 'Dark Star Xerath');
  expect(engine.activeVoice).toBe('robot');
  engine.configure({ enabled: true, selection: 'robot', mix: 1 }, 'Mordekaiser');
  expect(engine.activeVoice).toBe('robot');
  engine.configure({ enabled: true, selection: 'auto', mix: 1 }, 'Lux');
  expect(engine.activeVoice).toBe('clean');
  expect(engine.output).toBe(output);
  engine.dispose();
});

