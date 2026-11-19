const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = { console, Map, Set, Object, Array, Math, Number, String, Boolean, Promise, Error, JSON, Date };
context.window = context;
context.globalThis = context;
vm.createContext(context);
for (const file of [
  'world-content.js',
  'scene-assets.js',
  'environment-runtime.js',
  'character-animation.js',
  'jay-atlas-manifest.js',
  'adventure-config.js'
]) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });

test('runtime configuration validates all four districts and Jay atlas metadata', async () => {
  const config = context.SEMESTER_SURVIVAL_ADVENTURE;
  assert.equal(config.autoStart, true);
  assert.equal(config.initialDistrict, 'residence');
  const report = context.SemesterSceneAssets.validate(config.assetManifest);
  assert.equal(report.length, 5);
  const atlas = report.find(item => item.id === config.characterAtlas.assetId);
  assert.equal(atlas.role, 'character-atlas');
  assert.deepEqual([atlas.width, atlas.height], [2260, 16216]);
  const errors = context.SemesterCharacterAnimation
    ? context.SemesterCharacterAnimation.validateManifest(config.characterAtlas.manifest, { width: atlas.width, height: atlas.height })
    : [];
  assert.deepEqual(errors, []);
});

test('all districts preload, mount, expose their places and accept authored interactions', async () => {
  const config = context.SEMESTER_SURVIVAL_ADVENTURE;
  const pipeline = context.SemesterSceneAssets.create({
    manifest: config.assetManifest,
    loadImage: async (_src, asset) => ({ naturalWidth: asset.width, naturalHeight: asset.height })
  });
  const mounts = [];
  const renderer = {
    async mountScene(id, payload) { mounts.push({ id, payload }); },
    getState() { return { sceneId: mounts.length ? mounts[mounts.length - 1].id : null }; }
  };
  const env = context.SemesterEnvironmentRuntime.create({
    world: context.SemesterWorldContent,
    sceneManifest: config.sceneManifest,
    assetPipeline: pipeline,
    renderer
  });
  for (const district of Object.keys(context.SemesterWorldContent.districts)) {
    const result = await env.enter(district);
    assert.equal(result.status, 'ready', district);
    const places = env.getPlaces();
    assert.ok(places.length > 0, district);
    assert.ok(places.every(place => place.available), district);
    const graph = env.getNavigationGraph();
    assert.ok(graph && graph.nodes.length > 0, district);
    const first = places[0];
    assert.equal(env.interact(first.id, first.actions[0]).district, district);
  }
  assert.equal(mounts.length, 4);
  assert.equal(pipeline.getStatus().failed, 0);
});
