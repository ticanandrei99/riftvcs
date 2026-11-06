import { loadGrants, SessionRegistry } from './access.js';
import { CameraMedia } from './camera-media.js';
import { enemyCameraVolume } from './enemy-camera.js';
import { handleCasterConnection, type CasterGrant } from './caster.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer } from 'ws';
import { RoomManager } from './rooms.js';
import { handleConnection } from './ws-handler.js';
import { Heartbeat, DEFAULT_HEARTBEAT_MS, MIN_HEARTBEAT_MS } from './heartbeat.js';
import { generateTurnCredentials, generateCloudflareIceServers, generateStaticIceServers } from './turn.js';
import { computeVolumes, computeTieredVolumes } from './volumes.js';
import {
  TokenBucket,
  ConcurrencyLimiter,
  LIMITS,
  clientIp,
  resolveProxyTrust,
  describeProxyTrust,
  playerKey,
  RejectionCounters,
} from './rate-limit.js';

const PORT = parseInt(process.env.PORT || '3100');
// Which addresses in front of us are our own reverse proxies. Deployment
// topology, not limit tuning — it can't be a compile-time constant because the
// same build runs behind one Caddy, behind a CDN→Caddy chain, or on a bare
// port. TRUST_PROXY is the deprecated hop-count spelling, still honoured so an
// existing deployment survives the upgrade. See rate-limit.ts for how the value
// is used and docs/self-hosting.md for the operator-facing rules.
const PROXY_TRUST = resolveProxyTrust(process.env.TRUSTED_PROXIES, process.env.TRUST_PROXY);
// Ping interval for the WebSocket liveness sweep. Overridable so tests (and a
// self-hoster behind an unusually impatient proxy) can tighten it; a bad value
// falls back to the default rather than being used, because setInterval(fn, NaN)
// fires on every tick and would turn the sweep into a ping/terminate flood.
const HEARTBEAT_MS = (() => {
  const raw = Number(process.env.HEARTBEAT_MS);
  return Number.isFinite(raw) && raw >= MIN_HEARTBEAT_MS ? raw : DEFAULT_HEARTBEAT_MS;
})();
// Cloudflare Realtime TURN (preferred, see docs/self-hosting.md). When configured,
// the server fetches ICE credentials from Cloudflare on /turn-credentials.
const TURN_KEY_ID = process.env.TURN_KEY_ID || '';
const TURN_KEY_API_TOKEN = process.env.TURN_KEY_API_TOKEN || '';
// Self-hosted coturn fallback (optional). Used only when the Cloudflare vars
// above are unset — lets operators who'd rather run their own coturn keep
// the existing HMAC flow without code changes.
const TURN_URLS = process.env.TURN_URLS || '';
const TURN_USERNAME = process.env.TURN_USERNAME || '';
const TURN_PASSWORD = process.env.TURN_PASSWORD || '';
const TURN_SERVER = process.env.TURN_SERVER || '';
const TURN_SECRET = process.env.TURN_SECRET || '';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

// Legacy protocol is available only on a loopback-bound test server.
const development = process.env.RIFTVOICE_INSECURE_TEST_MODE === '1';
const cameraEnabled = process.env.ENEMY_CAMERA_VOICE === '1' && !development;
const cameraLoopbackTest = process.env.CAMERA_MEDIA_LOOPBACK_TEST === '1';
if (cameraLoopbackTest && !cameraEnabled) throw Error('Loopback media requires ENEMY_CAMERA_VOICE=1');
if (cameraLoopbackTest && process.env.NODE_ENV === 'production') throw Error('Loopback media tests are not allowed in production');
const playerGrants = loadGrants(process.env.PLAYER_GRANTS_JSON, ['player']);
const casterGrants = loadGrants(process.env.CASTER_GRANTS_JSON, ['caster', 'spectator']) as CasterGrant[];
const sessions = new SessionRegistry();
const rooms = new RoomManager(!development, cameraEnabled);
const iceCredentials = () => TURN_KEY_ID && TURN_KEY_API_TOKEN
  ? generateCloudflareIceServers(TURN_KEY_ID, TURN_KEY_API_TOKEN)
  : TURN_URLS ? Promise.resolve(generateStaticIceServers(TURN_URLS, TURN_USERNAME, TURN_PASSWORD))
  : generateTurnCredentials(TURN_SERVER, TURN_SECRET);
const cameraMedia = cameraEnabled ? new CameraMedia(rooms, sessions, {
  iceServers: async () => (await iceCredentials()).iceServers,
  loopbackTest: cameraLoopbackTest,
}) : undefined;
const heartbeat = new Heartbeat();

// Per-endpoint rate limiters keyed by client IP. See rate-limit.ts for the
// rationale behind each limit.
const turnCredsLimiter = new TokenBucket(LIMITS.TURN_CREDS);
// /compute-volumes is limited per PLAYER (ip + name) so housemates sharing one
// NAT each get their own budget; a per-IP backstop bounds the total from any
// single source (incl. a client spoofing many names). See rate-limit.ts.
const computeVolumesPlayerLimiter = new TokenBucket(LIMITS.COMPUTE_VOLUMES_PER_PLAYER);
const computeVolumesIpLimiter = new TokenBucket(LIMITS.COMPUTE_VOLUMES_PER_IP);
const wsConnectionLimiter = new ConcurrencyLimiter(LIMITS.WS_PER_IP);

// A 429 is otherwise invisible: the client sees it, the operator sees nothing.
// The counts are aggregate (no IPs, no names) so they stay inside the
// no-per-user-logging promise in docs/threat-model.md.
const rejections = new RejectionCounters();
const onUntrustedForward = () => rejections.bump('xff_invalid');

// Prune idle buckets every 5 minutes (drop entries idle for >10 min). Keeps
// memory bounded even if the server sees lots of unique IPs/players briefly.
setInterval(() => {
  turnCredsLimiter.pruneIdle(10 * 60 * 1000);
  computeVolumesPlayerLimiter.pruneIdle(10 * 60 * 1000);
  computeVolumesIpLimiter.pruneIdle(10 * 60 * 1000);
}, 5 * 60 * 1000).unref();

// One aggregate line a minute when anything was rejected. The bucket counts
// alongside it are the tell for a misconfigured proxy: if every user is
// collapsing into one bucket they sit at ~1 while `rooms` is many, which is a
// single `curl /health` away from being confirmed.
setInterval(() => {
  const deltas = rejections.drainDeltas();
  if (Object.keys(deltas).length === 0) return;
  console.warn('[rate-limit] rejected in last 60s:', deltas, 'buckets:', {
    turnCreds: turnCredsLimiter.size,
    computeVolumesIp: computeVolumesIpLimiter.size,
    computeVolumesPlayer: computeVolumesPlayerLimiter.size,
    wsIps: wsConnectionLimiter.size,
  });
}, 60 * 1000).unref();

function sendError(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}

const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // API responses and TURN credentials must not be retained by browser caches.
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // CORS headers on all responses
  const origin = req.headers.origin;
  const allowedOrigins = new Set(['http://tauri.localhost', 'https://tauri.localhost', 'tauri://localhost', ...(process.env.ALLOWED_WEB_ORIGINS || '').split(',').filter(Boolean)]);
  if (development && origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) allowedOrigins.add(origin);
  if (origin && !allowedOrigins.has(origin)) { sendError(res, 403, 'Origin not allowed'); return; }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.roomCount, strictProximity: true, authenticationRequired: !development, teamIsolation: !development, enemyCameraVoice: cameraEnabled, protocolVersion: 2 }));
    return;
  }

  const session = sessions.get(req.headers.authorization);
  if (!development && (req.url === '/compute-volumes' || req.url === '/turn-credentials') && !session) {
    sendError(res, 401, 'Voice session required'); return;
  }
  if (req.method === 'POST' && req.url === '/compute-volumes') {
    const ip = clientIp(req, PROXY_TRUST, onUntrustedForward);
    // Cheap per-IP backstop first: bounds total throughput (and the body
    // buffering below) from any single source before we know who's asking.
    if (!computeVolumesIpLimiter.tryConsume(ip)) {
      rejections.bump('compute_volumes_ip');
      sendError(res, 429, 'rate limit exceeded — slow down');
      return;
    }

    let body = '';
    let bodyBytes = 0;
    let aborted = false;
    req.on('data', (chunk: Buffer) => {
      if (aborted) return;
      body += chunk.toString();
      bodyBytes += chunk.length;
      // Bound in-memory buffering so an attacker can't OOM us with a huge POST.
      if (bodyBytes > LIMITS.BODY_BYTES) {
        aborted = true;
        rejections.bump('body_too_large');
        sendError(res, 413, 'request body too large');
        req.destroy();
      }
    });
    req.on('end', async () => {
      if (aborted) return;
      try {
        const parsed = JSON.parse(body);
        // Per-player fairness limit, keyed by (ip + name). Players behind one
        // household NAT each get their own budget instead of sharing the IP's
        // — a shared per-IP bucket silently 429'd everyone in a 2+ stack since
        // every client polls independently. Falls back to ip-only when the
        // name is absent (legacy/malformed); see playerKey in rate-limit.ts
        // for the separator and the length bound on the key.
        const who = playerKey(ip, parsed && typeof parsed === 'object' ? parsed.name : undefined);
        if (!computeVolumesPlayerLimiter.tryConsume(who)) {
          rejections.bump('compute_volumes_player');
          sendError(res, 429, 'rate limit exceeded — slow down');
          return;
        }
        // v0.3 path: client passes roomId + name; server reads team-aware
        // room state (team + position + hearCrossTeam per client) and
        // applies tiered proximity (ally=1.0, cross-team at requester's
        // chosen range). Legacy v0.2 clients omit team on join — the
        // function falls back to team-blind 1200u behavior automatically.
        //
        // v0.1 path: client passes 'peers' field with encrypted blobs.
        // Detect by shape — v0.3+ shape is preferred when both happen to be
        // present (shouldn't, but be defensive).
        if (!development) {
          if (!parsed || session?.role !== 'player' || parsed.roomId !== session.room || parsed.name !== session.name ||
            rooms.findInRoom(session.room, session.name)?.ws !== session.ws) {
            sendError(res, 403, 'Player session mismatch'); return;
          }
          // Never turn an unauthenticated HTTP position into a scanning oracle.
          const me = rooms.getClientInfo(session.ws)!;
          parsed.myPosition = me.position || me.lastSeen || { x: 0, y: 0 };
        }
        const result = parsed && typeof parsed === 'object' && typeof parsed.roomId === 'string'
          ? computeTieredVolumes(parsed, (roomId) => rooms.getRoomClients(roomId).filter(peer => development || (session?.team !== undefined && peer.team === session.team)))
          : await computeVolumes(parsed, ENCRYPTION_KEY);
        if (!development && cameraMedia && session?.role === 'player') {
          const listener = rooms.getClientInfo(session.ws);
          if (listener?.enemyCameraCapable) for (const name of rooms.getPeers(session.room)) {
            const speaker = rooms.findInRoom(session.room, name)!;
            const volume = enemyCameraVolume(listener, speaker);
            if (volume > 0 && sessions.has(speaker.ws)) result.peerVolumes[name] = volume;
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err: any) {
        sendError(res, 400, err.message || 'Invalid request');
      }
    });
    return;
  }

  if (req.url === '/turn-credentials') {
    if (!turnCredsLimiter.tryConsume(clientIp(req, PROXY_TRUST, onUntrustedForward))) {
      rejections.bump('turn_creds_ip');
      sendError(res, 429, 'rate limit exceeded — slow down');
      return;
    }
    // Prefer Cloudflare if both vars are set; fall back to self-hosted coturn
    // HMAC; otherwise return empty iceServers (client falls back to public STUN).
    const credsPromise = iceCredentials();
    credsPromise.then((data) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    }).catch(() => sendError(res, 503, 'TURN unavailable'));
    return;
  }

  res.writeHead(404);
  res.end();
});

// WebSocketServer with a per-message size cap. Real signaling messages (SDP,
// ICE candidates, position blobs) are well under 10 KB; 64 KB gives 6x
// headroom and blocks anyone trying to flood the relay with huge payloads.
const wss = new WebSocketServer({ server: httpServer, maxPayload: LIMITS.WS_PAYLOAD_BYTES });

// Failures during the HTTP upgrade emit on the server, before any socket exists
// to carry them. An 'error' event with no listener is a throw, and a throw here
// is the whole process.
wss.on('error', (err) => console.warn('[wss] server error:', err.message));

wss.on('connection', (ws, req) => {
  // Must stay the first statement. A socket that fails the per-IP check below
  // is only sent a close frame — it keeps receiving, so it can still error —
  // and `maxPayload` above makes an oversized frame a routine way to get there.
  // Unlistened, that 'error' event is an uncaught throw that kills the process
  // and every room in it.
  ws.on('error', (err) => console.warn('[ws] socket error:', (err as Error).message));

  if (req.url !== '/ws' && req.url !== '/caster' && !(development && req.url === '/')) { ws.close(1008, 'Unknown voice endpoint'); return; }
  if (wss.clients.size > 500) { ws.close(1013, 'Server capacity reached'); return; }
  const origin = req.headers.origin;
  const allowedOrigins = ['http://tauri.localhost', 'https://tauri.localhost', 'tauri://localhost', ...(process.env.ALLOWED_WEB_ORIGINS || '').split(',')];
  if (origin && !allowedOrigins.includes(origin) && !(development && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) { ws.close(1008, 'Origin not allowed'); return; }
  const ip = clientIp(req as any, PROXY_TRUST, onUntrustedForward);
  if (!wsConnectionLimiter.acquire(ip)) {
    // The address is deliberately absent: docs/threat-model.md promises no
    // per-user logging, and the aggregate counter covers the operator need.
    rejections.bump('ws_per_ip');
    console.warn('[ws] rejecting a connection — per-IP cap reached');
    ws.close(1008 /* policy violation */, 'too many connections from your IP');
    return;
  }
  ws.on('close', () => wsConnectionLimiter.release(ip));
  // Tracked only past the per-IP guard, so a connection rejected above is
  // never pinged.
  heartbeat.track(ws);
  if (!development) {
    const authDeadline = setTimeout(() => { if (!sessions.has(ws)) ws.close(1008, 'Authentication timeout'); }, 15_000);
    authDeadline.unref();
    ws.on('close', () => clearTimeout(authDeadline));
  }
  ws.on('pong', () => heartbeat.markAlive(ws));
  if (req.url === '/caster') { handleCasterConnection(ws, casterGrants, sessions); return; }
  handleConnection(ws, rooms, heartbeat, (reason) => rejections.bump(reason), development ? undefined : { grants: playerGrants, sessions }, cameraMedia);
});

// Reap half-open connections. Without this a client that vanished without a
// TCP FIN (lid closed, tether dropped) stays in its room until the OS TCP
// timeout, black-holing signaling addressed to its name and holding an ally at
// full volume the whole time. See server/src/heartbeat.ts.
setInterval(() => {
  const reaped = heartbeat.sweep(wss.clients);
  if (reaped) console.warn('[ws] reaped', reaped, 'dead connection(s)');
}, HEARTBEAT_MS).unref();

httpServer.requestTimeout = 15_000;
httpServer.headersTimeout = 10_000;
httpServer.maxHeadersCount = 50;
httpServer.listen(PORT, development || cameraLoopbackTest ? '127.0.0.1' : '0.0.0.0', () => {
  console.log(`proxchat-server listening on :${PORT}`);
  // Printed so an operator can confirm in `docker logs` what the running
  // process resolved its proxy trust to, rather than inferring it from behaviour.
  console.log(`proxchat-server trust-proxy: ${describeProxyTrust(PROXY_TRUST)}`);
});


