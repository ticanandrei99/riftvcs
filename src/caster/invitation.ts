import { validateServerAddress } from '../core/server-address';

export type CasterRole='caster'|'spectator';
export type ParsedCasterInvitation={kind:'request';code:string}|{kind:'personal';token:string}|{error:string};
export function parseCasterInvitation(value:string,server:string):ParsedCasterInvitation{
  const input=value.trim();if(!input||input.length>4096)return {error:'Lipește linkul de comentatori sau invitația personală aprobată.'};
  if(/^VC-[A-Za-z0-9_-]{43}$/.test(input))return {kind:'request',code:input};
  if(/^RV-[A-Za-z0-9_-]{43}$/.test(input))return {error:'Acesta este codul jucătorilor. Cere linkul separat pentru comentatori.'};
  if(/^[A-Za-z0-9_-]{32,256}$/.test(input))return {kind:'personal',token:input};
  try{
    const url=new URL(input),origin=validateServerAddress(url.origin),expected=validateServerAddress(server);
    if(url.username||url.password||!origin||origin!==expected||url.pathname!=='/caster-invite'||url.search||!/^#VC-[A-Za-z0-9_-]{43}$/.test(url.hash))return {error:'Linkul de comentatori nu corespunde serverului configurat sau are un format invalid.'};
    return {kind:'request',code:url.hash.slice(1)};
  }catch{return {error:'Invitație de comentator invalidă. Copiază linkul complet primit de la organizator.'};}
}
export interface ApprovedCaster {invitation:string;name:string;role:CasterRole;expiresAt:number}
export function validApprovedCaster(value:unknown):value is ApprovedCaster{
  const grant=value as ApprovedCaster;return !!grant&&typeof grant.invitation==='string'&&/^[A-Za-z0-9_-]{43}$/.test(grant.invitation)&&typeof grant.name==='string'&&grant.name.trim().length>0&&grant.name.length<=64&&!/[\x00-\x1f\x7f-\x9f]/.test(grant.name)&&['caster','spectator'].includes(grant.role)&&Number.isSafeInteger(grant.expiresAt)&&grant.expiresAt>Date.now();
}
const storageKey='voxdria.caster-approved.v1';
export function savedCaster(server:string):ApprovedCaster|null{
  try{const value=JSON.parse(sessionStorage.getItem(storageKey)||'null');return value?.server===server&&validApprovedCaster(value)?value:null;}catch{return null;}
}
export function saveCaster(server:string,grant:ApprovedCaster):void{
  if(!validApprovedCaster(grant))return;
  try{sessionStorage.setItem(storageKey,JSON.stringify({invitation:grant.invitation,name:grant.name,role:grant.role,expiresAt:grant.expiresAt,server}));}catch{/* In-memory reconnection still works. */}
}
export function forgetCaster():void{try{sessionStorage.removeItem(storageKey);}catch{}}
