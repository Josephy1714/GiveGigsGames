/* Semester Survival — proximity interactions and authored NPC dialogue.
 * Uses only scene-authored hotspots. No generated interaction positions or dialogue art.
 */
(function (root) {
  'use strict';

  const ACTIVITY_BY_ACTION = Object.freeze({
    sleep: 'sleep', study: 'study', 'buy-meal': 'eat', 'buy-supplies': 'snack',
    'print-notes': 'print', 'bind-assignment': 'print', 'attend-lecture': 'lecture',
    'ask-question': 'consultation', 'consult-lecturer': 'consultation',
    socialize: 'socialize', 'meet-friend': 'socialize', 'talk-roommate': 'socialize',
    'talk-vendor': 'socialize', 'lab-session': 'study', 'work-on-project': 'assignment',
    'wash-clothes': 'nap', 'get-haircut': 'nap', 'borrow-book': 'library',
    'join-club': 'socialize', 'work-shift': 'work'
  });
  const RELATIONSHIP_BY_CHARACTER = Object.freeze({
    brian: 'roommate', amina: 'coursemate', wanjiku: 'classRep'
  });
  function fail(message) { throw new Error(message); }
  function distanceToRect(point, rect) {
    const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
    const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
    return Math.hypot(dx, dy);
  }

  function create(options) {
    options = options || {};
    const world = options.world || root.SemesterWorldContent;
    const environment = options.environment;
    const renderer = options.renderer;
    const life = options.lifeEngine;
    const input = options.inputManager || null;
    const onEvent = typeof options.onEvent === 'function' ? options.onEvent : function () {};
    const npcAnchors = options.npcAnchors || {};
    const radius = Number.isFinite(options.interactionRadius) && options.interactionRadius > 0 ? options.interactionRadius : 72;
    if (!world || !world.districts || !environment || typeof environment.getPlaces !== 'function') fail('World content and environment runtime are required.');
    if (!renderer || typeof renderer.getHotspotBounds !== 'function' || typeof renderer.focusInteractable !== 'function') fail('Renderer must expose authored hotspot bounds and focus.');
    if (!life || typeof life.perform !== 'function' || typeof life.getState !== 'function') fail('Life systems engine is required.');

    let nearby = null;
    let dialogue = null;
    let lastResult = null;

    function currentDistrict() {
      const state = typeof environment.getState === 'function' ? environment.getState() : null;
      return state && state.district || (life.getState().location || null);
    }
    function candidates() {
      const district = currentDistrict();
      if (!district || !world.districts[district]) return [];
      const list = [];
      environment.getPlaces().forEach(function (place) {
        if (!place.available || !place.anchor) return;
        const bounds = renderer.getHotspotBounds(place.anchor);
        if (!bounds) return;
        list.push({ type: 'place', id: place.id, name: place.name, anchor: place.anchor, bounds: bounds, actions: place.actions });
      });
      (npcAnchors[district] || []).forEach(function (npc) {
        if (!npc || !world.characters[npc.characterId] || typeof npc.anchor !== 'string') return;
        const bounds = renderer.getHotspotBounds(npc.anchor);
        if (!bounds) return;
        list.push({ type: 'character', id: npc.characterId, name: world.characters[npc.characterId].name, anchor: npc.anchor, bounds: bounds, actions: ['talk'] });
      });
      return list;
    }
    function setDialogueContext(open) {
      if (input && typeof input.setContext === 'function') input.setContext({ dialogueOpen: !!open });
    }
    function getNearby() { return nearby ? Object.freeze(Object.assign({}, nearby)) : null; }
    function getDialogue() {
      if (!dialogue) return null;
      return Object.freeze({
        characterId: dialogue.characterId,
        characterName: dialogue.characterName,
        line: dialogue.line,
        topics: Object.freeze(dialogue.topics.slice()),
        history: Object.freeze(dialogue.history.slice())
      });
    }
    function refresh(position) {
      if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) fail('Player position must contain finite world x and y coordinates.');
      if (dialogue) { nearby = { type: 'dialogue', id: dialogue.characterId, name: dialogue.characterName, distance: 0, prompt: 'Conversation in progress' }; return getNearby(); }
      const found = candidates().map(function (item) {
        return Object.assign(item, { distance: distanceToRect(position, item.bounds) });
      }).filter(function (item) { return item.distance <= radius; }).sort(function (a, b) { return a.distance - b.distance; });
      nearby = found.length ? Object.freeze(Object.assign({}, found[0], {
        prompt: found[0].type === 'character' ? 'Talk to ' + found[0].name : 'Interact: ' + found[0].name
      })) : null;
      return getNearby();
    }
    function openDialogue(characterId) {
      const character = world.characters[characterId];
      if (!character) fail('Unknown character: ' + characterId);
      const topicKeys = Object.keys(character.topics || {});
      dialogue = {
        characterId: characterId, characterName: character.name,
        line: character.introduction, topics: topicKeys, history: [character.introduction]
      };
      setDialogueContext(true);
      const event = Object.freeze({ type: 'dialogue:opened', characterId: characterId, line: character.introduction });
      onEvent(event);
      lastResult = event;
      return getDialogue();
    }
    function chooseTopic(topic) {
      if (!dialogue) fail('No conversation is currently open.');
      const character = world.characters[dialogue.characterId];
      const responses = character.topics && character.topics[topic];
      if (!Array.isArray(responses) || !responses.length) fail('That conversation topic is not available.');
      const line = responses[0];
      dialogue.line = line;
      dialogue.history.push(line);
      const relationshipKey = RELATIONSHIP_BY_CHARACTER[dialogue.characterId];
      if (relationshipKey && typeof life.recordRelationship === 'function') {
        const effects = options.topicEffects && options.topicEffects[dialogue.characterId] && options.topicEffects[dialogue.characterId][topic] || { affinity: 1, trust: 1 };
        life.recordRelationship(relationshipKey, effects, 'Discussed ' + topic);
      }
      const event = Object.freeze({ type: 'dialogue:topic', characterId: dialogue.characterId, topic: topic, line: line, relationship: relationshipKey || null });
      onEvent(event);
      lastResult = event;
      return getDialogue();
    }
    function closeDialogue() {
      if (!dialogue) return false;
      const characterId = dialogue.characterId;
      dialogue = null;
      setDialogueContext(false);
      const event = Object.freeze({ type: 'dialogue:closed', characterId: characterId });
      onEvent(event);
      lastResult = event;
      return true;
    }
    function interact(position, intent) {
      intent = intent || {};
      refresh(position);
      if (dialogue) {
        if (intent.cancel || intent.closeDialogue) closeDialogue();
        else if (intent.topic) chooseTopic(intent.topic);
        return Object.freeze({ type: 'dialogue:state', dialogue: getDialogue() });
      }
      const requested = intent.interaction || null;
      const pressed = !!intent.interactPressed || !!requested;
      if (!pressed || !nearby) return Object.freeze({ type: 'interaction:none', nearby: getNearby() });
      if (nearby.type === 'character' || requested === 'talk') {
        return Object.freeze({ type: 'dialogue:state', dialogue: openDialogue(nearby.id) });
      }
      const place = world.districts[currentDistrict()].places.find(function (p) { return p.id === nearby.id; });
      const action = requested && place.actions.includes(requested) ? requested : (place.actions[0] || null);
      if (!action) fail('This place has no authored actions.');
      renderer.focusInteractable(nearby.anchor);
      const activity = ACTIVITY_BY_ACTION[action];
      if (!activity) {
        const unsupported = Object.freeze({ type: 'interaction:unsupported', district: currentDistrict(), placeId: place.id, action: action, reason: 'No gameplay activity is mapped to this action yet.' });
        onEvent(unsupported); lastResult = unsupported; return unsupported;
      }
      const result = life.perform(activity);
      const event = Object.freeze({ type: 'interaction:completed', district: currentDistrict(), placeId: place.id, action: action, activity: activity, result: result });
      onEvent(event);
      lastResult = event;
      return event;
    }
    function getState() {
      return Object.freeze({ district: currentDistrict(), nearby: getNearby(), dialogue: getDialogue(), lastResult: lastResult });
    }
    return Object.freeze({
      refresh: refresh, interact: interact, openDialogue: openDialogue,
      chooseTopic: chooseTopic, closeDialogue: closeDialogue,
      getNearby: getNearby, getDialogue: getDialogue, getState: getState
    });
  }

  root.SemesterInteractionRuntime = Object.freeze({ create: create, activityByAction: ACTIVITY_BY_ACTION });
})(typeof window !== 'undefined' ? window : globalThis);
