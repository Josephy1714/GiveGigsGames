# Semester Survival — Production Documentation

This directory is the production source of truth. Implementation decisions must follow these documents; update the relevant document whenever implementation changes the design.

- GAME_DESIGN_DOCUMENT.md — experience, narrative, progression and scope.
- WORLD_BIBLE.md — districts, geography, traversal and activity density.
- DISTRICT_LAYOUTS.md — authored 2.5D geometry, place hotspots, NPC anchors and route arrival contracts.
- CHARACTER_BIBLE.md — cast, visual identity and continuity.
- ANIMATION_SPEC.md — locomotion, transitions and secondary motion.
- CONTROLS_AND_UX.md — keyboard, touch, interaction and accessibility.
- GAMEPLAY_SYSTEMS.md — academics, money, needs, relationships and dynamic seasonal weather.
- UI_ART_DIRECTION.md — HUD, phone, menus and feedback.
- TECHNICAL_ARCHITECTURE.md — runtime, modules, saves, weather and performance.
- CHARACTER_RUNTIME.md — movement, authored animation, camera and rendering orchestration.
- INTERACTION_RUNTIME.md — proximity, place actions, NPC dialogue and relationship consequences.
- INTERACTION_UI.md — contextual prompts, dialogue overlay, accessibility and host integration.
- CAMPAIGN_RUNTIME.md — eight-semester chapter objectives, event contract and persistence.
- ASSET_MANIFEST.md — source, ownership, licence, dimensions and package budget.
- OWNERSHIP_AND_CREDITS.md — authorship, attribution and rights.
- TESTING_AND_RELEASE.md — QA gates and release checklist.

## Non-negotiable principles
1. This is a university-life adventure/simulation, not an endless runner reskin.
2. University, residence, township and wider city are connected, purposeful places.
3. Movement communicates weight, anticipation, contact, momentum and recovery.
4. Character identity and proportions remain consistent across assets and scenes.
5. Every interface interaction has a real gameplay consequence.
6. The game runs offline without accounts, API keys or hidden network requests.
7. The complete game folder remains strictly below 10,000,000 bytes.
8. Never claim an asset is hand-drawn, animated or licensed unless its production/source supports that claim.
9. Mark prototypes clearly; do not present placeholders as finished content.

- STUDENT_PHONE.md — student phone, academic portal, registration, deadlines, inbox, notifications, finance ledger and host integration.
- GAME_RUNTIME.md — central browser lifecycle, frame loop, event bus, travel, UI composition and in-game-only coursework policy.
