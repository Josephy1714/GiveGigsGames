(function (root) {
    'use strict';

    var renderNs = root.GraveGainRender = root.GraveGainRender || {};

    var BIOME_PALETTES = {
        cathedral: {
            floor: 0x3b444f,
            wall: 0x262d35,
            accent: 0x2dd4bf,
            fog: 0x0b1016,
            fogDensity: 0.0055,
            ambientSky: 0x3d5266,
            ambientGround: 0x101419,
            dirColor: 0xcbeafe
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
        },
        elven_grove: {
            floor: 0x3b5241,
            wall: 0x26382b,
            accent: 0x4ade80,
            fog: 0x09140d,
            fogDensity: 0.0055,
            ambientSky: 0x4d7c5f,
            ambientGround: 0x0f1f14,
            dirColor: 0xdcfce7
        },
        dwarven_forge: {
            floor: 0x473c38,
            wall: 0x2e2522,
            accent: 0xf97316,
            fog: 0x160c08,
            fogDensity: 0.006,
            ambientSky: 0x7c4a32,
            ambientGround: 0x1f110b,
            dirColor: 0xffedd5
        },
        arcane_citadel: {
            floor: 0x3b3659,
            wall: 0x25213b,
            accent: 0xa855f7,
            fog: 0x0c081a,
            fogDensity: 0.0055,
            ambientSky: 0x6366f1,
            ambientGround: 0x120e24,
            dirColor: 0xe0e7ff
        },
        necropolis: {
            floor: 0x393e46,
            wall: 0x22262c,
            accent: 0xc084fc,
            fog: 0x090a0f,
            fogDensity: 0.0065,
            ambientSky: 0x475569,
            ambientGround: 0x0f1117,
            dirColor: 0xcbd5e1
        }
    };

    (function registerExtraBiomePalettes() {
        var extra = {
            crimson_keep: [0x4c2328, 0x2d1316, 0xef4444, 0x160709],
            frost_glacier: [0x476a80, 0x2a4557, 0x38bdf8, 0x07121a],
            fungal_cavern: [0x3b334f, 0x241e33, 0xa855f7, 0x0d0814],
            sunken_temple: [0x2d4a4e, 0x1a2e31, 0x2dd4bf, 0x061214],
            obsidian_spire: [0x27272a, 0x18181b, 0xf97316, 0x09090b],
            sunless_mire: [0x3a4232, 0x23291e, 0x84cc16, 0x0b0f08],
            sandstone_tomb: [0x785d43, 0x4d3a28, 0xfbbf24, 0x171008],
            clockwork_vault: [0x52483e, 0x332c25, 0xd97706, 0x120f0b],
            astral_nexus: [0x312e59, 0x1e1b3b, 0x818cf8, 0x07061a],
            blighted_woods: [0x33402f, 0x1f281c, 0xa3e635, 0x090d07],
            magma_caldera: [0x4a251d, 0x2b140f, 0xf97316, 0x140704],
            crystal_grotto: [0x354b5e, 0x1e2e3d, 0x22d3ee, 0x071018],
            iron_bastion: [0x4b5563, 0x2d343d, 0xf59e0b, 0x0e1114],
            whispering_crypt: [0x3b424c, 0x23282e, 0xc084fc, 0x090b0f],
            plague_sewer: [0x3d4732, 0x252b1e, 0x4ade80, 0x0a0d07],
            storm_peaks: [0x475569, 0x2c3645, 0x60a5fa, 0x090e17],
            shadow_fen: [0x2c3639, 0x1a2123, 0x2dd4bf, 0x06090a],
            gilded_sanctum: [0x6b5839, 0x423521, 0xfacc15, 0x141008],
            ashen_wastes: [0x4d4a47, 0x2e2c2a, 0xfb923c, 0x100f0e],
            blood_altar: [0x4a1d24, 0x2b0f13, 0xf43f5e, 0x140507],
            emerald_ruins: [0x2e4d3b, 0x1b3024, 0x34d399, 0x06120b],
            starlit_observatory: [0x293252, 0x181e33, 0x93c5fd, 0x060814],
            bone_catacombs: [0x57534e, 0x36332f, 0xe2e8f0, 0x100f0e],
            ember_depths: [0x4d2a20, 0x2e1711, 0xef4444, 0x140805]
        };
        for (var k in extra) {
            if (Object.prototype.hasOwnProperty.call(extra, k)) {
                var c = extra[k];
                BIOME_PALETTES[k] = {
                    floor: c[0],
                    wall: c[1],
                    accent: c[2],
                    fog: c[3],
                    fogDensity: 0.0058,
                    ambientSky: c[2],
                    ambientGround: c[1],
                    dirColor: 0xe2e8f0
                };
            }
        }
    })();

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
                // Chiseled slate stone blocks with subtle moss & teal rune accents
                ctx.fillStyle = kind === 'wall' ? '#58626e' : '#7c8794';
                ctx.fillRect(0, 0, 128, 128);
                ctx.strokeStyle = 'rgba(15,23,42,0.55)';
                ctx.lineWidth = 3;
                ctx.strokeRect(2, 2, 124, 124);
                ctx.beginPath();
                ctx.moveTo(0, 64); ctx.lineTo(128, 64);
                ctx.moveTo(64, 0); ctx.lineTo(64, 64);
                ctx.moveTo(32, 64); ctx.lineTo(32, 128);
                ctx.moveTo(96, 64); ctx.lineTo(96, 128);
                ctx.stroke();
                // Subtle moss patches
                ctx.fillStyle = 'rgba(101,163,13,0.16)';
                ctx.fillRect(6, 56, 20, 12);
                ctx.fillRect(88, 6, 26, 10);
                // Faint carved rune line
                ctx.strokeStyle = 'rgba(45,212,191,0.18)';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(18, 18, 28, 28);
            } else if (biome === 'manufactorum') {
                ctx.fillStyle = '#4b5563';
                ctx.fillRect(0, 0, 128, 128);
                ctx.fillStyle = 'rgba(249,115,22,0.22)';
                for (var i = 0; i < 128; i += 16) {
                    ctx.fillRect(i, 0, 4, 128);
                    ctx.fillRect(0, i, 128, 2);
                }
                ctx.fillStyle = 'rgba(255,255,255,0.16)';
                for (var rx = 12; rx < 128; rx += 32) {
                    for (var ry = 12; ry < 128; ry += 32) {
                        ctx.fillRect(rx, ry, 4, 4);
                    }
                }
            } else if (biome === 'void_hull') {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(0, 0, 128, 128);
                ctx.strokeStyle = 'rgba(45,212,191,0.28)';
                ctx.lineWidth = 2;
                ctx.strokeRect(8, 8, 112, 112);
                ctx.beginPath();
                ctx.arc(64, 64, 34, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = 'rgba(56,189,248,0.1)';
                ctx.fillRect(16, 16, 40, 96);
                ctx.fillRect(72, 16, 40, 96);
            } else {
                // trench: weathered timber & mossy stone
                ctx.fillStyle = '#44403c';
                ctx.fillRect(0, 0, 128, 128);
                ctx.fillStyle = 'rgba(87,83,78,0.45)';
                for (var y = 8; y < 128; y += 22) {
                    ctx.fillRect(4, y, 120, 12);
                }
                ctx.fillStyle = 'rgba(132,204,22,0.14)';
                ctx.fillRect(10, 10, 28, 18);
                ctx.strokeStyle = 'rgba(132,204,22,0.2)';
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
            var rim = new THREE.DirectionalLight(0x98baff, 0.32);
            rim.position.set(-20, 12, -24);
            worldRoot.add(rim);
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
            buildRuinAtmosphere(terrain);
            buildZoneProps(terrain);
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
            var portalGrp = new THREE.Group();

            // Floor rune ring
            var geo = trackGeo(new THREE.TorusGeometry(1.15, 0.1, 8, 24));
            geo.rotateX(Math.PI * 0.5);
            var ringMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
            var ring = new THREE.Mesh(geo, ringMat);
            ring.position.y = 0.14;
            portalGrp.add(ring);

            // Stone archway pillars + lintel
            var stoneMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, metalness: 0.15 }));
            var pillarGeo = trackGeo(new THREE.BoxGeometry(0.42, 2.4, 0.42));
            var leftP = new THREE.Mesh(pillarGeo, stoneMat);
            leftP.position.set(-1.1, 1.2, 0);
            leftP.castShadow = true;
            portalGrp.add(leftP);

            var rightP = new THREE.Mesh(pillarGeo, stoneMat);
            rightP.position.set(1.1, 1.2, 0);
            rightP.castShadow = true;
            portalGrp.add(rightP);

            var lintelGeo = trackGeo(new THREE.BoxGeometry(2.8, 0.45, 0.55));
            var lintel = new THREE.Mesh(lintelGeo, stoneMat);
            lintel.position.set(0, 2.45, 0);
            lintel.castShadow = true;
            portalGrp.add(lintel);

            // Warm glowing portal core
            var coreGeo = trackGeo(new THREE.PlaneGeometry(1.75, 2.1));
            var coreMat = trackMat(new THREE.MeshBasicMaterial({
                color: 0xf59e0b,
                transparent: true,
                opacity: 0.42,
                side: THREE.DoubleSide
            }));
            var core = new THREE.Mesh(coreGeo, coreMat);
            core.position.set(0, 1.18, 0);
            portalGrp.add(core);

            portalGrp.position.set(w.x, w.y, w.z);
            worldRoot.add(portalGrp);
            exitBeacon = ring;

            if (terrain.lightAnchors) {
                terrain.lightAnchors.push({ x: w.x, y: w.y + 1.6, z: w.z, color: 0xfbbf24, distance: 12, intensity: 1.8 });
            }
        }

        function buildRuinAtmosphere(terrain) {
            if (!terrain || !terrain.cells) return;
            var rooms = terrain.rooms || [];

            // 1. Central Floor Rune Sigil (Puzzle / Ritual Area)
            var sigilRoom = rooms[Math.floor(rooms.length * 0.5)] || rooms[0];
            if (sigilRoom) {
                var sw = terrain.gridToWorld(sigilRoom.cx, sigilRoom.cz);
                var sigilOuter = trackGeo(new THREE.RingGeometry(1.4, 1.65, 24));
                sigilOuter.rotateX(-Math.PI * 0.5);
                var sigilMat = trackMat(new THREE.MeshBasicMaterial({
                    color: 0x2dd4bf,
                    transparent: true,
                    opacity: 0.45,
                    side: THREE.DoubleSide
                }));
                var sigilMesh = new THREE.Mesh(sigilOuter, sigilMat);
                sigilMesh.position.set(sw.x, sw.y + 0.06, sw.z);
                worldRoot.add(sigilMesh);

                if (terrain.lightAnchors) {
                    terrain.lightAnchors.push({ x: sw.x, y: sw.y + 1.1, z: sw.z, color: 0x2dd4bf, distance: 11, intensity: 1.4 });
                }
            }

            // 2. Carved Rune Totem Pillars in rooms
            var pillarStoneMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3b444f, roughness: 0.85, metalness: 0.15 }));
            var runeBandMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x2dd4bf }));
            var baseGeo = trackGeo(new THREE.BoxGeometry(0.7, 1.4, 0.7));
            var bandGeo = trackGeo(new THREE.BoxGeometry(0.74, 0.22, 0.74));
            var capGeo = trackGeo(new THREE.BoxGeometry(0.82, 0.35, 0.82));

            for (var r = 0; r < rooms.length && r < 4; r++) {
                var rm = rooms[r];
                var px = rm.cx + (r % 2 === 0 ? 2 : -2);
                var pz = rm.cz + (r < 2 ? 2 : -2);
                var cell = terrain.getCell ? terrain.getCell(px, pz) : null;
                if (!cell || cell.type !== 'floor') continue;
                var pw = terrain.gridToWorld(px, pz);
                var tot = new THREE.Group();
                var bMesh = new THREE.Mesh(baseGeo, pillarStoneMat);
                bMesh.position.y = 0.7;
                bMesh.castShadow = true;
                tot.add(bMesh);
                var band = new THREE.Mesh(bandGeo, runeBandMat);
                band.position.y = 0.85;
                tot.add(band);
                var cap = new THREE.Mesh(capGeo, pillarStoneMat);
                cap.position.y = 1.55;
                cap.castShadow = true;
                tot.add(cap);
                tot.position.set(pw.x, pw.y, pw.z);
                worldRoot.add(tot);
            }

            // 3. Bioluminescent Charge Plants near ramps & wall corners
            var bulbGeo = trackGeo(new THREE.SphereGeometry(0.18, 8, 8));
            var bulbMat = trackMat(new THREE.MeshStandardMaterial({
                color: 0xa3e635,
                emissive: 0x65a30d,
                emissiveIntensity: 1.35,
                roughness: 0.35
            }));
            var leafGeo = trackGeo(new THREE.ConeGeometry(0.22, 0.32, 5));
            var leafMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x365314, roughness: 0.8 }));

            var plantCount = 0;
            for (var z = 1; z < terrain.height - 1 && plantCount < 18; z += 2) {
                for (var x = 1; x < terrain.width - 1 && plantCount < 18; x += 3) {
                    var c = terrain.getCell(x, z);
                    if (!c || c.type !== 'floor') continue;
                    var nWall = terrain.getCell(x, z - 1);
                    var wWall = terrain.getCell(x - 1, z);
                    if ((nWall && nWall.type === 'wall') || (wWall && wWall.type === 'wall')) {
                        var cw = terrain.gridToWorld(x, z);
                        var plant = new THREE.Group();
                        var leaf = new THREE.Mesh(leafGeo, leafMat);
                        leaf.position.y = 0.16;
                        plant.add(leaf);
                        var bulb = new THREE.Mesh(bulbGeo, bulbMat);
                        bulb.position.y = 0.34;
                        plant.add(bulb);
                        plant.position.set(cw.x + ((x % 2) - 0.5) * 0.5, cw.y, cw.z + ((z % 2) - 0.5) * 0.5);
                        worldRoot.add(plant);
                        plantCount++;
                    }
                }
            }

            // 4. Path of the Honored Dead: Spectral Violet Braziers & Gravestones
            if (terrain.zoneArchetype === 'pass' || terrain.biome === 'cathedral') {
                var graveMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 }));
                var graveGeo = trackGeo(new THREE.BoxGeometry(0.45, 0.75, 0.16));
                var brazierMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.4 }));
                var flameMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xa855f7 }));
                var brazierGeo = trackGeo(new THREE.CylinderGeometry(0.28, 0.2, 0.5, 8));
                var flameGeo = trackGeo(new THREE.ConeGeometry(0.2, 0.45, 6));

                for (var ri = 0; ri < rooms.length && ri < 5; ri++) {
                    var rm2 = rooms[ri];
                    var gc = terrain.getCell ? terrain.getCell(rm2.cx - 2, rm2.cz + 2) : null;
                    if (gc && gc.type === 'floor') {
                        var gw = terrain.gridToWorld(rm2.cx - 2, rm2.cz + 2);
                        var grave = new THREE.Mesh(graveGeo, graveMat);
                        grave.position.set(gw.x, gw.y + 0.375, gw.z);
                        grave.rotation.y = (ri % 3) * 0.25;
                        grave.castShadow = true;
                        worldRoot.add(grave);
                    }
                    if (ri % 2 === 1) {
                        var bc = terrain.getCell ? terrain.getCell(rm2.cx + 2, rm2.cz - 2) : null;
                        if (bc && bc.type === 'floor') {
                            var bw = terrain.gridToWorld(rm2.cx + 2, rm2.cz - 2);
                            var brazier = new THREE.Group();
                            var bowl = new THREE.Mesh(brazierGeo, brazierMat);
                            bowl.position.y = 0.25;
                            brazier.add(bowl);
                            var flame = new THREE.Mesh(flameGeo, flameMat);
                            flame.position.y = 0.65;
                            brazier.add(flame);
                            brazier.position.set(bw.x, bw.y, bw.z);
                            worldRoot.add(brazier);
                            if (terrain.lightAnchors) {
                                terrain.lightAnchors.push({ x: bw.x, y: bw.y + 1.0, z: bw.z, color: 0xa855f7, distance: 10, intensity: 1.45 });
                            }
                        }
                    }
                }
            }

            // 5. Overworld Landmark River / Lava Channel (Temple Steppes / Forge Canyon)
            if (terrain.riverAxis) {
                var spanW = terrain.width * terrain.tileSize;
                var spanH = terrain.height * terrain.tileSize;
                var isLava = terrain.biome === 'manufactorum';
                var riverGeo = trackGeo(new THREE.PlaneGeometry(
                    terrain.riverAxis === 'x' ? spanW : 4.5,
                    terrain.riverAxis === 'x' ? 4.5 : spanH
                ));
                riverGeo.rotateX(-Math.PI / 2);
                var riverMat = trackMat(new THREE.MeshBasicMaterial({
                    color: isLava ? 0xf97316 : 0x0ea5e9,
                    transparent: true,
                    opacity: isLava ? 0.65 : 0.42
                }));
                var riverMesh = new THREE.Mesh(riverGeo, riverMat);
                riverMesh.position.set(spanW * 0.5, -0.35, spanH * 0.5);
                worldRoot.add(riverMesh);

                // Wooden/stone dock bridges spanning across the river channel
                var bridgeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 }));
                var bridgeGeo = trackGeo(new THREE.BoxGeometry(
                    terrain.riverAxis === 'x' ? 3.2 : 5.2,
                    0.22,
                    terrain.riverAxis === 'x' ? 5.2 : 3.2
                ));
                for (var bi = 1; bi <= 2; bi++) {
                    var bMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
                    var frac = bi / 3;
                    bMesh.position.set(
                        terrain.riverAxis === 'x' ? spanW * frac : spanW * 0.5,
                        0.04,
                        terrain.riverAxis === 'x' ? spanH * 0.5 : spanH * frac
                    );
                    bMesh.castShadow = true;
                    bMesh.receiveShadow = true;
                    worldRoot.add(bMesh);
                }
            }

            // 6. Hanging Iron Lantern Posts & Hexagonal Shrine Pedestals
            var postMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.5 }));
            var lanternMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
            var postGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 6));
            var armGeo = trackGeo(new THREE.BoxGeometry(0.45, 0.06, 0.06));
            var lanternGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.26, 0.18));

            for (var li = 0; li < rooms.length && li < 4; li++) {
                var lrm = rooms[li];
                var lc = terrain.getCell ? terrain.getCell(lrm.cx + 3, lrm.cz + 1) : null;
                if (lc && lc.type === 'floor') {
                    var lw = terrain.gridToWorld(lrm.cx + 3, lrm.cz + 1);
                    var lGrp = new THREE.Group();
                    var pMesh = new THREE.Mesh(postGeo, postMat);
                    pMesh.position.y = 1.1;
                    lGrp.add(pMesh);
                    var arm = new THREE.Mesh(armGeo, postMat);
                    arm.position.set(0.2, 2.1, 0);
                    lGrp.add(arm);
                    var lant = new THREE.Mesh(lanternGeo, lanternMat);
                    lant.position.set(0.38, 1.9, 0);
                    lGrp.add(lant);
                    lGrp.position.set(lw.x, lw.y, lw.z);
                    worldRoot.add(lGrp);
                    if (terrain.lightAnchors) {
                        terrain.lightAnchors.push({ x: lw.x + 0.38, y: lw.y + 1.85, z: lw.z, color: 0xf59e0b, distance: 9, intensity: 1.25 });
                    }
                }
            }

            // Hexagonal Shrine Pedestal in an offshoot room
            if (rooms.length >= 3) {
                var srm = rooms[2];
                var sc = terrain.getCell ? terrain.getCell(srm.cx, srm.cz) : null;
                if (sc && sc.type === 'floor') {
                    var srw = terrain.gridToWorld(srm.cx, srm.cz);
                    var hexGeo = trackGeo(new THREE.CylinderGeometry(0.85, 1.0, 0.45, 6));
                    var hexMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 }));
                    var hexMesh = new THREE.Mesh(hexGeo, hexMat);
                    hexMesh.position.set(srw.x, srw.y + 0.225, srw.z);
                    hexMesh.castShadow = true;
                    worldRoot.add(hexMesh);

                    var shrineRingGeo = trackGeo(new THREE.RingGeometry(0.95, 1.15, 6));
                    shrineRingGeo.rotateX(-Math.PI * 0.5);
                    var shrineRingMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x84cc16, side: THREE.DoubleSide }));
                    var shrineRing = new THREE.Mesh(shrineRingGeo, shrineRingMat);
                    shrineRing.position.set(srw.x, srw.y + 0.05, srw.z);
                    worldRoot.add(shrineRing);
                }
            }
        }

        function buildZoneProps(terrain) {
            if (!terrain || !terrain.rooms) return;
            var rooms = terrain.rooms;
            var isOutdoor = terrain.zoneArchetype === 'overworld' || terrain.zoneArchetype === 'pass';

            var woodMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 }));
            var stoneMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3b444f, roughness: 0.88 }));
            var roofMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.9 }));
            var foliageMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.85 }));
            var bannerMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.75, side: THREE.DoubleSide }));

            if (isOutdoor) {
                // Outdoor: Timber-framed cottage facades, wooden carts, and gnarled autumn trees
                var baseGeo = trackGeo(new THREE.BoxGeometry(2.2, 1.4, 1.6));
                var roofGeo = trackGeo(new THREE.ConeGeometry(1.55, 1.1, 4));
                roofGeo.rotateY(Math.PI * 0.25);
                var trunkGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.22, 1.5, 6));
                var crownGeo = trackGeo(new THREE.DodecahedronGeometry(0.85, 0));
                var cartBedGeo = trackGeo(new THREE.BoxGeometry(1.1, 0.35, 0.75));
                var wheelGeo = trackGeo(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 10));
                wheelGeo.rotateX(Math.PI * 0.5);

                for (var i = 0; i < rooms.length && i < 5; i++) {
                    var rm = rooms[i];
                    // Gnarled autumn tree
                    var tc = terrain.getCell ? terrain.getCell(rm.cx - 3, rm.cz - 2) : null;
                    if (tc && tc.type === 'floor') {
                        var tw = terrain.gridToWorld(rm.cx - 3, rm.cz - 2);
                        var tree = new THREE.Group();
                        var trunk = new THREE.Mesh(trunkGeo, woodMat);
                        trunk.position.y = 0.75;
                        trunk.castShadow = true;
                        tree.add(trunk);
                        var crown = new THREE.Mesh(crownGeo, foliageMat);
                        crown.position.y = 1.75;
                        crown.castShadow = true;
                        tree.add(crown);
                        tree.position.set(tw.x, tw.y, tw.z);
                        worldRoot.add(tree);
                    }
                    // Wooden supply cart
                    if (i % 2 === 0) {
                        var cc = terrain.getCell ? terrain.getCell(rm.cx + 1, rm.cz + 3) : null;
                        if (cc && cc.type === 'floor') {
                            var cw = terrain.gridToWorld(rm.cx + 1, rm.cz + 3);
                            var cart = new THREE.Group();
                            var bed = new THREE.Mesh(cartBedGeo, woodMat);
                            bed.position.y = 0.35;
                            bed.castShadow = true;
                            cart.add(bed);
                            var w1 = new THREE.Mesh(wheelGeo, woodMat);
                            w1.position.set(0, 0.28, 0.42);
                            cart.add(w1);
                            var w2 = new THREE.Mesh(wheelGeo, woodMat);
                            w2.position.set(0, 0.28, -0.42);
                            cart.add(w2);
                            cart.position.set(cw.x, cw.y, cw.z);
                            cart.rotation.y = i * 0.6;
                            worldRoot.add(cart);
                        }
                    }
                }
            } else {
                // Indoor: Hanging crimson war banners & stone buttress arches
                var poleGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6));
                var clothGeo = trackGeo(new THREE.PlaneGeometry(0.65, 1.35));
                for (var j = 0; j < rooms.length && j < 6; j++) {
                    var irm = rooms[j];
                    var bc = terrain.getCell ? terrain.getCell(irm.cx - 2, irm.cz - 2) : null;
                    if (bc && bc.type === 'floor') {
                        var bw = terrain.gridToWorld(irm.cx - 2, irm.cz - 2);
                        var bGrp = new THREE.Group();
                        var pole = new THREE.Mesh(poleGeo, stoneMat);
                        pole.position.y = 1.2;
                        bGrp.add(pole);
                        var cloth = new THREE.Mesh(clothGeo, bannerMat);
                        cloth.position.set(0.35, 1.55, 0);
                        bGrp.add(cloth);
                        bGrp.position.set(bw.x, bw.y, bw.z);
                        worldRoot.add(bGrp);
                    }
                }
            }
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
