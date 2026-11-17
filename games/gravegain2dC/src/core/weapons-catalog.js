(function (root) {
    'use strict';

    var ns = root.GraveGainStubs = root.GraveGainStubs || {};
    var WEAPONS = [
        { id: 'relic-bolt', name: 'Relic Bolt', icon: '🔫', rarity: 'Common', minFloor: 1, damage: 22, interval: 0.22, speed: 34, life: 1.6, color: 0xfef08a, description: 'A dependable pilgrim’s sidearm.' },
        { id: 'choir-smg', name: 'Choir SMG', icon: '🎼', rarity: 'Common', minFloor: 1, damage: 11, interval: 0.105, speed: 30, life: 1.25, color: 0x67e8f9, description: 'A quick burst of close-range fire.' },
        { id: 'chapel-scatterer', name: 'Chapel Scatterer', icon: '💥', rarity: 'Common', minFloor: 1, damage: 9, interval: 0.62, speed: 27, life: 0.8, pellets: 5, spread: 0.24, color: 0xfda4af, description: 'Five-pellet spread for point-blank crowds.' },
        { id: 'bone-repeater', name: 'Bone Repeater', icon: '🦴', rarity: 'Common', minFloor: 1, damage: 16, interval: 0.3, speed: 32, life: 1.25, armorPen: 0.45, color: 0xe2e8f0, description: 'A steady burst that pierces 45% of armor.' },
        { id: 'moonneedle', name: 'Moonneedle', icon: '🌙', rarity: 'Common', minFloor: 1, damage: 17, interval: 0.36, speed: 42, life: 1.8, pierce: 2, color: 0xc4b5fd, description: 'A thin shot that passes through two foes.' },
        { id: 'sunspike', name: 'Sunspike Carbine', icon: '☀️', rarity: 'Uncommon', minFloor: 2, damage: 31, interval: 0.42, speed: 48, life: 1.9, color: 0xfbbf24, description: 'Long range, hard hitting, and precise.' },
        { id: 'frostbite', name: 'Frostbite', icon: '❄️', rarity: 'Uncommon', minFloor: 2, damage: 20, interval: 0.28, speed: 30, life: 1.4, color: 0x7dd3fc, slow: 0.65, description: 'Chilling rounds briefly slow their target.' },
        { id: 'hexsprayer', name: 'Hexsprayer', icon: '🟣', rarity: 'Uncommon', minFloor: 2, damage: 8, interval: 0.12, speed: 25, life: 1.1, pellets: 2, spread: 0.12, color: 0xc084fc, description: 'Twin bolts saturate a narrow lane.' },
        { id: 'stormcall', name: 'Stormcall', icon: '⚡', rarity: 'Uncommon', minFloor: 2, damage: 18, interval: 0.25, speed: 38, life: 1.5, pierce: 1, color: 0x38bdf8, description: 'Lightning arcs through the first target.' },
        { id: 'warden-maul', name: 'Warden Maul', icon: '🔨', rarity: 'Uncommon', minFloor: 2, damage: 48, interval: 0.82, speed: 21, life: 1.3, knockback: 1.8, color: 0xfb923c, description: 'A slow slug with a brutal impact.' },
        { id: 'ashen-flare', name: 'Ashen Flare', icon: '🔥', rarity: 'Rare', minFloor: 4, damage: 43, interval: 0.68, speed: 19, life: 1.5, explosive: true, radius: 3.2, color: 0xf97316, description: 'Explodes on impact and scorches a small area.' },
        { id: 'bloomcaster', name: 'Bloomcaster', icon: '🌺', rarity: 'Rare', minFloor: 4, damage: 24, interval: 0.34, speed: 29, life: 1.5, pellets: 3, spread: 0.09, color: 0xf472b6, description: 'A fan of three living thorns.' },
        { id: 'bloodsinger', name: 'Bloodsinger', icon: '🩸', rarity: 'Rare', minFloor: 4, damage: 21, interval: 0.22, speed: 36, life: 1.6, pierce: 1, color: 0xfb7185, healOnHit: 2, description: 'Piercing shots return a little stolen vitality.' },
        { id: 'cinderbloom', name: 'Cinderbloom', icon: '🌋', rarity: 'Rare', minFloor: 4, damage: 15, interval: 0.54, speed: 24, life: 1.3, pellets: 6, spread: 0.28, color: 0xf97316, description: 'A wide blast of ember shards.' },
        { id: 'oathbreaker', name: 'Oathbreaker', icon: '🗡️', rarity: 'Rare', minFloor: 4, damage: 36, interval: 0.38, speed: 39, life: 1.7, pierce: 1, bossBonus: 1.25, color: 0xa3e635, description: 'Deals extra damage to elites and bosses.' },
        { id: 'tomb-bell', name: 'Tomb Bell', icon: '🔔', rarity: 'Epic', minFloor: 7, damage: 54, interval: 0.78, speed: 18, life: 1.4, explosive: true, radius: 4.2, color: 0xfacc15, description: 'A resonant shell that bursts in a wide ring.' },
        { id: 'starfall', name: 'Starfall', icon: '☄️', rarity: 'Epic', minFloor: 7, damage: 28, interval: 0.32, speed: 44, life: 1.8, pellets: 3, spread: 0.08, pierce: 1, color: 0x22d3ee, description: 'Three fast shards, each able to pierce a foe.' },
        { id: 'last-rites', name: 'Last Rites', icon: '🕯️', rarity: 'Epic', minFloor: 7, damage: 32, interval: 0.25, speed: 34, life: 1.6, color: 0xf5d0fe, executeBonus: 1.8, description: 'Hits harder against enemies near death.' },
        { id: 'titan-debt', name: 'Titan’s Debt', icon: '🪨', rarity: 'Epic', minFloor: 7, damage: 78, interval: 1.0, speed: 17, life: 1.3, knockback: 3.2, color: 0x94a3b8, description: 'A devastating slug that hurls enemies away.' },
        { id: 'black-sun', name: 'Black Sun', icon: '🌑', rarity: 'Legendary', minFloor: 10, damage: 62, interval: 0.55, speed: 24, life: 1.8, explosive: true, radius: 4.8, color: 0xe879f9, bossBonus: 1.4, description: 'A void round that tears through crowds and bosses.' }
    ];

    function getWeapon(id) {
        var weapon = WEAPONS.find(function (item) { return item.id === id; }) || WEAPONS[0];
        return Object.assign({}, weapon);
    }

    function listWeapons() {
        return WEAPONS.map(function (weapon) { return Object.assign({}, weapon); });
    }

    function getDrop(rng, floorIndex, ownedIds) {
        var floor = Math.max(1, Number(floorIndex) || 1);
        var owned = Array.isArray(ownedIds) ? ownedIds : [];
        var candidates = WEAPONS.filter(function (weapon) { return weapon.minFloor <= floor && owned.indexOf(weapon.id) < 0; });
        if (!candidates.length) candidates = WEAPONS.filter(function (weapon) { return weapon.minFloor <= floor; });
        if (!candidates.length) return getWeapon('relic-bolt');
        var idx = rng && typeof rng.int === 'function' ? rng.int(0, candidates.length - 1) : Math.floor(Math.random() * candidates.length);
        return Object.assign({}, candidates[idx]);
    }

    ns.weaponsCatalog = {
        version: 1,
        getWeapon: getWeapon,
        listWeapons: listWeapons,
        getDrop: getDrop
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = ns.weaponsCatalog;
})(typeof globalThis !== 'undefined' ? globalThis : window);
