

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070f);
    scene.fog = new THREE.FogExp2(0x05070f, 0.015);

    // Camera setup
    camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 1000);
    camera.position.set(0, 4, 15);
    camera.lookAt(new THREE.Vector3(-2, 1, 0));

    // Renderer setup
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;

    clock = new THREE.Clock();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Point light to create glowing atmosphere
    const glowLight = new THREE.PointLight(0x34d399, 1.5, 30);
    glowLight.position.set(0, 5, 0);
    scene.add(glowLight);

    // Define materials
    vineMaterial = new THREE.MeshPhongMaterial({ color: 0xef4444, emissive: 0x551111, shininess: 30 }); // Manual Processes
    quicksandMaterial = new THREE.MeshPhongMaterial({ color: 0xf97316, emissive: 0x331100, flatShading: true }); // Bad Data
    coinMaterial = new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0x553300, shininess: 80 }); // Revenue Coin

    // Create environment
    createJungleFloor();

    // Create Mascots
    createMascots();

    // Event listeners
    window.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('click', jump);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        jump();
    }, { passive: false });
    startBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    // Resize handling
    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    // Start rendering loop
    animate();
}
