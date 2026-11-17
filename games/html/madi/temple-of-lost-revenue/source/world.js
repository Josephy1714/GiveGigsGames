

function buildMaze() {
    // Shared geometries and materials
    const wallGeo = new THREE.BoxGeometry(cellSize, 4, cellSize);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2e1f15, roughness: 0.9, metalness: 0.1 });

    const floorGeo = new THREE.BoxGeometry(cellSize, 0.2, cellSize);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a120b, roughness: 0.8 });

    const itemGeo = new THREE.OctahedronGeometry(0.5);
    const itemMat = new THREE.MeshPhongMaterial({ color: 0xf59e0b, emissive: 0x553300, shininess: 100 });

    const startX = -(gridCols * cellSize) / 2 + cellSize / 2;
    const startZ = -(gridRows * cellSize) / 2 + cellSize / 2;

    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            const posX = startX + c * cellSize;
            const posZ = startZ + r * cellSize;

            // Always place a floor
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.position.set(posX, -0.1, posZ);
            floor.receiveShadow = true;
            scene.add(floor);

            if (mazeGrid[r][c] === 1) {
                // Wall column
                const wall = new THREE.Mesh(wallGeo, wallMat);
                wall.position.set(posX, 2, posZ);
                wall.castShadow = true;
                wall.receiveShadow = true;
                scene.add(wall);
                mazeBlocks.push(wall);
            } else if (mazeGrid[r][c] === 2) {
                // Collectible CRM data/lost revenue
                const item = new THREE.Mesh(itemGeo, itemMat);
                item.position.set(posX, 1.0, posZ);
                scene.add(item);
                items.push({ mesh: item, gridR: r, gridC: c });
            }
        }
    }
}


function createPlayer() {
    player = new THREE.Group();

    // Body
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, shininess: 80 });
    const bodyGeo = new THREE.BoxGeometry(1.0, 0.8, 0.8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    player.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0.4, 0.8, 0);
    player.add(head);

    // Ears
    const earGeo = new THREE.ConeGeometry(0.12, 0.35, 4);
    const leftEar = new THREE.Mesh(earGeo, bodyMat);
    leftEar.position.set(0.4, 1.2, 0.2);
    leftEar.rotation.z = -0.2;
    const rightEar = leftEar.clone();
    rightEar.position.z = -0.2;
    player.add(leftEar);
    player.add(rightEar);

    updatePlayerWorldPosition();
    scene.add(player);
}


function updatePlayerWorldPosition() {
    const startX = -(gridCols * cellSize) / 2 + cellSize / 2;
    const startZ = -(gridRows * cellSize) / 2 + cellSize / 2;
    player.position.set(startX + playerGridPos.c * cellSize, 0, startZ + playerGridPos.r * cellSize);
}


function checkItemCollection() {
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (item.gridR === playerGridPos.r && item.gridC === playerGridPos.c) {
            scene.remove(item.mesh);
            items.splice(i, 1);
            collectedCount++;
            revenue += 500;

            leadsSpan.textContent = `${collectedCount}/5`;
            revSpan.textContent = `$${revenue}`;

            if (collectedCount >= totalItems) {
                winGame();
            }
        }
    }
}
