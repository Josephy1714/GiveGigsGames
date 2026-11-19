'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
require('../contact-effects-runtime.js');
const api=globalThis.SemesterContactEffectsRuntime;
const surfaces=[
 {id:'stone-walkway',type:'aabb',minX:0,maxX:100,minDepth:-20,maxDepth:20,material:'stone',effect:'dust'},
 {id:'wood-deck',type:'circle',x:150,depth:0,radius:20,material:'wood',effect:'none',priority:1}
];
test('resolves left and right foot markers against authored material surfaces',()=>{
 const events=[],runtime=api.create({onEvent:event=>events.push(event)});
 runtime.setSurfaces('campus',surfaces);
 const left=runtime.resolve({event:'left-foot-contact',clip:'walk',frameIndex:2},{x:10,depth:0},'jay');
 const right=runtime.resolve({event:'right-foot-contact',clip:'walk',frameIndex:4},{x:12,depth:0},'brian');
 assert.equal(left.action,'footstep');assert.equal(left.foot,'left');assert.equal(left.material,'stone');assert.equal(left.effect,'dust');
 assert.equal(right.characterId,'brian');assert.equal(right.foot,'right');assert.equal(events.length,2);
 runtime.destroy();
});
test('selects highest-priority overlapping surface and resolves landing contact',()=>{
 const runtime=api.create();runtime.setSurfaces('residence',surfaces);
 const result=runtime.resolve({event:'landing-impact',clip:'land-soft',frameIndex:0},{x:150,depth:0});
 assert.equal(result.action,'landing');assert.equal(result.material,'wood');assert.equal(result.effect,'none');
 runtime.destroy();
});
test('unknown markers and positions outside authored surfaces fail closed',()=>{
 const runtime=api.create();runtime.setSurfaces('campus',surfaces);
 assert.equal(runtime.resolve({event:'sparkle'},{x:10,depth:0}),null);
 assert.equal(runtime.resolve({event:'left-foot-contact'},{x:500,depth:0}),null);
 assert.equal(runtime.resolve({event:'left-foot-contact'},{x:NaN,depth:0}),null);
 runtime.destroy();
});
test('rejects invalid or uncredited-by-schema contact geometry and materials',()=>{
 const runtime=api.create();
 assert.throws(()=>runtime.setSurfaces('campus',[{id:'bad',type:'aabb',minX:2,maxX:1,minDepth:0,maxDepth:1,material:'stone'}]),/invalid bounds/);
 assert.throws(()=>runtime.setSurfaces('campus',[{id:'bad',type:'circle',x:0,depth:0,radius:1,material:'lava'}]),/unsupported material/);
 assert.throws(()=>runtime.setSurfaces('campus',[{id:'same',type:'circle',x:0,depth:0,radius:1,material:'stone'},{id:'same',type:'circle',x:2,depth:0,radius:1,material:'stone'}]),/unique authored id/);
 runtime.destroy();
});
