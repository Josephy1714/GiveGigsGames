function createLichClock() {
    const step = 1000 / 60;
    let previous = null, accumulator = 0;
    return {
        reset() { previous = null; accumulator = 0; },
        advance(timestamp, update, active) {
            if (!Number.isFinite(timestamp)) return;
            if (previous === null) { previous = timestamp; return; }
            accumulator += Math.min(100, Math.max(0, timestamp - previous));
            previous = timestamp;
            let count = 0;
            while (accumulator >= step && count < 5 && active()) {
                accumulator -= step;
                update();
                count++;
            }
            if (count === 5) accumulator = Math.min(accumulator, step);
        }
    };
}
const gameClock = createLichClock();
