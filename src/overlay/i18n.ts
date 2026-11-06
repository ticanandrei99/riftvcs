import { WARN_NOT_FOUND, WARN_IMPLAUSIBLE, WARN_QUERY_FAILED } from '../core/game-window';
export type Lang = 'en' | 'ro';
export const LANGUAGES: ReadonlyArray<{ code: Lang; name: string }> = [{code:'en',name:'English'},{code:'ro',name:'Română'}];
const LANG_KEY='lolproxchat.language';
const STRINGS={
  "voice.credit": {"en":"Source base: LoLProxChat · Modified by RiftVoice","ro":"Cod de bază: LoLProxChat · Modificat de RiftVoice"},
  "audio.allMuted": {"en":"All voices are muted","ro":"Toate vocile au fost oprite"},
  "audio.micMuted": {"en":"Your microphone is muted","ro":"Microfonul tău este oprit"},
  "header.selfMute": {
    "en": "Toggle Self Mute",
    "ro": "Activează/dezactivează microfonul"
  },
  "header.muteAll": {
    "en": "Mute All",
    "ro": "Oprește toate vocile"
  },
  "header.pos": {
    "en": "Wrong position? If people next to you can't hear you, click this, then walk somewhere: the app finds your champion on the minimap again. Until it does, only your team hears you.",
    "ro": "Dacă jucătorii apropiați nu te aud, apasă aici și deplasează-te pentru recalibrarea poziției. Până atunci te aude doar echipa."
  },
  "header.posLabel": {
    "en": "POS",
    "ro": "POZ"
  },
  "header.settings": {
    "en": "Settings",
    "ro": "Setări"
  },
  "header.settingsLabel": {
    "en": "SET",
    "ro": "SET"
  },
  "header.collapse": {
    "en": "Collapse",
    "ro": "Restrânge"
  },
  "header.expand": {
    "en": "Expand",
    "ro": "Extinde"
  },
  "players.waiting": {
    "en": "Waiting for nearby players...",
    "ro": "Se așteaptă jucători în apropiere…"
  },
  "players.dead": {
    "en": "DEAD",
    "ro": "MORT"
  },
  "players.muted": {
    "en": "MUTED",
    "ro": "MIC OPRIT"
  },
  "players.mutedByYou": {
    "en": "MUTED",
    "ro": "MUT"
  },
  "players.unmute": {"en":"Unmute","ro":"Reactivează"},
  "players.mute": {
    "en": "MUTE",
    "ro": "MUT"
  },
  "settings.language": {
    "en": "Language",
    "ro": "Limbă"
  },
  "settings.inputDevice": {
    "en": "Input Device",
    "ro": "Microfon"
  },
  "settings.outputDevice": {
    "en": "Output Device",
    "ro": "Ieșire audio"
  },
  "settings.default": {
    "en": "Default",
    "ro": "Implicit"
  },
  "settings.unnamedInput": {
    "en": "(unnamed audioinput)",
    "ro": "(microfon fără nume)"
  },
  "settings.unnamedOutput": {
    "en": "(unnamed audiooutput)",
    "ro": "(ieșire fără nume)"
  },
  "settings.inputMode": {
    "en": "Input Mode",
    "ro": "Mod microfon"
  },
  "settings.alwaysOpen": {
    "en": "Always Open",
    "ro": "Microfon deschis"
  },
  "settings.pushToTalk": {
    "en": "Push to Talk",
    "ro": "Apasă pentru a vorbi"
  },
  "settings.pttKey": {
    "en": "PTT Key",
    "ro": "Tastă pentru vorbit"
  },
  "settings.pttKeyHint": {
    "en": "Push-to-talk key, used only in Push to Talk mode. Default: the key left of 1 (` on US keyboards, º on Spanish ones).",
    "ro": "Tasta folosită în modul Apasă pentru a vorbi. Implicit: tasta din stânga lui 1."
  },
  "settings.toggleKey": {
    "en": "Toggle-mute Key",
    "ro": "Tastă pentru microfon"
  },
  "settings.toggleKeyHint": {
    "en": "Optional toggle-self-mute hotkey. Click to bind a key; click again to clear.",
    "ro": "Scurtătură opțională pentru activarea microfonului. Apasă pentru atribuire; apasă din nou pentru ștergere."
  },
  "settings.unbound": {
    "en": "(unbound)",
    "ro": "(neatribuită)"
  },
  "settings.pressKey": {
    "en": "Press a key…",
    "ro": "Apasă o tastă…"
  },
  "settings.forbiddenKey": {
    "en": "(LoL/system key — pick another)",
    "ro": "(tastă rezervată — alege alta)"
  },
  "settings.unsupportedKey": {
    "en": "(key not supported)",
    "ro": "(tastă incompatibilă)"
  },
  "settings.micVolume": {
    "en": "Mic Volume",
    "ro": "Volum microfon"
  },
  "settings.forceTurn": {
    "en": "Private connection",
    "ro": "Conexiune privată"
  },
  "settings.forceTurnHint": {
    "en": "Voice uses TURN relays only. Direct connections are disabled. Players do not receive your IP; the server and relay operators can see connection addresses.",
    "ro": "Vocea folosește numai relee TURN. Conexiunile directe sunt dezactivate. Jucătorii nu primesc IP-ul tău; operatorul serverului și releul pot vedea adresa conexiunii."
  },
  "settings.appAudio": {
    "en": "App audio (OBS)",
    "ro": "Audio pentru OBS"
  },
  "settings.appAudioHint": {
    "en": "When ON, the voices are played by lolproxchat.exe itself instead of the built-in browser, so OBS can capture them with Application Audio Capture → [lolproxchat.exe] on their own track. Output Device then lists the devices lolproxchat.exe sees. Use headphones: with speakers the others may hear themselves back. On by default.",
    "ro": "Redă vocile prin RiftVoice pentru capturarea separată în OBS. Folosește căști pentru a evita ecoul."
  },
  "settings.cameraOnly": {
    "en": "Camera mode",
    "ro": "Mod cameră"
  },
  "settings.cameraOnlyHint": {
    "en": "When ON (default), you hear exactly the players whose icons are inside your camera's white box on the minimap, and nobody else: not even someone beside you if your camera is elsewhere. Enemies only while their icon is drawn on your minimap, so one in a brush or in the fog stays silent. Others hear you when YOUR icon is inside THEIR box: looking at someone never makes them hear you. Does not need the app to find your own icon. Overrides Ally proximity and Voice on camera while on. Everyone should use the same version for it to work both ways.",
    "ro": "Auzi jucătorii vizibili în dreptunghiul camerei de pe minimapă. Inamicii ascunși nu sunt redați. Acest mod înlocuiește celelalte opțiuni de proximitate."
  },
  "settings.allyProximity": {
    "en": "Ally proximity",
    "ro": "Proximitatea aliaților"
  },
  "settings.allyProximityHint": {
    "en": "When ON (default), teammates fade with distance just like enemies. When OFF, teammates are always at full volume. Takes effect on the next position update.",
    "ro": "Activ: volumul aliaților depinde de distanță. Inactiv: echipa este auzită oriunde."
  },
  "settings.cameraListen": {
    "en": "Voice on camera",
    "ro": "Ascultă zona camerei"
  },
  "settings.cameraListenHint": {
    "en": "When ON, you also hear the champions inside your camera's white box on the minimap — what is on your screen — not just those near your champion. Enemies only while their icon is on your minimap, as everywhere: one in a brush or in the fog stays silent. One-way: the people you listen in on only hear you if they are near your champion or looking at you themselves. Only works between players who BOTH have it on: leave it off and nobody's Voice on camera can reach you. (Players in Camera mode still hear you while your icon is inside their camera box.) On by default.",
    "ro": "Adaugă zona camerei la raza de ascultare pentru jucătorii care activează aceeași opțiune. Inamicii ascunși nu sunt redați."
  },
  "settings.wrongPosition": {
    "en": "Wrong position?",
    "ro": "Poziție incorectă?"
  },
  "settings.wrongPositionHint": {
    "en": "If people near you can't hear you, the app may be tracking the wrong icon on your minimap (it can latch onto a ward you walked past). This drops the current position and finds your champion again; walk somewhere after pressing it so it can tell you apart. Until it finds you, only your team hears you.",
    "ro": "Recalibrează urmărirea campionului. Deplasează-te după apăsare. Până la identificare te aude doar echipa."
  },
  "settings.reset": {
    "en": "RESET",
    "ro": "RESET"
  },
  "settings.sharedReset": {
    "en": "Shared RESET",
    "ro": "Resetare comună"
  },
  "settings.sharedResetHint": {
    "en": "When ON, pressing RESET also makes everyone else in the game who has this on find their champion on the minimap again, and their RESETs do the same for you. On by default. Only works between players who have it on: leave it off and nobody's RESET reaches you. Either team can use it, at most once every 15 seconds per game.",
    "ro": "Permite recalibrarea comună cu ceilalți utilizatori care activează această opțiune. Cel mult o dată la 15 secunde."
  },
  "notice.sharedReset": {
    "en": "{name} pressed RESET — finding you again",
    "ro": "{name} a apăsat RESET — poziția se recalibrează"
  },
  "notice.sharedResetAnon": {
    "en": "Another player pressed RESET — finding you again",
    "ro": "Un jucător a apăsat RESET — poziția se recalibrează"
  },
  "settings.searching": {
    "en": "SEARCHING",
    "ro": "CĂUTARE"
  },
  "settings.debug": {
    "en": "Debug",
    "ro": "Diagnostic"
  },
  "settings.debugLogs": {
    "en": "Debug Logs",
    "ro": "Jurnale"
  },
  "settings.openLogsHint": {
    "en": "Open log folder to attach to a GitHub issue",
    "ro": "Deschide folderul cu jurnale pentru raportarea unei probleme"
  },
  "settings.open": {
    "en": "OPEN",
    "ro": "DESCHIDE"
  },
  "settings.autoUpdate": {
    "en": "Automatic update checks",
    "ro": "Verificare automată actualizări"
  },
  "settings.updates": {
    "en": "Updates",
    "ro": "Actualizări"
  },
  "settings.check": {
    "en": "CHECK",
    "ro": "VERIFICĂ"
  },
  "settings.scanRate": {
    "en": "Scan Rate",
    "ro": "Frecvență scanare"
  },
  "settings.on": {
    "en": "ON",
    "ro": "ACTIV"
  },
  "settings.off": {
    "en": "OFF",
    "ro": "OPRIT"
  },
  "update.checking": {
    "en": "Checking for updates…",
    "ro": "Se verifică actualizările…"
  },
  "update.available": {
    "en": "Update available: v{version} — applying…",
    "ro": "Actualizare disponibilă: v{version} — se instalează…"
  },
  "update.upToDate": {
    "en": "Up to date (v{version})",
    "ro": "La zi (v{version})"
  },
  "update.failed": {
    "en": "Update check failed: {error}",
    "ro": "Verificarea a eșuat: {error}"
  },
  "header.close": {
    "en": "Close RiftVoice",
    "ro": "Închide RiftVoice"
  },
  "voice.heading": {
    "en": "VOICE",
    "ro": "VOCE"
  },
  "voice.badge": {
    "en": "VOICE EFFECTS",
    "ro": "EFECTE VOCALE"
  },
  "voice.identity": {
    "en": "Champion and skin are detected when a match starts",
    "ro": "Campionul și skinul sunt detectate la începutul meciului"
  },
  "voice.enabled": {
    "en": "Voice effects",
    "ro": "Efecte vocale"
  },
  "voice.auto": {
    "en": "Automatic · champion & skin",
    "ro": "Automat · campion și skin"
  },
  "voice.manual": {
    "en": "Manual · choose an effect",
    "ro": "Manual · alege un efect"
  },
  "voice.hint": {
    "en": "Automatic follows your champion. Manual keeps your choice.",
    "ro": "Automat urmărește campionul. Manual păstrează alegerea ta."
  },
  "voice.strength": {
    "en": "Effect strength",
    "ro": "Intensitatea efectului"
  },
  "voice.test": {
    "en": "Hear my processed voice",
    "ro": "Ascultă vocea procesată"
  },
  "voice.stop": {
    "en": "Stop test",
    "ro": "Oprește testul"
  },
  "voice.headphones": {
    "en": "Use headphones. Local playback only; stops after 30 seconds.",
    "ro": "Folosește căști. Redare doar locală; se oprește după 30 de secunde."
  },
  "voice.stopped": {"en":"Microphone test stopped.","ro":"Testul microfonului este oprit."},
  "voice.opening": {
    "en": "Opening microphone…",
    "ro": "Se deschide microfonul…"
  },
  "voice.preview": {
    "en": "Preview: {status}",
    "ro": "Ascultare: {status}"
  },
  "voice.failed": {
    "en": "Microphone test failed: {error}",
    "ro": "Testul microfonului a eșuat: {error}"
  },
  "voice.hybrid": {
    "en": "Hybrid voice active",
    "ro": "Mod hibrid activ"
  },
  "voice.enableHybrid": {
    "en": "Enable Hybrid voice",
    "ro": "Activează modul hibrid"
  },
  "voice.hybridHint": {
    "en": "Hear your team everywhere and enemies nearby. All participants need RiftVoice.",
    "ro": "Auzi echipa oriunde și inamicii din apropiere. Toți participanții au nevoie de RiftVoice."
  },
  "voice.server": {
    "en": "Voice server",
    "ro": "Server vocal"
  },
  "voice.saveServer": {
    "en": "Save server & reconnect",
    "ro": "Salvează și reconectează"
  },
  "voice.sameServer": {
    "en": "Everyone must use the same voice server.",
    "ro": "Toți trebuie să folosească același server vocal."
  },
  "voice.localServer": {
    "en": "Local server. Multiplayer needs a shared HTTPS server.",
    "ro": "Server local. Pentru multiplayer este necesar un server HTTPS comun."
  },
  "voice.invalidServer": {
    "en": "Use an HTTPS address without a path, or localhost HTTP.",
    "ro": "Folosește o adresă HTTPS fără cale sau HTTP local."
  },
  "voice.saveFailed": {
    "en": "Could not save the setting.",
    "ro": "Setarea nu a putut fi salvată."
  },
  "voice.applied": {
    "en": "Applied: {name}",
    "ro": "Voce aplicată: {name}"
  },
  "voice.noChampion": {
    "en": "No champion detected. Choose a manual effect to test.",
    "ro": "Niciun campion detectat. Alege un efect manual pentru test."
  },
  "voice.robot": { "en": "Robotic", "ro": "Robotică" },
  "voice.nearbyHint": { "en": "Nearby players only, teammates and enemies. Voice pauses when your position is unavailable.", "ro": "Auzi doar jucătorii din apropiere, aliați și inamici. Vocea se oprește când poziția ta nu poate fi stabilită." },
  "voice.serverUpdate": {"en":"Server connected, but needs an update. Voice is unavailable.","ro":"Server conectat, dar trebuie actualizat. Vocea nu este disponibilă."},
  "voice.offline": {"en":"Connection offline. Retrying…","ro":"Legătură offline. Se încearcă reconectarea…"},
  "header.minimize": {"en":"Minimize to taskbar","ro":"Minimizează în bara de activități"},
  "mode.nearby": {"en":"Mode: nearby players","ro":"Mod: jucători din apropiere"},
  "mode.camera": {"en":"Mode: camera area","ro":"Mod: zona camerei"},
  "mode.nearby-camera": {"en":"Mode: nearby + camera area","ro":"Mod: apropiere + zona camerei"},
  "mode.team": {"en":"Mode: team everywhere, enemies nearby","ro":"Mod: echipa oriunde, inamicii aproape"},
  "quality.idle": {"en":"No players connected yet","ro":"Niciun jucător conectat încă"},
  "quality.connecting": {"en":"Connecting to players…","ro":"Se conectează jucătorii…"},
  "quality.measuring": {"en":"Measuring voice connection…","ro":"Se măsoară legătura vocală…"},
  "quality.good": {"en":"Voice connection: good","ro":"Legătură vocală: bună"},
  "quality.fair": {"en":"Voice connection: delayed","ro":"Legătură vocală: cu întârziere"},
  "quality.poor": {"en":"Voice connection: weak","ro":"Legătură vocală: slabă"},
  "quality.loss": {"en":"{value}% packet loss","ro":"{value}% pierderi"},
  "diagnostic.copy": {"en":"Copy safe diagnostic report","ro":"Copiază raportul de diagnostic"},
  "diagnostic.copied": {"en":"Report copied. No IPs, names or credentials.","ro":"Raport copiat. Fără IP-uri, nume sau parole."},
  "diagnostic.manualCopy": {"en":"Select and copy the report below.","ro":"Selectează și copiază raportul de mai jos."},
  "update.later": {"en":"Later","ro":"Mai târziu"},
  "update.retry": {"en":"Try again later.","ro":"Încearcă din nou mai târziu."},
  "update.channelPending": {"en":"No RiftVoice releases are published yet.","ro":"Nu există încă versiuni publicate pe canalul RiftVoice."},
  "update.manualAvailable": {"en":"New version available: RiftVoice {version}.","ro":"Versiune nouă disponibilă: RiftVoice {version}."},
  "update.downloadPage": {"en":"Open RiftVoice downloads","ro":"Actualizează"},
  "voice.invitation": {"en":"Enter the organizer invitation in Settings to connect.","ro":"Introdu invitația organizatorului în Setări pentru conectare."},
  "voice.clean": {
    "en": "Natural",
    "ro": "Naturală"
  },
  "voice.running": {
    "en": "playing",
    "ro": "redare activă"
  },
  "voice.suspended": {
    "en": "audio paused",
    "ro": "audio în pauză"
  },
  "voice.closed": {
    "en": "stopped",
    "ro": "oprit"
  },
  "voice.effectError": {
    "en": "Effects failed: {error} · Natural fallback",
    "ro": "Efectele au eșuat: {error} · Voce naturală"
  },
  "voice.skinUnknown": {
    "en": "skin unavailable",
    "ro": "skin indisponibil"
  },
  "voice.privateChecking": {"en":"Connecting…","ro":"Se stabilește legătura…"},
  "voice.privateReady": {"en":"Connected to the server.","ro":"Legătură cu serverul stabilită."},
  "voice.privateBlocked": {"en":"Server connected. Voice is not ready yet.","ro":"Server conectat. Vocea nu este pregătită încă."}
} as const;
export type StringKey=keyof typeof STRINGS;
const STATUS_RO: Record<string,string>={...{
  "Waiting for League of Legends": "Se așteaptă League of Legends",
  "Microphone blocked — listening only. Check Windows microphone privacy settings": "Microfon blocat — poți doar asculta. Verifică permisiunile microfonului în Windows",
  "Searching for your champion on the minimap": "Se caută campionul pe minimapă",
  "In client": "În client",
  "In lobby": "În lobby",
  "Searching for match": "Se caută un meci",
  "Ready check": "Confirmarea meciului",
  "In champion select": "La alegerea campionului",
  "Joining game...": "Se intră în meci…",
  "Game complete": "Meci încheiat",
  "End of game": "Sfârșitul meciului",
  "Reconnect": "Reconectare",
  "CheckedIntoTournament": "Înscris în turneu",
  "TerminatedInError": "Meci încheiat cu eroare",
  "Couldn't read your Riot ID from League — see log": "Identificatorul Riot nu a putut fi citit — consultă jurnalul",
  "Couldn't match your Riot ID to the player list — see log": "Identificatorul Riot nu a fost găsit în lista jucătorilor — consultă jurnalul",
  "Streamer mode detected — not joining proximity chat": "Mod streamer detectat — chatul de proximitate este oprit"
},
[WARN_NOT_FOUND]:'Fereastra League nu a fost găsită — folosește modul fără margini.',
[WARN_IMPLAUSIBLE]:'Fereastra League nu este validă — se folosește monitorul principal.',
[WARN_QUERY_FAILED]:'Fereastra League nu poate fi citită — se folosește monitorul principal.',
"Minimap too large to capture — lower MinimapScale in League's HUD.":'Minimapa este prea mare — redu scara ei în setările League.',
'Calibrated minimap is outside the capture area — recalibrate.':'Minimapa calibrată este în afara capturii — recalibrează.'};
const KEYS_RO: Record<string,string>={'Caps Lock':'Caps Lock','Delete':'Ștergere','Home':'Început','End':'Sfârșit','Page Up':'Pagina sus','Page Down':'Pagina jos','Space':'Spațiu','Unknown':'Necunoscută'};

function storage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

// Read once: t() runs several times per player row at the position-tick rate.
let current: Lang | null = null;

/** Only English and Romanian are supported. Old language choices fall back to the system language. */
export function getLanguage(): Lang {
  if (current) return current;
  let stored: string | null = null;
  try { stored = storage()?.getItem(LANG_KEY) ?? null; } catch { /* treat as unset */ }
  if (stored === 'en' || stored === 'ro') return (current = stored);
  const sys = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  return (current = sys.toLowerCase().startsWith('ro') ? 'ro' : 'en');
}

export function setLanguage(lang: Lang): void {
  current = lang;
  try { storage()?.setItem(LANG_KEY, lang); } catch { /* not persisted; still applies this session */ }
}

export function t(key: StringKey, params: Record<string, string> = {}, lang: Lang = getLanguage()): string {
  let s: string = STRINGS[key][lang];
  for (const [k, v] of Object.entries(params)) s = s.split('{' + k + '}').join(v);
  return s;
}

/** A status line from the services, in the panel language. */
export function translateStatus(english: string, lang: Lang = getLanguage()): string {
  if (lang === 'en' || !english) return english;
  const exact = STATUS_RO[english];
  if (exact) return exact;
  const map = /^Proximity is off — (.+) is not a supported map$/.exec(english);
  if (map) return 'Proximitate oprită — ' + map[1] + ' nu este o hartă compatibilă';
  return english;
}

/** A key name from humanizeVk, in the panel language. */
export function translateKey(label: string, lang: Lang = getLanguage()): string {
  return lang === 'ro' ? KEYS_RO[label] ?? label : label;
}

export function allKeys(): StringKey[] {
  return Object.keys(STRINGS) as StringKey[];
}

/** Fill every data-i18n (text) and data-i18n-title (tooltip) element. */
export function applyTranslations(root: ParentNode, lang: Lang = getLanguage()): void {
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-i18n]'))) {
    el.textContent = t(el.dataset.i18n as StringKey, {}, lang);
  }
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-i18n-title]'))) {
    el.title = t(el.dataset.i18nTitle as StringKey, {}, lang);
  }
}


