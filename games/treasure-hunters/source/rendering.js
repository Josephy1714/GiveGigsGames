

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        const delta = Math.min(clock.getDelta(), 0.05);

        // Game timer countdown
        timeLeft = Math.max(0, timeLeft - delta);
        timeSpan.textContent = Math.ceil(timeLeft) + 's';
        if (timeLeft <= 0) {
            endGame();
            return;
        }

        // Spin treasures
        treasures.forEach(t => {
            t.mesh.rotation.y += 0.01;
        });

        if (grabberState === 'swinging') {
            // Swing the cable back and forth
            swingTime += delta;
            swingAngle = Math.sin(swingTime * 2) * 1.0; // pauses preserve the aiming phase
            cable.rotation.z = swingAngle;

            // Align claw head with end of cable
            claw.rotation.z = swingAngle;
            claw.position.set(
                Math.sin(swingAngle) * -cableLength,
                4.2 - Math.cos(swingAngle) * cableLength,
                0
            );
        } else if (grabberState === 'extending') {
            // Extend cable
            cableLength += grabSpeed * delta;
            cable.scale.y = cableLength;

            const tipX = Math.sin(swingAngle) * -cableLength;
            const tipY = 4.2 - Math.cos(swingAngle) * cableLength;
            claw.position.set(tipX, tipY, 0);

            // Bounding collision checks with items
            const clawBox = new THREE.Box3().setFromObject(claw);
            for (let i = 0; i < treasures.length; i++) {
                const t = treasures[i];
                const tBox = new THREE.Box3().setFromObject(t.mesh);
                if (clawBox.intersectsBox(tBox)) {
                    // Grab item!
                    activeGrabTarget = t;
                    treasures.splice(i, 1);
                    grabberState = 'retracting';
                    break;
                }
            }

            if (cableLength >= maxCableLength) {
                grabberState = 'retracting';
            }
        } else if (grabberState === 'retracting') {
            // Retract cable
            const retrieveSpeed = (activeGrabTarget && activeGrabTarget.type === 'rock') ? 3.0 : 8.0;
            cableLength -= retrieveSpeed * delta;
            cableLength = Math.max(0.5, cableLength);
            cable.scale.y = cableLength;

            const tipX = Math.sin(swingAngle) * -cableLength;
            const tipY = 4.2 - Math.cos(swingAngle) * cableLength;
            claw.position.set(tipX, tipY, 0);

            if (activeGrabTarget) {
                activeGrabTarget.mesh.position.set(tipX, tipY - 0.2, 0);
            }

            if (cableLength <= 0.5) {
                // Secure target points
                if (activeGrabTarget) {
                    value += activeGrabTarget.value;
                    valSpan.textContent = '$' + value;
                    scene.remove(activeGrabTarget.mesh);
                    activeGrabTarget = null;
                }

                // If all treasures collected, spawn new set
                if (treasures.length === 0) {
                    spawnTreasures();
                }

                grabberState = 'swinging';
            }
        }
    }

    renderer.render(scene, camera);
}
