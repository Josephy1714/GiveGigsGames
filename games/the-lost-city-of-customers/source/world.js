

function buildTerrain() {
    const tileGeo = new THREE.BoxGeometry(size * 0.95, 0.5, size * 0.95);
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.9 });

    const startX = -(cols * size) / 2 + size / 2;
    const startZ = -(rows * size) / 2 + size / 2;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const tile = new THREE.Mesh(tileGeo, tileMat);
            const py = (Math.random() * 0.3); // uneven terrain
            tile.position.set(startX + c * size, py, startZ + r * size);
            scene.add(tile);
            terrainTiles.push(tile);
        }
    }
}


function placeHiddenTargets() {
    const targetGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const targetMat = new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0x553c00, shininess: 80 });

    const gridIndices = [];
    for (let i = 0; i < terrainTiles.length; i++) {
        gridIndices.push(i);
    }

    // Pick 5 random unique tiles
    for (let k = 0; k < 5; k++) {
        const randIdx = Math.floor(Math.random() * gridIndices.length);
        const tileIdx = gridIndices.splice(randIdx, 1)[0];
        const tile = terrainTiles[tileIdx];

        const targetMesh = new THREE.Mesh(targetGeo, targetMat.clone());
        targetMesh.position.set(tile.position.x, tile.position.y + 0.5, tile.position.z);
        targetMesh.visible = false; // Hidden at first
        scene.add(targetMesh);
        targets.push({ mesh: targetMesh, found: false });
    }
}


function triggerScanPulse(point) {
    totalScans++;
    scanSpan.textContent = totalScans;

    // Create scan wave representation
    if (scanWave) {
        scene.remove(scanWave);
        scanWave.geometry.dispose();
        scanWave.material.dispose();
    }

    const ringGeo = new THREE.RingGeometry(0.1, 0.3, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    scanWave = new THREE.Mesh(ringGeo, ringMat);
    scanWave.rotation.x = -Math.PI / 2;
    scanWave.position.set(point.x, point.y + 0.1, point.z);
    scene.add(scanWave);

    // Check distance to all targets
    targets.forEach(t => {
        if (!t.found) {
            const dist = t.mesh.position.distanceTo(point);
            if (dist < 3.5) {
                // Inside radar radius: reveal target!
                t.mesh.visible = true;
            }
            if (dist < 1.0) {
                // Close enough to capture!
                t.found = true;
                t.mesh.material.color.setHex(0x10b981); // turn solid green
                foundCount++;
                foundSpan.textContent = `${foundCount}/5`;

                if (foundCount >= 5) {
                    endGame();
                }
            }
        }
    });
}
