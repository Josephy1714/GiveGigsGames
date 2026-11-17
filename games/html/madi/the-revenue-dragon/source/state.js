// The Revenue Dragon - Three.js Game

let scene, camera, renderer, clock;

let player;

let dragon;

let beams = [];

let fireballs = [];

let score = 0;

let dragonHP = 100;

let gameActive = false;
let battleTime = 0;
let fireHeld = false;


// Movement params
let playerX = 0;

let moveDir = 0;
 // -1 = Left, 1 = Right
const speed = 10.0;

let fireCooldown = 0;


// DOM Elements
const startScreen = document.getElementById('TEMPLATE-4weird-start-screen');

const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');

const gameOverScreen = document.getElementById('TEMPLATE-4weird-game-over-screen');

const startBtn = document.getElementById('TEMPLATE-4weird-start-btn');

const resumeBtn = document.getElementById('TEMPLATE-4weird-resume-btn');

const restartBtn = document.getElementById('TEMPLATE-4weird-restart-btn');

const playAgainBtn = document.getElementById('TEMPLATE-4weird-play-again-btn');

const scoreSpan = document.getElementById('game-score');

const finalScoreSpan = document.getElementById('final-score-val');

const dragonHPBar = document.getElementById('dragon-hp-bar');

const endTitle = document.getElementById('end-title');

const endDesc = document.getElementById('end-desc');


init();


let spawnTimer = 0;



// Expose VibeCodeWorker state
window.gameState = { title: "the-revenue-dragon", get active() { return typeof gameActive !== "undefined" ? gameActive : true; } };

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


