Object.defineProperty(FriendSlop.prototype, "draw", { configurable: true, writable: true, value: function draw() {
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Apply screen shake
        if (this.shakeAmount) {
            const shake = Math.random() * this.shakeAmount - this.shakeAmount / 2;
            ctx.translate(shake, 0);
            this.shakeAmount *= 0.9;
        }
        
        // Draw grid background
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
        
        // Draw friends
        for (let friend of this.friends) {
            friend.draw(ctx);
        }
        
        // Draw slop
        for (let slop of this.slop) {
            slop.draw(ctx);
        }
        
        // Draw hazards
        for (let hazard of this.hazards) {
            hazard.draw(ctx);
        }
        
        // Draw projectiles
        for (let projectile of this.projectiles) {
            projectile.draw(ctx);
        }
        
        // Draw particles
        for (let particle of this.particles) {
            particle.draw(ctx);
        }
        
        // Draw players
        for (let player of this.players) {
            player.draw(ctx);
        }
        
        // Draw HUD
        this.drawHUD();
    } });
Object.defineProperty(FriendSlop.prototype, "drawHUD", { configurable: true, writable: true, value: function drawHUD() {
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 20px Orbitron';
        ctx.textAlign = 'left';
        
        ctx.fillText(`Score: ${Math.floor(this.score)}`, 20, 30);
        ctx.fillText(`Wave: ${this.wave}`, 20, 60);
        ctx.fillText(`Combo: ${this.combo}x`, 20, 90);
        
        // Vibe meter
        const meterWidth = 200;
        const meterHeight = 20;
        const meterX = canvas.width - meterWidth - 20;
        const meterY = 20;
        
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 12px Orbitron';
        ctx.textAlign = 'right';
        ctx.fillText('VIBE', meterX - 10, meterY + 15);
        
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);
        
        const fillColor = this.vibeMeter > 50 ? '#00ff00' : this.vibeMeter > 25 ? '#ffff00' : '#ff0000';
        ctx.fillStyle = fillColor;
        ctx.fillRect(meterX + 2, meterY + 2, (meterWidth - 4) * (this.vibeMeter / 100), meterHeight - 4);
    } });
Object.defineProperty(FriendSlop.prototype, "gameLoop", { configurable: true, writable: true, value: function gameLoop(timestamp = performance.now()) {
        if (this.state === GAME_STATE.PLAYING) neonClock.advance(timestamp, () => this.update(), () => this.state === GAME_STATE.PLAYING);
        else neonClock.reset();
        this.draw();
        requestAnimationFrame(next => this.gameLoop(next));
    } });
