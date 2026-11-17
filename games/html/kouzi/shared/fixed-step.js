// Simulate at 60Hz on both ordinary and high-refresh displays. Keep rendering
// at native refresh rate, but discard long stalls instead of teleporting players.
function createNeonClock() {
    const step = 1000 / 60;
    let previous = null;
    let accumulator = 0;
    return {
        reset() { previous = null; accumulator = 0; },
        advance(timestamp, updateStep, isActive) {
            if (!Number.isFinite(timestamp)) return;
            if (previous === null) { previous = timestamp; return; }
            accumulator += Math.min(100, Math.max(0, timestamp - previous));
            previous = timestamp;
            let steps = 0;
            while (accumulator + 0.00001 >= step && steps < 5 && isActive()) {
                accumulator -= step;
                updateStep();
                steps++;
            }
            if (steps === 5) accumulator = Math.min(accumulator, step);
        }
    };
}
const neonClock = createNeonClock();
