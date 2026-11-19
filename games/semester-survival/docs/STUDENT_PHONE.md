# Student Phone and University Services

The student phone is a playable university-life system, not a static mock dashboard. It reads authoritative records from the life engine and delegates registration, coursework, inbox and notification actions to `university-services.js`.

## Architecture and data ownership

- `life-systems.js` owns semester course catalogues, active registration, academic progress, scores, finances and the finance transaction ledger.
- `university-services.js` owns assignment briefs/deadlines, submission lifecycle, inbox messages, notifications and registration-window state. It persists to `semester-survival.university.v1`.
- `student-phone-runtime.js` exposes a narrow phone interface and emits phone actions to the central game event bus, which routes supported domain events to university services exactly once.
- `student-phone-ui.js` renders accessible, text-safe controls and views. It does not calculate grades or mutate simulation state directly.

The phone's UI must never create fake grades, pretend to send a real-world email, or imply that an unconnected system has run.

## Functional features

### Course registration
The active semester catalogue contains five core courses and two electives. Students select five courses from the semester catalogue, within a 13–15 credit load. This keeps the full-time academic structure aligned with the five-course CAT/exam campaign objectives. Duplicate courses are rejected, elective prerequisites are checked against completed transcript entries, and the add/drop action is locked after the first registration change for that semester. Newly registered courses receive clean academic progress records. The timetable is derived from the active registration.

### Coursework and deadlines
Each registered course receives authored coursework and practical assignment records with due times measured against the simulation calendar. Deadline reminders and overdue notices are generated as simulation time advances. Submission is a real life-engine mutation and updates course assignment points. The coursework view provides a course-specific work-session action. The entire workflow is in-game: no file picker, PDF, Word document, attachment or external LMS submission is requested or accepted. Players complete work sessions and use the in-game submit action; the game records the result internally. A submission requires at least two focused assignment work sessions for that course. Prepared work is consumed when submitted. The score is calculated from recorded assignment progress, study, preparation and wellbeing; the player cannot type an arbitrary grade. Late work can still be submitted with a 15-point penalty. Duplicate submissions are rejected.

### Inbox and notifications
Messages are authored in-world communications triggered by supported events such as meeting a named NPC, submitting coursework, recording an assessment and arriving on campus. The inbox supports read state and in-game replies. Replies are local simulation messages, not external communications. Notification records are persisted and can be dismissed/read.

The central `game-runtime.js` calls `universityServices.sync()` as part of its simulation update and routes dialogue, assessment, travel and service events through one event bus. Assignment submission automatically creates its authored inbox response and emits `assignment:submitted`. Do not independently forward the same event to services a second time.

### Finance ledger
Purchases and earnings performed through the life engine append transaction records with category, signed amount, time and resulting balance. The phone displays the latest ledger entries alongside current cash, debt and lifetime totals. Do not mutate balances from the phone UI.

## Host integration

Load the modules in this order:
1. `life-systems.js`
2. `world-content.js`
3. `input-manager.js`
4. `university-services.js`
5. `student-phone-runtime.js`
6. `student-phone-ui.js`

Create the life engine, then university services. Supply the same event-forwarding callback to university services and the game host. Create the phone runtime with `{ lifeEngine, world, inputManager, universityServices, onEvent }`. The phone's `workOnAssignment(courseId)` action records a real assignment session against the selected registered course. Mount the UI into the game's overlay host. In the host frame/update loop, pass consumed input to `phone.handleIntent(intent)` and call `phoneUI.render()` when the phone state changes. Forward successful domain events with `phone.receiveEvent(event)`. Destroy the UI, phone and services during teardown.

The original game entrypoint remains untouched until the complete game shell is ready. These modules are committed as an independently testable feature milestone, not represented as fully integrated in-game presentation yet.

## No external assignment files

Coursework is a gameplay loop, not a real document workflow. Do not add a file input, PDF upload, document attachment, cloud storage or LMS integration. All work is represented by in-game actions, simulation progress and authored UI feedback.
## Weather forecast

The Weather section reads the same deterministic weather runtime used by the rendered world. It shows current conditions, seasonal context, district, time, daylight, wind and precipitation, followed by a three-day morning/afternoon forecast. Forecast review emits an in-game event. It is not a real-world meteorological service and does not require internet access.

## Interactive Nairobi world map

The Map section presents the four authored districts—Student Residence, Township, University Campus and Nairobi City—as a connected district network. It identifies the current district, distinguishes directly connected routes from unavailable destinations, and lists the current district's places and direct exits. Travel buttons call the central runtime's cinematic `travelTo` transaction; the phone closes before travel begins so the runtime's modal guard is respected. The runtime revalidates the route and route-specific arrival spawn, mounts the destination before committing travel, and synchronizes the world systems.

Travel currently advances the simulation clock and consumes a small amount of energy and hunger. It does not charge cash: the current life-system travel function has no fare mutation. The map must not display invented fares or route durations. Unconnected districts are shown as unavailable from the current location, not as clickable fast travel. This map is a district overview and travel interface; detailed local map geometry and live GPS are not implied.
