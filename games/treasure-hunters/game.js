// Treasure Hunters - Multi-Stage 3D Grapple Miner with Articulated Claw
'use strict';

let scene, camera, renderer, clock;
let clawGroup, jawLeft, jawRight, cable, laserGuide;
let treasures = [];
let particles = [];

const ANCHOR_Y = 3.55;
let stage = 1;
let value = 0;
let quota = 2500;
let timeLeft = 35;
let gameActive = false;
let isMuted = false;
let swingTime = 0;
let grabberState = 'swinging'; // 'swinging' | 'extending' | 'retracting'
let swingAngle = 0;
let cableLength = 0.65;
const maxCableLength = 9.2;
let baseGrabSpeed = 9.2;
let valueBonusMult = 1.0;
let roundTimeBonus = 0;
let turboTimer = 0;
let shakeTime = 0;
let activeGrabTarget = null;

const SAVE_KEY = 'treasure-hunters:best';
let bestValue = readBest();

const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const upgradeScreen = document.getElementById('upgrade-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');

const stageSpan = document.getElementById('game-stage');
const valSpan = document.getElementById('game-value');
const quotaSpan = document.getElementById('game-quota');
const timeSpan = document.getElementById('game-time');
const bestSpan = document.getElementById('game-best');
const feedEl = document.getElementById('hunters-feed');
const upgradeSummary = document.getElementById('upgrade-summary');
const endTitle = document.getElementById('end-title');
const endDesc = document.getElementById('end-desc');
const finalScoreSpan = document.getElementById('final-score-val');
const finalStageSpan = document.getElementById('final-stage-val');

window.gameState = { title: 'treasure-hunters', get active() { return gameActive; } };
window.game = window.gameState;

let goldGeo, diamondGeo, leadGeo, crateGeo, rockGeo, mineGeo, sparkGeo;

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
        if (kind === 'launch') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(340, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
            osc.start(now); osc.stop(now + 0.13);
        } else if (kind === 'grab') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.setValueAtTime(290, now + 0.05);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
            osc.start(now); osc.stop(now + 0.11);
        } else if (kind === 'cash') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587, now);
            osc.frequency.setValueAtTime(880, now + 0.06);
            gain.gain.setValueAtTime(0.11, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.start(now); osc.stop(now + 0.22);
        } else if (kind === 'boom') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(42, now + 0.34);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
            osc.start(now); osc.stop(now + 0.36);
        } else if (kind === 'stage') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(659, now + 0.09);
            osc.frequency.setValueAtTime(880, now + 0.18);
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
        return Number.isFinite(d?.value) ? d.value : (Number(raw) || 0);
    } catch (_) { return 0; }
}
function saveBest() {
    if (value > bestValue) bestValue = value;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ value: bestValue, stage: stage })); } catch (_) {}
    if (bestSpan) bestSpan.textContent = '$' + bestValue;
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
    scene.background = new THREE.Color(0x05080f);
    scene.fog = new THREE.FogExp2(0x05080f, 0.025);

    camera = new THREE.PerspectiveCamera(58, 800 / 600, 0.1, 100);
    camera.position.set(0, 0, 10.6);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    clock = new THREE.Clock();

    scene.add(new THREE.AmbientLight(0xdbeafe, 0.5));
    const keyLight = new THREE.PointLight(0x38bdf8, 2.0, 35);
    keyLight.position.set(0, 4.5, 6);
    scene.add(keyLight);
    const warmLight = new THREE.DirectionalLight(0xfacc15, 0.65);
    warmLight.position.set(-4, 6, 5);
    scene.add(warmLight);

    goldGeo = new THREE.SphereGeometry(0.46, 16, 16);
    diamondGeo = new THREE.OctahedronGeometry(0.36, 0);
    leadGeo = new THREE.TorusGeometry(0.36, 0.12, 8, 16);
    crateGeo = new THREE.BoxGeometry(0.62, 0.62, 0.62);
    rockGeo = new THREE.BoxGeometry(0.86, 0.8, 0.8);
    mineGeo = new THREE.OctahedronGeometry(0.42, 0);
    sparkGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);

    buildVaultBackdrop();
    setupClaw();
    installSessionControls();

    window.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('click', function () { initAudio(); triggerExtend(); });
    canvas.addEventListener('touchstart', function (e) {
        e.preventDefault();
        initAudio();
        triggerExtend();
    }, { passive: false });

    startBtn.addEventListener('click', function () { initAudio(); resetGame(); });
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    document.getElementById('upg-winch').addEventListener('click', function () {
        baseGrabSpeed *= 1.35;
        advanceRound();
    });
    document.getElementById('upg-scanner').addEventListener('click', function () {
        valueBonusMult += 0.25;
        advanceRound();
    });
    document.getElementById('upg-shift').addEventListener('click', function () {
        roundTimeBonus += 8;
        advanceRound();
    });

    window.addEventListener('resize', onWindowResize);
    onWindowResize();
    updateHUD();
    animate();
}

function buildVaultBackdrop() {
    const gridHelper = new THREE.GridHelper(18, 18, 0x1e3a8a, 0x0f172a);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.set(0, -0.5, -2.2);
    scene.add(gridHelper);
}

function setupClaw() {
    const crane = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.42, 0.5),
        new THREE.MeshPhongMaterial({ color: 0x1e293b, emissive: 0x0f172a })
    );
    crane.position.set(0, ANCHOR_Y + 0.2, 0);
    scene.add(crane);

    // Cable pivots from top end (0, ANCHOR_Y, 0)
    const cableGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 8);
    cableGeo.translate(0, -0.5, 0);
    cable = new THREE.Mesh(cableGeo, new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }));
    cable.position.set(0, ANCHOR_Y, 0);
    scene.add(cable);

    // Dotted/faint sight line showing exact trajectory
    const guideGeo = new THREE.CylinderGeometry(0.015, 0.015, 8.5, 6);
    guideGeo.translate(0, -4.25, 0);
    laserGuide = new THREE.Mesh(guideGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.28 }));
    laserGuide.position.set(0, ANCHOR_Y, 0);
    scene.add(laserGuide);

    // Articulated 3D claw head
    clawGroup = new THREE.Group();
    const hub = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.34), new THREE.MeshPhongMaterial({ color: 0xfacc15 }));
    clawGroup.add(hub);

    const jawGeo = new THREE.BoxGeometry(0.11, 0.42, 0.16);
    jawGeo.translate(0, -0.18, 0);
    const jawMat = new THREE.MeshPhongMaterial({ color: 0x38bdf8, emissive: 0x0e7490 });
    jawLeft = new THREE.Mesh(jawGeo, jawMat);
    jawLeft.position.set(-0.18, -0.05, 0);
    jawRight = new THREE.Mesh(jawGeo, jawMat);
    jawRight.position.set(0.18, -0.05, 0);
    clawGroup.add(jawLeft);
    clawGroup.add(jawRight);
    scene.add(clawGroup);
    updateClawPose(false);
}

function updateClawPose(clamped) {
    // Rotating around +Z by +swingAngle maps downward (0, -L) to (+L*sin, -L*cos)
    const tipX = Math.sin(swingAngle) * cableLength;
    const tipY = ANCHOR_Y - Math.cos(swingAngle) * cableLength;
    cable.rotation.z = swingAngle;
    cable.scale.y = cableLength;
    laserGuide.rotation.z = swingAngle;
    laserGuide.visible = gameActive && grabberState === 'swinging';
    clawGroup.rotation.z = swingAngle;
    clawGroup.position.set(tipX, tipY, 0);
    jawLeft.rotation.z = clamped ? 0.12 : -0.45;
    jawRight.rotation.z = clamped ? -0.12 : 0.45;
    return { tipX: tipX, tipY: tipY };
}

function clearVaultItems() {
    for (const t of treasures) { scene.remove(t.mesh); t.mesh.material.dispose(); }
    if (activeGrabTarget) { scene.remove(activeGrabTarget.mesh); activeGrabTarget.mesh.material.dispose(); activeGrabTarget = null; }
    for (const p of particles) { scene.remove(p.mesh); p.mesh.material.dispose(); }
    treasures = [];
    particles = [];
}

function spawnVaultRound() {
    clearVaultItems();
    const total = 9 + Math.min(5, stage);
    const placed = [];
    for (let i = 0; i < total; i++) {
        let rx = 0, ry = -1;
        for (let tries = 0; tries < 20; tries++) {
            rx = (Math.random() * 9.4) - 4.7;
            ry = (Math.random() * 5.2) - 3.6;
            if (!placed.some(function (pt) { return Math.hypot(pt.x - rx, pt.y - ry) < 1.15; })) break;
        }
        placed.push({ x: rx, y: ry });

        const roll = Math.random();
        let type = 'gold', geo = goldGeo, color = 0xfacc15, emissive = 0x5c3c00, baseVal = 850, weight = 1.0, moveVx = 0;
        if (roll < 0.14) {
            type = 'diamond'; geo = diamondGeo; color = 0x38bdf8; emissive = 0x0c4a6e; baseVal = 2000; weight = 0.72;
        } else if (roll < 0.28) {
            type = 'lead'; geo = leadGeo; color = 0x34d399; emissive = 0x064e3b; baseVal = 1500; weight = 0.85;
            moveVx = (Math.random() < 0.5 ? -1 : 1) * (1.2 + stage * 0.25);
        } else if (roll < 0.38) {
            type = 'crate'; geo = crateGeo; color = 0xc084fc; emissive = 0x4c1d95; baseVal = 1000; weight = 0.95;
        } else if (roll < 0.54 && i > 1) {
            type = 'mine'; geo = mineGeo; color = 0xef4444; emissive = 0x7f1d1d; baseVal = 0; weight = 0.8;
        } else if (roll < 0.72) {
            type = 'rock'; geo = rockGeo; color = 0x64748b; emissive = 0x1e293b; baseVal = 140; weight = 2.35;
        } else {
            baseVal = 800 + Math.floor(Math.random() * 450);
        }

        const mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: color, emissive: emissive, shininess: 95 }));
        mesh.position.set(rx, ry, 0);
        scene.add(mesh);
        treasures.push({ mesh: mesh, type: type, value: baseVal, weight: weight, moveVx: moveVx });
    }
}

function spawnBurst(pos, color, count) {
    for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 }));
        m.position.copy(pos);
        scene.add(m);
        particles.push({
            mesh: m,
            vx: (Math.random() - 0.5) * 5.6,
            vy: (Math.random() - 0.5) * 5.6,
            vz: (Math.random() - 0.5) * 2.5,
            life: 0.45
        });
    }
}

function updateHUD() {
    stageSpan.textContent = String(stage);
    valSpan.textContent = '$' + value;
    quotaSpan.textContent = '$' + quota;
    timeSpan.textContent = Math.max(0, Math.ceil(timeLeft)) + 's';
    bestSpan.textContent = '$' + bestValue;
}

function startGame() {
    pauseScreen.classList.add('hidden');
    startScreen.classList.add('hidden');
    upgradeScreen.classList.add('hidden');
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
    stage = 1;
    value = 0;
    quota = 2500;
    timeLeft = 35;
    baseGrabSpeed = 9.2;
    valueBonusMult = 1.0;
    roundTimeBonus = 0;
    turboTimer = 0;
    shakeTime = 0;
    grabberState = 'swinging';
    cableLength = 0.65;
    swingAngle = 0;
    swingTime = 0;
    updateClawPose(false);
    spawnVaultRound();
    feedEl.textContent = 'Round 1: Reach $' + quota + ' before time runs out!';
    updateHUD();
    startGame();
}

function advanceRound() {
    stage++;
    quota = value + 2200 + stage * 700;
    timeLeft = 35 + roundTimeBonus;
    grabberState = 'swinging';
    cableLength = 0.65;
    swingAngle = 0;
    updateClawPose(false);
    spawnVaultRound();
    upgradeScreen.classList.add('hidden');
    feedEl.textContent = 'Stage ' + stage + ': New Quota $' + quota + '!';
    updateHUD();
    startGame();
}

function endGame() {
    gameActive = false;
    saveBest();
    endTitle.textContent = 'Shift Ended';
    const shortfall = Math.max(0, quota - value);
    endDesc.textContent = `Stage ${stage} target: $${quota.toLocaleString()}. You needed $${shortfall.toLocaleString()} more. Personal best: $${bestValue.toLocaleString()}.`;
    finalScoreSpan.textContent = '$' + value;
    finalStageSpan.textContent = String(stage);
    gameOverScreen.classList.remove('hidden');
    playSfx('boom');
}

function triggerExtend() {
    if (grabberState === 'swinging' && gameActive) {
        grabberState = 'extending';
        playSfx('launch');
    }
}
window.triggerExtend = triggerExtend;

function onKeyDown(e) {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.repeat && ['Escape', 'KeyP', 'Space'].includes(e.code)) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'KeyS') triggerExtend();
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

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (gameActive) {
        timeLeft = Math.max(0, timeLeft - dt);
        if (turboTimer > 0) turboTimer = Math.max(0, turboTimer - dt);

        // Move drifting leads and rotate assets
        for (const t of treasures) {
            t.mesh.rotation.y += dt * 1.4;
            if (t.moveVx) {
                t.mesh.position.x += t.moveVx * dt;
                if (t.mesh.position.x > 4.9 || t.mesh.position.x < -4.9) t.moveVx *= -1;
            }
        }

        const speedMult = turboTimer > 0 ? 1.85 : 1.0;

        if (grabberState === 'swinging') {
            swingTime += dt;
            swingAngle = Math.sin(swingTime * 1.85) * 1.06;
            updateClawPose(false);
        } else if (grabberState === 'extending') {
            cableLength += baseGrabSpeed * speedMult * dt;
            const tip = updateClawPose(false);

            const clawBox = new THREE.Box3().setFromObject(clawGroup);
            for (let i = 0; i < treasures.length; i++) {
                const t = treasures[i];
                const tBox = new THREE.Box3().setFromObject(t.mesh);
                if (clawBox.intersectsBox(tBox)) {
                    if (t.type === 'mine') {
                        // Mine detonation: destroy nearby rocks/mine, shake & -4s time penalty
                        const boomPos = t.mesh.position.clone();
                        spawnBurst(boomPos, 0xef4444, 16);
                        playSfx('boom');
                        shakeTime = 0.28;
                        timeLeft = Math.max(0, timeLeft - 4);
                        scene.remove(t.mesh);
                        t.mesh.material.dispose();
                        treasures.splice(i, 1);
                        for (let j = treasures.length - 1; j >= 0; j--) {
                            if (treasures[j].type === 'rock' && treasures[j].mesh.position.distanceTo(boomPos) < 2.3) {
                                spawnBurst(treasures[j].mesh.position, 0x94a3b8, 6);
                                scene.remove(treasures[j].mesh);
                                treasures[j].mesh.material.dispose();
                                treasures.splice(j, 1);
                            }
                        }
                        feedEl.textContent = 'MINE DETONATED! -4s time penalty!';
                        grabberState = 'retracting';
                        break;
                    }
                    activeGrabTarget = t;
                    treasures.splice(i, 1);
                    grabberState = 'retracting';
                    playSfx('grab');
                    break;
                }
            }

            if (cableLength >= maxCableLength || Math.abs(tip.tipX) > 6.3 || tip.tipY < -4.6) {
                grabberState = 'retracting';
            }
        } else if (grabberState === 'retracting') {
            const weightDiv = activeGrabTarget ? activeGrabTarget.weight : 0.75;
            const retrieveSpeed = (baseGrabSpeed * speedMult) / weightDiv;
            cableLength = Math.max(0.65, cableLength - retrieveSpeed * dt);
            const tip = updateClawPose(!!activeGrabTarget);

            if (activeGrabTarget) {
                activeGrabTarget.mesh.position.set(tip.tipX, tip.tipY - 0.25, 0);
            }

            if (cableLength <= 0.65) {
                if (activeGrabTarget) {
                    if (activeGrabTarget.type === 'crate') {
                        const r = Math.random();
                        if (r < 0.34) {
                            const bonus = Math.round(1200 * valueBonusMult);
                            value += bonus;
                            feedEl.textContent = 'Mystery Crate: +$' + bonus + ' Bonus!';
                        } else if (r < 0.68) {
                            timeLeft += 6;
                            feedEl.textContent = 'Mystery Crate: +6s Extra Shift Time!';
                        } else {
                            turboTimer = 8;
                            feedEl.textContent = 'Mystery Crate: 8s TURBO WINCH!';
                        }
                    } else {
                        const payout = Math.round(activeGrabTarget.value * valueBonusMult);
                        value += payout;
                        feedEl.textContent = 'Secured ' + activeGrabTarget.type.toUpperCase() + ': +$' + payout + '!';
                    }
                    spawnBurst(clawGroup.position, 0xfacc15, 8);
                    playSfx('cash');
                    saveBest();
                    scene.remove(activeGrabTarget.mesh);
                    activeGrabTarget.mesh.material.dispose();
                    activeGrabTarget = null;
                }

                if (treasures.filter(function (t) { return t.type !== 'mine'; }).length === 0) {
                    spawnVaultRound();
                }
                grabberState = 'swinging';
            }
        }

        updateHUD();

        if (timeLeft <= 0) {
            if (value >= quota) {
                gameActive = false;
                saveBest();
                playSfx('stage');
                upgradeSummary.textContent = 'Stage ' + stage + ' cleared with $' + value + '! Pick a rig upgrade:';
                upgradeScreen.classList.remove('hidden');
            } else {
                endGame();
            }
        }
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
        camera.position.y = (Math.random() - 0.5) * 0.28;
    } else {
        camera.position.x = 0;
        camera.position.y = 0;
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
    for (const scr of [startScreen, upgradeScreen, pauseScreen, gameOverScreen]) {
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
