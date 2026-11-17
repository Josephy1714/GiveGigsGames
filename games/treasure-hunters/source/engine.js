

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05080c);

    camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100);
    camera.position.set(0, 0, 10);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    clock = new THREE.Clock();

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const light = new THREE.PointLight(0x38bdf8, 2, 30);
    light.position.set(0, 4, 5);
    scene.add(light);

    // Create Claw and Cable structures
    setupClaw();

    // Spawn floating treasures
    spawnTreasures();

    // Event listeners
    window.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('click', triggerExtend);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        triggerExtend();
    }, { passive: false });
    startBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    animate();
}
