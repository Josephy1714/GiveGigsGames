// GraveGain3DC — Arena Definitions (pure ES module, no top-level BABYLON dependencies)

export const MAPS = {
    cyber_courtyard: {
        id: 'cyber_courtyard',
        name: 'NEON COURTYARD',
        tagline: 'Classic symmetrical Xonotic cyber-arena with elevated decks & jump pads.',
        accent: '#00f0ff',
        clearColor: [0.03, 0.04, 0.09, 1],
        fogColor: [0.03, 0.05, 0.11],
        fogDensity: 0.008,
        hemiColor: [0.8, 0.9, 1.0],
        hemiIntensity: 0.85,
        dirColor: [0.85, 0.95, 1.0],
        dirIntensity: 0.75,
        hasFloor: true,
        floorSize: 90,
        floorColor: [0.11, 0.14, 0.21],
        floorEmissive: [0.02, 0.03, 0.06],
        halfBound: 42,
        voidY: null,
        palette: {
            primary: [0.17, 0.22, 0.34],
            primaryEmissive: [0.01, 0.07, 0.12],
            platform: [0.14, 0.24, 0.36],
            platformEmissive: [0.0, 0.12, 0.18],
            trim: [0.0, 0.75, 0.9],
            trimEmissive: [0.0, 0.45, 0.6],
            pad: [0.0, 1.0, 0.9],
            padEmissive: [0.0, 0.85, 0.95]
        },
        blocks: [
            // Perimeter boundary trim walls
            { x: 0, y: 2, z: -43.5, w: 89, h: 4, d: 2, style: 'primary' },
            { x: 0, y: 2, z: 43.5, w: 89, h: 4, d: 2, style: 'primary' },
            { x: -43.5, y: 2, z: 0, w: 2, h: 4, d: 85, style: 'primary' },
            { x: 43.5, y: 2, z: 0, w: 2, h: 4, d: 85, style: 'primary' },

            // Central elevated deck (topY = 4) + 4 support columns
            { x: 0, y: 3.5, z: 0, w: 18, h: 1, d: 18, style: 'platform' },
            { x: -7.5, y: 1.5, z: -7.5, w: 2.5, h: 3, d: 2.5, style: 'primary' },
            { x: 7.5, y: 1.5, z: -7.5, w: 2.5, h: 3, d: 2.5, style: 'primary' },
            { x: -7.5, y: 1.5, z: 7.5, w: 2.5, h: 3, d: 2.5, style: 'primary' },
            { x: 7.5, y: 1.5, z: 7.5, w: 2.5, h: 3, d: 2.5, style: 'primary' },

            // East & West elevated flank balconies (topY = 4)
            { x: -24, y: 3.5, z: 0, w: 10, h: 1, d: 22, style: 'platform' },
            { x: 24, y: 3.5, z: 0, w: 10, h: 1, d: 22, style: 'platform' },

            // North & South low cover walls
            { x: 0, y: 1.25, z: -22, w: 14, h: 2.5, d: 2.5, style: 'primary' },
            { x: 0, y: 1.25, z: 22, w: 14, h: 2.5, d: 2.5, style: 'primary' },

            // 4 mid-arena monolith pillars
            { x: -13, y: 4.5, z: -16, w: 3.5, h: 9, d: 3.5, style: 'primary' },
            { x: 13, y: 4.5, z: -16, w: 3.5, h: 9, d: 3.5, style: 'primary' },
            { x: -13, y: 4.5, z: 16, w: 3.5, h: 9, d: 3.5, style: 'primary' },
            { x: 13, y: 4.5, z: 16, w: 3.5, h: 9, d: 3.5, style: 'primary' }
        ],
        jumpPads: [
            { x: -28, y: 0, z: -28, vx: 0, vy: 22, vz: 0, radius: 2.5 },
            { x: 28, y: 0, z: -28, vx: 0, vy: 22, vz: 0, radius: 2.5 },
            { x: -28, y: 0, z: 28, vx: 0, vy: 22, vz: 0, radius: 2.5 },
            { x: 28, y: 0, z: 28, vx: 0, vy: 22, vz: 0, radius: 2.5 },
            { x: -15, y: 0, z: 0, vx: -6, vy: 19, vz: 0, radius: 2.4 },
            { x: 15, y: 0, z: 0, vx: 6, vy: 19, vz: 0, radius: 2.4 }
        ],
        hazards: [],
        playerSpawn: [0, 0, -34],
        friendlySpawns: [
            [-8, 0, -30],
            [-3, 0, -30],
            [3, 0, -30],
            [8, 0, -30],
            [-18, 0, -24],
            [18, 0, -24]
        ],
        enemySpawns: [
            [0, 4, 0],
            [-24, 4, 0],
            [24, 4, 0],
            [-16, 0, 30],
            [16, 0, 30],
            [0, 0, 34]
        ],
        rtsCamera: { pos: [0, 42, -38], target: [0, 0, 0] }
    },

    void_spires: {
        id: 'void_spires',
        name: 'VOID SPIRES',
        tagline: 'Floating space platforms over an endless void — ride jump pads to conquer.',
        accent: '#ff3df0',
        clearColor: [0.04, 0.01, 0.08, 1],
        fogColor: [0.06, 0.02, 0.12],
        fogDensity: 0.007,
        hemiColor: [0.9, 0.75, 1.0],
        hemiIntensity: 0.85,
        dirColor: [1.0, 0.75, 0.95],
        dirIntensity: 0.8,
        hasFloor: false,
        floorSize: 0,
        floorColor: [0.05, 0.02, 0.1],
        floorEmissive: [0.02, 0.0, 0.04],
        halfBound: 46,
        voidY: -12,
        palette: {
            primary: [0.22, 0.12, 0.34],
            primaryEmissive: [0.08, 0.02, 0.14],
            platform: [0.16, 0.13, 0.28],
            platformEmissive: [0.06, 0.03, 0.14],
            trim: [1.0, 0.24, 0.94],
            trimEmissive: [0.65, 0.1, 0.6],
            pad: [1.0, 0.24, 0.94],
            padEmissive: [0.9, 0.15, 0.85]
        },
        blocks: [
            // Central Main Deck (topY = 0) + 4 cover pylons
            { x: 0, y: -1, z: 0, w: 24, h: 2, d: 24, style: 'platform' },
            { x: -7, y: 1.5, z: -7, w: 2.2, h: 3, d: 2.2, style: 'primary' },
            { x: 7, y: 1.5, z: -7, w: 2.2, h: 3, d: 2.2, style: 'primary' },
            { x: -7, y: 1.5, z: 7, w: 2.2, h: 3, d: 2.2, style: 'primary' },
            { x: 7, y: 1.5, z: 7, w: 2.2, h: 3, d: 2.2, style: 'primary' },

            // South Spawn Deck (topY = 0) + low cover
            { x: 0, y: -1, z: -28, w: 22, h: 2, d: 14, style: 'platform' },
            { x: 0, y: 1, z: -24, w: 8, h: 2, d: 1.8, style: 'primary' },

            // North Spawn Deck (topY = 0) + low cover
            { x: 0, y: -1, z: 28, w: 22, h: 2, d: 14, style: 'platform' },
            { x: 0, y: 1, z: 24, w: 8, h: 2, d: 1.8, style: 'primary' },

            // West High Spire (topY = 6) + pillar
            { x: -28, y: 5, z: 0, w: 14, h: 2, d: 20, style: 'platform' },
            { x: -31, y: 8, z: 0, w: 2.5, h: 4, d: 2.5, style: 'primary' },

            // East High Spire (topY = 6) + pillar
            { x: 28, y: 5, z: 0, w: 14, h: 2, d: 20, style: 'platform' },
            { x: 31, y: 8, z: 0, w: 2.5, h: 4, d: 2.5, style: 'primary' }
        ],
        jumpPads: [
            // South Deck <-> Central Deck
            { x: 0, y: 0, z: -22.5, vx: 0, vy: 18, vz: 14, radius: 2.6 },
            { x: 0, y: 0, z: -10, vx: 0, vy: 18, vz: -14, radius: 2.5 },
            // North Deck <-> Central Deck
            { x: 0, y: 0, z: 22.5, vx: 0, vy: 18, vz: -14, radius: 2.6 },
            { x: 0, y: 0, z: 10, vx: 0, vy: 18, vz: 14, radius: 2.5 },
            // Central Deck <-> West Spire
            { x: -10, y: 0, z: 0, vx: -14, vy: 23, vz: 0, radius: 2.6 },
            { x: -22.5, y: 6, z: 0, vx: 16, vy: 14, vz: 0, radius: 2.6 },
            // Central Deck <-> East Spire
            { x: 10, y: 0, z: 0, vx: 14, vy: 23, vz: 0, radius: 2.6 },
            { x: 22.5, y: 6, z: 0, vx: -16, vy: 14, vz: 0, radius: 2.6 }
        ],
        hazards: [],
        playerSpawn: [0, 0, -31],
        friendlySpawns: [
            [-6, 0, -30],
            [-2, 0, -30],
            [2, 0, -30],
            [6, 0, -30],
            [-5, 0, -26],
            [5, 0, -26]
        ],
        enemySpawns: [
            [0, 0, 30],
            [-6, 0, 29],
            [6, 0, 29],
            [-28, 6, 0],
            [28, 6, 0],
            [0, 0, 0]
        ],
        rtsCamera: { pos: [0, 48, -44], target: [0, 2, 0] }
    },

    magma_foundry: {
        id: 'magma_foundry',
        name: 'MAGMA FOUNDRY',
        tagline: 'Multi-tier industrial forge with molten lava trenches & overhead catwalks.',
        accent: '#ff6a00',
        clearColor: [0.09, 0.03, 0.02, 1],
        fogColor: [0.12, 0.04, 0.02],
        fogDensity: 0.0085,
        hemiColor: [1.0, 0.82, 0.7],
        hemiIntensity: 0.85,
        dirColor: [1.0, 0.72, 0.45],
        dirIntensity: 0.8,
        hasFloor: true,
        floorSize: 96,
        floorColor: [0.15, 0.1, 0.09],
        floorEmissive: [0.05, 0.015, 0.005],
        halfBound: 44,
        voidY: null,
        palette: {
            primary: [0.26, 0.17, 0.14],
            primaryEmissive: [0.08, 0.02, 0.01],
            platform: [0.22, 0.19, 0.18],
            platformEmissive: [0.09, 0.03, 0.01],
            trim: [1.0, 0.35, 0.02],
            trimEmissive: [0.95, 0.28, 0.02],
            pad: [1.0, 0.55, 0.05],
            padEmissive: [0.95, 0.4, 0.02]
        },
        blocks: [
            // Perimeter foundry walls
            { x: 0, y: 3, z: -45.5, w: 93, h: 6, d: 2, style: 'primary' },
            { x: 0, y: 3, z: 45.5, w: 93, h: 6, d: 2, style: 'primary' },
            { x: -45.5, y: 3, z: 0, w: 2, h: 6, d: 89, style: 'primary' },
            { x: 45.5, y: 3, z: 0, w: 2, h: 6, d: 89, style: 'primary' },

            // Glowing lava channels (non-solid visual slabs matching hazards)
            { x: -14, y: 0.08, z: 0, w: 6, h: 0.16, d: 60, style: 'trim', solid: false },
            { x: 14, y: 0.08, z: 0, w: 6, h: 0.16, d: 60, style: 'trim', solid: false },

            // Central Furnace Bunker (topY = 4) & high catwalk bridge (topY = 8)
            { x: 0, y: 2, z: 0, w: 14, h: 4, d: 14, style: 'primary' },
            { x: 0, y: 7.5, z: 0, w: 52, h: 1, d: 6, style: 'platform' },

            // West & East Industrial Catwalks (topY = 5) + corner stanchions
            { x: -28, y: 4.5, z: 0, w: 10, h: 1, d: 44, style: 'platform' },
            { x: 28, y: 4.5, z: 0, w: 10, h: 1, d: 44, style: 'platform' },
            { x: -31.5, y: 2, z: -20, w: 2.5, h: 4, d: 2.5, style: 'primary' },
            { x: -31.5, y: 2, z: 20, w: 2.5, h: 4, d: 2.5, style: 'primary' },
            { x: 31.5, y: 2, z: -20, w: 2.5, h: 4, d: 2.5, style: 'primary' },
            { x: 31.5, y: 2, z: 20, w: 2.5, h: 4, d: 2.5, style: 'primary' },

            // Ground cover crates
            { x: 0, y: 1.5, z: -22, w: 10, h: 3, d: 3, style: 'primary' },
            { x: 0, y: 1.5, z: 22, w: 10, h: 3, d: 3, style: 'primary' },
            { x: -28, y: 1.5, z: -28, w: 6, h: 3, d: 6, style: 'primary' },
            { x: 28, y: 1.5, z: -28, w: 6, h: 3, d: 6, style: 'primary' },
            { x: -28, y: 1.5, z: 28, w: 6, h: 3, d: 6, style: 'primary' },
            { x: 28, y: 1.5, z: 28, w: 6, h: 3, d: 6, style: 'primary' }
        ],
        jumpPads: [
            { x: -20, y: 0, z: -18, vx: -4, vy: 20, vz: 0, radius: 2.5 },
            { x: -20, y: 0, z: 18, vx: -4, vy: 20, vz: 0, radius: 2.5 },
            { x: 20, y: 0, z: -18, vx: 4, vy: 20, vz: 0, radius: 2.5 },
            { x: 20, y: 0, z: 18, vx: 4, vy: 20, vz: 0, radius: 2.5 },
            { x: 0, y: 0, z: -12, vx: 0, vy: 22, vz: 0, radius: 2.5 },
            { x: 0, y: 0, z: 12, vx: 0, vy: 22, vz: 0, radius: 2.5 }
        ],
        hazards: [
            { x: -14, z: 0, w: 6, d: 60, maxY: 0.45, dps: 28, bounceVy: 16 },
            { x: 14, z: 0, w: 6, d: 60, maxY: 0.45, dps: 28, bounceVy: 16 }
        ],
        playerSpawn: [0, 0, -34],
        friendlySpawns: [
            [-6, 0, -32],
            [-2, 0, -32],
            [2, 0, -32],
            [6, 0, -32],
            [-28, 5, -16],
            [28, 5, -16]
        ],
        enemySpawns: [
            [0, 0, 34],
            [-28, 5, 14],
            [28, 5, 14],
            [0, 8, 0],
            [-32, 0, 0],
            [32, 0, 0]
        ],
        rtsCamera: { pos: [0, 44, -42], target: [0, 2, 0] }
    }
};

export const MAP_LIST = [MAPS.cyber_courtyard, MAPS.void_spires, MAPS.magma_foundry];
