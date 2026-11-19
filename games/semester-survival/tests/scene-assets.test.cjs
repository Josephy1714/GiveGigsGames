const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = { console }; context.globalThis = context; vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'scene-assets.js'), 'utf8'), context);
const api = context.SemesterSceneAssets;
const asset = (id, extra = {}) => ({ id, src: 'assets/scenes/residence/room.webp', role: 'background', width: 1920, height: 1080, maxBytes: 900000, credit: { author: 'Project artist', license: 'Original project asset' }, ...extra });
const manifest = { version: 1, scenes: { residence: { assets: [asset('res-room')] }, campus: { assets: [asset('campus-bg', { src: 'assets/scenes/campus/main.webp' })] } } };

test('validates and inventories locally credited assets', () => { const report = api.validate(manifest); assert.equal(report.length, 2); assert.equal(report[0].district, 'residence'); });
test('rejects remote, absolute and traversal paths', () => {
  for (const src of ['https://example.com/a.webp', '/assets/a.webp', '../secret.webp', 'assets/../secret.webp']) {
    assert.throws(() => api.validate({ version: 1, scenes: { residence: { assets: [asset('bad', { src })] } } }), /safe relative path/);
  }
});
test('requires attribution, dimensions, known roles and bounded asset size', () => {
  assert.throws(() => api.validate({ version: 1, scenes: { x: { assets: [asset('x', { credit: null })] } } }), /credits/);
  assert.throws(() => api.validate({ version: 1, scenes: { x: { assets: [asset('x', { width: 0 })] } } }), /dimensions/);
  assert.throws(() => api.validate({ version: 1, scenes: { x: { assets: [asset('x', { role: 'video' })] } } }), /Unsupported asset role/);
  assert.throws(() => api.validate({ version: 1, scenes: { x: { assets: [asset('x', { maxBytes: 9000000 })] } } }), /byte budget/);
});
test('rejects duplicate asset ids across districts', () => { assert.throws(() => api.validate({ version: 1, scenes: { a: { assets: [asset('same')] }, b: { assets: [asset('same')] } } }), /Duplicate asset id/); });
test('preloads local images and verifies exact dimensions', async () => {
  const pipeline = api.create({ manifest, loadImage: async src => ({ src, naturalWidth: 1920, naturalHeight: 1080 }) });
  const result = await pipeline.preloadDistrict('residence');
  assert.equal(result.ready, true); assert.equal(pipeline.getAsset('res-room').naturalWidth, 1920);
  assert.deepEqual({ total: pipeline.getStatus().total, loaded: pipeline.getStatus().loaded, failed: pipeline.getStatus().failed }, { total: 2, loaded: 1, failed: 0 });
});
test('reports missing/corrupt art without replacing it', async () => {
  const pipeline = api.create({ manifest, loadImage: async () => ({ naturalWidth: 10, naturalHeight: 10 }) });
  const result = await pipeline.preloadDistrict('residence');
  assert.equal(result.ready, false); assert.match(result.outcomes[0].error, /Dimension mismatch/);
  assert.throws(() => pipeline.getAsset('res-room'), /Dimension mismatch/);
});
test('caches loaded assets and rejects unknown districts', async () => {
  let count = 0; const pipeline = api.create({ manifest, loadImage: async () => { count++; return { width: 1920, height: 1080 }; } });
  await pipeline.preloadDistrict('residence'); await pipeline.preloadDistrict('residence');
  assert.equal(count, 1); await assert.rejects(() => pipeline.preloadDistrict('unknown'), /No asset manifest/);
});
