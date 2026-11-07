const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const reused=process.argv.includes('--reuse-endpoint')?JSON.parse(fs.readFileSync(path.join(root,'verification/compat-native-qa-endpoint.private.json'),'utf8')):null;
if(reused&&(!/^[a-f0-9]{48}$/.test(reused.runId)||!/^http:\/\/127\.0\.0\.1:\d+\/result\?run=[a-f0-9]{48}$/.test(reused.resultUrl)||new URL(reused.resultUrl).searchParams.get('run')!==reused.runId))throw Error('Invalid local QA endpoint');
const runId=reused?.runId||crypto.randomBytes(24).toString('hex'),bindPort=reused?Number(new URL(reused.resultUrl).port):0;
const origins=new Set(['http://tauri.localhost','https://tauri.localhost']);
const server=http.createServer((req,res)=>{
  const origin=req.headers.origin;if(!origin||!origins.has(origin)||req.url!=='/result?run='+runId){res.writeHead(403);return res.end();}
  res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}if(req.method!=='POST'){res.writeHead(405);return res.end();}
  let body='';req.on('data',part=>{body+=part;if(Buffer.byteLength(body)>65536)req.destroy();});
  req.on('end',()=>{try{
    const result=JSON.parse(body);if(!result||typeof result.passed!=='boolean'||typeof result.tests!=='object')throw Error('Invalid result');
    fs.writeFileSync(path.join(root,'verification/compat-native-hardware-result.json'),JSON.stringify({version:require('../package.json').version,runId,...result},null,2));
    res.end('saved');console.log(JSON.stringify({passed:result.passed,tests:Object.fromEntries(Object.entries(result.tests).map(([name,test])=>[name,test.passed]))}));server.close();
  }catch{res.writeHead(400);res.end();}});
});
server.requestTimeout=5000;server.maxConnections=4;server.headersTimeout=5000;
server.listen(bindPort,'127.0.0.1',()=>fs.writeFileSync(path.join(root,'verification/compat-native-qa-endpoint.private.json'),JSON.stringify({runId,resultUrl:'http://127.0.0.1:'+server.address().port+'/result?run='+runId})));
setTimeout(()=>{server.close();process.exit(1);},600000).unref();
