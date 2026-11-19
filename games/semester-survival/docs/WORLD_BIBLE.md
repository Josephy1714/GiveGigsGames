# World Bible

## Spatial promise
A compact connected student neighbourhood. It feels lived-in through activity, signage, lighting, traffic rhythms and NPC routines—not raw map size.

## Districts
### Student residence
A modest shared room and immediate courtyard/corridor. Activities: sleep, study, change supported outfits, check belongings, speak with roommates, receive messages and plan the day.

### Township
The essential everyday district linking residence and campus. Include a food kiosk, small shop, barber, cyber/printing shop, rental frontage, transport stage and casual gathering spots. Activities have clear prices, time costs or social consequences.

### University
A coherent campus core with gate, walkways, lecture halls, library, computer/data lab, administration, lecturer offices and student commons. Activities: attend lecture, consult a lecturer, study, use a lab, submit work, join a club and sit assessments.

### Wider city
A later progression layer reached through a clear transport transition. Use it for internship interviews, errands, specialist shopping, events and story missions. Do not build empty streets to imply scale.

## Navigation
- Districts connect through explicit exits, gates and transport points.
- Phone map shows current district, destination and travel cost.
- Every traversable area has a purpose, landmark and interaction or route onward.
- Keep camera framing and horizon consistent within a district.
- Avoid visual dead ends unless they are intentional story spaces.

## Time and environmental storytelling
NPCs may follow simplified schedules. Places should not appear populated at every hour. Noticeboards, posters, price boards, student work, room clutter and weather tell the story. If a schedule is not simulated, do not imply that it is.


## NPC daily routines and weather response

The authored schedule runtime gives Brian, Amina, Wanjiku, Mama Njeri and Dr. Mwangi time-based daily destinations across the existing districts. Each schedule references a real world place ID and is validated against the world catalogue. Weather is evaluated for each character's scheduled district, not merely the player's current district. During heavy rain, outdoor routines can redirect to an authored indoor or sheltered place.

This milestone computes schedule intent and publishes routine-change events. It does not move character sprites, create portraits, or claim that NPCs are visibly present. The runtime explicitly reports visual and movement readiness as false until commissioned character artwork, scene anchors, pathing and authored animation clips are integrated.


## NPC navigation graph contract

Scenes may provide a designer-authored navigation graph. Each node references an existing NPC or place hotspot anchor; each edge connects two declared node IDs. The environment validates node identity and edge references, and the renderer verifies that every waypoint has a real hotspot in the mounted authored scene. The NPC navigation runtime uses breadth-first routing and obtains waypoint coordinates only from mounted hotspot bounds. Missing graph data, disconnected routes or missing anchors remain explicit unavailable states; no coordinates, paths, collision geometry, character artwork or movement are invented. Route readiness is not actor movement: visual and movement readiness remain false until commissioned character assets, navigation collision review and an authored movement integration are complete.
