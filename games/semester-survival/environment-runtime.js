/* Semester Survival — authored environment scene orchestration.
 * This module coordinates real scene assets supplied by the renderer; it creates no placeholder art.
 */
(function (root) {
  'use strict';

  function fail(message) { throw new Error(message); }
  function createEnvironmentRuntime(options) {
    options = options || {};
    const world = options.world || root.SemesterWorldContent;
    const renderer = options.renderer || null;
    const onEvent = typeof options.onEvent === 'function' ? options.onEvent : function () {};
    if (!world || !world.districts || typeof world.validate !== 'function') fail('World content is required.');
    world.validate();

    const districtIds = Object.keys(world.districts);
    const sceneManifest = options.sceneManifest || {};
    const scenes = Object.create(null);
    districtIds.forEach(function (districtId) {
      const source = sceneManifest[districtId];
      if (!source || typeof source.sceneId !== 'string' || !source.sceneId.trim()) {
        scenes[districtId] = { status: 'missing', sceneId: null, spawnPoints: Object.create(null), interactables: Object.create(null) };
        return;
      }
      const spawnPoints = Object.assign(Object.create(null), source.spawnPoints || {});
      const interactables = Object.assign(Object.create(null), source.interactables || {});
      Object.keys(interactables).forEach(function (placeId) {
        const placeExists = world.districts[districtId].places.some(function (p) { return p.id === placeId; });
        if (!placeExists) fail('Scene references unknown place "' + placeId + '" in ' + districtId + '.');
        const item = interactables[placeId];
        if (!item || typeof item.anchor !== 'string' || !item.anchor.trim()) fail('Interactable "' + placeId + '" requires an authored anchor id.');
      });
      scenes[districtId] = { status: 'ready', sceneId: source.sceneId, spawnPoints: spawnPoints, interactables: interactables };
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

    function enter(districtId, options) {
      options = options || {};
      if (!world.districts[districtId]) fail('Unknown district: ' + districtId);
      if (transitioning) fail('A scene transition is already in progress.');
      const scene = scenes[districtId];
      if (scene.status !== 'ready') fail('Scene assets are not ready for "' + districtId + '". No fallback scene will be created.');
      if (current && current !== districtId && !world.districts[current].exits.includes(districtId)) {
        fail('No authored route connects ' + current + ' to ' + districtId + '.');
      }
      const spawnId = options.spawn || 'default';
      if (Object.keys(scene.spawnPoints).length && !scene.spawnPoints[spawnId]) fail('Unknown spawn point "' + spawnId + '" in ' + districtId + '.');
      transitioning = true;
      const previous = current;
      try {
        if (renderer && typeof renderer.mountScene === 'function') {
          renderer.mountScene(scene.sceneId, { district: districtId, spawn: scene.spawnPoints[spawnId] || null, previousDistrict: previous });
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
      if (renderer && typeof renderer.focusInteractable === 'function') renderer.focusInteractable(authored.anchor, { district: current, placeId: placeId, action: action });
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
        return Object.freeze({ district: id, status: scene.status, sceneId: scene.sceneId, missingAnchors: missingAnchors });
      });
    }

    return Object.freeze({
      enter: enter, interact: interact, getPlaces: getPlaces, getExits: getExits,
      getState: snapshot, getDiagnostics: getDiagnostics
    });
  }

  root.SemesterEnvironmentRuntime = Object.freeze({ create: createEnvironmentRuntime });
})(typeof window !== 'undefined' ? window : globalThis);
