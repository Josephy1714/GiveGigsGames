Object.defineProperties(Game.prototype, Object.getOwnPropertyDescriptors({
start() {
        initAudio();
        this.keys = {};
        this.mouse.down = false;
        this.state = STATE.PLAYING;
        gameClock.reset();
        document.getElementById('mainMenu').classList.add('hidden');
        canvas.focus();
    },

resume() {
        this.state = STATE.PLAYING;
        gameClock.reset();
        document.getElementById('pauseMenu').classList.add('hidden');
        canvas.focus();
    },

pause() {
        this.state = STATE.PAUSED;
        this.keys = {};
        this.mouse.down = false;
        document.getElementById('pauseMenu').classList.remove('hidden');
        document.getElementById('pauseResume').focus();
    },

togglePause() {
        if (this.state === STATE.PLAYING) this.pause();
        else if (this.state === STATE.PAUSED) this.resume();
    },

restart() {
        gameClock.reset();
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
        this.phaseFlash = 0;
        this.starOffset = { x: 0, y: 0 };
        this.sessionStart = Date.now();
        this.setupBuildings();
        this.state = STATE.PLAYING;
        gameClock.reset();
        document.getElementById('pauseMenu').classList.add('hidden');
        document.getElementById('winScreen').classList.add('hidden');
        document.getElementById('loseScreen').classList.add('hidden');
        document.getElementById('upgradeMenu').classList.add('hidden');
        this.keys = {};
        this.mouse.down = false;
        canvas.focus();
    },

toMenu() {
        this.state = STATE.MENU;
        document.getElementById('pauseMenu').classList.add('hidden');
        document.getElementById('loseScreen').classList.add('hidden');
        document.getElementById('winScreen').classList.add('hidden');
        document.getElementById('mainMenu').classList.remove('hidden');
        document.getElementById('dl-main-start').focus();
    },

showHowToPlay() {
        document.getElementById('mainMenu').classList.add('hidden');
        window.dlScreens.manual.reset();
        document.getElementById('howToPlayMenu').classList.remove('hidden');
        document.getElementById('dl-manual-done').focus();
    },

closeHowToPlay() {
        document.getElementById('howToPlayMenu').classList.add('hidden');
        if (this.state === STATE.MENU) {
            document.getElementById('mainMenu').classList.remove('hidden');
            document.getElementById('dl-main-start').focus();
        }
    },

win() {
        this.state = STATE.WIN;
        playSound('win');
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try { localStorage.setItem('demolichdom_hs', this.score); } catch (e) { /* ignore */ }
        }
        const elapsed = Math.floor((Date.now() - this.sessionStart) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLevel').textContent = this.player.level;
        document.getElementById('finalTime').textContent = mins + 'm ' + secs + 's';
        document.getElementById('finalCombo').textContent = 'x' + this.maxCombo;
        document.getElementById('finalHighScore').textContent = this.highScore;
        document.getElementById('winScreen').classList.remove('hidden');
        document.getElementById('winReplay').focus();
    },

lose() {
        this.state = STATE.LOSE;
        playSound('lose');
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try { localStorage.setItem('demolichdom_hs', this.score); } catch (e) { /* ignore */ }
        }
        document.getElementById('deathScore').textContent = this.score;
        document.getElementById('buildingsDestroyed').textContent = this.buildingsDestroyed;
        document.getElementById('deathHighScore').textContent = this.highScore;
        document.getElementById('loseScreen').classList.remove('hidden');
        document.getElementById('loseReplay').focus();
    }
}));
