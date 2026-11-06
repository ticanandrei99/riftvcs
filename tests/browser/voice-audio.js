const { ChampionVoiceEngine } = require('../../src/voice/engine');
const rate = 48000;
function rms(a) { return Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length); }
function magnitude(a, hz) {
  let real = 0, imag = 0;
  for (let i = 0; i < a.length; i++) {
    const phase = 2 * Math.PI * hz * i / rate;
    real += a[i] * Math.cos(phase); imag += a[i] * Math.sin(phase);
  }
  return 2 * Math.hypot(real, imag) / a.length;
}
window.renderVoice = async function(selection, enabled = true, mix = 1) {
  const ctx = new OfflineAudioContext(1, rate * 2, rate);
  const source = ctx.createOscillator(); source.frequency.value = 220;
  const inputGain = ctx.createGain(); inputGain.gain.value = .15;
  const engine = new ChampionVoiceEngine(ctx);
  engine.configure({ enabled, selection, mix });
  source.connect(inputGain); inputGain.connect(engine.input); engine.output.connect(ctx.destination);
  source.start();
  const buffer = await ctx.startRendering();
  const samples = buffer.getChannelData(0).slice(rate / 2, rate * 3 / 2);
  const result = { selection, active: engine.activeVoice, error: engine.lastError ?? null,
    rms: rms(samples), carrier: magnitude(samples,220), lower: magnitude(samples,150), upper:magnitude(samples,290),
    samples: Array.from(samples) };
  engine.dispose();
  return result;
};
window.runAudioProof = async function() {
  const natural = await window.renderVoice('clean');
  const results = [];
  for (const id of ['clean','robot']) {
    const output = await window.renderVoice(id);
    let dot=0, inPower=0, outPower=0;
    for(let i=0;i<output.samples.length;i++) {
      dot+=natural.samples[i]*output.samples[i]; inPower+=natural.samples[i]**2; outPower+=output.samples[i]**2;
    }
    const gain=dot/inPower;
    const residual=Math.sqrt(output.samples.reduce((s,v,i)=>s+(v-gain*natural.samples[i])**2,0)/outPower);
    delete output.samples;
    results.push({...output, gainIndependentDifference:residual});
  }
  const robot=results.find(r=>r.selection==='robot');
  if (robot && !(robot.carrier < .0001 && robot.lower > .06 && robot.upper > .06 && robot.gainIndependentDifference > .95)) throw Error('Robot did not create the expected 150/290 Hz sidebands');
  const disabled=await window.renderVoice('robot',false);
  if(Math.max(...disabled.samples.map((v,i)=>Math.abs(v-natural.samples[i])))>1e-6)throw Error('Disabled effect is not an exact bypass');
  const zeroMix=await window.renderVoice('robot',true,0);
  if(zeroMix.active!=='clean'||Math.max(...zeroMix.samples.map((v,i)=>Math.abs(v-natural.samples[i])))>1e-6)throw Error('Zero strength must report and render Natural voice');
  for(const r of results)if(!Number.isFinite(r.rms)||r.rms<.01||r.error)throw Error('Invalid rendered output: '+r.selection);
  return {offline:results, disabledMatchesNatural:true, transport: robot ? await window.runTransportProof() : null};
};

window.runTransportProof = async function() {
  const { AudioService }=require('../../src/services/audio');
  const { PeerConnection }=require('../../src/services/peer-connection');
  const { setAppAudio }=require('../../src/services/audio-prefs');
  setAppAudio(false);
  const ctx=new AudioContext();await ctx.resume();
  const osc=ctx.createOscillator();osc.frequency.value=220;
  const gain=ctx.createGain();gain.gain.value=.15;
  const raw=ctx.createMediaStreamDestination();osc.connect(gain);gain.connect(raw);osc.start();
  const original=navigator.mediaDevices.getUserMedia;
  navigator.mediaDevices.getUserMedia=async()=>raw.stream.clone();
  const audio=new AudioService({sendSignal(){}},'synthetic-sender',async name=>new PeerConnection(name,[]));
  const receiver=new RTCPeerConnection({iceServers:[]});
  let peer;
  const spectrum=async(analyser)=>{
    await new Promise(r=>setTimeout(r,1200));
    const bins=new Float32Array(analyser.frequencyBinCount);analyser.getFloatFrequencyData(bins);
    const peak=hz=>{let best=-Infinity;const bin=Math.round(hz*analyser.fftSize/ctx.sampleRate);for(let i=bin-1;i<=bin+1;i++)best=Math.max(best,bins[i]);return best;};
    return {carrier:peak(220),lower:peak(150),upper:peak(290)};
  };
  try {
    audio.setVoiceSettings({enabled:true,selection:'clean',mix:1});
    await audio.initMicrophone();
    ({peer}=await audio.ensurePeer('synthetic-receiver',true));
    const sender=peer.pc;
    const sendTrack=sender.getSenders().find(s=>s.track?.kind==='audio').track;
    if(sendTrack.id!==audio.outputStream.getAudioTracks()[0].id||sendTrack.id===audio.localStream.getAudioTracks()[0].id)throw Error('WebRTC is sending the raw microphone track');
    const remote=new Promise(r=>{receiver.ontrack=e=>r(e.streams[0] || new MediaStream([e.track]));});
    const pendingRemote=[],pendingSender=[];
    peer.onIceCandidate=c=>{if(receiver.remoteDescription)receiver.addIceCandidate(c);else pendingRemote.push(c);};
    receiver.onicecandidate=e=>{if(e.candidate){if(sender.remoteDescription)sender.addIceCandidate(e.candidate);else pendingSender.push(e.candidate);}};
    const offer=await peer.createOffer();await receiver.setRemoteDescription(offer);
    for(const c of pendingRemote)await receiver.addIceCandidate(c);
    const answer=await receiver.createAnswer();await receiver.setLocalDescription(answer);await peer.handleAnswer(answer);
    for(const c of pendingSender)await sender.addIceCandidate(c);
    const received=await Promise.race([remote,new Promise((_,j)=>setTimeout(()=>j(Error('No loopback audio track')),5000))]);
    // Chromium needs a playout element to advance a received WebRTC track.
    // Production PeerConnection.tryPlay does this too; keep the test inaudible.
    const playback=new Audio();playback.srcObject=received;playback.muted=true;await playback.play();
    const analyser=ctx.createAnalyser();analyser.fftSize=16384;analyser.smoothingTimeConstant=0;
    ctx.createMediaStreamSource(received).connect(analyser);
    const silent=ctx.createGain();silent.gain.value=0;analyser.connect(silent);silent.connect(ctx.destination);
    for(let i=0;i<60 && sender.connectionState!=='connected';i++)await new Promise(r=>setTimeout(r,100));
    const natural=await spectrum(analyser);
    audio.setVoiceSettings({enabled:true,selection:'robot',mix:1});
    const robot=await spectrum(analyser);
    audio.setVoiceSettings({enabled:false,selection:'robot',mix:1});
    const disabled=await spectrum(analyser);
    const stable=sender.getSenders().find(s=>s.track?.kind==='audio').track===sendTrack;
    if(!stable)throw Error('Changing preset replaced the outbound track');
    if(!(natural.carrier>natural.lower+15 && robot.lower>robot.carrier+15 && robot.upper>robot.carrier+15 && disabled.carrier>disabled.lower+15)) {
      const stats=[];for(const item of (await sender.getStats()).values()) if(['outbound-rtp','media-source','candidate-pair'].includes(item.type)) stats.push(item);
      throw Error('WebRTC spectrum did not follow live preset toggles: '+JSON.stringify({natural,robot,disabled,state:sender.connectionState,source:ctx.state,sendContext:audio.audioContext.state,micError:audio.getMicError(),stats}));
    }
    await audio.audioContext.suspend();audio.setVoiceSettings({enabled:true,selection:'robot',mix:1});for(let attempt=0;attempt<30 && audio.audioContext.state!=='running';attempt++)await new Promise(r=>setTimeout(r,100));
    if(audio.audioContext.state!=='running')throw Error('Transmit context did not resume');
    return {processedTrackSent:true,sameTrackWhileSwitching:stable,connection:sender.connectionState,natural,robot,disabled,contextResumed:true};
  } finally {audio.cleanup();receiver.close();navigator.mediaDevices.getUserMedia=original;osc.stop();raw.stream.getTracks().forEach(t=>t.stop());await ctx.close();}
};




