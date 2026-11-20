(function () {
    'use strict';
    if (window.GG4D_Touch) return;

    // GraveGain4D touch controls — coarse-pointer only.
    // Left virtual stick = move (x: strafe, y: forward), right buttons:
    // putt / ana / kata / jump / rewind. Pointer Events + touch-action:none
    // + preventDefault so the page never scrolls mid-game. No mouse-only
    // listeners, no fullscreen/dblclick code. Never throws.

    function isCoarse() {
        try {
            return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
                (navigator && navigator.maxTouchPoints > 0);
        } catch (e) { return false; }
    }

    function Touch4D(opts) {
        opts = opts || {};
        this.onButton = typeof opts.onButton === 'function' ? opts.onButton : null;
        this.onMove = typeof opts.onMove === 'function' ? opts.onMove : null;
        this.root = null;
        this.stickBase = null; this.stickKnob = null;
        this.move = { x: 0, y: 0 };
        this.wShift = 0; // -1 ana .. +1 kata, set by ana/kata buttons
        this.buttons = { putt: false, ana: false, kata: false, jump: false, rewind: false };
        this._stickId = null;
        this._padPointers = new Map();
        this._stickCx = 0; this._stickCy = 0;
        this._radius = 48;
        this._attached = false;
        this.enabled = opts.enabled !== false;
    }

    Touch4D.prototype.isTouchDevice = function () { return isCoarse(); };

    Touch4D.prototype.mount = function (container) {
        try {
            if (this.root) return this.root;
            if (!this.enabled || !isCoarse()) return null;
            var doc = (container && container.ownerDocument) || document;
            var host = container || doc.body;
            if (!host || !doc.createElement) return null;
            var root = doc.createElement('div');
            root.className = 'gg4d-touch';
            root.style.cssText = 'position:fixed;inset:0;z-index:41;pointer-events:none;' +
                'touch-action:none;-webkit-user-select:none;user-select:none';
            // --- left stick zone ---
            var zone = doc.createElement('div');
            zone.style.cssText = 'position:absolute;left:0;bottom:0;width:45%;height:55%;pointer-events:auto;touch-action:none';
            var base = doc.createElement('div');
            base.style.cssText = 'position:absolute;left:36px;bottom:36px;width:104px;height:104px;' +
                'border:2px solid rgba(255,255,255,.5);border-radius:50%;background:rgba(0,0,0,.3);touch-action:none';
            var knob = doc.createElement('div');
            knob.style.cssText = 'position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;' +
                'border-radius:50%;background:rgba(255,255,255,.55);touch-action:none';
            base.appendChild(knob);
            zone.appendChild(base);
            root.appendChild(zone);
            // --- right buttons ---
            var pad = doc.createElement('div');
            pad.style.cssText = 'position:absolute;right:12px;bottom:24px;display:grid;' +
                'grid-template-columns:repeat(2,64px);gap:10px;pointer-events:auto;touch-action:none';
            var self = this;
            ['putt', 'ana', 'kata', 'jump', 'rewind'].forEach(function (name) {
                var b = doc.createElement('button');
                b.type = 'button';
                b.textContent = name;
                b.dataset.gg4dBtn = name;
                b.style.cssText = 'width:64px;height:56px;border-radius:12px;border:1px solid #999;' +
                    'background:rgba(0,0,0,.55);color:#fff;font-size:12px;touch-action:none';
                pad.appendChild(b);
            });
            root.appendChild(pad);
            host.appendChild(root);
            this.root = root;
            this.stickBase = base; this.stickKnob = knob;
            this._zone = zone; this._pad = pad;
            this._bind();
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
            buttons: {
                putt: !!this.buttons.putt, ana: !!this.buttons.ana,
                kata: !!this.buttons.kata, jump: !!this.buttons.jump,
                rewind: !!this.buttons.rewind
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
            if (this.root && this._onTouchMove) this.root.removeEventListener('touchmove', this._onTouchMove);
            if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
        } catch (e) { /* ignore */ }
        this.root = null; this._attached = false;
        this.move = { x: 0, y: 0 }; this.wShift = 0;
    };

    try { window.GG4D_Touch = Touch4D; } catch (e) { /* ignore */ }
})();
