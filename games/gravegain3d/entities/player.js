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
            this.xpNext = 60;
            this.isDead = false;
            this.isBlocking = false;
            this.sprinting = false;
            this.parryWindow = 0;

            this.potions = 1 + (permanentStats.potions || 0);
            this.perks = [];

            // Movement physics
            this.grounded = true;
            this.platVy = 0;
            this.doubleJumpsLeft = 0;
            this.jumpPressConsumed = false;
            this.abilityCooldown = 0;
            this.crouching = false;
            this.isSliding = false;
            this.slideTimer = 0;
            this.slideCooldown = 0;
            this.slideDuration = 0.68;
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

            this.slideTimer = Math.max(0, this.slideTimer - dt);
            this.slideCooldown = Math.max(0, this.slideCooldown - dt);
            this.isSliding = this.slideTimer > 0;
            let currentSpeed = this.speed;
            if (this.hasPerk('swift')) currentSpeed *= 1.25;

            this.crouching = this.isSliding || !!(input.keys['ControlLeft'] || input.keys['ControlRight'] || input.keys['KeyC']);
            if (this.overclockTimer > 0) currentSpeed *= 1.3;
            const isRunning = !this.crouching && (input.keys['ShiftLeft'] || input.keys['ShiftRight']) &&
                this.stamina > 5 && moveLen > 0.05;
            this.sprinting = isRunning;
            const aiming = !!input.mouse?.aiming && !isRunning;
            if (isRunning) {
                currentSpeed *= 1.4;
                const cost = this.hasPerk('swift') ? 12 : 20;
                this.stamina = Math.max(0, this.stamina - cost * dt);
            } else {
                this.stamina = Math.min(this.maxStamina, this.stamina + 18 * dt);
            }

            if (this.crouching) currentSpeed *= 0.58;
            if (aiming) currentSpeed *= 0.78;

            if (this.isBlocking) {
                currentSpeed *= 0.55;
            }

            if (this.isSliding) {
                const progress = this.slideTimer / this.slideDuration;
                const momentum = 0.62 + 0.48 * progress;
                this.vx = this.slideVx * momentum;
                this.vy = this.slideVy * momentum;
            } else if (moveLen > 0.05) {
                const normX = moveX / Math.max(1, moveLen);
                const normZ = moveZ / Math.max(1, moveLen);

                const cosYaw = Math.cos(this.yaw);
                const sinYaw = Math.sin(this.yaw);
                this.vx = (normX * cosYaw + normZ * sinYaw) * currentSpeed;
                this.vy = (-normX * sinYaw + normZ * cosYaw) * currentSpeed;
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
                ...(game?.enemies || []).filter(enemy => enemy && enemy.hp > 0)
            ];
            if (targetLean && physics?.isColliding(leanX, leanY, 5, tilemap, movementObstacles)) targetLean = 0;
            this.lean += (targetLean - this.lean) * Math.min(1, dt * 10);

            // Hazard floor effects
            const tx = Math.floor(this.x / 48);
            const ty = Math.floor(this.y / 48);
            if (tilemap && tilemap.grid && tilemap.grid[tx]) {
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
            if (!input.keys['Space']) this.jumpPressConsumed = false;
            if (input.keys['Space'] && this.grounded && !this.jumpPressConsumed) {
                this.jumpPressConsumed = true;
                this.slideTimer = 0;
                this.isSliding = false;
                this.platVy = 280;
                this.grounded = false;
                this.doubleJumpsLeft = this.race === Race.DWARF ? 1 : 0;
                if (window.GraveGainGame) window.GraveGainGame.audio.playSfx('swing', 1.4);
            } else if (input.keys['Space'] && !this.grounded && this.race === Race.DWARF && this.doubleJumpsLeft > 0 && !this.jumpPressConsumed) {
                this.jumpPressConsumed = true;
                this.platVy = 230;
                this.doubleJumpsLeft--;
                if (window.GraveGainGame) window.GraveGainGame.audio.playSfx('swing', 1.7);
            } else if (input.keys['Space'] && !this.grounded && this.race === Race.HUMAN && this.stamina > 5) {
                this.platVy = Math.min(180, this.platVy + 400 * dt);
                this.stamina = Math.max(0, this.stamina - 30 * dt);
            }

            if (!this.grounded) {
                this.platVy -= 750 * dt;
                this.yElevation += this.platVy * dt;
                const renderedEyeHeight = window.GraveGainGame?.cameraEyeHeight || 20;
                const bodyEyeHeight = this.crouching ? 13 : 20;
                const ceilingLimit = Math.max(0, 72 - Math.max(renderedEyeHeight, bodyEyeHeight) - 6);
                if (this.yElevation > ceilingLimit) {
                    this.yElevation = ceilingLimit;
                    if (this.platVy > 0) this.platVy = 0;
                }
                if (this.yElevation <= 0) {
                    const impact = Math.min(1, Math.max(0, -this.platVy) / 420);
                    this.yElevation = 0;
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
            physics.moveEntityWithCollision(this, this.vx * dt, this.vy * dt, tilemap, movementObstacles);
            const actualMove = Math.hypot(this.x - previousX, this.y - previousY);
            this.footstepTimer -= dt;
            if (this.grounded && !this.isSliding && actualMove > 0.75) {
                if (this.footstepTimer <= 0 && window.GraveGainGame?.audio) {
                    const pitch = (this.sprinting ? 1.18 : (this.crouching ? 0.78 : 1)) * (this.footstepSide ? 1.04 : 0.96);
                    window.GraveGainGame.audio.playSfx('footstep', pitch);
                    this.footstepSide = 1 - this.footstepSide;
                    this.footstepTimer = this.sprinting ? 0.27 : (this.crouching ? 0.52 : 0.39);
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
                this.xpNext = Math.floor(this.xpNext * 1.55);
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
