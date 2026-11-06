import { t } from '../overlay/i18n';
import { ChampionVoiceEngine } from './engine';
import { PRESETS, VoiceSettings } from './presets';
import { getStoredInputDeviceId, getStoredOutputDeviceId } from '../services/devices';

/** Local monitoring only. Never constructs signaling or peer connections. */
export class MicrophoneTest {
  private generation = 0;
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private engine: ChampionVoiceEngine | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private onStopped: (() => void) | null = null;
  async start(settings: VoiceSettings, champion: string, skinName: string | undefined,
    onLevel: (value: number) => void, onStopped: () => void): Promise<void> {
    this.stop();
    const generation = this.generation;
    const id = getStoredInputDeviceId();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: {
        ...(id ? { deviceId: { exact: id } } : {}),
        echoCancellation: true, noiseSuppression: true, autoGainControl: true,
      } });
    } catch (error) {
      if (generation !== this.generation) return;
      throw error;
    }
    if (generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); return; }
    this.stream = stream;
    this.onStopped = onStopped;
    try {
      const context = new AudioContext(); this.context = context;
      const output = getStoredOutputDeviceId();
      if (output && 'setSinkId' in context) await (context as AudioContext & { setSinkId(id: string): Promise<void> }).setSinkId(output);
      if (generation !== this.generation) return;
      await context.resume();
      if (generation !== this.generation) return;
      this.engine = new ChampionVoiceEngine(context);
      this.engine.configure(settings, champion, skinName);
      context.createMediaStreamSource(stream).connect(this.engine.input);
      const level = context.createAnalyser(); level.fftSize = 1024;
      this.engine.output.connect(level);
      const monitor = context.createGain(); monitor.gain.value = .35;
      level.connect(monitor); monitor.connect(context.destination);
      const samples = new Float32Array(level.fftSize);
      this.timer = setInterval(() => {
        level.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((s, v) => s + v * v, 0) / samples.length);
        onLevel(Math.min(1, rms * 5));
      }, 50);
      this.timeout = setTimeout(() => this.stop(), 30_000);
    } catch (e) {
      // A pending obsolete start must not tear down a newer preview.
      if (generation !== this.generation) return;
      this.stop();
      throw e;
    }
  }
  configure(settings: VoiceSettings, champion: string, skinName?: string): void {
    this.engine?.configure(settings, champion, skinName);
    if (this.context?.state === 'suspended') {
      void this.context.resume().catch(error => { this.stop(); console.error('[RiftVoice] Preview resume failed', error); });
    }
  }
  get status(): string {
    if (!this.context || !this.engine) return t('voice.closed');
    if (this.engine.lastError) return t('voice.effectError', { error: this.engine.lastError });
    return (this.engine.activeVoice === 'clean' ? t('voice.clean') : t('voice.robot')) + ' · ' + t(this.context.state === 'running' ? 'voice.running' : this.context.state === 'suspended' ? 'voice.suspended' : 'voice.closed');
  }
  stop(): void {
    this.generation++;
    if (this.timer) clearInterval(this.timer);
    if (this.timeout) clearTimeout(this.timeout);
    this.timer = null; this.timeout = null;
    this.engine?.dispose(); this.engine = null;
    this.stream?.getTracks().forEach(t => t.stop()); this.stream = null;
    void this.context?.close(); this.context = null;
    const done = this.onStopped; this.onStopped = null; done?.();
  }
}




