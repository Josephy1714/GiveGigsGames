'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../character-runtime.js');

function harness(overrides) {
  const calls = [];
  let inputFrame = { moveX: 1, sprint: true };
  let movement = { x: 0, y: 0, facing: 1, state: 'idle' };
  const controller = {
    update(dt, intent) { calls.push(['controller.update', dt, intent]); movement = { x: movement.x + intent.moveX * dt, y: movement.y, facing: 1, state: intent.jumpPressed ? 'jump-takeoff' : 'jog' }; return movement; },
    snapshot() { return movement; },
    reset(position) { movement = { x: position.x || 0, y: 0, facing: 1, state: 'idle' }; return movement; }
  };
  const animator = {
    play(name, facing) { calls.push(['animator.play', name, facing]); return { ok: true, clip: name }; },
    update(dt) { calls.push(['animator.update', dt]); return { status: 'ready', clip: 'jog' }; },
    snapshot() { return { status: 'ready', clip: 'idle' }; },
    render() { calls.push(['animator.render']); return { drawn: true }; },
    reset() { calls.push(['animator.reset']); }
  };
  const renderer = {
    updateCamera(target, dt) { calls.push(['camera', target, dt]); },
    render(frame) { calls.push(['render', frame]); return { drawnLayers: 3 }; }
  };
  const inputManager = { consume() { const value = inputFrame; inputFrame = {}; return value; }, destroy() { calls.push(['input.destroy']); } };
  return {
    calls, setInput(value) { inputFrame = value; },
    runtime: globalThis.SemesterCharacterRuntime.create(Object.assign({ controller, animator, renderer, inputManager }, overrides || {}))
  };
}

test('wires desktop/touch intent through controller, animation, camera and renderer', () => {
  const h = harness();
  const state = h.runtime.update(1 / 60);
  assert.equal(state.movement.state, 'jog');
  assert.equal(state.ready, true);
  assert.ok(h.calls.some(c => c[0] === 'controller.update' && c[2].sprint === true));
  assert.ok(h.calls.some(c => c[0] === 'animator.play' && c[1] === 'jog'));
  assert.ok(h.calls.some(c => c[0] === 'camera'));
  assert.equal(h.runtime.render().rendered, true);
});

test('maps landing recovery to the authored land-soft clip', () => {
  const h = harness();
  h.runtime.update(1 / 60);
  h.setInput({ jumpPressed: true });
  h.runtime.update(1 / 60);
  assert.ok(h.calls.some(c => c[0] === 'animator.play' && c[1] === 'jump-takeoff'));
  // Landing is represented by the controller's land-recover state and authored land-soft clip.
  const movement = { x: 0, y: 0, facing: 1, state: 'land-recover' };
  const controller = { update() { return movement; }, snapshot() { return movement; }, reset() { return movement; } };
  const animator = { play(name) { h.calls.push(['landing-clip', name]); return { ok: true }; }, update() {}, snapshot() { return {}; }, render() {}, reset() {} };
  const renderer = { updateCamera() {}, render() {} };
  const runtime = globalThis.SemesterCharacterRuntime.create({ controller, animator, renderer, inputManager: { consume() { return {}; } } });
  runtime.update(1 / 60);
  assert.ok(h.calls.some(c => c[0] === 'landing-clip' && c[1] === 'land-soft'));
});

test('fails closed when the selected authored clip is unavailable', () => {
  const h = harness();
  const original = h.runtime.getState;
  assert.equal(typeof original, 'function');
  // Build a second runtime with an animator that rejects the selected clip.
  const calls = [];
  const controller = { update() { return { x: 2, y: 0, facing: 1, state: 'jog' }; }, snapshot() { return { x: 0, y: 0, facing: 1, state: 'idle' }; }, reset() { return this.snapshot(); } };
  const animator = { play(name) { return { ok: false, missingClip: name }; }, update() {}, snapshot() { return { status: 'unbound' }; }, render() {}, reset() {} };
  const renderer = { updateCamera() { calls.push('camera'); }, render() { calls.push('render'); } };
  const runtime = globalThis.SemesterCharacterRuntime.create({ controller, animator, renderer, inputManager: { consume() { return {}; } } });
  const state = runtime.update(1 / 60);
  assert.equal(state.ready, false);
  assert.match(state.error, /jog/);
  assert.equal(runtime.render().rendered, false);
  assert.ok(calls.includes('camera'));
  assert.ok(!calls.includes('render'));
});

test('reset restores idle, position and frame counter; dispose blocks later updates', () => {
  const h = harness();
  h.runtime.update(1 / 60);
  const state = h.runtime.reset({ x: 12 });
  assert.equal(state.movement.x, 12);
  assert.equal(state.frameNumber, 0);
  assert.equal(h.calls.at(-1)[0], 'camera');
  h.runtime.dispose();
  assert.throws(() => h.runtime.update(1 / 60), /disposed/);
  assert.ok(h.calls.some(c => c[0] === 'input.destroy'));
});

test('validates required dependencies and optional atlas clip completeness', () => {
  assert.throws(() => globalThis.SemesterCharacterRuntime.create({}), /requires controller/);
  const h = harness();
  assert.throws(() => globalThis.SemesterCharacterRuntime.create({
    controller: { update() {}, snapshot() {}, reset() {} },
    animator: { play() {}, update() {}, snapshot() {}, render() {}, reset() {} },
    renderer: { updateCamera() {}, render() {} },
    inputManager: { consume() {} },
    clipLibrary: { has(name) { return name !== 'sprint'; } }
  }), /missing clips: sprint/);
  assert.ok(h);
});
