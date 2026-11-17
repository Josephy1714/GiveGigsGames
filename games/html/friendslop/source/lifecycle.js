(function () {
    function suspend() {
        if (game && game.state === GAME_STATE.PLAYING) game.togglePause();
    }
    window.addEventListener('blur', suspend);
    document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
})();
