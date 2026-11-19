const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.join(__dirname,'..');
const context={};context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(base,'world-content.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(base,'city-scene-blueprint.js'),'utf8'),context);
const api=context.SemesterCityBlueprint,world=context.SemesterWorldContent;
test('city blueprint maps all four canonical destinations',()=>{
 const r=api.validate(world);
 assert.deepEqual({district:r.district,placeCount:r.placeCount,npcCount:r.npcCount,navigationNodeCount:r.navigationNodeCount},
 {district:'city',placeCount:4,npcCount:0,navigationNodeCount:4});
});
test('city uses shared 2.5D composition and distinct urban art direction',()=>{
 const b=api.getBlueprint();
 assert.equal(b.design.camera.startsWith('2.5D'),true);
 assert.deepEqual(b.design.composition.map(x=>x.artSlot),['background','midground','foreground']);
 assert.equal(b.design.world.width,3840);
 assert.match(b.design.mood,/Nairobi/);
});
test('all destinations form a connected authored navigation spine',()=>{
 const b=api.getBlueprint(),nodes=new Set(b.navigation.nodes.map(n=>n.id));
 assert.equal(nodes.size,4);
 assert.equal(b.navigation.edges.length,3);
 b.navigation.edges.forEach(e=>{assert.ok(nodes.has(e.from));assert.ok(nodes.has(e.to));});
});
test('city spawn points fit bounds and artwork remains gated',()=>{
 const b=api.getBlueprint(),r=api.validate(world);
 Object.values(b.spawnPoints).forEach(p=>assert.ok(p.x>=b.design.playerBounds.minX&&p.x<=b.design.playerBounds.maxX));
 assert.equal(b.approval.artworkSupplied,false);assert.equal(r.artworkReady,false);assert.equal(r.runtimeReady,false);
});
test('city collision and gameplay zone shapes match runtime contracts',()=>{
 const b=api.getBlueprint();
 assert.ok(b.collision.every(c=>['aabb','circle','segment'].includes(c.type)));
 assert.ok(b.gameplayZones.every(z=>['aabb','circle'].includes(z.type)));
});
