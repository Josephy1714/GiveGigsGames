/* MADI shared touch rig — "Pipeline thumb-stick + summit buttons" (shared across 10 games).
 * Injected via <script src="../madi-touch-rig.js"></script> before each game.js.
 * Provides on touch/coarse-pointer devices:
 *  - Left analog thumb-stick (pipeline stick): sets common movement globals
 *    (moveDirection / rotateDir / moveDir), synthesizes Arrow/WASD key events,
 *    and calls movePlayer(dr,dc) on grid games with press-and-hold repeat.
 *  - Right summit buttons: JUMP/ACTION (Space/ArrowUp + jump()/triggerExtend()/
 *    fireBeam()/canvas tap) and INTERACT (Enter/KeyE + dialogue-advance tap).
 *  - Touch CSS (touch-action:none, no scroll/zoom/select, 44px+ targets).
 *  - Viewport meta hardening + tap-to-advance dialogue/overlays.
 * Safe no-op on desktop (fine pointer, no touch) and when already installed.
 */
(function () {
  try {
    if (window.__madiTouchRigInstalled) return;
    window.__madiTouchRigInstalled = true;

    var isTouchDevice = (function () {
      try {
        if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
        if ('ontouchstart' in window || (navigator && navigator.maxTouchPoints > 0)) return true;
      } catch (e) {}
      return false;
    })();
    if (!isTouchDevice) return;

    /* 1. Viewport hardening (static HTML also patched; this is the runtime backstop). */
    try {
      var meta = document.querySelector('meta[name="viewport"]');
      if (meta) {
        var content = meta.getAttribute('content') || '';
        if (content.indexOf('maximum-scale') === -1) content += ', maximum-scale=1.0';
        if (content.indexOf('user-scalable') === -1) content += ', user-scalable=no';
        if (content.indexOf('viewport-fit') === -1) content += ', viewport-fit=cover';
        meta.setAttribute('content', content.replace(/^,\s*/, ''));
      }
    } catch (e) {}

    /* 2. Shared touch CSS. */
    try {
      if (!document.getElementById('madi-touch-rig-css')) {
        var css = document.createElement('style');
        css.id = 'madi-touch-rig-css';
        css.textContent = [
          '.TEMPLATE-4weird-game-frame,.TEMPLATE-4weird-game-frame canvas,#TEMPLATE-4weird-gameCanvas{',
          'touch-action:none !important;overscroll-behavior:contain !important;',
          '-webkit-user-select:none !important;user-select:none !important;',
          '-webkit-tap-highlight-color:transparent !important;}',
          'body{overscroll-behavior-y:none !important;}',
          '#madi-rig{position:absolute;inset:auto 0 0 0;display:flex;justify-content:space-between;',
          'align-items:flex-end;padding:0 18px calc(16px + env(safe-area-inset-bottom));',
          'z-index:30;pointer-events:none;}',
          '#madi-rig.madi-hidden{display:none !important;}',
          '#madi-stick{pointer-events:auto;width:124px;height:124px;border-radius:50%;position:relative;',
          'background:radial-gradient(circle at 50% 35%,rgba(139,92,246,.28),rgba(6,182,212,.14) 70%,rgba(0,0,0,.35));',
          'border:2px solid rgba(139,92,246,.65);box-shadow:0 0 18px rgba(139,92,246,.35);touch-action:none;}',
          '#madi-knob{position:absolute;left:50%;top:50%;width:56px;height:56px;border-radius:50%;',
          'transform:translate(-50%,-50%);background:linear-gradient(135deg,#8b5cf6,#06b6d4);',
          'border:2px solid rgba(255,255,255,.7);box-shadow:0 4px 14px rgba(0,0,0,.5);}',
          '#madi-summit{display:flex;flex-direction:column;gap:10px;align-items:center;pointer-events:auto;}',
          '.madi-summit-btn{border-radius:50%;font-weight:800;color:#fff;cursor:pointer;',
          'font-family:Orbitron,Inter,system-ui,sans-serif;touch-action:manipulation;',
          'min-width:64px;min-height:64px;border:2px solid rgba(255,255,255,.65);}',
          '#madi-btn-jump{width:76px;height:76px;font-size:.8rem;',
          'background:linear-gradient(135deg,#10b981,#06b6d4);box-shadow:0 0 16px rgba(16,185,129,.5);}',
          '#madi-btn-act{width:64px;height:64px;font-size:.75rem;',
          'background:linear-gradient(135deg,#8b5cf6,#ec4899);box-shadow:0 0 16px rgba(139,92,246,.5);}',
          '.madi-summit-btn:active{transform:scale(.93);filter:brightness(1.25);}',
          /* Hide legacy per-game buttons when the unified rig is active. */
          '#mobile-controls.madi-superseded{display:none !important;}',
          '@media (max-width:640px){',
          '.TEMPLATE-4weird-game-frame{height:min(72vh,520px) !important;}',
          '#madi-stick{width:112px;height:112px;}#madi-btn-jump{width:72px;height:72px;}}'
        ].join('\n');
        document.head.appendChild(css);
      }
    } catch (e) {}

    function frame() {
      return document.querySelector('.TEMPLATE-4weird-game-frame') || document.body;
    }

    function keyEvent(type, code, key) {
      try {
        var ev;
        try {
          ev = new KeyboardEvent(type, { code: code, key: key, bubbles: true, cancelable: true });
        } catch (err) {
          ev = document.createEvent('Event');
          ev.initEvent(type, true, true);
          ev.code = code; ev.key = key;
        }
        window.dispatchEvent(ev);
        document.dispatchEvent(ev);
      } catch (e) {}
    }

    /* Track currently held directions so keyup is balanced. */
    var held = {};
    function setDir(code, key, down) {
      if (down && !held[code]) { held[code] = true; keyEvent('keydown', code, key); }
      else if (!down && held[code]) { held[code] = false; keyEvent('keyup', code, key); }
    }

    function setPollGlobals(x, y) {
      /* Continuous games poll these globals each frame. */
      try {
        if (typeof window.moveDirection !== 'undefined' || document.getElementById('btn-left')) {
          if (x < -0.3) window.moveDirection = -1;
          else if (x > 0.3) window.moveDirection = 1;
          else if (Math.abs(x) <= 0.3) window.moveDirection = 0;
        }
      } catch (e) {}
      try {
        if (typeof window.rotateDir !== 'undefined') {
          if (x < -0.3) window.rotateDir = (document.getElementById('btn-left') ? window.rotateDir : -1);
          else if (x > 0.3) window.rotateDir = 1;
          else window.rotateDir = 0;
        }
      } catch (e) {}
      try {
        if (typeof window.moveDir !== 'undefined') {
          if (x < -0.3) window.moveDir = -1;
          else if (x > 0.3) window.moveDir = 1;
          else window.moveDir = 0;
        }
      } catch (e) {}
      void y;
    }

    /* Grid-game (temple) movement with hold-to-repeat. */
    var repeatTimer = null;
    var lastGridDir = null;
    function gridStep(dx, dy) {
      try {
        if (typeof window.movePlayer === 'function') { window.movePlayer(dx, dy); return; }
        if (typeof movePlayer === 'function') { movePlayer(dx, dy); return; }
      } catch (e) {}
      if (dx === -1) { keyEvent('keydown', 'ArrowUp', 'ArrowUp'); }
      else if (dx === 1) { keyEvent('keydown', 'ArrowDown', 'ArrowDown'); }
      else if (dy === -1) { keyEvent('keydown', 'ArrowLeft', 'ArrowLeft'); }
      else if (dy === 1) { keyEvent('keydown', 'ArrowRight', 'ArrowRight'); }
    }
    function gridRepeatStart(dx, dy) {
      gridRepeatStop();
      lastGridDir = { dx: dx, dy: dy };
      gridStep(dx, dy);
      repeatTimer = setInterval(function () {
        try { gridStep(lastGridDir.dx, lastGridDir.dy); } catch (e) {}
      }, 220);
    }
    function gridRepeatStop() {
      if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = null; }
      lastGridDir = null;
    }

    function doJumpAction() {
      var handled = false;
      /* Prefer direct game functions when present. */
      try {
        if (typeof window.jump === 'function') { window.jump(); handled = true; }
        else if (typeof jump === 'function') { jump(); handled = true; }
      } catch (e) {}
      try {
        if (typeof window.triggerExtend === 'function') { window.triggerExtend(); handled = true; }
        else if (typeof triggerExtend === 'function') { triggerExtend(); handled = true; }
      } catch (e) {}
      try {
        if (typeof window.fireBeam === 'function') { window.fireBeam(); handled = true; }
        else if (typeof fireBeam === 'function') { fireBeam(); handled = true; }
      } catch (e) {}
      /* Fall back to synthesized Space/ArrowUp + canvas tap (covers runners). */
      keyEvent('keydown', 'Space', ' ');
      keyEvent('keyup', 'Space', ' ');
      keyEvent('keydown', 'ArrowUp', 'ArrowUp');
      keyEvent('keyup', 'ArrowUp', 'ArrowUp');
      if (!handled) {
        try {
          var canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
          if (canvas) {
            var r = canvas.getBoundingClientRect();
            var opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
            canvas.dispatchEvent(new MouseEvent('click', opts));
          }
        } catch (e) {}
      }
    }

    function doInteract() {
      /* Tap-to-advance dialogue: prefer explicit next/continue controls. */
      try {
        var dlg = document.querySelector(
          '#TEMPLATE-4weird-start-screen:not(.hidden) [data-next],.dialogue:not([hidden]) [data-next],' +
          '.dialogue-next,#dialogue-next,[data-dialogue-next],.story-next,#story-next'
        );
        if (dlg) { dlg.click(); return; }
      } catch (e) {}
      keyEvent('keydown', 'Enter', 'Enter');
      keyEvent('keyup', 'Enter', 'Enter');
      keyEvent('keydown', 'KeyE', 'e');
      keyEvent('keyup', 'KeyE', 'e');
      /* Also treat as canvas tap so tap-target games (scanner/claw/hub) advance. */
      try {
        var canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
        if (canvas) {
          var r = canvas.getBoundingClientRect();
          canvas.dispatchEvent(new MouseEvent('click', {
            bubbles: true, cancelable: true,
            clientX: r.left + r.width / 2, clientY: r.top + r.height / 2
          }));
        }
      } catch (e) {}
    }

    /* Tap-to-advance: tapping overlay body text advances dialogue instead of doing nothing. */
    try {
      document.addEventListener('touchend', function (e) {
        try {
          if (!e || !e.target) return;
          var t = e.target;
          if (t.closest && t.closest('#madi-rig')) return;
          if (t.closest && t.closest('button,a,input,textarea,select')) return;
          var overlay = t.closest && t.closest('.TEMPLATE-4weird-overlay-content');
          if (overlay) {
            var next = overlay.querySelector('[data-next],.dialogue-next,#dialogue-next,[data-dialogue-next]');
            if (next) { e.preventDefault(); next.click(); }
          }
        } catch (x) {}
      }, { passive: false });
    } catch (e) {}

    /* Double-tap-hold guard: prevent iOS double-tap zoom on the frame. */
    try {
      var lastTouchEnd = 0;
      document.addEventListener('touchend', function (e) {
        try {
          var now = Date.now();
          if (now - lastTouchEnd < 300) {
            if (e.target && e.target.closest && e.target.closest('.TEMPLATE-4weird-game-frame')) {
              e.preventDefault();
            }
          }
          lastTouchEnd = now;
        } catch (x) {}
      }, { passive: false });
    } catch (e) {}

    function build() {
      try {
        var host = frame();
        if (!host || document.getElementById('madi-rig')) return;
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

        /* Supersede legacy per-game buttons with the unified scheme. */
        try {
          var legacy = document.getElementById('mobile-controls');
          if (legacy) legacy.classList.add('madi-superseded');
        } catch (e) {}

        var rig = document.createElement('div');
        rig.id = 'madi-rig';
        rig.setAttribute('aria-label', 'MADI touch controls: pipeline thumb-stick and summit buttons');
        rig.innerHTML =
          '<div id="madi-stick" aria-label="Pipeline thumb-stick: drag to move or steer">' +
            '<div id="madi-knob"></div></div>' +
          '<div id="madi-summit">' +
            '<button class="madi-summit-btn" id="madi-btn-jump" aria-label="Jump or action">JUMP</button>' +
            '<button class="madi-summit-btn" id="madi-btn-act" aria-label="Interact or advance dialogue">ACT</button>' +
          '</div>';
        host.appendChild(rig);

        var stick = rig.querySelector('#madi-stick');
        var knob = rig.querySelector('#madi-knob');
        var stickRadius = 38;
        var activeTouch = null;
        var curX = 0, curY = 0;

        function applyStick(dx, dy) {
          var len = Math.sqrt(dx * dx + dy * dy);
          if (len > stickRadius) { dx = dx / len * stickRadius; dy = dy / len * stickRadius; }
          knob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
          curX = dx / stickRadius; curY = dy / stickRadius;
          var dead = 0.3;
          var left = curX < -dead, right = curX > dead, up = curY < -dead, down = curY > dead;
          setDir('ArrowLeft', 'ArrowLeft', left);
          setDir('ArrowRight', 'ArrowRight', right);
          setDir('ArrowUp', 'ArrowUp', up);
          setDir('ArrowDown', 'ArrowDown', down);
          setDir('KeyA', 'a', left);
          setDir('KeyD', 'd', right);
          setDir('KeyW', 'w', up);
          setDir('KeyS', 's', down);
          setPollGlobals(curX, curY);
          /* Grid games: dominant-axis step with hold repeat. */
          if (left || right || up || down) {
            var gx = 0, gy = 0;
            if (Math.abs(curX) >= Math.abs(curY)) gy = curX < 0 ? -1 : 1;
            else gx = curY < 0 ? -1 : 1;
            var sig = gx + ',' + gy;
            if (sig !== stick._sig) { stick._sig = sig; gridRepeatStart(gx, gy); }
          } else {
            stick._sig = null; gridRepeatStop();
          }
        }
        function releaseStick() {
          activeTouch = null; stick._sig = null;
          knob.style.transform = 'translate(-50%,-50%)';
          curX = 0; curY = 0;
          ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].forEach(function (c) {
            setDir(c, c, false);
          });
          setPollGlobals(0, 0);
          gridRepeatStop();
        }
        function stickPos(t) {
          var r = stick.getBoundingClientRect();
          return { dx: t.clientX - (r.left + r.width / 2), dy: t.clientY - (r.top + r.height / 2), id: t.identifier };
        }
        stick.addEventListener('touchstart', function (e) {
          try { e.preventDefault(); var t = e.changedTouches[0]; activeTouch = t.identifier; var p = stickPos(t); applyStick(p.dx, p.dy); } catch (x) {}
        }, { passive: false });
        stick.addEventListener('touchmove', function (e) {
          try {
            e.preventDefault();
            for (var i = 0; i < e.changedTouches.length; i++) {
              var t = e.changedTouches[i];
              if (t.identifier === activeTouch) { var p = stickPos(t); applyStick(p.dx, p.dy); }
            }
          } catch (x) {}
        }, { passive: false });
        function onTouchEnd(e) {
          try {
            for (var i = 0; i < e.changedTouches.length; i++) {
              if (e.changedTouches[i].identifier === activeTouch) releaseStick();
            }
          } catch (x) {}
        }
        stick.addEventListener('touchend', onTouchEnd);
        stick.addEventListener('touchcancel', onTouchEnd);
        /* Mouse fallback for hybrid laptops in touch mode. */
        stick.addEventListener('mousedown', function (e) {
          try {
            e.preventDefault();
            var r = stick.getBoundingClientRect();
            applyStick(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
            var mv = function (ev) {
              var rr = stick.getBoundingClientRect();
              applyStick(ev.clientX - (rr.left + rr.width / 2), ev.clientY - (rr.top + rr.height / 2));
            };
            var up = function () { releaseStick(); document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
            document.addEventListener('mousemove', mv);
            document.addEventListener('mouseup', up);
          } catch (x) {}
        });

        function bindHold(btn, fn) {
          btn.addEventListener('touchstart', function (e) { try { e.preventDefault(); fn(); } catch (x) {} }, { passive: false });
          btn.addEventListener('mousedown', function (e) { try { e.preventDefault(); fn(); } catch (x) {} });
          btn.addEventListener('touchend', function (e) { try { e.preventDefault(); } catch (x) {} }, { passive: false });
        }
        bindHold(rig.querySelector('#madi-btn-jump'), doJumpAction);
        bindHold(rig.querySelector('#madi-btn-act'), doInteract);

        /* Hide rig while a full overlay menu (pause/game-over) needs big tap targets —
           keep it visible on start screen so users discover touch before playing. */
        try {
          var pause = document.getElementById('TEMPLATE-4weird-pause-screen');
          var over = document.getElementById('TEMPLATE-4weird-game-over-screen');
          var syncVis = function () {
            var hide = (pause && !pause.classList.contains('hidden')) || (over && !over.classList.contains('hidden'));
            rig.classList.toggle('madi-hidden', !!hide);
          };
          setInterval(syncVis, 500);
        } catch (e) {}
      } catch (e) {}
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
    else build();
  } catch (e) {}
})();
