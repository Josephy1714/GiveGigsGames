// Neon Racer - Cyberpunk Traffic Dodger
// Game #5 in Neon Series - 4weird Template Version

const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 400;
canvas.height = 600;

// Game state
let gameState = 'start';
let distance = 0;
let highScore = neonReadRecord('neonRacerHighScore');
let coins = 0;
let speed = 3;
let animationId = null;

// Update high score
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
function playSound(freq, duration, type = 'square', volume = 0.06) {
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

// Road
const roadLines = [];
const laneCount = 3;
const laneWidth = canvas.width / laneCount;

for (let i = 0; i < 10; i++) {
    roadLines.push({ y: i * 80 });
}

// Player car
const player = {
    lane: 1,
    x: laneWidth * 1 + laneWidth / 2 - 20,
    y: canvas.height - 120,
    width: 40,
    height: 70,
    color: '#00ffff',
    targetX: 0
};
player.targetX = player.x;

// Enemy cars
let enemies = [];
let enemySpawnTimer = 0;

// Coins
let coinItems = [];
let coinSpawnTimer = 0;

// Power-ups
let powerUps = [];

// Particles
let particles = [];

// Input
