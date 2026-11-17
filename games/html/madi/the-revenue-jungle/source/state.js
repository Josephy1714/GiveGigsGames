// The Revenue Jungle - Three.js Game

// Game variables
let scene, camera, renderer, clock;

let blueCat, greenCat;

let floorTiles = [];

let obstacles = [];

let coins = [];

let score = 0;

let revenue = 0;

let gameActive = false;

let isJumping = false;

let jumpVelocity = 0;

const gravity = -35;

const playerX = -6;

let speedMultiplier = 1.0;


// Materials
let vineMaterial, quicksandMaterial, coinMaterial;


// DOM elements
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');

const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');

const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');

const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');

const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');

const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');

const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');

const scoreSpan = document.getElementById('game-score');

const revenueSpan = document.getElementById('game-revenue');

const finalScoreSpan = document.getElementById('final-score-val');

const finalRevSpan = document.getElementById('final-rev-val');


// Initialize Game
init();


let spawnTimer = 0;



// Expose VibeCodeWorker state
window.gameState = { title: "the-revenue-jungle", get active() { return typeof gameActive !== "undefined" ? gameActive : true; } };

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


