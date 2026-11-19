const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.join(__dirname, '..');
const context = {}; context.globalThis = context; vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(base, 'world-content.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(base, 'campus-scene-blueprint.js'), 'utf8'), context);
const api = context.SemesterCampusBlueprint;
const world = context.SemesterWorldContent;
test('campus blueprint maps every canonical campus place and approved cast id', () => {
  const r = api.validate(world);
  assert.deepEqual({ district:r.district, placeCount:r.placeCount, npcCount:r.npcCount, navigationNodeCount:r.navigationNodeCount },
    { district:'campus', placeCount:7, npcCount:3, navigationNodeCount:10 });
});
test('campus layout has bounded 2.5D world and complete layer slots', () => {
  const b=api.getBlueprint();
  assert.equal(b.design.camera.startsWith('2.5D'),true);
  assert.deepEqual(b.design.composition.map(x=>x.artSlot),['background','midground','foreground']);
  assert.equal(b.design.world.width,3840);
  assert.equal(b.design.cameraBounds.maxX+b.design.viewport.width,b.design.world.width);
  Object.values(b.places).forEach(p=>assert.ok(p.x>=0&&p.y>=0&&p.x+p.width<=b.design.world.width&&p.y+p.height<=b.design.world.height));
});
test('campus remains explicitly unapproved and cannot claim runtime readiness', () => {
  const b=api.getBlueprint(),r=api.validate(world);
  assert.equal(b.approval.artworkSupplied,false); assert.equal(b.approval.runtimeReady,false);
  assert.equal(r.artworkReady,false); assert.equal(r.runtimeReady,false);
});
test('every navigation edge references declared nodes and each npc anchor is represented', () => {
  const b=api.getBlueprint(),ids=new Set(b.navigation.nodes.map(n=>n.id));
  b.navigation.edges.forEach(e=>{assert.ok(ids.has(e.from));assert.ok(ids.has(e.to));});
  b.npcs.forEach(n=>assert.ok(b.navigation.nodes.some(node=>node.anchor===n.anchor)));
});
