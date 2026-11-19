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
    'borrow-book': 'library',
    'join-club': 'socialize', 'work-shift': 'work'
  });
  const DIALOGUE_BY_ACTION = Object.freeze({ 'talk-roommate': 'brian', 'talk-vendor': 'njeri', 'consult-lecturer': 'mwangi' });
  const TRAVEL_BY_ACTION = Object.freeze({ 'travel-campus': 'campus', 'travel-city': 'city', 'travel-township': 'township', 'travel-residence': 'residence' });
  const RELATIONSHIP_BY_CHARACTER = Object.freeze({
    brian: 'roommate', amina: 'coursemate', sumeya: 'sumeya', einstein: 'einstein', ernest: 'ernest', wanjiku: 'classRep', njeri: 'vendor', mwangi: 'lecturer'
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
    const onTravel = typeof options.onTravel === 'function' ? options.onTravel : null;
    const onPhone = typeof options.onPhone === 'function' ? options.onPhone : null;
    const weather = options.weatherRuntime || null;
    const npcScheduleRuntime = options.npcScheduleRuntime || null;
    const speech = options.speechRuntime || null;
    const voiceTracks = options.voiceTracks || {};
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
        const actions = place.actions.filter(function(action){return Boolean(ACTIVITY_BY_ACTION[action]||DIALOGUE_BY_ACTION[action]||TRAVEL_BY_ACTION[action]||action==='check-phone'||action==='join-study-circle');});
        if (!actions.length) return;
        const bounds = renderer.getHotspotBounds(place.anchor);
        if (!bounds) return;
        list.push({ type: 'place', id: place.id, name: place.name, anchor: place.anchor, bounds: bounds, actions: actions, exposure: place.exposure, radius: radius });
      });
      (npcAnchors[district] || []).forEach(function (npc) {
        if (!npc || !world.characters[npc.characterId] || typeof npc.anchor !== 'string') return;
        const bounds = renderer.getHotspotBounds(npc.anchor);
        if (!bounds) return;
        list.push({ type: 'character', id: npc.characterId, name: world.characters[npc.characterId].name, anchor: npc.anchor, bounds: bounds, actions: ['talk'], radius: Number.isFinite(npc.radius) && npc.radius > 0 ? npc.radius : radius });
      });
      return list;
    }
    function setDialogueContext(open) {
      if (input && typeof input.setContext === 'function') input.setContext({ dialogueOpen: !!open });
    }
    function getNearby() { return nearby ? Object.freeze(Object.assign({}, nearby)) : null; }
    function startVoice(characterId, key, fallbackKey) {
      if (!speech || typeof speech.start !== 'function') return null;
      const characterTracks = voiceTracks[characterId] || {};
      const track = key === 'introduction' ? characterTracks.introduction : ((characterTracks.lines && characterTracks.lines[key]) || (fallbackKey && characterTracks.topics && characterTracks.topics[fallbackKey]) || (characterTracks.topics && characterTracks.topics[key]));
      if (!track) { speech.stop(); return null; }
      try {
        const started = speech.start(track);
        if (started && typeof started.catch === 'function') started.catch(function () {});
        return started;
      } catch (error) {
        onEvent(Object.freeze({ type: 'dialogue:voice-unavailable', characterId: characterId, topic: key, reason: error && error.message ? error.message : String(error) }));
        return null;
      }
    }
    function getDialogue() {
      if (!dialogue) return null;
      const latestTurn = dialogue.historyEntries.length ? dialogue.historyEntries[dialogue.historyEntries.length - 1] : null;
      const stageParticipants = dialogue.groupScene
        ? [{ id: 'jay', name: 'Jay' }].concat(dialogue.participants)
        : [{ id: 'jay', name: 'Jay' }, { id: dialogue.characterId, name: dialogue.characterName }];
      const stage = Object.freeze({
        mode: 'authored-text-blocking',
        currentSpeakerId: latestTurn ? latestTurn.speakerId : null,
        currentExpression: latestTurn ? latestTurn.expression || 'neutral' : 'neutral',
        participants: Object.freeze(stageParticipants.map(function (person) {
          return Object.freeze({
            id: person.id,
            name: person.name,
            role: latestTurn && person.id === latestTurn.speakerId ? 'speaking' : 'listening',
            expression: latestTurn && person.id === latestTurn.speakerId ? (latestTurn.expression || 'neutral') : 'attentive'
          });
        }))
      });
      return Object.freeze({
        characterId: dialogue.characterId,
        characterName: dialogue.characterName,
        sceneId: dialogue.sceneId || null,
        sceneTitle: dialogue.sceneTitle || null,
        groupScene: !!dialogue.groupScene,
        stage: stage,
        participants: Object.freeze((dialogue.participants || []).map(function (person) { return Object.freeze(Object.assign({}, person)); })),
        line: dialogue.line,
        speakerId: latestTurn ? latestTurn.speakerId : dialogue.characterId,
        speakerName: latestTurn ? latestTurn.speakerName : dialogue.characterName,
        topics: Object.freeze(dialogue.topics.slice()),
        choices: Object.freeze(dialogue.choices.map(function (choice) { return Object.freeze(Object.assign({}, choice)); })),
        history: Object.freeze(dialogue.history.slice()),
        historyEntries: Object.freeze(dialogue.historyEntries.map(function (entry) { return Object.freeze(Object.assign({}, entry)); })),
        speech: speech && typeof speech.getState === 'function' ? speech.getState() : null
      });
    }
    function refresh(position) {
      if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) fail('Player position must contain finite world x and y coordinates.');
      if (dialogue) { nearby = { type: 'dialogue', id: dialogue.characterId, name: dialogue.characterName, distance: 0, prompt: 'Conversation in progress' }; return getNearby(); }
      const found = candidates().map(function (item) {
        return Object.assign(item, { distance: distanceToRect(position, item.bounds) });
      }).filter(function (item) { return item.distance <= item.radius; }).sort(function (a, b) { return a.distance - b.distance; });
      nearby = found.length ? Object.freeze(Object.assign({}, found[0], {
        prompt: found[0].type === 'character' ? 'Talk to ' + found[0].name : 'Interact: ' + found[0].name
      })) : null;
      return getNearby();
    }
    function availableChoices(character, relationship) {
      const authored = Array.isArray(character.conversationChoices) ? character.conversationChoices : [];
      const state = relationship || {};
      const choices = authored.filter(function (choice) {
        const gate = choice.requires || {};
        return (!Number.isFinite(gate.affinity) || (state.affinity || 0) >= gate.affinity) && (!Number.isFinite(gate.trust) || (state.trust || 0) >= gate.trust);
      }).map(function (choice) { return { id: choice.id, label: choice.label, kind: 'authored' }; });
      const legacy = Object.keys(character.topics || {}).filter(function (topic) { return !choices.some(function (choice) { return choice.id === topic; }); }).map(function (topic) { return { id: topic, label: topic.replace(/[-_]/g, ' '), kind: 'topic' }; });
      return choices.concat(legacy);
    }
    function openDialogue(characterId) {
      const character = world.characters[characterId];
      if (!character) fail('Unknown character: ' + characterId);
      const topicKeys = Object.keys(character.topics || {});
      const relationshipKey = RELATIONSHIP_BY_CHARACTER[characterId];
      const relationshipState = life.getState().relationships || {};
      const relationship = relationshipKey ? relationshipState[relationshipKey] : null;
      dialogue = {
        characterId: characterId, characterName: character.name,
        line: character.introduction, topics: topicKeys, choices: availableChoices(character, relationship), usedChoices: [], history: [character.introduction], historyEntries: [{ speakerId: characterId, speakerName: character.name, text: character.introduction, expression: 'welcoming' }]
      };
      setDialogueContext(true);
      startVoice(characterId, 'introduction');
      const event = Object.freeze({ type: 'dialogue:opened', characterId: characterId, line: character.introduction });
      onEvent(event);
      lastResult = event;
      return getDialogue();
    }
    function openGroupDialogue(sceneId) {
      const scene = (world.socialScenes || []).find(function (item) { return item.id === sceneId; });
      if (!scene) fail('Unknown authored social scene: ' + sceneId);
      if (currentDistrict() !== scene.district || life.getState().location !== scene.district) fail('This gathering is not in the current district.');
      const calendar = life.getState().calendar || {};
      if (calendar.minuteOfDay < scene.from || calendar.minuteOfDay >= scene.to) fail('The study circle is not scheduled at this time.');
      const place = world.districts[scene.district].places.find(function (item) { return item.id === scene.placeId; });
      const activePlace = (environment.getPlaces() || []).find(function (item) { return item.id === scene.placeId && item.available && item.anchor; });
      if (!place || !activePlace || !renderer.getHotspotBounds(activePlace.anchor)) fail('The gathering place has no active authored interaction hotspot.');
      if (!npcScheduleRuntime || typeof npcScheduleRuntime.getState !== 'function') fail('NPC schedule runtime is required for group gatherings.');
      const schedules = npcScheduleRuntime.getState();
      const present = scene.participants.filter(function (id) {
        return schedules.some(function (npc) { return npc.characterId === id && npc.presence === 'in-active-district' && npc.targetDistrict === scene.district && npc.targetPlaceId === scene.placeId; });
      });
      if (present.length < scene.minParticipants || present.length !== scene.participants.length) fail('The full study circle has not assembled yet.');
      const first = scene.opening[0];
      const lastOpening = scene.opening[scene.opening.length - 1];
      dialogue = {
        groupScene: true, sceneId: scene.id, sceneTitle: scene.title,
        characterId: lastOpening.speakerId, characterName: scene.title,
        participants: scene.participants.map(function (id) { return { id: id, name: world.characters[id].name }; }),
        line: lastOpening.text, topics: scene.choices.map(function (choice) { return choice.id; }),
        choices: scene.choices.map(function (choice) { return { id: choice.id, label: choice.label, kind: 'group' }; }),
        usedChoices: [],
        history: [], historyEntries: []
      };
      scene.opening.forEach(function (turn) {
        dialogue.history.push(turn.text);
        dialogue.historyEntries.push({ speakerId: turn.speakerId, speakerName: world.characters[turn.speakerId].name, text: turn.text, expression: turn.expression || 'neutral' });
      });
      setDialogueContext(true);
      const event = Object.freeze({ type: 'dialogue:group-opened', sceneId: scene.id, participants: Object.freeze(scene.participants.slice()) });
      onEvent(event); lastResult = event;
      return getDialogue();
    }
    function chooseGroupChoice(choiceId) {
      if (!dialogue || !dialogue.groupScene) fail('No group conversation is currently open.');
      const scene = (world.socialScenes || []).find(function (item) { return item.id === dialogue.sceneId; });
      const choice = scene && scene.choices.find(function (item) { return item.id === choiceId; });
      if (!choice || !dialogue.choices.some(function (item) { return item.id === choiceId; })) fail('That group conversation choice is not available.');
      const label = choice.label;
      dialogue.history.push(label);
      dialogue.historyEntries.push({ speakerId: 'jay', speakerName: 'Jay', text: label, expression: 'speaking' });
      choice.turns.forEach(function (turn) {
        const speaker = world.characters[turn.speakerId];
        dialogue.history.push(turn.text);
        dialogue.historyEntries.push({ speakerId: turn.speakerId, speakerName: speaker.name, text: turn.text, expression: turn.expression || 'neutral' });
        const relationshipKey = RELATIONSHIP_BY_CHARACTER[turn.speakerId];
        const effect = choice.effects && choice.effects[turn.speakerId];
        if (relationshipKey && effect && typeof life.recordRelationship === 'function') life.recordRelationship(relationshipKey, effect, 'Joined the ' + scene.title + ' discussion');
      });
      dialogue.line = choice.turns[choice.turns.length - 1].text;
      dialogue.usedChoices.push(choiceId);
      dialogue.choices = [];
      const event = Object.freeze({ type: 'dialogue:group-choice', sceneId: scene.id, choiceId: choiceId, participants: Object.freeze(scene.participants.slice()) });
      onEvent(event); lastResult = event;
      return getDialogue();
    }
    function chooseTopic(topic) {
      if (!dialogue) fail('No conversation is currently open.');
      if (dialogue.groupScene) return chooseGroupChoice(topic);
      const character = world.characters[dialogue.characterId];
      const choice = dialogue.choices.find(function (item) { return item.id === topic; });
      if (!choice) fail('That conversation choice is not currently available.');
      let line, effect = { affinity: 1, trust: 1 }, expression = 'thoughtful', lineId = topic, choiceLabel = choice.label;
      if (choice.kind === 'authored') {
        const authored = character.conversationChoices.find(function (item) { return item.id === topic; });
        if (!authored) fail('That authored conversation choice is unavailable.');
        const relationshipKey = RELATIONSHIP_BY_CHARACTER[dialogue.characterId];
        const relationship = relationshipKey && life.getState().relationships ? life.getState().relationships[relationshipKey] : null;
        const gate = authored.requires || {};
        if ((Number.isFinite(gate.affinity) && (!relationship || relationship.affinity < gate.affinity)) || (Number.isFinite(gate.trust) && (!relationship || relationship.trust < gate.trust))) fail('This conversation option is not unlocked yet.');
        line = authored.response;
        lineId = authored.lineId || authored.id;
        effect = authored.effects || effect;
        expression = authored.expression || expression;
      } else {
        const responses = character.topics && character.topics[topic];
        if (!Array.isArray(responses) || !responses.length) fail('That conversation topic is not available.');
        line = responses[0];
      }
      dialogue.historyEntries.push({ speakerId: 'jay', speakerName: 'Jay', text: choiceLabel, expression: 'speaking' });
      dialogue.history.push(choiceLabel);
      dialogue.line = line;
      dialogue.history.push(line);
      dialogue.historyEntries.push({ speakerId: dialogue.characterId, speakerName: dialogue.characterName, text: line, expression: expression });
      startVoice(dialogue.characterId, lineId, topic);
      dialogue.usedChoices.push(topic);
      const relationshipKey = RELATIONSHIP_BY_CHARACTER[dialogue.characterId];
      if (relationshipKey && typeof life.recordRelationship === 'function') {
        const effects = options.topicEffects && options.topicEffects[dialogue.characterId] && options.topicEffects[dialogue.characterId][topic] || effect;
        life.recordRelationship(relationshipKey, effects, 'Discussed ' + topic);
        const updatedState = life.getState();
        const updatedRelationship = updatedState.relationships && updatedState.relationships[relationshipKey];
        dialogue.choices = availableChoices(character, updatedRelationship).filter(function (item) { return dialogue.usedChoices.indexOf(item.id) === -1; });
      } else {
        dialogue.choices = dialogue.choices.filter(function (item) { return item.id !== topic; });
      }
      const event = Object.freeze({ type: 'dialogue:topic', characterId: dialogue.characterId, topic: topic, line: line, expression: expression, relationship: relationshipKey || null });
      onEvent(event);
      lastResult = event;
      return getDialogue();
    }
    function closeDialogue() {
      if (!dialogue) return false;
      const characterId = dialogue.characterId;
      if (speech && typeof speech.stop === 'function') speech.stop();
      dialogue = null;
      nearby = null;
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
      if (DIALOGUE_BY_ACTION[action]) {
        return Object.freeze({ type: 'dialogue:state', dialogue: openDialogue(DIALOGUE_BY_ACTION[action]) });
      }
      if (action === 'check-phone') {
        if (!onPhone) fail('The student phone is not connected.');
        onPhone();
        const phoneEvent = Object.freeze({ type: 'interaction:completed', district: currentDistrict(), placeId: place.id, action: action, activity: 'phone' });
        onEvent(phoneEvent); lastResult = phoneEvent; return phoneEvent;
      }
      const destination = TRAVEL_BY_ACTION[action];
      if (destination) {
        if (!onTravel) {
          const unavailable = Object.freeze({ type: 'interaction:unsupported', district: currentDistrict(), placeId: place.id, action: action, reason: 'The host has not connected district travel.' });
          onEvent(unavailable); lastResult = unavailable; return unavailable;
        }
        return Promise.resolve().then(function () { return onTravel(destination); }).then(function (result) {
          const travelled = Object.freeze({ type: 'interaction:completed', district: destination, placeId: place.id, action: action, activity: 'travel', destination: destination, result: result });
          onEvent(travelled); lastResult = travelled; return travelled;
        }).catch(function (error) {
          const failed = Object.freeze({ type: 'interaction:failed', district: currentDistrict(), placeId: place.id, action: action, reason: error && error.message ? error.message : String(error) });
          onEvent(failed); lastResult = failed; return failed;
        });
      }
      if (action === 'join-study-circle') {
        try { return Object.freeze({ type: 'dialogue:group-state', dialogue: openGroupDialogue('commons-study-circle') }); }
        catch (error) { const unavailable = Object.freeze({ type: 'interaction:unsupported', district: currentDistrict(), placeId: place.id, action: action, reason: error.message }); onEvent(unavailable); lastResult = unavailable; return unavailable; }
      }
      const activity = ACTIVITY_BY_ACTION[action];
      if (!activity) {
        const unsupported = Object.freeze({ type: 'interaction:unsupported', district: currentDistrict(), placeId: place.id, action: action, reason: 'No gameplay activity is mapped to this action yet.' });
        onEvent(unsupported); lastResult = unsupported; return unsupported;
      }
      const result = life.perform(activity);
      const exposure = place.exposure || 'indoor';
      const weatherAssessment = weather && typeof weather.assessExposure === 'function' ? weather.assessExposure(exposure) : null;
      if (weatherAssessment && weatherAssessment.advisory) {
        onEvent(Object.freeze({ type: 'weather:activity-advisory', district: currentDistrict(), placeId: place.id, exposure: exposure, message: weatherAssessment.advisory, shelterRecommended: weatherAssessment.shelterRecommended }));
      }
      const event = Object.freeze({ type: 'interaction:completed', district: currentDistrict(), placeId: place.id, action: action, activity: activity, result: result, weather: weatherAssessment });
      onEvent(event);
      lastResult = event;
      return event;
    }
    function getState() {
      return Object.freeze({ district: currentDistrict(), nearby: getNearby(), dialogue: getDialogue(), lastResult: lastResult });
    }
    return Object.freeze({
      refresh: refresh, interact: interact, openDialogue: openDialogue, openGroupDialogue: openGroupDialogue,
      chooseTopic: chooseTopic, closeDialogue: closeDialogue,
      getNearby: getNearby, getDialogue: getDialogue, getState: getState
    });
  }

  root.SemesterInteractionRuntime = Object.freeze({ create: create, activityByAction: ACTIVITY_BY_ACTION, travelByAction: TRAVEL_BY_ACTION });
})(typeof window !== 'undefined' ? window : globalThis);
