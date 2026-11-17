

function onMouseMove(event) {
    const intersected = getIntersectedRegion(event);

    regions.forEach(r => {
        r.mesh.material.color.setHex(r.defaultColor);
        r.mesh.scale.set(1.0, 1.0, 1.0);
    });

    if (intersected) {
        intersected.mesh.material.color.setHex(0xffffff); // highlight white
        intersected.mesh.scale.set(1.2, 1.2, 1.2);
        tooltip.textContent = `Warp to: ${intersected.name} (Click to play)`;
    } else {
        tooltip.textContent = 'Hover over a region cylinder to inspect...';
    }
}


function onClick(event) {
    const intersected = getIntersectedRegion(event);
    if (intersected) {
        window.top.location.assign(intersected.url);
    }
}


function onWindowResize() {
    const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
}
