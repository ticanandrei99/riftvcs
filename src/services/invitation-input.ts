import { voiceInvitationError } from './voice-access';
import { validateServerAddress } from '../core/server-address';
export function parseInvitationInput(value:string):{token:string;server?:string;error?:never}|{error:string;token?:never;server?:never}{
  const input=value.trim();if(input.length>4096)return {error:'Invitația este prea lungă.'};
  if(/^[A-Za-z0-9_-]{32,256}$/.test(input))return {token:input};
  // Previously issued RiftVoice invitations remain valid after the rebrand.
  const matches=[...input.matchAll(/\bCod vocal(?: (?:Voxdria|RiftVoice))?\s*:\s*([A-Za-z0-9_-]{32,256})(?=\s|$)/gi)];
  if(matches.length===1){
    const serverMatch=/\bServer(?: vocal)?\s*:\s*(\S+)/i.exec(input);
    const server=serverMatch?validateServerAddress(serverMatch[1]):undefined;
    if(serverMatch&&!server)return {error:'Adresa serverului din invitație nu este validă.'};
    return {token:matches[0][1],...(server?{server}:{})};
  }
  return {error:voiceInvitationError(input)||'Copiază un singur cod vocal Voxdria.'};
}
