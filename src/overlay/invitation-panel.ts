import {SERVER_URL} from '../core/config';
import {parseInvitationInput} from '../services/invitation-input';
import {clearVoiceCredentials,saveVoiceInvitation,voiceInvitation} from '../services/voice-access';
import {registerLobby} from '../services/lobby-registration';
import {lobbyReservation,lobbyState,resetLobbyState} from '../services/lobby-state';
import {bindDiscordLinks} from '../services/discord';
declare const __VOXDRIA_VERSION__:string;

/** Admission can happen before the game; this panel never opens lobby audio. */
export function mountInvitationPanel():()=>void{
  const host=document.getElementById('voice-invitation-panel');if(!host)return()=>{};
  const version=typeof __VOXDRIA_VERSION__==='undefined'?'development':__VOXDRIA_VERSION__;
  host.innerHTML=`<details open><summary>Conectare Voxdria · ${version}</summary>
    <label for="voice-invitation">Cod RV- sau invitația completă din Caster</label>
    <textarea id="voice-invitation" autocomplete="off" maxlength="4096" rows="2" aria-label="Invitație vocală Voxdria"></textarea>
    <label for="lobby-riot-id">Riot ID (Nume#EUNE)</label><input id="lobby-riot-id" autocomplete="off" maxlength="64">
    <button id="voice-invitation-save" class="icon-btn">Conectează cu invitația</button>
    <button id="lobby-register" class="icon-btn">Reconectează înscrierea</button>
    <p id="voice-invitation-status" role="status"></p><p id="lobby-registration-status" role="status"></p>
    <p>Vocea pornește numai în meci. Înainte de start se face doar înscrierea și aprobarea.</p>
    <button id="voice-invitation-clear" class="icon-btn">Deconectează invitația</button>
    <button id="discord-community" class="icon-btn">Comunitate Discord</button>
    <p class="small">Motor original LoLProxChat · toți jucătorii au nevoie de Voxdria 0.4.3 și serverul actualizat. Casterul rămâne pe canal separat.</p></details>`;
  const field=document.getElementById('voice-invitation') as HTMLTextAreaElement,name=document.getElementById('lobby-riot-id') as HTMLInputElement;
  const info=document.getElementById('voice-invitation-status')!,registration=document.getElementById('lobby-registration-status')!;
  let local='',game='',gameActive=false,stop:(()=>void)|undefined;
  const refresh=()=>{const state=lobbyState();info.textContent=game||local||(voiceInvitation()?'Invitație salvată. Vocea se conectează în meci.':'Introdu codul vocal primit din Caster.');
    registration.textContent=state.phase==='approved'?(state.muted?'Acces vocal oprit de organizator.':`Înscriere aprobată: ${state.name} · ${state.team==='ORDER'?'Albastru':'Roșu'} · voce numai în meci.`):state.message;
  };
  const changed=()=>window.dispatchEvent(new Event('riftvoice:invitation-changed'));
  const enroll=(riotId:string,code:string)=>{stop?.();local='';game='';stop=registerLobby(riotId,code,refresh,()=>{local='Înscriere aprobată. Vocea va porni în meci.';changed();refresh();});};
  const connect=(resume=false)=>{
    const parsed=parseInvitationInput(field.value.trim()||(resume?lobbyReservation():'')||voiceInvitation());
    if(typeof parsed.token!=='string'){local=parsed.error||'Invitație invalidă.';refresh();return;}
    if(parsed.server&&parsed.server!==SERVER_URL){local='Invitația este pentru alt server. Configurează adresa corectă în Setări.';refresh();return;}
    if(!saveVoiceInvitation(parsed.token)){local='Invitația nu poate fi păstrată în sesiune.';refresh();return;}
    if((/^RV-[A-Za-z0-9_-]{43}$/.test(parsed.token)||parsed.token===lobbyReservation()||resume)&&!gameActive){
      const riotId=name.value.trim();if(!riotId||riotId.length>64||/[\x00-\x1f\x7f]/.test(riotId)){local='Completează Riot ID-ul pentru înscriere.';refresh();name.focus();return;}
      field.value='';enroll(riotId,parsed.token);
    }else{stop?.();stop=undefined;resetLobbyState();field.value='';local='Invitație salvată. Se conectează vocea în meci.';game='';changed();refresh();}
  };
  document.getElementById('voice-invitation-save')!.onclick=()=>connect();document.getElementById('lobby-register')!.onclick=()=>connect(true);
  document.getElementById('voice-invitation-clear')!.onclick=()=>{stop?.();stop=undefined;clearVoiceCredentials();resetLobbyState();game='';local='Invitație deconectată.';changed();refresh();};
  const update=(event:Event)=>{game=String((event as CustomEvent).detail||'');local='';refresh();};
  const gameState=(event:Event)=>{gameActive=(event as CustomEvent).detail===true;refresh();};
  window.addEventListener('riftvoice:lobby-state',refresh);window.addEventListener('riftvoice:join-error',update);window.addEventListener('riftvoice:join-status',update);window.addEventListener('riftvoice:game-active',gameState);
  try{const saved=sessionStorage.getItem('riftvoice.lobby-name');if(saved&&lobbyReservation()){name.value=saved;enroll(saved,lobbyReservation());}}catch{}
  bindDiscordLinks(false);refresh();
  const dispose=()=>{stop?.();window.removeEventListener('riftvoice:lobby-state',refresh);window.removeEventListener('riftvoice:join-error',update);window.removeEventListener('riftvoice:join-status',update);window.removeEventListener('riftvoice:game-active',gameState);};
  window.addEventListener('beforeunload',dispose,{once:true});return dispose;
}
