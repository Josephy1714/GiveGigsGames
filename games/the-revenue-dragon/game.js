// The Revenue Dragon - Multi-Phase 3D Boss Rush Arcade Shooter
'use strict';

let scene, camera, renderer, clock;
let player, dragon, dragonCoreMat, breathTelegraph, breathBeam, volcanicGrid;
let beams = [];
let fireballs = [];
let powerOrbs = [];
let particles = [];

let score = 0;
let tier = 1;
let dragonHP = 100;
let dragonMaxHP = 100;
let hearts = 3;
let gameActive = false;
let isMuted = false;
let battleTime = 0;
let fireHeld = false;

let playerX = 0;
let moveDir = 0;
window.moveDir = 0;
const speed = 10.5;
let fireCooldown = 0;
let spawnTimer = 0;
let orbTimer = 6.5;
let tripleTimer = 0;
let invulnTimer = 0;
let flashTimer = 0;
let shakeTime = 0;
let breathTimer = 4.5;
let breathPhase = 'idle'; // 'idle' | 'telegraph' | 'firing'
let breathX = 0;

const BOSS_NAMES = ['Dragon of Delay', 'Hydra of Silos', 'Emperor of Legacy'];
const SAVE_KEY = 'the-revenue-dragon:best';
let bestScore = readBest();

const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');
const nextTierBtn = document.getElementById('next-tier-btn');

const bossNameSpan = document.getElementById('boss-name');
const dragonHPBar = document.getElementById('dragon-hp-bar');
const tierSpan = document.getElementById('game-tier');
const heartsSpan = document.getElementById('game-hearts');
const scoreSpan = document.getElementById('game-score');
const bestSpan = document.getElementById('game-best');
const feedEl = document.getElementById('dragon-feed');
const endTitle = document.getElementById('end-title');
const endDesc = document.getElementById('end-desc');
const finalScoreSpan = document.getElementById('final-score-val');
const finalTierSpan = document.getElementById('final-tier-val');

window.gameState = { title: 'the-revenue-dragon', get active() { return gameActive; } };
window.game = window.gameState;

let beamGeo, fireballGeo, orbGeo, sparkGeo;
let beamMat, megaBeamMat, fireballMat;

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
        if (kind === 'shoot') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(620, now);
            osc.frequency.exponentialRampToValueAtTime(280, now + 0.08);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
            osc.start(now); osc.stop(now + 0.09);
        } else if (kind === 'hitBoss') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.06);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            osc.start(now); osc.stop(now + 0.07);
        } else if (kind === 'damage') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(55, now + 0.25);
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
            osc.start(now); osc.stop(now + 0.26);
        } else if (kind === 'orb') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587, now);
            osc.frequency.setValueAtTime(880, now + 0.06);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.start(now); osc.stop(now + 0.18);
        } else if (kind === 'roar') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(240, now);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.35);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
            osc.start(now); osc.stop(now + 0.36);
        } else if (kind === 'win') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554, now + 0.09);
            osc.frequency.setValueAtTime(659, now + 0.18);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
            osc.start(now); osc.stop(now + 0.38);
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
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ score: bestScore, tier: tier })); } catch (_) {}
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
    scene.background = new THREE.Color(0x090203);
    scene.fog = new THREE.FogExp2(0x090203, 0.02);

    camera = new THREE.PerspectiveCamera(56, 800 / 600, 0.1, 100);
    camera.position.set(0, 0.4, 11.8);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    clock = new THREE.Clock();

    scene.add(new THREE.AmbientLight(0xfecaca, 0.45));
    const redLight = new THREE.PointLight(0xef4444, 2.0, 42);
    redLight.position.set(0, 3, 6);
    scene.add(redLight);
    const keyLight = new THREE.DirectionalLight(0xf97316, 0.85);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    beamGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.75, 8);
    fireballGeo = new THREE.SphereGeometry(0.32, 14, 14);
    orbGeo = new THREE.OctahedronGeometry(0.35, 0);
    sparkGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);

    beamMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
    megaBeamMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    fireballMat = new THREE.MeshPhongMaterial({ color: 0xf97316, emissive: 0x7c2d12, shininess: 90 });

    buildVolcanicArena();
    createPlayer();
    createDragon();
    installSessionControls();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    startBtn.addEventListener('click', function () { initAudio(); resetRun(1, 0); });
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', function () { resetRun(1, 0); });
    playAgainBtn.addEventListener('click', function () { resetRun(1, 0); });
    nextTierBtn.addEventListener('click', function () { resetRun(tier + 1, score); });

    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnFire = document.getElementById('btn-fire');
    btnFire.addEventListener('pointerdown', function () { initAudio(); fireHeld = gameActive; });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
        btnFire.addEventListener(ev, function () { fireHeld = false; });
    });

    const setLeft = function (e) { e.preventDefault(); moveDir = -1; };
    const setRight = function (e) { e.preventDefault(); moveDir = 1; };
    const clearMove = function (e) { e.preventDefault(); moveDir = 0; };

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

    btnFire.addEventListener('click', function (e) { e.preventDefault(); initAudio(); fireBeam(); });
    btnFire.addEventListener('touchstart', function (e) { e.preventDefault(); initAudio(); fireBeam(); }, { passive: false });

    window.addEventListener('resize', onWindowResize);
    onWindowResize();
    updateHUD();
    animate();
}

function buildVolcanicArena() {
    volcanicGrid = new THREE.GridHelper(22, 16, 0x991b1b, 0x2a0808);
    volcanicGrid.position.set(0, -4.3, 0);
    scene.add(volcanicGrid);

    breathTelegraph = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 8.5),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
    );
    breathTelegraph.position.set(0, -0.8, -0.2);
    breathTelegraph.visible = false;
    scene.add(breathTelegraph);

    breathBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.8, 8.5, 12),
        new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.85 })
    );
    breathBeam.position.set(0, -0.8, 0);
    breathBeam.visible = false;
    scene.add(breathBeam);
}

function createPlayer() {
    player = new THREE.Group();
    const blueMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, emissive: 0x1e3a8a, shininess: 90 });
    const greenMat = new THREE.MeshPhongMaterial({ color: 0x10b981, emissive: 0x064e3b, shininess: 90 });

    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.7, 0.65), blueMat);
    blue.position.x = -0.34;
    player.add(blue);

    const green = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.7, 0.65), greenMat);
    green.position.x = 0.34;
    player.add(green);

    const earGeo = new THREE.ConeGeometry(0.14, 0.3, 4);
    const earL = new THREE.Mesh(earGeo, blueMat); earL.position.set(-0.34, 0.5, 0);
    const earR = new THREE.Mesh(earGeo, greenMat); earR.position.set(0.34, 0.5, 0);
    player.add(earL);
    player.add(earR);

    player.position.set(0, -3.55, 0);
    scene.add(player);
}

function createDragon() {
    dragon = new THREE.Group();
    dragonCoreMat = new THREE.MeshPhongMaterial({ color: 0xef4444, emissive: 0x5c0606, shininess: 95 });
    const wingMat = new THREE.MeshPhongMaterial({ color: 0xb91c1c, emissive: 0x3b0707, shininess: 70 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.15, 1.2), dragonCoreMat);
    dragon.add(body);

    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.34, 0.8), wingMat);
    leftWing.position.set(-1.85, 0.28, -0.15);
    dragon.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.position.x = 1.85;
    dragon.add(rightWing);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), dragonCoreMat);
    snout.position.set(0, -0.2, 0.65);
    dragon.add(snout);

    const eyeGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.38, 0.15, 0.64);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.38;
    dragon.add(eyeL);
    dragon.add(eyeR);

    const hornGeo = new THREE.ConeGeometry(0.2, 0.85, 4);
    const hornMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const hornL = new THREE.Mesh(hornGeo, hornMat); hornL.position.set(-0.5, 0.82, 0);
    const hornR = hornL.clone(); hornR.position.x = 0.5;
    dragon.add(hornL);
    dragon.add(hornR);

    dragon.position.set(0, 1.85, 0);
    scene.add(dragon);
}

function clearDynamic() {
    for (const b of beams) scene.remove(b.mesh);
    for (const f of fireballs) scene.remove(f.mesh);
    for (const o of powerOrbs) { scene.remove(o.mesh); o.mesh.material.dispose(); }
    for (const p of particles) { scene.remove(p.mesh); p.mesh.material.dispose(); }
    beams = []; fireballs = []; powerOrbs = []; particles = [];
}

function fireBeam() {
    if (!gameActive || fireCooldown > 0) return;
    fireCooldown = tripleTimer > 0 ? 0.18 : 0.22;
    const angles = tripleTimer > 0 ? [-0.18, 0, 0.18] : [0];
    for (const ang of angles) {
        const mesh = new THREE.Mesh(beamGeo, tripleTimer > 0 ? megaBeamMat : beamMat);
        mesh.position.set(playerX, -3.0, 0);
        mesh.rotation.z = -ang;
        scene.add(mesh);
        beams.push({ mesh: mesh, vx: Math.sin(ang) * 14, vy: Math.cos(ang) * 14, dmg: tripleTimer > 0 ? 5 : 4 });
    }
    playSfx('shoot');
}
window.fireBeam = fireBeam;

function spawnFireball(vx, vy, px) {
    const ball = new THREE.Mesh(fireballGeo, fireballMat);
    ball.position.set(px !== undefined ? px : dragon.position.x, dragon.position.y - 0.5, 0);
    scene.add(ball);
    fireballs.push({ mesh: ball, vx: vx, vy: vy });
}

function spawnPowerOrb() {
    const roll = Math.random();
    let kind = 'triple', color = 0x38bdf8;
    if (roll < 0.34) { kind = 'shield'; color = 0x34d399; }
    else if (roll < 0.66) { kind = 'mega'; color = 0xfacc15; }
    const mesh = new THREE.Mesh(orbGeo, new THREE.MeshPhongMaterial({ color: color, emissive: color, shininess: 110 }));
    mesh.position.set((Math.random() - 0.5) * 9, 2.2, 0);
    scene.add(mesh);
    powerOrbs.push({ mesh: mesh, kind: kind, color: color });
}

function spawnBurst(pos, color, count) {
    for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 }));
        m.position.copy(pos);
        scene.add(m);
        particles.push({
            mesh: m,
            vx: (Math.random() - 0.5) * 6.5,
            vy: (Math.random() - 0.5) * 6.5,
            vz: (Math.random() - 0.5) * 3,
            life: 0.42
        });
    }
}

function syncDragonHealth() {
    const track = document.getElementById('dragon-hp-container');
    if (!track) return;
    let value = document.getElementById('dragon-health-value');
    if (!value) {
        value = document.createElement('span');
        value.id = 'dragon-health-value';
        track.style.position = 'relative';
        Object.assign(value.style, {
            position: 'absolute', inset: '0', textAlign: 'center',
            font: '700 11px/15px system-ui', color: '#fff', textShadow: '0 1px 2px #000'
        });
        track.appendChild(value);
    }
    const pct = Math.max(0, Math.min(100, Math.round((dragonHP / dragonMaxHP) * 100)));
    dragonHPBar.style.width = pct + '%';
    value.textContent = pct + '%';
}

function updateHUD() {
    bossNameSpan.textContent = BOSS_NAMES[(tier - 1) % BOSS_NAMES.length];
    tierSpan.textContent = String(tier);
    heartsSpan.textContent = hearts > 0 ? '❤️'.repeat(hearts) : '💔';
    scoreSpan.textContent = String(score);
    bestSpan.textContent = String(bestScore);
    syncDragonHealth();
}

function startGame() {
    fireHeld = false;
    pauseScreen.classList.add('hidden');
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    clock.getDelta();
    gameActive = true;
}

function pauseGame() {
    fireHeld = false;
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

function resetRun(newTier, keepScore) {
    clearDynamic();
    tier = newTier || 1;
    score = keepScore || 0;
    dragonMaxHP = 120 + (tier - 1) * 55;
    dragonHP = dragonMaxHP;
    hearts = 3;
    battleTime = 0;
    spawnTimer = 0.6;
    orbTimer = 6.0;
    fireCooldown = 0;
    tripleTimer = 0;
    invulnTimer = 0;
    flashTimer = 0;
    shakeTime = 0;
    breathPhase = 'idle';
    breathTimer = 4.5;
    breathTelegraph.visible = false;
    breathBeam.visible = false;
    moveDir = 0;
    window.moveDir = 0;
    playerX = 0;
    player.position.set(0, -3.55, 0);
    dragon.position.set(0, 1.85, 0);
    feedEl.textContent = 'Tier ' + tier + ': ' + BOSS_NAMES[(tier - 1) % BOSS_NAMES.length] + ' Engaged!';
    updateHUD();
    startGame();
}

function endBattle(won) {
    gameActive = false;
    fireHeld = false;
    breathTelegraph.visible = false;
    breathBeam.visible = false;
    saveBest();
    if (won) {
        endTitle.textContent = BOSS_NAMES[(tier - 1) % BOSS_NAMES.length] + ' Defeated!';
        endDesc.textContent = 'Tier ' + tier + ' cleared! Ready for the next boss or replay.';
        nextTierBtn.classList.remove('hidden');
        playSfx('win');
    } else {
        endTitle.textContent = 'Defeated';
        endDesc.textContent = 'Reached Boss Tier ' + tier + ' · Best Score: ' + bestScore;
        nextTierBtn.classList.add('hidden');
        playSfx('damage');
    }
    finalScoreSpan.textContent = String(score);
    finalTierSpan.textContent = String(tier);
    gameOverScreen.classList.remove('hidden');
}

function onKeyDown(e) {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.repeat && ['Escape', 'KeyP'].includes(e.code)) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveDir = -1;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') moveDir = 1;
    else if (e.code === 'Space') { fireHeld = gameActive; fireBeam(); }
    else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) pauseGame();
        else if (!pauseScreen.classList.contains('hidden')) resumeGame();
    }
}

function onKeyUp(e) {
    if (e.code === 'Space') fireHeld = false;
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && moveDir === -1) moveDir = 0;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && moveDir === 1) moveDir = 0;
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

function damagePlayer(msg) {
    if (invulnTimer > 0) return;
    hearts--;
    invulnTimer = 1.3;
    shakeTime = 0.25;
    spawnBurst(player.position, 0xef4444, 14);
    playSfx('damage');
    feedEl.textContent = msg;
    updateHUD();
    if (hearts <= 0) endBattle(false);
}

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (gameActive) {
        battleTime += dt;
        const effDir = moveDir || window.moveDir || 0;
        playerX = Math.max(-5.2, Math.min(5.2, playerX + effDir * speed * dt));
        player.position.x = playerX;
        player.rotation.z = -effDir * 0.2;

        if (fireCooldown > 0) fireCooldown -= dt;
        if (tripleTimer > 0) tripleTimer = Math.max(0, tripleTimer - dt);
        if (invulnTimer > 0) invulnTimer = Math.max(0, invulnTimer - dt);
        if (flashTimer > 0) flashTimer = Math.max(0, flashTimer - dt);
        player.visible = invulnTimer <= 0 || Math.floor(invulnTimer * 14) % 2 === 0;
        if (fireHeld) fireBeam();

        const hpRatio = dragonHP / dragonMaxHP;
        const phase = hpRatio <= 0.32 ? 3 : hpRatio <= 0.65 ? 2 : 1;
        if (flashTimer > 0) {
            dragonCoreMat.emissive.setHex(0xffffff);
        } else if (phase === 3) {
            dragonCoreMat.emissive.setHex(0x9a3412);
        } else if (phase === 2) {
            dragonCoreMat.emissive.setHex(0x7c2d12);
        } else {
            dragonCoreMat.emissive.setHex(0x5c0606);
        }

        // Boss patrol & wing flap
        const sweepSpeed = phase === 3 ? 2.7 : phase === 2 ? 2.2 : 1.7;
        dragon.position.x = Math.sin(battleTime * sweepSpeed) * 4.2;
        const flap = Math.sin(battleTime * (12 + phase * 3)) * 0.34;
        dragon.children[1].rotation.z = flap;
        dragon.children[2].rotation.z = -flap;

        // Fireball waves scaled by phase & tier
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
            const aimVx = Math.max(-3.5, Math.min(3.5, (playerX - dragon.position.x) * 0.65));
            const fallVy = -(5.8 + tier * 0.55 + phase * 0.45);
            if (phase === 1) {
                spawnFireball(aimVx * 0.5, fallVy);
            } else {
                spawnFireball(-2.4, fallVy);
                spawnFireball(0, fallVy);
                spawnFireball(2.4, fallVy);
            }
            spawnTimer = Math.max(0.45, 0.92 - phase * 0.14 - tier * 0.05);
        }

        // Phase 3 telegraphed Flame Breath Beam
        if (phase >= 2) {
            breathTimer -= dt;
            if (breathPhase === 'idle' && breathTimer <= 0) {
                breathPhase = 'telegraph';
                breathTimer = 0.85;
                breathX = playerX;
                breathTelegraph.position.x = breathX;
                breathTelegraph.visible = true;
                playSfx('roar');
                feedEl.textContent = 'INCOMING FLAME BREATH! Move out of the yellow column!';
            } else if (breathPhase === 'telegraph' && breathTimer <= 0) {
                breathPhase = 'firing';
                breathTimer = 0.55;
                breathTelegraph.visible = false;
                breathBeam.position.x = breathX;
                breathBeam.visible = true;
                shakeTime = 0.2;
            } else if (breathPhase === 'firing') {
                if (Math.abs(playerX - breathX) < 1.1) {
                    damagePlayer('Scorched by Flame Breath!');
                    if (!gameActive) return;
                }
                if (breathTimer <= 0) {
                    breathPhase = 'idle';
                    breathTimer = Math.max(2.6, 4.4 - tier * 0.35);
                    breathBeam.visible = false;
                }
            }
        }

        // Power-up orb drops
        orbTimer -= dt;
        if (orbTimer <= 0) {
            spawnPowerOrb();
            orbTimer = 8.5;
        }
        for (let i = powerOrbs.length - 1; i >= 0; i--) {
            const o = powerOrbs[i];
            o.mesh.position.y -= 3.2 * dt;
            o.mesh.rotation.y += dt * 3;
            if (Math.abs(o.mesh.position.x - playerX) < 0.95 && Math.abs(o.mesh.position.y - player.position.y) < 0.8) {
                if (o.kind === 'triple') {
                    tripleTimer = 6.5;
                    feedEl.textContent = 'TRIPLE BEAM ACTIVATED (6.5s)!';
                } else if (o.kind === 'shield') {
                    if (hearts < 3) hearts++;
                    else score += 300;
                    feedEl.textContent = 'SHIELD RESTORED!';
                } else {
                    dragonHP = Math.max(0, dragonHP - 20);
                    score += 250;
                    flashTimer = 0.14;
                    spawnBurst(dragon.position, 0xfacc15, 14);
                    feedEl.textContent = 'MEGA SURGE! -20 Boss HP!';
                }
                playSfx('orb');
                spawnBurst(o.mesh.position, o.color, 8);
                scene.remove(o.mesh);
                o.mesh.material.dispose();
                powerOrbs.splice(i, 1);
                updateHUD();
                if (dragonHP <= 0) { score += 500 * tier; endBattle(true); return; }
                continue;
            }
            if (o.mesh.position.y < -5) {
                scene.remove(o.mesh);
                o.mesh.material.dispose();
                powerOrbs.splice(i, 1);
            }
        }

        // Player beams vs dragon
        const dragBox = new THREE.Box3().setFromObject(dragon);
        for (let i = beams.length - 1; i >= 0; i--) {
            const b = beams[i];
            b.mesh.position.x += b.vx * dt;
            b.mesh.position.y += b.vy * dt;
            const bBox = new THREE.Box3().setFromObject(b.mesh);
            if (bBox.intersectsBox(dragBox)) {
                spawnBurst(b.mesh.position, 0x60a5fa, 5);
                scene.remove(b.mesh);
                beams.splice(i, 1);
                dragonHP -= b.dmg;
                score += 45;
                flashTimer = 0.08;
                playSfx('hitBoss');
                saveBest();
                updateHUD();
                if (dragonHP <= 0) {
                    dragonHP = 0;
                    score += 500 * tier;
                    spawnBurst(dragon.position, 0xf97316, 22);
                    endBattle(true);
                    return;
                }
                continue;
            }
            if (b.mesh.position.y > 6) {
                scene.remove(b.mesh);
                beams.splice(i, 1);
            }
        }

        // Fireballs vs player
        const playerBox = new THREE.Box3().setFromObject(player);
        for (let i = fireballs.length - 1; i >= 0; i--) {
            const f = fireballs[i];
            f.mesh.position.x += f.vx * dt;
            f.mesh.position.y += f.vy * dt;
            const fBox = new THREE.Box3().setFromObject(f.mesh);
            if (fBox.intersectsBox(playerBox)) {
                scene.remove(f.mesh);
                fireballs.splice(i, 1);
                damagePlayer('Hit by Data-Silo Fireball!');
                if (!gameActive) return;
                continue;
            }
            if (f.mesh.position.y < -5) {
                scene.remove(f.mesh);
                fireballs.splice(i, 1);
            }
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const sp = particles[i];
        sp.life -= dt;
        sp.mesh.position.x += sp.vx * dt;
        sp.mesh.position.y += sp.vy * dt;
        sp.mesh.position.z += sp.vz * dt;
        sp.mesh.material.opacity = Math.max(0, sp.life / 0.42);
        if (sp.life <= 0) {
            scene.remove(sp.mesh);
            sp.mesh.material.dispose();
            particles.splice(i, 1);
        }
    }

    if (shakeTime > 0) {
        shakeTime = Math.max(0, shakeTime - dt);
        camera.position.x = (Math.random() - 0.5) * 0.3;
        camera.position.y = 0.4 + (Math.random() - 0.5) * 0.3;
    } else {
        camera.position.x = 0;
        camera.position.y = 0.4;
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
        moveDir = 0; window.moveDir = 0; fireHeld = false;
        if (gameActive) { pauseGame(); resumeBtn.focus({ preventScroll: true }); }
    }
    window.addEventListener('blur', suspend);
    window.addEventListener('pagehide', suspend);
    document.addEventListener('visibilitychange', function () { if (document.hidden) suspend(); });
})();
