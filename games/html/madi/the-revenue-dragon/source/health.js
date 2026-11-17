function syncDragonHealth() {
    const track = document.getElementById('dragon-hp-container');
    if (!track) return;
    let value = document.getElementById('dragon-health-value');
    if (!value) {
        value = document.createElement('span');
        value.id = 'dragon-health-value';
        track.style.position = 'relative';
        Object.assign(value.style, { position: 'absolute', inset: '0', textAlign: 'center', font: '700 12px/20px system-ui', color: '#fff', textShadow: '0 1px 2px #000' });
        track.appendChild(value);
        track.setAttribute('role', 'progressbar');
        track.setAttribute('aria-label', 'Dragon health');
        track.setAttribute('aria-valuemin', '0');
        track.setAttribute('aria-valuemax', '100');
    }
    const percent = Math.max(0, Math.min(100, dragonHP));
    dragonHPBar.style.width = percent + '%';
    track.setAttribute('aria-valuenow', String(percent));
    value.textContent = percent + '%';
}
syncDragonHealth();
