import {invoke,isTauri} from '@tauri-apps/api/core';
type Kind='engine'|'admission'|'peer'|'volume';
type State='starting'|'stopped'|'joining'|'pending'|'ready'|'closed'|'failed'|'connected'|'microphone-ready'|'microphone-blocked'|'no-turn'|'http-failed';
let count=0;const last=new Map<string,number>();
/** Bounded local connection states only; never voice, names, positions or credentials. */
export function diagnose(kind:Kind,state:State):void{
  if(!isTauri()||count>=200)return;const key=kind+':'+state,now=Date.now();if(now-(last.get(key)||0)<1000)return;last.set(key,now);count++;
  void invoke('append_log_lines',{lines:[new Date(now).toISOString()+' [player-original] '+key]}).catch(()=>{});
}
