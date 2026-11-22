/**
 * BattleSharks Persistent State & Progression System
 * Unifies Shark Evolution, Human Mode, Tamagotchi Aquarium, Base Builder, and Atlantis Colosseum.
 */
(function (global) {
    const STORAGE_KEY = 'battlesharks_v2_state';

    const SHARK_SPECIES = {
        reef: { id: 'reef', name: 'Reef Shark', color: '#38bdf8', belly: '#e0f2fe', baseHp: 100, baseAtk: 15, rarity: 'Common' },
        great_white: { id: 'great_white', name: 'Great White', color: '#475569', belly: '#f1f5f9', baseHp: 140, baseAtk: 24, rarity: 'Rare' },
        hammerhead: { id: 'hammerhead', name: 'Hammerhead', color: '#64748b', belly: '#cbd5e1', baseHp: 130, baseAtk: 22, rarity: 'Rare' },
        tiger: { id: 'tiger', name: 'Tiger Shark', color: '#0f766e', belly: '#ccfbf1', baseHp: 160, baseAtk: 28, rarity: 'Epic' },
        megalodon: { id: 'megalodon', name: 'Abyssal Megalodon', color: '#312e81', belly: '#c7d2fe', baseHp: 240, baseAtk: 40, rarity: 'Legendary' },
        cyber: { id: 'cyber', name: 'Cyber Apex Shark', color: '#7e22ce', belly: '#f3e8ff', baseHp: 220, baseAtk: 38, rarity: 'Legendary' }
    };

    const PERSONALITIES = ['Playful', 'Aggressive', 'Shy', 'Curious'];

    function createDefaultShark(speciesId = 'reef', customName = 'Reef') {
        const sp = SHARK_SPECIES[speciesId] || SHARK_SPECIES.reef;
        return {
            uid: 'shark_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            species: sp.id,
            name: customName || sp.name,
            personality: PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)],
            hunger: 85,
            cleanliness: 92,
            happiness: 96,
            health: 100,
            energy: 78,
            sleeping: false,
            lastUpdated: Date.now(),
            customisation: {
                skin: 'slate',
                pattern: 'none',
                finShape: 'classic',
                tailShape: 'crescent',
                eyeColor: '#22d3ee',
                glowingMarkings: 'none',
                scars: 'none'
            },
            bionics: {
                mechanicalJaws: false,
                armouredSkull: false,
                reinforcedTeeth: false,
                cyberneticFins: false,
                mechanicalTail: false,
                laserSystems: false,
                electricalDefence: false,
                armouredPlating: false,
                enhancedSonar: false
            }
        };
    }

    function getDefaultState() {
        return {
            coins: 250,
            treasureCoins: 15,
            sharkLevel: 1,
            sharkXP: 0,
            playerLevel: 1,
            playerXP: 0,
            xpBoostUntil: 0,
            lastAdRewardAt: 0,
            activeSharkUid: null,
            sharks: [createDefaultShark('reef', 'Reef')],
            aquarium: {
                tankSize: 'small', // small | medium | enormous
                background: 'tropical_reef',
                lighting: 'neon_blue',
                effect: 'bubbles',
                unlockedItems: ['tropical_reef', 'neon_blue', 'bubbles'],
                placedItems: [
                    { id: 'treasure_chest', x: 22, y: 78 },
                    { id: 'ornamental_fish', x: 65, y: 42 }
                ]
            },
            baseGrid: {
                cols: 10,
                rows: 6,
                cells: {
                    '4,3': { type: 'tank', label: 'Main Tank' },
                    '5,3': { type: 'corridor', label: 'Glass Corridor' },
                    '6,3': { type: 'lab', label: 'Mutation Lab' }
                }
            },
            human: {
                weapon: 'harpoon_rifle',
                unlockedWeapons: ['harpoon_rifle', 'tranquiliser_gun'],
                equipment: ['diving_suit', 'oxygen_tank'],
                unlockedEquipment: ['diving_suit', 'oxygen_tank']
            },
            colosseum: {
                trophies: 0,
                wins: 0,
                unlockedModes: ['shark_arena', 'team_predator', 'human_vs_shark', 'survival', 'capture_hunt', 'colosseum_boss']
            }
        };
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                const def = getDefaultState();
                def.activeSharkUid = def.sharks[0].uid;
                return def;
            }
            const parsed = JSON.parse(raw);
            const def = getDefaultState();
            const merged = Object.assign({}, def, parsed);
            merged.aquarium = Object.assign({}, def.aquarium, parsed.aquarium || {});
            merged.baseGrid = Object.assign({}, def.baseGrid, parsed.baseGrid || {});
            merged.human = Object.assign({}, def.human, parsed.human || {});
            merged.colosseum = Object.assign({}, def.colosseum, parsed.colosseum || {});
            if (!Array.isArray(merged.sharks) || merged.sharks.length === 0) {
                merged.sharks = [createDefaultShark('reef', 'Reef')];
            }
            if (!merged.activeSharkUid) {
                merged.activeSharkUid = merged.sharks[0].uid;
            }
            return merged;
        } catch (e) {
            const def = getDefaultState();
            def.activeSharkUid = def.sharks[0].uid;
            return def;
        }
    }

    const BSState = {
        data: loadState(),

        save() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
            } catch (e) {
                // ignore storage quota errors
            }
            this.emitChange();
        },

        listeners: [],
        onChange(fn) {
            this.listeners.push(fn);
        },
        emitChange() {
            this.listeners.forEach(fn => {
                try { fn(this.data); } catch (e) {}
            });
        },

        getActiveShark() {
            return this.data.sharks.find(s => s.uid === this.data.activeSharkUid) || this.data.sharks[0];
        },

        addCoins(amount) {
            this.data.coins = Math.max(0, (this.data.coins || 0) + amount);
            this.save();
        },

        addTreasureCoins(amount) {
            this.data.treasureCoins = Math.max(0, (this.data.treasureCoins || 0) + amount);
            this.save();
        },

        hasXpBoost() {
            return Date.now() < (this.data.xpBoostUntil || 0);
        },

        addSharkXP(amount) {
            const mult = this.hasXpBoost() ? 2 : 1;
            this.data.sharkXP += amount * mult;
            let needed = this.data.sharkLevel * 120;
            while (this.data.sharkXP >= needed) {
                this.data.sharkXP -= needed;
                this.data.sharkLevel += 1;
                needed = this.data.sharkLevel * 120;
            }
            this.save();
        },

        addPlayerXP(amount) {
            const mult = this.hasXpBoost() ? 2 : 1;
            this.data.playerXP += amount * mult;
            let needed = this.data.playerLevel * 100;
            while (this.data.playerXP >= needed) {
                this.data.playerXP -= needed;
                this.data.playerLevel += 1;
                needed = this.data.playerLevel * 100;
            }
            this.save();
        },

        captureShark(speciesId, customName) {
            const sp = SHARK_SPECIES[speciesId] || SHARK_SPECIES.reef;
            const shark = createDefaultShark(sp.id, customName || sp.name);
            this.data.sharks.push(shark);
            this.save();
            return shark;
        },

        SHARK_SPECIES,
        PERSONALITIES
    };

    global.BSState = BSState;
})(window);
