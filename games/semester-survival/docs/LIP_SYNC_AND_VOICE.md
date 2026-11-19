# Dialogue Voice and True Lip-Sync Production

## What "real lip-sync" means here
The runtime synchronizes authored mouth-shape animation to the playback clock of the speaker's actual voice recording. It does not animate a mouth merely because dialogue text is on screen, and it does not guess visemes from words or frame elapsed time.

## Runtime contract
`lip-sync-runtime.js` receives:
1. A local, authored voice recording played by an injected audio player.
2. A dedicated approved mouth/face atlas animator.
3. An ordered cue track mapping audio timestamps to authored viseme clip names.

Every update samples `audio.currentTime` and selects the latest cue whose timestamp has been reached. Pausing/resuming the game pauses/resumes the voice; closing dialogue stops the voice and returns the mouth to neutral. Missing audio, mouth animator or viseme clips fail closed. Body locomotion animation remains independent from the mouth atlas.

## Required authored viseme set
Each speaking character needs a consistent neutral mouth plus approved mouth shapes sufficient for the dialogue language, at minimum:
- Closed lips: M, B, P.
- Open vowels: A, E, I, O, U.
- Teeth/lip contacts: F, V.
- Tongue and dental shapes: L, TH.
- Rest/transition shape for silence and breath.

These are visual categories, not one unique pose per letter. The voice director/animator should approve a language-appropriate mapping from phonemes to visemes and preserve each character's face identity, proportions and linework.

## Voice recording and cue authoring
Use human-performed, properly licensed voice recordings for each character. A dialogue line's cue timestamps must be aligned to the actual recording by a dialogue editor/phoneme-alignment workflow and reviewed by an animator. Do not derive cue timing from character count, text length or a generic metronome. Store each track as a safe relative local asset and include speaker, line/topic, language, sample rate, duration, author/performer and licence metadata in the production asset register.

## Current production status
The synchronization engine, interaction hooks, pause/resume/close lifecycle and validation tests are implemented. **There are currently no approved voice recordings, no completed per-character mouth atlases, and no authored viseme cue tracks in the game.** Therefore the released conversation experience is not yet audible or visibly lip-synced. The UI reports voice synchronization only when a supplied track is actively playing. A text-only fallback remains available until production assets pass approval.

## Quality gate
Do not mark a line "lip-synced" until its real voice recording, aligned cue track, approved face atlas and in-game playback have all been reviewed together at normal speed and under pause/resume conditions.
