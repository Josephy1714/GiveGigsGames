// BattleSharks 3D — Open-World Biomes, Caves, BS-07 Aquarium & Decorations
window.BSWorld = (() => {
    'use strict';

    function buildAquariumComplex(scene, AQUARIUM_POS, shopOwned) {
        const baseGroup = new THREE.Group();
        baseGroup.position.copy(AQUARIUM_POS);

        const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.78, roughness: 0.28 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.35 });
        const glassMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.14, side: THREE.DoubleSide });
        const trimMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

        // Main Aquarium Containment Bay
        const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.9, 20), steelMat);
        floor.position.y = -5.5;
        const roof = new THREE.Mesh(new THREE.BoxGeometry(18, 0.9, 20), steelMat);
        roof.position.y = 5.5;
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(18, 11, 0.9), steelMat);
        backWall.position.z = 10;
        baseGroup.add(floor, roof, backWall);

        // Observation Gallery & Side Glass
        [-9, 9].forEach((x) => {
            const glass = new THREE.Mesh(new THREE.PlaneGeometry(20, 10.5), glassMat);
            glass.rotation.y = Math.PI / 2;
            glass.position.x = x;
            baseGroup.add(glass);

            const strut = new THREE.Mesh(new THREE.BoxGeometry(0.7, 11.4, 0.7), darkMat);
            strut.position.set(x, 0, -10);
            baseGroup.add(strut);
        });

        // Glowing Bay 07 Loading Gate Arch
        const gateTop = new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.5, 0.6), trimMat);
        gateTop.position.set(0, 5.2, -10);
        baseGroup.add(gateTop);

        // Research Tower Dome above BS-07
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(5, 6.5, 9, 16), steelMat);
        tower.position.set(0, 10, 4);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), glassMat);
        dome.position.set(0, 14.5, 4);
        baseGroup.add(tower, dome);

        // Shop-Unlocked Aquarium Decorations
        if (shopOwned.decor_chest) {
            const chest = new THREE.Mesh(
                new THREE.BoxGeometry(2.4, 1.6, 1.6),
                new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7, roughness: 0.3 })
            );
            chest.position.set(-5.5, -4.3, 4);
            baseGroup.add(chest);
        }
        if (shopOwned.decor_castle) {
            const castle = new THREE.Group();
            castle.position.set(5.2, -4.5, 5);
            const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
            const keep = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.5, 3.2), stoneMat);
            castle.add(keep);
            [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(([tx, tz]) => {
                const t = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4.8, 8), stoneMat);
                t.position.set(tx, 0.6, tz);
                castle.add(t);
            });
            baseGroup.add(castle);
        }
        if (shopOwned.decor_skeleton) {
            const skel = new THREE.Group();
            skel.position.set(0, -4.2, 6.5);
            const boneMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });
            const skull = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), boneMat);
            skull.position.y = 1.2;
            const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 1.1, 8), boneMat);
            skel.add(skull, rib);
            baseGroup.add(skel);
        }
        if (shopOwned.decor_ship) {
            const ship = new THREE.Mesh(
                new THREE.BoxGeometry(4.5, 3.0, 11),
                new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 })
            );
            ship.position.set(-20, -12, -14);
            ship.rotation.z = 0.25;
            baseGroup.add(ship);
        }

        const baseLight = new THREE.PointLight(0x00e5ff, 2.0, 40);
        baseLight.position.set(0, 3, 0);
        baseGroup.add(baseLight);

        scene.add(baseGroup);
        return baseGroup;
    }

    function buildTreasureChests(scene, ARENA_RADIUS, FLOOR_Y) {
        const chests = [];
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
        const goldMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        for (let i = 0; i < 12; i++) {
            const ang = Math.random() * Math.PI * 2;
            const rad = 30 + Math.random() * (ARENA_RADIUS - 40);
            const g = new THREE.Group();
            g.position.set(Math.cos(ang) * rad, FLOOR_Y + 1.5, Math.sin(ang) * rad);
            const box = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 1.8), woodMat);
            const glow = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.35, 1.9), goldMat);
            glow.position.y = 0.3;
            g.add(box, glow);
            scene.add(g);
            chests.push({ mesh: g, pos: g.position, opened: false });
        }
        return chests;
    }

    return { buildAquariumComplex, buildTreasureChests };
})();
