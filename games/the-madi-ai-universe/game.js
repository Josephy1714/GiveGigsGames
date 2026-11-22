// The MADI AI Universe - 3D Orbital Recon Defense & Portable Sector Warp Hub
'use strict';

let scene, camera, renderer, clock;
let coreGlobe, coreInner, coreRingA, coreRingB, probeGroup, starPoints;
let regions = [];
let enemies = [];
let packets = [];
let beams = [];
let particles = [];

let gameActive = false;
let exploreMode = false;
let isMuted = false;
let score = 0;
let wave = 1;
let integrity = 100;
let combo = 1;
let comboTimer = 0;
let waveProgress = 0;
let waveTarget = 8;
let spawnTimer = 0;
let packetTimer = 2.0;
let empCooldown = 0;
let shakeTime = 0;
let probeAngle = 0;
let probeRadius = 3.2;
let steerX = 0;
let steerY = 0;

const SAVE_KEY = 'the-madi-ai-universe:best';
let bestScore = readBest();

const tooltip = document.getElementById('map-tooltip');
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const exploreBtn = document.getElementById('explore-hub-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');
const waveSpan = document.getElementById('game-wave');
const scoreSpan = document.getElementById('game-score');
const integritySpan = document.getElementById('game-integrity');
const bestSpan = document.getElementById('game-best');
const finalScoreSpan = document.getElementById('final-score-val');
const finalWaveSpan = document.getElementById('final-wave-val');
const endTitle = document.getElementById('end-title');
const endDesc = document.getElementById('end-desc');

window.gameState = { title: 'the-madi-ai-universe', get active() { return gameActive; } };
window.game = window.gameState;

// Shared geometries/materials for dynamic objects
let glitchGeo, eliteGeo, packetGeo, sparkGeo;
let glitchMat, eliteMat, packetMat;

// --- WebAudio Synth ---
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
        if (kind === 'zap') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(680, now);
            osc.frequency.exponentialRampToValueAtTime(190, now + 0.11);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.start(now); osc.stop(now + 0.12);
        } else if (kind === 'emp') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(95, now + 0.28);
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        } else if (kind === 'packet') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(784, now + 0.06);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.start(now); osc.stop(now + 0.18);
        } else if (kind === 'hit') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.linearRampToValueAtTime(70, now + 0.2);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.start(now); osc.stop(now + 0.22);
        } else if (kind === 'wave') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554, now + 0.08);
            osc.frequency.setValueAtTime(659, now + 0.16);
            gain.gain.setValueAtTime(0.11, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            osc.start(now); osc.stop(now + 0.32);
        } else if (kind === 'over') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(240, now);
            osc.frequency.exponentialRampToValueAtTime(55, now + 0.45);
            gain.gain.setValueAtTime(0.13, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
            osc.start(now); osc.stop(now + 0.46);
        }
    } catch (_) {}
}

function readBest() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return 0;
        const parsed = JSON.parse(raw);
        return Number.isFinite(parsed?.score) ? parsed.score : (Number(raw) || 0);
    } catch (_) { return 0; }
}
function saveBest(newScore, newWave) {
    if (newScore > bestScore) bestScore = newScore;
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ score: bestScore, wave: newWave }));
    } catch (_) {}
    if (bestSpan) bestSpan.textContent = String(bestScore);
}

function resolveWarpHref(slug) {
    try {
        if (location.protocol === 'http:' || location.protocol === 'https:') {
            return new URL('../../ggg/play/' + encodeURIComponent(slug), location.href).href;
        }
    } catch (_) {}
    return '../' + encodeURIComponent(slug) + '/index.html';
}

function openWarpTarget(slug) {
    const fallback = '../' + encodeURIComponent(slug) + '/index.html';
    try {
        if (window.top && window.top !== window && (location.protocol === 'http:' || location.protocol === 'https:')) {
            window.top.location.assign(resolveWarpHref(slug));
            return;
        }
    } catch (_) {}
    window.location.assign(fallback);
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
    scene.background = new THREE.Color(0x05040d);
    scene.fog = new THREE.FogExp2(0x05040d, 0.025);

    camera = new THREE.PerspectiveCamera(56, 800 / 600, 0.1, 140);
    camera.position.set(0, 1.4, 13.5);
    camera.lookAt(0, 0.2, 0);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    clock = new THREE.Clock();

    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.55);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xa78bfa, 1.15);
    dirLight.position.set(6, 10, 8);
    scene.add(dirLight);
    const coreLight = new THREE.PointLight(0x38bdf8, 1.5, 25);
    coreLight.position.set(0, 0, 2);
    scene.add(coreLight);

    glitchGeo = new THREE.OctahedronGeometry(0.42, 0);
    eliteGeo = new THREE.OctahedronGeometry(0.56, 0);
    packetGeo = new THREE.TorusGeometry(0.3, 0.1, 8, 16);
    sparkGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    glitchMat = new THREE.MeshPhongMaterial({ color: 0xef4444, emissive: 0x7f1d1d, shininess: 90 });
    eliteMat = new THREE.MeshPhongMaterial({ color: 0xc084fc, emissive: 0x581c87, shininess: 110 });
    packetMat = new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0x713f12, shininess: 120 });

    buildStarfield();
    buildCore();
    setupRegions();
    buildProbe();
    installRegionLinks();
    installSessionControls();

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('touchstart', function (e) {
        e.preventDefault();
        initAudio();
        const t = e.touches[0];
        if (t) onCanvasClick({ clientX: t.clientX, clientY: t.clientY });
    }, { passive: false });

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    startBtn.addEventListener('click', function () { initAudio(); exploreMode = false; resetRun(); });
    exploreBtn.addEventListener('click', function () {
        initAudio();
        exploreMode = true;
        gameActive = false;
        startScreen.classList.add('hidden');
        tooltip.textContent = 'Explore Mode: Click any glowing sector island or dock button to warp!';
    });
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', function () { exploreMode = false; resetRun(); });
    playAgainBtn.addEventListener('click', function () { exploreMode = false; resetRun(); });

    window.addEventListener('resize', onWindowResize);
    onWindowResize();
    updateHUD();
    animate();
}

function buildStarfield() {
    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 44;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 32;
        positions[i * 3 + 2] = -6 - Math.random() * 28;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xc4b5fd, size: 0.14, transparent: true, opacity: 0.78 });
    starPoints = new THREE.Points(geo, mat);
    scene.add(starPoints);
}

function buildCore() {
    coreGlobe = new THREE.Mesh(
        new THREE.SphereGeometry(1.55, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0x312e81, emissive: 0x1e1b4b, wireframe: true })
    );
    scene.add(coreGlobe);

    coreInner = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 20, 20),
        new THREE.MeshPhongMaterial({ color: 0x38bdf8, emissive: 0x0e7490, shininess: 110 })
    );
    scene.add(coreInner);

    coreRingA = new THREE.Mesh(
        new THREE.TorusGeometry(2.35, 0.035, 8, 64),
        new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.45 })
    );
    coreRingA.rotation.x = Math.PI / 2.6;
    scene.add(coreRingA);

    coreRingB = new THREE.Mesh(
        new THREE.TorusGeometry(4.75, 0.03, 8, 80),
        new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.28 })
    );
    coreRingB.rotation.x = Math.PI / 2.2;
    scene.add(coreRingB);
}

function buildProbe() {
    probeGroup = new THREE.Group();
    const hull = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.85, 6),
        new THREE.MeshPhongMaterial({ color: 0x22d3ee, emissive: 0x083344, shininess: 120 })
    );
    hull.rotation.x = Math.PI / 2;
    probeGroup.add(hull);
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.36, 0.05, 6, 18),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    probeGroup.add(ring);
    scene.add(probeGroup);
}

function setupRegions() {
    const regionGeo = new THREE.CylinderGeometry(0.68, 0.84, 0.36, 6);
    const haloGeo = new THREE.RingGeometry(0.75, 0.92, 24);
    const data = [
        { slug: 'the-revenue-jungle', color: 0x10b981, name: 'Revenue Jungle' },
        { slug: 'temple-of-lost-revenue', color: 0xf59e0b, name: 'Temple of Lost Revenue' },
        { slug: 'the-pipeline-mountain', color: 0x38bdf8, name: 'Pipeline Mountain' },
        { slug: 'the-speed-portal', color: 0x06b6d4, name: 'Speed Portal' },
        { slug: 'the-revenue-dragon', color: 0xef4444, name: 'Revenue Dragon' },
        { slug: 'treasure-hunters', color: 0xfacc15, name: 'Treasure Hunters' }
    ];
    const radius = 4.65;
    data.forEach(function (d, idx) {
        const angle = (idx / data.length) * Math.PI * 2 + Math.PI / 6;
        const bx = Math.cos(angle) * radius;
        const by = Math.sin(angle) * 2.95 + 0.45;
        const mat = new THREE.MeshPhongMaterial({ color: d.color, emissive: 0x111827, shininess: 90 });
        const island = new THREE.Mesh(regionGeo, mat);
        island.position.set(bx, by, 0);
        island.rotation.x = 0.32;
        scene.add(island);

        const halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: d.color, side: THREE.DoubleSide, transparent: true, opacity: 0.45 }));
        halo.position.set(bx, by - 0.16, 0);
        halo.rotation.x = Math.PI / 2 - 0.32;
        scene.add(halo);

        regions.push({ mesh: island, halo: halo, name: d.name, slug: d.slug, baseY: by, defaultColor: d.color });
    });
}

function clearDynamicEntities() {
    for (const e of enemies) { scene.remove(e.mesh); e.mesh.material.dispose(); }
    for (const p of packets) { scene.remove(p.mesh); }
    for (const b of beams) { scene.remove(b.line); b.line.geometry.dispose(); b.line.material.dispose(); }
    for (const sp of particles) { scene.remove(sp.mesh); sp.mesh.material.dispose(); }
    enemies = []; packets = []; beams = []; particles = [];
}

function resetRun() {
    clearDynamicEntities();
    score = 0;
    wave = 1;
    integrity = 100;
    combo = 1;
    comboTimer = 0;
    waveProgress = 0;
    waveTarget = 8;
    spawnTimer = 0.4;
    packetTimer = 2.0;
    empCooldown = 0;
    shakeTime = 0;
    probeAngle = 0;
    probeRadius = 3.2;
    steerX = 0;
    steerY = 0;
    startScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameActive = true;
    clock.getDelta();
    updateHUD();
    tooltip.textContent = 'Wave 1: Click glitch drones or steer probe (WASD + Space)!';
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

function endGame() {
    gameActive = false;
    saveBest(score, wave);
    finalScoreSpan.textContent = String(score);
    finalWaveSpan.textContent = String(wave);
    endTitle.textContent = 'Universe Compromised';
    endDesc.textContent = 'Defended through Wave ' + wave + '. Score: ' + score + ' (Best: ' + bestScore + ').';
    gameOverScreen.classList.remove('hidden');
    playSfx('over');
}

function updateHUD() {
    waveSpan.textContent = String(wave);
    scoreSpan.textContent = combo > 1 ? score + ' (x' + combo + ')' : String(score);
    integritySpan.textContent = Math.max(0, Math.round(integrity)) + '%';
    bestSpan.textContent = String(bestScore);
}

function spawnGlitch() {
    const angle = Math.random() * Math.PI * 2;
    const startDist = 7.8;
    const isElite = wave >= 2 && Math.random() < Math.min(0.4, 0.12 + wave * 0.04);
    const mesh = new THREE.Mesh(
        isElite ? eliteGeo : glitchGeo,
        (isElite ? eliteMat : glitchMat).clone()
    );
    mesh.position.set(Math.cos(angle) * startDist, Math.sin(angle) * 4.9 + 0.35, (Math.random() - 0.5) * 0.6);
    scene.add(mesh);
    const targetRegion = regions[Math.floor(Math.random() * regions.length)];
    enemies.push({
        mesh: mesh,
        hp: isElite ? 2 : 1,
        elite: isElite,
        speed: 1.05 + wave * 0.16 + Math.random() * 0.35,
        target: targetRegion
    });
}

function spawnPacket() {
    const mesh = new THREE.Mesh(packetGeo, packetMat);
    const angle = Math.random() * Math.PI * 2;
    mesh.position.set(Math.cos(angle) * 4.2, Math.sin(angle) * 2.6 + 0.4, 0);
    scene.add(mesh);
    packets.push({ mesh: mesh, life: 9.0 });
}

function spawnBurst(pos, color, count) {
    for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 }));
        m.position.copy(pos);
        scene.add(m);
        particles.push({
            mesh: m,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            vz: (Math.random() - 0.5) * 3,
            life: 0.45
        });
    }
}

function spawnBeam(fromPos, toPos, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([fromPos.clone(), toPos.clone()]);
    const mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 1 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    beams.push({ line: line, life: 0.18 });
}

function damageGlitch(idx, originPos) {
    const e = enemies[idx];
    if (!e) return;
    e.hp -= 1;
    spawnBeam(originPos || probeGroup.position, e.mesh.position, e.elite ? 0xc084fc : 0x38bdf8);
    if (e.hp > 0) {
        e.mesh.material.emissive.setHex(0xffffff);
        playSfx('zap');
        spawnBurst(e.mesh.position, 0xc084fc, 4);
        return;
    }
    const pts = (e.elite ? 220 : 100) * combo;
    score += pts;
    combo = Math.min(5, combo + 1);
    comboTimer = 3.2;
    waveProgress++;
    spawnBurst(e.mesh.position, e.elite ? 0xc084fc : 0xf97316, 8);
    scene.remove(e.mesh);
    e.mesh.material.dispose();
    enemies.splice(idx, 1);
    playSfx('zap');
    if (waveProgress >= waveTarget) {
        wave++;
        waveProgress = 0;
        waveTarget = 8 + wave * 3;
        integrity = Math.min(100, integrity + 15);
        playSfx('wave');
        tooltip.textContent = 'Wave ' + wave + ' Incoming! Integrity +15%';
    }
    saveBest(score, wave);
    updateHUD();
}

function collectPacket(idx) {
    const p = packets[idx];
    if (!p) return;
    score += 180 * combo;
    integrity = Math.min(100, integrity + 10);
    combo = Math.min(5, combo + 1);
    comboTimer = 3.6;
    spawnBurst(p.mesh.position, 0xfacc15, 8);
    scene.remove(p.mesh);
    packets.splice(idx, 1);
    playSfx('packet');
    saveBest(score, wave);
    updateHUD();
}

function fireEmpPulse() {
    if (!gameActive || empCooldown > 0) return;
    empCooldown = 2.6;
    playSfx('emp');
    spawnBurst(probeGroup.position, 0x22d3ee, 14);
    let hits = 0;
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].mesh.position.distanceTo(probeGroup.position) < 3.4) {
            damageGlitch(i, probeGroup.position);
            hits++;
        }
    }
    if (!hits) tooltip.textContent = 'EMP Pulse discharged! Steer closer to drones to chain hits.';
}

function getRayHits(event, objects) {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return [];
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects(objects);
}

function onMouseMove(event) {
    const meshes = regions.map(function (r) { return r.mesh; });
    const hits = getRayHits(event, meshes);
    const hitObj = hits.length ? hits[0].object : null;
    regions.forEach(function (r) {
        const over = r.mesh === hitObj;
        r.mesh.material.color.setHex(over ? 0xffffff : r.defaultColor);
        r.mesh.scale.setScalar(over ? 1.18 : 1.0);
        if (over) {
            tooltip.textContent = (gameActive ? 'Click again or use dock to warp: ' : 'Warp to: ') + r.name;
        }
    });
}

function onCanvasClick(event) {
    initAudio();
    if (gameActive) {
        // 1. Check glitch enemies first (generous click distance via raycaster)
        const eMeshes = enemies.map(function (e) { return e.mesh; });
        const eHits = getRayHits(event, eMeshes);
        if (eHits.length) {
            const idx = enemies.findIndex(function (e) { return e.mesh === eHits[0].object; });
            if (idx >= 0) { damageGlitch(idx, coreGlobe.position); return; }
        }
        // 2. Check golden data packets
        const pMeshes = packets.map(function (p) { return p.mesh; });
        const pHits = getRayHits(event, pMeshes);
        if (pHits.length) {
            const idx = packets.findIndex(function (p) { return p.mesh === pHits[0].object; });
            if (idx >= 0) { collectPacket(idx); return; }
        }
    }
    const rHits = getRayHits(event, regions.map(function (r) { return r.mesh; }));
    if (rHits.length) {
        const reg = regions.find(function (r) { return r.mesh === rHits[0].object; });
        if (reg && (!gameActive || exploreMode)) {
            openWarpTarget(reg.slug);
        }
    }
}

function onKeyDown(e) {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') steerX = -1;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') steerX = 1;
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') steerY = 1;
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') steerY = -1;
    else if (e.code === 'Space') { e.preventDefault(); fireEmpPulse(); }
    else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) pauseGame();
        else if (!pauseScreen.classList.contains('hidden')) resumeGame();
    }
}

function onKeyUp(e) {
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && steerX === -1) steerX = 0;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && steerX === 1) steerX = 0;
    if ((e.code === 'ArrowUp' || e.code === 'KeyW') && steerY === 1) steerY = 0;
    if ((e.code === 'ArrowDown' || e.code === 'KeyS') && steerY === -1) steerY = 0;
}

function onWindowResize() {
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    const ratio = renderer.getPixelRatio();
    if (canvas.width !== Math.floor(w * ratio) || canvas.height !== Math.floor(h * ratio)) {
        renderer.setSize(w, h, false);
    }
    const aspect = w / h;
    if (camera.aspect !== aspect) {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
    }
}

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = performance.now() * 0.001;

    coreGlobe.rotation.y += dt * 0.35;
    coreInner.rotation.y -= dt * 0.65;
    coreRingA.rotation.z += dt * 0.4;
    coreRingB.rotation.z -= dt * 0.25;
    if (starPoints) starPoints.rotation.z += dt * 0.012;

    regions.forEach(function (r, idx) {
        r.mesh.rotation.y += dt * 0.8;
        const bob = Math.sin(t * 1.8 + idx) * 0.14;
        r.mesh.position.y = r.baseY + bob;
        r.halo.position.y = r.baseY - 0.16 + bob;
    });

    if (gameActive) {
        if (empCooldown > 0) empCooldown = Math.max(0, empCooldown - dt);
        if (comboTimer > 0) {
            comboTimer -= dt;
            if (comboTimer <= 0) { combo = 1; updateHUD(); }
        }

        // Orbiting/steerable defense probe
        probeAngle += (steerX !== 0 ? steerX * 3.1 : 1.15) * dt;
        probeRadius = Math.max(1.8, Math.min(5.2, probeRadius + steerY * 2.8 * dt));
        probeGroup.position.set(Math.cos(probeAngle) * probeRadius, Math.sin(probeAngle) * (probeRadius * 0.66) + 0.35, 0.35);
        probeGroup.rotation.z = probeAngle + Math.PI / 2;

        // Probe collects nearby packets automatically
        for (let i = packets.length - 1; i >= 0; i--) {
            packets[i].mesh.rotation.y += dt * 2.4;
            packets[i].life -= dt;
            if (packets[i].mesh.position.distanceTo(probeGroup.position) < 0.95) {
                collectPacket(i);
            } else if (packets[i].life <= 0) {
                scene.remove(packets[i].mesh);
                packets.splice(i, 1);
            }
        }

        // Spawn glitches & packets
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
            spawnGlitch();
            spawnTimer = Math.max(0.48, 1.55 - wave * 0.1);
        }
        packetTimer -= dt;
        if (packetTimer <= 0) {
            if (packets.length < 3) spawnPacket();
            packetTimer = 3.8;
        }

        // Move enemies toward target sectors
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            e.mesh.rotation.x += dt * 2.1;
            e.mesh.rotation.y += dt * 2.6;
            const dest = e.target.mesh.position;
            const dir = new THREE.Vector3().subVectors(dest, e.mesh.position);
            const dist = dir.length();
            if (dist < 0.72) {
                integrity -= e.elite ? 20 : 12;
                combo = 1;
                shakeTime = 0.25;
                spawnBurst(e.mesh.position, 0xef4444, 10);
                scene.remove(e.mesh);
                e.mesh.material.dispose();
                enemies.splice(i, 1);
                playSfx('hit');
                updateHUD();
                if (integrity <= 0) { endGame(); return; }
                continue;
            }
            dir.normalize();
            e.mesh.position.addScaledVector(dir, e.speed * dt);
            if (e.mesh.position.distanceTo(probeGroup.position) < 0.75) {
                damageGlitch(i, probeGroup.position);
            }
        }
    } else {
        probeAngle += dt * 0.75;
        probeGroup.position.set(Math.cos(probeAngle) * 3.1, Math.sin(probeAngle) * 2.0 + 0.35, 0.35);
        probeGroup.rotation.z = probeAngle + Math.PI / 2;
    }

    // Update beams & particles
    for (let i = beams.length - 1; i >= 0; i--) {
        beams[i].life -= dt;
        beams[i].line.material.opacity = Math.max(0, beams[i].life / 0.18);
        if (beams[i].life <= 0) {
            scene.remove(beams[i].line);
            beams[i].line.geometry.dispose();
            beams[i].line.material.dispose();
            beams.splice(i, 1);
        }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
        const sp = particles[i];
        sp.life -= dt;
        sp.mesh.position.x += sp.vx * dt;
        sp.mesh.position.y += sp.vy * dt;
        sp.mesh.position.z += sp.vz * dt;
        sp.mesh.material.opacity = Math.max(0, sp.life / 0.45);
        if (sp.life <= 0) {
            scene.remove(sp.mesh);
            sp.mesh.material.dispose();
            particles.splice(i, 1);
        }
    }

    if (shakeTime > 0) {
        shakeTime = Math.max(0, shakeTime - dt);
        camera.position.x = (Math.random() - 0.5) * 0.32;
        camera.position.y = 1.4 + (Math.random() - 0.5) * 0.32;
    } else {
        camera.position.x = 0;
        camera.position.y = 1.4;
    }

    renderer.render(scene, camera);
}

function installRegionLinks() {
    const nav = document.createElement('nav');
    nav.className = 'universe-dock';
    nav.setAttribute('aria-label', 'Warp to a MADI world');
    for (const region of regions) {
        const link = document.createElement('a');
        link.className = 'universe-warp-link';
        link.href = resolveWarpHref(region.slug);
        link.target = '_top';
        link.textContent = region.name;
        const color = '#' + region.defaultColor.toString(16).padStart(6, '0');
        link.style.border = '1px solid ' + color;
        link.addEventListener('click', function (ev) {
            if (location.protocol === 'file:') return;
            ev.preventDefault();
            openWarpTarget(region.slug);
        });
        nav.appendChild(link);
    }
    renderer.domElement.parentElement.appendChild(nav);
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
    pause.textContent = 'Ⅱ';
    pause.title = 'Pause game';
    pause.setAttribute('aria-label', 'Pause game');
    Object.assign(pause.style, {
        minHeight: '40px', minWidth: '40px', padding: '7px 12px', border: '1px solid #64748b',
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
        steerX = 0; steerY = 0;
        if (gameActive) { pauseGame(); }
    }
    window.addEventListener('blur', suspend);
    window.addEventListener('pagehide', suspend);
    document.addEventListener('visibilitychange', function () { if (document.hidden) suspend(); });
})();
