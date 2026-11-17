Object.defineProperty(FriendSlop.prototype, "update", { configurable: true, writable: true, value: function update() {
        if (this.state !== GAME_STATE.PLAYING) return;
        
        this.time++;
        
        // Wave progression
        this.wave = Math.floor(this.time / 300) + 1;
        
        // Update players
        for (let player of this.players) {
            player.update();
        }
        
        // Spawn entities
        this.spawnSlop();
        this.spawnHazards();
        
        // Update slop
        for (let i = this.slop.length - 1; i >= 0; i--) {
            this.slop[i].update();
            
            if (this.slop[i].y > canvas.height) {
                this.slop.splice(i, 1);
                this.vibeMeter -= 5;
                this.combo = 0;
                continue;
            }
            
            // Check collision with players
            let hitPlayer = false;
            for (let player of this.players) {
                if (player.collidesWith(this.slop[i])) {
                    this.slop.splice(i, 1);
                    this.score += 10 * (1 + this.combo * 0.1);
                    this.combo++;
                    this.vibeMeter = Math.min(100, this.vibeMeter + 2);
                    this.createParticles(player.x, player.y, '✨');
                    playSlopSound('catch');
                    hitPlayer = true;
                    break;
                }
            }
            if (hitPlayer) continue;
            
            // Check collision with friends
            for (let friend of this.friends) {
                if (friend.collidesWith(this.slop[i])) {
                    this.slop.splice(i, 1);
                    this.score += 25 * (1 + this.combo * 0.15);
                    this.combo += 2;
                    this.vibeMeter = Math.min(100, this.vibeMeter + 5);
                    this.createParticles(friend.x, friend.y, '🎉');
                    playSlopSound('feed');
                    friend.bounce();
                    break;
                }
            }
        }
        
        // Update hazards
        for (let i = this.hazards.length - 1; i >= 0; i--) {
            this.hazards[i].update();
            
            if (this.hazards[i].y > canvas.height) {
                this.hazards.splice(i, 1);
                continue;
            }
            
            // Check collision with players
            for (let player of this.players) {
                if (player.collidesWith(this.hazards[i])) {
                    this.hazards.splice(i, 1);
                    this.vibeMeter -= 15;
                    this.combo = 0;
                    this.createParticles(player.x, player.y, '💥');
                    playSlopSound('hazard');
                    this.screenShake();
                    break;
                }
            }
        }
        
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update();
            
            if (this.projectiles[i].y < 0 || this.projectiles[i].x < 0 || this.projectiles[i].x > canvas.width) {
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Check collision with friends
            for (let friend of this.friends) {
                if (friend.collidesWith(this.projectiles[i])) {
                    this.projectiles.splice(i, 1);
                    this.score += 50 * (1 + this.combo * 0.2);
                    this.combo += 3;
                    this.vibeMeter = Math.min(100, this.vibeMeter + 8);
                    this.createParticles(friend.x, friend.y, '💥');
                    playSlopSound('feed');
                    friend.bounce();
                    break;
                }
            }
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Update friends
        for (let friend of this.friends) {
            friend.update();
        }
        
        // Vibe meter decay
        this.vibeMeter = Math.max(0, this.vibeMeter - 0.1);
        
        // Game over condition
        if (this.vibeMeter <= 0) {
            this.gameOver();
        }
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try { localStorage.setItem('friendslop-high-score', this.highScore); } catch (e) { /* ignore */ }
            document.getElementById('friendslop-4weird-high-score').textContent = Math.floor(this.highScore);
        }
    } });
