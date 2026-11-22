

function cycleCameraView() {
    const idx = CAMERA_MODES.indexOf(cameraMode);
    cameraMode = CAMERA_MODES[(idx + 1) % CAMERA_MODES.length];
    store.set('orbitaldrift_cam', cameraMode);
    const btn = $('od-cam-btn');
    if (btn) btn.textContent = '📷 ' + CAMERA_LABELS[cameraMode];
    showWaveBanner('CAMERA', CAMERA_LABELS[cameraMode]);
}

function updateCameraView(dt60) {
    if (!camera || !satellite) return;
    const satX = satellite.position.x;
    const satY = satellite.position.y;
    const tx = -Math.sin(satelliteAngle);
    const ty = Math.cos(satelliteAngle);
    const rx = Math.cos(satelliteAngle);
    const ry = Math.sin(satelliteAngle);

    let targetPos, targetLook;
    if (cameraMode === 'chase') {
        targetPos = new THREE.Vector3(
            satX - tx * 34 + rx * 12,
            satY - ty * 34 + ry * 12,
            18
        );
        targetLook = new THREE.Vector3(satX + tx * 22, satY + ty * 22, 0);
    } else if (cameraMode === 'forward') {
        targetPos = new THREE.Vector3(
            satX - tx * 4,
            satY - ty * 4,
            7.5
        );
        targetLook = new THREE.Vector3(satX + tx * 70, satY + ty * 70, -2);
    } else {
        targetPos = new THREE.Vector3(0, -230, 220);
        targetLook = new THREE.Vector3(0, 0, 0);
    }

    const lerpAmt = 1 - Math.pow(0.84, dt60);
    camPosCurrent.lerp(targetPos, lerpAmt);
    camLookCurrent.lerp(targetLook, lerpAmt);
    camera.position.copy(camPosCurrent);
    camera.up.set(0, 0, 1);
    camera.lookAt(camLookCurrent);
}

// Main Game Frame Logic
function animate(currentTime = performance.now()) {
    requestAnimationFrame(animate);
    if (!renderer || !scene) return;
    const rawDelta = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;
    const delta = Math.min(rawDelta, 0.05);
    const dt60 = delta * 60;
    const extSpeed = window.gameSpeedMultiplier || 1;

    starLayers.forEach((s) => { s.rotation.z += s.userData.speed * dt60; });
    nebulas.forEach((n) => {
        n.position.x += n.userData.drift * dt60;
        if (n.position.x > 320) n.position.x = -320;
        if (n.position.x < -320) n.position.x = 320;
    });
    if (planetUniforms) planetUniforms.uTime.value += delta;
    if (atmoMat) atmoMat.uniforms.uIntensity.value += (1.0 - atmoMat.uniforms.uIntensity.value) * 0.06 * dt60;

    if (gameActive && !isPaused) {
        if (dying) {
            dyingT += rawDelta;
            timeScale += (1 - timeScale) * 0.02 * dt60;
            if (dyingT > 1.5) { dying = false; timeScale = 1; gameOver(); }
        } else {
            timeElapsed++;
            elapsedSec += delta;

            // phases
            const newPhase = elapsedSec < 45 ? 1 : elapsedSec < 100 ? 2 : elapsedSec < 180 ? 3 : 4;
            if (newPhase !== phase) {
                phase = newPhase;
                const names = { 1: 'stable drift', 2: 'debris shower', 3: 'hunter orbit', 4: 'solar storm' };
                showWaveBanner('WAVE ' + phase, names[phase] || '');
                sfx.playPhaseUp();
                score += 150 * phase;
                integrity = Math.min(maxIntegrity, integrity + 25);
                updateShieldUI();
                $('hud-score').textContent = Math.floor(score);
            }
            // surge every ~30s in phase 4
            surgeCooldown -= delta;
            if (phase === 4 && surgeCooldown <= 0 && !surgeActive) {
                surgeActive = true; surgeT = 5;
                showWaveBanner('⚠ SURGE', 'debris ×2 - stardust worth more');
                sfx.playPhaseUp();
            }
            if (surgeActive) {
                surgeT -= delta;
                if (surgeT <= 0) { surgeActive = false; surgeCooldown = 25; }
            }
            sfx.setTempo(elapsedSec < 40 ? 132 : elapsedSec < 100 ? 148 : 162);

            planet.rotation.y += 0.006 * dt60;
            planet.rotation.z += 0.003 * dt60;
            if (rings) rings.rotation.z += 0.0006 * dt60;

            if (slingshotCD > 0) slingshotCD -= delta;
            secondaryBodies.forEach((b) => {
                b.currentAngle += b.speed * dt60;
                b.mesh.position.set(
                    Math.cos(b.currentAngle) * b.orbitR,
                    Math.sin(b.currentAngle) * b.orbitR,
                    0
                );
                b.mesh.rotation.y += 0.015 * dt60;
                const dist = satellite.position.distanceTo(b.mesh.position);
                if (dist < b.radius + 4.5 && !cloakActive && !shieldActive) {
                    if (slingshotCD <= 0) {
                        slingshotCD = 2.0;
                        integrity = Math.max(0, integrity - 18);
                        updateShieldUI();
                        screenShake = Math.max(screenShake, 8);
                        sfx.playHit();
                        scorePopup(satellite.position, b.name.toUpperCase() + ' IMPACT!', 'crit');
                        if (integrity <= 0) { dying = true; dyingT = 0; }
                    }
                } else if (dist < b.radius + 16 && slingshotCD <= 0) {
                    slingshotCD = 3.5;
                    const bonus = Math.round((b.slingshotBonus || 150) * comboMult() * levelCfg().scoreMult);
                    score += bonus;
                    $('hud-score').textContent = Math.floor(score);
                    scorePopup(satellite.position, b.name.toUpperCase() + ' SLINGSHOT +' + bonus, 'big');
                    sfx.playPhaseUp();
                }
            });

            const effTimeScale = timeScale * (chronoActive ? 1 : 1);
            void effTimeScale;

            // Mobile scheme: gravity slider holds orbit, tilt steers, else classic hold-to-thrust
            if (sliderHold) {
                targetRadius = MIN_RADIUS + sliderVal * (MAX_RADIUS - MIN_RADIUS);
            } else if (tiltOn && tiltBeta0 !== null) {
                targetRadius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS,
                    targetRadius + THREE.MathUtils.clamp(tiltBeta * 0.09, -2.2, 2.2) * dt60));
                satelliteAngle += THREE.MathUtils.clamp(tiltGamma * 0.00012, -0.004, 0.004) * dt60;
                if (tiltBeta > 8) { if (!thrustActive) setThrust(true); }
                else if (tiltBeta < -8) { if (thrustActive) setThrust(false); }
            } else if (dragSteer.active && dragSteer.moved > 10) {
                // drag-anywhere already wrote targetRadius/angle in pressMove; just hold it
            } else if (thrustActive) targetRadius = Math.min(MAX_RADIUS, targetRadius + ship().thrustOut * dt60);
            else targetRadius = Math.max(MIN_RADIUS, targetRadius - ship().thrustIn * dt60);
            // dash timers + button cooldown label
            if (dashCD > 0) {
                dashCD -= delta;
                const b = $('od-dash-btn');
                if (b) {
                    if (dashCD <= 0) { dashCD = 0; b.classList.remove('od-cooling'); b.textContent = '⚡ DASH'; }
                    else b.textContent = '⏳ ' + Math.ceil(dashCD) + 's';
                }
            }
            if (dashT > 0) {
                dashT -= delta;
                targetRadius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, targetRadius + ship().thrustOut * 1.6 * dt60));
                if (trailAcc !== undefined) { /* extra trail below */ }
            }
            orbitRadius += (targetRadius - orbitRadius) * (1 - Math.pow(1 - ship().agility, dt60));

            const ratio = (orbitRadius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS);
            sfx.updateThrustFreq(ratio);

            const tsDebris = chronoActive ? 0.45 : 1;
            const KeplerSpeed = SAT_BASE_SPEED * Math.pow(100 / orbitRadius, 1.45) * (dashT > 0 ? 1.7 : 1);
            satelliteAngle += KeplerSpeed * dt60 * extSpeed;
            angleAccum += KeplerSpeed * dt60;
            if (angleAccum >= Math.PI * 2) {
                angleAccum = 0;
                if (hitsThisLap === 0) {
                    const bonus = 100 * comboMult() * ship().scoreMult;
                    score += bonus;
                    integrity = Math.min(maxIntegrity, integrity + 10);
                    updateShieldUI();
                    scorePopup(satellite.position, 'FLAWLESS +' + Math.floor(bonus), 'big');
                    sfx.playPhaseUp();
                    $('hud-score').textContent = Math.floor(score);
                }
                hitsThisLap = 0;
            }

            const satX = Math.cos(satelliteAngle) * orbitRadius;
            const satY = Math.sin(satelliteAngle) * orbitRadius;
            satellite.position.set(satX, satY, 0);

            const radiusDiff = targetRadius - orbitRadius;
            satellite.rotation.z = satelliteAngle + Math.PI / 2;
            satellite.rotation.y = THREE.MathUtils.clamp(radiusDiff * 0.06, -0.6, 0.6);

            if (satellite.userData.plume) {
                const plume = satellite.userData.plume;
                const boost = dashT > 0 ? 2.2 : thrustActive ? 1.35 : 0.35;
                const flicker = 0.85 + Math.random() * 0.3;
                plume.scale.set(1, boost * flicker, 1);
                plume.material.opacity = dashT > 0 ? 0.85 : thrustActive ? 0.65 : 0.18;
            }

            // FOV kick with speed
            const targetFov = 55 + ratio * 6 + (thrustActive ? 3 : 0);
            if (Math.abs(camera.fov - targetFov) > 0.05) {
                camera.fov += (targetFov - camera.fov) * 0.08 * dt60;
                camera.updateProjectionMatrix();
            }

            trailAcc += delta;
            if (trailAcc > 1 / 30) { trailAcc = 0; spawnEngineTrail(satellite.position); if (dashT > 0) { spawnEngineTrail(satellite.position); spawnEngineTrail(satellite.position); } }
            // keep one-thumb slider reflecting true orbit when user isn't holding it
            if (!sliderHold) {
                const sl = $('od-gravity-slider');
                if (sl && document.activeElement !== sl) {
                    sliderVal = (targetRadius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS);
                    sl.value = String(Math.round(sliderVal * 100));
                }
            }

            // tutorial hide
            if (!tutorialHidden) {
                if (elapsedSec > 6 || tutorialCycles >= 3) {
                    tutorialHidden = true;
                    const t = $('TEMPLATE-4weird-tutorial-hint');
                    if (t) t.classList.add('hidden');
                    try { sessionStorage.setItem('orbitaldrift_tutorial_done', '1'); } catch {}
                }
            }

            // powerup timers (delta-based)
            if (magnetActive) { magnetDuration -= delta; if (magnetDuration <= 0) magnetActive = false; }
            if (shieldActive) {
                shieldDuration -= delta;
                forcefield.material.opacity = Math.max(0, Math.min(0.5, shieldDuration * 0.5));
                if (shieldDuration <= 0) shieldActive = false;
            }
            if (overdriveActive) { overdriveDuration -= delta; if (overdriveDuration <= 0) overdriveActive = false; }
            if (cloakActive) { cloakDuration -= delta; if (cloakDuration <= 0) cloakActive = false; }
            if (chronoActive) { chronoDuration -= delta; if (chronoDuration <= 0) chronoActive = false; }
            if (magnetRing) {
                magnetRing.position.copy(satellite.position);
                const target = magnetActive ? 0.4 : 0;
                magnetRing.material.opacity += (target - magnetRing.material.opacity) * 0.12 * dt60;
            }
            updatePowerupHUD();

            // combo drain
            if (comboChain > 0) {
                const win = overdriveActive ? COMBO_WINDOW + 1.5 : COMBO_WINDOW;
                comboTimer -= delta;
                const cb = $('hud-combo-bar');
                if (cb) cb.style.width = Math.max(0, (comboTimer / win) * 100) + '%';
                if (comboTimer <= 0) {
                    comboDrainAcc += delta;
                    if (comboDrainAcc >= 0.25) { comboDrainAcc = 0; comboChain--; updateMultiplierUI(); }
                    if (comboChain <= 0) { comboChain = 0; if (cb) cb.style.width = '0%'; }
                }
            }

            // spawn intervals by phase
            const intervals = phase === 1 ? [80, 90] : phase === 2 ? [55, 70] : phase === 3 ? [40, 60] : [28, 55];
            spawnTimerStardust += dt60;
            if (spawnTimerStardust > intervals[1] / (surgeActive ? 0.7 : 1)) { spawnStardust(); spawnTimerStardust = 0; }
            spawnTimerDebris += dt60;
            if (spawnTimerDebris > Math.max(22, intervals[0] / (surgeActive ? 0.5 : 1))) { spawnDebris(); if (surgeActive && Math.random() > 0.4) spawnDebris(); spawnTimerDebris = 0; }
            spawnTimerPowerup += dt60;
            if (spawnTimerPowerup > 350 + Math.random() * 300) { spawnPowerup(); spawnTimerPowerup = 0; }

            // stardust
            for (let i = collectibles.length - 1; i >= 0; i--) {
                const item = collectibles[i];
                item.mesh.rotation.y += 0.02 * dt60;
                item.mesh.rotation.z += 0.03 * dt60;
                const pulse = 1 + Math.sin(elapsedSec * 3 * item.pulseSpeed * 0.3) * 0.18;
                item.mesh.scale.set(pulse, pulse, pulse);
                if (elapsedSec - item.bornAt > 20) { scene.remove(item.mesh); collectibles.splice(i, 1); continue; }
                if (magnetActive) {
                    const dx = satellite.position.x - item.mesh.position.x;
                    const dy = satellite.position.y - item.mesh.position.y;
                    const distToSat = Math.sqrt(dx * dx + dy * dy);
                    const pullR = 50 + ship().magnetMod;
                    if (distToSat < pullR && distToSat > 0.01) {
                        item.mesh.position.x += (dx / distToSat) * 3.0 * dt60;
                        item.mesh.position.y += (dy / distToSat) * 3.0 * dt60;
                        if (Math.random() > 0.7) showMagnetBeam(satellite.position, item.mesh.position);
                    }
                }
                const dx2 = satellite.position.x - item.mesh.position.x;
                const dy2 = satellite.position.y - item.mesh.position.y;
                const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                const collectR = ship().pickupR * (dashT > 0 ? 3 : 1) + (dashT > 0 ? 6 : 0);
                if (dist < collectR) {
                    comboChain++; comboTimer = overdriveActive ? COMBO_WINDOW + 1.5 : COMBO_WINDOW;
                    sfx.playCollect(comboChain);
                    spawnExplosion(item.mesh.position, 0xfacc15, 12);
                    let val = item.value * comboMult() * zoneMult(item.mesh.position) * ship().scoreMult;
                    if (overdriveActive) val *= 2;
                    if (surgeActive) val *= 1.5;
                    score += val; basePoints += item.value;
                    stardustCount++;
                    maxMultiplier = Math.max(maxMultiplier, comboMult());
                    if (comboChain % 10 === 0) {
                        const sb = 50 * comboMult() * ship().scoreMult; score += sb;
                        scorePopup(item.mesh.position, 'STREAK ×' + comboChain + ' +' + Math.floor(sb), 'big');
                    } else {
                        scorePopup(item.mesh.position, '+' + Math.floor(val), comboMult() >= 3 ? 'big' : '');
                    }
                    updateMultiplierUI();
                    $('hud-score').textContent = Math.floor(score);
                    hudPop('hud-score');
                    scene.remove(item.mesh);
                    collectibles.splice(i, 1);
                    continue;
                }
                if (collectibles.length > 25) { const old = collectibles.shift(); scene.remove(old.mesh); }
            }

            // debris
            const grazeMax = (cloakActive ? GRAZE_MAX * 2 : GRAZE_MAX) + ship().grazeMod;
            for (let i = debris.length - 1; i >= 0; i--) {
                const item = debris[i];
                item.t += delta;
                if (item.kind === 'shard' && item.bornAt !== undefined && elapsedSec - item.bornAt > 12) {
                    scene.remove(item.mesh); debris.splice(i, 1); continue;
                }
                if (item.kind === 'stalker') {
                    item.angle += item.speed * dt60 * tsDebris;
                    const want = THREE.MathUtils.clamp(orbitRadius, MIN_RADIUS, MAX_RADIUS);
                    item.radius += THREE.MathUtils.clamp(want - item.radius, -0.9 * dt60, 0.9 * dt60);
                    item.mesh.position.set(Math.cos(item.angle) * item.radius, Math.sin(item.angle) * item.radius, 0);
                    item.mesh.material.emissive.setHex(0.5 + 0.5 * Math.sin(elapsedSec * 8) > 0 ? 0x9a3412 : 0x7c2d12);
                } else if (item.kind === 'weaver') {
                    item.angle += item.speed * dt60 * tsDebris;
                    const rr = item.baseRadius + Math.sin(elapsedSec * 2 + item.phase) * 18;
                    item.radius = THREE.MathUtils.clamp(rr, MIN_RADIUS, MAX_RADIUS);
                    item.mesh.position.set(Math.cos(item.angle) * item.radius, Math.sin(item.angle) * item.radius, 0);
                    item.mesh.rotation.x += item.rotSpeed.x * dt60;
                    item.mesh.rotation.y += item.rotSpeed.y * dt60;
                } else if (item.kind === 'darter') {
                    item.stateT += delta;
                    if (item.state === 'drift' && item.stateT > 1.2) { item.state = 'telegraph'; item.stateT = 0; item.lockedRadius = orbitRadius; }
                    else if (item.state === 'telegraph') {
                        const s = 1 + Math.sin(elapsedSec * 20) * 0.25;
                        item.mesh.scale.set(s, s, s);
                        if (item.stateT > 0.8) { item.state = 'lunge'; item.stateT = 0; item.radialVel = (item.lockedRadius - item.radius) / 45; }
                    } else if (item.state === 'lunge') {
                        item.radius += item.radialVel * dt60 * tsDebris;
                        item.angle += item.speed * dt60 * tsDebris;
                        if (item.stateT > 1.5) { item.state = 'drift'; item.stateT = 0; item.mesh.scale.set(1, 1, 1); }
                    } else {
                        item.angle += item.speed * dt60 * tsDebris;
                    }
                    item.mesh.position.set(Math.cos(item.angle) * item.radius, Math.sin(item.angle) * item.radius, 0);
                    item.mesh.rotation.z = item.angle + (item.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
                } else {
                    item.angle += item.speed * dt60 * tsDebris;
                    item.mesh.position.set(Math.cos(item.angle) * item.radius, Math.sin(item.angle) * item.radius, 0);
                    if (item.isComet) {
                        item.mesh.rotation.z = item.angle + (item.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
                        if (Math.random() > 0.85 && particles.length < 250) {
                            const p = acquireParticle(0x00ffff, 0.5, 0.6);
                            p.mesh.position.copy(item.mesh.position);
                            p.vel.set(0, 0, 0); p.life = 0.6; p.decay = 0.08;
                            scene.add(p.mesh); particles.push(p);
                        }
                    } else {
                        item.mesh.rotation.x += item.rotSpeed.x * dt60;
                        item.mesh.rotation.y += item.rotSpeed.y * dt60;
                        item.mesh.rotation.z += item.rotSpeed.z * dt60;
                    }
                }

                const dx = satellite.position.x - item.mesh.position.x;
                const dy = satellite.position.y - item.mesh.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const hitR = (item.kind === 'shard' ? 7 : item.kind === 'darter' ? 10 : 9) + ship().hitMod;
                if (dist < hitR) {
                    if (cloakActive) {
                        spawnExplosion(item.mesh.position, 0xf8fafc, 8);
                        if (item.kind === 'splitter') spawnShards(item.mesh.position, 3);
                        scene.remove(item.mesh); debris.splice(i, 1); continue;
                    }
                    if (shieldActive) {
                        sfx.playShieldBlock();
                        spawnExplosion(item.mesh.position, 0x10b981, 15);
                        score += 25 * comboMult() * ship().scoreMult;
                        $('hud-score').textContent = Math.floor(score);
                        scorePopup(item.mesh.position, 'BLOCKED +' + Math.floor(25 * comboMult()), 'graze');
                        shieldActive = false; shieldDuration = 0;
                        forcefield.material.opacity = 0.0;
                        if (item.kind === 'splitter') spawnShards(item.mesh.position, 3);
                    } else {
                        sfx.playHit();
                        fireHitFlash();
                        if (atmoMat) atmoMat.uniforms.uIntensity.value = 2.4;
                        spawnExplosion(item.mesh.position, 0xec4899, 20);
                        if (!window.gameDebug?.godMode) {
                            let dmg = item.damage;
                            if (orbitRadius < 75) dmg += 5;
                            integrity = Math.max(0, integrity - dmg);
                            hitsThisLap++;
                            if (comboChain > 0) sfx.playComboLost();
                            comboChain = 0; multiplier = 1.0;
                            updateMultiplierUI();
                        }
                        if (shakeEnabled && window.navigator && navigator.vibrate) { try { navigator.vibrate(40); } catch {} }
                        if (shakeEnabled) screenShake = 16;
                        updateShieldUI();
                        if (item.kind === 'splitter') spawnShards(item.mesh.position, 3);
                        if (integrity <= 0) {
                            scene.remove(item.mesh); debris.splice(i, 1);
                            startDeath();
                            continue;
                        }
                    }
                    scene.remove(item.mesh);
                    debris.splice(i, 1);
                    continue;
                }
                // graze / near-miss
                if (dist >= hitR && dist < grazeMax && elapsedSec - item.lastGraze > 1.0) {
                    item.lastGraze = elapsedSec;
                    nearMissCount++;
                    comboTimer = Math.min(comboTimer + 0.5, (overdriveActive ? COMBO_WINDOW + 1.5 : COMBO_WINDOW) + 1.0);
                    let gv = 5 * comboMult() * zoneMult(satellite.position) * ship().scoreMult;
                    if (cloakActive) gv *= 2;
                    if (orbitRadius > 155) gv *= 1.5;
                    score += gv;
                    $('hud-score').textContent = Math.floor(score);
                    sfx.playNearMiss();
                    scorePopup(item.mesh.position, '+' + Math.floor(gv) + ' GRAZE', 'graze');
                    const p = acquireParticle(0x06b6d4, 0.7, 0.8);
                    p.mesh.position.copy(item.mesh.position);
                    p.vel.set(0, 0, 0); p.life = 0.5; p.decay = 0.08;
                    scene.add(p.mesh); particles.push(p);
                }
                const cap = phase >= 4 ? 30 : 25;
                if (debris.length > cap) { const old = debris.shift(); scene.remove(old.mesh); }
            }

            // powerups
            for (let i = powerups.length - 1; i >= 0; i--) {
                const item = powerups[i];
                item.mesh.rotation.y += 0.03 * dt60;
                item.mesh.rotation.x += 0.01 * dt60;
                const dx = satellite.position.x - item.mesh.position.x;
                const dy = satellite.position.y - item.mesh.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 8) {
                    sfx.playPowerUp();
                    if (item.kind === 'magnet') { magnetActive = true; magnetDuration = 7; spawnExplosion(item.mesh.position, 0x06b6d4, 15); scorePopup(item.mesh.position, '🧲 MAGNET', 'graze'); }
                    else if (item.kind === 'shield') {
                        shieldActive = true; shieldDuration = 8;
                        integrity = Math.min(maxIntegrity, integrity + 25); updateShieldUI();
                        spawnExplosion(item.mesh.position, 0x10b981, 15);
                        scorePopup(item.mesh.position, '🛡️ SHIELD', 'graze');
                    } else if (item.kind === 'overdrive') { overdriveActive = true; overdriveDuration = 10; spawnExplosion(item.mesh.position, 0xfacc15, 15); scorePopup(item.mesh.position, '🔥 OVERDRIVE ×2', 'big'); }
                    else if (item.kind === 'cloak') { cloakActive = true; cloakDuration = 3; spawnExplosion(item.mesh.position, 0xf8fafc, 15); scorePopup(item.mesh.position, '👻 PHASE CLOAK', 'big'); }
                    else if (item.kind === 'chrono') { chronoActive = true; chronoDuration = 5; spawnExplosion(item.mesh.position, 0x60a5fa, 15); scorePopup(item.mesh.position, '⏳ CHRONO', 'big'); }
                    scene.remove(item.mesh);
                    powerups.splice(i, 1);
                    continue;
                }
                if (powerups.length > 3) { const old = powerups.shift(); scene.remove(old.mesh); }
            }

            dangerAcc += delta;
            if (dangerAcc > 0.5) { dangerAcc = 0; sfx.updateDangerLoop(integrity); }
        }
    }

    updateCameraView(dt60);

    if (shakeEnabled && screenShake > 0) {
        camera.position.x += (Math.random() - 0.5) * screenShake;
        camera.position.y += (Math.random() - 0.5) * screenShake;
        screenShake *= Math.pow(0.88, dt60);
        if (screenShake < 0.1) screenShake = 0;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.add(p.vel);
        p.life -= p.decay * dt60;
        if (!p.beam && !p.mesh.userData.noScale) p.mesh.scale.set(Math.max(0.01, p.life), Math.max(0.01, p.life), Math.max(0.01, p.life));
        if (p.mesh.material && p.mesh.material.transparent) p.mesh.material.opacity = Math.max(0, p.life);
        if (p.life <= 0) {
            scene.remove(p.mesh);
            if (p.beam) { try { p.mesh.geometry.dispose(); } catch {} }
            else particlePool.push(p);
            particles.splice(i, 1);
        }
    }
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const s = shockwaves[i];
        s.t += delta;
        const r = 4 + s.t * 160;
        s.mesh.scale.set(r / 3, r / 3, 1);
        s.mesh.material.opacity = Math.max(0, 0.9 - s.t * 1.1);
        if (s.t > 0.9) {
            scene.remove(s.mesh);
            try { s.mesh.geometry.dispose(); s.mesh.material.dispose(); } catch {}
            shockwaves.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}
