// Demo Lichdom - Full Game Engine
// Pure HTML5 Canvas with Emoji Graphics
// v2.0 - 25 improvements with love

// ===== STARFIELD BACKGROUND =====
(function initStarfield() {
    const sf = document.getElementById('TEMPLATE-4weird-starfield');
    if (!sf) return;
    const ctx2 = sf.getContext('2d');
    let stars = [];
    function resize() {
        sf.width = window.innerWidth;
        sf.height = window.innerHeight;
        stars = [];
        const count = Math.floor((sf.width * sf.height) / 4000);
        for (let i = 0; i < count; i++) {
            stars.push({ x: Math.random()*sf.width, y: Math.random()*sf.height, size: Math.random()*2+0.5, opacity: Math.random()*0.8+0.2, twinkleSpeed: Math.random()*0.02+0.01, twinklePhase: Math.random()*Math.PI*2 });
        }
    }
    function draw() {
        ctx2.clearRect(0, 0, sf.width, sf.height);
        stars.forEach(s => {
            s.twinklePhase += s.twinkleSpeed;
            const alpha = s.opacity * (Math.sin(s.twinklePhase) * 0.3 + 0.7);
            ctx2.beginPath(); ctx2.arc(s.x, s.y, s.size, 0, Math.PI*2);
            ctx2.fillStyle = `rgba(255,255,255,${alpha})`; ctx2.fill();
        });
        const g = ctx2.createRadialGradient(sf.width*0.3, sf.height*0.3, 0, sf.width*0.3, sf.height*0.3, sf.width*0.6);
        g.addColorStop(0, 'rgba(139,92,246,0.08)'); g.addColorStop(0.5, 'rgba(16,185,129,0.05)'); g.addColorStop(1, 'transparent');
        ctx2.fillStyle = g; ctx2.fillRect(0, 0, sf.width, sf.height);
        requestAnimationFrame(draw);
    }
    window.addEventListener('resize', resize, { passive: true }); resize(); draw();
})();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, UPGRADE: 3, WIN: 4, LOSE: 5 };

let audioCtx = null;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    switch(type) {
        case 'cast':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
            break;
        case 'summon':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.3);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;
        case 'hit':
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
        case 'explosion':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
        case 'levelup':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(500, now + 0.1);
            osc.frequency.setValueAtTime(600, now + 0.2);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
        case 'win':
            for (let i = 0; i < 6; i++) {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.connect(g);
                g.connect(audioCtx.destination);
                o.type = 'sine';
                o.frequency.setValueAtTime(440 * Math.pow(1.189, i), now + i * 0.12);
                g.gain.setValueAtTime(0.12, now + i * 0.12);
                g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.35);
                o.start(now + i * 0.12);
                o.stop(now + i * 0.12 + 0.35);
            }
            break;
        case 'lose':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.8);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
            osc.start(now);
            osc.stop(now + 0.9);
            break;
        case 'enemydeath':
            osc.type = 'square';
            osc.frequency.setValueAtTime(350, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
            osc.start(now);
            osc.stop(now + 0.18);
            break;
        case 'blink':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.12);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
            osc.start(now);
            osc.stop(now + 0.18);
            break;
        case 'combo':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.setValueAtTime(800, now + 0.05);
            osc.frequency.setValueAtTime(1000, now + 0.1);
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
    }
}

class Game {
constructor() {
        this.state = STATE.MENU;
        this.lastTime = 0;
        this.accumulatedTime = 0;
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        this.player = {
            x: 400, y: 400,
            vx: 0, vy: 0,
            speed: 3,
            facingLeft: false,
            hp: 100, maxHp: 100,
            mana: 100, maxMana: 100,
            manaRegen: 0.12,
            xp: 0, maxXp: 100,
            level: 1,
            summonCooldown: 0,
            maxSkeletons: 3
        };
        this.skeletons = [];
        this.projectiles = [];
        this.particles = [];
        this.buildings = [];
        this.enemies = [];
        this.debris = [];
        this.rubble = [];
        this.ripples = [];
        this.scorePops = [];
        this.phase = 1;
        this.score = 0;
        this.buildingsDestroyed = 0;
        this.shake = 0;
        this.shakeTime = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;
        this.highScore = 0;
        try {
            const stored = Number(localStorage.getItem('demolichdom_hs'));
            this.highScore = Number.isFinite(stored) ? Math.max(0, Math.floor(stored)) : 0;
        } catch (e) { /* storage unavailable (private mode / sandbox) - keep 0 */ }
        this.sessionStart = Date.now();
        this.phaseFlash = 0;
        this.phaseFlashColor = '#10b981';
        this.starOffset = { x: 0, y: 0 };
        this.activeUpgradeOptions = [];
        this.upgrades = [
            { id: 'mana', name: 'Mana Mastery', emoji: '💧', desc: '+30 Mana, +50% Regen' },
            { id: 'army', name: 'Lich Lord', emoji: '💀', desc: '+2 Skeletons, +5 HP each' },
            { id: 'spell', name: 'Void Bolt', emoji: '⚡', desc: '+15 Spell Damage, Piercing' },
            { id: 'speed', name: 'Spectral Dash', emoji: '👻', desc: '+30% Speed, Blink (Space)' },
            { id: 'armor', name: 'Death Ward', emoji: '🛡️', desc: '+25 HP, HP Regen' }
        ];
        this.blinkCooldown = 0;
        this.setupBuildings();
        this.setupInput();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }
}
