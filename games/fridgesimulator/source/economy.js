

// Day-survived score: days bank 100/day, mouths fed bank 10 each,
// deaths cost 25 each, streaks/combos add flavor points.
function getScore() {
    const alive = Object.values(countries).reduce((sum, c) => sum + c.family.filter(m => m !== '💀').length, 0);
    return Math.max(0, (day - 1) * 100 + alive * 10 - deaths * 25 + feedStreak * 15 + maxCombo * 10);
}

function generateShopStocks() {
    shopStocks = {};
    Object.entries(SHOPS).forEach(([key, shop]) => {
        const items = {};
        if (shop.stock === 'all') {
            Object.entries(FOOD_PRICES).forEach(([emoji, price]) => {
                items[emoji] = Math.ceil(price * shop.multiplier);
            });
        } else {
            const allFoods = Object.keys(FOOD_STATS);
            // Select 12 unique random foods for the shop stock
            const shuffled = [...allFoods].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 12);
            selected.forEach(emoji => {
                const basePrice = FOOD_PRICES[emoji] || 2;
                items[emoji] = Math.ceil(basePrice * (shop.multiplier || 0.5));
            });
        }
        shopStocks[key] = items;
    });
}

function getShopItems() {
    return shopStocks[currentShop] || {};
}

function buyFood(emoji) {
    const shop = SHOPS[currentShop];
    const price = FOOD_PRICES[emoji] || 2;
    const finalPrice = Math.ceil(price * (shop.multiplier || 0.5));
    
    if (money >= finalPrice) {
        money -= finalPrice;
        inventory[emoji] = (inventory[emoji] || 0) + 1;
        playSound('buy');
        const fStats = FOOD_STATS[emoji];
        showToast(`🛒 Bought ${emoji} ${fStats ? fStats.name : ''} (-$${finalPrice})`, '#39ff14');
        render();
        persistSave();
    } else {
        playSound('death');
        showToast(`❌ Not enough funds for ${emoji} ($${finalPrice})!`, '#ef4444');
    }
}

function addToFridge(countryKey, slot) {
    const country = countries[countryKey];
    if (!country || country.fridge[slot]) return;
    // Tap-to-move: a picked-up fridge item takes priority over inventory selection
    if (selectedSlot) {
        const from = countries[selectedSlot.countryKey];
        const moving = from ? from.fridge[selectedSlot.slot] : null;
        if (moving) {
            delete from.fridge[selectedSlot.slot];
            country.fridge[slot] = moving;
            playSound('stock');
            showToast(`📦 Moved ${moving} to ${country.name.split(' ')[0]} shelf`, '#06b6d4');
        }
        selectedSlot = null;
        render();
        persistSave();
        return;
    }
    if (!selectedFood) {
        showToast('👆 Pick food from 🎒 Inventory first, then tap an empty (+) slot', '#06b6d4');
        // Nudge mobile users to the ledger/inventory view
        setMobileView('inventory');
        return;
    }
    country.fridge[slot] = selectedFood;
    inventory[selectedFood]--;
    if (inventory[selectedFood] <= 0) {
        delete inventory[selectedFood];
        selectedFood = null;
    }
    playSound('stock');
    render();
    persistSave();
}

function removeFromFridge(countryKey, slot) {
    const country = countries[countryKey];
    if (!country) return;
    const food = country.fridge[slot];
    if (!food) return;
    // Tap a filled slot with no inventory selection = pick up for tap-to-move.
    // Tap it again = put back to inventory. Tap another empty slot = move there.
    if (!selectedFood && (!selectedSlot || selectedSlot.countryKey !== countryKey || selectedSlot.slot !== slot)) {
        selectedSlot = { countryKey, slot };
        playSound('feed');
        showToast(`✋ Picked up ${food} — tap an empty slot to move it, or tap it again to unpack`, '#06b6d4');
        render();
        return;
    }
    if (selectedSlot && selectedSlot.countryKey === countryKey && selectedSlot.slot === slot && !selectedFood) {
        // Second tap on same filled slot unpacks to inventory
        selectedSlot = null;
    } else {
        selectedSlot = null;
    }
    delete country.fridge[slot];
    inventory[food] = (inventory[food] || 0) + 1;
    playSound('stock');
    render();
    persistSave();
}

function autoStockFridges() {
    if (!gameRunning || gamePaused) return;
    let stockedCount = 0;
    const invKeys = Object.keys(inventory).filter(k => inventory[k] > 0);
    if (invKeys.length === 0) {
        showToast('🎒 Inventory empty! Buy food from shops first.', '#f59e0b');
        return;
    }

    Object.entries(countries).forEach(([key, country]) => {
        for (let slot = 0; slot < 12; slot++) {
            if (!country.fridge[slot]) {
                // Prioritize preference
                let chosenFood = invKeys.find(f => inventory[f] > 0 && country.preferences.includes(f));
                if (!chosenFood) {
                    chosenFood = invKeys.find(f => inventory[f] > 0);
                }
                if (chosenFood) {
                    country.fridge[slot] = chosenFood;
                    inventory[chosenFood]--;
                    if (inventory[chosenFood] <= 0) {
                        delete inventory[chosenFood];
                    }
                    stockedCount++;
                }
            }
        }
    });

    if (stockedCount > 0) {
        playSound('autofeed');
        showToast(`⚡ Auto-stocked ${stockedCount} items into fridges!`, '#10b981');
        render();
        persistSave();
    } else {
        showToast('Fridges are already full!', '#f59e0b');
    }
}
