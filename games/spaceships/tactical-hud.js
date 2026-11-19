// Tactical HUD, 3D Target Reticle & Lead Pip, 2D Minimap, Star Map & Warp Modal, Station Docking Services/Shipyard/Contracts, Rover Radar, and Tow/Ironman Modals
import {
  SHIP_CLASSES,
  SHIP_CLASS_ORDER,
  UPGRADE_TRACKS,
  SHIP_LIVERIES,
  WEAPON_TYPES,
  WEAPON_ORDER,
  getEffectiveShipStats,
  getUpgradeCost,
  getShipCost,
  getLiveryCost,
  getPilotBonuses
} from './ship-catalog.js';
import { SYSTEM_EDGE } from './environment-manager.js';

const THREE = window.THREE;

export class TacticalHUD {
  constructor(core) {
    this.core = core;
    this.root = null;
    this.starMapModal = null;
    this.stationModal = null;
    this.towModal = null;
    this.selectedNavId = null;
    this.activeStationTab = 'services';
    this.hitMarkerTimer = 0;
    this.toastTimer = 0;
    this.minimapTimer = 0;
    this.lastSurfaceCheck = 0;

    this.injectStyles();
    this.buildDOM();
  }

  injectStyles() {
    if (document.getElementById('tactical-hud-styles')) return;
    const style = document.createElement('style');
    style.id = 'tactical-hud-styles';
    style.textContent = `
      .is-embedded-sim #tac-hud-root,
      .is-embedded-sim #star-map-modal,
      .is-embedded-sim #station-dock-modal,
      .is-embedded-sim #ship-tow-modal { display: none !important; }
      body.is-planet-surface #tac-hud-root { display: none !important; }

      #tac-hud-root {
        position: fixed; inset: 0; z-index: 9; pointer-events: none;
        font-family: 'Inter', system-ui, sans-serif; color: #f1f5f9;
      }

      /* Top-Left Threat & Active Contracts */
      #tac-mission-box {
        position: absolute; left: 24px; top: 80px; width: 255px;
        background: rgba(8, 13, 28, 0.78); border: 1px solid rgba(56, 189, 248, 0.28);
        border-radius: 12px; padding: 10px 12px; backdrop-filter: blur(10px);
        pointer-events: auto; font-size: 11px; line-height: 1.4;
      }
      .tac-box-head {
        display: flex; justify-content: space-between; align-items: center;
        font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 700;
        color: #38bdf8; letter-spacing: 0.08em; margin-bottom: 6px;
      }
      .tac-threat-pill {
        background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.45);
        color: #fca5a5; padding: 1px 6px; border-radius: 999px; font-size: 9px;
      }
      .tac-contract-item {
        padding: 5px 7px; border-radius: 7px; background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08); margin-top: 5px;
      }
      .tac-contract-title { font-weight: 700; color: #e2e8f0; display: flex; justify-content: space-between; }
      .tac-contract-prog { font-size: 10px; color: #34d399; }

      /* Transient Toast */
      #tac-toast {
        margin-top: 8px; padding: 6px 10px; border-radius: 8px;
        background: rgba(16, 185, 129, 0.22); border: 1px solid rgba(52, 211, 153, 0.5);
        color: #a7f3d0; font-weight: 700; font-size: 11px; display: none;
      }

      /* Boss Bar */
      #tac-boss-bar {
        position: absolute; top: 122px; left: 50%; transform: translateX(-50%);
        width: min(440px, 80vw); background: rgba(24, 6, 14, 0.88);
        border: 1px solid rgba(244, 63, 94, 0.65); border-radius: 10px;
        padding: 8px 14px; display: none; backdrop-filter: blur(8px);
      }
      .tac-boss-title {
        display: flex; justify-content: space-between; font-family: 'Orbitron', sans-serif;
        font-size: 11px; font-weight: 800; color: #fda4af; margin-bottom: 5px;
      }
      .tac-boss-track { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
      .tac-boss-fill { height: 100%; background: linear-gradient(90deg, #e11d48, #fb7185); width: 100%; transition: width 0.1s; }

      /* Top-Right Minimap */
      #tac-minimap-wrap {
        position: absolute; right: 16px; top: 118px; width: 144px;
        background: rgba(6, 12, 26, 0.78); border: 1px solid rgba(56, 189, 248, 0.35);
        border-radius: 14px; padding: 8px; backdrop-filter: blur(10px); text-align: center;
      }
      body.is-cockpit-view #tac-minimap-wrap { display: none; }
      #tac-minimap { display: block; margin: 0 auto; border-radius: 50%; }
      .tac-minimap-caption { font-size: 9px; color: #94a3b8; margin-top: 4px; font-family: 'Orbitron', sans-serif; }

      /* Center Crosshair, Hit Marker & Mouse Steer */
      #tac-crosshair {
        position: absolute; left: 50%; top: 50%; width: 34px; height: 34px;
        transform: translate(-50%, -50%); pointer-events: none;
      }
      .tac-ch-ring {
        position: absolute; inset: 4px; border: 1.5px solid rgba(103, 232, 249, 0.55); border-radius: 50%;
      }
      .tac-ch-dot {
        position: absolute; left: 50%; top: 50%; width: 4px; height: 4px;
        margin: -2px 0 0 -2px; border-radius: 50%; background: #67e8f9;
      }
      #tac-hitmarker {
        position: absolute; left: 50%; top: 50%; width: 22px; height: 22px;
        transform: translate(-50%, -50%) rotate(45deg); opacity: 0; transition: opacity 0.08s;
      }
      #tac-hitmarker::before, #tac-hitmarker::after {
        content: ''; position: absolute; background: #fb7185; border-radius: 1px;
      }
      #tac-hitmarker::before { left: 10px; top: 0; width: 2px; height: 22px; }
      #tac-hitmarker::after { top: 10px; left: 0; height: 2px; width: 22px; }
      #tac-mouse-cursor {
        position: absolute; width: 18px; height: 18px; margin: -9px 0 0 -9px;
        border: 2px solid #f59e0b; border-radius: 50%; box-shadow: 0 0 10px #f59e0b;
        display: none; pointer-events: none;
      }

      /* 3D Projected Target Overlay */
      #tac-target-layer { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
      .tac-target-box {
        position: absolute; width: 52px; height: 52px; margin: -26px 0 0 -26px;
        border: 2px solid #f59e0b; border-radius: 6px; box-shadow: 0 0 12px rgba(245, 158, 11, 0.5);
      }
      .tac-target-box.is-boss { border-color: #fb7185; width: 74px; height: 74px; margin: -37px 0 0 -37px; }
      .tac-target-label {
        position: absolute; left: 50%; top: 100%; transform: translate(-50%, 4px);
        background: rgba(5, 11, 24, 0.85); color: #fde68a; padding: 2px 6px;
        border-radius: 4px; font: 700 9.5px 'Orbitron', sans-serif; white-space: nowrap;
      }
      .tac-target-hp {
        position: absolute; left: 0; right: 0; top: -8px; height: 4px; background: rgba(0,0,0,0.65); border-radius: 2px;
      }
      .tac-target-hp > div { height: 100%; background: #ef4444; border-radius: 2px; }
      .tac-lead-pip {
        position: absolute; width: 14px; height: 14px; margin: -7px 0 0 -7px;
        border: 2px solid #34d399; border-radius: 50%; background: rgba(16, 185, 129, 0.2);
      }
      .tac-offscreen-ptr {
        position: absolute; font-size: 16px; color: #f59e0b; text-shadow: 0 0 10px #f59e0b;
      }

      /* Bottom-Center Telemetry & Squadron Strip */
      #tac-telemetry-bar {
        position: absolute; bottom: 102px; left: 50%; transform: translateX(-50%);
        width: min(560px, calc(100vw - 600px)); min-width: 390px;
        background: rgba(8, 12, 26, 0.82); border: 1px solid rgba(56, 189, 248, 0.32);
        border-radius: 12px; padding: 8px 12px; backdrop-filter: blur(12px);
        pointer-events: auto; display: flex; flex-direction: column; gap: 6px;
      }
      body.is-cockpit-view #tac-telemetry-bar { bottom: 20px; }
      .tac-bars-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; align-items: center; }
      .tac-meter { font-size: 10px; }
      .tac-meter-lbl { display: flex; justify-content: space-between; color: #cbd5e1; margin-bottom: 2px; font-weight: 600; }
      .tac-meter-track { height: 6px; background: rgba(255,255,255,0.12); border-radius: 3px; overflow: hidden; }
      .tac-meter-fill { height: 100%; transition: width 0.08s; }
      .tac-controls-row {
        display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; align-items: center;
      }
      .tac-pill-btn {
        border: 1px solid rgba(56, 189, 248, 0.35); background: rgba(15, 23, 42, 0.7);
        color: #cbd5e1; border-radius: 6px; padding: 3px 7px; font: 700 10px 'Orbitron', sans-serif;
        cursor: pointer; transition: all 0.12s;
      }
      .tac-pill-btn:hover { border-color: #38bdf8; color: #fff; }
      .tac-pill-btn.active { background: rgba(6, 182, 212, 0.25); border-color: #38bdf8; color: #67e8f9; }
      .tac-pill-btn.warn { background: rgba(245, 158, 11, 0.2); border-color: #f59e0b; color: #fde68a; }
      .tac-sep { width: 1px; height: 14px; background: rgba(255,255,255,0.16); margin: 0 2px; }

      /* Modals (Star Map, Station, Tow) */
      .tac-modal-backdrop {
        position: fixed; inset: 0; z-index: 60; background: rgba(3, 7, 18, 0.88);
        backdrop-filter: blur(14px); display: none; align-items: center; justify-content: center; padding: 16px;
        pointer-events: auto;
      }
      .tac-modal-backdrop.open { display: flex; }
      .tac-modal-card {
        background: linear-gradient(145deg, rgba(8, 16, 36, 0.98), rgba(14, 22, 42, 0.96));
        border: 1px solid rgba(56, 189, 248, 0.45); border-radius: 20px;
        width: min(980px, 100%); max-height: 90vh; overflow-y: auto;
        padding: 20px 22px; color: #f8fafc; box-shadow: 0 24px 80px rgba(0,0,0,0.9);
      }
      .tac-modal-head {
        display: flex; justify-content: space-between; align-items: center; gap: 12px;
        border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 12px; margin-bottom: 14px;
      }
      .tac-modal-head h2 {
        font-family: 'Orbitron', sans-serif; font-size: 18px; color: #38bdf8; margin: 0;
      }
      .tac-close-x {
        background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2);
        color: #cbd5e1; border-radius: 8px; padding: 5px 11px; cursor: pointer; font-weight: 800;
      }
      .tac-close-x:hover { color: #f87171; border-color: #f87171; }

      .tac-starmap-grid { display: grid; grid-template-columns: 1.25fr 1fr; gap: 16px; align-items: start; }
      #tac-starmap-canvas {
        width: 100%; height: auto; background: #030712; border-radius: 14px;
        border: 1px solid rgba(56, 189, 248, 0.3); cursor: pointer;
      }
      .tac-nav-list { display: flex; flex-direction: column; gap: 7px; max-height: 410px; overflow-y: auto; }
      .tac-nav-item {
        padding: 9px 11px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.03); color: inherit; font: inherit; text-align: left;
        cursor: pointer; transition: border-color 0.15s;
      }
      .tac-nav-item:hover, .tac-nav-item.selected {
        border-color: #38bdf8; background: rgba(56, 189, 248, 0.12);
      }
      .tac-nav-item-top { display: flex; justify-content: space-between; font-weight: 700; font-size: 13px; }
      .tac-nav-item-sub { display: block; font-size: 11px; color: #94a3b8; margin-top: 3px; }
      .tac-nav-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }

      .tac-btn {
        border: 1px solid #38bdf8; border-radius: 9px; background: rgba(6, 182, 212, 0.22);
        color: #e0f2fe; padding: 8px 14px; font: 700 11.5px 'Orbitron', sans-serif; cursor: pointer;
      }
      .tac-btn:hover:not(:disabled) { background: rgba(6, 182, 212, 0.45); color: #fff; }
      .tac-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      .tac-btn.gold { border-color: #f59e0b; background: rgba(245, 158, 11, 0.22); color: #fde68a; }
      .tac-btn.green { border-color: #10b981; background: rgba(16, 185, 129, 0.22); color: #a7f3d0; }

      .tac-tabs { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
      .tac-tab {
        padding: 7px 14px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.04); color: #94a3b8; font: 700 11px 'Orbitron', sans-serif; cursor: pointer;
      }
      .tac-tab.active { background: rgba(56, 189, 248, 0.22); border-color: #38bdf8; color: #e0f2fe; }
      .tac-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; }
      .tac-card {
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.11);
        border-radius: 12px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px;
      }
      .tac-card.owned { border-color: rgba(16, 185, 129, 0.45); }
      .tac-card h4 { margin: 0; font-size: 13px; color: #f8fafc; font-family: 'Orbitron', sans-serif; }
      .tac-card p { margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4; }
      .tac-swatch-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
      .tac-swatch {
        padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);
        background: rgba(255,255,255,0.05); color: #e2e8f0; font-size: 11px; cursor: pointer;
      }
      .tac-swatch.active { border-color: #38bdf8; background: rgba(56, 189, 248, 0.25); }

      /* Planet Surface Additions */
      #surface-rover-extras {
        display: flex; align-items: center; gap: 12px; margin: 8px 0 10px;
        padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(78, 207, 230, 0.28);
      }
      #surface-mini-radar { border-radius: 50%; border: 1px solid rgba(78, 207, 230, 0.5); background: #030d18; flex-shrink: 0; }

      @media (max-width: 1100px) {
        #tac-telemetry-bar { width: min(520px, calc(100vw - 32px)); min-width: 0; bottom: 84px; }
        #tac-mission-box { width: 210px; top: 68px; left: 10px; }
      }
      @media (pointer: coarse), (max-width: 720px) {
        #tac-telemetry-bar { display: none; }
        #tac-minimap-wrap { display: none; }
        .tac-starmap-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  buildDOM() {
    const root = document.createElement('div');
    root.id = 'tac-hud-root';
    root.innerHTML = `
      <div id="tac-mission-box">
        <div class="tac-box-head">
          <span>SECTOR TELEMETRY</span>
          <span class="tac-threat-pill" id="tac-threat-badge">THREAT LV 1</span>
        </div>
        <div id="tac-contracts-list" style="color:#94a3b8">No active contracts. Dock at any Space Station [N] to accept jobs.</div>
        <div id="tac-toast"></div>
      </div>

      <div id="tac-boss-bar">
        <div class="tac-boss-title">
          <span id="tac-boss-name">VOID DREADNOUGHT</span>
          <span id="tac-boss-hp-txt">100%</span>
        </div>
        <div class="tac-boss-track"><div class="tac-boss-fill" id="tac-boss-fill"></div></div>
      </div>

      <div id="tac-minimap-wrap">
        <canvas id="tac-minimap" width="128" height="128"></canvas>
        <div class="tac-minimap-caption" id="tac-minimap-cap">SECTOR RADAR</div>
      </div>

      <div id="tac-crosshair"><div class="tac-ch-ring"></div><div class="tac-ch-dot"></div></div>
      <div id="tac-hitmarker"></div>
      <div id="tac-mouse-cursor"></div>
      <div id="tac-target-layer"></div>

      <div id="tac-telemetry-bar">
        <div class="tac-bars-row">
          <div class="tac-meter">
            <div class="tac-meter-lbl"><span>HULL</span><span id="tac-hull-txt">100%</span></div>
            <div class="tac-meter-track"><div class="tac-meter-fill" id="tac-hull-fill" style="background:#10b981;width:100%"></div></div>
          </div>
          <div class="tac-meter">
            <div class="tac-meter-lbl"><span>SHIELD</span><span id="tac-shield-txt">100%</span></div>
            <div class="tac-meter-track"><div class="tac-meter-fill" id="tac-shield-fill" style="background:#38bdf8;width:100%"></div></div>
          </div>
          <div class="tac-meter">
            <div class="tac-meter-lbl"><span>BOOST</span><span id="tac-boost-txt">100%</span></div>
            <div class="tac-meter-track"><div class="tac-meter-fill" id="tac-boost-fill" style="background:#a855f7;width:100%"></div></div>
          </div>
          <div class="tac-meter">
            <div class="tac-meter-lbl"><span id="tac-wpn-lbl">PLASMA</span><span id="tac-heat-txt">0%</span></div>
            <div class="tac-meter-track"><div class="tac-meter-fill" id="tac-heat-fill" style="background:#f59e0b;width:0%"></div></div>
          </div>
        </div>
        <div class="tac-controls-row">
          <button type="button" class="tac-pill-btn" id="tac-btn-speed" title="Throttle / Speed">SPD 0</button>
          <button type="button" class="tac-pill-btn" id="tac-btn-weapon" title="Cycle Weapon [F]">WPN: PLASMA</button>
          <button type="button" class="tac-pill-btn" id="tac-btn-missile" title="Launch Missiles [M]">MSL 8/8</button>
          <button type="button" class="tac-pill-btn" id="tac-btn-flare" title="Deploy Countermeasure Flares [G]">FLARE 4</button>
          <span class="tac-pill-btn" id="tac-cargo-pill" style="cursor:default">ORE 0/20</span>
          <span class="tac-sep"></span>
          <button type="button" class="tac-pill-btn" id="tac-btn-autopilot" title="Toggle Autopilot [P]">AUTO</button>
          <button type="button" class="tac-pill-btn" id="tac-btn-autofire" title="Toggle Auto-Fire [H]">A-FIRE</button>
          <button type="button" class="tac-pill-btn" id="tac-btn-msteer" title="Toggle Mouse Steer [V]">M-STEER</button>
          <button type="button" class="tac-pill-btn" id="tac-btn-map" title="Open Star Map [N]">🗺️ MAP</button>
        </div>
        <div class="tac-controls-row">
          <span style="font-size:9px;color:#94a3b8;font-weight:700">FORM [1-4]:</span>
          <button type="button" class="tac-pill-btn active" data-form="arrowhead">Arrow</button>
          <button type="button" class="tac-pill-btn" data-form="wall">Wall</button>
          <button type="button" class="tac-pill-btn" data-form="echelon">Echelon</button>
          <button type="button" class="tac-pill-btn" data-form="orbit">Orbit</button>
          <span class="tac-sep"></span>
          <span style="font-size:9px;color:#94a3b8;font-weight:700">ORDERS [F1-F4]:</span>
          <button type="button" class="tac-pill-btn active" data-order="escort">Escort</button>
          <button type="button" class="tac-pill-btn" data-order="attack">Attack</button>
          <button type="button" class="tac-pill-btn" data-order="defend">Defend</button>
          <button type="button" class="tac-pill-btn" data-order="hunt">Hunt</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    this.root = root;

    // Wire telemetry quick buttons
    root.querySelector('#tac-btn-weapon').addEventListener('click', () => this.core.cycleWeapon());
    root.querySelector('#tac-btn-missile').addEventListener('click', () => this.core.fireMissile(this.core.ships[0], this.core.lockedTarget));
    root.querySelector('#tac-btn-flare').addEventListener('click', () => this.core.deployFlares());
    root.querySelector('#tac-btn-autopilot').addEventListener('click', () => this.core.toggleAutopilot());
    root.querySelector('#tac-btn-autofire').addEventListener('click', () => this.core.toggleAutoFire());
    root.querySelector('#tac-btn-msteer').addEventListener('click', () => this.core.toggleMouseSteer());
    root.querySelector('#tac-btn-map').addEventListener('click', () => this.openStarMap());

    root.querySelectorAll('[data-form]').forEach(btn => {
      btn.addEventListener('click', () => this.core.setFleetFormation(btn.dataset.form));
    });
    root.querySelectorAll('[data-order]').forEach(btn => {
      btn.addEventListener('click', () => this.core.setSquadronOrder(btn.dataset.order));
    });

    this.buildStarMapModal();
    this.buildStationModal();
    this.buildTowModal();
  }

  buildStarMapModal() {
    const modal = document.createElement('div');
    modal.id = 'star-map-modal';
    modal.className = 'tac-modal-backdrop';
    modal.innerHTML = `
      <div class="tac-modal-card">
        <div class="tac-modal-head">
          <h2>🗺️ Solar System Star Map &amp; Hyperdrive Navigation</h2>
          <button type="button" class="tac-close-x" id="tac-starmap-close">✕ Close [Esc]</button>
        </div>
        <div class="tac-starmap-grid">
          <div>
            <canvas id="tac-starmap-canvas" width="520" height="420"></canvas>
            <div class="tac-nav-actions" id="tac-starmap-actions"></div>
          </div>
          <div>
            <div class="tac-nav-list" id="tac-starmap-list"></div>
          </div>
        </div>
      </div>
    `;
    modal.querySelector('#tac-starmap-close').addEventListener('click', () => this.closeStarMap());
    modal.addEventListener('click', e => {
      if (e.target === modal) this.closeStarMap();
    });
    modal.querySelector('#tac-starmap-canvas').addEventListener('click', e => this.handleStarMapCanvasClick(e));
    document.body.appendChild(modal);
    this.starMapModal = modal;
  }

  buildStationModal() {
    const modal = document.createElement('div');
    modal.id = 'station-dock-modal';
    modal.className = 'tac-modal-backdrop';
    modal.innerHTML = `
      <div class="tac-modal-card">
        <div class="tac-modal-head">
          <div>
            <h2 id="station-modal-title">🛰️ Space Station</h2>
            <p id="station-modal-sub" style="margin:4px 0 0;font-size:12px;color:#94a3b8"></p>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <span id="station-credits-badge" style="font-family:Orbitron,sans-serif;color:#10b981;font-weight:800;font-size:14px">0 CR</span>
            <button type="button" class="tac-btn green" id="station-undock-btn">🚀 Undock</button>
          </div>
        </div>
        <div class="tac-tabs">
          <button type="button" class="tac-tab active" data-stab="services">🔧 Services &amp; Cargo</button>
          <button type="button" class="tac-tab" data-stab="shipyard">🚀 Shipyard &amp; Upgrades</button>
          <button type="button" class="tac-tab" data-stab="contracts">📜 Contracts Board</button>
        </div>
        <div id="station-tab-body"></div>
      </div>
    `;
    modal.querySelector('#station-undock-btn').addEventListener('click', () => this.core.undockFromStation());
    modal.querySelectorAll('[data-stab]').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeStationTab = tab.dataset.stab;
        modal.querySelectorAll('[data-stab]').forEach(t => t.classList.toggle('active', t === tab));
        this.renderStationModal();
      });
    });
    document.body.appendChild(modal);
    this.stationModal = modal;
  }

  buildTowModal() {
    const modal = document.createElement('div');
    modal.id = 'ship-tow-modal';
    modal.className = 'tac-modal-backdrop';
    modal.innerHTML = `
      <div class="tac-modal-card" style="max-width:480px;text-align:center">
        <div class="tac-modal-head" style="justify-content:center">
          <h2 id="tow-modal-title">🚨 Hull Breach — Emergency Tow</h2>
        </div>
        <p id="tow-modal-body" style="color:#cbd5e1;font-size:13px;line-height:1.55;margin:12px 0 18px"></p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap" id="tow-modal-actions"></div>
      </div>
    `;
    document.body.appendChild(modal);
    this.towModal = modal;
  }

  attachPlanetSurfaceExtras() {
    const panel = document.getElementById('planet-surface-panel');
    if (!panel || document.getElementById('surface-rover-extras')) return;
    const statusEl = panel.querySelector('#planet-surface-status');
    const extras = document.createElement('div');
    extras.id = 'surface-rover-extras';
    extras.innerHTML = `
      <canvas id="surface-mini-radar" width="96" height="96"></canvas>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px">
        <div class="tac-meter-lbl"><span>ROVER JUMP JET FUEL</span><span id="surface-jump-txt">100%</span></div>
        <div class="tac-meter-track"><div class="tac-meter-fill" id="surface-jump-fill" style="background:#38bdf8;width:100%"></div></div>
        <button type="button" id="surface-jump-btn" style="padding:6px 10px;font-size:12px">🚀 Fire Jump Jets · Space</button>
      </div>
    `;
    extras.querySelector('#surface-jump-btn').addEventListener('click', () => this.core.planetSurface?.triggerJumpJet());
    if (statusEl) panel.insertBefore(extras, statusEl);
    else panel.appendChild(extras);
  }

  updatePlanetSurfaceRadar() {
    this.attachPlanetSurfaceExtras();
    const ps = this.core.planetSurface;
    if (!ps?.active) return;
    const fuelEl = document.getElementById('surface-jump-fill');
    const txtEl = document.getElementById('surface-jump-txt');
    if (fuelEl) fuelEl.style.width = `${Math.round(ps.jumpFuel)}%`;
    if (txtEl) txtEl.textContent = `${Math.round(ps.jumpFuel)}%`;

    const canvas = document.getElementById('surface-mini-radar');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const data = ps.getRadarData();
    if (!data) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#041220';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(78, 207, 230, 0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, 44, 0, Math.PI * 2);
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.stroke();

    const range = 55;
    const plot = (wx, wz, color, size = 3.5) => {
      const dx = wx - data.roverX;
      const dz = wz - data.roverZ;
      const cos = Math.cos(data.roverYaw);
      const sin = Math.sin(data.roverYaw);
      const rx = dx * cos - dz * sin;
      const rz = dx * sin + dz * cos;
      const px = THREE.MathUtils.clamp(cx + (rx / range) * 42, 6, w - 6);
      const py = THREE.MathUtils.clamp(cy + (rz / range) * 42, 6, h - 6);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    };

    if (data.ship) plot(data.ship.x, data.ship.z, '#38bdf8', 3.5);
    if (data.outpost) plot(data.outpost.x, data.outpost.z, '#10b981', 3.5);
    if (data.city) plot(data.city.x, data.city.z, '#c084fc', 4);
    data.nodes.forEach(n => plot(n.x, n.z, n.kind === 'probe' ? '#fb923c' : '#fde047', 4));

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.closePath();
    ctx.fill();
  }

  showToast(msg, duration = 2.8) {
    const el = document.getElementById('tac-toast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    this.toastTimer = duration;
  }

  triggerHitMarker() {
    this.hitMarkerTimer = 0.14;
    const hm = document.getElementById('tac-hitmarker');
    if (hm) hm.style.opacity = '1';
  }

  openStarMap() {
    if (this.core.dockedStation || this.core.stationApproach || this.core.planetaryLanding || this.towModal.classList.contains('open')) return;
    this.core.clearFlightKeys();
    this.starMapModal.classList.add('open');
    this.renderStarMap();
    this.starMapModal.querySelector('#tac-starmap-close').focus({ preventScroll: true });
  }

  closeStarMap() {
    this.starMapModal.classList.remove('open');
  }

  getStarMapDestinations() {
    const items = [];
    const env = this.core.environment;
    if (!env) return items;
    env.stations.forEach(s => {
      items.push({
        id: s.id,
        kind: 'station',
        name: s.name,
        subtitle: `Space Station · ${s.specialty.toUpperCase()} · Ore ${Math.round(s.orePriceMult * 100)}%`,
        pos: s.mesh.position,
        ref: s,
        color: s.theme === 'refinery' ? '#f59e0b' : (s.theme === 'citadel' ? '#c084fc' : '#38bdf8')
      });
    });
    env.planets.forEach(p => {
      if (p.landingBody) {
        items.push({
          id: `orbit-${p.name}`,
          kind: 'orbit',
          name: p.name,
          subtitle: 'Gas Giant · Orbital waypoint',
          pos: p.mesh.position,
          ref: p,
          color: '#fbbf24'
        });
      }
      const landingBody = p.landingBody || p;
      const prog = this.core.planetProgress?.[p.name];
      const status = prog?.planetOwner
        ? `Owned (${prog.planetOwner})`
        : prog?.city
          ? 'City Chartered'
          : prog?.completed
            ? 'Surveyed ✅'
            : `Samples ${prog?.samples || 0}/3`;
      items.push({
        id: `planet-${p.name}`,
        kind: 'planet',
        name: p.landingLabel || p.name,
        subtitle: `${p.biome} · Threat: ${p.threat} · ${status}`,
        pos: landingBody.mesh.position,
        ref: landingBody,
        color: landingBody.color ? `#${landingBody.color.toString(16).padStart(6, '0')}` : '#38bdf8'
      });
    });
    env.wrecks.filter(w => !w.salvaged).forEach(w => {
      items.push({
        id: w.id,
        kind: 'wreck',
        name: w.name,
        subtitle: 'Derelict · Salvage',
        pos: w.mesh.position,
        ref: w,
        color: '#fbbf24'
      });
    });
    return items;
  }

  handleStarMapCanvasClick(e) {
    const canvas = document.getElementById('tac-starmap-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const scale = (Math.min(canvas.width, canvas.height) * 0.44) / SYSTEM_EDGE;

    let closest = null;
    let bestD = 26;
    for (const item of this.getStarMapDestinations()) {
      const sx = cx + item.pos.x * scale;
      const sy = cy + item.pos.z * scale;
      const d = Math.hypot(mx - sx, my - sy);
      if (d < bestD) {
        bestD = d;
        closest = item;
      }
    }
    if (closest) {
      this.selectedNavId = closest.id;
      this.renderStarMap();
    }
  }

  renderStarMap() {
    this.drawStarMapCanvas();
    this.renderStarMapSidebar();
  }

  drawStarMapCanvas() {
    if (!this.starMapModal.classList.contains('open')) return;
    const items = this.getStarMapDestinations();
    if (!this.selectedNavId && items.length) this.selectedNavId = items[0].id;
    const selected = items.find(i => i.id === this.selectedNavId) || items[0];
    const lead = this.core.ships[0];

    // Draw 2D Star Map Canvas
    const canvas = document.getElementById('tac-starmap-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const scale = (Math.min(w, h) * 0.44) / SYSTEM_EDGE;

      ctx.fillStyle = '#030816';
      ctx.fillRect(0, 0, w, h);

      // Sun
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();

      // Planet orbits & bodies
      this.core.environment?.planets.forEach(p => {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, p.dist * scale, 0, Math.PI * 2);
        ctx.stroke();
      });

      items.forEach(item => {
        const sx = cx + item.pos.x * scale;
        const sy = cy + item.pos.z * scale;
        const isSel = selected && item.id === selected.id;
        ctx.fillStyle = item.color;
        if (item.kind === 'station') {
          ctx.fillRect(sx - 5, sy - 5, 10, 10);
        } else {
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(5, (item.ref.radius || 70) * 0.055), 0, Math.PI * 2);
          ctx.fill();
        }
        if (isSel) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, sy, 13, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = isSel ? '#ffffff' : '#cbd5e1';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.name, sx, sy - 12);
      });

      // Player ship
      if (lead) {
        const px = cx + lead.pos.x * scale;
        const py = cy + lead.pos.z * scale;
        if (selected) {
          const tx = cx + selected.pos.x * scale;
          const ty = cy + selected.pos.z * scale;
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.fillStyle = '#54f5ee';
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Update live distances in sidebar without destroying clickable DOM buttons
    if (lead) {
      const listEl = document.getElementById('tac-starmap-list');
      items.forEach(item => {
        const distSpan = listEl?.querySelector(`[data-nav-dist="${item.id}"]`);
        if (distSpan) distSpan.textContent = `${Math.round(lead.pos.distanceTo(item.pos))} m`;
      });
    }
  }

  renderStarMapSidebar() {
    if (!this.starMapModal.classList.contains('open')) return;
    const items = this.getStarMapDestinations();
    if (!this.selectedNavId && items.length) this.selectedNavId = items[0].id;
    const selected = items.find(i => i.id === this.selectedNavId) || items[0];
    const lead = this.core.ships[0];

    const listEl = document.getElementById('tac-starmap-list');
    if (listEl) {
      listEl.innerHTML = items.map(item => {
        const dist = lead ? Math.round(lead.pos.distanceTo(item.pos)) : 0;
        const icon = { station: '🛰️', planet: '🪐', orbit: '🪐', wreck: '⚠️' }[item.kind];
        return `
          <button type="button" class="tac-nav-item ${selected?.id === item.id ? 'selected' : ''}" data-nav-id="${item.id}" aria-pressed="${selected?.id === item.id}">
            <span class="tac-nav-item-top">
              <span>${icon} ${item.name}</span>
              <span data-nav-dist="${item.id}" style="color:#38bdf8">${dist} m</span>
            </span>
            <span class="tac-nav-item-sub">${item.subtitle}</span>
          </button>
        `;
      }).join('');
      listEl.querySelectorAll('[data-nav-id]').forEach(el => {
        el.addEventListener('click', () => {
          this.selectedNavId = el.dataset.navId;
          this.renderStarMap();
          listEl.querySelector('.selected')?.focus({ preventScroll: true });
        });
      });
    }

    const actionsEl = document.getElementById('tac-starmap-actions');
    if (actionsEl && selected) {
      const onSurface = this.core.planetSurface?.active;
      const approach = selected.kind === 'station' ? '🛰️ Approach & Dock' : '🪐 Approach & Land';
      actionsEl.innerHTML = `
        ${onSurface ? '<p>Return to orbit to navigate to another destination.</p>' : `
          <button type="button" class="tac-btn gold" id="nav-warp-btn">⚡ Warp Jump to ${selected.name}</button>
          ${['station', 'planet'].includes(selected.kind) ? `<button type="button" class="tac-btn green" id="nav-approach-btn">${approach}</button>` : ''}
          <button type="button" class="tac-btn" id="nav-marker-btn">🧭 Set Nav Waypoint</button>
        `}
      `;
      actionsEl.querySelector('#nav-warp-btn')?.addEventListener('click', () => {
        this.closeStarMap();
        this.core.warpToDestination(selected.ref);
      });
      actionsEl.querySelector('#nav-approach-btn')?.addEventListener('click', () => {
        this.closeStarMap();
        if (selected.kind === 'station') this.core.beginStationDocking(selected.ref);
        else this.core.beginPlanetaryDescent(selected.ref);
      });
      actionsEl.querySelector('#nav-marker-btn')?.addEventListener('click', () => {
        this.core.navTarget = selected.ref;
        this.showToast(`Nav waypoint locked: ${selected.name}`);
        this.closeStarMap();
      });
    }
  }

  openStationModal(station) {
    this.activeStationTab = 'services';
    this.stationModal.querySelectorAll('[data-stab]').forEach(t => {
      t.classList.toggle('active', t.dataset.stab === 'services');
    });
    this.stationModal.classList.add('open');
    this.renderStationModal(station);
  }

  closeStationModal() {
    this.stationModal.classList.remove('open');
  }

  renderStationModal(station = this.core.dockedStation) {
    if (!station || !this.stationModal.classList.contains('open')) return;
    const titleEl = document.getElementById('station-modal-title');
    const subEl = document.getElementById('station-modal-sub');
    const crEl = document.getElementById('station-credits-badge');
    const body = document.getElementById('station-tab-body');

    const pilotBonuses = getPilotBonuses(this.core.pilotLife);
    titleEl.textContent = `🛰️ ${station.name}`;
    subEl.textContent = `${station.desc} · Connections Discount: ${pilotBonuses.discountPct}% · Ore Rate: ${Math.round(station.orePriceMult * 100)}%`;
    crEl.textContent = `${Math.floor(this.core.credits).toLocaleString()} CR`;

    const lead = this.core.ships[0];
    const stats = this.core.getActiveShipStats();

    if (this.activeStationTab === 'services') {
      const hullMissing = Math.max(0, Math.round(stats.maxHull - (lead?.hull ?? stats.maxHull)));
      const repairCost = Math.max(0, Math.round(hullMissing * 4 * pilotBonuses.discountMult));
      const mslMissing = Math.max(0, stats.missileMax - (this.core.missileAmmo ?? stats.missileMax));
      const mslCost = Math.round(mslMissing * 40 * pilotBonuses.discountMult);
      const flareMissing = Math.max(0, 4 - (this.core.flares ?? 4));
      const flareCost = Math.round(flareMissing * 35 * pilotBonuses.discountMult);
      const oreTons = this.core.oreCargo || 0;
      const oreUnitPrice = Math.round(115 * station.orePriceMult * (1 + pilotBonuses.connections * 0.03));
      const orePayout = oreTons * oreUnitPrice;

      body.innerHTML = `
        <div class="tac-cards-grid">
          <div class="tac-card">
            <h4>🔧 Hull Repair Bay</h4>
            <p>Current Hull: ${Math.round(lead?.hull ?? stats.maxHull)} / ${stats.maxHull}. Missing ${hullMissing} HP.</p>
            <button type="button" class="tac-btn green" id="srv-repair" ${hullMissing <= 0 || this.core.credits < repairCost ? 'disabled' : ''}>
              ${hullMissing <= 0 ? 'Hull at 100%' : `Repair Full (${repairCost.toLocaleString()} CR)`}
            </button>
          </div>
          <div class="tac-card">
            <h4>🎯 Ordnance &amp; Countermeasures</h4>
            <p>Missiles: ${this.core.missileAmmo}/${stats.missileMax} · Flares: ${this.core.flares}/4</p>
            <button type="button" class="tac-btn" id="srv-rearm" ${(mslMissing === 0 && flareMissing === 0) || this.core.credits < (mslCost + flareCost) ? 'disabled' : ''}>
              ${(mslMissing === 0 && flareMissing === 0) ? 'Ordnance Full' : `Rearm All (${(mslCost + flareCost).toLocaleString()} CR)`}
            </button>
          </div>
          <div class="tac-card">
            <h4>⛏️ Raw Ore Exchange</h4>
            <p>Cargo Hold: ${oreTons} / ${stats.cargoCap} tons · Station Bid: ${oreUnitPrice} CR/t</p>
            <button type="button" class="tac-btn gold" id="srv-sell-ore" ${oreTons <= 0 ? 'disabled' : ''}>
              ${oreTons <= 0 ? 'No Ore in Hold' : `Sell ${oreTons}t (+${orePayout.toLocaleString()} CR)`}
            </button>
          </div>
        </div>
      `;
      body.querySelector('#srv-repair')?.addEventListener('click', () => {
        if (hullMissing > 0 && this.core.credits >= repairCost) {
          this.core.credits -= repairCost;
          lead.hull = stats.maxHull;
          lead.shield = stats.maxShield;
          this.core.soundSystem?.playCashCoin?.();
          this.core.updateCreditsHud();
          this.core.savePilotRecord();
          this.renderStationModal(station);
        }
      });
      body.querySelector('#srv-rearm')?.addEventListener('click', () => {
        const total = mslCost + flareCost;
        if (this.core.credits >= total) {
          this.core.credits -= total;
          this.core.missileAmmo = stats.missileMax;
          this.core.flares = 4;
          this.core.soundSystem?.playCashCoin?.();
          this.core.updateCreditsHud();
          this.core.savePilotRecord();
          this.renderStationModal(station);
        }
      });
      body.querySelector('#srv-sell-ore')?.addEventListener('click', () => {
        if (oreTons > 0) {
          this.core.credits += orePayout;
          this.core.oreCargo = 0;
          this.core.soundSystem?.playCashCoin?.();
          this.showToast(`Sold ${oreTons}t ore for +${orePayout.toLocaleString()} CR!`);
          this.core.updateCreditsHud();
          this.core.savePilotRecord();
          this.renderStationModal(station);
        }
      });
    } else if (this.activeStationTab === 'shipyard') {
      const ownedShips = new Set(this.core.ownedShips || ['vanguard']);
      const ownedLiveries = new Set(this.core.ownedLiveries || ['starfleet-cyan']);

      const shipsHtml = SHIP_CLASS_ORDER.map(id => {
        const cls = SHIP_CLASSES[id];
        const isOwned = ownedShips.has(id);
        const isEquipped = this.core.shipClass === id;
        const cost = getShipCost(id, this.core.pilotLife);
        return `
          <div class="tac-card ${isEquipped ? 'owned' : ''}">
            <div>
              <h4>${cls.name}</h4>
              <p>${cls.role} · Hull ${cls.hull} · Shield ${cls.shield} · Spd ${cls.speed} · Cannons ${cls.cannons}</p>
              <p style="margin-top:4px">${cls.summary}</p>
            </div>
            <button type="button" class="tac-btn ${isEquipped ? 'green' : 'gold'}" data-ship-id="${id}" ${isEquipped || (!isOwned && this.core.credits < cost) ? 'disabled' : ''}>
              ${isEquipped ? 'Active Flagship' : isOwned ? 'Board Ship' : `Purchase (${cost.toLocaleString()} CR)`}
            </button>
          </div>
        `;
      }).join('');

      const upgradesHtml = UPGRADE_TRACKS.map(track => {
        const lv = stats.upgrades[track.id] || 0;
        const cost = getUpgradeCost(track.id, lv, this.core.pilotLife);
        return `
          <div class="tac-card">
            <div>
              <h4>${track.name} (Lv ${lv}/${track.maxLevel})</h4>
              <p>${track.effectText}</p>
            </div>
            <button type="button" class="tac-btn" data-upg-id="${track.id}" ${cost === null || this.core.credits < cost ? 'disabled' : ''}>
              ${cost === null ? 'Maxed Out' : `Upgrade (${cost.toLocaleString()} CR)`}
            </button>
          </div>
        `;
      }).join('');

      const liveryHtml = SHIP_LIVERIES.map(liv => {
        const owned = ownedLiveries.has(liv.id);
        const active = this.core.liveryId === liv.id;
        const cost = getLiveryCost(liv.id, this.core.pilotLife);
        return `
          <button type="button" class="tac-swatch ${active ? 'active' : ''}" data-liv-id="${liv.id}">
            ${liv.name} ${active ? '✓' : owned ? '(Owned)' : `(${cost.toLocaleString()} CR)`}
          </button>
        `;
      }).join('');

      const weaponHtml = WEAPON_ORDER.map(wid => {
        const w = WEAPON_TYPES[wid];
        const active = this.core.weaponId === wid;
        return `
          <button type="button" class="tac-swatch ${active ? 'active' : ''}" data-wpn-id="${wid}">
            ${w.name} ${active ? '✓' : ''}
          </button>
        `;
      }).join('');

      body.innerHTML = `
        <h3 style="margin:0 0 8px;font-size:13px;color:#38bdf8;font-family:Orbitron,sans-serif">Primary Weapon &amp; Hull Paint Livery</h3>
        <div class="tac-swatch-row">${weaponHtml}</div>
        <div class="tac-swatch-row" style="margin-bottom:14px">${liveryHtml}</div>
        <h3 style="margin:0 0 8px;font-size:13px;color:#38bdf8;font-family:Orbitron,sans-serif">Modular Ship Upgrades</h3>
        <div class="tac-cards-grid" style="margin-bottom:14px">${upgradesHtml}</div>
        <h3 style="margin:0 0 8px;font-size:13px;color:#fbbf24;font-family:Orbitron,sans-serif">Starship Classes</h3>
        <div class="tac-cards-grid">${shipsHtml}</div>
      `;

      body.querySelectorAll('[data-wpn-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.core.setWeapon(btn.dataset.wpnId);
          this.renderStationModal(station);
        });
      });
      body.querySelectorAll('[data-liv-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.core.buyOrSelectLivery(btn.dataset.livId);
          this.renderStationModal(station);
        });
      });
      body.querySelectorAll('[data-upg-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.core.buyShipUpgrade(btn.dataset.upgId);
          this.renderStationModal(station);
        });
      });
      body.querySelectorAll('[data-ship-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.core.buyOrEquipShip(btn.dataset.shipId);
          this.renderStationModal(station);
        });
      });
    } else {
      const contracts = this.core.contracts.getStationContracts(station, this.core.pilotLife, this.core.planetProgress);
      const active = this.core.contracts.activeContracts;

      const activeHtml = active.length
        ? active.map(c => `
            <div class="tac-card owned">
              <div>
                <h4>${c.title}</h4>
                <p>${c.desc}</p>
                <p style="color:#34d399;margin-top:4px">Progress: ${c.progress} / ${c.targetCount} · Reward: +${c.reward.toLocaleString()} CR</p>
              </div>
              <button type="button" class="tac-btn" data-abandon-id="${c.id}">Abandon</button>
            </div>
          `).join('')
        : '<p style="color:#94a3b8;font-size:12px">No active contracts. Accept up to 3 below.</p>';

      const boardHtml = contracts.map(c => `
        <div class="tac-card">
          <div>
            <h4>${c.title}</h4>
            <p>${c.desc}</p>
            <p style="color:#fbbf24;margin-top:4px">Payout: +${c.reward.toLocaleString()} CR</p>
          </div>
          <button type="button" class="tac-btn green" data-accept-id="${c.id}" ${active.length >= 3 ? 'disabled' : ''}>Accept Contract</button>
        </div>
      `).join('');

      body.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h3 style="margin:0;font-size:13px;color:#34d399;font-family:Orbitron,sans-serif">Active Contracts (${active.length}/3)</h3>
          <button type="button" class="tac-btn" id="ctr-refresh-btn">↻ Refresh Board</button>
        </div>
        <div class="tac-cards-grid" style="margin-bottom:14px">${activeHtml}</div>
        <h3 style="margin:0 0 8px;font-size:13px;color:#38bdf8;font-family:Orbitron,sans-serif">Available Station Contracts (Tier ${pilotBonuses.contractTier})</h3>
        <div class="tac-cards-grid">${boardHtml}</div>
      `;

      body.querySelector('#ctr-refresh-btn')?.addEventListener('click', () => {
        this.core.contracts.getStationContracts(station, this.core.pilotLife, this.core.planetProgress, true);
        this.renderStationModal(station);
      });
      body.querySelectorAll('[data-accept-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const res = this.core.contracts.acceptContract(station, btn.dataset.acceptId);
          if (res.accepted) {
            this.core.soundSystem?.playObjectiveDing?.();
            this.showToast(`Contract Accepted: ${res.accepted.title}`);
          }
          this.renderStationModal(station);
        });
      });
      body.querySelectorAll('[data-abandon-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.core.contracts.abandonContract(btn.dataset.abandonId);
          this.renderStationModal(station);
        });
      });
    }
  }

  showTowModal(info) {
    const titleEl = document.getElementById('tow-modal-title');
    const bodyEl = document.getElementById('tow-modal-body');
    const actionsEl = document.getElementById('tow-modal-actions');
    if (!titleEl || !bodyEl || !actionsEl) return;

    if (info.ironman) {
      titleEl.textContent = '💀 Ironman Career Ended';
      bodyEl.textContent = `${this.core.pilotLife.name}'s flagship suffered catastrophic hull failure in Ironman Mode. Final Kills: ${info.kills} · Worlds Surveyed: ${info.worlds}.`;
      actionsEl.innerHTML = `<button type="button" class="tac-btn gold" id="tow-reset-btn">Begin New Pilot Life</button>`;
      actionsEl.querySelector('#tow-reset-btn').addEventListener('click', () => {
        this.towModal.classList.remove('open');
        this.core.resetCareerAfterIronman();
      });
    } else {
      titleEl.textContent = '🚨 Emergency Station Tow Complete';
      bodyEl.textContent = `Your escape pod was recovered and towed to ${info.stationName}. ${info.fee > 0 ? `Emergency hull recovery fee: ${info.fee.toLocaleString()} CR.` : 'Covered by Starfleet relief insurance (no charge).'}`;
      actionsEl.innerHTML = `
        <button type="button" class="tac-btn green" id="tow-dock-btn">🛰️ Enter ${info.stationName}</button>
        <button type="button" class="tac-btn" id="tow-launch-btn">🚀 Resume Flight</button>
      `;
      actionsEl.querySelector('#tow-dock-btn').addEventListener('click', () => {
        this.towModal.classList.remove('open');
        if (info.station) this.core.enterDockedStation(info.station);
      });
      actionsEl.querySelector('#tow-launch-btn').addEventListener('click', () => {
        this.towModal.classList.remove('open');
      });
    }
    this.towModal.classList.add('open');
  }

  update(dt) {
    if (this.hitMarkerTimer > 0) {
      this.hitMarkerTimer -= dt;
      if (this.hitMarkerTimer <= 0) {
        const hm = document.getElementById('tac-hitmarker');
        if (hm) hm.style.opacity = '0';
      }
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) {
        const el = document.getElementById('tac-toast');
        if (el) el.style.display = 'none';
      }
    }

    if (this.core.planetSurface?.active) {
      this.lastSurfaceCheck += dt;
      if (this.lastSurfaceCheck >= 0.05) {
        this.lastSurfaceCheck = 0;
        this.updatePlanetSurfaceRadar();
      }
      return;
    }

    const lead = this.core.ships[0];
    const stats = this.core.getActiveShipStats();
    const flight = this.core.flightDynamics;
    if (!lead || !flight) return;

    // Update Telemetry Bars
    const hullPct = Math.round(((lead.hull ?? stats.maxHull) / Math.max(1, stats.maxHull)) * 100);
    const shieldPct = Math.round(((lead.shield ?? stats.maxShield) / Math.max(1, stats.maxShield)) * 100);
    const boostPct = Math.round((flight.boostEnergy / Math.max(1, flight.maxBoostEnergy)) * 100);
    const heatPct = Math.round(this.core.weaponHeat || 0);

    const setBar = (fillId, txtId, pct, textOverride) => {
      const f = document.getElementById(fillId);
      const t = document.getElementById(txtId);
      if (f) f.style.width = `${THREE.MathUtils.clamp(pct, 0, 100)}%`;
      if (t) t.textContent = textOverride ?? `${pct}%`;
    };
    setBar('tac-hull-fill', 'tac-hull-txt', hullPct, `${Math.round(lead.hull)}/${stats.maxHull}`);
    setBar('tac-shield-fill', 'tac-shield-txt', shieldPct, `${Math.round(lead.shield)}/${stats.maxShield}`);
    setBar('tac-boost-fill', 'tac-boost-txt', boostPct);
    setBar('tac-heat-fill', 'tac-heat-txt', heatPct, this.core.weaponOverheated ? 'HOT!' : `${heatPct}%`);

    const wpnDef = WEAPON_TYPES[this.core.weaponId] || WEAPON_TYPES.plasma;
    const wpnLbl = document.getElementById('tac-wpn-lbl');
    if (wpnLbl) wpnLbl.textContent = wpnDef.shortName;

    const spdBtn = document.getElementById('tac-btn-speed');
    if (spdBtn) spdBtn.textContent = `SPD ${Math.round(lead.vel.length())} · ${Math.round(flight.throttle * 100)}%`;

    const wpnBtn = document.getElementById('tac-btn-weapon');
    if (wpnBtn) wpnBtn.textContent = `WPN: ${wpnDef.shortName}`;

    const mslBtn = document.getElementById('tac-btn-missile');
    if (mslBtn) mslBtn.textContent = `MSL ${this.core.missileAmmo}/${stats.missileMax}`;

    const flrBtn = document.getElementById('tac-btn-flare');
    if (flrBtn) flrBtn.textContent = `FLARE ${this.core.flares}`;

    const cargoPill = document.getElementById('tac-cargo-pill');
    if (cargoPill) cargoPill.textContent = `ORE ${this.core.oreCargo || 0}/${stats.cargoCap}`;

    const autoBtn = document.getElementById('tac-btn-autopilot');
    if (autoBtn) {
      autoBtn.classList.toggle('active', !flight.manualFlight);
      autoBtn.textContent = flight.manualFlight ? 'MANUAL [P]' : 'AUTOPILOT [P]';
    }
    const afBtn = document.getElementById('tac-btn-autofire');
    if (afBtn) afBtn.classList.toggle('active', Boolean(this.core.autoFire));

    const msBtn = document.getElementById('tac-btn-msteer');
    if (msBtn) msBtn.classList.toggle('active', Boolean(flight.mouseSteer.active));

    // Sync active formation & order pills
    this.root.querySelectorAll('[data-form]').forEach(b => b.classList.toggle('active', b.dataset.form === flight.fleetFormation));
    this.root.querySelectorAll('[data-order]').forEach(b => b.classList.toggle('active', b.dataset.order === flight.squadronOrder));

    // Mouse-steer virtual cursor
    const mc = document.getElementById('tac-mouse-cursor');
    if (mc) {
      if (flight.mouseSteer.active) {
        mc.style.display = 'block';
        mc.style.left = `${(0.5 + flight.mouseSteer.nx * 0.5) * window.innerWidth}px`;
        mc.style.top = `${(0.5 + flight.mouseSteer.ny * 0.5) * window.innerHeight}px`;
      } else {
        mc.style.display = 'none';
      }
    }

    // Threat & Contracts box
    const threatEl = document.getElementById('tac-threat-badge');
    if (threatEl) threatEl.textContent = `THREAT LV ${this.core.contracts?.threatLevel || 1}`;
    const listEl = document.getElementById('tac-contracts-list');
    if (listEl) {
      const ctrs = this.core.contracts?.activeContracts || [];
      if (ctrs.length) {
        listEl.innerHTML = ctrs.map(c => `
          <div class="tac-contract-item">
            <div class="tac-contract-title"><span>${c.title}</span><span class="tac-contract-prog">${c.progress}/${c.targetCount}</span></div>
          </div>
        `).join('');
      } else {
        listEl.textContent = 'Free Flight · Dock at any Space Station [N] for Contracts.';
      }
    }

    // Boss health bar
    const boss = this.core.aliens.find(a => a.isBoss);
    const bossBar = document.getElementById('tac-boss-bar');
    if (bossBar) {
      if (boss) {
        bossBar.style.display = 'block';
        const pct = Math.max(0, Math.round((boss.health / boss.maxHealth) * 100));
        document.getElementById('tac-boss-name').textContent = `${boss.name || 'VOID DREADNOUGHT'} (${Math.round(lead.pos.distanceTo(boss.pos))}m)`;
        document.getElementById('tac-boss-hp-txt').textContent = `${pct}%`;
        document.getElementById('tac-boss-fill').style.width = `${pct}%`;
      } else {
        bossBar.style.display = 'none';
      }
    }

    // 3D Target Reticle & Lead Pip
    this.updateTargetOverlay(lead, wpnDef);

    // Minimap update (~15 Hz)
    this.minimapTimer += dt;
    if (this.minimapTimer >= 0.066) {
      this.minimapTimer = 0;
      this.drawMinimap(lead);
    }

    // Keep Star Map canvas animated without rebuilding sidebar buttons every frame
    if (this.starMapModal.classList.contains('open')) {
      this.drawStarMapCanvas();
    }
  }

  updateTargetOverlay(lead, wpnDef) {
    const layer = document.getElementById('tac-target-layer');
    if (!layer || !this.core.camera) return;
    const target = this.core.lockedTarget && this.core.aliens.includes(this.core.lockedTarget)
      ? this.core.lockedTarget
      : (this.core.aliens.find(a => a.isBoss) || null);

    if (!target) {
      layer.innerHTML = '';
      return;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    const dist = lead.pos.distanceTo(target.pos);
    const proj = target.pos.clone().project(this.core.camera);
    const isBehind = proj.z > 1.0;
    const sx = (proj.x * 0.5 + 0.5) * w;
    const sy = (-proj.y * 0.5 + 0.5) * h;

    let html = '';
    if (!isBehind && sx >= 28 && sx <= w - 28 && sy >= 28 && sy <= h - 28) {
      const hpPct = Math.max(0, Math.round((target.health / (target.maxHealth || 120)) * 100));
      const label = target.name || (target.isBoss ? 'VOID DREADNOUGHT' : 'HOSTILE');
      html += `
        <div class="tac-target-box ${target.isBoss ? 'is-boss' : ''}" style="left:${sx}px;top:${sy}px;">
          <div class="tac-target-hp"><div style="width:${hpPct}%"></div></div>
          <div class="tac-target-label">${label} · ${Math.round(dist)}m</div>
        </div>
      `;

      // Lead deflection pip
      const leadTime = Math.min(0.75, dist / (wpnDef?.speed || 950));
      const leadPos = target.pos.clone().addScaledVector(target.vel || new THREE.Vector3(), leadTime);
      const leadProj = leadPos.project(this.core.camera);
      if (leadProj.z <= 1.0) {
        const lx = (leadProj.x * 0.5 + 0.5) * w;
        const ly = (-leadProj.y * 0.5 + 0.5) * h;
        html += `<div class="tac-lead-pip" style="left:${lx}px;top:${ly}px;"></div>`;
      }
    } else {
      if (isBehind) {
        proj.x = -proj.x;
        proj.y = -proj.y;
      }
      const angle = Math.atan2(proj.y, proj.x);
      const ex = THREE.MathUtils.clamp(w / 2 + Math.cos(angle) * (w / 2 - 42), 36, w - 36);
      const ey = THREE.MathUtils.clamp(h / 2 - Math.sin(angle) * (h / 2 - 42), 36, h - 36);
      const deg = (-angle * 180) / Math.PI + 90;
      html += `<div class="tac-offscreen-ptr" style="left:${ex}px;top:${ey}px;transform:translate(-50%,-50%) rotate(${deg}deg)">▲</div>`;
    }
    layer.innerHTML = html;
  }

  drawMinimap(lead) {
    const canvas = document.getElementById('tac-minimap');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const range = 520;
    const radius = 58;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#040b18';
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    const invQuat = lead.mesh.quaternion.clone().invert();
    const plot = (pos, color, sz = 2.8, square = false) => {
      const rel = pos.clone().sub(lead.pos).applyQuaternion(invQuat);
      const d = Math.hypot(rel.x, rel.z);
      if (d > range * 1.6) return;
      const clamped = Math.min(d, range) / range * radius;
      const ang = Math.atan2(rel.x, -rel.z);
      const px = cx + Math.sin(ang) * clamped;
      const py = cy - Math.cos(ang) * clamped;
      ctx.fillStyle = color;
      if (square) {
        ctx.fillRect(px - sz, py - sz, sz * 2, sz * 2);
      } else {
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    this.core.environment?.stations.forEach(s => plot(s.mesh.position, '#38bdf8', 3.5, true));
    this.core.environment?.asteroids.forEach(a => {
      if (a.active && a.isMineable) plot(a.mesh.position, '#fbbf24', 1.8);
    });
    this.core.ships.slice(1).forEach(s => plot(s.pos, '#22c55e', 2.4));
    this.core.aliens.forEach(a => plot(a.pos, a.isBoss ? '#ff2a4f' : '#ef4444', a.isBoss ? 4.5 : 2.6));

    ctx.fillStyle = '#54f5ee';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.closePath();
    ctx.fill();
  }

  destroy() {
    this.root?.remove();
    this.starMapModal?.remove();
    this.stationModal?.remove();
    this.towModal?.remove();
    document.getElementById('tactical-hud-styles')?.remove();
  }
}
