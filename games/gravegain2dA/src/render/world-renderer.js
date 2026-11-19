(function (root) {
    'use strict';

    var renderNs = root.GraveGainRender = root.GraveGainRender || {};

    var BIOME_PALETTES = {
        cathedral: {
            floor: 0x726a80,
            wall: 0x554b63,
            accent: 0xb48a48,
            fog: 0x0b0812,
            fogDensity: 0.005,
            ambientSky: 0x584c73,
            ambientGround: 0x16121c,
            dirColor: 0xffdfb0
        },
        manufactorum: {
            floor: 0x63707d,
            wall: 0x45515c,
            accent: 0xd97706,
            fog: 0x101317,
            fogDensity: 0.006,
            ambientSky: 0x64748b,
            ambientGround: 0x1b1510,
            dirColor: 0xffcfa0
        },
        void_hull: {
            floor: 0x45647a,
            wall: 0x30495d,
            accent: 0x2dd4bf,
            fog: 0x060c14,
            fogDensity: 0.005,
            ambientSky: 0x38bdf8,
            ambientGround: 0x091018,
            dirColor: 0xcbeafe
        },
        trench: {
            floor: 0x776653,
            wall: 0x574b40,
            accent: 0x84cc16,
            fog: 0x12100d,
            fogDensity: 0.007,
            ambientSky: 0x78716c,
            ambientGround: 0x1c1712,
            dirColor: 0xe7e5e4
        }
    };

    var SURFACE_TINTS = {
        stone: 0xffffff,
        grate: 0xd1d5db,
        mud: 0x7c5e42,
        sludge: 0x65a30d,
        rubble: 0x9ca3af,
        ice: 0xbae6fd
    };

    function createBiomeTexture(THREE, biome, kind) {
        if (typeof document === 'undefined') return null;
        try {
            var c = document.createElement('canvas');
            c.width = 128;
            c.height = 128;
            var ctx = c.getContext && c.getContext('2d');
            if (!ctx) return null;

            var pal = BIOME_PALETTES[biome] || BIOME_PALETTES.cathedral;
            ctx.fillStyle = kind === 'wall' ? '#77717d' : '#a09ba6';
            ctx.fillRect(0, 0, 128, 128);

            if (biome === 'cathedral') {
                ctx.strokeStyle = 'rgba(180,138,72,0.28)';
                ctx.lineWidth = 2;
                ctx.strokeRect(4, 4, 120, 120);
                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.strokeRect(32, 32, 64, 64);
                ctx.beginPath();
                ctx.moveTo(0, 64); ctx.lineTo(128, 64);
                ctx.moveTo(64, 0); ctx.lineTo(64, 128);
                ctx.stroke();
            } else if (biome === 'manufactorum') {
                ctx.fillStyle = 'rgba(217,119,6,0.16)';
                for (var i = 0; i < 128; i += 16) {
                    ctx.fillRect(i, 0, 4, 128);
                    ctx.fillRect(0, i, 128, 2);
                }
                ctx.fillStyle = 'rgba(255,255,255,0.12)';
                for (var rx = 12; rx < 128; rx += 32) {
                    for (var ry = 12; ry < 128; ry += 32) {
                        ctx.fillRect(rx, ry, 4, 4);
                    }
                }
            } else if (biome === 'void_hull') {
                ctx.strokeStyle = 'rgba(45,212,191,0.22)';
                ctx.lineWidth = 2;
                ctx.strokeRect(8, 8, 112, 112);
                ctx.fillStyle = 'rgba(56,189,248,0.08)';
                ctx.fillRect(16, 16, 40, 96);
                ctx.fillRect(72, 16, 40, 96);
            } else {
                // trench
                ctx.fillStyle = 'rgba(87,83,78,0.35)';
                for (var y = 8; y < 128; y += 22) {
                    ctx.fillRect(4, y, 120, 12);
                }
                ctx.strokeStyle = 'rgba(132,204,22,0.16)';
                ctx.strokeRect(2, 2, 124, 124);
            }

            var tex = new THREE.CanvasTexture(c);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
            return tex;
        } catch (_) {
            return null;
        }
    }

    function createRampGeometry(THREE) {
        // Wedge spanning x:[-1,1], z:[-1,1], rising along +Z (south) or rotated by rampDir
        // Default rises from z=-1 (y=0) to z=+1 (y=1.5)
        var g = new THREE.BufferGeometry();
        var hw = 1.0, hd = 1.0, h = 1.5;
        var positions = new Float32Array([
            // Sloped top (2 triangles)
            -hw, 0, -hd,   hw, h,  hd,   hw, 0, -hd,
            -hw, 0, -hd,  -hw, h,  hd,   hw, h,  hd,
            // Back face (+Z, height h)
            -hw, 0,  hd,  -hw, h,  hd,   hw, h,  hd,
            -hw, 0,  hd,   hw, h,  hd,   hw, 0,  hd,
            // Left side (-X)
            -hw, 0, -hd,  -hw, 0,  hd,  -hw, h,  hd,
            // Right side (+X)
             hw, 0, -hd,   hw, h,  hd,   hw, 0,  hd,
            // Bottom
            -hw, 0, -hd,   hw, 0, -hd,   hw, 0,  hd,
            -hw, 0, -hd,   hw, 0,  hd,  -hw, 0,  hd
        ]);
        g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        g.computeVertexNormals();
        return g;
    }

    function createWorldRenderer(opts) {
        opts = opts || {};
        var THREE = root.THREE;
        var scene = opts.scene;
        var bus = opts.bus || null;
        var lightBudget = Math.max(4, Math.min(12, opts.lightBudget || 8));

        if (!THREE || !scene || scene.isStub) {
            return {
                buildWorld: function () {},
                update: function () {},
                spawnFlashLight: function () {},
                syncDebris: function () {},
                getStats: function () { return { drawBatches: 0, lights: 0, weatherParticles: 0 }; },
                disposeWorld: function () {}
            };
        }

        var worldRoot = new THREE.Group();
        worldRoot.name = 'GraveGainWorldRoot';
        scene.add(worldRoot);

        var activeTerrain = null;
        var unsubMutation = null;
        var textureCache = Object.create(null);
        var materialsToDispose = [];
        var geometriesToDispose = [];
        var texturesToDispose = [];

        // InstancedMesh pools
        var floorInst = null;
        var wallInst = null;
        var breachWallInst = null;
        var breachCrackInst = null;
        var rampInst = null;
        var barricadeInst = null;
        var pillarInst = null;
        var crateInst = null;
        var craterInst = null;
        var scorchInst = null;
        var rubbleInst = null;
        var casingInst = null;

        // Cell -> instance index lookup maps
        var breachMap = Object.create(null);
        var coverMap = Object.create(null); // key -> { kind: 'barricade'|'pillar'|'crate', index }
        var doorGroups = Object.create(null); // key -> { group, leftLeaf, rightLeaf, ledMat, openT, cell }
        var catwalkGroups = Object.create(null); // supportId -> { group, collapsing, timer, collapsed, baseY }
        var roofGroups = Object.create(null); // roofGroupId -> { group, mat, opacity, targetOpacity }
        var propMeshes = Object.create(null); // propId -> { group, mat, prop }
        var hazardVisuals = [];
        var exitBeacon = null;

        // Lighting
        var hemiLight = null;
        var dirLight = null;
        var pointLightPool = [];
        var transientFlashes = []; // { lightIdx, timer, maxTimer, baseIntensity }
        var anchorLightsCount = 0;

        // Fog of War
        var fogBytes = new Uint8Array(80 * 80 * 4);
        var fogTex = null;
        var fogPlane = null;

        // Weather
        var weatherPoints = null;
        var weatherData = { count: 0, kind: 'ash', speed: 1.5, velocities: null };

        // Interior transition smoothing
        var interiorBlend = 0;
        var currentPalette = BIOME_PALETTES.cathedral;

        var dummy = new THREE.Object3D();
        var tempColor = new THREE.Color();

        function trackGeo(g) { geometriesToDispose.push(g); return g; }
        function trackMat(m) { materialsToDispose.push(m); return m; }

        function initInstancedColor(inst) {
            if (inst && typeof inst.setColorAt === 'function') {
                tempColor.setHex(0xffffff);
                inst.setColorAt(0, tempColor);
                if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
            }
        }

        function disposeWorld() {
            if (unsubMutation) {
                unsubMutation();
                unsubMutation = null;
            }
            while (worldRoot.children.length > 0) {
                worldRoot.remove(worldRoot.children[0]);
            }
            for (var i = 0; i < geometriesToDispose.length; i++) {
                try { geometriesToDispose[i].dispose(); } catch (_) {}
            }
            for (var j = 0; j < materialsToDispose.length; j++) {
                try { materialsToDispose[j].dispose(); } catch (_) {}
            }
            for (var k = 0; k < texturesToDispose.length; k++) {
                try { texturesToDispose[k].dispose(); } catch (_) {}
            }
            if (dirLight && dirLight.shadow && dirLight.shadow.map) {
                try { dirLight.shadow.map.dispose(); } catch (_) {}
            }
            geometriesToDispose.length = 0;
            materialsToDispose.length = 0;
            texturesToDispose.length = 0;
            breachMap = Object.create(null);
            coverMap = Object.create(null);
            doorGroups = Object.create(null);
            catwalkGroups = Object.create(null);
            roofGroups = Object.create(null);
            propMeshes = Object.create(null);
            hazardVisuals.length = 0;
            pointLightPool.length = 0;
            transientFlashes.length = 0;
            exitBeacon = null;
            weatherPoints = null;
            fogTex = null;
            fogPlane = null;
        }

        function getBiomeTex(biome) {
            if (!textureCache[biome]) {
                textureCache[biome] = createBiomeTexture(THREE, biome, 'floor');
            }
            return textureCache[biome];
        }

        function setupLighting(terrain) {
            var pal = BIOME_PALETTES[terrain.biome] || BIOME_PALETTES.cathedral;
            currentPalette = pal;

            scene.background = new THREE.Color(pal.fog);
            scene.fog = new THREE.FogExp2(pal.fog, pal.fogDensity);

            var fill = new THREE.Color(0xffffff);
            var sky = new THREE.Color(pal.ambientSky).lerp(fill, 0.55);
            var ground = new THREE.Color(pal.ambientGround).lerp(fill, 0.24);
            hemiLight = new THREE.HemisphereLight(sky, ground, 1.15);
            worldRoot.add(hemiLight);

            dirLight = new THREE.DirectionalLight(pal.dirColor, 1.35);
            dirLight.position.set(60, 38, 50);
            dirLight.castShadow = true;
            dirLight.shadow.mapSize.width = 1024;
            dirLight.shadow.mapSize.height = 1024;
            dirLight.shadow.camera.near = 2;
            dirLight.shadow.camera.far = 110;
            var d = 28;
            dirLight.shadow.camera.left = -d;
            dirLight.shadow.camera.right = d;
            dirLight.shadow.camera.top = d;
            dirLight.shadow.camera.bottom = -d;
            dirLight.shadow.bias = -0.0008;
            worldRoot.add(dirLight);
            worldRoot.add(dirLight.target);

            // Pre-allocate fixed PointLight pool (zero mid-combat shader recompile)
            anchorLightsCount = Math.min(4, Math.floor(lightBudget / 2));
            for (var i = 0; i < lightBudget; i++) {
                var pl = new THREE.PointLight(pal.accent, 0, 14, 1.8);
                pl.castShadow = false;
                pl.position.set(0, -50, 0);
                worldRoot.add(pl);
                pointLightPool.push(pl);
            }
        }

        function spawnFlashLight(pos, color, intensity, radius, duration) {
            if (!pointLightPool.length || !pos) return;
            var startIdx = anchorLightsCount;
            var chosen = -1;
            for (var i = startIdx; i < pointLightPool.length; i++) {
                var busy = false;
                for (var j = 0; j < transientFlashes.length; j++) {
                    if (transientFlashes[j].lightIdx === i) { busy = true; break; }
                }
                if (!busy) { chosen = i; break; }
            }
            if (chosen < 0) chosen = startIdx;
            var pl = pointLightPool[chosen];
            if (!pl) return;
            pl.color.setHex(color !== undefined ? color : 0xfbbf24);
            pl.distance = radius || 10;
            pl.position.set(pos.x, (pos.y || 0) + 1.2, pos.z);
            pl.intensity = intensity || 2.8;

            transientFlashes = transientFlashes.filter(function (f) { return f.lightIdx !== chosen; });
            transientFlashes.push({
                lightIdx: chosen,
                timer: duration || 0.14,
                maxTimer: duration || 0.14,
                baseIntensity: intensity || 2.8
            });
        }

        function buildFogOfWar(terrain) {
            var w = terrain.width;
            var h = terrain.height;
            if (fogBytes.length !== w * h * 4) fogBytes = new Uint8Array(w * h * 4);
            fogTex = new THREE.DataTexture(fogBytes, w, h, THREE.RGBAFormat);
            fogTex.magFilter = THREE.LinearFilter;
            fogTex.minFilter = THREE.LinearFilter;
            fogTex.needsUpdate = true;
            texturesToDispose.push(fogTex);

            var worldW = w * terrain.tileSize;
            var worldH = h * terrain.tileSize;
            var fogGeo = trackGeo(new THREE.PlaneGeometry(worldW, worldH));
            fogGeo.rotateX(-Math.PI / 2);
            // Terrain rows advance toward +Z, while the rotated plane's V
            // advances toward -Z. Match the visibility mask to the actual tiles.
            var fogUV = fogGeo.getAttribute('uv');
            for (var i = 0; i < fogUV.count; i++) {
                fogUV.setY(i, 1 - fogUV.getY(i));
            }
            var fogMat = trackMat(new THREE.MeshBasicMaterial({
                map: fogTex,
                transparent: true,
                depthWrite: false,
                fog: false,
                opacity: 0.92
            }));
            fogPlane = new THREE.Mesh(fogGeo, fogMat);
            fogPlane.position.set(worldW / 2, 5.4, worldH / 2);
            fogPlane.renderOrder = 20;
            worldRoot.add(fogPlane);
            updateFogTexture(terrain);
        }

        function updateFogTexture(terrain) {
            if (!fogTex || !terrain) return;
            var cells = terrain.cells;
            for (var i = 0; i < cells.length; i++) {
                var c = cells[i];
                var off = i * 4;
                if (c.visible) {
                    fogBytes[off] = 0;
                    fogBytes[off + 1] = 0;
                    fogBytes[off + 2] = 0;
                    fogBytes[off + 3] = 0;
                } else if (c.explored) {
                    fogBytes[off] = 8;
                    fogBytes[off + 1] = 8;
                    fogBytes[off + 2] = 16;
                    fogBytes[off + 3] = 108;
                } else {
                    fogBytes[off] = 4;
                    fogBytes[off + 1] = 3;
                    fogBytes[off + 2] = 8;
                    fogBytes[off + 3] = 242;
                }
            }
            fogTex.needsUpdate = true;
        }

        function buildWeather(terrain) {
            var wInfo = terrain.getBiomeWeather();
            var count = 520;
            var positions = new Float32Array(count * 3);
            var velocities = new Float32Array(count * 3);

            for (var i = 0; i < count; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 48 + 80;
                positions[i * 3 + 1] = Math.random() * 14 + 0.5;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 48 + 80;

                if (wInfo.kind === 'acid_rain') {
                    velocities[i * 3] = 1.2;
                    velocities[i * 3 + 1] = -(wInfo.speed + Math.random() * 2.5);
                    velocities[i * 3 + 2] = 0.6;
                } else if (wInfo.kind === 'warp_spores') {
                    velocities[i * 3] = (Math.random() - 0.5) * 0.8;
                    velocities[i * 3 + 1] = (Math.random() - 0.3) * 0.6;
                    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
                } else if (wInfo.kind === 'soot_sparks') {
                    velocities[i * 3] = (Math.random() - 0.5) * 1.1;
                    velocities[i * 3 + 1] = -(0.8 + Math.random() * 1.8);
                    velocities[i * 3 + 2] = (Math.random() - 0.5) * 1.1;
                } else {
                    velocities[i * 3] = 0.6 + Math.random() * 0.5;
                    velocities[i * 3 + 1] = -(0.5 + Math.random() * 0.8);
                    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
                }
            }

            var geo = trackGeo(new THREE.BufferGeometry());
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            var mat = trackMat(new THREE.PointsMaterial({
                color: wInfo.color,
                size: wInfo.kind === 'acid_rain' ? 0.16 : 0.22,
                transparent: true,
                opacity: 0.72,
                depthWrite: false
            }));
            weatherPoints = new THREE.Points(geo, mat);
            weatherPoints.frustumCulled = false;
            worldRoot.add(weatherPoints);
            weatherData = { count: count, kind: wInfo.kind, speed: wInfo.speed, velocities: velocities };
        }

        function syncDebris(terrain) {
            if (!terrain || !craterInst || !scorchInst || !rubbleInst || !casingInst) return;
            var ci = 0, si = 0, ri = 0, ki = 0;
            for (var i = 0; i < terrain.debris.length; i++) {
                var d = terrain.debris[i];
                dummy.position.set(d.x, (d.y || 0) + 0.03, d.z);
                dummy.rotation.set(0, d.ry || 0, 0);
                if (d.kind === 'crater' && ci < 256) {
                    dummy.scale.set(d.radius * 1.3, 1, d.radius * 1.3);
                    dummy.updateMatrix();
                    craterInst.setMatrixAt(ci++, dummy.matrix);
                } else if (d.kind === 'scorch' && si < 256) {
                    dummy.scale.set(d.radius * 1.5, 1, d.radius * 1.5);
                    dummy.updateMatrix();
                    scorchInst.setMatrixAt(si++, dummy.matrix);
                } else if (d.kind === 'casing' && ki < 512) {
                    dummy.position.set(d.x, (d.y || 0) + 0.04, d.z);
                    dummy.rotation.set(Math.PI / 2, d.ry || 0, 0);
                    dummy.scale.set(1, 1, 1);
                    dummy.updateMatrix();
                    casingInst.setMatrixAt(ki++, dummy.matrix);
                } else if (ri < 512) {
                    dummy.position.set(d.x, (d.y || 0) + 0.16, d.z);
                    dummy.rotation.set(0.2, d.ry || 0, 0.15);
                    dummy.scale.set(d.radius, d.radius * 0.7, d.radius);
                    dummy.updateMatrix();
                    rubbleInst.setMatrixAt(ri++, dummy.matrix);
                }
            }
            craterInst.count = ci; craterInst.instanceMatrix.needsUpdate = true;
            scorchInst.count = si; scorchInst.instanceMatrix.needsUpdate = true;
            rubbleInst.count = ri; rubbleInst.instanceMatrix.needsUpdate = true;
            casingInst.count = ki; casingInst.instanceMatrix.needsUpdate = true;
        }

        function updateCellVisuals(cell) {
            if (!cell) return;
            var key = cell.gx + ',' + cell.gz;

            // Breachable wall destroyed -> shrink instance out of sight
            if (breachMap[key] !== undefined && cell.type !== 'breachable') {
                var bi = breachMap[key];
                dummy.position.set(0, -100, 0);
                dummy.scale.set(0.001, 0.001, 0.001);
                dummy.updateMatrix();
                breachWallInst.setMatrixAt(bi, dummy.matrix);
                breachCrackInst.setMatrixAt(bi, dummy.matrix);
                breachWallInst.instanceMatrix.needsUpdate = true;
                breachCrackInst.instanceMatrix.needsUpdate = true;
            }

            // Cover damage / destruction
            var covEntry = coverMap[key];
            if (covEntry) {
                var inst = covEntry.kind === 'pillar' ? pillarInst : (covEntry.kind === 'crate' ? crateInst : barricadeInst);
                if (inst) {
                    if (cell.coverHp <= 0) {
                        dummy.position.set(0, -100, 0);
                        dummy.scale.set(0.001, 0.001, 0.001);
                        dummy.updateMatrix();
                        inst.setMatrixAt(covEntry.index, dummy.matrix);
                    } else {
                        var ratio = cell.maxCoverHp > 0 ? cell.coverHp / cell.maxCoverHp : 1;
                        var baseH = cell.elevation * activeTerrain.tierHeight;
                        var wx = (cell.gx + 0.5) * activeTerrain.tileSize;
                        var wz = (cell.gz + 0.5) * activeTerrain.tileSize;
                        var tilt = (1 - ratio) * 0.25;
                        var scaleY = 0.65 + 0.35 * ratio;
                        var halfH = covEntry.kind === 'pillar' ? 1.9 : 0.55;
                        dummy.position.set(wx, baseH + halfH * scaleY, wz);
                        dummy.rotation.set(tilt, covEntry.rotY || 0, tilt * 0.7);
                        dummy.scale.set(1, scaleY, 1);
                        dummy.updateMatrix();
                        inst.setMatrixAt(covEntry.index, dummy.matrix);
                        tempColor.setHex(ratio < 0.35 ? 0x3b2622 : (ratio < 0.7 ? 0x6b4f45 : 0xffffff));
                        inst.setColorAt(covEntry.index, tempColor);
                        if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
                    }
                    inst.instanceMatrix.needsUpdate = true;
                }
            }

            // Door LED color
            var dg = doorGroups[key];
            if (dg) {
                dg.ledMat.color.setHex(cell.doorOpen ? 0x22c55e : (cell.doorLocked ? 0xf59e0b : 0xef4444));
            }
        }

        function buildWorld(terrain) {
            disposeWorld();
            if (!terrain) return;
            activeTerrain = terrain;

            var pal = BIOME_PALETTES[terrain.biome] || BIOME_PALETTES.cathedral;
            var tex = getBiomeTex(terrain.biome);
            setupLighting(terrain);

            // Deep chasm abyss plane
            var abyssGeo = trackGeo(new THREE.PlaneGeometry(terrain.width * terrain.tileSize + 40, terrain.height * terrain.tileSize + 40));
            abyssGeo.rotateX(-Math.PI / 2);
            var abyssMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x020205 }));
            var abyss = new THREE.Mesh(abyssGeo, abyssMat);
            abyss.position.set((terrain.width * terrain.tileSize) / 2, -6.5, (terrain.height * terrain.tileSize) / 2);
            worldRoot.add(abyss);

            // Materials
            var floorMat = trackMat(new THREE.MeshStandardMaterial({
                color: pal.floor,
                map: tex,
                roughness: 0.78,
                metalness: terrain.biome === 'void_hull' || terrain.biome === 'manufactorum' ? 0.35 : 0.12
            }));
            var wallMat = trackMat(new THREE.MeshStandardMaterial({
                color: pal.wall,
                map: tex,
                roughness: 0.85,
                metalness: 0.2
            }));
            var breachMat = trackMat(new THREE.MeshStandardMaterial({
                color: 0x574c47,
                roughness: 0.9,
                metalness: 0.1
            }));
            var crackMat = trackMat(new THREE.MeshStandardMaterial({
                color: 0xf97316,
                emissive: 0xea580c,
                emissiveIntensity: 1.4,
                roughness: 0.4
            }));
            var rampMat = trackMat(new THREE.MeshStandardMaterial({
                color: pal.accent,
                roughness: 0.72,
                metalness: 0.25
            }));
            var coverMat = trackMat(new THREE.MeshStandardMaterial({
                color: 0x94a3b8,
                roughness: 0.75,
                metalness: 0.25
            }));

            // Allocate InstancedMesh pools (frustumCulled = false for r128!)
            var maxCells = terrain.width * terrain.height;
            floorInst = new THREE.InstancedMesh(trackGeo(new THREE.BoxGeometry(2.0, 1.0, 2.0)), floorMat, maxCells);
            floorInst.frustumCulled = false;
            floorInst.receiveShadow = true;
            floorInst.castShadow = true;
            initInstancedColor(floorInst);

            wallInst = new THREE.InstancedMesh(trackGeo(new THREE.BoxGeometry(2.0, 3.8, 2.0)), wallMat, maxCells);
            wallInst.frustumCulled = false;
            wallInst.castShadow = true;
            wallInst.receiveShadow = true;
            initInstancedColor(wallInst);

            breachWallInst = new THREE.InstancedMesh(trackGeo(new THREE.BoxGeometry(2.0, 3.6, 2.0)), breachMat, 256);
            breachWallInst.frustumCulled = false;
            breachWallInst.castShadow = true;
            breachWallInst.receiveShadow = true;

            breachCrackInst = new THREE.InstancedMesh(trackGeo(new THREE.BoxGeometry(2.06, 0.35, 2.06)), crackMat, 256);
            breachCrackInst.frustumCulled = false;

            rampInst = new THREE.InstancedMesh(trackGeo(createRampGeometry(THREE)), rampMat, 512);
            rampInst.frustumCulled = false;
            rampInst.receiveShadow = true;
            rampInst.castShadow = true;

            barricadeInst = new THREE.InstancedMesh(trackGeo(new THREE.BoxGeometry(1.85, 1.05, 0.55)), coverMat, 1024);
            barricadeInst.frustumCulled = false;
            barricadeInst.castShadow = true;
            barricadeInst.receiveShadow = true;
            initInstancedColor(barricadeInst);

            pillarInst = new THREE.InstancedMesh(trackGeo(new THREE.CylinderGeometry(0.55, 0.65, 3.8, 8)), coverMat, 1024);
            pillarInst.frustumCulled = false;
            pillarInst.castShadow = true;
            pillarInst.receiveShadow = true;
            initInstancedColor(pillarInst);

            crateInst = new THREE.InstancedMesh(trackGeo(new THREE.BoxGeometry(1.1, 1.1, 1.1)), coverMat, 1024);
            crateInst.frustumCulled = false;
            crateInst.castShadow = true;
            crateInst.receiveShadow = true;
            initInstancedColor(crateInst);

            // Debris ring-buffer InstancedMeshes
            var craterGeo = trackGeo(new THREE.CylinderGeometry(0.85, 1.0, 0.06, 12));
            var craterMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x111116 }));
            craterInst = new THREE.InstancedMesh(craterGeo, craterMat, 256);
            craterInst.frustumCulled = false;
            craterInst.count = 0;

            var scorchGeo = trackGeo(new THREE.PlaneGeometry(1.4, 1.4));
            scorchGeo.rotateX(-Math.PI / 2);
            var scorchMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x09090b, transparent: true, opacity: 0.72, depthWrite: false }));
            scorchInst = new THREE.InstancedMesh(scorchGeo, scorchMat, 256);
            scorchInst.frustumCulled = false;
            scorchInst.count = 0;

            var rubbleGeo = trackGeo(new THREE.DodecahedronGeometry(0.32, 0));
            var rubbleMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.9 }));
            rubbleInst = new THREE.InstancedMesh(rubbleGeo, rubbleMat, 512);
            rubbleInst.frustumCulled = false;
            rubbleInst.castShadow = true;
            rubbleInst.count = 0;

            var casingGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 5));
            var casingMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.25 }));
            casingInst = new THREE.InstancedMesh(casingGeo, casingMat, 512);
            casingInst.frustumCulled = false;
            casingInst.count = 0;

            var fi = 0, wi = 0, bi = 0, rmi = 0, barI = 0, pilI = 0, crI = 0;

            for (var i = 0; i < terrain.cells.length; i++) {
                var cell = terrain.cells[i];
                var wx = (cell.gx + 0.5) * terrain.tileSize;
                var wz = (cell.gz + 0.5) * terrain.tileSize;
                var topY = cell.elevation * terrain.tierHeight;
                var key = cell.gx + ',' + cell.gz;

                if (cell.type === 'wall') {
                    dummy.position.set(wx, topY + 1.9, wz);
                    dummy.rotation.set(0, 0, 0);
                    dummy.scale.set(1, 1, 1);
                    dummy.updateMatrix();
                    wallInst.setMatrixAt(wi, dummy.matrix);
                    tempColor.setHex(0xffffff);
                    wallInst.setColorAt(wi, tempColor);
                    wi++;
                } else if (cell.type === 'breachable') {
                    // Floor base underneath
                    dummy.position.set(wx, -0.25, wz);
                    dummy.rotation.set(0, 0, 0);
                    dummy.scale.set(1, 0.5, 1);
                    dummy.updateMatrix();
                    floorInst.setMatrixAt(fi, dummy.matrix);
                    tempColor.setHex(0x9ca3af);
                    floorInst.setColorAt(fi, tempColor);
                    fi++;

                    if (bi < 256) {
                        dummy.position.set(wx, topY + 1.8, wz);
                        dummy.rotation.set(0, 0, 0);
                        dummy.scale.set(1, 1, 1);
                        dummy.updateMatrix();
                        breachWallInst.setMatrixAt(bi, dummy.matrix);
                        dummy.position.set(wx, topY + 1.4, wz);
                        dummy.updateMatrix();
                        breachCrackInst.setMatrixAt(bi, dummy.matrix);
                        breachMap[key] = bi;
                        bi++;
                    }
                } else if (cell.type !== 'chasm') {
                    // Solid slab down to y=-0.5 so elevated steps have solid cliff sides
                    var slabH = Math.max(0.5, topY + 0.5);
                    dummy.position.set(wx, topY - slabH * 0.5, wz);
                    dummy.rotation.set(0, 0, 0);
                    dummy.scale.set(1, slabH, 1);
                    dummy.updateMatrix();
                    floorInst.setMatrixAt(fi, dummy.matrix);
                    var surfTint = SURFACE_TINTS[cell.surface] || 0xffffff;
                    tempColor.setHex(surfTint);
                    if (cell.elevation > 0) {
                        tempColor.offsetHSL(0, 0, cell.elevation * 0.04);
                    }
                    floorInst.setColorAt(fi, tempColor);
                    fi++;

                    if (cell.type === 'ramp' && rmi < 512) {
                        var yaw = 0;
                        if (cell.rampDir === 's') yaw = 0;
                        else if (cell.rampDir === 'n') yaw = Math.PI;
                        else if (cell.rampDir === 'e') yaw = Math.PI * 0.5;
                        else if (cell.rampDir === 'w') yaw = -Math.PI * 0.5;
                        dummy.position.set(wx, topY, wz);
                        dummy.rotation.set(0, yaw, 0);
                        dummy.scale.set(1, 1, 1);
                        dummy.updateMatrix();
                        rampInst.setMatrixAt(rmi++, dummy.matrix);
                    }

                    // Cover meshes
                    if (cell.coverHp > 0) {
                        var rotY = (cell.cover.e !== 'none' || cell.cover.w !== 'none') ? Math.PI * 0.5 : 0;
                        if (cell.coverArchetype === 'pillar' && pilI < 1024) {
                            dummy.position.set(wx, topY + 1.9, wz);
                            dummy.rotation.set(0, 0, 0);
                            dummy.scale.set(1, 1, 1);
                            dummy.updateMatrix();
                            pillarInst.setMatrixAt(pilI, dummy.matrix);
                            tempColor.setHex(cell.structuralSupportId ? 0xd4a359 : 0xffffff);
                            pillarInst.setColorAt(pilI, tempColor);
                            coverMap[key] = { kind: 'pillar', index: pilI, rotY: 0 };
                            pilI++;
                        } else if (cell.coverArchetype === 'crate' && crI < 1024) {
                            dummy.position.set(wx, topY + 0.55, wz);
                            dummy.rotation.set(0, rotY, 0);
                            dummy.scale.set(1, 1, 1);
                            dummy.updateMatrix();
                            crateInst.setMatrixAt(crI, dummy.matrix);
                            tempColor.setHex(0xb48a48);
                            crateInst.setColorAt(crI, tempColor);
                            coverMap[key] = { kind: 'crate', index: crI, rotY: rotY };
                            crI++;
                        } else if (barI < 1024) {
                            dummy.position.set(wx, topY + 0.52, wz);
                            dummy.rotation.set(0, rotY, 0);
                            dummy.scale.set(1, 1, 1);
                            dummy.updateMatrix();
                            barricadeInst.setMatrixAt(barI, dummy.matrix);
                            tempColor.setHex(0x94a3b8);
                            barricadeInst.setColorAt(barI, tempColor);
                            coverMap[key] = { kind: 'barricade', index: barI, rotY: rotY };
                            barI++;
                        }
                    }

                    // Interactive 3D Doors
                    if (cell.type === 'door') {
                        buildDoorGroup(cell, wx, topY, wz, key);
                    }

                    // Environmental hazards
                    if (cell.hazard) {
                        buildHazardVisual(cell.hazard, wx, topY, wz);
                    }
                }
            }

            floorInst.count = fi; floorInst.instanceMatrix.needsUpdate = true;
            if (floorInst.instanceColor) floorInst.instanceColor.needsUpdate = true;
            wallInst.count = wi; wallInst.instanceMatrix.needsUpdate = true;
            if (wallInst.instanceColor) wallInst.instanceColor.needsUpdate = true;
            breachWallInst.count = bi; breachWallInst.instanceMatrix.needsUpdate = true;
            breachCrackInst.count = bi; breachCrackInst.instanceMatrix.needsUpdate = true;
            rampInst.count = rmi; rampInst.instanceMatrix.needsUpdate = true;
            barricadeInst.count = barI; barricadeInst.instanceMatrix.needsUpdate = true;
            if (barricadeInst.instanceColor) barricadeInst.instanceColor.needsUpdate = true;
            pillarInst.count = pilI; pillarInst.instanceMatrix.needsUpdate = true;
            if (pillarInst.instanceColor) pillarInst.instanceColor.needsUpdate = true;
            crateInst.count = crI; crateInst.instanceMatrix.needsUpdate = true;
            if (crateInst.instanceColor) crateInst.instanceColor.needsUpdate = true;

            worldRoot.add(floorInst);
            worldRoot.add(wallInst);
            worldRoot.add(breachWallInst);
            worldRoot.add(breachCrackInst);
            worldRoot.add(rampInst);
            worldRoot.add(barricadeInst);
            worldRoot.add(pillarInst);
            worldRoot.add(crateInst);
            worldRoot.add(craterInst);
            worldRoot.add(scorchInst);
            worldRoot.add(rubbleInst);
            worldRoot.add(casingInst);

            buildCatwalkGroups(terrain);
            buildRoofGroups(terrain);
            buildPropMeshes(terrain);
            buildExitBeacon(terrain);
            buildFogOfWar(terrain);
            buildWeather(terrain);
            syncDebris(terrain);

            unsubMutation = terrain.onGridMutated(function (ev) {
                if (!ev) return;
                if (ev.cell) updateCellVisuals(ev.cell);
                if (ev.kind === 'structural_collapse' && ev.event) {
                    var cg = catwalkGroups[ev.event.supportId];
                    if (cg && !cg.collapsed) {
                        cg.collapsing = true;
                        cg.timer = 0;
                    }
                    spawnFlashLight(ev.event.epicenter, 0xf97316, 4.0, 14, 0.35);
                }
                if (ev.kind === 'prop_exploded' && ev.event) {
                    spawnFlashLight(ev.event, 0xef4444, 4.5, 14, 0.3);
                }
                syncDebris(terrain);
                updateFogTexture(terrain);
            });
        }

        function buildDoorGroup(cell, wx, topY, wz, key) {
            var grp = new THREE.Group();
            grp.position.set(wx, topY, wz);
            if (cell.doorAxis === 'z') grp.rotation.y = Math.PI * 0.5;

            var frameMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.65, roughness: 0.4 }));
            var leafMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x52525b, metalness: 0.75, roughness: 0.3 }));
            var ledMat = trackMat(new THREE.MeshBasicMaterial({ color: cell.doorOpen ? 0x22c55e : (cell.doorLocked ? 0xf59e0b : 0xef4444) }));

            var leftPillar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.25, 3.2, 0.5)), frameMat);
            leftPillar.position.set(-0.9, 1.6, 0);
            var rightPillar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.25, 3.2, 0.5)), frameMat);
            rightPillar.position.set(0.9, 1.6, 0);
            var lintel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.05, 0.4, 0.55)), frameMat);
            lintel.position.set(0, 3.2, 0);
            var led = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.7, 0.14, 0.6)), ledMat);
            led.position.set(0, 3.2, 0);

            var leftLeaf = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.88, 2.9, 0.25)), leafMat);
            leftLeaf.position.set(-0.44, 1.45, 0);
            leftLeaf.castShadow = true;
            var rightLeaf = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.88, 2.9, 0.25)), leafMat);
            rightLeaf.position.set(0.44, 1.45, 0);
            rightLeaf.castShadow = true;

            grp.add(leftPillar, rightPillar, lintel, led, leftLeaf, rightLeaf);
            worldRoot.add(grp);
            doorGroups[key] = {
                group: grp,
                leftLeaf: leftLeaf,
                rightLeaf: rightLeaf,
                ledMat: ledMat,
                openT: cell.doorOpen ? 1 : 0,
                cell: cell
            };
        }

        function buildHazardVisual(kind, wx, topY, wz) {
            var color = 0xf97316;
            if (kind === 'poison') color = 0x22c55e;
            else if (kind === 'cryo') color = 0x38bdf8;
            else if (kind === 'warp') color = 0xa855f7;

            var grp = new THREE.Group();
            grp.position.set(wx, topY + 0.04, wz);

            var discMat = trackMat(new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.65
            }));
            var disc = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.85, 0.9, 0.06, 12)), discMat);
            grp.add(disc);

            var spike = null;
            if (kind === 'cryo') {
                var iceMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.15, metalness: 0.2 }));
                spike = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.35, 0)), iceMat);
                spike.position.y = 0.35;
                grp.add(spike);
            } else if (kind === 'fire') {
                var flameMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.8 }));
                spike = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.32, 0.85, 6)), flameMat);
                spike.position.y = 0.42;
                grp.add(spike);
            } else {
                var orbMat = trackMat(new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.55 }));
                spike = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.45, 0.08, 6, 12)), orbMat);
                spike.rotation.x = Math.PI * 0.5;
                spike.position.y = 0.35;
                grp.add(spike);
            }

            worldRoot.add(grp);
            hazardVisuals.push({ group: grp, spike: spike, kind: kind, phase: (wx + wz) * 0.3 });
        }

        function buildCatwalkGroups(terrain) {
            var keys = Object.keys(terrain.structuralGroups);
            if (!keys.length) return;
            var catMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.6, roughness: 0.45 }));
            var slabGeo = trackGeo(new THREE.BoxGeometry(1.96, 0.28, 1.96));

            for (var i = 0; i < keys.length; i++) {
                var sg = terrain.structuralGroups[keys[i]];
                var grp = new THREE.Group();
                for (var j = 0; j < sg.overheadCells.length; j++) {
                    var oc = sg.overheadCells[j];
                    var cell = terrain.getCell(oc.gx, oc.gz);
                    if (!cell) continue;
                    var w = terrain.gridToWorld(oc.gx, oc.gz);
                    var slab = new THREE.Mesh(slabGeo, catMat);
                    slab.position.set(w.x, cell.overheadElevation * terrain.tierHeight + 2.4, w.z);
                    slab.castShadow = true;
                    grp.add(slab);
                }
                worldRoot.add(grp);
                catwalkGroups[sg.id] = { group: grp, collapsing: false, collapsed: !!sg.collapsed, timer: 0 };
            }
        }

        function buildRoofGroups(terrain) {
            var keys = Object.keys(terrain.roofGroups);
            if (!keys.length) return;
            var slabGeo = trackGeo(new THREE.BoxGeometry(1.98, 0.35, 1.98));

            for (var i = 0; i < keys.length; i++) {
                var rg = terrain.roofGroups[keys[i]];
                var mat = trackMat(new THREE.MeshStandardMaterial({
                    color: 0x1e1b2e,
                    roughness: 0.85,
                    transparent: true,
                    opacity: 0.92
                }));
                var grp = new THREE.Group();
                for (var j = 0; j < rg.cells.length; j++) {
                    var coord = rg.cells[j];
                    var w = terrain.gridToWorld(coord.gx, coord.gz);
                    var tile = new THREE.Mesh(slabGeo, mat);
                    tile.position.set(w.x, rg.elevation * terrain.tierHeight + 1.8, w.z);
                    grp.add(tile);
                }
                worldRoot.add(grp);
                roofGroups[rg.id] = { group: grp, mat: mat, opacity: 0.92, targetOpacity: 0.92 };
            }
        }

        function buildPropMeshes(terrain) {
            var barrelGeo = trackGeo(new THREE.CylinderGeometry(0.36, 0.38, 0.95, 10));
            var stripeGeo = trackGeo(new THREE.CylinderGeometry(0.37, 0.37, 0.18, 10));
            var crateGeo = trackGeo(new THREE.BoxGeometry(0.85, 0.85, 0.85));

            for (var i = 0; i < terrain.props.length; i++) {
                var p = terrain.props[i];
                var grp = new THREE.Group();
                var mat = trackMat(new THREE.MeshStandardMaterial({
                    color: p.kind === 'explosive_barrel' ? 0xb91c1c : (p.kind === 'canister' ? 0x0f766e : 0x78552b),
                    roughness: 0.55,
                    metalness: p.kind === 'crate' ? 0.15 : 0.6,
                    emissive: 0x000000
                }));

                if (p.kind === 'crate') {
                    var mesh = new THREE.Mesh(crateGeo, mat);
                    mesh.position.y = 0.425;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    grp.add(mesh);
                } else {
                    var body = new THREE.Mesh(barrelGeo, mat);
                    body.position.y = 0.475;
                    body.castShadow = true;
                    body.receiveShadow = true;
                    grp.add(body);
                    var stripeMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
                    var stripe = new THREE.Mesh(stripeGeo, stripeMat);
                    stripe.position.y = 0.5;
                    grp.add(stripe);
                }

                grp.position.set(p.x, p.y, p.z);
                grp.rotation.set(p.rx, p.ry, p.rz);
                worldRoot.add(grp);
                propMeshes[p.id] = { group: grp, mat: mat, prop: p };
            }
        }

        function buildExitBeacon(terrain) {
            if (!terrain.safespaceRoom) return;
            var w = terrain.gridToWorld(terrain.safespaceRoom.cx, terrain.safespaceRoom.cz);
            var geo = trackGeo(new THREE.TorusGeometry(1.1, 0.12, 8, 24));
            geo.rotateX(Math.PI * 0.5);
            var mat = trackMat(new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
            exitBeacon = new THREE.Mesh(geo, mat);
            exitBeacon.position.set(w.x, w.y + 0.18, w.z);
            worldRoot.add(exitBeacon);
        }

        function update(dt, focusPos) {
            if (!activeTerrain) return;
            var time = typeof performance !== 'undefined' ? performance.now() * 0.001 : Date.now() * 0.001;

            // Snap directional shadow camera to texels around focusPos to prevent shadow shimmer
            if (dirLight && focusPos) {
                var texelSize = (56 / 1024);
                var sx = Math.round(focusPos.x / texelSize) * texelSize;
                var sz = Math.round(focusPos.z / texelSize) * texelSize;
                dirLight.target.position.set(sx, focusPos.y || 0, sz);
                dirLight.position.set(sx + 22, (focusPos.y || 0) + 34, sz + 18);
                dirLight.target.updateMatrixWorld();
            }

            // Update nearest brazier anchor lights in pool
            if (activeTerrain.lightAnchors.length && focusPos) {
                var anchors = activeTerrain.lightAnchors.slice().sort(function (a, b) {
                    var da = (a.x - focusPos.x) * (a.x - focusPos.x) + (a.z - focusPos.z) * (a.z - focusPos.z);
                    var db = (b.x - focusPos.x) * (b.x - focusPos.x) + (b.z - focusPos.z) * (b.z - focusPos.z);
                    return da - db;
                });
                for (var i = 0; i < anchorLightsCount; i++) {
                    var pl = pointLightPool[i];
                    var anc = anchors[i];
                    if (pl && anc) {
                        pl.position.set(anc.x, anc.y, anc.z);
                        pl.color.setHex(anc.color);
                        pl.distance = anc.distance;
                        pl.intensity = anc.intensity + Math.sin(time * 7 + i) * 0.18;
                    }
                }
            }

            // Update transient muzzle / explosion lights
            for (var fi = transientFlashes.length - 1; fi >= 0; fi--) {
                var f = transientFlashes[fi];
                f.timer -= dt;
                var light = pointLightPool[f.lightIdx];
                if (f.timer <= 0) {
                    if (light) light.intensity = 0;
                    transientFlashes.splice(fi, 1);
                } else if (light) {
                    light.intensity = f.baseIntensity * (f.timer / f.maxTimer);
                }
            }

            // Animate doors
            var dKeys = Object.keys(doorGroups);
            for (var di = 0; di < dKeys.length; di++) {
                var dg = doorGroups[dKeys[di]];
                var target = dg.cell.doorOpen ? 1 : 0;
                dg.openT += (target - dg.openT) * Math.min(1, dt * 10);
                dg.leftLeaf.position.x = -0.44 - dg.openT * 0.78;
                dg.rightLeaf.position.x = 0.44 + dg.openT * 0.78;
            }

            // Animate collapsing catwalks
            var cKeys = Object.keys(catwalkGroups);
            for (var ci = 0; ci < cKeys.length; ci++) {
                var cg = catwalkGroups[cKeys[ci]];
                if (cg.collapsing && !cg.collapsed) {
                    cg.timer += dt;
                    var p = Math.min(1, cg.timer / 0.45);
                    cg.group.position.y = -p * p * 5.2;
                    cg.group.rotation.z = p * 0.25;
                    if (p >= 1) {
                        cg.collapsing = false;
                        cg.collapsed = true;
                        cg.group.visible = false;
                    }
                }
            }

            // Interior / exterior cutaway + fog transition (R1 #18)
            var zone = focusPos ? activeTerrain.getInteriorZoneAt(focusPos.x, focusPos.z) : { zoneType: 'exterior', roofGroupId: null };
            var targetBlend = zone.zoneType === 'interior' ? 1 : 0;
            interiorBlend += (targetBlend - interiorBlend) * Math.min(1, dt * 6);
            if (scene.fog) {
                scene.fog.density = currentPalette.fogDensity * (1 - interiorBlend * 0.35);
            }
            if (hemiLight) {
                hemiLight.intensity = 1.15 - interiorBlend * 0.15;
            }
            var rKeys = Object.keys(roofGroups);
            for (var ri = 0; ri < rKeys.length; ri++) {
                var rgId = rKeys[ri];
                var rg = roofGroups[rgId];
                var isInside = zone.roofGroupId === rgId;
                rg.targetOpacity = isInside ? 0.0 : 0.92;
                rg.opacity += (rg.targetOpacity - rg.opacity) * Math.min(1, dt * 8);
                rg.mat.opacity = rg.opacity;
                rg.group.visible = rg.opacity > 0.03;
            }

            // Sync prop physics meshes
            var pKeys = Object.keys(propMeshes);
            for (var pi = 0; pi < pKeys.length; pi++) {
                var pm = propMeshes[pKeys[pi]];
                if (pm.prop.destroyed) {
                    pm.group.visible = false;
                } else {
                    pm.group.visible = true;
                    pm.group.position.set(pm.prop.x, pm.prop.y, pm.prop.z);
                    pm.group.rotation.set(pm.prop.rx, pm.prop.ry, pm.prop.rz);
                    if (pm.prop.fuseTimer >= 0) {
                        pm.mat.emissive.setHex(0xff4500);
                        pm.mat.emissiveIntensity = 0.8 + Math.sin(time * 24) * 0.7;
                    }
                }
            }

            // Animate hazard meshes
            for (var hi = 0; hi < hazardVisuals.length; hi++) {
                var hv = hazardVisuals[hi];
                if (!hv.spike) continue;
                if (hv.kind === 'fire') {
                    hv.spike.scale.y = 0.8 + Math.sin(time * 12 + hv.phase) * 0.35;
                } else if (hv.kind === 'poison' || hv.kind === 'warp') {
                    hv.spike.rotation.z = time * 1.8 + hv.phase;
                    hv.spike.position.y = 0.32 + Math.sin(time * 3 + hv.phase) * 0.1;
                }
            }

            // Exit beacon pulse
            if (exitBeacon) {
                exitBeacon.rotation.z = time * 1.2;
                var s = 1 + Math.sin(time * 4) * 0.12;
                exitBeacon.scale.set(s, s, 1);
            }

            // Animate 3D weather around camera focus
            if (weatherPoints && focusPos) {
                var posAttr = weatherPoints.geometry.getAttribute('position');
                var arr = posAttr.array;
                var vels = weatherData.velocities;
                var count = weatherData.count;
                var cx = focusPos.x;
                var cz = focusPos.z;
                for (var wi = 0; wi < count; wi++) {
                    var idx = wi * 3;
                    arr[idx] += vels[idx] * dt;
                    arr[idx + 1] += vels[idx + 1] * dt;
                    arr[idx + 2] += vels[idx + 2] * dt;

                    if (arr[idx + 1] < 0.2 || arr[idx + 1] > 15) {
                        arr[idx] = cx + (Math.random() - 0.5) * 48;
                        arr[idx + 1] = weatherData.kind === 'warp_spores' ? (1 + Math.random() * 10) : 13.5;
                        arr[idx + 2] = cz + (Math.random() - 0.5) * 48;
                    }
                    if (arr[idx] < cx - 26) arr[idx] += 48;
                    if (arr[idx] > cx + 26) arr[idx] -= 48;
                    if (arr[idx + 2] < cz - 26) arr[idx + 2] += 48;
                    if (arr[idx + 2] > cz + 26) arr[idx + 2] -= 48;
                }
                posAttr.needsUpdate = true;
            }
        }

        return {
            buildWorld: buildWorld,
            update: update,
            spawnFlashLight: spawnFlashLight,
            syncDebris: syncDebris,
            updateFogTexture: function () { updateFogTexture(activeTerrain); },
            getStats: function () {
                return {
                    biome: activeTerrain ? activeTerrain.biome : null,
                    lights: pointLightPool.length,
                    weatherParticles: weatherData.count,
                    debris: activeTerrain ? activeTerrain.debris.length : 0
                };
            },
            disposeWorld: disposeWorld
        };
    }

    renderNs.WorldRenderer = { create: createWorldRenderer };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = renderNs.WorldRenderer;
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
