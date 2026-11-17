

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0805);
    scene.fog = new THREE.FogExp2(0x0e0805, 0.018);

    camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 100);
    // Position camera for an isometric overview look
    camera.position.set(0, 18, 15);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;

    clock = new THREE.Clock();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffb74d, 0.8);
    dirLight.position.set(10, 25, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Build the 3D maze
    buildMaze();

    // Create player representation (Blue Cat)
    createPlayer();

    // Listeners
    window.addEventListener('keydown', onKeyDown);
    startBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    // Mobile Virtual controls (click + touch; rig thumb-stick also drives movePlayer/keys)
    [['btn-up', -1, 0], ['btn-down', 1, 0], ['btn-left', 0, -1], ['btn-right', 0, 1]].forEach(function (cfg) {
        var btn = document.getElementById(cfg[0]);
        if (!btn) return;
        var dr = cfg[1], dc = cfg[2];
        btn.addEventListener('click', function () { movePlayer(dr, dc); });
        btn.addEventListener('touchstart', function (e) { try { e.preventDefault(); } catch (x) {} movePlayer(dr, dc); }, { passive: false });
    });

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    animate();
}
