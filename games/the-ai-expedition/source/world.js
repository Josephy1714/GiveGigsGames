

function setupNetworkNodes() {
    // 1. Center Hub Node (MADI Engine)
    const hubGeo = new THREE.SphereGeometry(1.0, 32, 32);
    const hubMat = new THREE.MeshPhongMaterial({ color: 0xa855f7, emissive: 0x3b0764, shininess: 100 });
    centerNode = new THREE.Mesh(hubGeo, hubMat);
    scene.add(centerNode);

    // 2. 4 Outlying Nodes (AI Agents, Data Lakes, Automations, Markets)
    const nodeGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const nodeMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, emissive: 0x1e3a8a });

    const positions = [
        { x: 0, y: 3, label: 'AI Agents' },
        { x: 3, y: 0, label: 'Data Lakes' },
        { x: 0, y: -3, label: 'Automations' },
        { x: -3, y: 0, label: 'Markets' }
    ];

    positions.forEach((pos, idx) => {
        const node = new THREE.Mesh(nodeGeo, nodeMat.clone());
        node.position.set(pos.x, pos.y, 0);
        scene.add(node);
        outerNodes.push({ mesh: node, connected: false, idx: idx, label: pos.label });
    });
}


function connectNode(node) {
    node.connected = true;
    node.mesh.material.color.setHex(0x10b981); // Turn green indicating active sync
    node.mesh.material.emissive.setHex(0x064e3b);

    // Draw connection pipe cylinder
    const startVec = new THREE.Vector3(0, 0, 0);
    const endVec = node.mesh.position.clone();
    const distance = startVec.distanceTo(endVec);

    const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, distance, 8);
    const pipeMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);

    // Position & align pipe cylinder between center and target node
    pipe.position.copy(endVec).multiplyScalar(0.5);
    pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), endVec.clone().normalize());
    scene.add(pipe);
    pipes.push(pipe);

    connectedCount++;
    routesSpan.textContent = `${connectedCount}/4`;
    syncSpan.textContent = `${connectedCount * 25}%`;

    if (connectedCount >= 4) {
        setTimeout(endGame, 600);
    }
}
