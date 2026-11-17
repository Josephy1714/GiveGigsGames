// The MADI AI Universe - Three.js Interactive Hub

let scene, camera, renderer;

let coreGlobe;

let regions = [];

let tooltip = document.getElementById('map-tooltip');


init();



// Expose VibeCodeWorker state
window.gameState = { title: "the-madi-ai-universe", get active() { return typeof gameActive !== "undefined" ? gameActive : true; } };

window.game = window.gameState;


/* fourweird-fullscreen-patch: refit canvas on fullscreen transitions (button/F/dblclick handled in index.html). */
(function () {
  'use strict';
  try {
    function fwRefit() {
      try {
        if (typeof onWindowResize === 'function') { onWindowResize(); }
      } catch (e) {}
      try {
        var fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (document.body) { document.body.classList.toggle('is-fullscreen', fs); }
        var f = document.querySelector('.TEMPLATE-4weird-game-frame');
        if (f) { f.classList.toggle('is-fullscreen', fs); }
      } catch (e) {}
    }
    document.addEventListener('fullscreenchange', fwRefit);
    document.addEventListener('webkitfullscreenchange', fwRefit);
    window.addEventListener('fourweird-fullscreen', fwRefit);
  } catch (e) {}
})();


