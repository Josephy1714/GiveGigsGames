(function () {
    'use strict';

    // 8 Deep Skill Trees: 4 Race Trees + 4 Class Trees (9 interconnected nodes each across 4 tiers).
    // Node layout uses (tier: 1..4, col: 0..2) for interactive graph rendering + SVG prerequisite edges.

    const RACE_SKILL_TREES = {
        human: {
            id: 'human',
            kind: 'race',
            name: 'Vanguard Infiltrator',
            subtitle: 'Human Race Tree · Shields, Jetpack Flight & Tactical Sidearms',
            icon: '👩‍🚀',
            accent: '#4c7fff',
            nodes: [
                {
                    id: 'h_core', tier: 1, col: 1, maxRank: 3, baseCost: 75, costMult: 1.5,
                    name: 'Colonial Conditioning', icon: '🧬', requires: [],
                    desc: '+15 Max HP, +10 Max Shield, and +4% Move Speed per rank.',
                    effects: { hp: 15, shield: 10, moveSpeed: 0.04 }
                },
                {
                    id: 'h_thrusters', tier: 2, col: 0, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Ion Jetpack Coils', icon: '🚀', requires: [{ id: 'h_core', rank: 1 }],
                    desc: '+18% Jetpack thrust, -20% Jetpack stamina drain, and +6% Jump Height per rank.',
                    effects: { jetpackThrust: 0.18, jetpackDrainReduction: 0.20, jumpHeight: 0.06 }
                },
                {
                    id: 'h_tactical', tier: 2, col: 1, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Sidearm Doctrine', icon: '🔫', requires: [{ id: 'h_core', rank: 1 }],
                    desc: '+10% Service Pistol & Rifle damage and +8% Reload Speed per rank. Rank 2 unlocks Double-Barrel Shotgun starter.',
                    effects: { pistolDamage: 0.10, rifleDamage: 0.10, reloadSpeed: 0.08 }
                },
                {
                    id: 'h_aegis', tier: 2, col: 2, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Hardlight Capacitor', icon: '🛡️', requires: [{ id: 'h_core', rank: 1 }],
                    desc: '+15 Max Shield, +1.5/s Shield Regen, and -10% Shield delay per rank.',
                    effects: { shield: 15, shieldRegen: 1.5, shieldDelayReduction: 0.10 }
                },
                {
                    id: 'h_airstrike', tier: 3, col: 0, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Orbital Momentum', icon: '🌠', requires: [{ id: 'h_thrusters', rank: 1 }],
                    desc: '+18% Airborne & Flow Shot damage per rank.',
                    effects: { airborneDamage: 0.18 }
                },
                {
                    id: 'h_holster', tier: 3, col: 1, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Combat Logistics', icon: '🎒', requires: [{ id: 'h_tactical', rank: 1 }],
                    desc: '+1 Starting & Max Grenade, +12% Ammo Pool, and +8% Fire Rate per rank.',
                    effects: { grenades: 1, ammoPool: 0.12, attackRate: 0.08 }
                },
                {
                    id: 'h_nova', tier: 3, col: 2, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Capacitor Discharge', icon: '⚡', requires: [{ id: 'h_aegis', rank: 1 }],
                    desc: 'When your Energy Shield breaks, emit a 140u shockwave for 40 damage/rank and chill foes.',
                    effects: { perk: 'h_nova' }
                },
                {
                    id: 'h_capstone_ace', tier: 4, col: 0, maxRank: 1, baseCost: 340, costMult: 1,
                    name: 'Valkyrie Protocol', icon: '🦅', requires: [{ id: 'h_airstrike', rank: 1 }, { id: 'h_holster', rank: 1 }],
                    desc: 'CAPSTONE: While airborne, gain +20% Crit Chance & +15% Fire Rate; kills restore 18 Stamina & 10 Shield.',
                    effects: { perk: 'h_capstone_ace' }
                },
                {
                    id: 'h_capstone_bastion', tier: 4, col: 2, maxRank: 1, baseCost: 340, costMult: 1,
                    name: 'Overcharge Shield Wall', icon: '💠', requires: [{ id: 'h_holster', rank: 1 }, { id: 'h_nova', rank: 1 }],
                    desc: 'CAPSTONE: Shield Wall (F) grants +50 Shield, -30% cooldown, and reflects 40% shielded damage as shock arcs.',
                    effects: { perk: 'h_capstone_bastion', cooldownReduction: 0.10 }
                }
            ]
        },
        elf: {
            id: 'elf',
            kind: 'race',
            name: 'Astral Spellweaver',
            subtitle: 'Elf Race Tree · Agility, Mana Precision & Elemental Mastery',
            icon: '🧝‍♀️',
            accent: '#4cff7f',
            nodes: [
                {
                    id: 'e_core', tier: 1, col: 1, maxRank: 3, baseCost: 75, costMult: 1.5,
                    name: 'Sylvan Reflexes', icon: '🌿', requires: [],
                    desc: '+6% Move Speed, +5% Sprint Speed, and +15 Max Mana per rank.',
                    effects: { moveSpeed: 0.06, sprintSpeed: 0.05, mana: 15 }
                },
                {
                    id: 'e_wind', tier: 2, col: 0, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Gale Striders', icon: '💨', requires: [{ id: 'e_core', rank: 1 }],
                    desc: '+9% Sprint Speed, +7% Jump Height, and -15% Dodge Cooldown per rank.',
                    effects: { sprintSpeed: 0.09, jumpHeight: 0.07, dodgeCooldownReduction: 0.15 }
                },
                {
                    id: 'e_ley', tier: 2, col: 1, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Leyline Conduit', icon: '🔮', requires: [{ id: 'e_core', rank: 1 }],
                    desc: '+1.5/s Mana Regen, -8% Ability Cooldown, and +9% Spell/Elemental Damage per rank.',
                    effects: { manaRegen: 1.5, cooldownReduction: 0.08, spellDamage: 0.09 }
                },
                {
                    id: 'e_keen', tier: 2, col: 2, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Eagle-Eye Ballistics', icon: '🎯', requires: [{ id: 'e_core', rank: 1 }],
                    desc: '+5% Crit Chance, +14% Headshot Damage, and -8% Weapon Spread per rank.',
                    effects: { critChance: 0.05, headshotBonus: 0.14, spreadReduction: 0.08 }
                },
                {
                    id: 'e_feather', tier: 3, col: 0, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Windborne Grace', icon: '🪶', requires: [{ id: 'e_wind', rank: 1 }],
                    desc: 'Hold Space in midair for graceful low-gravity glide; dodging grants +15% Crit Chance for 2s per rank.',
                    effects: { perk: 'e_feather', airGravityReduction: 0.16 }
                },
                {
                    id: 'e_arcane_ammo', tier: 3, col: 1, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Mana-Infused Rounds', icon: '✨', requires: [{ id: 'e_ley', rank: 1 }],
                    desc: 'While above 40 Mana, weapons deal +14% bonus damage per rank.',
                    effects: { perk: 'e_arcane_ammo' }
                },
                {
                    id: 'e_sniper_focus', tier: 3, col: 2, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Starlight Precision', icon: '🌟', requires: [{ id: 'e_keen', rank: 1 }],
                    desc: '+14% ADS Damage and +12% Reload Speed per rank.',
                    effects: { adsDamage: 0.14, reloadSpeed: 0.12 }
                },
                {
                    id: 'e_capstone_tempest', tier: 4, col: 0, maxRank: 1, baseCost: 340, costMult: 1,
                    name: 'Astral Tempest', icon: '🌪️', requires: [{ id: 'e_feather', rank: 1 }, { id: 'e_arcane_ammo', rank: 1 }],
                    desc: 'CAPSTONE: Nature Burst (F) gains +45% radius, chills & ignites enemies, and refunds 30% cooldown on kill.',
                    effects: { perk: 'e_capstone_tempest' }
                },
                {
                    id: 'e_capstone_phantom', tier: 4, col: 2, maxRank: 1, baseCost: 340, costMult: 1,
                    name: 'Phantom Marksman', icon: '🏹', requires: [{ id: 'e_arcane_ammo', rank: 1 }, { id: 'e_sniper_focus', rank: 1 }],
                    desc: 'CAPSTONE: Crits and headshots restore 12 Mana and have a 35% chance to refund 1 round directly to the magazine.',
                    effects: { perk: 'e_capstone_phantom' }
                }
            ]
        },
        dwarf: {
            id: 'dwarf',
            kind: 'race',
            name: 'Ironclad Juggernaut',
            subtitle: 'Dwarf Race Tree · Fortitude, Runeforge & Explosive Ordnance',
            icon: '🧔🏻',
            accent: '#ffcc4c',
            nodes: [
                {
                    id: 'd_core', tier: 1, col: 1, maxRank: 3, baseCost: 75, costMult: 1.5,
                    name: 'Mountainborn Vitality', icon: '⛏️', requires: [],
                    desc: '+30 Max HP, +4% Damage Reduction, and +0.7 HP/s Regen per rank.',
                    effects: { hp: 30, damageReduction: 0.04, hpRegen: 0.7 }
                },
                {
                    id: 'd_springs', tier: 2, col: 0, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Pneumatic Greaves', icon: '🥾', requires: [{ id: 'd_core', rank: 1 }],
                    desc: '+10% Jump Height, +6% Move Speed per rank, and +1 extra mid-air jump at rank 2+.',
                    effects: { jumpHeight: 0.10, moveSpeed: 0.06, perk: 'd_springs' }
                },
                {
                    id: 'd_forge', tier: 2, col: 1, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Runeforge Ballistics', icon: '🔨', requires: [{ id: 'd_core', rank: 1 }],
                    desc: '+10% Weapon Damage, +14% Ammo Pool, and +18% Armor Shred per rank.',
                    effects: { damage: 0.10, ammoPool: 0.14, armorShred: 0.18 }
                },
                {
                    id: 'd_demolition', tier: 2, col: 2, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Deep-Mine Sapper', icon: '💣', requires: [{ id: 'd_core', rank: 1 }],
                    desc: '+15% Blast Damage, +10% Blast Radius per rank, and +1 Starting/Max Grenade at ranks 1 & 3.',
                    effects: { blastDamage: 0.15, blastRadius: 0.10, perk: 'd_demolition' }
                },
                {
                    id: 'd_slam', tier: 3, col: 0, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Anvil Drop', icon: '🪨', requires: [{ id: 'd_springs', rank: 1 }],
                    desc: 'Hard landings unleash a 130u seismic shockwave for 35 damage/rank with heavy knockback.',
                    effects: { perk: 'd_slam' }
                },
                {
                    id: 'd_stoneheart', tier: 3, col: 1, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Granite Bastion', icon: '🪨', requires: [{ id: 'd_forge', rank: 1 }],
                    desc: '+20 Max Shield, +1.5s Stone Form duration, and -12% Ability Cooldown per rank.',
                    effects: { shield: 20, abilityDuration: 1.5, cooldownReduction: 0.12 }
                },
                {
                    id: 'd_shrapnel', tier: 3, col: 2, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Rune Shrapnel', icon: '💥', requires: [{ id: 'd_demolition', rank: 1 }],
                    desc: 'Grenades & Launchers ignite foes and gain +15% Crit Chance per rank.',
                    effects: { perk: 'd_shrapnel' }
                },
                {
                    id: 'd_capstone_colossus', tier: 4, col: 0, maxRank: 1, baseCost: 340, costMult: 1,
                    name: 'Living Monolith', icon: '🗿', requires: [{ id: 'd_slam', rank: 1 }, { id: 'd_stoneheart', rank: 1 }],
                    desc: 'CAPSTONE: During Stone Form (F), gain +35% Damage, +25% Fire Rate, and heal 4% Max HP/s.',
                    effects: { perk: 'd_capstone_colossus' }
                },
                {
                    id: 'd_capstone_bombardier', tier: 4, col: 2, maxRank: 1, baseCost: 340, costMult: 1,
                    name: 'Master Bombardier', icon: '🎆', requires: [{ id: 'd_stoneheart', rank: 1 }, { id: 'd_shrapnel', rank: 1 }],
                    desc: 'CAPSTONE: Synthesize +1 free Grenade every 18s (or 4 kills); blast kills restore 10% HP & 15% Reserve Ammo.',
                    effects: { perk: 'd_capstone_bombardier' }
                }
            ]
        },
        orc: {
            id: 'orc',
            kind: 'race',
            name: 'Bloodfury Berserker',
            subtitle: 'Orc Race Tree · Rage Velocity, Lifesteal & Frenzy Fire',
            icon: '👹',
            accent: '#4cff4c',
            nodes: [
                {
                    id: 'o_core', tier: 1, col: 1, maxRank: 3, baseCost: 75, costMult: 1.5,
                    name: 'Warborn Physique', icon: '💪', requires: [],
                    desc: '+35 Max HP, +8% Melee Damage, and +15% Rage generation per rank.',
                    effects: { hp: 35, meleeDamage: 0.08, rageGain: 0.15 }
                },
                {
                    id: 'o_charge', tier: 2, col: 0, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Stampede Stride', icon: '⚡', requires: [{ id: 'o_core', rank: 1 }],
                    desc: '+8% Sprint Speed, +6% Move Speed, and +12% Slide Speed per rank.',
                    effects: { sprintSpeed: 0.08, moveSpeed: 0.06, slideSpeed: 0.12 }
                },
                {
                    id: 'o_frenzy', tier: 2, col: 1, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Frenzy Trigger', icon: '🔥', requires: [{ id: 'o_core', rank: 1 }],
                    desc: '+9% Fire/Attack Rate and +8% Reload Speed per rank.',
                    effects: { attackRate: 0.09, reloadSpeed: 0.08 }
                },
                {
                    id: 'o_savage', tier: 2, col: 2, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Rending Claws', icon: '🩸', requires: [{ id: 'o_core', rank: 1 }],
                    desc: '+10% All Damage, +12% Crit Damage, and +2% Lifesteal per rank.',
                    effects: { damage: 0.10, critDamage: 0.12, lifesteal: 0.02 }
                },
                {
                    id: 'o_momentum', tier: 3, col: 0, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Unstoppable Charge', icon: '🛡️', requires: [{ id: 'o_charge', rank: 1 }],
                    desc: 'While sprinting or sliding, take 14% less damage/rank; Weapon Bash deals +40% damage/rank.',
                    effects: { perk: 'o_momentum' }
                },
                {
                    id: 'o_bloodthirst', tier: 3, col: 1, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Crimson Overdrive', icon: '💢', requires: [{ id: 'o_frenzy', rank: 1 }],
                    desc: 'Kills grant +10% Fire Rate & +8% Move Speed per rank for 5s (stacks up to 3x).',
                    effects: { perk: 'o_bloodthirst' }
                },
                {
                    id: 'o_execute', tier: 3, col: 2, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Cull the Weak', icon: '🪓', requires: [{ id: 'o_savage', rank: 1 }],
                    desc: 'Deal +22% damage per rank to enemies below 45% HP.',
                    effects: { perk: 'o_execute' }
                },
                {
                    id: 'o_capstone_juggernaut', tier: 4, col: 0, maxRank: 1, baseCost: 340, costMult: 1,
                    name: 'Apex Warlord', icon: '👑', requires: [{ id: 'o_momentum', rank: 1 }, { id: 'o_bloodthirst', rank: 1 }],
                    desc: 'CAPSTONE: Rage stays at least 25; every 10 Rage grants +3% Fire Rate & +2% Move Speed.',
                    effects: { perk: 'o_capstone_juggernaut' }
                },
                {
                    id: 'o_capstone_undying', tier: 4, col: 2, maxRank: 1, baseCost: 340, costMult: 1,
                    name: 'Undying Fury', icon: '❤️‍🔥', requires: [{ id: 'o_bloodthirst', rank: 1 }, { id: 'o_execute', rank: 1 }],
                    desc: 'CAPSTONE: Rage Burst (F) heals 25% of AoE damage dealt and refills 50% of active weapon magazine.',
                    effects: { perk: 'o_capstone_undying' }
                }
            ]
        }
    };

    const CLASS_SKILL_TREES = {
        warrior: {
            id: 'warrior',
            kind: 'class',
            name: 'Blademaster & Marksman',
            subtitle: 'Warrior Class Tree · Parry Counters, Gun-Kata & Crits',
            icon: '⚔️',
            accent: '#f97316',
            nodes: [
                {
                    id: 'w_core', tier: 1, col: 1, maxRank: 3, baseCost: 75, costMult: 1.5,
                    name: 'Martial Discipline', icon: '⚔️', requires: [],
                    desc: '+8% All Damage, +15 Max HP, and +4% Crit Chance per rank.',
                    effects: { damage: 0.08, hp: 15, critChance: 0.04 }
                },
                {
                    id: 'w_parry', tier: 2, col: 0, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Aegis Counter', icon: '🛡️', requires: [{ id: 'w_core', rank: 1 }],
                    desc: '+5% Block Mitigation, +15 Max Shield, and -12% Dodge Cooldown per rank.',
                    effects: { blockBonus: 0.05, shield: 15, dodgeCooldownReduction: 0.12 }
                },
                {
                    id: 'w_gunfu', tier: 2, col: 1, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Gun-Kata Flow', icon: '🔫', requires: [{ id: 'w_core', rank: 1 }],
                    desc: '+9% Fire Rate, +10% Reload Speed, and +15% Weapon Bash damage per rank.',
                    effects: { attackRate: 0.09, reloadSpeed: 0.10, meleeDamage: 0.15 }
                },
                {
                    id: 'w_duelist', tier: 2, col: 2, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Executioner Edge', icon: '🎯', requires: [{ id: 'w_core', rank: 1 }],
                    desc: '+15% Crit Damage, +10% Melee/Class Attack Damage, and +5% Move Speed per rank.',
                    effects: { critDamage: 0.15, meleeDamage: 0.10, moveSpeed: 0.05 }
                },
                {
                    id: 'w_riposte', tier: 3, col: 0, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Shockwave Riposte', icon: '⚡', requires: [{ id: 'w_parry', rank: 1 }],
                    desc: 'Dodging or Parrying triggers a 130u shockwave (30 dmg/rank) and empowers your next shot by +35%.',
                    effects: { perk: 'w_riposte' }
                },
                {
                    id: 'w_combo', tier: 3, col: 1, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Blade & Barrel', icon: '🔄', requires: [{ id: 'w_gunfu', rank: 1 }],
                    desc: 'Class Attack (V) hits grant +18% Fire Rate and +15% Reload Speed for 4s per rank.',
                    effects: { perk: 'w_combo' }
                },
                {
                    id: 'w_bleed', tier: 3, col: 2, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Serrated Rounds', icon: '🩸', requires: [{ id: 'w_duelist', rank: 1 }],
                    desc: 'Critical hits ignite/bleed foes and deal +15% bonus damage to Elites & Bosses per rank.',
                    effects: { perk: 'w_bleed' }
                },
                {
                    id: 'w_capstone_tempest', tier: 4, col: 0, maxRank: 1, baseCost: 340, costMult: 1,
                    name: 'Whirlwind Gunner', icon: '🌀', requires: [{ id: 'w_riposte', rank: 1 }, { id: 'w_combo', rank: 1 }],
                    desc: 'CAPSTONE: Melee strikes unleash a 180u piercing shockwave; melee kills reload 50% of your equipped gun.',
                    effects: { perk: 'w_capstone_tempest' }
                },
                {
                    id: 'w_capstone_champion', tier: 4, col: 2, maxRank: 1, baseCost: 340, costMult: 1,
                    name: 'Grandmaster Mark', icon: '🏆', requires: [{ id: 'w_combo', rank: 1 }, { id: 'w_bleed', rank: 1 }],
                    desc: 'CAPSTONE: Every 4th shot or strike is a guaranteed Critical Hit dealing +50% bonus damage.',
                    effects: { perk: 'w_capstone_champion' }
                }
            ]
        },
        mage: {
            id: 'mage',
            kind: 'class',
            name: 'Arcanist Conduit',
            subtitle: 'Mage Class Tree · Elemental Overcharge, Cooldowns & Chain Arcs',
            icon: '🔮',
            accent: '#a855f7',
            nodes: [
                {
                    id: 'm_core', tier: 1, col: 1, maxRank: 3, baseCost: 75, costMult: 1.5,
                    name: 'Astral Attunement', icon: '🔮', requires: [],
                    desc: '+10% Spell & Weapon Damage, +12 Max Shield, and -6% Ability Cooldown per rank.',
                    effects: { spellDamage: 0.10, damage: 0.06, shield: 12, cooldownReduction: 0.06 }
                },
                {
                    id: 'm_frost', tier: 2, col: 0, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Cryo-Weave', icon: '❄️', requires: [{ id: 'm_core', rank: 1 }],
                    desc: '+12% Damage vs Chilled foes, +10% Reload Speed, and +12% Chill chance on shots per rank.',
                    effects: { reloadSpeed: 0.10, perk: 'm_frost' }
                },
                {
                    id: 'm_spark', tier: 2, col: 1, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Arc Resonance', icon: '⚡', requires: [{ id: 'm_core', rank: 1 }],
                    desc: '+9% Attack/Cast Rate, +20% Ward Shred, and +10% Ammo Pool per rank.',
                    effects: { attackRate: 0.09, wardShred: 0.20, ammoPool: 0.10 }
                },
                {
                    id: 'm_pyro', tier: 2, col: 2, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Solar Ignition', icon: '🔥', requires: [{ id: 'm_core', rank: 1 }],
                    desc: '+12% Elemental Damage and +5% Crit Chance per rank.',
                    effects: { elementalBonus: 0.12, critChance: 0.05 }
                },
                {
                    id: 'm_nova', tier: 3, col: 0, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Frostbite Pulse', icon: '💠', requires: [{ id: 'm_frost', rank: 1 }],
                    desc: 'Arcane Bolts (V) chill targets and detonate in a 95u cryo pulse for 22 damage/rank.',
                    effects: { perk: 'm_nova' }
                },
                {
                    id: 'm_chain', tier: 3, col: 1, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Conduit Overcharge', icon: '🌩️', requires: [{ id: 'm_spark', rank: 1 }],
                    desc: 'Every 5th shot arcs lightning to 2 nearby enemies for 22 damage/rank.',
                    effects: { perk: 'm_chain' }
                },
                {
                    id: 'm_surge', tier: 3, col: 2, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Volatile Detonation', icon: '☄️', requires: [{ id: 'm_pyro', rank: 1 }],
                    desc: 'Burning or chilled enemies explode on death in a 110u blast for 30 damage/rank.',
                    effects: { perk: 'm_surge' }
                },
                {
                    id: 'm_capstone_chronos', tier: 4, col: 0, maxRank: 1, baseCost: 340, costMult: 1,
                    name: 'Chronomancer Loop', icon: '⏳', requires: [{ id: 'm_nova', rank: 1 }, { id: 'm_chain', rank: 1 }],
                    desc: 'CAPSTONE: -18% all Cooldowns & +15% Reload Speed; casting Ability (F) resets Dodge & fires 3 Arcane Bolts.',
                    effects: { perk: 'm_capstone_chronos', cooldownReduction: 0.18, reloadSpeed: 0.15 }
                },
                {
                    id: 'm_capstone_archon', tier: 4, col: 2, maxRank: 1, baseCost: 340, costMult: 1,
                    name: 'Astral Overload', icon: '🌌', requires: [{ id: 'm_chain', rank: 1 }, { id: 'm_surge', rank: 1 }],
                    desc: 'CAPSTONE: +22% Elemental/Spell Damage and Chain Lightning arcs deal double damage to Warded/Armored foes.',
                    effects: { perk: 'm_capstone_archon', elementalBonus: 0.22, spellDamage: 0.22 }
                }
            ]
        },
        tank: {
            id: 'tank',
            kind: 'class',
            name: 'Bulwark Fortress',
            subtitle: 'Tank Class Tree · Iron Plating, Thorns & Heavy Siege Firepower',
            icon: '🛡️',
            accent: '#38bdf8',
            nodes: [
                {
                    id: 't_core', tier: 1, col: 1, maxRank: 3, baseCost: 75, costMult: 1.5,
                    name: 'Titan Chassis', icon: '🛡️', requires: [],
                    desc: '+35 Max HP, +18 Max Shield, and +4% Damage Reduction per rank.',
                    effects: { hp: 35, shield: 18, damageReduction: 0.04 }
                },
                {
                    id: 't_armor', tier: 2, col: 0, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Reactive Plating', icon: '🔰', requires: [{ id: 't_core', rank: 1 }],
                    desc: '+5% Damage Reduction, +1.0 HP/s Regen, and +1.0/s Shield Regen per rank.',
                    effects: { damageReduction: 0.05, hpRegen: 1.0, shieldRegen: 1.0 }
                },
                {
                    id: 't_heavy', tier: 2, col: 1, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Heavy Ordnance', icon: '🔩', requires: [{ id: 't_core', rank: 1 }],
                    desc: '+10% Weapon & Melee Damage and +15% Ammo Pool per rank.',
                    effects: { damage: 0.10, meleeDamage: 0.10, ammoPool: 0.15 }
                },
                {
                    id: 't_explosive', tier: 2, col: 2, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Siege Munitions', icon: '💣', requires: [{ id: 't_core', rank: 1 }],
                    desc: '+15% Grenade & Launcher Damage per rank, and +1 Starting/Max Grenade at ranks 1 & 3.',
                    effects: { blastDamage: 0.15, perk: 't_explosive' }
                },
                {
                    id: 't_thorns', tier: 3, col: 0, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Shock-Mesh Retaliation', icon: '⚡', requires: [{ id: 't_armor', rank: 1 }],
                    desc: 'Taking damage or blocking blasts nearby attackers for 25 shock damage/rank and restores 6 Stamina.',
                    effects: { perk: 't_thorns' }
                },
                {
                    id: 't_suppress', tier: 3, col: 1, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Suppressive Volume', icon: '🔋', requires: [{ id: 't_heavy', rank: 1 }],
                    desc: '+20% Magazine Capacity and +8% Fire Rate per rank.',
                    effects: { magSize: 0.20, attackRate: 0.08 }
                },
                {
                    id: 't_concuss', tier: 3, col: 2, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Concussive Force', icon: '🔨', requires: [{ id: 't_explosive', rank: 1 }],
                    desc: 'Explosives & Melee shred +35% more Armor and chill enemies for 2.5s per rank.',
                    effects: { armorShred: 0.35, perk: 't_concuss' }
                },
                {
                    id: 't_capstone_immortal', tier: 4, col: 0, maxRank: 1, baseCost: 340, costMult: 1,
                    name: 'Unbreakable Citadel', icon: '🏰', requires: [{ id: 't_thorns', rank: 1 }, { id: 't_suppress', rank: 1 }],
                    desc: 'CAPSTONE: +75 Max HP, +40 Max Shield; once per floor below 25% HP, trigger full Shield + 30% Heal surge.',
                    effects: { perk: 't_capstone_immortal', hp: 75, shield: 40 }
                },
                {
                    id: 't_capstone_artillery', tier: 4, col: 2, maxRank: 1, baseCost: 340, costMult: 1,
                    name: 'Walking Artillery', icon: '🚀', requires: [{ id: 't_suppress', rank: 1 }, { id: 't_concuss', rank: 1 }],
                    desc: 'CAPSTONE: Every 6th shot fires a micro-explosive round (45 blast dmg); grenades deal +40% damage.',
                    effects: { perk: 't_capstone_artillery', blastDamage: 0.40 }
                }
            ]
        },
        support: {
            id: 'support',
            kind: 'class',
            name: 'Magitech Field Medic',
            subtitle: 'Support Class Tree · Nanite Healing, Toxins, Ammo & Drone Synergy',
            icon: '🧪',
            accent: '#22c55e',
            nodes: [
                {
                    id: 's_core', tier: 1, col: 1, maxRank: 3, baseCost: 75, costMult: 1.5,
                    name: 'Field Surgeon', icon: '🧪', requires: [],
                    desc: '+15 Max HP, +15% Potion Healing, and +10% Reload Speed per rank.',
                    effects: { hp: 15, potionHeal: 0.15, reloadSpeed: 0.10 }
                },
                {
                    id: 's_botany', tier: 2, col: 0, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Nanite Synthesis', icon: '🌱', requires: [{ id: 's_core', rank: 1 }],
                    desc: '+1.2 HP/s Regen, -8% Ability Cooldown per rank, and +1 Starting/Max Potion at ranks 1 & 3.',
                    effects: { hpRegen: 1.2, cooldownReduction: 0.08, perk: 's_botany' }
                },
                {
                    id: 's_chem', tier: 2, col: 1, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Corrosive Alchemy', icon: '☣️', requires: [{ id: 's_core', rank: 1 }],
                    desc: '+12% Weapon/Bio Damage, +10% Fire Rate, and +12% Ammo Pool per rank.',
                    effects: { damage: 0.12, attackRate: 0.10, ammoPool: 0.12 }
                },
                {
                    id: 's_drone', tier: 2, col: 2, maxRank: 3, baseCost: 110, costMult: 1.55,
                    name: 'Drone Telemetry', icon: '🤖', requires: [{ id: 's_core', rank: 1 }],
                    desc: '+25% Companion Drone HP & Damage, +15% Drone Fire Rate, and +15% Gold/$UUSD per rank.',
                    effects: { companionHp: 0.25, companionDmg: 0.25, companionRate: 0.15, greed: 0.15 }
                },
                {
                    id: 's_medmist', tier: 3, col: 0, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Bio-Booster Mist', icon: '💚', requires: [{ id: 's_botany', rank: 1 }],
                    desc: 'Drinking a Potion or casting Ability (F) grants +20 Shield/rank and +15% Move Speed for 5s.',
                    effects: { perk: 's_medmist' }
                },
                {
                    id: 's_toxin', tier: 3, col: 1, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Plague Rounds', icon: '🦠', requires: [{ id: 's_chem', rank: 1 }],
                    desc: 'Shots have a 22% chance/rank to poison foes; poisoned enemies take +15% more damage/rank.',
                    effects: { perk: 's_toxin' }
                },
                {
                    id: 's_scavenger', tier: 3, col: 2, maxRank: 2, baseCost: 180, costMult: 1.65,
                    name: 'Ammo Fabricator', icon: '🎒', requires: [{ id: 's_drone', rank: 1 }],
                    desc: 'Kills have a 25% chance/rank to restore 15% reserve ammo; +25% Auto-Pickup range/rank.',
                    effects: { perk: 's_scavenger', pickupRange: 0.25 }
                },
                {
                    id: 's_capstone_panacea', tier: 4, col: 0, maxRank: 1, baseCost: 340, costMult: 1,
                    name: 'Panacea Protocol', icon: '💉', requires: [{ id: 's_medmist', rank: 1 }, { id: 's_toxin', rank: 1 }],
                    desc: 'CAPSTONE: Companion gets +1 extra Revive; petting companion heals YOU +25 HP; Potions reload +25% mag.',
                    effects: { perk: 's_capstone_panacea', companionRevives: 1 }
                },
                {
                    id: 's_capstone_swarm', tier: 4, col: 2, maxRank: 1, baseCost: 340, costMult: 1,
                    name: 'Nanite Plague Swarm', icon: '🐝', requires: [{ id: 's_toxin', rank: 1 }, { id: 's_scavenger', rank: 1 }],
                    desc: 'CAPSTONE: Poisoned enemies burst into toxic clouds on death (40 AoE dmg) and deal 20% less damage to you.',
                    effects: { perk: 's_capstone_swarm' }
                }
            ]
        }
    };

    // Race x Class Synergy Combos (unlocked automatically when both active trees have >= 4 ranks invested).
    const SYNERGY_COMBOS = {
        'human:warrior': { name: 'Tactical Commando', icon: '🎖️', desc: '+12% Weapon Damage, +10% Reload Speed, +15 Shield.', bonuses: { damage: 0.12, reloadSpeed: 0.10, shield: 15 } },
        'human:mage': { name: 'Technomancer', icon: '⚡', desc: '+15% Elemental Damage, -10% Cooldowns, +20 Shield.', bonuses: { elementalBonus: 0.15, cooldownReduction: 0.10, shield: 20 } },
        'human:tank': { name: 'Exo-Juggernaut', icon: '🤖', desc: '+40 Max HP, +25 Shield, +8% Damage Reduction.', bonuses: { hp: 40, shield: 25, damageReduction: 0.08 } },
        'human:support': { name: 'Combat Corpsman', icon: '🩹', desc: '+15% Fire Rate, +20% Potion Heal, +1 Starting Grenade.', bonuses: { attackRate: 0.15, potionHeal: 0.20, grenades: 1 } },
        'elf:warrior': { name: 'Bladedancer', icon: '🌪️', desc: '+12% Move Speed, +10% Crit Chance, +15% Attack Rate.', bonuses: { moveSpeed: 0.12, critChance: 0.10, attackRate: 0.15 } },
        'elf:mage': { name: 'Astral Archon', icon: '✨', desc: '+20% Spell/Elemental Damage, +2/s Mana Regen, -10% Cooldowns.', bonuses: { spellDamage: 0.20, manaRegen: 2.0, cooldownReduction: 0.10 } },
        'elf:tank': { name: 'Warden Sentinel', icon: '🌳', desc: '+45 Max HP, +20 Shield, +10% Move Speed.', bonuses: { hp: 45, shield: 20, moveSpeed: 0.10 } },
        'elf:support': { name: 'Sylvan Alchemist', icon: '🌿', desc: '+15% Reload Speed, +20% Companion Damage, +2/s Mana Regen.', bonuses: { reloadSpeed: 0.15, companionDmg: 0.20, manaRegen: 2.0 } },
        'dwarf:warrior': { name: 'Ironbreaker', icon: '⚒️', desc: '+15% Melee & Shotgun/Pistol Damage, +35 Max HP, +6% DR.', bonuses: { meleeDamage: 0.15, damage: 0.12, hp: 35, damageReduction: 0.06 } },
        'dwarf:mage': { name: 'Runesmith', icon: '💎', desc: '+18% Blast & Elemental Damage, +25% Armor Shred.', bonuses: { blastDamage: 0.18, elementalBonus: 0.18, armorShred: 0.25 } },
        'dwarf:tank': { name: 'Walking Citadel', icon: '🏰', desc: '+65 Max HP, +10% Damage Reduction, +1 Starting Grenade.', bonuses: { hp: 65, damageReduction: 0.10, grenades: 1 } },
        'dwarf:support': { name: 'Forge Engineer', icon: '🔧', desc: '+30% Companion HP/Dmg, +20% Ammo Pool, +15% Reload Speed.', bonuses: { companionHp: 0.30, companionDmg: 0.30, ammoPool: 0.20, reloadSpeed: 0.15 } },
        'orc:warrior': { name: 'Bloodreaver', icon: '🪓', desc: '+15% Crit Damage, +12% Fire Rate, +3% Lifesteal.', bonuses: { critDamage: 0.15, attackRate: 0.12, lifesteal: 0.03 } },
        'orc:mage': { name: 'Hellfire Shaman', icon: '🔥', desc: '+18% Spell/Blast Damage, +12% Move Speed, +2% Lifesteal.', bonuses: { spellDamage: 0.18, blastDamage: 0.18, moveSpeed: 0.12, lifesteal: 0.02 } },
        'orc:tank': { name: 'Siege Behemoth', icon: '👹', desc: '+60 Max HP, +15% Melee Damage, +8% Sprint Speed.', bonuses: { hp: 60, meleeDamage: 0.15, sprintSpeed: 0.08 } },
        'orc:support': { name: 'Chem-Berserker', icon: '☣️', desc: '+15% Fire Rate, +15% Move Speed, +20% Potion Heal.', bonuses: { attackRate: 0.15, moveSpeed: 0.15, potionHeal: 0.20 } }
    };

    function getAllTrees() {
        return { ...RACE_SKILL_TREES, ...CLASS_SKILL_TREES };
    }

    function defaultSkillTrees() {
        const out = {};
        for (const key of Object.keys(RACE_SKILL_TREES)) out[key] = {};
        for (const key of Object.keys(CLASS_SKILL_TREES)) out[key] = {};
        return out;
    }

    function defaultPistolUpgrades() {
        return {
            ranks: {
                pistolDamage: 0,
                pistolFireRate: 0,
                pistolMag: 0,
                pistolReload: 0,
                pistolPrecision: 0
            },
            perks: []
        };
    }

    function normalizePistolUpgrades(raw) {
        const def = defaultPistolUpgrades();
        if (!raw || typeof raw !== 'object') return def;
        const ranks = { ...def.ranks };
        if (raw.ranks && typeof raw.ranks === 'object') {
            for (const k of Object.keys(ranks)) {
                const v = Number(raw.ranks[k]);
                if (Number.isFinite(v) && v >= 0) ranks[k] = Math.floor(v);
            }
        }
        const perks = Array.isArray(raw.perks) ? [...new Set(raw.perks.map(String))] : [];
        return { ranks, perks };
    }

    function normalizeSkillTrees(raw) {
        const out = defaultSkillTrees();
        if (!raw || typeof raw !== 'object') return out;
        for (const treeId of Object.keys(out)) {
            const src = raw[treeId];
            if (src && typeof src === 'object') {
                for (const [nodeId, rank] of Object.entries(src)) {
                    const n = Math.floor(Number(rank));
                    if (Number.isFinite(n) && n > 0) out[treeId][nodeId] = n;
                }
            }
        }
        return out;
    }

    function getTreeDef(treeId) {
        return RACE_SKILL_TREES[treeId] || CLASS_SKILL_TREES[treeId] || null;
    }

    function getNodeRank(treeId, nodeId, skillTrees) {
        return Math.max(0, Math.floor(Number(skillTrees?.[treeId]?.[nodeId]) || 0));
    }

    function getNodeCost(node, currentRank) {
        if (!node) return Infinity;
        return Math.round(node.baseCost * Math.pow(node.costMult || 1.5, currentRank));
    }

    function isNodeUnlocked(treeId, nodeId, skillTrees) {
        const tree = getTreeDef(treeId);
        if (!tree) return false;
        const node = tree.nodes.find(n => n.id === nodeId);
        if (!node) return false;
        if (!node.requires || !node.requires.length) return true;
        return node.requires.every(req => getNodeRank(treeId, req.id, skillTrees) >= (req.rank || 1));
    }

    function canUpgradeNode(treeId, nodeId, skillTrees, uusd) {
        const tree = getTreeDef(treeId);
        if (!tree) return { ok: false, reason: 'Unknown tree' };
        const node = tree.nodes.find(n => n.id === nodeId);
        if (!node) return { ok: false, reason: 'Unknown node' };
        const rank = getNodeRank(treeId, nodeId, skillTrees);
        if (rank >= node.maxRank) return { ok: false, reason: 'Max rank reached' };
        if (!isNodeUnlocked(treeId, nodeId, skillTrees)) return { ok: false, reason: 'Prerequisite locked' };
        const cost = getNodeCost(node, rank);
        if ((Number(uusd) || 0) < cost) return { ok: false, reason: `Need ${cost} $UUSD` };
        return { ok: true, cost, nextRank: rank + 1 };
    }

    function getTreePoints(treeId, skillTrees) {
        const map = skillTrees?.[treeId];
        if (!map || typeof map !== 'object') return 0;
        let sum = 0;
        for (const v of Object.values(map)) sum += Math.max(0, Math.floor(Number(v) || 0));
        return sum;
    }

    function getTotalSkillTreePoints(skillTrees) {
        let sum = 0;
        for (const treeId of Object.keys(getAllTrees())) sum += getTreePoints(treeId, skillTrees);
        return sum;
    }

    function getTreeSpentCost(treeId, skillTrees) {
        const tree = getTreeDef(treeId);
        if (!tree) return 0;
        let total = 0;
        for (const node of tree.nodes) {
            const rank = Math.min(node.maxRank, getNodeRank(treeId, node.id, skillTrees));
            for (let r = 0; r < rank; r++) total += getNodeCost(node, r);
        }
        return total;
    }

    function getPistolMarkLabel(totalRanks) {
        if (totalRanks >= 22) return 'MK V APEX';
        if (totalRanks >= 15) return 'MK IV';
        if (totalRanks >= 9) return 'MK III';
        if (totalRanks >= 4) return 'MK II';
        return '';
    }

    function computePermanentBuild(race, classType, armoryRanks = {}, pistolUpgradesRaw = {}, skillTreesRaw = {}) {
        const a = armoryRanks || {};
        const pistol = normalizePistolUpgrades(pistolUpgradesRaw);
        const trees = normalizeSkillTrees(skillTreesRaw);

        const build = {
            race,
            classType,
            bonusHp: (a.health || 0) * 25,
            hpRegenBonus: 0,
            maxShield: (a.shields || 0) * 15,
            shieldRegenBonus: (a.shields || 0) * 0.6,
            shieldDelayMult: Math.max(0.4, 1 - (a.cooldown || 0) * 0.08),

            moveSpeedMult: 1 + (a.speed || 0) * 0.08,
            sprintSpeedMult: 1 + (a.sprintSpeed || 0) * 0.10,
            slideSpeedMult: 1,
            slideCooldownMult: Math.max(0.45, 1 - (a.sprintSpeed || 0) * 0.08),
            jumpMult: 1 + (a.jumpHeight || 0) * 0.08,
            extraDoubleJumps: 0,
            jetpackThrustMult: 1,
            jetpackDrainMult: 1,
            airGravityMult: 1,

            damageMult: 1 + (a.damage || 0) * 0.12,
            spellDamageMult: 1 + (a.damage || 0) * 0.12,
            meleeDamageMult: 1 + (a.damage || 0) * 0.12,
            blastDamageMult: 1 + (a.grenades || 0) * 0.10,
            blastRadiusMult: 1,
            elementalBonusMult: 1,
            armorShredMult: 1,
            wardShredMult: 1,
            rifleDamageBonus: 0,
            pistolTreeDamageBonus: 0,
            airborneDamageBonus: 0,
            adsDamageBonus: 0,

            attackRateMult: 1 + (a.attackRate || 0) * 0.08,
            reloadSpeedMult: 1 + (a.reloadSpeed || 0) * 0.10,
            ammoPoolMult: 1 + (a.ammoPool || 0) * 0.15,
            magSizeMult: 1 + (a.ammoPool || 0) * 0.10,

            cooldownMult: Math.max(0.4, 1 - (a.cooldown || 0) * 0.08),
            dodgeCooldownMult: Math.max(0.4, 1 - (a.cooldown || 0) * 0.08),
            abilityDurationBonus: 0,

            startingGrenadesBonus: a.grenades || 0,
            maxGrenadesBonus: a.grenades || 0,
            startingPotionsBonus: a.potions || 0,
            maxPotionsBonus: a.potions || 0,
            potionHealMult: 1,

            critChanceBonus: (a.crit || 0) * 0.04,
            critDamageBonus: (a.crit || 0) * 0.10,
            headshotMultBonus: 0,
            spreadMult: 1,

            damageReduction: Math.min(0.65, (a.armor || 0) * 0.05),
            blockBonus: 0,
            lifestealPct: 0,
            greedMult: 1 + (a.greed || 0) * 0.20,
            pickupRangeMult: 1,

            manaMaxBonus: 0,
            manaRegenBonus: 0,
            rageGainMult: 1,

            companionHpMult: 1,
            companionDmgMult: 1,
            companionRateMult: 1,
            companionExtraRevives: 0,

            perks: {},
            activeSynergy: null,
            globalMasteryStacks: 0,
            pistol: {
                damageMult: 1 + (pistol.ranks.pistolDamage || 0) * 0.14,
                fireRateMult: 1 + (pistol.ranks.pistolFireRate || 0) * 0.11,
                magBonus: (pistol.ranks.pistolMag || 0) * 3,
                reserveBonus: (pistol.ranks.pistolMag || 0) * 18,
                reloadMult: 1 + (pistol.ranks.pistolReload || 0) * 0.14,
                spreadMult: Math.max(0.35, 1 - (pistol.ranks.pistolPrecision || 0) * 0.12),
                rangeBonus: (pistol.ranks.pistolPrecision || 0) * 75,
                headshotBonus: (pistol.ranks.pistolPrecision || 0) * 0.10,
                critBonus: pistol.perks.includes('pistol_hollowpoint') ? 0.15 : 0,
                armorShredMult: pistol.perks.includes('pistol_hollowpoint') ? 1.35 : 1,
                perks: new Set(pistol.perks),
                totalRanks: Object.values(pistol.ranks).reduce((s, n) => s + n, 0) + pistol.perks.length * 2,
                markLabel: ''
            }
        };

        const applyEffects = (eff, rank) => {
            if (!eff || rank <= 0) return;
            if (eff.hp) build.bonusHp += eff.hp * rank;
            if (eff.hpRegen) build.hpRegenBonus += eff.hpRegen * rank;
            if (eff.shield) build.maxShield += eff.shield * rank;
            if (eff.shieldRegen) build.shieldRegenBonus += eff.shieldRegen * rank;
            if (eff.shieldDelayReduction) build.shieldDelayMult *= Math.max(0.45, 1 - eff.shieldDelayReduction * rank);
            if (eff.moveSpeed) build.moveSpeedMult += eff.moveSpeed * rank;
            if (eff.sprintSpeed) build.sprintSpeedMult += eff.sprintSpeed * rank;
            if (eff.slideSpeed) build.slideSpeedMult += eff.slideSpeed * rank;
            if (eff.jumpHeight) build.jumpMult += eff.jumpHeight * rank;
            if (eff.jetpackThrust) build.jetpackThrustMult += eff.jetpackThrust * rank;
            if (eff.jetpackDrainReduction) build.jetpackDrainMult *= Math.max(0.3, 1 - eff.jetpackDrainReduction * rank);
            if (eff.airGravityReduction) build.airGravityMult *= Math.max(0.45, 1 - eff.airGravityReduction * rank);

            if (eff.damage) {
                build.damageMult += eff.damage * rank;
                build.spellDamageMult += eff.damage * rank;
                build.meleeDamageMult += eff.damage * rank;
            }
            if (eff.spellDamage) build.spellDamageMult += eff.spellDamage * rank;
            if (eff.meleeDamage) build.meleeDamageMult += eff.meleeDamage * rank;
            if (eff.blastDamage) build.blastDamageMult += eff.blastDamage * rank;
            if (eff.blastRadius) build.blastRadiusMult += eff.blastRadius * rank;
            if (eff.elementalBonus) build.elementalBonusMult += eff.elementalBonus * rank;
            if (eff.armorShred) build.armorShredMult += eff.armorShred * rank;
            if (eff.wardShred) build.wardShredMult += eff.wardShred * rank;
            if (eff.pistolDamage) build.pistolTreeDamageBonus += eff.pistolDamage * rank;
            if (eff.rifleDamage) build.rifleDamageBonus += eff.rifleDamage * rank;
            if (eff.airborneDamage) build.airborneDamageBonus += eff.airborneDamage * rank;
            if (eff.adsDamage) build.adsDamageBonus += eff.adsDamage * rank;

            if (eff.attackRate) build.attackRateMult += eff.attackRate * rank;
            if (eff.reloadSpeed) build.reloadSpeedMult += eff.reloadSpeed * rank;
            if (eff.ammoPool) build.ammoPoolMult += eff.ammoPool * rank;
            if (eff.magSize) build.magSizeMult += eff.magSize * rank;

            if (eff.cooldownReduction) build.cooldownMult *= Math.max(0.35, 1 - eff.cooldownReduction * rank);
            if (eff.dodgeCooldownReduction) build.dodgeCooldownMult *= Math.max(0.35, 1 - eff.dodgeCooldownReduction * rank);
            if (eff.abilityDuration) build.abilityDurationBonus += eff.abilityDuration * rank;

            if (eff.grenades) {
                build.startingGrenadesBonus += eff.grenades * rank;
                build.maxGrenadesBonus += eff.grenades * rank;
            }
            if (eff.potions) {
                build.startingPotionsBonus += eff.potions * rank;
                build.maxPotionsBonus += eff.potions * rank;
            }
            if (eff.potionHeal) build.potionHealMult += eff.potionHeal * rank;

            if (eff.critChance) build.critChanceBonus += eff.critChance * rank;
            if (eff.critDamage) build.critDamageBonus += eff.critDamage * rank;
            if (eff.headshotBonus) build.headshotMultBonus += eff.headshotBonus * rank;
            if (eff.spreadReduction) build.spreadMult *= Math.max(0.4, 1 - eff.spreadReduction * rank);

            if (eff.damageReduction) build.damageReduction = Math.min(0.70, build.damageReduction + eff.damageReduction * rank);
            if (eff.blockBonus) build.blockBonus += eff.blockBonus * rank;
            if (eff.lifesteal) build.lifestealPct += eff.lifesteal * rank;
            if (eff.greed) build.greedMult += eff.greed * rank;
            if (eff.pickupRange) build.pickupRangeMult += eff.pickupRange * rank;

            if (eff.mana) build.manaMaxBonus += eff.mana * rank;
            if (eff.manaRegen) build.manaRegenBonus += eff.manaRegen * rank;
            if (eff.rageGain) build.rageGainMult += eff.rageGain * rank;

            if (eff.companionHp) build.companionHpMult += eff.companionHp * rank;
            if (eff.companionDmg) build.companionDmgMult += eff.companionDmg * rank;
            if (eff.companionRate) build.companionRateMult += eff.companionRate * rank;
            if (eff.companionRevives) build.companionExtraRevives += eff.companionRevives * rank;

            if (eff.perk) build.perks[eff.perk] = rank;
        };

        // Apply active Race Tree + active Class Tree
        for (const treeId of [race, classType]) {
            const tree = getTreeDef(treeId);
            if (!tree) continue;
            for (const node of tree.nodes) {
                const rank = Math.min(node.maxRank, getNodeRank(treeId, node.id, trees));
                if (rank > 0) applyEffects(node.effects, rank);
            }
        }

        // Special rank-threshold tree bonuses
        if ((build.perks.d_springs || 0) >= 2) build.extraDoubleJumps += 1;
        if ((build.perks.d_demolition || 0) >= 1) {
            const extra = build.perks.d_demolition >= 3 ? 2 : 1;
            build.startingGrenadesBonus += extra;
            build.maxGrenadesBonus += extra;
        }
        if ((build.perks.t_explosive || 0) >= 1) {
            const extra = build.perks.t_explosive >= 3 ? 2 : 1;
            build.startingGrenadesBonus += extra;
            build.maxGrenadesBonus += extra;
        }
        if ((build.perks.s_botany || 0) >= 1) {
            const extra = build.perks.s_botany >= 3 ? 2 : 1;
            build.startingPotionsBonus += extra;
            build.maxPotionsBonus += extra;
        }

        // Global Account Mastery across ALL 8 trees: +2% HP, Damage, Greed per 5 total tree ranks
        const totalTreePts = getTotalSkillTreePoints(trees);
        const masteryStacks = Math.floor(totalTreePts / 5);
        build.globalMasteryStacks = masteryStacks;
        if (masteryStacks > 0) {
            build.bonusHp += masteryStacks * 5;
            build.damageMult += masteryStacks * 0.02;
            build.spellDamageMult += masteryStacks * 0.02;
            build.meleeDamageMult += masteryStacks * 0.02;
            build.greedMult += masteryStacks * 0.02;
        }

        // Active Race x Class Synergy Combo (requires >= 4 ranks in both active race & class trees)
        const racePts = getTreePoints(race, trees);
        const classPts = getTreePoints(classType, trees);
        const comboKey = `${race}:${classType}`;
        if (racePts >= 4 && classPts >= 4 && SYNERGY_COMBOS[comboKey]) {
            const syn = SYNERGY_COMBOS[comboKey];
            build.activeSynergy = syn;
            applyEffects(syn.bonuses, 1);
        }

        // Apply tree pistol bonus into pistol.damageMult
        if (build.pistolTreeDamageBonus > 0) {
            build.pistol.damageMult += build.pistolTreeDamageBonus;
        }
        build.pistol.markLabel = getPistolMarkLabel(build.pistol.totalRanks);
        build.pistol.tier = build.pistol.totalRanks;

        return build;
    }

    function applyPistolUpgradesToWeapon(weapon, permanentBuild) {
        if (!weapon || weapon.id !== 'sidearm' || !permanentBuild?.pistol) return weapon;
        const p = permanentBuild.pistol;
        const upgraded = { ...weapon };
        upgraded.damage = Math.round(upgraded.damage * p.damageMult * 10) / 10;
        upgraded.fireRate = Math.max(0.08, Math.round((upgraded.fireRate / p.fireRateMult) * 1000) / 1000);
        upgraded.magazine = upgraded.magazine + p.magBonus;
        upgraded.reserve = upgraded.reserve + p.reserveBonus;
        upgraded.reload = Math.max(0.35, Math.round((upgraded.reload / p.reloadMult) * 100) / 100);
        upgraded.spreadScale = Math.round(upgraded.spreadScale * p.spreadMult * 1000) / 1000;
        upgraded.range = upgraded.range + p.rangeBonus;
        upgraded.falloffStart = (upgraded.falloffStart || 300) + Math.round(p.rangeBonus * 0.6);
        upgraded.pistolTier = p.totalRanks;
        if (p.markLabel && !upgraded.name.includes('MK ')) {
            upgraded.name = `${upgraded.name} ${p.markLabel}`;
        }
        if (p.perks.has('pistol_ricochet') && !upgraded.trait) {
            upgraded.trait = 'ricochet';
            upgraded.traitLabel = 'Ricochet Rifling';
        }
        return upgraded;
    }

    function applyGlobalWeaponBonuses(weapon, permanentBuild) {
        if (!weapon || !permanentBuild) return weapon;
        const out = { ...weapon };
        if (permanentBuild.magSizeMult > 1) {
            const extraMag = Math.max(1, Math.round(out.magazine * (permanentBuild.magSizeMult - 1)));
            out.magazine += extraMag;
        }
        if (permanentBuild.ammoPoolMult > 1) {
            out.reserve = Math.round(out.reserve * permanentBuild.ammoPoolMult);
            if (out.secondaryReserve) {
                out.secondaryReserve = Math.round(out.secondaryReserve * permanentBuild.ammoPoolMult);
            }
        }
        return out;
    }

    window.GraveGainSkillTrees = {
        RACE_SKILL_TREES,
        CLASS_SKILL_TREES,
        SYNERGY_COMBOS,
        getAllTrees,
        getTreeDef,
        defaultSkillTrees,
        defaultPistolUpgrades,
        normalizeSkillTrees,
        normalizePistolUpgrades,
        getNodeRank,
        getNodeCost,
        isNodeUnlocked,
        canUpgradeNode,
        getTreePoints,
        getTotalSkillTreePoints,
        getTreeSpentCost,
        getPistolMarkLabel,
        computePermanentBuild,
        applyPistolUpgradesToWeapon,
        applyGlobalWeaponBonuses
    };
})();
