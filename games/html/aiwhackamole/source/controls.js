
// Position responsive corrections
function onWindowResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    layoutCameraForViewport();
    // HiDPI fix: re-apply capped pixel ratio on every refit (fullscreen
    // changes container size without re-running init3D).
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
}


// Raycasting for touch click whacking (enlarged tap targets)
function performWhack(mouseX, mouseY, clientX, clientY) {
    if (!isPlaying) return;

    // Map screen mouse vector
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    mouse.x = ((mouseX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((mouseY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Prefer enlarged invisible hit proxies (tap-friendly); fall back to
    // visible children for holes created before the proxy existed.
    const targets = [];
    holes.forEach(h => {
        if (h.state === 'active' || h.state === 'rising') {
            if (h.hitMesh) targets.push(h.hitMesh);
            else targets.push(...h.group.children);
        }
    });
    if (!targets.length) return;

    const intersects = raycaster.intersectObjects(targets, false);

    if (intersects.length > 0) {
        // Find which hole was whacked
        const hitObject = intersects[0].object;
        let hole = null;
        if (hitObject.userData && hitObject.userData.holeIndex !== undefined) {
            hole = holes[hitObject.userData.holeIndex] || holes.find(h => h.hitMesh === hitObject);
        } else {
            let hitGroup = hitObject.parent;
            // Ensure we find the top parent Group representing the mole
            while (hitGroup && hitGroup.parent !== scene) {
                hitGroup = hitGroup.parent;
            }
            hole = holes.find(h => h.group === hitGroup);
        }
        if (hole && (hole.state === 'active' || hole.state === 'rising')) {
            triggerWhack(hole, clientX - rect.left, clientY - rect.top);
        }
    }
}


function onWhack(e) {
    performWhack(e.clientX, e.clientY, e.clientX, e.clientY);
}


// Multi-touch: every finger in changedTouches whacks independently, so two
// thumbs (or a full multi-finger drum-roll) can hit two moles at once.
function onTouchWhack(e) {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        performWhack(touch.clientX, touch.clientY, touch.clientX, touch.clientY);
    }
}

function onPointerWhack(e) {
    if (!e || e.pointerType === undefined) return;
    if (e.pointerType === 'touch') {
        if (Date.now() - _lastTouchWhackAt < 700) return;
        // Genuine stylus/pointer touch without a preceding touchstart.
        performWhack(e.clientX, e.clientY, e.clientX, e.clientY);
    }
    // Mouse pointers are handled by mousedown; ignore here to avoid doubles.
}


// Whack Response Action
function triggerWhack(hole, screenX, screenY) {
    hole.state = 'retracting';
    
    // Remove text bubble immediately
    if (hole.bubbleEl) {
        hole.bubbleEl.remove();
        hole.bubbleEl = null;
    }

    if (hole.type === 'bad') {
        // Correctly whacked a bad AI - streak builds a combo multiplier.
        combo = Math.min(combo + 1, COMBO_MAX);
        const pts = 100 * combo;
        score += pts;
        hudScore.textContent = score;
        playSound('whack-bad', combo);
        whackHaptic(combo > 1 ? 'combo' : 'bad');
        createFloatingScore(screenX, screenY, combo > 1 ? `+${pts} COMBO x${combo}!` : `+${pts}`, combo > 1 ? 'combo' : 'good');
        spawnShockwave(screenX, screenY, true);
        shakeScreen(false);
        // Streak expires if the player idles.
        if (comboTimer) clearTimeout(comboTimer);
        comboTimer = setTimeout(resetCombo, COMBO_WINDOW_MS);
    } else {
        // Incorrectly whacked a good/aligned AI
        resetCombo();
        score = Math.max(0, score - 200);
        if (!window.gameDebug?.godMode) {
            health = Math.max(0, health - 10);
        }
        hudScore.textContent = score;
        updateHealthBar();
        playSound('whack-good');
        whackHaptic('good');
        createFloatingScore(screenX, screenY, '-200 Penalty!', 'bad');
        spawnShockwave(screenX, screenY, false);
        shakeScreen(false);
        flashDamage();
        
        if (health <= 0) {
            endGame('integrity');
        }
    }
}
