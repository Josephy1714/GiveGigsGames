(() => {
  const currentScript = document.currentScript;
  const libraryUrl = location.protocol === "file:"
    ? new URL("../../index.html#all-games", currentScript.src).href
    : `${location.origin}/ggg/#all-games`;
  const style = document.createElement("style");
  style.textContent = `
    #gg-game-select { position: fixed; z-index: 2147483647; top: max(12px, env(safe-area-inset-top)); left: max(12px, env(safe-area-inset-left));
      display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 13px; border: 1px solid #aaffd588; border-radius: 999px;
      background: #07111ddd; color: #eafff5; font: 700 12px/1 system-ui,sans-serif; letter-spacing: .01em; cursor: pointer;
      box-shadow: 0 5px 22px #0008; backdrop-filter: blur(12px); }
    #gg-game-select:hover,#gg-game-select:focus-visible { background:#123b30; outline:2px solid #aaffd5; outline-offset:2px }
    #gg-game-select svg { width:16px;height:16px;flex:none }
    @media(max-width:520px) { #gg-game-select { min-height:38px; padding:0 11px; font-size:11px } }
  `;
  document.head.append(style);
  const button = document.createElement("button");
  button.id = "gg-game-select";
  button.type = "button";
  button.setAttribute("aria-label", "Back to game select");
  button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14.5 5-7 7 7 7M8 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Game select</span>';
  button.addEventListener("click", () => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: "givegigsgames:back-to-select" }, "*");
    } else {
      location.href = libraryUrl;
    }
  });
  document.body.append(button);
})();
