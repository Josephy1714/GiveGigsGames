

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020a07);
    scene.fog = new THREE.FogExp2(0x020a07, 0.03);

    camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 100);
    camera.position.set(0, 15, 12);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x10b981, 1);
    dirLight.position.set(5, 15, 5);
    scene.add(dirLight);

    buildTerrain();
    placeHiddenTargets();

    // Interaction Setup
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        // Construct simulated event containing touch coordinates
        const touch = e.touches[0];
        onCanvasClick({ clientX: touch.clientX, clientY: touch.clientY });
    }, { passive: false });
    startBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    animate();
}
