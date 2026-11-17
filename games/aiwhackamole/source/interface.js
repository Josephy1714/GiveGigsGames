(function installAlignmentScreens() {
    const content = startScreen.querySelector('.TEMPLATE-4weird-overlay-content');
    const hint = content && content.querySelector('.TEMPLATE-4weird-controls-hint');
    if (!content || !hint) return;
    const compact = document.createElement('style');
    compact.textContent = '@media(max-height:360px){#TEMPLATE-4weird-start-screen{padding:10px!important}#TEMPLATE-4weird-start-screen h2{font-size:20px!important;margin:0 0 8px!important}#TEMPLATE-4weird-start-screen h3{font-size:15px;margin:6px 0}#TEMPLATE-4weird-start-screen p{font-size:12px!important;line-height:1.35!important;margin:6px auto!important}#TEMPLATE-4weird-start-screen .btn{font-size:12px!important;padding:7px 12px!important}}';
    document.head.appendChild(compact);
    const intro = document.createElement('div');
    const summary = content.querySelector('p');
    if (summary) {
        summary.textContent = 'Read each AI’s message. Whack harmful AIs and leave helpful ones alone. Protect integrity for a 60-second round.';
        intro.appendChild(summary);
    }
    intro.appendChild(document.getElementById('TEMPLATE-4weird-start-btn'));
    const lesson = document.createElement('div');
    const pages = [
        ['Read, then react', 'Click or tap an AI to whack it. Helpful messages should stay untouched; harmful messages should be stopped before their timer runs out.'],
        ['Protect integrity', 'Whacking a helpful AI or letting a harmful AI escape damages integrity. Read the message before deciding. The round ends when integrity reaches zero or the timer ends.'],
        ['Build a streak', 'Consecutive harmful-AI whacks build a score multiplier up to ×5. Keep a steady rhythm, and use Pause whenever you need a break.']
    ];
    const title = document.createElement('h3');
    const text = document.createElement('p');
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.style.fontSize = '12px';
    lesson.append(title, text, status);
    const navigation = document.createElement('div');
    Object.assign(navigation.style, { display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '12px' });
    function button(label, action) {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = 'btn btn-secondary';
        element.textContent = label;
        element.addEventListener('click', action);
        return element;
    }
    let page = -1;
    const back = button('How to play', () => { page = page < 0 ? 0 : -1; render(); });
    const next = button('Next tip →', () => { page = (page + 1) % pages.length; render(); });
    function render() {
        intro.style.display = page < 0 ? 'block' : 'none';
        lesson.style.display = page < 0 ? 'none' : 'block';
        next.style.display = page < 0 ? 'none' : 'inline-block';
        back.textContent = page < 0 ? 'How to play' : '← Back to launch';
        if (page >= 0) {
            title.textContent = pages[page][0];
            text.textContent = pages[page][1];
            status.textContent = 'Tip ' + (page + 1) + ' of ' + pages.length;
        }
    }
    navigation.append(back, next);
    hint.remove();
    content.append(intro, lesson, navigation);
    render();

    const pause = button('Ⅱ Pause', pauseRound);
    pause.setAttribute('aria-label', 'Pause alignment round');
    Object.assign(pause.style, { position: 'absolute', bottom: '10px', right: '10px', zIndex: '12', minHeight: '36px', padding: '6px 10px', font: '600 12px system-ui' });
    function sync() { pause.style.display = isPlaying ? 'block' : 'none'; }
    const observer = new MutationObserver(sync);
    for (const screen of [startScreen, pauseScreen, gameOverScreen]) {
        observer.observe(screen, { attributes: true, attributeFilter: ['class'] });
    }
    // Countdown completion does not change an overlay class, so beginRound
    // dispatches this explicit lifecycle event after entering play.
    window.addEventListener('alignment-round-state', sync);
    container.appendChild(pause);
    const fullscreen = document.getElementById('fw-fs-btn');
    if (fullscreen) Object.assign(fullscreen.style, { top: 'auto', bottom: '10px', left: '10px', right: 'auto' });
    sync();
})();
