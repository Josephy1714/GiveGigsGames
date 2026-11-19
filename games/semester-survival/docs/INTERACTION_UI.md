# Interaction UI

## Host integration

Load `interaction-ui.js` after `interaction-runtime.js`. Add a host-owned overlay element above the scene canvas and apply the `ss-interaction-ui` class. Load `interaction-ui.css` alongside the game styles.

```js
const interactionUI = SemesterInteractionUI.create({
  root: document.querySelector('#semester-interaction-ui'),
  interactionRuntime,
  getPlayerPosition: () => characterRuntime.getState().position
});

// During the host update, after interactionRuntime.refresh(playerPosition):
interactionUI.refresh();

// On teardown:
interactionUI.destroy();
```

The position provider must return finite world-space `x` and `y` coordinates. The UI calls the runtime for interactions; it does not own the simulation loop, movement, world state, or persistence.

## Behaviour and accessibility

- A contextual action appears only while the interaction runtime reports a nearby authored hotspot. It is a real button, usable by mouse, keyboard focus, or touch.
- NPC dialogue uses authored character names, introductions, topics and response history. No generated portrait or fabricated relationship score is shown; a restrained monogram is used until an owned portrait asset is loaded.
- Topic buttons and close controls have semantic labels. Dialogue is announced through a polite live region, and Escape closes an open conversation.
- All character-authored strings are inserted with `textContent`; the UI does not interpret dialogue as HTML.
- The UI can be destroyed cleanly and removes its document-level keyboard listener.

## Integration boundary

This module is ready for a future host scene, but is not wired into the original Semester Survival entrypoint. The production scene art, authored NPC hotspots, complete game loop and browser verification are still release gates.
