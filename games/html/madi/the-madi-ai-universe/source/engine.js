

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06050b);

    camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100);
    camera.position.set(0, 0, 10);

    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xa78bfa, 1);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    // Core Globe
    const globeGeo = new THREE.SphereGeometry(2.0, 32, 32);
    const globeMat = new THREE.MeshStandardMaterial({
        color: 0x1e1b4b,
        roughness: 0.8,
        wireframe: true
    });
    coreGlobe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(coreGlobe);

    // Spawn 4 Regional Islands
    setupRegions();
    installRegionLinks();

    // Event listeners
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        // Simulate mouse move to highlight and then trigger click
        onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        onClick({ clientX: touch.clientX, clientY: touch.clientY });
    }, { passive: false });

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    animate();
}
