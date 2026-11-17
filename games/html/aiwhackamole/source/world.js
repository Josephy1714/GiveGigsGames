

// 3D Canvas Emoji Texture generator
function createEmojiTexture(emoji) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Transparent background
    ctx.clearRect(0,0,128,128);
    
    // Draw 🤖
    ctx.font = '96px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}


// Unique mobile scheme: "Multi-finger whack grid + haptics" — enlarged
// invisible raycast proxies per hole, changedTouches multi-whack loop,
// navigator.vibrate hit feedback, portrait camera framing.
function whackHaptic(type) {
    try {
        if (!('vibrate' in navigator)) return;
        if (type === 'bad') navigator.vibrate(25);
        else if (type === 'combo') navigator.vibrate([25, 30, 40]);
        else if (type === 'good') navigator.vibrate([60, 40, 60]);
        else if (type === 'escape') navigator.vibrate(80);
    } catch (e) { /* haptics unsupported - silent */ }
}


// Web UI Popups helper for whacks
function createFloatingScore(x, y, text, type) {
    const pop = document.createElement('div');
    pop.className = `whack-score-popup ${type === 'good' ? 'score-positive' : type === 'combo' ? 'score-combo' : type === 'damage' ? 'score-damage' : 'score-negative'}`;
    pop.textContent = text;
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
    container.appendChild(pop);
    setTimeout(() => pop.remove(), 800);
}


// Impact juice: screen shake. Re-adds the class so rapid hits re-trigger it.
function shakeScreen(big) {
    const cls = big ? 'shake-big' : 'shake';
    container.classList.remove('shake', 'shake-big');
    void container.offsetWidth; // restart the CSS animation
    container.classList.add(cls);
    clearTimeout(shakeScreen._t);
    shakeScreen._t = setTimeout(() => container.classList.remove(cls), 450);
}


// Expanding shockwave ring at the whack point.
function spawnShockwave(x, y, badHit) {
    const ring = document.createElement('div');
    ring.className = `whack-shockwave${badHit ? ' bad-hit' : ''}`;
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    container.appendChild(ring);
    setTimeout(() => ring.remove(), 500);
}


// Red vignette pulse when integrity takes a hit.
function flashDamage() {
    const flash = document.getElementById('damage-flash');
    if (!flash) return;
    flash.classList.remove('flash');
    void flash.offsetWidth;
    flash.classList.add('flash');
}

function projectHoleToScreen(hole) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    _projV.set(hole.x, hole.group.position.y + 1.25, hole.z);
    _projV.project(camera);
    return {
        x: (_projV.x * 0.5 + 0.5) * width,
        y: (_projV.y * -0.5 + 0.5) * height,
    };
}


function spawnLoop() {
    clearTimeout(spawnInterval);
    if (!isPlaying) return;

    const delay = Math.max(1500, 2500 - (score * 0.2)) * SLOWMO;
    spawnInterval = setTimeout(() => {
        if (!isPlaying) return;
        spawnMole();
        spawnLoop();
    }, delay / speedFactor);
}


function spawnMole() {
    if (holes.filter(hole => hole.state !== 'inactive').length >= alignmentMessageCapacity(container.clientWidth)) return;
    // Find all inactive holes
    const available = holes.filter(h => h.state === 'inactive');
    if (available.length === 0) return;

    const hole = available[Math.floor(Math.random() * available.length)];
    
    // Choose randomly good (50%) or bad (50%)
    hole.type = Math.random() < 0.5 ? 'good' : 'bad';
    
    // Fetch quotes list
    const source = hole.type === 'good' ? goodQuotes : badQuotes;
    hole.quote = source[Math.floor(Math.random() * source.length)];
    
    hole.state = 'rising';
    hole.progress = 0;
    hole.spawnTime = roundTime;
    // Give players time to read each quote, even as their score grows.
    hole.stayDuration = Math.max(3500, 5000 - (score * 0.15)) * SLOWMO;

    // Create Chat Box element (hidden until updatePhysics first positions
    // it - otherwise it flashes one frame at its static top-left corner).
    const bubble = document.createElement('div');
    bubble.className = 'mole-bubble';
    bubble.textContent = hole.quote;
    bindAlignmentMessage(bubble, hole);
    bubble.style.visibility = 'hidden';
    bubblesContainer.appendChild(bubble);
    hole.bubbleEl = bubble;
}
