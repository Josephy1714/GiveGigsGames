// GraveGain3DC — Xonotic-inspired Arena FPS (Player, Auto-Battler Roguelite, RTS Squad)

const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true });

const WEAPONS = [
    { name: 'ROCKET', speed: 46, color: new BABYLON.Color3(1, 0.45, 0.1), splash: 7, damage: 65, cooldown: 0.65 },
    { name: 'RAILGUN', speed: 140, color: new BABYLON.Color3(0, 0.95, 1), splash: 0, damage: 85, cooldown: 0.9 },
    { name: 'SHOTGUN', speed: 80, color: new BABYLON.Color3(1, 0.85, 0.2), splash: 0, damage: 45, cooldown: 0.5 },
    { name: 'PLASMA', speed: 62, color: new BABYLON.Color3(0.7, 0.3, 1), splash: 3, damage: 24, cooldown: 0.14 }
];

const SAVE_KEY = 'gravegain3dc_roguelite_v1';
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

function createScene() {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.04, 0.05, 0.09, 1);

    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.85;
    const dirLight = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-0.4, -1, -0.3), scene);
    dirLight.intensity = 0.7;

    // Arena floor
    const floor = BABYLON.MeshBuilder.CreateGround('floor', { width: 90, height: 90 }, scene);
    const floorMat = new BABYLON.StandardMaterial('floorMat', scene);
    floorMat.diffuseColor = new BABYLON.Color3(0.12, 0.14, 0.2);
    floorMat.emissiveColor = new BABYLON.Color3(0.02, 0.03, 0.05);
    floor.material = floorMat;

    // Arena obstacles
    const blockMat = new BABYLON.StandardMaterial('blockMat', scene);
    blockMat.diffuseColor = new BABYLON.Color3(0.18, 0.22, 0.32);
    blockMat.emissiveColor = new BABYLON.Color3(0.0, 0.08, 0.12);
    [
        [0, 1.5, 14, 10, 3, 4],
        [-16, 2.5, 0, 5, 5, 14],
        [16, 2.5, 0, 5, 5, 14],
        [0, 1.0, -16, 12, 2, 4],
        [-10, 4, -10, 4, 8, 4],
        [10, 4, 10, 4, 8, 4]
    ].forEach(([x, y, z, w, h, d], idx) => {
        const box = BABYLON.MeshBuilder.CreateBox(`blk_${idx}`, { width: w, height: h, depth: d }, scene);
        box.position.set(x, y, z);
        box.material = blockMat;
    });

    const camera = new BABYLON.UniversalCamera('playerCam', new BABYLON.Vector3(0, 2, -26), scene);
    camera.minZ = 0.1;
    camera.fov = 1.05;

    // Game state
    let mode = 'menu'; // 'menu' | 'player' | 'autobattler' | 'rts'
    let rallyPoint = new BABYLON.Vector3(0, 0, 0);

    const player = {
        vel: new BABYLON.Vector3(0, 0, 0),
        grounded: true,
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

    function createBot(team, x, z) {
        const mesh = BABYLON.MeshBuilder.CreateCapsule(`${team}_bot`, { height: 2.2, radius: 0.55 }, scene);
        mesh.position.set(x, 1.1, z);
        mesh.material = team === 'friendly' ? heroMat : enemyMat;
        const maxHp = team === 'friendly' ? 100 + upgrades.maxHp * 25 : 90;
        return {
            team,
            mesh,
            vel: new BABYLON.Vector3(0, 0, 0),
            hp: maxHp,
            maxHp,
            fireTimer: Math.random() * 0.5,
            strafeDir: Math.random() < 0.5 ? 1 : -1,
            strafeTimer: 0.6 + Math.random() * 0.8,
            jumpTimer: 0.5 + Math.random() * 1.2,
            grounded: true,
            lives: 3
        };
    }

    function clearEntities() {
        friendlies.forEach(b => b.mesh.dispose());
        enemies.forEach(b => b.mesh.dispose());
        projectiles.forEach(p => p.mesh.dispose());
        friendlies.length = 0;
        enemies.length = 0;
        projectiles.length = 0;
    }

    function spawnEnemyWave(count = 4) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            enemies.push(createBot('enemy', Math.cos(angle) * 28, Math.sin(angle) * 28));
        }
    }

    // UI Elements
    const overlay = document.getElementById('overlay');
    const upgradeModal = document.getElementById('upgrade-modal');
    const rtsBar = document.getElementById('rts-bar');
    const rtsAddBtn = document.getElementById('rts-add-bot');
    const livesBox = document.getElementById('lives-box');
    const mobileControls = document.getElementById('mobile-controls');
    const crosshair = document.getElementById('crosshair');

    function startMode(newMode) {
        mode = newMode;
        clearEntities();
        overlay.classList.add('hidden');
        upgradeModal.classList.add('hidden');
        player.score = 0;
        player.hp = 100;
        player.vel.set(0, 0, 0);

        document.getElementById('mode-label').textContent = `MODE: ${newMode.toUpperCase()}`;
        rtsBar.classList.toggle('hidden', newMode !== 'rts');
        livesBox.classList.toggle('hidden', newMode !== 'autobattler');
        mobileControls.classList.toggle('active', newMode === 'player');
        crosshair.classList.toggle('hidden', newMode !== 'player');

        if (newMode === 'player') {
            camera.position.set(0, 2, -26);
            camera.rotation.set(0, 0, 0);
            spawnEnemyWave(4);
            canvas.requestPointerLock?.();
        } else if (newMode === 'autobattler') {
            const hero = createBot('friendly', 0, -18);
            hero.lives = 3;
            friendlies.push(hero);
            spawnEnemyWave(4);
        } else if (newMode === 'rts') {
            rallyPoint.set(0, 0, 0);
            for (let i = 0; i < 4; i++) {
                friendlies.push(createBot('friendly', -6 + i * 4, -20));
            }
            rtsAddBtn.textContent = `+ ADD BOT (${friendlies.length})`;
            spawnEnemyWave(5);
            camera.position.set(0, 34, -32);
            camera.setTarget(new BABYLON.Vector3(0, 0, 0));
        }
    }

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => startMode(btn.dataset.mode));
    });

    document.getElementById('menu-btn').addEventListener('click', () => {
        mode = 'menu';
        document.exitPointerLock?.();
        overlay.classList.remove('hidden');
        upgradeModal.classList.add('hidden');
    });

    rtsAddBtn.addEventListener('click', () => {
        if (mode !== 'rts') return;
        friendlies.push(createBot('friendly', (Math.random() - 0.5) * 10, -18));
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
        camera.rotation.y += e.movementX * 0.0022;
        camera.rotation.x = Math.max(-1.45, Math.min(1.45, camera.rotation.x + e.movementY * 0.0022));
    });

    function spawnProjectile(origin, dir, weapon, ownerTeam) {
        const proj = BABYLON.MeshBuilder.CreateSphere('proj', { diameter: 0.36 }, scene);
        proj.position = origin.clone();
        const mat = new BABYLON.StandardMaterial('pMat', scene);
        mat.emissiveColor = weapon.color;
        proj.material = mat;
        const dmgMult = ownerTeam === 'friendly' ? 1 + upgrades.damage * 0.15 : 1;
        projectiles.push({ mesh: proj, vel: dir.scale(weapon.speed), weapon, damage: weapon.damage * dmgMult, ownerTeam, life: 2.4 });
    }

    window.addEventListener('mousedown', (e) => {
        if (mode === 'player' && e.button === 0) {
            if (document.pointerLockElement !== canvas) {
                canvas.requestPointerLock?.();
                return;
            }
            if (player.fireTimer <= 0) {
                const w = WEAPONS[player.weaponIdx];
                player.fireTimer = w.cooldown;
                const fwd = camera.getDirection(BABYLON.Axis.Z).normalize();
                spawnProjectile(camera.position.add(fwd.scale(1.2)), fwd, w, 'friendly');
            }
        } else if (mode === 'rts' && e.button === 0) {
            const pick = scene.pick(scene.pointerX, scene.pointerY);
            if (pick?.hit && pick.pickedPoint) {
                rallyPoint.copyFrom(pick.pickedPoint);
            }
        }
    });

    // Intelligent Bot AI (strafe, jump/bunny-hop, dodge, lead shots)
    function updateBotAI(bot, targets, dt) {
        bot.fireTimer = Math.max(0, bot.fireTimer - dt);
        bot.strafeTimer -= dt;
        bot.jumpTimer -= dt;

        if (bot.strafeTimer <= 0) {
            bot.strafeDir *= -1;
            const reflexFactor = bot.team === 'friendly' ? Math.max(0.25, 1 - upgrades.reflexes * 0.08) : 1;
            bot.strafeTimer = (0.5 + Math.random() * 0.9) * reflexFactor;
        }

        if (bot.team === 'friendly' && upgrades.regen > 0) {
            bot.hp = Math.min(bot.maxHp, bot.hp + upgrades.regen * 1.5 * dt);
        }

        // Find nearest target
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

            if (mode === 'rts' && bot.team === 'friendly' && BABYLON.Vector3.Distance(bot.mesh.position, rallyPoint) > 6) {
                const toRally = rallyPoint.subtract(bot.mesh.position);
                toRally.y = 0;
                moveDir.addInPlace(toRally.normalize());
            } else {
                if (dist > idealMax) moveDir.addInPlace(toTarget);
                else if (dist < idealMin) moveDir.subtractInPlace(toTarget);
                moveDir.addInPlace(strafe.scale(1.2));
            }

            // Fire at target
            if (bot.fireTimer <= 0 && dist < 45) {
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
        bot.vel.x = moveDir.x * moveSpeed;
        bot.vel.z = moveDir.z * moveSpeed;

        // Active bunny-hop / jumping
        if (bot.grounded && bot.jumpTimer <= 0) {
            const jumpBoost = bot.team === 'friendly' ? 1 + upgrades.jump * 0.08 : 1;
            bot.vel.y = 10.5 * jumpBoost;
            bot.grounded = false;
            bot.jumpTimer = 0.6 + Math.random() * 1.1;
        }
        bot.vel.y -= 26 * dt;

        bot.mesh.position.addInPlace(bot.vel.scale(dt));
        if (bot.mesh.position.y <= 1.1) {
            bot.mesh.position.y = 1.1;
            bot.vel.y = 0;
            bot.grounded = true;
        }
        bot.mesh.position.x = Math.max(-41, Math.min(41, bot.mesh.position.x));
        bot.mesh.position.z = Math.max(-41, Math.min(41, bot.mesh.position.z));
    }

    const speedEl = document.getElementById('speedometer');
    const fpsEl = document.getElementById('fps-counter');
    const hpEl = document.getElementById('hp-val');
    const livesEl = document.getElementById('lives-val');
    const weaponEl = document.getElementById('weapon-val');
    const scoreEl = document.getElementById('score-val');

    scene.onBeforeRenderObservable.add(() => {
        if (mode === 'menu') return;
        const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
        player.fireTimer = Math.max(0, player.fireTimer - dt);
        player.dashTimer = Math.max(0, player.dashTimer - dt);

        if (mode === 'player') {
            const forward = new BABYLON.Vector3(Math.sin(camera.rotation.y), 0, Math.cos(camera.rotation.y));
            const right = new BABYLON.Vector3(forward.z, 0, -forward.x);
            const wish = new BABYLON.Vector3(0, 0, 0);
            if (keys['KeyW']) wish.addInPlace(forward);
            if (keys['KeyS']) wish.subtractInPlace(forward);
            if (keys['KeyD']) wish.addInPlace(right);
            if (keys['KeyA']) wish.subtractInPlace(right);
            if (wish.lengthSquared() > 0) wish.normalize();

            if (keys['ShiftLeft'] && player.dashTimer <= 0 && wish.lengthSquared() > 0) {
                player.vel.addInPlace(wish.scale(16));
                player.dashTimer = 1.2;
            }

            const maxSpd = 14;
            if (player.grounded) {
                const spd = Math.hypot(player.vel.x, player.vel.z);
                if (spd > 0.01) {
                    const s = Math.max(0, spd - spd * 6.5 * dt) / spd;
                    player.vel.x *= s; player.vel.z *= s;
                }
                const add = maxSpd - (player.vel.x * wish.x + player.vel.z * wish.z);
                if (add > 0) {
                    const acc = Math.min(add, 12 * maxSpd * dt);
                    player.vel.x += wish.x * acc; player.vel.z += wish.z * acc;
                }
                if (keys['Space']) { player.vel.y = 11.5; player.grounded = false; }
            } else {
                const add = maxSpd - (player.vel.x * wish.x + player.vel.z * wish.z);
                if (add > 0) {
                    const acc = Math.min(add, 2.6 * maxSpd * dt);
                    player.vel.x += wish.x * acc; player.vel.z += wish.z * acc;
                }
                player.vel.y -= 28 * dt;
            }

            camera.position.addInPlace(player.vel.scale(dt));
            if (camera.position.y <= 2.0) { camera.position.y = 2.0; player.vel.y = 0; player.grounded = true; }
            camera.position.x = Math.max(-42, Math.min(42, camera.position.x));
            camera.position.z = Math.max(-42, Math.min(42, camera.position.z));
        }

        // Update AI
        const enemyTargets = mode === 'player' ? [{ position: camera.position }] : friendlies.map(f => f.mesh);
        const friendlyTargets = enemies.map(e => e.mesh);

        friendlies.forEach(f => updateBotAI(f, friendlyTargets, dt));
        enemies.forEach(e => updateBotAI(e, enemyTargets, dt));

        // Spectator camera for Auto-Battler
        if (mode === 'autobattler' && friendlies[0]) {
            const hero = friendlies[0];
            const targetCam = hero.mesh.position.add(new BABYLON.Vector3(0, 7, -13));
            camera.position = BABYLON.Vector3.Lerp(camera.position, targetCam, 0.08);
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
            let hit = p.life <= 0 || p.mesh.position.y <= 0.1;

            if (p.ownerTeam === 'friendly') {
                for (let j = enemies.length - 1; j >= 0; j--) {
                    if (BABYLON.Vector3.Distance(p.mesh.position, enemies[j].mesh.position) < 1.35) {
                        enemies[j].hp -= p.damage;
                        hit = true;
                        if (enemies[j].hp <= 0) {
                            player.score++;
                            if (mode === 'autobattler') { upgrades.scrap += 1 + upgrades.scrapGain; saveUpgrades(); }
                            enemies[j].hp = enemies[j].maxHp;
                            enemies[j].mesh.position.set((Math.random() - 0.5) * 60, 1.1, (Math.random() - 0.5) * 60);
                        }
                    }
                }
            } else {
                if (mode === 'player' && BABYLON.Vector3.Distance(p.mesh.position, camera.position) < 1.4) {
                    player.hp -= 12;
                    hit = true;
                    if (player.hp <= 0) { player.hp = 100; camera.position.set(0, 2, -26); }
                } else {
                    for (const f of friendlies) {
                        if (BABYLON.Vector3.Distance(p.mesh.position, f.mesh.position) < 1.35) {
                            f.hp -= 14;
                            hit = true;
                            if (f.hp <= 0) {
                                if (mode === 'autobattler') {
                                    f.lives--;
                                    if (f.lives <= 0) { openUpgradeShop(); return; }
                                }
                                f.hp = f.maxHp;
                                f.mesh.position.set((Math.random() - 0.5) * 20, 1.1, -20);
                            }
                        }
                    }
                }
            }

            if (hit) {
                p.mesh.dispose();
                projectiles.splice(i, 1);
            }
        }

        const horizSpeed = Math.round(Math.hypot(player.vel.x, player.vel.z) * 20);
        speedEl.textContent = `${horizSpeed} u/s`;
        fpsEl.textContent = `${Math.round(engine.getFps())} FPS`;
        weaponEl.textContent = WEAPONS[player.weaponIdx].name;
        scoreEl.textContent = player.score;
    });

    return scene;
}

const scene = createScene();
engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());
