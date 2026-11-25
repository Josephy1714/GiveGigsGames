# TEST-PLAN — GiveGigsGames showcase redesign

Convio project `prj_b37e618efcf1c6b12ae2` · stage 4.
Site under test: `/ggg/` (library), `/ggg/info/<slug>` (details), `/ggg/play/<slug>` (game), `/models/`, `/tester/`.
Preview: local preview server mirroring `vercel.json` rewrites, port 3000, shown through the Cloud browser.

## Journeys

| # | Journey | Happy path | Edge cases | Correct looks like |
| - | ------- | ---------- | ---------- | ------------------ |
| 1 | Land and browse the featured shelf | Load `/ggg/`, hero shows a game with art, title, one-line blurb, Play, Details, dots, pause | no featured games (catalog fallback), broken screenshot (falls back to capsule), very long title | hero fits at 1280×800, art fills, no clipped text |
| 2 | Play a featured game | Click hero Play | keyboard Enter on Play | navigates to `/ggg/play/<slug>` |
| 3 | Rotate the featured shelf | Prev / next / dots change the slide | pause stops rotation; hover pauses; reduced motion never rotates | aria-current moves, copy changes with each slide |
| 4 | Search the library | Type "grave" | no results, one-character query, accented/short words | count reads "N games of 56", empty state offers Clear filters |
| 5 | Filter | Open Filters, pick collection/input/mode/tag | several filters at once, no matches, clear all | chip row appears, grid re-renders, count updates |
| 6 | Favourite a game | Click the heart on a card | reload persists, remove favourite, favourites row appears | `aria-pressed` flips, `arcade:favorites` updates |
| 7 | Switch view | Grid ↔ list | reload keeps choice | list rows keep art, no clipped title |
| 8 | Open a game's details | Click a card title | back to library | `/ggg/info/<slug>` loads |
| 9 | Play from a card | Click a card cover | keyboard focus on cover | `/ggg/play/<slug>` loads |
| 10 | Hover preview | Hover a card with 3 shots | leave mid-cycle, reduced motion | second/third screenshot crossfade, then back |
| 11 | Settings and saves | Open Settings, download save backup | restore an invalid file | existing keys and file format unchanged |
| 12 | 3D models | Load `/models/`, filter by category, inspect a model | no results, escape closes the inspector | 3-up grid ≥1280, modal opens/closes |
| 13 | Developer tools | Load `/tester/`, enter a URL | empty URL, invalid URL, bad catalog game | error text appears, no crash |
| 14 | 404 | Load `/ggg/does-not-exist` | — | styled 404, not a stack trace |
| 15 | Accessibility | Tab through every page | reduced motion, 200% zoom | visible focus, no traps, Esc closes dialogs |

## Non-functional checks

- **Contrast**: body ≥4.5:1, large text and icons ≥3:1.
- **Tap targets**: ≥44×44 CSS px on every control at 380 px.
- **Overflow**: no horizontal scroll and no sideways pan at 360, 390, 768, 1024, 1440, 1920.
- **Performance**: LCP < 2.5 s, CLS < 0.1, no long tasks on scroll, frame rate on scroll.
- **Links**: every internal href on the three pages resolves.
- **Keyboard**: hero pause reachable and announced, dialogs close on Esc, focus returns.

## Out of scope

- Individual game folders (must not change).
- Catalog data regeneration (known stale-catalog check failure, pre-existing).
