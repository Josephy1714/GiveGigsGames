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

            const isCompiledBuild = permanentStats && typeof permanentStats.bonusHp === 'number' && permanentStats.perks;
            const perm = isCompiledBuild
                ? permanentStats
                : (window.GraveGainSkillTrees?.computePermanentBuild
                    ? window.GraveGainSkillTrees.computePermanentBuild(race, classType, permanentStats)
                    : {
                        bonusHp: (permanentStats?.health || 0) * 25,
                        hpRegenBonus: 0,
                        maxShield: (permanentStats?.shields || 0) * 15,
                        shieldRegenBonus: 0,
                        shieldDelayMult: 1,
                        moveSpeedMult: permanentStats?.speed ? (1.0 + permanentStats.speed * 0.1) : 1.0,
                        sprintSpeedMult: 1,
                        slideSpeedMult: 1,
                        slideCooldownMult: 1,
                        jumpMult: 1,
                        extraDoubleJumps: 0,
                        jetpackThrustMult: 1,
                        jetpackDrainMult: 1,
                        airGravityMult: 1,
                        cooldownMult: 1,
                        dodgeCooldownMult: 1,
                        abilityDurationBonus: 0,
                        damageReduction: 0,
                        blockBonus: 0,
                        manaMaxBonus: 0,
                        manaRegenBonus: 0,
                        rageGainMult: 1,
                        startingPotionsBonus: permanentStats?.potions || 0,
                        maxPotionsBonus: permanentStats?.potions || 0,
                        perks: {}
                    });
            this.perm = perm;

            this.maxHp = Math.round(rData.maxHp + (perm.bonusHp || 0));
            this.hp = this.maxHp;
            this.hpRegen = rData.hpRegen + (perm.hpRegenBonus || 0);
            this.stamina = rData.stamina;
            this.maxStamina = rData.stamina;

            this.speed = rData.speed * (perm.moveSpeedMult || 1.0);
            this.sprintMult = perm.sprintSpeedMult || 1.0;
            this.jumpMult = perm.jumpMult || 1.0;
            this.extraDoubleJumps = perm.extraDoubleJumps || 0;
            this.slideSpeedMult = perm.slideSpeedMult || 1.0;
            this.slideCooldownMult = perm.slideCooldownMult || 1.0;
            this.cooldownMult = perm.cooldownMult || 1.0;
            this.dodgeCooldownMult = perm.dodgeCooldownMult || 1.0;
            this.damageReduction = perm.damageReduction || 0;
            this.blockBonus = perm.blockBonus || 0;

            this.maxMana = 100 + (perm.manaMaxBonus || 0);
            this.mana = race === Race.ELF ? this.maxMana : 0;
            this.manaRegen = 3.0 + (perm.manaRegenBonus || 0);
            this.rage = 0;
            this.maxShield = (race === Race.HUMAN ? 25 : 0) + (perm.maxShield || 0);
            this.shieldBubble = this.maxShield;
            this.shieldCooldown = 0;
            this.shieldRegen = 2.5 + (perm.shieldRegenBonus || 0);
            this.shieldDelayMult = perm.shieldDelayMult || 1.0;
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

            this.maxPotions = 5 + (perm.maxPotionsBonus || 0);
            this.potions = 1 + (perm.startingPotionsBonus || 0);
            this.perks = [];
            this.bloodthirstStacks = 0;
            this.bloodthirstTimer = 0;
            this.riposteBuffTimer = 0;
            this.comboBuffTimer = 0;
            this.medMistTimer = 0;
            this.dodgeCritTimer = 0;
            this.quickdrawShots = 0;
            this.shotCounter = 0;
            this.immortalUsedFloor = false;
            this.bombardierTimer = 0;
            this.bombardierKills = 0;

            // Movement physics
            this.grounded = true;
            this.platVy = 0;
            this.isWallRunning = false;
            this.wallRunSide = 0;
            this.wallRunTimer = 0;
            this.wallRunCooldown = 0;
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
            const slideSpeed = Math.max(this.speed * 1.55, moveSpeed * 1.12) * (this.slideSpeedMult || 1);
            this.slideVx = directionX * slideSpeed;
            this.slideVy = directionY * slideSpeed;
            this.slideTimer = this.slideDuration;
            this.slideHopTimer = 0.32;
            this.slideCooldown = 0.8 * (this.slideCooldownMult || 1);
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

            if (!this.stoneForm) {
                this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
            } else if (this.hasPermanentPerk('d_capstone_colossus')) {
                this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.04 * dt);
            }
            if (this.race === Race.ELF) this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * dt);
            if (this.race === Race.ORC) {
                const rageFloor = this.hasPermanentPerk('o_capstone_juggernaut') ? 25 : 0;
                if (this.rage > rageFloor) this.rage = Math.max(rageFloor, this.rage - 3.0 * dt);
            }
            if (this.maxShield > 0) {
                this.shieldCooldown = Math.max(0, this.shieldCooldown - dt);
                if (this.shieldCooldown <= 0) {
                    this.shieldBubble = Math.min(this.maxShield, this.shieldBubble + this.shieldRegen * dt);
                }
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
            this.riposteBuffTimer = Math.max(0, this.riposteBuffTimer - dt);
            this.comboBuffTimer = Math.max(0, this.comboBuffTimer - dt);
            this.medMistTimer = Math.max(0, this.medMistTimer - dt);
            this.dodgeCritTimer = Math.max(0, this.dodgeCritTimer - dt);
            if (this.bloodthirstTimer > 0) {
                this.bloodthirstTimer = Math.max(0, this.bloodthirstTimer - dt);
                if (this.bloodthirstTimer === 0) this.bloodthirstStacks = 0;
            }
            if (this.hasPermanentPerk('d_capstone_bombardier')) {
                const game = window.GraveGainGame;
                if (game && game.grenades < (game.maxGrenades || 5)) {
                    this.bombardierTimer += dt;
                    if (this.bombardierTimer >= 18) {
                        this.bombardierTimer = 0;
                        game.grenades++;
                        game.combatText?.spawnText(this.x, 24, this.y, '+1 GRENADE SYNTHESIZED', 'block');
                        game.updateWeaponHUD?.();
                    }
                }
            }
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
            if (this.medMistTimer > 0) currentSpeed *= 1.15;
            if (this.bloodthirstTimer > 0 && this.bloodthirstStacks > 0) {
                currentSpeed *= 1 + this.bloodthirstStacks * 0.08 * (this.hasPermanentPerk('o_bloodthirst') || 1);
            }
            if (this.hasPermanentPerk('o_capstone_juggernaut')) {
                currentSpeed *= 1 + Math.floor(this.rage / 10) * 0.02;
            }

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
                this.dodgeCooldown = 0.45 * (this.dodgeCooldownMult || 1);
                const dodgeSpeed = currentSpeed * 2.6;
                const directionLength = Math.hypot(directionX, directionY);
                this.dodgeVx = moveLen > 0.05 ? directionX * dodgeSpeed / directionLength : -sinYaw * dodgeSpeed;
                this.dodgeVy = moveLen > 0.05 ? directionY * dodgeSpeed / directionLength : -cosYaw * dodgeSpeed;
                if (this.hasPermanentPerk('e_feather')) {
                    this.dodgeCritTimer = 2.0;
                }
                if (this.hasPermanentPerk('w_riposte')) {
                    this.riposteBuffTimer = 4.0;
                    const g = window.GraveGainGame;
                    const rRank = this.hasPermanentPerk('w_riposte');
                    if (g?.dealAoEDamage) {
                        g.dealAoEDamage(this.x, this.y, 130, 30 * rRank, 'shock');
                        g.vfx?.spawnSparks(this.x, this.y, 0x38bdf8, 14);
                    }
                }
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
                currentSpeed *= 1 + 1.2 * (this.sprintMult || 1) * Math.pow(this.sprintBlend, 0.8);
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
            if (this.isWallRunning) targetLean = this.wallRunSide * 0.2;
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
                this.platVy = 425 * (this.jumpMult || 1);
                this.grounded = false;
                this.vx = (pad.landingX - this.x) / 0.9;
                this.vy = (pad.landingZ - this.y) / 0.9;
                this.doubleJumpsLeft = (this.race === Race.DWARF ? 1 : 0) + (this.extraDoubleJumps || 0);
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
                        this.momentumShotTimer = this.hasPermanentPerk('h_airstrike') ? 4.0 : 2.5;
                        window.GraveGainGame?.combatText?.spawnText(this.x, 27, this.y, 'SLIDE HOP · FLOW SHOT READY', 'block');
                    }
                }
                this.slideHopTimer = 0;
                this.slideTimer = 0;
                this.isSliding = false;
                // A high, floaty jump supports the expanded multi-level rooms.
                this.platVy = 520 * (this.jumpMult || 1);
                this.grounded = false;
                this.doubleJumpsLeft = (this.race === Race.DWARF ? 1 : 0) + (this.extraDoubleJumps || 0);
                if (window.GraveGainGame) window.GraveGainGame.audio.playSfx('swing', 1.4);
            }

            // Titanfall 2-style Wall Running
            this.wallRunCooldown = Math.max(0, this.wallRunCooldown - dt);
            if (this.grounded || this.isSliding || this.mantleMotion) {
                this.isWallRunning = false;
                this.wallRunSide = 0;
                this.wallRunTimer = 0;
            } else if (this.wallRunCooldown <= 0 && !this.crouching) {
                const horizSpeed = Math.hypot(this.vx, this.vy);
                const probeDist = this.radius + 10;
                const rightX = -directionY;
                const rightY = directionX;
                const hitRight = !!(physics && tilemap && physics.isColliding(this.x + rightX * probeDist, this.y + rightY * probeDist, this.radius * 0.55, tilemap));
                const hitLeft = !!(physics && tilemap && physics.isColliding(this.x - rightX * probeDist, this.y - rightY * probeDist, this.radius * 0.55, tilemap));
                const wallSide = hitRight ? 1 : (hitLeft ? -1 : 0);
                if (wallSide !== 0 && horizSpeed > 45 && this.wallRunTimer < 1.8) {
                    if (!this.isWallRunning) {
                        this.isWallRunning = true;
                        this.wallRunSide = wallSide;
                        this.platVy = Math.max(this.platVy, 40);
                        window.GraveGainGame?.audio?.playSfx('footstep', 1.15);
                    }
                    this.wallRunTimer += dt;
                    this.platVy = Math.max(this.platVy, -18);
                    const boostSpeed = Math.max(horizSpeed, this.speed * 1.45);
                    const dirLen = Math.hypot(this.vx, this.vy) || 1;
                    this.vx = (this.vx / dirLen) * boostSpeed;
                    this.vy = (this.vy / dirLen) * boostSpeed;
                    if (jumpPressed) {
                        this.jumpBuffer = 0;
                        this.isWallRunning = false;
                        this.wallRunCooldown = 0.25;
                        this.platVy = 500 * (this.jumpMult || 1);
                        this.vx -= rightX * wallSide * 260;
                        this.vy -= rightY * wallSide * 260;
                        window.GraveGainGame?.audio?.playSfx('swing', 1.45);
                    }
                } else {
                    this.isWallRunning = false;
                    this.wallRunSide = 0;
                }
            } else if (jumpPressed && !this.grounded && (this.race === Race.DWARF || this.extraDoubleJumps > 0) && this.doubleJumpsLeft > 0) {
                this.jumpBuffer = 0;
                this.platVy = 420 * (this.jumpMult || 1);
                this.doubleJumpsLeft--;
                if (window.GraveGainGame) window.GraveGainGame.audio.playSfx('swing', 1.7);
            } else if (input.keys['Space'] && !this.grounded && this.dropThroughTimer <= 0 && this.race === Race.HUMAN && this.stamina > 5) {
                const thrust = 400 * (this.perm?.jetpackThrustMult || 1);
                const maxHover = 180 * Math.min(1.5, this.perm?.jetpackThrustMult || 1);
                const drain = 30 * (this.perm?.jetpackDrainMult || 1);
                this.platVy = Math.min(maxHover, this.platVy + thrust * dt);
                this.stamina = Math.max(0, this.stamina - drain * dt);
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
                    this.momentumShotTimer = this.hasPermanentPerk('h_airstrike') ? 4.0 : 2.5;
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
                const glideScale = (input.keys['Space'] && this.platVy < 0 && this.hasPermanentPerk('e_feather'))
                    ? (this.perm?.airGravityMult || 0.72)
                    : 1;
                this.platVy -= 750 * glideScale * dt;
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
                        if (impact >= 0.72 && this.hasPermanentPerk('d_slam') && typeof game.dealAoEDamage === 'function') {
                            const slamDmg = 35 * this.hasPermanentPerk('d_slam');
                            game.dealAoEDamage(this.x, this.y, 130, slamDmg, 'rage');
                            game.vfx?.spawnSparks(this.x, this.y, 0xffcc4c, 18);
                            game.combatText?.spawnText(this.x, this.yElevation + 26, this.y, 'ANVIL DROP!', 'crit');
                        }
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

        hasPermanentPerk(id) {
            return Number(this.perm?.perks?.[id]) || 0;
        }

        takeDamage(dmg, type = 'normal', source = null) {
            if (window.gameDebug?.godMode || this.stoneForm || this.isDead) return;
            const game = window.GraveGainGame;
            const companion = game?.companion;
            if (companion && companion.time < companion.rescueUntil) return;

            const GameData = window.GraveGainGameData || {};
            const ClassType = GameData.ClassType || { TANK: 'tank' };
            const Race = GameData.Race || { ORC: 'orc' };
            const rawIncoming = dmg;

            // Blocking logic
            if (this.isBlocking) {
                if (this.parryWindow > 0) {
                    // Perfect Parry!
                    if (game) {
                        game.combatText.spawnText(this.x, 20, this.y, 'PARRIED!', 'block');
                        game.audio.playSfx('block', 1.3);
                        game.vfx.spawnSparks(this.x, this.y, 0x38bdf8, 20);
                        if (this.hasPermanentPerk('w_riposte')) {
                            this.riposteBuffTimer = 4.0;
                            game.dealAoEDamage?.(this.x, this.y, 130, 30 * this.hasPermanentPerk('w_riposte'), 'shock');
                        }
                    }
                    return;
                }
                const blockPercent = Math.min(0.95, (this.classType === ClassType.TANK ? 0.90 : 0.75) + (this.blockBonus || 0));
                dmg *= (1.0 - blockPercent);
                if (game) {
                    game.combatText.spawnText(this.x, 20, this.y, 'BLOCKED!', 'block');
                    game.audio.playSfx('block');
                    if (this.hasPermanentPerk('h_capstone_bastion') && rawIncoming > dmg) {
                        game.dealAoEDamage?.(this.x, this.y, 120, Math.round((rawIncoming - dmg) * 0.4), 'shock');
                    }
                }
            }

            if (this.hasPerk('ironclad')) {
                dmg *= 0.80;
            }
            if (this.damageReduction > 0) {
                dmg *= Math.max(0.2, 1 - this.damageReduction);
            }
            if ((this.sprinting || this.isSliding) && this.hasPermanentPerk('o_momentum')) {
                dmg *= Math.max(0.4, 1 - 0.14 * this.hasPermanentPerk('o_momentum'));
            }
            if (source && source.poisonTimer > 0 && this.hasPermanentPerk('s_capstone_swarm')) {
                dmg *= 0.80;
            }

            if (this.race === Race.ORC) {
                this.rage = Math.min(100, this.rage + dmg * 0.8 * (this.perm?.rageGainMult || 1));
            }

            if (this.hasPermanentPerk('t_thorns') && game) {
                const thornsRank = this.hasPermanentPerk('t_thorns');
                this.stamina = Math.min(this.maxStamina, this.stamina + 6);
                game.dealAoEDamage?.(this.x, this.y, 95, 25 * thornsRank, 'shock');
            }

            const shieldBefore = this.shieldBubble;
            if (this.shieldBubble > 0) {
                const absorbed = Math.min(this.shieldBubble, dmg);
                this.shieldBubble -= absorbed;
                dmg -= absorbed;
                this.shieldCooldown = 5.0 * (this.shieldDelayMult || 1);
                if (absorbed > 0 && this.hasPermanentPerk('h_capstone_bastion') && game) {
                    game.dealAoEDamage?.(this.x, this.y, 120, Math.round(absorbed * 0.4), 'shock');
                }
                if (shieldBefore > 0 && this.shieldBubble <= 0 && this.hasPermanentPerk('h_nova') && game) {
                    const novaRank = this.hasPermanentPerk('h_nova');
                    game.dealAoEDamage?.(this.x, this.y, 140, 40 * novaRank, 'shock');
                    game.enemies?.forEach(e => {
                        if (e.hp > 0 && Math.hypot(e.x - this.x, e.y - this.y) <= 140) {
                            e.chillTimer = Math.max(e.chillTimer || 0, 2.5);
                        }
                    });
                    game.vfx?.spawnSparks(this.x, this.y, 0x38bdf8, 24);
                    game.combatText?.spawnText(this.x, 26, this.y, 'CAPACITOR DISCHARGE!', 'block');
                }
            }

            this.hp = Math.max(0, this.hp - dmg);

            if (this.hp > 0 && this.hp / this.maxHp <= 0.25 && !this.immortalUsedFloor && this.hasPermanentPerk('t_capstone_immortal')) {
                this.immortalUsedFloor = true;
                this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.30));
                this.shieldBubble = Math.max(this.shieldBubble, this.maxShield || 40);
                if (game) {
                    game.vfx?.spawnSparks(this.x, this.y, 0x38bdf8, 28);
                    game.combatText?.showBanner('🏰 UNBREAKABLE CITADEL TRIGGERED!');
                }
            }

            if (game) {
                game.showDamageFeedback(dmg);
                if (source) game.showDamageDirection(source);
                game.cameraController.applyShake(6);
                game.audio.playSfx('hit', 0.8);
                game.combatText.spawnText(this.x, 20, this.y, `-${Math.round(dmg)}`, 'player-dmg');
            }

            if (this.hp <= 0 && !this.isDead) {
                if (companion?.revive(this)) {
                    game.combatText.showBanner(`${companion.name.toUpperCase()} REVIVED YOU`);
                    return;
                }
                this.isDead = true;
                if (game) game.gameOver(false);
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
            const cdScale = (this.cooldownMult || 1) * (this.hasPermanentPerk('h_capstone_bastion') ? 0.7 : 1);
            this.abilityCooldown = 7.0 * cdScale;

            const game = window.GraveGainGame;
            if (!game) return;

            const GameData = window.GraveGainGameData || {};
            const Race = GameData.Race || { HUMAN: 'human', ELF: 'elf', DWARF: 'dwarf', ORC: 'orc' };
            const spellScale = this.perm?.spellDamageMult || 1;

            if (this.race === Race.HUMAN) {
                const wallAmount = 35.0 + (this.hasPermanentPerk('h_capstone_bastion') ? 50.0 : 0);
                this.shieldBubble = Math.max(this.shieldBubble, Math.min(Math.max(this.maxShield, wallAmount), this.shieldBubble + wallAmount));
                game.audio.playSfx('spell', 1.2);
                game.vfx.spawnSparks(this.x, this.y, 0x00d2ff, 25);
                game.combatText.spawnText(this.x, 20, this.y, 'SHIELD WALL!', 'heal');
            } else if (this.race === Race.ELF) {
                const tempest = this.hasPermanentPerk('e_capstone_tempest');
                const radius = tempest ? 160 * 1.45 : 160;
                const dmg = Math.round(45 * spellScale);
                game.audio.playSfx('spell', 1.5);
                game.vfx.spawnSparks(this.x, this.y, 0x4cff7f, 35);
                const aliveBefore = (game.enemies || []).filter(e => e.hp > 0).length;
                game.dealAoEDamage(this.x, this.y, radius, dmg, 'nature');
                if (tempest && game.enemies) {
                    let killed = 0;
                    game.enemies.forEach(e => {
                        if (Math.hypot(e.x - this.x, e.y - this.y) <= radius) {
                            e.chillTimer = Math.max(e.chillTimer || 0, 3);
                            e.burnTimer = Math.max(e.burnTimer || 0, 3);
                        }
                    });
                    const aliveAfter = game.enemies.filter(e => e.hp > 0).length;
                    killed = Math.max(0, aliveBefore - aliveAfter);
                    if (killed > 0) this.abilityCooldown *= Math.max(0.25, 1 - 0.30 * killed);
                }
                game.combatText.spawnText(this.x, 20, this.y, 'NATURE BURST!', 'heal');
            } else if (this.race === Race.DWARF) {
                this.stoneForm = true;
                this.stoneDuration = 5.0 + (this.perm?.abilityDurationBonus || 0);
                game.audio.playSfx('block', 0.8);
                game.vfx.spawnSparks(this.x, this.y, 0xffcc4c, 30);
                game.combatText.spawnText(this.x, 20, this.y, 'STONE FORM!', 'block');
            } else if (this.race === Race.ORC) {
                const burstDmg = (35 + this.rage * 0.75) * spellScale;
                this.rage = this.hasPermanentPerk('o_capstone_juggernaut') ? 25 : 0;
                game.audio.playSfx('explode', 1.1);
                game.cameraController.applyShake(10);
                game.vfx.spawnSparks(this.x, this.y, 0xff4c4c, 40);
                const totalDealt = game.dealAoEDamage(this.x, this.y, 180, burstDmg, 'rage') || 0;
                if (this.hasPermanentPerk('o_capstone_undying')) {
                    const heal = Math.max(10, Math.round(totalDealt * 0.25));
                    this.hp = Math.min(this.maxHp, this.hp + heal);
                    const w = game.weaponInventory?.[game.activeWeaponIndex];
                    if (w && w.reserveAmmo > 0 && w.ammo < w.magazine) {
                        const refill = Math.min(Math.ceil(w.magazine * 0.5), w.magazine - w.ammo, w.reserveAmmo);
                        w.ammo += refill;
                        w.reserveAmmo -= refill;
                        game.updateWeaponHUD?.();
                    }
                    game.combatText.spawnText(this.x, 28, this.y, `UNDYING FURY +${heal} HP`, 'heal');
                }
                game.combatText.spawnText(this.x, 20, this.y, 'RAGE BURST!', 'crit');
            }

            if (this.hasPermanentPerk('s_medmist')) {
                const rank = this.hasPermanentPerk('s_medmist');
                this.shieldBubble = Math.min(Math.max(this.maxShield, this.shieldBubble + 20 * rank), this.shieldBubble + 20 * rank);
                this.medMistTimer = 5.0;
                game.combatText.spawnText(this.x, 28, this.y, 'BIO-BOOSTER MIST', 'heal');
            }

            if (this.hasPermanentPerk('m_capstone_chronos') && game.spawnProjectile && game.camera3d) {
                this.dodgeCooldown = 0;
                const forward = new THREE.Vector3();
                game.camera3d.getWorldDirection(forward);
                for (let i = -1; i <= 1; i++) {
                    const spread = i * 0.14;
                    const vx = (forward.x * Math.cos(spread) - forward.z * Math.sin(spread)) * 420;
                    const vz = (forward.x * Math.sin(spread) + forward.z * Math.cos(spread)) * 420;
                    game.spawnProjectile(this.x, this.yElevation + 18, this.y, vx, forward.y * 420, vz,
                        Math.round(28 * spellScale), true, 0xa855f7, 'magic');
                }
            }
        }
    }

    window.GraveGainPlayerEntity = PlayerEntity;
})();
