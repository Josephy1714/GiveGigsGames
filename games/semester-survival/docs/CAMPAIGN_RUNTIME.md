# Campaign and objective runtime

## Integration

Load `campaign-runtime.js` after `world-content.js` and `life-systems.js`.

```js
const campaign = SemesterCampaignRuntime.create({
  world: SemesterWorldContent,
  lifeEngine,
  onEvent: event => {
    // Feed objective/chapter events into the phone, journal and mission HUD.
    gameEventBus.emit(event);
  }
});

// Forward domain events from the interaction runtime:
const interaction = SemesterInteractionRuntime.create({
  world: SemesterWorldContent, environment, renderer, lifeEngine,
  onEvent: event => campaign.recordEvent(event)
});

// Also forward travel, assessments, and supported phone actions:
campaign.recordEvent({ type: 'travel', destination: 'campus' });
campaign.recordEvent({ type: 'assessment:submitted', assessment: 'cat', courseIndex: 0 });
campaign.recordEvent({ type: 'budget:reviewed' });
```

The campaign runtime owns ordered chapter progression and a separate versioned local save. It never silently completes a chapter: only matching authored events advance a step. Multi-count objectives, alternative triggers, ordered chapter unlocks, semester synchronization, persistence, and completion events are supported.

## Event contract

Events are plain objects with a stable `type` plus domain fields. Examples include `interaction:completed` with `activity` or `action`, `dialogue:opened` with `characterId`, `dialogue:topic` with `characterId` and `topic`, `travel` with `destination`, `assessment:submitted` with `assessment`, and explicit phone milestone events such as `budget:reviewed`, `portfolio:published`, `internship:applied`, or `journal:reflection`.

Phone milestone events must only be emitted after the player actually completes that action. They are not automatic shortcuts.

## Design boundaries

- All eight semesters use authored chapter objectives; the campaign is not a generic endless quest list.
- Each chapter unlocks only after its required steps are satisfied.
- The life simulation remains authoritative for cash, condition, academic records and time.
- Assessment and budget milestones must be forwarded by the host after their authoritative action succeeds.
- The system is data-driven and can feed a mission HUD, journal, phone and future story-choice system.
- This runtime is not yet connected to the original entrypoint or a production scene loop.
