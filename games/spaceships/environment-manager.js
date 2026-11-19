// Solar system environment manager: Sun, Corona, 6 Planets + Moons, 3 Space Stations, Mineable Asteroid Belts, Derelict Wrecks, Comets, and Ambient Dust
import { makePlanetTexture, addAtmosphere, createStarCorona } from './celestial-effects.js';
import { ShipBuilder } from './ship-builder.js';

const THREE = window.THREE;
export const ONE_AU = 500;
export const SYSTEM_EDGE = 5600;

export class EnvironmentManager {
  constructor(scene) {
    this.scene = scene;
    this.sun = null;
    this.sunLight = null;
    this.sunCorona = null;
    this.sunGlowShells = [];
    this.planets = [];
    this.stations = [];
    this.asteroids = [];
    this.wrecks = [];
    this.comets = [];
    this.starLayers = [];
    this.nebulae = [];
    this.dust = null;
    this.elapsed = 0;
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

    // 2. Sunlight (covers full 5600-unit expanded system)
    this.sunLight = new THREE.PointLight(0xfff5e6, 3.4, 15000, 0.35);
    this.sunLight.position.set(0, 0, 0);
    this.scene.add(this.sunLight);

    // 3. Multi-layer Parallax Starfield
    const starCounts = [2200, 1600, 1200];
    const starRadii = [4800, 7200, 9600];
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
      this.starLayers.push(points);
    });

    // 3b. Vibrant Nebula Planes
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
      { color1: 'rgba(139, 92, 246, 0.70)', color2: 'rgba(6, 182, 212, 0.20)', pos: new THREE.Vector3(-2800, -700, -4200), size: 6200 },
      { color1: 'rgba(16, 185, 129, 0.60)', color2: 'rgba(139, 92, 246, 0.15)', pos: new THREE.Vector3(3400, 900, -3400), size: 6600 },
      { color1: 'rgba(6, 182, 212, 0.65)', color2: 'rgba(236, 72, 153, 0.25)', pos: new THREE.Vector3(0, -1100, -4800), size: 7000 },
      { color1: 'rgba(244, 63, 94, 0.60)', color2: 'rgba(139, 92, 246, 0.20)', pos: new THREE.Vector3(-3600, 1000, 3200), size: 6400 },
      { color1: 'rgba(14, 165, 233, 0.65)', color2: 'rgba(16, 185, 129, 0.20)', pos: new THREE.Vector3(3800, -800, 3600), size: 6800 }
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
      this.nebulae.push(mesh);
    });

    // 4. Expanded 6-World Solar System
    const planetTypes = [
      {
        name: 'Ember',
        landingLabel: 'Ember',
        biome: 'Volcanic Rift',
        threat: 'Moderate',
        dist: 1050,
        radius: 65,
        speed: 0.011,
        angle: 0.25,
        color: 0xe66946,
        atmosphere: 0xff9c53,
        colors: ['#4d1535', '#e36d40', '#f9b36a', '#8f3650'],
        moons: 2,
        roughness: 0.8
      },
      {
        name: 'Azure',
        landingLabel: 'Azure',
        biome: 'Oceanic Archipelago',
        threat: 'Low',
        dist: 1750,
        radius: 98,
        speed: 0.0075,
        angle: 0.65,
        color: 0x28bad7,
        atmosphere: 0x39d9ff,
        colors: ['#12325e', '#187da2', '#66d9ca', '#253975'],
        moons: 3,
        roughness: 0.5
      },
      {
        name: 'Viridian',
        landingLabel: 'Viridian',
        biome: 'Bioluminescent Jungle',
        threat: 'Low',
        dist: 2500,
        radius: 125,
        speed: 0.0052,
        angle: 2.1,
        color: 0x36cba2,
        atmosphere: 0x83f8c5,
        colors: ['#192e50', '#177d77', '#7ac978', '#3c6288'],
        moons: 4,
        roughness: 0.62,
        rings: true,
        ringColor: 0x10b981
      },
      {
        name: 'Cryo',
        landingLabel: 'Cryo',
        biome: 'Glacial Expanse',
        threat: 'Elevated',
        dist: 3300,
        radius: 88,
        speed: 0.0040,
        angle: 3.7,
        color: 0x93c5fd,
        atmosphere: 0xdbeafe,
        colors: ['#1e3a8a', '#60a5fa', '#e0f2fe', '#38bdf8'],
        moons: 2,
        roughness: 0.35
      },
      {
        name: 'Obsidian',
        landingLabel: 'Obsidian',
        biome: 'Basalt Caldera',
        threat: 'High',
        dist: 4050,
        radius: 76,
        speed: 0.0032,
        angle: 5.1,
        color: 0x9f1239,
        atmosphere: 0xfb7185,
        colors: ['#0f172a', '#292524', '#b91c1c', '#18181b'],
        moons: 1,
        roughness: 0.92
      },
      {
        name: 'Aurelia',
        landingLabel: 'Aurelia-IV Moon',
        biome: 'Aurelia-IV Crystal Moon',
        threat: 'High',
        dist: 4850,
        radius: 165,
        speed: 0.0022,
        angle: 1.35,
        color: 0xfbbf24,
        atmosphere: 0xfde68a,
        colors: ['#78350f', '#d97706', '#fde68a', '#b45309'],
        moons: 5,
        roughness: 0.52,
        rings: true,
        ringColor: 0xfbbf24,
        dualRings: true
      }
    ];

    planetTypes.forEach((t, idx) => {
      const geom = new THREE.SphereGeometry(t.radius, 48, 32);
      const mat = new THREE.MeshStandardMaterial({
        map: makePlanetTexture(t.colors, 142 + idx * 71),
        color: 0xffffff,
        roughness: t.roughness,
        metalness: 0.04,
        flatShading: false
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(t.dist * Math.cos(t.angle), 0, t.dist * Math.sin(t.angle));
      this.scene.add(mesh);
      addAtmosphere(mesh, t.radius, t.atmosphere);

      if (t.rings) {
        const ringGeom = new THREE.RingGeometry(t.radius * 1.32, t.radius * 2.02, 64);
        const ringMat = new THREE.MeshStandardMaterial({
          color: t.ringColor || 0x10b981,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.42
        });
        const ringsMesh = new THREE.Mesh(ringGeom, ringMat);
        ringsMesh.rotation.x = Math.PI / 2 - 0.14;
        mesh.add(ringsMesh);

        if (t.dualRings) {
          const outerRing = new THREE.Mesh(
            new THREE.RingGeometry(t.radius * 2.15, t.radius * 2.55, 64),
            new THREE.MeshStandardMaterial({
              color: 0xfde68a,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.25
            })
          );
          outerRing.rotation.x = Math.PI / 2 - 0.14;
          mesh.add(outerRing);
        }
      }

      const moons = Array.from({ length: t.moons }, (_, moonIndex) => {
        const isAureliaMoon = t.name === 'Aurelia' && moonIndex === 3;
        const mRadius = isAureliaMoon ? 28 : 11 + Math.random() * 14;
        const mGeom = new THREE.SphereGeometry(mRadius, 20, 16);
        const mColor = isAureliaMoon ? 0x67e8f9 : [0xc0d9ee, 0xe1bca4, 0x8dc4ba, 0xae9ddc][moonIndex % 4];
        const mMat = new THREE.MeshStandardMaterial({
          color: mColor,
          roughness: isAureliaMoon ? 0.5 : 0.9,
          emissive: isAureliaMoon ? 0x0e7490 : 0x000000,
          emissiveIntensity: isAureliaMoon ? 0.25 : 0
        });
        const mMesh = new THREE.Mesh(mGeom, mMat);
        const mDist = t.radius * 1.85 + moonIndex * 64 + (t.dualRings ? 85 : 0);
        const mAngle = (moonIndex / t.moons) * Math.PI * 2;
        mMesh.position.set(mesh.position.x + mDist * Math.cos(mAngle), 0, mesh.position.z + mDist * Math.sin(mAngle));
        this.scene.add(mMesh);
        return {
          name: isAureliaMoon ? 'Aurelia-IV' : `${t.name} Moon ${moonIndex + 1}`,
          mesh: mMesh,
          dist: mDist,
          radius: mRadius,
          speed: (0.08 + 0.025 * moonIndex) / Math.sqrt(t.radius / 15),
          angle: mAngle
        };
      });

      const landingMoon = moons.find(moon => moon.name === 'Aurelia-IV');
      const landingBody = landingMoon
        ? { ...t, mesh: landingMoon.mesh, radius: landingMoon.radius, color: 0x67e8f9 }
        : null;
      this.planets.push({ ...t, mesh, moons, landingBody });
    });

    // 4b. 3 Themed Orbiting Space Stations
    const stationConfigs = [
      {
        id: 'station-alpha',
        name: 'Starfleet Outpost Alpha',
        theme: 'outpost',
        specialty: 'starfleet',
        orePriceMult: 1.0,
        parentPlanetName: 'Azure',
        orbitOffset: 235,
        orbitSpeed: 0.045,
        orbitAngle: 0.9,
        collisionRadius: 42,
        dockingRadius: 105,
        desc: 'Starfleet sector headquarters offering full hull repairs, squadron resupply, and fleet shipyard.'
      },
      {
        id: 'station-refinery',
        name: 'Vulcan Mining Refinery',
        theme: 'refinery',
        specialty: 'mining',
        orePriceMult: 1.35,
        parentPlanetName: null,
        orbitDist: 1400,
        orbitSpeed: 0.0086,
        orbitAngle: 0.42,
        collisionRadius: 42,
        dockingRadius: 105,
        desc: 'Belt ore refinery paying +35% bonus on raw asteroid ore and stocking high-yield mining gear.'
      },
      {
        id: 'station-citadel',
        name: 'Aurelia Trade Citadel',
        theme: 'citadel',
        specialty: 'trade',
        orePriceMult: 1.15,
        parentPlanetName: 'Viridian',
        orbitOffset: 285,
        orbitSpeed: 0.032,
        orbitAngle: 2.3,
        collisionRadius: 42,
        dockingRadius: 105,
        desc: 'High-orbit commercial citadel offering executive capital ships, luxury contracts, and +15% ore rates.'
      }
    ];

    stationConfigs.forEach((cfg, idx) => {
      const mesh = ShipBuilder.buildStation(101 + idx * 37, cfg.theme);
      this.scene.add(mesh);
      const station = { ...cfg, mesh };
      this.updateStationPosition(station);
      this.stations.push(station);
    });

    // 5. Asteroid Belts (85 total: 35 glowing mineable ore asteroids)
    for (let i = 0; i < 85; i++) {
      const inOuterBelt = i >= 45;
      const dist = inOuterBelt ? (3500 + Math.random() * 1050) : (1240 + Math.random() * 380);
      const angle = Math.random() * Math.PI * 2;
      const radius = 3.2 + Math.random() * 5.8;
      const isMineable = i < 35;

      const group = new THREE.Group();
      const baseGeom = new THREE.DodecahedronGeometry(radius, 1);
      const baseMat = new THREE.MeshStandardMaterial({
        color: isMineable ? 0x334155 : 0x293d55,
        roughness: 0.88,
        metalness: isMineable ? 0.35 : 0.2,
        flatShading: true
      });
      const rockMesh = new THREE.Mesh(baseGeom, baseMat);
      group.add(rockMesh);

      if (isMineable) {
        const oreColor = inOuterBelt ? 0x38bdf8 : 0xfbbf24;
        const oreMat = new THREE.MeshStandardMaterial({
          color: oreColor,
          emissive: oreColor,
          emissiveIntensity: 0.55,
          roughness: 0.25,
          metalness: 0.6,
          flatShading: true
        });
        for (let c = 0; c < 3; c++) {
          const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(radius * 0.42, 0), oreMat);
          const ca = (c / 3) * Math.PI * 2;
          crystal.position.set(Math.cos(ca) * radius * 0.72, (c - 1) * radius * 0.35, Math.sin(ca) * radius * 0.72);
          crystal.rotation.set(c, ca, c * 0.7);
          group.add(crystal);
        }
      }

      const yOffset = (Math.random() - 0.5) * 90;
      group.position.set(dist * Math.cos(angle), yOffset, dist * Math.sin(angle));
      this.scene.add(group);

      this.asteroids.push({
        id: `ast_${i}`,
        mesh: group,
        radius,
        orbitRadius: dist,
        orbitAngle: angle,
        yOffset,
        orbitSpeed: 0.016 * Math.pow(400 / dist, 1.45),
        rotationSpeed: new THREE.Vector3(Math.random() * 0.014, Math.random() * 0.014, Math.random() * 0.014),
        isMineable,
        active: true,
        respawnTimer: 0,
        hp: isMineable ? 90 : 9999,
        maxHp: isMineable ? 90 : 9999,
        oreValue: isMineable ? (3 + Math.floor(Math.random() * 4)) : 0
      });
    }

    // 5b. 4 Drifting Derelict Salvage Wrecks
    const wreckSpecs = [
      { name: 'ICS Wayfarer Derelict', dist: 1550, angle: 0.9, salvageValue: 650 },
      { name: 'Valkyrie Wreckage', dist: 2250, angle: 2.8, salvageValue: 950 },
      { name: 'Cryo Freighter Hulk', dist: 3150, angle: 4.1, salvageValue: 1350 },
      { name: 'Aurelia Research Frigate', dist: 4350, angle: 1.7, salvageValue: 1800 }
    ];
    wreckSpecs.forEach((spec, idx) => {
      const wreckGroup = new THREE.Group();
      const hullMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.55, flatShading: true });
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.9 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(8, 3.6, 20), hullMat);
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(10, 0.8, 5), hullMat);
      wingL.position.set(-6, 0.5, 2);
      wingL.rotation.z = 0.25;
      const wingR = new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 4), hullMat);
      wingR.position.set(5.5, -0.8, -3);
      wingR.rotation.z = -0.35;
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), beaconMat);
      beacon.position.set(0, 3.2, -4);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(13, 0.35, 8, 28),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.55 })
      );
      ring.rotation.x = Math.PI / 2;

      wreckGroup.add(body, wingL, wingR, beacon, ring);
      wreckGroup.position.set(
        spec.dist * Math.cos(spec.angle),
        (idx % 2 === 0 ? 1 : -1) * (18 + idx * 8),
        spec.dist * Math.sin(spec.angle)
      );
      this.scene.add(wreckGroup);
      this.wrecks.push({
        id: `wreck_${idx}`,
        name: spec.name,
        mesh: wreckGroup,
        ring,
        beacon,
        salvaged: false,
        salvageValue: spec.salvageValue,
        radius: 36
      });
    });

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
      const tail = new THREE.Line(
        tailGeometry,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending })
      );
      this.scene.add(head, tail);
      this.comets.push({
        head,
        tail,
        angle: (i * Math.PI) / 2,
        radius: 1450 + i * 850,
        speed: 0.008 + i * 0.0022,
        history: []
      });
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
    const dustMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0.4 });
    this.dust = new THREE.Points(dustGeom, dustMat);
    this.scene.add(this.dust);
  }

  updateStationPosition(station) {
    if (station.parentPlanetName) {
      const parent = this.planets.find(p => p.name === station.parentPlanetName);
      if (parent) {
        station.mesh.position.set(
          parent.mesh.position.x + station.orbitOffset * Math.cos(station.orbitAngle),
          22,
          parent.mesh.position.z + station.orbitOffset * Math.sin(station.orbitAngle)
        );
        return;
      }
    }
    station.mesh.position.set(
      station.orbitDist * Math.cos(station.orbitAngle),
      14,
      station.orbitDist * Math.sin(station.orbitAngle)
    );
  }

  respawnAsteroid(ast) {
    ast.hp = ast.maxHp;
    ast.active = true;
    ast.respawnTimer = 0;
    ast.orbitAngle = Math.random() * Math.PI * 2;
    ast.mesh.position.set(
      ast.orbitRadius * Math.cos(ast.orbitAngle),
      ast.yOffset,
      ast.orbitRadius * Math.sin(ast.orbitAngle)
    );
    ast.mesh.visible = true;
  }

  update(dt) {
    this.elapsed += dt;

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

    // 1b. Update orbiting Space Stations & rotating habitat rings
    this.stations.forEach((station, idx) => {
      station.orbitAngle += station.orbitSpeed * dt;
      this.updateStationPosition(station);
      station.mesh.rotation.y += 0.04 * dt;
      if (station.mesh.userData.rotatingModules) {
        for (const mod of station.mesh.userData.rotatingModules) {
          mod.rotation.z += (mod.userData.rotateSpeed || 0.2) * dt;
        }
      }
      if (station.mesh.userData.dockingRing) {
        const pulse = 0.92 + Math.sin(this.elapsed * 3.5 + idx) * 0.08;
        station.mesh.userData.dockingRing.scale.setScalar(pulse);
      }
      if (station.mesh.userData.blinkers) {
        const blinkOn = Math.sin(this.elapsed * 5 + idx) > 0;
        station.mesh.userData.blinkers.forEach(b => { b.visible = blinkOn; });
      }
    });

    // 2. Rotate & respawn Asteroids
    this.asteroids.forEach(a => {
      if (!a.active) {
        a.respawnTimer -= dt;
        if (a.respawnTimer <= 0) this.respawnAsteroid(a);
        return;
      }
      a.orbitAngle += a.orbitSpeed * dt;
      a.mesh.position.x = a.orbitRadius * Math.cos(a.orbitAngle);
      a.mesh.position.z = a.orbitRadius * Math.sin(a.orbitAngle);
      a.mesh.rotation.x += a.rotationSpeed.x;
      a.mesh.rotation.y += a.rotationSpeed.y;
      a.mesh.rotation.z += a.rotationSpeed.z;
    });

    // 2b. Tumble derelict wrecks & pulse salvage beacons
    this.wrecks.forEach((w, idx) => {
      w.mesh.rotation.y += 0.14 * dt;
      w.mesh.rotation.x += 0.05 * dt;
      if (!w.salvaged && w.ring) {
        w.ring.material.opacity = 0.35 + Math.sin(this.elapsed * 4 + idx) * 0.25;
      }
      if (w.beacon) {
        w.beacon.visible = !w.salvaged && Math.sin(this.elapsed * 6 + idx) > -0.3;
      }
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
    this.stations.forEach(st => this.scene.remove(st.mesh));
    this.asteroids.forEach(ast => this.scene.remove(ast.mesh));
    this.wrecks.forEach(w => this.scene.remove(w.mesh));
    this.comets.forEach(comet => {
      this.scene.remove(comet.head);
      this.scene.remove(comet.tail);
    });
    this.starLayers.forEach(s => this.scene.remove(s));
    this.nebulae.forEach(n => this.scene.remove(n));
    if (this.dust) this.scene.remove(this.dust);
    if (this.sun) this.scene.remove(this.sun);
    if (this.sunLight) this.scene.remove(this.sunLight);
    this.sunGlowShells.forEach(s => this.scene.remove(s));
    this.planets = [];
    this.stations = [];
    this.asteroids = [];
    this.wrecks = [];
    this.comets = [];
    this.starLayers = [];
    this.nebulae = [];
    this.sunGlowShells = [];
  }
}
