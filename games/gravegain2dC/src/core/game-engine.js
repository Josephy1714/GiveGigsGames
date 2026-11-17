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

    var CLASS_STATS = {
        warrior: { maxHp: 1, hpRegen: 1, speed: 1, meleeDamage: 1.15, rangedDamage: 1.15 },
        tank: { maxHp: 1.25, hpRegen: 1, speed: 0.94, damageTaken: 0.85 },
        support: { maxHp: 1, hpRegen: 1.6, speed: 1, soulSiphon: 4 },
        mage: { maxHp: 0.92, hpRegen: 1, speed: 1.04, abilityDamage: 1.3, abilityCost: 0.85 }
    };
    var WeaponCatalog = root.GraveGainStubs && root.GraveGainStubs.weaponsCatalog;

    function getWeapon(weaponId) {
        return WeaponCatalog && typeof WeaponCatalog.getWeapon === 'function'
            ? WeaponCatalog.getWeapon(weaponId)
            : { id: 'relic-bolt', name: 'Relic Bolt', damage: 22, interval: 0.22, speed: 34, life: 1.6, color: 0xfef08a };
    }

    var ENEMY_TEMPLATES = [
        { name: 'Goblin Skeleton', emoji: '💀', hp: 22, dmg: 5, speed: 3.2, type: 'standard', blood: 'red', humanoid: true, ambusher: true },
        { name: 'Elven Skeleton', emoji: '💀', hp: 32, dmg: 7, speed: 2.8, type: 'standard', blood: 'green', humanoid: true },
        { name: 'Goblin Zed', emoji: '🧟', hp: 48, dmg: 10, speed: 2.5, type: 'standard', blood: 'red', humanoid: true, ambusher: true },
        { name: 'Small Orc Zed', emoji: '🧟‍♂️', hp: 68, dmg: 13, speed: 2.3, type: 'standard', blood: 'red', humanoid: true },
        { name: 'Flying Elf Skull', emoji: '👻', hp: 16, dmg: 26, speed: 4.0, type: 'exploding', blood: 'purple', ambusher: true },
        { name: 'Medium Orc Zed', emoji: '👺', hp: 140, dmg: 20, speed: 2.0, type: 'elite', blood: 'red', humanoid: true },
        { name: 'Dwarven Zed', emoji: '🛡️', hp: 190, dmg: 16, speed: 1.8, type: 'elite', blood: 'red', armored: true, humanoid: true },
        { name: 'Human Zed', emoji: '🤖', hp: 480, dmg: 24, speed: 2.2, type: 'boss', blood: 'red', ranged: true, humanoid: true },
        { name: 'Huge Orc Zed', emoji: '🟢👹', hp: 760, dmg: 36, speed: 1.5, type: 'boss', blood: 'red', humanoid: true },
        { name: 'Elven Necromancer', emoji: '🧙', hp: 390, dmg: 16, speed: 1.8, type: 'boss', blood: 'purple', summoner: true, humanoid: true },
        { name: 'Siege-Ram Zed', emoji: '🛡️', hp: 250, dmg: 22, speed: 1.55, type: 'elite', blood: 'red', armored: true, humanoid: true },
        { name: 'Vault Stalker', emoji: '🦴', hp: 115, dmg: 12, speed: 2.8, type: 'elite', blood: 'purple', humanoid: true, ambusher: true }
    ];
    var VAULT_STALKER_TEMPLATE = ENEMY_TEMPLATES.find(function (template) { return template.name === 'Vault Stalker'; });

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
        var critRng = new Bus.SeededRNG((opts.seed || 1337) ^ 0x6d2b79f5);
        var luckyDodgeRng = new Bus.SeededRNG((opts.seed || 1337) ^ 0x2c1b3c6d);
        var enemyDodgeRng = new Bus.SeededRNG((opts.seed || 1337) ^ 0x4f1bbcdc);

        var renderNs = root.GraveGainRender || {};
        var threeBundle = null;
        var worldRenderer = null;
        var cameraRig = null;
        var entityRenderer = null;

        var enemySeq = 1;
        var lootSeq = 1;
        var projSeq = 1;
        var lootMagnetRange = 100 / 24;

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
            timePressureStage: 0,
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
            runScore: 0,
            runStreak: 0,
            runBestStreak: 0,
            runStreakTimer: 0,
            runStreakMultiplier: 1,
            fireCooldown: 0,
            meleeCooldown: 0,
            meleeBufferTime: 0,
            dodgeBuffer: null,
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
                shards: [],
                consumedShards: []
            },
            presets: {
                activePresetId: null,
                presets: []
            }
        };

        function hydrateStorageKeys() {
            if (typeof localStorage === 'undefined') return;
            try {
                var progRaw = localStorage.getItem('GraveGain2DC_Progression_v1');
                if (progRaw) {
                    var parsedProg = JSON.parse(progRaw);
                    if (parsedProg && typeof parsedProg === 'object') {
                        state.progression = Object.assign({}, state.progression, parsedProg);
                    }
                }
                var stashRaw = localStorage.getItem('GraveGain2DC_AccountStash_v1');
                if (stashRaw) {
                    var parsedStash = JSON.parse(stashRaw);
                    if (parsedStash && typeof parsedStash === 'object') {
                        state.stash = Object.assign({}, state.stash, parsedStash);
                    }
                }
                var presetsRaw = localStorage.getItem('GraveGain2DC_LoadoutPresets_v1');
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
            classType = CLASS_STATS[classType] ? classType : 'warrior';
            var r = RACE_STATS[race];
            var c = CLASS_STATS[classType];
            var maxHp = r.maxHp * c.maxHp;
            return {
                id: 'player',
                race: race,
                classType: classType,
                weaponId: 'relic-bolt',
                weaponCollection: ['relic-bolt'],
                x: 80,
                y: 0,
                z: 80,
                vx: 0,
                vy: 0,
                vz: 0,
                radius: 0.55,
                angle: 0,
                maxHp: maxHp,
                hp: maxHp,
                hpRegen: r.hpRegen * c.hpRegen,
                healingEfficiency: 1,
                levelDamageReduction: 0,
                comboCount: 0,
                comboTimer: 0,
                comboDamageMultiplier: 1,
                meleeCharge: 0,
                adrenalineActive: false,
                secondWindUsed: false,
                speedBoostTimer: 0,
                damageBoostTimer: 0,
                goldBoostTimer: 0,
                xpBoostTimer: 0,
                stamina: r.stamina,
                maxStamina: r.stamina,
                speed: r.speed * c.speed,
                meleeDamageMultiplier: c.meleeDamage || 1,
                rangedDamageMultiplier: c.rangedDamage || 1,
                armorPenetration: 0.05,
                damageTakenMultiplier: c.damageTaken || 1,
                damageResistances: { fire: 0, ice: 0, poison: 0, lightning: 0, warp: 0, necrotic: 0 },
                soulSiphon: c.soulSiphon || 0,
                abilityDamageMultiplier: c.abilityDamage || 1,
                abilityCostMultiplier: c.abilityCost || 1,
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
                luckyDodgeCooldown: 0,
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

        function buildEnemyPath(enemy, targetGrid) {
            var width = terrain.width;
            var height = terrain.height;
            var start = terrain.worldToGrid(enemy.x, enemy.z);
            var goal = targetGrid || { gx: enemy.homeGx, gz: enemy.homeGz };
            if (!terrain.inBounds(start.gx, start.gz) || !terrain.inBounds(goal.gx, goal.gz)) return null;
            var startIndex = start.gz * width + start.gx;
            var goalIndex = goal.gz * width + goal.gx;
            if (startIndex === goalIndex) return [];
            var previous = new Int32Array(width * height);
            previous.fill(-2);
            var queue = new Int32Array(width * height);
            var head = 0;
            var tail = 0;
            queue[tail++] = startIndex;
            previous[startIndex] = -1;
            var offsets = [-width, 1, width, -1];
            while (head < tail && previous[goalIndex] === -2) {
                var current = queue[head++];
                var gx = current % width;
                var gz = Math.floor(current / width);
                for (var oi = 0; oi < offsets.length; oi += 1) {
                    var next = current + offsets[oi];
                    var nx = next % width;
                    var nz = Math.floor(next / width);
                    if (next < 0 || next >= width * height || Math.abs(nx - gx) + Math.abs(nz - gz) !== 1 || previous[next] !== -2) continue;
                    if (!terrain.isPassable(nx, nz) || !terrain.canStepBetween(gx, gz, nx, nz)) continue;
                    previous[next] = current;
                    queue[tail++] = next;
                }
            }
            if (previous[goalIndex] === -2) return null;
            var reverse = [];
            for (var node = goalIndex; node !== startIndex; node = previous[node]) reverse.push(node);
            reverse.reverse();
            return reverse.map(function (index) {
                var point = terrain.gridToWorld(index % width, Math.floor(index / width));
                return { x: point.x, z: point.z };
            });
        }

        function spawnEnemy(template, wx, wz, floorScale) {
            var diffMap = {
                easy: { hp: 0.6, dmg: 0.5, speed: 0.8 },
                normal: { hp: 1.0, dmg: 1.0, speed: 1.0 },
                hard: { hp: 1.5, dmg: 1.5, speed: 1.15 },
                nightmare: { hp: 2.5, dmg: 2.0, speed: 1.3 }
            };
            var diff = diffMap[state.difficulty] || diffMap.normal;
            var elevY = terrain.getWorldHeightAt(wx, wz);
            var maxHp = Math.round(template.hp * floorScale * diff.hp);
            var spawnGrid = terrain.worldToGrid(wx, wz);
            var spawnCell = terrain.getCell(spawnGrid.gx, spawnGrid.gz);
            var homeRoom = spawnCell && spawnCell.roomId >= 0 ? terrain.rooms[spawnCell.roomId] : null;
            var homeGrid = homeRoom ? { gx: homeRoom.cx, gz: homeRoom.cz } : spawnGrid;
            var homeWorld = terrain.gridToWorld(homeGrid.gx, homeGrid.gz);
            var enemy = {
                id: 'enemy_' + (enemySeq++),
                name: template.name,
                emoji: template.emoji,
                type: template.type,
                bloodColor: template.blood || 'red',
                armored: !!template.armored,
                humanoid: !!template.humanoid,
                ranged: !!template.ranged,
                summoner: !!template.summoner,
                ambusher: !!template.ambusher,
                ambushHidden: !!template.ambusher,
                x: wx,
                y: elevY,
                z: wz,
                vx: 0,
                vy: 0,
                vz: 0,
                spawnX: wx,
                spawnZ: wz,
                homeX: homeWorld.x,
                homeZ: homeWorld.z,
                homeGx: homeGrid.gx,
                homeGz: homeGrid.gz,
                homeRoomId: homeRoom ? homeRoom.id : -1,
                homeRoomBounds: homeRoom ? { x: homeRoom.x, z: homeRoom.y, width: homeRoom.w, height: homeRoom.h } : null,
                radius: template.type === 'boss' ? 1.05 : 0.55,
                angle: 0,
                maxHp: maxHp,
                hp: maxHp,
                dmg: template.dmg * floorScale * diff.dmg,
                speed: template.speed * diff.speed,
                _timeDifficultyStage: 0,
                packDamageMultiplier: 1,
                outOfCombatTimer: 0,
                outOfCombatHealing: false,
                wanderPauseTimer: 0,
                wanderPath: null,
                wanderPathIndex: 0,
                leashReturning: false,
                leashPath: null,
                leashPathIndex: 0,
                leashGraceTimer: 0,
                isEnraged: false,
                state: 'idle',
                flash: 0,
                knockdownTimer: 0,
                staggerTimer: 0,
                suppression: 0,
                isDead: false,
                fallenIntoChasm: false,
                attackCooldown: 0,
                dodgeCooldown: 0,
                dodgeTime: 0,
                fleeTimer: 0,
                fleeCooldown: 0,
                phaseShieldRequiresConduit: false
            };
            applyTimePressureToEnemy(enemy, getTimePressureStage());
            state.enemies.push(enemy);
            return enemy;
        }

        function getTimePressureStage() {
            return Math.min(10, Math.floor(Math.max(0, state.elapsedTime) / 300));
        }

        function getTimePressureMultiplier(stage) {
            return 1 + Math.min(10, Math.max(0, Number(stage) || 0)) * 0.12;
        }

        function applyTimePressureToEnemy(enemy, stage) {
            if (!enemy || enemy.isDead || enemy.hp <= 0) return;
            var currentStage = Math.max(0, Math.floor(Number(enemy._timeDifficultyStage) || 0));
            if (stage <= currentStage) return;
            var previousMultiplier = getTimePressureMultiplier(currentStage);
            var nextMultiplier = getTimePressureMultiplier(stage);
            var multiplier = nextMultiplier / previousMultiplier;
            var healthRatio = enemy.maxHp > 0 ? Math.max(0, enemy.hp / enemy.maxHp) : 1;
            enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * multiplier));
            enemy.hp = Math.max(1, Math.min(enemy.maxHp, Math.round(enemy.maxHp * healthRatio)));
            enemy.dmg *= multiplier;
            enemy.speed *= multiplier;
            enemy._timeDifficultyStage = stage;
        }

        function spawnLoot(wx, wz, type, value, metadata) {
            var wy = terrain.getWorldHeightAt(wx, wz);
            var item = {
                id: 'loot_' + (lootSeq++),
                x: wx,
                y: wy,
                z: wz,
                type: type || 'gold',
                value: typeof value === 'number' ? value : 15,
                radius: 0.45,
                picked: false
            };
            if (metadata) Object.assign(item, metadata);
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
                critRng.setSeed(state.seed ^ 0x6d2b79f5);
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
                var roomBaseCount = room.type === 'safespace' ? 4 : 2;
                var mobDensity = Math.max(0.65, Math.min(2.0, Number(config.enemyDensityMult) || 1));
                var scaledMobCount = roomBaseCount * mobDensity;
                var mobCount = Math.max(1, Math.floor(scaledMobCount));
                if (floorRng.chance(scaledMobCount - mobCount)) mobCount++;
                for (var m = 0; m < mobCount; m++) {
                    var gx = floorRng.int(room.x + 1, room.x + room.w - 2);
                    var gz = floorRng.int(room.z + 1, room.z + room.h - 2);
                    var cell = terrain.getCell(gx, gz);
                    if (!cell || !terrain.isPassable(gx, gz)) continue;
                    var w = terrain.gridToWorld(gx, gz);
                    var maxTemplate = Math.min(ENEMY_TEMPLATES.length - 1, floorIndex >= 3 ? 6 : 3);
                    var eliteChance = Math.max(0, Math.min(0.75, Number(config.eliteChance) || 0));
                    var tpl = floorIndex >= 3 && eliteChance > 0 && floorRng.chance(eliteChance)
                        ? ENEMY_TEMPLATES[floorRng.int(5, 6)]
                        : ENEMY_TEMPLATES[floorRng.int(0, maxTemplate)];
                    spawnEnemy(tpl, w.x, w.z, diffScale);
                }
                if (room.type === 'treasury') {
                    var lw = terrain.gridToWorld(room.cx, room.cz);
                    spawnLoot(lw.x, lw.z, 'gold', 50);
                }
                if (room.type === 'healing_fountain' || room.type === 'blood_altar') {
                    var shrinePos = terrain.gridToWorld(room.cx, room.cz);
                    var shrineType = room.type === 'healing_fountain' ? 'soul_fountain' : 'blood_altar';
                    var shrineName = room.type === 'healing_fountain' ? 'Soul Fountain' : 'Blood Altar';
                    spawnLoot(shrinePos.x, shrinePos.z, shrineType, 0, { objectiveId: 'room_shrine', itemName: shrineName, roomId: room.id });
                }
            }

            // Concealed ambushers wait at narrow corridor choke points away from spawn.
            var corridorAmbushCandidates = [];
            for (var az = 1; az < terrain.height - 1; az += 1) {
                for (var ax = 1; ax < terrain.width - 1; ax += 1) {
                    var ambushCell = terrain.getCell(ax, az);
                    if (!ambushCell || ambushCell.type !== 'floor' || ambushCell.roomId !== -1 || ambushCell.hazard || !terrain.isPassable(ax, az)) continue;
                    var northOpen = terrain.canStepBetween(ax, az, ax, az - 1);
                    var southOpen = terrain.canStepBetween(ax, az, ax, az + 1);
                    var eastOpen = terrain.canStepBetween(ax, az, ax + 1, az);
                    var westOpen = terrain.canStepBetween(ax, az, ax - 1, az);
                    var narrowCorridor = (northOpen && southOpen && eastOpen !== westOpen) || (eastOpen && westOpen && northOpen !== southOpen);
                    if (!narrowCorridor) continue;
                    var ambushPos = terrain.gridToWorld(ax, az);
                    if (Math.hypot(ambushPos.x - state.player.x, ambushPos.z - state.player.z) < 12) continue;
                    var tooCrowded = state.enemies.some(function (enemy) {
                        return Math.hypot(enemy.x - ambushPos.x, enemy.z - ambushPos.z) < 4.5;
                    });
                    if (!tooCrowded) corridorAmbushCandidates.push({ gx: ax, gz: az, x: ambushPos.x, z: ambushPos.z });
                }
            }
            var corridorAmbushCount = Math.min(floorIndex >= 3 ? 2 : 1, corridorAmbushCandidates.length);
            for (var ambushIndex = 0; ambushIndex < corridorAmbushCount; ambushIndex += 1) {
                var ambushSpot = corridorAmbushCandidates.splice(floorRng.int(0, corridorAmbushCandidates.length - 1), 1)[0];
                var ambushTemplate = floorRng.pick([ENEMY_TEMPLATES[0], ENEMY_TEMPLATES[2], ENEMY_TEMPLATES[4]]);
                var ambushEnemy = spawnEnemy(ambushTemplate, ambushSpot.x, ambushSpot.z, diffScale);
                ambushEnemy.isCorridorAmbush = true;
            }

            // Every expedition offers one weapon cache to build a run-specific arsenal.
            var cacheRoom = terrain.rooms.find(function (room) { return room.type === 'treasury'; }) ||
                terrain.rooms.find(function (room) { return room.type !== 'spawn' && room.type !== 'safespace'; });
            if (cacheRoom && WeaponCatalog && typeof WeaponCatalog.getDrop === 'function') {
                var cacheWeapon = WeaponCatalog.getDrop(floorRng, floorIndex, state.player.weaponCollection);
                var cachePos = terrain.gridToWorld(cacheRoom.cx, cacheRoom.cz);
                spawnLoot(cachePos.x + terrain.tileSize * 0.65, cachePos.z, 'weapon', 0, { weaponId: cacheWeapon.id, weaponName: cacheWeapon.name, weaponIcon: cacheWeapon.icon, weaponRarity: cacheWeapon.rarity });
            }
            if (terrain.secretCaches && terrain.secretCaches.length && WeaponCatalog && typeof WeaponCatalog.getDrop === 'function') {
                var hiddenCache = terrain.secretCaches[0];
                var hiddenPos = terrain.gridToWorld(hiddenCache.gx, hiddenCache.gz);
                var hiddenWeapon = WeaponCatalog.getDrop(floorRng, floorIndex, state.player.weaponCollection);
                spawnLoot(hiddenPos.x - terrain.tileSize * 0.7, hiddenPos.z, 'weapon', 0, { weaponId: hiddenWeapon.id, weaponName: hiddenWeapon.name, weaponIcon: hiddenWeapon.icon, weaponRarity: hiddenWeapon.rarity, secretCacheId: hiddenCache.id });
                spawnLoot(hiddenPos.x + terrain.tileSize * 0.7, hiddenPos.z, 'gold', 100, { itemName: 'Forgotten Stash', secretCacheId: hiddenCache.id });
            }
            if (terrain.treasureCaches && terrain.treasureCaches.length) {
                var deadEndCache = terrain.treasureCaches[0];
                var deadEndPos = terrain.gridToWorld(deadEndCache.gx, deadEndCache.gz);
                spawnLoot(deadEndPos.x - terrain.tileSize * 0.58, deadEndPos.z, 'gold', 75, { itemName: 'Dead-End Cache', treasureCacheId: deadEndCache.id });
                spawnLoot(deadEndPos.x + terrain.tileSize * 0.58, deadEndPos.z, 'damage_boost', 0, { itemName: 'Gravefire', treasureCacheId: deadEndCache.id });
                var guardPos = terrain.gridToWorld(deadEndCache.guardGx, deadEndCache.guardGz);
                var guardCrowded = state.enemies.some(function (enemy) { return Math.hypot(enemy.x - guardPos.x, enemy.z - guardPos.z) < 4.5; });
                if (!guardCrowded && terrain.isPassable(deadEndCache.guardGx, deadEndCache.guardGz)) {
                    var vaultStalker = spawnEnemy(VAULT_STALKER_TEMPLATE, guardPos.x, guardPos.z, diffScale);
                    vaultStalker.isTreasureGuardian = true;
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

            var campaignObjectiveId = config.secondaryObjectiveId;
            var campaignTargetCount = Math.max(0, Math.min(12, Math.floor(Number(config.secondaryObjectiveCount) || 0)));
            var storyObjectives = Array.isArray(config.storyObjectives) ? config.storyObjectives : [];
            function storyQuota(id) {
                return storyObjectives.reduce(function (needed, objective) {
                    if (!objective || objective.id !== id) return needed;
                    return Math.max(needed, Math.max(0, Math.floor(Number(objective.count) || 0) - Math.floor(Number(objective.current) || 0)));
                }, 0);
            }
            var storyRooms = terrain.rooms.filter(function (room) { return room.type !== 'spawn'; });
            function campaignSpawnPosition(index, spacing) {
                for (var attempt = 0; attempt < 70; attempt++) {
                    var room = storyRooms[(index + attempt) % storyRooms.length];
                    var sx = floorRng.int(room.x + 1, room.x + room.w - 2);
                    var sz = floorRng.int(room.z + 1, room.z + room.h - 2);
                    if (!terrain.isPassable(sx, sz)) continue;
                    var pos = terrain.gridToWorld(sx, sz);
                    var crowded = state.enemies.some(function (enemy) {
                        return Math.hypot(enemy.x - pos.x, enemy.z - pos.z) < spacing;
                    }) || state.loot.some(function (loot) {
                        return !loot.picked && Math.hypot(loot.x - pos.x, loot.z - pos.z) < spacing;
                    });
                    if (!crowded) return pos;
                }
                return null;
            }
            function spawnCampaignQuota(template, amount, index, spacing) {
                var spawned = 0;
                for (var qi = 0; qi < amount && storyRooms.length; qi++) {
                    var pos = campaignSpawnPosition(index + qi, spacing || 1.35);
                    if (!pos) break;
                    spawnEnemy(template, pos.x, pos.z, diffScale);
                    spawned++;
                }
                return spawned;
            }
            if (campaignObjectiveId === 'siege_breaker' || campaignObjectiveId === 'skull_hunter') {
                var targetTemplate = campaignObjectiveId === 'siege_breaker' ? ENEMY_TEMPLATES[10] : ENEMY_TEMPLATES[4];
                spawnCampaignQuota(targetTemplate, campaignTargetCount, 0, 2.0);
            }
            var objectiveLootTypes = {
                anchor_breaker: 'anchor', forge_cache: 'forge_cache', vent_sealer: 'toxic_vent',
                memorial_lights: 'memorial_beacon'
            };
            var objectiveLootType = objectiveLootTypes[campaignObjectiveId];
            if (objectiveLootType && campaignTargetCount > 0) {
                for (var oi = 0; oi < campaignTargetCount && storyRooms.length; oi++) {
                    var objectivePos = campaignSpawnPosition(oi + 8, 0.9);
                    if (!objectivePos) break;
                    spawnLoot(objectivePos.x, objectivePos.z, objectiveLootType, 0, { objectiveId: campaignObjectiveId });
                }
            }
            if (storyRooms.length && storyObjectives.length) {
                if (campaignObjectiveId === 'laser_designation') {
                    for (var designation = 0; designation < campaignTargetCount; designation++) {
                        var priorityPos = campaignSpawnPosition(designation, 2.0);
                        if (!priorityPos) break;
                        var priorityTarget = spawnEnemy(ENEMY_TEMPLATES[5], priorityPos.x, priorityPos.z, diffScale);
                        priorityTarget.isPriorityTarget = true;
                        var targetGrid = terrain.worldToGrid(priorityPos.x, priorityPos.z);
                        var markerPos = null;
                        for (var ring = 2; ring <= 5 && !markerPos; ring++) {
                            for (var ray = 0; ray < 20 && !markerPos; ray++) {
                                var angle = (ray / 20) * Math.PI * 2;
                                var markerX = targetGrid.gx + Math.round(Math.cos(angle) * ring);
                                var markerZ = targetGrid.gz + Math.round(Math.sin(angle) * ring);
                                if (!terrain.isPassable(markerX, markerZ)) continue;
                                var candidate = terrain.gridToWorld(markerX, markerZ);
                                if (state.loot.some(function (loot) { return !loot.picked && Math.hypot(loot.x - candidate.x, loot.z - candidate.z) < 1.0; })) continue;
                                markerPos = candidate;
                            }
                        }
                        markerPos = markerPos || priorityPos;
                        spawnLoot(markerPos.x, markerPos.z, 'laser_designator', 0, { objectiveId: campaignObjectiveId, priorityTargetId: priorityTarget.id });
                    }
                }

                var skullQuota = storyQuota('slay_skulls');
                var existingSkulls = state.enemies.filter(function (enemy) { return enemy.type === 'exploding' && !enemy.isDead; }).length;
                spawnCampaignQuota(ENEMY_TEMPLATES[4], Math.max(0, skullQuota - existingSkulls), 0, 1.2);

                var eliteQuota = storyQuota('slay_elites');
                var existingElites = state.enemies.filter(function (enemy) { return enemy.type === 'elite' && !enemy.isDead; }).length;
                spawnCampaignQuota(ENEMY_TEMPLATES[6], Math.max(0, eliteQuota - existingElites), 2, 1.5);

                var genericQuota = Math.max(storyQuota('slay_all'), storyQuota('survive_waves'), storyQuota('slay_minions'));
                var existingMinions = state.enemies.filter(function (enemy) { return enemy.type !== 'boss' && !enemy.isDead; }).length;
                var genericTemplate = storyObjectives.some(function (objective) { return objective && objective.id === 'survive_waves'; })
                    ? ENEMY_TEMPLATES[3] : ENEMY_TEMPLATES[floorRng.int(0, 3)];
                spawnCampaignQuota(genericTemplate, Math.max(0, genericQuota - existingMinions), 4, 1.2);

                var oreQuota = storyQuota('collect_ore');
                var existingOre = state.loot.filter(function (loot) { return loot.campaignItem === 'ore' && !loot.picked; }).length;
                for (var ore = Math.max(0, oreQuota - existingOre); ore > 0 && storyRooms.length; ore--) {
                    var orePos = campaignSpawnPosition(ore + 7, 0.9);
                    if (orePos) spawnLoot(orePos.x, orePos.z, 'item', 25, { itemName: 'Sparkite Power Crystal', campaignItem: 'ore' });
                }
            }

            // Endless expeditions culminate in a boss every fifth layer.
            // Story missions supply their own named boss from the campaign data.
            if (!config.isStoryMission && floorIndex % 5 === 0) {
                var bossIndex = 7 + ((Math.floor(floorIndex / 5) - 1) % 3);
                var bossRoom = terrain.safespaceRoom || terrain.rooms[terrain.rooms.length - 1];
                var bossPos = terrain.gridToWorld(bossRoom.cx, bossRoom.cz);
                spawnEnemy(ENEMY_TEMPLATES[bossIndex], bossPos.x, bossPos.z, diffScale);
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
            state.runScore = 0;
            state.runStreak = 0;
            state.runBestStreak = 0;
            state.runStreakTimer = 0;
            state.runStreakMultiplier = 1;
            state.meleeCooldown = 0;
            state.meleeBufferTime = 0;
            state.dodgeBuffer = null;
            state.elapsedTime = 0;
            state.timePressureStage = 0;
            state.turnCount = 1;
            state.paused = false;
            state.pauseMode = 'pause';
            state.fireCooldown = 0;
            state.grenadeCooldown = 0;
            state.shoveCooldown = 0;
            if (missionConfig.difficulty) state.difficulty = missionConfig.difficulty;
            if (missionConfig.temporalMode) setTemporalMode(missionConfig.temporalMode);
            if (missionConfig.floorIndex) state.floorIndex = missionConfig.floorIndex;

            state.player = createPlayer(missionConfig.race || 'human', missionConfig.classType || 'warrior');
            if (missionConfig.startingWeapon && WeaponCatalog && typeof WeaponCatalog.getWeapon === 'function') {
                var starter = WeaponCatalog.getWeapon(missionConfig.startingWeapon);
                if (starter && starter.id === missionConfig.startingWeapon) {
                    state.player.weaponId = starter.id;
                    state.player.weaponCollection = [starter.id];
                }
            }
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
            if (target !== state.player) {
                target.outOfCombatTimer = 0;
                target.outOfCombatHealing = false;
            }
            if (target !== state.player && target.ambushHidden && hit.attacker === state.player) {
                target.ambushHidden = false;
                bus.emit('enemy:ambush', { enemy: target, distance: Math.hypot(target.x - state.player.x, target.z - state.player.z), revealedBy: 'attack' });
            }
            var finalDmg = Math.max(0, Number(hit.rawDamage) || 0);
            var armorPenetration = Math.max(0, Math.min(0.75,
                Number(hit.armorPen) || (hit.attacker === state.player ? Number(state.player.armorPenetration) || 0 : 0)));

            if (target !== state.player && target.armored && hit.attacker && hit.attacker !== target) {
                var incomingAngle = Math.atan2(hit.attacker.z - target.z, hit.attacker.x - target.x);
                var facingDot = Math.cos(incomingAngle - (target.angle || 0));
                if (facingDot > 0.45 && hit.damageType !== 'ability') finalDmg *= 1 - 0.3 * (1 - armorPenetration);
                else if (facingDot < -0.55) finalDmg *= 1.2;
            }

            if (hit.attacker === state.player && target !== state.player && finalDmg > 0) {
                if (state.player.damageBoostTimer > 0) finalDmg *= 1.25;
                var adrenalineActive = state.player.hp / Math.max(1, state.player.maxHp) <= 0.3;
                if (adrenalineActive) {
                    finalDmg *= 1.2;
                    hit.adrenalineBonus = 0.2;
                }
                if (hit.damageType === 'melee') {
                    var movementSpeed = Math.hypot(state.player.vx || 0, state.player.vz || 0);
                    var momentumBonus = Math.min(0.2, movementSpeed / Math.max(1, state.player.speed * 1.45) * 0.2);
                    if (momentumBonus > 0) {
                        finalDmg *= 1 + momentumBonus;
                        hit.momentumBonus = momentumBonus;
                    }
                }
            }

            if (target !== state.player && (target.phaseShieldTimer > 0 || target.phaseShieldRequiresConduit)) {
                hit.phaseBlocked = true;
                hit.finalDamage = 0;
                bus.emit('combat:phase-shield', hit);
                return hit;
            }

            if (target !== state.player && hit.attacker === state.player && finalDmg > 0) {
                var dodgeChance = target.type === 'elite' ? 0.14 : (target.type === 'boss' ? 0.08 : 0.06);
                if (target.dodgeTime > 0 || (target.dodgeCooldown <= 0 && enemyDodgeRng.chance(dodgeChance))) {
                    if (target.dodgeTime <= 0) {
                        target.dodgeCooldown = 2.2;
                        target.dodgeTime = 0.32;
                        var awayX = target.x - state.player.x;
                        var awayZ = target.z - state.player.z;
                        var awayLength = Math.hypot(awayX, awayZ) || 1;
                        var side = enemyDodgeRng.chance(0.5) ? 1 : -1;
                        moveEntityXZ(target, (-awayZ / awayLength) * side * 0.85, (awayX / awayLength) * side * 0.85);
                        bus.emit('enemy:dodge', { enemy: target, attacker: state.player });
                    }
                    hit.finalDamage = 0;
                    hit.enemyDodged = true;
                    return hit;
                }
            }

            // Apply high ground bonus if attacker and target are provided
            var highGroundCritBonus = 0;
            if (hit.attacker && hit.target && !hit._highGroundApplied) {
                var hg = terrain.getHighGroundBonus(hit.attacker, hit.target);
                if (hg.hasHighGround) {
                    hit.isHighGround = true;
                    finalDmg *= hg.damageMultiplier;
                    highGroundCritBonus = Number(hg.critBonus) || 0;
                }
                var cov = terrain.getCoverBetween(hit.target, hit.attacker);
                if (cov.coverType !== 'none' && !hit.isFlank) {
                    hit.coverMitigated = true;
                    finalDmg *= (1 - cov.mitigation);
                }
            }

            if (hit.attacker === state.player && target !== state.player && finalDmg > 0) {
                // Sustained hits build a capped damage bonus. A miss or a full
                // three seconds without a hit lets the combo expire.
                var comboMultiplier = Math.max(1, Math.min(1.25, Number(state.player.comboDamageMultiplier) || 1));
                finalDmg *= comboMultiplier;
                hit.comboMultiplier = comboMultiplier;
                var attackerLevel = Math.max(1, Number(state.player.level) || 1);
                var critChance = Math.max(0, Math.min(0.4, 0.05 + (attackerLevel - 1) * 0.0025 + (Number(state.player.critChanceBonus) || 0) + highGroundCritBonus));
                if (hit.guaranteedCrit || hit.isHeadshot || critRng.chance(critChance)) {
                    hit.isCritical = true;
                    hit.critChance = critChance;
                    hit.critMultiplier = Math.max(1, Math.min(2.5, 1.5 + (attackerLevel - 1) * 0.005 + (Number(state.player.critDamageBonus) || 0)));
                    finalDmg *= hit.critMultiplier;
                }
                if (hit.isHeadshot) {
                    finalDmg *= 2;
                    hit.headshotCritMultiplier = 2;
                }
            }

            if (target === state.player) {
                if (root.gameDebug && root.gameDebug.godMode) return hit;
                if (target.dodgeTime > 0 || target.stoneForm) return hit;
                if (target.perfectBlockWindow > 0) {
                    target.perfectBlockWindow = 0;
                    hit.finalDamage = 0;
                    hit.perfectBlocked = true;
                    var countered = false;
                    if (hit.attacker && hit.attacker !== target && hit.attacker !== state.player &&
                        typeof hit.attacker.hp === 'number' && hit.attacker.hp > 0 && !hit.attacker.isDead) {
                        countered = true;
                        applyDamage({
                            attacker: target,
                            target: hit.attacker,
                            rawDamage: 24 * (target.meleeDamageMultiplier || 1),
                            damageType: 'melee',
                            guaranteedCrit: true,
                            isFlank: true
                        });
                    }
                    bus.emit('combat:perfect-block', { target: target, attacker: hit.attacker, countered: countered });
                    return hit;
                }
                if (target.luckyDodgeCooldown <= 0 && luckyDodgeRng.chance(0.05)) {
                    target.luckyDodgeCooldown = 1.25;
                    hit.finalDamage = 0;
                    hit.autoDodged = true;
                    bus.emit('combat:lucky-dodge', { target: target, attacker: hit.attacker, damageType: hit.damageType, chance: 0.05 });
                    return hit;
                }
                if (target.shieldBubble > 0) {
                    var absorbed = Math.min(target.shieldBubble, finalDmg);
                    target.shieldBubble -= absorbed;
                    finalDmg -= absorbed;
                    target.shieldCooldown = 5.0;
                }
                finalDmg *= Math.max(0.1, Number(target.damageTakenMultiplier) || 1);
                finalDmg *= 1 - Math.max(0, Math.min(0.25, Number(target.levelDamageReduction) || 0));
                var damageType = String(hit.damageType || '').toLowerCase();
                var resistanceTypes = { fire: 'fire', thermal: 'fire', cryo: 'ice', ice: 'ice', poison: 'poison', lightning: 'lightning', electric: 'lightning', warp: 'warp', void: 'warp', necrotic: 'necrotic' };
                var resistanceType = resistanceTypes[damageType] || null;
                if (resistanceType && target.damageResistances) {
                    var resistance = Math.max(0, Math.min(0.75, Number(target.damageResistances[resistanceType]) || 0));
                    finalDmg *= 1 - resistance;
                    hit.resistanceType = resistanceType;
                    hit.resistanceApplied = resistance;
                }
            }

            if (target !== state.player && hit.attacker === state.player && finalDmg > 0 && target.hp > 0) {
                var executionThreshold = target.type === 'boss' ? 0.05 : 0.12;
                if (target.hp / Math.max(1, target.maxHp) <= executionThreshold) {
                    finalDmg = Math.max(finalDmg, target.hp);
                    hit.isExecution = true;
                    hit.executionThreshold = executionThreshold;
                }
            }

            var hpBeforeHit = target.hp;
            target.hp = Math.max(0, target.hp - finalDmg);
            if (target === state.player && !target.secondWindUsed && target.hp > 0 &&
                hpBeforeHit / Math.max(1, target.maxHp) > 0.1 && target.hp / Math.max(1, target.maxHp) <= 0.1) {
                target.secondWindUsed = true;
                var secondWindHeal = Math.max(1, Math.round(target.maxHp * 0.25 * (target.healingEfficiency || 1)));
                var hpBeforeSecondWind = target.hp;
                target.hp = Math.min(target.maxHp, target.hp + secondWindHeal);
                bus.emit('combat:second-wind', { healed: target.hp - hpBeforeSecondWind, hp: target.hp, maxHp: target.maxHp });
            }
            target.flash = 0.14;
            hit.finalDamage = finalDmg;
            if (target !== state.player && hit.attacker === state.player && hpBeforeHit > 0 && finalDmg >= hpBeforeHit * 2.5) {
                hit.overkillMultiplier = finalDmg / hpBeforeHit;
                bus.emit('combat:overkill', hit);
            }

            // Orcs build Rage through active combat, then spend it on Rage Burst.
            if (target !== state.player && hit.attacker === state.player && state.player.race === 'orc' && finalDmg > 0) {
                state.player.rage = Math.min(100, state.player.rage + Math.min(12, Math.max(2, finalDmg * 0.35)));
            }

            if (hit.knockbackVec3) {
                terrain.applyKnockback(target, hit.knockbackVec3);
            }

            registry.notifyAfterDamage(hit);
            bus.emit('combat:damage', hit);
            if (hit.isExecution) bus.emit('combat:execution', hit);
            if (hit.attacker === state.player && target !== state.player && finalDmg > 0) {
                state.player.comboCount = Math.min(25, (Number(state.player.comboCount) || 0) + 1);
                state.player.comboTimer = 3;
                state.player.comboDamageMultiplier = 1 + state.player.comboCount * 0.01;
                bus.emit('combat:combo', {
                    count: state.player.comboCount,
                    multiplier: state.player.comboDamageMultiplier,
                    timer: state.player.comboTimer,
                    hitMultiplier: hit.comboMultiplier || 1
                });
            }
            if (hit.isCritical) bus.emit('combat:critical', hit);
            if (hit.isHeadshot) bus.emit('combat:headshot', hit);

            if (target.hp <= 0 && !target.isDead) {
                target.isDead = true;
                var killEv = { attacker: hit.attacker, target: target, damageEvent: hit };
                if (target !== state.player) {
                    state.runKills++;
                    state.runStreak = state.runStreakTimer > 0 ? state.runStreak + 1 : 1;
                    state.runBestStreak = Math.max(state.runBestStreak, state.runStreak);
                    state.runStreakTimer = 4;
                    state.runStreakMultiplier = Math.min(5, state.runStreak);
                    var scoreEarned = 100 * state.runStreakMultiplier;
                    state.runScore += scoreEarned;
                    bus.emit('combat:streak', {
                        count: state.runStreak,
                        multiplier: state.runStreakMultiplier,
                        scoreEarned: scoreEarned,
                        totalScore: state.runScore,
                        timer: state.runStreakTimer
                    });
                    if (hit.attacker === state.player) {
                        var bloodlust = state.player.bloodlust || (state.player.bloodlust = []);
                        var gainedBloodlustStack = bloodlust.length < 5;
                        if (gainedBloodlustStack) bloodlust.push(6);
                        else bloodlust[0] = 6;
                        bus.emit('combat:bloodlust', { stacks: bloodlust.length, multiplier: getAttackSpeedMultiplier(state.player), gained: gainedBloodlustStack });
                    }
                    if (state.player && state.player.race === 'orc' && hit.attacker === state.player) {
                        state.player.rage = Math.min(100, state.player.rage + 12);
                    }
                    if (hit.attacker === state.player && (state.loot.length < 36 || target.type === 'boss')) {
                        var pickupType = null;
                        var powerupTypes = ['damage_boost', 'speed_boost', 'shield_pickup', 'gold_multiplier', 'xp_multiplier'];
                        if (state.player.race === 'orc') powerupTypes.push('rage_potion');
                        if (target.type === 'boss') pickupType = rng.pick(powerupTypes);
                        else if (target.type === 'elite' && rng.chance(0.55)) pickupType = rng.pick(powerupTypes);
                        else if (rng.chance(target.type === 'exploding' ? 0.035 : 0.075)) pickupType = 'health_orb';
                        if (pickupType) {
                            var pickupNames = {
                                health_orb: 'Soul Heart', speed_boost: 'Wraithstep', damage_boost: 'Gravefire',
                                shield_pickup: 'Aegis Shard', rage_potion: 'Orc Rage Draught',
                                gold_multiplier: 'Midas Dust', xp_multiplier: 'Memory Sigil'
                            };
                            spawnLoot(target.x, target.z, pickupType, 0, { itemName: pickupNames[pickupType] });
                        }
                    }
                    if (state.player && !(state.missionConfig && state.missionConfig.appHandlesKillRewards)) {
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

        function handleBreachableWallDamage(result, cell, gx, gz) {
            if (!result || result.kind !== 'wall_breached' || !cell || !cell.secretWall || cell.secretOpened) return;
            cell.secretOpened = true;
            var secretCache = (terrain.secretCaches || []).find(function (cache) { return cache.id === cell.secretCacheId; });
            if (secretCache) secretCache.opened = true;
            bus.emit('world:secret-cache-opened', { cacheId: cell.secretCacheId, gx: gx, gz: gz });
        }

        function dealAoEDamage3D(x, y, z, radius, dmg, damageType, weaponModifiers) {
            var abilityDamage = dmg * (damageType === 'ability' && state.player ? (state.player.abilityDamageMultiplier || 1) : 1);
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
                        var terrainHit = terrain.damageCell(gx, gz, dmg, damageType);
                        handleBreachableWallDamage(terrainHit, cell, gx, gz);
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
                    var isBossTarget = e.type === 'boss' || e.type === 'elite';
                    var targetDamage = abilityDamage * (isBossTarget ? (state.player && state.player.bossDamageMultiplier || 1) : 1);
                    if (isBossTarget && weaponModifiers) targetDamage *= Number(weaponModifiers.bossBonus) || 1;
                    if (weaponModifiers && Number(weaponModifiers.executeBonus) > 1 && e.hp / Math.max(1, e.maxHp) <= 0.25) {
                        targetDamage *= Number(weaponModifiers.executeBonus);
                    }
                    applyDamage({
                        attacker: state.player,
                        target: e,
                        rawDamage: targetDamage,
                        damageType: damageType,
                        projectileId: weaponModifiers && weaponModifiers.projectileId,
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

        function explodeProjectile(projectile, x, y, z) {
            dealAoEDamage3D(x, y, z, projectile.explosionRadius, projectile.damage, 'explosive', {
                bossBonus: projectile.bossBonus,
                executeBonus: projectile.executeBonus,
                projectileId: projectile.id
            });
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
                color: opts2.color || (opts2.owner && opts2.owner !== state.player ? 0xc084fc : 0xfef08a),
                pierceLeft: Math.max(0, Math.floor(Number(opts2.pierce) || 0)),
                hitIds: Object.create(null),
                slow: Number(opts2.slow) || 0,
                slowDuration: Number(opts2.slowDuration) || 2.4,
                healOnHit: Number(opts2.healOnHit) || 0,
                knockback: Number(opts2.knockback) || 1.4,
                bossBonus: Number(opts2.bossBonus) || 1,
                armorPen: Math.max(0, Math.min(0.75, Number(opts2.armorPen) || 0)),
                executeBonus: Number(opts2.executeBonus) || 1,
                explosive: !!opts2.explosive,
                explosionRadius: opts2.explosionRadius || 4.0,
                life: opts2.life || 1.6,
                dead: false
            };
            state.projectiles.push(proj);
            if (proj.owner === state.player) {
                bus.emit('campaign:projectile-fired', { projectileId: proj.id });
            }

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

        function firePlayerWeapon() {
            var p = state.player;
            if (!p || p.isDead || state.fireCooldown > 0) return false;
            var weapon = getWeapon(p.weaponId);
            state.fireCooldown = Math.max(0.075, weapon.interval || 0.22);
            var shotCount = Math.max(1, Math.floor(weapon.pellets || 1));
            for (var shot = 0; shot < shotCount; shot++) {
                var spreadOffset = shotCount > 1 ? (shot - (shotCount - 1) / 2) * (weapon.spread || 0) : 0;
                var shotAngle = p.angle + spreadOffset;
                fireProjectile(
                    { x: p.x, y: p.y + 1.15, z: p.z },
                    { x: Math.cos(shotAngle), y: 0, z: Math.sin(shotAngle) },
                    {
                        damage: weapon.damage * (p.rangedDamageMultiplier || 1),
                        speed: weapon.speed,
                        life: weapon.life,
                        color: weapon.color,
                        pierce: weapon.pierce,
                        slow: weapon.slow,
                        slowDuration: weapon.slowDuration,
                        healOnHit: weapon.healOnHit,
                        knockback: weapon.knockback,
                        bossBonus: weapon.bossBonus,
                        armorPen: Math.min(0.75, (p.armorPenetration || 0) + (weapon.armorPen || 0)),
                        executeBonus: weapon.executeBonus,
                        explosive: weapon.explosive,
                        explosionRadius: weapon.radius
                    }
                );
            }
            return true;
        }

        function getAttackSpeedMultiplier(player) {
            var stacks = player && Array.isArray(player.bloodlust) ? player.bloodlust.length : 0;
            return 1 + Math.min(5, stacks) * 0.1;
        }

        function triggerMeleeSwing(fromBuffer) {
            if (!state.player || state.player.isDead) return 0;
            if (state.meleeCooldown > 0) {
                if (state.temporalMode !== 'turnbased' && state.meleeCooldown <= 0.24) {
                    state.meleeBufferTime = 0.24;
                    bus.emit('combat:input-buffered', { action: 'melee', expiresIn: state.meleeBufferTime });
                    bus.emit('combat:charge-release', { charge: Number(state.player.meleeCharge) || 0, buffered: true });
                }
                return 0;
            }
            state.meleeBufferTime = 0;
            var p = state.player;
            state.meleeCooldown = state.temporalMode === 'turnbased' ? 0 : 0.55;
            var dashAttack = p.dodgeTime > 0;
            var shieldBash = !dashAttack && p.perfectBlockWindow > 0;
            var chargeRatio = Math.max(0, Math.min(1, (Number(p.meleeCharge) || 0) / 1.1));
            var chargeAttack = !dashAttack && !shieldBash && chargeRatio >= (0.3 / 1.1);
            var chargeBonus = chargeAttack ? chargeRatio : 0;
            var chargeTime = Number(p.meleeCharge) || 0;
            p.meleeCharge = 0;
            bus.emit('combat:charge-release', { charge: chargeTime, charged: chargeAttack });
            var sprintInput = !!(inputState.keys['ShiftLeft'] || inputState.keys['ShiftRight']);
            var movingFast = Math.hypot(p.vx || 0, p.vz || 0) >= p.speed * 1.2;
            var sprintLunge = !dashAttack && !shieldBash && !chargeAttack && sprintInput && p.stamina > 5 && movingFast;
            var reach = shieldBash ? 3.4 : (chargeAttack ? 3.6 : (sprintLunge ? 4.0 : 2.8));
            var attackMovementMultiplier = dashAttack ? 1.35 : (shieldBash ? 1.25 : (chargeAttack ? 1 + chargeBonus : (sprintLunge ? 1.15 : 1)));
            if (worldRenderer && typeof worldRenderer.spawnMeleeTrail === 'function') {
                worldRenderer.spawnMeleeTrail(p, p.angle, reach, dashAttack ? 'dash' : (shieldBash ? 'shield' : (chargeAttack ? 'charged' : 'normal')));
            }
            var hits = 0;
            var terrainHits = 0;
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
                            rawDamage: 14 * (p.meleeDamageMultiplier || 1) * attackMovementMultiplier * (e.type === 'boss' || e.type === 'elite' ? (p.bossDamageMultiplier || 1) : 1),
                            damageType: 'melee',
                            armorPen: p.armorPenetration,
                            dashAttack: dashAttack,
                            chargeAttack: chargeAttack,
                            chargeBonus: chargeBonus,
                            sprintLunge: sprintLunge,
                            knockbackVec3: { x: (dx / (dist || 1)) * (shieldBash ? 3.8 : 1.4), y: 0, z: (dz / (dist || 1)) * (shieldBash ? 3.8 : 1.4) },
                            shieldBash: shieldBash
                        });
                        hits++;
                    }
                }
            }
            var meleeRayHit = terrain.raycast3D(
                { x: p.x, y: p.y + 1.1, z: p.z },
                { x: Math.cos(p.angle), y: 0, z: Math.sin(p.angle) },
                reach
            );
            if (meleeRayHit.hit && meleeRayHit.cell && meleeRayHit.cell.type === 'breachable') {
                var wallDamage = 14 * (p.meleeDamageMultiplier || 1) * attackMovementMultiplier;
                var wallResult = terrain.damageCell(meleeRayHit.gx, meleeRayHit.gz, wallDamage, 'melee');
                handleBreachableWallDamage(wallResult, meleeRayHit.cell, meleeRayHit.gx, meleeRayHit.gz);
                if (worldRenderer) worldRenderer.spawnFlashLight(meleeRayHit.point, 0xfbbf24, 1.8, 5, 0.08);
                terrainHits++;
            }
            if ((hits > 0 || terrainHits > 0) && cameraRig) cameraRig.triggerHitStop(0.04);
            if (hits > 0 && fromBuffer) bus.emit('combat:melee-buffered-hit', { hits: hits });
            if (hits > 0 && dashAttack) bus.emit('combat:dash-attack', { hits: hits, bonus: 0.35 });
            else if (hits > 0 && shieldBash) bus.emit('combat:shield-bash', { hits: hits, bonus: 0.25, knockback: 3.8 });
            else if (hits > 0 && chargeAttack) bus.emit('combat:charge-attack', { hits: hits, charge: chargeRatio, bonus: chargeBonus });
            else if (hits > 0 && sprintLunge) bus.emit('combat:sprint-lunge', { hits: hits, bonus: 0.15, reach: reach });
            return hits + terrainHits;
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

            var bestConduit = null;
            var bestConduitDist = 2.8;
            state.loot.forEach(function (loot) {
                if (!loot || loot.picked || (loot.type !== 'conduit' && !loot.objectiveId)) return;
                var distance = Math.hypot(loot.x - p.x, loot.z - p.z);
                if (distance < bestConduitDist) { bestConduitDist = distance; bestConduit = loot; }
            });
            if (bestConduit) {
                if (bestConduit.type === 'soul_fountain' || bestConduit.type === 'blood_altar') {
                    var shrineResult = { type: bestConduit.type, hpRestored: 0, shieldRestored: 0, damageDuration: 0, speedDuration: 0 };
                    if (bestConduit.type === 'soul_fountain') {
                        var hpBeforeFountain = p.hp;
                        var shieldBeforeFountain = p.shieldBubble;
                        p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.35 * (p.healingEfficiency || 1)));
                        p.stamina = p.maxStamina;
                        p.shieldBubble = Math.min(p.race === 'human' ? 20 : 60, p.shieldBubble + 15);
                        shrineResult.hpRestored = p.hp - hpBeforeFountain;
                        shrineResult.shieldRestored = p.shieldBubble - shieldBeforeFountain;
                    } else {
                        p.damageBoostTimer = Math.min(30, p.damageBoostTimer + 20);
                        p.speedBoostTimer = Math.min(30, p.speedBoostTimer + 20);
                        shrineResult.damageDuration = p.damageBoostTimer;
                        shrineResult.speedDuration = p.speedBoostTimer;
                    }
                    bestConduit.picked = true;
                    state.loot = state.loot.filter(function (loot) { return !loot.picked; });
                    shrineResult.name = bestConduit.itemName;
                    shrineResult.roomId = bestConduit.roomId;
                    bus.emit('room:shrine-used', shrineResult);
                    return shrineResult;
                }
                var laserTarget = null;
                if (bestConduit.type === 'laser_designator') {
                    laserTarget = state.enemies.find(function (enemy) {
                        return enemy.id === bestConduit.priorityTargetId && !enemy.isDead && enemy.hp > 0 && (enemy.type === 'elite' || enemy.type === 'boss');
                    });
                    if (!laserTarget) {
                        laserTarget = state.enemies.find(function (enemy) {
                            return !enemy.isDead && !enemy.isDesignated && enemy.hp > 0 && (enemy.type === 'elite' || enemy.type === 'boss') && Math.hypot(enemy.x - bestConduit.x, enemy.z - bestConduit.z) <= 8;
                        });
                    }
                    if (!laserTarget) {
                        var markerGrid = terrain.worldToGrid(bestConduit.x, bestConduit.z);
                        var replacementPos = null;
                        for (var ring = 2; ring <= 6 && !replacementPos; ring++) {
                            for (var ray = 0; ray < 24 && !replacementPos; ray++) {
                                var angle = (ray / 24) * Math.PI * 2;
                                var gx = markerGrid.gx + Math.round(Math.cos(angle) * ring);
                                var gz = markerGrid.gz + Math.round(Math.sin(angle) * ring);
                                if (!terrain.isPassable(gx, gz)) continue;
                                var candidate = terrain.gridToWorld(gx, gz);
                                if (Math.hypot(candidate.x - p.x, candidate.z - p.z) < 2.5) continue;
                                var occupied = state.enemies.some(function (enemy) {
                                    return !enemy.isDead && enemy.hp > 0 && Math.hypot(enemy.x - candidate.x, enemy.z - candidate.z) < 1.6;
                                });
                                if (!occupied) replacementPos = candidate;
                            }
                        }
                        replacementPos = replacementPos || { x: bestConduit.x, z: bestConduit.z };
                        laserTarget = spawnEnemy(ENEMY_TEMPLATES[5], replacementPos.x, replacementPos.z, 1.0);
                        laserTarget.isPriorityTarget = true;
                        bus.emit('campaign:designation-reinforced', { markerId: bestConduit.id, targetId: laserTarget.id });
                    }
                }
                bestConduit.picked = true;
                state.loot = state.loot.filter(function (loot) { return !loot.picked; });
                if (bestConduit.type === 'conduit') {
                    var shieldedBoss = state.enemies.find(function (enemy) {
                        return enemy.type === 'boss' && !enemy.isDead && enemy.hp > 0 && enemy.phaseShieldRequiresConduit;
                    });
                    if (shieldedBoss) {
                        shieldedBoss.phaseShieldRequiresConduit = false;
                        shieldedBoss.phaseShieldTimer = 0;
                        bestConduit.bossShieldBroken = true;
                        bestConduit.bossName = shieldedBoss.title || shieldedBoss.name || 'WARDEN';
                        bus.emit('enemy:boss-shield-broken', { enemy: shieldedBoss, conduit: bestConduit });
                    }
                    bus.emit('conduit:overloaded', bestConduit);
                }
                else {
                    if (bestConduit.type === 'laser_designator') {
                        laserTarget.isDesignated = true;
                        applyDamage({ target: laserTarget, rawDamage: Math.max(30, laserTarget.maxHp * 0.28), damageType: 'ability' });
                    }
                    bus.emit('campaign:objective-progress', bestConduit);
                }
                return { type: bestConduit.type, id: bestConduit.id };
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

        function dodgePlayer(dx, dz) {
            var p = state.player;
            if (!p || p.isDead || p.stamina < 25) return false;
            if (!isFinite(Number(dx)) || !isFinite(Number(dz)) || Math.hypot(Number(dx), Number(dz)) < 0.001) {
                dx = Math.cos(p.angle || 0);
                dz = Math.sin(p.angle || 0);
            }
            var len = Math.hypot(dx, dz) || 1;
            dx /= len;
            dz /= len;
            if (p.dodgeTime > 0) {
                if (p.dodgeTime <= 0.16) {
                    state.dodgeBuffer = { time: 0.18, dx: dx, dz: dz };
                    bus.emit('combat:input-buffered', { action: 'dodge', expiresIn: 0.18 });
                }
                return false;
            }
            state.dodgeBuffer = null;
            p.dodgeTime = 0.35;
            p.dodgeCooldown = 0.45;
            p.stamina = Math.max(0, p.stamina - 25);
            p.vx = dx * p.speed * 2.8;
            p.vz = dz * p.speed * 2.8;
            p.angle = Math.atan2(dz, dx);
            p.moveTarget.active = false;
            moveEntityXZ(p, p.vx * 0.12, p.vz * 0.12);
            bus.emit('player:dodge', { x: p.x, y: p.y, z: p.z, dx: dx, dz: dz });
            return true;
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
                    if (pr.explosive) explodeProjectile(pr, pr.x, pr.y, pr.z);
                    pr.dead = true;
                    state.projectiles.splice(i, 1);
                    continue;
                }

                var prevX = pr.x, prevY = pr.y, prevZ = pr.z;
                pr.vy -= pr.gravity * dt;
                var nextX = prevX + pr.vx * dt;
                var nextY = prevY + pr.vy * dt;
                var nextZ = prevZ + pr.vz * dt;

                // Enemy bolts use the same swept projectile path as the player's shots.
                if (pr.owner !== state.player && state.player && !state.player.isDead) {
                    var playerDistXZ = Math.hypot(state.player.x - nextX, state.player.z - nextZ);
                    if (playerDistXZ <= state.player.radius + 0.35 && nextY >= state.player.y - 0.15 && nextY <= state.player.y + 2.0) {
                        applyDamage({
                            attacker: pr.owner,
                            target: state.player,
                            rawDamage: pr.damage,
                            damageType: pr.damageType || 'ranged',
                            hitPos3D: { x: nextX, y: nextY, z: nextZ },
                            knockbackVec3: { x: pr.vx / 50, y: 0, z: pr.vz / 50 }
                        });
                        state.projectiles.splice(i, 1);
                        continue;
                    }
                }

                var segX = nextX - prevX;
                var segY = nextY - prevY;
                var segZ = nextZ - prevZ;
                var segLen = Math.sqrt(segX * segX + segY * segY + segZ * segZ);

                // Check enemy & prop sphere hits first
                var hitEntity = false;
                for (var ei = 0; ei < state.enemies.length; ei++) {
                    var e = state.enemies[ei];
                    if (e.isDead || e.hp <= 0 || e === pr.owner || (pr.hitIds && pr.hitIds[e.id])) continue;
                    var distXZ = Math.hypot(e.x - nextX, e.z - nextZ);
                    if (distXZ <= e.radius + 0.35 && nextY >= e.y - 0.2 && nextY <= e.y + 2.2) {
                        if (pr.explosive) {
                            explodeProjectile(pr, nextX, nextY, nextZ);
                            hitEntity = true;
                        } else {
                            var segmentLengthSq = segX * segX + segZ * segZ;
                            var segmentRatio = segmentLengthSq > 1e-6
                                ? clamp(((e.x - prevX) * segX + (e.z - prevZ) * segZ) / segmentLengthSq, 0, 1)
                                : 1;
                            var headX = prevX + segX * segmentRatio;
                            var headZ = prevZ + segZ * segmentRatio;
                            var headY = prevY + segY * segmentRatio;
                            var headshot = pr.owner === state.player && e.humanoid &&
                                Math.hypot(e.x - headX, e.z - headZ) <= Math.min(0.22, e.radius * 0.4) &&
                                headY >= e.y + 0.9 && headY <= e.y + 2.1;
                            var isBossTarget = e.type === 'boss' || e.type === 'elite';
                            var finalShotDamage = pr.damage * (isBossTarget ? pr.bossBonus : 1);
                            if (pr.executeBonus > 1 && e.hp / Math.max(1, e.maxHp) <= 0.25) finalShotDamage *= pr.executeBonus;
                            applyDamage({
                                attacker: pr.owner,
                                target: e,
                                rawDamage: finalShotDamage,
                                damageType: pr.damageType,
                                armorPen: pr.armorPen,
                                isHeadshot: headshot,
                                projectileId: pr.id,
                                hitPos3D: { x: nextX, y: nextY, z: nextZ },
                                knockbackVec3: { x: (pr.vx / (Math.hypot(pr.vx, pr.vz) || 1)) * pr.knockback, y: 0, z: (pr.vz / (Math.hypot(pr.vx, pr.vz) || 1)) * pr.knockback }
                            });
                            if (pr.slow > 0 && !e.isDead) {
                                e.weaponSlowFactor = Math.min(e.weaponSlowFactor || 1, pr.slow);
                                e.weaponSlowTimer = Math.max(e.weaponSlowTimer || 0, pr.slowDuration);
                            }
                            if (pr.healOnHit > 0 && pr.owner === state.player) state.player.hp = Math.min(state.player.maxHp, state.player.hp + pr.healOnHit * (state.player.healingEfficiency || 1));
                            if (pr.pierceLeft > 0) {
                                pr.pierceLeft--;
                                pr.hitIds[e.id] = true;
                            } else {
                                hitEntity = true;
                            }
                        }
                        if (hitEntity) { pr.dead = true; break; }
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
                        if (pr.explosive) explodeProjectile(pr, nextX, nextY, nextZ);
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
                            explodeProjectile(pr, rayHit.point.x, rayHit.point.y, rayHit.point.z);
                        } else if (rayHit.cell) {
                            var directTerrainHit = terrain.damageCell(rayHit.gx, rayHit.gz, pr.damage, pr.damageType);
                            handleBreachableWallDamage(directTerrainHit, rayHit.cell, rayHit.gx, rayHit.gz);
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
            if (p.comboTimer > 0) {
                p.comboTimer = Math.max(0, p.comboTimer - dt);
                if (p.comboTimer === 0 && p.comboCount > 0) {
                    p.comboCount = 0;
                    p.comboDamageMultiplier = 1;
                    bus.emit('combat:combo', { count: 0, multiplier: 1, timer: 0, hitMultiplier: 1 });
                }
            }
            if (state.runStreakTimer > 0) {
                state.runStreakTimer = Math.max(0, state.runStreakTimer - dt);
                if (state.runStreakTimer === 0 && state.runStreak > 0) {
                    state.runStreak = 0;
                    state.runStreakMultiplier = 1;
                    bus.emit('combat:streak', {
                        count: 0,
                        multiplier: 1,
                        scoreEarned: 0,
                        totalScore: state.runScore,
                        timer: 0
                    });
                }
            }
            var previousBloodlustStacks = Array.isArray(p.bloodlust) ? p.bloodlust.length : 0;
            p.bloodlust = (p.bloodlust || []).map(function (remaining) { return Math.max(0, (Number(remaining) || 0) - dt); }).filter(function (remaining) { return remaining > 0; });
            if (p.bloodlust.length !== previousBloodlustStacks) {
                bus.emit('combat:bloodlust', { stacks: p.bloodlust.length, multiplier: getAttackSpeedMultiplier(p) });
            }
            var pressureStage = getTimePressureStage();
            if (pressureStage > state.timePressureStage) {
                state.timePressureStage = pressureStage;
                bus.emit('difficulty:surge', {
                    stage: pressureStage,
                    multiplier: getTimePressureMultiplier(pressureStage),
                    elapsedTime: state.elapsedTime
                });
            }
            for (var pressureIndex = 0; pressureIndex < state.enemies.length; pressureIndex += 1) {
                applyTimePressureToEnemy(state.enemies[pressureIndex], pressureStage);
            }
            var attackSpeedMultiplier = getAttackSpeedMultiplier(p);
            state.fireCooldown = Math.max(0, state.fireCooldown - dt * attackSpeedMultiplier);
            state.meleeCooldown = Math.max(0, state.meleeCooldown - dt * attackSpeedMultiplier);
            state.meleeBufferTime = Math.max(0, state.meleeBufferTime - dt);
            state.grenadeCooldown = Math.max(0, state.grenadeCooldown - dt);
            state.shoveCooldown = Math.max(0, state.shoveCooldown - dt);
            if (state.meleeBufferTime > 0 && state.meleeCooldown <= 0) {
                state.meleeBufferTime = 0;
                triggerMeleeSwing(true);
            }

            // Player regen & timers
            if (!p.stoneForm) p.hp = Math.min(p.maxHp, p.hp + p.hpRegen * (p.healingEfficiency || 1) * dt);
            p.speedBoostTimer = Math.max(0, (Number(p.speedBoostTimer) || 0) - dt);
            p.damageBoostTimer = Math.max(0, (Number(p.damageBoostTimer) || 0) - dt);
            p.goldBoostTimer = Math.max(0, (Number(p.goldBoostTimer) || 0) - dt);
            p.xpBoostTimer = Math.max(0, (Number(p.xpBoostTimer) || 0) - dt);
            p.dodgeTime = Math.max(0, p.dodgeTime - dt);
            if (state.dodgeBuffer) {
                state.dodgeBuffer.time -= dt;
                if (p.dodgeTime <= 0 && state.dodgeBuffer.time > 0) {
                    var bufferedDodge = state.dodgeBuffer;
                    state.dodgeBuffer = null;
                    dodgePlayer(bufferedDodge.dx, bufferedDodge.dz);
                } else if (state.dodgeBuffer.time <= 0) {
                    state.dodgeBuffer = null;
                }
            }
            p.luckyDodgeCooldown = Math.max(0, (Number(p.luckyDodgeCooldown) || 0) - dt);
            if (inputState.keys['KeyV']) {
                p.meleeCharge = Math.min(1.1, (Number(p.meleeCharge) || 0) + dt);
                bus.emit('combat:charge-progress', { charge: p.meleeCharge, maxCharge: 1.1 });
            }
            p.perfectBlockWindow = Math.max(0, p.perfectBlockWindow - dt);
            p.blockCooldown = Math.max(0, p.blockCooldown - dt);
            if (p.stoneForm) {
                p.stoneDuration -= dt;
                if (p.stoneDuration <= 0) p.stoneForm = false;
            }
            if (p.race === 'elf') p.mana = Math.min(p.maxMana, p.mana + 2 * dt);
            if (p.race === 'orc') p.rage = Math.max(0, p.rage - 3 * dt);
            if (p.race === 'human') {
                p.shieldCooldown = Math.max(0, p.shieldCooldown - dt);
                if (p.shieldCooldown === 0) p.shieldBubble = Math.min(20, p.shieldBubble + 2 * dt);
            }
            var adrenalineActive = p.hp / Math.max(1, p.maxHp) <= 0.3;
            if (adrenalineActive !== p.adrenalineActive) {
                p.adrenalineActive = adrenalineActive;
                bus.emit('combat:adrenaline', { active: adrenalineActive, healthRatio: p.hp / Math.max(1, p.maxHp) });
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
                dodgePlayer(arrowDodgeX / aLen, arrowDodgeZ / aLen);
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
                var adrenalineSpeed = p.hp / Math.max(1, p.maxHp) <= 0.3 ? 1.2 : 1;
                var pickupSpeedBoost = p.speedBoostTimer > 0 ? 1.25 : 1;
                var spd = p.speed * (sprinting ? 1.45 : 1.0) * adrenalineSpeed * pickupSpeedBoost;
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
                    { explosive: true, explosionRadius: 4.5, damage: 70 * (p.rangedDamageMultiplier || 1), speed: 15 }
                );
            }
            if ((inputState.shovePressed || keys['KeyK']) && state.shoveCooldown <= 0) {
                inputState.shovePressed = false;
                keys['KeyK'] = false;
                state.shoveCooldown = 0.45;
                shoveKnockback(p, { x: Math.cos(p.angle), z: Math.sin(p.angle) }, 3.4, 5.0);
            }
            if (inputState.mouseDown && state.fireCooldown <= 0) firePlayerWeapon();

            // Update Fog of War & Interior zone if player moved
            if (Math.hypot(p.x - prevX, p.z - prevZ) > 0.1) {
                terrain.updateFogOfWar(p, 16);
                if (worldRenderer) worldRenderer.updateFogTexture();
            }
            var secretWalls = terrain.secretCaches || [];
            for (var si = 0; si < secretWalls.length; si++) {
                var secret = secretWalls[si];
                var secretCell = terrain.getCell(secret.entranceGx, secret.entranceGz);
                if (!secret.discovered && secretCell && Math.hypot(p.x - (secret.entranceGx + 0.5) * terrain.tileSize, p.z - (secret.entranceGz + 0.5) * terrain.tileSize) <= terrain.tileSize * 1.8) {
                    secret.discovered = true;
                    secretCell.secretDiscovered = true;
                    terrain._emitMutation({ kind: 'secret_revealed', cell: secretCell });
                    bus.emit('world:secret-revealed', { cacheId: secret.id });
                }
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
                e.dodgeCooldown = Math.max(0, (Number(e.dodgeCooldown) || 0) - dt);
                e.dodgeTime = Math.max(0, (Number(e.dodgeTime) || 0) - dt);
                e.fleeCooldown = Math.max(0, (Number(e.fleeCooldown) || 0) - dt);
                e.fleeTimer = Math.max(0, (Number(e.fleeTimer) || 0) - dt);
                var phaseTransitioning = e.phaseShieldTimer > 0 || e.phaseShieldRequiresConduit;
                if (phaseTransitioning) e.phaseShieldTimer = Math.max(0, e.phaseShieldTimer - dt);
                if (e.knockdownTimer > 0) e.knockdownTimer = Math.max(0, e.knockdownTimer - dt);
                if (e.weaponSlowTimer > 0) {
                    e.weaponSlowTimer = Math.max(0, e.weaponSlowTimer - dt);
                    if (e.weaponSlowTimer === 0) e.weaponSlowFactor = 1;
                }
                if (e.staggerTimer > 0) {
                    e.staggerTimer = Math.max(0, e.staggerTimer - dt);
                    continue;
                }
                if (phaseTransitioning) continue;

                terrain.stepFalling(e, dt);
                if (e.isDead) continue;

                var eHaz = terrain.applyHazardAt(e, dt);
                if (eHaz && eHaz.damage > 0) {
                    applyDamage({ attacker: null, target: e, rawDamage: eHaz.damage, damageType: eHaz.hazard });
                    if (e.isDead) continue;
                }

                var dToP = Math.hypot(p.x - e.x, p.z - e.z);
                if (e.leashGraceTimer > 0) e.leashGraceTimer = Math.max(0, e.leashGraceTimer - dt);
                if (e.ambushHidden && dToP <= 8.5) {
                    e.ambushHidden = false;
                    bus.emit('enemy:ambush', { enemy: e, distance: dToP, revealedBy: 'proximity' });
                }

                var nearbyAllies = 0;
                for (var allyIndex = 0; allyIndex < state.enemies.length; allyIndex += 1) {
                    var ally = state.enemies[allyIndex];
                    if (ally === e || ally.isDead || ally.hp <= 0) continue;
                    if (Math.hypot(ally.x - e.x, ally.z - e.z) <= 7) nearbyAllies += 1;
                }
                e.packDamageMultiplier = 1 + Math.min(3, nearbyAllies) * 0.1;

                if (dToP > 24) {
                    if (e.state === 'chase') e.state = 'idle';
                    e.outOfCombatTimer = (Number(e.outOfCombatTimer) || 0) + dt;
                    if (e.outOfCombatTimer >= 8) {
                        var recoveryRate = e.type === 'boss' ? 0.0075 : 0.02;
                        if (!e.outOfCombatHealing) bus.emit('enemy:recover', { enemy: e, rate: recoveryRate });
                        e.outOfCombatHealing = true;
                        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * recoveryRate * dt);
                    }
                } else {
                    e.outOfCombatTimer = 0;
                    e.outOfCombatHealing = false;
                }

                var homeReference = { x: e.homeX, z: e.homeZ };
                if (e.homeRoomBounds) {
                    var enemyGrid = terrain.worldToGrid(e.x, e.z);
                    var nearestHomeGx = clamp(enemyGrid.gx, e.homeRoomBounds.x, e.homeRoomBounds.x + e.homeRoomBounds.width - 1);
                    var nearestHomeGz = clamp(enemyGrid.gz, e.homeRoomBounds.z, e.homeRoomBounds.z + e.homeRoomBounds.height - 1);
                    var nearestHomeCell = terrain.gridToWorld(nearestHomeGx, nearestHomeGz);
                    homeReference = { x: nearestHomeCell.x, z: nearestHomeCell.z };
                }
                var leashDistance = Math.hypot(e.x - homeReference.x, e.z - homeReference.z);
                if (!e.leashReturning && e.leashGraceTimer <= 0 && leashDistance > terrain.tileSize * 10) {
                    e.leashReturning = true;
                    e.leashPath = buildEnemyPath(e);
                    e.leashPathIndex = 0;
                    if (!e.leashPath) {
                        e.leashReturning = false;
                        e.leashGraceTimer = 6;
                        e.state = 'idle';
                        continue;
                    }
                    e.state = 'return';
                    e.fleeTimer = 0;
                    e.telegraphTimer = 0;
                    e.telegraph = null;
                    e.pendingAttack = null;
                    bus.emit('enemy:leash', { enemy: e, distance: leashDistance });
                }
                if (e.leashReturning) {
                    var returnPoint = e.leashPath && e.leashPath[e.leashPathIndex];
                    if (!returnPoint) returnPoint = { x: e.homeX, z: e.homeZ };
                    var returnDx = returnPoint.x - e.x;
                    var returnDz = returnPoint.z - e.z;
                    var returnDistance = Math.hypot(returnDx, returnDz);
                    if (returnDistance <= 0.45) {
                        if (e.leashPath && e.leashPathIndex < e.leashPath.length) {
                            e.leashPathIndex += 1;
                            continue;
                        }
                        e.leashReturning = false;
                        e.leashPath = null;
                        e.leashGraceTimer = 6;
                        e.state = 'idle';
                        e.outOfCombatTimer = 0;
                        e.outOfCombatHealing = false;
                        continue;
                    }
                    var returnSpeed = Math.max(2.5, e.speed * 1.25);
                    e.angle = Math.atan2(returnDz, returnDx);
                    moveEntityXZ(e, returnDx / returnDistance * returnSpeed * dt, returnDz / returnDistance * returnSpeed * dt);
                    continue;
                }

                if (e.type === 'boss' && !e.isEnraged && e.hp / Math.max(1, e.maxHp) <= 0.3) {
                    e.isEnraged = true;
                    e.dmg *= 1.25;
                    e.speed *= 1.15;
                    bus.emit('enemy:enrage', { enemy: e, hpRatio: e.hp / Math.max(1, e.maxHp), damageMultiplier: 1.25, speedMultiplier: 1.15 });
                }

                if (dToP <= 22 && e.leashGraceTimer <= 0 && e.state === 'idle') e.state = 'chase';
                e.angle = Math.atan2(p.z - e.z, p.x - e.x);

                if (e.state === 'idle' && e.leashGraceTimer <= 0 && e.telegraphTimer <= 0 && dToP > 22 && e.homeRoomBounds) {
                    e.wanderPauseTimer = Math.max(0, (Number(e.wanderPauseTimer) || 0) - dt);
                    if (!e.wanderPath && e.wanderPauseTimer <= 0) {
                        var currentGrid = terrain.worldToGrid(e.x, e.z);
                        for (var wanderTry = 0; wanderTry < 12; wanderTry += 1) {
                            var targetGx = Math.floor(rng.range(e.homeRoomBounds.x, e.homeRoomBounds.x + e.homeRoomBounds.width));
                            var targetGz = Math.floor(rng.range(e.homeRoomBounds.z, e.homeRoomBounds.z + e.homeRoomBounds.height));
                            var targetCell = terrain.getCell(targetGx, targetGz);
                            if (!targetCell || targetCell.roomId !== e.homeRoomId || !terrain.isPassable(targetGx, targetGz)) continue;
                            if (Math.hypot(targetGx - currentGrid.gx, targetGz - currentGrid.gz) < 2) continue;
                            e.wanderPath = buildEnemyPath(e, { gx: targetGx, gz: targetGz });
                            if (e.wanderPath && e.wanderPath.length) {
                                e.wanderPathIndex = 0;
                                break;
                            }
                            e.wanderPath = null;
                        }
                        if (!e.wanderPath) e.wanderPauseTimer = rng.range(1.2, 2.8);
                    }
                    if (e.wanderPath) {
                        var wanderPoint = e.wanderPath[e.wanderPathIndex];
                        var wanderDx = wanderPoint.x - e.x;
                        var wanderDz = wanderPoint.z - e.z;
                        var wanderDistance = Math.hypot(wanderDx, wanderDz);
                        if (wanderDistance <= 0.45) {
                            e.wanderPathIndex += 1;
                            if (e.wanderPathIndex >= e.wanderPath.length) {
                                e.wanderPath = null;
                                e.wanderPauseTimer = rng.range(1.2, 2.8);
                            }
                        } else {
                            e.angle = Math.atan2(wanderDz, wanderDx);
                            var wanderSpeed = e.speed * 0.42 * terrain.getMovementMultiplier(e.x, e.z) * (e.weaponSlowFactor || 1);
                            moveEntityXZ(e, wanderDx / wanderDistance * wanderSpeed * dt, wanderDz / wanderDistance * wanderSpeed * dt);
                        }
                    }
                    continue;
                }
                if (e.state !== 'idle') e.wanderPath = null;

                // Distinct boss patterns: aimed necrotic bolts, a marked-area slam,
                // and a summoning ritual. Wind-ups are exposed to the renderer.
                if (e.telegraphTimer > 0) {
                    e.telegraphTimer = Math.max(0, e.telegraphTimer - dt);
                    if (e.telegraphTimer === 0) {
                        var attack = e.pendingAttack;
                        e.pendingAttack = null;
                        e.telegraph = null;
                        if (attack === 'bolt' && !p.isDead) {
                            var aimX = p.x - e.x, aimZ = p.z - e.z;
                            var aimLen = Math.hypot(aimX, aimZ) || 1;
                            fireProjectile({ x: e.x, y: e.y + 1.15, z: e.z }, { x: aimX / aimLen, y: 0, z: aimZ / aimLen }, {
                                owner: e, speed: 13, damage: e.dmg * 0.8 * e.packDamageMultiplier, damageType: 'necrotic', life: 2.0
                            });
                            bus.emit('enemy:ranged-attack', { enemy: e, target: p });
                        } else if ((attack === 'slam' || attack === 'eliteSlam' || attack === 'shieldBash') && !p.isDead) {
                            var slamRadius = e.telegraphRadius || 2.7;
                            var slamDamage = attack === 'eliteSlam' ? 1.2 : (attack === 'shieldBash' ? 1.15 : 1.35);
                            var slamForce = attack === 'shieldBash' ? 3.4 : (attack === 'eliteSlam' ? 2.8 : 2.6);
                            if (Math.hypot(p.x - e.telegraphX, p.z - e.telegraphZ) <= slamRadius + p.radius) {
                                applyDamage({ attacker: e, target: p, rawDamage: e.dmg * slamDamage * e.packDamageMultiplier, damageType: 'crush', knockbackVec3: { x: Math.cos(e.angle) * slamForce, y: 0, z: Math.sin(e.angle) * slamForce } });
                            }
                            terrain.addDebris('crater', e.telegraphX, terrain.getWorldHeightAt(e.telegraphX, e.telegraphZ), e.telegraphZ, attack === 'shieldBash' ? 0.9 : 1.3, attack === 'shieldBash' ? 0x38bdf8 : 0x7f1d1d);
                            if (worldRenderer) worldRenderer.spawnFlashLight({ x: e.telegraphX, y: terrain.getWorldHeightAt(e.telegraphX, e.telegraphZ) + 0.5, z: e.telegraphZ }, attack === 'shieldBash' ? 0x38bdf8 : 0xef4444, 3.0, 8, 0.22);
                            bus.emit('enemy:slam', { enemy: e, x: e.telegraphX, z: e.telegraphZ });
                        } else if (attack === 'summon' && state.enemies.length < 14) {
                            var addX = e.x + rng.range(-2.2, 2.2), addZ = e.z + rng.range(-2.2, 2.2);
                            var addCell = terrain.worldToGrid(addX, addZ);
                            if (terrain.isPassable(addCell.gx, addCell.gz)) {
                                spawnEnemy(ENEMY_TEMPLATES[0], addX, addZ, Math.pow(1.1, Math.max(0, state.floorIndex - 1)));
                            }
                            bus.emit('enemy:summon', { enemy: e });
                        }
                    }
                    continue;
                }

                if (e.attackCooldown > 0) e.attackCooldown = Math.max(0, e.attackCooldown - dt);
                if (e.ranged && dToP <= 12 && dToP > 3.2 && e.attackCooldown <= 0) {
                    e.pendingAttack = 'bolt'; e.telegraphTimer = 0.78; e.attackCooldown = 2.5;
                    e.telegraph = { type: 'bolt', x: e.x, z: e.z, radius: 1.4 };
                } else if (e.summoner && dToP <= 14 && e.attackCooldown <= 0 && state.enemies.length < 14) {
                    e.pendingAttack = 'summon'; e.telegraphTimer = 1.15; e.attackCooldown = 7.5;
                    e.telegraph = { type: 'summon', x: e.x, z: e.z, radius: 2.1 };
                } else if (e.type === 'boss' && !e.ranged && !e.summoner && dToP <= 8 && dToP > 2.2 && e.attackCooldown <= 0) {
                    e.pendingAttack = 'slam'; e.telegraphTimer = 0.95; e.attackCooldown = 3.1;
                    e.telegraphX = p.x; e.telegraphZ = p.z;
                    e.telegraphRadius = 2.7;
                    e.telegraph = { type: 'slam', x: p.x, z: p.z, radius: e.telegraphRadius };
                } else if (e.type === 'elite' && dToP <= 7 && dToP > 2.4 && e.attackCooldown <= 0) {
                    var shieldBash = !!e.armored;
                    e.pendingAttack = shieldBash ? 'shieldBash' : 'eliteSlam';
                    e.telegraphTimer = shieldBash ? 0.82 : 0.64;
                    e.attackCooldown = shieldBash ? 4.6 : 3.9;
                    e.telegraphX = p.x; e.telegraphZ = p.z;
                    e.telegraphRadius = shieldBash ? 2.0 : 2.25;
                    e.telegraph = { type: shieldBash ? 'bash' : 'charge', x: p.x, z: p.z, radius: e.telegraphRadius };
                }

                if (e.telegraphTimer > 0) continue;

                if (e.type !== 'elite' && e.type !== 'boss' && e.type !== 'exploding' &&
                    e.fleeCooldown <= 0 && e.hp / Math.max(1, e.maxHp) <= 0.25 && dToP <= 8) {
                    e.fleeTimer = 2;
                    e.fleeCooldown = 8;
                    e.state = 'flee';
                    bus.emit('enemy:flee', { enemy: e, duration: e.fleeTimer });
                }
                if (e.fleeTimer > 0) {
                    var fleeDx = (e.x - p.x) / (dToP || 1);
                    var fleeDz = (e.z - p.z) / (dToP || 1);
                    e.angle = Math.atan2(fleeDz, fleeDx);
                    var fleeSpeed = e.speed * 1.3 * terrain.getMovementMultiplier(e.x, e.z) * (e.weaponSlowFactor || 1);
                    moveEntityXZ(e, fleeDx * fleeSpeed * dt, fleeDz * fleeSpeed * dt);
                    continue;
                }
                if (e.state === 'flee') e.state = dToP < 22 ? 'chase' : 'idle';

                var desiredRange = e.ranged ? 7.2 : (e.summoner ? 6.0 : 1.1);
                if (e.state === 'chase' && dToP > desiredRange) {
                    var dirX = (p.x - e.x) / dToP;
                    var dirZ = (p.z - e.z) / dToP;
                    e.angle = Math.atan2(dirZ, dirX);
                    var eSpd = e.speed * terrain.getMovementMultiplier(e.x, e.z) * (eHaz ? eHaz.slowFactor : 1.0) * (e.weaponSlowFactor || 1);
                    moveEntityXZ(e, dirX * eSpd * dt, dirZ * eSpd * dt);
                }
                if (dToP <= e.radius + p.radius + 0.15) {
                    if (e.type === 'exploding') {
                        dealAoEDamage3D(e.x, e.y, e.z, 3.0, e.dmg * e.packDamageMultiplier, 'explosive');
                        if (!e.isDead && e.hp > 0) {
                            applyDamage({ attacker: state.player, target: e, rawDamage: e.hp, damageType: 'explosive' });
                        }
                    } else {
                        if (e.attackCooldown <= 0) {
                            e.attackCooldown = 0.85;
                            applyDamage({ attacker: e, target: p, rawDamage: e.dmg * e.packDamageMultiplier, damageType: 'melee' });
                        }
                    }
                }
            }
            state.enemies = state.enemies.filter(function (e) { return !e.isDead && e.hp > 0; });

            // Loot pickup
            for (var li = 0; li < state.loot.length; li++) {
                var l = state.loot[li];
                if (l.picked) continue;
                if (l.type === 'conduit' || l.objectiveId) continue;
                if (l.secretCacheId) {
                    var sealedSecret = (terrain.secretCaches || []).find(function (cache) { return cache.id === l.secretCacheId; });
                    if (!sealedSecret || !sealedSecret.opened) continue;
                }
                var ld = Math.hypot(p.x - l.x, p.z - l.z);
                var lootReachable = !(l.secretCacheId || l.treasureCacheId) || terrain.hasLineOfSight(p, l);
                if (lootReachable && ld < lootMagnetRange) {
                    l.x += ((p.x - l.x) / (ld || 1)) * 7.5 * dt;
                    l.z += ((p.z - l.z) / (ld || 1)) * 7.5 * dt;
                }
                if (lootReachable && ld < 1.0) {
                    l.picked = true;
                    if (l.type === 'weapon') {
                        p.weaponCollection = p.weaponCollection || ['relic-bolt'];
                        if (p.weaponCollection.indexOf(l.weaponId) >= 0) {
                            l.duplicate = true;
                            l.value = 60;
                            p.gold += l.value;
                            state.runGold += l.value;
                        } else {
                            l.duplicate = false;
                            p.weaponCollection.push(l.weaponId);
                            p.weaponId = l.weaponId;
                            l.value = 0;
                            bus.emit('weapon:equipped', { weaponId: p.weaponId, collection: p.weaponCollection.slice() });
                        }
                    } else if (l.type === 'health_orb') {
                        p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.round(p.maxHp * 0.18 * (p.healingEfficiency || 1))));
                    } else if (l.type === 'speed_boost') {
                        p.speedBoostTimer = Math.min(30, p.speedBoostTimer + 18);
                    } else if (l.type === 'damage_boost') {
                        p.damageBoostTimer = Math.min(30, p.damageBoostTimer + 15);
                    } else if (l.type === 'gold_multiplier') {
                        p.goldBoostTimer = Math.min(30, p.goldBoostTimer + 20);
                    } else if (l.type === 'xp_multiplier') {
                        p.xpBoostTimer = Math.min(30, p.xpBoostTimer + 20);
                    } else if (l.type === 'shield_pickup') {
                        p.shieldBubble = Math.min(p.race === 'human' ? 20 : 60, p.shieldBubble + 30);
                        p.shieldCooldown = Math.max(p.shieldCooldown, 3);
                    } else if (l.type === 'rage_potion') {
                        p.rage = Math.min(100, p.rage + 45);
                    } else {
                        p.gold += l.value;
                        state.runGold += l.value;
                    }
                    if (l.treasureCacheId) {
                        var collectedTreasure = (terrain.treasureCaches || []).find(function (cache) { return cache.id === l.treasureCacheId; });
                        if (collectedTreasure && !collectedTreasure.opened) {
                            collectedTreasure.opened = true;
                            bus.emit('world:treasure-cache-opened', { cacheId: collectedTreasure.id });
                        }
                    }
                    if (l.secretCacheId) {
                        var lootedSecret = (terrain.secretCaches || []).find(function (cache) { return cache.id === l.secretCacheId; });
                        if (lootedSecret) lootedSecret.looted = true;
                    }
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
                res = firePlayerWeapon() ? 'attack-fired' : 'attack-cooldown';
            } else if (action === 'melee') {
                res = triggerMeleeSwing() > 0 ? 'melee-hit' : 'melee-miss-or-cooldown';
            } else if (action === 'block') {
                if (p.blockCooldown <= 0) {
                    p.perfectBlockWindow = 0.5;
                    p.blockCooldown = 0.45;
                    res = 'guarded';
                } else {
                    res = 'block-cooldown';
                }
            } else if (action === 'interact') {
                res = interactNearest() ? 'interacted' : 'nothing';
            } else if (action === 'ability') {
                res = 'ability';
            } else if (action === 'wait') {
                p.stamina = Math.min(p.maxStamina, p.stamina + 25);
                res = 'wait';
            }
            // A turn is one deliberate action. Do not replay held keyboard,
            // pointer, joystick, or interaction inputs during the enemy step.
            ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyE', 'KeyF', 'KeyG', 'KeyK', 'KeyV', 'Space'].forEach(function (key) {
                inputState.keys[key] = false;
            });
            inputState.interactPressed = false;
            inputState.mouseDown = false;
            inputState.grenadePressed = false;
            inputState.shovePressed = false;
            inputState.moveX = 0;
            inputState.moveZ = 0;
            p.moveTarget.active = false;
            stepSimulation(0.35);
            state.turnCount++;
            if (cameraRig) cameraRig.update(0.35, p, { x: 0, z: 0 }, inputState.keys);
            if (worldRenderer) worldRenderer.update(0.35, p);
            if (entityRenderer) entityRenderer.sync(state, terrain, 0.35);
            return res;
        }

        function renderFrame() {
            if (threeBundle) {
                var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
                var webglActive = threeBundle.getDiagnostics().webglActive;
                if (webglActive) {
                    if (cameraRig) threeBundle.render(cameraRig.camera);
                } else if (typeof threeBundle.renderFallback === 'function') {
                    threeBundle.renderFallback(state, terrain);
                }
                if (webglActive && t0 > 0) {
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

        function setLootMagnetRange(pixelRange) {
            lootMagnetRange = clamp(Number(pixelRange) || 100, 30, 250) / 24;
            return lootMagnetRange * 24;
        }

        function setWeapon(weaponId) {
            if (!state.player) return null;
            var weapon = getWeapon(weaponId);
            var collection = state.player.weaponCollection || (state.player.weaponCollection = ['relic-bolt']);
            if (collection.indexOf(weapon.id) < 0) return null;
            state.player.weaponId = weapon.id;
            state.fireCooldown = 0;
            bus.emit('weapon:equipped', { weaponId: weapon.id, collection: collection.slice() });
            return weapon;
        }

        function activateBossPhase(bossId, phaseName, addCount, conduitCount) {
            var boss = state.enemies.find(function (enemy) { return enemy.id === bossId && enemy.type === 'boss' && !enemy.isDead; });
            if (!boss) return null;
            var count = Math.max(0, Math.min(6, Math.floor(Number(addCount) || 0)));
            boss.phaseShieldTimer = 1.35;
            boss.phaseShieldRequiresConduit = false;
            boss.bossPhase = String(phaseName || 'WARDEN PHASE');
            boss.pendingAttack = null;
            boss.telegraph = null;
            boss.telegraphTimer = 0;
            var spawned = 0;
            for (var i = 0; i < count; i++) {
                for (var attempt = 0; attempt < 8; attempt++) {
                    var angle = rng.range(0, Math.PI * 2);
                    var radius = rng.range(2.5, 4.5);
                    var ax = boss.x + Math.cos(angle) * radius;
                    var az = boss.z + Math.sin(angle) * radius;
                    var cell = terrain.worldToGrid(ax, az);
                    if (!terrain.isPassable(cell.gx, cell.gz)) continue;
                    spawnEnemy(ENEMY_TEMPLATES[i % 4], ax, az, 1.0 + Math.min(state.floorIndex, 30) * 0.15);
                    spawned++;
                    break;
                }
            }
            var conduits = Math.max(0, Math.min(3, Math.floor(Number(conduitCount) || 0)));
            var conduitsSpawned = 0;
            for (var ci = 0; ci < conduits; ci++) {
                var conduitSpawned = false;
                for (var ca = 0; ca < 12; ca++) {
                    var conduitAngle = (ci / Math.max(1, conduits)) * Math.PI * 2 + rng.range(-0.22, 0.22);
                    var conduitRadius = rng.range(4.8, 6.3);
                    var cx = boss.x + Math.cos(conduitAngle) * conduitRadius;
                    var cz = boss.z + Math.sin(conduitAngle) * conduitRadius;
                    var conduitCell = terrain.worldToGrid(cx, cz);
                    if (!terrain.isPassable(conduitCell.gx, conduitCell.gz)) continue;
                    spawnLoot(cx, cz, 'conduit', 0, { conduitName: 'Array Conduit' });
                    conduitsSpawned++;
                    conduitSpawned = true;
                    break;
                }
                if (!conduitSpawned) {
                    spawnLoot(boss.x, boss.z, 'conduit', 0, { conduitName: 'Array Conduit' });
                    conduitsSpawned++;
                }
            }
            boss.phaseShieldRequiresConduit = conduitsSpawned > 0;
            bus.emit('enemy:boss-phase', { enemy: boss, name: boss.bossPhase, spawned: spawned });
            return { name: boss.bossPhase, spawned: spawned, conduits: conduitsSpawned };
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
            getEnemyCatalog: function () { return ENEMY_TEMPLATES.map(function (enemy) { return Object.assign({}, enemy); }); },
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
            setLootMagnetRange: setLootMagnetRange,
            getWeapon: function () { return getWeapon(state.player ? state.player.weaponId : 'relic-bolt'); },
            setWeapon: setWeapon,
            activateBossPhase: activateBossPhase,
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
            dodgePlayer: dodgePlayer,
            setSeed: function (s) { state.seed = s >>> 0; rng.setSeed(state.seed); critRng.setSeed(state.seed ^ 0x6d2b79f5); luckyDodgeRng.setSeed(state.seed ^ 0x2c1b3c6d); enemyDodgeRng.setSeed(state.seed ^ 0x4f1bbcdc); },
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
                if (threeBundle && !threeBundle.getDiagnostics().webglActive && typeof threeBundle.screenToWorld === 'function') {
                    return threeBundle.screenToWorld(cx, cy, state.player);
                }
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
