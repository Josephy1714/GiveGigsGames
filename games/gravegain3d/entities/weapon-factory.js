(function() {
    'use strict';

    class WeaponFactory {
        static buildWeapon(classType, weaponId = 'legacy') {
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
                    scattergun: { body: 0x4a3325, accent: 0xb08a55, barrel: 12 }
                }[weaponId] || { body: 0x263244, accent: 0x64748b, barrel: 10 };
                const metal = new THREE.MeshStandardMaterial({ color: palette.body, metalness: 0.68, roughness: 0.34 });
                const trim = new THREE.MeshStandardMaterial({ color: palette.accent, metalness: 0.78, roughness: 0.28 });
                const receiver = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.4, weaponId === 'sidearm' ? 5.2 : 7.5), metal);
                receiver.position.set(2.25, -2.7, -6.2);
                group.add(receiver);
                const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, palette.barrel, 10), trim);
                barrel.rotation.x = Math.PI / 2;
                barrel.position.set(2.25, -2.2, -10.2);
                group.add(barrel);
                const grip = new THREE.Mesh(new THREE.BoxGeometry(1.25, 3.1, 1.55), metal);
                grip.position.set(2.25, -4.9, -4.8);
                grip.rotation.x = -0.18;
                group.add(grip);
                if (weaponId !== 'sidearm') {
                    const stock = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.7, 3.2), metal);
                    stock.position.set(2.25, -2.6, -2.0);
                    group.add(stock);
                    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.0, 1.4), trim);
                    sight.position.set(2.25, -1.35, -6.5);
                    group.add(sight);
                }
                if (weaponId === 'scattergun') {
                    const secondBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.48, 11, 10), trim);
                    secondBarrel.rotation.x = Math.PI / 2;
                    secondBarrel.position.set(3.25, -2.2, -10.0);
                    group.add(secondBarrel);
                }
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
