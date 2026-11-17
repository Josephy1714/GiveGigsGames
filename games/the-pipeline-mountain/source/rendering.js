

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        const delta = Math.min(clock.getDelta(), 0.05);

        // Left/Right control
        playerX += moveDirection * horizontalSpeed * delta;
        // Keep inside bounds
        playerX = Math.max(-5, Math.min(5, playerX));

        // Jump physics
        const previousY = playerY;
        playerY += velocityY * delta;
        velocityY += gravity * delta;

        // Auto jump when falling and hitting a platform
        if (velocityY < 0) {
            for (let i = 0; i < platforms.length; i++) {
                const plat = platforms[i];
                const top = plat.mesh.position.y + 0.2;
                // Land only when feet cross a platform's top from above.
                // This also catches a crossing during a slower render frame.
                if (previousY >= top && playerY <= top && Math.abs(playerX - plat.mesh.position.x) <= 1.85) {
                    // Land on platform
                    playerY = plat.mesh.position.y + 0.2;
                    velocityY = jumpForce;

                    if (plat.type === 'spreadsheet') {
                        // Bad platform: lower jump force
                        velocityY = jumpForce * 0.94;
                    }
                    break;
                }
            }
        }

        // Apply positions
        player.position.set(playerX, playerY, 0);

        // Check medal collection
        const playerBox = new THREE.Box3().setFromObject(player);
        for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            it.rotation.y += delta * 2;
            const itBox = new THREE.Box3().setFromObject(it);
            if (playerBox.intersectsBox(itBox)) {
                medals++;
                medalsSpan.textContent = medals;
                scene.remove(it);
                items.splice(i, 1);
            }
        }

        // Generate more platforms ahead
        const highestPlatform = platforms[platforms.length - 1];
        if (highestPlatform && highestPlatform.mesh.position.y - playerY < 20) {
            generatePlatforms(highestPlatform.mesh.position.y, 15);
        }

        // Lose condition: falling past camera view
        if (playerY < camera.position.y - 8) {
            endGame();
        }

        // Update score/altitude
        if (playerY > altitude) {
            altitude = playerY;
            altSpan.textContent = Math.floor(altitude) + 'm';
        }

        // Smooth camera follow
        const targetCamY = playerY + 2;
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, 0.1);
    }

    renderer.render(scene, camera);
}
