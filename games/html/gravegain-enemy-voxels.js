(function () {
    'use strict';

    const effects = new WeakMap();
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const cube = new THREE.BoxGeometry(1, 1, 1);
    const capacity = 192;

    function rebuild(part) {
        part.cells.forEach((cell, index) => {
            matrix.makeTranslation(cell.x, cell.y, cell.z).scale(part.size);
            part.mesh.setMatrixAt(index, matrix);
        });
        part.mesh.count = part.cells.length;
        part.mesh.instanceMatrix.needsUpdate = true;
    }

    function voxelize(enemy) {
        const root = enemy.group3d;
        const limbs = [enemy.leftArm, enemy.rightArm, enemy.leftLeg, enemy.rightLeg];
        const boxes = [];
        root.traverse(node => {
            if (node.geometry?.type === 'BoxGeometry' && node.material?.color) boxes.push(node);
        });
        return boxes.map(node => {
            const { width, height, depth } = node.geometry.parameters;
            const [nx, ny, nz] = [width, height, depth].map(length => Math.min(6, Math.ceil(length / 3)));
            const size = new THREE.Vector3(width / nx, height / ny, depth / nz);
            const mesh = new THREE.InstancedMesh(cube.clone(), node.material, nx * ny * nz);
            const cells = [];
            for (let x = 0; x < nx; x++) {
                for (let y = 0; y < ny; y++) {
                    for (let z = 0; z < nz; z++) {
                        cells.push(new THREE.Vector3((x + 0.5 - nx / 2) * size.x,
                            (y + 0.5 - ny / 2) * size.y, (z + 0.5 - nz / 2) * size.z));
                    }
                }
            }
            // Keep the original transform for eyes, gear, and articulated children.
            node.geometry.dispose();
            node.geometry = new THREE.BufferGeometry();
            node.raycast = () => {};
            node.add(mesh);
            const part = { mesh, cells, size, detachable: limbs.includes(node.parent) };
            rebuild(part);
            return part;
        });
    }

    function debris(scene) {
        if (!effects.has(scene)) {
            const mesh = new THREE.InstancedMesh(cube, new THREE.MeshLambertMaterial(), capacity);
            mesh.count = 0;
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            scene.add(mesh);
            effects.set(scene, { mesh, chunks: [] });
        }
        return effects.get(scene);
    }

    function fracture(enemy, scene, damage, direction, kind = 'cut', impact) {
        if (!scene || !(damage > 0)) return;
        const parts = enemy.voxelParts || (enemy.voxelParts = voxelize(enemy));
        enemy.group3d.updateMatrixWorld(true);
        const xDir = direction?.x || 0;
        const zDir = direction?.z || 0;
        const hit = impact || { x: enemy.x - xDir * 5, y: 19 * enemy.scale, z: enemy.y - zDir * 5 };
        const candidates = [];
        for (const part of parts) {
            for (const cell of part.cells) {
                const world = cell.clone().applyMatrix4(part.mesh.matrixWorld);
                const x = world.x - hit.x;
                const y = world.y - hit.y;
                const z = world.z - hit.z;
                const score = kind === 'cut'
                    ? Math.abs(y + (x * zDir - z * xDir) * 0.45) * 3 + Math.hypot(x, z) * 0.4
                    : Math.hypot(x, y, z);
                candidates.push({ part, cell, world, score });
            }
        }
        if (!candidates.length) return;
        const blast = kind === 'blast';
        const fatal = enemy.hp <= 0;
        const fraction = Math.min(0.4, damage / enemy.maxHp);
        const count = fatal ? candidates.length : Math.min(candidates.length - 1, Math.max(1, Math.ceil(candidates.length * fraction * (blast ? 0.85 : 0.5))));
        if (!count) return;
        if (!fatal) candidates.sort((a, b) => a.score - b.score);
        const selected = candidates.slice(0, count);
        if (!fatal && kind === 'cut') {
            const cutCounts = new Map();
            for (const { part } of selected) {
                if (part.detachable) cutCounts.set(part, (cutCounts.get(part) || 0) + 1);
            }
            const severed = new Set();
            for (const [part, hits] of cutCounts) {
                if (hits >= Math.ceil(part.cells.length / 2)) severed.add(part);
            }
            for (const candidate of candidates.slice(count)) {
                if (severed.has(candidate.part)) selected.push(candidate);
            }
        }
        const stride = Math.max(1, Math.ceil(selected.length / (blast ? 48 : 32)));
        const { chunks } = debris(scene);
        const changed = new Set();
        for (let i = 0; i < selected.length; i++) {
            const { part, cell, world } = selected[i];
            cell.removed = true;
            changed.add(part);
            if (i % stride) continue;
            part.mesh.matrixWorld.decompose(position, rotation, scale);
            const velocity = new THREE.Vector3(world.x - hit.x, 0, world.z - hit.z).normalize().multiplyScalar(blast ? 155 : 65);
            velocity.x += xDir * 38;
            velocity.y = (blast ? 95 : 45) + Math.random() * 65;
            velocity.z += zDir * 38;
            chunks.push({ position: world, rotation: rotation.clone(), size: part.size.clone().multiply(scale),
                color: part.mesh.material.color, velocity, life: 0.7 + Math.random() * 0.4 });
        }
        if (chunks.length > capacity) chunks.splice(0, chunks.length - capacity);
        for (const part of changed) {
            part.cells = part.cells.filter(cell => !cell.removed);
            rebuild(part);
        }
    }

    function update(scene, dt) {
        const effect = effects.get(scene);
        if (!effect || (!effect.chunks.length && !effect.mesh.count)) return;
        const { mesh, chunks } = effect;
        let alive = 0;
        for (const chunk of chunks) {
            chunk.life -= dt;
            if (chunk.life <= 0) continue;
            chunk.velocity.y -= 340 * dt;
            chunk.position.addScaledVector(chunk.velocity, dt);
            if (chunk.position.y < 1) {
                chunk.position.y = 1;
                chunk.velocity.y = Math.abs(chunk.velocity.y) * 0.3;
            }
            scale.copy(chunk.size).multiplyScalar(Math.min(1, chunk.life * 5));
            mesh.setMatrixAt(alive, matrix.compose(chunk.position, chunk.rotation, scale));
            mesh.setColorAt(alive, chunk.color);
            chunks[alive++] = chunk;
        }
        chunks.length = alive;
        mesh.count = alive;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    function clear(scene) {
        const effect = effects.get(scene);
        if (!effect) return;
        effect.chunks.length = 0;
        effect.mesh.count = 0;
    }

    window.GraveGainEnemyVoxels = { fracture, update, clear };
})();
