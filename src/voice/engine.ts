import { automaticVoice, PRESETS, sanitizeVoice, VoiceId, VoiceSettings } from './presets';

/** Future authorized conversion providers implement this local audio-graph contract.
 * Inference must run in an AudioWorklet/worker, never block the UI/audio callback.
 * A provider must declare its model license and consent provenance before loading.
 */
export interface AuthorizedVoiceProvider {
  readonly id: string;
  readonly rights: { license: string; consentReference: string; modelSha256: string };
  create(context: AudioContext, signal: AbortSignal): Promise<{
    input: AudioNode; output: AudioNode; latencyMs: number; dispose(): void;
  }>;
}

export function distortionCurve(drive: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(2048);
  const k = Math.max(.001, Math.min(4, drive));
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * (1 + k)) / Math.tanh(1 + k);
  }
  return curve;
}

/** Stable input/output nodes preserve every RTCRtpSender track across changes. */
export class ChampionVoiceEngine {
  readonly input: GainNode;
  readonly output: GainNode;
  private nodes: AudioNode[] = [];
  private oscillator: OscillatorNode | null = null;
  private current = '';
  private disposed = false;
  activeVoice: VoiceId = 'clean';
  lastError: string | null = null;
  constructor(private context: AudioContext) {
    this.input = context.createGain();
    this.output = context.createGain();
    this.input.connect(this.output);
  }
  configure(value: VoiceSettings, champion = '', skinName?: string): void {
    if (this.disposed) return;
    const settings = sanitizeVoice(value);
    const id = settings.enabled && settings.mix > 0 ? (settings.selection === 'auto' ? automaticVoice(champion, skinName) : settings.selection) : 'clean';
    const signature = id + ':' + settings.mix;
    if (signature === this.current) return;
    this.clear();
    this.current = signature;
    this.activeVoice = id;
    this.lastError = null;
    if (id === 'clean' || settings.mix === 0) { this.input.connect(this.output); return; }
    try {
      const p = PRESETS[id];
      if (id === 'robot') {
        // True bipolar ring modulation: no DC bias at full strength.
        // 220 Hz input becomes 150 Hz + 290 Hz with a 70 Hz carrier.
        const dry = this.context.createGain(); this.nodes.push(dry);
        const wet = this.context.createGain(); this.nodes.push(wet);
        const ring = this.context.createGain(); this.nodes.push(ring);
        dry.gain.value = 1 - settings.mix;
        wet.gain.value = settings.mix;
        ring.gain.value = 0;
        this.oscillator = this.context.createOscillator();
        this.oscillator.frequency.value = p.modulationHz;
        this.oscillator.connect(ring.gain);
        this.input.connect(dry); dry.connect(this.output);
        this.input.connect(ring); ring.connect(wet); wet.connect(this.output);
        this.oscillator.start();
        return;
      }
      const dry = this.context.createGain();
      const wet = this.context.createGain();
      const high = this.context.createBiquadFilter();
      const low = this.context.createBiquadFilter();
      const shape = this.context.createWaveShaper();
      const ring = this.context.createGain();
      const depth = this.context.createGain();
      const delay = this.context.createDelay(.5);
      const echo = this.context.createGain();
      const limiter = this.context.createDynamicsCompressor();
      this.nodes.push(dry, wet, high, low, shape, ring, depth, delay, echo, limiter);
      dry.gain.value = 1 - settings.mix;
      wet.gain.value = settings.mix * p.level;
      high.type = 'highpass'; high.frequency.value = p.highpass; high.Q.value = .7;
      low.type = 'lowpass'; low.frequency.value = p.lowpass; low.Q.value = .7;
      shape.curve = distortionCurve(p.drive); shape.oversample = '2x';
      ring.gain.value = 1 - p.modulationDepth;
      depth.gain.value = p.modulationDepth;
      delay.delayTime.value = p.delay; echo.gain.value = p.echo;
      limiter.threshold.value = -6; limiter.knee.value = 6;
      limiter.ratio.value = 12; limiter.attack.value = .003; limiter.release.value = .12;
      this.oscillator = this.context.createOscillator();
      this.oscillator.frequency.value = p.modulationHz;
      this.oscillator.connect(depth); depth.connect(ring.gain);
      this.input.connect(dry); dry.connect(limiter);
      this.input.connect(high); high.connect(low); low.connect(shape); shape.connect(ring);
      ring.connect(wet); ring.connect(delay); delay.connect(echo); echo.connect(wet);
      wet.connect(limiter); limiter.connect(this.output);
      this.oscillator.start();
    } catch (error) {
      // If a device/runtime cannot construct effects, preserve voice service.
      this.clear(); this.activeVoice = 'clean'; this.current = '';
      this.lastError = error instanceof Error ? error.message : String(error);
      this.input.connect(this.output);
      console.warn('[Voxdria] Voice effects unavailable; using natural voice', error);
    }
  }
  private clear(): void {
    this.input.disconnect();
    if (this.oscillator) { try { this.oscillator.stop(); } catch { /* not started */ } this.oscillator.disconnect(); }
    this.oscillator = null;
    for (const node of this.nodes) node.disconnect();
    this.nodes = [];
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.clear(); this.output.disconnect();
  }
}


