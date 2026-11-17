

function setupRegions() {
    const regionGeo = new THREE.CylinderGeometry(0.8, 1.0, 0.4, 6);

    const data = [
        { x: -3.5, y: 1.5, color: 0x10b981, name: 'Revenue Jungle', url: '/games/the-revenue-jungle' },
        { x: 3.5, y: 1.5, color: 0xf59e0b, name: 'Temple of Lost Revenue', url: '/games/temple-of-lost-revenue' },
        { x: -3.5, y: -1.5, color: 0x38bdf8, name: 'Pipeline Mountain', url: '/games/the-pipeline-mountain' },
        { x: 3.5, y: -1.5, color: 0x06b6d4, name: 'Speed Portal', url: '/games/the-speed-portal' }
    ];

    data.forEach(d => {
        const mat = new THREE.MeshPhongMaterial({ color: d.color, shininess: 80 });
        const island = new THREE.Mesh(regionGeo, mat);
        island.position.set(d.x, d.y, 0);
        scene.add(island);
        regions.push({ mesh: island, name: d.name, url: d.url, defaultColor: d.color });
    });
}


function getIntersectedRegion(event) {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1,
        -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const meshes = regions.map(r => r.mesh);
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
        return regions.find(r => r.mesh === intersects[0].object);
    }
    return null;
}
