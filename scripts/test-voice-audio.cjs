const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {spawn} = require('node:child_process');
const root = process.cwd();
const webpack = require(path.join(root,'node_modules/webpack'));
async function main() {
  const config = require(path.join(root,'webpack.config.js'));
  config.entry = path.join(root,'tests/browser/voice-audio.js');
  config.output = {path:path.join(root,'verification/audio-browser'),filename:'bundle.js'};
  config.plugins = []; config.mode='development'; config.devtool=false;
  await new Promise((resolve,reject)=>webpack(config,(err,stats)=>err?reject(err):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve()));
  const server=http.createServer((req,res)=>{
    if(req.url==='/bundle.js') {res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,'verification/audio-browser/bundle.js')));}
    else {res.setHeader('Content-Type','text/html');res.end('<html><script src="/bundle.js"></script><body>RiftVoice audio render test</body></html>');}
  });
  await new Promise(resolve=>server.listen(9340,'127.0.0.1',resolve));
  const edge=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',[
    '--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=9339',
    '--autoplay-policy=no-user-gesture-required',`--user-data-dir=${path.join(root,'verification/edge-audio-profile')}`,'http://127.0.0.1:9340'
  ],{windowsHide:true,stdio:'ignore'});
  let socket;
  try {
    let target;
    for(let i=0;i<60;i++) {try {target=(await (await fetch('http://127.0.0.1:9339/json')).json()).find(t=>t.url.startsWith('http://127.0.0.1:9340'));if(target)break;}catch{} await new Promise(r=>setTimeout(r,250));}
    if(!target)throw Error('Audio test browser did not start');
    socket=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
    let id=0;const pending=new Map();
    socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const {r,j}=pending.get(m.id);pending.delete(m.id);m.error?j(Error(JSON.stringify(m.error))):r(m.result);}};
    const call=(method,params)=>new Promise((r,j)=>{const n=++id;pending.set(n,{r,j});socket.send(JSON.stringify({id:n,method,params}));});
    await call('Runtime.enable',{});
    let ready=false;
    for(let i=0;i<100;i++){const r=await call('Runtime.evaluate',{expression:'typeof window.runAudioProof',returnByValue:true});if(r.result.value==='function'){ready=true;break;}await new Promise(r=>setTimeout(r,100));}
    if(!ready)throw Error('Audio harness failed to load');
    const result=await call('Runtime.evaluate',{expression:'window.runAudioProof()',awaitPromise:true,returnByValue:true});
    if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));
    const output=result.result.value;
    fs.writeFileSync(path.join(root,'verification',process.argv[2]||'voice-changer-signal.json'),JSON.stringify(output,null,2));
    console.log(JSON.stringify(output,null,2));
  } finally { if(socket?.readyState===WebSocket.OPEN) socket.send(JSON.stringify({id:999,method:'Browser.close'})); socket?.close();edge.kill();server.closeAllConnections();server.close();}
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});

