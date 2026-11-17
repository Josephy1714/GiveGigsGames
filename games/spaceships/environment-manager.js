// Solar system environment manager: Sun, Corona, Planets, Moons, Asteroid Belt, Comets, and Ambient Dust
import { makePlanetTexture, addAtmosphere, createStarCorona } from './celestial-effects.js';

const THREE = window.THREE;
export const ONE_AU = 500;
export const SYSTEM_EDGE = 3800;

export class EnvironmentManager {
  constructor(scene) {
    this.scene = scene;
    this.sun = null;
    this.sunLight = null;
    this.sunCorona = null;
    this.sunGlowShells = [];
    this.planets = [];
    this.asteroids = [];
    this.comets = [];
    this.dust = null;
  }

  init() {
    // 1. Central Star (Sun)
    const sunGeom = new THREE.SphereGeometry(140, 48, 48);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff6dd });
    this.sun = new THREE.Mesh(sunGeom, sunMat);
    this.sun.position.set(0, 0, 0);
    this.scene.add(this.sun);

    this.sunCorona = createStarCorona(140);
    this.sun.add(this.sunCorona);

    // Multi-layer glowing shells for volumetric solar bloom
    const shellRadii = [155, 175, 205];
    const shellColors = [0xffea88, 0xffa33b, 0xff5511];
    shellRadii.forEach((r, idx) => {
      const g = new THREE.SphereGeometry(r, 24, 24);
      const m = new THREE.MeshBasicMaterial({
        color: shellColors[idx],
        transparent: true,
        opacity: 0.12 - idx * 0.03,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
      });
      const shell = new THREE.Mesh(g, m);
      this.scene.add(shell);
      this.sunGlowShells.push(shell);
    });

    // 2. Sunlight
    this.sunLight = new THREE.PointLight(0xfff5e6, 3.2, 7000, 0.45);
    this.sunLight.position.set(0, 0, 0);
    this.scene.add(this.sunLight);

    // 3. Multi-layer Parallax Starfield with bright crisp stars
    const starCounts = [2200, 1600, 1200];
    const starRadii = [3200, 5200, 7500];
    const starMats = [
      new THREE.PointsMaterial({ color: 0xffffff, size: 2.8, transparent: true, opacity: 0.95 }),
      new THREE.PointsMaterial({ color: 0x00f2fe, size: 3.2, transparent: true, opacity: 0.9 }),
      new THREE.PointsMaterial({ color: 0xa855f7, size: 2.4, transparent: true, opacity: 0.95 })
    ];

    starCounts.forEach((count, idx) => {
      const geom = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const r = starRadii[idx];
      for (let i = 0; i < count * 3; i += 3) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const sinPhi = Math.sin(phi);
        positions[i] = r * sinPhi * Math.cos(theta);
        positions[i + 1] = r * sinPhi * Math.sin(theta);
        positions[i + 2] = r * Math.cos(phi);
      }
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const points = new THREE.Points(geom, starMats[idx]);
      this.scene.add(points);
    });

    // 3b. Floating Vibrant Nebula Planes (Original aesthetic)
    const createNebulaTexture = (color1, color2) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      grad.addColorStop(0, color1);
      grad.addColorStop(0.5, color2);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
      return new THREE.CanvasTexture(canvas);
    };

    const nebConfigs = [
      { color1: 'rgba(139, 92, 246, 0.70)', color2: 'rgba(6, 182, 212, 0.20)', pos: new THREE.Vector3(-1800, -500, -2800), size: 4500 },
      { color1: 'rgba(16, 185, 129, 0.60)', color2: 'rgba(139, 92, 246, 0.15)', pos: new THREE.Vector3(2200, 700, -2200), size: 5000 },
      { color1: 'rgba(6, 182, 212, 0.65)', color2: 'rgba(236, 72, 153, 0.25)', pos: new THREE.Vector3(0, -900, -3200), size: 5500 },
      { color1: 'rgba(244, 63, 94, 0.60)', color2: 'rgba(139, 92, 246, 0.20)', pos: new THREE.Vector3(-2400, 800, 2000), size: 4800 },
      { color1: 'rgba(14, 165, 233, 0.65)', color2: 'rgba(16, 185, 129, 0.20)', pos: new THREE.Vector3(2500, -600, 2500), size: 5200 }
    ];

    nebConfigs.forEach(conf => {
      const tex = createNebulaTexture(conf.color1, conf.color2);
      const geom = new THREE.PlaneGeometry(conf.size, conf.size);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(conf.pos);
      mesh.lookAt(new THREE.Vector3(0, 0, 0));
      this.scene.add(mesh);
    });

    // 4. Planets orbiting around sun
    const planetTypes = [
      { name: 'Ember', dist: 1100, radius: 65, speed: 0.0144, color: 0xe66946, atmosphere: 0xff9c53, colors: ['#4d1535', '#e36d40', '#f9b36a', '#8f3650'], moons: 2, roughness: 0.8 },
      { name: 'Azure', dist: 1925, radius: 105, speed: 0.0088, color: 0x28bad7, atmosphere: 0x39d9ff, colors: ['#12325e', '#187da2', '#66d9ca', '#253975'], moons: 4, roughness: 0.5 },
      { name: 'Viridian', dist: 2925, radius: 155, speed: 0.0056, color: 0x36cba2, atmosphere: 0x83f8c5, colors: ['#192e50', '#177d77', '#7ac978', '#3c6288'], moons: 6, roughness: 0.62, rings: true }
    ];

    planetTypes.forEach((t, idx) => {
      const geom = new THREE.SphereGeometry(t.radius, 48, 32);
      const mat = new THREE.MeshStandardMaterial({
        map: makePlanetTexture(t.colors, 142 + idx * 71),
        color: 0xffffff,
        roughness: t.roughness,
        metalness: 0.02,
        flatShading: false
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(t.dist, 0, 0);
      this.scene.add(mesh);
      addAtmosphere(mesh, t.radius, t.atmosphere);

      if (t.rings) {
        const ringGeom = new THREE.RingGeometry(t.radius * 1.3, t.radius * 2.0, 64);
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.4
        });
        const ringsMesh = new THREE.Mesh(ringGeom, ringMat);
        ringsMesh.rotation.x = Math.PI / 2;
        mesh.add(ringsMesh);
      }

      this.planets.push({
        ...t,
        mesh,
        angle: Math.random() * Math.PI * 2,
        moons: Array.from({ length: t.moons }, (_, moonIndex) => {
          const mRadius = 11 + Math.random() * 14;
          const mGeom = new THREE.SphereGeometry(mRadius, 16, 16);
          const mMat = new THREE.MeshStandardMaterial({ color: [0xc0d9ee, 0xe1bca4, 0x8dc4ba, 0xae9ddc][moonIndex % 4], roughness: 0.9 });
          const mMesh = new THREE.Mesh(mGeom, mMat);
          this.scene.add(mMesh);
          return {
            mesh: mMesh,
            dist: t.radius * 1.7 + moonIndex * 62 + Math.random() * 8,
            radius: mRadius,
            speed: (0.08 + 0.025 * moonIndex) / Math.sqrt(t.radius / 15),
            angle: Math.random() * Math.PI * 2
          };
        })
      });
    });

    // 5. Jagged Asteroids
    for (let i = 0; i < 55; i++) {
      const dist = 1300 + Math.random() * 1700;
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.5 + Math.random() * 5;
      
      const geom = new THREE.DodecahedronGeometry(radius, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x293d55,
        roughness: 0.9,
        metalness: 0.2,
        flatShading: true
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(
        dist * Math.cos(angle),
        (Math.random() - 0.5) * 80,
        dist * Math.sin(angle)
      );
      this.scene.add(mesh);
      this.asteroids.push({
        mesh,
        radius,
        orbitRadius: dist,
        orbitAngle: angle,
        orbitSpeed: 0.018 * Math.pow(400 / dist, 1.5),
        rotationSpeed: new THREE.Vector3(Math.random() * 0.015, Math.random() * 0.015, Math.random() * 0.015)
      });
    }

    // 6. Comets
    const cometColors = [0x67e8ff, 0xffacdc, 0xb8ff91, 0xffd886];
    for (let i = 0; i < 4; i++) {
      const color = cometColors[i];
      const head = new THREE.Mesh(
        new THREE.IcosahedronGeometry(3.5 + i * 0.5, 1),
        new THREE.MeshBasicMaterial({ color, blending: THREE.AdditiveBlending })
      );
      const tailGeometry = new THREE.BufferGeometry();
      tailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(36 * 3), 3));
      const tail = new THREE.Line(tailGeometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending }));
      this.scene.add(head, tail);
      this.comets.push({ head, tail, angle: i * Math.PI / 2, radius: 1350 + i * 525, speed: 0.008 + i * 0.0024, history: [] });
    }

    // 7. Space Dust particles
    const dustCount = 800;
    const dustGeom = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPos[i] = (Math.random() - 0.5) * 900;
      dustPos[i + 1] = (Math.random() - 0.5) * 400;
      dustPos[i + 2] = (Math.random() - 0.5) * 900;
    }
    dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      transparent: true,
      opacity: 0.4
    });
    this.dust = new THREE.Points(dustGeom, dustMat);
    this.scene.add(this.dust);
  }

  update(dt) {
    // 1. Rotate planets and moons
    this.planets.forEach(p => {
      p.angle += p.speed * dt;
      p.mesh.position.x = p.dist * Math.cos(p.angle);
      p.mesh.position.z = p.dist * Math.sin(p.angle);
      p.mesh.rotation.y += 0.25 * dt;

      p.moons.forEach(m => {
        m.angle += m.speed * dt;
        m.mesh.position.x = p.mesh.position.x + m.dist * Math.cos(m.angle);
        m.mesh.position.z = p.mesh.position.z + m.dist * Math.sin(m.angle);
        m.mesh.position.y = p.mesh.position.y + Math.sin(m.angle * 1.5) * 15;
      });
    });

    // 2. Rotate Asteroids
    this.asteroids.forEach(a => {
      a.orbitAngle += a.orbitSpeed * dt;
      a.mesh.position.x = a.orbitRadius * Math.cos(a.orbitAngle);
      a.mesh.position.z = a.orbitRadius * Math.sin(a.orbitAngle);
      a.mesh.rotation.x += a.rotationSpeed.x;
      a.mesh.rotation.y += a.rotationSpeed.y;
      a.mesh.rotation.z += a.rotationSpeed.z;
    });

    // 3. Pulse Sun and Glow Halos
    const timeVal = performance.now() * 0.003;
    const sunScale = 1.0 + 0.035 * Math.sin(timeVal);
    this.sun.scale.set(sunScale, sunScale, sunScale);
    this.sunGlowShells.forEach((shell, idx) => {
      const pulse = 1.0 + 0.05 * Math.sin(timeVal + idx * Math.PI * 0.3);
      shell.scale.set(pulse, pulse, pulse);
    });
    this.sunCorona.scale.setScalar(900 + Math.sin(timeVal * 0.7) * 35);

    // 4. Comets
    this.comets.forEach((comet, index) => {
      comet.angle += comet.speed * dt;
      comet.head.position.set(
        comet.radius * Math.cos(comet.angle),
        Math.sin(comet.angle * 2 + index) * (20 + index * 7),
        comet.radius * 0.8 * Math.sin(comet.angle)
      );
      comet.history.unshift(comet.head.position.clone());
      if (comet.history.length > 36) comet.history.pop();
      const positions = comet.tail.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const point = comet.history[Math.min(i, comet.history.length - 1)];
        positions.setXYZ(i, point.x, point.y, point.z);
      }
      positions.needsUpdate = true;
    });
  }

  destroy() {
    this.planets.forEach(pl => {
      this.scene.remove(pl.mesh);
      pl.moons.forEach(m => this.scene.remove(m.mesh));
    });
    this.asteroids.forEach(ast => this.scene.remove(ast.mesh));
    this.comets.forEach(comet => {
      this.scene.remove(comet.head);
      this.scene.remove(comet.tail);
    });
    if (this.dust) this.scene.remove(this.dust);
    if (this.sun) this.scene.remove(this.sun);
    if (this.sunLight) this.scene.remove(this.sunLight);
    this.sunGlowShells.forEach(s => this.scene.remove(s));
    this.planets = [];
    this.asteroids = [];
    this.comets = [];
    this.sunGlowShells = [];
  }
}
