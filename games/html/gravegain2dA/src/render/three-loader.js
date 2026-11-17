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
                        renderer.toneMappingExposure = 1.15;
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

            if (state.mode === 'fallback') {
                paintFallbackBanner(container, state.reason);
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

                if (state.mode === 'webgl' && renderer) {
                    renderer.setPixelRatio(state.pixelRatio);
                    // CRITICAL: updateStyle = false so #fourweird-game-stage 100% flex CSS stays intact
                    renderer.setSize(dims.w, dims.h, false);
                } else {
                    var fb = typeof document !== 'undefined' ? document.getElementById('fallback2dCanvas') : null;
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
                if (bus) bus.emit('render:context-lost');
            };
            var onContextRestored = function () {
                state.contextLost = false;
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
