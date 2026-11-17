// The Cave of Bottlenecks - Three.js Game

let scene, camera, renderer, clock;

let emitter;

let beam;

let stalactites = [];

let gameActive = false;


// Spotlight parameters
let beamAngle = 0;
 // angle in radians (0 = straight up)
let rotateDir = 0;
 // -1 = Left, 1 = Right
const rotationSpeed = 2.0;


// DOM Elements
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');

const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');

const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');

const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');

const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');

const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');

const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');

const progressSpan = document.getElementById('game-progress');

const leftSpan = document.getElementById('game-left');


init();



// Expose VibeCodeWorker state
window.gameState = { title: "the-cave-of-bottlenecks", get active() { return typeof gameActive !== "undefined" ? gameActive : true; } };

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


