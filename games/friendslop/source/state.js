// FriendSlop - A viral indieslop arcade game
// Feed your friends slop and build your vibe meter!

const canvas = document.getElementById('friendslop-4weird-gameCanvas');

const ctx = canvas.getContext('2d');

// Canvas setup
canvas.width = 800;

canvas.height = 600;

// Zero-dependency Procedural Audio Engine
let audioCtx = null;

window.addEventListener('pointerdown', initAudio, { once: true });

window.addEventListener('keydown', initAudio, { once: true });

// Game states
const GAME_STATE = {
    START: 'start',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

// Game class
class FriendSlop {
    constructor() {
        this.state = GAME_STATE.START;
        this.score = 0;
        this.combo = 0;
        this.vibeMeter = 100;
        this.time = 0;
        this.wave = 1;
        this.highScore = 0;
        try {
            this.highScore = parseInt(localStorage.getItem('friendslop-high-score'), 10) || 0;
        } catch (e) { /* storage unavailable (private mode / sandbox) - keep 0 */ }
        this.dailySeed = this.getDailySeed();
        document.getElementById('friendslop-4weird-high-score').textContent = Math.floor(this.highScore);
        
        this.isCoop = false;
        this.players = [];
        this.friends = [];
        this.slop = [];
        this.hazards = [];
        this.particles = [];
        this.projectiles = [];
        // Slop-stick + YEET + tap-to-feed mobile state (unique scheme)
        this.stickX = 0;
        this.yeetCooldownUntil = 0;
        this.lastTapAt = 0;
        this.tapStreak = 0;
        
        this.spawnFriends();
        this.setupEventListeners();
        this.gameLoop();
    }

// ===== FriendSlop mobile: "Slop-stick + YEET button + tap-to-feed" =====

// Tap rhythm -> combo shake: fast rhythmic taps shake harder + bonus combo

// (handleTouchMove removed: Slop-stick owns movement; canvas touchmove only blocks scroll)

}

// Initialize game
let game;

window.addEventListener('load', () => {
    game = new FriendSlop();
    window.game = game;
});

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_GAME_SPEED') {
        const speed = parseFloat(event.data.speed);
        if (!isNaN(speed) && speed > 0 && game) {
            game.speedMultiplier = speed;
        }
    }
});

// ===== DEVELOPER DEBUGGING API =====
window.gameDebug = {
    name: "FriendSlop",
    getScore: () => game ? game.score : 0,
    setScore: (s) => { if (game) game.score = s; },
    getHealth: () => game ? game.vibeMeter : 0,
    setHealth: (h) => { if (game) game.vibeMeter = Math.max(0, Math.min(100, h)); },
    win: () => {
        if (game) {
            game.score += 2500;
            game.wave += 5;
        }
    },
    lose: () => {
        if (game) game.gameOver();
    },
    godMode: false,
    toggleGodMode: function() {
        this.godMode = !this.godMode;
        return this.godMode;
    }
};

