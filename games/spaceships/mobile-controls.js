// Mobile controls — "Fly-stick + turret drag + ordnance thumb cluster"
// Virtual joystick fly (left thumb), drag-aim turret (right-half drag),
// FIRE / BOOST / MSL thumb buttons (right cluster), tap-to-target enemy,
// viewport/touch CSS + DPR cap, auto-pause overlay on hidden tab.

const STICK_RADIUS = 52;
const TAP_MAX_MS = 260;
const TAP_MAX_PX = 12;

function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ||
    window.matchMedia('(pointer: coarse)').matches;
}

function isEmbeddedOrBackground() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('embed') === 'true' ||
      params.get('bg') === 'true' ||
      params.get('hud') === 'false' ||
      params.get('controls') === 'false' ||
      document.body?.classList.contains('is-embedded-sim') ||
      document.documentElement?.classList.contains('is-embedded-sim');
  } catch {
    return false;
  }
}

function injectTouchCSS() {
  if (document.getElementById('sj-touch-css')) return;
  const style = document.createElement('style');
  style.id = 'sj-touch-css';
  style.textContent = `
  #starfield { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
  html.sj-touch, html.sj-touch body { overscroll-behavior: none; position: fixed; width: 100%; height: 100%; overflow: hidden; }
  .sj-ui { position: fixed; z-index: 40; pointer-events: none; font-family: 'Orbitron', system-ui, sans-serif; }
  .sj-ui button { pointer-events: auto; touch-action: none; -webkit-user-select: none; user-select: none; }
  #sj-stick-zone { left: max(14px, env(safe-area-inset-left)); bottom: max(86px, env(safe-area-inset-bottom)); width: 132px; height: 132px; pointer-events: auto; touch-action: none; }
  #sj-stick-base { position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(6,182,212,.45); background: radial-gradient(circle, rgba(6,182,212,.10), rgba(10,5,25,.55)); box-shadow: 0 0 18px rgba(6,182,212,.25); }
  #sj-stick-knob { position: absolute; left: 50%; top: 50%; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, rgba(6,182,212,.9), rgba(139,92,246,.75)); box-shadow: 0 0 14px rgba(6,182,212,.6); }
  #sj-ordnance { right: max(14px, env(safe-area-inset-right)); bottom: max(86px, env(safe-area-inset-bottom)); display: flex; align-items: flex-end; gap: 10px; pointer-events: auto; }
  .sj-btn { width: 64px; height: 64px; border-radius: 50%; border: 1px solid rgba(255,255,255,.25); color: #fff; font-weight: 800; font-size: 11px; letter-spacing: 1px; background: rgba(10,5,25,.6); backdrop-filter: blur(8px); }
  .sj-btn:active, .sj-btn.sj-held { transform: scale(.93); filter: brightness(1.35); }
  #sj-btn-fire { width: 84px; height: 84px; font-size: 13px; border-color: rgba(239,68,68,.7); background: radial-gradient(circle at 35% 30%, rgba(239,68,68,.85), rgba(120,20,20,.8)); box-shadow: 0 0 18px rgba(239,68,68,.5); }
  #sj-btn-boost { border-color: rgba(6,182,212,.7); box-shadow: 0 0 12px rgba(6,182,212,.4); }
  #sj-btn-msl { border-color: rgba(16,185,129,.7); box-shadow: 0 0 12px rgba(16,185,129,.4); }
  #sj-lock-toast { left: 50%; top: 76px; transform: translateX(-50%); color: #5ffaff; font-size: 12px; letter-spacing: 2px; text-shadow: 0 0 10px rgba(6,182,212,.8); opacity: 0; transition: opacity .25s; }
  #sj-pause-veil { inset: 0; display: none; align-items: center; justify-content: center; background: rgba(5,3,10,.72); color: #fff; font-size: 14px; letter-spacing: 2px; pointer-events: auto; text-align: center; padding: 24px; }
  @media (pointer: coarse) {
    .legend-panel, .controls-panel { display: none !important; }
    .hud-overlay { padding: 12px !important; }
    .credits-panel { min-width: 0 !important; padding: 8px 14px !important; }
    .credits-value { font-size: 1.05rem !important; }
  }`;
  document.head.appendChild(style);
}

export class MobileControls {
  constructor(core) {
    this.core = core;
    this.enabled = false;
    this.stickId = null;
    this.stickCenter = { x: 0, y: 0 };
    this.turretId = null;
    this.turretLast = { x: 0, y: 0 };
    this.tapStart = null;
    this.raycaster = null;
    this.elements = {};
  }

  init() {
    // DPR cap: keep phones at <=1.5 to hold 60fps; desktop keeps <=2.
    this.applyDprCap();
    if (!isTouchDevice() || isEmbeddedOrBackground()) return false;
    this.enabled = true;
    document.documentElement.classList.add('sj-touch');
    injectTouchCSS();
    this.buildUI();
    this.bindStick();
    this.bindOrdnance();
    this.bindTurretDragAndTap();
    this.bindAutoPause();
    // Ensure core touch state exists even on older saves.
    this.core.touch = this.core.touch || { stickX: 0, stickY: 0, fire: false, boost: false, turretYaw: 0, turretPitch: 0, lockedTarget: null, missileCooldown: 0 };
    this.core.touch.active = true;
    return true;
  }

  applyDprCap() {
    try {
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      const cap = coarse ? 1.5 : 2;
      if (this.core?.renderer) {
        this.core.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
      }
      this.dprCap = cap;
    } catch { /* ignore */ }
  }

  buildUI() {
    const mk = (tag, id, cls, parent = document.body) => {
      const el = document.createElement(tag);
      if (id) el.id = id;
      if (cls) el.className = cls;
      parent.appendChild(el);
      return el;
    };
    const stickZone = mk('div', 'sj-stick-zone', 'sj-ui');
    const base = mk('div', 'sj-stick-base', '', stickZone);
    const knob = mk('div', 'sj-stick-knob', '', stickZone);
    const ord = mk('div', 'sj-ordnance', 'sj-ui');
    const boost = mk('button', 'sj-btn-boost', 'sj-btn', ord);
    boost.textContent = 'BOOST';
    const msl = mk('button', 'sj-btn-msl', 'sj-btn', ord);
    msl.textContent = 'MSL';
    const fire = mk('button', 'sj-btn-fire', 'sj-btn', ord);
    fire.textContent = 'FIRE';
    const toast = mk('div', 'sj-lock-toast', 'sj-ui');
    const veil = mk('div', 'sj-pause-veil', 'sj-ui');
    veil.textContent = '⏸ PAUSED — tap to resume';
    this.elements = { stickZone, base, knob, ord, boost, msl, fire, toast, veil };
  }

  setKnob(dx, dy) {
    const len = Math.hypot(dx, dy) || 1;
    const cl = Math.min(len, STICK_RADIUS) / len;
    this.elements.knob.style.transform = `translate(${dx * cl}px, ${dy * cl}px)`;
  }

  bindStick() {
    const { stickZone } = this.elements;
    const core = this.core;
    const start = (e) => {
      const t = e.changedTouches ? e.changedTouches[0] : e;
      if (this.stickId !== null) return;
      this.stickId = t.identifier ?? 'mouse';
      const r = stickZone.getBoundingClientRect();
      this.stickCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      e.preventDefault();
    };
    const move = (e) => {
      const touches = e.changedTouches ? [...e.changedTouches] : [e];
      for (const t of touches) {
        if ((t.identifier ?? 'mouse') !== this.stickId) continue;
        const dx = t.clientX - this.stickCenter.x;
        const dy = t.clientY - this.stickCenter.y;
        const nx = Math.max(-1, Math.min(1, dx / STICK_RADIUS));
        const ny = Math.max(-1, Math.min(1, dy / STICK_RADIUS));
        core.touch.stickX = nx;
        core.touch.stickY = ny;
        this.setKnob(dx, dy);
        e.preventDefault();
      }
    };
    const end = (e) => {
      const touches = e.changedTouches ? [...e.changedTouches] : [e];
      for (const t of touches) {
        if ((t.identifier ?? 'mouse') !== this.stickId) continue;
        this.stickId = null;
        core.touch.stickX = 0;
        core.touch.stickY = 0;
        this.setKnob(0, 0);
      }
    };
    stickZone.addEventListener('touchstart', start, { passive: false });
    stickZone.addEventListener('touchmove', move, { passive: false });
    stickZone.addEventListener('touchend', end);
    stickZone.addEventListener('touchcancel', end);
  }

  holdButton(el, on, off) {
    el.addEventListener('touchstart', (e) => { el.classList.add('sj-held'); on(); e.preventDefault(); }, { passive: false });
    const release = (e) => { el.classList.remove('sj-held'); off(); };
    el.addEventListener('touchend', release);
    el.addEventListener('touchcancel', release);
    // Mouse fallback for desktop testing.
    el.addEventListener('mousedown', (e) => { el.classList.add('sj-held'); on(); });
    el.addEventListener('mouseup', release);
  }

  bindOrdnance() {
    const { fire, boost, msl } = this.elements;
    const core = this.core;
    this.holdButton(fire, () => { core.touch.fire = true; }, () => { core.touch.fire = false; });
    this.holdButton(boost, () => { core.touch.boost = true; }, () => { core.touch.boost = false; });
    msl.addEventListener('touchstart', (e) => { core.fireMissile(core.ships[0], core.touch.lockedTarget); e.preventDefault(); }, { passive: false });
    msl.addEventListener('mousedown', () => core.fireMissile(core.ships[0], core.touch.lockedTarget));
  }

  bindTurretDragAndTap() {
    const canvas = document.getElementById('starfield');
    if (!canvas || !window.THREE) return;
    this.raycaster = new window.THREE.Raycaster();
    canvas.style.touchAction = 'none';
    canvas.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        // Right-half touches aim the turret; left-half belongs to the fly-stick.
        if (t.clientX < window.innerWidth * 0.4) continue;
        if (this.turretId === null) {
          this.turretId = t.identifier;
          this.turretLast = { x: t.clientX, y: t.clientY };
          this.tapStart = { x: t.clientX, y: t.clientY, time: performance.now(), id: t.identifier };
        }
      }
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.turretId) continue;
        const dx = t.clientX - this.turretLast.x;
        const dy = t.clientY - this.turretLast.y;
        this.turretLast = { x: t.clientX, y: t.clientY };
        const c = this.core;
        // Drag right => yaw turret right; drag up => elevate.
        c.touch.turretYaw = THREE.MathUtils.clamp((c.touch.turretYaw || 0) - dx * 0.005, -1.2, 1.2);
        c.touch.turretPitch = THREE.MathUtils.clamp((c.touch.turretPitch || 0) - dy * 0.004, -0.45, 0.55);
        if (this.tapStart && Math.hypot(t.clientX - this.tapStart.x, t.clientY - this.tapStart.y) > TAP_MAX_PX) this.tapStart = null;
        e.preventDefault();
      }
    }, { passive: false });
    const touchEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this.turretId) continue;
        this.turretId = null;
        if (this.tapStart && performance.now() - this.tapStart.time < TAP_MAX_MS) this.tapToTarget(t.clientX, t.clientY);
        this.tapStart = null;
      }
    };
    canvas.addEventListener('touchend', touchEnd);
    canvas.addEventListener('touchcancel', touchEnd);
  }

  tapToTarget(cx, cy) {
    const core = this.core;
    if (!core.camera || !this.raycaster) return;
    const ndc = new window.THREE.Vector2((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, core.camera);
    // Generous threshold so taps hit small distant ships.
    this.raycaster.params.Points = { threshold: 30 };
    const meshes = core.aliens.map((a) => a.mesh);
    const hits = this.raycaster.intersectObjects(meshes, true);
    if (!hits.length) return;
    let obj = hits[0].object;
    while (obj && !obj.userData.isShipRoot && obj.parent) obj = obj.parent;
    const alien = core.aliens.find((a) => a.mesh === obj) ||
      core.aliens.reduce((best, a) => (!best || a.pos.distanceToSquared(core.ships[0].pos) < best.pos.distanceToSquared(core.ships[0].pos)) ? a : best, null);
    if (alien && core.ships[0].pos.distanceToSquared(alien.pos) < 900 * 900) {
      core.setLockedTarget(alien);
      const toast = this.elements.toast;
      toast.textContent = `◉ LOCK ${alien.id.toUpperCase()}`;
      toast.style.opacity = '1';
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => { toast.style.opacity = '0'; }, 1200);
    }
  }

  bindAutoPause() {
    const veil = this.elements.toast && this.elements['veil'] ? this.elements['veil'] : this.elements.veil;
    const show = () => { if (veil) veil.style.display = 'flex'; };
    const hide = () => { if (veil) veil.style.display = 'none'; };
    // Core already stops the loop on hidden; the veil makes it explicit + tappable.
    this.core.onAutoPause = (paused) => (paused ? show() : hide());
    if (veil) {
      veil.addEventListener('touchstart', (e) => { this.core.start(); hide(); e.preventDefault(); }, { passive: false });
      veil.addEventListener('mousedown', () => { this.core.start(); hide(); });
    }
  }

  destroy() {
    for (const el of Object.values(this.elements)) el?.remove?.();
    this.elements = {};
    document.documentElement.classList.remove('sj-touch');
    document.getElementById('sj-touch-css')?.remove();
  }
}
