/**
 * BattleSharks Shark Mutation Laboratory:
 * Physical Customisation & Mechanical Bionic Upgrades
 */
(function (global) {
    const BIONIC_UPGRADES = [
        { id: 'mechanicalJaws', name: 'Mechanical Jaws', icon: '🦾', cost: 120, desc: '+25% Bite Damage' },
        { id: 'armouredSkull', name: 'Armoured Skull', icon: '🛡️', cost: 140, desc: 'Ramming resistance' },
        { id: 'reinforcedTeeth', name: 'Reinforced Teeth', icon: '🦷', cost: 100, desc: 'Pierces sub armour' },
        { id: 'cyberneticFins', name: 'Cybernetic Fins', icon: '⚡', cost: 130, desc: '+15% Turn Speed' },
        { id: 'mechanicalTail', name: 'Mechanical Tail', icon: '🚀', cost: 150, desc: '+20% Swim Speed' },
        { id: 'laserSystems', name: 'Laser Systems', icon: '🔴', cost: 200, desc: 'Twin dorsal lasers' },
        { id: 'electricalDefence', name: 'Electrical Defence', icon: '🌩️', cost: 180, desc: 'Shockwave aura' },
        { id: 'armouredPlating', name: 'Armoured Body Plating', icon: '🔩', cost: 160, desc: '+40 Max HP' },
        { id: 'enhancedSonar', name: 'Enhanced Sonar', icon: '📡', cost: 110, desc: 'Detects rare sharks' }
    ];

    const CUSTOM_OPTIONS = {
        pattern: ['none', 'striped', 'spotted', 'abyssal', 'neon'],
        finShape: ['classic', 'cyber-blade', 'megalodon'],
        tailShape: ['crescent', 'twin-jet', 'whip'],
        eyeColor: ['#22d3ee', '#ef4444', '#eab308', '#a855f7'],
        glowingMarkings: ['none', 'bioluminescent', 'plasma'],
        scars: ['none', 'battle-scars', 'deep-slash']
    };

    function renderLabCustom() {
        const container = document.getElementById('labCustomContainer');
        if (!container || !window.BSState) return;
        const shark = BSState.getActiveShark();
        const state = BSState.data;

        const customHtml = `
            <div class="lab-section-title">🎨 Physical Customisation (${shark.name})</div>
            <div class="custom-grid">
                ${Object.entries(CUSTOM_OPTIONS).map(([key, vals]) => `
                    <div class="custom-row">
                        <label>${key.replace(/([A-Z])/g, ' $1').toUpperCase()}</label>
                        <select class="aq-input lab-custom-sel" data-key="${key}">
                            ${vals.map(v => `<option value="${v}" ${(shark.customisation?.[key] || vals[0]) === v ? 'selected' : ''}>${v}</option>`).join('')}
                        </select>
                    </div>
                `).join('')}
            </div>
            <div class="lab-section-title" style="margin-top:12px;">🦾 Mechanical Bionic Upgrades (Coins: ${state.coins} 🪙)</div>
            <div class="upgrades-grid">
                ${BIONIC_UPGRADES.map(b => {
                    const owned = Boolean(shark.bionics?.[b.id]);
                    return `
                        <div class="upgrade-card">
                            <div class="upg-head"><span>${b.icon} ${b.name}</span></div>
                            <p class="upg-desc">${b.desc}</p>
                            <div class="upg-actions">
                                <button class="primary-btn small-btn bionic-buy-btn" data-id="${b.id}" ${owned ? 'disabled' : ''}>
                                    ${owned ? '✓ Installed' : 'Install (' + b.cost + ' 🪙)'}
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        container.innerHTML = customHtml;

        container.querySelectorAll('.lab-custom-sel').forEach(sel => {
            sel.addEventListener('change', (e) => {
                shark.customisation = shark.customisation || {};
                shark.customisation[sel.dataset.key] = e.target.value;
                BSState.save();
            });
        });

        container.querySelectorAll('.bionic-buy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const b = BIONIC_UPGRADES.find(x => x.id === btn.dataset.id);
                if (!b || shark.bionics?.[b.id]) return;
                if (state.coins < b.cost) return alert(`Need ${b.cost} Gold Coins!`);
                BSState.addCoins(-b.cost);
                shark.bionics = shark.bionics || {};
                shark.bionics[b.id] = true;
                BSState.save();
                renderLabCustom();
            });
        });
    }

    global.BSLabCustom = { render: renderLabCustom };
})(window);
