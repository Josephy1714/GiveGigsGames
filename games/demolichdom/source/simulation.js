Object.defineProperties(Game.prototype, Object.getOwnPropertyDescriptors({
update() {
        if (this.state !== STATE.PLAYING) return;
        if (window.gameDebug?.godMode) {
            this.player.hp = this.player.maxHp;
            this.player.mana = this.player.maxMana;
        }

        const t = Date.now() * 0.001;

        if (this.shakeTime > 0) {
            this.shake = 12 * Math.sin(this.shakeTime * 1.8) * (this.shakeTime / 30);
            this.shakeTime--;
        } else {
            this.shake = 0;
        }

        if (this.phaseFlash > 0) this.phaseFlash--;

        if (this.player.summonCooldown > 0) this.player.summonCooldown--;
        if (this.blinkCooldown > 0) this.blinkCooldown--;

        if (this.combo > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) this.combo = 0;
        }

        if (this.player.mana < this.player.maxMana) {
            this.player.mana = Math.min(this.player.maxMana, this.player.mana + this.player.manaRegen);
        }
        if (this.player.hpRegen && this.player.hp < this.player.maxHp) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.hpRegen);
        }

        let movingByTouch = false;
        if (this.joy && this.joy.active && (this.joy.dx || this.joy.dy)) {
            movingByTouch = true;
            const speed = this.player.speed;
            this.player.vx = this.joy.dx * speed;
            this.player.vy = this.joy.dy * speed;
            if (this.joy.dx < -0.2) this.player.facingLeft = true;
            if (this.joy.dx > 0.2) this.player.facingLeft = false;
        } else if (this.mouse.down) {
            const dx = this.mouse.x - this.player.x;
            const dy = this.mouse.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 20) {
                movingByTouch = true;
                const speed = this.player.speed;
                this.player.vx = (dx / dist) * speed;
                this.player.vy = (dy / dist) * speed;
                if (dx < 0) this.player.facingLeft = true;
                if (dx > 0) this.player.facingLeft = false;
            }
        }

        if (!movingByTouch) {
            if (this.keys['a'] || this.keys['arrowleft']) {
                this.player.vx = -this.player.speed;
                this.player.facingLeft = true;
            } else if (this.keys['d'] || this.keys['arrowright']) {
                this.player.vx = this.player.speed;
                this.player.facingLeft = false;
            } else {
                this.player.vx *= 0.85;
            }

            if (this.keys['w'] || this.keys['arrowup']) this.player.vy = -this.player.speed;
            else if (this.keys['arrowdown']) this.player.vy = this.player.speed;
            else this.player.vy *= 0.85;
        }

        this.starOffset.x += this.player.vx * 0.04;
        this.starOffset.y += this.player.vy * 0.04;

        this.player.x += this.player.vx;
        this.player.y += this.player.vy;
        this.player.x = Math.max(25, Math.min(775, this.player.x));
        this.player.y = Math.max(25, Math.min(475, this.player.y));

        this.projectiles = this.projectiles.filter(p => {
            if (p.trail) {
                p.trail.push({ x: p.x, y: p.y });
                if (p.trail.length > 5) p.trail.shift();
            }
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            return p.life > 0 && p.x >= 0 && p.x <= 800 && p.y >= 0 && p.y <= 500;
        });

        this.skeletons.forEach(skel => {
            skel.bobPhase = (skel.bobPhase || 0) + 0.12;
            const building = this.buildings.find(b => b.active);
            if (building) {
                const dx = building.x - skel.x;
                const dy = building.y - skel.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 50) {
                    skel.x += (dx / dist) * 1.5;
                    skel.y += (dy / dist) * 1.5;
                } else if (skel.attackCooldown <= 0) {
                    building.hp -= 8;
                    skel.attackCooldown = 45;
                    this.addRipple(building.x, building.y);
                    this.spawnParticles(building.x, building.y, '💥', 3);
                    playSound('hit');
                    const xpGain = 2 * this.phase;
                    this.player.xp += xpGain;
                    this.score += 10;
                    this.addScorePop(building.x + (Math.random()-0.5)*40, building.y - 30, '+10', '#10b981');
                    this.addScorePop(building.x + (Math.random()-0.5)*60, building.y + (Math.random()-0.5)*30, '-8 HP', '#ef4444');
                }
            }
            if (skel.attackCooldown > 0) skel.attackCooldown--;
        });

        this.updateEnemies();

        this.skeletons = this.skeletons.filter(s => s.hp > 0);

        this.debris = this.debris.filter(d => {
            d.x += d.vx;
            d.y += d.vy;
            d.vy += 0.3;
            d.rotation = (d.rotation || 0) + d.rotSpeed;
            const dist = Math.hypot(d.x - this.player.x, d.y - this.player.y);
            if (dist < 25) {
                if (!window.gameDebug?.godMode) {
                    this.player.hp -= d.damage;
                }
                this.shakeTime = 10;
                playSound('hit');
                return false;
            }
            return d.y <= 520;
        });

        this.buildings.forEach(b => {
            if (!b.active) return;
            if (b.phase >= 2 && b.attackCooldown-- <= 0) {
                this.spawnDebris();
                b.attackCooldown = b.phase === 3 ? 60 : 120;
            }
            if (b.hp <= 0) {
                this.spawnParticles(b.x, b.y, '🔥', 15);
                this.spawnParticles(b.x, b.y, '🧱', 10);
                b.active = false;
                this.advancePhase();
            }
        });

        const deadProjectiles = new Set();
        this.projectiles.forEach((p, pi) => {
            this.buildings.forEach(b => {
                if (!b.active || deadProjectiles.has(pi)) return;
                const dist = Math.hypot(p.x - b.x, p.y - (b.y + 30));
                if (dist < 60) {
                    b.hp -= p.damage;
                    const xpGain = 3 * this.phase;
                    this.player.xp += xpGain;
                    this.score += 15;
                    this.shake = 6;
                    this.shakeTime = 8;
                    this.addRipple(b.x, b.y + 30);
                    this.spawnParticles(p.x, p.y, '💥', 4);
                    this.spawnParticles(p.x, p.y, '✨', 3);
                    this.addScorePop(p.x, p.y - 15, '+15', '#8b5cf6');
                    this.addScorePop(p.x + (Math.random()-0.5)*40, p.y + (Math.random()-0.5)*20, `-${p.damage} HP`, '#a78bfa');
                    playSound('hit');
                    if (!p.piercing) deadProjectiles.add(pi);
                }
            });

            this.enemies.forEach(e => {
                if (e.hp <= 0 || deadProjectiles.has(pi)) return;
                const dist = Math.hypot(p.x - e.x, p.y - e.y);
                if (dist < 30) {
                    e.hp -= p.damage;
                    this.player.xp += 4;
                    this.score += 25;
                    this.shake = 4;
                    this.shakeTime = 6;
                    this.spawnParticles(p.x, p.y, '💥', 4);
                    this.spawnParticles(e.x, e.y, '💀', 2);
                    this.addScorePop(e.x, e.y - 15, `-${p.damage}`, '#ef4444');
                    playSound('hit');
                    if (e.hp <= 0) {
                        this.rewardEnemyDefeat(e);
                    }
                    if (!p.piercing) deadProjectiles.add(pi);
                }
            });
        });
        this.projectiles = this.projectiles.filter((_, i) => !deadProjectiles.has(i));
        this.enemies = this.enemies.filter(e => e.hp > 0);

        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.vx *= 0.95;
            p.vy *= 0.95;
            return p.life > 0;
        });

        this.ripples = this.ripples.filter(r => {
            r.r += (r.maxR - r.r) * 0.15;
            r.life--;
            return r.life > 0;
        });

        this.scorePops = this.scorePops.filter(sp => {
            sp.y += sp.vy;
            sp.life--;
            return sp.life > 0;
        });

        if (this.player.hp <= 0) this.lose();
        this.checkLevelUp();
        this.updateUI();
    }
}));
