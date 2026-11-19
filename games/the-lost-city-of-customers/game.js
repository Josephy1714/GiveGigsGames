// The Lost City of Customers - Strategic Hot/Cold Thermal Radar Triangulation
'use strict';

let scene, camera, renderer, clock;
let terrainTiles = [];
let targets = [];
let scanWave = null;
let cursorMesh = null;
let particles = [];

const rows = 8;
const cols = 8;
const tileSize = 2;

let sector = 1;
let foundCount = 0;
let sectorTargetCount = 5;
let totalScans = 0;
let scansLeft = 18;
let score = 0;
let streak = 0;
let cursorR = 3;
let cursorC = 3;
let sectorTransitionTimer = 0;
let gameActive = false;
let isMuted = false;

const SAVE_KEY = 'the-lost-city-of-customers:best';
let bestScore = readBest();

const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');

const sectorSpan = document.getElementById('game-sector');
const foundSpan = document.getElementById('found-count');
const scansLeftSpan = document.getElementById('scans-left');
const scanSpan = document.getElementById('scan-count');
const scoreSpan = document.getElementById('game-score');
const bestSpan = document.getElementById('game-best');
const feedEl = document.getElementById('scanner-feed');
const endTitle = document.getElementById('end-title');
const endDesc = document.getElementById('end-desc');
const finalScoreSpan = document.getElementById('final-score-val');
const finalSectorSpan = document.getElementById('final-sector-val');

window.gameState = { title: 'the-lost-city-of-customers', get active() { return gameActive; } };
window.game = window.gameState;

let crystalGeo, sparkGeo;

let audioCtx = null;
function initAudio() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } catch (_) {}
}
function playSonar(freq, isDouble) {
    if (isMuted) return;
    initAudio();
    if (!audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        if (isDouble) osc.frequency.setValueAtTime(freq * 1.25, now + 0.07);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now); osc.stop(now + 0.22);
    } catch (_) {}
}
function playCapture() {
    if (isMuted) return;
    initAudio();
    if (!audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.06);
        osc.frequency.setValueAtTime(784, now + 0.12);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now); osc.stop(now + 0.28);
    } catch (_) {}
}
function playJam() {
    if (isMuted) return;
    initAudio();
    if (!audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.18);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
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
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ score: bestScore, sector: sector })); } catch (_) {}
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
    scene.background = new THREE.Color(0x020a07);
    scene.fog = new THREE.FogExp2(0x020a07, 0.025);

    camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 100);
    camera.position.set(0, 15.5, 13.5);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    clock = new THREE.Clock();

    scene.add(new THREE.AmbientLight(0xd1fae5, 0.55));
    const dirLight = new THREE.DirectionalLight(0x10b981, 1.05);
    dirLight.position.set(5, 16, 6);
    scene.add(dirLight);

    crystalGeo = new THREE.OctahedronGeometry(0.45, 0);
    sparkGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);

    buildTerrain();
    buildCursor();
    setupSector(1);
    installSessionControls();

    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('touchstart', function (e) {
        e.preventDefault();
        initAudio();
        const t = e.touches[0];
        if (t) onCanvasClick({ clientX: t.clientX, clientY: t.clientY });
    }, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    startBtn.addEventListener('click', function () { initAudio(); resetGame(); });
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    window.addEventListener('resize', onWindowResize);
    onWindowResize();
    updateHUD();
    animate();
}

function buildTerrain() {
    const tileGeo = new THREE.BoxGeometry(tileSize * 0.92, 0.45, tileSize * 0.92);
    const startX = -(cols * tileSize) / 2 + tileSize / 2;
    const startZ = -(rows * tileSize) / 2 + tileSize / 2;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const mat = new THREE.MeshStandardMaterial({ color: 0x064e3b, emissive: 0x022c22, roughness: 0.82 });
            const tile = new THREE.Mesh(tileGeo, mat);
            tile.position.set(startX + c * tileSize, Math.random() * 0.18, startZ + r * tileSize);
            tile.userData = { r: r, c: c, scanned: false, decoy: false };
            scene.add(tile);
            terrainTiles.push(tile);
        }
    }
}

function buildCursor() {
    cursorMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.65, 0.82, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    cursorMesh.rotation.x = -Math.PI / 2;
    cursorMesh.rotation.z = Math.PI / 4;
    scene.add(cursorMesh);
    syncCursor();
}

function syncCursor() {
    const tile = terrainTiles[cursorR * cols + cursorC];
    if (tile && cursorMesh) {
        cursorMesh.position.set(tile.position.x, tile.position.y + 0.3, tile.position.z);
    }
}

function clearSectorTargets() {
    for (const t of targets) { scene.remove(t.mesh); t.mesh.material.dispose(); }
    for (const sp of particles) { scene.remove(sp.mesh); sp.mesh.material.dispose(); }
    targets = [];
    particles = [];
    if (scanWave) {
        scene.remove(scanWave);
        scanWave.geometry.dispose();
        scanWave.material.dispose();
        scanWave = null;
    }
}

function setupSector(sec) {
    clearSectorTargets();
    foundCount = 0;
    sectorTargetCount = Math.min(8, 4 + sec);
    scansLeft = Math.max(15, 17 + sec * 2);

    terrainTiles.forEach(function (t) {
        t.userData.scanned = false;
        t.userData.decoy = false;
        t.material.color.setHex(0x064e3b);
        t.material.emissive.setHex(0x022c22);
    });

    const indices = terrainTiles.map(function (_, i) { return i; });
    for (let k = 0; k < sectorTargetCount; k++) {
        const pick = indices.splice(Math.floor(Math.random() * indices.length), 1)[0];
        const tile = terrainTiles[pick];
        const mesh = new THREE.Mesh(crystalGeo, new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0x713f12, shininess: 100 }));
        mesh.position.set(tile.position.x, tile.position.y + 0.65, tile.position.z);
        mesh.visible = false;
        scene.add(mesh);
        targets.push({ mesh: mesh, r: tile.userData.r, c: tile.userData.c, found: false, revealed: false });
    }

    // Add purple static interference decoy tiles on Sector 2+
    const decoyCount = sec >= 2 ? Math.min(4, sec + 1) : 0;
    for (let d = 0; d < decoyCount && indices.length; d++) {
        const pick = indices.splice(Math.floor(Math.random() * indices.length), 1)[0];
        terrainTiles[pick].userData.decoy = true;
    }
    updateHUD();
}

function spawnBurst(pos, color, count) {
    for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 }));
        m.position.copy(pos);
        scene.add(m);
        particles.push({
            mesh: m,
            vx: (Math.random() - 0.5) * 5.0,
            vy: 2 + Math.random() * 4.5,
            vz: (Math.random() - 0.5) * 5.0,
            life: 0.45
        });
    }
}

function scanTile(tile) {
    if (!gameActive || sectorTransitionTimer > 0 || !tile) return;
    if (tile.userData.scanned && !targets.some(function (t) { return !t.found && t.r === tile.userData.r && t.c === tile.userData.c; })) {
        return;
    }

    totalScans++;
    scansLeft = Math.max(0, scansLeft - 1);
    tile.userData.scanned = true;

    if (scanWave) {
        scene.remove(scanWave);
        scanWave.geometry.dispose();
        scanWave.material.dispose();
    }
    scanWave = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.4, 28),
        new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    scanWave.rotation.x = -Math.PI / 2;
    scanWave.position.set(tile.position.x, tile.position.y + 0.35, tile.position.z);
    scene.add(scanWave);

    if (tile.userData.decoy) {
        tile.material.color.setHex(0x9333ea);
        tile.material.emissive.setHex(0x4c1d95);
        scansLeft = Math.max(0, scansLeft - 1);
        streak = 0;
        playJam();
        spawnBurst(tile.position, 0xc084fc, 8);
        feedEl.textContent = 'STATIC INTERFERENCE! Decoy drained 1 extra scan!';
        updateHUD();
        if (scansLeft <= 0 && foundCount < sectorTargetCount) endGame();
        return;
    }

    let minDist = 99;
    let capturedTarget = null;
    for (const t of targets) {
        if (t.found) continue;
        const d = Math.hypot(t.r - tile.userData.r, t.c - tile.userData.c);
        if (d === 0) { capturedTarget = t; break; }
        if (d < minDist) minDist = d;
        if (d <= 1.5) {
            t.revealed = true;
            t.mesh.visible = true;
        }
    }

    if (capturedTarget) {
        capturedTarget.found = true;
        capturedTarget.mesh.visible = true;
        capturedTarget.mesh.material.color.setHex(0x10b981);
        capturedTarget.mesh.material.emissive.setHex(0x065f46);
        tile.material.color.setHex(0x10b981);
        tile.material.emissive.setHex(0x064e3b);

        foundCount++;
        streak++;
        scansLeft += 3;
        const pts = 250 + streak * 50;
        score += pts;
        saveBest();
        spawnBurst(capturedTarget.mesh.position, 0xfacc15, 12);
        playCapture();
        feedEl.textContent = 'CUSTOMER CAPTURED! +' + pts + ' pts & +3 Bonus Scans!';

        if (foundCount >= sectorTargetCount) {
            const effBonus = scansLeft * 150;
            score += effBonus;
            saveBest();
            sectorTransitionTimer = 1.05;
            feedEl.textContent = 'Sector ' + sector + ' Cleared! Efficiency Bonus +$' + effBonus + '!';
        }
    } else {
        streak = 0;
        if (minDist <= 1.5) {
            tile.material.color.setHex(0xf97316);
            tile.material.emissive.setHex(0x7c2d12);
            playSonar(780, true);
            feedEl.textContent = 'HOT! Target is right next to this tile (dist ' + minDist.toFixed(1) + ')!';
        } else if (minDist <= 3.0) {
            tile.material.color.setHex(0x0d9488);
            tile.material.emissive.setHex(0x115e59);
            playSonar(520, false);
            feedEl.textContent = 'WARM — Signal detected within 3 tiles.';
        } else {
            tile.material.color.setHex(0x1e3a8a);
            tile.material.emissive.setHex(0x0f172a);
            playSonar(280, false);
            feedEl.textContent = 'COLD — No customer signals nearby.';
        }
    }

    updateHUD();
    if (scansLeft <= 0 && foundCount < sectorTargetCount) {
        endGame();
    }
}

function updateHUD() {
    sectorSpan.textContent = String(sector);
    foundSpan.textContent = foundCount + '/' + sectorTargetCount;
    scansLeftSpan.textContent = String(scansLeft);
    scanSpan.textContent = String(totalScans);
    scoreSpan.textContent = String(score);
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
    sector = 1;
    totalScans = 0;
    score = 0;
    streak = 0;
    sectorTransitionTimer = 0;
    setupSector(1);
    feedEl.textContent = 'Orange = Adjacent · Teal = Warm · Slate = Cold · Captures give +3 Scans!';
    startGame();
}

function endGame() {
    gameActive = false;
    saveBest();
    endTitle.textContent = 'Battery Depleted';
    endDesc.textContent = 'Ran out of scans in Sector ' + sector + '. Best Score: ' + bestScore;
    finalScoreSpan.textContent = String(score);
    finalSectorSpan.textContent = String(sector);
    gameOverScreen.classList.remove('hidden');
    playJam();
}

function onCanvasClick(event) {
    if (!gameActive) return;
    initAudio();
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(terrainTiles);
    if (intersects.length > 0) {
        const tile = intersects[0].object;
        cursorR = tile.userData.r;
        cursorC = tile.userData.c;
        syncCursor();
        scanTile(tile);
    }
}

function onKeyDown(e) {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) pauseGame();
        else if (!pauseScreen.classList.contains('hidden')) resumeGame();
        return;
    }
    if (!gameActive) return;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); cursorR = Math.max(0, cursorR - 1); syncCursor(); }
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); cursorR = Math.min(rows - 1, cursorR + 1); syncCursor(); }
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); cursorC = Math.max(0, cursorC - 1); syncCursor(); }
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); cursorC = Math.min(cols - 1, cursorC + 1); syncCursor(); }
    else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        scanTile(terrainTiles[cursorR * cols + cursorC]);
    }
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
    const t = performance.now() * 0.001;

    if (gameActive) {
        if (sectorTransitionTimer > 0) {
            sectorTransitionTimer -= dt;
            if (sectorTransitionTimer <= 0) {
                sector++;
                setupSector(sector);
                feedEl.textContent = 'Sector ' + sector + ' Live — Watch out for Purple Static Decoys!';
            }
        }

        if (scanWave) {
            scanWave.scale.addScalar(dt * 9.5);
            scanWave.material.opacity -= dt * 1.4;
            if (scanWave.material.opacity <= 0) {
                scene.remove(scanWave);
                scanWave.geometry.dispose();
                scanWave.material.dispose();
                scanWave = null;
            }
        }

        targets.forEach(function (tg) {
            if (tg.mesh.visible) {
                tg.mesh.rotation.y += dt * 2.0;
                tg.mesh.position.y = 0.65 + Math.sin(t * 3.5) * 0.12;
            }
        });
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const sp = particles[i];
        sp.life -= dt;
        sp.mesh.position.x += sp.vx * dt;
        sp.mesh.position.y += sp.vy * dt;
        sp.mesh.position.z += sp.vz * dt;
        sp.vy -= 9 * dt;
        sp.mesh.material.opacity = Math.max(0, sp.life / 0.45);
        if (sp.life <= 0) {
            scene.remove(sp.mesh);
            sp.mesh.material.dispose();
            particles.splice(i, 1);
        }
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
        if (gameActive) { pauseGame(); resumeBtn.focus({ preventScroll: true }); }
    }
    window.addEventListener('blur', suspend);
    window.addEventListener('pagehide', suspend);
    document.addEventListener('visibilitychange', function () { if (document.hidden) suspend(); });
})();
