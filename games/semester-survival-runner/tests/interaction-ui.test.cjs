'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../interaction-ui.js');

class FakeElement {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = doc;
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.listeners = {};
    this.className = '';
    this.textContent = '';
    this.type = '';
    this.focused = false;
    const classes = new Set();
    this.classList = {
      add: value => classes.add(value),
      remove: value => classes.delete(value),
      contains: value => classes.has(value),
      toggle: (value, force) => {
        const next = force === undefined ? !classes.has(value) : !!force;
        if (next) classes.add(value); else classes.delete(value);
        return next;
      }
    };
  }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    this.children.push(child); child.parentNode = this; return child;
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null; return child;
  }
  get firstChild() { return this.children[0] || null; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  dispatch(type, event) { (this.listeners[type] || []).forEach(fn => fn(event || {})); }
  focus() { this.focused = true; }
}
class FakeDocument {
  constructor() { this.listeners = {}; }
  createElement(tag) { return new FakeElement(tag, this); }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  removeEventListener(type, callback) {
    this.listeners[type] = (this.listeners[type] || []).filter(fn => fn !== callback);
  }
  dispatch(type, event) { (this.listeners[type] || []).forEach(fn => fn(event || {})); }
}
function find(root, predicate) {
  if (predicate(root)) return root;
  for (const child of root.children) { const found = find(child, predicate); if (found) return found; }
  return null;
}
function harness() {
  const document = new FakeDocument();
  const host = new FakeElement('div', document);
  let state = { nearby: { type: 'place', id: 'library', name: 'Main Library', prompt: 'Interact: Main Library' }, dialogue: null };
  const calls = [];
  const runtime = {
    getState: () => state,
    interact(position, intent) {
      calls.push({ position, intent });
      if (intent.interactPressed) state = { nearby: null, dialogue: null };
      if (intent.topic) state = { nearby: null, dialogue: {
        characterId: 'njeri', characterName: 'Mama Njeri', line: '<script>not markup</script>',
        topics: ['budget'], history: ['Karibu', '<script>not markup</script>']
      } };
      if (intent.closeDialogue) state = { nearby: null, dialogue: null };
    }
  };
  const ui = globalThis.SemesterInteractionUI.create({
    root: host, document, interactionRuntime: runtime,
    getPlayerPosition: () => ({ x: 12, y: 34 })
  });
  return { document, host, runtime, calls, ui, setState: value => { state = value; } };
}

test('contextual prompt renders only for a nearby target and activates through runtime', () => {
  const h = harness();
  assert.equal(h.host.children.length, 1);
  assert.equal(find(h.host, el => el.className === 'ss-interaction-ui__target').textContent, 'Interact: Main Library');
  const action = find(h.host, el => el.className === 'ss-interaction-ui__button');
  action.dispatch('click');
  assert.deepEqual(h.calls[0], { position: { x: 12, y: 34 }, intent: { interactPressed: true } });
  assert.equal(h.host.children.length, 0);
});

test('dialogue uses text nodes, exposes topic choices, and handles Escape', () => {
  const h = harness();
  h.setState({ nearby: null, dialogue: {
    characterId: 'njeri', characterName: 'Mama Njeri', line: 'Karibu',
    topics: ['budget'], history: ['Karibu']
  } });
  h.ui.refresh();
  assert.equal(find(h.host, el => el.className === 'ss-interaction-ui__monogram').textContent, 'MN');
  assert.equal(find(h.host, el => el.className === 'ss-interaction-ui__line').textContent, 'Karibu');
  const choice = find(h.host, el => el.className === 'ss-interaction-ui__choice');
  choice.dispatch('click');
  assert.deepEqual(h.calls.at(-1).intent, { topic: 'budget' });
  assert.equal(find(h.host, el => el.className === 'ss-interaction-ui__line is-current').textContent, '<script>not markup</script>');
  let prevented = false;
  h.document.dispatch('keydown', { key: 'Escape', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.deepEqual(h.calls.at(-1).intent, { closeDialogue: true });
  assert.equal(h.host.children.length, 0);
});

test('destroy removes the document listener and overlay', () => {
  const h = harness();
  assert.equal(h.document.listeners.keydown.length, 1);
  h.ui.destroy();
  assert.equal(h.document.listeners.keydown.length, 0);
  assert.equal(h.host.children.length, 0);
  assert.equal(h.host.classList.contains('is-active'), false);
});
