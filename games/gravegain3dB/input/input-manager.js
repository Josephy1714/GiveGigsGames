(function () {
    'use strict';

    // Input owns its pointer-lock request so it has no dependency on the
    // runtime's private helpers after code splitting.
    function requestPointerLockSafely(element) {
        if (!element?.requestPointerLock) return;
        try {
            const request = element.requestPointerLock();
            if (request && typeof request.catch === 'function') request.catch(() => {});
        } catch (_) { /* Embedded players may deny pointer lock. */ }
    }

class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = { click: false, fireDown: false, rightClick: false, isBlocking: false, aiming: false, lookDrag: false, lastLookX: 0, lastLookY: 0, lookRebase: false };
        this.lookSensitivity = 0.0022;
        this.invertY = false;
        this.lastLookDelta = 0;

        // Mobile virtual analog joystick (docked base position)
        this.joystick = { active: false, x: 0, y: 0, originX: 0, originY: 0 };

        // Mobile touch look gesture
        this.touchLook = { active: false, lastX: 0, lastY: 0 };

        // Unique mobile scheme: "Crypt-stick move + drag-look + spell-wheel button"
        // Crypt-stick: floating-origin left-half stick with deadzone + edge sprint.
        this.cryptStick = { floating: false, dockLeft: '', dockTop: '', sprint: false };
        // Tap-to-interact: quick tap (no drag) raycasts into the 3D scene.
        this.tap = { pointerId: null, downX: 0, downY: 0, downT: 0, maxMovePx: 12, maxMs: 300 };
        // Spell-wheel: ability button doubles as wheel hub (tap = cast, hold = wheel).
        this.spellWheel = { open: false, holdTimer: null, holdMs: 350, holdTriggered: false };
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ||
            (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

        this.setupDesktopControls();
        this.setupMobileControls();
        this.applyMobilePixelCap();
        this.setupCryptStick();
        this.setupSpellWheel();
        try {
            window.GraveGainMobile = window.GraveGainMobile || {};
            window.GraveGainMobile.scheme = 'Crypt-stick move + drag-look + spell-wheel button';
        } catch (_) {}
    }

    setupDesktopControls() {
        window.addEventListener('keydown', (e) => {
            const target = e.target;
            if (target?.isContentEditable || target?.matches?.('input, textarea, select')) {
                this.keys[e.code] = false;
                return;
            }
            this.keys[e.code] = true;
            if (!e.repeat && window.GraveGainGame && window.GraveGainGame.handleGameplayKey) {
                window.GraveGainGame.handleGameplayKey(e.code);
            }
            if (!e.repeat && (e.code === 'KeyP' || e.code === 'Escape')) {
                if (window.GraveGainGame) window.GraveGainGame.togglePause();
            }
            if (e.code === 'KeyQ') {
                if (window.GraveGainGame) window.GraveGainGame.usePotion();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        const container = document.getElementById('canvasContainer');
        if (!container) return;

        container.addEventListener('contextmenu', (e) => e.preventDefault());
        container.addEventListener('auxclick', (e) => {
            if (e.button === 1) e.preventDefault();
        });
        container.addEventListener('wheel', (e) => {
            const game = window.GraveGainGame;
            if (!game || !game.player) return;
            e.preventDefault();
            game.cycleWeapon(e.deltaY > 0 ? 1 : -1);
        }, { passive: false });

        container.addEventListener('mousedown', (e) => {
            if (e.target?.closest?.('button, input, select, textarea, [role="button"]')) return;
            if (e.button === 1) {
                e.preventDefault();
                if (window.GraveGainGame) window.GraveGainGame.handleGameplayKey('KeyN');
                return;
            }
            // Bot/synthetic presses (virtual mouse, autoplay, playtests) must
            // act as real attacks even without pointer lock, which embedded
            // players and headless test windows routinely deny. Human first
            // clicks still request pointer lock as before.
            const botDriven = e.isTrusted === false ||
                (window.GraveGainBotInput && window.GraveGainBotInput.isBotControl());
            if (document.pointerLockElement !== container && !botDriven) requestPointerLockSafely(container);
            if (!botDriven && e.button === 2) {
                this.mouse.lookDrag = true;
                this.mouse.lastLookX = e.clientX;
                this.mouse.lastLookY = e.clientY;
                this.mouse.lookRebase = false;
            }
            if (e.button === 0) {
                this.mouse.click = true;
                this.mouse.fireDown = true;
            } else if (e.button === 2) {
                this.mouse.aiming = true;
                this.mouse.rightClick = true;
            }
        });
        container.addEventListener('click', (e) => {
            if (e.isTrusted === false) return;
            if (window.GraveGainBotInput && window.GraveGainBotInput.isBotControl()) return;
            if (document.pointerLockElement !== container) requestPointerLockSafely(container);
        });

        // Programmatic look/attack for the virtual bot mouse. Routes through
        // the same flags the per-frame loop polls, so bot + human share one
        // input path (see ui/bot-cursor.js GraveGainBotInput for the driver).
        this.botLook = (dx, dy) => {
            if (window.GraveGainBotInput) return window.GraveGainBotInput.look(dx, dy);
            return false;
        };
        this.botAttack = () => {
            if (!window.GraveGainGame || !window.GraveGainGame.player) return false;
            this.mouse.click = true;
            return true;
        };
        this.botBlock = (on) => {
            this.mouse.isBlocking = on !== false;
            this.mouse.rightClick = on !== false;
        };
        this.botPress = (code, holdMs) => {
            if (code === 'KeyQ' && window.GraveGainGame) {
                window.GraveGainGame.usePotion();
                return;
            }
            if (code === 'KeyF' && window.GraveGainGame && window.GraveGainGame.player) {
                this.castAbility();
                return;
            }
            this.keys[code] = true;
            setTimeout(() => { this.keys[code] = false; }, holdMs || 220);
        };

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.fireDown = false;
            if (e.button === 2) {
                this.mouse.aiming = false;
                this.mouse.lookDrag = false;
            }
            if (e.buttons === 0) this.mouse.lookDrag = false;
        });
        document.addEventListener('pointerlockchange', () => {
            this.mouse.lookRebase = true;
        });
        window.addEventListener('blur', () => {
            this.mouse.click = false;
            this.mouse.fireDown = false;
            this.mouse.aiming = false;
            this.mouse.rightClick = false;
            this.mouse.isBlocking = false;
            this.mouse.lookDrag = false;
            this.mouse.lookRebase = true;
            Object.keys(this.keys).forEach(code => { this.keys[code] = false; });
            this.joystick.active = false;
            this.joystick.x = 0;
            this.joystick.y = 0;
            this.cryptStick.sprint = false;
            this.touchLook.active = false;
            this.tap.pointerId = null;
            this.tap.downT = 0;
        });

        document.addEventListener('mousemove', (e) => {
            const game = window.GraveGainGame;
            const locked = document.pointerLockElement === container;
            if (game && game.player && (locked || this.mouse.lookDrag)) {
                if (locked) {
                    this.mouse.lastLookX = e.clientX;
                    this.mouse.lastLookY = e.clientY;
                    this.mouse.lookRebase = false;
                } else if (this.mouse.lookRebase) {
                    this.mouse.lastLookX = e.clientX;
                    this.mouse.lastLookY = e.clientY;
                    this.mouse.lookRebase = false;
                    return;
                }
                const dx = locked ? e.movementX : e.clientX - this.mouse.lastLookX;
                const rawDy = locked ? e.movementY : e.clientY - this.mouse.lastLookY;
                if (!locked) {
                    this.mouse.lastLookX = e.clientX;
                    this.mouse.lastLookY = e.clientY;
                }
                const p = game.player;
                p.yaw -= dx * this.lookSensitivity;
                const dy = this.invertY ? -rawDy : rawDy;
                p.pitch -= dy * this.lookSensitivity;
                p.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, p.pitch));
                this.lastLookDelta = (this.lastLookDelta || 0) + Math.abs(dx) + Math.abs(rawDy);
            }
        });
    }

    setupMobileControls() {
        const isTouchSupported = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const isNarrowViewport = window.innerWidth <= 900;
        const isPointerCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        if (isTouchSupported || isNarrowViewport || isPointerCoarse) {
            document.body.classList.add('touch-enabled');
        }
        // Also watch for resize to toggle mobile layout
        window.addEventListener('resize', () => {
            const nowNarrow = window.innerWidth <= 900;
            const nowTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            const nowCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
            if (nowNarrow || nowTouch || nowCoarse) {
                document.body.classList.add('touch-enabled');
            } else {
                document.body.classList.remove('touch-enabled');
            }
        });

        // Virtual analog joystick. Track the initiating pointer so a second
        // finger used for looking or attacking cannot hijack movement.
        const joystickContainer = document.getElementById('mobileJoystick');
        const knob = document.getElementById('mobileJoystickKnob');

        if (joystickContainer && knob) {
            let joystickPointerId = null;
            const onJoyStart = (e) => {
                if (joystickPointerId !== null) return;
                e.preventDefault();
                joystickPointerId = e.pointerId;
                joystickContainer.setPointerCapture?.(e.pointerId);
                const rect = joystickContainer.getBoundingClientRect();
                this.joystick.active = true;
                this.joystick.originX = rect.left + rect.width / 2;
                this.joystick.originY = rect.top + rect.height / 2;
                onJoyMove(e);
            };

            const onJoyMove = (e) => {
                if (!this.joystick.active || e.pointerId !== joystickPointerId) return;
                e.preventDefault();
                const dx = e.clientX - this.joystick.originX;
                const dy = e.clientY - this.joystick.originY;
                const maxRadius = 45;
                const dist = Math.hypot(dx, dy);

                if (dist > 0) {
                    const clampedDist = Math.min(dist, maxRadius);
                    const angle = Math.atan2(dy, dx);
                    const kx = Math.cos(angle) * clampedDist;
                    const ky = Math.sin(angle) * clampedDist;

                    knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
                    this.joystick.x = kx / maxRadius;
                    this.joystick.y = ky / maxRadius;
                }
            };

            const onJoyEnd = (e) => {
                if (e.pointerId !== joystickPointerId) return;
                this.joystick.active = false;
                this.joystick.x = 0;
                this.joystick.y = 0;
                joystickPointerId = null;
                knob.style.transform = 'translate(-50%, -50%)';
            };

            joystickContainer.addEventListener('pointerdown', onJoyStart);
            joystickContainer.addEventListener('pointermove', onJoyMove);
            joystickContainer.addEventListener('pointerup', onJoyEnd);
            joystickContainer.addEventListener('pointercancel', onJoyEnd);
            joystickContainer.addEventListener('lostpointercapture', onJoyEnd);
            window.addEventListener('blur', () => {
                joystickPointerId = null;
                this.joystick.active = false;
                this.joystick.x = 0;
                this.joystick.y = 0;
                knob.style.transform = 'translate(-50%, -50%)';
            });
        }

        // Mobile Touch Look Gesture
        const lookZone = document.getElementById('mobileTouchLookZone');
        if (lookZone) {
            let lookPointerId = null;
            lookZone.addEventListener('pointerdown', (e) => {
                if (lookPointerId !== null) return;
                e.preventDefault();
                lookPointerId = e.pointerId;
                lookZone.setPointerCapture?.(e.pointerId);
                this.touchLook.active = true;
                this.touchLook.lastX = e.clientX;
                this.touchLook.lastY = e.clientY;
            });

            lookZone.addEventListener('pointermove', (e) => {
                if (e.pointerId !== lookPointerId || !this.touchLook.active || !window.GraveGainGame || !window.GraveGainGame.player) return;
                e.preventDefault();
                const dx = e.clientX - this.touchLook.lastX;
                const dy = e.clientY - this.touchLook.lastY;
                this.touchLook.lastX = e.clientX;
                this.touchLook.lastY = e.clientY;

                const p = window.GraveGainGame.player;
                const sens = this.lookSensitivity * 1.5;
                p.yaw -= dx * sens;
                const moveY = this.invertY ? -dy : dy;
                p.pitch -= moveY * sens;
                p.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, p.pitch));
                this.lastLookDelta = (this.lastLookDelta || 0) + Math.abs(dx) + Math.abs(dy);
            });

            const endLook = (e) => {
                if (e.pointerId !== lookPointerId) return;
                this.touchLook.active = false;
                lookPointerId = null;
            };
            lookZone.addEventListener('pointerup', endLook);
            lookZone.addEventListener('pointercancel', endLook);
            lookZone.addEventListener('lostpointercapture', endLook);
            window.addEventListener('blur', () => {
                lookPointerId = null;
                this.touchLook.active = false;
            });
        }

        // Mobile Action Buttons
        const attackBtn = document.getElementById('mobileAttackBtn');
        const blockBtn = document.getElementById('mobileBlockBtn');
        const abilityBtn = document.getElementById('mobileAbilityBtn');
        const jumpBtn = document.getElementById('mobileJumpBtn');
        const potionBtn = document.getElementById('mobilePotionBtn');
        const reloadBtn = document.getElementById('mobileReloadBtn');
        const grenadeBtn = document.getElementById('mobileGrenadeBtn');
        const launcherBtn = document.getElementById('mobileLauncherBtn');
        const meleeBtn = document.getElementById('mobileMeleeBtn');
        const weaponMeleeBtn = document.getElementById('mobileWeaponMeleeBtn');
        const slideBtn = document.getElementById('mobileSlideBtn');
        const weaponPrevBtn = document.getElementById('mobileWeaponPrevBtn');
        const weaponNextBtn = document.getElementById('mobileWeaponNextBtn');
        const dropWeaponBtn = document.getElementById('mobileDropWeaponBtn');
        const aimBtn = document.getElementById('mobileAimBtn');
        const leanLeftBtn = document.getElementById('mobileLeanLeftBtn');
        const leanRightBtn = document.getElementById('mobileLeanRightBtn');
        const waitBtn = document.getElementById('mobileWaitBtn');

        [[leanLeftBtn, 'KeyZ'], [leanRightBtn, 'KeyX']].forEach(([button, code]) => {
            if (!button) return;
            let pointerId = null;
            const stopLean = (e) => {
                if (e && e.pointerId !== pointerId) return;
                pointerId = null;
                this.keys[code] = false;
            };
            button.addEventListener('pointerdown', (e) => {
                if (pointerId !== null) return;
                e.preventDefault();
                pointerId = e.pointerId;
                try { button.setPointerCapture?.(e.pointerId); } catch (_) {}
                this.keys[code] = true;
            });
            ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(eventName => {
                button.addEventListener(eventName, stopLean);
            });
            button.addEventListener('click', (e) => {
                if (e.detail === 0) {
                    this.keys[code] = true;
                    requestAnimationFrame(() => { this.keys[code] = false; });
                }
            });
            window.addEventListener('blur', () => stopLean());
        });

        if (attackBtn) {
            let attackPointerId = null;
            attackBtn.addEventListener('pointerdown', (e) => {
                if (attackPointerId !== null) return;
                e.preventDefault();
                attackPointerId = e.pointerId;
                try { attackBtn.setPointerCapture?.(e.pointerId); } catch (_) {}
                this.mouse.click = true;
                this.mouse.fireDown = true;
            });
            const endAttack = (e) => {
                if (attackPointerId === null || (e && e.pointerId !== attackPointerId)) return;
                attackPointerId = null;
                this.mouse.fireDown = false;
            };
            ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(eventName => {
                attackBtn.addEventListener(eventName, endAttack);
            });
            attackBtn.addEventListener('click', (e) => {
                if (e.detail === 0) this.mouse.click = true;
            });
            window.addEventListener('blur', () => endAttack());
        }

        if (reloadBtn) {
            reloadBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (window.GraveGainGame) window.GraveGainGame.reloadWeapon();
            });
            reloadBtn.addEventListener('click', (e) => {
                if (e.detail === 0 && window.GraveGainGame) window.GraveGainGame.reloadWeapon();
            });
        }

        if (grenadeBtn) {
            grenadeBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (window.GraveGainGame) window.GraveGainGame.handleGameplayKey('KeyG');
            });
            grenadeBtn.addEventListener('click', (e) => {
                if (e.detail === 0 && window.GraveGainGame) window.GraveGainGame.handleGameplayKey('KeyG');
            });
        }

        if (launcherBtn) {
            launcherBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (window.GraveGainGame) window.GraveGainGame.handleGameplayKey('KeyY');
            });
            launcherBtn.addEventListener('click', (e) => {
                if (e.detail === 0 && window.GraveGainGame) window.GraveGainGame.handleGameplayKey('KeyY');
            });
        }

        if (meleeBtn) {
            meleeBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (window.GraveGainGame) window.GraveGainGame.handleGameplayKey('KeyV');
            });
            meleeBtn.addEventListener('click', (e) => {
                if (e.detail === 0 && window.GraveGainGame) window.GraveGainGame.handleGameplayKey('KeyV');
            });
        }

        if (weaponMeleeBtn) {
            weaponMeleeBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (window.GraveGainGame) window.GraveGainGame.handleGameplayKey('KeyN');
            });
            weaponMeleeBtn.addEventListener('click', (e) => {
                if (e.detail === 0 && window.GraveGainGame) window.GraveGainGame.handleGameplayKey('KeyN');
            });
        }

        if (slideBtn) {
            slideBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.keys['KeyC'] = true;
                if (window.GraveGainGame) window.GraveGainGame.handleGameplayKey('KeyC');
            });
            const releaseCrouch = () => { this.keys['KeyC'] = false; };
            ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave'].forEach(eventName => {
                slideBtn.addEventListener(eventName, releaseCrouch);
            });
            slideBtn.addEventListener('click', (e) => {
                if (e.detail === 0) {
                    this.keys['KeyC'] = true;
                    if (window.GraveGainGame) window.GraveGainGame.handleGameplayKey('KeyC');
                    requestAnimationFrame(releaseCrouch);
                }
            });
        }

        if (weaponPrevBtn) {
            weaponPrevBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (window.GraveGainGame) window.GraveGainGame.cycleWeapon(-1);
            });
            weaponPrevBtn.addEventListener('click', (e) => {
                if (e.detail === 0 && window.GraveGainGame) window.GraveGainGame.cycleWeapon(-1);
            });
        }
        if (weaponNextBtn) {
            weaponNextBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (window.GraveGainGame) window.GraveGainGame.cycleWeapon(1);
            });
            weaponNextBtn.addEventListener('click', (e) => {
                if (e.detail === 0 && window.GraveGainGame) window.GraveGainGame.cycleWeapon(1);
            });
        }
        if (dropWeaponBtn) {
            dropWeaponBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (window.GraveGainGame) window.GraveGainGame.handleGameplayKey('KeyH');
            });
            dropWeaponBtn.addEventListener('click', (e) => {
                if (e.detail === 0 && window.GraveGainGame) window.GraveGainGame.handleGameplayKey('KeyH');
            });
        }
        if (aimBtn) {
            const stopAim = () => { this.mouse.aiming = false; };
            aimBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.mouse.aiming = true;
            });
            ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave'].forEach(eventName => {
                aimBtn.addEventListener(eventName, stopAim);
            });
            aimBtn.addEventListener('click', (e) => {
                if (e.detail === 0) {
                    this.mouse.aiming = true;
                    requestAnimationFrame(stopAim);
                }
            });
        }

        if (blockBtn) {
            blockBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (window.GraveGainGame?.controlMode === 'turnbased') {
                    window.GraveGainGame.executeTurnAction('wait');
                    return;
                }
                this.mouse.isBlocking = true;
                this.mouse.rightClick = true;
            });
            const endBlock = () => {
                this.mouse.isBlocking = false;
            };
            blockBtn.addEventListener('pointerup', endBlock);
            blockBtn.addEventListener('pointercancel', endBlock);
            blockBtn.addEventListener('lostpointercapture', endBlock);
            blockBtn.addEventListener('click', (e) => {
                if (e.detail !== 0) return;
                if (window.GraveGainGame?.controlMode === 'turnbased') {
                    window.GraveGainGame.executeTurnAction('wait');
                    return;
                }
                this.mouse.rightClick = true;
                this.mouse.isBlocking = true;
                requestAnimationFrame(() => { this.mouse.isBlocking = false; });
            });
        }

        if (abilityBtn) {
            abilityBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
            });
            abilityBtn.addEventListener('click', (e) => {
                if (e.detail === 0) this.castAbility();
            });
        }

        if (jumpBtn) {
            jumpBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.keys['Space'] = true;
            });
            const clearJump = () => { this.keys['Space'] = false; };
            jumpBtn.addEventListener('pointerup', clearJump);
            jumpBtn.addEventListener('pointercancel', clearJump);
            jumpBtn.addEventListener('lostpointercapture', clearJump);
            jumpBtn.addEventListener('click', (e) => {
                if (e.detail === 0) {
                    this.keys['Space'] = true;
                    requestAnimationFrame(clearJump);
                }
            });
        }

        if (potionBtn) {
            potionBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (window.GraveGainGame) window.GraveGainGame.usePotion();
            });
            potionBtn.addEventListener('click', (e) => {
                if (e.detail === 0 && window.GraveGainGame) window.GraveGainGame.usePotion();
            });
        }

        if (waitBtn) {
            waitBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (window.GraveGainGame) window.GraveGainGame.executeTurnAction('wait');
            });
            waitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (e.detail === 0 && window.GraveGainGame) window.GraveGainGame.executeTurnAction('wait');
            });
        }

        // Kill double-tap zoom / pull-to-refresh gestures over the play field.
        const container = document.getElementById('canvasContainer');
        if (container && !container.dataset.ggTouchGuard) {
            container.dataset.ggTouchGuard = '1';
            container.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
            container.addEventListener('dblclick', (e) => e.preventDefault());
            document.addEventListener('gesturestart', (e) => e.preventDefault());
            let lastTouchEnd = 0;
            container.addEventListener('touchend', (e) => {
                const now = Date.now();
                if (now - lastTouchEnd < 350) e.preventDefault();
                lastTouchEnd = now;
            }, { passive: false });
        }

        // Tap-to-interact: a quick tap (not a drag) on the look zone raycasts
        // into the scene. Wired here so it works even if setupCryptStick runs later.
        const tapZone = document.getElementById('mobileTouchLookZone');
        if (tapZone && !tapZone.dataset.ggTap) {
            tapZone.dataset.ggTap = '1';
            tapZone.addEventListener('pointerdown', (e) => {
                if (this.tap.pointerId !== null) return;
                this.tap.pointerId = e.pointerId;
                this.tap.downX = e.clientX;
                this.tap.downY = e.clientY;
                this.tap.downT = performance.now();
            });
            tapZone.addEventListener('pointerup', (e) => {
                if (e.pointerId !== this.tap.pointerId) return;
                const dt = performance.now() - (this.tap.downT || 0);
                const moved = Math.hypot(e.clientX - this.tap.downX, e.clientY - this.tap.downY);
                this.tap.pointerId = null;
                this.tap.downT = 0;
                if (dt <= this.tap.maxMs && moved <= this.tap.maxMovePx) {
                    this.tapInteract(e.clientX, e.clientY);
                }
            });
            tapZone.addEventListener('pointercancel', (e) => {
                if (e.pointerId !== this.tap.pointerId) return;
                this.tap.pointerId = null;
                this.tap.downT = 0;
            });
        }
    }

    buzz(pattern) {
        try {
            if (navigator.vibrate && this.isTouchDevice) navigator.vibrate(pattern || 10);
        } catch (_) {}
    }

    // Pixel-ratio cap for mobile GPUs. Desktop keeps the performance-manager
    // preset (up to 1.5); touch devices are capped to 1.25 — or 1.0 on small
    // screens / very high DPR where fill-rate dominates. Re-applied on resize
    // and once the THREE renderer exists (game boots after input).
    mobilePixelCap() {
        if (!this.isTouchDevice && window.innerWidth > 900) return Math.min(window.devicePixelRatio || 1, 1.5);
        const small = Math.min(window.innerWidth, window.innerHeight) < 500 || window.innerWidth <= 700;
        const dpr = window.devicePixelRatio || 1;
        if (small || dpr > 2.5) return Math.min(dpr, 1.0);
        return Math.min(dpr, 1.25);
    }

    applyMobilePixelCap() {
        const apply = () => {
            try {
                const game = window.GraveGainGame;
                if (game && game.renderer && typeof game.renderer.setPixelRatio === 'function') {
                    const cap = this.mobilePixelCap();
                    const cur = (game.performance && game.performance.pixelRatio) || game.renderer.getPixelRatio?.() || cap;
                    if (cur > cap + 0.001) {
                        game.renderer.setPixelRatio(cap);
                        if (game.performance) {
                            game.performance.pixelRatio = cap;
                            game.performance.maxPixelRatio = Math.min(game.performance.maxPixelRatio || cap, cap);
                        }
                        const w = game.container ? game.container.clientWidth : game.renderer.domElement.clientWidth;
                        const h = game.container ? game.container.clientHeight : game.renderer.domElement.clientHeight;
                        if (w && h) game.renderer.setSize(w, h, false);
                    }
                }
            } catch (_) {}
        };
        // Renderer may not exist yet — retry briefly, then rely on resize.
        let tries = 0;
        const poll = setInterval(() => {
            apply();
            tries++;
            if (tries > 40) clearInterval(poll);
            if (window.GraveGainGame && window.GraveGainGame.renderer) { apply(); clearInterval(poll); }
        }, 500);
        window.addEventListener('resize', apply);
        window.addEventListener('orientationchange', () => setTimeout(apply, 300));
    }

    // Crypt-stick: floating-origin move stick. Touching down on the left 45%
    // of the canvas re-docks the stick base under the finger; pushing to the
    // rim (>0.92) engages sprint (Shift). Lift-off snaps the base home.
    setupCryptStick() {
        const container = document.getElementById('canvasContainer');
        const base = document.getElementById('mobileJoystick');
        const knob = document.getElementById('mobileJoystickKnob');
        if (!container || !base || !knob || base.dataset.ggCrypt) return;
        base.dataset.ggCrypt = '1';
        let cryptPointerId = null;

        const dock = () => {
            base.style.left = this.cryptStick.dockLeft || '';
            base.style.top = this.cryptStick.dockTop || '';
            base.style.transform = '';
            this.cryptStick.floating = false;
        };

        container.addEventListener('pointerdown', (e) => {
            if (!document.body.classList.contains('touch-enabled')) return;
            if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
            if (this.joystick.active) return;
            if (e.target && e.target.closest && e.target.closest('.mobile-action-btn, .mobile-mode-panel, .mobile-mini-hud, button')) return;
            const rect = container.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            if (relX > rect.width * 0.45) return; // right side is drag-look territory
            // Remember dock once, then float the base under the finger.
            if (!this.cryptStick.dockLeft) {
                const cs = window.getComputedStyle(base);
                this.cryptStick.dockLeft = base.style.left || cs.left;
                this.cryptStick.dockTop = base.style.top || cs.top;
            }
            const baseRect = base.getBoundingClientRect();
            if (e.clientX >= baseRect.left - 8 && e.clientX <= baseRect.right + 8 &&
                e.clientY >= baseRect.top - 8 && e.clientY <= baseRect.bottom + 8) return; // on the docked stick: let its own handler run
            cryptPointerId = e.pointerId;
            this.cryptStick.floating = true;
            base.style.left = '0';
            base.style.top = '0';
            base.style.transform = `translate(${relX - baseRect.width / 2}px, ${e.clientY - rect.top - baseRect.height / 2}px)`;
            this.joystick.active = true;
            this.joystick.originX = e.clientX;
            this.joystick.originY = e.clientY;
            this.joystick.x = 0;
            this.joystick.y = 0;
            try { container.setPointerCapture?.(e.pointerId); } catch (_) {}
        });

        const onMove = (e) => {
            if (e.pointerId !== cryptPointerId || !this.cryptStick.floating || !this.joystick.active) return;
            const dx = e.clientX - this.joystick.originX;
            const dy = e.clientY - this.joystick.originY;
            const maxRadius = 48;
            const dist = Math.hypot(dx, dy);
            const dead = 0.12;
            if (dist > 0) {
                const clamped = Math.min(dist, maxRadius);
                const angle = Math.atan2(dy, dx);
                const kx = Math.cos(angle) * clamped;
                const ky = Math.sin(angle) * clamped;
                knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
                let nx = kx / maxRadius;
                let ny = ky / maxRadius;
                if (Math.hypot(nx, ny) < dead) { nx = 0; ny = 0; }
                this.joystick.x = nx;
                this.joystick.y = ny;
                // Rim push = sprint.
                const sprinting = Math.hypot(nx, ny) > 0.92;
                this.cryptStick.sprint = sprinting;
                this.keys['ShiftLeft'] = sprinting;
            }
        };
        const onUp = (e) => {
            if (e.pointerId !== cryptPointerId || !this.cryptStick.floating) return;
            cryptPointerId = null;
            this.joystick.active = false;
            this.joystick.x = 0;
            this.joystick.y = 0;
            this.cryptStick.sprint = false;
            this.keys['ShiftLeft'] = false;
            knob.style.transform = 'translate(-50%, -50%)';
            dock();
        };
        window.addEventListener('blur', () => {
            cryptPointerId = null;
            this.joystick.active = false;
            this.joystick.x = 0;
            this.joystick.y = 0;
            this.cryptStick.sprint = false;
            this.keys['ShiftLeft'] = false;
            knob.style.transform = 'translate(-50%, -50%)';
            dock();
        });
        container.addEventListener('pointermove', onMove);
        container.addEventListener('pointerup', onUp);
        container.addEventListener('pointercancel', onUp);
        container.addEventListener('lostpointercapture', onUp);
    }

    // Tap-to-interact raycast. A quick tap casts from the camera through the
    // tap point: nearest living enemy within range is auto-faced and attacked;
    // loot/portal hits pulse the crosshair (pickup/descent are proximity
    // driven, so facing + stepping feedback is enough). Always safe to call.
    tapInteract(clientX, clientY) {
        const game = window.GraveGainGame;
        if (!game || !game.player || game.player.isDead) return false;
        const container = document.getElementById('canvasContainer');
        const rect = (container || document.getElementById('gameCanvas')).getBoundingClientRect();
        const nx = (((clientX - rect.left) / rect.width) * 2 - 1);
        const ny = (-((clientY - rect.top) / rect.height) * 2 + 1);
        let handled = false;
        try {
            if (window.THREE && THREE.Raycaster && game.camera3d) {
                const ray = new THREE.Raycaster();
                ray.setFromCamera({ x: nx, y: ny }, game.camera3d);
                ray.far = 900;
                const targets = [];
                (game.enemies || []).forEach((en) => {
                    if (!en || en.hp <= 0 || !en.group3d) return;
                    targets.push(en.group3d);
                });
                (game.loot || []).forEach((l) => { if (l && !l.picked && l.group3d) targets.push(l.group3d); });
                if (targets.length) {
                    const hits = ray.intersectObjects(targets, true);
                    if (hits.length) {
                        let obj = hits[0].object;
                        let root = null;
                        while (obj) {
                            const foundEnemy = (game.enemies || []).find((en) => en.group3d === obj);
                            if (foundEnemy) { root = { kind: 'enemy', ref: foundEnemy, point: hits[0].point }; break; }
                            const foundLoot = (game.loot || []).find((l) => l.group3d === obj);
                            if (foundLoot) { root = { kind: 'loot', ref: foundLoot, point: hits[0].point }; break; }
                            obj = obj.parent;
                        }
                        if (root && root.kind === 'enemy') {
                            // Face the target, then attack through the normal path.
                            const dx = root.ref.x - game.player.x;
                            const dy = root.ref.y - game.player.y;
                            if (Math.hypot(dx, dy) < 700) {
                                game.player.yaw = Math.atan2(-dx, -dy) + Math.PI;
                                this.mouse.click = true;
                                this.buzz(12);
                                handled = true;
                            }
                        } else if (root) {
                            this.pulseCrosshair();
                            handled = true;
                        }
                    }
                }
            }
        } catch (_) { /* raycast is best-effort */ }
        if (!handled) {
            // Tap near center = deliberate attack; off-center tap = look nudge.
            if (Math.abs(nx) < 0.25 && Math.abs(ny) < 0.25) {
                this.mouse.click = true;
                this.buzz(8);
                handled = true;
            }
        }
        if (handled) this.pulseCrosshair();
        return handled;
    }

    pulseCrosshair() {
        const ch = document.getElementById('hudCrosshair');
        if (!ch) return;
        ch.classList.add('hit');
        setTimeout(() => ch.classList.remove('hit'), 160);
    }

    castAbility() {
        const game = window.GraveGainGame;
        if (!game || !game.player || game.player.isDead) return false;
        if (game.controlMode === 'turnbased') return game.executeTurnAction('ability');
        game.player.triggerAbility();
        return true;
    }

    // Spell-wheel button: the ability key becomes a radial wheel hub.
    // Tap = instant cast (unchanged). Press-and-hold (>=holdMs) = wheel with
    // Attack / Cast / Potion / Wait-or-Jump. Wheel is built once, lazily.
    setupSpellWheel() {
        const abilityBtn = document.getElementById('mobileAbilityBtn');
        const container = document.getElementById('canvasContainer');
        if (!abilityBtn || !container || abilityBtn.dataset.ggWheel) return;
        abilityBtn.dataset.ggWheel = '1';
        abilityBtn.title = 'Cast (tap) · Spell wheel (hold)';

        let wheel = document.getElementById('spellWheel');
        if (!wheel) {
            wheel = document.createElement('div');
            wheel.id = 'spellWheel';
            wheel.className = 'spell-wheel hidden';
            wheel.setAttribute('role', 'menu');
            wheel.setAttribute('aria-label', 'Spell wheel');
            wheel.innerHTML =
                '<div class="spell-wheel-title">🔮 SPELL WHEEL</div>' +
                '<div class="spell-wheel-grid">' +
                '<button class="spell-wheel-btn" data-spell="attack" role="menuitem">⚔️<span>Attack</span></button>' +
                '<button class="spell-wheel-btn" data-spell="cast" role="menuitem">🔮<span>Cast</span></button>' +
                '<button class="spell-wheel-btn" data-spell="potion" role="menuitem">🧪<span>Potion</span></button>' +
                '<button class="spell-wheel-btn" data-spell="move" role="menuitem">🦘<span>Jump</span></button>' +
                '</div>' +
                '<div class="spell-wheel-hint">tap a spell · tap outside to close</div>';
            container.appendChild(wheel);
        }

        const moveBtn = wheel.querySelector('[data-spell="move"]');
        const syncMoveBtn = () => {
            const game = window.GraveGainGame;
            const turnBased = game && game.controlMode === 'turnbased';
            if (moveBtn) moveBtn.innerHTML = turnBased ? '⏳<span>Wait</span>' : '🦘<span>Jump</span>';
        };

        const openWheel = () => {
            syncMoveBtn();
            wheel.classList.remove('hidden');
            wheel.classList.add('open');
            this.spellWheel.open = true;
            this.buzz(20);
        };
        const closeWheel = () => {
            wheel.classList.add('hidden');
            wheel.classList.remove('open');
            this.spellWheel.open = false;
        };
        this.closeSpellWheel = closeWheel;

        const fireSpell = (kind) => {
            const game = window.GraveGainGame;
            if (kind === 'attack') this.mouse.click = true;
            else if (kind === 'cast') this.castAbility();
            else if (kind === 'potion') { if (game) game.usePotion(); }
            else if (kind === 'move') {
                if (game && game.controlMode === 'turnbased') game.executeTurnAction('wait');
                else { this.keys['Space'] = true; requestAnimationFrame(() => { this.keys['Space'] = false; }); }
            }
            this.buzz(12);
            closeWheel();
        };

        wheel.querySelectorAll('.spell-wheel-btn').forEach((b) => {
            b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
            b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fireSpell(b.dataset.spell); });
        });
        wheel.addEventListener('pointerdown', (e) => {
            if (e.target === wheel) closeWheel();
            e.stopPropagation();
        });

        // Hold opens the wheel without casting; a quick release casts once.
        abilityBtn.addEventListener('pointerdown', (e) => {
            clearTimeout(this.spellWheel.holdTimer);
            this.spellWheel.holdTriggered = false;
            try { abilityBtn.setPointerCapture?.(e.pointerId); } catch (_) {}
            this.spellWheel.holdTimer = setTimeout(() => {
                this.spellWheel.holdTriggered = true;
                openWheel();
            }, this.spellWheel.holdMs);
        });
        abilityBtn.addEventListener('pointerup', () => {
            clearTimeout(this.spellWheel.holdTimer);
            if (!this.spellWheel.holdTriggered) this.castAbility();
        });
        ['pointercancel', 'lostpointercapture'].forEach((ev) => {
            abilityBtn.addEventListener(ev, () => clearTimeout(this.spellWheel.holdTimer));
        });
        document.addEventListener('keydown', (e) => { if (e.code === 'Escape' && this.spellWheel.open) closeWheel(); });
    }
}

    window.GraveGainInputManager = InputManager;
})();
