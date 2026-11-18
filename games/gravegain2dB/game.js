/* GraveGain2dB: Breach MoonRock — generated breach roguelite (v0.4.2).
 *
 * 2D horizontal side-scrolling run-and-gun: run right, jump/dash with
 * coyote time + jump buffering + i-frames, aim 360, collapse supports,
     * rescue a roster, rewind through recruited lives, and extract.
 *
 * Vanilla IIFE, idempotent. Rules core (newRun/tick/score) is pure: no
 * document/canvas/localStorage/fetch/eval — DOM lives only in the view
 * layer below the "---- View ----" marker. Sibling terrain/player/campaign
 * modules are reused BY REFERENCE when present (tuning passed in via opts
 * from the view layer); the scaffold is fully playable with zero deps.
 *
 * Save separation: ALL keys live under `gravegain2dB.*`. This bundle MUST
 * NOT read or write `gravegain2dA.*` keys. Canonical slug `gravegain2dB`
 * (mixed case); lowercase `gravegain2db` is a compat redirect owned by the
 * site integrator, never rewritten here.
 */
(function () {
    'use strict';
    if (typeof window === 'undefined') return;
    if (window.GraveGain2dB && window.GraveGain2dB.VERSION) return;

    var VERSION = '0.4.2-roguelite';
    var SAVE_KEY = 'gravegain2dB.shell.v1';
    var SAVE_VERSION = 1;

    /* Fixed timestep: exactly 1/60 sim step; view clamps frame delta 0.1s. */
    var DT = 1 / 60;
    var VIEW_WIDTH = 960, VIEW_HEIGHT = 540, FLOOR_Y = 430;
    var GRAV = 2200;          // px/s^2
    var MOVE = 365;           // px/s run speed
    var AIR_CTL = 0.9;       // air steering factor
    var JUMP_V = 820;         // px/s jump velocity
    var COYOTE = 0.10;        // s forgiving ledge grace
    var JBUF = 0.12;          // s jump buffer
    var DASH_V = 780;         // px/s dash velocity
    var DASH_T = 0.16;        // s dash duration
    var DASH_CD = 0.72;        // s dash cooldown
    var IFRAMES = 0.25;       // s dash invulnerability

    var HEROES = {
        lisa:    { name: 'Lisa Park',  emoji: 'HERO_LISA',    hp: 100, armor: 25, skill: 'Thruster Kick' },
        arty:    { name: 'Arty Fisher', emoji: 'HERO_ARTY',   hp: 100, armor: 25, skill: 'Remote Charge' },
        groknak: { name: 'Groknak',    emoji: 'HERO_GROK',    hp: 140, armor: 15, skill: 'Rage Ram' },
        valley:  { name: 'Valley Net', emoji: 'HERO_VALLEY',  hp: 90,  armor: 40, skill: 'Signal Pulse' }
    };

    /* Four races x four classes. Every combination has a tuned body, kit,
       active and melee move; the race/class identity persists on rescue. */
    var RACES = [
        { id: 'human', name: 'Human', emoji: '👩‍🚀', hp: 100, armor: 24, speed: 1.02, jump: 1.02 },
        { id: 'elf', name: 'Elf', emoji: '🧝‍♀️', hp: 86, armor: 14, speed: 1.13, jump: 1.18 },
        { id: 'dwarf', name: 'Dwarf', emoji: '🧔🏻', hp: 132, armor: 34, speed: 0.86, jump: 0.88 },
        { id: 'orc', name: 'Orc', emoji: '🟢👹', hp: 116, armor: 18, speed: 1.08, jump: 0.96 }
    ];
    var CLASSES = [
        { id: 'warrior', name: 'Warrior', ability: 'Breach Dash', melee: 'Power strike', weapon: 'saw', damage: 1.18 },
        { id: 'tank', name: 'Tank', ability: 'Bulwark', melee: 'Shield bash', weapon: 'scatter', damage: 0.92 },
        { id: 'support', name: 'Support', ability: 'Supply Drop', melee: 'Shock baton', weapon: 'harpoon', damage: 0.96 },
        { id: 'mage', name: 'Mage', ability: 'Arc Pulse', melee: 'Arc blade', weapon: 'moonbeam', damage: 1.05 }
    ];
    /* Starter weapon per race x class: every combo gets its own flavor, so
     * race AND class both change what you shoot with. All starters are
     * infinite-ammo and solo-viable; loot still outscales them. */
    var STARTER_BY_BUILD = {
        'human:warrior': 'pulse', 'human:tank': 'scatter', 'human:support': 'harpoon', 'human:mage': 'moonbeam',
        'elf:warrior': 'saw', 'elf:tank': 'harpoon', 'elf:support': 'cryo', 'elf:mage': 'moonbeam',
        'dwarf:warrior': 'saw', 'dwarf:tank': 'scatter', 'dwarf:support': 'sun', 'dwarf:mage': 'cryo',
        'orc:warrior': 'launcher', 'orc:tank': 'sun', 'orc:support': 'saw', 'orc:mage': 'scatter'
    };
    var BUILDS = {};
    var BUILD_TITLES = { 'human:warrior':'Soldier','human:tank':'Paladin','human:support':'Medic','human:mage':'Tinkerer', 'elf:warrior':'Warden','elf:tank':'Paladin','elf:support':'Druid','elf:mage':'Warlock', 'dwarf:warrior':'Berserker','dwarf:tank':'Brute','dwarf:support':'Tinkerer','dwarf:mage':'Warlock', 'orc:warrior':'Berserker','orc:tank':'Brute','orc:support':'Medic','orc:mage':'Druid' };
    RACES.forEach(function (r, ri) { CLASSES.forEach(function (c, ci) {
        var id = r.id + ':' + c.id;
        BUILDS[id] = { id: id, race: r.id, cls: c.id, name: r.name + ' ' + (BUILD_TITLES[id] || c.name), emoji: r.emoji,
            hp: r.hp + (ci === 1 ? 12 : ci === 2 ? 4 : 0), armor: r.armor + (ci === 1 ? 16 : ci === 2 ? 4 : 0),
            speed: r.speed * (c.id === 'warrior' ? 1.02 : 1), jump: r.jump, damage: c.damage,
            weapon: STARTER_BY_BUILD[id] || c.weapon, ability: ['Jet Burst','Nature Burst','Stone Form','Rage Stomp'][ri] + ' / ' + c.ability,
            melee: r.id + ' ' + c.melee, abilityKind: ['dash','snare','guard','shock'][ri], meleeDamage: 25 + ri * 3 + ci * 2 };
    }); });

    var SPECIES = [
        { name: 'Elf', emoji: '🧝‍♀️' }, { name: 'Human', emoji: '👩‍🚀' },
        { name: 'Dwarf', emoji: '🧔🏻' }, { name: 'Orc', emoji: '👹' }
    ];

    var WEAPONS = {
        pulse:   { name: 'Breach rifle',    cd: 0.105, dmg: 18, speed: 1050, pierce: true },
        scatter: { name: 'Scatter blaster', cd: 0.38,  dmg: 12, speed: 780, pellets: 7 },
        launcher:{ name: 'Grave launcher',  cd: 0.62,  dmg: 54, speed: 600, blast: 126 },
        moonbeam:{ name: 'Moonbeam',        cd: 0.07,  dmg: 9,  speed: 1150, pierce: true },
        saw:     { name: 'Forged saw',      cd: 0.22,  dmg: 26, speed: 700, life: 0.32 },
        cryo:    { name: 'Cryo charm',      cd: 0.16,  dmg: 14, speed: 900, pierce: true, slow: 1.6 },
        sun:     { name: 'Sun grenade',     cd: 0.55,  dmg: 40, speed: 640, blast: 118 },
        harpoon: { name: 'Harpoon',         cd: 0.30,  dmg: 30, speed: 1250, pierce: true }
    };

    var FOES = {
        zed:    { hp: 20,  dmg: 10, speed: 90,  kind: 'chase' },
        rifle:  { hp: 28,  dmg: 8,  speed: 60,  kind: 'ranged' },
        sapper: { hp: 22,  dmg: 25, speed: 130, kind: 'bomber' }
    };

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function sign(v) { return v < 0 ? -1 : 1; }
    function normalizeContentMode(mode) { return mode === 'kid' ? 'kids' : (mode === 'all' ? 'adult' : (mode === 'teen' ? 'teens' : mode)); }

    /* Pure deterministic RNG (mulberry32) so runs are seed-replayable. */
    function rng32(seed) {
        var a = (seed >>> 0) || 1;
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /* Terraria-flavored breach generation: 8 distinct biomes, each with its
     * own building style, nature, palette accent, and spacing rhythm. The
     * mandatory ground-lane route always stays passable (props are
     * destructible, platforms optional); vertical shafts, rooftops, and
     * supported catwalks add the dig-up/climb-over Terraria feel. */
    var BIOMES = [
        { id: 'crater',     accent: '#e88153', nature: ['tree', 'ruin'],   building: 'bunker',     gap: [420, 560] },
        { id: 'mines',      accent: '#f2ad5d', nature: ['crystal', 'ruin'], building: 'shaft',      gap: [380, 520] },
        { id: 'grove',      accent: '#66dfb4', nature: ['tree', 'shroom'],  building: 'hut',        gap: [460, 640] },
        { id: 'wastes',     accent: '#d38c59', nature: ['ruin', 'crystal'], building: 'convoy',     gap: [520, 700] },
        { id: 'cathedral',  accent: '#b5efff', nature: ['crystal', 'ruin'], building: 'tower',      gap: [400, 540] },
        { id: 'nursery',    accent: '#c084fc', nature: ['shroom', 'tree'],  building: 'nest',       gap: [440, 600] },
        { id: 'foundry',    accent: '#ff725b', nature: ['crystal', 'ruin'], building: 'forge',      gap: [380, 520] },
        { id: 'perimeter',  accent: '#ffdb70', nature: ['ruin', 'tree'],    building: 'bunker',     gap: [460, 620] }
    ];
    var NATURE_HP = { tree: 34, crystal: 60, shroom: 26, ruin: 90 };
    var LOOT_WEAPONS = ['scatter', 'launcher', 'moonbeam', 'saw', 'cryo', 'harpoon', 'sun'];

    function biomeAt(seg, rand, waveMode) {
        // Deterministic walk through biomes: mostly forward, sometimes repeat
        // or jump, so every seed feels different but coherent.
        if (seg === 0) return BIOMES[Math.floor(rand() * 3)];
        var prev = biomeAt._prev || BIOMES[0];
        var roll = rand();
        var next;
        if (roll < 0.55) next = BIOMES[(BIOMES.indexOf(prev) + 1) % BIOMES.length];
        else if (roll < 0.8) next = prev;
        else next = BIOMES[Math.floor(rand() * BIOMES.length)];
        biomeAt._prev = next;
        return next;
    }

    function generateRoute(seed, waveMode) {
        var rand = rng32(seed), foes = [], civs = [], props = [], pickups = [], platforms = [];
        var types = ['zed', 'rifle', 'sapper'];
        biomeAt._prev = null;
        var segs = waveMode ? 8 : 12;
        var cursor = 430;
        var biomesUsed = [];
        for (var seg = 0; seg < segs; seg++) {
            var biome = biomeAt(seg, rand, waveMode);
            biomesUsed.push(biome.id);
            // Random spacing per biome: gap range + jitter, so buildings and
            // nature never sit on a grid.
            var gap = biome.gap[0] + rand() * (biome.gap[1] - biome.gap[0]);
            var base = cursor + Math.floor(rand() * 110);
            var sectorStart = cursor;
            cursor += gap;
            var propCount = 1 + Math.floor(rand() * 3);
            for (var pi = 0; pi < propCount; pi++) {
                var bx = base + Math.floor(rand() * 220) - 40;
                var roll = rand();
                var kind;
                if (roll < 0.30) kind = biome.building === 'tower' ? 'watchtower' : biome.building === 'shaft' ? 'crate' : 'bunker';
                else if (roll < 0.45) kind = 'fuel';
                else if (roll < 0.62) kind = 'watchtower';
                else if (roll < 0.78) kind = biome.nature[Math.floor(rand() * biome.nature.length)];
                else kind = ['bunker', 'crate'][Math.floor(rand() * 2)];
                var hp = kind === 'fuel' ? 24 : kind === 'crate' ? 34 : kind === 'watchtower' ? 72 :
                    kind === 'tree' ? NATURE_HP.tree : kind === 'crystal' ? NATURE_HP.crystal :
                    kind === 'shroom' ? NATURE_HP.shroom : kind === 'ruin' ? NATURE_HP.ruin : 86;
                var prop = { id: props.length, kind: kind, x: bx, y: kind === 'watchtower' ? -42 : 0,
                    hp: hp, maxHp: hp, alive: true, shake: 0, destructible: true, biome: biome.id };
                props.push(prop);
                // Buildings get roofs: a supported catwalk bolted to the prop
                // so blowing the support drops the roof (collapse chain).
                if ((kind === 'bunker' || kind === 'watchtower') && rand() > 0.35) {
                    platforms.push({ x: bx - 70 - Math.floor(rand() * 30), w: 150 + Math.floor(rand() * 90),
                        y: kind === 'watchtower' ? -195 - Math.floor(rand() * 40) : -105 - Math.floor(rand() * 45),
                        supportsBy: prop.id, biome: biome.id });
                }
            }
            // Nature clusters: 0-2 extra destructible trees/crystals/shrooms.
            var natureExtra = Math.floor(rand() * 3);
            for (var nn = 0; nn < natureExtra; nn++) {
                var nk = biome.nature[Math.floor(rand() * biome.nature.length)];
                props.push({ id: props.length, kind: nk, x: base + 60 + Math.floor(rand() * 320), y: 0,
                    hp: NATURE_HP[nk], maxHp: NATURE_HP[nk], alive: true, shake: 0, destructible: true, biome: biome.id });
            }
            var count = 1 + Math.floor(rand() * 3);
            for (var e = 0; e < count; e++) {
                var type = types[Math.floor(rand() * types.length)], def = FOES[type];
                foes.push({ id: foes.length, type: type, hp: def.hp, maxHp: def.hp, x: base + 80 + e * (65 + Math.floor(rand() * 40)), y: 0, vx: 0, vy: 0, fireCd: 0.6 + rand() * 1.2, fuse: 0 });
            }
            if (!waveMode && seg > 0 && seg < 11 && rand() > 0.34) {
                var sp = SPECIES[Math.floor(rand() * SPECIES.length)], combo = Object.keys(BUILDS)[Math.floor(rand() * 16)];
                civs.push({ id: civs.length, x: base + 270, species: sp.name, emoji: sp.emoji, buildId: combo, saved: false, brokenT: 0 });
            }
            // Every sector has a staircase to the cross-sector gantries, then a
            // shorter climb to its lookout. Adjacent steps overlap by design.
            var gantryY = -296;
            var stairsX = Math.floor(sectorStart + gap * (seg % 2 ? 0.65 : 0.31));
            var lookoutSteps = 3 + Math.floor(rand() * 3) + (biome.building === 'tower' ? 1 : 0);
            for (var step = 1; step <= 4 + lookoutSteps; step++) {
                if (step === 4) continue; // The gantry is the fourth step.
                var shift = step % 2 ? -68 : 0;
                platforms.push({ x: stairsX + shift, w: 146, y: -74 * step,
                    kind: step === 4 + lookoutSteps ? 'lookout' : 'step', accent: biome.accent });
            }
            var gantryX = Math.floor(sectorStart + 27);
            platforms.push({ x: gantryX, w: Math.floor(gap - 54), y: gantryY, kind: 'gantry', accent: biome.accent });

            var lookoutX = stairsX + ((4 + lookoutSteps) % 2 ? -68 : 0) + 73;
            var lookoutY = -74 * (4 + lookoutSteps);
            pickups.push({ x: lookoutX + 25, y: lookoutY - 12, weapon: LOOT_WEAPONS[Math.floor(rand() * LOOT_WEAPONS.length)],
                ammo: 22 + Math.floor(rand() * 13), taken: false });
            if (seg % 2 === 0) {
                foes.push({ id: foes.length, type: 'rifle', x: lookoutX - 35, y: lookoutY,
                    hp: FOES.rifle.hp, maxHp: FOES.rifle.hp, elevated: true, fireCd: 0.9 + rand() });
            }
            if (!waveMode && seg % 3 === 1) {
                var crew = SPECIES[seg % SPECIES.length], buildId = Object.keys(BUILDS)[Math.floor(rand() * 16)];
                civs.push({ id: civs.length, x: gantryX + 50, y: gantryY, species: crew.name,
                    emoji: crew.emoji, buildId: buildId, saved: false, brokenT: 0 });
            }
            if (rand() > 0.4) pickups.push({ x: base + 180, y: -12, weapon: LOOT_WEAPONS[Math.floor(rand() * LOOT_WEAPONS.length)], ammo: 18 + Math.floor(rand() * 15), taken: false });
            if (rand() > 0.43) pickups.push({ x: base + 360, y: -12, ammoPack: 16 + Math.floor(rand() * 15), taken: false });
            if (rand() > 0.65) pickups.push({ x: base + 450, y: -12, heal: 24, taken: false });
        }
        biomeAt._prev = null;
        if (!waveMode && civs.length === 0) civs.push({ id: 0, x: 1700, species: 'Human', emoji: '👩‍🚀', buildId: 'elf:warrior', saved: false, brokenT: 0 });
        return { foes: foes, civs: civs, props: props, pickups: pickups, platforms: platforms, worldLength: Math.max(4500, Math.floor(cursor + 600)), biomes: biomesUsed };
    }

    /* ---------------- Pure core ---------------- */
    function newRun(opts) {
        opts = opts || {};
        var seed = typeof opts.seed === 'number' ? opts.seed : 1337;
        var gameMode = opts.gameMode || 'real-time', routeMode = opts.routeMode || 'roguelite';
        var initialBuild = BUILDS[opts.buildId] ? opts.buildId : (opts.hero === 'groknak' ? 'orc:warrior' : opts.hero === 'valley' ? 'human:support' : opts.hero === 'arty' ? 'dwarf:mage' : 'human:warrior');
        var build = BUILDS[initialBuild], route = generateRoute(seed, routeMode === 'wave');
        var move = ((typeof opts.moveSpeed === 'number' && opts.moveSpeed > 0) ? opts.moveSpeed : MOVE) * build.speed;
        var jumpV = ((typeof opts.jumpV === 'number' && opts.jumpV > 0) ? opts.jumpV : JUMP_V) * build.jump;
        return {
            v: 2, hero: initialBuild, buildId: initialBuild, initialBuild: initialBuild, initialLifeUsed: false,
            lifeQueue: [], gameMode: gameMode, routeMode: routeMode, contentMode: normalizeContentMode(opts.contentMode || 'teen'),
            mission: opts.mission || 'moonrock-run', moveSpeed: move, jumpV: jumpV, seed: seed,
            player: {
                x: 80, y: 0, vx: 0, vy: 0, face: 1, ground: true,
                hp: build.hp, maxHp: build.hp, armor: build.armor, maxArmor: build.armor,
                coyote: 0, jbuf: 0, dashT: 0, dashCd: 0, iframes: 0,
                fireCd: 0, altCd: 0, altAmmo: 1, abilityCd: 0, meleeCd: 0, wall: 0, aim: 0,
                starterWeapon: build.weapon, pickupWeapon: null, pickupAmmo: 0, weaponSlot: 'starter',
                weapon: build.weapon, alt: 'grenade', ammo: -1, damageTaken: 0
            },
            foes: route.foes, shots: [], civs: route.civs, props: route.props, pickups: route.pickups, platforms: route.platforms,
            unstable: { x: Math.floor(route.worldLength * 0.52), hp: 96, maxHp: 96, warnT: 0, dropped: false },
            objective: routeMode === 'wave' ? 'WAVE MODE · survive the push · reach extraction' : 'SCOUT THE BREACH · rescue builds · reach extraction',
            ticks: 0, time: 0, kills: 0, rescued: 0, chain: 0, chainT: 0,
            demolition: 0, shotsFired: 0, meleeKills: 0, abilitiesUsed: 0, over: false, win: false, extracted: false,
            worldLength: route.worldLength, nextWave: 1, wave: 1, shake: 0, comboBest: 0,
            slowBonus: 0, lastProgressX: 80, lastZone: 0, checkpointX: 80, rescuedBuilds: [],
            gigglesSaveUsed: false, gigglesSaved: false
        };
    }

    function equipBuild(s, id) {
        var b = BUILDS[id];
        if (!b) return false;
        var p = s.player;
        s.buildId = id; s.hero = id; s.moveSpeed = MOVE * b.speed; s.jumpV = JUMP_V * b.jump;
        p.hp = b.hp; p.maxHp = b.hp; p.armor = b.armor; p.maxArmor = b.armor;
        p.vx = 0; p.vy = 0; p.dashCd = 0; p.abilityCd = 0; p.iframes = 0.45;
        p.starterWeapon = b.weapon; p.weapon = b.weapon; p.pickupWeapon = null; p.pickupAmmo = 0; p.weaponSlot = 'starter'; p.ammo = -1;
        return true;
    }

    function hurtPlayer(s, dmg) {
        var p = s.player;
        if (p.iframes > 0 || s.over) return;
        var soak = Math.min(p.armor, Math.ceil(dmg * 0.5));
        p.armor -= soak;
        var lost = dmg - soak; p.hp -= lost; p.damageTaken += dmg;
        if (p.hp <= 0) {
            // Giggles catches the breacher once per run before the normal
            // reserve-life chain is consumed. This stays in the deterministic
            // simulation state, so replaying the same inputs gives the same save.
            if (!s.gigglesSaveUsed) {
                s.gigglesSaveUsed = true;
                s.gigglesSaved = true;
                p.hp = 1;
                p.iframes = Math.max(p.iframes || 0, 1.25);
                return;
            }
            p.hp = 0;
            if (s.lifeQueue.length) {
                var next = s.lifeQueue.pop();
                equipBuild(s, next); p.x = s.checkpointX; p.y = 0; p.ground = true;
                s.objective = 'NEW BREACHER · ' + BUILDS[next].name + ' · ' + s.lifeQueue.length + ' rescued lives left';
                s.respawns = (s.respawns || 0) + 1;
            } else if (!s.initialLifeUsed) {
                s.initialLifeUsed = true; equipBuild(s, s.initialBuild); p.x = s.checkpointX; p.y = 0; p.ground = true;
                s.objective = 'FINAL LIFE · ' + BUILDS[s.initialBuild].name;
                s.respawns = (s.respawns || 0) + 1;
            } else { s.over = true; s.win = false; }
        }
    }

    function fireWeapon(s, ev) {
        var p = s.player;
        if (p.weaponSlot === 'pickup' && p.pickupAmmo <= 0) { p.weapon = p.starterWeapon; p.weaponSlot = 'starter'; }
        var weapon = p.weapon;
        var w = WEAPONS[weapon] || WEAPONS.pulse;
        if (p.fireCd > 0) return;
        if (p.weaponSlot === 'pickup') { p.pickupAmmo -= 1; if (p.pickupAmmo <= 0) ev.push({ t: 'empty' }); }
        p.fireCd = w.cd;
        p.muzzleUntil = s.ticks + 3;
        p.muzzleKick = w.blast ? 12 : (w.pellets ? 9 : 5);
        if (p.muzzleKick >= 9) s.shake = Math.max(s.shake, p.muzzleKick * 0.32);
        var buildDmg = (BUILDS[s.buildId] || BUILDS['human:warrior']).damage;
        var n = w.pellets || 1;
        for (var i = 0; i < n; i++) {
            var spread = n > 1 ? (i - (n - 1) / 2) * 0.09 : 0;
            var a = p.aim + spread;
            s.shots.push({
                x: p.x, y: p.y - 20, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed,
                dmg: Math.round(w.dmg * buildDmg), pierce: !!w.pierce, blast: w.blast || 0,
                life: typeof w.life === 'number' ? w.life : 1.2, slow: w.slow || 0, foe: false
            });
        }
        s.shotsFired += n;
        if (p.weaponSlot === 'pickup' && p.pickupAmmo <= 0) { p.weapon = p.starterWeapon; p.weaponSlot = 'starter'; }
        ev.push({ t: 'shot', weapon: weapon });
    }

    function altFire(s, ev) {
        var p = s.player;
        if (p.altCd > 0 || p.altAmmo <= 0) return;
        p.altCd = 0.72; p.altAmmo -= 1;
        s.shots.push({
            x: p.x, y: p.y - 20, vx: p.face * 420, vy: -260,
            dmg: 75, pierce: false, blast: 150, gravity: 700, life: 2.0, foe: false
        });
        ev.push({ t: 'alt', alt: p.alt });
    }

    function registerChain(s) {
        s.chain += 1;
        s.chainT = 3;
        s.comboBest = Math.max(s.comboBest, s.chain);
    }

    function damageProp(s, prop, damage, ev, blasts) {
        if (!prop.alive) return;
        prop.hp -= damage;
        prop.hitUntil = s.ticks + 5;
        if (prop.hp > 0) return;

        prop.alive = false;
        s.demolition += 1;
        registerChain(s);
        ev.push({ t: 'demolish', kind: prop.kind, x: Math.round(prop.x), y: prop.y - 36, chain: s.chain });
        for (var i = s.platforms.length - 1; i >= 0; i--) {
            if (s.platforms[i].supportsBy !== prop.id) continue;
            var platform = s.platforms.splice(i, 1)[0];
            s.shake = Math.max(s.shake, 7);
            ev.push({ t: 'collapse-platform', x: platform.x, y: platform.y, width: platform.w });
        }
        if (prop.kind === 'fuel') {
            blasts.push({ x: prop.x, y: prop.y - 36, damage: 48, radius: 118 });
        }
    }

    function resolveBlasts(s, blasts, ev) {
        // Each fuel prop queues its explosion once, when it changes from alive to destroyed.
        for (var i = 0; i < blasts.length; i++) {
            var blast = blasts[i], x = blast.x, y = blast.y, radius = blast.radius, damage = blast.damage;
            ev.push({ t: 'blast', x: Math.round(x), y: Math.round(y), radius: radius });
            if (Math.abs(s.player.x - x) < 520) s.shake = Math.max(s.shake, Math.min(18, radius * 0.11));
            if (Math.hypot(s.player.x - x, s.player.y - 20 - y) <= radius) {
                var selfDmg = Math.max(4, Math.ceil(damage * 0.34));
                hurtPlayer(s, selfDmg);
                ev.push({ t: 'hurt', dmg: selfDmg, selfBlast: true });
            }
            if (Math.hypot(s.unstable.x - x, -40 - y) <= radius + 66) {
                s.unstable.hp -= damage;
                ev.push({ t: 'hit-support', hp: Math.max(0, Math.ceil(s.unstable.hp)) });
            }
            for (var f = 0; f < s.foes.length; f++) {
                var foe = s.foes[f];
                if (foe.hp <= 0 || foe === blast.directTarget) continue;
                var dist = Math.hypot(foe.x - x, foe.y - 20 - y);
                if (dist <= radius) damageFoe(s, foe, Math.ceil(damage * (1 - dist / (radius * 1.45))), x, ev, true);
            }
            for (var j = 0; j < s.props.length; j++) {
                var prop = s.props[j];
                if (prop.alive && prop !== blast.directTarget && Math.hypot(prop.x - x, prop.y - 36 - y) <= radius + 52) {
                    damageProp(s, prop, damage, ev, blasts);
                }
            }
        }
    }

    function damageFoe(s, foe, damage, sourceX, ev, explosive) {
        foe.hp -= damage;
        foe.hitUntil = s.ticks + 5;
        if (foe.hp <= 0) {
            s.kills += 1;
            foe.effectDone = true;
            registerChain(s);
            ev.push({ t: 'kill', type: foe.type, x: foe.x, y: foe.y - 20, direction: sign(foe.x - sourceX), chain: s.chain, explosive: explosive });
        } else {
            ev.push({ t: 'hit', type: foe.type, x: foe.x, y: foe.y - 20, direction: sign(foe.x - sourceX) });
        }
    }

    function crossedPlatform(platforms, x, fromY, toY, margin) {
        var first = null;
        for (var i = 0; i < platforms.length; i++) {
            var deck = platforms[i];
            if (deck.y < fromY || deck.y > toY || x + margin <= deck.x || x - margin >= deck.x + deck.w) continue;
            if (!first || deck.y < first.y) first = deck;
        }
        return first;
    }

    /* One fixed DT step. input: {move, jump, aim, fire, alt, dash,
     * interact, swap}. Returns event list (view layer animates them). */
    function tick(s, input) {
        var ev = [];
        if (!s || s.over) return ev;
        input = input || {};
        var p = s.player;
        var requested = input.move || input.jump || input.climb || input.fire || input.alt || input.dash || input.interact || input.melee || input.ability || input.swap;
        if (s.gameMode === 'chrono-lock' && !requested) return ev;
        if (s.gameMode === 'turn-based') {
            if (s.turnTicks > 0) { input = { move: 0 }; s.turnTicks -= 1; }
            else if (!requested) return ev;
            else s.turnTicks = 9;
        }
        var mv = clamp(typeof input.move === 'number' ? input.move : 0, -1, 1);

        s.ticks += 1;
        s.time += DT;
        if (s.chainT > 0) { s.chainT -= DT; if (s.chainT <= 0) s.chain = 0; }

        /* Timers. */
        if (p.fireCd > 0) p.fireCd -= DT;
        if (p.altCd > 0) p.altCd -= DT;
        if (p.dashCd > 0) p.dashCd -= DT;
        if (p.abilityCd > 0) p.abilityCd -= DT;
        if (p.meleeCd > 0) p.meleeCd -= DT;
        if (p.iframes > 0) p.iframes -= DT;
        if (p.coyote > 0) p.coyote -= DT;
        if (p.jbuf > 0) p.jbuf -= DT;

        /* Buffered acceleration with strong ground friction, responsive air control. */
        var target = mv * s.moveSpeed;
        if (p.dashT <= 0) {
            var accel = p.ground ? 4500 : 2600 * AIR_CTL;
            if (mv !== 0) p.vx += clamp(target - p.vx, -accel * DT, accel * DT);
            else p.vx *= p.ground ? 0.62 : 0.94;
            p.vx = clamp(p.vx, -s.moveSpeed * 1.18, s.moveSpeed * 1.18);
        }
        if (mv !== 0) p.face = sign(mv);

        /* Jump: buffer + coyote. */
        if (input.jump) p.jbuf = JBUF;
        if (p.jbuf > 0 && (p.ground || p.coyote > 0)) {
            p.vy = -s.jumpV; p.ground = false; p.coyote = 0; p.jbuf = 0;
            ev.push({ t: 'jump' });
        }

        /* Races have distinct abilities; melee is a fast, build-flavored sweep. */
        if (input.ability && p.abilityCd <= 0) {
            var build = BUILDS[s.buildId] || BUILDS['human:warrior'];
            p.abilityCd = 5.5; s.abilitiesUsed += 1;
            if (build.abilityKind === 'dash') { p.dashT = 0.23; p.dashCd = 0.55; p.iframes = Math.max(p.iframes, 0.2); p.vx = p.face * DASH_V * 1.2; }
            else if (build.abilityKind === 'snare' || build.abilityKind === 'shock') {
                for (var ab = 0; ab < s.foes.length; ab++) if (s.foes[ab].hp > 0 && Math.hypot(s.foes[ab].x - p.x, s.foes[ab].y - p.y) < 190) {
                    s.foes[ab].hp -= build.abilityKind === 'shock' ? 28 : 18;
                    if (build.abilityKind === 'snare') s.foes[ab].touchCd = 1.8;
                    if (s.foes[ab].hp <= 0) { s.kills += 1; ev.push({ t: 'kill', type: s.foes[ab].type, ability: true }); }
                }
                if (build.abilityKind === 'shock') s.shake = Math.max(s.shake, 5);
            } else p.iframes = Math.max(p.iframes, 1.25);
            if (build.cls === 'tank') p.armor = Math.min(p.maxArmor, p.armor + 18);
            else if (build.cls === 'support') p.hp = Math.min(p.maxHp, p.hp + 18);
            else if (build.cls === 'mage') {
                for (var arc = 0; arc < s.foes.length; arc++) if (s.foes[arc].hp > 0 && Math.hypot(s.foes[arc].x - p.x, s.foes[arc].y - p.y) < 240) {
                    s.foes[arc].hp -= 14;
                    if (s.foes[arc].hp <= 0) { s.kills += 1; ev.push({ t: 'kill', type: s.foes[arc].type, ability: true }); }
                }
            } else p.iframes = Math.max(p.iframes, 0.3);
            ev.push({ t: 'ability', name: build.ability });
        }
        if (input.melee && p.meleeCd <= 0) {
            p.meleeCd = 0.34; var kit = BUILDS[s.buildId] || BUILDS['human:warrior'];
            for (var mi = 0; mi < s.foes.length; mi++) {
                var targetFoe = s.foes[mi], dxM = targetFoe.x - p.x;
                if (targetFoe.hp > 0 && dxM * p.face >= -6 && dxM * p.face < 82 && Math.abs(targetFoe.y - p.y) < 58) {
                    targetFoe.hp -= kit.meleeDamage;
                    if (targetFoe.hp <= 0) { s.kills += 1; s.meleeKills += 1; ev.push({ t: 'kill', type: targetFoe.type, melee: true }); }
                    if (kit.cls === 'tank') { if (!targetFoe.elevated) targetFoe.x += p.face * 96; targetFoe.touchCd = 1; }
                    else if (kit.cls === 'support') { targetFoe.touchCd = 1.6; p.hp = Math.min(p.maxHp, p.hp + 4); }
                    else if (kit.cls === 'mage') for (var chainHit = 0; chainHit < s.foes.length; chainHit++) if (s.foes[chainHit] !== targetFoe && s.foes[chainHit].hp > 0 && Math.hypot(s.foes[chainHit].x - targetFoe.x, s.foes[chainHit].y - targetFoe.y) < 92) { s.foes[chainHit].hp -= Math.ceil(kit.meleeDamage * 0.62); if (s.foes[chainHit].hp <= 0) { s.kills += 1; s.meleeKills += 1; ev.push({ t: 'kill', type: s.foes[chainHit].type, melee: true }); } break; }
                    ev.push({ t: 'melee', name: kit.melee }); break;
                }
            }
            for (var mp = 0; mp < s.props.length; mp++) {
                var meleeProp = s.props[mp];
                if (!meleeProp.alive || Math.abs(meleeProp.x - p.x) >= 90 || Math.abs(meleeProp.y - p.y) >= 110) continue;
                var meleeBlasts = [];
                damageProp(s, meleeProp, kit.meleeDamage, ev, meleeBlasts);
                resolveBlasts(s, meleeBlasts, ev);
                break;
            }
        }

        /* Dash: burst + i-frames. */
        if (input.dash && p.dashCd <= 0 && p.dashT <= 0) {
            p.dashT = DASH_T; p.dashCd = DASH_CD; p.iframes = Math.max(p.iframes, IFRAMES);
            ev.push({ t: 'dash' });
        }
        if (p.dashT > 0) { p.dashT -= DT; p.vx = p.face * DASH_V; p.vy = 0; }

        /* Aim + fire. */
        if (typeof input.aim === 'number') p.aim = input.aim;
        if (input.swap === 'starter') { p.weapon = p.starterWeapon; p.weaponSlot = 'starter'; ev.push({ t: 'swap', weapon: p.weapon }); }
        else if (input.swap === 'pickup' && p.pickupWeapon && p.pickupAmmo > 0) { p.weapon = p.pickupWeapon; p.weaponSlot = 'pickup'; ev.push({ t: 'swap', weapon: p.weapon }); }
        if (input.fire) fireWeapon(s, ev);
        if (input.alt) altFire(s, ev);

        /* Gravity + integrate (floor y=0). */
        if (p.dashT <= 0) p.vy += GRAV * DT;
        var previousX = p.x;
        var previousY = p.y;
        p.x += p.vx * DT;
        var nextY = p.y + p.vy * DT;
        p.y = nextY;
        if (p.x < 20) { p.x = 20; p.vx = 0; }
        if (p.x > s.worldLength) { p.x = s.worldLength; p.vx = 0; }
        /* Fortifications stop a ground push until you blow them open; a jump
           clears low crates and the edges of broken-looking bunkers. */
        if (p.y > -78) for (var wall = 0; wall < s.props.length; wall++) {
            var block = s.props[wall];
            if (!block.alive || Math.abs(p.x - block.x) > 66) continue;
            var movingRight = p.x >= previousX;
            p.x = movingRight ? block.x - 67 : block.x + 67;
            p.vx = 0;
            break;
        }
        /* One-way platforms catch the first deck crossed on descent. */
        var landing = p.vy >= 0 ? crossedPlatform(s.platforms, p.x, previousY, nextY, 16) : null;
        if (landing) {
            if (!p.ground || previousY !== landing.y) ev.push({ t: 'land' });
            p.y = landing.y; p.vy = 0; p.ground = true; p.coyote = COYOTE;
        }
        if (p.y >= 0) {
            if (!p.ground && p.vy > 500) ev.push({ t: 'land' });
            p.y = 0; p.vy = 0;
            if (!p.ground) { p.ground = true; }
            p.coyote = COYOTE;
        } else if (p.ground && !landing) {
            p.ground = false; p.coyote = COYOTE;
        }
        /* Grab onto destructible walls and climb when holding up/jump. */
        p.wall = 0;
        if (!p.ground && Math.abs(mv) > 0 && p.y > -205) for (var wi = 0; wi < s.props.length; wi++) {
            var wb = s.props[wi];
            if (wb.alive && Math.abs(p.x - wb.x) < 68 && ((mv > 0 && p.x <= wb.x) || (mv < 0 && p.x >= wb.x))) {
                p.wall = mv > 0 ? 1 : -1;
                if (input.climb) { p.vy = -245; p.y -= 245 * DT; p.vx = p.wall * 18; }
                else if (input.jump) { p.vx = -p.wall * 285; p.vy = -s.jumpV * 0.88; p.wall = 0; }
                else { p.vy = Math.min(p.vy, 250); }
                break;
            }
        }

        /* Shots: move, expire, hit foes / unstable support. */
        for (var i = s.shots.length - 1; i >= 0; i--) {
            var sh = s.shots[i];
            var shotY = sh.y;
            sh.x += sh.vx * DT; sh.y += sh.vy * DT; sh.life -= DT;
            var grenadeDeck = sh.gravity && sh.y >= shotY ? crossedPlatform(s.platforms, sh.x, shotY, sh.y, 0) : null;
            if (grenadeDeck) sh.y = grenadeDeck.y;
            if (sh.gravity) sh.vy += sh.gravity * DT;
            var dead = sh.life <= 0;
            if (!dead && !sh.foe) {
                var struckWorld = false;
                for (var f = 0; f < s.foes.length; f++) {
                    var foe = s.foes[f];
                    if (foe.hp <= 0) continue;
                    var dx = foe.x - sh.x, dy = (foe.y - 20) - sh.y;
                    if (dx * dx + dy * dy < 900) {
                        damageFoe(s, foe, sh.dmg, sh.x - sh.vx * DT, ev, sh.blast > 0);
                        if (sh.slow > 0) foe.touchCd = Math.max(foe.touchCd || 0, sh.slow);
                        if (sh.blast > 0) {
                            resolveBlasts(s, [{ x: sh.x, y: sh.y, damage: sh.dmg, radius: sh.blast, directTarget: foe }], ev);
                        }
                        if (!sh.pierce) { dead = true; struckWorld = true; break; }
                    }
                }
                if (!struckWorld) for (var pr = 0; pr < s.props.length; pr++) {
                    var target = s.props[pr];
                    if (!target.alive) continue;
                    var tdx = target.x - sh.x, tdy = (target.y - 44) - sh.y;
                    var hitRadius = target.kind === 'watchtower' ? 72 : 50;
                    if (tdx * tdx < hitRadius * hitRadius && Math.abs(tdy) < (target.kind === 'watchtower' ? 105 : 86)) {
                        var blasts = [];
                        if (sh.blast > 0) {
                            damageProp(s, target, sh.dmg, ev, blasts);
                            blasts.unshift({ x: sh.x, y: sh.y, damage: sh.dmg, radius: sh.blast, directTarget: target });
                        } else {
                            damageProp(s, target, sh.dmg, ev, blasts);
                            ev.push({ t: 'prop-hit', kind: target.kind, x: sh.x, y: sh.y, direction: sign(sh.vx) });
                        }
                        resolveBlasts(s, blasts, ev);
                        dead = true; break;
                    }
                }
            }
            if (!sh.foe && sh.blast > 0 && (sh.life <= 0 || (!dead && (sh.y >= 0 || grenadeDeck)))) {
                resolveBlasts(s, [{ x: sh.x, y: Math.min(0, sh.y), damage: sh.dmg, radius: sh.blast }], ev);
                dead = true;
            }
            if (!sh.foe && sh.y >= 0) dead = true;
            if (dead) s.shots.splice(i, 1);
        }
        if (s.shots.length > 80) s.shots.splice(0, s.shots.length - 80);

        /* Optional arcade variant only; roguelite encounters are pre-generated. */
        while (s.routeMode === 'wave' && s.nextWave <= 5 && p.x > s.nextWave * 680) {
            var waveX = Math.min(s.worldLength - 180, p.x + 620);
            var waveTypes = s.nextWave % 2 ? ['zed', 'rifle', 'sapper'] : ['rifle', 'zed', 'zed', 'sapper'];
            for (var wi = 0; wi < waveTypes.length; wi++) {
                var wt = waveTypes[wi], wd = FOES[wt];
                s.foes.push({ id: s.foes.length, type: wt, hp: wd.hp + s.nextWave * 5, maxHp: wd.hp + s.nextWave * 5,
                    x: waveX + wi * 115, y: 0, vx: 0, vy: 0, fireCd: 0.8 + wi * 0.45, fuse: 0 });
            }
            s.wave = s.nextWave; s.nextWave += 1;
            s.objective = 'BREACH WAVE ' + (s.wave - 1) + ' · push to extraction';
            ev.push({ t: 'wave', wave: s.wave - 1 });
        }

        /* Foes: individually lethal, but fragile enough for deliberate head-on clears. */
        for (var k = 0; k < s.foes.length; k++) {
            var F = s.foes[k], FD = FOES[F.type] || FOES.zed;
            if (F.hp <= 0) continue;
            if (F.touchCd > 0) F.touchCd -= DT;
            var px = p.x - F.x;
            if (FD.kind === 'ranged') {
                F.fireCd -= DT;
                var heightDelta = p.y - F.y;
                if (Math.abs(px) < 620 && Math.abs(heightDelta) < 320 && F.fireCd <= 0) {
                    F.fireCd = 1.55;
                    var shotAngle = F.elevated ? Math.atan2(heightDelta, px) : (px < 0 ? Math.PI : 0);
                    s.shots.push({
                        x: F.x, y: F.y - 20, vx: Math.cos(shotAngle) * 380, vy: Math.sin(shotAngle) * 380,
                        dmg: FD.dmg, pierce: false, blast: 0, life: 1.5, foe: true
                    });
                    ev.push({ t: 'foe-shot' });
                }
                if (!F.elevated) F.x += sign(px) * FD.speed * 0.4 * DT;
            } else if (FD.kind === 'bomber') {
                F.x += sign(px) * FD.speed * DT;
                if (Math.abs(px) < 36 && Math.abs(p.y - F.y) < 60) {
                    F.hp = 0; s.kills += 1; s.chain += 1; s.chainT = 3;
                    ev.push({ t: 'blast', x: Math.round(F.x), y: -20, radius: 105 });
                    hurtPlayer(s, FD.dmg);
                    ev.push({ t: 'hurt', dmg: FD.dmg });
                }
            } else {
                F.x += sign(px) * FD.speed * DT;
                if (Math.abs(px) < 34 && Math.abs(p.y - F.y) < 60 && (F.touchCd || 0) <= 0) {
                    hurtPlayer(s, FD.dmg);
                    ev.push({ t: 'hurt', dmg: FD.dmg });
                    F.touchCd = 0.72;
                    F.x -= sign(px) * 60;
                }
            }
        }
        /* Foe shots vs player. */
        for (var q = s.shots.length - 1; q >= 0; q--) {
            var fs = s.shots[q];
            if (!fs.foe) continue;
            var fdx = p.x - fs.x, fdy = (p.y - 20) - fs.y;
            if (fdx * fdx + fdy * fdy < 625) {
                hurtPlayer(s, fs.dmg);
                ev.push({ t: 'hurt', dmg: fs.dmg });
                s.shots.splice(q, 1);
            }
        }

        /* Unstable support: two-step warning then collapse. */
        var U = s.unstable;
        if (!U.dropped) {
            if (U.hp <= U.maxHp * 0.5 && U.warnT <= 0) {
                U.warnT = 1.5;
                ev.push({ t: 'unstable' });
            }
            if (U.warnT > 0) U.warnT -= DT;
            if (U.hp <= 0) {
                U.dropped = true; s.demolition += 1;
                ev.push({ t: 'collapse', x: U.x });
                for (var z = 0; z < s.foes.length; z++) {
                    var cf = s.foes[z];
                    if (cf.hp > 0 && Math.abs(cf.x - U.x) < 160 && cf.y > -200) {
                        cf.hp = 0; s.kills += 1; s.chain += 1; s.chainT = 3;
                        ev.push({ t: 'kill', type: cf.type, chain: s.chain, crushed: true });
                    }
                }
            }
        }

        /* Scavenged weapons and med packs keep the push moving. */
        for (var pk = 0; pk < s.pickups.length; pk++) {
            var pickup = s.pickups[pk];
            if (pickup.taken || Math.abs(pickup.x - p.x) > 30 || Math.abs(p.y - pickup.y) > 64) continue;
            pickup.taken = true;
            if (pickup.weapon) { p.pickupWeapon = pickup.weapon; p.pickupAmmo = pickup.ammo || 20; p.weapon = pickup.weapon; p.weaponSlot = 'pickup'; ev.push({ t: 'pickup', kind: pickup.weapon, ammo: p.pickupAmmo }); }
            else if (pickup.ammoPack) { if (p.pickupWeapon) p.pickupAmmo = Math.min(48, p.pickupAmmo + pickup.ammoPack); else p.altAmmo = Math.min(5, p.altAmmo + 1); ev.push({ t: 'pickup', kind: 'ammo' }); }
            else { p.hp = Math.min(p.maxHp, p.hp + pickup.heal); p.altAmmo = Math.min(5, p.altAmmo + 1); ev.push({ t: 'pickup', kind: 'med' }); }
        }

        /* Rescue by touching the linked crew, or press E from nearby. */
        for (var n = 0; n < s.civs.length; n++) {
            var cv = s.civs[n], rescueDistance = Math.abs(cv.x - p.x);
            if (!cv.saved && Math.abs(p.y - (cv.y || 0)) < 60 &&
                rescueDistance < 70 && (input.interact || rescueDistance < 24)) {
                    cv.saved = true; cv.brokenT = 1.1; s.rescued += 1;
                    s.lifeQueue.push(cv.buildId); s.rescuedBuilds.push(cv.buildId); s.checkpointX = Math.max(s.checkpointX, p.x);
                    ev.push({ t: 'rescue', id: cv.id, buildId: cv.buildId, name: BUILDS[cv.buildId].name });
                    break;
            }
        }

        /* Objective + extract after a real push through the breach line. */
        var alive = 0;
        for (var a = 0; a < s.foes.length; a++) if (s.foes[a].hp > 0) alive += 1;
        if ((s.rescued >= 1 || s.routeMode === 'wave') && p.x >= s.worldLength - 120) {
            s.extracted = true; s.over = true; s.win = true;
            ev.push({ t: 'extract' });
        } else if (p.x > s.lastProgressX + 160) {
            s.lastProgressX = p.x;
            var enteredZone = Math.floor(p.x / 600);
            while (s.lastZone < enteredZone) {
                var zoneStart = s.lastZone * 600, zoneEnd = zoneStart + 600, seenInZone = 0, aliveInZone = 0;
                for (var cz = 0; cz < s.foes.length; cz++) if (s.foes[cz].x >= zoneStart && s.foes[cz].x < zoneEnd) { seenInZone += 1; if (s.foes[cz].hp > 0) aliveInZone += 1; }
                if (seenInZone > 0 && aliveInZone === 0) s.slowBonus += 1;
                s.lastZone += 1;
            }
            s.checkpointX = Math.max(80, Math.floor(p.x / 950) * 950);
        } else if (alive === 0 && s.rescued >= s.civs.length) {
            s.objective = 'ROUTE CLEAR · push east to extraction';
        }
        return ev;
    }

    function score(s) {
        if (!s) return 0;
        var noHitBonus = s.player && s.player.damageTaken === 0 ? 125 : 0;
        return s.kills * 10 + s.rescued * 50 + s.demolition * 15 + s.slowBonus * 55 + noHitBonus +
            s.chain * 5 + (s.win ? 200 : 0) + (s.extracted ? 100 : 0);
    }

    /* ---- View ---- */
    var G = null;

    function el(id) { try { return document.getElementById(id); } catch (_) { return null; } }
    function setText(id, v) { try { var n = el(id); if (n) n.textContent = String(v); } catch (_) {} }
    function opt(n) { try { return window[n] || null; } catch (_) { return null; } }

    function missing(name) {
        try {
            var b = el('gg2dbObjective');
            if (b && !missing._said) { missing._said = true; }
        } catch (_) {}
    }

    function loadProfile() {
        var fallback = { best: 0, wins: 0, hero: 'lisa', fastest: 0 };
        try {
            var raw = window.localStorage ? window.localStorage.getItem(SAVE_KEY) : null;
            if (!raw) return fallback;
            var d = JSON.parse(raw);
            if (d && d.v === SAVE_VERSION) return d;
            return fallback;
        } catch (_) { return fallback; }
    }
    function saveProfile(p) {
        try {
            p.v = SAVE_VERSION;
            if (window.localStorage) window.localStorage.setItem(SAVE_KEY, JSON.stringify(p));
        } catch (_) { /* fail-open */ }
    }

    /* Viewport: 1280x720 CSS cap; canvas backing store scaled by DPR<=2. */
    function sizeCanvas() {
        try {
            if (!G || !G.canvas) return;
            var cssW = G.canvas.clientWidth || 960;
            var cssH = Math.round(cssW * 9 / 16);
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            G.canvas.width = Math.round(cssW * dpr);
            G.canvas.height = Math.round(cssH * dpr);
            G.dpr = dpr;
        } catch (_) {}
    }

    function showBanner(title, text, sticky) {
        try {
            setText('gg2dbBannerTitle', title);
            setText('gg2dbBannerText', text);
            var redeploy = el('gg2dbRedeploy');
            if (redeploy) redeploy.hidden = !G.run?.over;
            var b = el('gg2dbBanner');
            if (b) b.className = 'on';
            if (G) G.bannerUntil = sticky ? 0 : performance.now() + 1900;
        } catch (_) {}
    }
    function hideBanner() {
        try {
            var b = el('gg2dbBanner');
            if (b) b.className = '';
        } catch (_) {}
    }

    function updateHud() {
        try {
            if (!G || !G.run) return;
            var s = G.run, p = s.player;
            var w = WEAPONS[p.weapon] || WEAPONS.pulse;
            var build = BUILDS[s.buildId] || BUILDS['human:warrior'];
            setText('gg2dbHero', build.emoji);
            setText('gg2dbHp', Math.ceil(p.hp) + '/' + p.maxHp);
            setText('gg2dbArmor', Math.ceil(p.armor));
            setText('gg2dbWeapon', w.name + (p.weaponSlot === 'pickup' ? ' · ' + p.pickupAmmo : ' · ∞'));
            setText('gg2dbAlt', p.altAmmo > 0 ? 'Grenade x' + p.altAmmo : 'Grenade --');
            setText('gg2dbObjective', s.objective);
            setText('gg2dbRescues', s.routeMode === 'wave' ? 'Wave ' + s.wave + ' active' : s.rescued + ' rescued · ' + s.lifeQueue.length + ' lives');
            var atExtraction = p.x >= s.worldLength - 800;
            var rescueRequired = s.routeMode !== 'wave' && s.rescued === 0;
            setText('gg2dbWaypoint', atExtraction
                ? (rescueRequired ? 'RESCUE ONE CREW MEMBER TO EXTRACT' : '📡 EXTRACT')
                : '➡️ ' + Math.floor(p.x / s.worldLength * 100) + '%');
        } catch (_) {}
    }

    function cameraX(s) {
        return clamp(s.player.x - 350, 0, Math.max(0, s.worldLength - VIEW_WIDTH));
    }

    function cameraY(s) {
        return Math.min(0, s.player.y + 155);
    }

    function render() {
        try {
            if (!G || !G.ctx) return;
            var ctx = G.ctx, s = G.run;
            var W = VIEW_WIDTH, H = VIEW_HEIGHT;
            ctx.setTransform(G.dpr || 1, 0, 0, G.dpr || 1, 0, 0);
            /* Scale the authored scene to the responsive canvas backing store. */
            var sx = G.canvas.width / (G.dpr || 1) / W;
            var sy = G.canvas.height / (G.dpr || 1) / H;
            ctx.scale(sx, sy);
            var now = s ? s.time : 0;
            var cam = s ? cameraX(s) : 0;
            var elevation = s ? cameraY(s) : 0;
            var floorY = FLOOR_Y - elevation;
            var shake = s ? s.shake : 0;
            if (s && s.shake > 0) s.shake = Math.max(0, s.shake - DT * 34);
            if (shake > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                ctx.translate(Math.sin(now * 93) * shake, Math.cos(now * 107) * shake * 0.55);
            }
            var sky = ctx.createLinearGradient(0, 0, 0, H);
            if (s && s.contentMode === 'kids') { sky.addColorStop(0, '#59b6e8'); sky.addColorStop(0.55, '#927ed0'); sky.addColorStop(1, '#ffc977'); }
            else if (s && s.contentMode === 'adult') { sky.addColorStop(0, '#080b18'); sky.addColorStop(0.55, '#302034'); sky.addColorStop(1, '#8f3a37'); }
            else { sky.addColorStop(0, '#111b3b'); sky.addColorStop(0.55, '#542d55'); sky.addColorStop(1, '#de7046'); }
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, W, H);
            /* Parallax MoonRock skyline: distant towers, fires, searchlights. */
            ctx.fillStyle = '#e6c7a0'; ctx.globalAlpha = 0.78; ctx.beginPath(); ctx.arc(760 - cam * 0.035, 92, 49, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
            for (var st = 0; st < 72; st++) {
                var starX = ((st * 173 - cam * 0.05) % (W + 173) + W + 173) % (W + 173);
                var starY = 22 + (st * 47 % 205);
                ctx.globalAlpha = 0.3 + (st % 4) * 0.12; ctx.fillStyle = '#fff4d5'; ctx.fillRect(starX, starY, 2, 2);
            }
            ctx.globalAlpha = 1;
            for (var k = 0; k < 14; k++) {
                var bx = ((k * 185 - cam * 0.28) % (W + 240) + W + 240) % (W + 240) - 120;
                var bh = 92 + ((k * 71) % 114);
                ctx.fillStyle = k % 3 === 0 ? '#352d4b' : '#292c48';
                ctx.fillRect(bx, 330 - bh - elevation * 0.18, 90, bh + 64);
                ctx.fillStyle = k % 2 ? '#ffbd65' : '#88e4ed';
                for (var wy = 0; wy < 3; wy++) for (var wx = 0; wx < 3; wx++) if ((k + wx + wy) % 3 !== 0) ctx.fillRect(bx + 12 + wx * 23, 342 - bh - elevation * 0.18 + wy * 28, 7, 10);
                ctx.fillStyle = '#181a2b'; ctx.fillRect(bx - 5, 330 - elevation * 0.18, 100, 8);
            }
            /* Moonstone dust bands and hot breach horizon. */
            ctx.fillStyle = '#e88153'; ctx.globalAlpha = 0.22;
            for (var hz = 0; hz < 8; hz++) ctx.fillRect(0, 280 + hz * 8, W, 2);
            ctx.globalAlpha = 1;
            if (!s) return;
            var p = s.player;
            var px = p.x - cam;
            /* Raised catwalks + supported roofs; bolted ends mark collapse links. */
            for (var pi = 0; pi < (s.platforms || []).length; pi++) {
                var plat = s.platforms[pi], platX = plat.x - cam;
                if (platX + plat.w < -20 || platX > W + 20) continue;
                var deckY = floorY + plat.y;
                if (deckY < -40 || deckY > H + 60) continue;
                var supported = typeof plat.supportsBy === 'number';
                if (plat.kind === 'gantry' || plat.kind === 'lookout') {
                    ctx.strokeStyle = '#363648'; ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.moveTo(platX, deckY - 21); ctx.lineTo(platX + plat.w, deckY - 21);
                    for (var post = 0; post <= plat.w; post += 30) {
                        ctx.moveTo(platX + post, deckY - 21); ctx.lineTo(platX + post, deckY);
                    }
                    ctx.stroke();
                }
                ctx.fillStyle = supported ? '#6b545b' : '#545b6b'; ctx.fillRect(platX, deckY, plat.w, 17);
                ctx.fillStyle = plat.accent || '#c49b65'; ctx.fillRect(platX, deckY, plat.w, 4);
                ctx.fillStyle = '#858a8d';
                for (var bolt = 8; bolt < plat.w - 6; bolt += 44) ctx.fillRect(platX + bolt, deckY + 7, 6, 6);
                if (supported) { ctx.fillStyle = '#ffd166'; ctx.font = '12px sans-serif'; ctx.fillText('⚙', platX + plat.w / 2, deckY - 4); }
            }
            /* Rubble-strewn trench floor with moving rails, cracks and sparks. */
            if (floorY < H) {
                ctx.fillStyle = '#242330'; ctx.fillRect(0, floorY, W, H - floorY);
                ctx.fillStyle = '#77706a'; ctx.fillRect(0, floorY, W, 7);
                ctx.fillStyle = '#d5a26d'; ctx.fillRect(0, floorY + 7, W, 3);
                for (var tile = 0; tile < 28; tile++) {
                    var tx = ((tile * 48 - cam) % (W + 48) + W + 48) % (W + 48);
                    ctx.fillStyle = tile % 2 ? '#33323a' : '#3b3740'; ctx.fillRect(tx, floorY + 10, 43, 9);
                    ctx.fillStyle = '#82756d'; ctx.fillRect(tx + 8, floorY + 27 + (tile % 3) * 8, 18, 4);
                    if (tile % 5 === 0) { ctx.fillStyle = '#f29c56'; ctx.globalAlpha = 0.55 + Math.sin(now * 8 + tile) * 0.2; ctx.fillRect(tx + 31, floorY - 5, 3, 3); ctx.globalAlpha = 1; }
                }
            }
            /* Civilians. */
            ctx.font = '28px sans-serif'; ctx.textAlign = 'center';
            for (var c = 0; c < s.civs.length; c++) {
                var cv = s.civs[c];
                var cx = cv.x - cam;
                if (cx < -40 || cx > W + 40) continue;
                if (cv.brokenT > 0) cv.brokenT = Math.max(0, cv.brokenT - DT);
                var crewY = floorY + (cv.y || 0);
                if (crewY < -10 || crewY > H + 60) continue;
                ctx.font = '28px sans-serif';
                ctx.fillText(cv.saved ? (cv.brokenT > 0 ? '⛓️‍💥' : '✅') : cv.emoji, cx, crewY);
                if (!cv.saved) {
                    ctx.font = '20px sans-serif'; ctx.fillText('🔗', cx, crewY - 38);
                    if (Math.abs(cv.x - p.x) < 70 && Math.abs(p.y - (cv.y || 0)) < 60) {
                        ctx.font = '14px sans-serif'; ctx.fillText('E · RESCUE', cx, crewY - 64);
                    }
                }
            }
            /* Destructible bunkers, towers, fuel trucks and supply crates. */
            for (var pr = 0; pr < s.props.length; pr++) {
                var prop = s.props[pr], wx = prop.x - cam;
                if (!prop.alive || wx < -130 || wx > W + 130) continue;
                var base = floorY + prop.y;
                var top = base - (prop.kind === 'watchtower' ? 188 : 94);
                if (prop.kind === 'fuel') {
                    ctx.fillStyle = '#9e382e'; ctx.fillRect(wx - 31, base - 58, 62, 54);
                    ctx.fillStyle = '#edb653'; ctx.fillRect(wx - 26, base - 52, 52, 5);
                    ctx.fillStyle = '#282733'; ctx.fillRect(wx - 36, base - 7, 16, 9); ctx.fillRect(wx + 20, base - 7, 16, 9);
                    ctx.font = '34px sans-serif'; ctx.fillText('⛽', wx, base - 19);
                    ctx.fillStyle = '#fff0a1'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('SHOOT ME', wx, base - 67);
                } else if (prop.kind === 'crate') {
                    ctx.fillStyle = '#805c38'; ctx.fillRect(wx - 25, base - 45, 50, 41);
                    ctx.strokeStyle = '#d4ac64'; ctx.lineWidth = 4; ctx.strokeRect(wx - 22, base - 42, 44, 35); ctx.beginPath(); ctx.moveTo(wx - 18, base - 40); ctx.lineTo(wx + 18, base - 7); ctx.moveTo(wx + 18, base - 40); ctx.lineTo(wx - 18, base - 7); ctx.stroke();
                    ctx.font = '22px sans-serif'; ctx.fillText('📦', wx, base - 15);
                } else if (prop.kind === 'tree' || prop.kind === 'shroom' || prop.kind === 'crystal' || prop.kind === 'ruin') {
                    var natureGlyph = prop.kind === 'tree' ? '🌳' : prop.kind === 'shroom' ? '🍄' : prop.kind === 'crystal' ? '💎' : '🪦';
                    var natureH = prop.kind === 'tree' ? 78 : prop.kind === 'crystal' ? 62 : prop.kind === 'shroom' ? 44 : 70;
                    ctx.fillStyle = prop.kind === 'crystal' ? '#3b2d5e' : prop.kind === 'shroom' ? '#3d2b4f' : '#2c3327';
                    ctx.fillRect(wx - 22, base - natureH, 44, natureH);
                    ctx.font = (prop.kind === 'tree' ? '40px' : '32px') + ' sans-serif'; ctx.fillText(natureGlyph, wx, base - 8);
                    top = base - natureH;
                } else {
                    var tall = prop.kind === 'watchtower';
                    top = base - (tall ? 188 : 94);
                    ctx.fillStyle = '#343341'; ctx.fillRect(wx - (tall ? 47 : 65), top, tall ? 94 : 130, base - top);
                    ctx.fillStyle = '#55505a'; ctx.fillRect(wx - (tall ? 53 : 72), top, tall ? 106 : 144, 13);
                    ctx.fillStyle = '#d38c59'; ctx.fillRect(wx - (tall ? 40 : 60), top + 20, tall ? 80 : 120, 5);
                    for (var slit = 0; slit < (tall ? 2 : 3); slit++) {
                        ctx.fillStyle = '#ffb85e'; ctx.fillRect(wx - 35 + slit * 34, top + 42, 12, 12);
                    }
                    ctx.font = tall ? '28px sans-serif' : '37px sans-serif'; ctx.fillText(tall ? '🗼' : '🧱', wx, base - 13);
                }
                ctx.fillStyle = '#080a12'; ctx.fillRect(wx - 30, base - (prop.kind === 'watchtower' ? 198 : 108), 60, 5);
                ctx.fillStyle = prop.hp / prop.maxHp < 0.42 ? '#ff625d' : '#66dfb4';
                ctx.fillRect(wx - 30, base - (prop.kind === 'watchtower' ? 198 : 108), 60 * Math.max(0, prop.hp / prop.maxHp), 5);
                if (prop.hitUntil > s.ticks) {
                    ctx.fillStyle = '#ffe3a2';
                    ctx.fillRect(wx - 24, top + 4, 48, 3);
                }
                if (prop.hp < prop.maxHp * 0.5) {
                    ctx.fillStyle = '#ffd166'; ctx.font = '14px sans-serif'; ctx.fillText('⚠', wx + 38, top - 2);
                }
            }
            /* Pickups sit above the rubble; weapon silhouettes glow. */
            for (var pk = 0; pk < s.pickups.length; pk++) {
                var pickup = s.pickups[pk], pickX = pickup.x - cam;
                if (pickup.taken || pickX < -30 || pickX > W + 30) continue;
                var pickupY = floorY + pickup.y;
                if (pickupY < -10 || pickupY > H + 40) continue;
                ctx.globalAlpha = 0.5 + Math.sin(now * 5 + pk) * 0.22; ctx.fillStyle = '#ffe68a'; ctx.beginPath(); ctx.arc(pickX, pickupY - 23, 23, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
                var pglyph = pickup.ammoPack ? '🔋' : pickup.weapon === 'launcher' ? '🚀' : pickup.weapon === 'moonbeam' ? '⚡' : pickup.weapon === 'saw' ? '🪚' : pickup.weapon === 'cryo' ? '❄️' : pickup.weapon === 'sun' ? '☀️' : pickup.weapon === 'harpoon' ? '⚓' : pickup.weapon ? '💥' : '🩹';
                ctx.font = '25px sans-serif'; ctx.fillText(pglyph, pickX, pickupY - 14);
            }
            /* Foes. */
            var glyph = s.contentMode === 'kids' ? { zed: '👻', rifle: '🤖', sapper: '👾' } : (s.contentMode === 'adult' ? { zed: '🧟', rifle: '💀', sapper: '🧌' } : { zed: '🧟', rifle: '💀', sapper: '👾' });
            for (var f = 0; f < s.foes.length; f++) {
                var F = s.foes[f];
                if (F.hp <= 0) continue;
                var fx = F.x - cam;
                if (fx < -40 || fx > W + 40) continue;
                var foeY = floorY + F.y;
                if (foeY < -10 || foeY > H + 55) continue;
                ctx.fillStyle = '#101018'; ctx.fillRect(fx - 22, foeY - 49, 44, 4);
                ctx.fillStyle = '#ff665f'; ctx.fillRect(fx - 22, foeY - 49, 44 * Math.max(0, F.hp / F.maxHp), 4);
                ctx.font = '31px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(glyph[F.type] || '🧟', fx, foeY - 6);
                if (F.hitUntil > s.ticks) {
                    ctx.fillStyle = '#fff3bc';
                    ctx.fillRect(fx - 16, foeY - 28, 7, 3);
                    ctx.fillRect(fx + 10, foeY - 34, 5, 3);
                }
                if (F.type === 'rifle') { ctx.font = '16px sans-serif'; ctx.fillText('🔫', fx + 16, foeY - 16); }
                if (F.type === 'sapper') { ctx.font = '14px sans-serif'; ctx.fillText('💣', fx + 17, foeY - 39); }
            }
            /* Shots: bright streaks and readable rockets. */
            for (var q = 0; q < s.shots.length; q++) {
                var sh = s.shots[q];
                var qx = sh.x - cam;
                if (qx < -20 || qx > W + 20) continue;
                var sy = floorY + sh.y;
                ctx.strokeStyle = sh.foe ? '#ff635a' : (sh.blast > 0 ? '#ffdb70' : '#73edff'); ctx.lineWidth = sh.blast > 0 ? 5 : 3;
                ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(qx, sy); ctx.lineTo(qx - sh.vx * 0.035, sy - sh.vy * 0.035); ctx.stroke(); ctx.globalAlpha = 1;
                ctx.font = sh.blast > 0 ? '20px sans-serif' : '14px sans-serif'; ctx.fillStyle = '#fff';
                ctx.fillText(sh.foe ? '🔥' : (sh.blast > 0 ? '🚀' : '✦'), qx, sy + 5);
            }
            /* Screen-space blast rings, sparks and flying rubble. */
            for (var ef = G.effects.length - 1; ef >= 0; ef--) {
                var effect = G.effects[ef]; effect.life -= DT;
                var ex = effect.x - cam, ey = floorY + effect.y;
                if (effect.type === 'blast') {
                    var progress = 1 - effect.life / effect.max;
                    ctx.globalAlpha = Math.max(0, effect.life / effect.max);
                    ctx.strokeStyle = '#ffd56d'; ctx.lineWidth = 8 * (1 - progress) + 1; ctx.beginPath(); ctx.arc(ex, ey, (effect.radius || 100) * progress, 0, Math.PI * 2); ctx.stroke();
                    ctx.fillStyle = '#ff7b3d'; ctx.beginPath(); ctx.arc(ex, ey, (effect.radius || 100) * progress * 0.52, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
                } else if (effect.type === 'girder') {
                    effect.vy += 880 * DT;
                    effect.y += effect.vy * DT;
                    ctx.save();
                    ctx.translate(ex, ey);
                    ctx.rotate(effect.vy * effect.spin);
                    ctx.globalAlpha = Math.min(1, effect.life * 4);
                    ctx.fillStyle = '#58525b';
                    ctx.fillRect(-effect.width / 2, 0, effect.width, 12);
                    ctx.fillStyle = '#c49b65';
                    ctx.fillRect(-effect.width / 2, 0, effect.width, 3);
                    ctx.restore();
                } else {
                    effect.x += effect.vx * DT; effect.y += effect.vy * DT; effect.vy += 500 * DT;
                    ctx.globalAlpha = Math.min(1, effect.life * 2); ctx.fillStyle = effect.color; ctx.fillRect(ex, ey, effect.size, effect.size); ctx.globalAlpha = 1;
                }
                if (effect.life <= 0) G.effects.splice(ef, 1);
            }
            /* Player silhouette, weapon kick, muzzle bloom, and forward reticle. */
            var heroEmoji = (BUILDS[s.buildId] || BUILDS['human:warrior']).emoji;
            var heroY = floorY + p.y;
            if (p.iframes > 0 && Math.floor(s.time * 18) % 2 === 0) ctx.globalAlpha = 0.36;
            ctx.font = '38px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(heroEmoji, px, heroY + 4);
            ctx.globalAlpha = 1;
            var w = WEAPONS[p.weapon] || WEAPONS.pulse;
            var muzzle = Math.max(0, (p.muzzleUntil || 0) - s.ticks) / 3;
            var barrel = 28 - (p.muzzleKick || 0) * muzzle;
            var gunX = px + Math.cos(p.aim) * barrel, gunY = heroY - 23 + Math.sin(p.aim) * barrel;
            ctx.strokeStyle = '#22212a'; ctx.lineWidth = p.weapon === 'launcher' ? 12 : 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px + 2, heroY - 22); ctx.lineTo(gunX, gunY); ctx.stroke();
            if (muzzle > 0) {
                ctx.save();
                ctx.translate(gunX, gunY);
                ctx.rotate(p.aim);
                ctx.globalAlpha = muzzle;
                ctx.fillStyle = '#ffad50';
                ctx.fillRect(1, -4, 10 + p.muzzleKick, 8);
                ctx.fillStyle = '#fff3bc';
                ctx.fillRect(1, -2, 8 + p.muzzleKick, 4);
                ctx.restore();
            }
            var aimX = px + Math.cos(p.aim) * 76, aimY = heroY - 22 + Math.sin(p.aim) * 76;
            ctx.strokeStyle = '#fff2bb'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(aimX, aimY, 5, 0, Math.PI * 2); ctx.moveTo(aimX - 9, aimY); ctx.lineTo(aimX - 6, aimY); ctx.moveTo(aimX + 6, aimY); ctx.lineTo(aimX + 9, aimY); ctx.stroke();
            ctx.font = '12px sans-serif'; ctx.fillStyle = '#f3ddaa'; ctx.textAlign = 'left';
            ctx.fillText(w.name + '  ' + (p.altAmmo > 0 ? '💣 ' + p.altAmmo : '💣 0') + '  ' + (p.dashCd > 0 ? '💨…' : '💨 READY'), px - 40, heroY - 62);
            if (!s.unstable.dropped && Math.abs(p.x - s.unstable.x) < 220 &&
                s.unstable.hp <= s.unstable.maxHp * 0.5) {
                ctx.fillStyle = '#ff5d5d';
                ctx.fillText('⬇ DANGER: COLLAPSE', px - 50, floorY - 60);
                ctx.fillStyle = '#9aa3c0';
            }
            /* Arcade cabinet HUD: score, combo, wave and forward progress. */
            ctx.fillStyle = 'rgba(8,10,18,.74)'; ctx.fillRect(12, 12, 240, 43);
            ctx.font = 'bold 16px ui-monospace,monospace'; ctx.fillStyle = '#ffe078'; ctx.textAlign = 'left';
            ctx.fillText('SCORE  ' + String(score(s)).padStart(6, '0'), 22, 31);
            ctx.font = 'bold 12px ui-monospace,monospace'; ctx.fillStyle = '#b5efff'; ctx.fillText('CHAIN ×' + Math.max(1, s.chain) + '   ' + (s.routeMode === 'wave' ? 'WAVE ' + s.wave : 'LIVES ' + (s.lifeQueue.length + (s.initialLifeUsed ? 0 : 1))), 22, 48);
            ctx.fillStyle = 'rgba(8,10,18,.72)'; ctx.fillRect(300, 17, 360, 13);
            ctx.fillStyle = '#f2ad5d'; ctx.fillRect(303, 20, 354 * clamp(p.x / s.worldLength, 0, 1), 7);
            ctx.strokeStyle = '#fff0c5'; ctx.lineWidth = 1; ctx.strokeRect(300, 17, 360, 13);
            ctx.font = 'bold 10px ui-monospace,monospace'; ctx.fillStyle = '#fff0c5'; ctx.textAlign = 'center'; ctx.fillText('BREACH LINE  ▸  ' + Math.floor(p.x / s.worldLength * 100) + '%', 480, 45);
            ctx.fillStyle = 'rgba(8,10,18,.78)'; ctx.fillRect(700, 12, 246, 43);
            ctx.font = 'bold 12px ui-monospace,monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
            ctx.fillText('⏱ ' + Math.floor(s.time) + 's    👾 ' + s.kills + '    📡 ' + s.rescued, 934, 31);
            ctx.font = '10px ui-monospace,monospace'; ctx.fillStyle = '#ffcf83';
            ctx.fillText(p.x > s.worldLength - 800 ? 'EXTRACTION AHEAD' : s.gameMode.toUpperCase() + ' · ' + s.routeMode.toUpperCase(), 934, 47);
            ctx.fillStyle = '#e8ecff';
            updateHud();
        } catch (_) { /* render must never throw */ }
    }

    function readPad() {
        /* Gamepad: left stick move, right stick aim, RT fire, LT alt,
         * South jump, East dash, West interact, Menu pause. Fail-open. */
        try {
            var gps = navigator.getGamepads ? navigator.getGamepads() : null;
            if (!gps) return null;
            for (var i = 0; i < gps.length; i++) {
                var gp = gps[i];
                if (gp && gp.connected) return gp;
            }
        } catch (_) {}
        return null;
    }

    function startRun(buildId, gameMode, contentMode, routeMode) {
        /* Sibling tuning by reference (view-side only): player movement
         * tuning + terrain material table, when sibling modules loaded. */
        var moveSpeed = MOVE, jumpV = JUMP_V;
        try {
            var PM = opt('GraveGain2dBPlayerMovement');
            if (PM && PM.TUNING) {
                if (typeof PM.TUNING.moveSpeed === 'number') moveSpeed = PM.TUNING.moveSpeed;
                if (typeof PM.TUNING.jumpV === 'number') jumpV = PM.TUNING.jumpV;
            }
        } catch (_) {}
        var mission = routeMode === 'wave' ? 'moonrock-wave' : 'moonrock-roguelite';
        try {
            var REG = opt('GraveGain2dBCampaignRegistry');
            if (REG && typeof REG.first === 'function') {
                var m = REG.first();
                if (m && m.id) mission = m.id;
            } else if (REG && REG.missions && REG.missions[0] && REG.missions[0].id) {
                mission = REG.missions[0].id;
            }
        } catch (_) {}
        G.run = newRun({ buildId: buildId, mission: mission, gameMode: gameMode || 'real-time', routeMode: routeMode || 'roguelite', contentMode: contentMode || 'teens', seed: Math.floor(Date.now() % 2147483647) });
        G.runCounted = false;
        G.gigglesSaveNotified = false;
        G.effects.length = 0;
        try { if (window.GigglesHelpDraft) setTimeout(function () { window.GigglesHelpDraft.present('gravegain2dB', G, null, true); }, 0); } catch (_) {}
        try {
            el('gg2dbMenu').style.display = 'none';
            el('gg2dbHud').style.display = 'flex';
            el('gg2dbTouch').hidden = false;
        } catch (_) {}
        sizeCanvas();
        var intro = routeMode === 'wave' ? (contentMode === 'kids' ? 'Stay together, dodge the classic waves, and reach the exit!\nSpace climb/jump · F melee · C special move · break cover carefully' : contentMode === 'adult' ? 'Classic waves are incoming. Hold the lane, then reach extraction.\nSpace climb/jump · F melee · C ability · blasts remain dangerous' : 'Classic enemy waves · clear lanes, keep moving, and reach extraction\nSpace climb/jump · F melee · C ability · control your fire') : (contentMode === 'kids' ? 'Help the crew and watch for cover · E frees a new helper\nSpace climb/jump · F melee · C special move · break things carefully!' : contentMode === 'adult' ? 'Read the breach, pick your angle, and free the crew · E recruits a new life\nSpace climb/jump · F melee · C ability · every blast can bite back' : 'Generated route · scout for cover and rescue chains · E recruits a new breacher\nSpace climb/jump · F melee · C ability · destruction is powerful and dangerous');
        var routeTitle = G.run.routeMode === 'wave' ? 'WAVE MODE' : 'ROGUELITE';
        var clockTitle = G.run.gameMode === 'chrono-lock' ? 'CHRONO-LOCK' : G.run.gameMode === 'turn-based' ? 'TURN-BASED' : 'REAL-TIME';
        showBanner(routeTitle + ' · ' + clockTitle + ' — ' + mission.toUpperCase(),
            intro + '\nTake the stairs to the gantries and lookout loot.');
        G.acc = 0; G.last = performance.now();
    }

    function stepInput() {
        var inp = { move: 0, jump: false, fire: false, alt: false, dash: false, interact: false, melee: false, ability: false, climb: false };
        try {
            var K = G.keys;
            if (K.left) inp.move -= 1;
            if (K.right) inp.move += 1;
            if (K.jump) { inp.jump = true; K.jump = false; }
            if (K.interact) { inp.interact = true; K.interact = false; }
            if (K.dash) { inp.dash = true; K.dash = false; }
            if (K.alt) { inp.alt = true; K.alt = false; }
            if (K.melee) { inp.melee = true; K.melee = false; }
            if (K.ability) { inp.ability = true; K.ability = false; }
            inp.climb = !!K.climb;
            if (K.swap) { inp.swap = K.swap; K.swap = null; }
            inp.fire = !!K.fireHeld;
            /* 360 mouse auto-aim (default) — IJKL / numpad overrides while held,
             * gamepad right stick overrides when deflected. All math stays in
             * game px (960x540) so canvas CSS scaling can never skew it. */
            if (K.aimUp || K.aimDown || K.aimLeft || K.aimRight) {
                inp.aim = Math.atan2((K.aimDown ? 1 : 0) - (K.aimUp ? 1 : 0), (K.aimRight ? 1 : 0) - (K.aimLeft ? 1 : 0));
            } else if (G.run && G.canvas) {
                var rect = G.canvas.getBoundingClientRect();
                var rw = Math.max(1, rect.width), rh = Math.max(1, rect.height);
                var pxGame = G.run.player.x - cameraX(G.run);
                var heroYGame = FLOOR_Y - cameraY(G.run) + G.run.player.y - 22;
                var canvasX = (typeof K.mx === 'number' ? K.mx : rw / 2) / rw * VIEW_WIDTH;
                var canvasY = (typeof K.my === 'number' ? K.my : rh / 2) / rh * VIEW_HEIGHT;
                inp.aim = Math.atan2(canvasY - heroYGame, canvasX - pxGame);
            }
            var gp = readPad();
            if (gp) {
                var ax = (gp.axes && gp.axes.length > 0) ? gp.axes[0] : 0;
                if (Math.abs(ax) > 0.25) inp.move = clamp(ax, -1, 1);
                var rx = gp.axes && gp.axes.length > 2 ? gp.axes[2] : 0;
                var ry = gp.axes && gp.axes.length > 3 ? gp.axes[3] : 0;
                if (Math.hypot(rx, ry) > 0.35) inp.aim = Math.atan2(ry, rx);
                var b = gp.buttons || [];
                if (b[7] && b[7].pressed) inp.fire = true;
                if (b[6] && b[6].pressed) inp.alt = true;
                if (b[0] && b[0].pressed && !G.padJump) { inp.jump = true; G.padJump = true; }
                if (!(b[0] && b[0].pressed)) G.padJump = false;
                if (b[1] && b[1].pressed && !G.padDash) { inp.dash = true; G.padDash = true; }
                if (!(b[1] && b[1].pressed)) G.padDash = false;
                if (b[2] && b[2].pressed && !G.padUse) { inp.interact = true; G.padUse = true; }
                if (!(b[2] && b[2].pressed)) G.padUse = false;
                if (b[3] && b[3].pressed) inp.melee = true;
                if (b[4] && b[4].pressed) inp.ability = true;
            }
        } catch (_) {}
        return inp;
    }

    function loop(now) {
        try {
            if (G.run && !G.run.over && !G.paused) {
                /* Fixed timestep: DT steps, frame delta clamped to 0.1s. */
                var frame = (now - G.last) / 1000;
                G.last = now;
                if (!(frame >= 0)) frame = 0;
                if (frame > 0.1) frame = 0.1;
                G.acc += frame;
                var n = 0;
                while (G.acc >= DT && n < 6) {
                    var ev = tick(G.run, stepInput());
                    G.acc -= DT; n += 1;
                    if (G.run.gigglesSaved && !G.gigglesSaveNotified) {
                        G.gigglesSaveNotified = true;
                        showBanner('▰ GG · GIGGLES CAUGHT YOU', 'A briefcase catch leaves you at 1 HP with a moment of invulnerability. It happens once each run, before your rescued crew lives are used.');
                    }
                    for (var i = 0; i < ev.length; i++) {
                        if (ev[i].t === 'rescue') {
                            var rescueCopy = G.run.contentMode === 'kids' ? 'A new friend is ready: ' + ev[i].name : G.run.contentMode === 'adult' ? 'Chain broken. ' + ev[i].name + ' joins the reserve lives.' : 'Crew freed: ' + ev[i].name + ' joins the reverse rescue queue.';
                            showBanner(G.run.contentMode === 'kids' ? '✨ FRIEND RESCUED' : '⛓️‍💥 CREW FREE', rescueCopy);
                        }
                        if (ev[i].t === 'collapse-platform') {
                            var fall = ev[i], count = Math.ceil(fall.width / 45);
                            for (var piece = 0; piece < count; piece++) {
                                var width = fall.width / count;
                                G.effects.push({ type: 'girder', x: fall.x + width * (piece + 0.5), y: fall.y,
                                    width: width - 2, vy: 45 + piece * 28, spin: (piece % 2 ? -1 : 1) * 0.001, life: 0.65 });
                            }
                        } else if ((ev[i].t === 'hit' && typeof ev[i].x === 'number') || ev[i].t === 'prop-hit') {
                            var hit = ev[i];
                            for (var hs = 0; hs < 3; hs++) {
                                G.effects.push({ type: 'debris', x: hit.x, y: hit.y,
                                    vx: hit.direction * (70 + Math.random() * 160), vy: -40 - Math.random() * 110,
                                    size: 3, color: '#ffe6aa', life: 0.16 + Math.random() * 0.12 });
                            }
                        } else if (ev[i].t === 'blast' || ev[i].t === 'demolish') {
                            var boom = ev[i];
                            if (boom.t === 'blast') G.effects.push({ type: 'blast', x: boom.x, y: boom.y, radius: boom.radius, life: 0.32, max: 0.32 });
                            var debris = boom.kind === 'fuel' ? 22 : 11;
                            for (var db = 0; db < debris; db++) {
                                var a = Math.random() * Math.PI * 2, v = 90 + Math.random() * (boom.kind === 'fuel' ? 480 : 250);
                                G.effects.push({ type: 'debris', x: boom.x, y: typeof boom.y === 'number' ? boom.y : -35, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 110,
                                    size: 2 + Math.random() * 6, color: boom.kind === 'fuel' ? (db % 2 ? '#ffc35b' : '#ff5a3d') : (db % 2 ? '#b7b2a2' : '#70d8e9'), life: 0.35 + Math.random() * 0.6, max: 1 });
                            }
                        } else if (ev[i].t === 'kill' && G.run) {
                            var kill = ev[i];
                            var deadFoe = typeof kill.x === 'number' ? null : G.run.foes.find(function (f) {
                                return f.type === kill.type && f.hp <= 0 && !f.effectDone;
                            });
                            if (deadFoe) deadFoe.effectDone = true;
                            if (deadFoe || typeof kill.x === 'number') {
                                for (var spark = 0; spark < (kill.explosive ? 12 : 8); spark++) G.effects.push({ type: 'debris', x: deadFoe ? deadFoe.x : kill.x, y: deadFoe ? deadFoe.y - 25 : kill.y,
                                    vx: (Math.random() - 0.5) * 190 + (kill.direction || 0) * 110, vy: -70 - Math.random() * 170, size: 3 + Math.random() * 4,
                                    color: G.run.contentMode === 'kids' ? (spark % 2 ? '#a8e9ff' : '#d8f7a3') : G.run.contentMode === 'adult' ? (spark % 2 ? '#7f1d1d' : '#c1121f') : (spark % 2 ? '#ff725b' : '#f6ca77'), life: 0.25 + Math.random() * 0.28, max: 0.6 });
                            }
                        }
                    }
                    if (G.run.over) {
                        if (!G.runCounted) {
                            G.runCounted = true;
                            var p = loadProfile();
                            p.wins += G.run.win ? 1 : 0;
                            p.best = Math.max(p.best, score(G.run));
                            if (G.run.win && (!p.fastest || G.run.time < p.fastest)) p.fastest = G.run.time;
                            saveProfile(p);
                            showBanner(G.run.win ? (G.run.contentMode === 'kids' ? '🎉 CREW HOME SAFE' : 'EXTRACTION — YOU MADE IT') : (G.run.contentMode === 'kids' ? 'CREW NEEDS A DO-OVER' : 'BREACH CREW DOWN'),
                                'Score ' + score(G.run) + ' · kills ' + G.run.kills + ' · rescued ' + G.run.rescued + '/' + G.run.civs.length +
                                ' · damage taken ' + Math.ceil(G.run.player.damageTaken) + ' · accuracy ' + (G.run.shotsFired ? Math.round(G.run.kills / G.run.shotsFired * 100) : 0) +
                                '% · time ' + G.run.time.toFixed(1) + 's · melee ' + G.run.meleeKills + ' · demolished ' + G.run.demolition +
                                ' · clear sectors +' + G.run.slowBonus + (G.run.player.damageTaken === 0 ? ' · NO-HIT +125' : '') +
                                ' · PB ' + (p.fastest ? p.fastest.toFixed(1) + 's' : '—') + ' · best score ' + p.best, true);
                        }
                        G.acc = 0;
                        break;
                    }
                }
                if (n >= 6) G.acc = 0;
            } else {
                G.last = now;
            }
            if (G.bannerUntil && now >= G.bannerUntil) { hideBanner(); G.bannerUntil = 0; }
            if (G.effects.length > 360) G.effects.splice(0, G.effects.length - 360);
            render();
        } catch (_) {}
        try { requestAnimationFrame(loop); } catch (_) {}
    }

    function bind() {
        try {
            var buildId = 'human:warrior', gameMode = 'real-time', routeMode = 'roguelite', contentMode = 'teens';
            try { var modeApi = opt('GG2DB_Modes'), shellMode = modeApi && typeof modeApi.mode === 'function' ? modeApi.mode() : null; if (shellMode) contentMode = normalizeContentMode(shellMode); } catch (_) {}
            G.effects = [];
            G.keys = { left: false, right: false, jump: false, fireHeld: false, alt: false, dash: false, interact: false, melee: false, ability: false, climb: false, swap: null, mx: 640, my: 270, aimingMouse: true, aimUp: false, aimDown: false, aimLeft: false, aimRight: false };
            var savedProfile = loadProfile(); if (savedProfile && BUILDS[savedProfile.buildId]) buildId = savedProfile.buildId;
            el('gg2dbRedeploy').addEventListener('click', function () {
                if (G.run && G.run.over) startRun(buildId, gameMode, contentMode, routeMode);
            });
            var setupPages = Array.prototype.slice.call(document.querySelectorAll('[data-setup-page]'));
            var setupIndex = 0, racePick = el('gg2dbRacePick'), classPick = el('gg2dbClassPick');
            var setupBack = el('gg2dbSetupBack'), setupNext = el('gg2dbSetupNext'), setupStep = el('gg2dbSetupStep');
            var selectedRace = buildId.split(':')[0], selectedClass = buildId.split(':')[1];
            function renderRaceOptions() {
                if (!racePick) return;
                racePick.innerHTML = RACES.map(function (race) {
                    var active = race.id === selectedRace;
                    return '<button type="button" data-race="' + race.id + '" class="' + (active ? 'sel' : '') + '" aria-pressed="' + active + '">' + race.emoji + ' ' + race.name +
                        '<small>HP ' + race.hp + ' · Armor ' + race.armor + ' · ' + Math.round(MOVE * race.speed) + ' speed</small></button>';
                }).join('');
            }
            function renderClassOptions() {
                if (!classPick) return;
                classPick.innerHTML = CLASSES.map(function (cls) {
                    var id = selectedRace + ':' + cls.id, b = BUILDS[id], active = cls.id === selectedClass;
                    return '<button type="button" data-class="' + cls.id + '" class="' + (active ? 'sel' : '') + '" aria-pressed="' + active + '">' + b.name +
                        '<small>' + cls.name + ' · HP ' + b.hp + ' · Armor ' + b.armor + ' · ' + WEAPONS[b.weapon].name + '</small><small>' + b.ability + ' · ' + b.melee + '</small></button>';
                }).join('');
            }
            function updateSetupSummary() {
                var b = BUILDS[buildId], summary = el('gg2dbBuildSummary');
                if (summary && b) summary.textContent = b.emoji + ' ' + b.name + ' · HP ' + b.hp + ' · Armor ' + b.armor + ' · ' + WEAPONS[b.weapon].name + ' · ' + b.ability;
            }
            function showSetupStep(index) {
                setupIndex = Math.max(0, Math.min(2, index));
                setupPages.forEach(function (page, i) { page.hidden = i !== setupIndex; page.classList.toggle('is-active', i === setupIndex); });
                if (setupBack) setupBack.disabled = setupIndex === 0;
                if (setupStep) setupStep.textContent = ['Race · 1 of 3', 'Class · 2 of 3', 'Breach rules · 3 of 3'][setupIndex];
                if (setupNext) { setupNext.disabled = setupIndex === 2; setupNext.textContent = setupIndex === 0 ? 'CHOOSE CLASS →' : setupIndex === 1 ? 'BREACH RULES →' : 'READY'; }
                var goButton = el('gg2dbGoBtn'); if (goButton) goButton.hidden = setupIndex !== 2;
            }
            renderRaceOptions(); renderClassOptions(); updateSetupSummary(); showSetupStep(0);
            if (racePick) racePick.addEventListener('click', function (ev) {
                var button = ev.target.closest && ev.target.closest('[data-race]'); if (!button) return;
                selectedRace = button.getAttribute('data-race');
                if (!BUILDS[selectedRace + ':' + selectedClass]) selectedClass = 'warrior';
                buildId = selectedRace + ':' + selectedClass;
                renderRaceOptions(); renderClassOptions(); updateSetupSummary();
            });
            if (classPick) classPick.addEventListener('click', function (ev) {
                var button = ev.target.closest && ev.target.closest('[data-class]'); if (!button) return;
                selectedClass = button.getAttribute('data-class'); buildId = selectedRace + ':' + selectedClass;
                renderClassOptions(); updateSetupSummary();
                var prof = loadProfile(); prof.buildId = buildId; saveProfile(prof);
            });
            if (setupNext) setupNext.addEventListener('click', function () {
                if (setupIndex === 0) { selectedRace = buildId.split(':')[0]; renderClassOptions(); }
                if (setupIndex === 1) updateSetupSummary();
                showSetupStep(setupIndex + 1);
            });
            if (setupBack) setupBack.addEventListener('click', function () { showSetupStep(setupIndex - 1); });
            var modePick = el('gg2dbModePick'), contentPick = el('gg2dbContentPick');
            if (modePick) modePick.addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('[data-mode]'); if (!b) return; gameMode = b.getAttribute('data-mode'); for (var i = 0; i < modePick.children.length; i++) modePick.children[i].classList.toggle('sel', modePick.children[i] === b); });
            var routePick = el('gg2dbRoutePick');
            if (routePick) routePick.addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('[data-route]'); if (!b) return; routeMode = b.getAttribute('data-route'); for (var i = 0; i < routePick.children.length; i++) routePick.children[i].classList.toggle('sel', routePick.children[i] === b); });
            if (contentPick) { for (var ci = 0; ci < contentPick.children.length; ci++) contentPick.children[ci].classList.toggle('sel', contentPick.children[ci].getAttribute('data-content') === contentMode); contentPick.addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('[data-content]'); if (!b) return; contentMode = b.getAttribute('data-content'); for (var i = 0; i < contentPick.children.length; i++) contentPick.children[i].classList.toggle('sel', contentPick.children[i] === b); try { var modes = opt('GG2DB_Modes'); if (modes && modes.setMode) modes.setMode(contentMode === 'kids' ? 'kid' : contentMode === 'adult' ? 'all' : 'teen'); } catch (_) {} }); }
            window.addEventListener('fourweird-content-mode', function (event) { try { var mode = event && event.detail && event.detail.mode; if (!mode) return; contentMode = normalizeContentMode(mode); if (G.run) G.run.contentMode = contentMode; if (contentPick) for (var i = 0; i < contentPick.children.length; i++) contentPick.children[i].classList.toggle('sel', contentPick.children[i].getAttribute('data-content') === contentMode); } catch (_) {} });
            var go = el('gg2dbGoBtn');
            if (go) go.addEventListener('click', function () {
                try { if (setupIndex !== 2) return; startRun(buildId, gameMode, contentMode, routeMode); } catch (_) {}
            });
        var tb = el('gg2dbTouch');
        if (tb) tb.addEventListener('click', function (ev) {
                try {
                    var b2 = ev.target.closest ? ev.target.closest('[data-act]') : null;
                    if (!b2 || !G.run) return;
                    var a = b2.getAttribute('data-act');
                    if (a === 'jump') G.keys.jump = true;
                    else if (a === 'dash') G.keys.dash = true;
                    else if (a === 'interact') G.keys.interact = true;
                    else if (a === 'melee') G.keys.melee = true;
                    else if (a === 'ability') G.keys.ability = true;
                    else if (a === 'alt') G.keys.alt = true;
                    else if (a === 'fire') {
                        G.keys.fireHeld = true;
                        setTimeout(function () { try { G.keys.fireHeld = false; } catch (_) {} }, 220);
                    }
                } catch (_) {}
            });
            if (tb) {
                tb.addEventListener('pointerdown', function (ev) {
                    var fireButton = ev.target.closest && ev.target.closest('[data-act="fire"]');
                    if (fireButton) { G.keys.fireHeld = true; ev.preventDefault(); }
                });
                tb.addEventListener('pointerup', function () { G.keys.fireHeld = false; });
                tb.addEventListener('pointercancel', function () { G.keys.fireHeld = false; });
                window.addEventListener('blur', function () { G.keys.fireHeld = false; });
            }
            document.addEventListener('keydown', function (ev) {
                try {
                    var k = ev.key;
                    if ((k === 'g' || k === 'G') && G.run && !G.run.over && window.GigglesHelpDraft) { window.GigglesHelpDraft.present('gravegain2dB', G); return; }
                    if (k === 'ArrowLeft' || k === 'a' || k === 'A') G.keys.left = true;
                    else if (k === 'ArrowRight' || k === 'd' || k === 'D') G.keys.right = true;
                    else if (k === 'j' || k === 'J' || k === 'Numpad4') { G.keys.aimLeft = true; }
                    else if (k === 'l' || k === 'L' || k === 'Numpad6') { G.keys.aimRight = true; }
                    else if (k === 'i' || k === 'I' || k === 'Numpad8') { G.keys.aimUp = true; }
                    else if (k === 'k' || k === 'K' || k === 'Numpad2') { G.keys.aimDown = true; }
                    else if (k === ' ' || k === 'w' || k === 'W' || k === 'ArrowUp') { G.keys.jump = true; G.keys.climb = k !== ' '; ev.preventDefault(); }
                    else if (k === 'e' || k === 'E') G.keys.interact = true;
                    else if (k === 'Shift') G.keys.dash = true;
                    else if (k === 'q' || k === 'Q') G.keys.alt = true;
                    else if (k === 'f' || k === 'F') G.keys.melee = true;
                    else if (k === 'c' || k === 'C') G.keys.ability = true;
                    else if (k === '1' && G.run) G.keys.swap = 'starter';
                    else if (k === '2' && G.run) G.keys.swap = 'pickup';
                    else if (k === 'Escape' || k === 'p' || k === 'P') {
                        if (G.run && G.run.over) { startRun(buildId, gameMode, contentMode, routeMode); return; }
                        G.paused = !G.paused;
                        showBanner(G.paused ? 'PAUSED' : 'BREACH', G.paused ? 'Esc resume · controls in menu' : '', G.paused);
                        if (!G.paused) hideBanner();
                    } else if ((k === 'r' || k === 'R' || k === 'Enter') && G.run && G.run.over) { startRun(buildId, gameMode, contentMode, routeMode); }
                } catch (_) {}
            });
            document.addEventListener('keyup', function (ev) {
                try {
                    var k = ev.key;
                    if (k === 'ArrowLeft' || k === 'a' || k === 'A') G.keys.left = false;
                    else if (k === 'ArrowRight' || k === 'd' || k === 'D') G.keys.right = false;
                    else if (k === 'w' || k === 'W' || k === 'ArrowUp') G.keys.climb = false;
                    else if (k === 'j' || k === 'J' || k === 'Numpad4') G.keys.aimLeft = false;
                    else if (k === 'l' || k === 'L' || k === 'Numpad6') G.keys.aimRight = false;
                    else if (k === 'i' || k === 'I' || k === 'Numpad8') G.keys.aimUp = false;
                    else if (k === 'k' || k === 'K' || k === 'Numpad2') G.keys.aimDown = false;
                } catch (_) {}
            });
            if (G.canvas) {
                G.canvas.addEventListener('mousemove', function (ev) {
                    try {
                        var r = G.canvas.getBoundingClientRect();
                        G.keys.mx = ev.clientX - r.left;
                        G.keys.my = ev.clientY - r.top;
                        G.keys.aimingMouse = true;
                    } catch (_) {}
                });
                G.canvas.addEventListener('mousedown', function (ev) {
                    try {
                        if (ev.button === 0) G.keys.fireHeld = true;
                        else if (ev.button === 2) G.keys.alt = true;
                    } catch (_) {}
                });
                document.addEventListener('mouseup', function (ev) {
                    try { if (ev.button === 0) G.keys.fireHeld = false; } catch (_) {}
                });
                G.canvas.addEventListener('contextmenu', function (ev) {
                    try { ev.preventDefault(); } catch (_) {}
                });
                G.canvas.addEventListener('wheel', function (ev) {
                    try {
                        G.keys.swap = G.run && G.run.player.weaponSlot === 'pickup' ? 'starter' : 'pickup';
                        ev.preventDefault();
                    } catch (_) {}
                }, { passive: false });
                G.canvas.addEventListener('click', function () {
                    if (!G.run?.over && !G.paused) hideBanner();
                });
            }
            var fs = el('gg2dbFsBtn');
            if (fs) fs.addEventListener('click', function () {
                try {
                    var st = el('gg2dbStage');
                    if (typeof window.__fourweirdToggleFullscreen === 'function') { window.__fourweirdToggleFullscreen(); return; }
                    if (!document.fullscreenElement && st && st.requestFullscreen) st.requestFullscreen();
                    else if (document.exitFullscreen) document.exitFullscreen();
                } catch (_) {}
            });
            document.addEventListener('fullscreenchange', function () { try { sizeCanvas(); } catch (_) {} });
            window.addEventListener('resize', function () { try { sizeCanvas(); } catch (_) {} });
        } catch (_) {}
    }

    function boot() {
        try {
            window.__gg2dbMissing = window.__gg2dbMissing || function () {};
            var canvas = el('gg2dbCanvas');
            G = {
                canvas: canvas,
                ctx: canvas ? canvas.getContext('2d') : null,
                dpr: 1, run: null, acc: 0, last: 0,
                paused: false, runCounted: false, padJump: false, padDash: false, padUse: false, bannerUntil: 0,
                keys: null
            };
            try {
                var prof = loadProfile();
                if (prof && HEROES[prof.hero]) G.hero = prof.hero;
            } catch (_) {}
            bind();
            sizeCanvas();
            try { requestAnimationFrame(function (t) { G.last = t || performance.now(); requestAnimationFrame(loop); }); }
            catch (_) {}
            try {
                if (window.FourweirdContentMode && typeof window.FourweirdContentMode.ready === 'function') {
                    window.FourweirdContentMode.ready({ slug: 'gravegain2dB', shell: 'gravegain2dB-roguelite-0.4.2' });
                }
            } catch (_) {}
            return true;
        } catch (_) { return false; }
    }

    var api = {
        VERSION: VERSION,
        SAVE_KEY: SAVE_KEY,
        DT: DT,
        HEROES: HEROES,
        BUILDS: BUILDS,
        WEAPONS: WEAPONS,
        FOES: FOES,
        newRun: newRun,
        getState: function () { return G; },
        generateRoute: generateRoute,
        tick: tick,
        score: score,
        startRun: startRun,
        boot: boot
    };

    try { window.GraveGain2dB = api; } catch (_) {}
    /* Legacy shell alias: the previous menu/hub/mission shell exposed a
     * GraveGain2dBSim starter. Keep a read-only starter alias only. */
    try {
        if (!window.GraveGain2dBSim) window.GraveGain2dBSim = { start: function () { try { startRun('lisa'); } catch (_) {} } };
    } catch (_) {}
    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({ name: 'gravegain2dB', version: VERSION, init: boot });
    } catch (_) {}

    try {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
        else boot();
    } catch (_) {}
})();
