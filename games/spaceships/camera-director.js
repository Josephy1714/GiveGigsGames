// Advanced Camera Director: Tightly locked on player ship with zero camera orbiting or spinning
// Mode 1: chase      - Rock-solid third-person camera locked behind the player ship, player dead-center
// Mode 2: gun_barrel - First-person cockpit/turret view looking straight down the sights
// Mode 3: wingman    - Rare shoulder escort angle looking at player ship
const THREE = window.THREE;

export class CameraDirector {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'chase'; // Default mode
    this.manualOverride = false;
    this.autoSequence = true;

    // Sequence timer: mostly stay in solid chase, occasionally cycle to gun sight
    this.sequenceTimer = 12.0;
    this.sequenceIndex = 0;

    // ONLY stable, player-focused angles (no flyby, no top-down, no spinning orbit)
    // Cockpit view is featured prominently (>= 30% of the cinematic time)
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

    // Smooth state variables
    this.cameraLookTarget = new THREE.Vector3();
    this.cameraForward = new THREE.Vector3(0, 0, -1);
    this.cameraPositionSmooth = new THREE.Vector3();
    this.initialized = false;

    // Pilot head tracking / organic look-around state in cockpit view
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

    // Listeners for UI updates
    this.onModeChange = null;
  }

  setMode(newMode, isManual = false) {
    this.mode = newMode;
    if (isManual) {
      this.manualOverride = true;
      this.autoSequence = false;
    }
    if (this.onModeChange) this.onModeChange(newMode);
  }

  update(dt, elapsed, leadShip, ships, aliens, planets, bodies) {
    if (!leadShip) return;

    // Auto-cycle through stable cinematic angles if not manually pinned
    if (this.autoSequence) {
      this.sequenceTimer -= dt;
      if (this.sequenceTimer <= 0) {
        this.sequenceIndex = (this.sequenceIndex + 1) % this.modeSequence.length;
        const nextMode = this.modeSequence[this.sequenceIndex];
        this.setMode(nextMode, false);
        // Cockpit view takes prominent time (11.0s), chase is 8.5s, secondary angles 4.5s
        this.sequenceTimer = nextMode === 'cockpit' ? 11.0 : (nextMode === 'chase' ? 8.5 : 4.5);
      }
    }

    const targetCamPos = new THREE.Vector3();
    const targetCamLook = new THREE.Vector3();
    const mode = this.mode;

    // Determine ship forward travel direction
    const shipHeading = (leadShip.vel && leadShip.vel.lengthSq() > 1)
      ? leadShip.vel.clone().normalize()
      : new THREE.Vector3(0, 0, -1).applyQuaternion(leadShip.mesh.quaternion).normalize();

    if (mode === 'cockpit') {
      // 0. FIRST-PERSON STAR WARS 3D COCKPIT VIEW:
      // Perfectly aligned with the hero ship's 3D orientation, looking forward through the canopy & sights
      // Pilot dynamically looks around at bogeys, wingmen, consoles, and sights with organic zooming
      leadShip.mesh.updateWorldMatrix(true, false);
      const shipUp = new THREE.Vector3(0, 1, 0).applyQuaternion(leadShip.mesh.quaternion).normalize();
      const shipFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(leadShip.mesh.quaternion).normalize();
      const shipRight = new THREE.Vector3().crossVectors(shipFwd, shipUp).normalize();

      // Pilot Eye Base Anchor: exactly at pilot's head in starfighter cockpit
      const basePilotEyePos = leadShip.mesh.localToWorld(new THREE.Vector3(0, 1.35, -1.6));

      // -------------------------------------------------------------
      // INTELLIGENT ORGANIC PILOT GAZE CONTROLLER & INSTRUMENT ZOOM-IN
      // -------------------------------------------------------------
      this.cockpitLookTimer -= dt;

      // Find closest enemy in forward hemisphere to dynamically track
      let closestBogey = null;
      let closestBogeyDist = Infinity;
      let bogeyRel = null;

      if (aliens && aliens.length > 0) {
        const invQuat = leadShip.mesh.quaternion.clone().invert();
        for (const al of aliens) {
          if (!al || (al.health && al.health <= 0)) continue;
          const rel = al.pos.clone().sub(basePilotEyePos).applyQuaternion(invQuat);
          // In front of ship (-z), within 420 units
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

      // If timer expired, pick next natural gaze behavior
      if (this.cockpitLookTimer <= 0) {
        // Gaze sequence: cycles through instruments, dogfight tracking, and skyward vistas
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

        // If target enemy is close (< 240 units) and in dogfight, 65% chance to track enemy!
        if (closestBogey && closestBogeyDist < 240 && Math.random() < 0.65) {
          nextGaze = 'track_enemy';
        }

        this.currentGazeMode = nextGaze;

        if (nextGaze === 'inspect_center_radar') {
          // Zooms in on Center Tactical Radar & Flight Yoke
          this.cockpitLookTimer = 2.4 + Math.random() * 0.8;
          this.cockpitTargetYaw = (Math.random() - 0.5) * 0.08;
          this.cockpitTargetPitch = -0.32;
          this.targetCamOffset.set(0, -0.09, -0.12); // leans down & forward towards console
          this.targetFov = 50; // zooms in so radar fills screen

        } else if (nextGaze === 'inspect_left_console') {
          // Zooms in on Left Console: Missile Bay reload meters & live rotating turret
          this.cockpitLookTimer = 2.5 + Math.random() * 0.9;
          this.cockpitTargetYaw = 0.44; // turns left
          this.cockpitTargetPitch = -0.26; // tilts down at console
          this.targetCamOffset.set(-0.14, -0.07, -0.10); // leans left & forward
          this.targetFov = 48; // zooms in on missile rack

        } else if (nextGaze === 'inspect_right_console') {
          // Zooms in on Right Console: Solar System Orbital Tactical Map
          this.cockpitLookTimer = 2.5 + Math.random() * 0.9;
          this.cockpitTargetYaw = -0.44; // turns right
          this.cockpitTargetPitch = -0.26;
          this.targetCamOffset.set(0.14, -0.07, -0.10); // leans right & forward
          this.targetFov = 48; // zooms in on solar map

        } else if (nextGaze === 'inspect_upper_right_scanner') {
          // Zooms in on Upper-Right Emerald CRT Target Scanner
          this.cockpitLookTimer = 2.2 + Math.random() * 0.8;
          this.cockpitTargetYaw = -0.36; // glances up-right
          this.cockpitTargetPitch = 0.22;
          this.targetCamOffset.set(0.08, 0.04, -0.08); // leans closer to scanner
          this.targetFov = 50; // zooms in on emerald planetary scan

        } else if (nextGaze === 'canopy_skyward_scan') {
          // Glances up through the canopy arch at starry deep space and overhead annunciators
          this.cockpitLookTimer = 2.0 + Math.random() * 1.0;
          this.cockpitTargetYaw = (Math.random() - 0.5) * 0.35;
          this.cockpitTargetPitch = 0.34 + Math.random() * 0.12;
          this.targetCamOffset.set(0, 0.03, 0.02);
          this.targetFov = 64; // wide canopy vista

        } else if (nextGaze === 'track_enemy' && bogeyRel) {
          // Combat tracking: pilot's head follows the hostile bogey across the windshield
          this.cockpitLookTimer = 2.0 + Math.random() * 1.2;
          this.cockpitTargetYaw = THREE.MathUtils.clamp(Math.atan2(-bogeyRel.x, -bogeyRel.z), -0.55, 0.55);
          this.cockpitTargetPitch = THREE.MathUtils.clamp(Math.atan2(bogeyRel.y, -bogeyRel.z), -0.24, 0.35);
          this.targetCamOffset.set(0, 0, -0.05); // leans forward into gunsight
          this.targetFov = 58;

        } else {
          // Default: BORESIGHT combat gunsight tracking
          this.cockpitLookTimer = 3.2 + Math.random() * 1.6;
          this.cockpitTargetYaw = (Math.random() - 0.5) * 0.06;
          this.cockpitTargetPitch = (Math.random() - 0.5) * 0.06;
          this.targetCamOffset.set(0, 0, 0);
          this.targetFov = 62;
        }
      }

      // Continuously update tracking if in track_enemy mode
      if (this.currentGazeMode === 'track_enemy' && bogeyRel) {
        this.cockpitTargetYaw = THREE.MathUtils.clamp(Math.atan2(-bogeyRel.x, -bogeyRel.z), -0.55, 0.55);
        this.cockpitTargetPitch = THREE.MathUtils.clamp(Math.atan2(bogeyRel.y, -bogeyRel.z), -0.24, 0.35);
      }

      // Continuous organic multi-frequency breathing & pilot micro-sway
      const breathYaw = Math.sin(elapsed * 1.5) * 0.012 + Math.sin(elapsed * 3.7) * 0.003;
      const breathPitch = Math.cos(elapsed * 1.8) * 0.009 + Math.cos(elapsed * 4.1) * 0.003;

      // Smooth damped head turn and camera lean translation
      const headFactor = 1 - Math.exp(-4.5 * dt);
      this.cockpitLookYaw = THREE.MathUtils.lerp(this.cockpitLookYaw, this.cockpitTargetYaw + breathYaw, headFactor);
      this.cockpitLookPitch = THREE.MathUtils.lerp(this.cockpitLookPitch, this.cockpitTargetPitch + breathPitch, headFactor);
      this.cockpitCamOffset.lerp(this.targetCamOffset, 1 - Math.exp(-4.0 * dt));

      // Head roll tilts into banking turns
      const targetRoll = -this.cockpitLookYaw * 0.16;
      this.cockpitLookRoll = THREE.MathUtils.lerp(this.cockpitLookRoll, targetRoll, 1 - Math.exp(-5.0 * dt));

      // Seamless FOV zoom interpolation
      if (Math.abs(this.camera.fov - this.targetFov) > 0.05) {
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetFov, 1 - Math.exp(-3.5 * dt));
        this.camera.updateProjectionMatrix();
      }

      // Compute world camera position incorporating pilot lean offset
      const worldCamOffset = shipRight.clone().multiplyScalar(this.cockpitCamOffset.x)
        .addScaledVector(shipUp, this.cockpitCamOffset.y)
        .addScaledVector(shipFwd, -this.cockpitCamOffset.z);
      const pilotEyePos = basePilotEyePos.clone().add(worldCamOffset);

      // Rotate camera look vector based on pilot gaze
      const lookDir = shipFwd.clone();
      lookDir.applyAxisAngle(shipUp, this.cockpitLookYaw);
      const headRight = lookDir.clone().cross(shipUp).normalize();
      lookDir.applyAxisAngle(headRight, this.cockpitLookPitch);

      targetCamPos.copy(pilotEyePos);
      targetCamLook.copy(pilotEyePos).addScaledVector(lookDir, 220);

      // Roll camera slightly for organic feel
      const camUp = shipUp.clone();
      camUp.applyAxisAngle(lookDir, this.cockpitLookRoll);
      this.camera.up.copy(camUp);

      this.camera.position.copy(targetCamPos);
      this.cameraLookTarget.copy(targetCamLook);
      this.camera.lookAt(this.cameraLookTarget);
      this.camera.getWorldDirection(this.cameraForward);
      this.initialized = true;
      return;

    } else if (mode === 'gun_barrel') {
      // 1. GUN SIGHT: Locked above ship hull looking dead ahead
      this.camera.up.set(0, 1, 0);
      leadShip.mesh.updateWorldMatrix(true, false);
      const turretWorldPos = leadShip.mesh.localToWorld(new THREE.Vector3(0, 2.2, 0.4));
      targetCamPos.copy(turretWorldPos);

      const barrelDir = new THREE.Vector3(0, 0, -1).applyQuaternion(leadShip.mesh.quaternion).normalize();
      targetCamLook.copy(turretWorldPos).addScaledVector(barrelDir, 160);
      targetCamLook.y += 0.2;

    } else if (mode === 'wingman_cam') {
      // 2. ESCORT SQUADRON CAM: Stable 3/4 quarter high angle framing lead ship and wingmen
      // Always maintains cinematic framing without erratic tumbling
      const shipRight = new THREE.Vector3().crossVectors(shipHeading, new THREE.Vector3(0, 1, 0)).normalize();
      targetCamPos.copy(leadShip.pos)
        .addScaledVector(shipHeading, -38.0)
        .addScaledVector(shipRight, 16.0)
        .add(new THREE.Vector3(0, 12.0, 0));

      targetCamLook.copy(leadShip.pos)
        .addScaledVector(shipHeading, 6.0)
        .add(new THREE.Vector3(0, 1.5, 0));

    } else {
      // 3. ROCK-SOLID CHASE (DEFAULT & DOMINANT):
      // Smoothly tracks behind the player's tail - ZERO orbiting, ZERO rotation glitching!
      // Clamps lag angle so player ship CANNOT drift beyond screen edge during sharp dogfight turns!
      const maxLag = 0.26; // radians (~15 deg)
      const angle = this.cameraForward.angleTo(shipHeading);
      if (angle > maxLag) {
        const rotateBack = angle - maxLag;
        const axis = new THREE.Vector3().crossVectors(this.cameraForward, shipHeading).normalize();
        if (axis.lengthSq() > 0.5) {
          this.cameraForward.applyAxisAngle(axis, rotateBack);
        }
      }
      this.cameraForward.lerp(shipHeading, Math.min(1, dt * 9.0)).normalize();

      // Generous cinematic follow distance and height
      const followDist = 38.0;
      const followHeight = 11.0;

      targetCamPos.copy(leadShip.pos)
        .addScaledVector(this.cameraForward, -followDist);
      targetCamPos.y += followHeight;

      // Look slightly ahead of ship into its flight path
      targetCamLook.copy(leadShip.pos)
        .addScaledVector(shipHeading, 7.0)
        .add(new THREE.Vector3(0, 1.4, 0));

      // Avoid celestial bodies clipping
      if (bodies) {
        for (const body of bodies) {
          const cameraRadius = body.radius + 18;
          if (targetCamPos.distanceToSquared(body.center) < cameraRadius * cameraRadius) {
            targetCamPos.sub(body.center).normalize().multiplyScalar(cameraRadius).add(body.center);
          }
        }
      }
    }

    // ENFORCE MINIMUM CAMERA DISTANCE IN ALL NON-GUNSIGHT, NON-COCKPIT SITUATIONS
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

    // Smooth critical damping with responsive tracking
    const lerpSpeed = mode === 'gun_barrel' ? 24.0 : 12.0;
    const factor = 1 - Math.exp(-lerpSpeed * dt);
    this.camera.position.lerp(targetCamPos, factor);
    this.cameraLookTarget.lerp(targetCamLook, factor);

    // Final safety clamp: camera position must strictly never be closer than MIN_EXTERNAL_CAM_DIST
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

    // Keep camera UP primarily vertical (0, 1, 0) so the planets and solar disk remain level & horizontal!
    // Very subtle dynamic banking during hard turns, but immediately levels out to horizontal
    const desiredUp = new THREE.Vector3(0, 1, 0);
    if (mode === 'chase') {
      const turnRate = leadShip.vel ? THREE.MathUtils.clamp((leadShip.vel.x * shipHeading.z - leadShip.vel.z * shipHeading.x) * 0.04, -0.08, 0.08) : 0;
      if (Math.abs(turnRate) > 0.005) {
        desiredUp.applyAxisAngle(this.cameraForward, turnRate);
      }
    }
    this.camera.up.lerp(desiredUp, 1 - Math.exp(-12.0 * dt)).normalize();
    this.camera.lookAt(this.cameraLookTarget);
    this.camera.getWorldDirection(this.cameraForward);

    // Smoothly restore base FOV for external cameras
    if (Math.abs(this.camera.fov - 60) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 60, 1 - Math.exp(-4.0 * dt));
      this.camera.updateProjectionMatrix();
    }
  }
}

