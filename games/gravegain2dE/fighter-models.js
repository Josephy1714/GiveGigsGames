/* Three.js fighter portraits composited into the 2D match and lobby canvases. */
(() => {
  'use strict';

  const SIZE = 192;
  const WIDTH = 3.35;
  const HEIGHT = 3.35;
  const PIXELS_PER_UNIT = 29;
  const CAMERA_Y = 1.05;
  const motion = new WeakMap();
  let view;
  let unavailable = false;

  function createView() {
    const THREE = window.THREE;
    if (!THREE || !window.GGG_GRAVEGAIN_FIGHTERS) return null;

    // Probe first so browsers without WebGL can keep using the Canvas fighters.
    const canvas = document.createElement('canvas');
    const settings = { alpha: true, antialias: true, premultipliedAlpha: true };
    const context = canvas.getContext('webgl2', settings) || canvas.getContext('webgl', settings);
    if (!context) return null;
    const renderer = new THREE.WebGLRenderer({ canvas, context, ...settings });
    renderer.setSize(SIZE, SIZE, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-WIDTH / 2, WIDTH / 2, HEIGHT / 2, -HEIGHT / 2, 0.1, 30);
    camera.position.set(0, CAMERA_Y, 9);
    scene.add(new THREE.HemisphereLight(0xdcefff, 0x5c5070, 1.25));
    const key = new THREE.DirectionalLight(0xffead9, 1.18);
    key.position.set(3, 6, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x94bbff, 0.92);
    rim.position.set(-3, 3, -4);
    scene.add(rim);
    canvas.addEventListener('webglcontextlost', event => event.preventDefault());
    return { THREE, renderer, scene, camera, canvas, models: new Map() };
  }

  function attackPose(f) {
    if (f.specialPose) return f.specialPose;
    const hit = f.activeHitbox;
    if (hit?.oy < -39) return 'attack_up';
    if (hit?.oy > -17) return 'attack_down';
    if (hit?.ox * f.face < -10) return 'attack_back';
    return hit?.smash ? 'attack_heavy' : 'attack_melee';
  }

  function animation(f) {
    if (f.ultTimer > 0) return ['ultimate', 1 - f.ultTimer / 0.6];
    if (f.hitstun > 0 || f.dizzyTimer > 0) return ['hurt'];
    if (f.dodgeTimer > 0) return ['dodge'];
    if (f.chargeTime > 0) return ['charge'];
    if (f.shielding) return ['block'];
    if (f.attackTimer > 0 && f.attackDur > 0) return [attackPose(f), 1 - f.attackTimer / f.attackDur];
    if (f.onLedge) return ['ledge'];
    if (!f.onGround) return [f.vy < -30 ? 'jump' : 'fall'];
    if (f.landTimer > 0) return ['land', 1 - f.landTimer / 0.15];
    if (f.crouching) return ['crouch'];
    const speed = Math.abs(f.vx);
    return [speed > 145 ? 'run' : speed > 28 ? 'walk' : 'idle'];
  }

  function draw(ctx, fighter, time) {
    if (unavailable) return false;
    if (!view) {
      try {
        view = createView();
      } catch (error) {
        console.warn('GraveGain fighter renderer could not start.', error);
      }
      if (!view) {
        unavailable = true;
        return false;
      }
    }
    const { THREE, renderer, scene, camera, canvas, models } = view;
    if (renderer.getContext().isContextLost()) return false;

    const { id, cls, race } = fighter.def;
    if (!models.has(id)) {
      const entry = window.GGG_GRAVEGAIN_FIGHTERS[id];
      if (!entry) return false;
      const model = entry.build(THREE);
      model.userData.animate(0, 'idle');
      const bounds = new THREE.Box3().setFromObject(model);
      // Race size is applied by the arena compositor. Anchor every rig at its feet.
      model.position.y = -bounds.min.y;
      model.rotation.y = Math.PI * 0.31;
      models.set(id, model);
    }

    const model = models.get(id);
    const [name, phase] = animation(fighter);
    const state = { phase, cls, race, direction: fighter.chargeDir };
    const previous = motion.get(fighter);
    let from = previous?.from;
    if (previous && previous.name !== name) {
      const duration = phase === undefined ? 0.10 : 0.045;
      from = {
        name: previous.name, state: previous.state, time: previous.time,
        start: time, duration
      };
    }
    if (from && time >= from.start && time - from.start < from.duration) {
      const weight = 1 - (time - from.start) / from.duration;
      model.userData.animate(time, name, { ...state, blend: { ...from, weight } });
    } else {
      from = null;
      model.userData.animate(time, name, state);
    }
    motion.set(fighter, { name, time, state, from });
    scene.add(model);
    renderer.render(scene, camera);
    scene.remove(model);
    ctx.drawImage(canvas, -WIDTH * PIXELS_PER_UNIT / 2, -(CAMERA_Y + HEIGHT / 2) * PIXELS_PER_UNIT,
      WIDTH * PIXELS_PER_UNIT, HEIGHT * PIXELS_PER_UNIT);
    return true;
  }

  window.GG2DE_FIGHTER_MODELS = { draw };
})();
