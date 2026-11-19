// Deterministic Planetary Surface Expedition with Biome Props, Landed Starship, Terrain-Hugging Rover, and Jump Jets
import { ShipBuilder } from './ship-builder.js';

const THREE = window.THREE;

const PLANET_SCENES = {
  Ember: {
    ground: 0x8f432b,
    accent: 0xffa652,
    sky: 0x4a1d35,
    resource: 0xffc66d,
    seed: 1.1,
    amp: 1.25,
    biome: 'lava'
  },
  Azure: {
    ground: 0x2f5f5a,
    accent: 0x67e8f9,
    sky: 0x13426c,
    resource: 0x70f2ff,
    seed: 2.3,
    amp: 1.0,
    biome: 'crystal'
  },
  Viridian: {
    ground: 0x3b633c,
    accent: 0x86efac,
    sky: 0x164a46,
    resource: 0xc4ff82,
    seed: 3.7,
    amp: 1.15,
    biome: 'flora'
  },
  Cryo: {
    ground: 0x6085a8,
    accent: 0xe0f2fe,
    sky: 0x1e3a5f,
    resource: 0x93c5fd,
    seed: 5.1,
    amp: 1.35,
    biome: 'ice'
  },
  Obsidian: {
    ground: 0x27232c,
    accent: 0xf43f5e,
    sky: 0x1f0b18,
    resource: 0xfb7185,
    seed: 6.4,
    amp: 1.45,
    biome: 'basalt'
  },
  Aurelia: {
    ground: 0x6b5c43,
    accent: 0xfde047,
    sky: 0x2c1b3d,
    resource: 0xfef08a,
    seed: 7.9,
    amp: 1.1,
    biome: 'aurelia'
  }
};

export class PlanetSurface {
  constructor(scene, camera, onChange) {
    this.scene = scene;
    this.camera = camera;
    this.onChange = onChange;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.active = false;
    this.planet = null;
    this.rover = null;
    this.landedShip = null;
    this.nodes = [];
    this.outpostAnchor = { x: 0, z: -20 };
    this.cityAnchor = { x: 28, z: -24 };
    this.shipAnchor = { x: -15, z: 8 };
    this.progress = {};
    this.heldVisibility = null;
    this.elapsed = 0;

    // Rover physics state
    this.roverSpeed = 0;
    this.roverVy = 0;
    this.grounded = true;
    this.jumpFuel = 100;
    this.maxJumpFuel = 100;
    this.currentSeed = 1;
    this.currentAmp = 1;
    this.onJump = null;
  }

  getPlanetProgress(name) {
    return this.progress[name] || (this.progress[name] = {
      samples: 0,
      scanned: false,
      probe: false,
      outpost: false,
      city: false,
      completed: false,
      cityOwner: '',
      planetOwner: ''
    });
  }

  getTerrainHeight(x, z, seed = this.currentSeed, amp = this.currentAmp) {
    const craterFlat = Math.min(1, Math.hypot(x, z) / 14);
    const h =
      Math.sin(x * 0.08 + seed) * 1.65 +
      Math.cos(z * 0.075 - seed * 0.7) * 1.45 +
      Math.sin((x + z) * 0.038 + seed * 1.4) * 2.4;
    return -1.4 + h * amp * (0.25 + 0.75 * craterFlat);
  }

  getTerrainNormal(x, z) {
    const e = 0.8;
    const hL = this.getTerrainHeight(x - e, z);
    const hR = this.getTerrainHeight(x + e, z);
    const hD = this.getTerrainHeight(x, z - e);
    const hU = this.getTerrainHeight(x, z + e);
    return new THREE.Vector3(hL - hR, 2 * e, hD - hU).normalize();
  }

  disposeGroup() {
    this.group.traverse(child => {
      if (!child.isMesh) return;
      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(material => material?.dispose());
    });
    this.group.clear();
  }

  addBiomeProps(palette) {
    const propCount = 24;
    for (let i = 0; i < propCount; i++) {
      const angle = (i / propCount) * Math.PI * 2 + i * 0.37;
      const dist = 16 + ((i * 19) % 52);
      const px = Math.cos(angle) * dist;
      const pz = Math.sin(angle) * dist;
      if (Math.hypot(px - this.shipAnchor.x, pz - this.shipAnchor.z) < 9) continue;
      if (Math.hypot(px, pz) < 9) continue;
      const py = this.getTerrainHeight(px, pz);

      if (palette.biome === 'lava') {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(1.6 + (i % 3) * 0.6, 2.2, 7),
          new THREE.MeshStandardMaterial({ color: 0x3b1d1a, roughness: 0.9, flatShading: true })
        );
        cone.position.set(px, py + 0.9, pz);
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(0.75, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xff6b2b })
        );
        glow.position.set(px, py + 1.9, pz);
        this.group.add(cone, glow);
      } else if (palette.biome === 'crystal') {
        const crystal = new THREE.Mesh(
          new THREE.OctahedronGeometry(1.3 + (i % 3) * 0.45, 0),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.45, roughness: 0.2, metalness: 0.5 })
        );
        crystal.scale.set(0.7, 2.2, 0.7);
        crystal.position.set(px, py + 1.4, pz);
        crystal.rotation.set((i % 3 - 1) * 0.18, i, (i % 2 - 0.5) * 0.2);
        this.group.add(crystal);
      } else if (palette.biome === 'flora') {
        const stalk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.34, 2.6, 6),
          new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 })
        );
        stalk.position.set(px, py + 1.2, pz);
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(1.5, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
          new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 0.4, roughness: 0.4 })
        );
        cap.position.set(px, py + 2.4, pz);
        this.group.add(stalk, cap);
      } else if (palette.biome === 'ice') {
        const spire = new THREE.Mesh(
          new THREE.ConeGeometry(1.1 + (i % 3) * 0.4, 4.8 + (i % 4), 5),
          new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x38bdf8, emissiveIntensity: 0.22, roughness: 0.18, metalness: 0.35 })
        );
        spire.position.set(px, py + 2.0, pz);
        this.group.add(spire);
      } else if (palette.biome === 'basalt') {
        const monolith = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 4.2 + (i % 3) * 1.4, 1.2),
          new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, flatShading: true })
        );
        monolith.position.set(px, py + 1.8, pz);
        monolith.rotation.y = i * 0.5;
        const vein = new THREE.Mesh(
          new THREE.BoxGeometry(1.26, 0.25, 1.26),
          new THREE.MeshBasicMaterial({ color: 0xf43f5e })
        );
        vein.position.set(px, py + 2.5, pz);
        vein.rotation.y = i * 0.5;
        this.group.add(monolith, vein);
      } else {
        // Aurelia-IV crystal moon spires
        const arch = new THREE.Mesh(
          new THREE.TorusGeometry(2.0, 0.35, 6, 12, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xb45309, emissiveIntensity: 0.35, roughness: 0.3 })
        );
        arch.position.set(px, py, pz);
        arch.rotation.y = i * 0.7;
        this.group.add(arch);
      }
    }

    if (palette.biome === 'aurelia') {
      // Dramatic ringed gas giant Aurelia looming in the moon's sky
      const skyGiant = new THREE.Mesh(
        new THREE.SphereGeometry(38, 28, 20),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0x78350f, emissiveIntensity: 0.45, roughness: 0.6 })
      );
      skyGiant.position.set(-75, 58, -110);
      const skyRing = new THREE.Mesh(
        new THREE.RingGeometry(48, 72, 48),
        new THREE.MeshBasicMaterial({ color: 0xfde68a, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
      );
      skyRing.rotation.x = Math.PI / 2 - 0.35;
      skyRing.rotation.y = 0.25;
      skyGiant.add(skyRing);
      this.group.add(skyGiant);
    }
  }

  createSurface(planet, shipOptions = {}) {
    this.disposeGroup();
    this.nodes = [];
    const palette = PLANET_SCENES[planet.name] || PLANET_SCENES.Azure;
    this.currentSeed = palette.seed;
    this.currentAmp = palette.amp;

    this.group.background = null;
    const groundGeometry = new THREE.PlaneGeometry(180, 180, 64, 64);
    const positions = groundGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const wx = positions.getX(i);
      const wz = -positions.getY(i);
      positions.setZ(i, this.getTerrainHeight(wx, wz));
    }
    groundGeometry.computeVertexNormals();
    const ground = new THREE.Mesh(
      groundGeometry,
      new THREE.MeshStandardMaterial({ color: palette.ground, roughness: 0.94, flatShading: true })
    );
    ground.rotation.x = -Math.PI / 2;
    this.group.add(ground);

    const horizon = new THREE.Mesh(
      new THREE.SphereGeometry(230, 32, 18),
      new THREE.MeshBasicMaterial({ color: palette.sky, side: THREE.BackSide })
    );
    horizon.position.y = -12;
    this.group.add(horizon);

    const sun = new THREE.DirectionalLight(palette.accent, 2.4);
    sun.position.set(-45, 65, 25);
    this.group.add(sun, new THREE.HemisphereLight(palette.sky, palette.ground, 1.15));

    // Perimeter ridges
    for (let i = 0; i < 26; i++) {
      const angle = (i / 26) * Math.PI * 2;
      const radius = 56 + Math.sin(i * 13.3) * 12;
      const rx = Math.cos(angle) * radius;
      const rz = Math.sin(angle) * radius;
      const height = 7 + ((i * 17) % 18);
      const ridge = new THREE.Mesh(
        new THREE.ConeGeometry(8 + (i % 5), height, 5),
        new THREE.MeshStandardMaterial({ color: i % 2 ? palette.ground : palette.accent, roughness: 1, flatShading: true })
      );
      ridge.position.set(rx, this.getTerrainHeight(rx, rz) + height * 0.45, rz);
      this.group.add(ridge);
    }

    this.addBiomeProps(palette);

    // Landing Beacon
    const beacon = new THREE.Group();
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.24, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.65, roughness: 0.3 })
    );
    mast.position.y = 2;
    const beaconLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0x34e7ff })
    );
    beaconLight.position.y = 4.2;
    beacon.add(mast, beaconLight);
    beacon.position.set(-9, this.getTerrainHeight(-9, -7), -7);
    this.group.add(beacon);

    // Player's Landed Starship parked near landing beacon
    this.landedShip = ShipBuilder.buildPlayerShip(shipOptions.shipClass || 'vanguard', shipOptions.livery || null);
    this.landedShip.scale.setScalar(0.55);
    this.landedShip.position.set(
      this.shipAnchor.x,
      this.getTerrainHeight(this.shipAnchor.x, this.shipAnchor.z) + 1.4,
      this.shipAnchor.z
    );
    this.landedShip.rotation.y = 0.65;
    this.group.add(this.landedShip);

    // Expedition Rover
    this.rover = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.75, 3.1),
      new THREE.MeshStandardMaterial({ color: 0x22d3ee, metalness: 0.56, roughness: 0.32 })
    );
    body.position.y = 1.0;
    this.rover.add(body);
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.6, 1.25),
      new THREE.MeshStandardMaterial({ color: 0x172554, metalness: 0.3, roughness: 0.18 })
    );
    canopy.position.set(0, 1.65, -0.2);
    this.rover.add(canopy);
    const jumpThruster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.6, 0.3, 10),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    jumpThruster.position.set(0, 0.55, 0.2);
    this.rover.add(jumpThruster);

    for (const x of [-1.25, 1.25]) {
      for (const z of [-0.95, 0.95]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.48, 0.48, 0.32, 12),
          new THREE.MeshStandardMaterial({ color: 0x172033, roughness: 0.9 })
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.48, z);
        this.rover.add(wheel);
      }
    }
    this.rover.position.set(0, this.getTerrainHeight(0, 2), 2);
    this.roverSpeed = 0;
    this.roverVy = 0;
    this.grounded = true;
    this.jumpFuel = 100;
    this.group.add(this.rover);

    // Collectible Samples & Lost Probe (grounded cleanly on terrain)
    const progress = this.getPlanetProgress(planet.name);
    if (progress.city) this.addColonyCity();
    const addNode = (id, label, kind, x, z, color, geometry) => {
      if (progress[id]) return;
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.28, roughness: 0.35, metalness: 0.25 })
      );
      const baseHeight = geometry.parameters?.height ? geometry.parameters.height * 0.55 : 1.1;
      mesh.position.set(x, this.getTerrainHeight(x, z) + baseHeight, z);
      mesh.userData = { id, label, kind, baseY: mesh.position.y };
      this.group.add(mesh);
      this.nodes.push(mesh);
    };

    const sampleCoords = [[12, -4], [22, -11], [15, -21]];
    for (let i = 0; i < 3; i++) {
      const [sx, sz] = sampleCoords[i];
      addNode(
        `sample-${i}`,
        ['Luminous flora', 'Rare crystal', 'Atmosphere capsule'][i],
        'sample',
        sx,
        sz,
        palette.resource,
        new THREE.OctahedronGeometry(1.15 + i * 0.12, 0)
      );
    }
    addNode('probe', 'Missing survey probe', 'probe', -21, 18, 0xffaa5c, new THREE.BoxGeometry(2.1, 1.4, 1.7));

    // Abandoned research shelter
    const shelterY = this.getTerrainHeight(19, 16);
    const shelter = new THREE.Mesh(
      new THREE.CylinderGeometry(2.7, 3.2, 3.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x45566c, metalness: 0.2, roughness: 0.72 })
    );
    shelter.position.set(19, shelterY + 1.8, 16);
    this.group.add(shelter);
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(1.3, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.75, roughness: 0.22 })
    );
    dish.scale.set(1, 0.25, 1);
    dish.position.set(19, shelterY + 4.3, 16);
    this.group.add(dish);

    if (progress.outpost) this.addOutpost();
    this.group.visible = true;
  }

  land(planet, progress = {}, shipOptions = {}) {
    if (this.active) return false;
    this.planet = planet;
    this.progress[planet.name] = { ...this.getPlanetProgress(planet.name), ...progress };
    this.heldVisibility = this.scene.children.map(child => [child, child.visible]);
    this.heldVisibility.forEach(([child]) => {
      if (child !== this.camera && child !== this.group) child.visible = false;
    });
    this.createSurface(planet, shipOptions);
    this.active = true;
    this.elapsed = 0;
    this.scene.background = new THREE.Color(PLANET_SCENES[planet.name]?.sky || 0x154a76);
    this.scene.fog = new THREE.Fog(PLANET_SCENES[planet.name]?.sky || 0x154a76, 55, 210);
    this.onChange?.('landed', this.getStatus());
    return true;
  }

  getStatus() {
    const p = this.planet ? this.getPlanetProgress(this.planet.name) : {};
    return {
      active: this.active,
      planet: this.planet?.name,
      landingLabel: this.planet?.landingLabel || this.planet?.name,
      biome: PLANET_SCENES[this.planet?.name]?.biome || 'frontier',
      samples: p.samples || 0,
      scanned: !!p.scanned,
      probe: !!p.probe,
      outpost: !!p.outpost,
      city: !!p.city,
      cityOwner: p.cityOwner || '',
      cityOwned: Boolean(p.cityOwner),
      planetOwner: p.planetOwner || '',
      planetOwned: Boolean(p.planetOwner),
      completed: !!p.completed,
      nearby: this.nearestNode()?.userData.label || '',
      jumpFuel: Math.round(this.jumpFuel),
      grounded: this.grounded
    };
  }

  nearestNode() {
    if (!this.rover) return null;
    return this.nodes
      .filter(node => node.visible)
      .sort((a, b) => a.position.distanceTo(this.rover.position) - b.position.distanceTo(this.rover.position))[0] || null;
  }

  interact() {
    if (!this.active) return null;
    const node = this.nearestNode();
    if (!node || Math.hypot(node.position.x - this.rover.position.x, node.position.z - this.rover.position.z) > 6) {
      return { error: 'Drive within 6 m of a highlighted site first.' };
    }
    const data = node.userData;
    node.visible = false;
    const progress = this.getPlanetProgress(this.planet.name);
    progress[data.id] = true;
    if (data.kind === 'sample') progress.samples = Math.min(3, progress.samples + 1);
    if (data.kind === 'probe') progress.probe = true;
    const reward = data.kind === 'probe' ? 650 : 280;
    const complete = progress.samples >= 3 && progress.scanned && progress.probe;
    if (complete) progress.completed = true;
    this.onChange?.('interaction', { ...this.getStatus(), label: data.label, reward, complete });
    return { label: data.label, reward, complete };
  }

  scan() {
    if (!this.active) return null;
    const p = this.getPlanetProgress(this.planet.name);
    if (p.scanned) return { error: 'This landing zone has already been surveyed.' };
    p.scanned = true;
    const complete = p.samples >= 3 && p.probe;
    if (complete) p.completed = true;
    this.onChange?.('scan', { ...this.getStatus(), reward: 400, complete: p.completed });
    return { reward: 400, complete: p.completed };
  }

  buildOutpost() {
    if (!this.active) return { error: 'Land on a planet before building an outpost.' };
    const p = this.getPlanetProgress(this.planet.name);
    if (p.outpost) return { error: 'An outpost is already operating here.' };
    p.outpost = true;
    this.addOutpost();
    this.onChange?.('outpost', { ...this.getStatus() });
    return { built: true };
  }

  addOutpost() {
    const habitat = new THREE.Group();
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({ color: 0x69e8ff, transparent: true, opacity: 0.58, metalness: 0.4, roughness: 0.2, side: THREE.DoubleSide })
    );
    dome.position.y = 0.2;
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(3.3, 3.6, 0.7, 20),
      new THREE.MeshStandardMaterial({ color: 0x62748a, metalness: 0.5, roughness: 0.4 })
    );
    base.position.y = 0.25;
    habitat.add(dome, base);
    const oy = this.getTerrainHeight(this.outpostAnchor.x, this.outpostAnchor.z);
    habitat.position.set(this.outpostAnchor.x, oy, this.outpostAnchor.z);
    this.group.add(habitat);
  }

  charterCity(owner) {
    if (!this.active) return { error: 'Land on a planet before chartering a city.' };
    const progress = this.getPlanetProgress(this.planet.name);
    if (progress.city) return { error: 'Your planetary city charter is already active here.' };
    progress.city = true;
    progress.cityOwner = owner;
    this.addColonyCity();
    this.onChange?.('charter', { ...this.getStatus() });
    return { built: true };
  }

  acquireSovereignty(owner) {
    if (!this.active) return { error: 'Land on a planet before acquiring its sovereignty deed.' };
    const progress = this.getPlanetProgress(this.planet.name);
    if (progress.planetOwner) return { error: `${progress.planetOwner} already holds the planetary deed.` };
    progress.planetOwner = owner;
    if (!progress.outpost) {
      progress.outpost = true;
      this.addOutpost();
    }
    if (!progress.city) {
      progress.city = true;
      this.addColonyCity();
    }
    if (!progress.cityOwner) progress.cityOwner = owner;
    this.onChange?.('sovereignty', { ...this.getStatus() });
    return { acquired: true };
  }

  addColonyCity() {
    const city = new THREE.Group();
    const colors = [0x60a5fa, 0x34d399, 0xa78bfa, 0xfbbf24, 0xfb7185];
    for (let i = 0; i < 9; i++) {
      const height = 3.5 + ((i * 7) % 10);
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(2.5 + (i % 3), height, 2.5 + ((i + 1) % 3)),
        new THREE.MeshStandardMaterial({
          color: colors[i % colors.length],
          emissive: colors[i % colors.length],
          emissiveIntensity: 0.16,
          metalness: 0.46,
          roughness: 0.3
        })
      );
      building.position.set(((i % 3) - 1) * 5, height / 2, (Math.floor(i / 3) - 1) * 5);
      city.add(building);
    }
    const hub = new THREE.Mesh(new THREE.SphereGeometry(2.3, 16, 12), new THREE.MeshBasicMaterial({ color: 0x67e8f9 }));
    hub.position.set(0, 9.5, 0);
    city.add(hub);
    const cy = this.getTerrainHeight(this.cityAnchor.x, this.cityAnchor.z);
    city.position.set(this.cityAnchor.x, cy, this.cityAnchor.z);
    this.group.add(city);
  }

  triggerJumpJet() {
    if (!this.active || !this.rover) return false;
    if (this.jumpFuel < 15) return false;
    if (this.grounded) {
      this.roverVy = 14.5;
      this.grounded = false;
      this.jumpFuel = Math.max(0, this.jumpFuel - 28);
      this.onJump?.(this.rover.position.clone());
      return true;
    } else if (this.jumpFuel >= 20) {
      this.roverVy = Math.max(this.roverVy, 9.5);
      this.jumpFuel = Math.max(0, this.jumpFuel - 20);
      this.onJump?.(this.rover.position.clone());
      return true;
    }
    return false;
  }

  getRadarData() {
    if (!this.active || !this.rover || !this.planet) return null;
    const prog = this.getPlanetProgress(this.planet.name);
    return {
      roverX: this.rover.position.x,
      roverZ: this.rover.position.z,
      roverYaw: this.rover.rotation.y,
      nodes: this.nodes.filter(n => n.visible).map(n => ({
        x: n.position.x,
        z: n.position.z,
        kind: n.userData.kind,
        label: n.userData.label
      })),
      ship: this.shipAnchor,
      outpost: prog.outpost ? this.outpostAnchor : null,
      city: prog.city ? this.cityAnchor : null
    };
  }

  update(dt, keys, touch = {}) {
    if (!this.active || !this.rover) return;
    this.elapsed += dt;
    const rover = this.rover;

    let move = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
    let turn = (keys.a || keys.arrowleft ? 1 : 0) - (keys.d || keys.arrowright ? 1 : 0);
    if (Math.hypot(touch?.stickX || 0, touch?.stickY || 0) > 0.15) {
      turn -= touch.stickX;
      move -= touch.stickY;
    }

    const boost = (keys.shift || touch?.boost) ? 1.5 : 1.0;
    rover.rotation.y += turn * dt * 2.1;

    const targetSpeed = move * 16.0 * boost;
    this.roverSpeed = THREE.MathUtils.lerp(this.roverSpeed, targetSpeed, 1 - Math.exp(-8 * dt));
    if (Math.abs(this.roverSpeed) > 0.05) {
      rover.position.x -= Math.sin(rover.rotation.y) * this.roverSpeed * dt;
      rover.position.z -= Math.cos(rover.rotation.y) * this.roverSpeed * dt;
      rover.position.x = THREE.MathUtils.clamp(rover.position.x, -82, 82);
      rover.position.z = THREE.MathUtils.clamp(rover.position.z, -82, 82);
    }

    // Continuous jump jet thrust while Space is held if airborne and fuel remains
    if (keys[' '] && !this.grounded && this.jumpFuel > 5) {
      this.roverVy += 19.0 * dt;
      this.jumpFuel = Math.max(0, this.jumpFuel - 34 * dt);
    }

    // Gravity & ground clamping
    const groundY = this.getTerrainHeight(rover.position.x, rover.position.z);
    if (!this.grounded || rover.position.y > groundY + 0.02 || this.roverVy > 0) {
      this.roverVy -= 26.0 * dt;
      rover.position.y += this.roverVy * dt;
      if (rover.position.y <= groundY) {
        rover.position.y = groundY;
        this.roverVy = 0;
        this.grounded = true;
      } else {
        this.grounded = false;
      }
    } else {
      rover.position.y = groundY;
      this.grounded = true;
    }

    if (this.grounded) {
      this.jumpFuel = Math.min(this.maxJumpFuel, this.jumpFuel + 28 * dt);
    }

    // Gentle terrain-slope alignment on rover pitch/roll
    const normal = this.getTerrainNormal(rover.position.x, rover.position.z);
    const forward = new THREE.Vector3(-Math.sin(rover.rotation.y), 0, -Math.cos(rover.rotation.y));
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const targetPitch = Math.asin(THREE.MathUtils.clamp(normal.dot(forward), -0.45, 0.45));
    const targetRoll = -Math.asin(THREE.MathUtils.clamp(normal.dot(right), -0.45, 0.45));
    rover.rotation.x = THREE.MathUtils.lerp(rover.rotation.x, this.grounded ? targetPitch : 0, Math.min(1, dt * 8));
    rover.rotation.z = THREE.MathUtils.lerp(rover.rotation.z, this.grounded ? targetRoll : 0, Math.min(1, dt * 8));

    // Bob and spin collectible nodes
    this.nodes.forEach((node, index) => {
      if (node.visible) {
        node.rotation.y += dt * (0.7 + index * 0.12);
        node.position.y = (node.userData.baseY || 1) + Math.sin(this.elapsed * 2.5 + index) * 0.22;
      }
    });

    const camDist = this.wideView ? 17 : 9.5;
    const camHeight = this.wideView ? 11 : 4.6;
    const behindX = rover.position.x + Math.sin(rover.rotation.y) * camDist;
    const behindZ = rover.position.z + Math.cos(rover.rotation.y) * camDist;
    const camGroundY = this.getTerrainHeight(behindX, behindZ);
    const camTargetPos = new THREE.Vector3(
      behindX,
      Math.max(rover.position.y + camHeight, camGroundY + 2.4),
      behindZ
    );
    this.camera.position.lerp(camTargetPos, Math.min(1, dt * 5.5));
    this.camera.up.set(0, 1, 0);

    const lookAheadX = rover.position.x - Math.sin(rover.rotation.y) * 12;
    const lookAheadZ = rover.position.z - Math.cos(rover.rotation.y) * 12;
    this.camera.lookAt(lookAheadX, rover.position.y + 1.5, lookAheadZ);
  }

  takeoff() {
    if (!this.active) return false;
    this.active = false;
    this.group.visible = false;
    this.heldVisibility?.forEach(([child, visible]) => {
      if (child !== this.group) child.visible = visible;
    });
    this.heldVisibility = null;
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(0x05030a, 0.00008);
    this.onChange?.('takeoff', this.getStatus());
    return true;
  }
}
