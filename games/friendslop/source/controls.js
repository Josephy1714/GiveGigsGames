Object.defineProperty(FriendSlop.prototype, "handleKeyDown", { configurable: true, writable: true, value: function handleKeyDown(e) {
        if (e.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            if (e.repeat) return;
            this.togglePause();
            return;
        }
        if (this.state === GAME_STATE.PLAYING) {
            for (let player of this.players) {
                if (player.controls.left.includes(e.key)) player.moveLeft = true;
                if (player.controls.right.includes(e.key)) player.moveRight = true;
                if (player.controls.throw.includes(e.key)) {
                    if (e.key === ' ') e.preventDefault();
                    player.throw();
                }
            }
        }
    } });
Object.defineProperty(FriendSlop.prototype, "handleKeyUp", { configurable: true, writable: true, value: function handleKeyUp(e) {
        if (this.state === GAME_STATE.PLAYING) {
            for (let player of this.players) {
                if (player.controls.left.includes(e.key)) player.moveLeft = false;
                if (player.controls.right.includes(e.key)) player.moveRight = false;
            }
        }
    } });
Object.defineProperty(FriendSlop.prototype, "handleClick", { configurable: true, writable: true, value: function handleClick() {
        if (this.state === GAME_STATE.PLAYING) {
            const p1 = this.players[0];
            if (p1) p1.throw();
        }
    } });
Object.defineProperty(FriendSlop.prototype, "handleTouch", { configurable: true, writable: true, value: function handleTouch(e) {
        e.preventDefault();
        document.body.classList.add('is-touch');
        if (this.state !== GAME_STATE.PLAYING) return;
        // Ignore touches that began on the Slop-stick / buttons (they have own handlers)
        const t = e.changedTouches[0];
        if (t && t.target && t.target.closest &&
            t.target.closest('.friendslop-touch-ui, .friendslop-touch-btn, .friendslop-stick-zone')) {
            return;
        }
        for (const touch of e.changedTouches) {
            // Tap-to-feed first; empty tap = SLOP throw (with rhythm shake)
            if (!this.tapFeedAt(touch.clientX, touch.clientY)) {
                this.registerTapRhythm();
                const p1 = this.players[0];
                if (p1) p1.throw(this.stickX * 3);
            }
        }
    } });
Object.defineProperty(FriendSlop.prototype, "handleTouchEnd", { configurable: true, writable: true, value: function handleTouchEnd(e) {
        // Movement keys are owned by keyboard + Slop-stick; canvas lift = no-op.
        // (Stick release is handled in setupMobileControls.)
    } });
