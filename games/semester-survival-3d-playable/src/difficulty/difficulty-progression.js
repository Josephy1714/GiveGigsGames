export const DIFFICULTY_MILESTONES = Object.freeze([
  Object.freeze({ distance: 0, progress: 0, band: "Beginner" }),
  Object.freeze({ distance: 500, progress: 0.2, band: "Intermediate" }),
  Object.freeze({ distance: 1500, progress: 0.4, band: "Advanced" }),
  Object.freeze({ distance: 3000, progress: 0.7, band: "Expert" }),
  Object.freeze({ distance: 5000, progress: 1, band: "Master" })
]);

export const DEFAULT_DIFFICULTY_CONFIG = Object.freeze({
  milestones: DIFFICULTY_MILESTONES,
  playerSpeedMultiplier: Object.freeze([1, 1.25]),
  trafficSpeedMultiplier: Object.freeze([1, 1.18]),
  trafficFrequencyMultiplier: Object.freeze([1, 1.12]),
  trafficDensityMultiplier: Object.freeze([1, 1.12]),
  spawnIntervalSeconds: Object.freeze([3.1, 2.35]),
  obstacleChance: Object.freeze([0.14, 0.42]),
  vehicleChance: Object.freeze([0.14, 0.22]),
  multiLanePatternChance: Object.freeze([0, 0.12]),
  rampVehicleChance: Object.freeze([0.015, 0.06])
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = value => value * value * (3 - 2 * value);
const interpolate = ([start, end], progress) => start + (end - start) * progress;

function resolveProgress(distance, milestones) {
  const d = Math.max(0, Number.isFinite(Number(distance)) ? Number(distance) : 0);
  if (d >= milestones[milestones.length - 1].distance) return 1;
  for (let index = 1; index < milestones.length; index += 1) {
    const previous = milestones[index - 1];
    const next = milestones[index];
    if (d <= next.distance) {
      const segment = clamp((d - previous.distance) / (next.distance - previous.distance), 0, 1);
      return previous.progress + (next.progress - previous.progress) * smoothstep(segment);
    }
  }
  return 1;
}

export function getDifficultyProfile(distance, config = DEFAULT_DIFFICULTY_CONFIG) {
  const d = Math.max(0, Number.isFinite(Number(distance)) ? Number(distance) : 0);
  const milestones = config.milestones || DIFFICULTY_MILESTONES;
  const progress = resolveProgress(d, milestones);
  const band = milestones.reduce((current, milestone) => d >= milestone.distance ? milestone.band : current, milestones[0].band);
  return Object.freeze({
    distance: d,
    band,
    progress,
    playerSpeedMultiplier: interpolate(config.playerSpeedMultiplier, progress),
    trafficSpeedMultiplier: interpolate(config.trafficSpeedMultiplier, progress),
    trafficFrequencyMultiplier: interpolate(config.trafficFrequencyMultiplier, progress),
    trafficDensityMultiplier: interpolate(config.trafficDensityMultiplier, progress),
    spawnIntervalSeconds: interpolate(config.spawnIntervalSeconds, progress),
    obstacleChance: interpolate(config.obstacleChance, progress),
    vehicleChance: interpolate(config.vehicleChance, progress),
    multiLanePatternChance: interpolate(config.multiLanePatternChance, progress),
    rampVehicleChance: interpolate(config.rampVehicleChance, progress)
  });
}

export function getCampaignDifficultyProfile(semester, distance, finishDistance) {
  const sem = clamp(Math.trunc(Number(semester) || 1), 1, 8);
  const finish = Math.max(1, Number(finishDistance) || 1000);
  const progress = smoothstep(clamp((Number(distance) || 0) / finish, 0, 1));
  const semesterRamp = (sem - 1) / 7;
  const lerp = (a, b, t) => a + (b - a) * t;
  return Object.freeze({
    distance: Math.max(0, Number(distance) || 0),
    band: progress < .25 ? "Intermediate" : progress < .5 ? "Advanced" : progress < .78 ? "Expert" : "Master",
    progress,
    playerSpeedMultiplier: lerp(lerp(1.18, 1.48, semesterRamp), lerp(1.68, 2.08, semesterRamp), progress),
    trafficSpeedMultiplier: lerp(lerp(1.12, 1.34, semesterRamp), lerp(1.58, 1.92, semesterRamp), progress),
    trafficFrequencyMultiplier: lerp(lerp(1.12, 1.28, semesterRamp), lerp(1.38, 1.5, semesterRamp), progress),
    trafficDensityMultiplier: lerp(lerp(1.04, 1.16, semesterRamp), lerp(1.28, 1.42, semesterRamp), progress),
    spawnIntervalSeconds: lerp(lerp(2.05, 1.55, semesterRamp), lerp(1.02, .62, semesterRamp), progress),
    obstacleChance: lerp(lerp(.3, .42, semesterRamp), lerp(.7, .86, semesterRamp), progress),
    vehicleChance: lerp(.2, .25, semesterRamp) + progress * lerp(.08, .16, semesterRamp),
    multiLanePatternChance: lerp(.06, .18, semesterRamp) + progress * lerp(.22, .34, semesterRamp),
    rampVehicleChance: lerp(.025, .05, semesterRamp) + progress * lerp(.055, .09, semesterRamp)
  });
}

export function getTrafficSpawnLayout(profile = {}) {
  const progress = clamp(Number(profile.progress) || 0, 0, 1);
  const frequency = clamp(Number(profile.trafficFrequencyMultiplier) || 1, 1, 1.55);
  const density = clamp(Number(profile.trafficDensityMultiplier) || 1, 1, 1.45);
  const activeVehicleCount = 6 + Number(progress >= 0.4) + Number(progress >= 0.7);
  return Object.freeze({ activeVehicleCount, spacing: 43 / (frequency * density) });
}
