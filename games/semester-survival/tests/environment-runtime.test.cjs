const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.join(__dirname, '..');
const context = { console };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(base, 'world-content.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(base, 'environment-runtime.js'), 'utf8'), context);
const world = context.SemesterWorldContent;
const manifest = {
  residence: { sceneId: 'residence-main', spawnPoints: { default: 'spawn-room', fromTownship: 'spawn-gate' }, interactables: { room: { anchor: 'room-door' } } },
  township: { sceneId: 'township-main', spawnPoints: { default: 'spawn-stage' }, interactables: { 'mama-njeri-kiosk': { anchor: 'kiosk-counter' } } },
  campus: { sceneId: 'campus-main', spawnPoints: { default: 'spawn-gate' }, interactables: { library: { anchor: 'library-desk' } } },
  city: { sceneId: 'city-main', spawnPoints: { default: 'spawn-terminal' }, interactables: { 'career-centre': { anchor: 'career-desk' } } }
};

test('enters an authored starting scene and exposes truthful diagnostics', () => {
  const runtime = context.SemesterEnvironmentRuntime.create({ world, sceneManifest: manifest });
  const state = runtime.enter('residence');
  assert.equal(state.sceneId, 'residence-main');
  assert.equal(state.revision, 1);
  assert.equal(runtime.getPlaces().find(p => p.id === 'room').available, true);
  assert.equal(runtime.getPlaces().find(p => p.id === 'courtyard').available, false);
  assert.ok(runtime.getDiagnostics().every(d => d.missingAnchors.length > 0));
});

test('rejects missing scenes rather than substituting placeholder environments', () => {
  const runtime = context.SemesterEnvironmentRuntime.create({ world, sceneManifest: {} });
  assert.throws(() => runtime.enter('campus'), /assets are not ready/);
  assert.equal(runtime.getState().district, null);
});

test('enforces authored reciprocal routes and spawn points', () => {
  const runtime = context.SemesterEnvironmentRuntime.create({ world, sceneManifest: manifest });
  runtime.enter('residence');
  assert.throws(() => runtime.enter('city'), /No authored route/);
  assert.throws(() => runtime.enter('township', { spawn: 'unknown' }), /Unknown spawn point/);
  assert.equal(runtime.getState().district, 'residence');
});

test('mounts renderer scene and restores previous district if mounting fails', () => {
  const calls = [];
  const runtime = context.SemesterEnvironmentRuntime.create({
    world, sceneManifest: manifest,
    renderer: { mountScene(id, data) { calls.push([id, data.district]); if (id === 'township-main') throw new Error('mount failed'); } }
  });
  runtime.enter('residence');
  assert.throws(() => runtime.enter('township'), /mount failed/);
  assert.equal(runtime.getState().district, 'residence');
  assert.deepEqual(calls, [['residence-main', 'residence'], ['township-main', 'township']]);
});

test('only authored anchors can trigger valid place actions', () => {
  const events = [];
  const focused = [];
  const runtime = context.SemesterEnvironmentRuntime.create({
    world, sceneManifest: manifest, onEvent: event => events.push(event),
    renderer: { mountScene() {}, focusInteractable(anchor) { focused.push(anchor); } }
  });
  runtime.enter('residence');
  assert.throws(() => runtime.interact('courtyard', 'socialize'), /anchor is supplied/);
  assert.throws(() => runtime.interact('room', 'buy-meal'), /not supported/);
  const event = runtime.interact('room', 'sleep');
  assert.equal(event.anchor, 'room-door');
  assert.deepEqual(focused, ['room-door']);
  assert.equal(events.at(-1).type, 'world:interaction');
});

test('rejects invalid scene manifests at construction', () => {
  const invalid = { ...manifest, residence: { sceneId: 'r', interactables: { imaginary: { anchor: 'x' } } } };
  assert.throws(() => context.SemesterEnvironmentRuntime.create({ world, sceneManifest: invalid }), /unknown place/);
  const noAnchor = { ...manifest, residence: { sceneId: 'r', interactables: { room: {} } } };
  assert.throws(() => context.SemesterEnvironmentRuntime.create({ world, sceneManifest: noAnchor }), /authored anchor id/);
});
