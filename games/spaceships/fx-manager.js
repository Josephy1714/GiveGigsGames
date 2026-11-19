// Particle & FX Manager: Handles engine plasma plumes, explosions, and shield impact blooms
const THREE = window.THREE;

export class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.shieldImpacts = [];
    this.temporaryMeshes = [];
    this.shieldImpactTexture = null;
  }

  getShieldImpactTexture() {
    if (!this.shieldImpactTexture) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d');
      // Multi-stop radial gradient for a vivid, energetic plasma bloom
      const glow = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
      glow.addColorStop(0, 'rgba(255,255,255,1.0)');
      glow.addColorStop(0.18, 'rgba(180,250,255,0.95)');
      glow.addColorStop(0.42, 'rgba(64,220,255,0.65)');
      glow.addColorStop(0.72, 'rgba(20,130,255,0.28)');
      glow.addColorStop(1, 'rgba(0,80,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 128, 128);
      this.shieldImpactTexture = new THREE.CanvasTexture(canvas);
    }
    return this.shieldImpactTexture;
  }

  /**
   * Spawns a directional engine plasma puff starting directly at the nozzle.
   * Compact, linear decay with minimal lateral spread and short lifetime.
   */
  spawnThrustParticle(origin, exhaustDirection, colorHex, isHero = false) {
    const puffCount = isHero ? 3 : 2;
    const positions = new Float32Array(puffCount * 3);
    const velocities = [];

    for (let i = 0; i < puffCount; i++) {
      // Tight, linear stream directly behind the engine with minimal spread
      const spread = 0.04;
      const dir = exhaustDirection.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread
      )).normalize();

      const speed = 10 + Math.random() * 12;
      velocities.push(dir.multiplyScalar(speed));

      // Start DIRECTLY at the nozzle surface without gap
      positions[i * 3] = origin.x + dir.x * (0.05 + i * 0.12);
      positions[i * 3 + 1] = origin.y + dir.y * (0.05 + i * 0.12);
      positions[i * 3 + 2] = origin.z + dir.z * (0.05 + i * 0.12);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Refined compact plasma puff size
    const mat = new THREE.PointsMaterial({
      color: colorHex,
      size: isHero ? 1.8 : 2.1,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geom, mat);
    this.scene.add(points);

    // Faster, linear decay (0.35s - 0.45s) for tight wake
    this.particles.push({
      points,
      velocities,
      alpha: 0.95,
      decay: 2.5 + Math.random() * 0.8
    });
  }

  /**
   * High-visibility missile rocket exhaust trail.
   * Thicker, bright neon green core with trailing expanding white-smoke exhaust that lasts longer.
   */
  spawnMissileThrustParticle(pos, reverseDir) {
    const puffCount = 5;
    const positions = new Float32Array(puffCount * 3);
    const velocities = [];

    for (let i = 0; i < puffCount; i++) {
      const spread = 0.12;
      const dir = reverseDir.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread
      )).normalize();

      const speed = 14 + Math.random() * 16;
      velocities.push(dir.multiplyScalar(speed));

      positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.4;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 4.5,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geom, mat);
    this.scene.add(points);

    this.particles.push({
      points,
      velocities,
      alpha: 0.95,
      decay: 1.1 + Math.random() * 0.4
    });
  }

  /**
   * Prominent flash when a missile separates from the belly pylon
   */
  spawnMissileLaunchFlash(pos) {
    const pGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(18 * 3);
    const velocities = [];

    for (let i = 0; i < 18; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 28,
        -12 - Math.random() * 15,
        (Math.random() - 0.5) * 28
      ));
    }
    pGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x6ee7b7,
      size: 3.8,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const points = new THREE.Points(pGeom, mat);
    this.scene.add(points);
    this.particles.push({
      points,
      velocities,
      alpha: 1.0,
      decay: 2.8
    });
  }

  spawnExplosion(pos, colorHex, count = 30) {
    const pGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60
      );
      velocities.push(v);
    }

    pGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pMat = new THREE.PointsMaterial({
      color: colorHex,
      size: 2.2,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(pGeom, pMat);
    this.scene.add(points);

    this.particles.push({
      points,
      velocities,
      alpha: 1.0,
      decay: 1.3 + Math.random() * 0.6
    });
  }

  /**
   * Dramatic ship death explosion:
   * 1. Multi-stage primary fireball and glowing flash.
   * 2. Semi-persistent expanding dark smoke puffs that hang in space (lasts 3.5 - 5 seconds).
   * 3. Tumbling 3D fractured hull debris fragments that scatter outward.
   */
  spawnShipDeath(pos, colorHex, size = 10, isAlien = true) {
    // 1. Initial fiery flash explosion
    this.spawnExplosion(pos, colorHex, 45);
    this.spawnExplosion(pos, 0xffffff, 25);

    // 2. Semi-persistent expanding smoke puffs
    const smokeCount = 36;
    const sGeom = new THREE.BufferGeometry();
    const sPositions = new Float32Array(smokeCount * 3);
    const sVelocities = [];

    for (let i = 0; i < smokeCount; i++) {
      sPositions[i * 3] = pos.x + (Math.random() - 0.5) * 4;
      sPositions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 4;
      sPositions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 4;

      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16
      );
      sVelocities.push(v);
    }
    sGeom.setAttribute('position', new THREE.BufferAttribute(sPositions, 3));

    // Grey-tinted smoke with faction accent
    const smokeColor = isAlien ? 0x4a1820 : 0x163828;
    const sMat = new THREE.PointsMaterial({
      color: smokeColor,
      size: 5.5,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const smokePoints = new THREE.Points(sGeom, sMat);
    this.scene.add(smokePoints);

    // Semi-persistent slow decay (lasts 3.5 - 5.0 seconds)
    this.particles.push({
      points: smokePoints,
      velocities: sVelocities,
      alpha: 0.85,
      decay: 0.22 // slowly fades over ~4.5 seconds
    });

    // 3. Tumbling fractured hull debris (mesh pieces breaking apart)
    if (!this.debris) this.debris = [];
    const debrisCount = 6 + Math.floor(Math.random() * 5);
    const debrisMats = [
      new THREE.MeshStandardMaterial({ color: isAlien ? 0xef4444 : 0x10b981, roughness: 0.4, metalness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.7, metalness: 0.5 }),
      new THREE.MeshBasicMaterial({ color: isAlien ? 0xff2a4f : 0x22c55e })
    ];

    for (let i = 0; i < debrisCount; i++) {
      const geomType = Math.random();
      let geom;
      if (geomType < 0.35) {
        geom = new THREE.TetrahedronGeometry(1.2 + Math.random() * 1.6);
      } else if (geomType < 0.7) {
        geom = new THREE.BoxGeometry(0.8 + Math.random() * 2.2, 0.4 + Math.random() * 0.8, 1.2 + Math.random() * 2.5);
      } else {
        geom = new THREE.ConeGeometry(0.9 + Math.random() * 0.9, 2.5, 4);
      }
      const mat = debrisMats[i % debrisMats.length];
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6
      ));
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 55,
        (Math.random() - 0.5) * 55,
        (Math.random() - 0.5) * 55
      );
      const rotVel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );

      this.debris.push({
        mesh,
        vel,
        rotVel,
        life: 2.8 + Math.random() * 1.5,
        maxLife: 4.0
      });
    }
  }

  spawnShieldImpact(ship, worldPoint) {
    if (!ship.mesh.userData.hero) return;
    const texture = this.getShieldImpactTexture();

    ship.mesh.updateWorldMatrix(true, false);
    const local = ship.mesh.worldToLocal(worldPoint.clone());
    const radii = new THREE.Vector3(9.4, 9.4 * 0.48, 9.4 * 0.88);
    const scaled = new THREE.Vector3(local.x / radii.x, local.y / radii.y, local.z / radii.z);
    if (scaled.lengthSq() < 0.0001) scaled.set(0, 0, -1);
    scaled.normalize();

    // Trigger shield flash state on hero ship
    ship.shieldHitFlash = 1.0;

    // Sprite bloom right at the directional contact point
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0x8ef5ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const impact = new THREE.Sprite(material);
    impact.position.set(scaled.x * radii.x, scaled.y * radii.y, scaled.z * radii.z);
    impact.scale.set(9.5, 9.5, 1);
    ship.mesh.add(impact);
    this.shieldImpacts.push({ impact, life: 0.75, maxLife: 0.75 });
  }

  spawnShieldImpactBloom(worldPoint, _normal = null) {
    const texture = this.getShieldImpactTexture();
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0x8ef5ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const impact = new THREE.Sprite(material);
    impact.position.copy(worldPoint);
    impact.scale.set(9.5, 9.5, 1);
    this.scene.add(impact);
    this.shieldImpacts.push({ impact, life: 0.75, maxLife: 0.75 });
  }

  update(dt) {
    // 1. Update particles
    const nextParticles = [];
    this.particles.forEach(p => {
      const posAttr = p.points.geometry.attributes.position;
      const count = posAttr.count;

      p.alpha -= p.decay * dt;
      p.points.material.opacity = Math.max(0, p.alpha);

      for (let i = 0; i < count; i++) {
        const vx = p.velocities[i].x;
        const vy = p.velocities[i].y;
        const vz = p.velocities[i].z;

        posAttr.setXYZ(
          i,
          posAttr.getX(i) + vx * dt,
          posAttr.getY(i) + vy * dt,
          posAttr.getZ(i) + vz * dt
        );
      }
      posAttr.needsUpdate = true;

      if (p.alpha <= 0) {
        this.scene.remove(p.points);
        p.points.geometry.dispose();
        p.points.material.dispose();
      } else {
        nextParticles.push(p);
      }
    });
    this.particles = nextParticles;

    // 2. Update shield impacts
    this.shieldImpacts = this.shieldImpacts.filter(entry => {
      entry.life -= dt;
      if (entry.life <= 0) {
        entry.impact.parent?.remove(entry.impact);
        entry.impact.material.dispose();
        return false;
      }
      const ratio = Math.max(0, entry.life / (entry.maxLife || 0.75));
      entry.impact.material.opacity = Math.min(1.0, 0.95 * Math.pow(ratio, 1.4));
      const scaleVal = 8.5 + (1 - ratio) * 5.5;
      entry.impact.scale.set(scaleVal, scaleVal, 1);
      return true;
    });

    // 3. Update tumbling hull debris
    if (this.debris && this.debris.length > 0) {
      const nextDebris = [];
      this.debris.forEach(d => {
        d.life -= dt;
        if (d.life <= 0) {
          this.scene.remove(d.mesh);
          d.mesh.geometry?.dispose();
          if (Array.isArray(d.mesh.material)) d.mesh.material.forEach(m => m.dispose());
          else d.mesh.material?.dispose();
        } else {
          d.mesh.position.addScaledVector(d.vel, dt);
          d.mesh.rotation.x += d.rotVel.x * dt;
          d.mesh.rotation.y += d.rotVel.y * dt;
          d.mesh.rotation.z += d.rotVel.z * dt;
          // Fade scale slightly as it expires
          const ratio = Math.max(0, d.life / d.maxLife);
          if (ratio < 0.25) {
            d.mesh.scale.setScalar(ratio / 0.25);
          }
          nextDebris.push(d);
        }
      });
      this.debris = nextDebris;
    }

    // 4. Update floating combat damage / status texts
    if (this.floatingTexts && this.floatingTexts.length > 0) {
      const nextTexts = [];
      this.floatingTexts.forEach(item => {
        item.life -= dt;
        if (item.life <= 0) {
          this.scene.remove(item.sprite);
          item.material.dispose();
          item.texture.dispose();
        } else {
          item.sprite.position.y += dt * 16;
          const ratio = Math.max(0, item.life / item.maxLife);
          item.material.opacity = Math.min(1.0, ratio * 1.8);
          nextTexts.push(item);
        }
      });
      this.floatingTexts = nextTexts;
    }

    // 5. Update temporary meshes (tractor beams, ion rings, warp streaks)
    if (this.temporaryMeshes && this.temporaryMeshes.length > 0) {
      const nextTemp = [];
      this.temporaryMeshes.forEach(item => {
        item.life -= dt;
        if (item.life <= 0) {
          this.scene.remove(item.mesh);
          item.mesh.geometry?.dispose();
          item.mesh.material?.dispose();
        } else {
          const ratio = Math.max(0, item.life / item.maxLife);
          if (item.expandRate) item.mesh.scale.addScalar(item.expandRate * dt);
          if (item.mesh.material) item.mesh.material.opacity = ratio * (item.baseOpacity || 0.9);
          nextTemp.push(item);
        }
      });
      this.temporaryMeshes = nextTemp;
    }
  }

  spawnFloatingText(worldPos, text, color = '#38bdf8', fontSize = 28) {
    if (!this.scene) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillText(text, 128, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1.0, depthTest: false });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(worldPos).add(new THREE.Vector3((Math.random() - 0.5) * 4, 3 + Math.random() * 2, (Math.random() - 0.5) * 4));
      sprite.scale.set(16, 4, 1);
      this.scene.add(sprite);

      this.floatingTexts = this.floatingTexts || [];
      this.floatingTexts.push({ sprite, material, texture, life: 1.25, maxLife: 1.25 });
    } catch {}
  }

  spawnWarpStreaks(origin, forwardDir) {
    if (!this.scene) return;
    try {
      const count = 42;
      const positions = new Float32Array(count * 6);
      for (let i = 0; i < count; i++) {
        const rad = 8 + Math.random() * 26;
        const angle = Math.random() * Math.PI * 2;
        const x = origin.x + Math.cos(angle) * rad;
        const y = origin.y + Math.sin(angle) * rad;
        const z = origin.z + (Math.random() - 0.5) * 32;

        positions[i * 6] = x;
        positions[i * 6 + 1] = y;
        positions[i * 6 + 2] = z;
        positions[i * 6 + 3] = x + forwardDir.x * 65;
        positions[i * 6 + 4] = y + forwardDir.y * 65;
        positions[i * 6 + 5] = z + forwardDir.z * 65;
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.95 });
      const lines = new THREE.LineSegments(geom, mat);
      this.scene.add(lines);
      this.temporaryMeshes.push({ mesh: lines, life: 0.35, maxLife: 0.35, baseOpacity: 0.95 });
    } catch {}
  }

  spawnTractorBeam(fromPos, toPos) {
    if (!this.scene) return;
    try {
      const geom = new THREE.BufferGeometry().setFromPoints([fromPos, toPos]);
      const mat = new THREE.LineBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      const line = new THREE.Line(geom, mat);
      this.scene.add(line);
      this.temporaryMeshes.push({ mesh: line, life: 0.08, maxLife: 0.08, baseOpacity: 0.85 });
    } catch {}
  }

  spawnFlareBurst(pos, rearDir) {
    if (!this.scene) return;
    const count = 24;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 1.4
      ).addScaledVector(rearDir, 0.9).normalize();
      velocities.push(spread.multiplyScalar(35 + Math.random() * 40));
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 3.4,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const points = new THREE.Points(geom, mat);
    this.scene.add(points);
    this.particles.push({ points, velocities, alpha: 1.0, decay: 0.95 });
  }

  spawnIonRing(pos) {
    if (!this.scene) return;
    try {
      const geom = new THREE.TorusGeometry(4, 0.35, 8, 24);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x818cf8,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      });
      const ring = new THREE.Mesh(geom, mat);
      ring.position.copy(pos);
      ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.scene.add(ring);
      this.temporaryMeshes.push({ mesh: ring, life: 0.4, maxLife: 0.4, baseOpacity: 0.9, expandRate: 12 });
    } catch {}
  }

  spawnLootBurst(pos, colorHex = 0xfbbf24) {
    this.spawnExplosion(pos, colorHex, 20);
  }

  spawnFireworks(origin, count = 28) {
    if (!this.scene) return;
    try {
      const colors = [0x10b981, 0x06b6d4, 0xf59e0b, 0xec4899, 0x8b5cf6];
      for (let f = 0; f < count; f++) {
        setTimeout(() => {
          if (!this.scene) return;
          const offset = new THREE.Vector3((Math.random() - 0.5) * 60, 10 + Math.random() * 40, (Math.random() - 0.5) * 60);
          const color = colors[f % colors.length];
          this.spawnExplosion(origin.clone().add(offset), color, 28);
        }, f * 120);
      }
    } catch {}
  }

  destroy() {
    this.particles.forEach(p => {
      this.scene.remove(p.points);
      p.points.geometry.dispose();
      p.points.material.dispose();
    });
    this.particles = [];

    this.shieldImpacts.forEach(({ impact }) => {
      impact.parent?.remove(impact);
      impact.material.dispose();
    });
    this.shieldImpacts = [];

    if (this.debris) {
      this.debris.forEach(d => {
        this.scene.remove(d.mesh);
        d.mesh.geometry?.dispose();
      });
      this.debris = [];
    }

    if (this.floatingTexts) {
      this.floatingTexts.forEach(item => {
        this.scene.remove(item.sprite);
        item.material.dispose();
        item.texture.dispose();
      });
      this.floatingTexts = [];
    }

    if (this.temporaryMeshes) {
      this.temporaryMeshes.forEach(item => {
        this.scene.remove(item.mesh);
        item.mesh.geometry?.dispose();
        item.mesh.material?.dispose();
      });
      this.temporaryMeshes = [];
    }

    this.shieldImpactTexture?.dispose();
    this.shieldImpactTexture = null;
  }
}
