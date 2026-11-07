/** Local development-page proof. Uses synthetic credentials, no microphone or Riot account. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process');
const {WebSocket:NodeSocket}=require('../server/node_modules/ws');
const webpack=require('webpack');
const root=path.resolve(__dirname,'..'),port=32007,webPort=9341,debugPort=9338;
const adminPassword='ui-test-only-admin-password',moderatorPassword='ui-test-only-dani-password';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(read,label){for(let i=0;i<150;i++){const value=await read();if(value)return value;await delay(60);}throw Error('UI timeout: '+label);}
async function main(){
  const output=path.join(root,'verification/organizer-browser');fs.mkdirSync(output,{recursive:true});
  const config=require('../webpack.config.js');config.entry=path.join(root,'tests/browser/organizer.js');
  config.output={path:output,filename:'bundle.js'};config.mode='development';config.devtool=false;
  config.plugins=[new webpack.DefinePlugin({__PROXCHAT_SERVER__:JSON.stringify('http://127.0.0.1:'+port),__VOXDRIA_VERSION__:JSON.stringify(require('../package.json').version)})];
  await new Promise((yes,no)=>webpack(config,(err,stats)=>err?no(err):stats.hasErrors()?no(Error(stats.toString({all:false,errors:true}))):yes()));
  const backend=spawn(process.execPath,['dist/index.js'],{cwd:path.join(root,'server'),env:{...process.env,PORT:String(port),ORGANIZER_PASSWORD:adminPassword,MODERATOR_PASSWORD:'',MODERATOR_ACCOUNTS_JSON:JSON.stringify([{name:'Dani',password:moderatorPassword}]),ORGANIZER_STORE_PATH:'',PLAYER_GRANTS_JSON:'[]',CASTER_GRANTS_JSON:'[]',RIFTVOICE_INSECURE_TEST_MODE:'0',ENEMY_CAMERA_VOICE:'0',CAMERA_MEDIA_LOOPBACK_TEST:'0',ALLOWED_WEB_ORIGINS:'http://127.0.0.1:'+webPort},windowsHide:true,stdio:'ignore'});
  const html=fs.readFileSync(path.join(root,'src/caster/caster.html'),'utf8').replace('<script src="caster.js"></script>','<script src="/bundle.js"></script>');
  const server=http.createServer((req,res)=>{const script=req.url==='/bundle.js',style=req.url==='/caster.css';res.setHeader('Content-Type',script?'text/javascript':style?'text/css':'text/html; charset=utf-8');res.end(script?fs.readFileSync(path.join(output,'bundle.js')):style?fs.readFileSync(path.join(root,'src/caster/caster.css')):html);});
  let edge,socket;const clients=[],results=[];
  try{
    await until(async()=>{try{return(await fetch('http://127.0.0.1:'+port+'/health')).ok;}catch{return false;}},'backend startup');
    await new Promise(r=>server.listen(webPort,'127.0.0.1',r));
    edge=spawn(process.env.EDGE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port='+debugPort,'--window-size=1100,1600','--user-data-dir='+path.join(output,'edge-profile'),'http://127.0.0.1:'+webPort],{windowsHide:true,stdio:'ignore'});
    const target=await until(async()=>{try{return(await(await fetch('http://127.0.0.1:'+debugPort+'/json')).json()).find(t=>t.url.startsWith('http://127.0.0.1:'+webPort));}catch{return false;}},'browser startup');
    socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((yes,no)=>{socket.onopen=yes;socket.onerror=no;});
    let serial=0;const pending=new Map();
    socket.onmessage=e=>{const msg=JSON.parse(e.data),entry=pending.get(msg.id);if(entry){pending.delete(msg.id);msg.error?entry.no(Error(JSON.stringify(msg.error))):entry.yes(msg.result);}};
    const call=(method,params={})=>new Promise((yes,no)=>{const id=++serial;pending.set(id,{yes,no});socket.send(JSON.stringify({id,method,params}));});
    const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    const wait=(expression,label)=>until(()=>evaluate(expression),label);
    const field=(id,value)=>evaluate('document.getElementById('+JSON.stringify(id)+').value='+JSON.stringify(value));
    const click=id=>evaluate('document.getElementById('+JSON.stringify(id)+').click()');
    const section=label=>'Array.from(document.querySelectorAll("section")).find(e=>e.getAttribute("aria-label")==='+JSON.stringify(label)+')';
    const rows=label=>'Array.from('+section(label)+'.querySelectorAll(".organizer-person"))';
    const capture=async file=>{await evaluate('window.scrollTo(0,0)');const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(output,file),Buffer.from(r.data,'base64'));};
    await call('Runtime.enable');await wait('!!document.getElementById("organizer-create")','panel mount');
    if(!await evaluate('document.getElementById("organizer-controls").disabled&&document.getElementById("organizer-controls").hidden'))throw Error('Unauthenticated panel enabled');
    results.push('generation blocked before authentication');
    if(!await evaluate('document.title==="Voxdria Caster"&&document.querySelector("h1").textContent.includes("Voxdria Caster")'))throw Error('Unexpected product branding');
    results.push('Voxdria Caster title and visible heading match the new product identity');
    await field('organizer-account','Dani');await field('organizer-password','wrong-password');await click('organizer-login');
    await wait('document.getElementById("organizer-status").textContent.includes("Parolă incorectă")','wrong password');
    if(!await evaluate('document.getElementById("organizer-controls").disabled&&document.getElementById("organizer-password").value===""'))throw Error('Password retained after login attempt');
    results.push('wrong password rejected and cleared');
    await field('organizer-password',moderatorPassword);await click('organizer-login');await wait('document.getElementById("organizer-status").textContent.includes("Dani · Moderator")','moderator login');
    await field('organizer-title','Custom UI verificat');await field('organizer-lobby-link','https://gg.riotgames.com/LOL?joinCode=UI-test-only');await click('organizer-create');await wait('!!document.getElementById("organizer-invite")','invitation generated');
    const invitation=await evaluate('document.getElementById("organizer-invite").value');if(!/^RV-[A-Za-z0-9_-]{43}$/.test(invitation))throw Error('Invalid shared invitation');
    results.push('named moderator generates one shared 10-player invitation');
    await evaluate('Array.from(document.querySelectorAll("#organizer-event button")).find(b=>b.textContent==="Copiază invitația completă").click()');
    if(!await evaluate('window.organizerProofClipboard.includes("https://gg.riotgames.com/LOL?joinCode=UI-test-only")&&window.organizerProofClipboard.includes('+JSON.stringify(invitation)+')'))throw Error('Combined invitation is missing Riot lobby link or voice code');
    const copied=await evaluate('window.organizerProofClipboard');
    const legacyCode=/\bCod vocal(?: RiftVoice)?\s*:\s*([A-Za-z0-9_-]{32,256})(?=\s|$)/i.exec(copied)?.[1];
    if(legacyCode!==invitation||!copied.startsWith('Voxdria · '))throw Error('Rebranded invitation is not compatible with the previous client');
    results.push('Voxdria invitation combines Riot lobby link and voice code, and remains readable by the previous RiftVoice parser');
    for(const name of ['Alice#EUNE','Bob#EUNE']){
      const ws=new NodeSocket('ws://127.0.0.1:'+port+'/registration'),messages=[];clients.push(ws);ws.on('message',raw=>messages.push(JSON.parse(raw.toString())));
      await new Promise((yes,no)=>{ws.once('open',yes);ws.once('error',no);});ws.send(JSON.stringify({type:'lobby_register',name,invitation}));
      await until(()=>messages.some(m=>m.type==='lobby_pending'),'pending registration');
      await wait(rows('Cereri în așteptare')+'.some(e=>e.textContent.includes('+JSON.stringify(name)+'))','pending name displayed');
      await evaluate(rows('Cereri în așteptare')+'.find(e=>e.textContent.includes('+JSON.stringify(name)+')).querySelectorAll("button")['+(name.startsWith('Alice')?0:1)+'].click()');
      await until(()=>messages.some(m=>m.type==='lobby_approved'),'registration approved');
    }
    await wait(section('Jucători aprobați')+'.textContent.includes("Alice#EUNE")&&'+section('Jucători aprobați')+'.textContent.includes("Bob#EUNE")','approved roster');
    results.push('pregame check-ins appear live and receive private reservations after approval');
    const alice=rows('Jucători aprobați')+'.find(e=>e.textContent.includes("Alice#EUNE"))';
    await evaluate(alice+'.querySelectorAll("button")[0].click()');await wait(alice+'.querySelector("p").textContent.includes("Roșu")','team move');
    await evaluate(alice+'.querySelectorAll("button")[0].click()');await wait(alice+'.querySelector("p").textContent.includes("Albastru")','team move back');
    await evaluate('Array.from(document.querySelectorAll("#organizer-event button")).find(b=>b.textContent==="Schimbă locurile între jucători").click()');
    await wait(alice+'.querySelector("p").textContent.includes("Roșu")','team swap');results.push('team move and full-lineup-compatible swap controls work');
    await evaluate('Array.from(document.querySelectorAll("#organizer-event button")).find(b=>b.textContent==="Conectează acest Caster cu rolul meu").click()');
    await wait('window.organizerProofCasterInvitation.length===43','personal caster grant');results.push('caster connection uses a personal server-issued staff credential');
    await evaluate(alice+'.querySelectorAll("button")[1].click()');await wait(alice+'.querySelector("p").textContent.includes("Mute de moderare")','moderation mute');
    if(!await evaluate('document.getElementById("organizer-audit").hidden'))throw Error('Moderator can see administrator audit');
    await click('organizer-logout');if(!await evaluate('document.getElementById("organizer-controls").disabled&&!document.getElementById("organizer-invite")'))throw Error('Logout retained credentials');
    await field('organizer-account','');await field('organizer-password',adminPassword);await click('organizer-login');
    await wait('!document.getElementById("organizer-audit").hidden&&document.getElementById("organizer-audit").textContent.includes("Dani → Alice#EUNE")','administrator audit');
    results.push('administrator sees the authenticated moderator name and muted target');
    await evaluate('Array.from(document.querySelectorAll("#organizer-event button")).find(b=>b.textContent==="Conectează acest Caster cu rolul meu").click()');
    await wait(section('Comentatori și moderare')+'.textContent.includes("Administrator")','administrator staff entry');
    await capture('administrator-audit.png');
    for(const width of [800,520]){
      await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
      if(!await evaluate('getComputedStyle(document.body).backgroundColor==="rgb(16, 9, 13)"&&document.documentElement.scrollWidth<=window.innerWidth&&getComputedStyle(document.getElementById("organizer-invite")).backgroundColor==="rgb(18, 11, 15)"'))throw Error('Caster layout overflow or missing Voxdria dark theme');
      await capture('caster-layout-'+width+'.png');
    }
    results.push('Voxdria dark red theme loads with no horizontal overflow at 800 and 520 pixels');
    await click('organizer-logout');await field('organizer-account','Dani');await field('organizer-password',moderatorPassword);await click('organizer-login');
    await wait('Array.from(document.querySelectorAll("#organizer-event button")).some(b=>b.textContent==="Administrator protejat"&&b.disabled)','protected administrator control');
    await capture('moderator-protection.png');results.push('moderator sees protected administrator and cannot use the mute control');
    await click('organizer-logout');if(!await evaluate('document.getElementById("organizer-audit").hidden&&document.getElementById("organizer-audit").textContent===""&&!document.getElementById("organizer-invite")'))throw Error('Logout retained private audit');
    results.push('logout clears private invitations and audit from the page');
    const receipt={version:require('../package.json').version,status:'passed',browser:'Microsoft Edge headless',scope:'development UI with a real local authenticated server; synthetic credentials, two pregame players, no microphone or real match',checks:results};
    fs.writeFileSync(path.join(root,'verification/organizer-ui-proof.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
  }finally{
    clients.forEach(ws=>ws.terminate());
    if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({id:99999,method:'Browser.close'}));socket?.close();edge?.kill();backend.kill();server.closeAllConnections();server.close();
  }
}
main().then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1);});
