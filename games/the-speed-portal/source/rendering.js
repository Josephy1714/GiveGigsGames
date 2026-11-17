

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        const delta = Math.min(clock.getDelta(), 0.05);

        // 1. Player angle rotation
        playerAngle += rotateDir * rotationSpeed * delta;
        updatePlayerPosition();

        // 2. Spawn scheduling
        spawnTimer += delta;
        if (spawnTimer > 1.2) {
            spawnObstacle();
            spawnTimer = 0;
        }

        // 3. Move Tunnel rings
        tunnelRings.forEach(ring => {
            ring.position.z += speed * delta;
            if (ring.position.z > 10) {
                ring.position.z -= 200;
            }
        });

        // 4. Obstacles update
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.mesh.position.z += speed * delta;
            obs.mesh.rotation.x += delta;
            obs.mesh.rotation.y += delta;

            // Check collision when Z is close
            if (Math.abs(obs.mesh.position.z) < 1.0) {
                // Compute angular delta
                let angleDiff = Math.abs(obs.angle - playerAngle) % (Math.PI * 2);
                if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

                if (angleDiff < 0.5) {
                    endGame();
                }
            }

            if (obs.mesh.position.z > 15) {
                scene.remove(obs.mesh);
                obstacles.splice(i, 1);
            }
        }

        // 5. Items update
        for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            it.mesh.position.z += speed * delta;

            if (Math.abs(it.mesh.position.z) < 1.0) {
                let angleDiff = Math.abs(it.angle - playerAngle) % (Math.PI * 2);
                if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

                if (angleDiff < 0.6) {
                    boosts++;
                    boostsSpan.textContent = boosts;
                    // Trigger flash boost effect
                    speed += 10.0;
                    setTimeout(() => { speed = Math.max(25.0, speed - 10.0); }, 500);
                    scene.remove(it.mesh);
                    items.splice(i, 1);
                    continue;
                }
            }

            if (it.mesh.position.z > 15) {
                scene.remove(it.mesh);
                items.splice(i, 1);
            }
        }

        // 6. Update Distance meter
        distance += speed * delta;
        distSpan.textContent = Math.floor(distance) + 'm';
    }

    renderer.render(scene, camera);
}
