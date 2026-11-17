

const game = new Game();
window.game = game;

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_GAME_SPEED') {
        const speed = parseFloat(event.data.speed);
        if (!isNaN(speed) && speed > 0) {
            game.speedMultiplier = speed;
        }
    }
});

// ===== DEVELOPER DEBUGGING API =====
window.gameDebug = {
    name: "Demo Lichdom",
    getScore: () => game.score,
    setScore: (s) => { game.score = s; },
    getHealth: () => game.player.hp,
    setHealth: (h) => { game.player.hp = h; },
    win: () => game.win(),
    lose: () => game.lose(),
    godMode: false,
    toggleGodMode: function() {
        this.godMode = !this.godMode;
        return this.godMode;
    }
};
