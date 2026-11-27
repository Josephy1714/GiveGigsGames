export const CARRY_VEHICLE = Object.freeze({
  // Spawn behind Jay (+Z), then drive forward through his position and overtake him.
  approachStartZ: 10.5,
  boardingTriggerZ: -1.7,
  boardingEndZ: -1.7,
  approachSpeed: 7.5,
  boardingDurationSeconds: 0.9,
  rideDurationSeconds: 20,
  dismountDurationSeconds: 1.05,
  clearanceMinimumSeconds: 0.55,
  exitSpeed: 28,
  exitRecycleZ: -90,
  rideSpeedScale: 2.45,
  deckHeight: 1.05,
  deckCenterZ: 3.7,
  deckLength: 4.4,
  rampUpperZ: 5.9,
  rampLowerZ: 8.2
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = value => value * value * (3 - 2 * value);
const VALID_LANES = new Set([0, 1, 2]);

export function createCarryState() {
  return { phase: "approaching", lane: 1, vehicleLane: 1, vehicleZ: CARRY_VEHICLE.approachStartZ, elapsed: 0, rideElapsed: 0, speedScale: 1 };
}

export function isCarryEventActive(state) {
  return !!state && state.phase !== "completed";
}

export function getCarrySpeedScale(state) {
  return state ? clamp(Number(state.speedScale) || 1, 0.5, 3) : 1;
}

export function getCarryPlayerHeight(state) {
  if (!state) return 0;
  if (state.phase === "boarding") {
    // The hauler has overtaken Jay and is holding the deck beside him.
    // Jay jumps up from the road and lands on the flatbed without clipping through it.
    const progress = smoothstep(clamp(state.elapsed / CARRY_VEHICLE.boardingDurationSeconds, 0, 1));
    return CARRY_VEHICLE.deckHeight * progress + Math.sin(clamp(state.elapsed / CARRY_VEHICLE.boardingDurationSeconds, 0, 1) * Math.PI) * 0.08;
  }
  if (state.phase === "riding" || state.phase === "clearing") return CARRY_VEHICLE.deckHeight;
  if (state.phase === "dismounting") {
    const t = clamp(state.elapsed / CARRY_VEHICLE.dismountDurationSeconds, 0, 1);
    return CARRY_VEHICLE.deckHeight * (1 - t) + Math.sin(t * Math.PI) * 3.5;
  }
  return 0;
}

export function advanceCarryEvent(state, dt, { dismountLane, clearanceReady = false } = {}) {
  if (!state) return null;
  const delta = Math.max(0, Number(dt) || 0);
  const next = { ...state, lane: 1, vehicleLane: 1 };
  if (next.phase === "approaching") {
    next.vehicleZ -= CARRY_VEHICLE.approachSpeed * delta;
    if (next.vehicleZ <= CARRY_VEHICLE.boardingTriggerZ) {
      next.vehicleZ = CARRY_VEHICLE.boardingTriggerZ;
      next.phase = "boarding";
      next.elapsed = 0;
    }
  } else if (next.phase === "boarding") {
    next.elapsed += delta;
    // Hold the vehicle after it overtakes Jay while he jumps onto the deck.
    next.vehicleZ = CARRY_VEHICLE.boardingEndZ;
    if (next.elapsed >= CARRY_VEHICLE.boardingDurationSeconds) {
      next.phase = "riding";
      next.elapsed = 0;
      next.rideElapsed = 0;
      next.vehicleZ = CARRY_VEHICLE.boardingEndZ;
      next.speedScale = CARRY_VEHICLE.rideSpeedScale;
    }
  } else if (next.phase === "riding") {
    next.rideElapsed += delta;
    next.speedScale = CARRY_VEHICLE.rideSpeedScale;
    if (next.rideElapsed >= CARRY_VEHICLE.rideDurationSeconds) {
      next.phase = "clearing";
      next.elapsed = 0;
      next.speedScale = CARRY_VEHICLE.rideSpeedScale;
      next.exitLane = Number.isInteger(dismountLane) && dismountLane >= 0 && dismountLane <= 2 ? dismountLane : 1;
    }
  } else if (next.phase === "clearing") {
    next.elapsed += delta;
    next.speedScale = CARRY_VEHICLE.rideSpeedScale;
    if (Number.isInteger(dismountLane) && dismountLane >= 0 && dismountLane <= 2) next.exitLane = dismountLane;
    if (clearanceReady && next.elapsed >= CARRY_VEHICLE.clearanceMinimumSeconds) {
      next.phase = "dismounting";
      next.elapsed = 0;
      next.lane = next.exitLane ?? 1;
      next.vehicleLane = 1;
    }
  } else if (next.phase === "dismounting") {
    next.elapsed += delta;
    next.speedScale = CARRY_VEHICLE.rideSpeedScale;
    // Negative Z is forward along the road: the hauler pulls away from Jay.
    next.vehicleZ -= CARRY_VEHICLE.exitSpeed * delta;
    if (next.elapsed >= CARRY_VEHICLE.dismountDurationSeconds) {
      next.phase = "completed";
      next.elapsed = 0;
      next.speedScale = 1;
    }
  } else if (next.phase === "completed") {
    next.vehicleZ -= CARRY_VEHICLE.exitSpeed * delta;
    if (next.vehicleZ <= CARRY_VEHICLE.exitRecycleZ) return null;
  } else return null;
  return next;
}
