// Neon Breaker - Cyberpunk Brick Breaker
// Game #3 in Neon Series - 4weird Template Version

const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// Game state
let gameState = 'start'; // start, playing, paused, gameOver
let score = 0;
let highScore = neonReadRecord('neonBreakerHighScore');
let lives = 3;
let level = 1;
let animationId = null;

// Update high score display
document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore;

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

// Paddle
const paddle = {
    x: canvas.width / 2 - 50,
    y: canvas.height - 30,
    width: 100,
    height: 12,
    speed: 8,
    color: '#00ffff'
};

// Ball
let balls = [];

// Bricks
let bricks = [];
const brickRowCount = 5;
const brickColCount = 10;
const brickWidth = 70;
const brickHeight = 25;
const brickPadding = 5;
const brickOffsetTop = 60;
const brickOffsetLeft = 30;

// Power-ups
let powerUps = [];

// Particles
let particles = [];

// Stars background
let stars = [];
for (let i = 0; i < 80; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.5 + 0.3
    });
}

// Input
