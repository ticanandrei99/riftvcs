import { describe, it, expect } from 'vitest';
import { enemyCameraVolume, readEnemyCamera, CAMERA_LEASE_MS, type CameraParticipant } from '../src/enemy-camera.js';
import { safeRelayCandidate } from '../src/camera-media.js';
const now=10000;
const report=(extra:any={})=>({enabled:true,report:{sequence:1,ageMs:0,self:{x:1000,y:1000},camera:{x:1500,y:1000,w:2000,h:1000},visible:[{name:'Enemy',x:1500,y:1000}],...extra}});
function participants(){
  const listener:CameraParticipant={name:'Listener',team:'ORDER',roomId:'custom',isDead:false,enemyCamera:readEnemyCamera(report(),undefined,now)};
  const speaker:CameraParticipant={name:'Enemy',team:'CHAOS',roomId:'custom',isDead:false,enemyCamera:readEnemyCamera({enabled:true},undefined,now)};
  return {listener,speaker};
}
describe('camera enemy delivery leases',()=>{
  it('allows only visible enemies inside camera and proximity, with directional listening',()=>{
    const {listener,speaker}=participants();
    expect(enemyCameraVolume(listener,speaker,now)).toBe(1);
    expect(enemyCameraVolume(speaker,listener,now)).toBe(0);
    listener.enemyCamera=readEnemyCamera(report({visible:[{name:'Enemy',x:2125,y:1000}]}),undefined,now);
    expect(enemyCameraVolume(listener,speaker,now)).toBeCloseTo(.25);
  });
  it.each([
    ['hidden',{visible:[]}],['outside camera',{camera:{x:1000,y:1000,w:300,h:300}}],
    ['too far',{camera:{x:3000,y:1000,w:6000,h:1000},visible:[{name:'Enemy',x:3000,y:1000}]}],
    ['range boundary',{visible:[{name:'Enemy',x:2350,y:1000}]}],['expired frame',{ageMs:CAMERA_LEASE_MS}],
    ['huge camera',{camera:{x:1000,y:1000,w:16000,h:16000}}],['no camera',{camera:null}],['bad position',{self:{x:NaN,y:0}}],
    ['ambiguous duplicate',{visible:[{name:'Enemy',x:1500,y:1000},{name:'Enemy',x:1600,y:1000}]}]
  ])('blocks %s',(_label,extra)=>{
    const {listener,speaker}=participants();listener.enemyCamera=readEnemyCamera(report(extra),undefined,now);
    expect(enemyCameraVolume(listener,speaker,now)).toBe(0);
  });
  it('expires without new frames and cannot renew a replayed sequence',()=>{
    const {listener,speaker}=participants();
    listener.enemyCamera=readEnemyCamera(report(),listener.enemyCamera,now+300);
    expect(listener.enemyCamera.expiresAt).toBe(now+CAMERA_LEASE_MS);
    speaker.enemyCamera=readEnemyCamera({enabled:true},speaker.enemyCamera,now+400);
    expect(enemyCameraVolume(listener,speaker,now+CAMERA_LEASE_MS)).toBe(0);
    listener.enemyCamera=readEnemyCamera(report({sequence:2}),listener.enemyCamera,now+500);
    expect(enemyCameraVolume(listener,speaker,now+500)).toBe(1);
  });
  it.each(['isDead','isMuted'])('blocks a speaker with %s',field=>{
    const {listener,speaker}=participants();(speaker as any)[field]=true;expect(enemyCameraVolume(listener,speaker,now)).toBe(0);
  });
  it('blocks unknown life state, own team, another room and disabled consent',()=>{
    const {listener,speaker}=participants();
    for(const change of [{isDead:undefined},{team:'ORDER'},{roomId:'other'},{enemyCamera:undefined}])
      expect(enemyCameraVolume(listener,{...speaker,...change},now)).toBe(0);
    listener.isDead=true;expect(enemyCameraVolume(listener,speaker,now)).toBe(0);
  });
  it('does not use a hidden sender position or a caller-supplied distance',()=>{
    const {listener,speaker}=participants();(speaker as any).position={x:99999,y:99999};
    expect(enemyCameraVolume(listener,speaker,now)).toBe(1);
    listener.enemyCamera=readEnemyCamera({enabled:false},listener.enemyCamera,now);expect(enemyCameraVolume(listener,speaker,now)).toBe(0);
  });
});
describe('camera relay candidate validation',()=>{
  it('accepts public relay addresses only',()=>{
    const candidate=(address:string,type='relay')=>`candidate:1 1 udp 100 ${address} 3478 typ ${type}`;
    expect(safeRelayCandidate(candidate('8.8.8.8'))).toBe(true);
    for(const address of ['127.0.0.1','10.0.0.1','192.168.1.1','172.16.0.1','169.254.169.254','100.64.0.1','0.0.0.0','224.0.0.1','::1','host.local'])
      expect(safeRelayCandidate(candidate(address))).toBe(false);
    expect(safeRelayCandidate(candidate('8.8.8.8','host'))).toBe(false);
  });
});
