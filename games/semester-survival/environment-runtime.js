/* Semester Survival — authored environment scene orchestration.
 * A district is playable only after its required local artwork is decoded and its
 * authored interaction anchors and spawn points have been validated.
 * This module never fabricates fallback scenes or placeholder art.
 */
(function (root) {
  'use strict';

  function fail(message) { throw new Error(message); }

  function createEnvironmentRuntime(options) {
    options = options || {};
    const world = options.world || root.SemesterWorldContent;
    const renderer = options.renderer || null;
    const assetPipeline = options.assetPipeline || null;
    const onEvent = typeof options.onEvent === 'function' ? options.onEvent : function () {};
    if (!world || !world.districts || typeof world.validate !== 'function') fail('World content is required.');
    world.validate();
    if (!assetPipeline || typeof assetPipeline.preloadDistrict !== 'function' ||
        typeof assetPipeline.getAsset !== 'function' || !Array.isArray(assetPipeline.manifestReport)) {
      fail('A validated scene asset pipeline is required. Scenes cannot be entered without it.');
    }

    const districtIds = Object.keys(world.districts);
    const sceneManifest = options.sceneManifest || {};
    const scenes = Object.create(null);
    const assetOwners = new Map();
    assetPipeline.manifestReport.forEach(function (asset) {
      if (assetOwners.has(asset.id)) fail('Asset pipeline contains duplicate asset id "' + asset.id + '".');
      assetOwners.set(asset.id, asset.district);
    });

    districtIds.forEach(function (districtId) {
      const source = sceneManifest[districtId];
      if (!source || typeof source.sceneId !== 'string' || !source.sceneId.trim()) {
        scenes[districtId] = {
          status: 'missing-scene', sceneId: null, requiredAssetIds: [],
          spawnPoints: Object.create(null), interactables: Object.create(null),
          error: 'No authored scene manifest is supplied.'
        };
        return;
      }

      if (!Array.isArray(source.requiredAssetIds) || source.requiredAssetIds.length === 0) {
        fail('Scene "' + districtId + '" must declare at least one required authored asset id.');
      }
      const requiredAssetIds = Array.from(new Set(source.requiredAssetIds));
      if (requiredAssetIds.length !== source.requiredAssetIds.length) {
        fail('Scene "' + districtId + '" contains duplicate required asset ids.');
      }
      requiredAssetIds.forEach(function (assetId) {
        if (assetOwners.get(assetId) !== districtId) {
          fail('Required asset "' + assetId + '" is missing from the asset manifest for district "' + districtId + '".');
        }
      });

      const spawnPoints = Object.assign(Object.create(null), source.spawnPoints || {});
      if (!spawnPoints.default) fail('Scene "' + districtId + '" requires an authored default spawn point.');
      const interactables = Object.assign(Object.create(null), source.interactables || {});
      Object.keys(interactables).forEach(function (placeId) {
        const placeExists = world.districts[districtId].places.some(function (p) { return p.id === placeId; });
        if (!placeExists) fail('Scene references unknown place "' + placeId + '" in ' + districtId + '.');
        const item = interactables[placeId];
        if (!item || typeof item.anchor !== 'string' || !item.anchor.trim()) {
          fail('Interactable "' + placeId + '" requires an authored anchor id.');
        }
      });
      scenes[districtId] = {
        status: 'not-prepared', sceneId: source.sceneId, requiredAssetIds: requiredAssetIds,
        spawnPoints: spawnPoints, interactables: interactables, error: null, preparation: null
      };
    });

    let current = null;
    let transitioning = false;
    let revision = 0;

    function snapshot() {
      return Object.freeze({
        district: current,
        sceneId: current && scenes[current] ? scenes[current].sceneId : null,
        status: current ? scenes[current].status : 'unloaded',
        transitioning: transitioning,
        revision: revision
      });
    }

    function prepareDistrict(districtId) {
      if (!world.districts[districtId]) return Promise.reject(new Error('Unknown district: ' + districtId));
      const scene = scenes[districtId];
      if (!scene.sceneId) return Promise.resolve(Object.freeze({
        district: districtId, ready: false, status: scene.status, error: scene.error, assets: []
      }));
      if (scene.status === 'ready') return Promise.resolve(Object.freeze({
        district: districtId, ready: true, status: 'ready', error: null,
        assets: scene.requiredAssetIds.slice()
      }));
      if (scene.preparation) return scene.preparation;

      scene.status = 'loading';
      scene.error = null;
      const preparation = Promise.resolve()
        .then(function () { return assetPipeline.preloadDistrict(districtId); })
        .then(function (result) {
          const outcomes = new Map((result && result.outcomes || []).map(function (item) { return [item.id, item]; }));
          const missing = scene.requiredAssetIds.filter(function (id) {
            return !outcomes.has(id) || outcomes.get(id).status !== 'loaded';
          });
          if (!result || result.ready !== true || missing.length) {
            const details = missing.length ? ' Required assets not loaded: ' + missing.join(', ') + '.' : '';
            throw new Error('Authored artwork for "' + districtId + '" is not ready.' + details);
          }
          // A successful preload result is not sufficient by itself: every required
          // asset must also be retrievable from the pipeline cache.
          scene.requiredAssetIds.forEach(function (id) { assetPipeline.getAsset(id); });
          scene.status = 'ready';
          scene.error = null;
          return Object.freeze({
            district: districtId, ready: true, status: 'ready', error: null,
            assets: Object.freeze(scene.requiredAssetIds.slice())
          });
        })
        .catch(function (error) {
          scene.status = 'failed';
          scene.error = error && error.message ? error.message : String(error);
          return Object.freeze({
            district: districtId, ready: false, status: 'failed',
            error: scene.error, assets: Object.freeze(scene.requiredAssetIds.slice())
          });
        })
        .finally(function () { scene.preparation = null; });
      scene.preparation = preparation;
      return preparation;
    }

    async function enter(districtId, options) {
      options = options || {};
      if (!world.districts[districtId]) fail('Unknown district: ' + districtId);
      if (transitioning) fail('A scene transition is already in progress.');
      if (current && current !== districtId && !world.districts[current].exits.includes(districtId)) {
        fail('No authored route connects ' + current + ' to ' + districtId + '.');
      }
      const scene = scenes[districtId];
      if (!scene.sceneId) fail('Scene is unavailable for "' + districtId + '". No fallback scene will be created.');
      const spawnId = options.spawn || 'default';
      if (!scene.spawnPoints[spawnId]) fail('Unknown spawn point "' + spawnId + '" in ' + districtId + '.');

      transitioning = true;
      const previous = current;
      try {
        const readiness = await prepareDistrict(districtId);
        if (!readiness.ready) fail(readiness.error || 'Authored scene assets are not ready for "' + districtId + '".');
        if (renderer && typeof renderer.mountScene === 'function') {
          await renderer.mountScene(scene.sceneId, {
            district: districtId,
            spawn: scene.spawnPoints[spawnId],
            previousDistrict: previous,
            assets: Object.freeze(scene.requiredAssetIds.reduce(function (items, id) {
              items[id] = assetPipeline.getAsset(id);
              return items;
            }, Object.create(null)))
          });
        }
        current = districtId;
        revision += 1;
        onEvent({ type: 'scene:entered', district: districtId, previousDistrict: previous, revision: revision });
        return snapshot();
      } catch (error) {
        current = previous;
        throw error;
      } finally {
        transitioning = false;
      }
    }

    function getPlaces() {
      if (!current) return [];
      const district = world.districts[current];
      const scene = scenes[current];
      return district.places.map(function (place) {
        const authored = scene.interactables[place.id] || null;
        return Object.freeze({
          id: place.id, name: place.name, actions: place.actions.slice(),
          available: Boolean(authored), anchor: authored ? authored.anchor : null,
          reason: authored ? null : 'Authored interaction anchor is not yet available.'
        });
      });
    }

    function interact(placeId, action) {
      if (!current) fail('Enter a district before interacting.');
      const place = world.districts[current].places.find(function (item) { return item.id === placeId; });
      if (!place) fail('Place "' + placeId + '" does not exist in the current district.');
      if (!place.actions.includes(action)) fail('Action "' + action + '" is not supported at "' + placeId + '".');
      const authored = scenes[current].interactables[placeId];
      if (!authored) fail('Interaction is unavailable until its authored scene anchor is supplied.');
      if (renderer && typeof renderer.focusInteractable === 'function') {
        renderer.focusInteractable(authored.anchor, { district: current, placeId: placeId, action: action });
      }
      const event = { type: 'world:interaction', district: current, placeId: placeId, action: action, anchor: authored.anchor };
      onEvent(event);
      return Object.freeze(event);
    }

    function getExits() {
      if (!current) return [];
      return world.districts[current].exits.map(function (id) {
        return Object.freeze({ id: id, title: world.districts[id].title, available: scenes[id].status === 'ready' });
      });
    }

    function getDiagnostics() {
      return districtIds.map(function (id) {
        const district = world.districts[id];
        const scene = scenes[id];
        const missingAnchors = district.places.filter(function (p) { return !scene.interactables[p.id]; }).map(function (p) { return p.id; });
        return Object.freeze({
          district: id, status: scene.status, sceneId: scene.sceneId,
          requiredAssetIds: Object.freeze(scene.requiredAssetIds.slice()),
          missingAnchors: Object.freeze(missingAnchors), error: scene.error
        });
      });
    }

    return Object.freeze({
      enter: enter, prepareDistrict: prepareDistrict, interact: interact,
      getPlaces: getPlaces, getExits: getExits,
      getState: snapshot, getDiagnostics: getDiagnostics
    });
  }

  root.SemesterEnvironmentRuntime = Object.freeze({ create: createEnvironmentRuntime });
})(typeof window !== 'undefined' ? window : globalThis);
