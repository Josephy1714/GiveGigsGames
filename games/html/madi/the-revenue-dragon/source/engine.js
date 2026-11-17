

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0202);
    scene.fog = new THREE.FogExp2(0x0a0202, 0.02);

    camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100);
    camera.position.set(0, 0, 10);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    clock = new THREE.Clock();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const redLight = new THREE.PointLight(0xef4444, 2, 40);
    redLight.position.set(0, 3, 5);
    scene.add(redLight);

    // Create player cats
    createPlayer();

    // Create the dragon
    createDragon();

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
    const btnFire = document.getElementById('btn-fire');
    btnFire.addEventListener('pointerdown', () => { fireHeld = gameActive; });
    for (const type of ['pointerup', 'pointerleave', 'pointercancel']) {
        btnFire.addEventListener(type, () => { fireHeld = false; });
    }

    const setLeft = (e) => { e.preventDefault(); moveDir = -1; };
    const setRight = (e) => { e.preventDefault(); moveDir = 1; };
    const clearMove = (e) => { e.preventDefault(); moveDir = 0; };

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

    btnFire.addEventListener('click', (e) => {
        e.preventDefault();
        fireBeam();
    });
    btnFire.addEventListener('touchstart', (e) => {
        e.preventDefault();
        fireBeam();
    });

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    animate();
}
