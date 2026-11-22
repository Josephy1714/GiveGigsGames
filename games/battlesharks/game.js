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
    const ARENA_RADIUS = 95;
    const FLOOR_Y = -24;
    const SURFACE_Y = 34;

    const UPGRADE_DEFS = [
        { id: 'lasers', name: 'Twin Laser Eyes', desc: 'Fire high-energy cyber lasers (Left Click / F) to destroy mines & enemies.', cost: { biomass: 12, debris: 4, mutagens: 0 } },
        { id: 'thruster', name: 'Jet Thrusters', desc: 'Press Spacebar for a high-speed hydro-jet dash that damages enemies.', cost: { biomass: 15, debris: 5, mutagens: 0 } },
        { id: 'shield', name: 'Plasma Shield', desc: 'Absorbs 1 hit completely and recharges every 10 seconds.', cost: { biomass: 18, debris: 8, mutagens: 1 } },
        { id: 'electric', name: 'Electric Aura', desc: 'Emits a shockwave every 3.5s that zaps nearby prey & enemies.', cost: { biomass: 22, debris: 10, mutagens: 1 } },
        { id: 'acid', name: 'Acidic Blood', desc: 'Leaves toxic acid clouds behind you that dissolve pursuers.', cost: { biomass: 20, debris: 8, mutagens: 1 } },
        { id: 'scales', name: 'Armored Scales', desc: 'Cyber-alloy dorsal plating reduces all incoming damage by 40%.', cost: { biomass: 25, debris: 12, mutagens: 2 } },
        { id: 'missiles', name: 'Homing Bio-Missiles', desc: 'Automatically launches tracking torpedoes at nearby enemies.', cost: { biomass: 35, debris: 16, mutagens: 3 } }
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
        { id: 'sentinel', name: 'Mecha Sentinel', color: 0xf43f5e, size: 2.5, damage: 25, hp: 70, debris: 8, speed: 9.5, shoots: true }
    ];

    // ==================== GAME STATE ====================
    const state = {
        running: false,
        paused: false,
        score: 0,
        biomass: 0,
        debris: 0,
        mutagens: 0,
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

    function buildEnvironment() {
        // Seafloor
        const floorGeo = new THREE.PlaneGeometry(ARENA_RADIUS * 2.6, ARENA_RADIUS * 2.6, 40, 40);
        floorGeo.rotateX(-Math.PI / 2);
        const posAttr = floorGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const z = posAttr.getZ(i);
            const y = Math.sin(x * 0.08) * 1.4 + Math.cos(z * 0.08) * 1.4;
            posAttr.setY(i, y);
        }
        floorGeo.computeVertexNormals();
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a2538, roughness: 0.9, metalness: 0.1 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = FLOOR_Y;
        scene.add(floor);

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

        // Corals & Rocks
        const coralColors = [0xf43f5e, 0xa855f7, 0xfb923c, 0x14b8a6];
        for (let i = 0; i < 45; i++) {
            const ang = Math.random() * Math.PI * 2;
            const rad = 12 + Math.random() * (ARENA_RADIUS - 16);
            const x = Math.cos(ang) * rad;
            const z = Math.sin(ang) * rad;
            const h = 2 + Math.random() * 5;
            const geo = new THREE.DodecahedronGeometry(h * 0.6, 0);
            const mat = new THREE.MeshStandardMaterial({
                color: coralColors[i % coralColors.length],
                roughness: 0.7
            });
            const coral = new THREE.Mesh(geo, mat);
            coral.position.set(x, FLOOR_Y + h * 0.3, z);
            coral.scale.set(1, 1.4, 1);
            scene.add(coral);
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
    }

    // ==================== 3D SHARK MODEL ====================
    let sharkGroup, sharkTail, sharkJaw, sharkShieldMesh, sharkAuraMesh, sharkLaserGroup, sharkJetGroup, sharkScalesGroup, sharkMissileGroup;

    function createSharkSkinTextures() {
        const w = 512, h = 512;
        const diffCanvas = document.createElement('canvas');
        diffCanvas.width = w; diffCanvas.height = h;
        const dCtx = diffCanvas.getContext('2d');

        // Great White countershading: deep metallic slate-blue dorsal -> crisp jagged white belly
        const grad = dCtx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0.0, '#0b1d33');
        grad.addColorStop(0.45, '#16385c');
        grad.addColorStop(0.56, '#1e4a73');
        grad.addColorStop(0.60, '#e2e8f0');
        grad.addColorStop(1.0, '#f8fafc');
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
        eCtx.strokeStyle = '#00e5ff';
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

        scene.add(sharkGroup);
    }

    // ==================== ENTITIES ====================
    const preys = [];
    const enemies = [];
    const projectiles = [];
    const particles = [];
    const acidClouds = [];

    function spawnPrey() {
        if (preys.length >= 38) return;
        const type = PREY_TYPES[Math.floor(Math.random() * PREY_TYPES.length)];
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: type.color, roughness: 0.4 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(type.size * 0.65, 10, 8), mat);
        body.scale.set(0.8, 0.85, 1.5);
        group.add(body);

        const tail = new THREE.Mesh(new THREE.ConeGeometry(type.size * 0.45, type.size * 0.8, 4), mat);
        tail.rotation.x = Math.PI / 2;
        tail.position.z = type.size * 0.95;
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
                new THREE.DodecahedronGeometry(type.size * 0.7, 1),
                new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 })
            );
            const core = new THREE.Mesh(
                new THREE.SphereGeometry(type.size * 0.35, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0xff0033 })
            );
            group.add(sphere, core);
        } else if (type.id === 'toxic') {
            const barrel = new THREE.Mesh(
                new THREE.CylinderGeometry(type.size * 0.55, type.size * 0.55, type.size * 1.4, 12),
                new THREE.MeshStandardMaterial({ color: 0x84cc16, emissive: 0x3f6212, roughness: 0.4 })
            );
            group.add(barrel);
        } else {
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(type.size * 0.9, type.size * 0.9, type.size * 1.6),
                new THREE.MeshStandardMaterial({ color: type.color, metalness: 0.6, roughness: 0.3 })
            );
            const visor = new THREE.Mesh(
                new THREE.SphereGeometry(type.size * 0.4, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0xff0055 })
            );
            visor.position.z = -type.size * 0.7;
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
        const hullMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.25 });
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

        const hull = new THREE.Mesh(new THREE.SphereGeometry(5.5, 18, 14), hullMat);
        hull.scale.set(1.1, 0.85, 2.4);
        group.add(hull);

        const eye = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 12), glowMat);
        eye.position.set(0, 0.6, -11.5);
        group.add(eye);

        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.5, 4.5), hullMat);
        fin.position.set(0, 5.2, 1);
        group.add(fin);

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
        } else if (e.code === 'Escape') {
            if (!document.getElementById('labModal').classList.contains('hidden')) {
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
                state.score += p.type.score;
                player.health = Math.min(player.maxHealth, player.health + 6 + p.type.biomass * 2);
                player.jawTimer = 0.25;
                gainXp(p.type.score * 1.4);
                sfx.chomp();
                spawnParticles(p.pos, p.type.color, 8, 8);
                scene.remove(p.mesh);
                preys.splice(i, 1);
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
                if (player.isDashing) {
                    destroyEnemy(i);
                } else {
                    damagePlayer(e.type.damage);
                    if (e.type.isStatic) destroyEnemy(i);
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
        state.score += e.type.debris * 15;
        if (Math.random() < 0.35) state.mutagens += 1;
        gainXp(35);
        sfx.explosion();
        spawnParticles(e.pos, 0xff7b54, 16, 15);
        scene.remove(e.mesh);
        enemies.splice(index, 1);
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
        document.getElementById('hudBiomass').textContent = state.biomass;
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
            upgrades: { lasers: false, thruster: false, shield: false, electric: false, acid: false, scales: false, missiles: false },
            shieldActive: false, shieldTimer: 0, electricTimer: 0, acidTimer: 0, missileTimer: 0,
            spawnTimer: 0, difficultyTimer: 0, difficulty: 1, bossActive: false, nextBossScore: 600
        });

        Object.assign(player, {
            yaw: 0, pitch: 0, speed: 0, health: 100, maxHealth: 100,
            level: 1, xp: 0, nextLevelXp: 120, scale: 1.0,
            dashCooldown: 0, dashTimer: 0, isDashing: false, laserCooldown: 0, jawTimer: 0, invulnTimer: 0
        });
        player.pos.set(0, 6, 0);
        sharkGroup.scale.setScalar(1);
        sharkLaserGroup.visible = false;
        sharkJetGroup.visible = false;
        sharkShieldMesh.visible = false;
        sharkAuraMesh.visible = false;
        sharkScalesGroup.visible = false;
        sharkMissileGroup.visible = false;

        document.getElementById('bossHud').classList.add('hidden');
        document.getElementById('pillShield').classList.add('hidden');
        document.getElementById('pillDash').classList.add('hidden');

        for (let i = 0; i < 20; i++) spawnPrey();
        for (let i = 0; i < 5; i++) spawnEnemy();
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
    document.getElementById('btnLab').addEventListener('click', () => toggleLab());
    document.getElementById('btnCloseLab').addEventListener('click', () => toggleLab(false));
    document.getElementById('btnMute').addEventListener('click', (e) => {
        const m = sfx.toggleMute();
        e.target.textContent = m ? '🔇' : '🔊';
    });

    // Touch Joystick
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
