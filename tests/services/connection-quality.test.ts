import { summarizeQuality, qualityGrade, diagnosticReport, safeQuality } from '../../src/services/connection-quality';
import { applyNearbyOnlySettings, getStrictProximity, setCameraOnly, setCameraListen, setAllyProximity } from '../../src/services/audio-prefs';
test('quality uses connected peers and actual packet totals', () => {
  const result = summarizeQuality([
    {state:'connected',rttMs:80,packetsLost:2,packetsReceived:98},
    {state:'connected',rttMs:300,packetsLost:0,packetsReceived:100},
    {state:'disconnected',rttMs:900,packetsLost:900,packetsReceived:1},
  ]);
  expect(result).toEqual({peers:3,connected:2,rttMs:300,lossPercent:1});
  expect(qualityGrade(result)).toBe('fair');
  expect(qualityGrade({...result,rttMs:600})).toBe('poor');
  expect(qualityGrade(safeQuality(null))).toBe('idle');
});
test('diagnostic excludes personal data and invalid injected fields', () => {
  const report = diagnosticReport({version:'0.1.0',connection:'ready',quality:{peers:2,connected:1,rttMs:NaN,lossPercent:Infinity,password:'secret',ip:'192.0.2.8'} as any, mode:'nearby',voice:'robot',enabled:true,strength:0.65,username:'private-name'} as any);
  expect(report).not.toMatch(/secret|192\.0\.2|private-name|password|username/);
  expect(JSON.parse(report).quality.rttMs).toBeNull();
  expect(JSON.parse(report).strength).toBe(65);
});
test('nearby is the default; optional camera and team choices survive restart', () => {
  const store = new Map<string,string>();
  (globalThis as any).localStorage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>store.set(k,v)};
  applyNearbyOnlySettings(); expect(getStrictProximity()).toBe(true);
  setCameraOnly(true); applyNearbyOnlySettings(); expect(getStrictProximity()).toBe(false);
  setCameraOnly(false); setCameraListen(true); expect(getStrictProximity()).toBe(false);
  setCameraListen(false); setAllyProximity(false); expect(getStrictProximity()).toBe(false);
  setAllyProximity(true); expect(getStrictProximity()).toBe(true);
});
