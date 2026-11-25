# Design audit — GiveGigsGames showcase

Convio project `prj_b37e618efcf1c6b12ae2` · stage 1 of 5
Screens: `audit-games-1280.png`, `audit-games-380.png`, `audit-models-1280.png`, `audit-devtools-1280.png`
All numbers below were measured in the Cloud browser against the running preview on 2026-11-24.

## Score

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3 | AA contrast passes everywhere measured; 298 focus stops on the library page (4 per card) |
| 2 | Performance | 3 | 53–60 fps scrolling after the backdrop was baked to one layer; the Models page creates 83 WebGL canvases |
| 3 | Theming | 2 | Tokens exist in `:root`, but the dark/kinetic layers hard-code ~40 literal colors |
| 4 | Responsive | 4 | 0 horizontal overflow and no sideways pan at 320–1280; every control ≥44 px |
| 5 | Implementation integrity | 3 | Coherent, product-specific system; legacy `index.css` / `play.css` still ship to four old pages |
| **Total** | | **15/20** | **Good — address the weak dimensions** |

## P1 — major

### 1. Models page draws 83 thumbnail canvases on one shared renderer (corrected)
- **Location**: `models/app.js` — one offscreen `THREE.WebGLRenderer` (`thumbRenderer`), 83 2D `.preview-canvas` cards
- **Category**: Performance
- **Impact**: **corrected after reading the source**: this is not 83 WebGL contexts. One WebGL context is shared and each card blits into a 2D canvas, so the cost is 83 sequential thumbnail draws and 83 2D canvases, not context thrash. It is a modest risk, not the P1 first reported.
- **Fix**: draw thumbnails lazily as cards approach the viewport (IntersectionObserver) and reuse one canvas size; no architectural change needed.

### 2. 298 tab stops on the library page
- **Location**: `index.js` `cardHTML` — title link, favourite button, Play link, Details link per card × 56 cards
- **Category**: Accessibility (keyboard)
- **Impact**: reaching the stylesheet-level footer takes ~300 Tab presses; most of those stops repeat the same destination. WCAG 2.4.3 is not failed, but the page is effectively unusable by keyboard.
- **Fix**: one tab stop per card (title link stretched over the card), Play as the primary action, favourite reachable from the card menu; drop the per-card Details stop.

## P2 — minor

### 3. Featured carousel advances with no explicit pause
- **Location**: `index.js` `startHero` / `#featured`
- **Category**: Accessibility / motion
- **Impact**: it pauses on hover and focus and is disabled under reduced motion, but a touch user has no way to stop an 8 s rotation while reading a long blurb.
- **Standard**: WCAG 2.2.2 (Pause, Stop, Hide)
- **Fix**: a pause/play control next to the dots, announced with `aria-pressed`.

### 4. Theming drift in the showcase layers
- **Location**: `site.css` — dark showcase + kinetic layers
- **Category**: Theming
- **Impact**: ~40 `rgba()`/hex literals bypass `:root`, so a palette change means hunting strings, and the same glow is spelled three ways.
- **Fix**: tokenise surfaces, glows, gradients and type colours; keep literals only inside `:root`.

### 5. Card labels at 10 px
- **Location**: `.gcard-meta .tag`, `.ticker-genre`
- **Category**: Type / accessibility
- **Impact**: passes AA contrast but 10 px uppercase is below comfortable reading size on a phone.
- **Fix**: 11 px with a touch more tracking.

## P3 — polish

- **Legacy stylesheets**: `index.css` and `play.css` still serve `game.html`, `ggg-guide.html`, `roadmap.html`, `play.html`; the showcase does not use them. Leave until those pages are rebuilt.
- **Duplicate ID scoping**: the games grid and the devtools grid are both `#game-grid`; already scoped with `.page-devtools`, worth renaming eventually.

## Positive findings

- Text contrast: card body 8.9:1, card title 17.8:1, muted meta 5.4:1, ticker genre 5.7:1.
- Landmarks and headings: one `h1`, ordered `h2`/`h3`, `main`/`nav`/`header`/`footer` present; every `img` has `alt`.
- Motion: `prefers-reduced-motion` disables the ticker, hero drift, card previews and shard drift; animations are transform/opacity only.
- Backdrop is painted once (no per-frame filters or full-screen layers) → 60 fps at 380 px, ~53 fps at 1280 px.
- Font is self-hosted and preloaded (22 KB), hero image is `fetchpriority="high"`, every other cover is lazy.
- No horizontal overflow and no sideways pan at 320/380/768/1280 on all three pages.

## Recommended commands

1. `/impeccable optimize` — models page canvases (P1).
2. `/impeccable adapt` — card keyboard model and one-stop-per-card (P1).
3. `/impeccable polish` — tokens, type sizes, pause control (P2).

## Set aside from the stage floor

The stage brief bans purple-to-blue gradients, glows and blurred orbs. The user's own brief for this site is "dark, chaotic, arcade glow", and the brand is blurple with a green Play action, so the brief wins: glows stay, but they are painted once and never animated per layer. Uppercase is limited to the genre pill and the ticker, both decorative labels.
