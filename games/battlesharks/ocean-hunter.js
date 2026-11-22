// BattleSharks 3D — 7-Stage Ocean Hunter Rail & Rank Grading
window.BSOceanHunter = (() => {
    'use strict';

    const STAGES = [
        { stage: 1, name: 'BS-07 Launch Sector', caption: 'Deploying Nautilus Hunter Mini-Sub from Bay 07...' },
        { stage: 2, name: 'Baroque Coral Reef', caption: 'Schools of prey scatter as predators close in.' },
        { stage: 3, name: 'Sunken Ruins', caption: 'Ancient stone arches hide territorial Sea Scorpions.' },
        { stage: 4, name: 'Tartarus Deep', caption: 'Sunlight fades. Engage Cyber-Spotlight.' },
        { stage: 5, name: 'Hydrothermal Trench', caption: 'Volcanic vents superheat the surrounding water.' },
        { stage: 6, name: 'Prehistoric Abyss', caption: 'Armored relics from a forgotten era awaken.' },
        { stage: 7, name: 'Guardian Sanctum', caption: 'Humanity trespassed too far. Face the Guardian.' }
    ];

    function computeArcadeRank(score, accuracy) {
        if (score >= 3000 && accuracy >= 0.7) return 'S';
        if (score >= 1800) return 'A';
        if (score >= 800) return 'B';
        return 'C';
    }

    return { STAGES, computeArcadeRank };
})();
