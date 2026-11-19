'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
require('../collision-runtime.js');
const create=global.SemesterCollisionRuntime.create;
test('swept circle movement stops at authored solid AABB without tunnelling',()=>{
 const world=create({colliders:[{id:'wall',type:'aabb',minX:10,maxX:20,minDepth:-10,maxDepth:10,material:'concrete'}]});
 const result=world.moveCircle({x:0,depth:0},{x:30,depth:0},2,'player');
 assert.ok(result.x<=8.01&&result.x>=7.9);
 assert.equal(result.blockedX,true);
 assert.equal(result.contacts[0].colliderId,'wall');
 world.destroy();
});
test('circle and capsule-segment colliders resolve actor overlap',()=>{
 const world=create({colliders:[
  {id:'tree',type:'circle',x:5,depth:0,radius:2,material:'wood'},
  {id:'rail',type:'segment',x1:0,depth1:8,x2:10,depth2:8,radius:1,material:'metal'}
 ]});
 const tree=world.moveCircle({x:0,depth:0},{x:10,depth:0},1,'a');
 assert.ok(tree.x<2.1);
 const rail=world.moveCircle({x:5,depth:4},{x:0,depth:6},1,'b');
 assert.ok(rail.depth<6.01);
 world.destroy();
});
test('wall contact produces authored material/effect impact events and exit',()=>{
 const events=[];
 const world=create({onEvent:e=>events.push(e),colliders:[{id:'barrier',type:'aabb',minX:5,maxX:6,minDepth:-5,maxDepth:5,material:'metal',effect:'spark'}]});
 world.moveCircle({x:0,depth:0},{x:10,depth:0},1,'player');
 assert.ok(events.some(e=>e.type==='collision:enter'&&e.material==='metal'));
 const impact=events.find(e=>e.type==='collision:impact');
 assert.ok(impact&&impact.effect==='spark'&&impact.intensity>0);
 assert.ok(Number.isFinite(impact.position.x));
 world.moveCircle({x:4,depth:0},{x:-2,depth:0},1,'player');
 assert.ok(events.some(e=>e.type==='collision:exit'));
 world.destroy();
});
test('invalid or duplicate authored colliders fail closed',()=>{
 assert.throws(()=>create({colliders:[{id:'bad',type:'aabb',minX:1,maxX:1,minDepth:0,maxDepth:2}]}),/invalid bounds/);
 assert.throws(()=>create({colliders:[{id:'x',type:'circle',x:0,depth:0,radius:1},{id:'x',type:'circle',x:3,depth:0,radius:1}]}),/unique/);
});
