import {describe,it,expect,afterEach,vi} from 'vitest';
import {EventEmitter} from 'node:events';
import {mkdtempSync,readFileSync,unlinkSync,rmdirSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {OrganizerEvents} from '../src/organizer-events.js';
import {OrganizerPassword,moderatorAccounts} from '../src/organizer.js';
import {authorizeGrant,SessionRegistry,type VoiceGrant} from '../src/access.js';
import {RoomManager} from '../src/rooms.js';
class Socket extends EventEmitter{
  OPEN=1;readyState=1;sent:any[]=[];closeCode=0;
  send(raw:string){this.sent.push(JSON.parse(raw));}
  close(code:number){this.closeCode=code;this.readyState=3;this.emit('close');}
}
const managers:OrganizerEvents[]=[];
function setup(store?:string){const players:VoiceGrant[]=[],casters:VoiceGrant[]=[],sessions=new SessionRegistry(),rooms=new RoomManager(true);const events=new OrganizerEvents(players,casters,sessions,rooms,store);managers.push(events);return {players,casters,sessions,rooms,events};}
const snapshot=(events:OrganizerEvents)=>(events.snapshot() as any).events;
function request(h:ReturnType<typeof setup>,event:any,name:string,team='ORDER',room='custom-game'){
  const ws=new Socket();ws.once('close',()=>h.rooms.leave(ws as any));
  h.events.requestJoin(ws as any,{room,name,team,invitation:event.invite,eventInviteProtocol:1});
  const state=snapshot(h.events).find((e:any)=>e.id===event.id);
  const pending=state.pending.find((p:any)=>p.name===name);return {ws,pending};
}
afterEach(()=>{for(const manager of managers.splice(0))manager.stop();});
describe('organizer event admission',()=>{
  it('generates a real shared code but no player grant before approval',()=>{
    const h=setup();h.events.create('Custom','Comentator',8);const event=snapshot(h.events)[0];
    expect(event.invite).toMatch(/^RV-[A-Za-z0-9_-]{43}$/);expect(h.players).toHaveLength(0);expect(h.casters[0].role).toBe('caster');
    const {ws}=request(h,event,'Player1');expect(ws.sent[0].type).toBe('join_pending');
    expect(h.sessions.has(ws as any)).toBe(true);expect(h.rooms.getClientInfo(ws as any)).toBeUndefined();
    expect(authorizeGrant(h.players,event.invite)).toBeUndefined();
  });
  it('approval creates a personal player token and binds the first actual match',()=>{
    const h=setup();h.events.create('Custom','Caster',8);const event=snapshot(h.events)[0];const {ws,pending}=request(h,event,'Player1','CHAOS');
    expect(()=>h.events.approve(pending.id,'ORDER')).toThrow('Echipa detectată');
    h.events.approve(pending.id,'CHAOS');const token=ws.sent.find(m=>m.type==='join_approved').invitation;
    const grant=authorizeGrant(h.players,token)!;expect(grant).toMatchObject({role:'player',name:'Player1',room:'custom-game',team:'CHAOS'});
    expect(token).not.toBe(event.invite);expect(h.rooms.roomCount).toBe(0);
    h.rooms.join(grant.room,grant.name,ws as any,grant.team);h.sessions.create(grant,ws as any);
    expect(snapshot(h.events)[0].players[0].connected).toBe(true);
    h.events.remove(event.id,'Player1');expect(ws.closeCode).toBe(4003);expect(authorizeGrant(h.players,token)).toBeUndefined();
  });
  it('enforces ten approvals and five per team without consuming slots for rejected requests',()=>{
    const h=setup();h.events.create('Custom','Caster',8);const event=snapshot(h.events)[0];
    for(let i=0;i<10;i++){const team=i<5?'ORDER':'CHAOS';const {pending}=request(h,event,'Player'+i,team);h.events.approve(pending.id,team);}
    const extra=request(h,event,'Extra');expect(extra.ws.sent[0].type).toBe('error');expect(h.players).toHaveLength(10);
    h.events.remove(event.id,'Player0');const accepted=request(h,event,'Extra');expect(()=>h.events.approve(accepted.pending.id,'CHAOS')).toThrow('5');
    h.events.approve(accepted.pending.id,'ORDER');expect(h.players).toHaveLength(10);
  });
  it('rejects wrong matches, duplicated names and a second event bound to the same match',()=>{
    const h=setup();h.events.create('One','Caster1',8);h.events.create('Two','Caster2',8);const [one,two]=snapshot(h.events);
    const first=request(h,one,'Player1');const duplicated=request(h,one,'Player1');expect(duplicated.ws.sent[0].type).toBe('error');
    h.events.approve(first.pending.id,'ORDER');
    const wrong=request(h,one,'Player2','CHAOS','another-game');expect(wrong.ws.sent[0].type).toBe('error');
    const second=request(h,two,'Player2','CHAOS');expect(()=>h.events.approve(second.pending.id,'CHAOS')).toThrow('altă cameră');
    expect(h.players).toHaveLength(1);
  });
  it('reject and rotation cancel pending access; closing revokes player and caster grants',()=>{
    const h=setup();h.events.create('Custom','Caster',8);const event=snapshot(h.events)[0];
    const a=request(h,event,'Player1');h.events.reject(a.pending.id);expect(a.ws.closeCode).toBe(4003);expect(h.sessions.has(a.ws as any)).toBe(false);
    const b=request(h,event,'Player2');h.events.rotate(event.id);expect(b.ws.closeCode).toBe(4003);expect(snapshot(h.events)[0].invite).not.toBe(event.invite);
    const old=request(h,event,'Player3');expect(old.ws.sent[0].type).toBe('error');
    const c=request(h,snapshot(h.events)[0],'Player3');h.events.approve(c.pending.id,'ORDER');
    h.events.closeEvent(event.id);expect(h.players).toEqual([]);expect(h.casters).toEqual([]);expect(snapshot(h.events)).toEqual([]);
  });
  it('does not allow a connected player to replace their session with pending access',()=>{
    const h=setup();h.events.create('Custom','Caster',8);const event=snapshot(h.events)[0];const ws=new Socket();
    h.rooms.join('custom-game','Existing',ws as any,'ORDER');
    h.events.requestJoin(ws as any,{room:'custom-game',name:'Different',team:'CHAOS',invitation:event.invite,eventInviteProtocol:1});
    expect(ws.sent[0].type).toBe('error');expect(snapshot(h.events)[0].pending).toHaveLength(0);
  });
  it('protects managed matches from static grants and never exposes player personal tokens in snapshots',()=>{
    const h=setup();h.events.create('Custom','Caster',8);const event=snapshot(h.events)[0];const {pending}=request(h,event,'Player1');h.events.approve(pending.id,'ORDER');
    expect(h.events.permitsGrant('custom-game',{...h.players[0],token:'x'.repeat(43)})).toBe(false);
    expect(h.events.permitsGrant('custom-game',h.players[0])).toBe(true);
    expect(JSON.stringify(h.events.snapshot())).not.toContain(h.players[0].token);
  });
  it('persists approved grants and codes to an explicit private store',()=>{
    const directory=mkdtempSync(join(tmpdir(),'riftvoice-organizer-')),file=join(directory,'events.private.json');
    try{
      const h=setup(file);h.events.create('Persistent','Caster',8);const event=snapshot(h.events)[0];const {pending}=request(h,event,'Player1','CHAOS');h.events.approve(pending.id,'CHAOS');
      const restored=setup(file);expect(snapshot(restored.events)[0].invite).toBe(event.invite);expect(restored.players[0]).toEqual(h.players[0]);
      expect((restored.events.snapshot() as any).persistent).toBe(true);expect(readFileSync(file,'utf8')).not.toContain('organizer_auth');
    }finally{if(existsSync(file))unlinkSync(file);rmdirSync(directory);}
  });
  it('requires bounded event input and a private store filename',()=>{
    const h=setup();expect(()=>h.events.create('','Caster',8)).toThrow();expect(()=>h.events.create('Custom','Caster',25)).toThrow();
    expect(()=>setup('public.json')).toThrow('private.json');
  });
});
const administrator={id:'administrator',name:'Administrator',role:'organizer' as const};
const moderator={id:'moderator:dani',name:'Dani',role:'moderator' as const};
function lobby(h:ReturnType<typeof setup>,event:any,name:string,team='ORDER'){
  const ws=new Socket();h.events.registerLobby(ws as any,{name,invitation:event.invite});
  const p=snapshot(h.events).find((e:any)=>e.id===event.id).pending.find((p:any)=>p.name===name);
  h.events.approve(p.id,team);return {ws,token:ws.sent.find(m=>m.type==='lobby_approved').invitation};
}
describe('pregame roster and moderation authority',()=>{
  it('expires the event, reservations and personal staff access without leaving active grants',()=>{
    vi.useFakeTimers();
    try{
      const h=setup();h.events.create('Expiring','Caster',1);const e=snapshot(h.events)[0],registered=lobby(h,e,'Player#EUNE');
      const adminToken=h.events.casterInvitation(e.id,administrator),staff=new Socket();h.sessions.create(h.casters.find(g=>g.token===adminToken)!,staff as any);
      vi.advanceTimersByTime(3600001);
      expect(snapshot(h.events)).toHaveLength(0);expect(h.casters).toHaveLength(0);expect(h.players).toHaveLength(0);
      expect(registered.ws.closeCode).toBe(4003);expect(staff.closeCode).toBe(4003);expect(h.sessions.has(staff as any)).toBe(false);
      expect(()=>h.events.registerLobby(new Socket() as any,{name:'Player#EUNE',invitation:registered.token})).toThrow('expirat');
    }finally{vi.useRealTimers();}
  });
  it('registers a claimed name without media, moves and swaps slots, and locks teams when the real match binds',()=>{
    const h=setup();h.events.create('Custom','Caster',8);const e=snapshot(h.events)[0];
    const a=lobby(h,e,'Alice#EUNE'),b=lobby(h,e,'Bob#EUNE','CHAOS');
    expect(h.players).toHaveLength(0);expect(h.rooms.roomCount).toBe(0);expect(authorizeGrant(h.players,a.token)).toBeUndefined();
    h.events.move(e.id,'Alice#EUNE','CHAOS');expect(snapshot(h.events)[0].players[0].team).toBe('CHAOS');
    h.events.move(e.id,'Alice#EUNE','ORDER');h.events.swap(e.id,'Alice#EUNE','Bob#EUNE');
    expect(snapshot(h.events)[0].players.map((p:any)=>p.team)).toEqual(['CHAOS','ORDER']);
    const wrong=new Socket();h.events.requestJoin(wrong as any,{room:'game',name:'Alice#EUNE',team:'ORDER',invitation:a.token,eventInviteProtocol:1});expect(wrong.sent[0].type).toBe('error');
    const game=new Socket();h.events.requestJoin(game as any,{room:'game',name:'alice#eune',team:'CHAOS',invitation:a.token,eventInviteProtocol:1});
    expect(game.sent.map(m=>m.type)).toEqual(['join_pending','join_approved']);expect(h.players[0].name).toBe('alice#eune');
    const grant=h.players[0];h.sessions.create(grant,game as any);h.rooms.join('game',grant.name,game as any,'CHAOS');
    expect(snapshot(h.events)[0].players[0].connected).toBe(true);
    expect(()=>h.events.move(e.id,'Bob#EUNE','CHAOS')).toThrow('blocate');expect(()=>h.events.swap(e.id,'Alice#EUNE','Bob#EUNE')).toThrow('blocate');
    h.events.moderate(moderator,e.id,'player','Alice#EUNE',true);expect(game.closeCode).toBe(4003);expect(authorizeGrant(h.players,grant.token)).toBeUndefined();
    const retry=new Socket();h.events.requestJoin(retry as any,{room:'game',name:'alice#eune',team:'CHAOS',invitation:a.token,eventInviteProtocol:1});expect(retry.sent[0].message).toContain('moderare');
    expect(b.ws.sent.some(m=>m.type==='lobby_state'&&m.team==='ORDER')).toBe(true);
  });
  it('supports a full 5+5 lineup and safe swaps while refusing an eleventh player',()=>{
    const h=setup();h.events.create('Custom','Caster',8);const e=snapshot(h.events)[0];
    for(let i=0;i<10;i++)lobby(h,e,'Player'+i,i<5?'ORDER':'CHAOS');
    expect(()=>h.events.registerLobby(new Socket() as any,{name:'Extra',invitation:e.invite})).toThrow('10');
    expect(()=>h.events.move(e.id,'Player0','CHAOS')).toThrow('5');h.events.swap(e.id,'Player0','Player5');
    expect(snapshot(h.events)[0].players.filter((p:any)=>p.team==='ORDER')).toHaveLength(5);
    expect(()=>h.events.registerLobby(new Socket() as any,{name:'player0',invitation:e.invite})).toThrow('înscris');
  });
  it('uses server-issued staff identities and refuses moderator mute and unmute against the administrator',()=>{
    const h=setup();h.events.create('Custom','Caster',8);const e=snapshot(h.events)[0];
    const adminToken=h.events.casterInvitation(e.id,administrator),modToken=h.events.casterInvitation(e.id,moderator);
    expect(adminToken).not.toBe(modToken);expect(JSON.stringify(h.events.snapshot(moderator))).not.toContain(adminToken);
    const ws=new Socket(),admin=h.casters.find(g=>g.token===adminToken)!;h.sessions.create(admin,ws as any);
    expect(()=>h.events.moderate(moderator,e.id,'staff',administrator.id,true)).toThrow('administratorului');
    expect(()=>h.events.moderate(moderator,e.id,'staff',administrator.id,false)).toThrow('administratorului');
    expect(ws.closeCode).toBe(0);expect(h.sessions.has(ws as any)).toBe(true);
    const audit=(h.events.snapshot(administrator) as any).audit;expect(audit).toHaveLength(2);expect(audit[0]).toMatchObject({actorName:'Dani',actorId:'moderator:dani',targetRole:'organizer',action:'mute_denied'});
    expect((h.events.snapshot(moderator) as any).audit).toBeUndefined();
  });
  it('revokes voice on moderator mute, prevents reminting a muted staff credential and records reactivation',()=>{
    const h=setup();h.events.create('Custom','Caster',8);const e=snapshot(h.events)[0];const modToken=h.events.casterInvitation(e.id,moderator);
    const ws=new Socket(),grant=h.casters.find(g=>g.token===modToken)!;h.sessions.create(grant,ws as any);
    h.events.moderate(administrator,e.id,'staff',moderator.id,true);expect(ws.closeCode).toBe(4003);expect(authorizeGrant(h.casters,modToken)).toBeUndefined();
    expect(()=>h.events.casterInvitation(e.id,moderator)).toThrow('moderare');
    h.events.moderate(administrator,e.id,'staff',moderator.id,false);expect(h.events.casterInvitation(e.id,moderator)).toBe(modToken);
    expect((h.events.snapshot(administrator) as any).audit.map((a:any)=>a.action)).toEqual(['unmute','mute']);
  });
  it('persists named audit entries and mute state even after the event is closed',()=>{
    const directory=mkdtempSync(join(tmpdir(),'riftvoice-audit-')),file=join(directory,'events.private.json');
    try{
      const h=setup(file);h.events.create('Custom','Caster',8);const e=snapshot(h.events)[0];lobby(h,e,'Player#EUNE');
      h.events.moderate(moderator,e.id,'player','Player#EUNE',true);
      const restored=setup(file);expect(snapshot(restored.events)[0].players[0].muted).toBe(true);
      h.events.closeEvent(e.id);const closed=setup(file);expect((closed.events.snapshot(administrator) as any).audit[0]).toMatchObject({actorName:'Dani',targetName:'Player#EUNE',action:'mute'});
    }finally{if(existsSync(file))unlinkSync(file);rmdirSync(directory);}
  });
});
describe('organizer password verification',()=>{
  it('uses a server-side salted password verifier and refuses short or wrong passwords',async()=>{
    expect(()=>new OrganizerPassword('short')).toThrow();const password=new OrganizerPassword('unit-test-password-only');
    expect(await password.verify('wrong')).toBe(false);expect(await password.verify('unit-test-password-only')).toBe(true);
    expect(await password.verify({password:'unit-test-password-only'})).toBe(false);
  });
  it('requires distinct named moderator credentials and does not accept forged administrator account names',()=>{
    const admin='unit-test-admin-password';
    expect(()=>moderatorAccounts(JSON.stringify([{name:'Dani',password:admin}]),admin)).toThrow();
    expect(()=>moderatorAccounts(JSON.stringify([{name:'Administrator',password:'unit-test-other-password'}]),admin)).toThrow();
    const accounts=moderatorAccounts(JSON.stringify([{name:'Dani',password:'unit-test-dani-password'}]),admin);
    expect(accounts[0].identity).toEqual({id:'moderator:dani',name:'Dani',role:'moderator'});
  });
});
