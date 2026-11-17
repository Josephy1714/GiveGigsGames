(function () {
    'use strict';

const ProceduralTextures = window.GraveGainProceduralTextures;

class Projectile {
    constructor(x, y, z, vx, vy, vz, dmg, isPlayer, color = 0xa855f7, type = 'magic') {
        this.x = x;
        this.y = y;
        this.z = z;
        this.previousX = x;
        this.previousY = y;
        this.previousZ = z;
        this.vx = vx;
        this.vy = vy;
        this.vz = vz;
        this.dmg = dmg;
        this.isPlayer = isPlayer;
        this.color = color;
        this.type = type;
        this.life = 2.5;
        this.radius = type === 'grenade' ? 12 : (type === 'launcher' ? 10 : 8);
        this.dead = false;
        this.collisionImpact = false;
        this.fuse = type === 'grenade' ? 1.35 : (type === 'launcher' ? 2.4 : 0);

        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(type === 'grenade' ? 5 : (type === 'launcher' ? 4 : 2.5), 10, 8),
            new THREE.MeshBasicMaterial({ color })
        );
        this.mesh.position.set(x, y, z);
    }

    update(dt, tilemap) {
        this.collisionImpact = false;
        if (this.type === 'grenade' || this.type === 'launcher') {
            this.fuse -= dt;
            this.vy -= (this.type === 'grenade' ? 420 : 220) * dt;
        }
        this.life -= dt;
        if (this.life <= 0 || ((this.type === 'grenade' || this.type === 'launcher') && this.fuse <= 0)) {
            this.dead = true;
            return;
        }

        const startX = this.x;
        const startY = this.y;
        const startZ = this.z;
        this.previousX = startX;
        this.previousY = startY;
        this.previousZ = startZ;
        let dx = this.vx * dt;
        let dy = this.vy * dt;
        let dz = this.vz * dt;
        this.x += dx;
        this.y += dy;
        this.z += dz;
        if ((this.type === 'grenade' || this.type === 'launcher') && this.y <= this.radius * 0.5) {
            const groundY = this.radius * 0.5;
            const impactT = dy < 0 ? THREE.MathUtils.clamp((startY - groundY) / -dy, 0, 1) : 1;
            dx *= impactT;
            dy *= impactT;
            dz *= impactT;
            this.x = startX + dx;
            this.y = groundY;
            this.z = startZ + dz;
            this.dead = true;
            this.collisionImpact = true;
        }

        // Sweep the full frame movement in short steps, so a fast projectile
        // cannot skip a wall tile during a long or low-frame-rate update.
        const grid = tilemap?.grid;
        if (grid) {
            const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 12));
            const isExplosive = this.type === 'grenade' || this.type === 'launcher';
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const sampleX = startX + dx * t;
                const sampleY = startY + dy * t;
                const sampleZ = startZ + dz * t;
                const tx = Math.floor(sampleX / 48);
                const tz = Math.floor(sampleZ / 48);
                const outOfBounds = tx < 0 || tx >= tilemap.gridSize || tz < 0 || tz >= tilemap.gridSize;
                const cell = outOfBounds ? 1 : grid[tx]?.[tz];
                if ((cell === 1 || cell === 6) && (!isExplosive || sampleY <= 72)) {
                    this.x = sampleX;
                    this.y = sampleY;
                    this.z = sampleZ;
                    this.dead = true;
                    this.collisionImpact = true;
                    break;
                }
            }
        }
        this.mesh.position.set(this.x, this.y, this.z);
    }

    dispose() {
        if (this.mesh) {
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            this.mesh = null;
        }
    }
}

class DungeonProp {
    constructor(x, z, type = 'crate') {
        this.x = x;
        this.z = z;
        this.type = type;
        this.hp = type === 'chest' ? 1 : 15;
        this.radius = 16;
        this.broken = false;
        this.group3d = new THREE.Group();

        if (type === 'crate') {
            const geo = new THREE.BoxGeometry(20, 20, 20);
            const mat = new THREE.MeshStandardMaterial({
                map: ProceduralTextures.createWoodCrateTexture(),
                roughness: 0.8
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = 10;
            this.group3d.add(mesh);
        } else if (type === 'chest') {
            const geo = new THREE.BoxGeometry(24, 16, 18);
            const mat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.4, roughness: 0.4 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = 8;
            this.group3d.add(mesh);

            const lock = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 2), new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9 }));
            lock.position.set(0, 8, 9.5);
            this.group3d.add(lock);
        }

        this.group3d.position.set(x, 0, z);
    }

    destroy() {
        if (window.GraveGainGame) window.GraveGainGame.scene.remove(this.group3d);
    }
}

    window.GraveGainProjectile = Projectile;
    window.GraveGainDungeonProp = DungeonProp;
})();
