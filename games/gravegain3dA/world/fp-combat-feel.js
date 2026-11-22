(function () {
    'use strict';

    /**
     * FPCombatFeel: Procedural first-person camera mechanics (breathing,
     * head-bob, stamina sway, hit-stop) and multi-combo weapon animations
     * (overhead, horizontal L/R, diagonal cleave, power slam, block/parry)
     * for GraveGain 3DA.
     */
    const FPCombatFeel = {
        time: 0,
        comboStep: 0,
        swingTimer: 0,
        swingDuration: 0.28,
        swingType: 'slashR',
        hitStopTimer: 0,
        recoilTimer: 0,
        blocking: false,
        viewmodel: null,
        bladeMesh: null,
        trailMesh: null,

        init(camera) {
            if (!camera || this.viewmodel) return;
            const group = new THREE.Group();

            const hilt = new THREE.Mesh(
                new THREE.CylinderGeometry(0.9, 1.1, 10, 8),
                new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.85 })
            );
            group.add(hilt);

            const guard = new THREE.Mesh(
                new THREE.BoxGeometry(7, 1.4, 2.2),
                new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.85 })
            );
            guard.position.y = 5.2;
            group.add(guard);

            const blade = new THREE.Mesh(
                new THREE.BoxGeometry(2.2, 22, 0.7),
                new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.9 })
            );
            blade.position.y = 16.5;
            group.add(blade);
            this.bladeMesh = blade;

            const trail = new THREE.Mesh(
                new THREE.PlaneGeometry(4, 20),
                new THREE.MeshBasicMaterial({
                    color: 0x38bdf8, transparent: true, opacity: 0,
                    side: THREE.DoubleSide, depthWrite: false
                })
            );
            trail.position.set(0, 16.5, -0.5);
            group.add(trail);
            this.trailMesh = trail;

            group.position.set(14, -12, -20);
            group.rotation.set(-0.25, -0.2, 0.15);
            camera.add(group);
            this.viewmodel = group;
        },

        triggerSwing(isPower, lowStamina) {
            const types = isPower
                ? ['overhead', 'powerLateral']
                : ['slashR', 'slashL', 'diagonal', 'thrust'];
            this.swingType = isPower ? types[this.comboStep % 2] : types[this.comboStep % 4];
            this.comboStep++;
            this.swingDuration = lowStamina ? 0.44 : (isPower ? 0.38 : 0.25);
            this.swingTimer = this.swingDuration;
        },

        triggerHitStop(duration) {
            this.hitStopTimer = Math.max(this.hitStopTimer, duration || 0.045);
        },

        triggerRecoil() {
            this.recoilTimer = 0.14;
        },

        setBlocking(active) {
            this.blocking = !!active;
        },

        update(dt, camera, isMoving, lowStamina) {
            if (!camera) return;
            if (this.hitStopTimer > 0) {
                this.hitStopTimer -= dt;
                return;
            }
            this.time += dt;

            // 1. Procedural Camera Breathing + Head Bob + Stamina Sway
            const breathY = Math.sin(this.time * 1.8) * 0.25;
            const bobAmp = isMoving ? 0.85 : 0.0;
            const bobY = Math.sin(this.time * 10.5) * bobAmp;
            const sway = lowStamina ? Math.sin(this.time * 4.2) * 0.6 : 0;
            camera.position.y += breathY + bobY + sway;

            // 2. Viewmodel Animation
            if (!this.viewmodel) return;
            let rx = -0.25, ry = -0.2, rz = 0.15;
            let px = 14, py = -12, pz = -20;

            if (this.recoilTimer > 0) {
                this.recoilTimer -= dt;
                rx += 0.45;
                pz += 3.5;
            } else if (this.swingTimer > 0) {
                this.swingTimer -= dt;
                const t = 1 - (this.swingTimer / this.swingDuration);
                const arc = Math.sin(t * Math.PI);
                if (this.trailMesh) this.trailMesh.material.opacity = arc * 0.55;

                if (this.swingType === 'overhead' || this.swingType === 'powerLateral') {
                    rx = -0.25 - arc * 1.45;
                    pz = -20 - arc * 6;
                } else if (this.swingType === 'slashR') {
                    ry = -0.2 + arc * 1.3;
                    rz = 0.15 + arc * 0.8;
                } else if (this.swingType === 'slashL') {
                    ry = -0.2 - arc * 1.3;
                    rz = 0.15 - arc * 0.8;
                } else if (this.swingType === 'diagonal') {
                    rx = -0.25 - arc * 1.1;
                    rz = 0.15 + arc * 0.9;
                } else {
                    pz = -20 - arc * 10;
                    rx = -0.6;
                }
            } else {
                if (this.trailMesh) this.trailMesh.material.opacity = 0;
                if (this.blocking) {
                    px = 4; py = -7; pz = -17;
                    rx = -0.1; ry = 0.65; rz = 1.1;
                } else {
                    py += Math.sin(this.time * 2.2) * 0.35;
                }
            }

            this.viewmodel.position.set(px, py, pz);
            this.viewmodel.rotation.set(rx, ry, rz);
        }
    };

    window.FPCombatFeel = FPCombatFeel;
})();
