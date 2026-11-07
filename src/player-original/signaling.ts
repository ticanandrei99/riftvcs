import {SignalingService as OriginalSignaling} from '../upstream/services/signaling';
import {SignalingService as AuthenticatedSignaling} from '../services/signaling';
import {WS_URL} from '../core/config';
import {diagnose} from './diagnostics';

/** Authentication/transport boundary only. The upstream engine is unchanged. */
export class ApprovedSignaling extends OriginalSignaling {
  private readonly transportClient=new AuthenticatedSignaling(false,{endpoint:WS_URL.replace(/\/ws$/,'/player/ws'),originalPlayer:true});
  override joinRoom(...args:Parameters<OriginalSignaling['joinRoom']>):void{
    diagnose('admission','joining');this.transportClient.joinRoom(...args);
  }
  override broadcastPosition(...args:Parameters<OriginalSignaling['broadcastPosition']>):void{this.transportClient.broadcastPosition(...args);}
  override sendCoords(...args:Parameters<OriginalSignaling['sendCoords']>):void{this.transportClient.sendCoords(...args);}
  override setSharedReset(...args:Parameters<OriginalSignaling['setSharedReset']>):void{this.transportClient.setSharedReset(...args);}
  override setOnRemoteReset(...args:Parameters<OriginalSignaling['setOnRemoteReset']>):void{this.transportClient.setOnRemoteReset(...args);}
  override requestResetAll():boolean{return this.transportClient.requestResetAll();}
  override getCurrentRoom():string|null{return this.transportClient.getCurrentRoom();}
  override getLocalName():string{return this.transportClient.getLocalName();}
  override sendSignal(...args:Parameters<OriginalSignaling['sendSignal']>):void{this.transportClient.sendSignal(...args);}
  override leaveRoom():void{diagnose('admission','closed');this.transportClient.leaveRoom();}
}
