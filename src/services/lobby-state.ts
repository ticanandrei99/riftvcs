export interface LobbyState {
  phase:'idle'|'connecting'|'pending'|'approved'|'error'|'closed';
  name:string;team:'ORDER'|'CHAOS'|null;muted:boolean;started:boolean;voiceAvailable:boolean;message:string;
  media:'off'|'connecting'|'ready'|'blocked'|'error';peers:string[];
}
const key=Symbol.for('riftvoice.lobby-state');
const host=globalThis as typeof globalThis&{[key:symbol]:{value:LobbyState}};
const initial=():LobbyState=>({phase:'idle',name:'',team:null,muted:false,started:false,voiceAvailable:false,message:'',media:'off',peers:[]});
if(!host[key])Object.defineProperty(host,key,{value:{value:initial()},enumerable:false});
export function lobbyState():LobbyState{return {...host[key].value,peers:[...host[key].value.peers]};}
export function updateLobbyState(update:Partial<LobbyState>):void{
  host[key].value={...host[key].value,...update};
  if(typeof window!=='undefined'&&typeof Event!=='undefined')window.dispatchEvent(new Event('riftvoice:lobby-state'));
}
export function resetLobbyState():void{host[key].value=initial();updateLobbyState({});}
export function lobbyReservation():string{try{return sessionStorage.getItem('riftvoice.lobby-reservation')||'';}catch{return '';}}
