(function() {
    'use strict';

    class EnemyEntity {
        constructor(typeData, x, y, difficultyScale = 1.0) {
            this.name = typeData.name;
            this.x = x;
            this.y = y; // mapped to 3D z
            this.radius = 16;
            this.angle = 0;
            this.type = typeData.type || 'skeleton';
            this.isBoss = !!typeData.isBoss;

            this.maxHp = typeData.hp * difficultyScale * (typeData.hpMultiplier || 1);
            this.hp = this.maxHp;
            this.armorMax = typeData.armored ? this.maxHp * 0.24 : 0;
            this.armorHp = this.armorMax;
            this.wardMax = this.type === 'mage' && (typeData.elite || this.isBoss) ? this.maxHp * 0.32 : 0;
            this.wardHp = this.wardMax;
            this.wardBreakTimer = 0;
            this.dmg = typeData.dmg * difficultyScale * (typeData.damageMultiplier || 1);
            this.speed = typeData.speed;
            this.elite = !!typeData.elite;
            this.yElevation = typeData.elevation || 0;
            this.isLookout = !!typeData.isLookout;
            this.grounded = true;
            this.arenaPursuer = !!typeData.arenaPursuer;
            this.arenaWaypoint = 0;
            this.enraged = false;
            this.variantKey = EnemyEntity.matchVariant(typeData.variant || typeData.name || '');
            var styleScale = (EnemyEntity.STYLES[this.variantKey] || {}).scale || 1.0;
            this.scale = (typeData.scale || styleScale || 1.0) * (this.elite ? 1.35 : 1.0);
            this.bloodColor = typeData.bloodColor ||
                ((EnemyEntity.STYLES[this.variantKey] || {}).blood) || 0xddddcc;

            this.kx = 0;
            this.ky = 0;
            this.hitReactTimer = 0;
            this.hitReactDuration = 0.16;
            this.hitReactSide = 0;
            this.hitReactStrength = 0;
            this.hitReactHeadshot = false;
            this.state = 'idle';
            this.spawnX = x;
            this.spawnY = y;
            this.attackTimer = 0;
            this.attackWindupTimer = 0;
            this.pendingAttack = null;
            this.attackInterval = typeData.attackInterval || 1.0;
            this.burnTimer = 0;
            this.burnFxTimer = 0;
            this.poisonTimer = 0;
            this.poisonFxTimer = 0;
            this.chillTimer = 0;

            this.group3d = new THREE.Group();
            this.group3d.scale.set(this.scale, this.scale, this.scale);
            this.group3d.position.set(x, this.yElevation, y);

            this.buildModel(typeData);
            if (this.wardMax > 0) {
                this.wardMesh = new THREE.Mesh(
                    new THREE.SphereGeometry(16, 10, 8),
                    new THREE.MeshBasicMaterial({ color: 0x8cecff, wireframe: true, transparent: true, opacity: 0.28, depthWrite: false })
                );
                this.wardMesh.position.y = 16;
                this.wardMesh.raycast = () => {};
                this.group3d.add(this.wardMesh);
            }
        }

        buildModel(typeData) {
            const catalog = Array.isArray(window.GGG_MODEL_CATALOG) ? window.GGG_MODEL_CATALOG : [];
            if (catalog.length) {
                const nameLower = String(this.name || '').toLowerCase();
                let modelId = 'gg-enemy-goblin-skeleton';
                if (this.isBoss) {
                    if (nameLower.includes('lucifer') || nameLower.includes('hades')) modelId = 'gg-enemy-lucifer-hades';
                    else if (nameLower.includes('titan')) modelId = 'gg-enemy-necro-titan';
                    else modelId = 'gg-enemy-bone-goliath';
                } else if (this.type === 'skull' || nameLower.includes('skull')) {
                    modelId = 'gg-enemy-flaming-skull';
                } else if (this.type === 'mage' || nameLower.includes('necro') || nameLower.includes('elven')) {
                    modelId = 'gg-enemy-elven-necromancer';
                } else if (nameLower.includes('dwarf') || nameLower.includes('thane') || nameLower.includes('armored')) {
                    modelId = 'gg-enemy-dwarven-thane';
                } else if (nameLower.includes('orc') || nameLower.includes('berserk')) {
                    modelId = 'gg-enemy-orc-berserker';
                } else if (nameLower.includes('golem') || nameLower.includes('chem')) {
                    modelId = 'gg-enemy-chem-golem';
                } else if (nameLower.includes('spider')) {
                    modelId = 'gg-enemy-tomb-spider';
                }
                const entry = catalog.find(m => m && m.id === modelId && typeof m.build === 'function');
                if (entry) {
                    try {
                        const sharedMesh = entry.build(THREE);
                        if (sharedMesh) {
                            sharedMesh.scale.setScalar(14);
                            this.group3d.add(sharedMesh);
                            return;
                        }
                    } catch (_) {}
                }
            }
            const ProceduralTextures = window.GraveGainProceduralTextures;
            const style = EnemyEntity.STYLES[this.variantKey] || {};
            const bodyColor = (style.body !== undefined) ? style.body : this.bloodColor;
            const boneMat = new THREE.MeshStandardMaterial({
                color: bodyColor, roughness: 0.8, metalness: style.metalness || 0
            });
            const trimMat = new THREE.MeshStandardMaterial({
                color: (style.trim !== undefined) ? style.trim : 0x475569,
                roughness: 0.6, metalness: 0.4
            });
            let eyeColor;
            if (style.eye !== undefined) eyeColor = style.eye;
            else eyeColor = this.isBoss ? 0xff0044 : (typeData.type === 'mage' ? 0x9333ea : 0xff2222);
            if (typeData.elite && !this.isBoss) eyeColor = 0xffd700;
            const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });
            this.eyeMaterial = eyeMat;
            this.eyeBaseColor = eyeColor;

            if (this.type === 'skull' || this.variantKey === 'drone') {
                // Flying flaming skull (Drone Array rides the same rig + rotor)
                this.skull = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 8), boneMat);
                this.skull.position.y = 18;
                this.group3d.add(this.skull);

                const jaw = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 6), boneMat);
                jaw.position.set(0, -5, 1);
                this.skull.add(jaw);

                const le = new THREE.Mesh(new THREE.SphereGeometry(1.0, 6, 6), eyeMat);
                le.position.set(-2, 1, 4.2);
                this.skull.add(le);
                const re = new THREE.Mesh(new THREE.SphereGeometry(1.0, 6, 6), eyeMat);
                re.position.set(2, 1, 4.2);
                this.skull.add(re);

                // Add flame sprite halo, tinted by variant aura when present
                if (ProceduralTextures && ProceduralTextures.createTorchFlameSprite) {
                    const flame = ProceduralTextures.createTorchFlameSprite();
                    if (style.aura !== undefined && flame.material && flame.material.color) {
                        flame.material.color.setHex(style.aura);
                    }
                    flame.position.y = 18;
                    flame.scale.set(20, 20, 1);
                    this.group3d.add(flame);
                }

                if (this.variantKey === 'drone') {
                    // Rotor disc + antenna mast
                    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.8, 12), trimMat);
                    rotor.position.y = 6;
                    this.skull.add(rotor);
                    this.rotor = rotor;
                    const mast = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 1), trimMat);
                    mast.position.y = 3;
                    this.skull.add(mast);
                    const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 6, 6), eyeMat);
                    beacon.position.y = 6;
                    mast.add(beacon);
                    // Side gun pods
                    [-1, 1].forEach(s => {
                        const pod = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 5), trimMat);
                        pod.position.set(s * 6, -1, 0);
                        this.skull.add(pod);
                    });
                } else if (typeData.elite || this.isBoss) {
                    // Elite war-skull: brow spikes
                    [-1, 1].forEach(s => {
                        const spike = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3, 1.4), trimMat);
                        spike.position.set(s * 3, 5, 0);
                        this.skull.add(spike);
                    });
                }
            } else {
                // Standard humanoid skeleton structure
                this.torso = new THREE.Mesh(new THREE.BoxGeometry(8, 14, 5), boneMat);
                if (style.wide) this.torso.scale.set(1.6, 1, 1.3);
                this.torso.position.y = 16;
                this.group3d.add(this.torso);

                this.skull = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), boneMat);
                this.skull.position.set(0, 10, 0);
                this.torso.add(this.skull);

                // Eyes
                const le = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), eyeMat);
                le.position.set(-1.8, 1, 3.1);
                this.skull.add(le);
                const re = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), eyeMat);
                re.position.set(1.8, 1, 3.1);
                this.skull.add(re);

                // Place the pivots at the hips and shoulders.
                const limb = (parent, x, y, width, length) => {
                    const pivot = new THREE.Group();
                    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, width), boneMat);
                    pivot.position.set(x, y, 0);
                    mesh.position.y = -length / 2;
                    pivot.add(mesh);
                    parent.add(pivot);
                    return pivot;
                };
                this.leftLeg = limb(this.group3d, -3, 12, 2.2, 12);
                this.rightLeg = limb(this.group3d, 3, 12, 2.2, 12);
                this.leftArm = limb(this.torso, -6, 8.5, 2, 11);
                this.rightArm = limb(this.torso, 6, 8.5, 2, 11);

                // Variant headgear / accessories (THREE r128 primitives only)
                this.applyVariantHeadgear(typeData, style, trimMat, eyeMat);
                if (this.armorMax > 0) {
                    this.armorPlate = new THREE.Mesh(new THREE.BoxGeometry(8.5, 5.2, 1.15),
                        new THREE.MeshStandardMaterial({ color: 0x8195ad, metalness: 0.8, roughness: 0.34 }));
                    this.armorPlate.position.set(0, 5.7, 2.85);
                    this.torso.add(this.armorPlate);
                }

                // Extra accessories
                if (this.isBoss && !style.crown) {
                    const crown = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 3.8, 3, 8), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9 }));
                    crown.position.set(0, 4, 0);
                    this.skull.add(crown);
                } else if (typeData.armored && !style.crown) {
                    const helm = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 7), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 }));
                    helm.position.set(0, 2, 0);
                    this.skull.add(helm);
                }
            }

            // Aura halo for named variants + elites (tinted flame sprite)
            const auraHex = (typeData.elite && !this.isBoss) ? 0xffd700 : style.aura;
            if (auraHex !== undefined && ProceduralTextures && ProceduralTextures.createTorchFlameSprite) {
                const aura = ProceduralTextures.createTorchFlameSprite();
                if (aura.material && aura.material.color) aura.material.color.setHex(auraHex);
                aura.position.y = 22;
                const s = 26 * this.scale;
                aura.scale.set(s, s, 1);
                this.group3d.add(aura);
            }
        }

        // Headgear / back-piece per visual variant. style.crown selects the rig.
        applyVariantHeadgear(typeData, style, trimMat, eyeMat) {
            const key = style.crown;
            if (!key) return;
            if (key === 'scrap') {
                // Goblin Zed Leader: scrap crown + shoulder spikes
                const crown = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4, 2.4, 6), trimMat);
                crown.position.set(0, 4, 0);
                this.skull.add(crown);
                [-1, 1].forEach(s => {
                    const spike = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4, 1.6), trimMat);
                    spike.position.set(s * 7, 6, 0);
                    spike.rotation.z = s * -0.4;
                    this.torso.add(spike);
                });
            } else if (key === 'hood') {
                // Elven Necromancer: tapered hood + staff with gem
                const hood = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 4.4, 5, 6), trimMat);
                hood.position.set(0, 4, -0.5);
                this.skull.add(hood);
                const staff = new THREE.Mesh(new THREE.BoxGeometry(1.2, 18, 1.2), trimMat);
                staff.position.set(8, -2, 2);
                this.torso.add(staff);
                const gem = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8), eyeMat);
                gem.position.set(0, 10, 0);
                staff.add(gem);
            } else if (key === 'horned') {
                // Dwarven High Thane: horned helm + beard plate
                const helm = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 7), trimMat);
                helm.position.set(0, 2.5, 0);
                this.skull.add(helm);
                [-1, 1].forEach(s => {
                    const horn = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 4), trimMat);
                    horn.position.set(s * 4.5, 3.5, 0);
                    horn.rotation.y = s * 0.5;
                    this.skull.add(horn);
                });
                const beard = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 1.5), trimMat);
                beard.position.set(0, -4, 3);
                this.skull.add(beard);
            } else if (key === 'mohawk') {
                // Orc Berserker: war mohawk + tusks + pauldrons
                const mohawk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.5, 6), trimMat);
                mohawk.position.set(0, 4.5, 0);
                this.skull.add(mohawk);
                [-1, 1].forEach(s => {
                    const tusk = new THREE.Mesh(new THREE.BoxGeometry(1, 2.4, 1), trimMat);
                    tusk.position.set(s * 2.2, -3.5, 2.5);
                    this.skull.add(tusk);
                    const pauldron = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 4.5), trimMat);
                    pauldron.position.set(s * 7, 6.5, 0);
                    this.torso.add(pauldron);
                });
            } else if (key === 'tanks') {
                // Chem-Golem: back tanks + gut glow
                [-1, 1].forEach(s => {
                    const tank = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 9, 8), trimMat);
                    tank.position.set(s * 5.5, 4, -3.5);
                    this.torso.add(tank);
                });
                const gut = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), eyeMat);
                gut.position.set(0, -2, 2.8);
                this.torso.add(gut);
            } else if (key === 'gold') {
                // Patriarch Clint: gold crown + tattered cape
                const crown = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.4, 2.6, 8), trimMat);
                crown.position.set(0, 4.2, 0);
                this.skull.add(crown);
                const cape = new THREE.Mesh(new THREE.BoxGeometry(9, 14, 1), new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 1 }));
                cape.position.set(0, -2, -3.5);
                this.torso.add(cape);
            } else if (key === 'warlord') {
                // Bone Goliath Warlord: war crown + shoulder plates
                const crown = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4, 3.4, 8), trimMat);
                crown.position.set(0, 4.2, 0);
                this.skull.add(crown);
                [-1, 1].forEach(s => {
                    const plate = new THREE.Mesh(new THREE.BoxGeometry(5, 2.5, 5.5), trimMat);
                    plate.position.set(s * 7.5, 6.5, 0);
                    this.torso.add(plate);
                });
            } else if (key === 'pylons') {
                // Necro-Titan: array pylons ringing the torso
                [[-7, 0], [7, 0], [0, -4], [0, 4]].forEach(o => {
                    const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.8, 16, 1.8), trimMat);
                    pylon.position.set(o[0], 0, o[1] - 1);
                    this.torso.add(pylon);
                    const tip = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 6), eyeMat);
                    tip.position.set(0, 9, 0);
                    pylon.add(tip);
                });
            } else if (key === 'darkwings') {
                // Lucifer Hades: dark crown + halo + wings
                const crown = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.2, 3, 8), new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.4, metalness: 0.7 }));
                crown.position.set(0, 4.2, 0);
                this.skull.add(crown);
                [-1, 1].forEach(s => {
                    const wing = new THREE.Mesh(new THREE.BoxGeometry(2, 16, 8), new THREE.MeshStandardMaterial({ color: 0xede9fe, roughness: 0.9 }));
                    wing.position.set(s * 7, 2, -4);
                    wing.rotation.z = s * 0.5;
                    this.torso.add(wing);
                });
                const halo = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.6, 16), eyeMat);
                halo.position.set(0, 8.5, 0);
                this.skull.add(halo);
            }
        }

        tickStatusEffects(dt, game) {
            if (this.burnTimer > 0) {
                this.burnTimer = Math.max(0, this.burnTimer - dt);
                this.hp -= 8 * dt;
                this.burnFxTimer -= dt;
                if (this.burnFxTimer <= 0 && this.hp > 0) {
                    this.burnFxTimer = 0.35;
                    game.vfx.spawnSparks(this.x, this.y, 0xf97316, 2);
                }
            }
            if (this.poisonTimer > 0) {
                this.poisonTimer = Math.max(0, this.poisonTimer - dt);
                this.hp -= 8 * dt;
                this.poisonFxTimer -= dt;
                if (this.poisonFxTimer <= 0 && this.hp > 0) {
                    this.poisonFxTimer = 0.35;
                    game.vfx.spawnSparks(this.x, this.y, 0x4ade80, 2);
                }
            }
            if (this.chillTimer > 0) this.chillTimer = Math.max(0, this.chillTimer - dt);
        }

        arenaPursuitTarget(player, arena) {
            if (!this.arenaPursuer || !arena) return player;
            const route = arena.pursuitRoute;
            const destination = player.yElevation >= 76 ? 3 : player.yElevation >= 36 ? 1 : 0;
            const point = route[this.arenaWaypoint];
            if (Math.hypot(point.x - this.x, point.z - this.y) < 7 &&
                Math.abs(point.elevation - this.yElevation) <= 7 && this.arenaWaypoint !== destination) {
                this.arenaWaypoint += Math.sign(destination - this.arenaWaypoint);
            }
            if (destination === this.arenaWaypoint && this.yElevation === route[destination].elevation) return player;
            const waypoint = route[this.arenaWaypoint];
            return { x: waypoint.x, y: waypoint.z };
        }

        update(dt, player, physics, tilemap, game) {
            this.hitReactTimer = Math.max(0, (this.hitReactTimer || 0) - dt);
            if (this.wardBreakTimer > 0) {
                this.wardBreakTimer = Math.max(0, this.wardBreakTimer - dt);
                const progress = this.wardBreakTimer / 0.2;
                this.wardMesh.scale.setScalar(progress);
                this.wardMesh.material.opacity = progress * 0.48;
                this.wardMesh.visible = progress > 0;
            }
            this.tickStatusEffects(dt, game);
            if (this.hp <= 0) return;
            if (this.isBoss && !this.enraged && this.hp / this.maxHp <= 0.5) {
                this.enraged = true;
                this.speed *= 1.2;
                this.dmg *= 1.12;
                this.attackInterval *= 0.8;
                this.eyeBaseColor = 0xff1538;
                if (this.eyeMaterial) this.eyeMaterial.color.setHex(this.eyeBaseColor);
                if (game.vfx && game.vfx.spawnSparks) {
                    game.vfx.spawnSparks(this.x, this.y, 0xff3b20, 42);
                }
                if (game.audio && game.audio.playSfx) game.audio.playSfx('boss_roar', 1.15);
                if (game.combatText && game.combatText.showBanner) {
                    game.combatText.showBanner(`${this.name} ENRAGED`);
                }
            }
            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            const sameLevel = () => Math.abs(player.yElevation - this.yElevation) < 26;
            const canFireFromPerch = () => dist < 420 && game.hasBlastLineOfSight(
                this.x, this.y, player.x, player.y, this.yElevation + 22, player.yElevation + 18);
            const move = (dx, dz) => {
                physics.moveEntityWithCollision(this, dx, dz, tilemap, sameLevel() ? [player] : [], this.arenaPursuer ? 26 : 0);
                if (this.arenaPursuer) {
                    const surfaces = physics.arenaSurfacesAt(tilemap, this.x, this.y);
                    this.yElevation = surfaces.reduce((floor, surface) =>
                        surface.top <= this.yElevation ? Math.max(floor, surface.top) : floor, 0);
                }
            };

            // Decay knockback
            if (!this.isLookout) move(this.kx * dt, this.ky * dt);
            this.kx -= this.kx * 8 * dt;
            this.ky -= this.ky * 8 * dt;

            // Attack cooldown
            if (this.attackTimer > 0) this.attackTimer -= dt;

            let walkDistance = 0;

            // AI states
            if (dist < 450 && this.state === 'idle') {
                this.state = 'chase';
            }

            if (this.attackWindupTimer > 0) {
                // Give the player a readable response window before attacks
                // resolve. Mages keep tracking during the cast; melee enemies
                // commit to the swing so moving out of reach can dodge it.
                this.attackWindupTimer = Math.max(0, this.attackWindupTimer - dt);
                if (this.pendingAttack === 'ranged') {
                    this.angle = Math.atan2(player.y - this.y, player.x - this.x);
                }
                if (this.eyeMaterial) {
                    const pulse = Math.sin((0.45 - this.attackWindupTimer) * 24) > 0;
                    this.eyeMaterial.color.setHex(pulse ? 0xffb020 : (this.enraged ? 0xff1538 : 0xff4b32));
                }
                if (this.leftArm && this.rightArm) {
                    const drawBack = (this.pendingAttack === 'melee' || this.pendingAttack === 'charge' || this.pendingAttack === 'slam') ? 0.85 : 0.35;
                    const windup = Math.max(0, Math.min(1, 1 - this.attackWindupTimer / 0.45));
                    this.leftArm.rotation.x = -drawBack * windup;
                    this.rightArm.rotation.x = -drawBack * windup;
                }

                if (this.attackWindupTimer <= 0) {
                    const attack = this.pendingAttack;
                    this.pendingAttack = null;
                    if (this.eyeMaterial) this.eyeMaterial.color.setHex(this.eyeBaseColor);
                    if (attack === 'charge') {
                        // The Berserker commits to a straight, collision-aware
                        // rush. Its direction locks during the windup, so a
                        // lateral dodge can make it miss.
                        const lungeDistance = this.enraged ? 118 : 82;
                        physics.moveEntityWithCollision(
                            this,
                            Math.cos(this.angle) * lungeDistance,
                            Math.sin(this.angle) * lungeDistance,
                            tilemap,
                            [player]
                        );
                    }
                    const impactDist = Math.hypot(player.x - this.x, player.y - this.y);
                    if (attack === 'ranged') {
                        if (this.isLookout) {
                            if (!canFireFromPerch()) return;
                            const dx = player.x - this.x;
                            const dy = player.yElevation + 18 - (this.yElevation + 22);
                            const dz = player.y - this.y;
                            const speed = 280 / Math.max(1, Math.hypot(dx, dy, dz));
                            game.spawnProjectile(this.x, this.yElevation + 22, this.y,
                                dx * speed, dy * speed, dz * speed, this.dmg, false, 0xff9f60, 'magic');
                            game.audio.playSfx('spell', 0.86);
                        } else if (this.isBoss && this.variantKey === 'drone' && impactDist < 540 && impactDist > 150) {
                            const baseAngle = this.angle;
                            [-0.14, 0, 0.14].forEach(offset => {
                                const shotAngle = baseAngle + offset;
                                game.spawnProjectile(this.x, 22, this.y,
                                    Math.cos(shotAngle) * 245, 0, Math.sin(shotAngle) * 245,
                                    this.dmg * 0.58, false, 0x22d3ee, 'magic');
                            });
                            game.audio.playSfx('spell', 0.95);
                        } else if (impactDist < 360 && impactDist > 120) {
                            const forwardX = Math.cos(this.angle);
                            const forwardY = Math.sin(this.angle);
                            game.spawnProjectile(this.x, 18, this.y, forwardX * 220, 0, forwardY * 220, this.dmg, false, 0x9333ea, 'magic');
                            game.audio.playSfx('spell', 0.8);
                        }
                    } else if (attack === 'slam') {
                        const slamRadius = this.enraged ? 112 : 86;
                        game.vfx.spawnSparks(this.x, this.y, 0xfbbf24, 30);
                        game.audio.playSfx('explode', 0.9);
                        if (impactDist <= slamRadius && sameLevel()) {
                            player.takeDamage(this.dmg, 'normal', { x: this.x, y: this.y });
                            game.combatText.spawnText(player.x, 24, player.y, 'THANE SLAM', 'damage');
                        }
                    } else if ((attack === 'melee' || attack === 'charge') && sameLevel() &&
                        impactDist < this.radius + player.radius + 12) {
                        player.takeDamage(this.dmg, 'normal', { x: this.x, y: this.y });
                        if (this.type === 'skull') {
                            // Kamikaze skulls only detonate if their warned
                            // attack actually connects; dodging lets them live.
                            game.vfx.spawnSparks(this.x, this.y, 0xff4422, 30);
                            game.audio.playSfx('explode');
                            this.hp = 0;
                        }
                    }
                }
            } else if (this.state === 'chase') {
                const target = this.arenaPursuitTarget(player, tilemap?.arena);
                const targetDist = Math.hypot(target.x - this.x, target.y - this.y);
                this.angle = Math.atan2(target.y - this.y, target.x - this.x);

                const droneBoss = this.isBoss && this.variantKey === 'drone';
                const rangedAttacker = this.type === 'mage' || droneBoss;
                const rangedMax = droneBoss ? 520 : 320;
                const rangedMin = droneBoss ? 160 : 140;
                if (this.isLookout || (rangedAttacker && dist < rangedMax && dist > rangedMin)) {
                    // The eye flash and short cast give the player time to
                    // dodge or break line of fire before the shadow skull.
                    if (this.attackTimer <= 0 && (!this.isLookout || canFireFromPerch())) {
                        const rangedCooldown = this.isBoss ? this.attackInterval : 2.4;
                        this.attackTimer = this.chillTimer > 0 ? rangedCooldown / 0.65 : rangedCooldown;
                        this.attackWindupTimer = 0.45;
                        this.pendingAttack = 'ranged';
                        const color = this.isLookout ? 0xff9f60 : droneBoss ? 0x22d3ee : 0x9333ea;
                        game.vfx.spawnSparks(this.x, this.y, color, this.isBoss ? 18 : 9, this.yElevation + 22);
                    }
                } else {
                    // Melee pursuit
                    const moveSpeed = this.speed * (this.chillTimer > 0 ? 0.65 : 1);
                    const stride = Math.min(targetDist, moveSpeed * dt);
                    const vx = Math.cos(this.angle) * stride;
                    const vy = Math.sin(this.angle) * stride;
                    const startX = this.x;
                    const startY = this.y;
                    move(vx, vy);
                    walkDistance = Math.hypot(this.x - startX, this.y - startY);

                    // Melee attack range check
                    if (sameLevel() && dist < this.radius + player.radius + 12) {
                        if (this.attackTimer <= 0) {
                            this.attackTimer = this.chillTimer > 0 ? this.attackInterval / 0.65 : this.attackInterval;
                            this.attackWindupTimer = 0.38;
                            this.pendingAttack = this.isBoss && this.variantKey === 'berserker'
                                ? 'charge'
                                : (this.isBoss && this.variantKey === 'thane' ? 'slam' : 'melee');
                            const warningColor = this.type === 'skull' ? 0xff4422
                                : (this.pendingAttack === 'charge' ? 0xef4444 : (this.pendingAttack === 'slam' ? 0xfbbf24 : 0xffb020));
                            game.vfx.spawnSparks(this.x, this.y, warningColor, this.isBoss ? 18 : 8, this.yElevation + 14);
                            if (this.pendingAttack === 'slam') {
                                game.combatText.spawnText(this.x, 34, this.y, 'SLAM WINDUP', 'crit');
                            }
                        }
                    }
                }
            }

            if (this.leftLeg) {
                this.walkPhase = ((this.walkPhase || 0) + walkDistance / 8) % (Math.PI * 2);
                const stride = Math.sin(this.walkPhase) * Math.min(1, dt > 0 ? walkDistance / (80 * dt) : 0);
                const blend = 1 - Math.exp(-18 * dt);
                this.leftLeg.rotation.x += (stride * 0.65 - this.leftLeg.rotation.x) * blend;
                this.rightLeg.rotation.x += (-stride * 0.65 - this.rightLeg.rotation.x) * blend;
                if (this.attackWindupTimer <= 0) {
                    this.leftArm.rotation.x += (-stride * 0.45 - this.leftArm.rotation.x) * blend;
                    this.rightArm.rotation.x += (stride * 0.45 - this.rightArm.rotation.x) * blend;
                }
            } else {
                this.hoverPhase = ((this.hoverPhase || 0) + dt * 5) % (Math.PI * 2);
                this.skull.position.y = 18 + Math.sin(this.hoverPhase) * 1.6;
                if (this.rotor) this.rotor.rotation.y += dt * 14;
            }

            // A brief body turn makes impacts read directionally while the
            // existing knockback handles the larger movement response.
            if (this.torso) {
                const react = this.hitReactTimer > 0
                    ? Math.sin((this.hitReactTimer / this.hitReactDuration) * Math.PI) * this.hitReactStrength
                    : 0;
                const blend = 1 - Math.exp(-30 * dt);
                const pitch = -react * (this.hitReactHeadshot ? 0.52 : 0.3);
                const roll = this.hitReactSide * react * 0.24;
                this.torso.rotation.x += (pitch - this.torso.rotation.x) * blend;
                this.torso.rotation.z += (roll - this.torso.rotation.z) * blend;
                if (this.skull) {
                    const headPitch = this.hitReactHeadshot ? -react * 0.42 : 0;
                    this.skull.rotation.x += (headPitch - this.skull.rotation.x) * blend;
                    this.skull.rotation.z += (this.hitReactSide * react * 0.2 - this.skull.rotation.z) * blend;
                }
            }

            this.group3d.position.set(this.x, this.yElevation, this.y);
            this.group3d.rotation.y = -this.angle + Math.PI / 2;
        }

        destroy() {
            if (window.GraveGainGame) {
                const scene = window.GraveGainGame.scene;
                if (this.hp <= 0) window.GraveGainEnemyVoxels.fracture(this, scene, this.maxHp);
                scene.remove(this.group3d);
            }
            this.group3d.traverse((child) => {
                if (child.isInstancedMesh) child.dispose();
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            });
        }
    }

    class LootItem {
        constructor(x, y, type = 'gold', value = 15, weaponData = null) {
            const ProceduralTextures = window.GraveGainProceduralTextures;
            this.x = x;
            this.y = y;
            this.type = type;
            this.value = value;
            this.weaponData = weaponData ? { ...weaponData } : null;
            this.elevation = 0;
            this.pickupDelay = 0;
            this.radius = 12;
            this.pulse = Math.random() * Math.PI;

            this.group3d = new THREE.Group();
            const emoji = type === 'gold' ? '🪙' : (type === 'potion' ? '🧪' : (type === 'ammo' ? '📦' : (type === 'grenade' ? '💣' : (type === 'weapon' ? '🔫' : '📜'))));
            this.sprite = ProceduralTextures.createEmojiSprite(emoji, 64);
            if (type === 'weapon' && this.weaponData?.rarityColor) {
                this.sprite.material.color.setHex(this.weaponData.rarityColor);
            }
            this.sprite.position.y = 8;
            this.group3d.add(this.sprite);
            this.rarityBeam = null;
            this.rarityRing = null;
            this.rarityLevel = 0;
            if (type === 'weapon' && this.weaponData?.rarityColor && this.weaponData.rarity !== 'common') {
                const level = { uncommon: 1, rare: 2, epic: 3, legendary: 4 }[this.weaponData.rarity] || 1;
                this.rarityLevel = level;
                const color = this.weaponData.rarityColor;
                const beamMaterial = new THREE.MeshBasicMaterial({ color, transparent: true,
                    opacity: 0.12 + level * 0.045, blending: THREE.AdditiveBlending,
                    depthWrite: false, side: THREE.DoubleSide });
                this.rarityBeam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 7 + level, 34 + level * 4, 8, 1, true), beamMaterial);
                this.rarityBeam.position.y = 21;
                this.rarityBeam.name = 'weapon rarity beam';
                this.group3d.add(this.rarityBeam);
                if (level >= 2) {
                    const ringRadius = level === 2 ? 8.5 : level === 3 ? 12 : 15;
                    const ringThickness = level === 2 ? 0.5 : level === 3 ? 0.8 : 1.2;
                    const ringMaterial = new THREE.MeshBasicMaterial({ color, transparent: true,
                        opacity: level === 2 ? 0.42 : level === 3 ? 0.65 : 0.9,
                        blending: THREE.AdditiveBlending, depthWrite: false });
                    this.rarityRing = new THREE.Mesh(new THREE.TorusGeometry(ringRadius, ringThickness, 6, 20), ringMaterial);
                    this.rarityRing.position.y = 1.5;
                    this.rarityRing.rotation.x = Math.PI / 2;
                    this.rarityRing.name = 'weapon rarity ring';
                    this.group3d.add(this.rarityRing);
                }
            }
            this.group3d.position.set(x, 0, y);
        }

        update(dt, player, range) {
            this.pulse += 5 * dt;
            this.sprite.position.y = 8 + Math.sin(this.pulse) * 3;
            if (this.rarityBeam) {
                const pulse = (Math.sin(this.pulse * (1.05 + this.rarityLevel * 0.2) + this.rarityLevel * 0.45) + 1) * 0.5;
                this.rarityBeam.material.opacity = 0.05 + pulse * (0.12 + this.rarityLevel * 0.045);
                this.rarityBeam.scale.x = this.rarityBeam.scale.z = 0.9 + pulse * (0.12 + this.rarityLevel * 0.02);
            }
            if (this.rarityRing) this.rarityRing.rotation.y = this.pulse * (0.2 + this.rarityLevel * 0.08);
            this.pickupDelay = Math.max(0, this.pickupDelay - dt);
            if (this.pickupDelay > 0 || this.elevation > 0 || Math.abs(player.yElevation - this.elevation) > 14) return;

            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            if (dist < range) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                const pullSpeed = 340 * dt;
                this.x += Math.cos(angle) * pullSpeed;
                this.y += Math.sin(angle) * pullSpeed;
                this.group3d.position.set(this.x, 0, this.y);
            }
        }

        destroy() {
            if (window.GraveGainGame) window.GraveGainGame.scene.remove(this.group3d);
            const geometries = new Set();
            const materials = new Set();
            this.group3d.traverse(object => {
                if (object.geometry) geometries.add(object.geometry);
                if (object.material) materials.add(object.material);
            });
            geometries.forEach(geometry => geometry.dispose());
            materials.forEach(material => {
                if (material.map) material.map.dispose();
                material.dispose();
            });
        }
    }

    // ---- Visual variants + factory (THREE r128 primitives only) ----
    EnemyEntity.STYLES = {
        goblin:     { body: 0x4d7c0f, trim: 0x365314, eye: 0xff2222, scale: 1.3, aura: 0xfb923c, blood: 0x84cc16, crown: 'scrap' },
        necromancer:{ body: 0x0f766e, trim: 0x5eead4, eye: 0xc084fc, scale: 1.2, aura: 0x2dd4bf, blood: 0x2dd4bf, crown: 'hood' },
        thane:      { body: 0xb45309, trim: 0xfbbf24, eye: 0xfbbf24, scale: 1.6, aura: 0xf59e0b, blood: 0xf59e0b, crown: 'horned', metalness: 0.6 },
        berserker:  { body: 0x991b1b, trim: 0x450a0a, eye: 0xff2222, scale: 1.8, aura: 0xef4444, blood: 0xef4444, crown: 'mohawk' },
        drone:      { body: 0x475569, trim: 0x22d3ee, eye: 0x22d3ee, scale: 1.4, aura: 0x22d3ee, blood: 0x22d3ee, metalness: 0.8 },
        golem:      { body: 0x14532d, trim: 0x4ade80, eye: 0x4ade80, scale: 2.0, aura: 0x22c55e, blood: 0x22c55e, crown: 'tanks', wide: true },
        clint:      { body: 0xe7e5e4, trim: 0xffd700, eye: 0xffd700, scale: 1.5, aura: 0xffd700, blood: 0xffd700, crown: 'gold' },
        goliath:    { body: 0xd6d3d1, trim: 0x991b1b, eye: 0xff2222, scale: 2.5, aura: 0xef4444, blood: 0xef4444, crown: 'warlord' },
        titan:      { body: 0x4c1d95, trim: 0xa855f7, eye: 0xe9d5ff, scale: 2.8, aura: 0x8b5cf6, blood: 0x8b5cf6, crown: 'pylons' },
        lucifer:    { body: 0xede9fe, trim: 0x4c1d95, eye: 0xffffff, scale: 3.0, aura: 0xc4b5fd, blood: 0xc4b5fd, crown: 'darkwings' },
        skull:      { eye: 0xff7722, aura: 0xff7722, blood: 0xff7722 }
    };

    // Ordered: first regex hit wins (Lucifer before generic mage, etc.)
    EnemyEntity.VARIANT_MATCH = [
        [/lucifer|hades|consciousness overlord/, 'lucifer'],
        [/necro[\s-]*array titan|necro-titan|\btitan\b/, 'titan'],
        [/chem|golem/, 'golem'],
        [/drone/, 'drone'],
        [/berserker/, 'berserker'],
        [/thane/, 'thane'],
        [/necromancer/, 'necromancer'],
        [/goblin(?! skeleton)|zed leader/, 'goblin'],
        [/clint|patriarch/, 'clint'],
        [/goliath|warlord/, 'goliath'],
        [/skull|wisp/, 'skull']
    ];

    EnemyEntity.matchVariant = function (name) {
        if (EnemyEntity.STYLES[name]) return name; // explicit variant key
        var n = String(name || '').toLowerCase();
        for (var i = 0; i < EnemyEntity.VARIANT_MATCH.length; i++) {
            if (EnemyEntity.VARIANT_MATCH[i][0].test(n)) return EnemyEntity.VARIANT_MATCH[i][1];
        }
        return '';
    };

    EnemyEntity.styleFor = function (name, typeData) {
        var key = EnemyEntity.matchVariant((typeData && typeData.variant) || name);
        var base = EnemyEntity.STYLES[key] || {};
        if (typeData && typeData.elite && !typeData.isBoss) {
            return { body: base.body, trim: 0xffd700, eye: 0xffd700, aura: 0xffd700, blood: base.blood, crown: base.crown, wide: base.wide, metalness: base.metalness };
        }
        return base;
    };

    EnemyEntity.BOSS_STATS = {
        goblin:    { name: 'GOBLIN ZED LEADER', hp: 320, dmg: 22, speed: 130, scale: 1.3, type: 'skeleton', attackInterval: 1.1 },
        necromancer:{ name: 'ELVEN NECROMANCER', hp: 520, dmg: 30, speed: 80, scale: 1.2, type: 'mage', attackInterval: 1.8 },
        thane:     { name: 'DWARVEN HIGH THANE', hp: 800, dmg: 38, speed: 70, scale: 1.6, type: 'skeleton', armored: true, attackInterval: 1.4 },
        berserker: { name: 'HUGE ORC ZED BERSERKER', hp: 950, dmg: 45, speed: 120, scale: 1.8, type: 'skeleton', attackInterval: 1.0 },
        drone:     { name: 'CORRUPTED DRONE ARRAY', hp: 600, dmg: 32, speed: 150, scale: 1.4, type: 'skeleton', attackInterval: 1.2 },
        golem:     { name: 'TOXIC CHEM-GOLEM', hp: 1100, dmg: 42, speed: 60, scale: 2.0, type: 'skeleton', attackInterval: 1.6 },
        clint:     { name: 'REANIMATED PATRIARCH CLINT', hp: 900, dmg: 40, speed: 95, scale: 1.5, type: 'skeleton', attackInterval: 1.3 },
        goliath:   { name: 'BONE GOLIATH WARLORD', hp: 1250, dmg: 48, speed: 75, scale: 2.5, type: 'skeleton', attackInterval: 1.4 },
        titan:     { name: 'NECRO-ARRAY TITAN', hp: 1500, dmg: 55, speed: 70, scale: 2.8, type: 'mage', attackInterval: 1.6 },
        lucifer:   { name: 'LUCIFER HADES', hp: 2000, dmg: 60, speed: 90, scale: 3.0, type: 'mage', attackInterval: 1.2 }
    };

    // Factory: mission bossType string -> fully-styled boss entity.
    // Unknown names fall back to the Bone Goliath Warlord (legacy behavior).
    EnemyEntity.spawnForBoss = function (bossType, x, y, diffScale, difficulty) {
        var key = EnemyEntity.matchVariant(bossType);
        if (!EnemyEntity.BOSS_STATS[key]) key = 'goliath';
        var stats = EnemyEntity.BOSS_STATS[key];
        var style = EnemyEntity.STYLES[key] || {};
        var data = {
            name: stats.name, hp: stats.hp, dmg: stats.dmg, speed: stats.speed,
            scale: stats.scale, type: stats.type, armored: stats.armored,
            variant: key, isBoss: true, attackInterval: stats.attackInterval,
            bloodColor: style.blood,
            hpMultiplier: (difficulty && difficulty.hpMultiplier) || 1,
            damageMultiplier: (difficulty && difficulty.damageMultiplier) || 1
        };
        return new EnemyEntity(data, x, y, diffScale || 1);
    };

    // Per-theme trash-mob pools. Names route through matchVariant so mobs
    // reuse the boss visual language; elite:true adds x1.35 scale + gold eyes.
    EnemyEntity.THEME_MOBS = {
        metallic_ship: [
            { name: 'Rusted Hull Husk', hp: 30, dmg: 10, speed: 110, scale: 0.9, type: 'skeleton' },
            { name: 'Sparking Wire Skull', hp: 18, dmg: 26, speed: 160, scale: 0.9, type: 'skull' },
            { name: 'Shipboard Occultist', hp: 48, dmg: 20, speed: 70, scale: 1.0, type: 'mage' }
        ],
        elven_grove: [
            { name: 'Elven Husk', hp: 28, dmg: 10, speed: 135, scale: 0.9, type: 'skeleton' },
            { name: 'Grove Wisp Skull', hp: 18, dmg: 24, speed: 165, scale: 0.9, type: 'skull' },
            { name: 'Elven Necromancer', hp: 60, dmg: 22, speed: 70, scale: 1.1, type: 'mage', elite: true }
        ],
        dwarven_vault: [
            { name: 'Dwarven Husk', hp: 70, dmg: 14, speed: 85, scale: 1.1, type: 'skeleton', armored: true },
            { name: 'Forge Skull', hp: 20, dmg: 26, speed: 155, scale: 1.0, type: 'skull' },
            { name: 'Dwarven High Thane', hp: 120, dmg: 24, speed: 70, scale: 1.3, type: 'skeleton', armored: true, elite: true }
        ],
        orc_wastes: [
            { name: 'Goblin Skeleton', hp: 25, dmg: 9, speed: 140, scale: 0.8, type: 'skeleton' },
            { name: 'Crimson Skull', hp: 18, dmg: 28, speed: 160, scale: 1.0, type: 'skull' },
            { name: 'Orc Berserker', hp: 110, dmg: 24, speed: 115, scale: 1.4, type: 'skeleton', elite: true }
        ],
        toxic_catacombs: [
            { name: 'Chem Husk', hp: 40, dmg: 12, speed: 100, scale: 1.0, type: 'skeleton' },
            { name: 'Toxic Skull', hp: 18, dmg: 26, speed: 155, scale: 0.9, type: 'skull' },
            { name: 'Chem-Golem', hp: 140, dmg: 26, speed: 60, scale: 1.6, type: 'skeleton', elite: true }
        ],
        stone_crypt: [
            { name: 'Goblin Skeleton', hp: 25, dmg: 8, speed: 120, scale: 0.8, type: 'skeleton' },
            { name: 'Flying Fire Skull', hp: 16, dmg: 28, speed: 155, scale: 0.9, type: 'skull' },
            { name: 'Armored Skeleton', hp: 65, dmg: 14, speed: 85, scale: 1.1, type: 'skeleton', armored: true },
            { name: 'Skeleton Necromancer', hp: 45, dmg: 18, speed: 70, scale: 1.0, type: 'mage' },
            { name: 'Reanimated Patriarch Clint', hp: 130, dmg: 24, speed: 90, scale: 1.2, type: 'skeleton', elite: true }
        ],
        citadel_darkness: [
            { name: 'Citadel Husk', hp: 60, dmg: 16, speed: 110, scale: 1.1, type: 'skeleton', armored: true },
            { name: 'Void Skull', hp: 24, dmg: 30, speed: 165, scale: 1.0, type: 'skull' },
            { name: 'Necro-Array Titan', hp: 180, dmg: 30, speed: 70, scale: 1.6, type: 'mage', elite: true }
        ]
    };

    EnemyEntity.mobsForTheme = function (theme) {
        return EnemyEntity.THEME_MOBS[theme] || EnemyEntity.THEME_MOBS.stone_crypt;
    };

    window.GraveGainEnemyEntity = EnemyEntity;
    window.GraveGainLootItem = LootItem;
})();
