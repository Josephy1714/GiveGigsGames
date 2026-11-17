

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        // Spin the central engine hub
        centerNode.rotation.y += 0.015;
        centerNode.rotation.x += 0.005;

        // Hover effect on outer nodes
        outerNodes.forEach(node => {
            node.mesh.rotation.y += 0.01;
        });
    }

    renderer.render(scene, camera);
}
