export type VoiceId = 'clean' | 'robot' | 'xerath' | 'dark-star-xerath' | 'thresh' | 'mordekaiser';
export type VoiceSelection = 'auto' | VoiceId;
export interface VoiceSettings { enabled: boolean; selection: VoiceSelection; mix: number }
export interface VoicePreset {
  id: VoiceId; name: string; highpass: number; lowpass: number;
  drive: number; modulationHz: number; modulationDepth: number;
  delay: number; echo: number; level: number;
}
// Original DSP designs. No game recordings, actor samples or trained voice models.
export const PRESETS: Record<VoiceId, VoicePreset> = {
  clean: { id: 'clean', name: 'Natural', highpass: 0, lowpass: 20000, drive: 0, modulationHz: 0, modulationDepth: 0, delay: 0, echo: 0, level: 1 },
  robot: { id: 'robot', name: 'Robotic', highpass: 0, lowpass: 20000, drive: 0, modulationHz: 70, modulationDepth: 1, delay: 0, echo: 0, level: 1 },
  xerath: { id: 'xerath', name: 'Xerath · Arcane', highpass: 180, lowpass: 6200, drive: 1.4, modulationHz: 90, modulationDepth: .9, delay: .065, echo: .2, level: .72 },
  'dark-star-xerath': { id: 'dark-star-xerath', name: 'Dark Star Xerath · Cosmic', highpass: 95, lowpass: 3900, drive: 2.2, modulationHz: 38, modulationDepth: .9, delay: .115, echo: .3, level: .65 },
  thresh: { id: 'thresh', name: 'Thresh · Spectral', highpass: 240, lowpass: 4400, drive: .8, modulationHz: 19, modulationDepth: .23, delay: .09, echo: .28, level: .78 },
  mordekaiser: { id: 'mordekaiser', name: 'Mordekaiser · Iron', highpass: 80, lowpass: 3200, drive: 2.8, modulationHz: 42, modulationDepth: .4, delay: .027, echo: .24, level: .62 },
};
export const DEFAULT_VOICE: VoiceSettings = { enabled: true, selection: 'clean', mix: .65 };
export function sanitizeVoice(value: unknown): VoiceSettings {
  const v = value as Partial<VoiceSettings> | null;
  return {
    enabled: v?.enabled === true,
    selection: v?.selection === 'robot' ? 'robot' : 'clean',
    mix: typeof v?.mix === 'number' && Number.isFinite(v.mix) ? Math.max(0, Math.min(1, v.mix)) : DEFAULT_VOICE.mix,
  };
}
export function readVoice(): VoiceSettings {
  try {
    const saved = localStorage.getItem('riftvoice.voice');
    return saved === null ? { ...DEFAULT_VOICE } : sanitizeVoice(JSON.parse(saved));
  }
  catch { return { ...DEFAULT_VOICE }; }
}
export function saveVoice(value: VoiceSettings): void {
  localStorage.setItem('riftvoice.voice', JSON.stringify(sanitizeVoice(value)));
}
export function championKey(name: string): string {
  return name.replace(/^game_character_displayname_/i, '').replace(/[^a-z]/gi, '').toLowerCase();
}
export function automaticVoice(champion: string, skinName?: string): VoiceId {
  const key = championKey(champion);
  if (key === 'xerath') return skinName?.toLowerCase() === 'dark star xerath' ? 'dark-star-xerath' : 'xerath';
  if (key === 'thresh' || key === 'mordekaiser') return key;
  return 'clean';
}



