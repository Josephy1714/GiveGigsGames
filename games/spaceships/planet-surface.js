// Lightweight, deterministic planetary excursion rendered in the existing Three.js scene.
const THREE = window.THREE;

const PLANET_SCENES = {
  Ember: { ground: 0x9e543c, accent: 0xffb66d, sky: 0x4e2441, resource: 0xffc66d },
  Azure: { ground: 0x35645d, accent: 0x81d6bd, sky: 0x154a76, resource: 0x70f2ff },
  Viridian: { ground: 0x486c45, accent: 0xb0e886, sky: 0x194d52, resource: 0xc4ff82 }
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
    this.nodes = [];
    this.progress = {};
    this.heldVisibility = null;
    this.elapsed = 0;
  }

  getPlanetProgress(name) {
    return this.progress[name] || (this.progress[name] = { samples: 0, scanned: false, probe: false, outpost: false, city: false, completed: false, cityOwner: '', planetOwner: '' });
  }

  createSurface(planet) {
    this.group.traverse(child => {
      if (!child.isMesh) return;
      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(material => material?.dispose());
    });
    this.group.traverse(child => {
      if (!child.isMesh) return;
      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(material => material?.dispose());
    });
    this.group.clear();
    this.nodes = [];
    const palette = PLANET_SCENES[planet.name] || PLANET_SCENES.Azure;
    this.group.background = null;
    const groundGeometry = new THREE.PlaneGeometry(180, 180, 64, 64);
    const positions = groundGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i);
      positions.setZ(i, Math.sin(x * 0.09) * 1.8 + Math.cos(y * 0.07) * 1.4 + Math.sin((x + y) * 0.035) * 2.6);
    }
    groundGeometry.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeometry, new THREE.MeshStandardMaterial({ color: palette.ground, roughness: 0.96, flatShading: true }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.5;
    this.group.add(ground);

    const horizon = new THREE.Mesh(new THREE.SphereGeometry(230, 32, 18), new THREE.MeshBasicMaterial({ color: palette.sky, side: THREE.BackSide }));
    horizon.position.y = -12;
    this.group.add(horizon);
    const sun = new THREE.DirectionalLight(palette.accent, 2.5);
    sun.position.set(-45, 65, 25);
    this.group.add(sun, new THREE.HemisphereLight(palette.sky, palette.ground, 1.1));

    // Distant ridges and clustered landmarks give the landing area a readable horizon.
    for (let i = 0; i < 26; i++) {
      const angle = i / 26 * Math.PI * 2;
      const radius = 54 + Math.sin(i * 13.3) * 13;
      const height = 7 + (i * 17 % 18);
      const ridge = new THREE.Mesh(new THREE.ConeGeometry(8 + i % 5, height, 5), new THREE.MeshStandardMaterial({ color: i % 2 ? palette.ground : palette.accent, roughness: 1, flatShading: true }));
      ridge.position.set(Math.cos(angle) * radius, height / 2 - 2, Math.sin(angle) * radius);
      this.group.add(ridge);
    }

    const beacon = new THREE.Group();
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 4, 8), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.65, roughness: 0.3 }));
    mast.position.y = 1;
    const beaconLight = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0x34e7ff }));
    beaconLight.position.y = 3.2;
    beacon.add(mast, beaconLight);
    beacon.position.set(-10, 0, -8);
    this.group.add(beacon);

    this.rover = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 3), new THREE.MeshStandardMaterial({ color: 0x22d3ee, metalness: 0.56, roughness: 0.32 }));
    body.position.y = 1.25;
    this.rover.add(body);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.65, 1.25), new THREE.MeshStandardMaterial({ color: 0x172554, metalness: 0.3, roughness: 0.18 }));
    canopy.position.set(0, 1.95, -0.15);
    this.rover.add(canopy);
    for (const x of [-1.25, 1.25]) for (const z of [-0.95, 0.95]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0x172033, roughness: 0.9 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.62, z);
      this.rover.add(wheel);
    }
    this.rover.position.set(0, 0, 2);
    this.group.add(this.rover);

    const progress = this.getPlanetProgress(planet.name);
    if (progress.city) this.addColonyCity();
    const addNode = (id, label, kind, x, z, color, geometry) => {
      if (progress[id]) return;
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.22, roughness: 0.4, metalness: 0.25 }));
      mesh.position.set(x, geometry.parameters?.height ? geometry.parameters.height * 0.5 : 0.9, z);
      mesh.userData = { id, label, kind };
      this.group.add(mesh);
      this.nodes.push(mesh);
    };
    for (let i = 0; i < 3; i++) addNode(`sample-${i}`, ['Luminous flora', 'Rare crystal', 'Atmosphere capsule'][i], 'sample', 10 + i * 5, -3 - i * 6, palette.resource, new THREE.OctahedronGeometry(1.1 + i * 0.12, 0));
    addNode('probe', 'Missing survey probe', 'probe', -17, 14, 0xffaa5c, new THREE.BoxGeometry(2, 1.4, 1.6));

    // A small abandoned research shelter makes the landing zone feel inhabited.
    const shelter = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 3.2, 3.8, 8), new THREE.MeshStandardMaterial({ color: 0x45566c, metalness: 0.2, roughness: 0.72 }));
    shelter.position.set(18, 1.9, 14);
    this.group.add(shelter);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 8), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.75, roughness: 0.22 }));
    dish.scale.set(1, 0.25, 1);
    dish.position.set(18, 4.4, 14);
    this.group.add(dish);
    if (progress.outpost) this.addOutpost();
    this.group.visible = true;
  }

  land(planet, progress = {}) {
    if (this.active) return false;
    this.planet = planet;
    this.progress[planet.name] = { ...this.getPlanetProgress(planet.name), ...progress };
    this.heldVisibility = this.scene.children.map(child => [child, child.visible]);
    this.heldVisibility.forEach(([child]) => { if (child !== this.camera && child !== this.group) child.visible = false; });
    this.createSurface(planet);
    this.active = true;
    this.elapsed = 0;
    this.scene.background = new THREE.Color(PLANET_SCENES[planet.name]?.sky || 0x154a76);
    this.scene.fog = new THREE.Fog(PLANET_SCENES[planet.name]?.sky || 0x154a76, 55, 210);
    this.onChange?.('landed', this.getStatus());
    return true;
  }

  getStatus() {
    const p = this.planet ? this.getPlanetProgress(this.planet.name) : {};
    return { active: this.active, planet: this.planet?.name, samples: p.samples || 0, scanned: !!p.scanned, probe: !!p.probe, outpost: !!p.outpost, city: !!p.city, cityOwner: p.cityOwner || '', cityOwned: Boolean(p.cityOwner), planetOwner: p.planetOwner || '', planetOwned: Boolean(p.planetOwner), completed: !!p.completed, nearby: this.nearestNode()?.userData.label || '' };
  }

  nearestNode() {
    if (!this.rover) return null;
    return this.nodes.filter(node => node.visible).sort((a, b) => a.position.distanceTo(this.rover.position) - b.position.distanceTo(this.rover.position))[0] || null;
  }

  interact() {
    if (!this.active) return null;
    const node = this.nearestNode();
    if (!node || node.position.distanceTo(this.rover.position) > 5) return { error: 'Drive within 5 m of a highlighted site first.' };
    const data = node.userData;
    node.visible = false;
    const progress = this.getPlanetProgress(this.planet.name);
    progress[data.id] = true;
    if (data.kind === 'sample') progress.samples = Math.min(3, progress.samples + 1);
    if (data.kind === 'probe') progress.probe = true;
    const reward = data.kind === 'probe' ? 450 : 180;
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
    this.onChange?.('scan', { ...this.getStatus(), reward: 300, complete: p.completed });
    return { reward: 300, complete: p.completed };
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
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: 0x69e8ff, transparent: true, opacity: 0.55, metalness: 0.4, roughness: 0.2, side: THREE.DoubleSide }));
    dome.position.y = 0.1;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.4, 0.5, 20), new THREE.MeshStandardMaterial({ color: 0x62748a, metalness: 0.5, roughness: 0.4 }));
    base.position.y = 0.2;
    habitat.add(dome, base);
    habitat.position.set(0, 0, -18);
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
      const height = 3 + ((i * 7) % 9);
      const building = new THREE.Mesh(new THREE.BoxGeometry(2.5 + i % 3, height, 2.5 + (i + 1) % 3), new THREE.MeshStandardMaterial({ color: colors[i % colors.length], emissive: colors[i % colors.length], emissiveIntensity: 0.12, metalness: 0.46, roughness: 0.3 }));
      building.position.set((i % 3 - 1) * 5, height / 2, (Math.floor(i / 3) - 1) * 5);
      city.add(building);
    }
    const hub = new THREE.Mesh(new THREE.SphereGeometry(2.3, 16, 12), new THREE.MeshBasicMaterial({ color: 0x67e8f9 }));
    hub.position.set(0, 8, 0);
    city.add(hub);
    city.position.set(27, 0, -23);
    this.group.add(city);
  }

  update(dt, keys) {
    if (!this.active) return;
    this.elapsed += dt;
    const rover = this.rover;
    const move = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
    const turn = (keys.a || keys.arrowleft ? 1 : 0) - (keys.d || keys.arrowright ? 1 : 0);
    rover.rotation.y += turn * dt * 1.8;
    if (move) {
      rover.position.x -= Math.sin(rover.rotation.y) * move * dt * 10;
      rover.position.z -= Math.cos(rover.rotation.y) * move * dt * 10;
      rover.position.x = THREE.MathUtils.clamp(rover.position.x, -82, 82);
      rover.position.z = THREE.MathUtils.clamp(rover.position.z, -82, 82);
    }
    this.nodes.forEach((node, index) => { if (node.visible) node.rotation.y += dt * (0.35 + index * 0.08); });
    const target = rover.position.clone().add(new THREE.Vector3(0, 4.5, 9).applyQuaternion(rover.quaternion));
    this.camera.position.lerp(target, Math.min(1, dt * 3.5));
    this.camera.lookAt(rover.position.x, rover.position.y + 1, rover.position.z - 2);
  }

  takeoff() {
    if (!this.active) return false;
    this.active = false;
    this.group.visible = false;
    this.heldVisibility?.forEach(([child, visible]) => { if (child !== this.group) child.visible = visible; });
    this.heldVisibility = null;
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(0x05030a, 0.00008);
    this.onChange?.('takeoff', this.getStatus());
    return true;
  }
}
