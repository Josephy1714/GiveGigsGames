(function (root) {
    'use strict';

    var BIOMES = ['cathedral', 'manufactorum', 'void_hull', 'trench'];

    var SURFACE_PENALTY = {
        stone: 1.0,
        grate: 1.0,
        mud: 0.6,
        sludge: 0.55,
        rubble: 0.75,
        ice: 0.85
    };

    var BIOME_CONFIG = {
        cathedral: {
            hazards: ['fire', 'warp'],
            surfaces: ['stone', 'mud', 'rubble'],
            weather: { kind: 'ash', density: 1.0, speed: 1.4, color: 0xd6cfc2 },
            coverMaterial: 'masonry',
            primarySurface: 'stone'
        },
        manufactorum: {
            hazards: ['fire', 'poison'],
            surfaces: ['grate', 'sludge', 'rubble'],
            weather: { kind: 'soot_sparks', density: 1.1, speed: 2.2, color: 0xf59e0b },
            coverMaterial: 'steel',
            primarySurface: 'grate'
        },
        void_hull: {
            hazards: ['cryo', 'warp'],
            surfaces: ['grate', 'ice', 'rubble'],
            weather: { kind: 'warp_spores', density: 0.9, speed: 0.9, color: 0x38bdf8 },
            coverMaterial: 'bulkhead',
            primarySurface: 'grate'
        },
        trench: {
            hazards: ['poison', 'fire'],
            surfaces: ['mud', 'rubble', 'sludge'],
            weather: { kind: 'acid_rain', density: 1.35, speed: 6.5, color: 0x84cc16 },
            coverMaterial: 'sandbag',
            primarySurface: 'mud'
        }
    };

    function FallbackRNG(seed) {
        this._seed = (seed === undefined || seed === null ? 1337 : Number(seed)) >>> 0 || 1337;
        this._state = this._seed;
    }
    FallbackRNG.prototype.next = function () {
        var t = (this._state = (this._state + 0x6D2B79F5) >>> 0);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    FallbackRNG.prototype.range = function (min, max) { return min + (max - min) * this.next(); };
    FallbackRNG.prototype.int = function (min, max) { return max <= min ? min : Math.floor(min + this.next() * (max - min + 1)); };
    FallbackRNG.prototype.pick = function (arr) { return arr && arr.length ? arr[Math.floor(this.next() * arr.length)] : undefined; };
    FallbackRNG.prototype.chance = function (p) { return this.next() < p; };
    FallbackRNG.prototype.fork = function (label) {
        var h = 2166136261 >>> 0;
        var s = String(label || '');
        for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
        return new FallbackRNG((this._seed ^ h ^ (this._state >>> 1)) >>> 0);
    };

    function makeRng(seed) {
        var bus = root.GraveGainBus;
        if (!bus && typeof require === 'function') {
            try { bus = require('./engine-bus.js'); } catch (_) { bus = null; }
        }
        if (bus && typeof bus.SeededRNG === 'function') {
            return new bus.SeededRNG(seed);
        }
        return new FallbackRNG(seed);
    }

    function clamp(v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    function oppositeDir(dir) {
        if (dir === 'n') return 's';
        if (dir === 's') return 'n';
        if (dir === 'e') return 'w';
        if (dir === 'w') return 'e';
        return 'n';
    }

    function dirVector(dir) {
        if (dir === 'n') return { dx: 0, dz: -1 };
        if (dir === 's') return { dx: 0, dz: 1 };
        if (dir === 'e') return { dx: 1, dz: 0 };
        if (dir === 'w') return { dx: -1, dz: 0 };
        return { dx: 0, dz: 0 };
    }

    function createCell(gx, gz, biome) {
        return {
            x: gx,
            z: gz,
            gx: gx,
            gz: gz,
            elevation: 0,
            type: 'wall', // 'floor'|'wall'|'breachable'|'chasm'|'door'|'ramp'
            hazard: null, // null|'fire'|'poison'|'cryo'|'warp'
            cover: { n: 'none', e: 'none', s: 'none', w: 'none' },
            coverHp: 0,
            maxCoverHp: 0,
            coverArchetype: null, // 'barricade'|'pillar'|'crate'|null
            coverMaterial: BIOME_CONFIG[biome].coverMaterial,
            coverDamageTier: 0, // 0 intact, 1 damaged, 2 critical, 3 destroyed
            structuralSupportId: null,
            supportsCatwalk: false,
            overheadGroupId: null,
            overheadElevation: 0,
            roofGroupId: null,
            roofCollapsed: false,
            zoneType: 'exterior',
            doorOpen: false,
            doorLocked: false,
            doorHp: 0,
            maxDoorHp: 0,
            doorAxis: 'x',
            wallHp: 0,
            maxWallHp: 0,
            rampDir: null,
            explored: false,
            visible: false,
            surface: BIOME_CONFIG[biome].primarySurface,
            terrainPenalty: SURFACE_PENALTY[BIOME_CONFIG[biome].primarySurface] || 1.0,
            biome: biome,
            roomId: -1,
            isChokepoint: false,
            isCatwalk: false
        };
    }

    function TerrainGrid(opts) {
        opts = opts || {};
        this.width = opts.width || 80;
        this.height = opts.height || 80;
        this.tileSize = opts.tileSize || 2.0;
        this.tierHeight = opts.tierHeight || 1.5;
        this.biome = BIOMES.indexOf(opts.biome) >= 0 ? opts.biome : 'cathedral';
        this.seed = opts.seed !== undefined ? opts.seed : 1337;

        this.cells = [];
        this.rooms = [];
        this.spawnRoom = null;
        this.safespaceRoom = null;
        this.structuralGroups = Object.create(null); // supportId -> { id, pillarGx, pillarGz, overheadCells: [{gx,gz}], collapsed }
        this.roofGroups = Object.create(null); // roofGroupId -> { id, roomId, cells: [{gx,gz}], elevation, collapsed }
        this.props = [];
        this.debris = [];
        this.maxDebris = 1024;
        this.lightAnchors = [];
        this.pendingEvents = [];
        this._mutationListeners = [];
        this._visibleKeys = [];
        this._propSeq = 1;
        this._debrisSeq = 1;
    }

    TerrainGrid.BIOMES = BIOMES.slice();
    TerrainGrid.BIOME_CONFIG = BIOME_CONFIG;
    TerrainGrid.SURFACE_PENALTY = SURFACE_PENALTY;

    TerrainGrid.prototype.inBounds = function (gx, gz) {
        return gx >= 0 && gz >= 0 && gx < this.width && gz < this.height;
    };

    TerrainGrid.prototype.getCell = function (gx, gz) {
        if (!this.inBounds(gx, gz)) return null;
        return this.cells[gz * this.width + gx];
    };

    TerrainGrid.prototype.worldToGrid = function (wx, wz) {
        return {
            gx: clamp(Math.floor(wx / this.tileSize), 0, this.width - 1),
            gz: clamp(Math.floor(wz / this.tileSize), 0, this.height - 1)
        };
    };

    TerrainGrid.prototype.gridToWorld = function (gx, gz) {
        var cell = this.getCell(gx, gz);
        var elev = cell ? cell.elevation : 0;
        return {
            x: (gx + 0.5) * this.tileSize,
            y: elev * this.tierHeight,
            z: (gz + 0.5) * this.tileSize
        };
    };

    TerrainGrid.prototype.onGridMutated = function (cb) {
        if (typeof cb !== 'function') return function () {};
        this._mutationListeners.push(cb);
        var self = this;
        return function unsubscribe() {
            self._mutationListeners = self._mutationListeners.filter(function (fn) { return fn !== cb; });
        };
    };

    TerrainGrid.prototype._emitMutation = function (payload) {
        for (var i = 0; i < this._mutationListeners.length; i++) {
            try {
                this._mutationListeners[i](payload);
            } catch (_) { /* listener isolation */ }
        }
    };

    TerrainGrid.prototype.consumeEvents = function () {
        if (!this.pendingEvents.length) return [];
        var out = this.pendingEvents.slice();
        this.pendingEvents.length = 0;
        return out;
    };

    TerrainGrid.prototype.isPassable = function (gx, gz) {
        var cell = this.getCell(gx, gz);
        if (!cell) return false;
        if (cell.type === 'wall' || cell.type === 'breachable') return false;
        if (cell.type === 'door' && !cell.doorOpen) return false;
        if (cell.type === 'chasm') return false;
        return true;
    };

    TerrainGrid.prototype.canStepBetween = function (fromGx, fromGz, toGx, toGz) {
        var fromCell = this.getCell(fromGx, fromGz);
        var toCell = this.getCell(toGx, toGz);
        if (!fromCell || !toCell) return false;
        if (!this.isPassable(toGx, toGz)) return false;
        var delta = Math.abs(toCell.elevation - fromCell.elevation);
        if (delta === 0) return true;
        if (delta > 1) return false;
        return fromCell.type === 'ramp' || toCell.type === 'ramp';
    };

    TerrainGrid.prototype.getWorldHeightAt = function (wx, wz) {
        var g = this.worldToGrid(wx, wz);
        var cell = this.getCell(g.gx, g.gz);
        if (!cell) return 0;
        if (cell.type === 'chasm') return -12.0;
        var baseH = cell.elevation * this.tierHeight;
        if (cell.type === 'ramp' && cell.rampDir) {
            var localX = clamp((wx - g.gx * this.tileSize) / this.tileSize, 0, 1);
            var localZ = clamp((wz - g.gz * this.tileSize) / this.tileSize, 0, 1);
            var t = 0.5;
            if (cell.rampDir === 'n') t = 1 - localZ;
            else if (cell.rampDir === 's') t = localZ;
            else if (cell.rampDir === 'e') t = localX;
            else if (cell.rampDir === 'w') t = 1 - localX;
            // Ramp connects cell.elevation (low) to cell.elevation + 1 (high)
            return baseH + t * this.tierHeight;
        }
        return baseH;
    };

    TerrainGrid.prototype.getBiomeWeather = function () {
        var cfg = BIOME_CONFIG[this.biome] || BIOME_CONFIG.cathedral;
        return {
            biome: this.biome,
            kind: cfg.weather.kind,
            density: cfg.weather.density,
            speed: cfg.weather.speed,
            color: cfg.weather.color
        };
    };

    TerrainGrid.prototype.getInteriorZoneAt = function (wx, wz) {
        var g = this.worldToGrid(wx, wz);
        var cell = this.getCell(g.gx, g.gz);
        if (!cell) return { zoneType: 'exterior', roofGroupId: null, roofCollapsed: false };
        return {
            zoneType: cell.zoneType || 'exterior',
            roofGroupId: cell.roofGroupId || null,
            roofCollapsed: !!cell.roofCollapsed
        };
    };

    TerrainGrid.prototype.generate = function (opts) {
        opts = opts || {};
        if (opts.biome && BIOMES.indexOf(opts.biome) >= 0) this.biome = opts.biome;
        if (opts.seed !== undefined) this.seed = opts.seed;
        var floorIndex = Math.max(1, Number(opts.floorIndex) || 1);
        var rng = makeRng((this.seed + floorIndex * 977) >>> 0).fork('terrain_' + this.biome);

        this.cells = new Array(this.width * this.height);
        for (var z = 0; z < this.height; z++) {
            for (var x = 0; x < this.width; x++) {
                this.cells[z * this.width + x] = createCell(x, z, this.biome);
            }
        }
        this.rooms = [];
        this.structuralGroups = Object.create(null);
        this.roofGroups = Object.create(null);
        this.props = [];
        this.debris = [];
        this.lightAnchors = [];
        this.pendingEvents = [];
        this._visibleKeys = [];
        this._propSeq = 1;
        this._debrisSeq = 1;

        var cfg = BIOME_CONFIG[this.biome] || BIOME_CONFIG.cathedral;

        // 1. Place 12 non-overlapping tactical rooms
        var targetRooms = 12;
        var archetypes = ['catwalk_hall', 'pillared_sanctum', 'chokepoint_corridor', 'bunker_overlook', 'hazard_vat', 'interior_shrine', 'treasury', 'normal'];
        var attempts = 0;
        while (this.rooms.length < targetRooms && attempts < 220) {
            attempts++;
            var rw = rng.int(7, 13);
            var rh = rng.int(7, 13);
            var rx = rng.int(3, this.width - rw - 4);
            var rz = rng.int(3, this.height - rh - 4);

            var overlaps = false;
            for (var ri = 0; ri < this.rooms.length; ri++) {
                var r = this.rooms[ri];
                if (rx < r.x + r.w + 2 && rx + rw > r.x - 2 && rz < r.z + r.h + 2 && rz + rh > r.z - 2) {
                    overlaps = true;
                    break;
                }
            }
            if (overlaps) continue;

            var roomId = this.rooms.length;
            var rType = roomId === 0 ? 'spawn' : (roomId === targetRooms - 1 ? 'safespace' : rng.pick(archetypes));
            var isInterior = (rType === 'interior_shrine' || rType === 'pillared_sanctum' || rType === 'bunker_overlook');
            var room = {
                id: roomId,
                x: rx,
                y: rz,
                z: rz,
                w: rw,
                h: rh,
                cx: rx + Math.floor(rw / 2),
                cy: rz + Math.floor(rh / 2),
                cz: rz + Math.floor(rh / 2),
                type: rType,
                zoneType: isInterior ? 'interior' : 'exterior',
                roofGroupId: isInterior ? ('roof_' + roomId) : null
            };
            this.rooms.push(room);

            if (isInterior) {
                this.roofGroups[room.roofGroupId] = {
                    id: room.roofGroupId,
                    roomId: roomId,
                    cells: [],
                    elevation: 3,
                    collapsed: false
                };
            }

            for (var ix = rx; ix < rx + rw; ix++) {
                for (var iz = rz; iz < rz + rh; iz++) {
                    var cell = this.getCell(ix, iz);
                    cell.type = 'floor';
                    cell.roomId = roomId;
                    cell.zoneType = room.zoneType;
                    cell.roofGroupId = room.roofGroupId;
                    if (isInterior) {
                        this.roofGroups[room.roofGroupId].cells.push({ gx: ix, gz: iz });
                    }
                    // Biome surface patches
                    if (rng.chance(0.18)) {
                        var surf = rng.pick(cfg.surfaces);
                        cell.surface = surf;
                        cell.terrainPenalty = SURFACE_PENALTY[surf] || 1.0;
                    }
                }
            }
        }

        // Ensure spawn & safespace always exist
        if (this.rooms.length === 0) {
            this._carveFallbackRoom(10, 10, 10, 10, 'spawn');
        }
        if (this.rooms.length < 2) {
            this._carveFallbackRoom(58, 58, 10, 10, 'safespace');
        }
        this.rooms[0].type = 'spawn';
        this.rooms[this.rooms.length - 1].type = 'safespace';
        this.spawnRoom = this.rooms[0];
        this.safespaceRoom = this.rooms[this.rooms.length - 1];

        // 2. Connect rooms with 2-tile wide gothic-industrial corridors + loops
        for (var ci = 0; ci < this.rooms.length - 1; ci++) {
            this._digCorridor(this.rooms[ci].cx, this.rooms[ci].cz, this.rooms[ci + 1].cx, this.rooms[ci + 1].cz, 2);
        }
        for (var li = 0; li < 3 && this.rooms.length > 3; li++) {
            var ra = this.rooms[rng.int(0, this.rooms.length - 1)];
            var rb = this.rooms[rng.int(0, this.rooms.length - 1)];
            if (ra !== rb) this._digCorridor(ra.cx, ra.cz, rb.cx, rb.cz, 2);
        }

        // 3. Multi-tier elevation (0..3) & walkable ramps (delta == 1)
        this._buildElevationsAndRamps(rng);

        // 4. Doors / bulkheads at corridor chokepoints
        this._placeDoorsAndChokepoints(rng);

        // 5. Breachable walls for tactical flanks
        this._placeBreachableWalls(rng);

        // 6. Chasm pits along overlooks (guaranteed not to block spawn->safespace)
        this._placeChasms(rng);

        // 7. Destructible cover & structural support pillars + overhead catwalks
        this._placeCoverAndSupports(rng, cfg);

        // 8. Environmental hazards (fire, poison, cryo, warp)
        this._placeHazards(rng, cfg);

        // 9. Physics props (explosive barrels, crates, canisters) & initial light anchors
        this._placePropsAndLights(rng);

        // 10. Verify connectivity from spawn to safespace (BFS); force fallback corridor if needed
        this._ensureConnectivity();

        // 11. Initial Fog of War around spawn
        var spawnWorld = this.gridToWorld(this.spawnRoom.cx, this.spawnRoom.cz);
        this.updateFogOfWar(spawnWorld, 16);

        return this;
    };

    TerrainGrid.prototype._carveFallbackRoom = function (rx, rz, rw, rh, type) {
        var roomId = this.rooms.length;
        var room = {
            id: roomId, x: rx, y: rz, z: rz, w: rw, h: rh,
            cx: rx + Math.floor(rw / 2), cy: rz + Math.floor(rh / 2), cz: rz + Math.floor(rh / 2),
            type: type, zoneType: 'exterior', roofGroupId: null
        };
        this.rooms.push(room);
        for (var ix = rx; ix < rx + rw; ix++) {
            for (var iz = rz; iz < rz + rh; iz++) {
                var c = this.getCell(ix, iz);
                if (c) { c.type = 'floor'; c.roomId = roomId; }
            }
        }
    };

    TerrainGrid.prototype._digCorridor = function (x1, z1, x2, z2, width) {
        var w = width || 2;
        var cx = x1;
        var cz = z1;
        var carveBrush = function (self, gx, gz) {
            for (var ox = 0; ox < w; ox++) {
                for (var oz = 0; oz < w; oz++) {
                    var c = self.getCell(gx + ox, gz + oz);
                    if (c && c.type === 'wall') {
                        c.type = 'floor';
                    }
                }
            }
        };
        while (cx !== x2) {
            carveBrush(this, cx, cz);
            cx += x2 > cx ? 1 : -1;
        }
        while (cz !== z2) {
            carveBrush(this, cx, cz);
            cz += z2 > cz ? 1 : -1;
        }
        carveBrush(this, x2, z2);
    };

    TerrainGrid.prototype._buildElevationsAndRamps = function (rng) {
        for (var i = 0; i < this.rooms.length; i++) {
            var room = this.rooms[i];
            if (room.type === 'spawn') continue;

            // Create a raised platform inside the room (tier 1, 2, or 3)
            var wantPlat = (room.type === 'bunker_overlook' || room.type === 'catwalk_hall' || room.type === 'pillared_sanctum' || room.type === 'safespace' || rng.chance(0.55));
            if (!wantPlat || room.w < 7 || room.h < 7) continue;

            var tier = room.type === 'catwalk_hall' ? 2 : (room.type === 'bunker_overlook' ? rng.int(1, 3) : 1);
            var px = room.x + 2;
            var pz = room.z + 2;
            var pw = Math.max(3, room.w - 4);
            var ph = Math.max(3, room.h - 4);

            // Stepwise tier building so every tier is connected by delta == 1 ramps
            for (var t = 1; t <= tier; t++) {
                var inset = t - 1;
                var sx = px + inset;
                var sz = pz + inset;
                var sw = pw - inset * 2;
                var sh = ph - inset * 2;
                if (sw < 2 || sh < 2) break;

                for (var gx = sx; gx < sx + sw; gx++) {
                    for (var gz = sz; gz < sz + sh; gz++) {
                        var c = this.getCell(gx, gz);
                        if (c && c.type === 'floor') {
                            c.elevation = t;
                        }
                    }
                }
                // Place a ramp on one side connecting tier (t - 1) to tier t
                var rampGx = sx - 1;
                var rampGz = sz + Math.floor(sh / 2);
                var rampCell = this.getCell(rampGx, rampGz);
                if (rampCell && rampCell.type === 'floor' && rampCell.elevation === t - 1) {
                    rampCell.type = 'ramp';
                    rampCell.rampDir = 'e';
                } else {
                    rampGx = sx + Math.floor(sw / 2);
                    rampGz = sz - 1;
                    rampCell = this.getCell(rampGx, rampGz);
                    if (rampCell && rampCell.type === 'floor' && rampCell.elevation === t - 1) {
                        rampCell.type = 'ramp';
                        rampCell.rampDir = 's';
                    }
                }
            }
        }
    };

    TerrainGrid.prototype._placeDoorsAndChokepoints = function (rng) {
        var placed = 0;
        for (var z = 2; z < this.height - 2 && placed < 28; z++) {
            for (var x = 2; x < this.width - 2 && placed < 28; x++) {
                var c = this.getCell(x, z);
                if (!c || c.type !== 'floor' || c.roomId !== -1 || c.elevation !== 0) continue;
                var nWall = this.getCell(x, z - 1).type === 'wall';
                var sWall = this.getCell(x, z + 1).type === 'wall';
                var eWall = this.getCell(x + 1, z).type === 'wall';
                var wWall = this.getCell(x - 1, z).type === 'wall';
                var nFloor = this.getCell(x, z - 1).type === 'floor';
                var sFloor = this.getCell(x, z + 1).type === 'floor';
                var eFloor = this.getCell(x + 1, z).type === 'floor';
                var wFloor = this.getCell(x - 1, z).type === 'floor';

                // Corridor choke: walls on two opposite sides, floor on perpendicular axis
                var isNSCorridor = eWall && wWall && nFloor && sFloor;
                var isEWCorridor = nWall && sWall && eFloor && wFloor;
                if ((isNSCorridor || isEWCorridor) && rng.chance(0.08)) {
                    c.type = 'door';
                    c.doorOpen = false;
                    c.doorLocked = rng.chance(0.2);
                    c.doorHp = 60;
                    c.maxDoorHp = 60;
                    c.doorAxis = isNSCorridor ? 'x' : 'z';
                    c.isChokepoint = true;
                    placed++;
                }
            }
        }
        // Guarantee at least 2 interactive doors near spawn corridors for tactical testing
        if (placed < 2 && this.spawnRoom) {
            var sx = clamp(this.spawnRoom.cx, 4, this.width - 5);
            var sz = clamp(this.spawnRoom.cz, 4, this.height - 5);
            for (var dz = -6; dz <= 6; dz++) {
                for (var dx = -6; dx <= 6; dx++) {
                    var dc = this.getCell(sx + dx, sz + dz);
                    if (dc && dc.type === 'floor' && dc.roomId === -1 && dc.elevation === 0) {
                        dc.type = 'door';
                        dc.doorOpen = false;
                        dc.doorLocked = false;
                        dc.doorHp = 60;
                        dc.maxDoorHp = 60;
                        dc.doorAxis = 'x';
                        dc.isChokepoint = true;
                        placed++;
                        if (placed >= 2) return;
                    }
                }
            }
        }
    };

    TerrainGrid.prototype._placeBreachableWalls = function (rng) {
        var count = 0;
        for (var i = 1; i < this.rooms.length && count < 14; i++) {
            var r = this.rooms[i];
            var candidates = [
                { gx: r.cx, gz: r.z - 1 },
                { gx: r.cx, gz: r.z + r.h },
                { gx: r.x - 1, gz: r.cz },
                { gx: r.x + r.w, gz: r.cz }
            ];
            for (var j = 0; j < candidates.length; j++) {
                var pos = candidates[j];
                var c = this.getCell(pos.gx, pos.gz);
                if (c && c.type === 'wall' && rng.chance(0.45)) {
                    c.type = 'breachable';
                    c.wallHp = 80;
                    c.maxWallHp = 80;
                    count++;
                }
            }
        }
        // Guarantee at least 1 breachable wall near spawn room perimeter
        if (count === 0 && this.spawnRoom) {
            var sr = this.spawnRoom;
            var wc = this.getCell(sr.cx, Math.max(1, sr.z - 1));
            if (wc && wc.type === 'wall') {
                wc.type = 'breachable';
                wc.wallHp = 80;
                wc.maxWallHp = 80;
            }
        }
    };

    TerrainGrid.prototype._placeChasms = function (rng) {
        var placed = 0;
        for (var i = 1; i < this.rooms.length - 1 && placed < 16; i++) {
            var r = this.rooms[i];
            if (r.w < 8 || r.h < 8) continue;
            if (r.type !== 'catwalk_hall' && r.type !== 'bunker_overlook' && !rng.chance(0.35)) continue;
            // Place a 2x2 pit in corner quadrant away from center path
            var cx = r.x + 1;
            var cz = r.z + 1;
            for (var ox = 0; ox < 2; ox++) {
                for (var oz = 0; oz < 2; oz++) {
                    var c = this.getCell(cx + ox, cz + oz);
                    if (c && c.type === 'floor' && c.elevation === 0) {
                        c.type = 'chasm';
                        placed++;
                    }
                }
            }
        }
    };

    TerrainGrid.prototype._placeCoverAndSupports = function (rng, cfg) {
        var supportSeq = 1;
        for (var i = 0; i < this.rooms.length; i++) {
            var r = this.rooms[i];

            // Structural support pillars + overhead catwalks in sanctums/catwalks/normal rooms
            if ((r.type === 'pillared_sanctum' || r.type === 'catwalk_hall' || (i > 0 && rng.chance(0.4))) && r.w >= 7 && r.h >= 7) {
                var pillarGx = r.x + 1;
                var pillarGz = r.z + r.h - 2;
                var pCell = this.getCell(pillarGx, pillarGz);
                if (pCell && pCell.type === 'floor') {
                    var supId = 'sup_' + (supportSeq++);
                    pCell.cover = { n: 'full', e: 'full', s: 'full', w: 'full' };
                    pCell.coverHp = 120;
                    pCell.maxCoverHp = 120;
                    pCell.coverArchetype = 'pillar';
                    pCell.coverMaterial = cfg.coverMaterial;
                    pCell.structuralSupportId = supId;
                    pCell.supportsCatwalk = true;

                    var overheadCells = [];
                    for (var ox = 0; ox <= 2; ox++) {
                        for (var oz = -1; oz <= 1; oz++) {
                            var oc = this.getCell(pillarGx + ox, pillarGz + oz);
                            if (oc && oc.type === 'floor') {
                                oc.overheadGroupId = supId;
                                oc.overheadElevation = Math.max(2, oc.elevation + 2);
                                oc.isCatwalk = true;
                                overheadCells.push({ gx: oc.gx, gz: oc.gz });
                            }
                        }
                    }
                    this.structuralGroups[supId] = {
                        id: supId,
                        pillarGx: pillarGx,
                        pillarGz: pillarGz,
                        overheadCells: overheadCells,
                        collapsed: false
                    };
                }
            }

            // Tactical directional cover nodes (barricades / crates)
            var coverCount = r.type === 'spawn' ? 2 : rng.int(2, 4);
            for (var k = 0; k < coverCount; k++) {
                var cgx = rng.int(r.x + 1, r.x + r.w - 2);
                var cgz = rng.int(r.z + 1, r.z + r.h - 2);
                if (Math.abs(cgx - r.cx) <= 1 && Math.abs(cgz - r.cz) <= 1) continue;
                var cc = this.getCell(cgx, cgz);
                if (!cc || cc.type !== 'floor' || cc.coverHp > 0) continue;

                var isFull = rng.chance(0.28);
                var face = rng.pick(['n', 'e', 's', 'w']);
                var coverLevel = isFull ? 'full' : 'half';
                cc.cover[face] = coverLevel;
                if (isFull) {
                    cc.cover[oppositeDir(face)] = 'full';
                    cc.coverArchetype = 'pillar';
                    cc.coverHp = 120;
                    cc.maxCoverHp = 120;
                } else {
                    cc.coverArchetype = rng.chance(0.5) ? 'barricade' : 'crate';
                    cc.coverHp = 60;
                    cc.maxCoverHp = 60;
                }
                cc.coverMaterial = cfg.coverMaterial;
                cc.coverDamageTier = 0;
            }
        }
    };

    TerrainGrid.prototype._placeHazards = function (rng, cfg) {
        for (var i = 1; i < this.rooms.length - 1; i++) {
            var r = this.rooms[i];
            var chance = r.type === 'hazard_vat' ? 0.25 : 0.05;
            for (var gx = r.x + 1; gx < r.x + r.w - 1; gx++) {
                for (var gz = r.z + 1; gz < r.z + r.h - 1; gz++) {
                    var c = this.getCell(gx, gz);
                    if (!c || c.type !== 'floor' || c.coverHp > 0) continue;
                    if (Math.abs(gx - r.cx) <= 1 && Math.abs(gz - r.cz) <= 1) continue;
                    if (rng.chance(chance)) {
                        c.hazard = rng.pick(cfg.hazards);
                    }
                }
            }
        }
    };

    TerrainGrid.prototype._placePropsAndLights = function (rng) {
        var kinds = ['explosive_barrel', 'crate', 'canister'];
        for (var i = 0; i < this.rooms.length; i++) {
            var r = this.rooms[i];
            // Brazier/torch light anchor per room
            var lc = this.getCell(r.cx, r.cz);
            var lw = this.gridToWorld(r.cx, r.cz);
            this.lightAnchors.push({
                id: 'torch_' + i,
                x: lw.x,
                y: (lc ? lc.elevation * this.tierHeight : 0) + 2.4,
                z: lw.z,
                color: this.biome === 'void_hull' ? 0x2dd4bf : (this.biome === 'cathedral' ? 0xf59e0b : 0xfb923c),
                intensity: 1.4,
                distance: 14
            });

            var numProps = r.type === 'spawn' ? 2 : rng.int(1, 3);
            for (var p = 0; p < numProps; p++) {
                var px = rng.int(r.x + 1, r.x + r.w - 2);
                var pz = rng.int(r.z + 1, r.z + r.h - 2);
                if (px === r.cx && pz === r.cz) continue;
                var cell = this.getCell(px, pz);
                if (!cell || cell.type !== 'floor' || cell.coverHp > 0 || cell.hazard) continue;
                var pos = this.gridToWorld(px, pz);
                var kind = (i === 0 && p === 0) ? 'explosive_barrel' : rng.pick(kinds);
                this.props.push({
                    id: 'prop_' + (this._propSeq++),
                    kind: kind,
                    explosive: kind === 'explosive_barrel' || kind === 'canister',
                    x: pos.x,
                    y: pos.y,
                    z: pos.z,
                    vx: 0,
                    vy: 0,
                    vz: 0,
                    rx: 0,
                    ry: rng.range(0, Math.PI * 2),
                    rz: 0,
                    radius: 0.5,
                    mass: kind === 'crate' ? 2.0 : 1.0,
                    hp: kind === 'explosive_barrel' ? 25 : 45,
                    maxHp: kind === 'explosive_barrel' ? 25 : 45,
                    destroyed: false,
                    fuseTimer: -1,
                    fallenIntoChasm: false
                });
            }
        }
    };

    TerrainGrid.prototype._ensureConnectivity = function () {
        if (!this.spawnRoom || !this.safespaceRoom) return;
        var visited = new Uint8Array(this.width * this.height);
        var queue = [{ gx: this.spawnRoom.cx, gz: this.spawnRoom.cz }];
        visited[this.spawnRoom.cz * this.width + this.spawnRoom.cx] = 1;
        var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        var head = 0;
        var found = false;
        while (head < queue.length) {
            var cur = queue[head++];
            if (cur.gx === this.safespaceRoom.cx && cur.gz === this.safespaceRoom.cz) {
                found = true;
                break;
            }
            for (var d = 0; d < 4; d++) {
                var nx = cur.gx + dirs[d][0];
                var nz = cur.gz + dirs[d][1];
                if (!this.inBounds(nx, nz)) continue;
                var idx = nz * this.width + nx;
                if (visited[idx]) continue;
                var nc = this.cells[idx];
                if (nc.type === 'wall' || nc.type === 'chasm') continue;
                visited[idx] = 1;
                queue.push({ gx: nx, gz: nz });
            }
        }
        if (!found) {
            this._digCorridor(this.spawnRoom.cx, this.spawnRoom.cz, this.safespaceRoom.cx, this.safespaceRoom.cz, 2);
        }
    };

    // R1 #2: High-ground bonuses
    TerrainGrid.prototype.getHighGroundBonus = function (attackerPos, targetPos) {
        var ay = attackerPos ? Number(attackerPos.y) || 0 : 0;
        var ty = targetPos ? Number(targetPos.y) || 0 : 0;
        var dy = ay - ty;
        var tierDiff = Math.round(dy / this.tierHeight);
        if (tierDiff >= 1) {
            return {
                tierDiff: tierDiff,
                hasHighGround: true,
                accuracyBonus: Math.min(0.25, tierDiff * 0.10),
                rangeBonus: Math.min(6.0, tierDiff * 2.0),
                critBonus: Math.min(0.20, tierDiff * 0.08),
                damageMultiplier: 1 + Math.min(0.30, tierDiff * 0.12)
            };
        }
        if (tierDiff <= -1) {
            return {
                tierDiff: tierDiff,
                hasHighGround: false,
                accuracyBonus: Math.max(-0.15, tierDiff * 0.05),
                rangeBonus: 0,
                critBonus: 0,
                damageMultiplier: Math.max(0.85, 1 + tierDiff * 0.05)
            };
        }
        return {
            tierDiff: 0,
            hasHighGround: false,
            accuracyBonus: 0,
            rangeBonus: 0,
            critBonus: 0,
            damageMultiplier: 1.0
        };
    };

    // R1 #5: True 3D Line-of-Sight raycasting
    TerrainGrid.prototype.raycast3D = function (originVec3, dirVec3, maxDist) {
        maxDist = typeof maxDist === 'number' && maxDist > 0 ? maxDist : 100;
        var ox = Number(originVec3.x) || 0;
        var oy = Number(originVec3.y) || 0;
        var oz = Number(originVec3.z) || 0;
        var dx = Number(dirVec3.x) || 0;
        var dy = Number(dirVec3.y) || 0;
        var dz = Number(dirVec3.z) || 0;
        var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len < 1e-6) {
            return { hit: false, hitType: null, distance: 0, point: { x: ox, y: oy, z: oz }, normal: { x: 0, y: 1, z: 0 }, gx: -1, gz: -1, cell: null };
        }
        dx /= len; dy /= len; dz /= len;

        var step = 0.2;
        var startG = this.worldToGrid(ox, oz);
        var prevGx = startG.gx;
        var prevGz = startG.gz;

        for (var dist = step; dist <= maxDist; dist += step) {
            var px = ox + dx * dist;
            var py = oy + dy * dist;
            var pz = oz + dz * dist;

            var gx = Math.floor(px / this.tileSize);
            var gz = Math.floor(pz / this.tileSize);

            if (!this.inBounds(gx, gz)) {
                return {
                    hit: true,
                    hitType: 'wall',
                    distance: dist,
                    point: { x: px, y: py, z: pz },
                    normal: { x: -dx, y: 0, z: -dz },
                    gx: gx,
                    gz: gz,
                    cell: null
                };
            }

            var cell = this.getCell(gx, gz);
            var cellBaseY = cell.elevation * this.tierHeight;

            if (cell.type === 'wall' || cell.type === 'breachable' || (cell.type === 'door' && !cell.doorOpen)) {
                if (py <= cellBaseY + 3.6 && py >= -1.0) {
                    var nx = gx !== prevGx ? (prevGx - gx) : 0;
                    var nz = gz !== prevGz ? (prevGz - gz) : 0;
                    return {
                        hit: true,
                        hitType: cell.type,
                        distance: dist,
                        point: { x: px, y: py, z: pz },
                        normal: { x: nx, y: 0, z: nz },
                        gx: gx,
                        gz: gz,
                        cell: cell
                    };
                }
            }

            // Elevated terrain slab collision (cannot shoot through solid raised floors)
            if (cell.type !== 'chasm') {
                var surfH = this.getWorldHeightAt(px, pz);
                if (py <= surfH - 0.05) {
                    return {
                        hit: true,
                        hitType: 'terrain',
                        distance: dist,
                        point: { x: px, y: py, z: pz },
                        normal: { x: 0, y: 1, z: 0 },
                        gx: gx,
                        gz: gz,
                        cell: cell
                    };
                }
            }

            // Destructible cover height check (full: +2.0m, half: +0.9m)
            if (cell.coverHp > 0 && (gx !== startG.gx || gz !== startG.gz)) {
                var maxCov = 'none';
                var dirs = ['n', 'e', 's', 'w'];
                for (var i = 0; i < 4; i++) {
                    var cv = cell.cover[dirs[i]];
                    if (cv === 'full') { maxCov = 'full'; break; }
                    if (cv === 'half') maxCov = 'half';
                }
                if (maxCov !== 'none') {
                    var covTop = cellBaseY + (maxCov === 'full' ? 2.0 : 0.9);
                    if (py <= covTop && py >= cellBaseY - 0.1) {
                        return {
                            hit: true,
                            hitType: 'cover',
                            coverType: maxCov,
                            distance: dist,
                            point: { x: px, y: py, z: pz },
                            normal: { x: -dx, y: 0, z: -dz },
                            gx: gx,
                            gz: gz,
                            cell: cell
                        };
                    }
                }
            }

            prevGx = gx;
            prevGz = gz;
        }

        return {
            hit: false,
            hitType: null,
            distance: maxDist,
            point: { x: ox + dx * maxDist, y: oy + dy * maxDist, z: oz + dz * maxDist },
            normal: { x: 0, y: 1, z: 0 },
            gx: prevGx,
            gz: prevGz,
            cell: this.getCell(prevGx, prevGz)
        };
    };

    TerrainGrid.prototype.hasLineOfSight = function (aPos, bPos) {
        if (!aPos || !bPos) return false;
        var ox = Number(aPos.x) || 0;
        var oy = (Number(aPos.y) || 0) + 1.35;
        var oz = Number(aPos.z) || 0;
        var tx = Number(bPos.x) || 0;
        var ty = (Number(bPos.y) || 0) + 1.15;
        var tz = Number(bPos.z) || 0;
        var dx = tx - ox;
        var dy = ty - oy;
        var dz = tz - oz;
        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 0.4) return true;
        var res = this.raycast3D({ x: ox, y: oy, z: oz }, { x: dx, y: dy, z: dz }, dist);
        return !res.hit || res.distance >= dist - 0.35;
    };

    // R1 #3 & M2 contract: Directional cover query
    TerrainGrid.prototype.getCoverBetween = function (defenderPos, attackerPos) {
        if (!defenderPos || !attackerPos) {
            return { coverType: 'none', direction: null, integrityRatio: 0, mitigation: 0 };
        }
        var dg = this.worldToGrid(defenderPos.x, defenderPos.z);
        var cell = this.getCell(dg.gx, dg.gz);
        if (!cell) return { coverType: 'none', direction: null, integrityRatio: 0, mitigation: 0 };

        var dx = attackerPos.x - defenderPos.x;
        var dz = attackerPos.z - defenderPos.z;
        var face = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'e' : 'w') : (dz > 0 ? 's' : 'n');

        var coverType = cell.cover[face] || 'none';
        var coverCell = cell;

        if (coverType === 'none') {
            var dv = dirVector(face);
            var nb = this.getCell(dg.gx + dv.dx, dg.gz + dv.dz);
            if (nb) {
                var opp = oppositeDir(face);
                if (nb.cover[opp] && nb.cover[opp] !== 'none') {
                    coverType = nb.cover[opp];
                    coverCell = nb;
                } else if (nb.type === 'wall' || nb.type === 'breachable' || (nb.type === 'door' && !nb.doorOpen)) {
                    coverType = 'full';
                    coverCell = nb;
                }
            }
        }

        if (coverType === 'none') {
            return { coverType: 'none', direction: face, integrityRatio: 0, mitigation: 0 };
        }

        // High ground negates/halves half cover
        var elevAdvantage = (Number(attackerPos.y) || 0) - (Number(defenderPos.y) || 0);
        if (coverType === 'half' && elevAdvantage >= this.tierHeight) {
            return { coverType: 'none', direction: face, integrityRatio: 0, mitigation: 0, bypassedByHighGround: true };
        }

        var integrity = coverCell.maxCoverHp > 0 ? clamp(coverCell.coverHp / coverCell.maxCoverHp, 0, 1) : 1;
        var mitigation = coverType === 'full' ? 0.65 * integrity : 0.35 * integrity;
        return {
            coverType: coverType,
            direction: face,
            integrityRatio: integrity,
            mitigation: mitigation
        };
    };

    // R1 #9: Persistent 3D debris ring buffer
    TerrainGrid.prototype.addDebris = function (kind, x, y, z, radius, color) {
        if (this.debris.length >= this.maxDebris) {
            this.debris.shift();
        }
        var entry = {
            id: 'deb_' + (this._debrisSeq++),
            kind: kind || 'rubble', // 'crater'|'scorch'|'rubble'|'casing'
            x: x,
            y: y,
            z: z,
            radius: radius || 0.5,
            color: color || 0x4b5563,
            ry: ((this._debrisSeq * 1.618) % (Math.PI * 2))
        };
        this.debris.push(entry);
        this._emitMutation({ kind: 'debris_added', debris: entry });
        return entry;
    };

    // R1 #3, #4, #8, #12: Damage destructible cover, breachable walls, doors, structural supports
    TerrainGrid.prototype.damageCell = function (gx, gz, dmg, damageType) {
        var cell = this.getCell(gx, gz);
        if (!cell) return { changed: false };
        dmg = Math.max(0, Number(dmg) || 0);
        if (dmg <= 0) return { changed: false };

        var mult = (damageType === 'explosive' || damageType === 'thermal' || damageType === 'ap') ? 1.5 : 1.0;
        var effDmg = dmg * mult;
        var worldPos = this.gridToWorld(gx, gz);

        // Breachable wall
        if (cell.type === 'breachable') {
            cell.wallHp = Math.max(0, cell.wallHp - effDmg);
            if (cell.wallHp <= 0) {
                cell.type = 'floor';
                cell.surface = 'rubble';
                cell.terrainPenalty = SURFACE_PENALTY.rubble;
                this.addDebris('rubble', worldPos.x, worldPos.y, worldPos.z, 0.9, 0x64748b);
                this.addDebris('scorch', worldPos.x, worldPos.y, worldPos.z, 1.1, 0x1f2937);
                this._emitMutation({ kind: 'wall_breached', gx: gx, gz: gz, cell: cell });
                return { changed: true, kind: 'wall_breached', gx: gx, gz: gz, cell: cell };
            }
            this._emitMutation({ kind: 'wall_damaged', gx: gx, gz: gz, cell: cell });
            return { changed: true, kind: 'wall_damaged', gx: gx, gz: gz, cell: cell };
        }

        // Closed/locked door breach
        if (cell.type === 'door' && !cell.doorOpen) {
            cell.doorHp = Math.max(0, cell.doorHp - effDmg);
            if (cell.doorHp <= 0) {
                cell.doorOpen = true;
                cell.doorLocked = false;
                this.addDebris('scorch', worldPos.x, worldPos.y, worldPos.z, 0.9, 0x374151);
                this._emitMutation({ kind: 'door_breached', gx: gx, gz: gz, cell: cell });
                return { changed: true, kind: 'door_breached', gx: gx, gz: gz, cell: cell };
            }
            this._emitMutation({ kind: 'door_damaged', gx: gx, gz: gz, cell: cell });
            return { changed: true, kind: 'door_damaged', gx: gx, gz: gz, cell: cell };
        }

        // Destructible cover & structural collapse
        if (cell.coverHp > 0) {
            cell.coverHp = Math.max(0, cell.coverHp - effDmg);
            var ratio = cell.maxCoverHp > 0 ? cell.coverHp / cell.maxCoverHp : 0;
            cell.coverDamageTier = ratio <= 0 ? 3 : (ratio <= 0.33 ? 2 : (ratio <= 0.66 ? 1 : 0));

            if (cell.coverHp <= 0) {
                cell.cover = { n: 'none', e: 'none', s: 'none', w: 'none' };
                cell.surface = 'rubble';
                cell.terrainPenalty = SURFACE_PENALTY.rubble;
                this.addDebris('rubble', worldPos.x, worldPos.y, worldPos.z, 0.85, 0x52525b);

                var collapsed = null;
                if (cell.structuralSupportId) {
                    collapsed = this.collapseSupport(cell.structuralSupportId);
                }
                this._emitMutation({
                    kind: 'cover_destroyed',
                    gx: gx,
                    gz: gz,
                    cell: cell,
                    collapsed: collapsed
                });
                return { changed: true, kind: 'cover_destroyed', gx: gx, gz: gz, cell: cell, collapsed: collapsed };
            }

            this._emitMutation({ kind: 'cover_damaged', gx: gx, gz: gz, cell: cell });
            return { changed: true, kind: 'cover_damaged', gx: gx, gz: gz, cell: cell };
        }

        return { changed: false };
    };

    // R1 #4: Structural collapse when support pillar is destroyed
    TerrainGrid.prototype.collapseSupport = function (supportId) {
        var group = this.structuralGroups[supportId];
        if (!group || group.collapsed) return null;
        group.collapsed = true;

        var affected = [];
        var sumX = 0;
        var sumZ = 0;
        for (var i = 0; i < group.overheadCells.length; i++) {
            var coord = group.overheadCells[i];
            var oc = this.getCell(coord.gx, coord.gz);
            if (!oc) continue;
            oc.roofCollapsed = true;
            oc.overheadElevation = oc.elevation;
            oc.surface = 'rubble';
            oc.terrainPenalty = SURFACE_PENALTY.rubble;
            if (oc.roofGroupId && this.roofGroups[oc.roofGroupId]) {
                this.roofGroups[oc.roofGroupId].collapsed = true;
            }
            var w = this.gridToWorld(coord.gx, coord.gz);
            sumX += w.x;
            sumZ += w.z;
            this.addDebris('crater', w.x, w.y, w.z, 0.95, 0x18181b);
            this.addDebris('rubble', w.x + 0.3, w.y, w.z - 0.2, 0.7, 0x52525b);
            affected.push({ gx: coord.gx, gz: coord.gz, x: w.x, y: w.y, z: w.z });
        }

        var epicenter = affected.length
            ? { x: sumX / affected.length, y: 0, z: sumZ / affected.length }
            : this.gridToWorld(group.pillarGx, group.pillarGz);

        var ev = {
            type: 'structural_collapse',
            supportId: supportId,
            epicenter: epicenter,
            radius: 3.5,
            damage: 65,
            cells: affected
        };
        this.pendingEvents.push(ev);
        this._emitMutation({ kind: 'structural_collapse', event: ev });
        return ev;
    };

    // R1 #12: Interactive 3D doors/bulkheads
    TerrainGrid.prototype.setDoorLocked = function (gx, gz, locked) {
        var cell = this.getCell(gx, gz);
        if (!cell || cell.type !== 'door') return false;
        cell.doorLocked = !!locked;
        this._emitMutation({ kind: 'door_lock_changed', gx: gx, gz: gz, cell: cell });
        return true;
    };

    TerrainGrid.prototype.openDoor = function (gx, gz, forceUnlock) {
        var cell = this.getCell(gx, gz);
        if (!cell || cell.type !== 'door') return false;
        if (cell.doorLocked && !forceUnlock) return false;
        if (forceUnlock) cell.doorLocked = false;
        cell.doorOpen = true;
        this._emitMutation({ kind: 'door_opened', gx: gx, gz: gz, cell: cell });
        return true;
    };

    TerrainGrid.prototype.closeDoor = function (gx, gz) {
        var cell = this.getCell(gx, gz);
        if (!cell || cell.type !== 'door') return false;
        cell.doorOpen = false;
        this._emitMutation({ kind: 'door_closed', gx: gx, gz: gz, cell: cell });
        return true;
    };

    TerrainGrid.prototype.toggleDoor = function (gx, gz, forceUnlock) {
        var cell = this.getCell(gx, gz);
        if (!cell || cell.type !== 'door') return false;
        return cell.doorOpen ? this.closeDoor(gx, gz) : this.openDoor(gx, gz, forceUnlock);
    };

    // R1 #6: Persistent Fog of War (explored vs visible)
    TerrainGrid.prototype.updateFogOfWar = function (originPos, baseVisionTiles) {
        if (!originPos) return 0;
        var baseR = baseVisionTiles || 16;
        var og = this.worldToGrid(originPos.x, originPos.z);
        var oCell = this.getCell(og.gx, og.gz);
        var elevBonus = oCell ? oCell.elevation * 2 : 0;
        var visionTiles = baseR + elevBonus;
        var visionMeters = visionTiles * this.tileSize;

        for (var i = 0; i < this._visibleKeys.length; i++) {
            var prev = this.cells[this._visibleKeys[i]];
            if (prev) prev.visible = false;
        }
        this._visibleKeys.length = 0;

        var minGx = Math.max(0, og.gx - visionTiles);
        var maxGx = Math.min(this.width - 1, og.gx + visionTiles);
        var minGz = Math.max(0, og.gz - visionTiles);
        var maxGz = Math.min(this.height - 1, og.gz + visionTiles);
        var newlyExplored = 0;

        for (var gz = minGz; gz <= maxGz; gz++) {
            for (var gx = minGx; gx <= maxGx; gx++) {
                var dTiles = Math.hypot(gx - og.gx, gz - og.gz);
                if (dTiles > visionTiles) continue;
                var cell = this.cells[gz * this.width + gx];
                var target = {
                    x: (gx + 0.5) * this.tileSize,
                    y: cell.elevation * this.tierHeight,
                    z: (gz + 0.5) * this.tileSize
                };
                if (dTiles <= 2.2 || this.hasLineOfSight(originPos, target)) {
                    cell.visible = true;
                    if (!cell.explored) {
                        cell.explored = true;
                        newlyExplored++;
                    }
                    this._visibleKeys.push(gz * this.width + gx);
                }
            }
        }
        return newlyExplored;
    };

    // R1 #13: Terrain-based movement speed multiplier
    TerrainGrid.prototype.getMovementMultiplier = function (wx, wz, fromWx, fromWz) {
        var g = this.worldToGrid(wx, wz);
        var cell = this.getCell(g.gx, g.gz);
        if (!cell) return 1.0;
        var mult = cell.terrainPenalty || 1.0;
        if (fromWx !== undefined && fromWz !== undefined) {
            var fg = this.worldToGrid(fromWx, fromWz);
            var prev = this.getCell(fg.gx, fg.gz);
            if (prev && (cell.elevation > prev.elevation || cell.type === 'ramp')) {
                mult *= 0.8;
            }
        }
        return mult;
    };

    // R1 #7: Environmental hazards
    TerrainGrid.prototype.applyHazardAt = function (entity, dt) {
        if (!entity) return null;
        var g = this.worldToGrid(entity.x, entity.z);
        var cell = this.getCell(g.gx, g.gz);
        if (!cell || !cell.hazard) return null;

        var stepDt = typeof dt === 'number' && dt > 0 ? dt : 0.1;
        var out = { hazard: cell.hazard, damage: 0, slowFactor: 1.0, warpOffset: null };
        if (cell.hazard === 'fire') {
            out.damage = 14 * stepDt;
        } else if (cell.hazard === 'poison') {
            out.damage = 9 * stepDt;
            out.slowFactor = 0.85;
        } else if (cell.hazard === 'cryo') {
            out.damage = 4 * stepDt;
            out.slowFactor = 0.55;
        } else if (cell.hazard === 'warp') {
            out.damage = 12 * stepDt;
            out.warpOffset = { x: (cell.gx % 2 === 0 ? 0.3 : -0.3), z: (cell.gz % 2 === 0 ? -0.3 : 0.3) };
        }
        return out;
    };

    // R1 #16: Cliff & pitfall knockback
    TerrainGrid.prototype.applyKnockback = function (entity, forceVec3) {
        if (!entity || !forceVec3) return { moved: false, fallDamage: 0, chasmFall: false };
        var fx = Number(forceVec3.x) || 0;
        var fz = Number(forceVec3.z) || 0;
        var dist = Math.hypot(fx, fz);
        if (dist < 1e-4) return { moved: false, fallDamage: 0, chasmFall: false };

        var startGrid = this.worldToGrid(entity.x, entity.z);
        var startCell = this.getCell(startGrid.gx, startGrid.gz);
        var startY = startCell ? startCell.elevation * this.tierHeight : (entity.y || 0);

        var steps = Math.max(1, Math.ceil(dist / 0.4));
        var sx = fx / steps;
        var sz = fz / steps;
        var curX = entity.x;
        var curZ = entity.z;
        var curCell = startCell;

        for (var i = 0; i < steps; i++) {
            var nx = curX + sx;
            var nz = curZ + sz;
            var ng = this.worldToGrid(nx, nz);
            var nc = this.getCell(ng.gx, ng.gz);
            if (!nc) break;
            if (nc.type === 'wall' || nc.type === 'breachable' || (nc.type === 'door' && !nc.doorOpen)) {
                break;
            }
            // Cannot knock UP a sheer cliff > 0.5 tier without a ramp, but CAN knock OFF a cliff or into a chasm!
            if (curCell && nc.type !== 'chasm' && nc.elevation > curCell.elevation && nc.type !== 'ramp' && curCell.type !== 'ramp') {
                break;
            }
            curX = nx;
            curZ = nz;
            curCell = nc;
            if (nc.type === 'chasm') {
                entity.x = curX;
                entity.z = curZ;
                entity.y = -12.0;
                entity.fallenIntoChasm = true;
                entity.hp = 0;
                entity.isDead = true;
                this.pendingEvents.push({ type: 'chasm_fall', entityId: entity.id || 'player', x: curX, z: curZ });
                return { moved: true, fallDamage: 9999, chasmFall: true };
            }
        }

        entity.x = curX;
        entity.z = curZ;
        var endH = this.getWorldHeightAt(curX, curZ);
        var drop = startY - endH;
        var fallDamage = 0;
        if (drop >= this.tierHeight - 0.1 && curCell && curCell.type !== 'ramp' && startCell && startCell.type !== 'ramp') {
            fallDamage = Math.round((drop - 0.5) * 18);
            entity.hp = Math.max(0, (entity.hp || 0) - fallDamage);
            if (entity.hp <= 0) entity.isDead = true;
            this.pendingEvents.push({ type: 'cliff_fall', entityId: entity.id || 'player', drop: drop, damage: fallDamage, x: curX, z: curZ });
        }
        entity.y = endH;
        return { moved: curX !== entity.x || dist > 0, fallDamage: fallDamage, chasmFall: false };
    };

    TerrainGrid.prototype.stepFalling = function (entity, dt) {
        if (!entity) return null;
        var targetH = this.getWorldHeightAt(entity.x, entity.z);
        var g = this.worldToGrid(entity.x, entity.z);
        var cell = this.getCell(g.gx, g.gz);
        if (cell && cell.type === 'chasm') {
            entity.y = Math.max(-12.0, (entity.y || 0) - 18 * (dt || 0.016));
            entity.fallenIntoChasm = true;
            entity.hp = 0;
            entity.isDead = true;
            return { chasmFall: true, fallDamage: 9999 };
        }
        if ((entity.y || 0) > targetH + 0.05) {
            entity.vy = (entity.vy || 0) - 24 * (dt || 0.016);
            entity.y += entity.vy * (dt || 0.016);
            if (entity.y <= targetH) {
                entity.y = targetH;
                entity.vy = 0;
            }
        } else {
            entity.y = targetH;
            entity.vy = 0;
        }
        return { chasmFall: false, fallDamage: 0 };
    };

    // R1 #17: 3D Prop Physics (barrels, crates, canisters with push, tumble, chain-detonation)
    TerrainGrid.prototype.getPropById = function (propId) {
        for (var i = 0; i < this.props.length; i++) {
            if (this.props[i].id === propId) return this.props[i];
        }
        return null;
    };

    TerrainGrid.prototype.pushProp = function (propId, dirVec3, impulse) {
        var prop = this.getPropById(propId);
        if (!prop || prop.destroyed) return false;
        var dx = Number(dirVec3 && dirVec3.x) || 0;
        var dz = Number(dirVec3 && dirVec3.z) || 0;
        var len = Math.hypot(dx, dz);
        if (len < 1e-4) return false;
        var spd = (typeof impulse === 'number' ? impulse : 8.0) / Math.max(0.5, prop.mass || 1.0);
        prop.vx += (dx / len) * spd;
        prop.vz += (dz / len) * spd;
        return true;
    };

    TerrainGrid.prototype.damageProp = function (propId, dmg) {
        var prop = this.getPropById(propId);
        if (!prop || prop.destroyed) return { destroyed: false };
        prop.hp = Math.max(0, prop.hp - (Number(dmg) || 0));
        if (prop.hp <= 0) {
            return this._detonateOrBreakProp(prop);
        }
        return { destroyed: false, hp: prop.hp };
    };

    TerrainGrid.prototype._detonateOrBreakProp = function (prop) {
        if (prop.destroyed) return { destroyed: false };
        prop.destroyed = true;
        this.addDebris('rubble', prop.x, prop.y, prop.z, 0.7, 0x4b5563);

        if (!prop.explosive) {
            this._emitMutation({ kind: 'prop_destroyed', prop: prop });
            return { destroyed: true, explosive: false };
        }

        this.addDebris('crater', prop.x, prop.y, prop.z, 1.4, 0x111827);
        this.addDebris('scorch', prop.x, prop.y, prop.z, 1.8, 0x09090b);

        var radius = 5.0;
        var damage = 55;
        // Damage nearby cells (cover, breachable walls, doors, structural supports)
        var centerG = this.worldToGrid(prop.x, prop.z);
        var tileRadius = Math.ceil(radius / this.tileSize);
        for (var gz = centerG.gz - tileRadius; gz <= centerG.gz + tileRadius; gz++) {
            for (var gx = centerG.gx - tileRadius; gx <= centerG.gx + tileRadius; gx++) {
                var c = this.getCell(gx, gz);
                if (!c) continue;
                var w = this.gridToWorld(gx, gz);
                if (Math.hypot(w.x - prop.x, w.z - prop.z) <= radius) {
                    this.damageCell(gx, gz, damage, 'explosive');
                }
            }
        }

        // Chain detonation to nearby explosive props
        var chained = [];
        for (var i = 0; i < this.props.length; i++) {
            var other = this.props[i];
            if (other === prop || other.destroyed) continue;
            var d = Math.hypot(other.x - prop.x, other.z - prop.z);
            if (d <= radius) {
                if (other.explosive) {
                    other.fuseTimer = other.fuseTimer >= 0 ? Math.min(other.fuseTimer, 0.12) : 0.12;
                    chained.push(other.id);
                } else {
                    other.hp = Math.max(0, other.hp - damage);
                    if (other.hp <= 0) this._detonateOrBreakProp(other);
                }
            }
        }

        var ev = {
            type: 'prop_explosion',
            propId: prop.id,
            x: prop.x,
            y: prop.y,
            z: prop.z,
            radius: radius,
            damage: damage,
            chained: chained
        };
        this.pendingEvents.push(ev);
        this._emitMutation({ kind: 'prop_exploded', prop: prop, event: ev });
        return { destroyed: true, explosive: true, event: ev };
    };

    TerrainGrid.prototype.stepProps = function (dt) {
        dt = typeof dt === 'number' && dt > 0 ? dt : 0.016;
        for (var i = 0; i < this.props.length; i++) {
            var prop = this.props[i];
            if (prop.destroyed) continue;

            if (prop.fuseTimer >= 0) {
                prop.fuseTimer -= dt;
                if (prop.fuseTimer <= 0) {
                    this._detonateOrBreakProp(prop);
                    continue;
                }
            }

            var speed = Math.hypot(prop.vx, prop.vz);
            if (speed > 0.02) {
                var nx = prop.x + prop.vx * dt;
                var nz = prop.z + prop.vz * dt;
                var ng = this.worldToGrid(nx, nz);
                var nc = this.getCell(ng.gx, ng.gz);
                if (!nc || nc.type === 'wall' || nc.type === 'breachable' || (nc.type === 'door' && !nc.doorOpen)) {
                    prop.vx = -prop.vx * 0.4;
                    prop.vz = -prop.vz * 0.4;
                } else {
                    prop.x = nx;
                    prop.z = nz;
                    prop.rx += prop.vz * dt * 1.4;
                    prop.rz -= prop.vx * dt * 1.4;
                    if (nc.type === 'chasm') {
                        prop.y = -12.0;
                        prop.fallenIntoChasm = true;
                        prop.destroyed = true;
                    } else {
                        prop.y = this.getWorldHeightAt(prop.x, prop.z);
                    }
                }
                var damp = Math.exp(-6.5 * dt);
                prop.vx *= damp;
                prop.vz *= damp;
                if (Math.hypot(prop.vx, prop.vz) < 0.02) {
                    prop.vx = 0;
                    prop.vz = 0;
                }
            }
        }
    };

    TerrainGrid.prototype.getSummary = function () {
        var coverCells = 0;
        var doors = 0;
        var hazards = 0;
        var breachables = 0;
        var exploredCount = 0;
        var visibleCount = 0;
        for (var i = 0; i < this.cells.length; i++) {
            var c = this.cells[i];
            if (c.coverHp > 0) coverCells++;
            if (c.type === 'door') doors++;
            if (c.hazard) hazards++;
            if (c.type === 'breachable') breachables++;
            if (c.explored) exploredCount++;
            if (c.visible) visibleCount++;
        }
        return {
            width: this.width,
            height: this.height,
            tileSize: this.tileSize,
            tierHeight: this.tierHeight,
            biome: this.biome,
            seed: this.seed,
            rooms: this.rooms.length,
            coverCells: coverCells,
            doors: doors,
            hazards: hazards,
            breachables: breachables,
            structuralGroups: Object.keys(this.structuralGroups).length,
            roofGroups: Object.keys(this.roofGroups).length,
            debrisCount: this.debris.length,
            propsCount: this.props.length,
            exploredCount: exploredCount,
            visibleCount: visibleCount
        };
    };

    root.TerrainGrid = TerrainGrid;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TerrainGrid;
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
