# Township Scene Blueprint

This is the first district-specific 2.5D layout contract for the student township. It is a level-design and environment-art handoff, **not a finished scene**. All coordinates are provisional until aligned to an approved human-authored paintover.

## Visual identity

The township should feel like a believable, lively Nairobi student neighbourhood. It is compact, practical, social and busy without becoming visually chaotic. Use detailed storefront construction, layered signage, pavement variation, street furniture, warm shop interiors and grounded neighbourhood details. Do not turn the setting into a generic foreign anime street or a poverty caricature.

## Scene footprint

- Design world: 3840 × 1080 units; camera viewport: 960 × 540.
- Ground plane: y=850; depth range: -170 to +170; depth scale: 0.58.
- Player bounds: x=70 to 3770; camera horizontal travel: 0 to 2880.
- Three authored layers: neighbourhood roofline/background, storefront and street midground, pavement and near props foreground.
- Lighting states: early morning, midday, late afternoon and night.

## Six destinations

1. **Mama Njeri's Food Kiosk:** serving counter, fictional menu board, sheltered customer area and seating.
2. **Print Hub:** cyber/print storefront, visible workstations, printer counter and paper supplies.
3. **Barber Shop:** distinctive frontage, mirror, chair and waiting bench.
4. **Corner Mini-Mart:** stocked shelves, entrance and delivery crates.
5. **Matatu Stage:** clear stage signage, sheltered waiting bay and safe pedestrian boarding edge.
6. **Study Café:** warm interior, tables and quiet student work area.

The route spine connects all six locations. Mama Njeri has a separate NPC anchor at her kiosk. This blueprint does not invent a barber or other NPC identity that is absent from the current canonical cast.

## Artist and level-design handoff

- Create background, midground and foreground as separate authored layers with consistent perspective and parallax.
- Design each shopfront as an identifiable place; use original fictional business marks and legible English/Kiswahili signage.
- Show authentic local construction, pavement, utility details, transport signage and street furniture without leaning on stereotypes.
- Keep the pedestrian path continuous, readable and safely separated from any road or vehicle artwork.
- Keep every interaction hotspot aligned to the final paintover. Review collision edges and movement zones against the finished scene, not the provisional coordinates.
- Deliver source files, exact dimensions, measured byte sizes, creator, licence and asset-level credits.
- Weather effects must preserve storefront identity and route readability.

## Gameplay layout contract

The machine-readable blueprint contains six canonical places, one existing NPC anchor, seven navigation nodes, a connected route graph, four spawn points, three collision boundaries and two movement zones. These are provisional layout data only; they do not create NPC movement, vehicles, props, collision VFX or finished artwork.

## Readiness

Artwork is explicitly not supplied and runtime readiness is false. No asset paths are fabricated. Integration requires approved human-authored layered artwork, hotspot alignment, collision review, credited local assets, browser preview and device QA.
