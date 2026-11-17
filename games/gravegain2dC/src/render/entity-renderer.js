(function (root) {
    'use strict';

    var renderNs = root.GraveGainRender = root.GraveGainRender || {};

    var RACE_COLORS = {
        human: 0x3b82f6,
        elf: 0x22c55e,
        dwarf: 0xf59e0b,
        orc: 0x16a34a
    };

    function createEntityRenderer(opts) {
        opts = opts || {};
        var THREE = root.THREE;
        var scene = opts.scene;

        if (!THREE || !scene || scene.isStub) {
            return {
                sync: function () {},
                applyAppearance: function () {},
                dispose: function () {}
            };
        }

        var entityRoot = new THREE.Group();
        entityRoot.name = 'GraveGainEntityRoot';
        scene.add(entityRoot);

        // Shared primitive geometry cache (r128-safe — no CapsuleGeometry)
        var geos = {
            torso: new THREE.BoxGeometry(0.56, 0.72, 0.36),
            pauldron: new THREE.BoxGeometry(0.32, 0.28, 0.38),
            head: new THREE.SphereGeometry(0.22, 10, 8),
            helmVisor: new THREE.BoxGeometry(0.28, 0.1, 0.18),
            backpack: new THREE.BoxGeometry(0.44, 0.56, 0.24),
            leg: new THREE.CylinderGeometry(0.1, 0.11, 0.56, 8),
            arm: new THREE.CylinderGeometry(0.08, 0.08, 0.48, 8),
            shield: new THREE.BoxGeometry(0.34, 0.62, 0.12),
            gun: new THREE.BoxGeometry(0.14, 0.16, 0.68),
            skull: new THREE.OctahedronGeometry(0.34, 1),
            weakPoint: new THREE.SphereGeometry(0.24, 10, 8),
            tracer: new THREE.BoxGeometry(0.12, 0.12, 0.65),
            loot: new THREE.OctahedronGeometry(0.26, 0),
            ring: new THREE.RingGeometry(0.45, 0.6, 20),
            hpBg: new THREE.PlaneGeometry(0.9, 0.1),
            hpFill: new THREE.PlaneGeometry(0.86, 0.07)
        };
        geos.ring.rotateX(-Math.PI / 2);

        // Player rig
        var playerPrimaryMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.42, metalness: 0.65 });
        var playerTrimMat = new THREE.MeshStandardMaterial({ color: 0xd4a359, roughness: 0.35, metalness: 0.8 });
        var playerDarkMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7, metalness: 0.4 });
        var playerBubbleMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.28, wireframe: true });

        var playerGroup = new THREE.Group();
        var pTorso = new THREE.Mesh(geos.torso, playerPrimaryMat);
        pTorso.position.y = 0.92;
        pTorso.castShadow = true;

        var pLeftPauldron = new THREE.Mesh(geos.pauldron, playerTrimMat);
        pLeftPauldron.position.set(-0.42, 1.18, 0);
        pLeftPauldron.castShadow = true;
        var pRightPauldron = new THREE.Mesh(geos.pauldron, playerTrimMat);
        pRightPauldron.position.set(0.42, 1.18, 0);
        pRightPauldron.castShadow = true;

        var pHead = new THREE.Mesh(geos.head, playerPrimaryMat);
        pHead.position.set(0, 1.48, 0);
        pHead.castShadow = true;
        var pVisor = new THREE.Mesh(geos.helmVisor, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
        pVisor.position.set(0, 1.48, 0.16);

        var pPack = new THREE.Mesh(geos.backpack, playerDarkMat);
        pPack.position.set(0, 1.0, -0.28);
        pPack.castShadow = true;

        var pLeftLeg = new THREE.Mesh(geos.leg, playerDarkMat);
        pLeftLeg.position.set(-0.16, 0.28, 0);
        pLeftLeg.castShadow = true;
        var pRightLeg = new THREE.Mesh(geos.leg, playerDarkMat);
        pRightLeg.position.set(0.16, 0.28, 0);
        pRightLeg.castShadow = true;

        var pRightArm = new THREE.Mesh(geos.arm, playerPrimaryMat);
        pRightArm.position.set(0.36, 0.95, 0.14);
        pRightArm.rotation.x = Math.PI * 0.45;
        var pWeapon = new THREE.Mesh(geos.gun, playerDarkMat);
        pWeapon.position.set(0.36, 0.94, 0.48);

        var pBubble = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 10), playerBubbleMat);
        pBubble.position.y = 0.95;
        pBubble.visible = false;

        playerGroup.add(pTorso, pLeftPauldron, pRightPauldron, pHead, pVisor, pPack, pLeftLeg, pRightLeg, pRightArm, pWeapon, pBubble);
        entityRoot.add(playerGroup);

        // Click-to-move marker
        var moveMarkerMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
        var moveMarker = new THREE.Mesh(geos.ring, moveMarkerMat);
        moveMarker.visible = false;
        entityRoot.add(moveMarker);

        // Airborne elevation drop ring
        var tetherMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
        var tetherRing = new THREE.Mesh(geos.ring, tetherMat);
        tetherRing.visible = false;
        entityRoot.add(tetherRing);

        // Tracer InstancedMesh pool (256 max, frustumCulled = false for r128)
        var tracerMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        var tracerInst = new THREE.InstancedMesh(geos.tracer, tracerMat, 256);
        tracerInst.frustumCulled = false;
        tracerInst.count = 0;
        entityRoot.add(tracerInst);

        var enemyRigs = Object.create(null); // enemy.id -> { group, bodyMat, hpFill, scale }
        var telegraphRigs = Object.create(null); // enemy.id -> ground ring warning
        var lootRigs = Object.create(null); // loot.id -> { mesh }
        var dummy = new THREE.Object3D();
        var lookTarget = new THREE.Vector3();
        var playerTracerColor = new THREE.Color(0xfef08a);
        var enemyTracerColor = new THREE.Color(0xc084fc);
        var tracerColorCache = Object.create(null);
        function getTracerColor(pr, state) {
            if (pr.owner && pr.owner !== state.player) return enemyTracerColor;
            var hex = pr.color || 0xfef08a;
            if (!tracerColorCache[hex]) tracerColorCache[hex] = new THREE.Color(hex);
            return tracerColorCache[hex] || playerTracerColor;
        }

        function createEnemyRig(e) {
            var grp = new THREE.Group();
            var isBoss = e.type === 'boss';
            var isElite = e.type === 'elite';
            var isSkull = e.type === 'exploding';
            var baseScale = isBoss ? 2.1 : (isElite ? 1.35 : 1.0);

            var isDroneArray = e.bossArchetype === 'drone-array';
            var isToxicGolem = e.bossArchetype === 'toxic-golem';
            var color = isDroneArray ? 0x38bdf8 : (isToxicGolem ? 0x65a30d : (isBoss ? 0xdc2626 : (isElite ? 0xb45309 : (isSkull ? 0xa855f7 : 0x64748b))));
            var bodyMat = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.6,
                metalness: isElite || isBoss ? 0.5 : 0.15,
                emissive: isDroneArray ? 0x0369a1 : (isToxicGolem ? 0x166534 : (isSkull ? 0x581c87 : 0x000000)),
                emissiveIntensity: isDroneArray || isToxicGolem ? 0.38 : (isSkull ? 0.6 : 0)
            });

            if (isDroneArray) {
                var droneCore = new THREE.Mesh(geos.skull, bodyMat);
                droneCore.position.y = 1.15;
                droneCore.scale.set(1.3, 0.9, 1.3);
                droneCore.castShadow = true;
                grp.add(droneCore);
                for (var rotor = 0; rotor < 4; rotor += 1) {
                    var angle = rotor * Math.PI / 2;
                    var wing = new THREE.Mesh(geos.pauldron, bodyMat);
                    wing.position.set(Math.cos(angle) * 0.72, 1.15, Math.sin(angle) * 0.72);
                    wing.rotation.y = -angle;
                    wing.scale.set(1.1, 0.55, 1.3);
                    grp.add(wing);
                }
                var droneEye = new THREE.Mesh(geos.weakPoint, bodyMat);
                droneEye.position.set(0, 1.18, 0.55);
                droneEye.scale.set(0.42, 0.42, 0.3);
                grp.add(droneEye);
            } else if (isSkull) {
                var orb = new THREE.Mesh(geos.skull, bodyMat);
                orb.position.y = 1.1;
                orb.castShadow = true;
                grp.add(orb);
            } else {
                var torso = new THREE.Mesh(geos.torso, bodyMat);
                torso.position.y = 0.85;
                torso.castShadow = true;
                var head = new THREE.Mesh(geos.head, bodyMat);
                head.position.y = 1.42;
                head.castShadow = true;
                var lLeg = new THREE.Mesh(geos.leg, bodyMat);
                lLeg.position.set(-0.15, 0.28, 0);
                var rLeg = new THREE.Mesh(geos.leg, bodyMat);
                rLeg.position.set(0.15, 0.28, 0);
                grp.add(torso, head, lLeg, rLeg);

                if (isElite || isBoss) {
                    var lp = new THREE.Mesh(geos.pauldron, bodyMat);
                    lp.position.set(-0.42, 1.12, 0);
                    var rp = new THREE.Mesh(geos.pauldron, bodyMat);
                    rp.position.set(0.42, 1.12, 0);
                    grp.add(lp, rp);
                }
                if (isToxicGolem) {
                    var chemPack = new THREE.Mesh(geos.backpack, bodyMat);
                    chemPack.position.set(0, 1.02, -0.34);
                    chemPack.scale.set(0.8, 0.85, 0.7);
                    chemPack.castShadow = true;
                    grp.add(chemPack);
                }
                if (e.armored) {
                    var shield = new THREE.Mesh(geos.shield, bodyMat);
                    shield.position.set(0.36, 0.92, 0.28);
                    shield.rotation.y = -0.12;
                    shield.castShadow = true;
                    grp.add(shield);
                }
                if (isBoss) {
                    var wpMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
                    var wp = new THREE.Mesh(geos.weakPoint, wpMat);
                    wp.position.set(0, 1.15, -0.28);
                    grp.add(wp);
                }
            }

            grp.scale.set(baseScale, baseScale, baseScale);

            // Overhead HP bar
            var hpBg = new THREE.Mesh(geos.hpBg, new THREE.MeshBasicMaterial({ color: 0x000000 }));
            hpBg.position.y = 2.05;
            var hpFill = new THREE.Mesh(geos.hpFill, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
            hpFill.position.set(0, 2.05, 0.01);
            grp.add(hpBg, hpFill);

            entityRoot.add(grp);
            return { group: grp, bodyMat: bodyMat, hpFill: hpFill, baseScale: baseScale };
        }

        function applyAppearance(cfg) {
            if (!cfg) return;
            if (cfg.dyes) {
                if (cfg.dyes.primary !== undefined) playerPrimaryMat.color.set(cfg.dyes.primary);
                if (cfg.dyes.secondary !== undefined) playerTrimMat.color.set(cfg.dyes.secondary);
            }
            if (typeof cfg.weathering === 'number') {
                playerPrimaryMat.roughness = 0.25 + cfg.weathering * 0.65;
            }
            if (cfg.armorVisuals) {
                pLeftPauldron.visible = cfg.armorVisuals.pauldrons !== false;
                pRightPauldron.visible = cfg.armorVisuals.pauldrons !== false;
                pPack.visible = cfg.armorVisuals.backpack !== false;
            }
        }

        function sync(state, terrain, dt) {
            if (!state) return;
            var time = typeof performance !== 'undefined' ? performance.now() * 0.001 : Date.now() * 0.001;

            // Player sync
            var p = state.player;
            if (p && !p.isDead) {
                playerGroup.visible = true;
                playerGroup.position.set(p.x, p.y, p.z);
                // Angle in engine: 0 along +X; Three.js model faces +Z, so yaw = Math.PI/2 - angle
                playerGroup.rotation.y = Math.PI * 0.5 - (p.angle || 0);

                if (p.race && RACE_COLORS[p.race] && !p.customDyeApplied) {
                    playerPrimaryMat.color.setHex(RACE_COLORS[p.race]);
                }

                var spd = Math.hypot(p.vx || 0, p.vz || 0);
                var stride = spd > 0.4 ? Math.sin(time * 12) * 0.45 : 0;
                pLeftLeg.rotation.x = stride;
                pRightLeg.rotation.x = -stride;

                pBubble.visible = !!(p.stoneForm || p.shieldBubble > 0);
                if (p.stoneForm) {
                    playerBubbleMat.color.setHex(0xfacc15);
                } else if (p.shieldBubble > 0) {
                    playerBubbleMat.color.setHex(0x38bdf8);
                }

                // Airborne / elevated drop tether
                var groundH = terrain ? terrain.getWorldHeightAt(p.x, p.z) : 0;
                if (p.y > groundH + 0.25) {
                    tetherRing.visible = true;
                    tetherRing.position.set(p.x, groundH + 0.05, p.z);
                } else {
                    tetherRing.visible = false;
                }

                // Click-to-move ground marker
                if (p.moveTarget && p.moveTarget.active) {
                    var my = terrain ? terrain.getWorldHeightAt(p.moveTarget.x, p.moveTarget.z) : 0;
                    moveMarker.visible = true;
                    moveMarker.position.set(p.moveTarget.x, my + 0.06, p.moveTarget.z);
                    var ms = 0.85 + Math.sin(time * 8) * 0.15;
                    moveMarker.scale.set(ms, ms, 1);
                } else {
                    moveMarker.visible = false;
                }
            } else {
                playerGroup.visible = false;
                moveMarker.visible = false;
                tetherRing.visible = false;
            }

            // Enemies sync
            var activeIds = Object.create(null);
            var activeTelegraphs = Object.create(null);
            var enemies = state.enemies || [];
            for (var ei = 0; ei < enemies.length; ei++) {
                var e = enemies[ei];
                if (!e || e.hp <= 0) continue;
                activeIds[e.id] = true;
                var rig = enemyRigs[e.id];
                if (!rig) {
                    rig = createEnemyRig(e);
                    enemyRigs[e.id] = rig;
                }
                rig.group.visible = !e.ambushHidden;
                rig.group.position.set(e.x, e.y, e.z);
                rig.group.rotation.y = Math.PI * 0.5 - (e.angle || 0);
                rig.group.rotation.x = e.knockdownTimer > 0 ? 1.15 : (e.dodgeTime > 0 ? -0.22 : 0);

                if (e.flash > 0) {
                    rig.bodyMat.emissive.setHex(0xffffff);
                    rig.bodyMat.emissiveIntensity = 0.9;
                } else if (e.dodgeTime > 0) {
                    rig.bodyMat.emissive.setHex(0x22d3ee);
                    rig.bodyMat.emissiveIntensity = 0.8;
                } else if (e.phaseShieldTimer > 0 || e.phaseShieldRequiresConduit) {
                    rig.bodyMat.emissive.setHex(0x38bdf8);
                    rig.bodyMat.emissiveIntensity = 0.85;
                } else if (e.outOfCombatHealing) {
                    rig.bodyMat.emissive.setHex(0x4ade80);
                    rig.bodyMat.emissiveIntensity = 0.7;
                } else if (e.isEnraged) {
                    rig.bodyMat.emissive.setHex(0xef4444);
                    rig.bodyMat.emissiveIntensity = 1.0;
                } else {
                    rig.bodyMat.emissive.setHex(e.isPriorityTarget ? 0xfb7185 : (e.autoTargeted ? 0x22d3ee : (e.type === 'exploding' ? 0x581c87 : 0x000000)));
                    rig.bodyMat.emissiveIntensity = e.isPriorityTarget ? 0.7 : (e.autoTargeted ? 0.8 : (e.type === 'exploding' ? 0.6 : 0));
                }

                var hpRatio = Math.max(0.01, Math.min(1, e.hp / Math.max(1, e.maxHp)));
                rig.hpFill.scale.x = hpRatio;
                rig.hpFill.position.x = -(1 - hpRatio) * 0.43;

                if (e.telegraph) {
                    activeTelegraphs[e.id] = true;
                    var warning = telegraphRigs[e.id];
                    if (!warning) {
                        var warningMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false });
                        var warningMesh = new THREE.Mesh(geos.ring, warningMat);
                        warningMesh.renderOrder = 4;
                        entityRoot.add(warningMesh);
                        warning = telegraphRigs[e.id] = { mesh: warningMesh, mat: warningMat };
                    }
                    var telegraph = e.telegraph;
                    var tx = typeof telegraph.x === 'number' ? telegraph.x : e.x;
                    var tz = typeof telegraph.z === 'number' ? telegraph.z : e.z;
                    var ty = terrain ? terrain.getWorldHeightAt(tx, tz) : e.y;
                    var warningScale = Math.max(0.65, Number(telegraph.radius) || 1.5) / 0.52;
                    warning.mesh.position.set(tx, ty + 0.08, tz);
                    warning.mesh.scale.set(warningScale, warningScale, 1);
                    warning.mat.color.setHex(telegraph.type === 'summon' ? 0xa855f7 : (telegraph.type === 'bolt' ? 0xc084fc : (telegraph.type === 'bash' ? 0x38bdf8 : (telegraph.type === 'charge' ? 0xf97316 : 0xef4444))));
                    warning.mat.opacity = 0.34 + (0.22 * (0.5 + 0.5 * Math.sin(time * 14)));
                }
            }
            var oldIds = Object.keys(enemyRigs);
            for (var oi = 0; oi < oldIds.length; oi++) {
                if (!activeIds[oldIds[oi]]) {
                    entityRoot.remove(enemyRigs[oldIds[oi]].group);
                    enemyRigs[oldIds[oi]].bodyMat.dispose();
                    delete enemyRigs[oldIds[oi]];
                }
            }
            var oldTelegraphs = Object.keys(telegraphRigs);
            for (var ot = 0; ot < oldTelegraphs.length; ot++) {
                if (!activeTelegraphs[oldTelegraphs[ot]]) {
                    entityRoot.remove(telegraphRigs[oldTelegraphs[ot]].mesh);
                    telegraphRigs[oldTelegraphs[ot]].mat.dispose();
                    delete telegraphRigs[oldTelegraphs[ot]];
                }
            }

            // Loot sync
            var activeLoot = Object.create(null);
            var lootList = state.loot || [];
            for (var li = 0; li < lootList.length; li++) {
                var l = lootList[li];
                if (!l || l.picked) continue;
                activeLoot[l.id] = true;
                var lr = lootRigs[l.id];
                if (!lr) {
                    var lootColors = {
                        anchor: 0xa855f7, forge_cache: 0xf59e0b, toxic_vent: 0x84cc16, memorial_beacon: 0xfde68a, laser_designator: 0xfb7185,
                        health_orb: 0x4ade80, speed_boost: 0x22d3ee, damage_boost: 0xf97316,
                        shield_pickup: 0x60a5fa, rage_potion: 0xef4444, gold_multiplier: 0xfacc15, xp_multiplier: 0xc084fc,
                        soul_fountain: 0x34d399, blood_altar: 0xfb7185
                    };
                    var objectiveColor = lootColors[l.type];
                    var lMat = new THREE.MeshStandardMaterial({
                        color: objectiveColor || (l.type === 'conduit' ? 0x22d3ee : (l.type === 'weapon' ? (l.weaponRarity === 'Legendary' ? 0xe879f9 : (l.weaponRarity === 'Epic' ? 0xfacc15 : 0x38bdf8)) : (l.type === 'item' ? 0xa855f7 : (l.type === 'uusd' ? 0x22d3ee : 0xfacc15)))),
                        emissive: objectiveColor || (l.type === 'conduit' ? 0x0e7490 : (l.type === 'weapon' ? 0x164e63 : (l.type === 'item' ? 0x581c87 : 0x713f12))),
                        emissiveIntensity: 0.6,
                        roughness: 0.25,
                        metalness: 0.7
                    });
                    var mesh = new THREE.Mesh(geos.loot, lMat);
                    if (l.type === 'weapon') mesh.scale.setScalar(1.35);
                    if (l.type === 'conduit') mesh.scale.setScalar(1.6);
                    if (objectiveColor) mesh.scale.setScalar(1.45);
                    entityRoot.add(mesh);
                    lr = { mesh: mesh, mat: lMat };
                    lootRigs[l.id] = lr;
                }
                lr.mesh.position.set(l.x, (l.y || 0) + 0.4 + Math.sin(time * 4 + li) * 0.12, l.z);
                lr.mesh.rotation.y = time * 2.5;
            }
            var oldLoot = Object.keys(lootRigs);
            for (var ol = 0; ol < oldLoot.length; ol++) {
                if (!activeLoot[oldLoot[ol]]) {
                    entityRoot.remove(lootRigs[oldLoot[ol]].mesh);
                    lootRigs[oldLoot[ol]].mat.dispose();
                    delete lootRigs[oldLoot[ol]];
                }
            }

            // Projectiles sync (verticality-aware 3D tracers)
            var projectiles = state.projectiles || [];
            var ti = 0;
            for (var pi = 0; pi < projectiles.length && ti < 256; pi++) {
                var pr = projectiles[pi];
                if (!pr || pr.dead) continue;
                dummy.position.set(pr.x, pr.y, pr.z);
                lookTarget.set(pr.x + pr.vx, pr.y + pr.vy, pr.z + pr.vz);
                dummy.lookAt(lookTarget);
                dummy.scale.set(pr.explosive ? 2.2 : 1.0, pr.explosive ? 2.2 : 1.0, pr.explosive ? 0.65 : 1.2);
                dummy.updateMatrix();
                tracerInst.setMatrixAt(ti++, dummy.matrix);
                if (tracerInst.setColorAt) tracerInst.setColorAt(ti - 1, getTracerColor(pr, state));
            }
            tracerInst.count = ti;
            tracerInst.instanceMatrix.needsUpdate = true;
            if (tracerInst.instanceColor) tracerInst.instanceColor.needsUpdate = true;
        }

        function dispose() {
            scene.remove(entityRoot);
            var keys = Object.keys(geos);
            for (var i = 0; i < keys.length; i++) {
                try { geos[keys[i]].dispose(); } catch (_) {}
            }
            playerPrimaryMat.dispose();
            playerTrimMat.dispose();
            playerDarkMat.dispose();
            playerBubbleMat.dispose();
            moveMarkerMat.dispose();
            tetherMat.dispose();
            tracerMat.dispose();
            Object.keys(telegraphRigs).forEach(function (id) { telegraphRigs[id].mat.dispose(); });
        }

        return {
            sync: sync,
            applyAppearance: applyAppearance,
            dispose: dispose
        };
    }

    renderNs.EntityRenderer = { create: createEntityRenderer };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = renderNs.EntityRenderer;
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
