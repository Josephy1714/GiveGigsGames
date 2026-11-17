// The Lost City of Customers - Three.js Game

let scene, camera, renderer;

let terrainTiles = [];

let targets = [];

let scanWave = null;

let foundCount = 0;

let totalScans = 0;

let gameActive = false;


// Grid layout parameters
const rows = 8;

const cols = 8;

const size = 2;


// DOM Elements
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');

const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');

const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');

const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');

const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');

const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');

const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');

const foundSpan = document.getElementById('found-count');

const scanSpan = document.getElementById('scan-count');


init();



// Expose VibeCodeWorker state
window.gameState = { title: "the-lost-city-of-customers", get active() { return typeof gameActive !== "undefined" ? gameActive : true; } };

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


