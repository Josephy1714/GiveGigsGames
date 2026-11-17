

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        // Expand scan wave if it exists
        if (scanWave) {
            scanWave.scale.x += 0.2;
            scanWave.scale.y += 0.2;
            scanWave.material.opacity -= 0.02;

            if (scanWave.material.opacity <= 0) {
                scene.remove(scanWave);
                scanWave = null;
            }
        }

        // Float/spin revealed targets
        targets.forEach(t => {
            if (t.mesh.visible) {
                t.mesh.rotation.y += 0.02;
                t.mesh.position.y = 0.5 + Math.sin(Date.now() * 0.003) * 0.1;
            }
        });
    }

    renderer.render(scene, camera);
}
