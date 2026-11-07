import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';
import {sendJson} from './send.js';
import { promisify } from 'node:util';
import type { WebSocket } from 'ws';
import type { SessionRegistry } from './access.js';
import { TokenBucket } from './rate-limit.js';
import type { OrganizerEvents, StaffIdentity } from './organizer-events.js';
const derive=promisify(scrypt);
export class OrganizerPassword {
  private readonly salt=randomBytes(16);
  private readonly hash:Buffer;
  private concurrent=0;
  constructor(password:string){if(password.length<12||Buffer.byteLength(password)>512)throw Error('ORGANIZER_PASSWORD must contain at least 12 characters and at most 512 bytes');this.hash=scryptSync(password,this.salt,32);}
  async verify(value:unknown):Promise<boolean>{
    if(typeof value!=='string'||!value||Buffer.byteLength(value)>512||this.concurrent>=2)return false;
    this.concurrent++;try{return timingSafeEqual(this.hash,await derive(value,this.salt,32) as Buffer);}finally{this.concurrent--;}
  }
}
export interface ModeratorAccount { identity: StaffIdentity; password: OrganizerPassword }
export function moderatorAccounts(raw: string | undefined, administratorPassword: string, sharedPassword?: string): ModeratorAccount[] {
  let parsed: unknown; try { parsed = JSON.parse(raw || '[]'); } catch { throw Error('Invalid MODERATOR_ACCOUNTS_JSON'); }
  if (!Array.isArray(parsed) || parsed.length > 20) throw Error('At most 20 named moderator accounts are supported');
  const names = new Set<string>(), passwords = new Set([administratorPassword]);
  const accounts: ModeratorAccount[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry.name !== 'string' || !/^[A-Za-z0-9_.-]{3,32}$/.test(entry.name) || ['administrator','admin'].includes(entry.name.toLowerCase()) ||
        names.has(entry.name.toLowerCase()) || typeof entry.password !== 'string' || passwords.has(entry.password)) throw Error('Invalid or duplicated moderator account');
    names.add(entry.name.toLowerCase()); passwords.add(entry.password);
    accounts.push({ identity: { id: 'moderator:' + entry.name.toLowerCase(), name: entry.name, role: 'moderator' }, password: new OrganizerPassword(entry.password) });
  }
  if (sharedPassword) {
    if (passwords.has(sharedPassword)) throw Error('Administrator and moderator passwords must differ');
    accounts.push({ identity: { id: 'moderator:default', name: 'Moderator principal', role: 'moderator' }, password: new OrganizerPassword(sharedPassword) });
  }
  return accounts;
}
export class OrganizerController {
  private readonly attempts=new TokenBucket({capacity:5,refillPerSec:1/60});
  private readonly globalAttempts=new TokenBucket({capacity:20,refillPerSec:1});
  constructor(private password:OrganizerPassword,private events:OrganizerEvents,private sessions:SessionRegistry,private moderators:ModeratorAccount[] = []){}
  handle(ws:WebSocket,ip:string):void{
    let authenticated=false,expiresAt=0,failures=0,queued=0;
    let actor: StaffIdentity | undefined;
    let expiry:ReturnType<typeof setTimeout>|undefined;
    const messages=new TokenBucket({capacity:12,refillPerSec:1});let queue=Promise.resolve();
    const send=(msg:unknown)=>{sendJson(ws,msg);};
    ws.on('message',raw=>{
      if(queued>=8){ws.close(1008,'Organizer queue limit');return;}queued++;
      queue=queue.then(async()=>{
        if(ws.readyState!==ws.OPEN)return;
        if(!messages.tryConsume('control')){ws.close(1008,'Organizer rate limit');return;}
        let msg:any;try{msg=JSON.parse(raw.toString());}catch{throw Error('Mesaj invalid.');}
        if(!msg||typeof msg!=='object'||Array.isArray(msg))throw Error('Mesaj invalid.');
        if(!authenticated){
          if(msg.type!=='organizer_auth')throw Error('Autentificarea de administrator este necesară.');
          this.attempts.pruneIdle(30*60000);
          if(!this.attempts.tryConsume(ip)||!this.globalAttempts.tryConsume('all')){ws.close(1008,'Prea multe încercări. Așteaptă și reîncearcă.');return;}
          const login = typeof msg.account === 'string' ? msg.account.trim().toLowerCase() : '';
          if (!login && await this.password.verify(msg.password)) actor = { id:'administrator',name:'Administrator',role:'organizer' };
          else {
            const account = this.moderators.find(m => login ? m.identity.id === 'moderator:' + login : m.identity.id === 'moderator:default');
            if (account && await account.password.verify(msg.password)) actor = account.identity;
          }
          if(!actor){
            send({type:'organizer_error',message:'Parolă incorectă sau autentificare indisponibilă.'});if(++failures>=3)ws.close(1008,'Authentication failed');return;
          }
          if(ws.readyState!==ws.OPEN)return;
          authenticated=true;expiresAt=Date.now()+3600000;
          this.sessions.create({token:'',room:'organizer-console',name:actor.name,role:actor.role,expiresAt},ws);
          send({type:'organizer_ready',role:actor.role,name:actor.name,expiresAt});this.events.observe(ws,actor);
          expiry=setTimeout(()=>{this.sessions.revoke(ws);ws.close(1008,'Organizer session expired');},3600000);expiry.unref();return;
        }
        if(expiresAt<=Date.now()||!this.sessions.has(ws)){ws.close(1008,'Organizer session expired');return;}
        switch(msg.type){
          case 'event_create':this.events.create(msg.title,msg.casterName,msg.hours,msg.lobbyLink);break;
          case 'event_lobby_link':this.events.setLobbyLink(msg.eventId,msg.lobbyLink);break;
          case 'event_approve':this.events.approve(msg.requestId,msg.team);break;
          case 'event_reject':this.events.reject(msg.requestId);break;
          case 'event_remove':this.events.remove(msg.eventId,msg.name);break;
          case 'event_rotate':this.events.rotate(msg.eventId);break;
          case 'event_close':this.events.closeEvent(msg.eventId);break;
          case 'event_move':this.events.move(msg.eventId,msg.name,msg.team);break;
          case 'event_swap':this.events.swap(msg.eventId,msg.first,msg.second);break;
          case 'event_moderate':this.events.moderate(actor!,msg.eventId,msg.kind,msg.targetId,msg.muted);break;
          case 'event_caster':send({type:'organizer_caster_invitation',invitation:this.events.casterInvitation(msg.eventId,actor!)});break;
          case 'caster_approve':this.events.approveCaster(msg.requestId,msg.role);break;
          case 'caster_reject':this.events.rejectCaster(msg.requestId);break;
          case 'caster_rotate':this.events.rotateCaster(msg.eventId);break;
          case 'caster_remove':this.events.removeCaster(msg.eventId,msg.guestId);break;
          case 'event_refresh':send(this.events.snapshot(actor));break;
          default:throw Error('Comandă de organizator nepermisă.');
        }
      }).catch(error=>send({type:'organizer_error',message:error instanceof Error?error.message:'Operația nu a reușit.'})).finally(()=>{queued--;});
    });
    ws.once('close',()=>{clearTimeout(expiry);this.sessions.revoke(ws);});
  }
}
