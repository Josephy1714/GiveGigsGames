# Original Character Artwork Pipeline

## Purpose

This is the production workflow for the original Semester Survival cast. The character designs belong to the GiveGigsGames project. The project owner approves each canonical design before it guides animation and runtime integration.

## Jay — approved canonical design

Jay's four-view turnaround is approved and stored at:

`games/semester-survival/assets/source/characters/jay/1795073501939.jpg`

It establishes his front, three-quarter, side and rear appearance: deep brown skin, short textured natural curls, deep-blue overshirt, warm-white T-shirt, dark trousers, sneakers, backpack and wristwatch. Preserve this source file unchanged.

## Stage 1 — animation source sheets

Build one action per file, always using the approved Jay turnaround as the visual reference. Keep the same face, hair, proportions, outfit construction, palette, camera scale, ground line and lighting.

Initial action set:
- `idle.png`
- `walk.png`
- `jog.png`
- `sprint.png`
- `jump.png`
- `land-soft.png`
- `interact.png`

Each sheet must have:
- Transparent background, no labels, borders, captions or scene background.
- Exact uniform frame cells and documented row/column layout.
- Full character inside every cell, consistent scale and ground-contact baseline.
- Distinct readable poses, coherent in-betweens and no duplicated frames.
- Stable facing direction and clear foot contacts.
- Source resolution preserved.

Add slide, dodge, sit, study, rest, talk and expression coverage after the first animation slice passes review. Do not combine unrelated actions into one unstructured image.

## Stage 2 — repository handoff

Keep untouched source exports under:

```
games/semester-survival/assets/source/characters/<character-id>/
```

Use the existing Jay folder for Jay and the same folder pattern for Amina, Einstein, Ernest and Sumeya. Commit source files directly to `semester-survival-premium-rebuild`, never to `main`.

## Stage 3 — inspection and integration

The runtime animation system consumes one decoded character atlas plus exact authored clip rectangles. Separate action sheets are source inputs, not runtime atlases.

For every source file, inspect:
- Actual dimensions, format, alpha channel/background and byte size.
- Identity, anatomy, hands, face, silhouette and costume continuity.
- Frame grid, frame order, ground line, pivot, facing and timing.
- Cell bleed, borders, labels, stray marks and compression artefacts.

Then pack the source sheets into the runtime atlas, generate the exact clip manifest, add a credited local `character-atlas` asset, wire it to the character animator and test playback at actual gameplay scale.

Do not fabricate missing frames, invent crop rectangles or register a turnaround as an animation atlas. Missing or invalid art must fail closed.

## Approval gates

1. The project owner approves the canonical design reference.
2. Each animation sheet is inspected against that reference.
3. Atlas and clip metadata pass validation.
4. In-game playback, scale, foot contact and transitions are reviewed.
5. The project owner approves the final in-game appearance.

Jay's turnaround has passed gate 1. It does not by itself complete gates 2–5 or make Jay a fully animated production-ready character.
