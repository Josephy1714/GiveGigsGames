const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.join(__dirname,'..');
const context={};context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(base,'world-content.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(base,'township-scene-blueprint.js'),'utf8'),context);
const api=context.SemesterTownshipBlueprint,world=context.SemesterWorldContent;
test('township blueprint maps all six canonical places and Mama Njeri',()=>{
 const r=api.validate(world);
 assert.deepEqual({district:r.district,placeCount:r.placeCount,npcCount:r.npcCount,navigationNodeCount:r.navigationNodeCount},
 {district:'township',placeCount:6,npcCount:1,navigationNodeCount:7});
});
test('township uses the shared 2.5D visual composition and four lighting states',()=>{
 const b=api.getBlueprint();
 assert.equal(b.design.camera.startsWith('2.5D'),true);
 assert.deepEqual(b.design.composition.map(x=>x.artSlot),['background','midground','foreground']);
 assert.deepEqual(b.design.lightingVariants,['early-morning','midday','late-afternoon','night']);
 assert.equal(b.design.world.width,3840);
});
test('township navigation graph connects all declared places and NPC anchor',()=>{
 const b=api.getBlueprint(),ids=new Set(b.navigation.nodes.map(n=>n.id));
 assert.equal(ids.size,7);
 b.navigation.edges.forEach(e=>{assert.ok(ids.has(e.from));assert.ok(ids.has(e.to));});
 assert.ok(b.navigation.nodes.some(n=>n.anchor==='npc-njeri'));
});
test('all spawn points are in bounds and art is not falsely marked ready',()=>{
 const b=api.getBlueprint(),r=api.validate(world);
 Object.values(b.spawnPoints).forEach(p=>assert.ok(p.x>=b.design.playerBounds.minX&&p.x<=b.design.playerBounds.maxX));
 assert.equal(b.approval.artworkSupplied,false);assert.equal(r.artworkReady,false);assert.equal(r.runtimeReady,false);
});
test('township gameplay zones and collision geometry use supported shapes',()=>{
 const b=api.getBlueprint();
 assert.ok(b.gameplayZones.every(z=>['aabb','circle'].includes(z.type)));
 assert.ok(b.collision.every(c=>['aabb','circle','segment'].includes(c.type)));
});
