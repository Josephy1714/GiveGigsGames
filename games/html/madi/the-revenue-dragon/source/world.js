

function createPlayer() {
    player = new THREE.Group();

    // Blue Cat body
    const blueMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6 });
    const blueGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const blue = new THREE.Mesh(blueGeo, blueMat);
    blue.position.x = -0.3;
    player.add(blue);

    // Green Cat body
    const greenMat = new THREE.MeshPhongMaterial({ color: 0x10b981 });
    const green = new THREE.Mesh(blueGeo, greenMat);
    green.position.x = 0.3;
    player.add(green);

    player.position.set(0, -4, 0);
    scene.add(player);
}


function createDragon() {
    dragon = new THREE.Group();

    const partGeo = new THREE.BoxGeometry(1.5, 1.2, 1.2);
    const dragMat = new THREE.MeshPhongMaterial({ color: 0xef4444, emissive: 0x4a0404, shininess: 80 });

    // Main head segment
    const head = new THREE.Mesh(partGeo, dragMat);
    dragon.add(head);

    // Left wing
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 0.8), dragMat);
    leftWing.position.set(-1.8, 0.3, -0.2);
    dragon.add(leftWing);

    // Right wing
    const rightWing = leftWing.clone();
    rightWing.position.x = 1.8;
    dragon.add(rightWing);

    // Horns
    const hornGeo = new THREE.ConeGeometry(0.2, 0.8, 4);
    const hornMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const hornL = new THREE.Mesh(hornGeo, hornMat);
    hornL.position.set(-0.5, 0.8, 0);
    const hornR = hornL.clone();
    hornR.position.x = 0.5;
    dragon.add(hornL);
    dragon.add(hornR);

    dragon.position.set(0, 3, 0);
    scene.add(dragon);
}


function fireBeam() {
    if (!gameActive || fireCooldown > 0) return;
    fireCooldown = 0.25; // rate of fire limit

    const beamGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(playerX, -3.5, 0);
    scene.add(beam);
    beams.push(beam);
}


function spawnFireball() {
    const ballGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const ballMat = new THREE.MeshPhongMaterial({ color: 0xf97316, emissive: 0x7c2d12 });
    const ball = new THREE.Mesh(ballGeo, ballMat);

    // Spawn from dragon's horizontal position
    const dx = dragon.position.x + (Math.random() * 2 - 1);
    ball.position.set(dx, 2.5, 0);
    scene.add(ball);
    fireballs.push(ball);
}
