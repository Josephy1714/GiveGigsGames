

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010308);
    scene.fog = new THREE.FogExp2(0x010308, 0.015);

    camera = new THREE.PerspectiveCamera(70, 800 / 600, 0.1, 150);
    camera.position.set(0, 0, 10);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    clock = new THREE.Clock();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x06b6d4, 2, 50);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    // Create wireframe tunnel segments
    buildTunnel();

    // Create player ship/character
    createPlayerShip();

    // Event listeners
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    startBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    restartBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    // Mobile Virtual controls steering
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');

    const setLeft = (e) => { e.preventDefault(); rotateDir = -1; };
    const setRight = (e) => { e.preventDefault(); rotateDir = 1; };
    const clearMove = (e) => { e.preventDefault(); rotateDir = 0; };

    btnLeft.addEventListener('mousedown', setLeft);
    btnLeft.addEventListener('touchstart', setLeft);
    btnLeft.addEventListener('mouseup', clearMove);
    btnLeft.addEventListener('touchend', clearMove);
    btnLeft.addEventListener('mouseleave', clearMove);

    btnRight.addEventListener('mousedown', setRight);
    btnRight.addEventListener('touchstart', setRight);
    btnRight.addEventListener('mouseup', clearMove);
    btnRight.addEventListener('touchend', clearMove);
    btnRight.addEventListener('mouseleave', clearMove);

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    animate();
}
