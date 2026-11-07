import { WS_URL } from '../core/config';
import { saveVoiceInvitation } from './voice-access';
import { resetLobbyState,updateLobbyState } from './lobby-state';

/** A server-approved reservation is separate from the eventual in-game bearer session. */
export function registerLobby(name:string,invitation:string,notify:(text:string)=>void,approved:()=>void):()=>void {
  const socket=new WebSocket(WS_URL.replace(/\/ws$/,'/registration'));
  let active=true,accepted=false,lastFailure='';
  resetLobbyState();updateLobbyState({phase:'connecting',name,message:'Se conectează înscrierea la server…'});
  const report=(text:string)=>{notify(text);updateLobbyState({message:text});};
  const fail=(text:string)=>{lastFailure=text;updateLobbyState({phase:'error',media:'off'});report(text);};
  const deadline=setTimeout(()=>{if(active&&!accepted){fail('Serverul nu a confirmat înscrierea. Verifică starea serverului și reîncearcă.');socket.close();}},20000);
  socket.onopen=()=>{if(active)socket.send(JSON.stringify({type:'lobby_register',name,invitation}));};
  socket.onmessage=event=>{
    if(!active)return;
    let msg:any;try{msg=JSON.parse(event.data);}catch{return;}
    if(!msg||typeof msg!=='object')return;
    if(msg.type==='lobby_pending'){clearTimeout(deadline);updateLobbyState({phase:'pending'});report('Cod primit. Cererea așteaptă aprobarea organizatorului în Caster.');}
    if(!accepted&&msg.type==='lobby_approved'&&typeof msg.invitation==='string'&&/^[A-Za-z0-9_-]{43}$/.test(msg.invitation)){
      clearTimeout(deadline);
      if(!saveVoiceInvitation(msg.invitation)){fail('Înscrierea nu poate fi păstrată în această sesiune.');return;}
      try{sessionStorage.setItem('riftvoice.lobby-name',name);sessionStorage.setItem('riftvoice.lobby-reservation',msg.invitation);}
      catch{fail('Rezervarea nu poate fi păstrată în această sesiune.');return;}
      accepted=true;
      if(msg.invitation!==invitation)approved();
    }
    if(accepted&&msg.type==='lobby_state'&&typeof msg.name==='string'&&msg.name.length<=64&&['ORDER','CHAOS'].includes(msg.team)&&typeof msg.muted==='boolean'&&typeof msg.started==='boolean'){
      updateLobbyState({phase:'approved',name:msg.name,team:msg.team,muted:msg.muted,started:msg.started,voiceAvailable:msg.lobbyVoiceAvailable===true});
      report('Aprobat: '+msg.name+' · '+(msg.team==='ORDER'?'Albastru':'Roșu')+(msg.muted?' · Acces vocal oprit de moderare':msg.started?' · Meciul a început; se pregătește conexiunea de joc.':msg.lobbyVoiceAvailable===true?' · Poți activa vocea în lobby.':' · Serverul necesită actualizare pentru voce în lobby.'));
    }
    if(msg.type==='error')fail(typeof msg.message==='string'?msg.message.slice(0,500):'Înscriere indisponibilă.');
  };
  socket.onerror=()=>{if(active)fail('Înscrierea nu se poate conecta la server. Verifică serverul și reîncearcă.');};
  socket.onclose=event=>{
    clearTimeout(deadline);if(!active)return;
    updateLobbyState({phase:lastFailure?'error':'closed',media:'off',peers:[]});
    if(!lastFailure)report(event.code===4003?'Înscriere închisă de organizator. Cere o nouă aprobare.':'Înscriere deconectată. Reconectează folosind butonul de înscriere.');
  };
  return()=>{active=false;clearTimeout(deadline);socket.close();};
}
