Object.defineProperties(Game.prototype, Object.getOwnPropertyDescriptors({
loop(timestamp) {
        gameClock.advance(timestamp, () => this.update(), () => this.state === STATE.PLAYING);
        this.draw();
        requestAnimationFrame(this.loop);
    }
}));
