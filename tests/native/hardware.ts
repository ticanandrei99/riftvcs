import { invoke } from '@tauri-apps/api/core';
import { AppAudioOutput, listAppOutputDevices } from '../../src/services/app-audio-output';
declare const __VOXDRIA_QA_RESULT_URL__:string;
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const status = (s: string) => { document.getElementById('status')!.textContent = s; };
const run = document.getElementById('run') as HTMLButtonElement;
async function runHardwareTest(): Promise<void> {
  if (run.disabled) return;
  run.disabled = true;
  const result: Record<string, any> = { timestamp: new Date().toISOString(), platform: navigator.userAgent, microphoneAudioStored: false, microphoneAudioTransmitted: false, tests: {} };
  let mic: MediaStream | null = null, ctx: AudioContext | null = null, output: AppAudioOutput | null = null;
  try {
    status('Verific ieșirile audio Windows…');
    const devices = await listAppOutputDevices();
    result.tests.devices = { passed: devices.devices.length > 0, ...devices };
    status('Deschid microfonul pentru analiză locală…');
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      const track = mic.getAudioTracks()[0], settings = track.getSettings();
      ctx = new AudioContext(); await ctx.resume();
      const analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
      const silence = ctx.createGain(); silence.gain.value = 0;
      ctx.createMediaStreamSource(mic).connect(analyser).connect(silence).connect(ctx.destination);
      const samples = new Float32Array(analyser.fftSize); let peak = 0, maxRms = 0;
      for (let i = 0; i < 25; i++) { await wait(80); analyser.getFloatTimeDomainData(samples); let power = 0; for (const value of samples) { peak = Math.max(peak, Math.abs(value)); power += value * value; } maxRms = Math.max(maxRms, Math.sqrt(power / samples.length)); }
      result.tests.microphone = { passed: track.readyState === 'live' && ctx.state === 'running', label: track.label, channels: settings.channelCount, sampleRate: settings.sampleRate, peak, maxRms, detectedSignal: peak > 0.00001 };
      mic.getTracks().forEach(t => t.stop()); mic = null;
      await ctx.close(); ctx = null;
    } catch (error) { result.tests.microphone = { passed: false, error: String(error) }; }
    status('Verific mixerul nativ al aplicației — ton sintetic redus…');
    let outputFailure: string | null = null;
    output = new AppAudioOutput(reason => { outputFailure = reason; });
    const started = await output.start(null);
    if (!started) throw Error('Native AppAudioOutput could not start');
    ctx = new AudioContext(); await ctx.resume();
    const tone = ctx.createOscillator(); tone.frequency.value = 440;
    const amplitude = ctx.createGain(); amplitude.gain.value = 0.01;
    const destination = ctx.createMediaStreamDestination(); tone.connect(amplitude).connect(destination); tone.start();
    const tap = output.attach(destination.stream);
    tap.setGain(0); await wait(300);
    tap.setGain(0.5); await wait(1200);
    const playing: any = await invoke('audio_out_status');
    tap.setGain(0); await wait(300);
    const muted: any = await invoke('audio_out_status');
    tap.disconnect(); tone.stop(); destination.stream.getTracks().forEach(t => t.stop());
    await ctx.close(); ctx = null;
    await output.stop(); output = null; await wait(300);
    const stopped: any = await invoke('audio_out_status');
    result.tests.nativeAppOutput = { passed: playing.running === true && stopped.running === false && outputFailure === null, playing, muted, stopped, outputFailure };
    status('Verific izolarea comenzilor native pentru caster…');
    const denied: Record<string, boolean> = {};
    for (const command of ['capture_minimap', 'get_live_client_data']) {
      try { await invoke(command); denied[command] = false; }
      catch (error) { denied[command] = String(error).includes('Command not allowed'); }
    }
    result.tests.casterPermissions = { passed: Object.values(denied).every(Boolean), denied };
  } catch (error) { result.fatalError = String(error); }
  finally {
    mic?.getTracks().forEach(t => t.stop());
    await ctx?.close().catch(() => {}); await output?.stop().catch(() => {});
    result.passed = !result.fatalError && Object.values(result.tests).every((t: any) => t.passed === true);
    document.getElementById('result')!.textContent = JSON.stringify(result, null, 2);
    status(result.passed ? 'Proba locală a trecut.' : 'Proba a identificat o problemă; vezi rezultatul.');
    try { await fetch(typeof __VOXDRIA_QA_RESULT_URL__==='undefined'?'http://127.0.0.1:9415/result':__VOXDRIA_QA_RESULT_URL__, { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result) }); }
    catch { status('Proba s-a terminat; rezultatul local nu poate fi salvat automat.'); }
    run.disabled = false;
  }
};

run.onclick = () => { void runHardwareTest(); };
setTimeout(() => { void runHardwareTest(); }, 3000);
