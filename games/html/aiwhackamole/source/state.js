// AI Whack-A-Mole 3D Game Engine

let scene, camera, renderer;

let goodQuotes = [];

let badQuotes = [];

let quotesLoaded = false;

// Game variables
let score = 0;

let health = 100;

let timeLeft = 60;

let isPlaying = false;
let roundTime = 0;
let countdownActive = false;
let countdownTimeout = null;
let roundGeneration = 0;

let gameTimerInterval = null;

let spawnInterval = null;

let speedFactor = 1.0;

let highscore = 0;
try {
    const storedScore = Number(localStorage.getItem('ai_whack_a_mole_highscore'));
    if (Number.isFinite(storedScore) && storedScore > 0) highscore = Math.floor(storedScore);
} catch (_) { /* Records are optional in sandboxed or private sessions. */ }

// Combo: consecutive bad-AI whacks within COMBO_WINDOW_MS multiply points.
let combo = 0;

let comboTimer = null;

const COMBO_WINDOW_MS = 2500;

const COMBO_MAX = 5;

// 3D Objects & Holes Config
const GRID_ROWS = 3;

const GRID_COLS = 3;

const SPACING_X = 2.0;

const SPACING_Z = 2.0;

const holes = [];
 // Array of hole/mole data objects

// Interactive Elements
const raycaster = new THREE.Raycaster();

const mouse = new THREE.Vector2();

// DOM elements
const container = document.getElementById('game-container');

const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');

const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');

const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');

const hud = document.getElementById('game-hud');

const hudScore = document.getElementById('hud-score');

const hudHealthBar = document.getElementById('hud-health-bar');

const hudTime = document.getElementById('hud-time');

const highscoreDisplay = document.getElementById('TEMPLATE-4weird-high-score');

const finalScoreVal = document.getElementById('TEMPLATE-4weird-final-score-val');

const gameOverReason = document.getElementById('game-over-reason');

const bubblesContainer = document.getElementById('bubbles-container');

// Sound synthesis helper (Web Audio API) for arcade sound effects - deferred until user gesture
let audioCtx = null;

window.addEventListener('pointerdown', () => getAudioContext(), { once: true });

// Bug sweep: AudioContext starts suspended until a user gesture, and browsers
// re-suspend it when the tab hides. Resume on every gesture, not just the first.
window.addEventListener('pointerdown', () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
});

window.addEventListener('keydown', () => { getAudioContext(); });

document.addEventListener('visibilitychange', () => { if (!document.hidden) getAudioContext(); });

window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SET_GAME_SPEED') {
        const spd = parseFloat(e.data.speed);
        if (!isNaN(spd) && spd > 0) window.gameSpeedMultiplier = spd;
    }
});

// Test hook: ?slowmo=N stretches mole stay + spawn cadence for vision-model
// playtests (default 1 = real-time arcade speed, untouched).
const SLOWMO = Math.max(1, parseFloat(new URLSearchParams(window.location.search).get('slowmo')) || 1);

// Set initial Highscore
highscoreDisplay.textContent = highscore;

// Project a mole's head to container pixel coords (for damage popups).
const _projV = new THREE.Vector3();

// Last-touch-wins guard so a touchstart + its emulated pointerdown don't
// double-whack the same mole (touchstart already handled it).
let _lastTouchWhackAt = 0;

window.addEventListener('touchstart', () => { _lastTouchWhackAt = Date.now(); }, { passive: true, capture: true });

// Frame Render Loop
let clock = new THREE.Clock();

// Hook start button
document.getElementById('TEMPLATE-4weird-start-btn').addEventListener('click', () => {
    if (quotesLoaded) startGame();
});

document.getElementById('TEMPLATE-4weird-play-again-btn').addEventListener('click', () => {
    if (quotesLoaded) startGame();
});

document.getElementById('TEMPLATE-4weird-resume-btn').addEventListener('click', resumeRound);

document.getElementById('TEMPLATE-4weird-restart-btn').addEventListener('click', () => {
    startGame();
});

// ESC or P key listener for pauses
window.addEventListener('keydown', (e) => {
    if (e.repeat || e.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (isPlaying) pauseRound();
        else resumeRound();
    }
});
window.addEventListener('blur', pauseRound);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseRound(); });

// Run Init sequence
loadQuotes().then(() => {
    init3D();
    animate();
});

// ===== DEVELOPER DEBUGGING API =====
window.gameDebug = {
    name: "AI Whack-A-Mole",
    getScore: () => score,
    setScore: (s) => { score = s; hudScore.textContent = s; },
    getHealth: () => health,
    setHealth: (h) => { health = h; updateHealthBar(); },
    getTimeLeft: () => timeLeft,
    setTimeLeft: (t) => { timeLeft = t; hudTime.textContent = t; },
    win: () => { endGame('time'); },
    lose: () => { endGame('integrity'); },
    godMode: false,
    toggleGodMode: function() {
        this.godMode = !this.godMode;
        return this.godMode;
    },
    getCombo: () => combo,
};

// ===== FW-ARCADE-A: fullscreen + bug-sweep helper =====
// ⛶ overlay button (top-right), F key + double-click toggle,
// fullscreenchange/resize refit via onWindowResize (fixed internal 3D
// resolution is preserved - the renderer stretches via CSS sizing, so game
// coordinates never change). Feature: exiting fullscreen mid-run auto-pauses.
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
    function refit() { try { onWindowResize(); } catch (e) {} }
    function toggleFS() {
        getAudioContext();
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
        // Feature: leaving fullscreen mid-run pauses instead of dropping input.
        if (!isFS() && isPlaying && pauseScreen) {
            pauseRound();
        }
    });
    window.addEventListener('resize', refit);
})();

