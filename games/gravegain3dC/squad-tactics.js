const AXES = [['x', 'minX', 'maxX'], ['y', 'minY', 'maxY'], ['z', 'minZ', 'maxZ']];

export function lineBlocked(from, to, blocks, padding = 0) {
    return blocks.some(block => {
        let enter = .002;
        let exit = .998;
        for (const [axis, min, max] of AXES) {
            const lo = block[min] - padding;
            const hi = block[max] + padding;
            const delta = to[axis] - from[axis];
            if (Math.abs(delta) < .0001) {
                if (from[axis] <= lo || from[axis] >= hi) return false;
                continue;
            }
            const a = (lo - from[axis]) / delta;
            const b = (hi - from[axis]) / delta;
            enter = Math.max(enter, Math.min(a, b));
            exit = Math.min(exit, Math.max(a, b));
            if (enter >= exit) return false;
        }
        return true;
    });
}

export function findCover(bot, threat, anchor, blocks, canTravel, reserved) {
    const from = bot.mesh.position;
    let best = null;
    let bestScore = Infinity;
    for (const block of blocks) {
        if (block.minY > from.y || block.maxY < from.y) continue;
        const x = Math.max(block.minX, Math.min(block.maxX, from.x));
        const z = Math.max(block.minZ, Math.min(block.maxZ, from.z));
        if (Math.hypot(x - from.x, z - from.z) > 15) continue;
        const sides = [
            [block.minX - 1.1, z, 0, 1, block.minZ, block.maxZ],
            [block.maxX + 1.1, z, 0, 1, block.minZ, block.maxZ],
            [x, block.minZ - 1.1, 1, 0, block.minX, block.maxX],
            [x, block.maxZ + 1.1, 1, 0, block.minX, block.maxX]
        ];
        for (const [cx, cz, dx, dz, lo, hi] of sides) {
            for (const along of [lo + .55, (lo + hi) / 2, hi - .55]) {
                const point = from.clone().set(dx ? along : cx, from.y, dz ? along : cz);
                const distance = Math.hypot(point.x - from.x, point.z - from.z);
                const leash = Math.hypot(point.x - anchor.x, point.z - anchor.z);
                const score = distance + leash * .5;
                if (distance > 15 || leash > 22 || score >= bestScore) continue;
                if (reserved && Math.hypot(point.x - reserved.x, point.z - reserved.z) < 2.6) continue;
                if (!lineBlocked(threat, point, [block]) || !canTravel(from, point)) continue;
                const peek = [lo - 1.05, hi + 1.05].map(edge =>
                    point.clone().set(dx ? edge : cx, point.y, dz ? edge : cz))
                    .filter(edge => Math.hypot(edge.x - point.x, edge.z - point.z) < 5 &&
                        !lineBlocked(edge, threat, blocks) && canTravel(point, edge))
                    .sort((a, b) => Math.hypot(a.x - point.x, a.z - point.z) - Math.hypot(b.x - point.x, b.z - point.z))[0];
                const adjustedScore = score + (peek ? 0 : 3);
                if (adjustedScore >= bestScore) continue;
                best = { point, peek };
                bestScore = adjustedScore;
            }
        }
    }
    return best;
}
