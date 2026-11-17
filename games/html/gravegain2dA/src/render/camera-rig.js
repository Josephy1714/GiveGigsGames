(function (root) {
    'use strict';

    var renderNs = root.GraveGainRender = root.GraveGainRender || {};

    function clamp(v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    function createCameraRig(opts) {
        opts = opts || {};
        var THREE = root.THREE;
        var bus = opts.bus || null;
        var container = opts.container || null;

        var aspect = (opts.width || 1000) / Math.max(1, opts.height || 600);
        var camera = THREE
            ? new THREE.PerspectiveCamera(44, aspect, 0.2, 260)
            : {
                fov: 44,
                aspect: aspect,
                position: { x: 0, y: 20, z: 20, set: function (x, y, z) { this.x = x; this.y = y; this.z = z; } },
                lookAt: function () {},
                updateProjectionMatrix: function () {}
            };

        var state = {
            distance: 24,
            minDistance: 12,
            maxDistance: 46,
            yaw: Math.PI * 0.25,
            pitch: 0.85,
            minPitch: 0.45,
            maxPitch: 1.30,
            focus: { x: 80, y: 0, z: 80 },
            target: { x: 80, y: 0, z: 80 },
            leadEnabled: true,
            shakeEnabled: true,
            punchEnabled: true,
            shake: 0,
            shakeDir: { x: 1, y: 0, z: 1 },
            punch: { x: 0, y: 0, z: 0 },
            hitStopTimer: 0,
            paused: false,
            pauseMode: 'pause',
            freeCamActive: false,
            freePanKeys: {},
            middleDragging: false,
            lastMouseX: 0,
            lastMouseY: 0,
            worldMin: 0,
            worldMax: 160
        };

        var raycaster = THREE ? new THREE.Raycaster() : null;
        var tempNdc = THREE ? new THREE.Vector2() : { x: 0, y: 0 };
        var tempPlane = THREE ? new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) : null;
        var tempHit = THREE ? new THREE.Vector3() : { x: 0, y: 0, z: 0 };

        function syncCameraTransform() {
            var cosP = Math.cos(state.pitch);
            var sinP = Math.sin(state.pitch);
            var horiz = state.distance * cosP;
            var vert = state.distance * sinP;

            var shakeOffsetX = 0;
            var shakeOffsetY = 0;
            var shakeOffsetZ = 0;
            if (state.shakeEnabled && state.shake > 0.001) {
                var jitter = Math.sin((typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.08);
                shakeOffsetX = state.shake * 0.06 * jitter * (state.shakeDir.x || 0.7);
                shakeOffsetY = state.shake * 0.03 * Math.cos((typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.11);
                shakeOffsetZ = state.shake * 0.06 * jitter * (state.shakeDir.z || 0.7);
            }

            var fx = state.focus.x + state.punch.x + shakeOffsetX;
            var fy = state.focus.y + state.punch.y + shakeOffsetY;
            var fz = state.focus.z + state.punch.z + shakeOffsetZ;

            var cx = fx + Math.sin(state.yaw) * horiz;
            var cy = fy + vert;
            var cz = fz + Math.cos(state.yaw) * horiz;

            camera.position.set(cx, cy, cz);
            if (typeof camera.lookAt === 'function') {
                camera.lookAt(fx, fy + 0.8, fz);
            }
        }

        function setZoom(dist) {
            state.distance = clamp(Number(dist) || 24, state.minDistance, state.maxDistance);
            syncCameraTransform();
            return state.distance;
        }

        function zoomBy(delta) {
            return setZoom(state.distance + delta);
        }

        function setAngles(pitch, yaw) {
            if (typeof pitch === 'number' && isFinite(pitch)) {
                state.pitch = clamp(pitch, state.minPitch, state.maxPitch);
            }
            if (typeof yaw === 'number' && isFinite(yaw)) {
                state.yaw = yaw;
            }
            syncCameraTransform();
            return { pitch: state.pitch, yaw: state.yaw };
        }

        function setPaused(paused, mode) {
            state.paused = !!paused;
            state.pauseMode = mode || 'pause';
            state.freeCamActive = state.paused && (state.pauseMode === 'tactical' || state.pauseMode === 'photo');
            if (bus) {
                bus.emit('ui:set-hud-hidden', state.paused && state.pauseMode === 'photo');
            }
        }

        function applyShake(amount, dirVec3) {
            if (!state.shakeEnabled) return;
            var amt = Math.max(0, Number(amount) || 0);
            state.shake = Math.min(20, Math.max(state.shake, amt));
            if (dirVec3) {
                var len = Math.hypot(dirVec3.x || 0, dirVec3.z || 0) || 1;
                state.shakeDir.x = (dirVec3.x || 0) / len;
                state.shakeDir.z = (dirVec3.z || 0) / len;
            }
        }

        function applyPunch(vec3, force) {
            if (!state.punchEnabled || !vec3) return;
            var scale = typeof force === 'number' ? force : 0.4;
            state.punch.x = clamp(state.punch.x + (vec3.x || 0) * scale, -1.5, 1.5);
            state.punch.z = clamp(state.punch.z + (vec3.z || 0) * scale, -1.5, 1.5);
        }

        function triggerHitStop(durationSec) {
            state.hitStopTimer = Math.max(state.hitStopTimer, clamp(Number(durationSec) || 0.05, 0.01, 0.15));
        }

        function update(dt, playerPos, playerVel, keys) {
            dt = typeof dt === 'number' && dt > 0 ? dt : 0.016;

            if (state.hitStopTimer > 0) {
                state.hitStopTimer = Math.max(0, state.hitStopTimer - dt);
            }

            // Camera hotkeys (never bind Q or R so M3 weapon swap/reload stay conflict-free)
            var activeKeys = keys || state.freePanKeys;
            if (activeKeys) {
                if (activeKeys['BracketLeft']) setAngles(state.pitch, state.yaw - 1.8 * dt);
                if (activeKeys['BracketRight']) setAngles(state.pitch, state.yaw + 1.8 * dt);
                if (activeKeys['PageUp']) setAngles(state.pitch - 1.1 * dt, state.yaw);
                if (activeKeys['PageDown']) setAngles(state.pitch + 1.1 * dt, state.yaw);
                if (activeKeys['Equal']) zoomBy(-18 * dt);
                if (activeKeys['Minus']) zoomBy(18 * dt);

                if (state.freeCamActive) {
                    var panX = 0;
                    var panZ = 0;
                    if (activeKeys['KeyW'] || activeKeys['ArrowUp']) panZ -= 1;
                    if (activeKeys['KeyS'] || activeKeys['ArrowDown']) panZ += 1;
                    if (activeKeys['KeyA'] || activeKeys['ArrowLeft']) panX -= 1;
                    if (activeKeys['KeyD'] || activeKeys['ArrowRight']) panX += 1;
                    if (panX !== 0 || panZ !== 0) {
                        var cosY = Math.cos(state.yaw);
                        var sinY = Math.sin(state.yaw);
                        var worldMoveX = panX * cosY + panZ * sinY;
                        var worldMoveZ = -panX * sinY + panZ * cosY;
                        var panSpd = 26 * dt;
                        state.focus.x = clamp(state.focus.x + worldMoveX * panSpd, state.worldMin, state.worldMax);
                        state.focus.z = clamp(state.focus.z + worldMoveZ * panSpd, state.worldMin, state.worldMax);
                    }
                }
            }

            if (!state.freeCamActive && playerPos) {
                var leadX = (state.leadEnabled && playerVel) ? clamp((playerVel.x || 0) * 0.25, -2.5, 2.5) : 0;
                var leadZ = (state.leadEnabled && playerVel) ? clamp((playerVel.z || 0) * 0.25, -2.5, 2.5) : 0;
                state.target.x = (playerPos.x || 0) + leadX;
                state.target.y = playerPos.y || 0;
                state.target.z = (playerPos.z || 0) + leadZ;

                var alpha = 1 - Math.exp(-8.5 * dt);
                state.focus.x += (state.target.x - state.focus.x) * alpha;
                state.focus.y += (state.target.y - state.focus.y) * alpha;
                state.focus.z += (state.target.z - state.focus.z) * alpha;
            }

            // Decay shake and punch
            state.shake *= Math.exp(-16 * dt);
            if (state.shake < 0.01) state.shake = 0;
            var pDecay = Math.exp(-12 * dt);
            state.punch.x *= pDecay;
            state.punch.y *= pDecay;
            state.punch.z *= pDecay;

            syncCameraTransform();
        }

        function screenToGround(clientX, clientY, planeY, terrain) {
            if (!THREE || !raycaster || !container) {
                return { x: state.focus.x, y: planeY || 0, z: state.focus.z };
            }
            var rect = container.getBoundingClientRect();
            if (!rect.width || !rect.height) {
                return { x: state.focus.x, y: planeY || 0, z: state.focus.z };
            }
            tempNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            tempNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(tempNdc, camera);

            // If terrain provided, raymarch against elevated slabs first
            if (terrain && typeof terrain.raycast3D === 'function') {
                var ro = raycaster.ray.origin;
                var rd = raycaster.ray.direction;
                var hit = terrain.raycast3D({ x: ro.x, y: ro.y, z: ro.z }, { x: rd.x, y: rd.y, z: rd.z }, 120);
                if (hit && hit.hit && hit.hitType === 'terrain') {
                    return { x: hit.point.x, y: hit.point.y, z: hit.point.z };
                }
            }

            tempPlane.constant = -(typeof planeY === 'number' ? planeY : state.focus.y);
            var hitPoint = raycaster.ray.intersectPlane(tempPlane, tempHit);
            if (hitPoint) {
                return { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z };
            }
            return { x: state.focus.x, y: planeY || 0, z: state.focus.z };
        }

        // Bind DOM mouse wheel + middle drag on container if available
        var onWheel = null;
        var onMouseDown = null;
        var onMouseMove = null;
        var onMouseUp = null;
        if (container && typeof container.addEventListener === 'function') {
            onWheel = function (e) {
                if (e.target && e.target.closest && e.target.closest('.screen-overlay:not(.hidden),.mobile-drawer:not(.hidden)')) return;
                zoomBy((e.deltaY > 0 ? 1 : -1) * 2.2);
            };
            onMouseDown = function (e) {
                if (e.button === 1) {
                    e.preventDefault();
                    state.middleDragging = true;
                    state.lastMouseX = e.clientX;
                    state.lastMouseY = e.clientY;
                }
            };
            onMouseMove = function (e) {
                if (!state.middleDragging) return;
                var dx = e.clientX - state.lastMouseX;
                var dy = e.clientY - state.lastMouseY;
                state.lastMouseX = e.clientX;
                state.lastMouseY = e.clientY;
                setAngles(state.pitch + dy * 0.006, state.yaw - dx * 0.008);
            };
            onMouseUp = function (e) {
                if (e.button === 1) state.middleDragging = false;
            };
            container.addEventListener('wheel', onWheel, { passive: true });
            container.addEventListener('mousedown', onMouseDown);
            if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            }
        }

        syncCameraTransform();

        return {
            camera: camera,
            getState: function () {
                return {
                    distance: state.distance,
                    yaw: state.yaw,
                    pitch: state.pitch,
                    focus: { x: state.focus.x, y: state.focus.y, z: state.focus.z },
                    freeCamActive: state.freeCamActive,
                    hitStopActive: state.hitStopTimer > 0,
                    shake: state.shake
                };
            },
            isHitStopped: function () { return state.hitStopTimer > 0; },
            setZoom: setZoom,
            zoomBy: zoomBy,
            setAngles: setAngles,
            setPaused: setPaused,
            setFocus: function (x, y, z) {
                state.focus.x = x;
                state.focus.y = y;
                state.focus.z = z;
                syncCameraTransform();
            },
            setOptions: function (o) {
                o = o || {};
                if (typeof o.shakeEnabled === 'boolean') state.shakeEnabled = o.shakeEnabled;
                if (typeof o.leadEnabled === 'boolean') state.leadEnabled = o.leadEnabled;
                if (typeof o.punchEnabled === 'boolean') state.punchEnabled = o.punchEnabled;
                if (typeof o.worldMax === 'number') state.worldMax = o.worldMax;
            },
            applyShake: applyShake,
            applyPunch: applyPunch,
            triggerHitStop: triggerHitStop,
            update: update,
            screenToGround: screenToGround,
            dispose: function () {
                if (container && typeof container.removeEventListener === 'function') {
                    if (onWheel) container.removeEventListener('wheel', onWheel);
                    if (onMouseDown) container.removeEventListener('mousedown', onMouseDown);
                }
                if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
                    if (onMouseMove) window.removeEventListener('mousemove', onMouseMove);
                    if (onMouseUp) window.removeEventListener('mouseup', onMouseUp);
                }
            }
        };
    }

    renderNs.CameraRig = { create: createCameraRig };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = renderNs.CameraRig;
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
