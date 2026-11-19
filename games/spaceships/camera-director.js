// Advanced Camera Director: Tightly locked on player ship with smooth damping, free-look, shake, and boost/warp FOV
const THREE = window.THREE;

export class CameraDirector {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'chase';
    this.manualOverride = false;
    this.autoSequence = true;

    this.sequenceTimer = 12.0;
    this.sequenceIndex = 0;

    this.modeSequence = [
      'cockpit',
      'chase',
      'cockpit',
      'gun_barrel',
      'chase',
      'cockpit',
      'wingman_cam',
      'chase'
    ];

    this.cameraLookTarget = new THREE.Vector3();
    this.cameraForward = new THREE.Vector3(0, 0, -1);
    this.cameraPositionSmooth = new THREE.Vector3();
    this.initialized = false;

    // Cockpit head tracking / free-look state
    this.cockpitLookYaw = 0;
    this.cockpitLookPitch = 0;
    this.cockpitLookRoll = 0;
    this.cockpitTargetYaw = 0;
    this.cockpitTargetPitch = 0;
    this.cockpitLookTimer = 0;
    this.cockpitCamOffset = new THREE.Vector3();
    this.targetCamOffset = new THREE.Vector3();
    this.currentGazeMode = 'boresight';
    this.gazeCycleIndex = 0;
    this.targetFov = 62;
    this.baseFov = 62;

    this.freeLook = { active: false, yaw: 0, pitch: 0 };
    this.shake = 0;
    this.warpFovBoost = 0;

    this.onModeChange = null;
  }

  addShake(amount = 0.5) {
    this.shake = Math.min(2.4, this.shake + amount);
  }

  setMode(newMode, isManual = false) {
    this.mode = newMode;
    if (isManual) {
      this.manualOverride = true;
      this.autoSequence = false;
    }
    if (this.onModeChange) this.onModeChange(newMode);
  }

  update(dt, elapsed, leadShip, ships, aliens, planets, bodies, isManualFlight = false) {
    if (!leadShip) return;

    this.shake = Math.max(0, this.shake - dt * 3.8);
    this.warpFovBoost = Math.max(0, this.warpFovBoost - dt * 28);

    if (this.autoSequence) {
      this.sequenceTimer -= dt;
      if (this.sequenceTimer <= 0) {
        this.sequenceIndex = (this.sequenceIndex + 1) % this.modeSequence.length;
        const nextMode = this.modeSequence[this.sequenceIndex];
        this.setMode(nextMode, false);
        this.sequenceTimer = nextMode === 'cockpit' ? 11.0 : (nextMode === 'chase' ? 8.5 : 4.5);
      }
    }

    const targetCamPos = new THREE.Vector3();
    const targetCamLook = new THREE.Vector3();
    const mode = this.mode;

    leadShip.mesh.updateWorldMatrix(true, false);
    const shipFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(leadShip.mesh.quaternion).normalize();
    const shipUp = new THREE.Vector3(0, 1, 0).applyQuaternion(leadShip.mesh.quaternion).normalize();
    const shipRight = new THREE.Vector3().crossVectors(shipFwd, shipUp).normalize();
    const shipHeading = (isManualFlight || !leadShip.vel || leadShip.vel.lengthSq() < 1)
      ? shipFwd
      : leadShip.vel.clone().normalize();

    const boostFov = leadShip.boostActive ? 8 : 0;

    if (mode === 'cockpit') {
      const basePilotEyePos = leadShip.mesh.localToWorld(new THREE.Vector3(0, 1.35, -1.6));

      let closestBogey = null;
      let closestBogeyDist = Infinity;
      let bogeyRel = null;

      if (!isManualFlight && aliens && aliens.length > 0) {
        const invQuat = leadShip.mesh.quaternion.clone().invert();
        for (const al of aliens) {
          if (!al || (al.health && al.health <= 0)) continue;
          const rel = al.pos.clone().sub(basePilotEyePos).applyQuaternion(invQuat);
          if (rel.z < -10 && rel.z > -420) {
            const lateral = Math.hypot(rel.x, rel.y);
            const dist = rel.length();
            if (lateral < 260 && dist < closestBogeyDist) {
              closestBogeyDist = dist;
              closestBogey = al;
              bogeyRel = rel;
            }
          }
        }
      }

      if (isManualFlight) {
        // Manual flight: keep gaze locked forward (or follow right-drag freeLook)
        this.currentGazeMode = this.freeLook.active ? 'freelook' : 'boresight';
        this.cockpitTargetYaw = this.freeLook.active ? THREE.MathUtils.clamp(this.freeLook.yaw, -0.95, 0.95) : 0;
        this.cockpitTargetPitch = this.freeLook.active ? THREE.MathUtils.clamp(this.freeLook.pitch, -0.45, 0.55) : 0;
        this.targetCamOffset.set(0, 0, 0);
        this.targetFov = 62 + boostFov + this.warpFovBoost;
      } else {
        // Autopilot cinematic gaze & console checks
        this.cockpitLookTimer -= dt;
        if (this.cockpitLookTimer <= 0) {
          const gazeRoster = [
            'boresight',
            'track_enemy',
            'inspect_center_radar',
            'boresight',
            'inspect_left_console',
            'track_enemy',
            'inspect_right_console',
            'inspect_upper_right_scanner',
            'canopy_skyward_scan',
            'track_enemy'
          ];

          this.gazeCycleIndex = (this.gazeCycleIndex + 1) % gazeRoster.length;
          let nextGaze = gazeRoster[this.gazeCycleIndex];
          if (closestBogey && closestBogeyDist < 240 && Math.random() < 0.65) {
            nextGaze = 'track_enemy';
          }
          this.currentGazeMode = nextGaze;

          if (nextGaze === 'inspect_center_radar') {
            this.cockpitLookTimer = 2.4 + Math.random() * 0.8;
            this.cockpitTargetYaw = (Math.random() - 0.5) * 0.08;
            this.cockpitTargetPitch = -0.32;
            this.targetCamOffset.set(0, -0.09, -0.12);
            this.targetFov = 50;
          } else if (nextGaze === 'inspect_left_console') {
            this.cockpitLookTimer = 2.5 + Math.random() * 0.9;
            this.cockpitTargetYaw = 0.44;
            this.cockpitTargetPitch = -0.26;
            this.targetCamOffset.set(-0.14, -0.07, -0.10);
            this.targetFov = 48;
          } else if (nextGaze === 'inspect_right_console') {
            this.cockpitLookTimer = 2.5 + Math.random() * 0.9;
            this.cockpitTargetYaw = -0.44;
            this.cockpitTargetPitch = -0.26;
            this.targetCamOffset.set(0.14, -0.07, -0.10);
            this.targetFov = 48;
          } else if (nextGaze === 'inspect_upper_right_scanner') {
            this.cockpitLookTimer = 2.2 + Math.random() * 0.8;
            this.cockpitTargetYaw = -0.36;
            this.cockpitTargetPitch = 0.22;
            this.targetCamOffset.set(0.08, 0.04, -0.08);
            this.targetFov = 50;
          } else if (nextGaze === 'canopy_skyward_scan') {
            this.cockpitLookTimer = 2.0 + Math.random() * 1.0;
            this.cockpitTargetYaw = (Math.random() - 0.5) * 0.35;
            this.cockpitTargetPitch = 0.34 + Math.random() * 0.12;
            this.targetCamOffset.set(0, 0.03, 0.02);
            this.targetFov = 64;
          } else if (nextGaze === 'track_enemy' && bogeyRel) {
            this.cockpitLookTimer = 2.0 + Math.random() * 1.2;
            this.cockpitTargetYaw = THREE.MathUtils.clamp(Math.atan2(-bogeyRel.x, -bogeyRel.z), -0.55, 0.55);
            this.cockpitTargetPitch = THREE.MathUtils.clamp(Math.atan2(bogeyRel.y, -bogeyRel.z), -0.24, 0.35);
            this.targetCamOffset.set(0, 0, -0.05);
            this.targetFov = 58;
          } else {
            this.cockpitLookTimer = 3.2 + Math.random() * 1.6;
            this.cockpitTargetYaw = (Math.random() - 0.5) * 0.06;
            this.cockpitTargetPitch = (Math.random() - 0.5) * 0.06;
            this.targetCamOffset.set(0, 0, 0);
            this.targetFov = 62;
          }
        }

        if (this.currentGazeMode === 'track_enemy' && bogeyRel) {
          this.cockpitTargetYaw = THREE.MathUtils.clamp(Math.atan2(-bogeyRel.x, -bogeyRel.z), -0.55, 0.55);
          this.cockpitTargetPitch = THREE.MathUtils.clamp(Math.atan2(bogeyRel.y, -bogeyRel.z), -0.24, 0.35);
        }
        this.targetFov += boostFov + this.warpFovBoost;
      }

      const breathAmp = isManualFlight ? 0.25 : 1.0;
      const breathYaw = (Math.sin(elapsed * 1.5) * 0.012 + Math.sin(elapsed * 3.7) * 0.003) * breathAmp;
      const breathPitch = (Math.cos(elapsed * 1.8) * 0.009 + Math.cos(elapsed * 4.1) * 0.003) * breathAmp;

      const headFactor = 1 - Math.exp(-(isManualFlight ? 10.0 : 4.5) * dt);
      this.cockpitLookYaw = THREE.MathUtils.lerp(this.cockpitLookYaw, this.cockpitTargetYaw + breathYaw, headFactor);
      this.cockpitLookPitch = THREE.MathUtils.lerp(this.cockpitLookPitch, this.cockpitTargetPitch + breathPitch, headFactor);
      this.cockpitCamOffset.lerp(this.targetCamOffset, 1 - Math.exp(-5.0 * dt));

      const targetRoll = -this.cockpitLookYaw * 0.14;
      this.cockpitLookRoll = THREE.MathUtils.lerp(this.cockpitLookRoll, targetRoll, 1 - Math.exp(-5.5 * dt));

      if (Math.abs(this.camera.fov - this.targetFov) > 0.05) {
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetFov, 1 - Math.exp(-4.5 * dt));
        this.camera.updateProjectionMatrix();
      }

      const worldCamOffset = shipRight.clone().multiplyScalar(this.cockpitCamOffset.x)
        .addScaledVector(shipUp, this.cockpitCamOffset.y)
        .addScaledVector(shipFwd, -this.cockpitCamOffset.z);
      const pilotEyePos = basePilotEyePos.clone().add(worldCamOffset);

      const lookDir = shipFwd.clone();
      lookDir.applyAxisAngle(shipUp, this.cockpitLookYaw);
      const headRight = lookDir.clone().cross(shipUp).normalize();
      lookDir.applyAxisAngle(headRight, this.cockpitLookPitch);

      targetCamPos.copy(pilotEyePos);
      if (this.shake > 0.01) {
        targetCamPos.addScaledVector(shipRight, (Math.random() - 0.5) * this.shake * 0.25);
        targetCamPos.addScaledVector(shipUp, (Math.random() - 0.5) * this.shake * 0.25);
      }
      targetCamLook.copy(pilotEyePos).addScaledVector(lookDir, 220);

      const camUp = shipUp.clone().applyAxisAngle(lookDir, this.cockpitLookRoll);
      this.camera.up.copy(camUp);
      this.camera.position.copy(targetCamPos);
      this.cameraLookTarget.copy(targetCamLook);
      this.camera.lookAt(this.cameraLookTarget);
      this.camera.getWorldDirection(this.cameraForward);
      this.initialized = true;
      return;

    } else if (mode === 'gun_barrel') {
      this.camera.up.copy(shipUp);
      const turretWorldPos = leadShip.mesh.localToWorld(new THREE.Vector3(0, 2.2, 0.4));
      targetCamPos.copy(turretWorldPos);
      targetCamLook.copy(turretWorldPos).addScaledVector(shipFwd, 160).addScaledVector(shipUp, 0.2);

    } else if (mode === 'wingman_cam') {
      const worldUp = new THREE.Vector3(0, 1, 0);
      const flatRight = new THREE.Vector3().crossVectors(shipHeading, worldUp);
      if (flatRight.lengthSq() < 0.001) flatRight.copy(shipRight);
      flatRight.normalize();
      targetCamPos.copy(leadShip.pos)
        .addScaledVector(shipHeading, -38.0)
        .addScaledVector(flatRight, 16.0)
        .add(new THREE.Vector3(0, 12.0, 0));

      targetCamLook.copy(leadShip.pos)
        .addScaledVector(shipHeading, 6.0)
        .add(new THREE.Vector3(0, 1.5, 0));

    } else {
      // Rock-solid Chase Camera
      const maxLag = 0.28;
      const angle = this.cameraForward.angleTo(shipHeading);
      if (angle > maxLag) {
        const rotateBack = angle - maxLag;
        const axis = new THREE.Vector3().crossVectors(this.cameraForward, shipHeading);
        if (axis.lengthSq() > 0.0001) {
          axis.normalize();
          this.cameraForward.applyAxisAngle(axis, rotateBack);
        }
      }
      this.cameraForward.lerp(shipHeading, Math.min(1, dt * (isManualFlight ? 12.0 : 9.0))).normalize();

      const camUpRef = new THREE.Vector3(0, 1, 0).lerp(shipUp, isManualFlight ? 0.42 : 0.12).normalize();
      const followDist = 38.0;
      const followHeight = 10.5;

      targetCamPos.copy(leadShip.pos)
        .addScaledVector(this.cameraForward, -followDist)
        .addScaledVector(camUpRef, followHeight);

      targetCamLook.copy(leadShip.pos)
        .addScaledVector(shipHeading, 12.0)
        .addScaledVector(camUpRef, 1.4);

      if (bodies) {
        for (const body of bodies) {
          const cameraRadius = body.radius + 18;
          if (targetCamPos.distanceToSquared(body.center) < cameraRadius * cameraRadius) {
            targetCamPos.sub(body.center).normalize().multiplyScalar(cameraRadius).add(body.center);
          }
        }
      }
    }

    const MIN_EXTERNAL_CAM_DIST = 28.0;
    if (mode !== 'cockpit' && mode !== 'gun_barrel') {
      const toCam = targetCamPos.clone().sub(leadShip.pos);
      const dist = toCam.length();
      if (dist < MIN_EXTERNAL_CAM_DIST) {
        if (dist < 0.1) {
          toCam.copy(shipHeading).multiplyScalar(-1);
          toCam.y = 0.35;
        }
        toCam.normalize();
        targetCamPos.copy(leadShip.pos).addScaledVector(toCam, MIN_EXTERNAL_CAM_DIST);
      }
    }

    if (!this.initialized) {
      this.camera.position.copy(targetCamPos);
      this.cameraLookTarget.copy(targetCamLook);
      this.initialized = true;
    }

    const lerpSpeed = mode === 'gun_barrel' ? 26.0 : (isManualFlight ? 14.0 : 12.0);
    const factor = 1 - Math.exp(-lerpSpeed * dt);
    this.camera.position.lerp(targetCamPos, factor);
    this.cameraLookTarget.lerp(targetCamLook, factor);

    if (this.shake > 0.01 && mode !== 'cockpit') {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
    }

    if (mode !== 'cockpit' && mode !== 'gun_barrel') {
      const actualDist = this.camera.position.distanceTo(leadShip.pos);
      if (actualDist < MIN_EXTERNAL_CAM_DIST) {
        const push = this.camera.position.clone().sub(leadShip.pos);
        if (push.lengthSq() < 0.1) {
          push.copy(shipHeading).multiplyScalar(-1);
          push.y = 0.35;
        }
        push.normalize();
        this.camera.position.copy(leadShip.pos).addScaledVector(push, MIN_EXTERNAL_CAM_DIST);
      }
    }

    let desiredUp = new THREE.Vector3(0, 1, 0);
    if (mode === 'gun_barrel') {
      desiredUp.copy(shipUp);
    } else if (mode === 'chase') {
      desiredUp.lerp(shipUp, isManualFlight ? 0.38 : 0.08).normalize();
      if (Math.abs(this.cameraForward.y) > 0.9) desiredUp.copy(shipUp);
    }
    this.camera.up.lerp(desiredUp, 1 - Math.exp(-12.0 * dt)).normalize();
    this.camera.lookAt(this.cameraLookTarget);
    this.camera.getWorldDirection(this.cameraForward);

    const desiredExtFov = 60 + boostFov + this.warpFovBoost;
    if (Math.abs(this.camera.fov - desiredExtFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, desiredExtFov, 1 - Math.exp(-5.0 * dt));
      this.camera.updateProjectionMatrix();
    }
  }
}
