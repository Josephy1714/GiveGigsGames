// Neon Invaders - Cyberpunk Space Shooter
// Game #4 in Neon Series - 4weird Template Version

const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameState = 'start'; // start, playing, paused, gameOver
let score = 0;
let highScore = neonReadRecord('neonInvadersHighScore');
let wave = 1;
let lives = 3;
let shakeTime = 0;
let animationId = null;

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Update high score display
document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore;

// Audio context for sound effects
let audioCtx = null;
// Live mute (AUDIO SPEC): SFX one-shots only, no ambient drone; gate output.
let muted = false;
function setMuted(m) { muted = !!m; return muted; }
function toggleMute() { return setMuted(!muted); }

function initAudio() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
        if (!audioCtx) audioCtx = new Audio();
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    } catch {
        // Gameplay continues if the browser cannot start audio.
    }
}

function playSound(frequency, duration, type = 'square', volume = 0.1) {
    if (!audioCtx || muted) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
}

function playShootSound() {
    playSound(880, 0.1, 'square', 0.08);
}

function playExplosionSound() {
    playSound(150, 0.2, 'sawtooth', 0.1);
    setTimeout(() => playSound(80, 0.15, 'sawtooth', 0.08), 50);
}

function playPowerUpSound() {
    playSound(523, 0.1, 'sine', 0.1);
    setTimeout(() => playSound(659, 0.1, 'sine', 0.1), 80);
    setTimeout(() => playSound(784, 0.15, 'sine', 0.1), 160);
}

// Player
const player = {
    x: canvas.width / 2,
    y: canvas.height - 60,
    width: 40,
    height: 30,
    speed: 6,
    color: '#00ffff',
    hasShield: false,
    shieldTimer: 0,
    tripleShot: false,
    tripleShotTimer: 0,
    rapidFire: false,
    rapidFireTimer: 0
};

// Bullets
let bullets = [];
let bulletCooldown = 0;
const baseBulletCooldown = 15;

// Enemies
let enemies = [];
let enemyRows = 4;
let enemyCols = 8;
let enemySpeed = 1;
let enemyDirection = 1;

// Power-ups
let powerUps = [];

// Particles
let particles = [];

// Stars (background)
let stars = [];
for (let i = 0; i < 100; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 1 + 0.5,
        opacity: Math.random() * 0.5 + 0.3
    });
}

// Input
