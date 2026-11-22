/**
 * Orbital Drift - Enhanced Premium Edition v2
 * Built with Three.js r128
 * Upgrades: combo chains, risk zones, phases, new enemies/powerups,
 * near-miss grazes, juice (popups/flash/shake/FOV), pooled particles,
 * delta-time motion, safe audio/storage, auto-pause, bot API.
 */

// ---------- Safe storage ----------
const store = {
    get(k, f = '0') { try { const v = localStorage.getItem(k); return v == null ? f : v; } catch { return f; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
};

const sfx = new SoundFX();

// Game State Variables
let scene, camera, renderer, container;

let planet, planetUniforms, atmoMat, rings, satellite, forcefield, magnetRing, orbits = [];

let collectibles = [], debris = [], powerups = [];

let particles = [], particlePool = [], shockwaves = [], nebulas = [], starLayers = [];

let gameActive = false;

let isPaused = false;

let overFired = false;

let score = 0;

let multiplier = 1.0;

let comboChain = 0, comboTimer = 0, comboDrainAcc = 0;

const COMBO_WINDOW = 3.0, COMBO_MAX = 8.0;

const comboMult = () => Math.min(1.0 + comboChain * 0.1, COMBO_MAX);

let integrity = 100;

let orbitRadius = 100;

let targetRadius = 100;

let satelliteAngle = 0;

let thrustActive = false;

// ----- Mobile: Drag-orbit steering + gravity slider + tilt + dash -----
let dragSteer = { active: false, id: null, startX: 0, startY: 0, startRadius: 100, lastX: 0, lastY: 0, moved: 0, t0: 0 };

let sliderHold = false, sliderVal = 0.38;

let tiltOn = false, tiltBeta0 = null, tiltBeta = 0, tiltGamma = 0;

let dashT = 0, dashCD = 0;

const DASH_TIME = 0.45, DASH_CD_MAX = 6;

let highScore = 0;

let bestCombo = 0, bestTime = 0;

let stardustCount = 0, basePoints = 0, maxMultiplier = 1.0, nearMissCount = 0;

let hitsThisLap = 0, angleAccum = 0;

let spawnTimerDebris = 0;

let spawnTimerStardust = 0;

let spawnTimerPowerup = 0;

let timeElapsed = 0;

let elapsedSec = 0;

let phase = 1;

let surgeActive = false, surgeT = 0, surgeCooldown = 25;

let screenShake = 0;

let shakeEnabled = store.get('orbitaldrift_shake', '1') !== '0';

if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches && store.get('orbitaldrift_shake', '') === '') shakeEnabled = false;

let magnetActive = false, magnetDuration = 0;

let shieldActive = false, shieldDuration = 0;

let overdriveActive = false, overdriveDuration = 0;

let cloakActive = false, cloakDuration = 0;

let chronoActive = false, chronoDuration = 0;

let timeScale = 1, dying = false, dyingT = 0;

let trailAcc = 0, bleedAcc = 0, dangerAcc = 0;

let popupPool = [];

let tutorialCycles = 0, tutorialHidden = false, lastThrust = false;

let lastFlight = null;

let beamMat = null;

const _v1 = { x: 0, y: 0 };

const MIN_RADIUS = 50;

const MAX_RADIUS = 180;

const PLANET_RADIUS = 35;

const SAT_BASE_SPEED = 0.045;

const GRAZE_MIN = 9, GRAZE_MAX = 22;

// ---------- Camera Views ----------
const CAMERA_MODES = ['chase', 'forward', 'solar'];
const CAMERA_LABELS = { chase: '3RD PERSON', forward: 'FORWARD', solar: 'SOLAR VIEW' };
let cameraMode = store.get('orbitaldrift_cam', 'chase');
if (!CAMERA_MODES.includes(cameraMode)) cameraMode = 'chase';
const camPosCurrent = new THREE.Vector3(0, -230, 220);
const camLookCurrent = new THREE.Vector3(0, 0, 0);

// ---------- Orbital Levels ----------
const LEVELS = {
    earth: {
        id: 'earth',
        name: 'Low Earth Orbit',
        emoji: '🌍',
        desc: 'Classic single-planet orbit. Stable gravity, clean debris lanes.',
        centerType: 'earth',
        centerRadius: 35,
        hasRings: true,
        ringColor: 0xa855f7,
        scoreMult: 1.0,
        debrisRate: 1.0,
        bodies: []
    },
    earth_moon: {
        id: 'earth_moon',
        name: 'Earth-Moon System',
        emoji: '🌗',
        desc: 'Dodge the orbiting Moon & ride its gravity for Lunar Slingshot bonuses.',
        centerType: 'earth',
        centerRadius: 33,
        hasRings: false,
        scoreMult: 1.25,
        debrisRate: 1.1,
        bodies: [
            { name: 'Moon', radius: 10, orbitR: 132, speed: 0.0085, angle: 1.2, color: 0xd1d5db, emissive: 0x374151, slingshotBonus: 180 }
        ]
    },
    earth_mars: {
        id: 'earth_mars',
        name: 'Earth-Mars Transfer',
        emoji: '🔴',
        desc: 'Heliocentric orbit around the Sun! Weave between Earth & Mars.',
        centerType: 'sun',
        centerRadius: 32,
        hasRings: false,
        scoreMult: 1.5,
        debrisRate: 1.2,
        bodies: [
            { name: 'Earth', radius: 9.5, orbitR: 86, speed: 0.011, angle: 0.5, color: 0x38bdf8, emissive: 0x0369a1, slingshotBonus: 150 },
            { name: 'Mars', radius: 8.5, orbitR: 152, speed: 0.0065, angle: 3.6, color: 0xef4444, emissive: 0x7f1d1d, slingshotBonus: 220 }
        ]
    },
    saturn: {
        id: 'saturn',
        name: "Saturn's Rings",
        emoji: '🪐',
        desc: 'High-speed ring-skimming around a ringed giant & orbiting Titan.',
        centerType: 'saturn',
        centerRadius: 36,
        hasRings: true,
        ringColor: 0xfde68a,
        scoreMult: 1.75,
        debrisRate: 1.35,
        bodies: [
            { name: 'Titan', radius: 11, orbitR: 156, speed: 0.007, angle: 2.4, color: 0xf59e0b, emissive: 0x78350f, slingshotBonus: 250 }
        ]
    }
};

let selectedLevel = store.get('orbitaldrift_level', 'earth');
if (!LEVELS[selectedLevel]) selectedLevel = 'earth';
const levelCfg = () => LEVELS[selectedLevel];
let secondaryBodies = [];
let slingshotCD = 0;

// ---------- Flyable ship classes ----------
const SHIPS = {
    cubesat: { id: 'cubesat', name: 'CubeSat', emoji: '📦', maxIntegrity: 75, thrustOut: 6.0, thrustIn: 5.2, agility: 0.22, hitMod: -2, pickupR: 8, grazeMod: 2, magnetMod: -8, scoreMult: 1.25, trail: 0xfacc15 },
    dart: { id: 'dart', name: 'Dart', emoji: '🛸', maxIntegrity: 100, thrustOut: 4.5, thrustIn: 4.0, agility: 0.16, hitMod: 0, pickupR: 8, grazeMod: 0, magnetMod: 0, scoreMult: 1.0, trail: 0x06b6d4 },
    station: { id: 'station', name: 'Harbour Station', emoji: '🛰️', maxIntegrity: 150, thrustOut: 3.2, thrustIn: 2.8, agility: 0.11, hitMod: 3, pickupR: 11, grazeMod: -2, magnetMod: 10, scoreMult: 0.9, trail: 0x10b981 }
};

let selectedShip = store.get('orbitaldrift_ship', 'dart');

if (!SHIPS[selectedShip]) selectedShip = 'dart';

let maxIntegrity = SHIPS[selectedShip].maxIntegrity;

const ship = () => SHIPS[selectedShip];

// Shared assets (no per-spawn GPU uploads)
const Assets = {};

const matCache = new Map();

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
    initUI();
    Promise.resolve(window.__threeReady).then(() => {
        if (typeof THREE === 'undefined') return showFatal('3D library failed to load. Check your connection and reload.');
        try { initThree(); } catch (e) { showFatal('WebGL unavailable: ' + (e && e.message ? e.message : e)); return; }
        applyMuteUI();
        animate();
    }).catch(() => showFatal('3D library failed to load. Check your connection and reload.'));
});

// Speed scale against tab throttling
window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SET_GAME_SPEED') {
        const speed = parseFloat(e.data.speed);
        if (!isNaN(speed) && speed > 0) window.gameSpeedMultiplier = speed;
    }
});

let lastFrameTime = performance.now();

// ===== DEVELOPER DEBUGGING API =====
window.gameDebug = Object.assign(window.gameDebug || {}, {
    name: "Orbital Drift",
    getScore: () => score,
    setScore: (s) => { score = s; $('hud-score').textContent = Math.floor(score); },
    getHealth: () => integrity,
    setHealth: (h) => { integrity = h; updateShieldUI(); },
    getState: () => !gameActive ? (integrity <= 0 || overFired ? 'game_over' : 'menu') : (isPaused ? 'paused' : 'playing'),
    isPlaying: () => gameActive && !isPaused,
    start: () => startGame(),
    pause: () => { if (gameActive && !isPaused) togglePause(); },
    resume: () => resumeGame(),
    reset: () => startGame(),
    setThrust: (on) => setThrust(!!on),
    dash: () => triggerDash(),
    setTilt: (on) => { tiltOn = !!on; if (tiltOn) tiltBeta0 = null; const b = $('od-tilt-btn'); if (b) { b.setAttribute('aria-pressed', tiltOn ? 'true' : 'false'); b.textContent = tiltOn ? '📱 Tilt: On' : '📱 Tilt: Off'; } return tiltOn; },
    setGravity: (v) => { sliderVal = Math.max(0, Math.min(1, v)); targetRadius = MIN_RADIUS + sliderVal * (MAX_RADIUS - MIN_RADIUS); const sl = $('od-gravity-slider'); if (sl) sl.value = String(Math.round(sliderVal * 100)); },
    hangar: () => showHangar('debug'),
    snapshot: () => ({
        score: Math.floor(score), integrity, maxIntegrity, multiplier, comboChain,
        ship: selectedShip,
        orbitRadius, targetRadius, satelliteAngle, elapsedSec, phase,
        counts: { stardust: collectibles.length, debris: debris.length, powerups: powerups.length, particles: particles.length },
        gameActive, isPaused
    }),
    win: () => { score += 5000; gameOver(); },
    lose: () => { integrity = 0; gameOver(); },
    ships: () => Object.values(SHIPS).map((s) => ({ id: s.id, name: s.name, maxIntegrity: s.maxIntegrity, scoreMult: s.scoreMult })),
    getShip: () => selectedShip,
    setShip: (id) => applyShipSelection(id, true),
    godMode: false,
    toggleGodMode: function () { this.godMode = !this.godMode; return this.godMode; }
});

// ===== FW-ARCADE-A: fullscreen + bug-sweep helper =====
// ⛶ overlay button (top-right), F key + double-click toggle,
// fullscreenchange/resize refit via fitToContainer (fixed internal 3D
// resolution is preserved - the renderer stretches via CSS sizing, so game
// coordinates never change). Feature: exiting fullscreen mid-flight pauses.
(function fwFullscreen() {
    var frame = document.getElementById('game-container');
    if (!frame || document.getElementById('fw-fs-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'fw-fs-btn';
    btn.className = 'fw-fs-btn';
    btn.type = 'button';
    btn.title = 'Toggle fullscreen (F)';
    btn.setAttribute('aria-label', 'Toggle fullscreen');
    btn.textContent = '\u26F6';
    frame.appendChild(btn);

    function isFS() { return !!document.fullscreenElement; }
    function refit() { try { fitToContainer(); } catch (e) {} }
    function toggleFS() {
        try { sfx.init(); } catch (e) {}
        if (!isFS()) {
            // Pointer-lock conflict guard: never request pointer lock and
            // fullscreen simultaneously - this game uses no pointer lock, but
            // if one is ever held, exit it first and sequence fullscreen after.
            if (document.pointerLockElement && document.exitPointerLock) {
                try { document.exitPointerLock(); } catch (e) {}
                setTimeout(requestFS, 60);
            } else {
                requestFS();
            }
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
    function requestFS() {
        try {
            var r = frame.requestFullscreen ? frame.requestFullscreen() : null;
            if (r && r.catch) r.catch(function (err) { console.warn('Fullscreen rejected:', err); });
        } catch (e) { console.warn('Fullscreen rejected:', e); }
    }
    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleFS();
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    });
    frame.addEventListener('fw-dblclick-disabled', function (e) {
        if (e.target && e.target.closest && e.target.closest('button')) return;
        toggleFS();
    });
    window.addEventListener('keydown', function (e) {
        if (e.key !== 'f' && e.key !== 'F') return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        toggleFS();
    });
    document.addEventListener('fullscreenchange', function () {
        refit();
        // Feature: leaving fullscreen mid-flight pauses instead of dropping input.
        if (!isFS() && gameActive && !isPaused) {
            try { togglePause(); } catch (e) {}
        }
    });
    window.addEventListener('resize', refit);
})();

