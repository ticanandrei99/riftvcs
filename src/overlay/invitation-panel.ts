import { SERVER_URL } from '../core/config';
import { parseInvitationInput } from '../services/invitation-input';
import { clearVoiceCredentials,saveVoiceInvitation,voiceInvitation } from '../services/voice-access';
import { registerLobby } from '../services/lobby-registration';
import { lobbyReservation,lobbyState,resetLobbyState } from '../services/lobby-state';
import {bindDiscordLinks} from '../services/discord';
declare const __VOXDRIA_VERSION__:string;

export function mountInvitationPanel():()=>void {
  const host=document.getElementById('voice-invitation-panel');if(!host)return()=>{};
  const version=typeof __VOXDRIA_VERSION__==='undefined'?'development':__VOXDRIA_VERSION__;
  host.innerHTML=`<details open><summary>Conectare Voxdria · ${version}</summary>
    <label for="voice-invitation">Cod RV- sau invitația completă din Caster</label>
    <textarea id="voice-invitation" autocomplete="off" maxlength="4096" rows="2" aria-label="Invitație vocală Voxdria"></textarea>
    <label for="lobby-riot-id">Riot ID (Nume#EUNE)</label><input id="lobby-riot-id" autocomplete="off" maxlength="64">
    <button id="voice-invitation-save" class="icon-btn">Conectează cu invitația</button>
    <button id="lobby-register" class="icon-btn">Reconectează înscrierea</button>
    <p id="voice-invitation-status" role="status"></p><p id="lobby-registration-status" role="status"></p>
    <button id="lobby-voice-connect" class="icon-btn" disabled>Conectează vocea în lobby</button>
    <label><input id="lobby-stream-mute" type="checkbox"> Oprește vocile lobby-ului în mixul capturat de OBS (și în căști)</label>
    <button id="voice-invitation-clear" class="icon-btn">Deconectează invitația</button>
    <button id="discord-community" class="icon-btn">Comunitate Discord</button><p id="discord-status" role="status"></p>
    <div id="lobby-voice-peers" aria-label="Coechipieri în lobby"></div>
    <p>Numele este confirmat de organizator. Casterii sunt pe un canal separat. La începerea meciului se închide vocea de lobby.</p>
    </details>`;
  const field=document.getElementById('voice-invitation') as HTMLTextAreaElement,name=document.getElementById('lobby-riot-id') as HTMLInputElement;
  bindDiscordLinks(false);
  const status=document.getElementById('voice-invitation-status')!,registration=document.getElementById('lobby-registration-status')!;
  const voice=document.getElementById('lobby-voice-connect') as HTMLButtonElement;
  let stop:(()=>void)|undefined,gameActive=false,gameMessage='',localMessage='';
  const mutedPeers=new Set<string>();
  const refresh=()=>{
    const state=lobbyState();
    status.textContent=localMessage||gameMessage||(voiceInvitation()?'Cod vocal salvat în această sesiune.':'Introdu codul vocal primit din Caster.');
    registration.textContent=state.message;
    voice.disabled=state.phase!=='approved'||state.muted||state.started||gameActive||!state.voiceAvailable;
    voice.textContent=state.media==='ready'?'Oprește vocea în lobby':state.media==='connecting'?'Se conectează vocea…':'Conectează vocea în lobby';
    if(state.media==='ready')registration.textContent='Voce conectată în lobby · '+(state.team==='ORDER'?'Albastru':'Roșu')+(state.peers.length?' · '+state.peers.length+' coechipieri':' · aștept coechipieri');
    const list=document.getElementById('lobby-voice-peers')!;list.replaceChildren();
    for(const remote of state.peers){
      const row=document.createElement('div'),label=document.createElement('span'),mute=document.createElement('button');
      const relabel=()=>{mute.textContent=mutedPeers.has(remote)?'Reactivează':'Mute pentru mine';mute.setAttribute('aria-pressed',String(mutedPeers.has(remote)));};
      label.textContent=remote;mute.type='button';relabel();
      mute.onclick=()=>{const muted=!mutedPeers.has(remote);if(muted)mutedPeers.add(remote);else mutedPeers.delete(remote);relabel();window.dispatchEvent(new CustomEvent('riftvoice:lobby-control',{detail:{action:'mute',name:remote,muted}}));};
      row.append(label,mute);list.append(row);
    }
  };
  const refreshGame=()=>window.dispatchEvent(new Event('riftvoice:invitation-changed'));
  const wantVoice=(enabled:boolean)=>window.dispatchEvent(new CustomEvent('riftvoice:lobby-voice-request',{detail:enabled}));
  const enroll=(riotId:string,code:string)=>{
    stop?.();localMessage='';gameMessage='';
    stop=registerLobby(riotId,code,()=>refresh(),()=>{localMessage='Aprobarea a fost primită. Se pregătește conexiunea vocală.';gameMessage='';refreshGame();refresh();});
  };
  const connect=(resumeOnly=false)=>{
    const parsed=parseInvitationInput(field.value.trim()||(resumeOnly?lobbyReservation():'')||voiceInvitation());
    if(typeof parsed.token!=='string'){localMessage=parsed.error||'Invitație invalidă.';refresh();return;}
    if(parsed.server&&parsed.server!==SERVER_URL){localMessage='Invitația este pentru alt server. Setează serverul din invitație în Setări, apoi reintrodu invitația.';refresh();return;}
    if(!saveVoiceInvitation(parsed.token)){localMessage='Codul nu poate fi salvat în sesiune.';refresh();return;}
    const shared=/^RV-[A-Za-z0-9_-]{43}$/.test(parsed.token),reserved=parsed.token===lobbyReservation();
    if((shared||reserved||resumeOnly)&&!gameActive){
      const riotId=name.value.trim();
      if(!riotId||riotId.length>64||/[\x00-\x1f\x7f]/.test(riotId)){localMessage='Cod primit. Completează Riot ID-ul și apasă Conectează; cererea nu a fost încă trimisă.';refresh();name.focus();return;}
      field.value='';wantVoice(true);enroll(riotId,parsed.token);
    }else{
      stop?.();stop=undefined;wantVoice(false);resetLobbyState();
      try{sessionStorage.removeItem('riftvoice.lobby-name');sessionStorage.removeItem('riftvoice.lobby-reservation');}catch{}
      field.value='';localMessage='Cod salvat. Vocea se conectează după identificarea meciului.';gameMessage='';refreshGame();refresh();
    }
  };
  document.getElementById('voice-invitation-save')!.onclick=()=>connect();
  document.getElementById('lobby-register')!.onclick=()=>connect(true);
  voice.onclick=()=>wantVoice(lobbyState().media!=='ready');
  document.getElementById('lobby-stream-mute')!.onchange=event=>window.dispatchEvent(new CustomEvent('riftvoice:lobby-control',{detail:{action:'streamMute',muted:(event.target as HTMLInputElement).checked}}));
  document.getElementById('voice-invitation-clear')!.onclick=()=>{stop?.();stop=undefined;wantVoice(false);clearVoiceCredentials();resetLobbyState();gameMessage='';localMessage='Invitația a fost deconectată.';refreshGame();refresh();};
  const update=(event:Event)=>{gameMessage=String((event as CustomEvent).detail||'');localMessage='';refresh();};
  const game=(event:Event)=>{gameActive=(event as CustomEvent).detail===true;refresh();};
  window.addEventListener('riftvoice:lobby-state',refresh);window.addEventListener('riftvoice:join-error',update);window.addEventListener('riftvoice:join-status',update);window.addEventListener('riftvoice:game-active',game);
  try{const saved=sessionStorage.getItem('riftvoice.lobby-name');if(saved&&lobbyReservation()){name.value=saved;enroll(saved,lobbyReservation());}}catch{}
  refresh();
  const dispose=()=>{stop?.();window.removeEventListener('riftvoice:lobby-state',refresh);window.removeEventListener('riftvoice:join-error',update);window.removeEventListener('riftvoice:join-status',update);window.removeEventListener('riftvoice:game-active',game);};
  window.addEventListener('beforeunload',dispose,{once:true});return dispose;
}
