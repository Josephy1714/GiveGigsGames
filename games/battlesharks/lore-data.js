// BattleSharks 3D — Bestiary, Biome Lore, Bounties & Achievements
window.BSLore = (() => {
    'use strict';

    const BIOMES = [
        { id: 'shallows', name: 'BS-07 Shallows', minDepth: 0, maxDepth: 45, desc: 'Sunlit research sector surrounding BS-07 Aquarium Complex.' },
        { id: 'reef', name: 'Baroque Coral Reef', minDepth: 45, maxDepth: 95, desc: 'Vibrant bioluminescent coral arches teeming with schooling prey.' },
        { id: 'ruins', name: 'Sunken Ruins', minDepth: 95, maxDepth: 145, desc: 'Ancient submerged temples patrolled by Cyber Divers and Sea Scorpions.' },
        { id: 'trench', name: 'Deep Trenches', minDepth: 145, maxDepth: 220, desc: 'Crushing pressure zone where Bone-Plated Jaw Fish ambush intruders.' },
        { id: 'abyss', name: 'Abyssal Caverns', minDepth: 220, maxDepth: 320, desc: 'Pitch-black volcanic depths lit only by magma vents and Cyclops relics.' }
    ];

    const BOUNTIES = [
        { id: 'eat_15', title: 'Apex Appetite', desc: 'Devour 15 prey in a single dive', target: 15, rewardCoins: 50 },
        { id: 'kill_5', title: 'Mine Sweeper', desc: 'Destroy 5 enemies or mines', target: 5, rewardCoins: 75 },
        { id: 'depth_150', title: 'Into the Abyss', desc: 'Reach 150m depth', target: 150, rewardCoins: 100 },
        { id: 'chest_2', title: 'Treasure Hunter', desc: 'Open 2 sunken Treasure Chests', target: 2, rewardCoins: 80 }
    ];

    const ACHIEVEMENTS = [
        { id: 'first_bite', name: 'First Blood', desc: 'Devour your first prey.' },
        { id: 'boss_slayer', name: 'Titan Slayer', desc: 'Defeat any Ocean Boss.' },
        { id: 'abyss_walker', name: 'Abyssal Explorer', desc: 'Dive below 250 meters.' },
        { id: 'sub_ace', name: 'Ocean Hunter Ace', desc: 'Defeat 10 enemies in Human Sub Gunner mode.' }
    ];

    return { BIOMES, BOUNTIES, ACHIEVEMENTS };
})();
