Object.defineProperty(FriendSlop.prototype, "getDailySeed", { configurable: true, writable: true, value: function getDailySeed() {
        const today = new Date();
        const dateStr = today.getFullYear() + '' + (today.getMonth() + 1) + '' + today.getDate();
        const seed = Math.abs(parseInt(dateStr)) % 10000;
        document.getElementById('friendslop-4weird-daily-seed').textContent = `Seed: ${seed}`;
        return seed;
    } });
Object.defineProperty(FriendSlop.prototype, "applyStick", { configurable: true, writable: true, value: function applyStick(clientX) {
        const dx = clientX - (this.stickCenterX || clientX);
        const r = this.stickRadius || 40;
        const clamped = Math.max(-r, Math.min(r, dx));
        this.stickX = clamped / r; // -1..1 drives Player.update (feed/move)
        const knob = document.getElementById('friendslop-stick-knob');
        if (knob) knob.style.transform = `translate(${clamped}px, 0px)`;
    } });
Object.defineProperty(FriendSlop.prototype, "pressSlop", { configurable: true, writable: true, value: function pressSlop() {
        if (this.state !== GAME_STATE.PLAYING) return;
        initAudio();
        const p1 = this.players[0];
        if (p1) {
            // Slop-stick nudges aim: throw drifts with current stick tilt
            p1.throw(this.stickX * 3);
        }
    } });
Object.defineProperty(FriendSlop.prototype, "pressYeet", { configurable: true, writable: true, value: function pressYeet() {
        if (this.state !== GAME_STATE.PLAYING) return;
        const now = performance.now();
        if (now < this.yeetCooldownUntil) return;
        this.yeetCooldownUntil = now + 800;
        initAudio();
        const p1 = this.players[0];
        if (p1) p1.yeet();
        // YEET kicks the screen + flashes the button
        this.shakeAmount = Math.max(this.shakeAmount || 0, 8);
        const yeetBtn = document.getElementById('friendslop-yeet-btn');
        if (yeetBtn) {
            yeetBtn.classList.add('friendslop-cooldown');
            setTimeout(() => yeetBtn.classList.remove('friendslop-cooldown'), 800);
        }
    } });
Object.defineProperty(FriendSlop.prototype, "registerTapRhythm", { configurable: true, writable: true, value: function registerTapRhythm() {
        const now = performance.now();
        const dt = now - (this.lastTapAt || 0);
        if (dt > 0 && dt < 450) {
            this.tapStreak = Math.min((this.tapStreak || 0) + 1, 12);
        } else {
            this.tapStreak = 1;
        }
        this.lastTapAt = now;
        const bonus = Math.min(3 + this.tapStreak * 2, 12);
        this.shakeAmount = Math.max(this.shakeAmount || 0, bonus);
        if (this.tapStreak >= 3) {
            this.combo += 1; // rhythm bonus on top of the feed scoring
            this.createParticles(canvas.width / 2, 140, '🔥');
        }
        return this.tapStreak;
    } });
Object.defineProperty(FriendSlop.prototype, "canvasPoint", { configurable: true, writable: true, value: function canvasPoint(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    } });
Object.defineProperty(FriendSlop.prototype, "tapFeedAt", { configurable: true, writable: true, value: function tapFeedAt(clientX, clientY) {
        const pt = this.canvasPoint(clientX, clientY);
        // Tap-to-feed: tapping a friend lobs a homing slop straight at them
        for (let friend of this.friends) {
            const cx = friend.x + friend.width / 2;
            const cy = friend.y + friend.height / 2;
            if (Math.abs(pt.x - cx) < 55 && Math.abs(pt.y - cy) < 60) {
                this.registerTapRhythm();
                this.score += 25 * (1 + this.combo * 0.15);
                this.combo += 2;
                this.vibeMeter = Math.min(100, this.vibeMeter + 5);
                this.createParticles(cx, cy, '🎉');
                playSlopSound('feed');
                friend.bounce();
                return true;
            }
        }
        return false;
    } });
Object.defineProperty(FriendSlop.prototype, "spawnFriends", { configurable: true, writable: true, value: function spawnFriends() {
        const friendEmojis = ['😂', '🤪', '🎉', '🔥', '💀'];
        const spacing = canvas.width / 6;
        for (let i = 0; i < 5; i++) {
            const x = spacing + i * spacing;
            const emoji = friendEmojis[i % friendEmojis.length];
            this.friends.push(new Friend(x, 80, emoji));
        }
    } });
Object.defineProperty(FriendSlop.prototype, "spawnSlop", { configurable: true, writable: true, value: function spawnSlop() {
        if (Math.random() < 0.02 + this.wave * 0.005) {
            const x = Math.random() * canvas.width;
            const slopEmojis = ['🍝', '🍔', '🌮', '🍕', '🥗', '🍜', '🍱'];
            const emoji = slopEmojis[Math.floor(Math.random() * slopEmojis.length)];
            this.slop.push(new Slop(x, -30, emoji));
        }
    } });
Object.defineProperty(FriendSlop.prototype, "spawnHazards", { configurable: true, writable: true, value: function spawnHazards() {
        if (Math.random() < 0.008 + this.wave * 0.002) {
            const x = Math.random() * canvas.width;
            const hazardEmojis = ['😬', '🤢', '💩', '🚫'];
            const emoji = hazardEmojis[Math.floor(Math.random() * hazardEmojis.length)];
            this.hazards.push(new Hazard(x, -30, emoji));
        }
    } });
Object.defineProperty(FriendSlop.prototype, "createParticles", { configurable: true, writable: true, value: function createParticles(x, y, emoji) {
        for (let i = 0; i < 5; i++) {
            const vx = (Math.random() - 0.5) * 8;
            const vy = (Math.random() - 0.5) * 8 - 2;
            this.particles.push(new Particle(x, y, vx, vy, emoji));
        }
    } });
Object.defineProperty(FriendSlop.prototype, "screenShake", { configurable: true, writable: true, value: function screenShake() {
        this.shakeAmount = 5;
    } });
Object.defineProperty(FriendSlop.prototype, "shareScore", { configurable: true, writable: true, value: function shareScore() {
        const text = `I scored ${Math.floor(this.score)} points in FriendSlop! 🍝 Can you beat my score? Play now: https://4weird.com/games/friendslop`;
        
        if (navigator.share) {
            navigator.share({
                title: 'FriendSlop',
                text: text,
                url: window.location.href
            }).catch(err => console.log('Share failed:', err));
        } else {
            const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        }
    } });
