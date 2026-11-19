(function (root) {
    'use strict';

    var renderNs = root.GraveGainRender = root.GraveGainRender || {};

    function clamp(v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    function createStubRenderer(canvas) {
        return {
            isStub: true,
            domElement: canvas || null,
            shadowMap: { enabled: false, type: 0 },
            info: { memory: { geometries: 0, textures: 0 }, render: { calls: 0, triangles: 0 } },
            setPixelRatio: function () {},
            setSize: function () {},
            render: function () {},
            dispose: function () {},
            getContext: function () { return null; }
        };
    }

    function createStubScene() {
        return {
            isStub: true,
            children: [],
            fog: null,
            background: null,
            add: function (obj) { if (obj && this.children.indexOf(obj) < 0) this.children.push(obj); },
            remove: function (obj) { this.children = this.children.filter(function (c) { return c !== obj; }); },
            clear: function () { this.children.length = 0; }
        };
    }

    function paintFallbackBanner(container, reason) {
        if (!container || typeof document === 'undefined') return null;
        try {
            var fb = document.getElementById('fallback2dCanvas');
            if (!fb) {
                fb = document.createElement('canvas');
                fb.id = 'fallback2dCanvas';
                fb.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;';
                container.appendChild(fb);
            }
            var w = Math.max(320, Math.floor(container.clientWidth || 1000));
            var h = Math.max(240, Math.floor(container.clientHeight || 600));
            fb.width = w;
            fb.height = h;
            var ctx = fb.getContext && fb.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#09070f';
                ctx.fillRect(0, 0, w, h);
                ctx.strokeStyle = 'rgba(203,165,92,0.5)';
                ctx.strokeRect(16, 16, w - 32, h - 32);
                ctx.fillStyle = '#f3d487';
                ctx.font = 'bold 16px Orbitron, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('WebGL Fallback Active — Simulation Running', w / 2, h / 2 - 8);
                ctx.fillStyle = '#9ca3af';
                ctx.font = '12px Inter, sans-serif';
                ctx.fillText(String(reason || 'WebGL context unavailable'), w / 2, h / 2 + 16);
            }
            return fb;
        } catch (_) {
            return null;
        }
    }

    function renderTacticalFallback(ctx, width, height, gameState, terrain) {
        if (!ctx || !terrain || !gameState || !gameState.player) return;
        var player = gameState.player;
        var scale = Math.min(width / 46, height / 34);
        var tileSize = Math.max(2, Number(terrain.tileSize) || 2) * scale;
        var centerX = width * 0.5;
        var centerY = height * 0.5;
        var palette = {
            cathedral: { floor: '#292333', wall: '#100d18', accent: '#c8a25a' },
            manufactorum: { floor: '#28313a', wall: '#11171e', accent: '#f59e0b' },
            void_hull: { floor: '#172b38', wall: '#09151e', accent: '#22d3ee' },
            trench: { floor: '#332a20', wall: '#18130e', accent: '#a3e635' }
        }[terrain.biome] || { floor: '#292333', wall: '#100d18', accent: '#c8a25a' };
        function screenX(x) { return centerX + (x - player.x) * scale; }
        function screenY(z) { return centerY + (z - player.z) * scale; }
        function isVisible(x, z) {
            var grid = terrain.worldToGrid(x, z);
            var cell = terrain.getCell(grid.gx, grid.gz);
            return !!(cell && cell.visible);
        }

        ctx.clearRect(0, 0, width, height);
        var bg = ctx.createRadialGradient(centerX, centerY, 24, centerX, centerY, Math.max(width, height) * 0.72);
        bg.addColorStop(0, '#171521');
        bg.addColorStop(1, '#05070b');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        var left = Math.max(0, Math.floor((player.x - width / (2 * scale)) / terrain.tileSize) - 1);
        var right = Math.min(terrain.width - 1, Math.ceil((player.x + width / (2 * scale)) / terrain.tileSize) + 1);
        var top = Math.max(0, Math.floor((player.z - height / (2 * scale)) / terrain.tileSize) - 1);
        var bottom = Math.min(terrain.height - 1, Math.ceil((player.z + height / (2 * scale)) / terrain.tileSize) + 1);
        var openedSecretCaches = Object.create(null);
        (terrain.secretCaches || []).forEach(function (cache) { if (cache && cache.opened) openedSecretCaches[cache.id] = true; });
        for (var gz = top; gz <= bottom; gz++) {
            for (var gx = left; gx <= right; gx++) {
                var cell = terrain.getCell(gx, gz);
                if (!cell || !cell.explored) continue;
                if (cell.secretRoom && !openedSecretCaches[cell.secretCacheId]) continue;
                var wx = gx * terrain.tileSize;
                var wz = gz * terrain.tileSize;
                var px = screenX(wx);
                var py = screenY(wz);
                var color = cell.type === 'wall' ? palette.wall : (cell.type === 'breachable' ? '#684638' : (cell.type === 'door' ? (cell.doorOpen ? '#584b39' : '#f0bd5e') : (cell.type === 'chasm' ? '#030407' : palette.floor)));
                if (cell.surface === 'mud' || cell.surface === 'sludge') color = cell.surface === 'sludge' ? '#30451c' : '#51402e';
                if (cell.surface === 'grate') color = '#35414d';
                if (cell.treasureRoom) color = '#8a642f';
                if (cell.secretRoom) color = '#493451';
                if (cell.secretWall && cell.secretDiscovered) color = '#c084fc';
                if (!cell.visible) color = cell.type === 'wall' ? '#0a0a10' : '#101019';
                ctx.fillStyle = color;
                ctx.fillRect(px, py, tileSize + 0.6, tileSize + 0.6);
                if (cell.hazard && cell.visible) {
                    ctx.fillStyle = cell.hazard === 'fire' ? 'rgba(251,104,70,.45)' : (cell.hazard === 'poison' ? 'rgba(163,230,53,.38)' : 'rgba(103,232,249,.38)');
                    ctx.fillRect(px + tileSize * 0.22, py + tileSize * 0.22, tileSize * 0.56, tileSize * 0.56);
                }
            }
        }

        function drawCacheChest(cache, isSecret) {
            if (!cache || (isSecret && !cache.opened)) return;
            var pos = terrain.gridToWorld(cache.gx, cache.gz);
            if (!isVisible(pos.x, pos.z)) return;
            var x = screenX(pos.x), y = screenY(pos.z);
            var w = Math.max(8, scale * 1.1), h = Math.max(6, scale * 0.78);
            var isOpen = isSecret ? !!cache.looted : !!cache.opened;
            var trim = isSecret ? '#c084fc' : '#fbbf24';
            ctx.save();
            ctx.shadowColor = trim;
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#160f0d';
            ctx.fillRect(x - w * 0.58, y - h * 0.42, w * 1.16, h * 0.96);
            ctx.shadowBlur = 0;
            ctx.fillStyle = isOpen ? '#4b3528' : '#3b2118';
            ctx.fillRect(x - w * 0.5, y - h * 0.32, w, h * 0.75);
            ctx.strokeStyle = trim;
            ctx.lineWidth = Math.max(1, scale * 0.045);
            ctx.strokeRect(x - w * 0.5, y - h * 0.32, w, h * 0.75);
            ctx.fillStyle = isOpen ? '#8b7355' : '#6a3c27';
            ctx.fillRect(x - w * 0.5, y - h * 0.58, w, h * 0.32);
            ctx.strokeStyle = trim;
            ctx.strokeRect(x - w * 0.5, y - h * 0.58, w, h * 0.32);
            ctx.fillStyle = trim;
            ctx.beginPath();
            ctx.arc(x, y - h * 0.12, Math.max(1.5, scale * 0.07), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        (terrain.treasureCaches || []).forEach(function (cache) { drawCacheChest(cache, false); });
        (terrain.secretCaches || []).forEach(function (cache) { drawCacheChest(cache, true); });

        (gameState.props || []).forEach(function (prop) {
            if (!prop || prop.destroyed || !isVisible(prop.x, prop.z)) return;
            var size = Math.max(4, (Number(prop.radius) || 0.35) * scale * 1.25);
            ctx.fillStyle = prop.explosive ? '#fb923c' : '#64748b';
            ctx.fillRect(screenX(prop.x) - size / 2, screenY(prop.z) - size / 2, size, size);
        });

        (gameState.loot || []).forEach(function (loot) {
            if (!loot || loot.picked || !isVisible(loot.x, loot.z)) return;
            if (loot.secretCacheId && !openedSecretCaches[loot.secretCacheId]) return;
            var colors = { weapon: '#67e8f9', conduit: '#22d3ee', anchor: '#c084fc', forge_cache: '#fbbf24', toxic_vent: '#a3e635', memorial_beacon: '#fef08a', laser_designator: '#fb7185', item: '#c084fc', health_orb: '#4ade80', speed_boost: '#22d3ee', damage_boost: '#f97316', shield_pickup: '#60a5fa', rage_potion: '#ef4444', gold_multiplier: '#facc15', xp_multiplier: '#c084fc', soul_fountain: '#34d399', blood_altar: '#fb7185' };
            var radius = loot.type === 'weapon' || loot.type === 'conduit' || loot.objectiveId || colors[loot.type] ? 6 : 4;
            ctx.beginPath();
            ctx.fillStyle = colors[loot.type] || palette.accent;
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 9;
            ctx.arc(screenX(loot.x), screenY(loot.z), radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            if (loot.type === 'laser_designator') {
                ctx.strokeStyle = 'rgba(251,113,133,.7)';
                ctx.beginPath();
                ctx.arc(screenX(loot.x), screenY(loot.z), 11, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        (gameState.enemies || []).forEach(function (enemy) {
            if (!enemy || enemy.isDead || enemy.hp <= 0 || enemy.ambushHidden || !isVisible(enemy.x, enemy.z)) return;
            var x = screenX(enemy.x), y = screenY(enemy.z);
            if (enemy.telegraph && enemy.telegraph.radius) {
                ctx.beginPath();
                ctx.strokeStyle = enemy.telegraph.type === 'bash' ? 'rgba(56,189,248,.8)' : 'rgba(248,113,113,.8)';
                ctx.lineWidth = 2;
                ctx.arc(screenX(enemy.telegraph.x), screenY(enemy.telegraph.z), enemy.telegraph.radius * scale, 0, Math.PI * 2);
                ctx.stroke();
            }
            var radius = enemy.type === 'boss' ? 11 : (enemy.type === 'elite' ? 8 : 5.5);
            ctx.beginPath();
            ctx.fillStyle = enemy.isEnraged ? '#ef4444' : (enemy.isPriorityTarget ? '#fb7185' : (enemy.autoTargeted ? '#22d3ee' : (enemy.type === 'boss' ? '#e879f9' : (enemy.type === 'elite' ? '#fb923c' : (enemy.type === 'exploding' ? '#c084fc' : '#f87171')))));
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = enemy.autoTargeted || enemy.isPriorityTarget ? 12 : 4;
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            if (enemy.type === 'boss' || enemy.isPriorityTarget) {
                var barW = 24;
                var hpRatio = Math.max(0, Math.min(1, enemy.hp / Math.max(1, enemy.maxHp)));
                ctx.fillStyle = 'rgba(0,0,0,.75)';
                ctx.fillRect(x - barW / 2, y - radius - 8, barW, 3);
                ctx.fillStyle = '#fb7185';
                ctx.fillRect(x - barW / 2, y - radius - 8, barW * hpRatio, 3);
            }
        });

        (gameState.projectiles || []).forEach(function (projectile) {
            if (!projectile || projectile.dead || !isVisible(projectile.x, projectile.z)) return;
            ctx.beginPath();
            ctx.fillStyle = projectile.owner === player ? '#fde68a' : '#fda4af';
            ctx.arc(screenX(projectile.x), screenY(projectile.z), projectile.explosive ? 4 : 2.5, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(player.angle || 0);
        ctx.fillStyle = '#86efac';
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-8, -7);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-8, 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        var hpRatio = Math.max(0, Math.min(1, player.hp / Math.max(1, player.maxHp)));
        ctx.fillStyle = 'rgba(4,8,13,.82)';
        ctx.fillRect(16, 16, 190, 28);
        ctx.fillStyle = '#111827';
        ctx.fillRect(25, 27, 160, 6);
        ctx.fillStyle = hpRatio > 0.35 ? '#4ade80' : '#fb7185';
        ctx.fillRect(25, 27, 160 * hpRatio, 6);
        ctx.fillStyle = '#e5e7eb';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('TACTICAL VIEW · ' + String(terrain.biome || 'CRYPT').replace(/_/g, ' ').toUpperCase(), 24, 22);
        ctx.fillStyle = 'rgba(226,232,240,.75)';
        ctx.textAlign = 'right';
        ctx.fillText('WASD MOVE · MOUSE AIM · E INTERACT', width - 18, height - 16);
    }

    var ThreeLoader = {
        init: function (opts) {
            opts = opts || {};
            var THREE = root.THREE;
            var canvas = opts.canvas || (typeof document !== 'undefined' ? document.getElementById('gameCanvas') : null);
            var container = opts.container || (typeof document !== 'undefined' ? document.getElementById('canvasContainer') : null);
            var lightingCanvas = typeof document !== 'undefined' ? document.getElementById('lightingCanvas') : null;
            var preset = opts.preset || {};
            var bus = opts.bus || null;

            var mem = (typeof navigator !== 'undefined' && navigator.deviceMemory) || 8;
            var cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
            var lowMemory = mem <= 4 || cores <= 2;

            var state = {
                ok: false,
                mode: 'fallback',
                contextLost: false,
                width: 1000,
                height: 600,
                pixelRatio: 1,
                maxPixelRatio: clamp(preset.pixelRatioMax || (lowMemory ? 1.0 : 1.5), 0.75, 2.0),
                minPixelRatio: 0.75,
                gpuRenderer: 'none',
                reason: null,
                rollingMs: [],
                disposed: false
            };

            var scene = THREE ? new THREE.Scene() : createStubScene();
            var renderer = null;

            if (THREE && canvas) {
                try {
                    renderer = new THREE.WebGLRenderer({
                        canvas: canvas,
                        alpha: false,
                        antialias: !lowMemory,
                        preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
                        powerPreference: 'default',
                        failIfMajorPerformanceCaveat: false
                    });
                    var gl = renderer.getContext && renderer.getContext();
                    if (!gl) {
                        throw new Error('WebGL context returned null');
                    }

                    // Feature-detected color space & tone mapping (r128 + r180 safe)
                    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace !== undefined) {
                        renderer.outputColorSpace = THREE.SRGBColorSpace;
                    } else if ('outputEncoding' in renderer && THREE.sRGBEncoding !== undefined) {
                        renderer.outputEncoding = THREE.sRGBEncoding;
                    }
                    if ('toneMapping' in renderer && THREE.ACESFilmicToneMapping !== undefined) {
                        renderer.toneMapping = THREE.ACESFilmicToneMapping;
                        renderer.toneMappingExposure = 1.28;
                    }
                    if (renderer.shadowMap) {
                        renderer.shadowMap.enabled = preset.shadows !== false;
                        renderer.shadowMap.type = THREE.PCFSoftShadowMap || 1;
                    }

                    try {
                        var dbg = gl.getExtension('WEBGL_debug_renderer_info');
                        if (dbg) {
                            state.gpuRenderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || 'WebGL');
                        } else {
                            state.gpuRenderer = String(gl.getParameter(gl.RENDERER) || 'WebGL');
                        }
                    } catch (_) {
                        state.gpuRenderer = 'WebGL';
                    }

                    state.ok = true;
                    state.mode = 'webgl';

                    // Hide 2D multiply lighting overlay in 3D mode so scene isn't darkened
                    if (lightingCanvas) {
                        lightingCanvas.style.display = 'none';
                    }
                } catch (err) {
                    state.reason = err && err.message ? err.message : String(err);
                    if (renderer && typeof renderer.dispose === 'function') {
                        try { renderer.dispose(); } catch (_) {}
                    }
                    renderer = createStubRenderer(canvas);
                }
            } else {
                state.reason = !THREE ? 'THREE global missing' : 'Canvas element missing';
                renderer = createStubRenderer(canvas);
            }

            var fallbackCanvas = null;
            if (state.mode === 'fallback') {
                fallbackCanvas = paintFallbackBanner(container, state.reason);
            }

            var cameraRef = null;
            var resizeRaf = 0;

            function computeSize() {
                var cw = container ? container.clientWidth : (canvas ? canvas.clientWidth : 1000);
                var ch = container ? container.clientHeight : (canvas ? canvas.clientHeight : 600);
                var w = Math.max(320, Math.floor(cw || 1000));
                var h = Math.max(240, Math.floor(ch || 600));
                return { w: w, h: h };
            }

            function resize() {
                if (state.disposed) return { width: state.width, height: state.height };
                var dims = computeSize();
                state.width = dims.w;
                state.height = dims.h;

                var dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
                state.pixelRatio = clamp(Math.min(dpr, state.maxPixelRatio), state.minPixelRatio, 2.0);

                if (state.mode === 'webgl' && renderer && !state.contextLost) {
                    renderer.setPixelRatio(state.pixelRatio);
                    // CRITICAL: updateStyle = false so #fourweird-game-stage 100% flex CSS stays intact
                    renderer.setSize(dims.w, dims.h, false);
                } else {
                    var fb = fallbackCanvas || (typeof document !== 'undefined' ? document.getElementById('fallback2dCanvas') : null);
                    if (fb) {
                        fb.width = dims.w;
                        fb.height = dims.h;
                    }
                }

                if (cameraRef) {
                    cameraRef.aspect = dims.w / dims.h;
                    if (typeof cameraRef.updateProjectionMatrix === 'function') {
                        cameraRef.updateProjectionMatrix();
                    }
                }
                if (bus) bus.emit('render:resized', { width: dims.w, height: dims.h, pixelRatio: state.pixelRatio });
                return { width: dims.w, height: dims.h };
            }

            function scheduleResize() {
                if (state.disposed) return;
                if (typeof requestAnimationFrame !== 'function') {
                    resize();
                    return;
                }
                if (resizeRaf) cancelAnimationFrame(resizeRaf);
                resizeRaf = requestAnimationFrame(function () {
                    resizeRaf = 0;
                    resize();
                });
            }

            var onContextLost = function (e) {
                if (e && typeof e.preventDefault === 'function') e.preventDefault();
                state.contextLost = true;
                if (!fallbackCanvas) fallbackCanvas = paintFallbackBanner(container, 'WebGL context lost — tactical fallback active');
                else fallbackCanvas.style.display = 'block';
                resize();
                if (bus) bus.emit('render:context-lost');
            };
            var onContextRestored = function () {
                state.contextLost = false;
                if (fallbackCanvas) fallbackCanvas.style.display = 'none';
                resize();
                if (bus) bus.emit('render:context-restored');
            };

            if (canvas && typeof canvas.addEventListener === 'function') {
                canvas.addEventListener('webglcontextlost', onContextLost, false);
                canvas.addEventListener('webglcontextrestored', onContextRestored, false);
            }

            var resizeObserver = null;
            if (container && typeof ResizeObserver === 'function') {
                try {
                    resizeObserver = new ResizeObserver(function () {
                        scheduleResize();
                    });
                    resizeObserver.observe(container);
                } catch (_) { resizeObserver = null; }
            }

            if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
                window.addEventListener('resize', scheduleResize);
                window.addEventListener('fourweird-resize', scheduleResize);
                window.addEventListener('fourweird-fullscreen', scheduleResize);
            }
            if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
                document.addEventListener('fullscreenchange', scheduleResize);
            }

            // Initial size
            resize();

            return {
                ok: state.ok,
                mode: state.mode,
                renderer: renderer,
                scene: scene,
                attachCamera: function (cam) {
                    cameraRef = cam;
                    if (cameraRef) {
                        cameraRef.aspect = state.width / Math.max(1, state.height);
                        if (typeof cameraRef.updateProjectionMatrix === 'function') {
                            cameraRef.updateProjectionMatrix();
                        }
                    }
                },
                resize: resize,
                render: function (cam) {
                    if (state.disposed || state.contextLost || state.mode !== 'webgl') return;
                    var activeCam = cam || cameraRef;
                    if (activeCam && renderer) {
                        renderer.render(scene, activeCam);
                    }
                },
                renderFallback: function (gameState, terrain) {
                    if (state.disposed || (state.mode === 'webgl' && !state.contextLost) || !fallbackCanvas) return;
                    var ctx = fallbackCanvas.getContext && fallbackCanvas.getContext('2d');
                    if (ctx) renderTacticalFallback(ctx, fallbackCanvas.width, fallbackCanvas.height, gameState, terrain);
                },
                screenToWorld: function (clientX, clientY, player) {
                    if ((state.mode === 'webgl' && !state.contextLost) || !fallbackCanvas || !player) return null;
                    var rect = fallbackCanvas.getBoundingClientRect ? fallbackCanvas.getBoundingClientRect() : null;
                    if (!rect || !rect.width || !rect.height) return null;
                    var px = (clientX - rect.left) * (fallbackCanvas.width / rect.width);
                    var py = (clientY - rect.top) * (fallbackCanvas.height / rect.height);
                    var scale = Math.min(fallbackCanvas.width / 46, fallbackCanvas.height / 34);
                    return {
                        x: player.x + (px - fallbackCanvas.width * 0.5) / scale,
                        z: player.z + (py - fallbackCanvas.height * 0.5) / scale,
                        y: Number(player.y) || 0
                    };
                },
                recordFrameTime: function (frameMs) {
                    if (state.mode !== 'webgl') return;
                    state.rollingMs.push(frameMs);
                    if (state.rollingMs.length > 90) state.rollingMs.shift();
                    if (state.rollingMs.length === 90) {
                        var sum = 0;
                        for (var i = 0; i < 90; i++) sum += state.rollingMs[i];
                        var avg = sum / 90;
                        if (avg > 28 && state.maxPixelRatio > state.minPixelRatio) {
                            state.maxPixelRatio = Math.max(state.minPixelRatio, state.maxPixelRatio - 0.25);
                            state.rollingMs.length = 0;
                            resize();
                        }
                    }
                },
                setQuality: function (nextPreset) {
                    nextPreset = nextPreset || {};
                    if (typeof nextPreset.pixelRatioMax === 'number') {
                        state.maxPixelRatio = clamp(nextPreset.pixelRatioMax, state.minPixelRatio, 2.0);
                    }
                    if (renderer && renderer.shadowMap && typeof nextPreset.shadows === 'boolean') {
                        renderer.shadowMap.enabled = nextPreset.shadows;
                    }
                    resize();
                },
                getDiagnostics: function () {
                    var info = renderer && renderer.info ? renderer.info : { memory: {}, render: {} };
                    return {
                        ok: state.ok,
                        mode: state.mode,
                        webglActive: state.mode === 'webgl' && !state.contextLost,
                        contextLost: state.contextLost,
                        width: state.width,
                        height: state.height,
                        pixelRatio: state.pixelRatio,
                        gpuRenderer: state.gpuRenderer,
                        reason: state.reason,
                        geometries: (info.memory && info.memory.geometries) || 0,
                        textures: (info.memory && info.memory.textures) || 0,
                        drawCalls: (info.render && info.render.calls) || 0,
                        triangles: (info.render && info.render.triangles) || 0
                    };
                },
                dispose: function () {
                    state.disposed = true;
                    if (resizeRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(resizeRaf);
                    if (resizeObserver) { try { resizeObserver.disconnect(); } catch (_) {} }
                    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
                        window.removeEventListener('resize', scheduleResize);
                        window.removeEventListener('fourweird-resize', scheduleResize);
                        window.removeEventListener('fourweird-fullscreen', scheduleResize);
                    }
                    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
                        document.removeEventListener('fullscreenchange', scheduleResize);
                    }
                    if (canvas && typeof canvas.removeEventListener === 'function') {
                        canvas.removeEventListener('webglcontextlost', onContextLost);
                        canvas.removeEventListener('webglcontextrestored', onContextRestored);
                    }
                    if (renderer && typeof renderer.dispose === 'function') {
                        try { renderer.dispose(); } catch (_) {}
                    }
                }
            };
        }
    };

    renderNs.ThreeLoader = ThreeLoader;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ThreeLoader;
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
