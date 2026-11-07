import {describe,it,expect} from 'vitest';
import {enemyProximityEnabled} from '../src/media-policy.js';

describe('standard player proximity policy',()=>{
  it('enables visible-enemy proximity without an optional environment flag',()=>{
    expect(enemyProximityEnabled(undefined,false)).toBe(true);
    expect(enemyProximityEnabled('',false)).toBe(true);
    expect(enemyProximityEnabled('1',false)).toBe(true);
  });
  it('honours an explicit operator suspension',()=>expect(enemyProximityEnabled('0',false)).toBe(false));
  it('never enables the gateway on the insecure legacy test protocol',()=>{
    for(const value of [undefined,'','0','1'])expect(enemyProximityEnabled(value,true)).toBe(false);
  });
  it('rejects malformed policy instead of enabling an unexpected configuration',()=>{
    for(const value of ['true','false','yes',' 1','2'])expect(()=>enemyProximityEnabled(value,false)).toThrow('ENEMY_CAMERA_VOICE');
  });
});
