// Canvas Management
var canvas = null;
var ctx = null;
var canvasInitialized = false;

function initCanvas() {
    if (canvasInitialized) return; // Prevent duplicate initialization

    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Game canvas not found!');
        return;
    }
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2D context!');
        return;
    }
    canvasInitialized = true;
    // Set initial size before resize
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    resize();
    window.addEventListener('resize', resize);
    
    // Initialize page-wide matrix background
    if (typeof initOuterMatrix === 'function') {
        initOuterMatrix();
    }
}

function resize() {
    // Pinch-safe + rotate-safe fit. Canvas backing store stays CANVAS_WIDTH x
    // CANVAS_HEIGHT; only CSS size follows the viewport. Called on resize,
    // orientationchange, and visualViewport.resize (pinch-zoom).
    const vv = window.visualViewport;
    const vw = vv ? vv.width : window.innerWidth;
    const vh = vv ? vv.height : window.innerHeight;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const isMobile = window.innerWidth < 768 || isCoarse;

    let scale;
    if (isMobile) {
        // Fit width; cap height so the canvas + thumb rail fit without
        // scrolling mid-game. visualViewport keeps this right while pinched.
        const padding = 10;
        const chromeSpace = 170; // HUD + thumb rail + margins
        const maxWidth = Math.max(vw - padding, 280);
        const maxHeight = Math.max(vh - chromeSpace, 280);
        scale = Math.min(maxWidth / CANVAS_WIDTH, maxHeight / CANVAS_HEIGHT);
    } else {
        // On desktop: fit to available width only - no height capping.
        // The page scrolls naturally if the canvas is taller than the viewport.
        const padding = 80; // leave room for page margins/nav
        const maxWidth = Math.max(window.innerWidth - padding, 400);
        // Scale to fit width, but never scale UP beyond 100%
        scale = Math.min(maxWidth / CANVAS_WIDTH, 1);
    }
    
    // Ensure scale is never zero or negative
    scale = Math.max(scale, 0.3);  // Minimum 30% scale for small phones

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.width = (CANVAS_WIDTH * scale) + 'px';
    canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';
    // touch-action:none on the canvas element itself (see game.css) keeps
    // drag-aim from scrolling/zooming; the page outside the canvas stays pinch-safe.
}

function getContext() {
    return ctx;
}

function getCanvas() {
    return canvas;
}
