Object.defineProperty(FriendSlop.prototype, "initPlayers", { configurable: true, writable: true, value: function initPlayers() {
        this.players = [];
        if (this.isCoop) {
            this.players.push(new Player(canvas.width / 3 - 20, canvas.height - 80, '🤖', { left: ['ArrowLeft'], right: ['ArrowRight'], throw: [' '] }));
            this.players.push(new Player((canvas.width * 2) / 3 - 20, canvas.height - 80, '🦊', { left: ['a', 'A'], right: ['d', 'D'], throw: ['w', 'W', 'Shift'] }));
        } else {
            this.players.push(new Player(canvas.width / 2 - 20, canvas.height - 80, '🤖', { left: ['ArrowLeft', 'a', 'A'], right: ['ArrowRight', 'd', 'D'], throw: [' ', 'w', 'W'] }));
        }
    } });
Object.defineProperty(FriendSlop.prototype, "setupEventListeners", { configurable: true, writable: true, value: function setupEventListeners() {
        document.getElementById('friendslop-4weird-start-btn').addEventListener('click', () => this.start(false));
        const coopBtn = document.getElementById('friendslop-4weird-coop-btn');
        if (coopBtn) {
            coopBtn.addEventListener('click', () => this.start(true));
        }
        document.getElementById('friendslop-4weird-resume-btn').addEventListener('click', () => this.resume());
        document.getElementById('friendslop-4weird-restart-btn').addEventListener('click', () => this.restart());
        document.getElementById('friendslop-4weird-play-again-btn').addEventListener('click', () => this.restart());
        document.getElementById('friendslop-4weird-share-btn').addEventListener('click', () => this.shareScore());
        
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        canvas.addEventListener('click', () => this.handleClick());
        // Legacy thirds-based touch replaced by Slop-stick + tap-to-feed below.
        // Keep canvas touch for tap-to-feed (passive:false so we can prevent scroll/zoom).
        canvas.addEventListener('touchstart', (e) => this.handleTouch(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        canvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));
        this.setupMobileControls(); // Slop-stick + SLOP/YEET + tap rhythm
    } });
Object.defineProperty(FriendSlop.prototype, "setupMobileControls", { configurable: true, writable: true, value: function setupMobileControls() {
        const markTouch = () => {
            document.body.classList.add('is-touch');
            const frame = canvas.closest('.friendslop-4weird-game-frame');
            if (frame) frame.classList.add('is-touch');
        };
        window.addEventListener('touchstart', markTouch, { once: true, passive: true });
        window.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch') markTouch();
        }, { passive: true });

        const stickZone = document.getElementById('friendslop-stick-zone');
        const stickBase = document.getElementById('friendslop-stick-base');
        const stickKnob = document.getElementById('friendslop-stick-knob');
        const slopBtn = document.getElementById('friendslop-slop-btn');
        const yeetBtn = document.getElementById('friendslop-yeet-btn');
        if (!stickZone || !stickBase || !slopBtn || !yeetBtn) return;

        this.stickTouchId = null;
        this.stickCenterX = 0;
        this.stickRadius = 40;

        const setKnob = (dx) => {
            if (stickKnob) stickKnob.style.transform = `translate(${dx}px, 0px)`;
        };

        stickZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            markTouch();
            const t = e.changedTouches[0];
            const rect = stickBase.getBoundingClientRect();
            this.stickTouchId = t.identifier;
            this.stickCenterX = rect.left + rect.width / 2;
            this.stickRadius = Math.max(28, rect.width / 2 - 8);
            this.applyStick(t.clientX);
        }, { passive: false });

        stickZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const t of e.changedTouches) {
                if (t.identifier === this.stickTouchId) this.applyStick(t.clientX);
            }
        }, { passive: false });

        const releaseStick = (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === this.stickTouchId) {
                    this.stickTouchId = null;
                    this.stickX = 0;
                    setKnob(0);
                }
            }
        };
        stickZone.addEventListener('touchend', releaseStick);
        stickZone.addEventListener('touchcancel', releaseStick);

        // Pointer fallback (mouse / pen drag on the stick)
        let stickPointerDown = false;
        stickZone.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch') return;
            stickPointerDown = true;
            const rect = stickBase.getBoundingClientRect();
            this.stickCenterX = rect.left + rect.width / 2;
            this.stickRadius = Math.max(28, rect.width / 2 - 8);
            this.applyStick(e.clientX);
        });
        window.addEventListener('pointermove', (e) => {
            if (stickPointerDown && e.pointerType !== 'touch') this.applyStick(e.clientX);
        });
        window.addEventListener('pointerup', () => {
            if (stickPointerDown) {
                stickPointerDown = false;
                this.stickX = 0;
                setKnob(0);
            }
        });

        // SLOP = normal throw; YEET = 3-way spread with cooldown
        slopBtn.addEventListener('touchstart', (e) => { e.preventDefault(); markTouch(); this.pressSlop(); }, { passive: false });
        yeetBtn.addEventListener('touchstart', (e) => { e.preventDefault(); markTouch(); this.pressYeet(); }, { passive: false });
        slopBtn.addEventListener('click', (e) => { e.preventDefault(); this.pressSlop(); });
        yeetBtn.addEventListener('click', (e) => { e.preventDefault(); this.pressYeet(); });
    } });

function initAudio() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
        if (!audioCtx) audioCtx = new Audio();
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    } catch {
        // Audio is optional for gameplay.
    }
}
