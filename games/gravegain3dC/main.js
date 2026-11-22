// GraveGain3DC — Xonotic-inspired Arena FPS (Player, Auto-Battler Roguelite, RTS Squad, 3 Maps)
import { MAPS, MAP_LIST } from './maps.js';
import { createWeaponView } from './weapon-view.js';
import { createBotComms } from './bot-comms.js';
import { createBotModels } from './bot-models.js';
import { findCover, lineBlocked } from './squad-tactics.js';
import * as BABYLON from './vendor/babylon-arena.js';

const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true });

const GRAVITY = 28;
const PLAYER_RADIUS = 0.55;
const PLAYER_HEIGHT = 2.0;
const BOT_RADIUS = 0.55;
const BOT_HEIGHT = 2.2;

const WEAPONS = [
    { name: 'DEVASTATOR', speed: 52, color: new BABYLON.Color3(1, 0.45, 0.1), splash: 8, damage: 70, cooldown: 0.6, sound: [155, .18, "sawtooth"], hudColor: "#ff8235" },
    { name: 'VORTEX', speed: 165, color: new BABYLON.Color3(0, 0.95, 1), splash: 0, damage: 90, cooldown: 0.85, sound: [850, .15, "triangle"], hudColor: "#3af4ff" },
    { name: 'SHOTGUN', speed: 90, color: new BABYLON.Color3(1, 0.85, 0.2), splash: 0, damage: 50, cooldown: 0.48, sound: [105, .12, "square"], hudColor: "#ffdb59" },
    { name: 'ELECTRO', speed: 68, color: new BABYLON.Color3(0.7, 0.3, 1), splash: 3.5, damage: 26, cooldown: 0.13, sound: [430, .07, "sine"], hudColor: "#ca8bff" }
];

// Lightweight Web Audio synth for Xonotic-style SFX
const audioCtx = typeof AudioContext !== 'undefined' ? new AudioContext() : null;
function playSfx(freq, dur = 0.08, type = 'sawtooth', vol = 0.06) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.35), audioCtx.currentTime + dur);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
}

const SAVE_KEY = 'gravegain3dc_roguelite_v1';
const MAP_KEY = 'gravegain3dc_map_v1';

const defaultUpgrades = () => ({
    scrap: 0,
    reflexes: 0,
    aim: 0,
    tactics: 0,
    maxHp: 0,
    regen: 0,
    speed: 0,
    jump: 0,
    fireRate: 0,
    damage: 0,
    scrapGain: 0
});
let upgrades = defaultUpgrades();
try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved) upgrades = { ...upgrades, ...saved };
} catch { /* ignore */ }
const saveUpgrades = () => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(upgrades)); } catch { /* ignore */ }
};

let selectedMapId = MAP_LIST[0].id;
try {
    const savedMap = localStorage.getItem(MAP_KEY);
    if (savedMap && MAPS[savedMap]) selectedMapId = savedMap;
} catch { /* ignore */ }

const frameBlend = (blendAt60Fps, dt) => 1 - Math.pow(1 - blendAt60Fps, dt * 60);

const toColor3 = ([r, g, b]) => new BABYLON.Color3(r, g, b);

function createScene() {
    const scene = new BABYLON.Scene(engine);
    const glow = new BABYLON.GlowLayer('arena-glow', scene, { mainTextureRatio: 0.5 });
    glow.intensity = 0.28;
    const projectileMaterials = new Map();
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;

    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    const dirLight = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-0.4, -1, -0.3), scene);

    const camera = new BABYLON.UniversalCamera('playerCam', new BABYLON.Vector3(0, 24, -44), scene);
    camera.minZ = 0.1;
    camera.fov = 1.05;

    const weaponView = createWeaponView(scene, camera, WEAPONS);
    const buildBotModel = createBotModels(scene);
    const comms = createBotComms();

    // Squad rally marker
    const rallyMarker = BABYLON.MeshBuilder.CreateTorus('rallyMarker', { diameter: 3.2, thickness: 0.25, tessellation: 24 }, scene);
    const rallyMat = new BABYLON.StandardMaterial('rallyMat', scene);
    rallyMat.diffuseColor = new BABYLON.Color3(0, 1, 0.75);
    rallyMat.emissiveColor = new BABYLON.Color3(0, 0.85, 0.65);
    rallyMarker.material = rallyMat;
    rallyMarker.isPickable = false;
    rallyMarker.isVisible = false;

    let currentMap = MAPS[selectedMapId];
    const mapMeshes = [];
    const mapMaterials = [];
    const solidBlocks = [];

    function makeMaterial(name, diffuseArr, emissiveArr) {
        const mat = new BABYLON.StandardMaterial(name, scene);
        mat.diffuseColor = toColor3(diffuseArr);
        mat.emissiveColor = toColor3(emissiveArr);
        mapMaterials.push(mat);
        return mat;
    }

    function updateMapSelectionUI() {
        document.getElementById('map-label').textContent = `MAP: ${currentMap.name}`;
        document.querySelectorAll('.map-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.mapId === currentMap.id);
        });
    }

    function loadMap(mapId) {
        const nextMap = MAPS[mapId] || MAP_LIST[0];
        selectedMapId = nextMap.id;
        currentMap = nextMap;
        try { localStorage.setItem(MAP_KEY, selectedMapId); } catch { /* ignore */ }

        while (mapMeshes.length) mapMeshes.pop().dispose();
        while (mapMaterials.length) mapMaterials.pop().dispose();
        solidBlocks.length = 0;

        const [cr, cg, cb, ca] = currentMap.clearColor;
        scene.clearColor = new BABYLON.Color4(cr, cg, cb, ca);
        scene.fogColor = toColor3(currentMap.fogColor);
        scene.fogDensity = currentMap.fogDensity;

        hemi.diffuse = toColor3(currentMap.hemiColor);
        hemi.intensity = currentMap.hemiIntensity;
        dirLight.diffuse = toColor3(currentMap.dirColor);
        dirLight.intensity = currentMap.dirIntensity;

        if (currentMap.hasFloor) {
            const floor = BABYLON.MeshBuilder.CreateGround('floor', { width: currentMap.floorSize, height: currentMap.floorSize }, scene);
            floor.material = makeMaterial('floorMat', currentMap.floorColor, currentMap.floorEmissive);
            floor.isPickable = true;
            mapMeshes.push(floor);
        }

        const mats = {
            primary: makeMaterial('matPrimary', currentMap.palette.primary, currentMap.palette.primaryEmissive),
            platform: makeMaterial('matPlatform', currentMap.palette.platform, currentMap.palette.platformEmissive),
            trim: makeMaterial('matTrim', currentMap.palette.trim, currentMap.palette.trimEmissive),
            pad: makeMaterial('matPad', currentMap.palette.pad, currentMap.palette.padEmissive)
        };

        currentMap.blocks.forEach((b, idx) => {
            const box = BABYLON.MeshBuilder.CreateBox(`blk_${idx}`, { width: b.w, height: b.h, depth: b.d }, scene);
            box.position.set(b.x, b.y, b.z);
            box.material = mats[b.style] || mats.primary;
            const isSolid = b.solid !== false;
            box.isPickable = isSolid;
            mapMeshes.push(box);

            if (isSolid) {
                solidBlocks.push({
                    x: b.x, y: b.y, z: b.z,
                    w: b.w, h: b.h, d: b.d,
                    minX: b.x - b.w / 2, maxX: b.x + b.w / 2,
                    minY: b.y - b.h / 2, maxY: b.y + b.h / 2,
                    minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2
                });
            }
        });

        currentMap.jumpPads.forEach((pad, idx) => {
            const cyl = BABYLON.MeshBuilder.CreateCylinder(`pad_${idx}`, { diameter: pad.radius * 1.7, height: 0.35 }, scene);
            cyl.position.set(pad.x, pad.y + 0.18, pad.z);
            cyl.material = mats.pad;
            cyl.isPickable = false;
            mapMeshes.push(cyl);
        });

        updateMapSelectionUI();
    }

    // Build Map Selector UI once on startup
    const mapSelectorEl = document.getElementById('map-selector');
    MAP_LIST.forEach(map => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'map-card';
        card.dataset.mapId = map.id;
        card.style.setProperty('--map-accent', map.accent);
        card.style.setProperty('--map-glow', `${map.accent}55`);
        card.innerHTML = `<div class="map-card-title">${map.name}</div><div class="map-card-tagline">${map.tagline}</div>`;
        card.addEventListener('click', () => loadMap(map.id));
        mapSelectorEl.appendChild(card);
    });

    // Game state
    let mode = 'menu'; // 'menu' | 'player' | 'autobattler' | 'rts'
    let menuAngle = 0;
    const rallyPoint = new BABYLON.Vector3(0, 0, 0);
    const autoUpgrade = (team, key) => (mode === 'autobattler' && team === 'friendly') ? upgrades[key] : 0;

    const player = {
        pos: new BABYLON.Vector3(0, 0, -34),
        vel: new BABYLON.Vector3(0, 0, 0),
        grounded: true,
        padCooldown: 0,
        padFlightTimer: 0,
        hp: 100,
        score: 0,
        weaponIdx: 0,
        fireTimer: 0,
        dashTimer: 0
    };

    const friendlies = [];
    const enemies = [];
    const projectiles = [];
    const voxelDebris = [];
    const salvage = [];
    const salvageMat = new BABYLON.StandardMaterial('salvage', scene);
    salvageMat.emissiveColor = new BABYLON.Color3(1, .72, .12);
    let scrap = 0;
    let squadHolding = false;

    function dropScrap(position) {
        let surface = currentMap.hasFloor ? 0 : -Infinity;
        for (const block of solidBlocks) {
            if (position.x >= block.minX && position.x <= block.maxX &&
                position.z >= block.minZ && position.z <= block.maxZ && block.maxY < position.y - .2) {
                surface = Math.max(surface, block.maxY);
            }
        }
        if (!currentMap.hasFloor && !Number.isFinite(surface)) return;
        const mesh = BABYLON.MeshBuilder.CreateTorus('scrap pickup', {
            diameter: .68, thickness: .17, tessellation: 6
        }, scene);
        mesh.position.copyFrom(position);
        if (Number.isFinite(surface)) mesh.position.y = surface + .85;
        mesh.material = salvageMat;
        mesh.isPickable = false;
        salvage.push({ mesh, y: mesh.position.y, age: 0 });
        if (salvage.length > 32) salvage.shift().mesh.dispose();
    }

    function updateScrap(dt) {
        for (let i = salvage.length - 1; i >= 0; i--) {
            const item = salvage[i];
            item.age += dt;
            item.mesh.position.y = item.y + Math.sin(item.age * 4) * .24;
            item.mesh.rotation.set(item.age * 1.8, item.age * 2.4, .4);
            const collected = BABYLON.Vector3.Distance(camera.position, item.mesh.position) < 2.2;
            if (collected) {
                scrap++;
                playSfx(780, .13, 'triangle', .05);
            }
            if (collected || item.age >= 30) {
                item.mesh.dispose();
                salvage.splice(i, 1);
            }
        }
    }

    function fractureBot(bot, damage, impact, blast) {
        if (!(damage > 0)) return;
        bot.hp -= damage;
        bot.mesh.computeWorldMatrix(true);
        const cells = bot.voxels.map(cell => {
            cell.computeWorldMatrix(true);
            return { cell, distance: BABYLON.Vector3.DistanceSquared(cell.getAbsolutePosition(), impact) };
        });
        cells.sort((a, b) => a.distance - b.distance);
        const count = bot.hp <= 0 ? cells.length : Math.min(cells.length - 1,
            Math.max(1, Math.ceil(cells.length * Math.min(0.45, damage / bot.maxHp) * (blast ? 0.85 : 0.55))));
        const removed = new Set();
        for (let i = 0; i < count; i++) {
            const { cell } = cells[i];
            cell.setParent(null);
            const velocity = cell.position.subtract(impact);
            const length = velocity.length();
            if (length > 0) velocity.scaleInPlace((blast ? 13 : 5) / length);
            velocity.y += 3 + Math.random() * 4;
            voxelDebris.push({ cell, velocity, size: cell.scaling.clone(), life: 0.65 + Math.random() * 0.35 });
            removed.add(cell);
        }
        bot.voxels = bot.voxels.filter(cell => !removed.has(cell));
        while (voxelDebris.length > 128) voxelDebris.shift().cell.dispose();
    }

    function updateVoxelDebris(dt) {
        for (let i = voxelDebris.length - 1; i >= 0; i--) {
            const chunk = voxelDebris[i];
            chunk.life -= dt;
            if (chunk.life <= 0) {
                chunk.cell.dispose();
                voxelDebris.splice(i, 1);
                continue;
            }
            chunk.velocity.y -= GRAVITY * dt;
            chunk.cell.position.addInPlace(chunk.velocity.scale(dt));
            chunk.cell.rotation.x += 5 * dt;
            chunk.cell.rotation.z += 3 * dt;
            chunk.size.scaleToRef(Math.min(1, chunk.life * 5), chunk.cell.scaling);
        }
    }

    function pickSpawn(list, idx = null) {
        const arr = list && list.length ? list : [[0, 0, 0]];
        return arr[idx !== null ? idx % arr.length : Math.floor(Math.random() * arr.length)];
    }

    function createBot(team, spawnCoord, melee = false) {
        const [sx, sy, sz] = spawnCoord;
        const mesh = new BABYLON.TransformNode(team + (melee ? ' melee bot' : ' ranged bot'), scene);
        mesh.position.set(sx, sy + 1.1, sz);
        const maxHp = 100 + autoUpgrade(team, 'maxHp') * 25 - (team === 'friendly' ? 0 : 10);
        return {
            team,
            mesh,
            voxels: buildBotModel(mesh, team, melee),
            melee,
            windup: 0,
            rank: 0,
            cover: null,
            coverTimer: 0,
            hurtTimer: 0,
            action: 'Following',
            pos: new BABYLON.Vector3(sx, sy, sz),
            vel: new BABYLON.Vector3(0, 0, 0),
            hp: maxHp,
            maxHp,
            gaitPhase: 0,
            fireTimer: Math.random() * 0.5,
            strafeDir: Math.random() < 0.5 ? 1 : -1,
            strafeTimer: 0.6 + Math.random() * 0.8,
            jumpTimer: 0.5 + Math.random() * 1.2,
            grounded: true,
            padCooldown: 0,
            padFlightTimer: 0,
            lives: 3
        };
    }

    function respawnBot(bot) {
        const list = bot.team === 'friendly' ? currentMap.friendlySpawns : currentMap.enemySpawns;
        const [sx, sy, sz] = pickSpawn(list, mode === 'player' && bot.team === 'friendly' ? friendlies.indexOf(bot) + 1 : null);
        bot.hp = bot.maxHp;
        bot.voxels.forEach(cell => cell.dispose());
        bot.voxels = buildBotModel(bot.mesh, bot.team, bot.melee);
        bot.windup = 0;
        bot.cover = null;
        bot.coverTimer = bot.hurtTimer = 0;
        bot.gaitPhase = 0;
        bot.mesh.rotation.set(0, 0, 0);
        bot.mesh.scaling.setAll(1);
        bot.pos.set(sx, sy, sz);
        bot.vel.set(0, 0, 0);
        bot.grounded = true;
        bot.padCooldown = 0;
        bot.padFlightTimer = 0;
        bot.mesh.position.set(sx, sy + 1.1, sz);
    }

    function respawnPlayer() {
        const [px, py, pz] = currentMap.playerSpawn;
        player.pos.set(px, py, pz);
        player.vel.set(0, 0, 0);
        player.grounded = true;
        player.padCooldown = 0;
        player.padFlightTimer = 0;
        player.hp = 100;
        camera.position.set(px, py + PLAYER_HEIGHT, pz);
    }

    function clearEntities() {
        friendlies.forEach(b => b.mesh.dispose());
        enemies.forEach(b => b.mesh.dispose());
        projectiles.forEach(p => p.mesh.dispose());
        voxelDebris.forEach(chunk => chunk.cell.dispose());
        voxelDebris.length = 0;
        salvage.forEach(item => item.mesh.dispose());
        salvage.length = 0;
        friendlies.length = 0;
        enemies.length = 0;
        projectiles.length = 0;
    }

    function spawnEnemyWave(count = 5) {
        for (let i = 0; i < count; i++) {
            enemies.push(createBot('enemy', pickSpawn(currentMap.enemySpawns, i), i % 3 === 1));
        }
    }

    // Shared map AABB collision, jump pad & hazard physics (pos = entity feet)
    function moveEntityWithMap(pos, vel, radius, height, dt, entityState) {
        // 1. Horizontal movement + wall/block AABB pushout
        pos.x += vel.x * dt;
        pos.z += vel.z * dt;

        for (const b of solidBlocks) {
            if (pos.y + height > b.minY && pos.y + 0.45 < b.maxY) {
                const halfW = b.w / 2 + radius;
                const halfD = b.d / 2 + radius;
                const dx = pos.x - b.x;
                const dz = pos.z - b.z;
                const ox = halfW - Math.abs(dx);
                const oz = halfD - Math.abs(dz);
                if (ox > 0 && oz > 0) {
                    if (ox < oz) {
                        pos.x += dx >= 0 ? ox : -ox;
                        vel.x = 0;
                    } else {
                        pos.z += dz >= 0 ? oz : -oz;
                        vel.z = 0;
                    }
                }
            }
        }

        // 2. Vertical movement + floor/platform landing + ceiling clamp
        const prevY = pos.y;
        pos.y += vel.y * dt;
        let supportY = currentMap.hasFloor ? 0 : -Infinity;

        for (const b of solidBlocks) {
            if (Math.abs(pos.x - b.x) < b.w / 2 + radius * 0.85 &&
                Math.abs(pos.z - b.z) < b.d / 2 + radius * 0.85) {
                if (vel.y <= 0 && prevY >= b.maxY - 0.55 && pos.y <= b.maxY) {
                    supportY = Math.max(supportY, b.maxY);
                } else if (vel.y > 0 && prevY + height <= b.minY + 0.3 && pos.y + height >= b.minY) {
                    pos.y = b.minY - height;
                    vel.y = 0;
                }
            }
        }

        if (pos.y <= supportY) {
            pos.y = supportY;
            vel.y = 0;
            entityState.grounded = true;
            entityState.padFlightTimer = 0;
        } else {
            entityState.grounded = false;
        }

        pos.x = Math.max(-currentMap.halfBound, Math.min(currentMap.halfBound, pos.x));
        pos.z = Math.max(-currentMap.halfBound, Math.min(currentMap.halfBound, pos.z));

        // 3. Jump pads
        let jumpedPad = false;
        entityState.padCooldown = Math.max(0, (entityState.padCooldown || 0) - dt);
        if (entityState.padCooldown <= 0) {
            for (const pad of currentMap.jumpPads) {
                if (Math.hypot(pos.x - pad.x, pos.z - pad.z) < pad.radius && Math.abs(pos.y - pad.y) < 1.2) {
                    if (pad.vx !== 0 || pad.vz !== 0) {
                        vel.x = pad.vx;
                        vel.z = pad.vz;
                        entityState.padFlightTimer = 0.95;
                    }
                    vel.y = pad.vy;
                    entityState.grounded = false;
                    entityState.padCooldown = 0.28;
                    jumpedPad = true;
                    break;
                }
            }
        }

        // 4. Hazards (e.g. magma channels)
        let hazardDmg = 0;
        for (const hz of currentMap.hazards) {
            if (Math.abs(pos.x - hz.x) < hz.w / 2 && Math.abs(pos.z - hz.z) < hz.d / 2 && pos.y <= hz.maxY) {
                hazardDmg += hz.dps * dt;
                vel.y = Math.max(vel.y, hz.bounceVy);
                entityState.grounded = false;
            }
        }

        const fellInVoid = currentMap.voidY !== null && pos.y < currentMap.voidY;
        return { jumpedPad, hazardDmg, fellInVoid };
    }

    function hasSurfaceBelow(x, z, footY) {
        if (currentMap.hasFloor) return true;
        for (const b of solidBlocks) {
            if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && b.maxY <= footY + 0.6) {
                return true;
            }
        }
        return false;
    }

    function findDeckCenter(x, z, footY) {
        let best = null;
        let bestArea = -1;
        for (const b of solidBlocks) {
            if (x >= b.minX - 0.8 && x <= b.maxX + 0.8 && z >= b.minZ - 0.8 && z <= b.maxZ + 0.8 && Math.abs(b.maxY - footY) < 0.8) {
                const area = b.w * b.d;
                if (area > bestArea) {
                    bestArea = area;
                    best = b;
                }
            }
        }
        return best ? { x: best.x, z: best.z } : { x: 0, z: 0 };
    }

    function isInsideHazard(x, z, footY) {
        for (const hz of currentMap.hazards) {
            if (Math.abs(x - hz.x) < hz.w / 2 + 0.4 && Math.abs(z - hz.z) < hz.d / 2 + 0.4 && footY <= hz.maxY + 0.6) {
                return true;
            }
        }
        return false;
    }

    // UI Elements
    const overlay = document.getElementById('overlay');
    const upgradeModal = document.getElementById('upgrade-modal');
    const rtsBar = document.getElementById('rts-bar');
    const rtsAddBtn = document.getElementById('rts-add-bot');
    const rtsHint = document.getElementById('rts-hint');
    const livesBox = document.getElementById('lives-box');
    const mobileControls = document.getElementById('mobile-controls');
    const crosshair = document.getElementById('crosshair');

    function startMode(newMode) {
        loadMap(selectedMapId);
        clearHeldInput();
        comms.reset();
        mode = newMode;
        weaponView.setVisible(mode === 'player');
        player.fireTimer = 0;
        scrap = 0;
        squadHolding = false;
        squadOrderLabel.setAttribute('aria-pressed', 'false');
        squadHud.classList.toggle('hidden', mode !== 'player');
        weaponSwitch.classList.toggle('hidden', mode !== 'player');
        clearEntities();
        overlay.classList.add('hidden');
        upgradeModal.classList.add('hidden');
        player.score = 0;
        respawnPlayer();

        document.getElementById('mode-label').textContent = `MODE: ${newMode.toUpperCase()}`;
        rtsBar.classList.toggle('hidden', newMode !== 'rts');
        livesBox.classList.toggle('hidden', newMode !== 'autobattler');
        mobileControls.classList.toggle('active', newMode === 'player');
        crosshair.classList.toggle('hidden', newMode !== 'player');
        rallyMarker.isVisible = newMode === 'rts';

        if (newMode === 'player') {
            camera.rotation.set(0, 0, 0);
            camera.fov = 1.05;
            for (let i = 0; i < 2; i++) {
                friendlies.push(createBot('friendly', pickSpawn(currentMap.friendlySpawns, i + 1)));
            }
            spawnEnemyWave(5);
            lockPointer();
        } else if (newMode === 'autobattler') {
            camera.fov = 1.05;
            const hero = createBot('friendly', pickSpawn(currentMap.friendlySpawns, 0));
            hero.lives = 3;
            friendlies.push(hero);
            spawnEnemyWave(5);
        } else if (newMode === 'rts') {
            rtsHint.textContent = 'Click or tap the floor to rally your squad';
            camera.fov = 1.05;
            const [rx, ry, rz] = currentMap.playerSpawn;
            rallyPoint.set(rx, ry, rz);
            rallyMarker.position.set(rx, ry + 0.15, rz);
            for (let i = 0; i < 4; i++) {
                friendlies.push(createBot('friendly', pickSpawn(currentMap.friendlySpawns, i)));
            }
            rtsAddBtn.textContent = `+ ADD BOT (${friendlies.length})`;
            spawnEnemyWave(6);
            camera.position.set(...currentMap.rtsCamera.pos);
            camera.setTarget(new BABYLON.Vector3(...currentMap.rtsCamera.target));
        }
    }

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => startMode(btn.dataset.mode));
    });

    document.getElementById('menu-btn').addEventListener('click', () => {
        clearHeldInput();
        mode = 'menu';
        comms.reset();
        weaponView.setVisible(false);
        squadHud.classList.add('hidden');
        rtsBar.classList.add('hidden');
        livesBox.classList.add('hidden');
        weaponSwitch.classList.add('hidden');
        crosshair.classList.add('hidden');
        mobileControls.classList.remove('active');
        rallyMarker.isVisible = false;
        clearEntities();
        if (document.pointerLockElement === canvas) document.exitPointerLock?.();
        overlay.classList.remove('hidden');
        upgradeModal.classList.add('hidden');
    });

    rtsAddBtn.addEventListener('click', () => {
        if (mode !== 'rts') return;
        friendlies.push(createBot('friendly', pickSpawn(currentMap.friendlySpawns, friendlies.length)));
        rtsAddBtn.textContent = `+ ADD BOT (${friendlies.length})`;
    });

    // Roguelite Upgrade Shop (10 upgrades)
    const UPGRADE_DEFS = [
        { key: 'reflexes', label: 'Reflexes (Dodge)', baseCost: 2 },
        { key: 'aim', label: 'Aim (Accuracy)', baseCost: 2 },
        { key: 'tactics', label: 'Tactics (Positioning)', baseCost: 3 },
        { key: 'maxHp', label: 'Max HP (+25)', baseCost: 3 },
        { key: 'regen', label: 'HP Regen', baseCost: 4 },
        { key: 'speed', label: 'Strafe Speed', baseCost: 3 },
        { key: 'jump', label: 'Bunny-Hop Boost', baseCost: 3 },
        { key: 'fireRate', label: 'Fire Rate', baseCost: 4 },
        { key: 'damage', label: 'Weapon Damage', baseCost: 4 },
        { key: 'scrapGain', label: 'Scrap Bonus', baseCost: 5 }
    ];

    function openUpgradeShop() {
        clearHeldInput();
        mode = 'menu';
        comms.reset();
        livesBox.classList.add('hidden');
        rallyMarker.isVisible = false;
        clearEntities();
        upgradeModal.classList.remove('hidden');
        document.getElementById('scrap-val').textContent = upgrades.scrap;
        const list = document.getElementById('upgrade-list');
        list.innerHTML = '';
        UPGRADE_DEFS.forEach(def => {
            const lvl = upgrades[def.key];
            const cost = def.baseCost + lvl * 2;
            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `<strong>${def.label}</strong><span>Level ${lvl}</span><button ${upgrades.scrap < cost ? 'disabled' : ''}>Upgrade (${cost} Scrap)</button>`;
            card.querySelector('button').addEventListener('click', () => {
                if (upgrades.scrap >= cost) {
                    upgrades.scrap -= cost;
                    upgrades[def.key]++;
                    saveUpgrades();
                    openUpgradeShop();
                }
            });
            list.appendChild(card);
        });
    }

    document.getElementById('next-run-btn').addEventListener('click', () => startMode('autobattler'));

    // Input
    const keys = {};
    const touchMove = { x: 0, y: 0 };
    const coarsePointer = matchMedia('(pointer: coarse)');
    let firing = false;

    function lockPointer() {
        if (coarsePointer.matches) return;
        try { canvas.requestPointerLock?.()?.catch?.(() => {}); } catch { /* Pointer lock may be unavailable. */ }
    }

    function clearHeldInput() {
        for (const key of Object.keys(keys)) keys[key] = false;
        touchMove.x = touchMove.y = 0;
        firing = false;
    }
    window.addEventListener('blur', clearHeldInput);
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement !== canvas) clearHeldInput();
    });

    function bindTouch(element, update, release) {
        let active = null;
        element.addEventListener('pointerdown', event => {
            if (event.pointerType !== 'touch' || active !== null || mode !== 'player') return;
            event.preventDefault();
            active = event.pointerId;
            element.setPointerCapture(active);
            update(event, true);
        });
        element.addEventListener('pointermove', event => {
            if (event.pointerId === active && mode === 'player') update(event, false);
        });
        element.addEventListener('lostpointercapture', event => {
            if (event.pointerId !== active) return;
            active = null;
            release();
        });
    }

    const stick = document.getElementById('touch-move');
    bindTouch(stick, event => {
        const bounds = stick.getBoundingClientRect();
        const x = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width * 0.4);
        const y = (bounds.top + bounds.height / 2 - event.clientY) / (bounds.height * 0.4);
        const scale = Math.max(1, Math.hypot(x, y));
        touchMove.x = x / scale;
        touchMove.y = y / scale;
    }, () => { touchMove.x = touchMove.y = 0; });

    let lastLook;
    bindTouch(canvas, (event, start) => {
        if (!start) turnCamera(event.clientX - lastLook.x, event.clientY - lastLook.y, 0.005);
        lastLook = { x: event.clientX, y: event.clientY };
    }, () => { lastLook = null; });
    for (const [id, key] of [['btn-jump', 'Space'], ['btn-dash', 'ShiftLeft']]) {
        bindTouch(document.getElementById(id), () => { keys[key] = true; }, () => { keys[key] = false; });
    }
    bindTouch(document.getElementById('btn-fire'), () => { firing = true; }, () => { firing = false; });

    function turnCamera(dx, dy, sensitivity) {
        camera.rotation.y += dx * sensitivity;
        camera.rotation.x = Math.max(-1.45, Math.min(1.45, camera.rotation.x + dy * sensitivity));
    }
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Digit1') player.weaponIdx = 0;
        if (e.code === 'Digit2') player.weaponIdx = 1;
        if (e.code === 'Digit3') player.weaponIdx = 2;
        if (e.code === 'Digit4') player.weaponIdx = 3;
        if (!e.repeat && e.code === 'KeyQ') commandSquad();
        if (!e.repeat && e.code === 'KeyE') upgradeCompanion();
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });

    window.addEventListener('mousemove', (e) => {
        if (mode !== 'player' || document.pointerLockElement !== canvas) return;
        turnCamera(e.movementX, e.movementY, 0.0022);
    });

    function spawnProjectile(origin, dir, weapon, ownerTeam, fromPlayer = false, power = 1) {
        const proj = BABYLON.MeshBuilder.CreateSphere('proj', { diameter: 0.36 }, scene);
        proj.position = origin.clone();
        proj.isPickable = false;
        if (!projectileMaterials.has(weapon)) {
            const mat = new BABYLON.StandardMaterial('projectile-' + weapon.name, scene);
            mat.emissiveColor = weapon.color;
            mat.disableLighting = true;
            projectileMaterials.set(weapon, mat);
        }
        proj.material = projectileMaterials.get(weapon);
        proj.scaling.z = weapon.speed > 100 ? 5 : 2;
        proj.lookAt(origin.add(dir));
        const dmgMult = 1 + autoUpgrade(ownerTeam, 'damage') * 0.15;
        projectiles.push({ mesh: proj, vel: dir.scale(weapon.speed), weapon, damage: weapon.damage * dmgMult * power, ownerTeam, fromPlayer, life: 2.4 });
    }

    const shotgunPellet = { ...WEAPONS[2], damage: WEAPONS[2].damage / 3 };

    function firePlayerWeapon() {
        if (player.fireTimer > 0) return;
        const weapon = WEAPONS[player.weaponIdx];
        player.fireTimer = weapon.cooldown;
        player.fireCycle = weapon.cooldown;
        weaponView.fire(player.weaponIdx);
        const forward = camera.getDirection(BABYLON.Axis.Z).normalize();
        const origin = camera.position.add(forward.scale(1.2));
        if (player.weaponIdx === 2) {
            const right = camera.getDirection(BABYLON.Axis.X);
            for (let pellet = -2; pellet <= 2; pellet++) {
                const direction = forward.add(right.scale(pellet * 0.045)).normalize();
                spawnProjectile(origin, direction, shotgunPellet, 'friendly', true);
            }
        } else {
            spawnProjectile(origin, forward, weapon, 'friendly', true);
        }
        playSfx(weapon.sound[0], weapon.sound[1], weapon.sound[2], .07);
    }

    window.addEventListener('mouseup', e => { if (e.button === 0) firing = false; });
    window.addEventListener('mousedown', (e) => {
        if (e.target !== canvas && document.pointerLockElement !== canvas) return;
        if (mode === 'player' && e.button === 0) {
            if (document.pointerLockElement !== canvas) {
                lockPointer();
            }
            firing = true;
            firePlayerWeapon();
        }
    });

    canvas.addEventListener('pointerdown', e => {
        if (mode !== 'rts' || e.button !== 0) return;
        const rect = canvas.getBoundingClientRect();
        const pick = scene.pick(e.clientX - rect.left, e.clientY - rect.top);
        if (!pick?.hit || !pick.pickedPoint) return;
        rallyPoint.copyFrom(pick.pickedPoint);
        rallyMarker.position.set(rallyPoint.x, rallyPoint.y + 0.15, rallyPoint.z);
        rtsHint.textContent = 'Squad rally point set';
    });

    function handleEnemyDeath(enemy) {
        player.score++;
        if (mode === 'player') {
            dropScrap(enemy.mesh.position);
            playSfx(1040, .12, 'triangle', .07);
        }
        if (mode === 'autobattler') {
            upgrades.scrap += 1 + upgrades.scrapGain;
            saveUpgrades();
        }
        respawnBot(enemy);
    }

    function handleFriendlyDeath(bot) {
        if (mode === 'autobattler') {
            bot.lives--;
            if (bot.lives <= 0) {
                openUpgradeShop();
                return true;
            }
        }
        respawnBot(bot);
        return false;
    }

    function commandSquad() {
        if (mode !== 'player') return;
        squadHolding = !squadHolding;
        squadOrderLabel.setAttribute('aria-pressed', String(squadHolding));
        if (squadHolding) rallyPoint.copyFrom(player.pos);
        rallyMarker.position.copyFrom(rallyPoint);
        rallyMarker.position.y += .15;
        rallyMarker.isVisible = squadHolding;
        for (const bot of friendlies) {
            bot.cover = null;
            bot.coverTimer = 0;
        }
        comms.say(squadHolding ? 'hold' : 'follow', 'friendly');
        playSfx(squadHolding ? 520 : 690, .12, 'triangle', .05);
    }

    function aimedCompanion() {
        const forward = camera.getDirection(BABYLON.Axis.Z);
        let target = null;
        let bestAim = .92;
        for (const bot of friendlies) {
            const offset = bot.mesh.position.subtract(camera.position);
            const distance = offset.length();
            if (distance < .01 || distance > 6 || lineBlocked(camera.position, bot.mesh.position, solidBlocks)) continue;
            const aim = BABYLON.Vector3.Dot(forward, offset.scale(1 / distance));
            if (aim > bestAim) {
                bestAim = aim;
                target = bot;
            }
        }
        return target;
    }

    const MAX_COMPANION_RANK = 3;
    const rankCost = bot => 2 + bot.rank * 2;

    function upgradeCompanion() {
        if (mode !== 'player') return;
        const bot = aimedCompanion();
        if (!bot || bot.rank >= MAX_COMPANION_RANK || scrap < rankCost(bot)) return;
        scrap -= rankCost(bot);
        bot.rank++;
        bot.maxHp += 25;
        bot.hp = bot.maxHp;
        comms.say('upgrade', 'friendly');
        playSfx(960, .22, 'triangle', .07);
    }

    function setText(element, text) {
        if (element.textContent !== text) element.textContent = text;
    }

    function updateSquadHud() {
        setText(fieldScrap, String(scrap));
        setText(squadOrder, squadHolding ? 'Hold position' : 'Follow');
        for (const [i, bot] of friendlies.entries()) {
            setText(squadStatus[i], `Bot ${i + 1} · Rank ${bot.rank} · ${Math.ceil(bot.hp)} HP · ${bot.action}`);
        }
        const target = aimedCompanion();
        interactPrompt.classList.toggle('hidden', !target);
        if (target) {
            const name = `Bot ${friendlies.indexOf(target) + 1}`;
            setText(interactText, target.rank >= MAX_COMPANION_RANK ? `${name} · Max rank`
                : `${name} · Upgrade for ${rankCost(target)} scrap`);
            interactPrompt.disabled = target.rank >= MAX_COMPANION_RANK || scrap < rankCost(target);
        }
    }

    function safeFooting(x, y, z) {
        if (Math.abs(x) > currentMap.halfBound - 1 || Math.abs(z) > currentMap.halfBound - 1 ||
            isInsideHazard(x, z, y)) return false;
        return (currentMap.hasFloor && Math.abs(y) < .8) || solidBlocks.some(block =>
            Math.abs(block.maxY - y) < .8 &&
            x >= block.minX + .35 && x <= block.maxX - .35 &&
            z >= block.minZ + .35 && z <= block.maxZ - .35);
    }

    function canTakeCoverRoute(from, to) {
        if (lineBlocked(from, to, solidBlocks, BOT_RADIUS)) return false;
        const distance = Math.hypot(to.x - from.x, to.z - from.z);
        const steps = Math.max(1, Math.ceil(distance));
        for (let step = 1; step <= steps; step++) {
            const t = step / steps;
            if (!safeFooting(from.x + (to.x - from.x) * t, from.y - 1.1,
                from.z + (to.z - from.z) * t)) return false;
        }
        return true;
    }

    function steerCompanion(bot, threat, move, dt) {
        const anchor = squadHolding ? rallyPoint : player.pos;
        const ally = friendlies.find(other => other !== bot);
        const side = bot === friendlies[0] ? -1 : 1;
        const follow = bot.mesh.position.clone().set(anchor.x + side * 3, bot.mesh.position.y, anchor.z + 2);
        const playerGap = Math.hypot(bot.pos.x - anchor.x, bot.pos.z - anchor.z);
        const threatGap = BABYLON.Vector3.Distance(bot.mesh.position, threat);
        const recovering = bot.hp < bot.maxHp * .55 || bot.hurtTimer > 0;
        bot.hurtTimer = Math.max(0, bot.hurtTimer - dt);
        bot.coverTimer -= dt;
        let goal = follow;
        bot.action = squadHolding ? 'Holding' : 'Following';

        if (playerGap > 22 || threatGap > 39) {
            bot.cover = null;
            bot.coverTimer = 0;
        } else if (bot.grounded && bot.coverTimer <= 0) {
            bot.coverTimer = .65 + Math.random() * .25;
            bot.cover = findCover(bot, threat, anchor, solidBlocks, canTakeCoverRoute, ally?.cover?.point);
        }

        if (bot.cover && threatGap > 4 && lineBlocked(bot.cover.point, threat, solidBlocks)) {
            const { point, peek } = bot.cover;
            const readyToPeek = !recovering && peek && bot.fireTimer < .14 &&
                !lineBlocked(peek, threat, solidBlocks);
            goal = readyToPeek ? peek : point;
            bot.action = readyToPeek ? 'Peeking' : recovering ? 'Recovering' : 'In cover';
        } else if (recovering && threatGap < 24 && playerGap < 18) {
            const retreat = bot.mesh.position.subtract(threat);
            retreat.y = 0;
            goal = bot.mesh.position.add(retreat.normalize().scale(5));
            bot.action = 'Falling back';
        }

        if (bot.hurtTimer === 0 && lineBlocked(bot.mesh.position, threat, solidBlocks)) {
            bot.hp = Math.min(bot.maxHp, bot.hp + (8 + bot.rank * 2) * dt);
        }

        move.set(goal.x - bot.pos.x, 0, goal.z - bot.pos.z);
        const distance = move.length();
        if (distance < (bot.cover ? .45 : 1.5)) {
            move.setAll(0);
            return;
        }
        move.scaleInPlace(1 / distance);
        if (!bot.grounded) return;
        const sample = bot.mesh.position.add(move.scale(Math.min(1.8, distance)));
        if (canTakeCoverRoute(bot.mesh.position, sample)) return;

        // Use a nearby pad when the direct route crosses a gap or changes decks.
        const gap = Math.hypot(anchor.x - bot.pos.x, anchor.z - bot.pos.z);
        let padGoal = null;
        let padScore = Infinity;
        if (!bot.cover && (gap > 8 || Math.abs(anchor.y - bot.pos.y) > 3)) {
            for (const pad of currentMap.jumpPads) {
                if (Math.abs(pad.y - bot.pos.y) > .8) continue;
                const padPoint = sample.clone().set(pad.x, sample.y, pad.z);
                const flight = 2 * pad.vy / GRAVITY;
                const landingGap = Math.hypot(anchor.x - pad.x - pad.vx * flight, anchor.z - pad.z - pad.vz * flight);
                const score = BABYLON.Vector3.Distance(bot.mesh.position, padPoint) + landingGap * .5;
                if (landingGap + 4 < gap && score < padScore && canTakeCoverRoute(bot.mesh.position, padPoint)) {
                    padGoal = padPoint;
                    padScore = score;
                }
            }
        }
        if (padGoal) {
            move.set(padGoal.x - bot.pos.x, 0, padGoal.z - bot.pos.z).normalize();
            return;
        }
        const heading = Math.atan2(move.x, move.z);
        for (const turn of [side * .65, -side * .65, side * 1.25, -side * 1.25]) {
            const angle = heading + turn;
            move.set(Math.sin(angle), 0, Math.cos(angle));
            if (canTakeCoverRoute(bot.mesh.position, bot.mesh.position.add(move.scale(1.8)))) return;
        }
        move.setAll(0);
    }

    function damageFriendly(bot, amount, impact) {
        if (bot.hurtTimer <= 0) {
            comms.say('hurt', 'friendly');
        }
        fractureBot(bot, amount, impact, false);
        bot.hurtTimer = 1.8;
        return bot.hp <= 0 && handleFriendlyDeath(bot);
    }

    function strikeMelee(bot, target, dt) {
        if (bot.windup > 0) {
            bot.windup = Math.max(0, bot.windup - dt);
            if (bot.windup > 0) return false;
            bot.fireTimer = .85;
            if (BABYLON.Vector3.Distance(bot.mesh.position, target.position) > 2.4 ||
                lineBlocked(bot.mesh.position, target.position, solidBlocks)) return false;
            if (target === camera) {
                player.hp -= 24;
                playSfx(92, .18, 'triangle', .08);
                if (player.hp <= 0) {
                    playSfx(140, 0.2, 'sawtooth', 0.07);
                    respawnPlayer();
                }
                return false;
            }
            const ally = friendlies.find(friend => friend.mesh === target);
            return ally ? damageFriendly(ally, 23, bot.mesh.position) : false;
        }
        if (bot.fireTimer <= 0 && BABYLON.Vector3.Distance(bot.mesh.position, target.position) < 2.25 &&
            !lineBlocked(bot.mesh.position, target.position, solidBlocks)) {
            bot.windup = .38;
            if (BABYLON.Vector3.Distance(camera.position, bot.mesh.position) < 18) {
                comms.say('melee', 'enemy');
                playSfx(330, .16, 'triangle', .05);
            }
        }
        return false;
    }

    function findBestJumpPad(botPos, targetPos, currentDist) {
        let bestPad = null;
        let bestScore = currentDist - 2;
        for (const pad of currentMap.jumpPads) {
            if (Math.abs(pad.y - botPos.y) < 1.5) {
                const landX = pad.x + pad.vx * 1.3;
                const landZ = pad.z + pad.vz * 1.3;
                const landDist = Math.hypot(targetPos.x - landX, targetPos.z - landZ);
                if (landDist < bestScore) {
                    bestScore = landDist;
                    bestPad = pad;
                }
            }
        }
        return bestPad;
    }

    // Intelligent Bot AI (strafe, jump/bunny-hop, jump-pad pursuit, void & hazard avoidance)
    function updateBotAI(bot, targets, dt) {
        bot.fireTimer = Math.max(0, bot.fireTimer - dt);
        bot.strafeTimer -= dt;
        bot.jumpTimer -= dt;
        bot.padFlightTimer = Math.max(0, (bot.padFlightTimer || 0) - dt);
        if (mode !== 'player') bot.hurtTimer = Math.max(0, bot.hurtTimer - dt);

        if (bot.strafeTimer <= 0) {
            bot.strafeDir *= -1;
            const reflexFactor = Math.max(0.25, 1 - autoUpgrade(bot.team, 'reflexes') * 0.08);
            bot.strafeTimer = (0.5 + Math.random() * 0.9) * reflexFactor;
        }

        const regenLvl = autoUpgrade(bot.team, 'regen');
        if (regenLvl > 0) {
            bot.hp = Math.min(bot.maxHp, bot.hp + regenLvl * 1.5 * dt);
        }

        let nearest = null;
        let minDist = Infinity;
        for (const t of targets) {
            const d = BABYLON.Vector3.Distance(bot.mesh.position, t.position);
            if (d < minDist) { minDist = d; nearest = t; }
        }

        const speedBonus = 1 + autoUpgrade(bot.team, 'speed') * 0.1;
        const moveSpeed = (bot.melee ? 15 : 12) * speedBonus;
        const moveDir = new BABYLON.Vector3(0, 0, 0);

        const companion = mode === 'player' && bot.team === 'friendly';
        if (nearest) {
            const toTarget = nearest.position.subtract(bot.mesh.position);
            toTarget.y = 0;
            const dist = toTarget.length() || 1;
            toTarget.scaleInPlace(1 / dist);
            const facing = Math.atan2(toTarget.x, toTarget.z) - bot.mesh.rotation.y;
            bot.mesh.rotation.y += Math.atan2(Math.sin(facing), Math.cos(facing)) * frameBlend(.23, dt);
            const strafe = new BABYLON.Vector3(-toTarget.z, 0, toTarget.x).scale(bot.strafeDir);

            const tacticsLvl = autoUpgrade(bot.team, 'tactics');
            const idealMin = bot.melee ? 0 : 8 + tacticsLvl * 0.8;
            const idealMax = bot.melee ? 1.55 : 16 + tacticsLvl * 1.0;
            if (bot.melee) strafe.scaleInPlace(.18);

            const rallyDist = Math.hypot(bot.pos.x - rallyPoint.x, bot.pos.z - rallyPoint.z);
            if (mode === 'rts' && bot.team === 'friendly' && rallyDist > 6) {
                const rallyPad = (!currentMap.hasFloor && bot.grounded && (rallyDist > 14 || Math.abs(rallyPoint.y - bot.pos.y) > 2.5))
                    ? findBestJumpPad(bot.pos, rallyPoint, rallyDist)
                    : null;
                if (rallyPad) {
                    moveDir.set(rallyPad.x - bot.pos.x, 0, rallyPad.z - bot.pos.z);
                    if (moveDir.lengthSquared() > 0.01) moveDir.normalize();
                } else {
                    const toRally = rallyPoint.subtract(bot.pos);
                    toRally.y = 0;
                    if (toRally.lengthSquared() > 0.01) moveDir.addInPlace(toRally.normalize());
                }
            } else if (!currentMap.hasFloor && bot.grounded && (dist > 18 || Math.abs(nearest.position.y - 1.1 - bot.pos.y) > 2.5)) {
                const bestPad = findBestJumpPad(bot.pos, nearest.position, dist);
                if (bestPad) {
                    moveDir.set(bestPad.x - bot.pos.x, 0, bestPad.z - bot.pos.z);
                    if (moveDir.lengthSquared() > 0.01) moveDir.normalize();
                } else {
                    if (dist > idealMax) moveDir.addInPlace(toTarget);
                    else if (dist < idealMin) moveDir.subtractInPlace(toTarget);
                    moveDir.addInPlace(strafe.scale(1.2));
                }
            } else {
                if (dist > idealMax) moveDir.addInPlace(toTarget);
                else if (dist < idealMin) moveDir.subtractInPlace(toTarget);
                moveDir.addInPlace(strafe.scale(1.2));
            }

            if (companion) steerCompanion(bot, nearest.position, moveDir, dt);

            if (bot.melee && strikeMelee(bot, nearest, dt)) return true;
            if (bot.melee && bot.windup > 0) moveDir.setAll(0);

            // Fire only with a clear shot for player companions.
            if (!bot.melee && bot.fireTimer <= 0 && dist < (companion ? 42 : 50) &&
                (!companion || !lineBlocked(bot.mesh.position, nearest.position, solidBlocks))) {
                const cdMult = bot.team === 'friendly' ? Math.max(0.4, 1 - autoUpgrade(bot.team, 'fireRate') * 0.1) : 1.15;
                bot.fireTimer = (0.55 + Math.random() * 0.35) * cdMult / (1 + bot.rank * .08);
                if (bot.team === 'enemy' && Math.random() < .22 &&
                    BABYLON.Vector3.Distance(camera.position, bot.mesh.position) < 26) comms.say('ranged', 'enemy');
                const aimDir = nearest.position.subtract(bot.mesh.position).normalize();
                const jitter = bot.team === 'friendly' ? Math.max(0.005, 0.09 - autoUpgrade(bot.team, 'aim') * 0.015) : 0.1;
                aimDir.x += (Math.random() - 0.5) * jitter;
                aimDir.z += (Math.random() - 0.5) * jitter;
                spawnProjectile(bot.mesh.position.add(aimDir.scale(1.1)), aimDir.normalize(), WEAPONS[0], bot.team, false, 1 + bot.rank * .18);
            }
        }

        if (moveDir.lengthSquared() > 0) moveDir.normalize();

        // Void-edge & lava-hazard avoidance on ground
        if (bot.grounded && moveDir.lengthSquared() > 0) {
            const nextX = bot.pos.x + moveDir.x * 1.4;
            const nextZ = bot.pos.z + moveDir.z * 1.4;
            if (!currentMap.hasFloor) {
                const nearPad = currentMap.jumpPads.some(
                    p => Math.hypot(nextX - p.x, nextZ - p.z) < p.radius && Math.abs(bot.pos.y - p.y) < 1.5
                );
                if (!hasSurfaceBelow(nextX, nextZ, bot.pos.y) && !nearPad) {
                    const center = findDeckCenter(bot.pos.x, bot.pos.z, bot.pos.y);
                    moveDir.set(center.x - bot.pos.x, 0, center.z - bot.pos.z);
                    if (moveDir.lengthSquared() > 0.01) moveDir.normalize();
                }
            } else if (isInsideHazard(nextX, nextZ, bot.pos.y)) {
                const jumpBoost = 1 + autoUpgrade(bot.team, 'jump') * 0.08;
                bot.vel.y = 11.5 * jumpBoost;
                bot.grounded = false;
            }
        }

        // Preserve ballistic pad velocity while mid-flight from a directional pad
        if (bot.padFlightTimer <= 0) {
            bot.vel.x = moveDir.x * moveSpeed;
            bot.vel.z = moveDir.z * moveSpeed;
        }

        // Active bunny-hop / jumping
        if (!companion && bot.windup <= 0 && (!bot.melee || minDist > 5) && bot.grounded && bot.jumpTimer <= 0) {
            const jumpBoost = 1 + autoUpgrade(bot.team, 'jump') * 0.08;
            bot.vel.y = 10.5 * jumpBoost;
            bot.grounded = false;
            bot.jumpTimer = 0.6 + Math.random() * 1.1;
        }
        bot.vel.y -= GRAVITY * dt;

        const startX = bot.pos.x;
        const startZ = bot.pos.z;
        const phys = moveEntityWithMap(bot.pos, bot.vel, BOT_RADIUS, BOT_HEIGHT, dt, bot);
        bot.mesh.position.set(bot.pos.x, bot.pos.y + 1.1, bot.pos.z);
        const distance = Math.hypot(bot.pos.x - startX, bot.pos.z - startZ);
        bot.gaitPhase = (bot.gaitPhase + distance * 1.8) % (Math.PI * 2);
        const stride = bot.grounded && distance > dt ? Math.sin(bot.gaitPhase) : 0;
        const stretch = bot.grounded ? 1 + stride * 0.045 : 1.09;
        const blend = frameBlend(0.22, dt);
        bot.mesh.scaling.y = BABYLON.Scalar.Lerp(bot.mesh.scaling.y, stretch, blend);
        bot.mesh.rotation.x = BABYLON.Scalar.Lerp(bot.mesh.rotation.x, bot.windup > 0 ? -.27 : 0, blend);
        bot.mesh.rotation.z = BABYLON.Scalar.Lerp(bot.mesh.rotation.z, stride * 0.12, blend);

        if (phys.hazardDmg > 0) bot.hp -= phys.hazardDmg;
        if (phys.fellInVoid || bot.hp <= 0) {
            if (bot.team === 'friendly') {
                return handleFriendlyDeath(bot);
            }
            handleEnemyDeath(bot);
        }
        return false;
    }

    const speedEl = document.getElementById('speedometer');
    const fpsEl = document.getElementById('fps-counter');
    const hpEl = document.getElementById('hp-val');
    const livesEl = document.getElementById('lives-val');
    const weaponEl = document.getElementById('weapon-val');
    const weaponSwitch = document.getElementById('weapon-switch');
    const weaponCharge = document.getElementById('weapon-charge');
    const squadHud = document.getElementById('squad-hud');
    const fieldScrap = document.getElementById('field-scrap');
    const squadOrder = document.getElementById('squad-order');
    const squadOrderLabel = document.getElementById('squad-command');
    const squadStatus = document.querySelectorAll('.squad-status');
    const interactPrompt = document.getElementById('interact-prompt');
    const interactText = document.getElementById('interact-text');
    squadOrderLabel.addEventListener('click', commandSquad);
    interactPrompt.addEventListener('click', upgradeCompanion);
    weaponSwitch.addEventListener('click', () => {
        if (mode !== 'player') return;
        player.weaponIdx = (player.weaponIdx + 1) % WEAPONS.length;
    });
    const scoreEl = document.getElementById('score-val');

    function closestPointOnSegment(point, a, b) {
        const ab = b.subtract(a);
        const lenSq = ab.lengthSquared();
        const t = lenSq > 0 ? Math.max(0, Math.min(1, BABYLON.Vector3.Dot(point.subtract(a), ab) / lenSq)) : 0;
        const closest = a.add(ab.scale(t));
        return { point: closest, dist: BABYLON.Vector3.Distance(point, closest) };
    }

    // Load initial map & start menu showcase
    loadMap(selectedMapId);

    scene.onBeforeRenderObservable.add(() => {
        const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
        updateVoxelDebris(dt);
        if (mode === 'menu') {
            menuAngle += dt * 0.22;
            camera.position.set(Math.cos(menuAngle) * 44, 24, Math.sin(menuAngle) * 44);
            camera.setTarget(new BABYLON.Vector3(0, 2, 0));
            return;
        }

        player.fireTimer = Math.max(0, player.fireTimer - dt);
        player.dashTimer = Math.max(0, player.dashTimer - dt);

        if (mode === 'player') {
            const forward = new BABYLON.Vector3(Math.sin(camera.rotation.y), 0, Math.cos(camera.rotation.y));
            const right = new BABYLON.Vector3(forward.z, 0, -forward.x);
            if (firing) firePlayerWeapon();
            const wish = forward.scale(touchMove.y).addInPlace(right.scale(touchMove.x));
            if (keys['KeyW']) wish.addInPlace(forward);
            if (keys['KeyS']) wish.subtractInPlace(forward);
            if (keys['KeyD']) wish.addInPlace(right);
            if (keys['KeyA']) wish.subtractInPlace(right);
            if (wish.lengthSquared() > 1) wish.normalize();

            if (keys['ShiftLeft'] && player.dashTimer <= 0 && wish.lengthSquared() > 0) {
                player.vel.addInPlace(wish.scale(16));
                player.dashTimer = 1.2;
            }

            const maxSpd = 17;
            if (player.grounded) {
                const spd = Math.hypot(player.vel.x, player.vel.z);
                if (spd > 0.01) {
                    const s = Math.max(0, spd - spd * 6.0 * dt) / spd;
                    player.vel.x *= s; player.vel.z *= s;
                }
                const add = maxSpd - (player.vel.x * wish.x + player.vel.z * wish.z);
                if (add > 0) {
                    const acc = Math.min(add, 14 * maxSpd * dt);
                    player.vel.x += wish.x * acc; player.vel.z += wish.z * acc;
                }
                if (keys['Space']) {
                    player.vel.y = 12.2;
                    player.grounded = false;
                    playSfx(320, 0.06, 'triangle', 0.04);
                }
            } else {
                const airWishCap = 3.2;
                const add = airWishCap - (player.vel.x * wish.x + player.vel.z * wish.z);
                if (add > 0) {
                    const acc = Math.min(add, 18 * airWishCap * dt);
                    player.vel.x += wish.x * acc; player.vel.z += wish.z * acc;
                }
                player.vel.y -= GRAVITY * dt;
            }

            const phys = moveEntityWithMap(player.pos, player.vel, PLAYER_RADIUS, PLAYER_HEIGHT, dt, player);
            if (phys.jumpedPad) playSfx(520, 0.16, 'sine', 0.07);
            if (phys.hazardDmg > 0) player.hp -= phys.hazardDmg;
            if (phys.fellInVoid || player.hp <= 0) {
                playSfx(140, 0.2, 'sawtooth', 0.07);
                respawnPlayer();
            }

            camera.position.set(player.pos.x, player.pos.y + PLAYER_HEIGHT, player.pos.z);

            const horiz = Math.hypot(player.vel.x, player.vel.z);
            camera.fov = BABYLON.Scalar.Lerp(camera.fov, 1.05 + Math.min(0.28, horiz * 0.01), frameBlend(0.12, dt));
            weaponView.update(player.weaponIdx, horiz, player.grounded, dt);
        }

        // Update AI
        const enemyTargets = friendlies.map(f => f.mesh);
        if (mode === 'player') enemyTargets.push(camera);
        const friendlyTargets = enemies.map(e => e.mesh);

        for (const f of friendlies) {
            if (updateBotAI(f, friendlyTargets, dt)) return;
        }
        for (const e of enemies) {
            if (updateBotAI(e, enemyTargets, dt)) return;
        }

        // Spectator camera for Auto-Battler
        if (mode === 'autobattler' && friendlies[0]) {
            const hero = friendlies[0];
            const targetCam = hero.mesh.position.add(new BABYLON.Vector3(0, 7, -13));
            camera.position = BABYLON.Vector3.Lerp(camera.position, targetCam, frameBlend(0.08, dt));
            camera.setTarget(hero.mesh.position);
            hpEl.textContent = Math.max(0, Math.round(hero.hp));
            livesEl.textContent = hero.lives;
        } else if (mode === 'rts') {
            const avgHp = friendlies.length ? friendlies.reduce((sum, f) => sum + f.hp, 0) / friendlies.length : 0;
            hpEl.textContent = Math.max(0, Math.round(avgHp));
        } else {
            hpEl.textContent = Math.max(0, Math.round(player.hp));
        }

        // Projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.life -= dt;
            const prevPos = p.mesh.position.clone();
            p.mesh.position.addInPlace(p.vel.scale(dt));

            let hit = p.life <= 0 ||
                (currentMap.hasFloor && p.mesh.position.y <= 0.1) ||
                Math.abs(p.mesh.position.x) > currentMap.halfBound + 10 ||
                Math.abs(p.mesh.position.z) > currentMap.halfBound + 10 ||
                p.mesh.position.y < -30;

            if (!hit) {
                const pr = 0.18;
                if (lineBlocked(prevPos, p.mesh.position, solidBlocks, pr)) {
                    hit = true;
                } else {
                    for (const b of solidBlocks) {
                        if (p.mesh.position.x + pr > b.minX && p.mesh.position.x - pr < b.maxX &&
                            p.mesh.position.y + pr > b.minY && p.mesh.position.y - pr < b.maxY &&
                            p.mesh.position.z + pr > b.minZ && p.mesh.position.z - pr < b.maxZ) {
                            hit = true;
                            break;
                        }
                    }
                }
            }

            let directHitEnemy = null;
            let directHitPlayer = false;
            let directHitFriendly = null;
            if (!hit && p.ownerTeam === 'friendly') {
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const hitCheck = closestPointOnSegment(enemies[j].mesh.position, prevPos, p.mesh.position);
                    if (hitCheck.dist < 1.35) {
                        p.mesh.position.copyFrom(hitCheck.point);
                        directHitEnemy = enemies[j];
                        fractureBot(directHitEnemy, p.damage, p.mesh.position, p.weapon.splash > 0);
                        hit = true;
                        if (p.fromPlayer) {
                            crosshair.animate([{ scale: '1.5', filter: 'brightness(2)' }, { scale: '1' }], 115);
                            playSfx(880, .05, 'sine', .05);
                        }
                        if (enemies[j].hp <= 0) handleEnemyDeath(enemies[j]);
                        break;
                    }
                }
            } else if (!hit) {
                const playerHit = mode === 'player' ? closestPointOnSegment(camera.position, prevPos, p.mesh.position) : null;
                if (playerHit && playerHit.dist < 1.4) {
                    p.mesh.position.copyFrom(playerHit.point);
                    player.hp -= 12;
                    directHitPlayer = true;
                    hit = true;
                    if (player.hp <= 0) {
                        playSfx(140, 0.2, 'sawtooth', 0.07);
                        respawnPlayer();
                    }
                } else {
                    for (const f of friendlies) {
                        const botHit = closestPointOnSegment(f.mesh.position, prevPos, p.mesh.position);
                        if (botHit.dist < 1.35) {
                            p.mesh.position.copyFrom(botHit.point);
                            directHitFriendly = f;
                            hit = true;
                            if (damageFriendly(f, 14, p.mesh.position)) {
                                p.mesh.dispose();
                                projectiles.splice(i, 1);
                                return;
                            }
                            break;
                        }
                    }
                }
            }

            if (hit) {
                if (p.weapon.splash > 0) {
                    if (mode === 'player' && (p.fromPlayer || p.ownerTeam === 'enemy')) {
                        const playerCenter = player.pos.add(new BABYLON.Vector3(0, 1.2, 0));
                        const dist = BABYLON.Vector3.Distance(p.mesh.position, playerCenter);
                        if (dist < p.weapon.splash) {
                            const pushDir = playerCenter.subtract(p.mesh.position);
                            if (pushDir.lengthSquared() < 0.001) pushDir.set(0, 1, 0);
                            pushDir.normalize();
                            player.vel.addInPlace(pushDir.scale((1 - dist / p.weapon.splash) * 20));
                            player.grounded = false;
                            if (p.ownerTeam === 'enemy' && !directHitPlayer) {
                                player.hp -= 12 * 0.65 * (1 - dist / p.weapon.splash);
                                if (player.hp <= 0) {
                                    playSfx(140, 0.2, 'sawtooth', 0.07);
                                    respawnPlayer();
                                }
                            }
                        }
                    }
                    if (p.ownerTeam === 'friendly') {
                        for (let j = enemies.length - 1; j >= 0; j--) {
                            if (enemies[j] === directHitEnemy) continue;
                            const dist = BABYLON.Vector3.Distance(p.mesh.position, enemies[j].mesh.position);
                            if (dist < p.weapon.splash) {
                                fractureBot(enemies[j], p.damage * 0.6 * (1 - dist / p.weapon.splash), p.mesh.position, true);
                                if (enemies[j].hp <= 0) handleEnemyDeath(enemies[j]);
                            }
                        }
                    } else if (p.ownerTeam === 'enemy') {
                        for (const f of friendlies) {
                            if (f === directHitFriendly) continue;
                            const dist = BABYLON.Vector3.Distance(p.mesh.position, f.mesh.position);
                            if (dist < p.weapon.splash) {
                                const splashDmg = 14 * 0.65 * (1 - dist / p.weapon.splash);
                                if (damageFriendly(f, splashDmg, p.mesh.position)) {
                                    p.mesh.dispose();
                                    projectiles.splice(i, 1);
                                    return;
                                }
                            }
                        }
                    }
                }
                p.mesh.dispose();
                projectiles.splice(i, 1);
            }
        }

        const activeSpeed = mode === 'autobattler' && friendlies[0]
            ? Math.hypot(friendlies[0].vel.x, friendlies[0].vel.z)
            : mode === 'rts'
                ? (friendlies.length ? friendlies.reduce((sum, f) => sum + Math.hypot(f.vel.x, f.vel.z), 0) / friendlies.length : 0)
                : Math.hypot(player.vel.x, player.vel.z);
        speedEl.textContent = `${Math.round(activeSpeed * 20)} u/s`;
        fpsEl.textContent = `${Math.round(engine.getFps())} FPS`;
        if (mode === 'player') {
            const weapon = WEAPONS[player.weaponIdx];
            if (weaponEl.textContent !== weapon.name) {
                weaponEl.textContent = weapon.name;
                weaponSwitch.style.setProperty('--weapon-color', weapon.hudColor);
            }
            weaponCharge.value = 1 - player.fireTimer / (player.fireCycle || 1);
            updateScrap(dt);
            updateSquadHud();
        }
        scoreEl.textContent = player.score;
    });

    return scene;
}

const scene = createScene();
engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());
