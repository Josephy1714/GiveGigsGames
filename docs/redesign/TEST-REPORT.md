# Test report — GiveGigsGames showcase redesign

Stage 4 (Test) · project `prj_b37e618efcf1c6b12ae2`

Build under test: static HTML/CSS/JS from `repo/`, served at `/ggg/`, `/models/`, `/tester/`.
Preview: https://ggg-showcase-preview.tangible-bracket.workers.dev (temporary Cloudflare account,
claim link handed over separately, expires 60 minutes after creation).

## Result

| Area | Result |
| --- | --- |
| Accessibility (axe-core 4.10.2, WCAG 2.1 AA ruleset) | **0 violations** on `/ggg/`, `/models/`, `/tester/` |
| Responsive 360 / 390 / 768 / 1024 / 1440 / 1920 | 0 px horizontal overflow, 0 horizontal panning, no control under 44 px |
| Cumulative Layout Shift | **0.00** on `/ggg/` at 360 / 390 / 1440 (was 0.42 mobile, 0.19 desktop) |
| Largest Contentful Paint | 0.75–1.07 s, cold cache, throttled-free local run |
| Internal links | 28 URLs across the three pages: 28 × HTTP 200 |
| Keyboard | full tab path, inspector opens and closes with Esc, favourites toggle and persist |
| Reduced motion | ticker and hero drift animations resolve to `none` |
| Console | no site errors on the preview; one 404 for Vercel's analytics script, which only exists on Vercel |

## Journeys

1. **Scan the library** — hero art, title, blurb, genre and control count read top to bottom; 56 cards render.
2. **Play from a card** — cover image is the play link → `/ggg/play/<slug>` (200).
3. **Read about a game** — card title → `/ggg/info/<slug>` (200).
4. **Hover a card** — screenshot preview loads; no layout movement.
5. **Favourite** — `aria-pressed` flips to `true`, survives reload, toggles back off.
6. **Search** — "17 games of 56" for a partial term; empty state copy is intact.
7. **Filters** — genre, players, size combine; the count and the grid agree.
8. **List / grid toggle** — both views keep the same 3 tab stops per card.
9. **Hero transport** — dots, previous/next and the pause button work; pause swaps to the play icon and sets `aria-pressed="true"`.
10. **Ticker** — pauses on hover and focus, links resolve.
11. **Models** — 83 cards in a 3-up grid, Inspect 3D opens the WebGL inspector, Esc closes it with no focus trap leak.
12. **Copy code** — copies the standalone function (unchanged from before the redesign).
13. **Devtools** — library list, filters, console and preview frame still boot; invalid URLs fall back to the error line.
14. **Deep links** — `/ggg/play/<slug>`, `/ggg/info/<slug>` and a missing slug (404 page) behave.
15. **Save data** — existing localStorage save format untouched; progress panel reads the same keys.

## Fixes made during this stage

- Filled brand buttons failed AA contrast on the model cards (4.22:1): `--brand-fill` (#4450c9) with white text now passes, 83 instances cleared.
- `#selected-tag-count` was 3.69:1 — now `var(--brand-soft)`.
- Model card headings skipped from `h2` to `h3` — card titles are now `h2` under the page `h1`.
- **Layout shift (0.42 mobile / 0.19 desktop):** the hero body, hero dots and ticker now reserve their final height, and the hero copy entrance animates with a clip-path mask instead of a translate. The document stays hidden behind a dark canvas until the catalog renders, with a 2.5 s safety release, so the first paint is the finished page. CLS is now 0.
- **Broken shared gamepad script:** `index.html` loaded `games/_shared/gamepad-adapter.js` relatively, which resolved to `/ggg/games/...` (404 in production too). Now absolute.
- Missing favicon: all three pages declare an inline GG-mark SVG icon.
- Devtools page had no meta description and no boot gate; both added (its CLS is no longer reported).
- The devtools page now releases the boot gate after its synchronous render.

## Gaps

- No Chrome or Firefox binary in the workspace, so **no Lighthouse, no Firefox/WebKit runs** — the numbers above come from Chromium via the chat browser and from the Convio browser service, which is also Chromium.
- Tap-target and overflow checks are programmatic (bounding boxes), not a motor-impairment usability study.
- WebGL inspector was exercised on the preview only; GPU warnings in the console come from the headless software renderer, not from the page.
- The temporary preview sits behind Cloudflare's bot check for some clients; a real browser may show "Performing security verification" before the page.
- `npm run check` still reports the pre-existing stale `games/catalog-data.js`; the catalog is intentionally not regenerated.
