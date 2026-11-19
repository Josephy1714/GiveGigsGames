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
