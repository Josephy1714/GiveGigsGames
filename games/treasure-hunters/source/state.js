// Treasure Hunters - Three.js Game

let scene, camera, renderer, clock;

let claw, cable;

let treasures = [];

let value = 0;

let timeLeft = 30;

let gameActive = false;
let swingTime = 0;


// Game states: 'swinging', 'extending', 'retracting'
let grabberState = 'swinging';

let swingAngle = 0;

let cableLength = 0.5;

const maxCableLength = 9.0;

let grabSpeed = 8.0;

let activeGrabTarget = null;


// DOM Elements
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');

const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');

const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');

const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');

const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');

const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');

const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');

const valSpan = document.getElementById('game-value');

const timeSpan = document.getElementById('game-time');

const finalScoreSpan = document.getElementById('final-score-val');


init();



// Expose VibeCodeWorker state
window.gameState = { title: "treasure-hunters", get active() { return typeof gameActive !== "undefined" ? gameActive : true; } };

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


