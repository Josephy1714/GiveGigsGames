// The Pipeline Mountain - 3D Vertical Climber with Biomes, Platform Variety & Jetpacks
'use strict';

let scene, camera, renderer, clock;
let player, starPoints;
let platforms = [];
let items = [];
let drones = [];
let particles = [];

let altitude = 0;
let medals = 0;
let medalStreak = 0;
let gameActive = false;
let isMuted = false;

let playerY = 0;
let playerX = 0;
let velocityY = 13;
const gravity = -22;
const jumpForce = 13;
const horizontalSpeed = 9.2;
let moveDirection = 0;
window.moveDirection = 0;
let jetpackTimer = 0;
let spinTimer = 0;
let squashY = 1.0;

const SAVE_KEY = 'the-pipeline-mountain:best';
let bestAlt = readBest();

const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');
const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');
const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');
const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');
const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');
const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');

const zoneSpan = document.getElementById('game-zone');
const altSpan = document.getElementById('game-alt');
const medalsSpan = document.getElementById('game-medals');
const bestSpan = document.getElementById('game-best');
const feedEl = document.getElementById('mountain-feed');
const endDesc = document.getElementById('end-desc');
const finalAltSpan = document.getElementById('final-alt-val');
const finalMedalsSpan = document.getElementById('final-medals-val');

window.gameState = { title: 'the-pipeline-mountain', get active() { return gameActive; } };
window.game = window.gameState;

let platGeo, medalGeo, jetGeo, droneGeo, sparkGeo;
let systemMat, springMat, movingMat, fragileMat, medalMat, jetMat, droneMat;

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
        if (kind === 'bounce') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(580, now + 0.09);
            gain.gain.setValueAtTime(0.07, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (kind === 'spring') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(1060, now + 0.18);
            gain.gain.setValueAtTime(0.11, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
        } else if (kind === 'crumble') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(240, now);
            osc.frequency.linearRampToValueAtTime(110, now + 0.11);
            gain.gain.setValueAtTime(0.07, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.start(now); osc.stop(now + 0.12);
        } else if (kind === 'medal') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(660, now);
            osc.frequency.setValueAtTime(880, now + 0.05);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.start(now); osc.stop(now + 0.16);
        } else if (kind === 'jetpack') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(240, now);
            osc.frequency.exponentialRampToValueAtTime(760, now + 0.26);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            osc.start(now); osc.stop(now + 0.28);
        } else if (kind === 'over') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(210, now);
            osc.frequency.exponentialRampToValueAtTime(55, now + 0.38);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now); osc.stop(now + 0.4);
        }
    } catch (_) {}
}

function readBest() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return 0;
        const d = JSON.parse(raw);
        return Number.isFinite(d?.alt) ? d.alt : (Number(raw) || 0);
    } catch (_) { return 0; }
}
function saveBest() {
    const a = Math.floor(altitude);
    if (a > bestAlt) bestAlt = a;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ alt: bestAlt, medals: medals })); } catch (_) {}
    if (bestSpan) bestSpan.textContent = bestAlt + 'm';
}

function getBiomeInfo(alt) {
    if (alt >= 200) return { name: 'Orbit Peak', bg: 0x090518 };
    if (alt >= 120) return { name: 'Stratosphere', bg: 0x16092e };
    if (alt >= 50) return { name: 'Cloud Deck', bg: 0x0b1f3a };
    return { name: 'Basecamp', bg: 0x040814 };
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
    scene.background = new THREE.Color(0x040814);
    scene.fog = new THREE.FogExp2(0x040814, 0.018);

    camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 120);
    camera.position.set(0, 5, 12.6);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    clock = new THREE.Clock();

    scene.add(new THREE.AmbientLight(0xe0f2fe, 0.55));
    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.05);
    dirLight.position.set(5, 20, 8);
    scene.add(dirLight);

    // Shared geometries & materials (zero leak across long runs!)
    platGeo = new THREE.BoxGeometry(2.85, 0.42, 1.8);
    medalGeo = new THREE.TorusGeometry(0.34, 0.09, 8, 16);
    jetGeo = new THREE.ConeGeometry(0.32, 0.72, 6);
    droneGeo = new THREE.OctahedronGeometry(0.48, 0);
    sparkGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);

    systemMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0c4a6e, roughness: 0.45 });
    springMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x065f46, roughness: 0.4 });
    movingMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0e7490, roughness: 0.35 });
    fragileMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d, roughness: 0.6 });
    medalMat = new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0x713f12, shininess: 100 });
    jetMat = new THREE.MeshPhongMaterial({ color: 0xf97316, emissive: 0x9a3412, shininess: 110 });
    droneMat = new THREE.MeshPhongMaterial({ color: 0xe879f9, emissive: 0x701a75, shininess: 100 });

    buildStarfield();
    createPlayer();
    generatePlatforms(0, 26);
    installSessionControls();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    startBtn.addEventListener('click', function () { initAudio(); resetGame(); });
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const setLeft = function (e) { e.preventDefault(); moveDirection = -1; };
    const setRight = function (e) { e.preventDefault(); moveDirection = 1; };
    const clearMove = function (e) { e.preventDefault(); moveDirection = 0; };

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

function buildStarfield() {
    const count = 260;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 26;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 24;
        pos[i * 3 + 2] = -5 - Math.random() * 14;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starPoints = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xe0f2fe, size: 0.1, transparent: true, opacity: 0.72 }));
    scene.add(starPoints);
}

function createPlayer() {
    player = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, emissive: 0x1e3a8a, shininess: 90 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.78, 0.82), bodyMat);
    body.position.y = 0.4;
    player.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), bodyMat);
    head.position.set(0, 1.0, 0);
    player.add(head);

    const earGeo = new THREE.ConeGeometry(0.13, 0.34, 4);
    const earL = new THREE.Mesh(earGeo, bodyMat); earL.position.set(-0.24, 1.42, 0);
    const earR = earL.clone(); earR.position.x = 0.24;
    player.add(earL);
    player.add(earR);

    const eyeGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.15, 1.06, 0.36);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.15;
    player.add(eyeL);
    player.add(eyeR);

    scene.add(player);
}

function clearDynamic() {
    for (const p of platforms) scene.remove(p.mesh);
    for (const it of items) scene.remove(it.mesh);
    for (const d of drones) scene.remove(d.mesh);
    for (const sp of particles) { scene.remove(sp.mesh); sp.mesh.material.dispose(); }
    platforms = []; items = []; drones = []; particles = [];
}

function generatePlatforms(startY, count) {
    let previousX = platforms.length ? platforms[platforms.length - 1].mesh.position.x : 0;
    for (let i = 0; i < count; i++) {
        const y = startY + i * 2.55 + 2.0;
        const x = !platforms.length && i === 0 ? 0 : Math.max(-4.3, Math.min(4.3, previousX + (Math.random() - 0.5) * 5.2));
        previousX = x;

        let type = 'system', mat = systemMat, vx = 0;
        const roll = Math.random();
        if (y > 20 && roll < 0.2) {
            type = 'moving'; mat = movingMat;
            vx = (Math.random() < 0.5 ? -1 : 1) * (1.8 + Math.min(2.0, y * 0.01));
        } else if (roll < 0.34) {
            type = 'spring'; mat = springMat;
        } else if (i > 1 && roll < 0.5) {
            type = 'fragile'; mat = fragileMat;
        }

        const mesh = new THREE.Mesh(platGeo, mat);
        mesh.position.set(x, y, 0);
        scene.add(mesh);
        platforms.push({ mesh: mesh, type: type, vx: vx, broken: false });

        // Medal or Rocket Jetpack pickup
        if (Math.random() < 0.1 && y > 18) {
            const jet = new THREE.Mesh(jetGeo, jetMat);
            jet.position.set(x, y + 0.85, 0);
            scene.add(jet);
            items.push({ mesh: jet, kind: 'jetpack' });
        } else if (Math.random() < 0.52) {
            const med = new THREE.Mesh(medalGeo, medalMat);
            med.position.set(x, y + 0.8, 0);
            scene.add(med);
            items.push({ mesh: med, kind: 'medal' });
        }

        // Bug drone hazard above 40m
        if (y > 40 && Math.random() < 0.18) {
            const dMesh = new THREE.Mesh(droneGeo, droneMat);
            dMesh.position.set((Math.random() - 0.5) * 8, y + 1.35, 0);
            scene.add(dMesh);
            drones.push({ mesh: dMesh, vx: (Math.random() < 0.5 ? -1 : 1) * 2.2 });
        }
    }
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
            vz: (Math.random() - 0.5) * 2.5,
            life: 0.42
        });
    }
}

function updateHUD() {
    const biome = getBiomeInfo(altitude);
    zoneSpan.textContent = biome.name;
    altSpan.textContent = Math.floor(altitude) + 'm';
    medalsSpan.textContent = String(medals);
    bestSpan.textContent = bestAlt + 'm';
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
    playerX = 0;
    playerY = 0;
    velocityY = jumpForce;
    moveDirection = 0;
    window.moveDirection = 0;
    jetpackTimer = 0;
    spinTimer = 0;
    squashY = 1.0;
    altitude = 0;
    medals = 0;
    medalStreak = 0;
    player.position.set(0, 0, 0);
    player.rotation.set(0, 0, 0);
    camera.position.y = 3;
    scene.background.setHex(0x040814);
    scene.fog.color.setHex(0x040814);
    generatePlatforms(0, 26);
    feedEl.textContent = 'Green Pads = Super Jump · Red Spreadsheets crumble · Stomp Bug Drones from above!';
    updateHUD();
    startGame();
}

function endGame(reason) {
    gameActive = false;
    saveBest();
    endDesc.textContent = (reason || 'Fell off the climb!') + ' Best Altitude: ' + bestAlt + 'm';
    finalAltSpan.textContent = Math.floor(altitude) + 'm';
    finalMedalsSpan.textContent = String(medals);
    gameOverScreen.classList.remove('hidden');
    playSfx('over');
}

function onKeyDown(e) {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.repeat && ['Escape', 'KeyP'].includes(e.code)) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveDirection = -1;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') moveDirection = 1;
    else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameActive) pauseGame();
        else if (!pauseScreen.classList.contains('hidden')) resumeGame();
    }
}

function onKeyUp(e) {
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && moveDirection === -1) moveDirection = 0;
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && moveDirection === 1) moveDirection = 0;
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

    if (gameActive) {
        const effDir = moveDirection || window.moveDirection || 0;
        playerX += effDir * horizontalSpeed * dt;
        // Seamless horizontal wrap-around
        if (playerX > 5.6) playerX = -5.5;
        else if (playerX < -5.6) playerX = 5.5;

        const prevY = playerY;
        if (jetpackTimer > 0) {
            jetpackTimer -= dt;
            velocityY = 20.5;
            playerY += velocityY * dt;
            if (Math.random() < 0.65) spawnBurst(new THREE.Vector3(playerX, playerY, 0), 0xf97316, 1);
        } else {
            playerY += velocityY * dt;
            velocityY += gravity * dt;
        }

        // Moving platforms
        for (const p of platforms) {
            if (p.vx) {
                p.mesh.position.x += p.vx * dt;
                if (p.mesh.position.x > 4.4 || p.mesh.position.x < -4.4) p.vx *= -1;
            }
        }

        // Platform landing check
        if (velocityY < 0 && jetpackTimer <= 0) {
            for (let i = platforms.length - 1; i >= 0; i--) {
                const plat = platforms[i];
                if (plat.broken) continue;
                const top = plat.mesh.position.y + 0.24;
                if (prevY >= top - 0.12 && playerY <= top && Math.abs(playerX - plat.mesh.position.x) <= 1.85) {
                    playerY = top;
                    squashY = 0.72;
                    if (plat.type === 'spring') {
                        velocityY = jumpForce * 1.75;
                        spinTimer = 0.55;
                        spawnBurst(plat.mesh.position, 0x34d399, 10);
                        playSfx('spring');
                        feedEl.textContent = 'SPRING PAD! Super Boost!';
                    } else if (plat.type === 'fragile') {
                        velocityY = jumpForce;
                        plat.broken = true;
                        spawnBurst(plat.mesh.position, 0xef4444, 9);
                        scene.remove(plat.mesh);
                        platforms.splice(i, 1);
                        playSfx('crumble');
                    } else {
                        velocityY = jumpForce;
                        playSfx('bounce');
                    }
                    break;
                }
            }
        }

        squashY += (1 - squashY) * 0.2;
        if (spinTimer > 0) {
            spinTimer -= dt;
            player.rotation.y += dt * 12;
        } else {
            player.rotation.y *= 0.85;
        }
        player.scale.set(1 / Math.sqrt(squashY), squashY, 1 / Math.sqrt(squashY));
        player.position.set(playerX, playerY, 0);

        // Collectibles (Medals & Rocket Jetpacks)
        for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            it.mesh.rotation.y += dt * 2.6;
            if (Math.abs(it.mesh.position.x - playerX) < 1.0 && Math.abs(it.mesh.position.y - (playerY + 0.5)) < 1.0) {
                if (it.kind === 'jetpack') {
                    jetpackTimer = 2.2;
                    spinTimer = 0.8;
                    playSfx('jetpack');
                    spawnBurst(it.mesh.position, 0xf97316, 12);
                    feedEl.textContent = 'ROCKET JETPACK! Blasting upward!';
                } else {
                    medalStreak++;
                    medals += medalStreak >= 3 ? 2 : 1;
                    playSfx('medal');
                    spawnBurst(it.mesh.position, 0xfacc15, 7);
                }
                scene.remove(it.mesh);
                items.splice(i, 1);
            }
        }

        // Bug drones
        for (let i = drones.length - 1; i >= 0; i--) {
            const d = drones[i];
            d.mesh.position.x += d.vx * dt;
            d.mesh.rotation.y += dt * 3;
            if (d.mesh.position.x > 4.6 || d.mesh.position.x < -4.6) d.vx *= -1;
            const dx = Math.abs(d.mesh.position.x - playerX);
            const dy = (playerY + 0.5) - d.mesh.position.y;
            if (dx < 0.92 && Math.abs(dy) < 0.88) {
                if (velocityY < 0 || jetpackTimer > 0) {
                    // Stomp!
                    velocityY = jumpForce * 1.45;
                    medals += 3;
                    spinTimer = 0.45;
                    spawnBurst(d.mesh.position, 0xe879f9, 14);
                    scene.remove(d.mesh);
                    drones.splice(i, 1);
                    playSfx('spring');
                    feedEl.textContent = 'BUG STOMPED! +3 Medals & Mega Bounce!';
                } else {
                    spawnBurst(player.position, 0xef4444, 14);
                    endGame('Crashed into a Bug Drone!');
                    return;
                }
            }
        }

        // Generate ahead & CULL below camera (fixes memory leak!)
        const highestPlatform = platforms[platforms.length - 1];
        if (highestPlatform && highestPlatform.mesh.position.y - playerY < 26) {
            generatePlatforms(highestPlatform.mesh.position.y, 14);
        }
        const cullY = camera.position.y - 12;
        for (let i = platforms.length - 1; i >= 0; i--) {
            if (platforms[i].mesh.position.y < cullY) { scene.remove(platforms[i].mesh); platforms.splice(i, 1); }
        }
        for (let i = items.length - 1; i >= 0; i--) {
            if (items[i].mesh.position.y < cullY) { scene.remove(items[i].mesh); items.splice(i, 1); }
        }
        for (let i = drones.length - 1; i >= 0; i--) {
            if (drones[i].mesh.position.y < cullY) { scene.remove(drones[i].mesh); drones.splice(i, 1); }
        }

        if (playerY > altitude) {
            altitude = playerY;
            saveBest();
        }

        // Smooth camera follow & biome sky transition
        const targetCamY = Math.max(camera.position.y, playerY + 2.2);
        camera.position.y += (targetCamY - camera.position.y) * 0.14;
        if (starPoints) starPoints.position.y = camera.position.y;

        const targetBg = new THREE.Color(getBiomeInfo(altitude).bg);
        scene.background.lerp(targetBg, 0.03);
        scene.fog.color.copy(scene.background);

        if (playerY < camera.position.y - 8.5) {
            endGame('Fell below the pipeline deck!');
            return;
        }
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
        moveDirection = 0; window.moveDirection = 0;
        if (gameActive) { pauseGame(); resumeBtn.focus({ preventScroll: true }); }
    }
    window.addEventListener('blur', suspend);
    window.addEventListener('pagehide', suspend);
    document.addEventListener('visibilitychange', function () { if (document.hidden) suspend(); });
})();
