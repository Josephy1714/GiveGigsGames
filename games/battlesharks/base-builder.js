/**
 * BattleSharks Snap-to-Grid Underwater Base & Tank Builder
 */
(function (global) {
    const BUILDING_PIECES = [
        { id: 'floor', name: 'Modular Floor', icon: '🟦', cost: 20, bonus: 'Foundation' },
        { id: 'wall', name: 'Titanium Wall', icon: '🧱', cost: 25, bonus: '+2% Base Defense' },
        { id: 'glass', name: 'Glass Panel', icon: '🪟', cost: 30, bonus: '+3% Tank View' },
        { id: 'corridor', name: 'Glass Corridor', icon: '🚇', cost: 45, bonus: 'Connects Rooms' },
        { id: 'observation', name: 'Observation Room', icon: '🔭', cost: 80, bonus: '+5% Happiness' },
        { id: 'tank', name: 'Shark Enclosure', icon: '🦈', cost: 120, bonus: '+1 Shark Capacity' },
        { id: 'lab', name: 'Mutation Lab', icon: '🧬', cost: 150, bonus: '+5% XP Gain' },
        { id: 'lighting', name: 'Biolum. Lighting', icon: '💡', cost: 35, bonus: 'Atmosphere' },
        { id: 'machinery', name: 'Defense Turret', icon: '⚙️', cost: 100, bonus: '+5% Base Defense' }
    ];

    let selectedPiece = 'tank';

    function openBaseBuilder() {
        const modal = document.getElementById('baseBuilderModal');
        if (!modal) return;
        modal.classList.remove('hidden');
        renderBaseBuilder();
    }

    function closeBaseBuilder() {
        document.getElementById('baseBuilderModal')?.classList.add('hidden');
    }

    function renderBaseBuilder() {
        const state = BSState.data;
        const gridEl = document.getElementById('baseGridContainer');
        const paletteEl = document.getElementById('basePalette');
        const coinsEl = document.getElementById('baseCoins');
        const statsEl = document.getElementById('baseStats');
        if (!gridEl || !paletteEl) return;

        if (coinsEl) coinsEl.textContent = state.coins;

        paletteEl.innerHTML = BUILDING_PIECES.map(p => `
            <button class="hud-btn base-piece-btn ${selectedPiece === p.id ? 'active-piece' : ''}" data-id="${p.id}" title="${p.bonus}">
                ${p.icon} ${p.name} (${p.cost}🪙)
            </button>
        `).join('') + `<button class="hud-btn base-piece-btn ${selectedPiece === 'erase' ? 'active-piece' : ''}" data-id="erase">🗑️ Demolish</button>`;

        paletteEl.querySelectorAll('.base-piece-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedPiece = btn.dataset.id;
                renderBaseBuilder();
            });
        });

        const cols = state.baseGrid.cols || 10;
        const rows = state.baseGrid.rows || 6;
        const cells = state.baseGrid.cells || {};
        gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        let html = '';
        let labs = 0, tanks = 0, obs = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const key = `${c},${r}`;
                const cell = cells[key];
                const piece = cell ? BUILDING_PIECES.find(p => p.id === cell.type) : null;
                if (cell?.type === 'lab') labs++;
                if (cell?.type === 'tank') tanks++;
                if (cell?.type === 'observation') obs++;
                html += `<div class="base-cell ${cell ? 'filled' : ''}" data-key="${key}" title="${piece ? piece.name : 'Empty Ocean Grid'}">
                    ${piece ? piece.icon : '·'}
                </div>`;
            }
        }
        gridEl.innerHTML = html;

        if (statsEl) {
            statsEl.textContent = `Tanks: ${tanks} | Labs: ${labs} | Observation Rooms: ${obs}`;
        }

        gridEl.querySelectorAll('.base-cell').forEach(cellEl => {
            cellEl.addEventListener('click', () => {
                const key = cellEl.dataset.key;
                if (selectedPiece === 'erase') {
                    delete state.baseGrid.cells[key];
                    BSState.save();
                    renderBaseBuilder();
                    return;
                }
                const piece = BUILDING_PIECES.find(p => p.id === selectedPiece);
                if (!piece) return;
                if (state.coins < piece.cost) {
                    alert(`Need ${piece.cost} Gold Coins to build ${piece.name}!`);
                    return;
                }
                BSState.addCoins(-piece.cost);
                state.baseGrid.cells[key] = { type: piece.id, label: piece.name };
                BSState.save();
                renderBaseBuilder();
            });
        });
    }

    function bindBaseBuilderEvents() {
        document.getElementById('btnCloseBase')?.addEventListener('click', closeBaseBuilder);
        document.getElementById('btnAqBuild')?.addEventListener('click', () => {
            BSAquarium.close();
            openBaseBuilder();
        });
    }

    global.BSBaseBuilder = {
        open: openBaseBuilder,
        close: closeBaseBuilder,
        bindEvents: bindBaseBuilderEvents
    };
})(window);
