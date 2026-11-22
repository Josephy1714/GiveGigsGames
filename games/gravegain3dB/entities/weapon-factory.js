(function() {
    'use strict';

    class WeaponFactory {
        static buildWeapon(classType, weaponId = 'legacy', weapon = null) {
            const ClassType = window.GraveGainGameData?.ClassType || {
                WARRIOR: 'warrior',
                TANK: 'tank',
                SUPPORT: 'support',
                MAGE: 'mage'
            };
            const group = new THREE.Group();

            if (weaponId !== 'legacy') {
                const palette = {
                    rifle: { body: 0x263244, accent: 0x64748b, barrel: 10 },
                    sidearm: { body: 0x3f3f46, accent: 0x94a3b8, barrel: 6 },
                    scattergun: { body: 0x4a3325, accent: 0xb08a55, barrel: 12 },
                    sniper: { body: 0x172b3d, accent: 0x7dd3fc, barrel: 18 },
                    smg: { body: 0x263d34, accent: 0x79b89c, barrel: 8 },
                    launcher: { body: 0x442e3d, accent: 0xff814a, barrel: 12 }
                }[weaponId] || { body: 0x263244, accent: 0x64748b, barrel: 10 };
                const parts = weapon?.parts;
                const elementColor = { shock: 0x8f9fff, fire: 0xff6548, rot: 0xa7d85a }[weapon?.element];
                const traitColor = {
                    impact: 0xef8851, heat: 0xf8bf45, handling: 0x71dab3, ricochet: 0xa9a4ff,
                    charged: 0x7de8f7, triad: 0x57dfff, poison: 0xb6df58, burn: 0xff5a48
                }[weapon?.trait];
                const metal = new THREE.MeshStandardMaterial({ color: palette.body, metalness: 0.68, roughness: 0.34 });
                const signatureColor = elementColor ?? traitColor ?? palette.accent;
                const trim = new THREE.MeshStandardMaterial({ color: signatureColor, metalness: 0.78, roughness: 0.28,
                    emissive: elementColor ?? 0x000000, emissiveIntensity: elementColor ? 0.12 : 0 });
                const receiver = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.4, weaponId === 'sidearm' ? 5.2 : 7.5), metal);
                receiver.position.set(2.25, -2.7, -6.2);
                group.add(receiver);
                const barrelExtension = parts ? (2 - parts.barrel) * 0.8 : 0;
                const barrelIndex = parts ? parts.barrel : 2;
                const barrelRadius = [0.42, 0.5, 0.62, 0.78, 0.95][barrelIndex] || 0.62;
                const barrelLength = palette.barrel + barrelExtension;
                const barrel = new THREE.Mesh(new THREE.CylinderGeometry(barrelRadius * 0.84, barrelRadius, barrelLength, 10), trim);
                barrel.name = 'barrel';
                barrel.rotation.x = Math.PI / 2;
                barrel.position.set(2.25, -2.2, -10.2 - barrelExtension / 2);
                group.add(barrel);
                if (parts && barrelIndex >= 3 && weaponId !== 'launcher') {
                    const muzzleCollar = new THREE.Mesh(new THREE.TorusGeometry(barrelRadius * 0.82, 0.16, 6, 12), trim);
                    muzzleCollar.name = 'wide-bore muzzle';
                    muzzleCollar.position.set(2.25, -2.2, barrel.position.z - barrelLength / 2);
                    group.add(muzzleCollar);
                }
                const grip = new THREE.Mesh(new THREE.BoxGeometry(1.25, 3.1, 1.55), metal);
                grip.position.set(2.25, -4.9, -4.8);
                grip.rotation.x = -0.18;
                group.add(grip);
                if (parts && weaponId !== 'scattergun' && weaponId !== 'launcher') {
                    const magHeight = 1.1 + parts.feed * 0.45;
                    const magazine = new THREE.Mesh(new THREE.BoxGeometry(1.2, magHeight, 1.65), trim);
                    magazine.name = 'feed';
                    magazine.position.set(2.25, -3.85 - magHeight / 2, weaponId === 'sidearm' ? -4.8 : -7.5);
                    magazine.rotation.x = -0.16;
                    group.add(magazine);
                }
                if (parts && (weaponId === 'scattergun' || weaponId === 'launcher')) {
                    const chamber = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.15, 2.4 + parts.feed * 0.62), trim);
                    chamber.name = 'feed';
                    chamber.position.set(1.02, -2.8, -7);
                    group.add(chamber);
                }
                if (parts?.sight === 'prism') {
                    const sight = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.9, 2.2), trim);
                    sight.name = 'prism sight';
                    sight.position.set(2.25, -0.91, -7.9);
                    group.add(sight);
                }
                if (traitColor !== undefined) {
                    const socket = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), new THREE.MeshBasicMaterial({ color: traitColor }));
                    socket.name = 'relic socket';
                    socket.position.set(3.43, -1.85, -6.35);
                    group.add(socket);
                }
                if (weaponId !== 'sidearm') {
                    const stock = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.7, 3.2), metal);
                    stock.position.set(2.25, -2.6, -2.0);
                    group.add(stock);
                    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.0, 1.4), trim);
                    sight.position.set(2.25, -1.35, -6.5);
                    group.add(sight);
                }
                if (weaponId === 'launcher') {
                    const shroud = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.2, 8.5, 8), metal);
                    shroud.rotation.x = Math.PI / 2;
                    shroud.position.set(2.25, -2.2, -12.2 - barrelExtension);
                    group.add(shroud);
                    const collar = new THREE.Mesh(new THREE.TorusGeometry(1.37, 0.22, 6, 12), trim);
                    collar.position.set(2.25, -2.2, -16.45 - barrelExtension);
                    group.add(collar);
                } else if (weaponId === 'scattergun') {
                    const secondBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.48, 11 + barrelExtension, 10), trim);
                    secondBarrel.rotation.x = Math.PI / 2;
                    secondBarrel.position.set(3.25, -2.2, -10.0 - barrelExtension / 2);
                    group.add(secondBarrel);
                } else if (weaponId === 'rifle') {
                    const launcherBody = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.78, 0.88, 7.2, 10), metal
                    );
                    launcherBody.rotation.x = Math.PI / 2;
                    launcherBody.position.set(2.25, -3.5, -8.9);
                    group.add(launcherBody);
                    const launcherMuzzle = new THREE.Mesh(
                        new THREE.CylinderGeometry(1.0, 0.9, 0.8, 10), trim
                    );
                    launcherMuzzle.rotation.x = Math.PI / 2;
                    launcherMuzzle.position.set(2.25, -3.5, -12.9);
                    group.add(launcherMuzzle);
                } else if (weaponId === 'sniper') {
                    const scopeBody = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.82, 0.92, 3.4, 12), metal
                    );
                    scopeBody.rotation.x = Math.PI / 2;
                    scopeBody.position.set(2.25, -1.05, -6.6);
                    group.add(scopeBody);
                    const scopeLens = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.72, 0.72, 0.35, 12),
                        new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x0369a1, emissiveIntensity: 0.45, metalness: 0.8, roughness: 0.2 })
                    );
                    scopeLens.rotation.x = Math.PI / 2;
                    scopeLens.position.set(2.25, -1.05, -8.35);
                    group.add(scopeLens);
                    const scopeMount = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.65, 1.7), trim);
                    scopeMount.position.set(2.25, -2.15, -6.6);
                    group.add(scopeMount);
                    const boltHandle = new THREE.Group();
                    const boltShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.2, 8), trim);
                    boltShaft.rotation.z = Math.PI / 2;
                    boltShaft.position.x = 0.25;
                    boltHandle.add(boltShaft);
                    const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), metal);
                    boltKnob.position.x = 0.88;
                    boltHandle.add(boltKnob);
                    boltHandle.position.set(3.35, -2.5, -5.6);
                    boltHandle.userData.idlePosition = boltHandle.position.clone();
                    group.add(boltHandle);
                    group.boltHandle = boltHandle;
                }
                if (weaponId !== 'sidearm') {
                    const glove = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.18, roughness: 0.82 });
                    const supportHand = new THREE.Group();
                    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.45, 3.6), glove);
                    sleeve.position.set(0, -0.28, 1.55);
                    supportHand.add(sleeve);
                    const palm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.05, 2.0), glove);
                    palm.position.set(0, 0, -0.35);
                    supportHand.add(palm);
                    for (let finger = 0; finger < 4; finger++) {
                        const segment = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 1.05), glove);
                        segment.position.set(-0.48 + finger * 0.32, -0.48, -1.5);
                        supportHand.add(segment);
                    }
                    const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.78, 0.9), glove);
                    thumb.position.set(-0.92, 0.05, -0.45);
                    thumb.rotation.z = -0.35;
                    supportHand.add(thumb);
                    supportHand.position.set(1.0, -3.25, -9.15);
                    group.add(supportHand);
                    group.supportHand = supportHand;
                }
                const muzzleFlash = new THREE.Mesh(
                    new THREE.SphereGeometry(1.35, 8, 6),
                    new THREE.MeshBasicMaterial({
                        color: elementColor ?? ((weaponId === 'sidearm' || weaponId === 'sniper') ? 0x7dd3fc : 0xffc15a),
                        transparent: true,
                        opacity: 0,
                        depthWrite: false,
                        blending: THREE.AdditiveBlending,
                        toneMapped: false
                    })
                );
                muzzleFlash.position.set(weaponId === 'scattergun' ? 2.75 : 2.25, -2.2,
                    (weaponId === 'sidearm' ? -14 : (weaponId === 'sniper' ? -21.2 : -17)) - barrelExtension);
                muzzleFlash.scale.set(1.1, 1.1, 1.8);
                muzzleFlash.visible = false;
                group.add(muzzleFlash);
                const muzzleLight = new THREE.PointLight(elementColor ?? (weaponId === 'sniper' ? 0x7dd3fc : 0xffb34d), 0, 38, 2);
                muzzleLight.position.copy(muzzleFlash.position);
                group.add(muzzleLight);
                group.muzzleFlash = muzzleFlash;
                group.muzzleLight = muzzleLight;
                group.mainHand = receiver;
                group.weaponId = weaponId;
                return group;
            }

            if (classType === ClassType.WARRIOR) {
                // Steel Longsword
                const swordGroup = new THREE.Group();
                const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 4.0, 8), new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.8 }));
                hilt.position.set(0, -2.0, 0);
                swordGroup.add(hilt);

                const guard = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 }));
                swordGroup.add(guard);

                const blade = new THREE.Mesh(new THREE.BoxGeometry(1.0, 14.0, 0.3), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 }));
                blade.position.set(0, 7.0, 0);
                swordGroup.add(blade);

                swordGroup.position.set(2.8, -2.8, -6.5);
                swordGroup.rotation.set(-Math.PI / 4, 0, -Math.PI / 7);
                group.add(swordGroup);
                group.mainHand = swordGroup;

                // Shield in Offhand
                const shieldGroup = new THREE.Group();
                const shieldPlate = new THREE.Mesh(new THREE.BoxGeometry(4.5, 7.0, 0.6), new THREE.MeshStandardMaterial({ color: 0x801020, metalness: 0.4, roughness: 0.5 }));
                const shieldRim = new THREE.Mesh(new THREE.BoxGeometry(4.9, 7.4, 0.4), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 }));
                shieldRim.position.z = -0.1;
                shieldGroup.add(shieldPlate);
                shieldGroup.add(shieldRim);

                shieldGroup.position.set(-3.2, -3.2, -6.0);
                shieldGroup.rotation.set(0, Math.PI / 6, 0);
                group.add(shieldGroup);
                group.offHand = shieldGroup;

            } else if (classType === ClassType.MAGE) {
                // Astral Staff
                const staffGroup = new THREE.Group();
                const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 18.0, 8), new THREE.MeshStandardMaterial({ color: 0x2d1a38, roughness: 0.7 }));
                staffGroup.add(shaft);

                const tip = new THREE.Mesh(new THREE.OctahedronGeometry(1.6, 0), new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x7e22ce, emissiveIntensity: 0.8, roughness: 0.1 }));
                tip.position.set(0, 9.5, 0);
                staffGroup.add(tip);

                staffGroup.position.set(2.6, -3.0, -7.0);
                staffGroup.rotation.set(-Math.PI / 5, 0, -Math.PI / 9);
                group.add(staffGroup);
                group.mainHand = staffGroup;
                group.gemTip = tip;

            } else if (classType === ClassType.TANK) {
                // Spiked Warhammer
                const hammerGroup = new THREE.Group();
                const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 12.0, 8), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 }));
                handle.position.set(0, -3.0, 0);
                hammerGroup.add(handle);

                const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(4.0, 4.0, 6.0), new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.85, roughness: 0.3 }));
                hammerHead.position.set(0, 4.0, 0);
                hammerGroup.add(hammerHead);

                hammerGroup.position.set(2.9, -2.9, -6.8);
                hammerGroup.rotation.set(-Math.PI / 4.2, 0, -Math.PI / 6);
                group.add(hammerGroup);
                group.mainHand = hammerGroup;

                // Tower Shield
                const shieldGroup = new THREE.Group();
                const plate = new THREE.Mesh(new THREE.BoxGeometry(5.5, 9.5, 0.8), new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.2 }));
                shieldGroup.add(plate);
                shieldGroup.position.set(-3.5, -3.2, -6.0);
                shieldGroup.rotation.set(0, Math.PI / 5, 0);
                group.add(shieldGroup);
                group.offHand = shieldGroup;

            } else {
                // Support Magitech Chem-Gun
                const gunGroup = new THREE.Group();
                const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 10.0, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 }));
                barrel.rotation.x = Math.PI / 2;
                gunGroup.add(barrel);

                const flask = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 4.0, 8), new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.7, transparent: true, opacity: 0.8 }));
                flask.position.set(0, 1.2, -1.0);
                gunGroup.add(flask);

                gunGroup.position.set(2.4, -2.5, -6.5);
                group.add(gunGroup);
                group.mainHand = gunGroup;
            }

            return group;
        }
    }

    window.GraveGainWeaponFactory = WeaponFactory;
})();
