Object.defineProperties(Game.prototype, Object.getOwnPropertyDescriptors({
setupInput() {
        window.addEventListener('keydown', (e) => {
            if (e.repeat || e.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
            if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
            if ((e.key.toLowerCase() === 'p' || e.key === 'Escape') && (this.state === STATE.PLAYING || this.state === STATE.PAUSED)) {
                this.togglePause();
                return;
            }
            if (this.state !== STATE.PLAYING && this.state !== STATE.UPGRADE) return;
            this.keys[e.key.toLowerCase()] = true;
            if (e.key === ' ' && this.state === STATE.PLAYING && this.player.hasBlink && this.blinkCooldown <= 0) this.blink();
            if (e.key.toLowerCase() === 's' && this.state === STATE.PLAYING) this.summonSkeleton();
            if (this.state === STATE.UPGRADE && this.activeUpgradeOptions.length > 0) {
                const n = parseInt(e.key);
                if (n >= 1 && n <= this.activeUpgradeOptions.length) {
                    this.applyUpgrade(this.activeUpgradeOptions[n - 1].id);
                }
            }
        });
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        window.addEventListener('blur', () => { this.keys = {}; this.mouse.down = false; });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { this.keys = {}; this.mouse.down = false; if (this.state === STATE.PLAYING) this.pause(); }
        });
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scale = canvas.width / rect.width;
            this.mouse.x = (e.clientX - rect.left) * scale;
            this.mouse.y = (e.clientY - rect.top) * scale;
        });
        canvas.addEventListener('mousedown', () => {
            this.mouse.down = true;
            if (this.state === STATE.PLAYING) this.castSpell();
        });
        canvas.addEventListener('mouseup', () => this.mouse.down = false);
        // Mobile scheme: left-half drag = virtual joystick move, right-half tap = aim+cast.
        this.joy = { active: false, id: null, dx: 0, dy: 0 };
        this.setupMobileControls();
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            initAudio();
            this.hideSwipeHint();
            const rect = canvas.getBoundingClientRect();
            for (const t of e.changedTouches) {
                const cx = (t.clientX - rect.left) / rect.width; // 0..1 across canvas
                if (cx < 0.45) {
                    // Left thumb: joystick — do NOT cast.
                    this.joy.active = true;
                    this.joy.id = t.identifier;
                    this.joy.cx = t.clientX; this.joy.cy = t.clientY;
                    this.joy.dx = 0; this.joy.dy = 0;
                    this.renderStick(t.clientX, t.clientY, 0, 0);
                } else {
                    // Right side: aim + cast once per tap.
                    const scale = canvas.width / rect.width;
                    this.mouse.x = (t.clientX - rect.left) * scale;
                    this.mouse.y = (t.clientY - rect.top) * scale;
                    if (this.state === STATE.PLAYING) this.castSpell();
                    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (_) {} }
                }
            }
        }, { passive: false });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const scale = canvas.width / rect.width;
            for (const t of e.changedTouches) {
                if (this.joy.active && t.identifier === this.joy.id) {
                    const R = 48;
                    let dx = t.clientX - this.joy.cx, dy = t.clientY - this.joy.cy;
                    const len = Math.hypot(dx, dy) || 1;
                    const cl = Math.min(len, R);
                    dx = dx / len * cl; dy = dy / len * cl;
                    this.joy.dx = dx / R; this.joy.dy = dy / R;
                    this.renderStick(this.joy.cx, this.joy.cy, dx, dy);
                } else {
                    // Sliding aim finger re-aims without auto-casting.
                    const cx = (t.clientX - rect.left) / rect.width;
                    if (cx >= 0.45) {
                        this.mouse.x = (t.clientX - rect.left) * scale;
                        this.mouse.y = (t.clientY - rect.top) * scale;
                    }
                }
            }
        }, { passive: false });
        const endTouch = (e) => {
            e.preventDefault();
            for (const t of e.changedTouches) {
                if (this.joy.active && t.identifier === this.joy.id) {
                    this.joy.active = false; this.joy.id = null;
                    this.joy.dx = 0; this.joy.dy = 0;
                    this.renderStick(null);
                }
            }
            this.mouse.down = false;
        };
        canvas.addEventListener('touchend', endTouch, { passive: false });
        canvas.addEventListener('touchcancel', endTouch, { passive: false });

        const tryInitAudio = () => initAudio();
        window.addEventListener('pointerdown', tryInitAudio, { once: true });
        window.addEventListener('keydown', tryInitAudio, { once: true });
    },

setupMobileControls() {
        const bind = (id, fn) => {
            const el = document.getElementById(id);
            if (!el || el.dataset.dlBound) return;
            el.dataset.dlBound = '1';
            const h = (e) => {
                if (e) { e.preventDefault(); e.stopPropagation(); }
                initAudio();
                fn();
                if (navigator.vibrate) { try { navigator.vibrate(10); } catch (_) {} }
            };
            el.addEventListener('touchstart', h, { passive: false });
            el.addEventListener('click', h);
        };
        bind('btnCastMobile', () => { if (this.state === STATE.PLAYING) this.castSpell(); });
        bind('btnSummonMobile', () => { if (this.state === STATE.PLAYING) this.summonSkeleton(); });
        bind('btnBlinkMobile', () => { if (this.state === STATE.PLAYING && this.player.hasBlink && this.blinkCooldown <= 0) this.blink(); });
        bind('btnPauseMobile', () => this.togglePause());
        bind('dl-pause-btn', () => this.togglePause());
        // Swipe dots + swipe-to-choose on court cards track.
        const track = document.getElementById('upgradeOptions');
        const dots = document.getElementById('dl-swipe-dots');
        if (track && !track.dataset.dlSwipe) {
            track.dataset.dlSwipe = '1';
            const paint = () => {
                if (!dots) return;
                const cards = track.querySelectorAll('.upgrade-card');
                dots.innerHTML = '';
                cards.forEach((_, i) => {
                    const d = document.createElement('i');
                    const mid = track.scrollLeft + track.clientWidth / 2;
                    const cw = track.scrollWidth / Math.max(1, cards.length);
                    if (Math.floor(mid / Math.max(1, cw)) === i) d.className = 'on';
                    dots.appendChild(d);
                });
            };
            track.addEventListener('scroll', paint, { passive: true });
            this._paintDots = paint;
            // Horizontal swipe velocity hint: fling snaps via CSS scroll-snap.
            let sx = 0;
            track.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
            track.addEventListener('touchend', (e) => {
                const dx = e.changedTouches[0].clientX - sx;
                if (Math.abs(dx) > 60) track.scrollBy({ left: dx < 0 ? 200 : -200, behavior: 'smooth' });
            }, { passive: true });
        }
        // Hide hint after first successful move.
        this._hintHidden = false;
        setTimeout(() => this.hideSwipeHint(), 9000);
        // Prevent double-tap zoom / pull-refresh on the playfield.
        document.addEventListener('dblclick', (e) => {
            if (e.target && e.target.closest && e.target.closest('.game-container')) e.preventDefault();
        }, { passive: false });
        document.addEventListener('gesturestart', (e) => e.preventDefault());
    },

renderStick(cx, cy, dx, dy) {
        const zone = document.getElementById('dl-stick-zone');
        const nub = document.getElementById('dl-stick-nub');
        if (!zone || !nub) return;
        if (cx == null) { nub.style.transform = 'translate(-50%, -50%)'; return; }
        nub.style.transform = `translate(calc(-50% + ${dx || 0}px), calc(-50% + ${dy || 0}px))`;
    },

hideSwipeHint() {
        if (this._hintHidden) return;
        this._hintHidden = true;
        const h = document.getElementById('dl-swipe-hint');
        if (h) h.style.display = 'none';
    }
}));
