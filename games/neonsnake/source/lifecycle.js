// A hidden game must never keep consuming lives or retain held controls.
(function installSessionLifecycle() {
  function releaseControls() {
    
  }
  function suspend() {
    releaseControls();
    if (gameState === 'playing') {
      pauseGame();
      const resume = document.getElementById('TEMPLATE-4weird-resume-btn');
      if (resume) resume.focus({ preventScroll: true });
    }
  }
  window.addEventListener('blur', suspend);
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
  window.addEventListener('pagehide', suspend);
})();
