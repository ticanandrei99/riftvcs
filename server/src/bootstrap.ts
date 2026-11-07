import { SERVER_VERSION } from './version.js';
console.info('[startup] Voxdria '+SERVER_VERSION+' · Node '+process.version+' · loading server modules');
const slow=setTimeout(()=>console.warn('[startup] Server initialization has not finished after 15 seconds; inspect configuration and instance resources.'),15000);
slow.unref();
try{
  await import('./index.js');clearTimeout(slow);
}catch(error){
  clearTimeout(slow);
  // JSON parser errors can contain credential excerpts. Never print raw input or arbitrary exception text.
  const message=error instanceof Error?error.message:'';
  const safe=/^(ORGANIZER_PASSWORD must contain|Invalid MODERATOR_ACCOUNTS_JSON$|At most 20 named moderator|Invalid or duplicated moderator account$|Administrator and moderator passwords must differ$|Configure ORGANIZER_PASSWORD|Loopback media|ORGANIZER_STORE_PATH must end|Invalid voice invitation configuration$|Duplicate voice invitation$|Invalid organizer|Organizer store too large$|Voice grant capacity reached$)/.test(message);
  console.error('[startup] Failed: '+(safe?message:error instanceof SyntaxError?'Invalid JSON configuration. Check server environment JSON values.':(error as NodeJS.ErrnoException)?.code||'Server initialization error.'));
  process.exitCode=1;
}
