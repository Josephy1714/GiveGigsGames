

function setupEmitter() {
    emitter = new THREE.Group();

    // Green Cat body
    const emitterMat = new THREE.MeshPhongMaterial({ color: 0x10b981, emissive: 0x064e3b });
    const emitterGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const body = new THREE.Mesh(emitterGeo, emitterMat);
    emitter.add(body);

    emitter.position.set(0, -3.8, 0);
    scene.add(emitter);

    // Visual Spotlight Cone
    const coneGeo = new THREE.ConeGeometry(0.8, 8, 16, 1, true); // open ended cone
    // Shift geometry center so it rotates around the emitter pivot
    coneGeo.translate(0, 4, 0);
    const coneMat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    beam = new THREE.Mesh(coneGeo, coneMat);
    emitter.add(beam);
}


function setupStalactites() {
    const stalGeo = new THREE.ConeGeometry(0.8, 2.5, 4);
    const stalMat = new THREE.MeshPhongMaterial({ color: 0xef4444, emissive: 0x580505, shininess: 80 });

    const positions = [
        { x: -3.0, y: 2.8, name: 'Hiring Delays' },
        { x: 0.0, y: 2.8, name: 'Approval Chains' },
        { x: 3.0, y: 2.8, name: 'CRM Complexity' }
    ];

    positions.forEach(pos => {
        const stal = new THREE.Mesh(stalGeo, stalMat.clone());
        // point downward
        stal.rotation.x = Math.PI;
        stal.position.set(pos.x, pos.y, 0);
        scene.add(stal);
        stalactites.push({ mesh: stal, hp: 100, name: pos.name });
    });
}
