export function casterTransmitAllowed(role: string, muted: boolean, deafened: boolean, ptt: boolean, held: boolean): boolean {
  return role === 'caster' && !muted && !deafened && (!ptt || held);
}
export interface CasterPeer {name:string;role:'caster'|'spectator'}
export function validCasterPeer(value:unknown):value is CasterPeer{
  const peer=value as CasterPeer;
  return !!peer&&typeof peer.name==='string'&&peer.name.length>0&&peer.name.length<=64&&!/[\x00-\x1f\x7f]/.test(peer.name)&&['caster','spectator'].includes(peer.role);
}
export function validCasterReady(value:unknown):value is CasterPeer&{sessionToken:string;peers:CasterPeer[]}{
  const msg=value as CasterPeer&{sessionToken:string;peers:CasterPeer[]};
  return validCasterPeer(msg)&&typeof msg.sessionToken==='string'&&/^[A-Za-z0-9_-]{43}$/.test(msg.sessionToken)&&Array.isArray(msg.peers)&&msg.peers.length<=24&&msg.peers.every(peer=>validCasterPeer(peer)&&peer.name!==msg.name)&&new Set(msg.peers.map(peer=>peer.name)).size===msg.peers.length;
}
