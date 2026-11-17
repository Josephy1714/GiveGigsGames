Object.defineProperties(Game.prototype, Object.getOwnPropertyDescriptors({
blink() {
        const angle = Math.atan2(this.mouse.y - this.player.y, this.mouse.x - this.player.x);
        this.spawnParticles(this.player.x, this.player.y, '✨', 6);
        this.player.x += Math.cos(angle) * 100;
        this.player.y += Math.sin(angle) * 100;
        this.player.x = Math.max(30, Math.min(770, this.player.x));
        this.player.y = Math.max(30, Math.min(470, this.player.y));
        this.blinkCooldown = 180;
        this.spawnParticles(this.player.x, this.player.y, '👻', 6);
        playSound('blink');
    },

castSpell() {
        if (this.player.mana < 10) return;
        this.player.mana -= 10;
        const angle = Math.atan2(this.mouse.y - this.player.y, this.mouse.x - this.player.x);
        const spellEmoji = this.player.voidBolt ? '⚡' : '💀';
        this.projectiles.push({
            x: this.player.x, y: this.player.y,
            vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8,
            damage: 15 + (this.player.voidBolt ? 15 : 0),
            piercing: this.player.voidBolt || false,
            life: 60, emoji: spellEmoji,
            trail: []
        });
        this.spawnParticles(this.player.x, this.player.y, '✨', 3);
        playSound('cast');
    },

addScorePop(x, y, text, color) {
        this.scorePops.push({ x, y, text, color: color || '#f5f5f5', life: 50, vy: -1.2 });
    },

addRipple(x, y) {
        this.ripples.push({ x, y, r: 10, maxR: 55, life: 30 });
    },

summonSkeleton() {
        if (this.player.mana < 25 || this.skeletons.length >= this.player.maxSkeletons || this.player.summonCooldown > 0) return;
        this.player.mana -= 25;
        this.player.summonCooldown = 180;
        this.skeletons.push({
            x: this.player.x + (Math.random() - 0.5) * 40,
            y: this.player.y + (Math.random() - 0.5) * 40 + 20,
            hp: 30 + (this.player.armyBonus || 0),
            maxHp: 30 + (this.player.armyBonus || 0),
            attackCooldown: 0,
            target: null
        });
        this.spawnParticles(this.player.x, this.player.y, '🦴', 5);
        playSound('summon');
    },

spawnParticles(x, y, emoji, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            this.particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * (2 + Math.random() * 2),
                vy: Math.sin(angle) * (2 + Math.random() * 2),
                life: 30 + Math.random() * 20,
                emoji: emoji,
                scale: 0.8 + Math.random() * 0.4
            });
        }
    },

spawnDebris() {
        const building = this.buildings.find(b => b.active);
        if (!building) return;
        this.debris.push({
            x: building.x + (Math.random() - 0.5) * 60,
            y: building.y,
            vx: (this.player.x - building.x) * 0.008 + (Math.random() - 0.5) * 2,
            vy: -4 - Math.random() * 3,
            damage: 10,
            emoji: '🧱',
            rotation: 0,
            rotSpeed: (Math.random() - 0.5) * 0.25
        });
    },

spawnGuards() {
        const building = this.buildings[2];
        for (let i = 0; i < 3; i++) {
            this.enemies.push({
                x: building.x + (Math.random() - 0.5) * 100,
                y: building.y + 50 + Math.random() * 50,
                hp: 50,
                maxHp: 50,
                vx: (Math.random() - 0.5) * 2,
                vy: 0,
                attackCooldown: 0,
                emoji: '👮'
            });
        }
    }
}));
