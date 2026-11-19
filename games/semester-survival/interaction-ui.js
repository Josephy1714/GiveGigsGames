/* Semester Survival — accessible contextual interaction and dialogue UI.
 * Host-owned overlay: no frame loop, fabricated portraits, or untrusted HTML injection.
 */
(function (root) {
  'use strict';

  function create(options) {
    options = options || {};
    const host = options.root;
    const runtime = options.interactionRuntime;
    const doc = options.document || (host && host.ownerDocument) || root.document;
    const getPlayerPosition = options.getPlayerPosition;
    if (!host || !doc || !runtime || typeof runtime.getState !== 'function' ||
        typeof runtime.interact !== 'function' || typeof getPlayerPosition !== 'function') {
      throw new Error('Interaction UI requires a root, document, interaction runtime, and player-position provider.');
    }

    let destroyed = false;
    let signature = '';
    let promptButton = null;
    let firstTopicButton = null;
    let previousFocus = null;

    function node(tag, className, value) {
      const el = doc.createElement(tag);
      if (className) el.className = className;
      if (value !== undefined && value !== null) el.textContent = String(value);
      return el;
    }
    function button(label, className, handler, ariaLabel) {
      const el = node('button', className, label);
      el.type = 'button';
      el.textContent = String(label);
      if (ariaLabel) el.setAttribute('aria-label', ariaLabel);
      el.addEventListener('click', handler);
      return el;
    }
    function activate(intent) {
      const position = getPlayerPosition();
      if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return;
      runtime.interact(position, intent);
      render(runtime.getState());
    }
    function renderPrompt(nearby) {
      const section = node('section', 'ss-interaction-ui__prompt');
      section.setAttribute('aria-label', 'Nearby interaction');
      const label = node('span', 'ss-interaction-ui__eyebrow', nearby.type === 'character' ? 'PERSON' : 'NEARBY');
      const title = node('strong', 'ss-interaction-ui__target', nearby.prompt || nearby.name || 'Interact');
      const hint = node('span', 'ss-interaction-ui__hint', 'E');
      const actions = node('div', 'ss-interaction-ui__actions');
      const actionLabels = {
        sleep:'Rest',study:'Study', 'buy-meal':'Buy a meal','talk-vendor':'Talk to Mama Njeri',
        'print-notes':'Print notes','bind-assignment':'Bind assignment','attend-lecture':'Attend lecture',
        'ask-question':'Ask a question',socialize:'Socialise','meet-friend':'Meet a friend',
        'talk-roommate':'Talk to roommate','lab-session':'Use the data lab','work-on-project':'Work on project',
        'borrow-book':'Borrow a book','join-club':'Join a club','join-study-circle':'Join the study circle','work-shift':'Start a work shift',
        'travel-campus':'Travel to campus','travel-city':'Travel to the city','check-phone':'Open student phone',talk:'Talk'
      };
      const choices = Array.isArray(nearby.actions) ? nearby.actions : [];
      choices.forEach(function(actionKey,index){
        const action = button(actionLabels[actionKey] || actionKey.replace(/[-_]/g,' '), 'ss-interaction-ui__button', function(){
          activate({interactPressed:true,interaction:actionKey});
        }, (actionLabels[actionKey] || actionKey) + ' at ' + (nearby.name || 'nearby target'));
        if(index===0){action.appendChild(hint);promptButton=action;}
        actions.appendChild(action);
      });
      if(!choices.length){
        const action = button('Interact', 'ss-interaction-ui__button', function(){activate({interactPressed:true});}, 'Interact with ' + (nearby.name || 'nearby target'));
        action.appendChild(hint);actions.appendChild(action);promptButton=action;
      }
      section.appendChild(label);
      section.appendChild(title);
      section.appendChild(actions);
      host.appendChild(section);
    }
    function renderDialogue(dialogue) {
      const backdrop = node('section', 'ss-interaction-ui__dialogue');
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-label', 'Conversation with ' + dialogue.characterName);
      const panel = node('div', 'ss-interaction-ui__panel');
      const header = node('header', 'ss-interaction-ui__header');
      const monogram = node('div', 'ss-interaction-ui__monogram',
        dialogue.groupScene ? 'SC' : String(dialogue.characterName || '?').trim().split(/\s+/).map(function (part) { return part.charAt(0); }).join('').slice(0, 2).toUpperCase());
      monogram.setAttribute('aria-hidden', 'true');
      const speaker = node('div', 'ss-interaction-ui__speaker');
      const speechState = dialogue.speech && dialogue.speech.status === 'speaking' ? 'VOICE · LIP-SYNC ACTIVE' : dialogue.speech && dialogue.speech.status === 'paused' ? 'VOICE PAUSED' : 'IN CONVERSATION';
      speaker.appendChild(node('span', 'ss-interaction-ui__eyebrow', dialogue.groupScene ? 'GROUP SCENE · ' + speechState : speechState));
      speaker.appendChild(node('h2', 'ss-interaction-ui__name', dialogue.sceneTitle || dialogue.characterName));
      if (dialogue.participants && dialogue.participants.length) speaker.appendChild(node('span', 'ss-interaction-ui__participants', dialogue.participants.map(function (person) { return person.name; }).join(' · ')));
      const close = button('×', 'ss-interaction-ui__close', function () {
        activate({ closeDialogue: true });
      }, 'Close conversation');
      header.appendChild(monogram);
      header.appendChild(speaker);
      header.appendChild(close);

      const transcript = node('div', 'ss-interaction-ui__transcript');
      transcript.setAttribute('aria-live', 'polite');
      const entries = Array.isArray(dialogue.historyEntries) ? dialogue.historyEntries : (Array.isArray(dialogue.history) ? dialogue.history.map(function (line) { return { speakerName: dialogue.characterName, text: line }; }) : [{ speakerName: dialogue.characterName, text: dialogue.line }]);
      entries.forEach(function (entry, index) {
        const turn = node('article', 'ss-interaction-ui__turn' + (index === entries.length - 1 ? ' is-current' : '') + (entry.speakerId === 'jay' ? ' is-player' : ' is-npc'));
        turn.appendChild(node('span', 'ss-interaction-ui__turn-speaker', entry.speakerName || dialogue.characterName));
        turn.appendChild(node('p', 'ss-interaction-ui__line', entry.text || ''));
        if (entry.expression) turn.setAttribute('data-expression', entry.expression);
        transcript.appendChild(turn);
      });
      const choices = node('div', 'ss-interaction-ui__choices');
      choices.setAttribute('aria-label', 'Conversation topics');
      (dialogue.choices && dialogue.choices.length ? dialogue.choices : (dialogue.topics || []).map(function (topic) { return { id: topic, label: topic.replace(/[-_]/g, ' ') }; })).forEach(function (item, index) {
        const choice = button(item.label || item.id, 'ss-interaction-ui__choice', function () {
          activate({ topic: item.id });
        });
        choices.appendChild(choice);
        if (index === 0) firstTopicButton = choice;
      });
      const footer = node('footer', 'ss-interaction-ui__footer');
      footer.appendChild(node('span', 'ss-interaction-ui__hint-text', dialogue.choices && dialogue.choices.length ? (dialogue.groupScene ? 'Choose how Jay contributes to the group' : 'Choose a topic to continue') : 'You have reached the end of this conversation for now.'));
      footer.appendChild(button('End conversation', 'ss-interaction-ui__end', function () {
        activate({ closeDialogue: true });
      }));
      panel.appendChild(header);
      panel.appendChild(transcript);
      panel.appendChild(choices);
      panel.appendChild(footer);
      backdrop.appendChild(panel);
      host.appendChild(backdrop);
      if (firstTopicButton && typeof firstTopicButton.focus === 'function') firstTopicButton.focus();
    }
    function render(state) {
      if (destroyed) return;
      state = state || runtime.getState();
      const nearby = state.nearby || null;
      const dialogue = state.dialogue || null;
      const nextSignature = JSON.stringify({
        nearby: nearby && { type: nearby.type, id: nearby.id, name: nearby.name, prompt: nearby.prompt },
        dialogue: dialogue && { characterId: dialogue.characterId, characterName: dialogue.characterName, sceneId: dialogue.sceneId, sceneTitle: dialogue.sceneTitle, groupScene: dialogue.groupScene, participants: dialogue.participants,
          line: dialogue.line, topics: dialogue.topics, choices: dialogue.choices, history: dialogue.history, historyEntries: dialogue.historyEntries, speech: dialogue.speech && { status: dialogue.speech.status, viseme: dialogue.speech.viseme } }
      });
      if (nextSignature === signature) return;
      signature = nextSignature;
      while (host.firstChild) host.removeChild(host.firstChild);
      promptButton = null;
      firstTopicButton = null;
      host.classList.toggle('is-active', !!(nearby || dialogue));
      if (dialogue) renderDialogue(dialogue);
      else if (nearby) renderPrompt(nearby);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape' && runtime.getState().dialogue) {
        event.preventDefault();
        activate({ closeDialogue: true });
      }
    }
    doc.addEventListener('keydown', onKeyDown);
    function refresh() { render(runtime.getState()); }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      doc.removeEventListener('keydown', onKeyDown);
      while (host.firstChild) host.removeChild(host.firstChild);
      host.classList.remove('is-active');
      promptButton = null;
      firstTopicButton = null;
    }
    render(runtime.getState());
    return Object.freeze({ render: render, refresh: refresh, destroy: destroy });
  }

  root.SemesterInteractionUI = Object.freeze({ create: create });
})(typeof window !== 'undefined' ? window : globalThis);
