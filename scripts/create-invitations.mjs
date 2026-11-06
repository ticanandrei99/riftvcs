#!/usr/bin/env node
// Generates invitation secrets into a private local file; never prints tokens.
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
const args = process.argv.slice(2);
const flag = (key, fallback) => { const index = args.indexOf(key); return index < 0 ? fallback : args[index + 1]; };
const rosterPath = flag('--roster');
const outputPath = flag('--out');
const hours = Number(flag('--hours', '8'));
if (!rosterPath || !outputPath?.endsWith('.private.json') || !Number.isFinite(hours) || hours <= 0 || hours > 24) {
  throw Error('Usage: node scripts/create-invitations.mjs --roster roster.json --out event.private.json [--hours 8] (maximum 24h)');
}
const roster = JSON.parse(readFileSync(resolve(rosterPath), 'utf8'));
if (!Array.isArray(roster) || !roster.length || roster.length > 30) throw Error('Roster must contain 1–30 participants');
const deriveRoom = args.includes('--derive-room');
const playersForRoom = roster.filter(m => m?.role === 'player').map(m => m.name);
if (deriveRoom && (playersForRoom.length !== 10 || playersForRoom.some(n => typeof n !== 'string') || new Set(playersForRoom).size !== 10)) throw Error('--derive-room requires the complete ten-player custom roster');
let roomHash = 5381;
for (const c of [...playersForRoom].sort().join('|').split('')) roomHash = ((roomHash << 5) + roomHash + c.charCodeAt(0)) >>> 0;
const derivedRoom = roomHash.toString(36);
const expiresAt = Date.now() + Math.round(hours * 3600000);
const identities = new Set();
const players = [], casters = [];
for (const input of roster) {
  const member = deriveRoom ? { ...input, room: derivedRoom } : input;
  if (!member || typeof member.name !== 'string' || !member.name || member.name.length > 64 || /[\x00-\x1f\x7f-\x9f]/.test(member.name) ||
    typeof member.room !== 'string' || !/^[A-Za-z0-9._:-]{1,64}$/.test(member.room) || !['player','caster','spectator'].includes(member.role) ||
    (member.role === 'player' && !['ORDER','CHAOS'].includes(member.team))) throw Error('Invalid roster member');
  const key = JSON.stringify([member.role === 'player' ? 'players' : 'casters', member.room, member.name]);
  if (identities.has(key)) throw Error('Duplicate roster identity');
  identities.add(key);
  const grant = { token: randomBytes(32).toString('base64url'), room: member.room, name: member.name, role: member.role,
    ...(member.role === 'player' ? { team: member.team } : {}), expiresAt };
  (member.role === 'player' ? players : casters).push(grant);
}
writeFileSync(resolve(outputPath), JSON.stringify({ PLAYER_GRANTS_JSON: JSON.stringify(players), CASTER_GRANTS_JSON: JSON.stringify(casters) }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log('Created private invitations. Keep the output outside release archives and share each invitation only with its owner.');
