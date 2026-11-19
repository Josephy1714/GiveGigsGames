// The AI Expedition - Multi-Stage Timed Network Routing & Overload Defense
'use strict';

let scene, camera, renderer, clock;
let centerNode, innerRingMesh, outerRingMesh, starPoints, selectorRing;
let outerNodes = [];
let pipes = [];
let packets = [];
let particles = [];

let stage = 1;
let score = 0;
let combo = 1;
let maxCombo = 1;
let connectedCount = 0;
let totalNodes = 5;
let timeLeft = 28;
let gameActive = false;
let isMuted = false;
let shakeTime = 0;
let selectedIdx = 0;
let stageClearPause = 0;

const SAVE_KEY = 'the-ai-expedition:best';
let bestScore = readBest();

const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');
const stageSpan = document.getElementById('game-stage');
const routesSpan = document.getElementById('game-routes');
const syncSpan = document.getElementById('game-sync');
const timeSpan = document.getElementById('game-time');
const scoreSpan = document.getElementById('game-score');
const bestSpan = document.getElementById('game-best');
const bannerEl = document.getElementById('expedition-banner');
const endTitle = document.getElementById('end-title');
const endDesc = document.getElementById('end-desc');
const finalScoreSpan = document.getElementById('final-score-val');
const finalStageSpan = document.getElementById('final-stage-val');

window.gameState = { title: 'the-ai-expedition', get active() { return gameActive; } };
window.game = window.gameState;

let nodeGeo, packetGeo, sparkGeo;

let audioCtx = null;
function initAudio() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } catch (_) {}
}
function playSfx(kind, step) {
    if (isMuted) return;
    initAudio();
    if (!audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        if (kind === 'link') {
            const freq = 360 + (step || 0) * 55;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + 0.14);
            gain.gain.setValueAtTime(0.11, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.start(now); osc.stop(now + 0.16);
        } else if (kind === 'surge') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(660, now);
            osc.frequency.setValueAtTime(990, now + 0.07);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.start(now); osc.stop(now + 0.22);
        } else if (kind === 'firewall') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(175, now);
            osc.frequency.linearRampToValueAtTime(75, now + 0.24);
            gain.gain.setValueAtTime(0.13, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
        } else if (kind === 'stage') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.08);
            osc.frequency.setValueAtTime(784, now + 0.16);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
            osc.start(now); osc.stop(now + 0.34);
        } else if (kind === 'over') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.42);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
            osc.start(now); osc.stop(now + 0.44);
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
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ score: bestScore, stage: stage })); } catch (_) {}
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
    scene.background = new THREE.Color(0x04020a);
    scene.fog = new THREE.FogExp2(0x04020a, 0.02);

    camera = new THREE.PerspectiveCamera(58, 800 / 600, 0.1, 120);
    camera.position.set(0, 0, 12.2);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    clock = new THREE.Clock();

    scene.add(new THREE.AmbientLight(0xe2e8f0, 0.5));
    const pointLight = new THREE.PointLight(0xa855f7, 2.2, 35);
    pointLight.position.set(0, 0, 6);
    scene.add(pointLight);
    const dirLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    dirLight.position.set(5, 8, 8);
    scene.add(dirLight);

    nodeGeo = new THREE.SphereGeometry(0.48, 20, 20);
    packetGeo = new THREE.SphereGeometry(0.14, 10, 10);
    sparkGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);

    buildBackdrop();
    setupStageNodes(1);
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

function buildBackdrop() {
    const count = 300;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 36;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 26;
        pos[i * 3 + 2] = -4 - Math.random() * 20;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starPoints = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x93c5fd, size: 0.12, transparent: true, opacity: 0.7 }));
    scene.add(starPoints);

    centerNode = new THREE.Mesh(
        new THREE.SphereGeometry(1.05, 28, 28),
        new THREE.MeshPhongMaterial({ color: 0xa855f7, emissive: 0x3b0764, shininess: 110 })
    );
    scene.add(centerNode);

    innerRingMesh = new THREE.Mesh(
        new THREE.TorusGeometry(2.6, 0.025, 8, 64),
        new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.38 })
    );
    scene.add(innerRingMesh);

    outerRingMesh = new THREE.Mesh(
        new THREE.TorusGeometry(4.3, 0.025, 8, 80),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.28 })
    );
    scene.add(outerRingMesh);

    selectorRing = new THREE.Mesh(
        new THREE.RingGeometry(0.62, 0.75, 24),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    selectorRing.visible = false;
    scene.add(selectorRing);
}

function clearStageObjects() {
    for (const p of pipes) { scene.remove(p); p.geometry.dispose(); p.material.dispose(); }
    for (const pk of packets) { scene.remove(pk.mesh); pk.mesh.material.dispose(); }
    for (const n of outerNodes) { scene.remove(n.mesh); n.mesh.material.dispose(); }
    for (const sp of particles) { scene.remove(sp.mesh); sp.mesh.material.dispose(); }
    pipes = []; packets = []; outerNodes = []; particles = [];
}

function setupStageNodes(stg) {
    clearStageObjects();
    connectedCount = 0;
    totalNodes = Math.min(12, 4 + stg);
    const hasTwoRings = totalNodes >= 8;
    const innerCount = hasTwoRings ? Math.floor(totalNodes / 2) : totalNodes;
    const outerCount = hasTwoRings ? totalNodes - innerCount : 0;
    outerRingMesh.visible = hasTwoRings;

    const labels = ['AI Agents', 'Data Lakes', 'Automations', 'Markets', 'Vector DB', 'Model Router', 'CRM Sync', 'Telemetry', 'API Mesh', 'Guardrails', 'Billing', 'Analytics'];
    let idx = 0;
    function addRing(count, radius, speedSign) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const mat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, emissive: 0x1e3a8a, shininess: 90 });
            const mesh = new THREE.Mesh(nodeGeo, mat);
            mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
            scene.add(mesh);
            const isSurge = idx === 1 || (stg >= 2 && idx % 4 === 2);
            outerNodes.push({
                mesh: mesh,
                connected: false,
                idx: idx,
                label: labels[idx % labels.length],
                radius: radius,
                angle: angle,
                orbitSpeed: speedSign * (0.22 + stg * 0.06),
                state: isSurge ? 'surge' : 'ready', // 'ready' | 'surge' | 'firewall'
                stateTimer: isSurge ? 6.5 : (stg >= 2 ? 1.5 + Math.random() * 3.5 : 999)
            });
            idx++;
        }
    }
    addRing(innerCount, hasTwoRings ? 2.6 : 3.2, 1);
    if (outerCount > 0) addRing(outerCount, 4.3, -0.75);
    selectedIdx = 0;
    refreshNodeColors();
    updateHUD();
}

function refreshNodeColors() {
    outerNodes.forEach(function (n) {
        if (n.connected) {
            n.mesh.material.color.setHex(0x10b981);
            n.mesh.material.emissive.setHex(0x064e3b);
        } else if (n.state === 'firewall') {
            n.mesh.material.color.setHex(0xef4444);
            n.mesh.material.emissive.setHex(0x7f1d1d);
        } else if (n.state === 'surge') {
            n.mesh.material.color.setHex(0xfacc15);
            n.mesh.material.emissive.setHex(0x713f12);
        } else {
            n.mesh.material.color.setHex(0x3b82f6);
            n.mesh.material.emissive.setHex(0x1e3a8a);
        }
    });
}

function spawnBurst(pos, color, count) {
    for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 }));
        m.position.copy(pos);
        scene.add(m);
        particles.push({
            mesh: m,
            vx: (Math.random() - 0.5) * 5.5,
            vy: (Math.random() - 0.5) * 5.5,
            vz: (Math.random() - 0.5) * 2.5,
            life: 0.45
        });
    }
}

function connectNode(node) {
    if (!gameActive || stageClearPause > 0 || !node || node.connected) return;
    if (node.state === 'firewall') {
        combo = 1;
        timeLeft = Math.max(0, timeLeft - 3);
        shakeTime = 0.25;
        spawnBurst(node.mesh.position, 0xef4444, 10);
        playSfx('firewall');
        bannerEl.textContent = 'FIREWALL HIT! Combo reset & -3s penalty — wait for Red nodes to clear!';
        updateHUD();
        if (timeLeft <= 0) endGame();
        return;
    }

    const isSurge = node.state === 'surge';
    node.connected = true;
    node.state = 'connected';
    connectedCount++;
    const pts = (isSurge ? 250 : 120) * combo;
    score += pts;
    if (isSurge) timeLeft += 2;
    combo = Math.min(5, combo + 1);
    maxCombo = Math.max(maxCombo, combo);

    const endVec = node.mesh.position.clone();
    const dist = endVec.length();
    const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, dist, 8),
        new THREE.MeshBasicMaterial({ color: isSurge ? 0xfacc15 : 0x34d399 })
    );
    pipe.position.copy(endVec).multiplyScalar(0.5);
    pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), endVec.clone().normalize());
    scene.add(pipe);
    pipes.push(pipe);

    // Live energy packet streaming along this conduit
    const pkMesh = new THREE.Mesh(packetGeo, new THREE.MeshBasicMaterial({ color: isSurge ? 0xfef08a : 0x6ee7b7 }));
    scene.add(pkMesh);
    packets.push({ mesh: pkMesh, node: node, t: Math.random() });

    spawnBurst(node.mesh.position, isSurge ? 0xfacc15 : 0x34d399, 9);
    playSfx(isSurge ? 'surge' : 'link', connectedCount);
    bannerEl.textContent = (isSurge ? 'SURGE ROUTE +2s! ' : 'Linked ') + node.label + ' (+' + pts + ', x' + combo + ')';
    refreshNodeColors();
    saveBest();
    updateHUD();

    if (connectedCount >= totalNodes) {
        score += Math.round(timeLeft * 25);
        saveBest();
        stageClearPause = 0.7;
        playSfx('stage');
        bannerEl.textContent = 'Stage ' + stage + ' Synchronized! Advancing...';
    }
}

function updateHUD() {
    stageSpan.textContent = String(stage);
    routesSpan.textContent = connectedCount + '/' + totalNodes;
    syncSpan.textContent = Math.round((connectedCount / Math.max(1, totalNodes)) * 100) + '%';
    timeSpan.textContent = Math.max(0, Math.ceil(timeLeft)) + 's';
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
    stage = 1;
    score = 0;
    combo = 1;
    maxCombo = 1;
    timeLeft = 28;
    stageClearPause = 0;
    shakeTime = 0;
    setupStageNodes(1);
    bannerEl.textContent = 'Connect Blue nodes · Gold = +2s Surge · Avoid Red Firewalls!';
    startGame();
}

function endGame() {
    gameActive = false;
    saveBest();
    endTitle.textContent = 'Sync Timed Out';
    endDesc.textContent = 'Max Combo x' + maxCombo + ' · Best Score: ' + bestScore;
    finalScoreSpan.textContent = String(score);
    finalStageSpan.textContent = String(stage);
    gameOverScreen.classList.remove('hidden');
    playSfx('over');
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
    const intersects = raycaster.intersectObjects(outerNodes.map(function (o) { return o.mesh; }));
    if (intersects.length > 0) {
        const target = outerNodes.find(function (o) { return o.mesh === intersects[0].object; });
        if (target && !target.connected) {
            selectedIdx = outerNodes.indexOf(target);
            connectNode(target);
        }
    }
}

function onKeyDown(e) {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) pauseGame();
        else if (!pauseScreen.classList.contains('hidden')) resumeGame();
        return;
    }
    if (!gameActive || !outerNodes.length) return;
    if (e.code === 'ArrowRight' || e.code === 'ArrowDown' || e.code === 'Tab') {
        e.preventDefault();
        for (let step = 1; step <= outerNodes.length; step++) {
            const candidate = (selectedIdx + step) % outerNodes.length;
            if (!outerNodes[candidate].connected) { selectedIdx = candidate; break; }
        }
    } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
        e.preventDefault();
        for (let step = 1; step <= outerNodes.length; step++) {
            const candidate = (selectedIdx - step + outerNodes.length) % outerNodes.length;
            if (!outerNodes[candidate].connected) { selectedIdx = candidate; break; }
        }
    } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        const node = outerNodes[selectedIdx];
        if (node && !node.connected) connectNode(node);
        else {
            const nextOpen = outerNodes.find(function (n) { return !n.connected; });
            if (nextOpen) connectNode(nextOpen);
        }
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

    if (starPoints) starPoints.rotation.z += dt * 0.02;
    centerNode.rotation.y += dt * 0.85;
    centerNode.rotation.x += dt * 0.3;

    if (gameActive) {
        if (stageClearPause > 0) {
            stageClearPause -= dt;
            if (stageClearPause <= 0) {
                stage++;
                timeLeft = Math.min(45, timeLeft + 11 + Math.min(6, stage));
                setupStageNodes(stage);
                bannerEl.textContent = 'Stage ' + stage + ' Live — Watch for Red Firewall cycles!';
            }
        } else {
            timeLeft -= dt;
            timeSpan.textContent = Math.max(0, Math.ceil(timeLeft)) + 's';
            if (timeLeft <= 0) { endGame(); return; }
        }

        // Orbit & cycle node states
        let stateChanged = false;
        outerNodes.forEach(function (n, idx) {
            n.angle += n.orbitSpeed * dt;
            n.mesh.position.set(Math.cos(n.angle) * n.radius, Math.sin(n.angle) * n.radius, 0);
            n.mesh.rotation.y += dt * 1.1;

            if (!n.connected && stage >= 2) {
                n.stateTimer -= dt;
                if (n.stateTimer <= 0) {
                    stateChanged = true;
                    if (n.state === 'firewall') {
                        n.state = Math.random() < 0.25 ? 'surge' : 'ready';
                        n.stateTimer = 2.8 + Math.random() * 2.4;
                    } else if (n.state === 'surge') {
                        n.state = 'ready';
                        n.stateTimer = 2.5 + Math.random() * 2.0;
                    } else {
                        n.state = Math.random() < Math.min(0.42, 0.16 + stage * 0.05) ? 'firewall' : 'surge';
                        n.stateTimer = n.state === 'firewall' ? 2.1 : 3.4;
                    }
                }
            }
            if (idx === selectedIdx && !n.connected) {
                selectorRing.visible = true;
                selectorRing.position.copy(n.mesh.position);
                selectorRing.position.z = 0.55;
            }
        });
        if (stateChanged) refreshNodeColors();

        // Update conduit pipes & energy packets to follow orbiting nodes
        pipes.forEach(function (pipe, idx) {
            const pk = packets[idx];
            if (!pk) return;
            const endVec = pk.node.mesh.position;
            pipe.position.copy(endVec).multiplyScalar(0.5);
            pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), endVec.clone().normalize());
            pk.t = (pk.t + dt * 1.35) % 1;
            pk.mesh.position.copy(endVec).multiplyScalar(1 - pk.t);
        });
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
        camera.position.x = (Math.random() - 0.5) * 0.25;
        camera.position.y = (Math.random() - 0.5) * 0.25;
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
