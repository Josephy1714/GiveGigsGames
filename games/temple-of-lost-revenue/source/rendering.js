

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        // Spin items
        items.forEach(it => {
            it.mesh.rotation.y += 0.05;
            it.mesh.position.y = 1.0 + Math.sin(Date.now() * 0.005) * 0.1;
        });

        // Smooth camera follow
        const targetCamPos = new THREE.Vector3(player.position.x, player.position.y + 18, player.position.z + 8);
        camera.position.lerp(targetCamPos, 0.05);
        camera.lookAt(player.position);
    }

    renderer.render(scene, camera);
    drawTempleMap();
}
