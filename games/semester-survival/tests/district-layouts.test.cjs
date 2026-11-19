'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.join(__dirname, '..');
const context = { console }; context.globalThis = context; vm.createContext(context);
for (const file of ['world-content.js', 'district-layouts.js']) {
  vm.runInContext(fs.readFileSync(path.join(base, file), 'utf8'), context, { filename: file });
}
const world = context.SemesterWorldContent;
const layouts = context.SemesterDistrictLayouts;

test('all four districts have authored 2.5D scene contracts', () => {
  assert.equal(layouts.validate(world), true);
  const manifest = layouts.createSceneManifest(world);
  assert.deepEqual(Object.keys(manifest).sort(), ['campus', 'city', 'residence', 'township']);
  for (const [districtId, scene] of Object.entries(manifest)) {
    assert.ok(scene.sceneId);
    assert.ok(scene.requiredAssetIds.length >= 3);
    assert.equal(scene.render.width, 960);
    assert.equal(scene.render.height, 540);
    assert.deepEqual({ width: scene.render.worldBounds.width, height: scene.render.worldBounds.height }, { width: 2880, height: 1080 });
    assert.equal(scene.render.layers.length, 3);
    assert.ok(scene.render.layers.every(layer => scene.requiredAssetIds.includes(layer.assetId) && layer.width === 2880 && layer.height === 1080));
    assert.deepEqual({ maxX: scene.render.cameraBounds.maxX, maxY: scene.render.cameraBounds.maxY }, { maxX: 1920, maxY: 540 });
    assert.ok(scene.spawnPoints.default);
  }
});

test('every world place has exactly one authored hotspot and interactable', () => {
  const manifest = layouts.createSceneManifest(world);
  for (const [districtId, district] of Object.entries(world.districts)) {
    const scene = manifest[districtId];
    assert.deepEqual(Object.keys(scene.interactables).sort(), district.places.map(p => p.id).sort());
    for (const place of district.places) {
      const anchor = scene.interactables[place.id].anchor;
      assert.ok(scene.render.hotspots[anchor], districtId + '/' + place.id);
    }
  }
});

test('NPC anchors reference authored characters and distinct scene hotspots', () => {
  const manifest = layouts.createSceneManifest(world);
  for (const [districtId, scene] of Object.entries(manifest)) {
    const ids = new Set();
    for (const npc of scene.npcAnchors) {
      assert.ok(world.characters[npc.characterId]);
      assert.ok(scene.render.hotspots[npc.anchor]);
      assert.ok(!ids.has(npc.anchor));
      ids.add(npc.anchor);
    }
  }
});

test('route arrivals are reciprocal and use in-bounds named spawn points', () => {
  const manifest = layouts.createSceneManifest(world);
  for (const [districtId, scene] of Object.entries(manifest)) {
    for (const route of scene.routes) {
      assert.ok(world.districts[districtId].exits.includes(route.destination));
      assert.ok(world.districts[route.destination].exits.includes(districtId));
      assert.ok(scene.spawnPoints[route.spawn]);
      const destinationArrival = manifest[route.destination].spawnPoints['from-' + districtId];
      assert.ok(destinationArrival, districtId + ' -> ' + route.destination);
      assert.ok(destinationArrival.x >= scene.render.playerBounds.minX);
      assert.ok(destinationArrival.x <= scene.render.playerBounds.maxX);
    }
  }
});

test('layout contracts reference future art IDs without inventing asset files', () => {
  const manifest = layouts.createSceneManifest(world);
  const ids = Object.values(manifest).flatMap(scene => scene.requiredAssetIds);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(id => /^(residence|township|campus|city)-(background|midground|foreground)-art$/.test(id)));
});
console.log('district-layouts tests loaded');
