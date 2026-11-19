# Jay source artwork intake

All uploaded source images are preserved in `assets/source/characters/jay/`. This inventory was updated after opening the actual repository image bytes, not just trusting filenames. The source files are not yet runtime-ready.

## Canonical reference

| File | Verified role | Status |
|---|---|---|
| `1795073501939.jpg` | Four-view Jay turnaround | 1376×768 JPEG; project-owner approved design reference; not an animation sheet |

## Visually inspected action sheets

| File | Verified action | Initial review |
|---|---|---|
| `1795074192816.jpg` | Idle / blink | 1376×768 JPEG; 4-frame horizontal strip; useful idle variation. |
| `1795074517333.jpg` | Walk | 1376×768 JPEG; 4×2 sheet; readable walk cycle and consistent outfit. Foot contacts and loop seam still need review. |
| `1795074841200.jpg` | Jog | 1376×768 JPEG; 4×2 sheet; readable jog cycle. Check frame ordering, stride continuity and loop seam before approval. |
| `Meta_AI_sprint_20261119_110406.jpg` | Sprint | 2240×1120 JPEG; 4×2 sheet; energetic pose. Hair silhouette changes noticeably between frames; flag for identity-continuity review before runtime approval. |
| `Meta_AI_916951766_1841479800241068_9219361324369617113_n_20261119_110911.webp` | Standing vertical jump and landing | 2240×1120 JPEG bytes (despite the `.webp` suffix); 4×2 sheet. 4×2 sheet; shows crouch, airborne rise and recovery. Hair silhouette varies between frames; verify sequence order and landing pivot. |
| `Meta_AI_916811181_1450185383862546_3331141356748851519_n_20261119_111431.webp` | Running forward jump | 2240×1120 JPEG bytes (despite the `.webp` suffix); 4×2 sheet. 4×2 sheet; forward airborne poses are clear. Hair silhouette varies and the exact takeoff/landing sequence needs review. |
| `Meta_AI_916952132_1143042368122950_6500628437492435153_n_20261119_112204.webp` | Accidental fall | 2240×1120 JPEG bytes (despite the `.webp` suffix); 4×2 sheet. 4×2 sheet; fall impact and ground contact are readable. Keep separate from intentional jump and dodge actions. |
| `Meta_AI_916882119_2702665886828845_97200770314772330_n_20261119_112422.webp` | Get-up recovery | 2240×1120 JPEG bytes (despite the `.webp` suffix); 4×2 sheet. 4×2 sheet; floor/kneel-to-standing recovery is present. Verify the transition does not pop and that the final standing frame aligns with idle. |
| `Meta_AI_916882035_28451130907895002_8609570660650290104_n_20261119_115527.webp` | Greeting / wave | 2240×1120 JPEG bytes (despite the `.webp` suffix); 4×2 sheet. 4×2 sheet; expressive upper-body wave. Lower body is cropped, so use only for a compatible interaction pose, not full-body locomotion. |
| `Meta_AI_916882081_994725666517201_3357036583534970929_n_20261119_120922.webp` | Phone use | 2240×1120 JPEG bytes (despite the `.webp` suffix); 4×2 sheet. 4×2 sheet; phone interaction is readable. Upper-body framing means it needs a dedicated interaction anchor/pose rather than a full-body locomotion clip. |
| `Meta_AI_916953425_2325867808197235_9058160883401323934_n_20261119_121150.webp` | Sit-down / seated / stand-up | 2240×1120 JPEG bytes (despite the `.webp` suffix); 4×2 sheet. 4×2 sheet; sequence is understandable and identity is consistent. The seated pose has no visible chair, so it must be staged against an authored seat prop and aligned to its seat anchor. |

## Important file-format audit

The seven files whose names end in `.webp` were inspected at the byte-signature level. **All seven contain JPEG/JFIF data, not WebP data** (their decoded base64 begins with the JPEG signature). Their extensions therefore do not match their actual encoding.

- Keep the original uploads unchanged as source evidence.
- Do not serve those files as WebP or place them directly in a manifest as if they were WebP.
- During processing, decode the bytes as JPEG and export a correctly encoded runtime derivative with an honest extension/MIME type (for example, PNG with alpha after background removal).
- Verify every processed output by its actual file signature, decoded dimensions and successful browser load. Never fix a MIME mismatch by changing only the filename suffix.

The four timestamped JPEGs and sprint JPEG are JPEG sources. Measured source dimensions: turnaround/idle/walk/jog are 1376×768; the sprint and all seven action sheets with `.webp` suffixes are 2240×1120. Re-measure in the actual processing environment before packing; these dimensions do not establish exact per-frame crop rectangles.

## Current coverage and missing source clips

Present: idle, walk, jog, sprint, standing jump/landing, running jump, accidental fall, get-up recovery, greeting, phone use, and sit/stand.

Not yet present as a verified dedicated source sheet: dodge roll, slide start/loop/recovery, study, rest, talk and a full-body neutral interaction. The controller/runtime may require some of these clips; do not map an unrelated action to them or fake them with procedural poses. Keep the feature gated until approved source art exists.

## Background and alpha constraints

- The generator may return a flattened image with a solid white background rather than a transparent alpha channel. The white background is not part of the in-game character or environment.
- Remove white with a subject-aware matte. Jay's warm-white T-shirt, shoe highlights and pale fabric details must remain intact. A global white chroma-key is prohibited.
- Preserve each original. Processed derivatives belong in a separate runtime/processed directory and must be traceable to the source file.
- If a clean matte cannot be achieved without damaging the character, keep that derivative out of the runtime atlas and request a corrected export.

## Runtime integration gates

1. Measure actual pixel dimensions and inspect frame grids at full resolution.
2. Confirm frame count, cell boundaries, consistent character scale, ground line, facing and ordering.
3. Check anatomy, identity continuity, foot contacts and loop seams; reject malformed or duplicated frames.
4. Produce clean transparent derivatives and inspect their edges at 100%.
5. Pack approved frames into an atlas with stable pivots.
6. Author exact crop rectangles, FPS, playback mode, state mapping and optional frame-event markers.
7. Validate the manifest and test every clip in the 2.5D scene at gameplay scale.

A source image is not a runtime atlas. No guessed frame coordinates, synthetic replacement poses, procedural people or unreviewed source images may enter the production manifest. Missing clips must remain visible as integration errors.
