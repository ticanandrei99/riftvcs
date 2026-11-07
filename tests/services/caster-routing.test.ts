import { casterTransmitAllowed,validCasterReady } from '../../src/caster/routing';
describe('caster transmission controls', () => {
  test('only casters can transmit; mute and deafen override PTT', () => {
    for (const role of ['caster','spectator','player',''])
      for (const mute of [true,false]) for (const deafen of [true,false])
        for (const ptt of [true,false]) for (const held of [true,false])
          expect(casterTransmitAllowed(role,mute,deafen,ptt,held)).toBe(role === 'caster' && !mute && !deafen && (!ptt || held));
  });
});
test('caster admission rejects forged player roles, duplicate identities and malformed bearer sessions before opening a microphone',()=>{
  const valid={name:'Commentator',role:'caster',sessionToken:'a'.repeat(43),peers:[{name:'Spectator',role:'spectator'}]};expect(validCasterReady(valid)).toBe(true);
  for(const value of [null,{...valid,role:'player'},{...valid,sessionToken:'short'},{...valid,peers:[{name:'Player',role:'player'}]},{...valid,peers:[valid.peers[0],valid.peers[0]]},{...valid,peers:[{name:'Commentator',role:'caster'}]},{...valid,peers:Array(25).fill(valid.peers[0])}])expect(validCasterReady(value)).toBe(false);
});
