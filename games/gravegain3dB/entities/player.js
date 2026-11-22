(function() {
    'use strict';

    class PlayerEntity {
        constructor(race, classType, permanentStats = {}) {
            const GameData = window.GraveGainGameData || {};
            const Race = GameData.Race || { HUMAN: 'human', ELF: 'elf', DWARF: 'dwarf', ORC: 'orc' };
            const ClassType = GameData.ClassType || { WARRIOR: 'warrior', TANK: 'tank', SUPPORT: 'support', MAGE: 'mage' };
            const RaceData = GameData.RaceData || {};
            const ClassData = GameData.ClassData || {};

            this.race = race;
            this.classType = classType;
            const rData = RaceData[race] || { maxHp: 100, hpRegen: 1.0, stamina: 100, speed: 200 };
            const cData = ClassData[classType] || {};

            this.x = 0;
            this.y = 0; // mapped to 3D z
            this.yElevation = 0;
            this.vx = 0;
            this.vy = 0;
            this.radius = 16;

            this.yaw = 0;
            this.pitch = 0;
            this.lean = 0;

            const bonusHp = permanentStats.health ? permanentStats.health * 25 : 0;
            this.maxHp = rData.maxHp + bonusHp;
            this.hp = this.maxHp;
            this.hpRegen = rData.hpRegen;
            this.stamina = rData.stamina;
            this.maxStamina = rData.stamina;

            const speedBonus = permanentStats.speed ? (1.0 + permanentStats.speed * 0.1) : 1.0;
            this.speed = rData.speed * speedBonus;

            this.mana = race === Race.ELF ? 100 : 0;
            this.maxMana = 100;
            this.rage = 0;
            this.shieldBubble = 0;
            this.shieldCooldown = 0;
            this.stoneForm = false;
            this.stoneDuration = 0;

            // Combat & stats
            this.level = 1;
            this.xp = 0;
            this.xpNext = 220;
            this.isDead = false;
            this.isBlocking = false;
            this.sprinting = false;
            this.sprintBlend = 0;
            this.shiftHeld = false;
            this.dodgeTimer = 0;
            this.dodgeCooldown = 0;
            this.dodgeVx = 0;
            this.dodgeVy = 0;
            this.dodgeRequested = false;
            this.parryWindow = 0;

            this.potions = 1 + (permanentStats.potions || 0);
            this.perks = [];

            // Movement physics
            this.grounded = true;
            this.platVy = 0;
            this.doubleJumpsLeft = 0;
            this.jumpPressConsumed = false;
            this.jumpBuffer = 0;
            this.dropThroughTimer = 0;
            this.mantleMotion = null;
            this.airSpeed = 0;
            this.abilityCooldown = 0;
            this.crouching = false;
            this.isSliding = false;
            this.slideTimer = 0;
            this.slideCooldown = 0;
            this.slideDuration = 0.68;
            this.slideHopTimer = 0;
            this.momentumShotTimer = 0;
            this.slideVx = 0;
            this.slideVy = 0;
            this.footstepTimer = 0.05;
            this.footstepSide = 0;
            this.overclockTimer = 0;
        }

        tryStartSlide(input) {
            const sprintHeld = input?.keys?.['ShiftLeft'] || input?.keys?.['ShiftRight'];
            const moveSpeed = Math.hypot(this.vx, this.vy);
            if (this.isDead || this.isSliding || this.slideCooldown > 0 || this.isBlocking || !this.grounded || (!this.sprinting && !sprintHeld) ||
                moveSpeed < this.speed * 0.45 || this.stamina < 12) return false;

            const directionX = this.vx / moveSpeed;
            const directionY = this.vy / moveSpeed;
            const slideSpeed = Math.max(this.speed * 1.55, moveSpeed * 1.12);
            this.slideVx = directionX * slideSpeed;
            this.slideVy = directionY * slideSpeed;
            this.slideTimer = this.slideDuration;
            this.slideHopTimer = 0.32;
            this.slideCooldown = 0.8;
            this.isSliding = true;
            this.crouching = true;
            this.stamina = Math.max(0, this.stamina - 12);
            if (window.GraveGainGame) {
                window.GraveGainGame.audio.playSfx('swing', 1.2);
                window.GraveGainGame.combatText.spawnText(this.x, 20, this.y, 'SLIDE', 'block');
            }
            return true;
        }

        advanceResources(dt) {
            const GameData = window.GraveGainGameData || {};
            const Race = GameData.Race || { HUMAN: 'human', ELF: 'elf', DWARF: 'dwarf', ORC: 'orc' };

            if (!this.stoneForm) this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
            if (this.race === Race.ELF) this.mana = Math.min(this.maxMana, this.mana + 3.0 * dt);
            if (this.race === Race.ORC) this.rage = Math.max(0, this.rage - 3.0 * dt);
            if (this.race === Race.HUMAN) {
                this.shieldCooldown = Math.max(0, this.shieldCooldown - dt);
                if (this.shieldCooldown <= 0) this.shieldBubble = Math.min(25.0, this.shieldBubble + 2.5 * dt);
            }

            if (this.stoneForm) {
                this.stoneDuration -= dt;
                if (this.stoneDuration <= 0) {
                    this.stoneDuration = 0;
                    this.stoneForm = false;
                }
            }
            this.parryWindow = Math.max(0, this.parryWindow - dt);
            this.abilityCooldown = Math.max(0, this.abilityCooldown - dt);
            this.overclockTimer = Math.max(0, this.overclockTimer - dt);
        }

        advanceTurn(dt = 0.35) {
            if (this.isDead) return;
            this.advanceResources(dt);
            this.stamina = Math.min(this.maxStamina, this.stamina + 18 * dt);
        }

        findMantleTarget(physics, tilemap, obstacles, directionX, directionY, bodyHeight) {
            if (!physics?.arenaSurfacesAt) return null;
            let best = null;
            let bestDistance = Infinity;
            for (const surface of tilemap?.arena?.surfaces || []) {
                const rise = surface.top - this.yElevation;
                if (rise < 12 || rise > 108) continue;
                const minX = surface.minX + this.radius + 2;
                const maxX = surface.maxX - this.radius - 2;
                const minZ = surface.minZ + this.radius + 2;
                const maxZ = surface.maxZ - this.radius - 2;
                if (minX >= maxX || minZ >= maxZ) continue;
                const alreadyOnDeck = this.x >= minX && this.x <= maxX && this.y >= minZ && this.y <= maxZ;
                if (alreadyOnDeck) continue;
                const x = Math.max(minX, Math.min(maxX, this.x));
                const z = Math.max(minZ, Math.min(maxZ, this.y));
                const distance = Math.hypot(x - this.x, z - this.y);
                if (distance > 42 || distance >= bestDistance) continue;
                if (directionX * (x - this.x) + directionY * (z - this.y) < -2) continue;
                if (physics.isColliding(x, z, this.radius, tilemap, obstacles, this)) continue;
                if (physics.ceilingAt(tilemap, x, z) < surface.top + bodyHeight) continue;
                const landingSurfaces = physics.arenaSurfacesAt(tilemap, x, z);
                if (landingSurfaces.some(other => other.top > surface.top && other.bottom < surface.top + bodyHeight)) continue;
                best = { x, z, elevation: surface.top };
                bestDistance = distance;
            }
            return best;
        }

        update(dt, input, physics, tilemap) {
            if (this.isDead) return;

            const GameData = window.GraveGainGameData || {};
            const Race = GameData.Race || { HUMAN: 'human', ELF: 'elf', DWARF: 'dwarf', ORC: 'orc' };
            this.advanceResources(dt);

            // Movement vector relative to look yaw
            let moveX = 0;
            let moveZ = 0;

            if (input.keys['KeyW'] || input.keys['ArrowUp']) moveZ -= 1;
            if (input.keys['KeyS'] || input.keys['ArrowDown']) moveZ += 1;
            if (input.keys['KeyA'] || input.keys['ArrowLeft']) moveX -= 1;
            if (input.keys['KeyD'] || input.keys['ArrowRight']) moveX += 1;

            // Mobile virtual joystick input
            if (input.joystick && input.joystick.active) {
                moveX += input.joystick.x;
                moveZ += input.joystick.y;
            }
            const moveLen = Math.hypot(moveX, moveZ);
            const wasGrounded = this.grounded;
            const priorVx = this.vx;
            const priorVy = this.vy;

            this.slideTimer = Math.max(0, this.slideTimer - dt);
            this.slideHopTimer = Math.max(0, this.slideHopTimer - dt);
            this.momentumShotTimer = Math.max(0, this.momentumShotTimer - dt);
            this.slideCooldown = Math.max(0, this.slideCooldown - dt);
            this.dropThroughTimer = Math.max(0, this.dropThroughTimer - dt);
            this.isSliding = this.slideTimer > 0;
            this.dodgeTimer = Math.max(0, this.dodgeTimer - dt);
            this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
            let currentSpeed = this.speed * 1.25;
            if (this.hasPerk('swift')) currentSpeed *= 1.25;

            this.crouching = this.isSliding || !!(input.keys['ControlLeft'] || input.keys['ControlRight'] || input.keys['KeyC']);
            if (this.overclockTimer > 0) currentSpeed *= 1.3;
            const shiftHeld = Boolean(input.keys.ShiftLeft || input.keys.ShiftRight);
            const cosYaw = Math.cos(this.yaw);
            const sinYaw = Math.sin(this.yaw);
            const directionX = (moveX * cosYaw + moveZ * sinYaw) / Math.max(1, moveLen);
            const directionY = (-moveX * sinYaw + moveZ * cosYaw) / Math.max(1, moveLen);
            const touchSprint = Boolean(input.cryptStick?.sprint);
            const dedicatedDodge = this.dodgeRequested;
            const shiftDodge = shiftHeld && !this.shiftHeld && !touchSprint && (Math.abs(moveX) > 0.05 || moveZ > 0.05);
            this.dodgeRequested = false;
            if ((dedicatedDodge || shiftDodge) &&
                this.grounded && !this.crouching && !this.isBlocking && this.dodgeCooldown === 0) {
                this.dodgeTimer = 0.16;
                this.dodgeCooldown = 0.45;
                const dodgeSpeed = currentSpeed * 2.6;
                const directionLength = Math.hypot(directionX, directionY);
                this.dodgeVx = moveLen > 0.05 ? directionX * dodgeSpeed / directionLength : -sinYaw * dodgeSpeed;
                this.dodgeVy = moveLen > 0.05 ? directionY * dodgeSpeed / directionLength : -cosYaw * dodgeSpeed;
            }
            this.shiftHeld = shiftHeld;
            const isRunning = !this.crouching && !this.isBlocking && shiftHeld &&
                this.dodgeTimer === 0 && (moveZ < -0.05 || (touchSprint && moveLen > 0.05));
            const carriesSprintThroughAir = shiftHeld && !this.crouching && !this.isBlocking &&
                (moveZ < -0.05 || (touchSprint && moveLen > 0.05));
            this.sprinting = isRunning;
            const aiming = !!input.mouse?.aiming && !isRunning;
            if (isRunning) {
                this.sprintBlend = Math.min(1, this.sprintBlend + (wasGrounded ? dt : 0));
            } else if (!carriesSprintThroughAir) {
                this.sprintBlend = Math.max(0, this.sprintBlend - dt * 6);
            }
            if (!this.crouching && !this.isBlocking && !aiming) {
                currentSpeed *= 1 + 1.2 * Math.pow(this.sprintBlend, 0.8);
            }
            this.stamina = Math.min(this.maxStamina, this.stamina + 18 * dt);

            if (this.crouching) currentSpeed *= 0.58;
            if (aiming) currentSpeed *= 0.78;

            if (this.isBlocking) {
                currentSpeed *= 0.55;
            }

            if (this.isSliding) {
                const progress = this.slideTimer / this.slideDuration;
                const momentum = 0.62 + 0.48 * progress;
                if (moveLen > 0.05) {
                    const slideSpeed = Math.hypot(this.slideVx, this.slideVy);
                    const steer = Math.min(0.25, dt * 2.4);
                    const x = this.slideVx * (1 - steer) + directionX * slideSpeed * steer;
                    const y = this.slideVy * (1 - steer) + directionY * slideSpeed * steer;
                    const length = Math.hypot(x, y);
                    if (length > 0) {
                        this.slideVx = x * slideSpeed / length;
                        this.slideVy = y * slideSpeed / length;
                    }
                }
                this.vx = this.slideVx * momentum;
                this.vy = this.slideVy * momentum;
            } else if (this.dodgeTimer > 0) {
                this.vx = this.dodgeVx;
                this.vy = this.dodgeVy;
            } else if (moveLen > 0.05) {
                this.vx = directionX * currentSpeed;
                this.vy = directionY * currentSpeed;
            } else {
                this.vx = 0;
                this.vy = 0;
            }

            // Tactical peek lean inspired by DebateFPS.
            let targetLean = input.keys['KeyZ'] ? -1 : (input.keys['KeyX'] ? 1 : 0);
            if (this.isSliding || !this.grounded) targetLean = 0;
            const leanDistance = 9;
            const leanX = this.x + Math.cos(this.yaw) * targetLean * leanDistance;
            const leanY = this.y - Math.sin(this.yaw) * targetLean * leanDistance;
            const game = window.GraveGainGame;
            const movementObstacles = [
                ...(game?.props || []),
                ...(game?.enemies || []).filter(enemy => enemy && enemy.hp > 0 && Math.abs(this.yElevation - enemy.yElevation) < 26)
            ];
            if (targetLean && physics?.isColliding(leanX, leanY, 5, tilemap, movementObstacles)) targetLean = 0;
            this.lean += (targetLean - this.lean) * Math.min(1, dt * 10);

            // Hazard floor effects
            const tx = Math.floor(this.x / 48);
            const ty = Math.floor(this.y / 48);
            if (this.yElevation < 14 && tilemap?.grid?.[tx]) {
                const cell = tilemap.grid[tx][ty];
                if (cell === 2) { // Water
                    this.vx *= 0.6;
                    this.vy *= 0.6;
                } else if (cell === 3 && this.race !== Race.DWARF) { // Poison
                    this.takeDamage(10 * dt, 'poison');
                } else if (cell === 4) { // Fire
                    this.takeDamage(15 * dt, 'fire');
                }
            }

            // Jump & Vertical physics
            const pad = tilemap?.arena?.launchPad;
            const launching = pad && this.grounded && this.yElevation <= 4 &&
                Math.hypot(this.x - pad.x, this.y - pad.z) <= pad.radius;
            this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
            if (!input.keys['Space']) this.jumpPressConsumed = false;
            const jumpPressed = input.keys['Space'] && !this.jumpPressConsumed;
            const renderedEyeHeight = window.GraveGainGame?.cameraEyeHeight || 20;
            const bodyHeight = Math.max(renderedEyeHeight, this.crouching ? 13 : 20) + 6;
            const mantleTarget = jumpPressed && !this.grounded
                ? this.findMantleTarget(physics, tilemap, movementObstacles, directionX, directionY, bodyHeight)
                : null;
            if (jumpPressed) {
                this.jumpPressConsumed = true;
                this.jumpBuffer = 0.11;
            }
            // Down + jump drops through a raised combat deck. Move just below
            // its top before gravity runs so floor selection picks the next
            // lower deck instead of immediately grounding us again.
            const dropThrough = jumpPressed && this.grounded && this.yElevation >= 18 && moveZ > 0.05;
            if (launching) {
                this.jumpBuffer = 0;
                this.slideTimer = 0;
                this.isSliding = false;
                this.dodgeTimer = 0;
                this.platVy = 425;
                this.grounded = false;
                this.vx = (pad.landingX - this.x) / 0.9;
                this.vy = (pad.landingZ - this.y) / 0.9;
                this.doubleJumpsLeft = this.race === Race.DWARF ? 1 : 0;
                const game = window.GraveGainGame;
                game?.audio?.playSfx('spell', 1.8);
                game?.vfx?.spawnSparks(pad.x, pad.z, 0x7df5dd, 12, 3);
            } else if (dropThrough) {
                this.jumpBuffer = 0;
                this.yElevation -= 2;
                this.platVy = -48;
                this.dropThroughTimer = 0.24;
                this.grounded = false;
                this.doubleJumpsLeft = 0;
                window.GraveGainGame?.audio?.playSfx('footstep', 0.72);
            } else if (mantleTarget) {
                this.jumpBuffer = 0;
                this.mantleMotion = {
                    startX: this.x, startZ: this.y, startElevation: this.yElevation,
                    ...mantleTarget, elapsed: 0, duration: 0.18
                };
                this.platVy = 0;
                this.vx = 0;
                this.vy = 0;
                this.doubleJumpsLeft = 0;
                window.GraveGainGame?.audio?.playSfx('swing', 1.15);
            } else if (this.grounded && this.jumpBuffer > 0) {
                this.jumpBuffer = 0;
                if (this.isSliding) {
                    const timedHop = this.slideHopTimer > 0;
                    const carry = timedHop ? 1.18 : 0.9;
                    this.vx *= carry;
                    this.vy *= carry;
                    if (timedHop) {
                        this.momentumShotTimer = 2.5;
                        window.GraveGainGame?.combatText?.spawnText(this.x, 27, this.y, 'SLIDE HOP · FLOW SHOT READY', 'block');
                    }
                }
                this.slideHopTimer = 0;
                this.slideTimer = 0;
                this.isSliding = false;
                // A high, floaty jump supports the expanded multi-level rooms.
                this.platVy = 520;
                this.grounded = false;
                this.doubleJumpsLeft = this.race === Race.DWARF ? 1 : 0;
                if (window.GraveGainGame) window.GraveGainGame.audio.playSfx('swing', 1.4);
            } else if (jumpPressed && !this.grounded && this.race === Race.DWARF && this.doubleJumpsLeft > 0) {
                this.jumpBuffer = 0;
                this.platVy = 420;
                this.doubleJumpsLeft--;
                if (window.GraveGainGame) window.GraveGainGame.audio.playSfx('swing', 1.7);
            } else if (input.keys['Space'] && !this.grounded && this.dropThroughTimer <= 0 && this.race === Race.HUMAN && this.stamina > 5) {
                this.platVy = Math.min(180, this.platVy + 400 * dt);
                this.stamina = Math.max(0, this.stamina - 30 * dt);
            }

            const surfaces = physics.arenaSurfacesAt(tilemap, this.x, this.y);
            const floorHeight = surfaces.reduce((floor, s) => s.top <= this.yElevation ? Math.max(floor, s.top) : floor, 0);
            if (this.mantleMotion) {
                const mantle = this.mantleMotion;
                mantle.elapsed = Math.min(mantle.duration, mantle.elapsed + dt);
                const progress = mantle.elapsed / mantle.duration;
                const eased = progress * progress * (3 - 2 * progress);
                this.x = mantle.startX + (mantle.x - mantle.startX) * eased;
                this.y = mantle.startZ + (mantle.z - mantle.startZ) * eased;
                this.yElevation = mantle.startElevation + (mantle.elevation - mantle.startElevation) * eased;
                this.grounded = progress >= 1;
                if (this.grounded) {
                    this.yElevation = mantle.elevation;
                    this.platVy = 0;
                    this.mantleMotion = null;
                    this.momentumShotTimer = 2.5;
                    window.GraveGainGame?.combatText?.spawnText(this.x, this.yElevation + 28, this.y, 'MANTLE · FLOW SHOT READY', 'block');
                }
            } else if (!this.grounded || this.yElevation > floorHeight) {
                if (wasGrounded) {
                    this.airSpeed = Math.hypot(this.vx, this.vy);
                } else {
                    const steer = moveLen > 0.05 ? Math.min(0.35, dt * 3) : 0;
                    const speedLimit = Math.max(this.airSpeed, this.speed * 0.95);
                    this.vx = priorVx * (1 - steer) + directionX * speedLimit * steer;
                    this.vy = priorVy * (1 - steer) + directionY * speedLimit * steer;
                }
                this.grounded = false;
                this.platVy -= 750 * dt;
                this.yElevation += this.platVy * dt;
                const roomCeiling = physics.ceilingAt(tilemap, this.x, this.y);
                const ceilingHeight = surfaces.reduce((ceiling, s) => s.bottom >= floorHeight + bodyHeight ? Math.min(ceiling, s.bottom) : ceiling, roomCeiling);
                const ceilingLimit = ceilingHeight - bodyHeight;
                if (this.yElevation > ceilingLimit) {
                    this.yElevation = ceilingLimit;
                    if (this.platVy > 0) this.platVy = 0;
                }
                if (this.yElevation <= floorHeight) {
                    const impact = Math.min(1, Math.max(0, -this.platVy) / 420);
                    this.yElevation = floorHeight;
                    this.platVy = 0;
                    this.grounded = true;
                    const game = window.GraveGainGame;
                    if (impact > 0 && game) {
                        game.cameraController?.applyPunch(0.012 + impact * 0.02, 0);
                        game.cameraController?.applyShake(impact * 1.2);
                        game.audio?.playSfx('footstep', 0.82 + impact * 0.28);
                        this.footstepTimer = Math.max(this.footstepTimer, 0.12 + impact * 0.12);
                    }
                }
            }

            const previousX = this.x;
            const previousY = this.y;
            physics.moveEntityWithCollision(this, this.vx * dt, this.vy * dt, tilemap, movementObstacles, bodyHeight);
            if (!this.grounded && dt > 0) {
                this.vx = (this.x - previousX) / dt;
                this.vy = (this.y - previousY) / dt;
            }
            const actualMove = Math.hypot(this.x - previousX, this.y - previousY);
            this.footstepTimer -= dt;
            if (this.grounded && !this.isSliding && actualMove > 0.75) {
                if (this.footstepTimer <= 0 && window.GraveGainGame?.audio) {
                    const sprintFeedback = this.crouching ? 0 : Math.max(0, Math.min(1, this.sprintBlend));
                    const basePitch = this.crouching ? 0.78 : 1 + 0.18 * sprintFeedback;
                    const pitch = basePitch * (this.footstepSide ? 1.04 : 0.96);
                    window.GraveGainGame.audio.playSfx('footstep', pitch);
                    this.footstepSide = 1 - this.footstepSide;
                    this.footstepTimer = this.crouching ? 0.52 : 0.39 - 0.12 * sprintFeedback;
                }
            } else if (!this.grounded || this.isSliding) {
                this.footstepTimer = Math.min(this.footstepTimer, 0.08);
            }
        }

        hasPerk(id) {
            return this.perks.some(p => p.id === id);
        }

        takeDamage(dmg, type = 'normal', source = null) {
            if (window.gameDebug?.godMode || this.stoneForm || this.isDead) return;
            const companion = window.GraveGainGame?.companion;
            if (companion && companion.time < companion.rescueUntil) return;

            const GameData = window.GraveGainGameData || {};
            const ClassType = GameData.ClassType || { TANK: 'tank' };
            const Race = GameData.Race || { ORC: 'orc' };

            // Blocking logic
            if (this.isBlocking) {
                if (this.parryWindow > 0) {
                    // Perfect Parry!
                    if (window.GraveGainGame) {
                        window.GraveGainGame.combatText.spawnText(this.x, 20, this.y, 'PARRIED!', 'block');
                        window.GraveGainGame.audio.playSfx('block', 1.3);
                        window.GraveGainGame.vfx.spawnSparks(this.x, this.y, 0x38bdf8, 20);
                    }
                    return;
                }
                const blockPercent = this.classType === ClassType.TANK ? 0.90 : 0.75;
                dmg *= (1.0 - blockPercent);
                if (window.GraveGainGame) {
                    window.GraveGainGame.combatText.spawnText(this.x, 20, this.y, 'BLOCKED!', 'block');
                    window.GraveGainGame.audio.playSfx('block');
                }
            }

            if (this.hasPerk('ironclad')) {
                dmg *= 0.80;
            }

            if (this.race === Race.ORC) {
                this.rage = Math.min(100, this.rage + dmg * 0.8);
            }

            if (this.shieldBubble > 0) {
                const absorbed = Math.min(this.shieldBubble, dmg);
                this.shieldBubble -= absorbed;
                dmg -= absorbed;
                this.shieldCooldown = 5.0;
            }

            this.hp = Math.max(0, this.hp - dmg);

            if (window.GraveGainGame) {
                window.GraveGainGame.showDamageFeedback(dmg);
                if (source) window.GraveGainGame.showDamageDirection(source);
                window.GraveGainGame.cameraController.applyShake(6);
                window.GraveGainGame.audio.playSfx('hit', 0.8);
                window.GraveGainGame.combatText.spawnText(this.x, 20, this.y, `-${Math.round(dmg)}`, 'player-dmg');
            }

            if (this.hp <= 0 && !this.isDead) {
                if (companion?.revive(this)) {
                    window.GraveGainGame.combatText.showBanner(`${companion.name.toUpperCase()} REVIVED YOU`);
                    return;
                }
                this.isDead = true;
                if (window.GraveGainGame) window.GraveGainGame.gameOver(false);
            }
        }

        addXp(amt) {
            this.xp += amt;
            if (window.GraveGainGame) {
                window.GraveGainGame.combatText.spawnText(this.x, 20, this.y, `+${amt} XP`, 'xp');
            }
            if (this.xp >= this.xpNext) {
                this.xp -= this.xpNext;
                this.level++;
                this.xpNext = Math.floor(this.xpNext * 2.1);
                if (window.GraveGainGame) window.GraveGainGame.triggerLevelUp();
            }
        }

        triggerAbility() {
            if (this.abilityCooldown > 0) return;
            this.abilityCooldown = 7.0;

            const game = window.GraveGainGame;
            if (!game) return;

            const GameData = window.GraveGainGameData || {};
            const Race = GameData.Race || { HUMAN: 'human', ELF: 'elf', DWARF: 'dwarf', ORC: 'orc' };

            if (this.race === Race.HUMAN) {
                this.shieldBubble = 35.0;
                game.audio.playSfx('spell', 1.2);
                game.vfx.spawnSparks(this.x, this.y, 0x00d2ff, 25);
                game.combatText.spawnText(this.x, 20, this.y, 'SHIELD WALL!', 'heal');
            } else if (this.race === Race.ELF) {
                game.audio.playSfx('spell', 1.5);
                game.vfx.spawnSparks(this.x, this.y, 0x4cff7f, 35);
                game.dealAoEDamage(this.x, this.y, 160, 45, 'nature');
                game.combatText.spawnText(this.x, 20, this.y, 'NATURE BURST!', 'heal');
            } else if (this.race === Race.DWARF) {
                this.stoneForm = true;
                this.stoneDuration = 5.0;
                game.audio.playSfx('block', 0.8);
                game.vfx.spawnSparks(this.x, this.y, 0xffcc4c, 30);
                game.combatText.spawnText(this.x, 20, this.y, 'STONE FORM!', 'block');
            } else if (this.race === Race.ORC) {
                const burstDmg = 35 + this.rage * 0.75;
                this.rage = 0;
                game.audio.playSfx('explode', 1.1);
                game.cameraController.applyShake(10);
                game.vfx.spawnSparks(this.x, this.y, 0xff4c4c, 40);
                game.dealAoEDamage(this.x, this.y, 180, burstDmg, 'rage');
                game.combatText.spawnText(this.x, 20, this.y, 'RAGE BURST!', 'crit');
            }
        }
    }

    window.GraveGainPlayerEntity = PlayerEntity;
})();
