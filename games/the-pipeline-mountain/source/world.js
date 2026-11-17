

function createPlayer() {
    player = new THREE.Group();

    // Body
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, shininess: 80 });
    const bodyGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    player.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 1.0, 0);
    player.add(head);

    scene.add(player);
}


function generatePlatforms(startY, count) {
    const platformGeo = new THREE.BoxGeometry(3, 0.4, 2);
    const spreadsheetMat = new THREE.MeshStandardMaterial({ color: 0xef4444 }); // red warning
    const systemMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 }); // neon blue platform
    const itemGeo = new THREE.TorusGeometry(0.3, 0.08, 8, 16);
    const itemMat = new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0x553300 });

    let previousX = platforms.length ? platforms[platforms.length - 1].mesh.position.x : 0;
    for (let i = 0; i < count; i++) {
        // Even a spreadsheet bounce reaches the next platform. Keep lateral
        // travel bounded, and put the first landing directly above the start.
        const y = startY + i * 2.6 + 2;
        const x = !platforms.length && i === 0 ? 0 : Math.max(-4, Math.min(4, previousX + (Math.random() - 0.5) * 4.8));
        previousX = x;

        // Randomize platform type
        const isSpreadsheet = Math.random() > 0.85;
        const platform = new THREE.Mesh(platformGeo, isSpreadsheet ? spreadsheetMat : systemMat);
        platform.position.set(x, y, 0);
        scene.add(platform);
        platforms.push({ mesh: platform, type: isSpreadsheet ? 'spreadsheet' : 'system' });

        // Add medal item on some platforms
        if (Math.random() > 0.5) {
            const item = new THREE.Mesh(itemGeo, itemMat);
            item.position.set(x, y + 0.8, 0);
            scene.add(item);
            items.push(item);
        }
    }
}
