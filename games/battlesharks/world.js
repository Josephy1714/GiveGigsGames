// BattleSharks 3D — Chunked Destructible Minecraft-Style Voxel Ocean & Subnautica Caves
window.BSWorld = (() => {
    'use strict';

    const VOXEL_SIZE = 4;
    const MIN_X = -160;
    const MIN_Y = -280;
    const MIN_Z = -160;
    const NX = 80; // 320 / 4
    const NY = 72; // 288 / 4 (-280 to +8)
    const NZ = 80; // 320 / 4

    const CHUNK_X = 16;
    const CHUNK_Y = 18;
    const CHUNK_Z = 16;
    const NCX = NX / CHUNK_X; // 5
    const NCY = NY / CHUNK_Y; // 4
    const NCZ = NZ / CHUNK_Z; // 5

    const MAT = {
        WATER: 0,
        SHALLOWS_SAND: 1,
        KELP_STONE: 2,
        JELLY_BASALT: 3,
        LOST_SLATE: 4,
        LAVA_OBSIDIAN: 5,
        BEDROCK: 6,
        BIO_CYAN: 7,
        BIO_JELLY: 8,
        BIO_BRINE: 9,
        LAVA_MAGMA: 10
    };

    const MAT_HP = {
        [MAT.SHALLOWS_SAND]: 28,
        [MAT.KELP_STONE]:    32,
        [MAT.JELLY_BASALT]:  55,
        [MAT.LOST_SLATE]:    70,
        [MAT.LAVA_OBSIDIAN]: 95,
        [MAT.BEDROCK]:       255,
        [MAT.BIO_CYAN]:      30,
        [MAT.BIO_JELLY]:     40,
        [MAT.BIO_BRINE]:     45,
        [MAT.LAVA_MAGMA]:    60
    };

    const BIOME_PALETTE = {
        [MAT.SHALLOWS_SAND]: [0.80, 0.74, 0.50],
        [MAT.KELP_STONE]:    [0.14, 0.56, 0.46],
        [MAT.JELLY_BASALT]:  [0.18, 0.21, 0.36],
        [MAT.LOST_SLATE]:    [0.10, 0.36, 0.33],
        [MAT.LAVA_OBSIDIAN]: [0.11, 0.09, 0.14],
        [MAT.BEDROCK]:       [0.05, 0.05, 0.07],
        [MAT.BIO_CYAN]:      [0.08, 0.90, 1.00],
        [MAT.BIO_JELLY]:     [0.92, 0.30, 0.86],
        [MAT.BIO_BRINE]:     [0.48, 0.96, 0.22],
        [MAT.LAVA_MAGMA]:    [1.00, 0.38, 0.08]
    };

    // Map each material ID to a tile index (0..7) in the 8-tile procedural pixel-art atlas
    const MAT_TILE = {
        [MAT.SHALLOWS_SAND]: 0,
        [MAT.KELP_STONE]:    1,
        [MAT.JELLY_BASALT]:  2,
        [MAT.LOST_SLATE]:    3,
        [MAT.LAVA_OBSIDIAN]: 4,
        [MAT.BEDROCK]:       7,
        [MAT.BIO_CYAN]:      5,
        [MAT.BIO_JELLY]:     5,
        [MAT.BIO_BRINE]:     5,
        [MAT.LAVA_MAGMA]:    6
    };

    const NUM_TILES = 8;
    function createVoxelAtlasTexture() {
        const tileSize = 16;
        const canvas = document.createElement('canvas');
        canvas.width = tileSize * NUM_TILES;
        canvas.height = tileSize;
        const ctx = canvas.getContext('2d');

        const hash = (x, y, s) => {
            const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
            return n - Math.floor(n);
        };

        for (let t = 0; t < NUM_TILES; t++) {
            const ox = t * tileSize;
            for (let y = 0; y < tileSize; y++) {
                for (let x = 0; x < tileSize; x++) {
                    const r = hash(x, y, t + 1);
                    let v = 215 + Math.floor((r - 0.5) * 46); // subtle pixel noise
                    const border = (x === 0 || y === 0 || x === 15 || y === 15);

                    if (t === 0) {
                        // Sand: soft wavy ripples
                        const wave = Math.sin((x + y * 0.5) * 0.7) * 14;
                        v = 225 + Math.floor(wave + (r - 0.5) * 28);
                    } else if (t === 1) {
                        // Kelp Stone: mossy speckles + block edge
                        if (border) v -= 20;
                        if (r > 0.78) v += 24;
                    } else if (t === 2) {
                        // Cobble / Basalt: classic Minecraft cobblestone mortar lines
                        const mortar = (y % 5 === 0) || ((x + (Math.floor(y / 5) % 2) * 4) % 8 === 0);
                        v = mortar ? 155 : 210 + Math.floor((r - 0.5) * 42);
                    } else if (t === 3) {
                        // Lost River Slate: layered fossil brick strata
                        const seam = (y % 4 === 0) || (x === 0 && (y % 8 < 4)) || (x === 8 && (y % 8 >= 4));
                        v = seam ? 160 : 212 + Math.floor((r - 0.5) * 34);
                    } else if (t === 4) {
                        // Obsidian: dark jagged flecks
                        v = r > 0.85 ? 245 : (r < 0.2 ? 155 : 195);
                        if (border) v -= 18;
                    } else if (t === 5) {
                        // Sea Lantern / Glowing Crystal: crisp bright core + crystalline frame
                        const edge = x <= 1 || y <= 1 || x >= 14 || y >= 14;
                        const inner = x >= 4 && x <= 11 && y >= 4 && y <= 11;
                        v = edge ? 175 : (inner ? 255 : 220 + Math.floor((r - 0.5) * 25));
                    } else if (t === 6) {
                        // Magma Block: hot cracked veins
                        const crack = Math.abs(Math.sin(x * 0.45) + Math.cos(y * 0.45)) < 0.35;
                        v = crack ? 255 : (145 + Math.floor(r * 45));
                    } else if (t === 7) {
                        // Bedrock: high-contrast speckled pattern
                        v = r > 0.55 ? 235 : 120;
                    }

                    v = Math.max(95, Math.min(255, v));
                    ctx.fillStyle = `rgb(${v},${v},${v})`;
                    ctx.fillRect(ox + x, y, 1, 1);
                }
            }
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        return tex;
    }

    function createCrackOverlayTexture(stage) {
        const size = 16;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, size, size);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineWidth = 1.5;
        const lines = Math.min(8, stage * 2);
        for (let i = 0; i < lines; i++) {
            ctx.beginPath();
            const ang = (i / lines) * Math.PI * 2 + 0.3;
            ctx.moveTo(8, 8);
            ctx.lineTo(8 + Math.cos(ang) * (3 + stage * 1.6), 8 + Math.sin(ang) * (3 + stage * 1.6));
            ctx.stroke();
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        return tex;
    }

    function noise3(x, y, z) {
        const s1 = Math.sin(x * 0.052 + Math.cos(z * 0.048) * 1.3) * Math.cos(y * 0.058 + Math.sin(x * 0.041));
        const s2 = Math.sin((x + z) * 0.095 - y * 0.08) * Math.cos((z - x) * 0.085 + y * 0.075);
        const s3 = Math.sin(x * 0.17 + y * 0.19) * Math.sin(z * 0.18 - x * 0.14);
        return s1 * 0.55 + s2 * 0.30 + s3 * 0.15;
    }

    function distToSegmentSq(px, py, pz, ax, ay, az, bx, by, bz) {
        const vx = bx - ax, vy = by - ay, vz = bz - az;
        const wx = px - ax, wy = py - ay, wz = pz - az;
        const lenSq = vx * vx + vy * vy + vz * vz || 1;
        const t = Math.max(0, Math.min(1, (wx * vx + wy * vy + wz * vz) / lenSq));
        const dx = px - (ax + t * vx);
        const dy = py - (ay + t * vy);
        const dz = pz - (az + t * vz);
        return dx * dx + dy * dy + dz * dz;
    }

    // Named Subnautica Caverns & Guaranteed Overworld Sinkhole Chimneys + Loops
    const CAVE_CHAMBERS = [
        { name: 'West Jellyshroom',  x: -56, y: -78,  z: -52, rx: 34, ry: 22, rz: 34 },
        { name: 'East Jellyshroom',  x: 56,  y: -82,  z: -24, rx: 34, ry: 22, rz: 34 },
        { name: 'South Kelp Grotto', x: -6,  y: -74,  z: 72,  rx: 32, ry: 22, rz: 32 },
        { name: 'Lost River Vault',  x: -8,  y: -160, z: 8,   rx: 52, ry: 26, rz: 52 },
        { name: 'Abyssal Lava Core', x: 0,   y: -238, z: 0,   rx: 66, ry: 30, rz: 66 }
    ];

    const CAVE_TUNNELS = [
        // 4 Wide Overworld Sinkhole Chimneys (straight from sunlit Overworld y=+8 into every biome)
        { a: [-64, 8, -60],  b: [-56, -78, -52], r: 15 }, // NW Sinkhole -> West Jellyshroom
        { a: [64, 8, -52],   b: [56, -82, -24],  r: 15 }, // NE Sinkhole -> East Jellyshroom
        { a: [0, 8, 86],     b: [-6, -74, 72],   r: 15 }, // South Trench -> South Kelp Grotto
        { a: [82, 8, 52],    b: [76, -82, 46],   r: 14 }, // SE Volcanic Chimney (Overworld -> East)
        { a: [76, -82, 46],  b: [70, -162, 40],  r: 14 }, // SE Chimney (East -> Lost River depth)
        { a: [70, -162, 40], b: [56, -236, 28],  r: 15 }, // SE Chimney (Lost River -> Lava Core)

        // Direct Jellyshroom <-> South Kelp Grotto Loop (all upper caverns mutually connected)
        { a: [-56, -78, -52], b: [0, -82, -40],   r: 14 },
        { a: [0, -82, -40],   b: [56, -82, -24],  r: 14 },
        { a: [56, -82, -24],  b: [34, -78, 32],   r: 14 },
        { a: [34, -78, 32],   b: [-6, -74, 72],   r: 14 },
        { a: [-6, -74, 72],   b: [-42, -76, 14],  r: 14 },
        { a: [-42, -76, 14],  b: [-56, -78, -52], r: 14 },

        // Jellyshroom / Kelp Grotto -> Lost River Vault (3 wide routes)
        { a: [-56, -78, -52], b: [-8, -160, 8],   r: 15 },
        { a: [56, -82, -24],  b: [-8, -160, 8],   r: 15 },
        { a: [-6, -74, 72],   b: [-20, -158, 44], r: 15 },
        { a: [-20, -158, 44], b: [-8, -160, 8],   r: 16 },
        { a: [-8, -160, 8],   b: [70, -162, 40],  r: 15 },

        // Lost River -> Abyssal Lava Core (2 main descent shafts + SE Chimney link)
        { a: [-8, -160, 8],   b: [-26, -200, -18], r: 15 },
        { a: [-26, -200, -18],b: [0, -238, 0],     r: 16 },
        { a: [-8, -160, 8],   b: [22, -200, 18],   r: 15 },
        { a: [22, -200, 18],  b: [0, -238, 0],     r: 16 },
        { a: [56, -236, 28],  b: [0, -238, 0],     r: 16 }
    ];

    function buildVoxelWorld(scene, AQUARIUM_POS) {
        const total = NX * NY * NZ;
        const voxels = new Uint8Array(total);
        const voxelHP = new Uint8Array(total);

        const idx = (ix, iy, iz) => (iy * NZ + iz) * NX + ix;
        const inBounds = (ix, iy, iz) => ix >= 0 && ix < NX && iy >= 0 && iy < NY && iz >= 0 && iz < NZ;

        const carveSphere = (wx, wy, wz, rad) => {
            const minIx = Math.max(0, Math.floor((wx - rad - MIN_X) / VOXEL_SIZE));
            const maxIx = Math.min(NX - 1, Math.floor((wx + rad - MIN_X) / VOXEL_SIZE));
            const minIy = Math.max(1, Math.floor((wy - rad - MIN_Y) / VOXEL_SIZE));
            const maxIy = Math.min(NY - 1, Math.floor((wy + rad - MIN_Y) / VOXEL_SIZE));
            const minIz = Math.max(0, Math.floor((wz - rad - MIN_Z) / VOXEL_SIZE));
            const maxIz = Math.min(NZ - 1, Math.floor((wz + rad - MIN_Z) / VOXEL_SIZE));
            const r2 = rad * rad;
            for (let iy = minIy; iy <= maxIy; iy++) {
                const cy = MIN_Y + (iy + 0.5) * VOXEL_SIZE;
                for (let iz = minIz; iz <= maxIz; iz++) {
                    const cz = MIN_Z + (iz + 0.5) * VOXEL_SIZE;
                    for (let ix = minIx; ix <= maxIx; ix++) {
                        const cx = MIN_X + (ix + 0.5) * VOXEL_SIZE;
                        const d2 = (cx - wx) * (cx - wx) + (cy - wy) * (cy - wy) + (cz - wz) * (cz - wz);
                        if (d2 <= r2) {
                            const id = idx(ix, iy, iz);
                            voxels[id] = MAT.WATER;
                            voxelHP[id] = 0;
                        }
                    }
                }
            }
        };

        for (let iy = 0; iy < NY; iy++) {
            const wy = MIN_Y + (iy + 0.5) * VOXEL_SIZE;
            for (let iz = 0; iz < NZ; iz++) {
                const wz = MIN_Z + (iz + 0.5) * VOXEL_SIZE;
                for (let ix = 0; ix < NX; ix++) {
                    const wx = MIN_X + (ix + 0.5) * VOXEL_SIZE;
                    const radial = Math.hypot(wx, wz);

                    // Indestructible bedrock floor
                    if (iy === 0) {
                        const id = idx(ix, iy, iz);
                        voxels[id] = MAT.BEDROCK;
                        voxelHP[id] = MAT_HP[MAT.BEDROCK];
                        continue;
                    }
                    // Outer arena canyon rim
                    if (radial > 152 && wy < -2) {
                        const mat = wy > -45 ? MAT.KELP_STONE : wy > -125 ? MAT.JELLY_BASALT : wy > -205 ? MAT.LOST_SLATE : MAT.LAVA_OBSIDIAN;
                        const id = idx(ix, iy, iz);
                        voxels[id] = mat;
                        voxelHP[id] = MAT_HP[mat];
                        continue;
                    }

                    // Keep BS-07 Aquarium lagoon + exit corridor & boss spawn open
                    const dAq = Math.hypot(wx - AQUARIUM_POS.x, wz - AQUARIUM_POS.z);
                    if (dAq < 28 && wy > -22) continue;
                    if (Math.abs(wx) < 18 && wz >= -48 && wz <= 20 && wy > -14) continue;
                    if (Math.hypot(wx, wy - 10, wz + 142) < 24) continue;

                    let solid = false;
                    const n = noise3(wx, wy, wz);
                    const nFine = noise3(wx * 2.1 + 31, wy * 2.1 - 17, wz * 2.1 + 53);

                    if (wy > -18) {
                        // Overworld Safe Shallows: open sunlit water with blocky reef pillars & coral arches
                        const rimFactor = Math.max(0, (radial - 70) / 82);
                        const spire = n * 0.62 + rimFactor * 0.70;
                        if (spire > 0.52 && radial > 42) solid = true;
                    } else if (wy > -44) {
                        // Reef Shelf Roof separating Overworld from Jellyshroom Caverns
                        const shelfDensity = 0.30 + n * 0.72;
                        if (shelfDensity > 0.10) solid = true;
                    } else if (wy > -126) {
                        // Jellyshroom Caverns
                        if (n + nFine * 0.22 > -0.10) solid = true;
                    } else if (wy > -206) {
                        // Lost River
                        if (n + Math.sin(wy * 0.08) * 0.12 > -0.14) solid = true;
                    } else {
                        // Inactive Lava Zone
                        if (n + nFine * 0.25 > -0.18) solid = true;
                    }

                    // Carve guaranteed vaulted biome chambers & wide Overworld-connected cave tunnels
                    if (solid) {
                        for (let c = 0; c < CAVE_CHAMBERS.length; c++) {
                            const ch = CAVE_CHAMBERS[c];
                            const ex = (wx - ch.x) / ch.rx;
                            const ey = (wy - ch.y) / ch.ry;
                            const ez = (wz - ch.z) / ch.rz;
                            if (ex * ex + ey * ey + ez * ez + Math.max(-0.08, n * 0.12) < 1.0) {
                                solid = false;
                                break;
                            }
                        }
                    }
                    if (solid) {
                        for (let t = 0; t < CAVE_TUNNELS.length; t++) {
                            const tun = CAVE_TUNNELS[t];
                            // Clamp minimum tunnel radius to tun.r - 1.5 so noise never pinches a passage shut
                            const rEff = Math.max(tun.r - 1.5, tun.r + n * 2.5);
                            if (distToSegmentSq(wx, wy, wz, tun.a[0], tun.a[1], tun.a[2], tun.b[0], tun.b[1], tun.b[2]) < rEff * rEff) {
                                solid = false;
                                break;
                            }
                        }
                    }

                    if (!solid) continue;

                    const vein = noise3(wx * 2.8 + 91, wy * 2.8 - 43, wz * 2.8 + 19);
                    let mat = MAT.SHALLOWS_SAND;
                    if (wy > -24) {
                        mat = vein > 0.45 ? MAT.BIO_CYAN : (nFine > 0.02 ? MAT.KELP_STONE : MAT.SHALLOWS_SAND);
                    } else if (wy > -44) {
                        mat = vein > 0.46 ? MAT.BIO_CYAN : MAT.KELP_STONE;
                    } else if (wy > -126) {
                        mat = vein > 0.44 ? MAT.BIO_JELLY : (vein < -0.52 ? MAT.BIO_CYAN : MAT.JELLY_BASALT);
                    } else if (wy > -206) {
                        mat = vein > 0.42 ? MAT.BIO_BRINE : MAT.LOST_SLATE;
                    } else {
                        mat = vein > 0.34 ? MAT.LAVA_MAGMA : MAT.LAVA_OBSIDIAN;
                    }

                    const id = idx(ix, iy, iz);
                    voxels[id] = mat;
                    voxelHP[id] = MAT_HP[mat];
                }
            }
        }

        // Molten magma seams on Lava Core floor (iy = 1)
        for (let iz = 0; iz < NZ; iz++) {
            const wz = MIN_Z + (iz + 0.5) * VOXEL_SIZE;
            for (let ix = 0; ix < NX; ix++) {
                const wx = MIN_X + (ix + 0.5) * VOXEL_SIZE;
                if (Math.hypot(wx, wz) < 56 && noise3(wx * 1.4, -270, wz * 1.4) > 0.18) {
                    const id = idx(ix, 1, iz);
                    if (voxels[id] === MAT.WATER) {
                        voxels[id] = MAT.LAVA_MAGMA;
                        voxelHP[id] = MAT_HP[MAT.LAVA_MAGMA];
                    }
                }
            }
        }

        // Programmatic BFS connectivity check from Overworld BS-07 to every cavern; auto-carve if ever blocked
        const verifyAndHealConnectivity = () => {
            const toIx = (x) => Math.max(0, Math.min(NX - 1, Math.floor((x - MIN_X) / VOXEL_SIZE)));
            const toIy = (y) => Math.max(0, Math.min(NY - 1, Math.floor((y - MIN_Y) / VOXEL_SIZE)));
            const toIz = (z) => Math.max(0, Math.min(NZ - 1, Math.floor((z - MIN_Z) / VOXEL_SIZE)));
            const hasClearance = (ix, iy, iz) => {
                if (ix < 1 || ix >= NX - 1 || iy < 1 || iy >= NY - 1 || iz < 1 || iz >= NZ - 1) return false;
                return voxels[idx(ix, iy, iz)] === MAT.WATER &&
                    voxels[idx(ix + 1, iy, iz)] === MAT.WATER &&
                    voxels[idx(ix, iy + 1, iz)] === MAT.WATER &&
                    voxels[idx(ix, iy, iz + 1)] === MAT.WATER;
            };

            const visited = new Uint8Array(total);
            const q = [];
            const startIx = toIx(0), startIy = toIy(6), startIz = toIz(12);
            const startId = idx(startIx, startIy, startIz);
            visited[startId] = 1;
            q.push(startId);

            let head = 0;
            while (head < q.length) {
                const cur = q[head++];
                const ix = cur % NX;
                const rem = (cur - ix) / NX;
                const iz = rem % NZ;
                const iy = (rem - iz) / NZ;

                const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
                for (let d = 0; d < 6; d++) {
                    const nx = ix + dirs[d][0];
                    const ny = iy + dirs[d][1];
                    const nz = iz + dirs[d][2];
                    if (!inBounds(nx, ny, nz)) continue;
                    const nid = idx(nx, ny, nz);
                    if (visited[nid]) continue;
                    if (hasClearance(nx, ny, nz)) {
                        visited[nid] = 1;
                        q.push(nid);
                    }
                }
            }

            // Ensure every cavern chamber center is reachable from BS-07 Overworld
            for (const ch of CAVE_CHAMBERS) {
                const cid = idx(toIx(ch.x), toIy(ch.y), toIz(ch.z));
                if (!visited[cid]) {
                    const steps = 28;
                    for (let s = 0; s <= steps; s++) {
                        const t = s / steps;
                        carveSphere(ch.x, ch.y + (8 - ch.y) * t, ch.z, 12);
                    }
                }
            }
        };
        verifyAndHealConnectivity();

        // Save initial world snapshot for clean restarts
        const initialVoxels = new Uint8Array(voxels);
        const initialHP = new Uint8Array(voxelHP);

        const isSolidGrid = (ix, iy, iz) => {
            if (!inBounds(ix, iy, iz)) return false;
            return voxels[idx(ix, iy, iz)] !== MAT.WATER;
        };

        const atlasTex = createVoxelAtlasTexture();
        const terrainMat = new THREE.MeshStandardMaterial({
            map: atlasTex,
            vertexColors: true,
            roughness: 0.88,
            metalness: 0.08
        });
        const emissiveMat = new THREE.MeshBasicMaterial({
            map: atlasTex,
            vertexColors: true
        });

        const FACES = [
            { dir: [1, 0, 0],  shade: 0.88, corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], uAxis: [0,1,0], vAxis: [0,0,1] },
            { dir: [-1, 0, 0], shade: 0.82, corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], uAxis: [0,1,0], vAxis: [0,0,1] },
            { dir: [0, 1, 0],  shade: 1.00, corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], uAxis: [1,0,0], vAxis: [0,0,1] },
            { dir: [0, -1, 0], shade: 0.68, corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], uAxis: [1,0,0], vAxis: [0,0,1] },
            { dir: [0, 0, 1],  shade: 0.92, corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]], uAxis: [1,0,0], vAxis: [0,1,0] },
            { dir: [0, 0, -1], shade: 0.78, corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]], uAxis: [1,0,0], vAxis: [0,1,0] }
        ];
        const CORNER_UV = [[0, 0], [0, 1], [1, 1], [1, 0]];

        // Chunk storage: each chunk holds optional terrainMesh and emissiveMesh
        const chunks = new Array(NCX * NCY * NCZ);
        const chunkIdx = (cx, cy, cz) => (cy * NCZ + cz) * NCX + cx;

        function buildChunk(cx, cy, cz) {
            const cId = chunkIdx(cx, cy, cz);
            let slot = chunks[cId];
            if (!slot) {
                slot = { terrainMesh: null, emissiveMesh: null };
                chunks[cId] = slot;
            }
            if (slot.terrainMesh) {
                scene.remove(slot.terrainMesh);
                slot.terrainMesh.geometry.dispose();
                slot.terrainMesh = null;
            }
            if (slot.emissiveMesh) {
                scene.remove(slot.emissiveMesh);
                slot.emissiveMesh.geometry.dispose();
                slot.emissiveMesh = null;
            }

            const makeBuilder = () => ({ pos: [], norm: [], uv: [], col: [], idx: [], vCount: 0 });
            const terrain = makeBuilder();
            const emissive = makeBuilder();

            const ix0 = cx * CHUNK_X, ix1 = ix0 + CHUNK_X;
            const iy0 = cy * CHUNK_Y, iy1 = iy0 + CHUNK_Y;
            const iz0 = cz * CHUNK_Z, iz1 = iz0 + CHUNK_Z;

            for (let iy = iy0; iy < iy1; iy++) {
                const wy0 = MIN_Y + iy * VOXEL_SIZE;
                for (let iz = iz0; iz < iz1; iz++) {
                    const wz0 = MIN_Z + iz * VOXEL_SIZE;
                    for (let ix = ix0; ix < ix1; ix++) {
                        const matId = voxels[idx(ix, iy, iz)];
                        if (matId === MAT.WATER) continue;

                        const wx0 = MIN_X + ix * VOXEL_SIZE;
                        const baseCol = BIOME_PALETTE[matId] || BIOME_PALETTE[MAT.JELLY_BASALT];
                        const isGlow = matId >= MAT.BIO_CYAN;
                        const target = isGlow ? emissive : terrain;
                        const tile = MAT_TILE[matId] || 0;
                        const uMin = tile / NUM_TILES + 0.002;
                        const uMax = (tile + 1) / NUM_TILES - 0.002;

                        const jitter = ((Math.sin(ix * 12.9898 + iy * 78.233 + iz * 37.719) * 43758.5453) % 1);
                        const jMul = 0.94 + Math.abs(jitter) * 0.12;

                        for (let f = 0; f < 6; f++) {
                            const face = FACES[f];
                            const nx = ix + face.dir[0];
                            const ny = iy + face.dir[1];
                            const nz = iz + face.dir[2];
                            if (isSolidGrid(nx, ny, nz)) continue;

                            const baseVertex = target.vCount;
                            for (let c = 0; c < 4; c++) {
                                const corner = face.corners[c];
                                target.pos.push(
                                    wx0 + corner[0] * VOXEL_SIZE,
                                    wy0 + corner[1] * VOXEL_SIZE,
                                    wz0 + corner[2] * VOXEL_SIZE
                                );
                                target.norm.push(face.dir[0], face.dir[1], face.dir[2]);

                                const cuv = CORNER_UV[c];
                                target.uv.push(cuv[0] ? uMax : uMin, cuv[1] ? 0.99 : 0.01);

                                let ao = 1.0;
                                if (!isGlow) {
                                    const su = (corner[0] * face.uAxis[0] + corner[1] * face.uAxis[1] + corner[2] * face.uAxis[2]) ? 1 : -1;
                                    const sv = (corner[0] * face.vAxis[0] + corner[1] * face.vAxis[1] + corner[2] * face.vAxis[2]) ? 1 : -1;
                                    const s1 = isSolidGrid(nx + su * face.uAxis[0], ny + su * face.uAxis[1], nz + su * face.uAxis[2]) ? 1 : 0;
                                    const s2 = isSolidGrid(nx + sv * face.vAxis[0], ny + sv * face.vAxis[1], nz + sv * face.vAxis[2]) ? 1 : 0;
                                    const diag = isSolidGrid(
                                        nx + su * face.uAxis[0] + sv * face.vAxis[0],
                                        ny + su * face.uAxis[1] + sv * face.vAxis[1],
                                        nz + su * face.uAxis[2] + sv * face.vAxis[2]
                                    ) ? 1 : 0;
                                    const occ = (s1 && s2) ? 3 : (s1 + s2 + diag);
                                    ao = 1.0 - occ * 0.15;
                                }

                                const shade = (isGlow ? (0.78 + 0.22 * face.shade) : face.shade) * ao * jMul;
                                target.col.push(
                                    Math.min(1, baseCol[0] * shade),
                                    Math.min(1, baseCol[1] * shade),
                                    Math.min(1, baseCol[2] * shade)
                                );
                            }
                            target.idx.push(
                                baseVertex, baseVertex + 1, baseVertex + 2,
                                baseVertex, baseVertex + 2, baseVertex + 3
                            );
                            target.vCount += 4;
                        }
                    }
                }
            }

            const toMesh = (builder, mat) => {
                if (builder.vCount === 0) return null;
                const geo = new THREE.BufferGeometry();
                geo.setAttribute('position', new THREE.Float32BufferAttribute(builder.pos, 3));
                geo.setAttribute('normal', new THREE.Float32BufferAttribute(builder.norm, 3));
                geo.setAttribute('uv', new THREE.Float32BufferAttribute(builder.uv, 2));
                geo.setAttribute('color', new THREE.Float32BufferAttribute(builder.col, 3));
                geo.setIndex(builder.idx);
                const mesh = new THREE.Mesh(geo, mat);
                scene.add(mesh);
                return mesh;
            };

            slot.terrainMesh = toMesh(terrain, terrainMat);
            slot.emissiveMesh = toMesh(emissive, emissiveMat);
        }

        for (let cy = 0; cy < NCY; cy++) {
            for (let cz = 0; cz < NCZ; cz++) {
                for (let cx = 0; cx < NCX; cx++) {
                    buildChunk(cx, cy, cz);
                }
            }
        }

        // Biome Cave Landmark Lights
        const caveLights = [
            { pos: [-56, -78, -52], color: 0xd946ef, int: 2.3, dist: 80 },
            { pos: [56, -82, -24],  color: 0xa855f7, int: 2.3, dist: 80 },
            { pos: [-6, -74, 72],   color: 0x10b981, int: 2.1, dist: 75 },
            { pos: [-8, -160, 8],   color: 0x22c55e, int: 2.5, dist: 90 },
            { pos: [0, -238, 0],    color: 0xf97316, int: 2.9, dist: 100 }
        ];
        for (const cl of caveLights) {
            const pt = new THREE.PointLight(cl.color, cl.int, cl.dist);
            pt.position.set(cl.pos[0], cl.pos[1], cl.pos[2]);
            scene.add(pt);
        }

        // Minecraft-style Crack Overlay Meshes for partially damaged blocks
        const crackMats = [1, 2, 3].map((stg) => new THREE.MeshBasicMaterial({
            map: createCrackOverlayTexture(stg),
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1
        }));
        const crackGeo = new THREE.BoxGeometry(VOXEL_SIZE * 1.015, VOXEL_SIZE * 1.015, VOXEL_SIZE * 1.015);
        const crackOverlays = new Map(); // voxel idx -> mesh

        const setCrackOverlay = (id, ix, iy, iz, matId) => {
            const maxHp = MAT_HP[matId] || 50;
            const hp = voxelHP[id];
            const ratio = hp / maxHp;
            if (ratio >= 1 || hp <= 0) {
                const existing = crackOverlays.get(id);
                if (existing) {
                    scene.remove(existing);
                    crackOverlays.delete(id);
                }
                return;
            }
            const stageIdx = ratio > 0.66 ? 0 : (ratio > 0.33 ? 1 : 2);
            let m = crackOverlays.get(id);
            if (!m) {
                m = new THREE.Mesh(crackGeo, crackMats[stageIdx]);
                m.position.set(
                    MIN_X + (ix + 0.5) * VOXEL_SIZE,
                    MIN_Y + (iy + 0.5) * VOXEL_SIZE,
                    MIN_Z + (iz + 0.5) * VOXEL_SIZE
                );
                scene.add(m);
                crackOverlays.set(id, m);
            } else {
                m.material = crackMats[stageIdx];
            }
        };

        const isSolidAt = (x, y, z) => {
            const ix = Math.floor((x - MIN_X) / VOXEL_SIZE);
            const iy = Math.floor((y - MIN_Y) / VOXEL_SIZE);
            const iz = Math.floor((z - MIN_Z) / VOXEL_SIZE);
            return isSolidGrid(ix, iy, iz);
        };

        // Exact 3D DDA Voxel Raycast (for lasers & camera wall prevention)
        const raycastVoxel = (origin, dir, maxDist = 90) => {
            let x = origin.x, y = origin.y, z = origin.z;
            const dx = dir.x, dy = dir.y, dz = dir.z;
            let ix = Math.floor((x - MIN_X) / VOXEL_SIZE);
            let iy = Math.floor((y - MIN_Y) / VOXEL_SIZE);
            let iz = Math.floor((z - MIN_Z) / VOXEL_SIZE);

            const stepX = dx >= 0 ? 1 : -1;
            const stepY = dy >= 0 ? 1 : -1;
            const stepZ = dz >= 0 ? 1 : -1;

            const tDeltaX = dx !== 0 ? Math.abs(VOXEL_SIZE / dx) : 1e9;
            const tDeltaY = dy !== 0 ? Math.abs(VOXEL_SIZE / dy) : 1e9;
            const tDeltaZ = dz !== 0 ? Math.abs(VOXEL_SIZE / dz) : 1e9;

            const nextBoundX = MIN_X + (ix + (stepX > 0 ? 1 : 0)) * VOXEL_SIZE;
            const nextBoundY = MIN_Y + (iy + (stepY > 0 ? 1 : 0)) * VOXEL_SIZE;
            const nextBoundZ = MIN_Z + (iz + (stepZ > 0 ? 1 : 0)) * VOXEL_SIZE;

            let tMaxX = dx !== 0 ? (nextBoundX - x) / dx : 1e9;
            let tMaxY = dy !== 0 ? (nextBoundY - y) / dy : 1e9;
            let tMaxZ = dz !== 0 ? (nextBoundZ - z) / dz : 1e9;

            let dist = 0;
            const maxSteps = Math.ceil(maxDist / VOXEL_SIZE) + 4;
            for (let s = 0; s < maxSteps && dist <= maxDist; s++) {
                if (isSolidGrid(ix, iy, iz)) {
                    const matId = voxels[idx(ix, iy, iz)];
                    return {
                        ix, iy, iz, matId, dist,
                        hitPos: new THREE.Vector3(
                            origin.x + dx * dist,
                            origin.y + dy * dist,
                            origin.z + dz * dist
                        )
                    };
                }
                if (tMaxX < tMaxY) {
                    if (tMaxX < tMaxZ) {
                        dist = tMaxX;
                        tMaxX += tDeltaX;
                        ix += stepX;
                    } else {
                        dist = tMaxZ;
                        tMaxZ += tDeltaZ;
                        iz += stepZ;
                    }
                } else {
                    if (tMaxY < tMaxZ) {
                        dist = tMaxY;
                        tMaxY += tDeltaY;
                        iy += stepY;
                    } else {
                        dist = tMaxZ;
                        tMaxZ += tDeltaZ;
                        iz += stepZ;
                    }
                }
            }
            return null;
        };

        // Damage & destroy voxels at world coordinate (Minecraft-style destruction + chunk rebuild)
        const damageVoxelAt = (wx, wy, wz, damage = 45, splashBlocks = 0) => {
            const cx0 = Math.floor((wx - MIN_X) / VOXEL_SIZE);
            const cy0 = Math.floor((wy - MIN_Y) / VOXEL_SIZE);
            const cz0 = Math.floor((wz - MIN_Z) / VOXEL_SIZE);

            const dirtyChunks = new Set();
            const brokenBlocks = [];

            const markChunk = (cx, cy, cz) => {
                if (cx >= 0 && cx < NCX && cy >= 0 && cy < NCY && cz >= 0 && cz < NCZ) {
                    dirtyChunks.add(chunkIdx(cx, cy, cz));
                }
            };

            for (let dy = -splashBlocks; dy <= splashBlocks; dy++) {
                for (let dz = -splashBlocks; dz <= splashBlocks; dz++) {
                    for (let dx = -splashBlocks; dx <= splashBlocks; dx++) {
                        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > splashBlocks + 1) continue;
                        const ix = cx0 + dx;
                        const iy = cy0 + dy;
                        const iz = cz0 + dz;
                        if (!inBounds(ix, iy, iz) || iy === 0) continue; // bedrock indestructible

                        const id = idx(ix, iy, iz);
                        const matId = voxels[id];
                        if (matId === MAT.WATER || matId === MAT.BEDROCK) continue;

                        const distFactor = (dx === 0 && dy === 0 && dz === 0) ? 1.0 : 0.65;
                        const dmg = Math.max(1, Math.round(damage * distFactor));
                        const nextHp = Math.max(0, voxelHP[id] - dmg);
                        voxelHP[id] = nextHp;

                        if (nextHp === 0) {
                            voxels[id] = MAT.WATER;
                            setCrackOverlay(id, ix, iy, iz, matId);
                            const pal = BIOME_PALETTE[matId] || [0.5, 0.7, 0.8];
                            const colorHex = ((Math.round(pal[0] * 255) & 255) << 16) |
                                ((Math.round(pal[1] * 255) & 255) << 8) |
                                (Math.round(pal[2] * 255) & 255);
                            brokenBlocks.push({
                                pos: new THREE.Vector3(
                                    MIN_X + (ix + 0.5) * VOXEL_SIZE,
                                    MIN_Y + (iy + 0.5) * VOXEL_SIZE,
                                    MIN_Z + (iz + 0.5) * VOXEL_SIZE
                                ),
                                matId,
                                color: colorHex
                            });

                            const chX = Math.floor(ix / CHUNK_X);
                            const chY = Math.floor(iy / CHUNK_Y);
                            const chZ = Math.floor(iz / CHUNK_Z);
                            markChunk(chX, chY, chZ);
                            if (ix % CHUNK_X === 0) markChunk(chX - 1, chY, chZ);
                            if (ix % CHUNK_X === CHUNK_X - 1) markChunk(chX + 1, chY, chZ);
                            if (iy % CHUNK_Y === 0) markChunk(chX, chY - 1, chZ);
                            if (iy % CHUNK_Y === CHUNK_Y - 1) markChunk(chX, chY + 1, chZ);
                            if (iz % CHUNK_Z === 0) markChunk(chX, chY, chZ - 1);
                            if (iz % CHUNK_Z === CHUNK_Z - 1) markChunk(chX, chY, chZ + 1);
                        } else {
                            setCrackOverlay(id, ix, iy, iz, matId);
                        }
                    }
                }
            }

            dirtyChunks.forEach((cId) => {
                const cx = cId % NCX;
                const rem = (cId - cx) / NCX;
                const cz = rem % NCZ;
                const cy = (rem - cz) / NCZ;
                buildChunk(cx, cy, cz);
            });

            return brokenBlocks;
        };

        const resetTerrain = () => {
            crackOverlays.forEach((mesh) => scene.remove(mesh));
            crackOverlays.clear();
            const dirty = new Set();
            for (let i = 0; i < total; i++) {
                if (voxels[i] !== initialVoxels[i] || voxelHP[i] !== initialHP[i]) {
                    voxels[i] = initialVoxels[i];
                    voxelHP[i] = initialHP[i];
                    const ix = i % NX;
                    const rem = (i - ix) / NX;
                    const iz = rem % NZ;
                    const iy = (rem - iz) / NZ;
                    dirty.add(chunkIdx(Math.floor(ix / CHUNK_X), Math.floor(iy / CHUNK_Y), Math.floor(iz / CHUNK_Z)));
                }
            }
            dirty.forEach((cId) => {
                const cx = cId % NCX;
                const rem = (cId - cx) / NCX;
                const cz = rem % NCZ;
                const cy = (rem - cz) / NCZ;
                buildChunk(cx, cy, cz);
            });
        };

        // Smooth sphere-vs-voxel-AABB collision push-out
        const resolveSphereCollision = (pos, radius) => {
            let collided = false;
            const minIx = Math.max(0, Math.floor((pos.x - radius - MIN_X) / VOXEL_SIZE));
            const maxIx = Math.min(NX - 1, Math.floor((pos.x + radius - MIN_X) / VOXEL_SIZE));
            const minIy = Math.max(0, Math.floor((pos.y - radius - MIN_Y) / VOXEL_SIZE));
            const maxIy = Math.min(NY - 1, Math.floor((pos.y + radius - MIN_Y) / VOXEL_SIZE));
            const minIz = Math.max(0, Math.floor((pos.z - radius - MIN_Z) / VOXEL_SIZE));
            const maxIz = Math.min(NZ - 1, Math.floor((pos.z + radius - MIN_Z) / VOXEL_SIZE));

            for (let iy = minIy; iy <= maxIy; iy++) {
                const by0 = MIN_Y + iy * VOXEL_SIZE;
                const by1 = by0 + VOXEL_SIZE;
                for (let iz = minIz; iz <= maxIz; iz++) {
                    const bz0 = MIN_Z + iz * VOXEL_SIZE;
                    const bz1 = bz0 + VOXEL_SIZE;
                    for (let ix = minIx; ix <= maxIx; ix++) {
                        if (!isSolidGrid(ix, iy, iz)) continue;
                        const bx0 = MIN_X + ix * VOXEL_SIZE;
                        const bx1 = bx0 + VOXEL_SIZE;

                        const cx = Math.max(bx0, Math.min(pos.x, bx1));
                        const cy = Math.max(by0, Math.min(pos.y, by1));
                        const cz = Math.max(bz0, Math.min(pos.z, bz1));

                        const dx = pos.x - cx;
                        const dy = pos.y - cy;
                        const dz = pos.z - cz;
                        const distSq = dx * dx + dy * dy + dz * dz;

                        if (distSq < radius * radius) {
                            collided = true;
                            if (distSq > 1e-6) {
                                const d = Math.sqrt(distSq);
                                const push = (radius - d) / d;
                                pos.x += dx * push;
                                pos.y += dy * push;
                                pos.z += dz * push;
                            } else {
                                const penX = Math.min(pos.x - bx0, bx1 - pos.x);
                                const penY = Math.min(pos.y - by0, by1 - pos.y);
                                const penZ = Math.min(pos.z - bz0, bz1 - pos.z);
                                if (penY <= penX && penY <= penZ) {
                                    pos.y = (pos.y - by0 < by1 - pos.y) ? by0 - radius : by1 + radius;
                                } else if (penX <= penZ) {
                                    pos.x = (pos.x - bx0 < bx1 - pos.x) ? bx0 - radius : bx1 + radius;
                                } else {
                                    pos.z = (pos.z - bz0 < bz1 - pos.z) ? bz0 - radius : bz1 + radius;
                                }
                            }
                        }
                    }
                }
            }
            return collided;
        };

        const findOpenSpot = (minY, maxY, minR = 14, maxR = 142, clearance = 3.5) => {
            for (let tries = 0; tries < 45; tries++) {
                const ang = Math.random() * Math.PI * 2;
                const rad = minR + Math.random() * (maxR - minR);
                const x = Math.cos(ang) * rad;
                const z = Math.sin(ang) * rad;
                const y = minY + Math.random() * (maxY - minY);
                if (
                    !isSolidAt(x, y, z) &&
                    !isSolidAt(x + clearance, y, z) &&
                    !isSolidAt(x - clearance, y, z) &&
                    !isSolidAt(x, y + clearance, z) &&
                    !isSolidAt(x, y - clearance, z)
                ) {
                    return new THREE.Vector3(x, y, z);
                }
            }
            return new THREE.Vector3((Math.random() - 0.5) * 20, 4, (Math.random() - 0.5) * 20 - 15);
        };

        // Glowing Subnautica Jellyshrooms inside the Jellyshroom Caverns
        const capMat = new THREE.MeshBasicMaterial({ color: 0xe879f9 });
        const stalkMat = new THREE.MeshStandardMaterial({ color: 0x4c1d95, roughness: 0.7 });
        for (let i = 0; i < 22; i++) {
            const spot = findOpenSpot(-114, -56, 18, 126, 3.5);
            const shroom = new THREE.Group();
            shroom.position.copy(spot);
            const h = 3.5 + Math.random() * 4.5;
            const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, h, 8), stalkMat);
            stalk.position.y = h * 0.5;
            const cap = new THREE.Mesh(new THREE.SphereGeometry(2.1 + Math.random() * 1.4, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), capMat);
            cap.position.y = h;
            shroom.add(stalk, cap);
            scene.add(shroom);
        }

        const getBiomeAt = (x, y, z) => {
            if (y > -18) return { name: 'Safe Shallows', color: 0x064e6e, fogDensity: 0.0068 };
            if (y > -44) return { name: 'Kelp & Reef Caves', color: 0x063b3e, fogDensity: 0.0088 };
            if (y > -126) return { name: 'Jellyshroom Caverns', color: 0x1e1038, fogDensity: 0.0110 };
            if (y > -206) return { name: 'Lost River Brine', color: 0x062c26, fogDensity: 0.0125 };
            return { name: 'Abyssal Lava Zone', color: 0x1f0808, fogDensity: 0.0138 };
        };

        return {
            VOXEL_SIZE,
            MAT,
            isSolidAt,
            raycastVoxel,
            damageVoxelAt,
            resetTerrain,
            resolveSphereCollision,
            findOpenSpot,
            getBiomeAt
        };
    }

    function buildAquariumComplex(scene, AQUARIUM_POS, shopOwned) {
        const baseGroup = new THREE.Group();
        baseGroup.position.copy(AQUARIUM_POS);

        const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.78, roughness: 0.28 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.35 });
        const glassMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.14, side: THREE.DoubleSide });
        const trimMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

        const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.9, 20), steelMat);
        floor.position.y = -5.5;
        const roof = new THREE.Mesh(new THREE.BoxGeometry(18, 0.9, 20), steelMat);
        roof.position.y = 5.5;
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(18, 11, 0.9), steelMat);
        backWall.position.z = 10;
        baseGroup.add(floor, roof, backWall);

        [-9, 9].forEach((x) => {
            const glass = new THREE.Mesh(new THREE.PlaneGeometry(20, 10.5), glassMat);
            glass.rotation.y = Math.PI / 2;
            glass.position.x = x;
            baseGroup.add(glass);

            const strut = new THREE.Mesh(new THREE.BoxGeometry(0.7, 11.4, 0.7), darkMat);
            strut.position.set(x, 0, -10);
            baseGroup.add(strut);
        });

        const gateTop = new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.5, 0.6), trimMat);
        gateTop.position.set(0, 5.2, -10);
        baseGroup.add(gateTop);

        const tower = new THREE.Mesh(new THREE.CylinderGeometry(5, 6.5, 9, 16), steelMat);
        tower.position.set(0, 10, 4);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), glassMat);
        dome.position.set(0, 14.5, 4);
        baseGroup.add(tower, dome);

        if (shopOwned.decor_chest) {
            const chest = new THREE.Mesh(
                new THREE.BoxGeometry(2.4, 1.6, 1.6),
                new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7, roughness: 0.3 })
            );
            chest.position.set(-5.5, -4.3, 4);
            baseGroup.add(chest);
        }
        if (shopOwned.decor_castle) {
            const castle = new THREE.Group();
            castle.position.set(5.2, -4.5, 5);
            const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
            const keep = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.5, 3.2), stoneMat);
            castle.add(keep);
            [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(([tx, tz]) => {
                const t = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4.8, 8), stoneMat);
                t.position.set(tx, 0.6, tz);
                castle.add(t);
            });
            baseGroup.add(castle);
        }
        if (shopOwned.decor_skeleton) {
            const skel = new THREE.Group();
            skel.position.set(0, -4.2, 6.5);
            const boneMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });
            const skull = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), boneMat);
            skull.position.y = 1.2;
            const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 1.1, 8), boneMat);
            skel.add(skull, rib);
            baseGroup.add(skel);
        }
        if (shopOwned.decor_ship) {
            const ship = new THREE.Mesh(
                new THREE.BoxGeometry(4.5, 3.0, 11),
                new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 })
            );
            ship.position.set(-20, -12, -14);
            ship.rotation.z = 0.25;
            baseGroup.add(ship);
        }

        const baseLight = new THREE.PointLight(0x00e5ff, 2.0, 40);
        baseLight.position.set(0, 3, 0);
        baseGroup.add(baseLight);

        scene.add(baseGroup);
        return baseGroup;
    }

    function buildTreasureChests(scene, ARENA_RADIUS, FLOOR_Y, voxelWorld = null) {
        const chests = [];
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
        const goldMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        for (let i = 0; i < 16; i++) {
            const pos = voxelWorld
                ? voxelWorld.findOpenSpot(FLOOR_Y + 12, -25, 22, ARENA_RADIUS - 22, 3)
                : (() => {
                    const ang = Math.random() * Math.PI * 2;
                    const rad = 30 + Math.random() * (ARENA_RADIUS - 40);
                    return new THREE.Vector3(Math.cos(ang) * rad, FLOOR_Y + 1.5, Math.sin(ang) * rad);
                })();
            const g = new THREE.Group();
            g.position.copy(pos);
            const box = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 1.8), woodMat);
            const glow = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.35, 1.9), goldMat);
            glow.position.y = 0.3;
            g.add(box, glow);
            scene.add(g);
            chests.push({ mesh: g, pos: g.position, opened: false });
        }
        return chests;
    }

    return { buildVoxelWorld, buildAquariumComplex, buildTreasureChests };
})();
