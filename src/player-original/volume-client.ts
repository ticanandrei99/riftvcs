import {VolumeClient as OriginalVolumeClient} from '../upstream/services/volume-client';
import {SERVER_URL} from '../core/config';
import {voiceAuthorization} from '../services/voice-access';
import {diagnose} from './diagnostics';

/** Adds the approved session to the unchanged engine's volume request. No volume math. */
export class ApprovedVolumeClient extends OriginalVolumeClient {
  override async computeVolumes(...args:Parameters<OriginalVolumeClient['computeVolumes']>):ReturnType<OriginalVolumeClient['computeVolumes']>{
    const headers=voiceAuthorization();if(!headers.Authorization)return {myBlob:'',peerVolumes:{}};
    const [myPosition,roomId,name,allyProximity,alliesOnly=false]=args;
    try{
    const response=await fetch(SERVER_URL+'/player/compute-volumes',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({myPosition,roomId,name,allyProximity,...(alliesOnly?{alliesOnly:true}:{})}),signal:AbortSignal.timeout(2000),cache:'no-store'});
    if(!response.ok){diagnose('volume','http-failed');throw Error('Original voice volume request failed: '+response.status);}
    const result=await response.json();
    if(!result||!result.peerVolumes||typeof result.peerVolumes!=='object'||Array.isArray(result.peerVolumes)||Object.keys(result.peerVolumes).length>20||Object.values(result.peerVolumes).some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1))throw Error('Invalid original voice volume response');
    return {myBlob:'',peerVolumes:result.peerVolumes};
    }catch{diagnose('volume','http-failed');return {myBlob:'',peerVolumes:{}};}
  }
}
