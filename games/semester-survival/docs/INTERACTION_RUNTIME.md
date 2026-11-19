# Interaction and Dialogue Runtime

## Purpose

`interaction-runtime.js` connects player proximity to authored world hotspots, place actions, NPC conversations, and life-system consequences. It never invents interaction coordinates: the scene renderer supplies the bounds for each authored hotspot.

## Dependencies

Create the runtime with:
- `world`: `SemesterWorldContent` or compatible authored world data.
- `environment`: current district state and `getPlaces()`.
- `renderer`: `getHotspotBounds(anchorId)` and `focusInteractable(anchorId)`.
- `lifeEngine`: `getState()`, `perform(activity)`, and optionally `recordRelationship(...)`.
- `inputManager`: optional `setContext()` for dialogue input locking.
- `npcAnchors`: per-district NPC anchor descriptors, each with `characterId` and authored `anchor`.

Example NPC anchor data (coordinates remain in the scene artwork/layout manifest):
```js
{
  township: [
    { characterId: 'njeri', anchor: 'mama-njeri-counter', radius: 72 }
  ],
  residence: [
    { characterId: 'brian', anchor: 'brian-courtyard', radius: 72 }
  ]
}
```

## Proximity and interaction

Call `refresh({x, y})` with the player's world-space position each simulation update. It finds the nearest authored place or NPC hotspot within the configured radius (72 world units by default). The returned prompt is contextual; no prompt is shown outside the radius.

Call `interact(position, intent)` with the same position and normalized input intent. `interactPressed` activates the nearest target. `interaction` can select an action such as `buy-meal` or `talk-vendor`. The runtime focuses the authored hotspot, then routes supported place actions to the life engine. Unsupported actions are explicitly reported rather than silently pretending to work.

Current activity mappings include sleep, study, meals, snacks, printing, lectures, consultation, socialising, assignments, work, and library study. Additional actions need an authored gameplay mapping before they are exposed as functional.

## Dialogue

NPC conversation data is sourced from `world.characters`. `openDialogue(characterId)` presents the authored introduction and topic list. `chooseTopic(topicKey)` returns the authored response and records a small affinity/trust consequence. `closeDialogue()` releases the dialogue input lock. The runtime does not fabricate dialogue lines.

Talk actions at the food kiosk, roommate space, and lecturer office can route into the corresponding authored character conversation. The host UI is responsible for rendering the returned dialogue state and topic choices.

## Relationship persistence

The life engine now stores relationships for Brian, Amina, Wanjiku, Mama Njeri, and Dr. Mwangi. `recordRelationship` applies bounded affinity/trust changes, records a relationship history event, and adds a journal entry. Existing version-1 saves are migrated by adding missing vendor/lecturer relationship slots without overwriting existing progress.

## Host update contract

The host calls `refresh(playerPosition)` during world updates and calls `interact(playerPosition, inputIntent)` when processing an interaction input. While a dialogue is open, pass a `topic` or `closeDialogue` intent. The runtime does not own the frame loop, UI, or save storage.

## Production boundary

NPC anchor descriptors and place hotspots must be authored for each final scene. Until a scene provides a valid hotspot and decoded art, the corresponding target is unavailable. The original game entrypoint remains unchanged until the full game replacement and browser verification are ready.

Closing a conversation clears the stale nearby-dialogue prompt. The host UI can then wait for the next proximity refresh before presenting another contextual action.
