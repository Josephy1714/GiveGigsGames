(function installHangarSteps() {
    const root = document.getElementById('TEMPLATE-4weird-start-screen');
    const content = root && root.querySelector('.TEMPLATE-4weird-overlay-content');
    const ships = document.getElementById('TEMPLATE-4weird-ship-select');
    const launch = document.getElementById('TEMPLATE-4weird-start-btn');
    if (!content || !ships || !launch) return;
    // The host frame already supplies fullscreen; its duplicate covered the
    // shield readout while the game was embedded.
    const localFullscreen = document.getElementById('fw-fs-btn');
    if (localFullscreen) localFullscreen.style.display = 'none';
    const cards = Array.from(ships.children);
    const hull = document.createElement('section');
    const briefing = document.createElement('section');
    hull.setAttribute('aria-label', 'Choose your hull');
    briefing.setAttribute('aria-label', 'Flight briefing');
    const summary = document.getElementById('hangar-last-flight');
    if (summary) hull.appendChild(summary);
    hull.appendChild(ships);
    const description = Array.from(content.children).find(element => element.tagName === 'P' && !element.className);
    if (description) briefing.appendChild(description);
    const instructions = content.querySelector('.TEMPLATE-4weird-controls-hint');
    if (instructions) {
        instructions.replaceChildren();
        const text = document.createElement('p');
        text.textContent = 'Hold Space, click, or touch to push outward. Release to fall inward. Press V or C to switch camera views (3rd Person / Forward / Solar).';
        instructions.appendChild(text);
        briefing.appendChild(instructions);
    }

    // Level selector in Hangar
    const levelBox = document.createElement('div');
    Object.assign(levelBox.style, { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', margin: '10px auto', maxWidth: '420px' });
    Object.values(LEVELS).forEach((lvl) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'od-level-card btn btn-secondary' + (lvl.id === selectedLevel ? ' selected' : '');
        card.dataset.level = lvl.id;
        card.setAttribute('aria-checked', lvl.id === selectedLevel ? 'true' : 'false');
        Object.assign(card.style, {
            padding: '8px 10px', textAlign: 'left', borderRadius: '10px',
            border: lvl.id === selectedLevel ? '1.5px solid #38bdf8' : '1px solid rgba(148,163,184,0.3)',
            background: lvl.id === selectedLevel ? 'rgba(56,189,248,0.16)' : 'rgba(15,23,42,0.75)',
            color: '#f8fafc', cursor: 'pointer', fontSize: '12px', lineHeight: '1.3'
        });
        card.innerHTML = `<div style="font-weight:700;font-size:13px">${lvl.emoji} ${lvl.name}</div><div style="opacity:0.8;font-size:11px;margin-top:2px">${lvl.scoreMult}x pts</div>`;
        card.addEventListener('click', () => {
            applyLevelSelection(lvl.id, true);
            levelBox.querySelectorAll('.od-level-card').forEach((c) => {
                const on = c.dataset.level === lvl.id;
                c.style.border = on ? '1.5px solid #38bdf8' : '1px solid rgba(148,163,184,0.3)';
                c.style.background = on ? 'rgba(56,189,248,0.16)' : 'rgba(15,23,42,0.75)';
            });
        });
        levelBox.appendChild(card);
    });
    briefing.insertBefore(levelBox, launch);

    // Camera view toggle button in game container
    const gc = document.getElementById('game-container');
    if (gc && !document.getElementById('od-cam-btn')) {
        const camBtn = document.createElement('button');
        camBtn.id = 'od-cam-btn';
        camBtn.type = 'button';
        camBtn.title = 'Switch Camera View (V / C)';
        camBtn.textContent = '📷 ' + CAMERA_LABELS[cameraMode];
        Object.assign(camBtn.style, {
            position: 'absolute', top: '12px', right: '62px', zIndex: '900',
            padding: '6px 12px', borderRadius: '9999px', border: '1px solid rgba(56,189,248,0.5)',
            background: 'rgba(15,23,42,0.78)', color: '#e0f2fe', fontSize: '12px',
            fontWeight: '700', cursor: 'pointer', backdropFilter: 'blur(6px)'
        });
        camBtn.addEventListener('click', (e) => { e.stopPropagation(); cycleCameraView(); });
        gc.appendChild(camBtn);
    }
    briefing.appendChild(launch);
    content.querySelector('.TEMPLATE-4weird-hangar-eyebrow')?.remove();
    content.querySelector('.TEMPLATE-4weird-ship-hint')?.remove();
    const navigation = document.createElement('div');
    const selection = document.createElement('div');
    for (const row of [navigation, selection]) Object.assign(row.style, { display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px' });
    function button(label, action) {
        const node = document.createElement('button');
        node.type = 'button'; node.className = 'btn btn-secondary'; node.textContent = label;
        Object.assign(node.style, { padding: '7px 12px', fontSize: '13px' });
        node.addEventListener('click', action);
        return node;
    }
    const counter = document.createElement('span');
    counter.setAttribute('role', 'status');
    counter.style.font = '13px system-ui';
    function index() { return Math.max(0, cards.findIndex(card => card.getAttribute('aria-checked') === 'true')); }
    function choose(offset) { cards[(index() + offset + cards.length) % cards.length].click(); refreshCards(); }
    function refreshCards() {
        const selected = index();
        cards.forEach((card, number) => { card.style.display = number === selected ? 'flex' : 'none'; });
        counter.textContent = 'Hull ' + (selected + 1) + ' of ' + cards.length;
    }
    Object.assign(ships.style, { display: 'flex', justifyContent: 'center', margin: '8px auto', maxWidth: '300px' });
    cards.forEach(card => { card.style.width = '100%'; card.style.maxWidth = '280px'; });
    selection.append(button('← Hull', () => choose(-1)), counter, button('Hull →', () => choose(1)));
    hull.appendChild(selection);
    let step = 0;
    const previous = button('← Hull selection', () => show(0));
    const next = button('Flight briefing →', () => show(1));
    function show(value) {
        step = value;
        hull.style.display = step === 0 ? 'block' : 'none';
        briefing.style.display = step === 1 ? 'block' : 'none';
        previous.style.display = step === 1 ? 'inline-block' : 'none';
        next.style.display = step === 0 ? 'inline-block' : 'none';
    }
    navigation.append(previous, next);
    content.append(hull, briefing, navigation);
    new MutationObserver(refreshCards).observe(ships, { subtree: true, attributes: true, attributeFilter: ['aria-checked'] });
    new MutationObserver(() => { if (!root.classList.contains('hidden')) show(0); }).observe(root, { attributes: true, attributeFilter: ['class'] });
    const style = document.createElement('style');
    style.textContent = '#TEMPLATE-4weird-start-screen .TEMPLATE-4weird-overlay-content{width:min(100%,520px);box-sizing:border-box}#TEMPLATE-4weird-start-screen .TEMPLATE-4weird-ship-card{padding:10px!important;gap:3px!important}#TEMPLATE-4weird-start-screen h2{font-size:clamp(20px,4vw,30px)!important;margin:0 0 10px!important}#TEMPLATE-4weird-start-screen p{margin:8px auto!important}@media(max-height:360px){#TEMPLATE-4weird-start-screen{padding:10px!important}#TEMPLATE-4weird-start-screen p{font-size:12px!important;line-height:1.3!important}#TEMPLATE-4weird-start-screen .TEMPLATE-4weird-ship-emoji{font-size:22px!important}#TEMPLATE-4weird-start-screen .TEMPLATE-4weird-ship-card{padding:5px!important}}';
    document.head.appendChild(style);
    refreshCards(); show(0);
})();

