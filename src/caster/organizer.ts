import { SERVER_URL, WS_URL } from '../core/config';
import { validateServerAddress } from '../core/server-address';
declare const __VOXDRIA_VERSION__:string;

interface Pending {id:string;name:string;requestedTeam:'ORDER'|'CHAOS';mode?:'game'|'lobby'}
interface Member {name:string;team:'ORDER'|'CHAOS';connected:boolean;lobby?:boolean;lobbyVoice?:boolean;muted?:boolean}
interface Staff {id:string;kind:'staff'|'caster';name:string;role:'organizer'|'moderator'|'caster';connected:boolean;muted:boolean}
interface Audit {id:string;at:number;actorName:string;actorRole:'organizer'|'moderator';action:'mute'|'unmute'|'mute_denied';eventTitle:string;targetName:string}
interface EventView {id:string;title:string;invite:string;expiresAt:number;bound:boolean;capacity:number;casterInvitation:string;casterName:string;players:Member[];pending:Pending[];staff?:Staff[];lobbyLink?:string}
interface State {type:'organizer_state';persistent:boolean;events:EventView[];audit?:Audit[]}
const short=(x:unknown):x is string=>typeof x==='string'&&x.length>0&&x.length<=64;
export function parseOrganizerState(value:any):State|null{
  if(!value||value.type!=='organizer_state'||typeof value.persistent!=='boolean'||!Array.isArray(value.events)||value.events.length>12)return null;
  if(value.audit!==undefined&&(!Array.isArray(value.audit)||value.audit.length>200||value.audit.some((a:any)=>!a||!short(a.id)||!Number.isSafeInteger(a.at)||!short(a.actorName)||!short(a.targetName)||!short(a.eventTitle)||!['organizer','moderator'].includes(a.actorRole)||!['mute','unmute','mute_denied'].includes(a.action))))return null;
  const ids=new Set<string>();
  for(const e of value.events){
    if(!e||!short(e.id)||ids.has(e.id)||!short(e.title)||!short(e.casterName)||!/^RV-[A-Za-z0-9_-]{43}$/.test(e.invite)||
      !/^[A-Za-z0-9_-]{43}$/.test(e.casterInvitation)||!Number.isSafeInteger(e.expiresAt)||typeof e.bound!=='boolean'||e.capacity!==10||
      !Array.isArray(e.players)||e.players.length>10||!Array.isArray(e.pending)||e.pending.length>20)return null;
    ids.add(e.id);
    if(e.lobbyLink!==undefined&&(typeof e.lobbyLink!=='string'||(e.lobbyLink!==''&&!/^https:\/\/gg\.riotgames\.com\/LOL\?joinCode=[A-Za-z0-9_-]{3,128}$/.test(e.lobbyLink))))return null;
    if(e.players.some((p:any)=>!p||!short(p.name)||!['ORDER','CHAOS'].includes(p.team)||typeof p.connected!=='boolean')||
      e.pending.some((p:any)=>!p||!short(p.id)||!short(p.name)||!['ORDER','CHAOS'].includes(p.requestedTeam)))return null;
    if(e.players.some((p:any)=>(p.lobby!==undefined&&typeof p.lobby!=='boolean')||(p.lobbyVoice!==undefined&&typeof p.lobbyVoice!=='boolean')||(p.muted!==undefined&&typeof p.muted!=='boolean'))||
      (e.staff!==undefined&&(!Array.isArray(e.staff)||e.staff.length>25||e.staff.some((p:any)=>!p||!short(p.id)||!short(p.name)||!['staff','caster'].includes(p.kind)||!['organizer','moderator','caster'].includes(p.role)||typeof p.connected!=='boolean'||typeof p.muted!=='boolean'))))return null;
  }
  return value;
}
const element=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const button=(label:string,action:()=>void,disabled=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.onclick=action;return b;};
const paragraph=(text:string)=>{const p=document.createElement('p');p.textContent=text;return p;};
export function mountOrganizer(connectCaster:(invitation:string)=>void):()=>void{
  const host=element<HTMLElement>('organizer-panel');
  host.className='panel';
  host.innerHTML=`<span class="eyebrow">ORGANIZARE CUSTOM</span><h2>Camera comunității tale</h2>
    <p>Administratorul și moderatorii generează codul vocal și aprobă participanții. Canalul comentatorilor rămâne separat.</p>
    <details><summary>Server vocal</summary><label>Adresa serverului <input id="organizer-server" type="url" autocomplete="off"></label><button id="organizer-save-server" class="quiet">Salvează serverul</button></details>
    <div class="form-grid">
    <label>Cont moderator (gol pentru administrator) <input id="organizer-account" autocomplete="off" maxlength="32"></label>
    <label>Parolă administrator / moderator <input id="organizer-password" type="password" autocomplete="off" maxlength="512"></label>
    </div><div class="actions"><button id="organizer-login">Autentifică</button><button id="organizer-logout" class="quiet" disabled>Ieșire din administrare</button></div>
    <p id="organizer-status" role="status">Neautentificat. Generarea codurilor necesită parola configurată pe server.</p>
    <fieldset id="organizer-controls" disabled hidden><legend>Panou de organizare</legend>
      <details id="organizer-new-room" open><summary>Creează o cameră nouă</summary><div class="form-grid"><label>Numele camerei <input id="organizer-title" maxlength="64" value="Custom comunitate"></label>
      <label>Nume comentator <input id="organizer-caster-name" maxlength="64" value="Comentator"></label>
      <label>Link lobby LoL (opțional, copiat din joc) <input id="organizer-lobby-link" type="url" autocomplete="off" maxlength="300" placeholder="https://gg.riotgames.com/LOL?joinCode=..."></label>
      <label>Valabilitate (ore) <input id="organizer-hours" type="number" min="1" max="12" value="8"></label>
      </div><button id="organizer-create">Generează cod pentru 10 persoane</button></details>
      <label>Cameră activă <select id="organizer-events"></select></label>
      <div id="organizer-event"></div>
      <section id="organizer-audit" aria-label="Istoric de moderare" hidden></section>
    </fieldset>`;
  const server=element<HTMLInputElement>('organizer-server'),password=element<HTMLInputElement>('organizer-password'),login=element<HTMLButtonElement>('organizer-login');
  const logout=element<HTMLButtonElement>('organizer-logout'),controls=element<HTMLFieldSetElement>('organizer-controls'),picker=element<HTMLSelectElement>('organizer-events');
  const detail=element<HTMLElement>('organizer-event'),status=element<HTMLElement>('organizer-status');
  server.value=SERVER_URL;
  let ws:WebSocket|null=null,authenticated=false,role='',state:State|null=null,selected='',shownEvent='';
  const message=(text:string)=>{status.textContent=text;};
  const audit=element<HTMLElement>('organizer-audit');
  const clear=()=>{authenticated=false;role='';state=null;selected='';controls.disabled=true;controls.hidden=true;picker.replaceChildren();detail.replaceChildren();audit.replaceChildren();audit.hidden=true;login.disabled=false;logout.disabled=true;password.value='';};
  const send=(value:unknown)=>{if(authenticated&&ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(value));else message('Autentifică-te mai întâi.');};
  const copy=async(text:string)=>{try{await navigator.clipboard.writeText(text);message('Copiat. Distribuie codul vocal participanților.');}catch{message('Copierea automată nu este disponibilă. Selectează codul și copiază-l manual.');}};
  const render=()=>{
    audit.replaceChildren();audit.hidden=role!=='organizer';
    if(role==='organizer'){
      audit.append(paragraph('Istoric de moderare · ultimele 200 de acțiuni (ora locală)'));
      for(const a of state?.audit||[])audit.append(paragraph(`${new Date(a.at).toLocaleString('ro-RO')} · ${a.actorName} → ${a.targetName} · ${a.action==='mute'?'Mute de moderare':a.action==='unmute'?'Acces reactivat':'Refuz: administrator protejat'} · ${a.eventTitle}`));
      if(!state?.audit?.length)audit.append(paragraph('Nicio acțiune de moderare înregistrată.'));
    }
    const oldIds=new Set(Array.from(picker.options).map(o=>o.value));picker.replaceChildren();
    for(const e of state?.events||[]){const option=document.createElement('option');option.value=e.id;option.textContent=e.title;picker.append(option);if(!oldIds.has(e.id))selected=e.id;}
    if(!state?.events.some(e=>e.id===selected))selected=state?.events[0]?.id||'';
    picker.value=selected;detail.replaceChildren();
    const event=state?.events.find(e=>e.id===selected);
    if(!event){detail.append(paragraph('Nu ai camere active. Generează un cod vocal mai sus.'));return;}
    if(shownEvent!==event.id){element<HTMLDetailsElement>('organizer-new-room').open=false;shownEvent=event.id;}
    const code=document.createElement('input');code.readOnly=true;code.value=event.invite;code.id='organizer-invite';code.setAttribute('aria-label','Cod vocal Voxdria pentru jucători');
    const invitation=`Voxdria · ${event.title}\n${event.lobbyLink?'Lobby LoL: '+event.lobbyLink+'\n':''}Server vocal: ${SERVER_URL}\nCod vocal: ${event.invite}\nIntrodu invitația în Voxdria ${typeof __VOXDRIA_VERSION__==='undefined'?'actualizat':__VOXDRIA_VERSION__} și completează Riot ID-ul. Organizatorul aprobă cererea din Caster. Vocea de lobby este separată pe echipe.`;
    const inviteCard=document.createElement('section');inviteCard.className='invite-card';inviteCard.setAttribute('aria-label','Invitația jucătorilor');
    inviteCard.append(paragraph('Invitația jucătorilor · până la 10 persoane'),code,
      button('Copiază codul',()=>{void copy(event.invite);}),button('Copiază invitația completă',()=>{void copy(invitation);}),
      button('Schimbă codul',()=>send({type:'event_rotate',eventId:event.id})),button('Conectează acest Caster cu rolul meu',()=>send({type:'event_caster',eventId:event.id})),
      button('Închide camera',()=>send({type:'event_close',eventId:event.id})));
    detail.append(inviteCard);
    const lobbyLink=document.createElement('input');lobbyLink.type='url';lobbyLink.maxLength=300;lobbyLink.value=event.lobbyLink||'';lobbyLink.id='organizer-current-lobby-link';lobbyLink.setAttribute('aria-label','Link lobby LoL copiat din joc');
    detail.append(paragraph('Linkul Riot se copiază din clientul LoL. Invitația completă include acest link și codul vocal separat.'),lobbyLink,button('Salvează linkul LoL',()=>send({type:'event_lobby_link',eventId:event.id,lobbyLink:lobbyLink.value.trim()})));
    const connected=event.players.filter(p=>p.connected||p.lobbyVoice).length,blue=event.players.filter(p=>p.team==='ORDER').length,red=event.players.filter(p=>p.team==='CHAOS').length;
    detail.append(paragraph(`${connected}/10 conectați · ${event.players.length}/10 aprobați · Albastru ${blue}/5 · Roșu ${red}/5`),
      paragraph('Expiră: '+new Date(event.expiresAt).toLocaleString('ro-RO')),
      paragraph(event.bound?'Meci identificat: echipele sunt blocate.':'Pregătire: repartizarea vocală nu mută persoanele în clientul LoL.'),
      paragraph('Jucătorii se înscriu cu Riot ID în aplicație. Verifică manual identitatea și echipa din lobby-ul LoL înainte de start.'));
    const pending=document.createElement('section');pending.className='pending-card';pending.setAttribute('aria-label','Cereri în așteptare');pending.append(paragraph('Cereri în așteptare: '+event.pending.length));
    if(!event.pending.length)pending.append(paragraph('Cererile apar aici după ce participanții introduc invitația și Riot ID-ul în Voxdria.'));
    for(const p of event.pending){const row=document.createElement('div');row.className='organizer-person';row.append(paragraph(`${p.name} · ${p.mode==='lobby'?'Înscriere înainte de meci':'Meci detectat · '+(p.requestedTeam==='ORDER'?'Albastru':'Roșu')}`),
      button('Aprobă Albastru',()=>send({type:'event_approve',requestId:p.id,team:'ORDER'}),blue>=5||(p.mode==='game'&&p.requestedTeam!=='ORDER')),
      button('Aprobă Roșu',()=>send({type:'event_approve',requestId:p.id,team:'CHAOS'}),red>=5||(p.mode==='game'&&p.requestedTeam!=='CHAOS')),
      button('Respinge',()=>send({type:'event_reject',requestId:p.id})));pending.append(row);}
    detail.append(pending);
    const players=document.createElement('section');players.setAttribute('aria-label','Jucători aprobați');players.append(paragraph('Jucători aprobați'));
    const teamGrid=document.createElement('div');teamGrid.className='team-grid';
    const teams=new Map<string,HTMLElement>();for(const team of ['ORDER','CHAOS']){const card=document.createElement('section');card.className='team-card '+(team==='ORDER'?'blue':'red');const heading=document.createElement('h3');heading.textContent=(team==='ORDER'?'Albastru':'Roșu')+' · '+(team==='ORDER'?blue:red)+'/5';card.append(heading);teams.set(team,card);teamGrid.append(card);}players.append(teamGrid);
    for(const p of event.players){const row=document.createElement('div');row.className='organizer-person';row.append(paragraph(`${p.name} · ${p.team==='ORDER'?'Albastru':'Roșu'} · ${p.muted?'Mute de moderare':p.connected?'Conectat vocal în meci':p.lobbyVoice?'Conectat vocal în lobby':p.lobby?'Înscris în aplicație':'Aprobat, neconectat'}`),
      button('Mută în '+(p.team==='ORDER'?'Roșu':'Albastru'),()=>send({type:'event_move',eventId:event.id,name:p.name,team:p.team==='ORDER'?'CHAOS':'ORDER'}),event.bound||(p.team==='ORDER'?red:blue)>=5),
      button(p.muted?'Reactivează accesul vocal':'Mute de moderare',()=>send({type:'event_moderate',eventId:event.id,kind:'player',targetId:p.name,muted:!p.muted})),
      button('Elimină',()=>send({type:'event_remove',eventId:event.id,name:p.name})));teams.get(p.team)!.append(row);}
    for(const [team,card] of teams)for(let slot=event.players.filter(p=>p.team===team).length;slot<5;slot++){const empty=document.createElement('div');empty.className='empty-slot';empty.textContent='Loc disponibil';card.append(empty);}
    detail.append(players);
    if(!event.bound&&event.players.length>=2){
      const first=document.createElement('select'),second=document.createElement('select');first.setAttribute('aria-label','Primul jucător pentru schimb');second.setAttribute('aria-label','Al doilea jucător pentru schimb');
      for(const p of event.players)for(const s of [first,second]){const option=document.createElement('option');option.value=p.name;option.textContent=p.name;s.append(option);}
      second.selectedIndex=1;detail.append(first,second,button('Schimbă locurile între jucători',()=>send({type:'event_swap',eventId:event.id,first:first.value,second:second.value})));
    }
    const staff=document.createElement('section');staff.className='staff-card';staff.setAttribute('aria-label','Comentatori și moderare');staff.append(paragraph('Canal izolat · comentatori'));
    for(const p of event.staff||[]){const row=document.createElement('div');row.className='organizer-person';row.append(paragraph(`${p.name} · ${p.role==='organizer'?'Administrator':p.role==='moderator'?'Moderator':'Caster invitat'} · ${p.muted?'Mute de moderare':p.connected?'Conectat':'Neconectat'}`),
      button(p.role==='organizer'&&role==='moderator'?'Administrator protejat':p.muted?'Reactivează accesul vocal':'Mute de moderare',()=>send({type:'event_moderate',eventId:event.id,kind:p.kind,targetId:p.id,muted:!p.muted}),p.role==='organizer'&&role==='moderator'));staff.append(row);}
    detail.append(staff,paragraph('Mute de moderare suspendă conexiunea vocală (transmisie și ascultare) până la reactivare și reconectare manuală. Mute pentru mine rămâne personal.'),
      paragraph(state?.persistent?'Camerele și istoricul sunt păstrate în stocarea privată a operatorului.':'Camerele și istoricul sunt temporare: se pierd la repornirea serverului.'));
  };
  picker.onchange=()=>{selected=picker.value;render();};
  element<HTMLButtonElement>('organizer-save-server').onclick=()=>{
    const address=validateServerAddress(server.value);if(!address){message('Introdu o origine HTTPS validă, fără cale sau parolă.');return;}
    try{localStorage.setItem('riftvoice.server',address);window.location.reload();}catch{message('Adresa serverului nu poate fi salvată.');}
  };
  login.onclick=()=>{
    const value=password.value;if(!value){message('Introdu parola de administrator sau moderator.');return;}
    const account=element<HTMLInputElement>('organizer-account').value.trim();
    ws?.close();clear();let secret=value;login.disabled=true;message('Se verifică parola…');
    const socket=new WebSocket(WS_URL.replace(/\/ws$/,'/organizer'));ws=socket;
    socket.onopen=()=>{if(ws!==socket)return;socket.send(JSON.stringify({type:'organizer_auth',password:secret,account}));secret='';};
    socket.onmessage=event=>{
      if(ws!==socket)return;
      let value:any;try{value=JSON.parse(event.data);}catch{message('Răspuns invalid de la server.');return;}
      if(value.type==='organizer_ready'&&['organizer','moderator'].includes(value.role)){
        authenticated=true;role=value.role;password.value='';controls.hidden=false;controls.disabled=false;logout.disabled=false;
        message('Autentificat: '+String(value.name||'')+' · '+(role==='moderator'?'Moderator':'Administrator')+'. Poți genera coduri și administra cele 10 locuri.');
      }else if(value.type==='organizer_error'){message(String(value.message||'Operația nu a reușit.'));if(!authenticated)login.disabled=false;}
      else if(authenticated&&value.type==='organizer_caster_invitation'&&typeof value.invitation==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value.invitation))connectCaster(value.invitation);
      else if(authenticated){const next=parseOrganizerState(value);if(next){state=next;render();}}
    };
    socket.onerror=()=>{secret='';message('Conexiune eșuată. Verifică serverul.');};
    socket.onclose=event=>{secret='';if(ws!==socket)return;ws=null;clear();message(event.reason||'Administrarea este deconectată. Autentifică-te din nou.');};
  };
  logout.onclick=()=>{const old=ws;ws=null;old?.close();clear();message('Ai ieșit din administrare.');};
  element<HTMLButtonElement>('organizer-create').onclick=()=>send({type:'event_create',title:element<HTMLInputElement>('organizer-title').value.trim(),casterName:element<HTMLInputElement>('organizer-caster-name').value.trim(),hours:Number(element<HTMLInputElement>('organizer-hours').value),lobbyLink:element<HTMLInputElement>('organizer-lobby-link').value.trim()});
  const stop=()=>{const old=ws;ws=null;old?.close();clear();};window.addEventListener('beforeunload',stop,{once:true});
  return stop;
}
