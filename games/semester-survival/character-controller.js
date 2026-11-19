/* Semester Survival — deterministic locomotion controller.
 * Drives authored animation clips; it does not fabricate character artwork.
 * Coordinates are local world units. Call update with frame delta and input intent.
 */
(function (root) {
  'use strict';

  const CONFIG = Object.freeze({
    walkSpeed: 2.1, jogSpeed: 3.8, sprintSpeed: 5.8,
    groundAcceleration: 15, groundDeceleration: 19, airAcceleration: 5,
    jumpVelocity: 6.8, gravity: 18, terminalFallSpeed: 16,
    slideDuration: 0.82, slideCooldown: 0.35, dodgeDuration: 0.28,
    coyoteTime: 0.10, jumpBuffer: 0.12, maxFrameDelta: 1 / 20,
    staminaDrain: 13, staminaRecovery: 8
  });

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const approach = (value, target, amount) =>
    value < target ? Math.min(value + amount, target) : Math.max(value - amount, target);

  function createController(options) {
    options = options || {};
    let depthBounds = options.depthBounds || { min: -120, max: 120 };
    if (!depthBounds || !Number.isFinite(depthBounds.min) || !Number.isFinite(depthBounds.max) || depthBounds.min >= depthBounds.max) errorDepthBounds();
    function errorDepthBounds() { throw new Error('Depth bounds require finite min and max values with min less than max.'); }
    const c = {
      x: 0, y: 0, depth: 0, vx: 0, vy: 0, vDepth: 0,
      facing: 1, grounded: true,
      state: 'idle', previousState: 'idle',
      stamina: 100, slideTime: 0, slideCooldown: 0,
      dodgeTime: 0, dodgeDirection: 0,
      coyote: CONFIG.coyoteTime, jumpBuffer: 0,
      landTime: 0, landStrength: 0,
      gaitPhase: 0, stride: 0, speed: 0,
      blend: { walk: 0, jog: 0, sprint: 0, air: 0, slide: 0 },
      actionLocked: false, takeoffFrame: false
    };

    function transition(next, reason) {
      if (c.state === next) return;
      c.previousState = c.state;
      c.state = next;
      c.transitionReason = reason || 'locomotion';
    }

    function update(delta, input) {
      input = input || {};
      const dt = clamp(Number.isFinite(delta) ? delta : 0, 0, CONFIG.maxFrameDelta);
      if (!dt) return snapshot();
      const axis = clamp(Number(input.moveX) || 0, -1, 1);
      const depthAxis = clamp(Number(input.moveY) || 0, -1, 1);
      const wantsSprint = !!input.sprint && c.stamina > 0 && (Math.abs(axis) > 0.05 || Math.abs(depthAxis) > 0.05);
      const targetSpeed = wantsSprint ? CONFIG.sprintSpeed : ((Math.abs(axis) > 0.05 || Math.abs(depthAxis) > 0.05) ? CONFIG.jogSpeed : 0);
      const horizontalTarget = axis * targetSpeed;

      c.slideCooldown = Math.max(0, c.slideCooldown - dt);
      c.jumpBuffer = input.jumpPressed ? CONFIG.jumpBuffer : Math.max(0, c.jumpBuffer - dt);
      c.coyote = c.grounded ? CONFIG.coyoteTime : Math.max(0, c.coyote - dt);
      c.landTime = Math.max(0, c.landTime - dt);
      c.dodgeTime = Math.max(0, c.dodgeTime - dt);

      if (c.grounded && c.slideTime > 0) {
        c.slideTime = Math.max(0, c.slideTime - dt);
        c.vx = approach(c.vx, 0, 1.9 * dt);
        if (c.slideTime === 0) transition(Math.abs(c.vx) > 0.3 ? 'land-recover' : 'idle', 'slide-complete');
      } else if (input.slidePressed && c.grounded && c.slideCooldown === 0 && Math.abs(c.vx) > 1.6) {
        c.slideTime = CONFIG.slideDuration;
        c.slideCooldown = CONFIG.slideCooldown;
        c.vx *= 1.08;
        transition('slide-start', 'slide-input');
      } else if (input.dodgeDirection && c.grounded && c.dodgeTime === 0 && c.slideTime === 0) {
        c.dodgeDirection = Math.sign(input.dodgeDirection);
        c.dodgeTime = CONFIG.dodgeDuration;
        transition(c.dodgeDirection < 0 ? 'dodge-left' : 'dodge-right', 'dodge-input');
      } else {
        const acceleration = c.grounded ? CONFIG.groundAcceleration : CONFIG.airAcceleration;
        const braking = c.grounded ? CONFIG.groundDeceleration : CONFIG.airAcceleration;
        c.vx = approach(c.vx, horizontalTarget, (Math.abs(horizontalTarget) > Math.abs(c.vx) ? acceleration : braking) * dt);
      }

      const depthTarget = depthAxis * (input.sprint && c.stamina > 0 ? CONFIG.sprintSpeed : CONFIG.jogSpeed);
      const depthAcceleration = c.grounded ? CONFIG.groundAcceleration : CONFIG.airAcceleration;
      const depthBraking = c.grounded ? CONFIG.groundDeceleration : CONFIG.airAcceleration;
      c.vDepth = approach(c.vDepth, depthTarget, (Math.abs(depthTarget) > Math.abs(c.vDepth) ? depthAcceleration : depthBraking) * dt);

      if (input.jumpPressed) c.jumpBuffer = CONFIG.jumpBuffer;
      if (c.jumpBuffer > 0 && (c.grounded || c.coyote > 0) && c.slideTime === 0) {
        c.vy = CONFIG.jumpVelocity;
        c.grounded = false;
        c.coyote = 0;
        c.jumpBuffer = 0;
        c.takeoffFrame = true;
        transition('jump-takeoff', 'jump-input');
      }

      if (!c.grounded) {
        c.vy = Math.max(-CONFIG.terminalFallSpeed, c.vy - CONFIG.gravity * dt);
        c.y += c.vy * dt;
        if (c.takeoffFrame) c.takeoffFrame = false;
        else if (c.vy < -0.1 && c.state !== 'jump-fall') transition('jump-fall', 'descending');
        else if (c.vy > 0.1 && c.state !== 'jump-rise') transition('jump-rise', 'ascending');
        else if (Math.abs(c.vy) <= 0.45 && c.vy >= 0 && c.state !== 'jump-apex') transition('jump-apex', 'apex');
        if (c.y <= 0) {
          const impactVelocity = Math.abs(c.vy);
          c.y = 0;
          c.vy = 0;
          c.grounded = true;
          c.landTime = 0.16;
          c.landStrength = clamp(impactVelocity / CONFIG.jumpVelocity, 0.25, 1);
          transition('land-recover', 'ground-contact');
        }
      }

      if (c.dodgeTime > 0) {
        c.x += c.dodgeDirection * 3.4 * dt;
      }
      c.x += c.vx * dt;
      c.depth += c.vDepth * dt;
      c.depth = Math.max(depthBounds.min, Math.min(depthBounds.max, c.depth));
      if ((c.depth === depthBounds.min && c.vDepth < 0) || (c.depth === depthBounds.max && c.vDepth > 0)) c.vDepth = 0;
      c.speed = Math.hypot(c.vx, c.vDepth);
      if (Math.abs(c.vx) > 0.12) c.facing = Math.sign(c.vx);
      if (wantsSprint && c.grounded && c.slideTime === 0) c.stamina = clamp(c.stamina - CONFIG.staminaDrain * dt, 0, 100);
      else c.stamina = clamp(c.stamina + CONFIG.staminaRecovery * dt, 0, 100);

      if (c.slideTime > 0) {
        if (c.state === 'slide-start' && c.slideTime < CONFIG.slideDuration - 0.12) transition('slide-loop', 'slide-start-finished');
      } else if (c.landTime > 0) {
        transition('land-recover', 'landing');
      } else if (c.grounded && c.dodgeTime > 0) {
        // Preserve directional dodge state for the duration.
      } else if (c.grounded) {
        const speed = c.speed;
        if (speed < 0.12) transition('idle', 'stopped');
        else if (wantsSprint && speed > 4.4) transition('sprint', 'speed-threshold');
        else if (speed > 2.7) transition('jog', 'speed-threshold');
        else transition('walk', 'speed-threshold');
      }

      c.gaitPhase += (c.speed / 2.1) * dt * Math.PI * 2;
      c.stride = clamp(c.speed / CONFIG.sprintSpeed, 0, 1);
      const weights = c.blend;
      const targets = {
        walk: c.state === 'walk' ? 1 : 0,
        jog: c.state === 'jog' ? 1 : 0,
        sprint: c.state === 'sprint' ? 1 : 0,
        air: !c.grounded ? 1 : 0,
        slide: c.slideTime > 0 ? 1 : 0
      };
      Object.keys(weights).forEach(k => { weights[k] = approach(weights[k], targets[k], dt * 9); });
      return snapshot();
    }

    function snapshot() {
      return {
        x: c.x, y: c.y, depth: c.depth, vx: c.vx, vy: c.vy, vDepth: c.vDepth,
        facing: c.facing, grounded: c.grounded,
        state: c.state, previousState: c.previousState,
        stamina: Number(c.stamina.toFixed(2)),
        speed: Number(c.speed.toFixed(3)),
        gaitPhase: c.gaitPhase, stride: c.stride,
        slideTime: c.slideTime, dodgeTime: c.dodgeTime,
        landTime: c.landTime, landStrength: c.landStrength,
        animationBlend: Object.assign({}, c.blend),
        transitionReason: c.transitionReason || 'initial'
      };
    }

    function setDepthBounds(bounds) {
      if (!bounds || !Number.isFinite(bounds.min) || !Number.isFinite(bounds.max) || bounds.min >= bounds.max) errorDepthBounds();
      depthBounds = { min: bounds.min, max: bounds.max };
      c.depth = clamp(c.depth, depthBounds.min, depthBounds.max);
      if ((c.depth === depthBounds.min && c.vDepth < 0) || (c.depth === depthBounds.max && c.vDepth > 0)) c.vDepth = 0;
      return Object.freeze({ min: depthBounds.min, max: depthBounds.max });
    }

    function reset(position) {
      c.x = Number(position && position.x) || 0;
      c.depth = Number(position && position.depth) || 0;
      c.y = 0; c.vx = 0; c.vy = 0; c.vDepth = 0; c.grounded = true;
      c.stamina = 100; c.slideTime = 0; c.slideCooldown = 0;
      c.dodgeTime = 0; c.jumpBuffer = 0; c.coyote = CONFIG.coyoteTime; c.takeoffFrame = false;
      c.landTime = 0; c.state = 'idle'; c.previousState = 'idle';
      c.gaitPhase = 0; c.stride = 0; c.speed = 0;
      Object.keys(c.blend).forEach(k => { c.blend[k] = 0; });
      return snapshot();
    }

    return Object.freeze({ update, snapshot, reset, setDepthBounds });
  }

  root.SemesterCharacterController = Object.freeze({ createController, config: CONFIG });
})(typeof window !== 'undefined' ? window : globalThis);
