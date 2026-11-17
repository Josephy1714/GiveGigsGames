(function () {
  var frame = document.querySelector('.TEMPLATE-4weird-game-frame') || document.body;
  function toggleFS() {
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        var el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen().catch(function () {});
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } else if (document.exitFullscreen) document.exitFullscreen().catch(function () {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (e) {}
  }
  function fit() { canvas.style.width = '100%'; canvas.style.height = '100%'; canvas.style.objectFit = 'contain'; }
  var b = document.createElement('button');
  b.id = 'neon-fs-invaders'; b.textContent = '⛶'; b.title = 'Toggle fullscreen (F)';
  b.addEventListener('click', function (e) { e.stopPropagation(); toggleFS(); });
  frame.appendChild(b);
  canvas.addEventListener('fw-dblclick-disabled', toggleFS);
  document.addEventListener('keydown', function (e) { if (e.code === 'KeyF') toggleFS(); });
  document.addEventListener('fullscreenchange', fit);
  document.addEventListener('webkitfullscreenchange', fit);
  window.addEventListener('resize', fit); fit();
})();

// ===== DEVELOPER DEBUGGING API =====
window.gameDebug = {
    name: "Neon Invaders",
    getScore: () => score,
    setScore: (s) => { score = s; var el = document.getElementById('TEMPLATE-4weird-final-score'); if (el) el.textContent = score; },
    getHealth: () => lives,
    setHealth: (h) => { lives = h; },
    win: () => { score += 2000; wave++; },
    lose: () => {
        gameOver();
    },
    godMode: false,
    toggleGodMode: function() {
        this.godMode = !this.godMode;
        return this.godMode;
    }
};
