import { WS_URL } from '../core/config';
import { saveVoiceInvitation } from './voice-access';

/** Pregame check-in carries a claimed name, never a Riot login or game data. */
export function registerLobby(name: string, invitation: string, notify: (text: string) => void, approved: () => void): () => void {
  const socket = new WebSocket(WS_URL.replace(/\/ws$/, '/registration'));
  let active = true, accepted = false;
  socket.onopen = () => { if (active) socket.send(JSON.stringify({ type:'lobby_register',name,invitation })); };
  socket.onmessage = event => {
    if (!active) return;
    let msg: any; try { msg = JSON.parse(event.data); } catch { return; }
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'lobby_pending') notify('Înscriere trimisă. Organizatorul confirmă Riot ID-ul și echipa în Caster.');
    if (msg.type === 'lobby_approved' && typeof msg.invitation === 'string' && /^[A-Za-z0-9_-]{43}$/.test(msg.invitation)) {
      if (!saveVoiceInvitation(msg.invitation)) { notify('Înscrierea nu poate fi păstrată în această sesiune.'); return; }
      accepted = true;
      try { sessionStorage.setItem('riftvoice.lobby-name',name); } catch { /* The voice reservation remains session-only. */ }
      try { sessionStorage.setItem('riftvoice.lobby-reservation',msg.invitation); } catch {}
      if (msg.invitation !== invitation) approved();
    }
    if (accepted && msg.type === 'lobby_state' && typeof msg.name === 'string' && msg.name.length <= 64 && ['ORDER','CHAOS'].includes(msg.team)) {
      notify('Înscris: '+msg.name+' · '+(msg.team==='ORDER'?'Albastru':'Roșu')+(msg.muted?' · Acces vocal oprit de moderare':msg.started?' · Echipe blocate pentru meci':' · Intră în aceeași echipă în lobby-ul LoL.'));
    }
    if (msg.type === 'error') notify(typeof msg.message === 'string' ? msg.message.slice(0,500) : 'Înscriere indisponibilă.');
  };
  socket.onerror = () => { if (active) notify('Înscrierea nu se poate conecta la server.'); };
  socket.onclose = () => { if (active) notify('Înscriere deconectată. Codul aprobat rămâne în această sesiune; reconectează-te manual dacă este necesar.'); };
  return () => { active=false;socket.close(); };
}
