

function buildTunnel() {
    // Generate rings down the Z axis
    const ringGeo = new THREE.TorusGeometry(tunnelRadius, 0.05, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.4 });

    for (let i = 0; i < 20; i++) {
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, 0, -i * 10);
        scene.add(ring);
        tunnelRings.push(ring);
    }
}


function createPlayerShip() {
    player = new THREE.Group();

    // Jet body
    const bodyGeo = new THREE.ConeGeometry(0.3, 1.2, 4);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, shininess: 100 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2; // point forward
    player.add(body);

    // AI sphere (Green Cat passenger)
    const passengerGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const passengerMat = new THREE.MeshPhongMaterial({ color: 0x10b981, emissive: 0x052e16 });
    const passenger = new THREE.Mesh(passengerGeo, passengerMat);
    passenger.position.set(0, 0.2, -0.2);
    player.add(passenger);

    // Placed on tunnel perimeter
    updatePlayerPosition();
    scene.add(player);
}


function updatePlayerPosition() {
    const x = Math.cos(playerAngle) * tunnelRadius;
    const y = Math.sin(playerAngle) * tunnelRadius;
    player.position.set(x, y, 0);
    // Rotate to align with tunnel wall tangent
    player.rotation.z = playerAngle - Math.PI / 2;
}


function spawnObstacle() {
    const obstacleGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const obstacleMat = new THREE.MeshPhongMaterial({ color: 0xef4444, emissive: 0x7f1d1d });
    const obstacle = new THREE.Mesh(obstacleGeo, obstacleMat);

    // Choose random angle sector (0, 90, 180, 270 deg approx)
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * tunnelRadius;
    const y = Math.sin(angle) * tunnelRadius;
    obstacle.position.set(x, y, -120);
    scene.add(obstacle);
    obstacles.push({ mesh: obstacle, angle: angle });

    // Spawn green speed ring
    if (Math.random() > 0.4) {
        const ringGeo = new THREE.TorusGeometry(0.6, 0.1, 8, 16);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        const ringAngle = angle + Math.PI / 2; // offset from obstacle
        ring.position.set(Math.cos(ringAngle) * tunnelRadius, Math.sin(ringAngle) * tunnelRadius, -100);
        scene.add(ring);
        items.push({ mesh: ring, angle: ringAngle });
    }
}
