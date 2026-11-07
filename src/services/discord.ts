import {invoke} from '@tauri-apps/api/core';
export type DiscordDestination='community'|'streamer';
export function openDiscord(destination:DiscordDestination):Promise<void>{
  // The native side chooses the URL and checks the app variant; no URL comes from the WebView.
  return Promise.resolve().then(()=>invoke<void>('open_discord_link',{destination}));
}
export function bindDiscordLinks(caster:boolean):void{
  const status=document.getElementById('discord-status');
  for(const destination of (caster?['community','streamer']:['community']) as DiscordDestination[]){
    const button=document.getElementById('discord-'+destination) as HTMLButtonElement|null;if(!button)continue;
    button.onclick=async()=>{
      button.disabled=true;if(status)status.textContent='Se deschide Discord…';
      try{await openDiscord(destination);if(status)status.textContent=destination==='streamer'?'Link trimis către Discord/browser. Canal privat: este necesar rolul Streamer sau accesul acordat de moderatori.':'Invitația comunității a fost trimisă către Discord/browser.';}
      catch{if(status)status.textContent='Linkul Discord nu s-a putut deschide. Încearcă din nou.';}
      finally{button.disabled=false;}
    };
  }
}
