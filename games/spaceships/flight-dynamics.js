// Ship and Squadron Flight Dynamics, Formations, Avoidance, and Combat Maneuvering
import { ONE_AU, SYSTEM_EDGE } from './environment-manager.js';

const THREE = window.THREE;

export class FlightDynamics {
  constructor(environment) {
    this.env = environment;
    this.patrolRadius = 1700;
  }

  getFlightObstacles(ship) {
    const clearance = (ship?.size || 4) + 10;
    const bodies = [{ center: new THREE.Vector3(), radius: ONE_AU + (ship?.size || 4) }];
    this.env.planets.forEach(planet => {
      bodies.push({ center: planet.mesh.position, radius: planet.radius + clearance });
      planet.moons.forEach(moon => bodies.push({ center: moon.mesh.position, radius: moon.radius + clearance }));
    });
    return bodies;
  }

  avoidFlightObstacles(ship, bodies) {
    const direction = ship.vel.clone().normalize();
    const lookAhead = Math.max(260, ship.vel.length() * 2.4);
    const avoidance = new THREE.Vector3();
    for (const body of bodies) {
      const along = THREE.MathUtils.clamp(body.center.clone().sub(ship.pos).dot(direction), 0, lookAhead);
      const closest = ship.pos.clone().addScaledVector(direction, along);
      const away = closest.sub(body.center);
      const warningRadius = body.radius + 100;
      const distance = away.length();
      if (distance < warningRadius) {
        if (distance < 0.001) away.copy(ship.pos).sub(body.center);
        away.normalize();
        avoidance.addScaledVector(away, (warningRadius - distance) / warningRadius);
      }
    }
    const radial = new THREE.Vector3(ship.pos.x, 0, ship.pos.z);
    const radius = radial.length();
    if (radius > SYSTEM_EDGE - 350) avoidance.addScaledVector(radial.normalize(), -Math.max(0, (radius - (SYSTEM_EDGE - 350)) / 350));
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
        const normal = hitPoint.sub(body.center).normalize();
        ship.pos.copy(body.center).addScaledVector(normal, body.radius + 3);
        ship.vel.reflect(normal).multiplyScalar(0.7);
        const forward = ship.vel.clone().normalize();
        if (forward.lengthSq() > 0.001) {
          const tangent = new THREE.Vector3().crossVectors(normal, forward).cross(normal).normalize();
          ship.vel.addScaledVector(tangent, ship.maxSpeed * 0.4);
        }
        break;
      }
    }
  }

  updateLeadShip(ship, dt, elapsed, keys, touch, cameraForward, aliens = [], isCockpit = false) {
    let manualSteering = false;
    let yawChange = 0;
    let pitchChange = 0;

    if (keys['w'] || keys['arrowup']) {
      pitchChange = -1.8;
      manualSteering = true;
    }
    if (keys['s'] || keys['arrowdown']) {
      pitchChange = 1.8;
      manualSteering = true;
    }
    if (keys['a'] || keys['arrowleft']) {
      yawChange = -2.2;
      manualSteering = true;
    }
    if (keys['d'] || keys['arrowright']) {
      yawChange = 2.2;
      manualSteering = true;
    }

    const sx = touch.stickX || 0;
    const sy = touch.stickY || 0;
    if (Math.hypot(sx, sy) > 0.15) {
      yawChange += sx * 2.2;
      pitchChange += sy * 1.8;
      manualSteering = true;
    }
    if (touch.boost) ship.boostActive = true;

    if (manualSteering) {
      const currentForward = ship.vel.clone().normalize();
      const right = new THREE.Vector3(0, 1, 0).cross(currentForward).normalize();
      const up = currentForward.clone().cross(right).normalize();

      if (yawChange !== 0) currentForward.addScaledVector(right, yawChange * dt);
      if (pitchChange !== 0) currentForward.addScaledVector(up, pitchChange * dt);
      currentForward.normalize();
      const targetSp = ship.boostActive ? ship.maxSpeed * 1.25 : ship.maxSpeed;
      ship.vel.copy(currentForward).multiplyScalar(targetSp);
      return;
    }

    // Autopilot / Simulation Dogfight AI:
    // When in cockpit, the starfighter aggressively hunts and turns its nose to face CLOSE enemies!
    let primaryTarget = null;
    let closestTargetDist = Infinity;
    const currentHeading = (ship.vel && ship.vel.lengthSq() > 0.1) ? ship.vel.clone().normalize() : new THREE.Vector3(0, 0, -1);

    if (aliens && aliens.length > 0) {
      for (const al of aliens) {
        if (!al || (al.health && al.health <= 0)) continue;
        const toAlien = al.pos.clone().sub(ship.pos);
        const dist = toAlien.length();
        const fwdDot = currentHeading.dot(toAlien.clone().normalize());

        let score = dist;
        if (isCockpit) {
          // IN COCKPIT: Aggressively prioritize CLOSE enemies regardless of direction!
          // Close enemies (< 380 units) get top priority so the ship immediately turns to face them
          if (dist < 380) {
            score = dist * 0.35; // Massive priority for close bogeys
          } else {
            score = dist * 0.85;
          }
          if (fwdDot > 0.4) score *= 0.8;
        } else {
          // Normal mode: prioritize enemies ahead, but track any enemy within dogfight range
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

      // Lead pursuit: project intercept vector so forward laser cannons hit dead-center
      const projectileSpeed = 950;
      const leadTime = THREE.MathUtils.clamp(dist / projectileSpeed, 0.05, 0.75);
      const leadPos = primaryTarget.pos.clone().addScaledVector(primaryTarget.vel || new THREE.Vector3(), leadTime);
      const interceptHeading = leadPos.sub(ship.pos).normalize();

      // Starfighter turn authority: in cockpit mode, snap nose directly towards target at high agility (6.5 rad/s)
      const curDir = currentHeading.clone();
      const angleToTarget = curDir.angleTo(interceptHeading);
      const turnAuthority = isCockpit ? 6.5 : 4.0;
      const maxTurn = turnAuthority * dt;
      const turnFrac = Math.min(1.0, maxTurn / Math.max(0.001, angleToTarget));
      const newDir = curDir.clone().lerp(interceptHeading, turnFrac).normalize();

      // Combat throttle modulation: brake into turns to cut turning radius, sprint full throttle when bore-sight aligned
      let targetSpeed = ship.maxSpeed;
      if (angleToTarget > 0.65) {
        // High angle-off: combat air-braking allows tight pirouette into enemy
        targetSpeed = ship.maxSpeed * (isCockpit ? 0.40 : 0.62);
      } else if (dist > 150) {
        targetSpeed = ship.maxSpeed * 1.25;
        ship.boostActive = true;
      } else if (dist < 45) {
        targetSpeed = ship.maxSpeed * 0.85;
      }
      ship.vel.copy(newDir).multiplyScalar(targetSpeed);

      // Avoid head-on ramming if closer than 26 units
      if (dist < 26) {
        const breakVec = new THREE.Vector3(0, 1, 0).cross(newDir).normalize();
        ship.vel.addScaledVector(breakVec, 110.0 * dt);
      }

      // Avoid celestial bodies and planets
      const bodies = this.getFlightObstacles(ship);
      const avoidance = this.avoidFlightObstacles(ship, bodies);
      if (avoidance.lengthSq() > 0.0001) {
        ship.vel.addScaledVector(avoidance, ship.maxSpeed * 2.8 * dt);
      }

      const previousPos = ship.pos.clone();
      ship.pos.addScaledVector(ship.vel, dt);
      this.keepShipInFlightSpace(ship, previousPos, bodies);

      // Realistic 3D banking and roll into turns
      const forwardDir = ship.vel.clone().normalize();
      const worldUp = new THREE.Vector3(0, 1, 0);
      const shipRight = new THREE.Vector3().crossVectors(forwardDir, worldUp).normalize();
      const shipUp = new THREE.Vector3().crossVectors(shipRight, forwardDir).normalize();

      // Dynamic bank angle proportional to turn rate
      // Moderated bank angle ensures the solar disk and planets remain mostly horizontal
      const yawTurn = (interceptHeading.x - currentHeading.x) * 4.5;
      const maxBank = isCockpit ? 0.40 : 0.55;
      const rollAngle = THREE.MathUtils.clamp(-yawTurn * 0.5, -maxBank, maxBank);
      const bankedUp = shipUp.clone().applyAxisAngle(forwardDir, rollAngle);

      // When in cockpit, align starfighter nose cleanly toward the bogey
      const aimDir = isCockpit ? forwardDir.clone().lerp(interceptHeading, 0.5).normalize() : forwardDir;
      const targetRotMat = new THREE.Matrix4().lookAt(ship.pos, ship.pos.clone().add(aimDir), bankedUp);
      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(targetRotMat);
      ship.mesh.quaternion.slerp(targetQuat, 1 - Math.exp(-16.0 * dt));
      return;
    }

    const steer = new THREE.Vector3(0, 0, 0);
    // General combat patrol across solar system when no close target
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

  updateWingmanShip(ship, idx, leadShip, ships, aliens, dt, elapsed, cameraForward) {
    const steer = new THREE.Vector3(0, 0, 0);
    const fwd = cameraForward.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(fwd, up).normalize();
    const wingSide = (idx % 2 === 0 ? 1 : -1);
    const tier = Math.ceil(idx / 2);

    // Dynamic tactical switching: 60% Escort formations, 40% Intercept dogfight sweeps
    const tacticCycle = (elapsed * 0.25 + idx * 0.7) % (Math.PI * 2);
    const isIntercepting = Math.sin(tacticCycle) > 0.3;

    // Prioritize hostile aliens that are threatening the player ship
    const nearestEnemy = aliens.reduce((best, alien) => {
      if (!best) return alien;
      const dLeadAlien = alien.pos.distanceToSquared(leadShip.pos);
      const dLeadBest = best.pos.distanceToSquared(leadShip.pos);
      return dLeadAlien < dLeadBest ? alien : best;
    }, null);

    if (isIntercepting && nearestEnemy && nearestEnemy.pos.distanceTo(leadShip.pos) < 260) {
      // Swarm toward enemy in a dogfight sweep, pulling the fight right across the player's sightline
      const attackPoint = nearestEnemy.pos.clone().addScaledVector(nearestEnemy.vel.clone().normalize(), 18);
      const toEnemy = attackPoint.sub(ship.pos);
      steer.add(toEnemy.normalize().multiplyScalar(2.6));
      // Attract strongly toward player's forward view corridor so the action is right in front of player
      const actionPocket = leadShip.pos.clone().addScaledVector(fwd, 35);
      steer.addScaledVector(actionPocket.sub(ship.pos).normalize(), 1.5);
    } else {
      // Formation escort: Tight battle wingmen framed right alongside and ahead of the player ship
      // Keep them close: 10-24 units ahead, 12-28 units to the sides
      const aheadDist = 12 + (tier * 6);
      const lateralDist = 14 + (tier * 8);

      const wingTarget = leadShip.pos.clone()
        .addScaledVector(fwd, aheadDist)
        .addScaledVector(right, wingSide * lateralDist);
      wingTarget.y += Math.sin(elapsed * 2.2 + idx * 1.2) * 5;

      const toTarget = wingTarget.sub(ship.pos);
      if (toTarget.lengthSq() > 4) {
        steer.add(toTarget.normalize().multiplyScalar(2.8));
      }
    }

    // Heavy player tether: if wingman drifts more than 160 units from player, pull back hard
    const distToLead = ship.pos.distanceTo(leadShip.pos);
    if (distToLead > 140) {
      const pullToLead = leadShip.pos.clone().sub(ship.pos).normalize();
      steer.addScaledVector(pullToLead, 3.2);
    }

    // Active camera attraction force: pull wingmen into player camera viewing volume
    const toCameraLine = ship.pos.clone().sub(leadShip.pos);
    const dotCam = toCameraLine.dot(fwd);
    if (dotCam < 0) {
      // Behind player in camera perspective: give strong forward urge
      steer.addScaledVector(fwd, 2.2);
    }

    // Flocking behaviors
    const separation = new THREE.Vector3();
    const cohesion = new THREE.Vector3();
    const alignment = new THREE.Vector3();
    let neighbors = 0;

    ships.forEach((other, oIdx) => {
      if (idx === oIdx) return;
      const d = ship.pos.distanceTo(other.pos);
      if (d < 140) {
        neighbors++;
        if (d < 35) {
          const diff = ship.pos.clone().sub(other.pos).normalize();
          separation.addScaledVector(diff, 60 / (d || 1));
        }
        cohesion.add(other.pos);
        alignment.add(other.vel);
      }
    });

    if (neighbors > 0) {
      cohesion.divideScalar(neighbors).sub(ship.pos).normalize();
      steer.addScaledVector(cohesion, 0.65);
      alignment.divideScalar(neighbors).normalize();
      steer.addScaledVector(alignment, 0.6);
    }
    steer.add(separation);

    this.applySteering(ship, steer, dt);
  }

  updateAlienShip(al, aIdx, leadShip, dt, elapsed, cameraForward) {
    if (!leadShip) return;

    const fwd = cameraForward.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(fwd, up).normalize();

    // High drama Star Wars attack passes designed to cut right through the active camera frame!
    const runCycle = (elapsed * 1.1 + aIdx * 1.4) % (Math.PI * 2);
    // Sweeps oscillate across camera view horizontally and vertically
    const sweepDist = Math.sin(runCycle * 1.8) * 32;
    // Keep attack paths tightly clustered around the forward camera view (+15 to +70 units ahead of player)
    const forwardOffset = 18 + Math.abs(Math.cos(runCycle)) * 55;
    const verticalOffset = Math.sin(elapsed * 1.6 + aIdx * 1.3) * 12;

    const targetPoint = leadShip.pos.clone()
      .addScaledVector(fwd, forwardOffset)
      .addScaledVector(side, sweepDist);
    targetPoint.y += verticalOffset;

    const toTarget = targetPoint.sub(al.pos);
    const distToLead = al.pos.distanceTo(leadShip.pos);
    let steer = new THREE.Vector3();

    if (distToLead > 180) {
      // Aggressively charge straight toward the player's close-quarter combat zone
      steer.copy(toTarget).normalize().multiplyScalar(3.0);
    } else if (distToLead < 26) {
      // Close break-away juke right across the player's canopy
      const evadeSide = al.pos.clone().sub(leadShip.pos).dot(side) >= 0 ? side : side.clone().negate();
      steer.addScaledVector(evadeSide, 3.2);
      steer.addScaledVector(fwd, 2.0);
    } else {
      // In primary combat range (26 - 180 units): strafe directly across the player's forward sightline
      steer.copy(toTarget).normalize().multiplyScalar(2.2);
      steer.addScaledVector(side, Math.sin(elapsed * 3.0 + aIdx) * 1.1);
      // Tight camera-inward force: strongly pull enemy directly toward the player's forward centerline
      const camCorridorProj = al.pos.clone().sub(leadShip.pos);
      const lateralDeviation = camCorridorProj.clone().addScaledVector(fwd, -camCorridorProj.dot(fwd));
      if (lateralDeviation.length() > 32) {
        steer.addScaledVector(lateralDeviation.normalize().negate(), 2.0);
      }
    }

    // Heavy player leash: enemy ships never wander far from the player
    if (distToLead > 220) {
      const pullToPlayer = leadShip.pos.clone().sub(al.pos).normalize();
      steer.addScaledVector(pullToPlayer, 3.5);
    }

    // Avoid Sun
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

    // Alien 3D banking, barrel rolls, and inverted passes
    if (al.vel.lengthSq() > 0.1) {
      const forwardDir = al.vel.clone().normalize();
      const alienBankTime = elapsed * 0.9 + aIdx * 2.3;
      const alienRollCycle = Math.sin(alienBankTime * 0.6);
      let rollAngle = 0;
      if (alienRollCycle > 0.6) {
        rollAngle = Math.PI * THREE.MathUtils.smoothstep(alienRollCycle, 0.6, 0.9);
      } else {
        rollAngle = Math.sin(alienBankTime) * 0.95;
      }

      const worldUp = new THREE.Vector3(0, 1, 0);
      const shipRight = new THREE.Vector3().crossVectors(forwardDir, worldUp).normalize();
      const shipUp = new THREE.Vector3().crossVectors(shipRight, forwardDir).normalize();
      const bankedUp = shipUp.clone().applyAxisAngle(forwardDir, rollAngle);

      const targetRotation = new THREE.Matrix4().lookAt(al.pos, al.pos.clone().add(forwardDir), bankedUp);
      const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(targetRotation);
      al.mesh.quaternion.slerp(targetQuaternion, 8.0 * dt);
    }
  }

  applySteering(ship, steer, dt) {
    steer.y += -ship.pos.y * 0.09 - ship.vel.y * 0.15;
    const bodies = this.getFlightObstacles(ship);
    const avoidance = this.avoidFlightObstacles(ship, bodies);
    const avoiding = avoidance.lengthSq() > 0.0001;
    steer.addScaledVector(avoidance, 8);

    // Avoid asteroids
    this.env.asteroids.forEach(a => {
      const d = ship.pos.distanceTo(a.mesh.position);
      const avoidR = a.radius * 2.2 + 15;
      if (d < avoidR) {
        const repel = ship.pos.clone().sub(a.mesh.position).normalize();
        const factor = (1.0 - d / avoidR);
        steer.addScaledVector(repel, factor * 90.0);
      }
    });

    if (steer.lengthSq() > 0.001) {
      steer.normalize().multiplyScalar(ship.maxSpeed * (avoiding ? 2.4 : 0.22));
      ship.vel.addScaledVector(steer, dt);
    }

    let speed = ship.vel.length();
    const speedLimit = ship.boostActive ? ship.maxSpeed * 1.25 : ship.maxSpeed;
    if (speed > speedLimit) {
      ship.vel.normalize().multiplyScalar(speedLimit);
    } else if (speed < 60) {
      ship.vel.normalize().multiplyScalar(80);
    }

    const previousPos = ship.pos.clone();
    ship.pos.addScaledVector(ship.vel, dt);
    this.keepShipInFlightSpace(ship, previousPos, bodies);

    // 3D banking, barrel rolls, and inverted flight
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
      const shipRight = new THREE.Vector3().crossVectors(forwardDir, worldUp).normalize();
      const shipUp = new THREE.Vector3().crossVectors(shipRight, forwardDir).normalize();
      const bankedUp = shipUp.clone().applyAxisAngle(forwardDir, rollAngle);

      const targetRotation = new THREE.Matrix4().lookAt(ship.pos, ship.pos.clone().add(forwardDir), bankedUp);
      const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(targetRotation);
      ship.mesh.quaternion.slerp(targetQuaternion, 8.5 * dt);
    }
  }
}
