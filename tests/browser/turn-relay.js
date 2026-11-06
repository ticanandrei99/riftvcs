// Real TURN integration fixture. Only synthetic tones leave this process.
const { SignalingService } = require('../../src/services/signaling');
const { PeerConnection } = require('../../src/services/peer-connection');
const { saveVoiceInvitation, voiceAuthorization } = require('../../src/services/voice-access');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let session;

window.setupRelayParticipant = async ({ name, room, invitation, frequency, team = 'ORDER', loopbackTest = false }) => {
  if (session) throw Error('Participant already initialized');
  if (!saveVoiceInvitation(invitation)) throw Error('Test invitation rejected');
  const ctx = new AudioContext(); await ctx.resume();
  const oscillator = ctx.createOscillator(); oscillator.frequency.value = frequency;
  const gain = ctx.createGain(); gain.gain.value = 0.02;
  const output = ctx.createMediaStreamDestination();
  oscillator.connect(gain).connect(output); oscillator.start();
  const signaling = new SignalingService();
  session = { ctx, oscillator, output, signaling, peer: null, peerPromise: null, errors: [], name };
  window.addEventListener('riftvoice:join-error', event => { session.errors.push(String(event.detail)); });
  const peerFor = remote => {
    if (!session.peerPromise) session.peerPromise = (loopbackTest ? Promise.resolve(new PeerConnection(remote, [], 'all')) : PeerConnection.create(remote)).then(peer => {
      session.peer = peer;
      peer.addLocalStream(output.stream);
      peer.onIceCandidate = candidate => signaling.sendSignal({ type: 'ice-candidate', from: name, to: remote, payload: candidate.toJSON() });
      return peer;
    });
    return session.peerPromise;
  };
  session.peerFor = peerFor;
  let queue = Promise.resolve();
  signaling.joinRoom(room, name, team, () => {}, signal => {
    queue = queue.then(async () => {
      const peer = await peerFor(signal.from);
      if (signal.type === 'offer') {
        const answer = await peer.handleOffer(signal.payload);
        signaling.sendSignal({ type: 'answer', from: name, to: signal.from, payload: answer });
      } else if (signal.type === 'answer') await peer.handleAnswer(signal.payload);
      else if (signal.type === 'ice-candidate') await peer.addIceCandidate(signal.payload);
    }).catch(error => { session.errors.push(String(error)); });
  }, () => {}, remote => { void peerFor(remote).catch(error => { session.errors.push(String(error)); }); });
  for (let i = 0; i < 100 && !voiceAuthorization().Authorization; i++) await wait(100);
  if (!voiceAuthorization().Authorization) throw Error('Production session not authenticated');
  return { authenticated: true, microphoneUsed: false };
};

window.configureCameraProof = options => {
  clearInterval(session.cameraTimer);
  const send = () => {
    session.cameraSequence = options.replay ? session.cameraSequence || 1 : (session.cameraSequence || 0) + 1;
    session.signaling.broadcastPosition({summonerName:session.name,championName:'Synthetic',team:'unused',isDead:!!options.dead,isMuted:false});
    session.signaling.sendEnemyCamera(options.enabled !== false, options.noFrame ? null : {
      sequence:session.cameraSequence,ageMs:0,self:{x:1000,y:1000},
      camera:options.camera || {x:1400,y:1000,w:1600,h:1000},
      visible:options.hidden ? [] : [{name:session.peer.remoteName,x:options.enemyX || 1500,y:1000}]
    });
  };
  if (!options.stopped) {send();session.cameraTimer=setInterval(send,100);}
  return {cameraVoiceSupported:session.signaling.hasEnemyCameraVoice()};
};

window.sampleCameraProof = async () => {
  const pc=session.peer.pc;
  for (let i=0;i<300 && pc.connectionState!=='connected';i++) { if(session.errors.length)throw Error(session.errors.join('; '));await wait(100); }
  if(pc.connectionState!=='connected')throw Error('Media gateway did not connect');
  await wait(800);
  const inbound=async()=>[...(await pc.getStats()).values()].filter(s=>s.type==='inbound-rtp'&&s.kind==='audio').reduce((sum,s)=>sum+(s.bytesReceived||0),0);
  const before=await inbound();
  const analyser=session.ctx.createAnalyser();analyser.fftSize=8192;analyser.smoothingTimeConstant=0;
  const source=session.ctx.createMediaStreamSource(session.peer.remoteStream),quiet=session.ctx.createGain();quiet.gain.value=0;
  source.connect(analyser).connect(quiet).connect(session.ctx.destination);await wait(600);
  const values=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(values);
  const rms=Math.sqrt(values.reduce((s,v)=>s+v*v,0)/values.length);
  source.disconnect();analyser.disconnect();quiet.disconnect();
  const stats=await pc.getStats(),transport=[...stats.values()].find(s=>s.type==='transport'&&s.selectedCandidatePairId);
  const pair=transport&&stats.get(transport.selectedCandidatePairId),local=pair&&stats.get(pair.localCandidateId),remote=pair&&stats.get(pair.remoteCandidateId);
  return {connection:pc.connectionState,iceTransportPolicy:pc.getConfiguration().iceTransportPolicy,localCandidateType:local?.candidateType,remoteCandidateType:remote?.candidateType,receivedBytesDuringSample:(await inbound())-before,rms,errors:session.errors};
};

window.forceCameraPlayback = () => {session.peer.unmute();session.peer.setVolume(1);return true;};

window.offerRelayConnection = async remote => {
  const peer = await session.peerFor(remote);
  session.signaling.sendSignal({ type: 'offer', from: session.name, to: remote, payload: await peer.createOffer() });
  return true;
};

window.waitForRelayConnection = async () => {
  for(let i=0;i<300 && session.peer?.pc.connectionState!=='connected';i++) {
    if(session.errors.length)throw Error(session.errors.join('; '));await wait(100);
  }
  if(session.peer?.pc.connectionState!=='connected')throw Error('Both media gateway legs must connect');
  return true;
};

window.relayStatus = () => ({ authenticated: !!voiceAuthorization().Authorization,
  connection: session?.peer?.pc.connectionState, ice: session?.peer?.pc.iceConnectionState,
  gathering: session?.peer?.pc.iceGatheringState, localDescription: !!session?.peer?.pc.localDescription,
  remoteDescription: !!session?.peer?.pc.remoteDescription, errors: session?.errors || [] });

window.inspectRelayConnection = async expectedHz => {
  for (let i = 0; i < 300 && session.peer?.pc.connectionState !== 'connected'; i++) {
    if (session.errors.length) throw Error(session.errors.join('; '));
    await wait(100);
  }
  const peer = session.peer;
  if (!peer || peer.pc.connectionState !== 'connected') throw Error('TURN connection did not connect');
  const analyser = session.ctx.createAnalyser(); analyser.fftSize = 8192; analyser.smoothingTimeConstant = 0;
  const source = session.ctx.createMediaStreamSource(peer.remoteStream);
  const silence = session.ctx.createGain(); silence.gain.value = 0;
  source.connect(analyser).connect(silence).connect(session.ctx.destination);
  await wait(1500);
  const bins = new Float32Array(analyser.frequencyBinCount); analyser.getFloatFrequencyData(bins);
  let peak = 1; for (let i = 2; i < bins.length; i++) if (bins[i] > bins[peak]) peak = i;
  const peakHz = peak * session.ctx.sampleRate / analyser.fftSize;
  const stats = await peer.pc.getStats();
  const transport = [...stats.values()].find(s => s.type === 'transport' && s.selectedCandidatePairId);
  const pair = transport ? stats.get(transport.selectedCandidatePairId) : [...stats.values()].find(s => s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded');
  const local = pair && stats.get(pair.localCandidateId), remote = pair && stats.get(pair.remoteCandidateId);
  const incoming = [...stats.values()].find(s => s.type === 'inbound-rtp' && s.kind === 'audio');
  const result = { connected: true, iceTransportPolicy: peer.pc.getConfiguration().iceTransportPolicy,
    localCandidateType: local?.candidateType, remoteCandidateType: remote?.candidateType,
    protocol: local?.protocol, receivedBytes: incoming?.bytesReceived || 0, receivedPackets: incoming?.packetsReceived || 0,
    expectedFrequencyHz: expectedHz, observedFrequencyHz: peakHz, peakDb: bins[peak], microphoneUsed: false };
  result.passed = result.iceTransportPolicy === 'relay' && result.localCandidateType === 'relay' && result.remoteCandidateType === 'relay' && result.receivedBytes > 0 && Math.abs(peakHz - expectedHz) < 12 && bins[peak] > -65 && session.errors.length === 0;
  source.disconnect(); analyser.disconnect(); silence.disconnect();
  return result;
};

window.closeRelayParticipant = async () => {
  if (!session) return;
  clearInterval(session.cameraTimer);
  session.peer?.close(); session.signaling.leaveRoom(); session.oscillator.stop();
  session.output.stream.getTracks().forEach(track => track.stop()); await session.ctx.close();
  sessionStorage.removeItem('riftvoice.invitation');
};
