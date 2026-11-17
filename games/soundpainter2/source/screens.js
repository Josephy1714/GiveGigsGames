function studioViewport(width, height, stepBank = 0, pitchBank = 0) {
    const columns = width < 850 ? 8 : 16;
    const rows = height < 370 ? 4 : 8;
    const startColumn = columns === 16 ? 0 : (stepBank % 2) * 8;
    const startRow = rows === 8 ? 0 : (pitchBank % 2) * 4;
    return { columns, rows, startColumn, startRow };
}

function installStudioScreens() {
    const frame = document.querySelector('.studio-frame');
    if (!frame) return;
    frame.classList.add('bounded-studio');
    const transport = document.querySelector('.studio-dashboard');
    const tracks = document.getElementById('pocket-tracks');
    const navigation = document.createElement('nav');
    navigation.className = 'studio-screen-tabs';
    navigation.setAttribute('aria-label', 'Studio screens');
    const body = document.createElement('div');
    body.className = 'studio-screen-body';
    const screens = {};
    const tabs = {};
    function button(label, action) {
        const node = document.createElement('button');
        node.type = 'button'; node.className = 'studio-page-button'; node.textContent = label;
        node.addEventListener('click', action);
        return node;
    }
    function show(name) {
        for (const key of Object.keys(screens)) {
            screens[key].hidden = key !== name;
            tabs[key].setAttribute('aria-current', key === name ? 'page' : 'false');
        }
        // The visualizer has a new available size after moving between screens.
        window.dispatchEvent(new Event('resize'));
    }
    for (const name of ['Pattern', 'Mix', 'Sound', 'Library']) {
        const section = document.createElement('section');
        section.className = 'studio-page'; section.setAttribute('aria-label', name + ' screen');
        screens[name] = section;
        tabs[name] = button(name, () => show(name));
        navigation.appendChild(tabs[name]); body.appendChild(section);
    }
    const bankBar = document.createElement('div'); bankBar.className = 'studio-bank-controls';
    const bankStatus = document.createElement('span'); bankStatus.setAttribute('role', 'status');
    let stepBank = 0, pitchBank = 0;
    const stepToggle = button('Steps 9–16 →', () => { stepBank = 1 - stepBank; fitGrid(); });
    const pitchToggle = button('Lower pitches →', () => { pitchBank = 1 - pitchBank; fitGrid(); });
    const clear = document.getElementById('btn-clear-track');
    bankBar.append(bankStatus, stepToggle, pitchToggle, clear);
    const indicator = document.querySelector('.sequencer-steps-indicator');
    const grid = document.querySelector('.sequencer-container');
    screens.Pattern.append(bankBar, indicator, grid);
    const channels = document.querySelector('.channels-column');
    screens.Mix.appendChild(channels);
    const parameters = document.querySelector('.parameters-column');
    const parameterCards = Array.from(parameters.querySelectorAll('.param-card'));
    const parameterBar = document.createElement('div'); parameterBar.className = 'studio-bank-controls';
    const parameterStatus = document.createElement('span'); parameterStatus.setAttribute('role', 'status');
    let parameterPage = 0;
    function showParameters(offset) {
        parameterPage = (parameterPage + offset + Math.ceil(parameterCards.length / 2)) % Math.ceil(parameterCards.length / 2);
        parameterCards.forEach((card, index) => { card.hidden = Math.floor(index / 2) !== parameterPage; });
        parameterStatus.textContent = 'Controls ' + (parameterPage * 2 + 1) + '–' + Math.min(parameterCards.length, parameterPage * 2 + 2) + ' / ' + parameterCards.length;
    }
    parameterBar.append(button('← Previous', () => showParameters(-1)), parameterStatus, button('Next →', () => showParameters(1)));
    parameters.prepend(parameterBar);
    screens.Sound.appendChild(parameters);
    const libraryControls = document.createElement('div'); libraryControls.className = 'studio-library-controls';
    libraryControls.append(document.querySelector('.dashboard-right'), document.getElementById('btn-reset-all'));
    const hint = document.querySelector('.pocket-touch-hint');
    hint.textContent = 'Click notes to paint. Drag a lit note vertically for velocity. Use the track tabs to switch instruments.';
    screens.Library.append(libraryControls, hint, document.querySelector('.visualizer-container'));
    document.querySelector('.studio-mixer')?.remove();
    // Compact controls use the same underlying inputs and listeners.
    document.getElementById('pocket-fx-bar').hidden = true;
    document.getElementById('pocket-transport').hidden = true;
    frame.prepend(navigation, transport, tracks, body);

    function fitGrid() {
        const view = studioViewport(frame.clientWidth, frame.clientHeight, stepBank, pitchBank);
        const rows = Array.from(document.querySelectorAll('.sequencer-row-grid'));
        rows.forEach((row, index) => {
            row.hidden = index < view.startRow || index >= view.startRow + view.rows;
            row.style.gridTemplateColumns = 'repeat(' + view.columns + ', minmax(0,1fr))';
            Array.from(row.children).forEach((cell, column) => {
                cell.hidden = column < view.startColumn || column >= view.startColumn + view.columns;
            });
        });
        document.querySelectorAll('.pitch-row-label').forEach((label, index) => {
            label.hidden = index < view.startRow || index >= view.startRow + view.rows;
        });
        const indicators = document.querySelector('.steps-indicators-grid');
        indicators.style.gridTemplateColumns = 'repeat(' + view.columns + ', minmax(0,1fr))';
        Array.from(indicators.children).forEach((node, column) => {
            node.hidden = column < view.startColumn || column >= view.startColumn + view.columns;
            node.textContent = String(column + 1);
        });
        for (const target of [document.getElementById('sequencer-grid'), document.getElementById('sequencer-y-labels')]) {
            target.style.gridTemplateRows = 'repeat(' + view.rows + ', minmax(0,1fr))';
        }
        stepToggle.hidden = view.columns === 16;
        pitchToggle.hidden = view.rows === 8;
        stepToggle.textContent = stepBank ? '← Steps 1–8' : 'Steps 9–16 →';
        pitchToggle.textContent = pitchBank ? '← Upper pitches' : 'Lower pitches →';
        bankStatus.textContent = state.activeTrack.toUpperCase() + ' · Steps ' + (view.startColumn + 1) + '–' + (view.startColumn + view.columns);
        for (const channel of channels.querySelectorAll('.track-channel')) channel.hidden = channel.dataset.track !== state.activeTrack;
    }
    window.addEventListener('studio-grid-rebuilt', fitGrid);
    new ResizeObserver(fitGrid).observe(frame);
    showParameters(0); fitGrid(); show('Pattern');
}
installStudioScreens();
