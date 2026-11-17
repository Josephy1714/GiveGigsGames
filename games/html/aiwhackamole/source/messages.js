function alignmentMessageCapacity(width) { return width < 420 ? 1 : 2; }

function alignmentMessageRects(width, count) {
    if (count < 1) return [];
    const margin = 10;
    const gap = 8;
    const cardWidth = Math.max(1, (width - margin * 2 - gap * (count - 1)) / count);
    return Array.from({ length: count }, (_, index) => ({ left: margin + index * (cardWidth + gap), width: cardWidth }));
}

function layoutAlignmentMessages() {
    const active = holes.filter(hole => hole.bubbleEl && hole.state !== 'inactive');
    const rects = alignmentMessageRects(container.clientWidth, active.length);
    active.forEach((hole, index) => {
        const card = hole.bubbleEl;
        const rectangle = rects[index];
        Object.assign(card.style, {
            left: rectangle.left + 'px', top: '68px', width: rectangle.width + 'px',
            maxWidth: 'none', boxSizing: 'border-box', transform: 'none', animation: 'none',
            font: '12px/1.4 system-ui', padding: '9px', textAlign: 'left',
            pointerEvents: 'auto', cursor: 'pointer', visibility: '',
            background: '#10101ff5'
        });
        card.classList.add('clamped');
    });
}

function bindAlignmentMessage(card, hole) {
    const number = holes.indexOf(hole) + 1;
    const label = document.createElement('strong');
    label.textContent = 'AI ' + number + ' · Click to whack';
    label.style.display = 'block';
    label.style.marginBottom = '5px';
    const quote = document.createElement('span');
    quote.textContent = hole.quote;
    card.replaceChildren(label, quote);
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Whack AI ' + number + ': ' + hole.quote);
    function activate(event) {
        if (!isPlaying || !['active', 'rising'].includes(hole.state)) return;
        event.stopPropagation();
        const bounds = card.getBoundingClientRect();
        const frame = container.getBoundingClientRect();
        triggerWhack(hole, bounds.left - frame.left + bounds.width / 2, bounds.top - frame.top + bounds.height / 2);
    }
    card.addEventListener('click', activate);
    card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        activate(event);
    });
}
