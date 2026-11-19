/* Semester Survival — playable character orchestration runtime.
 * Owns no frame loop and creates no artwork. The host supplies authored atlas,
 * controller, input manager, and scene renderer; missing clips fail closed.
 */
(function (root) {
  'use strict';

  const CLIP_BY_STATE = Object.freeze({ 'land-recover': 'land-soft' });
  const REQUIRED = Object.freeze([
    'idle', 'walk', 'jog', 'sprint', 'jump-takeoff', 'jump-rise',
    'jump-apex', 'jump-fall', 'land-soft', 'slide-start', 'slide-loop',
    'dodge-left', 'dodge-right'
  ]);

  function create(options) {
    options = options || {};
    const controller = options.controller;
    const animator = options.animator;
    const renderer = options.renderer;
    const input = options.inputManager;
    if (!controller || !animator || !renderer || !input) {
      throw new Error('Character runtime requires controller, animator, renderer, and inputManager.');
    }
    ['update', 'snapshot', 'reset'].forEach(function (method) {
      if (typeof controller[method] !== 'function') throw new Error('Character controller is missing ' + method + '().');
    });
    ['play', 'update', 'snapshot', 'render', 'reset'].forEach(function (method) {
      if (typeof animator[method] !== 'function') throw new Error('Character animator is missing ' + method + '().');
    });
    if (typeof renderer.updateCamera !== 'function' || typeof renderer.render !== 'function') {
      throw new Error('Scene renderer must expose updateCamera() and render().');
    }
    if (typeof input.consume !== 'function') throw new Error('Input manager must expose consume().');

    const scale = Number.isFinite(options.characterScale) && options.characterScale > 0 ? options.characterScale : 1;
    const cameraOffsetY = Number.isFinite(options.cameraOffsetY) ? options.cameraOffsetY : 0;
    const requiredClips = options.requiredClips || REQUIRED;
    const library = options.clipLibrary || null;
    if (library && typeof library.has === 'function') {
      const missing = requiredClips.filter(function (name) { return !library.has(name); });
      if (missing.length) throw new Error('Character atlas is incomplete; missing clips: ' + missing.join(', '));
    }

    let movement = controller.snapshot();
    function sceneLayout(){return typeof renderer.getLayout==='function'?renderer.getLayout():null;}
    function groundY(){const layout=sceneLayout();return layout&&Number.isFinite(layout.groundY)?layout.groundY:0;}
    function depthScale(){const layout=sceneLayout();return layout&&Number.isFinite(layout.depthScale)?layout.depthScale:1;}
    let animation = animator.snapshot();
    let lastInput = null;
    let lastError = null;
    let disposed = false;
    let frameNumber = 0;

    function update(delta) {
      if (disposed) throw new Error('Character runtime has been disposed.');
      const dt = Math.max(0, Math.min(Number(delta) || 0, 1 / 20));
      lastInput = input.consume() || {};
      const layout = sceneLayout();
      if (layout && layout.depthBounds && typeof controller.setDepthBounds === 'function') controller.setDepthBounds(layout.depthBounds);
      if (layout && layout.playerBounds && typeof controller.setXBounds === 'function') controller.setXBounds({ min: layout.playerBounds.minX, max: layout.playerBounds.maxX });
      movement = controller.update(dt, {
        moveX: lastInput.moveX,
        moveY: lastInput.moveY,
        sprint: lastInput.sprint,
        jumpPressed: lastInput.jumpPressed,
        slidePressed: lastInput.slidePressed,
        dodgeDirection: lastInput.dodgeDirection
      });
      const clipName = CLIP_BY_STATE[movement.state] || movement.state;
      const played = animator.play(clipName, movement.facing);
      if (!played || played.ok !== true) {
        lastError = 'Required animation clip unavailable: ' + (played && played.missingClip || clipName);
        renderer.updateCamera({ x: movement.x, y: groundY() - movement.depth * depthScale() - movement.y + cameraOffsetY }, dt);
        animation = animator.snapshot();
        return getState();
      }
      animation = animator.update(dt);
      lastError = null;
      renderer.updateCamera({ x: movement.x, y: groundY() - movement.depth * depthScale() - movement.y + cameraOffsetY }, dt);
      frameNumber += 1;
      return getState();
    }

    function render(npcRenderables) {
      if (disposed) throw new Error('Character runtime has been disposed.');
      if (lastError) return { rendered: false, reason: lastError };
      const result = renderer.render({
        character: { characterId: 'jay', x: movement.x, y: groundY() - movement.depth * depthScale() - movement.y, groundY: groundY() - movement.depth * depthScale(), depth: movement.depth, scale: scale, animator: animator },
        characters: Array.isArray(npcRenderables) ? npcRenderables : []
      });
      return { rendered: true, frame: result, movement: movement, animation: animation };
    }

    function reset(position) {
      if (disposed) throw new Error('Character runtime has been disposed.');
      const layout = sceneLayout();
      if (layout && layout.depthBounds && typeof controller.setDepthBounds === 'function') controller.setDepthBounds(layout.depthBounds);
      if (layout && layout.playerBounds && typeof controller.setXBounds === 'function') controller.setXBounds({ min: layout.playerBounds.minX, max: layout.playerBounds.maxX });
      movement = controller.reset(position || {});
      animator.reset();
      const played = animator.play('idle', movement.facing);
      if (!played || played.ok !== true) {
        lastError = 'Required animation clip unavailable: idle';
      } else {
        animation = animator.snapshot();
        lastError = null;
      }
      renderer.updateCamera({ x: movement.x, y: groundY() - movement.depth * depthScale() - movement.y + cameraOffsetY }, 0);
      frameNumber = 0;
      return getState();
    }

    function drainAnimationEvents() {
      if (disposed) return Object.freeze([]);
      if (typeof animator.drainEvents !== 'function') return Object.freeze([]);
      return animator.drainEvents();
    }

    function getState() {
      return Object.freeze({
        movement: movement,
        animation: animation,
        input: lastInput,
        frameNumber: frameNumber,
        ready: !lastError,
        error: lastError
      });
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      if (input && typeof input.destroy === 'function') input.destroy();
    }

    return Object.freeze({ update, render, reset, getState, drainAnimationEvents, dispose });
  }

  root.SemesterCharacterRuntime = Object.freeze({ create, requiredClips: REQUIRED });
})(typeof window !== 'undefined' ? window : globalThis);
