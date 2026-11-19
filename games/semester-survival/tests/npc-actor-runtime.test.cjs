const test=require('node:test');
const assert=require('node:assert/strict');
require('../npc-actor-runtime.js');
function setup(route){
 const schedules={getState:()=>[{characterId:'brian',name:'Brian',presence:'in-active-district',targetDistrict:'campus'}]};
 const navigation={getState:()=>[route]};
 const events=[];
 const runtime=global.SemesterNpcActorRuntime.create({scheduleRuntime:schedules,navigationRuntime:navigation,speed:100,onEvent:e=>events.push(e)});
 return {runtime,events};
}
const route={characterId:'brian',status:'route-ready',waypoints:[{nodeId:'a',x:0,y:10},{nodeId:'b',x:100,y:10},{nodeId:'c',x:100,y:110}]};
test('NPC follows only authored route points and transitions from walking to idle',()=>{
 const {runtime}=setup(route);
 let actor=runtime.update(0.5)[0];
 assert.equal(actor.status,'moving');assert.deepEqual(actor.position,{x:50,y:10});assert.equal(actor.motion,'walk');
 actor=runtime.update(0.6)[0];
 assert.equal(actor.status,'at-destination');assert.deepEqual(actor.position,{x:100,y:70});assert.equal(actor.motion,'idle');
 assert.equal(actor.visualReady,false);assert.equal(runtime.getDiagnostics().visualActorsReady,0);
 runtime.destroy();
});
test('offscreen NPCs never receive local coordinates',()=>{
 const {runtime}=setup(route);
 const schedules={getState:()=>[{characterId:'brian',name:'Brian',presence:'offscreen',targetDistrict:'residence'}]};
 const replacement=global.SemesterNpcActorRuntime.create({scheduleRuntime:schedules,navigationRuntime:{getState:()=>[route]}});
 const actor=replacement.update(1)[0];assert.equal(actor.status,'offscreen');assert.equal(actor.position,null);
 runtime.destroy();replacement.destroy();
});
test('missing authored route never creates a position or placeholder actor',()=>{
 const {runtime}=setup(Object.assign({},route,{status:'missing-authored-anchor',waypoints:[]}));
 const actor=runtime.update(1)[0];assert.equal(actor.status,'missing-authored-anchor');assert.equal(actor.position,null);
 runtime.destroy();
});
test('route changes rebase from the new authored start and large deltas are bounded',()=>{
 const {runtime}=setup(route);runtime.update(0.5);
 const changed={characterId:'brian',status:'route-ready',waypoints:[{nodeId:'new-a',x:20,y:20},{nodeId:'new-b',x:120,y:20}]};
 const nav={getState:()=>[changed]};
 const next=global.SemesterNpcActorRuntime.create({scheduleRuntime:{getState:()=>[{characterId:'brian',name:'Brian',presence:'in-active-district',targetDistrict:'campus'}]},navigationRuntime:nav,speed:100});
 const actor=next.update(10)[0];assert.deepEqual(actor.position,{x:30,y:20});
 runtime.destroy();next.destroy();
});
