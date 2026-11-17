

function animate() {
    requestAnimationFrame(animate);

    // Spin core globe
    coreGlobe.rotation.y += 0.005;

    // Hover effect on islands
    regions.forEach((r, idx) => {
        r.mesh.rotation.y += 0.01;
        r.mesh.position.y = (idx < 2 ? 1.5 : -1.5) + Math.sin(Date.now() * 0.002 + idx) * 0.1;
    });

    renderer.render(scene, camera);
}
