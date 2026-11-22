(function () {
    'use strict';

    // Tile codes. 0/1/2/3 are legacy (floor/wall/water/poison) and keep their
    // original rendering. 4-9 are theme hazards, rendered as tinted overlays
    // by game-runtime (see buildDungeonLayer hazard block).
    var TILE = {
        FLOOR: 0, WALL: 1, WATER: 2, TOXIC: 3, LAVA: 4,
        CRYSTAL: 5, SAND: 6, BONE: 7, METAL: 8, SPARK: 9
    };

    // Per-theme dungeon config. atmosphere is consumed by game-runtime:
    //   scene.fog.color/density <- fogColor/fogDensity,
    //   scene.background        <- fogColor,
    //   ambientLight.color      <- ambientColor.
    var THEMES = {
        metallic_ship: {
            roomBonus: 2,
            roomWeights: { normal: 3, graveyard: 1, treasury: 2, lab: 3, armory: 1 },
            hazards: [8, 8, 2],
            graveHazards: [8],
            corridorWidth: [1, 2],
            atmosphere: { fogColor: 0x0a1628, fogDensity: 0.0028, ambientColor: 0x4a6fa5 }
        },
        elven_grove: {
            roomBonus: 3,
            roomWeights: { normal: 3, graveyard: 2, treasury: 2, lab: 2, grove: 2 },
            hazards: [2, 5, 2],
            graveHazards: [2, 5],
            corridorWidth: [1, 2],
            atmosphere: { fogColor: 0x06231c, fogDensity: 0.0032, ambientColor: 0x2dd4bf }
        },
        dwarven_vault: {
            roomBonus: 1,
            roomWeights: { normal: 3, graveyard: 1, treasury: 3, lab: 2, forge: 2 },
            hazards: [4, 9, 4],
            graveHazards: [4],
            corridorWidth: [2, 2],
            atmosphere: { fogColor: 0x2a1206, fogDensity: 0.0030, ambientColor: 0xf59e0b }
        },
        orc_wastes: {
            roomBonus: 2,
            roomWeights: { normal: 4, graveyard: 2, treasury: 1, lab: 1, arena: 2 },
            hazards: [6, 9, 6],
            graveHazards: [6, 9],
            corridorWidth: [1, 2],
            atmosphere: { fogColor: 0x2b0d0d, fogDensity: 0.0034, ambientColor: 0xef4444 }
        },
        toxic_catacombs: {
            roomBonus: 2,
            roomWeights: { normal: 3, graveyard: 2, treasury: 1, lab: 4 },
            hazards: [3, 3, 2],
            graveHazards: [3],
            corridorWidth: [1, 1],
            atmosphere: { fogColor: 0x0b2b12, fogDensity: 0.0042, ambientColor: 0x22c55e }
        },
        stone_crypt: {
            roomBonus: 0,
            roomWeights: { normal: 4, graveyard: 3, treasury: 2, lab: 1 },
            hazards: [7, 2],
            graveHazards: [7, 7, 2],
            corridorWidth: [1, 2],
            atmosphere: { fogColor: 0x101018, fogDensity: 0.0035, ambientColor: 0x8b8fa3 }
        },
        citadel_darkness: {
            roomBonus: 3,
            roomWeights: { normal: 3, graveyard: 3, treasury: 2, lab: 2, sanctum: 1 },
            hazards: [7, 4, 9],
            graveHazards: [7, 4],
            corridorWidth: [2, 3],
            atmosphere: { fogColor: 0x150826, fogDensity: 0.0038, ambientColor: 0x8b5cf6 }
        }
    };

    var DEFAULT_THEME = 'stone_crypt';

    // Tile code -> overlay meaning. Consumed by game-runtime to tint the
    // instanced hazard overlays for tiles 4-9 (tiles 2/3 keep legacy mats).
    var HAZARD_LEGEND = {
        2: { name: 'water', color: 0x1d4ed8 },
        3: { name: 'toxic', color: 0x22c55e },
        4: { name: 'lava', color: 0xef4416, emissive: true },
        5: { name: 'crystal', color: 0x2dd4bf, emissive: true },
        6: { name: 'sand', color: 0xc2a165 },
        7: { name: 'bone', color: 0xd6d3d1 },
        8: { name: 'metal', color: 0x64748b },
        9: { name: 'sparkite', color: 0xf43f5e, emissive: true }
    };

    function resolveTheme(theme) {
        if (typeof theme === 'string' && THEMES[theme]) return theme;
        return DEFAULT_THEME;
    }

    function pickWeighted(weights) {
        var total = 0;
        var k;
        for (k in weights) { if (weights.hasOwnProperty(k)) total += weights[k]; }
        var roll = Math.random() * total;
        for (k in weights) {
            if (!weights.hasOwnProperty(k)) continue;
            roll -= weights[k];
            if (roll <= 0) return k;
        }
        return 'normal';
    }

class DungeonGenerator {
    constructor() {
        this.gridSize = 70;
        this.tileSize = 48;
    }

    generate(floorNum, theme) {
        theme = resolveTheme(theme);
        var cfg = THEMES[theme];
        var grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(1));
        const rooms = [];
        const roomCount = 10 + Math.min(6, floorNum) + (cfg.roomBonus || 0);

        for (let i = 0; i < roomCount; i++) {
            const w = Math.floor(Math.random() * 7) + 6;
            const h = Math.floor(Math.random() * 7) + 6;
            const x = Math.floor(Math.random() * (this.gridSize - w - 4)) + 2;
            const y = Math.floor(Math.random() * (this.gridSize - h - 4)) + 2;

            let overlaps = false;
            for (const r of rooms) {
                if (x < r.x + r.w + 2 && x + w > r.x - 2 && y < r.y + r.h + 2 && y + h > r.y - 2) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                let rType = 'normal';
                if (rooms.length === 0) rType = 'spawn';
                else if (i === roomCount - 1) rType = (floorNum % 3 === 0) ? 'boss' : 'safespace';
                else rType = pickWeighted(cfg.roomWeights);

                rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2), type: rType });

                for (let rx = x; rx < x + w; rx++) {
                    for (let ry = y; ry < y + h; ry++) {
                        grid[rx][ry] = 0;
                    }
                }
            }
        }

        const hasExit = rooms.some(r => r.type === 'safespace' || r.type === 'boss');
        if (!hasExit && rooms.length > 1) {
            rooms[rooms.length - 1].type = (floorNum % 3 === 0) ? 'boss' : 'safespace';
        }

        var widthRange = cfg.corridorWidth || [1, 1];
        for (let i = 0; i < rooms.length - 1; i++) {
            var cw = widthRange[0] + Math.floor(Math.random() * (widthRange[1] - widthRange[0] + 1));
            this.digCorridor(grid, rooms[i].cx, rooms[i].cy, rooms[i + 1].cx, rooms[i + 1].cy, cw);
        }

        // Room hazards: lab rooms take the theme hazard set, graveyards take
        // the theme grave set, forge/treasury rooms in vault/citadel themes
        // get sparkite veins. Hazard tiles double as gameplay: tiles 2/3/4
        // are damaging overlays handled by the runtime hazard checks.
        rooms.forEach(room => {
            var tiles = null;
            if (room.type === 'lab') tiles = cfg.hazards;
            else if (room.type === 'graveyard') tiles = cfg.graveHazards;
            else if ((room.type === 'treasury' || room.type === 'forge') &&
                     (theme === 'dwarven_vault' || theme === 'citadel_darkness')) tiles = [9];
            else if (room.type === 'grove' && theme === 'elven_grove') tiles = [5, 2];
            else if (room.type === 'arena' && theme === 'orc_wastes') tiles = [6];
            else if (room.type === 'armory' && theme === 'metallic_ship') tiles = [8];
            else if (room.type === 'sanctum' && theme === 'citadel_darkness') tiles = [9, 4];
            if (!tiles) return;
            for (let hx = room.x + 1; hx < room.x + room.w - 1; hx += 3) {
                for (let hy = room.y + 1; hy < room.y + room.h - 1; hy += 3) {
                    grid[hx][hy] = tiles[Math.floor(Math.random() * tiles.length)];
                }
            }
        });

        if (rooms.length === 0) {
            const fx = Math.floor(this.gridSize / 2) - 5;
            const fy = Math.floor(this.gridSize / 2) - 5;
            rooms.push({ x: fx, y: fy, w: 10, h: 10, cx: fx + 5, cy: fy + 5, type: 'spawn' });
            for (let rx = fx; rx < fx + 10; rx++) {
                for (let ry = fy; ry < fy + 10; ry++) {
                    grid[rx][ry] = 0;
                }
            }
        }
        const spawnRoom = rooms.find(r => r.type === 'spawn') || rooms[0];
        if (rooms.length === 1) {
            const x = spawnRoom.cx < this.gridSize / 2 ? this.gridSize - 10 : 3;
            const y = spawnRoom.cy < this.gridSize / 2 ? this.gridSize - 10 : 3;
            const exit = { x, y, w: 7, h: 7, cx: x + 3, cy: y + 3, type: floorNum % 3 === 0 ? 'boss' : 'safespace' };
            rooms.push(exit);
            for (let rx = x; rx < x + exit.w; rx++) {
                for (let ry = y; ry < y + exit.h; ry++) grid[rx][ry] = TILE.FLOOR;
            }
        }
        this.ensureRoomRoutes(grid, spawnRoom, rooms);
        // Add a small number of short cross-links after the safe route is
        // guaranteed. These create readable loops and alternate approaches
        // for flanking or retreating without turning the whole floor into a
        // featureless maze of wide corridors.
        const routeCandidates = [];
        for (let from = 1; from < rooms.length - 1; from++) {
            const source = rooms[from];
            if (source.type === 'safespace' || source.type === 'boss') continue;
            for (let to = from + 2; to < rooms.length - 1; to++) {
                const target = rooms[to];
                if (target.type === 'safespace' || target.type === 'boss') continue;
                const distance = Math.abs(source.cx - target.cx) + Math.abs(source.cy - target.cy);
                if (distance >= 6 && distance <= 30) routeCandidates.push({ from, to, distance });
            }
        }
        routeCandidates.sort((a, b) => a.distance - b.distance);
        const routeLinks = [];
        const linkedRooms = new Set();
        const linkLimit = Math.min(3, Math.max(1, Math.floor(rooms.length / 6)));
        for (const link of routeCandidates) {
            if (routeLinks.length >= linkLimit) break;
            if (linkedRooms.has(link.from) || linkedRooms.has(link.to)) continue;
            const source = rooms[link.from];
            const target = rooms[link.to];
            this.digCorridor(grid, source.cx, source.cy, target.cx, target.cy, 1);
            routeLinks.push(link);
            linkedRooms.add(link.from);
            linkedRooms.add(link.to);
        }
        const combatRooms = rooms.filter(room => room.type !== 'spawn' && room.type !== 'safespace')
            .sort((a, b) => b.w * b.h - a.w * a.h);
        const [arenaRoom, ...otherCombatRooms] = combatRooms;
        let arena = null;
        if (arenaRoom) {
            const x = (arenaRoom.x + arenaRoom.w / 2) * 48;
            const z = (arenaRoom.y + arenaRoom.h / 2) * 48;
            const surfaces = [];
            const add = (minX, maxX, minZ, maxZ, top, thickness, level) => {
                surfaces.push({ minX: x + minX, maxX: x + maxX, minZ: z + minZ, maxZ: z + maxZ, top, bottom: top - thickness, level });
            };
            add(-112, 45, -29, 29, 42, 6, 1);
            add(-45, 112, 29, 82, 84, 6, 2);
            for (let step = 1; step <= 7; step++) {
                const offset = (step - 1) * 12;
                add(-112, -64, -113 + offset, -101 + offset, step * 6, 7, 1);
                add(-45 + offset, -33 + offset, -29, 29, 42 + step * 6, 7, 2);
            }
            // The second staircase runs east from the bridge into the upper landing.
            add(39, 112, -29, 29, 84, 6, 2);
            const pursuitRoute = [
                [-88, -118, 0], [-88, 0, 42], [78, 0, 84], [78, 54, 84]
            ].map(([dx, dz, elevation]) => ({ x: x + dx, z: z + dz, elevation }));
            const launchPad = { x: x + 78, z: z + 112, radius: 12, landingX: x + 78, landingZ: z + 56, landingHeight: 84 };
            // Carry the vertical combat language beyond the main arena: up to
            // eight rooms per floor gain traversable balconies and jump-up perches.
            const overlookRooms = otherCombatRooms.filter(room => room.type !== 'boss').slice(0, 8);
            for (const [roomIndex, room] of overlookRooms.entries()) {
                const roomX = (room.x + room.w / 2) * 48;
                const roomZ = (room.y + room.h / 2) * 48;
                const addOverlook = (minX, maxX, minZ, maxZ, top, level) => {
                    surfaces.push({ minX: roomX + minX, maxX: roomX + maxX, minZ: roomZ + minZ,
                        maxZ: roomZ + maxZ, top, bottom: top - 7, level });
                };
                addOverlook(-44, 32, -36, 36, 42, 1);
                addOverlook(75, 125, -36, 36, 84, 2);
                for (let step = 1; step <= 7; step++) {
                    const west = -128 + (step - 1) * 12;
                    addOverlook(west, west + 12, -25, 25, step * 6, 1);
                }
                // Tall rooms get an exposed third tier. The offset makes the
                // top perch a jump destination rather than a vertical stack.
                if (roomIndex % 4 !== 2) {
                    addOverlook(-20, 34, -112, -64, 126, 3);
                    addOverlook(-64, -20, -64, -20, 108, 3);
                    addOverlook(34, 82, -112, -64, 108, 3);
                } else {
                    addOverlook(-120, -72, 62, 110, 126, 3);
                    addOverlook(-72, -24, 20, 62, 108, 3);
                }
            }
            arena = { room: arenaRoom, ceiling: 224, overlookRooms, surfaces, pursuitRoute, launchPad };
        }
        return {
            grid, rooms, spawnRoom, arena, routeLinks, ceiling: 216, gridSize: this.gridSize,
            theme: theme,
            atmosphere: {
                fogColor: cfg.atmosphere.fogColor,
                fogDensity: cfg.atmosphere.fogDensity,
                ambientColor: cfg.atmosphere.ambientColor
            },
            hazardLegend: HAZARD_LEGEND
        };
    }

    ensureRoomRoutes(grid, spawnRoom, rooms) {
        let reached = this.safeTilesFrom(grid, spawnRoom.cx, spawnRoom.cy);
        for (const room of rooms) {
            if (reached[room.cx * this.gridSize + room.cy]) continue;
            this.digCorridor(grid, spawnRoom.cx, spawnRoom.cy, room.cx, room.cy, 1);
            reached = this.safeTilesFrom(grid, spawnRoom.cx, spawnRoom.cy);
        }
    }

    safeTilesFrom(grid, x, y) {
        const size = this.gridSize;
        const reached = new Uint8Array(size * size);
        const start = x * size + y;
        const queue = [start];
        reached[start] = 1;
        const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (let index = 0; index < queue.length; index++) {
            const tx = Math.floor(queue[index] / size);
            const ty = queue[index] % size;
            for (const [dx, dy] of neighbors) {
                const nx = tx + dx;
                const ny = ty + dy;
                if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
                const cell = grid[nx][ny];
                if (cell === TILE.WALL || cell === TILE.SAND || cell === TILE.TOXIC || cell === TILE.LAVA) continue;
                const key = nx * size + ny;
                if (reached[key]) continue;
                reached[key] = 1;
                queue.push(key);
            }
        }
        return reached;
    }

    digCorridor(grid, x1, y1, x2, y2, width) {
        width = Math.max(1, width || 1);
        let curX = x1;
        let curY = y1;
        const carve = (cx, cy) => {
            for (let ox = 0; ox < width; ox++) {
                for (let oy = 0; oy < width; oy++) {
                    const gx = cx + ox;
                    const gy = cy + oy;
                    if (gx >= 0 && gx < this.gridSize && gy >= 0 && gy < this.gridSize) {
                        grid[gx][gy] = 0;
                    }
                }
            }
        };
        while (curX !== x2) {
            carve(curX, curY);
            curX += (x2 > curX) ? 1 : -1;
        }
        while (curY !== y2) {
            carve(curX, curY);
            curY += (y2 > curY) ? 1 : -1;
        }
        carve(curX, curY);
    }
}

    DungeonGenerator.THEMES = THEMES;
    DungeonGenerator.TILE = TILE;
    DungeonGenerator.HAZARD_LEGEND = HAZARD_LEGEND;
    DungeonGenerator.DEFAULT_THEME = DEFAULT_THEME;

    window.GraveGainDungeonGenerator = DungeonGenerator;
})();
