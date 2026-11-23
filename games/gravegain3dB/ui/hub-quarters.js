(function() {
    'use strict';

    const GameData = window.GraveGainGameData || {};
    const RaceData = GameData.RaceData || {};
    const ClassType = GameData.ClassType || {};
    const ClassData = GameData.ClassData || {};
    const QuartersUpgrades = GameData.QuartersUpgrades || [];
    const BotanySeeds = GameData.BotanySeeds || [];
    const ArmoryUpgrades = GameData.ArmoryUpgrades || [];
    const PistolUpgrades = GameData.PistolUpgrades || [];
    const PistolPerks = GameData.PistolPerks || [];

    class GraveGainHubQuartersController {
        constructor(game) {
            this.game = game;
            this.armoryCategory = 'all';
            this.activeSkillTreeId = 'human';
            this.selectedSkillNodeId = 'h_core';
            this._quickConvertBound = false;
        }

        updateHubBalances() {
            const goldEl = document.getElementById('hubBalanceGold');
            const uusdEl = document.getElementById('hubBalanceUusd');
            const convBtn = document.getElementById('btnHubQuickConvert');
            if (goldEl) goldEl.textContent = String(this.game.gold || 0);
            if (uusdEl) uusdEl.textContent = String(this.game.uusd || 0);
            if (convBtn) {
                convBtn.disabled = (this.game.gold || 0) < 10;
                if (!this._quickConvertBound) {
                    this._quickConvertBound = true;
                    convBtn.addEventListener('click', () => {
                        if ((this.game.gold || 0) >= 10) {
                            this.game.gold -= 10;
                            this.game.uusd += 100;
                            this.game.audio?.playSfx('loot');
                            this.updateHubBalances();
                            this.renderArmory();
                            this.renderPistolWorkshop();
                            this.renderSkillTrees();
                            this.game.saveSave();
                        }
                    });
                }
            }
        }

        renderCharSelect() {
            const SkillTrees = window.GraveGainSkillTrees;
            const prevRace = document.querySelector('#raceGrid .char-card.selected')?.dataset.race || 'human';
            const prevClass = document.querySelector('#classGrid .class-btn.selected')?.dataset.class || Object.values(ClassType)[0] || 'warrior';
            const raceGrid = document.getElementById('raceGrid');
            if (raceGrid) {
                raceGrid.innerHTML = Object.keys(RaceData).map((key) => {
                    const race = RaceData[key];
                    const pts = SkillTrees ? SkillTrees.getTreePoints(key, this.game.skillTrees) : 0;
                    const badge = pts > 0 ? `<div class="char-tree-badge">🌳 Tree ${pts} pts</div>` : `<div class="char-tree-badge muted">🌳 Tree 0 pts</div>`;
                    return `
                        <div class="char-card ${key === prevRace ? 'selected' : ''}" data-race="${key}">
                            <span class="char-emoji">${race.emoji}</span>
                            <div class="char-name">${race.name}</div>
                            <div class="char-desc">${race.desc}</div>
                            ${badge}
                        </div>
                    `;
                }).join('');

                raceGrid.querySelectorAll('.char-card').forEach(card => {
                    card.addEventListener('click', () => {
                        raceGrid.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
                        card.classList.add('selected');
                        this.renderStartingWeaponGrid(card.dataset.race);
                    });
                });
            }

            const classGrid = document.getElementById('classGrid');
            if (classGrid) {
                classGrid.innerHTML = Object.values(ClassType).map((cls) => {
                    const c = ClassData[cls];
                    const pts = SkillTrees ? SkillTrees.getTreePoints(cls, this.game.skillTrees) : 0;
                    return `<button class="class-btn ${cls === prevClass ? 'selected' : ''}" data-class="${cls}">${c.title.toUpperCase()} <span class="class-tree-pts">(${pts})</span></button>`;
                }).join('');

                classGrid.querySelectorAll('.class-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        classGrid.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                    });
                });
            }

            this.renderStartingWeaponGrid(prevRace);
        }

        renderStartingWeaponGrid(race) {
            const grid = document.getElementById('startingWeaponGrid');
            if (!grid) return;
            const list = GameData.RaceStartingWeapons?.[race] || [];
            if (!this.selectedStartingWeapons) this.selectedStartingWeapons = {};
            const isUnlocked = (w) => {
                if (!w.unlockArmoryId) return true;
                return typeof this.game.isStartingWeaponUnlocked === 'function'
                    ? this.game.isStartingWeaponUnlocked(race, w.id)
                    : ((this.game.armoryRanks?.[w.unlockArmoryId] || 0) >= 1);
            };
            let chosen = this.selectedStartingWeapons[race] || list[0]?.id;
            const chosenObj = list.find(w => w.id === chosen);
            if (!chosenObj || !isUnlocked(chosenObj)) chosen = list[0]?.id;
            this.selectedStartingWeapons[race] = chosen;

            grid.innerHTML = list.map(w => {
                const unlocked = isUnlocked(w);
                const selected = unlocked && w.id === chosen;
                const cost = w.unlockCost || 220;
                const canAfford = (this.game.uusd || 0) >= cost;
                let extraNote = '';
                if (w.id === 'sidearm' && window.GraveGainSkillTrees) {
                    const pu = window.GraveGainSkillTrees.normalizePistolUpgrades(this.game.pistolUpgrades);
                    const total = Object.values(pu.ranks).reduce((s, n) => s + n, 0) + pu.perks.length * 2;
                    const mark = window.GraveGainSkillTrees.getPistolMarkLabel(total);
                    if (mark) extraNote = ` <span class="starting-weapon-mk">${mark}</span>`;
                }
                return `
                    <div class="starting-weapon-card ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}" data-weapon="${w.id}">
                        <div class="starting-weapon-head">
                            <span class="starting-weapon-icon">${w.icon}</span>
                            <strong>${w.name}${extraNote}</strong>
                        </div>
                        <div class="starting-weapon-desc">${w.desc}</div>
                        ${unlocked
                            ? `<div class="starting-weapon-status">${selected ? '✓ EQUIPPED' : 'Click to select'}</div>`
                            : `<div class="starting-weapon-lock">
                                <span>🔒 Locked · Armory (${cost} $UUSD) or Human Tree</span>
                                <button type="button" class="btn-game btn-primary starting-weapon-unlock-btn" ${canAfford ? '' : 'disabled'} data-unlock-armory="${w.unlockArmoryId}" style="font-size:0.7rem; padding:4px 9px;">Unlock (${cost} $UUSD)</button>
                            </div>`}
                    </div>
                `;
            }).join('');

            grid.querySelectorAll('.starting-weapon-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.starting-weapon-unlock-btn')) return;
                    const wid = card.dataset.weapon;
                    const w = list.find(item => item.id === wid);
                    if (!w || !isUnlocked(w)) return;
                    this.selectedStartingWeapons[race] = wid;
                    this.renderStartingWeaponGrid(race);
                });
            });

            grid.querySelectorAll('.starting-weapon-unlock-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const armoryId = btn.dataset.unlockArmory;
                    this.buyArmoryUpgrade(armoryId);
                    this.selectedStartingWeapons[race] = 'double_barrel';
                    this.renderStartingWeaponGrid(race);
                });
            });
        }

        updateHubQuartersUI() {
            const levelEl = document.getElementById('hubQuartersLevel');
            if (!levelEl) return;
            levelEl.textContent = `Level ${this.game.quartersLevel}`;
            const upgrade = QuartersUpgrades[this.game.quartersLevel - 1];
            if (upgrade) {
                document.getElementById('hubQuartersSize').textContent = upgrade.size;
                document.getElementById('hubQuartersCapacity').textContent = `${upgrade.capacity} Space`;
            }

            if (this.game.quartersLevel < 6) {
                const nextUpgrade = QuartersUpgrades[this.game.quartersLevel];
                document.getElementById('hubQuartersCost').textContent = `${nextUpgrade.cost} $UUSD`;
            } else {
                document.getElementById('hubQuartersCost').textContent = 'MAX LEVEL REACHED';
            }
        }

        renderArmory() {
            this.updateHubBalances();
            const filterBar = document.getElementById('armoryFilterBar');
            const categories = [
                { id: 'all', label: 'All' },
                { id: 'vitality', label: '🧬 Vitality & Shields' },
                { id: 'offense', label: '⚡ Offense & Crit' },
                { id: 'handling', label: '🔫 Ammo, Reload & Nades' },
                { id: 'mobility', label: '🏃 Speed, Jump & CD' },
                { id: 'economy', label: '🪙 Economy' }
            ];
            if (filterBar) {
                filterBar.innerHTML = categories.map(cat => `
                    <button type="button" class="armory-filter-btn ${this.armoryCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">${cat.label}</button>
                `).join('');
                filterBar.querySelectorAll('.armory-filter-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.armoryCategory = btn.dataset.cat;
                        this.renderArmory();
                    });
                });
            }

            const grid = document.getElementById('armoryGrid');
            if (!grid) return;

            const filtered = this.armoryCategory === 'all'
                ? ArmoryUpgrades
                : ArmoryUpgrades.filter(u => u.category === this.armoryCategory);

            grid.innerHTML = filtered.map(u => {
                const rank = this.game.armoryRanks[u.id] || 0;
                const cost = Math.round(u.baseCost * Math.pow(u.mult, rank));
                const isMax = rank >= u.maxRank;
                const canAfford = (this.game.uusd || 0) >= cost;

                return `
                    <div class="armory-card ${isMax ? 'is-max' : (canAfford ? 'can-afford' : '')}">
                        <div class="armory-header">
                            <span class="armory-icon">${u.icon}</span>
                            <div>
                                <div class="armory-title">${u.name}</div>
                                <div class="armory-level">Rank ${rank} / ${u.maxRank}</div>
                            </div>
                        </div>
                        <div class="armory-desc">${u.desc}</div>
                        <div class="armory-footer">
                            <span class="highlight-cyan" style="font-size:0.85rem;">${isMax ? 'MAX RANK' : `${cost} $UUSD`}</span>
                            ${isMax ? '<span class="armory-max-pill">MAXED</span>' : `<button class="btn-game btn-primary" ${canAfford ? '' : 'disabled'} style="font-size:0.75rem; padding:6px 12px;" onclick="window.GraveGainGame.buyArmoryUpgrade('${u.id}')">Upgrade</button>`}
                        </div>
                    </div>
                `;
            }).join('');
        }

        buyArmoryUpgrade(upgradeId) {
            const u = ArmoryUpgrades.find(item => item.id === upgradeId);
            if (!u) return;

            const rank = this.game.armoryRanks[u.id] || 0;
            if (rank >= u.maxRank) return;

            const cost = Math.round(u.baseCost * Math.pow(u.mult, rank));
            if (this.game.uusd >= cost) {
                this.game.uusd -= cost;
                this.game.armoryRanks[u.id] = rank + 1;
                this.game.audio.playSfx('levelup');
                this.renderArmory();
                this.game.saveSave();
            }
        }

        renderPistolWorkshop() {
            this.updateHubBalances();
            const SkillTrees = window.GraveGainSkillTrees;
            const summary = document.getElementById('pistolWorkshopSummary');
            const grid = document.getElementById('pistolUpgradesGrid');
            const perksGrid = document.getElementById('pistolPerksGrid');
            if (!grid || !perksGrid) return;

            const pu = SkillTrees
                ? SkillTrees.normalizePistolUpgrades(this.game.pistolUpgrades)
                : (this.game.pistolUpgrades || { ranks: {}, perks: [] });
            this.game.pistolUpgrades = pu;

            const basePistol = { id: 'sidearm', name: 'SERVICE PISTOL', damage: 31, fireRate: 0.26, magazine: 12, reserve: 60, reload: 1.25, range: 650, spreadScale: 0.8 };
            const previewBuild = SkillTrees
                ? SkillTrees.computePermanentBuild('human', 'warrior', this.game.armoryRanks, pu, this.game.skillTrees)
                : null;
            const upgradedPistol = SkillTrees && previewBuild
                ? SkillTrees.applyGlobalWeaponBonuses(SkillTrees.applyPistolUpgradesToWeapon(basePistol, previewBuild), previewBuild)
                : basePistol;
            const totalStatRanks = Object.values(pu.ranks).reduce((s, n) => s + (Number(n) || 0), 0);
            const totalTier = previewBuild?.pistol?.totalRanks || totalStatRanks;
            const mark = previewBuild?.pistol?.markLabel || 'STANDARD';

            if (summary) {
                const rpm = Math.round(60 / Math.max(0.05, upgradedPistol.fireRate));
                summary.innerHTML = `
                    <div class="pistol-summary-head">
                        <div>
                            <div class="pistol-mark-badge">🔫 ${upgradedPistol.name}</div>
                            <div style="font-size:0.78rem; color:var(--grave-text-muted); margin-top:4px;">Tier ${mark || 'STANDARD'} · ${totalStatRanks} Stat Ranks · ${pu.perks.length}/${PistolPerks.length} Sidearm Perks</div>
                        </div>
                        <div class="pistol-stat-pills">
                            <span>DMG <strong>${upgradedPistol.damage}</strong></span>
                            <span>RPM <strong>${rpm}</strong></span>
                            <span>MAG <strong>${upgradedPistol.magazine}/${upgradedPistol.reserve}</strong></span>
                            <span>RELOAD <strong>${upgradedPistol.reload}s</strong></span>
                            <span>RANGE <strong>${upgradedPistol.range}</strong></span>
                        </div>
                    </div>
                `;
            }

            grid.innerHTML = PistolUpgrades.map(u => {
                const rank = pu.ranks[u.id] || 0;
                const cost = Math.round(u.baseCost * Math.pow(u.mult, rank));
                const isMax = rank >= u.maxRank;
                const canAfford = (this.game.uusd || 0) >= cost;
                return `
                    <div class="armory-card ${isMax ? 'is-max' : (canAfford ? 'can-afford' : '')}">
                        <div class="armory-header">
                            <span class="armory-icon">${u.icon}</span>
                            <div>
                                <div class="armory-title">${u.name}</div>
                                <div class="armory-level">Rank ${rank} / ${u.maxRank}</div>
                            </div>
                        </div>
                        <div class="armory-desc">${u.desc}</div>
                        <div class="armory-footer">
                            <span class="highlight-cyan" style="font-size:0.85rem;">${isMax ? 'MAX RANK' : `${cost} $UUSD`}</span>
                            ${isMax ? '<span class="armory-max-pill">MAXED</span>' : `<button class="btn-game btn-primary" ${canAfford ? '' : 'disabled'} style="font-size:0.75rem; padding:6px 12px;" onclick="window.GraveGainGame.buyPistolUpgrade('${u.id}')">Upgrade</button>`}
                        </div>
                    </div>
                `;
            }).join('');

            perksGrid.innerHTML = PistolPerks.map(perk => {
                const owned = pu.perks.includes(perk.id);
                const reqMet = totalStatRanks >= (perk.reqRanks || 0);
                const canAfford = (this.game.uusd || 0) >= perk.cost;
                return `
                    <div class="armory-card ${owned ? 'is-max' : (reqMet && canAfford ? 'can-afford' : '')}">
                        <div class="armory-header">
                            <span class="armory-icon">${perk.icon}</span>
                            <div>
                                <div class="armory-title">${perk.name}</div>
                                <div class="armory-level">${owned ? 'EQUIPPED PERMANENTLY' : `Requires ${perk.reqRanks} Pistol Ranks`}</div>
                            </div>
                        </div>
                        <div class="armory-desc">${perk.desc}</div>
                        <div class="armory-footer">
                            <span class="highlight-cyan" style="font-size:0.85rem;">${owned ? 'ACTIVE' : `${perk.cost} $UUSD`}</span>
                            ${owned ? '<span class="armory-max-pill">UNLOCKED</span>' : `<button class="btn-game btn-primary" ${reqMet && canAfford ? '' : 'disabled'} style="font-size:0.75rem; padding:6px 12px;" onclick="window.GraveGainGame.buyPistolPerk('${perk.id}')">${reqMet ? 'Install Mod' : `Need ${perk.reqRanks} Ranks`}</button>`}
                        </div>
                    </div>
                `;
            }).join('');
        }

        buyPistolUpgrade(upgradeId) {
            const SkillTrees = window.GraveGainSkillTrees;
            const u = PistolUpgrades.find(item => item.id === upgradeId);
            if (!u) return;
            if (SkillTrees) this.game.pistolUpgrades = SkillTrees.normalizePistolUpgrades(this.game.pistolUpgrades);
            const rank = this.game.pistolUpgrades.ranks[u.id] || 0;
            if (rank >= u.maxRank) return;
            const cost = Math.round(u.baseCost * Math.pow(u.mult, rank));
            if (this.game.uusd >= cost) {
                this.game.uusd -= cost;
                this.game.pistolUpgrades.ranks[u.id] = rank + 1;
                this.game.audio.playSfx('levelup');
                this.renderPistolWorkshop();
                this.game.saveSave();
            }
        }

        buyPistolPerk(perkId) {
            const SkillTrees = window.GraveGainSkillTrees;
            const perk = PistolPerks.find(p => p.id === perkId);
            if (!perk) return;
            if (SkillTrees) this.game.pistolUpgrades = SkillTrees.normalizePistolUpgrades(this.game.pistolUpgrades);
            if (this.game.pistolUpgrades.perks.includes(perk.id)) return;
            const totalStatRanks = Object.values(this.game.pistolUpgrades.ranks).reduce((s, n) => s + (Number(n) || 0), 0);
            if (totalStatRanks < (perk.reqRanks || 0)) return;
            if (this.game.uusd >= perk.cost) {
                this.game.uusd -= perk.cost;
                this.game.pistolUpgrades.perks.push(perk.id);
                this.game.audio.playSfx('levelup');
                this.renderPistolWorkshop();
                this.game.saveSave();
            }
        }

        selectSkillTree(treeId) {
            const SkillTrees = window.GraveGainSkillTrees;
            const tree = SkillTrees?.getTreeDef(treeId);
            if (!tree) return;
            this.activeSkillTreeId = treeId;
            this.selectedSkillNodeId = tree.nodes[0]?.id || null;
            this.renderSkillTrees();
        }

        renderSkillTrees() {
            this.updateHubBalances();
            const container = document.getElementById('skillTreesContainer');
            const SkillTrees = window.GraveGainSkillTrees;
            if (!container || !SkillTrees) return;

            this.game.skillTrees = SkillTrees.normalizeSkillTrees(this.game.skillTrees);
            const raceTrees = Object.values(SkillTrees.RACE_SKILL_TREES);
            const classTrees = Object.values(SkillTrees.CLASS_SKILL_TREES);
            const activeTree = SkillTrees.getTreeDef(this.activeSkillTreeId) || raceTrees[0];
            this.activeSkillTreeId = activeTree.id;

            const totalPts = SkillTrees.getTotalSkillTreePoints(this.game.skillTrees);
            const masteryStacks = Math.floor(totalPts / 5);
            const activeTreePts = SkillTrees.getTreePoints(activeTree.id, this.game.skillTrees);
            const activeMaxPts = activeTree.nodes.reduce((s, n) => s + n.maxRank, 0);
            const spentUusd = SkillTrees.getTreeSpentCost(activeTree.id, this.game.skillTrees);

            if (!activeTree.nodes.some(n => n.id === this.selectedSkillNodeId)) {
                this.selectedSkillNodeId = activeTree.nodes[0]?.id || null;
            }
            const selectedNode = activeTree.nodes.find(n => n.id === this.selectedSkillNodeId) || activeTree.nodes[0];

            const renderTreeSelector = (list, label) => `
                <div class="skill-tree-selector-group">
                    <span class="skill-group-label">${label}</span>
                    <div class="skill-tree-selector-row">
                        ${list.map(t => {
                            const pts = SkillTrees.getTreePoints(t.id, this.game.skillTrees);
                            const max = t.nodes.reduce((s, n) => s + n.maxRank, 0);
                            return `<button type="button" class="skill-tree-select-btn ${t.id === activeTree.id ? 'active' : ''}" style="--tree-accent:${t.accent}" onclick="window.GraveGainGame.selectSkillTree('${t.id}')">${t.icon} ${t.id.toUpperCase()} <span>${pts}/${max}</span></button>`;
                        }).join('')}
                    </div>
                </div>
            `;

            // Build SVG connector lines for the 3-column x 4-tier grid
            // Column centers in %: col 0 = 16.66%, col 1 = 50%, col 2 = 83.33%
            // Tier centers in %: tier 1 = 12.5%, tier 2 = 37.5%, tier 3 = 62.5%, tier 4 = 87.5%
            const colX = col => (col * 33.333 + 16.666);
            const tierY = tier => ((tier - 1) * 25 + 12.5);
            const edgesHtml = activeTree.nodes.flatMap(node => (node.requires || []).map(req => {
                const parent = activeTree.nodes.find(n => n.id === req.id);
                if (!parent) return '';
                const parentRank = SkillTrees.getNodeRank(activeTree.id, parent.id, this.game.skillTrees);
                const childRank = SkillTrees.getNodeRank(activeTree.id, node.id, this.game.skillTrees);
                const active = parentRank >= (req.rank || 1);
                const invested = childRank > 0;
                return `<line x1="${colX(parent.col)}%" y1="${tierY(parent.tier)}%" x2="${colX(node.col)}%" y2="${tierY(node.tier)}%" class="skill-edge ${invested ? 'invested' : (active ? 'unlocked' : 'locked')}" />`;
            })).join('');

            const nodesHtml = activeTree.nodes.map(node => {
                const rank = SkillTrees.getNodeRank(activeTree.id, node.id, this.game.skillTrees);
                const unlocked = SkillTrees.isNodeUnlocked(activeTree.id, node.id, this.game.skillTrees);
                const isMax = rank >= node.maxRank;
                const cost = SkillTrees.getNodeCost(node, rank);
                const affordable = unlocked && !isMax && (this.game.uusd || 0) >= cost;
                const isSelected = node.id === selectedNode?.id;
                const stateCls = isMax ? 'maxed' : (rank > 0 ? 'invested' : (affordable ? 'affordable' : (unlocked ? 'unlocked' : 'locked')));
                const tierLabel = node.tier === 4 ? 'CAPSTONE' : `T${node.tier}`;
                return `
                    <button type="button"
                        class="skill-node ${stateCls} ${node.tier === 4 ? 'is-capstone' : ''} ${isSelected ? 'selected' : ''}"
                        style="grid-row: ${node.tier}; grid-column: ${node.col + 1}; --tree-accent: ${activeTree.accent};"
                        data-node="${node.id}">
                        <span class="skill-node-tier">${tierLabel}</span>
                        <span class="skill-node-icon">${node.icon}</span>
                        <span class="skill-node-name">${node.name}</span>
                        <span class="skill-node-rank">${rank}/${node.maxRank}</span>
                        <span class="skill-node-cost">${isMax ? 'MAX' : `${cost}$`}</span>
                    </button>
                `;
            }).join('');

            let inspectorHtml = '';
            if (selectedNode) {
                const rank = SkillTrees.getNodeRank(activeTree.id, selectedNode.id, this.game.skillTrees);
                const unlocked = SkillTrees.isNodeUnlocked(activeTree.id, selectedNode.id, this.game.skillTrees);
                const isMax = rank >= selectedNode.maxRank;
                const cost = SkillTrees.getNodeCost(selectedNode, rank);
                const check = SkillTrees.canUpgradeNode(activeTree.id, selectedNode.id, this.game.skillTrees, this.game.uusd);
                const reqNames = (selectedNode.requires || []).map(req => {
                    const p = activeTree.nodes.find(n => n.id === req.id);
                    const pRank = SkillTrees.getNodeRank(activeTree.id, req.id, this.game.skillTrees);
                    return `<span class="req-pill ${pRank >= (req.rank || 1) ? 'met' : ''}">${p ? p.name : req.id} (${pRank}/${req.rank || 1})</span>`;
                }).join(' ');
                inspectorHtml = `
                    <div class="skill-inspector" style="--tree-accent: ${activeTree.accent}">
                        <div class="skill-inspector-head">
                            <span class="skill-inspector-icon">${selectedNode.icon}</span>
                            <div>
                                <div class="skill-inspector-title">${selectedNode.name}</div>
                                <div class="skill-inspector-meta">Tier ${selectedNode.tier}${selectedNode.tier === 4 ? ' Capstone' : ''} · Rank ${rank}/${selectedNode.maxRank}</div>
                            </div>
                        </div>
                        <p class="skill-inspector-desc">${selectedNode.desc}</p>
                        ${reqNames ? `<div class="skill-inspector-reqs">Requires: ${reqNames}</div>` : ''}
                        <div class="skill-inspector-actions">
                            <span class="highlight-cyan">${isMax ? 'MAX RANK REACHED' : `Next Rank Cost: ${cost} $UUSD`}</span>
                            <button type="button" class="btn-game btn-primary" ${check.ok ? '' : 'disabled'} onclick="window.GraveGainGame.buySkillTreeNode('${activeTree.id}', '${selectedNode.id}')">
                                ${isMax ? 'Maxed' : (unlocked ? `Unlock Rank ${rank + 1}` : 'Locked')}
                            </button>
                        </div>
                    </div>
                `;
            }

            // Synergy Combos preview for selected tree
            const relatedCombos = Object.entries(SkillTrees.SYNERGY_COMBOS).filter(([key]) => {
                const [r, c] = key.split(':');
                return r === activeTree.id || c === activeTree.id;
            }).map(([key, combo]) => {
                const [r, c] = key.split(':');
                const rPts = SkillTrees.getTreePoints(r, this.game.skillTrees);
                const cPts = SkillTrees.getTreePoints(c, this.game.skillTrees);
                const unlocked = rPts >= 4 && cPts >= 4;
                return `<div class="synergy-pill ${unlocked ? 'unlocked' : ''}"><span>${combo.icon} <strong>${combo.name}</strong> (${r.toUpperCase()} + ${c.toUpperCase()})</span><small>${combo.desc}</small></div>`;
            }).join('');

            container.innerHTML = `
                <div class="skill-trees-top">
                    <div>
                        <h3 style="margin:0; color:var(--grave-gold);">Infiltrator Skill Trees (4 Race · 4 Class)</h3>
                        <div style="font-size:0.82rem; color:var(--grave-text-muted); margin-top:4px;">
                            Global Mastery: <strong class="highlight-cyan">${totalPts} total ranks</strong> (+${masteryStacks * 2}% Max HP, Damage &amp; Yield) · Click a node to inspect or upgrade.
                        </div>
                    </div>
                    <button type="button" class="btn-game" ${spentUusd > 0 ? '' : 'disabled'} onclick="window.GraveGainGame.respecSkillTree('${activeTree.id}')">
                        ♻️ Respec Tree (${spentUusd} $UUSD)
                    </button>
                </div>
                <div class="skill-tree-selectors">
                    ${renderTreeSelector(raceTrees, 'Race Trees')}
                    ${renderTreeSelector(classTrees, 'Class Trees')}
                </div>
                <div class="skill-tree-header-banner" style="border-color:${activeTree.accent}">
                    <div>
                        <strong style="color:${activeTree.accent}; font-family:'Orbitron',sans-serif;">${activeTree.icon} ${activeTree.name}</strong>
                        <div style="font-size:0.8rem; color:var(--grave-text-muted);">${activeTree.subtitle}</div>
                    </div>
                    <div class="skill-tree-pts-badge">${activeTreePts} / ${activeMaxPts} Ranks</div>
                </div>
                <div class="skill-tree-workspace">
                    <div class="skill-tree-graph">
                        <svg class="skill-tree-edges" viewBox="0 0 100 100" preserveAspectRatio="none">${edgesHtml}</svg>
                        <div class="skill-tree-grid">${nodesHtml}</div>
                    </div>
                    <div class="skill-tree-sidebar">
                        ${inspectorHtml}
                        <div class="skill-synergy-box">
                            <div class="skill-group-label">Race × Class Synergy Combos (4+ pts in both)</div>
                            ${relatedCombos}
                        </div>
                    </div>
                </div>
            `;

            container.querySelectorAll('.skill-node').forEach(btn => {
                btn.addEventListener('click', () => {
                    const nodeId = btn.dataset.node;
                    if (this.selectedSkillNodeId === nodeId) {
                        this.buySkillTreeNode(activeTree.id, nodeId);
                    } else {
                        this.selectedSkillNodeId = nodeId;
                        this.renderSkillTrees();
                    }
                });
            });
        }

        buySkillTreeNode(treeId, nodeId) {
            const SkillTrees = window.GraveGainSkillTrees;
            if (!SkillTrees) return false;
            this.game.skillTrees = SkillTrees.normalizeSkillTrees(this.game.skillTrees);
            const check = SkillTrees.canUpgradeNode(treeId, nodeId, this.game.skillTrees, this.game.uusd);
            if (!check.ok) return false;
            this.game.uusd -= check.cost;
            this.game.skillTrees[treeId][nodeId] = check.nextRank;
            this.selectedSkillNodeId = nodeId;
            this.game.audio.playSfx('levelup');
            this.renderSkillTrees();
            this.game.saveSave();
            return true;
        }

        respecSkillTree(treeId) {
            const SkillTrees = window.GraveGainSkillTrees;
            if (!SkillTrees) return false;
            this.game.skillTrees = SkillTrees.normalizeSkillTrees(this.game.skillTrees);
            const refund = SkillTrees.getTreeSpentCost(treeId, this.game.skillTrees);
            if (refund <= 0) return false;
            this.game.skillTrees[treeId] = {};
            this.game.uusd += refund;
            this.game.audio.playSfx('loot');
            this.renderSkillTrees();
            this.game.saveSave();
            return true;
        }

        renderBotany() {
            const grid = document.getElementById('botanyGrid');
            if (!grid) return;
            const now = Math.floor(Date.now() / 1000);

            grid.innerHTML = this.game.botanyCrops.map((crop, index) => {
                if (!crop.seedId) {
                    return `
                        <div class="plant-slot">
                            <strong>[Empty Hydroponic Slot]</strong>
                            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">
                                ${BotanySeeds.map(s => `
                                    <button class="btn-game" style="font-size:0.75rem; padding:5px 10px;" onclick="window.GraveGainGame.plantSeed(${index}, '${s.id}')">
                                        Plant ${s.emoji} ${s.name} (25 $UUSD)
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `;
                } else {
                    const seed = BotanySeeds.find(s => s.id === crop.seedId);
                    const elapsed = now - crop.startTime;
                    const percent = Math.min(100, Math.floor((elapsed / crop.growthTime) * 100));
                    const isReady = percent >= 100;

                    return `
                        <div class="plant-slot">
                            <div class="plant-info">
                                <span>${seed.emoji} ${seed.name}</span>
                                <strong>${percent}%</strong>
                            </div>
                            <div class="plant-progress-bg">
                                <div class="plant-progress-fill" style="width: ${percent}%;"></div>
                            </div>
                            ${isReady ? `
                                <button class="btn-game btn-primary" style="font-size:0.8rem; padding:6px 12px; margin-top:5px;" onclick="window.GraveGainGame.harvestCrop(${index})">
                                    🌾 Harvest (+${seed.yield * seed.value} $UUSD)
                                </button>
                            ` : `
                                <span style="font-size:0.75rem; color:var(--grave-text-muted);">Matures in ${Math.max(0, crop.growthTime - elapsed)}s</span>
                            `}
                        </div>
                    `;
                }
            }).join('');
        }

        plantSeed(slotIndex, seedId) {
            const seed = BotanySeeds.find(s => s.id === seedId);
            if (!seed) return;
            if (this.game.uusd >= 25) {
                this.game.uusd -= 25;
                this.game.botanyCrops[slotIndex] = {
                    seedId: seed.id,
                    startTime: Math.floor(Date.now() / 1000),
                    growthTime: seed.time
                };
                this.game.audio.playSfx('loot');
                this.updateHubBalances();
                this.renderBotany();
                this.game.saveSave();
            }
        }

        harvestCrop(slotIndex) {
            const crop = this.game.botanyCrops[slotIndex];
            if (!crop || !crop.seedId) return;
            const seed = BotanySeeds.find(s => s.id === crop.seedId);
            if (!seed) return;
            this.game.uusd += seed.yield * seed.value;
            this.game.botanyCrops[slotIndex] = { seedId: null, startTime: 0, growthTime: 0 };
            this.game.audio.playSfx('loot');
            this.updateHubBalances();
            this.renderBotany();
            this.game.saveSave();
        }

        generateRepairMiniGame() {
            const area = document.getElementById('repairCircuitArea');
            if (!area) return;
            area.innerHTML = '';
            document.getElementById('repairStatus').textContent = 'Status: Ready for calibration';

            const termX = 240;
            const termY = 90;

            const target = document.createElement('div');
            target.className = 'circuit-node terminal';
            target.style.left = `${termX}px`;
            target.style.top = `${termY}px`;
            target.textContent = '🎯';
            area.appendChild(target);

            const comp = document.createElement('div');
            comp.className = 'circuit-node component';
            comp.style.left = '40px';
            comp.style.top = '90px';
            comp.textContent = '💠';
            area.appendChild(comp);

            let isDragging = false;
            const startDrag = () => { isDragging = true; };
            const moveDrag = (e) => {
                if (!isDragging) return;
                const rect = area.getBoundingClientRect();
                const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                const clientY = e.clientY || (e.touches && e.touches[0].clientY);
                let px = Math.max(16, Math.min(rect.width - 16, clientX - rect.left));
                let py = Math.max(16, Math.min(rect.height - 16, clientY - rect.top));

                comp.style.left = `${px}px`;
                comp.style.top = `${py}px`;

                if (Math.hypot(px - termX, py - termY) < 22) {
                    isDragging = false;
                    comp.style.left = `${termX}px`;
                    comp.style.top = `${termY}px`;
                    document.getElementById('repairStatus').textContent = 'Status: Circuit calibrated! +50 $UUSD awarded!';
                    this.game.uusd += 50;
                    this.game.audio.playSfx('block');
                    this.updateHubBalances();
                    this.game.saveSave();
                }
            };
            const stopDrag = () => { isDragging = false; };

            if (this._repairCleanup) {
                try { this._repairCleanup(); } catch (_) {}
                this._repairCleanup = null;
            }
            comp.addEventListener('mousedown', startDrag);
            window.addEventListener('mousemove', moveDrag);
            window.addEventListener('mouseup', stopDrag);

            comp.addEventListener('touchstart', startDrag, { passive: true });
            window.addEventListener('touchmove', moveDrag, { passive: true });
            window.addEventListener('touchend', stopDrag);
            this._repairCleanup = () => {
                window.removeEventListener('mousemove', moveDrag);
                window.removeEventListener('mouseup', stopDrag);
                window.removeEventListener('touchmove', moveDrag);
                window.removeEventListener('touchend', stopDrag);
            };
        }

        renderLoreList() {
            const listEl = document.getElementById('loreList');
            if (!listEl || !window.GraveGainLore) return;

            const allLore = window.GraveGainLore.getAll();
            listEl.innerHTML = Object.keys(allLore).map(key => {
                const item = allLore[key];
                return `<button class="class-btn" style="text-align: left; padding: 8px; font-size: 0.8rem; width: 100%;" onclick="window.GraveGainGame.viewLoreEntry('${item.id}')">${item.title}</button>`;
            }).join('');

            const speakBtn = document.getElementById('btnSpeakLore');
            if (speakBtn && !speakBtn.dataset.bound) {
                speakBtn.dataset.bound = 'true';
                speakBtn.addEventListener('click', () => {
                    const currentId = speakBtn.dataset.currentId;
                    if (currentId) {
                        const item = window.GraveGainLore.get(currentId);
                        if (item) this.game.audio.speak(item.content);
                    }
                });
            }
        }

        viewLoreEntry(id) {
            const item = window.GraveGainLore ? window.GraveGainLore.get(id) : null;
            if (!item) return;

            document.getElementById('loreTitle').textContent = item.title;
            document.getElementById('loreCategory').textContent = `Category: ${item.category.replace('_', ' ')}`;
            document.getElementById('loreContent').textContent = item.content;

            const speakBtn = document.getElementById('btnSpeakLore');
            if (speakBtn) {
                speakBtn.style.display = 'block';
                speakBtn.dataset.currentId = id;
            }
        }

        renderStoryMissionsList() {
            const grid = document.getElementById('storyMissionsGrid');
            const btnLaunch = document.getElementById('btnStartStoryMission');
            if (!grid || !window.GraveGainStoryMissions) return;

            const missions = window.GraveGainStoryMissions;
            const storyEngine = window.GraveGainStoryEngine || { isUnlocked: () => true, getProgress: () => ({ stars: {} }) };
            let progress = { stars: {}, completedMissions: [] };
            try { progress = storyEngine.getProgress() || progress; } catch (_) { /* ignore */ }
            grid.innerHTML = missions.map(m => {
                const unlocked = storyEngine.isUnlocked(m.id);
                const stars = (progress.stars && progress.stars[m.id]) || 0;
                const completed = (progress.completedMissions || []).includes(m.id) || stars > 0;
                const isSelected = this.game.selectedStoryMissionId === m.id;

                const starStr = unlocked ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars) : '🔒 Locked';
                const lockHint = unlocked ? '' : `<div class="mission-lock-hint">Complete Mission ${m.unlockedBy} to unlock</div>`;
                return `
                    <div class="glass-panel story-card mission-card ${unlocked ? 'mission-unlocked' : 'mission-locked disabled'} ${isSelected ? 'mission-selected selected' : ''} ${completed ? 'mission-completed' : ''}"
                         data-mission-id="${m.id}"
                         style="padding: 12px; border: 1px solid ${isSelected ? 'var(--grave-gold)' : 'var(--grave-border)'}; border-radius: 8px; cursor: ${unlocked ? 'pointer' : 'not-allowed'}; opacity: ${unlocked ? 1 : 0.6}; background: ${isSelected ? 'rgba(168,85,247,0.2)' : 'rgba(0,0,0,0.4)'};"
                          onclick="window.GraveGainGame.selectStoryMission(${m.id})">
                        <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--grave-gold);">${m.location}</div>
                        <h4 style="margin: 4px 0; font-family: 'Orbitron'; font-size: 0.95rem; color: white;">${completed ? '✓ ' : ''}${m.title}</h4>
                        <p style="font-size: 0.78rem; color: var(--grave-text-muted); margin: 4px 0 8px 0;">${m.subtitle}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                            <span>${starStr}</span>
                            <span class="highlight-gold mission-reward">+${m.rewardGold}g | +${m.rewardUusd}$</span>
                        </div>
                        ${lockHint}
                    </div>
                `;
            }).join('');

            if (btnLaunch) {
                const sel = this.game.selectedStoryMissionId;
                const selUnlocked = sel ? storyEngine.isUnlocked(sel) : false;
                btnLaunch.disabled = !sel || !selUnlocked;
                if (sel && selUnlocked) {
                    const m = missions.find(x => x.id === sel);
                    btnLaunch.textContent = m ? `⚔️ Launch: ${m.title}` : '⚔️ Launch Selected Mission';
                } else {
                    btnLaunch.textContent = '⚔️ Launch Selected Mission';
                }
            }
        }

        selectStoryMission(missionId) {
            if (window.GraveGainStoryEngine && !window.GraveGainStoryEngine.isUnlocked(missionId)) return;
            this.game.selectedStoryMissionId = missionId;
            this.renderStoryMissionsList();
        }

        playDialogueSequence(dialogueList, onComplete) {
            // Queue: before/after sequences (and rapid re-triggers) chain
            // instead of overlapping. IDs dialoguePortrait/dialogueSpeaker/
            // dialogueText/btnNextDialogue are preserved.
            if (!this._dlgQueue) this._dlgQueue = [];
            if (!dialogueList || dialogueList.length === 0) {
                if (onComplete) onComplete();
                this._pumpDialogue();
                return;
            }
            this._dlgQueue.push({ list: dialogueList, done: onComplete });
            if (!this._dlgActive) this._pumpDialogue();
        }

        _pumpDialogue() {
            const next = (this._dlgQueue || []).shift();
            if (!next) { this._dlgActive = false; return; }
            this._dlgActive = true;
            this._runDialogue(next.list, () => {
                try { if (next.done) next.done(); } catch (_) { /* ignore */ }
                this._dlgActive = false;
                this._pumpDialogue();
            });
        }

        _runDialogue(dialogueList, onComplete) {
            const dialogueScreen = document.getElementById('storyDialogueScreen');
            const portrait = document.getElementById('dialoguePortrait');
            const speaker = document.getElementById('dialogueSpeaker');
            const text = document.getElementById('dialogueText');
            const nextBtn = document.getElementById('btnNextDialogue');
            const skipAllBtn = document.getElementById('btnSkipAllDialogue');

            if (!dialogueScreen) {
                if (onComplete) onComplete();
                return;
            }

            dialogueScreen.classList.remove('hidden');
            let idx = 0;
            let typeTimer = 0;
            let typing = false;
            let fullText = '';

            const speakLine = (item) => {
                try { this.game.audio.speak(item.text, item.speaker); } catch (_) { /* TTS garnish */ }
            };

            const typeLine = (item) => {
                fullText = item.text || '';
                text.textContent = '';
                typing = true;
                nextBtn.textContent = 'Skip ➔';
                let i = 0;
                clearInterval(typeTimer);
                typeTimer = setInterval(() => {
                    i += 1;
                    text.textContent = fullText.slice(0, i);
                    if (i >= fullText.length) {
                        clearInterval(typeTimer);
                        typing = false;
                        nextBtn.textContent = (idx >= dialogueList.length - 1) ? 'Finish ✔' : 'Continue ➔';
                    }
                }, 18);
            };

            const showLine = () => {
                const item = dialogueList[idx];
                portrait.textContent = item.portrait || '🤖';
                // Portrait pop: retrigger the CSS pop animation.
                portrait.classList.remove('dlg-pop');
                void portrait.offsetWidth;
                portrait.classList.add('dlg-pop');
                speaker.textContent = item.speaker;
                typeLine(item);
                speakLine(item);
            };

            const finishDialogue = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                clearInterval(typeTimer);
                typing = false;
                try { window.speechSynthesis?.cancel?.(); } catch (_) {}
                nextBtn.onclick = null;
                if (skipAllBtn) skipAllBtn.onclick = null;
                dialogueScreen.classList.add('hidden');
                if (onComplete) onComplete();
            };

            const handleNext = () => {
                // First click while typing = skip to full line; next click advances.
                if (typing) {
                    clearInterval(typeTimer);
                    typing = false;
                    text.textContent = fullText;
                    nextBtn.textContent = (idx >= dialogueList.length - 1) ? 'Finish ✔' : 'Continue ➔';
                    return;
                }
                idx++;
                if (idx < dialogueList.length) {
                    showLine();
                } else {
                    finishDialogue();
                }
            };

            nextBtn.onclick = handleNext;
            if (skipAllBtn) skipAllBtn.onclick = finishDialogue;
            showLine();
        }
    }

    window.GraveGainHubQuartersController = GraveGainHubQuartersController;
})();
