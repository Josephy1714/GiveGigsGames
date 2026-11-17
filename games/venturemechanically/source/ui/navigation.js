/**
 * navigation.js - Top Sub-Game Switcher & Header Controls
 */
window.VMNavigation = (function() {
    function init() {
        const suiteButtons = document.querySelectorAll('.vm-suite-btn');
        const suitePanels = document.querySelectorAll('.vm-suite-panel');
        suiteButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.vmPanel;
                suiteButtons.forEach(item => {
                    const selected = item === btn;
                    item.classList.toggle('active', selected);
                    item.setAttribute('aria-pressed', selected ? 'true' : 'false');
                });
                suitePanels.forEach(panel => panel.classList.toggle('active', panel.id === targetId));
                if (targetId === 'vm-waterfall' && window.Game && window.Game.updateTextDisplays) {
                    window.Game.updateTextDisplays();
                }
                if (window.VMAudio) window.VMAudio.playPreset('click');
            });
        });

        const subgameBtns = document.querySelectorAll('.subgame-btn');
        const subgameSections = document.querySelectorAll('.subgame-section');

        subgameBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.subgame;
                
                subgameBtns.forEach(b => b.classList.remove('active'));
                subgameSections.forEach(s => s.classList.remove('active'));

                btn.classList.add('active');
                const targetSec = document.getElementById(targetId);
                if (targetSec) {
                    targetSec.classList.add('active');
                }

                if (window.VMAudio) {
                    window.VMAudio.playPreset('click');
                }

                if (targetId === 'subgame-waterfall' && window.Game && window.Game.updateTextDisplays) {
                    window.Game.updateTextDisplays();
                }
            });
        });
    }

    return { init };
})();
