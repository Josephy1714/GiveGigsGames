/* Semester Survival — authored 2.5D scene compositor.
 * Draws only decoded, credited scene artwork supplied by the asset pipeline.
 * Layer geometry is layout metadata, never substitute artwork.
 */
(function (root) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function fail(message) { throw new Error(message); }

  function validateScene(scene, assets) {
    if (!scene || !Number.isFinite(scene.width) || !Number.isFinite(scene.height) ||
        scene.width <= 0 || scene.height <= 0) fail('Renderer scene requires positive design dimensions.');
    if (!Array.isArray(scene.layers) || scene.layers.length === 0) fail('Renderer scene must declare authored image layers.');
    const ids = new Set();
    const layers = scene.layers.map(function (layer, index) {
      if (!layer || typeof layer.id !== 'string' || !layer.id.trim() || ids.has(layer.id)) {
        fail('Every scene layer requires a unique id.');
      }
      ids.add(layer.id);
      if (!assets || !assets[layer.assetId]) fail('Scene layer "' + layer.id + '" references an unavailable decoded asset.');
      if (![layer.x, layer.y, layer.width, layer.height].every(Number.isFinite) ||
          layer.width <= 0 || layer.height <= 0) fail('Scene layer "' + layer.id + '" has invalid bounds.');
      const parallax = layer.parallax === undefined ? 1 : layer.parallax;
      if (!Number.isFinite(parallax) || parallax < 0 || parallax > 1) fail('Scene layer "' + layer.id + '" has invalid parallax.');
      const opacity = layer.opacity === undefined ? 1 : layer.opacity;
      if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) fail('Scene layer "' + layer.id + '" has invalid opacity.');
      const fit = layer.fit || 'stretch';
      if (!['stretch', 'contain', 'cover'].includes(fit)) fail('Scene layer "' + layer.id + '" has unsupported fit mode.');
      return Object.freeze({
        id: layer.id, assetId: layer.assetId, x: layer.x, y: layer.y,
        width: layer.width, height: layer.height, zIndex: Number.isFinite(layer.zIndex) ? layer.zIndex : index,
        parallax: parallax, opacity: opacity, fit: fit
      });
    }).sort((a, b) => a.zIndex - b.zIndex);
    const characterLayerZIndex = scene.characterLayerZIndex === undefined
      ? (layers.length ? Math.max.apply(null, layers.map(function (layer) { return layer.zIndex; })) + 1 : 0)
      : scene.characterLayerZIndex;
    if (!Number.isFinite(characterLayerZIndex)) fail('Character layer z-index must be finite when supplied.');
    const hotspots = Object.create(null);
    Object.keys(scene.hotspots || {}).forEach(function (anchorId) {
      const item = scene.hotspots[anchorId];
      if (!item || ![item.x, item.y, item.width, item.height].every(Number.isFinite) ||
          item.width <= 0 || item.height <= 0) fail('Hotspot "' + anchorId + '" requires positive authored bounds.');
      hotspots[anchorId] = Object.freeze({ x: item.x, y: item.y, width: item.width, height: item.height });
    });
    const worldBounds = scene.worldBounds || { width: Math.max(scene.width, ...layers.map(layer => layer.x + layer.width)), height: Math.max(scene.height, ...layers.map(layer => layer.y + layer.height)) };
    if (!worldBounds || !Number.isFinite(worldBounds.width) || !Number.isFinite(worldBounds.height) ||
        worldBounds.width < scene.width || worldBounds.height < scene.height) fail('Scene worldBounds must contain the camera viewport.');
    layers.forEach(function (layer) {
      if (layer.x < 0 || layer.y < 0 || layer.x + layer.width > worldBounds.width || layer.y + layer.height > worldBounds.height) {
        fail('Scene layer "' + layer.id + '" extends outside authored worldBounds.');
      }
    });
    Object.keys(hotspots).forEach(function (anchorId) {
      const hotspot = hotspots[anchorId];
      if (hotspot.x < 0 || hotspot.y < 0 || hotspot.x + hotspot.width > worldBounds.width || hotspot.y + hotspot.height > worldBounds.height) {
        fail('Hotspot "' + anchorId + '" extends outside authored worldBounds.');
      }
    });
    const groundY = scene.groundY === undefined ? scene.height * 0.82 : scene.groundY;
    const depthScale = scene.depthScale === undefined ? 1 : scene.depthScale;
    if (!Number.isFinite(groundY) || groundY < 0 || groundY > worldBounds.height) fail('Scene groundY must be inside authored world bounds.');
    if (!Number.isFinite(depthScale) || depthScale <= 0 || depthScale > 10) fail('Scene depthScale must be positive and no greater than 10.');
    const depthBounds = scene.depthBounds || { min: -120, max: 120 };
    const playerBounds = scene.playerBounds || { minX: 0, maxX: worldBounds.width };
    if (!depthBounds || !Number.isFinite(depthBounds.min) || !Number.isFinite(depthBounds.max) || depthBounds.min >= depthBounds.max) fail('Scene depthBounds are invalid.');
    if (!playerBounds || !Number.isFinite(playerBounds.minX) || !Number.isFinite(playerBounds.maxX) || playerBounds.minX >= playerBounds.maxX ||
        playerBounds.minX < 0 || playerBounds.maxX > worldBounds.width) fail('Scene playerBounds are invalid or outside worldBounds.');
    const cameraBounds = scene.cameraBounds || { minX: 0, minY: 0, maxX: worldBounds.width - scene.width, maxY: worldBounds.height - scene.height };
    if (!cameraBounds || ![cameraBounds.minX,cameraBounds.minY,cameraBounds.maxX,cameraBounds.maxY].every(Number.isFinite) ||
        cameraBounds.minX < 0 || cameraBounds.minY < 0 || cameraBounds.minX > cameraBounds.maxX || cameraBounds.minY > cameraBounds.maxY ||
        cameraBounds.maxX + scene.width > worldBounds.width || cameraBounds.maxY + scene.height > worldBounds.height) fail('Scene cameraBounds are invalid or outside worldBounds.');
    return Object.freeze({
      width: scene.width, height: scene.height, worldBounds: Object.freeze({ width: worldBounds.width, height: worldBounds.height }),
      groundY: groundY, depthScale: depthScale,
      cameraBounds: Object.freeze({ minX: cameraBounds.minX, minY: cameraBounds.minY, maxX: cameraBounds.maxX, maxY: cameraBounds.maxY }),
      depthBounds: Object.freeze({ min: depthBounds.min, max: depthBounds.max }),
      playerBounds: Object.freeze({ minX: playerBounds.minX, maxX: playerBounds.maxX }),
      characterLayerZIndex: characterLayerZIndex,
      layers: Object.freeze(layers), hotspots: Object.freeze(hotspots)
    });
  }

  function create(options) {
    options = options || {};
    const canvas = options.canvas;
    if (!canvas || typeof canvas.getContext !== 'function') fail('A 2D canvas is required.');
    const context = options.context || canvas.getContext('2d');
    if (!context) fail('Canvas 2D context is unavailable.');
    const maxDpr = Number.isFinite(options.maxDevicePixelRatio) ? clamp(options.maxDevicePixelRatio, 1, 2) : 2;
    const cameraSmoothing = Number.isFinite(options.cameraSmoothing) ? clamp(options.cameraSmoothing, 0, 1) : 0.14;
    let active = null;
    let sceneId = null;
    let camera = { x: 0, y: 0 };
    let viewport = { width: 0, height: 0, pixelRatio: 1 };
    let focusedAnchor = null;
    let lastFrame = Object.freeze({ drawnLayers: 0, sceneId: null });
    let atmosphere = null;

    function resize(width, height, devicePixelRatio) {
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        fail('Canvas viewport dimensions must be positive.');
      }
      const dpr = clamp(Number(devicePixelRatio) || 1, 1, maxDpr);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      if (canvas.style) {
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
      }
      viewport = { width: width, height: height, pixelRatio: dpr };
      return Object.freeze({ width: width, height: height, pixelRatio: dpr });
    }

    function mountScene(id, payload) {
      if (!payload || !payload.scene || !payload.assets) fail('Scene mount requires authored layout metadata and decoded assets.');
      const validated = validateScene(payload.scene, payload.assets);
      const anchors = payload.interactables || {};
      Object.keys(anchors).forEach(function (placeId) {
        const anchorId = anchors[placeId].anchor;
        if (!validated.hotspots[anchorId]) fail('Interactable "' + placeId + '" has no authored render hotspot "' + anchorId + '".');
      });
      (payload.npcAnchors || []).forEach(function (npc) {
        if (!npc || typeof npc.anchor !== 'string' || !validated.hotspots[npc.anchor]) {
          fail('NPC "' + (npc && npc.characterId || 'unknown') + '" has no authored render hotspot.');
        }
      });
      if (payload.navigation) {
        if (!Array.isArray(payload.navigation.nodes) || !Array.isArray(payload.navigation.edges)) fail('Authored navigation graph is invalid.');
        payload.navigation.nodes.forEach(function (node) {
          if (!node || !validated.hotspots[node.anchor]) fail('Navigation node "' + (node && node.id || 'unknown') + '" has no authored render hotspot.');
        });
      }
      active = Object.freeze({ id: id, district: payload.district, scene: validated, assets: payload.assets });
      sceneId = id;
      focusedAnchor = null;
      camera = { x: 0, y: 0 };
      return Object.freeze({ sceneId: id, district: payload.district, layerCount: validated.layers.length });
    }

    function updateCamera(target, delta) {
      if (!active) fail('Cannot update camera before a scene is mounted.');
      target = target || {};
      const dt = clamp(Number(delta) || 0, 0, 0.1);
      const factor = cameraSmoothing === 0 ? 1 : 1 - Math.pow(1 - cameraSmoothing, dt * 60);
      const desiredX = Number.isFinite(target.x) ? target.x - active.scene.width / 2 : camera.x;
      const desiredY = Number.isFinite(target.y) ? target.y - active.scene.height / 2 : camera.y;
      camera.x += (desiredX - camera.x) * factor;
      camera.y += (desiredY - camera.y) * factor;
      camera.x = clamp(camera.x, active.scene.cameraBounds.minX, active.scene.cameraBounds.maxX);
      camera.y = clamp(camera.y, active.scene.cameraBounds.minY, active.scene.cameraBounds.maxY);
      return Object.freeze({ x: camera.x, y: camera.y });
    }

    function drawImageFit(image, layer) {
      if (layer.fit === 'stretch') {
        context.drawImage(image, layer.x, layer.y, layer.width, layer.height);
        return;
      }
      const iw = Number(image.naturalWidth || image.width), ih = Number(image.naturalHeight || image.height);
      if (!iw || !ih) fail('Layer image "' + layer.assetId + '" is not decoded.');
      const scale = layer.fit === 'contain'
        ? Math.min(layer.width / iw, layer.height / ih)
        : Math.max(layer.width / iw, layer.height / ih);
      const width = iw * scale, height = ih * scale;
      context.save();
      context.beginPath();
      context.rect(layer.x, layer.y, layer.width, layer.height);
      context.clip();
      context.drawImage(image, layer.x + (layer.width - width) / 2, layer.y + (layer.height - height) / 2, width, height);
      context.restore();
    }

    function setAtmosphere(value) {
      if (value === null || value === undefined) { atmosphere = null; return null; }
      if (typeof value !== 'object' || !['clear','cloudy','drizzle','rain','storm'].includes(value.condition) ||
          !Number.isFinite(value.light) || value.light < 0 || value.light > 1 ||
          !Number.isFinite(value.precipitation) || value.precipitation < 0 || value.precipitation > 1 ||
          !Number.isFinite(value.wind) || value.wind < 0 || value.wind > 1 ||
          !Number.isFinite(value.fog) || value.fog < 0 || value.fog > 1 ||
          !Number.isFinite(value.timeOfDay) || value.timeOfDay < 0 || value.timeOfDay >= 1440) {
        fail('Atmosphere state is invalid.');
      }
      atmosphere = Object.freeze({
        condition: value.condition, light: value.light, precipitation: value.precipitation,
        wind: value.wind, fog: value.fog, timeOfDay: value.timeOfDay,
        phase: Number.isFinite(value.phase) ? value.phase : 0
      });
      return atmosphere;
    }

    function drawAtmosphere(width, height) {
      if (!atmosphere) return;
      const a = atmosphere;
      const daylight = Math.max(0, Math.min(1, a.light));
      const darkness = 1 - daylight;
      if (darkness > 0.02) {
        context.save();
        context.globalAlpha = Math.min(0.58, darkness * 0.68);
        context.fillStyle = '#101a35';
        context.fillRect(0, 0, width, height);
        context.restore();
      }
      if (a.condition === 'cloudy' || a.condition === 'drizzle' || a.condition === 'rain' || a.condition === 'storm') {
        context.save();
        context.globalAlpha = a.condition === 'storm' ? 0.14 : 0.075;
        context.fillStyle = '#52647a';
        context.fillRect(0, 0, width, height);
        context.restore();
      }
      if (a.fog > 0.01) {
        context.save();
        context.globalAlpha = a.fog * 0.24;
        context.fillStyle = '#cbd6dc';
        context.fillRect(0, 0, width, height);
        context.restore();
      }
      if (a.precipitation > 0) {
        const count = Math.round(22 + a.precipitation * 88);
        const phase = a.phase;
        context.save();
        context.globalAlpha = Math.min(0.78, 0.25 + a.precipitation * 0.55);
        context.strokeStyle = a.condition === 'storm' ? '#c7d5e4' : '#dceaf2';
        context.lineWidth = a.condition === 'drizzle' ? 0.8 : 1.25;
        context.beginPath();
        for (let i = 0; i < count; i += 1) {
          const seed = (i * 73.17 + 19.31) % 997;
          const x = (seed * 13.7 + phase * (a.wind * 160 + 70)) % width;
          const y = (seed * 7.9 + phase * (a.condition === 'drizzle' ? 95 : 250)) % height;
          const length = 4 + a.precipitation * 12;
          context.moveTo(x, y);
          context.lineTo(x - a.wind * 8 - 2, y + length);
        }
        context.stroke();
        context.restore();
      }
    }

    function render(frame) {
      if (!active) fail('Cannot render before an authored scene is mounted.');
      frame = frame || {};
      if (!viewport.width || !viewport.height) fail('Resize the canvas before rendering.');
      const pixelRatio = viewport.pixelRatio;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const viewportWidth = viewport.width;
      const viewportHeight = viewport.height;
      context.clearRect(0, 0, viewportWidth, viewportHeight);
      const scene = active.scene;
      const scale = Math.min(viewportWidth / scene.width, viewportHeight / scene.height);
      const offsetX = (viewportWidth - scene.width * scale) / 2;
      const offsetY = (viewportHeight - scene.height * scale) / 2;
      context.save();
      context.translate(offsetX, offsetY);
      context.scale(scale, scale);
      const actors = (Array.isArray(frame.characters) ? frame.characters.slice() : []);
      if (frame.character && frame.character.animator) actors.push(frame.character);
      actors.sort(function (a, b) { return (Number(a.y) || 0) - (Number(b.y) || 0); });
      let drawnCharacters = 0, actorsDrawn = false;
      function drawLayer(layer) {
        const image = active.assets[layer.assetId];
        if (!image) fail('Decoded asset "' + layer.assetId + '" disappeared after scene mount.');
        context.save();
        context.globalAlpha *= layer.opacity;
        context.translate(-camera.x * layer.parallax, -camera.y * layer.parallax);
        drawImageFit(image, layer);
        context.restore();
      }
      function drawActors() {
        if (actorsDrawn) return;
        actorsDrawn = true;
        if (!actors.length) return;
        context.save();
        context.translate(-camera.x, -camera.y);
        actors.forEach(function (actor) {
          if (!actor || !actor.animator || typeof actor.animator.render !== 'function') return;
          const drawn = actor.animator.render(context, Number(actor.x) || 0, Number(actor.y) || 0, Number(actor.scale) > 0 ? Number(actor.scale) : 1);
          if (drawn && drawn.drawn) drawnCharacters++;
        });
        context.restore();
      }
      scene.layers.forEach(function (layer) {
        if (layer.zIndex > scene.characterLayerZIndex) drawActors();
        drawLayer(layer);
      });
      drawActors();
      drawAtmosphere(scene.width, scene.height);
      context.restore();
      lastFrame = Object.freeze({ drawnLayers: scene.layers.length, sceneId: sceneId, weather: atmosphere ? atmosphere.condition : null, characterDrawn: Boolean(frame.character && frame.character.animator), npcCharactersDrawn: Math.max(0, drawnCharacters - (frame.character && frame.character.animator ? 1 : 0)), charactersDrawn: drawnCharacters });
      return lastFrame;
    }

    function hitTest(screenX, screenY, viewportWidth, viewportHeight) {
      if (!active) return null;
      const scene = active.scene;
      const scale = Math.min(viewportWidth / scene.width, viewportHeight / scene.height);
      const offsetX = (viewportWidth - scene.width * scale) / 2;
      const offsetY = (viewportHeight - scene.height * scale) / 2;
      const worldX = (screenX - offsetX) / scale + camera.x;
      const worldY = (screenY - offsetY) / scale + camera.y;
      const matches = Object.keys(scene.hotspots).filter(function (id) {
        const h = scene.hotspots[id];
        return worldX >= h.x && worldX <= h.x + h.width && worldY >= h.y && worldY <= h.y + h.height;
      });
      return matches.length ? matches[matches.length - 1] : null;
    }

    function getHotspotBounds(anchorId) {
      if (!active || !active.scene.hotspots[anchorId]) return null;
      const h = active.scene.hotspots[anchorId];
      return Object.freeze({ x: h.x, y: h.y, width: h.width, height: h.height, centerX: h.x + h.width / 2, centerY: h.y + h.height / 2 });
    }

    function focusInteractable(anchorId) {
      if (!active || !active.scene.hotspots[anchorId]) fail('Unknown authored interaction hotspot "' + anchorId + '".');
      focusedAnchor = anchorId;
      return Object.freeze({ anchor: anchorId, bounds: active.scene.hotspots[anchorId] });
    }

    function getLayout() {
      return active ? Object.freeze({ width: active.scene.width, height: active.scene.height, worldBounds: active.scene.worldBounds, groundY: active.scene.groundY, depthScale: active.scene.depthScale, depthBounds: active.scene.depthBounds, playerBounds: active.scene.playerBounds, characterLayerZIndex: active.scene.characterLayerZIndex, cameraBounds: active.scene.cameraBounds }) : null;
    }

    function getState() {
      return Object.freeze({
        mounted: Boolean(active), sceneId: sceneId, district: active ? active.district : null,
        camera: Object.freeze({ x: camera.x, y: camera.y }), focusedAnchor: focusedAnchor,
        lastFrame: lastFrame
      });
    }

    return Object.freeze({ resize, mountScene, updateCamera, setAtmosphere, render, hitTest, getHotspotBounds, focusInteractable, getLayout, getState });
  }

  root.SemesterSceneRenderer = Object.freeze({ create, validateScene });
})(typeof window !== 'undefined' ? window : globalThis);
