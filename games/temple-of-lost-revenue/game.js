// Temple of Lost Revenue - Procedural Multi-Floor 3D Maze & Patrol Guardians
'use strict';

let scene, camera, renderer, clock;
let player, playerTorch, exitPortalMesh, pulseRingMesh;
let mazeGroup = null;
let mazeGrid = [];
let gridRows = 11;
let gridCols = 11;
const cellSize = 3;

let items = [];
let guardians = [];
let particles = [];

let floorNum = 1;
let collectedCount = 0;
const totalItems = 5;
let revenue = 0;
let hearts = 3;
let timeLeft = 60;
let pulseCooldown = 0;
let invulnTimer = 0;
let shakeTime = 0;
let gameActive = false;
let isMuted = false;

let playerGridPos = { r: 1, c: 1 };
let exitPos = { r: 9, c: 9 };
let playerTargetPos = new THREE.Vector3();
let hopAnim = 0;
let templeMapCanvas = null;

const SAVE_KEY = 'temple-of-lost-revenue:best';
let bestRevenue = readBest();

const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');

const floorSpan = document.getElementById('game-floor');
const leadsSpan = document.getElementById('game-leads');
const revSpan = document.getElementById('game-rev');
const heartsSpan = document.getElementById('game-hearts');
const timeSpan = document.getElementById('game-time');
const pulseSpan = document.getElementById('game-pulse');
const bestSpan = document.getElementById('game-best');
const bannerEl = document.getElementById('temple-banner');
const finalRevSpan = document.getElementById('final-rev-val');
const finalFloorSpan = document.getElementById('final-floor-val');
const endTitle = document.getElementById('end-title');
const endDesc = document.getElementById('end-desc');

window.gameState = { title: 'temple-of-lost-revenue', get active() { return gameActive; } };
window.game = window.gameState;

let wallGeo, floorGeo, itemGeo, guardianGeo, sparkGeo;
let wallMat, floorMat, itemMat, portalMat;

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
        if (kind === 'step') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, now);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            osc.start(now); osc.stop(now + 0.04);
        } else if (kind === 'lead') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(784, now + 0.06);
            gain.gain.setValueAtTime(0.11, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
        } else if (kind === 'pulse') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(760, now);
            osc.frequency.exponentialRampToValueAtTime(260, now + 0.28);
            gain.gain.setValueAtTime(0.11, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        } else if (kind === 'hit') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(65, now + 0.22);
            gain.gain.setValueAtTime(0.13, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
            osc.start(now); osc.stop(now + 0.24);
        } else if (kind === 'floor') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554, now + 0.09);
            osc.frequency.setValueAtTime(659, now + 0.18);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now); osc.stop(now + 0.35);
        }
    } catch (_) {}
}

function readBest() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return 0;
        const d = JSON.parse(raw);
        return Number.isFinite(d?.rev) ? d.rev : (Number(raw) || 0);
    } catch (_) { return 0; }
}
function saveBest() {
    if (revenue > bestRevenue) bestRevenue = revenue;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ rev: bestRevenue, floor: floorNum })); } catch (_) {}
    if (bestSpan) bestSpan.textContent = '$' + bestRevenue;
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
    scene.background = new THREE.Color(0x0b0705);
    scene.fog = new THREE.FogExp2(0x0b0705, 0.022);

    camera = new THREE.PerspectiveCamera(52, 800 / 600, 0.1, 120);
    camera.position.set(0, 18, 12);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    clock = new THREE.Clock();

    scene.add(new THREE.AmbientLight(0xfef3c7, 0.55));
    const dirLight = new THREE.DirectionalLight(0xffb74d, 0.9);
    dirLight.position.set(10, 24, 10);
    scene.add(dirLight);

    wallGeo = new THREE.BoxGeometry(cellSize, 3.2, cellSize);
    floorGeo = new THREE.BoxGeometry(cellSize, 0.25, cellSize);
    itemGeo = new THREE.OctahedronGeometry(0.55, 0);
    guardianGeo = new THREE.OctahedronGeometry(0.75, 0);
    sparkGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);

    wallMat = new THREE.MeshStandardMaterial({ color: 0x3b261a, roughness: 0.85, metalness: 0.1 });
    floorMat = new THREE.MeshStandardMaterial({ color: 0x1a120b, roughness: 0.8 });
    itemMat = new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0x6b4200, shininess: 110 });
    portalMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.35 });

    createPlayer();
    buildFloorMaze(1);
    installSessionControls();

    window.addEventListener('keydown', onKeyDown);
    startBtn.addEventListener('click', function () { initAudio(); resetGame(); });
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    [['btn-up', -1, 0], ['btn-down', 1, 0], ['btn-left', 0, -1], ['btn-right', 0, 1]].forEach(function (cfg) {
        var btn = document.getElementById(cfg[0]);
        if (!btn) return;
        btn.addEventListener('click', function () { initAudio(); movePlayer(cfg[1], cfg[2]); });
        btn.addEventListener('touchstart', function (e) { e.preventDefault(); initAudio(); movePlayer(cfg[1], cfg[2]); }, { passive: false });
    });
    const pulseBtn = document.getElementById('btn-pulse');
    if (pulseBtn) {
        pulseBtn.addEventListener('click', function (e) { e.preventDefault(); initAudio(); triggerPulse(); });
    }

    window.addEventListener('resize', onWindowResize);
    onWindowResize();
    updateHUD();
    animate();
}

function createPlayer() {
    player = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, emissive: 0x0f172a, shininess: 90 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.8), bodyMat);
    body.position.y = 0.4;
    player.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), bodyMat);
    head.position.set(0.38, 0.85, 0);
    player.add(head);

    const earGeo = new THREE.ConeGeometry(0.13, 0.35, 4);
    const leftEar = new THREE.Mesh(earGeo, bodyMat);
    leftEar.position.set(0.38, 1.25, 0.2);
    const rightEar = leftEar.clone();
    rightEar.position.z = -0.2;
    player.add(leftEar);
    player.add(rightEar);

    playerTorch = new THREE.PointLight(0xfbbf24, 1.2, 14);
    playerTorch.position.set(0, 2.2, 0);
    player.add(playerTorch);

    pulseRingMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.8, 28),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee, side: THREE.DoubleSide, transparent: true, opacity: 0 })
    );
    pulseRingMesh.rotation.x = -Math.PI / 2;
    pulseRingMesh.position.y = 0.25;
    pulseRingMesh.visible = false;
    player.add(pulseRingMesh);

    scene.add(player);
}

function generateMazeGrid(rows, cols) {
    const g = Array.from({ length: rows }, function () { return Array(cols).fill(1); });
    function carve(r, c) {
        g[r][c] = 0;
        const dirs = [[-2, 0], [2, 0], [0, -2], [0, 2]].sort(function () { return Math.random() - 0.5; });
        for (const d of dirs) {
            const nr = r + d[0], nc = c + d[1];
            if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && g[nr][nc] === 1) {
                g[r + d[0] / 2][c + d[1] / 2] = 0;
                carve(nr, nc);
            }
        }
    }
    carve(1, 1);

    // Braid ~15% of interior walls so patrol corridors have loop routes
    for (let r = 2; r < rows - 2; r++) {
        for (let c = 2; c < cols - 2; c++) {
            if (g[r][c] === 1 && Math.random() < 0.16) {
                const vertOpen = g[r - 1][c] === 0 && g[r + 1][c] === 0 && g[r][c - 1] === 1 && g[r][c + 1] === 1;
                const horizOpen = g[r][c - 1] === 0 && g[r][c + 1] === 0 && g[r - 1][c] === 1 && g[r + 1][c] === 1;
                if (vertOpen || horizOpen) g[r][c] = 0;
            }
        }
    }
    return g;
}

function cellToWorld(r, c) {
    const startX = -(gridCols * cellSize) / 2 + cellSize / 2;
    const startZ = -(gridRows * cellSize) / 2 + cellSize / 2;
    return { x: startX + c * cellSize, z: startZ + r * cellSize };
}

function clearFloorScene() {
    if (mazeGroup) { scene.remove(mazeGroup); mazeGroup = null; }
    for (const it of items) { scene.remove(it.mesh); }
    for (const gd of guardians) { scene.remove(gd.mesh); gd.mesh.material.dispose(); }
    for (const sp of particles) { scene.remove(sp.mesh); sp.mesh.material.dispose(); }
    if (exitPortalMesh) { scene.remove(exitPortalMesh); exitPortalMesh.geometry.dispose(); exitPortalMesh = null; }
    items = [];
    guardians = [];
    particles = [];
}

function buildFloorMaze(fNum) {
    clearFloorScene();
    const size = Math.min(15, 9 + fNum * 2);
    gridRows = size;
    gridCols = size;
    mazeGrid = generateMazeGrid(gridRows, gridCols);
    mazeGroup = new THREE.Group();

    const openCells = [];
    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            const pos = cellToWorld(r, c);
            const fl = new THREE.Mesh(floorGeo, floorMat);
            fl.position.set(pos.x, -0.12, pos.z);
            mazeGroup.add(fl);
            if (mazeGrid[r][c] === 1) {
                const wl = new THREE.Mesh(wallGeo, wallMat);
                wl.position.set(pos.x, 1.6, pos.z);
                mazeGroup.add(wl);
            } else if (!(r === 1 && c === 1)) {
                openCells.push({ r: r, c: c, dist: r + c });
            }
        }
    }
    scene.add(mazeGroup);

    // Place exit at farthest open cell
    openCells.sort(function (a, b) { return b.dist - a.dist; });
    exitPos = openCells[0] || { r: gridRows - 2, c: gridCols - 2 };
    const exitWorld = cellToWorld(exitPos.r, exitPos.c);
    exitPortalMesh = new THREE.Mesh(new THREE.RingGeometry(0.65, 1.05, 24), portalMat);
    exitPortalMesh.rotation.x = -Math.PI / 2;
    exitPortalMesh.position.set(exitWorld.x, 0.15, exitWorld.z);
    scene.add(exitPortalMesh);

    // Place 5 leads across distinct cells
    collectedCount = 0;
    const leadPool = openCells.slice(1).sort(function () { return Math.random() - 0.5; });
    for (let i = 0; i < totalItems && i < leadPool.length; i++) {
        const cell = leadPool[i];
        const w = cellToWorld(cell.r, cell.c);
        const mesh = new THREE.Mesh(itemGeo, itemMat);
        mesh.position.set(w.x, 1.0, w.z);
        scene.add(mesh);
        items.push({ mesh: mesh, gridR: cell.r, gridC: cell.c });
    }

    // Spawn patrol guardians away from spawn (1,1)
    const guardCount = Math.min(4, fNum);
    const guardPool = openCells.filter(function (c) { return c.dist >= 6; }).sort(function () { return Math.random() - 0.5; });
    for (let i = 0; i < guardCount && i < guardPool.length; i++) {
        const cell = guardPool[i];
        const w = cellToWorld(cell.r, cell.c);
        const mesh = new THREE.Mesh(guardianGeo, new THREE.MeshPhongMaterial({ color: 0xef4444, emissive: 0x7f1d1d, shininess: 100 }));
        mesh.position.set(w.x, 1.05, w.z);
        scene.add(mesh);
        guardians.push({
            mesh: mesh,
            r: cell.r,
            c: cell.c,
            dirR: 0,
            dirC: 1,
            moveTimer: 0.4 + Math.random() * 0.4,
            stunTimer: 0
        });
    }

    playerGridPos = { r: 1, c: 1 };
    const startW = cellToWorld(1, 1);
    player.position.set(startW.x, 0, startW.z);
    playerTargetPos.set(startW.x, 0, startW.z);
    camera.position.set(startW.x, 16, startW.z + 10);
    updatePortalAppearance();
}

function updatePortalAppearance() {
    const unlocked = collectedCount >= totalItems;
    portalMat.color.setHex(unlocked ? 0x34d399 : 0x64748b);
    portalMat.opacity = unlocked ? 0.92 : 0.28;
}

function spawnBurst(pos, color, count) {
    for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 }));
        m.position.copy(pos);
        scene.add(m);
        particles.push({
            mesh: m,
            vx: (Math.random() - 0.5) * 6,
            vy: 1.5 + Math.random() * 4,
            vz: (Math.random() - 0.5) * 6,
            life: 0.45
        });
    }
}

function triggerPulse() {
    if (!gameActive || pulseCooldown > 0) return;
    pulseCooldown = 5.0;
    playSfx('pulse');
    pulseRingMesh.visible = true;
    pulseRingMesh.scale.setScalar(1);
    pulseRingMesh.material.opacity = 0.95;

    let stunned = 0;
    for (const g of guardians) {
        if (g.mesh.position.distanceTo(player.position) <= 9.2) {
            g.stunTimer = 2.6;
            g.mesh.material.color.setHex(0x38bdf8);
            g.mesh.material.emissive.setHex(0x0c4a6e);
            stunned++;
        }
    }
    bannerEl.textContent = stunned > 0
        ? 'DECIPHER PULSE! Stunned ' + stunned + ' Audit Golem(s) for 2.6s!'
        : 'Decipher Pulse scanned nearby corridors!';
    updateHUD();
}

function movePlayer(dr, dc) {
    if (!gameActive) return;
    const nr = playerGridPos.r + dr;
    const nc = playerGridPos.c + dc;
    if (nr < 0 || nr >= gridRows || nc < 0 || nc >= gridCols) return;
    if (mazeGrid[nr][nc] === 1) return;

    playerGridPos.r = nr;
    playerGridPos.c = nc;
    const w = cellToWorld(nr, nc);
    playerTargetPos.set(w.x, 0, w.z);
    hopAnim = 1.0;

    if (dr === 0 && dc > 0) player.rotation.y = 0;
    else if (dr === 0 && dc < 0) player.rotation.y = Math.PI;
    else if (dr > 0 && dc === 0) player.rotation.y = -Math.PI / 2;
    else if (dr < 0 && dc === 0) player.rotation.y = Math.PI / 2;

    playSfx('step');
    checkCellEvents();
}
window.movePlayer = movePlayer;

function checkCellEvents() {
    for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (it.gridR === playerGridPos.r && it.gridC === playerGridPos.c) {
            spawnBurst(it.mesh.position, 0xfacc15, 10);
            scene.remove(it.mesh);
            items.splice(i, 1);
            collectedCount++;
            revenue += 500;
            playSfx('lead');
            saveBest();
            updatePortalAppearance();
            if (collectedCount >= totalItems) {
                bannerEl.textContent = 'ALL 5 LEADS SECURED! Step into the emerald Exit Portal!';
            }
        }
    }

    if (collectedCount >= totalItems && playerGridPos.r === exitPos.r && playerGridPos.c === exitPos.c) {
        const clearBonus = 500 * floorNum;
        revenue += clearBonus;
        floorNum++;
        timeLeft = Math.min(80, timeLeft + 14);
        playSfx('floor');
        saveBest();
        buildFloorMaze(floorNum);
        bannerEl.textContent = 'Floor ' + floorNum + ' Entered! (+$' + clearBonus + ' & +14s bonus!)';
    }
    updateHUD();
}

function stepGuardians(dt) {
    const stepPeriod = Math.max(0.24, 0.56 - floorNum * 0.045);
    for (const g of guardians) {
        if (g.stunTimer > 0) {
            g.stunTimer -= dt;
            if (g.stunTimer <= 0) {
                g.mesh.material.color.setHex(0xef4444);
                g.mesh.material.emissive.setHex(0x7f1d1d);
            }
            continue;
        }
        g.mesh.rotation.y += dt * 2.5;
        g.moveTimer -= dt;
        if (g.moveTimer <= 0) {
            g.moveTimer = stepPeriod;
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            const valid = dirs.filter(function (d) {
                const rr = g.r + d[0], cc = g.c + d[1];
                return rr > 0 && rr < gridRows - 1 && cc > 0 && cc < gridCols - 1 && mazeGrid[rr][cc] === 0;
            });
            if (valid.length) {
                // Prefer continuing forward or turning rather than immediate 180 reversal
                const nonReverse = valid.filter(function (d) { return !(d[0] === -g.dirR && d[1] === -g.dirC); });
                const choices = nonReverse.length ? nonReverse : valid;
                const pick = choices[Math.floor(Math.random() * choices.length)];
                g.dirR = pick[0];
                g.dirC = pick[1];
                g.r += g.dirR;
                g.c += g.dirC;
            }
        }
        const targetW = cellToWorld(g.r, g.c);
        g.mesh.position.x += (targetW.x - g.mesh.position.x) * Math.min(1, dt * 10);
        g.mesh.position.z += (targetW.z - g.mesh.position.z) * Math.min(1, dt * 10);

        if (invulnTimer <= 0 && g.r === playerGridPos.r && g.c === playerGridPos.c) {
            hearts--;
            invulnTimer = 1.6;
            shakeTime = 0.25;
            spawnBurst(player.position, 0xef4444, 12);
            playSfx('hit');
            bannerEl.textContent = 'Audit Golem hit! Press Space/Shift for Decipher Pulse!';
            updateHUD();
            if (hearts <= 0) {
                endGame('Audit Golems Overwhelmed You!');
                return;
            }
        }
    }
}

function updateHUD() {
    floorSpan.textContent = String(floorNum);
    leadsSpan.textContent = collectedCount + '/' + totalItems;
    revSpan.textContent = '$' + revenue;
    heartsSpan.textContent = hearts > 0 ? '❤️'.repeat(hearts) : '💔';
    timeSpan.textContent = Math.max(0, Math.ceil(timeLeft)) + 's';
    pulseSpan.textContent = pulseCooldown > 0 ? Math.ceil(pulseCooldown) + 's' : 'READY';
    bestSpan.textContent = '$' + bestRevenue;
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
    floorNum = 1;
    revenue = 0;
    hearts = 3;
    timeLeft = 60;
    pulseCooldown = 0;
    invulnTimer = 0;
    shakeTime = 0;
    buildFloorMaze(1);
    bannerEl.textContent = 'Floor 1: Collect 5 gold leads, then reach the emerald Exit Portal!';
    updateHUD();
    startGame();
}

function endGame(reason) {
    gameActive = false;
    saveBest();
    endTitle.textContent = 'Temple Run Ended';
    endDesc.textContent = (reason || 'Time expired!') + ' Best Revenue: $' + bestRevenue;
    finalRevSpan.textContent = '$' + revenue;
    finalFloorSpan.textContent = String(floorNum);
    gameOverScreen.classList.remove('hidden');
    playSfx('hit');
}

function onKeyDown(e) {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.repeat && ['Escape', 'KeyP', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyE'].includes(e.code)) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'ArrowUp' || e.code === 'KeyW') movePlayer(-1, 0);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') movePlayer(1, 0);
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') movePlayer(0, -1);
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') movePlayer(0, 1);
    else if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE') triggerPulse();
    else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) pauseGame();
        else if (!pauseScreen.classList.contains('hidden')) resumeGame();
    }
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

function drawTempleMap() {
    if (!gameActive) {
        if (templeMapCanvas) templeMapCanvas.hidden = true;
        return;
    }
    if (!templeMapCanvas) {
        templeMapCanvas = document.createElement('canvas');
        templeMapCanvas.width = 164;
        templeMapCanvas.height = 182;
        templeMapCanvas.setAttribute('role', 'img');
        templeMapCanvas.setAttribute('aria-label', 'Maze map: cyan you, gold leads, red golems, green exit.');
        Object.assign(templeMapCanvas.style, {
            position: 'absolute', right: '12px', top: '76px', zIndex: '8',
            width: 'clamp(92px, 19vw, 158px)', height: 'auto', pointerEvents: 'none',
            border: '1px solid #977443', borderRadius: '8px', background: '#100e17e8'
        });
        renderer.domElement.parentElement.appendChild(templeMapCanvas);
    }
    templeMapCanvas.hidden = false;
    const map = templeMapCanvas.getContext('2d');
    map.clearRect(0, 0, 164, 182);
    map.fillStyle = '#100e17';
    map.fillRect(0, 0, 164, 182);

    const tile = Math.floor(142 / gridCols);
    const pad = Math.floor((164 - tile * gridCols) / 2);
    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            map.fillStyle = mazeGrid[r][c] === 1 ? '#6c5140' : '#211b27';
            map.fillRect(pad + c * tile, 10 + r * tile, Math.max(2, tile - 1), Math.max(2, tile - 1));
        }
    }
    // Exit portal
    map.fillStyle = collectedCount >= totalItems ? '#34d399' : '#475569';
    map.fillRect(pad + exitPos.c * tile + 1, 10 + exitPos.r * tile + 1, Math.max(3, tile - 2), Math.max(3, tile - 2));
    // Leads
    map.fillStyle = '#ffc857';
    for (const item of items) {
        map.fillRect(pad + item.gridC * tile + 2, 10 + item.gridR * tile + 2, Math.max(3, tile - 4), Math.max(3, tile - 4));
    }
    // Guardians
    for (const g of guardians) {
        map.fillStyle = g.stunTimer > 0 ? '#38bdf8' : '#ef4444';
        map.fillRect(pad + g.c * tile + 1, 10 + g.r * tile + 1, Math.max(3, tile - 2), Math.max(3, tile - 2));
    }
    // Player
    map.fillStyle = '#67e8f9';
    map.fillRect(pad + playerGridPos.c * tile + 1, 10 + playerGridPos.r * tile + 1, Math.max(4, tile - 2), Math.max(4, tile - 2));

    map.font = '10px system-ui';
    map.textAlign = 'center';
    map.fillStyle = '#67e8f9'; map.fillText('YOU', 36, 170);
    map.fillStyle = '#ffc857'; map.fillText('LEAD', 82, 170);
    map.fillStyle = '#ef4444'; map.fillText('FOE', 128, 170);
}

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = performance.now() * 0.001;

    if (gameActive) {
        timeLeft -= dt;
        if (pulseCooldown > 0) pulseCooldown = Math.max(0, pulseCooldown - dt);
        if (invulnTimer > 0) invulnTimer = Math.max(0, invulnTimer - dt);

        // Smooth player movement & hop
        player.position.x += (playerTargetPos.x - player.position.x) * Math.min(1, dt * 16);
        player.position.z += (playerTargetPos.z - player.position.z) * Math.min(1, dt * 16);
        if (hopAnim > 0) {
            hopAnim = Math.max(0, hopAnim - dt * 5.5);
            player.position.y = Math.sin(hopAnim * Math.PI) * 0.45;
        } else {
            player.position.y = 0;
        }
        player.visible = invulnTimer <= 0 || Math.floor(invulnTimer * 12) % 2 === 0;

        // Animate pulse shockwave ring
        if (pulseRingMesh.visible) {
            pulseRingMesh.scale.addScalar(dt * 14);
            pulseRingMesh.material.opacity -= dt * 2.1;
            if (pulseRingMesh.material.opacity <= 0) pulseRingMesh.visible = false;
        }

        items.forEach(function (it) {
            it.mesh.rotation.y += dt * 2.8;
            it.mesh.position.y = 1.0 + Math.sin(t * 4) * 0.14;
        });
        if (exitPortalMesh) exitPortalMesh.rotation.z += dt * 1.5;

        stepGuardians(dt);

        const targetCamX = player.position.x;
        const targetCamY = 16;
        const targetCamZ = player.position.z + 9.5;
        camera.position.x += (targetCamX - camera.position.x) * 0.1;
        camera.position.y += (targetCamY - camera.position.y) * 0.1;
        camera.position.z += (targetCamZ - camera.position.z) * 0.1;
        if (shakeTime > 0) {
            shakeTime = Math.max(0, shakeTime - dt);
            camera.position.x += (Math.random() - 0.5) * 0.35;
        }
        camera.lookAt(player.position);

        updateHUD();
        if (timeLeft <= 0) {
            endGame('The temple lockdown timer expired!');
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const sp = particles[i];
        sp.life -= dt;
        sp.mesh.position.x += sp.vx * dt;
        sp.mesh.position.y += sp.vy * dt;
        sp.mesh.position.z += sp.vz * dt;
        sp.vy -= 9.5 * dt;
        sp.mesh.material.opacity = Math.max(0, sp.life / 0.45);
        if (sp.life <= 0) {
            scene.remove(sp.mesh);
            sp.mesh.material.dispose();
            particles.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
    drawTempleMap();
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
