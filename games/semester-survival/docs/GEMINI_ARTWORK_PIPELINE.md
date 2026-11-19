# Gemini Character Artwork Pipeline

## Goal

Create consistent anime character artwork in Gemini, transfer the exported files into this GitHub branch, and integrate approved art into the existing 2.5D game. The chat does not need image uploads. GitHub is the handoff point.

This pipeline treats Gemini output as a candidate, not an automatic final asset. The owner approves the model design and in-game result. Generated art must not be described as hand-drawn or human-commissioned.

## First character: Jay

Use the locked design in [CHARACTER_BIBLE.md](CHARACTER_BIBLE.md):
- Adult Kenyan university student, approximately 18–22.
- Deep brown skin, short textured natural curls, expressive dark eyes.
- Lean, active, natural student proportions.
- Open deep-blue overshirt over a warm-white T-shirt, dark practical trousers, worn-in sneakers, dark backpack and simple wristwatch.
- The four-year maturity redesign is deferred.

## Stage 1 — model turnaround

Generate one clean model sheet before any animation. Use the prompt below as the starting prompt; do not ask Gemini to redesign the character between views.

> Create a premium 2D anime production model sheet for Jay, an adult Kenyan university student aged 18–22. He has deep brown skin, short textured natural curls, expressive dark eyes, a lean natural student build, an open deep-blue overshirt over a warm-white T-shirt, dark practical trousers, worn-in sneakers, a dark backpack and a simple wristwatch. Show the exact same character in four full-body orthographic views: front, three-quarter, side profile and back, evenly spaced on one clean neutral light-grey background. All views must have identical height, head-to-body ratio, facial identity, hairstyle, skin tone, outfit construction, colours, seams, backpack and accessories. Professional hand-painted 2D anime game concept-art finish: confident clean linework, controlled cel shading, deliberate shapes, subtle painterly material detail, natural anatomy, expressive but believable face, beautiful intentional colour design. Crisp readable silhouette, consistent lighting, no 3D render, no photorealism, no glossy plastic skin, no random gradients, no bloom, no text, no labels, no logos, no watermark, no extra characters, no cropped feet or head. This is a design reference sheet, not a game sprite atlas.

Review the turnaround at full size. If any view changes the face, hair, clothing or proportions, regenerate/correct the model sheet before proceeding.

## Stage 2 — animation sheets

Generate one action per file, always referencing the approved Jay turnaround in Gemini if its interface supports image references. Keep the model, outfit, palette, camera scale, ground line and light direction identical.

For each action sheet, request:
- A transparent background (if supported); otherwise a single flat chroma-key background that does not occur in the character palette.
- An exact uniform grid, with every frame cell the same pixel width and height.
- No borders, gutters, panel labels, text, arrows, motion trails or scene backgrounds.
- Full character inside every cell, same scale and ground-contact baseline.
- Clear distinct poses with readable in-between motion; no duplicated frames.
- No camera changes or perspective changes between frames.

Create separate sheets for the initial integration slice: `idle`, `walk`, `jog`, `sprint`, `jump`, `land-soft`, `interact`. Add slide, dodge, sit, study, rest and talk after the first slice passes review. Do not ask Gemini to put all nineteen clips into one giant image.

Suggested starting grid: 4 columns × 2 rows for an 8-frame looping action; 4 columns × 2 rows for a short one-shot action. The final frame count, frame rate and crop coordinates are recorded in the clip manifest after the actual export is inspected. These are targets, not assumptions about Gemini's output.

## Stage 3 — file handoff

Keep untouched Gemini exports in:

```
games/semester-survival/assets/source/characters/jay/
  turnaround.png
  idle.png
  walk.png
  jog.png
  sprint.png
  jump.png
  land-soft.png
  interact.png
```

Use the same folder pattern for `amina`, `einstein`, `ernest` and `sumeya`. Do not upload a collage or a screenshot of the generated image; upload the original PNG export. Preserve the original resolution. If Gemini exports JPEG, ask for PNG with transparency before accepting it for a character atlas.

### Upload through GitHub

1. Open `Josephy1714/GiveGigsGames` in GitHub.
2. Switch to branch `semester-survival-premium-rebuild` — not `main`.
3. Open `games/semester-survival/assets/source/characters/jay/`.
4. Choose **Add file → Upload files**, select the exported PNGs, and commit directly to the feature branch.
5. Send the filenames or commit link in this chat. I can then inspect the repository paths, update the atlas/clip manifest and runtime integration, and report any failed validation.

If using GitHub on a phone makes folder navigation difficult, use the browser's desktop-site option or upload from the ThinkPad.

## Stage 4 — integration and acceptance

The current animation runtime consumes a single decoded character atlas plus authored clip rectangles. Therefore, separate action sheets are source inputs: integration must pack/crop them into a runtime atlas and generate exact clip metadata. Do not add raw source sheets to the live runtime manifest as if they were already a packed atlas.

For every source image, inspect:
- Actual pixel dimensions, alpha channel/background, file size and grid alignment.
- Character identity, costume continuity, anatomy, hands, face and silhouette across frames.
- Frame order, foot-contact timing, ground line, pivot and facing direction.
- No cell bleed, labels, borders, stray artefacts or accidental scene content.

Then create the packed atlas and clip manifest, add a credited local `character-atlas` asset, wire the character into the game, and test actual playback at gameplay scale. Only the user can approve the final appearance. A model sheet alone does not make a character production-ready.

## First delivery

Start with Jay's turnaround only. Once its face, hair, proportions and outfit are approved, generate Jay's seven initial animation sheets. Do not generate all five characters before the first complete character passes in-game review.
