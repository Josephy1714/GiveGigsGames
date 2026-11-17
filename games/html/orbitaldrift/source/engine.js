

function initUI() {
    highScore = parseInt(store.get('orbitaldrift_high_score', '0') || '0', 10) || 0;
    bestCombo = parseFloat(store.get('orbitaldrift_best_combo', '1') || '1') || 1;
    bestTime = parseFloat(store.get('orbitaldrift_best_time', '0') || '0') || 0;
    const hs = $('TEMPLATE-4weird-high-score');
    if (hs) hs.textContent = highScore + (bestTime > 0 ? '  ·  best ' + bestTime.toFixed(1) + 's · ×' + bestCombo.toFixed(1) : '');

    const startBtn = $('TEMPLATE-4weird-start-btn');
    const playAgainBtn = $('TEMPLATE-4weird-play-again-btn');
    const resumeBtn = $('TEMPLATE-4weird-resume-btn');
    const restartBtn = $('TEMPLATE-4weird-restart-btn');
    if (startBtn) startBtn.addEventListener('click', startGame);
    if (playAgainBtn) playAgainBtn.addEventListener('click', startGame);
    if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);
    if (restartBtn) restartBtn.addEventListener('click', restartGame);
    const hangarBtn = $('TEMPLATE-4weird-hangar-btn');
    const quitBtn = $('TEMPLATE-4weird-quit-btn');
    if (hangarBtn) hangarBtn.addEventListener('click', () => showHangar('score'));
    if (quitBtn) quitBtn.addEventListener('click', () => showHangar('pause'));
    updateHangarSummary();

    document.querySelectorAll('.TEMPLATE-4weird-ship-card').forEach((el) => {
        el.addEventListener('click', () => { sfx.init(); applyShipSelection(el.dataset.ship, true); });
    });
    applyShipSelection(selectedShip, false);

    const muteBtn = $('TEMPLATE-4weird-mute-btn');
    const pauseBtn = $('TEMPLATE-4weird-pause-btn');
    if (muteBtn) muteBtn.addEventListener('click', (e) => { e.stopPropagation(); sfx.init(); const m = sfx.toggleMute(); applyMuteUI(); });
    if (pauseBtn) pauseBtn.addEventListener('click', (e) => { e.stopPropagation(); if (gameActive) togglePause(); });

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointerdown', () => sfx.init(), { once: true });
    // Bug sweep: browsers suspend AudioContext when the tab hides; resume on
    // every gesture, not just the first (sfx.init() resumes a live context).
    window.addEventListener('pointerdown', () => {
        if (sfx.ctx && sfx.ctx.state === 'suspended') sfx.ctx.resume().catch(() => {});
    });
    window.addEventListener('keydown', () => {
        if (sfx.ctx && sfx.ctx.state === 'suspended') sfx.ctx.resume().catch(() => {});
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && sfx.ctx && sfx.ctx.state === 'suspended') sfx.ctx.resume().catch(() => {});
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && gameActive && !isPaused) togglePause();
    });
    window.addEventListener('blur', () => { if (gameActive && !isPaused) togglePause(); });

    container = $('game-container');
    const canvas = $('TEMPLATE-4weird-gameCanvas');
    const isTouchUI = (e) => !!(e.target && e.target.closest && e.target.closest('#od-mobile-controls, button, input'));
    const pressOn = (e) => {
        if (isTouchUI(e)) return;
        if (gameActive && !isPaused) { sfx.init(); setThrust(true); }
        // drag-orbit steering: capture start point for drag-anywhere control
        try {
            const t = e.touches ? e.touches[0] : e;
            const cx = t ? t.clientX : 0, cy = t ? t.clientY : 0;
            dragSteer.active = true;
            dragSteer.id = (e.changedTouches && e.changedTouches[0] && e.changedTouches[0].identifier) ?? 'mouse';
            dragSteer.startX = dragSteer.lastX = cx; dragSteer.startY = dragSteer.lastY = cy;
            dragSteer.startRadius = targetRadius; dragSteer.moved = 0; dragSteer.t0 = performance.now();
        } catch {}
    };
    const pressMove = (e) => {
        if (!dragSteer.active || !gameActive || isPaused) return;
        if (isTouchUI(e)) return;
        try {
            const t = e.touches ? (Array.from(e.touches).find((x) => x.identifier === dragSteer.id) || e.touches[0]) : e;
            if (!t) return;
            const dx = t.clientX - dragSteer.lastX, dy = t.clientY - dragSteer.lastY;
            dragSteer.moved += Math.abs(dx) + Math.abs(dy);
            // vertical drag sets orbit directly (up = thrust out, down = brake in)
            targetRadius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, targetRadius - dy * 0.55));
            // horizontal drag nudges orbital angle for true steering feel
            satelliteAngle += dx * 0.0022;
            dragSteer.lastX = t.clientX; dragSteer.lastY = t.clientY;
            if (e.cancelable && e.touches) e.preventDefault();
        } catch {}
    };
    const pressOff = (e) => {
        // tap-to-dash: quick tap with almost no drag triggers dash-collect
        try {
            if (dragSteer.active && gameActive && !isPaused) {
                const dt = performance.now() - dragSteer.t0;
                if (dt < 250 && dragSteer.moved < 14 && !(e && e.target && e.target.closest && e.target.closest('#od-mobile-controls'))) {
                    triggerDash();
                }
            }
        } catch {}
        dragSteer.active = false; dragSteer.id = null;
        setThrust(false);
    };
    if (container) {
        container.addEventListener('mousedown', pressOn);
        window.addEventListener('mouseup', pressOff);
        window.addEventListener('mousemove', pressMove);
        container.addEventListener('touchstart', (e) => {
            if (isTouchUI(e)) return;
            if (gameActive && !isPaused) { e.preventDefault(); sfx.init(); setThrust(true); }
            pressOn(e);
        }, { passive: false });
        container.addEventListener('touchmove', pressMove, { passive: false });
        container.addEventListener('touchend', (e) => { if (!isTouchUI(e)) e.preventDefault(); pressOff(e); }, { passive: false });
        container.addEventListener('touchcancel', (e) => { if (!isTouchUI(e)) e.preventDefault(); dragSteer.active = false; setThrust(false); }, { passive: false });
        // hard block on scroll/zoom gestures over the arena
        container.addEventListener('gesturestart', (e) => e.preventDefault());
        container.addEventListener('dblclick', (e) => { if (!isTouchUI(e)) e.preventDefault(); });
    } else if (canvas) {
        canvas.addEventListener('mousedown', pressOn);
        canvas.addEventListener('mouseup', pressOff);
    }
    if (canvas) canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    initMobileControls();
}


function initMobileControls() {
    const frame = $('game-container');
    // flag touch devices so CSS shows one-thumb controls
    try {
        const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
        const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
        if ((coarse || hasTouch) && frame) frame.classList.add('od-touch');
        window.addEventListener('touchstart', () => frame && frame.classList.add('od-touch'), { once: true, passive: true });
    } catch {}
    const slider = $('od-gravity-slider');
    if (slider) {
        const sync = () => {
            sliderVal = Math.max(0, Math.min(100, parseFloat(slider.value) || 0)) / 100;
        };
        sync();
        slider.addEventListener('input', () => {
            sync(); sliderHold = true; sfx.init();
            targetRadius = MIN_RADIUS + sliderVal * (MAX_RADIUS - MIN_RADIUS);
            if (gameActive && !isPaused) setThrust(sliderVal > 0.55);
        });
        slider.addEventListener('pointerdown', () => { sliderHold = true; });
        window.addEventListener('pointerup', () => { sliderHold = false; });
        slider.addEventListener('change', () => { setTimeout(() => { sliderHold = false; }, 400); });
    }
    const tiltBtn = $('od-tilt-btn');
    if (tiltBtn && !tiltBtn.dataset.wired) {
        tiltBtn.dataset.wired = '1';
        tiltBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            sfx.init();
            if (!tiltOn) {
                // iOS 13+ needs a user-gesture permission request
                try {
                    const DOE = window.DeviceOrientationEvent;
                    if (DOE && typeof DOE.requestPermission === 'function') {
                        const res = await DOE.requestPermission();
                        if (res !== 'granted') return;
                    }
                } catch {}
                tiltOn = true; tiltBeta0 = null;
                try { store.set('orbitaldrift_tilt', '1'); } catch {}
            } else {
                tiltOn = false;
                try { store.set('orbitaldrift_tilt', '0'); } catch {}
            }
            tiltBtn.setAttribute('aria-pressed', tiltOn ? 'true' : 'false');
            tiltBtn.textContent = tiltOn ? '📱 Tilt: On' : '📱 Tilt: Off';
        });
        try {
            if (store.get('orbitaldrift_tilt', '0') === '1') {
                tiltBtn.setAttribute('aria-pressed', 'false');
            }
        } catch {}
    }
    window.addEventListener('deviceorientation', (e) => {
        if (!tiltOn || e.beta == null || e.gamma == null) return;
        if (tiltBeta0 == null) tiltBeta0 = e.beta;
        tiltBeta = e.beta - tiltBeta0;
        tiltGamma = e.gamma;
    });
    const dashBtn = $('od-dash-btn');
    if (dashBtn && !dashBtn.dataset.wired) {
        dashBtn.dataset.wired = '1';
        dashBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); triggerDash(); });
        dashBtn.addEventListener('click', (e) => { e.stopPropagation(); });
    }
    // viewport + orientation resize handler (mobile URL bar / rotation)
    let rsT = null;
    const onRs = () => {
        if (rsT) return;
        rsT = setTimeout(() => { rsT = null; try { fitToContainer(); } catch {} }, 120);
    };
    window.addEventListener('orientationchange', () => setTimeout(onRs, 250));
    if (window.visualViewport) {
        try { window.visualViewport.addEventListener('resize', onRs); } catch {}
    }
    window.addEventListener('resize', onRs);
}


function initThree() {
    const canvas = $('TEMPLATE-4weird-gameCanvas');
    container = container || $('game-container');
    const w = container.clientWidth || canvas.getBoundingClientRect().width || 800;
    const h = container.clientHeight || canvas.getBoundingClientRect().height || 600;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050510, 0.0015);

    camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 1500);
    camera.position.set(0, -230, 220);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    const isMobile = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.setSize(w, h, false);

    const ambientLight = new THREE.AmbientLight(0x0a0a23, 1.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0x00ffff, 2.5);
    dirLight.position.set(60, -120, 150);
    scene.add(dirLight);
    const planetPoint = new THREE.PointLight(0xa78bfa, 3, 250);
    planetPoint.position.set(0, 0, 10);
    scene.add(planetPoint);

    // Shared geometries
    Assets.box = new THREE.BoxGeometry(1, 1, 1);
    Assets.stardustGeo = new THREE.OctahedronGeometry(2.5, 0);
    Assets.stardustMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    Assets.asteroidGeo = new THREE.DodecahedronGeometry(4, 0);
    Assets.cometGeo = new THREE.ConeGeometry(2, 6, 4);
    Assets.cometGeo.rotateX(Math.PI / 2);
    Assets.stalkerGeo = new THREE.OctahedronGeometry(3.2, 0);
    Assets.weaverGeo = new THREE.DodecahedronGeometry(3.4, 0);
    Assets.darterGeo = new THREE.ConeGeometry(1.8, 8, 5);
    Assets.darterGeo.rotateX(Math.PI / 2);
    Assets.shardGeo = new THREE.TetrahedronGeometry(2, 0);
    Assets.orbGeo = new THREE.SphereGeometry(3, 10, 10);
    Assets.prismGeo = new THREE.ConeGeometry(3, 6, 3);
    Assets.torusGeo = new THREE.TorusGeometry(3, 1.1, 8, 16);
    Assets.icoGeo = new THREE.IcosahedronGeometry(3, 0);
    beamMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });

    // Starfield: 3 parallax layers (cheap PointsMaterial, additive)
    makeStarLayer(180, 4.5, 0x8b9bff, 0.9, -140, 700, 0.0011);
    makeStarLayer(260, 3.0, 0xffffff, 0.7, -220, 650, 0.0005);
    makeStarLayer(320, 2.0, 0xffc9ec, 0.55, -300, 600, 0.0002);

    // Nebula sprites
    addNebula('rgba(139,92,246,0.55)', 'rgba(76,29,149,0.25)', -160, 90, -320, 380, 0.5, 0.004);
    addNebula('rgba(6,182,212,0.5)', 'rgba(8,51,68,0.25)', 190, -70, -340, 420, 0.45, -0.003);
    addNebula('rgba(236,72,153,0.4)', 'rgba(80,7,36,0.2)', 20, 180, -360, 460, 0.35, 0.002);

    // Central Planet (banded shader, WebGL1-safe)
    planetUniforms = {
        uTime: { value: 0 },
        uLightDir: { value: new THREE.Vector3(0.5, -0.7, 0.8).normalize() },
        uDeep: { value: new THREE.Color(0x0b0026) },
        uBandA: { value: new THREE.Color(0x4c1d95) },
        uBandB: { value: new THREE.Color(0x0ea5e9) },
        uCity: { value: new THREE.Color(0xfacc15) }
    };
    let planetMat;
    try {
        planetMat = new THREE.ShaderMaterial({
            uniforms: planetUniforms,
            vertexShader: 'varying vec3 vN; varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }',
            fragmentShader: [
                'precision mediump float;', 'varying vec3 vN; varying vec3 vW; varying vec2 vUv;',
                'uniform float uTime; uniform vec3 uLightDir; uniform vec3 uDeep; uniform vec3 uBandA; uniform vec3 uBandB; uniform vec3 uCity;',
                'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }',
                'float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x), f.y); }',
                'void main(){',
                '  float lat = vUv.y * 6.2831;',
                '  float bands = 0.5 + 0.5*sin(lat*5.0 + noise(vUv*6.0 + vec2(uTime*0.05,0.0))*2.2);',
                '  float clouds = smoothstep(0.45,0.85, noise(vUv*vec2(8.0,14.0) + vec2(uTime*0.03, uTime*0.008)));',
                '  vec3 base = mix(uDeep, uBandA, bands*0.7);',
                '  base = mix(base, uBandB, clouds*0.45);',
                '  float ndl = dot(normalize(vN), normalize(uLightDir));',
                '  float day = smoothstep(-0.25, 0.45, ndl);',
                '  float term = smoothstep(-0.05,0.25,ndl)*(1.0-smoothstep(0.25,0.7,ndl));',
                '  base += vec3(1.0,0.45,0.15)*term*0.35;',
                '  float night = 1.0 - smoothstep(-0.35, 0.1, ndl);',
                '  float cities = step(0.985, hash(floor(vUv*220.0))) * night;',
                '  base += uCity * cities * 0.9;',
                '  vec3 V = normalize(cameraPosition - vW);',
                '  float rim = pow(1.0 - max(dot(normalize(vN), V), 0.0), 2.5);',
                '  base += vec3(0.45,0.3,1.0)*rim*(0.35+0.65*day);',
                '  base *= (0.25 + 0.95*day);',
                '  gl_FragColor = vec4(base, 1.0);', '}'
            ].join('\n')
        });
    } catch { planetMat = new THREE.MeshPhongMaterial({ color: 0x070014, emissive: 0x1d0047, shininess: 90, flatShading: true }); }
    planet = new THREE.Mesh(new THREE.SphereGeometry(PLANET_RADIUS, 48, 48), planetMat);
    scene.add(planet);

    try {
        atmoMat = new THREE.ShaderMaterial({
            uniforms: { uIntensity: { value: 1.0 } },
            vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(normalMatrix*normal); vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }',
            fragmentShader: 'precision mediump float; varying vec3 vN; varying vec3 vW; uniform float uIntensity; void main(){ vec3 V=normalize(cameraPosition-vW); float rim=pow(1.0-abs(dot(normalize(vN),V)),3.0); vec3 c=mix(vec3(0.35,0.2,1.0),vec3(0.1,0.9,1.0),rim); gl_FragColor=vec4(c*rim*1.6*uIntensity, rim*uIntensity); }',
            transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false
        });
        const atmo = new THREE.Mesh(new THREE.SphereGeometry(PLANET_RADIUS * 1.12, 48, 48), atmoMat);
        atmo.userData.isAtmo = true;
        scene.add(atmo);
    } catch { atmoMat = null; }

    // Saturn-style rings with stripe texture
    const ringMat = new THREE.MeshPhongMaterial({ color: 0xa78bfa, emissive: 0x4c1d95, side: THREE.DoubleSide, transparent: true, opacity: 0.85, shininess: 50 });
    try { ringMat.map = makeRingTexture(); ringMat.needsUpdate = true; } catch {}
    rings = new THREE.Mesh(new THREE.RingGeometry(PLANET_RADIUS + 6, PLANET_RADIUS + 12, 64), ringMat);
    rings.rotation.x = Math.PI / 6;
    rings.rotation.y = Math.PI / 10;
    scene.add(rings);

    createOrbitTrack(62.5, 0xf59e0b, 0.28);   // inner burn zone edge glow
    createOrbitTrack(100, 0x0284c7, 0.2);
    createOrbitTrack(140, 0x0f766e, 0.2);
    createOrbitTrack(167.5, 0xa78bfa, 0.22);  // outer void zone edge glow

    // Satellite (Player Ship) - rebuilt per selected class
    satellite = buildSatelliteMesh(selectedShip);
    satellite.position.set(MIN_RADIUS, 0, 0);
    scene.add(satellite);

    magnetRing = new THREE.Mesh(
        new THREE.RingGeometry(49, 50.5, 72),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    scene.add(magnetRing);

    fitToContainer();
    if (window.ResizeObserver && container) new ResizeObserver(fitToContainer).observe(container);
    window.addEventListener('resize', fitToContainer);
}


function buildSatelliteMesh(shipId) {
    const s = SHIPS[shipId] || SHIPS.dart;
    const g = new THREE.Group();
    if (shipId === 'cubesat') {
        // 1U CubeSat: compact box bus + deployable panels + whip antenna
        const bus = new THREE.Mesh(
            new THREE.BoxGeometry(4.5, 4.5, 4.5),
            new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0x92400e, shininess: 80 })
        );
        g.add(bus);
        const panelMat = new THREE.MeshPhongMaterial({ color: 0x1d4ed8, emissive: 0x0c4a6e, shininess: 60 });
        [-4.2, 4.2].forEach((x) => {
            const p = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 5.5), panelMat);
            p.position.set(x, 0, 0);
            g.add(p);
        });
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        ant.position.set(0, 3.5, 0);
        g.add(ant);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        tip.position.set(0, 6, 0);
        g.add(tip);
    } else if (shipId === 'station') {
        // Harbour Station: truss spine + cans + big arrays (ISS-like)
        const truss = new THREE.Mesh(
            new THREE.BoxGeometry(20, 1.2, 1.2),
            new THREE.MeshPhongMaterial({ color: 0x9ca3af, emissive: 0x374151, shininess: 40 })
        );
        g.add(truss);
        const modMat = new THREE.MeshPhongMaterial({ color: 0xe5e7eb, emissive: 0x6b7280, shininess: 50 });
        [-5, 0, 5].forEach((x) => {
            const mod = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 5, 10), modMat);
            mod.rotation.z = Math.PI / 2;
            mod.position.set(x, -2.4, 0);
            g.add(mod);
        });
        const cupola = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 10), new THREE.MeshPhongMaterial({ color: 0x06b6d4, emissive: 0x0e7490 }));
        cupola.position.set(0, 2.2, 0);
        g.add(cupola);
        const arrMat = new THREE.MeshPhongMaterial({ color: 0x1e3a8a, emissive: 0x1e40af, shininess: 70 });
        [-12.5, 12.5].forEach((x) => {
            const arr = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 4.5), arrMat);
            arr.position.set(x, 1.2, 0);
            g.add(arr);
        });
    } else {
        // Dart: futuristic neon triangular fighter capsule (default)
        const bodyGeom = new THREE.ConeGeometry(4, 10, 4);
        bodyGeom.rotateX(Math.PI / 2);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x06b6d4, emissive: 0x0891b2, shininess: 100 });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        g.add(body);
        const wing = new THREE.Mesh(new THREE.BoxGeometry(9, 1.8, 0.4), new THREE.MeshPhongMaterial({ color: 0xa78bfa }));
        wing.position.set(0, -2, 0);
        g.add(wing);
        g.userData.bodyMat = bodyMat;
    }
    const fieldR = shipId === 'station' ? 11 : shipId === 'cubesat' ? 6 : 7;
    const fieldMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.0, wireframe: true });
    forcefield = new THREE.Mesh(new THREE.SphereGeometry(fieldR, 16, 16), fieldMat);
    g.add(forcefield);
    g.userData.shipId = shipId;
    g.userData.fieldR = fieldR;
    return g;
}


function fitToContainer() {
    if (!renderer || !camera || !container) return;
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // HiDPI fix: re-apply capped pixel ratio on every refit (fullscreen
    // changes container size without re-running initThree).
    const isMobile = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.setSize(w, h, false);
}
