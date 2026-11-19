(function() {
    'use strict';

    // =========================================================================
    // 1. DATA STRUCTURES, CONFIGURATIONS & ENUMS
    // =========================================================================
    const GameData = window.GraveGainGameData || {};
    const Race = GameData.Race;
    const ClassType = GameData.ClassType;
    const DifficultyData = GameData.DifficultyData;
    const RaceData = GameData.RaceData;
    const ClassData = GameData.ClassData;
    const QuartersUpgrades = GameData.QuartersUpgrades;
    const BotanySeeds = GameData.BotanySeeds;
    const ArmoryUpgrades = GameData.ArmoryUpgrades;
    const RoguelikePerks = GameData.RoguelikePerks;
    const FPS_STARTING_WEAPON_IDS = ['rifle', 'sidearm', 'scattergun'];
    const FPS_WEAPONS = [
        { id: 'rifle', name: 'M4 CARBINE', magazine: 30, reserve: 120, damage: 24, meleeDamage: 22, fireRate: 0.105, reload: 1.65, range: 850, falloffStart: 500, minDamageScale: 0.68, adsFov: 58, spreadScale: 1, pellets: 1, automatic: true, secondaryMagazine: 2, secondaryReserve: 4, secondaryDamage: 78, secondaryRadius: 96, secondaryFireRate: 0.78, recoilPattern: [[0.0015, 0.005], [-0.002, 0.006], [0.0025, 0.0065], [-0.003, 0.007], [0.0015, 0.008], [-0.001, 0.0085], [0.003, 0.009], [-0.002, 0.0095]], adsRecoilPattern: [[0.0005, 0.0028], [-0.0008, 0.0031], [0.001, 0.0035], [-0.0012, 0.0038], [0.0006, 0.0042], [-0.0005, 0.0045], [0.0012, 0.0048], [-0.0008, 0.005]] },
        { id: 'sidearm', name: 'SERVICE PISTOL', magazine: 12, reserve: 60, damage: 31, meleeDamage: 18, fireRate: 0.26, reload: 1.25, range: 650, falloffStart: 300, minDamageScale: 0.6, adsFov: 62, spreadScale: 0.8, pellets: 1, automatic: false, recoilPattern: [[0, 0.013], [0.002, 0.015], [-0.002, 0.014], [0.001, 0.016]], adsRecoilPattern: [[0, 0.008], [0.001, 0.009], [-0.001, 0.0085], [0.0005, 0.0095]] },
        { id: 'scattergun', name: 'BREACH SHOTGUN', magazine: 6, reserve: 36, damage: 9, meleeDamage: 27, fireRate: 0.72, reload: 1.9, shellReload: 0.48, continuousReload: true, range: 360, falloffStart: 120, minDamageScale: 0.28, adsFov: 64, spreadScale: 4.5, pellets: 7, automatic: false, recoilPattern: [[0, 0.028]], adsRecoilPattern: [[0, 0.019]] },
        { id: 'sniper', name: 'WRAITH BOLT SNIPER', magazine: 5, reserve: 25, damage: 84, meleeDamage: 24, fireRate: 0.82, boltCycle: 0.28, reload: 2.15, range: 1250, falloffStart: 720, minDamageScale: 0.58, adsFov: 26, spreadScale: 0.46, pellets: 1, automatic: false, recoilPattern: [[0.0008, 0.042]], adsRecoilPattern: [[0.0003, 0.019]] }
    ];

    // Pointer lock is optional (and commonly unavailable inside embedded game
    // players). Never let a rejected lock request break the rest of the game.
    function requestPointerLockSafely(element) {
        if (!element?.requestPointerLock || document.body.classList.contains('touch-enabled')) return;
        try {
            const request = element.requestPointerLock();
            if (request && typeof request.catch === 'function') request.catch(() => {});
        } catch (_) { /* Mouse-look simply remains unlocked. */ }
    }

    function exitPointerLockSafely() {
        if (!document.exitPointerLock || !document.pointerLockElement) return;
        try {
            const request = document.exitPointerLock();
            if (request && typeof request.catch === 'function') request.catch(() => {});
        } catch (_) { /* Already unlocked or unsupported by the host. */ }
    }

    // =========================================================================
    // 2. PROCEDURAL CANVAS TEXTURE GENERATOR
    // =========================================================================
    const ProceduralTextures = window.GraveGainProceduralTextures;

    // =========================================================================
    // 3. PROCEDURAL WEB AUDIO SYNTHESIZER
    // =========================================================================
    const SoundEngine = window.GraveGainSoundEngine;

    // =========================================================================
    // 4. FLOATING COMBAT TEXT & NOTIFICATIONS
    // =========================================================================
    const CombatTextManager = window.GraveGainCombatTextManager;

    // =========================================================================
    // 5. INPUT MANAGER & FULL MOBILE CONTROLS
    // =========================================================================
    const InputManager = window.GraveGainInputManager;

    // =========================================================================
    // 6. 3D FIRST-PERSON WEAPON BUILDER
    // =========================================================================
    const WeaponFactory = window.GraveGainWeaponFactory;

    // =========================================================================
    // 7. PROJECTILES & ENVIRONMENT PROPS
    // =========================================================================
    const Projectile = window.GraveGainProjectile;
    const DungeonProp = window.GraveGainDungeonProp;

    // =========================================================================
    // 8. ENTITIES: PLAYER, ENEMIES, LOOT
    // =========================================================================
    const PlayerEntity = window.GraveGainPlayerEntity;
    const EnemyEntity = window.GraveGainEnemyEntity;
    const LootItem = window.GraveGainLootItem;

    const ParticleSystem = window.GraveGainParticleSystem;

    // =========================================================================
    // 11. DUNGEON GENERATOR
    // =========================================================================
    const DungeonGenerator = window.GraveGainDungeonGenerator;

    // =========================================================================
    // 12. PHYSICS CONTROLLER
    // =========================================================================
    const PhysicsController = window.GraveGainPhysicsController;

    // =========================================================================
    // 13. CAMERA CONTROLLER
    // =========================================================================
    const CameraController = window.GraveGainCameraController;

    // =========================================================================
    // 14. SAVE SYSTEM
    // =========================================================================
    const SaveSystem = window.GraveGainSaveSystem;

    // =========================================================================
    // 15. MAIN GRAVEGAIN3D GAME ENGINE
    // =========================================================================
    class GraveGainGame {
        constructor() {
            this.canvas = document.getElementById('gameCanvas');
            this.container = document.getElementById('canvasContainer');

            this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
            this.renderer.setSize(this.container.clientWidth || 1000, this.container.clientHeight || 600);
            // ACES-ish tone mapping when the build supports it (r128 does).
            // Guarded: unknown builds keep the legacy linear pipeline.
            try {
                if ('toneMapping' in this.renderer && THREE.ACESFilmicToneMapping !== undefined) {
                    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                    this.renderer.toneMappingExposure = 1.12;
                }
                if (this.renderer.outputEncoding !== undefined && THREE.sRGBEncoding !== undefined) {
                    this.renderer.outputEncoding = THREE.sRGBEncoding;
                }
            } catch (_) { /* legacy pipeline stays */ }
            this.performance = new window.GraveGainPerformanceManager(this.renderer);
            // Graphics preset (shared FourWeirdGraphics lib wins when present).
            // Shadows stay OFF until a high/ultra preset explicitly enables them.
            this.gfxPreset = GraveGainGame.resolveGraphicsPreset(
                (window.FourWeirdGraphics && (window.FourWeirdGraphics.preset || (typeof window.FourWeirdGraphics.getPreset === 'function' ? window.FourWeirdGraphics.getPreset() : null))) || null
            );
            this.renderer.shadowMap.enabled = !!this.gfxPreset.shadows;
            try {
                if (this.renderer.shadowMap) {
                    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap || this.renderer.shadowMap.type;
                }
            } catch (_) {}
            this.graphics = new window.GraveGainGraphicsBridge(
                document.getElementById('effectsCanvas'), this.container
            );

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x04030a);
            this.scene.fog = new THREE.FogExp2(0x04030a, 0.0035);

            this.camera3d = new THREE.PerspectiveCamera(68, (this.container.clientWidth || 1000) / (this.container.clientHeight || 600), 2, 900);
            this.aimRaycaster = new THREE.Raycaster();
            this.aimHudTimer = 0;

            // Enhanced 3D Atmospheric Lighting
            this.ambientLight = new THREE.AmbientLight(0x2d1f4d, 0.65);
            this.scene.add(this.ambientLight);

            // Player lantern with subtle warm dynamic aura
            this.playerLantern = new THREE.PointLight(0xffecd2, 2.4, 210, 1.2);
            this.scene.add(this.playerLantern);

            // Tactical flashlight with smooth penumbra & specular reach
            this.flashlight = new THREE.SpotLight(0xfff7e6, 4.2, 360, Math.PI / 5.5, 0.75, 1.1);
            this.scene.add(this.flashlight);
            this.flashlightTarget = new THREE.Object3D();
            this.scene.add(this.flashlightTarget);
            this.flashlight.target = this.flashlightTarget;

            this.scene.add(this.camera3d);

            // Subsystems
            this.input = new InputManager();
            this.audio = new SoundEngine();
            this.cameraController = new CameraController();
            this.generator = new DungeonGenerator();
            this.physics = new PhysicsController();
            this.vfx = new ParticleSystem(this.scene);
            this.combatText = new CombatTextManager(document.getElementById('combatTextContainer'), this.camera3d);
            this.hubController = window.GraveGainHubQuartersController ? new window.GraveGainHubQuartersController(this) : null;

            // Textures cache
            this.textures = {
                wall: ProceduralTextures.createStoneBrickTexture(),
                floor: ProceduralTextures.createFloorFlagstoneTexture(),
                ceiling: ProceduralTextures.createCeilingTexture()
            };

            // Persistent State
            this.gold = 0;
            this.uusd = 250;
            this.quartersLevel = 1;
            this.floorIndex = 1;
            this.difficulty = 'normal';
            this.kills = 0;
            this.armoryRanks = { health: 0, damage: 0, speed: 0, potions: 0, greed: 0 };

            this.botanyCrops = [
                { seedId: null, startTime: 0, growthTime: 0 },
                { seedId: null, startTime: 0, growthTime: 0 },
                { seedId: null, startTime: 0, growthTime: 0 },
                { seedId: null, startTime: 0, growthTime: 0 }
            ];

            // In-run Entities
            this.player = null;
            this.weaponGroup = null;
            this.weaponInventory = [];
            this.activeWeaponIndex = 0;
            this.weaponCooldown = 0;
            this.weaponMeleeCooldown = 0;
            this.weaponBashTimer = 0;
            this.weaponSwapTimer = 0;
            this.weaponSwapDuration = 0.3;
            this.weaponBurstCount = 0;
            this.weaponLastShotAt = 0;
            this.weaponSpreadBloom = 0;
            this.weaponReloadTimer = 0;
            this.weaponRecoil = 0;
            this.weaponAimBlend = 0;
            this.weaponFlashTimer = 0;
            this.weaponFlashDuration = 0.075;
            this.weaponBoltTimer = 0;
            this.weaponBoltSoundPending = false;
            this.weaponAnimTime = 0;
            this.ads = false;
            this.cameraBobTime = 0;
            this.cameraBobX = 0;
            this.cameraBobY = 0;
            this.cameraEyeHeight = 20;
            this.orbGlaive = null;
            this.orbAngle = 0;
            this.enemies = [];
            this.props = [];
            this.loot = [];
            this.projectiles = [];
            this.weaponTracers = [];
            this.mapMeshes = [];
            this.torches = [];
            this.dungeon = null;
            this.activeBoss = null;

            // Campaign / story-mission state. Null/neutral = endless mode.
            this.currentMission = null;
            this.selectedStoryMissionId = null;
            this.dungeonTheme = null;
            this._campaignDmgMult = 1;
            this._campaignReqAppliedFor = null;
            this._missionStartTime = 0;
            this._missionDeaths = 0;

            // Combat timers & animations
            this.swingTime = 0;
            this.swingDuration = 0.26;
            this.swingCombo = 0;
            this.hitstop = 0;
            this.isPaused = false;
            this.lastFrameTime = performance.now();
            this.hordeTimer = 35.0;

            // Control Modes & Game Speed
            this.controlMode = 'realtime'; // 'realtime' | 'chrono' | 'turnbased'
            this.gameSpeed = 1.0;
            this.chronoScale = 1.0;
            this.turnCount = 1;
            this.isTurnProcessing = false;
            this.joyTurnDebounce = false;

            // Minimap setup
            this.minimapCanvas = document.getElementById('hudMinimap');
            this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

            this.setupUI();
            this.loadSave();
            this.setupWindowResize();
            // Shared-lib graphics wiring: `fourweird-graphics` event + preset.
            try {
                window.addEventListener('fourweird-graphics', (ev) => {
                    try { this.applyGraphicsPreset(ev && ev.detail ? ev.detail : null); } catch (_) {}
                });
            } catch (_) {}
            try { this.applyGraphicsPreset(this.gfxPreset, { initial: true }); } catch (_) {}
            this.startLoop();
        }

        // Preset table shared with the FourWeirdGraphics lib. Potato stays
        // fast: no shadows, tiny pixel ratio, few torch lights, no postFX.
        static GRAPHICS_PRESETS = null;

        static resolveGraphicsPreset(input) {
            const TABLE = {
                potato:   { name: 'potato',   particleMult: 0.35, pixelRatioMax: 0.75, lightCount: 2,  shadows: false, postFX: false },
                low:      { name: 'low',      particleMult: 0.6,  pixelRatioMax: 1.0,  lightCount: 4,  shadows: false, postFX: false },
                balanced: { name: 'balanced', particleMult: 1.0,  pixelRatioMax: 1.25, lightCount: 8,  shadows: false, postFX: true },
                medium:   { name: 'medium',   particleMult: 1.0,  pixelRatioMax: 1.25, lightCount: 8,  shadows: false, postFX: true },
                high:     { name: 'high',     particleMult: 1.5,  pixelRatioMax: 1.5,  lightCount: 12, shadows: true,  postFX: true },
                ultra:    { name: 'ultra',    particleMult: 2.0,  pixelRatioMax: 2.0,  lightCount: 16, shadows: true,  postFX: true }
            };
            let p = null;
            if (typeof input === 'string' && TABLE[input]) p = TABLE[input];
            else if (input && typeof input === 'object') {
                const key = typeof input.name === 'string' ? input.name.toLowerCase() : '';
                const base = TABLE[key] || TABLE.balanced;
                p = {
                    name: TABLE[key] ? key : (base.name || 'balanced'),
                    particleMult: isFinite(Number(input.particleMult)) ? Number(input.particleMult) : base.particleMult,
                    pixelRatioMax: isFinite(Number(input.pixelRatioMax || input.pixelRatio)) ? Number(input.pixelRatioMax || input.pixelRatio) : base.pixelRatioMax,
                    lightCount: isFinite(Number(input.lightCount)) ? Math.floor(Number(input.lightCount)) : base.lightCount,
                    shadows: typeof input.shadows === 'boolean' ? input.shadows : base.shadows,
                    postFX: typeof input.postFX === 'boolean' ? input.postFX : base.postFX
                };
            }
            return Object.assign({}, TABLE.balanced, p || TABLE.balanced);
        }

        // Apply a graphics preset to renderer / particles / lights / postFX.
        // Never renames element IDs; endless + campaign flows untouched.
        applyGraphicsPreset(input, opts = {}) {
            const preset = GraveGainGame.resolveGraphicsPreset(input || this.gfxPreset);
            this.gfxPreset = preset;
            try {
                if (this.vfx && typeof this.vfx.setParticleMult === 'function') {
                    this.vfx.setParticleMult(preset.particleMult);
                    if (typeof this.vfx.setBudget === 'function') {
                        this.vfx.setBudget(Math.floor(450 * preset.particleMult) + 250);
                    }
                }
            } catch (_) {}
            try {
                if (this.performance) {
                    this.performance.maxPixelRatio = preset.pixelRatioMax;
                    const pr = Math.min(window.devicePixelRatio || 1, preset.pixelRatioMax);
                    this.performance.pixelRatio = pr;
                    this.renderer.setPixelRatio(pr);
                    const w = this.container.clientWidth || 1000;
                    const h = this.container.clientHeight || 600;
                    this.renderer.setSize(w, h);
                }
            } catch (_) {}
            try {
                // Shadows ONLY on high/ultra; toggling at runtime is safe.
                this.renderer.shadowMap.enabled = !!preset.shadows;
                if (this.flashlight) this.flashlight.castShadow = !!preset.shadows;
            } catch (_) {}
            try {
                // Cap live torch PointLights to the preset budget (sprites stay).
                if (Array.isArray(this.torches) && this.torches.length) {
                    this.torches.forEach((t, i) => {
                        const lit = i < preset.lightCount;
                        if (t.light) t.light.visible = lit;
                    });
                }
                // PostFX toggle: worker overlay + film grain overlay.
                if (this.graphics && typeof this.graphics.setActive === 'function') {
                    this.graphics.setActive(preset.postFX && !document.hidden);
                }
                const grain = document.getElementById('aaaGrain');
                if (grain) grain.style.display = preset.postFX ? '' : 'none';
            } catch (_) {}
            return preset;
        }

        setupWindowResize() {
            const onResize = () => {
                try {
                    const w = (this.container && this.container.clientWidth) || 1000;
                    const h = (this.container && this.container.clientHeight) || 600;
                    if (this.camera3d) {
                        this.camera3d.aspect = w / h;
                        if (typeof this.camera3d.updateProjectionMatrix === 'function') this.camera3d.updateProjectionMatrix();
                    }
                    if (this.renderer && typeof this.renderer.setSize === 'function') this.renderer.setSize(w, h);
                    if (this.graphics && typeof this.graphics.resize === 'function') this.graphics.resize();
                } catch (_) { /* pre-init resize must not throw */ }
            };
            window.addEventListener('resize', onResize);
            document.addEventListener('fullscreenchange', onResize);
            document.addEventListener('visibilitychange', () => {
                this.graphics.setActive(!document.hidden);
            });
        }

        loadSave() {
            const data = SaveSystem.load();
            if (data) {
                this.gold = data.gold || 0;
                this.uusd = data.uusd !== undefined ? data.uusd : 250;
                this.quartersLevel = data.quartersLevel || 1;
                if (data.armoryRanks) this.armoryRanks = data.armoryRanks;
                if (data.botanyCrops) this.botanyCrops = data.botanyCrops;
                if (DifficultyData[data.difficulty]) this.difficulty = data.difficulty;
            }
            const difficultySelect = document.getElementById('settingsDifficulty');
            if (difficultySelect) difficultySelect.value = this.difficulty;
            this.updateHubQuartersUI();
            this.renderArmory();
        }

        saveSave() {
            SaveSystem.save(this);
        }

        startLoop() {
            const frame = (t) => {
                const frameMs = t - this.lastFrameTime;
                const dt = Math.min(frameMs / 1000, 0.1);
                this.lastFrameTime = t;
                this.performance.sample(frameMs);

                if (!this.isPaused) {
                    this.update(dt);
                    window.GraveGainEnemyVoxels.update(this.scene, dt);
                    this.render();
                }

                requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
        }

        initRun(race, classType) {
            this.player = new PlayerEntity(race, classType, this.armoryRanks);
            this.weaponInventory = FPS_WEAPONS.filter(weapon => FPS_STARTING_WEAPON_IDS.includes(weapon.id)).map(weapon => ({
                ...weapon,
                ammo: weapon.magazine,
                reserveAmmo: weapon.reserve,
                secondaryAmmo: weapon.secondaryMagazine || 0,
                secondaryReserveAmmo: weapon.secondaryReserve || 0,
                secondaryNextFireAt: 0
            }));
            this.grenades = 3;
            this.clearWeaponTracers();
            this.activeWeaponIndex = 0;
            this.weaponCooldown = 0;
            this.weaponMeleeCooldown = 0;
            this.weaponBashTimer = 0;
            this.weaponSwapTimer = 0;
            this.weaponBurstCount = 0;
            this.weaponLastShotAt = 0;
            this.weaponSpreadBloom = 0;
            this.weaponReloadTimer = 0;
            this.weaponRecoil = 0;
            this.weaponAimBlend = 0;
            this.weaponFlashTimer = 0;
            this.weaponBoltTimer = 0;
            this.weaponBoltSoundPending = false;
            this.weaponAnimTime = 0;
            this.ads = false;
            this.cameraBobTime = 0;
            this.cameraBobX = 0;
            this.cameraBobY = 0;
            this.cameraEyeHeight = 20;
            this.removeOrbitingGlaive();
            this.gigglesHelpUses = 3;
            this.gigglesHelpUsed = false;
            try { if (window.GigglesHelpDraft) setTimeout(() => window.GigglesHelpDraft.present('gravegain3d', this, () => this.updateHUD(), true), 0); } catch (_) {}
            this.floorIndex = 1;
            this.kills = 0;
            this.turnCount = 1;
            this.isTurnProcessing = false;
            this.chronoScale = 1.0;
            this._campaignDmgMult = 1;
            this._campaignReqAppliedFor = null;
            this._missionStartTime = 0;
            this._missionDeaths = 0;
            this.setControlMode(this.controlMode || 'realtime');

            // Attach 3D First-Person Weapon
            this.disposeWeaponViewmodel();
            this.buildWeaponViewmodel(classType, this.weaponInventory[this.activeWeaponIndex].id);
            this.updateWeaponHUD();

            this.audio.startAmbientMusic();

            // Clone the selected story mission BEFORE deploying the dungeon so
            // the run can start at mission depth with requisition buffs live.
            // A missing/unresolvable mission falls through to endless mode.
            let mission = null;
            if (this.selectedStoryMissionId && window.GraveGainStoryMissions) {
                try {
                    const def = window.GraveGainStoryEngine.getMission(this.selectedStoryMissionId);
                    if (def) mission = JSON.parse(JSON.stringify(def)); // Clone mission
                } catch (_) { mission = null; }
            }
            if (mission) {
                // Carry the campaign extra (requisition/briefing/boss/lore) on
                // the clone whether the boot layer attached it or not.
                try {
                    if (!mission._campaign && window.GraveGainCampaign &&
                        typeof window.GraveGainCampaign.getExtra === 'function') {
                        const extra = window.GraveGainCampaign.getExtra(mission.id);
                        if (extra) mission._campaign = extra;
                    }
                } catch (_) { /* extra lookup is optional */ }
                this.currentMission = mission;
                // Start at mission depth.
                try {
                    const depth = Math.floor(Number(mission.minFloor));
                    if (isFinite(depth) && depth >= 1) this.floorIndex = depth;
                } catch (_) { /* keep floor 1 */ }
                // Remember the mission theme on the instance for FX/renderers.
                try {
                    this.dungeonTheme = mission.dungeonTheme ||
                        (mission._campaign && mission._campaign.dungeonTheme) || null;
                } catch (_) { this.dungeonTheme = mission.dungeonTheme || null; }
                this._missionStartTime = Date.now();
                this._missionDeaths = 0;
            } else {
                // Endless mode: no mission state may leak in from a past run.
                this.currentMission = null;
                this.dungeonTheme = null;
            }

            this.buildDungeonLayer();

            if (this.currentMission) {
                const m = this.currentMission;
                const extra = (m._campaign && typeof m._campaign === 'object') ? m._campaign : {};
                // Requisition: bonus HP (cap +300) + damage multiplier.
                try {
                    const req = (extra && extra.requisition) || {};
                    let bonusHp = Math.floor(Number(req.bonusHp)) || 0;
                    if (bonusHp > 300) bonusHp = 300;
                    if (bonusHp < 0) bonusHp = 0;
                    let dmgMult = Number(req.dmgMult);
                    if (!isFinite(dmgMult) || dmgMult <= 0) dmgMult = 1;
                    this._campaignDmgMult = dmgMult;
                    this._campaignReqAppliedFor = m.id;
                    if (bonusHp > 0 && this.player) {
                        this.player.maxHp = (Number(this.player.maxHp) || 0) + bonusHp;
                        this.player.hp = (Number(this.player.hp) || 0) + bonusHp;
                    }
                } catch (_) { /* buffs are garnish */ }
                // Intro titlecard override when the campaign pack provides one.
                try {
                    const titlecard = extra.introTitlecard || m.introTitlecard;
                    if (titlecard) this.combatText.showBanner(String(titlecard));
                    else this.combatText.showBanner(`STORY: ${m.title}`);
                } catch (_) { /* ignore */ }
                // Briefing in the HUD notification (queued after the title).
                try {
                    const briefing = extra.briefing || m.briefing;
                    if (briefing) {
                        setTimeout(() => {
                            try { this.combatText.showBanner(String(briefing), 4500); } catch (_) {}
                        }, 2600);
                    }
                } catch (_) { /* ignore */ }
                try {
                    const goal = (m.objectives && m.objectives[0]) ? m.objectives[0].desc : '';
                    this.playDialogueSequence(m.dialogueBefore, () => {
                        try { this.audio.speak(`Mission Goal: ${goal}`); } catch (_) {}
                    });
                } catch (_) { /* ignore */ }
            } else {
                this.currentMission = null;
                this.combatText.showBanner(`LAYER 1 - DEPLOYED`);
            }
            this.audio.playSfx('spell', 1.0);
        }

        clearDungeon() {
            this.mapMeshes.forEach(m => {
                this.scene.remove(m);
                if (m.geometry) m.geometry.dispose();
                if (m.material) {
                    if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
                    else m.material.dispose();
                }
            });
            this.mapMeshes = [];

            this.torches.forEach(t => {
                if (t.light) this.scene.remove(t.light);
                if (t.sprite) this.scene.remove(t.sprite);
            });
            this.torches = [];

            this.enemies.forEach(e => e.destroy());
            window.GraveGainEnemyVoxels.clear(this.scene);
            this.enemies = [];

            this.props.forEach(p => p.destroy());
            this.props = [];

            this.loot.forEach(l => l.destroy());
            this.loot = [];

            this.projectiles.forEach(p => { this.scene.remove(p.mesh); p.dispose(); });
            this.projectiles = [];

            this.vfx.clear();
            this.activeBoss = null;

            const bossBar = document.getElementById('bossBarContainer');
            if (bossBar) bossBar.classList.add('hidden');
        }

        buildDungeonLayer() {
            this.clearDungeon();
            // Theme hook: resolve the active story mission's dungeonTheme
            // (shared missions carry it; currentMission is set after the
            // first build, so read the selected id first). generate() falls
            // back to stone_crypt when no theme resolves (backward compat).
            var missionTheme = null;
            this.dungeonBossType = null;
            try {
                var mid = this.selectedStoryMissionId || (this.currentMission && this.currentMission.id);
                if (mid && window.GraveGainStoryEngine) {
                    var m = window.GraveGainStoryEngine.getMission(mid);
                    if (m) { missionTheme = m.dungeonTheme || null; this.dungeonBossType = m.bossType || null; }
                } else if (this.currentMission && this.currentMission.dungeonTheme) {
                    missionTheme = this.currentMission.dungeonTheme;
                    this.dungeonBossType = this.currentMission.bossType || null;
                }
            } catch (_) { /* offline/file:// without shared missions: classic crypt */ }
            this.dungeon = this.generator.generate(this.floorIndex, missionTheme);
            this.dungeonTheme = this.dungeon.theme;
            // Atmosphere hook: fog + background + ambient follow the theme.
            try {
                var atm = this.dungeon.atmosphere;
                if (atm) {
                    if (this.scene.fog) { this.scene.fog.color.setHex(atm.fogColor); this.scene.fog.density = atm.fogDensity; }
                    this.scene.background = new THREE.Color(atm.fogColor);
                    if (this.ambientLight) this.ambientLight.color.setHex(atm.ambientColor);
                }
            } catch (_) {}

            // Spawn player in spawn room
            this.player.x = this.dungeon.spawnRoom.cx * 48 + 24;
            this.player.y = this.dungeon.spawnRoom.cy * 48 + 24;
            this.player.vx = 0;
            this.player.vy = 0;

            const wallGeo = new THREE.BoxGeometry(48, 72, 48);
            const wallMat = new THREE.MeshStandardMaterial({ map: this.textures.wall, roughness: 0.85 });

            const floorGeo = new THREE.PlaneGeometry(48, 48);
            const floorMat = new THREE.MeshStandardMaterial({ map: this.textures.floor, roughness: 0.9 });

            const ceilGeo = new THREE.PlaneGeometry(48, 48);
            const ceilMat = new THREE.MeshStandardMaterial({ map: this.textures.ceiling, roughness: 0.95 });

            const waterMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.75, roughness: 0.1 });
            const poisonMat = new THREE.MeshStandardMaterial({ color: 0x15803d, transparent: true, opacity: 0.7, roughness: 0.2 });

            // Per-theme floor/wall tint (multiplied over the base stone maps).
            try {
                if (ProceduralTextures.themeTint && this.dungeon.theme) {
                    const tint = ProceduralTextures.themeTint(this.dungeon.theme);
                    if (tint) { wallMat.color.setHex(tint.wall); floorMat.color.setHex(tint.floor); }
                }
            } catch (_) {}

            // Instanced tile layer: one draw call per material instead of one
            // Mesh per tile (a 70x70 grid created thousands of meshes before).
            // frustumCulled is off because a single instanced mesh spans the
            // whole dungeon and r128 cannot compute its bounds reliably.
            let wallCount = 0, openCount = 0, waterCount = 0, poisonCount = 0;
            const hazardCodes = {};
            for (let x = 0; x < this.dungeon.gridSize; x++) {
                for (let y = 0; y < this.dungeon.gridSize; y++) {
                    const tile = this.dungeon.grid[x][y];
                    if (tile === 1) wallCount++;
                    else {
                        openCount++;
                        if (tile === 2) waterCount++;
                        else if (tile === 3) poisonCount++;
                        else if (tile >= 4) hazardCodes[tile] = (hazardCodes[tile] || 0) + 1;
                    }
                }
            }

            const wallInst = wallCount > 0 ? new THREE.InstancedMesh(wallGeo, wallMat, wallCount) : null;
            const floorInst = openCount > 0 ? new THREE.InstancedMesh(floorGeo, floorMat, openCount) : null;
            const ceilInst = openCount > 0 ? new THREE.InstancedMesh(ceilGeo, ceilMat, openCount) : null;
            const waterInst = waterCount > 0 ? new THREE.InstancedMesh(floorGeo, waterMat, waterCount) : null;
            const poisonInst = poisonCount > 0 ? new THREE.InstancedMesh(floorGeo, poisonMat, poisonCount) : null;
            // Extended theme hazard overlays (tiles 4-9), colored from the
            // generator's hazardLegend export; emissive for lava/crystal/sparkite.
            const hazardLegend = this.dungeon.hazardLegend || {};
            const hazardInsts = [];
            Object.keys(hazardCodes).forEach((codeStr) => {
                const code = parseInt(codeStr, 10);
                const entry = hazardLegend[code] || { color: 0xffffff };
                const hMat = new THREE.MeshStandardMaterial({
                    color: entry.color, roughness: 0.4,
                    emissive: entry.emissive ? entry.color : 0x000000,
                    emissiveIntensity: entry.emissive ? 0.7 : 0,
                    transparent: true, opacity: 0.85
                });
                const inst = new THREE.InstancedMesh(floorGeo, hMat, hazardCodes[code]);
                inst.frustumCulled = false;
                hazardInsts.push({ code, inst, i: 0 });
            });
            [wallInst, floorInst, ceilInst, waterInst, poisonInst].forEach(inst => {
                if (inst) inst.frustumCulled = false;
            });

            const dummy = new THREE.Object3D();
            let wi = 0, oi = 0, wai = 0, poi = 0;
            for (let x = 0; x < this.dungeon.gridSize; x++) {
                for (let y = 0; y < this.dungeon.gridSize; y++) {
                    const tile = this.dungeon.grid[x][y];
                    const tx = x * 48 + 24;
                    const ty = y * 48 + 24;

                    if (tile === 1) {
                        dummy.position.set(tx, 36, ty);
                        dummy.rotation.set(0, 0, 0);
                        dummy.updateMatrix();
                        wallInst.setMatrixAt(wi++, dummy.matrix);
                    } else {
                        // Floor
                        dummy.position.set(tx, 0, ty);
                        dummy.rotation.set(-Math.PI / 2, 0, 0);
                        dummy.updateMatrix();
                        floorInst.setMatrixAt(oi, dummy.matrix);

                        // Ceiling
                        dummy.position.set(tx, 72, ty);
                        dummy.rotation.set(Math.PI / 2, 0, 0);
                        dummy.updateMatrix();
                        ceilInst.setMatrixAt(oi++, dummy.matrix);

                        if (tile === 2) {
                            dummy.position.set(tx, 0.4, ty);
                            dummy.rotation.set(-Math.PI / 2, 0, 0);
                            dummy.updateMatrix();
                            waterInst.setMatrixAt(wai++, dummy.matrix);
                        } else if (tile === 3) {
                            dummy.position.set(tx, 0.4, ty);
                            dummy.rotation.set(-Math.PI / 2, 0, 0);
                            dummy.updateMatrix();
                            poisonInst.setMatrixAt(poi++, dummy.matrix);
                        } else if (tile >= 4) {
                            for (let hi = 0; hi < hazardInsts.length; hi++) {
                                if (hazardInsts[hi].code === tile) {
                                    dummy.position.set(tx, 0.4, ty);
                                    dummy.rotation.set(-Math.PI / 2, 0, 0);
                                    dummy.updateMatrix();
                                    hazardInsts[hi].inst.setMatrixAt(hazardInsts[hi].i++, dummy.matrix);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            [wallInst, floorInst, ceilInst, waterInst, poisonInst].forEach(inst => {
                if (!inst) return;
                inst.instanceMatrix.needsUpdate = true;
                this.scene.add(inst);
                this.mapMeshes.push(inst);
            });
            hazardInsts.forEach(h => {
                h.inst.instanceMatrix.needsUpdate = true;
                this.scene.add(h.inst);
                this.mapMeshes.push(h.inst);
            });

            // Ground-plane grid + ceiling vignette (skipped on potato).
            // GridHelper is one draw call; it gives the flagstones scale at
            // distance. The ceiling gets a dark multiply so corridors fall
            // off overhead even where fog is thin.
            try {
                const presetName = (this.gfxPreset && this.gfxPreset.name) || 'balanced';
                if (presetName !== 'potato' && presetName !== 'low') {
                    const span = this.dungeon.gridSize * 48;
                    const grid = new THREE.GridHelper(span, this.dungeon.gridSize * 2, 0x334155, 0x1e293b);
                    grid.position.set(span / 2, 0.6, span / 2);
                    grid.material.transparent = true;
                    grid.material.opacity = 0.18;
                    this.scene.add(grid);
                    this.mapMeshes.push(grid);
                    try { ceilMat.color.setHex(0x9a9ab0); } catch (_) {}
                }
            } catch (_) { /* garnish only */ }

            // Spawn Torches, Props & Enemies in rooms
            // Campaign curve is folded in here (endless = x1, untouched).
            // Soft cap: past depth 30 the curve plateaus so endless stays hard but finite.
            const diffScale = (1.0 + (Math.min(this.floorIndex, 30) * 0.18)) * this.getMissionScaleMult();
            const difficulty = DifficultyData[this.difficulty] || DifficultyData.normal;

            this.dungeon.rooms.forEach((room, roomIdx) => {
                // Spawn torch on room wall. PointLights are capped by the
                // graphics preset (lightCount); every room still gets its
                // flame sprite so potato keeps the look without the cost.
                const torchX = room.cx * 48 + 24;
                const torchZ = room.y * 48 + 4;
                const lightBudget = (this.gfxPreset && this.gfxPreset.lightCount) || 8;
                let torchLight = null;
                if (roomIdx < lightBudget) {
                    torchLight = new THREE.PointLight(0xff9922, 1.8, 120, 1.6);
                    torchLight.position.set(torchX, 36, torchZ + 12);
                    this.scene.add(torchLight);
                }

                const torchSprite = ProceduralTextures.createTorchFlameSprite();
                torchSprite.position.set(torchX, 36, torchZ + 12);
                this.scene.add(torchSprite);

                this.torches.push({ light: torchLight, sprite: torchSprite, baseIntensity: 1.8, seed: Math.random() * 10 });

                if (room.type === 'spawn') return;

                if (room.type === 'boss') {
                    // Mission boss override: shared-mission bossType plus the
                    // campaign pack's bossHpMult / bossDisplay. The AAA boss FX
                    // (aaa/40-fx-boss.js) exposes no public API - it polls
                    // game.activeBoss on tick - so setting the boss plus the
                    // boss bar here IS the integration; its letterbox intro,
                    // name slam and slow-mo slay fire automatically.
                    let bossName = 'ANCIENT BONE GOLIATH';
                    let bossBanner = null;
                    let bossHpMult = 1;
                    try {
                        const m = this.currentMission || null;
                        let extra = (m && m._campaign && typeof m._campaign === 'object') ? m._campaign : null;
                        if (!extra && m && window.GraveGainCampaign &&
                            typeof window.GraveGainCampaign.getExtra === 'function') {
                            extra = window.GraveGainCampaign.getExtra(m.id) || null;
                        }
                        if (m && m.bossType) bossName = String(m.bossType).toUpperCase();
                        if (extra) {
                            if (extra.bossDisplay && extra.bossDisplay.name) {
                                bossName = String(extra.bossDisplay.name).toUpperCase();
                            }
                            const hm = Number(extra.bossHpMult);
                            if (isFinite(hm) && hm > 0) bossHpMult = hm;
                            if (extra.bossDisplay && extra.bossDisplay.banner) {
                                bossBanner = String(extra.bossDisplay.banner);
                            }
                        }
                    } catch (_) { /* defaults stand; endless keeps Goliath */ }
                    // Spawn Floor Boss via the enemy factory: mission bossType
                    // selects per-boss stats + visual variant (wings, tanks,
                    // rotor...). Unknown names fall back to the Goliath.
                    let boss = null;
                    if (EnemyEntity.spawnForBoss) {
                        boss = EnemyEntity.spawnForBoss(bossName, room.cx * 48 + 24, room.cy * 48 + 24, diffScale, difficulty);
                        if (bossHpMult !== 1) { boss.maxHp *= bossHpMult; boss.hp = boss.maxHp; }
                    } else {
                        boss = new EnemyEntity({
                            name: bossName,
                            hp: (450 + this.floorIndex * 150) * bossHpMult,
                            dmg: 35,
                            speed: 75,
                            scale: 2.5,
                            isBoss: true,
                            attackInterval: 1.4,
                            hpMultiplier: difficulty.hpMultiplier,
                            damageMultiplier: difficulty.damageMultiplier
                        }, room.cx * 48 + 24, room.cy * 48 + 24, diffScale);
                    }
                    this.scene.add(boss.group3d);
                    this.enemies.push(boss);
                    this.activeBoss = boss;
                    // Boss presence: emissive eye/glow garnish (skipped on
                    // potato). Traversal is guarded; unknown rigs keep their
                    // stock materials. A glow sprite + aura ring sell the
                    // encounter at range.
                    try {
                        const presetName = (this.gfxPreset && this.gfxPreset.name) || 'balanced';
                        if (presetName !== 'potato' && boss.group3d) {
                            boss.group3d.traverse((o) => {
                                try {
                                    if (o && o.isMesh && o.material && o.material.emissive) {
                                        if (o.material.emissiveIntensity !== undefined && o.material.emissiveIntensity < 0.35) {
                                            o.material.emissiveIntensity = 0.35;
                                        }
                                    }
                                } catch (_) {}
                            });
                            if (ProceduralTextures.createGlowSprite) {
                                const aura = ProceduralTextures.createGlowSprite('#a855f7');
                                aura.position.set(0, 44, 0);
                                boss.group3d.add(aura);
                            }
                            if (this.vfx && typeof this.vfx.spawnBossAuraRing === 'function') {
                                this.vfx.spawnBossAuraRing(room.cx * 48 + 24, room.cy * 48 + 24, 0x8b5cf6, 200);
                            }
                        }
                    } catch (_) { /* boss still fights without garnish */ }
                    try { boss._campaignBossApplied = true; } catch (_) {}

                    const bossBar = document.getElementById('bossBarContainer');
                    if (bossBar) bossBar.classList.remove('hidden');
                    try {
                        const bossNameEl = document.getElementById('bossName');
                        if (bossNameEl) bossNameEl.textContent = bossName;
                    } catch (_) { /* DOM may be missing */ }
                    this.audio.playSfx('boss_roar');
                    this.combatText.showBanner(bossBanner || `⚠️ BOSS ENCOUNTER: ${bossName} ⚠️`);
                    return;
                }

                // Spawn props
                if (Math.random() < 0.6) {
                    const px = (room.x + 1) * 48 + 24;
                    const pz = (room.y + 1) * 48 + 24;
                    const prop = new DungeonProp(px, pz, 'crate');
                    this.scene.add(prop.group3d);
                    this.props.push(prop);
                }

                if (room.type === 'treasury') {
                    const cx = room.cx * 48 + 24;
                    const cz = room.cy * 48 + 24;
                    const chest = new DungeonProp(cx, cz, 'chest');
                    this.scene.add(chest.group3d);
                    this.props.push(chest);
                }

                // Spawn enemies: per-theme mob pool (names route through the
                // enemy variant visuals); legacy random table as fallback.
                const mobCount = room.type === 'graveyard' ? 4 : 2;
                const mobPool = (EnemyEntity.mobsForTheme && this.dungeon.theme)
                    ? EnemyEntity.mobsForTheme(this.dungeon.theme) : null;
                for (let i = 0; i < mobCount; i++) {
                    const ex = (room.x + Math.floor(Math.random() * room.w)) * 48 + 24;
                    const ey = (room.y + Math.floor(Math.random() * room.h)) * 48 + 24;

                    let eData;
                    if (mobPool && mobPool.length) {
                        eData = Object.assign({}, mobPool[Math.floor(Math.random() * mobPool.length)]);
                    } else {
                        const rand = Math.random();
                        eData = { name: 'Goblin Skeleton', hp: 25, dmg: 8, speed: 120, scale: 0.8, type: 'skeleton' };
                        if (rand < 0.3) {
                            eData = { name: 'Flying Fire Skull', hp: 16, dmg: 28, speed: 155, scale: 0.9, type: 'skull' };
                        } else if (rand < 0.6) {
                            eData = { name: 'Armored Skeleton', hp: 65, dmg: 14, speed: 85, scale: 1.1, armored: true, type: 'skeleton' };
                        } else if (rand < 0.85) {
                            eData = { name: 'Skeleton Necromancer', hp: 45, dmg: 18, speed: 70, scale: 1.0, type: 'mage' };
                        }
                    }

                    eData.hpMultiplier = difficulty.hpMultiplier;
                    eData.damageMultiplier = difficulty.damageMultiplier;

                    const enemy = new EnemyEntity(eData, ex, ey, diffScale);
                    this.scene.add(enemy.group3d);
                    this.enemies.push(enemy);
                }
            });

            // Safespace exit portal
            const safespace = this.dungeon.rooms.find(r => r.type === 'safespace' || r.type === 'boss');
            if (safespace) {
                const sx = safespace.cx * 48 + 24;
                const sy = safespace.cy * 48 + 24;
                const portal = ProceduralTextures.createEmojiSprite('🌀', 128);
                portal.position.set(sx, 20, sy);
                this.scene.add(portal);
                this.mapMeshes.push(portal);
            }

            this.updateHUD();
        }

        spawnProjectile(x, y, z, vx, vy, vz, dmg, isPlayer, color, type) {
            const p = new Projectile(x, y, z, vx, vy, vz, dmg, isPlayer, color, type);
            this.scene.add(p.mesh);
            this.projectiles.push(p);
            return p;
        }

        throwGrenade() {
            if (!this.player || this.player.isDead || this.isPaused || this.grenades <= 0) return false;
            const forward = new THREE.Vector3();
            this.camera3d.getWorldDirection(forward);
            const speed = 290;
            this.grenades--;
            this.spawnProjectile(
                this.player.x + forward.x * 18,
                this.player.yElevation + 18,
                this.player.y + forward.z * 18,
                forward.x * speed,
                Math.max(80, forward.y * speed + 100),
                forward.z * speed,
                90,
                true,
                0xf97316,
                'grenade'
            );
            this.audio.playSfx('spell', 0.75);
            this.combatText.spawnText(this.player.x, 24, this.player.y, `GRENADE · ${this.grenades} LEFT`, 'block');
            this.updateWeaponHUD();
            return true;
        }

        fireSecondaryWeapon() {
            const weapon = this.weaponInventory[this.activeWeaponIndex];
            if (!this.player || this.player.isDead || this.isPaused || this.controlMode === 'turnbased' ||
                !weapon || weapon.id !== 'rifle' || this.weaponSwapTimer > 0 || this.weaponReloadTimer > 0) return false;
            const now = this.weaponAnimTime * 1000;
            if (now < (weapon.secondaryNextFireAt || 0)) return false;
            if (weapon.secondaryAmmo <= 0) {
                this.combatText.spawnText(this.player.x, 20, this.player.y,
                    weapon.secondaryReserveAmmo > 0 ? 'UNDERBARREL EMPTY · RELOAD' : 'UNDERBARREL EMPTY', 'block');
                return false;
            }

            const forward = new THREE.Vector3();
            this.camera3d.getWorldDirection(forward);
            const speed = 420;
            const verticalSpeed = THREE.MathUtils.clamp(forward.y * speed, -150, 90);
            weapon.secondaryAmmo--;
            weapon.secondaryNextFireAt = now + weapon.secondaryFireRate * 1000;
            const projectile = this.spawnProjectile(
                this.player.x + forward.x * 20,
                Math.max(14, this.player.yElevation - 16),
                this.player.y + forward.z * 20,
                forward.x * speed,
                verticalSpeed,
                forward.z * speed,
                weapon.secondaryDamage,
                true,
                0xff6b1a,
                'launcher'
            );
            projectile.blastRadius = weapon.secondaryRadius;
            if (this.weaponGroup?.muzzleFlash) {
                this.weaponFlashDuration = 0.11;
                this.weaponFlashTimer = this.weaponFlashDuration;
                this.weaponGroup.muzzleFlash.material.color.setHex(0xff6b1a);
                this.weaponGroup.muzzleFlash.scale.set(1.5, 1.5, 2.3);
                this.weaponGroup.muzzleLight?.color.setHex(0xff6b1a);
            }
            this.cameraController.applyPunch(0.028, 0);
            this.audio.playSfx('gunshot', 0.62);
            this.combatText.spawnText(this.player.x, 20, this.player.y,
                `40MM · ${weapon.secondaryAmmo}/${weapon.secondaryReserveAmmo}`, 'crit');
            this.updateWeaponHUD();
            return true;
        }

        showDamageFeedback(amount) {
            const vignette = document.getElementById('damageVignette');
            if (!vignette) return;
            const strength = Math.min(0.78, 0.22 + Math.max(0, amount) * 0.014);
            vignette.style.setProperty('--damage-strength', strength.toFixed(2));
            vignette.classList.remove('active');
            void vignette.offsetWidth;
            vignette.classList.add('active');
            clearTimeout(this.damageFeedbackTimer);
            this.damageFeedbackTimer = setTimeout(() => vignette.classList.remove('active'), 280);
        }

        showDamageDirection(source) {
            if (!source || !this.player) return;
            const indicator = document.getElementById('damageDirection');
            if (!indicator) return;
            const dx = source.x - this.player.x;
            const dy = source.y - this.player.y;
            const incoming = Math.atan2(dy, dx);
            const cameraHeading = this.player.yaw - Math.PI / 2;
            let relative = incoming - cameraHeading;
            while (relative > Math.PI) relative -= Math.PI * 2;
            while (relative < -Math.PI) relative += Math.PI * 2;
            indicator.style.setProperty('--damage-angle', `${relative * 180 / Math.PI}deg`);
            indicator.classList.remove('active');
            void indicator.offsetWidth;
            indicator.classList.add('active');
            clearTimeout(this.damageDirectionTimer);
            this.damageDirectionTimer = setTimeout(() => indicator.classList.remove('active'), 680);
        }

        showHitMarker(isKill, isCrit, isHeadshot) {
            const crosshair = document.getElementById('hudCrosshair');
            if (!crosshair) return;
            crosshair.classList.toggle('kill', !!isKill);
            crosshair.classList.toggle('crit', !!isCrit);
            crosshair.classList.toggle('headshot', !!isHeadshot);
            crosshair.classList.add('hit');
            clearTimeout(this.hitMarkerTimer);
            this.hitMarkerTimer = setTimeout(() => {
                crosshair.classList.remove('hit', 'kill', 'crit', 'headshot');
            }, isKill ? 210 : 145);
        }

        updateAimTargetHUD(dt) {
            const readout = document.getElementById('hudTargetReadout');
            if (!readout) return;
            const crosshair = document.getElementById('hudCrosshair');
            if (!this.player || this.player.isDead) {
                readout.classList.add('hidden');
                crosshair?.classList.remove('target');
                return;
            }
            this.aimHudTimer -= dt;
            if (this.aimHudTimer > 0) return;
            this.aimHudTimer = 0.08;

            const activeWeapon = this.weaponInventory[this.activeWeaponIndex];
            this.aimRaycaster.far = Math.max(760, activeWeapon?.range || 760);
            this.aimRaycaster.setFromCamera({ x: 0, y: 0 }, this.camera3d);
            const targets = this.mapMeshes[0] ? [this.mapMeshes[0]] : [];
            this.enemies.forEach(enemy => {
                if (enemy && enemy.hp > 0 && enemy.group3d) targets.push(enemy.group3d);
            });
            this.props.forEach(prop => {
                if (prop && !prop.broken && prop.group3d) targets.push(prop.group3d);
            });
            const firstHit = this.aimRaycaster.intersectObjects(targets, true)[0];
            let object = firstHit ? firstHit.object : null;
            let target = null;
            while (object && !target) {
                target = this.enemies.find(enemy => enemy.group3d === object) || null;
                object = object.parent;
            }
            if (!target || target.hp <= 0) {
                readout.classList.add('hidden');
                crosshair?.classList.remove('target');
                return;
            }

            const percent = Math.max(0, Math.min(100, (target.hp / target.maxHp) * 100));
            const name = document.getElementById('hudTargetName');
            const distance = document.getElementById('hudTargetDistance');
            const health = document.getElementById('hudTargetHealth');
            const bar = document.getElementById('hudTargetHpBar');
            if (name) name.textContent = target.name || (target.isBoss ? 'BOSS' : 'ENEMY');
            if (distance) {
                const range = firstHit?.distance || 0;
                const outOfRange = activeWeapon && range > activeWeapon.range;
                const fallingOff = activeWeapon && Number.isFinite(activeWeapon.falloffStart) && range > activeWeapon.falloffStart;
                distance.textContent = `${Math.round(range)}u · ${outOfRange ? 'OUT OF RANGE' : (fallingOff ? 'FALLOFF' : 'OPTIMAL')}`;
                distance.classList.toggle('falloff', !!fallingOff && !outOfRange);
                distance.classList.toggle('out-of-range', !!outOfRange);
            }
            if (health) health.textContent = `${Math.ceil(percent)}%`;
            if (bar) {
                bar.style.width = `${percent}%`;
                bar.classList.toggle('low', percent <= 30);
            }
            readout.classList.remove('hidden');
            crosshair?.classList.add('target');
        }

        projectilePathDistance(projectile, targetX, targetZ, targetY = null) {
            const startX = Number.isFinite(projectile.previousX) ? projectile.previousX : projectile.x;
            const startZ = Number.isFinite(projectile.previousZ) ? projectile.previousZ : projectile.z;
            const startY = Number.isFinite(projectile.previousY) ? projectile.previousY : projectile.y;
            const dx = projectile.x - startX;
            const dz = projectile.z - startZ;
            const dy = projectile.y - startY;
            const useHeight = Number.isFinite(targetY);
            const lengthSq = dx * dx + dz * dz + (useHeight ? dy * dy : 0);
            const t = lengthSq > 0
                ? THREE.MathUtils.clamp(((targetX - startX) * dx + (targetZ - startZ) * dz +
                    (useHeight ? (targetY - startY) * dy : 0)) / lengthSq, 0, 1)
                : 0;
            const horizontalDistance = Math.hypot(targetX - (startX + dx * t), targetZ - (startZ + dz * t));
            return useHeight
                ? Math.hypot(horizontalDistance, targetY - (startY + dy * t))
                : horizontalDistance;
        }

        projectilePathHitTime(projectile, targetX, targetY, targetZ, radius) {
            const startX = Number.isFinite(projectile.previousX) ? projectile.previousX : projectile.x;
            const startY = Number.isFinite(projectile.previousY) ? projectile.previousY : projectile.y;
            const startZ = Number.isFinite(projectile.previousZ) ? projectile.previousZ : projectile.z;
            const dx = projectile.x - startX;
            const dy = projectile.y - startY;
            const dz = projectile.z - startZ;
            const mx = startX - targetX;
            const my = startY - targetY;
            const mz = startZ - targetZ;
            const a = dx * dx + dy * dy + dz * dz;
            const c = mx * mx + my * my + mz * mz - radius * radius;
            if (c <= 0) return 0;
            if (a <= 1e-9) return null;
            const b = mx * dx + my * dy + mz * dz;
            const discriminant = b * b - a * c;
            if (discriminant < 0) return null;
            const t = (-b - Math.sqrt(discriminant)) / a;
            return t >= 0 && t <= 1 ? t : null;
        }

        resolveProjectileHit(projectile) {
            if (projectile.type === 'grenade' || projectile.type === 'launcher') {
                const blastProjectile = projectile.type === 'launcher';
                if (!projectile.dead && projectile.y <= (blastProjectile ? 72 : 34)) {
                    const enemyImpact = this.enemies.some(enemy => enemy.hp > 0 &&
                        this.projectilePathDistance(projectile, enemy.x, enemy.y, 20) < enemy.radius + projectile.radius);
                    const propImpact = this.props.some(prop => !prop.broken &&
                        this.projectilePathDistance(projectile, prop.x, prop.z, 10) < prop.radius + projectile.radius);
                    if (enemyImpact || propImpact) projectile.dead = true;
                }
                if (projectile.dead) this.detonateGrenade(projectile);
                return;
            }
            if (projectile.dead && !projectile.collisionImpact) return;
            if (projectile.isPlayer) {
                let nearestHit = null;
                this.enemies.forEach(enemy => {
                    if (enemy.hp <= 0) return;
                    const hitTime = this.projectilePathHitTime(
                        projectile, enemy.x, 20, enemy.y, enemy.radius + projectile.radius
                    );
                    if (hitTime !== null && (!nearestHit || hitTime < nearestHit.time)) {
                        nearestHit = { time: hitTime, enemy };
                    }
                });
                this.props.forEach(prop => {
                    if (prop.broken) return;
                    const hitTime = this.projectilePathHitTime(
                        projectile, prop.x, 10, prop.z, prop.radius + projectile.radius
                    );
                    if (hitTime !== null && (!nearestHit || hitTime < nearestHit.time)) {
                        nearestHit = { time: hitTime, prop };
                    }
                });
                if (nearestHit) {
                    projectile.dead = true;
                    if (nearestHit.enemy) {
                        this.applyHitToEnemy(nearestHit.enemy, projectile.dmg,
                            new THREE.Vector3(projectile.vx, 0, projectile.vz).normalize(), 1, 0, null,
                            { x: projectile.x, y: projectile.y, z: projectile.z }, 'shot');
                    } else {
                        this.breakProp(nearestHit.prop);
                    }
                }
            } else {
                const playerHeight = this.player.yElevation + (this.cameraEyeHeight || 20);
                const hitTime = this.projectilePathHitTime(
                    projectile, this.player.x, playerHeight, this.player.y, this.player.radius + projectile.radius
                );
                if (hitTime !== null) {
                    projectile.dead = true;
                    this.player.takeDamage(projectile.dmg, 'normal', { x: projectile.x, y: projectile.z });
                }
            }
        }

        hasBlastLineOfSight(x1, z1, x2, z2, originHeight = 0, targetHeight = 20) {
            const grid = this.dungeon?.grid;
            if (!grid) return true;
            const dx = x2 - x1;
            const dz = z2 - z1;
            const steps = Math.ceil(Math.hypot(dx, dz) / 12);
            const sourceX = Math.floor(x1 / 48);
            const sourceZ = Math.floor(z1 / 48);
            for (let i = 1; i < steps; i++) {
                const t = i / steps;
                const tx = Math.floor((x1 + dx * t) / 48);
                const tz = Math.floor((z1 + dz * t) / 48);
                if (tx === sourceX && tz === sourceZ) continue;
                const cell = grid[tx]?.[tz];
                const rayHeight = originHeight + (targetHeight - originHeight) * t;
                if ((cell === 1 || cell === 6) && rayHeight <= 72) return false;
            }
            return true;
        }

        detonateGrenade(projectile) {
            if (projectile.exploded) return;
            projectile.exploded = true;
            projectile.dead = true;
            const radius = projectile.type === 'launcher' ? (projectile.blastRadius || 96) : 132;
            this.vfx.spawnSparks(projectile.x, projectile.z, 0xff6b1a, projectile.type === 'launcher' ? 26 : 32);
            this.audio.playSfx('explode', 1.15);
            this.enemies.forEach(enemy => {
                if (enemy.hp <= 0) return;
                const distance = Math.hypot(enemy.x - projectile.x, enemy.y - projectile.z);
                if (distance > radius || !this.hasBlastLineOfSight(projectile.x, projectile.z, enemy.x, enemy.y, projectile.y, 24)) return;
                const falloff = 1 - distance / (radius * 1.5);
                this.applyHitToEnemy(enemy, Math.round(projectile.dmg * Math.max(0.35, falloff)), new THREE.Vector3(enemy.x - projectile.x, 0, enemy.y - projectile.z).normalize(),
                    1, 0, null, { x: projectile.x, y: projectile.y, z: projectile.z }, 'blast');
            });
            this.props.forEach(prop => {
                if (!prop.broken && Math.hypot(prop.x - projectile.x, prop.z - projectile.z) < radius &&
                    this.hasBlastLineOfSight(projectile.x, projectile.z, prop.x, prop.z, projectile.y, 10)) {
                    prop.hp -= 45;
                    if (prop.hp <= 0) this.breakProp(prop);
                }
            });
        }

        handleGameplayKey(code) {
            if (!this.player || this.player.isDead || this.isPaused) return;
            if (code === 'KeyR') this.reloadWeapon();
            else if (code === 'KeyT') this.toggleRifleFireMode();
            else if (code === 'KeyY') this.fireSecondaryWeapon();
            else if (code === 'Digit1' && this.weaponInventory.length > 0) this.selectWeapon(0);
            else if (code === 'Digit2' && this.weaponInventory.length > 1) this.selectWeapon(1);
            else if (code === 'Digit3' && this.weaponInventory.length > 2) this.selectWeapon(2);
            else if (code === 'Digit4' && this.weaponInventory.length > 3) this.selectWeapon(3);
            else if (code === 'KeyG') {
                if (this.controlMode === 'turnbased') this.executeTurnAction('grenade');
                else this.throwGrenade();
            } else if (code === 'KeyV') {
                if (this.controlMode === 'turnbased') this.executeTurnAction('melee');
                else this.triggerMeleeAttack();
            } else if (code === 'KeyH') {
                if (this.controlMode === 'turnbased') this.executeTurnAction('drop_weapon');
                else this.dropCurrentWeapon();
            } else if (code === 'KeyB' && this.controlMode === 'turnbased') {
                this.executeTurnAction('wait');
            } else if (code === 'KeyN') {
                if (this.controlMode === 'turnbased') this.executeTurnAction('weapon_melee');
                else this.performWeaponMeleeAttack();
            } else if (code === 'KeyC' && this.controlMode !== 'turnbased') {
                this.player.tryStartSlide(this.input);
            }
        }

        toggleRifleFireMode() {
            if (!this.player || this.player.isDead || this.isPaused || this.controlMode === 'turnbased') return false;
            const rifle = this.weaponInventory.find(weapon => weapon.id === 'rifle');
            if (!rifle) return false;
            rifle.automatic = !rifle.automatic;
            this.audio.playSfx('weapon_swap', rifle.automatic ? 1.16 : 0.82);
            this.combatText.spawnText(this.player.x, 20, this.player.y,
                `M4 · ${rifle.automatic ? 'FULL AUTO' : 'SEMI-AUTO'}`, 'block');
            this.updateWeaponHUD();
            return true;
        }

        disposeWeaponViewmodel() {
            this.weaponBoltTimer = 0;
            this.weaponBoltSoundPending = false;
            this.weaponBashTimer = 0;
            if (!this.weaponGroup) return;
            this.camera3d.remove(this.weaponGroup);
            this.weaponGroup.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
                else if (object.material) object.material.dispose();
            });
            this.weaponGroup = null;
        }

        resetWeaponPresentation() {
            this.weaponBurstCount = 0;
            this.weaponLastShotAt = 0;
            this.weaponSpreadBloom = 0;
            this.weaponReloadTimer = 0;
            this.weaponRecoil = 0;
            this.weaponAimBlend = 0;
            this.weaponFlashTimer = 0;
        }

        buildWeaponViewmodel(classType, weaponId) {
            this.weaponGroup = WeaponFactory.buildWeapon(classType, weaponId);
            const hand = this.weaponGroup.mainHand;
            if (hand) {
                hand.userData.idlePose = {
                    position: hand.position.clone(),
                    rotation: hand.rotation.clone()
                };
            }
            const supportHand = this.weaponGroup.supportHand;
            if (supportHand) {
                supportHand.userData.idlePose = {
                    position: supportHand.position.clone(),
                    rotation: supportHand.rotation.clone()
                };
            }
            this.camera3d.add(this.weaponGroup);
        }

        spawnWeaponTracer(start, end, color) {
            const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
            const material = new THREE.LineBasicMaterial({
                color,
                transparent: true,
                opacity: 0.95,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            const line = new THREE.Line(geometry, material);
            line.renderOrder = 8;
            this.scene.add(line);
            this.weaponTracers.push({ line, life: 0.11, duration: 0.11 });
        }

        clearWeaponTracers() {
            (this.weaponTracers || []).forEach(tracer => {
                this.scene.remove(tracer.line);
                tracer.line.geometry.dispose();
                tracer.line.material.dispose();
            });
            this.weaponTracers = [];
        }

        updateWeaponTracers(dt) {
            for (let i = this.weaponTracers.length - 1; i >= 0; i--) {
                const tracer = this.weaponTracers[i];
                tracer.life -= dt;
                tracer.line.material.opacity = Math.max(0, tracer.life / tracer.duration);
                if (tracer.life <= 0) {
                    this.scene.remove(tracer.line);
                    tracer.line.geometry.dispose();
                    tracer.line.material.dispose();
                    this.weaponTracers.splice(i, 1);
                }
            }
        }

        enableOrbitingGlaive() {
            this.removeOrbitingGlaive();
            const group = new THREE.Group();
            const orb = new THREE.Mesh(
                new THREE.IcosahedronGeometry(5, 1),
                new THREE.MeshStandardMaterial({ color: 0xc084fc, emissive: 0x7e22ce, emissiveIntensity: 2.2, metalness: 0.35, roughness: 0.18 })
            );
            group.add(orb);
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(8, 0.7, 6, 20),
                new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.9 })
            );
            ring.rotation.x = Math.PI / 2.4;
            group.add(ring);
            group.add(new THREE.PointLight(0xa855f7, 2.5, 75));
            this.scene.add(group);
            this.orbGlaive = group;
            this.orbAngle = 0;
        }

        removeOrbitingGlaive() {
            if (!this.orbGlaive) return;
            this.scene.remove(this.orbGlaive);
            this.orbGlaive.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
                else if (object.material) object.material.dispose();
            });
            this.orbGlaive = null;
        }

        updateOrbitingGlaive(dt) {
            if (!this.orbGlaive || !this.player || !this.player.hasPerk('orb_havoc')) return;
            this.orbAngle += dt * 2.7;
            const radius = 48;
            this.orbGlaive.position.set(
                this.player.x + Math.cos(this.orbAngle) * radius,
                this.player.yElevation + 26 + Math.sin(this.orbAngle * 2.0) * 7,
                this.player.y + Math.sin(this.orbAngle) * radius
            );
            this.orbGlaive.rotation.set(this.orbAngle * 0.8, this.orbAngle, this.orbAngle * 0.4);
            this.enemies.forEach(enemy => {
                const dist = Math.hypot(enemy.x - this.orbGlaive.position.x, enemy.y - this.orbGlaive.position.z);
                enemy.orbHitTimer = Math.max(0, (enemy.orbHitTimer || 0) - dt);
                if (dist < enemy.radius + 8 && enemy.orbHitTimer <= 0 && enemy.hp > 0) {
                    enemy.orbHitTimer = 0.8;
                    enemy.hp -= 25;
                    this.vfx.spawnSparks(enemy.x, enemy.y, 0xc084fc, 12);
                    this.combatText.spawnText(enemy.x, 23, enemy.y, '🔮 25', 'block');
                    this.audio.playSfx('spell', 1.7);
                }
            });
        }

        triggerAlchemicalBurst(source) {
            const radius = 120;
            let affected = 0;
            this.enemies.forEach(target => {
                if (target === source || target.hp <= 0) return;
                if (Math.hypot(target.x - source.x, target.y - source.y) <= radius) {
                    target.hp = Math.max(1, target.hp - 28);
                    target.poisonTimer = Math.max(target.poisonTimer || 0, 1.5);
                    target.poisonFxTimer = 0;
                    this.vfx.spawnSparks(target.x, target.y, 0x4ade80, 8);
                    affected++;
                }
            });
            this.vfx.spawnSparks(source.x, source.y, 0x4ade80, 30);
            if (affected) this.combatText.spawnText(source.x, 34, source.y, `☣ ${affected} EXPOSED`, 'heal');
        }

        triggerShockwaveCleave(origin, direction, directHits = new Set()) {
            if (!this.player?.hasPerk('cleave')) return;
            let affected = 0;
            const horizontalLength = Math.hypot(direction.x, direction.z) || 1;
            this.enemies.forEach(enemy => {
                if (enemy.hp <= 0 || directHits.has(enemy)) return;
                const dx = enemy.x - origin.x;
                const dy = enemy.y - origin.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 235 || dist < 1) return;
                const dot = (direction.x * dx + direction.z * dy) / (dist * horizontalLength);
                // A wider cone than the base melee check (0.45), so the
                // shockwave can catch enemies flanking the normal swing.
                if (dot < 0.32) return;
                this.applyHitToEnemy(enemy, ClassData[this.player.classType].baseDmg * 0.65, direction, 0);
                this.vfx.spawnSparks(enemy.x, enemy.y, 0x38bdf8, 10);
                affected++;
            });
            if (affected) {
                this.cameraController.applyShake(2.5);
                this.audio.playSfx('spell', 1.9);
            }
        }

        onEnemyKilled(enemy) {
            if (this.player.hasPerk('overclock')) {
                this.player.overclockTimer = 4;
                this.combatText.spawnText(this.player.x, 27, this.player.y, '⚡ OVERCLOCK', 'crit');
            }
            if (this.player.hasPerk('alchemical')) {
                this.audio.playSfx('explode', 1.4);
                this.triggerAlchemicalBurst(enemy);
            }
        }

        spawnEnemyLoot(enemy, goldValue) {
            const roll = Math.random();
            const type = enemy.isBoss || roll < 0.16 ? 'ammo' : (roll < 0.38 ? 'potion' : 'gold');
            const value = type === 'ammo' ? (enemy.isBoss ? 60 : 30) : (type === 'potion' ? 1 : goldValue);
            const loot = new LootItem(enemy.x, enemy.y, type, value);
            this.scene.add(loot.group3d);
            this.loot.push(loot);
            if (enemy.isBoss || (enemy.elite && Math.random() < 0.2)) {
                this.spawnWeaponLoot(enemy.x + 10, enemy.y - 8);
            }
            if (enemy.isBoss || (enemy.elite && Math.random() < 0.25)) {
                this.spawnGrenadeLoot(enemy.x + 12, enemy.y + 8);
            }
        }

        spawnWeaponLoot(x, y) {
            const ranked = FPS_WEAPONS.map(definition => {
                const owned = this.weaponInventory.find(weapon => weapon.id === definition.id);
                const primaryCapacity = definition.magazine + definition.reserve;
                const secondaryCapacity = definition.secondaryMagazine ? definition.secondaryMagazine + definition.secondaryReserve : 0;
                const primaryCount = owned ? owned.ammo + owned.reserveAmmo : 0;
                const secondaryCount = owned ? (owned.secondaryAmmo || 0) + (owned.secondaryReserveAmmo || 0) : 0;
                // Weight each 40mm round like four rifle rounds so caches can
                // recognize a depleted launcher when comparing weapon stocks.
                const ratio = owned
                    ? (primaryCount + secondaryCount * 4) / Math.max(1, primaryCapacity + secondaryCapacity * 4)
                    : -1;
                return { definition, ratio };
            }).sort((a, b) => a.ratio - b.ratio);
            const lowestRatio = ranked[0]?.ratio ?? 1;
            const candidates = ranked.filter(item => item.ratio <= lowestRatio + 0.15);
            const weapon = candidates[(Math.random() * candidates.length) | 0]?.definition || FPS_WEAPONS[0];
            const loot = new LootItem(x, y, 'weapon', 1, {
                ...weapon,
                ammo: weapon.magazine,
                reserveAmmo: weapon.reserve,
                secondaryAmmo: weapon.secondaryMagazine || 0,
                secondaryReserveAmmo: weapon.secondaryReserve || 0
            });
            this.scene.add(loot.group3d);
            this.loot.push(loot);
            return loot;
        }

        spawnGrenadeLoot(x, y) {
            const loot = new LootItem(x, y, 'grenade', 1);
            this.scene.add(loot.group3d);
            this.loot.push(loot);
        }

        collectLoot(loot) {
            if (loot.type === 'potion') {
                this.player.potions = Math.min(5, this.player.potions + 1);
                this.audio.playSfx('potion');
                this.combatText.spawnText(this.player.x, 20, this.player.y, '+1 POTION', 'heal');
            } else if (loot.type === 'grenade') {
                const gained = Math.min(loot.value, 5 - this.grenades);
                if (gained > 0) {
                    this.grenades += gained;
                    this.audio.playSfx('loot', 1.2);
                    this.combatText.spawnText(this.player.x, 20, this.player.y, `+${gained} GRENADE`, 'block');
                    this.updateWeaponHUD();
                } else {
                    this.gold += 15;
                    this.combatText.spawnText(this.player.x, 20, this.player.y, '+15 GOLD', 'crit');
                }
            } else if (loot.type === 'ammo') {
                let gained = 0;
                let launcherGained = 0;
                const perWeapon = Math.max(1, Math.ceil(loot.value / Math.max(1, this.weaponInventory.length)));
                this.weaponInventory.forEach(weapon => {
                    const amount = Math.min(perWeapon, weapon.reserve - weapon.reserveAmmo);
                    weapon.reserveAmmo += amount;
                    gained += amount;
                    if (weapon.secondaryMagazine && weapon.secondaryReserveAmmo < weapon.secondaryReserve) {
                        const secondaryAmount = Math.min(2, weapon.secondaryReserve - weapon.secondaryReserveAmmo);
                        weapon.secondaryReserveAmmo += secondaryAmount;
                        launcherGained += secondaryAmount;
                    }
                });
                if (gained > 0 || launcherGained > 0) {
                    this.audio.playSfx('loot', 1.25);
                    const label = `${gained > 0 ? `+${gained} AMMO` : ''}${gained > 0 && launcherGained > 0 ? ' · ' : ''}${launcherGained > 0 ? `+${launcherGained} GL` : ''}`;
                    this.combatText.spawnText(this.player.x, 20, this.player.y, label, 'block');
                    this.updateWeaponHUD();
                } else {
                    this.gold += 20;
                    this.combatText.spawnText(this.player.x, 20, this.player.y, '+20 GOLD', 'crit');
                }
            } else if (loot.type === 'weapon' && loot.weaponData) {
                const picked = loot.weaponData;
                const existing = this.weaponInventory.find(weapon => weapon.id === picked.id);
                if (existing) {
                    const oldTotal = existing.ammo + existing.reserveAmmo;
                    const incoming = (picked.ammo || 0) + (picked.reserveAmmo || 0);
                    const totalCap = existing.magazine + existing.reserve;
                    const newTotal = Math.min(totalCap, oldTotal + incoming);
                    existing.ammo = Math.min(existing.magazine, newTotal);
                    existing.reserveAmmo = Math.max(0, newTotal - existing.ammo);
                    const ammoGained = newTotal - oldTotal;
                    let launcherGained = 0;
                    if (existing.secondaryMagazine && picked.secondaryMagazine) {
                        const oldSecondary = existing.secondaryAmmo + existing.secondaryReserveAmmo;
                        const incomingSecondary = (picked.secondaryAmmo || 0) + (picked.secondaryReserveAmmo || 0);
                        const secondaryTotal = Math.min(existing.secondaryMagazine + existing.secondaryReserve, oldSecondary + incomingSecondary);
                        existing.secondaryAmmo = Math.min(existing.secondaryMagazine, secondaryTotal);
                        existing.secondaryReserveAmmo = Math.max(0, secondaryTotal - existing.secondaryAmmo);
                        launcherGained = secondaryTotal - oldSecondary;
                    }
                    if (ammoGained > 0 || launcherGained > 0) {
                        this.combatText.spawnText(this.player.x, 20, this.player.y,
                            `${picked.name} · ${ammoGained > 0 ? `+${ammoGained} AMMO` : ''}${ammoGained > 0 && launcherGained > 0 ? ' · ' : ''}${launcherGained > 0 ? `+${launcherGained} GL` : ''}`, 'block');
                    } else {
                        this.gold += 40;
                        this.combatText.spawnText(this.player.x, 20, this.player.y, 'WEAPON CACHE · +40 GOLD', 'crit');
                    }
                } else if (this.weaponInventory.length < FPS_WEAPONS.length) {
                    this.weaponInventory.push({ ...picked });
                    this.combatText.spawnText(this.player.x, 20, this.player.y, `${picked.name} ACQUIRED`, 'crit');
                    if (this.controlMode !== 'turnbased') this.selectWeapon(this.weaponInventory.length - 1);
                } else {
                    this.gold += 40;
                    this.combatText.spawnText(this.player.x, 20, this.player.y, 'WEAPON CACHE · +40 GOLD', 'crit');
                }
                this.audio.playSfx('weapon_swap', 0.9);
                this.updateWeaponHUD();
            } else {
                this.gold += loot.value;
                this.audio.playSfx('loot');
                this.combatText.spawnText(this.player.x, 20, this.player.y, `+${loot.value} Gold`, 'crit');
            }
            loot.picked = true;
            loot.destroy();
        }

        dropCurrentWeapon(turnAction = false) {
            if (!this.player || (!turnAction && this.isTurnProcessing)) return false;
            if (this.weaponInventory.length <= 1) {
                this.combatText.spawnText(this.player.x, 20, this.player.y, 'KEEP YOUR LAST WEAPON', 'block');
                return false;
            }
            if (this.weaponSwapTimer > 0) {
                this.combatText.spawnText(this.player.x, 20, this.player.y, 'WEAPON BUSY', 'block');
                return false;
            }
            const dropped = this.weaponInventory[this.activeWeaponIndex];
            if (!dropped) return false;
            const dropX = this.player.x + Math.cos(this.player.yaw) * 48;
            const dropY = this.player.y - Math.sin(this.player.yaw) * 48;
            const loot = new LootItem(dropX, dropY, 'weapon', 1, { ...dropped });
            loot.pickupDelay = turnAction ? 0 : 1.25;
            loot.waitForPlayerClear = true;
            this.scene.add(loot.group3d);
            this.loot.push(loot);
            this.weaponInventory.splice(this.activeWeaponIndex, 1);
            const nextIndex = Math.min(this.activeWeaponIndex, this.weaponInventory.length - 1);
            this.weaponReloadTimer = 0;
            if (turnAction) {
                this.activeWeaponIndex = nextIndex;
                this.disposeWeaponViewmodel();
                this.resetWeaponPresentation();
                this.buildWeaponViewmodel(this.player.classType, this.weaponInventory[nextIndex].id);
                this.updateWeaponHUD();
            } else {
                this.activeWeaponIndex = -1;
                this.selectWeapon(nextIndex);
            }
            this.combatText.spawnText(this.player.x, 20, this.player.y, `${dropped.name} DROPPED`, 'block');
            return true;
        }

        selectWeapon(index) {
            if (!this.weaponInventory.length || this.isTurnProcessing) return;
            const next = (index + this.weaponInventory.length) % this.weaponInventory.length;
            if (next === this.activeWeaponIndex) return;
            if (this.weaponReloadTimer > 0) {
                // Magazine ammo is committed only when its timer completes, so
                // swapping safely cancels an unfinished reload. Shotguns keep
                // any shells already inserted and interrupt the next shell.
                this.weaponReloadTimer = 0;
            }
            this.activeWeaponIndex = next;
            this.disposeWeaponViewmodel();
            this.resetWeaponPresentation();
            const nextWeapon = this.weaponInventory[next];
            this.buildWeaponViewmodel(this.player?.classType, nextWeapon.id);
            this.weaponSwapTimer = this.controlMode === 'turnbased' ? 0 : this.weaponSwapDuration;
            this.audio.playSfx('weapon_swap', nextWeapon.id === 'scattergun' ? 0.88 : 1.08);
            this.updateWeaponHUD();
        }

        cycleWeapon(direction = 1) {
            this.selectWeapon(this.activeWeaponIndex + direction);
        }

        reloadWeapon() {
            const weapon = this.weaponInventory[this.activeWeaponIndex];
            const canReloadPrimary = !!weapon && weapon.ammo < weapon.magazine && weapon.reserveAmmo > 0;
            const canReloadSecondary = !!weapon && weapon.secondaryMagazine > 0 &&
                weapon.secondaryAmmo < weapon.secondaryMagazine && weapon.secondaryReserveAmmo > 0;
            if (!weapon || (!canReloadPrimary && !canReloadSecondary)) return;
            if (this.controlMode === 'turnbased') {
                if (!this.isTurnProcessing) this.executeTurnAction('reload');
                return;
            }
            if (this.weaponReloadTimer > 0) return;
            this.weaponReloadTimer = weapon.continuousReload ? (weapon.shellReload || weapon.reload) : weapon.reload;
            this.audio.playSfx('reload', 0.75);
            const readout = document.getElementById('hudWeaponStatus');
            if (readout) readout.textContent = canReloadPrimary
                ? (weapon.continuousReload ? `LOADING SHELL · ${weapon.ammo}/${weapon.magazine}` : 'RELOADING')
                : 'RELOADING UNDERBARREL';
        }

        getCurrentWeaponSpread() {
            const moving = Math.hypot(this.player?.vx || 0, this.player?.vy || 0) > (this.player?.speed || 0) * 0.45;
            const bloom = this.weaponSpreadBloom || 0;
            let baseSpread = this.ads ? (moving ? 0.006 : 0.002) : (moving ? 0.024 : 0.012);
            if (this.player?.sprinting && moving) baseSpread *= 1.25;
            if (this.player && !this.player.grounded) baseSpread *= 1.35;
            if (this.player?.grounded && this.player?.crouching && !this.player?.isSliding) baseSpread *= 0.72;
            const weapon = this.weaponInventory[this.activeWeaponIndex];
            return (baseSpread + bloom * (this.ads ? 0.55 : 1)) * (weapon?.spreadScale || 1);
        }

        getWeaponDamageScale(weapon, distance) {
            if (!weapon || !Number.isFinite(weapon.falloffStart) || distance <= weapon.falloffStart) return 1;
            const range = Math.max(1, weapon.range - weapon.falloffStart);
            const progress = THREE.MathUtils.clamp((distance - weapon.falloffStart) / range, 0, 1);
            return 1 + ((weapon.minDamageScale ?? 1) - 1) * progress;
        }

        updateWeaponHUD() {
            const weapon = this.weaponInventory[this.activeWeaponIndex];
            if (!weapon) return;
            const name = document.getElementById('hudWeaponName');
            const ammo = document.getElementById('hudWeaponAmmo');
            const status = document.getElementById('hudWeaponStatus');
            const fireModeButton = document.getElementById('hudFireModeToggle');
            const launcherAmmo = document.getElementById('hudLauncherAmmo');
            const launcherButton = document.getElementById('mobileLauncherBtn');
            const crosshair = document.getElementById('hudCrosshair');
            const scopeOverlay = document.getElementById('sniperScopeOverlay');
            const sniperScopeActive = this.ads && weapon.id === 'sniper';
            if (name) name.textContent = `${weapon.name}  ·  ${this.activeWeaponIndex + 1}/${this.weaponInventory.length}`;
            if (ammo) {
                ammo.textContent = `${weapon.ammo} / ${weapon.reserveAmmo}`;
                ammo.classList.toggle('low', weapon.ammo > 0 && weapon.ammo <= Math.max(2, Math.ceil(weapon.magazine * 0.2)));
                ammo.classList.toggle('empty', weapon.ammo <= 0);
            }
            const grenades = document.getElementById('hudGrenades');
            if (grenades) grenades.textContent = `GRENADES ${this.grenades ?? 3}`;
            const mobileGrenades = document.getElementById('mobileGrenadeCount');
            if (mobileGrenades) mobileGrenades.textContent = this.grenades ?? 3;
            const hasLauncher = weapon.id === 'rifle' && this.controlMode !== 'turnbased';
            if (launcherAmmo) {
                launcherAmmo.textContent = `40MM ${weapon.secondaryAmmo || 0}/${weapon.secondaryReserveAmmo || 0}`;
                launcherAmmo.classList.toggle('hidden', !hasLauncher);
            }
            if (launcherButton) {
                launcherButton.classList.toggle('hidden', !hasLauncher);
                const launcherCount = document.getElementById('mobileLauncherAmmo');
                if (launcherCount) launcherCount.textContent = weapon.secondaryAmmo || 0;
            }
            if (fireModeButton) {
                const hasFireMode = weapon.id === 'rifle' && this.controlMode !== 'turnbased';
                fireModeButton.classList.toggle('hidden', !hasFireMode);
                fireModeButton.textContent = weapon.automatic ? 'AUTO' : 'SEMI';
                fireModeButton.setAttribute('aria-label', `M4 fire mode: ${weapon.automatic ? 'full auto' : 'semi-auto'}. Tap to switch`);
                fireModeButton.setAttribute('aria-pressed', String(weapon.automatic));
                if (!fireModeButton.dataset.ggBound) {
                    fireModeButton.dataset.ggBound = '1';
                    fireModeButton.addEventListener('click', () => this.toggleRifleFireMode());
                }
            }
            if (status) {
                const modeLabel = weapon.id === 'rifle' && this.controlMode !== 'turnbased'
                    ? `${weapon.automatic ? 'AUTO' : 'SEMI'} · `
                    : '';
                const readyStatus = this.player?.overclockTimer > 0
                    ? `${modeLabel}OVERCLOCK ${this.player.overclockTimer.toFixed(1)}s`
                    : `${modeLabel}${this.ads ? 'AIMING' : 'READY'}`;
                status.textContent = this.weaponSwapTimer > 0 ? 'SWAPPING' : (this.weaponReloadTimer > 0 ?
                    (weapon.continuousReload ? `LOADING SHELL · ${weapon.ammo}/${weapon.magazine}` :
                        (weapon.secondaryMagazine && weapon.ammo >= weapon.magazine && weapon.secondaryAmmo < weapon.secondaryMagazine ? 'RELOADING 40MM' : 'RELOADING')) :
                    (weapon.ammo <= 0 ? (weapon.reserveAmmo > 0 ? 'EMPTY · PRESS R' : 'EMPTY') :
                        readyStatus));
                status.classList.toggle('empty', weapon.ammo <= 0 && this.weaponReloadTimer <= 0 && this.weaponSwapTimer <= 0);
            }
            const slots = document.getElementById('hudWeaponSlots');
            if (slots) {
                const signature = this.weaponInventory.map((item, index) => `${item.id}:${item.ammo}:${item.reserveAmmo}:${item.secondaryAmmo || 0}:${item.secondaryReserveAmmo || 0}:${index === this.activeWeaponIndex}`).join('|');
                if (slots.dataset.signature !== signature) {
                    const shortNames = { rifle: 'RIFLE', sidearm: 'PISTOL', scattergun: 'SHOTGUN', sniper: 'SNIPER' };
                    slots.replaceChildren(...this.weaponInventory.map((item, index) => {
                        const slot = document.createElement('button');
                        slot.type = 'button';
                        slot.className = `weapon-slot${index === this.activeWeaponIndex ? ' active' : ''}${item.ammo <= 0 ? ' empty' : ''}`;
                        const launcherLabel = item.secondaryMagazine
                            ? ` · 40MM ${item.secondaryAmmo}/${item.secondaryReserveAmmo} reserve`
                            : '';
                        slot.title = `${item.name} · ${item.ammo}/${item.reserveAmmo} reserve${launcherLabel}`;
                        const isActive = index === this.activeWeaponIndex;
                        slot.setAttribute('aria-label', `${index + 1}: ${item.name}, ${item.ammo} loaded, ${item.reserveAmmo} reserve${item.secondaryMagazine ? `, launcher ${item.secondaryAmmo} loaded, ${item.secondaryReserveAmmo} reserve` : ''}${isActive ? ', selected' : ''}`);
                        slot.setAttribute('aria-pressed', String(isActive));
                        if (isActive) slot.setAttribute('aria-current', 'true');
                        slot.addEventListener('click', () => this.selectWeapon(index));
                        const key = document.createElement('span');
                        key.className = 'weapon-slot-key';
                        key.textContent = String(index + 1);
                        const label = document.createElement('span');
                        label.className = 'weapon-slot-name';
                        label.textContent = shortNames[item.id] || item.name;
                        const amount = document.createElement('span');
                        amount.className = 'weapon-slot-ammo';
                        amount.textContent = String(item.ammo);
                        slot.append(key, label, amount);
                        return slot;
                    }));
                    slots.dataset.signature = signature;
                }
            }
            if (crosshair) {
                crosshair.classList.toggle('aiming', this.ads);
                crosshair.classList.toggle('sniper-scope', sniperScopeActive);
                const spread = this.getCurrentWeaponSpread();
                const spreadPixels = spread * (this.container?.clientWidth || 1000) * 0.25;
                crosshair.style.setProperty('--crosshair-gap', `${(sniperScopeActive ? 3 : (this.ads ? 6 : 8)) + spreadPixels}px`);
            }
            if (scopeOverlay) scopeOverlay.classList.toggle('active', sniperScopeActive);
        }

        fireWeapon(ignoreCooldown = false) {
            if (!this.player || this.player.isDead || this.weaponSwapTimer > 0 || (!ignoreCooldown && this.weaponCooldown > 0)) return false;
            const weapon = this.weaponInventory[this.activeWeaponIndex];
            if (!weapon) return false;
            if (this.weaponReloadTimer > 0) {
                if (!weapon.continuousReload || weapon.ammo <= 0) return false;
                this.weaponReloadTimer = 0;
            }
            if (weapon.ammo <= 0) {
                if (this.controlMode === 'turnbased') this.combatText.spawnText(this.player.x, 20, this.player.y, 'EMPTY · PRESS R', 'damage');
                else this.reloadWeapon();
                return false;
            }

            weapon.ammo--;
            const attackSpeedMultiplier = this.player.overclockTimer > 0 ? 1.4 : 1;
            this.weaponCooldown = weapon.fireRate / attackSpeedMultiplier;
            if (weapon.id === 'sniper') {
                this.weaponBoltTimer = weapon.boltCycle || 0.28;
                this.weaponBoltSoundPending = true;
            }
            this.weaponFlashTimer = this.weaponFlashDuration;
            if (this.weaponGroup?.muzzleFlash) {
                this.weaponGroup.muzzleFlash.visible = true;
                this.weaponGroup.muzzleFlash.rotation.z = (Math.random() - 0.5) * 0.8;
                this.weaponGroup.muzzleFlash.scale.z = 1.4 + Math.random() * 1.0;
            }
            if (this.weaponGroup?.muzzleLight) this.weaponGroup.muzzleLight.intensity = 2.2;
            const cData = ClassData[this.player.classType];
            const classScale = cData ? cData.baseDmg / 20 : 1;
            const moving = Math.hypot(this.player.vx, this.player.vy) > this.player.speed * 0.45;
            const now = this.weaponAnimTime * 1000;
            if (now - this.weaponLastShotAt > 420) {
                this.weaponBurstCount = 0;
            }
            this.weaponBurstCount++;
            this.weaponLastShotAt = now;
            if (this.weaponBurstCount > 1) this.weaponSpreadBloom = Math.min(0.012, this.weaponSpreadBloom + 0.003);
            const spread = this.getCurrentWeaponSpread();
            const raycaster = new THREE.Raycaster();
            raycaster.far = weapon.range;
            const hits = new Map();
            const tracerColor = weapon.id === 'sniper' ? 0x7dd3fc : (weapon.id === 'scattergun' ? 0xff8a3d : (weapon.id === 'sidearm' ? 0x8be9fd : 0xffd166));
            const targets = this.mapMeshes[0] ? [this.mapMeshes[0]] : [];
            this.enemies.forEach(enemy => { if (enemy && enemy.hp > 0 && enemy.group3d) targets.push(enemy.group3d); });
            this.props.forEach(prop => { if (prop && !prop.broken && prop.group3d) targets.push(prop.group3d); });
            for (let pellet = 0; pellet < weapon.pellets; pellet++) {
                raycaster.setFromCamera({ x: (Math.random() - 0.5) * spread, y: (Math.random() - 0.5) * spread }, this.camera3d);
                const intersections = raycaster.intersectObjects(targets, true);
                const impact = intersections.length
                    ? intersections[0].point.clone()
                    : raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, weapon.range);
                const tracerStart = raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, 9);
                this.spawnWeaponTracer(tracerStart, impact, tracerColor);
                if (!intersections.length) continue;
                let object = intersections[0].object;
                let enemy = null;
                let prop = null;
                while (object && !enemy && !prop) {
                    enemy = this.enemies.find(candidate => candidate.group3d === object) || null;
                    prop = this.props.find(candidate => candidate.group3d === object) || null;
                    object = object.parent;
                }
                if (enemy) {
                    const hit = hits.get(enemy) || { pellets: 0, headshots: 0, damageScale: 0, impact };
                    hit.pellets++;
                    hit.damageScale += this.getWeaponDamageScale(weapon, intersections[0].distance);
                    let hitPart = intersections[0].object;
                    while (hitPart && hitPart !== enemy.group3d) {
                        if (hitPart === enemy.skull) {
                            hit.headshots++;
                            hit.impact = impact;
                            break;
                        }
                        hitPart = hitPart.parent;
                    }
                    hits.set(enemy, hit);
                } else if (prop) this.breakProp(prop);
                else this.vfx.spawnSparks(impact.x, impact.z, tracerColor, 3);
            }

            const forward = new THREE.Vector3();
            this.camera3d.getWorldDirection(forward);
            hits.forEach((hit, enemy) => this.applyHitToEnemy(
                enemy,
                weapon.damage * classScale * hit.damageScale,
                forward,
                hit.pellets,
                hit.headshots,
                weapon.id,
                hit.impact
            ));
            this.triggerShockwaveCleave(this.player, forward, new Set(hits.keys()));
            const hasAdsRecoil = this.ads && Array.isArray(weapon.adsRecoilPattern);
            const recoilPattern = hasAdsRecoil ? weapon.adsRecoilPattern : (weapon.recoilPattern || [[0, this.ads ? 0.018 : 0.035]]);
            const recoilStep = recoilPattern[(this.weaponBurstCount - 1) % recoilPattern.length];
            const recoilScale = (this.ads && !hasAdsRecoil ? 0.62 : 1) * (moving ? 1.3 : 1);
            this.cameraController.applyPunch(recoilStep[1] * recoilScale, recoilStep[0] * recoilScale);
            this.audio.playSfx('gunshot', weapon.id === 'sniper' ? 0.72 : (weapon.id === 'scattergun' ? 0.75 : (weapon.id === 'sidearm' ? 1.25 : 1)));
            this.weaponRecoil = 0.7;
            this.updateWeaponHUD();
            if (weapon.ammo === 0 && weapon.reserveAmmo > 0 && this.controlMode !== 'turnbased') this.reloadWeapon();
            return true;
        }

        triggerMeleeAttack(turnAction = false) {
            if ((!turnAction && this.swingTime > 0) || !this.player) return;

            const cData = ClassData[this.player.classType];
            const attackSpeedMultiplier = this.player.overclockTimer > 0 ? 1.4 : 1;
            this.swingDuration = cData.attackSpeed / attackSpeedMultiplier;
            this.swingTime = this.swingDuration;
            this.swingCombo = (this.swingCombo + 1) % 3;

            this.cameraController.applyPunch(0.04, -0.02);

            const forward = new THREE.Vector3();
            this.camera3d.getWorldDirection(forward);
            const directHits = new Set();

            if (this.player.classType === ClassType.MAGE) {
                // Cast projectile
                this.audio.playSfx('spell');
                const speed = 400;
                this.spawnProjectile(
                    this.player.x,
                    this.player.yElevation + 18,
                    this.player.y,
                    forward.x * speed,
                    forward.y * speed,
                    forward.z * speed,
                    cData.baseDmg,
                    true,
                    0xa855f7,
                    'magic'
                );
            } else if (this.player.classType === ClassType.SUPPORT) {
                // Rapid bio-needle
                this.audio.playSfx('spell', 1.6);
                const speed = 480;
                this.spawnProjectile(
                    this.player.x,
                    this.player.yElevation + 18,
                    this.player.y,
                    forward.x * speed,
                    forward.y * speed,
                    forward.z * speed,
                    cData.baseDmg,
                    true,
                    0x22c55e,
                    'chem'
                );
            } else {
                // Melee slash or hammer slam
                this.audio.playSfx('swing');
                const sweepRange = cData.range;

                // Check enemies
                this.enemies.forEach(e => {
                    if (e.hp <= 0) return;
                    const dx = e.x - this.player.x;
                    const dy = e.y - this.player.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist <= sweepRange) {
                        const toEnemy = new THREE.Vector3(dx, 0, dy).normalize();
                        const dot = forward.x * toEnemy.x + forward.z * toEnemy.z;

                        if (dot > 0.45 && this.hasBlastLineOfSight(
                            this.player.x, this.player.y, e.x, e.y, this.cameraEyeHeight, 20
                        )) { // Forward melee cone, blocked by dungeon walls
                            this.applyHitToEnemy(e, cData.baseDmg, forward);
                            directHits.add(e);
                        }
                    }
                });

                // Check breakable props
                this.props.forEach(prop => {
                    if (prop.broken) return;
                    const dx = prop.x - this.player.x;
                    const dz = prop.z - this.player.y;
                    const dist = Math.hypot(dx, dz);
                    if (dist <= sweepRange) {
                        const dot = (forward.x * dx + forward.z * dz) / Math.max(1, dist);
                        if (dot > 0.45 && this.hasBlastLineOfSight(
                            this.player.x, this.player.y, prop.x, prop.z, this.cameraEyeHeight, 10
                        )) this.breakProp(prop);
                    }
                });
            }
            this.triggerShockwaveCleave(this.player, forward, directHits);
        }

        performMeleeAttack() {
            return this.triggerMeleeAttack();
        }

        performWeaponMeleeAttack(turnAction = false) {
            if (!this.player || this.player.isDead || this.weaponSwapTimer > 0 ||
                (!turnAction && this.weaponMeleeCooldown > 0)) return false;
            if (!turnAction) {
                this.weaponMeleeCooldown = 0.72;
                if (this.weaponReloadTimer > 0) this.weaponReloadTimer = 0;
            }
            this.weaponBashTimer = 0.26;

            const forward = new THREE.Vector3();
            this.camera3d.getWorldDirection(forward);
            const horizontalLength = Math.hypot(forward.x, forward.z) || 1;
            const reach = 74;
            const directHits = new Set();
            this.enemies.forEach(enemy => {
                if (enemy.hp <= 0) return;
                const dx = enemy.x - this.player.x;
                const dz = enemy.y - this.player.y;
                const distance = Math.hypot(dx, dz);
                if (distance > reach + enemy.radius || distance < 1) return;
                if (!this.hasBlastLineOfSight(this.player.x, this.player.y, enemy.x, enemy.y, this.cameraEyeHeight, 20)) return;
                const dot = (forward.x * dx + forward.z * dz) / (distance * horizontalLength);
                if (dot < 0.38) return;
                const weapon = this.weaponInventory[this.activeWeaponIndex];
                this.applyHitToEnemy(enemy, weapon?.meleeDamage || 20, forward);
                directHits.add(enemy);
            });

            this.props.forEach(prop => {
                if (prop.broken) return;
                const dx = prop.x - this.player.x;
                const dz = prop.z - this.player.y;
                const distance = Math.hypot(dx, dz);
                if (distance > reach + prop.radius || distance < 1) return;
                if (!this.hasBlastLineOfSight(this.player.x, this.player.y, prop.x, prop.z, this.cameraEyeHeight, 10)) return;
                const dot = (forward.x * dx + forward.z * dz) / (distance * horizontalLength);
                if (dot >= 0.38) this.breakProp(prop);
            });

            this.cameraController.applyPunch(0.075, -0.025);
            this.weaponRecoil = -1.2;
            this.audio.playSfx('swing', 1.25);
            if (!directHits.size) this.combatText.spawnText(this.player.x, 20, this.player.y, 'WEAPON BASH', 'block');
            return directHits.size > 0;
        }

        applyHitToEnemy(enemy, baseDmg, dir, hitUnits = 1, headshotUnits = 0, sourceWeapon = null, impact, kind = sourceWeapon ? 'shot' : 'cut') {
            if (!enemy || enemy.hp <= 0) return false;
            let dmg = baseDmg;
            const dmgBonus = this.armoryRanks.damage ? (1.0 + this.armoryRanks.damage * 0.15) : 1.0;
            dmg *= dmgBonus;

            const isHeadshot = headshotUnits > 0;
            if (isHeadshot && hitUnits > 0) {
                dmg *= 1 + 0.65 * Math.min(1, headshotUnits / hitUnits);
            }
            if (isHeadshot && sourceWeapon === 'sniper' && this.player.hasPerk('deadeye')) dmg *= 1.35;

            if (this.player.hasPerk('goldrush')) {
                dmg *= (1.0 + (this.gold / 20) * 0.01);
            }

            let isCrit = Math.random() < (ClassData[this.player.classType].critChance + (this.player.hasPerk('critfury') ? 0.20 : 0));
            if (isCrit) {
                const baseCritMultiplier = ClassData[this.player.classType].critMult;
                const critBonusMultiplier = this.player.hasPerk('critfury') ? 1.5 : 1;
                dmg *= 1 + (baseCritMultiplier - 1) * critBonusMultiplier;
            }

            const wasAlive = enemy.hp > 0;
            enemy.hp -= dmg;
            window.GraveGainEnemyVoxels.fracture(enemy, this.scene, dmg, dir, kind, impact);
            enemy.kx = dir.x * 160;
            enemy.ky = dir.z * 160;

            // Trigger hitstop & audio
            this.hitstop = 0.04;
            this.vfx.spawnBlood(enemy.x, enemy.y, enemy.bloodColor);
            this.emitGraphicsBurst(enemy.x, enemy.y, isCrit || isHeadshot ? '#fbbf24' : '#ef4444', isCrit || isHeadshot ? 1.5 : 0.8);
            this.audio.playSfx(isCrit || isHeadshot ? 'crit' : 'hit', isHeadshot ? 1.2 : 1);

            const hitLabel = `${isHeadshot ? 'HEADSHOT! ' : ''}${isCrit ? 'CRIT! ' : ''}${Math.round(dmg)}`;
            this.combatText.spawnText(enemy.x, 20, enemy.y, hitLabel, isCrit || isHeadshot ? 'crit' : 'damage');

            // Perks triggers
            if (this.player.hasPerk('vampiric')) {
                const leech = Math.max(1, dmg * 0.15);
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + leech);
            }

            if (this.player.hasPerk('lightning')) {
                this.triggerChainLightning(enemy, 18);
            }

            if (wasAlive && enemy.hp <= 0 && isHeadshot && sourceWeapon === 'sniper' && this.player.hasPerk('deadeye')) {
                const sniper = this.weaponInventory.find(weapon => weapon.id === 'sniper');
                if (sniper && sniper.ammo < sniper.magazine) {
                    sniper.ammo++;
                    this.combatText.spawnText(enemy.x, 27, enemy.y, '+1 SNIPER ROUND', 'crit');
                    this.updateWeaponHUD();
                }
            }

            if (this.player.hasPerk('pyromancy')) {
                enemy.burnTimer = Math.max(enemy.burnTimer || 0, 3);
                enemy.burnFxTimer = 0;
            }
            if (this.player.hasPerk('frostbite')) {
                enemy.chillTimer = Math.max(enemy.chillTimer || 0, 3);
                this.vfx.spawnSparks(enemy.x, enemy.y, 0x67e8f9, 7);
            }

            if (this.player.hasPerk('executioner') && !enemy.isBoss && (enemy.hp / enemy.maxHp < 0.25)) {
                enemy.hp = 0;
                this.combatText.spawnText(enemy.x, 25, enemy.y, 'EXECUTED!', 'crit');
            }

            this.showHitMarker(enemy.hp <= 0, isCrit, isHeadshot);
        }

        triggerChainLightning(sourceEnemy, dmg) {
            let hits = 0;
            this.enemies.forEach(target => {
                if (target !== sourceEnemy && target.hp > 0 && hits < 2) {
                    const dist = Math.hypot(target.x - sourceEnemy.x, target.y - sourceEnemy.y);
                    if (dist < 200) {
                        target.hp -= dmg;
                        window.GraveGainEnemyVoxels.fracture(target, this.scene, dmg);
                        this.vfx.spawnSparks(target.x, target.y, 0x38bdf8, 15);
                        this.combatText.spawnText(target.x, 20, target.y, `⚡${dmg}`, 'block');
                        hits++;
                    }
                }
            });
            if (hits > 0) this.audio.playSfx('spell', 1.8);
        }

        breakProp(prop) {
            prop.broken = true;
            this.scene.remove(prop.group3d);
            this.vfx.spawnSparks(prop.x, prop.z, 0xb45309, 20);
            this.audio.playSfx('hit', 1.2);

            if (prop.type === 'chest') {
                this.audio.playSfx('loot');
                for (let i = 0; i < 4; i++) {
                    const ox = prop.x + (Math.random() * 20 - 10);
                    const oz = prop.z + (Math.random() * 20 - 10);
                    const item = new LootItem(ox, oz, 'gold', 35);
                    this.scene.add(item.group3d);
                    this.loot.push(item);
                }
                if (Math.random() < 0.5) {
                    const pot = new LootItem(prop.x, prop.z, 'potion', 1);
                    this.scene.add(pot.group3d);
                    this.loot.push(pot);
                }
                if (Math.random() < 0.7) {
                    const ammo = new LootItem(prop.x + 8, prop.z - 8, 'ammo', 45);
                    this.scene.add(ammo.group3d);
                    this.loot.push(ammo);
                }
                if (Math.random() < 0.35) this.spawnGrenadeLoot(prop.x - 10, prop.z + 8);
            } else {
                if (Math.random() < 0.5) {
                    const item = new LootItem(prop.x, prop.z, 'gold', 15);
                    this.scene.add(item.group3d);
                    this.loot.push(item);
                }
                if (Math.random() < 0.14) {
                    const ammo = new LootItem(prop.x, prop.z, 'ammo', 30);
                    this.scene.add(ammo.group3d);
                    this.loot.push(ammo);
                }
                if (Math.random() < 0.05) this.spawnGrenadeLoot(prop.x + 8, prop.z - 8);
            }
            // Campaign: cracked caches count toward collect_ore objectives
            // (chests hold power crystals; crates may hide raw ore).
            try {
                if (this.currentMission && this.currentMission.objectives) {
                    let oreHit = false;
                    this.currentMission.objectives.forEach(o => {
                        if (!o || o.id !== 'collect_ore') return;
                        if ((Number(o.current) || 0) >= (Number(o.count) || 0)) return;
                        if (prop.type === 'chest' || (prop.type === 'crate' && Math.random() < 0.5)) {
                            o.current = (Number(o.current) || 0) + 1;
                            oreHit = true;
                            try {
                                this.combatText.spawnText(this.player.x, 25, this.player.y,
                                    `Ore: ${o.current}/${o.count}`, 'xp');
                            } catch (_) { /* ignore */ }
                        }
                    });
                    if (oreHit) this.checkMissionComplete();
                }
            } catch (_) { /* never break prop loot */ }
        }

        dealAoEDamage(x, y, radius, dmg, type) {
            this.enemies.forEach(e => {
                if (e.hp <= 0) return;
                const dist = Math.hypot(e.x - x, e.y - y);
                if (dist <= radius) {
                    e.hp -= dmg;
                    window.GraveGainEnemyVoxels.fracture(e, this.scene, dmg, null, 'blast', { x, y: 12, z: y });
                    e.kx = (e.x - x) * 1.5;
                    e.ky = (e.y - y) * 1.5;
                    this.combatText.spawnText(e.x, 20, e.y, `${Math.round(dmg)}`, 'crit');
                    this.vfx.spawnSparks(e.x, e.y, type === 'nature' ? 0x4cff7f : 0xff4c4c, 15);
                }
            });
        }

        usePotion(fromTurnAction = false) {
            if (!this.player || this.player.isDead) return;
            if (this.controlMode === 'turnbased' && !fromTurnAction) {
                if (this.isTurnProcessing || this.player.potions <= 0 || this.player.hp >= this.player.maxHp) return;
                this.executeTurnAction('potion');
                return;
            }
            if (this.player.potions > 0 && this.player.hp < this.player.maxHp) {
                this.player.potions--;
                const healAmt = Math.round(this.player.maxHp * 0.5);
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
                this.audio.playSfx('potion');
                this.vfx.spawnSparks(this.player.x, this.player.y, 0x4ade80, 20);
                this.combatText.spawnText(this.player.x, 20, this.player.y, `+${healAmt} HP`, 'heal');
                this.updateHUD();
            }
        }

        triggerLevelUp() {
            this.isPaused = true;
            this.audio.playSfx('levelup');

            const screen = document.getElementById('levelUpScreen');
            const grid = document.getElementById('perkCardsGrid');
            if (!screen || !grid) return;

            // Pick 3 random distinct perks (guard: exhausted pool must not softlock)
            const pool = RoguelikePerks.filter(p => !this.player.hasPerk(p.id));
            if (pool.length === 0) {
                screen.classList.add('hidden');
                this.isPaused = false;
                return;
            }
            const shuffled = [...pool].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 3);

            grid.innerHTML = selected.map(perk => `
                <div class="perk-card" data-perk="${perk.id}">
                    <span class="perk-rarity perk-rarity-${perk.rarity}">${perk.rarity}</span>
                    <span class="perk-icon">${perk.icon}</span>
                    <div class="perk-name">${perk.name}</div>
                    <div class="perk-desc">${perk.desc}</div>
                    <button class="btn-game btn-primary" style="font-size:0.8rem; padding:8px 16px; margin-top:auto;">Select Boon</button>
                </div>
            `).join('');

            const cards = grid.querySelectorAll('.perk-card');
            cards.forEach(card => {
                card.addEventListener('click', () => {
                    const perkId = card.dataset.perk;
                    const chosen = RoguelikePerks.find(p => p.id === perkId);
                    if (chosen) {
                        this.player.perks.push(chosen);
                        if (chosen.id === 'titan') {
                            this.player.maxHp += 50;
                            this.player.hp = this.player.maxHp;
                        }
                        if (chosen.id === 'orb_havoc') this.enableOrbitingGlaive();
                        this.combatText.showBanner(`BOON ACQUIRED: ${chosen.name}`);
                    }
                    screen.classList.add('hidden');
                    this.isPaused = false;
                    requestPointerLockSafely(this.container);
                });
            });

            screen.classList.remove('hidden');
            exitPointerLockSafely();
        }

        setControlMode(mode) {
            this.controlMode = mode;
            if (mode === 'turnbased' && this.weaponSwapTimer > 0) {
                this.weaponSwapTimer = 0;
                this.updateWeaponHUD();
            }
            if (mode === 'turnbased' && this.weaponReloadTimer > 0) {
                const weapon = this.weaponInventory[this.activeWeaponIndex];
                if (weapon) {
                    const amount = Math.min(weapon.continuousReload ? 1 : weapon.magazine - weapon.ammo, weapon.magazine - weapon.ammo, weapon.reserveAmmo);
                    weapon.ammo += amount;
                    weapon.reserveAmmo -= amount;
                    if (weapon.secondaryMagazine) {
                        const secondaryAmount = Math.min(weapon.secondaryMagazine - weapon.secondaryAmmo, weapon.secondaryReserveAmmo);
                        weapon.secondaryAmmo += secondaryAmount;
                        weapon.secondaryReserveAmmo -= secondaryAmount;
                    }
                }
                this.weaponReloadTimer = 0;
                this.updateWeaponHUD();
            }

            // Update Mode Buttons in HUD
            document.querySelectorAll('.btn-mode').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
            });

            // Update Mode Cards in Char Select
            document.querySelectorAll('.char-mode-card').forEach(card => {
                card.classList.toggle('selected', card.dataset.mode === mode);
            });

            // Update Mobile Mode Panel buttons
            document.querySelectorAll('.mmp-mode-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
            });

            const speedGroup = document.getElementById('speedSelectorGroup');
            const turnGroup = document.getElementById('turnDisplayGroup');
            const chronoGroup = document.getElementById('chronoDisplayGroup');
            const mobileWait = document.getElementById('mobileWaitBtn');
            const controlsHint = document.getElementById('controlsHint');
            const mmpSpeeds = document.getElementById('mmpSpeeds');
            const mmhModeBadge = document.getElementById('mmhModeBadge');
            const mobileStatusBar = document.getElementById('mobileStatusBar');
            const mobileStatusText = document.getElementById('mobileStatusText');

            if (mode === 'realtime') {
                if (speedGroup) speedGroup.classList.remove('hidden');
                if (turnGroup) turnGroup.classList.add('hidden');
                if (chronoGroup) chronoGroup.classList.add('hidden');
                if (mobileWait) mobileWait.classList.add('hidden');
                if (mmpSpeeds) mmpSpeeds.style.display = 'flex';
                if (mmhModeBadge) mmhModeBadge.textContent = '⚡ RT';
                if (mobileStatusBar) mobileStatusBar.classList.add('hidden');
                if (controlsHint) controlsHint.textContent = 'Controls: WASD Move | Mouse Look (RMB drag if lock unavailable) | LMB Fire | RMB Aim | Z/X Lean | T M4 AUTO/SEMI | Y M4 40MM | V Class Attack | G Grenade | B Block | R Reload | 1–4 / Wheel Swap | H Drop Weapon | Shift Sprint | tap C to Slide / Ctrl Crouch | Space Jump | F Ability | Q Potion';
            } else if (mode === 'chrono') {
                if (speedGroup) speedGroup.classList.add('hidden');
                if (turnGroup) turnGroup.classList.add('hidden');
                if (chronoGroup) chronoGroup.classList.remove('hidden');
                if (mobileWait) mobileWait.classList.add('hidden');
                if (mmpSpeeds) mmpSpeeds.style.display = 'none';
                if (mmhModeBadge) mmhModeBadge.textContent = '⏳ CHR';
                if (mobileStatusBar) {
                    mobileStatusBar.classList.remove('hidden');
                    if (mobileStatusText) mobileStatusText.textContent = 'TIME FROZEN';
                }
                if (controlsHint) controlsHint.textContent = 'Chrono-Lock: WASD Move | Mouse Look (RMB drag if lock unavailable) | RMB Aim | Z/X Lean | LMB Fire | T M4 AUTO/SEMI | Y M4 40MM | R Reload | 1–4 / Wheel Swap | H Drop Weapon | Freeze still to dodge.';
            } else if (mode === 'turnbased') {
                if (speedGroup) speedGroup.classList.add('hidden');
                if (turnGroup) turnGroup.classList.remove('hidden');
                if (chronoGroup) chronoGroup.classList.add('hidden');
                if (mobileWait) mobileWait.classList.remove('hidden');
                if (mmpSpeeds) mmpSpeeds.style.display = 'none';
                if (mmhModeBadge) mmhModeBadge.textContent = '🎲 TB';
                if (mobileStatusBar) {
                    mobileStatusBar.classList.remove('hidden');
                    if (mobileStatusText) mobileStatusText.textContent = 'YOUR TURN';
                }
                if (controlsHint) controlsHint.textContent = 'Turn-Based: WASD Step | LMB Fire | N Weapon Bash | V Class Attack | G Grenade | R Reload (shotgun one shell per turn) | 1–4 / Wheel Swap | H Drop Weapon | B / Space Defend or Wait | F Ability | Q Potion';
                this.turnCount = 1;
                const turnCounter = document.getElementById('hudTurnCounter');
                if (turnCounter) turnCounter.textContent = `Turn ${this.turnCount}`;
                const turnPhase = document.getElementById('hudTurnPhase');
                if (turnPhase) {
                    turnPhase.textContent = 'YOUR TURN';
                    turnPhase.className = 'turn-phase-badge player-phase';
                }
            }
            this.updateWeaponHUD();
        }

        setGameSpeed(speed) {
            this.gameSpeed = parseFloat(speed) || 1.0;
            document.querySelectorAll('.btn-speed').forEach(btn => {
                btn.classList.toggle('active', parseFloat(btn.dataset.speed) === this.gameSpeed);
            });
        }

        executeTurnAction(action) {
            if (this.controlMode !== 'turnbased' || this.isTurnProcessing || !this.player || this.player.isDead) return;
            if (action === 'drop_weapon' && this.weaponInventory.length <= 1) {
                this.combatText.spawnText(this.player.x, 20, this.player.y, 'KEEP YOUR LAST WEAPON', 'block');
                return;
            }

            this.isTurnProcessing = true;
            const phaseBadge = document.getElementById('hudTurnPhase');
            if (phaseBadge) {
                phaseBadge.textContent = 'PLAYER ACTION';
                phaseBadge.className = 'turn-phase-badge player-phase';
            }

            // 1. Execute Player Action
            if (action === 'step_forward' || action === 'step_backward' || action === 'step_left' || action === 'step_right') {
                const stepDist = 48;
                let nx = 0, nz = 0;
                if (action === 'step_forward') nz = -1;
                else if (action === 'step_backward') nz = 1;
                else if (action === 'step_left') nx = -1;
                else if (action === 'step_right') nx = 1;

                const cosYaw = Math.cos(this.player.yaw);
                const sinYaw = Math.sin(this.player.yaw);
                const dx = (nx * cosYaw + nz * sinYaw) * stepDist;
                const dy = (-nx * sinYaw + nz * cosYaw) * stepDist;

                const turnObstacles = [...this.props, ...this.enemies.filter(enemy => enemy && enemy.hp > 0)];
                this.physics.moveEntityWithCollision(this.player, dx, dy, this.dungeon, turnObstacles);
                this.audio.playSfx('swing', 2.0);
            } else if (action === 'attack') {
                this.fireWeapon(true);
            } else if (action === 'grenade') {
                this.throwGrenade();
            } else if (action === 'melee') {
                this.triggerMeleeAttack(true);
            } else if (action === 'weapon_melee') {
                this.performWeaponMeleeAttack(true);
            } else if (action === 'reload') {
                const weapon = this.weaponInventory[this.activeWeaponIndex];
                if (weapon) {
                    const amount = Math.min(weapon.continuousReload ? 1 : weapon.magazine - weapon.ammo, weapon.magazine - weapon.ammo, weapon.reserveAmmo);
                    weapon.ammo += amount;
                    weapon.reserveAmmo -= amount;
                    const secondaryAmount = weapon.secondaryMagazine
                        ? Math.min(weapon.secondaryMagazine - weapon.secondaryAmmo, weapon.secondaryReserveAmmo)
                        : 0;
                    weapon.secondaryAmmo += secondaryAmount;
                    weapon.secondaryReserveAmmo -= secondaryAmount;
                    if (amount > 0 || secondaryAmount > 0) {
                        this.audio.playSfx('reload', 0.75);
                        const label = weapon.continuousReload ? 'SHELL LOADED' : 'RELOADED';
                        this.combatText.spawnText(this.player.x, 20, this.player.y,
                            `${label} · ${weapon.ammo}/${weapon.reserveAmmo}${secondaryAmount > 0 ? ` · GL +${secondaryAmount}` : ''}`, 'block');
                        this.updateWeaponHUD();
                    }
                }
            } else if (action === 'drop_weapon') {
                this.dropCurrentWeapon(true);
            } else if (action === 'ability') {
                this.player.triggerAbility();
            } else if (action === 'wait') {
                // Recover stamina & defensive posture
                this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 35);
                if (this.player.race === Race.HUMAN) {
                    this.player.shieldBubble = Math.min(25, this.player.shieldBubble + 8);
                }
                this.combatText.spawnText(this.player.x, 20, this.player.y, 'DEFENDING / WAITING', 'block');
                this.audio.playSfx('block', 0.9);
            } else if (action === 'potion') {
                this.usePotion(true);
            }

            // Check loot pickups
            const pickupRange = this.player.hasPerk('magnet') ? 110 : 55;
            this.loot.forEach(l => {
                const dist = Math.hypot(this.player.x - l.x, this.player.y - l.y);
                if (l.waitForPlayerClear) {
                    if (dist > this.player.radius + l.radius + 55) {
                        l.waitForPlayerClear = false;
                        l.waitForPlayerReturn = true;
                    }
                    return;
                }
                if (l.waitForPlayerReturn) {
                    if (dist > this.player.radius + l.radius + 55) return;
                    l.waitForPlayerReturn = false;
                }
                if (l.pickupDelay <= 0 && dist < this.player.radius + l.radius + pickupRange) {
                    this.collectLoot(l);
                }
            });
            this.loot = this.loot.filter(l => !l.picked);

            // Hazard checks on current tile
            const tx = Math.floor(this.player.x / 48);
            const ty = Math.floor(this.player.y / 48);
            if (this.dungeon && this.dungeon.grid && this.dungeon.grid[tx]) {
                const cell = this.dungeon.grid[tx][ty];
                if (cell === 3 && this.player.race !== Race.DWARF) {
                    this.player.takeDamage(12, 'poison');
                } else if (cell === 4) {
                    this.player.takeDamage(16, 'fire');
                }
            }

            // Portal Descent check
            const safespace = this.dungeon.rooms.find(r => r.type === 'safespace' || r.type === 'boss');
            if (safespace && (!this.activeBoss || this.activeBoss.hp <= 0)) {
                const sx = safespace.cx * 48 + 24;
                const sy = safespace.cy * 48 + 24;
                if (Math.hypot(this.player.x - sx, this.player.y - sy) < 45) {
                    this.floorIndex++;
                    this.buildDungeonLayer();
                    this.combatText.showBanner(`DESCENDED TO LAYER ${this.floorIndex}`);
                    this.audio.playSfx('spell', 1.3);
                    this.isTurnProcessing = false;
                    return;
                }
            }

            // 2. Enemy Phase
            if (phaseBadge) {
                phaseBadge.textContent = 'ENEMY TURN';
                phaseBadge.className = 'turn-phase-badge enemy-phase';
            }
            const mobileStatusText2 = document.getElementById('mobileStatusText');
            if (mobileStatusText2) mobileStatusText2.textContent = 'ENEMY TURN ⚔️';

            setTimeout(() => {
                if (!this.player || this.player.isDead) {
                    this.isTurnProcessing = false;
                    return;
                }
                this.player.advanceTurn(0.35);

                // Advance projectiles: one turn equals 0.35s of realtime
                // flight, stepped through the same update() the realtime
                // loop uses so gravity, wall collision, and lifetime expiry
                // behave identically in both modes.
                this.projectiles.forEach(p => {
                    p.update(0.35, this.dungeon);
                    this.resolveProjectileHit(p);
                });
                this.projectiles.filter(p => p.dead).forEach(p => { this.scene.remove(p.mesh); p.dispose(); });
                this.projectiles = this.projectiles.filter(p => !p.dead);

                // Enemies take turn
                this.enemies.forEach(e => {
                    if (e.hp <= 0) return;
                    // Reuse realtime AI in 0.35s turns so status effects,
                    // attack telegraphs, and boss-specific moves stay active
                    // in every combat mode.
                    e.update(0.35, this.player, this.physics, this.dungeon, this);
                });

                this.updateOrbitingGlaive(0.35);

                // Clean dead enemies & drop loot
                this.enemies.forEach(e => {
                    if (e.hp <= 0) {
                        const greedMult = this.armoryRanks.greed ? (1.0 + this.armoryRanks.greed * 0.25) : 1.0;
                        const difficulty = DifficultyData[this.difficulty] || DifficultyData.normal;
                        const perkDropMult = this.player.hasPerk('magnet') ? 1.4 : 1.0;
                        const goldGain = Math.round((e.isBoss ? 150 : 15) * greedMult * difficulty.lootMultiplier * perkDropMult);
                        const xpGain = Math.round((e.isBoss ? 120 : 25) * difficulty.xpMultiplier * this.getMissionScaleMult() * perkDropMult);

                        this.gold += goldGain;
                        this.kills++;
                        this.onEnemyKilled(e);
                        this.player.addXp(xpGain);
                        this.vfx.spawnBlood(e.x, e.y, e.bloodColor);
                        if (e.isBoss && this.vfx.spawnDeathBurst) this.vfx.spawnDeathBurst(e.x, e.y, e.name, 30);

                        // Check Story Mission objectives
                        if (this.currentMission) {
                            this.checkStoryObjectives(e);
                        }

                        this.spawnEnemyLoot(e, goldGain);

                        if (e.isBoss) {
                            this.activeBoss = null;
                            this.audio.playSfx('levelup');
                            this.combatText.showBanner('🏆 BOSS DEFEATED! 🏆');
                            const bossBar = document.getElementById('bossBarContainer');
                            if (bossBar) bossBar.classList.add('hidden');
                        }
                        e.destroy();
                    }
                });
                this.enemies = this.enemies.filter(e => e.hp > 0);

                // End of turn
                this.turnCount++;
                const turnCounter = document.getElementById('hudTurnCounter');
                if (turnCounter) turnCounter.textContent = `Turn ${this.turnCount}`;
                if (phaseBadge) {
                    phaseBadge.textContent = 'YOUR TURN';
                    phaseBadge.className = 'turn-phase-badge player-phase';
                }
                const mobileStatusTextEnd = document.getElementById('mobileStatusText');
                if (mobileStatusTextEnd) mobileStatusTextEnd.textContent = `YOUR TURN (T${this.turnCount})`;
                this.isTurnProcessing = false;
                this.updateHUD();
                this.drawMinimap();
            }, 130);
        }

        update(dt) {
            if (!this.player) return;
            if (this.hitstop > 0) {
                this.hitstop -= dt;
                return;
            }

            const isShake = document.getElementById('settingsCameraShake').checked;

            // 1. Determine effectiveDt based on controlMode
            let effectiveDt = dt;
            if (this.controlMode === 'realtime') {
                effectiveDt = dt * this.gameSpeed;
            } else if (this.controlMode === 'chrono') {
                // Chrono-Lock (SUPERHOT style): Time moves ONLY when you move, look, or attack
                const movementKeysDown = !!(this.input.keys['KeyW'] || this.input.keys['KeyS'] ||
                    this.input.keys['KeyA'] || this.input.keys['KeyD'] ||
                    this.input.keys['ArrowUp'] || this.input.keys['ArrowDown'] ||
                    this.input.keys['ArrowLeft'] || this.input.keys['ArrowRight'] ||
                    this.input.keys['Space']);
                const isMoving = this.player.isSliding || !this.player.grounded || movementKeysDown;
                const isJoyMoving = this.input.joystick.active && Math.hypot(this.input.joystick.x, this.input.joystick.y) > 0.08;
                const isLooking = (this.input.lastLookDelta || 0) > 0.8;
                const activeWeaponForTime = this.weaponInventory[this.activeWeaponIndex];
                const launcherCooldownActive = (activeWeaponForTime?.secondaryNextFireAt || 0) > this.weaponAnimTime * 1000;
                const isAttacking = this.swingTime > 0 || this.weaponCooldown > 0 || this.weaponMeleeCooldown > 0 || this.projectiles.length > 0 ||
                    launcherCooldownActive || this.input.mouse.click || this.input.mouse.fireDown || this.input.mouse.aiming || this.input.mouse.isBlocking ||
                    this.weaponReloadTimer > 0 || this.weaponSwapTimer > 0;
                const isAbilOrPot = !!(this.input.keys['KeyF'] || this.input.keys['KeyQ']);

                const hasActivity = isMoving || isJoyMoving || isLooking || isAttacking || isAbilOrPot;
                const targetScale = hasActivity ? 1.0 : 0.035;
                this.chronoScale = THREE.MathUtils.lerp(this.chronoScale, targetScale, 0.22);
                effectiveDt = dt * this.chronoScale;

                if (this.input.lastLookDelta) {
                    this.input.lastLookDelta *= 0.65;
                }

                const badge = document.getElementById('chronoStatusBadge');
                const mobileSt = document.getElementById('mobileStatusText');
                if (badge) {
                    if (this.chronoScale > 0.25) {
                        badge.textContent = `TIME FLOWING (${Math.round(this.chronoScale * 100)}%)`;
                        badge.className = 'chrono-badge flowing';
                        if (mobileSt) mobileSt.textContent = `⏩ ${Math.round(this.chronoScale * 100)}%`;
                    } else {
                        badge.textContent = 'TIME FROZEN';
                        badge.className = 'chrono-badge frozen';
                        if (mobileSt) mobileSt.textContent = '❄️ FROZEN';
                    }
                }
            } else if (this.controlMode === 'turnbased') {
                // Turn-based mode: continuous physics paused, discrete actions drive turns
                effectiveDt = 0;

                if (!this.isTurnProcessing) {
                    if (this.input.keys['KeyW'] || this.input.keys['ArrowUp']) {
                        this.input.keys['KeyW'] = false;
                        this.input.keys['ArrowUp'] = false;
                        this.executeTurnAction('step_forward');
                    } else if (this.input.keys['KeyS'] || this.input.keys['ArrowDown']) {
                        this.input.keys['KeyS'] = false;
                        this.input.keys['ArrowDown'] = false;
                        this.executeTurnAction('step_backward');
                    } else if (this.input.keys['KeyA'] || this.input.keys['ArrowLeft']) {
                        this.input.keys['KeyA'] = false;
                        this.input.keys['ArrowLeft'] = false;
                        this.executeTurnAction('step_left');
                    } else if (this.input.keys['KeyD'] || this.input.keys['ArrowRight']) {
                        this.input.keys['KeyD'] = false;
                        this.input.keys['ArrowRight'] = false;
                        this.executeTurnAction('step_right');
                    } else if (this.input.keys['Space']) {
                        this.input.keys['Space'] = false;
                        this.executeTurnAction('wait');
                    } else if (this.input.mouse.click) {
                        this.input.mouse.click = false;
                        this.executeTurnAction('attack');
                    } else if (this.input.keys['KeyF']) {
                        this.input.keys['KeyF'] = false;
                        this.executeTurnAction('ability');
                    } else if (this.input.joystick.active && Math.hypot(this.input.joystick.x, this.input.joystick.y) > 0.6) {
                        if (!this.joyTurnDebounce) {
                            this.joyTurnDebounce = true;
                            const jx = this.input.joystick.x;
                            const jy = this.input.joystick.y;
                            if (Math.abs(jy) > Math.abs(jx)) {
                                this.executeTurnAction(jy < 0 ? 'step_forward' : 'step_backward');
                            } else {
                                this.executeTurnAction(jx < 0 ? 'step_left' : 'step_right');
                            }
                            setTimeout(() => { this.joyTurnDebounce = false; }, 260);
                        }
                    }
                }
            }

            this.weaponCooldown = Math.max(0, this.weaponCooldown - effectiveDt);
            this.weaponMeleeCooldown = Math.max(0, this.weaponMeleeCooldown - effectiveDt);
            if (this.weaponSwapTimer > 0) {
                const previousSwapTimer = this.weaponSwapTimer;
                this.weaponSwapTimer = Math.max(0, this.weaponSwapTimer - effectiveDt);
                if (previousSwapTimer > 0 && this.weaponSwapTimer === 0) this.updateWeaponHUD();
            }
            if (this.weaponReloadTimer > 0) {
                this.weaponReloadTimer = Math.max(0, this.weaponReloadTimer - effectiveDt);
                if (this.weaponReloadTimer === 0) {
                    const weapon = this.weaponInventory[this.activeWeaponIndex];
                    if (weapon) {
                        const amount = weapon.ammo < weapon.magazine && weapon.reserveAmmo > 0
                            ? Math.min(weapon.continuousReload ? 1 : weapon.magazine - weapon.ammo, weapon.magazine - weapon.ammo, weapon.reserveAmmo)
                            : 0;
                        weapon.ammo += amount;
                        weapon.reserveAmmo -= amount;
                        if (weapon.secondaryMagazine) {
                            const secondaryAmount = Math.min(weapon.secondaryMagazine - weapon.secondaryAmmo, weapon.secondaryReserveAmmo);
                            weapon.secondaryAmmo += secondaryAmount;
                            weapon.secondaryReserveAmmo -= secondaryAmount;
                        }
                        if (weapon.continuousReload && weapon.ammo < weapon.magazine && weapon.reserveAmmo > 0) {
                            this.weaponReloadTimer = weapon.shellReload || weapon.reload;
                        }
                        this.audio.playSfx('reload', weapon.continuousReload ? 0.55 : 0.75);
                    }
                    this.updateWeaponHUD();
                }
            }
            this.ads = !!this.input.mouse.aiming && !this.player.sprinting;

            // 2. Realtime/Chrono updates
            if (this.controlMode !== 'turnbased') {
                this.player.isBlocking = this.input.mouse.isBlocking || !!this.input.keys['KeyB'];

                // Handle primary attack
                const activeWeapon = this.weaponInventory[this.activeWeaponIndex];
                if (this.input.mouse.click || (activeWeapon?.automatic && this.input.mouse.fireDown)) {
                    if (this.fireWeapon()) this.input.mouse.click = false;
                }

                // Handle ability
                if (this.input.keys['KeyF']) {
                    this.player.triggerAbility();
                    this.input.keys['KeyF'] = false;
                }

                this.player.update(effectiveDt, this.input, this.physics, this.dungeon);

                // Update enemies
                this.enemies.forEach(e => e.update(effectiveDt, this.player, this.physics, this.dungeon, this));
                this.updateOrbitingGlaive(effectiveDt);

                // Clean dead enemies & drop loot
                this.enemies.forEach(e => {
                    if (e.hp <= 0) {
                        const greedMult = this.armoryRanks.greed ? (1.0 + this.armoryRanks.greed * 0.25) : 1.0;
                        const difficulty = DifficultyData[this.difficulty] || DifficultyData.normal;
                        const perkDropMult = this.player.hasPerk('magnet') ? 1.4 : 1.0;
                        const goldGain = Math.round((e.isBoss ? 150 : 15) * greedMult * difficulty.lootMultiplier * perkDropMult);
                        const xpGain = Math.round((e.isBoss ? 120 : 25) * difficulty.xpMultiplier * this.getMissionScaleMult() * perkDropMult);

                        this.gold += goldGain;
                        this.kills++;
                        this.onEnemyKilled(e);
                        this.player.addXp(xpGain);
                        this.vfx.spawnBlood(e.x, e.y, e.bloodColor);
                        if (e.isBoss && this.vfx.spawnDeathBurst) this.vfx.spawnDeathBurst(e.x, e.y, e.name, 30);

                        // Check Story Mission objectives (all modes, not just turn-based)
                        if (this.currentMission) {
                            this.checkStoryObjectives(e);
                        }

                        // Drop loot
                        this.spawnEnemyLoot(e, goldGain);

                        if (e.isBoss) {
                            this.activeBoss = null;
                            this.audio.playSfx('levelup');
                            this.combatText.showBanner('🏆 BOSS DEFEATED! 🏆');
                            const bossBar = document.getElementById('bossBarContainer');
                            if (bossBar) bossBar.classList.add('hidden');
                        }

                        e.destroy();
                    }
                });
                this.enemies = this.enemies.filter(e => e.hp > 0);

                // Update Boss health bar
                if (this.activeBoss) {
                    const percent = Math.max(0, (this.activeBoss.hp / this.activeBoss.maxHp) * 100);
                    document.getElementById('bossHpBar').style.width = `${percent}%`;
                    document.getElementById('bossHpText').textContent = `${Math.round(this.activeBoss.hp)} / ${Math.round(this.activeBoss.maxHp)}`;
                }

                // Update Projectiles
                this.projectiles.forEach(p => {
                    p.update(effectiveDt, this.dungeon);
                    this.resolveProjectileHit(p);
                });
                this.projectiles.filter(p => p.dead).forEach(p => { this.scene.remove(p.mesh); p.dispose(); });
                this.projectiles = this.projectiles.filter(p => !p.dead);

                // Update Loot Pickups
                const pickupBaseRange = parseFloat(document.getElementById('settingsPickupRange').value) * 24 || 120;
                const pickupRange = pickupBaseRange * (this.player.hasPerk('magnet') ? 2 : 1);
                this.loot.forEach(l => {
                    const dist = Math.hypot(this.player.x - l.x, this.player.y - l.y);
                    const releaseRange = this.player.radius + l.radius + 55;
                    if (l.waitForPlayerClear) {
                        if (dist > releaseRange) {
                            l.waitForPlayerClear = false;
                            l.waitForPlayerReturn = true;
                        }
                        return;
                    }
                    if (l.waitForPlayerReturn) {
                        if (dist > releaseRange) return;
                        l.waitForPlayerReturn = false;
                    }
                    l.update(effectiveDt, this.player, pickupRange);
                    const updatedDist = Math.hypot(this.player.x - l.x, this.player.y - l.y);
                    if (l.pickupDelay <= 0 && updatedDist < this.player.radius + l.radius) {
                        this.collectLoot(l);
                    }
                });
                this.loot = this.loot.filter(l => !l.picked);

                // Portal Descent check
                const safespace = this.dungeon.rooms.find(r => r.type === 'safespace' || r.type === 'boss');
                if (safespace && (!this.activeBoss || this.activeBoss.hp <= 0)) {
                    const sx = safespace.cx * 48 + 24;
                    const sy = safespace.cy * 48 + 24;
                    if (Math.hypot(this.player.x - sx, this.player.y - sy) < 45) {
                        this.floorIndex++;
                        this.buildDungeonLayer();
                        this.combatText.showBanner(`DESCENDED TO LAYER ${this.floorIndex}`);
                        this.audio.playSfx('spell', 1.3);
                    }
                }
            }

            // Update weapon viewmodel animation
            if (this.weaponGroup) {
                const animDt = effectiveDt > 0 ? effectiveDt : dt * 1.5;
                this.weaponAnimTime += animDt;
                this.weaponSpreadBloom = Math.max(0, this.weaponSpreadBloom - animDt * 0.012);
                this.weaponRecoil = THREE.MathUtils.lerp(this.weaponRecoil, 0, Math.min(1, animDt * 14));
                this.weaponFlashTimer = Math.max(0, this.weaponFlashTimer - animDt);
                if (this.weaponGroup.muzzleFlash) {
                    const flashStrength = this.weaponFlashDuration > 0 ? this.weaponFlashTimer / this.weaponFlashDuration : 0;
                    this.weaponGroup.muzzleFlash.visible = flashStrength > 0;
                    this.weaponGroup.muzzleFlash.material.opacity = flashStrength * 0.95;
                    if (this.weaponGroup.muzzleLight) this.weaponGroup.muzzleLight.intensity = flashStrength * 2.2;
                }
                const swapProgress = 1 - this.weaponSwapTimer / this.weaponSwapDuration;
                const swapDip = this.weaponSwapTimer > 0 ? Math.sin(swapProgress * Math.PI) : 0;
                this.weaponAimBlend = THREE.MathUtils.lerp(this.weaponAimBlend, this.ads ? 1 : 0, Math.min(1, animDt * 12));
                const weaponId = this.weaponGroup.weaponId;
                const aimX = weaponId === 'scattergun' ? -2.75 : (weaponId ? -2.25 : 0);
                const aimY = weaponId === 'sidearm' ? 2.2 : (weaponId ? 1.35 : 0);
                const activeWeapon = this.weaponInventory[this.activeWeaponIndex];
                const boltDuration = activeWeapon?.boltCycle || 0.28;
                const previousBoltTimer = this.weaponBoltTimer;
                this.weaponBoltTimer = Math.max(0, this.weaponBoltTimer - animDt);
                if (this.weaponBoltSoundPending && previousBoltTimer > boltDuration * 0.55 && this.weaponBoltTimer <= boltDuration * 0.55) {
                    this.audio.playSfx('bolt_cycle', 0.95);
                    this.weaponBoltSoundPending = false;
                }
                const reloadDuration = activeWeapon?.continuousReload
                    ? (activeWeapon.shellReload || activeWeapon.reload)
                    : activeWeapon?.reload;
                const reloadProgress = this.weaponReloadTimer > 0 && reloadDuration
                    ? THREE.MathUtils.clamp(1 - this.weaponReloadTimer / reloadDuration, 0, 1)
                    : 0;
                const reloadDip = Math.sin(reloadProgress * Math.PI);
                const firearm = !!weaponId;
                const baseX = -swapDip * 1.25 + aimX * this.weaponAimBlend;
                const baseY = -swapDip * 8 + aimY * this.weaponAimBlend - reloadDip * 4;
                const hand = this.weaponGroup.mainHand;
                const pose = hand?.userData.idlePose;
                const supportHand = this.weaponGroup.supportHand;
                const supportPose = supportHand?.userData.idlePose;
                const moving = Math.hypot(this.player.vx, this.player.vy) > 8;
                const sprinting = moving && this.player.sprinting;
                const bobRate = sprinting ? 0.015 : (moving ? 0.011 : 0.003);
                const aimStability = this.ads ? 0.2 : 1;
                const bobAmount = (sprinting ? 0.28 : (moving ? 0.16 : 0.07)) * aimStability;
                this.weaponBobPhase = ((this.weaponBobPhase || 0) + animDt * bobRate * 1000) % (Math.PI * 4);
                const sway = moving ? Math.cos(this.weaponBobPhase * 0.5) * (sprinting ? 0.14 : 0.08) * aimStability : 0;
                const idleBob = Math.sin(this.weaponBobPhase) * bobAmount;
                const bashDuration = 0.26;
                this.weaponBashTimer = Math.max(0, this.weaponBashTimer - animDt);
                const bashProgress = this.weaponBashTimer > 0
                    ? THREE.MathUtils.clamp(1 - this.weaponBashTimer / bashDuration, 0, 1)
                    : 0;
                const bashArc = Math.sin(bashProgress * Math.PI);
                if (this.weaponBashTimer > 0 && firearm) {
                    this.weaponGroup.position.set(baseX + sway + bashArc * 1.6, baseY + idleBob - bashArc * 1.4, this.weaponRecoil - bashArc * 2.4);
                    this.weaponGroup.rotation.set(0, -bashArc * 0.28, reloadDip * 0.08 + bashArc * 0.16);
                } else if (this.swingTime > 0) {
                    this.swingTime = Math.max(0, this.swingTime - animDt);
                    const progress = (this.swingDuration - this.swingTime) / this.swingDuration;
                    const arc = Math.sin(progress * Math.PI);

                    if (firearm) {
                        this.weaponGroup.position.set(baseX + sway, baseY + idleBob + arc * 1.8, this.weaponRecoil);
                        this.weaponGroup.rotation.set(0, -arc * 0.22, reloadDip * 0.08 - arc * 0.18);
                    } else {
                        this.weaponGroup.position.set(baseX, baseY, 0);
                        this.weaponGroup.rotation.z = reloadDip * 0.08;
                    }
                    if (!firearm && hand && pose) {
                        hand.position.x = pose.position.x - arc * 4.5;
                        hand.position.y = pose.position.y + arc * 1.8;
                        hand.rotation.z = pose.rotation.z - arc * 1.5;
                    }
                } else {
                    if (firearm) {
                        // Move every firearm part together so the barrel, flash, and support hand stay aligned.
                        this.weaponGroup.position.set(baseX + sway, baseY + idleBob, this.weaponRecoil);
                        this.weaponGroup.rotation.set(0, 0, reloadDip * 0.08);
                        if (hand && pose) {
                            hand.position.copy(pose.position);
                            hand.rotation.copy(pose.rotation);
                        }
                        if (supportHand && supportPose) {
                            supportHand.position.copy(supportPose.position);
                            supportHand.rotation.copy(supportPose.rotation);
                        }
                    } else {
                        this.weaponGroup.position.set(baseX, baseY, 0);
                        this.weaponGroup.rotation.z = reloadDip * 0.08;
                    }
                    if (!firearm && hand && pose) {
                        hand.position.x = pose.position.x + sway;
                        hand.position.y = pose.position.y + idleBob;
                        hand.rotation.copy(pose.rotation);
                    }
                }
                if (this.weaponGroup.offHand) {
                    const hand = this.weaponGroup.offHand;
                    const blocking = this.player.isBlocking;
                    const blend = 1 - Math.exp(-16 * animDt);
                    hand.position.x += ((blocking ? -1 : -3.2) - hand.position.x) * blend;
                    hand.position.y += ((blocking ? -1.8 : -3.2) - hand.position.y) * blend;
                    hand.position.z += ((blocking ? -4.5 : -6) - hand.position.z) * blend;
                    hand.rotation.y += ((blocking ? 0 : Math.PI / 6) - hand.rotation.y) * blend;
                }
                if (this.weaponGroup.boltHandle?.userData.idlePosition) {
                    const boltProgress = 1 - this.weaponBoltTimer / boltDuration;
                    const boltCycle = Math.sin(THREE.MathUtils.clamp(boltProgress, 0, 1) * Math.PI);
                    const home = this.weaponGroup.boltHandle.userData.idlePosition;
                    this.weaponGroup.boltHandle.position.copy(home);
                    this.weaponGroup.boltHandle.position.x += boltCycle * 0.75;
                    this.weaponGroup.boltHandle.position.z -= boltCycle * 0.35;
                }
            }

            // Torches gentle flicker (only lit torches; unlit rooms keep sprites).
            // Occasional ember particles on non-potato presets.
            const dynamicLights = document.getElementById('settingsDynamicLights').checked;
            const gfxName = (this.gfxPreset && this.gfxPreset.name) || 'balanced';
            this.torchPhase = ((this.torchPhase || 0) + dt * 8) % (Math.PI * 2);
            this.torches.forEach(t => {
                if (!t.light) return;
                const f = Math.sin(this.torchPhase + t.seed);
                t.light.intensity = dynamicLights ? t.baseIntensity + f * 0.4 : t.baseIntensity;
            });
            try {
                if (gfxName !== 'potato' && this.vfx && typeof this.vfx.spawnTorchEmber === 'function' && this.torches.length) {
                    const t = this.torches[(Math.random() * this.torches.length) | 0];
                    if (t && t.sprite) {
                        this.vfx.spawnTorchEmber(t.sprite.position.x, t.sprite.position.y, t.sprite.position.z, 1);
                    }
                }
            } catch (_) { /* embers are garnish */ }

            // Camera orientation & follow
            const cameraAnimDt = this.controlMode === 'turnbased' ? dt : effectiveDt;
            this.cameraController.update(cameraAnimDt);
            this.camera3d.rotation.order = 'YXZ';
            this.camera3d.rotation.y = this.player.yaw + this.cameraController.punchX;
            this.camera3d.rotation.x = this.player.pitch + this.cameraController.punchY;
            this.camera3d.rotation.z = -this.player.lean * 0.12;

            let shakeOffset = new THREE.Vector3(0, 0, 0);
            if (isShake && this.cameraController.shake > 0) {
                const s = this.cameraController.shake * 0.15;
                shakeOffset.set((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
            }

            const sprinting = this.player.sprinting && Math.hypot(this.player.vx, this.player.vy) > 8;
            const aimedWeapon = this.weaponInventory[this.activeWeaponIndex];
            const targetFov = this.ads ? (aimedWeapon?.adsFov || 58) : (this.player.isSliding ? 78 : (sprinting ? 76 : (this.player.crouching ? 62 : 68)));
            this.camera3d.fov = THREE.MathUtils.lerp(this.camera3d.fov, targetFov, Math.min(1, dt * 12));
            this.camera3d.updateProjectionMatrix();
            const targetEyeHeight = this.player.isSliding ? 9 : (this.player.crouching ? 13 : 20);
            this.cameraEyeHeight = THREE.MathUtils.lerp(this.cameraEyeHeight, targetEyeHeight, Math.min(1, dt * 14));
            const leanOffset = this.player.lean * 9;
            const horizontalSpeed = Math.hypot(this.player.vx, this.player.vy);
            const bobbing = this.player.grounded && !this.player.isSliding && horizontalSpeed > 2;
            const bobScale = this.ads ? 0.28 : (this.player.crouching ? 0.38 : (sprinting ? 1.2 : 0.75));
            if (bobbing) this.cameraBobTime += dt * (sprinting ? 14 : 9.5);
            const targetBobX = bobbing ? Math.cos(this.cameraBobTime) * 0.45 * bobScale : 0;
            const targetBobY = bobbing ? Math.sin(this.cameraBobTime * 2) * 0.55 * bobScale : 0;
            const bobBlend = Math.min(1, dt * 10);
            this.cameraBobX += (targetBobX - this.cameraBobX) * bobBlend;
            this.cameraBobY += (targetBobY - this.cameraBobY) * bobBlend;
            this.camera3d.position.set(
                this.player.x + Math.cos(this.player.yaw) * (leanOffset + this.cameraBobX),
                this.player.yElevation + this.cameraEyeHeight + this.cameraBobY,
                this.player.y - Math.sin(this.player.yaw) * (leanOffset + this.cameraBobX)
            ).add(shakeOffset);
            this.camera3d.updateMatrixWorld(true);
            this.updateAimTargetHUD(dt);

            // Synchronize player lantern and flashlight
            this.playerLantern.position.copy(this.camera3d.position);
            this.flashlight.position.copy(this.camera3d.position);

            const forward = new THREE.Vector3();
            this.camera3d.getWorldDirection(forward);
            this.flashlightTarget.position.copy(this.camera3d.position).add(forward.multiplyScalar(100));

            this.vfx.update(effectiveDt > 0 ? effectiveDt : dt * 0.1);
            this.updateWeaponTracers(dt);
            this.updateHUD();
            this.updateWeaponHUD();
            this.drawMinimap();
        }

        drawMinimap() {
            if (!this.minimapCtx || !this.dungeon || !this.player) return;
            const ctx = this.minimapCtx;
            const w = this.minimapCanvas.width;
            const h = this.minimapCanvas.height;

            ctx.clearRect(0, 0, w, h);

            // Centered on player
            const scale = 0.45;
            const cx = w / 2;
            const cy = h / 2;

            ctx.save();
            ctx.translate(cx, cy);

            // Draw rooms & corridors
            ctx.fillStyle = '#1e293b';
            for (let x = 0; x < this.dungeon.gridSize; x++) {
                for (let y = 0; y < this.dungeon.gridSize; y++) {
                    if (this.dungeon.grid[x][y] !== 1) {
                        const mx = (x * 48 + 24 - this.player.x) * scale;
                        const my = (y * 48 + 24 - this.player.y) * scale;
                        ctx.fillRect(mx - 4, my - 4, 8, 8);
                    }
                }
            }

            // Draw portal
            const safespace = this.dungeon.rooms.find(r => r.type === 'safespace' || r.type === 'boss');
            if (safespace) {
                const sx = (safespace.cx * 48 + 24 - this.player.x) * scale;
                const sy = (safespace.cy * 48 + 24 - this.player.y) * scale;
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(sx, sy, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw enemies
            ctx.fillStyle = '#ef4444';
            this.enemies.forEach(e => {
                const ex = (e.x - this.player.x) * scale;
                const ey = (e.y - this.player.y) * scale;
                ctx.beginPath();
                ctx.arc(ex, ey, e.isBoss ? 6 : 3, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw player arrow in center
            ctx.restore();
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-this.player.yaw + Math.PI / 2);

            ctx.fillStyle = '#4ade80';
            ctx.beginPath();
            ctx.moveTo(0, -7);
            ctx.lineTo(5, 5);
            ctx.lineTo(0, 2);
            ctx.lineTo(-5, 5);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }

        updateHUD() {
            if (!this.player) return;

            document.getElementById('hudHpBar').style.width = `${Math.max(0, (this.player.hp / this.player.maxHp) * 100)}%`;
            document.getElementById('hudHpText').textContent = `${Math.round(this.player.hp)}/${this.player.maxHp}`;

            document.getElementById('hudStaminaBar').style.width = `${(this.player.stamina / this.player.maxStamina) * 100}%`;
            document.getElementById('hudStaminaText').textContent = `${Math.round(this.player.stamina)}/${this.player.maxStamina}`;

            document.getElementById('hudXpBar').style.width = `${Math.min(100, (this.player.xp / this.player.xpNext) * 100)}%`;
            document.getElementById('hudXpText').textContent = `${this.player.xp}/${this.player.xpNext}`;
            document.getElementById('hudLevelBadge').textContent = `LV ${this.player.level}`;

            document.getElementById('hudPotionCount').textContent = this.player.potions;
            const mobPot = document.getElementById('mobilePotionCount');
            if (mobPot) mobPot.textContent = this.player.potions;

            const resBar = document.getElementById('hudResourceBar');
            const resLabel = document.getElementById('hudResourceLabel');
            const resText = document.getElementById('hudResourceText');

            if (this.player.race === Race.ELF) {
                resLabel.textContent = '🔮 Mana';
                resBar.style.width = `${(this.player.mana / this.player.maxMana) * 100}%`;
                resText.textContent = `${Math.round(this.player.mana)}/100`;
            } else if (this.player.race === Race.ORC) {
                resLabel.textContent = '🔥 Rage';
                resBar.style.width = `${this.player.rage}%`;
                resText.textContent = `${Math.round(this.player.rage)}/100`;
            } else if (this.player.race === Race.HUMAN) {
                resLabel.textContent = '🛡️ Shield';
                resBar.style.width = `${(this.player.shieldBubble / 25) * 100}%`;
                resText.textContent = `${Math.round(this.player.shieldBubble)}/25`;
            } else {
                resLabel.textContent = '💎 Stone';
                resBar.style.width = this.player.stoneForm ? '100%' : '0%';
                resText.textContent = this.player.stoneForm ? 'IMMUNE' : 'READY';
            }

            document.getElementById('hudGoldText').textContent = this.gold;
            document.getElementById('hudUusdText').textContent = this.uusd;
            document.getElementById('hudFloorText').textContent = `Layer ${this.floorIndex}`;

            // === Mobile Mini-HUD Updates ===
            const hpPct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
            const staPct = (this.player.stamina / this.player.maxStamina) * 100;
            const mmhHp = document.getElementById('mmhHpBar');
            const mmhSta = document.getElementById('mmhStaBar');
            const mmhHpTxt = document.getElementById('mmhHpText');
            const mmhStaTxt = document.getElementById('mmhStaText');
            const mmhGold = document.getElementById('mmhGold');
            const mmhFloor = document.getElementById('mmhFloor');

            if (mmhHp) mmhHp.style.width = `${hpPct}%`;
            if (mmhSta) mmhSta.style.width = `${staPct}%`;
            if (mmhHpTxt) mmhHpTxt.textContent = Math.round(this.player.hp);
            if (mmhStaTxt) mmhStaTxt.textContent = Math.round(this.player.stamina);
            if (mmhGold) mmhGold.textContent = this.gold;
            if (mmhFloor) mmhFloor.textContent = `L${this.floorIndex}`;
        }

        render() {
            this.renderer.render(this.scene, this.camera3d);
        }

        emitGraphicsBurst(worldX, worldZ, color = '#ffcc4c', strength = 1) {
            if (!this.graphics.enabled) return;
            const point = new THREE.Vector3(worldX, 16, worldZ).project(this.camera3d);
            if (point.z < -1 || point.z > 1) return;
            const rect = this.container.getBoundingClientRect();
            this.graphics.burst(
                (point.x * 0.5 + 0.5) * rect.width,
                (-point.y * 0.5 + 0.5) * rect.height,
                color,
                strength
            );
        }

        togglePause() {
            if (this.isPaused) {
                document.getElementById('pauseScreen').classList.add('hidden');
                this.container.classList.remove('paused');
                this.isPaused = false;
                // Only request pointer lock on desktop (not touch devices)
                if (!document.body.classList.contains('touch-enabled')) {
                    requestPointerLockSafely(this.container);
                }
            } else {
                this.isPaused = true;
                this.container.classList.add('paused');
                document.getElementById('pauseScreen').classList.remove('hidden');
                exitPointerLockSafely();
            }
        }

        gameOver(victory = false) {
            // Campaign death tracking feeds the 1-3 star rating. Endless
            // (no currentMission) is untouched.
            try {
                if (!victory && this.currentMission && !this.currentMission.completed) {
                    this._missionDeaths = (Number(this._missionDeaths) || 0) + 1;
                }
            } catch (_) { /* ignore */ }
            this.isPaused = true;
            document.getElementById('gameMain').classList.add('hidden');
            document.getElementById('gameOverScreen').classList.remove('hidden');

            document.getElementById('gameOverTitle').textContent = victory ? 'RUN COMPLETED' : 'RUN TERMINATED';
            document.getElementById('gameOverSub').textContent = victory ? 'Extraction beacon established' : 'Vitals flatlined';

            document.getElementById('goRaceClass').textContent = `${this.player.race.toUpperCase()} ${this.player.classType.toUpperCase()}`;
            document.getElementById('goFloor').textContent = `Layer ${this.floorIndex}`;
            document.getElementById('goKills').textContent = this.kills;
            document.getElementById('goGold').textContent = this.gold;
            document.getElementById('goXp').textContent = this.player.xp;

            this.audio.speak(victory ? 'Run Completed. Returning to Starship.' : 'Game Over. Run Terminated.');
            this.audio.stopAmbientMusic();
            this.clearDungeon();
            this.saveSave();
        }

        // =========================================================================
        // 16. UI SETUP & LUCKYSTARSHIP HUB INTEGRATION
        // =========================================================================
        setupUI() {
            // Main menu buttons
            const btnStoryMode = document.getElementById('btnStoryMode');
            if (btnStoryMode) {
                btnStoryMode.addEventListener('click', () => {
                    document.getElementById('mainMenuScreen').classList.add('hidden');
                    document.getElementById('storyMissionScreen').classList.remove('hidden');
                    this.renderStoryMissionsList();
                });
            }

            const btnStoryBack = document.getElementById('btnStoryBack');
            if (btnStoryBack) {
                btnStoryBack.addEventListener('click', () => {
                    document.getElementById('storyMissionScreen').classList.add('hidden');
                    document.getElementById('mainMenuScreen').classList.remove('hidden');
                });
            }

            const btnStartStoryMission = document.getElementById('btnStartStoryMission');
            if (btnStartStoryMission) {
                btnStartStoryMission.addEventListener('click', () => {
                    if (!this.selectedStoryMissionId) return;
                    document.getElementById('storyMissionScreen').classList.add('hidden');
                    document.getElementById('charSelectScreen').classList.remove('hidden');
                    this.renderCharSelect();
                });
            }

            document.getElementById('btnPlay').addEventListener('click', () => {
                this.selectedStoryMissionId = null; // Standard Endless Run
                document.getElementById('mainMenuScreen').classList.add('hidden');
                document.getElementById('charSelectScreen').classList.remove('hidden');
                this.renderCharSelect();
            });

            document.getElementById('btnEnterHub').addEventListener('click', () => {
                document.getElementById('mainMenuScreen').classList.add('hidden');
                document.getElementById('hubScreen').classList.remove('hidden');
                this.renderBotany();
                this.renderArmory();
                this.generateRepairMiniGame();
            });

            document.getElementById('btnOpenSettings').addEventListener('click', () => {
                document.getElementById('settingsScreen').classList.remove('hidden');
            });

            document.getElementById('btnSaveSettings').addEventListener('click', () => {
                this.audio.masterVolume = document.getElementById('settingsMasterVol').value / 100;
                const requestedDifficulty = document.getElementById('settingsDifficulty').value;
                this.difficulty = DifficultyData[requestedDifficulty] ? requestedDifficulty : 'normal';
                this.input.lookSensitivity = (parseFloat(document.getElementById('settingsMouseSens').value) || 3.5) * 0.00065;
                this.input.invertY = document.getElementById('settingsInvertY').checked;

                const touchMode = document.getElementById('settingsTouchMode').value;
                if (touchMode === 'always') {
                    document.body.classList.add('touch-enabled');
                } else if (touchMode === 'never') {
                    document.body.classList.remove('touch-enabled');
                } else {
                    const shouldUseTouchUi = ('ontouchstart' in window) ||
                        navigator.maxTouchPoints > 0 ||
                        window.innerWidth <= 900 ||
                        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
                    if (shouldUseTouchUi) {
                        document.body.classList.add('touch-enabled');
                    } else {
                        document.body.classList.remove('touch-enabled');
                    }
                }

                document.getElementById('settingsScreen').classList.add('hidden');
                this.saveSave();
            });

            document.getElementById('btnCharSelectBack').addEventListener('click', () => {
                document.getElementById('charSelectScreen').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
            });

            document.getElementById('btnCharSelectStart').addEventListener('click', () => {
                const selRace = document.querySelector('.char-card.selected')?.dataset.race || 'human';
                const selClass = document.querySelector('.class-btn.selected')?.dataset.class || 'warrior';
                const selMode = document.querySelector('.char-mode-card.selected')?.dataset.mode || this.controlMode || 'realtime';
                this.setControlMode(selMode);
                document.getElementById('charSelectScreen').classList.add('hidden');
                document.getElementById('gameMain').classList.remove('hidden');
                this.initRun(selRace, selClass);
            });

            // Control Mode Buttons
            document.querySelectorAll('.btn-mode').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const mode = e.currentTarget.dataset.mode;
                    this.setControlMode(mode);
                });
            });

            // Variable Speed Buttons
            document.querySelectorAll('.btn-speed').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const speed = e.currentTarget.dataset.speed;
                    this.setGameSpeed(speed);
                });
            });

            // Turn-Based Wait Button
            const waitBtn = document.getElementById('btnWaitTurn');
            if (waitBtn) {
                waitBtn.addEventListener('click', () => {
                    this.executeTurnAction('wait');
                });
            }

            // Character Select Mode Cards
            document.querySelectorAll('.char-mode-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    const mode = e.currentTarget.dataset.mode;
                    this.setControlMode(mode);
                });
            });

            // === MOBILE PANEL UI WIRING ===
            const mobileModePanel = document.getElementById('mobileModePanel');
            const mmhSettingsBtn = document.getElementById('mmhSettingsBtn');
            const mmpCloseBtn = document.getElementById('mmpCloseBtn');
            const mobilePauseBtn = document.getElementById('mobilePauseBtn');

            if (mmhSettingsBtn && mobileModePanel) {
                mmhSettingsBtn.addEventListener('click', () => {
                    mobileModePanel.classList.toggle('hidden');
                });
                mmhSettingsBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    mobileModePanel.classList.toggle('hidden');
                });
            }

            if (mmpCloseBtn && mobileModePanel) {
                mmpCloseBtn.addEventListener('click', () => {
                    mobileModePanel.classList.add('hidden');
                });
                mmpCloseBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    mobileModePanel.classList.add('hidden');
                });
            }

            // Mobile mode buttons
            document.querySelectorAll('.mmp-mode-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const mode = e.currentTarget.dataset.mode;
                    this.setControlMode(mode);
                    if (mobileModePanel) mobileModePanel.classList.add('hidden');
                });
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    const mode = e.currentTarget.dataset.mode;
                    this.setControlMode(mode);
                    if (mobileModePanel) mobileModePanel.classList.add('hidden');
                });
            });

            // Mobile speed buttons
            document.querySelectorAll('.mmp-speed-btn').forEach(btn => {
                const applySpeed = (e) => {
                    e.preventDefault();
                    const speed = e.currentTarget.dataset.speed;
                    this.setGameSpeed(speed);
                    // sync mmp-speed-btn active states
                    document.querySelectorAll('.mmp-speed-btn').forEach(b => {
                        b.classList.toggle('active', parseFloat(b.dataset.speed) === this.gameSpeed);
                    });
                };
                btn.addEventListener('click', applySpeed);
                btn.addEventListener('touchstart', applySpeed);
            });

            // Mobile pause button
            if (mobilePauseBtn) {
                mobilePauseBtn.addEventListener('click', () => this.togglePause());
                mobilePauseBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.togglePause();
                });
            }

            document.getElementById('btnLeaveHub').addEventListener('click', () => {
                document.getElementById('hubScreen').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
                this.saveSave();
            });

            // Hub Navigation Tabs
            const tabBtns = document.querySelectorAll('.hub-tab-btn');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    tabBtns.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');

                    const targetTab = e.target.dataset.tab;
                    document.querySelectorAll('.hub-pane').forEach(p => p.classList.remove('active'));
                    const activePane = document.getElementById(`tab-${targetTab}`);
                    if (activePane) activePane.classList.add('active');

                    if (targetTab === 'exchange') {
                        document.getElementById('exchangeGoldBalance').textContent = `${this.gold} Gold`;
                        document.getElementById('exchangeUusdBalance').textContent = `${this.uusd} $UUSD`;
                    } else if (targetTab === 'lore') {
                        this.renderLoreList();
                    } else if (targetTab === 'armory') {
                        this.renderArmory();
                    }
                });
            });

            // Exchange Buttons
            document.getElementById('btnBuyUusd').addEventListener('click', () => {
                if (this.gold >= 10) {
                    this.gold -= 10;
                    this.uusd += 100;
                    this.audio.playSfx('loot');
                    document.getElementById('exchangeGoldBalance').textContent = `${this.gold} Gold`;
                    document.getElementById('exchangeUusdBalance').textContent = `${this.uusd} $UUSD`;
                }
            });

            document.getElementById('btnBuyGold').addEventListener('click', () => {
                if (this.uusd >= 100) {
                    this.uusd -= 100;
                    this.gold += 10;
                    this.audio.playSfx('loot');
                    document.getElementById('exchangeGoldBalance').textContent = `${this.gold} Gold`;
                    document.getElementById('exchangeUusdBalance').textContent = `${this.uusd} $UUSD`;
                }
            });

            // Quarters Upgrade
            document.getElementById('btnUpgradeQuarters').addEventListener('click', () => {
                if (this.quartersLevel < 6) {
                    // The displayed next-level cost belongs to the next entry,
                    // not the current level's historical purchase price.
                    const cost = QuartersUpgrades[this.quartersLevel].cost;
                    if (this.uusd >= cost) {
                        this.uusd -= cost;
                        this.quartersLevel++;
                        this.audio.playSfx('levelup');
                        this.updateHubQuartersUI();
                        this.saveSave();
                    }
                }
            });

            document.getElementById('btnGenerateCircuit').addEventListener('click', () => {
                this.generateRepairMiniGame();
            });

            // Potion Drink Buttons
            const potBtn = document.getElementById('btnUsePotion');
            if (potBtn) potBtn.addEventListener('click', () => this.usePotion());

            // Pause & Return Buttons
            document.getElementById('btnPause').addEventListener('click', () => this.togglePause());
            document.getElementById('btnResume').addEventListener('click', () => this.togglePause());
            document.getElementById('btnAbandon').addEventListener('click', () => {
                this.isPaused = false;
                this.clearDungeon();
                this.audio.stopAmbientMusic();
                document.getElementById('pauseScreen').classList.add('hidden');
                document.getElementById('gameMain').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
                exitPointerLockSafely();
                this.saveSave();
            });

            document.getElementById('btnReturnToHub').addEventListener('click', () => {
                this.isPaused = false;
                this.clearDungeon();
                this.audio.stopAmbientMusic();
                document.getElementById('gameMain').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
                exitPointerLockSafely();
                this.saveSave();
            });

            document.getElementById('btnGoToMenu').addEventListener('click', () => {
                document.getElementById('gameOverScreen').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
            });
        }

        renderCharSelect() {
            if (this.hubController) return this.hubController.renderCharSelect();
        }

        updateHubQuartersUI() {
            if (this.hubController) return this.hubController.updateHubQuartersUI();
        }

        renderArmory() {
            if (this.hubController) return this.hubController.renderArmory();
        }

        buyArmoryUpgrade(upgradeId) {
            if (this.hubController) return this.hubController.buyArmoryUpgrade(upgradeId);
        }

        renderBotany() {
            if (this.hubController) return this.hubController.renderBotany();
        }

        plantSeed(slotIndex, seedId) {
            if (this.hubController) return this.hubController.plantSeed(slotIndex, seedId);
        }

        harvestCrop(slotIndex) {
            if (this.hubController) return this.hubController.harvestCrop(slotIndex);
        }

        generateRepairMiniGame() {
            if (this.hubController) return this.hubController.generateRepairMiniGame();
        }

        renderLoreList() {
            if (this.hubController) return this.hubController.renderLoreList();
        }

        renderStoryMissionsList() {
            if (this.hubController) return this.hubController.renderStoryMissionsList();
        }

        // Campaign difficulty curve: +15% enemy power per mission id.
        // Endless mode (no currentMission) always returns 1 - untouched.
        getMissionScaleMult() {
            try {
                const m = this.currentMission;
                if (!m) return 1;
                const id = Math.floor(Number(m.id));
                if (!isFinite(id) || id < 1) return 1;
                return 1 + (id - 1) * 0.15;
            } catch (_) {
                return 1;
            }
        }

        // Star rating 1-3 from clear time vs parSeconds plus deaths.
        computeMissionStars() {
            try {
                let stars = 3;
                const m = this.currentMission;
                const extra = (m && m._campaign && typeof m._campaign === 'object') ? m._campaign :
                    ((window.GraveGainCampaign && typeof window.GraveGainCampaign.getExtra === 'function')
                        ? (window.GraveGainCampaign.getExtra(m && m.id) || {}) : {});
                const par = Number(extra && extra.parSeconds);
                if (isFinite(par) && par > 0 && (Number(this._missionStartTime) || 0) > 0) {
                    const elapsed = (Date.now() - this._missionStartTime) / 1000;
                    if (elapsed > par * 2) stars -= 2;
                    else if (elapsed > par) stars -= 1;
                }
                const deaths = Number(this._missionDeaths) || 0;
                if (deaths > 0) stars -= Math.min(deaths, 2);
                if (stars < 1) stars = 1;
                if (stars > 3) stars = 3;
                return stars;
            } catch (_) {
                return 3;
            }
        }

        checkStoryObjectives(enemyKilled) {
            if (!this.currentMission || !this.currentMission.objectives) return;
            if (!enemyKilled) return;
            try {
                this.currentMission.objectives.forEach(obj => {
                    if (!obj || (Number(obj.current) || 0) >= (Number(obj.count) || 0)) return;
                    const id = obj.id;
                    let hit = false;
                    if (id === 'slay_boss') hit = !!enemyKilled.isBoss;
                    else if (id === 'slay_skulls') hit = enemyKilled.type === 'skull';
                    else if (id === 'slay_elites') hit = (Number(enemyKilled.scale) || 0) >= 1.1;
                    else if (id === 'collect_ore') {
                        // Sparkite pried from armored remains and wardens
                        // (prop caches also feed this - see breakProp).
                        hit = !!(enemyKilled.isBoss || (Number(enemyKilled.scale) || 0) >= 1.1);
                    }
                    else hit = true; // slay_all, slay_minions, survive_waves + generic secondaryObjective
                    if (hit) {
                        obj.current = (Number(obj.current) || 0) + 1;
                        try {
                            this.combatText.spawnText(this.player.x, 25, this.player.y,
                                `Goal: ${obj.current}/${obj.count}`, 'xp');
                        } catch (_) { /* ignore */ }
                    }
                });
            } catch (_) { /* never break the kill loop */ }
            this.checkMissionComplete();
        }

        // Shared completion gate: called after kill progress AND ore progress.
        // No-ops in endless mode (no currentMission) and when already done.
        checkMissionComplete() {
            const m = this.currentMission;
            if (!m || !m.objectives || m.completed) return;
            let allComplete = true;
            try {
                allComplete = m.objectives.every(o => !o ||
                    (Number(o.current) || 0) >= (Number(o.count) || 0));
            } catch (_) { return; }
            if (!allComplete) return;
            m.completed = true;
            // Rewards (guarded numbers so a bad def can't NaN the economy).
            try {
                const gold = Math.floor(Number(m.rewardGold)) || 0;
                const uusd = Math.floor(Number(m.rewardUusd)) || 0;
                if (gold > 0) this.gold += gold;
                if (uusd > 0) this.uusd += uusd;
            } catch (_) { /* ignore */ }
            const stars = this.computeMissionStars();
            try {
                if (window.GraveGainStoryEngine &&
                    typeof window.GraveGainStoryEngine.completeMission === 'function') {
                    window.GraveGainStoryEngine.completeMission(m.id, stars);
                }
            } catch (_) { /* ignore */ }
            // Lore unlock persistence (same store the codex layer reads), so
            // unlocks land even if the AAA bus / campaign scripts are absent.
            try {
                const extra = (m._campaign && typeof m._campaign === 'object') ? m._campaign :
                    ((window.GraveGainCampaign && typeof window.GraveGainCampaign.getExtra === 'function')
                        ? (window.GraveGainCampaign.getExtra(m.id) || {}) : {});
                const unlocks = (extra && Array.isArray(extra.loreUnlocks)) ? extra.loreUnlocks : [];
                if (unlocks.length && window.localStorage) {
                    const key = 'gravegain_campaign_codex_v1';
                    let have = [];
                    try {
                        const raw = window.localStorage.getItem(key);
                        if (raw) have = (JSON.parse(raw) || {}).unlocked || [];
                        if (!Array.isArray(have)) have = [];
                    } catch (_) { have = []; }
                    const set = new Set(have.map(String));
                    let changed = false;
                    unlocks.forEach(id => {
                        const lid = String(id);
                        if (!set.has(lid)) { set.add(lid); changed = true; }
                    });
                    if (changed) {
                        try { window.localStorage.setItem(key, JSON.stringify({ unlocked: [...set] })); } catch (_) {}
                    }
                }
            } catch (_) { /* ignore */ }
            // Notify campaign UI layers (codex toasts, MISSION COMPLETE card).
            try {
                if (window.GraveGainAAA && typeof window.GraveGainAAA.emit === 'function') {
                    window.GraveGainAAA.emit('missionComplete', { id: m.id, stars });
                }
            } catch (_) { /* ignore */ }
            try { this.saveSave(); } catch (_) { /* ignore */ }
            try { this.combatText.showBanner(`🏆 MISSION COMPLETED! 🏆 ★${stars}`); } catch (_) { /* ignore */ }
            // dialogueAfter, then the game-over screen - where the campaign UI
            // injects the return-to-hub / next-mission prompt (20-campaign-ui).
            try {
                this.playDialogueSequence(m.dialogueAfter, () => {
                    try { this.gameOver(true); } catch (_) {}
                });
            } catch (_) {
                try { this.gameOver(true); } catch (_) {}
            }
        }

        selectStoryMission(missionId) {
            if (this.hubController) return this.hubController.selectStoryMission(missionId);
        }

        playDialogueSequence(dialogueList, onComplete) {
            if (this.hubController) return this.hubController.playDialogueSequence(dialogueList, onComplete);
            if (onComplete) onComplete();
        }

        viewLoreEntry(id) {
            if (this.hubController) return this.hubController.viewLoreEntry(id);
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        if (!window.THREE) {
            const msg = document.createElement('div');
            msg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#04030a;color:#f5e6c8;font-family:sans-serif;font-size:1rem;text-align:center;padding:2rem;z-index:9999;';
            msg.textContent = 'GraveGain3D could not load the Three.js 3D library (both CDN sources unreachable). Check your connection and reload.';
            document.body.appendChild(msg);
            return;
        }
        try {
            window.GraveGainGame = new GraveGainGame();
        } catch (err) {
            const msg = document.createElement('div');
            msg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#04030a;color:#f5e6c8;font-family:sans-serif;font-size:1rem;text-align:center;padding:2rem;z-index:9999;';
            msg.textContent = 'GraveGain3D failed to start WebGL (' + (err && err.message ? err.message : err) + '). Try a browser with hardware acceleration enabled.';
            document.body.appendChild(msg);
            throw err;
        }
    });

    // Universal VibeCodeWorker & Game Runner integration bindings
    Object.defineProperty(window, 'game', {
        configurable: true,
        get: () => {
            const gg = window.GraveGainGame;
            if (!gg) return null;
            return {
                instance: gg,
                get score() { return gg.gold || 0; },
                get isGameOver() {
                    const goScreen = document.getElementById('gameOverScreen');
                    return (goScreen && !goScreen.classList.contains('hidden')) || (gg.player ? gg.player.isDead : false);
                },
                get player() {
                    if (!gg.player) return null;
                    return {
                        x: gg.player.x,
                        y: gg.player.y,
                        hp: gg.player.hp,
                        maxHp: gg.player.maxHp,
                        stamina: gg.player.stamina,
                        level: gg.player.level,
                        xp: gg.player.xp,
                        race: gg.player.race,
                        classType: gg.player.classType
                    };
                },
                get floor() { return gg.floorIndex || 1; },
                get kills() { return gg.kills || 0; },
                get inDungeon() {
                    const gameMain = document.getElementById('gameMain');
                    return gameMain && !gameMain.classList.contains('hidden') && !gg.isPaused;
                },
                startQuickRun: (race = 'human', classType = 'warrior', mode = 'realtime') => {
                    const mainMenu = document.getElementById('mainMenuScreen');
                    const charSelect = document.getElementById('charSelectScreen');
                    const gameMain = document.getElementById('gameMain');
                    if (mainMenu) mainMenu.classList.add('hidden');
                    if (charSelect) charSelect.classList.add('hidden');
                    if (gameMain) gameMain.classList.remove('hidden');
                    gg.setControlMode(mode);
                    gg.initRun(race, classType);
                    return true;
                },
                attack: () => {
                    if (gg.player && !gg.isPaused) {
                        if (typeof gg.triggerMeleeAttack === 'function') {
                            gg.triggerMeleeAttack();
                        } else if (typeof gg.performMeleeAttack === 'function') {
                            gg.performMeleeAttack();
                        }
                        return true;
                    }
                    return false;
                },
                // ---- Virtual bot-mouse API (routed via GraveGainBotInput) ----
                look: (dx = 0, dy = 0) => {
                    if (window.GraveGainBotInput) return window.GraveGainBotInput.look(dx, dy);
                    return false;
                },
                attackAt: (nx = 500, ny = 500) => {
                    // Aim the view at a normalized screen point, then attack.
                    if (window.GraveGainBotInput) return window.GraveGainBotInput.click(nx, ny, 'attack');
                    return false;
                },
                setBotControl: (on) => {
                    if (window.GraveGainBotInput) window.GraveGainBotInput.setBotControl(on);
                    if (window.GraveGainBotCursor) window.GraveGainBotCursor.setBotControl(on);
                    return true;
                },
                ability: () => {
                    if (gg.player && !gg.isPaused) {
                        gg.player.triggerAbility();
                        return true;
                    }
                    return false;
                },
                usePotion: () => {
                    if (gg.usePotion) {
                        gg.usePotion();
                        return true;
                    }
                    return false;
                }
            };
        }
    });

    Object.defineProperty(window, 'gameState', {
        configurable: true,
        get: () => {
            const gg = window.GraveGainGame;
            return {
                title: document.title,
                url: window.location.href,
                canvas: !!document.querySelector('#gameCanvas'),
                score: gg ? gg.gold : 0,
                isGameOver: window.game ? window.game.isGameOver : false,
                playerState: window.game ? window.game.player : null,
                floor: gg ? gg.floorIndex : 1,
                enemiesCount: gg && gg.enemies ? gg.enemies.length : 0,
                activeMode: gg ? gg.controlMode : 'realtime'
            };
        }
    });

    window.gameDebug = {
        name: "GraveGain3D (Complete FPS Edition)",
        getScore: () => window.GraveGainGame ? window.GraveGainGame.gold : 0,
        setScore: (g) => { if (window.GraveGainGame) window.GraveGainGame.gold = g; },
        getHealth: () => window.GraveGainGame && window.GraveGainGame.player ? window.GraveGainGame.player.hp : 0,
        setHealth: (h) => { if (window.GraveGainGame && window.GraveGainGame.player) window.GraveGainGame.player.hp = h; },
        addXp: (x) => { if (window.GraveGainGame && window.GraveGainGame.player) window.GraveGainGame.player.addXp(x); },
        win: () => { if (window.GraveGainGame) window.GraveGainGame.gameOver(true); },
        lose: () => { if (window.GraveGainGame) window.GraveGainGame.gameOver(false); },
        godMode: false,
        toggleGodMode: function() {
            this.godMode = !this.godMode;
            return this.godMode;
        }
    };
})();
