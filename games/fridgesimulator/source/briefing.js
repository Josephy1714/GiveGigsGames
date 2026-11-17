function initFridgeBriefing() {
    const overlay = document.getElementById('startScreen');
    const story = overlay.querySelector('.story');
    const controls = overlay.querySelector('.controls-hint');
    const slides = [...story.children, ...controls.children];
    const content = document.createElement('section');
    content.className = 'fridge-briefing-content';
    content.setAttribute('aria-label', 'Game briefing');
    content.append(...slides);
    story.replaceWith(content);
    controls.remove();
    const navigation = document.createElement('nav');
    navigation.className = 'fridge-page-controls';
    navigation.setAttribute('aria-label', 'Briefing pages');
    const previous = document.createElement('button');
    const next = document.createElement('button');
    const label = document.createElement('span');
    previous.type = next.type = 'button';
    previous.textContent = '← Previous';
    next.textContent = 'Next →';
    label.setAttribute('aria-live', 'polite');
    let page = 0;
    const show = () => {
        slides.forEach((slide, index) => { slide.hidden = index !== page; });
        previous.disabled = page === 0;
        next.disabled = page === slides.length - 1;
        label.textContent = `Briefing ${page + 1} / ${slides.length}`;
    };
    previous.addEventListener('click', () => { page--; show(); });
    next.addEventListener('click', () => { page++; show(); });
    navigation.append(previous, label, next);
    content.after(navigation);
    show();
}

document.addEventListener('DOMContentLoaded', initFridgeBriefing);
