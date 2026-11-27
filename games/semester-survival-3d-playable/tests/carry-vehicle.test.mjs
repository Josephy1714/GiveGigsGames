import test from "node:test";
import assert from "node:assert/strict";
import { CARRY_VEHICLE, advanceCarryEvent, createCarryState, getCarryPlayerHeight, getCarrySpeedScale, isCarryEventActive } from "../src/three/carry-vehicle.js";

function reachRiding() {
  let state = createCarryState();
  state = advanceCarryEvent(state, 4);
  assert.equal(state.phase, "boarding");
  state = advanceCarryEvent(state, CARRY_VEHICLE.boardingDurationSeconds);
  assert.equal(state.phase, "riding");
  return state;
}

test("hauler approaches from behind, overtakes Jay, then he jumps onto its deck", () => {
  let state = createCarryState({ lane: 2 });
  assert.equal(state.phase, "approaching");
  assert.equal(state.lane, 1);
  assert.ok(state.vehicleZ > 2, "the hauler starts behind Jay");
  const startZ = state.vehicleZ;
  state = advanceCarryEvent(state, 0.5);
  assert.ok(state.vehicleZ < startZ, "the hauler moves forward toward and past Jay");
  state = advanceCarryEvent(state, 2.5);
  assert.equal(state.phase, "boarding");
  assert.equal(state.vehicleZ, CARRY_VEHICLE.boardingTriggerZ);
  assert.equal(getCarryPlayerHeight(state), 0, "Jay starts at road height");
  const heldZ = state.vehicleZ;
  state = advanceCarryEvent(state, CARRY_VEHICLE.boardingDurationSeconds / 2);
  assert.equal(state.vehicleZ, heldZ, "the hauler holds position while Jay boards");
  assert.ok(getCarryPlayerHeight(state) > 0);
  state = advanceCarryEvent(state, CARRY_VEHICLE.boardingDurationSeconds / 2);
  assert.equal(state.phase, "riding");
  assert.equal(state.rideElapsed, 0);
  assert.equal(getCarryPlayerHeight(state), CARRY_VEHICLE.deckHeight);
  assert.equal(getCarrySpeedScale(state), CARRY_VEHICLE.rideSpeedScale);
});

test("ride ends in a clearance hold instead of jumping immediately", () => {
  let state = reachRiding();
  state = advanceCarryEvent(state, CARRY_VEHICLE.rideDurationSeconds);
  assert.equal(state.phase, "clearing");
  assert.equal(getCarryPlayerHeight(state), CARRY_VEHICLE.deckHeight);
  assert.equal(getCarrySpeedScale(state), CARRY_VEHICLE.rideSpeedScale);
  state = advanceCarryEvent(state, 1.2, { dismountLane: 0, clearanceReady: false });
  assert.equal(state.phase, "clearing");
  assert.equal(state.lane, 1, "hauler stays in the middle lane until Jay exits");
  state = advanceCarryEvent(state, CARRY_VEHICLE.clearanceMinimumSeconds, { dismountLane: 0, clearanceReady: true });
  assert.equal(state.phase, "dismounting");
  assert.equal(state.lane, 0, "Jay exits only after the landing lane is clear");
});

test("hauler pulls forward at high speed while Jay dismounts", () => {
  let state = reachRiding();
  state = advanceCarryEvent(state, CARRY_VEHICLE.rideDurationSeconds);
  const beforeClearance = state.vehicleZ;
  state = advanceCarryEvent(state, CARRY_VEHICLE.clearanceMinimumSeconds, { dismountLane: 2, clearanceReady: true });
  assert.equal(state.phase, "dismounting");
  state = advanceCarryEvent(state, CARRY_VEHICLE.dismountDurationSeconds);
  assert.equal(state.phase, "completed");
  assert.ok(state.vehicleZ < beforeClearance, "negative Z moves the hauler forward");
  assert.equal(getCarryPlayerHeight(state), 0);
  assert.equal(getCarrySpeedScale(state), 1);
  assert.equal(isCarryEventActive(state), false);
  state = advanceCarryEvent(state, 3);
  assert.equal(state, null);
});

test("the hauler never changes out of the middle lane", () => {
  let state = createCarryState();
  state = advanceCarryEvent(state, 0.01, { dismountLane: 2 });
  assert.equal(state.lane, 1);
  state = reachRiding();
  state = advanceCarryEvent(state, CARRY_VEHICLE.rideDurationSeconds);
  state = advanceCarryEvent(state, 0.6, { dismountLane: 2, clearanceReady: false });
  assert.equal(state.lane, 1);
  state = advanceCarryEvent(state, 0.6, { dismountLane: 2, clearanceReady: true });
  assert.equal(state.phase, "dismounting");
  assert.equal(state.vehicleLane, 1);
  assert.equal(state.lane, 2);
});

test("state transitions are immutable and restart can start a fresh event", () => {
  const original = createCarryState({ lane: 0 });
  const next = advanceCarryEvent(original, 0.5);
  assert.notEqual(next, original);
  assert.equal(original.phase, "approaching");
  assert.equal(createCarryState({ lane: 1 }).phase, "approaching");
});
