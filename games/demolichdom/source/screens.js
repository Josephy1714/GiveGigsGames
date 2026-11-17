// Small, explicit pages keep every menu decision visible on a single screen.
(() => {
    const byId = (id) => document.getElementById(id);
    const pages = (selector) => [...document.querySelectorAll(selector)];

    function pager({ items, previous, next, progress, onChange }) {
        let index = 0;
        const render = () => {
            items.forEach((item, i) => { item.hidden = i !== index; });
            if (progress) progress.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
            if (previous) { previous.disabled = index === 0; previous.setAttribute('aria-disabled', String(index === 0)); }
            if (next) { next.disabled = index === items.length - 1; next.setAttribute('aria-disabled', String(index === items.length - 1)); }
            onChange?.(index);
        };
        previous?.addEventListener('click', () => { if (index > 0) { index--; render(); } });
        next?.addEventListener('click', () => { if (index < items.length - 1) { index++; render(); } });
        return { render, reset() { index = 0; render(); } };
    }

    const briefing = pager({
        items: pages('[data-briefing-page]'), previous: byId('dl-briefing-prev'), next: byId('dl-briefing-next'), progress: byId('dl-briefing-count'),
        onChange(index) { const button = byId('dl-briefing-next'); if (button) button.textContent = index === 0 ? 'Controls →' : 'Overview →'; }
    });
    const manual = pager({
        items: pages('[data-manual-page]'), previous: byId('dl-manual-prev'), next: byId('dl-manual-next'), progress: byId('dl-manual-progress'),
        onChange(index) { const button = byId('dl-manual-next'); if (button) button.textContent = index === 2 ? 'Last page' : 'Next →'; }
    });

    window.dlScreens = {
        briefing,
        manual,
        showUpgrade(options) {
            const container = byId('upgradeOptions');
            const count = byId('dl-upgrade-count');
            const progress = byId('dl-upgrade-progress');
            const previous = byId('dl-upgrade-prev');
            const next = byId('dl-upgrade-next');
            let index = 0;
            const render = () => {
                container.replaceChildren();
                const upgrade = options[index];
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'upgrade-card dl-upgrade-choice';
                card.setAttribute('aria-label', `Choose ${upgrade.name}: ${upgrade.desc}`);
                card.innerHTML = `<span class="upgrade-key">${index + 1}</span><span class="emoji">${upgrade.emoji}</span><h3>${upgrade.name}</h3><p>${upgrade.desc}</p><span class="dl-pick-hint">CHOOSE THIS DECREE</span>`;
                card.addEventListener('click', () => window.game.applyUpgrade(upgrade.id));
                container.appendChild(card);
                progress.textContent = `${index + 1} / ${options.length}`;
                count.textContent = options.length > 1 ? `${options.length} decrees offered` : 'Your decree';
                previous.disabled = index === 0;
                next.disabled = index === options.length - 1;
            };
            previous.onclick = () => { if (index > 0) { index--; render(); } };
            next.onclick = () => { if (index < options.length - 1) { index++; render(); } };
            render();
        }
    };
    manual.render();
})();
