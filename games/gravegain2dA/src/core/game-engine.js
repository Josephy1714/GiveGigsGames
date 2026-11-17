(function (root) {
    'use strict';

    var Bus = root.GraveGainBus;
    if (!Bus && typeof require === 'function') {
        try { Bus = require('./engine-bus.js'); } catch (_) { Bus = null; }
    }
    var TerrainGridCtor = root.TerrainGrid;
    if (!TerrainGridCtor && typeof require === 'function') {
        try { TerrainGridCtor = require('./terrain-grid.js'); } catch (_) { TerrainGridCtor = null; }
    }

    var RACE_STATS = {
        human: { maxHp: 100, hpRegen: 1.0, stamina: 100, speed: 6.2 },
        elf: { maxHp: 75, hpRegen: 3.0, stamina: 100, speed: 6.8 },
        dwarf: { maxHp: 150, hpRegen: 2.0, stamina: 100, speed: 5.0 },
        orc: { maxHp: 200, hpRegen: 3.0, stamina: 100, speed: 5.6 }
    };

    var ENEMY_TEMPLATES = [
        { name: 'Goblin Skeleton', emoji: '💀', hp: 22, dmg: 5, speed: 3.2, type: 'standard', blood: 'red' },
        { name: 'Elven Skeleton', emoji: '💀', hp: 32, dmg: 7, speed: 2.8, type: 'standard', blood: 'green' },
        { name: 'Goblin Zed', emoji: '🧟', hp: 48, dmg: 10, speed: 2.5, type: 'standard', blood: 'red' },
        { name: 'Small Orc Zed', emoji: '🧟‍♂️', hp: 68, dmg: 13, speed: 2.3, type: 'standard', blood: 'red' },
        { name: 'Flying Elf Skull', emoji: '👻', hp: 16, dmg: 26, speed: 4.0, type: 'exploding', blood: 'purple' },
        { name: 'Medium Orc Zed', emoji: '👺', hp: 140, dmg: 20, speed: 2.0, type: 'elite', blood: 'red' },
        { name: 'Dwarven Zed', emoji: '🛡️', hp: 190, dmg: 16, speed: 1.8, type: 'elite', blood: 'red', armored: true },
        { name: 'Human Zed', emoji: '🤖', hp: 480, dmg: 24, speed: 2.2, type: 'boss', blood: 'red', ranged: true },
        { name: 'Huge Orc Zed', emoji: '🟢👹', hp: 760, dmg: 36, speed: 1.5, type: 'boss', blood: 'red' },
        { name: 'Elven Necromancer', emoji: '🧙', hp: 390, dmg: 16, speed: 1.8, type: 'boss', blood: 'purple', summoner: true }
    ];

    function themeToBiome(theme, floorIndex) {
        if (theme === 'metallic_ship') return 'void_hull';
        if (theme === 'dwarven_vault') return 'manufactorum';
        if (theme === 'elven_grove' || theme === 'toxic_catacombs' || theme === 'stone_crypt' || theme === 'citadel_darkness') return 'cathedral';
        if (theme === 'orc_wastes') return 'trench';
        var order = ['cathedral', 'manufactorum', 'void_hull', 'trench'];
        return order[((Math.max(1, floorIndex || 1)) - 1) % order.length];
    }

    function clamp(v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    function createGameEngine(opts) {
        opts = opts || {};
        var bus = new Bus.EventBus();
        var registry = new Bus.SubsystemRegistry(bus);
        var rng = new Bus.SeededRNG(opts.seed || 1337);

        var renderNs = root.GraveGainRender || {};
        var threeBundle = null;
        var worldRenderer = null;
        var cameraRig = null;
        var entityRenderer = null;

        var enemySeq = 1;
        var lootSeq = 1;
        var projSeq = 1;

        var state = {
            missionConfig: null,
            floorIndex: 1,
            biome: 'cathedral',
            seed: rng.getSeed(),
            temporalMode: 'realtime',
            gameSpeed: 1,
            chronoScale: 0.04,
            turnCount: 1,
            paused: false,
            pauseMode: 'pause',
            elapsedTime: 0,
            frameCount: 0,
            fps: 60,
            difficulty: 'normal',
            player: null,
            enemies: [],
            props: [],
            projectiles: [],
            loot: [],
            debris: [],
            weather: null,
            interiorZone: { zoneType: 'exterior', roofGroupId: null, roofCollapsed: false },
            runKills: 0,
            runGold: 0,
            fireCooldown: 0,
            grenadeCooldown: 0,
            shoveCooldown: 0,
            progression: {
                level: 1,
                xp: 0,
                paragonLevel: 0,
                paragonPoints: 0,
                subSpecId: 'bulwark',
                alignment: { puritan: 0, radical: 0 },
                passiveNodes: [],
                equippedPerks: [],
                unlockedBlueprints: []
            },
            stash: {
                items: [],
                materials: {},
                shards: []
            },
            presets: {
                activePresetId: null,
                presets: []
            }
        };

        function hydrateStorageKeys() {
            if (typeof localStorage === 'undefined') return;
            try {
                var progRaw = localStorage.getItem('GraveGain2DA_Progression_v1');
                if (progRaw) {
                    var parsedProg = JSON.parse(progRaw);
                    if (parsedProg && typeof parsedProg === 'object') {
                        state.progression = Object.assign({}, state.progression, parsedProg);
                    }
                }
                var stashRaw = localStorage.getItem('GraveGain2DA_AccountStash_v1');
                if (stashRaw) {
                    var parsedStash = JSON.parse(stashRaw);
                    if (parsedStash && typeof parsedStash === 'object') {
                        state.stash = Object.assign({}, state.stash, parsedStash);
                    }
                }
                var presetsRaw = localStorage.getItem('GraveGain2DA_LoadoutPresets_v1');
                if (presetsRaw) {
                    var parsedPresets = JSON.parse(presetsRaw);
                    if (parsedPresets && typeof parsedPresets === 'object') {
                        state.presets = Object.assign({}, state.presets, parsedPresets);
                    }
                }
            } catch (_) {}
        }
        hydrateStorageKeys();

        if (typeof window !== 'undefined') {
            window.addEventListener('fourweird-cloud-load', function () {
                hydrateStorageKeys();
            });
        }

        var terrain = new TerrainGridCtor({ width: 80, height: 80, tileSize: 2.0, tierHeight: 1.5, seed: state.seed });

        var inputState = {
            keys: {},
            moveX: 0,
            moveZ: 0,
            aimX: 0,
            aimZ: 0,
            hasAim: false,
            mouseDown: false,
            rightClick: false,
            interactPressed: false,
            grenadePressed: false,
            shovePressed: false,
            tapMove: { active: false, x: 0, z: 0 }
        };

        var rafId = null;
        var lastTimestamp = 0;
        var rollingLastTime = 0;
        var loopActive = false;

        function initRenderers() {
            if (threeBundle) return;
            var hasDom = typeof document !== 'undefined' && typeof window !== 'undefined';
            var canvas = opts.canvas || (hasDom ? document.getElementById('gameCanvas') : null);
            var container = opts.container || (hasDom ? document.getElementById('canvasContainer') : null);

            if (renderNs.ThreeLoader && canvas) {
                threeBundle = renderNs.ThreeLoader.init({
                    canvas: canvas,
                    container: container,
                    bus: bus,
                    preserveDrawingBuffer: !!opts.preserveDrawingBuffer
                });
            }
            if (renderNs.CameraRig) {
                var w = threeBundle ? threeBundle.getDiagnostics().width : 1000;
                var h = threeBundle ? threeBundle.getDiagnostics().height : 600;
                cameraRig = renderNs.CameraRig.create({
                    bus: bus,
                    container: container,
                    width: w,
                    height: h
                });
                if (threeBundle && cameraRig && cameraRig.camera) {
                    threeBundle.attachCamera(cameraRig.camera);
                }
            }
            if (renderNs.WorldRenderer && threeBundle && threeBundle.scene) {
                worldRenderer = renderNs.WorldRenderer.create({
                    scene: threeBundle.scene,
                    bus: bus
                });
            }
            if (renderNs.EntityRenderer && threeBundle && threeBundle.scene) {
                entityRenderer = renderNs.EntityRenderer.create({
                    scene: threeBundle.scene
                });
            }
        }

        function createPlayer(race, classType) {
            race = RACE_STATS[race] ? race : 'human';
            var r = RACE_STATS[race];
            return {
                id: 'player',
                race: race,
                classType: classType || 'warrior',
                x: 80,
                y: 0,
                z: 80,
                vx: 0,
                vy: 0,
                vz: 0,
                radius: 0.55,
                angle: 0,
                maxHp: r.maxHp,
                hp: r.maxHp,
                hpRegen: r.hpRegen,
                stamina: r.stamina,
                maxStamina: r.stamina,
                speed: r.speed,
                mana: race === 'elf' ? 100 : 0,
                maxMana: 100,
                rage: 0,
                shieldBubble: 0,
                shieldCooldown: 0,
                stoneForm: false,
                stoneDuration: 0,
                gold: 0,
                xp: 0,
                level: 1,
                nextLevelXp: 50,
                levelUpFlash: 0,
                isDead: false,
                dodgeTime: 0,
                perfectBlockWindow: 0,
                blockCooldown: 0,
                bloodlust: [],
                suppression: 0,
                suppressionTier: 0,
                inCover: false,
                holdPosition: false,
                fallenIntoChasm: false,
                moveTarget: { active: false, x: 0, z: 0 }
            };
        }

        function spawnEnemy(template, wx, wz, floorScale) {
            var diffMap = {
                easy: { hp: 0.6, dmg: 0.5 },
                normal: { hp: 1.0, dmg: 1.0 },
                nightmare: { hp: 2.5, dmg: 2.0 }
            };
            var diff = diffMap[state.difficulty] || diffMap.normal;
            var elevY = terrain.getWorldHeightAt(wx, wz);
            var maxHp = Math.round(template.hp * floorScale * diff.hp);
            var enemy = {
                id: 'enemy_' + (enemySeq++),
                name: template.name,
                emoji: template.emoji,
                type: template.type,
                bloodColor: template.blood || 'red',
                armored: !!template.armored,
                ranged: !!template.ranged,
                summoner: !!template.summoner,
                x: wx,
                y: elevY,
                z: wz,
                vx: 0,
                vy: 0,
                vz: 0,
                spawnX: wx,
                spawnZ: wz,
                radius: template.type === 'boss' ? 1.05 : 0.55,
                angle: 0,
                maxHp: maxHp,
                hp: maxHp,
                dmg: template.dmg * floorScale * diff.dmg,
                speed: template.speed,
                state: 'idle',
                flash: 0,
                knockdownTimer: 0,
                staggerTimer: 0,
                suppression: 0,
                isDead: false,
                fallenIntoChasm: false,
                attackCooldown: 0
            };
            state.enemies.push(enemy);
            return enemy;
        }

        function spawnLoot(wx, wz, type, value) {
            var wy = terrain.getWorldHeightAt(wx, wz);
            var item = {
                id: 'loot_' + (lootSeq++),
                x: wx,
                y: wy,
                z: wz,
                type: type || 'gold',
                value: value || 15,
                radius: 0.45,
                picked: false
            };
            state.loot.push(item);
            return item;
        }

        function buildSector(config) {
            config = config || {};
            var floorIndex = Math.max(1, Number(config.floorIndex || state.floorIndex) || 1);
            state.floorIndex = floorIndex;

            var biome = config.biome;
            if (!biome || TerrainGridCtor.BIOMES.indexOf(biome) < 0) {
                biome = themeToBiome(config.dungeonTheme, floorIndex);
            }
            state.biome = biome;
            if (typeof config.seed === 'number') {
                state.seed = config.seed >>> 0;
                rng.setSeed(state.seed);
            }

            terrain.generate({ biome: biome, seed: state.seed, floorIndex: floorIndex });
            state.props = terrain.props;
            state.debris = terrain.debris;
            state.weather = terrain.getBiomeWeather();
            state.projectiles = [];
            state.enemies = [];
            state.loot = [];

            if (!state.player) {
                state.player = createPlayer(config.race || 'human', config.classType || 'warrior');
            }
            var spawnPos = terrain.gridToWorld(terrain.spawnRoom.cx, terrain.spawnRoom.cz);
            state.player.x = spawnPos.x;
            state.player.y = spawnPos.y;
            state.player.z = spawnPos.z;
            state.player.vx = 0;
            state.player.vy = 0;
            state.player.vz = 0;
            state.player.isDead = false;
            state.player.fallenIntoChasm = false;
            state.player.moveTarget.active = false;

            terrain.updateFogOfWar(state.player, 16);
            state.interiorZone = terrain.getInteriorZoneAt(state.player.x, state.player.z);

            var floorRng = rng.fork('spawns_' + floorIndex);
            var diffScale = 1.0 + Math.min(floorIndex, 30) * 0.15;

            for (var i = 0; i < terrain.rooms.length; i++) {
                var room = terrain.rooms[i];
                if (room.type === 'spawn') continue;
                var mobCount = room.type === 'safespace' ? 4 : 2;
                for (var m = 0; m < mobCount; m++) {
                    var gx = floorRng.int(room.x + 1, room.x + room.w - 2);
                    var gz = floorRng.int(room.z + 1, room.z + room.h - 2);
                    var cell = terrain.getCell(gx, gz);
                    if (!cell || !terrain.isPassable(gx, gz)) continue;
                    var w = terrain.gridToWorld(gx, gz);
                    var tpl = ENEMY_TEMPLATES[floorRng.int(0, Math.min(ENEMY_TEMPLATES.length - 1, floorIndex >= 3 ? 6 : 3))];
                    spawnEnemy(tpl, w.x, w.z, diffScale);
                }
                if (room.type === 'treasury') {
                    var lw = terrain.gridToWorld(room.cx, room.cz);
                    spawnLoot(lw.x, lw.z, 'gold', 50);
                }
            }

            // Starter pack near spawn for immediate combat verification
            var nearSpawn = [];
            for (var z = Math.max(1, terrain.spawnRoom.cz - 7); z <= Math.min(terrain.height - 2, terrain.spawnRoom.cz + 7); z++) {
                for (var x = Math.max(1, terrain.spawnRoom.cx - 7); x <= Math.min(terrain.width - 2, terrain.spawnRoom.cx + 7); x++) {
                    if (!terrain.isPassable(x, z)) continue;
                    var wp = terrain.gridToWorld(x, z);
                    var d = Math.hypot(wp.x - state.player.x, wp.z - state.player.z);
                    if (d >= 5.0 && d <= 12.0) nearSpawn.push(wp);
                }
            }
            for (var s = 0; s < Math.min(2, nearSpawn.length); s++) {
                spawnEnemy(ENEMY_TEMPLATES[0], nearSpawn[s].x, nearSpawn[s].z, diffScale);
            }
            if (nearSpawn[2]) {
                spawnLoot(nearSpawn[2].x, nearSpawn[2].z, 'gold', 25);
            }

            if (worldRenderer) {
                worldRenderer.buildWorld(terrain);
            }
            if (cameraRig) {
                cameraRig.setFocus(state.player.x, state.player.y, state.player.z);
            }
            if (entityRenderer) {
                entityRenderer.sync(state, terrain, 0.016);
            }
            bus.emit('world:built', { biome: state.biome, floorIndex: state.floorIndex });
        }

        function startMission(missionConfig) {
            initRenderers();
            missionConfig = missionConfig || {};
            state.missionConfig = missionConfig;
            state.runKills = 0;
            state.runGold = 0;
            state.elapsedTime = 0;
            state.turnCount = 1;
            if (missionConfig.difficulty) state.difficulty = missionConfig.difficulty;
            if (missionConfig.temporalMode) setTemporalMode(missionConfig.temporalMode);
            if (missionConfig.floorIndex) state.floorIndex = missionConfig.floorIndex;

            state.player = createPlayer(missionConfig.race || 'human', missionConfig.classType || 'warrior');
            buildSector(missionConfig);
            registry.resetAll(missionConfig);
            bus.emit('mission:started', { missionConfig: missionConfig, biome: state.biome });
            return getState();
        }

        function applyDamage(hitEvent) {
            if (!hitEvent || !hitEvent.target) return null;
            var hit = Object.assign({
                attacker: state.player,
                rawDamage: 10,
                armorPen: 0,
                damageType: 'kinetic',
                isCrit: false,
                isFlank: false,
                isHighGround: false,
                coverMitigated: false,
                statusApplied: null,
                hitPos3D: { x: hitEvent.target.x, y: hitEvent.target.y, z: hitEvent.target.z },
                knockbackVec3: null,
                cancelled: false
            }, hitEvent);

            hit = registry.pipeBeforeDamage(hit);
            if (!hit || hit.cancelled) return hit;

            var target = hit.target;
            var finalDmg = Math.max(0, Number(hit.rawDamage) || 0);

            // Apply high ground bonus if attacker and target are provided
            if (hit.attacker && hit.target && !hit._highGroundApplied) {
                var hg = terrain.getHighGroundBonus(hit.attacker, hit.target);
                if (hg.hasHighGround) {
                    hit.isHighGround = true;
                    finalDmg *= hg.damageMultiplier;
                }
                var cov = terrain.getCoverBetween(hit.target, hit.attacker);
                if (cov.coverType !== 'none' && !hit.isFlank) {
                    hit.coverMitigated = true;
                    finalDmg *= (1 - cov.mitigation);
                }
            }

            if (target === state.player) {
                if (root.gameDebug && root.gameDebug.godMode) return hit;
                if (target.dodgeTime > 0 || target.stoneForm) return hit;
                if (target.perfectBlockWindow > 0) {
                    target.perfectBlockWindow = 0;
                    bus.emit('combat:perfect-block', { target: target });
                    return hit;
                }
                if (target.shieldBubble > 0) {
                    var absorbed = Math.min(target.shieldBubble, finalDmg);
                    target.shieldBubble -= absorbed;
                    finalDmg -= absorbed;
                    target.shieldCooldown = 5.0;
                }
            }

            target.hp = Math.max(0, target.hp - finalDmg);
            target.flash = 0.14;
            hit.finalDamage = finalDmg;

            if (hit.knockbackVec3) {
                terrain.applyKnockback(target, hit.knockbackVec3);
            }

            registry.notifyAfterDamage(hit);
            bus.emit('combat:damage', hit);

            if (target.hp <= 0 && !target.isDead) {
                target.isDead = true;
                var killEv = { attacker: hit.attacker, target: target, damageEvent: hit };
                if (target !== state.player) {
                    state.runKills++;
                    if (state.player) {
                        state.player.xp += 15;
                        state.player.gold += 10;
                        state.runGold += 10;
                    }
                    terrain.addDebris('scorch', target.x, target.y, target.z, 0.65, 0x450a0a);
                }
                registry.notifyEntityKilled(killEv);
                bus.emit('combat:kill', killEv);
            }
            return hit;
        }

        function dealAoEDamage3D(x, y, z, radius, dmg, damageType) {
            radius = Math.max(0.5, Number(radius) || 3.5);
            dmg = Number(dmg) || 40;
            damageType = damageType || 'explosive';

            // Damage terrain cells in radius
            var cg = terrain.worldToGrid(x, z);
            var rTiles = Math.ceil(radius / terrain.tileSize);
            for (var gz = cg.gz - rTiles; gz <= cg.gz + rTiles; gz++) {
                for (var gx = cg.gx - rTiles; gx <= cg.gx + rTiles; gx++) {
                    var cell = terrain.getCell(gx, gz);
                    if (!cell) continue;
                    var w = terrain.gridToWorld(gx, gz);
                    if (Math.hypot(w.x - x, w.z - z) <= radius) {
                        terrain.damageCell(gx, gz, dmg, damageType);
                    }
                }
            }

            // Damage props in radius
            for (var pi = 0; pi < terrain.props.length; pi++) {
                var prop = terrain.props[pi];
                if (prop.destroyed) continue;
                if (Math.hypot(prop.x - x, prop.z - z) <= radius) {
                    terrain.damageProp(prop.id, dmg);
                }
            }

            // Damage enemies in 3D sphere
            for (var ei = 0; ei < state.enemies.length; ei++) {
                var e = state.enemies[ei];
                if (e.isDead || e.hp <= 0) continue;
                var dist = Math.hypot(e.x - x, e.y - y, e.z - z);
                if (dist <= radius) {
                    var dx = e.x - x;
                    var dz = e.z - z;
                    var len = Math.hypot(dx, dz) || 1;
                    applyDamage({
                        attacker: state.player,
                        target: e,
                        rawDamage: dmg,
                        damageType: damageType,
                        knockbackVec3: { x: (dx / len) * 2.5, y: 0, z: (dz / len) * 2.5 }
                    });
                }
            }

            terrain.addDebris('crater', x, y, z, Math.min(1.6, radius * 0.35), 0x111827);
            terrain.addDebris('scorch', x, y, z, Math.min(2.0, radius * 0.45), 0x09090b);
            if (worldRenderer) worldRenderer.spawnFlashLight({ x: x, y: y, z: z }, 0xf97316, 4.5, 14, 0.25);
            if (cameraRig) cameraRig.applyShake(Math.min(10, radius * 2.2));
            bus.emit('combat:aoe', { x: x, y: y, z: z, radius: radius, dmg: dmg });
        }

        function fireProjectile(origin, dir, opts2) {
            opts2 = opts2 || {};
            var ox = origin ? origin.x : state.player.x;
            var oy = origin ? origin.y : (state.player.y + 1.15);
            var oz = origin ? origin.z : state.player.z;

            var dx = dir ? dir.x : Math.cos(state.player.angle);
            var dy = dir && typeof dir.y === 'number' ? dir.y : 0;
            var dz = dir ? dir.z : Math.sin(state.player.angle);
            var len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
            dx /= len; dy /= len; dz /= len;

            var speed = opts2.speed || (opts2.explosive ? 16 : 36);
            var proj = {
                id: 'proj_' + (projSeq++),
                owner: opts2.owner || state.player,
                x: ox,
                y: oy,
                z: oz,
                vx: dx * speed,
                vy: dy * speed + (opts2.explosive ? 5.5 : 0),
                vz: dz * speed,
                gravity: typeof opts2.gravity === 'number' ? opts2.gravity : (opts2.explosive ? 15 : 0),
                damage: opts2.damage || (opts2.explosive ? 65 : 22),
                damageType: opts2.damageType || (opts2.explosive ? 'explosive' : 'kinetic'),
                explosive: !!opts2.explosive,
                explosionRadius: opts2.explosionRadius || 4.0,
                life: opts2.life || 1.6,
                dead: false
            };
            state.projectiles.push(proj);

            // Spawn casing debris + muzzle flash light (R1 #9, #19)
            terrain.addDebris('casing', ox, terrain.getWorldHeightAt(ox, oz), oz, 0.2, 0xfbbf24);
            if (worldRenderer) {
                worldRenderer.spawnFlashLight({ x: ox, y: oy, z: oz }, opts2.explosive ? 0xf97316 : 0xfef08a, 2.8, 9, 0.09);
            }
            if (cameraRig) {
                cameraRig.applyPunch({ x: -dx, z: -dz }, 0.14);
            }
            return proj;
        }

        function triggerMeleeSwing() {
            if (!state.player || state.player.isDead) return 0;
            var p = state.player;
            var reach = 2.8;
            var hits = 0;
            for (var i = 0; i < state.enemies.length; i++) {
                var e = state.enemies[i];
                if (e.isDead || e.hp <= 0) continue;
                var dx = e.x - p.x;
                var dz = e.z - p.z;
                var dist = Math.hypot(dx, dz);
                if (dist <= reach) {
                    var targetAngle = Math.atan2(dz, dx);
                    var diff = Math.abs(p.angle - targetAngle);
                    if (diff > Math.PI) diff = Math.PI * 2 - diff;
                    if (diff <= Math.PI / 3) {
                        applyDamage({
                            attacker: p,
                            target: e,
                            rawDamage: 14,
                            damageType: 'melee',
                            knockbackVec3: { x: (dx / (dist || 1)) * 1.4, y: 0, z: (dz / (dist || 1)) * 1.4 }
                        });
                        hits++;
                    }
                }
            }
            if (hits > 0 && cameraRig) cameraRig.triggerHitStop(0.04);
            return hits;
        }

        function interactNearest() {
            if (!state.player || state.player.isDead) return false;
            var p = state.player;
            var pg = terrain.worldToGrid(p.x, p.z);

            // 1. Check nearby doors within 3.2m
            var bestDoor = null;
            var bestDoorDist = 3.2;
            for (var gz = pg.gz - 2; gz <= pg.gz + 2; gz++) {
                for (var gx = pg.gx - 2; gx <= pg.gx + 2; gx++) {
                    var c = terrain.getCell(gx, gz);
                    if (!c || c.type !== 'door') continue;
                    var w = terrain.gridToWorld(gx, gz);
                    var d = Math.hypot(w.x - p.x, w.z - p.z);
                    if (d < bestDoorDist) {
                        bestDoorDist = d;
                        bestDoor = c;
                    }
                }
            }
            if (bestDoor) {
                var toggled = terrain.toggleDoor(bestDoor.gx, bestDoor.gz, true);
                if (toggled) {
                    terrain.updateFogOfWar(p, 16);
                    bus.emit('world:door-interacted', { gx: bestDoor.gx, gz: bestDoor.gz, open: bestDoor.doorOpen });
                    return { type: 'door', gx: bestDoor.gx, gz: bestDoor.gz, open: bestDoor.doorOpen };
                }
            }

            // 2. Otherwise push nearest prop within 2.5m
            var bestProp = null;
            var bestPropDist = 2.5;
            for (var i = 0; i < terrain.props.length; i++) {
                var pr = terrain.props[i];
                if (pr.destroyed) continue;
                var pd = Math.hypot(pr.x - p.x, pr.z - p.z);
                if (pd < bestPropDist) {
                    bestPropDist = pd;
                    bestProp = pr;
                }
            }
            if (bestProp) {
                var dx = bestProp.x - p.x;
                var dz = bestProp.z - p.z;
                if (Math.hypot(dx, dz) < 0.05) {
                    dx = Math.cos(p.angle);
                    dz = Math.sin(p.angle);
                }
                terrain.pushProp(bestProp.id, { x: dx, z: dz }, 9.0);
                bus.emit('world:prop-pushed', { propId: bestProp.id });
                return { type: 'prop', propId: bestProp.id };
            }
            return false;
        }

        function shoveKnockback(origin, dir, range, force) {
            origin = origin || state.player;
            if (!origin) return 0;
            range = range || 3.2;
            force = force || 5.0;
            var dx = dir ? dir.x : Math.cos(origin.angle || 0);
            var dz = dir ? dir.z : Math.sin(origin.angle || 0);
            var len = Math.hypot(dx, dz) || 1;
            dx /= len; dz /= len;

            var hitCount = 0;
            for (var i = 0; i < state.enemies.length; i++) {
                var e = state.enemies[i];
                if (e.isDead || e.hp <= 0) continue;
                var dist = Math.hypot(e.x - origin.x, e.z - origin.z);
                if (dist <= range) {
                    terrain.applyKnockback(e, { x: dx * force, y: 0, z: dz * force });
                    e.staggerTimer = Math.max(e.staggerTimer, 0.5);
                    hitCount++;
                }
            }
            for (var pi = 0; pi < terrain.props.length; pi++) {
                var pr = terrain.props[pi];
                if (pr.destroyed) continue;
                if (Math.hypot(pr.x - origin.x, pr.z - origin.z) <= range) {
                    terrain.pushProp(pr.id, { x: dx, z: dz }, force * 2.0);
                    hitCount++;
                }
            }
            return hitCount;
        }

        function moveEntityXZ(ent, dx, dz) {
            if (!dx && !dz) return false;
            var curG = terrain.worldToGrid(ent.x, ent.z);
            var moved = false;

            var nx = ent.x + dx;
            var gx = terrain.worldToGrid(nx, ent.z);
            if (gx.gx === curG.gx || terrain.canStepBetween(curG.gx, curG.gz, gx.gx, curG.gz)) {
                if (terrain.isPassable(gx.gx, curG.gz)) {
                    ent.x = nx;
                    curG = gx;
                    moved = true;
                }
            }

            var nz = ent.z + dz;
            var gz = terrain.worldToGrid(ent.x, nz);
            if (gz.gz === curG.gz || terrain.canStepBetween(curG.gx, curG.gz, curG.gx, gz.gz)) {
                if (terrain.isPassable(curG.gx, gz.gz)) {
                    ent.z = nz;
                    moved = true;
                }
            }

            ent.y = terrain.getWorldHeightAt(ent.x, ent.z);
            return moved;
        }

        function stepProjectiles(dt) {
            for (var i = state.projectiles.length - 1; i >= 0; i--) {
                var pr = state.projectiles[i];
                if (pr.dead) {
                    state.projectiles.splice(i, 1);
                    continue;
                }
                pr.life -= dt;
                if (pr.life <= 0) {
                    if (pr.explosive) dealAoEDamage3D(pr.x, pr.y, pr.z, pr.explosionRadius, pr.damage, 'explosive');
                    pr.dead = true;
                    state.projectiles.splice(i, 1);
                    continue;
                }

                var prevX = pr.x, prevY = pr.y, prevZ = pr.z;
                pr.vy -= pr.gravity * dt;
                var nextX = prevX + pr.vx * dt;
                var nextY = prevY + pr.vy * dt;
                var nextZ = prevZ + pr.vz * dt;

                var segX = nextX - prevX;
                var segY = nextY - prevY;
                var segZ = nextZ - prevZ;
                var segLen = Math.sqrt(segX * segX + segY * segY + segZ * segZ);

                // Check enemy & prop sphere hits first
                var hitEntity = false;
                for (var ei = 0; ei < state.enemies.length; ei++) {
                    var e = state.enemies[ei];
                    if (e.isDead || e.hp <= 0 || e === pr.owner) continue;
                    var distXZ = Math.hypot(e.x - nextX, e.z - nextZ);
                    if (distXZ <= e.radius + 0.35 && nextY >= e.y - 0.2 && nextY <= e.y + 2.2) {
                        if (pr.explosive) {
                            dealAoEDamage3D(nextX, nextY, nextZ, pr.explosionRadius, pr.damage, 'explosive');
                        } else {
                            applyDamage({
                                attacker: pr.owner,
                                target: e,
                                rawDamage: pr.damage,
                                damageType: pr.damageType,
                                hitPos3D: { x: nextX, y: nextY, z: nextZ },
                                knockbackVec3: { x: (pr.vx / 40), y: 0, z: (pr.vz / 40) }
                            });
                        }
                        pr.dead = true;
                        hitEntity = true;
                        break;
                    }
                }
                if (hitEntity) {
                    state.projectiles.splice(i, 1);
                    continue;
                }

                for (var pi = 0; pi < terrain.props.length; pi++) {
                    var prop = terrain.props[pi];
                    if (prop.destroyed) continue;
                    if (Math.hypot(prop.x - nextX, prop.z - nextZ) <= prop.radius + 0.3 && Math.abs(nextY - (prop.y + 0.5)) <= 0.9) {
                        terrain.damageProp(prop.id, pr.damage);
                        if (pr.explosive) dealAoEDamage3D(nextX, nextY, nextZ, pr.explosionRadius, pr.damage, 'explosive');
                        pr.dead = true;
                        hitEntity = true;
                        break;
                    }
                }
                if (hitEntity) {
                    state.projectiles.splice(i, 1);
                    continue;
                }

                // Verticality-aware terrain / cover / wall raycast along segment
                if (segLen > 1e-4) {
                    var rayHit = terrain.raycast3D({ x: prevX, y: prevY, z: prevZ }, { x: segX, y: segY, z: segZ }, segLen);
                    if (rayHit.hit) {
                        if (pr.explosive) {
                            dealAoEDamage3D(rayHit.point.x, rayHit.point.y, rayHit.point.z, pr.explosionRadius, pr.damage, 'explosive');
                        } else if (rayHit.cell) {
                            terrain.damageCell(rayHit.gx, rayHit.gz, pr.damage, pr.damageType);
                            terrain.addDebris('scorch', rayHit.point.x, Math.max(0, rayHit.point.y - 0.1), rayHit.point.z, 0.35, 0x1f2937);
                            if (worldRenderer) worldRenderer.spawnFlashLight(rayHit.point, 0xfbbf24, 1.8, 6, 0.08);
                        }
                        pr.dead = true;
                        state.projectiles.splice(i, 1);
                        continue;
                    }
                }

                pr.x = nextX;
                pr.y = nextY;
                pr.z = nextZ;
            }
        }

        function processTerrainEvents() {
            var events = terrain.consumeEvents();
            for (var i = 0; i < events.length; i++) {
                var ev = events[i];
                if (ev.type === 'structural_collapse') {
                    // Crush enemies & player inside collapse radius
                    for (var ei = 0; ei < state.enemies.length; ei++) {
                        var e = state.enemies[ei];
                        if (e.isDead || e.hp <= 0) continue;
                        if (Math.hypot(e.x - ev.epicenter.x, e.z - ev.epicenter.z) <= ev.radius) {
                            applyDamage({ attacker: state.player, target: e, rawDamage: ev.damage, damageType: 'crush' });
                        }
                    }
                    bus.emit('world:structural-collapse', ev);
                } else if (ev.type === 'prop_explosion') {
                    dealAoEDamage3D(ev.x, ev.y, ev.z, ev.radius, ev.damage, 'explosive');
                    bus.emit('world:prop-explosion', ev);
                } else {
                    bus.emit('world:' + ev.type, ev);
                }
            }
        }

        function stepSimulation(dt) {
            var p = state.player;
            if (!p || p.isDead) return;

            state.elapsedTime += dt;
            state.fireCooldown = Math.max(0, state.fireCooldown - dt);
            state.grenadeCooldown = Math.max(0, state.grenadeCooldown - dt);
            state.shoveCooldown = Math.max(0, state.shoveCooldown - dt);

            // Player regen & timers
            if (!p.stoneForm) p.hp = Math.min(p.maxHp, p.hp + p.hpRegen * dt);
            p.dodgeTime = Math.max(0, p.dodgeTime - dt);
            p.perfectBlockWindow = Math.max(0, p.perfectBlockWindow - dt);
            p.blockCooldown = Math.max(0, p.blockCooldown - dt);
            if (p.stoneForm) {
                p.stoneDuration -= dt;
                if (p.stoneDuration <= 0) p.stoneForm = false;
            }
            if (p.race === 'elf') p.mana = Math.min(p.maxMana, p.mana + 2 * dt);
            if (p.race === 'orc') p.rage = Math.max(0, p.rage - 4 * dt);
            if (p.race === 'human') {
                p.shieldCooldown = Math.max(0, p.shieldCooldown - dt);
                if (p.shieldCooldown === 0) p.shieldBubble = Math.min(20, p.shieldBubble + 2 * dt);
            }

            // Player movement (WASD + tapMove + camera-yaw relative or world)
            // Arrow keys are dedicated to directional tactical dodge
            var keys = inputState.keys;
            var mx = inputState.moveX;
            var mz = inputState.moveZ;
            if (keys['KeyW']) mz -= 1;
            if (keys['KeyS']) mz += 1;
            if (keys['KeyA']) mx -= 1;
            if (keys['KeyD']) mx += 1;

            // Directional Dodge via Arrow Keys (or Space bar for current facing/moving dodge)
            var arrowDodgeX = 0;
            var arrowDodgeZ = 0;
            if (keys['ArrowUp']) arrowDodgeZ -= 1;
            if (keys['ArrowDown']) arrowDodgeZ += 1;
            if (keys['ArrowLeft']) arrowDodgeX -= 1;
            if (keys['ArrowRight']) arrowDodgeX += 1;

            if ((arrowDodgeX !== 0 || arrowDodgeZ !== 0) && p.dodgeTime <= 0 && p.stamina >= 25 && !p.isDead) {
                var aLen = Math.hypot(arrowDodgeX, arrowDodgeZ);
                var adx = arrowDodgeX / aLen;
                var adz = arrowDodgeZ / aLen;
                p.dodgeTime = 0.35;
                p.dodgeCooldown = 0.45;
                p.stamina = Math.max(0, p.stamina - 25);
                p.vx = adx * p.speed * 2.8;
                p.vz = adz * p.speed * 2.8;
                p.angle = Math.atan2(adz, adx);
                moveEntityXZ(p, p.vx * 0.12, p.vz * 0.12);
                bus.emit('player:dodge', { x: p.x, y: p.y, z: p.z, dx: adx, dz: adz });
                // Reset arrow keys to require a fresh tap per dodge roll
                ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].forEach(function (k) { keys[k] = false; });
            }

            if (p.dodgeTime > 0) {
                // Carry forward dodge roll inertia
                moveEntityXZ(p, p.vx * dt, p.vz * dt);
            }

            if (mx !== 0 || mz !== 0) {
                p.moveTarget.active = false;
            } else if (p.moveTarget.active) {
                var tx = p.moveTarget.x - p.x;
                var tz = p.moveTarget.z - p.z;
                var td = Math.hypot(tx, tz);
                if (td < 0.35) {
                    p.moveTarget.active = false;
                } else {
                    mx = tx / td;
                    mz = tz / td;
                }
            }

            if (p.holdPosition) {
                mx = 0;
                mz = 0;
            }

            var prevX = p.x;
            var prevZ = p.z;
            var len = Math.hypot(mx, mz);
            if (len > 0.01) {
                mx /= len;
                mz /= len;
                var sprinting = (keys['ShiftLeft'] || keys['ShiftRight']) && p.stamina > 5;
                var spd = p.speed * (sprinting ? 1.45 : 1.0);
                if (sprinting) p.stamina = Math.max(0, p.stamina - 20 * dt);
                else p.stamina = Math.min(p.maxStamina, p.stamina + 15 * dt);

                // Hazard & terrain surface speed modifiers
                var hzMod = terrain.applyHazardAt(p, dt);
                var terrMod = terrain.getMovementMultiplier(p.x + mx * 0.4, p.z + mz * 0.4, p.x, p.z);
                spd *= terrMod * (hzMod ? hzMod.slowFactor : 1.0);

                p.vx = mx * spd;
                p.vz = mz * spd;
                moveEntityXZ(p, p.vx * dt, p.vz * dt);
                if (!inputState.hasAim) p.angle = Math.atan2(mz, mx);
            } else {
                p.vx = 0;
                p.vz = 0;
                p.stamina = Math.min(p.maxStamina, p.stamina + 15 * dt);
            }

            // Apply hazard damage at player position
            var pHaz = terrain.applyHazardAt(p, dt);
            if (pHaz && pHaz.damage > 0) {
                applyDamage({ attacker: null, target: p, rawDamage: pHaz.damage, damageType: pHaz.hazard });
            }

            // Action hotkeys: E interact, G explosive lob, K shove knockback, LMB fire
            if (inputState.interactPressed || keys['KeyE']) {
                inputState.interactPressed = false;
                keys['KeyE'] = false;
                interactNearest();
            }
            if ((inputState.grenadePressed || keys['KeyG']) && state.grenadeCooldown <= 0) {
                inputState.grenadePressed = false;
                keys['KeyG'] = false;
                state.grenadeCooldown = 0.65;
                fireProjectile(
                    { x: p.x, y: p.y + 1.2, z: p.z },
                    { x: Math.cos(p.angle), y: 0.25, z: Math.sin(p.angle) },
                    { explosive: true, explosionRadius: 4.5, damage: 70, speed: 15 }
                );
            }
            if ((inputState.shovePressed || keys['KeyK']) && state.shoveCooldown <= 0) {
                inputState.shovePressed = false;
                keys['KeyK'] = false;
                state.shoveCooldown = 0.45;
                shoveKnockback(p, { x: Math.cos(p.angle), z: Math.sin(p.angle) }, 3.4, 5.0);
            }
            if (inputState.mouseDown && state.fireCooldown <= 0) {
                state.fireCooldown = 0.22;
                fireProjectile(
                    { x: p.x, y: p.y + 1.15, z: p.z },
                    { x: Math.cos(p.angle), y: 0, z: Math.sin(p.angle) },
                    { damage: 22, speed: 34 }
                );
            }

            // Update Fog of War & Interior zone if player moved
            if (Math.hypot(p.x - prevX, p.z - prevZ) > 0.1) {
                terrain.updateFogOfWar(p, 16);
                if (worldRenderer) worldRenderer.updateFogTexture();
            }
            state.interiorZone = terrain.getInteriorZoneAt(p.x, p.z);

            // Step props & projectiles
            terrain.stepProps(dt);
            stepProjectiles(dt);

            // Step enemies
            for (var ei = 0; ei < state.enemies.length; ei++) {
                var e = state.enemies[ei];
                if (e.isDead || e.hp <= 0) continue;
                if (e.flash > 0) e.flash = Math.max(0, e.flash - dt);
                if (e.knockdownTimer > 0) e.knockdownTimer = Math.max(0, e.knockdownTimer - dt);
                if (e.staggerTimer > 0) {
                    e.staggerTimer = Math.max(0, e.staggerTimer - dt);
                    continue;
                }

                terrain.stepFalling(e, dt);
                if (e.isDead) continue;

                var eHaz = terrain.applyHazardAt(e, dt);
                if (eHaz && eHaz.damage > 0) {
                    applyDamage({ attacker: null, target: e, rawDamage: eHaz.damage, damageType: eHaz.hazard });
                    if (e.isDead) continue;
                }

                var dToP = Math.hypot(p.x - e.x, p.z - e.z);
                if (dToP < 14 && e.state === 'idle') e.state = 'chase';
                if (e.state === 'chase' && dToP > 1.1) {
                    var dirX = (p.x - e.x) / dToP;
                    var dirZ = (p.z - e.z) / dToP;
                    e.angle = Math.atan2(dirZ, dirX);
                    var eSpd = e.speed * terrain.getMovementMultiplier(e.x, e.z) * (eHaz ? eHaz.slowFactor : 1.0);
                    moveEntityXZ(e, dirX * eSpd * dt, dirZ * eSpd * dt);
                }
                if (dToP <= e.radius + p.radius + 0.15) {
                    if (e.type === 'exploding') {
                        dealAoEDamage3D(e.x, e.y, e.z, 3.0, e.dmg, 'explosive');
                        e.hp = 0;
                        e.isDead = true;
                    } else {
                        e.attackCooldown = Math.max(0, e.attackCooldown - dt);
                        if (e.attackCooldown <= 0) {
                            e.attackCooldown = 0.85;
                            applyDamage({ attacker: e, target: p, rawDamage: e.dmg, damageType: 'melee' });
                        }
                    }
                }
            }
            state.enemies = state.enemies.filter(function (e) { return !e.isDead && e.hp > 0; });

            // Loot pickup
            for (var li = 0; li < state.loot.length; li++) {
                var l = state.loot[li];
                if (l.picked) continue;
                var ld = Math.hypot(p.x - l.x, p.z - l.z);
                if (ld < 3.0) {
                    l.x += ((p.x - l.x) / (ld || 1)) * 7.5 * dt;
                    l.z += ((p.z - l.z) / (ld || 1)) * 7.5 * dt;
                }
                if (ld < 1.0) {
                    l.picked = true;
                    p.gold += l.value;
                    state.runGold += l.value;
                    bus.emit('loot:collected', l);
                }
            }
            state.loot = state.loot.filter(function (l) { return !l.picked; });

            processTerrainEvents();
            registry.updateAll(dt, state);
        }

        function step(dt, stepOpts) {
            stepOpts = stepOpts || {};
            dt = typeof dt === 'number' && dt > 0 ? Math.min(dt, 0.1) : 1 / 60;
            state.frameCount++;

            if (state.paused && !stepOpts.force) {
                if (cameraRig) cameraRig.update(dt, state.player, state.player, inputState.keys);
                if (worldRenderer && cameraRig) worldRenderer.update(dt, cameraRig.getState().focus);
                return;
            }

            if (cameraRig && cameraRig.isHitStopped() && !stepOpts.force) {
                cameraRig.update(dt, state.player, state.player, inputState.keys);
                return;
            }

            var effectiveDt = dt;
            if (state.temporalMode === 'realtime') {
                effectiveDt = dt * state.gameSpeed;
            } else if (state.temporalMode === 'chrono') {
                var keys = inputState.keys;
                var active = inputState.mouseDown || inputState.interactPressed || inputState.grenadePressed || inputState.shovePressed ||
                    (state.player && state.player.moveTarget.active) ||
                    ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some(function (k) { return keys[k]; });
                state.chronoScale += ((active ? 1.0 : 0.04) - state.chronoScale) * 0.25;
                effectiveDt = dt * state.chronoScale;
            } else if (state.temporalMode === 'turnbased' && !stepOpts.force) {
                // Turn-based only steps simulation inside executeTurnAction unless forced by test harness
                if (cameraRig) cameraRig.update(dt, state.player, state.player, inputState.keys);
                if (worldRenderer && state.player) worldRenderer.update(dt, state.player);
                if (entityRenderer) entityRenderer.sync(state, terrain, dt);
                return;
            }

            stepSimulation(effectiveDt);

            if (cameraRig && state.player) {
                cameraRig.update(dt, state.player, { x: state.player.vx, z: state.player.vz }, inputState.keys);
            }
            if (worldRenderer && state.player) {
                worldRenderer.update(dt, cameraRig ? cameraRig.getState().focus : state.player);
            }
            if (entityRenderer) {
                entityRenderer.sync(state, terrain, dt);
            }
        }

        function executeTurnAction(action) {
            if (state.temporalMode !== 'turnbased' || !state.player || state.player.isDead) return 'ignored';
            var p = state.player;
            var res = action;
            var dirs = {
                up: [0, -terrain.tileSize],
                down: [0, terrain.tileSize],
                left: [-terrain.tileSize, 0],
                right: [terrain.tileSize, 0]
            };
            if (dirs[action]) {
                var dx = dirs[action][0];
                var dz = dirs[action][1];
                p.angle = Math.atan2(dz, dx);
                var ox = p.x, oz = p.z;
                moveEntityXZ(p, dx, dz);
                res = (p.x === ox && p.z === oz) ? 'blocked' : 'moved';
                terrain.updateFogOfWar(p, 16);
                if (worldRenderer) worldRenderer.updateFogTexture();
            } else if (action === 'attack') {
                res = triggerMeleeSwing() > 0 ? 'attack-hit' : 'attack-miss';
            } else if (action === 'interact') {
                res = interactNearest() ? 'interacted' : 'nothing';
            } else if (action === 'wait') {
                p.stamina = Math.min(p.maxStamina, p.stamina + 25);
                res = 'wait';
            }
            stepSimulation(0.35);
            state.turnCount++;
            if (cameraRig) cameraRig.update(0.35, p, { x: 0, z: 0 }, inputState.keys);
            if (worldRenderer) worldRenderer.update(0.35, p);
            if (entityRenderer) entityRenderer.sync(state, terrain, 0.35);
            return res;
        }

        function renderFrame() {
            if (threeBundle && cameraRig) {
                var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
                threeBundle.render(cameraRig.camera);
                if (t0 > 0) {
                    threeBundle.recordFrameTime(performance.now() - t0);
                }
            }
        }

        function startLoop() {
            if (loopActive || typeof requestAnimationFrame !== 'function') return;
            loopActive = true;
            lastTimestamp = performance.now();
            rollingLastTime = lastTimestamp;
            var tick = function (ts) {
                if (!loopActive) return;
                var dt = Math.min(0.1, Math.max(0.001, (ts - lastTimestamp) / 1000));
                lastTimestamp = ts;
                if (ts - rollingLastTime > 0) {
                    state.fps = Math.round(1000 / (ts - rollingLastTime));
                }
                rollingLastTime = ts;
                step(dt);
                renderFrame();
                rafId = requestAnimationFrame(tick);
            };
            rafId = requestAnimationFrame(tick);
        }

        function stopLoop() {
            loopActive = false;
            if (rafId && typeof cancelAnimationFrame === 'function') {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }

        function setPaused(paused, mode) {
            state.paused = !!paused;
            state.pauseMode = mode || 'pause';
            if (cameraRig) cameraRig.setPaused(state.paused, state.pauseMode);
            bus.emit('engine:paused', { paused: state.paused, mode: state.pauseMode });
        }

        function setTemporalMode(mode) {
            state.temporalMode = ['realtime', 'chrono', 'turnbased'].indexOf(mode) >= 0 ? mode : 'realtime';
            state.chronoScale = state.temporalMode === 'chrono' ? 0.04 : 1.0;
            state.turnCount = 1;
            bus.emit('engine:temporal-mode', state.temporalMode);
            return state.temporalMode;
        }

        function setGameSpeed(speed) {
            state.gameSpeed = clamp(Number(speed) || 1, 0.5, 2.0);
            return state.gameSpeed;
        }

        function resize() {
            if (threeBundle) return threeBundle.resize();
            return { width: 1000, height: 600 };
        }

        function getState() {
            return state;
        }

        function getDiagnostics() {
            var renderDiag = threeBundle ? threeBundle.getDiagnostics() : {
                ok: false, mode: 'headless', webglActive: false, width: 1000, height: 600
            };
            return {
                ready: true,
                webglActive: !!renderDiag.webglActive,
                mode: renderDiag.mode,
                width: renderDiag.width,
                height: renderDiag.height,
                gpuRenderer: renderDiag.gpuRenderer || 'headless',
                geometries: renderDiag.geometries || 0,
                drawCalls: renderDiag.drawCalls || 0,
                errors: bus.listenerErrors,
                frameCount: state.frameCount,
                fps: state.fps,
                temporalMode: state.temporalMode,
                paused: state.paused,
                pauseMode: state.pauseMode,
                subsystems: registry.listSubsystems()
            };
        }

        var engine = {
            registerSubsystem: function (sub) { return registry.registerSubsystem(sub); },
            getSubsystem: function (id) { return registry.getSubsystem(id); },
            emit: function (ev, payload) { return bus.emit(ev, payload); },
            on: function (ev, fn, o) { return bus.on(ev, fn, o); },
            getState: getState,
            getTerrain: function () { return terrain; },
            getScene: function () { return threeBundle ? threeBundle.scene : null; },
            getCamera: function () { return cameraRig ? cameraRig.camera : null; },
            getCameraRig: function () { return cameraRig; },
            getWorldRenderer: function () { return worldRenderer; },
            getEntityRenderer: function () { return entityRenderer; },
            setPaused: setPaused,
            startMission: startMission,
            buildSector: buildSector,
            setTemporalMode: setTemporalMode,
            setGameSpeed: setGameSpeed,
            step: step,
            renderFrame: renderFrame,
            startLoop: startLoop,
            stopLoop: stopLoop,
            resize: resize,
            isWebGLActive: function () { return !!(threeBundle && threeBundle.getDiagnostics().webglActive); },
            fireProjectile: fireProjectile,
            applyDamage: applyDamage,
            dealAoEDamage3D: dealAoEDamage3D,
            triggerMeleeSwing: triggerMeleeSwing,
            interactNearest: interactNearest,
            shoveKnockback: shoveKnockback,
            executeTurnAction: executeTurnAction,
            setSeed: function (s) { state.seed = s >>> 0; rng.setSeed(state.seed); },
            teleportPlayer: function (x, y, z) {
                if (!state.player) return null;
                state.player.x = x;
                state.player.z = z;
                state.player.y = typeof y === 'number' ? y : terrain.getWorldHeightAt(x, z);
                terrain.updateFogOfWar(state.player, 16);
                state.interiorZone = terrain.getInteriorZoneAt(state.player.x, state.player.z);
                if (worldRenderer) worldRenderer.updateFogTexture();
                if (cameraRig) cameraRig.setFocus(state.player.x, state.player.y, state.player.z);
                if (entityRenderer) entityRenderer.sync(state, terrain, 0.016);
                return state.player;
            },
            applyKnockbackTo: function (targetIdOrPlayer, forceVec3) {
                var tgt = (targetIdOrPlayer === 'player' || !targetIdOrPlayer) ? state.player :
                    state.enemies.find(function (e) { return e.id === targetIdOrPlayer; });
                return tgt ? terrain.applyKnockback(tgt, forceVec3) : null;
            },
            setCameraAngles: function (pitch, yaw) {
                return cameraRig ? cameraRig.setAngles(pitch, yaw) : null;
            },
            setCameraZoom: function (zoom) {
                return cameraRig ? cameraRig.setZoom(zoom) : null;
            },
            setInputState: function (partial) {
                if (!partial) return;
                if (partial.keys) Object.assign(inputState.keys, partial.keys);
                if (typeof partial.moveX === 'number') inputState.moveX = partial.moveX;
                if (typeof partial.moveZ === 'number') inputState.moveZ = partial.moveZ;
                if (typeof partial.aimX === 'number') { inputState.aimX = partial.aimX; inputState.hasAim = true; }
                if (typeof partial.aimZ === 'number') { inputState.aimZ = partial.aimZ; inputState.hasAim = true; }
                if (typeof partial.mouseDown === 'boolean') inputState.mouseDown = partial.mouseDown;
                if (typeof partial.interactPressed === 'boolean') inputState.interactPressed = partial.interactPressed;
                if (typeof partial.grenadePressed === 'boolean') inputState.grenadePressed = partial.grenadePressed;
                if (typeof partial.shovePressed === 'boolean') inputState.shovePressed = partial.shovePressed;
                if (partial.tapMove) Object.assign(inputState.tapMove, partial.tapMove);
            },
            getInputState: function () { return inputState; },
            getDiagnostics: getDiagnostics,
            initRenderers: initRenderers,
            screenToGround: function (cx, cy) {
                var py = state.player ? state.player.y : 0;
                return cameraRig ? cameraRig.screenToGround(cx, cy, py, terrain) : null;
            }
        };

        registry.initAll({ engine: engine, bus: bus, terrain: terrain });
        return engine;
    }

    var defaultEngine = createGameEngine();
    root.GraveGainEngine = defaultEngine;
    root.GraveGainTest = Bus.createTestHarness(defaultEngine);
    root.createGraveGainEngine = createGameEngine;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            createGameEngine: createGameEngine,
            engine: defaultEngine,
            test: root.GraveGainTest
        };
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
