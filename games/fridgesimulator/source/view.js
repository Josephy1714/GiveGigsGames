

function render() {
    // Update HUD
    document.getElementById('hudMoney').textContent = '$' + money;
    document.getElementById('hudDay').textContent = day;
    const totalPop = Object.values(countries).reduce((sum, c) => sum + c.family.filter(member => member !== '💀').length, 0);
    document.getElementById('hudPopulation').textContent = totalPop;
    document.getElementById('hudDeaths').textContent = deaths;
    // DS-FRIDGE-01: day-survived score in the HUD (badge created live — index.html untouched).
    let scoreEl = document.getElementById('hudScore');
    if (!scoreEl) {
        const hud = document.querySelector('.hud');
        if (hud) {
            const stat = document.createElement('div');
            stat.className = 'hud-stat';
            stat.innerHTML = '<span class="hud-label">⭐ Score</span> <span class="hud-value" id="hudScore">0</span>';
            hud.appendChild(stat);
            scoreEl = stat.querySelector('#hudScore');
        }
    }
    if (scoreEl) scoreEl.textContent = getScore();
    
    // Render shop
    const shopItems = getShopItems();
    const shopItemsDiv = document.getElementById('shopItems');
    shopItemsDiv.innerHTML = '';
    Object.entries(shopItems).forEach(([emoji, price]) => {
        const fStats = FOOD_STATS[emoji] || { name: 'Food', hunger: 40, nutrition: [0, 0, 0, 0, 0] };
        
        let nutHtml = '';
        fStats.nutrition.forEach((val, idx) => {
            if (val > 0) {
                const label = CATEGORY_LABELS[idx];
                const color = CATEGORY_COLORS[idx];
                nutHtml += `<div style="font-size: 0.65rem; color: ${color}; font-weight: bold; margin-top: 1px;">${label} +${val}</div>`;
            }
        });

        const div = document.createElement('div');
        div.className = 'shop-item';
        div.onclick = () => buyFood(emoji);
        div.innerHTML = `
            <span class="shop-item-emoji">${emoji}</span>
            <div class="shop-item-name" style="font-weight: 700; margin-top: 2px;">${fStats.name}</div>
            <div class="shop-item-price" style="color: var(--neon-green); font-size: 0.75rem; font-weight: 600; margin-top: 2px;">$${price}</div>
            <div class="shop-item-hunger" style="color: #ff4a4a; font-size: 0.65rem; font-weight: bold; margin-top: 3px;">❤️ Hunger +${fStats.hunger}</div>
            <div class="shop-item-nutrition-list" style="margin-top: 2px;">
                ${nutHtml}
            </div>
        `;
        shopItemsDiv.appendChild(div);
    });
    
    // Render inventory
    const inventoryListDiv = document.getElementById('inventoryList');
    if (inventoryListDiv) {
        inventoryListDiv.innerHTML = '';
        Object.entries(inventory).forEach(([emoji, count]) => {
            if (count <= 0) return;
            const fStats = FOOD_STATS[emoji] || { name: 'Food', hunger: 40, nutrition: [0, 0, 0, 0, 0] };
            
            let nutHtml = '';
            fStats.nutrition.forEach((val, idx) => {
                if (val > 0) {
                    const label = CATEGORY_LABELS[idx];
                    const color = CATEGORY_COLORS[idx];
                    nutHtml += `<div style="font-size: 0.6rem; color: ${color}; font-weight: bold; margin-top: 1px;">${label} +${val}</div>`;
                }
            });

            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item' + (selectedFood === emoji ? ' selected' : '');
            itemDiv.onclick = () => {
                selectedFood = selectedFood === emoji ? null : emoji;
                if (selectedFood) selectedSlot = null; // tap-to-stock wins over tap-to-move
                render();
                if (selectedFood && window.innerWidth <= 900) {
                    showToast(`👆 ${emoji} selected — tap a (+) shelf slot to stock it`, '#06b6d4');
                }
            };
            itemDiv.title = `${fStats.name} (Hunger +${fStats.hunger})`;
            itemDiv.innerHTML = `
                <span class="inventory-item-emoji">${emoji}</span>
                <span class="inventory-item-count">${count}</span>
                <div class="inventory-item-name" style="font-size: 0.65rem; font-weight: 700; margin-top: 2px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${fStats.name}</div>
                <div class="inventory-item-nutrition" style="margin-top: 1px;">
                    ${nutHtml}
                </div>
            `;
            inventoryListDiv.appendChild(itemDiv);
        });
        if (Object.values(inventory).reduce((sum, c) => sum + c, 0) === 0) {
            inventoryListDiv.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-size: 0.75rem; padding: 10px;">Empty. Buy food from the shops!</div>`;
        }
    }
    
    // Render countries
    const countriesDiv = document.getElementById('countriesContainer');
    countriesDiv.innerHTML = '';
    Object.entries(countries).forEach(([key, country]) => {
        const div = document.createElement('div');
        div.className = 'country-fridge';
        
        let gridHtml = '';
        for (let i = 0; i < 12; i++) {
            const food = country.fridge[i];
            const isPicked = selectedSlot && selectedSlot.countryKey === key && selectedSlot.slot === i;
            const dropHint = selectedSlot && !food ? ' drop-target' : '';
            if (food) {
                gridHtml += `<div class="fridge-slot filled tappable${isPicked ? ' picked-up' : ''}" role="button" tabindex="0" aria-label="Shelf item ${food}${isPicked ? ' picked up' : ''}" onclick="removeFromFridge('${key}', ${i})">${food}</div>`;
            } else {
                gridHtml += `<div class="fridge-slot empty tappable${dropHint}" role="button" tabindex="0" aria-label="Empty shelf slot ${i + 1}. Tap to stock." onclick="addToFridge('${key}', ${i})">+</div>`;
            }
        }
        
        div.innerHTML = `
            <div class="country-header">${country.name} (Budget: $${country.budget})</div>
            <div class="fridge-grid">
                ${gridHtml}
            </div>
        `;
        countriesDiv.appendChild(div);
    });
    
    // Render families
    const familiesDiv = document.getElementById('familiesList');
    familiesDiv.innerHTML = '';
    Object.entries(countries).forEach(([key, country]) => {
        const div = document.createElement('div');
        div.className = 'family-card';
        const avgHunger = country.hunger.reduce((a, b) => a + b, 0) / country.hunger.length;
        const hungerColor = avgHunger > 70 ? '#10b981' : avgHunger > 40 ? '#f59e0b' : '#ef4444';
        
        const avgNut = [0, 0, 0];
        country.nutrition.forEach(nut => {
            for (let idx = 0; idx < 3; idx++) {
                avgNut[idx] += nut[idx];
            }
        });
        const avgNutPct = avgNut.map(n => Math.round(n / country.nutrition.length));
        
        const memberHtml = country.family.map((member, i) => {
            const isDead = member === '💀';
            const h = country.hunger[i];
            const hColor = h > 70 ? '#10b981' : h > 40 ? '#f59e0b' : '#ef4444';
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <span>${member}</span>
                    <span style="font-size: 0.7rem; color: ${isDead ? '#ef4444' : hColor}; font-weight: bold;">
                        ${isDead ? 'DEAD' : h + '%'}
                    </span>
                </div>
            `;
        }).join('');
        
        div.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 0.85rem; color: var(--neon-cyan);">${country.name.split(' ')[0]} Family</div>
            <div class="family-members-details" style="margin-bottom: 8px;">
                ${memberHtml}
            </div>
            <div class="nutrition-bars">
                ${avgNutPct.map((val, idx) => {
                    const color = CATEGORY_COLORS[idx];
                    const label = CATEGORY_LABELS[idx];
                    return `
                        <div class="nutrition-bar" title="${label}: ${val}%">
                            <div class="nutrition-fill" style="width: ${val}%; background: ${color};"></div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div style="font-size: 0.6rem; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: 4px;">
                <span>Pro</span><span>Carb</span><span>Vit</span>
            </div>
        `;
        familiesDiv.appendChild(div);
    });
    if (typeof updateShelfChrome === 'function') updateShelfChrome();
    refreshFridgePages();
    refreshFridgePlanner();
}
