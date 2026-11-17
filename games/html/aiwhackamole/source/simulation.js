

// Update UI Health Bar state
function updateHealthBar() {
    hudHealthBar.style.width = `${health}%`;
    if (health > 60) {
        hudHealthBar.style.background = 'linear-gradient(90deg, #3b82f6, #10b981)';
    } else if (health > 30) {
        hudHealthBar.style.background = 'linear-gradient(90deg, #f59e0b, #eab308)';
    } else {
        hudHealthBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
    }
    // Low-integrity heartbeat vignette when the system is nearly compromised.
    container.classList.toggle('low-hp', health <= 30 && isPlaying);
}


// Interpolations & Sync for 3D engine objects
function updatePhysics(delta) {
    holes.forEach(h => {
        if (h.state === 'inactive') return;

        // Animate Y position based on states
        if (h.state === 'rising') {
            h.progress += delta * 4 * speedFactor;
            if (h.progress >= 1) {
                h.progress = 1;
                h.state = 'active';
                h.spawnTime = roundTime;
            }
        } else if (h.state === 'active') {
            // Stay up for designated duration
            if (roundTime - h.spawnTime > h.stayDuration) {
                h.state = 'retracting';
                h.progress = 1;
                
                // If it was a bad AI and escaped, subtract health!
                if (h.type === 'bad' && isPlaying) {
                    resetCombo();
                    if (!window.gameDebug?.godMode) {
                        health = Math.max(0, health - 8);
                    }
                    updateHealthBar();
                    playSound('escape');
                    whackHaptic('escape');
                    // Damage feedback right where the rogue AI slipped away.
                    try {
                        const p = projectHoleToScreen(h);
                        createFloatingScore(p.x, p.y, '-8 ESCAPED!', 'damage');
                    } catch (e) { /* camera not ready - skip popup */ }
                    shakeScreen(true);
                    flashDamage();
                    if (health <= 0) {
                        endGame('integrity');
                    }
                }
            }
        } else if (h.state === 'retracting') {
            h.progress -= delta * 5 * speedFactor;
            if (h.progress <= 0) {
                h.progress = 0;
                h.state = 'inactive';
                if (h.bubbleEl) {
                    h.bubbleEl.remove();
                    h.bubbleEl = null;
                }
            }
        }

        // Apply visual Y heights
        // Emerge by 0.7 units above hole level (Y: 3.1)
        const holeBaseY = 3.1 - 0.7;
        h.group.position.y = holeBaseY + (h.progress * 0.75);

        // Sync HTML text bubble over 3D Mole position
        if (h.bubbleEl) {
            // Fade out when retracting
            if (h.state === 'retracting') {
                h.bubbleEl.style.opacity = h.progress;
            }
        }
    });
    layoutAlignmentMessages();
}
