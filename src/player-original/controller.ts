import {Orchestrator,type OrchestratorDeps} from '../upstream/services/orchestrator';
import {GameStateService} from '../upstream/services/game-state';
import {AudioService} from '../upstream/services/audio';
import {PeerConnection} from '../upstream/services/peer-connection';
import {getIceServers} from '../core/config';
import {hasUsableTurnServers} from '../services/privacy';
import {ApprovedSignaling} from './signaling';
import {ApprovedVolumeClient} from './volume-client';
import {diagnose} from './diagnostics';
import {voiceInvitation} from '../services/voice-access';

class ObservedGameState extends GameStateService {
  override async pollGameState(){const state=await super.pollGameState();window.dispatchEvent(new CustomEvent('riftvoice:game-active',{detail:state.isInGame===true}));return voiceInvitation()?state:{...state,isInGame:false};}
}
class ObservedAudio extends AudioService {
  override async initMicrophone():Promise<void>{await super.initMicrophone();diagnose('engine',this.getMicError()?'microphone-blocked':'microphone-ready');}
}

/** Uses upstream's supported factories; tracking, camera and audio algorithms stay verbatim. */
export class PlayerController extends Orchestrator {
  constructor(deps:Partial<OrchestratorDeps>={}){super({
    createGameState:()=>new ObservedGameState(),
    createSignaling:()=>new ApprovedSignaling(),
    createVolumeClient:()=>new ApprovedVolumeClient(),
    createAudio:(signaling,name)=>new ObservedAudio(signaling,name,async remote=>{
      const ice=await getIceServers();if(!hasUsableTurnServers(ice)){diagnose('peer','no-turn');throw Error('TURN indisponibil pentru vocea privată.');}
      return PeerConnection.create(remote);
    }),
    ...deps,
  });window.addEventListener('voxdria:player-access-stopped',()=>this.stop());window.addEventListener('riftvoice:credentials-cleared',()=>this.stop());
    window.addEventListener('riftvoice:join-status',event=>{const status=String((event as CustomEvent).detail||'');if(status==='Conectat la camera vocală aprobată.')diagnose('admission','ready');else if(status.startsWith('Cerere trimisă.'))diagnose('admission','pending');});
  }
  override start():void{diagnose('engine','starting');super.start();}
  override stop():void{diagnose('engine','stopped');super.stop();}
  refreshVoiceInvitation():void{this.stop();if(voiceInvitation())this.start();}
}
