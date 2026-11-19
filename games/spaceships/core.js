// Core System - Starship Simulator 3D Space Sim & Career Sandbox
import { ShipBuilder } from './ship-builder.js';
import { createCosmicBackdrop } from './cosmic-backdrop.js';
import { addAlienAccents } from './celestial-effects.js';
import { SpaceSoundSystem } from './sound-system.js';
import { ParticleManager } from './fx-manager.js';
import { EnvironmentManager, ONE_AU, SYSTEM_EDGE } from './environment-manager.js';
import { CameraDirector } from './camera-director.js';
import { FlightDynamics } from './flight-dynamics.js';
import { CockpitView } from './cockpit-view.js';
import { PlanetSurface } from './planet-surface.js';
import { TutorialSystem } from './tutorial-system.js';
import { ContractsSystem } from './contracts-system.js';
import { TacticalHUD } from './tactical-hud.js';
import {
  SHIP_CLASSES,
  SHIP_LIVERIES,
  WEAPON_TYPES,
  WEAPON_ORDER,
  UPGRADE_TRACKS,
  normalizeUpgrades,
  getPilotBonuses,
  getEffectiveShipStats,
  getUpgradeCost,
  getShipCost,
  getLiveryCost,
  getLivery,
  getWeaponDef
} from './ship-catalog.js';

const THREE = window.THREE;
const PILOT_PROFILE_KEY = 'mattyjacks-starship-pilot-v1';
const STARSHIP_LUXURY_ASSETS = [
  { id: 'luxury-yacht', title: 'Gigantic luxury star-yacht', cost: 38_000_000, income: 75, detail: 'A private interplanetary yacht that earns charter revenue while you fly.' },
  { id: 'orbital-residence', title: 'Private orbital residence', cost: 18_000_000, income: 30, detail: 'A high-orbit home with a docking ring and long-term rental income.' },
  { id: 'planetary-research-base', title: 'Planetary research base', cost: 24_000_000, income: 55, detail: 'A staffed science campus that funds survey expeditions and local jobs.' },
  { id: 'robot-crew', title: 'Robot crew', cost: 2_400_000, income: 20, detail: 'Private service robots run logistics and support your expedition work.' },
  { id: 'human-household', title: 'Human household staff', cost: 2_000_000, income: 8, detail: 'A paid crew handles hospitality, scheduling, and household operations.' },
  { id: 'animal-sanctuary', title: 'Animal sanctuary habitat', cost: 4_800_000, income: 12, detail: 'A protected habitat with care staff and a modest conservation grant.' }
];

function appendUniqueAssets(assets, ...newAssets) {
  return [...new Set([...(Array.isArray(assets) ? assets : []), ...newAssets])];
}

function readPilotProfile() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PILOT_PROFILE_KEY) || 'null');
    return saved && typeof saved === 'object' ? saved : { credits: 1250, planetProgress: {} };
  } catch {
    return { credits: 1250, planetProgress: {} };
  }
}

export class SpaceGameCore {
  constructor() {
    this.state = {
      initialized: false,
      running: false,
      loading: false,
      error: null,
      cameraMode: 'chase'
    };

    this.systems = new Map();
    this.soundSystem = new SpaceSoundSystem();
    this.timeScale = 0.45;

    const profile = readPilotProfile();
    this.credits = Number.isSafeInteger(profile?.credits) && profile.credits >= 0 && profile.credits <= 1_000_000_000
      ? profile.credits
      : 1250;
    this.planetProgress = profile?.planetProgress && typeof profile.planetProgress === 'object' ? profile.planetProgress : {};
    this.pilotLife = profile?.life && typeof profile.life === 'object'
      ? {
          ...profile.life,
          wealthOriginLocked: profile.life.wealthOriginLocked === true,
          ironman: profile.life.ironman === true,
          completedContracts: Number(profile.life.completedContracts || 0)
        }
      : {
          mode: 'poor',
          name: 'Nova Vale',
          birthDate: '4/20/6969',
          background: 'New Arrival',
          skills: 0,
          connections: 0,
          assets: [],
          mission: 'Survey your first world and recover the lost probe.',
          wealthOriginLocked: false,
          ironman: false,
          completedContracts: 0
        };

    const recordedCities = Object.entries(this.planetProgress)
      .filter(([, progress]) => progress?.city && (progress.cityOwner || progress.planetOwner || this.pilotLife.name) === this.pilotLife.name)
      .map(([planetName]) => `Planetary city · ${planetName}`);
    if (recordedCities.length) {
      this.pilotLife.assets = appendUniqueAssets(this.pilotLife.assets, ...recordedCities);
    }

    // Ship progression state
    this.shipClass = SHIP_CLASSES[profile?.shipClass] ? profile.shipClass : 'vanguard';
    this.ownedShips = Array.isArray(profile?.ownedShips) && profile.ownedShips.length
      ? [...new Set(['vanguard', ...profile.ownedShips])]
      : ['vanguard'];
    this.upgrades = normalizeUpgrades(profile?.upgrades);
    this.liveryId = SHIP_LIVERIES.some(l => l.id === profile?.liveryId) ? profile.liveryId : 'starfleet-cyan';
    this.ownedLiveries = Array.isArray(profile?.ownedLiveries) && profile.ownedLiveries.length
      ? [...new Set(['starfleet-cyan', ...profile.ownedLiveries])]
      : ['starfleet-cyan'];
    this.weaponId = WEAPON_TYPES[profile?.weaponId] ? profile.weaponId : 'plasma';
    this.oreCargo = Math.max(0, Math.floor(Number(profile?.oreCargo || 0)));

    this.planetSurface = null;
    this.surfaceKeys = {};
    this.profileSaveTimer = 0;
    this.tutorialSystem = null;
    this.contracts = null;
    this.tacticalHud = null;

    this.config = {
      minShips: 7,
      maxShips: 8,
      minAliens: 11,
      maxAliens: 15,
      targetFPS: 60
    };

    this.performance = {
      frameCount: 0,
      lastTime: 0,
      fps: 60,
      loadTime: 0
    };

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.lights = [];

    this.fx = null;
    this.environment = null;
    this.cameraDirector = null;
    this.flightDynamics = null;
    this.cockpitView = null;

    this.ships = [];
    this.aliens = [];
    this.projectiles = [];

    this.cosmicBackdrop = null;
    this.elapsed = 0;
    this.manuallyPaused = false;

    // Flight & combat controls state
    this.keys = {};
    this.pointerFireHeld = false;
    this.rightDragging = false;
    this.autoFire = true; // Active during launch-screen/embed spectacle; disabled upon clicking Launch Flight
    this.weaponHeat = 0;
    this.weaponOverheated = false;
    this.missileAmmo = 8;
    this.missileReloadTimer = 0;
    this.flares = 4;
    this.flareCooldown = 0;
    this.flareActiveTimer = 0;
    this.lockedTarget = null;
    this.navTarget = null;
    this.dockedStation = null;
    this.stationApproach = null;
    this.planetaryLanding = null;

    this.creditsTimer = 0;
    this.touch = {
      active: false,
      stickX: 0, stickY: 0,
      fire: false, boost: false,
      turretYaw: 0, turretPitch: 0,
      lockedTarget: null, missileCooldown: 0
    };
    this.onAutoPause = null;

    this.encounterTimer = 0;
    this.animationFrameId = null;
    this.missileVolleyTimer = 2.5;
    this.missileQueue = [];
    this._laserGeomHero = null;
    this._laserGeomStd = null;
    this._laserMats = new Map();
  }

  disposeObject3D(obj) {
    if (!obj) return;
    obj.traverse(child => {
      child.geometry?.dispose?.();
      const mats = child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : [];
      mats.forEach(mat => {
        for (const val of Object.values(mat)) {
          if (val?.isTexture) val.dispose();
        }
        mat.dispose?.();
      });
    });
  }

  isEmbedMode() {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('embed') === 'true' ||
        p.get('bg') === 'true' ||
        p.get('hud') === 'false' ||
        p.get('controls') === 'false' ||
        document.documentElement.classList.contains('is-embedded-sim');
    } catch {
      return false;
    }
  }

  getActiveShipStats() {
    return getEffectiveShipStats(this.shipClass, this.upgrades, this.pilotLife);
  }

  async initialize(canvasId = 'starfield') {
    if (this.state.initialized) return true;
    this.state.loading = true;
    const startTime = performance.now();

    try {
      const canvas = document.getElementById(canvasId);
      if (!canvas) throw new Error(`Canvas with ID '${canvasId}' not found.`);

      this.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      const dprCap = window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
      this.renderer.setClearColor(0x05030a, 1);

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x05030a, 0.00007);

      this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.12, 120000);
      this.camera.position.set(0, 80, 220);
      this.scene.add(this.camera);
      this.cosmicBackdrop = createCosmicBackdrop(this.scene, this.camera);

      const ambientLight = new THREE.AmbientLight(0x7489bd, 0.38);
      this.scene.add(ambientLight);
      this.lights.push(ambientLight);

      const dirLight = new THREE.DirectionalLight(0x9bb9ff, 0.22);
      dirLight.position.set(200, 300, 200);
      this.scene.add(dirLight);
      this.lights.push(dirLight);

      this.fx = new ParticleManager(this.scene);
      this.environment = new EnvironmentManager(this.scene);
      this.environment.init();

      this.planetSurface = new PlanetSurface(this.scene, this.camera, (type, data) => this.handlePlanetSurfaceEvent(type, data));
      this.planetSurface.progress = this.planetProgress;
      this.planetSurface.onJump = (pos) => {
        this.soundSystem?.playRoverJump?.();
        this.fx?.spawnExplosion?.(pos, 0x38bdf8, 12);
      };
      this.createPlanetSurfacePanel();

      this.cockpitView = new CockpitView(this.camera, this.scene);
      this.cockpitView.setLivery(getLivery(this.liveryId));

      this.cameraDirector = new CameraDirector(this.camera);
      this.cameraDirector.onModeChange = (mode) => {
        this.state.cameraMode = mode;
        const isCockpit = mode === 'cockpit' && !this.planetSurface?.active;
        if (typeof document !== 'undefined') {
          document.body.classList.toggle('is-cockpit-view', isCockpit);
        }
        if (this.cockpitView) this.cockpitView.group.visible = isCockpit;
        if (this.ships[0]?.mesh) this.ships[0].mesh.visible = !isCockpit && !this.planetSurface?.active;
        document.querySelectorAll('.btn-cam').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-mode') === mode);
        });
      };

      this.flightDynamics = new FlightDynamics(this.environment);
      this.contracts = new ContractsSystem(this);
      this.tacticalHud = new TacticalHUD(this);

      const stats = this.getActiveShipStats();
      this.missileAmmo = stats.missileMax;
      this.oreCargo = Math.min(this.oreCargo, stats.cargoCap);

      this.initEntities();
      this.cameraDirector.update(
        1, 0, this.ships[0], this.ships, this.aliens,
        this.environment.planets, this.flightDynamics.getFlightObstacles(this.ships[0]), false
      );

      window.addEventListener('resize', this.handleResize);
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      window.addEventListener('blur', this.clearFlightKeys);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      canvas.addEventListener('pointerdown', this.handleCanvasPointerDown);
      window.addEventListener('pointerup', this.handleWindowPointerUp);
      window.addEventListener('pointermove', this.handleWindowPointerMove);
      canvas.addEventListener('contextmenu', this.preventContextMenu);
      window.addEventListener('wheel', this.handleWheelThrottle, { passive: true });

      this.state.initialized = true;
      this.state.loading = false;
      this.performance.loadTime = performance.now() - startTime;
      this.updateCreditsHud();

      this.tutorialSystem = new TutorialSystem(this);
      try {
        const p = new URLSearchParams(window.location.search);
        const tutParam = p.get('tutorial');
        if (tutParam) {
          const tutId = parseInt(tutParam, 10);
          if (tutId >= 1 && tutId <= 10) {
            setTimeout(() => this.tutorialSystem?.startTutorial(tutId), 400);
          }
        }
      } catch {}

      return true;
    } catch (e) {
      this.state.error = e;
      this.state.loading = false;
      console.error('[SpaceGameCore] WebGL Init failed:', e);
      return false;
    }
  }

  onLaunchFlight({ unmute = true } = {}) {
    if (this.isEmbedMode()) return;
    this.hasLaunched = true;
    if (this.flightDynamics) {
      this.flightDynamics.manualFlight = true;
    }
    this.autoFire = false;
    if (this.cameraDirector) {
      this.cameraDirector.autoSequence = false;
      this.cameraDirector.manualOverride = true;
    }
    if (unmute) this.soundSystem?.unmute?.();
    const soundBtn = document.getElementById('btn-sound-toggle');
    if (soundBtn) soundBtn.textContent = this.soundSystem?.muted ? '🔇' : '🔊';
  }

  preventContextMenu = (e) => {
    e.preventDefault();
  };

  handleCanvasPointerDown = (e) => {
    if (this.planetSurface?.active || this.dockedStation || this.isEmbedMode()) return;
    if (this.tacticalHud?.starMapModal?.classList.contains('open')) return;
    if (e.button === 2) {
      this.rightDragging = true;
      if (this.cameraDirector?.mode === 'cockpit') {
        this.cameraDirector.freeLook.active = true;
      }
      return;
    }
    if (e.button === 0) {
      this.pointerFireHeld = true;
      if (this.ships[0]) {
        this.fireLaser(this.ships[0]);
      }
    }
  };

  handleWindowPointerUp = (e) => {
    if (e.button === 2) {
      this.rightDragging = false;
      if (this.cameraDirector) {
        this.cameraDirector.freeLook.active = false;
        this.cameraDirector.freeLook.yaw = 0;
        this.cameraDirector.freeLook.pitch = 0;
      }
      if (this.flightDynamics && !this.mouseSteerPinned) {
        this.flightDynamics.mouseSteer.active = false;
        this.flightDynamics.mouseSteer.nx = 0;
        this.flightDynamics.mouseSteer.ny = 0;
      }
    } else if (e.button === 0) {
      this.pointerFireHeld = false;
    }
  };

  handleWindowPointerMove = (e) => {
    if (!this.flightDynamics || this.planetSurface?.active || this.dockedStation) return;
    const nx = THREE.MathUtils.clamp((e.clientX / Math.max(1, window.innerWidth)) * 2 - 1, -1, 1);
    const ny = THREE.MathUtils.clamp((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1, -1, 1);

    if (this.rightDragging && this.cameraDirector?.mode === 'cockpit') {
      this.cameraDirector.freeLook.active = true;
      this.cameraDirector.freeLook.yaw = -nx * 0.9;
      this.cameraDirector.freeLook.pitch = -ny * 0.45;
      return;
    }

    if (this.rightDragging) {
      this.flightDynamics.manualFlight = true;
      this.flightDynamics.mouseSteer.active = true;
      this.flightDynamics.mouseSteer.nx = nx;
      this.flightDynamics.mouseSteer.ny = ny;
      return;
    }

    if (this.mouseSteerPinned) {
      const overHud = e.target?.closest?.('.hud-panel, #tac-mission-box, #tac-telemetry-bar, #starship-life-panel, #tutorial-hud-card, .tac-modal-backdrop');
      if (overHud) {
        this.flightDynamics.mouseSteer.nx = 0;
        this.flightDynamics.mouseSteer.ny = 0;
      } else {
        this.flightDynamics.mouseSteer.active = true;
        this.flightDynamics.mouseSteer.nx = nx;
        this.flightDynamics.mouseSteer.ny = ny;
      }
    }
  };

  handleWheelThrottle = (e) => {
    if (!this.flightDynamics || this.planetSurface?.active || this.dockedStation) return;
    if (this.tacticalHud?.starMapModal?.classList.contains('open')) return;
    if (e.target?.closest?.('.hud-panel, #starship-life-panel, .tac-modal-backdrop')) return;
    const step = e.deltaY < 0 ? 0.08 : -0.08;
    this.flightDynamics.throttle = THREE.MathUtils.clamp(this.flightDynamics.throttle + step, 0.05, 1.0);
  };

  handleResize = () => {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      const dprCap = window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    }
  };

  handleKeyDown = (e) => {
    if (!this.hasLaunched || !this.state.running || this.tacticalHud?.towModal?.classList.contains('open') ||
        e.ctrlKey || e.metaKey || e.altKey || e.target?.closest?.('input, select, textarea, [contenteditable]')) return;
    const keyLower = e.key.toLowerCase();
    const mapOpen = this.tacticalHud?.starMapModal?.classList.contains('open');
    const academyOpen = this.tutorialSystem?.academyModal?.classList.contains('open');

    if (e.key === 'Escape') {
      if (mapOpen) {
        this.tacticalHud.closeStarMap();
        return;
      }
      if (this.dockedStation) {
        this.undockFromStation();
        return;
      }
      if (academyOpen) {
        this.tutorialSystem.closeAcademyModal();
        return;
      }
      if (this.mouseSteerPinned) {
        this.toggleMouseSteer(false);
        return;
      }
    }

    if (mapOpen || academyOpen || this.tutorialSystem?.victoryModal?.classList.contains('open')) {
      if (!e.repeat && mapOpen && keyLower === 'n') this.tacticalHud.closeStarMap();
      if (!e.repeat && academyOpen && keyLower === 't') this.tutorialSystem.closeAcademyModal();
      return;
    }
    if (this.dockedStation || this.stationApproach || this.planetaryLanding) return;
    if (e.target?.closest?.('button, a') && (e.code === 'Space' || e.key === 'Enter')) return;
    if (e.key.startsWith('Arrow') || e.key === 'Tab') e.preventDefault();
    this.keys[keyLower] = true;

    if (this.planetSurface?.active) {
      if (keyLower === 'l' && !e.repeat) {
        this.takeoffFromPlanet();
      } else if (keyLower === 'n' && !e.repeat) {
        this.tacticalHud?.openStarMap();
      } else if (keyLower === 't' && !e.repeat) {
        this.tutorialSystem?.openAcademyModal();
      } else if (keyLower === 'c' && !e.repeat) {
        this.planetSurface.wideView = !this.planetSurface.wideView;
      } else if (keyLower === 'e') {
        e.preventDefault();
        this.interactPlanetSite();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.planetSurface.triggerJumpJet();
      }
      return;
    }

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      this.fireLaser(this.ships[0]);
    } else if (keyLower === 'c') {
      if (this.cameraDirector) {
        const nextMode = this.cameraDirector.mode === 'cockpit' ? 'chase' : 'cockpit';
        this.cameraDirector.setMode(nextMode, true);
      }
    } else if (keyLower === 't') {
      if (!e.repeat) this.tutorialSystem?.openAcademyModal();
    } else if (keyLower === 'm') {
      this.fireMissile(this.ships[0], this.lockedTarget);
    } else if (keyLower === 'f') {
      this.cycleWeapon();
    } else if (keyLower === 'g') {
      this.deployFlares();
    } else if (e.key === 'Tab') {
      this.cycleTarget();
    } else if (keyLower === 'p') {
      this.toggleAutopilot();
    } else if (keyLower === 'h') {
      this.toggleAutoFire();
    } else if (keyLower === 'v') {
      this.toggleMouseSteer();
    } else if (keyLower === 'n') {
      if (!e.repeat) this.tacticalHud?.openStarMap();
    } else if (keyLower === 'l' && !e.repeat) {
      this.handleLandOrDockAction();
    } else if (['1', '2', '3', '4'].includes(e.key)) {
      const forms = ['arrowhead', 'wall', 'echelon', 'orbit'];
      const selected = forms[parseInt(e.key, 10) - 1];
      if (selected) this.setFleetFormation(selected);
    } else if (['F1', 'F2', 'F3', 'F4'].includes(e.key)) {
      e.preventDefault();
      const orders = ['escort', 'attack', 'defend', 'hunt'];
      const idx = parseInt(e.key.slice(1), 10) - 1;
      if (orders[idx]) this.setSquadronOrder(orders[idx]);
    }
  };

  handleKeyUp = (e) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  clearFlightKeys = () => {
    this.keys = {};
    this.pointerFireHeld = false;
    this.rightDragging = false;
  };

  toggleAutopilot(forceState = null) {
    if (!this.flightDynamics) return;
    const nextManual = forceState !== null ? !forceState : !this.flightDynamics.manualFlight;
    this.flightDynamics.manualFlight = nextManual;
    this.tacticalHud?.showToast(nextManual ? 'Helm: Manual Flight Engaged' : 'Helm: Autopilot Engaged');
  }

  toggleAutoFire(forceState = null) {
    this.autoFire = forceState !== null ? Boolean(forceState) : !this.autoFire;
    this.tacticalHud?.showToast(this.autoFire ? 'Auto-Fire & Turret: ON' : 'Auto-Fire: OFF (Manual Weapons)');
  }

  toggleMouseSteer(forceState = null) {
    if (!this.flightDynamics) return;
    this.mouseSteerPinned = forceState !== null ? Boolean(forceState) : !this.mouseSteerPinned;
    this.flightDynamics.mouseSteer.active = this.mouseSteerPinned;
    if (this.mouseSteerPinned) {
      this.flightDynamics.manualFlight = true;
      this.tacticalHud?.showToast('Mouse-Steer ON (Press V or Esc to unlock)');
    } else {
      this.flightDynamics.mouseSteer.nx = 0;
      this.flightDynamics.mouseSteer.ny = 0;
      this.tacticalHud?.showToast('Mouse-Steer OFF');
    }
  }

  setFleetFormation(formation) {
    if (this.flightDynamics) {
      this.flightDynamics.fleetFormation = formation;
    }
    if (this.tutorialSystem) {
      this.tutorialSystem.currentFormation = formation;
      this.tutorialSystem.formationShifted = true;
    }
    this.soundSystem?.playRadioChirp?.();
    this.tacticalHud?.showToast(`Squadron Formation: ${formation.toUpperCase()}`);
  }

  setSquadronOrder(order) {
    if (this.flightDynamics) {
      this.flightDynamics.squadronOrder = order;
    }
    this.soundSystem?.playRadioChirp?.();
    this.tacticalHud?.showToast(`Squadron Order: ${order.toUpperCase()}`);
  }

  setWeapon(weaponId) {
    if (!WEAPON_TYPES[weaponId]) return;
    this.weaponId = weaponId;
    this.savePilotRecord();
    this.tacticalHud?.showToast(`Weapon Equipped: ${WEAPON_TYPES[weaponId].name}`);
  }

  cycleWeapon() {
    const idx = WEAPON_ORDER.indexOf(this.weaponId);
    const next = WEAPON_ORDER[(idx + 1) % WEAPON_ORDER.length];
    this.setWeapon(next);
  }

  setLockedTarget(alien) {
    this.lockedTarget = alien || null;
    this.touch.lockedTarget = this.lockedTarget;
    if (alien) {
      this.soundSystem?.playLockAcquired?.();
      this.tacticalHud?.showToast(`Locked: ${alien.name || 'Hostile'}`);
    }
  }

  cycleTarget() {
    if (!this.aliens.length || !this.ships[0]) {
      this.setLockedTarget(null);
      return;
    }
    const lead = this.ships[0];
    const sorted = [...this.aliens].sort((a, b) => a.pos.distanceToSquared(lead.pos) - b.pos.distanceToSquared(lead.pos));
    const idx = sorted.indexOf(this.lockedTarget);
    const next = sorted[(idx + 1) % sorted.length];
    this.setLockedTarget(next);
  }

  deployFlares() {
    const lead = this.ships[0];
    if (!lead || this.flares <= 0 || this.flareCooldown > 0) return false;
    this.flares -= 1;
    this.flareCooldown = 1.6;
    this.flareActiveTimer = 2.8;
    const rear = new THREE.Vector3(0, 0, 1).applyQuaternion(lead.mesh.quaternion).normalize();
    this.fx?.spawnFlareBurst?.(lead.pos, rear);
    this.soundSystem?.playFlareDeploy?.();
    this.tacticalHud?.showToast(`Countermeasure Flares Deployed (${this.flares} left)`);
    return true;
  }

  fireMissile(ship = this.ships[0], target = null) {
    const lead = this.ships[0];
    if (!ship || this.dockedStation || this.planetSurface?.active) return false;
    const isLead = ship === lead;
    if (isLead) {
      if (this.missileAmmo <= 0) {
        this.tacticalHud?.showToast('Missile Bays Reloading...');
        return false;
      }
      const salvoCount = Math.min(this.missileAmmo, 3);
      this.missileAmmo -= salvoCount;
      for (let m = 0; m < salvoCount; m++) {
        this.missileQueue.push({
          delay: m * 0.16,
          hardpointIdx: m,
          target: target || this.lockedTarget
        });
      }
      if (this.tutorialSystem) {
        this.tutorialSystem.missilesLaunched = (this.tutorialSystem.missilesLaunched || 0) + 1;
      }
      this.soundSystem?.playMissileLaunch?.();
      this.touch.missileCooldown = 1.2;
      return true;
    }
    this.launchUndersideMissile(ship, 0, target);
    return true;
  }

  createPlanetSurfacePanel() {
    if (document.getElementById('planet-surface-panel')) return;
    const style = document.createElement('style');
    style.id = 'planet-surface-style';
    style.textContent = `
      #planet-surface-panel{position:fixed;z-index:30;inset:auto 18px 18px 18px;max-width:680px;margin:auto;padding:18px;border:1px solid rgba(105,232,255,.48);border-radius:18px;background:linear-gradient(145deg,rgba(5,15,31,.95),rgba(19,22,45,.92));box-shadow:0 16px 60px #0009;color:#f3f8ff;font:14px/1.45 Inter,system-ui,sans-serif;display:none;backdrop-filter:blur(16px)}
      #planet-surface-panel.open{display:block} #planet-surface-panel h2{font:700 19px/1.2 Orbitron,system-ui,sans-serif;color:#75eaff;margin:0 0 5px}
      #planet-surface-panel p{margin:5px 0 12px;color:#c4d1e0} #planet-surface-panel .surface-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      #planet-surface-panel button,#planet-land-button{border:1px solid #4ecfe6;border-radius:10px;background:rgba(8,145,178,.2);color:#effaff;padding:10px 12px;font:600 13px Inter,system-ui,sans-serif;cursor:pointer}
      #planet-surface-panel button:hover,#planet-land-button:hover{background:rgba(8,145,178,.42)} #planet-surface-panel button:disabled{opacity:.45;cursor:not-allowed}
      #planet-surface-status{color:#b5f3ff;min-height:24px;margin:10px 0 0} #planet-land-button{position:fixed;z-index:12;top:74px;left:50%;transform:translateX(-50%);box-shadow:0 6px 28px #0007;white-space:nowrap}
      #surface-descent-overlay{position:fixed;inset:-20%;z-index:25;display:none;pointer-events:none;background:radial-gradient(ellipse at 50% 58%,transparent 12%,rgba(80,193,255,.2) 35%,rgba(231,157,93,.75) 65%,rgba(17,18,39,.96) 100%);align-items:center;justify-content:center;color:white;text-align:center;font:900 clamp(20px,4vw,42px) Orbitron,system-ui,sans-serif;text-shadow:0 4px 28px #071526}
      #surface-descent-overlay.approach{display:flex;animation:planet-approach 1.2s ease-in-out infinite alternate}
      #surface-descent-overlay.descent,#surface-descent-overlay.takeoff{display:flex;animation:planet-descent 1.65s ease-in-out both}@keyframes planet-descent{0%{opacity:0;transform:scale(1.4)}18%{opacity:1}76%{opacity:.92;transform:scale(.82)}100%{opacity:0;transform:scale(.74)}}@keyframes planet-approach{from{opacity:.76;transform:scale(1.02)}to{opacity:1;transform:scale(.98)}}
      .is-embedded-sim #planet-land-button,.is-embedded-sim #planet-surface-panel,.is-embedded-sim #starship-life-panel{display:none!important}
      body.is-planet-surface .hud-footer,body.is-planet-surface .hud-header,body.is-planet-surface #planet-land-button{display:none!important}
      #starship-life-panel{position:fixed;z-index:11;right:14px;top:74px;width:min(520px,calc(100vw - 28px));max-height:calc(100vh - 90px);overflow:auto;border:1px solid rgba(105,232,255,.35);border-radius:14px;background:rgba(5,15,31,.92);color:#eefaff;font:12px/1.45 Inter,system-ui,sans-serif;box-shadow:0 8px 30px #0006;backdrop-filter:blur(12px)}#starship-life-panel summary{cursor:pointer;padding:10px 12px;color:#8cecff;font-weight:800}#starship-life-panel .life-card{padding:0 12px 12px}#pilot-life-profile{color:#c8d5e5;margin:0 0 9px}#starship-life-panel .life-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px}#starship-life-panel button{border:1px solid #4ecfe6;border-radius:8px;background:rgba(8,145,178,.2);color:#effaff;padding:8px 6px;font:700 11px Inter,system-ui,sans-serif;cursor:pointer}#starship-life-panel button:disabled{opacity:.5;cursor:default}#starship-luxury-assets{margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.12)}#starship-luxury-assets h3{margin:0;color:#f6d58a;font-size:12px}#starship-luxury-assets>p{margin:4px 0 8px;color:#c8d5e5;font-size:10px}#starship-luxury-catalog{display:grid;grid-template-columns:1fr 1fr;gap:7px}#starship-luxury-catalog article{padding:8px;border:1px solid rgba(255,255,255,.12);border-radius:9px;background:rgba(255,255,255,.04)}#starship-luxury-catalog b{display:block;color:#f4f8fc;font-size:10px}#starship-luxury-catalog span{display:block;margin:4px 0;color:#c8d5e5;font-size:9px}#starship-luxury-catalog button{width:100%;font-size:10px}
      @media(max-width:640px){#planet-surface-panel{inset:auto 8px 8px;padding:14px;max-height:70vh;overflow:auto}#planet-surface-panel .surface-grid{grid-template-columns:1fr}#planet-land-button{top:58px;font-size:12px}}
    `;
    document.head.appendChild(style);

    const land = document.createElement('button');
    land.id = 'planet-land-button';
    land.type = 'button';
    land.textContent = '🪐 Autopilot travel & land on nearest planet';
    land.setAttribute('aria-label', 'Travel to and land on the nearest planet or dock at nearest station');
    land.addEventListener('click', () => this.handleLandOrDockAction());
    document.body.appendChild(land);

    const panel = document.createElement('section');
    panel.id = 'planet-surface-panel';
    panel.setAttribute('aria-label', 'Planet surface exploration');
    panel.innerHTML = `<h2 id="surface-title">Planetary Expedition</h2><p id="surface-objectives">Drive the rover with W A S D or arrow keys. Press Space for jump jets.</p><div class="surface-grid"><button type="button" id="surface-interact">🛰️ Interact with nearby site · E</button><button type="button" id="surface-scan">📡 Scan this landing zone</button><button type="button" id="surface-outpost">🏗️ Deploy research outpost · 1,200 CR</button><button type="button" id="surface-charter">🏙️ Charter a planetary city · 250,000 CR</button><button type="button" id="surface-own-planet">🌐 Acquire planetary sovereignty · 85,000,000 CR</button><button type="button" id="surface-takeoff">🚀 Return to orbit</button></div><p id="planet-surface-status" role="status" aria-live="polite">Find the glowing sites to gather samples and retrieve the lost probe.</p>`;
    panel.querySelector('#surface-interact').addEventListener('click', () => this.interactPlanetSite());
    panel.querySelector('#surface-scan').addEventListener('click', () => this.scanPlanetSurface());
    panel.querySelector('#surface-outpost').addEventListener('click', () => this.deployPlanetOutpost());
    panel.querySelector('#surface-charter').addEventListener('click', () => this.charterPlanetaryCity());
    panel.querySelector('#surface-own-planet').addEventListener('click', () => this.acquirePlanetarySovereignty());
    panel.querySelector('#surface-takeoff').addEventListener('click', () => this.takeoffFromPlanet());
    document.body.appendChild(panel);

    const descent = document.createElement('div');
    descent.id = 'surface-descent-overlay';
    descent.setAttribute('aria-hidden', 'true');
    descent.textContent = 'Atmospheric entry · deploying expedition rover';
    document.body.appendChild(descent);

    const lifePanel = document.createElement('details');
    lifePanel.id = 'starship-life-panel';
    lifePanel.innerHTML = `<summary>🧬 Pilot Life · <span id="pilot-life-origin">Born Poor</span></summary><div class="life-card"><p id="pilot-life-profile" aria-live="polite"></p><label style="display:flex;align-items:center;gap:6px;margin:0 0 8px;color:#fca5a5;font-weight:700;cursor:pointer"><input type="checkbox" id="pilot-ironman-toggle"> 💀 Ironman Mode (0 hull resets career)</label><div class="life-actions"><button type="button" data-birth="poor">Born Poor</button><button type="button" data-birth="middle">Middle Class</button><button type="button" data-birth="rich">Born Rich</button><button type="button" data-birth="random">🎲 Random Birth Mode</button></div><button type="button" id="pilot-new-life" hidden>Begin a new pilot life</button><section id="starship-luxury-assets" aria-label="Luxury holdings and income"><h3>Luxury holdings</h3><p>Buy an estate, yacht, research base, or private service team. Owned holdings add passive charter, rent, or grant income while the simulator runs.</p><div id="starship-luxury-catalog"></div><p id="starship-luxury-feedback" role="status" aria-live="polite"></p></section></div>`;
    lifePanel.querySelectorAll('[data-birth]').forEach(button => button.addEventListener('click', () => this.startPilotLife(button.dataset.birth)));
    lifePanel.querySelector('#pilot-new-life').addEventListener('click', () => this.beginNewPilotLife());
    const ironmanBox = lifePanel.querySelector('#pilot-ironman-toggle');
    ironmanBox.checked = Boolean(this.pilotLife.ironman);
    ironmanBox.addEventListener('change', () => {
      this.pilotLife.ironman = ironmanBox.checked;
      this.savePilotRecord();
      this.tacticalHud?.showToast(this.pilotLife.ironman ? 'Ironman Mode ENABLED' : 'Ironman Mode disabled (Emergency Tow active)');
    });
    lifePanel.querySelector('#starship-luxury-catalog').addEventListener('click', event => {
      const button = event.target.closest('[data-luxury-asset]');
      if (button) this.buyStarshipLuxuryAsset(button.dataset.luxuryAsset);
    });
    document.body.appendChild(lifePanel);
    this.renderPilotLife();
  }

  handleLandOrDockAction() {
    if (this.planetSurface?.active) {
      this.takeoffFromPlanet();
      return;
    }
    if (this.planetaryLanding || this.stationApproach || this.dockedStation) return;
    const lead = this.ships[0];
    if (!lead || !this.environment) return;

    const target = this.getLandingDestination(lead.pos);
    if (this.environment.stations.includes(target)) this.beginStationDocking(target);
    else if (target) this.beginPlanetaryDescent(target);
  }

  getLandingDestination(position) {
    const nearestStation = this.environment.stations?.reduce((near, st) =>
      !near || st.mesh.position.distanceToSquared(position) < near.mesh.position.distanceToSquared(position) ? st : near, null);
    const nearestPlanet = this.environment.planets?.map(planet => planet.landingBody || planet).reduce((near, pl) =>
      !near || (pl.mesh.position.distanceTo(position) - pl.radius) < (near.mesh.position.distanceTo(position) - near.radius) ? pl : near, null);

    const stDist = nearestStation ? nearestStation.mesh.position.distanceTo(position) : Infinity;
    const plDist = nearestPlanet ? Math.max(0, nearestPlanet.mesh.position.distanceTo(position) - nearestPlanet.radius) : Infinity;
    return stDist < 420 || stDist < plDist ? nearestStation : nearestPlanet;
  }

  warpToDestination(dest) {
    const lead = this.ships[0];
    if (!lead || !dest?.mesh || this.planetSurface?.active || this.dockedStation || this.stationApproach || this.planetaryLanding) return;
    const targetPos = dest.mesh.position;
    const offsetDist = (dest.radius || 42) + 175;
    const dir = lead.pos.clone().sub(targetPos);
    if (dir.lengthSq() < 1) dir.set(1, 0, 0);
    dir.normalize();

    const arrivalPos = targetPos.clone().addScaledVector(dir, offsetDist);
    const lookDir = targetPos.clone().sub(arrivalPos).normalize();
    const warpForward = lookDir.clone();

    if (this.cameraDirector) this.cameraDirector.warpFovBoost = 28;
    this.fx?.spawnWarpStreaks?.(lead.pos, warpForward);
    this.soundSystem?.playWarpBoom?.();

    lead.pos.copy(arrivalPos);
    lead.mesh.position.copy(arrivalPos);
    lead.vel.copy(lookDir.multiplyScalar(lead.maxSpeed * 0.6));
    const lookMat = new THREE.Matrix4().lookAt(arrivalPos, targetPos, new THREE.Vector3(0, 1, 0));
    lead.mesh.quaternion.setFromRotationMatrix(lookMat);

    // Pull wingmen with lead ship
    this.ships.slice(1).forEach((s, idx) => {
      s.pos.copy(arrivalPos).add(new THREE.Vector3((idx % 2 === 0 ? -1 : 1) * (16 + idx * 5), 4, 22 + idx * 6));
      s.mesh.position.copy(s.pos);
      s.vel.copy(lead.vel);
    });

    this.navTarget = dest;
    this.stageEncounters(true);
    this.tacticalHud?.showToast(`Hyperdrive Arrived: ${dest.landingLabel || dest.name}`);
  }

  beginStationDocking(station) {
    if (!station || this.dockedStation || this.stationApproach || this.planetaryLanding || this.planetSurface?.active) return;
    const lead = this.ships[0];
    if (!lead) return;
    const dist = lead.pos.distanceTo(station.mesh.position);
    if (dist <= (station.dockingRadius || 105) * 1.35) {
      this.enterDockedStation(station);
      return;
    }
    this.stationApproach = {
      station,
      ship: lead,
      startPosition: lead.pos.clone(),
      elapsed: 0,
      duration: THREE.MathUtils.clamp(dist / 260, 1.8, 7.5)
    };
    const landButton = document.getElementById('planet-land-button');
    if (landButton) {
      landButton.disabled = true;
      landButton.textContent = `Autopilot docking at ${station.name}…`;
    }
  }

  advanceStationDocking(dt) {
    const app = this.stationApproach;
    if (!app) return;
    this.environment.update(dt);
    app.elapsed += dt;
    const progress = Math.min(1, app.elapsed / app.duration);
    const eased = progress * progress * (3 - 2 * progress);
    const dir = app.startPosition.clone().sub(app.station.mesh.position).normalize();
    const dest = app.station.mesh.position.clone().addScaledVector(dir, (app.station.collisionRadius || 42) + 26);
    app.ship.pos.lerpVectors(app.startPosition, dest, eased);
    app.ship.mesh.position.copy(app.ship.pos);
    const lookMat = new THREE.Matrix4().lookAt(app.ship.pos, app.station.mesh.position, new THREE.Vector3(0, 1, 0));
    app.ship.mesh.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(lookMat), Math.min(1, dt * 8));

    const obstacles = this.flightDynamics.getFlightObstacles(app.ship);
    this.cameraDirector.update(dt, this.elapsed, app.ship, this.ships, this.aliens, this.environment.planets, obstacles, false);

    if (progress >= 1) {
      this.stationApproach = null;
      this.enterDockedStation(app.station);
    }
  }

  enterDockedStation(station) {
    this.dockedStation = station;
    this.keys = {};
    this.pointerFireHeld = false;
    this.soundSystem?.playDockChime?.();
    this.soundSystem?.updateEngineHum?.(0, false, false);
    this.tacticalHud?.openStationModal(station);
  }

  undockFromStation() {
    const station = this.dockedStation;
    this.dockedStation = null;
    this.tacticalHud?.closeStationModal();
    const lead = this.ships[0];
    if (lead && station) {
      const away = lead.pos.clone().sub(station.mesh.position);
      if (away.lengthSq() < 1) away.set(1, 0, 0);
      away.normalize();
      lead.pos.copy(station.mesh.position).addScaledVector(away, (station.collisionRadius || 42) + 52);
      lead.mesh.position.copy(lead.pos);
      lead.vel.copy(away.multiplyScalar(lead.maxSpeed * 0.55));
    }
    const landButton = document.getElementById('planet-land-button');
    if (landButton) {
      landButton.disabled = false;
      landButton.textContent = '🪐 Autopilot travel & land on nearest planet';
    }
    this.tacticalHud?.showToast('Undocked from Space Station');
  }

  beginPlanetaryDescent(targetPlanet = null) {
    if (!this.planetSurface || this.planetSurface.active || this.planetaryLanding || this.stationApproach || this.dockedStation) return;
    const ship = this.ships[0];
    if (!ship || !this.environment?.planets?.length) return;
    const planet = targetPlanet?.landingBody || targetPlanet || this.environment.planets.map(world => world.landingBody || world).reduce((near, candidate) =>
      !near || candidate.mesh.position.distanceToSquared(ship.pos) < near.mesh.position.distanceToSquared(ship.pos) ? candidate : near, null);
    if (!planet) return;

    const approachDirection = ship.pos.clone().sub(planet.mesh.position);
    if (approachDirection.lengthSq() < 0.001) approachDirection.set(1, 0, 0);
    approachDirection.normalize();
    const landingPosition = planet.mesh.position.clone().addScaledVector(approachDirection, planet.radius + 28);
    const distance = ship.pos.distanceTo(landingPosition);
    this.planetaryLanding = {
      planet,
      ship,
      startPosition: ship.pos.clone(),
      approachDirection,
      elapsed: 0,
      duration: THREE.MathUtils.clamp(distance / 280, 2.2, 8.5)
    };
    const landButton = document.getElementById('planet-land-button');
    if (landButton) {
      landButton.disabled = true;
      landButton.textContent = `Autopilot approaching ${planet.landingLabel || planet.name}…`;
    }
    const overlay = document.getElementById('surface-descent-overlay');
    if (overlay) {
      overlay.textContent = `Autopilot approach · ${planet.landingLabel || planet.name}`;
      overlay.classList.remove('descent', 'takeoff', 'approach');
      void overlay.offsetWidth;
      overlay.classList.add('approach');
    }
    this.updatePilotLifeControls();
    this.keys = {};
  }

  advancePlanetaryDescent(dt) {
    const landing = this.planetaryLanding;
    if (!landing) return;
    this.environment.update(dt);
    landing.elapsed += dt;
    const progress = Math.min(1, landing.elapsed / landing.duration);
    const eased = progress * progress * (3 - 2 * progress);
    const destination = landing.planet.mesh.position.clone().addScaledVector(landing.approachDirection, landing.planet.radius + 28);
    const previousPosition = landing.ship.pos.clone();
    landing.ship.pos.lerpVectors(landing.startPosition, destination, eased);
    landing.ship.mesh.position.copy(landing.ship.pos);
    if (dt > 0) landing.ship.vel.copy(landing.ship.pos).sub(previousPosition).divideScalar(dt);

    const lead = landing.ship;
    const obstacles = this.flightDynamics.getFlightObstacles(lead);
    this.cameraDirector.update(dt, this.elapsed, lead, this.ships, this.aliens, this.environment.planets, obstacles, false);
    if (progress < 1) return;

    this.planetaryLanding = null;
    const existingProgress = this.planetProgress[landing.planet.name];
    if (existingProgress?.city && !existingProgress.cityOwner) {
      existingProgress.cityOwner = existingProgress.planetOwner || this.pilotLife.name;
    }
    landing.ship.mesh.visible = false;
    this.planetSurface.land(landing.planet, this.planetProgress[landing.planet.name], {
      shipClass: this.shipClass,
      livery: getLivery(this.liveryId)
    });
    if (this.cockpitView) this.cockpitView.group.visible = false;
    document.body.classList.remove('is-cockpit-view');
    document.body.classList.add('is-planet-surface');
    this.soundSystem?.updateEngineHum?.(0, false, false);
    this.updatePilotLifeControls();
    document.getElementById('surface-descent-overlay')?.classList.remove('approach');
    this.playDescentTransition('descent', `Atmospheric entry · ${landing.planet.landingLabel || landing.planet.name}`);
    this.keys = {};
    this.updatePlanetSurfacePanel('landed', { planet: landing.planet.name });
  }

  startPilotLife(mode = 'random') {
    if (this.pilotLife.wealthOriginLocked) return;
    if (this.planetaryLanding || this.stationApproach || this.dockedStation) {
      const feedback = document.getElementById('starship-luxury-feedback');
      if (feedback) feedback.textContent = 'Finish landing or undock before choosing a birth background.';
      this.updatePilotLifeControls();
      return;
    }
    if (this.planetSurface?.active) {
      const feedback = document.getElementById('starship-luxury-feedback');
      if (feedback) feedback.textContent = 'Return to orbit before choosing a birth background.';
      this.updatePilotLifeControls();
      return;
    }
    if (this.hasPlanetaryProgress()) {
      const feedback = document.getElementById('starship-luxury-feedback');
      if (feedback) feedback.textContent = 'This pilot already has planetary records. Begin a new pilot life to reset them before choosing a birth background.';
      this.updatePilotLifeControls();
      return;
    }
    const firstNames = ['Nova', 'Ari', 'Sol', 'Mika', 'Juno', 'Kestrel', 'Tavi', 'Orion', 'Zuri', 'Rin', 'Marlow', 'Echo'];
    const lastNames = ['Vale', 'Quasar', 'Mercer', 'Sato', 'Rook', 'Solari', 'Venn', 'Kade', 'Northstar', 'Morrow'];
    const random = items => items[Math.floor(Math.random() * items.length)];
    const roll = Math.random();
    const origin = mode === 'random' ? (roll < 0.5 ? 'poor' : roll < 0.83 ? 'middle' : roll < 0.97 ? 'affluent' : 'rich') : mode;
    const wealth = origin === 'rich'
      ? Math.floor(45_000_000 + Math.random() * 80_000_000)
      : origin === 'affluent'
        ? Math.floor(2_000_000 + Math.random() * 18_000_000)
        : origin === 'middle'
          ? Math.floor(28_000 + Math.random() * 90_000)
          : Math.floor(500 + Math.random() * 2_500);
    const birthDate = mode === 'random'
      ? `${1 + Math.floor(Math.random() * 12)}/${1 + Math.floor(Math.random() * 28)}/${4069 + Math.floor(Math.random() * 2901)}`
      : '4/20/6969';

    const packageByOrigin = {
      poor: {
        background: random(['Dockside mechanic', 'Frontier scholarship', 'Resettled homesteader', 'Station-raised apprentice']),
        skills: Math.floor(Math.random() * 2),
        connections: Math.floor(Math.random() * 2),
        assets: [],
        mission: random([
          'Earn your first 10,000 CR by surveying worlds and upgrading your fighter.',
          'Find the missing probe and use its reward to buy your first ship upgrade.',
          'Take station contracts until you can afford a Zephyr Interceptor or Aegis Gunship.'
        ])
      },
      middle: {
        background: random(['Trade-school navigator', 'Union shipwright family', 'Public-service cadet', 'Small-freighter household']),
        skills: 1 + Math.floor(Math.random() * 2),
        connections: 1 + Math.floor(Math.random() * 2),
        assets: [random(['Reliable shuttle share', 'Orbital apartment lease', 'Family cargo skiff'])],
        mission: random([
          'Build a respected survey fleet and open an independent trade route.',
          'Complete a planetary expedition and earn enough for a Valkyrie Corvette.',
          'Earn a reputation as the system’s most reliable contract pilot.'
        ])
      },
      affluent: {
        background: random(['Second-generation exporter', 'Tech-campus legacy', 'Regional shipping family', 'Successful homestead heir']),
        skills: 2 + Math.floor(Math.random() * 3),
        connections: 2 + Math.floor(Math.random() * 3),
        assets: ['Private courier craft', random(['Orbital skyhome', 'Mining claim', 'Research vessel share'])],
        mission: random([
          'Establish the region’s first self-sustaining planetary research base.',
          'Turn inherited routes into a thriving Hyperion Frigate fleet.',
          'Fund a system-wide wildlife and habitat survey.'
        ])
      },
      rich: {
        background: random(['Interplanetary dynasty', 'Founder family', 'Old-star aristocracy', 'Galactic media empire']),
        skills: 3 + Math.floor(Math.random() * 4),
        connections: 4 + Math.floor(Math.random() * 5),
        assets: [
          'Gigantic luxury star-yacht',
          'Private orbital residence',
          'Executive shuttle',
          'Planetary research base',
          'Robot crew',
          'Human household staff',
          'Animal sanctuary habitat',
          'Planet-wide sovereignty deed'
        ],
        mission: random([
          'Build a planetary capital city and command a Sovereign Dreadnought.',
          'Lead a system-wide ecological expedition across all six charted worlds.',
          'Create an independent interstellar estate with a flourishing city and research fleet.'
        ])
      }
    }[origin];

    const pilotName = `${random(firstNames)} ${random(lastNames)}`;
    this.pilotLife = {
      mode: origin,
      birthDate,
      name: pilotName,
      ...packageByOrigin,
      wealthOriginLocked: true,
      ironman: Boolean(this.pilotLife.ironman),
      completedContracts: 0
    };
    this.credits = wealth;
    this.planetProgress = {};
    if (origin === 'rich' && this.environment?.planets?.length) {
      const homeworld = random(this.environment.planets).name;
      this.planetProgress[homeworld] = {
        samples: 3,
        scanned: true,
        probe: true,
        outpost: true,
        city: true,
        cityOwner: pilotName,
        completed: true,
        planetOwner: pilotName
      };
      this.pilotLife.assets = appendUniqueAssets(
        this.pilotLife.assets.map(asset => asset === 'Planet-wide sovereignty deed' ? `Planetary sovereignty · ${homeworld}` : asset),
        `Planetary city · ${homeworld}`
      );
    }
    if (this.planetSurface) this.planetSurface.progress = this.planetProgress;
    this.applyShipStatsToLead(true);
    this.renderPilotLife();
    this.updateCreditsHud();
    this.savePilotRecord();
  }

  renderPilotLife() {
    const origin = document.getElementById('pilot-life-origin');
    const details = document.getElementById('pilot-life-profile');
    if (!origin || !details) return;
    const label = this.pilotLife.mode === 'rich'
      ? 'Born Rich'
      : this.pilotLife.mode === 'affluent'
        ? 'Affluent Start'
        : this.pilotLife.mode === 'middle'
          ? 'Middle Class'
          : 'Born Poor';
    origin.textContent = label;
    const bonuses = getPilotBonuses(this.pilotLife);
    details.textContent = `${this.pilotLife.name} · Born ${this.pilotLife.birthDate} · ${this.pilotLife.background} · Skills ${bonuses.skills}/6 (+${bonuses.skills * 5}% dmg, +${bonuses.skills * 6}% mine, +${bonuses.skills * 4}% turn) · Connections ${bonuses.connections}/8 (${bonuses.discountPct}% discount, Tier ${bonuses.contractTier}) · Assets: ${this.pilotLife.assets.join(', ') || 'none yet'} · Goal: ${this.pilotLife.mission}`;
    const ironmanBox = document.getElementById('pilot-ironman-toggle');
    if (ironmanBox) ironmanBox.checked = Boolean(this.pilotLife.ironman);
    this.updatePilotLifeControls();
    this.renderStarshipLuxuryMarket();
  }

  updatePilotLifeControls() {
    const transitioning = Boolean(this.planetaryLanding || this.stationApproach || this.planetSurface?.active);
    document.querySelectorAll('#starship-life-panel [data-birth]').forEach(button => {
      button.disabled = this.pilotLife.wealthOriginLocked || transitioning;
    });
    const newLife = document.getElementById('pilot-new-life');
    if (newLife) {
      newLife.hidden = !this.pilotLife.wealthOriginLocked && !this.hasPlanetaryProgress() && this.ownedShips.length <= 1;
      newLife.disabled = transitioning;
      newLife.textContent = this.planetaryLanding
        ? 'Wait for landing before beginning a new life'
        : this.planetSurface?.active
          ? 'Return to orbit to begin a new life'
          : 'Begin a new pilot life · reset credits and records';
    }
  }

  hasPlanetaryProgress() {
    return Object.values(this.planetProgress || {}).some(progress =>
      progress && (progress.samples > 0 || progress.scanned || progress.probe || progress.outpost || progress.city)
    );
  }

  beginNewPilotLife(skipConfirm = false) {
    const feedback = document.getElementById('starship-luxury-feedback');
    if (!skipConfirm) {
      if (this.planetaryLanding || this.stationApproach) {
        if (feedback) feedback.textContent = 'Finish the approach before starting a new life.';
        return;
      }
      if (this.planetSurface?.active) {
        if (feedback) feedback.textContent = 'Return to orbit before starting a new life.';
        return;
      }
      if (!window.confirm('Start a new pilot life? This resets credits, ship upgrades, luxury holdings, and planetary records.')) return;
    }

    this.credits = 1250;
    this.planetProgress = {};
    if (this.planetSurface) this.planetSurface.progress = this.planetProgress;
    this.shipClass = 'vanguard';
    this.ownedShips = ['vanguard'];
    this.upgrades = normalizeUpgrades({});
    this.liveryId = 'starfleet-cyan';
    this.ownedLiveries = ['starfleet-cyan'];
    this.weaponId = 'plasma';
    this.oreCargo = 0;
    this.contracts?.activeContracts && (this.contracts.activeContracts = []);
    this.pilotLife = {
      mode: 'poor',
      name: 'Nova Vale',
      birthDate: '4/20/6969',
      background: 'New Arrival',
      skills: 0,
      connections: 0,
      assets: [],
      mission: 'Survey your first world and recover the lost probe.',
      wealthOriginLocked: false,
      ironman: Boolean(this.pilotLife.ironman),
      completedContracts: 0
    };
    this.rebuildPlayerShipMesh();
    this.updateCreditsHud();
    this.renderPilotLife();
    if (feedback) feedback.textContent = 'New pilot life ready. Choose Born Poor, Middle Class, Born Rich, or Random Birth.';
    this.savePilotRecord();
  }

  resetCareerAfterIronman() {
    if (this.dockedStation) this.undockFromStation();
    this.beginNewPilotLife(true);
    this.tacticalHud?.showToast('New Pilot Life Initialized');
  }

  renderStarshipLuxuryMarket() {
    const catalog = document.getElementById('starship-luxury-catalog');
    if (!catalog) return;
    if (catalog.children.length !== STARSHIP_LUXURY_ASSETS.length) {
      catalog.innerHTML = STARSHIP_LUXURY_ASSETS.map(asset =>
        `<article><b>${asset.title}</b><span>${asset.detail}<br>${asset.cost.toLocaleString()} CR · +${asset.income} CR / flight-second</span><button type="button" data-luxury-asset="${asset.id}"></button></article>`
      ).join('');
    }
    const assets = new Set(Array.isArray(this.pilotLife?.assets) ? this.pilotLife.assets : []);
    STARSHIP_LUXURY_ASSETS.forEach((asset, index) => {
      const owned = assets.has(asset.title);
      const affordable = this.credits >= asset.cost;
      const button = catalog.children[index]?.querySelector('button[data-luxury-asset]');
      if (!button) return;
      button.disabled = owned || !affordable;
      button.textContent = owned ? 'Owned' : affordable ? 'Acquire holding' : `Need ${(asset.cost - this.credits).toLocaleString()} more CR`;
    });
  }

  buyStarshipLuxuryAsset(id) {
    const asset = STARSHIP_LUXURY_ASSETS.find(item => item.id === id);
    const feedback = document.getElementById('starship-luxury-feedback');
    if (!asset) return;
    if (!Array.isArray(this.pilotLife.assets)) this.pilotLife.assets = [];
    if (this.pilotLife.assets.includes(asset.title)) {
      if (feedback) feedback.textContent = `${asset.title} is already in your holdings.`;
      return;
    }
    if (this.credits < asset.cost) {
      if (feedback) feedback.textContent = `You need ${(asset.cost - this.credits).toLocaleString()} more CR to acquire ${asset.title}.`;
      return;
    }
    this.credits -= asset.cost;
    this.pilotLife.assets = [...this.pilotLife.assets, asset.title];
    if (feedback) feedback.textContent = `Acquired ${asset.title}. It now earns ${asset.income} CR each flight-second.`;
    this.renderPilotLife();
    this.updateCreditsHud();
    this.savePilotRecord();
  }

  buyShipUpgrade(trackId) {
    const lv = this.upgrades[trackId] || 0;
    const cost = getUpgradeCost(trackId, lv, this.pilotLife);
    if (cost === null || this.credits < cost) return false;
    this.credits -= cost;
    this.upgrades[trackId] = lv + 1;
    this.applyShipStatsToLead(true);
    this.soundSystem?.playCashCoin?.();
    this.updateCreditsHud();
    this.savePilotRecord();
    const track = UPGRADE_TRACKS.find(t => t.id === trackId);
    this.tacticalHud?.showToast(`${track?.name || trackId} Upgraded to Lv ${lv + 1}!`);
    return true;
  }

  buyOrEquipShip(classId) {
    if (!SHIP_CLASSES[classId]) return false;
    const isOwned = this.ownedShips.includes(classId);
    if (!isOwned) {
      const cost = getShipCost(classId, this.pilotLife);
      if (this.credits < cost) return false;
      this.credits -= cost;
      this.ownedShips.push(classId);
    }
    this.shipClass = classId;
    this.rebuildPlayerShipMesh();
    this.soundSystem?.playSuccess?.();
    this.updateCreditsHud();
    this.savePilotRecord();
    this.tacticalHud?.showToast(`Boarded ${SHIP_CLASSES[classId].name}!`);
    return true;
  }

  buyOrSelectLivery(liveryId) {
    const liv = getLivery(liveryId);
    if (!this.ownedLiveries.includes(liv.id)) {
      const cost = getLiveryCost(liv.id, this.pilotLife);
      if (this.credits < cost) return false;
      this.credits -= cost;
      this.ownedLiveries.push(liv.id);
    }
    this.liveryId = liv.id;
    this.rebuildPlayerShipMesh();
    this.soundSystem?.playCashCoin?.();
    this.updateCreditsHud();
    this.savePilotRecord();
    return true;
  }

  applyShipStatsToLead(refill = false) {
    const lead = this.ships[0];
    if (!lead) return;
    const stats = this.getActiveShipStats();
    lead.maxHull = stats.maxHull;
    lead.maxShield = stats.maxShield;
    lead.maxSpeed = stats.maxSpeed;
    lead.agility = stats.agility;
    lead.maxBoostEnergy = stats.maxBoostEnergy;
    lead.size = stats.hitRadius;
    if (refill) {
      lead.hull = stats.maxHull;
      lead.shield = stats.maxShield;
      this.missileAmmo = stats.missileMax;
      if (this.flightDynamics) this.flightDynamics.boostEnergy = stats.maxBoostEnergy;
    } else {
      lead.hull = Math.min(lead.hull ?? stats.maxHull, stats.maxHull);
      lead.shield = Math.min(lead.shield ?? stats.maxShield, stats.maxShield);
    }
  }

  rebuildPlayerShipMesh() {
    const lead = this.ships[0];
    if (!lead || !this.scene) return;
    const stats = this.getActiveShipStats();
    const livery = getLivery(this.liveryId);
    const oldPos = lead.pos.clone();
    const oldQuat = lead.mesh.quaternion.clone();
    const wasVisible = lead.mesh.visible;

    const oldMesh = lead.mesh;
    this.scene.remove(oldMesh);
    this.disposeObject3D(oldMesh);
    const newMesh = ShipBuilder.buildPlayerShip(this.shipClass, livery);
    newMesh.scale.setScalar(stats.scale);
    newMesh.position.copy(oldPos);
    newMesh.quaternion.copy(oldQuat);
    newMesh.visible = wasVisible;
    this.scene.add(newMesh);

    lead.mesh = newMesh;
    lead.pos = newMesh.position;
    lead.colorHex = livery.accentHex;
    this.applyShipStatsToLead(true);
    this.cockpitView?.setLivery(livery);
  }

  onContractCompleted(contract) {
    if (!contract) return;
    this.credits += contract.reward;
    this.pilotLife.completedContracts = (this.pilotLife.completedContracts || 0) + 1;

    let bonusNote = '';
    if (this.pilotLife.completedContracts % 3 === 0 && (this.pilotLife.skills || 0) < 6) {
      this.pilotLife.skills = Math.min(6, (this.pilotLife.skills || 0) + 1);
      bonusNote += ' · +1 Pilot Skill!';
    }
    if (this.pilotLife.completedContracts % 4 === 0 && (this.pilotLife.connections || 0) < 8) {
      this.pilotLife.connections = Math.min(8, (this.pilotLife.connections || 0) + 1);
      bonusNote += ' · +1 Connection!';
    }

    this.applyShipStatsToLead(false);
    this.renderPilotLife();
    this.updateCreditsHud();
    this.savePilotRecord();
    this.soundSystem?.playSuccess?.();
    this.tacticalHud?.showToast(`Contract Complete: +${contract.reward.toLocaleString()} CR${bonusNote}`, 3.5);
  }

  handlePlanetSurfaceEvent(type, data) {
    if (type === 'interaction' || type === 'scan') {
      this.credits += data.reward || 0;
      this.updateCreditsHud();
      this.planetProgress = this.planetSurface?.progress || {};
      this.contracts?.recordEvent('survey', 1, { planet: this.planetSurface?.planet?.name });
      this.savePilotRecord();
    } else if (type === 'outpost' || type === 'charter' || type === 'sovereignty') {
      this.planetProgress = this.planetSurface?.progress || {};
      this.savePilotRecord();
    }
    this.updatePlanetSurfacePanel(type, data);
  }

  updateCreditsHud() {
    const creditsEl = document.getElementById('hud-credits');
    if (creditsEl) creditsEl.textContent = `${Math.floor(this.credits).toLocaleString()} CR`;
  }

  updatePlanetSurfacePanel(type = '', data = {}) {
    const panel = document.getElementById('planet-surface-panel');
    if (!panel || !this.planetSurface) return;
    panel.classList.toggle('open', this.planetSurface.active);
    const title = panel.querySelector('#surface-title');
    const status = panel.querySelector('#planet-surface-status');
    const objectives = panel.querySelector('#surface-objectives');
    if (!this.planetSurface.active) return;

    const state = this.planetSurface.getStatus();
    title.textContent = `🪐 ${state.landingLabel || state.planet} Surface Expedition`;
    objectives.textContent = `Survey zone ${state.scanned ? '✅' : '⬜'} · Samples ${state.samples}/3 · Recover probe ${state.probe ? '✅' : '⬜'} · Outpost ${state.outpost ? '✅' : '⬜'} · City ${state.city ? `owned by ${state.cityOwner || 'the pilot'}` : 'not chartered'} · Sovereignty ${state.planetOwned ? `owned by ${state.planetOwner}` : 'available'}`;
    const outpostButton = panel.querySelector('#surface-outpost');
    const charterButton = panel.querySelector('#surface-charter');
    const sovereigntyButton = panel.querySelector('#surface-own-planet');
    outpostButton.disabled = state.outpost || this.credits < 1200;
    outpostButton.textContent = state.outpost ? '🏗️ Research outpost operational' : `🏗️ Deploy research outpost · 1,200 CR (balance ${Math.floor(this.credits).toLocaleString()})`;
    charterButton.disabled = state.city || this.credits < 250_000;
    charterButton.textContent = state.city ? `🏙️ City owned by ${state.cityOwner || 'the pilot'}` : `🏙️ Charter planetary city · 250,000 CR (balance ${Math.floor(this.credits).toLocaleString()})`;
    sovereigntyButton.disabled = state.planetOwned || this.credits < 85_000_000;
    sovereigntyButton.textContent = state.planetOwned ? `🌐 Planet owned by ${state.planetOwner}` : `🌐 Acquire planetary sovereignty · 85,000,000 CR (balance ${Math.floor(this.credits).toLocaleString()})`;

    if (type === 'landed') status.textContent = `Safe landing confirmed at ${state.landingLabel || state.planet}. Use W A S D or arrows to drive; Space for jump jets; press E near a site to interact.`;
    else if (type === 'interaction') status.textContent = data.error || `Recovered ${data.label} (+${data.reward} CR).${data.complete ? ' Expedition objectives complete!' : ''}`;
    else if (type === 'scan') status.textContent = data.error || `Planet survey complete (+${data.reward} CR).${data.complete ? ' Expedition objectives complete!' : ' Find three samples and the missing probe.'}`;
    else if (type === 'outpost') status.textContent = data.error || 'Research outpost deployed. It adds 5 CR per in-simulation second while you travel in space.';
    else if (type === 'charter') status.textContent = data.error || `Planetary city charter approved for ${state.cityOwner || this.pilotLife.name}. Contributes 35 CR per in-simulation second.`;
    else if (type === 'sovereignty') status.textContent = data.error || `${state.planet} is now your sovereign world! Contributes 500 CR per in-simulation second.`;
    else if (type === 'takeoff') status.textContent = 'Ascending to orbit. Expedition records and rewards saved.';
    else if (state.nearby) status.textContent = `Nearby site: ${state.nearby}. Drive closer, then press E or Interact.`;
  }

  interactPlanetSite() {
    if (!this.planetSurface?.active) return;
    const result = this.planetSurface.interact();
    if (result?.error) this.updatePlanetSurfacePanel('interaction', result);
  }

  scanPlanetSurface() {
    const result = this.planetSurface?.scan();
    if (result?.error) this.updatePlanetSurfacePanel('scan', result);
  }

  deployPlanetOutpost() {
    if (!this.planetSurface?.active) return;
    const state = this.planetSurface.getStatus();
    if (state.outpost) return this.updatePlanetSurfacePanel('outpost', { error: 'An outpost is already operating here.' });
    if (this.credits < 1200) return this.updatePlanetSurfacePanel('outpost', { error: 'You need 1,200 CR to deploy a research outpost.' });
    this.credits -= 1200;
    const result = this.planetSurface.buildOutpost();
    if (result?.built) {
      this.planetProgress = this.planetSurface.progress;
      this.updateCreditsHud();
      this.savePilotRecord();
    }
  }

  charterPlanetaryCity() {
    if (!this.planetSurface?.active) return;
    const state = this.planetSurface.getStatus();
    if (state.city) return this.updatePlanetSurfacePanel('charter', { error: 'Your planetary city charter is already active here.' });
    if (this.credits < 250_000) return this.updatePlanetSurfacePanel('charter', { error: 'A planetary city charter costs 250,000 CR.' });
    this.credits -= 250_000;
    this.planetSurface.charterCity(this.pilotLife.name);
    this.pilotLife.assets = appendUniqueAssets(this.pilotLife.assets, `Planetary city · ${state.planet}`);
    this.planetProgress = this.planetSurface.progress;
    this.renderPilotLife();
    this.updateCreditsHud();
    this.savePilotRecord();
  }

  acquirePlanetarySovereignty() {
    if (!this.planetSurface?.active) return;
    const state = this.planetSurface.getStatus();
    if (state.planetOwned) return this.updatePlanetSurfacePanel('sovereignty', { error: `${state.planet} is already owned by ${state.planetOwner}.` });
    if (this.credits < 85_000_000) return this.updatePlanetSurfacePanel('sovereignty', { error: 'A planetary sovereignty deed costs 85,000,000 CR.' });
    const result = this.planetSurface.acquireSovereignty(this.pilotLife.name);
    if (result?.error) return this.updatePlanetSurfacePanel('sovereignty', result);
    this.credits -= 85_000_000;
    this.pilotLife.assets = appendUniqueAssets(this.pilotLife.assets, `Planetary sovereignty · ${state.planet}`, `Planetary city · ${state.planet}`);
    this.renderPilotLife();
    this.planetProgress = this.planetSurface.progress;
    this.updateCreditsHud();
    this.savePilotRecord();
  }

  takeoffFromPlanet() {
    if (!this.planetSurface?.active) return;
    const planet = this.planetSurface.planet;
    this.planetSurface.takeoff();
    document.body.classList.remove('is-planet-surface');
    const landingButton = document.getElementById('planet-land-button');
    if (landingButton) {
      landingButton.disabled = false;
      landingButton.textContent = '🪐 Autopilot travel & land on nearest planet';
    }
    this.playDescentTransition('takeoff', 'Ascending through atmosphere · returning to orbit');
    if (this.ships[0]) {
      const isCockpit = this.cameraDirector?.mode === 'cockpit';
      this.ships[0].mesh.visible = !isCockpit;
      if (this.cockpitView) this.cockpitView.group.visible = isCockpit;
      document.body.classList.toggle('is-cockpit-view', isCockpit);
      if (planet) {
        const outward = this.ships[0].pos.clone().sub(planet.mesh.position).normalize();
        this.ships[0].pos.copy(planet.mesh.position).addScaledVector(outward, planet.radius + 95);
        this.ships[0].vel.copy(outward.multiplyScalar(85));
        this.ships[0].mesh.position.copy(this.ships[0].pos);
      }
    }
    this.keys = {};
    this.updatePilotLifeControls();
    this.savePilotRecord();
  }

  playDescentTransition(kind, message = 'Atmospheric entry · deploying expedition rover') {
    const overlay = document.getElementById('surface-descent-overlay');
    if (!overlay) return;
    overlay.textContent = message;
    overlay.classList.remove('descent', 'takeoff');
    void overlay.offsetWidth;
    overlay.classList.add(kind);
    window.setTimeout(() => overlay.classList.remove(kind), 1700);
  }

  handleVisibilityChange = () => {
    if (document.hidden) {
      this.stop();
      this.soundSystem?.updateEngineHum?.(0, false, false);
      try { this.onAutoPause?.(true); } catch {}
    } else if (!this.manuallyPaused) {
      this.start();
      try { this.onAutoPause?.(false); } catch {}
    }
  };

  initEntities() {
    this.ships = [];
    this.aliens = [];
    this.projectiles = [];

    const friendlyGreenProfiles = [
      { colorHex: 0x10b981, color: '#10b981', size: 8, maxSpeed: 230 },
      { colorHex: 0x22c55e, color: '#22c55e', size: 8, maxSpeed: 220 },
      { colorHex: 0x059669, color: '#059669', size: 8, maxSpeed: 210 },
      { colorHex: 0x34d399, color: '#34d399', size: 8, maxSpeed: 240 },
      { colorHex: 0x16a34a, color: '#16a34a', size: 8, maxSpeed: 215 },
      { colorHex: 0x4ade80, color: '#4ade80', size: 8, maxSpeed: 225 }
    ];

    const playerStartPos = new THREE.Vector3(760, 12, 340);
    const playerStartVel = new THREE.Vector3(-120, 0, 100);
    const stats = this.getActiveShipStats();
    const livery = getLivery(this.liveryId);

    for (let i = 0; i < this.config.maxShips; i++) {
      const profile = friendlyGreenProfiles[i % friendlyGreenProfiles.length];
      const isLead = i === 0;
      const shipMesh = isLead
        ? ShipBuilder.buildPlayerShip(this.shipClass, livery)
        : ShipBuilder.buildShip('human', 0.1 + i * 0.45);

      shipMesh.scale.setScalar(isLead ? stats.scale : 1.75);
      this.scene.add(shipMesh);

      let pos, vel;
      if (isLead) {
        pos = playerStartPos.clone();
        vel = playerStartVel.clone();
        const lookMat = new THREE.Matrix4().lookAt(pos, pos.clone().add(vel), new THREE.Vector3(0, 1, 0));
        shipMesh.quaternion.setFromRotationMatrix(lookMat);
      } else {
        const wingSide = (i % 2 === 0 ? 1 : -1) * (18 + Math.floor(i / 2) * 16);
        const wingRear = -12 - Math.floor(i / 2) * 18;
        const wingY = (i % 3 - 1) * 8;
        pos = playerStartPos.clone().add(new THREE.Vector3(wingSide, wingY, wingRear));
        vel = playerStartVel.clone().add(new THREE.Vector3((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20));
      }
      shipMesh.position.copy(pos);

      this.ships.push({
        id: `ship_${i}`,
        mesh: shipMesh,
        pos: shipMesh.position,
        vel,
        color: profile.color,
        colorHex: isLead ? livery.accentHex : profile.colorHex,
        size: isLead ? stats.hitRadius : 10,
        maxSpeed: isLead ? stats.maxSpeed : profile.maxSpeed,
        agility: isLead ? stats.agility : 1.0,
        maxBoostEnergy: isLead ? stats.maxBoostEnergy : 100,
        hull: isLead ? stats.maxHull : 120,
        maxHull: isLead ? stats.maxHull : 120,
        shield: isLead ? stats.maxShield : 100,
        maxShield: isLead ? stats.maxShield : 100,
        shieldHitFlash: 0,
        boostTimer: 0,
        boostActive: false,
        shootCooldown: isLead ? 0 : Math.random() * 0.8,
        bankSeed: i * 2.1
      });
    }

    for (let i = 0; i < 11; i++) {
      this.spawnAlienShip(true);
    }
  }

  ensureBossSpawned() {
    if (this.aliens.some(a => a.isBoss)) return;
    this.spawnAlienShip(false, 'boss');
  }

  spawnAlienShip(initialSkirmish = false, archetypeOverride = null) {
    const lead = this.ships[0];
    if (!lead || !this.scene) return;
    const alienReddishColors = [0xef4444, 0xf43f5e, 0xe11d48, 0xff2a4f, 0xdc2626, 0xf97316, 0xb91c1c, 0xff385c];
    const colorHex = alienReddishColors[this.aliens.length % alienReddishColors.length];
    const spec = this.contracts ? this.contracts.getEnemySpec(archetypeOverride) : {
      archetype: 'interceptor',
      name: 'Alien Interceptor',
      maxHealth: 120,
      maxSpeed: 175,
      size: 9.5,
      bounty: 250,
      damage: 20,
      fireInterval: 1.9,
      isBoss: false
    };

    const alienMesh = spec.isBoss
      ? ShipBuilder.buildBossShip()
      : ShipBuilder.buildShip('alien', Math.random());
    if (!spec.isBoss) {
      const s = spec.archetype === 'scout' ? 0.95 : (spec.archetype === 'gunship' ? 1.35 : (spec.archetype === 'raider' ? 1.5 : 1.15));
      alienMesh.scale.setScalar(s);
      addAlienAccents(alienMesh, colorHex);
    }
    this.scene.add(alienMesh);

    const newAlien = {
      id: `alien_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      mesh: alienMesh,
      pos: alienMesh.position,
      vel: new THREE.Vector3(),
      colorHex: spec.isBoss ? 0xff2a4f : colorHex,
      color: `#${colorHex.toString(16).padStart(6, '0')}`,
      size: spec.size,
      maxSpeed: spec.maxSpeed,
      health: spec.maxHealth,
      maxHealth: spec.maxHealth,
      bounty: spec.bounty,
      damage: spec.damage,
      fireInterval: spec.fireInterval,
      archetype: spec.archetype,
      name: spec.name,
      isBoss: spec.isBoss,
      ionStunTimer: 0,
      shootCooldown: 0.4 + Math.random() * 1.2
    };

    if (initialSkirmish) {
      const idx = this.aliens.length;
      const theta = (idx / 11) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const combatDist = 90 + Math.random() * 115;
      const spawnPos = lead.pos.clone().add(new THREE.Vector3(combatDist * Math.cos(theta), (Math.random() - 0.5) * 45, combatDist * Math.sin(theta)));
      newAlien.pos.copy(spawnPos);
      const toPlayer = lead.pos.clone().sub(spawnPos).normalize();
      const crossCombat = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).multiplyScalar((idx % 2 === 0 ? 1 : -1) * 0.6);
      newAlien.vel.copy(toPlayer.add(crossCombat).normalize().multiplyScalar(spec.maxSpeed * 0.8));
    } else {
      this.stageEncounterShip(newAlien, lead);
    }

    this.aliens.push(newAlien);
    if (spec.isBoss) {
      this.tacticalHud?.showToast('⚠️ VOID DREADNOUGHT DETECTED IN SECTOR!', 3.6);
      this.soundSystem?.playWarpBoom?.();
    }
    return newAlien;
  }

  fireLaser(ship, target = null) {
    if (!ship || this.dockedStation || this.planetSurface?.active) return;

    const isLeadShip = ship === this.ships[0];
    const stats = this.getActiveShipStats();
    const wpn = isLeadShip ? getWeaponDef(this.weaponId) : null;

    if (isLeadShip) {
      if (this.weaponOverheated) return;
      if (ship.shootCooldown > 0.04) return;
      ship.shootCooldown = wpn.cooldown;
      this.weaponHeat = Math.min(100, this.weaponHeat + wpn.heat);
      if (this.weaponHeat >= 100) {
        this.weaponOverheated = true;
        this.tacticalHud?.showToast('⚠️ Weapons Overheated — Cooling Down!');
      }
      if (this.tutorialSystem) {
        this.tutorialSystem.lasersFired = (this.tutorialSystem.lasersFired || 0) + 1;
      }
    }

    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.mesh.quaternion).normalize();
    if (target) {
      const projSpeed = wpn ? wpn.speed : 850;
      const leadTime = Math.min(0.55, ship.pos.distanceTo(target.pos) / projSpeed);
      dir.copy(target.pos).addScaledVector(target.vel || new THREE.Vector3(), leadTime).sub(ship.pos).normalize();
    }

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(ship.mesh.quaternion).normalize();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.mesh.quaternion).normalize();

    let muzzlePositions = [];
    if (isLeadShip && this.cameraDirector?.mode === 'cockpit' && this.cockpitView) {
      this.cockpitView.triggerLaserFire();
      const muzzles = this.cockpitView.getMuzzleWorldPositions();
      if (muzzles) {
        muzzlePositions = [muzzles.leftWorld, muzzles.rightWorld];
      }
      if (target) {
        const toTarget = target.pos.clone().sub(ship.pos).normalize();
        if (forward.dot(toTarget) > 0.75) dir.copy(forward).lerp(toTarget, 0.35).normalize();
        else dir.copy(forward);
      } else {
        this.camera.getWorldDirection(dir);
      }
    } else if (ship.mesh?.userData?.wingCannonHardpoints?.length) {
      ship.mesh.updateWorldMatrix(true, false);
      muzzlePositions = ship.mesh.userData.wingCannonHardpoints.map(hp => ship.mesh.localToWorld(new THREE.Vector3(...hp)));
    } else if (ship.mesh?.userData?.barrelPitch) {
      const pitch = ship.mesh.userData.barrelPitch;
      pitch.updateWorldMatrix(true, false);
      muzzlePositions = [
        pitch.localToWorld(new THREE.Vector3(-0.65, 0, -4.8)),
        pitch.localToWorld(new THREE.Vector3(0.65, 0, -4.8))
      ];
      dir.set(0, 0, -1).applyQuaternion(pitch.getWorldQuaternion(new THREE.Quaternion())).normalize();
    } else {
      muzzlePositions = [
        ship.pos.clone().addScaledVector(right, -ship.size * 0.45).addScaledVector(forward, 2.0),
        ship.pos.clone().addScaledVector(right, ship.size * 0.45).addScaledVector(forward, 2.0)
      ];
    }

    const isHero = !!ship.mesh.userData.hero;
    const isHuman = isHero || ship.id.startsWith('ship');
    const boltColor = isHero && wpn ? wpn.color : ship.colorHex;

    if (!this._laserGeomHero) this._laserGeomHero = new THREE.BoxGeometry(0.45, 0.45, 7.8);
    if (!this._laserGeomStd) this._laserGeomStd = new THREE.BoxGeometry(0.35, 0.35, 5);
    const laserGeom = isHero ? this._laserGeomHero : this._laserGeomStd;

    let laserMat = this._laserMats.get(boltColor);
    if (!laserMat) {
      laserMat = new THREE.MeshBasicMaterial({
        color: boltColor,
        blending: THREE.AdditiveBlending
      });
      this._laserMats.set(boltColor, laserMat);
    }

    // Divide per-bolt damage gently when mounting 4 or 6 cannons so ships still scale cleanly without one-shotting
    const cannonDivisor = muzzlePositions.length > 2 ? (muzzlePositions.length * 0.6) : 1;
    const baseDmg = isHero && wpn
      ? (wpn.damage * stats.weaponDamageMult) / cannonDivisor
      : (isHuman ? 30 * stats.fleetDmgBonus : (ship.damage || 20));

    for (const startPos of muzzlePositions) {
      const mesh = new THREE.Mesh(laserGeom, laserMat);
      mesh.position.copy(startPos);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
      this.scene.add(mesh);

      this.projectiles.push({
        mesh,
        dir: dir.clone(),
        speed: isHero && wpn ? wpn.speed : (isHuman ? 900 : 780),
        life: 2.3,
        faction: isHuman ? 'human' : 'alien',
        isPlayerShot: isLeadShip,
        damage: baseDmg,
        shieldMult: wpn ? wpn.shieldMult : 1.0,
        asteroidMult: wpn ? wpn.asteroidMult : 1.0,
        ionStun: isLeadShip && wpn ? wpn.ionStun : 0
      });
    }

    if (isLeadShip && this.weaponId === 'ion') this.soundSystem?.playIonBlast?.();
    else this.soundSystem?.playLaser?.();
  }

  launchUndersideMissile(heroShip, hardpointIdx = 0, target = null) {
    if (!heroShip?.mesh) return;
    heroShip.mesh.updateWorldMatrix(true, false);

    const hardpoints = heroShip.mesh.userData.missileHardpoints || [
      [-1.35, -0.65, -0.8],
      [1.35, -0.65, -0.8],
      [-1.35, -0.65, 1.2],
      [1.35, -0.65, 1.2]
    ];
    const offset = hardpoints[hardpointIdx % hardpoints.length];
    const spawnWorldPos = heroShip.mesh.localToWorld(new THREE.Vector3(...offset));
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(heroShip.mesh.quaternion).normalize();
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(heroShip.mesh.quaternion).normalize();
    const initialDir = forward.clone().addScaledVector(down, 0.22).normalize();

    const missileGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.8 });
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.8, 8), bodyMat);
    body.rotation.x = Math.PI / 2;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 8), tipMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -1.8;
    missileGroup.add(body, nose);

    missileGroup.position.copy(spawnWorldPos);
    missileGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), initialDir);
    this.scene.add(missileGroup);

    const missileTarget = target || this.lockedTarget || this.aliens.reduce((best, al) =>
      !best || al.pos.distanceToSquared(heroShip.pos) < best.pos.distanceToSquared(heroShip.pos) ? al : best, null);

    const stats = this.getActiveShipStats();
    this.projectiles.push({
      mesh: missileGroup,
      dir: initialDir,
      speed: 480,
      life: 4.0,
      faction: 'human',
      isPlayerShot: true,
      damage: stats.missileDamage,
      shieldMult: 1.0,
      asteroidMult: 1.5,
      ionStun: 0,
      isMissile: true,
      homing: missileTarget,
      turnRate: 4.2,
      smokeTimer: 0
    });

    this.soundSystem?.playMissileLaunch?.();
    this.fx?.spawnMissileLaunchFlash(spawnWorldPos);
    this.fx?.spawnMissileThrustParticle(spawnWorldPos, down);
  }

  aimHeroTurret(heroShip, target, dt) {
    if (!heroShip?.mesh?.userData?.turret) return;
    const { turret, barrelPitch } = heroShip.mesh.userData;
    let targetYaw = 0;
    let targetPitch = 0;

    if (Math.hypot(this.touch.turretYaw, this.touch.turretPitch) > 0.02) {
      targetYaw = this.touch.turretYaw;
      targetPitch = this.touch.turretPitch;
    } else if (target) {
      heroShip.mesh.updateWorldMatrix(true, false);
      const toTargetWorld = target.pos.clone().sub(heroShip.pos);
      const invQuat = heroShip.mesh.quaternion.clone().invert();
      const local = toTargetWorld.applyQuaternion(invQuat);
      targetYaw = Math.atan2(-local.x, -local.z);
      const horiz = Math.hypot(local.x, local.z);
      targetPitch = Math.atan2(local.y, horiz);
    }

    const yaw = THREE.MathUtils.clamp(targetYaw, -Math.PI * 0.75, Math.PI * 0.75);
    const pitch = THREE.MathUtils.clamp(targetPitch, -0.35, 0.65);
    turret.rotation.y += (yaw - turret.rotation.y) * Math.min(1, dt * 8);
    barrelPitch.rotation.x += (-pitch - barrelPitch.rotation.x) * Math.min(1, dt * 8);
  }

  beamHitsSphere(start, end, center, radius) {
    return this.beamImpactPoint(start, end, center).distanceToSquared(center) < radius * radius;
  }

  beamImpactPoint(start, end, center, radius = 0) {
    const travel = end.clone().sub(start);
    if (radius > 0 && travel.lengthSq() > 0.0001) {
      const offset = start.clone().sub(center);
      const a = travel.lengthSq();
      const b = offset.dot(travel);
      const discriminant = b * b - a * (offset.lengthSq() - radius * radius);
      if (discriminant >= 0) {
        const entry = (-b - Math.sqrt(discriminant)) / a;
        if (entry >= 0 && entry <= 1) return start.clone().addScaledVector(travel, entry);
      }
    }
    const along = center.clone().sub(start).dot(travel) / Math.max(travel.lengthSq(), 0.0001);
    return start.clone().addScaledVector(travel, THREE.MathUtils.clamp(along, 0, 1));
  }

  stageEncounterShip(ship, lead) {
    const forward = this.cameraDirector.cameraForward.clone().setY(0).normalize();
    const side = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const bodies = this.flightDynamics.getFlightObstacles(ship);
    let candidate = null;

    const camDir = new THREE.Vector3();
    if (this.camera) this.camera.getWorldDirection(camDir);
    else camDir.copy(forward);

    const nearby = this.environment.planets.filter(p => p.mesh.position.distanceTo(lead.pos) < 850);
    if (nearby.length && Math.random() < 0.3) {
      const planet = nearby[Math.floor(Math.random() * nearby.length)];
      const behind = planet.mesh.position.clone().sub(this.camera ? this.camera.position : lead.pos).normalize();
      candidate = planet.mesh.position.clone().addScaledVector(behind, planet.radius + 120);
    }

    for (let attempt = 0; attempt < 32; attempt++) {
      if (!candidate) {
        const distance = 160 + Math.random() * 120;
        const flank = (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.5);
        const along = -(0.6 + Math.random() * 0.8) * distance;
        candidate = lead.pos.clone().addScaledVector(side, flank * distance).addScaledVector(forward, along);
        candidate.y += (Math.random() - 0.5) * 35;
      }

      if (this.camera) {
        const toCandidate = candidate.clone().sub(this.camera.position).normalize();
        if (toCandidate.dot(camDir) > 0.1) {
          candidate = null;
          continue;
        }
      }

      const solarRadius = Math.hypot(candidate.x, candidate.z);
      if (
        solarRadius > ONE_AU + 80 &&
        solarRadius < SYSTEM_EDGE - 120 &&
        bodies.every(body => candidate.distanceTo(body.center) > body.radius + 45)
      ) break;
      candidate = null;
    }

    if (!candidate) {
      candidate = lead.pos.clone().addScaledVector(forward, -170).addScaledVector(side, 95);
    }
    ship.pos.copy(candidate);
    const approach = lead.pos.clone().sub(candidate).normalize();
    ship.vel.copy(approach).multiplyScalar(ship.maxSpeed * 0.65);
  }

  spawnFriendlyShip() {
    const lead = this.ships[0];
    if (!lead || !this.scene) return;
    const friendlyGreenProfiles = [
      { colorHex: 0x10b981, color: '#10b981', size: 8, maxSpeed: 230 },
      { colorHex: 0x22c55e, color: '#22c55e', size: 8, maxSpeed: 220 },
      { colorHex: 0x059669, color: '#059669', size: 8, maxSpeed: 210 },
      { colorHex: 0x34d399, color: '#34d399', size: 8, maxSpeed: 240 }
    ];
    const profile = friendlyGreenProfiles[this.ships.length % friendlyGreenProfiles.length];
    const shipMesh = ShipBuilder.buildShip('human', Math.random());
    shipMesh.scale.setScalar(1.75);
    this.scene.add(shipMesh);

    const newShip = {
      id: `ship_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      mesh: shipMesh,
      pos: shipMesh.position,
      vel: new THREE.Vector3(),
      color: profile.color,
      colorHex: profile.colorHex,
      size: 10,
      maxSpeed: profile.maxSpeed,
      hull: 120,
      maxHull: 120,
      shield: 100,
      maxShield: 100,
      shieldHitFlash: 0,
      boostTimer: 0,
      boostActive: false,
      shootCooldown: 0.5 + Math.random() * 0.8,
      bankSeed: Math.random() * 10
    };
    this.stageEncounterShip(newShip, lead);
    this.ships.push(newShip);
  }

  stageEncounters(force = false) {
    const lead = this.ships[0];
    if (!lead || !this.camera) return;
    for (const ship of [...this.ships.slice(1), ...this.aliens]) {
      const limit = ship.isBoss ? 680 : 340;
      if (force || ship.pos.distanceToSquared(lead.pos) > limit * limit) {
        this.stageEncounterShip(ship, lead);
      }
    }
  }

  handlePlayerDestroyed() {
    if (this.tacticalHud?.towModal?.classList.contains('open')) return;
    const lead = this.ships[0];
    if (!lead) return;
    this.fx?.spawnShipDeath?.(lead.pos, lead.colorHex, lead.size, false);
    this.soundSystem?.playExplosion?.();
    this.cameraDirector?.addShake?.(2.0);
    this.keys = {};
    this.pointerFireHeld = false;

    if (this.pilotLife.ironman) {
      const surveyed = Object.values(this.planetProgress || {}).filter(p => p?.completed).length;
      this.tacticalHud?.showTowModal({
        ironman: true,
        kills: this.contracts?.totalKills || 0,
        worlds: surveyed
      });
      return;
    }

    const nearestStation = this.environment?.stations?.reduce((best, st) =>
      !best || st.mesh.position.distanceToSquared(lead.pos) < best.mesh.position.distanceToSquared(lead.pos) ? st : best, null);

    const fee = this.credits >= 500 ? Math.round(this.credits * 0.05) : 0;
    this.credits = Math.max(0, this.credits - fee);

    const stats = this.getActiveShipStats();
    lead.hull = Math.round(stats.maxHull * 0.65);
    lead.shield = stats.maxShield;
    this.weaponHeat = 0;
    this.weaponOverheated = false;

    if (nearestStation) {
      lead.pos.copy(nearestStation.mesh.position).add(new THREE.Vector3(75, 16, 45));
      lead.mesh.position.copy(lead.pos);
      lead.vel.set(0, 0, -40);
      this.ships.slice(1).forEach((s, idx) => {
        s.pos.copy(lead.pos).add(new THREE.Vector3((idx - 3) * 16, 6, 30));
        s.mesh.position.copy(s.pos);
      });
    }

    this.updateCreditsHud();
    this.savePilotRecord();
    this.tacticalHud?.showTowModal({
      ironman: false,
      station: nearestStation,
      stationName: nearestStation?.name || 'Starfleet Outpost Alpha',
      fee
    });
  }

  start() {
    if (!this.state.initialized || this.state.running) return;
    this.state.running = true;
    this.manuallyPaused = false;
    this.performance.lastTime = performance.now();
    this.animate();
  }

  stop() {
    this.state.running = false;
    this.clearFlightKeys();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.soundSystem?.updateEngineHum?.(0, false, false);
  }

  destroy() {
    this.stop();
    this.tutorialSystem?.destroy();
    this.tutorialSystem = null;
    this.contracts?.destroy();
    this.contracts = null;
    this.tacticalHud?.destroy();
    this.tacticalHud = null;

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.clearFlightKeys);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    const canvas = document.getElementById('starfield');
    canvas?.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    canvas?.removeEventListener('contextmenu', this.preventContextMenu);
    window.removeEventListener('pointerup', this.handleWindowPointerUp);
    window.removeEventListener('pointermove', this.handleWindowPointerMove);
    window.removeEventListener('wheel', this.handleWheelThrottle);

    document.getElementById('planet-land-button')?.remove();
    document.getElementById('planet-surface-panel')?.remove();
    document.getElementById('starship-life-panel')?.remove();
    document.getElementById('surface-descent-overlay')?.remove();
    document.getElementById('planet-surface-style')?.remove();
    document.body.classList.remove('is-planet-surface', 'is-cockpit-view');

    this.cockpitView?.destroy();
    this.cockpitView = null;
    this.fx?.destroy();
    this.environment?.destroy();
    if (this.planetSurface?.group) {
      this.planetSurface.disposeGroup();
      this.scene.remove(this.planetSurface.group);
    }

    this.scene?.traverse(object => {
      object.geometry?.dispose?.();
      const materials = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
      materials.forEach(material => {
        for (const value of Object.values(material)) {
          if (value?.isTexture) value.dispose();
        }
        material.dispose?.();
      });
    });

    this.ships.forEach(s => this.scene?.remove(s.mesh));
    this.aliens.forEach(al => this.scene?.remove(al.mesh));
    this.projectiles.forEach(p => this.scene?.remove(p.mesh));

    this._laserGeomHero?.dispose?.();
    this._laserGeomHero = null;
    this._laserGeomStd?.dispose?.();
    this._laserGeomStd = null;
    this._laserMats.forEach(mat => mat.dispose?.());
    this._laserMats.clear();

    this.cosmicBackdrop?.dispose();
    this.cosmicBackdrop = null;
    this.renderer?.dispose();
    this.renderer = null;
    this.soundSystem?.destroy();
    this.ships = [];
    this.aliens = [];
    this.projectiles = [];
    this.state.initialized = false;
  }

  getSystem(name) {
    if (name.toLowerCase() === 'audiosystem') return this.soundSystem;
    return this.systems.get(name);
  }

  getStatus() {
    return {
      initialized: this.state.initialized,
      running: this.state.running,
      fps: this.performance.fps,
      shipsCount: this.ships.length,
      aliensCount: this.aliens.length,
      shipClass: this.shipClass,
      manualFlight: Boolean(this.flightDynamics?.manualFlight)
    };
  }

  savePilotRecord() {
    try {
      window.localStorage.setItem(PILOT_PROFILE_KEY, JSON.stringify({
        credits: Math.floor(this.credits),
        planetProgress: this.planetSurface?.progress || this.planetProgress,
        life: this.pilotLife,
        shipClass: this.shipClass,
        ownedShips: this.ownedShips,
        upgrades: this.upgrades,
        liveryId: this.liveryId,
        ownedLiveries: this.ownedLiveries,
        weaponId: this.weaponId,
        oreCargo: this.oreCargo,
        updatedAt: Date.now()
      }));
    } catch {}
  }

  animate = () => {
    if (!this.state.running) return;

    const now = performance.now();
    const rawDt = (now - this.performance.lastTime) / 1000;
    this.performance.lastTime = now;
    if (this.tacticalHud?.starMapModal?.classList.contains('open') ||
        this.tacticalHud?.towModal?.classList.contains('open') ||
        this.tutorialSystem?.academyModal?.classList.contains('open') ||
        this.tutorialSystem?.victoryModal?.classList.contains('open')) {
      this.soundSystem?.updateEngineHum?.(0, false, false);
      this.animationFrameId = requestAnimationFrame(this.animate);
      return;
    }
    const dt = Math.min(rawDt, 0.1) * this.timeScale;
    this.elapsed += dt;

    this.performance.frameCount++;
    if (this.performance.frameCount % 30 === 0) {
      this.performance.fps = Math.round(1 / (rawDt || 0.016));
    }

    this.creditsTimer += dt;
    this.profileSaveTimer += dt;
    if (this.profileSaveTimer >= 10) {
      this.profileSaveTimer = 0;
      this.savePilotRecord();
    }
    if (this.creditsTimer >= 1.0 && !this.dockedStation) {
      const planetIncome = Object.values(this.planetSurface?.progress || this.planetProgress || {}).reduce((income, entry) =>
        income + (entry?.outpost ? 5 : 0) + (entry?.city ? 35 : 0) + (entry?.planetOwner ? 500 : 0), 0);
      const luxuryIncome = STARSHIP_LUXURY_ASSETS.reduce((income, asset) =>
        income + (this.pilotLife?.assets?.includes(asset.title) ? asset.income : 0), 0);
      const shipIncome = this.getActiveShipStats().passiveIncome || 0;
      this.credits += 1 + planetIncome + luxuryIncome + shipIncome;
      this.creditsTimer = 0;
      this.updateCreditsHud();
      this.renderStarshipLuxuryMarket();
    }

    if (this.planetSurface?.active) {
      this.planetSurface.update(Math.min(rawDt, 0.1), this.keys, this.touch);
      if (this.performance.frameCount % 6 === 0) this.updatePlanetSurfacePanel();
    } else if (this.planetaryLanding) {
      this.advancePlanetaryDescent(dt);
    } else if (this.stationApproach) {
      this.advanceStationDocking(dt);
    } else if (!this.dockedStation) {
      this.updateSimulation(dt);
    }

    if (this.tutorialSystem) {
      this.tutorialSystem.update(dt);
    }
    if (this.tacticalHud && !this.dockedStation && !this.isEmbedMode()) {
      this.tacticalHud.update(Math.min(rawDt, 0.1));
    }

    if (this.cosmicBackdrop) this.cosmicBackdrop.update(this.elapsed);
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  updateSimulation(dt) {
    this.environment.update(dt);

    const leadShip = this.ships[0];
    const stats = this.getActiveShipStats();
    const cameraFwd = this.cameraDirector.cameraForward;
    const isManual = Boolean(this.flightDynamics?.manualFlight);

    // Weapon heat dissipation, missile reload & flare timers
    this.weaponHeat = Math.max(0, this.weaponHeat - stats.heatDissipation * dt);
    if (this.weaponOverheated && this.weaponHeat < 25) {
      this.weaponOverheated = false;
    }

    if (this.missileAmmo < stats.missileMax) {
      this.missileReloadTimer += dt;
      if (this.missileReloadTimer >= stats.missileReloadTime) {
        this.missileReloadTimer = 0;
        this.missileAmmo += 1;
      }
    } else {
      this.missileReloadTimer = 0;
    }

    this.flareCooldown = Math.max(0, this.flareCooldown - dt);
    this.flareActiveTimer = Math.max(0, this.flareActiveTimer - dt);

    // Continuous manual fire when holding Spacebar, Left-Click, or touch FIRE
    if (leadShip && (this.keys[' '] || this.pointerFireHeld || this.touch.fire)) {
      this.fireLaser(leadShip);
    }

    // Engine hum audio
    if (leadShip && !this.isEmbedMode()) {
      this.soundSystem?.updateEngineHum?.(this.flightDynamics.throttle, Boolean(leadShip.boostActive), true);
    }

    // Smart prompt label for Land / Dock button
    if (leadShip && this.performance.frameCount % 15 === 0) {
      const landBtn = document.getElementById('planet-land-button');
      if (landBtn && !landBtn.disabled) {
        const target = this.getLandingDestination(leadShip.pos);
        if (target) landBtn.textContent = this.environment.stations.includes(target)
          ? `🛰️ Dock at ${target.name} · L`
          : `🪐 Approach & land on ${target.landingLabel || target.name} · L`;
      }
    }

    // 2. Lead Ship & Friendly Fleet Update
    this.ships.forEach((ship, idx) => {
      const maxSh = ship.maxShield || 100;
      const regenRate = idx === 0 ? stats.shieldRegen : 2.5;
      ship.shield = Math.min(maxSh, ship.shield + dt * regenRate);

      if (ship.mesh.userData.hero) {
        const { shield, shieldGrid } = ship.mesh.userData;
        if (ship.shieldHitFlash > 0) {
          ship.shieldHitFlash = Math.max(0, ship.shieldHitFlash - dt * 2.2);
        }
        const flash = ship.shieldHitFlash || 0;
        shield.material.opacity = (0.006 + Math.sin(this.elapsed * 1.8) * 0.002) + flash * 0.055;
        shieldGrid.material.opacity = 0.008 + flash * 0.08;
        shield.material.color.setHex(ship.shield > 0 ? 0x5ffaff : 0xffa36a);
        shieldGrid.material.color.copy(shield.material.color);

        const turretTarget = (this.lockedTarget && this.aliens.includes(this.lockedTarget) &&
          ship.pos.distanceToSquared(this.lockedTarget.pos) < 360000)
          ? this.lockedTarget
          : this.aliens.reduce((best, alien) =>
              !best || ship.pos.distanceToSquared(alien.pos) < ship.pos.distanceToSquared(best.pos) ? alien : best, null);
        this.aimHeroTurret(ship, turretTarget && ship.pos.distanceToSquared(turretTarget.pos) < 360000 ? turretTarget : null, dt);
      }

      if (idx === 0) {
        const isCockpit = this.cameraDirector?.mode === 'cockpit';
        this.flightDynamics.updateLeadShip(ship, dt, this.elapsed, this.keys, this.touch, cameraFwd, this.aliens, isCockpit);
      } else {
        this.flightDynamics.updateWingmanShip(ship, idx, leadShip, this.ships, this.aliens, dt, this.elapsed, cameraFwd, this.lockedTarget);
      }

      if (idx > 0) {
        ship.boostTimer -= dt;
        if (ship.boostTimer <= 0) {
          ship.boostActive = !ship.boostActive;
          ship.boostTimer = ship.boostActive ? 1.5 + Math.random() * 2 : 4 + Math.random() * 5;
        }
      }

      if (Math.random() < Math.min(1, dt * 26)) {
        ship.mesh.updateWorldMatrix(true, false);
        const rear = new THREE.Vector3(0, 0, 1).applyQuaternion(ship.mesh.quaternion).normalize();
        if (ship.mesh.userData.enginePositions?.length) {
          for (const mount of ship.mesh.userData.enginePositions) {
            const origin = ship.mesh.localToWorld(new THREE.Vector3(...mount));
            this.fx.spawnThrustParticle(origin, rear, ship.colorHex, ship.mesh.userData.hero);
          }
        } else {
          const defaultNozzle = ship.mesh.localToWorld(new THREE.Vector3(0, 0, 1.4));
          this.fx.spawnThrustParticle(defaultNozzle, rear, ship.colorHex, false);
        }
      }

      ship.shootCooldown -= dt;
      if (idx === 0) {
        // Automatic missile volley ONLY runs when autoFire is enabled (spectacle/autopilot demo)
        if (this.autoFire) {
          this.missileVolleyTimer -= dt;
          if (this.missileVolleyTimer <= 0 && this.missileAmmo > 0) {
            const missileCount = Math.min(this.missileAmmo, 1 + Math.floor(Math.random() * 3));
            this.missileAmmo -= missileCount;
            for (let m = 0; m < missileCount; m++) {
              this.missileQueue.push({ delay: m * 0.2, hardpointIdx: m });
            }
            this.missileVolleyTimer = 4.0 + Math.random() * 2.5;
          }
        }

        if (this.missileQueue.length > 0) {
          const remainingQueue = [];
          for (const item of this.missileQueue) {
            item.delay -= dt;
            if (item.delay <= 0) {
              this.launchUndersideMissile(ship, item.hardpointIdx, item.target);
            } else {
              remainingQueue.push(item);
            }
          }
          this.missileQueue = remainingQueue;
        }

        this.touch.missileCooldown = Math.max(0, this.touch.missileCooldown - dt);
        if (this.lockedTarget && !this.aliens.includes(this.lockedTarget)) this.lockedTarget = null;
        if (this.touch.lockedTarget && !this.aliens.includes(this.touch.lockedTarget)) this.touch.lockedTarget = null;
      }

      // Wingmen always defend; Lead ship auto-fires only if autoFire is enabled
      if (ship.shootCooldown <= 0 && (idx > 0 || this.autoFire)) {
        const targetAlien = (idx === 0 && (this.lockedTarget || this.touch.lockedTarget)) || this.aliens.reduce((nearest, alien) =>
          !nearest || ship.pos.distanceToSquared(alien.pos) < ship.pos.distanceToSquared(nearest.pos) ? alien : nearest, null);
        if (targetAlien && ship.pos.distanceToSquared(targetAlien.pos) < 360000) {
          this.fireLaser(ship, targetAlien);
          ship.shootCooldown = idx === 0 ? getWeaponDef(this.weaponId).cooldown * 1.4 : (0.9 + Math.random() * 0.6);
        }
      }
    });

    // 3. Update Alien Fleet AI
    let activeShootersToPlayer = 0;
    this.aliens.forEach((al, aIdx) => {
      this.flightDynamics.updateAlienShip(al, aIdx, leadShip, dt, this.elapsed, cameraFwd);

      if (Math.random() < Math.min(1, dt * 22)) {
        al.mesh.updateWorldMatrix(true, false);
        const rear = new THREE.Vector3(0, 0, 1).applyQuaternion(al.mesh.quaternion).normalize();
        if (al.mesh.userData.enginePositions?.length) {
          for (const mount of al.mesh.userData.enginePositions) {
            const origin = al.mesh.localToWorld(new THREE.Vector3(...mount));
            this.fx.spawnThrustParticle(origin, rear, al.colorHex, false);
          }
        } else {
          const defaultNozzle = al.mesh.localToWorld(new THREE.Vector3(0, 0, 1.4));
          this.fx.spawnThrustParticle(defaultNozzle, rear, al.colorHex, false);
        }
      }

      al.shootCooldown -= dt;
      if (al.shootCooldown <= 0 && leadShip && (al.ionStunTimer || 0) <= 0) {
        const maxFireDist = al.isBoss ? 340 : 230;
        const distSqToPlayer = al.pos.distanceToSquared(leadShip.pos);
        if (distSqToPlayer < maxFireDist * maxFireDist) {
          if (activeShootersToPlayer < 2 && Math.random() < 0.55) {
            activeShootersToPlayer++;
            this.fireLaser(al, leadShip);
            al.shootCooldown = (al.fireInterval || 1.9) + Math.random() * 1.2;
          } else {
            const nearbyFriendly = this.ships.slice(1).find(f => f.pos.distanceToSquared(al.pos) < 190 * 190);
            if (nearbyFriendly) {
              this.fireLaser(al, nearbyFriendly);
              al.shootCooldown = (al.fireInterval || 1.7) + Math.random() * 1.2;
            } else {
              al.shootCooldown = 1.0 + Math.random() * 0.9;
            }
          }
        } else {
          al.shootCooldown = 1.0 + Math.random() * 0.9;
        }
      }
    });

    // 4. Update Projectiles, Combat Hits, & Asteroid Mining
    const nextProjectiles = [];
    this.projectiles.forEach(p => {
      if (p.isMissile) {
        if (p.homing && this.aliens.includes(p.homing)) {
          const toTarget = p.homing.pos.clone().sub(p.mesh.position).normalize();
          p.dir.lerp(toTarget, Math.min(1, dt * (p.turnRate || 4.0))).normalize();
          p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), p.dir);
        }
        p.smokeTimer = (p.smokeTimer || 0) + dt;
        if (p.smokeTimer >= 0.025) {
          p.smokeTimer = 0;
          this.fx.spawnMissileThrustParticle(p.mesh.position, p.dir.clone().negate());
        }
      }

      const previous = p.mesh.position.clone();
      p.mesh.position.addScaledVector(p.dir, p.speed * dt);
      p.life -= dt;

      let destroyed = p.life <= 0;

      if (!destroyed) {
        if (p.faction === 'human') {
          for (let i = this.aliens.length - 1; i >= 0; i--) {
            const al = this.aliens[i];
            if (this.beamHitsSphere(previous, p.mesh.position, al.pos, al.size * 1.35)) {
              destroyed = true;
              this.fx.spawnExplosion(p.mesh.position, al.colorHex, 16);
              const dmg = Math.round((p.damage || 32) * (al.isBoss ? (p.shieldMult || 1.0) : 1.0));
              al.health -= dmg;

              if (p.ionStun > 0 && !al.isBoss) {
                al.ionStunTimer = Math.max(al.ionStunTimer || 0, p.ionStun);
                this.fx.spawnIonRing(al.pos);
              }
              if (p.isPlayerShot) {
                this.tacticalHud?.triggerHitMarker();
                this.soundSystem?.playHitMarker?.();
                this.fx.spawnFloatingText(al.pos, `-${dmg}`, p.ionStun > 0 ? '#818cf8' : '#f87171', 26);
              }

              if (al.health <= 0) {
                this.fx.spawnShipDeath(al.pos, al.colorHex, al.size, true);
                this.soundSystem.playExplosion();
                const bounty = al.bounty || 250;
                this.credits += bounty;
                this.updateCreditsHud();
                this.fx.spawnFloatingText(al.pos, `+${bounty} CR`, '#fbbf24', 30);
                this.cockpitView?.recordShipDeath(al.pos, true);
                this.contracts?.recordEnemyKill(al);

                // Drop salvage or repair pod
                if (this.contracts && (al.isBoss || Math.random() < 0.45)) {
                  const podKind = al.isBoss ? 'salvage' : (Math.random() < 0.32 ? 'repair' : 'salvage');
                  const podVal = podKind === 'repair' ? 35 : (al.isBoss ? 1800 : 180 + Math.floor(Math.random() * 140));
                  this.contracts.spawnLootPod(al.pos, podKind, podVal);
                }

                if (al.isBoss) {
                  this.scene.remove(al.mesh);
                  this.aliens.splice(i, 1);
                  if (this.lockedTarget === al) this.lockedTarget = null;
                  this.tacticalHud?.showToast(`🏆 VOID DREADNOUGHT DESTROYED! +${bounty.toLocaleString()} CR`, 3.5);
                } else {
                  const angle = Math.random() * Math.PI * 2;
                  al.pos.set(1550 * Math.cos(angle), (Math.random() - 0.5) * 80, 1550 * Math.sin(angle));
                  al.vel.set(0, 0, 0);
                  al.ionStunTimer = 0;
                  al.health = al.maxHealth || 120;
                  this.stageEncounterShip(al, this.ships[0]);
                }
                this.savePilotRecord();
              }
              break;
            }
          }

          // Mineable asteroid hits from player shots
          if (!destroyed && p.isPlayerShot && this.environment?.asteroids) {
            for (const ast of this.environment.asteroids) {
              if (!ast.active || !ast.isMineable) continue;
              if (this.beamHitsSphere(previous, p.mesh.position, ast.mesh.position, ast.radius * 2.1)) {
                destroyed = true;
                const mineDmg = Math.round((p.damage || 24) * (p.asteroidMult || 1.0) * stats.miningMult);
                ast.hp -= mineDmg;
                this.fx.spawnExplosion(p.mesh.position, 0xfbbf24, 10);
                this.soundSystem?.playHitMarker?.();
                this.tacticalHud?.triggerHitMarker();
                if (ast.hp <= 0) {
                  ast.active = false;
                  ast.mesh.visible = false;
                  ast.respawnTimer = 45;
                  this.fx.spawnExplosion(ast.mesh.position, 0xfbbf24, 28);
                  this.soundSystem?.playExplosion?.();
                  this.contracts?.spawnLootPod(ast.mesh.position, 'ore', ast.oreValue || 4);
                }
                break;
              }
            }
          }
        } else {
          for (let i = 0; i < this.ships.length; i++) {
            const sh = this.ships[i];
            if (this.beamHitsSphere(previous, p.mesh.position, sh.pos, sh.size * 1.15)) {
              destroyed = true;
              if (i === 0 && !this.hasLaunched) break;
              if (i === 0 && this.flareActiveTimer > 0 && Math.random() < 0.75) {
                this.fx.spawnFloatingText(sh.pos, 'SPOOFED!', '#fde047', 22);
                break;
              }
              const incomingDmg = p.damage || 22;
              const absorbed = Math.min(sh.shield, incomingDmg);
              sh.shield = Math.max(0, sh.shield - absorbed);
              const overflow = incomingDmg - absorbed;
              if (overflow > 0 && sh.hull !== undefined) {
                sh.hull = Math.max(0, sh.hull - overflow);
              }

              const impactPoint = this.beamImpactPoint(previous, p.mesh.position, sh.pos, sh.size * 1.15);
              this.fx.spawnShieldImpact(sh, impactPoint);
              this.fx.spawnExplosion(impactPoint, sh.shield > 0 ? 0x69deff : 0xffb35a, 8);
              if (i === 0) {
                this.soundSystem?.playShieldDeflect?.();
                this.cameraDirector?.addShake?.(overflow > 0 ? 0.85 : 0.35);
                if (sh.hull <= 0) {
                  this.handlePlayerDestroyed();
                  break;
                }
              } else if (sh.shield === 0 && sh.hull <= 0) {
                this.fx.spawnShipDeath(sh.pos, sh.colorHex, sh.size, false);
                this.soundSystem.playExplosion();
                this.cockpitView?.recordShipDeath(sh.pos, false);
                sh.shield = sh.maxShield || 75;
                sh.hull = sh.maxHull || 120;
              }
              break;
            }
          }
        }
      }

      if (destroyed) {
        this.scene.remove(p.mesh);
        if (p.isMissile) this.disposeObject3D(p.mesh);
      } else {
        nextProjectiles.push(p);
      }
    });
    this.projectiles = nextProjectiles;

    // 4b. Derelict Wreck Salvage Proximity & Loot Pods Tractor
    if (leadShip && this.environment?.wrecks) {
      const salvageRange = 42 + stats.tractorRange * 0.45;
      for (const wreck of this.environment.wrecks) {
        if (wreck.salvaged) continue;
        if (leadShip.pos.distanceTo(wreck.mesh.position) < salvageRange) {
          wreck.salvaged = true;
          if (wreck.ring) wreck.ring.visible = false;
          if (wreck.beacon) wreck.beacon.visible = false;
          const payout = Math.round(wreck.salvageValue * stats.salvageYieldMult);
          this.credits += payout;
          this.updateCreditsHud();
          this.savePilotRecord();
          this.fx?.spawnTractorBeam(wreck.mesh.position, leadShip.pos);
          this.fx?.spawnLootBurst(wreck.mesh.position, 0xfbbf24);
          this.fx?.spawnFloatingText(leadShip.pos, `WRECK +${payout} CR`, '#fbbf24', 30);
          this.soundSystem?.playCashCoin?.();
          this.contracts?.recordEvent('salvage', 1);
          this.tacticalHud?.showToast(`Salvaged ${wreck.name}: +${payout.toLocaleString()} CR`);
        }
      }
    }
    this.contracts?.update(dt, leadShip, stats);

    // 5. Update FX & Particles
    this.fx.update(dt);

    // 6. Camera Director & 3D Cockpit Update
    const isCockpitMode = this.cameraDirector.mode === 'cockpit';
    if (this.cockpitView) this.cockpitView.group.visible = isCockpitMode;
    if (leadShip?.mesh) leadShip.mesh.visible = !isCockpitMode;

    const leadObstacles = leadShip ? this.flightDynamics.getFlightObstacles(leadShip) : null;
    this.cameraDirector.update(
      dt, this.elapsed, leadShip, this.ships, this.aliens,
      this.environment.planets, leadObstacles, isManual
    );

    if (this.cockpitView && isCockpitMode) {
      const wpnDef = getWeaponDef(this.weaponId);
      this.cockpitView.update(
        dt,
        this.elapsed,
        leadShip,
        this.ships,
        this.aliens,
        this.keys,
        this.touch,
        this.missileVolleyTimer,
        this.missileQueue.length,
        this.environment?.planets,
        this.cameraDirector,
        {
          stations: this.environment?.stations,
          lockedTarget: this.lockedTarget,
          weaponName: wpnDef.shortName,
          weaponHeat: this.weaponHeat,
          weaponOverheated: this.weaponOverheated,
          missileAmmo: this.missileAmmo,
          maxMissileAmmo: stats.missileMax,
          autoFire: this.autoFire,
          manualFlight: isManual,
          navTarget: this.navTarget
        }
      );

      if (leadShip && leadShip.shootCooldown <= 0 && this.autoFire) {
        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);
        const shipFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(leadShip.mesh.quaternion).normalize();
        for (const alien of this.aliens) {
          if (!alien || (alien.health && alien.health <= 0)) continue;
          const toAlien = alien.pos.clone().sub(leadShip.pos);
          const dist = toAlien.length();
          if (dist > 15 && dist < 340) {
            toAlien.normalize();
            if (shipFwd.dot(toAlien) > 0.88 || camDir.dot(toAlien) > 0.88) {
              this.fireLaser(leadShip, alien);
              leadShip.shootCooldown = 0.35 + Math.random() * 0.28;
              break;
            }
          }
        }
      }
    }

    // 7. Staging encounters, Bosses & Minimum Fleet Sizes
    while (this.ships.length < (this.config.minShips || 7)) {
      this.spawnFriendlyShip();
    }
    while (this.aliens.length < (this.config.minAliens || 11)) {
      this.spawnAlienShip(false);
    }
    if (this.contracts?.shouldSpawnBoss(this.aliens)) {
      this.spawnAlienShip(false, 'boss');
    }

    this.encounterTimer += dt;
    if (this.encounterTimer > 4.5) {
      this.stageEncounters();
      this.encounterTimer = 0;
    }
  }
}
