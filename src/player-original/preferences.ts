import {setCameraOnly,setAllyProximity} from '../upstream/services/audio-prefs';
import {setForceTurnRelay} from '../upstream/services/privacy';
/** Configure supported upstream options, without editing the upstream algorithms. */
export function applyOriginalPlayerDefaults():void{
  try{
    if(localStorage.getItem('voxdria.original-player.defaults.v1')!=='1'){
      setCameraOnly(true);setAllyProximity(true);localStorage.setItem('voxdria.original-player.defaults.v1','1');
    }
    setForceTurnRelay(true);
  }catch{/* Upstream preference readers have their own safe defaults. */}
}
