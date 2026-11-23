(function() {
    'use strict';

    class WeaponFactory {
        static buildSpecialRaceWeapon(group, weaponId, weapon) {
            const attachFlash = (x, y, z, color, lightColor = color) => {
                const muzzleFlash = new THREE.Mesh(
                    new THREE.SphereGeometry(weaponId === 'flamethrower' ? 2.0 : 1.25, 8, 6),
                    new THREE.MeshBasicMaterial({
                        color, transparent: true, opacity: 0, depthWrite: false,
                        blending: THREE.AdditiveBlending, toneMapped: false
                    })
                );
                muzzleFlash.position.set(x, y, z);
                muzzleFlash.scale.set(1.1, 1.1, weaponId === 'flamethrower' ? 2.6 : 1.6);
                muzzleFlash.visible = false;
                group.add(muzzleFlash);
                const muzzleLight = new THREE.PointLight(lightColor, 0, 38, 2);
                muzzleLight.position.copy(muzzleFlash.position);
                group.add(muzzleLight);
                group.muzzleFlash = muzzleFlash;
                group.muzzleLight = muzzleLight;
            };

            if (weaponId === 'double_barrel') {
                const wood = new THREE.MeshStandardMaterial({ color: 0x5c361c, roughness: 0.78, metalness: 0.12 });
                const steel = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.82, roughness: 0.28 });
                const brass = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });
                const stock = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.0, 4.8), wood);
                stock.position.set(2.25, -3.1, -2.5);
                const receiver = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.1, 4.2), steel);
                receiver.position.set(2.25, -2.6, -6.2);
                const forend = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.1, 4.4), wood);
                forend.position.set(2.25, -3.1, -9.8);
                const barrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.58, 12.5, 10), steel);
                barrelL.rotation.x = Math.PI / 2;
                barrelL.position.set(1.68, -2.05, -13.2);
                const barrelR = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.58, 12.5, 10), steel);
                barrelR.rotation.x = Math.PI / 2;
                barrelR.position.set(2.82, -2.05, -13.2);
                const rib = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 12.2), brass);
                rib.position.set(2.25, -1.48, -13.2);
                group.add(stock, receiver, forend, barrelL, barrelR, rib);
                group.mainHand = receiver;
                group.weaponId = weaponId;
                attachFlash(2.25, -2.05, -19.8, 0xffa94d);
                return group;
            }

            if (weaponId === 'swift_bow' || weaponId === 'longbow') {
                const isLong = weaponId === 'longbow';
                const wood = new THREE.MeshStandardMaterial({ color: isLong ? 0x6b4423 : 0x2e4a3d, roughness: 0.65, metalness: 0.2 });
                const elvenTrim = new THREE.MeshStandardMaterial({ color: isLong ? 0xfbbf24 : 0x4ade80, emissive: isLong ? 0x78350f : 0x14532d, emissiveIntensity: 0.35, metalness: 0.75, roughness: 0.25 });
                const stringMat = new THREE.MeshBasicMaterial({ color: isLong ? 0xfef08a : 0x86efac });
                const bowGroup = new THREE.Group();
                bowGroup.position.set(2.1, -2.2, -8.5);
                bowGroup.rotation.z = isLong ? -0.14 : -0.28;
                const riser = new THREE.Mesh(new THREE.BoxGeometry(0.85, isLong ? 4.4 : 3.2, 1.15), elvenTrim);
                const limbTop = new THREE.Mesh(new THREE.BoxGeometry(0.65, isLong ? 6.4 : 4.5, 0.8), wood);
                limbTop.position.set(0, isLong ? 4.8 : 3.5, 0.85);
                limbTop.rotation.x = 0.28;
                const limbBot = new THREE.Mesh(new THREE.BoxGeometry(0.65, isLong ? 6.4 : 4.5, 0.8), wood);
                limbBot.position.set(0, isLong ? -4.8 : -3.5, 0.85);
                limbBot.rotation.x = -0.28;
                const string = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, isLong ? 14.5 : 10.6, 6), stringMat);
                string.position.set(0, 0, 1.75);
                const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, isLong ? 11.5 : 9.2, 6), wood);
                arrowShaft.rotation.x = Math.PI / 2;
                arrowShaft.position.set(-0.35, 0.4, -2.2);
                const arrowTip = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.2, 6), elvenTrim);
                arrowTip.rotation.x = -Math.PI / 2;
                arrowTip.position.set(-0.35, 0.4, isLong ? -8.2 : -7.0);
                bowGroup.add(riser, limbTop, limbBot, string, arrowShaft, arrowTip);
                group.add(bowGroup);
                group.mainHand = bowGroup;
                group.weaponId = weaponId;
                attachFlash(2.0, -1.8, -16.0, isLong ? 0xfef08a : 0x4ade80);
                return group;
            }

            if (weaponId === 'steam_cannon') {
                const iron = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.78, roughness: 0.35 });
                const brass = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.82, roughness: 0.26 });
                const steamGlow = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x0284c7, emissiveIntensity: 0.55 });
                const boiler = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 6.8, 12), brass);
                boiler.rotation.x = Math.PI / 2;
                boiler.position.set(2.25, -2.6, -6.5);
                const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 0.95, 7.6, 12), iron);
                barrel.rotation.x = Math.PI / 2;
                barrel.position.set(2.25, -2.2, -12.6);
                const muzzleRing = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.28, 8, 14), brass);
                muzzleRing.position.set(2.25, -2.2, -16.3);
                const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.4, 10), steamGlow);
                gauge.rotation.z = Math.PI / 2;
                gauge.position.set(0.55, -1.4, -6.2);
                const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 6.5, 8), brass);
                pipe.rotation.x = Math.PI / 2;
                pipe.position.set(3.45, -3.1, -8.5);
                const grip = new THREE.Mesh(new THREE.BoxGeometry(1.3, 3.2, 1.7), iron);
                grip.position.set(2.25, -4.9, -4.6);
                grip.rotation.x = -0.18;
                group.add(boiler, barrel, muzzleRing, gauge, pipe, grip);
                group.mainHand = boiler;
                group.weaponId = weaponId;
                attachFlash(2.25, -2.2, -17.0, 0xbae6fd, 0x38bdf8);
                return group;
            }

            if (weaponId === 'flamethrower') {
                const bodyMat = new THREE.MeshStandardMaterial({ color: 0x451a03, metalness: 0.62, roughness: 0.38 });
                const tankMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.55, roughness: 0.32 });
                const brass = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.28 });
                const pilotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
                const receiver = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.3, 8.2), bodyMat);
                receiver.position.set(2.25, -2.8, -7.2);
                const tankL = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 6.2, 10), tankMat);
                tankL.rotation.x = Math.PI / 2;
                tankL.position.set(1.0, -3.5, -7.8);
                const tankR = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 6.2, 10), tankMat);
                tankR.rotation.x = Math.PI / 2;
                tankR.position.set(3.5, -3.5, -7.8);
                const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.95, 7.8, 10), brass);
                nozzle.rotation.x = Math.PI / 2;
                nozzle.position.set(2.25, -2.2, -13.8);
                const shroud = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.4, 10), bodyMat);
                shroud.rotation.x = Math.PI / 2;
                shroud.position.set(2.25, -2.2, -16.8);
                const pilotFlame = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), pilotMat);
                pilotFlame.position.set(2.25, -1.65, -18.1);
                group.add(receiver, tankL, tankR, nozzle, shroud, pilotFlame);
                group.mainHand = receiver;
                group.weaponId = weaponId;
                attachFlash(2.25, -2.2, -18.8, 0xff6b1a, 0xff4500);
                return group;
            }

            if (weaponId === 'crossbow') {
                const wood = new THREE.MeshStandardMaterial({ color: 0x452b18, roughness: 0.78 });
                const iron = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.78, roughness: 0.32 });
                const boltMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6 });
                const rail = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.8, 11.5), wood);
                rail.position.set(2.25, -2.7, -8.5);
                const prodL = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.65, 1.1), iron);
                prodL.position.set(-0.3, -2.1, -13.6);
                prodL.rotation.y = 0.25;
                const prodR = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.65, 1.1), iron);
                prodR.position.set(4.8, -2.1, -13.6);
                prodR.rotation.y = -0.25;
                const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 8.5, 6), boltMat);
                bolt.rotation.x = Math.PI / 2;
                bolt.position.set(2.25, -1.7, -11.5);
                group.add(rail, prodL, prodR, bolt);
                group.mainHand = rail;
                group.weaponId = weaponId;
                attachFlash(2.25, -1.8, -16.5, 0xf97316);
                return group;
            }

            if (weaponId === 'throwing_rock' || weaponId === 'throwing_cross' || weaponId === 'throwing_spear') {
                const holder = new THREE.Group();
                holder.position.set(2.6, -2.6, -7.8);
                if (weaponId === 'throwing_rock') {
                    const stone = new THREE.Mesh(
                        new THREE.DodecahedronGeometry(2.15, 0),
                        new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.92, metalness: 0.08 })
                    );
                    holder.add(stone);
                } else if (weaponId === 'throwing_cross') {
                    const iron = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.25 });
                    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.95, 6.2, 0.45), iron);
                    const barH = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.95, 0.45), iron);
                    barH.position.y = 0.9;
                    holder.rotation.set(0.35, -0.3, 0.25);
                    holder.add(barV, barH);
                } else {
                    const wood = new THREE.MeshStandardMaterial({ color: 0x5c361c, roughness: 0.82 });
                    const steel = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });
                    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 15.0, 8), wood);
                    shaft.rotation.x = Math.PI / 2;
                    shaft.position.z = -1.5;
                    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.85, 3.2, 4), steel);
                    tip.rotation.x = -Math.PI / 2;
                    tip.position.z = -10.2;
                    holder.add(shaft, tip);
                }
                group.add(holder);
                group.mainHand = holder;
                group.weaponId = weaponId;
                attachFlash(2.5, -2.2, -13.0, weaponId === 'throwing_cross' ? 0x38bdf8 : 0xfbbf24);
                return group;
            }

            return null;
        }

        static buildWeapon(classType, weaponId = 'legacy', weapon = null) {
            const ClassType = window.GraveGainGameData?.ClassType || {
                WARRIOR: 'warrior',
                TANK: 'tank',
                SUPPORT: 'support',
                MAGE: 'mage'
            };
            const group = new THREE.Group();

            if (weaponId !== 'legacy') {
                const special = WeaponFactory.buildSpecialRaceWeapon(group, weaponId, weapon);
                if (special) return special;
                const palette = {
                    rifle: { body: 0x263244, accent: 0x64748b, barrel: 10 },
                    sidearm: { body: 0x3f3f46, accent: 0x94a3b8, barrel: 6 },
                    scattergun: { body: 0x4a3325, accent: 0xb08a55, barrel: 12 },
                    sniper: { body: 0x172b3d, accent: 0x7dd3fc, barrel: 18 },
                    smg: { body: 0x263d34, accent: 0x79b89c, barrel: 8 },
                    launcher: { body: 0x442e3d, accent: 0xff814a, barrel: 12 },
                    lmg: { body: 0x2d3a2e, accent: 0xa3e635, barrel: 14 },
                    dmr: { body: 0x312e45, accent: 0xc084fc, barrel: 15 },
                    burst: { body: 0x1e3a4c, accent: 0x38bdf8, barrel: 11 },
                    revolver: { body: 0x452b2b, accent: 0xfbbf24, barrel: 7 },
                    devastator: { body: 0x4a2618, accent: 0xff8235, barrel: 13 },
                    vortex: { body: 0x0f2d3a, accent: 0x3af4ff, barrel: 17 },
                    c_shotgun: { body: 0x423522, accent: 0xffdb59, barrel: 11 },
                    electro: { body: 0x2f1e47, accent: 0xca8bff, barrel: 10 }
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
                if (weaponId === 'sidearm') {
                    const pistolTier = Number(weapon?.pistolTier) || 0;
                    const slideColor = pistolTier >= 22 ? 0xfbbf24 : pistolTier >= 15 ? 0xc084fc : pistolTier >= 9 ? 0x38bdf8 : pistolTier >= 4 ? 0xa3e635 : signatureColor;
                    const slideMat = pistolTier >= 4
                        ? new THREE.MeshStandardMaterial({ color: slideColor, metalness: 0.85, roughness: 0.22, emissive: slideColor, emissiveIntensity: pistolTier >= 15 ? 0.22 : 0.08 })
                        : trim;
                    // Detailed tactical slide, iron sights, trigger guard, underbarrel rail & laser
                    const slide = new THREE.Group();
                    slide.position.set(2.25, -1.65, -7.2);
                    const slideBody = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.35, 9.2), slideMat);
                    slide.add(slideBody);
                    const sightGlowColor = pistolTier >= 15 ? 0xfbbf24 : 0x38bdf8;
                    const rearSightL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.55), pistolTier >= 4 ? new THREE.MeshBasicMaterial({ color: sightGlowColor }) : metal);
                    rearSightL.position.set(-0.42, 0.82, 3.9);
                    const rearSightR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.55), pistolTier >= 4 ? new THREE.MeshBasicMaterial({ color: sightGlowColor }) : metal);
                    rearSightR.position.set(0.42, 0.82, 3.9);
                    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 0.45), new THREE.MeshBasicMaterial({ color: sightGlowColor }));
                    frontSight.position.set(0, 0.84, -4.1);
                    slide.add(rearSightL, rearSightR, frontSight);
                    if (pistolTier >= 9) {
                        // Reflex micro-optic on slide for MK III+
                        const opticFrame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.65, 1.5), metal);
                        opticFrame.position.set(0, 0.95, 1.5);
                        const opticDot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
                        opticDot.position.set(0, 1.0, 1.4);
                        slide.add(opticFrame, opticDot);
                    }
                    group.add(slide);
                    group.pistolSlide = slide;

                    const underRail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 4.6), metal);
                    underRail.position.set(2.25, -3.15, -9.2);
                    const tacLight = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 2.2, 10), pistolTier >= 4 ? slideMat : metal);
                    tacLight.rotation.x = Math.PI / 2;
                    tacLight.position.set(2.25, -3.85, -9.8);
                    const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.15, 2.1), metal);
                    triggerGuard.position.set(2.25, -4.15, -6.5);
                    const magBase = new THREE.Mesh(new THREE.BoxGeometry(1.45, pistolTier >= 9 ? 0.85 : 0.45, 1.85), slideMat);
                    magBase.position.set(2.25, pistolTier >= 9 ? -6.75 : -6.55, -4.45);
                    magBase.rotation.x = -0.18;
                    group.add(underRail, tacLight, triggerGuard, magBase);
                    if (pistolTier >= 4) {
                        // Compensator / match muzzle brake for MK II+
                        const comp = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.65, 2.1), slideMat);
                        comp.position.set(2.25, -2.05, -13.1 - barrelExtension * 0.5);
                        group.add(comp);
                    }
                    if (pistolTier >= 15) {
                        // Tritium/plasma laser emitter dot
                        const laserDot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
                        laserDot.position.set(2.25, -3.85, -11.1);
                        group.add(laserDot);
                    }
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
