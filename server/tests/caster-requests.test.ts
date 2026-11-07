import {describe,it,expect,afterEach,vi} from 'vitest';
import {EventEmitter} from 'node:events';
import {mkdtempSync,readFileSync,writeFileSync,unlinkSync,rmdirSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {OrganizerEvents} from '../src/organizer-events.js';
import {SessionRegistry,authorizeGrant,type VoiceGrant} from '../src/access.js';
import {RoomManager} from '../src/rooms.js';
class Socket extends EventEmitter{OPEN=1;readyState=1;sent:any[]=[];code=0;send(raw:string){this.sent.push(JSON.parse(raw));}close(code:number){this.code=code;this.readyState=3;this.emit('close');}}
const managers:OrganizerEvents[]=[],directories:string[]=[];
function setup(store?:string){const players:VoiceGrant[]=[],casters:VoiceGrant[]=[],sessions=new SessionRegistry(),rooms=new RoomManager(true);const events=new OrganizerEvents(players,casters,sessions,rooms,store);managers.push(events);return {events,players,casters,sessions};}
const view=(events:OrganizerEvents)=>(events.snapshot() as any).events[0];
function request(h:ReturnType<typeof setup>,name='Guest',role='caster',invitation=view(h.events).casterInvite){const ws=new Socket();h.events.registerCaster(ws as any,{name,requestedRole:role,invitation});return {ws,id:view(h.events).casterPending.find((p:any)=>p.name===name).id};}
const admin={id:'administrator',name:'Administrator',role:'organizer' as const};
afterEach(()=>{for(const manager of managers.splice(0))manager.stop();for(const directory of directories.splice(0)){const file=join(directory,'state.private.json');if(existsSync(file))unlinkSync(file);rmdirSync(directory);}vi.useRealTimers();});
describe('commentator requests require separate invitations and approval',()=>{
  it('keeps the public link outside audio grants and creates a private grant only for the approved requester',()=>{
    const h=setup();h.events.create('Custom','LegacyCaster',8);const e=view(h.events);
    expect(e.casterInvite).toMatch(/^VC-[A-Za-z0-9_-]{43}$/);expect(e.casterInvite).not.toBe(e.invite);
    expect(authorizeGrant(h.casters,e.casterInvite)).toBeUndefined();
    const r=request(h);expect(r.ws.sent.map(m=>m.type)).toEqual(['caster_pending']);expect(h.casters).toHaveLength(1);expect(h.sessions.has(r.ws as any)).toBe(true);
    expect(view(h.events).players).toHaveLength(0);h.events.approveCaster(r.id,'caster');
    const approved=r.ws.sent.find(m=>m.type==='caster_approved');expect(approved.invitation).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(authorizeGrant(h.casters,approved.invitation)).toMatchObject({room:e.id,name:'Guest',role:'caster'});
    expect(h.casters.at(-1)?.authority).toBeUndefined();expect(h.casters.at(-1)?.subjectId).toBeUndefined();
    expect(JSON.stringify(h.events.snapshot(admin))).not.toContain(approved.invitation);expect(r.ws.code).toBe(1000);expect(h.sessions.has(r.ws as any)).toBe(false);
  });
  it('refuses player invitations, forged roles, reserved names and repeated connections',()=>{
    const h=setup();h.events.create('Custom','Legacy',8);
    expect(()=>request(h,'Guest','caster',view(h.events).invite)).toThrow('Invitație');
    for(const role of ['organizer','moderator','player'])expect(()=>request(h,'Guest',role)).toThrow('Alege');
    for(const name of ['Administrator','Ａｄｍｉｎｉｓｔｒａｔｏｒ','Moderator · Dani','x\nY'])expect(()=>request(h,name)).toThrow('nume');
    const r=request(h);expect(()=>h.events.registerLobby(r.ws as any,{name:'Player#EU',invitation:view(h.events).invite})).toThrow('Există');
    expect(()=>request(h)).toThrow('Există');
  });
  it('allows a caster request to be approved receive-only but never escalates a spectator request to microphone or staff',()=>{
    const h=setup();h.events.create('Custom','Legacy',8);const a=request(h,'Commentary');
    for(const role of ['player','organizer','moderator'])expect(()=>h.events.approveCaster(a.id,role)).toThrow('numai');
    h.events.approveCaster(a.id,'spectator');expect(h.casters.at(-1)?.role).toBe('spectator');
    const b=request(h,'Listener','spectator');expect(()=>h.events.approveCaster(b.id,'caster')).toThrow('doar ascultare');
    h.events.approveCaster(b.id,'spectator');expect(h.casters.at(-1)?.role).toBe('spectator');
  });
  it('cancellation, denial, rotation and expiry remove pending authority without issuing audio tokens',()=>{
    vi.useFakeTimers();const h=setup();h.events.create('Custom','Legacy',1);
    const cancelled=request(h,'Cancelled');cancelled.ws.close(1000);expect(()=>h.events.approveCaster(cancelled.id,'caster')).toThrow('activă');
    const denied=request(h,'Denied');h.events.rejectCaster(denied.id);expect(denied.ws.code).toBe(4003);
    const old=view(h.events).casterInvite,rotated=request(h,'Rotated');h.events.rotateCaster(view(h.events).id);expect(rotated.ws.code).toBe(4003);expect(()=>request(h,'Old','caster',old)).toThrow('expirată');
    const expired=request(h,'Expired');vi.advanceTimersByTime(5*60000+1);expect(expired.ws.code).toBe(4003);expect(h.casters).toHaveLength(1);expect(view(h.events).casterPending).toEqual([]);
  });
  it('moderation revokes caster/spectator sessions and removal invalidates only the selected guest',()=>{
    const h=setup();h.events.create('Custom','Legacy',8);const r=request(h,'Guest','spectator');h.events.approveCaster(r.id,'spectator');
    const personal=r.ws.sent.find(m=>m.type==='caster_approved').invitation,grant=authorizeGrant(h.casters,personal)!;
    const audio=new Socket();h.sessions.create(grant,audio as any);const member=view(h.events).staff.find((p:any)=>p.kind==='guest');
    expect(member).toMatchObject({name:'Guest',role:'spectator',connected:true});
    h.events.moderate(admin,view(h.events).id,'guest',member.id,true);expect(audio.code).toBe(4003);expect(authorizeGrant(h.casters,personal)).toBeUndefined();
    h.events.moderate(admin,view(h.events).id,'guest',member.id,false);expect(authorizeGrant(h.casters,personal)).toBeDefined();
    h.events.removeCaster(view(h.events).id,member.id);expect(authorizeGrant(h.casters,personal)).toBeUndefined();expect(h.casters).toHaveLength(1);
  });
  it('keeps already-known players out of the commentator role and closes guests when an event ends',()=>{
    const h=setup();h.events.create('Custom','Legacy',8);const e=view(h.events),player=new Socket();h.events.registerLobby(player as any,{name:'Player#EU',invitation:e.invite});
    h.events.approve(view(h.events).pending[0].id,'ORDER');expect(()=>request(h,'player#eu')).toThrow('jucător');
    const r=request(h,'Caster');h.events.approveCaster(r.id,'caster');const privateToken=r.ws.sent.find(m=>m.type==='caster_approved').invitation;
    expect(()=>h.events.registerLobby(new Socket() as any,{name:'Caster',invitation:e.invite})).toThrow('comentatorilor');
    const audio=new Socket();h.sessions.create(authorizeGrant(h.casters,privateToken)!,audio as any);h.events.closeEvent(e.id);
    expect(audio.code).toBe(4003);expect(authorizeGrant(h.casters,privateToken)).toBeUndefined();expect(h.casters).toEqual([]);
  });
  it('persists private guest grants and migrates old store v2 once without persisting transient requests',()=>{
    const directory=mkdtempSync(join(tmpdir(),'voxdria-caster-'));directories.push(directory);const file=join(directory,'state.private.json');
    const h=setup(file);h.events.create('Custom','Legacy',8);const r=request(h);h.events.approveCaster(r.id,'spectator');const privateToken=r.ws.sent.find(m=>m.type==='caster_approved').invitation;
    const restored=setup(file);expect(authorizeGrant(restored.casters,privateToken)?.role).toBe('spectator');expect(view(restored.events).casterPending).toEqual([]);
    const legacy=JSON.parse(readFileSync(file,'utf8'));legacy.version=2;delete legacy.events[0].casterInvite;delete legacy.events[0].guests;writeFileSync(file,JSON.stringify(legacy));
    const migrated=setup(file),link=view(migrated.events).casterInvite;expect(JSON.parse(readFileSync(file,'utf8')).version).toBe(3);expect(view(setup(file).events).casterInvite).toBe(link);
  });
  it('rechecks player/caster exclusivity when two pending requests race for approval',()=>{
    const h=setup();h.events.create('Custom','Legacy',8);const player=new Socket();h.events.registerLobby(player as any,{name:'Same#EU',invitation:view(h.events).invite});
    const r=request(h,'Same#EU');h.events.approveCaster(r.id,'caster');expect(()=>h.events.approve(view(h.events).pending[0].id,'ORDER')).toThrow('comentatorilor');
    const other=new Socket();h.events.registerLobby(other as any,{name:'Second#EU',invitation:view(h.events).invite});const second=request(h,'Second#EU');
    h.events.approve(view(h.events).pending.find((p:any)=>p.name==='Second#EU').id,'ORDER');expect(()=>h.events.approveCaster(second.id,'caster')).toThrow('jucător');
  });
  it('bounds pending requests and approved channel members independently of the ten player slots',()=>{
    const h=setup();h.events.create('Custom','Legacy',8);
    for(let i=0;i<20;i++)request(h,'Pending'+i);expect(()=>request(h,'Overflow')).toThrow('Prea multe');
    for(const r of [...view(h.events).casterPending])h.events.rejectCaster(r.id);
    for(let i=0;i<24;i++){const r=request(h,'Approved'+i);h.events.approveCaster(r.id,'caster');}
    expect(()=>request(h,'Overflow')).toThrow('complet');expect(()=>h.events.casterInvitation(view(h.events).id,admin)).toThrow('Limita');expect(view(h.events).players).toHaveLength(0);
  });
  it('rejects malformed or privileged persisted guest grants before exposing any access',()=>{
    const directory=mkdtempSync(join(tmpdir(),'voxdria-caster-'));directories.push(directory);const file=join(directory,'state.private.json');
    const h=setup(file);h.events.create('Custom','Legacy',8);const r=request(h);h.events.approveCaster(r.id,'caster');const original=JSON.parse(readFileSync(file,'utf8'));
    for(const changes of [{authority:'organizer'},{subjectId:'administrator'},{name:42},{role:'player'},{guestId:'invalid'},{guestId:['a'.repeat(22)]}]){
      const altered=structuredClone(original);Object.assign(altered.events[0].guests[0],changes);writeFileSync(file,JSON.stringify(altered));expect(()=>setup(file)).toThrow(/Invalid/);
    }
  });
});
