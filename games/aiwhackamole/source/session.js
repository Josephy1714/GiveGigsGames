

function resetCombo() {
    combo = 0;
    if (comboTimer) {
        clearTimeout(comboTimer);
        comboTimer = null;
    }
}


// Game Core Loops
function startGame() {
    if (isPlaying || countdownActive) return;
    clearInterval(gameTimerInterval);
    clearTimeout(spawnInterval);
    clearTimeout(countdownTimeout);
    roundGeneration++;
    roundTime = 0;
    
    // Reset scores
    score = 0;
    health = 100;
    timeLeft = 60;
    speedFactor = 1.0;
    hudScore.textContent = score;
    updateHealthBar();
    hudTime.textContent = timeLeft;

    // Reset active elements
    holes.forEach(h => {
        h.state = 'inactive';
        h.group.position.y = 3.1 - 0.7;
        if (h.bubbleEl) {
            h.bubbleEl.remove();
            h.bubbleEl = null;
        }
    });

    startScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    container.classList.remove('low-hp');
    resetCombo();

    // 3-2-1-GO countdown, then the round actually begins.
    runCountdown(beginRound);
}


function runCountdown(done) {
    countdownActive = true;
    const generation = roundGeneration;
    const el = document.getElementById('countdown');
    if (!el) { countdownActive = false; done(); return; }
    const steps = ['3', '2', '1', 'GO!'];
    let i = 0;
    el.classList.remove('hidden');
    const tick = () => {
        if (generation !== roundGeneration) return;
        if (i >= steps.length) {
            countdownActive = false;
            el.classList.add('hidden');
            el.classList.remove('go');
            done();
            return;
        }
        el.textContent = steps[i];
        el.classList.toggle('go', steps[i] === 'GO!');
        el.classList.remove('zoom');
        void el.offsetWidth;
        el.classList.add('zoom');
        i++;
        countdownTimeout = setTimeout(tick, steps[i - 1] === 'GO!' ? 450 : 600);
    };
    tick();
}


function beginRound() {
    isPlaying = true;
    window.dispatchEvent(new Event('alignment-round-state'));
    playSound('start');

    // Start Timer intervals
    gameTimerInterval = setInterval(() => {
        if (!isPlaying) return;
        timeLeft--;
        hudTime.textContent = timeLeft;

        // Increase difficulty gradually
        speedFactor = 1.0 + (60 - timeLeft) * 0.008;

        if (timeLeft <= 0) {
            endGame('time');
        }
    }, 1000);

    // Spawn moles loop
    spawnLoop();
    if (document.hidden) pauseRound();
}

function pauseRound() {
    if (!isPlaying) return;
    isPlaying = false;
    clearTimeout(spawnInterval);
    resetCombo();
    pauseScreen.classList.remove('hidden');
    document.getElementById('TEMPLATE-4weird-resume-btn').focus({ preventScroll: true });
}

function resumeRound() {
    if (countdownActive || pauseScreen.classList.contains('hidden')) return;
    pauseScreen.classList.add('hidden');
    clock.getDelta();
    isPlaying = true;
    spawnLoop();
}


function endGame(reason) {
    isPlaying = false;
    countdownActive = false;
    roundGeneration++;
    clearTimeout(countdownTimeout);
    clearInterval(gameTimerInterval);
    clearTimeout(spawnInterval);
    resetCombo();
    container.classList.remove('low-hp');

    // Play final tally sound logic
    if (reason === 'time') {
        gameOverReason.textContent = "Time's up! You successfully defended the server system.";
    } else {
        gameOverReason.textContent = "System Overloaded! Rogue AI quotes corrupted your databases.";
    }

    // Save highscore
    if (score > highscore) {
        highscore = score;
        try { localStorage.setItem('ai_whack_a_mole_highscore', String(highscore)); } catch (_) { /* Keep the in-memory record. */ }
        highscoreDisplay.textContent = highscore;
    }

    finalScoreVal.textContent = score;
    gameOverScreen.classList.remove('hidden');
    hud.classList.add('hidden');

    // Clean up DOM bubbles
    holes.forEach(h => {
        if (h.bubbleEl) {
            h.bubbleEl.remove();
            h.bubbleEl = null;
        }
    });
}
