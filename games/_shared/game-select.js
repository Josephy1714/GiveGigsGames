(() => {
  const currentScript = document.currentScript;
  const optionalFonts = document.querySelectorAll("link[data-optional-fonts]");
  if (optionalFonts.length) {
    const loadFonts = () => {
      setTimeout(() => {
        for (const link of optionalFonts) link.href = link.dataset.optionalFonts;
      }, 0);
    };
    if (document.readyState === "complete") loadFonts();
    else window.addEventListener("load", loadFonts, { once: true });
  }
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = new URL("game-interface.css", currentScript.src).href;
  document.head.append(stylesheet);
  const gamepadScript = document.createElement("script");
  gamepadScript.src = new URL("gamepad-adapter.js", currentScript.src).href;
  gamepadScript.defer = true;
  document.head.append(gamepadScript);
})();
