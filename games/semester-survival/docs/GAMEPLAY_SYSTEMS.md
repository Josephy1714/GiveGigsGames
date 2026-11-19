# Gameplay Systems

## Player condition
Track energy, stress, hunger and time only when each has a meaningful effect. Do not punish through hidden decay. Rest, food, planning and social support provide understandable recovery.

## Academics
Timetable and attendance govern class activities. Study consumes time and energy and improves preparation. Assignments and CATs use authored tasks, deadlines and clear grading criteria. GPA reflects performance, not random pickups. Lecturer consultations and group work can unlock help.

## Economy
Track cash, rent, food, transport, printing/data and optional purchases. Prices are visible before confirmation. Side hustles and internships pay stated rewards. No simulated real-money purchases, ads or external payments.

## Relationships
NPC relationships change through dialogue, commitments, help, group work and events. Track interpretable dimensions rather than an opaque friendship score.

## Progression and fairness
Eight semesters unlock spaces, responsibilities, activities and story threads. Persist choices, tasks, grades, relationships and inventory. Save data is versioned and resilient to malformed fields. Explain grade, fee, opportunity and relationship changes. Provide recovery after setbacks; no permanent failure from one obscure choice.

## Authored campaign objectives
Each semester is divided into story chapters with ordered, measurable objectives. Progress is driven by successful gameplay events—not by merely opening a menu or approaching a location. Objectives can require repeated actions or alternative valid routes, and completed progress persists between sessions. Semester transitions synchronize the chapter sequence with the academic campaign. Phone-only milestones must emit events only after the underlying action succeeds.

## Dynamic weather and daylight

Weather is generated locally from the in-game week, day, time and district. The calendar cycles through Nairobi-inspired long rains, cool dry, short rains and warm dry periods. Conditions include clear skies, cloud cover, drizzle, rain and occasional thunderstorms. Daylight follows a sunrise-to-evening curve; rain, cloud, wind and city haze affect the scene atmosphere.

Weather changes are deterministic for a given calendar block and district, so saves and replays do not depend on a live service or network connection. A three-day forecast is available to gameplay UI through the runtime. Weather transitions are visual and atmospheric at this milestone; they do not secretly alter grades, finances or movement physics. Future authored content may add explicit rain-aware schedules, shelter choices, wet-ground animation and travel consequences with clear player feedback.


## Weather-aware places and NPC routines

Every authored place declares whether it is indoor, sheltered or outdoor; world validation rejects places without this metadata. When a player starts an exposed activity during rain, the interaction runtime emits a clear shelter advisory while allowing the activity to proceed. The current milestone does not apply hidden time, money, grade or movement penalties.

NPC weather-state descriptors are derived from the same simulated precipitation: indoor characters remain indoors, outdoor schedules may switch to seeking shelter in heavy rain, and exposed activity can be reduced in rain. These are behaviour-state signals for future authored NPC animation and schedules, not a claim that umbrella sprites, wet-clothing art or shelter animations are already present.
