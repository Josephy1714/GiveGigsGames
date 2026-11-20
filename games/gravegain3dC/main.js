// GraveGain3DC — Xonotic-inspired Arena FPS (Player, Auto-Battler Roguelite, RTS Squad, 3 Maps)
import { MAPS, MAP_LIST } from './maps.js';
import * as BABYLON from './vendor/babylon-arena.js';

const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true });

const GRAVITY = 28;
const PLAYER_RADIUS = 0.55;
const PLAYER_HEIGHT = 2.0;
const BOT_RADIUS = 0.55;
const BOT_HEIGHT = 2.2;

const WEAPONS = [
    { name: 'DEVASTATOR', speed: 52, color: new BABYLON.Color3(1, 0.45, 0.1), splash: 8, damage: 70, cooldown: 0.6 },
    { name: 'VORTEX', speed: 165, color: new BABYLON.Color3(0, 0.95, 1), splash: 0, damage: 90, cooldown: 0.85 },
    { name: 'SHOTGUN', speed: 90, color: new BABYLON.Color3(1, 0.85, 0.2), splash: 0, damage: 50, cooldown: 0.48 },
    { name: 'ELECTRO', speed: 68, color: new BABYLON.Color3(0.7, 0.3, 1), splash: 3.5, damage: 26, cooldown: 0.13 }
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
const saveUpgrades = () => localStorage.setItem(SAVE_KEY, JSON.stringify(upgrades));

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

    // RTS Rally visual marker
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

    const heroMat = new BABYLON.StandardMaterial('heroMat', scene);
    heroMat.diffuseColor = new BABYLON.Color3(0.1, 0.9, 1);
    heroMat.emissiveColor = new BABYLON.Color3(0.05, 0.35, 0.45);

    const enemyMat = new BABYLON.StandardMaterial('enemyMat', scene);
    enemyMat.diffuseColor = new BABYLON.Color3(1, 0.2, 0.35);
    enemyMat.emissiveColor = new BABYLON.Color3(0.35, 0.04, 0.08);

    const friendlies = [];
    const enemies = [];
    const projectiles = [];
    const voxelDebris = [];
    const voxelSource = BABYLON.MeshBuilder.CreateBox('enemyVoxel', { size: 0.36 }, scene);
    voxelSource.material = enemyMat;
    voxelSource.isVisible = false;
    voxelSource.isPickable = false;

    function buildBotVoxels(root) {
        const cells = [];
        for (let y = -2; y <= 2; y++) {
            for (let x = -1; x <= 1; x++) {
                for (let z = -1; z <= 1; z++) {
                    if (Math.abs(x) + Math.abs(z) + Math.max(0, Math.abs(y) - 1) > 2) continue;
                    const cell = voxelSource.createInstance('botVoxel');
                    cell.parent = root;
                    cell.position.set(x * 0.36, y * 0.36, z * 0.36);
                    cell.isPickable = false;
                    cells.push(cell);
                }
            }
        }
        return cells;
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
            voxelDebris.push({ cell, velocity, life: 0.65 + Math.random() * 0.35 });
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
            chunk.cell.scaling.setAll(Math.min(1, chunk.life * 5));
        }
    }

    function pickSpawn(list, idx = null) {
        const arr = list && list.length ? list : [[0, 0, 0]];
        return arr[idx !== null ? idx % arr.length : Math.floor(Math.random() * arr.length)];
    }

    function createBot(team, spawnCoord) {
        const [sx, sy, sz] = spawnCoord;
        const mesh = team === 'enemy'
            ? new BABYLON.TransformNode('enemy_bot', scene)
            : BABYLON.MeshBuilder.CreateCapsule('friendly_bot', { height: BOT_HEIGHT, radius: BOT_RADIUS }, scene);
        mesh.position.set(sx, sy + 1.1, sz);
        if (team === 'friendly') {
            mesh.material = heroMat;
            mesh.isPickable = false;
        }
        const maxHp = team === 'friendly' ? 100 + upgrades.maxHp * 25 : 90;
        return {
            team,
            mesh,
            voxels: team === 'enemy' ? buildBotVoxels(mesh) : [],
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
        const [sx, sy, sz] = pickSpawn(list);
        bot.hp = bot.maxHp;
        if (bot.team === 'enemy') {
            bot.voxels.forEach(cell => cell.dispose());
            bot.voxels = buildBotVoxels(bot.mesh);
        }
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
        friendlies.length = 0;
        enemies.length = 0;
        projectiles.length = 0;
    }

    function spawnEnemyWave(count = 5) {
        for (let i = 0; i < count; i++) {
            enemies.push(createBot('enemy', pickSpawn(currentMap.enemySpawns, i)));
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
        mode = newMode;
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
        rallyMarker.isVisible = false;
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
        mode = 'menu';
        rallyMarker.isVisible = false;
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
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });

    window.addEventListener('mousemove', (e) => {
        if (mode !== 'player' || document.pointerLockElement !== canvas) return;
        turnCamera(e.movementX, e.movementY, 0.0022);
    });

    function spawnProjectile(origin, dir, weapon, ownerTeam) {
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
        const dmgMult = ownerTeam === 'friendly' ? 1 + upgrades.damage * 0.15 : 1;
        projectiles.push({ mesh: proj, vel: dir.scale(weapon.speed), weapon, damage: weapon.damage * dmgMult, ownerTeam, life: 2.4 });
    }

    const shotgunPellet = { ...WEAPONS[2], damage: WEAPONS[2].damage / 3 };

    function firePlayerWeapon() {
        if (player.fireTimer > 0) return;
        const weapon = WEAPONS[player.weaponIdx];
        player.fireTimer = weapon.cooldown;
        const forward = camera.getDirection(BABYLON.Axis.Z).normalize();
        const origin = camera.position.add(forward.scale(1.2));
        if (player.weaponIdx === 2) {
            const right = camera.getDirection(BABYLON.Axis.X);
            for (let pellet = -2; pellet <= 2; pellet++) {
                const direction = forward.add(right.scale(pellet * 0.045)).normalize();
                spawnProjectile(origin, direction, shotgunPellet, 'friendly');
            }
        } else {
            spawnProjectile(origin, forward, weapon, 'friendly');
        }
        playSfx(player.weaponIdx === 1 ? 620 : 220, 0.11, 'sawtooth', 0.07);
    }

    window.addEventListener('mouseup', e => { if (e.button === 0) firing = false; });
    window.addEventListener('mousedown', (e) => {
        if (e.target !== canvas && document.pointerLockElement !== canvas) return;
        if (mode === 'player' && e.button === 0) {
            if (document.pointerLockElement !== canvas) {
                lockPointer();
                return;
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
        if (mode === 'player') playSfx(1040, 0.12, 'triangle', 0.07);
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

    // Intelligent Bot AI (strafe, jump/bunny-hop, jump-pad pursuit, void & hazard avoidance)
    function updateBotAI(bot, targets, dt) {
        bot.fireTimer = Math.max(0, bot.fireTimer - dt);
        bot.strafeTimer -= dt;
        bot.jumpTimer -= dt;
        bot.padFlightTimer = Math.max(0, (bot.padFlightTimer || 0) - dt);

        if (bot.strafeTimer <= 0) {
            bot.strafeDir *= -1;
            const reflexFactor = bot.team === 'friendly' ? Math.max(0.25, 1 - upgrades.reflexes * 0.08) : 1;
            bot.strafeTimer = (0.5 + Math.random() * 0.9) * reflexFactor;
        }

        if (bot.team === 'friendly' && upgrades.regen > 0) {
            bot.hp = Math.min(bot.maxHp, bot.hp + upgrades.regen * 1.5 * dt);
        }

        let nearest = null;
        let minDist = Infinity;
        for (const t of targets) {
            const d = BABYLON.Vector3.Distance(bot.mesh.position, t.position);
            if (d < minDist) { minDist = d; nearest = t; }
        }

        const speedBonus = bot.team === 'friendly' ? 1 + upgrades.speed * 0.1 : 1;
        const moveSpeed = 12 * speedBonus;
        const moveDir = new BABYLON.Vector3(0, 0, 0);

        if (nearest) {
            const toTarget = nearest.position.subtract(bot.mesh.position);
            toTarget.y = 0;
            const dist = toTarget.length() || 1;
            toTarget.scaleInPlace(1 / dist);
            const strafe = new BABYLON.Vector3(-toTarget.z, 0, toTarget.x).scale(bot.strafeDir);

            const idealMin = bot.team === 'friendly' ? 8 + upgrades.tactics * 0.8 : 8;
            const idealMax = bot.team === 'friendly' ? 16 + upgrades.tactics * 1.0 : 16;

            if (mode === 'rts' && bot.team === 'friendly' && Math.hypot(bot.pos.x - rallyPoint.x, bot.pos.z - rallyPoint.z) > 6) {
                const toRally = rallyPoint.subtract(bot.pos);
                toRally.y = 0;
                if (toRally.lengthSquared() > 0.01) moveDir.addInPlace(toRally.normalize());
            } else if (!currentMap.hasFloor && bot.grounded && (dist > 18 || Math.abs(nearest.position.y - 1.1 - bot.pos.y) > 2.5)) {
                // Seek a jump pad on current deck that lands closer to target
                let bestPad = null;
                let bestScore = dist - 2;
                for (const pad of currentMap.jumpPads) {
                    if (Math.abs(pad.y - bot.pos.y) < 1.5) {
                        const landX = pad.x + pad.vx * 1.3;
                        const landZ = pad.z + pad.vz * 1.3;
                        const landDist = Math.hypot(nearest.position.x - landX, nearest.position.z - landZ);
                        if (landDist < bestScore) {
                            bestScore = landDist;
                            bestPad = pad;
                        }
                    }
                }
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

            // Fire at target
            if (bot.fireTimer <= 0 && dist < 50) {
                const cdMult = bot.team === 'friendly' ? Math.max(0.4, 1 - upgrades.fireRate * 0.1) : 1.15;
                bot.fireTimer = (0.55 + Math.random() * 0.35) * cdMult;
                const aimDir = nearest.position.subtract(bot.mesh.position).normalize();
                const jitter = bot.team === 'friendly' ? Math.max(0.005, 0.09 - upgrades.aim * 0.015) : 0.1;
                aimDir.x += (Math.random() - 0.5) * jitter;
                aimDir.z += (Math.random() - 0.5) * jitter;
                spawnProjectile(bot.mesh.position.add(aimDir.scale(1.1)), aimDir.normalize(), WEAPONS[0], bot.team);
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
                const jumpBoost = bot.team === 'friendly' ? 1 + upgrades.jump * 0.08 : 1;
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
        if (bot.grounded && bot.jumpTimer <= 0) {
            const jumpBoost = bot.team === 'friendly' ? 1 + upgrades.jump * 0.08 : 1;
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
        bot.mesh.rotation.z = BABYLON.Scalar.Lerp(bot.mesh.rotation.z, stride * 0.12, blend);

        if (phys.hazardDmg > 0) bot.hp -= phys.hazardDmg;
        if (phys.fellInVoid || bot.hp <= 0) {
            if (bot.team === 'friendly') {
                return handleFriendlyDeath(bot);
            }
            respawnBot(bot);
        }
        return false;
    }

    const speedEl = document.getElementById('speedometer');
    const fpsEl = document.getElementById('fps-counter');
    const hpEl = document.getElementById('hp-val');
    const livesEl = document.getElementById('lives-val');
    const weaponEl = document.getElementById('weapon-val');
    document.getElementById('weapon-switch').addEventListener('click', () => {
        if (mode !== 'player') return;
        player.weaponIdx = (player.weaponIdx + 1) % WEAPONS.length;
    });
    const scoreEl = document.getElementById('score-val');

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
        }

        // Update AI
        const enemyTargets = mode === 'player' ? [{ position: camera.position }] : friendlies.map(f => f.mesh);
        const friendlyTargets = enemies.map(e => e.mesh);

        for (const f of friendlies) {
            if (updateBotAI(f, friendlyTargets, dt)) return;
        }
        for (const e of enemies) {
            updateBotAI(e, enemyTargets, dt);
        }

        // Spectator camera for Auto-Battler
        if (mode === 'autobattler' && friendlies[0]) {
            const hero = friendlies[0];
            const targetCam = hero.mesh.position.add(new BABYLON.Vector3(0, 7, -13));
            camera.position = BABYLON.Vector3.Lerp(camera.position, targetCam, frameBlend(0.08, dt));
            camera.setTarget(hero.mesh.position);
            hpEl.textContent = Math.max(0, Math.round(hero.hp));
            livesEl.textContent = hero.lives;
        } else {
            hpEl.textContent = Math.max(0, Math.round(player.hp));
        }

        // Projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.life -= dt;
            p.mesh.position.addInPlace(p.vel.scale(dt));

            let hit = p.life <= 0 ||
                (currentMap.hasFloor && p.mesh.position.y <= 0.1) ||
                Math.abs(p.mesh.position.x) > currentMap.halfBound + 10 ||
                Math.abs(p.mesh.position.z) > currentMap.halfBound + 10 ||
                p.mesh.position.y < -30;

            if (!hit) {
                const pr = 0.18;
                for (const b of solidBlocks) {
                    if (p.mesh.position.x + pr > b.minX && p.mesh.position.x - pr < b.maxX &&
                        p.mesh.position.y + pr > b.minY && p.mesh.position.y - pr < b.maxY &&
                        p.mesh.position.z + pr > b.minZ && p.mesh.position.z - pr < b.maxZ) {
                        hit = true;
                        break;
                    }
                }
            }

            let directHitEnemy = null;
            if (!hit && p.ownerTeam === 'friendly') {
                for (let j = enemies.length - 1; j >= 0; j--) {
                    if (BABYLON.Vector3.Distance(p.mesh.position, enemies[j].mesh.position) < 1.35) {
                        directHitEnemy = enemies[j];
                        fractureBot(directHitEnemy, p.damage, p.mesh.position, p.weapon.splash > 0);
                        hit = true;
                        if (mode === 'player') playSfx(880, 0.05, 'sine', 0.05);
                        if (enemies[j].hp <= 0) handleEnemyDeath(enemies[j]);
                        break;
                    }
                }
            } else if (!hit) {
                if (mode === 'player' && BABYLON.Vector3.Distance(p.mesh.position, camera.position) < 1.4) {
                    player.hp -= 12;
                    hit = true;
                    if (player.hp <= 0) respawnPlayer();
                } else {
                    for (const f of friendlies) {
                        if (BABYLON.Vector3.Distance(p.mesh.position, f.mesh.position) < 1.35) {
                            f.hp -= 14;
                            hit = true;
                            if (f.hp <= 0 && handleFriendlyDeath(f)) {
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
                    if (mode === 'player') {
                        const playerCenter = player.pos.add(new BABYLON.Vector3(0, 1.2, 0));
                        const dist = BABYLON.Vector3.Distance(p.mesh.position, playerCenter);
                        if (dist < p.weapon.splash) {
                            const pushDir = playerCenter.subtract(p.mesh.position);
                            if (pushDir.lengthSquared() < 0.001) pushDir.set(0, 1, 0);
                            pushDir.normalize();
                            player.vel.addInPlace(pushDir.scale((1 - dist / p.weapon.splash) * 20));
                            player.grounded = false;
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
                    }
                }
                p.mesh.dispose();
                projectiles.splice(i, 1);
            }
        }

        const activeSpeed = mode === 'autobattler' && friendlies[0]
            ? Math.hypot(friendlies[0].vel.x, friendlies[0].vel.z)
            : Math.hypot(player.vel.x, player.vel.z);
        speedEl.textContent = `${Math.round(activeSpeed * 20)} u/s`;
        fpsEl.textContent = `${Math.round(engine.getFps())} FPS`;
        weaponEl.textContent = WEAPONS[player.weaponIdx].name;
        scoreEl.textContent = player.score;
    });

    return scene;
}

const scene = createScene();
engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());
