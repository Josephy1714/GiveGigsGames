/* CountryGeneralizer — Core Game Engine, Map Radar, Resets & Leaderboards */
(() => {
  "use strict";

  const CG = window.CountryGeneralizerData;
  if (!CG || !Array.isArray(CG.COUNTRIES) || !Array.isArray(CG.DIMENSIONS)) {
    throw new Error("CountryGeneralizerData failed to load.");
  }

  const COUNTRIES = CG.COUNTRIES;
  const COUNTRY_BY_ID = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]));
  const DIMENSIONS = CG.DIMENSIONS;
  const DIM_BY_ID = CG.DIMENSION_MAP;
  const COUNTRY_SEARCH = new Map(COUNTRIES.map((country) => [
    country.id, [country.name, country.id, ...(country.aliases || [])].map(normalizeCountryName)
  ]));
  const CAT_BY_ID = Object.fromEntries(CG.CATEGORIES.map((c) => [c.id, c]));

  const MAX_GUESSES = 5;
  const BASE_MAX_SCORE = 5000;
  const WRONG_GUESS_PENALTY = 1000;
  const PEEK_PENALTY = 250;
  const MAX_PEEKS = 3;
  const WEEKLY_ROUNDS = 3;

  const STORAGE_KEYS = {
    profile: "country-generalizer:profile",
    runs: "country-generalizer:runs",
    stats: "country-generalizer:stats",
    leaderboard: "country-generalizer:leaderboard",
    passport: "country-generalizer:passport"
  };

  // ---------- Deterministic PRNG & UTC Reset Helpers ----------
  function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0; i < str.length; i++) {
      const k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededShuffle(arr, rng) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function getPeriodKeys(now = new Date()) {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    const h = String(now.getUTCHours()).padStart(2, "0");

    // ISO week calculation in UTC
    const date = new Date(Date.UTC(y, now.getUTCMonth(), now.getUTCDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    const weekKey = `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;

    return {
      hourly: `${y}-${m}-${d}T${h}`,
      daily: `${y}-${m}-${d}`,
      weekly: weekKey
    };
  }

  function getCountdowns(now = new Date()) {
    const nextHour = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1, 0, 0);
    const nextDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);

    // Next Monday 00:00 UTC
    const day = now.getUTCDay(); // 0=Sun..6=Sat
    const daysUntilMon = day === 0 ? 1 : 8 - day;
    const nextWeek = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMon, 0, 0, 0);

    const fmtHMS = (ms) => {
      const s = Math.max(0, Math.floor(ms / 1000));
      const hh = Math.floor(s / 3600);
      const mm = Math.floor((s % 3600) / 60);
      const ss = s % 60;
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    };
    const fmtMS = (ms) => {
      const s = Math.max(0, Math.floor(ms / 1000));
      const mm = Math.floor(s / 60);
      const ss = s % 60;
      return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    };
    const fmtDH = (ms) => {
      const s = Math.max(0, Math.floor(ms / 1000));
      const dd = Math.floor(s / 86400);
      const hh = Math.floor((s % 86400) / 3600);
      return `${dd}d ${String(hh).padStart(2, "0")}h`;
    };

    return {
      hourly: fmtMS(nextHour - now.getTime()),
      daily: fmtHMS(nextDay - now.getTime()),
      weekly: fmtDH(nextWeek - now.getTime())
    };
  }

  // ---------- Geo Math ----------
  function toRad(deg) { return (deg * Math.PI) / 180; }
  function toDeg(rad) { return (rad * 180) / Math.PI; }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.min(1,
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2));
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  function bearingDeg(lat1, lon1, lat2, lon2) {
    const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
    const x =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  function compassInfo(deg) {
    const dirs = [
      { label: "N", arrow: "↑" },
      { label: "NE", arrow: "↗" },
      { label: "E", arrow: "→" },
      { label: "SE", arrow: "↘" },
      { label: "S", arrow: "↓" },
      { label: "SW", arrow: "↙" },
      { label: "W", arrow: "←" },
      { label: "NW", arrow: "↖" }
    ];
    return dirs[Math.round(deg / 45) % 8];
  }

  function proximityPct(km) {
    return Math.max(0, Math.min(100, Math.round(100 * (1 - km / 18000))));
  }

  function heatColor(km) {
    if (km === 0) return "#10b981";
    if (km < 1500) return "#fb7185";
    if (km < 4000) return "#f59e0b";
    if (km < 8000) return "#38bdf8";
    return "#64748b";
  }

  // ---------- Storage Helpers ----------
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      const value = raw ? JSON.parse(raw) : null;
      return value && typeof value === "object" && Array.isArray(value) === Array.isArray(fallback)
        ? value
        : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      // Ignore quota errors gracefully
    }
  }

  // ---------- Web Audio Synth ----------
  let audioCtx = null;
  function playTone(type) {
    if (!state.profile.sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "clue") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.09);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === "wrong") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(175, now + 0.16);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === "win") {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        osc.disconnect();
        notes.forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = "triangle";
          o.frequency.setValueAtTime(freq, now + idx * 0.07);
          g.gain.setValueAtTime(0.07, now + idx * 0.07);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
          o.connect(g);
          g.connect(audioCtx.destination);
          o.start(now + idx * 0.07);
          o.stop(now + idx * 0.07 + 0.26);
        });
      } else if (type === "lose") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.32);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.36);
      }
    } catch {
      // Ignore audio errors
    }
  }

  // ---------- Pool & Dimension Deck Logic ----------
  function getCountryPool(setId) {
    switch (setId) {
      case "top30": return COUNTRIES.filter((c) => c.rank <= 30);
      case "ranks31_100": return COUNTRIES.filter((c) => c.rank >= 31);
      case "americas": return COUNTRIES.filter((c) => c.macroRegion === "Americas");
      case "europe": return COUNTRIES.filter((c) => c.macroRegion === "Europe");
      case "asia_pacific": return COUNTRIES.filter((c) => c.macroRegion === "Asia-Pacific");
      case "africa_mena": return COUNTRIES.filter((c) => c.macroRegion === "Africa & MENA");
      case "top100":
      default:
        return COUNTRIES;
    }
  }

  function buildDimensionSequence(seedStr, deckId) {
    const deck = CG.DIMENSION_DECKS.find((d) => d.id === deckId) || CG.DIMENSION_DECKS[0];
    const rng = mulberry32(cyrb128(`${seedStr}|dims|${deckId}`)[0]);

    if (deck.preferred && deck.preferred.length) {
      const prefIds = seededShuffle(deck.preferred, rng);
      const restIds = seededShuffle(
        DIMENSIONS.filter((d) => !prefIds.includes(d.id)).map((d) => d.id),
        rng
      );
      if (deckId === "tradle" && !prefIds.slice(0, 2).includes("exports_portfolio")) {
        const idx = prefIds.indexOf("exports_portfolio");
        if (idx > 0) [prefIds[0], prefIds[idx]] = [prefIds[idx], prefIds[0]];
      }
      return [...prefIds, ...restIds];
    }

    if (deckId === "hardcore_blind") {
      // Start with a subtle Tier 2/3 non-export clue, then interleave
      const subtle = seededShuffle(
        DIMENSIONS.filter((d) => d.tier >= 2 && d.id !== "exports_portfolio").map((d) => d.id),
        rng
      );
      const others = seededShuffle(
        DIMENSIONS.filter((d) => !subtle.includes(d.id)).map((d) => d.id),
        rng
      );
      return [...subtle.slice(0, 3), ...others, ...subtle.slice(3)];
    }

    // Balanced deck: pick distinct categories for starters & early rounds
    const byCat = {};
    for (const cat of CG.CATEGORIES) {
      byCat[cat.id] = seededShuffle(
        DIMENSIONS.filter((d) => d.cat === cat.id).map((d) => d.id),
        rng
      );
      // Prefer tier 1/2 near front
      byCat[cat.id].sort((a, b) => DIM_BY_ID[a].tier - DIM_BY_ID[b].tier);
    }
    const catOrder = seededShuffle(CG.CATEGORIES.map((c) => c.id), rng);
    const ordered = [];
    let layer = 0;
    while (ordered.length < DIMENSIONS.length) {
      for (const cid of catOrder) {
        if (byCat[cid][layer]) ordered.push(byCat[cid][layer]);
      }
      layer++;
    }
    return ordered;
  }

  // ---------- Application State ----------
  const defaultProfile = {
    callsign: "AtlasExplorer",
    setId: "top100",
    deckId: "balanced",
    purist: false,
    miles: false,
    sound: true
  };

  const defaultStats = {
    played: 0,
    won: 0,
    streak: 0,
    maxStreak: 0,
    totalScore: 0,
    bestScore: 0,
    dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, X: 0 }
  };

  const savedStats = loadJSON(STORAGE_KEYS.stats, {});
  const state = {
    cadence: "daily",
    practiceSeed: 1,
    practiceSession: `${Date.now()}-${Math.random()}`,
    practiceRuns: new Map(),
    profile: Object.assign({}, defaultProfile, loadJSON(STORAGE_KEYS.profile, {})),
    stats: { ...defaultStats, ...savedStats, dist: { ...defaultStats.dist, ...savedStats.dist } },
    runs: loadJSON(STORAGE_KEYS.runs, {}),
    leaderboard: loadJSON(STORAGE_KEYS.leaderboard, []),
    passport: loadJSON(STORAGE_KEYS.passport, {}),
    activeRun: null,
    almanacCat: "all",
    lbTab: "daily",
    ddIndex: -1,
    ddItems: [],
    mapView: { zoom: 1, panX: 0, panY: 0, dragging: false, lastX: 0, lastY: 0 },
    modalTrigger: null
  };

  if (!CG.COUNTRY_SETS.some((set) => set.id === state.profile.setId)) state.profile.setId = defaultProfile.setId;
  if (!CG.DIMENSION_DECKS.some((deck) => deck.id === state.profile.deckId)) state.profile.deckId = defaultProfile.deckId;

  // ---------- Run Construction & Persistence ----------
  function getActiveDeck() {
    return CG.DIMENSION_DECKS.find((d) => d.id === state.activeRun.deckId) || CG.DIMENSION_DECKS[0];
  }

  function getActiveSet() {
    return CG.COUNTRY_SETS.find((s) => s.id === state.activeRun.setId) || CG.COUNTRY_SETS[0];
  }

  function getCurrentPeriodKey(cadence = state.cadence) {
    if (cadence === "practice") return `p-${state.practiceSession}-${state.practiceSeed}`;
    return getPeriodKeys()[cadence];
  }

  function makeRunKey(cadence, periodKey, setId, deckId, purist) {
    return `${cadence}:${periodKey}:${setId}:${deckId}:${purist ? "purist" : "std"}`;
  }

  function pickTargetsForRun(runKey, setId, count) {
    const pool = getCountryPool(setId);
    const rng = mulberry32(cyrb128(`${runKey}|targets`)[0]);
    const shuffled = seededShuffle(pool, rng);
    const picked = [];
    for (let i = 0; i < count; i++) {
      picked.push(shuffled[i % shuffled.length].id);
    }
    return picked;
  }

  function createRoundState(runKey, roundIdx, targetId, deckId) {
    const deck = CG.DIMENSION_DECKS.find((d) => d.id === deckId) || CG.DIMENSION_DECKS[0];
    const starterCount = deck.starterCount || 2;
    const dimOrder = buildDimensionSequence(`${runKey}|r${roundIdx}|${targetId}`, deckId);
    return {
      targetId,
      dimOrder,
      revealedCount: starterCount,
      peeksUsed: 0,
      guesses: [],
      status: "playing", // "playing" | "won" | "lost"
      score: 0,
      startedAt: Date.now(),
      finishedAt: null
    };
  }

  function loadOrCreateRun(previousTarget) {
    const periodKey = getCurrentPeriodKey();
    const { setId, deckId, purist } = state.profile;
    const runKey = makeRunKey(state.cadence, periodKey, setId, deckId, purist);

    const practice = state.cadence === "practice";
    const setup = makeRunKey("practice", "", setId, deckId, purist);
    const saved = practice ? state.practiceRuns.get(setup) : state.runs[runKey];
    if (saved?.rounds?.[saved.currentRound]?.targetId &&
        Array.isArray(saved.rounds) && saved.rounds.every((round) => round && Object.hasOwn(COUNTRY_BY_ID, round.targetId) &&
          Array.isArray(round.guesses) && round.guesses.every((id) => Object.hasOwn(COUNTRY_BY_ID, id)) &&
          Array.isArray(round.dimOrder) && round.dimOrder.every((id) => Object.hasOwn(DIM_BY_ID, id)))) {
      state.activeRun = saved;
      return;
    }

    const totalRounds = state.cadence === "weekly" ? WEEKLY_ROUNDS : 1;
    const targetIds = pickTargetsForRun(runKey, setId, practice ? 2 : totalRounds);
    if (practice && targetIds[0] === previousTarget) targetIds.shift();
    targetIds.length = totalRounds;
    const run = {
      key: runKey,
      cadence: state.cadence,
      periodKey,
      setId,
      deckId,
      purist,
      totalRounds,
      currentRound: 0,
      rounds: targetIds.map((tid, idx) => createRoundState(runKey, idx, tid, deckId)),
      totalScore: 0,
      completed: false,
      recordedToLeaderboard: false
    };

    state.activeRun = run;
    if (practice) {
      state.practiceRuns.set(setup, run);
    } else {
      state.runs[runKey] = run;
      saveJSON(STORAGE_KEYS.runs, state.runs);
    }
  }

  function saveActiveRun() {
    if (!state.activeRun || state.activeRun.cadence === "practice") return;
    state.runs[state.activeRun.key] = state.activeRun;
    saveJSON(STORAGE_KEYS.runs, state.runs);
  }

  function currentRound() {
    return state.activeRun.rounds[state.activeRun.currentRound];
  }

  function calcPotentialScore(round, wrongCount = round.guesses.length) {
    const deck = getActiveDeck();
    const puristMult = state.activeRun.purist ? 1.2 : 1.0;
    const base = Math.max(250, BASE_MAX_SCORE - wrongCount * WRONG_GUESS_PENALTY - round.peeksUsed * PEEK_PENALTY);
    return Math.round(base * deck.multiplier * puristMult);
  }

  // ---------- Gameplay Actions ----------
  function submitGuess(countryId) {
    const round = currentRound();
    if (!round || round.status !== "playing") return;
    const guessed = COUNTRY_BY_ID[countryId];
    if (!guessed || !getCountryPool(state.activeRun.setId).includes(guessed)) return;

    if (round.guesses.includes(countryId)) {
      setFeedback(`Already guessed ${guessed.flag} ${guessed.name}!`);
      return;
    }

    const target = COUNTRY_BY_ID[round.targetId];
    round.guesses.push(countryId);
    setFeedback("");

    if (countryId === target.id) {
      // Won this round!
      round.score = calcPotentialScore(round, round.guesses.length - 1);
      round.status = "won";
      round.finishedAt = Date.now();
      playTone("win");
      finalizeRoundProgress(true);
    } else if (round.guesses.length >= MAX_GUESSES) {
      // Lost this round
      round.score = 0;
      round.status = "lost";
      round.finishedAt = Date.now();
      playTone("lose");
      finalizeRoundProgress(false);
    } else {
      // Wrong guess: reveal 1 more dimension factoid!
      round.revealedCount = Math.min(round.dimOrder.length, round.revealedCount + 1);
      playTone("wrong");
    }

    saveActiveRun();
    renderAll();
  }

  function peekExtraClue() {
    const round = currentRound();
    if (!round || round.status !== "playing") return;
    if (round.peeksUsed >= MAX_PEEKS) return;
    if (round.revealedCount >= round.dimOrder.length) return;
    round.peeksUsed += 1;
    round.revealedCount += 1;
    playTone("clue");
    saveActiveRun();
    renderAll();
  }

  function finalizeRoundProgress(won) {
    const round = currentRound();
    const run = state.activeRun;

    // Unlock passport entry regardless (discovered!)
    if (!state.passport[round.targetId]) {
      state.passport[round.targetId] = {
        discoveredAt: Date.now(),
        solved: won,
        bestScore: round.score
      };
    } else {
      state.passport[round.targetId].solved = state.passport[round.targetId].solved || won;
      state.passport[round.targetId].bestScore = Math.max(state.passport[round.targetId].bestScore || 0, round.score);
    }
    saveJSON(STORAGE_KEYS.passport, state.passport);

    // Update player stats
    state.stats.played += 1;
    if (won) {
      state.stats.won += 1;
      state.stats.streak += 1;
      state.stats.maxStreak = Math.max(state.stats.maxStreak, state.stats.streak);
      state.stats.totalScore += round.score;
      state.stats.bestScore = Math.max(state.stats.bestScore, round.score);
      state.stats.dist[round.guesses.length] = (state.stats.dist[round.guesses.length] || 0) + 1;
    } else {
      state.stats.streak = 0;
      state.stats.dist.X = (state.stats.dist.X || 0) + 1;
    }
    saveJSON(STORAGE_KEYS.stats, state.stats);

    // Compute run total
    run.totalScore = run.rounds.reduce((s, r) => s + r.score, 0);
    if (run.currentRound === run.totalRounds - 1) {
      run.completed = true;
      recordRunToLeaderboard(run);
    }
  }

  function getRunTime(run) {
    const elapsed = run.rounds.reduce((sum, round) => sum + Math.max(0, round.finishedAt - round.startedAt), 0);
    return Math.max(1, Math.round(elapsed / 1000));
  }

  function formatRunResult(run) {
    const guesses = run.rounds.reduce((sum, round) => sum + round.guesses.length, 0);
    const wins = run.rounds.filter((round) => round.status === "won").length;
    if (run.totalRounds > 1) return `${wins}/${run.totalRounds} (${guesses}g)`;
    return `${wins ? guesses : "X"}/${MAX_GUESSES}`;
  }

  function recordRunToLeaderboard(run) {
    if (run.recordedToLeaderboard) return;
    run.recordedToLeaderboard = true;
    const entry = {
      id: `${run.key}|${Date.now()}`,
      player: state.profile.callsign || "AtlasExplorer",
      cadence: run.cadence,
      periodKey: run.periodKey,
      setId: run.setId,
      deckId: run.deckId,
      purist: run.purist,
      score: run.totalScore,
      resultText: formatRunResult(run),
      timeSec: getRunTime(run),
      isYou: true,
      createdAt: Date.now()
    };

    saveLeaderboardEntry(entry);
  }

  function saveLeaderboardEntry(entry) {
    state.leaderboard = [...state.leaderboard, entry].slice(-300);
    saveJSON(STORAGE_KEYS.leaderboard, state.leaderboard);
  }

  function advanceNextAction() {
    const run = state.activeRun;
    if (run.cadence === "weekly" && run.currentRound < run.totalRounds - 1) {
      run.currentRound += 1;
      run.rounds[run.currentRound].startedAt = Date.now();
      saveActiveRun();
      state.almanacCat = "all";
      resetGuessInput();
      resetMapView();
      renderAll();
      return;
    }
    // A new practice round replaces the current practice round for this setup.
    const { setId, deckId, purist } = run;
    state.practiceRuns.delete(makeRunKey("practice", "", setId, deckId, purist));
    state.cadence = "practice";
    state.practiceSeed += 1;
    state.almanacCat = "all";
    resetGuessInput();
    resetMapView();
    loadOrCreateRun(currentRound().targetId);
    renderAll();
  }

  // ---------- Benchmarks & Share Codes ----------
  function getBenchmarkField(cadence, periodKey) {
    if (cadence === "practice" || cadence === "alltime") return [];
    const rng = mulberry32(cyrb128(`bench|${cadence}|${periodKey}`)[0]);
    const names = ["GeoCartographer", "TradlePro", "AtlasNomad", "BiomeHunter", "GlobalPulse", "MeridianBot"];
    const mult = cadence === "weekly" ? 3 : 1;
    return names.map((name) => {
      const guessCount = Math.min(5, Math.max(1, Math.floor(rng() * 4.7) + 1));
      const base = cadence === "weekly"
        ? Math.round((7500 + rng() * 6800) / 50) * 50
        : Math.max(1000, (6 - guessCount) * 1000 - (rng() > 0.7 ? 250 : 0));
      return {
        id: `bench-${name}`,
        player: name,
        cadence,
        periodKey,
        setId: "top100",
        deckId: "balanced",
        purist: false,
        score: base,
        resultText: cadence === "weekly" ? `${Math.min(3, Math.max(2, Math.round(base / 4500)))}/3` : `${guessCount}/5`,
        timeSec: Math.round((18 + rng() * 95) * mult),
        isBenchmark: true
      };
    });
  }

  function buildShareText() {
    const run = state.activeRun;
    const round = currentRound();
    const target = COUNTRY_BY_ID[round.targetId];
    const setObj = getActiveSet();
    const deckObj = getActiveDeck();
    const label = run.cadence === "practice" ? "Practice" : `${run.cadence.toUpperCase()} (${run.periodKey})`;

    const lines = [`🌍 CountryGeneralizer — ${label}`];
    if (run.totalRounds > 1) {
      lines.push(`Weekly Marathon: ${run.totalScore.toLocaleString()} pts`);
      run.rounds.forEach((r, i) => {
        const pips = r.guesses.map((gid) => (gid === r.targetId ? "🟩" : "🟥")).join("");
        lines.push(`R${i + 1}: ${pips} (${r.score.toLocaleString()})`);
      });
    } else {
      const pips = round.guesses.map((gid) => {
        if (gid === target.id) return "🟩";
        const g = COUNTRY_BY_ID[gid];
        const km = run.purist ? Infinity : haversineKm(g.lat, g.lon, target.lat, target.lon);
        return km < 2500 ? "🟨" : "🟥";
      }).join("");
      const outcome = round.status === "won" ? `${round.guesses.length}/5` : "X/5";
      lines.push(`Result: ${outcome} · ${round.score.toLocaleString()} pts`);
      lines.push(pips);
    }
    lines.push(`Set: ${setObj.name} · Deck: ${deckObj.name}${run.purist ? " (Purist)" : ""}`);

    const player = encodeURIComponent((state.profile.callsign || defaultProfile.callsign).toWellFormed());
    lines.push(`Token: CG2|${run.cadence}|${run.periodKey}|${run.setId}|${run.deckId}|${run.purist ? "1" : "0"}|${run.totalScore}|${encodeURIComponent(formatRunResult(run))}|${getRunTime(run)}|${player}`);
    return lines.join("\n");
  }

  function importShareToken(raw) {
    const token = raw.split(/\r?\n/).map((line) => line.trim().replace(/^Token:\s*/, ""))
      .find((line) => /^CG[12]\|/.test(line));
    const fields = token?.split("|") || [];
    const modern = fields[0] === "CG2";
    const invalid = { ok: false, msg: "Paste a valid CG1 or CG2 challenge token." };
    if (fields.length !== (modern ? 10 : 9)) return invalid;
    const [, cadence, periodKey, setId, deckId] = fields;
    const flag = modern ? fields[5] : "0";
    const [scoreText, result, timeText, name] = fields.slice(modern ? 6 : 5);
    const deck = CG.DIMENSION_DECKS.find((item) => item.id === deckId);
    const periodFormats = {
      hourly: /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3])$/,
      daily: /^\d{4}-\d{2}-\d{2}$/,
      weekly: /^\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])$/,
      practice: /^p-[\d.-]+$/
    };
    const score = Number(scoreText);
    const timeSec = Number(timeText);
    const weekly = cadence === "weekly";
    const purist = flag === "1";
    if (!Object.hasOwn(periodFormats, cadence) || !periodFormats[cadence].test(periodKey) ||
        !CG.COUNTRY_SETS.some((set) => set.id === setId) || !deck ||
        !/^[01]$/.test(flag) || !/^\d+$/.test(scoreText) || !/^\d+$/.test(timeText) ||
        score > Math.round(BASE_MAX_SCORE * deck.multiplier * (purist || !modern ? 1.2 : 1)) * (weekly ? WEEKLY_ROUNDS : 1) ||
        !Number.isSafeInteger(timeSec) || timeSec < 1) return invalid;

    let player;
    let resultText;
    try {
      player = (modern ? decodeURIComponent(name) : name).trim();
      resultText = modern ? decodeURIComponent(result) : weekly ? "Marathon (legacy)" : `${result}/5`;
    } catch {
      return invalid;
    }
    if (!player || player.length > 20 || /[\x00-\x1f]/.test(player)) return invalid;
    if (weekly ? (modern ? !/^[0-3]\/3 \((?:[3-9]|1[0-5])g\)$/.test(resultText) : !/^[1-5X]$/.test(result)) :
        !/^[1-5X]\/5$/.test(resultText)) return invalid;

    const id = JSON.stringify(["friend", cadence, periodKey, setId, deckId, purist, score, resultText, timeSec, player]);
    if (state.leaderboard.some((entry) => entry?.id === id)) return { ok: false, msg: "This result is already on your board." };
    saveLeaderboardEntry({
      id, player, cadence, periodKey, setId, deckId, purist, score, resultText, timeSec,
      isFriend: true, createdAt: Date.now()
    });
    const active = state.activeRun;
    const sameSetup = active.setId === setId && active.deckId === deckId && active.purist === purist;
    state.lbTab = sameSetup && getPeriodKeys()[cadence] === periodKey ? cadence : "alltime";
    return { ok: true, msg: `Added ${player}'s ${score.toLocaleString()} pt result.` };
  }

  // ---------- DOM Elements ----------
  const el = {
    subtitle: document.getElementById("cg-challenge-subtitle"),
    timerHourly: document.getElementById("timer-hourly"),
    timerDaily: document.getElementById("timer-daily"),
    timerWeekly: document.getElementById("timer-weekly"),
    cadenceTabs: document.querySelectorAll(".cg-tab"),
    pips: document.getElementById("guess-pips"),
    potentialScore: document.getElementById("potential-score"),
    intelCount: document.getElementById("intel-count"),
    activeDeckLabel: document.getElementById("active-deck-label"),
    weeklyBox: document.getElementById("weekly-progress-box"),
    weeklyLabel: document.getElementById("weekly-round-label"),
    cluesGrid: document.getElementById("clues-grid"),
    clueSubnote: document.getElementById("clue-subnote"),
    btnPeek: document.getElementById("btn-peek-clue"),
    guessPanel: document.getElementById("guess-panel"),
    guessForm: document.getElementById("guess-form"),
    input: document.getElementById("country-input"),
    btnClearInput: document.getElementById("btn-clear-input"),
    dropdown: document.getElementById("country-dropdown"),
    btnSubmit: document.getElementById("btn-submit-guess"),
    feedback: document.getElementById("guess-feedback"),
    revealPanel: document.getElementById("reveal-panel"),
    revealBanner: document.getElementById("reveal-banner"),
    revealFlag: document.getElementById("reveal-flag"),
    revealBadge: document.getElementById("reveal-badge"),
    revealName: document.getElementById("reveal-name"),
    revealFacts: document.getElementById("reveal-facts"),
    revealScore: document.getElementById("reveal-score"),
    btnShare: document.getElementById("btn-share-result"),
    btnNext: document.getElementById("btn-next-challenge"),
    btnRanksAfter: document.getElementById("btn-open-ranks-after"),
    shareToast: document.getElementById("share-toast"),
    almanacFilters: document.getElementById("almanac-cat-filters"),
    almanacGrid: document.getElementById("almanac-grid"),
    mapCanvas: document.getElementById("world-map-canvas"),
    mapTooltip: document.getElementById("map-tooltip"),
    mapNote: document.getElementById("map-note"),
    guessList: document.getElementById("guess-list"),
    historyCount: document.getElementById("history-count"),
    backdrop: document.getElementById("modal-backdrop"),
    modalOptions: document.getElementById("modal-options"),
    modalLeaderboard: document.getElementById("modal-leaderboard"),
    modalPassport: document.getElementById("modal-passport"),
    modalHelp: document.getElementById("modal-help")
  };

  // ---------- Rendering ----------
  function setFeedback(msg) {
    el.feedback.textContent = msg;
  }

  function renderDimensionCard(country, dimId, isNew) {
    const dim = DIM_BY_ID[dimId];
    const cat = CAT_BY_ID[dim.cat];
    const card = document.createElement("article");
    card.className = "cg-clue-card" + (dim.visual === "exports" ? " is-exports" : "") + (isNew ? " is-new" : "");

    const top = document.createElement("div");
    top.className = "cg-clue-top";

    const catBadge = document.createElement("span");
    catBadge.className = "cg-clue-cat";
    catBadge.style.color = cat.color;
    catBadge.textContent = `${cat.icon} ${cat.name}`;
    top.append(catBadge);

    if (isNew) {
      const newBadge = document.createElement("span");
      newBadge.className = "cg-new-pill";
      newBadge.textContent = "NEW INTEL";
      top.append(newBadge);
    }

    const title = document.createElement("div");
    title.className = "cg-clue-title";
    title.textContent = `${dim.icon} ${dim.label}`;

    const text = document.createElement("p");
    text.className = "cg-clue-text";
    text.textContent = country.dims[dimId];

    card.append(top, title, text);

    // Visual Tradle-style stacked export breakdown
    if (dim.visual === "exports" && Array.isArray(country.exports)) {
      const bar = document.createElement("div");
      bar.className = "cg-tradle-bar";
      const legend = document.createElement("div");
      legend.className = "cg-tradle-legend";

      for (const item of country.exports) {
        const seg = document.createElement("div");
        seg.className = "cg-tradle-seg";
        seg.style.width = `${item.p}%`;
        seg.style.backgroundColor = item.c;
        seg.title = `${item.n}: ${item.p}%`;
        if (item.p >= 12) seg.textContent = `${item.p}%`;
        bar.append(seg);

        const leg = document.createElement("span");
        leg.className = "cg-tradle-item";
        const sw = document.createElement("i");
        sw.className = "cg-tradle-swatch";
        sw.style.backgroundColor = item.c;
        leg.append(sw, document.createTextNode(`${item.n} (${item.p}%)`));
        legend.append(leg);
      }
      card.append(bar, legend);
    }

    return card;
  }

  function renderHeaderAndStatus() {
    const run = state.activeRun;
    const round = currentRound();
    const setObj = getActiveSet();
    const deckObj = getActiveDeck();

    const cadenceNames = {
      hourly: `Hourly · ${run.periodKey} UTC`,
      daily: `Daily · ${run.periodKey} UTC`,
      weekly: `Weekly Marathon · ${run.periodKey}`,
      practice: "Practice · Unlimited rounds"
    };
    el.subtitle.textContent = `${cadenceNames[run.cadence]} · ${setObj.name}`;

    el.cadenceTabs.forEach((btn) => {
      const active = btn.dataset.cadence === state.cadence;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    // Guess Pips
    el.pips.replaceChildren();
    for (let i = 0; i < MAX_GUESSES; i++) {
      const pip = document.createElement("span");
      pip.className = "cg-pip";
      const gid = round.guesses[i];
      if (gid) {
        pip.classList.add(gid === round.targetId ? "is-win" : "is-wrong");
      } else if (i === round.guesses.length && round.status === "playing") {
        pip.classList.add("is-current");
      }
      el.pips.append(pip);
    }

    el.potentialScore.textContent =
      round.status === "playing"
        ? calcPotentialScore(round).toLocaleString()
        : round.score.toLocaleString();

    el.intelCount.textContent = `${round.revealedCount} / ${DIMENSIONS.length}`;
    el.activeDeckLabel.textContent = `${deckObj.name.split("(")[0].trim()}${run.purist ? " · Purist" : ""}`;

    if (run.totalRounds > 1) {
      el.weeklyBox.hidden = false;
      el.weeklyLabel.textContent = `Round ${run.currentRound + 1} / ${run.totalRounds} · ${run.totalScore.toLocaleString()} pts`;
    } else {
      el.weeklyBox.hidden = true;
    }

    el.input.placeholder = `Search ${getCountryPool(run.setId).length} countries`;
    const legend = document.getElementById("map-legend");
    legend.hidden = run.purist;
    const formatDistance = (km) => state.profile.miles
      ? `${Math.round(km * 0.621371).toLocaleString()} mi`
      : `${km.toLocaleString()} km`;
    [1500, 4000, 8000, 8000].forEach((km, index) => {
      legend.children[index].lastElementChild.textContent = `${index === 3 ? "≥" : "<"}${formatDistance(km)}`;
    });

    el.mapNote.textContent = run.purist
      ? "Purist Mode active: map shows pins only (distances & bearings hidden)."
      : "Pins plot your guesses with proximity heat & compass bearing.";
  }

  function renderClues() {
    const round = currentRound();
    const target = COUNTRY_BY_ID[round.targetId];
    const visibleIds = round.dimOrder.slice(0, round.revealedCount);

    el.cluesGrid.replaceChildren();
    const starterCount = getActiveDeck().starterCount || 2;
    visibleIds.forEach((dimId, idx) => {
      const isNew = round.status === "playing" && idx === visibleIds.length - 1 && visibleIds.length > starterCount;
      el.cluesGrid.append(renderDimensionCard(target, dimId, isNew));
    });

    const peeksLeft = MAX_PEEKS - round.peeksUsed;
    el.btnPeek.disabled = round.status !== "playing" || peeksLeft <= 0 || round.revealedCount >= round.dimOrder.length;
    el.btnPeek.innerHTML =
      peeksLeft > 0
        ? `+ Extra Clue <small>(-250 pts · ${peeksLeft} left)</small>`
        : `No Peeks Left`;

    document.getElementById("guess-remaining").textContent =
      `${MAX_GUESSES - round.guesses.length} of ${MAX_GUESSES} guesses left`;
    el.clueSubnote.textContent =
      round.status === "playing"
        ? "Use the dossier to identify the country. Each miss costs 1,000 base points and reveals a clue."
        : `Round finished! Explore all 36 dimensions of ${target.name} below.`;
  }

  function renderGuessHistory() {
    const run = state.activeRun;
    const round = currentRound();
    const target = COUNTRY_BY_ID[round.targetId];

    el.historyCount.textContent = `${round.guesses.length} / ${MAX_GUESSES} guesses`;
    el.guessList.replaceChildren();

    if (!round.guesses.length) {
      const empty = document.createElement("div");
      empty.className = "cg-empty-state";
      empty.textContent =
        "Make your first deduction! Wrong guesses plot on the radar map, show trait matches, and reveal another dimension.";
      el.guessList.append(empty);
      return;
    }

    // Show newest guess at top
    const reversed = round.guesses.map((gid, idx) => ({ gid, idx })).reverse();
    for (const { gid, idx } of reversed) {
      const g = COUNTRY_BY_ID[gid];
      const isMatch = gid === target.id;
      const km = haversineKm(g.lat, g.lon, target.lat, target.lon);
      const deg = bearingDeg(g.lat, g.lon, target.lat, target.lon);
      const comp = compassInfo(deg);
      const prox = proximityPct(km);

      const row = document.createElement("div");
      row.className = "cg-guess-row" + (isMatch ? " is-correct" : "");

      const top = document.createElement("div");
      top.className = "cg-guess-top";

      const left = document.createElement("div");
      left.className = "cg-guess-country";
      left.innerHTML = `<span class="cg-guess-num">#${idx + 1}</span><span>${g.flag}</span><span>${g.name}</span>`;

      const right = document.createElement("div");
      right.className = "cg-guess-geo";
      if (isMatch) {
        right.innerHTML = `<span style="color:var(--emerald)">✓ EXACT MATCH!</span>`;
      } else if (run.purist) {
        right.innerHTML = `<span class="cg-bearing-badge">Purist Mode</span>`;
      } else {
        const distVal = state.profile.miles ? `${Math.round(km * 0.621371).toLocaleString()} mi` : `${km.toLocaleString()} km`;
        right.innerHTML = `
          <span style="color:${heatColor(km)}">${distVal} (${prox}%)</span>
          <span class="cg-bearing-badge" title="Bearing toward target">${comp.arrow} ${comp.label}</span>
        `;
      }
      top.append(left, right);

      // Trait comparisons (Tradle/Wordle-style deductive pills)
      const traits = document.createElement("div");
      traits.className = "cg-trait-pills";

      const regClass = g.region === target.region ? "is-match" : g.macroRegion === target.macroRegion ? "is-close" : "";
      const regText = g.region === target.region ? `Region: ${g.region} ✓` : g.macroRegion === target.macroRegion ? `Zone: ${g.macroRegion} ~` : `Zone: ${g.macroRegion} ✗`;

      const popDiff = Math.abs(g.rank - target.rank);
      const popClass = isMatch || popDiff <= 5 ? "is-match" : popDiff <= 15 ? "is-close" : "";
      const popArrow = target.pop > g.pop ? "Higher ↑" : target.pop < g.pop ? "Lower ↓" : "=";
      const popText = isMatch ? `Pop: #${g.rank} (${g.pop}M) ✓` : `Pop #${g.rank}: Target ${popArrow}`;

      const tierNames = { 1: "Low", 2: "Lower-Mid", 3: "Upper-Mid", 4: "High" };
      const incClass = g.incomeTier === target.incomeTier ? "is-match" : Math.abs(g.incomeTier - target.incomeTier) === 1 ? "is-close" : "";
      const incArrow = target.incomeTier > g.incomeTier ? "↑" : target.incomeTier < g.incomeTier ? "↓" : "✓";
      const incText = `Income: ${tierNames[g.incomeTier]} ${incArrow}`;

      const climClass = g.climateZone === target.climateZone ? "is-match" : "";
      const climText = `Climate: ${g.climateZone} ${g.climateZone === target.climateZone ? "✓" : "✗"}`;

      for (const [cls, txt] of [[regClass, regText], [popClass, popText], [incClass, incText], [climClass, climText]]) {
        const pill = document.createElement("span");
        pill.className = `cg-trait ${cls}`;
        pill.textContent = txt;
        traits.append(pill);
      }

      row.append(top, traits);
      el.guessList.append(row);
    }
  }

  function renderRevealAndAlmanac() {
    const run = state.activeRun;
    const round = currentRound();
    const target = COUNTRY_BY_ID[round.targetId];

    if (round.status === "playing") {
      el.guessPanel.hidden = false;
      el.revealPanel.hidden = true;
      el.input.disabled = false;
      el.btnSubmit.disabled = false;
      return;
    }

    el.guessPanel.hidden = true;
    el.revealPanel.hidden = false;
    el.revealBanner.classList.toggle("is-loss", round.status === "lost");
    el.revealFlag.textContent = target.flag;
    el.revealBadge.textContent =
      round.status === "won" ? `SOLVED IN ${round.guesses.length} / ${MAX_GUESSES}` : "OUT OF GUESSES — ANSWER REVEALED";
    el.revealName.textContent = target.name;
    el.revealFacts.textContent = `Capital: ${target.capital} · Pop Rank #${target.rank} (~${target.pop}M) · ${target.region}`;
    el.revealScore.textContent = round.score.toLocaleString();
    el.shareToast.hidden = true;
    document.getElementById("share-copy").hidden = true;
    el.btnShare.hidden = !run.completed;

    if (run.cadence === "weekly" && run.currentRound < run.totalRounds - 1) {
      el.btnNext.textContent = `➡️ Next Weekly Country (${run.currentRound + 2} / ${run.totalRounds})`;
    } else {
      el.btnNext.textContent = "🎲 Play Practice Round";
    }

    // Category filter buttons
    el.almanacFilters.replaceChildren();
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "cg-cat-btn" + (state.almanacCat === "all" ? " is-active" : "");
    allBtn.textContent = "All 36";
    allBtn.addEventListener("click", () => { state.almanacCat = "all"; renderAlmanacGrid(target); });
    el.almanacFilters.append(allBtn);

    for (const cat of CG.CATEGORIES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cg-cat-btn" + (state.almanacCat === cat.id ? " is-active" : "");
      btn.textContent = `${cat.icon} ${cat.name}`;
      btn.addEventListener("click", () => { state.almanacCat = cat.id; renderAlmanacGrid(target); });
      el.almanacFilters.append(btn);
    }

    renderAlmanacGrid(target);
  }

  function renderAlmanacGrid(target) {
    // Update active state on filter pills
    Array.from(el.almanacFilters.children).forEach((btn, i) => {
      const cid = i === 0 ? "all" : CG.CATEGORIES[i - 1].id;
      btn.classList.toggle("is-active", state.almanacCat === cid);
    });

    el.almanacGrid.replaceChildren();
    const list =
      state.almanacCat === "all" ? DIMENSIONS : DIMENSIONS.filter((d) => d.cat === state.almanacCat);
    for (const dim of list) {
      el.almanacGrid.append(renderDimensionCard(target, dim.id, false));
    }
  }

  // ---------- Offline Vector World Map Canvas ----------
  function resetMapView() {
    state.mapView.zoom = 1;
    state.mapView.panX = 0;
    state.mapView.panY = 0;
  }

  function projectLonLat(lon, lat, w, h) {
    const baseX = ((lon + 180) / 360) * w;
    const baseY = ((90 - lat) / 180) * h;
    const { zoom, panX, panY } = state.mapView;
    return [
      (baseX - w / 2) * zoom + w / 2 + panX,
      (baseY - h / 2) * zoom + h / 2 + panY
    ];
  }

  let plottedPins = [];
  function renderWorldMap() {
    const canvas = el.mapCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width: w, height: h } = rect;
    if (!w || !h) return;
    const width = Math.round(w * dpr);
    const height = Math.round(h * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const view = state.mapView;
    canvas.classList.toggle("is-zoomed", view.zoom > 1);
    const maxX = (view.zoom - 1) * w / 2;
    const maxY = (view.zoom - 1) * h / 2;
    view.panX = Math.max(-maxX, Math.min(maxX, view.panX));
    view.panY = Math.max(-maxY, Math.min(maxY, view.panY));
    el.mapTooltip.hidden = true;

    ctx.save();
    ctx.setTransform(width / w, 0, 0, height / h, 0, 0);

    // Ocean gradient
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
    oceanGrad.addColorStop(0, "#071320");
    oceanGrad.addColorStop(0.5, "#09192b");
    oceanGrad.addColorStop(1, "#06101b");
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, w, h);

    // Graticule grid
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = "rgba(56, 189, 248, 0.1)";
    for (let lon = -150; lon <= 150; lon += 30) {
      const [x] = projectLonLat(lon, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const [, y] = projectLonLat(0, lat, w, h);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Equator dashed line
    const [, eqY] = projectLonLat(0, 0, w, h);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(245, 185, 66, 0.22)";
    ctx.beginPath();
    ctx.moveTo(0, eqY);
    ctx.lineTo(w, eqY);
    ctx.stroke();
    ctx.restore();

    // Landmasses
    ctx.fillStyle = "#162d43";
    ctx.strokeStyle = "#2c547a";
    ctx.lineWidth = 1;
    for (const poly of CG.WORLD_LAND_POLYGONS) {
      ctx.beginPath();
      poly.forEach(([lon, lat], idx) => {
        const [x, y] = projectLonLat(lon, lat, w, h);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Plot guessed countries
    const round = currentRound();
    const target = COUNTRY_BY_ID[round.targetId];
    plottedPins = [];

    round.guesses.forEach((gid, idx) => {
      const g = COUNTRY_BY_ID[gid];
      const [x, y] = projectLonLat(g.lon, g.lat, w, h);
      const km = haversineKm(g.lat, g.lon, target.lat, target.lon);
      const col = state.activeRun.purist && gid !== target.id ? "#7dd3fc" : heatColor(km);

      // Directional bearing tick (if not purist & not exact)
      if (!state.activeRun.purist && gid !== target.id) {
        const deg = bearingDeg(g.lat, g.lon, target.lat, target.lon);
        const rad = toRad(deg - 90);
        const len = 18;
        ctx.save();
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(rad) * len, y + Math.sin(rad) * len);
        ctx.stroke();
        ctx.restore();
      }

      // Glow ring + pin
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = `${col}33`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 5.2, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#06101b";
      ctx.stroke();

      // Label number
      ctx.fillStyle = "#fff";
      ctx.font = "700 10px system-ui, sans-serif";
      ctx.fillText(String(idx + 1), x + 7, y - 5);

      plottedPins.push({ x, y, country: g, km, idx: idx + 1 });
    });

    // Plot target star after round finishes
    if (round.status !== "playing") {
      const [tx, ty] = projectLonLat(target.lon, target.lat, w, h);
      ctx.beginPath();
      ctx.arc(tx, ty, 13, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(16, 185, 129, 0.28)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tx, ty, 6.8, 0, Math.PI * 2);
      ctx.fillStyle = "#10b981";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fff";
      ctx.stroke();

      ctx.fillStyle = "#a7f3d0";
      ctx.font = "800 11px system-ui, sans-serif";
      ctx.fillText(target.name, tx + 10, ty + 4);
      plottedPins.push({ x: tx, y: ty, country: target, km: 0, idx: "★" });
    }

    ctx.restore();
  }

  // ---------- Autocomplete Dropdown ----------
  function normalizeCountryName(value) {
    return value.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]/gu, "");
  }

  function filterCountries(query) {
    const normalized = normalizeCountryName(query.trim());
    return getCountryPool(state.activeRun.setId)
      .filter((country) => !currentRound().guesses.includes(country.id))
      .map((country) => {
        const names = COUNTRY_SEARCH.get(country.id);
        const score = names.includes(normalized) ? 0
          : names[0].startsWith(normalized) ? 1
          : names.some((name) => name.startsWith(normalized)) ? 2
          : names.some((name) => name.includes(normalized)) ? 3 : 4;
        return { country, score };
      })
      .filter(({ score }) => score < 4)
      .sort((a, b) => a.score - b.score || a.country.name.localeCompare(b.country.name))
      .map(({ country }) => country);
  }

  function closeDropdown() {
    state.ddIndex = -1;
    state.ddItems = [];
    el.dropdown.hidden = true;
    el.input.setAttribute("aria-expanded", "false");
    el.input.removeAttribute("aria-activedescendant");
  }

  function renderDropdown(items) {
    state.ddItems = items;
    el.dropdown.replaceChildren();
    if (!items.length) {
      closeDropdown();
      return;
    }
    items.forEach((country, index) => {
      const option = document.createElement("li");
      const highlighted = index === state.ddIndex;
      option.id = `cg-country-${country.id}`;
      option.role = "option";
      option.setAttribute("aria-selected", String(highlighted));
      option.classList.toggle("is-highlighted", highlighted);
      option.innerHTML = `<span class="cg-dd-left"><span>${country.flag}</span><span>${country.name}</span></span><span class="cg-dd-region">${country.region}</span>`;
      option.addEventListener("mousedown", (event) => event.preventDefault());
      option.addEventListener("click", () => {
        el.input.value = country.name;
        el.btnClearInput.hidden = false;
        closeDropdown();
        setFeedback("");
        el.btnSubmit.focus();
      });
      el.dropdown.append(option);
    });
    el.dropdown.hidden = false;
    el.input.setAttribute("aria-expanded", "true");
    const selected = el.dropdown.children[state.ddIndex];
    if (selected) {
      el.input.setAttribute("aria-activedescendant", selected.id);
      selected.scrollIntoView({ block: "nearest" });
    } else {
      el.input.removeAttribute("aria-activedescendant");
    }
  }

  function resetGuessInput() {
    el.input.value = "";
    el.btnClearInput.hidden = true;
    closeDropdown();
    setFeedback("");
  }

  // ---------- Modals ----------
  function closeAllModals() {
    if (el.backdrop.hidden) return;
    el.backdrop.hidden = true;
    el.modalOptions.hidden = true;
    el.modalLeaderboard.hidden = true;
    el.modalPassport.hidden = true;
    el.modalHelp.hidden = true;
    document.getElementById("cg-app").inert = false;
    state.modalTrigger?.focus();
    state.modalTrigger = null;
  }

  function openModal(modalEl) {
    if (el.backdrop.hidden) state.modalTrigger = document.activeElement;
    closeDropdown();
    document.getElementById("cg-app").inert = true;
    el.backdrop.hidden = false;
    modalEl.hidden = false;
    modalEl.querySelector("[data-close-modal]").focus();
  }

  function openOptionsModal() {
    document.getElementById("opt-callsign").value = state.profile.callsign;
    document.getElementById("opt-purist").checked = state.profile.purist;
    document.getElementById("opt-miles").checked = state.profile.miles;
    document.getElementById("opt-sound").checked = state.profile.sound;

    const setsWrap = document.getElementById("opt-country-sets");
    setsWrap.replaceChildren();
    CG.COUNTRY_SETS.forEach((s) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cg-choice-card" + (s.id === state.profile.setId ? " is-selected" : "");
      btn.dataset.setId = s.id;
      btn.innerHTML = `<strong>${s.name}</strong><small>${s.desc}</small>`;
      btn.addEventListener("click", () => {
        setsWrap.querySelectorAll(".cg-choice-card").forEach((x) => x.classList.remove("is-selected"));
        btn.classList.add("is-selected");
      });
      setsWrap.append(btn);
    });

    const decksWrap = document.getElementById("opt-dimension-decks");
    decksWrap.replaceChildren();
    CG.DIMENSION_DECKS.forEach((d) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cg-choice-card" + (d.id === state.profile.deckId ? " is-selected" : "");
      btn.dataset.deckId = d.id;
      btn.innerHTML = `<strong>${d.name}</strong><small>${d.desc}</small>`;
      btn.addEventListener("click", () => {
        decksWrap.querySelectorAll(".cg-choice-card").forEach((x) => x.classList.remove("is-selected"));
        btn.classList.add("is-selected");
      });
      decksWrap.append(btn);
    });

    openModal(el.modalOptions);
  }

  function openLeaderboardModal(tab = state.cadence === "practice" ? "daily" : state.cadence) {
    state.lbTab = tab;
    renderLeaderboard();
    openModal(el.modalLeaderboard);
  }

  function renderLeaderboard() {
    document.querySelectorAll(".cg-lb-tab").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.lb === state.lbTab);
    });

    const periods = getPeriodKeys();
    const tab = state.lbTab;
    const periodKey = tab === "alltime" ? "All-Time" : periods[tab];
    state.leaderboardPeriod = periodKey;
    const infoEl = document.getElementById("lb-period-info");
    const tbody = document.getElementById("lb-tbody");
    const selectedSetup = { setId: state.activeRun.setId, deckId: state.activeRun.deckId, purist: state.activeRun.purist };
    const matchesSetup = (row) => row.setId === selectedSetup.setId &&
      row.deckId === selectedSetup.deckId && Boolean(row.purist) === selectedSetup.purist;

    let rows = [];
    if (tab === "alltime") {
      infoEl.textContent = "All-time results saved on this device, including imported results.";
      rows = state.leaderboard.slice();
    } else {
      const setups = getActiveSet().name + " · " + getActiveDeck().name + (selectedSetup.purist ? " · Purist" : "");
      infoEl.textContent = `${periodKey} UTC · ${setups}. Results saved on this device.`;
      const localRows = state.leaderboard.filter((row) => row && row.cadence === tab && row.periodKey === periodKey);
      rows = [...localRows, ...getBenchmarkField(tab, periodKey)].filter(matchesSetup);
    }

    rows = rows.filter((row) => row && Number.isFinite(row.score) && Number.isFinite(row.timeSec));
    rows.sort((a, b) => b.score - a.score || a.timeSec - b.timeSec);
    rows = rows.slice(0, 20);

    tbody.replaceChildren();
    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" style="text-align:center;color:var(--muted)">No entries yet — complete a challenge to claim #1!</td>`;
      tbody.append(tr);
      return;
    }

    rows.forEach((r, idx) => {
      const tr = document.createElement("tr");
      if (r.isYou) tr.classList.add("is-you");
      const tag = r.isYou
        ? `<span class="cg-tag-you">YOU</span>`
        : r.isBenchmark
          ? `<span class="cg-tag-bench">Benchmark</span>`
          : r.isFriend
            ? `<span class="cg-tag-bench" style="color:var(--cyan)">Friend</span>`
            : "";
      const setLabel = (CG.COUNTRY_SETS.find((s) => s.id === r.setId)?.name || String(r.setId ?? "Unknown setup")).replace(" Population", "");
      const deckName = CG.DIMENSION_DECKS.find((deck) => deck.id === r.deckId)?.name || r.deckId;
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${escapeHtml(r.player)}${tag}</td>
        <td><strong>${r.score.toLocaleString()}</strong></td>
        <td>${escapeHtml(r.resultText)}</td>
        <td>${r.timeSec}s</td>
        <td><small>${escapeHtml(setLabel)} · ${escapeHtml(deckName)}${r.purist ? " · Purist" : ""}</small></td>
      `;
      tbody.append(tr);
    });
  }

  function openPassportModal() {
    const s = state.stats;
    const winPct = s.played ? Math.round((s.won / s.played) * 100) : 0;
    const avgScore = s.won ? Math.round(s.totalScore / s.won) : 0;

    const cards = [
      ["Played", s.played],
      ["Win %", `${winPct}%`],
      ["Streak", s.streak],
      ["Best Streak", s.maxStreak],
      ["Best Score", s.bestScore.toLocaleString()],
      ["Avg Win Score", avgScore.toLocaleString()]
    ];
    const cardsEl = document.getElementById("stats-cards");
    cardsEl.replaceChildren();
    for (const [lbl, val] of cards) {
      const div = document.createElement("div");
      div.className = "cg-stat-card";
      div.innerHTML = `<strong>${val}</strong><span>${lbl}</span>`;
      cardsEl.append(div);
    }

    const distEl = document.getElementById("dist-bars");
    distEl.replaceChildren();
    const maxVal = Math.max(1, ...Object.values(s.dist));
    for (const k of [1, 2, 3, 4, 5, "X"]) {
      const count = s.dist[k] || 0;
      const pct = Math.max(6, Math.round((count / maxVal) * 100));
      const row = document.createElement("div");
      row.className = "cg-dist-row";
      row.innerHTML = `<span>${k}</span><div class="cg-dist-track"><div class="cg-dist-fill" style="width:${pct}%">${count}</div></div>`;
      distEl.append(row);
    }

    const foundCount = Object.keys(state.passport).length;
    document.getElementById("passport-discovered").textContent = String(foundCount);
    const grid = document.getElementById("passport-grid");
    const inspectEl = document.getElementById("passport-inspect");
    inspectEl.hidden = true;
    grid.replaceChildren();

    COUNTRIES.forEach((c) => {
      const stamp = state.passport[c.id];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cg-stamp" + (stamp ? " is-found" : "");
      if (stamp) {
        btn.innerHTML = `<span>${c.flag}</span><span>#${c.rank} ${c.name}</span>`;
        btn.addEventListener("click", () => {
          inspectEl.hidden = false;
          inspectEl.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <strong>${c.flag} ${c.name} (#${c.rank} · ${c.pop}M · Capital: ${c.capital})</strong>
              <span style="color:var(--gold);font-size:0.8rem">Best: ${(stamp.bestScore || 0).toLocaleString()} pts</span>
            </div>
            <div class="cg-almanac-grid" id="pp-inspect-grid"></div>
          `;
          const ig = document.getElementById("pp-inspect-grid");
          DIMENSIONS.forEach((d) => ig.append(renderDimensionCard(c, d.id, false)));
        });
      } else {
        btn.innerHTML = `<span>❔</span><span>#${c.rank} Locked</span>`;
        btn.disabled = true;
      }
      grid.append(btn);
    });

    openModal(el.modalPassport);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[m]));
  }

  function renderAll() {
    renderHeaderAndStatus();
    renderClues();
    renderGuessHistory();
    renderRevealAndAlmanac();
    renderWorldMap();
  }

  // ---------- Event Wiring ----------
  function bindEvents() {
    el.cadenceTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        if (state.cadence === tab.dataset.cadence) return;
        state.cadence = tab.dataset.cadence;
        state.almanacCat = "all";
        resetMapView();
        resetGuessInput();
        loadOrCreateRun();
        renderAll();
      });
    });

    el.btnPeek.addEventListener("click", peekExtraClue);
    el.btnNext.addEventListener("click", advanceNextAction);
    el.btnRanksAfter.addEventListener("click", () => openLeaderboardModal());

    el.btnShare.addEventListener("click", async () => {
      const run = state.activeRun;
      const text = buildShareText();
      const copy = document.getElementById("share-copy");
      try {
        await navigator.clipboard.writeText(text);
        if (state.activeRun !== run) return;
        copy.hidden = true;
        el.shareToast.textContent = "Result and comparison token copied.";
      } catch {
        if (state.activeRun !== run) return;
        copy.value = text;
        copy.hidden = false;
        copy.focus();
        copy.select();
        el.shareToast.textContent = "Copy the selected result to share it.";
      }
      el.shareToast.hidden = false;
    });

    el.input.addEventListener("input", () => {
      el.btnClearInput.hidden = !el.input.value;
      state.ddIndex = -1;
      const matches = filterCountries(el.input.value);
      renderDropdown(matches);
      setFeedback(matches.length ? "" : "No available countries match that search.");
    });

    el.input.addEventListener("focus", () => {
      if (currentRound().status === "playing") renderDropdown(filterCountries(el.input.value));
    });

    el.input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeDropdown();
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const items = state.ddItems.length ? state.ddItems : filterCountries(el.input.value);
        if (!items.length) return;
        const step = event.key === "ArrowDown" ? 1 : -1;
        state.ddIndex = state.ddIndex < 0 && step < 0
          ? items.length - 1
          : Math.max(0, Math.min(items.length - 1, state.ddIndex + step));
        renderDropdown(items);
      }
    });

    el.btnClearInput.addEventListener("click", () => {
      resetGuessInput();
      el.input.focus();
      renderDropdown(filterCountries(""));
    });

    document.addEventListener("focusin", (event) => {
      if (!event.target.closest(".cg-autocomplete-wrap")) closeDropdown();
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".cg-autocomplete-wrap")) closeDropdown();
    });

    el.guessForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = normalizeCountryName(el.input.value);
      const selected = state.ddItems[state.ddIndex];
      const matches = query ? filterCountries(el.input.value) : [];
      const exact = matches.filter((country) => COUNTRY_SEARCH.get(country.id).includes(query));
      const country = selected || (exact.length === 1 ? exact[0] : matches.length === 1 ? matches[0] : null);
      if (!country) {
        setFeedback("Choose a country from the search results.");
        return;
      }
      resetGuessInput();
      submitGuess(country.id);
      if (currentRound().status !== "playing") {
        (state.activeRun.completed ? el.btnShare : el.btnNext).focus();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !el.backdrop.hidden) closeAllModals();
      if (event.key === "Tab" && !el.backdrop.hidden) {
        const modal = el.backdrop.querySelector(".cg-modal:not([hidden])");
        const controls = [...modal.querySelectorAll("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href]")]
          .filter((control) => control.getClientRects().length);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
      if (event.key === "/" && el.backdrop.hidden && currentRound().status === "playing" &&
          !event.target.closest("input, textarea, [contenteditable]") && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        el.input.focus();
      }
    });

    // Modals
    document.getElementById("btn-options").addEventListener("click", openOptionsModal);
    document.getElementById("btn-leaderboard").addEventListener("click", () => openLeaderboardModal());
    document.getElementById("btn-passport").addEventListener("click", openPassportModal);
    document.getElementById("btn-help").addEventListener("click", () => openModal(el.modalHelp));

    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", closeAllModals);
    });
    el.backdrop.addEventListener("click", (e) => {
      if (e.target === el.backdrop) closeAllModals();
    });

    document.getElementById("btn-apply-options").addEventListener("click", () => {
      const selSet = document.querySelector("#opt-country-sets .is-selected")?.dataset.setId || "top100";
      const selDeck = document.querySelector("#opt-dimension-decks .is-selected")?.dataset.deckId || "balanced";
      state.profile.callsign = document.getElementById("opt-callsign").value.trim().toWellFormed() || defaultProfile.callsign;
      state.profile.setId = selSet;
      state.profile.deckId = selDeck;
      state.profile.purist = document.getElementById("opt-purist").checked;
      state.profile.miles = document.getElementById("opt-miles").checked;
      state.profile.sound = document.getElementById("opt-sound").checked;
      saveJSON(STORAGE_KEYS.profile, state.profile);
      closeAllModals();
      const previousKey = state.activeRun.key;
      loadOrCreateRun();
      if (state.activeRun.key !== previousKey) {
        state.almanacCat = "all";
        resetGuessInput();
        resetMapView();
      }
      renderAll();
      if (currentRound().status === "playing") el.input.focus();
    });

    document.getElementById("btn-reset-official").addEventListener("click", () => {
      for (const card of document.querySelectorAll(".cg-choice-card")) {
        card.classList.toggle("is-selected", card.dataset.setId === "top100" || card.dataset.deckId === "balanced");
      }
      document.getElementById("opt-purist").checked = false;
    });

    document.querySelectorAll(".cg-lb-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.lbTab = btn.dataset.lb;
        renderLeaderboard();
      });
    });

    document.getElementById("btn-import-score").addEventListener("click", () => {
      const inputEl = document.getElementById("lb-import-code");
      const msgEl = document.getElementById("lb-import-msg");
      const res = importShareToken(inputEl.value);
      msgEl.textContent = res.msg;
      msgEl.style.color = res.ok ? "#6ee7b7" : "#fb7185";
      if (res.ok) {
        inputEl.value = "";
        renderLeaderboard();
      }
    });

    // Map Zoom / Pan / Tooltip
    document.getElementById("btn-zoom-in").addEventListener("click", () => {
      state.mapView.zoom = Math.min(4.5, state.mapView.zoom * 1.35);
      renderWorldMap();
    });
    document.getElementById("btn-zoom-out").addEventListener("click", () => {
      state.mapView.zoom = Math.max(1, state.mapView.zoom / 1.35);
      if (state.mapView.zoom === 1) resetMapView();
      renderWorldMap();
    });
    document.getElementById("btn-zoom-reset").addEventListener("click", () => {
      resetMapView();
      renderWorldMap();
    });

    el.mapCanvas.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || state.mapView.zoom === 1 || state.mapView.dragging) return;
      state.mapView.dragging = true;
      el.mapCanvas.setPointerCapture(e.pointerId);
      state.mapView.lastX = e.clientX;
      state.mapView.lastY = e.clientY;
    });
    el.mapCanvas.addEventListener("lostpointercapture", () => { state.mapView.dragging = false; });
    el.mapCanvas.addEventListener("pointermove", (e) => {
      const rect = el.mapCanvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (state.mapView.dragging && state.mapView.zoom > 1) {
        state.mapView.panX += e.clientX - state.mapView.lastX;
        state.mapView.panY += e.clientY - state.mapView.lastY;
        state.mapView.lastX = e.clientX;
        state.mapView.lastY = e.clientY;
        renderWorldMap();
        return;
      }

      const hit = plottedPins.find((p) => Math.hypot(p.x - mx, p.y - my) < 12);
      if (hit) {
        const distTxt =
          hit.km === 0
            ? "Target"
            : state.activeRun.purist
              ? "Guessed"
              : state.profile.miles
                ? `${Math.round(hit.km * 0.621371).toLocaleString()} mi`
                : `${hit.km.toLocaleString()} km`;
        el.mapTooltip.textContent = `#${hit.idx} ${hit.country.flag} ${hit.country.name} (${distTxt})`;
        el.mapTooltip.style.left = `${Math.max(6, Math.min(rect.width - 160, mx + 10))}px`;
        el.mapTooltip.style.top = `${Math.max(6, my - 28)}px`;
        el.mapTooltip.hidden = false;
      } else {
        el.mapTooltip.hidden = true;
      }
    });
    el.mapCanvas.addEventListener("mouseleave", () => { el.mapTooltip.hidden = true; });
    new ResizeObserver(renderWorldMap).observe(el.mapCanvas);
  }

  // ---------- Live Countdown & Reset Watcher ----------
  function tickTimers() {
    const now = new Date();
    const cd = getCountdowns(now);
    el.timerHourly.textContent = cd.hourly;
    el.timerDaily.textContent = cd.daily;
    el.timerWeekly.textContent = cd.weekly;

    const periods = getPeriodKeys(now);
    if (state.cadence !== "practice" && periods[state.cadence] !== state.activeRun.periodKey) {
      state.almanacCat = "all";
      resetGuessInput();
      resetMapView();
      loadOrCreateRun();
      renderAll();
    }
    if (!el.modalLeaderboard.hidden && state.lbTab !== "alltime" &&
        state.leaderboardPeriod !== periods[state.lbTab]) renderLeaderboard();
  }

  // ---------- Boot ----------
  bindEvents();
  loadOrCreateRun();
  renderAll();
  tickTimers();
  setInterval(tickTimers, 1000);
})();
