import { casterTransmitAllowed } from '../../src/caster/routing';
describe('caster transmission controls', () => {
  test('only casters can transmit; mute and deafen override PTT', () => {
    for (const role of ['caster','spectator','player',''])
      for (const mute of [true,false]) for (const deafen of [true,false])
        for (const ptt of [true,false]) for (const held of [true,false])
          expect(casterTransmitAllowed(role,mute,deafen,ptt,held)).toBe(role === 'caster' && !mute && !deafen && (!ptt || held));
  });
});
