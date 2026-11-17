
function basicMat(color, opacity = 1) {
    const k = color + '|' + opacity;
    if (!matCache.has(k)) {
        matCache.set(k, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity }));
    }
    return matCache.get(k);
}

function acquireParticle(color, size, opacity = 1) {
    let p = particlePool.pop();
    if (!p) p = { mesh: new THREE.Mesh(Assets.box, basicMat(color, opacity)), vel: new THREE.Vector3() };
    p.mesh.material = basicMat(color, opacity);
    p.mesh.scale.set(size, size, size);
    p.mesh.visible = true;
    p.mesh.userData.noScale = false;
    return p;
}


function showFatal(msg) {
    const c = document.getElementById('game-container');
    if (!c) return;
    const el = document.createElement('div');
    el.className = 'fatal-overlay';
    el.textContent = msg;
    c.appendChild(el);
}


function $(id) { return document.getElementById(id); }


function applyMuteUI() {
    const b = $('TEMPLATE-4weird-mute-btn');
    if (!b) return;
    b.textContent = sfx.muted ? '🔇' : '🔊';
    b.setAttribute('aria-pressed', sfx.muted ? 'true' : 'false');
}


function setThrust(active) {
    if (active && !thrustActive && gameActive && !isPaused) {
        tutorialCycles += (lastThrust === false ? 0.5 : 0);
    }
    if (!active && thrustActive) tutorialCycles += 0.5;
    lastThrust = thrustActive = active;
    if (active) sfx.playThrust(true); else sfx.stopThrust();
}


// ----- Mobile controls: gravity slider + tilt toggle + dash -----
function triggerDash() {
    if (!gameActive || isPaused || dying) return false;
    if (dashCD > 0) return false;
    dashT = DASH_TIME; dashCD = DASH_CD_MAX;
    sfx.init(); sfx.playPowerUp();
    try { spawnShockwave(satellite.position); spawnExplosion(satellite.position, 0xfacc15, 10); } catch {}
    const b = $('od-dash-btn');
    if (b) { b.classList.add('od-cooling'); b.textContent = '⏳ ' + DASH_CD_MAX + 's'; }
    if (window.navigator && navigator.vibrate) { try { navigator.vibrate(25); } catch {} }
    return true;
}


function makeRingTexture() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 8;
    const g = c.getContext('2d'); g.clearRect(0, 0, 256, 8);
    for (let i = 0; i < 256; i++) {
        const a = Math.random();
        g.fillStyle = 'rgba(200,170,255,' + (0.05 + a * 0.5).toFixed(2) + ')';
        g.fillRect(i, 0, 1, 8);
    }
    g.clearRect(60, 0, 8, 8); g.clearRect(180, 0, 14, 8);
    return new THREE.CanvasTexture(c);
}


function makeNebulaTexture(inner, outer) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, inner); grd.addColorStop(0.4, outer); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
}


function addNebula(inner, outer, x, y, z, scale, opacity, drift) {
    const tex = makeNebulaTexture(inner, outer);
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    m.fog = false;
    const s = new THREE.Sprite(m);
    s.position.set(x, y, z); s.scale.set(scale, scale, 1);
    s.userData.drift = drift;
    scene.add(s); nebulas.push(s);
}


function makeStarLayer(count, size, color, opacity, zBase, spread, speed) {
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * spread;
        pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
        pos[i * 3 + 2] = zBase - Math.random() * 120;
        const v = 0.6 + Math.random() * 0.4;
        col[i * 3] = c.r * v; col[i * 3 + 1] = c.g * v; col[i * 3 + 2] = c.b * v;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    mat.fog = false;
    const pts = new THREE.Points(geom, mat);
    pts.userData.speed = speed;
    pts.userData.baseOpacity = opacity;
    scene.add(pts); starLayers.push(pts);
}


function applyShipSelection(id, rebuild = true) {
    if (!SHIPS[id]) return;
    selectedShip = id;
    store.set('orbitaldrift_ship', id);
    maxIntegrity = SHIPS[id].maxIntegrity;
    document.querySelectorAll('.TEMPLATE-4weird-ship-card').forEach((el) => {
        const on = el.dataset.ship === id;
        el.classList.toggle('selected', on);
        el.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    if (rebuild && scene && satellite) {
        const pos = satellite.position.clone();
        const rotZ = satellite.rotation.z;
        scene.remove(satellite);
        satellite = buildSatelliteMesh(id);
        satellite.position.copy(pos);
        satellite.rotation.z = rotZ;
        scene.add(satellite);
    }
    if (!gameActive) { integrity = maxIntegrity; updateShieldUI(); }
}


function createOrbitTrack(radius, color, opacity) {
    const geom = new THREE.RingGeometry(radius - 0.4, radius + 0.4, 64);
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity });
    const track = new THREE.Mesh(geom, mat);
    scene.add(track);
    orbits.push(track);
}


// ---------- HUD helpers ----------
function hudPop(id) {
    const e = $(id);
    if (!e) return;
    e.classList.remove('hud-pop'); void e.offsetWidth; e.classList.add('hud-pop');
}

function fireHitFlash() {
    const f = $('hit-flash');
    if (!f) return;
    f.classList.remove('fire'); void f.offsetWidth; f.classList.add('fire');
}

function scorePopup(worldPos, text, cls) {
    try {
        const v = worldPos.clone().project(camera);
        const rect = container.getBoundingClientRect();
        const x = (v.x * 0.5 + 0.5) * rect.width, y = (-v.y * 0.5 + 0.5) * rect.height;
        const layer = $('popup-layer');
        if (!layer) return;
        const el = popupPool.pop() || document.createElement('div');
        el.className = 'score-popup ' + (cls || '');
        el.textContent = text;
        el.style.left = x + 'px'; el.style.top = y + 'px';
        layer.appendChild(el);
        void el.offsetWidth; el.classList.add('rise');
        setTimeout(() => { el.classList.remove('rise'); if (el.parentNode) el.parentNode.removeChild(el); popupPool.push(el); }, 900);
    } catch {}
}

function showWaveBanner(title, sub) {
    const b = $('TEMPLATE-4weird-wave-banner');
    if (!b) return;
    $('TEMPLATE-4weird-wave-title').textContent = title;
    $('TEMPLATE-4weird-wave-sub').textContent = sub;
    b.classList.remove('hidden');
    const clone = b.cloneNode(true);
    b.parentNode.replaceChild(clone, b);
    void clone.offsetWidth;
    setTimeout(() => clone.classList.add('hidden'), 2400);
}


// Persistent hangar: the hub you return to after every death (via the
// score screen) or when quitting from pause. Never auto-launches.
function showHangar(source) {
    gameActive = false;
    isPaused = false;
    thrustActive = false;
    sfx.stopThrust(); sfx.stopMusic();
    $('game-hud').classList.add('hidden');
    $('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    $('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
    const t = $('TEMPLATE-4weird-tutorial-hint');
    if (t) t.classList.add('hidden');
    const v = $('vignette'); if (v) v.classList.remove('low-hp');
    integrity = maxIntegrity;
    updateShieldUI();
    updateHangarSummary();
    $('TEMPLATE-4weird-start-screen').classList.remove('hidden');
    const launch = $('TEMPLATE-4weird-start-btn');
    if (launch) launch.focus({ preventScroll: true });
    void source;
}


function zoneMult(pos) {
    const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
    if (r < 75) return 1.5;
    if (r > 155) return 2.0;
    return 1.0;
}


function phaseMix() {
    if (phase === 1) return { stalker: 0, splitter: 0.08, darter: 0, weaver: 0.08 };
    if (phase === 2) return { stalker: 0.15, splitter: 0.10, darter: 0, weaver: 0.12 };
    if (phase === 3) return { stalker: 0.20, splitter: 0.15, darter: 0.10, weaver: 0.15 };
    return { stalker: 0.25, splitter: 0.20, darter: 0.20, weaver: 0.15 };
}


// Spawners
function pickZoneBiasedRadius() {
    const r = Math.random();
    if (r < 0.25) return 50 + Math.random() * 25;       // inner burn
    if (r < 0.5) return 155 + Math.random() * 25;       // outer void
    return MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
}


function spawnStardust() {
    const radius = pickZoneBiasedRadius();
    const angle = Math.random() * Math.PI * 2;
    const mesh = new THREE.Mesh(Assets.stardustGeo, Assets.stardustMat);
    mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    scene.add(mesh);
    collectibles.push({ mesh, radius, angle, pulseSpeed: 3 + Math.random() * 3, bornAt: elapsedSec, value: 10 });
}


function spawnDebris() {
    const radius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
    const angle = Math.random() * Math.PI * 2;
    const w = phaseMix();
    const roll = Math.random();
    let kind = 'asteroid';
    if (roll < w.darter) kind = 'darter';
    else if (roll < w.darter + w.stalker) kind = 'stalker';
    else if (roll < w.darter + w.stalker + w.splitter) kind = 'splitter';
    else if (roll < w.darter + w.stalker + w.splitter + w.weaver) kind = 'weaver';
    else kind = Math.random() > 0.7 ? 'comet' : 'asteroid';

    let mesh, speed, damage;
    if (kind === 'stalker') {
        mesh = new THREE.Mesh(Assets.stalkerGeo, new THREE.MeshPhongMaterial({ color: 0xfb923c, emissive: 0x9a3412, flatShading: true }));
        speed = 0.008 + Math.random() * 0.004; damage = 20;
    } else if (kind === 'weaver') {
        mesh = new THREE.Mesh(Assets.weaverGeo, new THREE.MeshPhongMaterial({ color: 0x2dd4bf, emissive: 0x0f766e, flatShading: true }));
        speed = 0.012 + Math.random() * 0.012; damage = 20;
    } else if (kind === 'darter') {
        mesh = new THREE.Mesh(Assets.darterGeo, new THREE.MeshPhongMaterial({ color: 0xe0f2fe, emissive: 0x0284c7 }));
        speed = 0.01 + Math.random() * 0.008; damage = 30;
    } else if (kind === 'splitter') {
        mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(5.5, 0), new THREE.MeshPhongMaterial({ color: 0xa855f7, emissive: 0x581c87, flatShading: true }));
        mesh.scale.setScalar(1);
        speed = 0.008; damage = 25;
    } else if (kind === 'comet') {
        mesh = new THREE.Mesh(Assets.cometGeo, new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x0891b2 }));
        speed = (0.035 + Math.random() * 0.025) * (Math.random() > 0.5 ? 1 : -1) * (phase >= 2 ? 1.15 : 1);
        damage = 25;
    } else {
        mesh = new THREE.Mesh(Assets.asteroidGeo, new THREE.MeshPhongMaterial({ color: 0xec4899, emissive: 0x9d174d, flatShading: true }));
        mesh.scale.setScalar(0.85 + Math.random() * 0.5);
        speed = (0.01 + Math.random() * 0.015) * (Math.random() > 0.5 ? 1 : -1);
        damage = 25;
    }
    mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    scene.add(mesh);
    debris.push({
        mesh, radius, angle, speed, kind, damage,
        isComet: kind === 'comet' || kind === 'darter',
        t: 0, baseRadius: radius, phase: Math.random() * Math.PI * 2,
        state: 'drift', stateT: 0, lockedRadius: radius, radialVel: 0,
        lastGraze: -10,
        rotSpeed: { x: Math.random() * 0.04, y: Math.random() * 0.04, z: Math.random() * 0.04 }
    });
}


function spawnShards(pos, n = 3) {
    for (let i = 0; i < n; i++) {
        const angle = Math.atan2(pos.y, pos.x) + (Math.random() - 0.5);
        const radius = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, Math.sqrt(pos.x * pos.x + pos.y * pos.y)));
        const mesh = new THREE.Mesh(Assets.shardGeo, new THREE.MeshPhongMaterial({ color: 0xc084fc, emissive: 0x6b21a8, flatShading: true }));
        mesh.position.copy(pos);
        scene.add(mesh);
        debris.push({
            mesh, radius, angle,
            speed: (0.03 + Math.random() * 0.02) * (Math.random() > 0.5 ? 1 : -1),
            kind: 'shard', damage: 10, isComet: false, t: 0, baseRadius: radius,
            phase: Math.random() * 6, state: 'drift', stateT: 0, lockedRadius: radius, radialVel: 0,
            lastGraze: -10, bornAt: elapsedSec,
            rotSpeed: { x: 0.05, y: 0.05, z: 0.05 }
        });
    }
}


function spawnPowerup(forceKind) {
    const radius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
    const angle = Math.random() * Math.PI * 2;
    let kind = forceKind;
    if (!kind) {
        const r = Math.random();
        if (r < 0.25) kind = 'magnet';
        else if (r < 0.45) kind = 'shield';
        else if (r < 0.67) kind = 'overdrive';
        else if (r < 0.85) kind = 'cloak';
        else kind = 'chrono';
    }
    let mesh;
    if (kind === 'magnet') mesh = new THREE.Mesh(Assets.prismGeo, new THREE.MeshPhongMaterial({ color: 0x06b6d4, emissive: 0x0891b2, shininess: 100, wireframe: true }));
    else if (kind === 'shield') mesh = new THREE.Mesh(Assets.orbGeo, new THREE.MeshPhongMaterial({ color: 0x10b981, emissive: 0x047857, shininess: 100, wireframe: true }));
    else if (kind === 'overdrive') mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(3.4, 0), new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0xa16207, shininess: 100, wireframe: true }));
    else if (kind === 'cloak') mesh = new THREE.Mesh(Assets.torusGeo, new THREE.MeshPhongMaterial({ color: 0xf8fafc, emissive: 0x64748b, shininess: 100, wireframe: true }));
    else mesh = new THREE.Mesh(Assets.icoGeo, new THREE.MeshPhongMaterial({ color: 0x60a5fa, emissive: 0x1d4ed8, shininess: 100, wireframe: true }));
    mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    scene.add(mesh);
    powerups.push({ mesh, radius, angle, kind });
}


// Particle System (pooled boxes)
function spawnExplosion(pos, color, count = 15) {
    for (let i = 0; i < count; i++) {
        if (particles.length > 280) {
            const old = particles.shift();
            scene.remove(old.mesh); particlePool.push(old);
        }
        const p = acquireParticle(color, 1.2, 1);
        p.mesh.position.copy(pos);
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3.5;
        p.vel.set(Math.cos(angle) * speed, Math.sin(angle) * speed, (Math.random() - 0.5) * speed);
        p.life = 1.0; p.decay = 0.025 + Math.random() * 0.025;
        scene.add(p.mesh);
        particles.push(p);
    }
}


function spawnEngineTrail(pos) {
    if (particles.length > 280) return;
    const color = cloakActive ? 0xf8fafc : (magnetActive ? 0xfacc15 : (overdriveActive ? 0xfb923c : ship().trail));
    const p = acquireParticle(color, 0.8, 0.8);
    const offsetAngle = satelliteAngle + Math.PI;
    p.mesh.position.set(pos.x + Math.cos(offsetAngle) * 4, pos.y + Math.sin(offsetAngle) * 4, pos.z);
    p.vel.set((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4);
    p.life = 0.8; p.decay = 0.05;
    scene.add(p.mesh);
    particles.push(p);
}


function showMagnetBeam(from, to) {
    try {
        const len = from.distanceTo(to);
        if (len > 60 || len < 1) return;
        const g = new THREE.CylinderGeometry(0.35, 1.4, len, 6, 1, true);
        g.translate(0, len / 2, 0);
        const m = new THREE.Mesh(g, beamMat);
        m.position.copy(from);
        m.lookAt(to); m.rotateX(Math.PI / 2);
        m.userData.noScale = true;
        scene.add(m);
        particles.push({ mesh: m, vel: new THREE.Vector3(), life: 0.18, decay: 0.18, beam: true });
    } catch {}
}


function spawnShockwave(pos) {
    const m = new THREE.Mesh(
        new THREE.RingGeometry(1, 3, 64),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    m.position.copy(pos);
    m.userData.noScale = true;
    scene.add(m);
    shockwaves.push({ mesh: m, t: 0 });
}
