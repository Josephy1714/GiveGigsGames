(function() {
    'use strict';

    class WeaponFactory {
        static buildWeapon(classType) {
            const ClassType = window.GraveGainGameData?.ClassType || {
                WARRIOR: 'warrior',
                TANK: 'tank',
                SUPPORT: 'support',
                MAGE: 'mage'
            };
            const group = new THREE.Group();

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

        static buildLootWeapon(weaponData) {
            const group = new THREE.Group();
            const mainHand = new THREE.Group();
            const tint = weaponData?.tintHex || 0xe2e8f0;
            const rarityHex = weaponData?.rarityHex || 0xffffff;
            const arch = weaponData?.archetype || 'katana';
            const emissiveInt = weaponData?.rarity === 'legendary' ? 0.55 : (weaponData?.rarity === 'epic' ? 0.35 : 0.18);

            const metalMat = new THREE.MeshStandardMaterial({ color: tint, metalness: 0.85, roughness: 0.22, emissive: rarityHex, emissiveIntensity: emissiveInt });
            const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
            const glowMat = new THREE.MeshStandardMaterial({ color: rarityHex, emissive: rarityHex, emissiveIntensity: 0.85, roughness: 0.15 });

            if (arch === 'katana') {
                const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 3.6, 8), darkMat);
                hilt.position.y = -2;
                const blade = new THREE.Mesh(new THREE.BoxGeometry(0.45, 15.5, 0.22), metalMat);
                blade.position.y = 7.2;
                mainHand.add(hilt, blade);
            } else if (arch === 'greatsword') {
                const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 4.5, 8), darkMat);
                hilt.position.y = -2.5;
                const guard = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.0, 1.2), glowMat);
                const blade = new THREE.Mesh(new THREE.BoxGeometry(1.8, 17.0, 0.45), metalMat);
                blade.position.y = 8.5;
                mainHand.add(hilt, guard, blade);
            } else if (arch === 'battleaxe') {
                const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 14, 8), darkMat);
                const head = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4.2, 0.7), metalMat);
                head.position.y = 5.0;
                mainHand.add(haft, head);
            } else if (arch === 'scythe') {
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 17, 8), darkMat);
                const blade = new THREE.Mesh(new THREE.BoxGeometry(7.0, 1.4, 0.35), glowMat);
                blade.position.set(2.8, 7.6, 0);
                blade.rotation.z = -0.35;
                mainHand.add(pole, blade);
            } else if (arch === 'twinblade') {
                const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 5, 8), darkMat);
                const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8.5, 0.25), metalMat);
                b1.position.y = 6.5;
                const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8.5, 0.25), glowMat);
                b2.position.y = -6.5;
                mainHand.add(grip, b1, b2);
            } else if (arch === 'warhammer') {
                const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 13, 8), darkMat);
                const head = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.8, 5.5), metalMat);
                head.position.y = 5.2;
                mainHand.add(handle, head);
            } else if (arch === 'dagger') {
                const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 2.5, 8), darkMat);
                const blade = new THREE.Mesh(new THREE.ConeGeometry(0.7, 7.5, 4), metalMat);
                blade.position.y = 4.5;
                mainHand.add(hilt, blade);
            } else if (arch === 'halberd') {
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 18, 8), darkMat);
                const tip = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.5, 4), metalMat);
                tip.position.y = 10.5;
                const axe = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.8, 0.4), glowMat);
                axe.position.set(1.5, 7.5, 0);
                mainHand.add(pole, tip, axe);
            } else if (arch === 'flail') {
                const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 9, 8), darkMat);
                const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), glowMat);
                orb.position.y = 6.2;
                mainHand.add(handle, orb);
            } else if (arch === 'wand' || arch === 'staff') {
                const len = arch === 'staff' ? 18 : 10;
                const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, len, 8), darkMat);
                const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 0), glowMat);
                gem.position.y = len * 0.5 + 1.0;
                mainHand.add(shaft, gem);
            } else if (arch === 'claymore') {
                const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 4.5, 8), darkMat);
                hilt.position.y = -2.5;
                const guard = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.9, 1.0), glowMat);
                guard.rotation.z = 0.15;
                const blade = new THREE.Mesh(new THREE.BoxGeometry(1.5, 18.0, 0.4), metalMat);
                blade.position.y = 9.0;
                mainHand.add(hilt, guard, blade);
            } else if (arch === 'rapier') {
                const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 3.0, 8), darkMat);
                hilt.position.y = -2.0;
                const cup = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), glowMat);
                const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 16.0, 6), metalMat);
                blade.position.y = 8.0;
                mainHand.add(hilt, cup, blade);
            } else if (arch === 'spear') {
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 20, 8), darkMat);
                const tip = new THREE.Mesh(new THREE.ConeGeometry(0.95, 5.0, 4), glowMat);
                tip.position.y = 12.0;
                mainHand.add(pole, tip);
            } else if (arch === 'glaive') {
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 17, 8), darkMat);
                const blade = new THREE.Mesh(new THREE.BoxGeometry(1.4, 7.5, 0.35), glowMat);
                blade.position.set(0.3, 10.5, 0);
                blade.rotation.z = -0.18;
                mainHand.add(pole, blade);
            } else if (arch === 'crossbow') {
                const stock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 10), darkMat);
                const bow = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.5, 0.8), glowMat);
                bow.position.z = -3.8;
                mainHand.add(stock, bow);
            } else if (arch === 'chakram') {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.45, 8, 20), glowMat);
                const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), metalMat);
                mainHand.add(ring, core);
            } else if (arch === 'trident') {
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 18, 8), darkMat);
                const bar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.6, 0.6), glowMat);
                bar.position.y = 9.0;
                const p1 = new THREE.Mesh(new THREE.ConeGeometry(0.45, 4.0, 4), metalMat);
                p1.position.set(0, 11.2, 0);
                const p2 = p1.clone(); p2.position.set(-1.8, 10.8, 0);
                const p3 = p1.clone(); p3.position.set(1.8, 10.8, 0);
                mainHand.add(pole, bar, p1, p2, p3);
            } else if (arch === 'grimoire') {
                const cover = new THREE.Mesh(new THREE.BoxGeometry(4.5, 5.8, 1.4), darkMat);
                const rune = new THREE.Mesh(new THREE.OctahedronGeometry(1.3, 0), glowMat);
                rune.position.z = 1.0;
                mainHand.add(cover, rune);
            } else {
                // railgun
                const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 12), darkMat);
                const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 10, 8), glowMat);
                coil.rotation.x = Math.PI / 2;
                coil.position.y = 0.6;
                mainHand.add(body, coil);
            }

            mainHand.position.set(2.8, -2.8, -6.5);
            mainHand.rotation.set(-Math.PI / 4, 0, -Math.PI / 7);
            group.add(mainHand);
            group.mainHand = mainHand;
            return group;
        }
    }

    window.GraveGainWeaponFactory = WeaponFactory;
})();
