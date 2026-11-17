
    'use strict';

// Canvas setup
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');

    const ctx = canvas.getContext('2d');

// Game constants — "Finger-paint symphony grid" scheme:
    // finger-drag paints, multi-touch = chords, responsive big tiles.
    const SCHEME = 'Finger-paint symphony grid';

    const GRID_COLS = 8;

    const GRID_ROWS = 6;

    const GRID_PADDING = 12;

    // Current tile metrics, recomputed for screen size (larger tiles on small screens).
    const layout = { tileW: 60, tileH: 60, startX: GRID_PADDING, startY: GRID_PADDING, cssW: 0, cssH: 0 };

    // Thumb-palette brush: -1 = free paint (exact tile), >=0 = paint that instrument row at touched column.
    let brushRow = -1;

    let rowFlash = -1;

    let rowFlashUntil = 0;

// Audio context (Web Audio API)
    let audioContext;

    let isPlaying = false;

    let isPaused = false;

    // Live-mute flag per AUDIO SPEC: one-shot notes only, no ambient bed,
    // so gating playNote silences output immediately.
    let isMuted = false;

    // Pending staggered playAll timeouts, cleared on stop paths.
    const pendingTimeouts = [];

// Exposed for hub/menu integration (additive; playSfx shapes unchanged).
    window.SoundPainterAudio = { setMuted, toggleMute, get muted() { return isMuted; } };

// Musical notes (frequencies in Hz)
    const NOTES = [
        261.63, // C4
        293.66, // D4
        329.63, // E4
        349.23, // F4
        392.00, // G4
        440.00, // A4
        493.88, // B4
        523.25  // C5
    ];

// Colors for each row (different timbres)
    const COLORS = [
        '#FF6B6B', // Red - sine
        '#4ECDC4', // Teal - square
        '#45B7D1', // Blue - sawtooth
        '#96CEB4', // Green - triangle
        '#FFEAA7', // Yellow - noise
        '#DDA15E'  // Brown - mix
    ];

// Grid state
    const grid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(false));

    let tileCount = 0;

// Game state
    const state = {
        score: 0,
        isPlaying: false,
        isPaused: false,
        highScore: readPainterBest()
    };

window.addEventListener('pointerdown', initAudio, { once: true });

    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'SET_GAME_SPEED') {
            const spd = parseFloat(e.data.speed);
            if (!isNaN(spd) && spd > 0) window.gameSpeedMultiplier = spd;
        }
    });

// Game loop
    let lastTime = 0;

// Input handling
    const keys = {};

document.addEventListener('keydown', (e) => {
        if (e.repeat || e.target.closest?.('button,input,select,textarea')) return;
        keys[e.code] = true;

        if (state.isPlaying) {
            if (e.code === 'KeyP' || e.code === 'Escape') {
                e.preventDefault();
                togglePause();
            }
            if (e.code === 'Space') {
                e.preventDefault();
                playAll();
            }
            if (e.code === 'KeyR') {
                e.preventDefault();
                resetGrid();
            }
        }
    });

document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

// Mouse input (desktop) + drag-paint
    let mousePainting = false;

    let mouseErase = false;

    let lastMouseTile = null;

    canvas.addEventListener('mousedown', (e) => {
        if (!state.isPlaying || state.isPaused || (lastTouchEnd > 0 && performance.now() - lastTouchEnd < 600)) return;
        initAudio();
        mousePainting = true;
        const tile = getTileAt(e.clientX, e.clientY);
        if (tile) {
            mouseErase = !!grid[brushRow >= 0 ? brushRow : tile.row][tile.col];
            lastMouseTile = tile.row + ':' + tile.col;
            clickTile(tile.row, tile.col);
        }
    });

    window.addEventListener('mouseup', () => {
        mousePainting = false;
        lastMouseTile = null;
    });

    canvas.addEventListener('mousemove', (e) => {
        const tile = getTileAt(e.clientX, e.clientY);
        canvas.style.cursor = tile ? 'pointer' : 'default';
        if (!mousePainting || !state.isPlaying || state.isPaused) return;
        if (tile) {
            const key = tile.row + ':' + tile.col;
            if (key !== lastMouseTile) {
                lastMouseTile = key;
                setTile(tile.row, tile.col, !mouseErase, true);
            }
        }
    });

    // Suppress synthetic click after touch drag (prevents double-toggle).
    let lastTouchEnd = 0;


// Touch input — finger-drag paints, multi-touch plays chords.
    // Each touch id gets: erase flag (from landing tile) + visited set (no re-toggle).
    const activeTouches = new Map();

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        initAudio();
        lastTouchEnd = performance.now();
        for (const t of e.changedTouches) handleTouchPoint(t, true);
    }, { passive: false });

canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        lastTouchEnd = performance.now();
        for (const t of e.changedTouches) activeTouches.delete(t.identifier);
    }, { passive: false });

    canvas.addEventListener('touchcancel', (e) => {
        for (const t of e.changedTouches) activeTouches.delete(t.identifier);
    }, { passive: false });

canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        lastTouchEnd = performance.now();
        for (const t of e.changedTouches) handleTouchPoint(t, false);
    }, { passive: false });

// Instrument thumb palette — big touch targets, selects brush + previews row.
    const INSTRUMENTS = [
        { name: 'Sine', emoji: '🌊' },
        { name: 'Square', emoji: '🟪' },
        { name: 'Saw', emoji: '⚡' },
        { name: 'Triangle', emoji: '🔺' },
        { name: 'Soft', emoji: '☁️' },
        { name: 'Drive', emoji: '🔥' }
    ];

// Button event listeners
    document.getElementById('TEMPLATE-4weird-start-btn').addEventListener('click', startGame);

    document.getElementById('TEMPLATE-4weird-resume-btn').addEventListener('click', () => {
        document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
        state.isPaused = false;
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    });

    document.getElementById('TEMPLATE-4weird-restart-btn').addEventListener('click', () => {
        document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
        resetGrid();
        state.isPaused = false;
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    });

    document.getElementById('TEMPLATE-4weird-play-again-btn').addEventListener('click', () => {
        document.getElementById('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
        startGame();
    });

// Play button hold/tap logic
    let playInterval = null;

    const playBtn = document.getElementById('TEMPLATE-4weird-play-btn');

// Pointer events for desktop and mobile support
    playBtn.addEventListener('pointerdown', startPlayingPattern);

    playBtn.addEventListener('pointerup', stopPlayingPattern);

    playBtn.addEventListener('pointerleave', stopPlayingPattern);

    playBtn.addEventListener('pointercancel', stopPlayingPattern);
    playBtn.addEventListener('click', event => { if (event.detail === 0) playAll(); });

// Window resize handling (debounced; keeps finger tiles fitted)
    let resizeT = null;

    window.addEventListener('resize', () => {
        clearTimeout(resizeT);
        resizeT = setTimeout(resizeCanvas, 120);
    });

    window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 250));

// Initialize
    buildPalette();

    resizeCanvas();

    const spReset = document.getElementById('sp-reset-btn');

    if (spReset) spReset.addEventListener('click', (e) => { e.preventDefault(); initAudio(); resetGrid(); });

    // Re-fit after fonts/layout settle so mobile tiles measure correctly.
    setTimeout(resizeCanvas, 300);

    document.getElementById('TEMPLATE-4weird-high-score').textContent = state.highScore;


