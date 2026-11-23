import * as BABYLON from "./vendor/babylon-overtake.js";
(() => {
    const ROAD_WIDTH = 2000;
    const modelLibrary = window.OVERTAKE_MODELS;
    const DRIVER_RACES = ["human", "elf", "dwarf", "orc"];
    const DRIVER_CLASSES = ["warrior", "tank", "support", "mage"];
    const RACE_DRIVER_STATS = {
        human: { acceleration: 1.02, grip: 1, brakes: 1, nitro: 1 },
        elf: { acceleration: 0.97, grip: 1.12, brakes: 1.02, nitro: 0.97 },
        dwarf: { acceleration: 0.96, grip: 1.04, brakes: 1.13, nitro: 0.98 },
        orc: { acceleration: 1.13, grip: 0.93, brakes: 0.96, nitro: 1.03 },
    };
    const CLASS_DRIVER_STATS = {
        warrior: { acceleration: 1.07, grip: 1.02, brakes: 1, nitro: 0.96 },
        tank: { acceleration: 0.96, grip: 1, brakes: 1.1, nitro: 0.94 },
        support: { acceleration: 1, grip: 1.06, brakes: 1.03, nitro: 1.05 },
        mage: { acceleration: 0.98, grip: 0.98, brakes: 0.99, nitro: 1.24 },
    };
    const DRIVER_IDS = DRIVER_RACES.flatMap((race) => DRIVER_CLASSES.map((driverClass) => `${race}-${driverClass}`));
    const SEGMENT_LENGTH = 200;
    const RUMBLE_LENGTH = 3;
    const LANES = 3;
    const DRAW_DISTANCE = 150;
    const FINISH_LINE_SEGMENT = 0;
    const FINISH_LINE_LENGTH_SEGMENTS = 4;
    const FINISH_LINE_ROWS = 4;
    const FINISH_LINE_COLUMNS = 14;
    const MINI_MAP_ROUTE_FILL = 0.78;
    const FIRST_LEVEL_ID = "desert";
    const SECOND_LEVEL_ID = "urban";
    const THIRD_LEVEL_ID = "night";
    const FOURTH_LEVEL_ID = "alpine";
    const FIFTH_LEVEL_ID = "coast";
    const TEST_LEVEL_ID = "test";
    const SHOW_TITLE_IMAGE_IN_MENUS = false;
    const LEVEL_ORDER = [FIRST_LEVEL_ID, SECOND_LEVEL_ID, THIRD_LEVEL_ID, FOURTH_LEVEL_ID, FIFTH_LEVEL_ID, TEST_LEVEL_ID];
    const ROUTE_THEMES = {
        desert: { sky: "#56256c", horizon: "#ffbf88", colors: ["#ff7194", "#ffcc67", "#fff1ba"] },
        urban: { sky: "#397bbb", horizon: "#bdf7ef", colors: ["#fa729e", "#ffd56b", "#9676e8"] },
        night: { sky: "#120d3c", horizon: "#6f4094", colors: ["#73fbea", "#ff83df", "#ffe58d"] },
        alpine: { sky: "#385787", horizon: "#cfedff", colors: ["#bceeff", "#dc9cff", "#fff5e1"] },
        coast: { sky: "#3e4792", horizon: "#ffc6ab", colors: ["#ff9474", "#aaf3ce", "#c8a7ff"] },
        test: { sky: "#544997", horizon: "#ffb8d4", colors: ["#ff71ad", "#fff074", "#88f7df"] },
    };
    const COUNTDOWN_LABELS = ["3", "2", "1", "GO!"];
    const COUNTDOWN_STEP_SECONDS = 0.6;
    const COUNTDOWN_TOTAL_SECONDS = COUNTDOWN_LABELS.length * COUNTDOWN_STEP_SECONDS;
    const CAMERA_HEIGHT = 1000;
    const FIELD_OF_VIEW = 100;
    const CAMERA_DEPTH = 1 / Math.tan((FIELD_OF_VIEW / 2) * (Math.PI / 180));
    const NITRO_ZOOM_CAMERA_SCALE = 0.8;
    const NITRO_ZOOM_PLAYER_SCALE = 0.9;
    const NITRO_ZOOM_PLAYER_LIFT_RATIO = 0.1;
    const NITRO_ZOOM_IN_RATE = 8;
    const NITRO_ZOOM_OUT_RATE = 5;
    const PLAYER_VISUAL_LATERAL_SMOOTHING = 18;
    const BASE_MAX_SPEED = 7200;
    const ACCEL = 5800;
    const BRAKE = 7800;
    const DECEL = 3200;
    const OFFROAD_DECEL = 5200;
    const STEERING = 2.55;
    const RACE_STEP = 1 / 60;
    const CAR_ASSET_WIDTH = 352;
    const CAR_ASSET_HEIGHT = 184;
    const CAR_SIZE_SCALE = 1.1;
    const PLAYER_MAX_SCREEN_WIDTH_RATIO = 0.31 * CAR_SIZE_SCALE;
    const PLAYER_MAX_SCREEN_WIDTH = 404 * CAR_SIZE_SCALE;
    const PLAYER_ROAD_WIDTH = 0.46 * CAR_SIZE_SCALE;
    const ROADSIDE_PROP_MOTION_STREAK_MAX = 8;
    const CAR_MOTION_STREAK_MAX = 11;
    const CAR_MOTION_STREAK_COPIES = 4;
    const OPPONENT_ROAD_WIDTH = 0.44 * CAR_SIZE_SCALE;
    const COLLISION_DEPTH = 154 * CAR_SIZE_SCALE;
    const COLLISION_SEPARATION = COLLISION_DEPTH + 2;
    const PLAYER_COLLISION_COOLDOWN = 0.34;
    const OPPONENT_LOOKAHEAD_DISTANCE = 760;
    const OPPONENT_PASS_COMMIT_DISTANCE = 420;
    const OPPONENT_SAFE_REAR_GAP = 230 * CAR_SIZE_SCALE;
    const OPPONENT_SAFE_FRONT_GAP = 360 * CAR_SIZE_SCALE;
    const OPPONENT_LANE_CLEARANCE = 0.5 * CAR_SIZE_SCALE;
    const OPPONENT_FOLLOW_SPEED_RATIO = 0.88;
    const OPPONENT_OVERTAKE_LOCK_TIME = 1.15;
    const OPPONENT_NEAR_CLIP = COLLISION_DEPTH;
    const OPPONENT_SPRITE_SCALE = 0.92 * CAR_SIZE_SCALE;
    const OPPONENT_MAX_SCREEN_WIDTH_RATIO = 0.3 * CAR_SIZE_SCALE;
    const OPPONENT_MAX_SCREEN_WIDTH = 390 * CAR_SIZE_SCALE;
    const OPPONENT_MAX_PLAYER_WIDTH_RATIO = 0.92;
    const FIRST_LEVEL_OPPONENT_MAX_SPEED_RATIO = 0.8;
    const FIRST_LEVEL_AHEAD_OPPONENT_SPEED_RATIO = 0.75;
    const SECOND_LEVEL_OPPONENT_MAX_SPEED_RATIO = 0.9;
    const SECOND_LEVEL_AHEAD_OPPONENT_SPEED_RATIO = 0.85;
    const THIRD_LEVEL_OPPONENT_MAX_SPEED_RATIO = 0.95;
    const THIRD_LEVEL_AHEAD_OPPONENT_SPEED_RATIO = 0.9;
    const NITRO_MAX = 100;
    const NITRO_TOP_SPEED = 1.24;
    const NITRO_ACCEL = 1.82;
    const NITRO_DRAIN = 34;
    const NITRO_REGEN = 8;
    const NITRO_START_THRESHOLD = 25;
    const SHIELD_DURATION = 6;
    const MAGNET_DURATION = 8;
    const OVERDRIVE_DURATION = 4.2;
    const STAR_DURATION = 5.5;
    const MUSHROOM_DURATION = 1.75;
    const POWERUP_RESPAWN = 12;
    const AIRSTRIKE_WINDUP = 0.95;
    const AIRSTRIKE_DURATION = 1.85;
    const AIRSTRIKE_STUN = 1.25;
    const COMBO_WINDOW = 4.5;
    const MAX_PARTICLES = 180;
    const MAX_SKIDMARKS = 120;
    const POWERUP_FLAGS = {
        nitro: true,
        shield: true,
        airstrike: true,
        emp: true,
        magnet: true,
        overdrive: true,
    };
    const POWERUP_SLOT_SPACING = 34;
    const POWERUP_SLOT_CHANCE = 0.5;
    const POWERUP_KIND_POOL = [
        "nitro", "shield", "magnet", "emp",
    ];
    const KART_ITEM_META = {
        rocket: { icon: "🚀", label: "ZIPPER ROCKET" },
        missile: { icon: "🎯", label: "HOMING MISSILE" },
        oilslick: { icon: "🛢️", label: "OIL SLICK" },
        bubble: { icon: "🫧", label: "BUBBLE SHIELD" },
        magnet: { icon: "🧲", label: "PULSE MAGNET" },
        allstar: { icon: "🌟", label: "ALL-STAR RUSH" },
        spindash: { icon: "💠", label: "SONIC DASH" },
        icebeam: { icon: "❄️", label: "FREEZE RAY" },
        twister: { icon: "🌪️", label: "TWISTER VORTEX" },
        quake: { icon: "〰️", label: "PLASMA QUAKE" },
        empstorm: { icon: "⚡", label: "EMP STORM" },
        shunt: { icon: "☄️", label: "HYPER SHUNT" },
    };
    const ALL_KART_ITEMS = [
        "rocket", "missile", "oilslick", "bubble", "magnet", "allstar",
        "spindash", "icebeam", "twister", "quake", "empstorm", "shunt",
    ];
    const DEBUG_COIN_GRANT = 5000;
    const ASSET_BASE_URL = "https://overtake-assets.vercel.app/";
    const MENU_TITLE_ASSET = "menu/title.png";
    const NIGHT_BACKGROUND_BUILDINGS_ASSET = "night_map/sky_neon_background_buildings.png";
    const NITRO_POWERUP_ASSET = "items/no2-transparent.png";
    const RIVAL_NAMES = ["Vex", "Kira", "Blaze", "Nova", "Rex", "Sora", "Titan", "Zed"];
    const RIVAL_TRAITS = ["aggressive", "smooth", "blocker"];
    const PAINT_OPTIONS = [
        { id: "stock", label: "Factory", color: "", glow: "#6ff2ff" },
        { id: "crimson", label: "Crimson", color: "#ef4444", glow: "#ff5f5a" },
        { id: "cobalt", label: "Cobalt", color: "#3b82f6", glow: "#60a5fa" },
        { id: "gold", label: "Solar Gold", color: "#f59e0b", glow: "#ffcf42" },
        { id: "cyan", label: "Neon Cyan", color: "#06b6d4", glow: "#6ff2ff" },
        { id: "magenta", label: "Hyper Pink", color: "#ec4899", glow: "#ff4fd8" },
        { id: "lime", label: "Toxic Lime", color: "#22c55e", glow: "#78ffaa" },
        { id: "obsidian", label: "Obsidian", color: "#334155", glow: "#c084fc" },
    ];
    const ACHIEVEMENTS = [
        { id: "first_finish", title: "Checkered Flag", desc: "Complete your first race.", reward: 150 },
        { id: "first_win", title: "Podium King", desc: "Finish 1st place in any race.", reward: 300 },
        { id: "overtake_10", title: "Traffic Weaver", desc: "Score 10 career overtakes.", reward: 200 },
        { id: "overtake_50", title: "Highway Legend", desc: "Score 50 career overtakes.", reward: 500 },
        { id: "combo_4", title: "Flow State", desc: "Reach a x4 Overtake Combo.", reward: 250 },
        { id: "near_miss_10", title: "Thread the Needle", desc: "Pull off 10 Close Calls.", reward: 250 },
        { id: "clean_win", title: "Untouchable", desc: "Win a race with 0 collisions.", reward: 400 },
        { id: "speed_350", title: "Velocity Demon", desc: "Reach 350 KM/H in any car.", reward: 350 },
        { id: "ace_win", title: "Ace Champion", desc: "Win a race on Ace difficulty.", reward: 600 },
        { id: "full_garage", title: "Collector", desc: "Own 4 or more cars in the garage.", reward: 500 },
    ];
    const ASSETS = [
        { file: "cars/car_comet_90_back_view.png", width: CAR_ASSET_WIDTH, height: CAR_ASSET_HEIGHT, role: "Comet 90 car back view" },
        { file: "cars/car_veloce_s_back_view.png", width: CAR_ASSET_WIDTH, height: CAR_ASSET_HEIGHT, role: "Veloce S car back view" },
        { file: "cars/car_strada_gt_back_view.png", width: CAR_ASSET_WIDTH, height: CAR_ASSET_HEIGHT, role: "Strada GT car back view" },
        { file: "cars/car_nx_prototype_back_view.png", width: CAR_ASSET_WIDTH, height: CAR_ASSET_HEIGHT, role: "NX Prototype car back view" },
        { file: "desert_map/sky_desert_sunset.png", width: 1024, height: 512, role: "desert sunset sky" },
        { file: "desert_map/cactus_column.png", width: 270, height: 506, role: "desert roadside cactus" },
        { file: "desert_map/tree_palm.png", width: 470, height: 769, role: "desert roadside palm" },
        { file: "desert_map/desert_rock.png", width: 445, height: 278, role: "desert roadside rock" },
        { file: "desert_map/billboard_checkpoint.png", width: 445, height: 227, role: "desert roadside billboard" },
        { file: "urban_map/sky_urban_day.png", width: 1024, height: 512, role: "urban daytime sky" },
        { file: "urban_map/building_glass_tower.png", width: 324, height: 607, role: "urban roadside building" },
        { file: "urban_map/building_brick_block.png", width: 496, height: 607, role: "urban roadside building" },
        { file: "urban_map/tree_urban.png", width: 364, height: 607, role: "urban roadside tree" },
        { file: "urban_map/roadside_lamp.png", width: 99, height: 342, role: "urban roadside lamp" },
        { file: "urban_map/billboard_checkpoint.png", width: 445, height: 227, role: "urban roadside billboard" },
        { file: "night_map/sky_neon_night.png", width: 1024, height: 512, role: "night city sky" },
        { file: "night_map/building_neon_tower.png", width: 323, height: 607, role: "night roadside building" },
        { file: "night_map/building_neon_sign.png", width: 432, height: 251, role: "night roadside sign" },
        { file: "night_map/roadside_lamp.png", width: 99, height: 342, role: "night roadside lamp" },
        { file: "night_map/building_glass_tower.png", width: 324, height: 607, role: "night roadside building" },
        { file: "night_map/billboard_checkpoint.png", width: 445, height: 227, role: "night roadside billboard" },
        { file: NIGHT_BACKGROUND_BUILDINGS_ASSET, width: 1774, height: 887, role: "night distant skyline" },
        { file: "training_map/sky_urban_day.png", width: 1024, height: 512, role: "training daytime sky" },
        { file: "training_map/building_glass_tower.png", width: 324, height: 607, role: "training roadside building" },
        { file: "training_map/building_brick_block.png", width: 496, height: 607, role: "training roadside building" },
        { file: "training_map/tree_urban.png", width: 364, height: 607, role: "training roadside tree" },
        { file: "training_map/roadside_lamp.png", width: 99, height: 342, role: "training roadside lamp" },
        { file: "training_map/billboard_checkpoint.png", width: 445, height: 227, role: "training roadside billboard" },
        { file: NITRO_POWERUP_ASSET, width: 1536, height: 1024, role: "nitro powerup bottle" },
        { file: "procedural/alpine_pine.svg", width: 280, height: 520, role: "alpine pine tree" },
        { file: "procedural/alpine_rock.svg", width: 380, height: 260, role: "alpine cliff rock" },
        { file: "procedural/coast_arch.svg", width: 340, height: 420, role: "coastal neon palm" },
        { file: "procedural/apex_v12.svg", width: CAR_ASSET_WIDTH, height: CAR_ASSET_HEIGHT, role: "Apex V12 supercar" },
        { file: "procedural/hyperion_x.svg", width: CAR_ASSET_WIDTH, height: CAR_ASSET_HEIGHT, role: "Hyperion X hypercar" },
    ];
    const ASSET_BY_FILE = Object.fromEntries(ASSETS.map((asset) => [asset.file, asset]));
    function getAssetUrl(path) {
        if (path.startsWith("procedural/")) {
            return "";
        }
        const normalizedPath = path
            .replace(/^(?:\.\/)?assets\//, "")
            .replace(/^\/+/, "");
        return `${ASSET_BASE_URL}${normalizedPath}`;
    }
    const CAR_ORDER = ["starter", "street", "gt", "prototype", "apex", "hyper"];
    const CARS = {
        starter: {
            id: "starter",
            label: "Comet 90",
            price: 0,
            maxSpeed: 0.84,
            displayTopSpeed: 165,
            accel: 0.92,
            grip: 1.04,
            nitro: 0.9,
            mass: 0.95,
            asset: "cars/car_comet_90_back_view.png",
            color: "#d82e3f",
        },
        street: {
            id: "street",
            label: "Veloce S",
            price: 700,
            maxSpeed: 1,
            displayTopSpeed: 230,
            accel: 1.02,
            grip: 1.02,
            nitro: 1,
            mass: 1,
            asset: "cars/car_veloce_s_back_view.png",
            color: "#1f62d0",
        },
        gt: {
            id: "gt",
            label: "Strada GT",
            price: 1700,
            maxSpeed: 1.13,
            displayTopSpeed: 300,
            accel: 1.08,
            grip: 0.99,
            nitro: 1.08,
            mass: 1.08,
            asset: "cars/car_strada_gt_back_view.png",
            color: "#ffd337",
        },
        prototype: {
            id: "prototype",
            label: "NX Prototype",
            price: 3400,
            maxSpeed: 1.24,
            displayTopSpeed: 380,
            accel: 1.14,
            grip: 0.96,
            nitro: 1.14,
            mass: 1.12,
            asset: "cars/car_nx_prototype_back_view.png",
            color: "#d8dde5",
        },
        apex: {
            id: "apex",
            label: "Apex V12",
            price: 5200,
            maxSpeed: 1.32,
            displayTopSpeed: 425,
            accel: 1.22,
            grip: 1.08,
            nitro: 1.18,
            mass: 1.16,
            asset: "procedural/apex_v12.svg",
            color: "#ff6b35",
        },
        hyper: {
            id: "hyper",
            label: "Hyperion X",
            price: 7800,
            maxSpeed: 1.4,
            displayTopSpeed: 465,
            accel: 1.3,
            grip: 1.12,
            nitro: 1.25,
            mass: 1.2,
            asset: "procedural/hyperion_x.svg",
            color: "#00f5d4",
        },
    };
    // Upgraded Track Layouts on ALL 6 Maps with dramatic verticality, sky bridges, tunnels, chicanes, and sweeping curves!
    const MAPS = [
        {
            id: "desert",
            name: "Desert Run",
            label: "Sherbet Canyon",
            sky: "desert_map/sky_desert_sunset.png",
            seed: 101,
            curvePull: 0.54,
            skyline: "desert",
            laps: 3,
            reward: 450,
            recommendedCar: "starter",
            opponentCars: ["starter", "starter", "starter", "street", "street"],
            weather: "sand",
            palette: {
                grass1: "#d6a75d",
                grass2: "#c28b42",
                rumble1: "#fff5d6",
                rumble2: "#dc2626",
                road1: "#423f3d",
                road2: "#393634",
                lane1: "#fde68a",
                lane2: "#d97706",
                horizon: "#f59e56",
            },
            miniMapRoute: [
                { x: 0.42, y: 0.86 },
                { x: 0.2, y: 0.72 },
                { x: 0.14, y: 0.5 },
                { x: 0.28, y: 0.34 },
                { x: 0.24, y: 0.16 },
                { x: 0.62, y: 0.14 },
                { x: 0.82, y: 0.28 },
                { x: 0.7, y: 0.46 },
                { x: 0.86, y: 0.64 },
                { x: 0.62, y: 0.82 },
            ],
            decorations: {
                primary: ["desert_map/cactus_column.png", "desert_map/tree_palm.png"],
                secondary: ["desert_map/desert_rock.png", "desert_map/billboard_checkpoint.png"],
                every: 7,
                secondaryEvery: 32,
                baseScale: 1.9,
                farOffset: 2.35,
            },
            sections: [
                { enter: 16, hold: 26, leave: 16, curve: 0, hill: 0 },
                { enter: 18, hold: 34, leave: 18, curve: -0.78, hill: 2200 },
                { enter: 16, hold: 30, leave: 16, curve: 0.92, hill: -1700 },
                { enter: 16, hold: 28, leave: 16, curve: 0, hill: 1900, tunnel: true },
                { enter: 18, hold: 36, leave: 18, curve: -0.96, hill: -2100 },
                { enter: 18, hold: 32, leave: 18, curve: 0.84, hill: 1400 },
                { enter: 16, hold: 28, leave: 16, curve: -0.64, hill: -1700 },
                { enter: 18, hold: 32, leave: 18, curve: 0.48, hill: 0 },
            ],
        },
        {
            id: "urban",
            name: "Urban Sprint",
            label: "Balloon Borough",
            sky: "urban_map/sky_urban_day.png",
            seed: 202,
            curvePull: 0.68,
            skyline: "urban",
            laps: 4,
            reward: 950,
            recommendedCar: "street",
            opponentCars: ["starter", "street", "street", "gt", "gt"],
            weather: "clear",
            palette: {
                grass1: "#3d6e5e",
                grass2: "#335e54",
                rumble1: "#ffffff",
                rumble2: "#ef4444",
                road1: "#2f3742",
                road2: "#262d37",
                lane1: "#facc15",
                lane2: "#eab308",
                horizon: "#7dd3fc",
            },
            miniMapRoute: [
                { x: 0.18, y: 0.8 },
                { x: 0.18, y: 0.25 },
                { x: 0.35, y: 0.25 },
                { x: 0.35, y: 0.12 },
                { x: 0.72, y: 0.12 },
                { x: 0.72, y: 0.32 },
                { x: 0.88, y: 0.32 },
                { x: 0.88, y: 0.72 },
                { x: 0.66, y: 0.72 },
                { x: 0.66, y: 0.88 },
                { x: 0.42, y: 0.88 },
                { x: 0.42, y: 0.68 },
            ],
            decorations: {
                primary: ["urban_map/building_glass_tower.png", "urban_map/building_brick_block.png", "urban_map/tree_urban.png"],
                secondary: ["urban_map/roadside_lamp.png", "urban_map/billboard_checkpoint.png"],
                every: 5,
                secondaryEvery: 22,
                baseScale: 1.9,
                farOffset: 2.65,
            },
            sections: [
                { enter: 16, hold: 24, leave: 16, curve: 0, hill: 0 },
                { enter: 16, hold: 30, leave: 16, curve: 0.96, hill: 2500 },
                { enter: 14, hold: 28, leave: 14, curve: -1.12, hill: -1800 },
                { enter: 16, hold: 32, leave: 16, curve: 0.68, hill: 1500, tunnel: true },
                { enter: 16, hold: 30, leave: 16, curve: -1.18, hill: -2200 },
                { enter: 16, hold: 28, leave: 16, curve: 1.02, hill: 1600 },
                { enter: 16, hold: 32, leave: 16, curve: 0, hill: -1600 },
                { enter: 14, hold: 26, leave: 14, curve: -0.84, hill: 900 },
                { enter: 16, hold: 26, leave: 16, curve: 0.46, hill: -900 },
            ],
        },
        {
            id: "night",
            name: "Neon Night",
            label: "Constellation Carnival",
            sky: "night_map/sky_neon_night.png",
            seed: 303,
            curvePull: 0.82,
            skyline: "night",
            laps: 5,
            reward: 1700,
            recommendedCar: "gt",
            opponentCars: ["street", "gt", "prototype", "gt", "prototype", "apex"],
            weather: "neon",
            palette: {
                grass1: "#14182b",
                grass2: "#0e1222",
                rumble1: "#00f5d4",
                rumble2: "#ff4fd8",
                road1: "#1e1e30",
                road2: "#171726",
                lane1: "#fde047",
                lane2: "#38bdf8",
                horizon: "#1e1b4b",
            },
            miniMapRoute: [
                { x: 0.5, y: 0.88 },
                { x: 0.24, y: 0.8 },
                { x: 0.12, y: 0.62 },
                { x: 0.34, y: 0.58 },
                { x: 0.18, y: 0.4 },
                { x: 0.32, y: 0.2 },
                { x: 0.58, y: 0.14 },
                { x: 0.5, y: 0.34 },
                { x: 0.82, y: 0.28 },
                { x: 0.9, y: 0.5 },
                { x: 0.68, y: 0.56 },
                { x: 0.84, y: 0.72 },
                { x: 0.66, y: 0.88 },
            ],
            decorations: {
                primary: ["night_map/building_neon_tower.png", "night_map/building_neon_sign.png", "night_map/roadside_lamp.png"],
                secondary: ["night_map/building_glass_tower.png", "night_map/billboard_checkpoint.png"],
                every: 5,
                secondaryEvery: 20,
                baseScale: 2.1,
                farOffset: 2.82,
            },
            sections: [
                { enter: 14, hold: 24, leave: 14, curve: -0.94, hill: 0 },
                { enter: 16, hold: 28, leave: 16, curve: 1.24, hill: 3100 },
                { enter: 14, hold: 26, leave: 14, curve: -1.32, hill: -2600 },
                { enter: 16, hold: 30, leave: 16, curve: 1.18, hill: 2200, tunnel: true },
                { enter: 14, hold: 26, leave: 14, curve: -1.16, hill: -2700 },
                { enter: 16, hold: 28, leave: 16, curve: 0.92, hill: 1400 },
                { enter: 16, hold: 30, leave: 16, curve: 0, hill: -1400 },
                { enter: 14, hold: 24, leave: 14, curve: -0.72, hill: 700 },
                { enter: 16, hold: 26, leave: 16, curve: 0.58, hill: -700 },
            ],
        },
        {
            id: "alpine",
            name: "Alpine Summit",
            label: "Crystal Crown",
            sky: "urban_map/sky_urban_day.png",
            seed: 505,
            curvePull: 0.86,
            skyline: "alpine",
            laps: 4,
            reward: 2400,
            recommendedCar: "prototype",
            opponentCars: ["gt", "prototype", "gt", "prototype", "apex", "hyper"],
            weather: "snow",
            palette: {
                grass1: "#2f4e5c",
                grass2: "#243d49",
                rumble1: "#f0f9ff",
                rumble2: "#2563eb",
                road1: "#293241",
                road2: "#222936",
                lane1: "#f8fafc",
                lane2: "#94a3b8",
                horizon: "#60a5fa",
            },
            miniMapRoute: [
                { x: 0.48, y: 0.88 },
                { x: 0.22, y: 0.82 },
                { x: 0.14, y: 0.58 },
                { x: 0.36, y: 0.44 },
                { x: 0.18, y: 0.24 },
                { x: 0.46, y: 0.12 },
                { x: 0.78, y: 0.2 },
                { x: 0.64, y: 0.44 },
                { x: 0.86, y: 0.62 },
                { x: 0.72, y: 0.84 },
            ],
            decorations: {
                primary: ["procedural/alpine_pine.svg", "procedural/alpine_rock.svg"],
                secondary: ["urban_map/billboard_checkpoint.png", "urban_map/roadside_lamp.png"],
                every: 5,
                secondaryEvery: 24,
                baseScale: 1.95,
                farOffset: 2.45,
            },
            sections: [
                { enter: 16, hold: 26, leave: 16, curve: 0, hill: 1800 },
                { enter: 16, hold: 30, leave: 16, curve: -1.18, hill: 2600 },
                { enter: 14, hold: 28, leave: 14, curve: 1.28, hill: -2400 },
                { enter: 16, hold: 32, leave: 16, curve: -0.98, hill: 2000, tunnel: true },
                { enter: 16, hold: 28, leave: 16, curve: 1.2, hill: -2200 },
                { enter: 16, hold: 30, leave: 16, curve: -0.84, hill: -1800 },
                { enter: 16, hold: 26, leave: 16, curve: 0.64, hill: 0 },
            ],
        },
        {
            id: "coast",
            name: "Cyber Coast",
            label: "Bubblegum Bay",
            sky: "desert_map/sky_desert_sunset.png",
            seed: 606,
            curvePull: 0.88,
            skyline: "coast",
            laps: 4,
            reward: 3200,
            recommendedCar: "apex",
            opponentCars: ["gt", "prototype", "apex", "prototype", "apex", "hyper"],
            weather: "rain",
            palette: {
                grass1: "#0e3b5c",
                grass2: "#0a2e4a",
                rumble1: "#00f5d4",
                rumble2: "#fb7185",
                road1: "#1e2236",
                road2: "#161a2b",
                lane1: "#fde047",
                lane2: "#00f5d4",
                horizon: "#fb923c",
            },
            miniMapRoute: [
                { x: 0.5, y: 0.88 },
                { x: 0.18, y: 0.8 },
                { x: 0.14, y: 0.42 },
                { x: 0.34, y: 0.18 },
                { x: 0.66, y: 0.14 },
                { x: 0.86, y: 0.36 },
                { x: 0.78, y: 0.68 },
                { x: 0.62, y: 0.86 },
            ],
            decorations: {
                primary: ["procedural/coast_arch.svg", "desert_map/tree_palm.png"],
                secondary: ["night_map/roadside_lamp.png", "night_map/billboard_checkpoint.png"],
                every: 5,
                secondaryEvery: 22,
                baseScale: 2.0,
                farOffset: 2.55,
            },
            sections: [
                { enter: 16, hold: 32, leave: 16, curve: 0.62, hill: 1400 },
                { enter: 16, hold: 34, leave: 16, curve: -1.2, hill: 2200 },
                { enter: 16, hold: 32, leave: 16, curve: 1.28, hill: -2600, tunnel: true },
                { enter: 18, hold: 34, leave: 18, curve: -1.0, hill: 1800 },
                { enter: 16, hold: 30, leave: 16, curve: 1.12, hill: -2800 },
                { enter: 16, hold: 32, leave: 16, curve: -0.66, hill: 0 },
            ],
        },
        {
            id: "test",
            name: "Stadium Circuit",
            label: "Confetti Coliseum",
            sky: "training_map/sky_urban_day.png",
            seed: 404,
            curvePull: 0.72,
            skyline: "urban",
            laps: 3,
            reward: 350,
            recommendedCar: "starter",
            opponentCars: ["starter", "street", "gt", "prototype", "apex"],
            weather: "clear",
            palette: {
                grass1: "#228b4d",
                grass2: "#1c7540",
                rumble1: "#ffffff",
                rumble2: "#ef4444",
                road1: "#333944",
                road2: "#2a303a",
                lane1: "#fde047",
                lane2: "#f59e0b",
                horizon: "#7dd3fc",
            },
            miniMapRoute: [
                { x: 0.5, y: 0.88 },
                { x: 0.22, y: 0.84 },
                { x: 0.14, y: 0.56 },
                { x: 0.28, y: 0.24 },
                { x: 0.64, y: 0.14 },
                { x: 0.86, y: 0.34 },
                { x: 0.74, y: 0.6 },
                { x: 0.84, y: 0.8 },
            ],
            decorations: {
                primary: ["training_map/building_glass_tower.png", "training_map/tree_urban.png", "training_map/building_brick_block.png"],
                secondary: ["training_map/roadside_lamp.png", "training_map/billboard_checkpoint.png"],
                every: 5,
                secondaryEvery: 20,
                baseScale: 1.9,
                farOffset: 2.55,
            },
            sections: [
                { enter: 16, hold: 28, leave: 16, curve: 0, hill: 0 },
                { enter: 16, hold: 34, leave: 16, curve: 0.96, hill: 1900 },
                { enter: 16, hold: 28, leave: 16, curve: -1.04, hill: -1700 },
                { enter: 16, hold: 30, leave: 16, curve: 0.55, hill: 1400, tunnel: true },
                { enter: 16, hold: 32, leave: 16, curve: -0.92, hill: -1600 },
                { enter: 16, hold: 30, leave: 16, curve: 0.78, hill: 0 },
            ],
        },
    ];
    const LANE_OFFSETS = [-0.56, 0, 0.56];
    const skyCanvas = document.querySelector("#skyCanvas");
    const skyCtx = skyCanvas?.getContext("2d") ?? null;
    const babylonCanvas = document.querySelector("#babylonCanvas");
    const canvas = requireElement("#gameCanvas");
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Canvas 2D context is unavailable.");
    }
    const ctx = context;
    const miniMapCanvas = requireElement("#miniMapCanvas");
    const miniMapContext = miniMapCanvas.getContext("2d");
    if (!miniMapContext) {
        throw new Error("Minimap canvas 2D context is unavailable.");
    }
    const mapCtx = miniMapContext;
    const app = requireElement("#app");
    const loadingScreen = requireElement("#loadingScreen");
    const loadingPercent = requireElement("#loadingPercent");
    const loadingFill = requireElement("#loadingFill");
    const menuPanel = requireElement("#menuPanel");
    const menuContent = requireElement("#menuContent");
    const backButton = requireElement("#backButton");
    const resumeButton = requireElement("#resumeButton");
    const panelStatus = requireElement("#panelStatus");
    const panelSubtitle = requireElement("#panelSubtitle");
    const panelChallenge = requireElement("#panelChallenge");
    const raceMessage = requireElement("#raceMessage");
    const countdownOverlay = requireElement("#countdownOverlay");
    const hudSpeed = requireElement("#hudSpeed");
    const hudSpeedUnit = requireElement("#hudSpeedUnit");
    const hudGear = requireElement("#hudGear");
    const hudRpmFill = requireElement("#hudRpmFill");
    const hudNitro = requireElement("#hudNitro");
    const hudNitroFill = requireElement("#hudNitroFill");
    const nitroMeter = requireElement("#nitroMeter");
    const hudLap = requireElement("#hudLap");
    const hudPlace = requireElement("#hudPlace");
    const hudPlaceDelta = requireElement("#hudPlaceDelta");
    const hudTimer = requireElement("#hudTimer");
    const hudBestLap = requireElement("#hudBestLap");
    const hudModeBadge = requireElement("#hudModeBadge");
    const hudRouteItem = requireElement("#hudRouteItem");
    const hudRoute = requireElement("#hudRoute");
    const raceTimer = requireElement("#raceTimer");
    const mapStats = requireElement("#mapStats");
    const driveHud = requireElement("#driveHud");
    const buffsHud = requireElement("#buffsHud");
    const comboHud = requireElement("#comboHud");
    const comboMultiplier = requireElement("#comboMultiplier");
    const comboLabel = requireElement("#comboLabel");
    const comboTimerFill = requireElement("#comboTimerFill");
    const calloutStack = requireElement("#calloutStack");
    const incomingWarning = requireElement("#incomingWarning");
    const raceProgressBar = requireElement("#raceProgressBar");
    const raceProgressFill = requireElement("#raceProgressFill");
    const raceProgressMarkers = requireElement("#raceProgressMarkers");
    const raceProgressLabel = requireElement("#raceProgressLabel");
    const itemBoxHud = requireElement("#itemBoxHud");
    const itemIcon = requireElement("#itemIcon");
    const itemName = requireElement("#itemName");
    const itemHint = requireElement("#itemHint");
    const coinBonusHud = requireElement("#coinBonusHud");
    const hudRaceCoins = requireElement("#hudRaceCoins");
    const hudCoinSpeedBonus = requireElement("#hudCoinSpeedBonus");
    const summaryModal = requireElement("#summaryModal");
    const summaryEyebrow = requireElement("#summaryEyebrow");
    const summaryTitle = requireElement("#summaryTitle");
    const summaryMedal = requireElement("#summaryMedal");
    const summaryStats = requireElement("#summaryStats");
    const summaryCoins = requireElement("#summaryCoins");
    const summaryBadges = requireElement("#summaryBadges");
    const summaryActions = requireElement("#summaryActions");
    const pauseButton = requireElement("#pauseButton");
    const touchControls = requireElement("#touchControls");
    const touchLeft = requireElement("#touchLeft");
    const touchRight = requireElement("#touchRight");
    const touchGas = requireElement("#touchGas");
    const touchBrake = requireElement("#touchBrake");
    const touchNitro = requireElement("#touchNitro");
    const touchItem = requireElement("#touchItem");
    const tiltToggle = requireElement("#tiltToggle");
    const keys = new Set();
    const TOUCH_CONTROL_KEYS = ["arrowleft", "arrowright", "arrowup", "arrowdown", "n"];
    const UI_BUTTON_CLICK_SELECTOR = "button, .option-button";
    const GAME_BUTTON_SELECTOR = "#touchControls button, .touch-button";
    const UI_BUTTON_CLICK_ASSET = getAssetUrl("sounds/ui-click.wav");
    const UI_BUTTON_CLICK_VOLUME = 0.5;
    const UI_BUTTON_CLICK_POOL_SIZE = 5;
    const MAP_BGM_ASSETS = {
        [FIRST_LEVEL_ID]: getAssetUrl("sounds/bgm/first_map_bgm.mp3"),
        [SECOND_LEVEL_ID]: getAssetUrl("sounds/bgm/second_map_bgm.mp3"),
        [THIRD_LEVEL_ID]: getAssetUrl("sounds/bgm/third_map_bgm.mp3"),
        [FOURTH_LEVEL_ID]: getAssetUrl("sounds/bgm/third_map_bgm.mp3"),
        [FIFTH_LEVEL_ID]: getAssetUrl("sounds/bgm/second_map_bgm.mp3"),
        [TEST_LEVEL_ID]: getAssetUrl("sounds/bgm/test_map_bgm.mp3"),
    };
    const CALM_BGM_ASSET = getAssetUrl("sounds/bgm/calm_bgm.mp3");
    const CALM_BGM_START = 2.5;
    const DEFAULT_BGM_VOLUME = 0.42;
    const DEFAULT_CAR_SOUND_VOLUME = 1;
    const DEFAULT_SFX_VOLUME = 0.78;
    const ENGINE_SOUND_ASSET = getAssetUrl("sounds/engine-revving-long.mp3");
    const ENGINE_LOOP_START = 4;
    const ENGINE_LOOP_END = 38;
    const ENGINE_IDLE_VOLUME = 0.045;
    const ENGINE_MAX_VOLUME = 0.36;
    const ENGINE_IDLE_RATE = 0.65;
    const ENGINE_MAX_RATE = 1.45;
    const ENGINE_NITRO_RATE = 1.85;
    const ENGINE_VOLUME_SMOOTHING = 8;
    const ENGINE_RATE_SMOOTHING = 6;
    const uiButtonClickSounds = createUiButtonClickSoundPool();
    const mapBgmTracks = createMapBgmTracks();
    const calmBgmTrack = createCalmBgmTrack();
    const engineSound = createEngineSound();
    const assetImages = {};
    let renderWidth = 1280;
    let renderHeight = 720;
    let selectedMapId = FIRST_LEVEL_ID;
    let selectedRaceDirection = "forward";
    let mode = "menu";
    let menuView = "main";
    let disposeModelPreview;
    let menuPageIndex = 0;
    let segments = [];
    let miniMapPoints = [];
    let trackLength = 1;
    let maxSpeed = BASE_MAX_SPEED;
    let lastFrame = performance.now();
    let raceStepTime = 0;
    let nitroZoomVisual = 0;
    let visualPlayerX = 0;
    let cameraPitch = 0;
    let cameraRoll = 0;
    let cameraShake = 0;
    let attractPosition = 0;
    let raceTime = 0;
    let lapStartTime = 0;
    let currentBestLap = 0;
    let lastSectorIndex = 0;
    let sectorTimes = [];
    let bestSectorTimes = [];
    let countdownRemaining = 0;
    let countdownLabel = "";
    let raceRewardPaid = false;
    let uiButtonClickSoundIndex = 0;
    let engineVolume = 0;
    let engineRate = ENGINE_IDLE_RATE;
    let confirmResetSave = false;
    let fpsEstimate = 60;
    let comboCount = 0;
    let comboTimer = 0;
    let raceOvertakes = 0;
    let raceNearMisses = 0;
    let raceCollisions = 0;
    let raceCoinsCollected = 0;
    let raceTopSpeed = 0;
    let lastPlace = 1;
    let placeDeltaTimer = 0;
    let placeDeltaValue = 0;
    let endlessTimeLeft = 45;
    let endlessScore = 0;
    let knockoutNextLap = 2;
    let playerKnockedOut = false;
    let finishCelebrationSlowMo = 0;
    let lockedFinishPlace = 0;
    let rouletteTickAccum = 0;
    let starMusicAccum = 0;
    let miniMapFrameCounter = 0;
    let overlayWasDirty = true;
    // Offscreen static caches for sky & minimap track
    const skyCacheCanvas = document.createElement("canvas");
    const skyCacheCtx = skyCacheCanvas.getContext("2d");
    let skyCacheKey = "";
    const miniMapBgCanvas = document.createElement("canvas");
    const miniMapBgCtx = miniMapBgCanvas.getContext("2d");
    let miniMapBgKey = "";
    // Pre-allocated HUD pools & dirty-check cache
    const hudCache = {};
    const progressPipPool = [];
    const buffPillPool = [];
    let tiltEnabled = false;
    let tiltBaselineGamma = null;
    let tiltSteerValue = 0;
    let gamepadSteer = 0;
    let gamepadThrottle = false;
    let gamepadBrake = false;
    let gamepadNitro = false;
    let gamepadPrevPause = false;
    let gamepadPrevItem = false;
    let audioCtx = null;
    let screechGain = null;
    let screechFilter = null;
    let lastNitroActive = false;
    let save = loadSave();
    const player = {
        carId: "starter",
        x: 0,
        speed: 0,
        position: 0,
        totalDistance: 0,
        lap: 1,
        nitro: NITRO_MAX,
        nitroActive: false,
        nitroLocked: false,
        shieldTime: 0,
        magnetTime: 0,
        overdriveTime: 0,
        starTime: 0,
        mushroomTime: 0,
        miniTurboTime: 0,
        stunTime: 0,
        spinTime: 0,
        collisionCooldown: 0,
        steerInput: 0,
        drifting: false,
        lateralSpeed: 0,
        driftDir: 0,
        driftCharge: 0,
        slipstream: 0,
        gear: 1,
        rpm: 0.2,
        airY: 0,
        airVy: 0,
        hazardSpinTime: 0,
        heldItem: null,
        rouletteTime: 0,
        rouletteDisplay: null,
        raceCoins: 0,
    };
    let opponents = [];
    let itemBoxes = [];
    let shells = [];
    let powerups = [];
    let boostPads = [];
    let hazards = [];
    let roadCoins = [];
    let airstrikes = [];
    let impactEffects = [];
    const particles = Array.from({ length: MAX_PARTICLES }, () => ({
        active: false, x: 0, y: 0, vx: 0, vy: 0, size: 2, life: 0, maxLife: 1, color: "#fff", kind: "spark",
    }));
    const skidMarks = [];
    let sessionChallenge = createSessionChallenge();
    let babylonState = null;
    let babylonActiveMapId = null;
    function setColor3FromHsl(out, h, s, l) {
        const hue = ((h % 1) + 1) % 1;
        if (s <= 0) {
            out.set(l, l, l);
            return;
        }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const hue2rgb = (t) => {
            let x = t;
            if (x < 0)
                x += 1;
            if (x > 1)
                x -= 1;
            if (x < 1 / 6)
                return p + (q - p) * 6 * x;
            if (x < 1 / 2)
                return q;
            if (x < 2 / 3)
                return p + (q - p) * (2 / 3 - x) * 6;
            return p;
        };
        out.set(hue2rgb(hue + 1 / 3), hue2rgb(hue), hue2rgb(hue - 1 / 3));
    }
    function hexToBabylonColor3(hex, cache) {
        if (cache) {
            const existing = cache.get(hex);
            if (existing)
                return existing;
        }
        const clean = hex.startsWith("#") ? hex : `#${hex}`;
        const c = clean.length === 7 ? BABYLON.Color3.FromHexString(clean) : new BABYLON.Color3(1, 1, 1);
        if (cache)
            cache.set(hex, c);
        return c;
    }
    function initBabylonEngine() {
        if (!babylonCanvas) {
            return null;
        }
        let engine;
        try {
            engine = new BABYLON.Engine(babylonCanvas, true, {
                alpha: true,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                powerPreference: "high-performance",
                stencil: false,
            });
            const pixelRatio = clamp(window.devicePixelRatio || 1, 1, 1.5);
            engine.setHardwareScalingLevel(1 / pixelRatio);
            const scene = new BABYLON.Scene(engine);
            scene.useRightHandedSystem = true;
            scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
            scene.ambientColor = new BABYLON.Color3(1, 1, 1);
            scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
            scene.fogColor = BABYLON.Color3.FromHexString("#121826");
            scene.fogDensity = 0.000024;
            const camera = new BABYLON.FreeCamera("raceCamera", new BABYLON.Vector3(0, 560, 1080), scene);
            camera.fov = 1.04;
            camera.minZ = 30;
            camera.maxZ = 60000;
            const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
            hemiLight.intensity = 0.95;
            hemiLight.diffuse = new BABYLON.Color3(1, 1, 1);
            hemiLight.groundColor = new BABYLON.Color3(0.2, 0.25, 0.33);
            hemiLight.specular = new BABYLON.Color3(0.25, 0.25, 0.25);
            const sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(-0.4, -0.85, -0.3), scene);
            sunLight.intensity = 1.1;
            sunLight.diffuse = new BABYLON.Color3(1, 0.96, 0.84);
            sunLight.specular = new BABYLON.Color3(0.7, 0.7, 0.7);
            const glowLayer = new BABYLON.GlowLayer("glow", scene, {
                mainTextureFixedSize: 256,
                blurKernelSize: 24,
            });
            glowLayer.intensity = 0.55;
            // Shimmering ocean plane for Cyber Coast
            const oceanPlane = BABYLON.MeshBuilder.CreatePlane("oceanPlane", { width: 90000, height: 90000 }, scene);
            const oceanMat = new BABYLON.StandardMaterial("oceanMat", scene);
            oceanMat.diffuseColor = BABYLON.Color3.FromHexString("#0c4a6e");
            oceanMat.emissiveColor = BABYLON.Color3.FromHexString("#082f49");
            oceanMat.specularColor = new BABYLON.Color3(0.45, 0.7, 0.9);
            oceanMat.backFaceCulling = false;
            oceanPlane.material = oceanMat;
            oceanPlane.rotation.x = -Math.PI / 2;
            oceanPlane.position.y = -40;
            oceanPlane.isVisible = false;
            glowLayer.addExcludedMesh(oceanPlane);
            // Sliding 3D Road Ribbon Buffers (DRAW_DISTANCE segments * 6 vertices * 3/4 floats)
            const segs = DRAW_DISTANCE;
            const createRibbon = (name, withColor, doubleCount, zOffset) => {
                const vertCount = segs * 6 * doubleCount;
                const pos = new Float32Array(vertCount * 3);
                const col = new Float32Array(vertCount * 4);
                const indices = new Uint16Array(vertCount);
                for (let i = 0; i < vertCount; i += 1) {
                    indices[i] = i;
                }
                const mesh = new BABYLON.Mesh(name, scene);
                mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, pos, true);
                if (withColor) {
                    mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, col, true, 4);
                }
                mesh.setIndices(indices);
                mesh.alwaysSelectAsActiveMesh = true;
                mesh.isPickable = false;
                mesh.hasVertexAlpha = false;
                const mat = new BABYLON.StandardMaterial(`${name}Mat`, scene);
                mat.disableLighting = true;
                mat.backFaceCulling = false;
                mat.emissiveColor = new BABYLON.Color3(0, 0, 0);
                mat.ambientColor = withColor ? new BABYLON.Color3(1, 1, 1) : BABYLON.Color3.FromHexString("#fde047");
                mat.zOffset = zOffset;
                mesh.material = mat;
                glowLayer.addExcludedMesh(mesh);
                return { mesh, pos, col };
            };
            const ground = createRibbon("groundRibbon", true, 1, 0);
            const rumble = createRibbon("rumbleRibbon", true, 2, -0.5);
            const road = createRibbon("roadRibbon", true, 1, -1);
            const lane = createRibbon("laneRibbon", false, 2, -2);
            // Player 3D Kart
            const playerKart = createBabylonKartNode(scene, "#ef4444", true, "player");
            const playerShieldSphere = BABYLON.MeshBuilder.CreateSphere("playerShield", { diameter: 520, segments: 16 }, scene);
            const shieldMat = new BABYLON.StandardMaterial("shieldMat", scene);
            shieldMat.diffuseColor = BABYLON.Color3.FromHexString("#6ff2ff");
            shieldMat.emissiveColor = BABYLON.Color3.FromHexString("#22d3ee");
            shieldMat.alpha = 0.26;
            playerShieldSphere.material = shieldMat;
            playerShieldSphere.parent = playerKart.root;
            playerShieldSphere.position.y = 95;
            playerShieldSphere.isVisible = false;
            // Opponent 3D Karts Pool
            const opponentKarts = Array.from({ length: 12 }, (_, idx) => {
                const k = createBabylonKartNode(scene, "#3b82f6", false, `opp_${idx}`);
                k.root.setEnabled(false);
                return k;
            });
            // Energy Pod / Mystery Crate 3D Pool with DynamicTexture ★ emblem
            const qTex = new BABYLON.DynamicTexture("crateStarTex", { width: 128, height: 128 }, scene, false);
            const qCtx = qTex.getContext();
            const qGrad = qCtx.createLinearGradient(0, 0, 128, 128);
            qGrad.addColorStop(0, "#0ea5e9");
            qGrad.addColorStop(0.5, "#6366f1");
            qGrad.addColorStop(1, "#ec4899");
            qCtx.fillStyle = qGrad;
            qCtx.fillRect(0, 0, 128, 128);
            qCtx.strokeStyle = "#fde047";
            qCtx.lineWidth = 10;
            qCtx.strokeRect(5, 5, 118, 118);
            qCtx.fillStyle = "#ffffff";
            qCtx.font = "900 76px Arial, sans-serif";
            qCtx.textAlign = "center";
            qCtx.textBaseline = "middle";
            qCtx.fillText("★", 64, 66);
            qTex.update(false);
            const itemBoxMeshes = Array.from({ length: 24 }, (_, idx) => {
                const root = new BABYLON.TransformNode(`crate_${idx}`, scene);
                const core = BABYLON.MeshBuilder.CreateBox(`crateCore_${idx}`, { size: 200 }, scene);
                const coreMat = new BABYLON.StandardMaterial(`crateCoreMat_${idx}`, scene);
                coreMat.diffuseTexture = qTex;
                coreMat.emissiveTexture = qTex;
                coreMat.emissiveColor = new BABYLON.Color3(0.45, 0.45, 0.45);
                coreMat.alpha = 0.95;
                core.material = coreMat;
                core.parent = root;
                const cage = BABYLON.MeshBuilder.CreateBox(`crateCage_${idx}`, { size: 222 }, scene);
                const cageMat = new BABYLON.StandardMaterial(`crateCageMat_${idx}`, scene);
                cageMat.diffuseColor = BABYLON.Color3.FromHexString("#fef08a");
                cageMat.emissiveColor = BABYLON.Color3.FromHexString("#facc15");
                cageMat.alpha = 0.22;
                cage.material = cageMat;
                cage.parent = root;
                root.setEnabled(false);
                return { root, core, coreMat, cageMat };
            });
            // Gold Coins 3D Pool
            const coinMat = new BABYLON.StandardMaterial("coinMat", scene);
            coinMat.diffuseColor = BABYLON.Color3.FromHexString("#ffcf42");
            coinMat.emissiveColor = BABYLON.Color3.FromHexString("#92400e");
            coinMat.specularColor = new BABYLON.Color3(1, 0.95, 0.6);
            const coinMeshes = Array.from({ length: 28 }, (_, idx) => {
                const m = BABYLON.MeshBuilder.CreateCylinder(`coin_${idx}`, { diameter: 170, height: 26, tessellation: 16 }, scene);
                m.material = coinMat;
                m.rotation.x = Math.PI / 2;
                m.isVisible = false;
                return m;
            });
            // Boost Pads 3D Pool
            const boostMat = new BABYLON.StandardMaterial("boostPadMat", scene);
            boostMat.disableLighting = true;
            boostMat.emissiveColor = BABYLON.Color3.FromHexString("#00f5d4");
            const boostMeshes = Array.from({ length: 16 }, (_, idx) => {
                const m = BABYLON.MeshBuilder.CreateCylinder(`boost_${idx}`, { diameterTop: 0, diameterBottom: 320, height: 260, tessellation: 3 }, scene);
                m.material = boostMat;
                m.rotation.x = -Math.PI / 2;
                m.scaling.set(1.2, 1, 0.14);
                m.isVisible = false;
                return m;
            });
            // Hazards 3D Pool
            const coneMatShared = new BABYLON.StandardMaterial("hazardConeMat", scene);
            coneMatShared.diffuseColor = BABYLON.Color3.FromHexString("#facc15");
            coneMatShared.emissiveColor = BABYLON.Color3.FromHexString("#854d0e");
            const hazardMeshes = Array.from({ length: 28 }, (_, idx) => {
                const root = new BABYLON.TransformNode(`hazard_${idx}`, scene);
                const slick = BABYLON.MeshBuilder.CreateCylinder(`slick_${idx}`, { diameter: 400, height: 10, tessellation: 16 }, scene);
                const slickMat = new BABYLON.StandardMaterial(`slickMat_${idx}`, scene);
                slickMat.diffuseColor = BABYLON.Color3.FromHexString("#1e293b");
                slickMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
                slick.material = slickMat;
                slick.parent = root;
                const cone = BABYLON.MeshBuilder.CreateCylinder(`hCone_${idx}`, { diameterTop: 0, diameterBottom: 150, height: 160, tessellation: 8 }, scene);
                cone.material = coneMatShared;
                cone.position.y = 80;
                cone.parent = root;
                root.setEnabled(false);
                return { root, slick, slickMat, cone };
            });
            // Projectiles 3D Pool (Homing Missiles, Twister Vortexes, Plasma Quakes)
            const projectileMeshes = Array.from({ length: 14 }, (_, idx) => {
                const root = new BABYLON.TransformNode(`proj_${idx}`, scene);
                const core = BABYLON.MeshBuilder.CreateCylinder(`projCore_${idx}`, { diameterTop: 0, diameterBottom: 176, height: 260, tessellation: 10 }, scene);
                const coreMat = new BABYLON.StandardMaterial(`projCoreMat_${idx}`, scene);
                coreMat.diffuseColor = BABYLON.Color3.FromHexString("#38bdf8");
                coreMat.emissiveColor = BABYLON.Color3.FromHexString("#0284c7");
                core.material = coreMat;
                core.rotation.x = -Math.PI / 2;
                core.parent = root;
                const ring = BABYLON.MeshBuilder.CreateTorus(`projRing_${idx}`, { diameter: 260, thickness: 40, tessellation: 20 }, scene);
                const ringMat = new BABYLON.StandardMaterial(`projRingMat_${idx}`, scene);
                ringMat.disableLighting = true;
                ringMat.emissiveColor = BABYLON.Color3.FromHexString("#fde047");
                ring.material = ringMat;
                ring.rotation.x = Math.PI / 2;
                ring.parent = root;
                root.setEnabled(false);
                return { root, core, coreMat, ringMat };
            });
            // Tunnel Arch Ring Pool
            const tunnelMat = new BABYLON.StandardMaterial("tunnelArchMat", scene);
            tunnelMat.diffuseColor = BABYLON.Color3.FromHexString("#1e293b");
            const tunnelStripMat = new BABYLON.StandardMaterial("tunnelStripMat", scene);
            tunnelStripMat.disableLighting = true;
            tunnelStripMat.emissiveColor = BABYLON.Color3.FromHexString("#ffcf42");
            const tunnelArches = Array.from({ length: 28 }, (_, idx) => {
                const g = new BABYLON.TransformNode(`tunnel_${idx}`, scene);
                const top = BABYLON.MeshBuilder.CreateBox(`tTop_${idx}`, { width: ROAD_WIDTH * 2.55, height: 160, depth: 180 }, scene);
                top.material = tunnelMat;
                top.position.y = 1320;
                top.parent = g;
                const leftP = BABYLON.MeshBuilder.CreateBox(`tL_${idx}`, { width: 180, height: 1400, depth: 180 }, scene);
                leftP.material = tunnelMat;
                leftP.position.set(-ROAD_WIDTH * 1.2, 680, 0);
                leftP.parent = g;
                const rightP = BABYLON.MeshBuilder.CreateBox(`tR_${idx}`, { width: 180, height: 1400, depth: 180 }, scene);
                rightP.material = tunnelMat;
                rightP.position.set(ROAD_WIDTH * 1.2, 680, 0);
                rightP.parent = g;
                const strip = BABYLON.MeshBuilder.CreateBox(`tStrip_${idx}`, { width: ROAD_WIDTH * 1.2, height: 32, depth: 160 }, scene);
                strip.material = tunnelStripMat;
                strip.position.y = 1230;
                strip.parent = g;
                g.setEnabled(false);
                return g;
            });
            // Bridge Viaduct Support Pillars for elevated skyway sections
            const bridgePillarMat = new BABYLON.StandardMaterial("bridgePillarMat", scene);
            bridgePillarMat.diffuseColor = BABYLON.Color3.FromHexString("#334155");
            const bridgePillars = Array.from({ length: 32 }, (_, idx) => {
                const g = new BABYLON.TransformNode(`bridge_${idx}`, scene);
                const pL = BABYLON.MeshBuilder.CreateBox(`bL_${idx}`, { width: 220, height: 4600, depth: 220 }, scene);
                pL.material = bridgePillarMat;
                pL.position.set(-ROAD_WIDTH * 0.92, -2300, 0);
                pL.parent = g;
                const pR = BABYLON.MeshBuilder.CreateBox(`bR_${idx}`, { width: 220, height: 4600, depth: 220 }, scene);
                pR.material = bridgePillarMat;
                pR.position.set(ROAD_WIDTH * 0.92, -2300, 0);
                pR.parent = g;
                const cross = BABYLON.MeshBuilder.CreateBox(`bC_${idx}`, { width: ROAD_WIDTH * 2.1, height: 160, depth: 200 }, scene);
                cross.material = bridgePillarMat;
                cross.position.y = -240;
                cross.parent = g;
                g.setEnabled(false);
                return g;
            });
            // Start/Finish Gantry Bridge + 3 Lights
            const gantryGroup = new BABYLON.TransformNode("gantryGroup", scene);
            const gantryMat = new BABYLON.StandardMaterial("gantryMat", scene);
            gantryMat.diffuseColor = BABYLON.Color3.FromHexString("#0f172a");
            const gTrimMat = new BABYLON.StandardMaterial("gantryTrimMat", scene);
            gTrimMat.disableLighting = true;
            gTrimMat.emissiveColor = BABYLON.Color3.FromHexString("#ffcf42");
            const gLeft = BABYLON.MeshBuilder.CreateBox("gLeft", { width: 210, height: 1650, depth: 210 }, scene);
            gLeft.material = gantryMat;
            gLeft.position.set(-ROAD_WIDTH * 1.18, 825, 0);
            gLeft.parent = gantryGroup;
            const gRight = BABYLON.MeshBuilder.CreateBox("gRight", { width: 210, height: 1650, depth: 210 }, scene);
            gRight.material = gantryMat;
            gRight.position.set(ROAD_WIDTH * 1.18, 825, 0);
            gRight.parent = gantryGroup;
            const gBeam = BABYLON.MeshBuilder.CreateBox("gBeam", { width: ROAD_WIDTH * 2.55, height: 340, depth: 240 }, scene);
            gBeam.material = gantryMat;
            gBeam.position.set(0, 1520, 0);
            gBeam.parent = gantryGroup;
            const gTrim = BABYLON.MeshBuilder.CreateBox("gTrim", { width: ROAD_WIDTH * 2.58, height: 50, depth: 260 }, scene);
            gTrim.material = gTrimMat;
            gTrim.position.set(0, 1340, 0);
            gTrim.parent = gantryGroup;
            const gantryLightMats = [];
            for (let i = 0; i < 3; i += 1) {
                const bulb = BABYLON.MeshBuilder.CreateSphere(`gBulb_${i}`, { diameter: 150, segments: 12 }, scene);
                const bulbMat = new BABYLON.StandardMaterial(`gBulbMat_${i}`, scene);
                bulbMat.disableLighting = true;
                bulbMat.emissiveColor = BABYLON.Color3.FromHexString("#334155");
                bulb.material = bulbMat;
                bulb.position.set((i - 1) * 340, 1510, 135);
                bulb.parent = gantryGroup;
                gantryLightMats.push(bulbMat);
            }
            gantryGroup.setEnabled(false);
            // 3D Landmark / Prop Pools
            const propPool = {
                ...Object.fromEntries(MAPS.map(({ id }) => [
                    id, Array.from({ length: 12 }, (_, i) => hideNode(createThemedProp(scene, id, i))),
                ])),
                cactus: Array.from({ length: 24 }, (_, i) => hideNode(create3DCactus(scene, i))),
                palm: Array.from({ length: 24 }, (_, i) => hideNode(create3DPalm(scene, false, i))),
                neonPalm: Array.from({ length: 24 }, (_, i) => hideNode(create3DPalm(scene, true, i))),
                rock: Array.from({ length: 20 }, (_, i) => hideNode(create3DMesa(scene, i))),
                pine: Array.from({ length: 30 }, (_, i) => hideNode(create3DPine(scene, i))),
                tower: Array.from({ length: 28 }, (_, i) => hideNode(create3DBuilding(scene, false, i))),
                neonTower: Array.from({ length: 28 }, (_, i) => hideNode(create3DBuilding(scene, true, i))),
                lamp: Array.from({ length: 24 }, (_, i) => hideNode(create3DLamp(scene, i))),
                billboard: Array.from({ length: 16 }, (_, i) => hideNode(create3DBillboard(scene, i))),
            };
            return {
                engine,
                scene,
                camera,
                hemiLight,
                sunLight,
                glowLayer,
                oceanPlane,
                roadMesh: road.mesh,
                rumbleMesh: rumble.mesh,
                laneMesh: lane.mesh,
                groundMesh: ground.mesh,
                roadPos: road.pos,
                roadCol: road.col,
                rumblePos: rumble.pos,
                rumbleCol: rumble.col,
                lanePos: lane.pos,
                groundPos: ground.pos,
                groundCol: ground.col,
                playerKart,
                playerShieldSphere,
                opponentKarts,
                itemBoxMeshes,
                coinMeshes,
                boostMeshes,
                hazardMeshes,
                projectileMeshes,
                propPool,
                propCursors: Object.fromEntries(Object.keys(propPool).map((key) => [key, 0])),
                tunnelArches,
                bridgePillars,
                gantryGroup,
                gantryLightMats,
                curveXs: new Float32Array(DRAW_DISTANCE + 1),
                segYs: new Float32Array(DRAW_DISTANCE + 1),
                tmpCol: new BABYLON.Color3(1, 1, 1),
                tmpCol2: new BABYLON.Color3(1, 1, 1),
                tmpTarget: new BABYLON.Vector3(0, 0, -3200),
                paintColorCache: new Map(),
            };
        }
        catch {
            engine?.dispose();
            return null;
        }
    }
    function hideNode(node) {
        node.setEnabled(false);
        return node;
    }
    function createThemedProp(scene, mapId, index) {
        const tag = `${mapId}_${index}`;
        const root = new BABYLON.TransformNode(tag, scene);
        const { colors } = ROUTE_THEMES[mapId];
        const material = new BABYLON.StandardMaterial(tag, scene);
        material.diffuseColor = BABYLON.Color3.FromHexString(colors[index % colors.length]);
        const accent = new BABYLON.StandardMaterial(`${tag}_accent`, scene);
        accent.diffuseColor = BABYLON.Color3.FromHexString(colors[(index + 1) % colors.length]);
        const base = BABYLON.MeshBuilder.CreateCylinder(`${tag}_base`, { diameterTop: 70, diameterBottom: 175, height: 720, tessellation: 8 }, scene);
        base.position.y = 360;
        base.material = accent;
        base.parent = root;
        let top;
        if (mapId === "desert" || mapId === "coast") {
            top = BABYLON.MeshBuilder.CreateTorus(`${tag}_ring`, { diameter: 660, thickness: mapId === "desert" ? 170 : 80, tessellation: 18 }, scene);
            top.rotation.x = Math.PI / 2;
        }
        else if (mapId === "alpine" || mapId === "night") {
            top = BABYLON.MeshBuilder.CreateCylinder(`${tag}_gem`, { diameterTop: 0, diameterBottom: 480, height: 780, tessellation: 5 }, scene);
            top.rotation.z = (index % 3 - 1) * 0.35;
            if (mapId === "night")
                material.emissiveColor = material.diffuseColor;
        }
        else if (mapId === "test") {
            top = BABYLON.MeshBuilder.CreateCylinder(`${tag}_cup`, { diameterTop: 580, diameterBottom: 150, height: 500, tessellation: 8 }, scene);
        }
        else {
            top = BABYLON.MeshBuilder.CreateSphere(`${tag}_balloon`, { diameter: 660, segments: 10 }, scene);
            top.scaling.set(0.83, 1.22, 0.83);
        }
        top.position.y = 980;
        top.material = material;
        top.parent = root;
        root.rotation.y = (index % 5 - 2) * 0.14;
        const scale = 0.9 + (index % 4) * 0.22;
        root.scaling.set(scale, scale, scale);
        return root;
    }
    function createBabylonKartNode(scene, colorHex, isPlayer, tag) {
        const root = new BABYLON.TransformNode(`kart_${tag}`, scene);
        const shadowMat = new BABYLON.StandardMaterial(`kartShadowMat_${tag}`, scene);
        shadowMat.disableLighting = true;
        shadowMat.diffuseColor = new BABYLON.Color3(0.02, 0.03, 0.05);
        shadowMat.emissiveColor = new BABYLON.Color3(0.02, 0.03, 0.05);
        shadowMat.alpha = 0.45;
        const shadow = BABYLON.MeshBuilder.CreateDisc(`kartShadow_${tag}`, { radius: 220, tessellation: 16 }, scene);
        shadow.material = shadowMat;
        shadow.rotation.x = Math.PI / 2;
        shadow.scaling.set(0.95, 1.35, 1);
        shadow.position.y = 4;
        shadow.parent = root;
        const bodyMat = new BABYLON.StandardMaterial(`kartBodyMat_${tag}`, scene);
        bodyMat.diffuseColor = hexToBabylonColor3(colorHex);
        bodyMat.specularColor = new BABYLON.Color3(0.55, 0.55, 0.6);
        const darkMat = new BABYLON.StandardMaterial(`kartDarkMat_${tag}`, scene);
        darkMat.diffuseColor = BABYLON.Color3.FromHexString("#0f172a");
        const glassMat = new BABYLON.StandardMaterial(`kartGlassMat_${tag}`, scene);
        glassMat.diffuseColor = BABYLON.Color3.FromHexString("#1e3a5f");
        glassMat.specularColor = new BABYLON.Color3(0.85, 0.92, 1);
        const chassis = BABYLON.MeshBuilder.CreateBox(`chassis_${tag}`, { width: 310, height: 95, depth: 520 }, scene);
        chassis.material = bodyMat;
        chassis.position.y = 78;
        chassis.parent = root;
        const nose = BABYLON.MeshBuilder.CreateBox(`nose_${tag}`, { width: 220, height: 62, depth: 160 }, scene);
        nose.material = bodyMat;
        nose.position.set(0, 62, -290);
        nose.parent = root;
        const cabin = BABYLON.MeshBuilder.CreateBox(`cabin_${tag}`, { width: 200, height: 75, depth: 220 }, scene);
        cabin.material = glassMat;
        cabin.position.set(0, 145, -10);
        cabin.parent = root;
        const helmet = BABYLON.MeshBuilder.CreateSphere(`helmet_${tag}`, { diameter: 104, segments: 12 }, scene);
        const helmetMat = new BABYLON.StandardMaterial(`helmetMat_${tag}`, scene);
        helmetMat.diffuseColor = BABYLON.Color3.FromHexString(isPlayer ? "#facc15" : "#f8fafc");
        helmet.material = helmetMat;
        helmet.position.set(0, 185, 20);
        helmet.parent = root;
        const wing = BABYLON.MeshBuilder.CreateBox(`wing_${tag}`, { width: 330, height: 22, depth: 75 }, scene);
        wing.material = darkMat;
        wing.position.set(0, 178, 225);
        wing.parent = root;
        const strutL = BABYLON.MeshBuilder.CreateBox(`strutL_${tag}`, { width: 24, height: 70, depth: 34 }, scene);
        strutL.material = darkMat;
        strutL.position.set(-95, 138, 225);
        strutL.parent = root;
        const strutR = BABYLON.MeshBuilder.CreateBox(`strutR_${tag}`, { width: 24, height: 70, depth: 34 }, scene);
        strutR.material = darkMat;
        strutR.position.set(95, 138, 225);
        strutR.parent = root;
        const tailMat = new BABYLON.StandardMaterial(`tailMat_${tag}`, scene);
        tailMat.disableLighting = true;
        tailMat.emissiveColor = BABYLON.Color3.FromHexString("#991b1b");
        const tailL = BABYLON.MeshBuilder.CreateBox(`tailL_${tag}`, { width: 75, height: 26, depth: 20 }, scene);
        tailL.material = tailMat;
        tailL.position.set(-92, 95, 262);
        tailL.parent = root;
        const tailR = BABYLON.MeshBuilder.CreateBox(`tailR_${tag}`, { width: 75, height: 26, depth: 20 }, scene);
        tailR.material = tailMat;
        tailR.position.set(92, 95, 262);
        tailR.parent = root;
        const flameMat = new BABYLON.StandardMaterial(`flameMat_${tag}`, scene);
        flameMat.disableLighting = true;
        flameMat.emissiveColor = BABYLON.Color3.FromHexString("#38bdf8");
        const flameL = BABYLON.MeshBuilder.CreateCylinder(`flameL_${tag}`, { diameterTop: 0, diameterBottom: 68, height: 150, tessellation: 8 }, scene);
        flameL.material = flameMat;
        flameL.rotation.x = Math.PI / 2;
        flameL.position.set(-66, 56, 330);
        flameL.isVisible = false;
        flameL.parent = root;
        const flameR = BABYLON.MeshBuilder.CreateCylinder(`flameR_${tag}`, { diameterTop: 0, diameterBottom: 68, height: 150, tessellation: 8 }, scene);
        flameR.material = flameMat;
        flameR.rotation.x = Math.PI / 2;
        flameR.position.set(66, 56, 330);
        flameR.isVisible = false;
        flameR.parent = root;
        const wheelMat = new BABYLON.StandardMaterial(`wheelMat_${tag}`, scene);
        wheelMat.diffuseColor = BABYLON.Color3.FromHexString("#111827");
        const wheels = [];
        const wheelCoords = [
            [-175, -165],
            [175, -165],
            [-182, 165],
            [182, 165],
        ];
        for (let wi = 0; wi < wheelCoords.length; wi += 1) {
            const [wx, wz] = wheelCoords[wi];
            const w = BABYLON.MeshBuilder.CreateCylinder(`wheel_${tag}_${wi}`, { diameter: 116, height: 46, tessellation: 12 }, scene);
            w.material = wheelMat;
            w.rotation.z = Math.PI / 2;
            w.position.set(wx, 58, wz);
            w.parent = root;
            wheels.push(w);
        }
        return { root, bodyMat, tailMat, flameMat, flameL, flameR, wheels, chassis, nose, cabin, helmet, wing, struts: [strutL, strutR], tailLights: [tailL, tailR] };
    }
    function applyModelMesh(mesh, data) {
        mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, data.positions);
        mesh.setVerticesData("normal", data.normals);
        mesh.setIndices(Array.from({ length: data.positions.length / 3 }, (_, index) => index));
    }
    function updateCarModel(rig, id, openCockpit = false) {
        if (!modelLibrary || rig.modelId === id)
            return;
        const { body, cabin, width, wing } = modelLibrary.car(id);
        applyModelMesh(rig.chassis, body);
        applyModelMesh(rig.cabin, cabin);
        rig.chassis.position.y = 0;
        rig.cabin.position.set(0, 0, 0);
        if (openCockpit) {
            rig.cabin.position.set(0, 35, -100);
            rig.cabin.scaling.set(1, 0.68, 0.48);
        }
        rig.nose.isVisible = false;
        rig.wing.isVisible = wing > 0;
        rig.wing.position.y = wing;
        rig.wing.scaling.x = width / 285;
        rig.wheels.forEach((wheel, index) => {
            wheel.position.x = (index % 2 ? 1 : -1) * (width / 2 + 26);
        });
        rig.struts.forEach((strut) => {
            strut.isVisible = wing > 0;
            strut.position.y = (wing + 112) / 2;
            strut.scaling.y = Math.max(0, wing - 112) / 70;
        });
        rig.tailLights.forEach((light, index) => {
            light.position.x = (index === 0 ? -1 : 1) * width * 0.32;
            light.position.z = id === "hyper" || id === "apex" ? 285 : 272;
            light.scaling.x = id === "hyper" || id === "prototype" ? 1.35 : id === "starter" ? 0.7 : 1;
            light.scaling.y = id === "hyper" || id === "prototype" ? 0.45 : 0.8;
        });
        rig.modelId = id;
    }
    function updateDriverModel(rig, id, scene) {
        if (!modelLibrary || rig.driverId === id)
            return;
        rig.driverModel?.dispose(false, true);
        const driver = new BABYLON.TransformNode("driver", scene);
        driver.parent = rig.root;
        driver.scaling.set(100, 100, 100);
        driver.position.set(0, 64, 40);
        for (const data of modelLibrary.driver(id)) {
            const mesh = new BABYLON.Mesh("driverPart", scene);
            applyModelMesh(mesh, data);
            const material = new BABYLON.StandardMaterial("driverPaint", scene);
            material.diffuseColor = BABYLON.Color3.FromHexString(data.color);
            mesh.material = material;
            mesh.parent = driver;
        }
        rig.helmet.isVisible = false;
        rig.driverModel = driver;
        rig.driverId = id;
    }
    function create3DCactus(scene, id) {
        const g = new BABYLON.TransformNode(`cactus_${id}`, scene);
        const mat = new BABYLON.StandardMaterial(`cactusMat_${id}`, scene);
        mat.diffuseColor = BABYLON.Color3.FromHexString("#16a34a");
        const trunk = BABYLON.MeshBuilder.CreateCylinder(`cTrunk_${id}`, { diameterTop: 140, diameterBottom: 170, height: 850, tessellation: 8 }, scene);
        trunk.material = mat;
        trunk.position.y = 425;
        trunk.parent = g;
        const armL = BABYLON.MeshBuilder.CreateCylinder(`cArmL_${id}`, { diameterTop: 96, diameterBottom: 108, height: 340, tessellation: 8 }, scene);
        armL.material = mat;
        armL.position.set(-140, 520, 0);
        armL.rotation.z = 0.55;
        armL.parent = g;
        const armR = BABYLON.MeshBuilder.CreateCylinder(`cArmR_${id}`, { diameterTop: 96, diameterBottom: 108, height: 300, tessellation: 8 }, scene);
        armR.material = mat;
        armR.position.set(140, 440, 0);
        armR.rotation.z = -0.55;
        armR.parent = g;
        return g;
    }
    function create3DPalm(scene, neon, id) {
        const g = new BABYLON.TransformNode(`palm_${neon ? "n" : "d"}_${id}`, scene);
        const trunkMat = new BABYLON.StandardMaterial(`pTrunkMat_${neon ? "n" : "d"}_${id}`, scene);
        trunkMat.diffuseColor = BABYLON.Color3.FromHexString(neon ? "#6d28d9" : "#78350f");
        const trunk = BABYLON.MeshBuilder.CreateCylinder(`pTrunk_${neon ? "n" : "d"}_${id}`, { diameterTop: 104, diameterBottom: 190, height: 1180, tessellation: 7 }, scene);
        trunk.material = trunkMat;
        trunk.position.y = 590;
        trunk.parent = g;
        const leafMat = new BABYLON.StandardMaterial(`pLeafMat_${neon ? "n" : "d"}_${id}`, scene);
        leafMat.diffuseColor = BABYLON.Color3.FromHexString(neon ? "#00f5d4" : "#16a34a");
        if (neon) {
            leafMat.emissiveColor = BABYLON.Color3.FromHexString("#06b6d4").scale(0.5);
        }
        for (let i = 0; i < 6; i += 1) {
            const frond = BABYLON.MeshBuilder.CreateBox(`pFrond_${id}_${i}`, { width: 110, height: 26, depth: 480 }, scene);
            frond.material = leafMat;
            const angle = (i / 6) * Math.PI * 2;
            frond.position.set(Math.sin(angle) * 210, 1150, Math.cos(angle) * 210);
            frond.rotation.y = angle;
            frond.rotation.x = 0.28;
            frond.parent = g;
        }
        return g;
    }
    function create3DMesa(scene, id) {
        const g = new BABYLON.TransformNode(`mesa_${id}`, scene);
        const mat = new BABYLON.StandardMaterial(`mesaMat_${id}`, scene);
        mat.diffuseColor = BABYLON.Color3.FromHexString("#b45309");
        const base = BABYLON.MeshBuilder.CreateCylinder(`mBase_${id}`, { diameterTop: 1040, diameterBottom: 1520, height: 780, tessellation: 6 }, scene);
        base.material = mat;
        base.position.y = 390;
        base.parent = g;
        const top = BABYLON.MeshBuilder.CreateCylinder(`mTop_${id}`, { diameterTop: 680, diameterBottom: 1000, height: 420, tessellation: 6 }, scene);
        top.material = mat;
        top.position.set(120, 820, 0);
        top.parent = g;
        return g;
    }
    function create3DPine(scene, id) {
        const g = new BABYLON.TransformNode(`pine_${id}`, scene);
        const trunkMat = new BABYLON.StandardMaterial(`piTrunk_${id}`, scene);
        trunkMat.diffuseColor = BABYLON.Color3.FromHexString("#451a03");
        const greenMat = new BABYLON.StandardMaterial(`piGreen_${id}`, scene);
        greenMat.diffuseColor = BABYLON.Color3.FromHexString("#14532d");
        const snowMat = new BABYLON.StandardMaterial(`piSnow_${id}`, scene);
        snowMat.diffuseColor = BABYLON.Color3.FromHexString("#f1f5f9");
        const trunk = BABYLON.MeshBuilder.CreateCylinder(`piT_${id}`, { diameterTop: 110, diameterBottom: 150, height: 320, tessellation: 6 }, scene);
        trunk.material = trunkMat;
        trunk.position.y = 160;
        trunk.parent = g;
        const c1 = BABYLON.MeshBuilder.CreateCylinder(`piC1_${id}`, { diameterTop: 0, diameterBottom: 680, height: 620, tessellation: 7 }, scene);
        c1.material = greenMat;
        c1.position.y = 560;
        c1.parent = g;
        const c2 = BABYLON.MeshBuilder.CreateCylinder(`piC2_${id}`, { diameterTop: 0, diameterBottom: 480, height: 460, tessellation: 7 }, scene);
        c2.material = snowMat;
        c2.position.y = 860;
        c2.parent = g;
        return g;
    }
    function create3DBuilding(scene, neon, id) {
        const tag = `${neon ? "n" : "u"}_${id}`;
        const g = new BABYLON.TransformNode(`bldg_${tag}`, scene);
        const bodyMat = new BABYLON.StandardMaterial(`bBodyMat_${tag}`, scene);
        bodyMat.diffuseColor = BABYLON.Color3.FromHexString(neon ? "#1e1b4b" : "#334155");
        bodyMat.specularColor = new BABYLON.Color3(0.4, 0.4, 0.5);
        const trimMat = new BABYLON.StandardMaterial(`bTrimMat_${tag}`, scene);
        trimMat.disableLighting = true;
        trimMat.emissiveColor = BABYLON.Color3.FromHexString(neon ? "#ff4fd8" : "#93c5fd");
        const midMat = new BABYLON.StandardMaterial(`bMidMat_${tag}`, scene);
        midMat.disableLighting = true;
        midMat.emissiveColor = BABYLON.Color3.FromHexString(neon ? "#00f5d4" : "#e2e8f0");
        const body = BABYLON.MeshBuilder.CreateBox(`bBody_${tag}`, { width: 920, height: 2600, depth: 920 }, scene);
        body.material = bodyMat;
        body.position.y = 1300;
        body.parent = g;
        const trim = BABYLON.MeshBuilder.CreateBox(`bTrim_${tag}`, { width: 950, height: 90, depth: 950 }, scene);
        trim.material = trimMat;
        trim.position.y = 2480;
        trim.parent = g;
        const mid = BABYLON.MeshBuilder.CreateBox(`bMid_${tag}`, { width: 940, height: 70, depth: 940 }, scene);
        mid.material = midMat;
        mid.position.y = 1520;
        mid.parent = g;
        return g;
    }
    function create3DLamp(scene, id) {
        const g = new BABYLON.TransformNode(`lamp_${id}`, scene);
        const poleMat = new BABYLON.StandardMaterial(`lPoleMat_${id}`, scene);
        poleMat.diffuseColor = BABYLON.Color3.FromHexString("#475569");
        const bulbMat = new BABYLON.StandardMaterial(`lBulbMat_${id}`, scene);
        bulbMat.disableLighting = true;
        bulbMat.emissiveColor = BABYLON.Color3.FromHexString("#fef08a");
        const pole = BABYLON.MeshBuilder.CreateCylinder(`lPole_${id}`, { diameterTop: 56, diameterBottom: 72, height: 1050, tessellation: 6 }, scene);
        pole.material = poleMat;
        pole.position.y = 525;
        pole.parent = g;
        const bulb = BABYLON.MeshBuilder.CreateSphere(`lBulb_${id}`, { diameter: 150, segments: 8 }, scene);
        bulb.material = bulbMat;
        bulb.position.set(0, 1050, 0);
        bulb.parent = g;
        return g;
    }
    function create3DBillboard(scene, id) {
        const g = new BABYLON.TransformNode(`billboard_${id}`, scene);
        const poleMat = new BABYLON.StandardMaterial(`bbPoleMat_${id}`, scene);
        poleMat.diffuseColor = BABYLON.Color3.FromHexString("#475569");
        const boardMat = new BABYLON.StandardMaterial(`bbBoardMat_${id}`, scene);
        boardMat.diffuseColor = BABYLON.Color3.FromHexString("#0f172a");
        const stripMat = new BABYLON.StandardMaterial(`bbStripMat_${id}`, scene);
        stripMat.disableLighting = true;
        stripMat.emissiveColor = BABYLON.Color3.FromHexString("#ffcf42");
        const postL = BABYLON.MeshBuilder.CreateBox(`bbPostL_${id}`, { width: 65, height: 680, depth: 65 }, scene);
        postL.material = poleMat;
        postL.position.set(-220, 340, 0);
        postL.parent = g;
        const postR = BABYLON.MeshBuilder.CreateBox(`bbPostR_${id}`, { width: 65, height: 680, depth: 65 }, scene);
        postR.material = poleMat;
        postR.position.set(220, 340, 0);
        postR.parent = g;
        const board = BABYLON.MeshBuilder.CreateBox(`bbBoard_${id}`, { width: 640, height: 320, depth: 60 }, scene);
        board.material = boardMat;
        board.position.set(0, 560, 0);
        board.parent = g;
        const stripe = BABYLON.MeshBuilder.CreateBox(`bbStripe_${id}`, { width: 600, height: 64, depth: 72 }, scene);
        stripe.material = stripMat;
        stripe.position.set(0, 560, 0);
        stripe.parent = g;
        return g;
    }
    function applyBabylonMapTheme(map) {
        if (!babylonState)
            return;
        if (babylonActiveMapId === map.id)
            return;
        babylonActiveMapId = map.id;
        babylonState.scene.fogColor = hexToBabylonColor3(map.palette.horizon, babylonState.paintColorCache);
        babylonState.scene.fogDensity = map.id === "night" ? 0.000032 : 0.000022;
        babylonState.oceanPlane.isVisible = map.skyline === "coast";
    }
    function setQuad(buf, triIndex, x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4) {
        const o = triIndex * 18;
        buf[o] = x1;
        buf[o + 1] = y1;
        buf[o + 2] = z1;
        buf[o + 3] = x2;
        buf[o + 4] = y2;
        buf[o + 5] = z2;
        buf[o + 6] = x3;
        buf[o + 7] = y3;
        buf[o + 8] = z3;
        buf[o + 9] = x1;
        buf[o + 10] = y1;
        buf[o + 11] = z1;
        buf[o + 12] = x3;
        buf[o + 13] = y3;
        buf[o + 14] = z3;
        buf[o + 15] = x4;
        buf[o + 16] = y4;
        buf[o + 17] = z4;
    }
    function setQuadColor4(buf, triIndex, r, g, b) {
        const o = triIndex * 24;
        for (let i = 0; i < 24; i += 4) {
            buf[o + i] = r;
            buf[o + i + 1] = g;
            buf[o + i + 2] = b;
            buf[o + i + 3] = 1;
        }
    }
    function renderBabylonScene(map, time) {
        if (!babylonState || segments.length === 0)
            return;
        applyBabylonMapTheme(map);
        const st = babylonState;
        const activePos = mode === "menu" ? attractPosition : player.position;
        const activeX = mode === "menu" ? Math.sin(attractPosition * 0.0005) * 0.25 : visualPlayerX;
        const baseSegment = findSegment(activePos);
        const baseIndex = baseSegment.index;
        const basePercent = percentRemaining(activePos, SEGMENT_LENGTH);
        const baseWorldY = interpolate(baseSegment.p1.world.y, baseSegment.p2.world.y, basePercent);
        // Camera dynamics (aspect-aware framing so the full kart stays visible on desktop & portrait mobile)
        const aspect = babylonCanvas ? babylonCanvas.clientWidth / Math.max(1, babylonCanvas.clientHeight) : 1.6;
        const isPortrait = aspect < 1;
        const baseFov = isPortrait ? clamp(1.04 + (1 - aspect) * 0.28, 1.04, 1.24) : 1.04;
        const boosting = player.nitroActive || player.overdriveTime > 0 || player.mushroomTime > 0 || player.miniTurboTime > 0 || player.starTime > 0;
        const targetFov = mode === "race" && boosting ? baseFov + 0.18 : baseFov;
        st.camera.fov += (targetFov - st.camera.fov) * 0.14;
        const shakeX = cameraShake > 0.1 && !save.reducedMotion && mode === "race" ? (Math.random() - 0.5) * cameraShake * 18 : 0;
        const shakeY = cameraShake > 0.1 && !save.reducedMotion && mode === "race" ? (Math.random() - 0.5) * cameraShake * 14 : 0;
        const camY = isPortrait ? 690 : 650;
        const camZ = isPortrait ? 1640 : 1520;
        const targetY = isPortrait ? 170 : 230;
        st.camera.position.set(shakeX, camY + player.airY * 0.45 + shakeY, camZ);
        const bank = save.reducedMotion ? 0 : cameraRoll * 1.4;
        st.camera.upVector.set(-Math.sin(bank), Math.cos(bank), 0);
        st.tmpTarget.set(shakeX * 0.2, targetY - cameraPitch * 650, -3200);
        st.camera.setTarget(st.tmpTarget);
        // Accumulate 3D road geometry ahead of camera (zero per-frame allocations)
        const CURVE_FACTOR = 9;
        const baseSlope = (baseSegment.p2.world.y - baseSegment.p1.world.y) / SEGMENT_LENGTH;
        let curveX = 0;
        let curveDx = baseSegment.curve * CURVE_FACTOR * (1 - basePercent);
        const segCount = DRAW_DISTANCE;
        const curveXs = st.curveXs;
        const segYs = st.segYs;
        curveXs[0] = -activeX * ROAD_WIDTH;
        segYs[0] = baseSegment.p1.world.y - baseWorldY;
        for (let n = 1; n <= segCount; n += 1) {
            const seg = segments[(baseIndex + n) % segments.length];
            curveXs[n] = curveX - activeX * ROAD_WIDTH;
            segYs[n] = seg.p1.world.y - baseWorldY;
            if (n < segCount) {
                curveX += curveDx;
                curveDx += seg.curve * CURVE_FACTOR;
            }
        }
        // Hide pools before placing active ones
        for (let i = 0; i < st.opponentKarts.length; i += 1)
            st.opponentKarts[i].root.setEnabled(false);
        for (let i = 0; i < st.itemBoxMeshes.length; i += 1)
            st.itemBoxMeshes[i].root.setEnabled(false);
        for (let i = 0; i < st.coinMeshes.length; i += 1)
            st.coinMeshes[i].isVisible = false;
        for (let i = 0; i < st.boostMeshes.length; i += 1)
            st.boostMeshes[i].isVisible = false;
        for (let i = 0; i < st.hazardMeshes.length; i += 1)
            st.hazardMeshes[i].root.setEnabled(false);
        for (let i = 0; i < st.projectileMeshes.length; i += 1)
            st.projectileMeshes[i].root.setEnabled(false);
        for (let i = 0; i < st.tunnelArches.length; i += 1)
            st.tunnelArches[i].setEnabled(false);
        for (let i = 0; i < st.bridgePillars.length; i += 1)
            st.bridgePillars[i].setEnabled(false);
        st.gantryGroup.setEnabled(false);
        const propCursors = st.propCursors;
        for (const key in propCursors)
            propCursors[key] = 0;
        let tunnelArchCursor = 0;
        let bridgePillarCursor = 0;
        for (let n = 0; n < segCount; n += 1) {
            const seg = segments[(baseIndex + n) % segments.length];
            const z1 = n === 0 ? 2200 : -(n - basePercent) * SEGMENT_LENGTH;
            const z2 = -(n + 1 - basePercent) * SEGMENT_LENGTH;
            const x1 = curveXs[n];
            const x2 = curveXs[n + 1];
            const y1 = n === 0 ? -baseSlope * 2200 : segYs[n];
            const y2 = segYs[n + 1];
            // Ground skirt (pre-parsed RGB — zero hex string parsing per frame!)
            setQuad(st.groundPos, n, x1 - 52000, y1 - 8, z1, x1 + 52000, y1 - 8, z1, x2 + 52000, y2 - 8, z2, x2 - 52000, y2 - 8, z2);
            const gr = seg.rgb.grass;
            setQuadColor4(st.groundCol, n, gr[0], gr[1], gr[2]);
            // Rumble borders
            const rw1 = ROAD_WIDTH * 1.24;
            const rw2 = ROAD_WIDTH * 1.02;
            setQuad(st.rumblePos, n * 2, x1 - rw1, y1 + 1, z1, x1 - rw2, y1 + 1, z1, x2 - rw2, y2 + 1, z2, x2 - rw1, y2 + 1, z2);
            setQuad(st.rumblePos, n * 2 + 1, x1 + rw2, y1 + 1, z1, x1 + rw1, y1 + 1, z1, x2 + rw1, y2 + 1, z2, x2 + rw2, y2 + 1, z2);
            const ru = seg.rgb.rumble;
            setQuadColor4(st.rumbleCol, n * 2, ru[0], ru[1], ru[2]);
            setQuadColor4(st.rumbleCol, n * 2 + 1, ru[0], ru[1], ru[2]);
            // Road asphalt + Finish line checkerboard tint
            setQuad(st.roadPos, n, x1 - ROAD_WIDTH, y1 + 2, z1, x1 + ROAD_WIDTH, y1 + 2, z1, x2 + ROAD_WIDTH, y2 + 2, z2, x2 - ROAD_WIDTH, y2 + 2, z2);
            const isFinish = getFinishLineSegmentOffset(seg.index) >= 0;
            if (isFinish) {
                const chk = seg.index % 2 === 0 ? 0.96 : 0.06;
                setQuadColor4(st.roadCol, n, chk, chk, chk + 0.02);
            }
            else {
                const rd = seg.rgb.road;
                setQuadColor4(st.roadCol, n, rd[0], rd[1], rd[2]);
            }
            // Lane stripes
            const showDash = Math.floor(seg.index / RUMBLE_LENGTH) % 2 === 0 && !isFinish;
            if (showDash) {
                const lxA = -ROAD_WIDTH * 0.33;
                const lxB = ROAD_WIDTH * 0.33;
                setQuad(st.lanePos, n * 2, x1 + lxA - 36, y1 + 5, z1, x1 + lxA + 36, y1 + 5, z1, x2 + lxA + 36, y2 + 5, z2, x2 + lxA - 36, y2 + 5, z2);
                setQuad(st.lanePos, n * 2 + 1, x1 + lxB - 36, y1 + 5, z1, x1 + lxB + 36, y1 + 5, z1, x2 + lxB + 36, y2 + 5, z2, x2 + lxB - 36, y2 + 5, z2);
            }
            else {
                setQuad(st.lanePos, n * 2, 0, -5000, 0, 0, -5000, 0, 0, -5000, 0, 0, -5000, 0);
                setQuad(st.lanePos, n * 2 + 1, 0, -5000, 0, 0, -5000, 0, 0, -5000, 0, 0, -5000, 0);
            }
            // Gantry start arch at segment 0
            if (seg.index === FINISH_LINE_SEGMENT && n > 1 && n < 180) {
                st.gantryGroup.setEnabled(true);
                st.gantryGroup.position.set(x1, y1, z1);
                const elapsed = COUNTDOWN_TOTAL_SECONDS - countdownRemaining;
                const litIdx = mode === "countdown" ? Math.floor(elapsed / COUNTDOWN_STEP_SECONDS) : 3;
                for (let li = 0; li < 3; li += 1) {
                    const bulbMat = st.gantryLightMats[li];
                    if (mode === "countdown") {
                        if (litIdx >= 3)
                            bulbMat.emissiveColor.set(0.13, 0.77, 0.37);
                        else if (li <= litIdx)
                            bulbMat.emissiveColor.set(0.94, 0.27, 0.27);
                        else
                            bulbMat.emissiveColor.set(0.2, 0.25, 0.33);
                    }
                    else {
                        bulbMat.emissiveColor.set(0.13, 0.77, 0.37);
                    }
                }
            }
            // Tunnel arches
            if (seg.tunnel && seg.index % 5 === 0 && tunnelArchCursor < st.tunnelArches.length) {
                const arch = st.tunnelArches[tunnelArchCursor++];
                arch.setEnabled(true);
                arch.position.set(x1, y1, z1);
                arch.rotation.y = Math.atan2(x1 - x2, z1 - z2);
            }
            // Elevated bridge viaduct support pillars when road climbs high above base terrain
            if (n >= 4 && seg.p1.world.y > 520 && seg.index % 8 === 0 && bridgePillarCursor < st.bridgePillars.length) {
                const pillar = st.bridgePillars[bridgePillarCursor++];
                pillar.setEnabled(true);
                pillar.position.set(x1, y1, z1);
                pillar.rotation.y = Math.atan2(x1 - x2, z1 - z2);
            }
            // Place 3D roadside props for this segment
            if (n < 140) {
                for (const spr of seg.sprites) {
                    let poolKey = "tower";
                    if (spr.asset.includes("cactus"))
                        poolKey = "cactus";
                    else if (spr.asset.includes("palm"))
                        poolKey = map.skyline === "coast" ? "neonPalm" : "palm";
                    else if (spr.asset.includes("rock"))
                        poolKey = "rock";
                    else if (spr.asset.includes("alpine_pine"))
                        poolKey = "pine";
                    else if (spr.asset.includes("coast_arch"))
                        poolKey = "neonPalm";
                    else if (spr.asset.includes("lamp"))
                        poolKey = "lamp";
                    else if (spr.asset.includes("billboard"))
                        poolKey = "billboard";
                    else if (spr.asset.includes("neon"))
                        poolKey = "neonTower";
                    else if (spr.asset.includes("tree"))
                        poolKey = map.skyline === "alpine" ? "pine" : "palm";
                    if (seg.index % 3 !== 0)
                        poolKey = map.id;
                    const list = st.propPool[poolKey];
                    const cursor = propCursors[poolKey] ?? 0;
                    if (list && cursor < list.length) {
                        const obj = list[cursor];
                        propCursors[poolKey] = cursor + 1;
                        if (!obj.isEnabled())
                            obj.setEnabled(true);
                        obj.position.set(x1 + spr.offset * ROAD_WIDTH * 0.92, y1, z1);
                    }
                }
            }
        }
        for (const key in st.propPool) {
            const list = st.propPool[key];
            // Active props fill each pool from the start.
            for (let i = propCursors[key]; i < list.length && list[i].isEnabled(); i += 1) {
                list[i].setEnabled(false);
            }
        }
        st.roadMesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, st.roadPos);
        st.roadMesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, st.roadCol);
        st.rumbleMesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, st.rumblePos);
        st.rumbleMesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, st.rumbleCol);
        st.laneMesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, st.lanePos);
        st.groundMesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, st.groundPos);
        st.groundMesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, st.groundCol);
        // Helper to convert track (position, offset) -> 3D (x, y, z)
        const trackTo3D = (pos, offset) => {
            const dist = positiveModulo(pos - activePos, trackLength);
            if (dist > (segCount - 2) * SEGMENT_LENGTH)
                return null;
            const fSeg = dist / SEGMENT_LENGTH + basePercent;
            const idx = Math.floor(fSeg);
            const frac = fSeg - idx;
            if (idx < 0 || idx >= segCount)
                return null;
            const x = interpolate(curveXs[idx], curveXs[idx + 1], frac) + offset * ROAD_WIDTH;
            const y = interpolate(segYs[idx], segYs[idx + 1], frac);
            const z = -dist;
            return { x, y, z };
        };
        // Position Player 3D Kart
        if (mode !== "menu") {
            st.playerKart.root.setEnabled(true);
            updateCarModel(st.playerKart, player.carId, true);
            updateDriverModel(st.playerKart, save.driver, st.scene);
            const paint = getPlayerPaint();
            const baseColor = paint.color || getPlayerCar().color;
            if (player.starTime > 0) {
                setColor3FromHsl(st.tmpCol2, (time * 2.5) % 1, 0.95, 0.58);
                st.playerKart.bodyMat.diffuseColor.copyFrom(st.tmpCol2);
            }
            else {
                st.playerKart.bodyMat.diffuseColor.copyFrom(hexToBabylonColor3(baseColor, st.paintColorCache));
            }
            const kartScale = player.starTime > 0 ? 1.12 : 1;
            st.playerKart.root.scaling.set(kartScale, kartScale, kartScale);
            const spinRot = player.spinTime > 0 ? player.spinTime * 14 : 0;
            const driftYaw = player.drifting ? -player.driftDir * 0.28 : -player.steerInput * 0.14;
            const airPitch = player.airY > 0 ? clamp(player.airVy * 0.0007, -0.25, 0.28) : clamp(-cameraPitch * 0.65, -0.22, 0.22);
            st.playerKart.root.position.set(0, player.airY, 0);
            st.playerKart.root.rotation.set(airPitch, driftYaw + spinRot, -player.steerInput * 0.08);
            if (st.playerKart.wheels.length >= 2) {
                st.playerKart.wheels[0].rotation.y = -player.steerInput * 0.35;
                st.playerKart.wheels[1].rotation.y = -player.steerInput * 0.35;
            }
            // Brake tail lights & exhaust flames
            const braking = keys.has("arrowdown") || keys.has("s") || gamepadBrake;
            if (braking)
                st.playerKart.tailMat.emissiveColor.set(1, 0.22, 0.22);
            else
                st.playerKart.tailMat.emissiveColor.set(0.45, 0.06, 0.06);
            st.playerKart.flameL.isVisible = boosting;
            st.playerKart.flameR.isVisible = boosting;
            if (boosting) {
                if (player.starTime > 0)
                    st.playerKart.flameMat.emissiveColor.set(0.98, 0.8, 0.08);
                else if (player.overdriveTime > 0)
                    st.playerKart.flameMat.emissiveColor.set(0.75, 0.52, 0.99);
                else
                    st.playerKart.flameMat.emissiveColor.set(0.22, 0.74, 0.97);
            }
            st.playerShieldSphere.isVisible = player.shieldTime > 0;
            st.playerShieldSphere.rotation.y = time * 3;
        }
        else {
            st.playerKart.root.setEnabled(false);
        }
        // Position 3D Opponent Karts
        if (mode !== "menu") {
            let kIdx = 0;
            for (const opp of opponents) {
                if (opp.eliminated || kIdx >= st.opponentKarts.length)
                    continue;
                const p3 = trackTo3D(opp.position, opp.offset);
                if (!p3 || p3.z > -40)
                    continue;
                const k = st.opponentKarts[kIdx++];
                updateCarModel(k, opp.carId);
                k.root.setEnabled(true);
                k.bodyMat.diffuseColor.copyFrom(hexToBabylonColor3(opp.paintColor, st.paintColorCache));
                const sc = opp.shrunkTime > 0 ? 0.56 : 1;
                k.root.scaling.set(sc, sc, sc);
                k.root.position.set(p3.x, p3.y, p3.z);
                k.root.rotation.y = opp.spinTime > 0 ? opp.spinTime * 14 : -opp.turnSignal * 0.15;
                k.flameL.isVisible = opp.nitroActive;
                k.flameR.isVisible = opp.nitroActive;
            }
        }
        // Position 3D ★ Energy Crates
        let ibIdx = 0;
        for (const box of itemBoxes) {
            if (raceTime < box.respawnAt || ibIdx >= st.itemBoxMeshes.length)
                continue;
            const p3 = trackTo3D(box.position, box.offset);
            if (!p3)
                continue;
            const m = st.itemBoxMeshes[ibIdx++];
            m.root.setEnabled(true);
            m.root.position.set(p3.x, p3.y + 150 + Math.sin(time * 4 + box.seed) * 35, p3.z);
            m.root.rotation.set(time * 1.4, time * 2.1 + box.seed, 0.5);
            setColor3FromHsl(st.tmpCol, (time * 0.5 + box.seed * 0.1) % 1, 0.85, 0.58);
            m.cageMat.emissiveColor.copyFrom(st.tmpCol);
        }
        // Position 3D Coins
        let cIdx = 0;
        for (const coin of roadCoins) {
            if (raceTime < coin.respawnAt || cIdx >= st.coinMeshes.length)
                continue;
            const p3 = trackTo3D(coin.position, coin.offset);
            if (!p3)
                continue;
            const m = st.coinMeshes[cIdx++];
            m.isVisible = true;
            m.position.set(p3.x, p3.y + 125 + Math.sin(time * 5 + coin.seed) * 24, p3.z);
            m.rotation.z = time * 4 + coin.seed;
        }
        // Position 3D Boost Pads
        let bIdx = 0;
        for (const pad of boostPads) {
            if (bIdx >= st.boostMeshes.length)
                continue;
            const p3 = trackTo3D(pad.position, pad.offset);
            if (!p3)
                continue;
            const m = st.boostMeshes[bIdx++];
            m.isVisible = true;
            m.position.set(p3.x, p3.y + 18, p3.z);
        }
        // Position 3D Hazards
        let hIdx = 0;
        for (const hz of hazards) {
            if (hIdx >= st.hazardMeshes.length)
                continue;
            const p3 = trackTo3D(hz.position, hz.offset);
            if (!p3)
                continue;
            const g = st.hazardMeshes[hIdx++];
            g.root.setEnabled(true);
            g.root.position.set(p3.x, p3.y + 10, p3.z);
            g.slick.isVisible = true;
            g.cone.isVisible = false;
            if (hz.kind === "oil")
                g.slickMat.diffuseColor.set(0.06, 0.09, 0.16);
            else if (hz.kind === "water")
                g.slickMat.diffuseColor.set(0.22, 0.74, 0.97);
            else
                g.slickMat.diffuseColor.set(0.85, 0.47, 0.02);
        }
        // Position 3D Projectiles (Missiles, Twisters, Plasma Quakes)
        let sIdx = 0;
        for (const sh of shells) {
            if (sIdx >= st.projectileMeshes.length)
                continue;
            const p3 = trackTo3D(sh.position, sh.offset);
            if (!p3)
                continue;
            const g = st.projectileMeshes[sIdx++];
            g.root.setEnabled(true);
            g.root.position.set(p3.x, p3.y + 115, p3.z);
            g.root.rotation.y = sh.kind === "twister" ? time * 18 : 0;
            const ps = sh.kind === "quake" ? 1.8 : 1;
            g.root.scaling.set(ps, ps, ps);
            g.core.isVisible = sh.kind !== "quake";
            if (sh.kind === "missile")
                g.coreMat.emissiveColor.set(0.94, 0.27, 0.27);
            else
                g.coreMat.emissiveColor.set(0.22, 0.74, 0.97);
            if (sh.kind === "quake")
                g.ringMat.emissiveColor.set(0.66, 0.33, 0.97);
            else if (sh.kind === "twister")
                g.ringMat.emissiveColor.set(0, 0.96, 0.83);
            else
                g.ringMat.emissiveColor.set(0.99, 0.88, 0.28);
        }
        st.scene.render();
    }
    function requireElement(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            throw new Error(`Missing required element: ${selector}`);
        }
        return element;
    }
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    function interpolate(a, b, percent) {
        return a + (b - a) * percent;
    }
    function easeIn(a, b, percent) {
        return a + (b - a) * percent * percent;
    }
    function easeOut(a, b, percent) {
        return a + (b - a) * (1 - (1 - percent) * (1 - percent));
    }
    function easeInOut(a, b, percent) {
        return a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5);
    }
    function percentRemaining(value, total) {
        return (value % total) / total;
    }
    function positiveModulo(value, total) {
        return ((value % total) + total) % total;
    }
    function shortestTrackDistance(a, b) {
        const raw = Math.abs(a - b);
        return Math.min(raw, trackLength - raw);
    }
    function createSessionChallenge() {
        const pool = [
            { id: "ch_ov", desc: "Score 5 Overtakes in 1 race", target: 5, reward: 220, kind: "overtakes" },
            { id: "ch_nm", desc: "Pull 3 Close Calls in 1 race", target: 3, reward: 240, kind: "nearmiss" },
            { id: "ch_pod", desc: "Finish Top 2 in any race", target: 2, reward: 250, kind: "podium" },
            { id: "ch_spd", desc: "Hit 220 KM/H in a race", target: 220, reward: 200, kind: "topspeed" },
        ];
        const picked = pool[Math.floor(Math.random() * pool.length) % pool.length];
        return { ...picked, completed: false };
    }
    function getCarUpgrades(id) {
        const u = save.carUpgrades[id];
        return {
            engine: clamp(u?.engine ?? 0, 0, 3),
            nitro: clamp(u?.nitro ?? 0, 0, 3),
            tires: clamp(u?.tires ?? 0, 0, 3),
        };
    }
    function getEffectiveCarStats(id) {
        const base = getCarConfig(id);
        const up = getCarUpgrades(id);
        return {
            ...base,
            maxSpeed: base.maxSpeed * (1 + up.engine * 0.045),
            displayTopSpeed: Math.round(base.displayTopSpeed * (1 + up.engine * 0.045)),
            accel: base.accel * (1 + up.engine * 0.06),
            grip: base.grip * (1 + up.tires * 0.06),
            nitro: base.nitro * (1 + up.nitro * 0.07),
        };
    }
    function getPlayerPaint() {
        const paintId = save.carPaints[player.carId] ?? "stock";
        return PAINT_OPTIONS.find((p) => p.id === paintId) ?? PAINT_OPTIONS[0];
    }
    function getDifficultySettings() {
        if (save.difficulty === "rookie")
            return { aiScale: 0.88, rewardMult: 1, label: "Rookie" };
        if (save.difficulty === "ace")
            return { aiScale: 1.09, rewardMult: 1.5, label: "Ace" };
        return { aiScale: 1, rewardMult: 1.25, label: "Pro" };
    }
    function formatSpeedValue(kmh) {
        return save.speedUnit === "mph" ? Math.round(kmh * 0.621371) : Math.round(kmh);
    }
    function getCoinSpeedBonus() {
        return 1 + Math.min(10, player.raceCoins) * 0.01;
    }
    function getPlayerMaxSpeed() {
        const car = getEffectiveCarStats(player.carId);
        const nitroTopSpeed = 1 + (NITRO_TOP_SPEED - 1) * car.nitro;
        const overdriveBonus = player.overdriveTime > 0 ? 1.3 : 1;
        const starBonus = player.starTime > 0 ? 1.28 : 1;
        const shroomBonus = player.mushroomTime > 0 ? 1.24 : player.miniTurboTime > 0 ? 1.08 : 1;
        const slipstreamBonus = 1 + player.slipstream * 0.12;
        const boostMult = Math.max(player.nitroActive ? nitroTopSpeed : 1, overdriveBonus, starBonus, shroomBonus);
        return maxSpeed * boostMult * slipstreamBonus * getCoinSpeedBonus();
    }
    function getPlayerDisplayTopSpeed() {
        const car = getEffectiveCarStats(player.carId);
        const nitroTopSpeed = 1 + (NITRO_TOP_SPEED - 1) * car.nitro;
        const overdriveBonus = player.overdriveTime > 0 ? 1.3 : 1;
        const starBonus = player.starTime > 0 ? 1.28 : 1;
        const shroomBonus = player.mushroomTime > 0 ? 1.24 : player.miniTurboTime > 0 ? 1.08 : 1;
        const slipstreamBonus = 1 + player.slipstream * 0.12;
        const boostMult = Math.max(player.nitroActive ? nitroTopSpeed : 1, overdriveBonus, starBonus, shroomBonus);
        return car.displayTopSpeed * boostMult * slipstreamBonus * getCoinSpeedBonus();
    }
    function isBuildingAsset(asset) {
        return asset.substring(asset.lastIndexOf("/") + 1).startsWith("building_");
    }
    function getCarConfig(id) {
        return CARS[id] ?? CARS.starter;
    }
    function getEquippedCar() {
        return getEffectiveCarStats(save.equippedCar);
    }
    function getPlayerCar() {
        return getEffectiveCarStats(player.carId);
    }
    function getCarRank(id) {
        return CAR_ORDER.indexOf(id);
    }
    function isLocalhost() {
        return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    }
    function shouldShowDebugMode() {
        return isLocalhost() && save.debugMode;
    }
    function shouldUseUnlimitedNitro() {
        return shouldShowDebugMode() && save.unlimitedNitro;
    }
    // ---- Web Audio Procedural SFX Engine ----
    function ensureAudioContext() {
        if (!save.sound || getSfxVolume() <= 0) {
            return null;
        }
        if (!audioCtx) {
            const Ctor = window.AudioContext || window.webkitAudioContext;
            if (!Ctor)
                return null;
            try {
                audioCtx = new Ctor();
            }
            catch {
                return null;
            }
        }
        if (audioCtx.state === "suspended") {
            void audioCtx.resume().catch(() => undefined);
        }
        return audioCtx;
    }
    function getSfxVolume() {
        return clamp(save.sfxVolume, 0, 1);
    }
    function playTone(freq, endFreq, duration, type = "sine", gainPeak = 0.18, delay = 0) {
        const ac = ensureAudioContext();
        if (!ac)
            return;
        const vol = gainPeak * getSfxVolume();
        if (vol <= 0.002)
            return;
        const t = ac.currentTime + delay;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(40, freq), t);
        if (endFreq !== freq) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t + duration);
        }
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, duration * 0.2));
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t);
        osc.stop(t + duration + 0.02);
    }
    function playNoiseBurst(duration, filterFreq, q, gainPeak) {
        const ac = ensureAudioContext();
        if (!ac)
            return;
        const vol = gainPeak * getSfxVolume();
        if (vol <= 0.002)
            return;
        const sampleCount = Math.max(1, Math.floor(ac.sampleRate * duration));
        const buffer = ac.createBuffer(1, sampleCount, ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < sampleCount; i += 1) {
            data[i] = Math.random() * 2 - 1;
        }
        const src = ac.createBufferSource();
        src.buffer = buffer;
        const filter = ac.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = filterFreq;
        filter.Q.value = q;
        const gain = ac.createGain();
        const t = ac.currentTime;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(ac.destination);
        src.start(t);
        src.stop(t + duration + 0.02);
    }
    function playCountdownBeep(isGo) {
        if (isGo) {
            playTone(880, 1174, 0.3, "triangle", 0.25);
        }
        else {
            playTone(440, 440, 0.14, "triangle", 0.18);
        }
    }
    function playHopSfx() {
        playTone(260, 480, 0.09, "sine", 0.14);
    }
    function playRouletteTick(pitch = 1) {
        playTone(620 * pitch, 720 * pitch, 0.045, "square", 0.09);
    }
    function playItemLockSfx() {
        playTone(784, 1046, 0.1, "triangle", 0.16);
        playTone(1046, 1318, 0.14, "triangle", 0.16, 0.07);
    }
    function playShellFireSfx() {
        playTone(540, 220, 0.14, "sawtooth", 0.16);
    }
    function playBananaSlipSfx() {
        playTone(900, 320, 0.28, "sine", 0.18);
    }
    function playLightningSfx() {
        playNoiseBurst(0.35, 1600, 0.8, 0.28);
        playTone(1100, 180, 0.3, "sawtooth", 0.22);
    }
    function playNitroIgnition() {
        playNoiseBurst(0.28, 950, 1.4, 0.2);
        playTone(180, 520, 0.22, "sawtooth", 0.11);
    }
    function playCollisionSfx(intensity, shielded) {
        if (shielded) {
            playTone(620, 1080, 0.18, "triangle", 0.2);
            return;
        }
        const clamped = clamp(intensity, 0.3, 1.2);
        playNoiseBurst(0.22, 320, 0.9, 0.24 * clamped);
        playTone(130 * clamped, 48, 0.2, "sawtooth", 0.22 * clamped);
    }
    function playPickupSfx(kind) {
        if (kind === "nitro" || kind === "overdrive") {
            playTone(523, 784, 0.12, "triangle", 0.16);
            playTone(784, 1046, 0.14, "triangle", 0.16, 0.07);
        }
        else if (kind === "shield" || kind === "magnet") {
            playTone(440, 660, 0.14, "sine", 0.18);
            playTone(660, 880, 0.16, "sine", 0.16, 0.08);
        }
        else {
            playTone(330, 660, 0.1, "square", 0.12);
            playTone(660, 990, 0.15, "square", 0.12, 0.06);
        }
    }
    function playCoinSfx() {
        playTone(987, 1318, 0.09, "sine", 0.15);
    }
    function playOvertakeWhoosh(combo) {
        const pitch = 1 + Math.min(combo, 6) * 0.08;
        playNoiseBurst(0.14, 1400 * pitch, 2.2, 0.14);
        playTone(460 * pitch, 640 * pitch, 0.09, "sine", 0.09);
    }
    function playAirstrikeExplosion() {
        playNoiseBurst(0.42, 180, 0.7, 0.3);
        playTone(110, 36, 0.38, "sawtooth", 0.26);
    }
    function playLapFanfare(isFinal) {
        const notes = isFinal ? [523, 659, 784, 1046, 1318] : [440, 554, 659];
        notes.forEach((n, idx) => playTone(n, n, 0.14, "triangle", 0.16, idx * 0.07));
    }
    function playFinishFanfare(place) {
        const notes = place === 1 ? [523, 659, 784, 1046, 1318] : [392, 494, 587, 784];
        notes.forEach((n, idx) => playTone(n, n, 0.18, "triangle", 0.18, idx * 0.08));
    }
    function updateTireScreech(intensity) {
        if (!save.sound || mode !== "race" || getSfxVolume() <= 0 || intensity <= 0.08) {
            if (screechGain && audioCtx) {
                screechGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
            }
            return;
        }
        const ac = ensureAudioContext();
        if (!ac)
            return;
        if (!screechGain || !screechFilter) {
            const len = ac.sampleRate;
            const buf = ac.createBuffer(1, len, ac.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < len; i += 1)
                d[i] = Math.random() * 2 - 1;
            const src = ac.createBufferSource();
            src.buffer = buf;
            src.loop = true;
            screechFilter = ac.createBiquadFilter();
            screechFilter.type = "bandpass";
            screechFilter.frequency.value = 1850;
            screechFilter.Q.value = 5.5;
            screechGain = ac.createGain();
            screechGain.gain.value = 0;
            src.connect(screechFilter);
            screechFilter.connect(screechGain);
            screechGain.connect(ac.destination);
            src.start();
        }
        screechFilter.frequency.setTargetAtTime(1600 + intensity * 650, ac.currentTime, 0.04);
        screechGain.gain.setTargetAtTime(clamp(intensity, 0, 1) * 0.075 * getSfxVolume(), ac.currentTime, 0.04);
    }
    function createUiButtonClickSoundPool() {
        return Array.from({ length: UI_BUTTON_CLICK_POOL_SIZE }, () => {
            const sound = new Audio(UI_BUTTON_CLICK_ASSET);
            sound.preload = "auto";
            sound.volume = UI_BUTTON_CLICK_VOLUME;
            return sound;
        });
    }
    function createMapBgmTracks() {
        return Object.fromEntries(Object.entries(MAP_BGM_ASSETS).map(([mapId, source]) => {
            const music = new Audio(source);
            music.loop = true;
            music.preload = "auto";
            music.volume = DEFAULT_BGM_VOLUME;
            return [mapId, music];
        }));
    }
    function createCalmBgmTrack() {
        const music = new Audio(CALM_BGM_ASSET);
        music.loop = false;
        music.preload = "auto";
        music.volume = DEFAULT_BGM_VOLUME;
        music.addEventListener("ended", () => {
            try {
                music.currentTime = CALM_BGM_START;
            }
            catch {
                // Ignore seek errors until metadata loads.
            }
            if (save.sound && getBgmVolume() > 0 && mode !== "race" && mode !== "countdown") {
                void music.play().catch(() => undefined);
            }
        });
        return music;
    }
    function createEngineSound() {
        const sound = new Audio(ENGINE_SOUND_ASSET);
        sound.loop = false;
        sound.preload = "auto";
        sound.volume = 0;
        const pitchControls = sound;
        pitchControls.preservesPitch = false;
        pitchControls.mozPreservesPitch = false;
        pitchControls.webkitPreservesPitch = false;
        return sound;
    }
    function getBgmVolume() {
        return clamp(save.bgmVolume, 0, 1);
    }
    function getCarSoundVolume() {
        return clamp(save.carSoundVolume, 0, 1);
    }
    function applyMapBgmVolume() {
        const volume = save.sound ? getBgmVolume() : 0;
        for (const track of Object.values(mapBgmTracks)) {
            if (track) {
                track.volume = volume;
            }
        }
        calmBgmTrack.volume = volume;
    }
    function preloadUiButtonClickSounds() {
        for (const sound of uiButtonClickSounds) {
            sound.load();
        }
    }
    function playUiButtonClick() {
        if (!save.sound) {
            return;
        }
        const sound = uiButtonClickSounds[uiButtonClickSoundIndex];
        uiButtonClickSoundIndex = (uiButtonClickSoundIndex + 1) % uiButtonClickSounds.length;
        sound.pause();
        try {
            sound.currentTime = 0;
        }
        catch {
            // Ignore seek errors.
        }
        void sound.play().catch(() => undefined);
    }
    function syncEngineLoopPosition() {
        if (engineSound.currentTime >= ENGINE_LOOP_START && engineSound.currentTime < ENGINE_LOOP_END) {
            return;
        }
        try {
            engineSound.currentTime = ENGINE_LOOP_START;
        }
        catch {
            // Ignore seek errors.
        }
    }
    function playEngineLoop() {
        syncEngineLoopPosition();
        if (engineSound.paused) {
            void engineSound.play().catch(() => undefined);
        }
    }
    function warmRaceAudio() {
        if (!save.sound || getCarSoundVolume() <= 0) {
            return;
        }
        engineVolume = 0;
        engineRate = ENGINE_IDLE_RATE;
        engineSound.volume = 0;
        engineSound.playbackRate = engineRate;
        playEngineLoop();
    }
    function updateEngineSound(dt) {
        if (mode === "countdown") {
            engineVolume = 0;
            engineRate = ENGINE_IDLE_RATE;
            engineSound.volume = 0;
            engineSound.playbackRate = engineRate;
            if (save.sound && getCarSoundVolume() > 0) {
                playEngineLoop();
            }
            return;
        }
        if (!save.sound || mode !== "race") {
            engineVolume += (0 - engineVolume) * Math.min(1, dt * ENGINE_VOLUME_SMOOTHING);
            engineSound.volume = engineVolume;
            if (engineVolume <= 0.002) {
                engineSound.pause();
                engineVolume = 0;
                engineRate = ENGINE_IDLE_RATE;
                engineSound.playbackRate = engineRate;
            }
            return;
        }
        const engineVolumeScale = getCarSoundVolume();
        if (engineVolumeScale <= 0) {
            engineVolume = 0;
            engineSound.volume = 0;
            engineSound.pause();
            return;
        }
        playEngineLoop();
        const speedRatio = clamp(player.speed / Math.max(1, getPlayerMaxSpeed()), 0, 1);
        const targetVolume = speedRatio < 0.03
            ? ENGINE_IDLE_VOLUME
            : interpolate(ENGINE_IDLE_VOLUME, ENGINE_MAX_VOLUME, speedRatio);
        const targetRate = interpolate(ENGINE_IDLE_RATE, player.nitroActive || player.overdriveTime > 0 || player.starTime > 0 ? ENGINE_NITRO_RATE : ENGINE_MAX_RATE, clamp(0.35 * speedRatio + 0.65 * player.rpm, 0, 1));
        engineVolume += ((targetVolume * engineVolumeScale) - engineVolume) * Math.min(1, dt * ENGINE_VOLUME_SMOOTHING);
        engineRate += (targetRate - engineRate) * Math.min(1, dt * ENGINE_RATE_SMOOTHING);
        engineSound.volume = engineVolume;
        engineSound.playbackRate = engineRate;
    }
    function syncMapBgm(restart = false) {
        const activeTrack = mode === "race" || mode === "countdown" ? mapBgmTracks[selectedMapId] : calmBgmTrack;
        applyMapBgmVolume();
        for (const track of Object.values(mapBgmTracks)) {
            if (track !== activeTrack) {
                track?.pause();
            }
        }
        if (activeTrack !== calmBgmTrack) {
            calmBgmTrack.pause();
        }
        const shouldPlay = save.sound && getBgmVolume() > 0 && activeTrack;
        if (!shouldPlay || !activeTrack) {
            activeTrack?.pause();
            return;
        }
        if (restart) {
            try {
                activeTrack.currentTime = activeTrack === calmBgmTrack ? CALM_BGM_START : 0;
            }
            catch {
                // Ignore seek errors.
            }
        }
        else if (activeTrack === calmBgmTrack && activeTrack.currentTime < CALM_BGM_START) {
            try {
                activeTrack.currentTime = CALM_BGM_START;
            }
            catch {
                // Ignore seek errors.
            }
        }
        void activeTrack.play().catch(() => undefined);
    }
    function shouldPlayUiButtonClick(event) {
        if (!(event.target instanceof Element)) {
            return false;
        }
        const target = event.target.closest(UI_BUTTON_CLICK_SELECTOR);
        if (!(target instanceof HTMLElement)) {
            return false;
        }
        if (target.closest(GAME_BUTTON_SELECTOR)) {
            return false;
        }
        if (target instanceof HTMLButtonElement && target.disabled) {
            return false;
        }
        return target.getAttribute("aria-disabled") !== "true";
    }
    function bindUiButtonSounds() {
        preloadUiButtonClickSounds();
        document.addEventListener("click", (event) => {
            if (shouldPlayUiButtonClick(event)) {
                playUiButtonClick();
            }
        }, { capture: true });
    }
    // ---- Save & Progression ----
    function createDefaultSave() {
        return {
            coins: 0,
            ownedCars: ["starter"],
            equippedCar: "starter",
            driver: "human-warrior",
            carPaints: {},
            carUpgrades: {},
            fullScreen: false,
            hideUiButtons: false,
            autoAccelerate: true,
            sound: true,
            bgmVolume: DEFAULT_BGM_VOLUME,
            carSoundVolume: DEFAULT_CAR_SOUND_VOLUME,
            sfxVolume: DEFAULT_SFX_VOLUME,
            speedUnit: "kmh",
            difficulty: "pro",
            raceMode: "race",
            motionBlur: !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
            reducedMotion: Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches),
            highContrastHud: false,
            compactHud: false,
            debugMode: false,
            unlimitedNitro: false,
            bestPlaces: {},
            bestLapTimes: {},
            bestRaceTimes: {},
            bestEndlessScore: 0,
            career: {
                racesCompleted: 0,
                racesWon: 0,
                totalOvertakes: 0,
                totalNearMisses: 0,
                totalCoinsEarned: 0,
                totalDistanceKm: 0,
                bestCombo: 0,
                topSpeedRecorded: 0,
            },
            achievements: [],
        };
    }
    function loadSave() {
        const fallback = createDefaultSave();
        try {
            const raw = window.localStorage.getItem("pseudo3d-racer-save");
            if (!raw) {
                return fallback;
            }
            const parsed = JSON.parse(raw);
            const ownedCars = Array.isArray(parsed.ownedCars)
                ? parsed.ownedCars.filter((id) => CAR_ORDER.includes(id))
                : fallback.ownedCars;
            if (!ownedCars.includes("starter")) {
                ownedCars.unshift("starter");
            }
            const equippedCar = parsed.equippedCar && ownedCars.includes(parsed.equippedCar)
                ? parsed.equippedCar
                : "starter";
            const difficulty = parsed.difficulty === "rookie" || parsed.difficulty === "pro" || parsed.difficulty === "ace"
                ? parsed.difficulty
                : fallback.difficulty;
            const raceMode = parsed.raceMode === "race" || parsed.raceMode === "timetrial" || parsed.raceMode === "knockout" || parsed.raceMode === "endless"
                ? parsed.raceMode
                : fallback.raceMode;
            return {
                coins: Math.max(0, Math.floor(Number(parsed.coins) || 0)),
                ownedCars,
                equippedCar,
                driver: parsed.driver && DRIVER_IDS.includes(parsed.driver) ? parsed.driver : fallback.driver,
                carPaints: parsed.carPaints && typeof parsed.carPaints === "object" ? parsed.carPaints : {},
                carUpgrades: parsed.carUpgrades && typeof parsed.carUpgrades === "object" ? parsed.carUpgrades : {},
                fullScreen: parsed.fullScreen === true,
                hideUiButtons: parsed.hideUiButtons === true,
                autoAccelerate: parsed.autoAccelerate !== false,
                sound: parsed.sound !== false,
                bgmVolume: typeof parsed.bgmVolume === "number" ? clamp(parsed.bgmVolume, 0, 1) : DEFAULT_BGM_VOLUME,
                carSoundVolume: typeof parsed.carSoundVolume === "number" ? clamp(parsed.carSoundVolume, 0, 1) : DEFAULT_CAR_SOUND_VOLUME,
                sfxVolume: typeof parsed.sfxVolume === "number" ? clamp(parsed.sfxVolume, 0, 1) : DEFAULT_SFX_VOLUME,
                speedUnit: parsed.speedUnit === "mph" ? "mph" : "kmh",
                difficulty,
                raceMode,
                motionBlur: parsed.motionBlur !== false,
                reducedMotion: parsed.reducedMotion === true,
                highContrastHud: parsed.highContrastHud === true,
                compactHud: parsed.compactHud === true,
                debugMode: parsed.debugMode === true,
                unlimitedNitro: parsed.unlimitedNitro === true,
                bestPlaces: parsed.bestPlaces ?? {},
                bestLapTimes: parsed.bestLapTimes ?? {},
                bestRaceTimes: parsed.bestRaceTimes ?? {},
                bestEndlessScore: Math.max(0, Math.floor(Number(parsed.bestEndlessScore) || 0)),
                career: {
                    racesCompleted: Math.max(0, Number(parsed.career?.racesCompleted) || 0),
                    racesWon: Math.max(0, Number(parsed.career?.racesWon) || 0),
                    totalOvertakes: Math.max(0, Number(parsed.career?.totalOvertakes) || 0),
                    totalNearMisses: Math.max(0, Number(parsed.career?.totalNearMisses) || 0),
                    totalCoinsEarned: Math.max(0, Number(parsed.career?.totalCoinsEarned) || 0),
                    totalDistanceKm: Math.max(0, Number(parsed.career?.totalDistanceKm) || 0),
                    bestCombo: Math.max(0, Number(parsed.career?.bestCombo) || 0),
                    topSpeedRecorded: Math.max(0, Number(parsed.career?.topSpeedRecorded) || 0),
                },
                achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
            };
        }
        catch {
            return fallback;
        }
    }
    function saveProgress() {
        try {
            window.localStorage.setItem("pseudo3d-racer-save", JSON.stringify(save));
        }
        catch {
            // Ignore storage quota errors in private browsing.
        }
    }
    function createRandom(seed) {
        let state = seed >>> 0;
        return () => {
            state = (state * 1664525 + 1013904223) >>> 0;
            return state / 4294967296;
        };
    }
    function getMapConfig(id) {
        const map = MAPS.find((candidate) => candidate.id === id);
        if (!map) {
            throw new Error(`Unknown map: ${id}`);
        }
        return map;
    }
    function getRaceLaps() {
        if (save.raceMode === "endless") {
            return 99;
        }
        if (save.raceMode === "timetrial") {
            return 3;
        }
        return getMapConfig(selectedMapId).laps;
    }
    function getSegmentColor(index, palette, tunnel) {
        const alternate = Math.floor(index / RUMBLE_LENGTH) % 2 === 0;
        if (tunnel) {
            return {
                grass: alternate ? palette.grass1 : palette.grass2,
                rumble: alternate ? "#ffcf42" : "#334155",
                road: alternate ? "#1a1f29" : "#151922",
                lane: alternate ? "#94a3b8" : "#64748b",
            };
        }
        return {
            grass: alternate ? palette.grass1 : palette.grass2,
            rumble: alternate ? palette.rumble1 : palette.rumble2,
            road: alternate ? palette.road1 : palette.road2,
            lane: alternate ? palette.lane1 : palette.lane2,
        };
    }
    function blankPoint(x, y, z) {
        return {
            world: { x, y, z },
            camera: { x: 0, y: 0, z: 0 },
            screen: { x: 0, y: 0, w: 0, scale: 0 },
        };
    }
    function hexToRgbTuple(hex) {
        const clean = hex.replace("#", "");
        const num = Number.parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16) || 0;
        return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
    }
    function buildSegmentRgb(color) {
        return {
            grass: hexToRgbTuple(color.grass),
            rumble: hexToRgbTuple(color.rumble),
            road: hexToRgbTuple(color.road),
        };
    }
    function buildTrack(map, direction) {
        const output = [];
        let lastY = 0;
        function addSegment(curve, y, tunnel) {
            const index = output.length;
            const color = getSegmentColor(index, map.palette, tunnel);
            output.push({
                index,
                p1: blankPoint(0, lastY, index * SEGMENT_LENGTH),
                p2: blankPoint(0, y, (index + 1) * SEGMENT_LENGTH),
                curve,
                tunnel,
                sprites: [],
                color,
                rgb: buildSegmentRgb(color),
                clip: renderHeight,
            });
            lastY = y;
        }
        function addRoad(section) {
            const total = section.enter + section.hold + section.leave;
            const startY = lastY;
            const endY = startY + section.hill;
            for (let n = 0; n < total; n += 1) {
                const yPercent = total <= 1 ? 1 : n / (total - 1);
                let curve = section.curve;
                if (n < section.enter) {
                    curve = easeIn(0, section.curve, n / Math.max(1, section.enter));
                }
                else if (n >= section.enter + section.hold) {
                    const leaveIndex = n - section.enter - section.hold;
                    curve = easeOut(section.curve, 0, leaveIndex / Math.max(1, section.leave));
                }
                addSegment(curve, easeInOut(startY, endY, yPercent), Boolean(section.tunnel));
            }
        }
        map.sections.forEach(addRoad);
        if (output.length > 24 && Math.abs(lastY) > 1) {
            const blendCount = Math.min(36, Math.floor(output.length * 0.2));
            const startIndex = output.length - blendCount;
            const startHeight = output[startIndex].p1.world.y;
            for (let i = 0; i < blendCount; i += 1) {
                const seg = output[startIndex + i];
                const t1 = i / blendCount;
                const t2 = (i + 1) / blendCount;
                seg.p1.world.y = easeInOut(startHeight, 0, t1);
                seg.p2.world.y = easeInOut(startHeight, 0, t2);
            }
            output[output.length - 1].p2.world.y = 0;
        }
        decorateTrack(output, map);
        return direction === "reverse" ? reverseTrack(output, map) : output;
    }
    function reverseTrack(track, map) {
        return track.map((_, index) => {
            const source = track[track.length - 1 - index];
            const color = getSegmentColor(index, map.palette, source.tunnel);
            return {
                index,
                p1: blankPoint(0, source.p2.world.y, index * SEGMENT_LENGTH),
                p2: blankPoint(0, source.p1.world.y, (index + 1) * SEGMENT_LENGTH),
                curve: -source.curve,
                tunnel: source.tunnel,
                sprites: source.sprites.map((sprite) => ({
                    ...sprite,
                    offset: -sprite.offset,
                })),
                color,
                rgb: buildSegmentRgb(color),
                clip: renderHeight,
            };
        });
    }
    function decorateTrack(track, map) {
        const random = createRandom(map.seed);
        for (let index = 8; index < track.length - 8; index += 1) {
            const segment = track[index];
            if (segment.tunnel) {
                continue;
            }
            if (index % map.decorations.every === 0) {
                const primary = pick(map.decorations.primary, random);
                const side = random() > 0.5 ? 1 : -1;
                const scale = map.decorations.baseScale * interpolate(0.85, 1.45, random());
                const offset = side * interpolate(map.decorations.farOffset, map.decorations.farOffset + 1.3, random());
                segment.sprites.push({ asset: primary, offset, scale });
                if (random() > 0.5) {
                    const mirror = pick(map.decorations.primary, random);
                    const mirrorScale = map.decorations.baseScale * interpolate(0.72, 1.15, random());
                    const mirrorOffset = -side * interpolate(map.decorations.farOffset + 0.25, map.decorations.farOffset + 1.8, random());
                    segment.sprites.push({ asset: mirror, offset: mirrorOffset, scale: mirrorScale });
                }
            }
            if (index % map.decorations.secondaryEvery === 0) {
                const secondary = pick(map.decorations.secondary, random);
                const side = random() > 0.5 ? 1 : -1;
                segment.sprites.push({
                    asset: secondary,
                    offset: side * interpolate(map.decorations.farOffset + 0.2, map.decorations.farOffset + 1.2, random()),
                    scale: map.decorations.baseScale * interpolate(0.75, 1.25, random()),
                });
            }
        }
    }
    function pick(items, random) {
        return items[Math.floor(random() * items.length) % items.length];
    }
    function findSegment(position) {
        return segments[Math.floor(positiveModulo(position, trackLength) / SEGMENT_LENGTH) % segments.length];
    }
    function buildMiniMapPoints(track, map, direction) {
        if (track.length === 0) {
            return [];
        }
        const points = normalizeMiniMapRoute(sampleMiniMapRoute(map.miniMapRoute, track.length));
        return direction === "reverse" ? [...points].reverse() : points;
    }
    function sampleMiniMapRoute(route, segmentCount) {
        if (route.length < 2) {
            return [{ x: 0.5, y: 0.5 }];
        }
        const smoothRoute = buildSmoothMiniMapRoute(route);
        const edgeLengths = smoothRoute.slice(0, -1).map((point, index) => {
            const next = smoothRoute[index + 1];
            return Math.hypot(next.x - point.x, next.y - point.y);
        });
        const routeLength = edgeLengths.reduce((total, length) => total + length, 0);
        if (routeLength <= 0) {
            return Array.from({ length: segmentCount + 1 }, () => ({ ...route[0] }));
        }
        const points = [];
        for (let sample = 0; sample <= segmentCount; sample += 1) {
            const targetDistance = (sample / Math.max(1, segmentCount)) * routeLength;
            points.push(getRoutePointAtDistance(smoothRoute, edgeLengths, routeLength, targetDistance));
        }
        return points;
    }
    function buildSmoothMiniMapRoute(route) {
        const points = [];
        const subdivisions = 16;
        for (let index = 0; index < route.length; index += 1) {
            const p0 = route[(index - 1 + route.length) % route.length];
            const p1 = route[index];
            const p2 = route[(index + 1) % route.length];
            const p3 = route[(index + 2) % route.length];
            for (let step = 0; step < subdivisions; step += 1) {
                points.push(interpolateCatmullRom(p0, p1, p2, p3, step / subdivisions));
            }
        }
        points.push(points[0]);
        return points;
    }
    function interpolateCatmullRom(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        return {
            x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
            y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        };
    }
    function getRoutePointAtDistance(route, edgeLengths, routeLength, distance) {
        let remaining = positiveModulo(distance, routeLength);
        for (let index = 0; index < edgeLengths.length; index += 1) {
            const edgeLength = edgeLengths[index];
            if (remaining <= edgeLength || index === edgeLengths.length - 1) {
                const point = route[index];
                const next = route[index + 1] ?? route[0];
                const percent = edgeLength <= 0 ? 0 : remaining / edgeLength;
                return {
                    x: interpolate(point.x, next.x, percent),
                    y: interpolate(point.y, next.y, percent),
                };
            }
            remaining -= edgeLength;
        }
        return route[0];
    }
    function normalizeMiniMapRoute(raw) {
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        for (const point of raw) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const span = Math.max(maxX - minX, maxY - minY, 1);
        return raw.map((point) => ({
            x: 0.5 + ((point.x - centerX) / span) * MINI_MAP_ROUTE_FILL,
            y: 0.5 + ((point.y - centerY) / span) * MINI_MAP_ROUTE_FILL,
        }));
    }
    function getMiniMapMarker(position, offset) {
        if (miniMapPoints.length < 2) {
            return { x: 0.5, y: 0.5, angle: 0 };
        }
        const segmentProgress = positiveModulo(position, trackLength) / SEGMENT_LENGTH;
        const index = Math.floor(segmentProgress) % segments.length;
        const percent = segmentProgress - Math.floor(segmentProgress);
        const p1 = miniMapPoints[index];
        const p2 = miniMapPoints[index + 1] ?? miniMapPoints[0];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.hypot(dx, dy) || 1;
        const laneShift = offset * 0.026;
        return {
            x: interpolate(p1.x, p2.x, percent) + (-dy / length) * laneShift,
            y: interpolate(p1.y, p2.y, percent) + (dx / length) * laneShift,
            angle: Math.atan2(dy, dx),
        };
    }
    function project(point, cameraX, cameraY, cameraZ) {
        point.camera.x = point.world.x - cameraX;
        point.camera.y = point.world.y - cameraY;
        point.camera.z = point.world.z - cameraZ;
        point.screen.scale = getVisualCameraDepth() / point.camera.z;
        point.screen.x = renderWidth / 2 + point.screen.scale * point.camera.x * renderWidth / 2;
        point.screen.y = renderHeight / 2 - point.screen.scale * point.camera.y * renderHeight / 2 + cameraPitch * renderHeight * 0.14;
        point.screen.w = point.screen.scale * ROAD_WIDTH * renderWidth / 2;
    }
    function getVisualCameraDepth() {
        return CAMERA_DEPTH * interpolate(1, NITRO_ZOOM_CAMERA_SCALE, nitroZoomVisual);
    }
    function loadAssets() {
        setLoadingProgress(1);
        return Promise.resolve();
    }
    function setLoadingProgress(progress) {
        const percent = Math.round(clamp(progress, 0, 1) * 100);
        loadingPercent.textContent = `${percent}%`;
        loadingFill.style.width = `${percent}%`;
    }
    function hideLoadingScreen() {
        setLoadingProgress(1);
        loadingScreen.classList.add("ready");
        window.setTimeout(() => {
            loadingScreen.hidden = true;
        }, 260);
    }
    function resize() {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const gameRoot = document.getElementById("overtake-game-root") ?? canvas.parentElement;
        const bounds = gameRoot?.getBoundingClientRect();
        const cssWidth = Math.max(320, Math.floor(bounds?.width || window.innerWidth));
        const cssHeight = Math.max(240, Math.floor(bounds?.height || window.innerHeight));
        renderWidth = Math.max(640, Math.floor(cssWidth * pixelRatio));
        renderHeight = Math.max(420, Math.floor(cssHeight * pixelRatio));
        canvas.width = renderWidth;
        canvas.height = renderHeight;
        if (skyCanvas) {
            skyCanvas.width = renderWidth;
            skyCanvas.height = renderHeight;
        }
        if (babylonState) {
            babylonState.engine.setHardwareScalingLevel(1 / pixelRatio);
            babylonState.engine.resize();
        }
        const miniWidth = miniMapCanvas.clientWidth || 168;
        const miniHeight = miniMapCanvas.clientHeight || 168;
        miniMapCanvas.width = Math.max(120, Math.floor(miniWidth * pixelRatio));
        miniMapCanvas.height = Math.max(120, Math.floor(miniHeight * pixelRatio));
    }
    function pushCallout(text, tone = "gold") {
        const el = document.createElement("div");
        el.className = `callout-toast ${tone}`;
        el.textContent = text;
        calloutStack.append(el);
        while (calloutStack.children.length > 3) {
            calloutStack.firstElementChild?.remove();
        }
        window.setTimeout(() => {
            el.remove();
        }, 1550);
    }
    function spawnParticle(x, y, vx, vy, size, life, color, kind) {
        if (save.reducedMotion && kind !== "weather")
            return;
        for (const p of particles) {
            if (!p.active) {
                p.active = true;
                p.x = x;
                p.y = y;
                p.vx = vx;
                p.vy = vy;
                p.size = size;
                p.life = life;
                p.maxLife = life;
                p.color = color;
                p.kind = kind;
                return;
            }
        }
    }
    function spawnBurst(x, y, count, color, kind, speed = 220) {
        for (let i = 0; i < count; i += 1) {
            const a = Math.random() * Math.PI * 2;
            const spd = speed * (0.35 + Math.random() * 0.85);
            spawnParticle(x, y, Math.cos(a) * spd, Math.sin(a) * spd - 40, 3 + Math.random() * 4, 0.35 + Math.random() * 0.4, color, kind);
        }
    }
    function addSkidMark(position, offset) {
        if (skidMarks.length >= MAX_SKIDMARKS) {
            skidMarks.shift();
        }
        skidMarks.push({ position, offset, alpha: 0.65 });
    }
    function updateParticles(dt, map) {
        for (const p of particles) {
            if (!p.active)
                continue;
            p.life -= dt;
            if (p.life <= 0) {
                p.active = false;
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.kind === "spark" || p.kind === "confetti") {
                p.vy += 420 * dt;
            }
            else if (p.kind === "smoke" || p.kind === "dust") {
                p.size += 12 * dt;
            }
        }
        if (!save.reducedMotion && (mode === "race" || mode === "countdown")) {
            if (map.weather === "snow" && Math.random() < 0.65) {
                spawnParticle(Math.random() * renderWidth, -10, -40 + Math.random() * 80, 140 + Math.random() * 110, 2.5 + Math.random() * 2.5, 2.2, "rgba(255,255,255,0.8)", "weather");
            }
            else if (map.weather === "rain" && Math.random() < 0.85) {
                spawnParticle(Math.random() * renderWidth, -10, -120, 680 + Math.random() * 220, 2, 0.9, "rgba(125,211,252,0.55)", "weather");
            }
            else if (map.weather === "sand" && Math.random() < 0.35) {
                spawnParticle(-10, Math.random() * renderHeight * 0.8, 380 + Math.random() * 220, 35, 2.5, 1.5, "rgba(247,224,163,0.45)", "weather");
            }
        }
    }
    // ---- Race Initialization ----
    function resetRace() {
        const map = getMapConfig(selectedMapId);
        const car = getEquippedCar();
        segments = buildTrack(map, selectedRaceDirection);
        miniMapPoints = buildMiniMapPoints(segments, map, selectedRaceDirection);
        trackLength = segments.length * SEGMENT_LENGTH;
        maxSpeed = BASE_MAX_SPEED * car.maxSpeed;
        player.carId = car.id;
        player.x = 0;
        visualPlayerX = player.x;
        player.speed = 0;
        player.position = 0;
        player.totalDistance = 0;
        player.lap = 1;
        player.nitro = NITRO_MAX;
        player.nitroActive = false;
        player.nitroLocked = false;
        player.shieldTime = 0;
        player.magnetTime = 0;
        player.overdriveTime = 0;
        player.starTime = 0;
        player.mushroomTime = 0;
        player.miniTurboTime = 0;
        player.stunTime = 0;
        player.spinTime = 0;
        player.collisionCooldown = 0;
        player.steerInput = 0;
        player.drifting = false;
        player.lateralSpeed = 0;
        player.driftDir = 0;
        player.driftCharge = 0;
        player.slipstream = 0;
        player.gear = 1;
        player.rpm = 0.2;
        player.airY = 0;
        player.airVy = 0;
        player.hazardSpinTime = 0;
        player.heldItem = null;
        player.rouletteTime = 0;
        player.rouletteDisplay = null;
        player.raceCoins = 0;
        cameraPitch = 0;
        cameraRoll = 0;
        cameraShake = 0;
        opponents = createOpponents(map, player.carId);
        itemBoxes = createItemBoxes(map);
        shells = [];
        powerups = createPowerups(map);
        boostPads = createBoostPads(map);
        hazards = createRoadHazards(map);
        roadCoins = createRoadCoins(map);
        airstrikes = [];
        impactEffects = [];
        skidMarks.length = 0;
        for (const p of particles)
            p.active = false;
        raceTime = 0;
        lapStartTime = 0;
        currentBestLap = 0;
        lastSectorIndex = 0;
        sectorTimes = [];
        bestSectorTimes = [];
        comboCount = 0;
        comboTimer = 0;
        raceOvertakes = 0;
        raceNearMisses = 0;
        raceCollisions = 0;
        raceCoinsCollected = 0;
        raceTopSpeed = 0;
        lastPlace = calculatePlace();
        placeDeltaTimer = 0;
        placeDeltaValue = 0;
        endlessTimeLeft = 45;
        endlessScore = 0;
        knockoutNextLap = 2;
        playerKnockedOut = false;
        finishCelebrationSlowMo = 0;
        lockedFinishPlace = 0;
        miniMapBgKey = "";
        rouletteTickAccum = 0;
        starMusicAccum = 0;
        raceRewardPaid = false;
        calloutStack.replaceChildren();
        summaryModal.hidden = true;
        incomingWarning.hidden = true;
        updateHud();
    }
    function createOpponents(map, playerCarId) {
        if (save.raceMode === "timetrial") {
            return [];
        }
        const random = createRandom(map.seed * 31 + 11);
        const baseRoster = save.raceMode === "endless"
            ? ["starter", "street", "gt", "starter", "street", "gt", "prototype", "apex", "street", "starter"]
            : map.opponentCars;
        const count = baseRoster.length;
        const cars = [];
        const diff = getDifficultySettings();
        for (let index = 0; index < count; index += 1) {
            const gap = save.raceMode === "endless"
                ? trackLength * interpolate(0.06, 0.94, (index + 1) / (count + 1))
                : 340 + index * 250;
            const laneBias = LANE_OFFSETS[index % LANE_OFFSETS.length];
            const carId = baseRoster[index];
            const carConfig = getCarConfig(carId);
            const isTraffic = save.raceMode === "endless" && index % 2 === 0;
            const opponentSpeed = (isTraffic ? BASE_MAX_SPEED * 0.62 : getOpponentBaseSpeed(map, carConfig, playerCarId)) * diff.aiScale;
            const paint = PAINT_OPTIONS[(index + 1) % PAINT_OPTIONS.length];
            cars.push({
                id: index,
                name: isTraffic ? "Cruiser" : RIVAL_NAMES[index % RIVAL_NAMES.length],
                trait: RIVAL_TRAITS[index % RIVAL_TRAITS.length],
                carId,
                asset: carConfig.asset,
                paintColor: paint.color || carConfig.color,
                offset: laneBias,
                targetLaneOffset: laneBias,
                avoidanceLockUntil: 0,
                blockedBy: undefined,
                speed: isTraffic ? opponentSpeed : 0,
                baseSpeed: opponentSpeed,
                position: gap % trackLength,
                totalDistance: gap,
                seed: random() * 1000,
                laneBias,
                nitro: NITRO_MAX,
                nitroActive: false,
                shieldTime: 0,
                stunTime: 0,
                spinTime: 0,
                shrunkTime: 0,
                braking: false,
                turnSignal: 0,
                eliminated: false,
                isTraffic,
                overtakenAwarded: false,
                lastOvertakenAt: -10,
            });
        }
        return cars;
    }
    function createItemBoxes(map) {
        const boxes = [];
        if (save.raceMode === "timetrial")
            return boxes;
        const step = Math.max(42, Math.floor(segments.length / 5));
        for (let segIdx = 28; segIdx < segments.length - 20; segIdx += step) {
            for (const lane of LANE_OFFSETS) {
                boxes.push({
                    position: segIdx * SEGMENT_LENGTH,
                    offset: lane,
                    respawnAt: 0,
                    seed: segIdx * 13 + lane * 7,
                });
            }
        }
        return boxes;
    }
    function getOpponentBaseSpeed(map, carConfig, playerCarId) {
        const configuredSpeed = BASE_MAX_SPEED * carConfig.maxSpeed;
        const balance = getOpponentSpeedBalance(map.id, carConfig.id, playerCarId);
        if (balance) {
            return configuredSpeed * balance.maxSpeedRatio;
        }
        return configuredSpeed;
    }
    function getOpponentSpeedBalance(mapId, opponentCarId, playerCarId) {
        if (getCarRank(playerCarId) < getCarRank(opponentCarId)) {
            return undefined;
        }
        if (mapId === FIRST_LEVEL_ID) {
            return {
                maxSpeedRatio: FIRST_LEVEL_OPPONENT_MAX_SPEED_RATIO,
                aheadSpeedRatio: FIRST_LEVEL_AHEAD_OPPONENT_SPEED_RATIO,
            };
        }
        if (mapId === SECOND_LEVEL_ID) {
            return {
                maxSpeedRatio: SECOND_LEVEL_OPPONENT_MAX_SPEED_RATIO,
                aheadSpeedRatio: SECOND_LEVEL_AHEAD_OPPONENT_SPEED_RATIO,
            };
        }
        return {
            maxSpeedRatio: THIRD_LEVEL_OPPONENT_MAX_SPEED_RATIO,
            aheadSpeedRatio: THIRD_LEVEL_AHEAD_OPPONENT_SPEED_RATIO,
        };
    }
    function createPowerups(map) {
        const random = createRandom(map.seed * 97 + 17);
        const items = [];
        for (let index = 18; index < segments.length - 18; index += POWERUP_SLOT_SPACING) {
            if (random() > POWERUP_SLOT_CHANCE) {
                continue;
            }
            const kind = pick(POWERUP_KIND_POOL, random);
            if (!isPowerupEnabled(kind)) {
                continue;
            }
            const lane = LANE_OFFSETS[Math.floor(random() * LANE_OFFSETS.length) % LANE_OFFSETS.length] * 0.82;
            items.push({
                kind,
                position: (index + interpolate(0.25, 0.72, random())) * SEGMENT_LENGTH,
                offset: lane,
                respawnAt: 0,
                seed: random() * 1000,
            });
        }
        return items;
    }
    function createBoostPads(map) {
        const random = createRandom(map.seed * 53 + 7);
        const pads = [];
        for (let index = 26; index < segments.length - 18; index += 48) {
            const lane = LANE_OFFSETS[Math.floor(random() * LANE_OFFSETS.length) % LANE_OFFSETS.length] * 0.85;
            pads.push({
                position: index * SEGMENT_LENGTH,
                offset: lane,
                cooldownUntil: 0,
            });
        }
        return pads;
    }
    function createRoadHazards(map) {
        const random = createRandom(map.seed * 71 + 19);
        const list = [];
        const kind = map.id === "desert" ? "sand" : map.weather === "rain" || map.weather === "snow" ? "water" : "oil";
        const step = save.difficulty === "ace" ? 54 : 74;
        for (let index = 45; index < segments.length - 24; index += step) {
            if (random() > 0.65)
                continue;
            const lane = LANE_OFFSETS[Math.floor(random() * LANE_OFFSETS.length) % LANE_OFFSETS.length] * 0.88;
            list.push({
                kind,
                position: (index + 0.5) * SEGMENT_LENGTH,
                offset: lane,
                width: 0.34,
                cooldownUntil: 0,
            });
        }
        return list;
    }
    function createRoadCoins(map) {
        const random = createRandom(map.seed * 113 + 29);
        const coins = [];
        for (let index = 12; index < segments.length - 10; index += 16) {
            if (random() > 0.68)
                continue;
            const lane = LANE_OFFSETS[Math.floor(random() * LANE_OFFSETS.length) % LANE_OFFSETS.length] * 0.9;
            coins.push({
                position: (index + 0.4) * SEGMENT_LENGTH,
                offset: lane,
                respawnAt: 0,
                seed: random() * 100,
            });
        }
        return coins;
    }
    function isPowerupEnabled(kind) {
        if (save.raceMode === "timetrial" && (kind === "airstrike" || kind === "emp")) {
            return false;
        }
        return POWERUP_FLAGS[kind];
    }
    // ---- Arcade Kart Item System (DKR, Sonic, Wipeout, F-Zero & Blur inspired) ----
    function rollKartItemForPlace(place, total) {
        const ratio = total <= 1 ? 0 : (place - 1) / (total - 1);
        const r = Math.random();
        if (ratio < 0.25) {
            if (r < 0.28)
                return "oilslick";
            if (r < 0.56)
                return "bubble";
            if (r < 0.8)
                return "rocket";
            return "magnet";
        }
        if (ratio < 0.65) {
            if (r < 0.22)
                return "missile";
            if (r < 0.4)
                return "spindash";
            if (r < 0.56)
                return "icebeam";
            if (r < 0.72)
                return "twister";
            if (r < 0.86)
                return "rocket";
            return "bubble";
        }
        if (r < 0.22)
            return "allstar";
        if (r < 0.42)
            return "shunt";
        if (r < 0.62)
            return "quake";
        if (r < 0.82)
            return "empstorm";
        return "missile";
    }
    function collectItemBox(box) {
        box.respawnAt = raceTime + 7.5;
        playRouletteTick(1.2);
        if (player.heldItem || player.rouletteTime > 0) {
            player.nitro = Math.min(NITRO_MAX, player.nitro + 16);
            pushCallout("ITEM FULL +16% NITRO", "gold");
            return;
        }
        player.rouletteTime = 0.85;
        player.rouletteDisplay = ALL_KART_ITEMS[Math.floor(Math.random() * ALL_KART_ITEMS.length)];
        rouletteTickAccum = 0;
    }
    function useHeldItem() {
        if (mode !== "race")
            return;
        if (player.rouletteTime > 0) {
            player.rouletteTime = 0;
            const total = opponents.filter((o) => !o.eliminated && !o.isTraffic).length + 1;
            player.heldItem = rollKartItemForPlace(calculatePlace(), total);
            player.rouletteDisplay = null;
            playItemLockSfx();
            return;
        }
        const item = player.heldItem;
        if (!item)
            return;
        player.heldItem = null;
        if (item === "rocket" || item === "spindash") {
            player.mushroomTime = Math.max(player.mushroomTime, item === "spindash" ? 2.1 : MUSHROOM_DURATION);
            player.speed = Math.max(player.speed, getPlayerMaxSpeed() * 1.18);
            player.nitro = Math.min(NITRO_MAX, player.nitro + 28);
            cameraShake = Math.max(cameraShake, 5);
            playNitroIgnition();
            pushCallout(item === "spindash" ? "💠 SONIC SPIN DASH!" : "🚀 ZIPPER ROCKET!", "cyan");
            return;
        }
        if (item === "bubble") {
            player.shieldTime = Math.max(player.shieldTime, SHIELD_DURATION + 1.5);
            playPickupSfx("shield");
            pushCallout("🫧 BUBBLE SHIELD ACTIVE!", "cyan");
            return;
        }
        if (item === "magnet") {
            player.magnetTime = Math.max(player.magnetTime, MAGNET_DURATION + 2);
            playPickupSfx("magnet");
            pushCallout("🧲 PULSE MAGNET ON!", "gold");
            return;
        }
        if (item === "allstar") {
            player.starTime = Math.max(player.starTime, STAR_DURATION);
            player.shieldTime = Math.max(player.shieldTime, STAR_DURATION);
            cameraShake = Math.max(cameraShake, 6);
            playItemLockSfx();
            pushCallout("🌟 ALL-STAR OVERDRIVE!", "gold");
            return;
        }
        if (item === "shunt") {
            player.overdriveTime = Math.max(player.overdriveTime, 3.8);
            player.shieldTime = Math.max(player.shieldTime, 3.8);
            cameraShake = Math.max(cameraShake, 7);
            playNitroIgnition();
            pushCallout("☄️ HYPER SHUNT ENGAGED!", "cyan");
            return;
        }
        if (item === "oilslick") {
            hazards.push({
                kind: "oil",
                position: positiveModulo(player.position - 140, trackLength),
                offset: player.x,
                width: 0.42,
                cooldownUntil: raceTime + 0.8,
            });
            playHopSfx();
            pushCallout("🛢️ OIL SLICK DROPPED!", "gold");
            return;
        }
        if (item === "icebeam") {
            playLightningSfx();
            pushCallout("❄️ FREEZE RAY BLAST!", "cyan");
            for (const car of opponents) {
                if (car.eliminated)
                    continue;
                const d = car.totalDistance - player.totalDistance;
                if (d > 0 && d < 3200) {
                    car.speed *= 0.48;
                    car.stunTime = Math.max(car.stunTime, 1.4);
                }
            }
            return;
        }
        if (item === "empstorm") {
            playLightningSfx();
            cameraShake = Math.max(cameraShake, 10);
            pushCallout("⚡ EMP STORM STRIKE!", "cyan");
            for (const car of opponents) {
                if (car.eliminated)
                    continue;
                car.speed *= 0.45;
                car.spinTime = 0.85;
                car.shrunkTime = 3.8;
            }
            return;
        }
        if (item === "missile" || item === "twister" || item === "quake") {
            playShellFireSfx();
            const ahead = opponents
                .filter((o) => !o.eliminated && o.totalDistance > player.totalDistance)
                .sort((a, b) => a.totalDistance - b.totalDistance)[0];
            const label = item === "quake"
                ? "〰️ PLASMA QUAKE WAVE!"
                : item === "twister"
                    ? "🌪️ TWISTER VORTEX!"
                    : "🎯 HOMING MISSILE LOCKED!";
            pushCallout(label, item === "missile" ? "red" : "cyan");
            shells.push({
                kind: item,
                position: positiveModulo(player.position + 150, trackLength),
                totalDistance: player.totalDistance + 150,
                offset: player.x,
                speed: Math.max(player.speed + 5200, BASE_MAX_SPEED * 1.95),
                life: item === "quake" ? 5.5 : 4.8,
                targetId: ahead?.id,
            });
        }
    }
    function updateItemBoxesAndShells(dt) {
        if (player.rouletteTime > 0) {
            player.rouletteTime = Math.max(0, player.rouletteTime - dt);
            rouletteTickAccum += dt;
            if (rouletteTickAccum >= 0.085) {
                rouletteTickAccum = 0;
                player.rouletteDisplay = ALL_KART_ITEMS[Math.floor(Math.random() * ALL_KART_ITEMS.length)];
                playRouletteTick(1 + (1 - player.rouletteTime) * 0.4);
            }
            if (player.rouletteTime <= 0) {
                const total = opponents.filter((o) => !o.eliminated && !o.isTraffic).length + 1;
                player.heldItem = rollKartItemForPlace(calculatePlace(), total);
                player.rouletteDisplay = null;
                playItemLockSfx();
            }
        }
        for (const box of itemBoxes) {
            if (raceTime < box.respawnAt)
                continue;
            if (shortestTrackDistance(box.position, player.position) <= 135 && Math.abs(box.offset - player.x) <= PLAYER_ROAD_WIDTH + 0.14) {
                collectItemBox(box);
            }
        }
        for (let i = shells.length - 1; i >= 0; i -= 1) {
            const sh = shells[i];
            sh.life -= dt;
            if (sh.life <= 0) {
                shells.splice(i, 1);
                continue;
            }
            sh.totalDistance += sh.speed * dt;
            sh.position = positiveModulo(sh.totalDistance, trackLength);
            if ((sh.kind === "missile" || sh.kind === "twister") && typeof sh.targetId === "number") {
                const target = opponents.find((o) => o.id === sh.targetId && !o.eliminated);
                if (target) {
                    sh.offset += (target.offset - sh.offset) * Math.min(1, dt * 6);
                }
            }
            let hit = false;
            for (const opp of opponents) {
                if (opp.eliminated)
                    continue;
                const dist = shortestTrackDistance(sh.position, opp.position);
                const lateral = Math.abs(sh.offset - opp.offset);
                const hitRadius = sh.kind === "quake" ? 1.15 : 0.48;
                if (dist <= 155 && lateral <= hitRadius) {
                    opp.speed *= 0.25;
                    opp.spinTime = 1.05;
                    opp.stunTime = 0.9;
                    playAirstrikeExplosion();
                    cameraShake = Math.max(cameraShake, 6);
                    impactEffects.push({ position: opp.position, offset: opp.offset, start: raceTime, duration: 0.75, shielded: false });
                    pushCallout(`${opp.name.toUpperCase()} HIT!`, "gold");
                    if (sh.kind !== "quake") {
                        hit = true;
                        break;
                    }
                }
            }
            if (hit) {
                shells.splice(i, 1);
            }
        }
    }
    // ---- Race Lifecycle ----
    function startRace(mapId = selectedMapId, direction = selectedRaceDirection) {
        selectedMapId = mapId;
        selectedRaceDirection = direction;
        resetRace();
        mode = "countdown";
        countdownRemaining = COUNTDOWN_TOTAL_SECONDS;
        countdownLabel = "";
        menuPanel.hidden = true;
        raceMessage.hidden = true;
        summaryModal.hidden = true;
        countdownOverlay.hidden = false;
        resumeButton.hidden = true;
        panelStatus.textContent = "Get Ready";
        releaseTouchControls();
        syncMapBgm(true);
        warmRaceAudio();
        updateCountdownOverlay();
        updateHud();
    }
    function updateCountdown(dt) {
        countdownRemaining = Math.max(0, countdownRemaining - dt);
        updateCountdownOverlay();
        if (countdownRemaining <= 0) {
            beginRaceAfterCountdown();
        }
    }
    function updateCountdownOverlay() {
        const elapsed = COUNTDOWN_TOTAL_SECONDS - countdownRemaining;
        const index = clamp(Math.floor(elapsed / COUNTDOWN_STEP_SECONDS), 0, COUNTDOWN_LABELS.length - 1);
        const label = COUNTDOWN_LABELS[index];
        if (label === countdownLabel) {
            return;
        }
        countdownLabel = label;
        countdownOverlay.textContent = label;
        countdownOverlay.classList.remove("pulse");
        void countdownOverlay.offsetWidth;
        countdownOverlay.classList.add("pulse");
        playCountdownBeep(label === "GO!");
    }
    function beginRaceAfterCountdown() {
        if (mode !== "countdown") {
            return;
        }
        mode = "race";
        countdownOverlay.hidden = true;
        panelStatus.textContent = "Racing";
        const throttleHeld = keys.has("arrowup") || keys.has("w") || gamepadThrottle;
        if (throttleHeld) {
            player.miniTurboTime = 0.9;
            player.nitro = Math.min(NITRO_MAX, player.nitro + 18);
            pushCallout("ROCKET START! 🚀", "cyan");
            playNitroIgnition();
        }
        syncMapBgm();
        updateHud();
    }
    function pauseRace() {
        if (mode !== "race") {
            return;
        }
        mode = "paused";
        menuView = "main";
        menuPanel.hidden = false;
        panelStatus.textContent = "Paused";
        updateTireScreech(0);
        syncMapBgm();
        renderMenu();
        updateHud();
    }
    function resumeRace() {
        if (mode !== "paused") {
            return;
        }
        mode = "race";
        menuPanel.hidden = true;
        panelStatus.textContent = "Racing";
        syncMapBgm();
        updateHud();
    }
    function finishRace() {
        if (mode === "finished") {
            return;
        }
        mode = "finished";
        player.speed = 0;
        player.nitroActive = false;
        updateTireScreech(0);
        countdownOverlay.hidden = true;
        incomingWarning.hidden = true;
        syncMapBgm();
        const place = lockedFinishPlace > 0 ? lockedFinishPlace : calculatePlace();
        lockedFinishPlace = 0;
        const breakdown = awardRaceRewards(place);
        playFinishFanfare(place);
        for (let i = 0; i < 42; i += 1) {
            const colors = ["#ffcf42", "#6ff2ff", "#ff5f5a", "#78ffaa", "#ff4fd8"];
            spawnParticle(renderWidth * (0.2 + Math.random() * 0.6), renderHeight * 0.35, (Math.random() - 0.5) * 440, -220 - Math.random() * 240, 5 + Math.random() * 4, 1.4 + Math.random() * 0.8, colors[i % colors.length], "confetti");
        }
        showPostRaceSummary(place, breakdown);
        updateHud();
    }
    function awardRaceRewards(place) {
        const empty = {
            placeCoins: 0, overtakeCoins: 0, cleanBonus: 0, pickupCoins: 0,
            challengeBonus: 0, achievementBonus: 0, total: 0,
            unlockedAchievements: [], newBestLap: false, newBestRace: false,
        };
        if (raceRewardPaid) {
            return empty;
        }
        const map = getMapConfig(selectedMapId);
        const diff = getDifficultySettings();
        const multipliers = [1, 0.58, 0.32, 0.18];
        const basePlaceCoins = save.raceMode === "timetrial"
            ? Math.round(map.reward * 0.35)
            : save.raceMode === "endless"
                ? Math.round(endlessScore * 12)
                : map.id === TEST_LEVEL_ID
                    ? map.reward
                    : Math.round(map.reward * (multipliers[Math.min(place - 1, multipliers.length - 1)] ?? 0.12) * diff.rewardMult);
        const overtakeCoins = raceOvertakes * 15 + raceNearMisses * 10;
        const cleanBonus = raceCollisions === 0 && save.raceMode !== "timetrial" && !playerKnockedOut ? 120 : 0;
        const pickupCoins = raceCoinsCollected;
        let challengeBonus = 0;
        if (!sessionChallenge.completed) {
            const hit = (sessionChallenge.kind === "overtakes" && raceOvertakes >= sessionChallenge.target) ||
                (sessionChallenge.kind === "nearmiss" && raceNearMisses >= sessionChallenge.target) ||
                (sessionChallenge.kind === "podium" && save.raceMode !== "timetrial" && !playerKnockedOut && place <= sessionChallenge.target) ||
                (sessionChallenge.kind === "topspeed" && raceTopSpeed >= sessionChallenge.target);
            if (hit) {
                sessionChallenge.completed = true;
                challengeBonus = sessionChallenge.reward;
            }
        }
        save.career.racesCompleted += 1;
        if (place === 1 && save.raceMode !== "timetrial" && !playerKnockedOut) {
            save.career.racesWon += 1;
        }
        save.career.totalOvertakes += raceOvertakes;
        save.career.totalNearMisses += raceNearMisses;
        save.career.totalDistanceKm += Number((player.totalDistance / 1800).toFixed(2));
        save.career.bestCombo = Math.max(save.career.bestCombo, comboCount);
        save.career.topSpeedRecorded = Math.max(save.career.topSpeedRecorded, Math.round(raceTopSpeed));
        let newBestLap = false;
        if (currentBestLap > 0) {
            const prevLap = save.bestLapTimes[map.id];
            if (!prevLap || currentBestLap < prevLap) {
                save.bestLapTimes[map.id] = Number(currentBestLap.toFixed(2));
                newBestLap = true;
            }
        }
        let newBestRace = false;
        // Unlock next map on completion of Race, Knockout (if not knocked out), Time Trial, or Endless (1+ lap)
        if (save.raceMode === "race" ||
            save.raceMode === "timetrial" ||
            (save.raceMode === "knockout" && !playerKnockedOut) ||
            (save.raceMode === "endless" && (player.lap >= 2 || endlessScore >= 5))) {
            const recordPlace = save.raceMode === "timetrial" ? 1 : place;
            const best = save.bestPlaces[map.id];
            if (!best || recordPlace < best) {
                save.bestPlaces[map.id] = recordPlace;
            }
            if (save.raceMode !== "endless") {
                const prevRace = save.bestRaceTimes[map.id];
                if (!prevRace || raceTime < prevRace) {
                    save.bestRaceTimes[map.id] = Number(raceTime.toFixed(2));
                    newBestRace = true;
                }
            }
        }
        if (save.raceMode === "endless") {
            save.bestEndlessScore = Math.max(save.bestEndlessScore, endlessScore);
        }
        const unlockedAchievements = [];
        const tryUnlock = (id, condition) => {
            if (condition && !save.achievements.includes(id)) {
                const def = ACHIEVEMENTS.find((a) => a.id === id);
                if (def) {
                    save.achievements.push(id);
                    unlockedAchievements.push(def);
                }
            }
        };
        tryUnlock("first_finish", save.career.racesCompleted >= 1);
        tryUnlock("first_win", place === 1 && save.raceMode !== "timetrial" && !playerKnockedOut);
        tryUnlock("overtake_10", save.career.totalOvertakes >= 10);
        tryUnlock("overtake_50", save.career.totalOvertakes >= 50);
        tryUnlock("combo_4", save.career.bestCombo >= 4);
        tryUnlock("near_miss_10", save.career.totalNearMisses >= 10);
        tryUnlock("clean_win", place === 1 && raceCollisions === 0 && save.raceMode !== "timetrial" && !playerKnockedOut);
        tryUnlock("speed_350", save.career.topSpeedRecorded >= 350);
        tryUnlock("ace_win", place === 1 && save.difficulty === "ace" && save.raceMode !== "timetrial" && !playerKnockedOut);
        tryUnlock("full_garage", save.ownedCars.length >= 4);
        const achievementBonus = unlockedAchievements.reduce((sum, a) => sum + a.reward, 0);
        const total = basePlaceCoins + overtakeCoins + cleanBonus + pickupCoins + challengeBonus + achievementBonus;
        save.coins += total;
        save.career.totalCoinsEarned += total;
        raceRewardPaid = true;
        saveProgress();
        return {
            placeCoins: basePlaceCoins,
            overtakeCoins,
            cleanBonus,
            pickupCoins,
            challengeBonus,
            achievementBonus,
            total,
            unlockedAchievements,
            newBestLap,
            newBestRace,
        };
    }
    function showPostRaceSummary(place, breakdown) {
        const map = getMapConfig(selectedMapId);
        const totalRacers = opponents.filter((o) => !o.isTraffic).length + 1;
        summaryEyebrow.textContent = `${map.name} · ${save.raceMode.toUpperCase()} · ${getDifficultySettings().label.toUpperCase()}`;
        if (playerKnockedOut) {
            summaryTitle.textContent = `Knocked Out!`;
            summaryMedal.textContent = "💥";
        }
        else if (save.raceMode === "timetrial") {
            summaryTitle.textContent = `Time Trial Complete`;
            summaryMedal.textContent = "⏱️";
        }
        else if (save.raceMode === "endless") {
            summaryTitle.textContent = `${endlessScore} Overtakes`;
            summaryMedal.textContent = "🔥";
        }
        else {
            const suffix = place === 1 ? "st" : place === 2 ? "nd" : place === 3 ? "rd" : "th";
            summaryTitle.textContent = `${place}${suffix} Place / ${totalRacers}`;
            summaryMedal.textContent = place === 1 ? "🏆" : place === 2 ? "🥈" : place === 3 ? "🥉" : "🏁";
        }
        summaryStats.replaceChildren();
        const statItems = [
            ["Race Time", formatRaceTime(raceTime)],
            ["Best Lap", currentBestLap > 0 ? formatRaceTime(currentBestLap) : "--:--.-"],
            ["Top Speed", `${formatSpeedValue(raceTopSpeed)} ${save.speedUnit.toUpperCase()}`],
            ["Overtakes", `${raceOvertakes}`],
            ["Close Calls", `${raceNearMisses}`],
            ["Collisions", `${raceCollisions}`],
        ];
        for (const [k, v] of statItems) {
            const card = document.createElement("div");
            card.className = "summary-stat";
            card.innerHTML = `<span>${k}</span><strong>${v}</strong>`;
            summaryStats.append(card);
        }
        summaryCoins.replaceChildren();
        const coinRows = [
            ["Position Reward", breakdown.placeCoins],
            ["Overtakes & Close Calls", breakdown.overtakeCoins],
            ["Road Coins Picked Up", breakdown.pickupCoins],
            ["Clean Race Bonus", breakdown.cleanBonus],
            ["Challenge Bonus", breakdown.challengeBonus],
            ["Achievement Bonus", breakdown.achievementBonus],
        ];
        for (const [label, amount] of coinRows) {
            if (amount <= 0 && label !== "Position Reward")
                continue;
            const line = document.createElement("div");
            line.className = "summary-coin-line";
            line.innerHTML = `<span>${label}</span><strong>+${amount}</strong>`;
            summaryCoins.append(line);
        }
        const totalLine = document.createElement("div");
        totalLine.className = "summary-coin-line";
        totalLine.style.borderTop = "1px solid rgba(255,207,66,0.35)";
        totalLine.style.paddingTop = "6px";
        totalLine.innerHTML = `<strong>Total Earned</strong><strong>+${breakdown.total} Coins</strong>`;
        summaryCoins.append(totalLine);
        summaryBadges.replaceChildren();
        if (breakdown.newBestLap) {
            const p = document.createElement("span");
            p.className = "pill";
            p.textContent = "⚡ New Best Lap";
            summaryBadges.append(p);
        }
        if (breakdown.newBestRace) {
            const p = document.createElement("span");
            p.className = "pill";
            p.textContent = "🏁 New Track Record";
            summaryBadges.append(p);
        }
        for (const ach of breakdown.unlockedAchievements) {
            const p = document.createElement("span");
            p.className = "pill";
            p.textContent = `🏅 ${ach.title} (+${ach.reward})`;
            summaryBadges.append(p);
        }
        summaryBadges.hidden = summaryBadges.children.length === 0;
        summaryActions.replaceChildren();
        const retryBtn = document.createElement("button");
        retryBtn.type = "button";
        retryBtn.className = "primary";
        retryBtn.textContent = "Race Again";
        retryBtn.addEventListener("click", () => startRace(selectedMapId, selectedRaceDirection));
        const currentLevelIdx = LEVEL_ORDER.indexOf(selectedMapId);
        const nextLevelId = currentLevelIdx >= 0 && currentLevelIdx + 1 < LEVEL_ORDER.length ? LEVEL_ORDER[currentLevelIdx + 1] : undefined;
        if (nextLevelId) {
            const nextBtn = document.createElement("button");
            nextBtn.type = "button";
            nextBtn.className = "primary";
            nextBtn.textContent = `Next: ${getMapConfig(nextLevelId).name}`;
            nextBtn.addEventListener("click", () => startRace(nextLevelId, "forward"));
            summaryActions.append(nextBtn);
        }
        const garageBtn = document.createElement("button");
        garageBtn.type = "button";
        garageBtn.className = "secondary";
        garageBtn.textContent = "Garage";
        garageBtn.addEventListener("click", () => {
            summaryModal.hidden = true;
            mode = "menu";
            menuView = "garage";
            menuPageIndex = CAR_ORDER.indexOf(save.equippedCar);
            menuPanel.hidden = false;
            renderMenu();
        });
        const menuBtn = document.createElement("button");
        menuBtn.type = "button";
        menuBtn.className = "secondary";
        menuBtn.textContent = "Main Menu";
        menuBtn.addEventListener("click", exitRaceToMenu);
        summaryActions.append(retryBtn, garageBtn, menuBtn);
        summaryModal.hidden = false;
    }
    // ---- Menus ----
    function renderMenu() {
        disposeModelPreview?.();
        disposeModelPreview = undefined;
        syncFullScreenPreference();
        confirmResetSave = false;
        menuContent.replaceChildren();
        resumeButton.hidden = true;
        backButton.hidden = menuView === "main";
        panelStatus.textContent = `Coins ${save.coins}`;
        panelSubtitle.textContent = `Equipped: ${getEquippedCar().label} · ${getDifficultySettings().label}`;
        if (sessionChallenge.completed) {
            panelChallenge.textContent = "✓ Challenge Complete";
        }
        else {
            panelChallenge.textContent = `🎯 ${sessionChallenge.desc} (+${sessionChallenge.reward})`;
        }
        panelChallenge.hidden = mode === "paused";
        const titles = {
            main: "Overtake",
            levels: "Choose a route",
            garage: "Your garage",
            drivers: "Choose a driver",
            career: "Career & Awards",
            options: "Race settings",
        };
        menuPanel.querySelector(".panel-title").textContent = mode === "paused" ? "Race Paused" : titles[menuView];
        syncUiState();
        if (mode === "paused") {
            panelStatus.textContent = "Paused";
            backButton.hidden = true;
            renderPauseMenu();
        }
        else if (menuView === "main") {
            renderMainMenu();
        }
        else if (menuView === "levels") {
            renderLevelMenu();
        }
        else if (menuView === "garage") {
            renderGarageMenu();
        }
        else if (menuView === "drivers") {
            renderDriverMenu();
        }
        else if (menuView === "career") {
            renderCareerMenu();
        }
        else {
            renderOptionsMenu();
        }
    }
    function renderPauseMenu() {
        const grid = document.createElement("div");
        grid.className = "pause-menu-grid";
        const resume = createMenuButton("Resume", "Continue race", resumeRace, "primary");
        const restart = createMenuButton("Restart", "Restart from grid", () => startRace(selectedMapId, selectedRaceDirection));
        const exit = createMenuButton("Exit", "Back to start menu", exitRaceToMenu);
        grid.append(resume, restart, exit);
        menuContent.append(grid);
        const soundRow = createToggleRow("Audio & SFX", save.sound, () => {
            save.sound = !save.sound;
            saveProgress();
            syncMapBgm();
            renderMenu();
        });
        const unitRow = createActionRow("Speed Unit", save.speedUnit.toUpperCase(), () => {
            save.speedUnit = save.speedUnit === "kmh" ? "mph" : "kmh";
            saveProgress();
            updateHud();
            renderMenu();
        });
        const hint = document.createElement("div");
        hint.className = "pause-controls-hint";
        hint.textContent = "Steer: A/D or ◀/▶ · Brake: S/▼ · Handbrake: C · Nitro: Space/Shift/N · Use Item: E · Restart: R";
        menuContent.append(soundRow, unitRow, hint);
    }
    function exitRaceToMenu() {
        mode = "menu";
        menuView = "main";
        menuPanel.hidden = false;
        summaryModal.hidden = true;
        raceMessage.hidden = true;
        countdownOverlay.hidden = true;
        incomingWarning.hidden = true;
        player.speed = 0;
        player.nitroActive = false;
        nitroZoomVisual = 0;
        updateTireScreech(0);
        releaseTouchControls();
        syncMapBgm();
        resetRace();
        renderMenu();
    }
    function renderMainMenu() {
        const grid = document.createElement("div");
        grid.className = "main-menu-grid";
        const start = createMenuButton("Start", "Routes & modes", () => {
            menuView = "levels";
            menuPageIndex = Math.max(0, MAPS.findIndex((map) => map.id === selectedMapId));
            renderMenu();
        });
        const cars = createMenuButton("Garage", `${getEquippedCar().label} · Tune & Paint`, () => {
            menuView = "garage";
            menuPageIndex = CAR_ORDER.indexOf(save.equippedCar);
            renderMenu();
        });
        const drivers = createMenuButton("Drivers", driverName(save.driver), () => {
            menuView = "drivers";
            renderMenu();
        });
        const career = createMenuButton("Career", `${save.achievements.length}/${ACHIEVEMENTS.length} Awards`, () => {
            menuView = "career";
            menuPageIndex = 0;
            renderMenu();
        });
        const options = createMenuButton("Options", `${getDifficultySettings().label} · ${save.speedUnit.toUpperCase()}`, () => {
            menuView = "options";
            menuPageIndex = 0;
            renderMenu();
        });
        grid.append(start, cars, drivers, career, options);
        menuContent.append(grid);
        const quickStrip = document.createElement("div");
        quickStrip.className = "menu-quick-strip";
        const quickBtn = document.createElement("button");
        quickBtn.type = "button";
        quickBtn.className = "primary";
        quickBtn.textContent = `Quick Race: ${getMapConfig(selectedMapId).name}`;
        quickBtn.addEventListener("click", () => startRace(selectedMapId, selectedRaceDirection));
        quickStrip.append(quickBtn);
        menuContent.append(quickStrip);
    }
    function driverName(id) {
        return id.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
    }
    function getDriverStats(id) {
        const [race, driverClass] = id.split("-");
        const base = RACE_DRIVER_STATS[race];
        const role = CLASS_DRIVER_STATS[driverClass];
        return {
            acceleration: base.acceleration * role.acceleration,
            grip: base.grip * role.grip,
            brakes: base.brakes * role.brakes,
            nitro: base.nitro * role.nitro,
        };
    }
    function renderDriverMenu() {
        const layout = document.createElement("div");
        layout.className = "driver-selection";
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 280;
        canvas.setAttribute("role", "img");
        const controls = document.createElement("div");
        controls.className = "driver-controls";
        const stats = document.createElement("dl");
        stats.className = "driver-stats";
        stats.setAttribute("aria-live", "polite");
        const status = document.createElement("p");
        status.className = "driver-status";
        const [race, driverClass] = save.driver.split("-");
        const createPicker = (labelText, values, value) => {
            const label = document.createElement("label");
            label.textContent = labelText;
            const picker = document.createElement("select");
            picker.setAttribute("aria-label", labelText);
            for (const option of values)
                picker.add(new Option(driverName(option), option));
            picker.value = value;
            label.append(picker);
            controls.append(label);
            return picker;
        };
        const racePicker = createPicker("Race", DRIVER_RACES, race);
        const classPicker = createPicker("Class", DRIVER_CLASSES, driverClass);
        const statLabels = { acceleration: "Acceleration", grip: "Cornering grip", brakes: "Braking force", nitro: "Nitro duration" };
        controls.append(stats, status);
        layout.append(canvas, controls);
        menuContent.append(layout);
        const showDriver = () => {
            const name = driverName(save.driver);
            status.textContent = `${name} equipped`;
            canvas.setAttribute("aria-label", `${name} model`);
            disposeModelPreview?.();
            // A new canvas gives the next preview its own WebGL context.
            const next = canvas.cloneNode();
            layout.querySelector("canvas")?.replaceWith(next);
            disposeModelPreview = modelLibrary?.previewDriver(next, save.driver);
            stats.replaceChildren();
            const modifiers = getDriverStats(save.driver);
            for (const key of Object.keys(statLabels)) {
                const term = document.createElement("dt");
                term.textContent = statLabels[key];
                const value = document.createElement("dd");
                value.textContent = `${Math.round(modifiers[key] * 100)}%`;
                stats.append(term, value);
            }
        };
        const selectDriver = () => {
            save.driver = `${racePicker.value}-${classPicker.value}`;
            saveProgress();
            showDriver();
        };
        racePicker.addEventListener("change", selectDriver);
        classPicker.addEventListener("change", selectDriver);
        showDriver();
    }
    function buildMiniMapSvg(map) {
        const pts = map.miniMapRoute.map((p) => `${(p.x * 100).toFixed(1)},${(p.y * 100).toFixed(1)}`).join(" ");
        return `<svg class="route-preview-svg" viewBox="0 0 100 100" aria-hidden="true"><polygon points="${pts}" fill="none" stroke="${map.palette.rumble1}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/><polygon points="${pts}" fill="none" stroke="${map.palette.horizon}" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
    }
    function renderLevelMenu() {
        const configBar = document.createElement("div");
        configBar.className = "route-config-bar";
        const modeGroup = document.createElement("div");
        modeGroup.className = "chip-group";
        const modes = [
            ["race", "Race"],
            ["timetrial", "Time Trial"],
            ["knockout", "Knockout"],
            ["endless", "Endless"],
        ];
        for (const [mId, mLabel] of modes) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `chip-btn${save.raceMode === mId ? " active" : ""}`;
            btn.textContent = mLabel;
            btn.addEventListener("click", () => {
                save.raceMode = mId;
                saveProgress();
                renderMenu();
            });
            modeGroup.append(btn);
        }
        const diffGroup = document.createElement("div");
        diffGroup.className = "chip-group";
        const diffs = [
            ["rookie", "Rookie"],
            ["pro", "Pro"],
            ["ace", "Ace (+50%)"],
        ];
        for (const [dId, dLabel] of diffs) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `chip-btn${save.difficulty === dId ? " active" : ""}`;
            btn.textContent = dLabel;
            btn.addEventListener("click", () => {
                save.difficulty = dId;
                saveProgress();
                renderMenu();
            });
            diffGroup.append(btn);
        }
        configBar.append(modeGroup, diffGroup);
        menuContent.append(configBar);
        const grid = document.createElement("div");
        grid.className = "option-grid route-page";
        const pageIndex = clamp(menuPageIndex, 0, MAPS.length - 1);
        menuPageIndex = pageIndex;
        const map = MAPS[pageIndex];
        const best = save.bestPlaces[map.id];
        const bestLap = save.bestLapTimes[map.id];
        const bestRace = save.bestRaceTimes[map.id];
        const detail = `${map.label} · Base Reward ${map.reward} coins`;
        const card = document.createElement("div");
        card.className = "option-button level-card";
        const kmLen = ((map.sections.reduce((s, sec) => s + sec.enter + sec.hold + sec.leave, 0) * SEGMENT_LENGTH) / 1800).toFixed(1);
        card.innerHTML = `
      <div class="route-card-top">
        <div>
          <strong>${map.name}</strong>
          <span>${detail}</span>
          <div class="meta-line">
            <span class="pill">Best ${best ? `P${best}` : "-"}</span>
            <span class="pill">${save.raceMode === "endless" ? "∞ Laps" : `${save.raceMode === "timetrial" ? 3 : map.laps} Laps`}</span>
            <span class="pill">${kmLen} km/lap</span>
            <span class="pill">Lap ${bestLap ? formatRaceTime(bestLap) : "--"}</span>
            ${bestRace ? `<span class="pill">Race ${formatRaceTime(bestRace)}</span>` : ""}
          </div>
        </div>
        ${buildMiniMapSvg(map)}
      </div>`;
        card.addEventListener("click", () => {
            if (selectedMapId !== map.id) {
                selectedMapId = map.id;
                resetRace();
            }
            panelStatus.textContent = "Select Forward or Reverse";
        });
        const actions = document.createElement("div");
        actions.className = "level-actions";
        const forwardButton = createLevelActionButton("▶ Race Forward", () => startRace(map.id, "forward"));
        const reverseButton = createLevelActionButton("◀ Race Reverse", () => startRace(map.id, "reverse"));
        actions.append(forwardButton, reverseButton);
        card.append(actions);
        grid.append(card);
        menuContent.append(grid);
        appendMenuPager(pageIndex, MAPS.length, "Route", (next) => {
            menuPageIndex = next;
            selectedMapId = MAPS[next].id;
            resetRace();
            renderMenu();
        });
    }
    function createLevelActionButton(label, onClick) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "primary level-action";
        button.textContent = label;
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            raceMessage.hidden = true;
            onClick();
        });
        return button;
    }
    function buildCarPreviewSvg(car, paintColor, glowColor) {
        const body = paintColor || car.color;
        return `<svg class="car-preview" viewBox="0 0 240 120" aria-hidden="true">
      <ellipse cx="120" cy="102" rx="88" ry="11" fill="${glowColor}" opacity="0.35"/>
      <rect x="28" y="64" width="32" height="34" rx="6" fill="#0f172a"/>
      <rect x="180" y="64" width="32" height="34" rx="6" fill="#0f172a"/>
      <rect x="42" y="28" width="156" height="8" rx="3" fill="#1e293b"/>
      <rect x="64" y="34" width="10" height="16" fill="#1e293b"/>
      <rect x="166" y="34" width="10" height="16" fill="#1e293b"/>
      <path d="M22 68 L42 48 L72 30 L168 30 L198 48 L218 68 L210 92 L30 92 Z" fill="${body}" stroke="#f8fafc" stroke-opacity="0.28" stroke-width="2"/>
      <polygon points="78,34 162,34 176,52 64,52" fill="#1e3a5f"/>
      <rect x="38" y="64" width="44" height="10" rx="3" fill="#ff3b3b"/>
      <rect x="158" y="64" width="44" height="10" rx="3" fill="#ff3b3b"/>
      <rect x="58" y="80" width="124" height="12" rx="3" fill="#0f172a"/>
      <circle cx="76" cy="86" r="5" fill="#94a3b8"/>
      <circle cx="92" cy="86" r="5" fill="#94a3b8"/>
      <circle cx="148" cy="86" r="5" fill="#94a3b8"/>
      <circle cx="164" cy="86" r="5" fill="#94a3b8"/>
    </svg>`;
    }
    function renderGarageMenu() {
        const grid = document.createElement("div");
        grid.className = "garage-grid car-page";
        const pageIndex = clamp(menuPageIndex, 0, CAR_ORDER.length - 1);
        menuPageIndex = pageIndex;
        const id = CAR_ORDER[pageIndex];
        const car = getEffectiveCarStats(id);
        const owned = save.ownedCars.includes(id);
        const equipped = save.equippedCar === id;
        const canBuy = save.coins >= car.price;
        const upgrades = getCarUpgrades(id);
        const activePaint = save.carPaints[id] ?? "stock";
        const card = document.createElement("div");
        card.className = `option-button car-card${equipped ? " active" : ""}`;
        const topLayout = document.createElement("div");
        topLayout.className = "car-detail-layout";
        const leftCol = document.createElement("div");
        const activePaintObj = PAINT_OPTIONS.find((p) => p.id === activePaint) ?? PAINT_OPTIONS[0];
        const preview = document.createElement("canvas");
        preview.className = "car-preview";
        preview.width = 400;
        preview.height = 200;
        preview.setAttribute("role", "img");
        preview.setAttribute("aria-label", `${car.label} model`);
        disposeModelPreview = modelLibrary?.previewCar(preview, id, activePaintObj.color || car.color);
        if (disposeModelPreview)
            leftCol.append(preview);
        else
            leftCol.innerHTML = buildCarPreviewSvg(car, activePaintObj.color, activePaintObj.glow);
        const actionBtn = document.createElement("button");
        actionBtn.type = "button";
        actionBtn.className = owned ? (equipped ? "secondary" : "primary") : "primary";
        actionBtn.style.width = "100%";
        actionBtn.disabled = !owned && !canBuy;
        actionBtn.textContent = owned ? (equipped ? "✓ Equipped" : "Equip Car") : `Buy for ${car.price} Coins`;
        actionBtn.addEventListener("click", () => {
            if (owned) {
                save.equippedCar = id;
                player.carId = id;
                saveProgress();
                resetRace();
                renderMenu();
                return;
            }
            if (canBuy) {
                save.coins -= car.price;
                save.ownedCars.push(id);
                save.equippedCar = id;
                player.carId = id;
                saveProgress();
                resetRace();
                renderMenu();
            }
        });
        leftCol.append(actionBtn);
        if (owned) {
            const swatches = document.createElement("div");
            swatches.className = "swatch-row";
            for (const paint of PAINT_OPTIONS) {
                const sw = document.createElement("button");
                sw.type = "button";
                sw.className = `swatch-btn${activePaint === paint.id ? " active" : ""}`;
                sw.title = paint.label;
                sw.setAttribute("aria-label", `Paint ${paint.label}`);
                sw.style.background = paint.color || car.color;
                sw.addEventListener("click", () => {
                    save.carPaints[id] = paint.id;
                    saveProgress();
                    renderMenu();
                });
                swatches.append(sw);
            }
            leftCol.append(swatches);
        }
        const rightCol = document.createElement("div");
        const titleEl = document.createElement("strong");
        titleEl.textContent = car.label;
        rightCol.append(titleEl);
        const bars = document.createElement("div");
        bars.className = "stat-bars";
        const maxTop = 520;
        const stats = [
            ["Top Speed", clamp(car.displayTopSpeed / maxTop, 0.1, 1), `${formatSpeedValue(car.displayTopSpeed)}`],
            ["Accel", clamp(car.accel / 1.5, 0.1, 1), `${Math.round(car.accel * 100)}`],
            ["Handling", clamp(car.grip / 1.35, 0.1, 1), `${Math.round(car.grip * 100)}`],
            ["Nitro", clamp(car.nitro / 1.5, 0.1, 1), `${Math.round(car.nitro * 100)}`],
        ];
        for (const [label, ratio, valText] of stats) {
            const row = document.createElement("div");
            row.className = "stat-row";
            row.innerHTML = `<span>${label}</span><div class="stat-track"><i style="width:${Math.round(ratio * 100)}%"></i></div><strong>${valText}</strong>`;
            bars.append(row);
        }
        rightCol.append(bars);
        if (owned) {
            const upRow = document.createElement("div");
            upRow.className = "upgrade-row";
            const upgradeDefs = [
                ["engine", "Engine"],
                ["nitro", "Nitro"],
                ["tires", "Tires"],
            ];
            for (const [uKind, uLabel] of upgradeDefs) {
                const lvl = upgrades[uKind];
                const cost = 350 * (lvl + 1) + CARS[id].price * 0.1;
                const roundedCost = Math.round(cost / 25) * 25;
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "upgrade-btn";
                btn.disabled = lvl >= 3 || save.coins < roundedCost;
                btn.innerHTML = `<strong>${uLabel} Lv.${lvl}/3</strong><span>${lvl >= 3 ? "MAXED" : `Upgrade ${roundedCost}`}</span>`;
                btn.addEventListener("click", () => {
                    if (lvl < 3 && save.coins >= roundedCost) {
                        save.coins -= roundedCost;
                        const current = getCarUpgrades(id);
                        current[uKind] = lvl + 1;
                        save.carUpgrades[id] = current;
                        saveProgress();
                        resetRace();
                        renderMenu();
                    }
                });
                upRow.append(btn);
            }
            rightCol.append(upRow);
        }
        topLayout.append(leftCol, rightCol);
        card.append(topLayout);
        grid.append(card);
        menuContent.append(grid);
        appendMenuPager(pageIndex, CAR_ORDER.length, "Car", (next) => {
            menuPageIndex = next;
            renderMenu();
        });
    }
    function renderCareerMenu() {
        const statsGrid = document.createElement("div");
        statsGrid.className = "career-grid";
        const items = [
            ["Races Won", `${save.career.racesWon} / ${save.career.racesCompleted}`],
            ["Overtakes", `${save.career.totalOvertakes}`],
            ["Close Calls", `${save.career.totalNearMisses}`],
            ["Best Combo", `x${save.career.bestCombo}`],
            ["Top Speed", `${formatSpeedValue(save.career.topSpeedRecorded)} ${save.speedUnit.toUpperCase()}`],
            ["Endless Best", `${save.bestEndlessScore} Overtakes`],
        ];
        for (const [label, val] of items) {
            const card = document.createElement("div");
            card.className = "career-stat-card";
            card.innerHTML = `<span>${label}</span><strong>${val}</strong>`;
            statsGrid.append(card);
        }
        menuContent.append(statsGrid);
        const achList = document.createElement("div");
        achList.className = "achievement-list";
        for (const ach of ACHIEVEMENTS) {
            const unlocked = save.achievements.includes(ach.id);
            const item = document.createElement("div");
            item.className = `achievement-item${unlocked ? " unlocked" : ""}`;
            item.innerHTML = `<div><strong>${unlocked ? "🏅" : "🔒"} ${ach.title}</strong><span>${ach.desc}</span></div><span class="pill">${unlocked ? "Earned" : `+${ach.reward}`}</span>`;
            achList.append(item);
        }
        menuContent.append(achList);
    }
    function renderOptionsMenu() {
        const settings = document.createElement("div");
        settings.className = "settings-page";
        menuPageIndex = clamp(menuPageIndex, 0, 2);
        if (menuPageIndex === 0) {
            settings.append(createToggleRow("Fullscreen", isFullScreenActive(), () => {
                void toggleFullScreen();
            }), createToggleRow("Auto-Accelerate", save.autoAccelerate, () => {
                save.autoAccelerate = !save.autoAccelerate;
                saveProgress();
                renderMenu();
            }), createToggleRow("Hide Touch Controls", save.hideUiButtons, () => {
                save.hideUiButtons = !save.hideUiButtons;
                saveProgress();
                syncUiState();
                renderMenu();
            }), createActionRow("Speed Unit", save.speedUnit.toUpperCase(), () => {
                save.speedUnit = save.speedUnit === "kmh" ? "mph" : "kmh";
                saveProgress();
                updateHud();
                renderMenu();
            }));
        }
        else if (menuPageIndex === 1) {
            settings.append(createToggleRow("Master Audio", save.sound, () => {
                save.sound = !save.sound;
                saveProgress();
                syncMapBgm();
                renderMenu();
            }));
            if (save.sound) {
                settings.append(createRangeRow("BGM Volume", Math.round(getBgmVolume() * 100), (value) => {
                    save.bgmVolume = clamp(value / 100, 0, 1);
                    saveProgress();
                    applyMapBgmVolume();
                    syncMapBgm();
                }), createRangeRow("Engine Volume", Math.round(getCarSoundVolume() * 100), (value) => {
                    save.carSoundVolume = clamp(value / 100, 0, 1);
                    saveProgress();
                }), createRangeRow("SFX Volume", Math.round(getSfxVolume() * 100), (value) => {
                    save.sfxVolume = clamp(value / 100, 0, 1);
                    saveProgress();
                }));
            }
        }
        else {
            settings.append(createToggleRow("Motion Blur FX", save.motionBlur, () => {
                save.motionBlur = !save.motionBlur;
                saveProgress();
                renderMenu();
            }), createToggleRow("Reduced Motion", save.reducedMotion, () => {
                save.reducedMotion = !save.reducedMotion;
                saveProgress();
                renderMenu();
            }), createToggleRow("High-Contrast HUD", save.highContrastHud, () => {
                save.highContrastHud = !save.highContrastHud;
                saveProgress();
                syncUiState();
                renderMenu();
            }), createToggleRow("Compact HUD", save.compactHud, () => {
                save.compactHud = !save.compactHud;
                saveProgress();
                syncUiState();
                renderMenu();
            }), createActionRow("Reset Settings", "Defaults", () => {
                void resetOptionsToDefaults();
            }), createActionRow(confirmResetSave ? "Confirm Erase All Progress?" : "Career Save", confirmResetSave ? "ERASE SAVE" : "Reset Career", () => {
                if (!confirmResetSave) {
                    confirmResetSave = true;
                    renderMenu();
                    return;
                }
                save = createDefaultSave();
                saveProgress();
                resetRace();
                renderMenu();
            }));
            if (isLocalhost()) {
                settings.append(createToggleRow("Debug Mode", save.debugMode, () => {
                    save.debugMode = !save.debugMode;
                    if (!save.debugMode) {
                        save.unlimitedNitro = false;
                    }
                    saveProgress();
                    renderMenu();
                }));
                if (save.debugMode) {
                    settings.append(createActionRow("Debug Coins", `Add ${DEBUG_COIN_GRANT}`, () => {
                        save.coins += DEBUG_COIN_GRANT;
                        saveProgress();
                        updateHud();
                        renderMenu();
                    }), createToggleRow("Unlimited Nitro", save.unlimitedNitro, () => {
                        save.unlimitedNitro = !save.unlimitedNitro;
                        if (save.unlimitedNitro) {
                            player.nitro = NITRO_MAX;
                            player.nitroLocked = false;
                        }
                        saveProgress();
                        updateHud();
                        renderMenu();
                    }));
                }
            }
        }
        menuContent.append(settings);
        appendMenuPager(menuPageIndex, 3, "Settings", (next) => {
            menuPageIndex = next;
            renderMenu();
        });
    }
    function appendMenuPager(index, count, label, onChange) {
        const pager = document.createElement("nav");
        pager.className = "menu-pager";
        pager.setAttribute("aria-label", `${label} pages`);
        const previous = document.createElement("button");
        previous.type = "button";
        previous.className = "secondary pager-button";
        previous.textContent = "← Previous";
        previous.disabled = index === 0;
        previous.addEventListener("click", () => onChange(Math.max(0, index - 1)));
        const status = document.createElement("span");
        status.setAttribute("aria-live", "polite");
        status.textContent = `${label} ${index + 1} of ${count}`;
        const next = document.createElement("button");
        next.type = "button";
        next.className = "secondary pager-button";
        next.textContent = "Next →";
        next.disabled = index >= count - 1;
        next.addEventListener("click", () => onChange(Math.min(count - 1, index + 1)));
        pager.append(previous, status, next);
        menuContent.append(pager);
    }
    function createToggleRow(label, enabled, onClick) {
        const row = document.createElement("div");
        row.className = "option-row";
        row.innerHTML = `<div><strong>${label}</strong></div>`;
        const button = document.createElement("button");
        button.type = "button";
        button.className = enabled ? "primary" : "secondary";
        button.textContent = enabled ? "Yes" : "No";
        button.addEventListener("click", onClick);
        row.append(button);
        return row;
    }
    function createActionRow(label, action, onClick) {
        const row = document.createElement("div");
        row.className = "option-row";
        row.innerHTML = `<div><strong>${label}</strong></div>`;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "primary";
        button.textContent = action;
        button.addEventListener("click", onClick);
        row.append(button);
        return row;
    }
    function createRangeRow(label, value, onInput) {
        const row = document.createElement("div");
        row.className = "option-row";
        const content = document.createElement("div");
        content.innerHTML = `<strong>${label}</strong><span>${value}%</span>`;
        const input = document.createElement("input");
        input.type = "range";
        input.className = "option-range";
        input.min = "0";
        input.max = "100";
        input.step = "1";
        input.value = `${value}`;
        input.setAttribute("aria-label", label);
        input.addEventListener("input", () => {
            const nextValue = clamp(Math.round(Number(input.value) || 0), 0, 100);
            input.value = `${nextValue}`;
            const output = content.querySelector("span");
            if (output) {
                output.textContent = `${nextValue}%`;
            }
            onInput(nextValue);
        });
        row.append(content, input);
        return row;
    }
    function createMenuButton(title, detail, onClick, extraClass = "") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `option-button${extraClass ? ` ${extraClass}` : ""}`;
        button.innerHTML = `<strong>${title}</strong><span>${detail}</span>`;
        button.addEventListener("click", () => {
            raceMessage.hidden = true;
            onClick();
        });
        return button;
    }
    async function resetOptionsToDefaults() {
        save.hideUiButtons = false;
        save.autoAccelerate = true;
        save.sound = true;
        save.bgmVolume = DEFAULT_BGM_VOLUME;
        save.carSoundVolume = DEFAULT_CAR_SOUND_VOLUME;
        save.sfxVolume = DEFAULT_SFX_VOLUME;
        save.speedUnit = "kmh";
        save.motionBlur = true;
        save.reducedMotion = false;
        save.highContrastHud = false;
        save.compactHud = false;
        save.debugMode = false;
        save.unlimitedNitro = false;
        if (isFullScreenActive()) {
            try {
                await document.exitFullscreen();
            }
            catch {
                // Ignore fullscreen rejection.
            }
        }
        save.fullScreen = false;
        saveProgress();
        applyMapBgmVolume();
        syncMapBgm();
        syncUiState();
        renderMenu();
    }
    async function toggleFullScreen() {
        const wantsFullScreen = !isFullScreenActive();
        try {
            if (wantsFullScreen) {
                await document.documentElement.requestFullscreen();
            }
            else {
                await document.exitFullscreen();
            }
        }
        catch {
            syncFullScreenPreference();
        }
        syncFullScreenPreference();
        renderMenu();
    }
    function isFullScreenActive() {
        return Boolean(document.fullscreenElement);
    }
    function syncFullScreenPreference() {
        const isFullScreen = isFullScreenActive();
        if (save.fullScreen !== isFullScreen) {
            save.fullScreen = isFullScreen;
            saveProgress();
            return true;
        }
        return false;
    }
    // ---- Core Simulation Update ----
    function update(dt) {
        const map = getMapConfig(selectedMapId);
        pollGamepad();
        if (finishCelebrationSlowMo > 0) {
            finishCelebrationSlowMo = Math.max(0, finishCelebrationSlowMo - dt);
            dt *= 0.45;
            if (finishCelebrationSlowMo <= 0) {
                finishRace();
                return;
            }
        }
        raceTime += dt;
        if (comboTimer > 0) {
            comboTimer = Math.max(0, comboTimer - dt);
            if (comboTimer <= 0) {
                comboCount = 0;
            }
        }
        if (placeDeltaTimer > 0) {
            placeDeltaTimer = Math.max(0, placeDeltaTimer - dt);
        }
        // Star Power celebratory notes
        if (player.starTime > 0) {
            starMusicAccum += dt;
            if (starMusicAccum >= 0.16) {
                starMusicAccum = 0;
                const scale = [523, 659, 784, 1046, 880, 784, 659, 587];
                playTone(scale[Math.floor(raceTime * 6) % scale.length], scale[Math.floor(raceTime * 6) % scale.length], 0.12, "square", 0.08);
            }
        }
        const previousPlayerDistance = player.totalDistance;
        const previousPlayerOffset = player.x;
        const previousOpponentDistances = opponents.map((car) => car.totalDistance);
        const previousOpponentOffsets = opponents.map((car) => car.offset);
        updatePlayer(dt);
        updateOpponents(dt);
        updateItemBoxesAndShells(dt);
        updatePowerups();
        updateBoostPads();
        updateHazards();
        updateRoadCoins(dt);
        updateAirstrikes();
        if (finishCelebrationSlowMo <= 0) {
            resolveCollisions(previousPlayerDistance, previousPlayerOffset, previousOpponentDistances, previousOpponentOffsets);
            checkOvertakesAndNearMisses(previousPlayerDistance);
        }
        impactEffects = impactEffects.filter((effect) => raceTime - effect.start <= effect.duration);
        for (let i = skidMarks.length - 1; i >= 0; i -= 1) {
            skidMarks[i].alpha -= dt * 0.08;
            if (skidMarks[i].alpha <= 0) {
                skidMarks.splice(i, 1);
            }
        }
        updateParticles(dt, map);
        const newLap = clamp(Math.floor(player.totalDistance / trackLength) + 1, 1, getRaceLaps());
        const sector = clamp(Math.floor((player.position / trackLength) * 3), 0, 2);
        if (sector !== lastSectorIndex && sector > lastSectorIndex) {
            const splitTime = raceTime - lapStartTime;
            const prevBest = bestSectorTimes[lastSectorIndex];
            sectorTimes[lastSectorIndex] = splitTime;
            if (!prevBest || splitTime < prevBest) {
                bestSectorTimes[lastSectorIndex] = splitTime;
                if (prevBest) {
                    pushCallout(`SECTOR ${lastSectorIndex + 1} -${(prevBest - splitTime).toFixed(1)}s`, "green");
                }
            }
        }
        lastSectorIndex = sector;
        if (newLap > player.lap && player.totalDistance < trackLength * getRaceLaps()) {
            const lapDuration = raceTime - lapStartTime;
            const prevLapBest = currentBestLap;
            if (currentBestLap <= 0 || lapDuration < currentBestLap) {
                currentBestLap = lapDuration;
            }
            lapStartTime = raceTime;
            player.lap = newLap;
            const isFinal = newLap >= getRaceLaps() && save.raceMode !== "endless";
            playLapFanfare(isFinal);
            const deltaStr = prevLapBest > 0 ? ` (${lapDuration <= prevLapBest ? "-" : "+"}${Math.abs(lapDuration - prevLapBest).toFixed(1)}s)` : "";
            pushCallout(isFinal ? `FINAL LAP!${deltaStr}` : `LAP ${newLap}${deltaStr}`, isFinal ? "gold" : "cyan");
            if (save.raceMode === "knockout" && newLap >= knockoutNextLap) {
                knockoutNextLap += 1;
                eliminateLastPlace();
            }
        }
        if (save.raceMode === "endless") {
            endlessTimeLeft = Math.max(0, endlessTimeLeft - dt);
            if (endlessTimeLeft <= 0) {
                finishRace();
                return;
            }
        }
        const currentPlace = calculatePlace();
        if (currentPlace !== lastPlace) {
            placeDeltaValue = lastPlace - currentPlace;
            placeDeltaTimer = 1.6;
            lastPlace = currentPlace;
        }
        updateHud();
        if (save.raceMode !== "endless" && player.totalDistance >= trackLength * getRaceLaps() && finishCelebrationSlowMo <= 0) {
            lockedFinishPlace = calculatePlace();
            finishCelebrationSlowMo = save.reducedMotion ? 0.05 : 0.75;
        }
    }
    function eliminateLastPlace() {
        const active = opponents.filter((o) => !o.eliminated && !o.isTraffic);
        if (active.length === 0)
            return;
        const sorted = [...active].sort((a, b) => a.totalDistance - b.totalDistance);
        const victim = sorted[0];
        if (victim.totalDistance < player.totalDistance) {
            victim.eliminated = true;
            pushCallout(`${victim.name.toUpperCase()} KNOCKED OUT!`, "red");
        }
        else {
            playerKnockedOut = true;
            pushCallout("ELIMINATED!", "red");
            finishRace();
        }
    }
    function updatePlayer(dt) {
        const map = getMapConfig(selectedMapId);
        const car = getPlayerCar();
        const driver = getDriverStats(save.driver);
        const segment = findSegment(player.position);
        const speedRatio = clamp(player.speed / Math.max(1, maxSpeed), 0, 1);
        const braking = keys.has("arrowdown") || keys.has("s") || gamepadBrake;
        const manualGas = keys.has("arrowup") || keys.has("w") || gamepadThrottle;
        const accelerating = !braking && (save.autoAccelerate || manualGas);
        const steerLeft = keys.has("arrowleft") || keys.has("a");
        const steerRight = keys.has("arrowright") || keys.has("d");
        let targetSteer = 0;
        if (steerLeft && !steerRight)
            targetSteer = -1;
        else if (steerRight && !steerLeft)
            targetSteer = 1;
        if (Math.abs(gamepadSteer) > Math.abs(targetSteer))
            targetSteer = gamepadSteer;
        if (tiltEnabled && Math.abs(tiltSteerValue) > Math.abs(targetSteer))
            targetSteer = tiltSteerValue;
        player.steerInput += (targetSteer - player.steerInput) * Math.min(1, dt * 14);
        const unlimitedNitro = shouldUseUnlimitedNitro();
        if (unlimitedNitro) {
            player.nitro = NITRO_MAX;
            player.nitroLocked = false;
        }
        else if (player.nitro >= NITRO_START_THRESHOLD) {
            player.nitroLocked = false;
        }
        const nitroPressed = keys.has(" ") || keys.has("shift") || keys.has("n") || gamepadNitro;
        const canUseNitro = unlimitedNitro || (!player.nitroLocked && (player.nitroActive ? player.nitro > 0 : player.nitro >= NITRO_START_THRESHOLD));
        const wantsNitro = (nitroPressed && canUseNitro && !braking && player.stunTime <= 0) || player.overdriveTime > 0;
        if (wantsNitro && !lastNitroActive) {
            playNitroIgnition();
            cameraShake = Math.max(cameraShake, 4.5);
        }
        lastNitroActive = wantsNitro;
        player.nitroActive = wantsNitro;
        player.shieldTime = POWERUP_FLAGS.shield ? Math.max(0, player.shieldTime - dt) : 0;
        player.magnetTime = Math.max(0, player.magnetTime - dt);
        player.overdriveTime = Math.max(0, player.overdriveTime - dt);
        player.starTime = Math.max(0, player.starTime - dt);
        player.mushroomTime = Math.max(0, player.mushroomTime - dt);
        player.miniTurboTime = Math.max(0, player.miniTurboTime - dt);
        player.stunTime = Math.max(0, player.stunTime - dt);
        player.spinTime = Math.max(0, player.spinTime - dt);
        player.hazardSpinTime = Math.max(0, player.hazardSpinTime - dt);
        player.collisionCooldown = Math.max(0, player.collisionCooldown - dt);
        // Slipstream calculation
        let drafting = false;
        for (const opp of opponents) {
            if (opp.eliminated)
                continue;
            const aheadDist = opp.totalDistance - player.totalDistance;
            if (aheadDist > 160 && aheadDist < 950 && Math.abs(opp.offset - player.x) < 0.42 && player.speed > maxSpeed * 0.45) {
                drafting = true;
                break;
            }
        }
        player.slipstream = clamp(player.slipstream + (drafting ? dt * 0.95 : -dt * 1.4), 0, 1);
        const onRoad = Math.abs(player.x) <= 1 && player.airY <= 0;
        const wasDrifting = player.drifting;
        const handbrake = keys.has("c") || keys.has("control");
        const cornerLoad = Math.abs(segment.curve) * speedRatio ** 2;
        const wantsDrift = onRoad && (handbrake || (braking && cornerLoad > 0.22))
            && Math.abs(player.steerInput) > 0.28 && speedRatio > 0.35 && player.stunTime <= 0;
        if (wantsDrift && !wasDrifting) {
            player.driftDir = Math.sign(player.steerInput);
        }
        player.drifting = wantsDrift;
        if (player.drifting) {
            if (player.steerInput * segment.curve > 0 && cornerLoad > 0.22) {
                player.driftCharge = Math.min(2.1, player.driftCharge + dt * 1.5);
            }
            addSkidMark(player.position, player.x - 0.14);
            addSkidMark(player.position, player.x + 0.14);
            const pRect = getPlayerCarRect(raceTime);
            const sparkColor = player.driftCharge >= 1.75 ? "#ec4899" : player.driftCharge >= 1.05 ? "#fb923c" : player.driftCharge >= 0.45 ? "#38bdf8" : "rgba(220,225,235,0.5)";
            const pKind = player.driftCharge >= 0.45 ? "spark" : "smoke";
            spawnParticle(pRect.x + pRect.width * 0.22, pRect.y + pRect.height * 0.88, -60 - Math.random() * 80, -35, 5, 0.28, sparkColor, pKind);
            spawnParticle(pRect.x + pRect.width * 0.78, pRect.y + pRect.height * 0.88, 60 + Math.random() * 80, -35, 5, 0.28, sparkColor, pKind);
        }
        else if (wasDrifting && onRoad && player.stunTime <= 0 && !braking && player.driftCharge >= 0.45) {
            const tier = player.driftCharge >= 1.75 ? 3 : player.driftCharge >= 1.05 ? 2 : 1;
            const bonus = tier * 14;
            player.nitro = Math.min(NITRO_MAX, player.nitro + bonus);
            player.miniTurboTime = 0.55 + tier * 0.35;
            playNitroIgnition();
            pushCallout(tier === 3 ? "ULTRA MINI-TURBO!! 💜" : tier === 2 ? "SUPER MINI-TURBO! 🧡" : "MINI-TURBO! 💙", tier === 3 ? "red" : tier === 2 ? "gold" : "cyan");
            player.driftCharge = 0;
        }
        else if (!player.drifting) {
            player.driftCharge = 0;
        }
        const screechIntensity = player.drifting ? 0.9 : (braking && speedRatio > 0.4 ? 0.65 : (Math.abs(segment.curve) > 0.95 && speedRatio > 0.85 ? 0.35 : 0));
        updateTireScreech(screechIntensity);
        if (player.nitroActive && !unlimitedNitro && player.overdriveTime <= 0) {
            player.nitro = Math.max(0, player.nitro - NITRO_DRAIN / driver.nitro * dt);
            if (player.nitro <= 0) {
                player.nitro = 0;
                player.nitroActive = false;
                player.nitroLocked = true;
            }
        }
        else {
            player.nitro = Math.min(NITRO_MAX, player.nitro + NITRO_REGEN * dt);
        }
        const slope = (segment.p2.world.y - segment.p1.world.y) / SEGMENT_LENGTH;
        const slopeForce = -slope * 1800;
        const gearFloat = clamp(speedRatio * 5.99, 0, 5.99);
        player.gear = Math.floor(gearFloat) + 1;
        player.rpm = clamp(0.24 + (gearFloat % 1) * 0.72 + (player.nitroActive || player.mushroomTime > 0 ? 0.12 : 0), 0.18, 1);
        const currentMaxSpeed = getPlayerMaxSpeed();
        const gravel = Math.abs(player.x) > 1 && player.airY <= 0 && player.starTime <= 0 && player.mushroomTime <= 0 && player.overdriveTime <= 0;
        const surfaceGrip = gravel ? 0.62 : 1;
        const traction = car.grip * driver.grip * surfaceGrip;
        const speedLoad = (player.speed / currentMaxSpeed) ** 2;
        const boost = player.nitroActive ? NITRO_ACCEL * car.nitro : player.miniTurboTime > 0 ? 1.3 : 1;
        const poweredItem = player.mushroomTime > 0 || player.starTime > 0 || player.overdriveTime > 0;
        const power = ACCEL * car.accel * driver.acceleration * boost * (poweredItem ? 1.35 : 1);
        const drive = player.stunTime <= 0 && !braking && (accelerating || poweredItem || player.nitroActive || player.miniTurboTime > 0)
            ? power * Math.max(0, 1 - 0.68 * speedLoad) : 0;
        const rollingDrag = power * (0.07 + 0.25 * speedLoad);
        const brakeForce = BRAKE * driver.brakes * surfaceGrip * (braking ? (player.drifting ? 0.67 : 1) : handbrake ? 0.22 : 0);
        const stunDrag = player.stunTime > 0 ? DECEL : 0;
        player.speed += (drive - rollingDrag - brakeForce - stunDrag + slopeForce) * dt;
        const motionRatio = clamp(player.speed / maxSpeed, 0, 1.5);
        const brakingGrip = braking ? 0.8 : 1;
        const steeringAuthority = STEERING * brakingGrip * Math.min(1, motionRatio * 2.4) / (1 + motionRatio ** 2 * 0.8);
        const cornerPush = segment.curve * map.curvePull * motionRatio ** 2;
        const gripResponse = (player.drifting ? 4 : 13) * traction;
        const targetLateralSpeed = player.overdriveTime > 0 ? -player.x * 3
            : (player.stunTime <= 0 ? player.steerInput * steeringAuthority * traction : 0)
                - cornerPush / traction + (player.hazardSpinTime > 0 ? Math.sin(raceTime * 24) * 1.45 : 0);
        player.lateralSpeed += (targetLateralSpeed - player.lateralSpeed) * (1 - Math.exp(-gripResponse * (player.airY > 0 ? 0.1 : 1) * dt));
        player.x += player.lateralSpeed * dt;
        if (gravel) {
            const shieldAssist = POWERUP_FLAGS.shield && player.shieldTime > 0 ? 0.35 : 1;
            player.speed -= OFFROAD_DECEL * shieldAssist * (0.15 + 0.85 * motionRatio) * dt;
            if (player.speed > 900 && Math.random() < 0.7) {
                const pRect = getPlayerCarRect(raceTime);
                spawnParticle(pRect.x + Math.random() * pRect.width, pRect.y + pRect.height * 0.9, (Math.random() - 0.5) * 90, -45, 5, 0.35, map.palette.grass1, "dust");
            }
        }
        if (Math.abs(player.x) > 1.44) {
            const side = Math.sign(player.x);
            player.x = side * 1.44;
            const impact = Math.max(0, player.lateralSpeed * side);
            if (impact > 0)
                player.lateralSpeed = -side * impact * 0.25;
            player.speed -= (impact * 360 + player.speed * dt * 0.7);
            if (player.speed > 1200 && player.collisionCooldown <= 0) {
                player.collisionCooldown = 0.22;
                cameraShake = Math.max(cameraShake, 3);
                const pRect = getPlayerCarRect(raceTime);
                spawnBurst(player.x > 0 ? pRect.x + pRect.width : pRect.x, pRect.y + pRect.height * 0.65, 5, "#ffcf42", "spark", 180);
            }
        }
        const nextSeg = segments[(segment.index + 1) % segments.length];
        const nextSlope = (nextSeg.p2.world.y - nextSeg.p1.world.y) / SEGMENT_LENGTH;
        if (player.airY <= 0 && slope - nextSlope > 0.25 && speedRatio > 0.78) {
            player.airVy = 320 * speedRatio;
        }
        if (player.airY > 0 || player.airVy > 0) {
            player.airY += player.airVy * dt;
            player.airVy -= 1150 * dt;
            if (player.airY <= 0) {
                player.airY = 0;
                player.airVy = 0;
                cameraShake = Math.max(cameraShake, 3);
            }
        }
        if ((player.nitroActive || player.overdriveTime > 0 || player.mushroomTime > 0 || player.starTime > 0) && Math.random() < 0.85) {
            const pRect = getPlayerCarRect(raceTime);
            const flameColor = player.starTime > 0 ? "#facc15" : player.overdriveTime > 0 ? "#c084fc" : "#38bdf8";
            spawnParticle(pRect.x + pRect.width * 0.34, pRect.y + pRect.height * 0.86, (Math.random() - 0.5) * 30, 80, 5, 0.16, flameColor, "flame");
            spawnParticle(pRect.x + pRect.width * 0.66, pRect.y + pRect.height * 0.86, (Math.random() - 0.5) * 30, 80, 5, 0.16, flameColor, "flame");
        }
        player.speed = Math.max(0, player.speed);
        player.totalDistance += player.speed * dt;
        player.position = positiveModulo(player.totalDistance, trackLength);
        const dispSpeed = getPlayerDisplaySpeed();
        if (dispSpeed > raceTopSpeed) {
            raceTopSpeed = dispSpeed;
        }
        const targetPitch = clamp(-slope * 0.45, -0.35, 0.35);
        cameraPitch += (targetPitch - cameraPitch) * Math.min(1, dt * 6);
        const targetRoll = clamp((-player.steerInput * 0.018 - segment.curve * 0.012) * speedRatio, -0.04, 0.04);
        cameraRoll += (targetRoll - cameraRoll) * Math.min(1, dt * 7);
        cameraShake = Math.max(0, cameraShake - dt * 16);
    }
    // ---- AI Opponents ----
    function updateOpponents(dt) {
        const diff = getDifficultySettings();
        for (const car of opponents) {
            if (car.eliminated)
                continue;
            car.shieldTime = POWERUP_FLAGS.shield ? Math.max(0, car.shieldTime - dt) : 0;
            car.stunTime = Math.max(0, car.stunTime - dt);
            car.spinTime = Math.max(0, car.spinTime - dt);
            car.shrunkTime = Math.max(0, car.shrunkTime - dt);
            if (!car.isTraffic && car.stunTime <= 0) {
                const segment = findSegment(car.position);
                const wantsAiNitro = Math.abs(segment.curve) < 0.35 && car.totalDistance < player.totalDistance + 900 && car.nitro > 35 && (save.difficulty !== "rookie" || Math.sin(raceTime + car.seed) > 0.4);
                car.nitroActive = wantsAiNitro;
                if (car.nitroActive) {
                    car.nitro = Math.max(0, car.nitro - NITRO_DRAIN * 0.8 * dt);
                }
                else {
                    car.nitro = Math.min(NITRO_MAX, car.nitro + NITRO_REGEN * dt);
                }
            }
            else {
                car.nitroActive = false;
            }
            const trafficIntent = getOpponentTrafficIntent(car);
            car.targetLaneOffset = trafficIntent.targetOffset;
            car.blockedBy = trafficIntent.blockedBy;
            const laneDiff = car.targetLaneOffset - car.offset;
            car.turnSignal = Math.abs(laneDiff) > 0.14 ? (laneDiff > 0 ? 1 : -1) : 0;
            car.offset += laneDiff * Math.min(1, dt * (car.trait === "aggressive" ? 1.2 : 0.88));
            const targetSpeed = getOpponentTargetSpeed(car, trafficIntent.followSpeed, diff.aiScale) * (car.shrunkTime > 0 ? 0.65 : 1);
            car.braking = targetSpeed < car.speed * 0.88 || trafficIntent.followSpeed !== undefined;
            if (car.stunTime > 0) {
                car.speed = Math.max(0, car.speed - DECEL * 2.2 * dt);
            }
            else {
                car.speed += clamp((targetSpeed - car.speed) * 3, -BRAKE, ACCEL * getCarConfig(car.carId).accel) * dt;
                if (Math.abs(car.offset) > 1)
                    car.speed -= OFFROAD_DECEL * dt;
            }
            car.speed = Math.max(0, car.speed);
            car.totalDistance += car.speed * dt;
            car.position = positiveModulo(car.totalDistance, trackLength);
            if (save.raceMode === "endless" && player.totalDistance - car.totalDistance > trackLength * 0.35) {
                car.totalDistance = player.totalDistance + trackLength * 0.45 + Math.random() * 1600;
                car.position = positiveModulo(car.totalDistance, trackLength);
                car.overtakenAwarded = false;
            }
        }
    }
    function getOpponentTrafficIntent(car) {
        if (raceTime < car.avoidanceLockUntil && isLaneSafeForOpponent(car, car.targetLaneOffset)) {
            return { targetOffset: car.targetLaneOffset, blockedBy: car.blockedBy };
        }
        for (const hz of hazards) {
            const d = positiveModulo(hz.position - car.position, trackLength);
            if (d > 40 && d < 560 && Math.abs(hz.offset - car.offset) < hz.width + 0.14) {
                const safe = chooseOpponentPassLane(car);
                if (safe !== undefined) {
                    car.avoidanceLockUntil = raceTime + 0.7;
                    return { targetOffset: safe };
                }
            }
        }
        const blocker = findBlockingTarget(car);
        if (!blocker) {
            const targetOffset = getDefaultOpponentTargetOffset(car);
            car.avoidanceLockUntil = 0;
            return { targetOffset };
        }
        const passLane = chooseOpponentPassLane(car);
        if (passLane !== undefined) {
            car.avoidanceLockUntil = raceTime + OPPONENT_OVERTAKE_LOCK_TIME;
            return {
                targetOffset: passLane,
                blockedBy: blocker.id,
            };
        }
        car.avoidanceLockUntil = 0;
        return {
            targetOffset: getNearestLaneOffset(car.offset),
            followSpeed: blocker.speed * OPPONENT_FOLLOW_SPEED_RATIO,
            blockedBy: blocker.id,
        };
    }
    function getDefaultOpponentTargetOffset(car) {
        if (car.trait === "blocker" && Math.abs(player.totalDistance - car.totalDistance) < 700 && car.totalDistance > player.totalDistance) {
            return clamp(player.x * 0.7, -0.65, 0.65);
        }
        const laneIndex = Math.abs(Math.floor(car.totalDistance / 2600 + car.seed)) % LANE_OFFSETS.length;
        const wave = Math.sin(car.totalDistance * 0.0012 + car.seed) * 0.035;
        return clamp(LANE_OFFSETS[laneIndex] * 0.78 + car.laneBias * 0.22 + wave, -0.72, 0.72);
    }
    function findBlockingTarget(car) {
        const blockers = getRaceTargetsForAvoidance(car)
            .map((target) => ({
            ...target,
            distance: target.totalDistance - car.totalDistance,
        }))
            .filter((target) => {
            if (target.distance <= 0 || target.distance > OPPONENT_LOOKAHEAD_DISTANCE) {
                return false;
            }
            if (Math.abs(target.offset - car.offset) >= OPPONENT_LANE_CLEARANCE) {
                return false;
            }
            const closing = car.speed > target.speed * 1.02;
            const close = target.distance <= OPPONENT_PASS_COMMIT_DISTANCE;
            return closing || close;
        })
            .sort((a, b) => a.distance - b.distance);
        return blockers[0];
    }
    function chooseOpponentPassLane(car) {
        for (const laneOffset of getOpponentPassLaneCandidates(car)) {
            if (isLaneSafeForOpponent(car, laneOffset)) {
                return laneOffset;
            }
        }
        return undefined;
    }
    function getOpponentPassLaneCandidates(car) {
        const currentIndex = getNearestLaneIndex(car.offset);
        const currentLane = LANE_OFFSETS[currentIndex];
        const preferredDirection = car.laneBias >= 0 ? 1 : -1;
        return LANE_OFFSETS
            .filter((_, index) => index !== currentIndex)
            .slice()
            .sort((a, b) => {
            const aIndex = LANE_OFFSETS.indexOf(a);
            const bIndex = LANE_OFFSETS.indexOf(b);
            const aDistance = Math.abs(aIndex - currentIndex);
            const bDistance = Math.abs(bIndex - currentIndex);
            if (aDistance !== bDistance) {
                return aDistance - bDistance;
            }
            const aDirection = Math.sign(a - currentLane) || preferredDirection;
            const bDirection = Math.sign(b - currentLane) || preferredDirection;
            if (aDirection === preferredDirection && bDirection !== preferredDirection) {
                return -1;
            }
            if (bDirection === preferredDirection && aDirection !== preferredDirection) {
                return 1;
            }
            return 0;
        });
    }
    function isLaneSafeForOpponent(car, laneOffset) {
        for (const target of getRaceTargetsForAvoidance(car)) {
            if (Math.abs(target.offset - laneOffset) >= OPPONENT_LANE_CLEARANCE) {
                continue;
            }
            const distance = target.totalDistance - car.totalDistance;
            if (distance >= 0 && distance < OPPONENT_SAFE_FRONT_GAP) {
                return false;
            }
            if (distance < 0 && -distance < OPPONENT_SAFE_REAR_GAP) {
                return false;
            }
        }
        return true;
    }
    function getRaceTargetsForAvoidance(car) {
        const targets = [
            {
                id: "player",
                totalDistance: player.totalDistance,
                offset: player.x,
                speed: player.speed,
            },
        ];
        for (const opponent of opponents) {
            if (opponent.id === car.id || opponent.eliminated) {
                continue;
            }
            targets.push({
                id: opponent.id,
                totalDistance: opponent.totalDistance,
                offset: opponent.offset,
                speed: opponent.speed,
            });
        }
        return targets;
    }
    function getNearestLaneOffset(offset) {
        return LANE_OFFSETS[getNearestLaneIndex(offset)];
    }
    function getNearestLaneIndex(offset) {
        let bestIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let index = 0; index < LANE_OFFSETS.length; index += 1) {
            const distance = Math.abs(LANE_OFFSETS[index] - offset);
            if (distance < bestDistance) {
                bestIndex = index;
                bestDistance = distance;
            }
        }
        return bestIndex;
    }
    function getOpponentTargetSpeed(car, followSpeed, aiScale) {
        const nitroMult = car.nitroActive ? 1.14 : 1;
        const balance = getOpponentSpeedBalance(selectedMapId, car.carId, player.carId);
        const config = getCarConfig(car.carId);
        let targetSpeed = car.baseSpeed * nitroMult;
        if (!car.isTraffic && car.totalDistance > player.totalDistance && balance) {
            const configuredSpeed = BASE_MAX_SPEED * config.maxSpeed * aiScale;
            targetSpeed = Math.min(targetSpeed, configuredSpeed * balance.aheadSpeedRatio);
        }
        if (!car.isTraffic && player.totalDistance - car.totalDistance > 2400 && save.difficulty !== "rookie") {
            targetSpeed *= 1.07;
        }
        for (let distance = 0; distance <= car.speed * 0.65; distance += SEGMENT_LENGTH * 3) {
            const curve = Math.abs(findSegment(car.position + distance).curve);
            const cornerSpeed = BASE_MAX_SPEED * Math.sqrt(config.grip / Math.max(0.1, curve * 1.55));
            targetSpeed = Math.min(targetSpeed, Math.sqrt(cornerSpeed ** 2 + 2 * BRAKE * 0.55 * distance));
        }
        if (followSpeed !== undefined) {
            targetSpeed = Math.min(targetSpeed, followSpeed);
        }
        return targetSpeed;
    }
    // ---- Powerups, Boost Pads, Hazards, Coins ----
    function updatePowerups() {
        const magnetRange = player.magnetTime > 0 ? 1.05 : PLAYER_ROAD_WIDTH;
        for (const item of powerups) {
            if (!isPowerupEnabled(item.kind) || raceTime < item.respawnAt) {
                continue;
            }
            if (shortestTrackDistance(item.position, player.position) <= 135 && Math.abs(item.offset - player.x) <= magnetRange) {
                collectPowerup(item);
                continue;
            }
            for (const car of opponents) {
                if (car.eliminated || car.isTraffic)
                    continue;
                if (shortestTrackDistance(item.position, car.position) <= 120 && Math.abs(item.offset - car.offset) <= OPPONENT_ROAD_WIDTH) {
                    item.respawnAt = raceTime + POWERUP_RESPAWN;
                    if (item.kind === "nitro")
                        car.nitro = NITRO_MAX;
                    else if (item.kind === "shield")
                        car.shieldTime = SHIELD_DURATION * 0.7;
                    break;
                }
            }
        }
    }
    function collectPowerup(item) {
        if (!isPowerupEnabled(item.kind)) {
            return;
        }
        item.respawnAt = raceTime + POWERUP_RESPAWN;
        playPickupSfx(item.kind);
        if (item.kind === "nitro") {
            player.nitro = Math.min(NITRO_MAX, player.nitro + 48);
            pushCallout("+48% NITRO", "gold");
            impactEffects.push({ position: player.position, offset: player.x, start: raceTime, duration: 0.45, shielded: true });
            return;
        }
        if (item.kind === "shield") {
            player.shieldTime = Math.max(player.shieldTime, SHIELD_DURATION);
            pushCallout("SHIELD ACTIVE", "cyan");
            impactEffects.push({ position: player.position, offset: player.x, start: raceTime, duration: 0.75, shielded: true });
            return;
        }
        if (item.kind === "magnet") {
            player.magnetTime = Math.max(player.magnetTime, MAGNET_DURATION);
            pushCallout("MAGNET ACTIVE", "gold");
            return;
        }
        if (item.kind === "overdrive") {
            player.overdriveTime = Math.max(player.overdriveTime, OVERDRIVE_DURATION);
            player.nitro = NITRO_MAX;
            cameraShake = Math.max(cameraShake, 6);
            pushCallout("HYPER OVERDRIVE!", "cyan");
            return;
        }
        if (item.kind === "emp") {
            pushCallout("EMP SHOCKWAVE!", "cyan");
            cameraShake = Math.max(cameraShake, 5);
            impactEffects.push({ position: player.position, offset: player.x, start: raceTime, duration: 0.8, shielded: true, color: "#6ff2ff" });
            for (const car of opponents) {
                if (!car.eliminated && shortestTrackDistance(car.position, player.position) < 1600) {
                    if (car.shieldTime > 0) {
                        car.shieldTime = 0;
                    }
                    else {
                        car.speed *= 0.58;
                        car.stunTime = Math.max(car.stunTime, 0.9);
                    }
                }
            }
            return;
        }
        pushCallout("AIRSTRIKE LAUNCHED!", "red");
        triggerAirstrike();
    }
    function updateBoostPads() {
        for (const pad of boostPads) {
            if (raceTime < pad.cooldownUntil)
                continue;
            if (shortestTrackDistance(pad.position, player.position) <= 110 && Math.abs(pad.offset - player.x) <= PLAYER_ROAD_WIDTH) {
                pad.cooldownUntil = raceTime + 1.5;
                player.speed = Math.max(player.speed, getPlayerMaxSpeed() * 1.08);
                player.mushroomTime = Math.max(player.mushroomTime, 0.7);
                player.nitro = Math.min(NITRO_MAX, player.nitro + 18);
                cameraShake = Math.max(cameraShake, 3.5);
                playNitroIgnition();
                pushCallout("BOOST ZIPPER! +18% NITRO", "cyan");
            }
        }
    }
    function updateHazards() {
        for (let i = hazards.length - 1; i >= 0; i -= 1) {
            const hz = hazards[i];
            if (raceTime < hz.cooldownUntil || player.airY > 12)
                continue;
            if (shortestTrackDistance(hz.position, player.position) <= 105 && Math.abs(hz.offset - player.x) <= hz.width) {
                hz.cooldownUntil = raceTime + 1.6;
                if (player.shieldTime > 0 || player.starTime > 0) {
                    pushCallout("HAZARD BLOCKED!", "cyan");
                    playCollisionSfx(0.5, true);
                }
                else {
                    player.hazardSpinTime = 0.65;
                    player.speed *= 0.82;
                    playCollisionSfx(0.6, false);
                    pushCallout(hz.kind === "oil" ? "OIL SLICK!" : hz.kind === "water" ? "HYDROPLANE!" : "DEEP SAND!", "red");
                    cameraShake = Math.max(cameraShake, 4.5);
                }
                continue;
            }
            if (hz.kind === "oil") {
                for (const car of opponents) {
                    if (car.eliminated)
                        continue;
                    if (shortestTrackDistance(hz.position, car.position) <= 105 && Math.abs(hz.offset - car.offset) <= hz.width) {
                        car.speed *= 0.45;
                        car.spinTime = 0.9;
                        car.stunTime = 0.7;
                        hazards.splice(i, 1);
                        break;
                    }
                }
            }
        }
    }
    function updateRoadCoins(dt) {
        const pickupDist = player.magnetTime > 0 ? 1.15 : PLAYER_ROAD_WIDTH;
        for (const coin of roadCoins) {
            if (raceTime < coin.respawnAt)
                continue;
            const d = shortestTrackDistance(coin.position, player.position);
            if (player.magnetTime > 0 && d < 650 && Math.abs(coin.offset - player.x) < 1.5) {
                coin.offset += (player.x - coin.offset) * Math.min(1, dt * 8);
            }
            if (d <= 115 && Math.abs(coin.offset - player.x) <= pickupDist) {
                coin.respawnAt = raceTime + 14;
                raceCoinsCollected += 10;
                player.raceCoins = Math.min(10, player.raceCoins + 1);
                playCoinSfx();
            }
        }
    }
    function updateAirstrikes() {
        if (!POWERUP_FLAGS.airstrike) {
            airstrikes = [];
            incomingWarning.hidden = true;
            return;
        }
        let playerTargeted = false;
        for (const strike of airstrikes) {
            if (!strike.hitApplied) {
                if (strike.target === "player")
                    playerTargeted = true;
                if (raceTime >= strike.impact) {
                    applyAirstrikeHit(strike);
                    strike.hitApplied = true;
                }
            }
        }
        incomingWarning.hidden = !playerTargeted || mode !== "race";
        airstrikes = airstrikes.filter((strike) => raceTime <= strike.end);
    }
    function triggerAirstrike() {
        if (!POWERUP_FLAGS.airstrike) {
            return;
        }
        const standings = getStandings();
        const leader = standings[0];
        const target = leader?.id === "player" ? standings[1] : leader;
        if (!target) {
            return;
        }
        airstrikes.push({
            target: target.id,
            start: raceTime,
            impact: raceTime + AIRSTRIKE_WINDUP,
            end: raceTime + AIRSTRIKE_DURATION,
            hitApplied: false,
        });
    }
    function applyAirstrikeHit(strike) {
        const state = getTargetState(strike.target);
        if (!state) {
            return;
        }
        const position = state.position();
        const offset = state.offset();
        const shielded = POWERUP_FLAGS.shield && state.shieldTime() > 0;
        if (shielded) {
            state.setShieldTime(Math.max(0.7, state.shieldTime() - 1.2));
            if (strike.target === "player") {
                pushCallout("AIRSTRIKE BLOCKED!", "cyan");
            }
            playCollisionSfx(0.7, true);
        }
        else {
            state.setSpeed(state.speed() * 0.28);
            state.setStunTime(Math.max(state.stunTime(), AIRSTRIKE_STUN));
            if (strike.target === "player") {
                cameraShake = Math.max(cameraShake, 12);
            }
            playAirstrikeExplosion();
        }
        impactEffects.push({
            position,
            offset,
            start: raceTime,
            duration: shielded ? 0.7 : 1.05,
            shielded,
        });
    }
    function getStandings() {
        const standings = [
            { id: "player", distance: player.totalDistance },
        ];
        for (const car of opponents) {
            if (!car.eliminated && !car.isTraffic) {
                standings.push({ id: car.id, distance: car.totalDistance });
            }
        }
        return standings.sort((a, b) => b.distance - a.distance);
    }
    function getTargetState(id) {
        if (id === "player") {
            return {
                position: () => player.position,
                offset: () => player.x,
                speed: () => player.speed,
                shieldTime: () => player.shieldTime,
                stunTime: () => player.stunTime,
                setSpeed: (speed) => {
                    player.speed = speed;
                },
                setShieldTime: (time) => {
                    player.shieldTime = time;
                },
                setStunTime: (time) => {
                    player.stunTime = time;
                },
            };
        }
        const car = opponents.find((candidate) => candidate.id === id);
        if (!car) {
            return undefined;
        }
        return {
            position: () => car.position,
            offset: () => car.offset,
            speed: () => car.speed,
            shieldTime: () => car.shieldTime,
            stunTime: () => car.stunTime,
            setSpeed: (speed) => {
                car.speed = speed;
            },
            setShieldTime: (time) => {
                car.shieldTime = time;
            },
            setStunTime: (time) => {
                car.stunTime = time;
            },
        };
    }
    // ---- Collisions & Overtake Detection ----
    function checkOvertakesAndNearMisses(previousPlayerDistance) {
        for (const car of opponents) {
            if (car.eliminated)
                continue;
            const crossed = previousPlayerDistance < car.totalDistance && player.totalDistance >= car.totalDistance;
            if (!crossed)
                continue;
            if (player.speed <= car.speed * 0.95 || raceTime - car.lastOvertakenAt < 1.8)
                continue;
            if (car.isTraffic && car.overtakenAwarded)
                continue;
            car.overtakenAwarded = true;
            car.lastOvertakenAt = raceTime;
            const lateralDist = Math.abs(player.x - car.offset);
            const isNearMiss = lateralDist < 0.72 && player.speed > maxSpeed * 0.65;
            raceOvertakes += 1;
            endlessScore += 1;
            comboCount += 1;
            comboTimer = COMBO_WINDOW;
            player.nitro = Math.min(NITRO_MAX, player.nitro + 8);
            playOvertakeWhoosh(comboCount);
            if (save.raceMode === "endless") {
                endlessTimeLeft = Math.min(60, endlessTimeLeft + 2.5);
            }
            if (isNearMiss) {
                raceNearMisses += 1;
                pushCallout(`CLOSE CALL! x${comboCount} +25`, "gold");
            }
            else {
                pushCallout(`OVERTAKE! x${comboCount}`, "green");
            }
        }
    }
    function resolveCollisions(previousPlayerDistance, previousPlayerOffset, previousOpponentDistances, previousOpponentOffsets) {
        resolvePlayerOpponentCollisions(previousPlayerDistance, previousPlayerOffset, previousOpponentDistances, previousOpponentOffsets);
        resolveOpponentCollisions(previousOpponentDistances, previousOpponentOffsets);
    }
    function resolvePlayerOpponentCollisions(previousPlayerDistance, previousPlayerOffset, previousOpponentDistances, previousOpponentOffsets) {
        for (const car of opponents) {
            if (car.eliminated)
                continue;
            const gap = car.totalDistance - player.totalDistance;
            const previousCarDistance = previousOpponentDistances[car.id] ?? car.totalDistance;
            const previousCarOffset = previousOpponentOffsets[car.id] ?? car.offset;
            const previousGap = previousCarDistance - previousPlayerDistance;
            const closeCollision = Math.abs(gap) <= COLLISION_DEPTH;
            const playerPassedOpponent = previousGap > 0 && gap <= 0;
            const opponentPassedPlayer = previousGap < 0 && gap >= 0;
            const lateralCollision = sweptCollision(previousGap, gap, previousPlayerOffset - previousCarOffset, player.x - car.offset, (PLAYER_ROAD_WIDTH + OPPONENT_ROAD_WIDTH) * 0.5);
            if (lateralCollision) {
                if (!closeCollision && !playerPassedOpponent && !opponentPassedPlayer) {
                    continue;
                }
                const playerSpeedBeforeCollision = player.speed;
                const opponentHitPlayerFromBack = opponentPassedPlayer || (previousGap < 0 && !playerPassedOpponent) || (previousGap === 0 && car.speed > player.speed);
                const sideSwipe = Math.abs(previousPlayerOffset - previousCarOffset) > 0.32 && closeCollision && !playerPassedOpponent && !opponentPassedPlayer;
                if (!opponentHitPlayerFromBack) {
                    const push = player.x >= car.offset ? 0.16 : -0.16;
                    player.x = clamp(player.x + push, -1.44, 1.44);
                    car.offset = clamp(car.offset - push * 0.85, -1.2, 1.2);
                }
                const pRect = getPlayerCarRect(raceTime);
                if (player.starTime > 0 || (POWERUP_FLAGS.shield && player.shieldTime > 0)) {
                    car.stunTime = Math.max(car.stunTime, player.starTime > 0 ? 0.9 : 0.35);
                    car.spinTime = player.starTime > 0 ? 1.0 : 0.4;
                    if (opponentHitPlayerFromBack) {
                        placeOpponentBehindPlayer(car);
                        applyOpponentRearEndPenalty(car, playerSpeedBeforeCollision);
                    }
                    else {
                        car.speed *= player.starTime > 0 ? 0.35 : 0.62;
                        pushCallout(player.starTime > 0 ? "⭐ STAR BASH!" : "SHIELD BASH!", player.starTime > 0 ? "gold" : "cyan");
                    }
                    playCollisionSfx(0.8, true);
                    spawnBurst(pRect.x + pRect.width * 0.5, pRect.y + pRect.height * 0.4, 10, player.starTime > 0 ? "#facc15" : "#6ff2ff", "spark", 240);
                    impactEffects.push({ position: player.position, offset: player.x, start: raceTime, duration: 0.34, shielded: true });
                }
                else if (opponentHitPlayerFromBack) {
                    placeOpponentBehindPlayer(car);
                    const closingSpeed = Math.max(0, car.speed - playerSpeedBeforeCollision);
                    const massShare = getCarConfig(car.carId).mass / (getCarConfig(car.carId).mass + getPlayerCar().mass);
                    player.speed += closingSpeed * massShare * 0.85;
                    applyOpponentRearEndPenalty(car, playerSpeedBeforeCollision);
                    playCollisionSfx(0.6, false);
                }
                else if (sideSwipe) {
                    player.speed *= 0.98;
                    player.lateralSpeed = -player.lateralSpeed * 0.25;
                    cameraShake = Math.max(cameraShake, 4);
                    playCollisionSfx(0.55, false);
                    spawnBurst(pRect.x + pRect.width * 0.5, pRect.y + pRect.height * 0.5, 8, "#ffcf42", "spark", 200);
                }
                else {
                    raceCollisions += 1;
                    comboCount = 0;
                    comboTimer = 0;
                    placePlayerBehindOpponent(car);
                    const closingSpeed = Math.max(0, player.speed - car.speed);
                    const playerMass = getPlayerCar().mass;
                    const opponentMass = getCarConfig(car.carId).mass;
                    const impulse = closingSpeed * 1.05 / (1 / playerMass + 1 / opponentMass);
                    player.speed -= impulse / playerMass;
                    car.speed += impulse / opponentMass;
                    player.collisionCooldown = PLAYER_COLLISION_COOLDOWN;
                    cameraShake = Math.max(cameraShake, 2 + 6 * clamp(closingSpeed / maxSpeed, 0, 1));
                    playCollisionSfx(1.0, false);
                    spawnBurst(pRect.x + pRect.width * 0.5, pRect.y + pRect.height * 0.3, 12, "#ff5f5a", "spark", 260);
                    impactEffects.push({ position: player.position, offset: player.x, start: raceTime, duration: 0.38, shielded: false });
                }
            }
        }
    }
    function resolveOpponentCollisions(previousOpponentDistances, previousOpponentOffsets) {
        for (let a = 0; a < opponents.length; a += 1) {
            const first = opponents[a];
            if (first.eliminated)
                continue;
            for (let b = a + 1; b < opponents.length; b += 1) {
                const second = opponents[b];
                if (second.eliminated)
                    continue;
                const gap = second.totalDistance - first.totalDistance;
                const previousFirstDistance = previousOpponentDistances[first.id] ?? first.totalDistance;
                const previousSecondDistance = previousOpponentDistances[second.id] ?? second.totalDistance;
                const previousFirstOffset = previousOpponentOffsets[first.id] ?? first.offset;
                const previousSecondOffset = previousOpponentOffsets[second.id] ?? second.offset;
                const previousGap = previousSecondDistance - previousFirstDistance;
                const closeCollision = Math.abs(gap) <= COLLISION_DEPTH;
                const firstPassedSecond = previousGap > 0 && gap <= 0;
                const secondPassedFirst = previousGap < 0 && gap >= 0;
                if (!sweptCollision(previousGap, gap, previousFirstOffset - previousSecondOffset, first.offset - second.offset, OPPONENT_ROAD_WIDTH)) {
                    continue;
                }
                if (!closeCollision && !firstPassedSecond && !secondPassedFirst) {
                    continue;
                }
                if (secondPassedFirst || (previousGap < 0 && !firstPassedSecond) || (previousGap === 0 && second.speed > first.speed)) {
                    placeOpponentBehindOpponent(second, first);
                    applyOpponentRearEndPenalty(second, first.speed);
                }
                else {
                    placeOpponentBehindOpponent(first, second);
                    applyOpponentRearEndPenalty(first, second.speed);
                }
            }
        }
    }
    function sweptCollision(previousGap, gap, previousSideGap, sideGap, clearance) {
        const travel = gap - previousGap;
        if (Math.abs(travel) < 0.001) {
            return Math.abs(gap) <= COLLISION_DEPTH
                && Math.min(previousSideGap, sideGap) <= clearance && Math.max(previousSideGap, sideGap) >= -clearance;
        }
        const frontContact = (COLLISION_DEPTH - previousGap) / travel;
        const rearContact = (-COLLISION_DEPTH - previousGap) / travel;
        const enter = Math.max(0, Math.min(frontContact, rearContact));
        const leave = Math.min(1, Math.max(frontContact, rearContact));
        if (enter > leave)
            return false;
        const entrySide = interpolate(previousSideGap, sideGap, enter);
        const exitSide = interpolate(previousSideGap, sideGap, leave);
        return Math.min(entrySide, exitSide) <= clearance && Math.max(entrySide, exitSide) >= -clearance;
    }
    function placeOpponentBehindPlayer(car) {
        car.totalDistance = Math.max(0, player.totalDistance - COLLISION_SEPARATION);
        car.position = positiveModulo(car.totalDistance, trackLength);
    }
    function placePlayerBehindOpponent(car) {
        player.totalDistance = Math.max(0, car.totalDistance - COLLISION_SEPARATION);
        player.position = positiveModulo(player.totalDistance, trackLength);
    }
    function placeOpponentBehindOpponent(rear, front) {
        rear.totalDistance = Math.max(0, front.totalDistance - COLLISION_SEPARATION);
        rear.position = positiveModulo(rear.totalDistance, trackLength);
    }
    function applyOpponentRearEndPenalty(car, frontSpeed) {
        const closingSpeed = Math.max(0, car.speed - frontSpeed);
        car.speed = Math.min(car.speed, frontSpeed) - closingSpeed * 0.1;
        car.speed = Math.max(0, car.speed);
        car.stunTime = Math.max(car.stunTime, clamp(closingSpeed / BASE_MAX_SPEED, 0, 0.4));
    }
    function calculatePlace() {
        let place = 1;
        for (const car of opponents) {
            if (!car.eliminated && !car.isTraffic && car.totalDistance > player.totalDistance) {
                place += 1;
            }
        }
        return place;
    }
    // ---- HUD Sync ----
    function setTextCached(key, el, text) {
        if (hudCache[key] !== text) {
            hudCache[key] = text;
            el.textContent = text;
        }
    }
    function setWidthCached(key, el, width) {
        if (hudCache[key] !== width) {
            hudCache[key] = width;
            el.style.width = width;
        }
    }
    function updateHud() {
        const map = getMapConfig(selectedMapId);
        const dispSpeed = getPlayerDisplaySpeed();
        syncUiState();
        setTextCached("speed", hudSpeed, `${formatSpeedValue(dispSpeed)}`);
        setTextCached("speedUnit", hudSpeedUnit, save.speedUnit.toUpperCase());
        setTextCached("gear", hudGear, `G${player.gear}`);
        setWidthCached("rpmFill", hudRpmFill, `${Math.round(player.rpm * 100)}%`);
        setTextCached("nitro", hudNitro, `${Math.round(player.nitro)}%`);
        setWidthCached("nitroFill", hudNitroFill, `${clamp(player.nitro, 0, NITRO_MAX)}%`);
        const nitroLow = player.nitro < NITRO_START_THRESHOLD;
        if (hudCache.nitroLow !== (nitroLow ? "1" : "0")) {
            hudCache.nitroLow = nitroLow ? "1" : "0";
            nitroMeter.classList.toggle("low", nitroLow);
        }
        if (save.raceMode === "endless") {
            setTextCached("timer", hudTimer, `${endlessTimeLeft.toFixed(1)}s`);
            setTextCached("modeBadge", hudModeBadge, "ENDLESS");
            setTextCached("bestLap", hudBestLap, `Overtakes: ${endlessScore}`);
        }
        else {
            setTextCached("timer", hudTimer, formatRaceTime(raceTime));
            setTextCached("modeBadge", hudModeBadge, save.raceMode === "timetrial" ? "TRIAL" : save.raceMode === "knockout" ? "KO" : "RACE");
            setTextCached("bestLap", hudBestLap, currentBestLap > 0 ? `Best ${formatRaceTime(currentBestLap)}` : "Best --:--.-");
        }
        setTextCached("lap", hudLap, save.raceMode === "endless" ? `${player.lap}` : `${player.lap} / ${getRaceLaps()}`);
        let totalRacers = 1;
        for (let i = 0; i < opponents.length; i += 1) {
            if (!opponents[i].eliminated && !opponents[i].isTraffic)
                totalRacers += 1;
        }
        setTextCached("place", hudPlace, save.raceMode === "timetrial" ? "SOLO" : `${calculatePlace()} / ${totalRacers}`);
        if (placeDeltaTimer > 0 && placeDeltaValue !== 0 && save.raceMode !== "timetrial") {
            setTextCached("placeDelta", hudPlaceDelta, placeDeltaValue > 0 ? `▲${placeDeltaValue}` : `▼${Math.abs(placeDeltaValue)}`);
            const cls = `place-delta ${placeDeltaValue > 0 ? "up" : "down"}`;
            if (hudCache.placeDeltaCls !== cls) {
                hudCache.placeDeltaCls = cls;
                hudPlaceDelta.className = cls;
            }
        }
        else {
            setTextCached("placeDelta", hudPlaceDelta, "");
            if (hudCache.placeDeltaCls !== "place-delta") {
                hudCache.placeDeltaCls = "place-delta";
                hudPlaceDelta.className = "place-delta";
            }
        }
        if (hudRouteItem.hidden)
            hudRouteItem.hidden = false;
        setTextCached("route", hudRoute, selectedRaceDirection === "reverse" ? `${map.name} (R)` : map.name);
        // Coin Speed Bonus HUD
        setTextCached("raceCoins", hudRaceCoins, `🪙 ${player.raceCoins} / 10`);
        setTextCached("coinBonus", hudCoinSpeedBonus, `+${player.raceCoins}% SPD`);
        // Item Box Slot HUD
        if (player.rouletteTime > 0 && player.rouletteDisplay) {
            const m = KART_ITEM_META[player.rouletteDisplay];
            setTextCached("itemIcon", itemIcon, m.icon);
            setTextCached("itemName", itemName, "ROLLING...");
            setTextCached("itemHint", itemHint, "[E] / TAP TO LOCK");
            if (hudCache.itemState !== "spinning") {
                hudCache.itemState = "spinning";
                itemBoxHud.classList.add("spinning");
                itemBoxHud.classList.remove("ready");
            }
            if (!touchItem.hidden)
                touchItem.hidden = true;
        }
        else if (player.heldItem) {
            const m = KART_ITEM_META[player.heldItem];
            setTextCached("itemIcon", itemIcon, m.icon);
            setTextCached("itemName", itemName, m.label);
            setTextCached("itemHint", itemHint, "[E] / CLICK TO USE");
            if (hudCache.itemState !== "ready") {
                hudCache.itemState = "ready";
                itemBoxHud.classList.remove("spinning");
                itemBoxHud.classList.add("ready");
            }
            if (touchItem.hidden)
                touchItem.hidden = false;
            setTextCached("touchItem", touchItem, `${m.icon} USE`);
        }
        else {
            setTextCached("itemIcon", itemIcon, "?");
            setTextCached("itemName", itemName, "NO ITEM");
            setTextCached("itemHint", itemHint, "HIT ? BOX");
            if (hudCache.itemState !== "empty") {
                hudCache.itemState = "empty";
                itemBoxHud.classList.remove("spinning", "ready");
            }
            if (!touchItem.hidden)
                touchItem.hidden = true;
        }
        const raceTotalDist = Math.max(1, trackLength * getRaceLaps());
        const playerPct = save.raceMode === "endless" ? (player.position / trackLength) * 100 : clamp((player.totalDistance / raceTotalDist) * 100, 0, 100);
        setWidthCached("progFill", raceProgressFill, `${playerPct.toFixed(1)}%`);
        setTextCached("progLabel", raceProgressLabel, `${Math.round(playerPct)}%`);
        let pipIdx = 0;
        const ensurePip = () => {
            let pip = progressPipPool[pipIdx];
            if (!pip) {
                pip = document.createElement("i");
                progressPipPool.push(pip);
                raceProgressMarkers.append(pip);
            }
            pipIdx += 1;
            if (pip.hidden)
                pip.hidden = false;
            return pip;
        };
        if (save.raceMode !== "timetrial" && save.raceMode !== "endless") {
            for (let i = 0; i < opponents.length; i += 1) {
                const opp = opponents[i];
                if (opp.eliminated || opp.isTraffic)
                    continue;
                const pip = ensurePip();
                if (pip.className !== "progress-pip")
                    pip.className = "progress-pip";
                if (pip.style.background !== opp.paintColor)
                    pip.style.background = opp.paintColor;
                const leftStr = `${clamp((opp.totalDistance / raceTotalDist) * 100, 0, 100).toFixed(1)}%`;
                if (pip.style.left !== leftStr)
                    pip.style.left = leftStr;
            }
        }
        const playerPip = ensurePip();
        if (playerPip.className !== "progress-pip player")
            playerPip.className = "progress-pip player";
        if (playerPip.style.background !== "")
            playerPip.style.background = "";
        const playerLeftStr = `${playerPct.toFixed(1)}%`;
        if (playerPip.style.left !== playerLeftStr)
            playerPip.style.left = playerLeftStr;
        for (let i = pipIdx; i < progressPipPool.length; i += 1) {
            if (!progressPipPool[i].hidden)
                progressPipPool[i].hidden = true;
        }
        let buffIdx = 0;
        const pushBuff = (cls, name, val) => {
            let pill = buffPillPool[buffIdx];
            if (!pill) {
                pill = document.createElement("div");
                const nameEl = document.createElement("span");
                const valEl = document.createElement("strong");
                pill.append(nameEl, valEl);
                buffPillPool.push(pill);
                buffsHud.append(pill);
            }
            buffIdx += 1;
            if (pill.hidden)
                pill.hidden = false;
            const fullCls = `buff-pill ${cls}`;
            if (pill.className !== fullCls)
                pill.className = fullCls;
            const nameNode = pill.firstElementChild;
            const valNode = pill.lastElementChild;
            if (nameNode.textContent !== name)
                nameNode.textContent = name;
            if (valNode.textContent !== val)
                valNode.textContent = val;
        };
        if (player.starTime > 0)
            pushBuff("overdrive", "🌟 All-Star", `${player.starTime.toFixed(1)}s`);
        if (player.mushroomTime > 0)
            pushBuff("drift", "💠 Boost", `${player.mushroomTime.toFixed(1)}s`);
        if (player.shieldTime > 0 && player.starTime <= 0)
            pushBuff("shield", "🫧 Bubble", `${player.shieldTime.toFixed(1)}s`);
        if (player.magnetTime > 0)
            pushBuff("magnet", "🧲 Magnet", `${player.magnetTime.toFixed(1)}s`);
        if (player.overdriveTime > 0)
            pushBuff("overdrive", "🚀 Rocket", `${player.overdriveTime.toFixed(1)}s`);
        if (player.slipstream > 0.2)
            pushBuff("slipstream", "💨 Draft", `${Math.round(player.slipstream * 100)}%`);
        if (player.drifting) {
            const tier = player.driftCharge >= 1.75 ? "ULTRA" : player.driftCharge >= 1.05 ? "SUPER" : player.driftCharge >= 0.45 ? "MINI" : "DRIFT";
            pushBuff("drift", `🔥 ${tier}`, `${Math.round((player.driftCharge / 1.75) * 100)}%`);
        }
        for (let i = buffIdx; i < buffPillPool.length; i += 1) {
            if (!buffPillPool[i].hidden)
                buffPillPool[i].hidden = true;
        }
        if (buffsHud.hidden !== (buffIdx === 0))
            buffsHud.hidden = buffIdx === 0;
        if (comboCount > 0 && comboTimer > 0 && mode === "race") {
            if (comboHud.hidden)
                comboHud.hidden = false;
            setTextCached("comboMult", comboMultiplier, `x${comboCount}`);
            setTextCached("comboLabel", comboLabel, comboCount >= 4 ? "UNSTOPPABLE" : "OVERTAKE STREAK");
            setWidthCached("comboFill", comboTimerFill, `${Math.round((comboTimer / COMBO_WINDOW) * 100)}%`);
        }
        else if (!comboHud.hidden) {
            comboHud.hidden = true;
        }
    }
    function syncUiState() {
        const racing = mode === "race";
        const showingRace = racing || mode === "countdown";
        if (app.dataset.mode !== mode)
            app.dataset.mode = mode;
        if (app.dataset.menu !== menuView)
            app.dataset.menu = menuView;
        const titleStr = SHOW_TITLE_IMAGE_IN_MENUS ? "true" : "false";
        if (app.dataset.titleImage !== titleStr)
            app.dataset.titleImage = titleStr;
        const hcStr = save.highContrastHud ? "true" : "false";
        if (app.dataset.highContrast !== hcStr)
            app.dataset.highContrast = hcStr;
        const compactStr = save.compactHud ? "true" : "false";
        if (app.dataset.compactHud !== compactStr)
            app.dataset.compactHud = compactStr;
        if (miniMapCanvas.hidden !== !showingRace)
            miniMapCanvas.hidden = !showingRace;
        if (raceTimer.hidden !== !showingRace)
            raceTimer.hidden = !showingRace;
        if (mapStats.hidden !== !showingRace)
            mapStats.hidden = !showingRace;
        if (driveHud.hidden !== !showingRace)
            driveHud.hidden = !showingRace;
        if (raceProgressBar.hidden !== !showingRace)
            raceProgressBar.hidden = !showingRace;
        if (hudRouteItem.hidden !== !showingRace)
            hudRouteItem.hidden = !showingRace;
        const hideItemHud = !showingRace || save.raceMode === "timetrial";
        if (itemBoxHud.hidden !== hideItemHud)
            itemBoxHud.hidden = hideItemHud;
        if (coinBonusHud.hidden !== !showingRace)
            coinBonusHud.hidden = !showingRace;
        if (pauseButton.hidden !== !racing)
            pauseButton.hidden = !racing;
        const hideTouch = !racing || save.hideUiButtons;
        if (touchControls.hidden !== hideTouch)
            touchControls.hidden = hideTouch;
        if (touchGas.hidden !== save.autoAccelerate)
            touchGas.hidden = save.autoAccelerate;
        const hideCountdown = mode !== "countdown";
        if (countdownOverlay.hidden !== hideCountdown)
            countdownOverlay.hidden = hideCountdown;
        if (!racing || save.hideUiButtons) {
            releaseTouchControls();
        }
    }
    function formatRaceTime(time) {
        const safeTime = Math.max(0, time);
        const minutes = Math.floor(safeTime / 60);
        const seconds = Math.floor(safeTime % 60);
        const tenths = Math.floor((safeTime % 1) * 10);
        return `${minutes}:${seconds.toString().padStart(2, "0")}.${tenths}`;
    }
    // ---- Rendering ----
    function drawWhimsicalSkyline(ctx, mapId, horizon) {
        const { colors } = ROUTE_THEMES[mapId];
        const unit = Math.min(renderWidth, renderHeight);
        const random = createRandom(303 + getMapConfig(mapId).seed);
        for (let i = 0; i < 22; i += 1) {
            const x = random() * renderWidth;
            const y = horizon * (0.32 + random() * 0.42);
            const radius = unit * (0.009 + random() * 0.022);
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.moveTo(x, y - radius);
            ctx.quadraticCurveTo(x + radius * 0.24, y - radius * 0.24, x + radius, y);
            ctx.quadraticCurveTo(x + radius * 0.24, y + radius * 0.24, x, y + radius);
            ctx.quadraticCurveTo(x - radius * 0.24, y + radius * 0.24, x - radius, y);
            ctx.quadraticCurveTo(x - radius * 0.24, y - radius * 0.24, x, y - radius);
            ctx.fill();
        }
        for (let i = 0; i < 5; i += 1) {
            const x = renderWidth * (0.08 + i * 0.21);
            const y = horizon * (0.49 + (i % 2) * 0.18);
            const r = unit * (0.045 + (i % 3) * 0.015);
            ctx.strokeStyle = colors[(i + 1) % colors.length];
            ctx.fillStyle = colors[i % colors.length];
            ctx.lineWidth = r * 0.24;
            ctx.beginPath();
            if (mapId === "desert" || mapId === "night" || mapId === "coast") {
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(x, y, r * 1.45, r * 0.38, mapId === "coast" ? 0.4 : -0.32, 0, Math.PI * 2);
                ctx.stroke();
            }
            else if (mapId === "alpine") {
                ctx.moveTo(x, y - r);
                ctx.lineTo(x + r * 0.55, y);
                ctx.lineTo(x, y + r);
                ctx.lineTo(x - r * 0.55, y);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
            else if (mapId === "test") {
                ctx.moveTo(x - r, y - r);
                ctx.lineTo(x + r, y - r * 0.5);
                ctx.lineTo(x - r, y + r * 0.15);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(x - r, y - r);
                ctx.lineTo(x - r, y + r * 1.45);
                ctx.stroke();
            }
            else {
                ctx.ellipse(x, y, r * 0.85, r, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(x - r * 0.3, y + r * 0.85);
                ctx.lineTo(x - r * 0.2, y + r * 1.44);
                ctx.lineTo(x + r * 0.2, y + r * 1.44);
                ctx.lineTo(x + r * 0.3, y + r * 0.85);
                ctx.stroke();
            }
        }
    }
    function drawVectorSky(targetCtx, map, time) {
        const cacheH = Math.round(renderHeight * 1.3);
        const cacheKey = `${map.id}:${renderWidth}x${renderHeight}`;
        const baseHorizon = Math.round(renderHeight * 0.71);
        if (skyCacheCtx && (skyCacheKey !== cacheKey || skyCacheCanvas.width !== renderWidth || skyCacheCanvas.height !== cacheH)) {
            skyCacheCanvas.width = renderWidth;
            skyCacheCanvas.height = cacheH;
            skyCacheKey = cacheKey;
            const grad = skyCacheCtx.createLinearGradient(0, 0, 0, Math.max(1, baseHorizon));
            const theme = ROUTE_THEMES[map.id];
            grad.addColorStop(0, theme.sky);
            grad.addColorStop(1, theme.horizon);
            skyCacheCtx.fillStyle = grad;
            skyCacheCtx.fillRect(0, 0, renderWidth, cacheH);
            drawWhimsicalSkyline(skyCacheCtx, map.id, baseHorizon);
            if (map.skyline === "alpine" || map.skyline === "desert") {
                skyCacheCtx.fillStyle = map.skyline === "alpine" ? "rgba(30, 58, 138, 0.58)" : "rgba(124, 45, 18, 0.55)";
                skyCacheCtx.beginPath();
                skyCacheCtx.moveTo(0, cacheH);
                for (let i = 0; i <= 8; i += 1) {
                    const px = (i / 8) * renderWidth;
                    const py = baseHorizon - ((i % 2 === 1 ? 76 : 18) + ((i * 23) % 35));
                    skyCacheCtx.lineTo(px, py);
                }
                skyCacheCtx.lineTo(renderWidth, cacheH);
                skyCacheCtx.closePath();
                skyCacheCtx.fill();
            }
            else if (map.skyline === "urban" || map.skyline === "night") {
                skyCacheCtx.fillStyle = map.skyline === "night" ? "rgba(15, 23, 42, 0.85)" : "rgba(51, 65, 85, 0.42)";
                for (let x = -20; x < renderWidth + 60; x += 54) {
                    const h = 36 + (((x * 19) % 86) + 86) % 86;
                    skyCacheCtx.fillRect(x, baseHorizon - h, 40, h + (cacheH - baseHorizon));
                }
            }
        }
        const pitchOffset = Math.round(-clamp(cameraPitch, -0.55, 0.55) * renderHeight * 0.22) - Math.round(renderHeight * 0.15);
        if (skyCacheCtx) {
            targetCtx.drawImage(skyCacheCanvas, 0, pitchOffset);
        }
        if (map.skyline === "urban" || map.skyline === "alpine" || map.skyline === "desert") {
            const horizon = Math.round(renderHeight * clamp(0.56 - cameraPitch * 0.25, 0.28, 0.78));
            targetCtx.fillStyle = map.skyline === "desert" ? "rgba(255, 224, 178, 0.22)" : "rgba(255, 255, 255, 0.28)";
            const drift = (time * 16) % (renderWidth + 320);
            for (let i = 0; i < 6; i += 1) {
                const cx = ((i * 260 + drift) % (renderWidth + 240)) - 120;
                const cy = horizon * (0.2 + (i % 3) * 0.14);
                targetCtx.beginPath();
                targetCtx.ellipse(cx, cy, 78 + (i % 2) * 32, 18, 0, 0, Math.PI * 2);
                targetCtx.fill();
            }
        }
    }
    function render(time, dt) {
        const map = getMapConfig(selectedMapId);
        if (mode === "menu" && segments.length > 0) {
            attractPosition = positiveModulo(attractPosition + dt * 2800, trackLength);
            const seg = findSegment(attractPosition);
            const slope = (seg.p2.world.y - seg.p1.world.y) / SEGMENT_LENGTH;
            const targetPitch = clamp(-slope * 0.45, -0.35, 0.35);
            cameraPitch += (targetPitch - cameraPitch) * Math.min(1, dt * 5);
            cameraRoll += (0 - cameraRoll) * Math.min(1, dt * 5);
        }
        if (babylonState) {
            try {
                if (skyCtx) {
                    drawVectorSky(skyCtx, map, time);
                }
                renderBabylonScene(map, time);
            }
            catch (error) {
                console.warn("Overtake switched to the 2D renderer after a 3D rendering error.", error);
                const failedEngine = babylonState.engine;
                babylonState = null;
                failedEngine.dispose();
            }
        }
        if (babylonState) {
            let hasParticles = false;
            for (let i = 0; i < particles.length; i += 1) {
                if (particles[i].active) {
                    hasParticles = true;
                    break;
                }
            }
            const speedRatio = clamp(player.speed / Math.max(1, maxSpeed), 0, 1);
            const boostStrength = player.nitroActive || player.overdriveTime > 0 || player.mushroomTime > 0 || player.starTime > 0
                ? 1
                : clamp((speedRatio - 0.82) * 3.5, 0, 0.55);
            const hasSpeedLines = !save.reducedMotion && mode === "race" && boostStrength > 0.05;
            const showDebug = shouldShowDebugMode();
            const hasOverlay = hasParticles || hasSpeedLines || showDebug;
            if (hasOverlay || overlayWasDirty) {
                ctx.clearRect(0, 0, renderWidth, renderHeight);
                if (hasParticles || hasSpeedLines) {
                    ctx.save();
                    if (hasParticles)
                        drawParticles();
                    if (hasSpeedLines)
                        drawSpeedLines(time);
                    ctx.restore();
                }
            }
            overlayWasDirty = hasOverlay;
        }
        else {
            // Fallback 2D pseudo-3D rendering if WebGL is unavailable
            ctx.save();
            if (cameraShake > 0.1 && !save.reducedMotion && mode === "race") {
                ctx.translate((Math.random() - 0.5) * cameraShake * 2, (Math.random() - 0.5) * cameraShake * 2);
            }
            if (Math.abs(cameraRoll) > 0.001 && !save.reducedMotion && mode === "race") {
                ctx.translate(renderWidth / 2, renderHeight / 2);
                ctx.rotate(cameraRoll);
                ctx.translate(-renderWidth / 2, -renderHeight / 2);
            }
            drawBackground(map, time);
            if (segments.length > 0) {
                renderRoad(map);
                if (mode !== "menu") {
                    drawPlayerCar(raceTime);
                    drawPlayerAirstrikeAndImpactEffects(raceTime);
                }
            }
            drawParticles();
            drawSpeedLines(time);
            ctx.restore();
        }
        if (shouldShowDebugMode()) {
            drawDebugTelemetryOverlay();
        }
        if (mode === "race" || mode === "countdown") {
            miniMapFrameCounter += 1;
            if (miniMapFrameCounter % 2 === 1) {
                drawMiniMap(map);
            }
        }
    }
    function drawParticles() {
        ctx.save();
        for (const p of particles) {
            if (!p.active)
                continue;
            const alpha = clamp(p.life / p.maxLife, 0, 1);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            if (p.kind === "weather") {
                ctx.fillRect(p.x, p.y, p.size, p.size * (p.vy > 400 ? 6 : 1));
            }
            else if (p.kind === "confetti") {
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 0.65);
            }
            else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
    function drawSpeedLines(time) {
        if (save.reducedMotion || mode !== "race")
            return;
        const speedRatio = clamp(player.speed / Math.max(1, maxSpeed), 0, 1);
        const boostStrength = player.nitroActive || player.overdriveTime > 0 || player.mushroomTime > 0 || player.starTime > 0
            ? 1
            : clamp((speedRatio - 0.82) * 3.5, 0, 0.55);
        if (boostStrength <= 0.05)
            return;
        ctx.save();
        ctx.strokeStyle = player.starTime > 0 ? "rgba(250,204,21,0.5)" : player.overdriveTime > 0 ? "rgba(192,132,252,0.45)" : player.nitroActive ? "rgba(111,242,255,0.42)" : "rgba(255,255,255,0.22)";
        ctx.lineWidth = 2;
        const cx = renderWidth / 2;
        const cy = renderHeight * 0.48;
        const count = 22;
        for (let i = 0; i < count; i += 1) {
            const angle = (i / count) * Math.PI * 2 + Math.sin(time * 4 + i) * 0.08;
            const inner = Math.min(renderWidth, renderHeight) * (0.4 + ((time * 3 + i * 0.37) % 1) * 0.25);
            const outer = inner + renderWidth * 0.14 * boostStrength;
            ctx.globalAlpha = boostStrength * 0.7;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
            ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
            ctx.stroke();
        }
        ctx.restore();
    }
    function drawDebugTelemetryOverlay() {
        ctx.save();
        ctx.fillStyle = "rgba(5,7,10,0.72)";
        ctx.fillRect(14, renderHeight - 66, 330, 52);
        ctx.strokeStyle = "#ffcf42";
        ctx.strokeRect(14, renderHeight - 66, 330, 52);
        ctx.fillStyle = "#ffcf42";
        ctx.font = "700 13px monospace";
        ctx.fillText(`FPS: ${Math.round(fpsEstimate)} | 3D: ${babylonState ? "BABYLON.JS" : "2D"} | Seg: ${findSegment(player.position).index}/${segments.length}`, 24, renderHeight - 44);
        ctx.fillText(`Pos: ${Math.round(player.position)} | X: ${player.x.toFixed(2)} | G${player.gear}`, 24, renderHeight - 24);
        ctx.restore();
    }
    function drawMiniMap(map) {
        const width = miniMapCanvas.width;
        const height = miniMapCanvas.height;
        const scale = Math.min(width, height);
        if (miniMapPoints.length < 2) {
            mapCtx.clearRect(0, 0, width, height);
            mapCtx.fillStyle = "rgba(7, 11, 16, 0.72)";
            mapCtx.fillRect(0, 0, width, height);
            return;
        }
        const bgKey = `${map.id}:${selectedRaceDirection}:${width}x${height}:${trackLength}`;
        if (miniMapBgCtx && (miniMapBgKey !== bgKey || miniMapBgCanvas.width !== width || miniMapBgCanvas.height !== height)) {
            miniMapBgCanvas.width = width;
            miniMapBgCanvas.height = height;
            miniMapBgKey = bgKey;
            miniMapBgCtx.clearRect(0, 0, width, height);
            miniMapBgCtx.fillStyle = "rgba(7, 11, 16, 0.72)";
            miniMapBgCtx.fillRect(0, 0, width, height);
            const toX = (value) => value * width;
            const toY = (value) => value * height;
            miniMapBgCtx.save();
            miniMapBgCtx.lineCap = "round";
            miniMapBgCtx.lineJoin = "round";
            miniMapBgCtx.beginPath();
            miniMapBgCtx.moveTo(toX(miniMapPoints[0].x), toY(miniMapPoints[0].y));
            for (let index = 1; index < miniMapPoints.length; index += 1) {
                miniMapBgCtx.lineTo(toX(miniMapPoints[index].x), toY(miniMapPoints[index].y));
            }
            miniMapBgCtx.closePath();
            miniMapBgCtx.strokeStyle = "rgba(0, 0, 0, 0.78)";
            miniMapBgCtx.lineWidth = scale * 0.08;
            miniMapBgCtx.stroke();
            miniMapBgCtx.strokeStyle = map.palette.road1;
            miniMapBgCtx.lineWidth = scale * 0.048;
            miniMapBgCtx.stroke();
            miniMapBgCtx.strokeStyle = "rgba(255, 255, 255, 0.22)";
            miniMapBgCtx.lineWidth = Math.max(1, scale * 0.008);
            miniMapBgCtx.setLineDash([scale * 0.018, scale * 0.018]);
            miniMapBgCtx.stroke();
            miniMapBgCtx.setLineDash([]);
            for (const sFrac of [0.33, 0.66]) {
                const idx = Math.floor(miniMapPoints.length * sFrac);
                const pt = miniMapPoints[idx];
                if (pt) {
                    miniMapBgCtx.fillStyle = "#ffcf42";
                    miniMapBgCtx.beginPath();
                    miniMapBgCtx.arc(toX(pt.x), toY(pt.y), scale * 0.018, 0, Math.PI * 2);
                    miniMapBgCtx.fill();
                }
            }
            drawMiniMapFinishLine(scale, miniMapBgCtx, width, height);
            miniMapBgCtx.restore();
        }
        mapCtx.clearRect(0, 0, width, height);
        if (miniMapBgCtx) {
            mapCtx.drawImage(miniMapBgCanvas, 0, 0);
        }
        let leaderId;
        let bestDist = player.totalDistance;
        for (let i = 0; i < opponents.length; i += 1) {
            const car = opponents[i];
            if (!car.eliminated && !car.isTraffic && car.totalDistance > bestDist) {
                bestDist = car.totalDistance;
                leaderId = car.id;
            }
        }
        for (let i = 0; i < opponents.length; i += 1) {
            const car = opponents[i];
            if (car.eliminated)
                continue;
            const marker = getMiniMapMarker(car.position, car.offset);
            drawMiniMapDot(marker.x, marker.y, scale * (car.isTraffic ? 0.02 : 0.028), car.paintColor, leaderId === car.id);
        }
        const playerMarker = getMiniMapMarker(player.position, player.x);
        drawMiniMapPlayer(playerMarker.x, playerMarker.y, playerMarker.angle, scale * 0.044);
    }
    function drawMiniMapFinishLine(scale, targetCtx = mapCtx, width = miniMapCanvas.width, height = miniMapCanvas.height) {
        const point = miniMapPoints[FINISH_LINE_SEGMENT];
        const nextPoint = miniMapPoints[FINISH_LINE_SEGMENT + 1] ?? miniMapPoints[0];
        if (!point || !nextPoint) {
            return;
        }
        const px = point.x * width;
        const py = point.y * height;
        const dx = (nextPoint.x - point.x) * width;
        const dy = (nextPoint.y - point.y) * height;
        const angle = Math.atan2(dy, dx);
        const thickness = Math.max(5, scale * 0.034);
        const span = Math.max(16, scale * 0.13);
        const rows = 6;
        const columns = 2;
        const cellWidth = thickness / columns;
        const cellHeight = span / rows;
        targetCtx.save();
        targetCtx.translate(px, py);
        targetCtx.rotate(angle);
        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                targetCtx.fillStyle = (row + column) % 2 === 0 ? "#f7fbff" : "#05070a";
                targetCtx.fillRect(-thickness / 2 + column * cellWidth, -span / 2 + row * cellHeight, cellWidth, cellHeight);
            }
        }
        targetCtx.strokeStyle = "rgba(255, 255, 255, 0.84)";
        targetCtx.lineWidth = Math.max(1, scale * 0.006);
        targetCtx.strokeRect(-thickness / 2, -span / 2, thickness, span);
        targetCtx.restore();
    }
    function drawMiniMapDot(x, y, radius, color, isLeader = false) {
        const px = x * miniMapCanvas.width;
        const py = y * miniMapCanvas.height;
        mapCtx.save();
        mapCtx.fillStyle = color;
        mapCtx.strokeStyle = isLeader ? "#ffcf42" : "rgba(255, 255, 255, 0.9)";
        mapCtx.lineWidth = Math.max(1, radius * (isLeader ? 0.55 : 0.34));
        mapCtx.beginPath();
        mapCtx.arc(px, py, radius, 0, Math.PI * 2);
        mapCtx.fill();
        mapCtx.stroke();
        mapCtx.restore();
    }
    function drawMiniMapPlayer(x, y, angle, size) {
        const px = x * miniMapCanvas.width;
        const py = y * miniMapCanvas.height;
        const paint = getPlayerPaint();
        mapCtx.save();
        mapCtx.translate(px, py);
        mapCtx.rotate(angle + Math.PI / 2);
        mapCtx.fillStyle = paint.color || getPlayerCar().color;
        mapCtx.strokeStyle = "#ffffff";
        mapCtx.lineWidth = Math.max(1, size * 0.22);
        mapCtx.beginPath();
        mapCtx.moveTo(0, -size);
        mapCtx.lineTo(size * 0.72, size * 0.78);
        mapCtx.lineTo(0, size * 0.42);
        mapCtx.lineTo(-size * 0.72, size * 0.78);
        mapCtx.closePath();
        mapCtx.fill();
        mapCtx.stroke();
        mapCtx.restore();
    }
    // ---- Fallback 2D Renderer (used only when WebGL is unavailable) ----
    function drawBackground(map, time) {
        drawVectorSky(ctx, map, time);
        const horizon = Math.round(renderHeight * clamp(0.56 - cameraPitch * 0.25, 0.28, 0.78));
        ctx.fillStyle = map.palette.grass1;
        ctx.fillRect(0, horizon, renderWidth, renderHeight - horizon);
    }
    function renderRoad(map) {
        const activePosition = mode === "menu" ? attractPosition : player.position;
        const activeX = mode === "menu" ? Math.sin(attractPosition * 0.0005) * 0.25 : visualPlayerX;
        const baseSegment = findSegment(activePosition);
        const baseIndex = baseSegment.index;
        const basePercent = percentRemaining(activePosition, SEGMENT_LENGTH);
        const playerY = interpolate(baseSegment.p1.world.y, baseSegment.p2.world.y, basePercent);
        const cameraY = playerY + CAMERA_HEIGHT + player.airY * 0.6;
        const cameraX = activeX * ROAD_WIDTH;
        let currentCurveX = 0;
        let currentCurveDx = 0;
        let nextCurveX = 0;
        let nextCurveDx = 0;
        let maxY = renderHeight;
        for (let n = 0; n < DRAW_DISTANCE; n += 1) {
            const segment = segments[(baseIndex + n) % segments.length];
            const looped = segment.index < baseIndex;
            segment.clip = maxY;
            const p1CurveX = n === 0 ? currentCurveX : interpolate(currentCurveX, nextCurveX, basePercent);
            const p2CurveX = n === 0 ? currentCurveX + currentCurveDx : interpolate(currentCurveX + currentCurveDx, nextCurveX + nextCurveDx, basePercent);
            project(segment.p1, cameraX - p1CurveX, cameraY, activePosition - (looped ? trackLength : 0));
            project(segment.p2, cameraX - p2CurveX, cameraY, activePosition - (looped ? trackLength : 0));
            currentCurveX += currentCurveDx;
            currentCurveDx += segment.curve;
            if (n > 0) {
                nextCurveX += nextCurveDx;
                nextCurveDx += segment.curve;
            }
            if (segment.p1.camera.z <= getVisualCameraDepth() || segment.p2.screen.y >= segment.p1.screen.y || segment.p2.screen.y >= maxY) {
                continue;
            }
            const p1 = segment.p1.screen;
            const p2 = segment.p2.screen;
            ctx.fillStyle = segment.color.grass;
            ctx.fillRect(0, p2.y, renderWidth, p1.y - p2.y);
            drawQuad(p1.x - p1.w * 1.22, p1.y, p1.x + p1.w * 1.22, p1.y, p2.x + p2.w * 1.22, p2.y, p2.x - p2.w * 1.22, p2.y, segment.color.rumble);
            drawQuad(p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, segment.color.road);
            maxY = segment.p2.screen.y;
        }
        void map;
    }
    function getProjectedPoint(position, offset, nearClip = getVisualCameraDepth(), referencePosition = player.position) {
        const distance = positiveModulo(position - referencePosition, trackLength);
        if (distance <= 0 || distance > DRAW_DISTANCE * SEGMENT_LENGTH) {
            return undefined;
        }
        const segment = findSegment(position);
        const percent = percentRemaining(position, SEGMENT_LENGTH);
        const x = interpolate(segment.p1.screen.x, segment.p2.screen.x, percent);
        const y = interpolate(segment.p1.screen.y, segment.p2.screen.y, percent);
        const w = interpolate(segment.p1.screen.w, segment.p2.screen.w, percent);
        const scale = interpolate(segment.p1.screen.scale, segment.p2.screen.scale, percent);
        const cameraZ = interpolate(segment.p1.camera.z, segment.p2.camera.z, percent);
        if (cameraZ <= nearClip || !Number.isFinite(scale) || scale <= 0) {
            return undefined;
        }
        return {
            x: x + w * offset,
            y,
            w,
            scale,
            cameraZ,
            segment,
        };
    }
    function getFinishLineSegmentOffset(segmentIndex) {
        const offset = positiveModulo(segmentIndex - FINISH_LINE_SEGMENT, segments.length);
        return offset < FINISH_LINE_LENGTH_SEGMENTS ? offset : -1;
    }
    function drawPlayerCar(time) {
        const asset = getPlayerCar().asset;
        const rect = getPlayerCarRect(time);
        const paint = getPlayerPaint();
        drawAsset(asset, rect.x, rect.y, rect.width, rect.height, renderHeight, paint.color || undefined);
    }
    function getPlayerDisplaySpeed() {
        const currentMaxSpeed = getPlayerMaxSpeed();
        const displayTopSpeed = getPlayerDisplayTopSpeed();
        return (player.speed / Math.max(1, currentMaxSpeed)) * displayTopSpeed;
    }
    function getPlayerCarRect(time) {
        const meta = ASSET_BY_FILE[getPlayerCar().asset];
        const width = getPlayerCarDisplayWidth();
        const height = width * (meta.height / meta.width);
        const speedRatio = clamp(player.speed / Math.max(1, maxSpeed), 0, 1);
        const rumbleBounce = Math.abs(player.x) > 0.92 ? Math.sin(time * 38) * 2.5 * speedRatio : 0;
        const wobble = Math.sin(time * 18) * speedRatio * 2.2;
        const bottomGap = Math.max(18, renderHeight * 0.04) + renderHeight * NITRO_ZOOM_PLAYER_LIFT_RATIO * nitroZoomVisual + player.airY * 0.35;
        return {
            x: renderWidth / 2 - width / 2 + visualPlayerX * renderWidth * 0.07 + wobble,
            y: renderHeight - height - bottomGap + rumbleBounce,
            width,
            height,
        };
    }
    function getPlayerCarDisplayWidth() {
        return Math.min(renderWidth * PLAYER_MAX_SCREEN_WIDTH_RATIO, PLAYER_MAX_SCREEN_WIDTH) * interpolate(1, NITRO_ZOOM_PLAYER_SCALE, nitroZoomVisual);
    }
    function drawImpact(x, y, size, effect) {
        const progress = clamp((raceTime - effect.start) / effect.duration, 0, 1);
        const radius = size * interpolate(0.18, 1.12, progress);
        const alpha = 1 - progress;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = effect.color ?? (effect.shielded ? "#6ff2ff" : "#ffcf42");
        ctx.lineWidth = Math.max(2, size * 0.045);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    function drawAirstrikeWarning(x, y, size, strike) {
        const progress = clamp((raceTime - strike.start) / Math.max(0.001, strike.impact - strike.start), 0, 1);
        const radius = size * interpolate(0.64, 0.24, progress);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "#ff5f5a";
        ctx.lineWidth = Math.max(2, size * 0.04);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    function drawPlayerAirstrikeAndImpactEffects(time) {
        const rect = getPlayerCarRect(time);
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height * 0.48;
        for (const strike of airstrikes) {
            if (strike.target === "player" && !strike.hitApplied) {
                drawAirstrikeWarning(cx, cy, rect.width * 0.74, strike);
            }
        }
        for (const effect of impactEffects) {
            if (shortestTrackDistance(effect.position, player.position) < 80) {
                drawImpact(cx, cy, rect.width * 0.65, effect);
            }
        }
        void getProjectedPoint;
    }
    function drawAsset(asset, x, y, width, height, clipY = renderHeight, customColor) {
        if (height <= 0 || width <= 0 || y >= clipY)
            return;
        const visibleHeight = Math.min(height, clipY - y);
        if (visibleHeight <= 0)
            return;
        ctx.save();
        ctx.fillStyle = customColor ?? (asset.includes("veloce") ? "#3b82f6" : asset.includes("strada") ? "#facc15" : "#ef4444");
        ctx.fillRect(x, y, width, visibleHeight);
        ctx.restore();
    }
    function drawQuad(x1, y1, x2, y2, x3, y3, x4, y4, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.lineTo(x4, y4);
        ctx.closePath();
        ctx.fill();
    }
    // ---- Frame Loop ----
    function frame(now) {
        const rawDt = Math.max(0.001, (now - lastFrame) / 1000);
        const dt = Math.min(0.033, rawDt);
        fpsEstimate = fpsEstimate * 0.9 + (1 / rawDt) * 0.1;
        lastFrame = now;
        if (mode === "countdown") {
            updateCountdown(dt);
        }
        else if (mode === "race") {
            raceStepTime += Math.min(rawDt, 0.1);
            while (raceStepTime >= RACE_STEP && mode === "race") {
                raceStepTime -= RACE_STEP;
                update(RACE_STEP);
            }
        }
        else {
            updateParticles(dt, getMapConfig(selectedMapId));
        }
        if (mode !== "race")
            raceStepTime = 0;
        updateNitroZoomVisual(dt);
        updateVisualPlayerX(dt);
        updateEngineSound(dt);
        render(now / 1000, dt);
        requestAnimationFrame(frame);
    }
    function updateVisualPlayerX(dt) {
        if (mode !== "race") {
            visualPlayerX = player.x;
            return;
        }
        visualPlayerX += (player.x - visualPlayerX) * Math.min(1, dt * PLAYER_VISUAL_LATERAL_SMOOTHING);
        if (Math.abs(player.x - visualPlayerX) < 0.0005) {
            visualPlayerX = player.x;
        }
    }
    function updateNitroZoomVisual(dt) {
        if (mode === "paused") {
            return;
        }
        const target = mode === "race" && (player.nitroActive || player.overdriveTime > 0 || player.mushroomTime > 0 || player.miniTurboTime > 0 || player.starTime > 0) ? 1 : 0;
        const rate = target > nitroZoomVisual ? NITRO_ZOOM_IN_RATE : NITRO_ZOOM_OUT_RATE;
        nitroZoomVisual += (target - nitroZoomVisual) * Math.min(1, dt * rate);
    }
    // ---- Input: Keyboard, Touch, Tilt Gyro, Gamepad ----
    function pollGamepad() {
        const pads = navigator.getGamepads?.();
        if (!pads)
            return;
        let activePad = null;
        for (const p of pads) {
            if (p && p.connected) {
                activePad = p;
                break;
            }
        }
        if (!activePad) {
            gamepadSteer = 0;
            gamepadThrottle = false;
            gamepadBrake = false;
            gamepadNitro = false;
            return;
        }
        const axisX = activePad.axes[0] ?? 0;
        gamepadSteer = Math.abs(axisX) > 0.16 ? clamp(axisX, -1, 1) : 0;
        gamepadThrottle = Boolean(activePad.buttons[7]?.pressed || activePad.buttons[0]?.pressed);
        gamepadBrake = Boolean(activePad.buttons[6]?.pressed || activePad.buttons[1]?.pressed);
        gamepadNitro = Boolean(activePad.buttons[2]?.pressed || activePad.buttons[5]?.pressed);
        const itemPressed = Boolean(activePad.buttons[3]?.pressed || activePad.buttons[4]?.pressed);
        if (itemPressed && !gamepadPrevItem) {
            useHeldItem();
        }
        gamepadPrevItem = itemPressed;
        const pausePressed = Boolean(activePad.buttons[9]?.pressed);
        if (pausePressed && !gamepadPrevPause) {
            if (mode === "race")
                pauseRace();
            else if (mode === "paused")
                resumeRace();
        }
        gamepadPrevPause = pausePressed;
    }
    function handleDeviceOrientation(event) {
        if (!tiltEnabled || event.gamma === null)
            return;
        if (tiltBaselineGamma === null) {
            tiltBaselineGamma = event.gamma;
        }
        const delta = clamp((event.gamma - tiltBaselineGamma) / 28, -1, 1);
        tiltSteerValue = Math.abs(delta) < 0.08 ? 0 : delta;
    }
    async function toggleTiltSteering() {
        if (tiltEnabled) {
            tiltEnabled = false;
            tiltBaselineGamma = null;
            tiltSteerValue = 0;
            tiltToggle.setAttribute("aria-pressed", "false");
            tiltToggle.textContent = "TILT: OFF";
            return;
        }
        const devOrient = window.DeviceOrientationEvent;
        if (devOrient && typeof devOrient.requestPermission === "function") {
            try {
                const res = await devOrient.requestPermission();
                if (res !== "granted") {
                    pushCallout("TILT PERMISSION DENIED", "red");
                    return;
                }
            }
            catch {
                pushCallout("TILT UNAVAILABLE", "red");
                return;
            }
        }
        if (!("DeviceOrientationEvent" in window)) {
            pushCallout("GYRO NOT SUPPORTED", "red");
            return;
        }
        tiltEnabled = true;
        tiltBaselineGamma = null;
        tiltToggle.setAttribute("aria-pressed", "true");
        tiltToggle.textContent = "TILT: ON";
        pushCallout("TILT STEERING CALIBRATED", "cyan");
    }
    function bindEvents() {
        bindUiButtonSounds();
        document.addEventListener("pointerdown", (event) => {
            if (event.pointerType === "touch") {
                app.dataset.touchActive = "true";
            }
            ensureAudioContext();
            syncMapBgm();
        }, { capture: true });
        window.addEventListener("resize", () => {
            resize();
            releaseTouchControls();
        });
        window.addEventListener("blur", () => {
            keys.clear();
            releaseTouchControls();
        });
        window.addEventListener("deviceorientation", handleDeviceOrientation);
        window.addEventListener("keydown", (event) => {
            const key = event.key.toLowerCase();
            if (event.target instanceof HTMLSelectElement && key !== "escape")
                return;
            if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "shift", "n", "p", "e", "q", "f"].includes(key)) {
                event.preventDefault();
            }
            if (key === "escape" || key === "p") {
                if (mode === "race") {
                    pauseRace();
                }
                else if (mode === "paused") {
                    resumeRace();
                }
                else if (key === "escape" && menuView !== "main") {
                    menuView = "main";
                    renderMenu();
                }
                return;
            }
            if ((key === "e" || key === "q" || key === "f" || key === "enter") && mode === "race") {
                useHeldItem();
                return;
            }
            if (key === "r" && (mode === "race" || mode === "paused" || mode === "finished")) {
                startRace();
                return;
            }
            if (mode === "menu" && key === "backspace" && menuView !== "main") {
                menuView = "main";
                renderMenu();
                return;
            }
            keys.add(key);
        });
        window.addEventListener("keyup", (event) => {
            keys.delete(event.key.toLowerCase());
        });
        document.addEventListener("fullscreenchange", () => {
            syncFullScreenPreference();
            if (!menuPanel.hidden) {
                renderMenu();
            }
        });
        backButton.addEventListener("click", () => {
            menuView = "main";
            renderMenu();
        });
        resumeButton.addEventListener("click", resumeRace);
        pauseButton.addEventListener("click", pauseRace);
        pauseButton.addEventListener("contextmenu", (event) => event.preventDefault());
        itemBoxHud.addEventListener("click", useHeldItem);
        touchItem.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            useHeldItem();
        });
        bindTouchButton(touchLeft, "arrowleft");
        bindTouchButton(touchRight, "arrowright");
        bindTouchButton(touchGas, "arrowup");
        bindTouchButton(touchBrake, "arrowdown");
        bindTouchButton(touchNitro, "n");
        tiltToggle.addEventListener("click", () => {
            void toggleTiltSteering();
        });
    }
    function bindTouchButton(button, key) {
        function press(event) {
            event.preventDefault();
            if (!touchControls.hidden) {
                keys.add(key);
                button.classList.add("pressed");
                button.setPointerCapture(event.pointerId);
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
            }
        }
        function release(event) {
            event.preventDefault();
            keys.delete(key);
            button.classList.remove("pressed");
            if (button.hasPointerCapture(event.pointerId)) {
                button.releasePointerCapture(event.pointerId);
            }
        }
        button.addEventListener("pointerdown", press);
        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("lostpointercapture", () => {
            keys.delete(key);
            button.classList.remove("pressed");
        });
        button.addEventListener("contextmenu", (event) => event.preventDefault());
    }
    function releaseTouchControls() {
        for (const key of TOUCH_CONTROL_KEYS) {
            keys.delete(key);
        }
        touchLeft.classList.remove("pressed");
        touchRight.classList.remove("pressed");
        touchGas.classList.remove("pressed");
        touchBrake.classList.remove("pressed");
        touchNitro.classList.remove("pressed");
    }
    function init() {
        babylonState = initBabylonEngine();
        resize();
        resetRace();
        renderMenu();
        bindEvents();
        syncMapBgm();
        render(performance.now() / 1000, 0.016);
        hideLoadingScreen();
        requestAnimationFrame(frame);
    }
    void loadAssets().then(() => {
        init();
        if (window.parent !== window && window.location.origin !== "null") {
            window.parent.postMessage({ type: "givegigsgames:game-ready" }, window.location.origin);
        }
    });
})();
