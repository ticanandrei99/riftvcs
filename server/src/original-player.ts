import {EventEmitter} from 'node:events';
import type {WebSocket,RawData} from 'ws';
import {authorizeGrant,type VoiceGrant,SessionRegistry} from './access.js';
import type {OrganizerEvents} from './organizer-events.js';
import type {RoomManager as ControlRooms} from './rooms.js';
import type {Heartbeat} from './heartbeat.js';
import {RoomManager} from './upstream/rooms.js';
import {handleConnection} from './upstream/ws-handler.js';
import {computeTieredVolumes} from './upstream/volumes.js';
import type {LivenessTracker} from './upstream/heartbeat.js';
import {validateJoin} from './validate.js';
import {audioSignal} from './audio-signal.js';
import {sendJson} from './send.js';
import {TokenBucket,LIMITS} from './rate-limit.js';

/** Socket facade keeps admission outside the byte-identical upstream relay. */
class ApprovedSocket extends EventEmitter {
  readonly OPEN=1;
  constructor(readonly raw:WebSocket,private output:(value:any)=>void){super();this.on('error',()=>{});}
  get readyState(){return this.raw.readyState;}
  get bufferedAmount(){return this.raw.bufferedAmount;}
  send(data:string){let value:unknown;try{value=JSON.parse(data);}catch{return;}this.output(value);}
  close(code?:number,reason?:string){this.raw.close(code,reason);}
  terminate(){this.raw.terminate();}
}

/** Original player-only engine. Caster rooms, grants and handlers are not reused. */
export class OriginalPlayerVoice {
  private readonly rooms=new RoomManager();
  private readonly active=new Map<WebSocket,{socket:ApprovedSocket;grant:VoiceGrant}>();
  constructor(private grants:VoiceGrant[],private sessions:SessionRegistry,private control:ControlRooms,private events?:OrganizerEvents){}
  get roomCount(){return this.rooms.roomCount;}
  owns(ws:WebSocket){return this.active.has(ws);}
  compute(ws:WebSocket,body:unknown){
    const entry=this.active.get(ws);if(!entry||!this.sessions.has(ws))throw Error('Original player session required');
    const value=body as any;if(!value||typeof value!=='object'||Array.isArray(value)||value.roomId!==entry.grant.room||value.name!==entry.grant.name||
      typeof value.allyProximity!=='boolean'||(value.alliesOnly!==undefined&&typeof value.alliesOnly!=='boolean')||
      !value.myPosition||!Number.isFinite(value.myPosition.x)||!Number.isFinite(value.myPosition.y)||value.myPosition.x<0||value.myPosition.y<0||value.myPosition.x>16000||value.myPosition.y>16000)throw Error('Invalid original volume request');
    return computeTieredVolumes({myPosition:value.myPosition,roomId:entry.grant.room,name:entry.grant.name,allyProximity:value.allyProximity,alliesOnly:value.alliesOnly===true},room=>this.rooms.getRoomClients(room));
  }
  handle(ws:WebSocket,heartbeat:Heartbeat):void{
    const limiter=new TokenBucket(LIMITS.WS_MESSAGES);let expiry:ReturnType<typeof setTimeout>|undefined;
    const error=(message:string)=>sendJson(ws,{type:'error',message});
    const facade=new ApprovedSocket(ws,value=>{
      if(value?.type==='room_state'){
        const entry=this.active.get(ws);if(!entry)return;
        const sessionToken=this.sessions.create(entry.grant,ws);
        const joined=this.control.join('__original__'+entry.grant.room,entry.grant.name,ws,entry.grant.team);
        if(joined.evicted&&joined.evicted.ws!==ws)joined.evicted.ws.close(4000,'Original player session replaced');
        sendJson(ws,{...value,sessionToken,role:'player',originalPlayerProtocol:1,teamIsolation:true,enemyCameraVoice:false});this.events?.playerChanged();
      }else sendJson(ws,value);
    });
    ws.on('message',(raw:RawData)=>{
      try{
        heartbeat.markAlive(ws);if(!limiter.tryConsume('original')){error('Original player rate limit');return;}
        let msg:any;try{msg=JSON.parse(raw.toString());}catch{error('Invalid JSON');return;}
        if(!msg||typeof msg!=='object'||Array.isArray(msg))throw Error('Invalid original player message');
        let entry=this.active.get(ws);
        if(!entry){
          if(msg.type!=='join')throw Error('Player invitation required');
          const valid=validateJoin(msg.room,msg.name);if(!valid.ok)throw Error(valid.error);
          if(this.events?.requestJoin(ws,{room:valid.room,name:valid.name,team:msg.team,invitation:msg.invitation,eventInviteProtocol:msg.eventInviteProtocol}))return;
          const grant=authorizeGrant(this.grants,msg.invitation);
          if(!grant||grant.role!=='player'||grant.room!==valid.room||grant.name!==valid.name||grant.team!==msg.team||
            (this.events&&!this.events.permitsGrant(valid.room,grant)))throw Error('Invitație de jucător invalidă, expirată sau oprită de organizator.');
          entry={socket:facade,grant};this.active.set(ws,entry);
          const liveness={markAlive:()=>heartbeat.markAlive(ws)} as unknown as LivenessTracker;
          handleConnection(facade as unknown as WebSocket,this.rooms,liveness);
          expiry=setTimeout(()=>ws.close(4003,'Player invitation expired'),Math.min(2147483647,grant.expiresAt-Date.now()));expiry.unref();
        }else if(!this.sessions.has(ws)||!authorizeGrant(this.grants,entry.grant.token)){
          ws.close(4003,'Player access revoked');return;
        }
        if(msg.type==='join'){
          if(msg.room!==entry.grant.room||msg.name!==entry.grant.name||msg.team!==entry.grant.team)throw Error('Original player identity is fixed');
          facade.emit('message',Buffer.from(JSON.stringify({type:'join',room:entry.grant.room,name:entry.grant.name,team:entry.grant.team,sharedReset:msg.sharedReset===true})));return;
        }
        if(msg.type==='signal'&&!audioSignal(msg.payload))throw Error('Only audio signaling is permitted');
        if(msg.type==='position'){
          let identity:any;try{identity=JSON.parse(msg.blob);}catch{throw Error('Invalid player status');}
          if(!identity||identity.summonerName!==entry.grant.name||identity.team!==entry.grant.team||typeof identity.championName!=='string'||identity.championName.length>64||typeof identity.isMuted!=='boolean'||typeof identity.isDead!=='boolean')throw Error('Invalid player status');
          msg={type:'position',blob:JSON.stringify({summonerName:entry.grant.name,team:entry.grant.team,championName:identity.championName,isMuted:identity.isMuted,isDead:identity.isDead})};
        }
        if(!['coords','signal','position','shared_reset','reset_all'].includes(msg.type))throw Error('Original player message denied');
        facade.emit('message',Buffer.from(JSON.stringify(msg)));
      }catch(err){error(err instanceof Error?err.message:'Original player request failed');}
    });
    ws.once('close',()=>{clearTimeout(expiry);facade.emit('close');this.active.delete(ws);this.control.leave(ws);this.sessions.revoke(ws);this.events?.playerChanged();});
  }
}
