

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        const delta = Math.min(clock.getDelta(), 0.05);

        // 1. Rotate Emitter/Beam
        beamAngle += rotateDir * rotationSpeed * delta;
        // Limit range between -60 to +60 degrees
        beamAngle = Math.max(-1.1, Math.min(1.1, beamAngle));
        emitter.rotation.z = beamAngle;

        // Calculate line ray direction vector from emitter
        // Straight up vector rotated by beamAngle
        const dirX = -Math.sin(beamAngle);
        const dirY = Math.cos(beamAngle);

        let activeProgress = 0;
        let activeLeft = 0;

        // 2. Stalactites update
        stalactites.forEach(stal => {
            if (stal.hp > 0) {
                // Check intersection with searchlight beam line:
                // Project stalactite position relative to emitter
                const relX = stal.mesh.position.x - emitter.position.x;
                const relY = stal.mesh.position.y - emitter.position.y;

                // Angle of stalactite relative to emitter
                const stalAngle = Math.atan2(relX, relY);

                // If beam direction points close to stalactite
                if (Math.abs(stalAngle - (-beamAngle)) < 0.15) {
                    // Is illuminated! Shrink/destroy
                    stal.hp -= 40 * delta;
                    stal.mesh.material.emissive.setHex(0xffaa22); // glow orange-gold

                    // Shrink scale
                    const newScale = Math.max(0.1, stal.hp / 100);
                    stal.mesh.scale.set(newScale, newScale, newScale);

                    if (stal.hp <= 0) {
                        scene.remove(stal.mesh);
                    }
                } else {
                    stal.mesh.material.emissive.setHex(0x580505);
                }

            }
            // Finished targets still contribute to the total. Counting only
            // living obstacles made progress jump backwards after every clear.
            activeProgress += 100 - Math.max(0, stal.hp);
            if (stal.hp > 0) activeLeft++;
        });

        const progressPercent = Math.min(100, Math.floor(activeProgress / stalactites.length));
        progressSpan.textContent = progressPercent + '%';
        leftSpan.textContent = activeLeft;

        if (activeLeft === 0) {
            endGame();
        }
    }

    renderer.render(scene, camera);
}
