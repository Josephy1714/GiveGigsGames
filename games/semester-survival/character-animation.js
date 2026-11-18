/* Semester Survival — authored sprite animation runtime.
 * Consumes approved atlas metadata and real artwork. Missing clips are reported,
 * never replaced with generated poses or placeholder geometry.
 */
(function (root) {
  'use strict';

  const DEFAULTS = Object.freeze({ transitionSeconds: 0.12, maxDelta: 0.1 });
  const STATE_CLIPS = Object.freeze({
    idle: 'idle', walk: 'walk', jog: 'jog', sprint: 'sprint',
    'jump-takeoff': 'jump-takeoff', 'jump-rise': 'jump-rise',
    'jump-apex': 'jump-apex', 'jump-fall': 'jump-fall',
    'land-recover': 'land-soft', 'slide-start': 'slide-start',
    'slide-loop': 'slide-loop', 'dodge-left': 'dodge-left',
    'dodge-right': 'dodge-right'
  });

  function validateManifest(manifest, image) {
    const errors = [];
    if (!manifest || typeof manifest !== 'object') return ['Manifest must be an object.'];
    if (!image || !Number.isFinite(image.width) || !Number.isFinite(image.height) ||
        image.width <= 0 || image.height <= 0) errors.push('A decoded atlas image is required.');
    if (!manifest.clips || typeof manifest.clips !== 'object') {
      errors.push('Manifest must define a clips object.');
      return errors;
    }
    Object.keys(manifest.clips).forEach(name => {
      const clip = manifest.clips[name];
      if (!clip || !Array.isArray(clip.frames) || clip.frames.length === 0) {
        errors.push(name + ': frames must be a non-empty array.');
        return;
      }
      if (!Number.isFinite(clip.fps) || clip.fps <= 0) errors.push(name + ': fps must be positive.');
      if (!['loop', 'once', 'pingpong'].includes(clip.playback || 'loop')) {
        errors.push(name + ': unsupported playback mode.');
      }
      clip.frames.forEach((frame, index) => {
        if (!frame || ![frame.x, frame.y, frame.width, frame.height].every(Number.isFinite) ||
            frame.x < 0 || frame.y < 0 || frame.width <= 0 || frame.height <= 0) {
          errors.push(name + ': invalid frame rectangle at index ' + index + '.');
          return;
        }
        if (image && (frame.x + frame.width > image.width || frame.y + frame.height > image.height)) {
          errors.push(name + ': frame ' + index + ' exceeds atlas bounds.');
        }
        if (frame.pivotX !== undefined && !Number.isFinite(frame.pivotX)) errors.push(name + ': invalid pivotX.');
        if (frame.pivotY !== undefined && !Number.isFinite(frame.pivotY)) errors.push(name + ': invalid pivotY.');
      });
    });
    return errors;
  }

  function createClipLibrary(manifest, image) {
    const errors = validateManifest(manifest, image);
    if (errors.length) throw new Error('Invalid animation manifest:\n' + errors.join('\n'));
    return Object.freeze({
      image,
      has(name) { return Object.prototype.hasOwnProperty.call(manifest.clips, name); },
      get(name) { return manifest.clips[name] || null; },
      names() { return Object.keys(manifest.clips); }
    });
  }

  function resolveFrame(clip, elapsed) {
    const count = clip.frames.length;
    const mode = clip.playback || 'loop';
    const raw = Math.floor(Math.max(0, elapsed) * clip.fps);
    let index;
    let complete = false;
    if (mode === 'once') {
      index = Math.min(count - 1, raw);
      complete = raw >= count;
    } else if (mode === 'pingpong' && count > 1) {
      const period = count * 2 - 2;
      const step = raw % period;
      index = step < count ? step : period - step;
    } else {
      index = raw % count;
    }
    return { index, frame: clip.frames[index], complete };
  }

  function createAnimator(library, options) {
    options = Object.assign({}, DEFAULTS, options || {});
    let current = null;
    let previous = null;
    let elapsed = 0;
    let previousElapsed = 0;
    let blendElapsed = 0;
    let facing = 1;
    let missing = null;

    function play(name, direction) {
      if (!library.has(name)) {
        missing = name;
        return { ok: false, missingClip: name };
      }
      missing = null;
      if (!current || current.name !== name) {
        previous = current;
        previousElapsed = elapsed;
        current = { name };
        elapsed = 0;
        blendElapsed = previous ? 0 : options.transitionSeconds;
      }
      if (direction === -1 || direction === 1) facing = direction;
      return { ok: true, clip: name };
    }

    function update(delta) {
      const dt = Math.max(0, Math.min(Number(delta) || 0, options.maxDelta));
      if (current) elapsed += dt;
      if (previous && blendElapsed < options.transitionSeconds) {
        previousElapsed += dt;
        blendElapsed = Math.min(options.transitionSeconds, blendElapsed + dt);
      } else {
        previous = null;
      }
      return snapshot();
    }

    function snapshot() {
      if (!current) return { status: 'unbound', clip: null, missingClip: missing };
      const clip = library.get(current.name);
      const resolved = resolveFrame(clip, elapsed);
      const alpha = options.transitionSeconds > 0
        ? Math.min(1, blendElapsed / options.transitionSeconds) : 1;
      let from = null;
      if (previous && alpha < 1) {
        const oldClip = library.get(previous.name);
        from = { clip: previous.name, frame: resolveFrame(oldClip, previousElapsed).frame, alpha: 1 - alpha };
      }
      return {
        status: 'ready', clip: current.name, frame: resolved.frame,
        frameIndex: resolved.index, complete: resolved.complete,
        facing, alpha, from, missingClip: missing
      };
    }

    function render(context, x, y, scale) {
      const state = snapshot();
      if (state.status !== 'ready') return { drawn: false, reason: state.status, missingClip: state.missingClip };
      const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
      const drawFrame = (frame, alpha) => {
        const px = frame.pivotX === undefined ? frame.width / 2 : frame.pivotX;
        const py = frame.pivotY === undefined ? frame.height : frame.pivotY;
        context.save();
        context.globalAlpha *= alpha;
        context.translate(x, y);
        if (state.facing < 0) context.scale(-1, 1);
        context.drawImage(library.image, frame.x, frame.y, frame.width, frame.height,
          -px * s, -py * s, frame.width * s, frame.height * s);
        context.restore();
      };
      if (state.from) drawFrame(state.from.frame, state.from.alpha);
      drawFrame(state.frame, state.alpha);
      return { drawn: true, clip: state.clip, frameIndex: state.frameIndex };
    }

    function reset() {
      current = null; previous = null; elapsed = 0; previousElapsed = 0;
      blendElapsed = 0; facing = 1; missing = null;
      return snapshot();
    }

    return Object.freeze({ play, update, snapshot, render, reset });
  }

  function createControllerBinding(animator) {
    return Object.freeze({
      update(delta, movementSnapshot) {
        if (!movementSnapshot || !movementSnapshot.state) {
          return { ok: false, reason: 'movement-snapshot-required' };
        }
        const clipName = STATE_CLIPS[movementSnapshot.state] || movementSnapshot.state;
        const result = animator.play(clipName, movementSnapshot.facing);
        animator.update(delta);
        return Object.assign({}, result, { animation: animator.snapshot() });
      }
    });
  }

  root.SemesterCharacterAnimation = Object.freeze({
    validateManifest, createClipLibrary, createAnimator,
    createControllerBinding, resolveFrame, stateClips: STATE_CLIPS
  });
})(typeof window !== 'undefined' ? window : globalThis);
