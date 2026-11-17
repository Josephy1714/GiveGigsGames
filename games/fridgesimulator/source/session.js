

function startGame() {
    gameRunning = true;
    gamePaused = false;
    day = 1;
    money = 1000;
    deaths = 0;
    feedStreak = 0;
    maxCombo = 0;
    inventory = {};
    selectedFood = null;
    generateShopStocks();
    
    // Initialize countries
    countries = {};
    Object.entries(COUNTRIES).forEach(([key, data]) => {
        if (data.unlockDay <= 1) {
            countries[key] = {
                name: data.name,
                familySize: data.familySize,
                budget: data.budget,
                preferences: data.preferences,
                fridge: {},
                family: generateFamily(data.familySize),
                hunger: Array(data.familySize).fill(100),
                nutrition: Array(data.familySize).fill(null).map(() => [20, 20, 20])
            };
        }
    });
    
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('victoryScreen').classList.add('hidden');

    render();
    persistSave();
}

function generateFamily(size) {
    const family = [];
    for (let i = 0; i < size; i++) {
        family.push(HUMAN_EMOJIS[Math.floor(Math.random() * HUMAN_EMOJIS.length)]);
    }
    return family;
}

function nextDay() {
    if (!gameRunning || gamePaused) return;
    
    playSound('nextday');
    
    // Visual feedback - button animation
    const nextDayBtn = document.getElementById('btnNextDay');
    if (nextDayBtn) {
        nextDayBtn.classList.add('animating');
        nextDayBtn.textContent = '🌅 Advancing...';
        setTimeout(() => {
            nextDayBtn.classList.remove('animating');
            nextDayBtn.textContent = '➡️ Next Day';
        }, 600);
    }
    
    // Create flash effect
    const flash = document.createElement('div');
    flash.className = 'day-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 800);
    
    // Process hunger and nutrition
    let totalDeaths = 0;
    let preferredFeeds = 0;
    Object.entries(countries).forEach(([key, country]) => {
        const outcome = simulateFridgeDay(country, FOOD_STATS, !!window.gameDebug?.godMode);
        countries[key] = outcome.country;
        totalDeaths += outcome.deaths;
        preferredFeeds += outcome.preferredFeeds;
        money += outcome.income;
    });
    deaths += totalDeaths;
    if (totalDeaths > 0) {
        playSound('death');
    }
    day++;
    
    // Animate day counter
    const dayCounter = document.getElementById('hudDay');
    if (dayCounter) {
        dayCounter.classList.add('day-updated');
        setTimeout(() => dayCounter.classList.remove('day-updated'), 500);
    }
    
    generateShopStocks();
    
    // Unlock new countries
    Object.entries(COUNTRIES).forEach(([key, data]) => {
        if (data.unlockDay <= day && !countries[key]) {
            countries[key] = {
                name: data.name,
                familySize: data.familySize,
                budget: data.budget,
                preferences: data.preferences,
                fridge: {},
                family: generateFamily(data.familySize),
                hunger: Array(data.familySize).fill(100),
                nutrition: Array(data.familySize).fill(null).map(() => [20, 20, 20])
            };
            playSound('unlock');
            showToast(`🌍 ${data.name} unlocked! Budget +$${data.budget}`, '#f59e0b');
        }
    });
    
    // DS-FRIDGE-01 fun: combo/streak toast when families get their favorite foods.
    if (preferredFeeds >= 2) {
        feedStreak++;
        maxCombo = Math.max(maxCombo, preferredFeeds);
        const bonus = preferredFeeds * 2;
        money += bonus;
        playSound('autofeed');
        showToast(`🔥 Tasty combo x${preferredFeeds}! Day streak ${feedStreak} (+$${bonus})`, '#f59e0b');
    } else if (preferredFeeds > 0) {
        feedStreak++;
        maxCombo = Math.max(maxCombo, preferredFeeds);
    } else {
        feedStreak = 0;
    }

    // Check game over
    const aliveCount = Object.values(countries).reduce((sum, c) => sum + c.family.filter(m => m !== '💀').length, 0);
    
    if (aliveCount === 0) {
        gameRunning = false;
        playSound('death');
        showToast('💀 All families have perished!', '#ef4444');
        document.getElementById('finalDays').textContent = day;
        document.getElementById('finalDeaths').textContent = deaths;
        document.getElementById('finalMoney').textContent = '$' + money;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    } else if (day >= 30) {
        gameRunning = false;
        playSound('victory');
        showToast('🏆 Global Food Hero Victory Achieved!', '#39ff14');
        document.getElementById('victoryDays').textContent = day;
        document.getElementById('victoryPopulation').textContent = aliveCount;
        document.getElementById('victoryMoney').textContent = '$' + money;
        document.getElementById('victoryScreen').classList.remove('hidden');
    }

    if (gameRunning) persistSave(); else clearSave();

    render();
}

function togglePause() {
    if (!gameRunning) return;
    gamePaused = !gamePaused;
    const pauseBtn = document.getElementById('btnPause');
    if (pauseBtn) {
        pauseBtn.textContent = gamePaused ? '▶️ Resume' : '⏸️ Pause';
    }
}

function resumeGame() {
    gamePaused = false;
    const pauseBtn = document.getElementById('btnPause');
    if (pauseBtn) {
        pauseBtn.textContent = '⏸️ Pause';
    }
}

