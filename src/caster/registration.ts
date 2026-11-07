import {WS_URL} from '../core/config';
import {validApprovedCaster,type ApprovedCaster,type CasterRole} from './invitation';

/** No media is opened here. Only an organizer-issued private grant can enter /caster. */
export function registerCaster(name:string,invitation:string,requestedRole:CasterRole,notify:(message:string)=>void,approved:(grant:ApprovedCaster)=>void,ended:()=>void=()=>{}):()=>void{
  let socket:WebSocket;
  try{socket=new WebSocket(WS_URL.replace(/\/ws$/,'/registration'));}
  catch{notify('Cererea nu se poate conecta la server. Verifică adresa și versiunea serverului.');ended();return()=>{};}
  let active=true,pending=false,deadline:ReturnType<typeof setTimeout>;
  const fail=(message:string)=>{if(!active)return;active=false;clearTimeout(deadline);notify(message);ended();socket.close();};
  deadline=setTimeout(()=>fail('Serverul nu a confirmat cererea. Verifică adresa și versiunea serverului.'),20000);
  socket.onopen=()=>{if(active)socket.send(JSON.stringify({type:'caster_register',name,invitation,requestedRole}));};
  socket.onmessage=event=>{
    if(!active)return;let value:any;try{value=JSON.parse(event.data);}catch{fail('Răspuns invalid de la server.');return;}
    if(value?.type==='caster_pending'&&!pending){pending=true;clearTimeout(deadline);deadline=setTimeout(()=>fail('Cererea a expirat. Trimite o cerere nouă.'),5*60000+1000);notify('Cerere trimisă · așteaptă aprobarea organizatorului (maximum 5 minute).');}
    else if(value?.type==='caster_approved'&&pending&&validApprovedCaster(value)&&value.name===name.trim()&&(requestedRole!=='spectator'||value.role==='spectator')){
      active=false;clearTimeout(deadline);socket.close();approved({invitation:value.invitation,name:value.name,role:value.role,expiresAt:value.expiresAt});
    }else if(value?.type==='error')fail(typeof value.message==='string'?value.message.slice(0,500):'Cererea nu a fost aprobată.');
    else if(value?.type==='caster_approved')fail('Aprobarea primită nu este validă pentru rolul cerut.');
  };
  socket.onerror=()=>fail('Cererea nu se poate conecta la server. Verifică adresa și versiunea serverului.');
  socket.onclose=()=>fail(pending?'Cererea a fost închisă. Trimite o cerere nouă.':'Serverul nu a acceptat înscrierea. Actualizează serverul pentru invitațiile de comentatori.');
  return()=>{active=false;clearTimeout(deadline);socket.close();};
}
