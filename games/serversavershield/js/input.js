// Input Handling — scheme: "Drag-shield aim + hire thumb rail"
// Canvas: single-finger RELATIVE drag aims the shield (finger never covers the ship).
// Quick tap (<12px, <350ms) on canvas toggles firing (or buys shop item in shop zone).
// Thumb rail buttons (DOM, thumb-reachable) handle hire/upgrade taps. Two-finger
// gestures are ignored for aim so pinch never jerks the ship (pinch-safe).
var inputInitialized = false;
var keysPressed = {};
var KEYBOARD_SPEED = 8; // Movement speed for keyboard controls

// Drag-aim state
var _dragTouchId = null;
var _dragLastCX = 0;
var _dragLastCY = 0;
var _tapStartX = 0;
var _tapStartY = 0;
var _tapStartT = 0;
var _tapMoved = false;
var TAP_SLOP_PX = 12;
var TAP_MAX_MS = 350;

function _canvasToGame(gameCanvas, clientX, clientY) {
    const rect = gameCanvas.getBoundingClientRect();
    const sx = gameCanvas.width / rect.width;
    const sy = gameCanvas.height / rect.height;
    return {
        x: (clientX - rect.left) * sx,
        y: (clientY - rect.top) * sy,
        rect: rect, sx: sx, sy: sy
    };
}

function _handleTap(gameCanvas, clientX, clientY) {
    const p = _canvasToGame(gameCanvas, clientX, clientY);
    // Shop zone purchase takes priority; it returns true when consumed.
    if (typeof checkShopClick === 'function' && checkShopClick(p.x, p.y)) {
        inputX = p.x;
        inputY = p.y;
        return;
    }
    isShooting = !isShooting;
    inputX = p.x;
    inputY = p.y;
    const touchFire = document.getElementById('touchFireBtn');
    if (touchFire) touchFire.classList.toggle('active', isShooting);
}

function initInput() {
    if (inputInitialized) return; // Prevent duplicate listeners
    inputInitialized = true;

    const gameCanvas = getCanvas();

    gameCanvas.addEventListener('mousemove', (e) => {
        // Mouse hover = absolute aim (desktop unchanged). Skip while touch-dragging.
        if (_dragTouchId !== null) return;
        const p = _canvasToGame(gameCanvas, e.clientX, e.clientY);
        inputX = p.x;
        inputY = p.y;
    });

    gameCanvas.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        e.preventDefault();
        if (typeof initAudio === 'function') { try { initAudio(); } catch (_) {} }
        const p = _canvasToGame(gameCanvas, e.clientX, e.clientY);
        // Check if shop was clicked first; if so, do not toggle shooting
        if (typeof checkShopClick === 'function' && checkShopClick(p.x, p.y)) {
            inputX = p.x;
            inputY = p.y;
            return;
        }
        isShooting = true;
        if (gameCanvas.setPointerCapture && e.pointerId !== undefined) {
            try { gameCanvas.setPointerCapture(e.pointerId); } catch (_) {}
        }
    });

    const stopPointerFire = (e) => {
        if (e && e.pointerType === 'mouse') isShooting = false;
    };
    gameCanvas.addEventListener('pointerup', stopPointerFire);
    gameCanvas.addEventListener('pointercancel', stopPointerFire);
    gameCanvas.addEventListener('lostpointercapture', stopPointerFire);

    // --- Touch: relative drag-aim + tap detection (pinch-safe) ---
    gameCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (typeof initAudio === 'function') { try { initAudio(); } catch (_) {} }
        // Only the first finger aims; extra fingers (pinch) are ignored.
        if (_dragTouchId !== null) return;
        const t = e.changedTouches[0];
        _dragTouchId = t.identifier;
        _dragLastCX = t.clientX;
        _dragLastCY = t.clientY;
        _tapStartX = t.clientX;
        _tapStartY = t.clientY;
        _tapStartT = Date.now();
        _tapMoved = false;
    }, { passive: false });

    gameCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) {
            if (t.identifier !== _dragTouchId) continue;
            const dxPx = t.clientX - _dragLastCX;
            const dyPx = t.clientY - _dragLastCY;
            _dragLastCX = t.clientX;
            _dragLastCY = t.clientY;
            if (Math.hypot(t.clientX - _tapStartX, t.clientY - _tapStartY) > TAP_SLOP_PX) {
                _tapMoved = true;
            }
            if (_tapMoved) {
                // Relative drag: scale pixel delta into game units so the ship
                // follows the finger without jumping under it.
                const rect = gameCanvas.getBoundingClientRect();
                const sx = gameCanvas.width / rect.width;
                const sy = gameCanvas.height / rect.height;
                inputX += dxPx * sx;
                inputY += dyPx * sy;
            }
        }
    }, { passive: false });

    function endTouch(e) {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) {
            if (t.identifier !== _dragTouchId) continue;
            const dt = Date.now() - _tapStartT;
            const dist = Math.hypot(t.clientX - _tapStartX, t.clientY - _tapStartY);
            _dragTouchId = null;
            if (!_tapMoved && dist <= TAP_SLOP_PX && dt <= TAP_MAX_MS) {
                _handleTap(gameCanvas, t.clientX, t.clientY);
            }
        }
    }
    gameCanvas.addEventListener('touchend', endTouch, { passive: false });
    gameCanvas.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        _dragTouchId = null;
    }, { passive: false });

    // iOS Safari pinch gesture: never let it zoom/scroll mid-game on the canvas.
    gameCanvas.addEventListener('gesturestart', (e) => e.preventDefault());
    gameCanvas.addEventListener('gesturechange', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => {
        if (gameCanvas.contains(e.target)) e.preventDefault();
    }, { passive: false });

    // Keyboard controls - WASD and Arrow keys
    window.addEventListener('keydown', (e) => {
        keysPressed[e.key.toLowerCase()] = true;

        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            if (gameRunning && !gamePaused) pauseGame();
            else if (gamePaused) resumeGame();
        }

        // Spacebar to toggle shooting
        if (e.key === ' ') {
            e.preventDefault();
            isShooting = !isShooting;
        }
    });

    window.addEventListener('keyup', (e) => {
        keysPressed[e.key.toLowerCase()] = false;
        if (e.key === ' ') isShooting = false;
    });

    initThumbRail();
    initRotateAutoPause();
}

function _flashThumbBtn(btn, ok) {
    if (!btn) return;
    btn.classList.remove('thumb-ok', 'thumb-denied');
    void btn.offsetWidth; // restart animation
    btn.classList.add(ok ? 'thumb-ok' : 'thumb-denied');
    setTimeout(() => btn.classList.remove('thumb-ok', 'thumb-denied'), 450);
}

// Tap-to-hire / upgrade thumb rail: big thumb targets, instant feedback.
function initThumbRail() {
    const wire = (id, fn) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const onTap = (e) => {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            if (typeof initAudio === 'function') { try { initAudio(); } catch (_) {} }
            let ok = false;
            try { ok = fn() === true; } catch (_) { ok = false; }
            _flashThumbBtn(btn, ok);
            refreshThumbRail();
        };
        btn.addEventListener('touchstart', onTap, { passive: false });
        btn.addEventListener('click', (e) => {
            // click follows touchstart on mobile — ignore the duplicate.
            if (e.detail === 0 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) return;
            onTap(e);
        });
    };

    wire('thumbHireFirewall', () => {
        if (typeof hireStaff !== 'function') return false;
        const before = (typeof staff !== 'undefined') ? staff.length : -1;
        hireStaff('firewall');
        return (typeof staff !== 'undefined') && staff.length > before;
    });
    wire('thumbHireResponder', () => {
        if (typeof hireStaff !== 'function') return false;
        const before = (typeof staff !== 'undefined') ? staff.length : -1;
        hireStaff('responder');
        return (typeof staff !== 'undefined') && staff.length > before;
    });
    wire('thumbRepair', () => {
        if (typeof purchaseShopItem !== 'function') return false;
        const bal = (typeof gameState !== 'undefined') ? gameState.balance : 0;
        purchaseShopItem(1); // emergency_repair slot
        return (typeof gameState !== 'undefined') && gameState.balance < bal;
    });
    wire('thumbWeapon', () => {
        if (typeof purchaseShopItem !== 'function') return false;
        const bal = (typeof gameState !== 'undefined') ? gameState.balance : 0;
        purchaseShopItem(0); // weapon_upgrade slot
        return (typeof gameState !== 'undefined') && gameState.balance < bal;
    });

    const touchFire = document.getElementById('touchFireBtn');
    if (touchFire && !touchFire.dataset.wired) {
        touchFire.dataset.wired = '1';
        const toggle = (e) => {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            isShooting = !isShooting;
            touchFire.classList.toggle('active', isShooting);
        };
        touchFire.addEventListener('touchstart', toggle, { passive: false });
        touchFire.addEventListener('click', (e) => {
            if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
            toggle(e);
        });
    }

    refreshThumbRail();
    // Keep affordability state fresh (cheap DOM writes, 2 Hz).
    if (!window._thumbRailTimer) {
        window._thumbRailTimer = setInterval(refreshThumbRail, 500);
    }
}

function refreshThumbRail() {
    try {
        const bal = (typeof gameState !== 'undefined') ? Math.floor(gameState.balance) : 0;
        const costs = {
            thumbHireFirewall: (typeof STAFF_TYPES !== 'undefined' && STAFF_TYPES.firewall) ? STAFF_TYPES.firewall.hireCost : 200,
            thumbHireResponder: (typeof STAFF_TYPES !== 'undefined' && STAFF_TYPES.responder) ? STAFF_TYPES.responder.hireCost : 300,
            thumbRepair: 300,
            thumbWeapon: 500
        };
        Object.entries(costs).forEach(([id, cost]) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const afford = bal >= cost;
            btn.classList.toggle('thumb-poor', !afford);
            btn.setAttribute('aria-disabled', afford ? 'false' : 'true');
        });
        const fire = document.getElementById('touchFireBtn');
        if (fire && typeof isShooting !== 'undefined') fire.classList.toggle('active', !!isShooting);
    } catch (_) { /* rail is best-effort */ }
}

// Auto-pause on rotate + when tab hidden. Shows a toast so players know why.
var _lastOrientation = null;
function _orientationOf() {
    return (window.innerHeight >= window.innerWidth) ? 'portrait' : 'landscape';
}

function initRotateAutoPause() {
    if (window._rotatePauseWired) return;
    window._rotatePauseWired = true;
    _lastOrientation = _orientationOf();

    function autoPause(reason) {
        if (typeof gameRunning === 'undefined' || !gameRunning) return;
        if (typeof gamePaused !== 'undefined' && gamePaused) return;
        if (typeof pauseGame === 'function') pauseGame();
        const toast = document.getElementById('rotateToast');
        if (toast) {
            toast.textContent = reason === 'hidden'
                ? '⏸️ Auto-paused (tab hidden). Tap Resume to continue.'
                : '🔄 Rotated — auto-paused. Tap Resume to continue.';
            toast.classList.remove('hidden');
            clearTimeout(window._rotateToastTimer);
            window._rotateToastTimer = setTimeout(() => toast.classList.add('hidden'), 4000);
        }
    }

    window.addEventListener('orientationchange', () => {
        // Layout settles after rotation; resize then pause.
        setTimeout(() => {
            if (typeof resize === 'function') { try { resize(); } catch (_) {} }
            if (_orientationOf() !== _lastOrientation) {
                _lastOrientation = _orientationOf();
                autoPause('rotate');
            }
        }, 250);
    });

    // Fallback for browsers without orientationchange + visualViewport pinch/rotate.
    let _resizeT = null;
    window.addEventListener('resize', () => {
        clearTimeout(_resizeT);
        _resizeT = setTimeout(() => {
            const now = _orientationOf();
            if (now !== _lastOrientation) {
                _lastOrientation = now;
                autoPause('rotate');
            }
        }, 300);
    });
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            // Pinch-zoom resize: re-fit canvas but never move the ship.
            if (typeof resize === 'function') { try { resize(); } catch (_) {} }
        });
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) autoPause('hidden');
    });
}

// Update player position based on keyboard input
function updateKeyboardMovement() {
    if (!gameRunning || gamePaused) return;

    let dx = 0;
    let dy = 0;

    // WASD and Arrow key support
    if (keysPressed['w'] || keysPressed['arrowup']) dy -= KEYBOARD_SPEED;
    if (keysPressed['s'] || keysPressed['arrowdown']) dy += KEYBOARD_SPEED;
    if (keysPressed['a'] || keysPressed['arrowleft']) dx -= KEYBOARD_SPEED;
    if (keysPressed['d'] || keysPressed['arrowright']) dx += KEYBOARD_SPEED;

    // Apply movement if keys are pressed
    if (dx !== 0 || dy !== 0) {
        inputX = player.x + dx;
        inputY = player.y + dy;
    }
}
