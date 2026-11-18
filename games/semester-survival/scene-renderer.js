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
    const hotspots = Object.create(null);
    Object.keys(scene.hotspots || {}).forEach(function (anchorId) {
      const item = scene.hotspots[anchorId];
      if (!item || ![item.x, item.y, item.width, item.height].every(Number.isFinite) ||
          item.width <= 0 || item.height <= 0) fail('Hotspot "' + anchorId + '" requires positive authored bounds.');
      hotspots[anchorId] = Object.freeze({ x: item.x, y: item.y, width: item.width, height: item.height });
    });
    return Object.freeze({
      width: scene.width, height: scene.height,
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
    let focusedAnchor = null;
    let lastFrame = Object.freeze({ drawnLayers: 0, sceneId: null });

    function resize(width, height, devicePixelRatio) {
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        fail('Canvas viewport dimensions must be positive.');
      }
      const dpr = clamp(Number(devicePixelRatio) || 1, 1, maxDpr);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style = canvas.style || {};
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
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
      if (Number.isFinite(target.x)) camera.x += (target.x - camera.x) * factor;
      if (Number.isFinite(target.y)) camera.y += (target.y - camera.y) * factor;
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

    function render(frame) {
      if (!active) fail('Cannot render before an authored scene is mounted.');
      frame = frame || {};
      const pixelRatio = canvas.width / Math.max(1, Number.parseFloat(canvas.style && canvas.style.width) || canvas.width);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const viewportWidth = Number.parseFloat(canvas.style && canvas.style.width) || canvas.width / pixelRatio;
      const viewportHeight = Number.parseFloat(canvas.style && canvas.style.height) || canvas.height / pixelRatio;
      context.clearRect(0, 0, viewportWidth, viewportHeight);
      const scene = active.scene;
      const scale = Math.min(viewportWidth / scene.width, viewportHeight / scene.height);
      const offsetX = (viewportWidth - scene.width * scale) / 2;
      const offsetY = (viewportHeight - scene.height * scale) / 2;
      context.save();
      context.translate(offsetX, offsetY);
      context.scale(scale, scale);
      scene.layers.forEach(function (layer) {
        const image = active.assets[layer.assetId];
        if (!image) fail('Decoded asset "' + layer.assetId + '" disappeared after scene mount.');
        context.save();
        context.globalAlpha *= layer.opacity;
        context.translate(-camera.x * layer.parallax, -camera.y * layer.parallax);
        drawImageFit(image, layer);
        context.restore();
      });
      if (frame.character && frame.character.animator && typeof frame.character.animator.render === 'function') {
        context.save();
        context.translate(-camera.x, -camera.y);
        frame.character.animator.render(
          context,
          Number(frame.character.x) || 0,
          Number(frame.character.y) || 0,
          Number(frame.character.scale) > 0 ? Number(frame.character.scale) : 1
        );
        context.restore();
      }
      context.restore();
      lastFrame = Object.freeze({ drawnLayers: scene.layers.length, sceneId: sceneId, characterDrawn: Boolean(frame.character && frame.character.animator) });
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

    function focusInteractable(anchorId) {
      if (!active || !active.scene.hotspots[anchorId]) fail('Unknown authored interaction hotspot "' + anchorId + '".');
      focusedAnchor = anchorId;
      return Object.freeze({ anchor: anchorId, bounds: active.scene.hotspots[anchorId] });
    }

    function getState() {
      return Object.freeze({
        mounted: Boolean(active), sceneId: sceneId, district: active ? active.district : null,
        camera: Object.freeze({ x: camera.x, y: camera.y }), focusedAnchor: focusedAnchor,
        lastFrame: lastFrame
      });
    }

    return Object.freeze({ resize, mountScene, updateCamera, render, hitTest, focusInteractable, getState });
  }

  root.SemesterSceneRenderer = Object.freeze({ create, validateScene });
})(typeof window !== 'undefined' ? window : globalThis);
