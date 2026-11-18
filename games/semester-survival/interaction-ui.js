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
      const action = button('Interact', 'ss-interaction-ui__button', function () {
        activate({ interactPressed: true });
      }, 'Interact with ' + (nearby.name || 'nearby target'));
      action.appendChild(hint);
      section.appendChild(label);
      section.appendChild(title);
      section.appendChild(action);
      host.appendChild(section);
      promptButton = action;
    }
    function renderDialogue(dialogue) {
      const backdrop = node('section', 'ss-interaction-ui__dialogue');
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-label', 'Conversation with ' + dialogue.characterName);
      const panel = node('div', 'ss-interaction-ui__panel');
      const header = node('header', 'ss-interaction-ui__header');
      const monogram = node('div', 'ss-interaction-ui__monogram',
        String(dialogue.characterName || '?').trim().split(/\\s+/).map(function (part) { return part.charAt(0); }).join('').slice(0, 2).toUpperCase());
      monogram.setAttribute('aria-hidden', 'true');
      const speaker = node('div', 'ss-interaction-ui__speaker');
      speaker.appendChild(node('span', 'ss-interaction-ui__eyebrow', 'IN CONVERSATION'));
      speaker.appendChild(node('h2', 'ss-interaction-ui__name', dialogue.characterName));
      const close = button('×', 'ss-interaction-ui__close', function () {
        activate({ closeDialogue: true });
      }, 'Close conversation');
      header.appendChild(monogram);
      header.appendChild(speaker);
      header.appendChild(close);

      const transcript = node('div', 'ss-interaction-ui__transcript');
      transcript.setAttribute('aria-live', 'polite');
      const history = Array.isArray(dialogue.history) ? dialogue.history : [dialogue.line];
      history.forEach(function (line, index) {
        const paragraph = node('p', 'ss-interaction-ui__line' + (index === history.length - 1 ? ' is-current' : ''), line);
        transcript.appendChild(paragraph);
      });
      const choices = node('div', 'ss-interaction-ui__choices');
      choices.setAttribute('aria-label', 'Conversation topics');
      (dialogue.topics || []).forEach(function (topic, index) {
        const choice = button(topic.replace(/[-_]/g, ' '), 'ss-interaction-ui__choice', function () {
          activate({ topic: topic });
        });
        choices.appendChild(choice);
        if (index === 0) firstTopicButton = choice;
      });
      const footer = node('footer', 'ss-interaction-ui__footer');
      footer.appendChild(node('span', 'ss-interaction-ui__hint-text', 'Choose a topic to continue'));
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
        dialogue: dialogue && { characterId: dialogue.characterId, characterName: dialogue.characterName,
          line: dialogue.line, topics: dialogue.topics, history: dialogue.history }
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
