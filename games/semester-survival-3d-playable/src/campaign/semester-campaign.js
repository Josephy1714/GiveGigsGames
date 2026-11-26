export const SEMESTER_CAMPAIGN = Object.freeze([
  { number: 1, name: "Freshman Rush", finishDistance: 1000, bossDistance: 800, environment: "freshman-campus", district: "CHIROMO CAMPUS", bossId: "campus-sentinel", vehicleSet: "campus-service", warningDistance: 750, tips: ["Learn the three lanes before increasing speed.", "Campus shuttles can hide smaller obstacles.", "Keep a clear lane ready for the final stretch."], rewards: { coins: 120, title: "First Steps" } },
  { number: 2, name: "City Pressure", finishDistance: 1250, bossDistance: 1000, environment: "nairobi-city", district: "NAIROBI CITY", bossId: "matatu-overlord", vehicleSet: "urban-transit", warningDistance: 937.5, tips: ["Watch junction traffic for changing lanes.", "Give colourful city transport room to pass.", "Avoid committing to a blocked lane."], rewards: { coins: 160, title: "City Runner" } },
  { number: 3, name: "Academic Pressure", finishDistance: 1500, bossDistance: 1200, environment: "research-district", district: "RESEARCH DISTRICT", bossId: "archive-warden", vehicleSet: "research-transport", warningDistance: 1125, tips: ["Research equipment can occupy unusual road space.", "Read obstacle combinations early.", "Save your safest lane for the final approach."], rewards: { coins: 200, title: "Research Ready" } },
  { number: 4, name: "Survival Mode", finishDistance: 1750, bossDistance: 1400, environment: "construction-zone", district: "CAMPUS CONSTRUCTION ZONE", bossId: "excavator-titan", vehicleSet: "industrial-rigs", warningDistance: 1312.5, tips: ["Construction barriers may narrow your options.", "Look ahead for machinery movement.", "Do not jump and slide on instinct; read the hazard."], rewards: { coins: 240, title: "Site Survivor" } },
  { number: 5, name: "Deadline Crisis", finishDistance: 2000, bossDistance: 1600, environment: "rainy-neon-city", district: "NEON CITY", bossId: "deadline-interceptor", vehicleSet: "neon-service", warningDistance: 1500, tips: ["Rain reduces visual contrast; focus on silhouettes.", "Watch reflections without losing sight of hazards.", "Make lane changes early in tunnel sections."], rewards: { coins: 280, title: "Deadline Dodger" } },
  { number: 6, name: "Campus Nightmare", finishDistance: 2250, bossDistance: 1800, environment: "advanced-research-campus", district: "ADVANCED RESEARCH CAMPUS", bossId: "security-prototype", vehicleSet: "automated-security", warningDistance: 1687.5, tips: ["Automated transport can change lanes quickly.", "Security gates reward precise timing.", "Keep enough energy for the final encounter."], rewards: { coins: 320, title: "Nightmare Tested" } },
  { number: 7, name: "Final Preparations", finishDistance: 2500, bossDistance: 2000, environment: "mountain-highway", district: "MOUNTAIN HIGHWAY", bossId: "ridgebreaker", vehicleSet: "mountain-rescue", warningDistance: 1875, tips: ["Bridges and cliffs make lane discipline essential.", "Read tunnel exits before changing lanes.", "Avoid late moves near exposed road edges."], rewards: { coins: 380, title: "Almost There" } },
  { number: 8, name: "Graduation Run", finishDistance: 3000, bossDistance: 2400, environment: "graduation-district", district: "GRADUATION DISTRICT", bossId: "experimental-pursuit", vehicleSet: "graduation-interceptors", warningDistance: 2250, tips: ["This is the longest and most demanding run.", "Expect layered attacks and keep reacting to telegraphs.", "Save your cleanest movement for the final assault."], rewards: { coins: 600, title: "Graduate" } }
].map(Object.freeze));

export const CAMPAIGN_PHASES = Object.freeze({
  BRIEFING: "briefing", RUNNING: "running", WARNING: "boss-warning",
  BOSS: "boss-encounter", VICTORY: "victory", CELEBRATION: "celebration",
  RESULTS: "results", FAILED: "failed"
});

export function getSemesterConfig(number) {
  const index = Math.max(1, Math.min(8, Math.trunc(Number(number) || 1))) - 1;
  return SEMESTER_CAMPAIGN[index];
}

export function createCampaignState(semester = 1) {
  return { semester: getSemesterConfig(semester).number, phase: CAMPAIGN_PHASES.BRIEFING,
    distance: 0, bossHealth: 100, bossDefeated: false, warningShown: false,
    completed: false, unlockedThrough: Math.max(1, Math.min(8, Math.trunc(Number(semester) || 1))) };
}

export function startCampaignRun(state) {
  if (!state || state.phase !== CAMPAIGN_PHASES.BRIEFING) return state;
  return { ...state, phase: CAMPAIGN_PHASES.RUNNING };
}

/** Advance only from accumulated world distance. Completion freezes distance at the exact target. */
export function advanceCampaign(state, accumulatedDistance) {
  if (!state || ![CAMPAIGN_PHASES.RUNNING, CAMPAIGN_PHASES.WARNING, CAMPAIGN_PHASES.BOSS].includes(state.phase)) return state;
  const config = getSemesterConfig(state.semester);
  const distance = Math.max(state.distance, Math.min(config.finishDistance, Number(accumulatedDistance) || 0));
  let next = { ...state, distance };
  if (!next.warningShown && distance >= config.warningDistance) {
    next.warningShown = true;
    next.phase = CAMPAIGN_PHASES.WARNING;
    return next;
  }
  if (distance >= config.bossDistance && !next.bossDefeated) {
    next.phase = CAMPAIGN_PHASES.BOSS;
    next.arenaCleared = true;
  }
  if (distance >= config.finishDistance) {
    if (next.bossDefeated) {
      next.distance = config.finishDistance;
      next.phase = CAMPAIGN_PHASES.VICTORY;
      next.completed = true;
      next.unlockedThrough = Math.min(8, Math.max(next.unlockedThrough, next.semester + 1));
    } else {
      next.distance = config.finishDistance;
      next.phase = CAMPAIGN_PHASES.FAILED;
    }
  }
  return next;
}

export function damageCampaignBoss(state, damage) {
  if (!state || state.phase !== CAMPAIGN_PHASES.BOSS || state.bossDefeated) return state;
  const bossHealth = Math.max(0, state.bossHealth - Math.max(0, Number(damage) || 0));
  if (bossHealth > 0) return { ...state, bossHealth };
  return { ...state, bossHealth: 0, bossDefeated: true, phase: CAMPAIGN_PHASES.BOSS };
}

export function beginCampaignCelebration(state) {
  if (!state || state.phase !== CAMPAIGN_PHASES.VICTORY) return state;
  return { ...state, phase: CAMPAIGN_PHASES.CELEBRATION };
}

export function showCampaignResults(state) {
  if (!state || state.phase !== CAMPAIGN_PHASES.CELEBRATION) return state;
  return { ...state, phase: CAMPAIGN_PHASES.RESULTS };
}
