(function () {
    'use strict';

    class PhysicsController {
        arenaSurfacesAt(tilemap, x, z) {
            const arena = tilemap?.arena;
            return arena ? arena.surfaces.filter(s => x >= s.minX && x < s.maxX && z >= s.minZ && z < s.maxZ) : [];
        }

        ceilingAt(tilemap, x, z) {
            const arena = tilemap?.arena;
            const contains = room => x >= room.x * 48 && x < (room.x + room.w) * 48 &&
                z >= room.y * 48 && z < (room.y + room.h) * 48;
            if (arena && (contains(arena.room) || arena.overlookRooms?.some(contains))) return arena.ceiling;
            return tilemap?.ceiling || 124;
        }

        moveEntityWithCollision(entity, dx, dy, tilemap, obstacles = [], bodyHeight = 0) {
            const hasArena = bodyHeight > 0 && Boolean(tilemap?.arena);
            const stepSize = hasArena ? 6 : 12;
            const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / stepSize));
            const stepX = dx / steps;
            const stepY = dy / steps;

            const move = (x, z) => {
                if (this.isColliding(x, z, entity.radius, tilemap, obstacles, entity)) return;
                if (hasArena) {
                    const feet = entity.yElevation;
                    const stepLimit = feet + (entity.grounded ? 7 : 0);
                    let stepTop = feet;
                    const surfaces = this.arenaSurfacesAt(tilemap, x, z);
                    for (const surface of surfaces) {
                        if (surface.top <= stepLimit) stepTop = Math.max(stepTop, surface.top);
                    }
                    const head = stepTop + bodyHeight;
                    if (head > this.ceilingAt(tilemap, x, z) ||
                        surfaces.some(s => s.top > stepTop && s.bottom < head)) return;
                    entity.yElevation = stepTop;
                }
                entity.x = x;
                entity.y = z;
            };

            for (let i = 0; i < steps; i++) {
                if (stepX) move(entity.x + stepX, entity.y);
                if (stepY) move(entity.x, entity.y + stepY);
            }
        }

        isColliding(x, y, radius, tilemap, obstacles = [], previousPosition = null) {
            if (tilemap?.grid) {
                const gridSize = tilemap.gridSize || tilemap.grid.length;
                const mapSize = gridSize * 48;
                if (x - radius < 0 || y - radius < 0 || x + radius > mapSize || y + radius > mapSize) return true;

                const minX = Math.floor((x - radius) / 48);
                const maxX = Math.floor((x + radius) / 48);
                const minY = Math.floor((y - radius) / 48);
                const maxY = Math.floor((y + radius) / 48);
                const radiusSq = radius * radius;
                for (let tx = minX; tx <= maxX; tx++) {
                    for (let ty = minY; ty <= maxY; ty++) {
                        const cell = tilemap.grid[tx]?.[ty];
                        if (cell !== 1 && cell !== 6) continue;
                        const closestX = Math.max(tx * 48, Math.min(x, (tx + 1) * 48));
                        const closestY = Math.max(ty * 48, Math.min(y, (ty + 1) * 48));
                        const dx = x - closestX;
                        const dy = y - closestY;
                        if (dx * dx + dy * dy < radiusSq) return true;
                    }
                }
            }

            return obstacles.some(obstacle => {
                if (!obstacle || obstacle.broken) return false;
                const obstacleY = Number.isFinite(obstacle.z) ? obstacle.z : obstacle.y;
                if (!Number.isFinite(obstacle.x) || !Number.isFinite(obstacleY)) return false;
                const combinedRadius = radius + (obstacle.radius || 16);
                const distance = Math.hypot(x - obstacle.x, y - obstacleY);
                if (distance >= combinedRadius) return false;
                if (!previousPosition) return true;
                const previousDistance = Math.hypot(previousPosition.x - obstacle.x, previousPosition.y - obstacleY);
                return distance < previousDistance;
            });
        }
    }

    window.GraveGainPhysicsController = PhysicsController;
})();
