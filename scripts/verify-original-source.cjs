const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=require('../upstream/SOURCE.json');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let referenceFiles=0,runtimeFiles=0;
for(const file of source.files){
  const relative=file.path;
  if(typeof relative!=='string'||relative.startsWith('/')||relative.split('/').includes('..'))throw Error('Invalid provenance path');
  const reference=path.join(root,'upstream/LoLProxChat',relative);
  if(hash(reference)!==file.sha256)throw Error('Original reference changed: '+relative);referenceFiles++;
  const runtime=relative.startsWith('src/')?'src/upstream/'+relative.slice(4):relative.startsWith('server/src/')?'server/src/upstream/'+relative.slice(11):relative==='src-tauri/src/capture.rs'?'src-tauri/src/player_original_capture.rs':/^(assets|models|icons)\//.test(relative)?relative:null;
  if(runtime){if(hash(path.join(root,runtime))!==file.sha256)throw Error('Original runtime changed: '+runtime);runtimeFiles++;}
}
if(referenceFiles!==213||runtimeFiles<40)throw Error('Incomplete original source');
console.log(JSON.stringify({status:'passed',sourceVersion:source.version,referenceFiles,runtimeFiles,archiveSha256:source.archiveSha256}));
