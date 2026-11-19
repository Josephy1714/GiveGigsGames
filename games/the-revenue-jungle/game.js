(function () {
    'use strict';

    const SAVE_KEY = 'the-revenue-jungle:best';
    const MUTE_KEY = 'the-revenue-jungle:muted';

    const ZONES = [
        { name: 'Emerald Canopy', minScore: 0, sky: 0x102e20, fog: 0x0b2217, glow: 0x22c55e },
        { name: 'Golden Ruins', minScore: 450, sky: 0x2a2410, fog: 0x1e190b, glow: 0xfacc15 },
        { name: 'Twilight Shrine', minScore: 1100, sky: 0x1b1533, fog: 0x120d26, glow: 0xa855f7 },
        { name: 'Neon Apex', minScore: 2000, sky: 0x08232c, fog: 0x051820, glow: 0x38bdf8 }
    ];

    const PLAYER_X = -3.8;
    const BASE_SPEED = 0.21;
    const MAX_SPEED = 0.44;
    const GRAVITY = -0.0135;
    const JUMP_VY = 0.255;
    const DOUBLE_JUMP_VY = 0.225;

    let scene, camera, renderer, canvas;
    let ambientLight, dirLight, rimLight;
    let playerGroup, catPair = [], shieldBubble;
    let floorSegments = [];
    let obstacles = [];
    let collectibles = [];
    let particles = [];

    let isPlaying = false;
    let isPaused = false;
    let rafId = null;
    let lastTime = 0;

    let score = 0;
    let revenue = 0;
    let bestData = { score: 0, revenue: 0 };
    let distanceMeters = 0;
    let speed = BASE_SPEED;
    let combo = 1;
    let comboTimer = 0;
    let shields = 0;
    let invulnTimer = 0;
    let shakeTimer = 0;
    let zoneIndex = 0;

    let playerY = 0;
    let playerVy = 0;
    let jumpsLeft = 2;
    let isDucking = false;
    let duckHold = false;
    let duckTimer = 0;
    let flipAngle = 0;
    let runCycle = 0;

    let spawnTimer = 0;
    let coinTimer = 0;
    let muted = false;
    let audioCtx = null;

    // Shared Three.js resources to prevent GPU/memory growth across endless runs
    let shared = null;

    // DOM elements
    let elScore, elRev, elCombo, elShield, elBest, elStatus, elMute;
    let elStart, elPause, elOver, elFinalScore, elFinalRev;

    function loadSaved() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                bestData.score = Math.max(0, Number(parsed.score) || 0);
                bestData.revenue = Math.max(0, Number(parsed.revenue) || 0);
            }
            muted = localStorage.getItem(MUTE_KEY) === '1';
        } catch (_err) {
            bestData = { score: 0, revenue: 0 };
        }
    }

    function saveBest() {
        let updated = false;
        const roundedScore = Math.floor(score);
        if (roundedScore > bestData.score) {
            bestData.score = roundedScore;
            updated = true;
        }
        if (revenue > bestData.revenue) {
            bestData.revenue = revenue;
            updated = true;
        }
        if (updated) {
            try {
                localStorage.setItem(SAVE_KEY, JSON.stringify(bestData));
            } catch (_err) { /* ignore storage quota */ }
        }
        if (elBest) elBest.textContent = String(bestData.score);
    }

    function ensureAudio() {
        if (muted) return null;
        if (!audioCtx && typeof window !== 'undefined') {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (Ctx) {
                try {
                    audioCtx = new Ctx();
                } catch (_err) {
                    return null;
                }
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    }

    function playTone(freq, freqEnd, dur, type, gainVal) {
        if (muted) return;
        const ctx = ensureAudio();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type || 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        if (freqEnd && freqEnd !== freq) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + dur);
        }
        gain.gain.setValueAtTime(gainVal || 0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + dur);
    }

    function sfxJump(isDouble) {
        if (isDouble) {
            playTone(420, 760, 0.14, 'sine', 0.08);
        } else {
            playTone(280, 520, 0.12, 'triangle', 0.08);
        }
    }

    function sfxSlide() {
        playTone(260, 140, 0.1, 'sawtooth', 0.045);
    }

    function sfxCoin(mult) {
        const base = 520 + (mult - 1) * 95;
        playTone(base, base * 1.45, 0.11, 'sine', 0.075);
    }

    function sfxShieldUp() {
        playTone(390, 780, 0.2, 'sine', 0.09);
    }

    function sfxShieldBreak() {
        playTone(340, 110, 0.24, 'sawtooth', 0.1);
    }

    function sfxCrash() {
        playTone(190, 55, 0.34, 'sawtooth', 0.12);
    }

    function buildSharedResources() {
        if (shared) return shared;
        shared = {
            groundGeo: new THREE.BoxGeometry(40, 1.2, 4.4),
            groundMat: new THREE.MeshStandardMaterial({ color: 0x1c3a29, roughness: 0.88 }),
            curbGeo: new THREE.BoxGeometry(40, 0.28, 0.32),
            curbMat: new THREE.MeshStandardMaterial({ color: 0x2f5e41, roughness: 0.7 }),
            stripeGeo: new THREE.BoxGeometry(2.2, 0.04, 0.25),
            stripeMat: new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x15803d, emissiveIntensity: 0.5 }),
            trunkGeo: new THREE.CylinderGeometry(0.28, 0.42, 4.4, 7),
            trunkMat: new THREE.MeshStandardMaterial({ color: 0x4a311e, roughness: 0.9 }),
            canopyGeo: new THREE.ConeGeometry(1.75, 3.6, 7),
            canopyMat: new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 }),
            canopyAltMat: new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 }),
            // Obstacles
            vinePostGeo: new THREE.CylinderGeometry(0.16, 0.22, 1.28, 8),
            vineCrossGeo: new THREE.CylinderGeometry(0.11, 0.11, 1.8, 8),
            vineMat: new THREE.MeshStandardMaterial({ color: 0x7c2d12, emissive: 0x450a0a, emissiveIntensity: 0.35 }),
            thornGeo: new THREE.OctahedronGeometry(0.16, 0),
            thornMat: new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.55 }),
            sandBaseGeo: new THREE.CylinderGeometry(0.95, 1.05, 0.14, 16),
            sandMat: new THREE.MeshStandardMaterial({ color: 0xb45309, emissive: 0x78350f, emissiveIntensity: 0.3, roughness: 0.95 }),
            sandRimGeo: new THREE.TorusGeometry(0.94, 0.08, 8, 20),
            sandRimMat: new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.45 }),
            droneCoreGeo: new THREE.OctahedronGeometry(0.42, 0),
            droneRingGeo: new THREE.TorusGeometry(0.62, 0.07, 8, 18),
            droneCoreMat: new THREE.MeshStandardMaterial({ color: 0x9333ea, emissive: 0x7e22ce, emissiveIntensity: 0.7 }),
            droneRingMat: new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 0.75 }),
            // Collectibles
            coinGeo: new THREE.CylinderGeometry(0.36, 0.36, 0.12, 16),
            coinMat: new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.55, metalness: 0.6, roughness: 0.25 }),
            orbGeo: new THREE.OctahedronGeometry(0.38, 0),
            orbHaloGeo: new THREE.TorusGeometry(0.55, 0.06, 8, 20),
            orbMat: new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 0.85, roughness: 0.2 }),
            particleGeo: new THREE.BoxGeometry(0.16, 0.16, 0.16)
        };
        return shared;
    }

    function createCatMesh(furColor, accentColor, zOffset) {
        const g = new THREE.Group();
        const furMat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.55 });
        const accMat = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.2, roughness: 0.45 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
        const visorMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.65 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.54, 0.46), accMat);
        body.position.set(0, 0.62, 0);
        g.add(body);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.46, 0.46), furMat);
        head.position.set(0.14, 1.12, 0);
        g.add(head);

        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.48), visorMat);
        visor.position.set(0.36, 1.16, 0);
        g.add(visor);

        const earGeo = new THREE.ConeGeometry(0.12, 0.24, 4);
        const earL = new THREE.Mesh(earGeo, furMat);
        earL.position.set(0.08, 1.44, -0.14);
        const earR = new THREE.Mesh(earGeo, furMat);
        earR.position.set(0.08, 1.44, 0.14);
        g.add(earL, earR);

        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.11, 0.11), furMat);
        tail.position.set(-0.46, 0.72, 0);
        tail.rotation.z = 0.5;
        g.add(tail);

        const legGeo = new THREE.BoxGeometry(0.16, 0.38, 0.16);
        const legFL = new THREE.Mesh(legGeo, darkMat);
        legFL.position.set(0.2, 0.19, -0.14);
        const legFR = new THREE.Mesh(legGeo, darkMat);
        legFR.position.set(0.2, 0.19, 0.14);
        const legBL = new THREE.Mesh(legGeo, darkMat);
        legBL.position.set(-0.2, 0.19, -0.14);
        const legBR = new THREE.Mesh(legGeo, darkMat);
        legBR.position.set(-0.2, 0.19, 0.14);
        g.add(legFL, legFR, legBL, legBR);

        g.position.z = zOffset;
        return {
            root: g,
            tail: tail,
            legs: [legFL, legFR, legBL, legBR]
        };
    }

    function createJungleFloor(xOffset) {
        const res = buildSharedResources();
        const floor = new THREE.Group();

        const ground = new THREE.Mesh(res.groundGeo, res.groundMat);
        ground.position.y = -0.6;
        floor.add(ground);

        const backCurb = new THREE.Mesh(res.curbGeo, res.curbMat);
        backCurb.position.set(0, 0.08, -2.15);
        const frontCurb = new THREE.Mesh(res.curbGeo, res.curbMat);
        frontCurb.position.set(0, 0.08, 2.15);
        floor.add(backCurb, frontCurb);

        for (let s = -16; s <= 16; s += 8) {
            const stripe = new THREE.Mesh(res.stripeGeo, res.stripeMat);
            stripe.position.set(s, 0.02, 0);
            floor.add(stripe);
        }

        // All backdrop trees strictly behind the track (z between -4.5 and -11.5)
        // using local X relative to the floor chunk so the lane stays unobstructed.
        for (let j = 0; j < 7; j++) {
            const tree = new THREE.Group();
            const trunk = new THREE.Mesh(res.trunkGeo, res.trunkMat);
            trunk.position.y = 2.0;
            const canopy = new THREE.Mesh(res.canopyGeo, j % 2 === 0 ? res.canopyMat : res.canopyAltMat);
            canopy.position.y = 4.6;
            tree.add(trunk, canopy);

            const localX = -17 + j * 5.6 + (Math.random() * 2.2 - 1.1);
            const depthZ = -4.5 - Math.random() * 7.0;
            const treeScale = 0.85 + Math.random() * 0.5;
            tree.position.set(localX, 0, depthZ);
            tree.scale.setScalar(treeScale);
            floor.add(tree);
        }

        floor.position.x = xOffset;
        scene.add(floor);
        floorSegments.push(floor);
        return floor;
    }

    function initScene() {
        canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
        const frame = canvas.parentElement;
        const w = frame.clientWidth || 960;
        const h = frame.clientHeight || 540;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(ZONES[0].sky);
        scene.fog = new THREE.FogExp2(ZONES[0].fog, 0.022);

        camera = new THREE.PerspectiveCamera(56, w / h, 0.1, 100);
        camera.position.set(1.2, 4.1, 11.4);
        camera.lookAt(1.8, 1.35, 0);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h, false);

        ambientLight = new THREE.AmbientLight(0xd1fae5, 0.65);
        scene.add(ambientLight);

        dirLight = new THREE.DirectionalLight(0xffffff, 1.05);
        dirLight.position.set(8, 14, 10);
        scene.add(dirLight);

        rimLight = new THREE.PointLight(0x22c55e, 1.2, 24);
        rimLight.position.set(-4, 4, -2);
        scene.add(rimLight);

        playerGroup = new THREE.Group();
        playerGroup.position.set(PLAYER_X, 0, 0);

        // Twin explorer cats running side-by-side
        const catA = createCatMesh(0xfbbf24, 0x059669, -0.36);
        const catB = createCatMesh(0xe2e8f0, 0x2563eb, 0.36);
        catPair = [catA, catB];
        playerGroup.add(catA.root, catB.root);

        shieldBubble = new THREE.Mesh(
            new THREE.SphereGeometry(1.18, 18, 14),
            new THREE.MeshBasicMaterial({ color: 0x34d399, wireframe: true, transparent: true, opacity: 0.42 })
        );
        shieldBubble.position.set(0.05, 0.78, 0);
        shieldBubble.visible = false;
        playerGroup.add(shieldBubble);

        scene.add(playerGroup);

        for (let i = 0; i < 3; i++) {
            createJungleFloor(i * 40 - 16);
        }
    }

    function onWindowResize() {
        if (!canvas || !renderer || !camera) return;
        const frame = canvas.parentElement;
        const w = frame.clientWidth || 960;
        const h = frame.clientHeight || 540;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
    }

    const particleMats = {};

    function spawnParticles(x, y, z, colorHex, count) {
        const res = buildSharedResources();
        if (!particleMats[colorHex]) {
            particleMats[colorHex] = new THREE.MeshBasicMaterial({ color: colorHex });
        }
        const mat = particleMats[colorHex];
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(res.particleGeo, mat);
            mesh.position.set(x, y, z + (Math.random() - 0.5) * 0.6);
            scene.add(mesh);
            particles.push({
                mesh: mesh,
                mat: mat,
                vx: (Math.random() - 0.5) * 0.24,
                vy: 0.08 + Math.random() * 0.2,
                vz: (Math.random() - 0.5) * 0.16,
                life: 24 + Math.floor(Math.random() * 14)
            });
        }
    }

    function spawnObstacle() {
        const res = buildSharedResources();
        const roll = Math.random();
        const group = new THREE.Group();
        let kind = 'vine';

        if (roll < 0.36) {
            kind = 'vine';
            const leftP = new THREE.Mesh(res.vinePostGeo, res.vineMat);
            leftP.position.set(0, 0.64, -0.78);
            const rightP = new THREE.Mesh(res.vinePostGeo, res.vineMat);
            rightP.position.set(0, 0.64, 0.78);
            const bar = new THREE.Mesh(res.vineCrossGeo, res.vineMat);
            bar.rotation.x = Math.PI / 2;
            bar.position.set(0, 0.96, 0);
            group.add(leftP, rightP, bar);
            for (let t = -0.6; t <= 0.6; t += 0.4) {
                const th = new THREE.Mesh(res.thornGeo, res.thornMat);
                th.position.set(0.12, 1.08, t);
                group.add(th);
            }
            group.position.set(25, 0, 0);
            group.userData = { kind: kind, minY: 0, maxY: 1.24, halfX: 0.48 };
        } else if (roll < 0.70) {
            kind = 'quicksand';
            const pool = new THREE.Mesh(res.sandBaseGeo, res.sandMat);
            pool.position.y = 0.04;
            const rim = new THREE.Mesh(res.sandRimGeo, res.sandRimMat);
            rim.rotation.x = Math.PI / 2;
            rim.position.y = 0.09;
            group.add(pool, rim);
            group.position.set(25, 0, 0);
            group.userData = { kind: kind, minY: 0, maxY: 0.45, halfX: 0.85, spinner: rim };
        } else {
            kind = 'fogDrone';
            const core = new THREE.Mesh(res.droneCoreGeo, res.droneCoreMat);
            const ring = new THREE.Mesh(res.droneRingGeo, res.droneRingMat);
            group.add(core, ring);
            group.position.set(25, 1.72, 0);
            group.userData = { kind: kind, minY: 1.15, maxY: 2.28, halfX: 0.56, spinner: ring };
        }

        scene.add(group);
        obstacles.push(group);
    }

    function spawnCollectible(forceShield) {
        const res = buildSharedResources();
        const isShield = forceShield || (shields < 2 && Math.random() < 0.14);
        const group = new THREE.Group();
        const laneY = Math.random() < 0.45 ? 2.15 : 0.72;

        if (isShield) {
            const orb = new THREE.Mesh(res.orbGeo, res.orbMat);
            const halo = new THREE.Mesh(res.orbHaloGeo, res.orbMat);
            group.add(orb, halo);
            group.position.set(26, Math.max(1.2, laneY), 0);
            group.userData = { type: 'emerald', spinY: 0.08 };
        } else {
            const coin = new THREE.Mesh(res.coinGeo, res.coinMat);
            coin.rotation.x = Math.PI / 2;
            group.add(coin);
            group.position.set(26, laneY, 0);
            group.userData = { type: 'coin', spinY: 0.09 };
        }

        scene.add(group);
        collectibles.push(group);
    }

    function setFeed(text) {
        if (elStatus) elStatus.textContent = text;
    }

    function updateHud() {
        if (elScore) elScore.textContent = String(Math.floor(score));
        if (elRev) elRev.textContent = '$' + revenue.toLocaleString();
        if (elCombo) elCombo.textContent = 'x' + combo;
        if (elShield) elShield.textContent = String(shields);
        if (elBest) elBest.textContent = String(Math.max(bestData.score, Math.floor(score)));
    }

    function jump() {
        if (!isPlaying || isPaused) return;
        ensureAudio();
        duckHold = false;
        isDucking = false;
        duckTimer = 0;

        if (playerY <= 0.02) {
            playerVy = JUMP_VY;
            jumpsLeft = 1;
            sfxJump(false);
            spawnParticles(PLAYER_X, 0.1, 0, 0x86efac, 6);
        } else if (jumpsLeft > 0) {
            playerVy = DOUBLE_JUMP_VY;
            jumpsLeft = 0;
            flipAngle = Math.PI * 2;
            sfxJump(true);
            spawnParticles(PLAYER_X, playerY + 0.3, 0, 0x38bdf8, 8);
        }
    }

    function setDuck(active) {
        duckHold = Boolean(active);
        if (!isPlaying || isPaused) return;
        if (active) {
            ensureAudio();
            if (playerY > 0.05) {
                // Fast-fall slam into immediate slide
                playerVy = Math.min(playerVy, -0.28);
            }
            if (!isDucking) sfxSlide();
            isDucking = true;
            duckTimer = 0.55;
        }
    }

    function clearEntities() {
        for (let i = 0; i < obstacles.length; i++) scene.remove(obstacles[i]);
        obstacles = [];
        for (let i = 0; i < collectibles.length; i++) scene.remove(collectibles[i]);
        collectibles = [];
        for (let i = 0; i < particles.length; i++) {
            scene.remove(particles[i].mesh);
        }
        particles = [];
    }

    function resetRunState() {
        clearEntities();
        score = 0;
        revenue = 0;
        distanceMeters = 0;
        speed = BASE_SPEED;
        combo = 1;
        comboTimer = 0;
        shields = 0;
        invulnTimer = 0;
        shakeTimer = 0;
        zoneIndex = 0;

        playerY = 0;
        playerVy = 0;
        jumpsLeft = 2;
        isDucking = false;
        duckHold = false;
        duckTimer = 0;
        flipAngle = 0;
        runCycle = 0;

        spawnTimer = 0.9;
        coinTimer = 0.6;

        playerGroup.position.set(PLAYER_X, 0, 0);
        playerGroup.scale.set(1, 1, 1);
        playerGroup.rotation.set(0, 0, 0);
        shieldBubble.visible = false;

        scene.background.setHex(ZONES[0].sky);
        scene.fog.color.setHex(ZONES[0].fog);
        rimLight.color.setHex(ZONES[0].glow);

        setFeed(ZONES[0].name + ' · Double-Jump & Slide Ready');
        updateHud();
    }

    function startGame() {
        ensureAudio();
        resetRunState();
        isPlaying = true;
        isPaused = false;
        if (elStart) elStart.classList.add('hidden');
        if (elPause) elPause.classList.add('hidden');
        if (elOver) elOver.classList.add('hidden');
        lastTime = performance.now();
    }

    function pauseGame() {
        if (!isPlaying || isPaused) return;
        isPaused = true;
        if (elPause) elPause.classList.remove('hidden');
    }

    function resumeGame() {
        if (!isPlaying || !isPaused) return;
        ensureAudio();
        isPaused = false;
        if (elPause) elPause.classList.add('hidden');
        lastTime = performance.now();
    }

    function restartGame() {
        startGame();
    }

    function endGame() {
        isPlaying = false;
        isPaused = false;
        sfxCrash();
        saveBest();
        if (elFinalScore) elFinalScore.textContent = String(Math.floor(score));
        if (elFinalRev) elFinalRev.textContent = '$' + revenue.toLocaleString();
        if (elOver) elOver.classList.remove('hidden');
        setFeed('Run Ended · Best Score: ' + bestData.score);
    }

    function updateZone() {
        let nextIdx = 0;
        for (let i = ZONES.length - 1; i >= 0; i--) {
            if (score >= ZONES[i].minScore) {
                nextIdx = i;
                break;
            }
        }
        if (nextIdx !== zoneIndex) {
            zoneIndex = nextIdx;
            const z = ZONES[zoneIndex];
            scene.background.setHex(z.sky);
            scene.fog.color.setHex(z.fog);
            rimLight.color.setHex(z.glow);
            setFeed('Entered ' + z.name + '! Pace Rising');
        }
    }

    function stepSimulation(dt) {
        const scale = Math.min(dt / 16.6667, 2.5);

        speed = Math.min(MAX_SPEED, BASE_SPEED + distanceMeters * 0.00018);
        const moveStep = speed * scale;

        distanceMeters += moveStep * 1.4;
        score += moveStep * 1.65;

        if (comboTimer > 0) {
            comboTimer -= dt / 1000;
            if (comboTimer <= 0 && combo > 1) {
                combo = 1;
            }
        }
        if (invulnTimer > 0) invulnTimer = Math.max(0, invulnTimer - dt / 1000);
        if (shakeTimer > 0) shakeTimer = Math.max(0, shakeTimer - dt / 1000);

        updateZone();

        // Recycle floor segments seamlessly
        for (let i = 0; i < floorSegments.length; i++) {
            const seg = floorSegments[i];
            seg.position.x -= moveStep;
            if (seg.position.x < -56) {
                seg.position.x += 120;
            }
        }

        // Player vertical + duck physics
        playerVy += GRAVITY * scale;
        playerY += playerVy * scale;
        if (playerY <= 0) {
            playerY = 0;
            playerVy = 0;
            jumpsLeft = 2;
        }

        if (duckTimer > 0) duckTimer -= dt / 1000;
        isDucking = (duckHold || duckTimer > 0) && playerY <= 0.12;

        const targetScaleY = isDucking ? 0.52 : 1.0;
        const targetScaleX = isDucking ? 1.18 : 1.0;
        playerGroup.scale.y += (targetScaleY - playerGroup.scale.y) * Math.min(1, 0.35 * scale);
        playerGroup.scale.x += (targetScaleX - playerGroup.scale.x) * Math.min(1, 0.35 * scale);
        playerGroup.position.y = playerY;

        // Flip animation on double-jump & leg gait on ground
        if (flipAngle > 0) {
            const deltaFlip = Math.min(flipAngle, 0.24 * scale);
            flipAngle -= deltaFlip;
            playerGroup.rotation.z = -flipAngle;
        } else {
            playerGroup.rotation.z = isDucking ? -0.14 : (playerVy > 0.05 ? 0.1 : 0);
        }

        runCycle += moveStep * 1.9;
        for (let c = 0; c < catPair.length; c++) {
            const cat = catPair[c];
            const phase = runCycle + c * 1.4;
            cat.tail.rotation.z = 0.5 + Math.sin(phase) * 0.25;
            if (playerY <= 0.05) {
                cat.legs[0].rotation.z = Math.sin(phase) * 0.55;
                cat.legs[1].rotation.z = -Math.sin(phase) * 0.55;
                cat.legs[2].rotation.z = -Math.sin(phase) * 0.55;
                cat.legs[3].rotation.z = Math.sin(phase) * 0.55;
            } else {
                for (let l = 0; l < 4; l++) cat.legs[l].rotation.z = 0.35;
            }
        }

        shieldBubble.visible = shields > 0;
        if (shields > 0) {
            shieldBubble.rotation.y += 0.04 * scale;
        }
        playerGroup.visible = invulnTimer <= 0 || Math.floor(invulnTimer * 18) % 2 === 0;

        // Spawn hazards & collectibles
        spawnTimer -= dt / 1000;
        if (spawnTimer <= 0) {
            spawnObstacle();
            const minGap = Math.max(0.76, 1.48 - distanceMeters * 0.0005);
            spawnTimer = minGap + Math.random() * 0.72;
        }

        coinTimer -= dt / 1000;
        if (coinTimer <= 0) {
            spawnCollectible(false);
            coinTimer = 0.55 + Math.random() * 0.75;
        }

        // Player hitbox in world units
        const pMinX = PLAYER_X - 0.38;
        const pMaxX = PLAYER_X + 0.38;
        const pMinY = playerY + 0.05;
        const pMaxY = playerY + (isDucking ? 0.76 : 1.48);

        // Obstacles loop
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.position.x -= moveStep;
            const ud = obs.userData;
            if (ud.spinner) ud.spinner.rotation.z += 0.08 * scale;

            const oMinX = obs.position.x - ud.halfX;
            const oMaxX = obs.position.x + ud.halfX;

            if (pMaxX > oMinX && pMinX < oMaxX && pMaxY > ud.minY && pMinY < ud.maxY) {
                if (invulnTimer > 0) {
                    // Immune during shield flash
                } else if (shields > 0) {
                    shields -= 1;
                    invulnTimer = 1.15;
                    shakeTimer = 0.25;
                    sfxShieldBreak();
                    spawnParticles(obs.position.x, obs.position.y + 0.7, 0, 0x34d399, 14);
                    scene.remove(obs);
                    obstacles.splice(i, 1);
                    setFeed('Emerald Shield Absorbed Hazard!');
                    break;
                } else {
                    shakeTimer = 0.35;
                    spawnParticles(PLAYER_X, playerY + 0.8, 0, 0xef4444, 16);
                    endGame();
                    break;
                }
            }

            if (obs.position.x < -22) {
                scene.remove(obs);
                obstacles.splice(i, 1);
            }
        }

        // Collectibles loop
        for (let i = collectibles.length - 1; i >= 0; i--) {
            const item = collectibles[i];
            item.position.x -= moveStep;
            item.rotation.y += (item.userData.spinY || 0.08) * scale;

            const dx = Math.abs(item.position.x - PLAYER_X);
            const dy = Math.abs(item.position.y - (playerY + (isDucking ? 0.45 : 0.85)));
            if (dx < 0.85 && dy < 0.92) {
                if (item.userData.type === 'emerald') {
                    shields = Math.min(2, shields + 1);
                    score += 150;
                    sfxShieldUp();
                    spawnParticles(item.position.x, item.position.y, 0, 0x34d399, 12);
                    setFeed('Emerald Shield Online! (' + shields + '/2)');
                } else {
                    combo = Math.min(5, combo + (comboTimer > 0 ? 1 : 0));
                    comboTimer = 2.6;
                    const gained = 100 * combo;
                    revenue += gained;
                    score += 25 * combo;
                    sfxCoin(combo);
                    spawnParticles(item.position.x, item.position.y, 0, 0xfacc15, 8);
                    setFeed('+$' + gained + ' Revenue · Combo x' + combo);
                }
                scene.remove(item);
                collectibles.splice(i, 1);
                continue;
            }

            if (item.position.x < -22) {
                scene.remove(item);
                collectibles.splice(i, 1);
            }
        }

        // Particles update
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.mesh.position.x += p.vx * scale;
            p.mesh.position.y += p.vy * scale;
            p.mesh.position.z += p.vz * scale;
            p.vy -= 0.008 * scale;
            p.life -= scale;
            if (p.life <= 0) {
                scene.remove(p.mesh);
                particles.splice(i, 1);
            }
        }

        // Camera polish
        const shakeX = shakeTimer > 0 ? (Math.random() - 0.5) * 0.28 : 0;
        const shakeY = shakeTimer > 0 ? (Math.random() - 0.5) * 0.22 : 0;
        camera.position.set(1.2 + shakeX, 4.1 + playerY * 0.2 + shakeY, 11.4);

        updateHud();
    }

    function animate(now) {
        rafId = requestAnimationFrame(animate);
        const dt = lastTime ? Math.min(50, now - lastTime) : 16.67;
        lastTime = now;

        if (isPlaying && !isPaused) {
            stepSimulation(dt);
        } else {
            // Subtle idle bob on start/pause screen
            const t = now * 0.003;
            if (playerGroup) {
                playerGroup.position.y = Math.sin(t) * 0.08;
            }
        }

        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    function updateMuteLabel() {
        if (elMute) elMute.textContent = muted ? '🔇 Muted' : '🔊 SFX';
    }

    function bindEvents() {
        const btnStart = document.getElementById('TEMPLATE-4weird-start-btn');
        const btnResume = document.getElementById('TEMPLATE-4weird-resume-btn');
        const btnRestart = document.getElementById('TEMPLATE-4weird-restart-btn');
        const btnAgain = document.getElementById('TEMPLATE-4weird-play-again-btn');
        const btnJump = document.getElementById('btn-jump');
        const btnDuck = document.getElementById('btn-duck');

        if (btnStart) btnStart.addEventListener('click', startGame);
        if (btnResume) btnResume.addEventListener('click', resumeGame);
        if (btnRestart) btnRestart.addEventListener('click', restartGame);
        if (btnAgain) btnAgain.addEventListener('click', restartGame);

        if (elMute) {
            elMute.addEventListener('click', function () {
                muted = !muted;
                try {
                    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
                } catch (_err) { /* ignore */ }
                updateMuteLabel();
                if (!muted) ensureAudio();
            });
        }

        if (btnJump) {
            btnJump.addEventListener('pointerdown', function (e) {
                e.preventDefault();
                jump();
            });
        }
        if (btnDuck) {
            btnDuck.addEventListener('pointerdown', function (e) {
                e.preventDefault();
                setDuck(true);
            });
            btnDuck.addEventListener('pointerup', function () { setDuck(false); });
            btnDuck.addEventListener('pointercancel', function () { setDuck(false); });
        }

        canvas.addEventListener('pointerdown', function () {
            if (isPlaying && !isPaused) jump();
        });

        window.addEventListener('keydown', function (e) {
            const key = e.code || e.key;
            if (key === 'Space' || key === 'ArrowUp' || key === 'KeyW') {
                if (isPlaying && !isPaused) {
                    e.preventDefault();
                    jump();
                } else if (elStart && !elStart.classList.contains('hidden')) {
                    e.preventDefault();
                    startGame();
                } else if (elOver && !elOver.classList.contains('hidden')) {
                    e.preventDefault();
                    restartGame();
                }
            } else if (key === 'ArrowDown' || key === 'KeyS') {
                if (isPlaying && !isPaused) {
                    e.preventDefault();
                    setDuck(true);
                }
            } else if (key === 'KeyP' || key === 'Escape') {
                if (isPlaying) {
                    if (isPaused) resumeGame();
                    else pauseGame();
                }
            }
        });

        window.addEventListener('keyup', function (e) {
            const key = e.code || e.key;
            if (key === 'ArrowDown' || key === 'KeyS') {
                setDuck(false);
            }
        });

        window.addEventListener('resize', onWindowResize);
    }

    function init() {
        elScore = document.getElementById('game-score');
        elRev = document.getElementById('game-revenue');
        elCombo = document.getElementById('game-combo');
        elShield = document.getElementById('game-shield');
        elBest = document.getElementById('game-best');
        elStatus = document.getElementById('jungle-status');
        elMute = document.getElementById('mute-btn');
        elStart = document.getElementById('TEMPLATE-4weird-start-screen');
        elPause = document.getElementById('TEMPLATE-4weird-pause-screen');
        elOver = document.getElementById('TEMPLATE-4weird-game-over-screen');
        elFinalScore = document.getElementById('final-score-val');
        elFinalRev = document.getElementById('final-rev-val');

        loadSaved();
        updateMuteLabel();
        if (elBest) elBest.textContent = String(bestData.score);

        initScene();
        bindEvents();
        animate(performance.now());
    }

    window.jump = jump;
    window.duck = setDuck;
    window.onWindowResize = onWindowResize;
    window.gameState = {
        title: 'the-revenue-jungle',
        get active() { return isPlaying && !isPaused; }
    };
    window.game = {
        start: startGame,
        pause: pauseGame,
        resume: resumeGame,
        restart: restartGame,
        jump: jump,
        duck: setDuck
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
