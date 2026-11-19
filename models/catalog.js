// Shared 3D Model Library Catalog for GiveGigsGames
// Every model is a self-contained procedural Three.js builder: build(THREE) -> THREE.Group

window.GGG_MODEL_CATALOG = [
  // ========================
  // LAST WORDS ZOMBIES
  // ========================
  {
    id: 'lwz-zombie-walker',
    name: 'Low-Poly Zombie (Walker)',
    game: 'Last Words Zombies',
    category: 'Enemies',
    tags: ['zombie', 'low-poly', 'character', 'undead'],
    description: 'Classic low-poly shambling zombie with faceted icosahedron head, glowing eyes, and ragged torso.',
    build: function createZombieWalker(THREE) {
      const group = new THREE.Group();
      const fleshMat = new THREE.MeshStandardMaterial({ color: 0x3e6648, roughness: 0.78, metalness: 0.04 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: 0x8f4c4c, roughness: 0.82, metalness: 0.08 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2b2b36, roughness: 0.9 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff174d });

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.4, 0.9, 7), shirtMat);
      torso.position.y = 0.55;
      group.add(torso);

      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.31, 1), fleshMat);
      head.position.set(0, 1.25, 0);
      group.add(head);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 6), fleshMat);
      neck.position.set(0, 0.98, 0);
      group.add(neck);

      const eyeGeo = new THREE.SphereGeometry(0.055, 6, 6);
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.11, 1.28, 0.26);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.11, 1.28, 0.26);
      group.add(leftEye, rightEye);

      const armGeo = new THREE.BoxGeometry(0.16, 0.65, 0.16);
      const leftArm = new THREE.Mesh(armGeo, fleshMat);
      leftArm.position.set(-0.44, 0.72, 0.22);
      leftArm.rotation.x = -Math.PI / 2.6;
      const rightArm = new THREE.Mesh(armGeo, fleshMat);
      rightArm.position.set(0.44, 0.72, 0.22);
      rightArm.rotation.x = -Math.PI / 2.6;
      group.add(leftArm, rightArm);

      const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
      const leftLeg = new THREE.Mesh(legGeo, pantsMat);
      leftLeg.position.set(-0.16, -0.15, 0);
      const rightLeg = new THREE.Mesh(legGeo, pantsMat);
      rightLeg.position.set(0.16, -0.15, 0);
      group.add(leftLeg, rightLeg);

      return group;
    }
  },
  {
    id: 'lwz-zombie-brute',
    name: 'Zombie Brute',
    game: 'Last Words Zombies',
    category: 'Enemies',
    tags: ['zombie', 'brute', 'boss', 'low-poly'],
    description: 'Heavy armored zombie archetype with broad shoulders, purple glowing eyes, and reinforced plates.',
    build: function createZombieBrute(THREE) {
      const group = new THREE.Group();
      const fleshMat = new THREE.MeshStandardMaterial({ color: 0x2f4d36, roughness: 0.8 });
      const armorMat = new THREE.MeshStandardMaterial({ color: 0x3d3d4a, roughness: 0.5, metalness: 0.45 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xbb00ff });

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 1.15, 7), armorMat);
      torso.position.y = 0.75;
      group.add(torso);

      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 1), fleshMat);
      head.position.set(0, 1.55, 0.05);
      group.add(head);

      const eyeGeo = new THREE.SphereGeometry(0.065, 6, 6);
      const le = new THREE.Mesh(eyeGeo, eyeMat);
      le.position.set(-0.13, 1.58, 0.32);
      const re = new THREE.Mesh(eyeGeo, eyeMat);
      re.position.set(0.13, 1.58, 0.32);
      group.add(le, re);

      const pauldronGeo = new THREE.BoxGeometry(0.36, 0.32, 0.38);
      const lp = new THREE.Mesh(pauldronGeo, armorMat);
      lp.position.set(-0.62, 1.15, 0);
      const rp = new THREE.Mesh(pauldronGeo, armorMat);
      rp.position.set(0.62, 1.15, 0);
      group.add(lp, rp);

      const armGeo = new THREE.BoxGeometry(0.24, 0.8, 0.24);
      const la = new THREE.Mesh(armGeo, fleshMat);
      la.position.set(-0.64, 0.65, 0.2);
      la.rotation.x = -0.5;
      const ra = new THREE.Mesh(armGeo, fleshMat);
      ra.position.set(0.64, 0.65, 0.2);
      ra.rotation.x = -0.5;
      group.add(la, ra);

      return group;
    }
  },

  // ========================
  // GRAVEGAIN 3D
  // ========================
  {
    id: 'gg3d-flaming-skull',
    name: 'Flaming Skull Drone',
    game: 'GraveGain 3D',
    category: 'Enemies',
    tags: ['skull', 'drone', 'dungeon', 'enemy'],
    description: 'Flying skull entity with articulated jaw, glowing eyes, and top rotor array.',
    build: function createFlamingSkull(THREE) {
      const group = new THREE.Group();
      const boneMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 });
      const trimMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.5 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });

      const skull = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), boneMat);
      skull.position.y = 0.4;
      group.add(skull);

      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.6), boneMat);
      jaw.position.set(0, -0.45, 0.1);
      skull.add(jaw);

      const le = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
      le.position.set(-0.2, 0.1, 0.42);
      const re = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
      re.position.set(0.2, 0.1, 0.42);
      skull.add(le, re);

      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), trimMat);
      mast.position.y = 0.55;
      skull.add(mast);

      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 12), trimMat);
      rotor.position.y = 0.75;
      skull.add(rotor);

      return group;
    }
  },
  {
    id: 'gg3d-warrior-sword-shield',
    name: 'Steel Longsword & Shield',
    game: 'GraveGain 3D',
    category: 'Weapons',
    tags: ['sword', 'shield', 'warrior', 'weapon'],
    description: 'Warrior loadout featuring a gold-guarded steel longsword and crimson-trimmed shield.',
    build: function createWarriorLoadout(THREE) {
      const group = new THREE.Group();

      const swordGroup = new THREE.Group();
      const hilt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.07, 0.45, 8),
        new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.8 })
      );
      hilt.position.y = -0.25;
      swordGroup.add(hilt);

      const guard = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.1, 0.15),
        new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 })
      );
      swordGroup.add(guard);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.5, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 })
      );
      blade.position.y = 0.78;
      swordGroup.add(blade);
      swordGroup.position.set(0.45, 0, 0);
      swordGroup.rotation.z = -0.2;
      group.add(swordGroup);

      const shieldGroup = new THREE.Group();
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.95, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x801020, metalness: 0.4, roughness: 0.5 })
      );
      const rim = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 1.02, 0.05),
        new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 })
      );
      rim.position.z = -0.02;
      shieldGroup.add(plate, rim);
      shieldGroup.position.set(-0.45, 0, 0.1);
      shieldGroup.rotation.y = 0.35;
      group.add(shieldGroup);

      return group;
    }
  },
  {
    id: 'gg3d-astral-staff',
    name: 'Astral Mage Staff',
    game: 'GraveGain 3D',
    category: 'Weapons',
    tags: ['staff', 'mage', 'magic', 'crystal'],
    description: 'Arcane staff topped with a glowing violet octahedron crystal.',
    build: function createAstralStaff(THREE) {
      const group = new THREE.Group();
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.06, 2.1, 8),
        new THREE.MeshStandardMaterial({ color: 0x2d1a38, roughness: 0.7 })
      );
      group.add(shaft);

      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.22, 0),
        new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x7e22ce, emissiveIntensity: 0.9, roughness: 0.1 })
      );
      gem.position.y = 1.22;
      group.add(gem);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.03, 8, 20),
        new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.2 })
      );
      ring.position.y = 1.22;
      ring.rotation.x = Math.PI / 3;
      group.add(ring);

      return group;
    }
  },
  {
    id: 'gg3d-spiked-warhammer',
    name: 'Spiked Warhammer',
    game: 'GraveGain 3D',
    category: 'Weapons',
    tags: ['hammer', 'tank', 'weapon', 'melee'],
    description: 'Heavy tank warhammer with metallic block head and reinforced grip.',
    build: function createWarhammer(THREE) {
      const group = new THREE.Group();
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.08, 1.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 })
      );
      group.add(handle);

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.55, 0.95),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 })
      );
      head.position.y = 0.75;
      group.add(head);

      const spikeGeo = new THREE.ConeGeometry(0.14, 0.35, 6);
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
      const frontSpike = new THREE.Mesh(spikeGeo, spikeMat);
      frontSpike.rotation.x = Math.PI / 2;
      frontSpike.position.set(0, 0.75, 0.62);
      const backSpike = new THREE.Mesh(spikeGeo, spikeMat);
      backSpike.rotation.x = -Math.PI / 2;
      backSpike.position.set(0, 0.75, -0.62);
      group.add(frontSpike, backSpike);

      return group;
    }
  },

  // ========================
  // SPACESHIPS
  // ========================
  {
    id: 'ship-interceptor',
    name: 'Interceptor Starfighter',
    game: 'Spaceships',
    category: 'Spaceships',
    tags: ['ship', 'fighter', 'sci-fi', 'space'],
    description: 'Agile delta-wing starfighter with cockpit canopy, laser cannons, and twin ion thrusters.',
    build: function createInterceptorShip(THREE) {
      const group = new THREE.Group();
      const hullMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.7, roughness: 0.28 });
      const accentMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.5, roughness: 0.35 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0369a1, emissiveIntensity: 0.4, roughness: 0.1, metalness: 0.9 });
      const glowMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });

      const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.32, 2.2, 6), hullMat);
      fuselage.rotation.x = Math.PI / 2;
      group.add(fuselage);

      const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), glassMat);
      canopy.scale.set(0.8, 0.65, 1.7);
      canopy.position.set(0, 0.18, 0.1);
      group.add(canopy);

      const wingGeo = new THREE.BoxGeometry(2.2, 0.06, 0.75);
      const wings = new THREE.Mesh(wingGeo, accentMat);
      wings.position.set(0, -0.04, -0.35);
      group.add(wings);

      const thrusterGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.45, 10);
      [-0.32, 0.32].forEach(x => {
        const pod = new THREE.Mesh(thrusterGeo, hullMat);
        pod.rotation.x = Math.PI / 2;
        pod.position.set(x, 0, -0.95);
        group.add(pod);

        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), glowMat);
        flame.position.set(x, 0, -1.2);
        group.add(flame);
      });

      return group;
    }
  },
  {
    id: 'ship-heavy-cruiser',
    name: 'Heavy Dreadnought Cruiser',
    game: 'Spaceships',
    category: 'Spaceships',
    tags: ['cruiser', 'capital-ship', 'sci-fi', 'space'],
    description: 'Capital warship with layered armor hull, command bridge tower, and quad engine array.',
    build: function createHeavyCruiser(THREE) {
      const group = new THREE.Group();
      const hullMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.75, roughness: 0.35 });
      const trimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.3 });
      const glowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

      const mainHull = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.48, 2.5), hullMat);
      group.add(mainHull);

      const bow = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 4), hullMat);
      bow.rotation.x = Math.PI / 2;
      bow.rotation.z = Math.PI / 4;
      bow.position.z = 1.65;
      group.add(bow);

      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.55), hullMat);
      bridge.position.set(0, 0.4, -0.45);
      group.add(bridge);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 1.8), trimMat);
      stripe.position.set(0, 0.05, 0.1);
      group.add(stripe);

      [[-0.3, -0.15], [0.3, -0.15], [-0.3, 0.15], [0.3, 0.15]].forEach(([x, y]) => {
        const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.3, 8), glowMat);
        eng.rotation.x = Math.PI / 2;
        eng.position.set(x, y, -1.35);
        group.add(eng);
      });

      return group;
    }
  },
  {
    id: 'ship-asteroid',
    name: 'Procedural Asteroid',
    game: 'Spaceships',
    category: 'Worlds',
    tags: ['asteroid', 'rock', 'space', 'procedural'],
    description: 'Displaced icosahedron asteroid with craggy facets for spacefields.',
    build: function createAsteroid(THREE) {
      const group = new THREE.Group();
      const geo = new THREE.IcosahedronGeometry(0.95, 1);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        const n = 0.82 + 0.28 * Math.sin(vx * 3.1 + vy * 2.7 + vz * 1.9);
        pos.setXYZ(i, vx * n, vy * n, vz * n);
      }
      geo.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.92, metalness: 0.08, flatShading: true });
      group.add(new THREE.Mesh(geo, mat));
      return group;
    }
  },

  // ========================
  // GRAVEGAIN 4D
  // ========================
  {
    id: 'gg4d-tesseract',
    name: '4D Hypercube (Tesseract)',
    game: 'GraveGain 4D',
    category: '4D & Abstract',
    tags: ['4d', 'tesseract', 'hypercube', 'wireframe'],
    description: 'Nested 3D projection of a 4D hypercube with glowing inner core.',
    build: function createTesseract(THREE) {
      const group = new THREE.Group();
      const outerGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5, 1.5, 1.5));
      const innerGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.75, 0.75, 0.75));
      const lineMat = new THREE.LineBasicMaterial({ color: 0x22d3ee });
      const innerMat = new THREE.LineBasicMaterial({ color: 0xa855f7 });

      group.add(new THREE.LineSegments(outerGeo, lineMat));
      group.add(new THREE.LineSegments(innerGeo, innerMat));

      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.24, 0),
        new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xdb2777, emissiveIntensity: 0.8 })
      );
      group.add(core);

      return group;
    }
  },

  // ========================
  // ORBITAL DRIFT
  // ========================
  {
    id: 'od-racer-craft',
    name: 'Orbital Drift Craft',
    game: 'Orbital Drift',
    category: 'Spaceships',
    tags: ['racer', 'drift', 'ship', 'arcade'],
    description: 'Sleek neon-trimmed orbital racer built for high-speed drift tracks.',
    build: function createOrbitalRacer(THREE) {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.25 });
      const neonMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

      const body = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.0, 4), bodyMat);
      body.rotation.x = Math.PI / 2;
      body.scale.set(1.3, 1, 0.5);
      group.add(body);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.25), neonMat);
      trim.position.set(0, 0, -0.55);
      group.add(trim);

      return group;
    }
  },

  // ========================
  // AI WHACK-A-MOLE
  // ========================
  {
    id: 'awm-cyber-mole',
    name: 'Cyber Mole Bot',
    game: 'AI Whack-A-Mole',
    category: 'Characters',
    tags: ['bot', 'mole', 'arcade', 'character'],
    description: 'Pop-up cybernetic mole pod with glowing visor and antenna.',
    build: function createCyberMole(THREE) {
      const group = new THREE.Group();
      const podMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 });
      const headMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.3, roughness: 0.3 });
      const visorMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.25, 16), podMat);
      base.position.y = -0.6;
      group.add(base);

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.85, 12), headMat);
      body.position.y = -0.05;
      group.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), headMat);
      head.position.y = 0.38;
      group.add(head);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.25), visorMat);
      visor.position.set(0, 0.42, 0.3);
      group.add(visor);

      return group;
    }
  },

  // ========================
  // MADI GAMES
  // ========================
  {
    id: 'madi-revenue-dragon',
    name: 'Revenue Dragon',
    game: 'The Revenue Dragon',
    category: 'Enemies',
    tags: ['dragon', 'boss', 'wings', 'fantasy'],
    description: 'Low-poly winged dragon with horned head, glowing eyes, and spread wings.',
    build: function createRevenueDragon(THREE) {
      const group = new THREE.Group();
      const scaleMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.55, metalness: 0.2 });
      const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.6 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 1.3), scaleMat);
      group.add(body);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.55), scaleMat);
      head.position.set(0, 0.35, 0.85);
      group.add(head);

      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
      eyeL.position.set(-0.15, 0.42, 1.12);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
      eyeR.position.set(0.15, 0.42, 1.12);
      group.add(eyeL, eyeR);

      const wingGeo = new THREE.BoxGeometry(1.2, 0.05, 0.65);
      const wingL = new THREE.Mesh(wingGeo, bellyMat);
      wingL.position.set(-0.9, 0.3, 0);
      wingL.rotation.z = 0.28;
      const wingR = new THREE.Mesh(wingGeo, bellyMat);
      wingR.position.set(0.9, 0.3, 0);
      wingR.rotation.z = -0.28;
      group.add(wingL, wingR);

      return group;
    }
  },
  {
    id: 'madi-treasure-chest',
    name: 'Golden Treasure Chest',
    game: 'Treasure Hunters',
    category: 'Worlds',
    tags: ['chest', 'treasure', 'gold', 'prop'],
    description: 'Dungeon treasure chest with wood planks, gold trim, and glowing lock.',
    build: function createTreasureChest(THREE) {
      const group = new THREE.Group();
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.2 });

      const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.65, 0.85), woodMat);
      base.position.y = -0.15;
      group.add(base);

      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.2, 10, 1, false, 0, Math.PI), woodMat);
      lid.rotation.z = Math.PI / 2;
      lid.rotation.y = Math.PI / 2;
      lid.position.y = 0.18;
      group.add(lid);

      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.1), goldMat);
      lock.position.set(0, 0.12, 0.45);
      group.add(lock);

      return group;
    }
  },
  {
    id: 'madi-speed-portal',
    name: 'Speed Portal Gate',
    game: 'The Speed Portal',
    category: 'Worlds',
    tags: ['portal', 'gate', 'sci-fi', 'ring'],
    description: 'Glowing cyan torus portal gate withpedestal base.',
    build: function createSpeedPortal(THREE) {
      const group = new THREE.Group();
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
      const glowMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 0.9 });

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.1, 12, 32), glowMat);
      group.add(ring);

      const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.6), frameMat);
      base.position.y = -0.95;
      group.add(base);

      return group;
    }
  }
];

(function appendGraveGain3DWeapons() {
  const specs = [
    ['katana', 'Katana', 0xe2e8f0, 0x38bdf8, ['katana', 'sword', 'melee', 'weapon']],
    ['greatsword', 'Greatsword', 0x94a3b8, 0xfbbf24, ['greatsword', 'sword', 'melee', 'weapon']],
    ['battleaxe', 'Battleaxe', 0x64748b, 0xef4444, ['axe', 'battleaxe', 'melee', 'weapon']],
    ['scythe', 'Soul Scythe', 0xa855f7, 0xc084fc, ['scythe', 'melee', 'weapon']],
    ['twinblade', 'Twinblade', 0x38bdf8, 0x22d3ee, ['twinblade', 'blade', 'melee', 'weapon']],
    ['warhammer', 'Titan Maul', 0x475569, 0xf97316, ['hammer', 'maul', 'melee', 'weapon']],
    ['dagger', 'Shadow Fang', 0x1e293b, 0xa855f7, ['dagger', 'melee', 'weapon']],
    ['halberd', 'Halberd', 0xcbd5e1, 0x3b82f6, ['halberd', 'polearm', 'melee', 'weapon']],
    ['flail', 'Infernal Mace', 0xf59e0b, 0xf97316, ['mace', 'flail', 'melee', 'weapon']],
    ['wand', 'Arcane Wand', 0xc084fc, 0xa855f7, ['wand', 'ranged', 'magic', 'weapon']],
    ['staff', 'Void Staff', 0x7e22ce, 0xc084fc, ['staff', 'ranged', 'magic', 'weapon']],
    ['railgun', 'Rail-Carbine', 0x06b6d4, 0x22d3ee, ['railgun', 'gun', 'ranged', 'weapon']],
    ['claymore', 'Star Claymore', 0x38bdf8, 0x60a5fa, ['claymore', 'sword', 'melee', 'weapon']],
    ['rapier', 'Duelist Rapier', 0xfef08a, 0xfacc15, ['rapier', 'sword', 'melee', 'weapon']],
    ['spear', 'Valkyrie Spear', 0xfde047, 0xfbbf24, ['spear', 'polearm', 'melee', 'weapon']],
    ['glaive', 'Crescent Glaive', 0x2dd4bf, 0x14b8a6, ['glaive', 'polearm', 'melee', 'weapon']],
    ['crossbow', 'Auto-Crossbow', 0x94a3b8, 0x38bdf8, ['crossbow', 'ranged', 'weapon']],
    ['chakram', 'Solar Chakram', 0xfb923c, 0xf97316, ['chakram', 'ranged', 'weapon']],
    ['trident', 'Abyss Trident', 0x0ea5e9, 0x38bdf8, ['trident', 'polearm', 'melee', 'weapon']],
    ['grimoire', 'Runed Grimoire', 0xc084fc, 0xa855f7, ['grimoire', 'book', 'magic', 'weapon']]
  ];

  for (const [arch, name, tint, glow, tags] of specs) {
    window.GGG_MODEL_CATALOG.push({
      id: `gg3d-wpn-${arch}`,
      name,
      game: 'GraveGain 3D',
      category: 'Weapons',
      tags,
      description: `GraveGain3dA procedural ${name} weapon model.`,
      build: function (THREE) {
        const g = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({ color: tint, metalness: 0.85, roughness: 0.22 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
        const glowMat = new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 0.8, roughness: 0.2 });

        if (arch === 'katana') {
          const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.45, 8), darkMat);
          hilt.position.y = -0.55;
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.04), metalMat);
          blade.position.y = 0.35;
          g.add(hilt, blade);
        } else if (arch === 'greatsword' || arch === 'claymore') {
          const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.5, 8), darkMat);
          hilt.position.y = -0.65;
          const guard = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 0.14), glowMat);
          guard.position.y = -0.35;
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 0.06), metalMat);
          blade.position.y = 0.45;
          g.add(hilt, guard, blade);
        } else if (arch === 'battleaxe') {
          const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.6, 8), darkMat);
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.5, 0.1), metalMat);
          head.position.y = 0.45;
          g.add(haft, head);
        } else if (arch === 'scythe') {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.8, 8), darkMat);
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.18, 0.05), glowMat);
          blade.position.set(0.32, 0.75, 0);
          blade.rotation.z = -0.35;
          g.add(pole, blade);
        } else if (arch === 'twinblade') {
          const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), darkMat);
          const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.04), metalMat);
          b1.position.y = 0.65;
          const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.04), glowMat);
          b2.position.y = -0.65;
          g.add(grip, b1, b2);
        } else if (arch === 'warhammer') {
          const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.5, 8), darkMat);
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.7), metalMat);
          head.position.y = 0.55;
          g.add(handle, head);
        } else if (arch === 'dagger') {
          const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.35, 8), darkMat);
          hilt.position.y = -0.35;
          const blade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9, 4), metalMat);
          blade.position.y = 0.25;
          g.add(hilt, blade);
        } else if (arch === 'halberd' || arch === 'glaive') {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.8, 8), darkMat);
          const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 4), metalMat);
          tip.position.y = 1.05;
          const axe = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.05), glowMat);
          axe.position.set(0.18, 0.7, 0);
          g.add(pole, tip, axe);
        } else if (arch === 'flail') {
          const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.0, 8), darkMat);
          handle.position.y = -0.25;
          const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), glowMat);
          orb.position.y = 0.55;
          g.add(handle, orb);
        } else if (arch === 'wand' || arch === 'staff') {
          const len = arch === 'staff' ? 1.8 : 1.0;
          const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, len, 8), darkMat);
          const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), glowMat);
          gem.position.y = len * 0.5 + 0.15;
          g.add(shaft, gem);
        } else if (arch === 'railgun') {
          const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 1.5), darkMat);
          const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.2, 8), glowMat);
          coil.rotation.x = Math.PI / 2;
          coil.position.y = 0.1;
          g.add(body, coil);
        } else if (arch === 'rapier') {
          const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.35, 8), darkMat);
          hilt.position.y = -0.55;
          const cup = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), glowMat);
          cup.position.y = -0.35;
          const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 1.5, 6), metalMat);
          blade.position.y = 0.4;
          g.add(hilt, cup, blade);
        } else if (arch === 'spear') {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), darkMat);
          const tip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55, 4), glowMat);
          tip.position.y = 1.05;
          g.add(pole, tip);
        } else if (arch === 'crossbow') {
          const stock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 1.2), darkMat);
          const bow = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.12), glowMat);
          bow.position.z = -0.45;
          g.add(stock, bow);
        } else if (arch === 'chakram') {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 8, 20), glowMat);
          const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), metalMat);
          g.add(ring, core);
        } else if (arch === 'trident') {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.7, 8), darkMat);
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.08), glowMat);
          bar.position.y = 0.85;
          const p1 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 4), metalMat);
          p1.position.set(0, 1.1, 0);
          const p2 = p1.clone(); p2.position.set(-0.22, 1.05, 0);
          const p3 = p1.clone(); p3.position.set(0.22, 1.05, 0);
          g.add(pole, bar, p1, p2, p3);
        } else if (arch === 'grimoire') {
          const cover = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.22), darkMat);
          const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), glowMat);
          rune.position.z = 0.15;
          g.add(cover, rune);
        }
        return g;
      }
    });
  }
  // ========================
  // GLOBAL FASHION MODEL LIFE
  // ========================
  window.GGG_MODEL_CATALOG.push({
    id: 'gfml-fashion-model',
    name: 'Fashion Model (Female)',
    game: 'Global Fashion Model Life',
    category: 'Characters',
    tags: ['fashion', 'model', 'female', 'runway', 'character'],
    description: 'Stylized 3D female fashion model in a bias-cut satin evening gown, sculpted waves, and heels.',
    build: function createFashionModel(THREE) {
      const group = new THREE.Group();
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xdba477, roughness: 0.58, metalness: 0.02 });
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x3b2327, roughness: 0.48, metalness: 0.05 });
      const dressMat = new THREE.MeshStandardMaterial({ color: 0xbc718f, roughness: 0.32, metalness: 0.14 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0x221b28, roughness: 0.35, metalness: 0.15 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xe5be7c, roughness: 0.25, metalness: 0.82 });

      // Head & neck
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 24, 20), skinMat);
      head.position.set(0, 1.56, 0);
      head.scale.set(0.92, 1.12, 0.96);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.056, 0.14, 16), skinMat);
      neck.position.set(0, 1.40, 0);

      // Sculpted hair
      const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.148, 24, 20), hairMat);
      hairCap.position.set(0, 1.59, -0.02);
      hairCap.scale.set(1.02, 1.12, 1.06);
      const hairBack = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.36, 18), hairMat);
      hairBack.position.set(0, 1.38, -0.07);
      group.add(head, neck, hairCap, hairBack);

      // Gold drop earrings
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), goldMat);
        ear.position.set(side * 0.13, 1.51, 0);
        ear.scale.set(0.7, 1.4, 0.7);
        group.add(ear);
      }

      // Torso & satin gown
      const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.105, 0.38, 20), dressMat);
      bodice.position.set(0, 1.15, 0);
      bodice.scale.set(1.15, 1, 0.78);
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.24, 0.82, 24), dressMat);
      skirt.position.set(0, 0.56, 0);
      skirt.scale.set(1.12, 1, 0.86);
      group.add(bodice, skirt);

      // Arms
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.028, 0.56, 14), skinMat);
        arm.position.set(side * 0.21, 1.05, 0);
        arm.rotation.z = side * 0.12;
        group.add(arm);
      }

      // Legs & heels
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.034, 0.42, 14), skinMat);
        leg.position.set(side * 0.08, 0.22, 0);
        const heel = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.05, 0.15), shoeMat);
        heel.position.set(side * 0.08, 0.025, 0.03);
        group.add(leg, heel);
      }

      return group;
    }
  });
})();
