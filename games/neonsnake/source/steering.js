// Keep two deliberate turns so a quick corner sequence survives between ticks.
// Validate against the last queued direction to reject reversals consistently
// for both swipes and keyboard controls.
const snakeTurns = [];
function requestSnakeTurn(x, y) {
    if (gameState !== 'playing' || snakeTurns.length >= 2) return;
    const previous = snakeTurns.length ? snakeTurns[snakeTurns.length - 1] : direction;
    if ((previous.x === x && previous.y === y) || (previous.x === -x && previous.y === -y)) return;
    snakeTurns.push({ x, y });
}
