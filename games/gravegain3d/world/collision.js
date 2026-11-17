(function () {
    'use strict';

    class PhysicsController {
        moveEntityWithCollision(entity, dx, dy, tilemap, obstacles = []) {
            const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 12));
            const stepX = dx / steps;
            const stepY = dy / steps;
            for (let i = 0; i < steps; i++) {
                const oldX = entity.x;
                entity.x += stepX;
                if (this.isColliding(entity.x, entity.y, entity.radius, tilemap, obstacles, { x: oldX, y: entity.y })) entity.x = oldX;

                const oldY = entity.y;
                entity.y += stepY;
                if (this.isColliding(entity.x, entity.y, entity.radius, tilemap, obstacles, { x: entity.x, y: oldY })) entity.y = oldY;
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
