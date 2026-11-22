// The Speed Portal - High-Contrast Neon Hyperspace Tunnel Racer
'use strict';

let scene, camera, renderer, clock;
let player, shieldMesh, warpStars;
let tunnelRings = [];
let guideRails = [];
let obstacles = [];
let items = [];
let particles = [];

let playerAngle = -Math.PI / 2;
const tunnelRadius = 4.0;
let baseSpeed = 26.0;
let boostTimer = 0;
let invulnTimer = 0;
let hasShield = true;
let ringCombo = 0;
let distance = 0;
let boosts = 0;
let spawnTimer = 0;
let shakeTime = 0;
let gameActive = false;
let isMuted = false;

let rotateDir = 0;
window.rotateDir = 0;
const rotationSpeed = 4.8;

const SAVE_KEY = 'the-speed-portal:best';
let bestDistance = readBest();

const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');

const zoneSpan = document.getElementById('game-zone');
const distSpan = document.getElementById('game-dist');
const boostsSpan = document.getElementById('game-boosts');
const shieldSpan = document.getElementById('game-shield');
const speedSpan = document.getElementById('game-speed');
const bestSpan = document.getElementById('game-best');
const feedEl = document.getElementById('portal-feed');
const endDesc = document.getElementById('end-desc');
const finalDistSpan = document.getElementById('final-dist-val');
const finalZoneSpan = document.getElementById('final-zone-val');

window.gameState = { title: 'the-speed-portal', get active() { return gameActive; } };
window.game = window.gameState;

let arcGeo, spokeGeo, speedRingGeo, sparkGeo;
let arcMat, spokeMat, ringMat;

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
        if (kind === 'ring') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587, now);
            osc.frequency.exponentialRampToValueAtTime(988, now + 0.14);
            gain.gain.setValueAtTime(0.11, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.start(now); osc.stop(now + 0.16);
        } else if (kind === 'graze') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(840, now);
            osc.frequency.exponentialRampToValueAtTime(1180, now + 0.08);
            gain.gain.setValueAtTime(0.07, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
            osc.start(now); osc.stop(now + 0.09);
        } else if (kind === 'shield') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(85, now + 0.24);
            gain.gain.setValueAtTime(0.13, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
        } else if (kind === 'crash') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.36);
            gain.gain.setValueAtTime(0.15, now);
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
        return Number.isFinite(d?.dist) ? d.dist : (Number(raw) || 0);
    } catch (_) { return 0; }
}
function saveBest() {
    const d = Math.floor(distance);
    if (d > bestDistance) bestDistance = d;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ dist: bestDistance, boosts: boosts })); } catch (_) {}
    if (bestSpan) bestSpan.textContent = bestDistance + 'm';
}

function getZoneName(dist) {
    if (dist >= 1200) return 'Singularity';
    if (dist >= 650) return 'Hyperdrive';
    if (dist >= 250) return 'Overclock';
    return 'Warmup';
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
    scene.background = new THREE.Color(0x020612);
    scene.fog = new THREE.FogExp2(0x020612, 0.011);

    camera = new THREE.PerspectiveCamera(70, 800 / 600, 0.1, 180);
    camera.position.set(0, 0, 9.5);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    clock = new THREE.Clock();

    scene.add(new THREE.AmbientLight(0xe0f2fe, 0.5));
    const pointLight = new THREE.PointLight(0x06b6d4, 2.2, 65);
    pointLight.position.set(0, 0, 6);
    scene.add(pointLight);

    arcGeo = new THREE.TorusGeometry(tunnelRadius, 0.36, 8, 12, Math.PI * 0.44);
    spokeGeo = new THREE.BoxGeometry(tunnelRadius * 1.9, 0.32, 0.32);
    speedRingGeo = new THREE.TorusGeometry(0.68, 0.12, 8, 18);
    sparkGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);

    arcMat = new THREE.MeshPhongMaterial({ color: 0xef4444, emissive: 0x991b1b, shininess: 90 });
    spokeMat = new THREE.MeshPhongMaterial({ color: 0xf43f5e, emissive: 0x881337, shininess: 100 });
    ringMat = new THREE.MeshPhongMaterial({ color: 0x10b981, emissive: 0x065f46, shininess: 110 });

    buildTunnel();
    buildWarpStars();
    createPlayerShip();
    installSessionControls();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    startBtn.addEventListener('click', function () { initAudio(); resetGame(); });
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const setLeft = function (e) { e.preventDefault(); rotateDir = -1; };
    const setRight = function (e) { e.preventDefault(); rotateDir = 1; };
    const clearMove = function (e) { e.preventDefault(); rotateDir = 0; };

    btnLeft.addEventListener('mousedown', setLeft);
    btnLeft.addEventListener('touchstart', setLeft, { passive: false });
    btnLeft.addEventListener('mouseup', clearMove);
    btnLeft.addEventListener('touchend', clearMove);
    btnLeft.addEventListener('touchcancel', clearMove);
    btnLeft.addEventListener('mouseleave', clearMove);

    btnRight.addEventListener('mousedown', setRight);
    btnRight.addEventListener('touchstart', setRight, { passive: false });
    btnRight.addEventListener('mouseup', clearMove);
    btnRight.addEventListener('touchend', clearMove);
    btnRight.addEventListener('touchcancel', clearMove);
    btnRight.addEventListener('mouseleave', clearMove);

    window.addEventListener('resize', onWindowResize);
    onWindowResize();
    updateHUD();
    animate();
}

function buildTunnel() {
    const ringGeo = new THREE.TorusGeometry(tunnelRadius + 0.15, 0.06, 8, 36);
    const cyanMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.72 });
    const violetMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.68 });
    for (let i = 0; i < 22; i++) {
        const ring = new THREE.Mesh(ringGeo, i % 2 === 0 ? cyanMat : violetMat);
        ring.position.set(0, 0, -i * 9);
        scene.add(ring);
        tunnelRings.push(ring);
    }

    // 8 longitudinal neon guide rails
    const railGeo = new THREE.CylinderGeometry(0.035, 0.035, 200, 6);
    railGeo.rotateX(Math.PI / 2);
    const railMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 });
    for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.set(Math.cos(ang) * (tunnelRadius + 0.18), Math.sin(ang) * (tunnelRadius + 0.18), -90);
        scene.add(rail);
        guideRails.push(rail);
    }
}

function buildWarpStars() {
    const count = 260;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const r = tunnelRadius + 1.2 + Math.random() * 8;
        const a = Math.random() * Math.PI * 2;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = Math.sin(a) * r;
        pos[i * 3 + 2] = -Math.random() * 140;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    warpStars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x67e8f9, size: 0.16, transparent: true, opacity: 0.8 }));
    scene.add(warpStars);
}

function createPlayerShip() {
    player = new THREE.Group();
    const hullMat = new THREE.MeshPhongMaterial({ color: 0x38bdf8, emissive: 0x0c4a6e, shininess: 110 });
    const hull = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.35, 6), hullMat);
    hull.rotation.x = Math.PI / 2;
    player.add(hull);

    // Twin wing fins
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.42), new THREE.MeshPhongMaterial({ color: 0x22d3ee, emissive: 0x083344 }));
    wing.position.set(0, -0.04, 0.15);
    player.add(wing);

    // Thruster glow
    const thruster = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    thruster.position.set(0, 0, 0.72);
    player.add(thruster);

    // Shield bubble
    shieldMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.75, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x34d399, wireframe: true, transparent: true, opacity: 0.45 })
    );
    player.add(shieldMesh);

    scene.add(player);
    updatePlayerPosition(0);
}

function updatePlayerPosition(effDir) {
    const x = Math.cos(playerAngle) * tunnelRadius;
    const y = Math.sin(playerAngle) * tunnelRadius;
    player.position.set(x, y, 0);
    player.rotation.z = playerAngle - Math.PI / 2 - effDir * 0.28;
    shieldMesh.visible = hasShield;
}

function clearDynamic() {
    for (const o of obstacles) scene.remove(o.mesh);
    for (const it of items) scene.remove(it.mesh);
    for (const sp of particles) { scene.remove(sp.mesh); sp.mesh.material.dispose(); }
    obstacles = [];
    items = [];
    particles = [];
}

function spawnWaveHazard() {
    const angle = Math.random() * Math.PI * 2;
    const zStart = -135;
    const zone = getZoneName(distance);

    if ((zone === 'Hyperdrive' || zone === 'Singularity' || distance >= 250) && Math.random() < 0.25) {
        // Rotating laser spoke across tunnel diameter
        const mesh = new THREE.Mesh(spokeGeo, spokeMat);
        mesh.position.set(0, 0, zStart);
        mesh.rotation.z = angle;
        scene.add(mesh);
        obstacles.push({
            mesh: mesh,
            kind: 'spoke',
            angle: angle,
            rotSpeed: (Math.random() < 0.5 ? -1 : 1) * 1.15,
            grazed: false
        });
    } else {
        // Arc barrier(s)
        const twin = distance >= 250 && Math.random() < 0.35;
        const count = twin ? 2 : 1;
        for (let k = 0; k < count; k++) {
            const a = angle + k * Math.PI;
            const mesh = new THREE.Mesh(arcGeo, arcMat);
            mesh.position.set(0, 0, zStart);
            mesh.rotation.z = a - Math.PI * 0.22;
            scene.add(mesh);
            obstacles.push({
                mesh: mesh,
                kind: 'arc',
                angle: a,
                rotSpeed: 0,
                grazed: false
            });
        }
    }

    if (Math.random() < 0.62) {
        const ringAngle = angle + Math.PI * 0.85;
        const ring = new THREE.Mesh(speedRingGeo, ringMat);
        ring.position.set(Math.cos(ringAngle) * tunnelRadius, Math.sin(ringAngle) * tunnelRadius, zStart + 18);
        scene.add(ring);
        items.push({ mesh: ring, angle: ringAngle });
    }
}

function spawnBurst(pos, color, count) {
    for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 }));
        m.position.copy(pos);
        scene.add(m);
        particles.push({
            mesh: m,
            vx: (Math.random() - 0.5) * 7,
            vy: (Math.random() - 0.5) * 7,
            vz: (Math.random() - 0.5) * 7,
            life: 0.42
        });
    }
}

function angularDist(a, b) {
    let d = Math.abs((a - b) % (Math.PI * 2));
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
}

function updateHUD() {
    const zone = getZoneName(distance);
    const curSpeed = Math.round(baseSpeed + (boostTimer > 0 ? 18 : 0));
    zoneSpan.textContent = zone;
    distSpan.textContent = Math.floor(distance) + 'm';
    boostsSpan.textContent = String(boosts);
    shieldSpan.textContent = hasShield ? '🛡️ ON' : 'OFF (' + (ringCombo % 3) + '/3)';
    speedSpan.textContent = String(curSpeed);
    bestSpan.textContent = bestDistance + 'm';
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
    playerAngle = -Math.PI / 2;
    rotateDir = 0;
    window.rotateDir = 0;
    distance = 0;
    boosts = 0;
    ringCombo = 0;
    baseSpeed = 26.0;
    boostTimer = 0;
    invulnTimer = 0;
    hasShield = true;
    spawnTimer = 0.25;
    shakeTime = 0;
    camera.fov = 70;
    camera.updateProjectionMatrix();
    updatePlayerPosition(0);
    feedEl.textContent = 'Thread emerald rings for boosts & shield recharge · Graze barriers for +25m!';
    updateHUD();
    startGame();
}

function endGame() {
    gameActive = false;
    saveBest();
    const zone = getZoneName(distance);
    endDesc.textContent = 'Reached ' + zone + ' Zone · Best Distance: ' + bestDistance + 'm';
    finalDistSpan.textContent = Math.floor(distance) + 'm';
    finalZoneSpan.textContent = zone;
    gameOverScreen.classList.remove('hidden');
    playSfx('crash');
}

function onKeyDown(e) {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.repeat && ['Escape', 'KeyP'].includes(e.code)) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') rotateDir = -1;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') rotateDir = 1;
    else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) pauseGame();
        else if (!pauseScreen.classList.contains('hidden')) resumeGame();
    }
}

function onKeyUp(e) {
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && rotateDir === -1) rotateDir = 0;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && rotateDir === 1) rotateDir = 0;
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
        const effDir = rotateDir || window.rotateDir || 0;
        playerAngle += effDir * rotationSpeed * dt;
        updatePlayerPosition(effDir);

        if (boostTimer > 0) boostTimer = Math.max(0, boostTimer - dt);
        if (invulnTimer > 0) invulnTimer = Math.max(0, invulnTimer - dt);
        player.visible = invulnTimer <= 0 || Math.floor(invulnTimer * 14) % 2 === 0;

        baseSpeed = Math.min(68, 26 + distance * 0.025);
        const effSpeed = baseSpeed + (boostTimer > 0 ? 18 : 0);

        const targetFov = boostTimer > 0 ? 82 : 70;
        if (Math.abs(camera.fov - targetFov) > 0.2) {
            camera.fov += (targetFov - camera.fov) * 0.14;
            camera.updateProjectionMatrix();
        }

        // Scroll tunnel & warp stars
        tunnelRings.forEach(function (ring) {
            ring.position.z += effSpeed * dt;
            if (ring.position.z > 10) ring.position.z -= 198;
        });
        if (warpStars) {
            const arr = warpStars.geometry.attributes.position.array;
            for (let i = 2; i < arr.length; i += 3) {
                arr[i] += effSpeed * 1.4 * dt;
                if (arr[i] > 10) arr[i] -= 140;
            }
            warpStars.geometry.attributes.position.needsUpdate = true;
        }

        // Spawn schedule tightens with distance
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
            spawnWaveHazard();
            spawnTimer = Math.max(0.42, 1.05 - distance * 0.00045);
        }

        // Obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.mesh.position.z += effSpeed * dt;
            if (obs.rotSpeed) {
                obs.angle += obs.rotSpeed * dt;
                obs.mesh.rotation.z = obs.angle;
            }

            if (Math.abs(obs.mesh.position.z) < 0.9) {
                const hit = obs.kind === 'spoke'
                    ? Math.min(angularDist(obs.angle, playerAngle), angularDist(obs.angle + Math.PI, playerAngle)) < 0.22
                    : angularDist(obs.angle, playerAngle) < 0.44;
                if (hit && invulnTimer <= 0) {
                    if (hasShield) {
                        hasShield = false;
                        invulnTimer = 1.25;
                        shakeTime = 0.22;
                        spawnBurst(player.position, 0x34d399, 14);
                        playSfx('shield');
                        feedEl.textContent = 'SHIELD SHATTERED! Thread 3 emerald rings to recharge!';
                    } else {
                        spawnBurst(player.position, 0xef4444, 18);
                        scene.remove(obs.mesh);
                        obstacles.splice(i, 1);
                        endGame();
                        return;
                    }
                } else if (!hit && !obs.grazed) {
                    const diff = obs.kind === 'spoke'
                        ? Math.min(angularDist(obs.angle, playerAngle), angularDist(obs.angle + Math.PI, playerAngle))
                        : angularDist(obs.angle, playerAngle);
                    if (diff < 0.82) {
                        obs.grazed = true;
                        distance += 25;
                        playSfx('graze');
                        spawnBurst(player.position, 0x38bdf8, 5);
                        feedEl.textContent = 'NEAR MISS! +25m Warp Bonus!';
                    }
                }
            }

            if (obs.mesh.position.z > 14) {
                scene.remove(obs.mesh);
                obstacles.splice(i, 1);
            }
        }

        // Speed rings
        for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            it.mesh.position.z += effSpeed * dt;
            it.mesh.rotation.z += dt * 3.5;

            if (Math.abs(it.mesh.position.z) < 1.1 && angularDist(it.angle, playerAngle) < 0.56) {
                boosts++;
                ringCombo++;
                boostTimer = 1.6;
                distance += 35;
                if (!hasShield && ringCombo % 3 === 0) {
                    hasShield = true;
                    feedEl.textContent = 'SHIELD RECHARGED! +35m Boost!';
                } else {
                    feedEl.textContent = 'HYPER RING! +35m & Speed Surge!';
                }
                spawnBurst(it.mesh.position, 0x10b981, 10);
                playSfx('ring');
                scene.remove(it.mesh);
                items.splice(i, 1);
                continue;
            }

            if (it.mesh.position.z > 14) {
                scene.remove(it.mesh);
                items.splice(i, 1);
            }
        }

        distance += effSpeed * dt * 0.55;
        saveBest();
        updateHUD();
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
        camera.position.x = (Math.random() - 0.5) * 0.35;
        camera.position.y = (Math.random() - 0.5) * 0.35;
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
        rotateDir = 0; window.rotateDir = 0;
        if (gameActive) { pauseGame(); resumeBtn.focus({ preventScroll: true }); }
    }
    window.addEventListener('blur', suspend);
    window.addEventListener('pagehide', suspend);
    document.addEventListener('visibilitychange', function () { if (document.hidden) suspend(); });
})();
