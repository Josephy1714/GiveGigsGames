// Starship Simulator - Starfleet Flight Academy & Tutorial Operations System
// 10 Interactive Hands-On Tutorials covering every game feature with real gameplay

const THREE = window.THREE;

export class TutorialSystem {
  constructor(core) {
    this.core = core;
    this.activeTutorial = null;
    this.currentStepIndex = 0;
    this.stepTimer = 0;
    this.stepCounter = 0;
    this.stepCompleted = false;
    this.trainingObjects = []; // Meshes added to scene for tutorials
    this.progress = this.loadProgress();

    // Voice Comm AI Annunciator settings
    this.voiceEnabled = this.loadVoiceSetting();
    this.speechSynth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    this.currentVoice = null;
    this.initVoice();

    // Wingman Formation State
    this.currentFormation = 'arrowhead';

    // Missile Lock State
    this.lockProgress = 0;
    this.lockTarget = null;
    this.lockBeepTimer = 0;

    // DOM Elements
    this.hudCard = null;
    this.academyModal = null;
    this.victoryModal = null;
    this.floatingBanner = null;
    this.hudReticleOverlay = null;

    // Define all 10 in-depth tutorials
    this.tutorials = this.createTutorialCatalog();

    this.initDOM();
  }

  loadVoiceSetting() {
    try {
      const v = localStorage.getItem('starship_voice_comms_enabled');
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  }

  saveVoiceSetting(enabled) {
    this.voiceEnabled = enabled;
    try {
      localStorage.setItem('starship_voice_comms_enabled', enabled ? 'true' : 'false');
    } catch {}
  }

  initVoice() {
    if (!this.speechSynth) return;
    const findVoice = () => {
      const voices = this.speechSynth.getVoices();
      if (!voices || voices.length === 0) return;
      // Prefer crisp, clear English voices
      this.currentVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('David') || v.name.includes('Daniel'))) ||
                          voices.find(v => v.lang.startsWith('en')) ||
                          voices[0];
    };
    findVoice();
    if (typeof window !== 'undefined' && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = findVoice;
    }
  }

  speak(text) {
    if (!this.voiceEnabled || !this.speechSynth) return;
    try {
      this.speechSynth.cancel(); // Stop overlapping speech
      this.core?.soundSystem?.playRadioChirp?.();
      const utter = new SpeechSynthesisUtterance(text);
      if (this.currentVoice) utter.voice = this.currentVoice;
      utter.rate = 1.08;
      utter.pitch = 0.95; // slightly deeper sci-fi tactical cadence
      utter.volume = 0.85;
      this.speechSynth.speak(utter);
    } catch {}
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem('starship_simulator_tutorials_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { completed: {}, totalEarned: 0, perks: {} };
  }

  saveProgress() {
    try {
      localStorage.setItem('starship_simulator_tutorials_v1', JSON.stringify(this.progress));
    } catch (e) {}
  }

  isCompleted(id) {
    return !!this.progress.completed[id];
  }

  markCompleted(id, reward, timeSecs = 0) {
    if (!this.progress.completed[id]) {
      this.progress.completed[id] = { completedAt: Date.now(), reward, stars: 3, bestTime: timeSecs };
      this.progress.totalEarned = (this.progress.totalEarned || 0) + reward;
      this.saveProgress();
    } else {
      const prev = this.progress.completed[id];
      if (timeSecs > 0 && (!prev.bestTime || timeSecs < prev.bestTime)) {
        prev.bestTime = timeSecs;
        this.saveProgress();
      }
    }
  }

  createTutorialCatalog() {
    return [
      {
        id: 1,
        title: "Flight Fundamentals & Helm Control",
        badge: "Flight Controls",
        icon: "🚀",
        shortDesc: "Master 3D flight physics, steering axes, speed booster gates, time dilation, and inertial stabilization.",
        reward: 300,
        ribbon: "Novice Aviator Ribbon",
        voiceIntro: "Cadet, flight controls are online. Test 3D helm attitude and execute orbital gate navigation.",
        steps: [
          {
            title: "Manual Attitude & Pitch Control",
            instruction: "Use [W][A][S][D] to steer or [↑][↓] Arrow keys to pitch the starship.",
            detail: "The flagship uses 3D quaternion rotational physics. Maneuver through local space for 3 seconds.",
            target: 3,
            unit: "s",
            voice: "Maneuver the helm. Pitch and roll to verify attitude thrusters.",
            isInputBased: true,
            check: (core, dt, sys) => {
              const moving = core.keys['w'] || core.keys['s'] || core.keys['a'] || core.keys['d'] ||
                             core.keys['arrowup'] || core.keys['arrowdown'] || core.keys['arrowleft'] || core.keys['arrowright'] ||
                             Math.abs(core.touch?.stickX || core.touch?.steerX || 0) > 0.1 || Math.abs(core.touch?.stickY || core.touch?.steerY || 0) > 0.1;
              if (moving) sys.stepTimer += dt;
              return sys.stepTimer >= 3.0;
            },
            progressText: (_core, sys) => `Maneuvering helm: ${Math.min(3, sys.stepTimer).toFixed(1)}s / 3.0s`
          },
          {
            title: "Relativistic Time Dilation",
            instruction: "Adjust the Simulation Speed slider at bottom-left (or click Bullet-Time / Impulse).",
            detail: "Starship Simulator can warp time from 0.05x bullet-time up to 4.0x hyperspeed.",
            target: 1,
            voice: "Adjust temporal dilation. Slow down for precision or accelerate orbital physics.",
            setup: (core, sys) => {
              sys.initialSpeed = core.timeScale;
            },
            check: (core, dt, sys) => {
              return Math.abs(core.timeScale - (sys.initialSpeed || 0.45)) > 0.15;
            },
            quickAction: {
              label: "⚡ Set 1.5x Time Warp",
              action: (core) => {
                core.timeScale = 1.5;
                const s = document.getElementById('dilation-slider');
                const sv = document.getElementById('time-dilation-val');
                if (s) s.value = 1.5;
                if (sv) sv.textContent = '1.5x';
              }
            },
            progressText: (core) => `Speed: ${core.timeScale.toFixed(2)}x (Adjust slider to advance)`
          },
          {
            title: "Holographic Waypoint Course & Speed Boost",
            instruction: "Fly your starship through 3 glowing orbital navigation gates to trigger warp speed boosts!",
            detail: "Orbital navigation gates establish supersonic corridors and impart kinetic velocity bursts upon clearance.",
            target: 3,
            voice: "Navigation gates deployed ahead. Fly through all three gates to engage impulse acceleration.",
            setup: (core, sys) => {
              sys.spawnWaypointRings(3);
            },
            check: (core, dt, sys) => {
              return sys.stepCounter >= 3;
            },
            progressText: (_core, sys) => `Waypoints cleared: ${sys.stepCounter} / 3 gates`
          },
          {
            title: "Autopilot Inertial Handover",
            instruction: "Press [P] (or click Engage Autopilot below) to hand helm control over to the tactical autopilot.",
            detail: "Toggle between 6-DOF Manual Flight and Autonomous Combat Autopilot at any time using [P].",
            target: 2.5,
            unit: "s",
            voice: "Engage autopilot handover. The fly-by-wire computer will pilot your combat vector.",
            check: (core, dt, sys) => {
              const moving = core.keys['w'] || core.keys['s'] || core.keys['a'] || core.keys['d'] ||
                             core.keys['arrowup'] || core.keys['arrowdown'] ||
                             Math.abs(core.touch?.stickX || 0) > 0.05 || Math.abs(core.touch?.stickY || 0) > 0.05;
              if (!core.flightDynamics?.manualFlight || !moving) sys.stepTimer += dt;
              else sys.stepTimer = 0;
              return sys.stepTimer >= 2.5;
            },
            quickAction: {
              label: "🤖 Engage Autopilot [P]",
              action: (core) => {
                core.toggleAutopilot?.(true);
              }
            },
            progressText: (core, sys) => `${core.flightDynamics?.manualFlight ? 'Stabilizing' : 'Autopilot active'}: ${Math.min(2.5, sys.stepTimer).toFixed(1)}s / 2.5s`
          }
        ]
      },
      {
        id: 2,
        title: "Fleet Flocking & Wingman Formations",
        badge: "Boids AI",
        icon: "🛸",
        shortDesc: "Command wingmen escort formations, test high-G turns, impulse surges, and collision avoidance.",
        reward: 350,
        ribbon: "Squadron Leader Ribbon",
        voiceIntro: "Cadet, a commander never flies alone. Take charge of your escort squadron.",
        steps: [
          {
            title: "Observe Escort Squadron & Formations",
            instruction: "Observe your green escort wingmen maintaining formation around your flagship.",
            detail: "Wingmen continuously execute Craig Reynolds' Boids flocking rules: separation, alignment, and cohesion.",
            target: 2.5,
            unit: "s",
            voice: "Telemetry confirms escort squadron in position. Monitor wingmen formation lock.",
            check: (core, dt, sys) => {
              sys.stepTimer += dt;
              return sys.stepTimer >= 2.5;
            },
            progressText: (_core, sys) => `Fleet telemetry scanning: ${Math.min(2.5, sys.stepTimer).toFixed(1)}s / 2.5s`
          },
          {
            title: "Wingman Tactical Formation Shift",
            instruction: "Use the Formation buttons below (or keys [1]-[4]) to re-order the fleet into a broadside wall or flank.",
            detail: "Tactical formations optimize fire arcs and defensive coverage during fleet skirmishes.",
            target: 1,
            voice: "Re-order fleet formation. Select broadside wall or defensive echelon.",
            setup: (core, sys) => {
              sys.formationShifted = false;
            },
            check: (core, dt, sys) => {
              return !!sys.formationShifted;
            },
            quickAction: {
              label: "🛡️ Shift: Broadside Wall",
              action: (core, sys) => {
                sys.setFleetFormation('wall');
                sys.formationShifted = true;
              }
            },
            progressText: (core, sys) => `Current Formation: ${(core.flightDynamics?.fleetFormation || sys.currentFormation || 'arrowhead').toUpperCase()}`
          },
          {
            title: "High-G Formation Bank Turn",
            instruction: "Perform a sustained bank turn (hold [A] or [D]) for 3 seconds.",
            detail: "Observe how wingmen compute dynamic separation vectors to prevent mid-space collisions during turns.",
            target: 3,
            unit: "s",
            voice: "Execute a hard tactical turn. Watch the squadron calculate separation vectors.",
            check: (core, dt, sys) => {
              const turning = core.keys['a'] || core.keys['d'] || core.keys['arrowleft'] || core.keys['arrowright'] ||
                              Math.abs(core.touch?.stickX || 0) > 0.2;
              if (turning) sys.stepTimer += dt;
              return sys.stepTimer >= 3.0;
            },
            progressText: (_core, sys) => `Sustained tactical turn: ${Math.min(3, sys.stepTimer).toFixed(1)}s / 3.0s`
          },
          {
            title: "Fleet Boost Surge Synchronization",
            instruction: "Hold [Shift] or accelerate forward to trigger engine boost surge and afterburners.",
            detail: "When the flagship accelerates, wingmen fire afterburners to match impulse velocity and hold formation.",
            target: 2.5,
            unit: "s",
            voice: "Engage impulse thrusters. All escort craft will ignite synchronized afterburners.",
            check: (core, dt, sys) => {
              const lead = core.ships[0];
              const boosting = (core.keys['shift'] || core.keys['w'] || core.keys['arrowup'] || (lead && lead.boostActive));
              if (boosting) sys.stepTimer += dt;
              return sys.stepTimer >= 2.5;
            },
            quickAction: {
              label: "🚀 Trigger Fleet Surge",
              action: (core) => {
                core.ships.forEach(s => { s.boostActive = true; s.boostTimer = 3; });
              }
            },
            progressText: (_core, sys) => `Surge velocity: ${Math.min(2.5, sys.stepTimer).toFixed(1)}s / 2.5s`
          }
        ]
      },
      {
        id: 3,
        title: "Weapons Systems & Plasma Gunnery",
        badge: "Plasma Cannons",
        icon: "⚡",
        shortDesc: "Calibrate dual plasma laser cannons, practice target leading, destroy training drones, and earn bounties.",
        reward: 400,
        ribbon: "Sharpshooter Gunnery Ribbon",
        voiceIntro: "Weapons systems online. Calibrate forward plasma cannons for combat readiness.",
        steps: [
          {
            title: "Weapons Calibration Discharge",
            instruction: "Press [Spacebar] or click/tap the space viewport to fire plasma cannons (or [F] to switch weapons).",
            detail: "Your flagship mounts forward plasma cannons and can swap between Plasma, Rapid, Ion EMP, and Mining lasers.",
            target: 3,
            voice: "Discharge primary plasma cannons to verify emitter convergence.",
            setup: (core, sys) => {
              sys.lasersFired = 0;
            },
            check: (core, dt, sys) => {
              return sys.lasersFired >= 3;
            },
            quickAction: {
              label: "🔥 Fire Lasers",
              action: (core) => {
                if (core.ships[0]) {
                  core.ships[0].shootCooldown = 0;
                  core.fireLaser(core.ships[0]);
                }
              }
            },
            progressText: (_core, sys) => `Discharges calibrated: ${Math.min(3, sys.lasersFired || 0)} / 3`
          },
          {
            title: "Destroy Stationary Training Drone",
            instruction: "Aim at the holographic training target drone and destroy it with laser fire.",
            detail: "Target practice drones simulate pirate skiffs and debris threats. Watch for hit markers and floating damage numbers.",
            target: 1,
            voice: "Stationary drone deployed. Line up your forward crosshairs and destroy the target.",
            setup: (core, sys) => {
              sys.spawnTargetDrones(1, false);
            },
            check: (core, dt, sys) => {
              return sys.stepCounter >= 1;
            },
            quickAction: {
              label: "🎯 Fire at Target",
              action: (core, sys) => {
                if (core.ships[0] && sys.trainingObjects[0]) {
                  core.ships[0].shootCooldown = 0;
                  core.fireLaser(core.ships[0], { pos: sys.trainingObjects[0].position });
                }
              }
            },
            progressText: (_core, sys) => `Drones eliminated: ${sys.stepCounter} / 1`
          },
          {
            title: "Intercept Evasive Combat Drones",
            instruction: "Track and destroy 2 maneuvering combat training drones with deflection leading.",
            detail: "Use the predictive lead targeting pip to anticipate target motion and score direct hits.",
            target: 2,
            voice: "Two evasive combat drones deployed. Lead the target pip to score direct hits.",
            setup: (core, sys) => {
              sys.spawnTargetDrones(2, true);
            },
            check: (core, dt, sys) => {
              return sys.stepCounter >= 2;
            },
            progressText: (_core, sys) => `Evasive drones destroyed: ${sys.stepCounter} / 2`
          },
          {
            title: "Bounty Payout Confirmation",
            instruction: "Verify combat bounties credited directly to your HUD balance.",
            detail: "Every destroyed hostile vessel or training drone yields immediate bounty credits in your account.",
            target: 2,
            unit: "s",
            voice: "Combat bounties confirmed and wired to your pilot account balance.",
            check: (core, dt, sys) => {
              sys.stepTimer += dt;
              return sys.stepTimer >= 2.0;
            },
            progressText: (_core, sys) => `Bounty processing: ${Math.min(2, sys.stepTimer).toFixed(1)}s / 2.0s`
          }
        ]
      },
      {
        id: 4,
        title: "Tactical Underside Missile Salvos",
        badge: "Missile Salvos",
        icon: "🎯",
        shortDesc: "Arm underside missile hardpoints, acquire tracking lock, and launch homing salvos with rocket smoke trails.",
        reward: 450,
        ribbon: "Ordnance Specialist Ribbon",
        voiceIntro: "Arming ordnance. Underside missile hardpoints are ready for target acquisition.",
        steps: [
          {
            title: "Inspect Missile Hardpoints",
            instruction: "Inspect your flagship's 4 underside belly missile hardpoints.",
            detail: "Underside hardpoints store heavy homing missiles equipped with solid-fuel rocket motors.",
            target: 2,
            unit: "s",
            voice: "Inspecting underside missile pods. Solid-fuel motors are primed.",
            check: (core, dt, sys) => {
              sys.stepTimer += dt;
              return sys.stepTimer >= 2.0;
            },
            progressText: (_core, sys) => `Hardpoints armed: ${Math.min(2, sys.stepTimer).toFixed(1)}s / 2.0s`
          },
          {
            title: "Deploy Armored Raider Target",
            instruction: "A heavily armored hostile raider frigate has dropped out of hyperspace ahead.",
            detail: "Capital ships and heavy raiders require missile ordnance to penetrate reinforced composite plating.",
            target: 1,
            voice: "Warning: hostile raider frigate detected in forward firing arc.",
            setup: (core, sys) => {
              sys.spawnArmoredRaider();
            },
            check: (core, dt, sys) => {
              sys.stepTimer += dt;
              return sys.stepTimer >= 1.5;
            },
            progressText: () => `Target locked in firing arc`
          },
          {
            title: "Acquire Missile Lock & Launch Salvo",
            instruction: "Press [M] or click [Launch Missile Volley] to release a homing salvo!",
            detail: "Missiles drop from belly hardpoints with sequential spacing, ignite thrusters, and home in.",
            target: 1,
            voice: "Lock acquired. Fire underside missile salvo.",
            setup: (core, sys) => {
              sys.missilesLaunched = 0;
              core.missileAmmo = Math.max(core.missileAmmo || 0, 3);
            },
            check: (core, dt, sys) => {
              return (sys.missilesLaunched || 0) >= 1;
            },
            quickAction: {
              label: "🚀 Launch Missile Volley",
              action: (core, sys) => {
                if (core.ships[0]) {
                  core.missileAmmo = Math.max(core.missileAmmo || 0, 3);
                  core.fireMissile(core.ships[0], sys.trainingObjects[0] ? { pos: sys.trainingObjects[0].position, vel: new THREE.Vector3() } : null);
                  core.soundSystem?.playLockAcquired?.();
                }
              }
            },
            progressText: (_core, sys) => `Salvo status: ${(sys.missilesLaunched || 0) > 0 ? "Missiles airborne!" : "Awaiting launch command"}`
          },
          {
            title: "Target Obliteration & Scrap Retrieval",
            instruction: "Watch the homing missiles strike the raider and retrieve salvage scrap.",
            detail: "Missile detonations inflict heavy explosive damage, shattering hull plating into collectible debris.",
            target: 1,
            voice: "Direct hit confirmed. Hostile frigate destroyed.",
            check: (core, dt, sys) => {
              return sys.stepCounter >= 1;
            },
            progressText: (_core, sys) => `Enemy frigate status: ${sys.stepCounter >= 1 ? "Destroyed" : "Tracking impacts..."}`
          }
        ]
      },
      {
        id: 5,
        title: "Defensive Shields & Damage Control",
        badge: "Kinetic Shields",
        icon: "🛡️",
        shortDesc: "Master 360-degree energy deflector shields, directional impact blooms, and capacitor recharge.",
        reward: 450,
        ribbon: "Aegis Defender Ribbon",
        voiceIntro: "Deflector shield diagnostics initiated. Prepare for hostile impact absorption testing.",
        steps: [
          {
            title: "Deflector Shield Diagnostics",
            instruction: "Inspect your 360-degree deflector barrier surrounding the flagship.",
            detail: "The deflector envelope absorbs incoming laser and projectile impacts, glowing cyan when healthy.",
            target: 2,
            unit: "s",
            voice: "Shield generator at one hundred percent capacity. Envelope integrity nominal.",
            check: (core, dt, sys) => {
              sys.stepTimer += dt;
              return sys.stepTimer >= 2.0;
            },
            progressText: () => `Deflector barrier active: 100% capacity`
          },
          {
            title: "Directional Impact Absorption",
            instruction: "Take incoming laser fire and observe the directional impact bloom effect (or press [G] for Flares).",
            detail: "Impacts generate localized plasma blooms at the exact collision point on the deflector bubble.",
            target: 2,
            voice: "Incoming fire detected. Angle deflectors to absorb directional blast.",
            setup: (core, sys) => {
              sys.shieldImpactsCount = 0;
              sys.spawnShieldTrainer();
            },
            check: (core, dt, sys) => {
              return (sys.shieldImpactsCount || 0) >= 2;
            },
            quickAction: {
              label: "💥 Simulate Shield Impact",
              action: (core, sys) => {
                const lead = core.ships[0];
                if (lead && core.fx) {
                  lead.shieldHitFlash = 1.0;
                  lead.shield = Math.max(20, lead.shield - 25);
                  core.fx.spawnShieldImpact(lead, lead.pos.clone().add(new THREE.Vector3(2, 0, -3)));
                  core.soundSystem?.playShieldDeflect?.();
                  sys.shieldImpactsCount = (sys.shieldImpactsCount || 0) + 1;
                }
              }
            },
            progressText: (_core, sys) => `Impacts absorbed: ${Math.min(2, sys.shieldImpactsCount || 0)} / 2`
          },
          {
            title: "Shield Energy Regeneration",
            instruction: "Maneuver away from danger to let shield generators restore capacity.",
            detail: "Deflector capacitors steadily recharge when not taking sustained fire (upgradeable at Stations).",
            target: 3,
            unit: "s",
            voice: "Disengage from fire arc. Shield capacitor recharging.",
            check: (core, dt, sys) => {
              const lead = core.ships[0];
              if (lead && lead.shield >= (lead.maxShield || 100) * 0.85) sys.stepTimer += dt;
              return sys.stepTimer >= 3.0;
            },
            progressText: (_core, sys) => `Shield regeneration: ${Math.min(3, sys.stepTimer).toFixed(1)}s / 3.0s`
          },
          {
            title: "Counter-Offensive Elimination",
            instruction: "Eliminate the attacking drone with a clean laser volley.",
            detail: "A swift counter-offensive prevents enemies from wearing down deflector banks and breaching hull armor.",
            target: 1,
            voice: "Counter-attack authorized. Eliminate the aggressor.",
            check: (core, dt, sys) => {
              return sys.stepCounter >= 1;
            },
            progressText: (_core, sys) => `Hostile status: ${sys.stepCounter >= 1 ? "Neutralized" : "Engaging..."}`
          }
        ]
      },
      {
        id: 6,
        title: "Advanced 3D Cockpit Avionics",
        badge: "3D Cockpit",
        icon: "🎛️",
        shortDesc: "Experience immersive flight deck command with 3D holographic radar, gauges, and reticles.",
        reward: 500,
        ribbon: "Ace Pilot Wings Ribbon",
        voiceIntro: "Welcome to the flight deck, Pilot. Cockpit avionics and 3D holographic radar are active.",
        steps: [
          {
            title: "Board Flight Deck",
            instruction: "Press [C] or click [Cockpit] in the camera panel to enter Cockpit View.",
            detail: "Cockpit mode renders a fully 3D interactive flight deck interior with dynamic avionics.",
            target: 1,
            voice: "Transferring command to first-person flight deck.",
            check: (core) => {
              return core.cameraDirector?.mode === 'cockpit';
            },
            quickAction: {
              label: "🎛️ Enter 3D Cockpit",
              action: (core) => {
                if (core.cameraDirector) core.cameraDirector.setMode('cockpit', true);
              }
            },
            progressText: (core, sys) => `Current view: ${core.cameraDirector?.mode || 'chase'}`
          },
          {
            title: "Holographic Radar Diagnostics",
            instruction: "Read the 3D holographic spherical radar display located on the cockpit dashboard.",
            detail: "The radar projects all friendly ships (green blips) and hostiles (red blips) in real-time 3D space.",
            target: 3,
            unit: "s",
            voice: "Holographic radar synchronized. Green markers indicate escorts. Red markers indicate hostiles.",
            check: (core, dt, sys) => {
              if (core.cameraDirector?.mode === 'cockpit') sys.stepTimer += dt;
              return sys.stepTimer >= 3.0;
            },
            progressText: (core, sys) => `Radar telemetry scan: ${Math.min(3, sys.stepTimer).toFixed(1)}s / 3.0s`
          },
          {
            title: "Holographic Target Acquisition",
            instruction: "Look toward the hostile raider until the cockpit targeting bracket locks on.",
            detail: "The cockpit view automatically projects lead pursuit markers and audio lock-on signals.",
            target: 1,
            voice: "Target lock bracket illuminated on canopy glass.",
            setup: (core, sys) => {
              sys.spawnTargetDrones(1, false);
            },
            check: (core, dt, sys) => {
              sys.stepTimer += dt;
              return sys.stepTimer >= 2.0;
            },
            progressText: (core, sys) => `Target lock: ${Math.min(2, sys.stepTimer).toFixed(1)}s / 2.0s`
          },
          {
            title: "First-Person Cockpit Dogfight",
            instruction: "Destroy the hostile vessel while piloting directly from inside the cockpit!",
            detail: "Experience the thrill of first-person dogfighting with peripheral viewport struts.",
            target: 1,
            voice: "Engage and destroy hostile from inside the cockpit.",
            check: (core, dt, sys) => {
              return sys.stepCounter >= 1;
            },
            progressText: (core, sys) => `Cockpit kill confirmed: ${sys.stepCounter} / 1`
          }
        ]
      },
      {
        id: 7,
        title: "Camera Director & Cinematic Flight",
        badge: "Camera Director",
        icon: "🎥",
        shortDesc: "Master Chase, Cockpit, Gun Sight, Wingman view, and the intelligent Auto-Sequence director.",
        reward: 400,
        ribbon: "Combat Cinematographer Ribbon",
        voiceIntro: "Tactical surveillance feeds online. Testing multi-camera director channels.",
        steps: [
          {
            title: "Gun Sight Bore-Aiming View",
            instruction: "Switch to 'Gun Sight' camera view (click [Gun Sight] button).",
            detail: "Gun Sight view anchors right down the centerline of the cannons for precision targeting.",
            target: 1,
            voice: "Channel two: Gun Sight camera active.",
            check: (core) => core.cameraDirector?.mode === 'gun_barrel',
            quickAction: {
              label: "🎯 Set Gun Sight View",
              action: (core) => {
                if (core.cameraDirector) core.cameraDirector.setMode('gun_barrel', true);
              }
            },
            progressText: (core, sys) => `Current view: ${core.cameraDirector?.mode || 'chase'}`
          },
          {
            title: "Wingman Escort Perspective",
            instruction: "Switch to 'Wingman' camera view (click [Wingman] button).",
            detail: "Wingman cam puts you in the cockpit of an escort ship looking at the flagship.",
            target: 1,
            voice: "Channel three: Wingman perspective feed linked.",
            check: (core) => core.cameraDirector?.mode === 'wingman_cam',
            quickAction: {
              label: "🛸 Set Wingman View",
              action: (core) => {
                if (core.cameraDirector) core.cameraDirector.setMode('wingman_cam', true);
              }
            },
            progressText: (core, sys) => `Current view: ${core.cameraDirector?.mode || 'chase'}`
          },
          {
            title: "Cinematic Auto-Sequence Director",
            instruction: "Switch to 'Auto Sequence' mode (click [Auto Sequence] button).",
            detail: "The Auto Director orchestrates dynamic cinematic cuts, panning between chase, flank, and dogfight views.",
            target: 3,
            unit: "s",
            voice: "Auto director engaged. AI orchestrating cinematic cuts.",
            check: (core, dt, sys) => {
              if (core.cameraDirector?.autoSequence) sys.stepTimer += dt;
              return sys.stepTimer >= 3.0;
            },
            quickAction: {
              label: "🎬 Enable Auto Sequence",
              action: (core) => {
                if (core.cameraDirector) {
                  core.cameraDirector.autoSequence = true;
                  core.cameraDirector.manualOverride = false;
                }
              }
            },
            progressText: (core, sys) => `Cinematic auto-director: ${Math.min(3, sys.stepTimer).toFixed(1)}s / 3.0s`
          },
          {
            title: "Tactical Chase Restoration",
            instruction: "Switch back to standard 'Chase' view for optimal 3rd-person piloting.",
            detail: "Chase camera provides maximum situational awareness for high-speed navigation.",
            target: 1,
            voice: "Returning to standard chase camera.",
            check: (core) => core.cameraDirector?.mode === 'chase' && !core.cameraDirector?.autoSequence,
            quickAction: {
              label: "🚀 Return to Chase View",
              action: (core) => {
                if (core.cameraDirector) core.cameraDirector.setMode('chase', true);
              }
            },
            progressText: (core, sys) => `Current view: ${core.cameraDirector?.mode || 'chase'}`
          }
        ]
      },
      {
        id: 8,
        title: "Orbital Approach & Atmospheric Descent",
        badge: "Orbital Descent",
        icon: "🪐",
        shortDesc: "Navigate celestial orbits, align descent trajectories, and execute atmospheric re-entry.",
        reward: 500,
        ribbon: "Cosmic Navigator Ribbon",
        voiceIntro: "Plotting planetary descent vector. Stand by for atmospheric entry burn.",
        steps: [
          {
            title: "Celestial Chart Scanning",
            instruction: "Open [N] Star Map or scan the system to inspect the 6 charted worlds (Ember, Azure, Viridian, Cryo, Obsidian, Aurelia) and orbital stations.",
            detail: "Every planet possesses unique gravitational fields, terrain palettes, and scientific nodes, while the Star Map enables long-range warp jumps.",
            target: 2.5,
            unit: "s",
            voice: "Scanning celestial bodies. Target planet acquired.",
            check: (core, dt, sys) => {
              sys.stepTimer += dt;
              return sys.stepTimer >= 2.5;
            },
            progressText: (core, sys) => `Planetary telemetry scanning: ${Math.min(2.5, sys.stepTimer).toFixed(1)}s / 2.5s`
          },
          {
            title: "Align Orbital Entry Vector",
            instruction: "Steer the flagship towards the nearest charted planet.",
            detail: "Entering the planet's gravitational well activates the orbital descent docking window.",
            target: 2,
            unit: "s",
            voice: "Align flight vector with entry corridor.",
            check: (core, dt, sys) => {
              sys.stepTimer += dt;
              return sys.stepTimer >= 2.0;
            },
            progressText: (core, sys) => `Orbital insertion vector locked`
          },
          {
            title: "Initiate Planetary Descent",
            instruction: "Click [🪐 Autopilot travel & land on nearest planet] (or press [L]).",
            detail: "The descent autopilot calculates the optimal atmospheric glide slope and prepares the ground rover.",
            target: 1,
            voice: "Atmospheric descent burn initiated. Shielding deployed for thermal entry.",
            check: (core) => {
              return Boolean(core.planetaryLanding || core.planetSurface?.active);
            },
            quickAction: {
              label: "🪐 Engage Landing Descent",
              action: (core) => {
                core.beginPlanetaryDescent();
              }
            },
            progressText: (core, sys) => core.planetaryLanding ? "Atmospheric descent in progress..." : "Awaiting descent initiation"
          },
          {
            title: "Atmospheric Ionization & Touchdown",
            instruction: "Complete atmospheric re-entry and touch down on the planet surface.",
            detail: "Frictional ionization dissipates as landing thrusters deploy the all-terrain surface rover.",
            target: 1,
            voice: "Stratospheric ionization clearing. Rover deployed. Touchdown confirmed.",
            check: (core) => {
              return Boolean(core.planetSurface?.active);
            },
            progressText: (core, sys) => core.planetSurface?.active ? "Touchdown confirmed!" : "Descending through stratosphere..."
          }
        ]
      },
      {
        id: 9,
        title: "Planetary Surface Operations & Colonization",
        badge: "Planetary Rover",
        icon: "🚜",
        shortDesc: "Drive the all-terrain rover with booster jumps, scan landing zones, recover lost probes, and deploy outposts.",
        reward: 600,
        ribbon: "Planetary Pioneer Ribbon",
        voiceIntro: "Ground expedition active. All-terrain rover systems ready for survey operations.",
        steps: [
          {
            title: "Deploy All-Terrain Rover & Booster Jump",
            instruction: "Drive the ground rover using [W][A][S][D] or Arrow keys across the terrain. Tap [Space] or [Booster Jump] for altitude!",
            detail: "The expedition rover features independent all-wheel suspension, gravity physics, and vertical jump thrusters.",
            target: 3,
            unit: "s",
            voice: "Drive the expedition rover. Fire jump thrusters to navigate craters.",
            setup: (core) => {
              if (!core.planetSurface?.active) core.beginPlanetaryDescent();
            },
            check: (core, dt, sys) => {
              if (core.planetSurface?.active) {
                const moving = core.keys['w'] || core.keys['s'] || core.keys['a'] || core.keys['d'] ||
                               core.keys['arrowup'] || core.keys['arrowdown'] || core.keys['arrowleft'] || core.keys['arrowright'];
                if (moving) sys.stepTimer += dt;
              }
              return sys.stepTimer >= 3.0;
            },
            quickAction: {
              label: "🚀 Fire Rover Jump Jets",
              action: (core) => {
                if (core.planetSurface?.triggerJumpJet) {
                  core.planetSurface.triggerJumpJet();
                } else if (core.planetSurface?.rover) {
                  core.planetSurface.rover.position.y += 8.5;
                }
                core.soundSystem?.playRoverJump?.();
                if (core.planetSurface?.rover) {
                  core.fx?.spawnFloatingText?.(core.planetSurface.rover.position, "JUMP JETS ENGAGED", "#10b981");
                }
              }
            },
            progressText: (core, sys) => `Rover excursion: ${Math.min(3, sys.stepTimer).toFixed(1)}s / 3.0s`
          },
          {
            title: "Geological Sensor Pulse",
            instruction: "Click [📡 Scan this landing zone] on the planetary expedition panel.",
            detail: "Long-range seismic sonar reveals resource cache locations, mineral nodules, and probe beacons.",
            target: 1,
            voice: "Sonar pulse deployed. Mapping subterranean resource deposits and probe telemetry.",
            check: (core) => {
              if (!core.planetSurface?.planet) return false;
              const prog = core.planetSurface.getPlanetProgress(core.planetSurface.planet.name);
              return Boolean(prog && prog.scanned);
            },
            quickAction: {
              label: "📡 Scan Landing Zone",
              action: (core) => {
                core.scanPlanetSurface();
              }
            },
            progressText: (core, sys) => {
              const prog = core.planetSurface?.planet ? core.planetSurface.getPlanetProgress(core.planetSurface.planet.name) : null;
              return prog?.scanned ? "Scanning complete!" : "Click Scan Landing Zone to map anomalies";
            }
          },
          {
            title: "Recover Lost Survey Probe",
            instruction: "Drive to a glowing site beacon and press [E] or click [🛰️ Interact with nearby site].",
            detail: "Recovering the lost deep-space probe yields vital cartographic data and major credit rewards.",
            target: 1,
            voice: "Probe telemetry detected. Approach the glowing anomaly to retrieve data recorder.",
            check: (core) => {
              if (!core.planetSurface?.planet) return false;
              const prog = core.planetSurface.getPlanetProgress(core.planetSurface.planet.name);
              return Boolean(prog && (prog.probe || prog.samples > 0));
            },
            quickAction: {
              label: "🛰️ Interact With Anomaly",
              action: (core) => {
                core.interactPlanetSite();
              }
            },
            progressText: (core, sys) => {
              const prog = core.planetSurface?.planet ? core.planetSurface.getPlanetProgress(core.planetSurface.planet.name) : null;
              return (prog?.probe || (prog?.samples || 0) > 0) ? "Probe recovered!" : "Approach glowing anomaly and interact";
            }
          },
          {
            title: "Deploy Research Outpost & Ascend",
            instruction: "Deploy a research outpost (click [🏗️ Deploy research outpost]) and return to orbit.",
            detail: "Surface outposts secure planetary science data and establish permanent bases across the galaxy.",
            target: 1,
            voice: "Deploying research outpost dome. Preparing ascent rockets for orbital return.",
            check: (core) => {
              if (!core.planetSurface?.planet) return false;
              const prog = core.planetSurface.getPlanetProgress(core.planetSurface.planet.name);
              return Boolean(prog && prog.outpost);
            },
            quickAction: {
              label: "🏗️ Deploy Outpost",
              action: (core) => {
                core.credits = Math.max(core.credits, 2000);
                core.updateCreditsHud?.();
                core.deployPlanetOutpost();
              }
            },
            progressText: (core, sys) => {
              const prog = core.planetSurface?.planet ? core.planetSurface.getPlanetProgress(core.planetSurface.planet.name) : null;
              return prog?.outpost ? "Outpost operational! Return to orbit when ready." : "Click Deploy Outpost (1,200 CR)";
            }
          }
        ]
      },
      {
        id: 10,
        title: "Pilot Career, Stations & Galactic Tycoon",
        badge: "Pilot Tycoon",
        icon: "💎",
        shortDesc: "Dock at Space Stations for Contracts & Shipyard upgrades, grow Skills & Connections, and graduate with the Grand Commission.",
        reward: 2500,
        ribbon: "Master Commander Grand Cross",
        voiceIntro: "Welcome to Starfleet Command, Admiral. Review your interstellar career, station contracts, and fleet assets.",
        steps: [
          {
            title: "Review Pilot Dossier & Career Stats",
            instruction: "Open the [🧬 Pilot Life] dossier (top-right panel) to inspect your pilot profile, Skills, and Connections.",
            detail: "Completing station contracts grows your Skills (+weapon/mining/agility) and Connections (shipyard discounts & higher contract tiers).",
            target: 2.5,
            unit: "s",
            voice: "Accessing personnel service record. Career origins and clearances verified.",
            setup: (core) => {
              const panel = document.getElementById('starship-life-panel');
              if (panel) panel.open = true;
            },
            check: (core, dt, sys) => {
              sys.stepTimer += dt;
              return sys.stepTimer >= 2.5;
            },
            progressText: (core, sys) => `Pilot dossier verified: ${Math.min(2.5, sys.stepTimer).toFixed(1)}s / 2.5s`
          },
          {
            title: "Inspect Station Contracts & Economy",
            instruction: "Check your Pilot Credits, accrued passive dividends, and Space Station Contracts (dock with [L] near any Station).",
            detail: "Credits accumulate from combat bounties, asteroid mining, salvage wrecks, station contracts, and luxury holding dividends.",
            target: 2,
            unit: "s",
            voice: "Interplanetary bank connection confirmed. Station contract boards synchronized.",
            check: (core, dt, sys) => {
              sys.stepTimer += dt;
              return sys.stepTimer >= 2.0;
            },
            progressText: (core, sys) => `Financial & contract telemetry synchronized`
          },
          {
            title: "Acquire Luxury Asset or Charter City",
            instruction: "Purchase an asset from the Luxury Holdings catalog to establish passive income.",
            detail: "Holdings like orbital residences, luxury star-yachts, or planetary cities generate recurring wealth.",
            target: 1,
            voice: "Select an asset from the commercial registry to secure passive income.",
            setup: (core) => {
              // Grant cadet grant so they can experience tycoon purchase
              if (core.credits < 50_000_000) core.credits += 40_000_000;
              core.updateCreditsHud?.();
              core.renderPilotLife?.();
            },
            check: (core) => {
              return (core.pilotLife?.assets?.length || 0) > 0;
            },
            quickAction: {
              label: "🚢 Purchase Luxury Star-Yacht",
              action: (core) => {
                core.buyStarshipLuxuryAsset('luxury-yacht');
              }
            },
            progressText: (core, sys) => (core.pilotLife?.assets?.length || 0) > 0 ? "Asset acquired!" : "Select an asset from Luxury holdings"
          },
          {
            title: "Starfleet Academy Grand Commission Ceremony",
            instruction: "Receive the Master Commander Commission and unlock full sandbox mastery!",
            detail: "Cadet, you have demonstrated complete mastery over all flight systems, stations, contracts, weapons, shields, avionics, cameras, planetary descents, rover operations, and commerce.",
            target: 1,
            voice: "Attention all vessels! By order of Starfleet High Command, Cadet is promoted to Grand Admiral. Congratulations, Commander!",
            setup: (core) => {
              if (core.ships[0]) {
                core.fx?.spawnFireworks?.(core.ships[0].pos, 32);
              }
            },
            check: (core, dt, sys) => {
              sys.stepTimer += dt;
              return sys.stepTimer >= 2.0;
            },
            progressText: (core, sys) => `Commissioning Grand Admiral ceremony...`
          }
        ]
      }
    ];
  }

  initDOM() {
    this.injectStyles();
    this.createHudCard();
    this.createReticleOverlay();
    this.createAcademyModal();
    this.createVictoryModal();
    this.createFloatingBanner();
  }

  injectStyles() {
    if (document.getElementById('tutorial-system-styles')) return;
    const style = document.createElement('style');
    style.id = 'tutorial-system-styles';
    style.textContent = `
      /* Tutorial HUD Card */
      #tutorial-hud-card {
        position: fixed;
        z-index: 25;
        top: 64px;
        left: 50%;
        transform: translateX(-50%);
        width: min(660px, calc(100vw - 28px));
        background: linear-gradient(135deg, rgba(6, 12, 28, 0.95), rgba(12, 24, 48, 0.92));
        border: 1px solid rgba(56, 189, 248, 0.5);
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.8), 0 0 24px rgba(6, 182, 212, 0.25);
        backdrop-filter: blur(16px);
        color: #f1f5f9;
        font-family: 'Inter', system-ui, sans-serif;
        padding: 14px 18px;
        display: none;
        animation: tut-fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: auto;
      }
      #tutorial-hud-card.active { display: block; }

      @keyframes tut-fade-in {
        from { opacity: 0; transform: translate(-50%, -10px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }

      .tut-header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 6px;
      }
      .tut-badge-tag {
        font-family: 'Orbitron', sans-serif;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        padding: 3px 8px;
        border-radius: 6px;
        background: rgba(6, 182, 212, 0.2);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.4);
      }
      .tut-controls-tools {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .tut-tool-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.18);
        color: #94a3b8;
        font-size: 11px;
        cursor: pointer;
        padding: 3px 8px;
        border-radius: 6px;
        transition: all 0.15s;
      }
      .tut-tool-btn:hover, .tut-tool-btn.active {
        background: rgba(6, 182, 212, 0.3);
        color: #ffffff;
        border-color: #38bdf8;
      }
      .tut-step-counter {
        font-size: 11px;
        font-weight: 700;
        color: #94a3b8;
      }
      .tut-close-btn {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 16px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        transition: color 0.15s;
      }
      .tut-close-btn:hover { color: #f87171; }

      .tut-title-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 6px;
      }
      .tut-icon { font-size: 22px; }
      .tut-step-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 15px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 0.02em;
      }

      .tut-instruction {
        font-size: 13px;
        line-height: 1.45;
        color: #e2e8f0;
        margin-bottom: 6px;
        font-weight: 600;
      }
      .tut-detail {
        font-size: 11.5px;
        line-height: 1.4;
        color: #94a3b8;
        margin-bottom: 10px;
      }

      /* Formation Toolbar in Tutorial 2 */
      .tut-formation-toolbar {
        display: flex;
        gap: 6px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }
      .tut-formation-btn {
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.35);
        color: #a7f3d0;
        font-family: 'Orbitron', sans-serif;
        font-size: 10px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .tut-formation-btn:hover, .tut-formation-btn.active {
        background: rgba(16, 185, 129, 0.4);
        color: #ffffff;
        box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
      }

      /* Progress Bar */
      .tut-progress-wrap {
        margin-bottom: 10px;
      }
      .tut-progress-labels {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        font-weight: 700;
        color: #38bdf8;
        margin-bottom: 4px;
      }
      .tut-progress-track {
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
      }
      .tut-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #06b6d4, #10b981);
        width: 0%;
        transition: width 0.2s ease-out;
      }

      /* Button Row */
      .tut-action-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .tut-btn-group {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .tut-action-btn {
        background: rgba(6, 182, 212, 0.25);
        border: 1px solid rgba(56, 189, 248, 0.5);
        color: #e0f2fe;
        font-size: 11.5px;
        font-weight: 700;
        padding: 6px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .tut-action-btn:hover {
        background: rgba(6, 182, 212, 0.45);
        color: #ffffff;
        box-shadow: 0 0 12px rgba(6, 182, 212, 0.4);
      }
      .tut-action-btn.secondary {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.18);
        color: #94a3b8;
      }
      .tut-action-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #f1f5f9;
      }

      /* 3D Holographic Reticle Overlay */
      #tut-reticle-overlay {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 18;
        overflow: hidden;
      }
      .tut-3d-target-bracket {
        position: absolute;
        width: 48px;
        height: 48px;
        margin-left: -24px;
        margin-top: -24px;
        border: 2px solid #38bdf8;
        border-radius: 8px;
        box-shadow: 0 0 14px rgba(56, 189, 248, 0.6);
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        animation: bracket-pulse 1.2s infinite alternate;
      }
      @keyframes bracket-pulse {
        from { transform: scale(0.95); border-color: #38bdf8; }
        to { transform: scale(1.05); border-color: #00f5ff; }
      }
      .tut-3d-target-tag {
        font-family: 'Orbitron', sans-serif;
        font-size: 9px;
        font-weight: 700;
        color: #00f5ff;
        background: rgba(5, 12, 28, 0.85);
        padding: 1px 4px;
        border-radius: 4px;
        white-space: nowrap;
        transform: translateY(18px);
      }
      .tut-3d-lead-pip {
        position: absolute;
        width: 12px;
        height: 12px;
        margin-left: -6px;
        margin-top: -6px;
        border: 2px solid #f59e0b;
        border-radius: 50%;
        background: rgba(245, 158, 11, 0.2);
        box-shadow: 0 0 10px #f59e0b;
        pointer-events: none;
      }
      .tut-offscreen-arrow {
        position: absolute;
        font-size: 18px;
        color: #00f5ff;
        font-weight: 900;
        text-shadow: 0 0 12px #00f5ff;
        transform-origin: center center;
      }

      /* Academy Modal */
      #tutorial-academy-modal {
        position: fixed;
        z-index: 50;
        inset: 0;
        background: rgba(3, 7, 18, 0.88);
        backdrop-filter: blur(16px);
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      #tutorial-academy-modal.open { display: flex; }

      .academy-dialog {
        background: linear-gradient(145deg, rgba(8, 16, 36, 0.98), rgba(15, 23, 42, 0.96));
        border: 1px solid rgba(56, 189, 248, 0.4);
        border-radius: 24px;
        width: 100%;
        max-width: 980px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.9), 0 0 40px rgba(6, 182, 212, 0.2);
        padding: 24px;
        color: #f8fafc;
      }

      .academy-hero {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        padding-bottom: 16px;
        margin-bottom: 18px;
        gap: 16px;
      }
      .academy-title-wrap h2 {
        font-family: 'Orbitron', sans-serif;
        font-size: clamp(18px, 3.5vw, 24px);
        font-weight: 800;
        color: #38bdf8;
        letter-spacing: 0.04em;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .academy-title-wrap p {
        font-size: 13px;
        color: #94a3b8;
        line-height: 1.45;
        max-width: 620px;
      }

      /* Stats Banner */
      .academy-stats-banner {
        background: rgba(6, 182, 212, 0.08);
        border: 1px solid rgba(56, 189, 248, 0.25);
        border-radius: 14px;
        padding: 12px 18px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin-bottom: 20px;
      }
      .academy-stat-box b {
        display: block;
        font-family: 'Orbitron', sans-serif;
        font-size: 18px;
        color: #10b981;
      }
      .academy-stat-box span {
        font-size: 11px;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      /* Grid of 10 Tutorials */
      .academy-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 14px;
        margin-bottom: 20px;
      }
      .tut-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: all 0.2s ease;
      }
      .tut-card:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(56, 189, 248, 0.4);
        transform: translateY(-2px);
      }
      .tut-card.completed {
        border-color: rgba(16, 185, 129, 0.45);
        background: rgba(16, 185, 129, 0.04);
      }

      .tut-card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .tut-card-id {
        font-family: 'Orbitron', sans-serif;
        font-size: 11px;
        font-weight: 700;
        color: #38bdf8;
      }
      .tut-card-completed-badge {
        font-size: 11px;
        font-weight: 700;
        color: #10b981;
        background: rgba(16, 185, 129, 0.15);
        padding: 2px 6px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .tut-card-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 13.5px;
        font-weight: 700;
        color: #f1f5f9;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .tut-card-desc {
        font-size: 11.5px;
        line-height: 1.4;
        color: #94a3b8;
        margin-bottom: 12px;
        flex-grow: 1;
      }

      .tut-card-reward {
        font-size: 11px;
        font-weight: 700;
        color: #f59e0b;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .tut-launch-btn {
        width: 100%;
        background: linear-gradient(135deg, #0284c7, #0d9488);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: #ffffff;
        font-family: 'Orbitron', sans-serif;
        font-size: 11px;
        font-weight: 700;
        padding: 9px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .tut-launch-btn:hover {
        background: linear-gradient(135deg, #0ea5e9, #10b981);
        box-shadow: 0 0 16px rgba(14, 165, 233, 0.4);
      }
      .tut-card.completed .tut-launch-btn {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.18);
        color: #cbd5e1;
      }
      .tut-card.completed .tut-launch-btn:hover {
        background: rgba(16, 185, 129, 0.3);
        color: #ffffff;
      }

      /* Victory Celebration Modal */
      #tutorial-victory-modal {
        position: fixed;
        z-index: 55;
        inset: 0;
        background: rgba(2, 6, 23, 0.85);
        backdrop-filter: blur(16px);
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      #tutorial-victory-modal.open { display: flex; }

      .victory-dialog {
        background: linear-gradient(145deg, rgba(10, 25, 47, 0.98), rgba(6, 18, 38, 0.95));
        border: 2px solid #10b981;
        border-radius: 24px;
        max-width: 520px;
        width: 100%;
        padding: 30px 24px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9), 0 0 50px rgba(16, 185, 129, 0.3);
        color: #ffffff;
        animation: vic-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes vic-pop {
        0% { transform: scale(0.85); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      .vic-badge-icon {
        font-size: 52px;
        margin-bottom: 12px;
        display: inline-block;
        filter: drop-shadow(0 0 16px rgba(16, 185, 129, 0.6));
      }
      .vic-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 22px;
        font-weight: 800;
        color: #10b981;
        letter-spacing: 0.05em;
        margin-bottom: 6px;
      }
      .vic-sub {
        font-size: 14px;
        color: #94a3b8;
        margin-bottom: 20px;
      }
      .vic-reward-card {
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.3);
        border-radius: 12px;
        padding: 14px;
        margin-bottom: 24px;
      }
      .vic-reward-amount {
        font-family: 'Orbitron', sans-serif;
        font-size: 24px;
        font-weight: 800;
        color: #f59e0b;
        margin-bottom: 4px;
      }
      .vic-ribbon-name {
        font-size: 12px;
        font-weight: 600;
        color: #a7f3d0;
      }
      .vic-btn-row {
        display: flex;
        gap: 10px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .vic-btn-primary {
        background: linear-gradient(135deg, #10b981, #06b6d4);
        border: 1px solid rgba(255, 255, 255, 0.4);
        color: #ffffff;
        font-family: 'Orbitron', sans-serif;
        font-size: 12px;
        font-weight: 700;
        padding: 11px 22px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .vic-btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
      }
      .vic-btn-secondary {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #cbd5e1;
        font-family: 'Orbitron', sans-serif;
        font-size: 12px;
        font-weight: 700;
        padding: 11px 18px;
        border-radius: 10px;
        cursor: pointer;
      }
      .vic-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
      }

      /* Floating Step Banner */
      #tutorial-floating-banner {
        position: fixed;
        z-index: 26;
        top: 210px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(16, 185, 129, 0.94);
        border: 1px solid #34d399;
        border-radius: 9999px;
        padding: 8px 24px;
        color: #ffffff;
        font-family: 'Orbitron', sans-serif;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.05em;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(16, 185, 129, 0.4);
        display: none;
        pointer-events: none;
        animation: banner-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes banner-pop {
        from { transform: translate(-50%, -10px) scale(0.9); opacity: 0; }
        to { transform: translate(-50%, 0) scale(1); opacity: 1; }
      }

      /* Responsive adjustments */
      @media (max-width: 640px) {
        #tutorial-hud-card {
          top: 50px;
          padding: 12px;
        }
        .tut-action-row {
          flex-direction: column;
          align-items: stretch;
        }
        .tut-btn-group {
          justify-content: stretch;
        }
        .tut-action-btn {
          flex: 1;
          text-align: center;
        }
      }
    `;
    document.head.appendChild(style);
  }

  createHudCard() {
    const card = document.createElement('div');
    card.id = 'tutorial-hud-card';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', 'Active tutorial objective');
    card.innerHTML = `
      <div class="tut-header-row">
        <span class="tut-badge-tag" id="tut-hud-badge">FLIGHT SCHOOL</span>
        <div class="tut-controls-tools">
          <button type="button" class="tut-tool-btn active" id="btn-tut-voice-toggle" title="Toggle Ship AI Voice Comms">🎙️ Voice</button>
          <span class="tut-step-counter" id="tut-hud-step-counter">STEP 1 OF 4</span>
          <button type="button" class="tut-close-btn" id="btn-tut-hud-exit" title="Exit Tutorial">✕</button>
        </div>
      </div>
      <div class="tut-title-row">
        <span class="tut-icon" id="tut-hud-icon">🚀</span>
        <span class="tut-step-title" id="tut-hud-step-title">Tutorial Step Title</span>
      </div>
      <p class="tut-instruction" id="tut-hud-instruction">Action required instruction...</p>
      <p class="tut-detail" id="tut-hud-detail">Educational background detail...</p>

      <div id="tut-formation-toolbar-slot"></div>
      
      <div class="tut-progress-wrap">
        <div class="tut-progress-labels">
          <span id="tut-hud-progress-text">Progress: 0%</span>
          <span id="tut-hud-overall-text">Tutorial 1/10</span>
        </div>
        <div class="tut-progress-track">
          <div class="tut-progress-fill" id="tut-hud-progress-fill"></div>
        </div>
      </div>

      <div class="tut-action-row">
        <div id="tut-quick-action-slot"></div>
        <div class="tut-btn-group">
          <button type="button" class="tut-action-btn secondary" id="btn-tut-skip-step">Skip Step ⏭️</button>
          <button type="button" class="tut-action-btn secondary" id="btn-tut-open-academy">Academy 🎓</button>
        </div>
      </div>
    `;

    card.querySelector('#btn-tut-hud-exit').addEventListener('click', () => this.exitTutorial());
    card.querySelector('#btn-tut-skip-step').addEventListener('click', () => this.skipStep());
    card.querySelector('#btn-tut-open-academy').addEventListener('click', () => this.openAcademyModal());

    const voiceBtn = card.querySelector('#btn-tut-voice-toggle');
    voiceBtn.addEventListener('click', () => {
      this.saveVoiceSetting(!this.voiceEnabled);
      voiceBtn.classList.toggle('active', this.voiceEnabled);
      voiceBtn.textContent = this.voiceEnabled ? '🎙️ Voice' : '🔇 Muted';
      if (this.voiceEnabled) this.speak("Ship voice synthesizer online.");
    });

    document.body.appendChild(card);
    this.hudCard = card;
  }

  createReticleOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'tut-reticle-overlay';
    document.body.appendChild(overlay);
    this.hudReticleOverlay = overlay;
  }

  createAcademyModal() {
    const modal = document.createElement('div');
    modal.id = 'tutorial-academy-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Starfleet Flight Academy');
    modal.innerHTML = `
      <div class="academy-dialog">
        <div class="academy-hero">
          <div class="academy-title-wrap">
            <h2>🎓 Starfleet Flight Academy · 10 Tutorials</h2>
            <p>Master all 10 core flight systems, tactical gunnery, kinetic shields, 3D avionics, planetary descents, and galactic commerce through interactive gameplay.</p>
          </div>
          <button type="button" class="tut-close-btn" id="btn-academy-close" style="font-size: 24px; padding: 6px 12px;">✕</button>
        </div>

        <div class="academy-stats-banner">
          <div class="academy-stat-box">
            <b id="academy-completed-count">0 / 10</b>
            <span>Tutorials Completed</span>
          </div>
          <div class="academy-stat-box">
            <b id="academy-earned-cr">0 CR</b>
            <span>Academy Credits Earned</span>
          </div>
          <div class="academy-stat-box">
            <b id="academy-rank-title">Cadet Recruit</b>
            <span>Current Academy Rank</span>
          </div>
        </div>

        <div class="academy-grid" id="academy-cards-grid"></div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
          <button type="button" class="vic-btn-secondary" id="btn-academy-close-bottom">Return to Free Flight</button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-academy-close').addEventListener('click', () => this.closeAcademyModal());
    modal.querySelector('#btn-academy-close-bottom').addEventListener('click', () => this.closeAcademyModal());

    document.body.appendChild(modal);
    this.academyModal = modal;
  }

  createVictoryModal() {
    const modal = document.createElement('div');
    modal.id = 'tutorial-victory-modal';
    modal.innerHTML = `
      <div class="victory-dialog">
        <div class="vic-badge-icon" id="vic-icon">🏆</div>
        <div class="vic-title" id="vic-title">Mission Accomplished!</div>
        <p class="vic-sub" id="vic-subtitle">Tutorial Completed Successfully</p>
        
        <div class="vic-reward-card">
          <div class="vic-reward-amount" id="vic-reward">+300 CR</div>
          <div class="vic-ribbon-name" id="vic-ribbon">🎖️ Novice Aviator Ribbon Awarded</div>
        </div>

        <div class="vic-btn-row">
          <button type="button" class="vic-btn-primary" id="btn-vic-next">Next Tutorial ➡️</button>
          <button type="button" class="vic-btn-secondary" id="btn-vic-academy">Academy Hub</button>
          <button type="button" class="vic-btn-secondary" id="btn-vic-free">Free Flight</button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-vic-next').addEventListener('click', () => {
      this.closeVictoryModal();
      if (this.activeTutorial && this.activeTutorial.id < 10) {
        this.startTutorial(this.activeTutorial.id + 1);
      } else {
        this.openAcademyModal();
      }
    });
    modal.querySelector('#btn-vic-academy').addEventListener('click', () => {
      this.closeVictoryModal();
      this.openAcademyModal();
    });
    modal.querySelector('#btn-vic-free').addEventListener('click', () => {
      this.closeVictoryModal();
      this.exitTutorial();
    });

    document.body.appendChild(modal);
    this.victoryModal = modal;
  }

  createFloatingBanner() {
    const banner = document.createElement('div');
    banner.id = 'tutorial-floating-banner';
    document.body.appendChild(banner);
    this.floatingBanner = banner;
  }

  showBanner(text, duration = 2200) {
    if (!this.floatingBanner) return;
    this.floatingBanner.textContent = text;
    this.floatingBanner.style.display = 'block';
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      if (this.floatingBanner) this.floatingBanner.style.display = 'none';
    }, duration);
  }

  renderAcademyCards() {
    const grid = document.getElementById('academy-cards-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const completedCount = Object.keys(this.progress.completed).length;
    document.getElementById('academy-completed-count').textContent = `${completedCount} / 10`;
    document.getElementById('academy-earned-cr').textContent = `${this.progress.totalEarned || 0} CR`;

    const ranks = ["Cadet Recruit", "Flight Officer", "Lieutenant Pilot", "Squadron Commander", "Wing Commander", "Fleet Captain", "Commodore", "Rear Admiral", "Vice Admiral", "Grand Admiral", "Master of the Void"];
    document.getElementById('academy-rank-title').textContent = ranks[completedCount] || "Master of the Void";

    this.tutorials.forEach(tut => {
      const isDone = this.isCompleted(tut.id);
      const card = document.createElement('article');
      card.className = `tut-card ${isDone ? 'completed' : ''}`;
      card.innerHTML = `
        <div>
          <div class="tut-card-top">
            <span class="tut-card-id">TUTORIAL 0${tut.id} · ${tut.badge}</span>
            ${isDone ? '<span class="tut-card-completed-badge">⭐ COMPLETE</span>' : ''}
          </div>
          <div class="tut-card-title">${tut.icon} ${tut.title}</div>
          <p class="tut-card-desc">${tut.shortDesc}</p>
        </div>
        <div>
          <div class="tut-card-reward">💰 +${tut.reward} CR · 🎖️ ${tut.ribbon}</div>
          <button type="button" class="tut-launch-btn" data-tut-id="${tut.id}">
            ${isDone ? 'Replay Mission ⭐' : 'Launch Tutorial →'}
          </button>
        </div>
      `;

      card.querySelector('.tut-launch-btn').addEventListener('click', () => {
        this.closeAcademyModal();
        this.startTutorial(tut.id);
      });

      grid.appendChild(card);
    });
  }

  openAcademyModal() {
    this.core.clearFlightKeys();
    this.renderAcademyCards();
    this.academyModal.classList.add('open');
  }

  closeAcademyModal() {
    this.academyModal.classList.remove('open');
  }

  closeVictoryModal() {
    this.victoryModal.classList.remove('open');
  }

  startTutorial(id) {
    const tut = this.tutorials.find(t => t.id === id);
    if (!tut) return;

    this.cleanupTrainingObjects();
    this.activeTutorial = tut;
    this.currentStepIndex = 0;
    this.stepTimer = 0;
    this.stepCounter = 0;
    this.stepCompleted = false;

    // Show HUD Card
    this.hudCard.classList.add('active');

    // Dismiss launch screen if open
    const launchScreen = document.getElementById('launch-screen');
    if (launchScreen) launchScreen.classList.add('is-dismissed');
    if (!this.core.hasLaunched) this.core.onLaunchFlight({ unmute: false });

    // Resume AudioContext if suspended
    if (this.core.soundSystem) {
      try {
        this.core.soundSystem.initContext();
        if (this.core.soundSystem.ctx && this.core.soundSystem.ctx.state === 'suspended') {
          this.core.soundSystem.ctx.resume();
        }
      } catch (e) {}
    }

    this.setupStep();
    this.showBanner(`🚀 ${tut.title} Commenced!`, 2500);
    this.core.soundSystem?.playSuccess?.();

    if (tut.voiceIntro) {
      setTimeout(() => this.speak(tut.voiceIntro), 300);
    }
  }

  exitTutorial() {
    this.cleanupTrainingObjects();
    this.activeTutorial = null;
    this.hudCard.classList.remove('active');
    if (this.hudReticleOverlay) this.hudReticleOverlay.innerHTML = '';
    this.showBanner(`Flight Academy paused · Free flight active`, 2000);
  }

  setFleetFormation(formation) {
    this.currentFormation = formation;
    this.core?.setFleetFormation?.(formation);
    const lead = this.core.ships[0];
    if (!lead || !this.core.ships) return;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(lead.mesh.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(lead.mesh.quaternion).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(lead.mesh.quaternion).normalize();

    this.core.ships.slice(1).forEach((ship, idx) => {
      let offset = new THREE.Vector3();
      if (formation === 'arrowhead') {
        const row = Math.floor(idx / 2) + 1;
        const side = (idx % 2 === 0 ? -1 : 1);
        offset.addScaledVector(right, side * row * 22).addScaledVector(forward, -row * 28);
      } else if (formation === 'wall') {
        const side = (idx - 1.5) * 26;
        offset.addScaledVector(right, side).addScaledVector(forward, -14);
      } else if (formation === 'echelon') {
        offset.addScaledVector(right, (idx + 1) * 20).addScaledVector(forward, -(idx + 1) * 20);
      } else if (formation === 'orbit') {
        const angle = (idx / 4) * Math.PI * 2;
        offset.addScaledVector(right, Math.cos(angle) * 35).addScaledVector(up, Math.sin(angle) * 20).addScaledVector(forward, -18);
      }
      ship.pos.copy(lead.pos).add(offset);
      ship.vel.copy(lead.vel);
      if (this.core.fx) this.core.fx.spawnThrustParticle(ship.pos, forward.clone().negate(), ship.colorHex, false);
    });

    this.core.soundSystem?.playRadioChirp?.();
    this.showBanner(`Fleet shifted to ${formation.toUpperCase()} formation!`, 1800);
    this.speak(`Red squadron formed up in ${formation} formation.`);
  }

  setupStep() {
    if (!this.activeTutorial) return;
    const step = this.activeTutorial.steps[this.currentStepIndex];
    if (!step) return;

    this.stepTimer = 0;
    this.stepCounter = 0;
    this.stepCompleted = false;

    // Update HUD
    document.getElementById('tut-hud-badge').textContent = `TUTORIAL 0${this.activeTutorial.id}: ${this.activeTutorial.badge.toUpperCase()}`;
    document.getElementById('tut-hud-step-counter').textContent = `STEP ${this.currentStepIndex + 1} OF ${this.activeTutorial.steps.length}`;
    document.getElementById('tut-hud-icon').textContent = this.activeTutorial.icon;
    document.getElementById('tut-hud-step-title').textContent = step.title;
    document.getElementById('tut-hud-instruction').textContent = step.instruction;
    document.getElementById('tut-hud-detail').textContent = step.detail;

    // Formation Toolbar in Tutorial 2
    const formSlot = document.getElementById('tut-formation-toolbar-slot');
    formSlot.innerHTML = '';
    if (this.activeTutorial.id === 2) {
      const tb = document.createElement('div');
      tb.className = 'tut-formation-toolbar';
      const formations = [
        { id: 'arrowhead', label: '⚔️ Arrowhead' },
        { id: 'wall', label: '🛡️ Wall' },
        { id: 'echelon', label: '⚡ Echelon' },
        { id: 'orbit', label: '🔄 Orbit Escort' }
      ];
      formations.forEach(f => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `tut-formation-btn ${this.currentFormation === f.id ? 'active' : ''}`;
        btn.textContent = f.label;
        btn.addEventListener('click', () => {
          this.setFleetFormation(f.id);
          this.formationShifted = true;
          tb.querySelectorAll('.tut-formation-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
        tb.appendChild(btn);
      });
      formSlot.appendChild(tb);
    }

    // Quick Action button
    const actionSlot = document.getElementById('tut-quick-action-slot');
    actionSlot.innerHTML = '';
    if (step.quickAction) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tut-action-btn';
      btn.textContent = step.quickAction.label;
      btn.addEventListener('click', () => {
        step.quickAction.action(this.core, this);
        this.core.soundSystem?.playBeep?.(600, 0.08);
      });
      actionSlot.appendChild(btn);
    }

    if (step.setup) {
      step.setup(this.core, this);
    }

    this.updateHUDProgress();

    if (step.voice) {
      setTimeout(() => this.speak(step.voice), 400);
    }
  }

  updateHUDProgress() {
    if (!this.activeTutorial) return;
    const step = this.activeTutorial.steps[this.currentStepIndex];
    if (!step) return;

    const progressFill = document.getElementById('tut-hud-progress-fill');
    const progressText = document.getElementById('tut-hud-progress-text');
    const overallText = document.getElementById('tut-hud-overall-text');

    const overallPct = Math.round(((this.currentStepIndex) / this.activeTutorial.steps.length) * 100);
    overallText.textContent = `Tutorial 0${this.activeTutorial.id}/10 (${overallPct}%)`;

    if (step.progressText) {
      progressText.textContent = step.progressText(this.core, this);
    } else {
      progressText.textContent = `Step ${this.currentStepIndex + 1} of ${this.activeTutorial.steps.length}`;
    }

    // Append real-time distance telemetry to active navigational waypoint or target drone
    const lead = this.core?.ships?.[0];
    if (lead && this.trainingObjects?.length > 0) {
      const activeObj = this.trainingObjects.find(o => !o.userData?.cleared && o.userData?.health !== 0);
      if (activeObj) {
        const dist = Math.round(lead.pos.distanceTo(activeObj.position));
        const objType = activeObj.userData?.isWaypointRing ? `Gate #${(activeObj.userData.ringIndex || 0) + 1}` : 'Target';
        progressText.textContent += ` · ${objType}: ${dist}m`;
      }
    }

    let stepPct = 0;
    if (step.unit === 's') {
      stepPct = Math.min(100, Math.round((this.stepTimer / step.target) * 100));
    } else if (step.target > 0) {
      stepPct = Math.min(100, Math.round((this.stepCounter / step.target) * 100));
    }
    progressFill.style.width = `${Math.max(stepPct, overallPct)}%`;
  }

  advanceStep() {
    if (!this.activeTutorial || this.stepCompleted) return;
    this.stepCompleted = true;

    this.core.soundSystem?.playObjectiveDing?.();
    this.showBanner(`✨ Objective Complete!`, 1800);

    const step = this.activeTutorial.steps[this.currentStepIndex];
    if (step?.teardown) {
      step.teardown(this.core, this);
    }

    setTimeout(() => {
      if (!this.activeTutorial) return;
      this.currentStepIndex++;
      if (this.currentStepIndex >= this.activeTutorial.steps.length) {
        this.completeTutorial();
      } else {
        this.setupStep();
      }
    }, 400);
  }

  skipStep() {
    if (!this.activeTutorial) return;
    this.showBanner(`Skipping to next step ⏭️`, 1200);
    this.advanceStep();
  }

  completeTutorial() {
    const tut = this.activeTutorial;
    if (!tut) return;

    this.markCompleted(tut.id, tut.reward, this.stepTimer);

    // Grant rewards to live pilot profile
    this.core.credits = (this.core.credits || 0) + tut.reward;
    this.core.updateCreditsHud?.();
    this.core.savePilotRecord?.();

    this.cleanupTrainingObjects();
    this.hudCard.classList.remove('active');
    if (this.hudReticleOverlay) this.hudReticleOverlay.innerHTML = '';

    // Show Victory Modal
    document.getElementById('vic-icon').textContent = tut.icon;
    document.getElementById('vic-title').textContent = `${tut.title} Complete!`;
    document.getElementById('vic-subtitle').textContent = `Mission 0${tut.id} of 10 Mastered with Honors`;
    document.getElementById('vic-reward').textContent = `+${tut.reward} Pilot Credits Added`;
    document.getElementById('vic-ribbon').textContent = `🎖️ Awarded: ${tut.ribbon}`;

    const nextBtn = document.getElementById('btn-vic-next');
    if (tut.id < 10) {
      nextBtn.textContent = `Next Tutorial 0${tut.id + 1} ➡️`;
      nextBtn.style.display = 'block';
    } else {
      nextBtn.textContent = `🎓 View All Graduations`;
    }

    this.victoryModal.classList.add('open');
    this.core.soundSystem?.playSuccess?.();
    this.speak(`Tutorial zero ${tut.id} accomplished. ${tut.reward} credits awarded.`);
  }

  // --- 3D Scene Helpers for Interactive Gameplay ---

  spawnWaypointRings(count = 3) {
    this.cleanupTrainingObjects();
    const lead = this.core.ships[0];
    if (!lead || !this.core.scene) return;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(lead.mesh.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(lead.mesh.quaternion).normalize();

    for (let i = 0; i < count; i++) {
      const ringGroup = new THREE.Group();
      const geom = new THREE.TorusGeometry(14, 0.55, 16, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x00f5ff : 0x0284c7,
        wireframe: true,
        transparent: true,
        opacity: 0.85
      });
      const torus = new THREE.Mesh(geom, mat);
      ringGroup.add(torus);

      // Inner pulsating flare
      const flareGeom = new THREE.RingGeometry(0.5, 13, 24);
      const flareMat = new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide
      });
      ringGroup.add(new THREE.Mesh(flareGeom, flareMat));

      // Vertical beacon column light shooting to sky
      const beaconGeom = new THREE.CylinderGeometry(0.4, 0.4, 180, 8);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        transparent: true,
        opacity: 0.35
      });
      const beacon = new THREE.Mesh(beaconGeom, beaconMat);
      beacon.position.y = 80;
      ringGroup.add(beacon);

      // Space each ring out along the forward flight corridor
      const dist = 90 + i * 110;
      const lateral = Math.sin(i * 1.5) * 25;
      const vertical = Math.cos(i * 1.2) * 15;

      ringGroup.position.copy(lead.pos)
        .addScaledVector(forward, dist)
        .addScaledVector(right, lateral);
      ringGroup.position.y += vertical;
      ringGroup.lookAt(lead.pos);

      ringGroup.userData = {
        isWaypointRing: true,
        ringIndex: i,
        cleared: false,
        radius: 16
      };

      this.core.scene.add(ringGroup);
      this.trainingObjects.push(ringGroup);
    }
  }

  spawnTargetDrones(count = 1, evasive = false) {
    this.cleanupTrainingObjects();
    const lead = this.core.ships[0];
    if (!lead || !this.core.scene) return;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(lead.mesh.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(lead.mesh.quaternion).normalize();

    for (let i = 0; i < count; i++) {
      const droneGroup = new THREE.Group();
      
      // Polyhedral drone core
      const coreGeom = new THREE.OctahedronGeometry(4.5, 1);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xff3b30,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x550000
      });
      const coreMesh = new THREE.Mesh(coreGeom, coreMat);
      droneGroup.add(coreMesh);

      // Outer holographic target bracket
      const bracketGeom = new THREE.RingGeometry(5.2, 5.8, 16);
      const bracketMat = new THREE.MeshBasicMaterial({
        color: 0xff5533,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      droneGroup.add(new THREE.Mesh(bracketGeom, bracketMat));

      const dist = 120 + i * 80;
      const lateral = (i - (count - 1) / 2) * 45;
      droneGroup.position.copy(lead.pos)
        .addScaledVector(forward, dist)
        .addScaledVector(right, lateral);

      droneGroup.userData = {
        isTargetDrone: true,
        evasive,
        health: 50,
        maxHealth: 50,
        basePos: droneGroup.position.clone(),
        seed: Math.random() * 10
      };

      this.core.scene.add(droneGroup);
      this.trainingObjects.push(droneGroup);
    }
  }

  spawnArmoredRaider() {
    this.cleanupTrainingObjects();
    const lead = this.core.ships[0];
    if (!lead || !this.core.scene) return;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(lead.mesh.quaternion).normalize();
    const raiderGroup = new THREE.Group();

    // Heavy Cruiser Fuselage
    const hullGeom = new THREE.BoxGeometry(10, 5, 24);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x8b0000,
      metalness: 0.9,
      roughness: 0.3,
      emissive: 0x330000
    });
    raiderGroup.add(new THREE.Mesh(hullGeom, hullMat));

    // Shield glow
    const shieldGeom = new THREE.SphereGeometry(16, 16, 16);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0xff4422,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    raiderGroup.add(new THREE.Mesh(shieldGeom, shieldMat));

    raiderGroup.position.copy(lead.pos).addScaledVector(forward, 160);
    raiderGroup.userData = {
      isArmoredRaider: true,
      health: 120,
      maxHealth: 120
    };

    this.core.scene.add(raiderGroup);
    this.trainingObjects.push(raiderGroup);
  }

  spawnShieldTrainer() {
    this.cleanupTrainingObjects();
    const lead = this.core.ships[0];
    if (!lead || !this.core.scene) return;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(lead.mesh.quaternion).normalize();
    const droneGroup = new THREE.Group();

    const geom = new THREE.ConeGeometry(3, 8, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.8 });
    const cone = new THREE.Mesh(geom, mat);
    cone.rotation.x = Math.PI / 2;
    droneGroup.add(cone);

    droneGroup.position.copy(lead.pos).addScaledVector(forward, 70);
    droneGroup.userData = {
      isShieldTrainer: true,
      health: 60,
      shootCooldown: 0.8
    };

    this.core.scene.add(droneGroup);
    this.trainingObjects.push(droneGroup);
  }

  cleanupTrainingObjects() {
    this.trainingObjects.forEach(obj => {
      if (this.core.scene) this.core.scene.remove(obj);
      obj.traverse(child => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) child.material.forEach(m => m?.dispose());
          else child.material?.dispose();
        }
      });
    });
    this.trainingObjects = [];
  }

  // Update on-screen 3D targeting reticles and off-screen pointers
  updateReticleOverlay() {
    if (!this.hudReticleOverlay) return;
    if (!this.activeTutorial || this.trainingObjects.length === 0 || !this.core.camera) {
      this.hudReticleOverlay.innerHTML = '';
      return;
    }

    const lead = this.core.ships[0];
    const camera = this.core.camera;
    const width = window.innerWidth;
    const height = window.innerHeight;

    let html = '';

    this.trainingObjects.forEach(obj => {
      if (obj.userData?.cleared || obj.userData?.health <= 0) return;

      const pos = obj.position.clone();
      const proj = pos.clone().project(camera);

      const isBehind = proj.z > 1.0;
      let x = (proj.x * 0.5 + 0.5) * width;
      let y = (-(proj.y * 0.5) + 0.5) * height;

      const dist = lead ? Math.round(lead.pos.distanceTo(obj.position)) : 0;
      const tag = obj.userData?.isWaypointRing ? `GATE #${(obj.userData.ringIndex || 0) + 1}` : obj.userData?.isArmoredRaider ? 'RAIDER FRIGATE' : 'DRONE';

      if (!isBehind && x >= 30 && x <= width - 30 && y >= 30 && y <= height - 30) {
        // Target is on-screen: render 3D target box & distance tag
        html += `
          <div class="tut-3d-target-bracket" style="left: ${x}px; top: ${y}px;">
            <div class="tut-3d-target-tag">${tag} · ${dist}m</div>
          </div>
        `;

        // If target is moving, render predictive deflection lead reticle
        if (obj.userData?.evasive) {
          const leadPos = pos.clone().add(new THREE.Vector3(Math.cos(this.core.elapsed * 1.8) * 8, -Math.sin(this.core.elapsed * 1.3) * 6, 0));
          const leadProj = leadPos.project(camera);
          const lx = (leadProj.x * 0.5 + 0.5) * width;
          const ly = (-(leadProj.y * 0.5) + 0.5) * height;
          html += `<div class="tut-3d-lead-pip" style="left: ${lx}px; top: ${ly}px;"></div>`;
        }
      } else {
        // Target is off-screen or behind camera: clamp to border with directional pointer
        if (isBehind) {
          proj.x = -proj.x;
          proj.y = -proj.y;
        }
        const angle = Math.atan2(proj.y, proj.x);
        const edgeX = Math.max(40, Math.min(width - 40, width / 2 + Math.cos(angle) * (width / 2 - 50)));
        const edgeY = Math.max(40, Math.min(height - 40, height / 2 - Math.sin(angle) * (height / 2 - 50)));
        const deg = -angle * (180 / Math.PI) + 90;

        html += `
          <div class="tut-offscreen-arrow" style="left: ${edgeX}px; top: ${edgeY}px; transform: translate(-50%, -50%) rotate(${deg}deg);">
            ▲
          </div>
        `;
      }
    });

    this.hudReticleOverlay.innerHTML = html;
  }

  // Called in the game loop every frame
  update(dt) {
    if (!this.activeTutorial) return;
    const step = this.activeTutorial.steps[this.currentStepIndex];
    if (!step) return;

    const lead = this.core.ships[0];

    // Update dynamic training objects in scene
    this.trainingObjects.forEach(obj => {
      if (obj.userData?.isWaypointRing && lead) {
        obj.rotation.z += dt * 0.8;
        // Check if lead ship passed through ring
        if (!obj.userData.cleared && obj.position.distanceTo(lead.pos) < obj.userData.radius) {
          obj.userData.cleared = true;
          this.stepCounter++;
          
          // Sound & Warp Boost
          this.core.soundSystem?.playWarpBoom?.();
          this.core.soundSystem?.playObjectiveDing?.();
          this.core.fx?.spawnMissileLaunchFlash?.(obj.position);

          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(lead.mesh.quaternion).normalize();
          this.core.fx?.spawnWarpStreaks?.(lead.pos, forward);
          this.core.fx?.spawnFloatingText?.(lead.pos, "+IMPULSE BOOST!", "#00f5ff");

          // Temporary speed surge
          lead.vel.addScaledVector(forward, 75);
          lead.boostActive = true;
          lead.boostTimer = 2.0;

          this.showBanner(`Gate ${this.stepCounter} Cleared! Impulse Boost!`, 1400);

          // Change ring color to green
          obj.traverse(c => {
            if (c.material) c.material.color.setHex(0x10b981);
          });
        }
      }

      if (obj.userData?.isTargetDrone) {
        obj.rotation.y += dt * 1.5;
        obj.rotation.x += dt * 0.5;
        if (obj.userData.evasive && obj.userData.basePos) {
          const t = this.core.elapsed * 1.8 + obj.userData.seed;
          obj.position.x = obj.userData.basePos.x + Math.sin(t) * 25;
          obj.position.y = obj.userData.basePos.y + Math.cos(t * 1.3) * 12;
        }
      }

      if (obj.userData?.isShieldTrainer && lead) {
        obj.lookAt(lead.pos);
        obj.userData.shootCooldown -= dt;
        if (obj.userData.shootCooldown <= 0) {
          obj.userData.shootCooldown = 1.4;
          // Spawn laser towards player lead ship to trigger shield impact
          if (this.core.fx) {
            lead.shieldHitFlash = 1.0;
            lead.shield = Math.max(15, lead.shield - 20);
            this.core.fx.spawnShieldImpact(lead, lead.pos.clone().add(new THREE.Vector3(1.5, 0, -2.5)));
            this.core.soundSystem?.playShieldDeflect?.();
            this.shieldImpactsCount = (this.shieldImpactsCount || 0) + 1;
            this.showBanner(`Deflector Impact Absorbed!`, 1200);
          }
        }
      }
    });

    // Check laser impacts on training drones
    if (this.trainingObjects.length > 0 && this.core.projectiles?.length > 0) {
      for (const p of this.core.projectiles) {
        if (!p.mesh || p.faction !== 'human') continue;
        for (const obj of this.trainingObjects) {
          if ((obj.userData?.isTargetDrone || obj.userData?.isArmoredRaider || obj.userData?.isShieldTrainer) && obj.userData.health > 0) {
            if (p.mesh.position.distanceTo(obj.position) < 14) {
              p.life = 0; // Consume projectile
              const dmg = p.damage || 35;
              obj.userData.health -= dmg;

              this.core.fx?.spawnExplosion?.(obj.position, 0xff5533, 24);
              this.core.soundSystem?.playHitMarker?.();
              this.core.fx?.spawnFloatingText?.(obj.position, `-${dmg}`, '#ef4444');

              if (obj.userData.health <= 0) {
                this.stepCounter++;
                this.core.fx?.spawnExplosion?.(obj.position, 0xf59e0b, 45);
                this.core.soundSystem?.playExplosion?.();
                this.core.fx?.spawnFloatingText?.(obj.position, "+150 CR", "#f59e0b");
                this.showBanner(`Target Destroyed! +150 CR`, 1500);
                this.core.credits = (this.core.credits || 0) + 150;
                this.core.updateCreditsHud?.();
                // Remove from scene
                if (this.core.scene) this.core.scene.remove(obj);
              }
            }
          }
        }
      }
    }

    // Reticle overlay
    this.updateReticleOverlay();

    // Step condition check
    if (step.check && step.check(this.core, dt, this)) {
      this.advanceStep();
    } else {
      this.updateHUDProgress();
    }
  }

  destroy() {
    this.cleanupTrainingObjects();
    this.hudCard?.remove();
    this.hudReticleOverlay?.remove();
    this.academyModal?.remove();
    this.victoryModal?.remove();
    this.floatingBanner?.remove();
    document.getElementById('tutorial-system-styles')?.remove();
  }
}
