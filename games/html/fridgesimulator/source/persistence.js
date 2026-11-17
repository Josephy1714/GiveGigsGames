

// ===== DS-FRIDGE-01: SAVE SYSTEM (local autosave + v2 panel hooks, zero network) =====
function collectSaveData() {
    return {
        day,
        money,
        deaths,
        inventory: Object.assign({}, inventory),
        countries: JSON.parse(JSON.stringify(countries))
    };
}

function persistSave() {
    try {
        localStorage.setItem(FRIDGE_SAVE_KEY, JSON.stringify(collectSaveData()));
    } catch (e) { /* storage unavailable (private mode/sandbox) — session continues */ }
}

function clearSave() {
    try {
        localStorage.removeItem(FRIDGE_SAVE_KEY);
    } catch (e) { /* ignore */ }
}

function restoreSaveData(data) {
    if (!data || typeof data !== 'object') return false;
    if (!Number.isFinite(data.day) || !Number.isFinite(data.money) || !Number.isFinite(data.deaths)) return false;
    if (!data.inventory || typeof data.inventory !== 'object') return false;
    if (!data.countries || typeof data.countries !== 'object') return false;
    const nextInventory = {};
    Object.entries(data.inventory).forEach(([emoji, count]) => {
        if (FOOD_STATS[emoji] && Number.isFinite(count) && count > 0) {
            nextInventory[emoji] = Math.floor(count);
        }
    });
    const nextCountries = {};
    Object.entries(data.countries).forEach(([key, c]) => {
        if (!c || typeof c !== 'object' || !Array.isArray(c.family) || c.family.length === 0) return;
        nextCountries[key] = {
            name: typeof c.name === 'string' ? c.name : key,
            familySize: c.family.length,
            budget: Number.isFinite(c.budget) ? c.budget : 0,
            preferences: Array.isArray(c.preferences) ? c.preferences.filter(f => FOOD_STATS[f]) : [],
            fridge: (c.fridge && typeof c.fridge === 'object') ? c.fridge : {},
            family: c.family,
            hunger: Array.isArray(c.hunger) ? c.hunger : c.family.map(() => 100),
            nutrition: Array.isArray(c.nutrition) ? c.nutrition : c.family.map(() => [20, 20, 20])
        };
    });
    if (Object.keys(nextCountries).length === 0) return false;
    day = Math.max(1, Math.floor(data.day));
    money = data.money;
    deaths = Math.max(0, Math.floor(data.deaths));
    inventory = nextInventory;
    countries = nextCountries;
    return true;
}
