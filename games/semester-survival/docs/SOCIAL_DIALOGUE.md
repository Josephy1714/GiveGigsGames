# Social Dialogue and Relationship Choices

## Runtime contract
All dialogue text and choice data is authored in `world-content.js`. The interaction runtime does not improvise dialogue. A character may define `conversationChoices`; each choice has a stable `id`, player-facing `label`, authored NPC `response`, optional `expression`, optional relationship `requires` thresholds, and optional `effects` for affinity and trust.

Choices with unmet affinity/trust requirements are not shown. After a choice changes a relationship, the runtime re-evaluates the available choices so a conversation can naturally unlock a more personal branch. The runtime checks the requirement again at selection time; hidden or stale UI state cannot bypass a gate.

## Conversation presentation
Every selected option is recorded as a Jay turn, followed by the authored NPC response. The UI labels each speaker and records expression metadata for future approved facial-performance assets. Text is inserted with `textContent`; authored content is never treated as HTML.

## Voice and lip-sync
Voice tracks may be keyed by stable authored line ID under `voiceTracks[characterId].lines`. Legacy topic tracks remain a fallback. Audio-clock viseme playback still requires approved human recordings, cue tracks and character mouth atlases. Expression metadata is not a substitute for facial animation.

## Current scope and production status
Branching choice data is authored for Brian, Amina, Sumeya, Einstein, Ernest, Wanjiku, Mama Njeri and Dr. Mwangi. The player protagonist Jay remains the player-controlled speaker. This milestone implements dialogue logic and speaker-attributed text presentation; it does not create character portraits, animated facial acting, body blocking, two-shot cinematography or group-scene animation. Those require approved production artwork and animation assets.

## Quality gates
- Keep all dialogue authored, reviewed and consistent with each character's voice.
- Gate sensitive/personal branches on relationship state, not arbitrary time or fabricated events.
- Ensure choices have transparent, bounded relationship consequences.
- Preserve a usable text-only conversation when voice assets are absent.
- Do not claim visible lip-sync or cinematic character staging until the approved assets are integrated and tested.

## Authored group scene: The Study Circle

The campus Student Commons hosts a scheduled five-person revision gathering from 13:00 to 16:00 in game time. Amina, Sumeya, Einstein, Ernest and Wanjiku must all have matching authored schedule targets before the scene can open. The opening exchanges and two player-directed branches are authored in `world-content.js`; each branch records Jay's choice, five speaker turns and bounded affinity/trust outcomes for the participants. The group dialogue uses the same safe speaker-attributed transcript UI. Voice playback is intentionally not started for all five lines at once; proper sequential group voice requires a cue/turn playback queue and approved recordings.

The scene is a logic and text-interaction implementation. It does not imply that five visible actors, their blocking, facial acting, or group animation are production-ready. Those remain gated by authored navigation anchors, approved character artwork and animation integration.


## Conversation blocking and speaker focus

The interaction runtime now publishes a stage snapshot for both one-to-one and group conversations. It identifies the current speaker, expression metadata and every participant's speaking/listening role. The dialogue UI renders this as a live cast strip and updates focus as authored turns change. This is an interaction and blocking preview only: it uses text monograms, not character portraits, and does not claim facial animation, body acting, camera cuts or visible two-character staging. Those require approved layered character art, expression atlases, authored scene blocking coordinates and animation clips before the renderer can display them.
