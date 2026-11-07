jest.mock('../../src/services/devices', () => ({ getStoredInputDeviceId: () => null, getStoredOutputDeviceId: () => null }));
import { AudioService } from '../../src/services/audio';
import { PeerConnection } from '../../src/services/peer-connection';
function makePeer() {
  return { mute: jest.fn(), unmute: jest.fn(), setVolume: jest.fn(), close: jest.fn(), setOutputDevice: jest.fn().mockResolvedValue(undefined), addLocalStream: jest.fn(), createOffer: jest.fn().mockResolvedValue({ type:'offer',sdp:'test' }) };
}
test.each(['ally','enemy'])('local mute silences %s immediately, survives volume changes and reconnect', async remote => {
  const peers = [makePeer(), makePeer()]; let index = 0;
  const audio = new AudioService({ sendSignal: jest.fn() } as any, 'local', async () => peers[index++] as unknown as PeerConnection);
  await audio.connectToPeer(remote, false);
  expect(audio.toggleMutePlayer(remote)).toBe(true);
  expect(peers[0].mute).toHaveBeenCalled();
  audio.applyPeerVolumes({ [remote]: 1 }); audio.setPlayerVolume(remote, 0.7);
  expect(peers[0].unmute).not.toHaveBeenCalled();
  audio.disconnectPeer(remote); await audio.connectToPeer(remote, false);
  expect(audio.isPlayerMuted(remote)).toBe(true);
  expect(peers[1].mute).toHaveBeenCalled();
  audio.applyPeerVolumes({ [remote]: 1 });
  expect(peers[1].unmute).not.toHaveBeenCalled();
  expect(audio.toggleMutePlayer(remote)).toBe(false);
  expect(peers[1].unmute).toHaveBeenCalledTimes(1);
});
test('unmuting one person cannot override mute-all, and mute-all preserves individual choices', async () => {
  const one = makePeer(), two = makePeer(); let index = 0;
  const audio = new AudioService({ sendSignal: jest.fn() } as any, 'local', async () => [one,two][index++] as unknown as PeerConnection);
  await audio.connectToPeer('one', false); await audio.connectToPeer('two', false);
  audio.toggleMutePlayer('one'); audio.toggleMutePlayer('two'); audio.setMuteAll(true);
  audio.toggleMutePlayer('one');
  expect(one.unmute).not.toHaveBeenCalled();
  audio.setMuteAll(false);
  expect(one.unmute).toHaveBeenCalledTimes(1);
  expect(two.unmute).not.toHaveBeenCalled(); expect(audio.isPlayerMuted('two')).toBe(true);
});

test('the incoming stream gate cannot be bypassed by individual unmute, deafen, volume refresh or reconnect',async()=>{
  const peers=[makePeer(),makePeer()];let index=0;
  const audio=new AudioService({sendSignal:jest.fn()},'local',async()=>peers[index++] as unknown as PeerConnection);
  await audio.connectToPeer('ally',false);audio.setIncomingMuted(true);audio.toggleMutePlayer('ally');audio.toggleMutePlayer('ally');audio.setMuteAll(true);audio.setMuteAll(false);
  audio.applyPeerVolumes({ally:1});audio.setPlayerVolume('ally',1);expect(peers[0].unmute).not.toHaveBeenCalled();
  audio.disconnectPeer('ally');await audio.connectToPeer('ally',false);expect(peers[1].mute).toHaveBeenCalled();expect(peers[1].unmute).not.toHaveBeenCalled();
  audio.setIncomingMuted(false);expect(peers[1].unmute).toHaveBeenCalled();
});
