import {CameraHearing} from '../../src/services/camera-hearing';
import {newTracker,FRAME_MS,flushMicrotasks} from './harness/drive';
import {loadCameraArt,renderCameraFrame,templatesFor,CameraFrameSpec} from './harness/camera-scenes';
const art=loadCameraArt(['soraka','twitch']);
const run=art?.background?describe:describe.skip;
run('strict enemy camera report from actual pixel recognition',()=>{
  beforeEach(()=>jest.useFakeTimers({doNotFake:['hrtime']}));
  afterEach(()=>jest.useRealTimers());
  it('recognizes current enemy art, then drops missing icons and an unreadable camera without the legacy hold',async()=>{
    const icon={id:'enemy',alias:'twitch',side:'enemy' as const,at:{x:150,y:125}};
    const spec:CameraFrameSpec={icons:[icon],box:{x0:120,y0:110}};
    const missing:CameraFrameSpec={icons:[],box:spec.box};
    const noBox:CameraFrameSpec={icons:[icon],box:null};
    const frames=[spec,spec,spec,missing,noBox].map(s=>renderCameraFrame(art!,s));
    const h=newTracker(frames),hearing=new CameraHearing();
    hearing.setPlayers([{id:'self',side:'ally',self:true,vecs:templatesFor(art!,'soraka')},{id:'enemy',side:'enemy',vecs:templatesFor(art!,'twitch')}]);
    hearing.setStrictEnemyCamera(true);h.svc.setCameraHearing(hearing);
    for(let i=0;i<3;i++){jest.advanceTimersByTime(FRAME_MS);await h.svc.tick();await flushMicrotasks();}
    const snapshot=hearing.strictCameraSnapshot(performance.now());
    expect(snapshot?.points.map(p=>p.id)).toEqual(['enemy']);
    jest.advanceTimersByTime(FRAME_MS);await h.svc.tick();await flushMicrotasks();
    expect(hearing.strictCameraSnapshot(performance.now())?.points ?? []).toEqual([]);
    jest.advanceTimersByTime(FRAME_MS);await h.svc.tick();await flushMicrotasks();
    expect(hearing.strictCameraSnapshot(performance.now())).toBeNull();
  });
});
