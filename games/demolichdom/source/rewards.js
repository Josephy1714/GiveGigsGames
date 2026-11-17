Object.defineProperties(Game.prototype, Object.getOwnPropertyDescriptors({
rewardEnemyDefeat(enemy) {
        if (enemy.rewardClaimed) return false;
        enemy.rewardClaimed = true;
        this.spawnParticles(enemy.x, enemy.y, '💥', 6);
        this.spawnParticles(enemy.x, enemy.y, '✨', 8);
        this.spawnParticles(enemy.x, enemy.y, '💀', 4);
        playSound('enemydeath');
        this.combo++;
        this.comboTimer = 120;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        const bonus = this.combo >= 3 ? this.combo * 15 : 50;
        this.score += bonus;
        this.addScorePop(enemy.x, enemy.y - 25, (this.combo >= 3 ? `COMBO x${this.combo}! ` : '') + `SOUL HARVEST +${bonus}`, this.combo >= 3 ? '#f59e0b' : '#ef4444');
        if (this.combo >= 3) playSound('combo');
        return true;
    }
}));
