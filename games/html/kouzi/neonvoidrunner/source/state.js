// Neon Void Runner - Cyberpunk Endless Runner
// Game #1 in Neon Series - 4weird Template Version

const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 400;
canvas.height = 600;

// Game state
let gameState = 'start';
let distance = 0;
let highScore = neonReadRecord('neonVoidRunnerHighScore');
let speed = 4;
let animationId = null;

// Update high score display
document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore + 'm';

// Audio
let audioCtx = null;
// Live mute (AUDIO SPEC): SFX one-shots only, no ambient drone; gate output.
let muted = false;
function setMuted(m) { muted = !!m; return muted; }
function toggleMute() { return setMuted(!muted); }
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}
// Resume audio on first user gesture (autoplay policy safety)
window.addEventListener('pointerdown', function () {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}, { passive: true });
function playSound(freq, duration, type = 'square', volume = 0.08) {
    if (!audioCtx || muted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// Player
const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 120,
    width: 40,
    height: 60,
    color: '#00ffff',
    speed: 6,
    shield: false,
    shieldTimer: 0
};

// Lanes for positioning
const laneCount = 3;
const laneWidth = canvas.width / laneCount;

// Obstacles
let obstacles = [];
let obstacleTimer = 0;

// Collectibles
let collectibles = [];
let collectibleTimer = 0;

// Background layers
let bgOffset = 0;
let gridOffset = 0;

// Particles
let particles = [];

// Input
