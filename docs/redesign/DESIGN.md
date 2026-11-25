# GiveGigsGames — design system

Convio project `prj_b37e618efcf1c6b12ae2` · stage 2 output.
Direction: the site's own brand. Art first, chrome quiet.

## Principles

1. **The artwork is the interface.** Covers carry the page; the frame around them stays near-black, hairline-thin and quiet.
2. **One loud thing.** Colour appears in the game art, the Play action and the brand mark. Everything else is ink on dark.
3. **Chrome is earned.** A pill, a badge, an icon row or a label has to answer a question the visitor already has. Genre, players and size are one muted line.
4. **Calm frame, loud art.** The backdrop is two soft blooms and grain, painted once. No grids, beams or per-frame filters.
5. **Type does the hierarchy.** Space Grotesk for names and actions, the system sans for reading. Sentence case; no tracked caps.

## Tokens (`site.css` `:root`)

| Token | Value | Use |
| --- | --- | --- |
| `--page` | `#0c0d10` | page ground |
| `--panel` | `#141519` | cards, panels |
| `--card` | `#1a1c22` | raised card |
| `--hover` | `#23252c` | hover surface |
| `--line` | `#272932` | hairline borders |
| `--text` | `#f4f5f7` | primary ink |
| `--muted` | `#a9b0ba` | secondary ink |
| `--subtle` | `#7f8794` | meta ink |
| `--brand` | `#5865f2` | blurple, focus, selected |
| `--brand-hover` | `#4752c4` | brand hover |
| `--brand-soft` | `#c7cbff` | brand-tinted ink |
| `--play` | `#2ebd6b` | play action |
| `--play-hover` | `#26a95e` | play hover |
| `--play-ink` | `#04140a` | text on play |
| `--violet` / `--pink` | `#a855f7` / `#eb459e` | art-adjacent accent only |

Type: `--font-display` Space Grotesk (self-hosted, 22 KB, preloaded) for headings, buttons, card titles; `--font-sans` system stack for body copy and meta.
Scale: hero `clamp(30px, 5.4vw, 54px)`, page title 28–34px, section head 20px, card title 17px, meta 12.5px, body 15px.
Radius: 16px cards, 18px hero, 10px buttons, pill only for the play chip.
Motion: 0.14–0.16s ease for state, 0.45–0.55s for content; transform and opacity only; all disabled under `prefers-reduced-motion`.

## Components

- **Button** — Space Grotesk 700, 10px radius, 44px tall. `primary` solid blurple, `play` solid green with dark ink, `secondary` on `rgba(255,255,255,.06)` with a hairline. Hover darkens/brightens one step; `:active` presses 1px; `:focus-visible` 2px blurple outline.
- **Game card** — 16:9 cover, no border on the art; the *cover is the play link*; a 34px play chip sits bottom-right and turns green on hover/focus; the favourite heart is the only other control on the art. Body: title (17px) linking to the game's details page, then one muted line: genre, players, size. Hover crossfades the game's own screenshots; nothing scales.
- **Hero** — full-bleed art with a left-and-bottom scrim, copy anchored bottom-left, one genre word in the meta line, Play + Details, dots and a pause control at the foot. Auto-advance pauses on hover, on focus and via the pause button.
- **Ticker** — one quiet band of game names at 13px sentence case, 4px brand dot, pauses on hover.
- **Section head** — 20px Space Grotesk, no bar, no eyebrow; the count sits opposite.
- **Tags** — sentence case, 11px, quiet surface, no uppercase, no tracking.

## Rules that follow from the audit

- One card = three tab stops (cover, title, favourite), never four.
- Grid: 1 up to 767, 2 from 768, 3 from 1024 and up. Rows: 86% phone, 300px tablet, 344px desktop.
- Body copy ≥15px; meta ≥12px; nothing under 11px.
- No horizontal overflow and no sideways pan from 320px up.
