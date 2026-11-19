(function () {
    'use strict';

    function byId(id) { return document.getElementById(id); }

    function speedrunNow() { return window.performance && typeof window.performance.now === 'function' ? window.performance.now() : Date.now(); }
    function formatSpeedrunTime(milliseconds) {
        var centiseconds = Math.floor(Math.max(0, Number(milliseconds) || 0) / 10);
        var minutes = Math.floor(centiseconds / 6000);
        var seconds = Math.floor((centiseconds % 6000) / 100);
        var fraction = centiseconds % 100;
        return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0') + '.' + String(fraction).padStart(2, '0');
    }

    function loadSpeedrunRecords() {
        try {
            var parsed = JSON.parse(localStorage.getItem('GraveGain2DC_Speedrun_v1') || '{}');
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
            var records = {};
            Object.keys(parsed).slice(0, 600).forEach(function (key) {
                var record = parsed[key];
                if (!/^[a-z0-9_-]{1,100}$/i.test(key) || !record || typeof record !== 'object') return;
                var timeMs = Number(record.timeMs);
                if (isFinite(timeMs) && timeMs > 0 && timeMs < 86400000) records[key] = { timeMs: timeMs, date: String(record.date || '').slice(0, 24), splits: Array.isArray(record.splits) ? record.splits.slice(0, 60) : [] };
            });
            return records;
        } catch (_) { return {}; }
    }

    var PX_PER_M = 24.0;
    var M_PER_PX = 1.0 / PX_PER_M;

    var Race = {
        HUMAN: 'human',
        ELF: 'elf',
        DWARF: 'dwarf',
        ORC: 'orc'
    };

    var ClassType = {
        WARRIOR: 'warrior',
        TANK: 'tank',
        SUPPORT: 'support',
        MAGE: 'mage'
    };

    var RaceData = {
        human: {
            name: 'Human',
            emoji: '👩‍🚀',
            color: 'rgb(76, 127, 255)',
            maxHp: 100.0,
            hpRegen: 1.0,
            stamina: 100.0,
            speed: 250,
            desc: 'Shield Wall grants a 20-point barrier. Its ability locks for 8 seconds; damage delays shield recharge by 5 seconds.'
        },
        elf: {
            name: 'Elf',
            emoji: '🧝‍♀️',
            color: 'rgb(76, 255, 127)',
            maxHp: 75.0,
            hpRegen: 3.0,
            stamina: 100.0,
            speed: 275,
            desc: 'Nature Burst blasts nearby foes for 20 damage. Spend 40 of your 100 mana; recover 2 mana per second.'
        },
        dwarf: {
            name: 'Dwarf',
            emoji: '🧔🏻',
            color: 'rgb(255, 204, 76)',
            maxHp: 150.0,
            hpRegen: 2.0,
            stamina: 100.0,
            speed: 200,
            desc: 'Stone Form blocks all incoming damage for 4 seconds. It costs 50 stamina; health does not regenerate while active.'
        },
        orc: {
            name: 'Orc',
            emoji: '🟢👹',
            color: 'rgb(76, 210, 92)',
            maxHp: 200.0,
            hpRegen: 3.0,
            stamina: 100.0,
            speed: 225,
            desc: 'Build Rage by landing hits and slaying foes. Rage fades over time; unleash it in a burst that grows stronger with your meter.'
        }
    };

    var ClassTitles = {
        warrior: { human: 'Soldier', elf: 'Assassin', dwarf: 'Slayer', orc: 'Berserker' },
        tank: { human: 'Warden', elf: 'Paladin', dwarf: 'Brute', orc: 'Guardian' },
        support: { human: 'Medic', elf: 'Brewer', dwarf: 'Shaman', orc: 'Druid' },
        mage: { human: 'Engineer', elf: 'Tinkerer', dwarf: 'Warlock', orc: 'Witch' }
    };

    var ClassData = {
        warrior: { icon: '⚔️', description: 'Deal 15% more weapon damage.' },
        tank: { icon: '🛡️', description: 'Gain 25% max health and take 15% less damage.' },
        support: { icon: '🌿', description: 'Regenerate health 60% faster and heal on every kill.' },
        mage: { icon: '🔮', description: 'Race abilities deal 30% more damage and cost 15% less.' }
    };

    var EnemyTypes = [
        { name: 'Goblin Skeleton', emoji: '💀', hp: 15, dmg: 3, speed: 120, type: 'standard', blood: 'red' },
        { name: 'Elven Skeleton', emoji: '💀', hp: 25, dmg: 5, speed: 100, type: 'standard', blood: 'green' },
        { name: 'Goblin Zed', emoji: '🧟', hp: 40, dmg: 8, speed: 90, type: 'standard', blood: 'red' },
        { name: 'Small Orc Zed', emoji: '🧟‍♂️', hp: 60, dmg: 12, speed: 80, type: 'standard', blood: 'red' },
        { name: 'Flying Elf Skull', emoji: '👻', hp: 10, dmg: 30, speed: 150, type: 'exploding', blood: 'purple' },
        { name: 'Medium Orc Zed', emoji: '👺', hp: 150, dmg: 20, speed: 70, type: 'elite', blood: 'red' },
        { name: 'Dwarven Zed', emoji: '🛡️', hp: 200, dmg: 15, speed: 60, type: 'elite', blood: 'red', armored: true },
        { name: 'Human Zed', emoji: '🤖', hp: 500, dmg: 25, speed: 80, type: 'boss', blood: 'red', ranged: true },
        { name: 'Huge Orc Zed', emoji: '🟢👹', hp: 800, dmg: 40, speed: 50, type: 'boss', blood: 'red' },
        { name: 'Elven Necromancer', emoji: '🧙', hp: 400, dmg: 15, speed: 60, type: 'boss', blood: 'purple', summoner: true }
    ];

    var QuartersUpgrades = [
        { level: 1, size: '400x300 px', capacity: 100, cost: 250 },
        { level: 2, size: '600x400 px', capacity: 150, cost: 500 },
        { level: 3, size: '800x500 px', capacity: 200, cost: 900 },
        { level: 4, size: '1000x600 px', capacity: 250, cost: 1400 },
        { level: 5, size: '1200x700 px', capacity: 300, cost: 2000 },
        { level: 6, size: '1400x800 px', capacity: 350, cost: 2500 }
    ];

    var BotanySeeds = [
        { id: 'cannabis', name: 'Cannabis Sativa', space: 15, time: 120, yield: 3, value: 50, emoji: '🌿' },
        { id: 'mushroom', name: 'Magic Mushroom', space: 8, time: 80, yield: 2, value: 75, emoji: '🍄' },
        { id: 'bloodrose', name: 'Blood Rose', space: 10, time: 60, yield: 1, value: 120, emoji: '🌹' }
    ];

    var RunRelics = [
        { id: 'blood-oath', icon: '🩸', name: 'Blood Oath', rarity: 'Common', description: 'Melee strikes deal 25% more damage.', apply: function (p) { p.meleeDamageMultiplier = Math.min(2.5, (p.meleeDamageMultiplier || 1) + 0.25); } },
        { id: 'iron-heart', icon: '🛡️', name: 'Iron Heart', rarity: 'Common', description: 'Gain 20 maximum health and recover 30 health, scaled by Healing Efficiency.', apply: function (p) { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 30 * (p.healingEfficiency || 1)); } },
        { id: 'gravewind', icon: '🌬️', name: 'Gravewind Boots', rarity: 'Common', description: 'Move 12% faster and gain 15 maximum stamina.', apply: function (p) { p.speed *= 1.12; p.maxStamina += 15; p.stamina = Math.min(p.maxStamina, p.stamina + 15); } },
        { id: 'soul-siphon', icon: '🔮', name: 'Soul Siphon', rarity: 'Rare', description: 'Restore 8 health whenever you slay an enemy.', apply: function (p) { p.soulSiphon = Math.min(40, (p.soulSiphon || 0) + 8); } },
        { id: 'hunters-mark', icon: '🎯', name: "Hunter's Mark", rarity: 'Rare', description: 'Deal 15% more damage to elite foes and bosses.', apply: function (p) { p.bossDamageMultiplier = Math.min(2.2, (p.bossDamageMultiplier || 1) + 0.15); } },
        { id: 'warded-bones', icon: '🕯️', name: 'Warded Bones', rarity: 'Rare', description: 'Take 12% less damage from every source.', apply: function (p) { p.damageTakenMultiplier = Math.max(0.55, (p.damageTakenMultiplier || 1) * 0.88); } },
        { id: 'cinder-sigil', icon: '🔥', name: 'Cinder Sigil', rarity: 'Rare', description: 'Take 25% less damage from fire and thermal attacks.', apply: function (p) { p.damageResistances = p.damageResistances || {}; p.damageResistances.fire = Math.min(0.75, (Number(p.damageResistances.fire) || 0) + 0.25); } },
        { id: 'frostglass-ward', icon: '❄️', name: 'Frostglass Ward', rarity: 'Rare', description: 'Take 25% less damage from cryo and ice attacks.', apply: function (p) { p.damageResistances = p.damageResistances || {}; p.damageResistances.ice = Math.min(0.75, (Number(p.damageResistances.ice) || 0) + 0.25); } },
        { id: 'mire-mask', icon: '☣️', name: 'Mire Mask', rarity: 'Rare', description: 'Take 25% less damage from poison attacks and gas.', apply: function (p) { p.damageResistances = p.damageResistances || {}; p.damageResistances.poison = Math.min(0.75, (Number(p.damageResistances.poison) || 0) + 0.25); } },
        { id: 'rift-mantle', icon: '🌀', name: 'Rift Mantle', rarity: 'Rare', description: 'Take 25% less damage from warp and necrotic attacks.', apply: function (p) { p.damageResistances = p.damageResistances || {}; p.damageResistances.warp = Math.min(0.75, (Number(p.damageResistances.warp) || 0) + 0.25); p.damageResistances.necrotic = Math.min(0.75, (Number(p.damageResistances.necrotic) || 0) + 0.25); } },
        { id: 'executioners-eye', icon: '👁️', name: "Executioner's Eye", rarity: 'Rare', description: 'Gain 8% critical hit chance.', apply: function (p) { p.critChanceBonus = Math.min(0.25, (Number(p.critChanceBonus) || 0) + 0.08); } },
        { id: 'gravetouched-lens', icon: '💠', name: 'Gravetouched Lens', rarity: 'Epic', description: 'Critical hits deal 25% more bonus damage.', apply: function (p) { p.critDamageBonus = Math.min(0.75, (Number(p.critDamageBonus) || 0) + 0.25); } },
        { id: 'echoing-rune', icon: '⚡', name: 'Echoing Rune', rarity: 'Epic', description: 'Race abilities hit 20% harder and cost 10% less.', apply: function (p) { p.abilityDamageMultiplier = Math.min(2.2, (p.abilityDamageMultiplier || 1) + 0.2); p.abilityCostMultiplier = Math.max(0.6, (p.abilityCostMultiplier || 1) - 0.1); } },
        { id: 'fortune-skull', icon: '💰', name: 'Fortune Skull', rarity: 'Epic', description: 'Find 25% more gold and gain 10% more experience.', apply: function (p) { p.goldFindMultiplier = Math.min(2, (p.goldFindMultiplier || 1) + 0.25); p.xpGainMultiplier = Math.min(2, (p.xpGainMultiplier || 1) + 0.1); } }
    ];

    var CareerMilestones = [
        { id: 'first_blood', icon: '🩸', name: 'First Blood', desc: 'Slay your first undead.', stat: 'kills', target: 1 },
        { id: 'grave_sweeper', icon: '💀', name: 'Grave Sweeper', desc: 'Slay 100 undead across all runs.', stat: 'kills', target: 100 },
        { id: 'warden_breaker', icon: '👑', name: 'Warden Breaker', desc: 'Defeat your first boss.', stat: 'bossKills', target: 1 },
        { id: 'boss_hunter', icon: '⚔️', name: 'Boss Hunter', desc: 'Defeat 10 bosses.', stat: 'bossKills', target: 10 },
        { id: 'relicbound', icon: '🔮', name: 'Relicbound', desc: 'Choose 10 run relics.', stat: 'relics', target: 10 },
        { id: 'arsenal', icon: '🔫', name: 'Complete Arsenal', desc: 'Discover all 20 weapons.', stat: 'weapons', target: 20 },
        { id: 'bonus_hunter', icon: '✨', name: 'Bonus Hunter', desc: 'Complete 10 campaign bonus objectives.', stat: 'bonusObjectives', target: 10 },
        { id: 'colony_hero', icon: '🚀', name: 'Colony Hero', desc: 'Complete all 10 campaign missions.', stat: 'campaignMissions', target: 10 },
        { id: 'deep_delver', icon: '🕳️', name: 'Deep Delver', desc: 'Reach Layer 10.', stat: 'bestFloor', target: 10 },
        { id: 'last_survivor', icon: '🛡️', name: 'Last Survivor', desc: 'Extract alive from your first run.', stat: 'victories', target: 1 },
        { id: 'hazard_savant', icon: '☠️', name: 'Hazard Savant', desc: 'Let dungeon hazards slay 25 undead.', stat: 'environmentalKills', target: 25 },
        { id: 'campaign_scout', icon: '📡', name: 'Campaign Scout', desc: 'Complete your first campaign mission.', stat: 'campaignMissions', target: 1 },
        { id: 'campaign_veteran', icon: '🎖️', name: 'Campaign Veteran', desc: 'Complete 5 campaign missions.', stat: 'campaignMissions', target: 5 },
        { id: 'arsenal_initiate', icon: '🔩', name: 'Arsenal Initiate', desc: 'Discover 5 weapons.', stat: 'weapons', target: 5 },
        { id: 'arsenal_adept', icon: '🧰', name: 'Arsenal Adept', desc: 'Discover 10 weapons.', stat: 'weapons', target: 10 },
        { id: 'grave_collector', icon: '☠️', name: 'Grave Collector', desc: 'Slay 500 undead across all runs.', stat: 'kills', target: 500 },
        { id: 'catacomb_cleaver', icon: '⚔️', name: 'Catacomb Cleaver', desc: 'Slay 1,000 undead across all runs.', stat: 'kills', target: 1000 },
        { id: 'warden_executioner', icon: '🪓', name: 'Warden Executioner', desc: 'Defeat 25 bosses.', stat: 'bossKills', target: 25 },
        { id: 'warden_extinction', icon: '👹', name: 'Warden Extinction', desc: 'Defeat 50 bosses.', stat: 'bossKills', target: 50 },
        { id: 'relic_veteran', icon: '🧿', name: 'Relic Veteran', desc: 'Choose 25 run relics.', stat: 'relics', target: 25 },
        { id: 'relic_master', icon: '💠', name: 'Relic Master', desc: 'Choose 50 run relics.', stat: 'relics', target: 50 },
        { id: 'bonus_initiate', icon: '🌟', name: 'Bonus Initiate', desc: 'Complete your first campaign bonus objective.', stat: 'bonusObjectives', target: 1 },
        { id: 'bonus_legend', icon: '✨', name: 'Bonus Legend', desc: 'Complete 25 campaign bonus objectives.', stat: 'bonusObjectives', target: 25 },
        { id: 'abyssal_delver', icon: '🌑', name: 'Abyssal Delver', desc: 'Reach Layer 20.', stat: 'bestFloor', target: 20 },
        { id: 'world_below', icon: '🕯️', name: 'World Below', desc: 'Reach Layer 50.', stat: 'bestFloor', target: 50 },
        { id: 'unbroken', icon: '🏅', name: 'Unbroken', desc: 'Extract alive from 10 runs.', stat: 'victories', target: 10 },
        { id: 'safespace_legend', icon: '🌌', name: 'Safespace Legend', desc: 'Extract alive from 50 runs.', stat: 'victories', target: 50 },
        { id: 'secret_seeker', icon: '🗝️', name: 'Seam Seeker', desc: 'Open a hidden secret vault.', stat: 'secretVaults', target: 1 },
        { id: 'cache_raider', icon: '🪙', name: 'Cache Raider', desc: 'Claim 10 dead-end treasure caches.', stat: 'treasureCaches', target: 10 },
        { id: 'stalker_slayer', icon: '🦴', name: 'Stalker Slayer', desc: 'Defeat 10 Vault Stalkers.', stat: 'vaultStalkers', target: 10 }
    ];

    function careerMilestoneProgress(milestone, stats) {
        if (!milestone || !stats) return 0;
        if (milestone.stat === 'weapons') return Array.isArray(stats.weapons) ? stats.weapons.length : 0;
        if (milestone.stat === 'campaignMissions') return Array.isArray(stats.campaignMissions) ? stats.campaignMissions.length : 0;
        return Math.max(0, Number(stats[milestone.stat]) || 0);
    }

    function careerMilestonePoints(milestone) {
        var target = Math.max(1, Number(milestone && milestone.target) || 1);
        return target <= 1 ? 10 : (target <= 5 ? 15 : (target <= 10 ? 20 : (target <= 25 ? 30 : (target <= 50 ? 40 : 50))));
    }

    var CareerTalents = [
        { id: 'vitality', icon: '❤️', name: 'Graveforged Vitality', desc: '+10% maximum health at the start of each run.' },
        { id: 'arsenal', icon: '🎯', name: 'Relic Ballistics', desc: '+8% ranged weapon damage.' },
        { id: 'prospector', icon: '💰', name: 'Prospector’s Instinct', desc: '+15% gold from dungeon rewards.' },
        { id: 'fleetfoot', icon: '👟', name: 'Fleetfoot', desc: '+5% movement speed.' },
        { id: 'siphon', icon: '🔮', name: 'Soul Siphon', desc: 'Restore 1 health whenever you slay an enemy.' },
        { id: 'warded', icon: '🕯️', name: 'Warded Bones', desc: 'Take 8% less damage.' },
        { id: 'phoenix_protocol', icon: '🔥', name: 'Phoenix Protocol', desc: 'Once per run, survive a lethal hit at 35% health with a brief invulnerability window.' }
    ];

    var WeaponMasteryThresholds = [0, 10, 30, 60, 100, 150, 220];

    function weaponMasteryLevel(kills) {
        var count = Math.max(0, Math.floor(Number(kills) || 0));
        var level = 0;
        for (var i = 1; i < WeaponMasteryThresholds.length; i += 1) {
            if (count < WeaponMasteryThresholds[i]) break;
            level = i;
        }
        return level;
    }

    function criticalProfile(player) {
        player = player || {};
        var level = Math.max(1, Number(player.level) || 1);
        return {
            chance: Math.max(0, Math.min(0.4, 0.05 + (level - 1) * 0.0025 + (Number(player.critChanceBonus) || 0))),
            multiplier: Math.max(1, Math.min(2.5, 1.5 + (level - 1) * 0.005 + (Number(player.critDamageBonus) || 0)))
        };
    }

    function calculateMissionRating(stats) {
        stats = stats || {};
        if (!stats.completed) return { grade: 'F', score: 0 };
        var kills = Math.max(0, Math.floor(Number(stats.kills) || 0));
        var elapsedSeconds = Math.max(0, Number(stats.elapsedSeconds) || 0);
        var gold = Math.max(0, Number(stats.gold) || 0);
        var damage = Math.max(0, Number(stats.damage) || 0);
        var killPoints = Math.min(40, kills * 10);
        var timeBonus = Math.max(0, 30 - Math.floor(elapsedSeconds / 12));
        var goldBonus = Math.min(20, Math.floor(gold / 100));
        var damagePenalty = Math.min(40, Math.floor(damage / 5));
        var score = Math.max(0, Math.min(100, 10 + killPoints + timeBonus + goldBonus - damagePenalty));
        var grade = score >= 90 ? 'S' : (score >= 80 ? 'A' : (score >= 70 ? 'B' : (score >= 60 ? 'C' : 'D')));
        return { grade: grade, score: score, killPoints: killPoints, timeBonus: timeBonus, goldBonus: goldBonus, damagePenalty: damagePenalty };
    }

    function calculateCareerLevel(totalXp) {
        var xp = Math.max(0, Math.floor(Number(totalXp) || 0));
        var level = 1;
        while (level < 100 && xp >= 100 + (level - 1) * 75) {
            xp -= 100 + (level - 1) * 75;
            level += 1;
        }
        return level;
    }

    function loadCareerProgression() {
        var saved = {};
        try { saved = JSON.parse(localStorage.getItem('GraveGain2DC_Progression_v1') || '{}') || {}; } catch (_) {}
        var totalXp = Math.max(0, Math.floor(Number(saved.xp) || 0));
        var knownTalents = CareerTalents.map(function (talent) { return talent.id; });
        var passiveNodes = Array.isArray(saved.passiveNodes) ? Array.from(new Set(saved.passiveNodes.filter(function (id) { return knownTalents.indexOf(id) >= 0; }))) : [];
        var savedMastery = saved.weaponMastery && typeof saved.weaponMastery === 'object' ? saved.weaponMastery : {};
        var level = calculateCareerLevel(totalXp);
        return {
            level: level,
            xp: totalXp,
            paragonLevel: passiveNodes.length,
            paragonPoints: Math.max(0, level - 1 - passiveNodes.length),
            passiveNodes: passiveNodes,
            weaponMastery: {
                melee: Math.max(0, Math.floor(Number(savedMastery.melee) || 0)),
                ranged: Math.max(0, Math.floor(Number(savedMastery.ranged) || 0)),
                ability: Math.max(0, Math.floor(Number(savedMastery.ability) || 0))
            },
            alignment: saved.alignment && typeof saved.alignment === 'object' ? saved.alignment : { puritan: 0, radical: 0 },
            equippedPerks: Array.isArray(saved.equippedPerks) ? saved.equippedPerks : [],
            unlockedBlueprints: Array.isArray(saved.unlockedBlueprints) ? saved.unlockedBlueprints : []
        };
    }

    function getMaterialDeviceId() {
        var key = 'GraveGain2DC_MaterialDeviceId_v1';
        try {
            var existing = localStorage.getItem(key);
            if (existing && /^[a-z0-9_-]{8,64}$/i.test(existing)) return existing;
            var generated = 'mat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
            localStorage.setItem(key, generated);
            return generated;
        } catch (_) {
            return 'mat_' + Math.random().toString(36).slice(2, 14);
        }
    }

    function cleanMaterialBalances(input) {
        var output = {};
        if (!input || typeof input !== 'object') return output;
        Object.keys(input).forEach(function (id) {
            if (/^[a-z0-9_-]{1,40}$/i.test(id)) output[id] = Math.min(1000000000, Math.max(0, Math.floor(Number(input[id]) || 0)));
        });
        return output;
    }

    function cleanMaterialCounters(input) {
        var output = {};
        if (!input || typeof input !== 'object') return output;
        Object.keys(input).forEach(function (materialId) {
            if (!/^[a-z0-9_-]{1,40}$/i.test(materialId) || !input[materialId] || typeof input[materialId] !== 'object') return;
            var perDevice = {};
            Object.keys(input[materialId]).forEach(function (deviceId) {
                if (/^[a-z0-9_-]{8,64}$/i.test(deviceId)) perDevice[deviceId] = Math.min(1000000000, Math.max(0, Math.floor(Number(input[materialId][deviceId]) || 0)));
            });
            if (Object.keys(perDevice).length) output[materialId] = perDevice;
        });
        return output;
    }

    function deriveMaterialBalances(base, earned, spent) {
        var balances = {};
        var ids = Array.from(new Set(Object.keys(base || {}).concat(Object.keys(earned || {}), Object.keys(spent || {}))));
        ids.forEach(function (id) {
            var gained = Object.keys((earned || {})[id] || {}).reduce(function (sum, deviceId) { return sum + ((earned[id][deviceId] || 0) * 1); }, 0);
            var consumed = Object.keys((spent || {})[id] || {}).reduce(function (sum, deviceId) { return sum + ((spent[id][deviceId] || 0) * 1); }, 0);
            balances[id] = Math.min(1000000000, Math.max(0, (Number(base[id]) || 0) + gained - consumed));
        });
        return balances;
    }

    function changeStashMaterial(stash, id, deviceId, delta) {
        var collectionName = delta >= 0 ? 'materialEarned' : 'materialSpent';
        var collection = stash[collectionName];
        if (!collection[id]) collection[id] = {};
        collection[id][deviceId] = Math.min(1000000000, Math.max(0, (Number(collection[id][deviceId]) || 0) + Math.abs(Math.floor(delta))));
        stash.materials = deriveMaterialBalances(stash.materialBase, stash.materialEarned, stash.materialSpent);
    }

    function loadAccountStash(fallback) {
        var saved = fallback && typeof fallback === 'object' ? fallback : {};
        try { saved = JSON.parse(localStorage.getItem('GraveGain2DC_AccountStash_v1') || 'null') || saved; } catch (_) {}
        var savedMaterials = cleanMaterialBalances(saved.materials);
        var materialBase = saved.materialLedgerVersion === 1 && saved.materialBase && typeof saved.materialBase === 'object'
            ? cleanMaterialBalances(saved.materialBase) : savedMaterials;
        var materialEarned = cleanMaterialCounters(saved.materialEarned);
        var materialSpent = cleanMaterialCounters(saved.materialSpent);
        return {
            items: Array.isArray(saved.items) ? saved.items.slice(0, 500) : [],
            materialLedgerVersion: 1,
            materialBase: materialBase,
            materialEarned: materialEarned,
            materialSpent: materialSpent,
            materials: deriveMaterialBalances(materialBase, materialEarned, materialSpent),
            shards: Array.isArray(saved.shards) ? Array.from(new Set(saved.shards.filter(function (id) { return typeof id === 'string' && id.length <= 64; }))).slice(0, 1000) : [],
            consumedShards: Array.isArray(saved.consumedShards) ? Array.from(new Set(saved.consumedShards.filter(function (id) { return typeof id === 'string' && id.length <= 64; }))).slice(-1000) : []
        };
    }

    function createCareerArchive() {
        return { stats: { kills: 0, bossKills: 0, environmentalKills: 0, relics: 0, weapons: [], bonusObjectives: 0, campaignMissions: [], bestFloor: 1, victories: 0, secretVaults: 0, treasureCaches: 0, vaultStalkers: 0 }, unlocked: [] };
    }

    function loadCareerArchive() {
        var fresh = createCareerArchive();
        try {
            var saved = JSON.parse(localStorage.getItem('GraveGain2DC_Career_v1') || 'null');
            if (saved && typeof saved === 'object') {
                var stats = saved.stats && typeof saved.stats === 'object' ? saved.stats : {};
                Object.keys(fresh.stats).forEach(function (key) {
                    if (key === 'weapons') {
                        fresh.stats.weapons = Array.isArray(stats.weapons) ? Array.from(new Set(stats.weapons.filter(function (id) { return typeof id === 'string' && id.length <= 64; }))).slice(0, 20) : [];
                    } else if (key === 'campaignMissions') {
                        fresh.stats.campaignMissions = Array.isArray(stats.campaignMissions) ? Array.from(new Set(stats.campaignMissions.map(Number).filter(function (id) { return id >= 1 && id <= 10; }))) : [];
                    } else {
                        fresh.stats[key] = Math.max(key === 'bestFloor' ? 1 : 0, Math.floor(Number(stats[key]) || 0));
                    }
                });
                fresh.unlocked = Array.isArray(saved.unlocked) ? Array.from(new Set(saved.unlocked.filter(function (id) { return CareerMilestones.some(function (item) { return item.id === id; }); }))) : [];
            }
        } catch (_) {}
        var migrationChanged = false;
        try {
            var story = window.GraveGainStoryEngine;
            var progress = story && typeof story.getProgress === 'function' ? story.getProgress() : null;
            var completed = progress && Array.isArray(progress.completedMissions) ? progress.completedMissions : [];
            completed.forEach(function (id) {
                var missionId = Number(id);
                if (missionId >= 1 && missionId <= 10 && fresh.stats.campaignMissions.indexOf(missionId) < 0) {
                    fresh.stats.campaignMissions.push(missionId);
                    migrationChanged = true;
                }
            });
        } catch (_) {}
        var colonyHero = CareerMilestones.find(function (item) { return item.id === 'colony_hero'; });
        if (colonyHero && fresh.stats.campaignMissions.length >= colonyHero.target && fresh.unlocked.indexOf(colonyHero.id) < 0) {
            fresh.unlocked.push(colonyHero.id);
            migrationChanged = true;
        }
        if (migrationChanged) {
            try { localStorage.setItem('GraveGain2DC_Career_v1', JSON.stringify(fresh)); } catch (_) {}
        }
        return fresh;
    }

    function getDiscoveredStartingWeapons() {
        var catalog = window.GraveGainStubs && window.GraveGainStubs.weaponsCatalog;
        var weapons = catalog && typeof catalog.listWeapons === 'function' ? catalog.listWeapons() : [];
        var discovered = this.careerArchive && this.careerArchive.stats ? this.careerArchive.stats.weapons : [];
        if (discovered.indexOf('relic-bolt') < 0) discovered = discovered.concat('relic-bolt');
        return weapons.filter(function (weapon) { return discovered.indexOf(weapon.id) >= 0; });
    }
    GraveGainGame.prototype.getDiscoveredStartingWeapons = getDiscoveredStartingWeapons;

    function getPreferredStartingWeapon(weapons) {
        var id = 'relic-bolt';
        try { id = localStorage.getItem('GraveGain2DC_StartingWeapon_v1') || id; } catch (_) {}
        return weapons.some(function (weapon) { return weapon.id === id; }) ? id : 'relic-bolt';
    }

    function toggleGraveGainFullscreen() {
        try {
            if (typeof window.__fourweirdToggleFullscreen === 'function') { window.__fourweirdToggleFullscreen(); return; }
            var el = document.getElementById('canvasContainer') || document.documentElement;
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                var p = el.requestFullscreen ? el.requestFullscreen() : (el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null);
                if (p && p.catch) p.catch(function () {});
            } else if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        } catch (_) {}
    }

    function GameLoop(updateCallback, renderCallback) {
        this.update = updateCallback;
        this.render = renderCallback;
        this.lastTime = 0;
        this.isPaused = false;
        this.frameId = null;
        this.frameErrors = 0;
    }
    GameLoop.prototype.start = function () {
        if (this.frameId) cancelAnimationFrame(this.frameId);
        this.lastTime = performance.now();
        this.isPaused = false;
        var self = this;
        this.frameId = requestAnimationFrame(function (t) { self.loop(t); });
    };
    GameLoop.prototype.stop = function () {
        this.isPaused = true;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    };
    GameLoop.prototype.loop = function (timestamp) {
        if (this.isPaused) return;
        var delta = (timestamp - this.lastTime) / 1000.0;
        this.lastTime = timestamp;
        var dt = Math.min(Math.max(delta, 0.001), 0.1);
        try {
            this.update(dt);
            this.render();
        } catch (err) {
            this.frameErrors++;
            if (this.frameErrors < 5) console.error('[GraveGain2DC] frame error (loop survives):', err);
        }
        var self = this;
        this.frameId = requestAnimationFrame(function (t) { self.loop(t); });
    };

    function SaveSystem() {}
    SaveSystem.save = function (state) {
        try {
            var payload = {
                updatedAt: Date.now(),
                gold: state.gold,
                goldInterestCarry: state.goldInterestCarry,
                goldInterestElapsedMs: state.goldInterestElapsedMs,
                uusd: state.uusd,
                quartersLevel: state.quartersLevel,
                prestige: state.prestige,
                botanyCrops: state.botanyCrops,
                dailyChallengeDate: state.dailyChallengeDate,
                dailyChallenges: state.dailyChallenges,
                settings: {
                    difficulty: state.difficultyMultiplierSetting,
                    volume: state.audio.masterVolume,
                    pickupRange: state.autoPickupRange,
                    cameraShake: state.cameraShakeEnabled,
                    cameraLead: state.cameraLeadEnabled,
                    cameraPunch: state.cameraPunchEnabled,
                    muted: state.audio.muted,
                    controlMode: state.controlMode,
                    gameSpeed: state.gameSpeed,
                    speedrunMode: state.speedrunMode
                }
            };
            var schema = window.GraveGainStubs && window.GraveGainStubs.stateSchema;
            localStorage.setItem('GraveGain2DC_Save', JSON.stringify(schema && schema.normalize ? schema.normalize(payload) : payload));
        } catch (_) {}
    };
    SaveSystem.load = function () {
        try {
            var raw = localStorage.getItem('GraveGain2DC_Save');
            var migratedLegacySave = false;
            if (!raw) {
                raw = localStorage.getItem('GraveGain2D_Save');
                migratedLegacySave = !!raw;
            }
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            var schema = window.GraveGainStubs && window.GraveGainStubs.stateSchema;
            var normalized = schema && schema.normalize ? schema.normalize(parsed) : parsed;
            if (migratedLegacySave) {
                localStorage.setItem('GraveGain2DC_Save', JSON.stringify(normalized));
            }
            return normalized;
        } catch (_) {
            return null;
        }
    };

    function AudioController() {
        this.ctx = null;
        this.masterVolume = 0.8;
        this._muted = false;
        Object.defineProperty(this, 'muted', {
            get: function () { return this._muted; },
            set: function (v) {
                this._muted = !!v;
                if (this._muted) {
                    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (_) {}
                }
                var muteButton = document.getElementById('btnMute');
                if (muteButton) {
                    muteButton.setAttribute('aria-pressed', String(this._muted));
                    muteButton.setAttribute('aria-label', this._muted ? 'Unmute audio' : 'Mute audio');
                    muteButton.textContent = this._muted ? '🔇 Muted · M' : '🔊 Sound · M';
                }
            },
            configurable: true
        });
    }
    AudioController.prototype.initCtx = function () {
        if (!this.ctx) {
            var Ctor = window.AudioContext || window.webkitAudioContext;
            if (Ctor) this.ctx = new Ctor();
        }
    };
    AudioController.prototype.play = function (soundName) {
        if (this.muted) return;
        try {
            this.initCtx();
            if (!this.ctx) return;
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            var now = this.ctx.currentTime;
            gain.gain.setValueAtTime(Math.max(0.001, this.masterVolume * 0.1), now);
            if (soundName === 'hit') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(20, now + 0.15);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
            } else if (soundName === 'block') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
            } else if (soundName === 'ability') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now); osc.stop(now + 0.3);
            } else if (soundName === 'loot') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
            } else {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
            }
        } catch (_) {}
    };
    AudioController.prototype.speakFallback = function (text) {
        if (this.muted) return;
        try {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                var u = new SpeechSynthesisUtterance(text);
                u.volume = this.masterVolume;
                window.speechSynthesis.speak(u);
            }
        } catch (_) {}
    };

    function ParticleCompat(engine, game) {
        this.engine = engine;
        this.game = game;
        this.rings = [];
        this.sparks = [];
        this.floaters = [];
        this.bloodSplats = [];
        this.goreChunks = [];
    }
    ParticleCompat.prototype.spawnRing = function (x, y, color, r, life) {
        this.rings.push({ x: x, y: y, color: color, radius: r || 40, life: life || 0.3 });
    };
    ParticleCompat.prototype.spawnSparks = function (x, y, color, count) {
        var wr = this.engine && this.engine.getWorldRenderer && this.engine.getWorldRenderer();
        if (wr && this.engine.getState().player) {
            wr.spawnFlashLight({ x: x * M_PER_PX, y: this.engine.getState().player.y + 0.5, z: y * M_PER_PX }, 0xfacc15, 1.5, 6, 0.1);
        }
        this.sparks.push({ x: x, y: y, color: color, count: count || 8 });
    };
    ParticleCompat.prototype.spawnExplosionVFX = function (x, y) {
        var wr = this.engine && this.engine.getWorldRenderer && this.engine.getWorldRenderer();
        if (wr && this.engine.getState().player) {
            wr.spawnFlashLight({ x: x * M_PER_PX, y: this.engine.getState().player.y + 0.5, z: y * M_PER_PX }, 0xf97316, 4.0, 12, 0.25);
        }
        this.spawnRing(x, y, '#c084fc', 80, 0.4);
    };
    ParticleCompat.prototype.spawnFloater = function (x, y, text, color) {
        this.floaters.push({ x: x, y: y, text: String(text), color: color || '#facc15', life: 1.0 });
    };
    ParticleCompat.prototype.spawnBlood = function (x, y, color) {
        var t = this.engine && this.engine.getTerrain && this.engine.getTerrain();
        if (t) t.addDebris('scorch', x * M_PER_PX, t.getWorldHeightAt(x * M_PER_PX, y * M_PER_PX), y * M_PER_PX, 0.45, color === 'purple' ? 0x581c87 : 0x7f1d1d);
    };
    ParticleCompat.prototype.spawnGore = function (x, y) { this.spawnBlood(x, y, 'red'); };
    ParticleCompat.prototype.spawnShieldVFX = function (x, y) { this.spawnRing(x, y, 'deepskyblue', 46, 0.4); };
    ParticleCompat.prototype.spawnNatureBurstVFX = function (x, y) { this.spawnRing(x, y, '#4ade80', 90, 0.45); };
    ParticleCompat.prototype.spawnStoneFormVFX = function (x, y) { this.spawnRing(x, y, 'gold', 46, 0.4); };
    ParticleCompat.prototype.spawnRageBurstVFX = function (x, y) { this.spawnRing(x, y, '#ef4444', 100, 0.45); };
    ParticleCompat.prototype.spawnPerfectBlockVFX = function (x, y) { this.spawnRing(x, y, '#22d3ee', 55, 0.3); };
    ParticleCompat.prototype.update = function (dt) {
        this.rings = this.rings.filter(function (r) { r.life -= dt; return r.life > 0; });
        this.floaters = this.floaters.filter(function (f) { f.life -= dt; return f.life > 0; });
    };

    function CameraCompat(engine) {
        this.engine = engine;
        this.width = 1000;
        this.height = 600;
        this.x = 0;
        this.y = 0;
    }
    CameraCompat.prototype.applyShake = function (amt) {
        var rig = this.engine && this.engine.getCameraRig && this.engine.getCameraRig();
        if (rig) rig.applyShake(amt);
    };
    CameraCompat.prototype.applyPunch = function (vx, vy) {
        var rig = this.engine && this.engine.getCameraRig && this.engine.getCameraRig();
        if (rig) rig.applyPunch({ x: vx, z: vy }, 0.25);
    };
    CameraCompat.prototype.getOffsets = function () {
        var st = this.engine && this.engine.getState && this.engine.getState();
        var p = st && st.player;
        if (!p) return { x: 0, y: 0 };
        return { x: p.x * PX_PER_M - this.width / 2, y: p.z * PX_PER_M - this.height / 2 };
    };

    function wrapPlayer(enginePlayer, game) {
        var proxy = {
            _e: enginePlayer,
            radius: 16,
            get race() { return enginePlayer.race; },
            set race(v) { enginePlayer.race = v; },
            get classType() { return enginePlayer.classType; },
            set classType(v) { enginePlayer.classType = v; },
            get x() { return enginePlayer.x * PX_PER_M; },
            set x(v) { enginePlayer.x = v * M_PER_PX; },
            get y() { return enginePlayer.z * PX_PER_M; },
            set y(v) { enginePlayer.z = v * M_PER_PX; },
            get z() { return enginePlayer.y; },
            set z(v) { enginePlayer.y = v; },
            get vx() { return enginePlayer.vx * PX_PER_M; },
            set vx(v) { enginePlayer.vx = v * M_PER_PX; },
            get vy() { return enginePlayer.vz * PX_PER_M; },
            set vy(v) { enginePlayer.vz = v * M_PER_PX; },
            get angle() { return enginePlayer.angle; },
            set angle(v) { enginePlayer.angle = v; },
            get hp() { return enginePlayer.hp; },
            set hp(v) { enginePlayer.hp = v; },
            get maxHp() { return enginePlayer.maxHp; },
            set maxHp(v) { enginePlayer.maxHp = v; },
            get stamina() { return enginePlayer.stamina; },
            set stamina(v) { enginePlayer.stamina = v; },
            get maxStamina() { return enginePlayer.maxStamina; },
            set maxStamina(v) { enginePlayer.maxStamina = v; },
            get mana() { return enginePlayer.mana; },
            set mana(v) { enginePlayer.mana = v; },
            get maxMana() { return enginePlayer.maxMana; },
            set maxMana(v) { enginePlayer.maxMana = v; },
            get rage() { return enginePlayer.rage; },
            set rage(v) { enginePlayer.rage = v; },
            get shieldBubble() { return enginePlayer.shieldBubble; },
            set shieldBubble(v) { enginePlayer.shieldBubble = v; },
            get shieldCooldown() { return enginePlayer.shieldCooldown; },
            set shieldCooldown(v) { enginePlayer.shieldCooldown = v; },
            get stoneForm() { return enginePlayer.stoneForm; },
            set stoneForm(v) { enginePlayer.stoneForm = v; },
            get stoneDuration() { return enginePlayer.stoneDuration; },
            set stoneDuration(v) { enginePlayer.stoneDuration = v; },
            get gold() { return enginePlayer.gold; },
            set gold(v) { enginePlayer.gold = v; },
            get xp() { return enginePlayer.xp; },
            set xp(v) { enginePlayer.xp = v; },
            get level() { return enginePlayer.level; },
            set level(v) { enginePlayer.level = v; },
            get nextLevelXp() { return enginePlayer.nextLevelXp; },
            set nextLevelXp(v) { enginePlayer.nextLevelXp = v; },
            get isDead() { return enginePlayer.isDead; },
            set isDead(v) { enginePlayer.isDead = v; },
            get dodgeTime() { return enginePlayer.dodgeTime; },
            set dodgeTime(v) { enginePlayer.dodgeTime = v; },
            get perfectBlockWindow() { return enginePlayer.perfectBlockWindow; },
            set perfectBlockWindow(v) { enginePlayer.perfectBlockWindow = v; },
            get blockCooldown() { return enginePlayer.blockCooldown; },
            set blockCooldown(v) { enginePlayer.blockCooldown = v; },
            get bloodlust() { return enginePlayer.bloodlust; },
            get secondWindUsed() { return enginePlayer.secondWindUsed; },
            gainXp: function (amt) {
                enginePlayer.xp += Math.max(0, Number(amt) || 0);
                var leveled = false;
                var levelsGained = 0;
                while (enginePlayer.xp >= enginePlayer.nextLevelXp) {
                    enginePlayer.level++;
                    enginePlayer.nextLevelXp += 50 + (enginePlayer.level - 1) * 25;
                    enginePlayer.maxHp += 10;
                    enginePlayer.hp = enginePlayer.maxHp;
                    enginePlayer.maxStamina += 5;
                    enginePlayer.stamina = enginePlayer.maxStamina;
                    enginePlayer.speed += 0.12;
                    enginePlayer.levelDamageReduction = Math.min(0.25, (enginePlayer.level - 1) * 0.0025);
                    enginePlayer.healingEfficiency = Math.min(1.5, 1 + (enginePlayer.level - 1) * 0.005);
                    enginePlayer.levelUpFlash = 1.5;
                    leveled = true;
                    levelsGained++;
                }
                if (leveled) {
                    game.audio.play('ability');
                    game.vfx.spawnNatureBurstVFX(proxy.x, proxy.y);
                    game.openRelicDraft(levelsGained);
                }
                return leveled;
            },
            triggerAbility: function () {
                if (enginePlayer.race === 'human') {
                    if (enginePlayer.shieldCooldown > 0 || enginePlayer.shieldBubble >= 20) return false;
                    enginePlayer.shieldBubble = 20.0;
                    enginePlayer.shieldCooldown = 8.0;
                    game.audio.play('ability');
                    game.vfx.spawnShieldVFX(proxy.x, proxy.y);
                    return true;
                }
                var costScale = enginePlayer.abilityCostMultiplier || 1;
                if (enginePlayer.race === 'elf' && enginePlayer.mana >= 40 * costScale) {
                    enginePlayer.mana -= 40 * costScale;
                    game.audio.play('ability');
                    game.vfx.spawnNatureBurstVFX(proxy.x, proxy.y);
                    game.dealAoEDamage(proxy.x, proxy.y, 120, 20);
                    return true;
                }
                if (enginePlayer.race === 'dwarf' && enginePlayer.stamina >= 50 * costScale) {
                    enginePlayer.stamina -= 50 * costScale;
                    enginePlayer.stoneForm = true;
                    enginePlayer.stoneDuration = 4.0;
                    game.audio.play('ability');
                    game.vfx.spawnStoneFormVFX(proxy.x, proxy.y);
                    return true;
                }
                if (enginePlayer.race === 'orc' && enginePlayer.rage >= 30 * costScale) {
                    var power = enginePlayer.rage;
                    enginePlayer.rage = 0;
                    game.audio.play('ability');
                    game.vfx.spawnRageBurstVFX(proxy.x, proxy.y);
                    game.dealAoEDamage(proxy.x, proxy.y, 140, 10 + power * 0.4);
                    return true;
                }
                return false;
            }
        };
        return proxy;
    }

    function wrapEnemy(e) {
        return {
            _e: e,
            get id() { return e.id; },
            get name() { return e.name; },
            set name(v) { e.name = v; },
            get title() { return e.title || e.name; },
            set title(v) { e.title = v; },
            get emoji() { return e.emoji; },
            get type() { return e.type; },
            set type(v) { e.type = v; },
            get x() { return e.x * PX_PER_M; },
            set x(v) { e.x = v * M_PER_PX; },
            get y() { return e.z * PX_PER_M; },
            set y(v) { e.z = v * M_PER_PX; },
            get z() { return e.y; },
            get hp() { return e.hp; },
            set hp(v) { e.hp = v; if (v <= 0) e.isDead = true; },
            get maxHp() { return e.maxHp; },
            set maxHp(v) { e.maxHp = v; },
            get flash() { return e.flash; },
            set flash(v) { e.flash = v; },
            get bloodColor() { return e.bloodColor; }
        };
    }

    function wrapLoot(l) {
        return {
            _l: l,
            get id() { return l.id; },
            get type() { return l.type; },
            get value() { return l.value; },
            get picked() { return l.picked; },
            set picked(v) { l.picked = v; },
            get x() { return l.x * PX_PER_M; },
            set x(v) { l.x = v * M_PER_PX; },
            get y() { return l.z * PX_PER_M; },
            set y(v) { l.z = v * M_PER_PX; }
        };
    }

    function InputCompat(game) {
        this.game = game;
        this.keys = {};
        this.mouse = { x: 0, y: 0, click: false, rightClick: false, angle: 0 };
        this.joystick = { active: false, turnMoveFired: false, pendingTurnMove: null, touchId: null, startX: 0, startY: 0, curX: 0, curY: 0, x: 0, y: 0 };
        this.tapMove = { active: false, x: 0, y: 0 };
        this.tapMoveEnabled = true;
        this.autoTarget = false;
        this.interactPressed = false;
        this.gamepad = { index: null, buttons: [], turnAction: null, moveDirection: null, block: false };
        this.menuGamepadButtons = [];
        this.menuGamepadDirection = null;
        this.isCoarsePointer = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
        try {
            this.autoTarget = localStorage.getItem('GraveGain2DC_autoTarget') === '1';
            this.tapMoveEnabled = localStorage.getItem('GraveGain2DC_tapMove') !== '0';
        } catch (_) {}
        this._tapDown = null;
        this.setupListeners();
    }
    InputCompat.prototype.setAutoTarget = function (on) {
        this.autoTarget = !!on;
        try { localStorage.setItem('GraveGain2DC_autoTarget', this.autoTarget ? '1' : '0'); } catch (_) {}
    };
    InputCompat.prototype.setTapMove = function (on) {
        this.tapMoveEnabled = !!on;
        if (!on) this.tapMove.active = false;
        try { localStorage.setItem('GraveGain2DC_tapMove', this.tapMoveEnabled ? '1' : '0'); } catch (_) {}
    };
    InputCompat.prototype.updateGamepadStatus = function (gamepad) {
        var badge = document.getElementById('gamepadStatus');
        if (!badge) return;
        var connected = !!gamepad;
        badge.classList.toggle('hidden', !connected);
        badge.textContent = connected
            ? '🎮 CONTROLLER · A SELECT/DODGE · B BACK/MELEE · LS MOVE · RS AIM · RT FIRE · X LOOT · Y ABILITY · LB BLOCK · RB WEAPON · START PAUSE'
            : '';
    };
    InputCompat.prototype.pollGamepadMenus = function () {
        if (!navigator.getGamepads || typeof navigator.getGamepads !== 'function') return;
        var pads;
        try { pads = navigator.getGamepads(); } catch (_) { return; }
        if (!pads) return;
        var pad = null;
        for (var i = 0; i < pads.length; i += 1) {
            if (pads[i] && pads[i].connected) { pad = pads[i]; break; }
        }
        if (!pad) {
            this.menuGamepadButtons = [];
            this.menuGamepadDirection = null;
            return;
        }
        var buttons = pad.buttons.map(function (value) { return !!(value && (value.pressed || value.value > 0.55)); });
        var previous = this.menuGamepadButtons;
        var justPressed = function (index) { return !!buttons[index] && !previous[index]; };
        var modal = Array.prototype.filter.call(
            document.querySelectorAll('.screen-overlay[role="dialog"][aria-modal="true"]'),
            function (screen) { return !screen.classList.contains('hidden'); }
        ).pop();
        var gameActive = !!(this.game.player && this.game.loop && !this.game.loop.isPaused);
        if (modal || !gameActive) {
            var scope = modal || document;
            var focusables = Array.prototype.filter.call(scope.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'), function (element) {
                return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
            });
            if (focusables.length) {
                var currentIndex = focusables.indexOf(document.activeElement);
                if (currentIndex < 0) {
                    currentIndex = 0;
                    focusables[0].focus();
                }
                var axisX = Number(pad.axes[0]) || 0;
                var axisY = Number(pad.axes[1]) || 0;
                var direction = null;
                if (justPressed(12)) direction = 'up';
                else if (justPressed(13)) direction = 'down';
                else if (justPressed(14)) direction = 'left';
                else if (justPressed(15)) direction = 'right';
                else if (Math.max(Math.abs(axisX), Math.abs(axisY)) > 0.62) {
                    direction = Math.abs(axisX) > Math.abs(axisY) ? (axisX < 0 ? 'left' : 'right') : (axisY < 0 ? 'up' : 'down');
                }
                if (direction && direction !== this.menuGamepadDirection) {
                    var focused = focusables[currentIndex];
                    if (focused && focused.matches('input[type="range"]') && (direction === 'left' || direction === 'right')) {
                        var step = Number(focused.step) || 1;
                        var min = Number(focused.min) || 0;
                        var max = Number(focused.max) || 100;
                        focused.value = String(Math.max(min, Math.min(max, Number(focused.value) + (direction === 'right' ? step : -step))));
                        focused.dispatchEvent(new Event('input', { bubbles: true }));
                        focused.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        currentIndex = (currentIndex + ((direction === 'down' || direction === 'right') ? 1 : focusables.length - 1)) % focusables.length;
                        focusables[currentIndex].focus();
                    }
                }
                this.menuGamepadDirection = direction;
                if (justPressed(0)) {
                    var selected = focusables.indexOf(document.activeElement) >= 0 ? document.activeElement : focusables[0];
                    if (selected && typeof selected.click === 'function') selected.click();
                }
                if (justPressed(1)) {
                    if (modal && modal.id === 'pauseScreen') this.game.togglePause();
                    else window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
                }
            }
        }
        if (this.gamepad.index !== pad.index) {
            this.gamepad.index = pad.index;
            this.updateGamepadStatus(pad);
        }
        this.menuGamepadButtons = buttons;
    };
    InputCompat.prototype.pollGamepad = function () {
        if (!navigator.getGamepads || typeof navigator.getGamepads !== 'function') return;
        var pads;
        try { pads = navigator.getGamepads(); } catch (_) { return; }
        if (!pads) return;
        var pad = null;
        for (var i = 0; i < pads.length; i += 1) {
            if (pads[i] && pads[i].connected) { pad = pads[i]; break; }
        }
        if (!pad) {
            if (this.gamepad.index !== null) {
                this.gamepad.index = null;
                this.gamepad.buttons = [];
                this.gamepad.turnAction = null;
                this.gamepad.moveDirection = null;
                this.gamepad.block = false;
                this.menuGamepadButtons = [];
                this.menuGamepadDirection = null;
                this.updateGamepadStatus(null);
                this.game.engine.setInputState({ keys: this.keys, mouseDown: !!this.mouse.click, moveX: this.joystick.active ? this.joystick.x : 0, moveZ: this.joystick.active ? this.joystick.y : 0 });
            }
            return;
        }
        if (this.gamepad.index !== pad.index) {
            this.gamepad.index = pad.index;
            this.gamepad.buttons = [];
            this.updateGamepadStatus(pad);
        }
        var g = this.gamepad;
        var button = function (index) {
            var value = pad.buttons[index];
            return !!(value && (value.pressed || value.value > 0.55));
        };
        var pressed = [];
        for (var b = 0; b < pad.buttons.length; b += 1) pressed[b] = button(b);
        this.menuGamepadButtons = pressed.slice();
        var justPressed = function (index) { return !!pressed[index] && !g.buttons[index]; };
        var x = Number(pad.axes[0]) || 0;
        var z = Number(pad.axes[1]) || 0;
        var deadzone = 0.18;
        if (Math.abs(x) < deadzone) x = 0;
        if (Math.abs(z) < deadzone) z = 0;
        var rightX = Number(pad.axes[2]) || 0;
        var rightZ = Number(pad.axes[3]) || 0;
        if (Math.hypot(rightX, rightZ) < 0.28) rightX = rightZ = 0;
        var turnBased = this.game.controlMode === 'turnbased';
        var activeModal = document.querySelector('.screen-overlay[role="dialog"][aria-modal="true"]:not(.hidden)');
        var gameIsActive = this.game.player && this.game.loop && !this.game.loop.isPaused && !activeModal;

        if (gameIsActive) {
            if (justPressed(9)) {
                this.game.togglePause();
                g.buttons = pressed;
                return;
            }
            this.game.engine.setInputState({ moveX: x + (this.joystick.active ? this.joystick.x : 0), moveZ: z + (this.joystick.active ? this.joystick.y : 0) });
            var player = this.game.engine.getState().player;
            if (player && (rightX || rightZ)) {
                var aimAngle = Math.atan2(rightZ, rightX);
                player.angle = aimAngle;
                this.game.engine.setInputState({ aimX: player.x + Math.cos(aimAngle) * 5, aimZ: player.z + Math.sin(aimAngle) * 5 });
            }
            g.block = !turnBased && pressed[4];
            var gamepadKeys = Object.assign({}, this.keys, { KeyV: !!this.keys['KeyV'] || (!turnBased && pressed[1]) });
            this.game.engine.setInputState({ keys: gamepadKeys, mouseDown: !!pressed[7] || !!this.mouse.click });
            if (justPressed(5)) this.game.cycleWeapon(1);
            if (!turnBased && g.buttons[1] && !pressed[1] && !this.keys['KeyV']) this.game.triggerMeleeSwing();

            if (turnBased) {
                this.gamepad.turnAction = null;
                var moveDirection = null;
                if (Math.max(Math.abs(x), Math.abs(z)) >= 0.42) {
                    moveDirection = Math.abs(x) > Math.abs(z) ? (x < 0 ? 'left' : 'right') : (z < 0 ? 'up' : 'down');
                }
                if (moveDirection && moveDirection !== g.moveDirection) this.gamepad.turnAction = moveDirection;
                g.moveDirection = moveDirection;
                if (justPressed(0)) this.gamepad.turnAction = 'wait';
                else if (justPressed(1)) this.gamepad.turnAction = 'melee';
                else if (justPressed(4)) this.gamepad.turnAction = 'block';
                else if (justPressed(7)) this.gamepad.turnAction = 'attack';
                else if (justPressed(2)) this.gamepad.turnAction = 'interact';
                else if (justPressed(3)) this.gamepad.turnAction = 'ability';
            } else {
                if (justPressed(0)) this.game.engine.dodgePlayer();
                if (justPressed(2)) {
                    this.game.engine.setInputState({ interactPressed: true });
                }
                if (justPressed(3)) this.keys['KeyF'] = true;
                if (justPressed(6)) this.game.engine.setInputState({ grenadePressed: true });
                if (justPressed(1) && this.game.engine.getState().player) {
                    this.game.engine.getState().player.angle = Math.hypot(rightX, rightZ) > 0 ? Math.atan2(rightZ, rightX) : this.game.engine.getState().player.angle;
                }
            }
        }
        g.buttons = pressed;
    };
    InputCompat.prototype.setupListeners = function () {
        var self = this;
        var engine = this.game.engine;

        window.addEventListener('gamepadconnected', function (event) { self.updateGamepadStatus(event.gamepad); });
        window.addEventListener('gamepaddisconnected', function () {
            self.gamepad.index = null;
            self.gamepad.buttons = [];
            self.menuGamepadButtons = [];
            self.menuGamepadDirection = null;
            self.updateGamepadStatus(null);
            self.gamepad.block = false;
            engine.setInputState({ keys: self.keys, mouseDown: !!self.mouse.click, moveX: self.joystick.active ? self.joystick.x : 0, moveZ: self.joystick.active ? self.joystick.y : 0 });
        });
        window.setInterval(function () { self.pollGamepadMenus(); }, 90);

        window.addEventListener('keydown', function (e) {
            if (e.code === 'Escape') {
                var archive = document.getElementById('careerArchiveScreen');
                if (archive && !archive.classList.contains('hidden')) {
                    archive.classList.add('hidden');
                    var archiveButton = document.getElementById('btnOpenCareerArchive');
                    if (archiveButton) archiveButton.focus();
                    e.preventDefault();
                    return;
                }
            }
            var modalScreens = Array.prototype.filter.call(
                document.querySelectorAll('.screen-overlay[role="dialog"][aria-modal="true"]'),
                function (screen) { return !screen.classList.contains('hidden'); }
            );
            var activeModal = modalScreens[modalScreens.length - 1];
            if (activeModal) {
                if (activeModal.id === 'pauseScreen' && (e.code === 'Escape' || e.code === 'KeyP')) {
                    e.preventDefault();
                    self.game.togglePause();
                } else if (e.code === 'Escape') {
                    var dismissId = {
                        storyMissionScreen: 'btnStoryBack',
                        hubScreen: 'btnLeaveHub',
                        settingsScreen: 'btnCancelSettings',
                        storyDialogueScreen: 'btnNextDialogue',
                        gameOverScreen: 'btnGoToMenu',
                        ascendantTalentsScreen: 'btnCloseAscendantTalents'
                    }[activeModal.id];
                    if (activeModal.id === 'charSelectScreen') {
                        var modeStep = document.getElementById('modeStep');
                        var classStep = document.getElementById('classStep');
                        dismissId = modeStep && !modeStep.classList.contains('hidden') ? 'btnModeBack' :
                            (classStep && !classStep.classList.contains('hidden') ? 'btnClassBack' : 'btnRaceBack');
                    }
                    var dismissButton = dismissId && document.getElementById(dismissId);
                    if (dismissButton) {
                        e.preventDefault();
                        dismissButton.click();
                    }
                }
                return;
            }
            var target = e.target;
            var uiControl = target && target.closest && target.closest('button,a,input,textarea,select,[contenteditable="true"],[role="button"],[role="tab"]');
            if (uiControl && e.code !== 'Escape') return;
            var turnActionKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE', 'KeyF'];
            var oneShotDodgeKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
            if (self.game.player && e.repeat && ((self.game.controlMode === 'turnbased' && turnActionKeys.indexOf(e.code) >= 0) || oneShotDodgeKeys.indexOf(e.code) >= 0)) {
                e.preventDefault();
                return;
            }
            if (e.code === 'KeyV') {
                e.preventDefault();
                if (!e.repeat && self.game.player && self.game.loop && !self.game.loop.isPaused) {
                    if (self.game.controlMode === 'turnbased') self.game.executeTurnAction('melee');
                    else {
                        self.keys[e.code] = true;
                        if (engine) engine.setInputState({ keys: self.keys });
                    }
                }
                return;
            }
            self.keys[e.code] = true;
            if (engine) engine.setInputState({ keys: self.keys });
            if (e.code === 'KeyP' || e.code === 'Escape') {
                self.game.togglePause();
            }
            if (e.code === 'KeyF' && (!self.game.loop || self.game.loop.isPaused)) {
                toggleGraveGainFullscreen();
            }
            if (e.code === 'KeyM' && !e.repeat && self.game.audio) {
                self.game.audio.muted = !self.game.audio.muted;
                self.game.scheduleStateSave();
            }
            if (e.code === 'KeyQ' && !e.repeat && self.game.player && !self.game.loop.isPaused) {
                e.preventDefault();
                self.game.cycleWeapon(1);
            }
            if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
                var mode = { Digit1: 'realtime', Digit2: 'chrono', Digit3: 'turnbased' }[e.code];
                self.game.setControlMode(mode);
            }
            if (e.code === 'Space' && self.game.player && !self.game.loop.isPaused) {
                e.preventDefault();
                if (!e.repeat && self.game.controlMode !== 'turnbased' && engine && typeof engine.dodgePlayer === 'function') engine.dodgePlayer();
            }
            // Arrow keys trigger directional dodge rolls
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && self.game.player && !self.game.loop.isPaused) {
                e.preventDefault();
                if (engine) engine.setInputState({ keys: self.keys });
            }
        });
        window.addEventListener('keyup', function (e) {
            if (e.code === 'KeyV' && !self.gamepad.buttons[1] && self.game.player && self.game.loop && !self.game.loop.isPaused && self.game.controlMode !== 'turnbased') {
                self.game.triggerMeleeSwing();
            }
            self.keys[e.code] = false;
            if (engine) engine.setInputState({ keys: self.keys });
        });

        var container = document.getElementById('canvasContainer');
        if (!container) return;

        container.addEventListener('mousemove', function (e) {
            if (e.target.closest('.gg-minimap')) return;
            var rect = container.getBoundingClientRect();
            self.mouse.x = e.clientX - rect.left;
            self.mouse.y = e.clientY - rect.top;
            if (engine && engine.getState().player && !self.game.loop.isPaused) {
                var worldHit = engine.screenToGround(e.clientX, e.clientY);
                if (worldHit) {
                    var ep = engine.getState().player;
                    ep.angle = Math.atan2(worldHit.z - ep.z, worldHit.x - ep.x);
                    engine.setInputState({ aimX: worldHit.x, aimZ: worldHit.z });
                }
            }
        });

        container.addEventListener('mousedown', function (e) {
            if (e.target.closest('button,.gg-minimap,.thumb-tabs,.mobile-drawer,.screen-overlay')) return;
            try { container.focus({ preventScroll: true }); } catch (_) { try { container.focus(); } catch (e) {} }
            if (e.button === 0) {
                self.mouse.click = true;
                if (engine) engine.setInputState({ mouseDown: true });
            }
            if (e.button === 2) {
                e.preventDefault();
                self.mouse.rightClick = true;
            }
        });

        container.addEventListener('mouseup', function (e) {
            if (e.button === 0) {
                self.mouse.click = false;
                if (engine) engine.setInputState({ mouseDown: false });
            }
            if (e.button === 2) self.mouse.rightClick = false;
        });
        container.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        // Mobile floating crypt-stick & rune buttons
        var stickBase = document.getElementById('cryptStickBase');
        var stickKnob = document.getElementById('cryptStickKnob');
        var isOnButton = function (t) { return !!(t.target && t.target.closest && t.target.closest('.rune-cluster,.gg-minimap,.thumb-tabs,.mobile-drawer,button')); };

        container.addEventListener('touchstart', function (e) {
            if (self.game.isDialogueActive) return;
            Array.from(e.changedTouches).forEach(function (t) {
                if (isOnButton(t)) return;
                var rect = container.getBoundingClientRect();
                var cx = t.clientX - rect.left;
                var cy = t.clientY - rect.top;
                if (!self.joystick.active && cx < rect.width * 0.6) {
                    self.joystick.active = true;
                    self.joystick.turnMoveFired = false;
                    self.joystick.touchId = t.identifier;
                    self.joystick.startX = t.clientX;
                    self.joystick.startY = t.clientY;
                    self.joystick.x = 0; self.joystick.y = 0;
                    if (stickBase) { stickBase.style.left = cx + 'px'; stickBase.style.top = cy + 'px'; stickBase.classList.add('on'); }
                } else if (!self._tapDown) {
                    self._tapDown = { id: t.identifier, x: t.clientX, y: t.clientY, at: performance.now() };
                }
            });
        }, { passive: true });

        container.addEventListener('touchmove', function (e) {
            if (self.joystick.active) {
                var touch = Array.from(e.touches).find(function (t) { return t.identifier === self.joystick.touchId; });
                if (touch) {
                    var dx = touch.clientX - self.joystick.startX;
                    var dy = touch.clientY - self.joystick.startY;
                    var raw = Math.hypot(dx, dy);
                    if (raw > 8 && self._tapDown && self._tapDown.id === touch.identifier) self._tapDown.moved = true;
                    var maxR = 56;
                    var mag = Math.min(raw, maxR) / maxR;
                    var eased = mag < 0.18 ? 0 : Math.min(1, (mag - 0.18) / 0.82);
                    var ang = Math.atan2(dy, dx);
                    self.joystick.x = Math.cos(ang) * eased;
                    self.joystick.y = Math.sin(ang) * eased;
                    if (stickKnob) {
                        stickKnob.style.left = (50 + self.joystick.x * 32) + '%';
                        stickKnob.style.top = (50 + self.joystick.y * 32) + '%';
                    }
                    if (engine) engine.setInputState({ moveX: self.joystick.x, moveZ: self.joystick.y });
                }
            }
            var aimTouch = self._tapDown && Array.from(e.touches).find(function (t) { return t.identifier === self._tapDown.id; });
            if (aimTouch && engine && engine.getState().player) {
                if (Math.hypot(aimTouch.clientX - self._tapDown.x, aimTouch.clientY - self._tapDown.y) > 8) self._tapDown.moved = true;
                var aimPoint = engine.screenToGround(aimTouch.clientX, aimTouch.clientY);
                if (aimPoint) {
                    var aimPlayer = engine.getState().player;
                    aimPlayer.angle = Math.atan2(aimPoint.z - aimPlayer.z, aimPoint.x - aimPlayer.x);
                    engine.setInputState({ aimX: aimPoint.x, aimZ: aimPoint.z });
                }
            }
            if (e.cancelable && self.joystick.active) e.preventDefault();
        }, { passive: false });

        var endTouch = function (e) {
            Array.from(e.changedTouches).forEach(function (t) {
                if (t.identifier === self.joystick.touchId) {
                    if (self.game.controlMode === 'turnbased' && !self.joystick.turnMoveFired && Math.max(Math.abs(self.joystick.x), Math.abs(self.joystick.y)) >= 0.28) {
                        if (Math.abs(self.joystick.x) > Math.abs(self.joystick.y)) self.joystick.pendingTurnMove = self.joystick.x < 0 ? 'left' : 'right';
                        else self.joystick.pendingTurnMove = self.joystick.y < 0 ? 'up' : 'down';
                    }
                    self.joystick.active = false;
                    self.joystick.turnMoveFired = false;
                    self.joystick.touchId = null;
                    self.joystick.x = 0; self.joystick.y = 0;
                    if (stickBase) stickBase.classList.remove('on');
                    if (engine) engine.setInputState({ moveX: 0, moveZ: 0 });
                } else if (self._tapDown && t.identifier === self._tapDown.id) {
                    var quick = performance.now() - self._tapDown.at < 280 && !self._tapDown.moved;
                    if (!isOnButton(t) && engine && engine.getState().player) {
                        var hit = engine.screenToGround(t.clientX, t.clientY);
                        if (hit) {
                            var player = engine.getState().player;
                            player.angle = Math.atan2(hit.z - player.z, hit.x - player.x);
                            engine.setInputState({ aimX: hit.x, aimZ: hit.z });
                            if (quick && self.game.controlMode !== 'turnbased' && self.tapMoveEnabled) {
                                player.moveTarget = { active: true, x: hit.x, z: hit.z };
                            }
                        }
                    }
                }
                if (self._tapDown && t.identifier === self._tapDown.id) self._tapDown = null;
            });
        };
        container.addEventListener('touchend', endTouch);
        container.addEventListener('touchcancel', endTouch);

        var bindHold = function (el, down, up) {
            if (!el) return;
            el.addEventListener('touchstart', function (e) { e.preventDefault(); e.stopPropagation(); down(); }, { passive: false });
            el.addEventListener('touchend', function (e) { e.preventDefault(); if (up) up(); }, { passive: false });
            el.addEventListener('mousedown', function (e) { e.preventDefault(); e.stopPropagation(); down(); });
            el.addEventListener('mouseup', function () { if (up) up(); });
        };
        bindHold(document.getElementById('runeBtnA'), function () {
            self.mouse.click = true;
            if (engine) engine.setInputState({ mouseDown: true });
        }, function () {
            self.mouse.click = false;
            if (engine) engine.setInputState({ mouseDown: false });
        });
        bindHold(document.getElementById('runeBtnB'), function () {
            self.interactPressed = true;
            if (engine) engine.setInputState({ interactPressed: true });
        });
        bindHold(document.getElementById('mobileMeleeBtn'), function () {
            if (!self.game.player || !self.game.loop || self.game.loop.isPaused) return;
            if (self.game.controlMode === 'turnbased') self.game.executeTurnAction('melee');
            else {
                self.keys['KeyV'] = true;
                if (engine) engine.setInputState({ keys: self.keys });
            }
        }, function () {
            if (self.game.controlMode === 'turnbased') return;
            if (engine) self.game.triggerMeleeSwing();
            self.keys['KeyV'] = false;
            if (engine) engine.setInputState({ keys: self.keys });
        });
        var mobileMeleeButton = document.getElementById('mobileMeleeBtn');
        if (mobileMeleeButton) mobileMeleeButton.addEventListener('click', function (event) {
            if (event.detail !== 0 || !self.game.player || !self.game.loop || self.game.loop.isPaused) return;
            if (self.game.controlMode === 'turnbased') self.game.executeTurnAction('melee');
            else self.game.triggerMeleeSwing();
        });
        bindHold(document.getElementById('mobileDodgeBtn'), function () {
            if (self.game.controlMode !== 'turnbased' && engine && typeof engine.dodgePlayer === 'function') engine.dodgePlayer();
        });
        bindHold(document.getElementById('mobileBlockBtn'), function () { self.mouse.rightClick = true; }, function () { self.mouse.rightClick = false; });
        bindHold(document.getElementById('mobileAbilityBtn'), function () { self.keys['KeyF'] = true; }, function () { self.keys['KeyF'] = false; });
        var waitBtn = document.getElementById('mobileWaitBtn');
        if (waitBtn && !waitBtn.dataset.bound) {
            waitBtn.dataset.bound = '1';
            waitBtn.addEventListener('click', function () { self.game.executeTurnAction('wait'); });
        }
    };

    function GraveGainGame() {
        this.engine = window.GraveGainEngine;
        this.canvas = document.getElementById('gameCanvas');
        // CRITICAL: NEVER call getContext('2d') on #gameCanvas so WebGLRenderer owns it exclusively!
        this.ctx = null;
        this.lightCanvas = document.getElementById('lightingCanvas');
        this.lightCtx = null;

        this.engine.initRenderers();
        if (this.lightCanvas && this.engine.isWebGLActive()) {
            this.lightCanvas.style.display = 'none';
        }
        // Pre-build initial sector and render baseline frame so WebGL canvas is never black
        this.engine.buildSector({ floorIndex: 1 });
        this.engine.renderFrame();
        this.minimap = window.GraveGainStubs && window.GraveGainStubs.minimap3d
            ? window.GraveGainStubs.minimap3d.init(this.engine, document.getElementById('canvasContainer'))
            : null;
        this.bestiary = window.GraveGainStubs && window.GraveGainStubs.codexBestiary
            ? window.GraveGainStubs.codexBestiary.init(this.engine, document.getElementById('btnOpenBestiary'))
            : null;

        this.input = new InputCompat(this);
        this.camera = new CameraCompat(this.engine);
        this.vfx = new ParticleCompat(this.engine, this);
        this.audio = new AudioController();

        this.gold = 0;
        this.goldInterestCarry = 0;
        this.goldInterestElapsedMs = 0;
        this.goldInterestLastUpdateAt = 0;
        this.uusd = 200;
        this.quartersLevel = 1;
        this.prestige = 0;
        this.floorIndex = 1;
        this.difficultyMultiplierSetting = 'normal';
        this.cameraShakeEnabled = true;
        this.cameraLeadEnabled = true;
        this.cameraPunchEnabled = true;
        this.controlMode = 'realtime';
        this.gameSpeed = 1;
        this.speedrunMode = false;
        this.speedrunRecords = loadSpeedrunRecords();
        this.speedrunStartedAt = 0;
        this.speedrunSplits = [];
        this.speedrunVisitedRooms = Object.create(null);
        this.speedrunLastRoomId = null;
        this.speedrunLastSplitMs = 0;
        this.chronoScale = 0.04;
        this.turnCount = 1;
        this.lastTurnInputAt = 0;
        this.isDialogueActive = false;
        this.dailyChallengeDate = null;
        this.dailyChallenges = null;
        this.careerArchive = loadCareerArchive();
        this.careerProgression = loadCareerProgression();
        this.materialDeviceId = getMaterialDeviceId();
        this.accountStash = loadAccountStash(this.engine.getState().stash);
        this.runCareerXpStart = this.careerProgression.xp;
        this.runSparkiteStart = Number(this.accountStash.materials.sparkite) || 0;
        this.runRiftShardsEarned = 0;
        this.relicDraftRerolled = false;
        this.relicDraftPreviousOfferIds = [];
        this.runRecorded = false;
        this.runRevivalTokens = 0;

        this.player = null;
        this.enemies = [];
        this.loot = [];
        this.dungeon = null;
        this.currentMission = null;
        this.selectedStoryMissionId = null;
        this.sessionStart = 0;
        this.autoPickupRange = 100;
        this.engine.setLootMagnetRange(this.autoPickupRange);
        this.tapLootBoost = 0;
        this.runKills = 0;
        this.runCrits = 0;
        this.runHeadshots = 0;
        this.runOverkills = 0;
        this.runEnvironmentalKills = 0;
        this.runGold = 0;
        this.runDamageTaken = 0;
        this.dpsSamples = [];
        this.runPeakDps = 0;
        this._campaignGoldRewardEarned = 0;
        this.runDeaths = 0;
        this.runDamageRecap = [];
        this.relicDraftQueue = 0;
        this._campaignActiveWaves = [];
        this.runRelics = [];
        this.offeredRelics = [];
        this.currentWeaponIndex = 0;
        this.storyBossPhaseIndex = -1;

        this.botanyCrops = [
            { seedId: null, startTime: 0, growthTime: 0, capacity: 0 },
            { seedId: null, startTime: 0, growthTime: 0, capacity: 0 },
            { seedId: null, startTime: 0, growthTime: 0, capacity: 0 },
            { seedId: null, startTime: 0, growthTime: 0, capacity: 0 }
        ];

        var self = this;
        this.loop = new GameLoop(
            function (dt) { self.update(dt); },
            function () { self.render(); }
        );

        this.bindEngineEvents();
        this.setupUIListeners();
        this.bindRuntimeBridgeEvents();
        this.initMobileControls();
        this.loadState();
        this.reconcileCareerMilestones(true);
        this.renderAccountStash();
        this.renderCareerTalents();
        this.generateDailyChallenges();
        this.renderDailyChallenges();
        this.startAutoSaveTimer();
        this.startGoldInterestTimer();
    }

    GraveGainGame.prototype.saveCareerArchive = function () {
        try { localStorage.setItem('GraveGain2DC_Career_v1', JSON.stringify(this.careerArchive)); } catch (_) {}
    };

    GraveGainGame.prototype.saveAccountStash = function () {
        var stash = this.accountStash;
        try { localStorage.setItem('GraveGain2DC_AccountStash_v1', JSON.stringify(stash)); } catch (_) {}
        var engineState = this.engine && this.engine.getState ? this.engine.getState() : null;
        if (engineState) engineState.stash = stash;
        if (typeof window.__fourweirdRequestSave === 'function') window.__fourweirdRequestSave('account-stash');
    };

    GraveGainGame.prototype.addStashMaterial = function (id, amount) {
        if (!/^[a-z0-9_-]{1,40}$/i.test(id)) return;
        var gained = Math.max(0, Math.floor(Number(amount) || 0));
        if (!gained) return;
        changeStashMaterial(this.accountStash, id, this.materialDeviceId, gained);
        this.saveAccountStash();
        this.renderAccountStash();
    };

    GraveGainGame.prototype.spendStashMaterial = function (id, amount) {
        var spent = Math.max(0, Math.floor(Number(amount) || 0));
        if (!/^[a-z0-9_-]{1,40}$/i.test(id) || !spent || !this.accountStash || (Number(this.accountStash.materials[id]) || 0) < spent) return false;
        changeStashMaterial(this.accountStash, id, this.materialDeviceId, -spent);
        this.saveAccountStash();
        this.renderAccountStash();
        return true;
    };

    GraveGainGame.prototype.addStashShard = function () {
        var shardId = 'rift-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        if (this.accountStash.consumedShards.indexOf(shardId) >= 0) return;
        this.accountStash.shards.push(shardId);
        this.accountStash.shards = Array.from(new Set(this.accountStash.shards)).slice(-1000);
        this.runRiftShardsEarned += 1;
        this.saveAccountStash();
        this.renderAccountStash();
    };

    GraveGainGame.prototype.renderAccountStash = function () {
        var stash = this.accountStash;
        var count = byId('stashSparkiteCount');
        var status = byId('stashRefineryStatus');
        var refine = byId('btnRefineSparkite');
        var shardCount = byId('stashRiftShardCount');
        if (!stash) return;
        var sparkite = Math.max(0, Number(stash.materials.sparkite) || 0);
        if (count) count.textContent = String(sparkite);
        if (shardCount) shardCount.textContent = String(stash.shards.length);
        if (status) status.textContent = 'Account stash · ' + sparkite + ' Sparkite · ' + stash.shards.length + ' Rift Shards';
        if (refine) refine.disabled = sparkite < 1;
    };

    GraveGainGame.prototype.refineSparkite = function () {
        if (!this.spendStashMaterial('sparkite', 1)) return;
        this.uusd += 100;
        this.saveState();
        this.renderAccountStash();
        if (byId('exchangeUusdBalance')) byId('exchangeUusdBalance').textContent = this.uusd + ' $UUSD';
        this.audio.play('loot');
        var status = byId('stashRefineryStatus');
        if (status) status.textContent = 'Sparkite refined · +100 $UUSD added to your account.';
    };

    GraveGainGame.prototype.saveCareerProgression = function () {
        var progression = this.careerProgression;
        if (!progression) return;
        progression.paragonLevel = progression.passiveNodes.length;
        progression.paragonPoints = Math.max(0, progression.level - 1 - progression.passiveNodes.length);
        try { localStorage.setItem('GraveGain2DC_Progression_v1', JSON.stringify(progression)); } catch (_) {}
        var engineState = this.engine && this.engine.getState ? this.engine.getState() : null;
        if (engineState) engineState.progression = Object.assign({}, engineState.progression || {}, progression);
    };

    GraveGainGame.prototype.requestCareerProgressionSave = function (reason) {
        this.saveCareerProgression();
        if (typeof window.__fourweirdRequestSave === 'function') window.__fourweirdRequestSave(reason || 'career-progression');
    };

    GraveGainGame.prototype.awardCareerXP = function (amount) {
        var progression = this.careerProgression;
        var gained = Math.max(0, Math.floor(Number(amount) || 0));
        if (!progression || !gained) return;
        var oldLevel = progression.level;
        progression.xp += gained;
        progression.level = Math.max(progression.level, calculateCareerLevel(progression.xp));
        if (progression.level > oldLevel) {
            this.requestCareerProgressionSave('career-level-up');
            if (typeof this.showRunNotice === 'function') this.showRunNotice('ASCENDANT LEVEL ' + progression.level + ' · TALENT POINT +1', 'legendary');
            if (this.audio) this.audio.play('ability');
        } else this.saveCareerProgression();
        this.renderCareerTalents();
    };

    GraveGainGame.prototype.awardRunXP = function (amount) {
        var gained = Math.max(0, Math.round((Number(amount) || 0) * this.getPrestigeXpMultiplier()));
        if (this.player) this.player.gainXp(gained);
        this.awardCareerXP(gained);
    };

    GraveGainGame.prototype.getPrestigeDamageMultiplier = function () { return 1 + Math.max(0, Math.min(5, this.prestige || 0)) * 0.05; };
    GraveGainGame.prototype.getPrestigeXpMultiplier = function () { return 1 + Math.max(0, Math.min(5, this.prestige || 0)) * 0.1; };
    GraveGainGame.prototype.getPrestigeGoldMultiplier = function () { return 1 + Math.max(0, Math.min(5, this.prestige || 0)) * 0.1; };
    GraveGainGame.prototype.getGoldEarningsMultiplier = function () {
        var player = this.engine && this.engine.getState ? this.engine.getState().player : null;
        return this.getPrestigeGoldMultiplier() * (player && player.goldBoostTimer > 0 ? 1.5 : 1);
    };

    GraveGainGame.prototype.performPrestige = function () {
        var progression = this.careerProgression;
        if (!progression || progression.level < 100 || this.prestige >= 5) return false;
        this.prestige += 1;
        progression.level = 1;
        progression.xp = 0;
        progression.passiveNodes = [];
        progression.paragonLevel = 0;
        progression.paragonPoints = 0;
        this.requestCareerProgressionSave('career-prestige');
        this.saveState();
        this.renderCareerTalents();
        return true;
    };

    GraveGainGame.prototype.renderCareerTalents = function () {
        var progression = this.careerProgression;
        var list = byId('careerTalentList');
        var summary = byId('careerTalentSummary');
        if (!progression || !list) return;
        var points = Math.max(0, progression.level - 1 - progression.passiveNodes.length);
        var menuButton = byId('btnOpenAscendantTalents');
        if (menuButton) menuButton.textContent = '✨ Ascendant Talents · P' + this.prestige + ' · Lv ' + progression.level + ' · ' + points + ' pt' + (points === 1 ? '' : 's');
        var prestigeStatus = byId('prestigeStatus');
        var prestigeButton = byId('btnPrestige');
        var prestigeReady = progression.level >= 100 && this.prestige < 5;
        if (prestigeStatus) prestigeStatus.textContent = 'PRESTIGE ' + this.prestige + ' / 5 · +' + (this.prestige * 5) + '% DAMAGE · +' + (this.prestige * 10) + '% XP · +' + (this.prestige * 10) + '% GOLD';
        if (prestigeButton) {
            prestigeButton.disabled = !prestigeReady;
            prestigeButton.textContent = this.prestige >= 5 ? 'Prestige Circuit Complete' : (prestigeReady ? 'Ascend to Prestige ' + (this.prestige + 1) : 'Unlocks at Ascendant Level 100');
        }
        var currentLevelXp = progression.xp;
        for (var level = 1; level < progression.level; level += 1) currentLevelXp -= 100 + (level - 1) * 75;
        var nextLevelXp = 100 + (progression.level - 1) * 75;
        if (summary) summary.textContent = 'ASCENDANT LEVEL ' + progression.level + ' · ' + points + ' TALENT POINT' + (points === 1 ? '' : 'S') + ' · ' + Math.max(0, currentLevelXp) + ' / ' + nextLevelXp + ' XP';
        this.renderWeaponMastery();
        list.innerHTML = CareerTalents.map(function (talent) {
            var unlocked = progression.passiveNodes.indexOf(talent.id) >= 0;
            return '<article class="career-talent' + (unlocked ? ' unlocked' : '') + '"><span class="career-talent-icon">' + talent.icon + '</span><div class="career-talent-copy"><strong>' + talent.name + '</strong><small>' + talent.desc + '</small></div><button type="button" class="btn-game career-talent-action" data-talent="' + talent.id + '" ' + (unlocked || points < 1 ? 'disabled' : '') + '>' + (unlocked ? '✓ Learned' : 'Learn · 1 point') + '</button></article>';
        }).join('');
    };

    GraveGainGame.prototype.renderWeaponMastery = function () {
        var list = byId('weaponMasteryList');
        if (!list || !this.careerProgression) return;
        var mastery = this.careerProgression.weaponMastery || { melee: 0, ranged: 0, ability: 0 };
        var categories = [
            { id: 'melee', icon: '⚔️', name: 'Melee' },
            { id: 'ranged', icon: '🎯', name: 'Ranged' },
            { id: 'ability', icon: '✨', name: 'Ability' }
        ];
        list.innerHTML = categories.map(function (category) {
            var kills = Math.max(0, Number(mastery[category.id]) || 0);
            var level = weaponMasteryLevel(kills);
            var nextThreshold = WeaponMasteryThresholds[level + 1];
            var startThreshold = WeaponMasteryThresholds[level];
            var percent = nextThreshold ? Math.max(0, Math.min(100, ((kills - startThreshold) / (nextThreshold - startThreshold)) * 100)) : 100;
            var progressText = nextThreshold ? kills + ' / ' + nextThreshold + ' kills to next level' : kills + ' kills · MAX MASTERY';
            return '<article class="weapon-mastery-card"><div class="weapon-mastery-heading"><strong>' + category.icon + ' ' + category.name + '</strong><b>LV ' + level + '/6</b></div>' +
                '<small>+' + (level * 5) + '% damage</small><div class="career-progress"><i style="width:' + percent + '%"></i></div><small>' + progressText + '</small></article>';
        }).join('');
    };

    GraveGainGame.prototype.applyCareerTalents = function () {
        var player = this.engine && this.engine.getState ? this.engine.getState().player : null;
        var nodes = this.careerProgression ? this.careerProgression.passiveNodes : [];
        if (!player) return;
        if (nodes.indexOf('vitality') >= 0) { player.maxHp = Math.round(player.maxHp * 1.1); player.hp = player.maxHp; }
        if (nodes.indexOf('arsenal') >= 0) player.rangedDamageMultiplier = (player.rangedDamageMultiplier || 1) * 1.08;
        if (nodes.indexOf('prospector') >= 0) player.goldFindMultiplier = (player.goldFindMultiplier || 1) * 1.15;
        if (nodes.indexOf('fleetfoot') >= 0) player.speed *= 1.05;
        if (nodes.indexOf('siphon') >= 0) player.soulSiphon = (player.soulSiphon || 0) + 1;
        if (nodes.indexOf('warded') >= 0) player.damageTakenMultiplier = (player.damageTakenMultiplier || 1) * 0.92;
        if (nodes.indexOf('phoenix_protocol') >= 0) this.runRevivalTokens = 1;
        var mastery = this.careerProgression.weaponMastery || {};
        player.meleeDamageMultiplier = (player.meleeDamageMultiplier || 1) * (1 + weaponMasteryLevel(mastery.melee) * 0.05);
        player.rangedDamageMultiplier = (player.rangedDamageMultiplier || 1) * (1 + weaponMasteryLevel(mastery.ranged) * 0.05);
        player.abilityDamageMultiplier = (player.abilityDamageMultiplier || 1) * (1 + weaponMasteryLevel(mastery.ability) * 0.05);
        var prestigeDamage = this.getPrestigeDamageMultiplier();
        player.meleeDamageMultiplier *= prestigeDamage;
        player.rangedDamageMultiplier *= prestigeDamage;
        player.abilityDamageMultiplier *= prestigeDamage;
    };

    GraveGainGame.prototype.recordWeaponMasteryKill = function (event) {
        var hit = event && event.damageEvent;
        var player = this.engine && this.engine.getState ? this.engine.getState().player : null;
        if (!hit || !player) return;
        var type = hit.damageType;
        var category = type === 'melee' ? 'melee' : (type === 'ability' ? 'ability' : (type === 'kinetic' || type === 'ranged' || type === 'explosive' ? 'ranged' : null));
        if (!category || hit.attacker !== player) return;
        var mastery = this.careerProgression.weaponMastery;
        var oldLevel = weaponMasteryLevel(mastery[category]);
        mastery[category] = Math.max(0, Math.floor(Number(mastery[category]) || 0)) + 1;
        var newLevel = weaponMasteryLevel(mastery[category]);
        if (newLevel > oldLevel) {
            var label = category.charAt(0).toUpperCase() + category.slice(1);
            this.showRunNotice(label.toUpperCase() + ' MASTERY LEVEL ' + newLevel + ' · +' + (newLevel * 5) + '% DAMAGE NEXT RUN', 'legendary');
            this.renderWeaponMastery();
            this.requestCareerProgressionSave('weapon-mastery-level-up');
        } else this.saveCareerProgression();
    };

    GraveGainGame.prototype.tryRevivePlayer = function (player) {
        if (!player || !player.isDead || this.runRevivalTokens < 1) return false;
        this.runRevivalTokens -= 1;
        this.runDeaths += 1;
        player.isDead = false;
        player.hp = Math.max(1, Math.min(player.maxHp, Math.round(player.maxHp * 0.35 * (player.healingEfficiency || 1))));
        player.shieldBubble = Math.max(Number(player.shieldBubble) || 0, Math.round(player.maxHp * 0.2));
        player.dodgeTime = 1.5;
        player.vx = 0;
        player.vz = 0;
        player.fallenIntoChasm = false;
        player.flash = 0.35;
        this.showRunNotice('PHOENIX PROTOCOL · REVIVAL TOKEN SPENT · 35% VITALS RESTORED', 'legendary');
        this.updateHUD();
        this.audio.play('loot');
        this.scheduleStateSave();
        return true;
    };

    GraveGainGame.prototype.recordCareerProgress = function (stat, amount) {
        var career = this.careerArchive;
        if (!career || !career.stats) return;
        if (stat === 'weapons') {
            if (typeof amount === 'string' && amount && career.stats.weapons.indexOf(amount) < 0) career.stats.weapons.push(amount);
        } else if (stat === 'campaignMissions') {
            var missionId = Number(amount);
            if (missionId >= 1 && missionId <= 10 && career.stats.campaignMissions.indexOf(missionId) < 0) career.stats.campaignMissions.push(missionId);
        } else if (stat === 'bestFloor') {
            career.stats.bestFloor = Math.max(career.stats.bestFloor, Math.floor(Number(amount) || 1));
        } else {
            career.stats[stat] = Math.max(0, (Number(career.stats[stat]) || 0) + (Number(amount) || 0));
        }
        this.saveCareerArchive();
        this.reconcileCareerMilestones(false);
    };

    GraveGainGame.prototype.reconcileCareerMilestones = function (silent) {
        var career = this.careerArchive;
        if (!career || !career.stats) return;
        var newlyUnlocked = [];
        CareerMilestones.forEach(function (milestone) {
            if (career.unlocked.indexOf(milestone.id) >= 0) return;
            if (careerMilestoneProgress(milestone, career.stats) >= milestone.target) {
                career.unlocked.push(milestone.id);
                newlyUnlocked.push(milestone);
            }
        });
        if (!newlyUnlocked.length) return;
        this.saveCareerArchive();
        if (typeof window.__fourweirdRequestSave === 'function') window.__fourweirdRequestSave('career-milestone');
        this.renderCareerArchive();
        if (silent) return;
        newlyUnlocked.forEach(function (milestone) {
            this.showRunNotice('ACHIEVEMENT UNLOCKED · ' + milestone.icon + ' ' + milestone.name.toUpperCase() + ' · +' + careerMilestonePoints(milestone) + ' AP', 'legendary');
        }, this);
        if (this.audio) this.audio.play('ability');
    };

    GraveGainGame.prototype.renderCareerArchive = function () {
        var list = document.getElementById('careerMilestoneList');
        var summary = document.getElementById('careerArchiveSummary');
        if (!list || !this.careerArchive) return;
        var stats = this.careerArchive.stats;
        var unlocked = this.careerArchive.unlocked;
        var maxPoints = CareerMilestones.reduce(function (sum, milestone) { return sum + careerMilestonePoints(milestone); }, 0);
        var earnedPoints = CareerMilestones.reduce(function (sum, milestone) { return sum + (unlocked.indexOf(milestone.id) >= 0 ? careerMilestonePoints(milestone) : 0); }, 0);
        if (summary) summary.textContent = unlocked.length + ' / ' + CareerMilestones.length + ' ACHIEVEMENTS · ' + earnedPoints + ' / ' + maxPoints + ' AP · ' + stats.kills + ' LIFETIME KILLS · ' + stats.environmentalKills + ' HAZARD KILLS · LAYER ' + stats.bestFloor + ' BEST';
        list.innerHTML = CareerMilestones.map(function (milestone) {
            var current = careerMilestoneProgress(milestone, stats);
            var complete = unlocked.indexOf(milestone.id) >= 0;
            var percent = Math.max(0, Math.min(100, Math.floor((current / milestone.target) * 100)));
            return '<article class="career-milestone' + (complete ? ' complete' : '') + '"><span class="career-milestone-icon">' + milestone.icon + '</span>' +
                '<div class="career-milestone-copy"><strong>' + milestone.name + '</strong><small>' + milestone.desc + '</small>' +
                '<div class="career-progress"><i style="width:' + percent + '%"></i></div></div><span class="career-milestone-points">+' + careerMilestonePoints(milestone) + ' AP</span>' +
                '<b class="career-milestone-progress">' + (complete ? '✓' : Math.min(current, milestone.target) + '/' + milestone.target) + '</b></article>';
        }).join('');
    };

    GraveGainGame.prototype.bindEngineEvents = function () {
        var self = this;
        this.engine.on('combat:perfect-block', function (event) {
            if (!event || !event.countered) return;
            self.showRunNotice('PERFECT PARRY · COUNTER CRIT', 'legendary');
            if (self.audio) self.audio.play('block');
        });
        this.engine.on('combat:execution', function (event) {
            if (!event || !event.target) return;
            self.showRunNotice('EXECUTION · ' + String(event.target.name || 'TARGET').toUpperCase(), 'legendary');
            var worldRenderer = self.engine.getWorldRenderer && self.engine.getWorldRenderer();
            if (worldRenderer && worldRenderer.spawnExecutionSlash) worldRenderer.spawnExecutionSlash(event.target);
            if (self.audio) self.audio.play('hit');
        });
        this.engine.on('combat:shield-bash', function (event) {
            if (!event || !(Number(event.hits) > 0)) return;
            self.showRunNotice('SHIELD BASH · ' + event.hits + (event.hits === 1 ? ' ENEMY' : ' ENEMIES') + ' KNOCKED BACK', 'legendary');
            if (self.player) self.vfx.spawnShieldVFX(self.player.x, self.player.y);
            if (self.audio) self.audio.play('block');
        });
        this.engine.on('combat:charge-progress', function (event) {
            var stat = byId('hudChargeStat');
            var bar = byId('hudChargeBar');
            var text = byId('hudChargeText');
            if (!event || !stat) return;
            stat.classList.toggle('hidden', !(Number(event.charge) > 0.04));
            if (bar) bar.style.width = Math.max(0, Math.min(100, Number(event.charge) / Math.max(0.01, Number(event.maxCharge) || 1.1) * 100)) + '%';
            if (text) text.textContent = Math.round(Number(event.charge) / Math.max(0.01, Number(event.maxCharge) || 1.1) * 100) + '%';
            if (Number(event.charge) > 0.08) {
                var combatPlayer = self.engine.getState().player;
                var worldRenderer = self.engine.getWorldRenderer && self.engine.getWorldRenderer();
                if (combatPlayer && worldRenderer && worldRenderer.spawnFlashLight) {
                    var chargeRatio = Math.max(0, Math.min(1, Number(event.charge) / Math.max(0.01, Number(event.maxCharge) || 1.1)));
                    worldRenderer.spawnFlashLight({ x: combatPlayer.x, y: combatPlayer.y, z: combatPlayer.z }, 0xf97316, 0.7 + chargeRatio * 2.3, 4.5 + chargeRatio * 2.5, 0.12);
                }
            }
        });
        this.engine.on('combat:charge-release', function () {
            var stat = byId('hudChargeStat');
            if (stat) stat.classList.add('hidden');
        });
        this.engine.on('combat:charge-attack', function (event) {
            if (!event || !(Number(event.hits) > 0)) return;
            self.showRunNotice('CHARGED STRIKE · +' + Math.round((Number(event.bonus) || 0) * 100) + '% DAMAGE', 'legendary');
            if (self.audio) self.audio.play('hit');
        });
        this.engine.on('combat:melee-buffered-hit', function () {
            if (self.audio) self.audio.play('hit');
        });
        this.engine.on('combat:critical', function (event) {
            if (!event) return;
            self.runCrits += 1;
            if (event.isHeadshot) return;
            self.showRunNotice('CRITICAL STRIKE · ' + Math.round(event.finalDamage || 0) + ' DAMAGE', 'legendary');
        });
        this.engine.on('combat:headshot', function (event) {
            if (!event || !event.target) return;
            self.runHeadshots += 1;
            self.showRunNotice('HEADSHOT · 2× CRITICAL · ' + Math.round(event.finalDamage || 0) + ' DAMAGE', 'legendary');
            self.vfx.spawnSparks(event.target.x * PX_PER_M, event.target.z * PX_PER_M, '#facc15', 18);
        });
        this.engine.on('combat:overkill', function (event) {
            if (!event || !event.target) return;
            self.runOverkills += 1;
            self.showRunNotice('OVERKILL · ×' + Number(event.overkillMultiplier || 0).toFixed(1) + ' DAMAGE', 'legendary');
            var worldRenderer = self.engine.getWorldRenderer && self.engine.getWorldRenderer();
            if (worldRenderer && worldRenderer.spawnOverkillBurst) worldRenderer.spawnOverkillBurst(event.target, event.overkillMultiplier);
            if (self.audio) self.audio.play('ability');
        });
        this.engine.on('combat:adrenaline', function (event) {
            if (!event || !event.active) return;
            self.showRunNotice('ADRENALINE RUSH · +20% ATTACK · +20% SPEED', 'legendary');
            if (self.audio) self.audio.play('ability');
        });
        this.engine.on('combat:second-wind', function (event) {
            if (!event) return;
            self.showRunNotice('SECOND WIND · +' + Math.round(event.healed || 0) + ' HP · KEEP FIGHTING', 'legendary');
            if (self.audio) self.audio.play('loot');
        });
        this.engine.on('combat:lucky-dodge', function () {
            self.showRunNotice('LUCKY DODGE · NO DAMAGE', 'legendary');
            if (self.audio) self.audio.play('block');
        });
        this.engine.on('combat:dash-attack', function (event) {
            if (!event || !(Number(event.hits) > 0)) return;
            self.showRunNotice('DASH ATTACK · +' + Math.round((Number(event.bonus) || 0) * 100) + '% MELEE DAMAGE', 'legendary');
        });
        this.engine.on('combat:bloodlust', function (event) {
            self.updateHUD();
            if (!event || !event.gained || ![1, 3, 5].includes(Number(event.stacks))) return;
            self.showRunNotice('BLOODLUST · ' + event.stacks + ' STACKS · +' + Math.round(((Number(event.multiplier) || 1) - 1) * 100) + '% ATTACK SPEED', 'legendary');
        });
        this.engine.on('combat:sprint-lunge', function (event) {
            if (!event || !(Number(event.hits) > 0)) return;
            self.showRunNotice('SPRINT LUNGE · ' + Number(event.reach || 4).toFixed(1) + 'M REACH · +' + Math.round((Number(event.bonus) || 0) * 100) + '% DAMAGE', 'legendary');
        });
        this.engine.on('enemy:ambush', function (event) {
            if (!event || !event.enemy) return;
            self.showRunNotice('AMBUSH · ' + event.enemy.name + ' REVEALED', 'legendary');
            if (self.audio) self.audio.play('block');
        });
        this.engine.on('enemy:leash', function (event) {
            if (!event || !event.enemy) return;
            self.showRunNotice(event.enemy.name + ' BROKE OFF THE HUNT · RETURNING TO ITS DEN', 'rare');
        });
        this.engine.on('enemy:enrage', function (event) {
            if (!event || !event.enemy) return;
            self.showRunNotice('BOSS ENRAGED · ' + event.enemy.name + ' · +25% DAMAGE · +15% SPEED', 'legendary');
            if (self.audio) self.audio.play('ability');
        });
        this.engine.on('room:shrine-used', function (event) {
            if (!event) return;
            if (event.type === 'soul_fountain') self.showRunNotice('SOUL FOUNTAIN · +' + Math.round(Number(event.hpRestored) || 0) + ' HP · +' + Math.round(Number(event.shieldRestored) || 0) + ' SHIELD · STAMINA FULL', 'legendary');
            else self.showRunNotice('BLOOD ALTAR · +25% DAMAGE AND SPEED · ' + Math.ceil(Number(event.damageDuration) || 0) + 'S', 'legendary');
            if (self.audio) self.audio.play('ability');
            self.updateHUD();
        });
        this.engine.on('world:secret-revealed', function () {
            self.showRunNotice('HIDDEN SEAM FOUND · BREAK THE WALL', 'rare');
            if (self.audio) self.audio.play('ability');
        });
        this.engine.on('world:secret-cache-opened', function () {
            self.showRunNotice('SECRET CACHE UNCOVERED · BONUS WEAPON + 100 GOLD', 'legendary');
            if (self.audio) self.audio.play('block');
        });
        this.engine.on('difficulty:surge', function (event) {
            if (!event) return;
            self.showRunNotice('NIGHTFALL SURGE · ENEMY THREAT ×' + Number(event.multiplier || 1).toFixed(2) + ' · FLOOR PRESSURE RISES EVERY 5 MIN', 'legendary');
            if (self.audio) self.audio.play('ability');
        });
        this.engine.on('combat:damage', function (event) {
            if (!event || !event.target) return;
            if (event.target.id === 'player') {
                var received = Math.max(0, Number(event.finalDamage) || 0);
                if (received > 0) {
                    self.runDamageTaken += received;
                    var attacker = event.attacker;
                    var source = attacker ? (attacker.name || (attacker === self.engine.getState().player ? 'Own effect' : attacker.type || 'Undead')) : ((event.damageType || 'environmental') + ' hazard');
                    self.runDamageRecap.push({ source: source, type: event.damageType || 'unknown', damage: Math.round(received * 10) / 10, hp: Math.max(0, Number(event.target.hp) || 0), elapsedMs: Math.max(0, Date.now() - (self.sessionStart || Date.now())) });
                    if (self.runDamageRecap.length > 10) self.runDamageRecap.shift();
                }
                return;
            }
            var player = self.engine.getState().player;
            if (event.attacker !== player) return;
            var damageDealt = Math.max(0, Number(event.finalDamage) || 0);
            if (damageDealt > 0) {
                self.dpsSamples.push({ at: speedrunNow(), damage: damageDealt });
                if (self.dpsSamples.length > 500) self.dpsSamples.shift();
                self.updateDpsHud();
            }
            self.updateChallengeProgress('damage', event.finalDamage || event.rawDamage || 0);
        });
        if (window.GraveGainAAA && typeof window.GraveGainAAA.on === 'function') {
            window.GraveGainAAA.on('streak', function (event) {
                if (event && Number(event.n) > 0) self.updateChallengeProgress('streak', event.n);
            });
        }
        this.engine.on('combat:kill', function (ev) {
            if (!ev || !ev.target || ev.target.id === 'player') return;
            if (ev.target.isTreasureGuardian) {
                self.recordCareerProgress('vaultStalkers', 1);
                self.showRunNotice('VAULT STALKER SLAIN · CACHE CLAIMED', 'legendary');
                self.audio.play('block');
            }
            self.recordWeaponMasteryKill(ev);
            var damageEvent = ev.damageEvent;
            var damageType = damageEvent && String(damageEvent.damageType || '').toLowerCase();
            var environmentalTypes = ['fire', 'poison', 'cryo', 'warp', 'crush', 'explosive', 'thermal', 'lightning', 'electric'];
            if (damageEvent && !damageEvent.attacker && environmentalTypes.indexOf(damageType) >= 0) {
                self.runEnvironmentalKills += 1;
                self.recordCareerProgress('environmentalKills', 1);
            }
            var rewards = self.getScaledRewards(15, 10);
            self.gold += rewards.gold;
            self.runGold += rewards.gold;
            self.showGoldPickupPopup(rewards.gold);
            self.runKills++;
            self.recordCareerProgress('kills', 1);
            if (ev.target.type === 'boss') {
                self.recordCareerProgress('bossKills', 1);
                self.addStashShard();
                self.showRunNotice('RIFT SHARD SECURED · A FUTURE RELIC DRAFT CAN BE REROLLED', 'legendary');
            }
            var livingPlayer = self.engine.getState().player;
            if (livingPlayer && livingPlayer.soulSiphon) livingPlayer.hp = Math.min(livingPlayer.maxHp, livingPlayer.hp + livingPlayer.soulSiphon * (livingPlayer.healingEfficiency || 1));
            self.awardRunXP(rewards.xp);
            if (self.currentMission) {
                self.checkStoryObjectives(ev.target);
                self.trackSecondaryKill(ev.target);
                self.trackCampaignWaveKill(ev.target);
            }
            self.updateChallengeProgress('slay', 1);
            self.updateChallengeProgress('gold', rewards.gold);
            self.scheduleStateSave();
            self.audio.play('hit');
        });
        this.engine.on('world:secret-cache-opened', function () { self.recordCareerProgress('secretVaults', 1); });
        this.engine.on('world:treasure-cache-opened', function () { self.recordCareerProgress('treasureCaches', 1); });
        this.engine.on('loot:collected', function (l) {
            if (!l) return;
            if (l.treasureCacheId && l.type !== 'damage_boost') self.showRunNotice('DEAD-END CACHE · +' + Math.max(0, Number(l.value) || 0) + ' GOLD', 'rare');
            if (l.campaignItem === 'ore') self.addStashMaterial('sparkite', 1);
            if (l.type === 'health_orb' || l.type === 'speed_boost' || l.type === 'damage_boost' || l.type === 'shield_pickup' || l.type === 'rage_potion' || l.type === 'gold_multiplier' || l.type === 'xp_multiplier') {
                var pickupIcons = { health_orb: '💚', speed_boost: '💨', damage_boost: '🔥', shield_pickup: '🛡️', rage_potion: '🩸', gold_multiplier: '🪙', xp_multiplier: '✨' };
                self.showRunNotice((pickupIcons[l.type] || '✨') + ' ' + String(l.itemName || 'POWER UP').toUpperCase() + ' ACQUIRED', 'legendary');
                self.audio.play('loot');
                self.updateHUD();
                return;
            }
            if (l.type === 'weapon') {
                if (l.duplicate) {
                    var salvage = self.getScaledRewards(l.value || 60, 0).gold;
                    self.gold += salvage;
                    self.runGold += salvage;
                    self.showGoldPickupPopup(salvage);
                    self.updateChallengeProgress('gold', salvage);
                    self.scheduleStateSave();
                    self.showRunNotice('DUPLICATE SALVAGED · +' + salvage + ' GOLD', '');
                } else {
                    self.recordCareerProgress('weapons', l.weaponId);
                    self.showRunNotice((l.weaponIcon || '🔫') + ' ' + l.weaponName + ' · ' + l.weaponRarity + ' ACQUIRED', l.weaponRarity === 'Legendary' ? 'legendary' : '');
                }
                self.audio.play('loot');
                self.updateHUD();
                self.renderMobileDrawer();
                return;
            }
            var rewards = self.getScaledRewards(l.value || 15, l.type === 'item' ? 30 : 0);
            self.gold += rewards.gold;
            self.runGold += rewards.gold;
            self.showGoldPickupPopup(rewards.gold);
            self.scheduleStateSave();
            self.updateChallengeProgress('gold', rewards.gold);
            if (l.type === 'item') {
                self.awardRunXP(rewards.xp);
                if (self.currentMission) {
                    self.checkStoryObjectives(null, l.campaignItem === 'ore' ? 'ore' : null);
                    if (l.campaignItem === 'ore') self.showRunNotice((l.itemName || 'POWER CRYSTAL').toUpperCase() + ' RECOVERED', 'legendary');
                }
            }
            self.audio.play('loot');
        });
        this.engine.on('conduit:overloaded', function (conduit) {
            var objective = self.getSecondaryObjective();
            if (!objective || objective.id !== 'conduit_overload') {
                if (conduit && conduit.bossShieldBroken) self.showRunNotice('ARRAY SHIELD DOWN · ' + String(conduit.bossName || 'WARDEN').toUpperCase() + ' EXPOSED', 'legendary');
                return;
            }
            objective.current = Math.min(objective.count, (Number(objective.current) || 0) + 1);
            self.showRunNotice((conduit && conduit.bossShieldBroken ? 'ARRAY SHIELD DOWN · ' : 'ARRAY CONDUIT OVERLOADED · ') + objective.current + '/' + objective.count, 'legendary');
            self.updateMissionUI();
            if (objective.current >= objective.count) self.completeSecondaryObjective();
            self.audio.play('loot');
        });
        this.engine.on('enemy:boss-shield-broken', function () {
            self.audio.play('ability');
        });
        this.engine.on('campaign:designation-reinforced', function () {
            self.showRunNotice('PRIORITY TARGET REINFORCED · ORBITAL MARKER LOCKED', 'legendary');
        });
        this.engine.on('campaign:objective-progress', function (target) {
            var objective = self.getSecondaryObjective();
            if (!objective || !target || target.objectiveId !== objective.id) return;
            if (objective.id === 'forge_cache') self.addStashMaterial('sparkite', 1);
            objective.current = Math.min(objective.count, (Number(objective.current) || 0) + 1);
            var labels = {
                anchor_breaker: 'NECROMANTIC ANCHOR SHATTERED', forge_cache: 'SPARKITE CACHE RECOVERED',
                vent_sealer: 'TOXIC VENT SEALED', memorial_lights: 'MEMORIAL BEACON LIT',
                laser_designation: 'ORBITAL DESIGNATION COMPLETE'
            };
            if (objective.id === 'forge_cache' && self.player) {
                self.awardRunXP(100);
                var cacheGold = self.getScaledRewards(75, 0).gold;
                self.player.gold += cacheGold;
                self.gold += cacheGold;
                self.runGold += cacheGold;
                self.updateChallengeProgress('gold', cacheGold);
            }
            self.showRunNotice((objective.current >= objective.count ? 'BONUS COMPLETE · ' : '') + (labels[objective.id] || 'BONUS OBJECTIVE') + ' · ' + objective.current + '/' + objective.count, 'legendary');
            self.updateMissionUI();
            if (objective.current >= objective.count) self.completeSecondaryObjective();
            self.updateHUD();
            self.scheduleStateSave();
            self.audio.play('loot');
        });
        this.engine.on('ui:set-hud-hidden', function (hidden) {
            var hud = document.querySelector('.game-hud');
            var bar = document.getElementById('controlModesBar');
            var act = document.querySelector('.bottom-action-row');
            [hud, bar, act].forEach(function (el) {
                if (el) el.style.opacity = hidden ? '0' : '1';
            });
        });
    };

    GraveGainGame.prototype.bindRuntimeBridgeEvents = function () {
        var self = this;
        window.addEventListener('fourweird-mute', function (e) {
            var muted = e && e.detail ? !!e.detail.muted : !self.audio.muted;
            self.audio.muted = muted;
            self.scheduleStateSave();
        });
        window.addEventListener('fourweird-pause', function () {
            if (self.player && !self.loop.isPaused) self.togglePause();
        });
        window.addEventListener('fourweird-resume', function () {
            if (self.player && self.loop.isPaused) self.togglePause();
        });
        window.addEventListener('fourweird-cloud-load', function () {
            self.loadState();
            self.careerArchive = loadCareerArchive();
            self.careerProgression = loadCareerProgression();
            self.accountStash = loadAccountStash(self.engine.getState().stash);
            self.reconcileCareerMilestones(true);
            self.saveCareerProgression();
            self.renderCareerArchive();
            self.renderCareerTalents();
            self.renderAccountStash();
            self.renderDailyChallenges();
            self.updateHUD();
        });
        function flushPendingSave() {
            self.flushStateToHost('lifecycle');
        }
        window.addEventListener('pagehide', flushPendingSave);
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') flushPendingSave();
        });
    };

    GraveGainGame.prototype.syncCompatibilityViews = function () {
        var st = this.engine.getState();
        if (st.player) {
            if (!this.player || this.player._e !== st.player) {
                this.player = wrapPlayer(st.player, this);
            }
        }
        this.enemies = (st.enemies || []).map(wrapEnemy);
        this.loot = (st.loot || []).map(wrapLoot);
        this.chronoScale = st.chronoScale;
        this.turnCount = st.turnCount;
    };

    GraveGainGame.prototype.buildLegacyDungeonProxy = function () {
        var terrain = this.engine.getTerrain();
        var grid = new Array(terrain.width);
        var breakableWalls = [];
        for (var x = 0; x < terrain.width; x++) {
            grid[x] = new Array(terrain.height);
            for (var z = 0; z < terrain.height; z++) {
                var c = terrain.getCell(x, z);
                var code = 0;
                if (c.type === 'wall') code = 1;
                else if (c.type === 'breachable') { code = 6; breakableWalls.push({ x: x, y: z }); }
                else if (c.hazard === 'poison') code = 3;
                else if (c.hazard === 'fire') code = 4;
                else if (c.hazard === 'cryo') code = 5;
                else if (c.surface === 'mud' || c.surface === 'sludge') code = 2;
                grid[x][z] = code;
            }
        }
        this.dungeon = {
            gridSize: terrain.width,
            grid: grid,
            rooms: terrain.rooms,
            spawnRoom: terrain.spawnRoom,
            breakableWalls: breakableWalls
        };
    };

    GraveGainGame.prototype.initRun = function (race, classType) {
        var mission = this.selectedStoryMissionId && window.GraveGainStoryEngine
            ? window.GraveGainStoryEngine.getMission(this.selectedStoryMissionId) : null;
        this.currentMission = mission ? JSON.parse(JSON.stringify(mission)) : null;
        var secondaryObjective = this.getSecondaryObjective();
        if (secondaryObjective) secondaryObjective.current = 0;
        if (this.currentMission && Array.isArray(this.currentMission.objectives)) {
            this.currentMission.completed = false;
            this.currentMission.objectives.forEach(function (objective) { if (objective) objective.current = 0; });
        }
        this.floorIndex = this.currentMission ? (this.currentMission.minFloor || 1) : 1;
        this.sessionStart = Date.now();
        this.speedrunStartedAt = this.speedrunMode ? Math.max(1, speedrunNow()) : 0;
        this.speedrunSplits = [];
        this.speedrunVisitedRooms = Object.create(null);
        this.speedrunLastSplitMs = 0;
        this._speedrunResult = null;
        if (byId('speedrunTimerText')) byId('speedrunTimerText').textContent = '00:00.00';
        if (byId('speedrunSplitText')) byId('speedrunSplitText').textContent = 'ROOM SPLITS · WAITING';
        var speedrunTerrain = this.engine.getTerrain();
        this.speedrunLastRoomId = speedrunTerrain && speedrunTerrain.spawnRoom ? speedrunTerrain.spawnRoom.id : null;
        this.speedrunLastRoomFloor = this.floorIndex;
        this.runRecorded = false;
        this.runKills = 0;
        this.runCrits = 0;
        this.runHeadshots = 0;
        this.runOverkills = 0;
        this.runEnvironmentalKills = 0;
        this.runGold = 0;
        this.runDamageTaken = 0;
        this.dpsSamples = [];
        this.runPeakDps = 0;
        this._campaignGoldRewardEarned = 0;
        this.runDeaths = 0;
        this.runDamageRecap = [];
        this.runRevivalTokens = 0;
        this.relicDraftQueue = 0;
        this.runRelics = [];
        this.offeredRelics = [];
        this.currentWeaponIndex = 0;
        this.storyBossPhaseIndex = -1;
        this.runCareerXpStart = this.careerProgression.xp;
        this.runSparkiteStart = Number(this.accountStash.materials.sparkite) || 0;
        this.runRiftShardsEarned = 0;
        this.recordCareerProgress('bestFloor', this.floorIndex);
        this.recordCareerProgress('weapons', 'relic-bolt');
        var startingWeapons = this.getDiscoveredStartingWeapons();
        var selectedStartingWeapon = getPreferredStartingWeapon(startingWeapons);

        this.engine.startMission({
            race: race || 'human',
            classType: classType || 'warrior',
            floorIndex: this.floorIndex,
            dungeonTheme: this.currentMission ? this.currentMission.dungeonTheme : null,
            difficulty: this.difficultyMultiplierSetting,
            temporalMode: this.controlMode,
            startingWeapon: selectedStartingWeapon,
            isStoryMission: !!this.currentMission,
            appHandlesKillRewards: true,
            storyObjectives: this.currentMission && Array.isArray(this.currentMission.objectives)
                ? this.currentMission.objectives.map(function (objective) { return { id: objective.id, count: objective.count, current: objective.current || 0 }; }) : [],
            enemyDensityMult: this.currentMission && this.currentMission._campaign ? this.currentMission._campaign.enemyDensityMult : 1,
            eliteChance: this.currentMission && this.currentMission._campaign ? this.currentMission._campaign.eliteChance : 0,
            secondaryObjectiveId: secondaryObjective ? secondaryObjective.id : null,
            secondaryObjectiveCount: secondaryObjective ? secondaryObjective.count : 0
        });
        this.applyCareerTalents();
        this.updateChallengeProgress('depth', this.floorIndex);

        this.syncCompatibilityViews();
        this.buildLegacyDungeonProxy();
        this.engine.resize();
        if (this.lightCanvas && this.engine.isWebGLActive()) {
            this.lightCanvas.style.display = 'none';
        }

        if (this.currentMission) {
            this.populateMissionTargets();
            this.updateStoryBossPhase();
            this.updateMissionUI();
            var self = this;
            this.playDialogueSequence(this.currentMission.dialogueBefore, function () {
                if (self.currentMission && self.currentMission.objectives && self.currentMission.objectives[0]) {
                    self.audio.speakFallback('Mission Goal: ' + self.currentMission.objectives[0].desc);
                }
            });
        } else {
            this.updateMissionUI();
        }

        try {
            if (window.GigglesHelpDraft) {
                var self2 = this;
                setTimeout(function () {
                    window.GigglesHelpDraft.present('gravegain2dC', self2, function () { self2.updateHUD(); }, true);
                }, 0);
            }
        } catch (_) {}

        this.loop.start();
        this.updateHUD();
    };

    GraveGainGame.prototype.buildDungeonLayer = function () {
        var secondaryObjective = this.getSecondaryObjective();
        this.engine.buildSector({
            floorIndex: this.floorIndex,
            dungeonTheme: this.currentMission ? this.currentMission.dungeonTheme : null,
            isStoryMission: !!this.currentMission,
            storyObjectives: this.currentMission && Array.isArray(this.currentMission.objectives)
                ? this.currentMission.objectives.map(function (objective) { return { id: objective.id, count: objective.count, current: objective.current || 0 }; }) : [],
            enemyDensityMult: this.currentMission && this.currentMission._campaign ? this.currentMission._campaign.enemyDensityMult : 1,
            eliteChance: this.currentMission && this.currentMission._campaign ? this.currentMission._campaign.eliteChance : 0,
            secondaryObjectiveId: secondaryObjective ? secondaryObjective.id : null,
            secondaryObjectiveCount: secondaryObjective ? Math.max(0, Number(secondaryObjective.count) - (Number(secondaryObjective.current) || 0)) : 0
        });
        this.syncCompatibilityViews();
        this.buildLegacyDungeonProxy();
        if (this.currentMission) this.populateMissionTargets();
        this.updateChallengeProgress('depth', this.floorIndex);
        this.updateHUD();
    };

    GraveGainGame.prototype.populateMissionTargets = function () {
        if (!this.currentMission || !this.currentMission.objectives) return;
        var terrain = this.engine.getTerrain();
        var st = this.engine.getState();
        var hasBoss = st.enemies.some(function (e) { return e.type === 'boss'; });
        if (!hasBoss && this.currentMission.objectives.some(function (o) { return o.id === 'slay_boss'; })) {
            var room = terrain.safespaceRoom || terrain.rooms[terrain.rooms.length - 1];
            var pos = terrain.gridToWorld(room.cx, room.cz);
            var requestedBoss = String(this.currentMission.bossType || '').toLowerCase();
            var missionBossProfiles = {
                5: { archetype: 'drone-array', template: { name: 'Corrupted Drone Array', emoji: '🛰️', hp: 500, dmg: 26, speed: 1.9, blood: 'purple', ranged: true } },
                6: { archetype: 'toxic-golem', template: { name: 'Toxic Chem-Golem', emoji: '☣️', hp: 760, dmg: 28, speed: 1.55, blood: 'green', armored: true } }
            };
            var missionBossProfile = missionBossProfiles[this.currentMission.id] || null;
            var bossTpl = missionBossProfile ? missionBossProfile.template : (requestedBoss.indexOf('titan') >= 0 || requestedBoss.indexOf('goliath') >= 0 || requestedBoss.indexOf('berserker') >= 0 || requestedBoss.indexOf('golem') >= 0 || requestedBoss.indexOf('orc') >= 0
                ? EnemyTypes[8]
                : (requestedBoss.indexOf('necromancer') >= 0 || requestedBoss.indexOf('necro') >= 0 || requestedBoss.indexOf('lucifer') >= 0
                    ? EnemyTypes[9]
                    : (requestedBoss.indexOf('dwarf') >= 0 || requestedBoss.indexOf('thane') >= 0
                        ? EnemyTypes[6]
                        : (requestedBoss.indexOf('goblin') >= 0 ? EnemyTypes[2] : EnemyTypes[7]))));
            var bossTemplateHpMult = bossTpl === EnemyTypes[2] ? 8 : (bossTpl === EnemyTypes[6] ? 3 : 1);
            var bossTemplateDamageMult = bossTpl === EnemyTypes[2] || bossTpl === EnemyTypes[6] ? 2 : 1;
            var bossFloorScale = 1.0 + Math.min(Math.max(1, Number(this.floorIndex) || 1), 30) * 0.15;
            var bossDifficultyScale = { easy: { hp: 0.6, dmg: 0.5, speed: 0.8 }, normal: { hp: 1.0, dmg: 1.0, speed: 1.0 }, hard: { hp: 1.5, dmg: 1.5, speed: 1.15 }, nightmare: { hp: 2.5, dmg: 2.0, speed: 1.3 } }[st.difficulty] || { hp: 1.0, dmg: 1.0, speed: 1.0 };
            var bossHp = Math.round(bossTpl.hp * bossTemplateHpMult * bossFloorScale * bossDifficultyScale.hp);
            var bossDamage = bossTpl.dmg * bossTemplateDamageMult * bossFloorScale * bossDifficultyScale.dmg;
            st.enemies.push({
                id: 'boss_' + Date.now(),
                name: this.currentMission.bossType || bossTpl.name,
                emoji: bossTpl.emoji,
                bossArchetype: missionBossProfile ? missionBossProfile.archetype : null,
                type: 'boss',
                bloodColor: bossTpl.blood || 'red',
                ranged: !!bossTpl.ranged,
                summoner: !!bossTpl.summoner,
                armored: !!bossTpl.armored,
                x: pos.x,
                y: pos.y,
                z: pos.z,
                vx: 0,
                vy: 0,
                vz: 0,
                spawnX: pos.x,
                spawnZ: pos.z,
                radius: 1.05,
                angle: 0,
                maxHp: bossHp,
                hp: bossHp,
                dmg: bossDamage,
                speed: (missionBossProfile ? bossTpl.speed : 2.2) * bossDifficultyScale.speed,
                state: 'idle',
                flash: 0,
                knockdownTimer: 0,
                staggerTimer: 0,
                isDead: false,
                attackCooldown: 0,
                dodgeCooldown: 0,
                dodgeTime: 0,
                fleeTimer: 0,
                fleeCooldown: 0,
                telegraphTimer: 0,
                telegraph: null,
                pendingAttack: null
            });
            this.syncCompatibilityViews();
        }
    };

    GraveGainGame.prototype.triggerMeleeSwing = function () {
        var hits = this.engine.triggerMeleeSwing();
        if (hits > 0) this.audio.play('hit');
        this.syncCompatibilityViews();
        return hits;
    };

    GraveGainGame.prototype.cycleWeapon = function (direction) {
        var st = this.engine.getState();
        var weapons = st.player && st.player.weaponCollection ? st.player.weaponCollection : ['relic-bolt'];
        if (!weapons.length) return null;
        var current = Math.max(0, weapons.indexOf(st.player.weaponId));
        var next = (current + (direction < 0 ? -1 : 1) + weapons.length) % weapons.length;
        var selected = this.engine.setWeapon(weapons[next]);
        if (selected) {
            this.currentWeaponIndex = next;
            this.audio.play('block');
            this.updateHUD();
            this.renderMobileDrawer();
        }
        return selected;
    };

    GraveGainGame.prototype.showGoldPickupPopup = function (amount) {
        var value = Math.max(0, Math.round(Number(amount) || 0));
        var popup = document.getElementById('hudGoldPopup');
        if (!popup || value <= 0) return;
        popup.textContent = '+' + value.toLocaleString() + ' GOLD';
        popup.classList.remove('hidden', 'gold-popup-rise');
        void popup.offsetWidth;
        popup.classList.add('gold-popup-rise');
        if (this.goldPopupTimeout) clearTimeout(this.goldPopupTimeout);
        var self = this;
        this.goldPopupTimeout = setTimeout(function () {
            popup.classList.add('hidden');
            popup.classList.remove('gold-popup-rise');
            self.goldPopupTimeout = null;
        }, 900);
    };

    GraveGainGame.prototype.showRunNotice = function (message, tone) {
        var notice = document.getElementById('runLootNotice');
        if (!notice) return;
        notice.textContent = message;
        notice.className = 'run-loot-notice' + (tone ? ' ' + tone : '');
        clearTimeout(this.runLootNoticeTimer);
        var self = this;
        this.runLootNoticeTimer = setTimeout(function () { notice.classList.add('hidden'); }, 2800);
    };

    GraveGainGame.prototype.openRelicDraft = function (levelsGained) {
        this.relicDraftQueue += Math.max(1, Number(levelsGained) || 1);
        if (this.relicDraftQueue !== Math.max(1, Number(levelsGained) || 1)) return;
        this.relicDraftRerolled = false;
        this.relicDraftPreviousOfferIds = [];
        var screen = document.getElementById('relicDraftScreen');
        if (!screen || !this.player) return;
        this.loop.stop();
        this.engine.setPaused(true, 'relic-draft');
        this.renderRelicDraft();
        screen.classList.remove('hidden');
        var firstChoice = document.querySelector('#relicCardGrid button');
        if (firstChoice) firstChoice.focus();
    };

    GraveGainGame.prototype.renderRelicDraft = function () {
        var grid = document.getElementById('relicCardGrid');
        var level = document.getElementById('relicDraftLevel');
        var subtitle = document.getElementById('relicDraftSubtitle');
        var list = document.getElementById('runRelicList');
        if (!grid) return;
        if (level) level.textContent = this.player ? this.player.level : '—';
        if (subtitle) subtitle.textContent = this.relicDraftQueue > 1
            ? 'Several levels were earned at once. Choose a relic for this level; ' + (this.relicDraftQueue - 1) + ' choice' + (this.relicDraftQueue === 2 ? '' : 's') + ' remain.'
            : 'The catacombs offer power. Choose one relic to shape this run.';
        var shardCount = this.accountStash ? this.accountStash.shards.length : 0;
        var rerollStatus = document.getElementById('relicRerollStatus');
        var rerollButton = document.getElementById('btnRerollRelics');
        if (rerollStatus) rerollStatus.textContent = 'Rift Shards: ' + shardCount + (this.relicDraftRerolled ? ' · Reroll used for this choice' : '');
        if (rerollButton) rerollButton.disabled = shardCount < 1 || this.relicDraftRerolled;
        if (list) list.textContent = this.runRelics.length ? this.runRelics.join('  ·  ') : 'No relics yet';
        var pool = RunRelics.filter(function (relic) {
            if (relic.id === 'iron-heart') return (this.player.maxHp || 100) < 260;
            if (relic.id === 'gravewind') return (this.player.speed || 1) < 11;
            if (relic.id === 'hunters-mark') return (this.player.bossDamageMultiplier || 1) < 2.2;
            return true;
        }, this);
        if (this.relicDraftRerolled && this.relicDraftPreviousOfferIds.length) {
            var freshPool = pool.filter(function (relic) { return this.relicDraftPreviousOfferIds.indexOf(relic.id) < 0; }, this);
            if (freshPool.length >= 3) pool = freshPool;
            else if (freshPool.length) pool = freshPool.concat(pool.filter(function (relic) { return this.relicDraftPreviousOfferIds.indexOf(relic.id) >= 0; }, this));
        }
        for (var i = pool.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var swap = pool[i]; pool[i] = pool[j]; pool[j] = swap;
        }
        this.offeredRelics = pool.slice(0, 3);
        grid.innerHTML = this.offeredRelics.map(function (relic, index) {
            return '<button type="button" class="relic-card relic-' + relic.rarity.toLowerCase() + '" data-relic-index="' + index + '">' +
                '<span class="relic-card-top"><span class="relic-icon">' + relic.icon + '</span><span class="relic-rarity">' + relic.rarity + ' RELIC</span></span>' +
                '<strong>' + relic.name + '</strong><span class="relic-description">' + relic.description + '</span><span class="relic-select">CHOOSE THIS RELIC →</span></button>';
        }).join('');
        var self = this;
        grid.querySelectorAll('[data-relic-index]').forEach(function (button) {
            button.addEventListener('click', function () { self.chooseRelic(Number(button.dataset.relicIndex)); });
        });
    };

    GraveGainGame.prototype.rerollRelics = function () {
        if (!this.relicDraftQueue || this.relicDraftRerolled || !this.accountStash || !this.accountStash.shards.length) return;
        var spentShard = this.accountStash.shards.pop();
        if (spentShard && this.accountStash.consumedShards.indexOf(spentShard) < 0) this.accountStash.consumedShards.push(spentShard);
        this.accountStash.consumedShards = this.accountStash.consumedShards.slice(-1000);
        this.relicDraftRerolled = true;
        this.relicDraftPreviousOfferIds = this.offeredRelics.map(function (relic) { return relic.id; });
        this.saveAccountStash();
        this.renderAccountStash();
        this.renderRelicDraft();
        var firstChoice = document.querySelector('#relicCardGrid button');
        if (firstChoice) firstChoice.focus();
        this.audio.play('ability');
    };

    GraveGainGame.prototype.chooseRelic = function (index) {
        var relic = this.offeredRelics[index];
        if (!relic || !this.player) return;
        relic.apply(this.engine.getState().player);
        this.runRelics.push(relic.icon + ' ' + relic.name);
        this.recordCareerProgress('relics', 1);
        this.audio.play('loot');
        this.relicDraftPreviousOfferIds = [];
        this.relicDraftQueue = Math.max(0, this.relicDraftQueue - 1);
        if (this.relicDraftQueue > 0) {
            this.relicDraftRerolled = false;
            this.renderRelicDraft();
            var firstChoice = document.querySelector('#relicCardGrid button');
            if (firstChoice) firstChoice.focus();
            return;
        }
        document.getElementById('relicDraftScreen').classList.add('hidden');
        this.engine.setPaused(false, 'pause');
        this.loop.start();
        this.updateHUD();
    };

    GraveGainGame.prototype.dealAoEDamage = function (pxX, pxY, radiusPx, dmg) {
        var st = this.engine.getState();
        var py = st.player ? st.player.y : 0;
        this.engine.dealAoEDamage3D(pxX * M_PER_PX, py, pxY * M_PER_PX, radiusPx * M_PER_PX, dmg, 'ability');
        this.syncCompatibilityViews();
    };

    GraveGainGame.prototype.nearestEnemy = function (maxDistPx) {
        if (!this.player) return null;
        var maxD = typeof maxDistPx === 'number' ? maxDistPx : Infinity;
        var best = null;
        for (var i = 0; i < this.enemies.length; i++) {
            var e = this.enemies[i];
            if (!e || e.isDead || e.hp <= 0) continue;
            var d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
            if (d < maxD) { maxD = d; best = e; }
        }
        return best;
    };

    GraveGainGame.prototype.updateAutoTarget = function (state) {
        if (!state || !state.player) return;
        var enemies = state.enemies || [];
        var terrain = this.engine.getTerrain();
        var best = null;
        var bestDistance = 22;
        enemies.forEach(function (enemy) {
            if (!enemy) return;
            enemy.autoTargeted = false;
            if (enemy.isDead || enemy.hp <= 0 || enemy.ambushHidden) return;
            if (terrain) {
                var grid = terrain.worldToGrid(enemy.x, enemy.z);
                var cell = terrain.getCell(grid.gx, grid.gz);
                if (!cell || !cell.visible) return;
            }
            var distance = Math.hypot(enemy.x - state.player.x, enemy.z - state.player.z);
            if (distance < bestDistance) { best = enemy; bestDistance = distance; }
        });
        if (!this.input.autoTarget || !best) return;
        best.autoTargeted = true;
        state.player.angle = Math.atan2(best.z - state.player.z, best.x - state.player.x);
        this.engine.setInputState({ aimX: best.x, aimZ: best.z });
    };

    GraveGainGame.prototype.activateBlock = function () {
        var ep = this.engine.getState().player;
        if (!ep || ep.blockCooldown > 0) return false;
        ep.perfectBlockWindow = 0.22;
        ep.blockCooldown = 0.45;
        this.audio.play('block');
        if (this.player) this.vfx.spawnPerfectBlockVFX(this.player.x, this.player.y);
        return true;
    };

    GraveGainGame.prototype.tryInteract = function () {
        var res = this.engine.interactNearest();
        if (res) {
            this.audio.play('loot');
            return true;
        }
        return false;
    };

    GraveGainGame.prototype.executeTurnAction = function (action) {
        var res = this.engine.executeTurnAction(action);
        this.syncCompatibilityViews();
        this.updateStoryBossPhase();
        var counter = document.getElementById('hudTurnCounter');
        if (counter) counter.textContent = 'Turn ' + this.engine.getState().turnCount;
        var phase = document.getElementById('hudTurnPhase');
        if (phase) {
            var phaseText = {
                blocked: '🧱 Blocked - pick another way', guarded: '🛡️ Guarding this turn',
                'block-cooldown': '🛡️ Guard cooling down', 'attack-fired': '🔫 Weapon fired',
                'attack-cooldown': '⏳ Weapon recharging', interacted: '✋ Interaction complete',
                nothing: '✋ Nothing in reach', ability: '✦ Ability cast'
            };
            phase.textContent = phaseText[res] || 'YOUR TURN';
        }
        this.updateHUD();
        return res;
    };

    GraveGainGame.prototype.activateCampaignBossPhase = function (boss, phase, conduits) {
        var state = this.engine.getState();
        var existingIds = state.enemies.map(function (enemy) { return enemy.id; });
        var result = this.engine.activateBossPhase(boss.id, phase.name, phase.adds, conduits) || { spawned: 0, conduits: 0 };
        var objective = this.getSecondaryObjective();
        if (objective && objective.id === 'gauntlet_waves') {
            var ids = state.enemies.filter(function (enemy) {
                return enemy.type !== 'boss' && existingIds.indexOf(enemy.id) < 0;
            }).map(function (enemy) { return enemy.id; });
            this._campaignActiveWaves = this._campaignActiveWaves || [];
            this._campaignActiveWaves.push({ enemyIds: ids, cleared: ids.length === 0 });
            if (!ids.length) this.completeCampaignWave();
        }
        return result;
    };

    GraveGainGame.prototype.completeCampaignWave = function () {
        var objective = this.getSecondaryObjective();
        if (!objective || objective.id !== 'gauntlet_waves' || objective.rewardGranted || objective.current >= objective.count) return;
        objective.current = Math.min(objective.count, (Number(objective.current) || 0) + 1);
        this.showRunNotice('GAUNTLET WAVE CLEARED · ' + objective.current + '/' + objective.count, 'legendary');
        this.updateMissionUI();
        if (objective.current >= objective.count) this.completeSecondaryObjective();
        else this.scheduleStateSave();
    };

    GraveGainGame.prototype.trackCampaignWaveKill = function (enemy) {
        if (!enemy || !this._campaignActiveWaves || !this._campaignActiveWaves.length) return;
        var objective = this.getSecondaryObjective();
        if (!objective || objective.id !== 'gauntlet_waves' || objective.rewardGranted) return;
        this._campaignActiveWaves.forEach(function (wave) {
            if (!wave || wave.cleared) return;
            var index = wave.enemyIds.indexOf(enemy.id);
            if (index < 0) return;
            wave.enemyIds.splice(index, 1);
            if (!wave.enemyIds.length) {
                wave.cleared = true;
                this.completeCampaignWave();
            }
        }, this);
    };

    GraveGainGame.prototype.updateStoryBossPhase = function () {
        var phases = this.currentMission && this.currentMission.bossPhases;
        if (!Array.isArray(phases) || phases.length < 2) return;
        var state = this.engine.getState();
        var boss = state.enemies.find(function (enemy) { return enemy.type === 'boss' && !enemy.isDead && enemy.hp > 0; });
        if (!boss) return;
        if (this.storyBossPhaseIndex < 0) {
            this.storyBossPhaseIndex = 0;
            var initialPhase = phases[0] || {};
            var phaseConduits = Number(this.currentMission._campaign && this.currentMission._campaign.phaseConduits) || 0;
            var initialResult = this.activateCampaignBossPhase(boss, initialPhase, phaseConduits);
            this.showRunNotice(String(initialPhase.name || 'PHASE I') + ' · ARRAY SHIELD' + (initialResult.conduits > 0 ? ' · OVERLOAD CONDUIT TO EXPOSE BOSS' : '') + ' · ' + initialResult.spawned + ' GUARDIANS · ' + initialResult.conduits + ' CONDUITS', 'legendary');
            this.updateMissionUI();
            return;
        }
        var nextIndex = this.storyBossPhaseIndex + 1;
        if (nextIndex >= phases.length) return;
        var threshold = (phases.length - nextIndex) / phases.length;
        if (boss.hp / Math.max(1, boss.maxHp) > threshold) return;
        var phase = phases[nextIndex] || {};
        var phaseConduits = Number(this.currentMission._campaign && this.currentMission._campaign.phaseConduits) || 0;
        var result = this.activateCampaignBossPhase(boss, phase, phaseConduits);
        this.storyBossPhaseIndex = nextIndex;
        this.showRunNotice(String(phase.name || ('PHASE ' + (nextIndex + 1))) + ' · ARRAY SHIELD' + (result.conduits > 0 ? ' · OVERLOAD CONDUIT TO EXPOSE BOSS' : '') + ' · ' + result.spawned + ' GUARDIANS · ' + result.conduits + ' CONDUITS', 'legendary');
        this.audio.play('block');
    };

    GraveGainGame.prototype.update = function (dt) {
        if (!this.player) return;
        if (this.isDialogueActive) return;
        this.input.pollGamepad();

        var st = this.engine.getState();
        this.updateSpeedrunHud();
        this.updateDpsHud();
        this.updateAutoTarget(st);
        if (this.minimap) this.minimap.update(dt, !this.currentMission);
        if (this.controlMode === 'turnbased') {
            var keys = this.input.keys;
            var joystickAction = this.input.joystick.pendingTurnMove;
            this.input.joystick.pendingTurnMove = null;
            var stick = this.input.joystick;
            if (!joystickAction && stick.active && !stick.turnMoveFired && Math.max(Math.abs(stick.x), Math.abs(stick.y)) >= 0.28) {
                if (Math.abs(stick.x) > Math.abs(stick.y)) joystickAction = stick.x < 0 ? 'left' : 'right';
                else joystickAction = stick.y < 0 ? 'up' : 'down';
                stick.turnMoveFired = true;
            }
            var action = keys['KeyW'] || keys['ArrowUp'] ? 'up' :
                keys['KeyS'] || keys['ArrowDown'] ? 'down' :
                keys['KeyA'] || keys['ArrowLeft'] ? 'left' :
                keys['KeyD'] || keys['ArrowRight'] ? 'right' :
                keys['Space'] ? 'wait' :
                this.input.mouse.rightClick ? 'block' :
                this.input.mouse.click ? 'attack' :
                this.input.interactPressed || keys['KeyE'] ? 'interact' :
                keys['KeyF'] ? 'ability' : joystickAction || this.input.gamepad.turnAction;
            if (action) {
                ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE', 'KeyF'].forEach(function (k) { keys[k] = false; });
                this.input.mouse.click = false;
                this.input.mouse.rightClick = false;
                this.input.interactPressed = false;
                this.input.gamepad.turnAction = null;
                if (action === 'ability' && !this.player.triggerAbility()) {
                    this.updateHUD();
                    return;
                }
                if (action === 'block') this.audio.play('block');
                this.executeTurnAction(action);
            }
            return;
        }

        if (this.input.keys['KeyF']) {
            this.input.keys['KeyF'] = false;
            this.player.triggerAbility();
        }
        if (this.input.mouse.rightClick || this.input.gamepad.block) this.activateBlock();

        this.engine.step(dt);
        this.updateSpeedrunHud();
        this.vfx.update(dt);
        this.syncCompatibilityViews();
        this.updateStoryBossPhase();

        if (this.controlMode === 'chrono') {
            var badge = document.getElementById('chronoStatusBadge');
            if (badge) {
                badge.textContent = st.chronoScale > 0.25 ? ('TIME FLOWING ' + Math.round(st.chronoScale * 100) + '%') : 'TIME FROZEN';
            }
        }

        // Check safespace floor exit
        var terrain = this.engine.getTerrain();
        if (terrain && terrain.safespaceRoom && st.player) {
            var safeW = terrain.gridToWorld(terrain.safespaceRoom.cx, terrain.safespaceRoom.cz);
            if (Math.hypot(st.player.x - safeW.x, st.player.z - safeW.z) < 1.6 && !this.currentMission) {
                var remainingBoss = st.enemies.find(function (enemy) { return enemy.type === 'boss' && !enemy.isDead && enemy.hp > 0; });
                if (remainingBoss) {
                    var tracker = document.getElementById('missionTracker');
                    var objective = document.getElementById('missionObjectiveText');
                    if (tracker && objective) {
                        tracker.classList.remove('hidden');
                        objective.textContent = '⚠️ Defeat ' + remainingBoss.name + ' to unlock the descent';
                    }
                } else {
                    this.floorIndex++;
                    this.recordCareerProgress('bestFloor', this.floorIndex);
                    this.buildDungeonLayer();
                }
            }
        }

        if (st.player && st.player.isDead) {
            if (this.tryRevivePlayer(st.player)) return;
            this.gameOver(false);
            return;
        }

        this.updateHUD();
    };

    GraveGainGame.prototype.render = function () {
        this.engine.renderFrame();
    };

    GraveGainGame.prototype.togglePause = function () {
        var gm = document.getElementById('gameMain');
        if (!this.player || (gm && gm.classList.contains('hidden'))) return;
        if (this.relicDraftQueue > 0) return;
        if (this.loop.isPaused) {
            document.getElementById('pauseScreen').classList.add('hidden');
            this.engine.setPaused(false, 'pause');
            this.loop.start();
            document.getElementById('btnPause').focus();
        } else {
            this.loop.stop();
            this.engine.setPaused(true, 'pause');
            document.getElementById('pauseScreen').classList.remove('hidden');
            document.getElementById('pauseTitle').focus();
        }
    };

    GraveGainGame.prototype.setControlMode = function (mode) {
        this.controlMode = ['realtime', 'chrono', 'turnbased'].indexOf(mode) >= 0 ? mode : 'realtime';
        if (this.controlMode !== 'turnbased' && this.input && this.input.joystick) this.input.joystick.pendingTurnMove = null;
        this.engine.setTemporalMode(this.controlMode);
        this.chronoScale = this.controlMode === 'chrono' ? 0.04 : 1;
        var self = this;
        document.querySelectorAll('.btn-mode').forEach(function (btn) {
            var selected = btn.dataset.mode === self.controlMode;
            btn.classList.toggle('active', selected);
            btn.setAttribute('aria-pressed', String(selected));
        });
        document.querySelectorAll('.char-mode-card').forEach(function (btn) {
            var selected = btn.dataset.mode === self.controlMode;
            btn.classList.toggle('selected', selected);
            btn.setAttribute('aria-pressed', String(selected));
        });
        var sg = document.getElementById('speedSelectorGroup');
        var cg = document.getElementById('chronoDisplayGroup');
        var tg = document.getElementById('turnDisplayGroup');
        var mw = document.getElementById('mobileWaitBtn');
        var md = document.getElementById('mobileDodgeBtn');
        if (sg) sg.classList.toggle('hidden', this.controlMode !== 'realtime');
        if (cg) cg.classList.toggle('hidden', this.controlMode !== 'chrono');
        if (tg) tg.classList.toggle('hidden', this.controlMode !== 'turnbased');
        if (mw) mw.classList.toggle('hidden', this.controlMode !== 'turnbased');
        if (md) md.classList.toggle('hidden', this.controlMode === 'turnbased');
        this.turnCount = 1;
        var counter = document.getElementById('hudTurnCounter');
        if (counter) counter.textContent = 'Turn 1';
    };

    GraveGainGame.prototype.setGameSpeed = function (speed) {
        this.gameSpeed = this.engine.setGameSpeed(speed);
        var self = this;
        document.querySelectorAll('.btn-speed').forEach(function (btn) {
            var selected = Number(btn.dataset.speed) === self.gameSpeed;
            btn.classList.toggle('active', selected);
            btn.setAttribute('aria-pressed', String(selected));
        });
    };

    GraveGainGame.prototype.getDifficultyProfile = function () {
        return {
            easy: { hp: 0.6, damage: 0.5, speed: 0.8, xp: 0.75, loot: 1.5 },
            normal: { hp: 1, damage: 1, speed: 1, xp: 1, loot: 1 },
            hard: { hp: 1.5, damage: 1.5, speed: 1.15, xp: 1.5, loot: 0.8 },
            nightmare: { hp: 2.5, damage: 2, speed: 1.3, xp: 2.5, loot: 0.6 }
        }[this.difficultyMultiplierSetting] || { hp: 1, damage: 1, xp: 1, loot: 1 };
    };

    GraveGainGame.prototype.getScaledRewards = function (gold, xp) {
        var d = this.getDifficultyProfile();
        var player = this.engine.getState().player || {};
        return {
            gold: Math.max(1, Math.round((gold || 0) * d.loot * (player.goldFindMultiplier || 1) * this.getGoldEarningsMultiplier())),
            xp: Math.max(0, Math.round((xp || 0) * d.xp * (player.xpGainMultiplier || 1) * (player.xpBoostTimer > 0 ? 1.5 : 1)))
        };
    };

    GraveGainGame.prototype.updateMissionUI = function () {
        var tracker = document.getElementById('missionTracker');
        var text = document.getElementById('missionObjectiveText');
        if (!tracker || !text) return;
        if (!this.currentMission) {
            tracker.classList.add('hidden');
            return;
        }
        var objectives = this.currentMission.objectives || [];
        text.textContent = objectives.map(function (obj) { return obj.desc + ': ' + obj.current + '/' + obj.count; }).join('  •  ');
        var secondary = this.getSecondaryObjective();
        if (secondary) text.textContent += '  •  BONUS: ' + secondary.desc + ': ' + (Number(secondary.current) || 0) + '/' + secondary.count + ' (+' + (Number(secondary.rewardGold) || 0) + 'g / +' + (Number(secondary.rewardXp) || 0) + ' XP)';
        tracker.classList.remove('hidden');
    };

    GraveGainGame.prototype.updateDpsHud = function () {
        var samples = this.dpsSamples || [];
        var now = speedrunNow();
        while (samples.length && samples[0].at < now - 5000) samples.shift();
        var totalDamage = samples.reduce(function (sum, sample) { return sum + sample.damage; }, 0);
        var windowSeconds = samples.length ? Math.min(5, Math.max(1, (now - samples[0].at) / 1000)) : 0;
        var dps = windowSeconds > 0 ? totalDamage / windowSeconds : 0;
        this.runPeakDps = Math.max(Number(this.runPeakDps) || 0, dps);
        var output = document.getElementById('hudDpsText');
        if (output) output.textContent = Math.round(dps).toLocaleString();
    };

    GraveGainGame.prototype.updateHUD = function () {
        if (!this.player) return;
        var goldBoostActive = !!(this.engine && this.engine.getState().player && this.engine.getState().player.goldBoostTimer > 0);
        if (goldBoostActive !== this._goldBoostActive) {
            this._goldBoostActive = goldBoostActive;
            this.renderDailyChallenges();
        }
        var hpBar = document.getElementById('hudHpBar');
        var hpText = document.getElementById('hudHpText');
        var stBar = document.getElementById('hudStaminaBar');
        var stText = document.getElementById('hudStaminaText');
        var staminaStat = document.getElementById('hudStaminaStat');
        var hpRatio = Math.max(0, Math.min(1, this.player.hp / Math.max(1, this.player.maxHp)));
        if (hpBar) {
            var hpHue = Math.round(hpRatio * 120);
            hpBar.style.width = hpRatio * 100 + '%';
            hpBar.style.background = 'linear-gradient(90deg, hsl(' + hpHue + ', 76%, 39%), hsl(' + hpHue + ', 86%, 57%))';
            hpBar.style.boxShadow = '0 0 9px hsla(' + hpHue + ', 86%, 52%, .82)';
        }
        if (hpText) hpText.textContent = Math.round(this.player.hp) + '/' + Math.round(this.player.maxHp);
        var adrenalineBadge = document.getElementById('hudAdrenaline');
        if (adrenalineBadge) adrenalineBadge.classList.toggle('hidden', this.player.hp / Math.max(1, this.player.maxHp) > 0.3);
        if (stBar) stBar.style.width = (this.player.stamina / Math.max(1, this.player.maxStamina)) * 100 + '%';
        if (stText) stText.textContent = Math.round(this.player.stamina) + '/' + Math.round(this.player.maxStamina);
        if (staminaStat) staminaStat.classList.toggle('low-stamina', this.player.stamina / Math.max(1, this.player.maxStamina) <= 0.2);

        var resBar = document.getElementById('hudResourceBar');
        var resLabel = document.getElementById('hudResourceLabel');
        var resText = document.getElementById('hudResourceText');
        if (resBar && resLabel && resText) {
            if (this.player.race === Race.ELF) {
                resLabel.textContent = '🔮 Mana';
                resBar.style.width = (this.player.mana / this.player.maxMana) * 100 + '%';
                resText.textContent = Math.round(this.player.mana) + '/' + this.player.maxMana;
            } else if (this.player.race === Race.ORC) {
                resLabel.textContent = '🔥 Rage';
                resBar.style.width = this.player.rage + '%';
                resText.textContent = Math.round(this.player.rage) + '/100';
            } else if (this.player.race === Race.HUMAN) {
                resLabel.textContent = '🛡️ Shield';
                resBar.style.width = (this.player.shieldBubble / 20) * 100 + '%';
                resText.textContent = Math.round(this.player.shieldBubble) + '/20';
            } else {
                resLabel.textContent = '💎 Stone';
                resBar.style.width = this.player.stoneForm ? '100%' : '0%';
                resText.textContent = this.player.stoneForm ? 'IMMUNE' : 'READY';
            }
        }

        var gEl = document.getElementById('hudGoldText');
        var uEl = document.getElementById('hudUusdText');
        var fEl = document.getElementById('hudFloorText');
        var xEl = document.getElementById('hudXpText');
        var critEl = document.getElementById('hudCritText');
        var growthEl = document.getElementById('hudGrowthText');
        if (gEl) gEl.textContent = this.gold;
        if (uEl) uEl.textContent = this.uusd;
        if (fEl) fEl.textContent = 'L' + this.floorIndex + ' · Lv' + this.player.level;
        if (xEl) xEl.textContent = Math.round(this.player.xp) + ' / ' + this.player.nextLevelXp + ' XP';
        if (critEl) {
            var crit = criticalProfile(this.engine.getState().player);
            critEl.textContent = Math.round(crit.chance * 100) + '% CRIT · ' + crit.multiplier.toFixed(2) + '×';
        }
        if (growthEl) {
            var combatPlayer = this.engine.getState().player;
            growthEl.textContent = 'WARD +' + Math.round((combatPlayer.levelDamageReduction || 0) * 100) + '% · HEAL +' + Math.round(((combatPlayer.healingEfficiency || 1) - 1) * 100) + '%';
        }
        var revivalStat = document.getElementById('hudRevivalStat');
        var revivalText = document.getElementById('hudRevivalText');
        var secondWindText = document.getElementById('hudSecondWindText');
        if (secondWindText) secondWindText.textContent = this.player.secondWindUsed ? 'SPENT' : 'READY';
        var bloodlustText = document.getElementById('hudBloodlustText');
        if (bloodlustText) {
            var bloodlustStacks = Array.isArray(this.player.bloodlust) ? this.player.bloodlust : [];
            var bloodlustRemaining = bloodlustStacks.length ? Math.min.apply(null, bloodlustStacks) : 0;
            bloodlustText.textContent = bloodlustStacks.length
                ? '×' + (1 + bloodlustStacks.length * 0.1).toFixed(1) + ' · ' + Math.ceil(bloodlustRemaining) + 's'
                : '0 STACKS';
        }
        var effectStrip = document.getElementById('hudEffectStrip');
        if (effectStrip) {
            var combatStatePlayer = this.engine.getState().player;
            var activeEffects = [];
            var activeBloodlust = Array.isArray(combatStatePlayer.bloodlust) ? combatStatePlayer.bloodlust : [];
            if (combatStatePlayer.adrenalineActive) activeEffects.push({ id: 'adrenaline', icon: '💢', text: 'ADRENALINE', kind: 'buff', title: '+20% attack damage and movement speed' });
            if (activeBloodlust.length) activeEffects.push({ id: 'bloodlust', icon: '🩸', text: 'BLOODLUST ×' + activeBloodlust.length + ' · ' + Math.ceil(Math.min.apply(null, activeBloodlust)) + 's', kind: 'buff', title: 'Attack speed increased while the kill streak lasts' });
            if (combatStatePlayer.stoneForm) activeEffects.push({ id: 'stone', icon: '🪨', text: 'STONE FORM · ' + Math.ceil(combatStatePlayer.stoneDuration) + 's', kind: 'buff', title: 'Damage immunity during Stone Form' });
            if (combatStatePlayer.shieldBubble > 0.5) activeEffects.push({ id: 'shield', icon: '🛡️', text: 'SHIELD · ' + Math.ceil(combatStatePlayer.shieldBubble), kind: 'buff', title: 'Shield absorbs incoming damage' });
            if (combatStatePlayer.speedBoostTimer > 0) activeEffects.push({ id: 'speed-pickup', icon: '💨', text: 'WRAITHSTEP · ' + Math.ceil(combatStatePlayer.speedBoostTimer) + 's', kind: 'buff', title: 'Movement speed increased by 25%' });
            if (combatStatePlayer.damageBoostTimer > 0) activeEffects.push({ id: 'damage-pickup', icon: '🔥', text: 'GRAVEFIRE · ' + Math.ceil(combatStatePlayer.damageBoostTimer) + 's', kind: 'buff', title: 'All damage increased by 25%' });
            if (combatStatePlayer.goldBoostTimer > 0) activeEffects.push({ id: 'gold-pickup', icon: '🪙', text: 'MIDAS DUST · ' + Math.ceil(combatStatePlayer.goldBoostTimer) + 's', kind: 'buff', title: 'Gold earnings increased by 50%' });
            if (combatStatePlayer.xpBoostTimer > 0) activeEffects.push({ id: 'xp-pickup', icon: '✨', text: 'MEMORY SIGIL · ' + Math.ceil(combatStatePlayer.xpBoostTimer) + 's', kind: 'buff', title: 'XP earnings increased by 50%' });
            if (combatStatePlayer.race === 'orc' && combatStatePlayer.rage > 0) activeEffects.push({ id: 'rage', icon: '🩸', text: 'RAGE · ' + Math.floor(combatStatePlayer.rage) + '%', kind: 'buff', title: 'Build rage through combat and unleash a Rage Burst' });
            if (Number(combatStatePlayer.suppressionTier) > 0) activeEffects.push({ id: 'suppression', icon: '🎯', text: 'SUPPRESSED', kind: 'debuff', title: 'Incoming fire is suppressing movement and aim' });
            if (combatStatePlayer.inCover) activeEffects.push({ id: 'cover', icon: '🧱', text: 'IN COVER', kind: 'buff', title: 'Cover mitigates incoming fire' });
            var effectSignature = activeEffects.map(function (effect) { return effect.id + ':' + effect.text; }).join('|');
            if (effectStrip.dataset.signature !== effectSignature) {
                effectStrip.dataset.signature = effectSignature;
                effectStrip.textContent = '';
                effectStrip.classList.toggle('hidden', activeEffects.length === 0);
                activeEffects.forEach(function (effect) {
                    var badge = document.createElement('span');
                    badge.className = 'hud-effect-icon ' + effect.kind;
                    badge.textContent = effect.icon + ' ' + effect.text;
                    badge.title = effect.title;
                    effectStrip.appendChild(badge);
                });
            }
        }
        var hasPhoenixProtocol = this.careerProgression && this.careerProgression.passiveNodes.indexOf('phoenix_protocol') >= 0;
        if (revivalStat) revivalStat.classList.toggle('hidden', !hasPhoenixProtocol);
        if (revivalText) revivalText.textContent = this.runRevivalTokens > 0 ? 'READY' : 'SPENT';
        var weapon = this.engine.getWeapon();
        var weaponText = document.getElementById('hudWeaponText');
        var weaponMeta = document.getElementById('hudWeaponMeta');
        var weaponButton = document.getElementById('btnCycleWeapon');
        var collection = this.engine.getState().player.weaponCollection || ['relic-bolt'];
        if (weaponText) weaponText.textContent = (weapon.icon || '🔫') + ' ' + weapon.name;
        if (weaponMeta) weaponMeta.textContent = weapon.rarity + ' · ' + weapon.damage + ' DMG · ' + collection.length + '/20';
        if (weaponButton) weaponButton.setAttribute('aria-label', 'Current weapon: ' + weapon.name + '. Switch weapons with Q.');
    };

    GraveGainGame.prototype.loadState = function () {
        var saved = SaveSystem.load();
        if (saved) {
            this.gold = Math.max(0, Number(saved.gold) || 0);
            this.goldInterestCarry = Math.max(0, Math.min(0.999999, Number(saved.goldInterestCarry) || 0));
            this.goldInterestElapsedMs = Math.max(0, Math.min(29999, Number(saved.goldInterestElapsedMs) || 0));
            this.uusd = Math.max(0, Number(saved.uusd) || 0);
            this.quartersLevel = Math.min(QuartersUpgrades.length, Math.max(1, Math.floor(Number(saved.quartersLevel) || 1)));
            this.prestige = Math.max(0, Math.min(5, Math.floor(Number(saved.prestige) || 0)));
            this.dailyChallengeDate = typeof saved.dailyChallengeDate === 'string' ? saved.dailyChallengeDate : null;
            this.dailyChallenges = Array.isArray(saved.dailyChallenges) ? saved.dailyChallenges : null;
            if (Array.isArray(saved.botanyCrops)) {
                this.botanyCrops = saved.botanyCrops.slice(0, this.getBotanySlotLimit()).map(function (crop) {
                    var seed = BotanySeeds.find(function (item) { return item.id === (crop && crop.seedId); });
                    return seed ? { seedId: seed.id, startTime: Math.max(0, Number(crop.startTime) || 0), growthTime: seed.time, capacity: seed.space } : { seedId: null, startTime: 0, growthTime: 0, capacity: 0 };
                });
            }
            if (saved.settings) {
                this.difficultyMultiplierSetting = saved.settings.difficulty || 'normal';
                this.audio.masterVolume = Number.isFinite(saved.settings.volume) ? saved.settings.volume : 0.8;
                this.audio.muted = !!saved.settings.muted;
                this.autoPickupRange = saved.settings.pickupRange || 100;
                this.engine.setLootMagnetRange(this.autoPickupRange);
                this.controlMode = saved.settings.controlMode || 'realtime';
                this.gameSpeed = saved.settings.gameSpeed || 1;
                this.speedrunMode = saved.settings.speedrunMode === true;
                this.cameraShakeEnabled = saved.settings.cameraShake !== false;
                this.cameraLeadEnabled = saved.settings.cameraLead !== false;
                this.cameraPunchEnabled = saved.settings.cameraPunch !== false;
                var sd = document.getElementById('settingsDifficulty'); if (sd) sd.value = this.difficultyMultiplierSetting;
                var mv = document.getElementById('settingsMasterVol'); if (mv) mv.value = Math.round(this.audio.masterVolume * 100);
                var pr = document.getElementById('settingsPickupRange'); if (pr) pr.value = this.autoPickupRange;
                var sr = document.getElementById('settingsSpeedrunMode'); if (sr) sr.checked = this.speedrunMode;
                var shake = document.getElementById('settingsCameraShake'); if (shake) shake.checked = this.cameraShakeEnabled;
                var lead = document.getElementById('settingsCameraLead'); if (lead) lead.checked = this.cameraLeadEnabled;
                var punch = document.getElementById('settingsCameraPunch'); if (punch) punch.checked = this.cameraPunchEnabled;
                var rig = this.engine.getCameraRig && this.engine.getCameraRig();
                if (rig) rig.setOptions({ shakeEnabled: this.cameraShakeEnabled, leadEnabled: this.cameraLeadEnabled, punchEnabled: this.cameraPunchEnabled });
                this.setGameSpeed(this.gameSpeed);
            }
        }
        this.updateHubQuartersUI();
        this.setControlMode(this.controlMode);
    };

    GraveGainGame.prototype.saveState = function () { SaveSystem.save(this); };
    GraveGainGame.prototype.scheduleStateSave = function () {
        if (this.stateSaveTimer) return;
        var self = this;
        this.stateSaveTimer = setTimeout(function () {
            self.stateSaveTimer = null;
            self.saveState();
        }, 1500);
    };
    GraveGainGame.prototype.flushStateToHost = function (reason) {
        if (this.stateSaveTimer) {
            clearTimeout(this.stateSaveTimer);
            this.stateSaveTimer = null;
        }
        this.saveState();
        if (typeof window.__fourweirdRequestSave === 'function') {
            try { window.__fourweirdRequestSave(reason || 'state-flush'); } catch (_) {}
        }
    };
    GraveGainGame.prototype.startAutoSaveTimer = function () {
        var self = this;
        setInterval(function () {
            var oldChallengeDate = self.dailyChallengeDate;
            self.generateDailyChallenges();
            if (self.dailyChallengeDate !== oldChallengeDate) self.renderDailyChallenges();
            self.saveState();
        }, 60000);
    };

    GraveGainGame.prototype.startGoldInterestTimer = function () {
        var self = this;
        this.goldInterestLastUpdateAt = Date.now();
        this.updateGoldInterestUI();
        this.goldInterestTimer = setInterval(function () { self.updateGoldInterest(); }, 1000);
    };

    GraveGainGame.prototype.updateGoldInterestUI = function () {
        var balance = byId('goldInterestBalance');
        var countdown = byId('goldInterestCountdown');
        var progress = byId('goldInterestProgress');
        var track = progress && progress.parentNode;
        var yieldLabel = byId('goldInterestYield');
        if (balance) balance.textContent = Math.floor(this.gold) + ' Gold';
        var elapsed = Math.max(0, Math.min(29999, Number(this.goldInterestElapsedMs) || 0));
        var percent = elapsed / 30000 * 100;
        if (countdown) countdown.textContent = '00:' + String(Math.ceil((30000 - elapsed) / 1000)).padStart(2, '0');
        if (progress) progress.style.width = percent + '%';
        if (track) track.setAttribute('aria-valuenow', String(Math.floor(percent)));
        if (yieldLabel) {
            var expectedYield = Math.floor((Math.max(0, Number(this.gold) || 0) * 0.01) + (Number(this.goldInterestCarry) || 0));
            yieldLabel.textContent = expectedYield > 0 ? 'Next deposit · +' + expectedYield + ' Gold' : 'Current balance · 1% per cycle';
        }
    };

    GraveGainGame.prototype.updateGoldInterest = function () {
        var now = Date.now();
        // Browsers throttle one-second timers in background tabs; catch up through a
        // short suspension without letting a long device sleep mint unlimited interest.
        var delta = Math.max(0, Math.min(300000, now - (this.goldInterestLastUpdateAt || now)));
        this.goldInterestLastUpdateAt = now;
        this.goldInterestElapsedMs = Math.max(0, Number(this.goldInterestElapsedMs) || 0) + delta;
        var interestPaid = 0;
        while (this.goldInterestElapsedMs >= 30000) {
            this.goldInterestElapsedMs -= 30000;
            this.goldInterestCarry = Math.max(0, Number(this.goldInterestCarry) || 0) + Math.max(0, Number(this.gold) || 0) * 0.01;
            var wholeGold = Math.floor(this.goldInterestCarry);
            if (wholeGold > 0) {
                this.goldInterestCarry -= wholeGold;
                var balanceBeforeInterest = this.gold;
                this.gold = Math.min(1000000000000, this.gold + wholeGold);
                interestPaid += this.gold - balanceBeforeInterest;
                if (this.gold >= 1000000000000) this.goldInterestCarry = 0;
            }
        }
        if (interestPaid > 0) {
            var player = this.engine && this.engine.getState ? this.engine.getState().player : null;
            if (player) player.gold = this.gold;
            if (byId('exchangeGoldBalance')) byId('exchangeGoldBalance').textContent = this.gold + ' Gold';
            this.updateGoldInterestUI();
            this.saveState();
            if (typeof window.__fourweirdRequestSave === 'function') {
                try { window.__fourweirdRequestSave('gold-interest-earned'); } catch (_) {}
            }
            if (this.player) this.showRunNotice('CRYPT BANK · +' + interestPaid + ' GOLD INTEREST', '');
        } else this.updateGoldInterestUI();
    };

    GraveGainGame.prototype.getSpeedrunKey = function () {
        var state = this.engine && this.engine.getState ? this.engine.getState() : {};
        var player = state.player || {};
        var route = this.currentMission ? 'mission-' + String(this.currentMission.id || 'unknown') : 'endless';
        return [route, this.difficultyMultiplierSetting || 'normal', player.race || 'human', player.classType || 'warrior'].join('-').toLowerCase();
    };

    GraveGainGame.prototype.recordSpeedrunRoomSplit = function (roomId, elapsed, floor) {
        if (roomId === null || roomId === undefined) return;
        var terrain = this.engine.getTerrain();
        var room = terrain && terrain.rooms.find(function (candidate) { return candidate.id === roomId; });
        if (!room || room.type === 'spawn') return;
        var splitFloor = Number(floor) || this.floorIndex;
        var splitKey = splitFloor + '-' + roomId;
        if (this.speedrunVisitedRooms[splitKey]) return;
        this.speedrunVisitedRooms[splitKey] = true;
        var split = { floor: splitFloor, room: roomId, elapsedMs: elapsed, segmentMs: Math.max(0, elapsed - this.speedrunLastSplitMs), type: room.type };
        this.speedrunSplits.push(split);
        this.speedrunLastSplitMs = elapsed;
        var splitText = byId('speedrunSplitText');
        if (splitText) splitText.textContent = 'L' + split.floor + ' · ROOM ' + String(split.room + 1).padStart(2, '0') + ' +' + formatSpeedrunTime(split.segmentMs);
    };

    GraveGainGame.prototype.updateSpeedrunHud = function () {
        var hud = byId('speedrunHud');
        if (!hud) return;
        if (!this.speedrunMode || !this.speedrunStartedAt) {
            hud.classList.add('hidden');
            return;
        }
        hud.classList.remove('hidden');
        var elapsed = Math.max(0, speedrunNow() - this.speedrunStartedAt);
        if (byId('speedrunTimerText')) byId('speedrunTimerText').textContent = formatSpeedrunTime(elapsed);
        var state = this.engine.getState();
        var terrain = this.engine.getTerrain();
        var player = state.player;
        if (!terrain || !player) return;
        var grid = terrain.worldToGrid(player.x, player.z);
        var cell = terrain.getCell(grid.gx, grid.gz);
        var roomId = cell && typeof cell.roomId === 'number' ? cell.roomId : null;
        if (roomId === this.speedrunLastRoomId) return;
        if (this.speedrunLastRoomId !== null) this.recordSpeedrunRoomSplit(this.speedrunLastRoomId, elapsed, this.speedrunLastRoomFloor);
        this.speedrunLastRoomId = roomId;
        if (roomId !== null) this.speedrunLastRoomFloor = this.floorIndex;
    };

    GraveGainGame.prototype.finishSpeedrun = function (victory) {
        if (!this.speedrunMode || !this.speedrunStartedAt) return null;
        var elapsed = Math.max(0, speedrunNow() - this.speedrunStartedAt);
        this.recordSpeedrunRoomSplit(this.speedrunLastRoomId, elapsed, this.speedrunLastRoomFloor);
        this.speedrunLastRoomId = null;
        var key = this.getSpeedrunKey();
        var previous = this.speedrunRecords[key] || null;
        var isPersonalBest = !!victory && (!previous || elapsed < previous.timeMs);
        if (isPersonalBest) {
            this.speedrunRecords[key] = {
                timeMs: elapsed,
                date: new Date().toISOString().slice(0, 10),
                splits: this.speedrunSplits.slice(-60).map(function (split) { return { floor: split.floor, room: split.room, elapsedMs: Math.round(split.elapsedMs), segmentMs: Math.round(split.segmentMs), type: split.type }; })
            };
            try { localStorage.setItem('GraveGain2DC_Speedrun_v1', JSON.stringify(this.speedrunRecords)); } catch (_) {}
            if (typeof window.__fourweirdRequestSave === 'function') {
                try { window.__fourweirdRequestSave('speedrun-personal-best'); } catch (_) {}
            }
        }
        return { elapsedMs: elapsed, previousBestMs: previous ? previous.timeMs : null, bestMs: isPersonalBest ? elapsed : (previous ? previous.timeMs : null), isPersonalBest: isPersonalBest, splits: this.speedrunSplits.slice() };
    };

    GraveGainGame.prototype.generateDailyChallenges = function () {
        var dateStr = new Date().toDateString();
        if (this.dailyChallengeDate === dateStr && Array.isArray(this.dailyChallenges) && this.dailyChallenges.length === 3) return;
        var hash = 0;
        for (var i = 0; i < dateStr.length; i++) hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
        var slayTarget = Math.abs(hash % 20) + 15;
        var goldTarget = Math.abs((hash >> 2) % 300) + 200;
        var depthTarget = Math.abs((hash >> 4) % 3) + 3;
        var damageTarget = Math.abs((hash >> 6) % 900) + 700;
        var streakTarget = Math.abs((hash >> 9) % 6) + 5;
        var options = [
            { type: 'slay', desc: 'Slay ' + slayTarget + ' undead creatures.', target: slayTarget, rewardGold: 75, rewardUusd: 25 },
            { type: 'gold', desc: 'Collect ' + goldTarget + ' dungeon Gold.', target: goldTarget, rewardGold: 125, rewardUusd: 50 },
            { type: 'depth', desc: 'Reach Layer ' + depthTarget + ' depth.', target: depthTarget, rewardGold: 150, rewardUusd: 75 },
            { type: 'damage', desc: 'Deal ' + damageTarget + ' damage to dungeon enemies.', target: damageTarget, rewardGold: 125, rewardUusd: 50 },
            { type: 'streak', desc: 'Reach a ' + streakTarget + '-kill streak.', target: streakTarget, rewardGold: 175, rewardUusd: 75 }
        ];
        var seed = hash >>> 0;
        for (var shuffleIndex = options.length - 1; shuffleIndex > 0; shuffleIndex--) {
            seed = (Math.imul(seed || 1, 1664525) + 1013904223) >>> 0;
            var swapIndex = seed % (shuffleIndex + 1);
            var temp = options[shuffleIndex];
            options[shuffleIndex] = options[swapIndex];
            options[swapIndex] = temp;
        }
        this.dailyChallenges = options.slice(0, 3).map(function (challenge, index) {
            var current = challenge.type === 'depth' ? 1 : 0;
            return { id: index + 1, type: challenge.type, desc: challenge.desc, target: challenge.target, current: current, carry: 0, done: current >= challenge.target, claimed: false, rewardGold: challenge.rewardGold, rewardUusd: challenge.rewardUusd };
        });
        this.dailyChallengeDate = dateStr;
        this.saveState();
    };

    GraveGainGame.prototype.renderDailyChallenges = function () {
        var el = document.getElementById('dailyChallengesList');
        if (!el || !this.dailyChallenges) return;
        var self = this;
        el.innerHTML = this.dailyChallenges.map(function (c) {
            return '<div class="daily-challenge-item"><span>' + c.desc + '<small class="daily-reward"> +' + Math.round(c.rewardGold * self.getGoldEarningsMultiplier()) + 'g / +' + c.rewardUusd + '$</small></span>' +
                (c.done && !c.claimed ? '<button type="button" class="btn-game daily-claim-btn" onclick="window.GraveGainGame.claimDailyChallenge(' + c.id + ')">Claim</button>' :
                    '<strong style="color:' + (c.done ? 'var(--grave-purple-glow)' : 'var(--grave-text)') + '">' + (c.claimed ? '✓ Claimed' : (c.current + ' / ' + c.target)) + '</strong>') + '</div>';
        }).join('');
    };

    GraveGainGame.prototype.claimDailyChallenge = function (id) {
        var c = this.dailyChallenges && this.dailyChallenges.find(function (item) { return item.id === id; });
        if (!c || !c.done || c.claimed) return;
        c.claimed = true;
        this.gold += Math.round(c.rewardGold * this.getGoldEarningsMultiplier());
        this.uusd += c.rewardUusd;
        this.audio.play('loot');
        this.renderDailyChallenges();
        this.saveState();
    };

    GraveGainGame.prototype.updateChallengeProgress = function (type, amt) {
        if (!this.dailyChallenges) return;
        var before = this.dailyChallenges.filter(function (c) { return c.done; }).length;
        var changed = false;
        var amount = Math.max(0, Number(amt) || 0);
        var legacyTypes = { 1: 'slay', 2: 'gold', 3: 'depth' };
        this.dailyChallenges.forEach(function (challenge) {
            var challengeType = challenge.type || legacyTypes[challenge.id];
            if (challengeType !== type || challenge.done || !amount) return;
            var previous = Number(challenge.current) || 0;
            var previousCarry = Number(challenge.carry) || 0;
            if (challengeType === 'damage') {
                var exactDamage = previous + Math.max(0, Number(challenge.carry) || 0) + amount;
                challenge.current = Math.min(challenge.target, Math.floor(exactDamage));
                challenge.carry = challenge.current >= challenge.target ? 0 : exactDamage - Math.floor(exactDamage);
            } else {
                var wholeAmount = Math.max(0, Math.floor(amount));
                challenge.current = challengeType === 'depth' || challengeType === 'streak'
                    ? Math.max(previous, wholeAmount)
                    : Math.min(challenge.target, previous + wholeAmount);
            }
            if (challenge.current >= challenge.target) challenge.done = true;
            if (challenge.current !== previous || (challengeType === 'damage' && challenge.carry !== previousCarry)) changed = true;
        });
        if (!changed) return;
        this.renderDailyChallenges();
        if (changed) {
            if (this.dailyChallenges.filter(function (c) { return c.done; }).length > before) this.saveState();
            else this.scheduleStateSave();
        }
    };

    GraveGainGame.prototype.setupUIListeners = function () {
        var self = this;
        var byId = function (id) { return document.getElementById(id); };
        var restoreSettingsForm = function () {
            if (byId('settingsDifficulty')) byId('settingsDifficulty').value = self.difficultyMultiplierSetting;
            if (byId('settingsMasterVol')) byId('settingsMasterVol').value = Math.round(self.audio.masterVolume * 100);
            if (byId('settingsPickupRange')) byId('settingsPickupRange').value = self.autoPickupRange;
            if (byId('settingsSpeedrunMode')) byId('settingsSpeedrunMode').checked = self.speedrunMode;
            if (byId('settingsCameraShake')) byId('settingsCameraShake').checked = self.cameraShakeEnabled;
            if (byId('settingsCameraLead')) byId('settingsCameraLead').checked = self.cameraLeadEnabled;
            if (byId('settingsCameraPunch')) byId('settingsCameraPunch').checked = self.cameraPunchEnabled;
        };

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Tab') return;
            var dialogs = Array.prototype.filter.call(
                document.querySelectorAll('.screen-overlay[role="dialog"][aria-modal="true"]'),
                function (dialog) { return !dialog.classList.contains('hidden'); }
            );
            var dialog = dialogs[dialogs.length - 1];
            if (!dialog) return;
            var focusable = Array.prototype.filter.call(dialog.querySelectorAll(
                'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
            ), function (element) { return element.getClientRects().length > 0; });
            if (!focusable.length) return;
            var activeIndex = focusable.indexOf(document.activeElement);
            if (event.shiftKey && activeIndex <= 0) {
                event.preventDefault();
                focusable[focusable.length - 1].focus();
            } else if (!event.shiftKey && activeIndex === focusable.length - 1) {
                event.preventDefault();
                focusable[0].focus();
            } else if (activeIndex < 0 && !dialog.contains(document.activeElement)) {
                event.preventDefault();
                focusable[0].focus();
            }
        }, true);

        if (byId('btnOpenCareerArchive')) byId('btnOpenCareerArchive').addEventListener('click', function () {
            self.renderCareerArchive();
            byId('careerArchiveScreen').classList.remove('hidden');
            byId('btnCloseCareerArchive').focus();
        });
        if (byId('btnOpenAscendantTalents')) byId('btnOpenAscendantTalents').addEventListener('click', function () {
            self.renderCareerTalents();
            byId('ascendantTalentsScreen').classList.remove('hidden');
            byId('btnCloseAscendantTalents').focus();
        });
        if (byId('btnPrestige')) byId('btnPrestige').addEventListener('click', function () {
            if (self.careerProgression.level < 100 || self.prestige >= 5) return;
            var nextRank = self.prestige + 1;
            if (!window.confirm('Enter Prestige ' + nextRank + '? Ascendant Level and spent talents reset. Your career archive and weapon mastery stay, and this rank adds +5% damage, +10% XP, and +10% Gold permanently.')) return;
            if (self.performPrestige()) self.audio.play('ability');
        });
        if (byId('btnCloseAscendantTalents')) byId('btnCloseAscendantTalents').addEventListener('click', function () {
            byId('ascendantTalentsScreen').classList.add('hidden');
            byId('btnOpenAscendantTalents').focus();
        });
        if (byId('careerTalentList')) byId('careerTalentList').addEventListener('click', function (event) {
            var button = event.target.closest('.career-talent-action');
            if (!button || button.disabled) return;
            var talent = CareerTalents.find(function (item) { return item.id === button.dataset.talent; });
            if (!talent || self.careerProgression.passiveNodes.indexOf(talent.id) >= 0) return;
            if (self.careerProgression.level - 1 - self.careerProgression.passiveNodes.length < 1) return;
            self.careerProgression.passiveNodes.push(talent.id);
            self.requestCareerProgressionSave('career-talent-learned');
            self.renderCareerTalents();
            self.audio.play('ability');
        });
        if (byId('btnRerollRelics')) byId('btnRerollRelics').addEventListener('click', function () { self.rerollRelics(); });
        if (byId('btnMute')) byId('btnMute').addEventListener('click', function () {
            self.audio.muted = !self.audio.muted;
            self.scheduleStateSave();
        });
        if (byId('btnCloseCareerArchive')) byId('btnCloseCareerArchive').addEventListener('click', function () {
            byId('careerArchiveScreen').classList.add('hidden');
            byId('btnOpenCareerArchive').focus();
        });
        if (byId('btnStoryMode')) byId('btnStoryMode').addEventListener('click', function () {
            byId('mainMenuScreen').classList.add('hidden');
            byId('storyMissionScreen').classList.remove('hidden');
            self.renderStoryMissionsList();
            byId('storyMissionTitle').focus();
        });
        if (byId('btnStoryBack')) byId('btnStoryBack').addEventListener('click', function () {
            byId('storyMissionScreen').classList.add('hidden');
            byId('mainMenuScreen').classList.remove('hidden');
            byId('btnStoryMode').focus();
        });
        if (byId('btnStartStoryMission')) byId('btnStartStoryMission').addEventListener('click', function () {
            if (!self.selectedStoryMissionId) return;
            byId('storyMissionScreen').classList.add('hidden');
            byId('charSelectScreen').classList.remove('hidden');
            self.renderCharSelect();
            byId('characterFlowTitle').focus();
        });
        if (byId('btnPlay')) byId('btnPlay').addEventListener('click', function () {
            self.selectedStoryMissionId = null;
            byId('mainMenuScreen').classList.add('hidden');
            byId('charSelectScreen').classList.remove('hidden');
            self.renderCharSelect();
            byId('characterFlowTitle').focus();
        });
        if (byId('btnDungeonDuel')) byId('btnDungeonDuel').addEventListener('click', function () {
            var button = byId('btnDungeonDuel');
            var status = byId('dungeonDuelStatus');
            var multiplayer = window.GraveGainMP;
            if (!multiplayer || typeof multiplayer.rematch !== 'function') {
                if (status) status.textContent = 'Matchmaking is unavailable right now.';
                return;
            }
            button.disabled = true;
            multiplayer.rematch(function (state, message) {
                if (status) status.textContent = message || '';
                if (state === 'unavailable' || state === 'signin') button.disabled = false;
            });
        });
        if (byId('btnEnterHub')) byId('btnEnterHub').addEventListener('click', function () {
            byId('mainMenuScreen').classList.add('hidden');
            byId('hubScreen').classList.remove('hidden');
            self.renderBotany();
            self.renderAccountStash();
            byId('exchangeGoldBalance').textContent = self.gold + ' Gold';
            byId('exchangeUusdBalance').textContent = self.uusd + ' $UUSD';
            self.generateRepairMiniGame();
            byId('hubTitle').focus();
        });
        if (byId('btnOpenSettings')) byId('btnOpenSettings').addEventListener('click', function () {
            restoreSettingsForm();
            byId('settingsScreen').classList.remove('hidden');
            byId('settingsTitle').focus();
        });
        if (byId('btnCancelSettings')) byId('btnCancelSettings').addEventListener('click', function () {
            restoreSettingsForm();
            byId('settingsScreen').classList.add('hidden');
            byId('btnOpenSettings').focus();
        });
        if (byId('btnSaveSettings')) byId('btnSaveSettings').addEventListener('click', function () {
            self.difficultyMultiplierSetting = byId('settingsDifficulty').value;
            self.audio.masterVolume = byId('settingsMasterVol').value / 100;
            self.autoPickupRange = parseInt(byId('settingsPickupRange').value, 10) || 100;
            self.cameraShakeEnabled = byId('settingsCameraShake').checked;
            self.cameraLeadEnabled = byId('settingsCameraLead').checked;
            self.cameraPunchEnabled = byId('settingsCameraPunch').checked;
            self.speedrunMode = byId('settingsSpeedrunMode').checked;
            self.engine.setLootMagnetRange(self.autoPickupRange);
            var rig = self.engine.getCameraRig && self.engine.getCameraRig();
            if (rig) {
                rig.setOptions({
                    shakeEnabled: self.cameraShakeEnabled,
                    leadEnabled: self.cameraLeadEnabled,
                    punchEnabled: self.cameraPunchEnabled
                });
            }
            self.saveState();
            byId('settingsScreen').classList.add('hidden');
            byId('btnOpenSettings').focus();
        });

        var showCharacterStep = function (step) {
            document.querySelectorAll('.character-step').forEach(function (panel) { panel.classList.toggle('hidden', panel.id !== step); });
            var labels = { raceStep: 'STEP 1 OF 3 · CHOOSE YOUR RACE', classStep: 'STEP 2 OF 3 · CHOOSE YOUR CLASS', modeStep: 'STEP 3 OF 3 · SET YOUR SIMULATION' };
            var pr = document.querySelector('.character-flow-progress');
            if (pr) pr.textContent = labels[step];
            var activePanel = byId(step);
            var firstChoice = activePanel && activePanel.querySelector('button:not(:disabled)');
            if (firstChoice) firstChoice.focus();
        };
        if (byId('btnRaceBack')) byId('btnRaceBack').addEventListener('click', function () {
            byId('charSelectScreen').classList.add('hidden');
            byId('mainMenuScreen').classList.remove('hidden');
            byId(self.selectedStoryMissionId ? 'btnStoryMode' : 'btnPlay').focus();
        });
        if (byId('btnRaceNext')) byId('btnRaceNext').addEventListener('click', function () {
            var race = document.querySelector('.char-card.selected')?.dataset.race || Race.HUMAN;
            var raceData = RaceData[race];
            byId('selectedRaceSummary').textContent = raceData.emoji + ' ' + raceData.name + ' selected · Now choose your combat role.';
            showCharacterStep('classStep');
        });
        if (byId('btnClassBack')) byId('btnClassBack').addEventListener('click', function () { showCharacterStep('raceStep'); });
        if (byId('btnClassNext')) byId('btnClassNext').addEventListener('click', function () {
            var race = document.querySelector('.char-card.selected')?.dataset.race || Race.HUMAN;
            var classType = document.querySelector('.class-btn.selected')?.dataset.class || ClassType.WARRIOR;
            byId('selectedBuildSummary').textContent = RaceData[race].emoji + ' ' + RaceData[race].name + ' · ' + ClassTitles[classType][race] + ': ' + ClassData[classType].description + ' Choose how time behaves in your run.';
            showCharacterStep('modeStep');
        });
        if (byId('btnModeBack')) byId('btnModeBack').addEventListener('click', function () { showCharacterStep('classStep'); });
        if (byId('btnCharSelectStart')) byId('btnCharSelectStart').addEventListener('click', function () {
            var selRace = document.querySelector('.char-card.selected')?.dataset.race || Race.HUMAN;
            var selClass = document.querySelector('.class-btn.selected')?.dataset.class || ClassType.WARRIOR;
            var selMode = document.querySelector('.char-mode-card.selected')?.dataset.mode || self.controlMode;
            var loadout = byId('startingWeaponSelect');
            var allowedWeapons = self.getDiscoveredStartingWeapons();
            var chosenWeapon = loadout && allowedWeapons.some(function (weapon) { return weapon.id === loadout.value; }) ? loadout.value : 'relic-bolt';
            try { localStorage.setItem('GraveGain2DC_StartingWeapon_v1', chosenWeapon); } catch (_) {}
            if (typeof window.__fourweirdRequestSave === 'function') window.__fourweirdRequestSave('loadout-selected');
            self.setControlMode(selMode);
            byId('charSelectScreen').classList.add('hidden');
            byId('gameMain').classList.remove('hidden');
            self.initRun(selRace, selClass);
            if (!self.isDialogueActive) byId('canvasContainer').focus();
        });

        if (byId('btnLeaveHub')) byId('btnLeaveHub').addEventListener('click', function () {
            byId('hubScreen').classList.add('hidden');
            byId('mainMenuScreen').classList.remove('hidden');
            self.saveState();
            byId('btnEnterHub').focus();
        });

        var tabBtns = document.querySelectorAll('.hub-tab-btn');
        tabBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                tabBtns.forEach(function (b) { b.classList.remove('active'); });
                e.target.classList.add('active');
                var targetTab = e.target.dataset.tab;
                document.querySelectorAll('.hub-pane').forEach(function (p) { p.classList.remove('active'); });
                byId('tab-' + targetTab)?.classList.add('active');
                if (targetTab === 'exchange') {
                    byId('exchangeGoldBalance').textContent = self.gold + ' Gold';
                    byId('exchangeUusdBalance').textContent = self.uusd + ' $UUSD';
                } else if (targetTab === 'stash') {
                    self.renderAccountStash();
                } else if (targetTab === 'lore') {
                    self.renderLoreList();
                }
            });
        });

        if (byId('btnRefineSparkite')) byId('btnRefineSparkite').addEventListener('click', function () { self.refineSparkite(); });

        if (byId('btnBuyUusd')) byId('btnBuyUusd').addEventListener('click', function () {
            if (self.gold >= 10) {
                self.gold -= 10; self.uusd += 100; self.audio.play('loot');
                byId('exchangeGoldBalance').textContent = self.gold + ' Gold';
                byId('exchangeUusdBalance').textContent = self.uusd + ' $UUSD';
                self.saveState();
            }
        });
        if (byId('btnBuyGold')) byId('btnBuyGold').addEventListener('click', function () {
            if (self.uusd >= 100) {
                self.uusd -= 100; self.gold += 10; self.audio.play('loot');
                byId('exchangeGoldBalance').textContent = self.gold + ' Gold';
                byId('exchangeUusdBalance').textContent = self.uusd + ' $UUSD';
                self.saveState();
            }
        });
        if (byId('btnUpgradeQuarters')) byId('btnUpgradeQuarters').addEventListener('click', function () {
            if (self.quartersLevel < 6) {
                var cost = QuartersUpgrades[self.quartersLevel].cost;
                if (self.uusd >= cost) {
                    self.uusd -= cost; self.quartersLevel++; self.audio.play('ability');
                    self.updateHubQuartersUI(); self.renderBotany(); self.saveState();
                }
            }
        });

        if (byId('btnGenerateCircuit')) byId('btnGenerateCircuit').addEventListener('click', function () { self.generateRepairMiniGame(); });
        document.querySelectorAll('.btn-mode').forEach(function (btn) { btn.addEventListener('click', function () { self.setControlMode(btn.dataset.mode); }); });
        document.querySelectorAll('.btn-speed').forEach(function (btn) { btn.addEventListener('click', function () { self.setGameSpeed(btn.dataset.speed); }); });
        if (byId('btnWaitTurn')) byId('btnWaitTurn').addEventListener('click', function () { self.executeTurnAction('wait'); });
        document.querySelectorAll('.char-mode-card').forEach(function (btn) { btn.addEventListener('click', function () { self.setControlMode(btn.dataset.mode); }); });

        if (byId('btnGoToMenu')) byId('btnGoToMenu').addEventListener('click', function () {
            byId('gameOverScreen').classList.add('hidden');
            byId('mainMenuScreen').classList.remove('hidden');
            byId('btnPlay').focus();
        });
        if (byId('btnReturnToHub')) byId('btnReturnToHub').addEventListener('click', function () {
            self.loop.stop();
            byId('gameMain').classList.add('hidden');
            byId('mainMenuScreen').classList.add('hidden');
            byId('hubScreen').classList.remove('hidden');
            self.updateHubQuartersUI();
            self.renderBotany();
            self.renderAccountStash();
            self.generateRepairMiniGame();
            self.saveState();
            byId('hubTitle').focus();
        });
        if (byId('btnPause')) byId('btnPause').addEventListener('click', function () { self.togglePause(); });
        if (byId('btnResume')) byId('btnResume').addEventListener('click', function () { self.togglePause(); });
        if (byId('btnCycleWeapon')) byId('btnCycleWeapon').addEventListener('click', function () { self.cycleWeapon(1); });
        if (byId('btnAbandon')) byId('btnAbandon').addEventListener('click', function () {
            self.loop.stop();
            byId('pauseScreen').classList.add('hidden');
            byId('gameMain').classList.add('hidden');
            byId('mainMenuScreen').classList.remove('hidden');
            self.saveState();
        });

        document.addEventListener('visibilitychange', function () {
            try {
                if (document.hidden && self.player && !self.loop.isPaused && !byId('gameMain').classList.contains('hidden')) {
                    self.togglePause();
                }
            } catch (_) {}
        });
    };

    GraveGainGame.prototype.renderCharSelect = function () {
        var self = this;
        var loadout = byId('startingWeaponSelect');
        if (loadout) {
            var weapons = this.getDiscoveredStartingWeapons();
            var preferred = getPreferredStartingWeapon(weapons);
            loadout.innerHTML = weapons.map(function (weapon) {
                return '<option value="' + weapon.id + '">' + weapon.icon + ' ' + weapon.name + ' · ' + weapon.rarity + ' — ' + weapon.description + '</option>';
            }).join('');
            loadout.value = preferred;
            var preview = byId('startingWeaponPreview');
            var updatePreview = function () {
                var weapon = weapons.find(function (item) { return item.id === loadout.value; });
                if (!preview || !weapon) return;
                var cadence = weapon.interval > 0 ? (1 / weapon.interval).toFixed(1) : '—';
                var traits = [weapon.pellets ? weapon.pellets + '-shot spread' : '', weapon.pierce ? 'pierces ' + weapon.pierce : '', weapon.armorPen ? Math.round(weapon.armorPen * 100) + '% armor penetration' : '', weapon.explosive ? 'explosive' : '', weapon.healOnHit ? 'heals on hit' : '', weapon.slow ? 'slows targets' : '', weapon.bossBonus ? 'bonus vs bosses' : '', weapon.executeBonus ? 'executes weakened foes' : ''].filter(Boolean);
                preview.textContent = weapon.icon + ' ' + weapon.name + '  ·  ' + weapon.rarity + '  ·  ' + weapon.damage + ' damage × ' + cadence + '/sec' + (traits.length ? '  ·  ' + traits.join(' · ') : '');
            };
            updatePreview();
            loadout.onchange = function () {
                updatePreview();
                if (weapons.some(function (weapon) { return weapon.id === loadout.value; })) {
                    try { localStorage.setItem('GraveGain2DC_StartingWeapon_v1', loadout.value); } catch (_) {}
                    if (typeof window.__fourweirdRequestSave === 'function') window.__fourweirdRequestSave('loadout-selected');
                }
            };
        }
        document.querySelectorAll('.char-mode-card').forEach(function (btn) {
            var selected = btn.dataset.mode === self.controlMode;
            btn.classList.toggle('selected', selected);
            btn.setAttribute('aria-pressed', String(selected));
        });
        document.querySelectorAll('.character-step').forEach(function (p) { p.classList.toggle('hidden', p.id !== 'raceStep'); });
        var prog = document.querySelector('.character-flow-progress');
        if (prog) prog.textContent = 'STEP 1 OF 3 · CHOOSE YOUR RACE';

        var raceGrid = document.getElementById('raceGrid');
        if (raceGrid) {
            raceGrid.innerHTML = Object.keys(RaceData).map(function (key, i) {
                var r = RaceData[key];
                return '<button type="button" class="char-card ' + (i === 0 ? 'selected' : '') + '" data-race="' + key + '" aria-pressed="' + (i === 0) + '">' +
                    '<span class="char-emoji">' + r.emoji + '</span><div class="char-name">' + r.name + '</div><div class="char-desc">' + r.desc + '</div></button>';
            }).join('');
            var cards = raceGrid.querySelectorAll('.char-card');
            cards.forEach(function (card) {
                card.addEventListener('click', function () {
                    cards.forEach(function (c) { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
                    card.classList.add('selected'); card.setAttribute('aria-pressed', 'true');
                    updateClassTitles();
                });
            });
        }

        var classGrid = document.getElementById('classGrid');
        if (classGrid) {
            classGrid.innerHTML = Object.values(ClassType).map(function (key, i) {
                var title = ClassTitles[key][Race.HUMAN];
                var role = ClassData[key];
                return '<button type="button" class="class-btn ' + (i === 0 ? 'selected' : '') + '" data-class="' + key + '" aria-pressed="' + (i === 0) + '"><strong><span aria-hidden="true">' + role.icon + '</span> <span class="class-name">' + title + '</span></strong><small>' + key.toUpperCase() + '</small><span class="class-role-desc">' + role.description + '</span></button>';
            }).join('');
            var cBtns = classGrid.querySelectorAll('.class-btn');
            cBtns.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    cBtns.forEach(function (b) { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); });
                    btn.classList.add('selected'); btn.setAttribute('aria-pressed', 'true');
                });
            });
        }
        function updateClassTitles() {
            var race = document.querySelector('.char-card.selected')?.dataset.race || Race.HUMAN;
            if (classGrid) {
                classGrid.querySelectorAll('.class-btn').forEach(function (btn) {
                    var className = btn.querySelector('.class-name');
                    if (className) className.textContent = ClassTitles[btn.dataset.class][race];
                });
            }
        }
        updateClassTitles();

        var presetSelect = byId('buildPresetSelect');
        var presetStatus = byId('buildPresetStatus');
        var readDeletedPresetIds = function () {
            try {
                var raw = JSON.parse(localStorage.getItem('GraveGain2DC_LoadoutPresets_v1') || '{}');
                return raw && Array.isArray(raw.deletedPresetIds) ? raw.deletedPresetIds.filter(function (id) { return typeof id === 'string'; }) : [];
            } catch (_) { return []; }
        };
        var readPresets = function () {
            try {
                var raw = JSON.parse(localStorage.getItem('GraveGain2DC_LoadoutPresets_v1') || '{}');
                return raw && Array.isArray(raw.presets) ? raw.presets.filter(function (preset) {
                    return preset && typeof preset.id === 'string' && Object.keys(RaceData).indexOf(preset.race) >= 0 && Object.values(ClassType).indexOf(preset.classType) >= 0 && ['realtime', 'chrono', 'turnbased'].indexOf(preset.mode) >= 0;
                }).slice(0, 8) : [];
            } catch (_) { return []; }
        };
        var refreshPresets = function (selectedId) {
            var presets = readPresets();
            if (!presetSelect) return presets;
            presetSelect.innerHTML = '<option value="">Choose a saved build…</option>' + presets.map(function (preset) {
                var raceName = RaceData[preset.race].name;
                var className = ClassTitles[preset.classType][preset.race];
                var weapon = (window.GraveGainStubs.weaponsCatalog.getWeapon(preset.weaponId || 'relic-bolt'));
                return '<option value="' + preset.id + '">' + raceName + ' ' + className + ' · ' + weapon.name + '</option>';
            }).join('');
            presetSelect.value = selectedId || '';
            var loadBtn = byId('btnLoadBuildPreset');
            var deleteBtn = byId('btnDeleteBuildPreset');
            if (loadBtn) loadBtn.disabled = presets.length === 0;
            if (deleteBtn) deleteBtn.disabled = presets.length === 0;
            return presets;
        };
        refreshPresets();
        if (byId('btnSaveBuildPreset')) byId('btnSaveBuildPreset').onclick = function () {
            var presets = readPresets();
            if (presets.length >= 8) {
                if (presetStatus) presetStatus.textContent = 'All 8 build slots are full. Delete one before saving another.';
                return;
            }
            var race = document.querySelector('.char-card.selected')?.dataset.race || Race.HUMAN;
            var classType = document.querySelector('.class-btn.selected')?.dataset.class || ClassType.WARRIOR;
            var mode = document.querySelector('.char-mode-card.selected')?.dataset.mode || self.controlMode;
            var weaponId = loadout && loadout.value || getPreferredStartingWeapon(self.getDiscoveredStartingWeapons());
            var id = 'build-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
            presets.push({ id: id, race: race, classType: classType, mode: mode, weaponId: weaponId });
            try { localStorage.setItem('GraveGain2DC_LoadoutPresets_v1', JSON.stringify({ activePresetId: id, presets: presets, deletedPresetIds: readDeletedPresetIds() })); } catch (_) {}
            refreshPresets(id);
            if (presetStatus) presetStatus.textContent = 'Build saved: ' + RaceData[race].name + ' ' + ClassTitles[classType][race] + '.';
            if (typeof window.__fourweirdRequestSave === 'function') window.__fourweirdRequestSave('loadout-preset-saved');
        };
        if (byId('btnLoadBuildPreset')) byId('btnLoadBuildPreset').onclick = function () {
            var preset = readPresets().find(function (item) { return item.id === (presetSelect && presetSelect.value); });
            if (!preset) return;
            var setSelected = function (selector, attr, value) {
                document.querySelectorAll(selector).forEach(function (card) {
                    var selected = card.dataset[attr] === value;
                    card.classList.toggle('selected', selected);
                    card.setAttribute('aria-pressed', String(selected));
                });
            };
            setSelected('.char-card', 'race', preset.race);
            setSelected('.class-btn', 'class', preset.classType);
            setSelected('.char-mode-card', 'mode', preset.mode);
            updateClassTitles();
            var ownedWeapons = self.getDiscoveredStartingWeapons();
            if (loadout) {
                var preferredWeapon = ownedWeapons.some(function (weapon) { return weapon.id === preset.weaponId; }) ? preset.weaponId : 'relic-bolt';
                loadout.value = preferredWeapon;
                loadout.dispatchEvent(new Event('change'));
            }
            try { localStorage.setItem('GraveGain2DC_LoadoutPresets_v1', JSON.stringify({ activePresetId: preset.id, presets: readPresets(), deletedPresetIds: readDeletedPresetIds() })); } catch (_) {}
            if (presetStatus) presetStatus.textContent = ownedWeapons.some(function (weapon) { return weapon.id === preset.weaponId; })
                ? 'Build loaded. Review your choices, then deploy.'
                : 'Build loaded with Relic Bolt because its saved weapon is not discovered on this profile.';
        };
        if (byId('btnDeleteBuildPreset')) byId('btnDeleteBuildPreset').onclick = function () {
            var selectedId = presetSelect && presetSelect.value;
            if (!selectedId) return;
            var presets = readPresets().filter(function (preset) { return preset.id !== selectedId; });
            var deletedIds = readDeletedPresetIds();
            if (deletedIds.indexOf(selectedId) < 0) deletedIds.push(selectedId);
            try { localStorage.setItem('GraveGain2DC_LoadoutPresets_v1', JSON.stringify({ activePresetId: presets.length ? presets[0].id : null, presets: presets, deletedPresetIds: deletedIds })); } catch (_) {}
            refreshPresets(presets.length ? presets[0].id : '');
            if (presetStatus) presetStatus.textContent = 'Saved build deleted.';
            if (typeof window.__fourweirdRequestSave === 'function') window.__fourweirdRequestSave('loadout-preset-deleted');
        };
    };

    GraveGainGame.prototype.updateHubQuartersUI = function () {
        this.ensureBotanySlots();
        var ql = document.getElementById('hubQuartersLevel');
        var qs = document.getElementById('hubQuartersSize');
        var qc = document.getElementById('hubQuartersCapacity');
        var qcost = document.getElementById('hubQuartersCost');
        var ubtn = document.getElementById('btnUpgradeQuarters');
        var up = QuartersUpgrades[this.quartersLevel - 1];
        if (ql) ql.textContent = 'Level ' + this.quartersLevel;
        if (qs) qs.textContent = up.size;
        if (qc) qc.textContent = up.capacity + ' Space';
        if (qcost) qcost.textContent = this.quartersLevel < 6 ? (QuartersUpgrades[this.quartersLevel].cost + ' $UUSD') : 'MAX LEVEL REACHED';
        if (ubtn) {
            ubtn.disabled = this.quartersLevel >= QuartersUpgrades.length;
            ubtn.textContent = this.quartersLevel >= QuartersUpgrades.length ? '✓ Maximum Quarters Reached' : '🔧 Purchase Expansion Upgrade';
        }
    };

    GraveGainGame.prototype.getBotanySlotLimit = function () { return Math.min(4 + (this.quartersLevel - 1) * 2, 12); };
    GraveGainGame.prototype.ensureBotanySlots = function () {
        while (this.botanyCrops.length < this.getBotanySlotLimit()) {
            this.botanyCrops.push({ seedId: null, startTime: 0, growthTime: 0, capacity: 0 });
        }
    };
    GraveGainGame.prototype.getBotanySpaceUsed = function () {
        return this.botanyCrops.reduce(function (used, crop) {
            var seed = crop.seedId && BotanySeeds.find(function (s) { return s.id === crop.seedId; });
            return used + (seed ? seed.space : 0);
        }, 0);
    };
    GraveGainGame.prototype.renderBotany = function () {
        var grid = document.getElementById('botanyGrid');
        if (!grid) return;
        var now = Math.floor(Date.now() / 1000);
        this.ensureBotanySlots();
        var capacity = QuartersUpgrades[this.quartersLevel - 1].capacity;
        var capEl = document.getElementById('botanyCapacityText');
        if (capEl) capEl.textContent = 'Incubators: ' + this.botanyCrops.length + '/' + this.getBotanySlotLimit() + ' · Growing space: ' + this.getBotanySpaceUsed() + '/' + capacity;
        grid.innerHTML = this.botanyCrops.map(function (crop, index) {
            if (crop.seedId === null) {
                return '<div class="plant-slot"><strong>[Empty Incubator Space]</strong><div style="display:flex;flex-direction:column;gap:5px;margin-top:8px;">' +
                    BotanySeeds.map(function (s) { return '<button class="btn-game" style="font-size:0.75rem;padding:5px 10px;" onclick="window.GraveGainGame.plantSeed(' + index + ', \'' + s.id + '\')">Plant ' + s.name + ' (Cost: 20 $UUSD)</button>'; }).join('') +
                    '</div></div>';
            }
            var seed = BotanySeeds.find(function (s) { return s.id === crop.seedId; });
            var elapsed = now - crop.startTime;
            var pct = Math.min(100, Math.floor((elapsed / crop.growthTime) * 100));
            return '<div class="plant-slot"><div class="plant-info"><span>' + seed.emoji + ' ' + seed.name + '</span><span>' + pct + '%</span></div>' +
                '<div class="plant-progress-bg"><div class="plant-progress-fill" style="width:' + pct + '%;"></div></div>' +
                (pct >= 100 ? '<button class="btn-game btn-primary" style="font-size:0.8rem;padding:6px 12px;margin-top:5px;" onclick="window.GraveGainGame.harvestCrop(' + index + ')">🌾 Harvest (Gain ' + (seed.yield * seed.value) + ' $UUSD)</button>' :
                    '<span style="font-size:0.75rem;color:var(--grave-text-muted);">Growing... (' + Math.max(0, crop.growthTime - elapsed) + 's remaining)</span>') +
                '</div>';
        }).join('');
    };
    GraveGainGame.prototype.plantSeed = function (slotIndex, seedId) {
        var seed = BotanySeeds.find(function (s) { return s.id === seedId; });
        var cap = QuartersUpgrades[this.quartersLevel - 1].capacity;
        if (seed && this.uusd >= 20 && this.getBotanySpaceUsed() + seed.space <= cap) {
            this.uusd -= 20;
            this.botanyCrops[slotIndex] = { seedId: seed.id, startTime: Math.floor(Date.now() / 1000), growthTime: seed.time };
            this.audio.play('loot');
            this.renderBotany();
            this.saveState();
        }
    };
    GraveGainGame.prototype.harvestCrop = function (slotIndex) {
        var crop = this.botanyCrops[slotIndex];
        var seed = BotanySeeds.find(function (s) { return s.id === crop.seedId; });
        if (!seed) return;
        this.uusd += seed.yield * seed.value;
        this.botanyCrops[slotIndex] = { seedId: null, startTime: 0, growthTime: 0 };
        this.audio.play('loot');
        this.renderBotany();
        this.saveState();
    };

    GraveGainGame.prototype.generateRepairMiniGame = function () {
        var area = document.getElementById('repairCircuitArea');
        if (!area) return;
        if (typeof this.repairInputCleanup === 'function') this.repairInputCleanup();
        this.repairInputCleanup = null;
        area.innerHTML = '';
        this.circuitConnected = false;
        var stEl = document.getElementById('repairStatus');
        if (stEl) stEl.textContent = 'Status: Calibration offline';
        var termX = 220, termY = 100;
        var target = document.createElement('div');
        target.className = 'circuit-node terminal';
        target.style.left = termX + 'px'; target.style.top = termY + 'px'; target.textContent = '🎯';
        area.appendChild(target);
        var comp = document.createElement('div');
        comp.className = 'circuit-node component';
        comp.style.left = '40px'; comp.style.top = '100px'; comp.textContent = '💠';
        area.appendChild(comp);
        var isDragging = false;
        var self = this;
        var startDrag = function () { isDragging = true; };
        var stopDrag = function () { isDragging = false; };
        var cleanupInput;
        var dragMove = function (e) {
            if (!isDragging) return;
            var rect = area.getBoundingClientRect();
            var cx = e.clientX || (e.touches && e.touches[0].clientX);
            var cy = e.clientY || (e.touches && e.touches[0].clientY);
            var px = Math.max(16, Math.min(rect.width - 16, cx - rect.left));
            var py = Math.max(16, Math.min(rect.height - 16, cy - rect.top));
            comp.style.left = px + 'px'; comp.style.top = py + 'px';
            if (Math.hypot(px - termX, py - termY) < 20) {
                isDragging = false;
                comp.style.left = termX + 'px'; comp.style.top = termY + 'px';
                self.circuitConnected = true;
                if (stEl) stEl.textContent = 'Status: Circuit Calibrated successfully!';
                self.audio.play('block');
                if (cleanupInput) cleanupInput();
            }
        };
        comp.addEventListener('mousedown', startDrag);
        window.addEventListener('mousemove', dragMove);
        window.addEventListener('mouseup', stopDrag);
        comp.addEventListener('touchstart', startDrag, { passive: true });
        window.addEventListener('touchmove', dragMove, { passive: true });
        window.addEventListener('touchend', stopDrag);
        cleanupInput = function () {
            comp.removeEventListener('mousedown', startDrag);
            comp.removeEventListener('touchstart', startDrag);
            window.removeEventListener('mousemove', dragMove);
            window.removeEventListener('mouseup', stopDrag);
            window.removeEventListener('touchmove', dragMove);
            window.removeEventListener('touchend', stopDrag);
            if (self.repairInputCleanup === cleanupInput) self.repairInputCleanup = null;
        };
        this.repairInputCleanup = cleanupInput;
    };

    GraveGainGame.prototype.initMobileControls = function () {
        var self = this;
        var drawer = document.getElementById('mobileDrawer');
        var bagBtn = document.getElementById('thumbBagBtn');
        var craftBtn = document.getElementById('thumbCraftBtn');
        var targetBtn = document.getElementById('thumbTargetBtn');
        var tapBtn = document.getElementById('thumbTapBtn');
        if (!drawer && !bagBtn && !targetBtn && !tapBtn) return;
        var syncToggles = function () {
            if (targetBtn) {
                targetBtn.setAttribute('aria-pressed', String(self.input.autoTarget));
                targetBtn.querySelector('span').textContent = self.input.autoTarget ? 'Target:ON' : 'Target:OFF';
                targetBtn.classList.toggle('active', self.input.autoTarget);
            }
            if (tapBtn) {
                tapBtn.setAttribute('aria-pressed', String(self.input.tapMoveEnabled));
                tapBtn.querySelector('span').textContent = self.input.tapMoveEnabled ? 'Tap:ON' : 'Tap:OFF';
                tapBtn.classList.toggle('active', self.input.tapMoveEnabled);
            }
        };
        var openDrawer = function (pane) {
            if (!drawer) return;
            drawer.classList.remove('hidden');
            drawer.querySelectorAll('.mobile-drawer-tabs .thumb-tab[data-drawer]').forEach(function (b) { b.classList.toggle('active', b.dataset.drawer === pane); });
            drawer.querySelectorAll('.mobile-drawer-pane').forEach(function (p) { p.classList.remove('active'); });
            var activeEl = document.getElementById(pane === 'craft' ? 'drawerCraft' : 'drawerBag');
            if (activeEl) activeEl.classList.add('active');
            self.renderMobileDrawer();
            if (bagBtn) bagBtn.classList.toggle('active', pane === 'bag' && !drawer.classList.contains('hidden'));
            if (craftBtn) craftBtn.classList.toggle('active', pane === 'craft' && !drawer.classList.contains('hidden'));
        };
        var toggleDrawer = function (pane) {
            if (!drawer) return;
            var isOpen = !drawer.classList.contains('hidden');
            var activePaneEl = drawer.querySelector('.mobile-drawer-pane.active');
            var isSame = activePaneEl && activePaneEl.id === (pane === 'craft' ? 'drawerCraft' : 'drawerBag');
            if (isOpen && isSame) {
                drawer.classList.add('hidden');
                if (bagBtn) bagBtn.classList.remove('active');
                if (craftBtn) craftBtn.classList.remove('active');
            } else {
                openDrawer(pane);
            }
        };
        if (bagBtn) bagBtn.addEventListener('click', function () { toggleDrawer('bag'); });
        if (craftBtn) craftBtn.addEventListener('click', function () { toggleDrawer('craft'); });
        if (drawer) {
            drawer.querySelectorAll('.thumb-tab[data-drawer]').forEach(function (b) {
                b.addEventListener('click', function () { openDrawer(b.dataset.drawer); });
            });
        }
        if (targetBtn) targetBtn.addEventListener('click', function () { self.input.setAutoTarget(!self.input.autoTarget); syncToggles(); });
        if (tapBtn) tapBtn.addEventListener('click', function () { self.input.setTapMove(!self.input.tapMoveEnabled); syncToggles(); });
        if (document.getElementById('mobileDrawerClose')) {
            document.getElementById('mobileDrawerClose').addEventListener('click', function () { drawer.classList.add('hidden'); });
        }
        syncToggles();
        this.renderMobileDrawer();
    };

    GraveGainGame.prototype.renderMobileDrawer = function () {
        var bag = document.getElementById('drawerBag');
        var craft = document.getElementById('drawerCraft');
        if (!bag || !craft) return;
        var p = this.player;
        bag.innerHTML = '<div class="drawer-row"><span>❤️ HP ' + (p ? Math.round(p.hp) + '/' + p.maxHp : '—') + '</span><span>⚔️ ' + this.runKills + ' kills</span></div>' +
            '<div class="drawer-row"><span>🪙 ' + this.gold + ' · 💵 ' + this.uusd + '</span><span>Layer ' + this.floorIndex + '</span></div>';
        var state = this.engine.getState();
        var weaponCollection = state.player && state.player.weaponCollection ? state.player.weaponCollection : ['relic-bolt'];
        var activeWeapon = state.player ? state.player.weaponId : 'relic-bolt';
        var catalog = window.GraveGainStubs && window.GraveGainStubs.weaponsCatalog;
        if (catalog) {
            bag.innerHTML += '<strong class="drawer-section-title">🔫 RUN ARMORY · ' + weaponCollection.length + '/20</strong>' + weaponCollection.map(function (id) {
                var weapon = catalog.getWeapon(id);
                return '<div class="drawer-row weapon-drawer-row"><span>' + weapon.icon + ' ' + weapon.name + '<small>' + weapon.rarity + ' · ' + weapon.damage + ' damage</small></span>' +
                    (id === activeWeapon ? '<strong class="weapon-equipped">EQUIPPED</strong>' : '<button type="button" class="btn-game" data-equip-weapon="' + id + '">Equip</button>') + '</div>';
            }).join('');
            bag.querySelectorAll('[data-equip-weapon]').forEach(function (button) {
                button.addEventListener('click', function () {
                    self.engine.setWeapon(button.dataset.equipWeapon);
                    self.updateHUD();
                    self.renderMobileDrawer();
                });
            });
        }
        var now = Math.floor(Date.now() / 1000);
        this.ensureBotanySlots();
        var self = this;
        craft.innerHTML = (this.botanyCrops || []).slice(0, 4).map(function (crop, i) {
            if (!crop || !crop.seedId) {
                var s = BotanySeeds[0];
                return '<div class="drawer-row"><span>🌱 Slot ' + (i + 1) + ': empty</span><button class="btn-game" data-mact="plant" data-slot="' + i + '">Plant ' + s.name + ' (20 $UUSD)</button></div>';
            }
            var seed = BotanySeeds.find(function (s) { return s.id === crop.seedId; });
            var pct = Math.min(100, Math.floor(((now - crop.startTime) / crop.growthTime) * 100));
            return pct >= 100
                ? '<div class="drawer-row"><span>' + seed.emoji + ' ' + seed.name + ' ready</span><button class="btn-game btn-primary" data-mact="harvest" data-slot="' + i + '">Harvest</button></div>'
                : '<div class="drawer-row"><span>' + seed.emoji + ' ' + seed.name + ' ' + pct + '%</span><span>' + Math.max(0, crop.growthTime - (now - crop.startTime)) + 's</span></div>';
        }).join('') || '<span>No grow slots.</span>';
        craft.querySelectorAll('button[data-mact]').forEach(function (b) {
            b.addEventListener('click', function () {
                var slot = Number(b.dataset.slot);
                if (b.dataset.mact === 'plant') self.plantSeed(slot, BotanySeeds[0].id);
                else self.harvestCrop(slot);
                self.renderMobileDrawer();
            });
        });
    };

    GraveGainGame.prototype.renderLoreList = function () {
        var listEl = document.getElementById('loreList');
        if (!listEl || !window.GraveGainLore) return;
        var allLore = window.GraveGainLore.getAll();
        listEl.innerHTML = Object.keys(allLore).map(function (key) {
            var item = allLore[key];
            return '<button class="class-btn" style="text-align:left;padding:8px;font-size:0.8rem;width:100%;" onclick="window.GraveGainGame.viewLoreEntry(\'' + item.id + '\')">' + item.title + '</button>';
        }).join('');
        var speakBtn = document.getElementById('btnSpeakLore');
        var self = this;
        if (speakBtn && !speakBtn.dataset.bound) {
            speakBtn.dataset.bound = 'true';
            speakBtn.addEventListener('click', function () {
                var cid = speakBtn.dataset.currentId;
                var item = cid && window.GraveGainLore.get(cid);
                if (item) self.audio.speakFallback(item.content);
            });
        }
    };

    GraveGainGame.prototype.viewLoreEntry = function (id) {
        var item = window.GraveGainLore && window.GraveGainLore.get(id);
        if (!item) return;
        document.getElementById('loreTitle').textContent = item.title;
        document.getElementById('loreCategory').textContent = 'Category: ' + item.category.replace('_', ' ');
        document.getElementById('loreContent').textContent = item.content;
        var speakBtn = document.getElementById('btnSpeakLore');
        if (speakBtn) { speakBtn.style.display = 'block'; speakBtn.dataset.currentId = id; }
    };

    GraveGainGame.prototype.renderStoryMissionsList = function () {
        var grid = document.getElementById('storyMissionsGrid');
        var btnLaunch = document.getElementById('btnStartStoryMission');
        if (!grid || !window.GraveGainStoryMissions) return;
        var self = this;
        grid.innerHTML = window.GraveGainStoryMissions.map(function (m) {
            var unlocked = window.GraveGainStoryEngine.isUnlocked(m.id);
            var progress = window.GraveGainStoryEngine.getProgress();
            var stars = progress.stars[m.id] || 0;
            var isSelected = self.selectedStoryMissionId === m.id;
            var starStr = unlocked ? ('⭐'.repeat(stars) + '☆'.repeat(3 - stars)) : '🔒 Locked';
            return '<button type="button" class="glass-panel story-card ' + (unlocked ? '' : 'disabled') + ' ' + (isSelected ? 'selected' : '') + '" ' +
                'style="padding:12px;width:100%;text-align:left;font-family:var(--grave-font);color:var(--grave-text);border:1px solid ' + (isSelected ? 'var(--grave-gold)' : 'var(--grave-border)') + ';border-radius:8px;cursor:' + (unlocked ? 'pointer' : 'not-allowed') + ';opacity:' + (unlocked ? 1 : 0.6) + ';background:' + (isSelected ? 'rgba(168,85,247,0.2)' : 'rgba(0,0,0,0.4)') + ';" ' +
                (unlocked ? ('onclick="window.GraveGainGame.selectStoryMission(' + m.id + ')"') : 'disabled') + '>' +
                '<div style="font-size:0.75rem;text-transform:uppercase;color:var(--grave-gold);">' + m.location + '</div>' +
                '<h4 style="margin:4px 0;font-family:\'Orbitron\';font-size:0.95rem;color:white;">' + m.title + '</h4>' +
                '<p style="font-size:0.78rem;color:var(--grave-text-muted);margin:4px 0 8px 0;">' + m.subtitle + '</p>' +
                '<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;"><span>' + starStr + '</span><span class="highlight-gold">+' + m.rewardGold + 'g | +' + m.rewardUusd + '$</span></div></button>';
        }).join('');
        if (btnLaunch) btnLaunch.disabled = !this.selectedStoryMissionId;
    };

    GraveGainGame.prototype.selectStoryMission = function (missionId) {
        if (!window.GraveGainStoryEngine.isUnlocked(missionId)) return;
        this.selectedStoryMissionId = missionId;
        this.renderStoryMissionsList();
    };

    GraveGainGame.prototype.getSecondaryObjective = function () {
        if (!this.currentMission) return null;
        var missionObjective = this.currentMission.secondaryObjective || null;
        var campaignObjective = this.currentMission._campaign && this.currentMission._campaign.secondaryObjective;
        if (!missionObjective) return campaignObjective || null;
        if (campaignObjective && campaignObjective !== missionObjective) {
            Object.keys(campaignObjective).forEach(function (key) {
                if (missionObjective[key] === undefined) missionObjective[key] = campaignObjective[key];
            });
        }
        return missionObjective;
    };

    GraveGainGame.prototype.completeSecondaryObjective = function () {
        var objective = this.getSecondaryObjective();
        if (!objective || objective.rewardGranted || (Number(objective.current) || 0) < (Number(objective.count) || 1)) return false;
        objective.rewardGranted = true;
        this.recordCareerProgress('bonusObjectives', 1);
        var reward = this.getScaledRewards(Number(objective.rewardGold) || 0, Number(objective.rewardXp) || 0);
        if (this.player) {
            this.player.gold += reward.gold;
            if (reward.xp > 0) this.awardRunXP(reward.xp);
        }
        this.gold += reward.gold;
        this.runGold += reward.gold;
        this.updateChallengeProgress('gold', reward.gold);
        this.showRunNotice('BONUS REWARD · +' + reward.gold + ' GOLD · +' + reward.xp + ' XP', 'legendary');
        this.updateMissionUI();
        this.updateHUD();
        this.saveState();
        return true;
    };

    GraveGainGame.prototype.trackSecondaryKill = function (enemy) {
        var objective = this.getSecondaryObjective();
        if (!objective || !enemy) return;
        var qualifies = (objective.id === 'siege_breaker' && enemy.name === 'Siege-Ram Zed') ||
            (objective.id === 'skull_hunter' && enemy.type === 'exploding');
        if (!qualifies) return;
        objective.current = Math.min(objective.count, (Number(objective.current) || 0) + 1);
        this.updateMissionUI();
        if (objective.current === objective.count) {
            this.completeSecondaryObjective();
            this.audio.play('loot');
        }
    };

    GraveGainGame.prototype.playDialogueSequence = function (dialogueList, onComplete) {
        if (!dialogueList || !dialogueList.length) {
            if (onComplete) onComplete();
            return;
        }
        var screen = document.getElementById('storyDialogueScreen');
        var portrait = document.getElementById('dialoguePortrait');
        var speaker = document.getElementById('dialogueSpeaker');
        var text = document.getElementById('dialogueText');
        var nextBtn = document.getElementById('btnNextDialogue');
        if (!screen) { if (onComplete) onComplete(); return; }

        this.isDialogueActive = true;
        screen.classList.remove('hidden');
        var idx = 0;
        var self = this;
        function showLine() {
            var item = dialogueList[idx];
            portrait.textContent = item.portrait || '🤖';
            speaker.textContent = item.speaker;
            text.textContent = item.text;
            self.audio.speakFallback(item.speaker + ' says: ' + item.text);
        }
        nextBtn.onclick = function () {
            idx++;
            if (idx < dialogueList.length) showLine();
            else {
                screen.classList.add('hidden');
                self.isDialogueActive = false;
                if (onComplete) onComplete();
                var gameOver = document.getElementById('gameOverScreen');
                if (!gameOver || gameOver.classList.contains('hidden')) {
                    var arena = document.getElementById('canvasContainer');
                    if (arena) arena.focus();
                }
            }
        };
        showLine();
        nextBtn.focus();
    };

    GraveGainGame.prototype.checkStoryObjectives = function (enemyKilled, collectedItem) {
        if (!this.currentMission || !this.currentMission.objectives) return;
        var allComplete = true;
        this.currentMission.objectives.forEach(function (obj) {
            if (obj.current < obj.count) {
                if (obj.id === 'collect_ore' && collectedItem === 'ore') obj.current++;
                else if (obj.id === 'slay_boss' && enemyKilled && enemyKilled.type === 'boss') obj.current++;
                else if (enemyKilled && enemyKilled.type !== 'boss' && (obj.id === 'slay_all' || obj.id === 'survive_waves' || obj.id === 'slay_minions')) obj.current++;
                else if (obj.id === 'slay_skulls' && enemyKilled && enemyKilled.type === 'exploding') obj.current++;
                else if (obj.id === 'slay_elites' && enemyKilled && enemyKilled.type === 'elite') obj.current++;
            }
            if (obj.current < obj.count) allComplete = false;
        });
        this.updateMissionUI();
        if (allComplete && !this.currentMission.completed) {
            this.currentMission.completed = true;
            this._campaignGoldRewardEarned = Math.round(this.currentMission.rewardGold * this.getGoldEarningsMultiplier());
            this.gold += this._campaignGoldRewardEarned;
            this.uusd += this.currentMission.rewardUusd;
            this.recordCareerProgress('campaignMissions', this.currentMission.id);
            window.GraveGainStoryEngine.completeMission(this.currentMission.id, 3);
            this.saveState();
            var self = this;
            this.playDialogueSequence(this.currentMission.dialogueAfter, function () { self.gameOver(true); });
        }
    };

    GraveGainGame.prototype.openGigglesHelpCase = function () {
        var self = this;
        if (this.player && window.GigglesHelpDraft) {
            window.GigglesHelpDraft.present('gravegain2dC', this, function () { self.updateHUD(); });
        }
    };

    GraveGainGame.prototype.gameOver = function (victory) {
        victory = !!victory;
        if (this.runRecorded) return;
        this.runRecorded = true;
        if (!victory) this.runDeaths++;
        this._speedrunResult = this.finishSpeedrun(victory);
        var secondary = this.getSecondaryObjective();
        if (victory && secondary && secondary.id === 'tutorial_flawless' && this.runDeaths === 0) {
            secondary.current = secondary.count;
            this.updateMissionUI();
            this.completeSecondaryObjective();
        }
        this.loop.stop();
        this.relicDraftQueue = 0;
        var relicScreen = document.getElementById('relicDraftScreen');
        if (relicScreen) relicScreen.classList.add('hidden');
        document.getElementById('gameMain').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.remove('hidden');
        document.getElementById('btnGoToMenu').focus();

        var missionComplete = victory && this.currentMission && this.currentMission.completed;
        if (victory) this.recordCareerProgress('victories', 1);
        document.getElementById('gameOverTitle').textContent = missionComplete ? 'MISSION COMPLETE' : (victory ? 'RUN COMPLETED' : 'RUN TERMINATED');
        document.getElementById('gameOverSub').textContent = missionComplete
            ? (this.currentMission.title + ' secured - campaign rewards transmitted.')
            : (victory ? 'Safespace terminal extracted' : 'Vitals flatlined');
        if (this.player) {
            document.getElementById('goRaceClass').textContent = this.player.race.toUpperCase() + ' ' + this.player.classType.toUpperCase();
            document.getElementById('goXp').textContent = Math.round(this.player.xp || 0);
        }
        document.getElementById('goFloor').textContent = 'Layer ' + this.floorIndex;
        document.getElementById('goKills').textContent = this.runKills;
        var goScore = document.getElementById('goScore');
        if (goScore) {
            var combatRun = this.engine && this.engine.getState ? this.engine.getState() : {};
            goScore.textContent = Math.max(0, Number(combatRun.runScore) || 0).toLocaleString() + ' · Best Streak ' + Math.max(0, Number(combatRun.runBestStreak) || 0) + '×';
        }
        var goPeakDps = document.getElementById('goPeakDps');
        if (goPeakDps) goPeakDps.textContent = Math.round(this.runPeakDps).toLocaleString();
        var goDamageTaken = document.getElementById('goDamageTaken');
        if (goDamageTaken) goDamageTaken.textContent = Math.round(this.runDamageTaken);
        var goCrits = document.getElementById('goCrits');
        if (goCrits) goCrits.textContent = this.runCrits;
        var goHeadshots = document.getElementById('goHeadshots');
        if (goHeadshots) goHeadshots.textContent = this.runHeadshots;
        var goOverkills = document.getElementById('goOverkills');
        if (goOverkills) goOverkills.textContent = this.runOverkills;
        var goEnvironmentalKills = document.getElementById('goEnvironmentalKills');
        if (goEnvironmentalKills) goEnvironmentalKills.textContent = this.runEnvironmentalKills;
        document.getElementById('goGold').textContent = this.runGold + (missionComplete ? (this._campaignGoldRewardEarned || 0) : 0);
        var goCareerXp = document.getElementById('goCareerXp');
        if (goCareerXp) goCareerXp.textContent = Math.max(0, this.careerProgression.xp - this.runCareerXpStart);
        var goAscendantLevel = document.getElementById('goAscendantLevel');
        if (goAscendantLevel) goAscendantLevel.textContent = this.careerProgression.level;
        var goSparkite = document.getElementById('goSparkite');
        if (goSparkite) goSparkite.textContent = Math.max(0, (Number(this.accountStash.materials.sparkite) || 0) - this.runSparkiteStart);
        var goRiftShards = document.getElementById('goRiftShards');
        if (goRiftShards) goRiftShards.textContent = this.runRiftShardsEarned;
        var goRelics = document.getElementById('goRelics');
        if (goRelics) goRelics.textContent = this.runRelics.length ? this.runRelics.join(' · ') : 'No relics claimed';
        var deathRecapPanel = document.getElementById('goDeathRecapPanel');
        var deathRecapList = document.getElementById('goDeathRecapList');
        if (deathRecapPanel) deathRecapPanel.classList.toggle('hidden', victory);
        if (deathRecapList) {
            deathRecapList.textContent = '';
            if (this.runDamageRecap.length) {
                this.runDamageRecap.slice().reverse().forEach(function (hit) {
                    var item = document.createElement('li');
                    var detail = document.createElement('span');
                    detail.textContent = hit.source + ' · ' + hit.type;
                    var amount = document.createElement('strong');
                    amount.textContent = '-' + hit.damage + ' HP · ' + Math.round(hit.hp) + ' remaining';
                    var time = document.createElement('small');
                    time.textContent = formatSpeedrunTime(hit.elapsedMs);
                    item.appendChild(detail);
                    item.appendChild(amount);
                    item.appendChild(time);
                    deathRecapList.appendChild(item);
                });
            } else {
                var emptyRecap = document.createElement('li');
                emptyRecap.textContent = 'No incoming damage was recorded.';
                deathRecapList.appendChild(emptyRecap);
            }
        }
        var speedrunResult = this._speedrunResult;
        var speedrunRows = ['goSpeedrunTimeRow', 'goSpeedrunBestRow', 'goSpeedrunSplitsRow'].map(function (id) { return document.getElementById(id); });
        speedrunRows.forEach(function (row) { if (row) row.style.display = speedrunResult ? 'flex' : 'none'; });
        if (speedrunResult) {
            var speedrunTime = document.getElementById('goSpeedrunTime');
            var speedrunBest = document.getElementById('goSpeedrunBest');
            var speedrunSplits = document.getElementById('goSpeedrunSplits');
            if (speedrunTime) speedrunTime.textContent = formatSpeedrunTime(speedrunResult.elapsedMs);
            if (speedrunBest) speedrunBest.textContent = speedrunResult.isPersonalBest ? 'NEW PERSONAL BEST · ' + formatSpeedrunTime(speedrunResult.bestMs) : (speedrunResult.bestMs ? formatSpeedrunTime(speedrunResult.bestMs) : 'No completed run yet');
            if (speedrunSplits) speedrunSplits.textContent = speedrunResult.splits.length
                ? speedrunResult.splits.map(function (split) { return 'L' + split.floor + ' R' + String(split.room + 1).padStart(2, '0') + ' ' + formatSpeedrunTime(split.segmentMs); }).join(' · ')
                : 'No rooms visited';
        }
        var hasCampaignRun = !!this.currentMission;
        var campaignRatingRow = document.getElementById('goCampaignRatingRow');
        var campaignTimeRow = document.getElementById('goCampaignTimeRow');
        var campaignAccuracyRow = document.getElementById('goCampaignAccuracyRow');
        [campaignRatingRow, campaignTimeRow, campaignAccuracyRow].forEach(function (row) {
            if (row) row.style.display = hasCampaignRun ? '' : 'none';
        });
        if (hasCampaignRun) {
            var campaignStars = Math.max(0, Math.min(3, Number(this._campaignLastStars) || 0));
            var startedAt = Number(this._campaignRunStart) || Number(this.sessionStart) || 0;
            var elapsedMs = this.currentMission.completed && Number(this._campaignLastDurationMs) > 0
                ? Number(this._campaignLastDurationMs)
                : (startedAt > 0 ? Math.max(0, Date.now() - startedAt) : 0);
            var elapsedSeconds = Math.floor(elapsedMs / 1000);
            var missionRating = calculateMissionRating({
                completed: !!missionComplete,
                kills: this.runKills,
                elapsedSeconds: elapsedSeconds,
                gold: this.runGold + (missionComplete ? (this._campaignGoldRewardEarned || 0) : 0),
                damage: this.runDamageTaken
            });
            var ratingText = missionComplete
                ? (missionRating.grade + ' · ' + missionRating.score + '/100 · ' + (campaignStars ? '★'.repeat(campaignStars) + '☆'.repeat(3 - campaignStars) + ' · ' + campaignStars + '/3' : 'OBJECTIVES SECURED'))
                : (victory ? 'OBJECTIVES INCOMPLETE' : 'MISSION FAILED');
            var ratingValue = document.getElementById('goCampaignRating');
            if (ratingValue) {
                ratingValue.textContent = ratingText;
                ratingValue.title = missionComplete
                    ? 'Score: +10 completion, +10 per kill (up to 40), +30 time minus 1 per 12 seconds, +1 per 100 Gold (up to 20), and −1 per 5 damage taken (up to 40 penalty).'
                    : 'Complete the mission objectives and extract to earn a letter rating.';
            }
            var timeValue = document.getElementById('goCampaignTime');
            if (timeValue) timeValue.textContent = Math.floor(elapsedSeconds / 60) + ':' + String(elapsedSeconds % 60).padStart(2, '0');
            var shots = Math.max(0, Number(this._campaignShots) || 0);
            var hits = Math.max(0, Number(this._campaignHits) || 0);
            var accuracyValue = document.getElementById('goCampaignAccuracy');
            if (accuracyValue) accuracyValue.textContent = shots ? Math.min(100, Math.round((hits / shots) * 100)) + '% · ' + Math.min(hits, shots) + '/' + shots : 'No attacks recorded';
        }

        if (victory && window.mattyjacksGameStats && typeof window.mattyjacksGameStats.victory === 'function') {
            try { window.mattyjacksGameStats.victory(); } catch (_) {}
        }
        this.audio.speakFallback(missionComplete ? 'Mission complete. Rewards secured.' : (victory ? 'Run completed. Safespace reached.' : 'Game over. Run terminated.'));
        this.saveState();
    };

    window.addEventListener('DOMContentLoaded', function () {
        window.GraveGainGame = new GraveGainGame();
    });
})();

window.gameDebug = {
    name: 'Grave Gain 2D',
    getScore: function () { return window.GraveGainGame ? window.GraveGainGame.gold : 0; },
    setScore: function (g) {
        if (!window.GraveGainGame) return;
        window.GraveGainGame.gold = Math.max(0, Number(g) || 0);
        if (window.GraveGainGame.player) window.GraveGainGame.player.gold = window.GraveGainGame.gold;
    },
    getHealth: function () { return window.GraveGainGame && window.GraveGainGame.player ? window.GraveGainGame.player.hp : 0; },
    setHealth: function (h) {
        if (!window.GraveGainGame || !window.GraveGainGame.player) return;
        window.GraveGainGame.player.hp = Math.max(0, Math.min(window.GraveGainGame.player.maxHp, Number(h) || 0));
    },
    win: function () { if (window.GraveGainGame) window.GraveGainGame.gameOver(true); },
    lose: function () { if (window.GraveGainGame) window.GraveGainGame.gameOver(false); },
    godMode: false,
    toggleGodMode: function () { this.godMode = !this.godMode; return this.godMode; }
};
