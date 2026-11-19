// Ship and Squadron Flight Dynamics, 6-DOF Arcade-Sim Controls, Persistent Formations, Orders, Avoidance, and Combat AI
import { ONE_AU, SYSTEM_EDGE } from './environment-manager.js';

const THREE = window.THREE;

export class FlightDynamics {
  constructor(environment) {
    this.env = environment;
    this.patrolRadius = 1700;

    // Flight control state
    this.manualFlight = false;
    this.throttle = 0.65;
    this.boostEnergy = 100;
    this.maxBoostEnergy = 100;
    this.invertPitch = false;

    // Persistent squadron tactics
    this.fleetFormation = 'arrowhead'; // arrowhead | wall | echelon | orbit
    this.squadronOrder = 'escort';     // escort | attack | defend | hunt

    // Toggleable virtual mouse-steer (-1..1 normalized offset from screen center)
    this.mouseSteer = { active: false, nx: 0, ny: 0 };

    // Smooth angular velocities for arcade-sim feel
    this.angularVel = { pitch: 0, yaw: 0, roll: 0 };
  }

  getFlightObstacles(ship) {
    const clearance = (ship?.size || 4) + 12;
    const bodies = [{ center: new THREE.Vector3(0, 0, 0), radius: ONE_AU + (ship?.size || 4) }];
    if (this.env?.planets) {
      this.env.planets.forEach(planet => {
        bodies.push({ center: planet.mesh.position, radius: planet.radius + clearance });
        planet.moons.forEach(moon => bodies.push({ center: moon.mesh.position, radius: moon.radius + clearance }));
      });
    }
    if (this.env?.stations) {
      this.env.stations.forEach(station => {
        bodies.push({
          center: station.mesh.position,
          radius: (station.collisionRadius || 42) + clearance
        });
      });
    }
    return bodies;
  }

  avoidFlightObstacles(ship, bodies) {
    const direction = ship.vel.lengthSq() > 0.01
      ? ship.vel.clone().normalize()
      : new THREE.Vector3(0, 0, -1).applyQuaternion(ship.mesh.quaternion);
    const lookAhead = Math.max(260, ship.vel.length() * 2.4);
    const avoidance = new THREE.Vector3();

    for (const body of bodies) {
      const along = THREE.MathUtils.clamp(body.center.clone().sub(ship.pos).dot(direction), 0, lookAhead);
      const closest = ship.pos.clone().addScaledVector(direction, along);
      const away = closest.sub(body.center);
      const warningRadius = body.radius + 95;
      const distance = away.length();
      if (distance < warningRadius) {
        if (distance < 0.001) away.copy(ship.pos).sub(body.center);
        away.normalize();
        avoidance.addScaledVector(away, (warningRadius - distance) / warningRadius);
      }
    }

    const radial = new THREE.Vector3(ship.pos.x, 0, ship.pos.z);
    const radius = radial.length();
    if (radius > SYSTEM_EDGE - 350) {
      avoidance.addScaledVector(radial.normalize(), -Math.max(0, (radius - (SYSTEM_EDGE - 350)) / 350));
    }
    return avoidance;
  }

  keepShipInFlightSpace(ship, previous, bodies) {
    for (const body of bodies) {
      const movement = ship.pos.clone().sub(previous);
      const start = previous.clone().sub(body.center);
      const radiusSq = body.radius * body.radius;
      let contact = start.lengthSq() < radiusSq;
      let hitPoint = ship.pos.clone();

      if (!contact && movement.lengthSq() > 0.0001) {
        const b = 2 * start.dot(movement);
        const a = movement.lengthSq();
        const c = start.lengthSq() - radiusSq;
        const discriminant = b * b - 4 * a * c;
        if (discriminant >= 0) {
          const entry = (-b - Math.sqrt(discriminant)) / (2 * a);
          if (entry >= 0 && entry <= 1) {
            contact = true;
            hitPoint = previous.clone().addScaledVector(movement, entry);
          }
        }
      }

      if (contact) {
        const normal = hitPoint.sub(body.center);
        if (normal.lengthSq() < 0.0001) normal.set(0, 1, 0);
        normal.normalize();
        ship.pos.copy(body.center).addScaledVector(normal, body.radius + 3);
        ship.vel.reflect(normal).multiplyScalar(0.65);
        const forward = ship.vel.clone().normalize();
        if (forward.lengthSq() > 0.001) {
          const tangent = new THREE.Vector3().crossVectors(normal, forward).cross(normal).normalize();
          ship.vel.addScaledVector(tangent, (ship.maxSpeed || 200) * 0.35);
        }
        break;
      }
    }

    // Hard boundary containment at system outer edge
    const radial = Math.hypot(ship.pos.x, ship.pos.z);
    if (radial > SYSTEM_EDGE) {
      const scale = SYSTEM_EDGE / radial;
      ship.pos.x *= scale;
      ship.pos.z *= scale;
      const inward = new THREE.Vector3(-ship.pos.x, 0, -ship.pos.z).normalize();
      ship.vel.addScaledVector(inward, 60);
    }
  }

  readGamepadAxes() {
    try {
      const pads = navigator.getGamepads?.();
      if (!pads) return null;
      for (const pad of pads) {
        if (pad && pad.connected) {
          const ax = Math.abs(pad.axes[0] || 0) > 0.18 ? pad.axes[0] : 0;
          const ay = Math.abs(pad.axes[1] || 0) > 0.18 ? pad.axes[1] : 0;
          const rx = Math.abs(pad.axes[2] || 0) > 0.18 ? pad.axes[2] : 0;
          return { yaw: -ax, pitch: -ay, roll: -rx };
        }
      }
    } catch {}
    return null;
  }

  updateLeadShip(ship, dt, elapsed, keys, touch, cameraForward, aliens = [], isCockpit = false) {
    let pitchInput = 0;
    let yawInput = 0;
    let rollInput = 0;
    let manualSteering = false;

    const pitchSign = this.invertPitch ? -1 : 1;

    if (keys['w'] || keys['arrowup']) {
      pitchInput += 1.0 * pitchSign;
      manualSteering = true;
    }
    if (keys['s'] || keys['arrowdown']) {
      pitchInput -= 1.0 * pitchSign;
      manualSteering = true;
    }
    if (keys['a'] || keys['arrowleft']) {
      yawInput += 1.0; // Left yaw
      manualSteering = true;
    }
    if (keys['d'] || keys['arrowright']) {
      yawInput -= 1.0; // Right yaw
      manualSteering = true;
    }
    if (keys['q']) {
      rollInput += 1.0; // Roll left
      manualSteering = true;
    }
    if (keys['e']) {
      rollInput -= 1.0; // Roll right
      manualSteering = true;
    }

    // Throttle & airbrake adjustments
    const braking = Boolean(keys['x'] || keys['control']);
    const boostPressed = Boolean(keys['shift'] || touch?.boost);
    if (keys['='] || keys['+']) this.throttle = Math.min(1.0, this.throttle + dt * 0.55);
    if (keys['-'] || keys['_']) this.throttle = Math.max(0.05, this.throttle - dt * 0.55);

    const sx = touch?.stickX || 0;
    const sy = touch?.stickY || 0;
    if (Math.hypot(sx, sy) > 0.12) {
      yawInput -= sx;
      pitchInput -= sy * pitchSign;
      manualSteering = true;
    }

    if (this.mouseSteer.active) {
      const dead = 0.05;
      const mx = Math.abs(this.mouseSteer.nx) > dead ? this.mouseSteer.nx : 0;
      const my = Math.abs(this.mouseSteer.ny) > dead ? this.mouseSteer.ny : 0;
      yawInput -= THREE.MathUtils.clamp(mx * 1.35, -1.25, 1.25);
      pitchInput -= THREE.MathUtils.clamp(my * 1.25, -1.25, 1.25) * pitchSign;
    }

    const gp = this.readGamepadAxes();
    if (gp && (Math.abs(gp.yaw) > 0 || Math.abs(gp.pitch) > 0 || Math.abs(gp.roll) > 0)) {
      yawInput += gp.yaw;
      pitchInput += gp.pitch * pitchSign;
      rollInput += gp.roll;
      manualSteering = true;
    }

    if (manualSteering) this.manualFlight = true;

    const maxBoost = ship.maxBoostEnergy || this.maxBoostEnergy || 100;
    this.maxBoostEnergy = maxBoost;

    if (this.manualFlight) {
      const agility = ship.agility || 1.0;
      const pitchRate = 1.65 * agility;
      const yawRate = 1.85 * agility;
      const rollRate = 2.45 * agility;

      const damp = 1 - Math.exp(-9.5 * dt);
      this.angularVel.pitch = THREE.MathUtils.lerp(this.angularVel.pitch, pitchInput * pitchRate, damp);
      this.angularVel.yaw = THREE.MathUtils.lerp(this.angularVel.yaw, yawInput * yawRate, damp);
      const autoBank = Math.abs(rollInput) < 0.05 ? -yawInput * 0.65 : 0;
      this.angularVel.roll = THREE.MathUtils.lerp(this.angularVel.roll, (rollInput * rollRate) + autoBank, damp);

      // Apply local 6-DOF quaternion rotations
      const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.angularVel.pitch * dt);
      const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.angularVel.yaw * dt);
      const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.angularVel.roll * dt);

      ship.mesh.quaternion.multiply(qYaw).multiply(qPitch).multiply(qRoll).normalize();

      // Boost / afterburner energy management
      if (boostPressed && this.boostEnergy > 4) {
        ship.boostActive = true;
        this.boostEnergy = Math.max(0, this.boostEnergy - 28 * dt);
      } else {
        ship.boostActive = false;
        this.boostEnergy = Math.min(maxBoost, this.boostEnergy + 18 * dt);
      }

      // Smooth velocity along ship nose
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.mesh.quaternion).normalize();
      let targetSpeed = (ship.maxSpeed || 225) * this.throttle;
      if (ship.boostActive) targetSpeed = (ship.maxSpeed || 225) * 1.55;
      else if (braking) targetSpeed = (ship.maxSpeed || 225) * 0.14;

      const desiredVel = forward.clone().multiplyScalar(targetSpeed);
      const accelBlend = 1 - Math.exp(-(braking ? 6.5 : 4.2) * dt);
      ship.vel.lerp(desiredVel, accelBlend);

      const previousPos = ship.pos.clone();
      ship.pos.addScaledVector(ship.vel, dt);

      const bodies = this.getFlightObstacles(ship);
      this.keepShipInFlightSpace(ship, previousPos, bodies);
      ship.mesh.position.copy(ship.pos);
      return;
    }

    // Regenerate boost energy smoothly during autopilot
    this.boostEnergy = Math.min(maxBoost, this.boostEnergy + 14 * dt);

    // Autopilot / Simulation Dogfight AI:
    let primaryTarget = null;
    let closestTargetDist = Infinity;
    const currentHeading = (ship.vel && ship.vel.lengthSq() > 0.1)
      ? ship.vel.clone().normalize()
      : new THREE.Vector3(0, 0, -1).applyQuaternion(ship.mesh.quaternion).normalize();

    if (aliens && aliens.length > 0) {
      for (const al of aliens) {
        if (!al || (al.health && al.health <= 0)) continue;
        const toAlien = al.pos.clone().sub(ship.pos);
        const dist = toAlien.length();
        const fwdDot = currentHeading.dot(toAlien.clone().normalize());

        let score = dist;
        if (isCockpit) {
          score = dist < 380 ? dist * 0.35 : dist * 0.85;
          if (fwdDot > 0.4) score *= 0.8;
        } else {
          if (fwdDot > 0.3) score *= 0.6;
          else if (fwdDot < -0.3) score *= 1.35;
        }

        if (score < closestTargetDist) {
          closestTargetDist = score;
          primaryTarget = al;
        }
      }
    }

    if (primaryTarget && closestTargetDist < 1600) {
      const toTarget = primaryTarget.pos.clone().sub(ship.pos);
      const dist = toTarget.length();
      const projectileSpeed = 950;
      const leadTime = THREE.MathUtils.clamp(dist / projectileSpeed, 0.05, 0.75);
      const leadPos = primaryTarget.pos.clone().addScaledVector(primaryTarget.vel || new THREE.Vector3(), leadTime);
      const interceptHeading = leadPos.sub(ship.pos).normalize();

      const curDir = currentHeading.clone();
      const angleToTarget = curDir.angleTo(interceptHeading);
      const turnAuthority = isCockpit ? 6.5 : 4.0;
      const maxTurn = turnAuthority * dt;
      const turnFrac = Math.min(1.0, maxTurn / Math.max(0.001, angleToTarget));
      const newDir = curDir.clone().lerp(interceptHeading, turnFrac).normalize();

      let targetSpeed = ship.maxSpeed;
      if (angleToTarget > 0.65) {
        targetSpeed = ship.maxSpeed * (isCockpit ? 0.40 : 0.62);
      } else if (dist > 150) {
        targetSpeed = ship.maxSpeed * 1.25;
        ship.boostActive = true;
      } else if (dist < 45) {
        targetSpeed = ship.maxSpeed * 0.85;
      }
      ship.vel.copy(newDir).multiplyScalar(targetSpeed);

      if (dist < 26) {
        const breakVec = new THREE.Vector3(0, 1, 0).cross(newDir).normalize();
        ship.vel.addScaledVector(breakVec, 110.0 * dt);
      }

      const bodies = this.getFlightObstacles(ship);
      const avoidance = this.avoidFlightObstacles(ship, bodies);
      if (avoidance.lengthSq() > 0.0001) {
        ship.vel.addScaledVector(avoidance, ship.maxSpeed * 2.8 * dt);
      }

      const previousPos = ship.pos.clone();
      ship.pos.addScaledVector(ship.vel, dt);
      this.keepShipInFlightSpace(ship, previousPos, bodies);

      const forwardDir = ship.vel.clone().normalize();
      const worldUp = new THREE.Vector3(0, 1, 0);
      const shipRight = new THREE.Vector3().crossVectors(forwardDir, worldUp);
      if (shipRight.lengthSq() < 0.0001) shipRight.set(1, 0, 0);
      shipRight.normalize();
      const shipUp = new THREE.Vector3().crossVectors(shipRight, forwardDir).normalize();

      const yawTurn = (interceptHeading.x - currentHeading.x) * 4.5;
      const maxBank = isCockpit ? 0.40 : 0.55;
      const rollAngle = THREE.MathUtils.clamp(-yawTurn * 0.5, -maxBank, maxBank);
      const bankedUp = shipUp.clone().applyAxisAngle(forwardDir, rollAngle);

      const aimDir = isCockpit ? forwardDir.clone().lerp(interceptHeading, 0.5).normalize() : forwardDir;
      const targetRotMat = new THREE.Matrix4().lookAt(ship.pos, ship.pos.clone().add(aimDir), bankedUp);
      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(targetRotMat);
      ship.mesh.quaternion.slerp(targetQuat, 1 - Math.exp(-16.0 * dt));
      return;
    }

    // General patrol when no close target
    const steer = new THREE.Vector3(0, 0, 0);
    const orbitSign = Math.sin(elapsed * 0.08) >= 0 ? 1 : -1;
    const radial = new THREE.Vector3(ship.pos.x, 0, ship.pos.z).normalize();
    const tangent = new THREE.Vector3(-radial.z * orbitSign, 0, radial.x * orbitSign);
    steer.addScaledVector(tangent, 2.2);

    const weaveLateral = Math.sin(elapsed * 0.7) * 1.6;
    const weaveVertical = Math.cos(elapsed * 0.5) * 1.2;
    const sideVec = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    steer.addScaledVector(sideVec, weaveLateral);
    steer.y += weaveVertical;

    let nearestPlanet = null;
    let nearestPlanetDist = Infinity;
    if (this.env?.planets) {
      this.env.planets.forEach(p => {
        const dist = ship.pos.distanceTo(p.mesh.position);
        if (dist < nearestPlanetDist) {
          nearestPlanetDist = dist;
          nearestPlanet = p;
        }
      });
    }
    if (nearestPlanet && nearestPlanetDist < nearestPlanet.radius + 260) {
      const desiredApproachDist = nearestPlanet.radius + 130;
      const toPlanet = nearestPlanet.mesh.position.clone().sub(ship.pos);
      const dist = toPlanet.length();
      if (dist > desiredApproachDist + 80) {
        steer.addScaledVector(toPlanet.normalize(), 1.8);
      } else {
        const orbitTangent = new THREE.Vector3().crossVectors(toPlanet.normalize(), new THREE.Vector3(0, 1, 0)).normalize();
        steer.addScaledVector(orbitTangent.multiplyScalar(orbitSign), 2.2);
      }
    }

    this.applySteering(ship, steer, dt);
  }

  getFormationSlotOffset(idx, totalWingmen, leadShip, elapsed) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(leadShip.mesh.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(leadShip.mesh.quaternion).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(leadShip.mesh.quaternion).normalize();
    const slotIdx = idx - 1;
    const offset = new THREE.Vector3();

    if (this.fleetFormation === 'wall') {
      const span = slotIdx - (totalWingmen - 1) / 2;
      offset.addScaledVector(right, span * 20).addScaledVector(forward, 14);
      offset.addScaledVector(up, Math.sin(elapsed * 1.8 + idx) * 3);
    } else if (this.fleetFormation === 'echelon') {
      offset.addScaledVector(right, (slotIdx + 1) * 16).addScaledVector(forward, -(slotIdx + 1) * 14);
      offset.addScaledVector(up, (slotIdx % 2 === 0 ? 1 : -1) * 4);
    } else if (this.fleetFormation === 'orbit') {
      const angle = (slotIdx / Math.max(1, totalWingmen)) * Math.PI * 2 + elapsed * 0.55;
      offset.addScaledVector(right, Math.cos(angle) * 38)
        .addScaledVector(up, Math.sin(angle) * 20)
        .addScaledVector(forward, -10);
    } else {
      // 'arrowhead' default
      const row = Math.floor(slotIdx / 2) + 1;
      const side = slotIdx % 2 === 0 ? -1 : 1;
      offset.addScaledVector(right, side * row * 19)
        .addScaledVector(forward, 12 - row * 18)
        .addScaledVector(up, Math.sin(elapsed * 2.0 + idx) * 3.5);
    }
    return offset;
  }

  updateWingmanShip(ship, idx, leadShip, ships, aliens, dt, elapsed, cameraForward, lockedTarget = null) {
    if (!leadShip) return;
    const steer = new THREE.Vector3(0, 0, 0);
    const totalWingmen = Math.max(1, ships.length - 1);
    const slotOffset = this.getFormationSlotOffset(idx, totalWingmen, leadShip, elapsed);
    const formationTarget = leadShip.pos.clone().add(slotOffset);

    const nearestEnemy = aliens.reduce((best, alien) => {
      if (!best) return alien;
      return alien.pos.distanceToSquared(leadShip.pos) < best.pos.distanceToSquared(leadShip.pos) ? alien : best;
    }, null);

    const order = this.squadronOrder || 'escort';
    let combatTarget = null;
    let interceptRange = 210;
    let formWeight = 2.8;
    let attackWeight = 2.4;

    if (order === 'attack') {
      combatTarget = (lockedTarget && aliens.includes(lockedTarget)) ? lockedTarget : nearestEnemy;
      interceptRange = 560;
      formWeight = 1.1;
      attackWeight = 3.4;
    } else if (order === 'defend') {
      combatTarget = nearestEnemy;
      interceptRange = 175;
      formWeight = 3.4;
      attackWeight = 1.9;
    } else if (order === 'hunt') {
      combatTarget = aliens.reduce((best, alien) =>
        !best || alien.pos.distanceToSquared(ship.pos) < best.pos.distanceToSquared(ship.pos) ? alien : best, null);
      interceptRange = 640;
      formWeight = 0.85;
      attackWeight = 3.2;
    } else {
      // 'escort'
      const tacticCycle = (elapsed * 0.25 + idx * 0.7) % (Math.PI * 2);
      const isIntercepting = Math.sin(tacticCycle) > 0.25;
      combatTarget = isIntercepting ? nearestEnemy : null;
      interceptRange = 240;
    }

    const engaged = combatTarget && combatTarget.pos.distanceTo(leadShip.pos) < interceptRange;
    if (engaged) {
      const attackPoint = combatTarget.pos.clone().addScaledVector(
        combatTarget.vel.lengthSq() > 0.01 ? combatTarget.vel.clone().normalize() : new THREE.Vector3(0, 0, -1),
        16
      );
      const toEnemy = attackPoint.sub(ship.pos);
      if (toEnemy.lengthSq() > 1) steer.addScaledVector(toEnemy.normalize(), attackWeight);
      steer.addScaledVector(formationTarget.clone().sub(ship.pos).normalize(), 0.7);
    } else {
      const toSlot = formationTarget.sub(ship.pos);
      const slotDist = toSlot.length();
      if (slotDist > 2) {
        steer.addScaledVector(toSlot.normalize(), formWeight * Math.min(1.6, slotDist / 18));
      }
      if (leadShip.vel.lengthSq() > 1) {
        steer.addScaledVector(leadShip.vel.clone().normalize(), 1.4);
      }
    }

    // Keep squadron tethered within active combat bubble around player
    const tetherLimit = order === 'hunt' ? 360 : (order === 'defend' ? 95 : 180);
    const distToLead = ship.pos.distanceTo(leadShip.pos);
    if (distToLead > tetherLimit) {
      steer.addScaledVector(leadShip.pos.clone().sub(ship.pos).normalize(), 3.6);
    }

    // Boids flocking separation / cohesion / alignment
    const separation = new THREE.Vector3();
    const cohesion = new THREE.Vector3();
    const alignment = new THREE.Vector3();
    let neighbors = 0;

    ships.forEach((other, oIdx) => {
      if (idx === oIdx) return;
      const d = ship.pos.distanceTo(other.pos);
      if (d < 130) {
        neighbors++;
        if (d < 28) {
          const diff = ship.pos.clone().sub(other.pos).normalize();
          separation.addScaledVector(diff, 55 / Math.max(d, 1));
        }
        cohesion.add(other.pos);
        alignment.add(other.vel);
      }
    });

    if (neighbors > 0) {
      cohesion.divideScalar(neighbors).sub(ship.pos).normalize();
      steer.addScaledVector(cohesion, 0.45);
      alignment.divideScalar(neighbors).normalize();
      steer.addScaledVector(alignment, 0.55);
    }
    steer.add(separation);

    this.applySteering(ship, steer, dt, true);
  }

  updateAlienShip(al, aIdx, leadShip, dt, elapsed, cameraForward) {
    if (!leadShip) return;

    // Ion EMP stun slows and spins the enemy ship
    if (al.ionStunTimer > 0) {
      al.ionStunTimer = Math.max(0, al.ionStunTimer - dt);
      al.vel.multiplyScalar(Math.max(0.25, 1 - dt * 2.2));
      const prev = al.pos.clone();
      al.pos.addScaledVector(al.vel, dt);
      this.keepShipInFlightSpace(al, prev, this.getFlightObstacles(al));
      al.mesh.rotation.z += dt * 3.8;
      al.mesh.rotation.x += dt * 1.4;
      return;
    }

    const fwd = cameraForward.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(fwd, up).normalize();
    const archetype = al.archetype || 'interceptor';

    // Boss Dreadnought maintains a majestic combat orbit facing the fleet
    if (al.isBoss || archetype === 'boss') {
      const orbitAngle = elapsed * 0.28 + aIdx;
      const orbitDist = 185;
      const targetPoint = leadShip.pos.clone()
        .addScaledVector(fwd, 95 + Math.cos(orbitAngle) * 65)
        .addScaledVector(side, Math.sin(orbitAngle) * orbitDist);
      targetPoint.y = leadShip.pos.y + Math.sin(elapsed * 0.4) * 24;

      const toTarget = targetPoint.sub(al.pos);
      const steer = toTarget.lengthSq() > 1 ? toTarget.normalize().multiplyScalar(1.8) : new THREE.Vector3();
      steer.addScaledVector(this.avoidFlightObstacles(al, this.getFlightObstacles(al)), 5);

      al.vel.addScaledVector(steer, (al.maxSpeed || 95) * 0.45 * dt);
      if (al.vel.length() > (al.maxSpeed || 95)) al.vel.normalize().multiplyScalar(al.maxSpeed || 95);

      const prev = al.pos.clone();
      al.pos.addScaledVector(al.vel, dt);
      this.keepShipInFlightSpace(al, prev, this.getFlightObstacles(al));

      const lookDir = leadShip.pos.clone().sub(al.pos).normalize();
      if (lookDir.lengthSq() > 0.01) {
        const targetRot = new THREE.Matrix4().lookAt(al.pos, al.pos.clone().add(lookDir), new THREE.Vector3(0, 1, 0));
        al.mesh.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(targetRot), 3.0 * dt);
      }
      if (al.mesh.userData.energyRing) {
        al.mesh.userData.energyRing.rotation.z += dt * 1.6;
        al.mesh.userData.energyRing.rotation.x += dt * 0.7;
      }
      return;
    }

    const speedFactor = archetype === 'scout' ? 1.55 : (archetype === 'gunship' ? 0.72 : 1.1);
    const runCycle = (elapsed * speedFactor + aIdx * 1.4) % (Math.PI * 2);
    const sweepAmp = archetype === 'gunship' ? 48 : (archetype === 'scout' ? 28 : 34);
    const sweepDist = Math.sin(runCycle * 1.8) * sweepAmp;
    const forwardOffset = (archetype === 'gunship' ? 42 : 20) + Math.abs(Math.cos(runCycle)) * 58;
    const verticalOffset = Math.sin(elapsed * 1.6 + aIdx * 1.3) * 14;

    const targetPoint = leadShip.pos.clone()
      .addScaledVector(fwd, forwardOffset)
      .addScaledVector(side, sweepDist);
    targetPoint.y += verticalOffset;

    const toTarget = targetPoint.sub(al.pos);
    const distToLead = al.pos.distanceTo(leadShip.pos);
    const steer = new THREE.Vector3();

    if (distToLead > 200) {
      steer.copy(toTarget).normalize().multiplyScalar(3.0);
    } else if (distToLead < 28) {
      const evadeSide = al.pos.clone().sub(leadShip.pos).dot(side) >= 0 ? side : side.clone().negate();
      steer.addScaledVector(evadeSide, 3.2);
      steer.addScaledVector(fwd, 2.0);
    } else {
      steer.copy(toTarget).normalize().multiplyScalar(2.2);
      steer.addScaledVector(side, Math.sin(elapsed * 3.0 + aIdx) * 1.1);
      const camCorridorProj = al.pos.clone().sub(leadShip.pos);
      const lateralDeviation = camCorridorProj.clone().addScaledVector(fwd, -camCorridorProj.dot(fwd));
      if (lateralDeviation.length() > 36) {
        steer.addScaledVector(lateralDeviation.normalize().negate(), 2.0);
      }
    }

    if (distToLead > 250) {
      steer.addScaledVector(leadShip.pos.clone().sub(al.pos).normalize(), 3.5);
    }

    const radial = Math.hypot(al.pos.x, al.pos.z);
    if (radial < ONE_AU + 200) steer.addScaledVector(new THREE.Vector3(al.pos.x, 0, al.pos.z).normalize(), 4);
    if (radial > SYSTEM_EDGE - 350) steer.addScaledVector(new THREE.Vector3(-al.pos.x, 0, -al.pos.z).normalize(), 4);
    steer.addScaledVector(this.avoidFlightObstacles(al, this.getFlightObstacles(al)), 5);
    steer.y += -al.pos.y * 0.012 - al.vel.y * 0.008;

    al.vel.addScaledVector(steer, al.maxSpeed * 0.38 * dt);

    const speed = al.vel.length();
    if (speed > al.maxSpeed) al.vel.normalize().multiplyScalar(al.maxSpeed);

    const previousPos = al.pos.clone();
    al.pos.addScaledVector(al.vel, dt);
    this.keepShipInFlightSpace(al, previousPos, this.getFlightObstacles(al));

    if (al.vel.lengthSq() > 0.1) {
      const forwardDir = al.vel.clone().normalize();
      const alienBankTime = elapsed * 0.9 + aIdx * 2.3;
      const alienRollCycle = Math.sin(alienBankTime * 0.6);
      let rollAngle = 0;
      if (alienRollCycle > 0.6 && archetype !== 'gunship') {
        rollAngle = Math.PI * THREE.MathUtils.smoothstep(alienRollCycle, 0.6, 0.9);
      } else {
        rollAngle = Math.sin(alienBankTime) * (archetype === 'gunship' ? 0.35 : 0.95);
      }

      const worldUp = new THREE.Vector3(0, 1, 0);
      const shipRight = new THREE.Vector3().crossVectors(forwardDir, worldUp);
      if (shipRight.lengthSq() < 0.0001) shipRight.set(1, 0, 0);
      shipRight.normalize();
      const shipUp = new THREE.Vector3().crossVectors(shipRight, forwardDir).normalize();
      const bankedUp = shipUp.clone().applyAxisAngle(forwardDir, rollAngle);

      const targetRotation = new THREE.Matrix4().lookAt(al.pos, al.pos.clone().add(forwardDir), bankedUp);
      const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(targetRotation);
      al.mesh.quaternion.slerp(targetQuaternion, 8.0 * dt);
    }
  }

  applySteering(ship, steer, dt, skipVerticalDamp = false) {
    if (!skipVerticalDamp) {
      steer.y += -ship.pos.y * 0.09 - ship.vel.y * 0.15;
    }
    const bodies = this.getFlightObstacles(ship);
    const avoidance = this.avoidFlightObstacles(ship, bodies);
    const avoiding = avoidance.lengthSq() > 0.0001;
    steer.addScaledVector(avoidance, 8);

    this.env.asteroids.forEach(a => {
      if (!a.active) return;
      const d = ship.pos.distanceTo(a.mesh.position);
      const avoidR = a.radius * 2.2 + 15;
      if (d < avoidR) {
        const repel = ship.pos.clone().sub(a.mesh.position).normalize();
        const factor = 1.0 - d / avoidR;
        steer.addScaledVector(repel, factor * 90.0);
      }
    });

    if (steer.lengthSq() > 0.001) {
      steer.normalize().multiplyScalar(ship.maxSpeed * (avoiding ? 2.4 : 0.28));
      ship.vel.addScaledVector(steer, dt);
    }

    const speed = ship.vel.length();
    const speedLimit = ship.boostActive ? ship.maxSpeed * 1.25 : ship.maxSpeed;
    if (speed > speedLimit) {
      ship.vel.normalize().multiplyScalar(speedLimit);
    } else if (speed < 55) {
      if (speed > 0.01) ship.vel.normalize().multiplyScalar(75);
      else ship.vel.set(0, 0, -75);
    }

    const previousPos = ship.pos.clone();
    ship.pos.addScaledVector(ship.vel, dt);
    this.keepShipInFlightSpace(ship, previousPos, bodies);

    if (ship.vel.lengthSq() > 0.1) {
      const forwardDir = ship.vel.clone().normalize();
      const bankTime = performance.now() * 0.001 * 0.8 + (ship.bankSeed || 0);
      const rollCycle = Math.sin(bankTime * 0.5);
      let rollAngle = 0;
      if (rollCycle > 0.55) {
        rollAngle = Math.PI * THREE.MathUtils.smoothstep(rollCycle, 0.55, 0.85);
      } else {
        rollAngle = Math.sin(bankTime) * 0.85;
      }

      const worldUp = new THREE.Vector3(0, 1, 0);
      const shipRight = new THREE.Vector3().crossVectors(forwardDir, worldUp);
      if (shipRight.lengthSq() < 0.0001) shipRight.set(1, 0, 0);
      shipRight.normalize();
      const shipUp = new THREE.Vector3().crossVectors(shipRight, forwardDir).normalize();
      const bankedUp = shipUp.clone().applyAxisAngle(forwardDir, rollAngle);

      const targetRotation = new THREE.Matrix4().lookAt(ship.pos, ship.pos.clone().add(forwardDir), bankedUp);
      const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(targetRotation);
      ship.mesh.quaternion.slerp(targetQuaternion, 8.5 * dt);
    }
  }
}
