import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { prepareRunClips } from "./run-motion.js";

const CLIP_ALIASES = Object.freeze({
  idle: ["idle", "breathing", "breathingidle", "stand"],
  run: ["run", "running", "jog", "sprint"],
  runInPlace: ["run_in_place", "run-in-place", "runinplace"],
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

function reverseAnimationClip(clip, name) {
  const duration = clip.duration;
  const tracks = clip.tracks.map(track => {
    const valueSize = track.getValueSize();
    const sourceTimes = Array.from(track.times);
    const sourceValues = Array.from(track.values);
    const reversedTimes = sourceTimes.map(time => duration - time).reverse();
    const reversedValues = [];
    for (let key = sourceTimes.length - 1; key >= 0; key -= 1) {
      const start = key * valueSize;
      for (let component = 0; component < valueSize; component += 1) {
        reversedValues.push(sourceValues[start + component]);
      }
    }
    return new track.constructor(
      track.name,
      reversedTimes,
      reversedValues,
      track.getInterpolation()
    );
  });
  return new THREE.AnimationClip(name, duration, tracks);
}

function neutralizeOpenMouthMorphs(root) {
  const neutralized = [];
  root.traverse(node => {
    if (!node.isMesh || !node.morphTargetDictionary || !node.morphTargetInfluences) return;
    for (const [name, index] of Object.entries(node.morphTargetDictionary)) {
      // Mixamo and common DCC exports use these names for speech/open-jaw poses.
      // Keep smiles and other expression shapes intact.
      if (!/(?:mouth.?open|open.?mouth|jaw.?open|viseme|phoneme|talk|speak)/i.test(name)) continue;
      if (index < 0 || index >= node.morphTargetInfluences.length) continue;
      node.morphTargetInfluences[index] = 0;
      neutralized.push(name);
    }
  });
  return [...new Set(neutralized)];
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
  loader.setMeshoptDecoder(MeshoptDecoder);
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
  // Split the authored run at its furthest forward root pose. The approach
  // plays once and stops there; the endless loop keeps the skeleton running
  // while the world supplies continuous forward travel.
  const runMotion = prepareRunClips(resolved.run, THREE, resolved.runInPlace);
  delete resolved.runInPlace;
  resolved.run = runMotion.approachClip;
  const neutralizedMouthMorphs = neutralizeOpenMouthMorphs(root);
  // A reverse of the authored fall clip provides a grounded get-up transition
  // when no dedicated recovery FBX was supplied.
  if (resolved.fall && !resolved.getUp) {
    resolved.getUp = reverseAnimationClip(resolved.fall, "GetUp");
    const missingIndex = missing.indexOf("getUp");
    if (missingIndex >= 0) missing.splice(missingIndex, 1);
  }
  if (!resolved.idle || !resolved.run) {
    throw new Error("Jay GLB must include authored Idle and Run animation clips.");
  }
  if (strictClips && missing.length) {
    throw new Error("Jay GLB is missing required animation clips: " + missing.join(", "));
  }

  const fit = fitCharacterToHeight(root, targetHeight);
  scene.add(root);

  // Cache the real GLB skeleton so celebration choreography layers onto Jay's authored rig.
  const victoryBones = [];
  root.traverse(node => {
    if (!node.isBone) return;
    const name = normaliseClipName(node.name);
    let role = null;
    if (name.includes("leftforearm")) role = "leftForearm";
    else if (name.includes("rightforearm")) role = "rightForearm";
    else if (name.includes("leftarm") || name.includes("leftupperarm")) role = "leftArm";
    else if (name.includes("rightarm") || name.includes("rightupperarm")) role = "rightArm";
    else if (name.includes("lefthand")) role = "leftHand";
    else if (name.includes("righthand")) role = "rightHand";
    else if (name.includes("leftupleg") || name.includes("leftthigh")) role = "leftLeg";
    else if (name.includes("rightupleg") || name.includes("rightthigh")) role = "rightLeg";
    else if (name.includes("spine") || name.includes("chest")) role = "torso";
    if (role) victoryBones.push({ bone: node, role, base: node.quaternion.clone() });
  });

  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  for (const [state, clip] of Object.entries(resolved)) {
    const action = mixer.clipAction(clip);
    action.enabled = true;
    action.clampWhenFinished = state !== "idle" && state !== "run";
    const repeatsForever = state === "idle" || (state === "run" && runMotion.inPlaceAuthored);
    action.setLoop(repeatsForever ? THREE.LoopRepeat : THREE.LoopOnce, repeatsForever ? Infinity : 1);
    actions[state] = action;
  }

  // The first run uses the untouched authored clip exactly once. When it
  // finishes, the stationary loop holds the clip's final forward position.
  const runLoopAction = mixer.clipAction(runMotion.loopClip);
  runLoopAction.enabled = true;
  runLoopAction.clampWhenFinished = false;
  runLoopAction.setLoop(THREE.LoopRepeat, Infinity);

  let activeState = null;
  let runApproachCompleted = Boolean(runMotion.inPlaceAuthored);
  let disposed = false;

  mixer.addEventListener("finished", event => {
    if (event.action !== actions.run || activeState !== "run" || disposed) return;
    runApproachCompleted = true;
    actions.run.stop();
    runLoopAction.reset();
    runLoopAction.enabled = true;
    runLoopAction.setEffectiveTimeScale(actions.run.getEffectiveTimeScale());
    runLoopAction.setEffectiveWeight(1);
    runLoopAction.play();
  });

  function play(state, options = {}) {
    if (disposed) return { ok: false, reason: "disposed" };
    const action = state === "run" && runApproachCompleted ? runLoopAction : actions[state];
    if (!action) {
      return { ok: false, reason: "missing-clip", state, available: Object.keys(actions) };
    }
    const fade = Math.max(0, options.fadeSeconds ?? fadeSeconds);
    const timeScale = Number.isFinite(options.timeScale) ? options.timeScale : 1;
    if (activeState === state) {
      action.setEffectiveTimeScale(timeScale);
      if (state === "run") {
        actions.run.setEffectiveTimeScale(timeScale);
        runLoopAction.setEffectiveTimeScale(timeScale);
      }
      return { ok: true, state, changed: false };
    }
    const previous = activeState
      ? activeState === "run" && runApproachCompleted
        ? runLoopAction
        : actions[activeState]
      : null;
    if (previous === action) {
      activeState = state;
      action.setEffectiveTimeScale(timeScale);
      return { ok: true, state, changed: true, aliased: true };
    }
    if (state === "run") {
      actions.run.stop();
      runLoopAction.stop();
    }
    action.reset();
    action.enabled = true;
    action.setEffectiveTimeScale(timeScale);
    action.setEffectiveWeight(1);
    if (state === "run" && !runApproachCompleted) {
      action.clampWhenFinished = true;
      action.setLoop(THREE.LoopOnce, 1);
    }
    action.play();
    if (previous && fade > 0) action.crossFadeFrom(previous, fade, true);
    else if (previous) previous.stop();
    activeState = state;
    return { ok: true, state, changed: true };
  }

  function isFinished(state) {
    const action = actions[state];
    if (!action) return false;
    const duration = action.getClip().duration;
    return duration > 0 && action.paused && action.time >= duration - 1e-3;
  }

  function reset() {
    if (disposed) return;
    mixer.stopAllAction();
    for (const action of Object.values(actions)) {
      action.reset(); action.enabled = true; action.paused = false; action.setEffectiveWeight(1);
    }
    runLoopAction.reset(); runLoopAction.enabled = true; runLoopAction.paused = false;
    runApproachCompleted = Boolean(runMotion.inPlaceAuthored);
    activeState = null;
    mixer.update(0);
  }

  function update(deltaSeconds, options = {}) {
    if (disposed) return;
    // Restore the skeleton before each mixer step, then layer the victory pose
    // over the current authored clip. This prevents procedural offsets drifting.
    for (const item of victoryBones) item.bone.quaternion.copy(item.base);
    const gameplayPosition = root.position.clone();
    const gameplayRotation = root.quaternion.clone();
    const gameplayScale = root.scale.clone();
    mixer.update(Math.min(Math.max(deltaSeconds || 0, 0), 0.05));
    root.position.copy(gameplayPosition);
    root.quaternion.copy(gameplayRotation);
    root.scale.copy(gameplayScale);
    const victoryTime = Number(options.victoryTime);
    if (Number.isFinite(victoryTime) && victoryTime >= 0) {
      const t = victoryTime;
      const smooth = value => { const x = Math.max(0, Math.min(1, value)); return x * x * (3 - 2 * x); };
      const lift = smooth(t / 1.65);
      const dancing = t >= 1.65 && t < 9.2;
      const beat = dancing ? Math.sin((t - 1.65) * 4.1) : 0;
      const champion = smooth((t - 8.7) / 1.15);
      for (const item of victoryBones) {
        let x = 0, y = 0, z = 0;
        switch (item.role) {
          case "leftArm": z = 1.48 * lift + (dancing ? .28 * beat : 0); x = dancing ? .22 * Math.cos(t * 4.1) : 0; break;
          case "rightArm": z = -1.48 * lift - (dancing ? .28 * beat : 0); x = dancing ? -.22 * Math.cos(t * 4.1) : 0; break;
          case "leftForeArm": z = .48 * lift + (dancing ? .48 + .22 * beat : 0); break;
          case "rightForeArm": z = -.48 * lift - (dancing ? .48 + .22 * beat : 0); break;
          case "leftHand": z = dancing ? .2 * beat : 0; break;
          case "rightHand": z = dancing ? -.2 * beat : 0; break;
          case "leftLeg": x = dancing ? .34 * Math.sin(t * 4.1) : 0; break;
          case "rightLeg": x = dancing ? -.34 * Math.sin(t * 4.1) : 0; break;
          case "torso": y = dancing ? .12 * beat : 0; z = dancing ? .08 * Math.sin(t * 2.05) : 0; break;
        }
        const championLift = champion * (item.role === "leftArm" ? .22 : item.role === "rightArm" ? -.22 : 0);
        const offset = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z + championLift));
        item.bone.quaternion.multiply(offset);
      }
    }
    const rideTime = Number(options.rideTime);
    if (Number.isFinite(rideTime) && rideTime >= 0) {
      const phase = rideTime % 8.4;
      const beat = Math.sin(rideTime * 3.1);
      const brace = phase < 2.1;
      const pointing = phase >= 2.1 && phase < 4.2;
      const cheering = phase >= 4.2 && phase < 5.8;
      const wave = phase >= 5.8;
      for (const item of victoryBones) {
        let x = 0, y = 0, z = 0;
        switch (item.role) {
          case "leftArm": z = brace ? 0.42 : pointing ? 0.18 : cheering ? 1.42 : 0.22 + (wave ? .32 * beat : 0); x = brace ? -.42 : cheering ? -.2 : 0; break;
          case "rightArm": z = brace ? -0.42 : pointing ? -1.12 : cheering ? -1.42 : -0.22 - (wave ? .32 * beat : 0); x = brace ? -.42 : cheering ? -.2 : 0; break;
          case "leftForeArm": z = brace ? .3 : pointing ? .12 : cheering ? .55 : wave ? .4 + .22 * beat : 0; break;
          case "rightForeArm": z = brace ? -.3 : pointing ? -.48 : cheering ? -.55 : wave ? -.4 - .22 * beat : 0; break;
          case "leftHand": z = wave ? .18 * beat : 0; break;
          case "rightHand": z = wave ? -.18 * beat : 0; break;
          case "leftLeg": x = brace ? -.12 : cheering ? .2 * beat : 0; break;
          case "rightLeg": x = brace ? -.12 : cheering ? -.2 * beat : 0; break;
          case "torso": x = brace ? -.08 : pointing ? .04 : cheering ? .08 * beat : .025 * beat; z = pointing ? -.08 : .035 * Math.sin(rideTime * 1.55); break;
        }
        item.bone.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)));
      }
    }
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
    neutralizedMouthMorphs: Object.freeze(neutralizedMouthMorphs),
    runMotionTracksRemoved: runMotion.rootMotionTrackNames.length,
    runMotionAxesLocked: runMotion.rootMotionTrackNames.length * 2,
    runMotionTrackNames: Object.freeze(runMotion.rootMotionTrackNames),
    runApproachEndpointSeconds: runMotion.endpointTime,
    runMotionFound: runMotion.rootMotionFound,
    runMotionUsedFallback: Boolean(runMotion.usedFallback),
    play,
    getClipDuration(state) { return actions[state]?.getClip()?.duration ?? 0; },
    isFinished,
    reset,
    update,
    dispose,
    get activeState() { return activeState; },
    get runApproachCompleted() { return runApproachCompleted; }
  });
}
