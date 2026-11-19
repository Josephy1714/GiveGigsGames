const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.join(__dirname,'..');
const c={};c.globalThis=c;vm.createContext(c);
vm.runInContext(fs.readFileSync(path.join(base,'world-content.js'),'utf8'),c);
vm.runInContext(fs.readFileSync(path.join(base,'residence-scene-blueprint.js'),'utf8'),c);
const api=c.SemesterResidenceBlueprint,b=api.getBlueprint();
test('residence blueprint matches canonical places and Brian',()=>{
 const r=api.validate(c.SemesterWorldContent);
 assert.deepEqual({district:r.district,placeCount:r.placeCount,npcCount:r.npcCount,navigationNodeCount:r.navigationNodeCount},
 {district:'residence',placeCount:3,npcCount:1,navigationNodeCount:4});
});
test('residence scene is a bounded 2.5D composition with three layers',()=>{
 assert.equal(b.design.camera.startsWith('2.5D'),true);
 assert.deepEqual(b.design.composition.map(x=>x.artSlot),['background','midground','foreground']);
 Object.values(b.spawnPoints).forEach(p=>assert.ok(p.x>=b.design.playerBounds.minX&&p.x<=b.design.playerBounds.maxX));
});
test('all routes are connected only by declared navigation nodes',()=>{
 const ids=new Set(b.navigation.nodes.map(n=>n.id));
 b.navigation.edges.forEach(e=>{assert.ok(ids.has(e.from));assert.ok(ids.has(e.to));});
});
test('artwork and runtime readiness remain gated',()=>{
 const r=api.validate(c.SemesterWorldContent);
 assert.equal(r.artworkReady,false);assert.equal(r.runtimeReady,false);
 assert.equal(b.approval.artworkSupplied,false);
});
