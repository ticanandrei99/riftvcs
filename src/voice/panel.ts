declare const __RIFTVOICE_VERSION__: string;
import { diagnosticReport, safeQuality, qualityGrade, ConnectionQuality } from '../services/connection-quality';
import { SERVER_URL } from '../core/config';
import { validateServerAddress } from '../core/server-address';
import { PRESETS, readVoice, saveVoice, sanitizeVoice, automaticVoice, VoiceSelection } from './presets';
import { MicrophoneTest } from './mic-test';
import { getAllyProximity, getCameraOnly, getCameraListen, setAllyProximity, setCameraListen, setCameraOnly } from '../services/audio-prefs';
import { applyTranslations, t } from '../overlay/i18n';
import { checkVoiceConnection, VoiceConnectionState } from '../services/connection-status';

export function mountVoicePanel(): void {
  const container = document.getElementById('voice-panel');
  if (!container) return;
  let settings = readVoice(), champion = '', skinName: string | undefined;
  let testing = false;
  let selfMuted = false, allMuted = false;
  let quality: ConnectionQuality = safeQuality(null);
  let connection: VoiceConnectionState | 'checking' = 'checking';
  const preview = new MicrophoneTest();

  container.innerHTML = `
    <div class="voice-heading"><span data-i18n="voice.heading"></span><span class="voice-badge" data-i18n="voice.badge"></span></div>
    <div class="setting-row"><label for="voice-enabled" data-i18n="voice.enabled"></label><input id="voice-enabled" type="checkbox"></div>
    <select id="voice-selection" aria-label="Voice preset"></select>
    <p id="voice-applied" class="voice-applied" role="status"></p>
    <div class="setting-row"><label for="voice-mix" data-i18n="voice.strength"></label><output id="voice-mix-label"></output></div>
    <input id="voice-mix" aria-label="Effect strength" type="range" min="0" max="100" step="1">
    <button id="voice-test" class="voice-test"></button>
    <meter id="voice-meter" min="0" max="1" value="0" aria-label="Processed microphone level"></meter>
    <p id="voice-test-status" class="voice-detail" role="status"></p>
    <div class="voice-privacy"><span class="privacy-dot"></span><span id="voice-privacy-status" role="status"></span></div>
    <div id="voice-mode" class="voice-mode" role="status"></div>
    <div id="voice-quality" class="voice-quality" role="status"></div>
    <button id="copy-diagnostic" class="diagnostic-copy" data-i18n="diagnostic.copy"></button>
    <p id="diagnostic-copy-status" class="voice-detail" role="status"></p>
    <textarea id="diagnostic-fallback" readonly hidden aria-label="Diagnostic report"></textarea>
    <label for="voice-server" class="voice-detail" data-i18n="voice.server"></label>
    <input id="voice-server" type="url" aria-label="Voice server URL">
    <button id="voice-server-save" class="voice-test" data-i18n="voice.saveServer"></button>
    <p id="voice-server-status" class="voice-detail"></p>
    <p class="voice-credit" data-i18n="voice.credit">Source base: LoLProxChat · Modified by RiftVoice</p>`;
  const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const server = el<HTMLInputElement>('voice-server'); server.value = SERVER_URL;
  const enabled = el<HTMLInputElement>('voice-enabled'); enabled.checked = settings.enabled;
  const selection = el<HTMLSelectElement>('voice-selection');
  const manual = selection;
  for (const preset of [PRESETS.clean, PRESETS.robot]) manual.appendChild(new Option(preset.name, preset.id));
  selection.value = settings.selection;
  const mix = el<HTMLInputElement>('voice-mix'); mix.value = String(Math.round(settings.mix * 100));
  const button = el<HTMLButtonElement>('voice-test'), meter = el<HTMLMeterElement>('voice-meter');
  const status = el<HTMLElement>('voice-test-status');
  let stoppedOnce = false;
  const showApplied = () => {
    const id = settings.enabled && settings.mix > 0 ? (settings.selection === 'auto' ? automaticVoice(champion, skinName) : settings.selection) : 'clean';
    el('voice-applied').textContent = t('voice.applied', { name: id === 'clean' ? t('voice.clean') : t('voice.robot') }) +
      (id !== 'clean' ? ' · ' + Math.round(settings.mix * 100) + '%' : '');
  };
  const mode = () => getCameraOnly() ? 'camera' : getCameraListen() ? 'nearby-camera' : getAllyProximity() ? 'nearby' : 'team';
  const showQuality = () => {
    el('voice-mode').textContent = t(('mode.' + mode()) as import('../overlay/i18n').StringKey);
    const grade = qualityGrade(quality);
    el('voice-quality').textContent = t(('quality.' + grade) as import('../overlay/i18n').StringKey) +
      (quality.connected ? ' · ' + quality.connected : '') +
      (quality.rttMs !== null ? ' · ' + quality.rttMs + ' ms' : '') +
      (quality.lossPercent !== null ? ' · ' + t('quality.loss', { value: String(quality.lossPercent) }) : '');
  };
  const syncHybrid = showQuality;
  const showPrivacy = () => {
    const keys = { checking: 'voice.privateChecking', ready: 'voice.privateReady', offline: 'voice.offline', update: 'voice.serverUpdate', unavailable: 'voice.privateBlocked', invitation: 'voice.invitation' } as const;
    el('voice-privacy-status').textContent = t(keys[connection]);
    const card = el('voice-privacy-status').parentElement!;
    card.classList.toggle('unavailable', connection !== 'ready');
    card.dataset.state = connection;
  };
  const relabel = () => {
    applyTranslations(container);
    for (const option of Array.from(selection.options)) option.textContent = t(option.value === 'robot' ? 'voice.robot' : 'voice.clean');
    el('voice-mix-label').textContent = mix.value + '%';
    button.textContent = t(testing ? 'voice.stop' : 'voice.test');
    status.textContent = testing ? t('voice.preview', { status: preview.status }) : (stoppedOnce ? t('voice.stopped') : '');
    el('voice-server-status').textContent = '';
    showApplied(); syncHybrid(); showPrivacy();
  };
  const update = () => {
    settings = sanitizeVoice({ enabled: enabled.checked, selection: selection.value as VoiceSelection, mix: Number(mix.value) / 100 });
    try { saveVoice(settings); } catch { status.textContent = t('voice.saveFailed'); }
    window.dispatchEvent(new CustomEvent('overlayAction', { detail: { action: 'updateSettings', payload: { voice: settings } } }));
    preview.configure(settings, champion, skinName); relabel();
  };
  enabled.onchange = update;
  selection.onchange = () => { if (selection.value !== 'clean') { enabled.checked = true; if (Number(mix.value) === 0) mix.value = '100'; } update(); };
  mix.oninput = update;
  const stopped = () => { testing = false; stoppedOnce = true; meter.value = 0; relabel(); };
  button.onclick = async () => {
    if (selfMuted || allMuted) { preview.stop(); stopped(); return; }
    if (testing) { preview.stop(); stopped(); return; }
    testing = true; button.textContent = t('voice.stop'); status.textContent = t('voice.opening');
    try {
      await preview.start(settings, champion, skinName, value => { meter.value = value; status.textContent = t('voice.preview', { status: preview.status }); }, stopped);
      if (testing) relabel();
    } catch (error) { stopped(); status.textContent = t('voice.failed', { error: error instanceof Error ? error.message : String(error) }); }
  };
  const syncPreviewMute = () => {
    button.disabled = selfMuted || allMuted;
    if (button.disabled) { preview.stop(); stopped(); }
  };
  // Header buttons stop preview immediately; authoritative state also covers
  // keyboard shortcuts and mute changes coming from the background.
  el('btn-self-mute')?.addEventListener('click', () => {
    selfMuted = el('btn-self-mute').classList.contains('active'); syncPreviewMute();
  });
  el('btn-mute-all')?.addEventListener('click', () => {
    allMuted = el('btn-mute-all').classList.contains('active'); syncPreviewMute();
  });
  window.addEventListener('overlayUpdate', ((event: CustomEvent) => {
    const nextSelf = event.detail?.selfMuted === true, nextAll = event.detail?.muteAll === true;
    if (nextSelf !== selfMuted || nextAll !== allMuted) {
      selfMuted = nextSelf; allMuted = nextAll; syncPreviewMute();
    }
  }) as EventListener);
  el('btn-ally-proximity')?.addEventListener('click', syncHybrid);
  el('voice-server-save').onclick = () => {
    const url = validateServerAddress(server.value);
    if (!url) { el('voice-server-status').textContent = t('voice.invalidServer'); return; }
    try { localStorage.setItem('riftvoice.server', url); preview.stop(); window.location.reload(); }
    catch { el('voice-server-status').textContent = t('voice.saveFailed'); }
  };
  window.addEventListener('riftvoice:identity', ((event: CustomEvent) => {
    champion = event.detail.champion; skinName = event.detail.skinName; preview.configure(settings, champion, skinName); relabel();
  }) as EventListener);
  window.addEventListener('riftvoice:language', relabel);
  window.addEventListener('overlayUpdate', ((event: CustomEvent) => { quality = safeQuality(event.detail?.quality); showQuality(); }) as EventListener);
  for (const id of ['btn-camera-only','btn-camera-listen','btn-ally-proximity']) el(id)?.addEventListener('click', showQuality);
  el('copy-diagnostic').onclick = async () => {
    const version = typeof __RIFTVOICE_VERSION__ === 'undefined' ? 'development' : __RIFTVOICE_VERSION__;
    const report = diagnosticReport({ version, connection, quality, mode: mode(), voice: settings.selection, enabled: settings.enabled, strength: settings.mix });
    try { await navigator.clipboard.writeText(report); el('diagnostic-copy-status').textContent = t('diagnostic.copied'); }
    catch {
      const field = el<HTMLTextAreaElement>('diagnostic-fallback'); field.value = report; field.hidden = false; field.focus(); field.select();
      el('diagnostic-copy-status').textContent = t('diagnostic.manualCopy');
    }
  };
  window.addEventListener('riftvoice:close', () => preview.stop());
  window.addEventListener('beforeunload', () => preview.stop());
  document.addEventListener('visibilitychange', () => { if (document.hidden) { preview.stop(); stopped(); } });
  relabel();
  let disposed = false, checking = false;
  let request: AbortController | null = null;
  const refreshConnection = async () => {
    if (disposed || checking) return;
    checking = true;
    request = new AbortController();
    const next = await checkVoiceConnection(SERVER_URL, fetch, request.signal);
    checking = false;
    if (!disposed) { connection = next; showPrivacy(); }
  };
  const offline = () => { connection = 'offline'; showPrivacy(); };
  window.addEventListener('offline', offline);
  window.addEventListener('online', refreshConnection);
  window.addEventListener('riftvoice:session-changed', refreshConnection);
  const poll = setInterval(refreshConnection, 30_000);
  const dispose = () => {
    disposed = true; request?.abort(); clearInterval(poll);
    window.removeEventListener('offline', offline); window.removeEventListener('online', refreshConnection);
    window.removeEventListener('riftvoice:session-changed', refreshConnection);
  };
  window.addEventListener('beforeunload', dispose, { once: true });
  window.addEventListener('riftvoice:close', dispose, { once: true });
  void refreshConnection();
}



