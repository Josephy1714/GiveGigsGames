// BattleSharks 3D — Third-Person Cyber-Shark Arena
// Built with Three.js (r128) + Procedural Web Audio

(() => {
    'use strict';

    // ==================== AUDIO SYSTEM ====================
    const sfx = {
        ctx: null,
        muted: localStorage.getItem('battlesharks_muted') === 'true',
        musicInterval: null,
        step: 0,
        init() {
            if (!this.ctx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (AC) this.ctx = new AC();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
        },
        toggleMute() {
            this.muted = !this.muted;
            localStorage.setItem('battlesharks_muted', String(this.muted));
            return this.muted;
        },
        tone(freq, type, dur, vol = 0.15, slideTo = null) {
            if (this.muted || !this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + dur);
        },
        chomp() { this.tone(180, 'sawtooth', 0.12, 0.18, 70); },
        laser() { this.tone(880, 'square', 0.14, 0.1, 220); },
        dash() { this.tone(140, 'triangle', 0.25, 0.22, 420); },
        hit() { this.tone(110, 'sawtooth', 0.22, 0.25, 45); },
        electric() { this.tone(640, 'sawtooth', 0.18, 0.12, 1280); },
        missile() { this.tone(320, 'triangle', 0.2, 0.14, 780); },
        explosion() { this.tone(95, 'sawtooth', 0.45, 0.28, 28); },
        upgrade() {
            this.tone(440, 'sine', 0.12, 0.16);
            setTimeout(() => this.tone(660, 'sine', 0.14, 0.16), 90);
            setTimeout(() => this.tone(880, 'sine', 0.22, 0.18), 180);
        },
        bossAlert() {
            this.tone(220, 'sawtooth', 0.35, 0.2, 160);
            setTimeout(() => this.tone(220, 'sawtooth', 0.35, 0.2, 160), 400);
        },
        startMusic() {
            if (this.musicInterval) return;
            const notes = [110, 130.8, 110, 146.8, 110, 164.8, 110, 146.8];
            this.musicInterval = setInterval(() => {
                if (!state.running || state.paused || this.muted || !this.ctx) return;
                const f = notes[this.step % notes.length];
                this.tone(f * 0.5, 'triangle', 0.18, 0.06);
                this.step++;
            }, 240);
        },
        stopMusic() {
            if (this.musicInterval) {
                clearInterval(this.musicInterval);
                this.musicInterval = null;
            }
        }
    };

    // ==================== CONFIG & UPGRADES ====================
    const ARENA_RADIUS = 160;
    const FLOOR_Y = -280;
    const SURFACE_Y = 34;

    const UPGRADE_DEFS = [
        { id: 'lasers', name: 'Twin Laser Eyes', desc: 'Fire high-energy cyber lasers (Left Click / F) to destroy mines & enemies.', cost: { biomass: 12, debris: 4, mutagens: 0 } },
        { id: 'thruster', name: 'Jet Thrusters', desc: 'Press Spacebar for a high-speed hydro-jet dash that damages enemies.', cost: { biomass: 15, debris: 5, mutagens: 0 } },
        { id: 'shield', name: 'Plasma Shield', desc: 'Absorbs 1 hit completely and recharges every 10 seconds.', cost: { biomass: 18, debris: 8, mutagens: 1 } },
        { id: 'electric', name: 'Electric Aura', desc: 'Emits a shockwave every 3.5s that zaps nearby prey & enemies.', cost: { biomass: 22, debris: 10, mutagens: 1 } },
        { id: 'acid', name: 'Acidic Blood', desc: 'Leaves toxic acid clouds behind you that dissolve pursuers.', cost: { biomass: 20, debris: 8, mutagens: 1 } },
        { id: 'scales', name: 'Armored Scales', desc: 'Cyber-alloy dorsal plating reduces all incoming damage by 40%.', cost: { biomass: 25, debris: 12, mutagens: 2 } },
        { id: 'missiles', name: 'Homing Bio-Missiles', desc: 'Automatically launches tracking torpedoes at nearby enemies.', cost: { biomass: 35, debris: 16, mutagens: 3 } },
        { id: 'aquariumRegen', name: 'BS-07 Bio-Regen Tank', desc: 'Upgrades your BS-07 Aquarium to rapidly heal your shark when inside.', cost: { biomass: 10, debris: 4, mutagens: 0 } },
        { id: 'aquariumTurret', name: 'BS-07 Defense Turret', desc: 'Mounts an automated laser turret on BS-07 that zaps nearby enemies.', cost: { biomass: 16, debris: 8, mutagens: 1 } },
        { id: 'flashlightMK2', name: 'Abyssal Flashlight MK-II', desc: 'Doubles your shark flashlight range, brightness, and beam width for deep caves.', cost: { biomass: 14, debris: 6, mutagens: 0 } }
    ];

    const PREY_TYPES = [
        { name: 'Blue Fish', color: 0x38bdf8, size: 1.0, biomass: 1, speed: 7, score: 10 },
        { name: 'Tang Fish', color: 0xfacc15, size: 1.15, biomass: 2, speed: 8.5, score: 15 },
        { name: 'Puffer Fish', color: 0xfb923c, size: 1.35, biomass: 3, speed: 5, score: 20, spiky: true },
        { name: 'Shrimp', color: 0xf472b6, size: 0.85, biomass: 1, speed: 6.5, score: 8 },
        { name: 'Crab', color: 0xef4444, size: 1.2, biomass: 2, speed: 4, score: 15, bottomWalker: true },
        { name: 'Octopus', color: 0xa855f7, size: 1.7, biomass: 5, speed: 6, score: 40 },
        { name: 'Squid', color: 0x2dd4bf, size: 1.5, biomass: 4, speed: 11, score: 35 }
    ];

    const ENEMY_TYPES = [
        { id: 'mine', name: 'Naval Mine', color: 0x334155, size: 2.2, damage: 35, hp: 30, debris: 3, speed: 0, isStatic: true },
        { id: 'toxic', name: 'Toxic Waste', color: 0x84cc16, size: 1.9, damage: 20, hp: 25, debris: 2, speed: 2.2, isDrifting: true },
        { id: 'diver', name: 'Cyber Diver', color: 0x0ea5e9, size: 2.0, damage: 15, hp: 40, debris: 5, speed: 7.5, shoots: true },
        { id: 'sentinel', name: 'Mecha Sentinel', color: 0xf43f5e, size: 2.5, damage: 25, hp: 70, debris: 8, speed: 9.5, shoots: true },
        { id: 'scorpion', name: 'Sea Scorpion', color: 0x854d0e, size: 3.2, damage: 30, hp: 110, debris: 12, speed: 10.5, elite: true },
        { id: 'jawfish', name: 'Bone-Plated Jaw Fish', color: 0x94a3b8, size: 3.4, damage: 35, hp: 140, debris: 15, speed: 8.5, elite: true },
        { id: 'cyclops', name: 'Cyclops: Winged Relic', color: 0x7c3aed, size: 4.5, damage: 40, hp: 220, debris: 25, speed: 11.0, shoots: true, elite: true }
    ];

    const BOSS_ROSTER = [
        { name: 'LEVIATHAN MECHA-SUB', color: 0x1e293b, glow: 0xff0044 },
        { name: 'KRAKEN: TERROR OF THE ABYSS', color: 0x7f1d1d, glow: 0xf97316 },
        { name: 'MEGALODON: GIANT HUNTER', color: 0x0f172a, glow: 0x00e5ff },
        { name: 'MOSASAUR: ANCIENT APEX', color: 0x14532d, glow: 0x4ade80 },
        { name: 'COLOSSUS: BEHEMOTH', color: 0x312e81, glow: 0xa855f7 },
        { name: 'SCOURGE: DEEP DESTROYER', color: 0x4c0519, glow: 0xf43f5e }
    ];

    const SHOP_ITEMS = [
        { id: 'skin_abyssal', name: 'Abyssal Shark Skin', type: 'skin', skin: 'magma', cost: 150, desc: 'Deep void scales with glowing violet-crimson cracks.' },
        { id: 'skin_gold', name: 'Golden Apex Skin', type: 'skin', skin: 'gold', cost: 200, desc: 'Pure gilded armor plating for the ultimate predator.' },
        { id: 'plushie', name: 'Shark Plushie Companion', type: 'companion', cost: 120, desc: 'A cute mini-shark plushie that swims alongside you!' },
        { id: 'decor_chest', name: 'Treasure Chest Decor', type: 'decor', cost: 80, desc: 'Places a glowing gold Treasure Chest inside BS-07.' },
        { id: 'decor_castle', name: 'Scottish Medieval Castle', type: 'decor', cost: 180, desc: 'Builds a miniature Highland Castle in your BS-07 Aquarium!' },
        { id: 'decor_skeleton', name: 'Drunken Skeleton Decor', type: 'decor', cost: 160, desc: 'A legendary rum-loving skeleton blowing bubbles in BS-07.' },
        { id: 'decor_ship', name: 'Sunken Ship Decor', type: 'decor', cost: 140, desc: 'Adds a weathered sunken galleon outside BS-07.' }
    ];

    // ==================== GAME STATE ====================
    const state = {
        running: false,
        paused: false,
        score: 0,
        biomass: 0,
        debris: 0,
        mutagens: 0,
        coins: parseInt(localStorage.getItem('battlesharks_coins') || '0', 10),
        shopOwned: JSON.parse(localStorage.getItem('battlesharks_shop') || '{}'),
        upgrades: {
            lasers: false, thruster: false, shield: false,
            electric: false, acid: false, scales: false, missiles: false
        },
        shieldActive: false,
        shieldTimer: 0,
        electricTimer: 0,
        acidTimer: 0,
        missileTimer: 0,
        spawnTimer: 0,
        difficultyTimer: 0,
        difficulty: 1,
        cameraShake: 0,
        bossActive: false,
        bossDefeated: false,
        nextBossScore: 600,
        lastTime: 0
    };

    const player = {
        pos: new THREE.Vector3(0, 6, 0),
        yaw: 0,
        pitch: 0,
        speed: 0,
        baseMaxSpeed: 24,
        health: 100,
        maxHealth: 100,
        level: 1,
        xp: 0,
        nextLevelXp: 120,
        scale: 1.0,
        dashCooldown: 0,
        dashTimer: 0,
        isDashing: false,
        laserCooldown: 0,
        jawTimer: 0,
        invulnTimer: 0
    };

    const boss = {
        mesh: null,
        active: false,
        pos: new THREE.Vector3(0, 12, -65),
        hp: 1000,
        maxHp: 1000,
        shootTimer: 1.5,
        angle: 0
    };

    // ==================== THREE.JS SETUP ====================
    const canvas = document.getElementById('gameCanvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03182d);
    scene.fog = new THREE.FogExp2(0x03182d, 0.0115);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 260);
    const camCurrentPos = new THREE.Vector3(0, 12, 16);
    const camCurrentLook = new THREE.Vector3(0, 6, 0);

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x020b18, 1.15);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0x7dd3fc, 1.1);
    dirLight.position.set(30, 80, 25);
    scene.add(dirLight);

    const sharkLight = new THREE.PointLight(0x00e5ff, 1.2, 26);
    scene.add(sharkLight);

    // ==================== ENVIRONMENT ====================
    const kelpList = [];
    let waterSurface;
    let planktonPoints;

    const AQUARIUM_POS = new THREE.Vector3(0, 6, 12);
    const tutorial = {
        active: false,
        step: 0,
        preyEaten: 0,
        enemiesKilled: 0
    };

    function buildAquariumBase() {
        const baseGroup = new THREE.Group();
        baseGroup.position.copy(AQUARIUM_POS);

        const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.75, roughness: 0.3 });
        const glassMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.14, side: THREE.DoubleSide });
        const trimMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

        // Aquarium Glass & Steel Frame (open at -Z for Shark Loading Bay exit)
        const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 18), steelMat);
        floor.position.y = -5.5;
        const roof = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 18), steelMat);
        roof.position.y = 5.5;
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(16, 11, 0.8), steelMat);
        backWall.position.z = 9;
        baseGroup.add(floor, roof, backWall);

        // Side Glass Panels
        [-8, 8].forEach((x) => {
            const glass = new THREE.Mesh(new THREE.PlaneGeometry(18, 10.5), glassMat);
            glass.rotation.y = Math.PI / 2;
            glass.position.x = x;
            baseGroup.add(glass);

            const strut = new THREE.Mesh(new THREE.BoxGeometry(0.6, 11.4, 0.6), steelMat);
            strut.position.set(x, 0, -9);
            baseGroup.add(strut);
        });

        // Glowing Loading Bay Gate Arch (-Z)
        const gateTop = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.4, 0.5), trimMat);
        gateTop.position.set(0, 5.2, -9);
        baseGroup.add(gateTop);

        const baseLight = new THREE.PointLight(0x00e5ff, 1.8, 34);
        baseLight.position.set(0, 3, 0);
        baseGroup.add(baseLight);

        scene.add(baseGroup);
    }

    function buildEnvironment() {
        // Seafloor (Abyssal Floor at y = -280)
        const floorGeo = new THREE.PlaneGeometry(ARENA_RADIUS * 2.6, ARENA_RADIUS * 2.6, 48, 48);
        floorGeo.rotateX(-Math.PI / 2);
        const posAttr = floorGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const z = posAttr.getZ(i);
            const y = Math.sin(x * 0.05) * 4.5 + Math.cos(z * 0.05) * 4.5;
            posAttr.setY(i, y);
        }
        floorGeo.computeVertexNormals();
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x061624, roughness: 0.92, metalness: 0.1 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = FLOOR_Y;
        scene.add(floor);

        // Deep Cave Systems: Arches, Rock Shelves & Bioluminescent Caverns
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9, metalness: 0.15 });
        const crystalColors = [0x00e5ff, 0xa855f7, 0x10b981, 0xf43f5e];
        for (let i = 0; i < 42; i++) {
            const ang = Math.random() * Math.PI * 2;
            const rad = 28 + Math.random() * (ARENA_RADIUS - 36);
            const y = FLOOR_Y + 20 + Math.random() * 240;
            const arch = new THREE.Mesh(
                new THREE.TorusGeometry(12 + Math.random() * 14, 3.2 + Math.random() * 2.5, 8, 16, Math.PI),
                rockMat
            );
            arch.position.set(Math.cos(ang) * rad, y, Math.sin(ang) * rad);
            arch.rotation.y = Math.random() * Math.PI * 2;
            scene.add(arch);

            // Bioluminescent Crystal Cluster on cave arch
            const cColor = crystalColors[i % crystalColors.length];
            const crystal = new THREE.Mesh(
                new THREE.OctahedronGeometry(2.2 + Math.random() * 2.0, 0),
                new THREE.MeshBasicMaterial({ color: cColor })
            );
            crystal.position.copy(arch.position).add(new THREE.Vector3(0, 8, 0));
            scene.add(crystal);
        }

        // Abyssal Hydrothermal Vents
        const ventMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
        const magmaMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
        for (let i = 0; i < 16; i++) {
            const ang = Math.random() * Math.PI * 2;
            const rad = 20 + Math.random() * (ARENA_RADIUS - 30);
            const vent = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 4.2, 12, 10), ventMat);
            vent.position.set(Math.cos(ang) * rad, FLOOR_Y + 5, Math.sin(ang) * rad);
            const core = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8), magmaMat);
            core.position.set(vent.position.x, FLOOR_Y + 11, vent.position.z);
            scene.add(vent, core);
        }

        // Water Surface above
        const surfGeo = new THREE.PlaneGeometry(ARENA_RADIUS * 2.8, ARENA_RADIUS * 2.8, 24, 24);
        surfGeo.rotateX(Math.PI / 2);
        const surfMat = new THREE.MeshBasicMaterial({
            color: 0x0ea5e9,
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide,
            wireframe: false
        });
        waterSurface = new THREE.Mesh(surfGeo, surfMat);
        waterSurface.position.y = SURFACE_Y;
        scene.add(waterSurface);

        // Arena Cyber Boundary Ring
        const ringGeo = new THREE.TorusGeometry(ARENA_RADIUS, 0.6, 12, 72);
        ringGeo.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.35 });
        for (let y = FLOOR_Y + 6; y <= SURFACE_Y - 6; y += 16) {
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.y = y;
            scene.add(ring);
        }

        // Super-Detailed Multi-Branched Corals & Sunken Debris
        const coralColors = [0xf43f5e, 0xa855f7, 0xfb923c, 0x14b8a6, 0x38bdf8];
        const baseRockMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
        for (let i = 0; i < 48; i++) {
            const ang = Math.random() * Math.PI * 2;
            const rad = 14 + Math.random() * (ARENA_RADIUS - 20);
            const x = Math.cos(ang) * rad;
            const z = Math.sin(ang) * rad;
            const col = coralColors[i % coralColors.length];

            const coralGroup = new THREE.Group();
            coralGroup.position.set(x, FLOOR_Y, z);

            const pedestal = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2, 1), baseRockMat);
            pedestal.scale.set(1.2, 0.5, 1.2);
            coralGroup.add(pedestal);

            const branchMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.55, emissive: col, emissiveIntensity: 0.18 });
            const tipMat = new THREE.MeshBasicMaterial({ color: col });
            const branches = 3 + (i % 4);
            for (let b = 0; b < branches; b++) {
                const h = 2.5 + Math.random() * 4.5;
                const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.55, h, 8), branchMat);
                const bAng = (b / branches) * Math.PI * 2;
                branch.position.set(Math.cos(bAng) * 0.9, h * 0.5, Math.sin(bAng) * 0.9);
                branch.rotation.z = (Math.random() - 0.5) * 0.5;
                branch.rotation.x = (Math.random() - 0.5) * 0.5;
                const tip = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), tipMat);
                tip.position.y = h * 0.5;
                branch.add(tip);
                coralGroup.add(branch);
            }
            scene.add(coralGroup);
        }

        // Random Sunken Debris & Wreckage
        const debrisMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.4 });
        const hazardMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.4, roughness: 0.5 });
        for (let i = 0; i < 24; i++) {
            const ang = Math.random() * Math.PI * 2;
            const rad = 18 + Math.random() * (ARENA_RADIUS - 26);
            const crate = new THREE.Group();
            crate.position.set(Math.cos(ang) * rad, FLOOR_Y + 1.4, Math.sin(ang) * rad);
            crate.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.4);
            const box = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 3.2), debrisMat);
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.4, 3.3), hazardMat);
            crate.add(box, stripe);
            scene.add(crate);
        }

        // Swaying Kelp
        const kelpGeo = new THREE.CylinderGeometry(0.18, 0.35, 14, 6);
        kelpGeo.translate(0, 7, 0);
        const kelpMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.8 });
        for (let i = 0; i < 35; i++) {
            const ang = Math.random() * Math.PI * 2;
            const rad = 10 + Math.random() * (ARENA_RADIUS - 14);
            const kelp = new THREE.Mesh(kelpGeo, kelpMat);
            kelp.position.set(Math.cos(ang) * rad, FLOOR_Y, Math.sin(ang) * rad);
            kelp.userData = { phase: Math.random() * Math.PI * 2 };
            scene.add(kelp);
            kelpList.push(kelp);
        }

        // God Rays (light shafts from surface)
        const rayGeo = new THREE.ConeGeometry(7, 55, 12, 1, true);
        const rayMat = new THREE.MeshBasicMaterial({
            color: 0x7dd3fc,
            transparent: true,
            opacity: 0.055,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        for (let i = 0; i < 10; i++) {
            const ray = new THREE.Mesh(rayGeo, rayMat);
            ray.position.set((Math.random() - 0.5) * 120, 8, (Math.random() - 0.5) * 120);
            ray.rotation.z = (Math.random() - 0.5) * 0.2;
            scene.add(ray);
        }

        // Floating Bioluminescent Plankton
        const pCount = 500;
        const pGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(pCount * 3);
        for (let i = 0; i < pCount; i++) {
            pPos[i * 3] = (Math.random() - 0.5) * ARENA_RADIUS * 2;
            pPos[i * 3 + 1] = FLOOR_Y + Math.random() * (SURFACE_Y - FLOOR_Y);
            pPos[i * 3 + 2] = (Math.random() - 0.5) * ARENA_RADIUS * 2;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const pMat = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.45, transparent: true, opacity: 0.65 });
        planktonPoints = new THREE.Points(pGeo, pMat);
        scene.add(planktonPoints);
        buildAquariumBase();
    }

    // ==================== 3D SHARK MODEL ====================
    let sharkGroup, sharkTail, sharkJaw, sharkShieldMesh, sharkAuraMesh, sharkLaserGroup, sharkJetGroup, sharkScalesGroup, sharkMissileGroup, sharkFlashlight;
    let flashlightOn = true;

    const SHARK_SKINS = {
        slate:  { top: '#0b1d33', mid: '#16385c', low: '#1e4a73', belly: '#f8fafc', glow: '#00e5ff' },
        blue:   { top: '#0369a1', mid: '#0284c7', low: '#38bdf8', belly: '#f0f9ff', glow: '#38bdf8' },
        camo:   { top: '#14532d', mid: '#15803d', low: '#22c55e', belly: '#ecfdf5', glow: '#4ade80' },
        arctic: { top: '#7dd3fc', mid: '#bae6fd', low: '#e0f2fe', belly: '#ffffff', glow: '#00f0ff' },
        magma:  { top: '#09090b', mid: '#27272a', low: '#7f1d1d', belly: '#fca5a5', glow: '#ef4444' },
        gold:   { top: '#a16207', mid: '#ca8a04', low: '#eab308', belly: '#fefce8', glow: '#fde047' }
    };
    let currentSkin = localStorage.getItem('battlesharks_skin') || 'slate';
    let sharkBodyMat = null;

    function createSharkSkinTextures(skinKey = currentSkin) {
        const pal = SHARK_SKINS[skinKey] || SHARK_SKINS.slate;
        const w = 512, h = 512;
        const diffCanvas = document.createElement('canvas');
        diffCanvas.width = w; diffCanvas.height = h;
        const dCtx = diffCanvas.getContext('2d');

        // Great White countershading
        const grad = dCtx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0.0, pal.top);
        grad.addColorStop(0.45, pal.mid);
        grad.addColorStop(0.56, pal.low);
        grad.addColorStop(0.60, '#e2e8f0');
        grad.addColorStop(1.0, pal.belly);
        dCtx.fillStyle = grad;
        dCtx.fillRect(0, 0, w, h);

        // Subtle cyber-scale micro-pattern & scars
        dCtx.strokeStyle = 'rgba(0, 229, 255, 0.14)';
        dCtx.lineWidth = 1.2;
        for (let y = 20; y < h * 0.55; y += 22) {
            dCtx.beginPath();
            for (let x = 0; x <= w; x += 24) {
                const jy = y + Math.sin(x * 0.08 + y) * 3;
                if (x === 0) dCtx.moveTo(x, jy);
                else dCtx.lineTo(x, jy);
            }
            dCtx.stroke();
        }

        const emCanvas = document.createElement('canvas');
        emCanvas.width = w; emCanvas.height = h;
        const eCtx = emCanvas.getContext('2d');
        eCtx.fillStyle = '#000000';
        eCtx.fillRect(0, 0, w, h);
        eCtx.strokeStyle = pal.glow;
        eCtx.lineWidth = 2;
        for (let i = 0; i < 18; i++) {
            eCtx.beginPath();
            let cx = Math.random() * w;
            let cy = Math.random() * (h * 0.5);
            eCtx.moveTo(cx, cy);
            for (let s = 0; s < 4; s++) {
                cx += (Math.random() - 0.5) * 60;
                cy += (Math.random() - 0.5) * 40;
                eCtx.lineTo(cx, cy);
            }
            eCtx.stroke();
        }

        const map = new THREE.CanvasTexture(diffCanvas);
        const emissiveMap = new THREE.CanvasTexture(emCanvas);
        return { map, emissiveMap };
    }

    function applySharkSkin(skinKey) {
        currentSkin = skinKey;
        localStorage.setItem('battlesharks_skin', skinKey);
        if (!sharkBodyMat) return;
        const { map, emissiveMap } = createSharkSkinTextures(skinKey);
        sharkBodyMat.map = map;
        sharkBodyMat.emissiveMap = emissiveMap;
        sharkBodyMat.needsUpdate = true;
    }

    function buildSharkMesh() {
        sharkGroup = new THREE.Group();

        const { map, emissiveMap } = createSharkSkinTextures();
        const bodyMat = new THREE.MeshStandardMaterial({
            map,
            emissive: 0x00a8cc,
            emissiveMap,
            emissiveIntensity: 0.45,
            roughness: 0.28,
            metalness: 0.38
        });
        sharkBodyMat = bodyMat;
        const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.42, metalness: 0.1 });
        const finMat = new THREE.MeshStandardMaterial({ color: 0x0b1f38, roughness: 0.32, metalness: 0.42 });
        const gumMat = new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.6 });
        const toothMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.15 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.3, metalness: 0.8 });

        // High-res sculpted Torso (48x32)
        const torsoGeo = new THREE.SphereGeometry(1.18, 48, 32);
        torsoGeo.scale(0.92, 0.86, 2.65);
        const torso = new THREE.Mesh(torsoGeo, bodyMat);
        sharkGroup.add(torso);

        // Smooth Snout / Head
        const snoutGeo = new THREE.SphereGeometry(0.92, 36, 24);
        snoutGeo.scale(0.88, 0.72, 1.85);
        const snout = new THREE.Mesh(snoutGeo, bodyMat);
        snout.position.set(0, 0.14, -2.25);
        sharkGroup.add(snout);

        // Upper Gumline & Teeth
        const upperGum = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.08, 10, 24, Math.PI), gumMat);
        upperGum.rotation.x = Math.PI / 2;
        upperGum.position.set(0, -0.08, -2.35);
        sharkGroup.add(upperGum);

        const toothGeo = new THREE.ConeGeometry(0.055, 0.2, 8);
        for (let i = 0; i < 9; i++) {
            const ang = (i / 8) * Math.PI;
            const tooth = new THREE.Mesh(toothGeo, toothMat);
            tooth.position.set(Math.cos(ang) * 0.44, -0.18, -2.35 - Math.sin(ang) * 0.44);
            tooth.rotation.x = Math.PI;
            sharkGroup.add(tooth);
        }

        // Articulated Lower Jaw with Teeth
        sharkJaw = new THREE.Group();
        sharkJaw.position.set(0, -0.24, -1.75);
        const jawGeo = new THREE.SphereGeometry(0.55, 24, 16);
        jawGeo.scale(0.82, 0.35, 1.45);
        const jawMesh = new THREE.Mesh(jawGeo, bellyMat);
        jawMesh.position.z = -0.55;
        sharkJaw.add(jawMesh);

        for (let i = 0; i < 7; i++) {
            const ang = (i / 6) * Math.PI;
            const lTooth = new THREE.Mesh(toothGeo, toothMat);
            lTooth.position.set(Math.cos(ang) * 0.38, 0.08, -0.55 - Math.sin(ang) * 0.38);
            sharkJaw.add(lTooth);
        }
        sharkGroup.add(sharkJaw);

        // 5 Pairs of Recessed Gill Slits
        const gillGeo = new THREE.BoxGeometry(0.06, 0.52, 0.08);
        for (let g = 0; g < 5; g++) {
            const zPos = -1.25 + g * 0.19;
            const lg = new THREE.Mesh(gillGeo, darkMat);
            lg.position.set(-0.92, -0.05, zPos);
            lg.rotation.z = 0.12;
            const rg = new THREE.Mesh(gillGeo, darkMat);
            rg.position.set(0.92, -0.05, zPos);
            rg.rotation.z = -0.12;
            sharkGroup.add(lg, rg);
        }

        // High-Detail Cybernetic Eyes (socket + glowing iris)
        const eyeRingGeo = new THREE.TorusGeometry(0.18, 0.04, 12, 24);
        const eyeGeo = new THREE.SphereGeometry(0.15, 20, 20);
        [-1, 1].forEach((side) => {
            const ring = new THREE.Mesh(eyeRingGeo, darkMat);
            ring.position.set(side * 0.66, 0.26, -2.18);
            ring.rotation.y = side * 1.15;
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(side * 0.64, 0.26, -2.18);
            sharkGroup.add(ring, eye);
        });

        // Swept Primary Dorsal Fin + Secondary Dorsal Fin
        const dorsalGeo = new THREE.ConeGeometry(0.62, 1.85, 24);
        dorsalGeo.scale(0.18, 1, 1.25);
        const dorsal = new THREE.Mesh(dorsalGeo, finMat);
        dorsal.position.set(0, 1.32, 0.15);
        dorsal.rotation.x = 0.36;
        sharkGroup.add(dorsal);

        const dorsal2 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.65, 16), finMat);
        dorsal2.scale.set(0.2, 1, 1.1);
        dorsal2.position.set(0, 0.72, 1.85);
        dorsal2.rotation.x = 0.4;
        sharkGroup.add(dorsal2);

        // Swept Pectoral Fins + Pelvic Fins
        const pecGeo = new THREE.ConeGeometry(0.65, 2.05, 20);
        pecGeo.scale(0.16, 1, 0.85);
        [-1, 1].forEach((side) => {
            const pec = new THREE.Mesh(pecGeo, finMat);
            pec.position.set(side * 1.12, -0.3, -0.45);
            pec.rotation.z = -side * 1.22;
            pec.rotation.y = -side * 0.35;
            sharkGroup.add(pec);

            const pelv = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 12), finMat);
            pelv.scale.set(0.16, 1, 0.8);
            pelv.position.set(side * 0.55, -0.58, 1.15);
            pelv.rotation.z = -side * 1.1;
            sharkGroup.add(pelv);
        });

        // Articulated Crescent Caudal (Tail) Fin
        sharkTail = new THREE.Group();
        sharkTail.position.set(0, 0, 2.45);
        const tailStemGeo = new THREE.ConeGeometry(0.58, 1.9, 24);
        tailStemGeo.rotateX(Math.PI / 2);
        const tailStem = new THREE.Mesh(tailStemGeo, bodyMat);
        tailStem.position.z = 0.8;
        sharkTail.add(tailStem);

        const tailFinGeo = new THREE.BoxGeometry(0.14, 2.2, 1.1);
        const tailFin = new THREE.Mesh(tailFinGeo, finMat);
        tailFin.position.set(0, 0.2, 1.65);
        tailFin.rotation.x = -0.25;
        sharkTail.add(tailFin);
        sharkGroup.add(sharkTail);

        // --- Mutation Attachments (hidden until unlocked) ---
        // 1. Laser Emitters
        sharkLaserGroup = new THREE.Group();
        const emitterGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.5, 8);
        emitterGeo.rotateX(Math.PI / 2);
        const emitterMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        const le = new THREE.Mesh(emitterGeo, emitterMat);
        le.position.set(-0.65, 0.35, -2.2);
        const re = new THREE.Mesh(emitterGeo, emitterMat);
        re.position.set(0.65, 0.35, -2.2);
        sharkLaserGroup.add(le, re);
        sharkLaserGroup.visible = false;
        sharkGroup.add(sharkLaserGroup);

        // 2. Jet Thrusters
        sharkJetGroup = new THREE.Group();
        const jetGeo = new THREE.CylinderGeometry(0.24, 0.32, 1.1, 10);
        jetGeo.rotateX(Math.PI / 2);
        const jetMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7 });
        const lj = new THREE.Mesh(jetGeo, jetMat);
        lj.position.set(-0.85, 0.45, 0.9);
        const rj = new THREE.Mesh(jetGeo, jetMat);
        rj.position.set(0.85, 0.45, 0.9);
        sharkJetGroup.add(lj, rj);
        sharkJetGroup.visible = false;
        sharkGroup.add(sharkJetGroup);

        // 3. Plasma Shield
        const shieldGeo = new THREE.SphereGeometry(2.8, 18, 14);
        const shieldMat = new THREE.MeshBasicMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.22,
            wireframe: true
        });
        sharkShieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        sharkShieldMesh.visible = false;
        sharkGroup.add(sharkShieldMesh);

        // 4. Electric Aura
        const auraGeo = new THREE.TorusGeometry(2.9, 0.08, 8, 32);
        const auraMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.7 });
        sharkAuraMesh = new THREE.Mesh(auraGeo, auraMat);
        sharkAuraMesh.rotation.x = Math.PI / 2;
        sharkAuraMesh.visible = false;
        sharkGroup.add(sharkAuraMesh);

        // 5. Armored Scales
        sharkScalesGroup = new THREE.Group();
        const scaleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });
        for (let i = 0; i < 4; i++) {
            const plate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.55), scaleMat);
            plate.position.set(0, 0.82, -1.0 + i * 0.75);
            sharkScalesGroup.add(plate);
        }
        sharkScalesGroup.visible = false;
        sharkGroup.add(sharkScalesGroup);

        // 6. Missile Pods
        sharkMissileGroup = new THREE.Group();
        const podMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, metalness: 0.6 });
        const lpod = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.9), podMat);
        lpod.position.set(-0.7, 0.85, -0.2);
        const rpod = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.9), podMat);
        rpod.position.set(0.7, 0.85, -0.2);
        sharkMissileGroup.add(lpod, rpod);
        sharkMissileGroup.visible = false;
        sharkGroup.add(sharkMissileGroup);

        // 7. Cyber-Flashlight (SpotLight pointing -Z)
        sharkFlashlight = new THREE.SpotLight(0xa5f3fc, 2.8, 75, Math.PI / 5, 0.45, 1.2);
        sharkFlashlight.position.set(0, 0.45, -2.5);
        const flashTarget = new THREE.Object3D();
        flashTarget.position.set(0, 0, -20);
        sharkGroup.add(flashTarget);
        sharkFlashlight.target = flashTarget;
        sharkGroup.add(sharkFlashlight);

        scene.add(sharkGroup);
    }

    // ==================== ENTITIES ====================
    const preys = [];
    const enemies = [];
    const friendlySharks = [];
    const projectiles = [];
    const particles = [];
    const acidClouds = [];

    function spawnFriendlySharks() {
        for (const f of friendlySharks) scene.remove(f.mesh);
        friendlySharks.length = 0;

        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.4 });
        const bellyMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.5 });
        const finMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.4 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00f5a0 });

        for (let i = 0; i < 3; i++) {
            const g = new THREE.Group();
            const torso = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), bodyMat);
            torso.scale.set(0.9, 0.85, 2.4);
            const belly = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 10), bellyMat);
            belly.scale.set(0.8, 0.5, 2.1);
            belly.position.y = -0.28;
            const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.3, 8), finMat);
            dorsal.scale.set(0.2, 1, 1);
            dorsal.position.set(0, 1.0, 0.2);
            const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMat);
            eyeL.position.set(-0.5, 0.2, -1.5);
            const eyeR = eyeL.clone();
            eyeR.position.x = 0.5;
            g.add(torso, belly, dorsal, eyeL, eyeR);

            const ang = (i / 3) * Math.PI * 2;
            g.position.set(AQUARIUM_POS.x + Math.cos(ang) * 20, AQUARIUM_POS.y + 2, AQUARIUM_POS.z + Math.sin(ang) * 20);
            scene.add(g);
            friendlySharks.push({ mesh: g, pos: g.position, angle: ang, biteCooldown: 0 });
        }
    }

    function spawnPrey() {
        if (preys.length >= 38) return;
        const type = PREY_TYPES[Math.floor(Math.random() * PREY_TYPES.length)];
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: type.color, roughness: 0.35, metalness: 0.2 });
        const finMat = new THREE.MeshStandardMaterial({ color: type.color, roughness: 0.45, transparent: true, opacity: 0.85 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x020617 });

        const s = type.size;
        const body = new THREE.Mesh(new THREE.SphereGeometry(s * 0.65, 20, 14), mat);
        body.scale.set(0.72, 0.88, 1.65);
        group.add(body);

        // Dorsal & Pectoral Fins
        const dorsal = new THREE.Mesh(new THREE.ConeGeometry(s * 0.3, s * 0.7, 6), finMat);
        dorsal.scale.set(0.2, 1, 1.2);
        dorsal.position.set(0, s * 0.68, 0);
        group.add(dorsal);

        [-1, 1].forEach((side) => {
            const pec = new THREE.Mesh(new THREE.ConeGeometry(s * 0.22, s * 0.6, 5), finMat);
            pec.scale.set(0.2, 1, 0.8);
            pec.position.set(side * s * 0.48, -s * 0.1, -s * 0.15);
            pec.rotation.z = -side * 1.1;
            group.add(pec);

            const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.14, 10, 10), eyeMat);
            eye.position.set(side * s * 0.34, s * 0.15, -s * 0.72);
            const pupil = new THREE.Mesh(new THREE.SphereGeometry(s * 0.08, 8, 8), pupilMat);
            pupil.position.set(side * s * 0.42, s * 0.15, -s * 0.76);
            group.add(eye, pupil);
        });

        // Forked Tail Fin
        const tail = new THREE.Mesh(new THREE.ConeGeometry(s * 0.48, s * 0.85, 6), finMat);
        tail.scale.set(0.22, 1, 1);
        tail.rotation.x = Math.PI / 2;
        tail.position.z = s * 1.05;
        group.add(tail);

        const ang = Math.random() * Math.PI * 2;
        const rad = 10 + Math.random() * (ARENA_RADIUS - 18);
        const y = type.bottomWalker ? FLOOR_Y + 1.5 : FLOOR_Y + 5 + Math.random() * (SURFACE_Y - FLOOR_Y - 10);
        group.position.set(Math.cos(ang) * rad, y, Math.sin(ang) * rad);

        scene.add(group);
        preys.push({
            mesh: group,
            type,
            pos: group.position,
            yaw: Math.random() * Math.PI * 2,
            turnTimer: 1 + Math.random() * 2
        });
    }

    function spawnEnemy() {
        const maxEnemies = 8 + Math.floor(state.difficulty * 2);
        if (enemies.length >= maxEnemies) return;

        const pool = state.difficulty < 1.5 ? ENEMY_TYPES.slice(0, 3) : ENEMY_TYPES;
        const type = pool[Math.floor(Math.random() * pool.length)];
        const group = new THREE.Group();

        if (type.id === 'mine') {
            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(type.size * 0.7, 18, 14),
                new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.25 })
            );
            const core = new THREE.Mesh(
                new THREE.SphereGeometry(type.size * 0.35, 10, 10),
                new THREE.MeshBasicMaterial({ color: 0xff0033 })
            );
            group.add(sphere, core);
            const spikeMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85 });
            for (let s = 0; s < 10; s++) {
                const spike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 6), spikeMat);
                const phi = Math.acos(1 - 2 * (s + 0.5) / 10);
                const theta = Math.PI * (1 + Math.sqrt(5)) * s;
                spike.position.setFromSphericalCoords(type.size * 0.82, phi, theta);
                spike.lookAt(spike.position.clone().multiplyScalar(2));
                spike.rotateX(Math.PI / 2);
                group.add(spike);
            }
        } else if (type.id === 'toxic') {
            const barrel = new THREE.Mesh(
                new THREE.CylinderGeometry(type.size * 0.55, type.size * 0.55, type.size * 1.4, 16),
                new THREE.MeshStandardMaterial({ color: 0x84cc16, emissive: 0x3f6212, roughness: 0.35 })
            );
            const rimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
            const rim1 = new THREE.Mesh(new THREE.TorusGeometry(type.size * 0.56, 0.1, 8, 18), rimMat);
            rim1.rotation.x = Math.PI / 2;
            rim1.position.y = type.size * 0.5;
            const rim2 = rim1.clone();
            rim2.position.y = -type.size * 0.5;
            group.add(barrel, rim1, rim2);
        } else if (type.id === 'diver') {
            const suitMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.4 });
            const armorMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.7, roughness: 0.25 });
            const visorMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
            const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.7), suitMat);
            const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 14), armorMat);
            helmet.position.y = 1.1;
            const visor = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.32, 0.35), visorMat);
            visor.position.set(0, 1.12, -0.35);
            const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.2, 10), armorMat);
            tank.position.set(-0.26, 0.1, 0.5);
            const tank2 = tank.clone();
            tank2.position.x = 0.26;
            const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 8), armorMat);
            gun.rotation.x = Math.PI / 2;
            gun.position.set(0.65, 0.2, -0.7);
            group.add(torso, helmet, visor, tank, tank2, gun);
        } else if (type.id === 'sentinel') {
            const hullMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, metalness: 0.75, roughness: 0.25 });
            const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.3 });
            const glowMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
            const core = new THREE.Mesh(new THREE.SphereGeometry(type.size * 0.55, 16, 14), hullMat);
            const ring = new THREE.Mesh(new THREE.TorusGeometry(type.size * 0.8, 0.14, 8, 24), darkMat);
            const eye = new THREE.Mesh(new THREE.SphereGeometry(type.size * 0.25, 10, 10), glowMat);
            eye.position.z = -type.size * 0.5;
            [-1, 1].forEach((side) => {
                const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 1.8, 10), darkMat);
                pod.rotation.x = Math.PI / 2;
                pod.position.set(side * type.size * 0.75, 0, 0);
                group.add(pod);
            });
            group.add(core, ring, eye);
        } else if (type.id === 'cyclops') {
            const relicMat = new THREE.MeshStandardMaterial({ color: 0x3b0764, metalness: 0.5, roughness: 0.4 });
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
            const body = new THREE.Mesh(new THREE.SphereGeometry(type.size * 0.65, 18, 14), relicMat);
            body.scale.set(1, 0.9, 1.6);
            const eye = new THREE.Mesh(new THREE.SphereGeometry(type.size * 0.32, 14, 14), eyeMat);
            eye.position.set(0, 0.2, -type.size * 0.85);
            [-1, 1].forEach((side) => {
                const wing = new THREE.Mesh(new THREE.ConeGeometry(type.size * 0.9, type.size * 2.2, 4), relicMat);
                wing.scale.set(0.15, 1, 1.1);
                wing.position.set(side * type.size * 1.1, 0.2, 0);
                wing.rotation.z = -side * 1.35;
                group.add(wing);
            });
            group.add(body, eye);
        } else {
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(type.size * 0.65, 16, 12),
                new THREE.MeshStandardMaterial({ color: type.color, metalness: 0.6, roughness: 0.3 })
            );
            body.scale.set(0.85, 0.75, 1.8);
            const visor = new THREE.Mesh(
                new THREE.SphereGeometry(type.size * 0.32, 10, 10),
                new THREE.MeshBasicMaterial({ color: 0xff0055 })
            );
            visor.position.z = -type.size * 0.95;
            group.add(body, visor);
        }

        const ang = Math.random() * Math.PI * 2;
        const rad = 25 + Math.random() * (ARENA_RADIUS - 30);
        const y = FLOOR_Y + 6 + Math.random() * (SURFACE_Y - FLOOR_Y - 12);
        group.position.set(Math.cos(ang) * rad, y, Math.sin(ang) * rad);

        scene.add(group);
        enemies.push({
            mesh: group,
            type,
            pos: group.position,
            hp: type.hp * (1 + (state.difficulty - 1) * 0.25),
            shootTimer: 1.5 + Math.random() * 2,
            yaw: Math.random() * Math.PI * 2
        });
    }

    function spawnBoss() {
        if (boss.active) return;
        boss.active = true;
        state.bossActive = true;
        boss.maxHp = 900 + state.difficulty * 250;
        boss.hp = boss.maxHp;
        boss.pos.set(0, 10, -ARENA_RADIUS + 18);

        const group = new THREE.Group();
        const hullMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.22 });
        const ribMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

        const hull = new THREE.Mesh(new THREE.SphereGeometry(5.5, 28, 20), hullMat);
        hull.scale.set(1.1, 0.85, 2.5);
        group.add(hull);

        // Armored Hull Ribs
        for (let r = -6; r <= 6; r += 4) {
            const rib = new THREE.Mesh(new THREE.TorusGeometry(5.3, 0.35, 8, 24), ribMat);
            rib.position.z = r;
            group.add(rib);
        }

        const eye = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 16), glowMat);
        eye.position.set(0, 0.6, -12.2);
        group.add(eye);

        const fin = new THREE.Mesh(new THREE.ConeGeometry(2.2, 6.5, 8), hullMat);
        fin.scale.set(0.2, 1, 1.4);
        fin.position.set(0, 5.8, 1);
        fin.rotation.x = 0.3;
        group.add(fin);

        [-1, 1].forEach((side) => {
            const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 5.5, 12), ribMat);
            pod.rotation.x = Math.PI / 2;
            pod.position.set(side * 6.2, -0.5, 0);
            group.add(pod);
        });

        boss.mesh = group;
        boss.mesh.position.copy(boss.pos);
        scene.add(boss.mesh);

        document.getElementById('bossHud').classList.remove('hidden');
        const alertEl = document.getElementById('bossAlert');
        alertEl.classList.remove('hidden');
        sfx.bossAlert();
        setTimeout(() => alertEl.classList.add('hidden'), 3200);
    }

    function spawnProjectile(pos, dir, speed, color, isPlayer, isMissile = false, damage = 25) {
        const geo = isMissile ? new THREE.ConeGeometry(0.35, 1.2, 8) : new THREE.SphereGeometry(0.32, 8, 8);
        if (isMissile) geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.lookAt(pos.clone().add(dir));
        scene.add(mesh);

        projectiles.push({
            mesh,
            pos: mesh.position,
            vel: dir.clone().normalize().multiplyScalar(speed),
            isPlayer,
            isMissile,
            damage,
            life: isMissile ? 4.5 : 2.5
        });
    }

    function spawnParticles(pos, color, count = 12, speed = 10) {
        const geo = new THREE.SphereGeometry(0.24, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color });
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            scene.add(mesh);
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * speed,
                (Math.random() - 0.5) * speed,
                (Math.random() - 0.5) * speed
            );
            particles.push({ mesh, vel, life: 0.5 + Math.random() * 0.4 });
        }
    }

    // ==================== INPUT ====================
    const keys = {};
    const touchState = { x: 0, y: 0, up: false, down: false };
    let pointerLocked = false;

    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Tab' || e.code === 'KeyU') {
            if (state.running) {
                e.preventDefault();
                toggleLab();
            }
        } else if (e.code === 'KeyI' && state.running) {
            toggleInventory();
        } else if (e.code === 'KeyL' && state.running && !state.paused) {
            toggleFlashlight();
        } else if (e.code === 'Escape') {
            if (!document.getElementById('inventoryModal').classList.contains('hidden')) {
                toggleInventory(false);
            } else if (!document.getElementById('labModal').classList.contains('hidden')) {
                toggleLab(false);
            } else if (state.running) {
                togglePause();
            }
        } else if (e.code === 'Space' && state.running && !state.paused) {
            e.preventDefault();
            triggerDash();
        } else if (e.code === 'KeyF' && state.running && !state.paused) {
            fireLasers();
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    canvas.addEventListener('mousedown', (e) => {
        if (!state.running || state.paused) return;
        if (e.button === 0) {
            fireLasers();
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!state.running || state.paused) return;
        if (document.pointerLockElement === canvas || e.buttons === 2) {
            player.yaw -= e.movementX * 0.0032;
            player.pitch = Math.max(-0.85, Math.min(0.85, player.pitch - e.movementY * 0.0028));
        }
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ==================== ACTIONS & MECHANICS ====================
    function triggerDash() {
        if (!state.upgrades.thruster || player.dashCooldown > 0) return;
        player.isDashing = true;
        player.dashTimer = 0.35;
        player.dashCooldown = 2.2;
        sfx.dash();
        spawnParticles(player.pos, 0x00e5ff, 14, 14);
    }

    function fireLasers() {
        if (!state.upgrades.lasers || player.laserCooldown > 0) return;
        player.laserCooldown = 0.22;
        sfx.laser();
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ'));
        const origin = player.pos.clone().add(forward.clone().multiplyScalar(2.4 * player.scale));
        spawnProjectile(origin, forward, 68, 0xff0055, true, false, 30 + player.level * 4);
    }

    function damagePlayer(amount) {
        if (player.invulnTimer > 0) return;
        if (state.upgrades.shield && state.shieldActive) {
            state.shieldActive = false;
            state.shieldTimer = 10;
            player.invulnTimer = 0.8;
            sfx.electric();
            spawnParticles(player.pos, 0x00e5ff, 18, 12);
            return;
        }
        const mult = state.upgrades.scales ? 0.6 : 1.0;
        player.health -= amount * mult;
        player.invulnTimer = 0.45;
        state.cameraShake = 0.55;
        sfx.hit();

        const vig = document.getElementById('vignette');
        vig.classList.add('damage');
        setTimeout(() => vig.classList.remove('damage'), 220);

        if (player.health <= 0) {
            player.health = 0;
            gameOver();
        }
    }

    function gainXp(amount) {
        player.xp += amount;
        while (player.xp >= player.nextLevelXp) {
            player.xp -= player.nextLevelXp;
            player.level++;
            player.nextLevelXp = Math.floor(player.nextLevelXp * 1.35);
            player.maxHealth += 25;
            player.health = player.maxHealth;
            player.scale = Math.min(2.2, 1.0 + (player.level - 1) * 0.14);
            sharkGroup.scale.setScalar(player.scale);
            sfx.upgrade();
            spawnParticles(player.pos, 0x00f5a0, 20, 14);
        }
    }

    // ==================== GAME LOOP ====================
    function update(dt) {
        if (!state.running || state.paused) return;

        state.difficultyTimer += dt;
        state.difficulty = 1 + state.difficultyTimer / 45;

        // Player Movement
        let turnInput = 0;
        if (keys['KeyA'] || keys['ArrowLeft']) turnInput += 1;
        if (keys['KeyD'] || keys['ArrowRight']) turnInput -= 1;
        turnInput -= touchState.x;
        player.yaw += turnInput * 2.3 * dt;

        let pitchInput = 0;
        if (keys['KeyQ']) pitchInput -= 1;
        if (keys['KeyE']) pitchInput += 1;
        if (touchState.up) pitchInput += 1;
        if (touchState.down) pitchInput -= 1;
        player.pitch = Math.max(-0.85, Math.min(0.85, player.pitch + pitchInput * 1.8 * dt));

        let moveInput = 0;
        if (keys['KeyW'] || keys['ArrowUp']) moveInput += 1;
        if (keys['KeyS'] || keys['ArrowDown']) moveInput -= 0.5;
        moveInput -= touchState.y;

        const maxSpd = player.isDashing ? player.baseMaxSpeed * 2.2 : player.baseMaxSpeed;
        const targetSpeed = moveInput * maxSpd;
        player.speed += (targetSpeed - player.speed) * Math.min(1, dt * 6);

        const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ'));
        player.pos.addScaledVector(forward, player.speed * dt);

        // Arena Bounds
        player.pos.y = Math.max(FLOOR_Y + 2, Math.min(SURFACE_Y - 1.5, player.pos.y));
        const horizLen = Math.hypot(player.pos.x, player.pos.z);
        if (horizLen > ARENA_RADIUS - 3) {
            const scaleBack = (ARENA_RADIUS - 3) / horizLen;
            player.pos.x *= scaleBack;
            player.pos.z *= scaleBack;
        }

        // Update Shark Mesh & Animations
        sharkGroup.position.copy(player.pos);
        sharkGroup.rotation.set(player.pitch, player.yaw, -turnInput * 0.28, 'YXZ');
        sharkLight.position.copy(player.pos).add(new THREE.Vector3(0, 4, 0));

        const t = performance.now() * 0.001;
        const swimFreq = 5 + Math.abs(player.speed) * 0.45;
        sharkTail.rotation.y = Math.sin(t * swimFreq) * 0.35;

        if (player.jawTimer > 0) {
            player.jawTimer -= dt;
            sharkJaw.rotation.x = Math.sin((player.jawTimer / 0.25) * Math.PI) * 0.55;
        } else {
            sharkJaw.rotation.x = 0;
        }

        // Cooldowns & Upgrades
        if (player.dashCooldown > 0) player.dashCooldown -= dt;
        if (player.dashTimer > 0) {
            player.dashTimer -= dt;
            if (player.dashTimer <= 0) player.isDashing = false;
        }
        if (player.laserCooldown > 0) player.laserCooldown -= dt;
        if (player.invulnTimer > 0) player.invulnTimer -= dt;

        if (state.upgrades.shield && !state.shieldActive) {
            state.shieldTimer -= dt;
            if (state.shieldTimer <= 0) state.shieldActive = true;
        }
        sharkShieldMesh.visible = state.upgrades.shield && state.shieldActive;
        if (sharkShieldMesh.visible) sharkShieldMesh.rotation.y += dt * 1.2;

        if (state.upgrades.electric) {
            sharkAuraMesh.visible = true;
            sharkAuraMesh.rotation.z += dt * 3;
            state.electricTimer -= dt;
            if (state.electricTimer <= 0) {
                state.electricTimer = 3.5;
                sfx.electric();
                spawnParticles(player.pos, 0xfacc15, 12, 16);
                for (let i = enemies.length - 1; i >= 0; i--) {
                    if (enemies[i].pos.distanceTo(player.pos) < 16) {
                        enemies[i].hp -= 35;
                        if (enemies[i].hp <= 0) destroyEnemy(i);
                    }
                }
            }
        }

        if (state.upgrades.acid) {
            state.acidTimer -= dt;
            if (state.acidTimer <= 0 && Math.abs(player.speed) > 4) {
                state.acidTimer = 0.55;
                const cloud = new THREE.Mesh(
                    new THREE.SphereGeometry(2.2, 8, 8),
                    new THREE.MeshBasicMaterial({ color: 0x84cc16, transparent: true, opacity: 0.35 })
                );
                cloud.position.copy(player.pos);
                scene.add(cloud);
                acidClouds.push({ mesh: cloud, life: 3.5 });
            }
        }

        if (state.upgrades.missiles && (enemies.length > 0 || boss.active)) {
            state.missileTimer -= dt;
            if (state.missileTimer <= 0) {
                state.missileTimer = 2.6;
                let target = boss.active ? boss.pos : enemies[0].pos;
                let bestD = Infinity;
                if (!boss.active) {
                    for (const e of enemies) {
                        const d = e.pos.distanceTo(player.pos);
                        if (d < bestD) { bestD = d; target = e.pos; }
                    }
                }
                const dir = target.clone().sub(player.pos).normalize();
                sfx.missile();
                spawnProjectile(player.pos.clone(), dir, 38, 0x00f5a0, true, true, 45);
            }
        }

        // Third-Person Camera
        const camDist = (player.isDashing ? 16 : 13) * (0.85 + player.scale * 0.25);
        const camOffset = new THREE.Vector3(0, 3.8 * player.scale, camDist).applyEuler(new THREE.Euler(player.pitch * 0.6, player.yaw, 0, 'YXZ'));
        const desiredPos = player.pos.clone().add(camOffset);
        desiredPos.y = Math.max(FLOOR_Y + 1.5, Math.min(SURFACE_Y - 1, desiredPos.y));
        camCurrentPos.lerp(desiredPos, Math.min(1, dt * 8));

        const lookTarget = player.pos.clone().add(forward.clone().multiplyScalar(8));
        camCurrentLook.lerp(lookTarget, Math.min(1, dt * 10));

        camera.position.copy(camCurrentPos);
        if (state.cameraShake > 0) {
            state.cameraShake -= dt * 2.5;
            camera.position.x += (Math.random() - 0.5) * state.cameraShake;
            camera.position.y += (Math.random() - 0.5) * state.cameraShake;
        }
        camera.lookAt(camCurrentLook);

        // BS-07 Aquarium Base Regen & Defense Turret
        const inAquarium = player.pos.distanceTo(AQUARIUM_POS) < 11;
        if (inAquarium && state.upgrades.aquariumRegen && player.health < player.maxHealth) {
            player.health = Math.min(player.maxHealth, player.health + 18 * dt);
        }
        if (state.upgrades.aquariumTurret && enemies.length > 0) {
            state.turretTimer = (state.turretTimer || 0) - dt;
            if (state.turretTimer <= 0) {
                const near = enemies.find(e => e.pos.distanceTo(AQUARIUM_POS) < 42);
                if (near) {
                    state.turretTimer = 1.4;
                    const dir = near.pos.clone().sub(AQUARIUM_POS).normalize();
                    spawnProjectile(AQUARIUM_POS.clone().add(new THREE.Vector3(0, 5, 0)), dir, 55, 0x00e5ff, true, false, 35);
                }
            }
        }

        // Tutorial Step 1: Exit BS-07 Aquarium Bay
        if (tutorial.active && tutorial.step === 0 && player.pos.z < 2) {
            tutorial.step = 1;
            document.getElementById('tutText').textContent = 'Step 2: Swim into 2 fish to devour them and gather Biomass!';
            sfx.upgrade();
        }

        // Spawning
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
            state.spawnTimer = 1.1;
            spawnPrey();
            spawnEnemy();
        }

        if (!boss.active && state.score >= state.nextBossScore) {
            spawnBoss();
        }

        // Friendly Guard Sharks defending BS-07
        for (const f of friendlySharks) {
            if (f.biteCooldown > 0) f.biteCooldown -= dt;
            let targetIdx = -1;
            let bestDist = 55;
            for (let i = 0; i < enemies.length; i++) {
                const d = enemies[i].pos.distanceTo(AQUARIUM_POS);
                if (d < bestDist) { bestDist = d; targetIdx = i; }
            }
            if (targetIdx !== -1) {
                const targetPos = enemies[targetIdx].pos;
                const dir = targetPos.clone().sub(f.pos).normalize();
                f.pos.addScaledVector(dir, 14 * dt);
                f.mesh.lookAt(targetPos);
                if (f.pos.distanceTo(targetPos) < 3.2 && f.biteCooldown <= 0) {
                    f.biteCooldown = 0.7;
                    enemies[targetIdx].hp -= 35;
                    spawnParticles(targetPos, 0x00f5a0, 8, 8);
                    if (enemies[targetIdx].hp <= 0) destroyEnemy(targetIdx);
                }
            } else {
                f.angle += dt * 0.45;
                const patrolPos = new THREE.Vector3(
                    AQUARIUM_POS.x + Math.cos(f.angle) * 22,
                    AQUARIUM_POS.y + Math.sin(f.angle * 2) * 3,
                    AQUARIUM_POS.z + Math.sin(f.angle) * 22
                );
                const dir = patrolPos.clone().sub(f.pos).normalize();
                f.pos.addScaledVector(dir, 10 * dt);
                f.mesh.lookAt(patrolPos);
            }
        }

        // Update Preys
        const eatRadius = 2.6 * player.scale;
        for (let i = preys.length - 1; i >= 0; i--) {
            const p = preys[i];
            p.turnTimer -= dt;
            if (p.turnTimer <= 0) {
                p.turnTimer = 1.5 + Math.random() * 2;
                p.yaw += (Math.random() - 0.5) * 2.2;
            }
            p.pos.x += Math.sin(p.yaw) * p.type.speed * dt;
            p.pos.z += Math.cos(p.yaw) * p.type.speed * dt;
            p.mesh.rotation.y = p.yaw + Math.PI;

            if (p.pos.distanceTo(player.pos) < eatRadius + p.type.size * 0.5) {
                state.biomass += p.type.biomass;
                state.coins += p.type.biomass * 2;
                localStorage.setItem('battlesharks_coins', String(state.coins));
                state.score += p.type.score;
                player.health = Math.min(player.maxHealth, player.health + 6 + p.type.biomass * 2);
                player.jawTimer = 0.25;
                gainXp(p.type.score * 1.4);
                sfx.chomp();
                spawnParticles(p.pos, p.type.color, 8, 8);
                scene.remove(p.mesh);
                preys.splice(i, 1);
                if (tutorial.active && tutorial.step === 1) {
                    tutorial.preyEaten++;
                    if (tutorial.preyEaten >= 2) {
                        tutorial.step = 2;
                        document.getElementById('tutText').textContent = 'Step 3: Bite or Laser (Click/F) an enemy mine or diver!';
                        sfx.upgrade();
                    }
                }
            }
        }

        // Update Enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            const dist = e.pos.distanceTo(player.pos);

            if (!e.type.isStatic) {
                if (e.type.shoots && dist < 55) {
                    const dir = player.pos.clone().sub(e.pos).normalize();
                    e.pos.addScaledVector(dir, e.type.speed * 0.65 * dt);
                    e.mesh.lookAt(player.pos);
                    e.shootTimer -= dt;
                    if (e.shootTimer <= 0) {
                        e.shootTimer = 2.2;
                        spawnProjectile(e.pos.clone(), dir, 28, 0xff4d6d, false, false, e.type.damage);
                    }
                } else {
                    e.pos.x += Math.sin(e.yaw) * e.type.speed * dt;
                    e.pos.z += Math.cos(e.yaw) * e.type.speed * dt;
                }
            }

            if (dist < eatRadius + e.type.size * 0.65) {
                player.jawTimer = 0.25;
                sfx.chomp();
                if (player.isDashing) {
                    destroyEnemy(i);
                } else {
                    // Bite enemy!
                    e.hp -= 45 + player.level * 10;
                    spawnParticles(e.pos, 0xff4d6d, 10, 10);
                    if (e.hp <= 0) {
                        destroyEnemy(i);
                    } else {
                        damagePlayer(e.type.damage * 0.5);
                    }
                }
            }
        }

        // Update Boss
        if (boss.active && boss.mesh) {
            boss.angle += dt * 0.5;
            boss.pos.x = Math.sin(boss.angle) * 35;
            boss.pos.z = Math.cos(boss.angle) * 35;
            boss.mesh.position.copy(boss.pos);
            boss.mesh.lookAt(player.pos);

            boss.shootTimer -= dt;
            if (boss.shootTimer <= 0) {
                boss.shootTimer = 1.6;
                const dir = player.pos.clone().sub(boss.pos).normalize();
                spawnProjectile(boss.pos.clone(), dir, 34, 0xff0044, false, false, 28);
            }

            if (boss.pos.distanceTo(player.pos) < 6.5 + eatRadius) {
                damagePlayer(35);
            }
        }

        // Update Projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const pr = projectiles[i];
            pr.life -= dt;
            pr.pos.addScaledVector(pr.vel, dt);
            pr.mesh.position.copy(pr.pos);

            let hit = false;
            if (pr.isPlayer) {
                for (let j = enemies.length - 1; j >= 0; j--) {
                    if (pr.pos.distanceTo(enemies[j].pos) < enemies[j].type.size + 1.2) {
                        enemies[j].hp -= pr.damage;
                        if (enemies[j].hp <= 0) destroyEnemy(j);
                        hit = true;
                        break;
                    }
                }
                if (!hit && boss.active && pr.pos.distanceTo(boss.pos) < 6.5) {
                    boss.hp -= pr.damage;
                    hit = true;
                    spawnParticles(pr.pos, 0xff0055, 8, 10);
                    if (boss.hp <= 0) defeatBoss();
                }
            } else {
                if (pr.pos.distanceTo(player.pos) < 2.2 * player.scale) {
                    damagePlayer(pr.damage);
                    hit = true;
                }
            }

            if (hit || pr.life <= 0) {
                scene.remove(pr.mesh);
                projectiles.splice(i, 1);
            }
        }

        // Update Acid Clouds
        for (let i = acidClouds.length - 1; i >= 0; i--) {
            const c = acidClouds[i];
            c.life -= dt;
            for (let j = enemies.length - 1; j >= 0; j--) {
                if (enemies[j].pos.distanceTo(c.mesh.position) < 3.5) {
                    enemies[j].hp -= 25 * dt;
                    if (enemies[j].hp <= 0) destroyEnemy(j);
                }
            }
            if (c.life <= 0) {
                scene.remove(c.mesh);
                acidClouds.splice(i, 1);
            }
        }

        // Update Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const pt = particles[i];
            pt.life -= dt;
            pt.mesh.position.addScaledVector(pt.vel, dt);
            pt.mesh.scale.setScalar(Math.max(0.01, pt.life * 1.5));
            if (pt.life <= 0) {
                scene.remove(pt.mesh);
                particles.splice(i, 1);
            }
        }

        // Depth-Driven Atmosphere (Subnautica-style biome transition)
        const depthNorm = Math.max(0, Math.min(1, (SURFACE_Y - player.pos.y) / (SURFACE_Y - FLOOR_Y)));
        const shallowCol = new THREE.Color(0x042f4b);
        const abyssCol = new THREE.Color(0x010712);
        const curCol = shallowCol.lerp(abyssCol, depthNorm);
        scene.background.copy(curCol);
        scene.fog.color.copy(curCol);
        scene.fog.density = 0.0085 + depthNorm * 0.0065;

        // Environment Animation
        for (const k of kelpList) {
            k.rotation.z = Math.sin(t * 1.4 + k.userData.phase) * 0.12;
        }
        if (waterSurface) {
            waterSurface.position.y = SURFACE_Y + Math.sin(t * 1.5) * 0.35;
        }

        updateHUD();
        drawRadar();
    }

    function destroyEnemy(index) {
        const e = enemies[index];
        state.debris += e.type.debris;
        state.coins += e.type.debris * 3;
        localStorage.setItem('battlesharks_coins', String(state.coins));
        state.score += e.type.debris * 15;
        if (Math.random() < 0.35) state.mutagens += 1;
        gainXp(35);
        sfx.explosion();
        spawnParticles(e.pos, 0xff7b54, 16, 15);
        scene.remove(e.mesh);
        enemies.splice(index, 1);
        if (tutorial.active && tutorial.step === 2) {
            tutorial.active = false;
            localStorage.setItem('battlesharks_tut_done', 'true');
            state.score += 150;
            state.biomass += 10;
            state.debris += 5;
            sfx.upgrade();
            document.getElementById('tutText').textContent = '✅ BS-07 Tutorial Complete! (+150 Score, +10 Biomass, +5 Debris)';
            setTimeout(() => document.getElementById('tutorialBanner').classList.add('hidden'), 3200);
        }
    }

    function defeatBoss() {
        boss.active = false;
        state.bossActive = false;
        state.score += 1000;
        state.debris += 25;
        state.mutagens += 4;
        state.nextBossScore = state.score + 1200;
        sfx.explosion();
        spawnParticles(boss.pos, 0xff0044, 40, 24);
        scene.remove(boss.mesh);
        boss.mesh = null;
        document.getElementById('bossHud').classList.add('hidden');
    }

    // ==================== HUD & RADAR ====================
    const radarCanvas = document.getElementById('radarCanvas');
    const rCtx = radarCanvas.getContext('2d');

    function drawRadar() {
        const w = radarCanvas.width;
        const h = radarCanvas.height;
        const cx = w / 2;
        const cy = h / 2;
        rCtx.clearRect(0, 0, w, h);

        rCtx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
        rCtx.beginPath();
        rCtx.arc(cx, cy, cx * 0.5, 0, Math.PI * 2);
        rCtx.stroke();

        const scale = (cx - 6) / ARENA_RADIUS;
        const cosY = Math.cos(-player.yaw);
        const sinY = Math.sin(-player.yaw);

        const plot = (pos, color, r) => {
            const dx = pos.x - player.pos.x;
            const dz = pos.z - player.pos.z;
            const rx = (dx * cosY - dz * sinY) * scale;
            const rz = (dx * sinY + dz * cosY) * scale;
            rCtx.fillStyle = color;
            rCtx.beginPath();
            rCtx.arc(cx + rx, cy + rz, r, 0, Math.PI * 2);
            rCtx.fill();
        };

        for (const p of preys) plot(p.pos, '#38bdf8', 2);
        for (const e of enemies) plot(e.pos, '#ff4d6d', 3);
        if (boss.active) plot(boss.pos, '#facc15', 5);

        rCtx.fillStyle = '#00f5a0';
        rCtx.beginPath();
        rCtx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        rCtx.fill();
    }

    function updateHUD() {
        document.getElementById('hudLevel').textContent = `LVL ${player.level}`;
        document.getElementById('healthBar').style.width = `${(player.health / player.maxHealth) * 100}%`;
        document.getElementById('healthText').textContent = `${Math.ceil(player.health)} / ${player.maxHealth} HP`;
        document.getElementById('xpBar').style.width = `${(player.xp / player.nextLevelXp) * 100}%`;
        document.getElementById('xpText').textContent = `XP ${Math.floor(player.xp)} / ${player.nextLevelXp}`;
        document.getElementById('hudScore').textContent = state.score;
        document.getElementById('hudCoins').textContent = state.coins;
        document.getElementById('hudBiomass').textContent = state.biomass;
        const depthM = Math.max(0, Math.round(SURFACE_Y - player.pos.y));
        document.getElementById('hudDepth').textContent = `${depthM}m`;
        const biomeName = depthM < 45 ? 'BS-07 Shallows' : depthM < 130 ? 'Sunken Ruins' : depthM < 220 ? 'Deep Trenches' : 'Abyssal Caverns';
        document.getElementById('hudBiome').textContent = biomeName;
        document.getElementById('hudDebris').textContent = state.debris;
        document.getElementById('hudMutagens').textContent = state.mutagens;

        const shieldPill = document.getElementById('pillShield');
        if (state.upgrades.shield) {
            shieldPill.classList.remove('hidden');
            shieldPill.classList.toggle('cooldown', !state.shieldActive);
            shieldPill.textContent = state.shieldActive ? '🛡️ SHIELD READY' : `🛡️ ${Math.ceil(state.shieldTimer)}s`;
        }

        const dashPill = document.getElementById('pillDash');
        if (state.upgrades.thruster) {
            dashPill.classList.remove('hidden');
            dashPill.classList.toggle('cooldown', player.dashCooldown > 0);
            dashPill.textContent = player.dashCooldown <= 0 ? '⚡ JET READY' : `⚡ ${player.dashCooldown.toFixed(1)}s`;
        }

        if (boss.active) {
            document.getElementById('bossHealthBar').style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
        }

        const canAffordAny = UPGRADE_DEFS.some(u => !state.upgrades[u.id] &&
            state.biomass >= u.cost.biomass && state.debris >= u.cost.debris && state.mutagens >= u.cost.mutagens);
        document.getElementById('labBadge').classList.toggle('hidden', !canAffordAny);
    }

    // ==================== UPGRADE LAB ====================
    function renderLab() {
        document.getElementById('labBiomass').textContent = state.biomass;
        document.getElementById('labDebris').textContent = state.debris;
        document.getElementById('labMutagens').textContent = state.mutagens;

        const grid = document.getElementById('upgradesGrid');
        grid.innerHTML = '';
        for (const u of UPGRADE_DEFS) {
            const owned = state.upgrades[u.id];
            const canAfford = state.biomass >= u.cost.biomass && state.debris >= u.cost.debris && state.mutagens >= u.cost.mutagens;

            const card = document.createElement('div');
            card.className = `upgrade-item ${owned ? 'owned' : ''}`;
            card.innerHTML = `
                <div>
                    <div class="upgrade-title">${u.name}</div>
                    <div class="upgrade-desc">${u.desc}</div>
                </div>
                <div class="upgrade-cost">🧬 ${u.cost.biomass} &nbsp; ⚙️ ${u.cost.debris} &nbsp; 🧪 ${u.cost.mutagens}</div>
                <button class="upgrade-btn" ${owned || !canAfford ? 'disabled' : ''}>
                    ${owned ? 'EQUIPPED' : 'MUTATE'}
                </button>
            `;
            if (!owned && canAfford) {
                card.querySelector('button').addEventListener('click', () => {
                    state.biomass -= u.cost.biomass;
                    state.debris -= u.cost.debris;
                    state.mutagens -= u.cost.mutagens;
                    state.upgrades[u.id] = true;
                    if (u.id === 'shield') state.shieldActive = true;
                    if (u.id === 'lasers') sharkLaserGroup.visible = true;
                    if (u.id === 'thruster') sharkJetGroup.visible = true;
                    if (u.id === 'scales') sharkScalesGroup.visible = true;
                    if (u.id === 'missiles') sharkMissileGroup.visible = true;
                    sfx.upgrade();
                    renderLab();
                });
            }
            grid.appendChild(card);
        }
    }

    function toggleFlashlight() {
        flashlightOn = !flashlightOn;
        if (sharkFlashlight) {
            const mk2 = state.upgrades.flashlightMK2;
            sharkFlashlight.intensity = flashlightOn ? (mk2 ? 5.2 : 2.8) : 0;
            sharkFlashlight.distance = mk2 ? 140 : 75;
            sharkFlashlight.angle = mk2 ? Math.PI / 3.5 : Math.PI / 5;
        }
        sfx.tone(flashlightOn ? 720 : 420, 'sine', 0.08, 0.1);
        if (!document.getElementById('inventoryModal').classList.contains('hidden')) {
            renderInventory();
        }
    }

    function renderInventory() {
        const grid = document.getElementById('inventoryGrid');
        grid.innerHTML = '';

        // Flashlight item with ON/OFF toggle
        const flashCard = document.createElement('div');
        flashCard.className = 'upgrade-item owned';
        const mk2 = state.upgrades.flashlightMK2;
        flashCard.innerHTML = `
            <div>
                <div class="upgrade-title">🔦 Cyber-Flashlight ${mk2 ? 'MK-II' : 'MK-I'}</div>
                <div class="upgrade-desc">Illuminates deep caves &amp; abyssal trenches. Shortcut: <b>L</b></div>
            </div>
            <div class="upgrade-cost">Status: <b>${flashlightOn ? 'ON' : 'OFF'}</b></div>
            <button class="upgrade-btn">${flashlightOn ? 'TURN OFF' : 'TURN ON'}</button>
        `;
        flashCard.querySelector('button').addEventListener('click', toggleFlashlight);
        grid.appendChild(flashCard);

        // Equipped Upgrades
        for (const u of UPGRADE_DEFS) {
            if (!state.upgrades[u.id]) continue;
            const card = document.createElement('div');
            card.className = 'upgrade-item owned';
            card.innerHTML = `
                <div>
                    <div class="upgrade-title">${u.name}</div>
                    <div class="upgrade-desc">${u.desc}</div>
                </div>
                <div class="upgrade-cost">EQUIPPED</div>
            `;
            grid.appendChild(card);
        }
    }

    function renderShop() {
        document.getElementById('shopCoins').textContent = state.coins;
        const grid = document.getElementById('shopGrid');
        grid.innerHTML = '';
        for (const item of SHOP_ITEMS) {
            const owned = !!state.shopOwned[item.id];
            const canAfford = state.coins >= item.cost;
            const card = document.createElement('div');
            card.className = `upgrade-item ${owned ? 'owned' : ''}`;
            card.innerHTML = `
                <div>
                    <div class="upgrade-title">${item.name}</div>
                    <div class="upgrade-desc">${item.desc}</div>
                </div>
                <div class="upgrade-cost">🪙 ${item.cost} Coins</div>
                <button class="upgrade-btn" ${owned || !canAfford ? 'disabled' : ''}>
                    ${owned ? 'OWNED' : 'BUY'}
                </button>
            `;
            if (!owned && canAfford) {
                card.querySelector('button').addEventListener('click', () => {
                    state.coins -= item.cost;
                    state.shopOwned[item.id] = true;
                    localStorage.setItem('battlesharks_coins', String(state.coins));
                    localStorage.setItem('battlesharks_shop', JSON.stringify(state.shopOwned));
                    if (item.skin) applySharkSkin(item.skin);
                    sfx.upgrade();
                    renderShop();
                });
            }
            grid.appendChild(card);
        }
    }

    function toggleShop(force) {
        const modal = document.getElementById('shopModal');
        const open = force !== undefined ? force : modal.classList.contains('hidden');
        modal.classList.toggle('hidden', !open);
        state.paused = open;
        if (open) renderShop();
    }

    function toggleInventory(force) {
        const modal = document.getElementById('inventoryModal');
        const open = force !== undefined ? force : modal.classList.contains('hidden');
        modal.classList.toggle('hidden', !open);
        state.paused = open;
        if (open) renderInventory();
    }

    function toggleLab(force) {
        const modal = document.getElementById('labModal');
        const open = force !== undefined ? force : modal.classList.contains('hidden');
        modal.classList.toggle('hidden', !open);
        state.paused = open;
        if (open) renderLab();
    }

    function togglePause() {
        state.paused = !state.paused;
        document.getElementById('pauseModal').classList.toggle('hidden', !state.paused);
    }

    // ==================== LIFECYCLE ====================
    function resetGame() {
        for (const p of preys) scene.remove(p.mesh);
        for (const e of enemies) scene.remove(e.mesh);
        for (const pr of projectiles) scene.remove(pr.mesh);
        for (const pt of particles) scene.remove(pt.mesh);
        for (const c of acidClouds) scene.remove(c.mesh);
        if (boss.mesh) scene.remove(boss.mesh);

        preys.length = 0;
        enemies.length = 0;
        projectiles.length = 0;
        particles.length = 0;
        acidClouds.length = 0;
        boss.mesh = null;
        boss.active = false;

        Object.assign(state, {
            running: true, paused: false, score: 0, biomass: 0, debris: 0, mutagens: 0,
            upgrades: { lasers: true, thruster: true, shield: false, electric: false, acid: false, scales: false, missiles: false },
            shieldActive: false, shieldTimer: 0, electricTimer: 0, acidTimer: 0, missileTimer: 0,
            spawnTimer: 0, difficultyTimer: 0, difficulty: 1, bossActive: false, nextBossScore: 600
        });

        Object.assign(player, {
            yaw: 0, pitch: 0, speed: 0, health: 100, maxHealth: 100,
            level: 1, xp: 0, nextLevelXp: 120, scale: 1.0,
            dashCooldown: 0, dashTimer: 0, isDashing: false, laserCooldown: 0, jawTimer: 0, invulnTimer: 2.0
        });
        player.pos.set(0, 6, 12);
        tutorial.active = localStorage.getItem('battlesharks_tut_done') !== 'true';
        tutorial.step = 0;
        tutorial.preyEaten = 0;
        tutorial.enemiesKilled = 0;
        const tutEl = document.getElementById('tutorialBanner');
        if (tutorial.active) {
            tutEl.classList.remove('hidden');
            document.getElementById('tutText').textContent = 'Step 1: Swim forward (W) out of BS-07 Aquarium Bay!';
        } else {
            tutEl.classList.add('hidden');
        }
        sharkGroup.scale.setScalar(1);
        sharkLaserGroup.visible = true;
        sharkJetGroup.visible = true;
        sharkShieldMesh.visible = false;
        sharkAuraMesh.visible = false;
        sharkScalesGroup.visible = false;
        sharkMissileGroup.visible = false;

        document.getElementById('bossHud').classList.add('hidden');
        document.getElementById('pillShield').classList.add('hidden');
        document.getElementById('pillDash').classList.add('hidden');

        for (let i = 0; i < 20; i++) spawnPrey();
        for (let i = 0; i < 5; i++) spawnEnemy();
        spawnFriendlySharks();
    }

    function startGame() {
        sfx.init();
        sfx.startMusic();
        resetGame();
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverModal').classList.add('hidden');
        document.getElementById('pauseModal').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('crosshair').classList.remove('hidden');

        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            document.getElementById('touchControls').classList.remove('hidden');
        }
    }

    function gameOver() {
        state.running = false;
        sfx.stopMusic();
        const prevBest = parseInt(localStorage.getItem('battlesharks_highscore') || '0', 10);
        const best = Math.max(prevBest, state.score);
        localStorage.setItem('battlesharks_highscore', String(best));

        document.getElementById('finalScore').textContent = state.score;
        document.getElementById('finalHighScore').textContent = best;
        document.getElementById('finalLevel').textContent = player.level;
        const mutCount = Object.values(state.upgrades).filter(Boolean).length;
        document.getElementById('finalMutations').textContent = `${mutCount} / 7`;
        document.getElementById('gameOverModal').classList.remove('hidden');
    }

    function animate(now) {
        requestAnimationFrame(animate);
        const dt = Math.min(0.05, (now - state.lastTime) / 1000 || 0.016);
        state.lastTime = now;
        update(dt);
        renderer.render(scene, camera);
    }

    // ==================== UI BINDINGS ====================
    document.getElementById('btnStart').addEventListener('click', startGame);
    document.getElementById('btnRestart').addEventListener('click', startGame);
    document.getElementById('btnRestartPause').addEventListener('click', startGame);
    document.getElementById('btnResume').addEventListener('click', togglePause);
    document.getElementById('btnPause').addEventListener('click', togglePause);
    document.getElementById('btnShop').addEventListener('click', () => toggleShop());
    document.getElementById('btnCloseShop').addEventListener('click', () => toggleShop(false));
    document.getElementById('btnInventory').addEventListener('click', () => toggleInventory());
    document.getElementById('btnCloseInv').addEventListener('click', () => toggleInventory(false));
    document.getElementById('btnLab').addEventListener('click', () => toggleLab());
    document.getElementById('btnCloseLab').addEventListener('click', () => toggleLab(false));
    document.getElementById('btnMute').addEventListener('click', (e) => {
        const m = sfx.toggleMute();
        e.target.textContent = m ? '🔇' : '🔊';
    });

    document.querySelectorAll('#skinSelector .skin-swatch').forEach((btn) => {
        if (btn.dataset.skin === currentSkin) {
            document.querySelectorAll('#skinSelector .skin-swatch').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
        btn.addEventListener('click', () => {
            document.querySelectorAll('#skinSelector .skin-swatch').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applySharkSkin(btn.dataset.skin);
        });
    });

    document.getElementById('btnSkipTut').addEventListener('click', () => {
        tutorial.active = false;
        localStorage.setItem('battlesharks_tut_done', 'true');
        document.getElementById('tutorialBanner').classList.add('hidden');
    });
    const joyZone = document.getElementById('joystickZone');
    const joyKnob = document.getElementById('joystickKnob');
    joyZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = joyZone.getBoundingClientRect();
        const t = e.touches[0];
        const dx = Math.max(-45, Math.min(45, t.clientX - (rect.left + rect.width / 2)));
        const dy = Math.max(-45, Math.min(45, t.clientY - (rect.top + rect.height / 2)));
        joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        touchState.x = dx / 45;
        touchState.y = dy / 45;
    }, { passive: false });
    joyZone.addEventListener('touchend', () => {
        joyKnob.style.transform = 'translate(-50%, -50%)';
        touchState.x = 0;
        touchState.y = 0;
    });
    document.getElementById('touchDash').addEventListener('touchstart', (e) => { e.preventDefault(); triggerDash(); });
    document.getElementById('touchLaser').addEventListener('touchstart', (e) => { e.preventDefault(); fireLasers(); });
    document.getElementById('touchUp').addEventListener('touchstart', () => touchState.up = true);
    document.getElementById('touchUp').addEventListener('touchend', () => touchState.up = false);
    document.getElementById('touchDown').addEventListener('touchstart', () => touchState.down = true);
    document.getElementById('touchDown').addEventListener('touchend', () => touchState.down = false);

    // Init
    const hs = localStorage.getItem('battlesharks_highscore') || '0';
    document.getElementById('startHighScore').textContent = hs;
    document.getElementById('hudHighScore').textContent = hs;
    document.getElementById('btnMute').textContent = sfx.muted ? '🔇' : '🔊';

    buildEnvironment();
    buildSharkMesh();
    requestAnimationFrame(animate);
})();
