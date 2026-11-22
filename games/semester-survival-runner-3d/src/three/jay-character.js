import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

const CLIP_ALIASES = Object.freeze({
  idle: ["idle", "breathing", "breathingidle", "stand"],
  run: ["run", "running", "jog", "sprint"],
  jump: ["jump", "running_jump", "jump_running"],
  slide: ["slide", "sliding", "slide_loop", "runningslide"],
  slideStart: ["slide_start", "slide-start", "slideanticipation"],
  slideLoop: ["slide_loop", "slide-loop", "sliding", "runningslide"],
  slideRecover: ["slide_recover", "slide-recover", "slideout"],
  dodgeLeft: ["dodge_left", "dodge-left", "sidestep_left"],
  dodgeRight: ["dodge_right", "dodge-right", "sidestep_right"],
  fall: ["fall", "falling", "accidental_fall", "shoulder_hit_and_fall", "shoulderhitandfall"],
  getUp: ["getup", "get_up", "recovery", "stand_up"]
});

function normaliseClipName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fitCharacterToHeight(root, targetHeight) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  if (!Number.isFinite(size.y) || size.y <= 0) {
    throw new Error("Jay GLB has no measurable character height.");
  }
  const scale = targetHeight / size.y;
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  root.position.y -= fitted.min.y;
  return { sourceHeight: size.y, scale, bounds: fitted };
}

function resolveClips(clips) {
  const byName = new Map(clips.map(clip => [normaliseClipName(clip.name), clip]));
  const resolved = {};
  const missing = [];
  for (const [state, aliases] of Object.entries(CLIP_ALIASES)) {
    const match = aliases.map(alias => byName.get(normaliseClipName(alias))).find(Boolean);
    if (match) resolved[state] = match;
    else missing.push(state);
  }
  return { resolved, missing };
}

/**
 * Loads the production Jay GLB. The GLB must contain a skinned mesh, a named
 * armature and authored animation clips. No procedural person is generated
 * when the asset or a required clip is missing.
 */
export async function loadJayCharacter({
  url = "./assets/3d/jay/jay.glb",
  scene,
  targetHeight = 1.78,
  fadeSeconds = 0.18,
  strictClips = true,
  onProgress
} = {}) {
  if (!scene || typeof scene.add !== "function") {
    throw new TypeError("A Three.js scene is required.");
  }

  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.load(url, resolve, onProgress, reject);
  });

  const root = gltf.scene;
  if (!root) throw new Error("Jay GLB does not contain a scene.");
  root.name = "Jay_Character_Root";

  let skinnedMeshes = 0;
  root.traverse(node => {
    if (node.isSkinnedMesh) {
      skinnedMeshes += 1;
      node.frustumCulled = false;
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.material) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) {
          material.roughness = Math.max(0.38, material.roughness ?? 0.7);
          material.needsUpdate = true;
        }
      }
    } else if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  if (!skinnedMeshes) {
    throw new Error("Jay GLB is not rigged: no skinned mesh was found.");
  }

  const { resolved, missing } = resolveClips(gltf.animations || []);
  if (!resolved.idle || !resolved.run) {
    throw new Error("Jay GLB must include authored Idle and Run animation clips.");
  }
  if (strictClips && missing.length) {
    throw new Error("Jay GLB is missing required animation clips: " + missing.join(", "));
  }

  const fit = fitCharacterToHeight(root, targetHeight);
  scene.add(root);

  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  for (const [state, clip] of Object.entries(resolved)) {
    const action = mixer.clipAction(clip);
    action.enabled = true;
    action.clampWhenFinished = state !== "idle" && state !== "run";
    action.setLoop(
      state === "idle" || state === "run" ? THREE.LoopRepeat : THREE.LoopOnce,
      state === "idle" || state === "run" ? Infinity : 1
    );
    actions[state] = action;
  }

  let activeState = null;
  let disposed = false;

  function play(state, options = {}) {
    if (disposed) return { ok: false, reason: "disposed" };
    const action = actions[state];
    if (!action) {
      return { ok: false, reason: "missing-clip", state, available: Object.keys(actions) };
    }
    const fade = Math.max(0, options.fadeSeconds ?? fadeSeconds);
    const timeScale = Number.isFinite(options.timeScale) ? options.timeScale : 1;
    if (activeState === state) {
      action.setEffectiveTimeScale(timeScale);
      return { ok: true, state, changed: false };
    }
    const previous = activeState ? actions[activeState] : null;
    if (previous === action) {
      activeState = state;
      action.setEffectiveTimeScale(timeScale);
      return { ok: true, state, changed: true, aliased: true };
    }
    action.reset();
    action.enabled = true;
    action.setEffectiveTimeScale(timeScale);
    action.setEffectiveWeight(1);
    action.play();
    if (previous && fade > 0) action.crossFadeFrom(previous, fade, true);
    else if (previous) previous.stop();
    activeState = state;
    return { ok: true, state, changed: true };
  }

  function update(deltaSeconds) {
    if (disposed) return;
    mixer.update(Math.min(Math.max(deltaSeconds || 0, 0), 0.05));
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    mixer.stopAllAction();
    scene.remove(root);
    root.traverse(node => {
      if (!node.isMesh) return;
      node.geometry?.dispose?.();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach(material => material?.dispose?.());
    });
  }

  return Object.freeze({
    root,
    mixer,
    fit,
    availableClips: Object.freeze(Object.keys(actions)),
    missingClips: Object.freeze(missing),
    play,
    update,
    dispose,
    get activeState() { return activeState; }
  });
}
