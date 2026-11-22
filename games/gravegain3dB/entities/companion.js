(function () {
    'use strict';

    const skins = {
        ember: [0x6b322e, 0xffac57],
        glacier: [0x244363, 0x6ff5ff],
        orchid: [0x4e2d68, 0xf5a1ff],
        moss: [0x30493c, 0xa2f287],
        void: [0x28264f, 0x9b8cff],
        sunflare: [0x674321, 0xffd166],
        deepsea: [0x174e5f, 0x55e6cf]
    };

    class Companion {
        constructor(chassis, skin) {
            this.cat = chassis === 'cat';
            this.name = this.cat ? 'Pounce' : 'Bulwark';
            this.maxHp = this.cat ? 72 : 112;
            this.hp = this.maxHp;
            this.revives = 1;
            this.mood = 0;
            this.time = 0;
            this.nextShot = 0;
            this.nextPet = 0;
            this.rescueUntil = 0;
            const [paint, glow] = skins[skin] || skins.glacier;
            this.glow = glow;
            this.lightMaterial = new THREE.MeshBasicMaterial({ color: glow });
            this.mesh = new THREE.Group();
            const shell = new THREE.MeshStandardMaterial({ color: paint, metalness: 0.45, roughness: 0.42 });
            const light = this.lightMaterial;
            const add = (geometry, material, x, y, z) => {
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(x, y, z);
                this.mesh.add(mesh);
                return mesh;
            };
            add(new THREE.BoxGeometry(this.cat ? 13 : 17, 9, 18), shell, 0, 0, 4);
            add(new THREE.BoxGeometry(13, 11, 10), shell, 0, 3, -7);
            add(new THREE.BoxGeometry(this.cat ? 8 : 10, 2, 1), light, 0, 4, -12.2);
            if (!this.cat) add(new THREE.BoxGeometry(8, 5, 5), shell, 0, 0, -13);
            for (const side of [-1, 1]) {
                if (this.cat) add(new THREE.ConeGeometry(3, 7, 4), shell, side * 4, 11, -6);
                else add(new THREE.BoxGeometry(3, 9, 5), shell, side * 7, 1, -6).rotation.z = side * 0.25;
                add(new THREE.BoxGeometry(4, 5, 13), shell, side * 10, -2, 5);
                add(new THREE.BoxGeometry(3, 1, 7), light, side * 10, -5, 5);
            }
            this.tail = add(new THREE.BoxGeometry(2, 2, this.cat ? 13 : 8), shell, 0, 1, 17);
            this.hoverRing = add(new THREE.TorusGeometry(this.cat ? 14 : 17, 0.65, 6, 28),
                new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.34,
                    blending: THREE.AdditiveBlending, depthWrite: false }), 0, -13, 3);
            this.hoverRing.rotation.x = Math.PI / 2;
            this.thrusters = [];
            for (const side of [-1, 1]) {
                const engine = add(new THREE.CylinderGeometry(2.8, 2.2, 5, 8), shell, side * 7, -8, 5);
                engine.rotation.z = side * 0.12;
                const flame = add(new THREE.ConeGeometry(2.3, 7, 7), light, side * 7, -13, 5);
                flame.rotation.z = Math.PI;
                this.thrusters.push(flame);
            }
            if (!this.cat) {
                const cannon = add(new THREE.CylinderGeometry(2.3, 2.9, 7, 8), shell, 0, 1, -16);
                cannon.rotation.x = Math.PI / 2;
                const muzzle = add(new THREE.TorusGeometry(2.4, 0.48, 6, 12), light, 0, 1, -19.5);
                muzzle.rotation.x = Math.PI / 2;
            }
            const flashMaterial = new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.9,
                blending: THREE.AdditiveBlending, depthWrite: false });
            this.attackFlash = add(new THREE.SphereGeometry(this.cat ? 2 : 3.2, 8, 6), flashMaterial,
                0, this.cat ? 4 : 1, this.cat ? -14 : -20);
            this.attackFlash.visible = false;
            this.attackFlashTimer = 0;
            this.attackLight = new THREE.PointLight(glow, 0, 52, 2);
            this.attackLight.position.copy(this.attackFlash.position);
            this.mesh.add(this.attackLight);
        }

        place(game) {
            const p = game.player;
            this.mesh.position.set(p.x + 30, p.yElevation + 32, p.y);
            game.scene.add(this.mesh);
        }

        pet(game) {
            const p = game.player;
            const at = this.mesh.position;
            if (this.time < this.nextPet || Math.hypot(p.x - at.x, p.yElevation + 20 - at.y, p.y - at.z) > 84 ||
                !game.hasBlastLineOfSight(p.x, p.y, at.x, at.z, p.yElevation + 20, at.y)) return;
            this.nextPet = this.time + 3;
            const healed = Math.min(32, this.maxHp - this.hp);
            this.hp = Math.min(this.maxHp, this.hp + 32);
            this.mood = this.time + 18;
            game.vfx.spawnSparks(at.x, at.z, 0xff9ed3, 8, at.y);
            game.combatText.spawnText(at.x, at.y + 18, at.z, healed > 0 ? `HAPPY · +${healed} BOT HP` : 'HAPPY · BOT PATTED', 'pet-happy');
            game.audio.playSfx('loot', 1.45);
        }

        revive(player) {
            if (!this.revives || this.hp <= 0) return false;
            this.revives--;
            this.rescueUntil = this.time + 2;
            player.hp = Math.ceil(player.maxHp * 0.45);
            return true;
        }

        update(dt, game) {
            if (dt <= 0) return;
            this.time += dt;
            const p = game.player;
            const at = this.mesh.position;
            const forwardX = -Math.sin(p.yaw);
            const forwardZ = -Math.cos(p.yaw);
            const offset = this.cat ? Math.sin(this.time * 4) * 13 + 37 : 37;
            const x = p.x - forwardZ * offset + forwardX * 18;
            const z = p.y + forwardX * offset + forwardZ * 18;
            const available = !game.physics.isColliding(x, z, 8, game.dungeon);
            const nextX = available ? x : p.x;
            const nextZ = available ? z : p.y;
            const ceiling = game.physics.ceilingAt(game.dungeon, nextX, nextZ);
            const desiredY = Math.min(ceiling - 16, p.yElevation + (this.hp > 0 ? 38 : 14) + Math.sin(this.time * 5) * 3);
            const blend = 1 - Math.exp(-dt * (this.cat ? 12 : 8));
            const stepX = at.x + (nextX - at.x) * blend;
            const stepZ = at.z + (nextZ - at.z) * blend;
            if (Math.hypot(at.x - p.x, at.z - p.y) > 160 ||
                game.physics.isColliding(stepX, stepZ, 8, game.dungeon)) {
                at.set(nextX, desiredY, nextZ);
            } else {
                at.set(stepX, at.y + (desiredY - at.y) * blend, stepZ);
            }
            this.tail.rotation.y = Math.sin(this.time * (this.mood > this.time ? 14 : 4)) * 0.45;
            this.hoverRing.rotation.y = this.time * (this.cat ? 1.6 : -0.9);
            this.hoverRing.material.opacity = 0.25 + (Math.sin(this.time * 7) + 1) * 0.08;
            const thrust = 0.78 + (Math.sin(this.time * 13) + 1) * 0.18;
            for (const flame of this.thrusters) flame.scale.y = thrust;
            this.attackFlashTimer = Math.max(0, this.attackFlashTimer - dt);
            this.attackFlash.visible = this.attackFlashTimer > 0;
            this.attackFlash.scale.setScalar(0.8 + this.attackFlashTimer * 3.5);
            this.attackLight.intensity = this.attackFlashTimer > 0 ? (this.cat ? 2.8 : 5.5) : 0;
            this.lightMaterial.color.setHex(this.mood > this.time
                ? (Math.sin(this.time * 12) > -0.2 ? 0xff9ed3 : this.glow)
                : this.glow);
            if (this.hp <= 0 || this.time < this.nextShot) return;
            this.nextShot = this.time + (this.cat ? 0.34 : 1.05);
            let target = null;
            let range = 285;
            for (const enemy of game.enemies) {
                const distance = Math.hypot(enemy.x - at.x, enemy.y - at.z);
                if (enemy.hp <= 0 || distance >= range ||
                    !game.hasBlastLineOfSight(at.x, at.z, enemy.x, enemy.y, at.y, enemy.yElevation + 20)) continue;
                range = distance;
                target = enemy;
            }
            if (!target) return;
            const hit = new THREE.Vector3(target.x, target.yElevation + 20, target.y);
            const direction = hit.clone().sub(at).normalize();
            this.mesh.rotation.y = Math.atan2(-direction.x, -direction.z);
            this.attackFlashTimer = this.cat ? 0.09 : 0.16;
            game.spawnWeaponTracer(at, hit, this.glow);
            game.applyHitToEnemy(target, this.cat ? 7 : 23, direction, 1, 0, null, hit, 'shot', this.cat ? undefined : 'impact');
        }

        dispose(game) {
            game.scene.remove(this.mesh);
            const materials = new Set();
            this.mesh.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) materials.add(object.material);
            });
            materials.forEach(material => material.dispose());
        }
    }

    window.GraveGainCompanion = Companion;
})();
