// One decision at a time: buy, choose stock, place it, then review families.
const fridgePages = new Map();

function fridgePageWindow(total, requested, size) {
    const pages = Math.max(1, Math.ceil(total / size));
    const page = Math.max(0, Math.min(pages - 1, requested));
    return { page, pages, start: page * size, end: Math.min(total, (page + 1) * size) };
}

function refreshFridgePages() {
    if (!document.body.classList.contains('bounded-fridge')) return;
    for (const [id, config] of fridgePages) {
        const list = document.getElementById(id);
        const cards = Array.from(list.children);
        const size = id === 'shopItems' || id === 'inventoryList' ? (window.innerWidth < 550 ? 2 : 4) : 1;
        const range = fridgePageWindow(cards.length, config.page, size);
        config.page = range.page;
        cards.forEach((card, i) => {
            card.hidden = i < range.start || i >= range.end;
            if (card.matches('.shop-item,.inventory-item')) {
                card.tabIndex = 0;
                card.setAttribute('role', 'button');
                card.setAttribute('aria-label', card.textContent.replace(/\s+/g, ' ').trim());
            }
        });
        config.label.textContent = `${config.name} ${range.page + 1} / ${range.pages}`;
        config.previous.disabled = range.page === 0;
        config.next.disabled = range.page === range.pages - 1;
    }
}

function addFridgePager(id, name) {
    const list = document.getElementById(id);
    const bar = document.createElement('nav');
    bar.className = 'fridge-page-controls';
    bar.setAttribute('aria-label', `${name} pages`);
    const previous = document.createElement('button');
    const next = document.createElement('button');
    const label = document.createElement('span');
    previous.textContent = '← Previous';
    next.textContent = 'Next →';
    previous.type = next.type = 'button';
    label.setAttribute('aria-live', 'polite');
    bar.append(previous, label, next);
    list.before(bar);
    const config = { page: 0, name, label, previous, next };
    fridgePages.set(id, config);
    previous.addEventListener('click', () => { config.page--; refreshFridgePages(); });
    next.addEventListener('click', () => { config.page++; refreshFridgePages(); });
}

function initFridgeScreens() {
    document.body.classList.add('bounded-fridge');
    const family = document.getElementById('panelFamily');
    const inventory = document.createElement('section');
    inventory.className = 'panel';
    inventory.id = 'panelInventory';
    inventory.dataset.mobileView = 'inventory';
    inventory.append(family.querySelector('h2'), document.getElementById('inventoryList'));
    document.getElementById('gameContent').append(inventory);
    const tab = document.createElement('button');
    tab.className = 'mtab';
    tab.dataset.view = 'inventory';
    tab.textContent = '🎒 Stock';
    tab.addEventListener('click', () => setMobileView('inventory'));
    document.getElementById('mobileTabbar').insertBefore(tab, document.querySelector('[data-view="fridges"]'));
    document.querySelectorAll('#mobileTabbar button').forEach(button => button.type = 'button');
    document.querySelectorAll('#panelShop h2')[1]?.remove();
    for (const [id, name] of [['shopItems', 'Food'], ['inventoryList', 'Stock'], ['countriesContainer', 'Country'], ['familiesList', 'Family']]) {
        addFridgePager(id, name);
    }
    const hint = document.createElement('p');
    hint.className = 'fridge-flow-hint';
    hint.textContent = 'Shop → Stock: choose food → Fridges: tap an empty slot → Ledger: review → Next Day';
    document.getElementById('mobileTabbar').after(hint);
    document.getElementById('shopTabs').addEventListener('click', () => {
        fridgePages.get('shopItems').page = 0;
        refreshFridgePages();
    });
    document.getElementById('inventoryList').addEventListener('click', event => {
        if (event.target.closest('.inventory-item') && selectedFood) setMobileView('fridges');
    });
    document.addEventListener('keydown', event => {
        if (event.repeat || !['Enter', ' '].includes(event.key)) return;
        const card = event.target.closest?.('.shop-item,.inventory-item');
        if (card) { event.preventDefault(); card.click(); }
    });
    window.addEventListener('resize', refreshFridgePages);
    setMobileView('shop');
    initFridgePlanner();
    refreshFridgePages();
}

document.addEventListener('DOMContentLoaded', initFridgeScreens);
