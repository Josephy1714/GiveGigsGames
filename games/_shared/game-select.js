(() => {
  const currentScript = document.currentScript;
  const libraryUrl = location.protocol === "file:"
    ? new URL("../../index.html#all-games", currentScript.src).href
    : `${location.origin}/ggg/#all-games`;
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = new URL("game-interface.css", currentScript.src).href;
  document.head.append(stylesheet);
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
