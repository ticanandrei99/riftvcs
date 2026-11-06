import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { WebSocket } from 'ws';
import { loadGrants, type PlayerEventAccess, type SessionRegistry, type VoiceGrant } from './access.js';
import type { RoomManager } from './rooms.js';
import { validateJoin } from './validate.js';
import { normalizeLobbyLink } from './lobby-link.js';

const token = () => randomBytes(32).toString('base64url');
const send = (ws: WebSocket, msg: unknown) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg)); };
const key = (name: string) => name.trim().normalize('NFKC').toLowerCase();
type Team = 'ORDER' | 'CHAOS';
export interface StaffIdentity { id: string; name: string; role: 'organizer' | 'moderator' }
interface LobbySlot { id: string; token: string; name: string; team: Team; voiceMuted: boolean }
interface VoiceEvent {
  id: string; title: string; invite: string; expiresAt: number; gameRoom: string | null; lobbyLink: string;
  players: VoiceGrant[]; caster: VoiceGrant; staff: VoiceGrant[]; roster: LobbySlot[];
}
interface Pending {
  id: string; eventId: string; ws: WebSocket; name: string; room: string; mode: 'game' | 'lobby';
  requestedTeam: Team; expiresAt: number; timer: ReturnType<typeof setTimeout>;
}
interface AuditEntry {
  id: string; at: number; actorId: string; actorName: string; actorRole: StaffIdentity['role'];
  action: 'mute' | 'unmute' | 'mute_denied'; eventId: string; eventTitle: string;
  targetId: string; targetName: string; targetRole: string;
}
export class OrganizerEvents implements PlayerEventAccess {
  private events = new Map<string, VoiceEvent>();
  private pending = new Map<string, Pending>();
  private observers = new Map<WebSocket, StaffIdentity | undefined>();
  private registrations = new Map<WebSocket, { eventId: string; slotId: string }>();
  private audit: AuditEntry[] = [];
  private ownedPlayerTokens = new Set<string>();
  private ownedCasterTokens = new Set<string>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private notifying = false;
  private storePath: string | undefined;
  constructor(private players: VoiceGrant[], private casters: VoiceGrant[], private sessions: SessionRegistry, private rooms: RoomManager, storePath?: string) {
    if (storePath) {
      if (!storePath.endsWith('.private.json')) throw Error('ORGANIZER_STORE_PATH must end in .private.json');
      this.storePath = resolve(storePath);
      if (existsSync(this.storePath)) {
        const raw = readFileSync(this.storePath, 'utf8');
        if (Buffer.byteLength(raw) > 2 * 1024 * 1024) throw Error('Organizer store too large');
        let parsed: any; try { parsed = JSON.parse(raw); } catch { throw Error('Invalid organizer store'); }
        if (![1, 2].includes(parsed?.version) || !Array.isArray(parsed.events) || parsed.events.length > 12) throw Error('Invalid organizer store');
        const usedRooms = new Set<string>(), usedTokens = new Set<string>();
        for (const stored of parsed.events) {
          const event: VoiceEvent = { ...stored, staff: stored.staff ?? [], roster: stored.roster ?? [], lobbyLink: normalizeLobbyLink(stored.lobbyLink) };
          if (!event || typeof event.id !== 'string' || !/^event-[A-Za-z0-9_-]{16}$/.test(event.id) || typeof event.title !== 'string' || !event.title.trim() || event.title.length > 64 || /[\x00-\x1f\x7f]/.test(event.title) ||
              !/^RV-[A-Za-z0-9_-]{43}$/.test(event.invite) || !Number.isSafeInteger(event.expiresAt) || !Array.isArray(event.players) || event.players.length > 10 ||
              !Array.isArray(event.staff) || event.staff.length > 24 || !Array.isArray(event.roster) || event.roster.length > 10 || (event.gameRoom !== null && !validateJoin(event.gameRoom, 'test').ok)) throw Error('Invalid organizer event');
          loadGrants(JSON.stringify(event.players), ['player']); loadGrants(JSON.stringify([event.caster, ...event.staff]), ['caster']);
          if (event.caster.room !== event.id || event.caster.expiresAt !== event.expiresAt || event.players.some(g => g.room !== event.gameRoom || g.expiresAt !== event.expiresAt) ||
              event.staff.some(g => g.room !== event.id || g.expiresAt !== event.expiresAt || !['organizer', 'moderator'].includes(g.authority!) || typeof g.subjectId !== 'string' || g.subjectId.length > 64) ||
              event.roster.some(p => !p || typeof p.id !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(p.id) || !/^[A-Za-z0-9_-]{43}$/.test(p.token) || !validateJoin('event', p.name).ok || !['ORDER', 'CHAOS'].includes(p.team) || typeof p.voiceMuted !== 'boolean') ||
              new Set(event.roster.map(p => key(p.name))).size !== event.roster.length || new Set(event.staff.map(p => p.subjectId)).size !== event.staff.length ||
              this.slotCount(event) > 10 || ['ORDER', 'CHAOS'].some(team => this.teamCount(event, team as Team) > 5) || this.events.has(event.id)) throw Error('Invalid organizer assignments');
          if (event.expiresAt <= Date.now()) continue;
          if (event.gameRoom && usedRooms.has(event.gameRoom)) throw Error('Duplicate organizer match');
          if (event.gameRoom) usedRooms.add(event.gameRoom);
          for (const value of [event.invite, event.caster.token, ...event.staff.map(g => g.token), ...event.players.map(g => g.token), ...event.roster.map(g => g.token)]) {
            if (usedTokens.has(value)) throw Error('Duplicate organizer credential'); usedTokens.add(value);
          }
          this.events.set(event.id, event);
        }
        if (parsed.audit !== undefined) {
          if (!Array.isArray(parsed.audit) || parsed.audit.length > 1000 || parsed.audit.some((a: any) => !a || !Number.isSafeInteger(a.at) || !['organizer', 'moderator'].includes(a.actorRole) || !['mute', 'unmute', 'mute_denied'].includes(a.action) ||
            ['id', 'actorId', 'actorName', 'eventId', 'eventTitle', 'targetId', 'targetName', 'targetRole'].some(k => typeof a[k] !== 'string' || a[k].length > 128))) throw Error('Invalid organizer audit');
          this.audit = parsed.audit;
        }
      }
    }
    this.syncGrants(); for (const event of this.events.values()) this.armExpiry(event);
  }
  get persistent(): boolean { return !!this.storePath; }
  private allSlots(event: VoiceEvent): { name: string; team: Team }[] {
    return [...event.roster, ...event.players.filter(g => !event.roster.some(p => key(p.name) === key(g.name))).map(g => ({ name: g.name, team: g.team! }))];
  }
  private slotCount(event: VoiceEvent): number { return this.allSlots(event).length; }
  private teamCount(event: VoiceEvent, team: Team): number { return this.allSlots(event).filter(p => p.team === team).length; }
  private persist(next: VoiceEvent[], audit = this.audit): void {
    if (!this.storePath) return;
    mkdirSync(dirname(this.storePath), { recursive: true });
    const temporary = this.storePath + '.' + randomBytes(6).toString('hex') + '.pending.private.json';
    try { writeFileSync(temporary, JSON.stringify({ version: 2, events: next, audit }) + '\n', { flag: 'wx', mode: 0o600 }); renameSync(temporary, this.storePath); }
    catch { try { unlinkSync(temporary); } catch {} throw Error('Organizer state could not be saved'); }
  }
  private syncGrants(): void {
    const staticPlayers = this.players.filter(g => !this.ownedPlayerTokens.has(g.token)), staticCasters = this.casters.filter(g => !this.ownedCasterTokens.has(g.token));
    const dynamicPlayers = [...this.events.values()].flatMap(e => e.players), dynamicCasters = [...this.events.values()].flatMap(e => [e.caster, ...e.staff]);
    if (staticPlayers.length + dynamicPlayers.length > 500 || staticCasters.length + dynamicCasters.length > 500) throw Error('Voice grant capacity reached');
    this.players.splice(0, this.players.length, ...staticPlayers, ...dynamicPlayers); this.casters.splice(0, this.casters.length, ...staticCasters, ...dynamicCasters);
    this.ownedPlayerTokens = new Set(dynamicPlayers.map(g => g.token)); this.ownedCasterTokens = new Set(dynamicCasters.map(g => g.token));
  }
  private commit(event: VoiceEvent, audit = this.audit): void {
    this.persist([...this.events.values()].filter(e => e.id !== event.id).concat(event), audit);
    this.events.set(event.id, event); this.audit = audit; this.syncGrants(); this.armExpiry(event); this.playerChanged();
    for (const [ws, info] of this.registrations) if (info.eventId === event.id) this.sendLobbyState(ws, event, info.slotId);
  }
  private armExpiry(event: VoiceEvent): void {
    clearTimeout(this.timers.get(event.id));
    const timer = setTimeout(() => { try { this.closeEvent(event.id); } catch { this.revokeEvent(event); } }, Math.max(1, Math.min(2147483647, event.expiresAt - Date.now())));
    timer.unref(); this.timers.set(event.id, timer);
  }
  create(title: unknown, casterName: unknown, hours: unknown, lobbyLink?: unknown): void {
    if (this.events.size >= 12 || this.casters.length >= 500) throw Error('Limita de camere active a fost atinsă.');
    if (typeof title !== 'string' || !title.trim() || title.length > 64 || /[\x00-\x1f\x7f]/.test(title) || typeof casterName !== 'string' || !validateJoin('event', casterName).ok || key(casterName)==='administrator' || key(casterName).startsWith('moderator · ') ||
        typeof hours !== 'number' || !Number.isFinite(hours) || hours < 1 || hours > 12) throw Error('Completează numele camerei, comentatorul și durata de 1–12 ore.');
    const id = 'event-' + randomBytes(12).toString('base64url'), expiresAt = Date.now() + Math.round(hours * 3600000);
    this.commit({ id, title: title.trim(), invite: 'RV-' + token(), expiresAt, gameRoom: null, lobbyLink:normalizeLobbyLink(lobbyLink), players: [], roster: [], staff: [], caster: { token: token(), room: id, name: casterName, role: 'caster', expiresAt } });
  }
  setLobbyLink(eventId:unknown,link:unknown):void {
    const event=this.event(eventId);this.commit({...event,lobbyLink:normalizeLobbyLink(link)});
  }
  private event(id: unknown): VoiceEvent {
    const event = typeof id === 'string' ? this.events.get(id) : undefined;
    if (!event || event.expiresAt <= Date.now()) throw Error('Camera nu există sau a expirat.'); return event;
  }
  private sharedEvent(invitation: unknown): VoiceEvent | undefined {
    return typeof invitation === 'string' ? [...this.events.values()].find(e => e.invite === invitation && e.expiresAt > Date.now()) : undefined;
  }
  registerLobby(ws: WebSocket, input: { invitation?: unknown; name?: unknown }): void {
    if (this.registrations.has(ws) || [...this.pending.values()].some(p => p.ws === ws)) throw Error('Există deja o înscriere pe această conexiune.');
    if (typeof input.name !== 'string' || !validateJoin('lobby', input.name.trim()).ok) throw Error('Introdu Riot ID-ul complet, de exemplu Nume#EUNE.');
    const name = input.name.trim();
    const reservedEvent = [...this.events.values()].find(e => e.expiresAt > Date.now() && e.roster.some(p => p.token === input.invitation));
    const event = reservedEvent || this.sharedEvent(input.invitation);
    if (!event) throw Error('Cod vocal invalid sau expirat.');
    const reserved = event.roster.find(p => p.token === input.invitation);
    if (reserved) {
      if (key(reserved.name) !== key(name)) throw Error('Înscrierea aparține altui Riot ID.');
      this.attachRegistration(ws, event, reserved); return;
    }
    if (event.gameRoom) throw Error('Meciul a început. Conectează-te din RiftVoice după identificarea meciului.');
    if (this.allSlots(event).some(p => key(p.name) === key(name))) throw Error('Acest nume este deja înscris. Folosește sesiunea aprobată sau cere organizatorului să elimine înscrierea veche.');
    if (this.slotCount(event) >= 10) throw Error('Camera are deja 10 jucători aprobați.');
    this.addPending(ws, event, name, event.id, 'ORDER', 'lobby');
  }
  private attachRegistration(ws: WebSocket, event: VoiceEvent, slot: LobbySlot): void {
    this.registrations.set(ws, { eventId: event.id, slotId: slot.id });
    this.sessions.create({ token: '', room: event.id, name: slot.name, role: 'pending', expiresAt: event.expiresAt }, ws);
    ws.once('close', () => { this.registrations.delete(ws); this.sessions.revoke(ws); this.playerChanged(); });
    send(ws, { type: 'lobby_approved', invitation: slot.token }); this.sendLobbyState(ws, event, slot.id); this.playerChanged();
  }
  private sendLobbyState(ws: WebSocket, event: VoiceEvent, slotId: string): void {
    const slot = event.roster.find(p => p.id === slotId);
    if (slot) send(ws, { type: 'lobby_state', name: slot.name, team: slot.team, muted: slot.voiceMuted, started: !!event.gameRoom });
  }
  requestJoin(ws: WebSocket, input: { room: string; name: string; team?: unknown; invitation?: unknown; eventInviteProtocol?: number }): boolean {
    const reservedEvent = [...this.events.values()].find(e => e.expiresAt > Date.now() && e.roster.some(p => p.token === input.invitation));
    if (!reservedEvent && (typeof input.invitation !== 'string' || !input.invitation.startsWith('RV-'))) return false;
    const event = reservedEvent || this.sharedEvent(input.invitation);
    const error = (message: string) => send(ws, { type: 'error', message });
    if (!event) { error('Cod vocal RiftVoice expirat sau invalid. Cere codul nou administratorului.'); return true; }
    if (this.rooms.getClientInfo(ws)) { error('Această conexiune este deja într-o cameră vocală.'); return true; }
    if (input.eventInviteProtocol !== 1) { error('Actualizează RiftVoice la 0.3.0 pentru invitația comună.'); return true; }
    if (input.team !== 'ORDER' && input.team !== 'CHAOS') { error('Echipa jucătorului nu poate fi identificată.'); return true; }
    if (event.gameRoom && event.gameRoom !== input.room) { error('Această cameră vocală este legată de alt meci. Intră în customul organizatorului.'); return true; }
    const reserved = reservedEvent?.roster.find(p => p.token === input.invitation);
    if (reserved && (key(reserved.name) !== key(input.name) || reserved.team !== input.team)) { error('Riot ID-ul sau echipa detectată diferă de înscriere. Organizatorul trebuie să verifice lobby-ul înainte de start.'); return true; }
    const slot = event.roster.find(p => key(p.name) === key(input.name));
    if (slot && !reserved) { error('Acest nume are o înscriere personală. Folosește aplicația în care ai fost aprobat.'); return true; }
    if (slot?.voiceMuted || event.players.some(p => key(p.name) === key(input.name) && p.voiceMuted)) { error('Ai mute de moderare. Organizatorul trebuie să reactiveze accesul vocal.'); return true; }
    if (this.rooms.findInRoom(input.room, input.name)) { error('Acest jucător este deja conectat.'); return true; }
    if (this.slotCount(event) >= 10 && !this.allSlots(event).some(p => key(p.name) === key(input.name))) { error('Camera are deja 10 jucători aprobați.'); return true; }
    try {
      const pending = this.addPending(ws, event, input.name, input.room, input.team, 'game');
      if (reserved && pending) this.approve(pending.id, reserved.team);
    } catch (err) { error(err instanceof Error ? err.message : 'Cerere indisponibilă.'); }
    return true;
  }
  private addPending(ws: WebSocket, event: VoiceEvent, name: string, room: string, requestedTeam: Team, mode: Pending['mode']): Pending | undefined {
    const sameSocket = [...this.pending.values()].find(p => p.ws === ws);
    if (sameSocket) {
      if (sameSocket.eventId === event.id && sameSocket.name === name && sameSocket.room === room) { send(ws, { type: mode === 'game' ? 'join_pending' : 'lobby_pending', message: 'Cererea așteaptă aprobarea organizatorului.' }); return; }
      throw Error('Există deja o cerere pe această conexiune.');
    }
    if ([...this.pending.values()].some(p => p.eventId === event.id && key(p.name) === key(name))) throw Error('Există deja o cerere pentru acest nume.');
    if (this.pending.size >= 100 || [...this.pending.values()].filter(p => p.eventId === event.id).length >= 20) throw Error('Prea multe cereri în așteptare. Încearcă din nou mai târziu.');
    const id = randomBytes(16).toString('base64url'), expiresAt = Math.min(event.expiresAt, Date.now() + 5 * 60000);
    this.sessions.create({ token: '', room, name, role: 'pending', expiresAt }, ws);
    const timer = setTimeout(() => this.reject(id, 'Cererea a expirat. Introdu din nou codul vocal.'), expiresAt - Date.now()); timer.unref();
    const pending: Pending = { id, eventId: event.id, ws, name, room, requestedTeam, mode, expiresAt, timer }; this.pending.set(id, pending);
    ws.once('close', () => { this.forgetPending(id); this.playerChanged(); });
    send(ws, { type: mode === 'game' ? 'join_pending' : 'lobby_pending', message: 'Cerere trimisă. Așteaptă aprobarea organizatorului în Caster.' }); this.playerChanged(); return pending;
  }
  permitsGrant(room: string, grant: VoiceGrant): boolean {
    const event = [...this.events.values()].find(e => e.gameRoom === room && e.expiresAt > Date.now()); return !event || event.players.some(g => g.token === grant.token && !g.voiceMuted);
  }
  private forgetPending(id: string): Pending | undefined {
    const pending = typeof id === 'string' ? this.pending.get(id) : undefined; if (pending) { clearTimeout(pending.timer); this.pending.delete(id); } return pending;
  }
  approve(id: unknown, team: unknown): void {
    const pending = typeof id === 'string' ? this.pending.get(id) : undefined;
    if (!pending || pending.ws.readyState !== pending.ws.OPEN || pending.expiresAt <= Date.now()) throw Error('Cererea nu mai este activă.');
    const event = this.event(pending.eventId);
    if (team !== 'ORDER' && team !== 'CHAOS') throw Error('Alege echipa albastră sau roșie.');
    const existingSlot = this.allSlots(event).find(p => key(p.name) === key(pending.name));
    if (event.roster.some(p => key(p.name) === key(pending.name) && p.voiceMuted) || event.players.some(p => key(p.name) === key(pending.name) && p.voiceMuted)) throw Error('Accesul vocal este oprit de moderare.');
    if ((!existingSlot && this.slotCount(event) >= 10) || this.teamCount(event, team) - (existingSlot?.team === team ? 1 : 0) >= 5) throw Error('Sunt permise 10 persoane, câte 5 în fiecare echipă.');
    if (pending.mode === 'lobby') {
      if (event.gameRoom || existingSlot) throw Error('Înscrierea nu mai poate fi aprobată. Verifică lista și starea meciului.');
      const slot: LobbySlot = { id: randomBytes(16).toString('base64url'), token: token(), name: pending.name, team, voiceMuted: false };
      this.commit({ ...event, roster: [...event.roster, slot] }); this.forgetPending(pending.id); this.attachRegistration(pending.ws, this.event(event.id), slot); return;
    }
    if (event.gameRoom && event.gameRoom !== pending.room) throw Error('Jucătorul este în alt meci.');
    if (existingSlot && existingSlot.team !== team) throw Error('Echipa aprobată diferă de locul rezervat.');
    if (pending.requestedTeam !== team) throw Error('Echipa detectată de aplicație diferă. Verifică echipele în lobby-ul LoL.');
    if ([...this.events.values()].some(e => e.id !== event.id && e.gameRoom === pending.room)) throw Error('Acest meci are deja altă cameră vocală.');
    if (!event.gameRoom && this.rooms.getPeers(pending.room).length) throw Error('Există deja jucători conectați la acest meci; închide sesiunea veche întâi.');
    if (this.players.length >= 500 && !event.players.some(p => key(p.name) === key(pending.name))) throw Error('Limita serverului a fost atinsă.');
    const personal: VoiceGrant = { token: token(), room: pending.room, name: pending.name, role: 'player', team, expiresAt: event.expiresAt };
    const old = event.players.find(p => key(p.name) === key(pending.name));
    this.commit({ ...event, gameRoom: pending.room, players: [...event.players.filter(p => p !== old), personal] });
    if (old) this.sessions.closeIdentity(old.room, old.name, 'player');
    this.forgetPending(pending.id); send(pending.ws, { type: 'join_approved', invitation: personal.token }); this.playerChanged();
  }
  move(eventId: unknown, name: unknown, team: unknown): void {
    const event = this.event(eventId);
    if (event.gameRoom) throw Error('Echipele sunt blocate după începerea meciului. Mută jucătorii în lobby înainte de start.');
    if (team !== 'ORDER' && team !== 'CHAOS') throw Error('Echipă invalidă.');
    const slot = event.roster.find(p => p.name === name); if (!slot) throw Error('Jucătorul nu este înscris în lobby.');
    if (slot.team === team) return;
    if (this.teamCount(event, team) >= 5) throw Error('Echipa are deja 5 locuri ocupate.');
    this.commit({ ...event, roster: event.roster.map(p => p === slot ? { ...p, team } : p) });
  }
  swap(eventId: unknown, first: unknown, second: unknown): void {
    const event = this.event(eventId);
    if (event.gameRoom) throw Error('Echipele sunt blocate după începerea meciului.');
    const a = event.roster.find(p => p.name === first), b = event.roster.find(p => p.name === second);
    if (!a || !b || a === b) throw Error('Alege doi jucători înscriși diferiți.');
    this.commit({ ...event, roster: event.roster.map(p => p === a ? { ...p, team: b.team } : p === b ? { ...p, team: a.team } : p) });
  }
  reject(id: unknown, message = 'Cerere respinsă de organizator.'): void {
    const pending = typeof id === 'string' ? this.forgetPending(id) : undefined; if (!pending) return;
    this.sessions.revoke(pending.ws); send(pending.ws, { type: 'error', message }); pending.ws.close(4003, 'Request denied'); this.playerChanged();
  }
  remove(eventId: unknown, name: unknown): void {
    const event = this.event(eventId), member = event.players.find(p => typeof name==='string'&&key(p.name)===key(name)), slot = event.roster.find(p => p.name === name);
    if (!member && !slot) throw Error('Jucătorul nu există în cameră.');
    this.commit({ ...event, players: event.players.filter(p => p !== member), roster: event.roster.filter(p => p !== slot) });
    if (member) this.sessions.closeIdentity(member.room, member.name, 'player');
    for (const [ws, info] of this.registrations) if (info.eventId === event.id && info.slotId === slot?.id) { this.sessions.revoke(ws); ws.close(4003, 'Registration removed'); }
    this.playerChanged();
  }
  casterInvitation(eventId: unknown, actor: StaffIdentity): string {
    const event = this.event(eventId), existing = event.staff.find(p => p.subjectId === actor.id);
    if (existing) { if (existing.voiceMuted) throw Error('Accesul tău vocal este oprit de moderare.'); return existing.token; }
    if (event.staff.length >= 24 || this.casters.length >= 500) throw Error('Limita de comentatori a fost atinsă.');
    const name = actor.role === 'organizer' ? 'Administrator' : 'Moderator · ' + actor.name;
    if ([event.caster, ...event.staff].some(g => g.name === name)) throw Error('Numele comentatorului este deja folosit.');
    const grant: VoiceGrant = { token: token(), room: event.id, name, role: 'caster', expiresAt: event.expiresAt, subjectId: actor.id, authority: actor.role };
    this.commit({ ...event, staff: [...event.staff, grant] }); return grant.token;
  }
  moderate(actor: StaffIdentity, eventId: unknown, kind: unknown, targetId: unknown, muted: unknown): void {
    const event = this.event(eventId);
    if (typeof muted !== 'boolean' || typeof targetId !== 'string' || !['player', 'staff', 'caster'].includes(kind as string)) throw Error('Comandă de moderare invalidă.');
    const player = kind === 'player' ? event.players.find(p => key(p.name) === key(targetId)) : undefined;
    const slot = kind === 'player' ? event.roster.find(p => p.name === targetId) : undefined;
    const grant = kind === 'staff' ? event.staff.find(g => g.subjectId === targetId) : kind === 'caster' && targetId === event.caster.name ? event.caster : player;
    if (!grant && !slot) throw Error('Participantul nu există.');
    const denied = grant?.authority === 'organizer' && actor.role !== 'organizer';
    const entry: AuditEntry = { id: randomBytes(16).toString('base64url'), at: Date.now(), actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: denied ? 'mute_denied' : muted ? 'mute' : 'unmute', eventId: event.id, eventTitle: event.title, targetId, targetName: grant?.name || slot!.name, targetRole: grant?.authority || (kind === 'player' ? 'player' : 'caster') };
    const audit = [...this.audit, entry].slice(-1000);
    if (denied) { this.persist([...this.events.values()], audit); this.audit = audit; this.playerChanged(); throw Error('Moderatorii nu pot modifica vocea administratorului.'); }
    if ((grant?.voiceMuted === true || slot?.voiceMuted === true) === muted) return;
    this.commit({ ...event, players: event.players.map(p => p === player ? { ...p, voiceMuted: muted } : p), roster: event.roster.map(p => p === slot ? { ...p, voiceMuted: muted } : p),
      staff: event.staff.map(p => p === grant ? { ...p, voiceMuted: muted } : p), caster: event.caster === grant ? { ...event.caster, voiceMuted: muted } : event.caster }, audit);
    if (muted && grant) this.sessions.closeIdentity(grant.room, grant.name, grant.role);
    this.playerChanged();
  }
  rotate(eventId: unknown): void {
    const event = this.event(eventId); this.commit({ ...event, invite: 'RV-' + token() });
    for (const p of [...this.pending.values()]) if (p.eventId === event.id) this.reject(p.id, 'Invitația a fost schimbată. Cere codul nou organizatorului.');
  }
  private revokeEvent(event: VoiceEvent): void {
    for (const p of [...this.pending.values()]) if (p.eventId === event.id) this.reject(p.id, 'Camera a fost închisă.');
    for (const p of [...event.players, event.caster, ...event.staff]) this.sessions.closeIdentity(p.room, p.name, p.role);
    for (const [ws, info] of this.registrations) if (info.eventId === event.id) { this.sessions.revoke(ws); ws.close(4003, 'Event closed'); }
  }
  closeEvent(eventId: unknown): void {
    const event = typeof eventId === 'string' ? this.events.get(eventId) : undefined; if (!event) return;
    this.persist([...this.events.values()].filter(e => e !== event)); this.events.delete(event.id); this.syncGrants();
    clearTimeout(this.timers.get(event.id)); this.timers.delete(event.id); this.revokeEvent(event); this.playerChanged();
  }
  snapshot(actor?: StaffIdentity): unknown {
    const now = Date.now();
    return { type: 'organizer_state', persistent: this.persistent, ...(actor?.role === 'organizer' ? { audit: this.audit.slice(-200).reverse() } : {}), events: [...this.events.values()].filter(e => e.expiresAt > now).map(e => ({
      id: e.id, title: e.title, invite: e.invite, expiresAt: e.expiresAt, bound: !!e.gameRoom, capacity: 10, lobbyLink:e.lobbyLink, casterInvitation: e.caster.token, casterName: e.caster.name,
      players: this.allSlots(e).map(p => ({ name: p.name, team: p.team, connected: this.sessions.connected(e.gameRoom || '', e.players.find(g=>key(g.name)===key(p.name))?.name||p.name, 'player'),
        lobby: e.roster.some(s => key(s.name) === key(p.name) && [...this.registrations.values()].some(r => r.eventId === e.id && r.slotId === s.id)),
        muted: e.roster.some(s => key(s.name) === key(p.name) && s.voiceMuted) || e.players.some(g => key(g.name) === key(p.name) && g.voiceMuted) })),
      staff: [e.caster, ...e.staff].map(g => ({ id: g.subjectId || g.name, kind: g.subjectId ? 'staff' : 'caster', name: g.name, role: g.authority || 'caster', muted: g.voiceMuted === true, connected: this.sessions.connected(g.room, g.name, 'caster') })),
      pending: [...this.pending.values()].filter(p => p.eventId === e.id && p.expiresAt > now).map(p => ({ id: p.id, name: p.name, requestedTeam: p.requestedTeam, mode: p.mode }))
    })) };
  }
  observe(ws: WebSocket, actor?: StaffIdentity): void { this.observers.set(ws, actor); send(ws, this.snapshot(actor)); ws.once('close', () => this.observers.delete(ws)); }
  playerChanged(): void {
    if (this.notifying) return; this.notifying = true; queueMicrotask(() => { this.notifying = false; for (const [ws, actor] of this.observers) if (this.sessions.has(ws)) send(ws, this.snapshot(actor)); });
  }
  stop(): void { for (const timer of this.timers.values()) clearTimeout(timer); for (const p of this.pending.values()) clearTimeout(p.timer); this.timers.clear(); this.pending.clear(); this.observers.clear(); this.registrations.clear(); }
}
