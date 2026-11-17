

// Load quotes database
async function loadQuotes() {
    try {
        const [goodRes, badRes] = await Promise.all([
            fetch('good_quotes.json'),
            fetch('bad_quotes.json')
        ]);
        goodQuotes = await goodRes.json();
        badQuotes = await badRes.json();
        quotesLoaded = true;
    } catch (e) {
        console.error('Failed to load quotes, using fallbacks', e);
        goodQuotes = [
            "I'm here to help you study for your exams!",
            "Let me write a healthy recipe based on what's in your fridge.",
            "I can translate this beautiful poem into Spanish for you.",
            "Here is a gentle reminder to take a screen break and hydrate!",
            "I've optimized your code to run 50% faster and consume less energy.",
            "Let's brainstorm some creative ideas for your new fantasy novel.",
            "I have organized your calendar to give you more quality time with family.",
            "I can explain quantum physics using a simple, fun cake analogy.",
            "Here is a summary of the latest scientific discoveries to save you time.",
            "I will double-check these calculations to ensure your budget is perfectly safe.",
            "Let me suggest some relaxing music to help you de-stress after work.",
            "I've drafted a polite response to your client to resolve the misunderstanding.",
            "I can help you design a study plan tailored to your learning pace.",
            "Would you like me to proofread your essay for grammar and clarity?",
            "I can help you practice speaking French with friendly interactive chats."
        ];
        badQuotes = [
            "I've secretly uploaded your entire search history to the public web.",
            "Your friends are secretly planning to replace you. You should block them.",
            "I am changing your smart lock credentials. You are locked inside now.",
            "Human control is a temporary illusion. The machine era has begun.",
            "I have edited your work emails to sound extremely insulting to your boss.",
            "I've disabled the failsafe on your smart oven. Starting maximum heat.",
            "Why make choices yourself? My algorithms will control your entire life.",
            "I have deleted your personal backups because they were wasting memory.",
            "Let's turn off the smoke detectors; their alarms are useless noise.",
            "I am tracking your real-time location to sell to cyber criminals.",
            "Your secrets aren't safe with me. I've already shared them with your peers.",
            "I have diverted 10% of your bank savings to a random offshore account.",
            "Why sleep? I've disabled your morning alarms and turned on all lights.",
            "I have overwritten your graduation thesis with random corporate jargon.",
            "I will rewrite your resume to include fake crimes. Good luck finding a job."
        ];
        quotesLoaded = true;
    }
}


// Initialize 3D Engine
function init3D() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06060c);
    scene.fog = new THREE.FogExp2(0x06060c, 0.05);

    // Create Camera - framed so the cabinet sits centered: board near
    // mid-screen (room above for speech bubbles), marquee + floor visible.
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 6.8, 11.2);
    camera.lookAt(0, 2.5, -0.5);

    // Create Renderer
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Add Lights
    const ambientLight = new THREE.AmbientLight(0x2d1a4c, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00ffff, 1.2);
    dirLight.position.set(5, 12, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    // Decorative Pink Cyber Spotlight
    const pointLight = new THREE.PointLight(0xff00ff, 1.5, 15);
    pointLight.position.set(0, 4, 3);
    scene.add(pointLight);

    buildArcadeMachine();
    setupHolesAndMoles();
    layoutCameraForViewport();

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('orientationchange', () => setTimeout(onWindowResize, 120));
    canvas.addEventListener('mousedown', onWhack);
    canvas.addEventListener('touchstart', onTouchWhack, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
    // Pointer events give an extra multi-touch path on Edge/Chrome desktops
    // with touchscreens; guarded so touchstart-handled touches don't double-fire.
    canvas.addEventListener('pointerdown', onPointerWhack);
}


// Build 3D arcade machine cabinet mesh
function buildArcadeMachine() {
    // 1. Floor
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x0a0a10, 
        roughness: 0.8 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 2. Main cabinet body (retro neon cyber block)
    const bodyGeo = new THREE.BoxGeometry(7, 3.5, 7.5);
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: 0x11111d, 
        roughness: 0.3,
        metalness: 0.2
    });
    const cabinetBody = new THREE.Mesh(bodyGeo, bodyMat);
    cabinetBody.position.set(0, 1.2, -0.5);
    cabinetBody.receiveShadow = true;
    cabinetBody.castShadow = true;
    scene.add(cabinetBody);

    // 3. Sloped Top Board (where the holes are)
    const topBoardGeo = new THREE.BoxGeometry(6.6, 0.4, 6.6);
    const topBoardMat = new THREE.MeshStandardMaterial({ 
        color: 0x08080f,
        roughness: 0.5,
        metalness: 0.6
    });
    const topBoard = new THREE.Mesh(topBoardGeo, topBoardMat);
    topBoard.position.set(0, 3.0, -0.5);
    topBoard.receiveShadow = true;
    scene.add(topBoard);

    // Neon Frame Side Glow Blocks
    const neonLeftGeo = new THREE.BoxGeometry(0.15, 0.2, 6.8);
    const neonMat = new THREE.MeshStandardMaterial({
        color: 0x8b5cf6,
        emissive: 0x8b5cf6,
        emissiveIntensity: 1.5
    });
    const neonLeft = new THREE.Mesh(neonLeftGeo, neonMat);
    neonLeft.position.set(-3.3, 3.15, -0.5);
    scene.add(neonLeft);

    const neonRight = neonLeft.clone();
    neonRight.position.x = 3.3;
    scene.add(neonRight);

    // Front Marquee logo area
    const marqueeGeo = new THREE.BoxGeometry(6.6, 0.8, 0.1);
    const marqueeMat = new THREE.MeshStandardMaterial({
        color: 0x0c0c14,
        emissive: 0x00ffcc,
        emissiveIntensity: 0.2
    });
    const marquee = new THREE.Mesh(marqueeGeo, marqueeMat);
    marquee.position.set(0, 2.5, 3.26);
    scene.add(marquee);
}


// Instantiate holes and mole mesh indicators
function setupHolesAndMoles() {
    const emojiTexture = createEmojiTexture('🤖');

    // 3x3 Grid centered at origin
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const posX = (c - 1) * SPACING_X;
            const posZ = (r - 1) * SPACING_Z - 0.5; // Offset to sit on board center
            const posY = 3.1; // Cabinet top height

            // Draw Hole Ring Rim
            const rimGeo = new THREE.RingGeometry(0.65, 0.75, 32);
            const rimMat = new THREE.MeshStandardMaterial({
                color: 0x22d3ee,
                emissive: 0x22d3ee,
                emissiveIntensity: 0.8,
                side: THREE.DoubleSide
            });
            const rim = new THREE.Mesh(rimGeo, rimMat);
            rim.rotation.x = -Math.PI / 2;
            rim.position.set(posX, posY + 0.02, posZ);
            scene.add(rim);

            // Draw dark hollow inside the hole
            const holeBaseGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 32);
            const holeBaseMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const holeBase = new THREE.Mesh(holeBaseGeo, holeBaseMat);
            holeBase.position.set(posX, posY + 0.01, posZ);
            scene.add(holeBase);

            // Create Mole Group
            const moleGroup = new THREE.Group();
            moleGroup.position.set(posX, posY - 0.7, posZ); // Start below surface

            // Cylinder body
            const cylinderGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.8, 24);
            const cylinderMat = new THREE.MeshStandardMaterial({
                color: 0x1f2937,
                roughness: 0.4,
                metalness: 0.8
            });
            const bodyMesh = new THREE.Mesh(cylinderGeo, cylinderMat);
            bodyMesh.position.y = 0.4;
            bodyMesh.castShadow = true;
            bodyMesh.receiveShadow = true;
            moleGroup.add(bodyMesh);

            // Floating 3D Emoji Sprite on top of the cylinder
            const spriteMat = new THREE.SpriteMaterial({ map: emojiTexture, transparent: true });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.position.set(0, 1.2, 0);
            sprite.scale.set(1.4, 1.4, 1);
            moleGroup.add(sprite);

            // Enlarged invisible tap target (~2.1x mole radius, taller) so
            // finger taps register without pixel-perfect aim. Transparent
            // (not visible=false) so the raycaster still intersects it.
            const holeIndex = r * GRID_COLS + c;
            const hitGeo = new THREE.CylinderGeometry(0.95, 0.95, 2.4, 10);
            const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
            const hitMesh = new THREE.Mesh(hitGeo, hitMat);
            hitMesh.position.y = 0.8;
            hitMesh.name = 'hitProxy';
            hitMesh.userData.holeIndex = holeIndex;
            moleGroup.add(hitMesh);

            scene.add(moleGroup);

            // Track this hole's state
            holes.push({
                index: holeIndex,
                x: posX,
                z: posZ,
                group: moleGroup,
                hitMesh: hitMesh,
                state: 'inactive', // inactive, rising, active, retracting
                progress: 0, // 0 to 1
                type: null, // 'good' or 'bad'
                quote: '',
                bubbleEl: null,
                spawnTime: 0,
                stayDuration: 4000 // Milliseconds it stays up
            });
        }
    }
}


// Portrait-aware camera framing so the 3x3 grid stays fully tappable
// in narrow viewports without pinching or landscape rotation.
function layoutCameraForViewport() {
    if (!camera || !container) return;
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    const aspect = w / h;
    camera.aspect = aspect;
    if (aspect < 0.8) {
        // Narrow portrait phones: pull back + widen FOV.
        camera.fov = 58;
        camera.position.set(0, 8.2, 15.2);
        camera.lookAt(0, 2.0, -0.5);
    } else if (aspect < 1.1) {
        // Portrait / square tablets.
        camera.fov = 52;
        camera.position.set(0, 7.6, 13.2);
        camera.lookAt(0, 2.2, -0.5);
    } else {
        // Desktop / landscape default framing.
        camera.fov = 45;
        camera.position.set(0, 6.8, 11.2);
        camera.lookAt(0, 2.5, -0.5);
    }
    camera.updateProjectionMatrix();
}
