# Student Phone and Academic Portal

`student-phone-runtime.js` composes a read-only phone snapshot from the authoritative life engine and authored world. It does not maintain duplicate academic, financial, relationship, location or timetable records.

## Sections
- Overview: semester, calendar, district and condition.
- Timetable: the schedule supplied by the life engine.
- Courses: current semester course records (read-only).
- Academic record: cumulative GPA and completed transcript entries.
- Coursework: recorded assignment progress. Deadlines are deliberately not fabricated; authored assignment records are a later data milestone.
- CATs and exams: only scores actually recorded in the academic engine.
- Wallet: cash, debt and lifetime totals.
- People: relationship values and recorded conversation history, not invented incoming messages.
- District map: current district, connected exits and authored places.

Opening the academic, course or assessment section emits `academics:reviewed`; opening Wallet emits `budget:reviewed`. These are review events, not mutations to academic or financial state. The host should forward the events to the campaign runtime.

## Host integration
Load `student-phone-runtime.js`, then `student-phone-ui.js`; include `student-phone-ui.css`. Create the runtime with `{ lifeEngine, world, inputManager, onEvent }`, mount the UI into the game's overlay host, and call `phone.handleIntent(inputManager.consume())` from the host frame/update loop. When phone state changes, call `phoneUI.render()`. The input manager already reserves Tab for `phonePressed` and blocks movement while `phoneOpen` is true. Call both `phoneUI.destroy()` and `phone.destroy()` during teardown.

The original game entrypoint is not changed by this milestone. The UI is a standalone host-mounted layer pending the final game-shell integration.
