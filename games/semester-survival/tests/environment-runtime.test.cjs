const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.join(__dirname, '..');
const context = { console }; context.globalThis = context; vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(base, 'world-content.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(base, 'environment-runtime.js'), 'utf8'), context);
const world = context.SemesterWorldContent;
const manifest = {
  residence: { sceneId: 'residence-main', requiredAssetIds: ['res-room'], spawnPoints: { default: 'spawn-room', fromTownship: 'spawn-gate' }, interactables: { room: { anchor: 'room-door' } } },
  township: { sceneId: 'township-main', requiredAssetIds: ['township-bg'], spawnPoints: { default: 'spawn-stage' }, interactables: { 'mama-njeri-kiosk': { anchor: 'kiosk-counter' } } },
  campus: { sceneId: 'campus-main', requiredAssetIds: ['campus-bg'], spawnPoints: { default: 'spawn-gate' }, interactables: { library: { anchor: 'library-desk' } } },
  city: { sceneId: 'city-main', requiredAssetIds: ['city-bg'], spawnPoints: { default: 'spawn-terminal' }, interactables: { 'career-centre': { anchor: 'career-desk' } } }
};
function makePipeline(options = {}) {
  const report = [
    { id: 'res-room', district: 'residence' }, { id: 'township-bg', district: 'township' },
    { id: 'campus-bg', district: 'campus' }, { id: 'city-bg', district: 'city' }
  ];
  const loaded = new Set();
  return {
    manifestReport: report,
    async preloadDistrict(id) {
      if (options.delay) await options.delay(id);
      if (options.failDistrict === id) return { ready: false, outcomes: [{ id: manifest[id].requiredAssetIds[0], status: 'failed', error: 'missing image' }] };
      const assetId = manifest[id].requiredAssetIds[0]; loaded.add(assetId);
      return { ready: true, outcomes: [{ id: assetId, status: 'loaded' }] };
    },
    getAsset(id) { if (!loaded.has(id)) throw new Error('not loaded'); return { id }; }
  };
}

test('requires an asset pipeline and refuses scenes without required art', () => {
  assert.throws(() => context.SemesterEnvironmentRuntime.create({ world, sceneManifest: manifest }), /asset pipeline is required/);
  const incomplete = { ...manifest, residence: { ...manifest.residence, requiredAssetIds: ['unlisted'] } };
  assert.throws(() => context.SemesterEnvironmentRuntime.create({ world, sceneManifest: incomplete, assetPipeline: makePipeline() }), /missing from the asset manifest/);
});

test('preloads and verifies required authored assets before entering a scene', async () => {
  const runtime = context.SemesterEnvironmentRuntime.create({ world, sceneManifest: manifest, assetPipeline: makePipeline() });
  assert.equal(runtime.getDiagnostics().find(d => d.district === 'residence').status, 'not-prepared');
  const state = await runtime.enter('residence');
  assert.equal(state.sceneId, 'residence-main');
  assert.equal(state.revision, 1);
  assert.equal(runtime.getDiagnostics().find(d => d.district === 'residence').status, 'ready');
  assert.equal(runtime.getPlaces().find(p => p.id === 'room').available, true);
  assert.equal(runtime.getPlaces().find(p => p.id === 'courtyard').available, false);
  assert.ok(runtime.getDiagnostics().every(d => d.missingAnchors.length > 0));
});

test('rejects missing scenes and failed artwork without substituting placeholders', async () => {
  const missing = context.SemesterEnvironmentRuntime.create({ world, sceneManifest: {}, assetPipeline: makePipeline() });
  await assert.rejects(() => missing.enter('campus'), /Scene is unavailable/);
  const runtime = context.SemesterEnvironmentRuntime.create({ world, sceneManifest: manifest, assetPipeline: makePipeline({ failDistrict: 'campus' }) });
  await assert.rejects(() => runtime.enter('campus'), /missing image|not ready/);
  assert.equal(runtime.getState().district, null);
  assert.equal(runtime.getDiagnostics().find(d => d.district === 'campus').status, 'failed');
});

test('enforces authored routes and spawn points before loading', async () => {
  let loads = 0; const pipeline = makePipeline();
  const original = pipeline.preloadDistrict.bind(pipeline);
  pipeline.preloadDistrict = async id => { loads++; return original(id); };
  const runtime = context.SemesterEnvironmentRuntime.create({ world, sceneManifest: manifest, assetPipeline: pipeline });
  await runtime.enter('residence');
  await assert.rejects(() => runtime.enter('city'), /No authored route/);
  await assert.rejects(() => runtime.enter('township', { spawn: 'unknown' }), /Unknown spawn point/);
  assert.equal(loads, 1);
  assert.equal(runtime.getState().district, 'residence');
});

test('awaits renderer mounting and rolls back after mount failure', async () => {
  const calls = [];
  const runtime = context.SemesterEnvironmentRuntime.create({
    world, sceneManifest: manifest, assetPipeline: makePipeline(),
    renderer: { async mountScene(id, data) { calls.push([id, data.district, Object.keys(data.assets)]); if (id === 'township-main') throw new Error('mount failed'); } }
  });
  await runtime.enter('residence');
  await assert.rejects(() => runtime.enter('township'), /mount failed/);
  assert.equal(runtime.getState().district, 'residence');
  assert.deepEqual(calls, [['residence-main', 'residence', ['res-room']], ['township-main', 'township', ['township-bg']]]);
});

test('prevents overlapping scene transitions while assets are loading', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const runtime = context.SemesterEnvironmentRuntime.create({
    world, sceneManifest: manifest, assetPipeline: makePipeline({ delay: () => gate })
  });
  const pending = runtime.enter('residence');
  await Promise.resolve();
  await assert.rejects(() => runtime.enter('township'), /transition is already in progress/);
  release(); await pending;
});

test('only authored anchors can trigger valid place actions after scene readiness', async () => {
  const events = []; const focused = [];
  const runtime = context.SemesterEnvironmentRuntime.create({
    world, sceneManifest: manifest, assetPipeline: makePipeline(), onEvent: event => events.push(event),
    renderer: { mountScene() {}, focusInteractable(anchor) { focused.push(anchor); } }
  });
  await runtime.enter('residence');
  assert.throws(() => runtime.interact('courtyard', 'socialize'), /anchor is supplied/);
  assert.throws(() => runtime.interact('room', 'buy-meal'), /not supported/);
  const event = runtime.interact('room', 'sleep');
  assert.equal(event.anchor, 'room-door');
  assert.deepEqual(focused, ['room-door']);
  assert.equal(events.at(-1).type, 'world:interaction');
});

test('rejects invalid scene manifests and duplicate required ids at construction', () => {
  const invalid = { ...manifest, residence: { ...manifest.residence, interactables: { imaginary: { anchor: 'x' } } } };
  assert.throws(() => context.SemesterEnvironmentRuntime.create({ world, sceneManifest: invalid, assetPipeline: makePipeline() }), /unknown place/);
  const noAnchor = { ...manifest, residence: { ...manifest.residence, interactables: { room: {} } } };
  assert.throws(() => context.SemesterEnvironmentRuntime.create({ world, sceneManifest: noAnchor, assetPipeline: makePipeline() }), /authored anchor id/);
  const duplicate = { ...manifest, residence: { ...manifest.residence, requiredAssetIds: ['res-room', 'res-room'] } };
  assert.throws(() => context.SemesterEnvironmentRuntime.create({ world, sceneManifest: duplicate, assetPipeline: makePipeline() }), /duplicate required/);
});
