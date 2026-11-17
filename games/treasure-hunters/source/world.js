

function setupClaw() {
    // Top Crane Anchor
    const craneGeo = new THREE.BoxGeometry(0.8, 0.4, 0.4);
    const craneMat = new THREE.MeshPhongMaterial({ color: 0x1e293b });
    const crane = new THREE.Mesh(craneGeo, craneMat);
    crane.position.set(0, 4.4, 0);
    scene.add(crane);

    // Cable representation
    const cableGeo = new THREE.CylinderGeometry(0.05, 0.05, 1);
    // Shift cylinder center point to pivot from top end
    cableGeo.translate(0, -0.5, 0);
    const cableMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    cable = new THREE.Mesh(cableGeo, cableMat);
    cable.position.set(0, 4.2, 0);
    scene.add(cable);

    // Claw head
    const clawGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const clawMat = new THREE.MeshPhongMaterial({ color: 0xfacc15 });
    claw = new THREE.Mesh(clawGeo, clawMat);
    scene.add(claw);
}


function spawnTreasures() {
    const goldGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const goldMat = new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0x4d3200 });

    const rockGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const rockMat = new THREE.MeshPhongMaterial({ color: 0x64748b });

    for (let i = 0; i < 6; i++) {
        const isGold = Math.random() > 0.3;
        const mesh = new THREE.Mesh(isGold ? goldGeo : rockGeo, isGold ? goldMat : rockMat);

        // Random layout below the crane (Y <= 1)
        const rx = (Math.random() * 8) - 4;
        const ry = (Math.random() * 5) - 3; // -3 to 2
        mesh.position.set(rx, ry, 0);
        scene.add(mesh);
        treasures.push({ mesh: mesh, type: isGold ? 'gold' : 'rock', value: isGold ? 1000 : 100 });
    }
}
