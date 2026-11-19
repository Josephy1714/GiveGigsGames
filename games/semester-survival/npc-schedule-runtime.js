/* Semester Survival — authored NPC daily schedules and weather-aware routine decisions.
 * This module computes schedule intent only. It never invents NPC coordinates, art, or movement.
 */
(function (root) {
  'use strict';
  const ROUTINES = Object.freeze({
    brian: [
      { from: 0, to: 420, district: 'residence', placeId: 'room', label: 'Resting at home' },
      { from: 420, to: 780, district: 'campus', placeId: 'student-commons', label: 'On campus' },
      { from: 780, to: 1020, district: 'township', placeId: 'study-cafe', label: 'Studying at the café' },
      { from: 1020, to: 1260, district: 'residence', placeId: 'courtyard', label: 'At the residence' },
      { from: 1260, to: 1440, district: 'residence', placeId: 'room', label: 'Back in the room' }
    ],
    amina: [
      { from: 0, to: 420, district: 'residence', placeId: 'room', label: 'At home' },
      { from: 420, to: 540, district: 'campus', placeId: 'main-gate', label: 'Arriving on campus' },
      { from: 540, to: 780, district: 'campus', placeId: 'lecture-hall', label: 'In lectures' },
      { from: 780, to: 960, district: 'campus', placeId: 'library', label: 'Studying in the library' },
      { from: 960, to: 1140, district: 'campus', placeId: 'student-commons', label: 'At the student commons' },
      { from: 1140, to: 1440, district: 'residence', placeId: 'room', label: 'At home' }
    ],
    wanjiku: [
      { from: 0, to: 420, district: 'residence', placeId: 'room', label: 'At home' },
      { from: 420, to: 540, district: 'campus', placeId: 'main-gate', label: 'Checking campus notices' },
      { from: 540, to: 720, district: 'campus', placeId: 'administration', label: 'Handling class-rep matters' },
      { from: 720, to: 960, district: 'campus', placeId: 'student-commons', label: 'Meeting students' },
      { from: 960, to: 1140, district: 'campus', placeId: 'library', label: 'Personal study time' },
      { from: 1140, to: 1440, district: 'residence', placeId: 'courtyard', label: 'Back at the residence' }
    ],
    njeri: [
      { from: 0, to: 300, district: 'township', placeId: 'mama-njeri-kiosk', label: 'Preparing the kiosk' },
      { from: 300, to: 720, district: 'township', placeId: 'mama-njeri-kiosk', label: 'Serving the morning rush' },
      { from: 720, to: 1020, district: 'township', placeId: 'mama-njeri-kiosk', label: 'Serving customers' },
      { from: 1020, to: 1200, district: 'township', placeId: 'mama-njeri-kiosk', label: 'Closing the kiosk' },
      { from: 1200, to: 1440, district: 'township', placeId: 'matatu-stage', label: 'Heading home' }
    ],
    mwangi: [
      { from: 0, to: 420, district: 'campus', placeId: 'lecturer-office', label: 'Preparing for the day' },
      { from: 420, to: 540, district: 'campus', placeId: 'lecturer-office', label: 'Preparing lectures' },
      { from: 540, to: 780, district: 'campus', placeId: 'lecture-hall', label: 'Teaching' },
      { from: 780, to: 960, district: 'campus', placeId: 'lecturer-office', label: 'Lecturer consultation hours' },
      { from: 960, to: 1140, district: 'campus', placeId: 'library', label: 'Research and reading' },
      { from: 1140, to: 1440, district: 'campus', placeId: 'lecturer-office', label: 'Wrapping up work' }
    ]
  });
  const SHELTERS = Object.freeze({
    brian: { residence: 'room', campus: 'student-commons', township: 'study-cafe' },
    amina: { residence: 'room', campus: 'library', township: 'study-cafe' },
    wanjiku: { residence: 'room', campus: 'administration', township: 'study-cafe' },
    njeri: { township: 'mama-njeri-kiosk' },
    mwangi: { campus: 'lecturer-office' }
  });
  function fail(message) { throw new Error(message); }
  function create(options) {
    options = options || {};
    const world = options.world || root.SemesterWorldContent;
    const weather = options.weatherRuntime;
    const onEvent = typeof options.onEvent === 'function' ? options.onEvent : function () {};
    if (!world || !world.characters || !world.districts) fail('World content is required for NPC schedules.');
    if (!weather || typeof weather.getNpcWeatherState !== 'function' || typeof weather.getConditions !== 'function') fail('Weather runtime is required for NPC schedules.');
    Object.keys(ROUTINES).forEach(function (characterId) {
      if (!world.characters[characterId]) fail('Unknown scheduled character: ' + characterId);
      ROUTINES[characterId].forEach(function (slot) {
        const district = world.districts[slot.district];
        if (!district || !district.places.some(function (place) { return place.id === slot.placeId; })) fail('NPC schedule references unknown place: ' + characterId + '/' + slot.placeId);
        if (!Number.isInteger(slot.from) || !Number.isInteger(slot.to) || slot.from < 0 || slot.to > 1440 || slot.from >= slot.to) fail('Invalid NPC schedule time range: ' + characterId);
      });
    });
    let snapshot = Object.freeze([]);
    let lastSignature = '';
    let disposed = false;
    function update(calendar, activeDistrict) {
      if (disposed) fail('NPC schedule runtime has been disposed.');
      if (!calendar || !Number.isFinite(calendar.minuteOfDay) || !Number.isInteger(calendar.dayIndex)) fail('NPC schedules require the in-game calendar.');
      const minute = Math.max(0, Math.min(1439, Math.floor(calendar.minuteOfDay)));
      const states = Object.keys(ROUTINES).map(function (characterId) {
        const slot = ROUTINES[characterId].find(function (item) { return minute >= item.from && minute < item.to; });
        const place = world.districts[slot.district].places.find(function (item) { return item.id === slot.placeId; });
        const conditions = weather.getConditions(calendar, slot.district);
        const weatherState = weather.getNpcWeatherState(place.exposure, place.exposure !== 'indoor', calendar, slot.district);
        const shelterId = SHELTERS[characterId] && SHELTERS[characterId][slot.district];
        const shelter = shelterId && world.districts[slot.district].places.find(function (item) { return item.id === shelterId; });
        const takingShelter = weatherState === 'seeking-shelter' && shelter && shelter.exposure !== 'outdoor';
        const targetPlace = takingShelter ? shelter : place;
        const behaviour = takingShelter ? 'seeking-shelter' : weatherState === 'reducing-outdoor-activity' ? 'weather-cautious' : place.exposure === 'indoor' ? 'indoors' : place.exposure === 'sheltered' ? 'under-cover' : 'following-routine';
        return Object.freeze({
          characterId: characterId, name: world.characters[characterId].name,
          scheduledDistrict: slot.district, scheduledPlaceId: slot.placeId,
          targetDistrict: slot.district, targetPlaceId: targetPlace.id,
          scheduleLabel: slot.label, exposure: targetPlace.exposure,
          weather: conditions.condition, weatherBehaviour: weatherState,
          behaviour: behaviour, presence: slot.district === activeDistrict ? 'in-active-district' : 'offscreen',
          visualReady: false, movementReady: false
        });
      });
      const signature = states.map(function (s) { return [s.characterId,s.targetDistrict,s.targetPlaceId,s.behaviour,s.weather,s.presence].join(':'); }).join('|');
      if (signature !== lastSignature) {
        const previous = lastSignature;
        lastSignature = signature;
        onEvent(Object.freeze({ type: 'npc:routines-changed', characters: Object.freeze(states.map(function (s) { return Object.freeze({ characterId:s.characterId, targetDistrict:s.targetDistrict, targetPlaceId:s.targetPlaceId, behaviour:s.behaviour, weather:s.weather }); })), initial: !previous }));
      }
      snapshot = Object.freeze(states);
      return snapshot;
    }
    function getState() { return snapshot; }
    function getDiagnostics() { return Object.freeze({ characterCount: Object.keys(ROUTINES).length, authoredScheduleCount: Object.keys(ROUTINES).length, visualActorsReady: 0, movementActorsReady: 0, artPolicy: 'authored-assets-only' }); }
    function destroy() { disposed = true; snapshot = Object.freeze([]); lastSignature = ''; }
    return Object.freeze({ update: update, getState: getState, getDiagnostics: getDiagnostics, destroy: destroy });
  }
  root.SemesterNpcScheduleRuntime = Object.freeze({ create: create, routines: ROUTINES });
})(typeof window !== 'undefined' ? window : globalThis);
