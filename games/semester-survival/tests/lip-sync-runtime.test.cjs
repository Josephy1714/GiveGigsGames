const test=require('node:test');
const assert=require('node:assert/strict');
require('../lip-sync-runtime.js');
function setup(){
 const audio={src:'',currentTime:0,paused:true,ended:false,pause(){this.paused=true;},load(){},play(){this.paused=false;return Promise.resolve();}};
 const played=[];const animator={hasClip:name=>['mouth-neutral','viseme-A','viseme-O','viseme-M'].includes(name),play:name=>{played.push(name);return {ok:true};},render:()=>({drawn:true})};
 const runtime=global.SemesterLipSyncRuntime.create({audio,animator});
 return {audio,played,runtime};
}
const track={id:'brian-intro',src:'audio/voice/brian-intro.ogg',cues:[{time:0,viseme:'viseme-M'},{time:0.12,viseme:'viseme-A'},{time:0.34,viseme:'viseme-O'},{time:0.51,viseme:'mouth-neutral'}]};
test('mouth cues follow the audio playback clock, not frame elapsed time',async()=>{
 const {audio,played,runtime}=setup();await runtime.start(track);
 audio.currentTime=.2;runtime.update();assert.equal(runtime.getState().viseme,'viseme-A');
 audio.currentTime=.4;runtime.update();assert.equal(runtime.getState().viseme,'viseme-O');
 audio.currentTime=.6;runtime.update();assert.equal(runtime.getState().viseme,'mouth-neutral');
 assert.deepEqual(played,['mouth-neutral','viseme-M','viseme-A','viseme-O','mouth-neutral']);
 runtime.stop();
});
test('rejects missing, unsafe and unordered authored voice tracks',()=>{
 const {runtime}=setup();
 assert.throws(()=>runtime.validateTrack({src:'../private.ogg',cues:[{time:0,viseme:'viseme-A'}]}),/safe relative/);
 assert.throws(()=>runtime.validateTrack({src:'audio/a.ogg',cues:[{time:.2,viseme:'viseme-A'},{time:.1,viseme:'viseme-O'}]}),/unordered/);
 assert.throws(()=>runtime.validateTrack({src:'audio/a.ogg',cues:[{time:0,viseme:'not-authored'}]}),/Missing authored/);
});
test('pauses, resumes and stops voice and mouth animation together',async()=>{
 const {audio,played,runtime}=setup();await runtime.start(track);runtime.pause();assert.equal(runtime.getState().status,'paused');await runtime.resume();assert.equal(audio.paused,false);runtime.stop();assert.equal(runtime.getState().status,'idle');assert.equal(audio.currentTime,0);assert.equal(played.at(-1),'mouth-neutral');
});
test('fails closed when no approved voice and mouth animator are supplied',async()=>{
 const runtime=global.SemesterLipSyncRuntime.create({});
 await assert.rejects(runtime.start(track),/audio player and an authored mouth animator/);
});
