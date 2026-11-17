

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        const delta = Math.min(clock.getDelta(), 0.05);
        const baseSpeed = 12 * speedMultiplier * delta;

        // Increase difficulty slightly over time
        speedMultiplier += 0.01 * delta;

        // 1. Move Jungle Floor (infinite scroll)
        floorTiles.forEach(tile => {
            tile.position.x -= baseSpeed;
            if (tile.position.x < -30) {
                tile.position.x += 200; // warp to end
            }
        });

        // 2. Mascot jumping physics
        if (isJumping) {
            blueCat.position.y += jumpVelocity * delta;
            jumpVelocity += gravity * delta;
            if (blueCat.position.y <= 0) {
                blueCat.position.y = 0;
                isJumping = false;
            }
        }

        // Green Cat hovering
        greenCat.position.y = 2.5 + Math.sin(Date.now() * 0.005) * 0.3;
        // Minor forward/backward movement
        greenCat.position.x = playerX + 3 + Math.sin(Date.now() * 0.002) * 0.5;

        // 3. Obstacle management
        spawnTimer += delta;
        if (spawnTimer > (1.8 / speedMultiplier)) {
            spawnObstacle();
            spawnTimer = 0;
        }

        // Bounding box for player
        const playerBox = new THREE.Box3().setFromObject(blueCat);

        // Update obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.mesh.position.x -= baseSpeed;

            // Spin/float obstacles
            if (obs.type === 'vine') {
                obs.mesh.rotation.y += delta;
            }

            // Check Collision
            const obsBox = new THREE.Box3().setFromObject(obs.mesh);
            if (checkCollision(playerBox, obsBox)) {
                endGame();
            }

            // Clean up out of bounds
            if (obs.mesh.position.x < -15) {
                scene.remove(obs.mesh);
                obstacles.splice(i, 1);
            }
        }

        // Update coins
        for (let i = coins.length - 1; i >= 0; i--) {
            const coin = coins[i];
            coin.position.x -= baseSpeed;
            coin.rotation.z += delta * 2;

            // Check Coin Collection
            const coinBox = new THREE.Box3().setFromObject(coin);
            if (checkCollision(playerBox, coinBox)) {
                revenue += 100;
                revenueSpan.textContent = '$' + revenue;
                scene.remove(coin);
                coins.splice(i, 1);
                continue;
            }

            if (coin.position.x < -15) {
                scene.remove(coin);
                coins.splice(i, 1);
            }
        }

        // Update Score
        score += delta * 15;
        scoreSpan.textContent = Math.floor(score);
    }

    renderer.render(scene, camera);
}
