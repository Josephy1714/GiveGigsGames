// The Cave of Bottlenecks - Wave-Defense Searchlight Sweeper
'use strict';

let scene, camera, renderer, clock;
let emitter, beam, dustPoints;
let stalactites = [];
let particles = [];
let gameActive = false;
let isMuted = false;

let beamAngle = 0;
let rotateDir = 0;
window.rotateDir = 0;
const rotationSpeed = 2.55;

let wave = 1;
let score = 0;
let combo = 1;
let shield = 3;
let overdriveCharge = 0;
let overdriveActiveTimer = 0;
let waveSpawned = 0;
let waveTargetCount = 5;
let waveCleared = 0;
let spawnTimer = 0;
let shakeTime = 0;
let pointerActive = false;

const SAVE_KEY = 'the-cave-of-bottlenecks:best';
let bestScore = readBest();

const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');
const waveSpan = document.getElementById('game-wave');
const progressSpan = document.getElementById('game-progress');
const leftSpan = document.getElementById('game-left');
const shieldSpan = document.getElementById('game-shield');
const overdriveSpan = document.getElementById('game-overdrive');
const scoreSpan = document.getElementById('game-score');
const bestSpan = document.getElementById('game-best');
const statusEl = document.getElementById('cave-status');
const endTitle = document.getElementById('end-title');
const endDesc = document.getElementById('end-desc');
const finalScoreSpan = document.getElementById('final-score-val');
const finalWaveSpan = document.getElementById('final-wave-val');

window.gameState = { title: 'the-cave-of-bottlenecks', get active() { return gameActive; } };
window.game = window.gameState;

let redGeo, purpleGeo, crystalGeo, sparkGeo;

let audioCtx = null;
function initAudio() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } catch (_) {}
}
function playSfx(kind) {
    if (isMuted) return;
    initAudio();
    if (!audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        if (kind === 'melt') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(980, now + 0.14);
            gain.gain.setValueAtTime(0.11, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now); osc.stop(now + 0.15);
        } else if (kind === 'crystal') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(660, now);
            osc.frequency.setValueAtTime(880, now + 0.06);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
        } else if (kind === 'overdrive') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(840, now + 0.3);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            osc.start(now); osc.stop(now + 0.32);
        } else if (kind === 'damage') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.linearRampToValueAtTime(60, now + 0.24);
            gain.gain.setValueAtTime(0.13, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
        } else if (kind === 'wave') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(659, now + 0.1);
            gain.gain.setValueAtTime(0.11, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            osc.start(now); osc.stop(now + 0.28);
        }
    } catch (_) {}
}

function readBest() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return 0;
        const d = JSON.parse(raw);
        return Number.isFinite(d?.score) ? d.score : (Number(raw) || 0);
    } catch (_) { return 0; }
}
function saveBest() {
    if (score > bestScore) bestScore = score;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ score: bestScore, wave: wave })); } catch (_) {}
    if (bestSpan) bestSpan.textContent = String(bestScore);
}

init();

(function () {
  'use strict';
  try {
    function fwRefit() {
      try { if (typeof onWindowResize === 'function') onWindowResize(); } catch (e) {}
      try {
        var fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (document.body) document.body.classList.toggle('is-fullscreen', fs);
        var f = document.querySelector('.TEMPLATE-4weird-game-frame');
        if (f) f.classList.toggle('is-fullscreen', fs);
      } catch (e) {}
    }
    document.addEventListener('fullscreenchange', fwRefit);
    document.addEventListener('webkitfullscreenchange', fwRefit);
    window.addEventListener('fourweird-fullscreen', fwRefit);
  } catch (e) {}
})();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030208);
    scene.fog = new THREE.FogExp2(0x030208, 0.032);

    camera = new THREE.PerspectiveCamera(58, 800 / 600, 0.1, 100);
    camera.position.set(0, 0.2, 10.6);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    clock = new THREE.Clock();

    scene.add(new THREE.AmbientLight(0xd8b4fe, 0.45));
    const purpleLight = new THREE.PointLight(0xa78bfa, 1.6, 32);
    purpleLight.position.set(0, 2, 6);
    scene.add(purpleLight);
    const dirLight = new THREE.DirectionalLight(0x34d399, 0.75);
    dirLight.position.set(-4, 8, 6);
    scene.add(dirLight);

    redGeo = new THREE.ConeGeometry(0.66, 2.0, 5);
    purpleGeo = new THREE.OctahedronGeometry(0.68, 0);
    crystalGeo = new THREE.OctahedronGeometry(0.45, 0);
    sparkGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);

    buildCavernBackdrop();
    setupEmitter();
    installSessionControls();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    startBtn.addEventListener('click', function () { initAudio(); resetGame(); });
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    canvas.addEventListener('pointermove', function (e) {
        if (!gameActive || !pointerActive) return;
        aimFromPointer(e.clientX, e.clientY);
    });
    canvas.addEventListener('pointerdown', function (e) {
        initAudio();
        if (!gameActive) return;
        pointerActive = true;
        aimFromPointer(e.clientX, e.clientY);
    });
    window.addEventListener('pointerup', function () { pointerActive = false; });

    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnOverdrive = document.getElementById('btn-overdrive');
    const setLeft = function (e) { e.preventDefault(); rotateDir = 1; };
    const setRight = function (e) { e.preventDefault(); rotateDir = -1; };
    const clearMove = function (e) { e.preventDefault(); rotateDir = 0; };

    btnLeft.addEventListener('mousedown', setLeft);
    btnLeft.addEventListener('touchstart', setLeft, { passive: false });
    btnLeft.addEventListener('mouseup', clearMove);
    btnLeft.addEventListener('touchend', clearMove);
    btnLeft.addEventListener('mouseleave', clearMove);

    btnRight.addEventListener('mousedown', setRight);
    btnRight.addEventListener('touchstart', setRight, { passive: false });
    btnRight.addEventListener('mouseup', clearMove);
    btnRight.addEventListener('touchend', clearMove);
    btnRight.addEventListener('mouseleave', clearMove);

    if (btnOverdrive) {
        btnOverdrive.addEventListener('click', function (e) { e.preventDefault(); triggerOverdrive(); });
    }

    window.addEventListener('resize', onWindowResize);
    onWindowResize();
    updateHUD();
    animate();
}

function buildCavernBackdrop() {
    // Floor shield platform
    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(16, 0.5, 4),
        new THREE.MeshStandardMaterial({ color: 0x1e1b4b, emissive: 0x0f172a, roughness: 0.7 })
    );
    floor.position.set(0, -3.9, 0);
    scene.add(floor);

    // Side cavern stalagmite pillars
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e1b2e, roughness: 0.9 });
    for (let i = -3; i <= 3; i++) {
        const pillar = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.2, 5), wallMat);
        pillar.position.set(i * 2.4, 4.9, -2.5);
        pillar.rotation.x = Math.PI;
        scene.add(pillar);
    }

    // Floating cave dust motes
    const count = 220;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 18;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
        pos[i * 3 + 2] = -1 - Math.random() * 6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dustPoints = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xa78bfa, size: 0.08, transparent: true, opacity: 0.6 }));
    scene.add(dustPoints);
}

function setupEmitter() {
    emitter = new THREE.Group();
    const catMat = new THREE.MeshPhongMaterial({ color: 0x10b981, emissive: 0x064e3b, shininess: 90 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.56, 18, 18), catMat);
    emitter.add(head);

    // Cat ears
    const earGeo = new THREE.ConeGeometry(0.18, 0.38, 4);
    const leftEar = new THREE.Mesh(earGeo, catMat);
    leftEar.position.set(-0.34, 0.52, 0);
    leftEar.rotation.z = 0.28;
    const rightEar = leftEar.clone();
    rightEar.position.x = 0.34;
    rightEar.rotation.z = -0.28;
    emitter.add(leftEar);
    emitter.add(rightEar);

    // Glowing AI visor
    const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.16, 0.32),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    visor.position.set(0, 0.14, 0.44);
    emitter.add(visor);

    emitter.position.set(0, -3.5, 0);
    scene.add(emitter);

    const coneGeo = new THREE.ConeGeometry(0.85, 9.5, 18, 1, true);
    coneGeo.translate(0, 4.75, 0);
    const coneMat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide
    });
    beam = new THREE.Mesh(coneGeo, coneMat);
    emitter.add(beam);
}

function clearDynamic() {
    for (const s of stalactites) { scene.remove(s.mesh); s.mesh.material.dispose(); }
    for (const p of particles) { scene.remove(p.mesh); p.mesh.material.dispose(); }
    stalactites = [];
    particles = [];
}

function spawnTarget() {
    const canSpawnCrystal = waveCleared + stalactites.length < waveTargetCount && Math.random() < 0.22;
    if (canSpawnCrystal) {
        const mesh = new THREE.Mesh(crystalGeo, new THREE.MeshPhongMaterial({ color: 0x34d399, emissive: 0x065f46, shininess: 110 }));
        const x = (Math.random() - 0.5) * 8.4;
        mesh.position.set(x, 4.4, 0);
        scene.add(mesh);
        stalactites.push({
            mesh: mesh,
            kind: 'crystal',
            hp: 65,
            maxHp: 65,
            fallSpeed: 1.05 + wave * 0.12,
            driftFreq: 0,
            driftAmp: 0,
            baseX: x
        });
        return;
    }

    if (waveSpawned >= waveTargetCount) return;
    waveSpawned++;
    const isPurple = wave >= 2 && Math.random() < Math.min(0.45, 0.18 + wave * 0.06);
    const mesh = new THREE.Mesh(
        isPurple ? purpleGeo : redGeo,
        new THREE.MeshPhongMaterial({
            color: isPurple ? 0xa855f7 : 0xef4444,
            emissive: isPurple ? 0x4c1d95 : 0x690808,
            shininess: 95
        })
    );
    if (!isPurple) mesh.rotation.x = Math.PI;
    const x = (Math.random() - 0.5) * 9.0;
    mesh.position.set(x, 4.5, 0);
    scene.add(mesh);
    const hp = isPurple ? 130 + wave * 10 : 75 + wave * 8;
    stalactites.push({
        mesh: mesh,
        kind: isPurple ? 'purple' : 'red',
        hp: hp,
        maxHp: hp,
        fallSpeed: (isPurple ? 0.85 : 0.72) + wave * 0.1,
        driftFreq: isPurple ? 1.8 : 0,
        driftAmp: isPurple ? 1.2 : 0,
        baseX: x,
        age: Math.random() * 4
    });
}

function spawnBurst(pos, color, count) {
    for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 }));
        m.position.copy(pos);
        scene.add(m);
        particles.push({
            mesh: m,
            vx: (Math.random() - 0.5) * 5.2,
            vy: (Math.random() - 0.5) * 5.2,
            vz: (Math.random() - 0.5) * 2.5,
            life: 0.45
        });
    }
}

function triggerOverdrive() {
    if (!gameActive || overdriveCharge < 100 || overdriveActiveTimer > 0) return;
    overdriveCharge = 0;
    overdriveActiveTimer = 5.0;
    beam.scale.set(2.4, 1, 2.4);
    beam.material.color.setHex(0xfacc15);
    beam.material.opacity = 0.48;
    playSfx('overdrive');
    statusEl.textContent = 'OVERDRIVE ACTIVE! Wide-beam 2.5x melt power!';
    updateHUD();
}

function aimFromPointer(clientX, clientY) {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
    const targetAngle = Math.atan2(-nx * 6.2, Math.max(1.2, (ny + 0.8) * 4.5));
    beamAngle = Math.max(-1.15, Math.min(1.15, targetAngle));
    emitter.rotation.z = beamAngle;
}

function updateHUD() {
    const pct = Math.min(100, Math.floor((waveCleared / Math.max(1, waveTargetCount)) * 100));
    const hostilesRemaining = Math.max(0, (waveTargetCount - waveSpawned) + stalactites.filter(function (s) { return s.kind !== 'crystal'; }).length);
    waveSpan.textContent = String(wave);
    progressSpan.textContent = pct + '%';
    leftSpan.textContent = String(hostilesRemaining);
    shieldSpan.textContent = shield > 0 ? '❤️'.repeat(shield) : '💔';
    overdriveSpan.textContent = overdriveActiveTimer > 0 ? 'ACTIVE ' + Math.ceil(overdriveActiveTimer) + 's' : Math.floor(overdriveCharge) + '%';
    scoreSpan.textContent = combo > 1 ? score + ' (x' + combo + ')' : String(score);
    bestSpan.textContent = String(bestScore);
}

function startGame() {
    pauseScreen.classList.add('hidden');
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    clock.getDelta();
    gameActive = true;
}

function pauseGame() {
    if (!gameActive) return;
    gameActive = false;
    pauseScreen.classList.remove('hidden');
}

function resumeGame() {
    if (pauseScreen.classList.contains('hidden')) return;
    clock.getDelta();
    pauseScreen.classList.add('hidden');
    gameActive = true;
}

function resetGame() {
    clearDynamic();
    beamAngle = 0;
    rotateDir = 0;
    window.rotateDir = 0;
    emitter.rotation.z = 0;
    beam.scale.set(1, 1, 1);
    beam.material.color.setHex(0x34d399);
    beam.material.opacity = 0.32;

    wave = 1;
    score = 0;
    combo = 1;
    shield = 3;
    overdriveCharge = 0;
    overdriveActiveTimer = 0;
    waveSpawned = 0;
    waveCleared = 0;
    waveTargetCount = 5;
    spawnTimer = 0.3;
    shakeTime = 0;

    statusEl.textContent = 'Wave 1: Melt Red spikes · Let Emerald Crystals reach you!';
    updateHUD();
    startGame();
}

function endGame() {
    gameActive = false;
    saveBest();
    endTitle.textContent = 'Cavern Breached';
    endDesc.textContent = 'Reached Wave ' + wave + ' · Best Score: ' + bestScore;
    finalScoreSpan.textContent = String(score);
    finalWaveSpan.textContent = String(wave);
    gameOverScreen.classList.remove('hidden');
    playSfx('damage');
}

function onKeyDown(e) {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.repeat && ['Escape', 'KeyP', 'Space'].includes(e.code)) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') rotateDir = 1;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') rotateDir = -1;
    else if (e.code === 'Space') triggerOverdrive();
    else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) pauseGame();
        else if (!pauseScreen.classList.contains('hidden')) resumeGame();
    }
}

function onKeyUp(e) {
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && rotateDir === 1) rotateDir = 0;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && rotateDir === -1) rotateDir = 0;
}

function onWindowResize() {
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
}

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (dustPoints) dustPoints.rotation.y += dt * 0.03;

    if (gameActive) {
        const effDir = rotateDir || window.rotateDir || 0;
        beamAngle += effDir * rotationSpeed * dt;
        beamAngle = Math.max(-1.15, Math.min(1.15, beamAngle));
        emitter.rotation.z = beamAngle;

        if (overdriveActiveTimer > 0) {
            overdriveActiveTimer -= dt;
            if (overdriveActiveTimer <= 0) {
                overdriveActiveTimer = 0;
                beam.scale.set(1, 1, 1);
                beam.material.color.setHex(0x34d399);
                beam.material.opacity = 0.32;
            }
        }

        // Spawn targets for current wave
        spawnTimer -= dt;
        if (spawnTimer <= 0 && (waveSpawned < waveTargetCount || stalactites.length < 2)) {
            spawnTarget();
            spawnTimer = Math.max(0.75, 1.95 - wave * 0.14);
        }

        const beamTol = overdriveActiveTimer > 0 ? 0.34 : 0.16;
        const meltRate = overdriveActiveTimer > 0 ? 155 : 68;

        for (let i = stalactites.length - 1; i >= 0; i--) {
            const st = stalactites[i];
            st.mesh.position.y -= st.fallSpeed * dt;
            if (st.driftAmp > 0) {
                st.age += dt;
                st.mesh.position.x = Math.max(-4.8, Math.min(4.8, st.baseX + Math.sin(st.age * st.driftFreq) * st.driftAmp));
                st.mesh.rotation.y += dt * 1.4;
            } else if (st.kind === 'crystal') {
                st.mesh.rotation.y += dt * 2.2;
            }

            const relX = st.mesh.position.x - emitter.position.x;
            const relY = st.mesh.position.y - emitter.position.y;
            const stalAngle = Math.atan2(relX, relY);

            if (Math.abs(stalAngle - (-beamAngle)) < beamTol) {
                st.hp -= meltRate * dt;
                st.mesh.material.emissive.setHex(st.kind === 'crystal' ? 0xef4444 : 0xfbbf24);
                const sc = Math.max(0.22, st.hp / st.maxHp);
                st.mesh.scale.set(sc, sc, sc);

                if (st.hp <= 0) {
                    if (st.kind === 'crystal') {
                        overdriveCharge = Math.max(0, overdriveCharge - 20);
                        combo = 1;
                        spawnBurst(st.mesh.position, 0x34d399, 7);
                        statusEl.textContent = 'Careful! Avoid melting friendly Emerald Crystals!';
                    } else {
                        const pts = (st.kind === 'purple' ? 220 : 120) * combo;
                        score += pts;
                        combo = Math.min(5, combo + 1);
                        waveCleared++;
                        overdriveCharge = Math.min(100, overdriveCharge + (st.kind === 'purple' ? 24 : 16));
                        spawnBurst(st.mesh.position, st.kind === 'purple' ? 0xc084fc : 0xf97316, 9);
                        playSfx('melt');
                        saveBest();
                        if (overdriveCharge >= 100 && overdriveActiveTimer <= 0) {
                            statusEl.textContent = 'OVERDRIVE READY! Press Space for Wide-Beam!';
                        }
                    }
                    scene.remove(st.mesh);
                    st.mesh.material.dispose();
                    stalactites.splice(i, 1);
                    continue;
                }
            } else {
                st.mesh.material.emissive.setHex(
                    st.kind === 'crystal' ? 0x065f46 : (st.kind === 'purple' ? 0x4c1d95 : 0x690808)
                );
            }

            // Reached cavern floor
            if (st.mesh.position.y <= -3.15) {
                if (st.kind === 'crystal') {
                    overdriveCharge = Math.min(100, overdriveCharge + 28);
                    if (shield < 3) shield++;
                    score += 80;
                    spawnBurst(st.mesh.position, 0x34d399, 8);
                    playSfx('crystal');
                    statusEl.textContent = 'Crystal absorbed! +28% Overdrive & Shield boost!';
                } else {
                    shield--;
                    combo = 1;
                    waveCleared++;
                    shakeTime = 0.25;
                    spawnBurst(st.mesh.position, 0xef4444, 10);
                    playSfx('damage');
                    statusEl.textContent = 'Bottleneck breached floor! Shield damaged!';
                    if (shield <= 0) {
                        scene.remove(st.mesh);
                        st.mesh.material.dispose();
                        stalactites.splice(i, 1);
                        updateHUD();
                        endGame();
                        return;
                    }
                }
                scene.remove(st.mesh);
                st.mesh.material.dispose();
                stalactites.splice(i, 1);
            }
        }

        // Advance wave once all wave hostiles resolved
        const activeHostiles = stalactites.some(function (s) { return s.kind !== 'crystal'; });
        if (waveSpawned >= waveTargetCount && !activeHostiles) {
            wave++;
            score += 200 * wave;
            waveSpawned = 0;
            waveCleared = 0;
            waveTargetCount = 5 + wave * 2;
            playSfx('wave');
            saveBest();
            statusEl.textContent = 'Wave ' + wave + ' Cleared! Deeper bottlenecks incoming!';
        }

        updateHUD();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.material.opacity = Math.max(0, p.life / 0.45);
        if (p.life <= 0) {
            scene.remove(p.mesh);
            p.mesh.material.dispose();
            particles.splice(i, 1);
        }
    }

    if (shakeTime > 0) {
        shakeTime = Math.max(0, shakeTime - dt);
        camera.position.x = (Math.random() - 0.5) * 0.28;
        camera.position.y = 0.2 + (Math.random() - 0.5) * 0.28;
    } else {
        camera.position.x = 0;
        camera.position.y = 0.2;
    }

    renderer.render(scene, camera);
}

function installSessionControls() {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
        position: 'absolute', right: '12px', bottom: '12px', zIndex: '20',
        display: 'flex', gap: '8px', alignItems: 'center'
    });
    const muteBtn = document.createElement('button');
    muteBtn.type = 'button';
    muteBtn.textContent = '🔊';
    muteBtn.title = 'Toggle sound';
    muteBtn.setAttribute('aria-label', 'Toggle sound');
    Object.assign(muteBtn.style, {
        minHeight: '40px', minWidth: '40px', padding: '7px 10px', border: '1px solid #64748b',
        borderRadius: '8px', color: '#f8fafc', background: '#0f172ae8', font: '600 14px system-ui', cursor: 'pointer'
    });
    muteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        isMuted = !isMuted;
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
    });

    const pause = document.createElement('button');
    pause.type = 'button';
    pause.textContent = 'Ⅱ Pause';
    pause.setAttribute('aria-label', 'Pause game');
    Object.assign(pause.style, {
        minHeight: '40px', padding: '7px 12px', border: '1px solid #64748b',
        borderRadius: '8px', color: '#f8fafc', background: '#0f172ae8', font: '600 13px system-ui', cursor: 'pointer'
    });
    pause.addEventListener('click', function (e) {
        e.stopPropagation();
        if (gameActive) { pauseGame(); resumeBtn.focus({ preventScroll: true }); }
    });
    wrap.appendChild(muteBtn);
    wrap.appendChild(pause);
    renderer.domElement.parentElement.appendChild(wrap);

    function refresh() { pause.style.display = gameActive ? 'inline-block' : 'none'; }
    const observer = new MutationObserver(refresh);
    for (const scr of [startScreen, pauseScreen, gameOverScreen]) {
        observer.observe(scr, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    }
    refresh();
}

(function () {
    function suspend() {
        rotateDir = 0; window.rotateDir = 0;
        if (gameActive) { pauseGame(); resumeBtn.focus({ preventScroll: true }); }
    }
    window.addEventListener('blur', suspend);
    window.addEventListener('pagehide', suspend);
    document.addEventListener('visibilitychange', function () { if (document.hidden) suspend(); });
})();
