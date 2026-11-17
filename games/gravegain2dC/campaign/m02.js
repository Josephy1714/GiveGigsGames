(function() {
    'use strict';
    if (!window.GraveGainCampaign) return;
    window.GraveGainCampaign.registerMissionExtra(2, {
        dialogueBefore: [
            { speaker: 'Queen Aelindra', text: 'The Mother Tree bleeds. Twelve thousand years of ancestors, laid among her roots, climb out with burning red eyes - and a living Necromancer binds them to Hades’ array.', portrait: '🧝‍♀️' },
            { speaker: 'Private Lisa Park', text: 'Then we cut the strings. Twenty corruptors, one Necromancer - we will free your ancestors, Your Majesty.', portrait: '👩‍🚀' },
            { speaker: 'Valley Net', text: 'Tactical overlay: you deploy directly on warden floor 2. The Necromancer is already in the grove vaults with 20 corruptors - purge the guard and bring it down.', portrait: '👱🏻‍♀️' },
            { speaker: 'Queen Aelindra', text: 'My BrightEyes will light your path between the roots. The field still remembers who they were - strike true, and the forest will whisper your name.', portrait: '🧝‍♀️' },
            { speaker: 'Arty Fisher', text: 'The necromantic anchors are feeding the grove vaults. Smash all six you find, then we can cut the Necromancer off from Hades’ array.', portrait: '👨‍🔧' }
        ],
        dialogueAfter: [
            { speaker: 'Queen Aelindra', text: 'The grove breathes again. My ancestors sleep, the field purifies - the Mother Tree remembers your mercy.', portrait: '🧝‍♀️' },
            { speaker: 'Valley Net', text: 'Grove sector cleansed. Magical-field readings stabilizing - the forest whispers its gratitude, soldier.', portrait: '👱🏻‍♀️' }
        ],
        briefing: 'The Bioluminescent Forest Vaults hold the Elves’ holiest ground, where twelve millennia of dead were buried among the Mother Tree’s roots - and every one of them answered Hades’ signal on the night of red eyes. Deploy on warden floor 2, slay the 20 grove corruptors, and destroy the Corrupted Necromancer holding them.',
        threat: 'A Necromancer + 20 risen ancestors in the bleeding grove',
        bossDisplay: { name: 'CORRUPTED NECROMANCER', banner: 'Warden of the Bleeding Grove' },
        loreUnlocks: ['elven_chronicle', 'elven_matriarch_grave', 'necro_red_eyes'],
        parSeconds: 420,
        requisition: { bonusHp: 30, dmgMult: 1.1 },
        bossHpMult: 0.9,
        secondaryObjective: { id: 'anchor_breaker', desc: 'Shatter 6 necromantic anchors in the grove', count: 6, rewardGold: 100, rewardXp: 75 },
        introTitlecard: { title: 'MISSION 2 - CLEANSING THE ELVEN GROVES', subtitle: 'Echoes of the Green Chronicle' },
        minimapTheme: '#66bb6a',
        enemyDensityMult: 0.85,
        eliteChance: 0.04
    });
})();
