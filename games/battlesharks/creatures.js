// BattleSharks 3D — Companion Plushie, Weak-Point Rings & Creature Helpers
window.BSCreatures = (() => {
    'use strict';

    function buildPlushieCompanion(scene) {
        const g = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
        const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x020617 });

        const body = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 12), bodyMat);
        body.scale.set(0.95, 0.9, 1.5);
        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.58, 12, 10), bellyMat);
        belly.scale.set(0.85, 0.5, 1.3);
        belly.position.y = -0.22;
        const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.65, 6), bodyMat);
        dorsal.position.set(0, 0.65, 0.1);
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
        eyeL.position.set(-0.35, 0.15, -0.65);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.35;

        g.add(body, belly, dorsal, eyeL, eyeR);
        g.visible = false;
        scene.add(g);
        return g;
    }

    function attachWeakPointRing(parentMesh, radius = 1.8, zOffset = -2.0) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(radius * 0.75, radius, 24),
            new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
        );
        ring.position.set(0, 0.4, zOffset);
        parentMesh.add(ring);
        return ring;
    }

    return { buildPlushieCompanion, attachWeakPointRing };
})();
