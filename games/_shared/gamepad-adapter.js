(() => {
  if (window.__ggGamepadAdapterLoaded) return;
  window.__ggGamepadAdapterLoaded = true;

  const DEADZONE = 0.35;
  const CURSOR_DEADZONE = 0.2;
  const CURSOR_SPEED = 11;

  const BUTTON_KEY_MAP = [
    { index: 0, key: " ", code: "Space", keyCode: 32 },          // A / Cross
    { index: 1, key: "Escape", code: "Escape", keyCode: 27 },    // B / Circle
    { index: 2, key: "z", code: "KeyZ", keyCode: 90 },           // X / Square
    { index: 3, key: "x", code: "KeyX", keyCode: 88 },           // Y / Triangle
    { index: 4, key: "q", code: "KeyQ", keyCode: 81 },           // L1 / LB
    { index: 5, key: "e", code: "KeyE", keyCode: 69 },           // R1 / RB
    { index: 8, key: "p", code: "KeyP", keyCode: 80 },           // Select / Back
    { index: 9, key: "Enter", code: "Enter", keyCode: 13 },      // Start / Menu
    { index: 12, key: "ArrowUp", code: "ArrowUp", keyCode: 38 }, // D-Pad Up
    { index: 13, key: "ArrowDown", code: "ArrowDown", keyCode: 40 }, // D-Pad Down
    { index: 14, key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 }, // D-Pad Left
    { index: 15, key: "ArrowRight", code: "ArrowRight", keyCode: 39 } // D-Pad Right
  ];

  const heldKeys = new Set();
  let prevTriggerClick = false;
  let prevSiteA = false;
  let prevSiteB = false;
  let prevMenuToggle = false;
  let siteMenuActive = false;
  let lastNavAt = 0;
  let rafId = 0;
  let cursorEl = null;
  let cursorX = window.innerWidth / 2;
  let cursorY = window.innerHeight / 2;
  let cursorVisible = false;

  function showToast(text) {
    const toast = document.createElement("div");
    toast.textContent = text;
    toast.style.cssText =
      "position:fixed;left:14px;bottom:14px;z-index:2147483647;padding:8px 14px;" +
      "border-radius:999px;background:rgba(15,23,42,0.92);color:#f8fafc;" +
      "border:1px solid rgba(148,163,184,0.45);font:600 13px/1.2 system-ui,sans-serif;" +
      "pointer-events:none;box-shadow:0 6px 20px rgba(0,0,0,0.35);transition:opacity 0.35s ease;";
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 400);
    }, 2600);
  }

  function ensureCursor() {
    if (cursorEl) return cursorEl;
    cursorEl = document.createElement("div");
    cursorEl.id = "gg-gamepad-cursor";
    cursorEl.style.cssText =
      "position:fixed;left:0;top:0;width:18px;height:18px;margin:-9px 0 0 -9px;" +
      "border-radius:50%;border:2px solid #38bdf8;background:rgba(56,189,248,0.28);" +
      "box-shadow:0 0 10px rgba(56,189,248,0.65);pointer-events:none;" +
      "z-index:2147483646;display:none;transform:translate3d(0,0,0);";
    document.body.appendChild(cursorEl);
    return cursorEl;
  }

  function updateCursorPosition(dx, dy) {
    const el = ensureCursor();
    cursorX = Math.max(0, Math.min(window.innerWidth - 1, cursorX + dx));
    cursorY = Math.max(0, Math.min(window.innerHeight - 1, cursorY + dy));
    if (!cursorVisible) {
      cursorVisible = true;
      el.style.display = "block";
    }
    el.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;

    const target = document.elementFromPoint(cursorX, cursorY) || document.body;
    const moveInit = {
      bubbles: true,
      cancelable: true,
      clientX: cursorX,
      clientY: cursorY,
      view: window
    };
    target.dispatchEvent(new PointerEvent("pointermove", moveInit));
    target.dispatchEvent(new MouseEvent("mousemove", moveInit));
  }

  function dispatchClickAtCursor() {
    const target = document.elementFromPoint(cursorX, cursorY);
    if (!target) return;
    const init = {
      bubbles: true,
      cancelable: true,
      clientX: cursorX,
      clientY: cursorY,
      button: 0,
      buttons: 1,
      view: window
    };
    target.dispatchEvent(new PointerEvent("pointerdown", init));
    target.dispatchEvent(new MouseEvent("mousedown", init));
    target.dispatchEvent(new PointerEvent("pointerup", { ...init, buttons: 0 }));
    target.dispatchEvent(new MouseEvent("mouseup", { ...init, buttons: 0 }));
    target.dispatchEvent(new MouseEvent("click", { ...init, buttons: 0 }));
    if (typeof target.focus === "function") target.focus({ preventScroll: true });
  }

  function emitKey(type, def) {
    const evt = new KeyboardEvent(type, {
      key: def.key,
      code: def.code,
      keyCode: def.keyCode,
      which: def.keyCode,
      bubbles: true,
      cancelable: true
    });
    const target = document.activeElement && document.activeElement !== document.body
      ? document.activeElement
      : document;
    target.dispatchEvent(evt);
  }

  function setKeyState(def, pressed) {
    const id = def.code;
    const wasPressed = heldKeys.has(id);
    if (pressed && !wasPressed) {
      heldKeys.add(id);
      emitKey("keydown", def);
    } else if (!pressed && wasPressed) {
      heldKeys.delete(id);
      emitKey("keyup", def);
    }
  }

  function releaseAllKeys() {
    for (const code of Array.from(heldKeys)) {
      const def = BUTTON_KEY_MAP.find((b) => b.code === code);
      heldKeys.delete(code);
      if (def) emitKey("keyup", def);
    }
  }

  function getConnectedGamepad() {
    try {
      return Array.from(navigator.getGamepads?.() || []).find(pad => pad?.connected);
    } catch {
      // Some embeds disable the Gamepad API through their permissions policy.
      return undefined;
    }
  }

  function poll() {
    const pad = getConnectedGamepad();
    if (!pad || document.hidden) {
      releaseAllKeys();
      rafId = 0;
      return;
    }

    if (pad) {
      const axes = pad.axes || [];
      const lx = axes[0] || 0;
      const ly = axes[1] || 0;
      const rx = axes[2] || 0;
      const ry = axes[3] || 0;

      // D-pad + Left Stick combined for directional keys
      const up = (pad.buttons[12] && pad.buttons[12].pressed) || ly < -DEADZONE;
      const down = (pad.buttons[13] && pad.buttons[13].pressed) || ly > DEADZONE;
      const left = (pad.buttons[14] && pad.buttons[14].pressed) || lx < -DEADZONE;
      const right = (pad.buttons[15] && pad.buttons[15].pressed) || lx > DEADZONE;

      setKeyState({ key: "ArrowUp", code: "ArrowUp", keyCode: 38 }, up);
      setKeyState({ key: "ArrowDown", code: "ArrowDown", keyCode: 40 }, down);
      setKeyState({ key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 }, left);
      setKeyState({ key: "ArrowRight", code: "ArrowRight", keyCode: 39 }, right);

      for (const def of BUTTON_KEY_MAP) {
        if (def.index >= 12) continue; // handled above
        const btn = pad.buttons[def.index];
        const pressed = !!(btn && (btn.pressed || btn.value > 0.5));
        setKeyState(def, pressed);
      }

      // Right stick virtual mouse cursor
      if (Math.abs(rx) > CURSOR_DEADZONE || Math.abs(ry) > CURSOR_DEADZONE) {
        updateCursorPosition(
          Math.abs(rx) > CURSOR_DEADZONE ? rx * CURSOR_SPEED : 0,
          Math.abs(ry) > CURSOR_DEADZONE ? ry * CURSOR_SPEED : 0
        );
      }

      // R2 (7) or R3 (11) clicks at virtual cursor
      const r2 = pad.buttons[7] && (pad.buttons[7].pressed || pad.buttons[7].value > 0.5);
      const r3 = pad.buttons[11] && pad.buttons[11].pressed;
      const triggerClick = !!(r2 || r3);
      if (triggerClick && !prevTriggerClick) {
        dispatchClickAtCursor();
      }
      prevTriggerClick = triggerClick;

      // Site navigation mode on non-canvas pages
      if (!document.querySelector("canvas")) {
        const gameFrame = document.getElementById("game-frame");
        const hasActiveGameFrame = !!(gameFrame && !gameFrame.hidden && gameFrame.offsetParent !== null);
        const openDialog = document.querySelector("dialog[open]");

        // On play.html, Select+Start (8+9) or Guide (16) toggles between game iframe and top menu bar
        const selectPressed = !!(pad.buttons[8] && pad.buttons[8].pressed);
        const startPressed = !!(pad.buttons[9] && pad.buttons[9].pressed);
        const guidePressed = !!(pad.buttons[16] && pad.buttons[16].pressed);
        const menuToggle = (selectPressed && startPressed) || guidePressed;
        if (hasActiveGameFrame && !openDialog && menuToggle && !prevMenuToggle) {
          siteMenuActive = !siteMenuActive;
          if (siteMenuActive) {
            const firstBarBtn = document.querySelector(".player-bar a[href], .player-bar button:not([disabled])");
            if (firstBarBtn) {
              try { firstBarBtn.focus({ preventScroll: false, focusVisible: true }); } catch { firstBarBtn.focus(); }
            }
            showToast("🎮 Menu bar focused (Select+Start to return)");
          } else {
            gameFrame.focus();
            showToast("🎮 Game focused");
          }
        }
        prevMenuToggle = menuToggle;

        const siteNavEnabled = !hasActiveGameFrame || !!openDialog || siteMenuActive;

        if (siteNavEnabled) {
          const now = performance.now();
          if ((up || down || left || right) && now - lastNavAt > 180) {
            lastNavAt = now;
            const scope = openDialog || document;
            const focusables = Array.from(
              scope.querySelectorAll(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
              )
            ).filter((el) => el.offsetParent !== null);
            if (focusables.length > 0) {
              const idx = focusables.indexOf(document.activeElement);
              const delta = down || right ? 1 : -1;
              const next = idx === -1
                ? focusables[0]
                : focusables[(idx + delta + focusables.length) % focusables.length];
              try {
                next.focus({ preventScroll: false, focusVisible: true });
              } catch {
                next.focus({ preventScroll: false });
              }
              next.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
          }

          const aPressed = !!(pad.buttons[0] && pad.buttons[0].pressed);
          if (aPressed && !prevSiteA && document.activeElement && document.activeElement !== document.body) {
            const active = document.activeElement;
            if (active.tagName === "SELECT" && active.options && active.options.length > 0) {
              active.selectedIndex = (active.selectedIndex + 1) % active.options.length;
              active.dispatchEvent(new Event("change", { bubbles: true }));
            } else {
              active.click();
            }
          }
          prevSiteA = aPressed;

          const bPressed = !!(pad.buttons[1] && pad.buttons[1].pressed);
          if (bPressed && !prevSiteB) {
            if (openDialog && typeof openDialog.close === "function") {
              openDialog.close();
            } else if (siteMenuActive && hasActiveGameFrame) {
              siteMenuActive = false;
              gameFrame.focus();
              showToast("🎮 Game focused");
            } else if (history.length > 1) {
              history.back();
            }
          }
          prevSiteB = bPressed;
        } else {
          prevSiteA = !!(pad.buttons[0] && pad.buttons[0].pressed);
          prevSiteB = !!(pad.buttons[1] && pad.buttons[1].pressed);
        }
      }
    }

    rafId = requestAnimationFrame(poll);
  }

  function startPolling() {
    if (!rafId && !document.hidden && getConnectedGamepad()) {
      rafId = requestAnimationFrame(poll);
    }
  }

  window.addEventListener("gamepadconnected", (e) => {
    const name = e.gamepad && e.gamepad.id ? e.gamepad.id.split("(")[0].trim() : "Controller";
    showToast(`🎮 ${name} connected`);
    startPolling();
  });

  window.addEventListener("gamepaddisconnected", () => {
    if (!getConnectedGamepad()) {
      releaseAllKeys();
      if (cursorEl) cursorEl.style.display = "none";
      cursorVisible = false;
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) releaseAllKeys();
    else startPolling();
  });

  // In case a controller was already connected before page load
  startPolling();
})();
