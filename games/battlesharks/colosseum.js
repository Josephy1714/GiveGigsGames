/**
 * BattleSharks Atlantis Colosseum, Human Arsenal & Customisation Hub
 */
(function (global) {
    const COLOSSEUM_MODES = [
        { id: 'shark_arena', name: 'Shark Arena (1v1)', icon: '⚔️', desc: 'One-on-one enhanced shark duel.', rewardCoins: 120, rewardTreasure: 3, rewardXP: 80 },
        { id: 'team_predator', name: 'Team Predator', icon: '🦈', desc: 'Squad battle with allied cyber-sharks.', rewardCoins: 180, rewardTreasure: 5, rewardXP: 120 },
        { id: 'human_vs_shark', name: 'Human vs Shark', icon: '🤿', desc: 'Human diver squad vs apex shark.', rewardCoins: 160, rewardTreasure: 4, rewardXP: 110 },
        { id: 'survival', name: 'Survival Waves', icon: '🌊', desc: 'Survive waves of hostile abyssal creatures.', rewardCoins: 200, rewardTreasure: 6, rewardXP: 150 },
        { id: 'capture_hunt', name: 'Capture Hunt', icon: '🎯', desc: 'Tranquilise & capture a rare shark for your Aquarium!', rewardCoins: 140, rewardTreasure: 4, rewardXP: 100, capturesShark: true, minRank: 0 },
        { id: 'hydra_moray', name: 'Hydra Moray (Elite)', icon: '🐍', desc: 'Challenge the multi-headed Hydra Moray!', rewardCoins: 260, rewardTreasure: 8, rewardXP: 180, minRank: 1 },
        { id: 'colosseum_boss', name: 'Giant Kraken Boss', icon: '🐙', desc: 'Face the legendary Giant Kraken in the Atlantis Colosseum!', rewardCoins: 350, rewardTreasure: 12, rewardXP: 250, minRank: 2 },
        { id: 'mosasaurus_prime', name: 'Mosasaurus Prime (Mythic)', icon: '🦖', desc: 'Ultimate Mythic boss challenge: Mosasaurus Prime!', rewardCoins: 500, rewardTreasure: 20, rewardXP: 400, minRank: 3 }
    ];

    const RANKS = [
        { name: 'Bronze', minWins: 0, unlock: 'Basic Arena' },
        { name: 'Silver', minWins: 2, unlock: 'Elite Encounters' },
        { name: 'Gold', minWins: 5, unlock: 'Advanced Monsters' },
        { name: 'Platinum', minWins: 9, unlock: 'Legendary Battles' },
        { name: 'Mythic', minWins: 14, unlock: 'Special Boss Challenges' }
    ];

    function getRankIndex(wins) {
        let idx = 0;
        RANKS.forEach((r, i) => { if (wins >= r.minWins) idx = i; });
        return idx;
    }

    const HUMAN_WEAPONS = [
        { id: 'harpoon_rifle', name: 'Harpoon Rifle', icon: '🔱', cost: 0, dmg: 25 },
        { id: 'spear_gun', name: 'Spear Gun', icon: '🏹', cost: 90, dmg: 32 },
        { id: 'underwater_ar', name: 'Underwater Assault Rifle', icon: '🔫', cost: 160, dmg: 42 },
        { id: 'shotgun', name: 'Abyssal Shotgun', icon: '💥', cost: 200, dmg: 55 },
        { id: 'heavy_cannon', name: 'Heavy Underwater Cannon', icon: '💣', cost: 320, dmg: 80 },
        { id: 'tranquiliser_gun', name: 'Tranquiliser Gun (Capture)', icon: '💉', cost: 0, dmg: 15 },
        { id: 'explosive_harpoon', name: 'Explosive Harpoon Launcher', icon: '🚀', cost: 400, dmg: 95 }
    ];

    const HUMAN_EQUIPMENT = [
        { id: 'diving_suit', name: 'Tactical Diving Suit', icon: '🤿', cost: 0 },
        { id: 'brass_helmet', name: 'Brass Diving Helmet', icon: '🪖', cost: 100 },
        { id: 'underwater_scooter', name: 'Underwater Scooter', icon: '🛵', cost: 180 },
        { id: 'mini_sub', name: 'Mini Submarine', icon: '🚤', cost: 350 },
        { id: 'jetpack', name: 'Hydro Jetpack', icon: '🚀', cost: 280 },
        { id: 'sonar', name: 'Enhanced Sonar', icon: '📡', cost: 140 },
        { id: 'torch', name: 'Abyssal Torch', icon: '🔦', cost: 70 },
        { id: 'oxygen_tank', name: 'Deep-Sea Oxygen Tank', icon: '🫧', cost: 0 }
    ];

    function openColosseum() {
        const modal = document.getElementById('colosseumModal');
        if (!modal) return;
        modal.classList.remove('hidden');
        renderColosseum();
    }

    function closeColosseum() {
        document.getElementById('colosseumModal')?.classList.add('hidden');
    }

    function renderColosseum() {
        const state = BSState.data;
        const grid = document.getElementById('colosseumGrid');
        const trophiesEl = document.getElementById('colosseumTrophies');
        const winsEl = document.getElementById('colosseumWins');
        if (trophiesEl) trophiesEl.textContent = state.colosseum.trophies;
        if (winsEl) winsEl.textContent = `${state.colosseum.wins} (${RANKS[getRankIndex(state.colosseum.wins)].name})`;
        if (!grid) return;

        const rankIdx = getRankIndex(state.colosseum.wins);
        grid.innerHTML = COLOSSEUM_MODES.map(m => {
            const reqRank = m.minRank || 0;
            const locked = rankIdx < reqRank;
            return `
            <div class="upgrade-card">
                <div class="upg-head"><span>${m.icon} ${m.name}</span></div>
                <p class="upg-desc">${m.desc}</p>
                <div class="upg-cost">Rewards: +${m.rewardCoins} 🪙 | +${m.rewardTreasure} 💎 | +${m.rewardXP} XP</div>
                <div class="upg-actions">
                    <button class="primary-btn small-btn col-fight-btn" data-id="${m.id}" ${locked ? 'disabled' : ''}>
                        ${locked ? '🔒 Requires ' + RANKS[reqRank].name : 'ENTER BATTLE'}
                    </button>
                </div>
            </div>
        `;
        }).join('');

        grid.querySelectorAll('.col-fight-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = COLOSSEUM_MODES.find(m => m.id === btn.dataset.id);
                if (!mode) return;
                const shark = BSState.getActiveShark();
                const sp = BSState.SHARK_SPECIES[shark.species] || BSState.SHARK_SPECIES.reef;
                const power = sp.baseAtk + state.sharkLevel * 5 + Object.values(shark.bionics || {}).filter(Boolean).length * 8;
                const winChance = Math.min(0.95, 0.55 + power * 0.005);
                const won = Math.random() < winChance;

                if (won) {
                    BSState.addCoins(mode.rewardCoins);
                    BSState.addTreasureCoins(mode.rewardTreasure);
                    BSState.addSharkXP(mode.rewardXP);
                    state.colosseum.wins += 1;
                    state.colosseum.trophies += 1;
                    let msg = `🏆 VICTORY in ${mode.name}!\nEarned +${mode.rewardCoins} 🪙, +${mode.rewardTreasure} 💎, +${mode.rewardXP} XP!`;
                    if (mode.capturesShark) {
                        const pool = ['great_white', 'hammerhead', 'tiger', 'megalodon', 'cyber'];
                        const picked = pool[Math.floor(Math.random() * pool.length)];
                        const captured = BSState.captureShark(picked);
                        msg += `\n🎯 Captured a ${captured.name} for your Aquarium!`;
                    }
                    BSState.save();
                    alert(msg);
                } else {
                    BSState.addSharkXP(Math.floor(mode.rewardXP * 0.3));
                    alert(`💥 Defeated in ${mode.name}! Upgrade your bionics in the Lab and try again. (+${Math.floor(mode.rewardXP * 0.3)} XP)`);
                }
                renderColosseum();
            });
        });
    }

    function openHumanArsenal() {
        const modal = document.getElementById('humanArsenalModal');
        if (!modal) return;
        modal.classList.remove('hidden');
        renderHumanArsenal();
    }

    function closeHumanArsenal() {
        document.getElementById('humanArsenalModal')?.classList.add('hidden');
    }

    function renderHumanArsenal() {
        const state = BSState.data;
        const wGrid = document.getElementById('humanWeaponsGrid');
        const eGrid = document.getElementById('humanEquipGrid');
        const lvlEl = document.getElementById('humanPlayerLevel');
        if (lvlEl) lvlEl.textContent = state.playerLevel;

        if (wGrid) {
            wGrid.innerHTML = HUMAN_WEAPONS.map(w => {
                const unlocked = state.human.unlockedWeapons.includes(w.id);
                const equipped = state.human.weapon === w.id;
                return `
                    <div class="upgrade-card">
                        <div class="upg-head"><span>${w.icon} ${w.name}</span><span class="upg-lvl">DMG ${w.dmg}</span></div>
                        <div class="upg-actions">
                            <button class="primary-btn small-btn hw-btn" data-id="${w.id}">
                                ${equipped ? '✓ Equipped' : (unlocked ? 'Equip' : 'Unlock (' + w.cost + ' 🪙)')}
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            wGrid.querySelectorAll('.hw-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const w = HUMAN_WEAPONS.find(x => x.id === btn.dataset.id);
                    if (!w) return;
                    if (!state.human.unlockedWeapons.includes(w.id)) {
                        if (state.coins < w.cost) return alert('Not enough Gold Coins!');
                        BSState.addCoins(-w.cost);
                        state.human.unlockedWeapons.push(w.id);
                    }
                    state.human.weapon = w.id;
                    BSState.save();
                    renderHumanArsenal();
                });
            });
        }

        if (eGrid) {
            eGrid.innerHTML = HUMAN_EQUIPMENT.map(eq => {
                const unlocked = state.human.unlockedEquipment.includes(eq.id);
                const equipped = state.human.equipment.includes(eq.id);
                return `
                    <div class="upgrade-card">
                        <div class="upg-head"><span>${eq.icon} ${eq.name}</span></div>
                        <div class="upg-actions">
                            <button class="primary-btn small-btn he-btn" data-id="${eq.id}">
                                ${equipped ? '✓ Equipped' : (unlocked ? 'Equip' : 'Unlock (' + eq.cost + ' 🪙)')}
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            eGrid.querySelectorAll('.he-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const eq = HUMAN_EQUIPMENT.find(x => x.id === btn.dataset.id);
                    if (!eq) return;
                    if (!state.human.unlockedEquipment.includes(eq.id)) {
                        if (state.coins < eq.cost) return alert('Not enough Gold Coins!');
                        BSState.addCoins(-eq.cost);
                        state.human.unlockedEquipment.push(eq.id);
                    }
                    if (state.human.equipment.includes(eq.id)) {
                        state.human.equipment = state.human.equipment.filter(i => i !== eq.id);
                    } else {
                        state.human.equipment.push(eq.id);
                    }
                    BSState.save();
                    renderHumanArsenal();
                });
            });
        }
    }

    function bindColosseumEvents() {
        document.getElementById('btnCloseColosseum')?.addEventListener('click', closeColosseum);
        document.getElementById('btnCloseHumanArsenal')?.addEventListener('click', closeHumanArsenal);
    }

    global.BSColosseum = {
        open: openColosseum,
        close: closeColosseum,
        openArsenal: openHumanArsenal,
        closeArsenal: closeHumanArsenal,
        bindEvents: bindColosseumEvents
    };
})(window);
