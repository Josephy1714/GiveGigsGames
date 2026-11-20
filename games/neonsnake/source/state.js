// Neon Snake - Cyberpunk Snake Game
// Game #2 in Neon Series - 4weird Template Version

const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
const ctx = canvas.getContext('2d');

// roundRect fallback for older browsers (used for snake segments)
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        r = Math.min(typeof r === 'number' ? r : 4, w / 2, h / 2);
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}

canvas.width = 600;
canvas.height = 600;

// Game state
let gameState = 'start';
let score = 0;
let highScore = neonReadRecord('neonSnakeHighScore');
let animationId = null;
let gameSpeed = 120; // ms per move
let lastMoveTime = 0;

// Update high score display
document.getElementById('TEMPLATE-4weird-high-score').textContent = highScore;

// Audio
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

// Grid setup
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Snake
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };

// Food
let food = { x: 0, y: 0 };
let foodType = 'normal';
let foodPulse = 0;

// Special foods
const foodTypes = [
    { type: 'normal', color: '#ff0066', points: 10, chance: 0.6 },
    { type: 'bonus', color: '#ffff00', points: 25, chance: 0.2 },
    { type: 'speed', color: '#00ffff', points: 15, chance: 0.1 },
    { type: 'slow', color: '#00ff66', points: 10, chance: 0.1 }
];

// Particles
let particles = [];

// Touch tracking
let touchStartX = 0;
let touchStartY = 0;

// Input
