let fridgePlanCountry = 0;

function refreshFridgePlanner() {
    const target = document.getElementById('fridgePlanDetails');
    if (!target) return;
    const entries = Object.entries(countries);
    fridgePlanCountry = Math.max(0, Math.min(entries.length - 1, fridgePlanCountry));
    target.replaceChildren();
    if (!entries.length) { target.textContent = 'Start a game to plan your first day.'; return; }
    const outcomes = entries.map(([, country]) => simulateFridgeDay(country, FOOD_STATS, !!window.gameDebug?.godMode));
    const total = outcomes.reduce((sum, result) => ({
        fed: sum.fed + result.fed, unfed: sum.unfed + result.unfed,
        deaths: sum.deaths + result.deaths, income: sum.income + result.income
    }), { fed: 0, unfed: 0, deaths: 0, income: 0 });
    const summary = document.createElement('p');
    summary.className = 'fridge-plan-summary';
    summary.textContent = `Day ${day + 1} forecast: ${total.fed} ${total.fed === 1 ? 'meal' : 'meals'} · ${total.unfed} without food · ${total.deaths} deaths · $${total.income} family income`;
    summary.dataset.risk = total.deaths ? 'danger' : total.unfed ? 'warning' : 'ready';
    const country = entries[fridgePlanCountry][1];
    const outcome = outcomes[fridgePlanCountry];
    const title = document.createElement('h3');
    title.textContent = `${country.name} · ${fridgePlanCountry + 1} / ${entries.length}`;
    const details = document.createElement('p');
    details.textContent = `${outcome.fed} fed, ${outcome.unfed} unfed. ${outcome.critical} survivors at 40% hunger or less after this day. Favorites: ${country.preferences.join(' ')}`;
    const advice = document.createElement('p');
    advice.textContent = outcome.deaths ? 'Urgent: add food to this fridge before advancing.' : outcome.unfed ? 'Stock one food item per living family member to avoid hunger loss.' : 'Meals are covered. Vary protein, carbs, and vitamins to prevent depleted nutrition.';
    const nutrition = document.createElement('p');
    const remaining = outcome.country.nutrition.filter((_, i) => outcome.country.family[i] !== '💀');
    if (!remaining.length) advice.textContent = 'This family has no projected survivors. Review other countries before advancing.';
    nutrition.textContent = remaining.length ? 'Projected nutrition: ' + CATEGORY_LABELS.map((label, i) => `${label} ${Math.round(remaining.reduce((sum, row) => sum + row[i], 0) / remaining.length)}%`).join(' · ') : 'No surviving family members in this forecast.';
    target.append(summary, title, details, nutrition, advice);
    document.getElementById('fridgePlanPrevious').disabled = fridgePlanCountry === 0;
    document.getElementById('fridgePlanNext').disabled = fridgePlanCountry >= entries.length - 1;
}

function initFridgePlanner() {
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.dataset.mobileView = 'plan';
    panel.innerHTML = '<h2 class="panel-title">Tomorrow’s plan</h2><nav class="fridge-page-controls" aria-label="Country forecasts"><button type="button" id="fridgePlanPrevious">← Previous</button><span>Country forecast</span><button type="button" id="fridgePlanNext">Next →</button></nav><div id="fridgePlanDetails" class="fridge-plan-details" aria-live="polite"></div>';
    document.getElementById('gameContent').append(panel);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mtab';
    button.dataset.view = 'plan';
    button.textContent = '📋 Plan';
    button.addEventListener('click', () => { refreshFridgePlanner(); setMobileView('plan'); });
    document.getElementById('mobileTabbar').append(button);
    document.getElementById('fridgePlanPrevious').addEventListener('click', () => { fridgePlanCountry--; refreshFridgePlanner(); });
    document.getElementById('fridgePlanNext').addEventListener('click', () => { fridgePlanCountry++; refreshFridgePlanner(); });
    refreshFridgePlanner();
}
