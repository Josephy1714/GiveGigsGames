const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = {}; context.globalThis = context; vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'scene-renderer.js'), 'utf8'), context);
const api = context.SemesterSceneRenderer;

function fakeCanvas() {
  const calls = [];
  const ctx = {
    globalAlpha: 1,
    save() { calls.push(['save']); }, restore() { calls.push(['restore']); },
    setTransform(...args) { calls.push(['setTransform', ...args]); },
    clearRect(...args) { calls.push(['clearRect', ...args]); },
    translate(...args) { calls.push(['translate', ...args]); },
    scale(...args) { calls.push(['scale', ...args]); },
    drawImage(...args) { calls.push(['drawImage', ...args]); },
    beginPath() {}, rect() {}, clip() {}, fillRect(...args) { calls.push(['fillRect', ...args]); },
    moveTo(...args) { calls.push(['moveTo', ...args]); }, lineTo(...args) { calls.push(['lineTo', ...args]); }, stroke() { calls.push(['stroke']); }
  };
  return { canvas: { width: 0, height: 0, style: {}, getContext: () => ctx }, calls };
}
const scene = {
  width: 960, height: 540, worldBounds: { width: 2160, height: 1040 }, groundY: 880, depthScale: 0.6, depthBounds: { min: -180, max: 180 }, cameraBounds: { minX: 0, minY: 0, maxX: 1200, maxY: 500 }, playerBounds: { minX: 40, maxX: 2000 },
  layers: [
    { id: 'sky', assetId: 'sky-art', x: 0, y: 0, width: 2160, height: 1040, zIndex: 0, parallax: 0.15 },
    { id: 'foreground', assetId: 'foreground-art', x: 0, y: 0, width: 2160, height: 1040, zIndex: 2 }
  ],
  hotspots: { 'library-door': { x: 600, y: 400, width: 180, height: 260 } }
};
const assets = { 'sky-art': { width: 2160, height: 1040 }, 'foreground-art': { width: 2160, height: 1040 } };

test('requires decoded artwork and valid authored scene dimensions', () => {
  assert.throws(() => api.validateScene(scene, {}), /unavailable decoded asset/);
  assert.throws(() => api.validateScene({ ...scene, width: 0 }, assets), /positive design dimensions/);
  assert.throws(() => api.validateScene({ ...scene, layers: [] }, assets), /authored image layers/);
});

test('validates layer bounds, parallax, opacity, fit and hotspot geometry', () => {
  assert.throws(() => api.validateScene({ ...scene, layers: [{ ...scene.layers[0], width: -1 }] }, assets), /invalid bounds/);
  assert.throws(() => api.validateScene({ ...scene, layers: [{ ...scene.layers[0], parallax: 2 }] }, assets), /invalid parallax/);
  assert.throws(() => api.validateScene({ ...scene, hotspots: { bad: { x: 1, y: 1, width: 0, height: 3 } } }, assets), /authored bounds/);
  assert.throws(() => api.validateScene({ ...scene, playerBounds: { minX: 10, maxX: 10 } }, assets), /playerBounds are invalid/);
  assert.throws(() => api.validateScene({ ...scene, hotspots: { outside: { x: 2100, y: 1, width: 100, height: 20 } } }, assets), /outside authored worldBounds/);
  assert.throws(() => api.validateScene({ ...scene, cameraBounds: { minX: 0, minY: 0, maxX: 1300, maxY: 500 } }, assets), /cameraBounds are invalid/);
});

test('mounts and composites authored layers in z-order without drawing substitute art', () => {
  const { canvas, calls } = fakeCanvas();
  const renderer = api.create({ canvas });
  renderer.resize(960, 540, 3);
  const mounted = renderer.mountScene('campus-main', { district: 'campus', scene, assets });
  assert.equal(mounted.layerCount, 2);
  assert.equal(renderer.getLayout().groundY, 880);
  assert.deepEqual({ width: renderer.getLayout().worldBounds.width, height: renderer.getLayout().worldBounds.height }, { width: 2160, height: 1040 });
  assert.equal(renderer.getLayout().depthScale, 0.6);
  assert.deepEqual({min:renderer.getLayout().depthBounds.min,max:renderer.getLayout().depthBounds.max},{min:-180,max:180});
  assert.deepEqual({min:renderer.getLayout().playerBounds.minX,max:renderer.getLayout().playerBounds.maxX},{min:40,max:2000});
  const result = renderer.render();
  assert.deepEqual({ drawnLayers: result.drawnLayers, sceneId: result.sceneId }, { drawnLayers: 2, sceneId: 'campus-main' });
  assert.equal(calls.filter(call => call[0] === 'drawImage').length, 2);
  assert.equal(canvas.width, 1920);
});

test('supports camera parallax and authored hotspot hit testing', () => {
  const { canvas } = fakeCanvas();
  const renderer = api.create({ canvas, cameraSmoothing: 0 });
  renderer.resize(960, 540, 1);
  renderer.mountScene('campus-main', { district: 'campus', scene, assets });
  renderer.updateCamera({ x: 5000, y: 5000 }, 1 / 60);
  assert.equal(renderer.getState().camera.x, 1200);
  assert.equal(renderer.getState().camera.y, 500);
  renderer.updateCamera({ x: 0, y: 0 }, 1 / 60);
  renderer.updateCamera({ x: 720, y: 610 }, 1 / 60);
  assert.equal(renderer.getState().camera.x, 240);
  assert.equal(renderer.getState().camera.y, 340);
  renderer.updateCamera({ x: 960, y: 540 }, 1 / 60);
  assert.equal(renderer.hitTest(150, 230, 960, 540), 'library-door');
  assert.equal(renderer.hitTest(20, 20, 960, 540), null);
  renderer.focusInteractable('library-door');
  assert.equal(renderer.getState().focusedAnchor, 'library-door');
});

test('rejects missing hotspots and missing assets rather than masking incomplete scenes', () => {
  const { canvas } = fakeCanvas();
  const renderer = api.create({ canvas });
  assert.throws(() => renderer.mountScene('bad', { district: 'campus', scene, assets: { 'sky-art': assets['sky-art'] } }), /unavailable decoded asset/);
  assert.throws(() => renderer.mountScene('bad', { district: 'campus', scene: { ...scene, hotspots: {} }, assets, interactables: { library: { anchor: 'library-door' } } }), /no authored render hotspot/);
  assert.throws(() => renderer.mountScene('bad-npc', { district: 'campus', scene, assets, npcAnchors: [{ characterId: 'brian', anchor: 'missing-npc' }] }), /no authored render hotspot/);
  assert.throws(() => renderer.focusInteractable('unknown'), /Unknown authored interaction hotspot/);
});

test('supports canvases without a writable style property and requires resize before drawing', () => {
  const { calls } = fakeCanvas();
  const contextOnly = { save() {}, restore() {}, setTransform() {}, clearRect() {}, translate() {}, scale() {}, drawImage() {}, beginPath() {}, rect() {}, clip() {} };
  const canvas = { width: 0, height: 0, getContext: () => contextOnly };
  const renderer = api.create({ canvas });
  renderer.mountScene('campus-main', { district: 'campus', scene, assets });
  assert.throws(() => renderer.render(), /Resize the canvas before rendering/);
  renderer.resize(640, 360, 1);
  assert.equal(renderer.render().drawnLayers, 2);
});

test('exposes immutable authored hotspot bounds for interaction proximity', () => {
  const { canvas } = fakeCanvas();
  const renderer = api.create({ canvas });
  renderer.resize(960, 540, 1);
  renderer.mountScene('campus-main', { district: 'campus', scene, assets });
  const bounds = renderer.getHotspotBounds('library-door');
  assert.deepEqual({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, centerX: bounds.centerX, centerY: bounds.centerY },
    { x: 600, y: 400, width: 180, height: 260, centerX: 690, centerY: 530 });
  assert.equal(Object.isFrozen(bounds), true);
  assert.equal(renderer.getHotspotBounds('missing'), null);
});

test('renders validated weather atmosphere without replacing authored scene artwork', () => {
  const { canvas, calls } = fakeCanvas();
  const renderer = api.create({ canvas });
  renderer.resize(960, 540, 1);
  renderer.mountScene('campus-weather', { district: 'campus', scene, assets });
  assert.throws(() => renderer.setAtmosphere({ condition: 'snow', light: 1, precipitation: 1, wind: 0, fog: 0, timeOfDay: 600 }), /Atmosphere state is invalid/);
  renderer.setAtmosphere({ condition: 'rain', light: 0.7, precipitation: 0.72, wind: 0.42, fog: 0.13, timeOfDay: 780, phase: 4 });
  const result = renderer.render();
  assert.equal(result.weather, 'rain');
  assert.ok(calls.some(call => call[0] === 'stroke'));
  assert.ok(calls.some(call => call[0] === 'fillRect'));
});
