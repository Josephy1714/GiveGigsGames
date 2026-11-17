

function showToast(message, color = '#00f2fe') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'game-toast';
    toast.style.borderColor = color;
    toast.style.boxShadow = `0 0 15px ${color}40`;
    // Text-only: toast strings are plain text + emoji; innerHTML here would
    // execute any markup a future caller interpolates.
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 2400);
}

// ===== Mobile playable: Tap-to-stock shelves + swipeable family ledger =====
function isMobileLayout() {
    return true;
}

function setMobileView(view) {
    mobileView = view;
    document.querySelectorAll('.game-content .panel').forEach(p => {
        p.classList.toggle('active-view', p.dataset.mobileView === view);
    });
    document.querySelectorAll('#mobileTabbar .mtab').forEach(b => {
        b.classList.toggle('active', b.dataset.view === view);
    });
    if (view === 'fridges') requestAnimationFrame(scrollToShelf);
}

function updateShelfChrome() {
    const keys = Object.keys(countries);
    const dots = document.getElementById('shelfDots');
    const counter = document.getElementById('shelfCounter');
    if (counter) counter.textContent = `${keys.length ? Math.min(shelfIndex + 1, keys.length) : 0} / ${keys.length}`;
    if (!dots) return;
    dots.innerHTML = '';
    keys.forEach((_, i) => {
        const d = document.createElement('span');
        d.className = 'dot' + (i === shelfIndex ? ' on' : '');
        d.addEventListener('click', () => { shelfIndex = i; scrollToShelf(); updateShelfChrome(); });
        dots.appendChild(d);
    });
}

function scrollToShelf() {
    if (document.body.classList.contains('bounded-fridge')) return;
    const wrap = document.getElementById('countriesContainer');
    if (!wrap || !isMobileLayout()) return;
    const card = wrap.querySelector('.country-fridge');
    if (!card) return;
    const w = card.offsetWidth + 12;
    wrap.scrollTo({ left: shelfIndex * w, behavior: 'smooth' });
}

function initMobileControls() {
    // Tab bar
    document.querySelectorAll('#mobileTabbar .mtab').forEach(btn => {
        btn.addEventListener('click', () => setMobileView(btn.dataset.view));
    });
    // Desktop: show all panels; mobile: show active view only
    const applyLayout = () => {
        if (isMobileLayout()) {
            setMobileView(mobileView);
        } else {
            document.querySelectorAll('.game-content .panel').forEach(p => p.classList.add('active-view'));
        }
    };
    window.addEventListener('resize', applyLayout, { passive: true });
    applyLayout();

    // Swipe between shelves: track horizontal swipe on the carousel
    const wrap = document.getElementById('countriesContainer');
    if (wrap) {
        let startX = 0, startL = 0, swiping = false;
        wrap.addEventListener('touchstart', e => {
            if (e.touches.length !== 1) return;
            startX = e.touches[0].clientX; startL = wrap.scrollLeft; swiping = true;
        }, { passive: true });
        wrap.addEventListener('touchend', () => {
            if (!swiping) return;
            swiping = false;
            const card = wrap.querySelector('.country-fridge');
            const w = card ? card.offsetWidth + 12 : wrap.clientWidth * 0.88;
            shelfIndex = Math.max(0, Math.min(Object.keys(countries).length - 1,
                Math.round(wrap.scrollLeft / w)));
            updateShelfChrome();
        }, { passive: true });
        wrap.addEventListener('scroll', () => {
            const card = wrap.querySelector('.country-fridge');
            if (!card) return;
            const w = card.offsetWidth + 12;
            const i = Math.round(wrap.scrollLeft / w);
            if (i !== shelfIndex && i >= 0 && i < Object.keys(countries).length) {
                shelfIndex = i;
                updateShelfChrome();
            }
        }, { passive: true });
    }

    // Bottom-sheet grabber: tap/drag collapses & expands the family ledger
    const grabber = document.getElementById('familyGrabber');
    const familyPanel = document.getElementById('panelFamily');
    if (grabber && familyPanel) {
        let y0 = 0, dragging = false;
        const toggle = () => familyPanel.classList.toggle('sheet-collapsed');
        grabber.addEventListener('click', toggle);
        grabber.addEventListener('touchstart', e => {
            dragging = true; y0 = e.touches[0].clientY;
        }, { passive: true });
        grabber.addEventListener('touchend', e => {
            if (!dragging) return;
            dragging = false;
            const dy = (e.changedTouches[0] || {}).clientY - y0;
            if (Math.abs(dy) < 8) return; // plain tap already toggled via click
            familyPanel.classList.toggle('sheet-collapsed', dy > 0);
        }, { passive: true });
    }

    // Keyboard focus activation for shelf slots (Enter/Space) — tap equivalent
    document.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && document.activeElement &&
            document.activeElement.classList && document.activeElement.classList.contains('fridge-slot')) {
            e.preventDefault();
            document.activeElement.click();
        }
    });
}
