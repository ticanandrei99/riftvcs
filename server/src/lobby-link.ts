/** Metadata copied by the organizer. Never fetched, resolved or used as voice authorization. */
export function normalizeLobbyLink(value: unknown): string {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || value.length > 300) throw Error('Link de lobby LoL invalid.');
  const input=value.trim();if(!input)return '';
  let url:URL;try{url=new URL(input);}catch{throw Error('Lipește linkul HTTPS al lobby-ului copiat din clientul LoL.');}
  const code=url.searchParams.get('joinCode');
  if(url.protocol!=='https:'||url.hostname!=='gg.riotgames.com'||url.port||url.username||url.password||url.hash||url.pathname!=='/LOL'||
    [...url.searchParams.keys()].length!==1||!code||!/^[A-Za-z0-9_-]{3,128}$/.test(code))throw Error('Folosește formatul https://gg.riotgames.com/LOL?joinCode=... copiat din LoL.');
  return 'https://gg.riotgames.com/LOL?joinCode='+code;
}
