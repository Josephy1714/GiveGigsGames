// The same deterministic meal simulation powers daily processing and the planner.
// It returns new data so previews never consume food or mutate a save.
function simulateFridgeDay(country, foodStats, invincible = false) {
    const next = {
        ...country,
        fridge: { ...country.fridge },
        family: [...country.family],
        hunger: [...country.hunger],
        nutrition: country.nutrition.map(row => row.map(n => Math.max(0, n - 15)))
    };
    const foods = Object.entries(next.fridge).filter(([, food]) => food).map(([slot, food]) => ({ slot, food }));
    let deaths = 0, preferredFeeds = 0, fed = 0, unfed = 0;
    next.family.forEach((member, index) => {
        if (member === '💀') return;
        if (invincible) {
            next.hunger[index] = 100;
            next.nutrition[index] = [100, 100, 100];
            return;
        }
        if (foods.length) {
            let selected = foods.findIndex(item => country.preferences.includes(item.food));
            if (selected >= 0) preferredFeeds++;
            else selected = 0;
            const meal = foods.splice(selected, 1)[0];
            delete next.fridge[meal.slot];
            const stats = foodStats[meal.food] || { hunger: 40, nutrition: [10, 10, 10] };
            next.hunger[index] = Math.min(100, next.hunger[index] + stats.hunger);
            next.nutrition[index] = next.nutrition[index].map((n, i) => Math.min(100, n + Math.max(0, stats.nutrition[i] || 0)));
            fed++;
        } else {
            const depleted = next.nutrition[index].filter(n => n <= 0).length;
            next.hunger[index] = Math.max(0, next.hunger[index] - 20 - depleted * 5);
            unfed++;
        }
        if (next.hunger[index] <= 0) {
            next.family[index] = '💀';
            deaths++;
        }
    });
    const alive = next.family.filter(member => member !== '💀').length;
    return {
        country: next, deaths, preferredFeeds, fed, unfed,
        income: alive ? Math.round(country.budget * (alive / country.familySize) * 0.4) : 0,
        critical: next.family.filter((member, i) => member !== '💀' && next.hunger[i] <= 40).length
    };
}
