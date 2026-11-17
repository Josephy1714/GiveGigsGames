Object.defineProperties(Game.prototype, Object.getOwnPropertyDescriptors({
updateUI() {
        const setMeter = (meterId, fillId, readoutId, value, maximum, format) => {
            const safeMaximum = Math.max(1, maximum);
            const safeValue = Math.max(0, Math.min(safeMaximum, value));
            const percent = safeValue / safeMaximum * 100;
            const fill = document.getElementById(fillId);
            const width = percent + '%';
            if (fill.style.width !== width) fill.style.width = width;
            const meter = document.getElementById(meterId);
            const valueText = format(safeValue, safeMaximum);
            const aria = { 'aria-valuemax': Math.round(safeMaximum), 'aria-valuenow': Math.round(safeValue), 'aria-valuetext': valueText };
            Object.entries(aria).forEach(([name, value]) => { if (meter.getAttribute(name) !== String(value)) meter.setAttribute(name, value); });
            const readout = document.getElementById(readoutId);
            if (readout.textContent !== String(valueText)) readout.textContent = valueText;
            return percent;
        };
        const hpPct = setMeter('hpMeter', 'hpBar', 'hpReadout', this.player.hp, this.player.maxHp, value => Math.ceil(value));
        document.getElementById('hpBar').style.boxShadow = hpPct < 30 ? '0 0 12px #ef4444' : '';
        setMeter('manaMeter', 'manaBar', 'manaReadout', this.player.mana, this.player.maxMana, value => Math.floor(value));
        setMeter('xpMeter', 'xpBar', 'xpReadout', this.player.xp, this.player.maxXp, (value, maximum) => `${Math.floor(value)} / ${Math.floor(maximum)}`);
        document.getElementById('levelDisplay').textContent = this.player.level;
        document.getElementById('scoreDisplay').textContent = this.score;
        const phaseNames = ['', 'Church', 'Factory', 'BOSS'];
        document.getElementById('phaseDisplay').textContent = 'P' + this.phase + ' ' + (phaseNames[this.phase] || '');
        document.getElementById('skeletonCount').textContent = this.skeletons.length + '/' + this.player.maxSkeletons;
        document.getElementById('comboDisplay').textContent = this.combo >= 2 ? 'x' + this.combo + ' COMBO' : '';
        if (this.player.hasBlink) {
            const blinkReady = Math.max(0, 180 - this.blinkCooldown);
            setMeter('blinkMeter', 'blinkBarFill', 'blinkReadout', blinkReady, 180, (value, maximum) => value >= maximum ? 'Ready' : `${Math.ceil((maximum - value) / 60)}s`);
            document.getElementById('blinkBar').style.display = 'flex';
            const btnBlink = document.getElementById('btnBlinkMobile');
            if (btnBlink) btnBlink.style.display = 'flex';
        } else {
            document.getElementById('blinkBar').style.display = 'none';
            const btnBlink = document.getElementById('btnBlinkMobile');
            if (btnBlink) btnBlink.style.display = 'none';
        }
        document.getElementById('highScoreDisplay').textContent = this.highScore;
    },

draw() {
        ctx.save();
        if (this.shake !== 0) {
            ctx.translate(this.shake, this.shake * 0.5);
        }

        ctx.clearRect(0, 0, 800, 500);

        const skyGrad = ctx.createLinearGradient(0, 0, 0, 500);
        skyGrad.addColorStop(0, '#0f0f23');
        skyGrad.addColorStop(0.5, '#1a1a3e');
        skyGrad.addColorStop(1, '#2a2a4e');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, 800, 500);

        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🌕', 70 + this.starOffset.x * 0.3, 100 + this.starOffset.y * 0.3);

        for (let i = 0; i < 24; i++) {
            const sx = ((i * 137 + this.starOffset.x * 0.6) % 800 + 800) % 800;
            const sy = ((i * 73 + this.starOffset.y * 0.6) % 200 + 200) % 200 + 10;
            const alpha = 0.3 + Math.sin(Date.now() * 0.001 + i) * 0.2;
            ctx.globalAlpha = alpha;
            ctx.font = '12px Arial';
            ctx.fillText('✨', sx, sy);
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 420, 800, 80);

        ctx.strokeStyle = 'rgba(139, 92, 246, 0.08)';
        ctx.lineWidth = 1;
        for (let gx = 0; gx < 800; gx += 40) {
            ctx.beginPath();
            ctx.moveTo(gx, 420);
            ctx.lineTo(gx, 500);
            ctx.stroke();
        }

        this.rubble.forEach(r => {
            ctx.font = (30 * r.scale) + 'px Arial';
            ctx.textAlign = 'center';
            ctx.globalAlpha = 0.6;
            ctx.fillText(r.emoji, r.x, r.y);
            ctx.globalAlpha = 1;
        });

        this.ripples.forEach(r => {
            const alpha = r.life / 30 * 0.5;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });

        this.buildings.forEach(b => {
            if (!b.active) return;
            ctx.font = '80px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let healthPct = b.hp / b.maxHp;
            let emoji = b.emoji;
            if (healthPct < 0.7) emoji = '💢';
            if (healthPct < 0.3) emoji = '🔥';

            ctx.fillText(emoji, b.x, b.y);

            if (b.guards) {
                ctx.font = '20px Arial';
                ctx.fillText('👮', b.x - 40, b.y + 50);
                ctx.fillText('👮', b.x + 40, b.y + 50);
                ctx.fillText('👮', b.x, b.y + 60);
            }

            if (b.type === 'skyscraper') {
                ctx.save();
                ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
                ctx.fillRect(200, 20, 400, 24);
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                ctx.strokeRect(199, 19, 402, 26);
                
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(201, 21, 398 * healthPct, 22);
                
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px Orbitron, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🏙️ SKYSCRAPER BOSS: ' + Math.floor(b.hp) + ' / ' + b.maxHp, 400, 32);
                ctx.restore();
            }

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(b.x - 40, b.y - 70, 80, 8);
            const hpColor = healthPct > 0.5 ? '#10b981' : healthPct > 0.25 ? '#f59e0b' : '#ef4444';
            ctx.fillStyle = hpColor;
            ctx.fillRect(b.x - 38, b.y - 68, 76 * healthPct, 4);
            if (healthPct < 0.3) {
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 8;
                ctx.fillRect(b.x - 38, b.y - 68, 76 * healthPct, 4);
                ctx.shadowBlur = 0;
            }

            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Arial';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(Math.floor(b.hp), b.x, b.y - 80);
        });

        this.skeletons.forEach(s => {
            const bob = Math.sin(s.bobPhase || 0) * 3;
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('💀', s.x, s.y + bob);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(s.x - 15, s.y - 28 + bob, 30, 4);
            ctx.fillStyle = '#10b981';
            ctx.fillRect(s.x - 14, s.y - 27 + bob, 28 * (s.hp / s.maxHp), 2);
        });

        this.enemies.forEach(e => {
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(e.emoji, e.x, e.y);
        });

        this.projectiles.forEach(p => {
            if (p.trail && p.trail.length > 1) {
                for (let ti = 0; ti < p.trail.length; ti++) {
                    const alpha = (ti / p.trail.length) * 0.4;
                    const sz = (12 + ti * 2);
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.font = sz + 'px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(p.emoji, p.trail[ti].x, p.trail[ti].y);
                    ctx.restore();
                }
            }
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(p.emoji, p.x, p.y);
        });

        this.debris.forEach(d => {
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rotation || 0);
            ctx.font = '22px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(d.emoji, 0, 0);
            ctx.restore();
        });

        ctx.save();
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (this.player.facingLeft) {
            ctx.scale(-1, 1);
            ctx.fillText('🧙‍♂️', -this.player.x, this.player.y);
        } else {
            ctx.fillText('🧙‍♂️', this.player.x, this.player.y);
        }
        ctx.restore();

        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life / 30;
            ctx.font = (20 * p.scale) + 'px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(p.emoji, p.x, p.y);
            ctx.restore();
        });

        this.scorePops.forEach(sp => {
            ctx.save();
            ctx.globalAlpha = sp.life / 50;
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = sp.color;
            ctx.shadowColor = sp.color;
            ctx.shadowBlur = 6;
            ctx.fillText(sp.text, sp.x, sp.y);
            ctx.restore();
        });

        if (this.phaseFlash > 0) {
            const alpha = (this.phaseFlash / 30) * 0.35;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.phaseFlashColor;
            ctx.fillRect(0, 0, 800, 500);
            ctx.restore();
        }

        const hpPct = this.player.hp / this.player.maxHp;
        if (hpPct < 0.3) {
            const pulse = 0.5 + Math.sin(Date.now() * 0.006) * 0.5;
            const vigAlpha = (1 - hpPct / 0.3) * 0.45 * pulse;
            const vigGrad = ctx.createRadialGradient(400, 250, 200, 400, 250, 400);
            vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
            vigGrad.addColorStop(1, `rgba(180,0,0,${vigAlpha})`);
            ctx.fillStyle = vigGrad;
            ctx.fillRect(0, 0, 800, 500);
        }

        ctx.restore();
    }
}));
