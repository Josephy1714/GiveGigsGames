(function () {
    'use strict';
    if (window.GG4D_Touch) {
        try {
            if (window.GG4D_Touch.MOBILE_SCHEME === 'swipe-rotate-4d+phase-thumbs') return;
        } catch (e) { /* fall through: upgrade legacy build */ }
    }

    // GraveGain4D mobile scheme: "Swipe-to-rotate 4D + phase thumb keys".
    //   - Left thumb: virtual joystick -> move (x strafe, y forward).
    //   - Right thumb: ANA ◀ / KATA ▶ phase keys + ATK / PUTT / JUMP.
    //   - Canvas swipe: 1-finger drag = yaw/pitch look; 2-finger drag =
    //     XW/ZW 4D-plane rotation; quick tap = tap-to-attack tesseract foe.
    // Pointer Events + touch-action:none + preventDefault so the page never
    // scrolls mid-game. Coarse-pointer only unless settings force it on.
    // Never throws.

    var SCHEME = 'swipe-rotate-4d+phase-thumbs';
    var TAP_MAX_MS = 260;
    var TAP_MAX_PX = 14;
    var SWIPE_LOOK = 0.0042;   // rad per px, 1-finger
    var SWIPE_4D = 0.0035;     // rad per px, 2-finger (XW/ZW planes)

    function isCoarse() {
        try {
            return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
                (navigator && navigator.maxTouchPoints > 0);
        } catch (e) { return false; }
    }

    function touchModeSetting() {
        try {
            var el = document.getElementById('settingsTouchMode');
            return el ? String(el.value || 'auto') : 'auto';
        } catch (e) { return 'auto'; }
    }

    function shouldEnable(forceOpt) {
        if (forceOpt === true) return true;
        if (forceOpt === false) return false;
        var mode = touchModeSetting();
        if (mode === 'always') return true;
        if (mode === 'never') return false;
        if (isCoarse()) return true;
        try {
            if (window.matchMedia && window.matchMedia('(max-width: 820px)').matches) return true;
        } catch (e) { /* ignore */ }
        return false;
    }

    function Touch4D(opts) {
        opts = opts || {};
        this.onButton = typeof opts.onButton === 'function' ? opts.onButton : null;
        this.onMove = typeof opts.onMove === 'function' ? opts.onMove : null;
        this.onRotate = typeof opts.onRotate === 'function' ? opts.onRotate : null;
        this.onTap = typeof opts.onTap === 'function' ? opts.onTap : null;
        this.force = opts.force; // true/false/undefined -> settings/auto
        this.root = null;
        this.stickBase = null; this.stickKnob = null;
        this.move = { x: 0, y: 0 };
        this.wShift = 0;
        this.rot4d = { xw: 0, zw: 0 }; // accumulated XW/ZW plane angles (rad)
        this.buttons = { putt: false, ana: false, kata: false, jump: false, rewind: false, atk: false };
        this._stickId = null;
        this._padPointers = new Map();
        this._stickCx = 0; this._stickCy = 0;
        this._radius = 48;
        this._attached = false;
        this._swipe = {}; // pointerId -> {x,y,t,moved}
        this._pinch = null; // {d, idA, idB}
        this.enabled = opts.enabled !== false;
    }

    Touch4D.prototype.isTouchDevice = function () { return isCoarse(); };
    Touch4D.prototype.scheme = function () { return SCHEME; };

    function mkBtn(doc, name, label, extraCss) {
        var b = doc.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.dataset.gg4dBtn = name;
        b.setAttribute('aria-label', label);
        b.style.cssText = 'min-width:64px;min-height:56px;border-radius:14px;border:1px solid rgba(255,255,255,.45);' +
            'background:rgba(8,6,18,.62);color:#fff;font-size:13px;font-weight:700;touch-action:none;' +
            '-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;' + (extraCss || '');
        return b;
    }

    Touch4D.prototype.mount = function (container) {
        try {
            if (this.root) return this.root;
            if (!this.enabled || !shouldEnable(this.force)) return null;
            var doc = (container && container.ownerDocument) || document;
            var host = container || doc.body;
            if (!host || !doc.createElement) return null;
            try { doc.body.classList.add('touch-enabled', 'gg4d-mobile'); } catch (e) { /* ignore */ }
            var root = doc.createElement('div');
            root.className = 'gg4d-touch';
            root.setAttribute('data-scheme', SCHEME);
            root.style.cssText = 'position:fixed;inset:0;z-index:41;pointer-events:none;' +
                'touch-action:none;-webkit-user-select:none;user-select:none;overscroll-behavior:none';
            // --- left stick zone ---
            var zone = doc.createElement('div');
            zone.className = 'gg4d-stick-zone';
            zone.style.cssText = 'position:absolute;left:0;bottom:0;width:42%;height:52%;pointer-events:auto;touch-action:none';
            var base = doc.createElement('div');
            base.className = 'gg4d-stick-base';
            base.style.cssText = 'position:absolute;left:max(20px, env(safe-area-inset-left));bottom:max(24px, env(safe-area-inset-bottom));' +
                'width:112px;height:112px;border:2px solid rgba(103,232,249,.65);border-radius:50%;background:rgba(0,0,0,.35);touch-action:none';
            var knob = doc.createElement('div');
            knob.className = 'gg4d-stick-knob';
            knob.style.cssText = 'position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px 0 0 -24px;' +
                'border-radius:50%;background:rgba(103,232,249,.55);border:1px solid rgba(255,255,255,.6);touch-action:none';
            base.appendChild(knob);
            zone.appendChild(base);
            root.appendChild(zone);
            // --- right thumb cluster: phase keys + actions ---
            var pad = doc.createElement('div');
            pad.className = 'gg4d-thumb-pad';
            pad.style.cssText = 'position:absolute;right:max(10px, env(safe-area-inset-right));bottom:max(20px, env(safe-area-inset-bottom));' +
                'display:grid;grid-template-columns:repeat(2,72px);gap:10px;pointer-events:auto;touch-action:none';
            var ana = mkBtn(doc, 'ana', '◀ ANA', 'border-color:rgba(103,232,249,.7);');
            var kata = mkBtn(doc, 'kata', 'KATA ▶', 'border-color:rgba(192,132,252,.7);');
            var atk = mkBtn(doc, 'atk', '⚔ ATK', 'background:rgba(120,20,40,.6);');
            var putt = mkBtn(doc, 'putt', '⛳ PUTT', 'background:rgba(20,90,50,.55);');
            var jump = mkBtn(doc, 'jump', '▲ JUMP', '');
            var rewind = mkBtn(doc, 'rewind', '⏪ TIME', '');
            [ana, kata, atk, putt, jump, rewind].forEach(function (b) { pad.appendChild(b); });
            root.appendChild(pad);
            // --- swipe hint chip (fades after first swipe) ---
            var hint = doc.createElement('div');
            hint.className = 'gg4d-swipe-hint';
            hint.textContent = 'Swipe canvas: look · 2-finger: twist 4D · Tap foe: attack';
            hint.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);pointer-events:none;' +
                'background:rgba(0,0,0,.55);border:1px solid rgba(103,232,249,.5);color:#fff;font-size:11px;' +
                'border-radius:999px;padding:6px 12px;white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis';
            root.appendChild(hint);
            this._hint = hint;
            host.appendChild(root);
            this.root = root;
            this.stickBase = base; this.stickKnob = knob;
            this._zone = zone; this._pad = pad;
            this._bindSwipe(host);
            this._bind();
            try {
                if (window.GG4D_MOBILE_PERF === undefined) {
                    window.GG4D_MOBILE_PERF = { pixelRatioCap: 1.5, fxCap: 12, scheme: SCHEME };
                }
            } catch (e) { /* ignore */ }
            return root;
        } catch (e) { return null; }
    };

    Touch4D.prototype._setKnob = function (dx, dy) {
        try {
            this.stickKnob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        } catch (e) { /* ignore */ }
    };

    Touch4D.prototype._emitButton = function (name, down) {
        try {
            if (this.buttons[name] === !!down) return;
            this.buttons[name] = !!down;
            if (name === 'ana' && down) this.wShift = -1;
            else if (name === 'kata' && down) this.wShift = 1;
            else if ((name === 'ana' || name === 'kata') && !down) {
                this.wShift = this.buttons.ana ? -1 : (this.buttons.kata ? 1 : 0);
            }
            if (this.onButton) this.onButton(name, !!down, this.snapshot());
        } catch (e) { /* ignore */ }
    };

    Touch4D.prototype._emitRotate = function (dYaw, dPitch, dXW, dZW) {
        try {
            if (dXW) this.rot4d.xw += dXW;
            if (dZW) this.rot4d.zw += dZW;
            if (this._hint && this._hint.parentNode) {
                try { this._hint.parentNode.removeChild(this._hint); } catch (e) { /* ignore */ }
                this._hint = null;
            }
            if (this.onRotate) this.onRotate({ dYaw: dYaw || 0, dPitch: dPitch || 0, dXW: dXW || 0, dZW: dZW || 0, rot4d: { xw: this.rot4d.xw, zw: this.rot4d.zw } });
        } catch (e) { /* ignore */ }
    };

    Touch4D.prototype._emitTap = function (x, y) {
        try {
            if (this.onTap) this.onTap({ x: x, y: y });
        } catch (e) { /* ignore */ }
    };

    // Canvas swipe + tap layer: attaches to the game viewport so drags
    // rotate the 4D view instead of scrolling the page. One finger =
    // yaw/pitch, two fingers = XW/ZW 4D twist, quick tap = attack.
    Touch4D.prototype._bindSwipe = function (host) {
        try {
            var self = this;
            var view = null;
            try { view = (host && host.querySelector) ? (host.querySelector('#canvasContainer') || host.querySelector('#gameCanvas')) : null; } catch (e) { view = null; }
            if (!view) { try { view = document.getElementById('canvasContainer') || document.getElementById('gameCanvas'); } catch (e) { /* ignore */ } }
            if (!view) view = this.root;
            this._view = view;
            this._onSwipeDown = function (ev) {
                try {
                    if (ev.pointerType === 'mouse') return;
                    if (ev.button !== 0 || ev.target.closest?.('.gg4d-thumb-pad, .gg4d-stick-zone, button, a, input, select, textarea')) return;
                    var id = ev.pointerId;
                    try { view.setPointerCapture(id); } catch (e) { /* Synthetic input may not support capture. */ }
                    self._swipe[id] = { x: ev.clientX, y: ev.clientY, t: Date.now(), moved: 0 };
                    var ids = Object.keys(self._swipe);
                    if (ids.length >= 2) ids.forEach(function (id) { self._swipe[id].multi = true; });
                    if (ids.length === 2) {
                        var a = self._swipe[ids[0]], b = self._swipe[ids[1]];
                        self._pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), ids: ids };
                    }
                    if (ev.cancelable && ev.target !== self._pad) ev.preventDefault();
                } catch (e) { /* ignore */ }
            };
            this._onSwipeMove = function (ev) {
                try {
                    if (ev.pointerType === 'mouse') return;
                    var s = self._swipe[ev.pointerId];
                    if (!s) return;
                    var dx = ev.clientX - s.x, dy = ev.clientY - s.y;
                    s.moved += Math.abs(dx) + Math.abs(dy);
                    var ids = Object.keys(self._swipe);
                    if (ids.length >= 2 && self._pinch) {
                        // Two-finger: horizontal twist -> XW plane, vertical -> ZW.
                        self._emitRotate(0, 0, dx * SWIPE_4D, dy * SWIPE_4D);
                    } else if (ids.length === 1) {
                        self._emitRotate(dx * SWIPE_LOOK, dy * SWIPE_LOOK, 0, 0);
                    }
                    s.x = ev.clientX; s.y = ev.clientY;
                    if (ev.cancelable) ev.preventDefault();
                } catch (e) { /* ignore */ }
            };
            this._onSwipeUp = function (ev) {
                try {
                    if (ev.pointerType === 'mouse') return;
                    var s = self._swipe[ev.pointerId];
                    if (!s) return;
                    var dt = Date.now() - s.t;
                    if (ev.type === 'pointerup' && !s.multi && dt <= TAP_MAX_MS && s.moved <= TAP_MAX_PX) {
                        // Tap (not on stick/buttons): attack the tapped foe.
                        var onPad = false, onStick = false;
                        try {
                            if (ev.target && ev.target.closest) {
                                onPad = !!ev.target.closest('.gg4d-thumb-pad');
                                onStick = !!ev.target.closest('.gg4d-stick-zone');
                            }
                        } catch (e) { /* ignore */ }
                        if (!onPad && !onStick) self._emitTap(ev.clientX, ev.clientY);
                    }
                    delete self._swipe[ev.pointerId];
                    if (Object.keys(self._swipe).length < 2) self._pinch = null;
                    if (ev.cancelable) ev.preventDefault();
                } catch (e) { /* ignore */ }
            };
            view.addEventListener('pointerdown', this._onSwipeDown, { passive: false });
            view.addEventListener('pointermove', this._onSwipeMove, { passive: false });
            view.addEventListener('pointerup', this._onSwipeUp, { passive: false });
            view.addEventListener('pointercancel', this._onSwipeUp, { passive: false });
            view.addEventListener('lostpointercapture', this._onSwipeUp);
        } catch (e) { /* ignore */ }
    };

    Touch4D.prototype._bind = function () {
        try {
            if (this._attached || !this.root) return;
            this._attached = true;
            var self = this;

            this._onStickStart = function (ev) {
                try {
                    if (ev.cancelable) ev.preventDefault();
                    if (self._stickId !== null) return;
                    self._stickId = ev.pointerId;
                    var r = self.stickBase.getBoundingClientRect();
                    self._stickCx = r.left + r.width / 2;
                    self._stickCy = r.top + r.height / 2;
                    try { self._zone.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
                } catch (e) { /* ignore */ }
            };
            this._onStickMove = function (ev) {
                try {
                    if (ev.pointerId !== self._stickId) return;
                    if (ev.cancelable) ev.preventDefault();
                    var dx = ev.clientX - self._stickCx, dy = ev.clientY - self._stickCy;
                    var len = Math.sqrt(dx * dx + dy * dy) || 1;
                    var cl = Math.min(len, self._radius);
                    dx = dx / len * cl; dy = dy / len * cl;
                    self._setKnob(dx, dy);
                    self.move.x = cl > 4 ? dx / self._radius : 0;
                    self.move.y = cl > 4 ? dy / self._radius : 0;
                    if (self.onMove) self.onMove({ x: self.move.x, y: self.move.y });
                } catch (e) { /* ignore */ }
            };
            this._onStickEnd = function (ev) {
                try {
                    if (ev.pointerId !== self._stickId) return;
                    if (ev.cancelable) ev.preventDefault();
                    self._stickId = null;
                    self.move.x = 0; self.move.y = 0;
                    self._setKnob(0, 0);
                    if (self.onMove) self.onMove({ x: 0, y: 0 });
                } catch (e) { /* ignore */ }
            };
            this._zone.addEventListener('pointerdown', this._onStickStart, { passive: false });
            this._zone.addEventListener('pointermove', this._onStickMove, { passive: false });
            this._zone.addEventListener('pointerup', this._onStickEnd, { passive: false });
            this._zone.addEventListener('pointercancel', this._onStickEnd, { passive: false });

            this._onBtnDown = function (ev) {
                var button = ev.target.closest?.('[data-gg4d-btn]');
                if (!button || ev.button !== 0 || self._padPointers.has(ev.pointerId)) return;
                if (ev.cancelable) ev.preventDefault();
                self._padPointers.set(ev.pointerId, button.dataset.gg4dBtn);
                try { button.setPointerCapture(ev.pointerId); } catch (e) { /* Synthetic input may not support capture. */ }
                self._emitButton(button.dataset.gg4dBtn, true);
            };
            this._onBtnUp = function (ev) {
                var name = self._padPointers.get(ev.pointerId);
                if (!name) return;
                if (ev.cancelable) ev.preventDefault();
                self._padPointers.delete(ev.pointerId);
                if (!Array.from(self._padPointers.values()).includes(name)) self._emitButton(name, false);
            };
            this._pad.addEventListener('pointerdown', this._onBtnDown, { passive: false });
            this._pad.addEventListener('pointerup', this._onBtnUp, { passive: false });
            this._pad.addEventListener('pointercancel', this._onBtnUp, { passive: false });
            this._pad.addEventListener('lostpointercapture', this._onBtnUp);
            this._zone.addEventListener('lostpointercapture', this._onStickEnd);

            this._resetInput = function () {
                if (self._stickId !== null) self._onStickEnd({ pointerId: self._stickId });
                self._padPointers.clear();
                Object.keys(self.buttons).forEach(function (name) { self._emitButton(name, false); });
                self._swipe = {};
                self._pinch = null;
            };
            this._onVisibilityChange = function () {
                if (document.hidden) self._resetInput();
            };
            window.addEventListener('blur', this._resetInput);
            document.addEventListener('visibilitychange', this._onVisibilityChange);
            this._onTouchMove = function (ev) { try { if (ev.cancelable) ev.preventDefault(); } catch (e) { /* ignore */ } };
            this.root.addEventListener('touchmove', this._onTouchMove, { passive: false });
        } catch (e) { /* ignore */ }
    };

    Touch4D.prototype.snapshot = function () {
        return {
            move: { x: this.move.x, y: this.move.y },
            wShift: this.wShift,
            rot4d: { xw: this.rot4d.xw, zw: this.rot4d.zw },
            buttons: {
                putt: !!this.buttons.putt, ana: !!this.buttons.ana,
                kata: !!this.buttons.kata, jump: !!this.buttons.jump,
                rewind: !!this.buttons.rewind, atk: !!this.buttons.atk
            }
        };
    };

    Touch4D.prototype.destroy = function () {
        try {
            if (this._resetInput) {
                this._resetInput();
                window.removeEventListener('blur', this._resetInput);
                document.removeEventListener('visibilitychange', this._onVisibilityChange);
            }
            if (this._zone && this._onStickStart) {
                this._zone.removeEventListener('pointerdown', this._onStickStart);
                this._zone.removeEventListener('pointermove', this._onStickMove);
                this._zone.removeEventListener('pointerup', this._onStickEnd);
                this._zone.removeEventListener('pointercancel', this._onStickEnd);
                this._zone.removeEventListener('lostpointercapture', this._onStickEnd);
            }
            if (this._pad) {
                if (this._onBtnDown) this._pad.removeEventListener('pointerdown', this._onBtnDown);
                if (this._onBtnUp) {
                    this._pad.removeEventListener('pointerup', this._onBtnUp);
                    this._pad.removeEventListener('pointercancel', this._onBtnUp);
                    this._pad.removeEventListener('lostpointercapture', this._onBtnUp);
                }
            }
            if (this._view) {
                try { this._view.removeEventListener('pointerdown', this._onSwipeDown); } catch (e) {}
                try { this._view.removeEventListener('pointermove', this._onSwipeMove); } catch (e) {}
                try { this._view.removeEventListener('pointerup', this._onSwipeUp); } catch (e) {}
                try { this._view.removeEventListener('pointercancel', this._onSwipeUp); } catch (e) {}
                this._view.removeEventListener('lostpointercapture', this._onSwipeUp);
            }
            if (this.root && this._onTouchMove) this.root.removeEventListener('touchmove', this._onTouchMove);
            if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
            try { if (document.body) document.body.classList.remove('touch-enabled', 'gg4d-mobile'); } catch (e) {}
        } catch (e) { /* ignore */ }
        this.root = null; this._attached = false;
        this.move = { x: 0, y: 0 }; this.wShift = 0;
        this.rot4d = { xw: 0, zw: 0 };
        this._swipe = {}; this._pinch = null;
    };

    try {
        window.GG4D_Touch = Touch4D;
        window.GG4D_Touch.MOBILE_SCHEME = SCHEME;
    } catch (e) { /* ignore */ }
})();
