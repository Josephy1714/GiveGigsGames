(function () {
    'use strict';

    /**
     * LevelDecor: Adds ruined-temple architectural depth, bioluminescent flora,
     * carved totems, floor sigils, and atmospheric accent lighting to
     * GraveGain 3DA dungeons.
     */
    const LevelDecor = {
        /**
         * Populate the scene with temple props and accent lighting.
         * @param {Object} opts
         * @param {THREE.Scene} opts.scene
         * @param {Object} opts.dungeon - Generated dungeon object (grid, gridSize, rooms, theme)
         * @param {Array} opts.mapMeshes - Array to push created meshes/lights into for cleanup
         * @param {Object} opts.gfxPreset - Current graphics preset
         * @param {number} opts.lightBudget - Remaining PointLight budget
         */
        build(opts) {
            const scene = opts.scene;
            const dungeon = opts.dungeon;
            const mapMeshes = opts.mapMeshes;
            const presetName = (opts.gfxPreset && opts.gfxPreset.name) || 'balanced';

            // Skip heavy decor on potato preset to preserve framerate
            if (presetName === 'potato') return;
            const isLow = presetName === 'low';

            const TILE_SIZE = 48;
            let remainingLights = typeof opts.lightBudget === 'number' ? opts.lightBudget : 4;

            // Shared materials (cool slate stone, moss, warm amber sigil, mint rune, lime charge plant)
            const stoneMat = new THREE.MeshStandardMaterial({
                color: 0x3b4958,
                roughness: 0.88,
                metalness: 0.08
            });
            const darkStoneMat = new THREE.MeshStandardMaterial({
                color: 0x25303b,
                roughness: 0.92,
                metalness: 0.05
            });
            const mossMat = new THREE.MeshStandardMaterial({
                color: 0x365314,
                roughness: 0.95
            });
            const urnMat = new THREE.MeshStandardMaterial({
                color: 0x4b5563,
                roughness: 0.78,
                metalness: 0.1
            });
            const mintRuneMat = new THREE.MeshStandardMaterial({
                color: 0x2dd4bf,
                emissive: 0x14b8a6,
                emissiveIntensity: 1.1,
                roughness: 0.3
            });
            const amberRuneMat = new THREE.MeshStandardMaterial({
                color: 0xfbbf24,
                emissive: 0xd97706,
                emissiveIntensity: 1.0,
                roughness: 0.35
            });
            const plantBulbMat = new THREE.MeshStandardMaterial({
                color: 0xa3e635,
                emissive: 0x65a30d,
                emissiveIntensity: 0.95,
                roughness: 0.4
            });
            const plantLeafMat = new THREE.MeshStandardMaterial({
                color: 0x4d7c0f,
                roughness: 0.8
            });

            // Shared geometries
            const pillarGeo = new THREE.CylinderGeometry(5, 6.5, 56, 8);
            const capGeo = new THREE.BoxGeometry(15, 6, 15);
            const urnGeo = new THREE.CylinderGeometry(3.2, 2.2, 9, 8);
            const rubbleGeo = new THREE.DodecahedronGeometry(4.5, 0);
            const bulbGeo = new THREE.SphereGeometry(3.2, 8, 6);
            const leafGeo = new THREE.ConeGeometry(2.4, 6, 5);
            const sigilRingGeo = new THREE.RingGeometry(14, 17, 24);
            const sigilInnerGeo = new THREE.RingGeometry(7, 8.5, 16);

            function addMesh(mesh) {
                scene.add(mesh);
                mapMeshes.push(mesh);
                return mesh;
            }

            function addPointLight(color, intensity, distance, x, y, z) {
                if (remainingLights <= 0 || isLow) return null;
                remainingLights--;
                const light = new THREE.PointLight(color, intensity, distance, 1.5);
                light.position.set(x, y, z);
                scene.add(light);
                mapMeshes.push(light);
                return light;
            }

            function spawnChargePlant(x, z, scale) {
                const s = scale || 1;
                const group = new THREE.Group();
                group.position.set(x, 0, z);

                const bulb = new THREE.Mesh(bulbGeo, plantBulbMat);
                bulb.position.y = 3.2 * s;
                bulb.scale.set(s, s * 1.25, s);
                group.add(bulb);

                for (let i = 0; i < 4; i++) {
                    const leaf = new THREE.Mesh(leafGeo, plantLeafMat);
                    const angle = (i / 4) * Math.PI * 2 + 0.3;
                    leaf.position.set(Math.cos(angle) * 2.4 * s, 5.5 * s, Math.sin(angle) * 2.4 * s);
                    leaf.rotation.z = -Math.cos(angle) * 0.7;
                    leaf.rotation.x = Math.sin(angle) * 0.7;
                    leaf.scale.setScalar(s);
                    group.add(leaf);
                }

                addMesh(group);
            }

            function spawnUrnCluster(x, z) {
                const group = new THREE.Group();
                group.position.set(x, 0, z);

                const u1 = new THREE.Mesh(urnGeo, urnMat);
                u1.position.set(0, 4.5, 0);
                group.add(u1);

                const u2 = new THREE.Mesh(urnGeo, urnMat);
                u2.position.set(5.5, 3.6, 3.2);
                u2.scale.setScalar(0.8);
                group.add(u2);

                const rub = new THREE.Mesh(rubbleGeo, mossMat);
                rub.position.set(-4.5, 2.2, 4);
                rub.scale.set(1.1, 0.6, 0.9);
                group.add(rub);

                addMesh(group);
            }

            function spawnFloorSigil(x, z, isAmber) {
                const mat = isAmber ? amberRuneMat : mintRuneMat;
                const outer = new THREE.Mesh(sigilRingGeo, mat);
                outer.rotation.x = -Math.PI / 2;
                outer.position.set(x, 0.55, z);
                addMesh(outer);

                const inner = new THREE.Mesh(sigilInnerGeo, mat);
                inner.rotation.x = -Math.PI / 2;
                inner.position.set(x, 0.58, z);
                addMesh(inner);
            }

            function spawnCarvedTotem(x, z) {
                const group = new THREE.Group();
                group.position.set(x, 0, z);

                // Stepped base plinth
                const base = new THREE.Mesh(new THREE.BoxGeometry(26, 6, 26), darkStoneMat);
                base.position.y = 3;
                group.add(base);

                // Glowing rune band
                const runeBand = new THREE.Mesh(new THREE.BoxGeometry(22, 4, 22), mintRuneMat);
                runeBand.position.y = 8;
                group.add(runeBand);

                // Carved central column
                const col = new THREE.Mesh(new THREE.CylinderGeometry(7, 8.5, 32, 8), stoneMat);
                col.position.y = 26;
                group.add(col);

                // Crown cap
                const crown = new THREE.Mesh(new THREE.BoxGeometry(18, 7, 18), darkStoneMat);
                crown.position.y = 44;
                group.add(crown);

                addMesh(group);
                addPointLight(0x2dd4bf, 1.4, 150, x, 18, z);
            }

            function spawnBackwallStatue(x, z) {
                const group = new THREE.Group();
                group.position.set(x, 0, z);

                // Pedestal
                const ped = new THREE.Mesh(new THREE.BoxGeometry(34, 14, 18), darkStoneMat);
                ped.position.y = 7;
                group.add(ped);

                // Torso / monolith
                const body = new THREE.Mesh(new THREE.BoxGeometry(22, 30, 14), stoneMat);
                body.position.y = 29;
                group.add(body);

                // Shoulders / head
                const head = new THREE.Mesh(new THREE.CylinderGeometry(6, 7.5, 12, 6), stoneMat);
                head.position.y = 50;
                group.add(head);

                // Glowing eyes / rune core
                const eye = new THREE.Mesh(new THREE.BoxGeometry(8, 2.5, 2), amberRuneMat);
                eye.position.set(0, 49, 6.8);
                group.add(eye);

                addMesh(group);
                addPointLight(0xf59e0b, 1.3, 140, x, 32, z + 16);
            }

            // Decorate each room based on its type and size
            dungeon.rooms.forEach((room) => {
                const cx = room.cx * TILE_SIZE + 24;
                const cz = room.cy * TILE_SIZE + 24;
                const minX = room.x * TILE_SIZE + 22;
                const maxX = (room.x + room.w) * TILE_SIZE - 22;
                const minZ = room.y * TILE_SIZE + 22;
                const maxZ = (room.y + room.h) * TILE_SIZE - 22;

                // Corner pillars in larger rooms (w >= 6 && h >= 6)
                if (room.w >= 6 && room.h >= 6 && !isLow) {
                    const corners = [
                        [minX, minZ],
                        [maxX, minZ],
                        [minX, maxZ],
                        [maxX, maxZ]
                    ];
                    corners.forEach(([px, pz]) => {
                        const p = new THREE.Mesh(pillarGeo, darkStoneMat);
                        p.position.set(px, 28, pz);
                        addMesh(p);

                        const cap = new THREE.Mesh(capGeo, stoneMat);
                        cap.position.set(px, 57, pz);
                        addMesh(cap);
                    });
                }

                // Bioluminescent charge plants in 1-2 corners
                spawnChargePlant(minX + 10, maxZ - 10, 1.0);
                if (room.w >= 5) {
                    spawnChargePlant(maxX - 10, minZ + 10, 0.85);
                }

                // Urns & mossy rubble
                spawnUrnCluster(maxX - 12, maxZ - 12);

                // Room-type focal pieces
                if (room.type === 'spawn') {
                    spawnFloorSigil(cx, cz, true);
                } else if (room.type === 'boss') {
                    spawnFloorSigil(cx, cz, true);
                    spawnBackwallStatue(cx, minZ + 8);
                } else if (room.type === 'treasury' || room.type === 'lab' || room.type === 'sanctum') {
                    if (room.w >= 6 && room.h >= 6) {
                        spawnCarvedTotem(cx, cz);
                    } else {
                        spawnFloorSigil(cx, cz, false);
                    }
                } else if (room.type === 'graveyard') {
                    spawnBackwallStatue(cx, minZ + 8);
                }
            });
        }
    };

    window.LevelDecor = LevelDecor;
})();
