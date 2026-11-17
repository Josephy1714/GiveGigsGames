(function() {
    'use strict';
    if (!window.GraveGainCampaign) return;
    window.GraveGainCampaign.registerMissionExtra(4, {
        dialogueBefore: [
            { speaker: 'Warchief Groknak', text: 'WEAK DEAD-THINGS SIEGE ME CLAN GATES! THIRTY SKULLS AT THE REDOUBTS AND A COWARD BERSERKER HIDING BELOW! ORCS DO NOT DIE SITTING DOWN - TO WAR!!!', portrait: '👹' },
            { speaker: 'Private Lisa Park', text: 'Hold the gates with Groknak, guns up - thirty risen Orcs and Goblins between us and the warden floor. Spacing, squad - give his Rage room to work.', portrait: '👩‍🚀' },
            { speaker: 'Valley Net', text: 'Overlay: you deploy in the Crimson Sand Redoubts on floor 4. The Berserker holds the inner sector with thirty risen attackers. Human personnel, maintain spacing from Raging friendlies.', portrait: '👱🏻‍♀️' },
            { speaker: 'Arty Fisher', text: 'LuckyStarShip artillery is spinning up but it needs a clean lock - break the siege line first, then the sky finishes the argument. In Realtime or Chrono, a well-timed explosive can thin the attackers before the Berserker closes.', portrait: '👨‍🔧' },
            { speaker: 'Warchief Groknak', text: 'YOU HIT LIKE AN ORC TODAY, SMALL HUMAN! NOW SCREAM WITH ME - GRAAAH!', portrait: '👹' }
        ],
        dialogueAfter: [
            { speaker: 'Warchief Groknak', text: 'GRAAAH! GOOD FIGHTING! You hit like an Orc warrior today - the wastes remember your scream!', portrait: '👹' },
            { speaker: 'Valley Net', text: 'Redoubt siege broken. Clan gates holding, artillery standing down. The Southern Wastes are yours, soldier.', portrait: '👱🏻‍♀️' }
        ],
        briefing: 'The Crimson Sand Redoubts of the Southern Wastes are under full siege: thirty risen Orc and Goblin zeds press the clan gates while a Huge Berserker holds the inner sector. Deploy on floor 4, break the siege kill by kill, and slay the Berserker before the clan gates fall.',
        threat: '30 zeds at the gates and a Berserker below',
        bossDisplay: { name: 'HUGE ORC ZED BERSERKER', banner: 'Siege-Breaker of the Wastes' },
        loreUnlocks: ['orc_regeneration', 'orc_rage_book', 'goblin_mass_grave'],
        parSeconds: 540,
        requisition: { bonusHp: 60, dmgMult: 1.2 },
        bossHpMult: 1.0,
        secondaryObjective: { id: 'siege_breaker', desc: 'Destroy 10 elite siege-ram zeds at the gates', count: 10, rewardGold: 175, rewardXp: 125 },
        introTitlecard: { title: 'MISSION 4 - ORC NOMAD OUTPOST SIEGE', subtitle: 'Rage of the Southern Wastes' },
        minimapTheme: '#ff7043',
        enemyDensityMult: 1.1,
        eliteChance: 0.08
    });
})();
