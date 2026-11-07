import { audioSignal } from './audio-signal.js';
import {sendJson} from './send.js';
import { randomBytes } from 'node:crypto';
import type { CameraMedia } from './camera-media.js';
import { CAMERA_LEASE_MS, readEnemyCamera } from './enemy-camera.js';
import { authorizeGrant, type PlayerSecurity, type VoiceGrant } from './access.js';
import type { WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from './types.js';
import type { RoomManager } from './rooms.js';
import type { LivenessTracker } from './heartbeat.js';
import { validateJoin } from './validate.js';
import { TokenBucket, LIMITS, type RejectReason } from './rate-limit.js';

/** A shared RESET is relayed at most once per this long in a room... */
export const SHARED_RESET_ROOM_MS = 15_000;
/** ...and from any one client once per this long. */
export const SHARED_RESET_SENDER_MS = 30_000;

/**
 * Close code sent to a socket whose room+name has been taken over by a newer
 * connection. The client treats it as terminal instead of reconnecting — see
 * `src/services/signaling.ts`.
 */
export const TAKEOVER_CLOSE_CODE = 4000;

// How long an evicted socket gets to acknowledge the close frame before it is
// torn down. The socket being evicted is usually half-open (that is why it was
// replaced), so the close handshake would never complete and ws's 30 s close
// timeout would keep it in `wss.clients` — and holding one of the 20 per-IP
// connection slots shared by a whole household — for that whole window.
const EVICT_TERMINATE_MS = 1000;

/** Returns false when the message was dropped because the socket isn't open. */
function send(ws: WebSocket, msg: ServerMessage): boolean {
  if (ws.readyState !== ws.OPEN) {
    // Close notifications race during normal multi-player shutdown. They are
    // expected drops; liveness/rejection counters track actual failures.
    return false;
  }
  return sendJson(ws,msg);
}

function sendError(ws: WebSocket, message: string): void {
  send(ws, { type: 'error', message });
}

/** Hand a name over to a newer connection, without waiting on the old one. */
function evict(ws: WebSocket): void {
  try {
    ws.close(TAKEOVER_CLOSE_CODE, 'replaced by a newer connection');
  } catch {
    // Already closing or closed — the terminate below is the backstop.
  }
  setTimeout(() => {
    try {
      ws.terminate();
    } catch {
      /* already gone */
    }
  }, EVICT_TERMINATE_MS).unref();
}

export function handleConnection(
  ws: WebSocket,
  rooms: RoomManager,
  heartbeat: LivenessTracker,
  onReject?: (reason: RejectReason) => void,
  security?: PlayerSecurity,
  cameraMedia?: CameraMedia,
): void {
  // Per-connection message rate limiter. Each WebSocket gets its own bucket
  // so a single noisy client can't block a normal one. Capacity matches the
  // ~10 Hz position-broadcast cadence plus signaling bursts at game start.
  const msgLimiter = new TokenBucket(LIMITS.WS_MESSAGES);
  let grant: VoiceGrant | undefined;
  let sessionToken: string | undefined;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  let cameraChallenge: ReturnType<typeof setInterval> | undefined;
  const limitKey = 'self'; // single bucket per connection — key is irrelevant

  ws.on('message', (data) => {
    // Everything below runs inside try/catch because `ws` emits this listener
    // synchronously: anything that throws here escapes to the EventEmitter and
    // takes the whole process — every room with it — down with one frame from
    // one unauthenticated stranger.
    try {
      // Before the rate limit: a client that is being throttled is still alive,
      // and reaping it would tear down working audio for every peer.
      heartbeat.markAlive(ws);

      if (!msgLimiter.tryConsume(limitKey)) {
        onReject?.('ws_messages');
        sendError(ws, 'message rate limit exceeded — slow down');
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        sendError(ws, 'Invalid JSON');
        return;
      }
      // `null`, numbers, strings and arrays are all well-formed JSON that carry
      // no `type`. Only `null` is fatal — reading `.type` off it throws — but the
      // rest have no business reaching the switch either.
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        sendError(ws, 'Invalid message');
        return;
      }
      const msg = parsed as ClientMessage;
      if (security && grant && grant.expiresAt <= Date.now()) { ws.close(1008, 'Invitation expired'); return; }
      if (security && grant && !security.sessions.has(ws)) { ws.close(4003, 'Voice access revoked'); return; }

      switch (msg.type) {
        case 'join': {
          const valid = validateJoin(msg.room, msg.name);
          if (!valid.ok) {
            // The socket stays open: a retry with the same values can't succeed,
            // and closing would send the client's reconnect loop around forever.
            sendError(ws, valid.error);
            return;
          }
          const { room, name } = valid;
          if (security?.events?.requestJoin(ws,{room,name,team:msg.team,invitation:msg.invitation,eventInviteProtocol:msg.eventInviteProtocol})) return;

          // v0.3: optional team field. v0.2.x clients omit it; we pass undefined
          // and computeTieredVolumes falls back to legacy team-blind behavior.
          const allowed = security ? authorizeGrant(security.grants, msg.invitation) : undefined;
          if (security && (!allowed || allowed.role !== 'player' || allowed.room !== room || allowed.name !== name)) {
            sendError(ws, 'Invitație de jucător invalidă sau expirată. Cere invitația organizatorului.'); return;
          }
          if (security && allowed && security.events && !security.events.permitsGrant(room,allowed)) { sendError(ws,'Acest meci este administrat din Caster. Cere aprobarea administratorului.');return; }
          if (security && grant && (grant.room !== room || grant.name !== name)) { sendError(ws, 'Room switch denied'); return; }
          const team = allowed?.team ?? (msg.team === 'ORDER' || msg.team === 'CHAOS' ? msg.team : undefined);

          const existing = rooms.getClientInfo(ws);
          if (existing) {
            if (existing.roomId === room && existing.name === name) {
              // Repeat join on a live socket. Returning here is load-bearing:
              // falling through would have `join` find this socket's OWN entry as
              // the duplicate and evict the connection that just spoke.
              if (team) rooms.setTeam(ws, team);
              rooms.setSharedReset(ws, msg.sharedReset === true);
              send(ws, { type: 'room_state', peers: rooms.getOthersInRoom(ws).map(c => c.name), ...(sessionToken ? { sessionToken, role: 'player', teamIsolation: true, enemyCameraVoice: existing.enemyCameraCapable === true } : {}) });
              return;
            }
            // Moving rooms: the old room has to be told, and it has to be told
            // from `remaining` — after `leave`, `getOthersInRoom` has no entry to
            // resolve the room from and returns nothing.
            const gone = rooms.leave(ws);
            if (gone) {
              for (const peer of gone.remaining) {
                send(peer.ws, { type: 'peer_left', name: gone.name });
              }
            }
          }

          const { peers, evicted } = rooms.join(room, name, ws, team, !!cameraMedia && msg.enemyCameraProtocol === 1);
          rooms.setSharedReset(ws, msg.sharedReset === true);
          if (security && allowed) {
            grant = allowed;
            sessionToken = security.sessions.create(allowed, ws);
            clearTimeout(expiry);
            expiry = setTimeout(() => ws.close(1008, 'Invitation expired'), Math.min(2147483647, allowed.expiresAt - Date.now()));
          }

          if (evicted && evicted.ws !== ws) {
            console.log('[ws] takeover: "' + name + '" in room ' + room + ' moved to a newer connection');
            security?.sessions.revoke(evicted.ws);
            cameraMedia?.drop(evicted.ws);
            evict(evicted.ws);
            // No peer_left for the evicted socket: the name is still in the room,
            // and telling peers it left would make them tear down the connection
            // to the client that just took it over.
          }

          // Send room_state to the joiner
          send(ws, { type: 'room_state', peers, ...(sessionToken ? { sessionToken, role: 'player', teamIsolation: true, enemyCameraVoice: rooms.getClientInfo(ws)?.enemyCameraCapable === true } : {}) });
          const cameraClient = rooms.getClientInfo(ws);
          if (cameraClient?.enemyCameraCapable) {
            clearInterval(cameraChallenge);
            const challenge = () => {
              if (!security?.sessions.has(ws)) return;
              const now=Date.now(), nonce=randomBytes(16).toString('base64url');
              cameraClient.cameraChallenges=[...(cameraClient.cameraChallenges || []).filter(c=>c.expiresAt>now),{nonce,expiresAt:now+CAMERA_LEASE_MS}].slice(-3);
              send(ws,{type:'camera_challenge',nonce});
            };
            challenge(); cameraChallenge=setInterval(challenge,200); cameraChallenge.unref();
          }

          // Broadcast peer_joined to others already in the room
          const others = rooms.getOthersInRoom(ws);
          for (const peer of others) {
            send(peer.ws, { type: 'peer_joined', name });
          }
          security?.events?.playerChanged();
          break;
        }

        case 'signal': {
          const info = rooms.getClientInfo(ws);
          if (!info) {
            sendError(ws, 'Not in a room');
            return;
          }
          if (!msg.to) {
            sendError(ws, 'signal requires "to" field');
            return;
          }
          const target = rooms.findInRoom(info.roomId, msg.to);
          if (target && security && info.team && target.team && info.team !== target.team && cameraMedia && info.enemyCameraCapable && target.enemyCameraCapable) {
            void cameraMedia.handle(info, target, msg.payload).catch(() => sendError(ws, 'Camera audio negotiation failed'));
            return;
          }
          if (!target || (security && (!info.team || info.team !== target.team))) {
            sendError(ws, `Peer "${msg.to}" not found in room`);
            return;
          }
          const payload = security ? audioSignal(msg.payload) : msg.payload;
          if (security && !payload) { sendError(ws, 'Only audio signaling is permitted'); return; }
          if (!send(target.ws, { type: 'signal', from: info.name, payload })) {
            // Tell the sender rather than letting the handshake stall silently.
            sendError(ws, `Peer "${msg.to}" is not reachable`);
          }
          break;
        }

        case 'position': {
          // Peer-presence metadata broadcast (name/champion/mute/dead state).
          // NOT the XY coordinates — those use 'coords' since v0.2.
          const info = rooms.getClientInfo(ws);
          if (!info) {
            sendError(ws, 'Not in a room');
            return;
          }
          if (!security) {
            for (const peer of rooms.getOthersInRoom(ws)) send(peer.ws, { type: 'position', from: info.name, blob: msg.blob });
            break;
          }
          let metadata: any;
          try { metadata = JSON.parse(msg.blob || ''); } catch { sendError(ws, 'Invalid presence'); return; }
          if (!metadata || typeof metadata.championName !== 'string' || metadata.championName.length > 64) { sendError(ws, 'Invalid presence'); return; }
          const blob = JSON.stringify({ summonerName: info.name, championName: metadata.championName, team: info.team || '', isMuted: metadata.isMuted === true, isDead: metadata.isDead === true });
          info.isDead = metadata.isDead === true;
          info.isMuted = metadata.isMuted === true;
          const others = rooms.getOthersInRoom(ws);
          for (const peer of others) {
            send(peer.ws, { type: 'position', from: info.name, blob });
          }
          break;
        }

        case 'enemy_camera': {
          const info = rooms.getClientInfo(ws);
          if (!security || !cameraMedia || !info?.enemyCameraCapable || !security.sessions.has(ws)) { sendError(ws, 'Camera voice unavailable'); return; }
          const now=Date.now(), challenge=info.cameraChallenges?.find(c=>c.nonce===msg.nonce && c.expiresAt>now);
          info.enemyCamera = readEnemyCamera(challenge ? msg : null, info.enemyCamera, now);
          if (challenge) {
            info.enemyCamera.expiresAt=Math.min(info.enemyCamera.expiresAt,challenge.expiresAt);
            info.enemyCamera.consentUntil=Math.min(info.enemyCamera.consentUntil,challenge.expiresAt);
          }
          break;
        }

        case 'shared_reset': {
          // The user flipped the shared RESET setting mid-game.
          if (!rooms.getClientInfo(ws)) {
            sendError(ws, 'Not in a room');
            return;
          }
          rooms.setSharedReset(ws, msg.on === true);
          break;
        }

        case 'reset_all': {
          // Shared RESET (opt-in): this client's user pressed RESET, and asks
          // that everyone in the game who has also opted in re-find their own
          // icon. Acted on only from an opted-in client, relayed only to
          // opted-in clients — one who has not opted in is never sent a
          // 'reset' at all — and at most once per SHARED_RESET_ROOM_MS per
          // room and SHARED_RESET_SENDER_MS per sender, so nobody, an enemy
          // included, can keep knocking a game's trackers about. The relayed
          // message carries the sender's name and nothing else.
          const info = rooms.getClientInfo(ws);
          if (!info) {
            sendError(ws, 'Not in a room');
            return;
          }
          if (info.sharedReset !== true) return;
          const now = Date.now();
          if (!rooms.senderResetAllowed(info.roomId, info.name, now, SHARED_RESET_SENDER_MS)) return;
          if (!rooms.tryStampRoomReset(info.roomId, now, SHARED_RESET_ROOM_MS)) return;
          rooms.stampSenderReset(info.roomId, info.name, now);
          for (const peer of rooms.getOthersInRoom(ws)) {
            if (peer.sharedReset === true && (!security || peer.team === info.team)) send(peer.ws, { type: 'reset', from: info.name });
          }
          break;
        }

        case 'coords': {
          // v0.2 server-side proximity: client reports its XY directly to the
          // server (replaces the v0.1 encrypted-blob exchange over WebRTC data
          // channels). Server stores in room state; the next /compute-volumes
          // request reads it for pairwise distance.
          const info = rooms.getClientInfo(ws);
          if (!info) {
            sendError(ws, 'Not in a room');
            return;
          }
          if (typeof msg.x !== 'number' || typeof msg.y !== 'number' ||
              !isFinite(msg.x) || !isFinite(msg.y) || (security && (msg.x < 0 || msg.y < 0 || msg.x > 16000 || msg.y > 16000))) {
            sendError(ws, 'coords requires finite x and y');
            return;
          }
          // A client that has lost track of its own player disowns the
          // position rather than letting it age out: waiting for the staleness
          // window keeps cross-team peers scored against a place it has
          // already left.
          if (msg.stale === true) {
            // Where it last saw itself, which its teammates may go on being
            // scored against for a little while; see RoomManager.clearPosition.
            const ago = typeof msg.seenAgoMs === 'number' && isFinite(msg.seenAgoMs) ? msg.seenAgoMs : 0;
            rooms.clearPosition(ws, msg.seen === true ? { x: msg.x, y: msg.y, agoMs: ago } : undefined);
            break;
          }
          rooms.setPosition(ws, msg.x, msg.y);
          rooms.setVisibility(ws, msg.vis);
          // "Voice on camera" (#36). A camera centre on this message means the
          // user has the setting on; its absence means off, and clearing here
          // rather than letting it age out is what makes toggling the setting
          // off take effect immediately. A malformed pair is treated as absent
          // rather than rejected, so one bad frame cannot drop a client that is
          // otherwise reporting fine.
          if (typeof msg.cx === 'number' && typeof msg.cy === 'number' &&
              isFinite(msg.cx) && isFinite(msg.cy)) {
            rooms.setCamera(ws, msg.cx, msg.cy);
          } else {
            rooms.clearCamera(ws);
          }
          break;
        }

        default:
          sendError(ws, 'Unknown message type');
      }
    } catch (err) {
      // Reached only by a bug on this path — but the alternative is process
      // death, so degrade to one dropped message instead.
      console.error('[ws] message handler threw:', (err as Error)?.message ?? err);
      sendError(ws, 'Internal error');
    }
  });

  ws.on('close', () => {
    clearInterval(cameraChallenge);
    cameraMedia?.drop(ws);
    clearTimeout(expiry);
    security?.sessions.revoke(ws);
    // Undefined for a socket that was evicted by a later join — its name is
    // still live under a different socket, so nothing is broadcast.
    const gone = rooms.leave(ws);
    security?.events?.playerChanged();
    if (!gone) return;
    for (const peer of gone.remaining) {
      send(peer.ws, { type: 'peer_left', name: gone.name });
    }
  });
}
