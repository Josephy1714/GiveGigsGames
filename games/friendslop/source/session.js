Object.defineProperty(FriendSlop.prototype, "start", { configurable: true, writable: true, value: function start(coop = false) {
        neonClock.reset();
        console.log("FriendSlop game started. Coop mode:", coop);
        this.isCoop = coop;
        this.state = GAME_STATE.PLAYING;
        document.getElementById('friendslop-4weird-start-screen').classList.add('hidden');
        this.initPlayers();
    } });
Object.defineProperty(FriendSlop.prototype, "togglePause", { configurable: true, writable: true, value: function togglePause() {
        if (this.state === GAME_STATE.PLAYING) {
            this.stickX = 0;
            this.players.forEach(player => { player.moveLeft = false; player.moveRight = false; });
            this.state = GAME_STATE.PAUSED;
            document.getElementById('friendslop-4weird-pause-screen').classList.remove('hidden');
        } else if (this.state === GAME_STATE.PAUSED) {
            this.resume();
        }
    } });
Object.defineProperty(FriendSlop.prototype, "resume", { configurable: true, writable: true, value: function resume() {
        if (this.state !== GAME_STATE.PAUSED) return;
        neonClock.reset();
        this.state = GAME_STATE.PLAYING;
        document.getElementById('friendslop-4weird-pause-screen').classList.add('hidden');
    } });
Object.defineProperty(FriendSlop.prototype, "restart", { configurable: true, writable: true, value: function restart() {
        neonClock.reset();
        console.log("FriendSlop game restarted.");
        this.state = GAME_STATE.PLAYING;
        this.score = 0;
        this.combo = 0;
        this.vibeMeter = 100;
        this.time = 0;
        this.wave = 1;
        this.initPlayers();
        this.stickX = 0;
        this.stickTouchId = null;
        this.yeetCooldownUntil = 0;
        this.lastTapAt = 0;
        this.tapStreak = 0;
        this.friends = [];
        this.slop = [];
        this.hazards = [];
        this.particles = [];
        this.projectiles = [];
        this.spawnFriends();
        document.getElementById('friendslop-4weird-game-over-screen').classList.add('hidden');
        document.getElementById('friendslop-4weird-pause-screen').classList.add('hidden');
    } });
Object.defineProperty(FriendSlop.prototype, "gameOver", { configurable: true, writable: true, value: function gameOver() {
        this.state = GAME_STATE.GAME_OVER;
        playSlopSound('gameover');
        document.getElementById('friendslop-4weird-final-score').textContent = Math.floor(this.score);
        document.getElementById('friendslop-4weird-daily-rank').textContent = `Wave: ${this.wave}`;
        document.getElementById('friendslop-4weird-game-over-screen').classList.remove('hidden');
    } });
