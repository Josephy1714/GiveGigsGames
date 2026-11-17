// Named links make every destination discoverable without hovering, and let
// keyboard and touch players use the same world selection flow.
function installRegionLinks() {
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Choose a MADI world');
    Object.assign(nav.style, {
        position: 'absolute', bottom: '48px', left: '12px', right: '12px',
        maxWidth: '440px', margin: '0 auto', display: 'grid',
        gridTemplateColumns: '1fr 1fr', gap: '6px', zIndex: '12'
    });
    for (const region of regions) {
        const link = document.createElement('a');
        link.href = region.url;
        link.target = '_top';
        link.textContent = region.name;
        const color = '#' + region.defaultColor.toString(16).padStart(6, '0');
        Object.assign(link.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '36px', padding: '4px 8px', borderRadius: '8px',
            border: '1px solid ' + color, color: '#f8fafc', background: '#090a18ed',
            font: '600 12px system-ui', textAlign: 'center', textDecoration: 'none'
        });
        link.addEventListener('focus', () => { tooltip.textContent = 'Enter ' + region.name; });
        nav.appendChild(link);
    }
    Object.assign(tooltip.style, { top: '12px', bottom: 'auto', padding: '8px 12px', maxWidth: '90%', fontSize: '12px' });
    tooltip.textContent = 'Choose a world below or select an island';
    renderer.domElement.parentElement.appendChild(nav);
}
