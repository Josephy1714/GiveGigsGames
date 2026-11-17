

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        const delta = Math.min(clock.getDelta(), 0.05);
        battleTime += delta;

        // 1. Move player
        playerX += moveDir * speed * delta;
        playerX = Math.max(-5, Math.min(5, playerX));
        player.position.x = playerX;

        // Fire cooldown decrement
        if (fireCooldown > 0) fireCooldown -= delta;
        if (fireHeld) fireBeam();

        // 2. Dragon movement (hover back and forth)
        dragon.position.x = Math.sin(battleTime * 2) * 4;

        // Wings flap animation
        const flap = Math.sin(battleTime * 15) * 0.3;
        dragon.children[1].rotation.z = flap;
        dragon.children[2].rotation.z = -flap;

        // 3. Spawn fireballs
        spawnTimer += delta;
        if (spawnTimer > 0.8) {
            spawnFireball();
            spawnTimer = 0;
        }

        // 4. Update beams
        const dragBox = new THREE.Box3().setFromObject(dragon);
        for (let i = beams.length - 1; i >= 0; i--) {
            const beam = beams[i];
            beam.position.y += 12 * delta;

            const beamBox = new THREE.Box3().setFromObject(beam);
            if (beamBox.intersectsBox(dragBox)) {
                // hit
                scene.remove(beam);
                beams.splice(i, 1);

                dragonHP -= 4;
                score += 50;
                scoreSpan.textContent = score;
                syncDragonHealth();

                if (dragonHP <= 0) {
                    dragonHP = 0;
                    endBattle(true);
                    return;
                }
                continue;
            }

            if (beam.position.y > 6) {
                scene.remove(beam);
                beams.splice(i, 1);
            }
        }

        // 5. Update fireballs
        const playerBox = new THREE.Box3().setFromObject(player);
        for (let i = fireballs.length - 1; i >= 0; i--) {
            const ball = fireballs[i];
            ball.position.y -= 6 * delta;

            const ballBox = new THREE.Box3().setFromObject(ball);
            if (ballBox.intersectsBox(playerBox)) {
                endBattle(false);
                continue;
            }

            if (ball.position.y < -5) {
                scene.remove(ball);
                fireballs.splice(i, 1);
            }
        }
    }

    renderer.render(scene, camera);
}
