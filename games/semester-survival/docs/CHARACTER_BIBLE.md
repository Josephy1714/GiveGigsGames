# Character Bible

## Visual identity rules
- Every recurring character has a signed-off model sheet before runtime animation: front, three-quarter, profile, back, expression range, outfit details, palette swatches and height comparison.
- Keep head/body ratio, eye placement, jaw shape, hair silhouette, skin palette, outfit seams and accessories consistent across every view and frame.
- Use a controlled hand-drawn anime line style with clean silhouette design, intentional cel shading and restrained highlights. Avoid glossy plastic skin, random gradients, over-rendered pores and inconsistent facial features.
- Hands are posed intentionally. Simplify a silhouette rather than inventing unreadable fingers.
- Each character must remain recognizable at gameplay camera scale and in a small dialogue portrait.
- Character art is authored as layered production artwork first, then exported to runtime atlases. A single generated illustration or concept sheet is not a finished animated character.

## Player character — locked design baseline
- Role: first-year Kenyan university student; adult, approximately 18–22.
- Build: lean, active, natural student proportions; not exaggerated superhero anatomy.
- Appearance baseline: deep brown skin, short textured natural curls, expressive dark eyes and a distinct, readable hair silhouette.
- Everyday outfit baseline: open deep-blue overshirt over a warm-white T-shirt, dark practical trousers, worn-in sneakers, dark backpack and a simple wristwatch.
- Silhouette priorities: hair, open overshirt, backpack and sneaker profile must remain identifiable in front, side and rear views.
- Personality conveyed through acting: observant, ambitious, sometimes tired or uncertain, warm with trusted friends. Do not lock the player into one emotional response or dialogue personality.
- Customization may change approved palette/outfit variants, but must not break the base rig, pivots, collision shape or animation timing.

## Deferred character maturity system
Character maturity and visible age progression from first year through fourth year are explicitly deferred until the core premium game has been completed and accepted. The initial production build uses one consistent base-protagonist identity and does not simulate age, facial maturation, body-proportion changes or year-based redesign. When scheduled as a separate milestone, maturity must be designed as a coherent four-year visual progression with approved model sheets, wardrobe evolution, animation compatibility and story justification. Do not implement partial or automatic ageing in the current build.

## Runtime character asset requirements
Each playable character needs:
- Clean turnaround and proportion guide.
- Neutral, happy, amused, embarrassed, worried, frustrated, angry, surprised, focused and exhausted expression references.
- Idle, walk, jog, sprint, start, stop, turns, jump phases, slide phases, land, stumble, interact, sit, study and rest animation coverage.
- Consistent pivot points, ground contact line, frame bounds and export scale.
- Separate layers or masks for body, hair, clothing and accessories wherever secondary motion is required.
- Transparent exports with no baked background, captions, labels or interface elements.

## Initial supporting cast roles
- Roommate: practical, friendly and occasionally blunt; provides residence context.
- Coursemate: study partner with their own schedule and priorities.
- Food vendor: township service character; prices and stock stay consistent.
- Class representative: communicates deadlines, notices and group-work opportunities.
- Lecturer: appears in academic spaces; dialogue is concise and role-appropriate.

Names, biographies, relationships and final model sheets must be authored before final dialogue implementation. Never randomly rename a character between scenes.

## Dialogue and acting
Choices should express distinct human intentions, not paraphrases. Avoid stereotypes. Relationship changes come from authored actions and are stored explicitly.
- Mouth shapes and facial acting must match the delivered line and emotion.
- Closed-mouth idle is the default; no random lip movement.
- Body language supports the spoken intention without looping the same gesture.
- Dialogue portraits and in-world models must represent the same character design.

## Approval gate
A character is not marked production-ready until the turnaround, expression sheet, runtime animation set, export settings and in-game scale test have all been reviewed together. A concept image alone does not pass this gate.
