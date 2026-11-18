'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../world-content.js');
require('../campaign-runtime.js');

function makeLife(semester) {
  let state = { campaign: { semester: semester || 1 } };
  return { getState: () => JSON.parse(JSON.stringify(state)), setSemester(value) { state.campaign.semester = value; } };
}
function harness(semester) {
  const map = new Map(), events = [];
  const life = makeLife(semester);
  const runtime = globalThis.SemesterCampaignRuntime.create({
    lifeEngine: life, storage: { getItem: k => map.get(k) || null, setItem: (k,v) => map.set(k,v) },
    onEvent: event => events.push(event)
  });
  return { runtime, life, map, events };
}
test('starts with the first authored semester-one chapter and ordered steps', () => {
  const h = harness();
  const state = h.runtime.getState();
  assert.equal(state.chapter.id, 's1-arrival');
  assert.deepEqual(state.steps.map(step => step.id), ['meet-roommate', 'settle-in']);
  assert.equal(state.steps[0].complete, false);
});
test('progresses matching events, ignores unrelated events, and unlocks chapters in order', () => {
  const h = harness();
  h.runtime.recordEvent({ type: 'travel', destination: 'campus' });
  assert.equal(h.runtime.getState().chapter.id, 's1-arrival');
  h.runtime.recordEvent({ type: 'dialogue:opened', characterId: 'brian' });
  assert.equal(h.runtime.getState().steps[0].complete, true);
  h.runtime.recordEvent({ type: 'interaction:completed', activity: 'sleep' });
  assert.equal(h.runtime.getState().chapter.id, 's1-orientation');
  assert.equal(h.events.some(event => event.type === 'chapter:completed'), true);
});
test('supports counted objectives and match-any triggers', () => {
  const h = harness();
  h.runtime.recordEvent({ type: 'dialogue:opened', characterId: 'brian' });
  h.runtime.recordEvent({ type: 'interaction:completed', activity: 'sleep' });
  h.runtime.recordEvent({ type: 'travel', destination: 'township' });
  h.runtime.recordEvent({ type: 'travel', destination: 'campus' });
  h.runtime.recordEvent({ type: 'interaction:completed', activity: 'lecture' });
  h.runtime.recordEvent({ type: 'dialogue:opened', characterId: 'amina' });
  h.runtime.recordEvent({ type: 'dialogue:opened', characterId: 'njeri' });
  h.runtime.recordEvent({ type: 'budget:reviewed' });
  h.runtime.recordEvent({ type: 'interaction:completed', activity: 'study' });
  assert.equal(h.runtime.getState().chapter.id, 's1-first-assessment');
  h.runtime.recordEvent({ type: 'interaction:completed', activity: 'study' });
  assert.equal(h.runtime.getState().steps[0].count, 1);
  h.runtime.recordEvent({ type: 'interaction:completed', activity: 'library' });
  assert.equal(h.runtime.getState().steps[0].complete, true);
});
test('persists objective progress and restores it after reload', () => {
  const h = harness();
  h.runtime.recordEvent({ type: 'dialogue:opened', characterId: 'brian' });
  const restored = globalThis.SemesterCampaignRuntime.create({
    lifeEngine: h.life, storage: { getItem: k => h.map.get(k) || null, setItem: (k,v) => h.map.set(k,v) }
  });
  assert.equal(restored.getState().steps[0].complete, true);
});
test('resets chapter index when the academic semester advances', () => {
  const h = harness();
  h.life.setSemester(2);
  assert.equal(h.runtime.getState().semester, 2);
  assert.equal(h.runtime.getState().chapter.id, 's2-routine');
});
test('rejects malformed event input', () => {
  const h = harness();
  assert.throws(() => h.runtime.recordEvent(null), /must include a type/);
});
