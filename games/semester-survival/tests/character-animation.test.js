'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
require('../character-animation.js');

const animation = globalThis.SemesterCharacterAnimation;
const frame = { x: 0, y: 0, width: 16, height: 24 };
function library(names) {
  const clips = {};
  names.forEach(name => { clips[name] = { frames: [frame], fps: 8, playback: 'loop' }; });
  return animation.createClipLibrary({ clips }, { width: 64, height: 64 });
}

test('Jay jump phases resolve to the authored standing or running jump sheet', () => {
  const clips = library(['idle', 'walk', 'jog', 'sprint', 'jump-standing', 'jump-running']);
  for (const state of ['jump-takeoff', 'jump-rise', 'jump-apex', 'jump-fall', 'land-recover']) {
    assert.equal(animation.resolveStateClip(state, { speed: 0 }, clips), 'jump-standing');
    assert.equal(animation.resolveStateClip(state, { speed: 3.8 }, clips), 'jump-running');
  }
});

test('unsupported slide and dodge actions never request nonexistent animation files', () => {
  const clips = library(['idle', 'walk', 'jog', 'sprint']);
  assert.equal(animation.resolveStateClip('slide-start', { speed: 5.2 }, clips), 'sprint');
  assert.equal(animation.resolveStateClip('slide-loop', { speed: 3.2 }, clips), 'jog');
  assert.equal(animation.resolveStateClip('dodge-left', { speed: 1.5 }, clips), 'walk');
  assert.equal(animation.resolveStateClip('dodge-right', { speed: 0 }, clips), 'walk');
});

test('authored action clips take precedence when they are available', () => {
  const clips = library(['idle', 'walk', 'jog', 'sprint', 'slide-start', 'dodge-left']);
  assert.equal(animation.resolveStateClip('slide-start', { speed: 5 }, clips), 'slide-start');
  assert.equal(animation.resolveStateClip('dodge-left', { speed: 1 }, clips), 'dodge-left');
});

test('idle remains the safe fallback for unknown non-locomotion states', () => {
  const clips = library(['idle', 'walk', 'jog', 'sprint']);
  assert.equal(animation.resolveStateClip('unknown-action', { speed: 0 }, clips), 'idle');
});
