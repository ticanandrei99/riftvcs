import { isIP } from 'node:net';
import { MediaStreamTrack, RTCPeerConnection, RTCRtpCodecParameters, type RTCIceServer, type RtpPacket } from 'werift';
import type { WebSocket } from 'ws';
import type { ClientInfo } from './types.js';
import type { RoomManager } from './rooms.js';
import type { SessionRegistry } from './access.js';
import { audioSignal } from './audio-signal.js';
import { enemyCameraVolume } from './enemy-camera.js';

interface Leg { owner: ClientInfo; other: ClientInfo; pc: RTCPeerConnection; output: MediaStreamTrack; queue: Promise<void>; pending: number; packetWindow: number; packetCount: number; packetBytes: number }
interface Pair { a: Leg; b: Leg; closed: boolean }
export interface CameraMediaOptions { iceServers: () => Promise<RTCIceServer[]>; loopbackTest?: boolean; maxPairs?: number }

/** Prevent candidate-driven access to the media host's private network.
 * Production browser legs use relay-only ICE and must advertise public IPv4 relay endpoints. */
export function safeRelayCandidate(candidate: string): boolean {
  const p = candidate.trim().replace(/^a=/, '').split(/\s+/);
  const address = p[4], port = Number(p[5]);
  if (p[6] !== 'typ' || p[7] !== 'relay' || isIP(address) !== 4 || !Number.isInteger(port) || port < 1 || port > 65535 || !['udp','tcp'].includes(p[2]?.toLowerCase())) return false;
  const [a,b] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0)) || (a === 198 && (b === 18 || b === 19)));
}

/** One terminated audio connection per side of each enemy pair. An enemy SDP
 * or ICE candidate is NEVER forwarded to the other player. RTP is checked at
 * every packet, including after negotiation and when the client unmutes itself. */
export class CameraMedia {
  private pairs = new Set<Pair>();
  private creating = new Map<string, Promise<Pair>>();
  private ids = new WeakMap<WebSocket, number>();
  private serial = 0;
  constructor(private rooms: RoomManager, private sessions: SessionRegistry, private options: CameraMediaOptions) {}
  get pairCount(): number { return this.pairs.size; }
  private id(info: ClientInfo): number { let id = this.ids.get(info.ws); if (!id) { id = ++this.serial; this.ids.set(info.ws, id); } return id; }
  private live(info: ClientInfo): boolean { return this.rooms.getClientInfo(info.ws) === info && this.sessions.has(info.ws) && info.ws.readyState === info.ws.OPEN; }
  private emit(leg: Leg, type: string, payload: unknown): void {
    if (this.live(leg.owner)) leg.owner.ws.send(JSON.stringify({ type: 'signal', from: leg.other.name, payload: { type, payload } }));
  }
  private close(pair: Pair): void {
    if (pair.closed) return; pair.closed = true; this.pairs.delete(pair);
    for (const leg of [pair.a, pair.b]) { leg.output.stop(); void leg.pc.close().catch(() => {}); }
  }
  drop(ws: WebSocket): void { for (const pair of [...this.pairs]) if (pair.a.owner.ws === ws || pair.b.owner.ws === ws) this.close(pair); }
  async stop(): Promise<void> { for (const pair of [...this.pairs]) this.close(pair); await Promise.allSettled([...this.creating.values()]); for (const pair of [...this.pairs]) this.close(pair); }
  private async create(a: ClientInfo, b: ClientInfo): Promise<Pair> {
    if (this.pairs.size + this.creating.size >= (this.options.maxPairs ?? 100)) throw Error('Camera media capacity reached');
    const iceServers = await this.options.iceServers();
    if (!this.options.loopbackTest && !iceServers.some(s => [s.urls].flat().some(u => /^turns?:/.test(u)) && s.username && s.credential)) throw Error('Camera media TURN unavailable');
    if (!this.live(a) || !this.live(b)) throw Error('Camera session ended');
    const make = (owner: ClientInfo, other: ClientInfo): Leg => {
      const pc = new RTCPeerConnection({ codecs: { audio: [new RTCRtpCodecParameters({ mimeType: 'audio/opus', clockRate: 48000, channels: 2 })], video: [] },
        iceServers, iceTransportPolicy: this.options.loopbackTest ? 'all' : 'relay',
        ...(this.options.loopbackTest ? { iceAdditionalHostAddresses: ['127.0.0.1'], iceInterfaceAddresses: { udp4: '127.0.0.1' }, iceUseIpv6: false } : {}) });
      const output = new MediaStreamTrack({ kind: 'audio' }); pc.addTrack(output);
      const leg: Leg = { owner, other, pc, output, queue: Promise.resolve(), pending: 0, packetWindow:0, packetCount:0, packetBytes:0 };
      pc.onIceCandidate.subscribe(candidate => { if (candidate) this.emit(leg, 'ice-candidate', candidate.toJSON()); });
      return leg;
    };
    const pair: Pair = { a: make(a,b), b: make(b,a), closed: false };
    this.pairs.add(pair);
    const timeout=setTimeout(()=>{if(pair.a.pc.connectionState!=='connected'||pair.b.pc.connectionState!=='connected')this.close(pair);},30000);
    timeout.unref();
    const wire = (source: Leg, destination: Leg) => {
      let receivedTrack = false;
      source.pc.onTrack.subscribe(track => {
        if (track.kind !== 'audio' || receivedTrack) { this.close(pair); return; }
        receivedTrack = true;
        track.onReceiveRtp.subscribe((packet: RtpPacket) => {
          const now=performance.now();
          if (now-source.packetWindow>=1000) {source.packetWindow=now;source.packetCount=source.packetBytes=0;}
          source.packetCount++;source.packetBytes+=packet.payload.length;
          if (packet.payload.length>1800 || source.packetCount>200 || source.packetBytes>96000) {this.close(pair);return;}
          if (pair.closed || !this.live(source.owner) || !this.live(destination.owner) ||
              enemyCameraVolume(destination.owner, source.owner) <= 0 || destination.pc.connectionState !== 'connected') return;
          // Rebuild the header: do not forward source SSRC, CSRCs or RTP header extensions.
          const clean = packet.clone(); clean.header.extensions = []; clean.header.extension = false; clean.header.csrc = [];
          try { destination.output.writeRtp(clean); } catch { this.close(pair); }
        });
      });
      source.pc.connectionStateChange.subscribe(state => { if (state === 'failed' || state === 'closed') this.close(pair); });
    };
    wire(pair.a,pair.b); wire(pair.b,pair.a);
    return pair;
  }
  async handle(from: ClientInfo, to: ClientInfo, value: unknown): Promise<void> {
    const signal = audioSignal(value);
    if (!signal || !from.enemyCameraCapable || !to.enemyCameraCapable || from.team === to.team || from.roomId !== to.roomId) throw Error('Invalid camera audio signal');
    const payload = signal.payload as any;
    if (!this.options.loopbackTest) {
      if (signal.type === 'ice-candidate' && !safeRelayCandidate(payload.candidate)) throw Error('Camera voice requires a public relay candidate');
      if (signal.type !== 'ice-candidate' && (payload.sdp.split(/^m=/m).length !== 2 ||
          /^a=remote-candidates:/m.test(payload.sdp) || payload.sdp.split(/\r?\n/).some((line: string) => line.startsWith('a=candidate:') && !safeRelayCandidate(line)))) throw Error('Invalid camera audio SDP');
    } else if (signal.type !== 'ice-candidate' && payload.sdp.split(/^m=/m).length !== 2) throw Error('Only one camera audio track is permitted');
    const existing = [...this.pairs].find(p => !p.closed && ((p.a.owner === from && p.b.owner === to) || (p.b.owner === from && p.a.owner === to)));
    const key = [this.id(from),this.id(to)].sort((a,b) => a-b).join(':');
    let creation = this.creating.get(key);
    if (!existing && !creation) {
      if (signal.type !== 'offer') return; // Early trickled candidates are redundant with the browser's offer/retry.
      creation = this.create(from,to); this.creating.set(key,creation);
      void creation.finally(() => { if (this.creating.get(key) === creation) this.creating.delete(key); }).catch(() => {});
    }
    const pair = existing ?? await creation!;
    const leg = pair.a.owner === from ? pair.a : pair.b, other = leg === pair.a ? pair.b : pair.a;
    if (leg.pending >= 12) { this.close(pair); throw Error('Camera signaling queue exceeded'); }
    leg.pending++;
    leg.queue = leg.queue.then(async () => {
      if (pair.closed || !this.live(from) || !this.live(to)) return;
      if (signal.type === 'offer') {
        await leg.pc.setRemoteDescription(payload); await leg.pc.setLocalDescription(await leg.pc.createAnswer());
        this.emit(leg,'answer',{ type: 'answer', sdp: leg.pc.localDescription!.sdp });
        if (!other.pc.localDescription) {
          other.queue = other.queue.then(async () => { await other.pc.setLocalDescription(await other.pc.createOffer()); this.emit(other,'offer',{ type: 'offer', sdp: other.pc.localDescription!.sdp }); });
          await other.queue;
        }
      } else if (signal.type === 'answer') await leg.pc.setRemoteDescription(payload);
      else await leg.pc.addIceCandidate(payload);
    }).catch(error => { this.close(pair); throw error; }).finally(()=>{leg.pending--;});
    await leg.queue;
  }
}
