/**
 * Semester Survival - Controls Handler
 * Unique scheme: "Swipe-to-sprint campus + tap exam dodge"
 *  - Swipe Left/Right: lane switching (sprint across campus)
 *  - Swipe Up / tap TOP half / Jump btn / GPA btn: jump (exam dodge)
 *  - Swipe Down / tap BOTTOM half / Slide btn: slide (deadline dodge)
 *  - Big Pause button: pause (touch-friendly 56px+ target)
 */
(function() {
    'use strict';

    class InputManager {
        constructor() {
            this.keys = {};
            this.swipeStartX = 0;
            this.swipeStartY = 0;
            this.swipeStartT = 0;
            this.swipeThreshold = 24; // px — low for fast runner response
            this.tapMaxDist = 24;     // px — movement below this = tap
            this.tapMaxTime = 300;    // ms — touch shorter than this = tap
            this.swipeFired = false;
            this.onAction = null; // Callback: 'left','right','jump','slide','pause'
            this.active = false;
            this.lastTapAt = 0;
        }

        init(actionCallback) {
            this.onAction = actionCallback;
            this.setupKeyboard();
            this.setupTouch();
            this.active = true;
        }

        setupKeyboard() {
            document.addEventListener('keydown', (e) => {
                if (!this.active) return;

                // Prevent scrolling for navigation keys
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                    e.preventDefault();
                }

                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    this.triggerAction('left');
                } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    this.triggerAction('right');
                } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
                    this.triggerAction('jump');
                } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                    this.triggerAction('slide');
                } else if (e.code === 'KeyP' || e.code === 'Escape') {
                    this.triggerAction('pause');
                }
            });
        }

        isCoarsePointer() {
            try {
                return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
            } catch (e) { return false; }
        }

        setupTouch() {
            // Bind swipe+tap to the whole game frame (not just canvas — canvas
            // can be behind HUD/overlays, and fingers land on HUD too).
            var frame = document.querySelector('.TEMPLATE-4weird-game-frame') || document.body;
            var canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');

            // Kill double-tap zoom / scroll / callout on the play surface.
            [frame, canvas].forEach(function (el) {
                if (!el || !el.style) return;
                el.style.touchAction = 'none';
                el.style.webkitUserSelect = 'none';
                el.style.userSelect = 'none';
                el.style.webkitTapHighlightColor = 'transparent';
            });

            var self = this;

            function touchPos(t) { return { x: t.clientX, y: t.clientY }; }

            function onStart(e) {
                if (!self.active) return;
                // Ignore touches that begin on real buttons/overlays/menus.
                var t = e.target;
                if (t && t.closest && t.closest('button, input, select, textarea, a, .TEMPLATE-4weird-game-overlay')) return;
                if (e.touches.length !== 1) return; // single-finger runner scheme
                var p = touchPos(e.touches[0]);
                self.swipeStartX = p.x;
                self.swipeStartY = p.y;
                self.swipeStartT = performance.now();
                self.swipeFired = false;
            }

            function onMove(e) {
                if (!self.active || self.swipeFired) return;
                if (e.touches.length !== 1) return;
                var t = e.target;
                if (t && t.closest && t.closest('button, input, select, textarea, a, .TEMPLATE-4weird-game-overlay')) return;
                // Live swipe: fire as soon as threshold crossed (no waiting for touchend).
                var p = touchPos(e.touches[0]);
                var dx = p.x - self.swipeStartX;
                var dy = p.y - self.swipeStartY;
                if (Math.abs(dx) < self.swipeThreshold && Math.abs(dy) < self.swipeThreshold) return;
                if (typeof e.cancelable !== 'undefined' && e.cancelable) { try { e.preventDefault(); } catch (_) {} }
                if (Math.abs(dx) > Math.abs(dy)) {
                    self.triggerAction(dx > 0 ? 'right' : 'left');
                } else {
                    self.triggerAction(dy > 0 ? 'slide' : 'jump');
                }
                self.swipeFired = true;
            }

            function onEnd(e) {
                if (!self.active) return;
                var t = e.changedTouches && e.changedTouches[0];
                if (!t) return;
                var origTarget = e.target;
                if (origTarget && origTarget.closest && origTarget.closest('button, input, select, textarea, a, .TEMPLATE-4weird-game-overlay')) return;
                var dt = performance.now() - self.swipeStartT;
                var dx = t.clientX - self.swipeStartX;
                var dy = t.clientY - self.swipeStartY;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (!self.swipeFired) {
                    if (dist <= self.tapMaxDist && dt <= self.tapMaxTime) {
                        // TAP HALVES (exam dodge): top half = jump, bottom half = slide.
                        if (typeof e.cancelable !== 'undefined' && e.cancelable) { try { e.preventDefault(); } catch (_) {} }
                        var rect = frame.getBoundingClientRect();
                        var relY = (t.clientY - rect.top) / Math.max(1, rect.height);
                        self.triggerAction(relY < 0.5 ? 'jump' : 'slide');
                    } else if (dist > self.swipeThreshold) {
                        // Slow swipe that never crossed threshold mid-move: resolve on release.
                        if (Math.abs(dx) > Math.abs(dy)) {
                            self.triggerAction(dx > 0 ? 'right' : 'left');
                        } else {
                            self.triggerAction(dy > 0 ? 'slide' : 'jump');
                        }
                    }
                }
                self.swipeFired = false;
            }

            // Non-passive so preventDefault() actually stops scroll/zoom.
            frame.addEventListener('touchstart', onStart, { passive: true });
            frame.addEventListener('touchmove', onMove, { passive: false });
            frame.addEventListener('touchend', onEnd, { passive: false });
            frame.addEventListener('touchcancel', function () { self.swipeFired = false; }, { passive: true });

            // Tap halves visual zones (also clickable via mouse for desktop testing).
            this.bindPress('tap-half-jump', 'jump');
            this.bindPress('tap-half-slide', 'slide');

            // Onscreen Virtual Buttons — touchstart for zero-latency response.
            this.bindPress('btn-left', 'left');
            this.bindPress('btn-right', 'right');
            this.bindPress('btn-jump', 'jump');
            this.bindPress('btn-slide', 'slide');

            // Big Pause + GPA buttons.
            this.bindPress('btn-mobile-pause', 'pause');
            this.bindPress('btn-mobile-gpa', 'jump');
        }

        // Press binding: touchstart (mobile, instant) + click (mouse/desktop),
        // guarded against double-fire from emulated clicks.
        bindPress(id, action) {
            var el = document.getElementById(id);
            if (!el) return;
            var self = this;
            el.addEventListener('touchstart', function (e) {
                if (typeof e.cancelable !== 'undefined' && e.cancelable) { try { e.preventDefault(); } catch (_) {} }
                try { e.stopPropagation(); } catch (_) {}
                self.lastTapAt = performance.now();
                self.triggerAction(action);
            }, { passive: false });
            el.addEventListener('click', function (e) {
                // Skip emulated click right after a touchstart already fired.
                if (performance.now() - self.lastTapAt < 500) { try { e.preventDefault(); } catch (_) {} return; }
                self.triggerAction(action);
            });
        }

        triggerAction(action) {
            if (this.onAction && this.active) {
                // Light haptic tick on supported phones.
                try {
                    if (navigator.vibrate && (action === 'jump' || action === 'slide' || action === 'left' || action === 'right')) {
                        navigator.vibrate(8);
                    }
                } catch (e) {}
                this.onAction(action);
            }
        }

        enable() {
            this.active = true;
        }

        disable() {
            this.active = false;
        }
    }

    // Expose input manager globally
    window.ControlsInput = new InputManager();
})();
