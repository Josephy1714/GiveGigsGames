// The Speed Portal - Three.js Game

let scene, camera, renderer, clock;

let player;

let tunnelRings = [];

let obstacles = [];

let items = [];

let distance = 0;

let boosts = 0;

let gameActive = false;


// Racer parameters
let playerAngle = 0;
 // angle in radians around the tunnel center
const tunnelRadius = 4.0;

let speed = 25.0;

let rotateDir = 0;
 // -1 = Left, 1 = Right
const rotationSpeed = 4.5;


// DOM Elements
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');

const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');

const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');

const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');

const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');

const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');

const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');

const distSpan = document.getElementById('game-dist');

const boostsSpan = document.getElementById('game-boosts');

const finalDistSpan = document.getElementById('final-dist-val');


init();


let spawnTimer = 0;



// Expose VibeCodeWorker state
window.gameState = { title: "the-speed-portal", get active() { return typeof gameActive !== "undefined" ? gameActive : true; } };

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


