/* Semester Survival — deterministic Nairobi-inspired weather and daylight simulation.
 * Weather follows the in-game calendar, changes by time block and season, and never calls a network API.
 */
(function (root) {
  'use strict';

  const SEASONS = [
    { id: 'long-rains', label: 'Long rains', start: 10, end: 18 },
    { id: 'cool-dry', label: 'Cool dry season', start: 19, end: 29 },
    { id: 'short-rains', label: 'Short rains', start: 39, end: 48 },
    { id: 'warm-dry', label: 'Warm dry season', start: 0, end: 9 }
  ];
  const WEATHER = {
    clear:   { label: 'Clear skies', precipitation: 0, wind: 0.12, fog: 0, cloud: 0 },
    cloudy:  { label: 'Cloudy', precipitation: 0, wind: 0.2, fog: 0.03, cloud: 0.35 },
    drizzle: { label: 'Light drizzle', precipitation: 0.28, wind: 0.25, fog: 0.08, cloud: 0.45 },
    rain:    { label: 'Rain', precipitation: 0.72, wind: 0.42, fog: 0.13, cloud: 0.65 },
    storm:   { label: 'Thunderstorm', precipitation: 1, wind: 0.85, fog: 0.2, cloud: 1 }
  };
  const BLOCKS = [0, 360, 600, 900, 1140, 1440];
  const DISTRICT_MODIFIERS = { residence: 0, township: 0.02, campus: -0.02, city: 0.08 };

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function hash(text) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      value ^= text.charCodeAt(i);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }
  function seasonFor(week) {
    const w = ((Math.max(1, Math.floor(week || 1)) - 1) % 52) + 1;
    if (w >= 10 && w <= 18) return SEASONS[0];
    if (w >= 19 && w <= 29) return SEASONS[1];
    if (w >= 39 && w <= 48) return SEASONS[2];
    return SEASONS[3];
  }
  function daylight(minute) {
    const hour = minute / 60;
    if (hour < 5.8 || hour > 19.1) return 0.12;
    const progress = (hour - 5.8) / (19.1 - 5.8);
    return 0.12 + Math.pow(Math.sin(Math.PI * progress), 0.72) * 0.88;
  }
  function chooseWeather(week, dayIndex, block, district) {
    const season = seasonFor(week);
    const seed = hash([week, dayIndex, block, district].join(':')) / 4294967295;
    const districtBias = DISTRICT_MODIFIERS[district] || 0;
    let rainChance = season.id === 'long-rains' ? 0.48 : season.id === 'short-rains' ? 0.34 : season.id === 'cool-dry' ? 0.12 : 0.09;
    rainChance = clamp(rainChance + districtBias, 0.03, 0.58);
    if (seed > rainChance) return seed > 0.72 ? 'cloudy' : 'clear';
    if (seed < rainChance * 0.12) return 'storm';
    if (seed < rainChance * 0.43) return 'rain';
    return 'drizzle';
  }
  function create(options) {
    options = options || {};
    const onEvent = typeof options.onEvent === 'function' ? options.onEvent : function () {};
    let district = options.initialDistrict || 'residence';
    let current = null;
    let phase = 0;
    let lastKey = null;
    let transition = 1;
    let disposed = false;

    function describe(calendar, targetDistrict) {
      const week = Math.max(1, Math.floor(calendar.week || 1));
      const dayIndex = Math.max(0, Math.min(6, Math.floor(calendar.dayIndex || 0)));
      const minute = clamp(Math.floor(calendar.minuteOfDay || 0), 0, 1439);
      let block = 0;
      while (block < BLOCKS.length - 2 && minute >= BLOCKS[block + 1]) block += 1;
      const condition = chooseWeather(week, dayIndex, block, targetDistrict);
      const profile = WEATHER[condition];
      const season = seasonFor(week);
      const cityHaze = targetDistrict === 'city' ? 0.08 : targetDistrict === 'township' ? 0.025 : 0;
      const light = daylight(minute) * (condition === 'storm' ? 0.72 : condition === 'rain' ? 0.84 : condition === 'cloudy' ? 0.9 : 1);
      return Object.freeze({
        condition: condition, label: profile.label, season: season.id, seasonLabel: season.label,
        district: targetDistrict, week: week, dayIndex: dayIndex, timeOfDay: minute,
        light: clamp(light, 0.08, 1), precipitation: profile.precipitation,
        wind: profile.wind, fog: clamp(profile.fog + cityHaze, 0, 0.35),
        cloud: profile.cloud
      });
    }
    function update(calendar, targetDistrict, delta) {
      if (disposed) throw new Error('Weather runtime has been disposed.');
      if (!calendar || !Number.isFinite(calendar.minuteOfDay)) throw new Error('Weather update requires the in-game calendar.');
      district = targetDistrict || district;
      const next = describe(calendar, district);
      const key = [next.week, next.dayIndex, Math.floor(next.timeOfDay / 60 / 2), next.district, next.condition].join(':');
      if (key !== lastKey) {
        const previous = current;
        current = next;
        lastKey = key;
        transition = 0;
        if (!previous || previous.condition !== next.condition || previous.district !== next.district || previous.season !== next.season) {
          onEvent(Object.freeze({ type: 'weather:changed', previous: previous ? previous.condition : null, condition: next.condition, season: next.season, district: next.district, label: next.label }));
        }
      } else {
        current = next;
      }
      transition = Math.min(1, transition + clamp(Number(delta) || 0, 0, 0.1) * 0.8);
      phase += clamp(Number(delta) || 0, 0, 0.1);
      return getState();
    }
    function getState() {
      if (!current) return null;
      return Object.freeze(Object.assign({}, current, { transition: transition, phase: phase }));
    }
    function getRenderState() {
      if (!current) return null;
      return Object.freeze({
        condition: current.condition,
        light: current.light,
        precipitation: current.precipitation * transition,
        wind: current.wind,
        fog: current.fog,
        timeOfDay: current.timeOfDay,
        phase: phase
      });
    }
    function forecast(calendar, targetDistrict) {
      if (!calendar) throw new Error('Weather forecast requires the in-game calendar.');
      const target = targetDistrict || district;
      const result = [];
      for (let offset = 0; offset < 3; offset += 1) {
        const absolute = Math.max(0, calendar.dayIndex || 0) + offset;
        const dayIndex = absolute % 7;
        const week = Math.max(1, Math.floor(calendar.week || 1)) + Math.floor(absolute / 7);
        const morning = describe({ week: week, dayIndex: dayIndex, minuteOfDay: 9 * 60 }, target);
        const afternoon = describe({ week: week, dayIndex: dayIndex, minuteOfDay: 14 * 60 }, target);
        result.push(Object.freeze({ week: week, dayIndex: dayIndex, season: morning.seasonLabel, morning: morning.label, afternoon: afternoon.label }));
      }
      return Object.freeze(result);
    }
    function setDistrict(value) {
      if (typeof value !== 'string' || !DISTRICT_MODIFIERS.hasOwnProperty(value)) throw new Error('Unknown weather district: ' + value);
      district = value;
      lastKey = null;
    }
    function destroy() { disposed = true; current = null; lastKey = null; }
    return Object.freeze({ update: update, getState: getState, getRenderState: getRenderState, forecast: forecast, setDistrict: setDistrict, destroy: destroy });
  }

  root.SemesterWeatherRuntime = Object.freeze({ create: create, seasons: SEASONS, conditions: WEATHER });
})(typeof window !== 'undefined' ? window : globalThis);
