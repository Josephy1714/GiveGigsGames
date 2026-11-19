// Ship Classes, Modular Upgrades, Liveries, Weapon Loadouts, and Pilot Career Modifiers

export const SHIP_CLASSES = {
  vanguard: {
    id: 'vanguard',
    name: 'Vanguard Mk-I Starfighter',
    role: 'Balanced Multirole Fighter',
    cost: 0,
    hull: 100,
    shield: 100,
    speed: 225,
    agility: 1.0,
    cannons: 2,
    missileMax: 8,
    cargoCap: 20,
    miningBonus: 1.0,
    fleetDmgBonus: 1.0,
    passiveIncome: 0,
    scale: 0.55,
    hitRadius: 8,
    summary: 'Agile fleet-standard arrowhead fighter with balanced shields, dual plasma mounts, and quad missile bays.'
  },
  dart: {
    id: 'dart',
    name: 'Zephyr Interceptor',
    role: 'High-Speed Interceptor',
    cost: 8500,
    hull: 85,
    shield: 95,
    speed: 305,
    agility: 1.35,
    cannons: 2,
    missileMax: 6,
    cargoCap: 12,
    miningBonus: 0.9,
    fleetDmgBonus: 1.0,
    passiveIncome: 0,
    scale: 0.52,
    hitRadius: 7.2,
    summary: 'Razor-winged reconnaissance interceptor built for blistering dogfight speed and tight cornering.'
  },
  gunship: {
    id: 'gunship',
    name: 'Aegis Heavy Gunship',
    role: 'Armored Assault Gunship',
    cost: 45000,
    hull: 210,
    shield: 190,
    speed: 215,
    agility: 0.92,
    cannons: 4,
    missileMax: 12,
    cargoCap: 35,
    miningBonus: 1.1,
    fleetDmgBonus: 1.05,
    passiveIncome: 0,
    scale: 0.64,
    hitRadius: 9.2,
    summary: 'Quad-cannon assault gunship packing reinforced armor plating and twin dorsal defense turrets.'
  },
  corvette: {
    id: 'corvette',
    name: 'Valkyrie Strike Corvette',
    role: 'Deep-Space Strike & Mining',
    cost: 180000,
    hull: 380,
    shield: 340,
    speed: 200,
    agility: 0.82,
    cannons: 4,
    missileMax: 16,
    cargoCap: 60,
    miningBonus: 1.3,
    fleetDmgBonus: 1.12,
    passiveIncome: 0,
    scale: 0.72,
    hitRadius: 10.6,
    summary: 'Industrial-military corvette with 60-unit ore hold, +30% mining extraction, and heavy missile racks.'
  },
  frigate: {
    id: 'frigate',
    name: 'Hyperion Fleet Frigate',
    role: 'Squadron Command Warship',
    cost: 950000,
    hull: 720,
    shield: 620,
    speed: 185,
    agility: 0.70,
    cannons: 6,
    missileMax: 24,
    cargoCap: 100,
    miningBonus: 1.25,
    fleetDmgBonus: 1.25,
    passiveIncome: 0,
    scale: 0.84,
    hitRadius: 12.2,
    summary: 'Six-cannon fleet command ship boosting wingman weapon output by +25% with massive shield reserves.'
  },
  sovereign: {
    id: 'sovereign',
    name: 'Sovereign Star-Yacht Dreadnought',
    role: 'Flagship Capital Cruiser',
    cost: 15000000,
    hull: 1400,
    shield: 1250,
    speed: 220,
    agility: 0.75,
    cannons: 6,
    missileMax: 32,
    cargoCap: 200,
    miningBonus: 1.4,
    fleetDmgBonus: 1.35,
    passiveIncome: 120,
    scale: 0.96,
    hitRadius: 13.8,
    summary: 'Executive gilded flagship combining dreadnought firepower, 200t cargo bay, and +120 CR/s charter revenue.'
  }
};

export const SHIP_CLASS_ORDER = ['vanguard', 'dart', 'gunship', 'corvette', 'frigate', 'sovereign'];

export const UPGRADE_COSTS = [1500, 5000, 16000, 50000, 160000];

export const UPGRADE_TRACKS = [
  {
    id: 'engines',
    name: 'Impulse Thrusters',
    maxLevel: 5,
    costs: UPGRADE_COSTS,
    effectText: '+8% max speed, +6% turn agility, +15% boost capacity per level'
  },
  {
    id: 'shields',
    name: 'Deflector Grid',
    maxLevel: 5,
    costs: UPGRADE_COSTS,
    effectText: '+18% shield capacity and +20% shield recharge rate per level'
  },
  {
    id: 'hull',
    name: 'Titanium Bulkheads',
    maxLevel: 5,
    costs: UPGRADE_COSTS,
    effectText: '+20% hull integrity and reinforced collision plating per level'
  },
  {
    id: 'weapons',
    name: 'Weapon Capacitors',
    maxLevel: 5,
    costs: UPGRADE_COSTS,
    effectText: '+12% weapon damage and +12% heat dissipation per level'
  },
  {
    id: 'missiles',
    name: 'Ordnance Bays',
    maxLevel: 5,
    costs: UPGRADE_COSTS,
    effectText: '+2 missile capacity, faster reload, and +12% missile damage per level'
  },
  {
    id: 'scanner',
    name: 'Tractor & Sensor Array',
    maxLevel: 5,
    costs: UPGRADE_COSTS,
    effectText: '+18m tractor beam range and +10% salvage/ore yield per level'
  }
];

export const SHIP_LIVERIES = [
  {
    id: 'starfleet-cyan',
    name: 'Starfleet Cyan',
    armorHex: 0xdce8ed,
    darkHex: 0x10273b,
    accentHex: 0x54f5ee,
    glowHex: 0xffb969,
    cost: 0
  },
  {
    id: 'emerald-sentinel',
    name: 'Emerald Sentinel',
    armorHex: 0xd0f0e0,
    darkHex: 0x0b2b20,
    accentHex: 0x10b981,
    glowHex: 0x34d399,
    cost: 1200
  },
  {
    id: 'crimson-corsair',
    name: 'Crimson Corsair',
    armorHex: 0xf1d6d8,
    darkHex: 0x321018,
    accentHex: 0xf43f5e,
    glowHex: 0xfbbf24,
    cost: 2500
  },
  {
    id: 'obsidian-stealth',
    name: 'Obsidian Stealth',
    armorHex: 0x262e3d,
    darkHex: 0x090d14,
    accentHex: 0x38bdf8,
    glowHex: 0x06b6d4,
    cost: 6000
  },
  {
    id: 'nebula-violet',
    name: 'Nebula Violet',
    armorHex: 0xe6dcf8,
    darkHex: 0x231442,
    accentHex: 0xa855f7,
    glowHex: 0xf472b6,
    cost: 12000
  },
  {
    id: 'solar-gold',
    name: 'Solar Gold',
    armorHex: 0xfef0c7,
    darkHex: 0x2a1f0b,
    accentHex: 0xfbbf24,
    glowHex: 0x54f5ee,
    cost: 40000
  }
];

export const WEAPON_TYPES = {
  plasma: {
    id: 'plasma',
    name: 'Dual Plasma Cannons',
    shortName: 'PLASMA',
    damage: 42,
    speed: 980,
    cooldown: 0.22,
    heat: 10,
    shieldMult: 1.0,
    asteroidMult: 1.0,
    ionStun: 0,
    color: 0x54f5ee,
    desc: 'Balanced coherent plasma bolts effective against shields and hulls.'
  },
  rapid: {
    id: 'rapid',
    name: 'Rapid Pulse Blasters',
    shortName: 'RAPID',
    damage: 21,
    speed: 1180,
    cooldown: 0.10,
    heat: 5.5,
    shieldMult: 0.95,
    asteroidMult: 0.95,
    ionStun: 0,
    color: 0x34d399,
    desc: 'High-velocity twin pulse repeaters ideal for intercepting agile scouts.'
  },
  ion: {
    id: 'ion',
    name: 'Ion EMP Disruptor',
    shortName: 'ION EMP',
    damage: 34,
    speed: 860,
    cooldown: 0.34,
    heat: 18,
    shieldMult: 1.6,
    asteroidMult: 0.7,
    ionStun: 2.4,
    color: 0x818cf8,
    desc: 'Strips enemy shields (+60%) and stuns thrusters for 2.4s.'
  },
  mining: {
    id: 'mining',
    name: 'High-Yield Mining Laser',
    shortName: 'MINING',
    damage: 24,
    speed: 1050,
    cooldown: 0.16,
    heat: 7,
    shieldMult: 0.85,
    asteroidMult: 3.2,
    ionStun: 0,
    color: 0xfbbf24,
    desc: 'Superheated industrial beam that shatters ore asteroids 3.2x faster.'
  }
};

export const WEAPON_ORDER = ['plasma', 'rapid', 'ion', 'mining'];

export function getShipClass(classId) {
  return SHIP_CLASSES[classId] || SHIP_CLASSES.vanguard;
}

export function getLivery(liveryId) {
  return SHIP_LIVERIES.find(item => item.id === liveryId) || SHIP_LIVERIES[0];
}

export function getWeaponDef(weaponId) {
  return WEAPON_TYPES[weaponId] || WEAPON_TYPES.plasma;
}

export function normalizeUpgrades(upgrades) {
  const clean = {};
  for (const track of UPGRADE_TRACKS) {
    const val = Number(upgrades?.[track.id] || 0);
    clean[track.id] = Math.max(0, Math.min(track.maxLevel, Math.floor(val)));
  }
  return clean;
}

export function getPilotBonuses(pilotLife) {
  const skills = Math.max(0, Math.min(6, Math.floor(Number(pilotLife?.skills || 0))));
  const connections = Math.max(0, Math.min(8, Math.floor(Number(pilotLife?.connections || 0))));
  const discountPct = connections * 3;
  return {
    skills,
    connections,
    damageMult: 1 + skills * 0.05,
    miningMult: 1 + skills * 0.06,
    agilityMult: 1 + skills * 0.04,
    discountPct,
    discountMult: 1 - discountPct / 100,
    contractTier: Math.min(5, 1 + Math.floor(connections / 2))
  };
}

export function getEffectiveShipStats(classId, upgrades, pilotLife) {
  const ship = getShipClass(classId);
  const lv = normalizeUpgrades(upgrades);
  const pilot = getPilotBonuses(pilotLife);

  const maxHull = Math.round(ship.hull * (1 + lv.hull * 0.20));
  const maxShield = Math.round(ship.shield * (1 + lv.shields * 0.18));
  const shieldRegen = 2.8 * (1 + lv.shields * 0.20) * (ship.shield / 100);
  const maxSpeed = Math.round(ship.speed * (1 + lv.engines * 0.08));
  const agility = Number((ship.agility * (1 + lv.engines * 0.06) * pilot.agilityMult).toFixed(3));
  const maxBoostEnergy = Math.round(100 * (1 + lv.engines * 0.15));
  const weaponDamageMult = Number(((1 + lv.weapons * 0.12) * pilot.damageMult).toFixed(3));
  const heatDissipation = 26 * (1 + lv.weapons * 0.12);
  const missileMax = ship.missileMax + lv.missiles * 2;
  const missileDamage = Math.round(68 * (1 + lv.missiles * 0.12) * pilot.damageMult);
  const missileReloadTime = Math.max(1.8, 4.2 - lv.missiles * 0.38);
  const tractorRange = 55 + lv.scanner * 18;
  const salvageYieldMult = Number(((1 + lv.scanner * 0.10) * pilot.miningMult).toFixed(3));
  const miningMult = Number(((ship.miningBonus || 1.0) * (1 + lv.scanner * 0.10) * pilot.miningMult).toFixed(3));

  return {
    classId: ship.id,
    name: ship.name,
    role: ship.role,
    maxHull,
    maxShield,
    shieldRegen,
    maxSpeed,
    agility,
    maxBoostEnergy,
    cannons: ship.cannons,
    weaponDamageMult,
    heatDissipation,
    missileMax,
    missileDamage,
    missileReloadTime,
    cargoCap: ship.cargoCap,
    tractorRange,
    salvageYieldMult,
    miningMult,
    fleetDmgBonus: ship.fleetDmgBonus || 1.0,
    passiveIncome: ship.passiveIncome || 0,
    scale: ship.scale,
    hitRadius: ship.hitRadius,
    upgrades: lv,
    pilot
  };
}

export function getUpgradeCost(trackId, currentLevel, pilotLife) {
  const track = UPGRADE_TRACKS.find(t => t.id === trackId);
  if (!track || currentLevel >= track.maxLevel) return null;
  const base = track.costs[Math.max(0, currentLevel)] || track.costs[track.costs.length - 1];
  const { discountMult } = getPilotBonuses(pilotLife);
  return Math.max(100, Math.round(base * discountMult));
}

export function getShipCost(classId, pilotLife) {
  const ship = getShipClass(classId);
  if (!ship.cost) return 0;
  const { discountMult } = getPilotBonuses(pilotLife);
  return Math.round(ship.cost * discountMult);
}

export function getLiveryCost(liveryId, pilotLife) {
  const livery = getLivery(liveryId);
  if (!livery.cost) return 0;
  const { discountMult } = getPilotBonuses(pilotLife);
  return Math.round(livery.cost * discountMult);
}
