import { isTauri } from '@tauri-apps/api/core';
import { mountOrganizer } from './organizer';
import { AppAudioOutput, type AppTap } from '../services/app-audio-output';
import { setVoiceSessionToken } from '../services/voice-access';
import { checkForUpdate, openUpdateDownloads, startStartupUpdateCheck, type UpdateInfo } from '../services/updater';
import { casterTransmitAllowed,validCasterPeer,validCasterReady } from './routing';
import { PeerConnection } from '../services/peer-connection';
import { WS_URL,SERVER_URL } from '../core/config';
import {bindDiscordLinks} from '../services/discord';
import {registerCaster} from './registration';
import {parseCasterInvitation,savedCaster,saveCaster,forgetCaster,type ApprovedCaster,type CasterRole} from './invitation';
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
declare const __VOXDRIA_VERSION__:string;
document.getElementById('caster-version')!.textContent='v'+__VOXDRIA_VERSION__;
const status = (s: string) => { document.getElementById('status')!.textContent = s; };
let ws: WebSocket | null = null, ctx: AudioContext | null = null;
let mic: MediaStream | null = null, output: MediaStreamAudioDestinationNode | null = null;
let tx: GainNode | null = null, monitor: GainNode | null = null;
let name = '', role = '', held = false, generation = 0;
const peers = new Map<string, PeerConnection>();
let appOut: AppAudioOutput | null = null, commentaryTap: AppTap | null = null;
let audioCleanup: Promise<void> = Promise.resolve();
let cancelRequest:(()=>void)|null=null,connectionDeadline:ReturnType<typeof setTimeout>|undefined;
let approvedCaster:ApprovedCaster|null=savedCaster(SERVER_URL),lastPersonalToken=approvedCaster?.invitation||'';
const requestName=input('request-name'),requestRole=document.getElementById('request-role') as HTMLSelectElement;
if(approvedCaster)requestName.value=approvedCaster.name;
function connectionInputs(pending:boolean):void{
  input('join').disabled=pending;input('token').disabled=pending;requestName.disabled=pending;requestRole.disabled=pending;
}
if (!isTauri()) { input('native-output').checked = false; input('native-output').disabled = true; }
const pending = new Map<string, Promise<PeerConnection>>();
const roster = new Map<string, { role: string }>();
const mutedPeers = new Set<string>();
const peerVolumes = new Map<string, number>();
function renderRoster(): void {
  const list = document.getElementById('caster-peers')!;
  list.replaceChildren();
  for (const [remote, entry] of roster) {
    const row = document.createElement('div');
    const label = document.createElement('span'); label.textContent = remote + ' · ' + entry.role;
    const button = document.createElement('button');
    const relabel = () => { button.textContent = mutedPeers.has(remote) ? 'Reactivează' : 'Mute pentru mine'; button.setAttribute('aria-pressed', String(mutedPeers.has(remote))); };
    button.onclick = () => { if (mutedPeers.has(remote)) mutedPeers.delete(remote); else mutedPeers.add(remote); relabel(); update(); };
    const volume = document.createElement('input'); volume.type = 'range'; volume.min = '0'; volume.max = '1'; volume.step = '0.01'; volume.value = String(peerVolumes.get(remote) ?? 1);
    volume.setAttribute('aria-label', 'Volum ' + remote);
    volume.oninput = () => { peerVolumes.set(remote, Number(volume.value)); update(); };
    relabel(); row.append(label, button, volume); list.append(row);
  }
}
function update() {
  const audible = casterTransmitAllowed(role, input('mute').checked, input('deafen').checked, input('ptt').checked, held);
  if (tx) tx.gain.value = audible ? Number(input('tx').value) : 0;
  if (monitor) monitor.gain.value = !appOut && audible && input('monitor').checked ? Number(input('commentary').value) : 0;
  commentaryTap?.setGain(audible && input('monitor').checked ? Number(input('commentary').value) : 0);
  for (const [remote, peer] of peers) {
    peer.setVolume(input('deafen').checked ? 0 : Number(input('rx').value) * (peerVolumes.get(remote) ?? 1));
    if (input('deafen').checked || input('stream-mute-peers').checked || mutedPeers.has(remote)) peer.mute(); else peer.unmute();
  }
}
function leave(message='Deconectat') {
  cancelRequest?.();cancelRequest=null;clearTimeout(connectionDeadline);connectionInputs(false);
  setVoiceSessionToken(null);
  commentaryTap?.disconnect(); commentaryTap = null;
  const oldOutput = appOut; appOut = null;
  if (oldOutput) audioCleanup = audioCleanup.then(() => oldOutput.stop()).catch(() => {});
  generation++; held = false; ws?.close(); ws = null;
  for (const peer of peers.values()) peer.close(); peers.clear(); pending.clear(); roster.clear(); renderRoster();
  mic?.getTracks().forEach(t => t.stop()); mic = null;
  void ctx?.close(); ctx = null; tx = monitor = output = null;
  input('mute').checked = true; input('monitor').checked = false; status(message);
}
function send(to: string, type: string, payload: unknown) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'caster_signal', to, payload: { type, payload } }));
}
async function peerFor(remote: string): Promise<PeerConnection> {
  if (peers.has(remote)) return peers.get(remote)!;
  if (pending.has(remote)) return pending.get(remote)!;
  const epoch = generation;
  const entry = roster.get(remote);
  if (!entry) throw Error('Participant neautorizat');
  const promise = PeerConnection.create(remote).then(peer => {
    if (epoch !== generation || roster.get(remote) !== entry) { peer.close(); throw Error('Sesiune închisă'); }
    if (appOut) peer.setAppOutput(appOut);
    peer.onIceCandidate = candidate => send(remote, 'ice-candidate', candidate.toJSON());
    if (role === 'caster' && output) peer.addLocalStream(output.stream);
    else peer.addReceiveOnlyAudio();
    peers.set(remote, peer); pending.delete(remote); update(); return peer;
  });
  pending.set(remote, promise); return promise;
}
async function connectAudio(invitation:string,expectedRole?:CasterRole):Promise<void>{
  leave(); const epoch = generation;
  await audioCleanup;
  if (epoch !== generation) return;
  status('Conectare la canalul comentatorilor…');connectionInputs(true);
  let socket:WebSocket;
  try{socket=new WebSocket(WS_URL.replace(/\/ws$/, '/caster'));}
  catch{leave('Conexiune audio eșuată. Verifică adresa serverului și reconectează.');return;}
  ws = socket;
  connectionDeadline=setTimeout(()=>{if(ws===socket&&epoch===generation)leave('Serverul nu a confirmat canalul audio. Verifică adresa și versiunea serverului.');},20000);
  socket.onopen = () => {if(ws===socket&&epoch===generation)socket.send(JSON.stringify({ type: 'caster_join', token: invitation }));};
  socket.onclose = event => { if (ws === socket) leave(event.code===4003?'Acces vocal oprit de organizator. Reconectează manual după reactivare.':'Canalul audio s-a deconectat. Folosește Reconectează sau conectarea cu rolul propriu.'); };
  socket.onerror = () => {if(ws===socket&&epoch===generation)leave('Conexiune audio eșuată. Verifică serverul și reconectează.');};
  // Serialize async messages so ICE cannot overtake the authenticated media setup.
  let queue = Promise.resolve(),accepted=false;
  socket.onmessage = event => { queue = queue.then(async () => {
    if (epoch !== generation) return;
    const msg = JSON.parse(event.data);
    if (msg.type === 'error') { leave(typeof msg.message==='string'?msg.message.slice(0,500):'Invitație audio refuzată.'); return; }
    if (msg.type === 'caster_ready') {
      if(accepted||!validCasterReady(msg)||(expectedRole&&msg.role!==expectedRole))throw Error('Invalid caster admission');
      accepted=true;
      clearTimeout(connectionDeadline);lastPersonalToken=invitation;connectionInputs(false);
      setVoiceSessionToken(msg.sessionToken);
      name = msg.name; role = msg.role; input('token').value = '';
      input('join').textContent='Reconectează';status('Aprobat pe server · pregătesc audio pentru '+name+'…');
      if (isTauri() && input('native-output').checked) {
        const out = new AppAudioOutput(() => { leave(); status('Ieșirea OBS s-a oprit. Verifică dispozitivul și reconectează.'); });
        if (!await out.start(null)) {leave('Ieșirea audio OBS nu a pornit. Verifică dispozitivul Windows sau debifează ieșirea dedicată și reconectează.');return;}
        if (epoch !== generation) { await out.stop(); return; }
        appOut = out;
      }
      if (role === 'caster') {
        let stream:MediaStream;
        try{stream=await navigator.mediaDevices.getUserMedia({ audio: true });}
        catch{if(epoch===generation)leave('Microfonul nu poate fi deschis. Verifică accesul/dispozitivul Windows și reconectează.');return;}
        if (epoch !== generation) { stream.getTracks().forEach(t => t.stop()); return; }
        mic = stream;
        if (appOut) commentaryTap = appOut.attach(mic);
        ctx = new AudioContext(); await ctx.resume();
        output = ctx.createMediaStreamDestination(); tx = ctx.createGain(); monitor = ctx.createGain();
        tx.gain.value = monitor.gain.value = 0;
        const source = ctx.createMediaStreamSource(mic); source.connect(tx).connect(output); source.connect(monitor).connect(ctx.destination);
      }
      for (const remote of msg.peers) roster.set(remote.name, { role: remote.role });
      renderRoster();
      update(); status(`Conectat: ${name} · ${role} · canal izolat`);
      for (const remote of msg.peers) { const peer = await peerFor(remote.name); send(remote.name, 'offer', await peer.createOffer()); }
    } else if (accepted&&msg.type === 'caster_peer') {
      if(!validCasterPeer(msg)||msg.name===name||roster.has(msg.name)||roster.size>=24)return;
      roster.set(msg.name, { role: msg.role }); renderRoster();
    } else if (accepted&&msg.type === 'caster_signal'&&roster.has(msg.from)&&['offer','answer','ice-candidate'].includes(msg.payload?.type)) {
      const peer = await peerFor(msg.from);
      if (msg.payload.type === 'offer') send(msg.from, 'answer', await peer.handleOffer(msg.payload.payload));
      if (msg.payload.type === 'answer') await peer.handleAnswer(msg.payload.payload);
      if (msg.payload.type === 'ice-candidate') await peer.addIceCandidate(msg.payload.payload);
    } else if (accepted&&msg.type === 'caster_left') { peers.get(msg.name)?.close(); peers.delete(msg.name); pending.delete(msg.name); roster.delete(msg.name); renderRoster(); }
  }).catch(() => { if(epoch===generation)leave('Sesiune oprită: eroare audio/conexiune. Reconectează manual.'); }); };
}
input('join').onclick = () => {
  if(approvedCaster&&approvedCaster.expiresAt<=Date.now()){approvedCaster=null;lastPersonalToken='';forgetCaster();}
  const raw=input('token').value.trim()||lastPersonalToken,parsed=parseCasterInvitation(raw,SERVER_URL);
  if('error' in parsed){leave(parsed.error);return;}
  if(parsed.kind==='personal'){void connectAudio(parsed.token,approvedCaster?.invitation===parsed.token?approvedCaster.role:undefined);return;}
  const requestedName=requestName.value.trim(),requestedRole=requestRole.value;
  if(!requestedName||requestedName.length>64||/[\x00-\x1f\x7f-\x9f]/.test(requestedName)||!['caster','spectator'].includes(requestedRole)){leave('Completează numele și rolul pentru cererea de comentator.');return;}
  leave();approvedCaster=null;lastPersonalToken='';forgetCaster();const epoch=generation;connectionInputs(true);status('Se trimite cererea de comentator…');
  cancelRequest=registerCaster(requestedName,parsed.code,requestedRole as CasterRole,message=>{if(epoch===generation)status(message);},grant=>{
    if(epoch!==generation)return;
    approvedCaster=grant;lastPersonalToken=grant.invitation;saveCaster(SERVER_URL,grant);requestName.value=grant.name;
    void connectAudio(grant.invitation,grant.role);
  },()=>{if(epoch===generation){connectionInputs(false);cancelRequest=null;}});
};
input('leave').onclick = () => leave();
for (const id of ['mute','deafen','stream-mute-peers','ptt','tx','rx','monitor','commentary']) input(id).oninput = update;
window.onkeydown = e => { if (e.code === 'Space' && !(e.target instanceof HTMLElement && e.target.closest('input,textarea,select,button,[contenteditable]')) && !e.repeat) { e.preventDefault(); held = true; update(); } };
window.onkeyup = e => { if (e.code === 'Space') { held = false; update(); } };
window.onblur = () => { held = false; update(); };
document.onvisibilitychange = () => { if (document.hidden) { held = false; update(); } };
window.addEventListener('beforeunload',()=>leave());
mountOrganizer(invitation=>{approvedCaster=null;lastPersonalToken='';forgetCaster();void connectAudio(invitation);});
bindDiscordLinks(true);

setInterval(() => { for (const peer of peers.values()) peer.stepVolume(performance.now()); }, 50);

function showUpdate(info: UpdateInfo): void {
  const available = info.update_available && info.channel_ready !== false;
  document.getElementById('caster-update')!.hidden = !available;
  document.getElementById('caster-update-text')!.textContent = available ? 'Versiune nouă disponibilă: Voxdria Caster ' + info.latest_version + '.' : '';
  document.getElementById('caster-update-status')!.textContent = available ? '' : info.channel_ready === false ? 'Canalul Caster nu are încă un installer publicat.' : 'Ești la zi: ' + info.current_version;
}
const stopUpdateCheck = startStartupUpdateCheck(info => { if (info.update_available) showUpdate(info); });
window.addEventListener('beforeunload', stopUpdateCheck, { once: true });
document.getElementById('caster-later')!.onclick = () => { document.getElementById('caster-update')!.hidden = true; };
document.getElementById('caster-download')!.onclick = () => {
  void openUpdateDownloads().catch(() => { document.getElementById('caster-update-status')!.textContent = 'Descărcările nu pot fi deschise. Încearcă din nou.'; });
};
document.getElementById('caster-check-update')!.onclick = async () => {
  document.getElementById('caster-update-status')!.textContent = 'Se verifică…';
  try { showUpdate(await checkForUpdate()); }
  catch { document.getElementById('caster-update-status')!.textContent = 'Actualizările nu pot fi verificate acum.'; }
};
