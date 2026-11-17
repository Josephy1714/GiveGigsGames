// Core System - Premium Autonomous 3D Spaceship & Solar System Simulation (Modular Architecture)
// Implements 3D WebGL rendering, custom modular ship loading, Star Wars dogfights,
// cinematic camera sequences, and directional shield responses.

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

const THREE = window.THREE;
const PILOT_PROFILE_KEY = 'mattyjacks-starship-pilot-v1';
const STARSHIP_LUXURY_ASSETS = [
  { id: 'luxury-yacht', title: 'Gigantic luxury star-yacht', cost: 38_000_000, income: 75, detail: 'A private interplanetary yacht that earns charter revenue while you fly.' },
  { id: 'orbital-residence', title: 'Private orbital residence', cost: 18_000_000, income: 30, detail: 'A high-orbit home with a docking ring and long-term rental income.' },
  { id: 'planetary-research-base', title: 'Planetary research base', cost: 24_000_000, income: 55, detail: 'A staffed science campus that funds survey expeditions and local jobs.' },
  { id: 'robot-crew', title: 'Robot crew', cost: 2_400_000, income: 20, detail: 'Private service robots run logistics and support your expedition work.' },
  { id: 'human-household', title: 'Human household staff', cost: 2_000_000, income: 8, detail: 'A paid crew handles hospitality, scheduling, and household operations.' },
  { id: 'animal-sanctuary', title: 'Animal sanctuary habitat', cost: 4_800_000, income: 12, detail: 'A protected habitat with care staff and a modest conservation grant.' },
];

function appendUniqueAssets(assets, ...newAssets) {
  return [...new Set([...(Array.isArray(assets) ? assets : []), ...newAssets])];
}

function readPilotCredits() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PILOT_PROFILE_KEY) || 'null');
    return Number.isSafeInteger(saved?.credits) && saved.credits >= 0 && saved.credits <= 1_000_000_000 ? saved.credits : 1250;
  } catch {
    return 1250;
  }
}

function readPilotProfile() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PILOT_PROFILE_KEY) || 'null');
    return saved && typeof saved === 'object' ? saved : { credits: 1250, planetProgress: {} };
  } catch { return { credits: 1250, planetProgress: {} }; }
}

function readPlanetProgress() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PILOT_PROFILE_KEY) || 'null');
    return saved?.planetProgress && typeof saved.planetProgress === 'object' ? saved.planetProgress : {};
  } catch { return {}; }
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
    // Local pilot record survives page reloads. Network accounts can be
    // connected later without changing the flight simulation API.
    this.credits = readPilotCredits();
    this.planetProgress = readPlanetProgress();
    this.pilotLife = (() => { const profile = readPilotProfile(); return profile.life && typeof profile.life === 'object' ? { ...profile.life, wealthOriginLocked: profile.life.wealthOriginLocked === true } : { mode: 'poor', name: 'Nova Vale', birthDate: '4/20/6969', background: 'New Arrival', skills: 0, connections: 0, assets: [], mission: 'Survey your first world and recover the lost probe.', wealthOriginLocked: false }; })();
    const recordedCities = Object.entries(this.planetProgress)
      .filter(([, progress]) => progress?.city && (progress.cityOwner || progress.planetOwner || this.pilotLife.name) === this.pilotLife.name)
      .map(([planetName]) => `Planetary city · ${planetName}`);
    if (recordedCities.length) this.pilotLife.assets = appendUniqueAssets(this.pilotLife.assets, ...recordedCities);
    this.planetSurface = null;
    this.surfaceKeys = {};
    this.profileSaveTimer = 0;
    this.tutorialSystem = null;
    
    this.config = {
      minShips: 8,
      maxShips: 10,
      minAliens: 12,
      maxAliens: 16,
      targetFPS: 60
    };
    
    this.performance = {
      frameCount: 0,
      lastTime: 0,
      fps: 60,
      loadTime: 0
    };

    // Three.js Core components
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.lights = [];

    // Subsystem Managers
    this.fx = null;
    this.environment = null;
    this.cameraDirector = null;
    this.flightDynamics = null;
    this.cockpitView = null;

    // Entities
    this.ships = [];
    this.aliens = [];
    this.projectiles = [];

    this.cosmicBackdrop = null;
    this.elapsed = 0;
    this.manuallyPaused = false;

    // Controls state
    this.keys = {};
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

    // Underside missile volley system:
    // Launches 1-4 missiles in a burst with 0.2s sequential spacing every 3.5s - 6.0s
    this.missileVolleyTimer = 2.5;
    this.missileQueue = []; // array of queued missile launches { timer, hardpointIdx, target }
  }

  async initialize(canvasId = 'starfield') {
    if (this.state.initialized) return true;
    this.state.loading = true;
    const startTime = performance.now();

    try {
      const canvas = document.getElementById(canvasId);
      if (!canvas) throw new Error(`Canvas with ID '${canvasId}' not found.`);

      // 1. Initialize WebGL Renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      const dprCap = window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
      this.renderer.setClearColor(0x05030a, 1);

      // 2. Initialize Scene & Camera
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x05030a, 0.00008);

      this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.12, 120000);
      this.camera.position.set(0, 80, 220);
      this.scene.add(this.camera);
      this.cosmicBackdrop = createCosmicBackdrop(this.scene, this.camera);

      // 3. Initialize Lighting
      const ambientLight = new THREE.AmbientLight(0x7489bd, 0.34);
      this.scene.add(ambientLight);
      this.lights.push(ambientLight);

      const dirLight = new THREE.DirectionalLight(0x9bb9ff, 0.16);
      dirLight.position.set(200, 300, 200);
      this.scene.add(dirLight);
      this.lights.push(dirLight);

      // 4. Initialize Subsystem Managers
      this.fx = new ParticleManager(this.scene);
      this.environment = new EnvironmentManager(this.scene);
      this.environment.init();
      this.planetSurface = new PlanetSurface(this.scene, this.camera, (type, data) => this.handlePlanetSurfaceEvent(type, data));
      this.planetSurface.progress = this.planetProgress;
      this.createPlanetSurfacePanel();

      this.cockpitView = new CockpitView(this.camera, this.scene);

      this.cameraDirector = new CameraDirector(this.camera);
      this.cameraDirector.onModeChange = (mode) => {
        this.state.cameraMode = mode;
        const isCockpit = mode === 'cockpit';
        if (typeof document !== 'undefined') {
          if (isCockpit) document.body.classList.add('is-cockpit-view');
          else document.body.classList.remove('is-cockpit-view');
        }
        if (this.cockpitView) {
          this.cockpitView.group.visible = isCockpit;
        }
        if (this.ships[0]?.mesh) {
          this.ships[0].mesh.visible = !isCockpit;
        }
        const camButtons = document.querySelectorAll('.btn-cam');
        camButtons.forEach(b => {
          if (b.getAttribute('data-mode') === mode) b.classList.add('active');
          else b.classList.remove('active');
        });
      };

      this.flightDynamics = new FlightDynamics(this.environment);

      // 5. Initialize Ships & Aliens right in the middle of battle
      this.initEntities();
      this.cameraDirector.update(1, 0, this.ships[0], this.ships, this.aliens, this.environment.planets, this.flightDynamics.getFlightObstacles(this.ships[0]));

      // Listeners
      window.addEventListener('resize', this.handleResize);
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      this.state.initialized = true;
      this.state.loading = false;
      this.performance.loadTime = performance.now() - startTime;
      const creditsEl = document.getElementById('hud-credits');
      if (creditsEl) creditsEl.textContent = `${this.credits} CR`;

      // 6. Initialize Starfleet Flight Academy & Tutorial System (10 Interactive Tutorials)
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
      } catch (e) {}
      
      return true;
    } catch (e) {
      this.state.error = e;
      this.state.loading = false;
      console.error('[SpaceGameCore] WebGL Init failed:', e);
      return false;
    }
  }

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
    this.keys[e.key.toLowerCase()] = true;
    if (this.planetSurface?.active) {
      if (e.key.toLowerCase() === 'e') { e.preventDefault(); this.interactPlanetSite(); }
      return;
    }
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      this.fireLaser(this.ships[0]);
    } else if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (this.cameraDirector) {
        const nextMode = this.cameraDirector.mode === 'cockpit' ? 'chase' : 'cockpit';
        this.cameraDirector.setMode(nextMode, true);
      }
    } else if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (this.tutorialSystem) {
        if (this.tutorialSystem.academyModal?.classList.contains('open')) {
          this.tutorialSystem.closeAcademyModal();
        } else {
          this.tutorialSystem.openAcademyModal();
        }
      }
    } else if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (this.ships[0]) {
        for (let m = 0; m < 3; m++) {
          this.missileQueue.push({ delay: m * 0.18, hardpointIdx: m });
        }
        if (this.tutorialSystem) this.tutorialSystem.missilesLaunched = (this.tutorialSystem.missilesLaunched || 0) + 1;
      }
    } else if ((e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this.beginPlanetaryDescent();
    } else if (['1', '2', '3', '4'].includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (this.tutorialSystem) {
        const forms = ['arrowhead', 'wall', 'echelon', 'orbit'];
        const selected = forms[parseInt(e.key, 10) - 1];
        if (selected) {
          this.tutorialSystem.setFleetFormation(selected);
          this.tutorialSystem.formationShifted = true;
        }
      }
    }
  };

  handleKeyUp = (e) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  createPlanetSurfacePanel() {
    if (document.getElementById('planet-surface-panel')) return;
    const style = document.createElement('style');
    style.id = 'planet-surface-style';
    style.textContent = `
      #planet-surface-panel{position:fixed;z-index:30;inset:auto 18px 18px 18px;max-width:660px;margin:auto;padding:18px;border:1px solid rgba(105,232,255,.48);border-radius:18px;background:linear-gradient(145deg,rgba(5,15,31,.95),rgba(19,22,45,.92));box-shadow:0 16px 60px #0009;color:#f3f8ff;font:14px/1.45 Inter,system-ui,sans-serif;display:none;backdrop-filter:blur(16px)}
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
    land.setAttribute('aria-label', 'Travel to and land on the nearest planet');
    land.addEventListener('click', () => this.beginPlanetaryDescent());
    document.body.appendChild(land);
    const panel = document.createElement('section');
    panel.id = 'planet-surface-panel';
    panel.setAttribute('aria-label', 'Planet surface exploration');
    panel.innerHTML = `<h2 id="surface-title">Planetary Expedition</h2><p id="surface-objectives">Drive the rover with W A S D or arrow keys. Visit the highlighted research sites.</p><div class="surface-grid"><button type="button" id="surface-interact">🛰️ Interact with nearby site · E</button><button type="button" id="surface-scan">📡 Scan this landing zone</button><button type="button" id="surface-outpost">🏗️ Deploy research outpost · 1,200 CR</button><button type="button" id="surface-charter">🏙️ Charter a planetary city · 250,000 CR</button><button type="button" id="surface-own-planet">🌐 Acquire planetary sovereignty · 85,000,000 CR</button><button type="button" id="surface-takeoff">🚀 Return to orbit</button></div><p id="planet-surface-status" role="status" aria-live="polite">Find the glowing sites to gather samples and retrieve the lost probe.</p>`;
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
    lifePanel.innerHTML = `<summary>🧬 Pilot Life · <span id="pilot-life-origin">Born Poor</span></summary><div class="life-card"><p id="pilot-life-profile" aria-live="polite"></p><div class="life-actions"><button type="button" data-birth="poor">Born Poor</button><button type="button" data-birth="middle">Middle Class</button><button type="button" data-birth="rich">Born Rich</button><button type="button" data-birth="random">🎲 Random Birth Mode</button></div><button type="button" id="pilot-new-life" hidden>Begin a new pilot life</button><section id="starship-luxury-assets" aria-label="Luxury holdings and income"><h3>Luxury holdings</h3><p>Buy an estate, yacht, research base, or private service team. Owned holdings add passive charter, rent, or grant income while the simulator runs.</p><div id="starship-luxury-catalog"></div><p id="starship-luxury-feedback" role="status" aria-live="polite"></p></section></div>`;
    lifePanel.querySelectorAll('[data-birth]').forEach(button => button.addEventListener('click', () => this.startPilotLife(button.dataset.birth)));
    lifePanel.querySelector('#pilot-new-life').addEventListener('click', () => this.beginNewPilotLife());
    lifePanel.querySelector('#starship-luxury-catalog').addEventListener('click', event => {
      const button = event.target.closest('[data-luxury-asset]');
      if (button) this.buyStarshipLuxuryAsset(button.dataset.luxuryAsset);
    });
    document.body.appendChild(lifePanel);
    this.renderPilotLife();
  }

  beginPlanetaryDescent() {
    if (!this.planetSurface || this.planetSurface.active || this.planetaryLanding) return;
    const ship = this.ships[0];
    if (!ship || !this.environment?.planets?.length) return;
    const planet = this.environment?.planets?.reduce((near, candidate) =>
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
      duration: THREE.MathUtils.clamp(distance / 220, 3.5, 12),
    };
    const landButton = document.getElementById('planet-land-button');
    if (landButton) {
      landButton.disabled = true;
      landButton.textContent = `Autopilot approaching ${planet.name}…`;
    }
    const overlay = document.getElementById('surface-descent-overlay');
    if (overlay) {
      overlay.textContent = `Autopilot approach · ${planet.name}`;
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
    this.cameraDirector.update(dt, this.elapsed, lead, this.ships, this.aliens, this.environment.planets, obstacles);
    if (progress < 1) return;

    this.planetaryLanding = null;
    // Preserve legacy city records that predate named ownership.
    const existingProgress = this.planetProgress[landing.planet.name];
    if (existingProgress?.city && !existingProgress.cityOwner) existingProgress.cityOwner = existingProgress.planetOwner || this.pilotLife.name;
    landing.ship.mesh.visible = false;
    this.planetSurface.land(landing.planet, this.planetProgress[landing.planet.name]);
    document.body.classList.add('is-planet-surface');
    this.updatePilotLifeControls();
    const overlay = document.getElementById('surface-descent-overlay');
    overlay?.classList.remove('approach');
    this.playDescentTransition('descent', `Atmospheric entry · ${landing.planet.name}`);
    this.keys = {};
    this.updatePlanetSurfacePanel('landed', { planet: landing.planet.name });
  }

  startPilotLife(mode = 'random') {
    if (this.pilotLife.wealthOriginLocked) return;
    if (this.planetaryLanding) {
      const feedback = document.getElementById('starship-luxury-feedback');
      if (feedback) feedback.textContent = 'Finish the planetary approach before choosing a birth background.';
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
    const wealth = origin === 'rich' ? Math.floor(45_000_000 + Math.random() * 80_000_000) : origin === 'affluent' ? Math.floor(2_000_000 + Math.random() * 18_000_000) : origin === 'middle' ? Math.floor(28_000 + Math.random() * 90_000) : Math.floor(500 + Math.random() * 2_500);
    const birthDate = mode === 'random' ? `${1 + Math.floor(Math.random() * 12)}/${1 + Math.floor(Math.random() * 28)}/${4069 + Math.floor(Math.random() * 2901)}` : '4/20/6969';
    const packageByOrigin = {
      poor: { background: random(['Dockside mechanic', 'Frontier scholarship', 'Resettled homesteader', 'Station-raised apprentice']), skills: Math.floor(Math.random() * 2), connections: Math.floor(Math.random() * 2), assets: [], mission: random(['Earn your first 10,000 CR by surveying worlds and bringing back samples.', 'Find the missing probe and use its reward to buy your first ship upgrade.', 'Take rescue and courier contracts until your first independent shuttle is yours.']) },
      middle: { background: random(['Trade-school navigator', 'Union shipwright family', 'Public-service cadet', 'Small-freighter household']), skills: 1 + Math.floor(Math.random() * 2), connections: 1 + Math.floor(Math.random() * 2), assets: [random(['Reliable shuttle share', 'Orbital apartment lease', 'Family cargo skiff'])], mission: random(['Build a respected survey fleet and open an independent route.', 'Complete a planetary expedition and turn your family asset into a business.', 'Earn a reputation as the system’s most reliable rescue pilot.']) },
      affluent: { background: random(['Second-generation exporter', 'Tech-campus legacy', 'Regional shipping family', 'Successful homestead heir']), skills: 2 + Math.floor(Math.random() * 3), connections: 2 + Math.floor(Math.random() * 3), assets: ['Private courier craft', random(['Orbital skyhome', 'Mining claim', 'Research vessel share'])], mission: random(['Establish the region’s first self-sustaining planetary research base.', 'Turn inherited routes into a thriving independent fleet.', 'Fund a system-wide wildlife and habitat survey.']) },
      rich: { background: random(['Interplanetary dynasty', 'Founder family', 'Old-star aristocracy', 'Galactic media empire']), skills: 3 + Math.floor(Math.random() * 4), connections: 4 + Math.floor(Math.random() * 5), assets: ['Gigantic luxury star-yacht', 'Private orbital residence', 'Executive shuttle', 'Planetary research base', 'Robot crew', 'Human household staff', 'Animal sanctuary habitat', 'Planet-wide sovereignty deed'], mission: random(['Build a planetary capital city and make it a welcoming home for everyone.', 'Lead a system-wide ecological expedition and fund its public science network.', 'Create an independent interstellar estate with a flourishing city and research fleet.']) }
    }[origin];
    const pilotName = `${random(firstNames)} ${random(lastNames)}`;
    this.pilotLife = { mode: origin, birthDate, name: pilotName, ...packageByOrigin, wealthOriginLocked: true };
    this.credits = wealth;
    this.planetProgress = {};
    if (origin === 'rich' && this.environment?.planets?.length) {
      const homeworld = random(this.environment.planets).name;
      this.planetProgress[homeworld] = { samples: 3, scanned: true, probe: true, outpost: true, city: true, cityOwner: pilotName, completed: true, planetOwner: pilotName };
      this.pilotLife.assets = appendUniqueAssets(
        this.pilotLife.assets.map(asset => asset === 'Planet-wide sovereignty deed' ? `Planetary sovereignty · ${homeworld}` : asset),
        `Planetary city · ${homeworld}`
      );
    }
    if (this.planetSurface) this.planetSurface.progress = this.planetProgress;
    this.renderPilotLife();
    this.updateCreditsHud();
    this.savePilotRecord();
  }

  renderPilotLife() {
    const origin = document.getElementById('pilot-life-origin');
    const details = document.getElementById('pilot-life-profile');
    if (!origin || !details) return;
    const label = this.pilotLife.mode === 'rich' ? 'Born Rich' : this.pilotLife.mode === 'affluent' ? 'Affluent Start' : this.pilotLife.mode === 'middle' ? 'Middle Class' : 'Born Poor';
    origin.textContent = label;
    details.textContent = `${this.pilotLife.name} · Born ${this.pilotLife.birthDate} · ${this.pilotLife.background} · Skills ${this.pilotLife.skills}/6 · Connections ${this.pilotLife.connections}/8 · Assets: ${this.pilotLife.assets.join(', ') || 'none yet'} · Goal: ${this.pilotLife.mission} · Year 6969; technology has reached its plateau.`;
    this.updatePilotLifeControls();
    this.renderStarshipLuxuryMarket();
  }

  updatePilotLifeControls() {
    const transitioning = Boolean(this.planetaryLanding || this.planetSurface?.active);
    document.querySelectorAll('#starship-life-panel [data-birth]').forEach(button => { button.disabled = this.pilotLife.wealthOriginLocked || transitioning; });
    const newLife = document.getElementById('pilot-new-life');
    if (newLife) {
      newLife.hidden = !this.pilotLife.wealthOriginLocked && !this.hasPlanetaryProgress();
      newLife.disabled = transitioning;
      newLife.textContent = this.planetaryLanding ? 'Wait for landing before beginning a new life' : this.planetSurface?.active ? 'Return to orbit to begin a new life' : 'Begin a new pilot life · reset credits and planet records';
    }
  }

  hasPlanetaryProgress() {
    return Object.values(this.planetProgress || {}).some(progress => progress && (progress.samples > 0 || progress.scanned || progress.probe || progress.outpost || progress.city));
  }

  beginNewPilotLife() {
    const feedback = document.getElementById('starship-luxury-feedback');
    if (this.planetaryLanding) {
      if (feedback) feedback.textContent = 'Finish the planetary approach before starting a new life.';
      return;
    }
    if (this.planetSurface?.active) {
      if (feedback) feedback.textContent = 'Return to orbit before starting a new life.';
      return;
    }
    if (!window.confirm('Start a new pilot life? This resets credits, luxury holdings, and all planetary survey, outpost, and city records. Your current ship and orbit remain unchanged.')) return;
    this.credits = 1250;
    this.planetProgress = {};
    if (this.planetSurface) this.planetSurface.progress = this.planetProgress;
    this.pilotLife = { mode: 'poor', name: 'Nova Vale', birthDate: '4/20/6969', background: 'New Arrival', skills: 0, connections: 0, assets: [], mission: 'Survey your first world and recover the lost probe.', wealthOriginLocked: false };
    this.updateCreditsHud();
    this.renderPilotLife();
    if (feedback) feedback.textContent = 'New pilot life ready. Choose Born Poor, Middle Class, Born Rich, or Random Birth.';
    this.savePilotRecord();
  }

  renderStarshipLuxuryMarket() {
    const catalog = document.getElementById('starship-luxury-catalog');
    if (!catalog) return;
    if (catalog.children.length !== STARSHIP_LUXURY_ASSETS.length) {
      catalog.innerHTML = STARSHIP_LUXURY_ASSETS.map(asset => `<article><b>${asset.title}</b><span>${asset.detail}<br>${asset.cost.toLocaleString()} CR · +${asset.income} CR / flight-second</span><button type="button" data-luxury-asset="${asset.id}"></button></article>`).join('');
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

  handlePlanetSurfaceEvent(type, data) {
    if (type === 'interaction' || type === 'scan') {
      this.credits += data.reward || 0;
      this.updateCreditsHud();
      const progress = this.planetSurface?.progress || {};
      this.planetProgress = progress;
      this.savePilotRecord();
    } else if (type === 'outpost' || type === 'charter') {
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
    title.textContent = `🪐 ${state.planet} Surface Expedition`;
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
    if (type === 'landed') status.textContent = `Safe landing confirmed at ${state.planet}. Use W A S D or arrows to drive; press E near a site to interact.`;
    else if (type === 'interaction') status.textContent = data.error || `Recovered ${data.label} (+${data.reward} CR).${data.complete ? ' Expedition objectives complete!' : ''}`;
    else if (type === 'scan') status.textContent = data.error || `Planet survey complete (+${data.reward} CR).${data.complete ? ' Expedition objectives complete!' : ' Find three samples and the missing probe.'}`;
    else if (type === 'outpost') status.textContent = data.error || 'Research outpost deployed. It adds 5 CR per in-simulation second while you travel in space.';
    else if (type === 'charter') status.textContent = data.error || `Planetary city charter approved for ${state.cityOwner || this.pilotLife.name}. The city is visible on the surface and contributes 35 CR per in-simulation second while you travel in space.`;
    else if (type === 'sovereignty') status.textContent = data.error || `${state.planet} is now your sovereign world. Its colony, research outpost, and planetary revenues are part of your holdings.`;
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
    if (this.credits < 250_000) return this.updatePlanetSurfacePanel('charter', { error: 'A planetary city charter costs 250,000 CR. Expedition samples and research outposts help you climb toward it.' });
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
    if (this.credits < 85_000_000) return this.updatePlanetSurfacePanel('sovereignty', { error: 'A planetary sovereignty deed costs 85,000,000 CR. Build a portfolio, complete expeditions, or choose Born Rich to start with a homeworld.' });
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
    const planet = this.environment.planets.find(item => item.name === this.planetSurface.planet?.name);
    this.planetSurface.takeoff();
    document.body.classList.remove('is-planet-surface');
    const landingButton = document.getElementById('planet-land-button');
    if (landingButton) {
      landingButton.disabled = false;
      landingButton.textContent = '🪐 Autopilot travel & land on nearest planet';
    }
    this.playDescentTransition('takeoff', 'Ascending through atmosphere · returning to orbit');
    if (this.ships[0]) {
      this.ships[0].mesh.visible = true;
      if (planet) {
        const outward = this.ships[0].pos.clone().sub(planet.mesh.position).normalize();
        this.ships[0].pos.copy(planet.mesh.position).addScaledVector(outward, planet.radius + 90);
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
      try { this.onAutoPause?.(true); } catch { /* ignore */ }
    } else if (!this.manuallyPaused) {
      this.start();
      try { this.onAutoPause?.(false); } catch { /* ignore */ }
    }
  };

  initEntities() {
    this.ships = [];
    this.aliens = [];
    this.projectiles = [];

    // Friendly ships: Unified Green spectrum (Emerald, Jade, Neon Mint, Lime, Bright Green)
    const friendlyGreenProfiles = [
      { colorHex: 0x10b981, color: '#10b981', size: 8, maxSpeed: 230 }, // Emerald green
      { colorHex: 0x22c55e, color: '#22c55e', size: 8, maxSpeed: 220 }, // Bright green
      { colorHex: 0x059669, color: '#059669', size: 8, maxSpeed: 210 }, // Forest jade
      { colorHex: 0x34d399, color: '#34d399', size: 8, maxSpeed: 240 }, // Neon mint
      { colorHex: 0x16a34a, color: '#16a34a', size: 8, maxSpeed: 215 }, // Vivid green
      { colorHex: 0x4ade80, color: '#4ade80', size: 8, maxSpeed: 225 }  // Spring green
    ];

    // Player ship starts in populated system space heading into action
    const playerStartPos = new THREE.Vector3(720, 10, 350);
    const playerStartVel = new THREE.Vector3(-140, 0, 120);

    // Create fleet of human ships (Lead ship + wingmen in close combat formation)
    for (let i = 0; i < this.config.maxShips; i++) {
      const profile = friendlyGreenProfiles[i % friendlyGreenProfiles.length];
      const isLead = i === 0;
      const shipMesh = isLead
        ? ShipBuilder.buildHeroShip()
        : ShipBuilder.buildShip('human', 0.1 + i * 0.45);
      
      shipMesh.scale.setScalar(isLead ? 0.55 : 1.75);
      this.scene.add(shipMesh);

      // Wingmen spawn directly clustered around the player ship in dynamic battle formation
      let pos, vel;
      if (isLead) {
        pos = playerStartPos.clone();
        vel = playerStartVel.clone();
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
        vel: vel,
        color: profile.color,
        colorHex: profile.colorHex,
        size: isLead ? 8 : 10,
        maxSpeed: profile.maxSpeed,
        shield: 100,
        shieldHitFlash: 0,
        boostTimer: 0,
        boostActive: false,
        shootCooldown: isLead ? 0 : Math.random() * 0.8,
        bankSeed: i * 2.1
      });
    }

    // Alien Interceptors: Unified Reddish spectrum (Crimson, Ruby, Scarlet, Hot Red, Crimson-Orange)
    const alienReddishColors = [
      0xef4444, // Crimson Red
      0xf43f5e, // Hot Rose / Scarlet
      0xe11d48, // Ruby Red
      0xff2a4f, // Electric Red
      0xdc2626, // Deep Crimson
      0xf97316, // Orange-Red
      0xb91c1c, // Dark Blood Red
      0xff385c  // Fiery Red
    ];

    // All 12 alien ships spawned immediately IN THE MIDDLE OF THE ACTION around the player
    // Distributed in attack vectors at close-to-medium skirmish distance (70 to 180 units)
    for (let i = 0; i < 12; i++) {
      const colorHex = alienReddishColors[i % alienReddishColors.length];
      const alienMesh = ShipBuilder.buildShip('alien', Math.random());
      alienMesh.scale.setScalar(1.15);
      addAlienAccents(alienMesh, colorHex);
      this.scene.add(alienMesh);

      // Distribute in surrounding attack arcs
      const theta = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const combatDist = 80 + Math.random() * 110; // in active skirmish range right from second 0
      const altY = (Math.random() - 0.5) * 50;

      const spawnPos = playerStartPos.clone().add(new THREE.Vector3(
        combatDist * Math.cos(theta),
        altY,
        combatDist * Math.sin(theta)
      ));
      alienMesh.position.copy(spawnPos);

      // Initial velocity swooping toward or cutting across the player fleet
      const toPlayer = playerStartPos.clone().sub(spawnPos).normalize();
      const crossCombat = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).multiplyScalar((i % 2 === 0 ? 1 : -1) * 0.6);
      const attackVel = toPlayer.add(crossCombat).normalize().multiplyScalar(140 + Math.random() * 40);

      this.aliens.push({
        id: `alien_${i}`,
        mesh: alienMesh,
        pos: alienMesh.position,
        vel: attackVel,
        colorHex,
        color: `#${colorHex.toString(16).padStart(6, '0')}`,
        size: 9.5,
        maxSpeed: 175,
        health: 120,
        maxHealth: 120,
        shootCooldown: 0.3 + Math.random() * 1.2 // starts firing almost immediately
      });
    }
  }

  fireLaser(ship, target = null) {
    if (!ship) return;

    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(ship.mesh.quaternion).normalize();
    if (target) {
      const leadTime = Math.min(0.55, ship.pos.distanceTo(target.pos) / 750);
      dir.copy(target.pos).addScaledVector(target.vel, leadTime).sub(ship.pos).normalize();
    }

    const isLeadShip = ship === this.ships[0];
    if (isLeadShip && this.tutorialSystem) {
      this.tutorialSystem.lasersFired = (this.tutorialSystem.lasersFired || 0) + 1;
    }
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(ship.mesh.quaternion).normalize();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.mesh.quaternion).normalize();
    let lPos = ship.pos.clone().addScaledVector(right, -ship.size * 0.45);
    let rPos = ship.pos.clone().addScaledVector(right, ship.size * 0.45);

    if (isLeadShip && this.cameraDirector?.mode === 'cockpit' && this.cockpitView) {
      this.cockpitView.triggerLaserFire();
      const muzzles = this.cockpitView.getMuzzleWorldPositions();
      if (muzzles) {
        lPos = muzzles.leftWorld;
        rPos = muzzles.rightWorld;
      }
      if (target) {
        const toTarget = target.pos.clone().sub(ship.pos).normalize();
        if (forward.dot(toTarget) > 0.75) {
          dir.copy(forward).lerp(toTarget, 0.35).normalize();
        } else {
          dir.copy(forward);
        }
      } else {
        this.camera.getWorldDirection(dir);
      }
    } else if (ship.mesh?.userData?.wingCannonHardpoints) {
      ship.mesh.updateWorldMatrix(true, false);
      const [hpL, hpR] = ship.mesh.userData.wingCannonHardpoints;
      lPos = ship.mesh.localToWorld(new THREE.Vector3(...hpL));
      rPos = ship.mesh.localToWorld(new THREE.Vector3(...hpR));
    } else if (ship.mesh?.userData?.barrelPitch) {
      const pitch = ship.mesh.userData.barrelPitch;
      pitch.updateWorldMatrix(true, false);
      lPos = pitch.localToWorld(new THREE.Vector3(-0.65, 0, -4.8));
      rPos = pitch.localToWorld(new THREE.Vector3(0.65, 0, -4.8));
      dir.set(0, 0, -1).applyQuaternion(pitch.getWorldQuaternion(new THREE.Quaternion())).normalize();
    } else {
      lPos = ship.pos.clone().addScaledVector(right, -ship.size * 0.45).addScaledVector(forward, 2.0);
      rPos = ship.pos.clone().addScaledVector(right, ship.size * 0.45).addScaledVector(forward, 2.0);
    }

    const isHero = !!ship.mesh.userData.hero;
    const laserGeom = new THREE.BoxGeometry(isHero ? 0.45 : 0.35, isHero ? 0.45 : 0.35, isHero ? 7.5 : 5);
    const laserMat = new THREE.MeshBasicMaterial({
      color: isHero ? 0x54f5ee : ship.colorHex,
      blending: THREE.AdditiveBlending
    });

    const createProj = (startPos) => {
      const mesh = new THREE.Mesh(laserGeom, laserMat);
      mesh.position.copy(startPos);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
      this.scene.add(mesh);

      this.projectiles.push({
        mesh,
        dir: dir.clone(),
        speed: isHero ? 950 : 850,
        life: 2.4,
        faction: ship.mesh.userData.hero || ship.id.startsWith('ship') ? 'human' : 'alien',
        damage: isHero ? 42 : 32
      });
    };

    createProj(lPos);
    createProj(rPos);
    this.soundSystem.playLaser();
  }

  launchUndersideMissile(heroShip, hardpointIdx = 0, target = null) {
    if (!heroShip?.mesh) return;
    if (this.tutorialSystem) {
      this.tutorialSystem.missilesLaunched = (this.tutorialSystem.missilesLaunched || 0) + 1;
    }
    heroShip.mesh.updateWorldMatrix(true, false);

    // Hardpoint locations on the underside belly
    const hardpoints = heroShip.mesh.userData.missileHardpoints || [
      [-1.35, -0.65, -0.8],
      [1.35, -0.65, -0.8],
      [-1.35, -0.65, 1.2],
      [1.35, -0.65, 1.2]
    ];
    const offset = hardpoints[hardpointIdx % hardpoints.length];
    const spawnWorldPos = heroShip.mesh.localToWorld(new THREE.Vector3(...offset));

    // Forward direction of hero ship
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(heroShip.mesh.quaternion).normalize();
    // Drop slightly downwards first for realistic missile release
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(heroShip.mesh.quaternion).normalize();
    const initialDir = forward.clone().addScaledVector(down, 0.22).normalize();

    // Cylindrical missile body with glowing green rocket engine
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

    // If no target provided, pick nearest hostile alien
    const missileTarget = target || this.aliens.reduce((best, al) =>
      !best || al.pos.distanceToSquared(heroShip.pos) < best.pos.distanceToSquared(heroShip.pos) ? al : best, null);

    this.projectiles.push({
      mesh: missileGroup,
      dir: initialDir,
      speed: 460,
      life: 3.8,
      faction: 'human',
      damage: 60, // 2 missile hits destroy an enemy
      isMissile: true,
      homing: missileTarget,
      turnRate: 3.8,
      smokeTimer: 0
    });

    this.soundSystem.playLaser();
    this.soundSystem.playExplosion?.(); // heavy thud for missile drop
    this.fx.spawnMissileLaunchFlash(spawnWorldPos);
    this.fx.spawnMissileThrustParticle(spawnWorldPos, down);
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

    // Never spawn in view of the active camera frustum!
    // Spawns occur either hidden behind distant planets or far behind the camera view cone
    const camDir = new THREE.Vector3();
    if (this.camera) this.camera.getWorldDirection(camDir);
    else camDir.copy(forward);

    const nearby = this.environment.planets.filter(p => p.mesh.position.distanceTo(lead.pos) < 850);
    if (nearby.length && Math.random() < 0.35) {
      const planet = nearby[Math.floor(Math.random() * nearby.length)];
      // Spawn behind the planet occluded from camera vision
      const behind = planet.mesh.position.clone().sub(this.camera ? this.camera.position : lead.pos).normalize();
      candidate = planet.mesh.position.clone().addScaledVector(behind, planet.radius + 120);
    }
    for (let attempt = 0; attempt < 32; attempt++) {
      if (!candidate) {
        // Spawn strictly behind or in rear flanks of camera, but close to player (140 - 240 units away)
        const distance = 140 + Math.random() * 100;
        const flank = (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.5);
        // Force along to be strictly negative (behind the ship/camera line of sight)
        const along = -(0.6 + Math.random() * 0.8) * distance;

        candidate = lead.pos.clone()
          .addScaledVector(side, flank * distance)
          .addScaledVector(forward, along);
        candidate.y += (Math.random() - 0.5) * 35;
      }

      // Check if candidate is in front of the camera; if so, reject immediately
      if (this.camera) {
        const toCandidate = candidate.clone().sub(this.camera.position).normalize();
        if (toCandidate.dot(camDir) > 0.1) {
          candidate = null;
          continue;
        }
      }

      const solarRadius = Math.hypot(candidate.x, candidate.z);
      if (solarRadius > ONE_AU + 80 && solarRadius < SYSTEM_EDGE - 120 &&
          bodies.every(body => candidate.distanceTo(body.center) > body.radius + 45)) break;
      candidate = null;
    }
    if (!candidate) {
      // Default fallback: place behind camera in close flanking position
      candidate = lead.pos.clone().addScaledVector(forward, -160).addScaledVector(side, 90);
    }
    ship.pos.copy(candidate);
    const approach = lead.pos.clone().sub(candidate).normalize();
    if (candidate.clone().sub(lead.pos).dot(forward) > 0) {
      const crossVec = side.clone().multiplyScalar((Math.random() - 0.5) * 0.8);
      const forwardVec = forward.clone().multiplyScalar(0.4 + Math.random() * 0.5);
      const blendedVel = crossVec.add(forwardVec).normalize();
      ship.vel.copy(blendedVel).multiplyScalar(ship.maxSpeed * (0.55 + Math.random() * 0.25));
    } else {
      ship.vel.copy(approach).multiplyScalar(ship.maxSpeed * 0.6);
    }
  }

  spawnFriendlyShip() {
    const lead = this.ships[0];
    if (!lead || !this.scene) return;
    const friendlyGreenProfiles = [
      { colorHex: 0x10b981, color: '#10b981', size: 8, maxSpeed: 230 },
      { colorHex: 0x22c55e, color: '#22c55e', size: 8, maxSpeed: 220 },
      { colorHex: 0x059669, color: '#059669', size: 8, maxSpeed: 210 },
      { colorHex: 0x34d399, color: '#34d399', size: 8, maxSpeed: 240 },
      { colorHex: 0x16a34a, color: '#16a34a', size: 8, maxSpeed: 215 },
      { colorHex: 0x4ade80, color: '#4ade80', size: 8, maxSpeed: 225 }
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
      shield: 100,
      shieldHitFlash: 0,
      boostTimer: 0,
      boostActive: false,
      shootCooldown: 0.5 + Math.random() * 0.8,
      bankSeed: Math.random() * 10
    };
    this.stageEncounterShip(newShip, lead);
    this.ships.push(newShip);
  }

  spawnAlienShip() {
    const lead = this.ships[0];
    if (!lead || !this.scene) return;
    const alienReddishColors = [
      0xef4444, 0xf43f5e, 0xe11d48, 0xff2a4f,
      0xdc2626, 0xf97316, 0xb91c1c, 0xff385c
    ];
    const colorHex = alienReddishColors[this.aliens.length % alienReddishColors.length];
    const alienMesh = ShipBuilder.buildShip('alien', Math.random());
    alienMesh.scale.setScalar(1.15);
    addAlienAccents(alienMesh, colorHex);
    this.scene.add(alienMesh);

    const newAlien = {
      id: `alien_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      mesh: alienMesh,
      pos: alienMesh.position,
      vel: new THREE.Vector3(),
      colorHex,
      color: `#${colorHex.toString(16).padStart(6, '0')}`,
      size: 9.5,
      maxSpeed: 175,
      health: 120,
      maxHealth: 120,
      shootCooldown: 0.6 + Math.random() * 1.5
    };
    this.stageEncounterShip(newAlien, lead);
    this.aliens.push(newAlien);
  }

  stageEncounters(force = false) {
    const lead = this.ships[0];
    if (!lead || !this.camera) return;
    for (const ship of [...this.ships.slice(1), ...this.aliens]) {
      if (force || ship.pos.distanceToSquared(lead.pos) > 300 * 300) this.stageEncounterShip(ship, lead);
    }
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
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  destroy() {
    this.stop();
    this.tutorialSystem?.destroy();
    this.tutorialSystem = null;
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.getElementById('planet-land-button')?.remove();
    document.getElementById('planet-surface-panel')?.remove();
    document.getElementById('starship-life-panel')?.remove();
    document.getElementById('surface-descent-overlay')?.remove();
    document.getElementById('planet-surface-style')?.remove();
    document.body.classList.remove('is-planet-surface');

    this.cockpitView?.destroy();
    this.cockpitView = null;
    this.fx?.destroy();
    this.environment?.destroy();
    if (this.planetSurface?.group) this.scene.remove(this.planetSurface.group);

    this.scene.traverse(object => {
      object.geometry?.dispose?.();
      const materials = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
      materials.forEach(material => {
        for (const value of Object.values(material)) {
          if (value?.isTexture) value.dispose();
        }
        material.dispose?.();
      });
    });

    this.ships.forEach(s => this.scene.remove(s.mesh));
    this.aliens.forEach(al => this.scene.remove(al.mesh));
    this.projectiles.forEach(p => this.scene.remove(p.mesh));

    this.cosmicBackdrop?.dispose();
    this.cosmicBackdrop = null;
    this.renderer?.dispose();
    this.renderer = null;
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
      aliensCount: this.aliens.length
    };
  }

  savePilotRecord() {
    try {
      window.localStorage.setItem(PILOT_PROFILE_KEY, JSON.stringify({ credits: Math.floor(this.credits), planetProgress: this.planetSurface?.progress || this.planetProgress, life: this.pilotLife, updatedAt: Date.now() }));
    } catch { /* The flight remains playable if storage is disabled or full. */ }
  }

  animate = () => {
    if (!this.state.running) return;

    const now = performance.now();
    const rawDt = (now - this.performance.lastTime) / 1000;
    this.performance.lastTime = now;
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
    if (this.creditsTimer >= 1.0) {
      const planetIncome = Object.values(this.planetSurface?.progress || this.planetProgress || {}).reduce((income, entry) => income + (entry?.outpost ? 5 : 0) + (entry?.city ? 35 : 0) + (entry?.planetOwner ? 500 : 0), 0);
      const luxuryIncome = STARSHIP_LUXURY_ASSETS.reduce((income, asset) => income + (this.pilotLife?.assets?.includes(asset.title) ? asset.income : 0), 0);
      this.credits += 1 + planetIncome + luxuryIncome;
      this.creditsTimer = 0;
      this.updateCreditsHud();
      this.renderStarshipLuxuryMarket();
    }

    // Planet-side time is paused in orbit; rover exploration remains responsive and local.
    if (this.planetSurface?.active) {
      this.planetSurface.update(Math.min(rawDt, 0.1), this.keys);
      if (this.performance.frameCount % 6 === 0) this.updatePlanetSurfacePanel();
    } else if (this.planetaryLanding) {
      this.advancePlanetaryDescent(dt);
    } else {
      this.updateSimulation(dt);
    }

    if (this.tutorialSystem) {
      this.tutorialSystem.update(dt);
    }

    if (this.cosmicBackdrop) this.cosmicBackdrop.update(this.elapsed);
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  updateSimulation(dt) {
    // 1. Update Environment (Planets, Asteroids, Corona)
    this.environment.update(dt);

    // 2. Lead Ship & Friendly Fleet Update
    const leadShip = this.ships[0];
    const cameraFwd = this.cameraDirector.cameraForward;

    this.ships.forEach((ship, idx) => {
      ship.shield = Math.min(100, ship.shield + dt * 2.5);
      if (ship.mesh.userData.hero) {
        const { shield, shieldGrid } = ship.mesh.userData;
        if (ship.shieldHitFlash > 0) {
          ship.shieldHitFlash = Math.max(0, ship.shieldHitFlash - dt * 2.2);
        }
        const flash = ship.shieldHitFlash || 0;
        // Subdue whole-mesh shield opacity so directional impact bloom stands out
        shield.material.opacity = (0.006 + Math.sin(this.elapsed * 1.8) * 0.002) + flash * 0.045;
        shieldGrid.material.opacity = 0.008 + flash * 0.07;
        shield.material.color.setHex(ship.shield > 0 ? 0x5ffaff : 0xffa36a);
        shieldGrid.material.color.copy(shield.material.color);

        const nearest = this.aliens.reduce((best, alien) =>
          !best || ship.pos.distanceToSquared(alien.pos) < ship.pos.distanceToSquared(best.pos) ? alien : best, null);
        this.aimHeroTurret(ship, nearest && ship.pos.distanceToSquared(nearest.pos) < 360000 ? nearest : null, dt);
      }

      if (idx === 0) {
        const isCockpit = this.cameraDirector?.mode === 'cockpit';
        this.flightDynamics.updateLeadShip(ship, dt, this.elapsed, this.keys, this.touch, cameraFwd, this.aliens, isCockpit);
      } else {
        this.flightDynamics.updateWingmanShip(ship, idx, leadShip, this.ships, this.aliens, dt, this.elapsed, cameraFwd);
      }

      // Boost cycle
      ship.boostTimer -= dt;
      if (ship.boostTimer <= 0) {
        ship.boostActive = !ship.boostActive;
        ship.boostTimer = ship.boostActive ? 1.5 + Math.random() * 2 : 4 + Math.random() * 5;
      }

      // Engine plasma puff emission directly at nozzles with linear compact decay
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

      // Weapon targeting Skirmish triggers
      ship.shootCooldown -= dt;
      if (idx === 0) {
        // Automatic underside missile volley: every 3.5s to 6.0s, launch 1 to 4 missiles with 0.2s sequential delay
        this.missileVolleyTimer -= dt;
        if (this.missileVolleyTimer <= 0) {
          const missileCount = 1 + Math.floor(Math.random() * 4); // 1 to 4 missiles
          for (let m = 0; m < missileCount; m++) {
            this.missileQueue.push({
              delay: m * 0.2, // 0.2s delay between sequential launches
              hardpointIdx: m
            });
          }
          this.missileVolleyTimer = 3.5 + Math.random() * 2.5;
        }

        // Process missile queue
        if (this.missileQueue.length > 0) {
          const remainingQueue = [];
          for (const item of this.missileQueue) {
            item.delay -= dt;
            if (item.delay <= 0) {
              this.launchUndersideMissile(ship, item.hardpointIdx);
            } else {
              remainingQueue.push(item);
            }
          }
          this.missileQueue = remainingQueue;
        }

        this.touch.missileCooldown = Math.max(0, this.touch.missileCooldown - dt);
        if (this.touch.lockedTarget && !this.aliens.includes(this.touch.lockedTarget)) this.touch.lockedTarget = null;
      }
      if (ship.shootCooldown <= 0) {
        const targetAlien = (idx === 0 && this.touch.lockedTarget) || this.aliens.reduce((nearest, alien) =>
          !nearest || ship.pos.distanceToSquared(alien.pos) < ship.pos.distanceToSquared(nearest.pos) ? alien : nearest, null);
        if (targetAlien && ship.pos.distanceToSquared(targetAlien.pos) < 360000) {
          const heldFire = idx === 0 && this.touch.fire;
          this.fireLaser(ship, targetAlien);
          ship.shootCooldown = heldFire ? 0.28 : 0.85 + Math.random() * 0.55;
        }
      }
    });

    // 3. Update Alien Fleet AI
    let activeShootersToPlayer = 0;
    this.aliens.forEach((al, aIdx) => {
      this.flightDynamics.updateAlienShip(al, aIdx, leadShip, dt, this.elapsed, cameraFwd);

      // Alien engine plasma puffs (warm red/orange/magenta spectrum)
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

      // Coordinated tactical shooting: enemies shoot at player or nearby escort wingmen
      al.shootCooldown -= dt;
      if (al.shootCooldown <= 0 && leadShip) {
        const distSqToPlayer = al.pos.distanceToSquared(leadShip.pos);
        if (distSqToPlayer < 220 * 220) {
          // If attacking player directly
          if (activeShootersToPlayer < 2 && Math.random() < 0.55) {
            activeShootersToPlayer++;
            this.fireLaser(al, leadShip);
            al.shootCooldown = 2.0 + Math.random() * 1.5;
          } else {
            // Target nearby friendly escort ship to create intense crossfire around the player
            const nearbyFriendly = this.ships.slice(1).find(f => f.pos.distanceToSquared(al.pos) < 180 * 180);
            if (nearbyFriendly) {
              this.fireLaser(al, nearbyFriendly);
              al.shootCooldown = 1.6 + Math.random() * 1.4;
            } else {
              al.shootCooldown = 1.0 + Math.random() * 1.0;
            }
          }
        } else {
          al.shootCooldown = 1.0 + Math.random() * 1.0;
        }
      }
    });

    // 4. Update Projectiles & Hits
    const nextProjectiles = [];
    this.projectiles.forEach(p => {
      // Homing missiles steer towards enemy target and emit smoke puffs
      if (p.isMissile) {
        if (p.homing && this.aliens.includes(p.homing)) {
          const toTarget = p.homing.pos.clone().sub(p.mesh.position).normalize();
          p.dir.lerp(toTarget, Math.min(1, dt * (p.turnRate || 3.8))).normalize();
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
              this.fx.spawnExplosion(p.mesh.position, al.colorHex, 18);
              al.health -= (p.damage || 32);
              if (al.health <= 0) {
                // Dramatic Ship Death: semi-persistent smoke cloud & hull breaking apart
                this.fx.spawnShipDeath(al.pos, al.colorHex, al.size, true);
                this.soundSystem.playExplosion();
                this.credits += 250;
                this.savePilotRecord();
                const creditsEl = document.getElementById('hud-credits');
                if (creditsEl) creditsEl.textContent = `${this.credits} CR`;
                if (this.cockpitView) {
                  this.cockpitView.recordShipDeath(al.pos, true);
                }

                const angle = Math.random() * Math.PI * 2;
                al.pos.set(1550 * Math.cos(angle), (Math.random() - 0.5) * 80, 1550 * Math.sin(angle));
                al.vel.set(0, 0, 0);
                al.health = al.maxHealth || 120;
                this.stageEncounterShip(al, this.ships[0]);
              }
              break;
            }
          }
        } else {
          for (let i = 0; i < this.ships.length; i++) {
            const sh = this.ships[i];
            if (this.beamHitsSphere(previous, p.mesh.position, sh.pos, sh.size * 1.15)) {
              destroyed = true;
              sh.shield = Math.max(0, sh.shield - 22);
              const impactPoint = this.beamImpactPoint(previous, p.mesh.position, sh.pos, sh.size * 1.15);
              this.fx.spawnShieldImpact(sh, impactPoint);
              this.fx.spawnExplosion(impactPoint, sh.shield > 0 ? 0x69deff : 0xffb35a, 8);
              if (sh.shield === 0) {
                // Wingman ship death / shield overload with smoke & debris
                this.fx.spawnShipDeath(sh.pos, sh.colorHex, sh.size, false);
                this.soundSystem.playExplosion();
                if (this.cockpitView) {
                  this.cockpitView.recordShipDeath(sh.pos, false);
                }
                sh.shield = 75;
              }
              break;
            }
          }
        }
      }

      if (destroyed) {
        this.scene.remove(p.mesh);
      } else {
        nextProjectiles.push(p);
      }
    });
    this.projectiles = nextProjectiles;

    // 5. Update FX & Particles
    this.fx.update(dt);

    // 6. Camera Director & 3D Cockpit Update
    const isCockpitMode = this.cameraDirector.mode === 'cockpit';
    if (this.cockpitView) {
      this.cockpitView.group.visible = isCockpitMode;
    }
    if (leadShip?.mesh) {
      leadShip.mesh.visible = !isCockpitMode;
    }

    const leadObstacles = leadShip ? this.flightDynamics.getFlightObstacles(leadShip) : null;
    this.cameraDirector.update(dt, this.elapsed, leadShip, this.ships, this.aliens, this.environment.planets, leadObstacles);

    if (this.cockpitView && isCockpitMode) {
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
        this.cameraDirector
      );

      // Automatic forward-facing laser fire when pointing or looking at an enemy ship in cockpit view
      if (leadShip && leadShip.shootCooldown <= 0) {
        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);
        const shipFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(leadShip.mesh.quaternion).normalize();
        for (const alien of this.aliens) {
          if (!alien || (alien.health && alien.health <= 0)) continue;
          const toAlien = alien.pos.clone().sub(leadShip.pos);
          const dist = toAlien.length();
          if (dist > 15 && dist < 340) {
            toAlien.normalize();
            // Fire if enemy is within bore-sight firing cone of ship or camera reticle
            if (shipFwd.dot(toAlien) > 0.88 || camDir.dot(toAlien) > 0.88) {
              this.fireLaser(leadShip, alien);
              leadShip.shootCooldown = 0.35 + Math.random() * 0.28;
              break;
            }
          }
        }
      }
    }

    // 7. Staging encounters & Enforcing Minimum Fleet Sizes
    // Keep minimum number of active ships (e.g. at least 8 friendly ships and 12 enemy ships)
    while (this.ships.length < (this.config.minShips || 8)) {
      this.spawnFriendlyShip();
    }
    while (this.aliens.length < (this.config.minAliens || 12)) {
      this.spawnAlienShip();
    }

    this.encounterTimer += dt;
    if (this.encounterTimer > 4.5) {
      this.stageEncounters();
      this.encounterTimer = 0;
    }
  }
}
