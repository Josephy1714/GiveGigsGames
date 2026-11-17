// Pause before background time advances hazards.
(function () {
  function suspend() {
    
    if (gameActive) { pauseGame(); resumeBtn.focus({ preventScroll: true }); }
  }
  window.addEventListener('blur', suspend);
  window.addEventListener('pagehide', suspend);
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
})();
