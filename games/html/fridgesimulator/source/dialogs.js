// Keep keyboard interaction inside setup/results while a modal covers the game.
function initFridgeDialogs() {
    const main = document.getElementById('gameMain');
    const overlays = ['startScreen', 'gameOverScreen', 'victoryScreen'].map(id => document.getElementById(id));
    let current = null;
    overlays.forEach(overlay => {
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', overlay.querySelector('.logo-big').textContent.trim());
    });
    const synchronize = () => {
        const active = overlays.find(overlay => !overlay.classList.contains('hidden'));
        main.inert = !!active;
        if (active && current !== active) active.querySelector('button:not(:disabled)')?.focus();
        if (!active && current) document.getElementById('btnNextDay')?.focus();
        current = active;
    };
    const observer = new MutationObserver(synchronize);
    overlays.forEach(overlay => observer.observe(overlay, { attributes: true, attributeFilter: ['class'] }));
    synchronize();
}

document.addEventListener('DOMContentLoaded', initFridgeDialogs);
