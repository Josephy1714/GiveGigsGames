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
    beginPath() {}, rect() {}, clip() {}
  };
  return { canvas: { width: 0, height: 0, style: {}, getContext: () => ctx }, calls };
}
const scene = {
  width: 1920, height: 1080,
  layers: [
    { id: 'sky', assetId: 'sky-art', x: 0, y: 0, width: 1920, height: 1080, zIndex: 0, parallax: 0.15 },
    { id: 'foreground', assetId: 'foreground-art', x: 0, y: 0, width: 1920, height: 1080, zIndex: 2 }
  ],
  hotspots: { 'library-door': { x: 600, y: 400, width: 180, height: 260 } }
};
const assets = { 'sky-art': { width: 1920, height: 1080 }, 'foreground-art': { width: 1920, height: 1080 } };

test('requires decoded artwork and valid authored scene dimensions', () => {
  assert.throws(() => api.validateScene(scene, {}), /unavailable decoded asset/);
  assert.throws(() => api.validateScene({ ...scene, width: 0 }, assets), /positive design dimensions/);
  assert.throws(() => api.validateScene({ ...scene, layers: [] }, assets), /authored image layers/);
});

test('validates layer bounds, parallax, opacity, fit and hotspot geometry', () => {
  assert.throws(() => api.validateScene({ ...scene, layers: [{ ...scene.layers[0], width: -1 }] }, assets), /invalid bounds/);
  assert.throws(() => api.validateScene({ ...scene, layers: [{ ...scene.layers[0], parallax: 2 }] }, assets), /invalid parallax/);
  assert.throws(() => api.validateScene({ ...scene, hotspots: { bad: { x: 1, y: 1, width: 0, height: 3 } } }, assets), /authored bounds/);
});

test('mounts and composites authored layers in z-order without drawing substitute art', () => {
  const { canvas, calls } = fakeCanvas();
  const renderer = api.create({ canvas });
  renderer.resize(960, 540, 3);
  const mounted = renderer.mountScene('campus-main', { district: 'campus', scene, assets });
  assert.equal(mounted.layerCount, 2);
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
  renderer.updateCamera({ x: 0, y: 0 }, 1 / 60);
  assert.equal(renderer.hitTest(350, 230, 960, 540), 'library-door');
  assert.equal(renderer.hitTest(20, 20, 960, 540), null);
  renderer.focusInteractable('library-door');
  assert.equal(renderer.getState().focusedAnchor, 'library-door');
});

test('rejects missing hotspots and missing assets rather than masking incomplete scenes', () => {
  const { canvas } = fakeCanvas();
  const renderer = api.create({ canvas });
  assert.throws(() => renderer.mountScene('bad', { district: 'campus', scene, assets: { 'sky-art': assets['sky-art'] } }), /unavailable decoded asset/);
  assert.throws(() => renderer.mountScene('bad', { district: 'campus', scene: { ...scene, hotspots: {} }, assets }), /no authored render hotspot/);
  assert.throws(() => renderer.focusInteractable('unknown'), /Unknown authored interaction hotspot/);
});

test('supports canvases without a writable style property and requires resize before drawing', () => {
  const { calls } = fakeCanvas();
  const contextOnly = { save() {}, restore() {}, setTransform() {}, clearRect() {}, translate() {}, scale() {}, drawImage() {}, beginPath() {}, rect() {}, clip() {} };
  const canvas = { width: 0, height: 0, getContext: () => contextOnly };
  const renderer = api.create({ canvas });
  assert.throws(() => renderer.render(), /Resize the canvas before rendering/);
  renderer.resize(640, 360, 1);
  renderer.mountScene('campus-main', { district: 'campus', scene, assets });
  assert.equal(renderer.render().drawnLayers, 2);
});
