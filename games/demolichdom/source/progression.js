Object.defineProperties(Game.prototype, Object.getOwnPropertyDescriptors({
setupBuildings() {
        this.buildings = [{
            x: 400, y: 150,
            hp: 300, maxHp: 300,
            type: 'church',
            emoji: '⛪',
            active: true,
            phase: 1,
            attackCooldown: 0
        }];
    },

checkLevelUp() {
        if (this.player.xp >= this.player.maxXp) {
            this.player.xp -= this.player.maxXp;
            this.player.level++;
            this.player.maxXp = Math.floor(this.player.maxXp * 1.25);
            playSound('levelup');
            this.showUpgradeMenu();
        }
    },

showUpgradeMenu() {
        this.state = STATE.UPGRADE;
        const options = [];
        const available = [...this.upgrades];
        for (let i = 0; i < 3 && available.length > 0; i++) {
            const idx = Math.floor(Math.random() * available.length);
            options.push(available.splice(idx, 1)[0]);
        }
        this.activeUpgradeOptions = options;
        window.dlScreens.showUpgrade(options);
        document.getElementById('upgradeMenu').classList.remove('hidden');
        document.querySelector('#upgradeOptions .dl-upgrade-choice')?.focus();
    },

applyUpgrade(id) {
        switch(id) {
            case 'mana':
                this.player.maxMana += 30;
                this.player.manaRegen *= 1.5;
                this.player.mana = this.player.maxMana;
                break;
            case 'army':
                this.player.maxSkeletons += 2;
                this.player.armyBonus = (this.player.armyBonus || 0) + 5;
                break;
            case 'spell':
                this.player.voidBolt = true;
                break;
            case 'speed':
                this.player.speed *= 1.3;
                this.player.hasBlink = true;
                break;
            case 'armor':
                this.player.maxHp += 25;
                this.player.hpRegen = (this.player.hpRegen || 0) + 0.1;
                this.player.hp = this.player.maxHp;
                break;
        }
        document.getElementById('upgradeMenu').classList.add('hidden');
        this.state = STATE.PLAYING;
        canvas.focus();
    },

showPhaseText(text) {
        const el = document.getElementById('phaseIndicator');
        el.textContent = text;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 2500);
    },

advancePhase() {
        this.buildingsDestroyed++;
        const phaseScore = 1000 * this.phase;
        this.score += phaseScore;
        this.shake = 25;
        this.shakeTime = 30;
        this.phaseFlash = 30;
        playSound('explosion');
        const destroyedBuilding = this.buildings.find(b => b.hp <= 0);
        if (destroyedBuilding) {
            this.rubble.push({
                x: destroyedBuilding.x,
                y: destroyedBuilding.y + 20,
                emoji: '🪨',
                scale: 1.5 + Math.random() * 0.5
            });
            this.rubble.push({
                x: destroyedBuilding.x - 25 + Math.random() * 50,
                y: destroyedBuilding.y + 35,
                emoji: '🧱',
                scale: 0.8 + Math.random() * 0.4
            });
        }
        if (this.phase === 1) {
            this.phase = 2;
            this.phaseFlashColor = '#f59e0b';
            this.showPhaseText('PHASE 2 - FACTORY!');
            this.buildings.push({
                x: 200, y: 120,
                hp: 500, maxHp: 500,
                type: 'factory',
                emoji: '🏭',
                active: true,
                phase: 2,
                attackCooldown: 0
            });
            this.buildings[0].active = false;
        } else if (this.phase === 2) {
            this.phase = 3;
            this.phaseFlashColor = '#ef4444';
            this.showPhaseText('PHASE 3 - BOSS!');
            this.buildings.push({
                x: 600, y: 100,
                hp: 1000, maxHp: 1000,
                type: 'skyscraper',
                emoji: '🏙️',
                active: true,
                phase: 3,
                attackCooldown: 0,
                guards: true
            });
            this.buildings[1].active = false;
            this.spawnGuards();
        } else {
            this.win();
        }
    }
}));
