/** Defense in depth for diagnostic output, not a guarantee for arbitrary unlabeled secrets. */
export function redactLogText(value:string):string{
  return value.replace(/\bBearer\s+[A-Za-z0-9_-]+/gi,'Bearer [redacted]')
    .replace(/((?:password|credential|authorization|invitation|sessionToken|secret|token)["']?\s*[:=]\s*)("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,;}\]]+)/gi,'$1[redacted]')
    .replace(/(^|[^A-Za-z0-9_-])[A-Za-z0-9_-]{32,256}(?![A-Za-z0-9_-])/g,'$1[redacted]');
}
export function safeLogArguments(args:unknown[]):unknown[]{
  return args.map(value=>{
    if(typeof value==='string')return redactLogText(value);
    if(value instanceof Error)return redactLogText(value.stack||value.message);
    if(value&&typeof value==='object'){
      try{return redactLogText(JSON.stringify(value,(key,item)=>/password|credential|authorization|invitation|sessionToken|secret|token/i.test(key)?'[redacted]':item));}
      catch{return '[unserializable diagnostic]';}
    }
    return value;
  });
}
