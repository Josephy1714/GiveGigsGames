Object.defineProperties(Game.prototype, Object.getOwnPropertyDescriptors({
updateEnemies() {
        const defeated = [];
        this.enemies.forEach(enemy => {
            if (enemy.hp <= 0) { defeated.push(enemy); return; }

            let target = this.player;
            let targetDistance = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
            this.skeletons.forEach(skeleton => {
                const distance = Math.hypot(skeleton.x - enemy.x, skeleton.y - enemy.y);
                if (distance < targetDistance) { target = skeleton; targetDistance = distance; }
            });

            const dx = target.x - enemy.x;
            const dy = target.y - enemy.y;
            if (targetDistance > 30) {
                const pace = enemy.speed || 1;
                enemy.x += (dx / targetDistance) * pace;
                enemy.y += (dy / targetDistance) * pace;
            } else if (enemy.attackCooldown <= 0) {
                if (target === this.player) {
                    target.hp -= enemy.damage || 8;
                    target.x = Math.max(25, Math.min(775, target.x + (dx / (targetDistance || 1)) * 12));
                    target.y = Math.max(25, Math.min(475, target.y + (dy / (targetDistance || 1)) * 12));
                    this.shakeTime = Math.max(this.shakeTime, 8);
                    this.addScorePop(target.x, target.y - 28, `-${enemy.damage || 8} HP`, '#ef4444');
                    playSound('hit');
                } else {
                    target.hp -= enemy.damage || 10;
                    if (target.hp <= 0) this.spawnParticles(target.x, target.y, '🦴', 8);
                }
                enemy.attackCooldown = 60;
            }
            enemy.x += enemy.vx;
            if (enemy.x < 50 || enemy.x > 750) enemy.vx *= -1;
            if (enemy.attackCooldown > 0) enemy.attackCooldown--;
            if (enemy.hp <= 0) defeated.push(enemy);
        });
        defeated.forEach(enemy => this.rewardEnemyDefeat(enemy));
        this.enemies = this.enemies.filter(enemy => enemy.hp > 0);
    }
}));
