// The Pipeline Mountain - Three.js Game

let scene, camera, renderer, clock;

let player;

let platforms = [];

let items = [];

let altitude = 0;

let medals = 0;

let gameActive = false;


// Physics parameters
let playerY = 0;

let playerX = 0;

let velocityY = 12;

const gravity = -20;

const jumpForce = 12;

const horizontalSpeed = 8;

let moveDirection = 0;
 // -1 = Left, 1 = Right

// DOM elements
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');

const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');

const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');

const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');

const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');

const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');

const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');

const altSpan = document.getElementById('game-alt');

const medalsSpan = document.getElementById('game-medals');

const finalAltSpan = document.getElementById('final-alt-val');


init();



// Expose VibeCodeWorker state
window.gameState = { title: "the-pipeline-mountain", get active() { return typeof gameActive !== "undefined" ? gameActive : true; } };

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


