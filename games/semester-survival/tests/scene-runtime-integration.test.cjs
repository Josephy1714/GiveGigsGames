const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.join(__dirname, '..');
const context = {}; context.globalThis = context; vm.createContext(context);
for (const file of ['world-content.js', 'scene-assets.js', 'environment-runtime.js', 'scene-renderer.js']) {
  vm.runInContext(fs.readFileSync(path.join(base, file), 'utf8'), context);
}

function makeCanvas() {
  const draws = [];
  const ctx = {
    globalAlpha: 1,
    save() {}, restore() {}, setTransform() {}, clearRect() {},
    translate() {}, scale() {}, beginPath() {}, rect() {}, clip() {},
    drawImage(image) { draws.push(image); }
  };
  return { canvas: { width: 0, height: 0, style: {}, getContext: () => ctx }, draws };
}

test('asset pipeline, environment gate and renderer mount as one authored scene flow', async () => {
  const world = context.SemesterWorldContent;
  const districtIds = Object.keys(world.districts);
  const sceneAssets = { version: 1, scenes: {} };
  const sceneManifest = {};
  districtIds.forEach(district => {
    const assetId = district + '-background';
    sceneAssets.scenes[district] = { assets: [{
      id: assetId, src: 'assets/scenes/' + district + '/background.webp',
      role: 'background', width: 1920, height: 1080, maxBytes: 900000,
      credit: { author: 'Project illustrator', license: 'Original project asset' }
    }] };
    const place = world.districts[district].places[0];
    const interactables = place ? { [place.id]: { anchor: place.id + '-anchor' } } : {};
    const hotspots = {};
    Object.keys(interactables).forEach(placeId => { hotspots[interactables[placeId].anchor] = { x: 400, y: 300, width: 180, height: 200 }; });
    sceneManifest[district] = {
      sceneId: district + '-scene', requiredAssetIds: [assetId],
      spawnPoints: { default: 'entry-spawn' }, interactables,
      render: {
        width: 1920, height: 1080,
        layers: [{ id: 'background', assetId, x: 0, y: 0, width: 1920, height: 1080 }],
        hotspots
      }
    };
  });
  const pipeline = context.SemesterSceneAssets.create({
    manifest: sceneAssets,
    loadImage: async () => ({ naturalWidth: 1920, naturalHeight: 1080 })
  });
  const { canvas, draws } = makeCanvas();
  const renderer = context.SemesterSceneRenderer.create({ canvas });
  renderer.resize(960, 540, 2);
  const runtime = context.SemesterEnvironmentRuntime.create({
    world, sceneManifest, assetPipeline: pipeline, renderer
  });
  const state = await runtime.enter(districtIds[0]);
  assert.equal(state.district, districtIds[0]);
  assert.equal(renderer.getState().sceneId, districtIds[0] + '-scene');
  assert.equal(renderer.render().drawnLayers, 1);
  assert.equal(draws.length, 1);
  const place = world.districts[districtIds[0]].places[0];
  assert.equal(renderer.hitTest(250, 200, 960, 540), place ? place.id + '-anchor' : null);
});

test('renderer refuses to mount an interactable without a visual hotspot', async () => {
  const world = context.SemesterWorldContent;
  const district = Object.keys(world.districts)[0];
  const place = world.districts[district].places[0];
  const assetId = district + '-art';
  const pipeline = {
    manifestReport: [{ id: assetId, district }],
    async preloadDistrict() { return { ready: true, outcomes: [{ id: assetId, status: 'loaded' }] }; },
    getAsset() { return { width: 1920, height: 1080 }; }
  };
  const { canvas } = makeCanvas();
  const renderer = context.SemesterSceneRenderer.create({ canvas });
  const runtime = context.SemesterEnvironmentRuntime.create({
    world, assetPipeline: pipeline, renderer,
    sceneManifest: {
      [district]: {
        sceneId: 'bad-scene', requiredAssetIds: [assetId],
        spawnPoints: { default: 'spawn' },
        interactables: { [place.id]: { anchor: 'unplaced-anchor' } },
        render: { width: 1920, height: 1080, layers: [{ id: 'bg', assetId, x: 0, y: 0, width: 1920, height: 1080 }], hotspots: {} }
      }
    }
  });
  await assert.rejects(() => runtime.enter(district), /no authored render hotspot/);
  assert.equal(runtime.getState().district, null);
});
