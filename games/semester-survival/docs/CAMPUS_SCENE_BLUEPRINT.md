# Campus Scene Blueprint

This is the first district-specific 2.5D layout contract for University Campus. It is a production handoff for environment artists and level designers, **not a finished scene**. Coordinates are a first-pass design grid and must be checked against the approved paintover before any production manifest is generated.

## Visual quality target

Use the two user-supplied campus references as quality guidance: the first demonstrates a landscaped institutional courtyard with layered trees, planted beds, benches, warm natural light and cinematic depth; the second demonstrates a contemporary academic walkway with glass façades, a strong vanishing point, ordered trees, seating, noticeboards and a crisp polished anime-background finish. These are references, not assets to copy. The game campus must read as a credible Kenyan university environment, not a Japanese campus: do not reproduce Japanese signage, cherry blossoms or ungrounded foreign architecture. Maintain a premium anime environmental finish while grounding buildings, vegetation, signage and daily details in the game's Kenyan setting.

## Locked scene footprint

- Design world: 3840 × 1080 units.
- Camera viewport: 960 × 540 units; horizontal camera travel spans 0–2880.
- Ground plane: y=850; depth range: -160 to +160; depth scale: 0.58.
- Player horizontal bounds: x=80 to 3760.
- Retain 2.5D side-on exploration: horizontal travel, independent depth movement, camera follow and authored perspective.

## Campus route

The proposed west-to-east campus spine is:

1. Main gate and noticeboard.
2. Main lecture hall.
3. University library.
4. Computer and data lab.
5. Student commons.
6. Student administration.
7. Lecturer offices.

The navigation graph connects those nodes in sequence, with authored branches for Wanjiku near the gate/lecture area, Amina near the library, and Dr. Mwangi near lecturer offices. NPC anchors are route-planning targets; no actor artwork, exact world position or movement is fabricated by this blueprint.

## Artist deliverables

- Three separately authored continuous layers: background, midground and foreground.
- Architecture and landmarks must remain spatially consistent across morning, midday, late-afternoon and night lighting.
- Distinct readable signage for every campus service.
- Foreground foliage and furniture must not obscure critical navigation or NPC silhouettes.
- Paint the walkable ground/depth plane clearly. The artist and level designer must review every proposed hotspot against the final paintover.
- Supply final dimensions, measured bytes, creator, licence and source records for every asset. The current asset pipeline still rejects missing or uncredited art.
- Weather and time-of-day overlays are atmospheric additions; they must not change building geometry or prop identity.

## Interaction and traversal contract

The machine-readable blueprint defines seven existing world places, three NPC anchors, a connected navigation graph, initial spawn points, two collision boundaries and three movement zones. All hotspot rectangles, collider geometry and zone extents are provisional until reviewed against the final illustration. Do not copy them into a production scene manifest without that review.

## Readiness

The blueprint deliberately reports artwork not supplied and runtime not ready. It contains no asset paths and does not create a playable campus. The next integration gate is approved human-authored layered artwork, followed by paintover alignment, final hotspot/collision review, local asset credits, browser preview and runtime QA.
