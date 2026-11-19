const test=require('node:test');
const assert=require('node:assert/strict');
require('../npc-actor-runtime.js');
function setup(route){
 const schedules={getState:()=>[{characterId:'brian',name:'Brian',presence:'in-active-district',targetDistrict:'campus'}]};
 const navigation={getState:()=>[route]};
 const events=[];
 const runtime=global.SemesterNpcActorRuntime.create({world:{},scheduleRuntime:schedules,navigationRuntime:navigation,speed:100,onEvent:e=>events.push(e)});
 return {runtime,events};
}
const route={characterId:'brian',status:'route-ready',waypoints:[{nodeId:'a',x:0,y:10},{nodeId:'b',x:100,y:10},{nodeId:'c',x:100,y:110}]};
test('NPC follows only authored route points and transitions from walking to idle',()=>{
 const {runtime}=setup(route);
 let actor=runtime.update(0.1)[0];
 assert.equal(actor.status,'moving');assert.deepEqual(actor.position,{x:10,y:10});assert.equal(actor.motion,'walk');
 for(let i=0;i<9;i++)actor=runtime.update(0.1)[0];
 assert.equal(actor.status,'moving');assert.deepEqual(actor.position,{x:100,y:10});
 for(let i=0;i<9;i++)actor=runtime.update(0.1)[0];
 assert.equal(actor.status,'at-destination');assert.deepEqual(actor.position,{x:100,y:100});assert.equal(actor.motion,'idle');
 assert.equal(actor.visualReady,false);assert.equal(runtime.getDiagnostics().visualActorsReady,0);
 runtime.destroy();
});
test('offscreen NPCs never receive local coordinates',()=>{
 const schedules={getState:()=>[{characterId:'brian',name:'Brian',presence:'offscreen',targetDistrict:'residence'}]};
 const replacement=global.SemesterNpcActorRuntime.create({world:{},scheduleRuntime:schedules,navigationRuntime:{getState:()=>[route]}});
 const actor=replacement.update(0.1)[0];assert.equal(actor.status,'offscreen');assert.equal(actor.position,null);
 replacement.destroy();
});
test('missing authored route never creates a position or placeholder actor',()=>{
 const {runtime}=setup(Object.assign({},route,{status:'missing-authored-anchor',waypoints:[]}));
 const actor=runtime.update(0.1)[0];assert.equal(actor.status,'missing-authored-anchor');assert.equal(actor.position,null);
 runtime.destroy();
});
test('route changes rebase from the new authored start and large deltas are bounded',()=>{
 const {runtime}=setup(route);runtime.update(0.1);
 const changed={characterId:'brian',status:'route-ready',waypoints:[{nodeId:'new-a',x:20,y:20},{nodeId:'new-b',x:120,y:20}]};
 const next=global.SemesterNpcActorRuntime.create({world:{},scheduleRuntime:{getState:()=>[{characterId:'brian',name:'Brian',presence:'in-active-district',targetDistrict:'campus'}]},navigationRuntime:{getState:()=>[changed]},speed:100});
 const actor=next.update(10)[0];assert.deepEqual(actor.position,{x:30,y:20});
 runtime.destroy();next.destroy();
});

test('approved NPC animators produce renderables and follow walk/idle clips',()=>{
 const schedules={getState:()=>[{characterId:'brian',name:'Brian',presence:'in-active-district',targetDistrict:'campus'}]};
 const navigation={getState:()=>[route]};
 const played=[],updated=[];
 const animator={hasClip:name=>name==='walk'||name==='idle',play:(name,facing)=>{played.push({name,facing});return {ok:true};},update:dt=>updated.push(dt),render(){return {drawn:true};}};
 const runtime=global.SemesterNpcActorRuntime.create({world:{},scheduleRuntime:schedules,navigationRuntime:navigation,animators:{brian:animator}});
 const actor=runtime.update(0.1)[0];
 assert.equal(actor.visualReady,true);assert.equal(runtime.getRenderables().length,1);
 assert.equal(played[0].name,'walk');assert.equal(updated.length,1);
 for(let i=0;i<26;i++)runtime.update(0.1);
 assert.equal(runtime.getState()[0].motion,'idle');
 assert.equal(played[played.length-1].name,'idle');
 assert.equal(runtime.getDiagnostics().visualActorsReady,1);
 runtime.destroy();
});
test('animator without required authored clips remains invisible',()=>{
 const schedules={getState:()=>[{characterId:'brian',name:'Brian',presence:'in-active-district',targetDistrict:'campus'}]};
 const animator={hasClip:()=>false,play:()=>({ok:false}),update(){},render(){return {drawn:true};}};
 const runtime=global.SemesterNpcActorRuntime.create({world:{},scheduleRuntime:schedules,navigationRuntime:{getState:()=>[route]},animators:{brian:animator}});
 const actor=runtime.update(0.1)[0];assert.equal(actor.visualReady,false);assert.equal(runtime.getRenderables().length,0);runtime.destroy();
});


test('approved NPC animator frame markers retain character identity and drain once',()=>{
 const schedules={getState:()=>[{characterId:'brian',name:'Brian',presence:'in-active-district',targetDistrict:'campus'}]};
 const markerQueue=[];
 const animator={hasClip:name=>name==='walk'||name==='idle',play:()=>({ok:true}),update(){markerQueue.push({clip:'walk',frameIndex:2,event:'right-foot-contact'});},drainEvents(){return markerQueue.splice(0,markerQueue.length);},render(){return {drawn:true};}};
 const runtime=global.SemesterNpcActorRuntime.create({world:{},scheduleRuntime:schedules,navigationRuntime:{getState:()=>[route]},animators:{brian:animator}});
 runtime.update(0.1);
 assert.deepEqual(runtime.drainAnimationEvents(),[{characterId:'brian',clip:'walk',frameIndex:2,event:'right-foot-contact'}]);
 assert.deepEqual(runtime.drainAnimationEvents(),[]);
 runtime.destroy();
});
