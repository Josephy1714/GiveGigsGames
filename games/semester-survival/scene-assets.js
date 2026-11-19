/* Semester Survival — authored scene asset manifest and preload pipeline.
 * Only locally authored/licensed files are accepted. No placeholder art is created.
 */
(function (root) {
  'use strict';
  function error(message) { throw new Error(message); }
  function safePath(path) {
    return typeof path === 'string' && path.length > 0 &&
      !/^(?:[a-z]+:)?\/\//i.test(path) && !path.startsWith('/') &&
      !path.split('/').includes('..') && !/[?#]/.test(path);
  }
  function validateManifest(manifest, options) {
    options = options || {};
    if (!manifest || manifest.version !== 1 || !manifest.scenes || typeof manifest.scenes !== 'object') error('Scene asset manifest must use schema version 1 and include scenes.');
    const maxBytes = Number.isFinite(options.maxAssetBytes) ? options.maxAssetBytes : 4 * 1024 * 1024;
    const ids = new Set(), report = [];
    Object.keys(manifest.scenes).forEach(function (districtId) {
      const scene = manifest.scenes[districtId];
      if (!scene || !Array.isArray(scene.assets)) error('Scene "' + districtId + '" must declare an assets array.');
      scene.assets.forEach(function (asset) {
        if (!asset || typeof asset.id !== 'string' || !asset.id.trim()) error('Every scene asset needs an id.');
        if (ids.has(asset.id)) error('Duplicate asset id: ' + asset.id);
        ids.add(asset.id);
        if (!safePath(asset.src)) error('Asset "' + asset.id + '" must use a safe relative path.');
        if (!['background', 'layer', 'prop', 'character-atlas'].includes(asset.role)) error('Unsupported asset role for "' + asset.id + '".');
        if (!Number.isInteger(asset.width) || asset.width < 1 || !Number.isInteger(asset.height) || asset.height < 1) error('Asset "' + asset.id + '" requires positive integer dimensions.');
        if (!Number.isFinite(asset.maxBytes) || asset.maxBytes < 1 || asset.maxBytes > maxBytes) error('Asset "' + asset.id + '" exceeds the configured byte budget.');
        if (!asset.credit || typeof asset.credit.author !== 'string' || !asset.credit.author.trim() || typeof asset.credit.license !== 'string' || !asset.credit.license.trim()) error('Asset "' + asset.id + '" requires author and licence credits.');
        report.push(Object.freeze({ id: asset.id, district: districtId, src: asset.src, role: asset.role, width: asset.width, height: asset.height, maxBytes: asset.maxBytes }));
      });
    });
    return Object.freeze(report);
  }
  function browserImageLoader(src) {
    return new Promise(function (resolve, reject) {
      if (typeof root.Image !== 'function') return reject(new Error('Image loading is unavailable in this environment.'));
      const image = new root.Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(new Error('Could not load local scene asset: ' + src)); };
      image.src = src;
    });
  }
  function create(options) {
    options = options || {};
    const manifest = options.manifest, assets = validateManifest(manifest, options);
    const loadImage = options.loadImage || browserImageLoader;
    const loaded = new Map(), failed = new Map();
    async function preloadDistrict(districtId) {
      const scene = manifest.scenes[districtId];
      if (!scene) error('No asset manifest exists for district "' + districtId + '".');
      const outcomes = await Promise.all(scene.assets.map(async function (asset) {
        if (loaded.has(asset.id)) return { id: asset.id, status: 'loaded' };
        try {
          const image = await loadImage(asset.src, asset);
          const width = Number(image && (image.naturalWidth || image.width));
          const height = Number(image && (image.naturalHeight || image.height));
          if (width !== asset.width || height !== asset.height) throw new Error('Dimension mismatch for "' + asset.id + '": expected ' + asset.width + 'x' + asset.height + ', received ' + width + 'x' + height + '.');
          loaded.set(asset.id, image); failed.delete(asset.id);
          return { id: asset.id, status: 'loaded' };
        } catch (err) { failed.set(asset.id, err.message); return { id: asset.id, status: 'failed', error: err.message }; }
      }));
      return Object.freeze({ district: districtId, ready: outcomes.every(x => x.status === 'loaded'), outcomes: Object.freeze(outcomes.map(x => Object.freeze({ id: x.id, status: x.status, error: x.error || null }))) });
    }
    async function preloadAll() {
      const results = [];
      for (const districtId of Object.keys(manifest.scenes)) results.push(await preloadDistrict(districtId));
      return Object.freeze(results);
    }
    function getAsset(id) {
      if (!loaded.has(id)) error(failed.has(id) ? failed.get(id) : 'Asset "' + id + '" has not been loaded.');
      return loaded.get(id);
    }
    function getStatus() {
      return Object.freeze({ total: assets.length, loaded: loaded.size, failed: failed.size, ready: loaded.size === assets.length && failed.size === 0,
        failures: Object.freeze(Array.from(failed.entries()).map(entry => Object.freeze({ id: entry[0], reason: entry[1] }))) });
    }
    return Object.freeze({ preloadDistrict, preloadAll, getAsset, getStatus, manifestReport: assets });
  }
  root.SemesterSceneAssets = Object.freeze({ validate: validateManifest, create });
})(typeof window !== 'undefined' ? window : globalThis);
