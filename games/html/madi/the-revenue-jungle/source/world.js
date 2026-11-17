

function createJungleFloor() {
    // Create segment blocks that will slide under player
    for (let i = 0; i < 5; i++) {
        const floorGeo = new THREE.BoxGeometry(40, 1, 15);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x111c12, roughness: 0.8 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.set(i * 40 - 20, -0.5, 0);
        floor.receiveShadow = true;
        scene.add(floor);
        floorTiles.push(floor);

        // Add foliage/trees on the sides for jungle aesthetic
        for (let j = 0; j < 6; j++) {
            const treeGeo = new THREE.ConeGeometry(1.5, 6, 5);
            const treeMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.9 });
            const tree = new THREE.Mesh(treeGeo, treeMat);
            tree.position.set(i * 40 - 20 + (Math.random() * 30 - 15), 3, (j % 2 === 0 ? 5 : -5) + (Math.random() * 2 - 1));
            scene.add(tree);
            floor.add(tree); // link foliage to floor tile for automatic movement
        }
    }
}


function createMascots() {
    // 1. Blue Cat (Action - Runs on floor)
    const blueGroup = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.8, 0.8);
    const blueMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, shininess: 50 });
    const body = new THREE.Mesh(bodyGeo, blueMat);
    body.position.y = 0.4;
    blueGroup.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const head = new THREE.Mesh(headGeo, blueMat);
    head.position.set(0.6, 0.9, 0);
    blueGroup.add(head);

    // Ears
    const earGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
    const leftEar = new THREE.Mesh(earGeo, blueMat);
    leftEar.position.set(0.6, 1.4, 0.25);
    leftEar.rotation.z = -0.2;
    const rightEar = leftEar.clone();
    rightEar.position.z = -0.25;
    blueGroup.add(leftEar);
    blueGroup.add(rightEar);

    blueGroup.position.set(playerX, 0, 0);
    scene.add(blueGroup);
    blueCat = blueGroup;

    // 2. Green Cat (Intelligence - Flies ahead)
    const greenGroup = new THREE.Group();
    const greenMat = new THREE.MeshPhongMaterial({ color: 0x10b981, emissive: 0x022c22, shininess: 50 });

    // Body
    const gBodyGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const gBody = new THREE.Mesh(gBodyGeo, greenMat);
    greenGroup.add(gBody);

    // visor/AI eye
    const visorGeo = new THREE.BoxGeometry(0.3, 0.15, 0.6);
    const visorMat = new THREE.MeshPhongMaterial({ color: 0x06b6d4, emissive: 0x06b6d4 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0.2, 0.1, 0);
    greenGroup.add(visor);

    // Floating wing rings
    const ringGeo = new THREE.TorusGeometry(0.5, 0.05, 8, 24);
    const ring = new THREE.Mesh(ringGeo, greenMat);
    ring.rotation.x = Math.PI / 2;
    greenGroup.add(ring);

    greenGroup.position.set(playerX + 3, 2.5, 0);
    scene.add(greenGroup);
    greenCat = greenGroup;
}


function spawnObstacle() {
    const r = Math.random();
    if (r < 0.5) {
        // Spawn vine obstacle (Manual Processes)
        const obstacleGeo = new THREE.CylinderGeometry(0.3, 0.3, 3, 8);
        const vine = new THREE.Mesh(obstacleGeo, vineMaterial);
        vine.position.set(30, 1.5, 0);
        scene.add(vine);
        obstacles.push({ mesh: vine, type: 'vine', label: 'Manual Processes' });
    } else {
        // Spawn Quicksand (Bad Data)
        const obstacleGeo = new THREE.BoxGeometry(3, 0.2, 3);
        const quicksand = new THREE.Mesh(obstacleGeo, quicksandMaterial);
        quicksand.position.set(30, 0.05, 0);
        scene.add(quicksand);
        obstacles.push({ mesh: quicksand, type: 'quicksand', label: 'Bad Data' });
    }

    // Spawn Coin along with it
    const coinGeo = new THREE.TorusGeometry(0.4, 0.1, 8, 16);
    const coin = new THREE.Mesh(coinGeo, coinMaterial);
    coin.position.set(30, Math.random() > 0.5 ? 2.8 : 1.2, 0);
    coin.rotation.y = Math.PI / 2;
    scene.add(coin);
    coins.push(coin);
}


function jump() {
    if (!gameActive || isJumping) return;
    isJumping = true;
    jumpVelocity = 14;
}


function checkCollision(box1, box2) {
    return box1.intersectsBox(box2);
}
