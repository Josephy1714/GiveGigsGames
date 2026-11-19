// GraveGain 3D & 2D Detailed Enemy & Boss Models (10 Iconic Enemies)
// Requires /models/gravegain-kit.js (window.GGG_GRAVEGAIN_KIT)
// Every model uses outer `root` + inner `rig` and supports 6 animations: idle, move, attack, special, hurt, death.

(function () {
  'use strict';

  const K = window.GGG_GRAVEGAIN_KIT;
  if (!K) return;

  // Shared skeletal ribcage + spine helper (adds ~16 detailed meshes)
  function addRibcage(THREE, torso, boneMat, darkMat, coreMat, scale) {
    const sc = scale || 1;
    // Spine vertebrae column
    for (let v = 0; v < 6; v++) {
      K.add(THREE, torso, new THREE.CylinderGeometry(0.045 * sc, 0.05 * sc, 0.055 * sc, 7), boneMat, [0, (-0.16 + v * 0.075) * sc, -0.06 * sc]);
      K.add(THREE, torso, new THREE.BoxGeometry(0.03 * sc, 0.03 * sc, 0.05 * sc), darkMat, [0, (-0.16 + v * 0.075) * sc, -0.11 * sc]);
    }
    // Sternum + 4 pairs of curved ribs
    K.add(THREE, torso, new THREE.BoxGeometry(0.055 * sc, 0.34 * sc, 0.04 * sc), boneMat, [0, 0.05 * sc, 0.14 * sc]);
    for (let r = 0; r < 4; r++) {
      const ry = (-0.06 + r * 0.08) * sc;
      const rw = (0.14 + (r === 2 ? 0.03 : r * 0.01)) * sc;
      [-1, 1].forEach(s => {
        const rib = K.tube(THREE, [
          [0, ry, -0.05 * sc],
          [s * rw, ry + 0.02 * sc, 0.04 * sc],
          [s * 0.03 * sc, ry - 0.01 * sc, 0.14 * sc]
        ], 0.018 * sc, 8, 5, boneMat);
        torso.add(rib);
      });
    }
    if (coreMat) {
      K.add(THREE, torso, new THREE.OctahedronGeometry(0.08 * sc, 0), coreMat, [0, 0.05 * sc, 0.02 * sc]);
    }
  }

  // Shared bony arm/leg helper
  function addBoneLimbs(THREE, rig, torso, boneMat, ironMat, opts) {
    const o = opts || {};
    const sc = o.scale || 1;
    const armY = o.armY || 0.18;
    const hipY = o.hipY || 0.72;
    const w = o.width || 0.28;

    const leftArm = K.joint(THREE, torso, -w, armY, 0);
    const rightArm = K.joint(THREE, torso, w, armY, 0);
    [leftArm, rightArm].forEach((arm, idx) => {
      const side = idx === 0 ? -1 : 1;
      K.add(THREE, arm, new THREE.SphereGeometry(0.055 * sc, 7, 6), boneMat);
      K.add(THREE, arm, new THREE.CylinderGeometry(0.03 * sc, 0.026 * sc, 0.28 * sc, 7), boneMat, [0, -0.15 * sc, 0]);
      K.add(THREE, arm, new THREE.SphereGeometry(0.04 * sc, 6, 5), ironMat, [0, -0.3 * sc, 0]);
      K.add(THREE, arm, new THREE.CylinderGeometry(0.028 * sc, 0.022 * sc, 0.26 * sc, 7), boneMat, [0, -0.44 * sc, 0]);
      arm.add(K.makeHand(THREE, boneMat, ironMat, side, { scale: 0.9 * sc, claws: !!o.claws })).position.set(0, -0.6 * sc, 0);
    });

    const leftLeg = K.joint(THREE, rig, -0.13 * sc, hipY, 0);
    const rightLeg = K.joint(THREE, rig, 0.13 * sc, hipY, 0);
    [leftLeg, rightLeg].forEach(leg => {
      K.add(THREE, leg, new THREE.SphereGeometry(0.055 * sc, 7, 6), boneMat);
      K.add(THREE, leg, new THREE.CylinderGeometry(0.036 * sc, 0.03 * sc, 0.34 * sc, 7), boneMat, [0, -0.17 * sc, 0]);
      K.add(THREE, leg, new THREE.SphereGeometry(0.045 * sc, 6, 5), ironMat, [0, -0.35 * sc, 0]);
      K.add(THREE, leg, new THREE.CylinderGeometry(0.032 * sc, 0.026 * sc, 0.32 * sc, 7), boneMat, [0, -0.52 * sc, 0]);
      const foot = K.makeBoot(THREE, ironMat, boneMat, ironMat, 0.85 * sc);
      foot.position.set(0, -0.68 * sc, 0);
      leg.add(foot);
    });
    return { leftArm, rightArm, leftLeg, rightLeg };
  }

  window.GGG_MODEL_CATALOG = window.GGG_MODEL_CATALOG || [];

  window.GGG_MODEL_CATALOG.push(
    // ================================================================
    // 1. GOBLIN SKELETON RAIDER
    // ================================================================
    {
      id: 'gg-enemy-goblin-skeleton',
      name: 'Goblin Skeleton Raider',
      game: 'GraveGain 3D / 2D',
      category: 'Enemies',
      tags: ['goblin', 'skeleton', 'minion', 'undead', 'animated'],
      description: 'Hunched goblin skeleton with articulated ribcage, spine, glowing red eyes, scrap-iron pot helm, rusted cleaver-dagger, and wooden buckler (6 animations).',
      build: function createGoblinSkeleton(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const boneMat = K.mat(THREE, { color: 0xe7e5e4, accent: 0xa8a29e, texKind: 'bone', bumpKind: 'bone', roughness: 0.72 });
        const scrapMat = K.mat(THREE, { color: 0x475569, accent: 0x78350f, texKind: 'armor', roughness: 0.65, metalness: 0.65 });
        const woodMat = K.mat(THREE, { color: 0x78350f, accent: 0x451a03, texKind: 'wood', roughness: 0.85 });
        const darkMat = K.mat(THREE, { color: 0x1c1917, roughness: 0.9 });
        const eyeMat = K.mat(THREE, { color: 0xff2222, emissive: 0xdc2626, emissiveIntensity: 1.2 });

        // Pelvis
        K.add(THREE, rig, new THREE.BoxGeometry(0.32, 0.11, 0.18), boneMat, [0, 0.68, 0]);
        K.add(THREE, rig, new THREE.TorusGeometry(0.14, 0.025, 5, 10), scrapMat, [0, 0.72, 0], [Math.PI / 2, 0, 0]);

        const torso = K.joint(THREE, rig, 0, 0.92, 0.04);
        torso.rotation.x = 0.16; // hunched goblin posture
        addRibcage(THREE, torso, boneMat, darkMat, null, 0.92);
        // Scrap shoulder guards
        [-1, 1].forEach(s => {
          K.add(THREE, torso, new THREE.BoxGeometry(0.16, 0.05, 0.16), scrapMat, [s * 0.25, 0.21, 0], [0, 0, -s * 0.35]);
        });

        // Goblin Skull + Pointed Ear Bones + Scrap Pot Helm
        const head = K.joint(THREE, torso, 0, 0.34, 0.08);
        const skull = K.makeSkull(THREE, boneMat, darkMat, eyeMat, { scale: 1.05 });
        head.add(skull);
        // Scrap pot helm & brow spikes
        K.add(THREE, head, new THREE.CylinderGeometry(0.16, 0.2, 0.14, 8), scrapMat, [0, 0.14, 0]);
        K.add(THREE, head, new THREE.ConeGeometry(0.035, 0.14, 5), scrapMat, [0, 0.26, 0]);
        [-1, 1].forEach(s => {
          K.add(THREE, head, new THREE.ConeGeometry(0.03, 0.14, 4), boneMat, [s * 0.21, 0.03, -0.02], [0, 0, -s * 1.1]);
        });

        const limbs = addBoneLimbs(THREE, rig, torso, boneMat, scrapMat, { scale: 0.88, armY: 0.16, hipY: 0.65, width: 0.25, claws: true });
        // Wooden Buckler on Left Arm
        const buckler = K.joint(THREE, limbs.leftArm, -0.08, -0.45, 0.05);
        K.add(THREE, buckler, new THREE.CylinderGeometry(0.22, 0.22, 0.04, 10), woodMat, [0, 0, 0], [0, 0, Math.PI / 2]);
        K.add(THREE, buckler, new THREE.TorusGeometry(0.22, 0.018, 6, 12), scrapMat, [0, 0, 0], [0, Math.PI / 2, 0]);
        K.add(THREE, buckler, new THREE.SphereGeometry(0.05, 6, 6), scrapMat, [-0.03, 0, 0]);
        // Rusted Notched Dagger in Right Hand
        const dagger = K.joint(THREE, limbs.rightArm, 0, -0.58, 0.12);
        dagger.rotation.x = Math.PI / 2;
        K.add(THREE, dagger, new THREE.CylinderGeometry(0.02, 0.022, 0.22, 6), woodMat);
        K.add(THREE, dagger, new THREE.BoxGeometry(0.11, 0.025, 0.04), scrapMat, [0, 0.1, 0]);
        const blade = K.extrude(THREE, [[-0.03, 0.11], [0.04, 0.11], [0.06, 0.28], [0.02, 0.34], [0.05, 0.44], [0, 0.54], [-0.03, 0.35]], 0.02, 0.004, scrapMat);
        dagger.add(blade);

        const parts = { rig, torso, head, leftArm: limbs.leftArm, rightArm: limbs.rightArm, leftLeg: limbs.leftLeg, rightLeg: limbs.rightLeg };
        root.userData.animations = K.ENEMY_ANIMATIONS;
        root.userData.animate = K.createEnemyAnimator(parts, { archetype: 'humanoid', jaw: skull.userData.jaw });
        return root;
      }
    },

    // ================================================================
    // 2. CORRUPTED FLAMING SKULL DRONE
    // ================================================================
    {
      id: 'gg-enemy-flaming-skull',
      name: 'Corrupted Flaming Skull Drone',
      game: 'GraveGain 3D / 2D',
      category: 'Enemies',
      tags: ['skull', 'drone', 'flying', 'cyber', 'flame', 'animated'],
      description: 'Flying cybernetic war-skull with chattering hinged jaw, cranial tech chassis, coolant tubes, counter-rotating top rotor, twin gun pods, and sculpted flame crown (6 animations).',
      build: function createFlamingSkullDrone(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0.9, 0);

        const boneMat = K.mat(THREE, { color: 0xe7e5e4, accent: 0xa8a29e, texKind: 'bone', bumpKind: 'bone', roughness: 0.72 });
        const steelMat = K.mat(THREE, { color: 0x334155, accent: 0x94a3b8, texKind: 'metal', bumpKind: 'metal', roughness: 0.35, metalness: 0.75 });
        const cyanMat = K.mat(THREE, { color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 1.0 });
        const eyeMat = K.mat(THREE, { color: 0xff3b30, emissive: 0xef4444, emissiveIntensity: 1.3 });
        const darkMat = K.mat(THREE, { color: 0x0f172a, roughness: 0.85 });

        const skull = K.makeSkull(THREE, boneMat, darkMat, eyeMat, { scale: 2.2 });
        rig.add(skull);

        // Cybernetic Cranial Harness & Back Thruster Core
        K.add(THREE, skull, new THREE.TorusGeometry(0.38, 0.032, 6, 16), steelMat, [0, 0.1, -0.02], [Math.PI / 2, 0, 0]);
        K.add(THREE, skull, new THREE.BoxGeometry(0.34, 0.28, 0.22), steelMat, [0, 0.08, -0.34]);
        K.add(THREE, skull, new THREE.CylinderGeometry(0.11, 0.13, 0.14, 10), cyanMat, [0, 0.08, -0.44], [Math.PI / 2, 0, 0]);

        // Side Pulse Gun Pods & Coolant Tubes
        [-1, 1].forEach(s => {
          const pod = K.joint(THREE, skull, s * 0.48, -0.04, 0.02);
          K.add(THREE, pod, new THREE.BoxGeometry(0.16, 0.16, 0.42), steelMat);
          K.add(THREE, pod, new THREE.CylinderGeometry(0.038, 0.042, 0.26, 8), steelMat, [0, 0.02, 0.26], [Math.PI / 2, 0, 0]);
          K.add(THREE, pod, new THREE.CylinderGeometry(0.032, 0.032, 0.26, 8), cyanMat, [0, -0.03, 0.22], [Math.PI / 2, 0, 0]);
          const tube = K.tube(THREE, [[s * 0.14, 0.08, -0.32], [s * 0.42, 0.12, -0.2], [s * 0.48, 0.02, -0.1]], 0.024, 10, 6, cyanMat);
          skull.add(tube);
        });

        // Mast & Spinning Rotor Array
        K.add(THREE, skull, new THREE.CylinderGeometry(0.04, 0.06, 0.34, 8), steelMat, [0, 0.56, 0]);
        const rotor = K.joint(THREE, skull, 0, 0.72, 0);
        K.add(THREE, rotor, new THREE.CylinderGeometry(0.1, 0.1, 0.08, 10), steelMat);
        K.add(THREE, rotor, new THREE.SphereGeometry(0.06, 8, 6), eyeMat, [0, 0.08, 0]);
        for (let b = 0; b < 4; b++) {
          const arm = K.joint(THREE, rotor, 0, 0, 0);
          arm.rotation.y = (b / 4) * Math.PI * 2;
          K.add(THREE, arm, new THREE.BoxGeometry(0.68, 0.018, 0.1), steelMat, [0.34, 0, 0], [0.18, 0, 0]);
          K.add(THREE, arm, new THREE.BoxGeometry(0.14, 0.022, 0.11), cyanMat, [0.64, 0, 0]);
        }
        K.add(THREE, rotor, new THREE.TorusGeometry(0.7, 0.022, 6, 20), steelMat, [0, 0, 0], [Math.PI / 2, 0, 0]);

        // Sculpted Flame Crown
        const flame = K.makeFlameCluster(THREE, 0xf97316, 0xfef08a, 1.45);
        flame.position.set(0, 0.32, -0.05);
        skull.add(flame);

        const parts = { rig, head: skull };
        root.userData.animations = K.ENEMY_ANIMATIONS;
        root.userData.animate = K.createEnemyAnimator(parts, {
          archetype: 'floating',
          rotor,
          jaw: skull.userData.jaw,
          flame
        });
        return root;
      }
    },

    // ================================================================
    // 3. ELVEN NECROMANCER
    // ================================================================
    {
      id: 'gg-enemy-elven-necromancer',
      name: 'Elven Necromancer',
      game: 'GraveGain 3D / 2D',
      category: 'Enemies',
      tags: ['elf', 'necromancer', 'mage', 'boss', 'staff', 'grimoire', 'animated'],
      description: 'Hovering corrupted Grove caster with deep hooded cowl, violet skull visage, bone-rib shoulder mantle, orbiting mini-skulls, Soul-Cage Staff, and open Necro-Grimoire (6 animations).',
      build: function createElvenNecromancer(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0.15, 0);

        const robeMat = K.mat(THREE, { color: 0x134e4a, accent: 0x581c87, texKind: 'cloth', bumpKind: 'cloth', roughness: 0.78 });
        const trimMat = K.mat(THREE, { color: 0xa855f7, emissive: 0x7e22ce, emissiveIntensity: 0.9, roughness: 0.25 });
        const boneMat = K.mat(THREE, { color: 0xd6d3d1, texKind: 'bone', roughness: 0.7 });
        const darkMat = K.mat(THREE, { color: 0x0f172a, roughness: 0.9 });
        const eyeMat = K.mat(THREE, { color: 0xe879f9, emissive: 0xc026d3, emissiveIntensity: 1.3 });
        const woodMat = K.mat(THREE, { color: 0x292524, texKind: 'wood', roughness: 0.8 });

        // Flowing Tapered Robe + Sigil Sash + Hovering Ground Rune Ring
        const torso = K.joint(THREE, rig, 0, 0.85, 0);
        K.add(THREE, torso, new THREE.CylinderGeometry(0.24, 0.48, 1.05, 10), robeMat, [0, -0.32, 0]);
        K.add(THREE, torso, new THREE.TorusGeometry(0.47, 0.025, 6, 18), trimMat, [0, -0.82, 0], [Math.PI / 2, 0, 0]);
        K.add(THREE, torso, new THREE.CylinderGeometry(0.26, 0.24, 0.34, 10), robeMat, [0, 0.22, 0]);
        // Bone-rib shoulder mantle
        [-1, 1].forEach(s => {
          K.add(THREE, torso, new THREE.ConeGeometry(0.05, 0.28, 5), boneMat, [s * 0.28, 0.38, -0.02], [0, 0, -s * 0.75]);
          K.add(THREE, torso, new THREE.ConeGeometry(0.04, 0.22, 5), boneMat, [s * 0.24, 0.3, 0.08], [0.2, 0, -s * 0.9]);
        });

        // Hooded Cowl + Undead Elven Skull + Pointed Bone Ears
        const head = K.joint(THREE, torso, 0, 0.5, 0);
        const skull = K.makeSkull(THREE, boneMat, darkMat, eyeMat, { scale: 1.05 });
        head.add(skull);
        K.add(THREE, head, new THREE.ConeGeometry(0.28, 0.48, 8), robeMat, [0, 0.14, -0.04], [-0.25, 0, 0]);
        K.add(THREE, head, new THREE.TorusGeometry(0.24, 0.025, 6, 14), trimMat, [0, 0.02, 0.06]);
        [-1, 1].forEach(s => {
          K.add(THREE, head, new THREE.ConeGeometry(0.035, 0.22, 5), boneMat, [s * 0.22, 0.04, 0], [0, 0, -s * 1.15]);
        });

        // Skeletal Sleeved Arms + Soul-Cage Staff + Open Necro-Grimoire
        const leftArm = K.joint(THREE, torso, -0.32, 0.3, 0);
        K.add(THREE, leftArm, new THREE.ConeGeometry(0.11, 0.42, 7), robeMat, [0, -0.2, 0]);
        leftArm.add(K.makeHand(THREE, boneMat, trimMat, -1, { scale: 0.95, claws: true })).position.set(0, -0.45, 0);
        // Levitating Open Necro-Grimoire
        const book = K.joint(THREE, leftArm, -0.04, -0.48, 0.18);
        book.rotation.set(0.45, 0.2, 0);
        K.add(THREE, book, new THREE.BoxGeometry(0.18, 0.24, 0.03), darkMat, [-0.08, 0, 0], [0, 0.35, 0]);
        K.add(THREE, book, new THREE.BoxGeometry(0.18, 0.24, 0.03), darkMat, [0.08, 0, 0], [0, -0.35, 0]);
        K.add(THREE, book, new THREE.OctahedronGeometry(0.055, 0), trimMat, [0, 0.02, 0.08]);

        const rightArm = K.joint(THREE, torso, 0.32, 0.3, 0);
        K.add(THREE, rightArm, new THREE.ConeGeometry(0.11, 0.42, 7), robeMat, [0, -0.2, 0]);
        rightArm.add(K.makeHand(THREE, boneMat, trimMat, 1, { scale: 0.95, claws: true })).position.set(0, -0.45, 0);
        // Gnarled Soul-Cage Staff
        const staff = K.joint(THREE, rightArm, 0.04, -0.46, 0.1);
        staff.rotation.x = Math.PI / 2.3;
        const shaft = K.tube(THREE, [[0, -0.4, 0], [0.03, 0.25, -0.02], [-0.02, 0.85, 0.04], [0, 1.25, 0]], 0.026, 14, 6, woodMat);
        staff.add(shaft);
        K.add(THREE, staff, new THREE.TorusGeometry(0.14, 0.018, 6, 14), trimMat, [0, 1.38, 0]);
        K.add(THREE, staff, new THREE.OctahedronGeometry(0.08, 0), eyeMat, [0, 1.38, 0]);

        // 2 Orbiting Mini-Skulls
        const orbs = [];
        for (let i = 0; i < 2; i++) {
          const orb = K.makeSkull(THREE, boneMat, darkMat, eyeMat, { scale: 0.42 });
          orb.position.set(i === 0 ? -0.45 : 0.45, 1.45, 0);
          rig.add(orb);
          orbs.push(orb);
        }

        const parts = { rig, torso, head, leftArm, rightArm };
        root.userData.animations = K.ENEMY_ANIMATIONS;
        root.userData.animate = K.createEnemyAnimator(parts, { archetype: 'humanoid', jaw: skull.userData.jaw, orbs });
        return root;
      }
    },

    // ================================================================
    // 4. DWARVEN HIGH THANE (UNDEAD BOSS)
    // ================================================================
    {
      id: 'gg-enemy-dwarven-thane',
      name: 'Dwarven High Thane (Undead)',
      game: 'GraveGain 3D / 2D',
      category: 'Enemies',
      tags: ['dwarf', 'thane', 'boss', 'undead', 'axe', 'armored', 'animated'],
      description: 'Corrupted Dwarven High Thane in blackened gold-trimmed runic plate with horned visor-helm, iron-plaited beard, glowing lava chest fissures, twin-bearded Vault War Axe, and shield (6 animations).',
      build: function createDwarvenHighThane(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const darkPlate = K.mat(THREE, { color: 0x27272a, accent: 0xd97706, texKind: 'armor', bumpKind: 'armor', roughness: 0.4, metalness: 0.78 });
        const goldMat = K.mat(THREE, { color: 0xfbbf24, accent: 0x92400e, texKind: 'metal', roughness: 0.3, metalness: 0.85 });
        const lavaMat = K.mat(THREE, { color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 1.2 });
        const ironMat = K.mat(THREE, { color: 0x64748b, texKind: 'metal', roughness: 0.45, metalness: 0.7 });

        // Stout Armored Pelvis & Legs
        K.add(THREE, rig, new THREE.BoxGeometry(0.6, 0.24, 0.42), darkPlate, [0, 0.56, 0]);
        K.add(THREE, rig, new THREE.BoxGeometry(0.64, 0.1, 0.45), goldMat, [0, 0.64, 0]);
        const leftLeg = K.joint(THREE, rig, -0.2, 0.48, 0);
        const rightLeg = K.joint(THREE, rig, 0.2, 0.48, 0);
        [leftLeg, rightLeg].forEach(leg => {
          K.add(THREE, leg, new THREE.CylinderGeometry(0.11, 0.1, 0.36, 9), darkPlate, [0, -0.18, 0]);
          K.add(THREE, leg, new THREE.OctahedronGeometry(0.08, 0), goldMat, [0, -0.2, 0.1]);
          leg.add(K.makeBoot(THREE, darkPlate, goldMat, ironMat, 1.18)).position.set(0, -0.4, 0);
        });

        // Broad Runic Torso + Lava Fissure Chest + Charred Cape
        const torso = K.joint(THREE, rig, 0, 0.92, 0);
        K.add(THREE, torso, new THREE.BoxGeometry(0.72, 0.54, 0.48), darkPlate);
        K.add(THREE, torso, new THREE.BoxGeometry(0.46, 0.12, 0.5), lavaMat, [0, 0.06, 0]);
        K.add(THREE, torso, new THREE.BoxGeometry(0.14, 0.38, 0.5), lavaMat, [0, 0.04, 0]);
        K.add(THREE, torso, new THREE.BoxGeometry(0.56, 0.48, 0.06), darkPlate, [0, -0.12, -0.28], [0.12, 0, 0]); // heavy armored cape

        // Horned Visor-Helm & Iron-Plaited Beard
        const head = K.joint(THREE, torso, 0, 0.42, 0);
        K.add(THREE, head, new THREE.CylinderGeometry(0.24, 0.26, 0.34, 10), darkPlate);
        K.add(THREE, head, new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), goldMat, [0, 0.14, 0]);
        K.add(THREE, head, new THREE.BoxGeometry(0.32, 0.065, 0.08), lavaMat, [0, 0.06, 0.24]); // glowing visor slit
        [-1, 1].forEach(s => {
          const horn = K.tube(THREE, [[s * 0.22, 0.14, 0], [s * 0.38, 0.22, 0.06], [s * 0.42, 0.42, 0.14]], 0.04, 12, 6, goldMat);
          head.add(horn);
        });
        // Metal-braided beard plates
        [-0.08, 0, 0.08].forEach((bx, i) => {
          K.add(THREE, head, new THREE.BoxGeometry(0.08, 0.34 + (i === 1 ? 0.08 : 0), 0.06), i === 1 ? goldMat : ironMat, [bx, -0.24, 0.2]);
        });

        // Heavy Arms + Twin-Bearded Vault War Axe + Shield
        const leftArm = K.joint(THREE, torso, -0.48, 0.18, 0);
        leftArm.add(K.makePauldron(THREE, darkPlate, goldMat, { side: -1, scale: 1.3, spikes: true }));
        K.add(THREE, leftArm, new THREE.CylinderGeometry(0.1, 0.09, 0.46, 8), darkPlate, [0, -0.24, 0]);
        leftArm.add(K.makeHand(THREE, goldMat, ironMat, -1, { scale: 1.15 })).position.set(0, -0.5, 0);
        const shield = K.extrude(THREE, [[-0.26, -0.36], [0.26, -0.36], [0.32, 0.22], [0, 0.38], [-0.32, 0.22]], 0.06, 0.015, darkPlate);
        shield.rotation.y = Math.PI / 2;
        shield.position.set(-0.14, -0.34, 0.08);
        leftArm.add(shield);
        K.add(THREE, leftArm, new THREE.SphereGeometry(0.08, 8, 6), lavaMat, [-0.18, -0.34, 0.08]);

        const rightArm = K.joint(THREE, torso, 0.48, 0.18, 0);
        rightArm.add(K.makePauldron(THREE, darkPlate, goldMat, { side: 1, scale: 1.3, spikes: true }));
        K.add(THREE, rightArm, new THREE.CylinderGeometry(0.1, 0.09, 0.46, 8), darkPlate, [0, -0.24, 0]);
        rightArm.add(K.makeHand(THREE, goldMat, ironMat, 1, { scale: 1.15 })).position.set(0, -0.5, 0);
        const axe = K.joint(THREE, rightArm, 0, -0.48, 0.12);
        axe.rotation.x = Math.PI / 2;
        K.add(THREE, axe, new THREE.CylinderGeometry(0.032, 0.038, 1.1, 8), ironMat, [0, 0.25, 0]);
        const axeBlades = K.extrude(THREE, [[-0.28, 0.45], [-0.08, 0.56], [0.08, 0.56], [0.28, 0.45], [0.32, 0.88], [0.08, 0.76], [-0.08, 0.76], [-0.32, 0.88]], 0.05, 0.01, goldMat);
        axe.add(axeBlades);
        K.add(THREE, axe, new THREE.BoxGeometry(0.68, 0.08, 0.06), lavaMat, [0, 0.84, 0]);

        const parts = { rig, torso, head, leftArm, rightArm, leftLeg, rightLeg };
        root.userData.animations = K.ENEMY_ANIMATIONS;
        root.userData.animate = K.createEnemyAnimator(parts, { archetype: 'humanoid' });
        return root;
      }
    },

    // ================================================================
    // 5. HUGE ORC ZED BERSERKER
    // ================================================================
    {
      id: 'gg-enemy-orc-berserker',
      name: 'Huge Orc Zed Berserker',
      game: 'GraveGain 3D / 2D',
      category: 'Enemies',
      tags: ['orc', 'zed', 'berserker', 'boss', 'club', 'brute', 'animated'],
      description: 'Hulking undead orc berserker with scarred grey-green flesh, blood-red rage fissures, iron jaw-brace, huge curved tusks, chained torso, shoulder meat-hooks, and Marrow War-Club (6 animations).',
      build: function createOrcZedBerserker(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const fleshMat = K.mat(THREE, { color: 0x4d5e3c, accent: 0x7f1d1d, texKind: 'skin', bumpKind: 'skin', roughness: 0.78 });
        const ironMat = K.mat(THREE, { color: 0x334155, accent: 0x94a3b8, texKind: 'armor', roughness: 0.48, metalness: 0.72 });
        const bloodMat = K.mat(THREE, { color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 1.0 });
        const boneMat = K.mat(THREE, { color: 0xe7e5e4, texKind: 'bone', roughness: 0.58 });
        const hairMat = K.mat(THREE, { color: 0x18181b, roughness: 0.9 });

        // Heavy Legs
        K.add(THREE, rig, new THREE.CylinderGeometry(0.32, 0.28, 0.24, 9), ironMat, [0, 0.82, 0]);
        const leftLeg = K.joint(THREE, rig, -0.21, 0.76, 0);
        const rightLeg = K.joint(THREE, rig, 0.21, 0.76, 0);
        [leftLeg, rightLeg].forEach(leg => {
          K.add(THREE, leg, new THREE.CylinderGeometry(0.13, 0.11, 0.4, 9), fleshMat, [0, -0.2, 0]);
          K.add(THREE, leg, new THREE.BoxGeometry(0.22, 0.34, 0.24), ironMat, [0, -0.52, 0]);
          leg.add(K.makeBoot(THREE, ironMat, boneMat, ironMat, 1.2)).position.set(0, -0.72, 0);
        });

        // Towering Muscular Torso + Chained Harness + Rage Fissures
        const torso = K.joint(THREE, rig, 0, 1.22, 0);
        K.add(THREE, torso, new THREE.CylinderGeometry(0.46, 0.32, 0.68, 9), fleshMat);
        K.add(THREE, torso, new THREE.BoxGeometry(0.54, 0.05, 0.48), bloodMat, [0, 0.05, 0], [0, 0, 0.4]);
        K.add(THREE, torso, new THREE.BoxGeometry(0.54, 0.05, 0.48), bloodMat, [0, -0.05, 0], [0, 0, -0.35]);
        // Iron chain loops across torso
        const chain1 = K.tube(THREE, [[-0.4, 0.26, 0.22], [0, 0.02, 0.32], [0.4, -0.2, 0.22], [0.35, -0.2, -0.25], [-0.4, 0.26, -0.2]], 0.028, 16, 6, ironMat);
        torso.add(chain1);

        // Head with Iron Jaw-Brace, Huge Tusks & Spiked Mohawk
        const head = K.joint(THREE, torso, 0, 0.48, 0.08);
        K.add(THREE, head, new THREE.IcosahedronGeometry(0.26, 1), fleshMat);
        K.add(THREE, head, new THREE.BoxGeometry(0.32, 0.12, 0.24), ironMat, [0, -0.12, 0.1]); // iron jaw-brace
        [-1, 1].forEach(s => {
          K.add(THREE, head, new THREE.SphereGeometry(0.032, 7, 6), bloodMat, [s * 0.09, 0.04, 0.23]);
          const tusk = K.tube(THREE, [[s * 0.1, -0.12, 0.22], [s * 0.13, -0.02, 0.3], [s * 0.1, 0.1, 0.26]], 0.03, 10, 6, boneMat);
          head.add(tusk);
        });
        for (let m = 0; m < 4; m++) {
          K.add(THREE, head, new THREE.ConeGeometry(0.05, 0.18, 5), hairMat, [0, 0.28 - m * 0.02, 0.08 - m * 0.09], [-m * 0.25, 0, 0]);
        }

        // Massive Arms + Meat-Hook Pauldrons + Marrow War-Club
        const leftArm = K.joint(THREE, torso, -0.56, 0.2, 0);
        leftArm.add(K.makePauldron(THREE, ironMat, bloodMat, { side: -1, scale: 1.4, spikes: true }));
        K.add(THREE, leftArm, new THREE.CylinderGeometry(0.13, 0.11, 0.62, 9), fleshMat, [0, -0.32, 0]);
        leftArm.add(K.makeHand(THREE, fleshMat, ironMat, -1, { scale: 1.25, claws: true })).position.set(0, -0.66, 0);

        const rightArm = K.joint(THREE, torso, 0.56, 0.2, 0);
        rightArm.add(K.makePauldron(THREE, ironMat, bloodMat, { side: 1, scale: 1.4, spikes: true }));
        K.add(THREE, rightArm, new THREE.CylinderGeometry(0.13, 0.11, 0.62, 9), fleshMat, [0, -0.32, 0]);
        rightArm.add(K.makeHand(THREE, fleshMat, ironMat, 1, { scale: 1.25, claws: true })).position.set(0, -0.66, 0);
        // Gigantic Marrow War-Club
        const club = K.joint(THREE, rightArm, 0, -0.64, 0.12);
        club.rotation.x = Math.PI / 2.2;
        K.add(THREE, club, new THREE.CylinderGeometry(0.04, 0.075, 1.15, 8), boneMat, [0, 0.32, 0]);
        K.add(THREE, club, new THREE.DodecahedronGeometry(0.22, 0), boneMat, [0, 0.88, 0]);
        K.add(THREE, club, new THREE.TorusGeometry(0.21, 0.028, 6, 12), ironMat, [0, 0.88, 0], [Math.PI / 2, 0, 0]);
        for (let sp = 0; sp < 6; sp++) {
          const a = (sp / 6) * Math.PI * 2;
          K.add(THREE, club, new THREE.ConeGeometry(0.035, 0.16, 5), bloodMat, [Math.cos(a) * 0.24, 0.88, Math.sin(a) * 0.24], [Math.sin(a) * 1.4, 0, -Math.cos(a) * 1.4]);
        }

        const parts = { rig, torso, head, leftArm, rightArm, leftLeg, rightLeg };
        root.userData.animations = K.ENEMY_ANIMATIONS;
        root.userData.animate = K.createEnemyAnimator(parts, { archetype: 'humanoid' });
        return root;
      }
    },

    // ================================================================
    // 6. TOXIC CHEM-GOLEM
    // ================================================================
    {
      id: 'gg-enemy-chem-golem',
      name: 'Toxic Chem-Golem',
      game: 'GraveGain 3D / 2D',
      category: 'Enemies',
      tags: ['golem', 'chem', 'toxic', 'boss', 'alchemical', 'animated'],
      description: 'Towering industrial bio-hazard golem with bolted vat torso, glowing bubbling sludge core, pressurized dual chem-tanks with curved pipes, dome-glass helm, and piston claw arms (6 animations).',
      build: function createChemGolem(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const vatMat = K.mat(THREE, { color: 0x334155, accent: 0xfacc15, texKind: 'armor', bumpKind: 'metal', roughness: 0.42, metalness: 0.72 });
        const hazardMat = K.mat(THREE, { color: 0xeab308, accent: 0x1e293b, texKind: 'armor', roughness: 0.45, metalness: 0.5 });
        const sludgeMat = K.mat(THREE, { color: 0x4ade80, emissive: 0x22c55e, emissiveIntensity: 1.0, texKind: 'sludge', transparent: true, opacity: 0.86 });
        const pipeMat = K.mat(THREE, { color: 0x86efac, emissive: 0x16a34a, emissiveIntensity: 0.75, roughness: 0.25 });

        // Heavy Hydraulic Legs
        K.add(THREE, rig, new THREE.BoxGeometry(0.68, 0.26, 0.48), hazardMat, [0, 0.72, 0]);
        const leftLeg = K.joint(THREE, rig, -0.24, 0.64, 0);
        const rightLeg = K.joint(THREE, rig, 0.24, 0.64, 0);
        [leftLeg, rightLeg].forEach(leg => {
          K.add(THREE, leg, new THREE.CylinderGeometry(0.16, 0.14, 0.36, 10), vatMat, [0, -0.18, 0]);
          K.add(THREE, leg, new THREE.CylinderGeometry(0.18, 0.22, 0.28, 10), hazardMat, [0, -0.48, 0]);
          K.add(THREE, leg, new THREE.BoxGeometry(0.28, 0.1, 0.34), vatMat, [0, -0.62, 0.04]);
        });

        // Bolted Vat Torso + Glowing Sludge Core Window + Back Chem-Tanks
        const torso = K.joint(THREE, rig, 0, 1.24, 0);
        K.add(THREE, torso, new THREE.CylinderGeometry(0.52, 0.44, 0.82, 12), vatMat);
        K.add(THREE, torso, new THREE.CylinderGeometry(0.54, 0.54, 0.12, 12), hazardMat, [0, 0.26, 0]);
        K.add(THREE, torso, new THREE.CylinderGeometry(0.5, 0.5, 0.12, 12), hazardMat, [0, -0.26, 0]);
        K.rivetRing(THREE, torso, 0.55, 10, 0.022, hazardMat, 0.26, 'y');
        // Glowing Sludge Core Window + Bubbling Orbs
        K.add(THREE, torso, new THREE.TorusGeometry(0.22, 0.032, 6, 14), hazardMat, [0, 0.02, 0.44]);
        K.add(THREE, torso, new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12), sludgeMat, [0, 0.02, 0.42], [Math.PI / 2, 0, 0]);
        [-0.06, 0.07, 0].forEach((bx, i) => {
          K.add(THREE, torso, new THREE.SphereGeometry(0.045, 7, 6), pipeMat, [bx, -0.04 + i * 0.06, 0.48]);
        });
        // Dual Back Chem-Tanks + Curved Feed Tubes
        [-1, 1].forEach(s => {
          K.add(THREE, torso, new THREE.CylinderGeometry(0.14, 0.14, 0.56, 10), sludgeMat, [s * 0.24, 0.18, -0.42]);
          K.add(THREE, torso, new THREE.CylinderGeometry(0.15, 0.15, 0.08, 10), vatMat, [s * 0.24, 0.45, -0.42]);
          K.add(THREE, torso, new THREE.CylinderGeometry(0.15, 0.15, 0.08, 10), vatMat, [s * 0.24, -0.08, -0.42]);
          const tube = K.tube(THREE, [[s * 0.24, 0.48, -0.42], [s * 0.36, 0.55, -0.18], [s * 0.16, 0.46, 0.04]], 0.03, 12, 6, pipeMat);
          torso.add(tube);
        });

        // Dome-Glass Helmet Head with Inner Floating Toxic Brain/Core
        const head = K.joint(THREE, torso, 0, 0.56, 0.04);
        K.add(THREE, head, new THREE.CylinderGeometry(0.22, 0.25, 0.1, 12), vatMat, [0, -0.1, 0]);
        K.add(THREE, head, new THREE.SphereGeometry(0.21, 14, 10), sludgeMat);
        K.add(THREE, head, new THREE.IcosahedronGeometry(0.11, 0), pipeMat);
        [-1, 1].forEach(s => {
          K.add(THREE, head, new THREE.SphereGeometry(0.032, 7, 6), hazardMat, [s * 0.08, 0.02, 0.18]);
        });

        // Heavy Hydraulic Piston Claw Arms
        const leftArm = K.joint(THREE, torso, -0.64, 0.24, 0);
        const rightArm = K.joint(THREE, torso, 0.64, 0.24, 0);
        [leftArm, rightArm].forEach((arm, idx) => {
          const s = idx === 0 ? -1 : 1;
          K.add(THREE, arm, new THREE.SphereGeometry(0.18, 10, 8), hazardMat);
          K.add(THREE, arm, new THREE.CylinderGeometry(0.12, 0.1, 0.38, 10), vatMat, [0, -0.24, 0]);
          K.add(THREE, arm, new THREE.CylinderGeometry(0.15, 0.13, 0.36, 10), hazardMat, [0, -0.56, 0]);
          [-1, 1].forEach(p => {
            K.add(THREE, arm, new THREE.ConeGeometry(0.045, 0.18, 5), vatMat, [p * 0.06, -0.82, s * 0.01], [Math.PI, 0, p * 0.2]);
          });
        });

        const parts = { rig, torso, head, leftArm, rightArm, leftLeg, rightLeg };
        root.userData.animations = K.ENEMY_ANIMATIONS;
        root.userData.animate = K.createEnemyAnimator(parts, { archetype: 'humanoid' });
        return root;
      }
    },

    // ================================================================
    // 7. CRYPT WEAVER SPIDER
    // ================================================================
    {
      id: 'gg-enemy-tomb-spider',
      name: 'Crypt Weaver Spider',
      game: 'GraveGain 3D / 2D',
      category: 'Enemies',
      tags: ['spider', 'crypt', 'arachnid', 'crawler', 'animated'],
      description: 'Eight-legged Crypt Weaver arachnid with bulbous chitin abdomen, glowing crimson hourglass rune, 6 clustered eyes, venomous fangs, and 8 multi-jointed legs (6 animations).',
      build: function createCryptWeaverSpider(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0.45, 0);

        const chitinMat = K.mat(THREE, { color: 0x1e293b, accent: 0x475569, texKind: 'armor', bumpKind: 'armor', roughness: 0.45, metalness: 0.35 });
        const trimMat = K.mat(THREE, { color: 0x475569, texKind: 'metal', roughness: 0.4, metalness: 0.65 });
        const eyeMat = K.mat(THREE, { color: 0xff1e42, emissive: 0xe11d48, emissiveIntensity: 1.25 });

        // Cephalothorax + Bulbous Segmented Abdomen + Crimson Hourglass Rune
        K.add(THREE, rig, new THREE.SphereGeometry(0.28, 12, 10), chitinMat, [0, 0, 0.16], [0, 0, 0], [1.1, 0.85, 1.2]);
        const abd = K.add(THREE, rig, new THREE.SphereGeometry(0.42, 14, 12), chitinMat, [0, 0.14, -0.48], [0, 0, 0], [1.05, 0.92, 1.38]);
        void abd;
        K.add(THREE, rig, new THREE.ConeGeometry(0.08, 0.14, 6), eyeMat, [0, 0.44, -0.45], [0, 0, 0]);
        K.add(THREE, rig, new THREE.ConeGeometry(0.08, 0.14, 6), eyeMat, [0, 0.44, -0.58], [Math.PI, 0, 0]);
        // Spine spikes + Spinnerets
        [-0.25, -0.5, -0.75].forEach(zp => {
          K.add(THREE, rig, new THREE.ConeGeometry(0.04, 0.12, 5), trimMat, [0, 0.48, zp]);
        });
        K.add(THREE, rig, new THREE.ConeGeometry(0.05, 0.14, 6), trimMat, [0, 0.08, -1.06], [-Math.PI / 2, 0, 0]);

        // 6 Clustered Glowing Eyes + Venomous Fangs
        [[-0.09, 0.08, 0.45, 0.036], [0.09, 0.08, 0.45, 0.036], [-0.18, 0.04, 0.4, 0.025], [0.18, 0.04, 0.4, 0.025], [-0.04, 0.14, 0.44, 0.022], [0.04, 0.14, 0.44, 0.022]].forEach(([ex, ey, ez, r]) => {
          K.add(THREE, rig, new THREE.SphereGeometry(r, 7, 6), eyeMat, [ex, ey, ez]);
        });
        [-1, 1].forEach(s => {
          const fang = K.tube(THREE, [[s * 0.1, -0.05, 0.42], [s * 0.14, -0.14, 0.56], [s * 0.06, -0.24, 0.52]], 0.028, 8, 6, trimMat);
          rig.add(fang);
        });

        // 8 Multi-Jointed Articulated Legs (Coxa + Femur + Tibia + Claw Tip)
        const legs = [];
        for (let side of [-1, 1]) {
          for (let i = 0; i < 4; i++) {
            const leg = K.joint(THREE, rig, side * 0.24, -0.02, 0.28 - i * 0.18);
            leg.rotation.y = side * (0.45 - i * 0.34);
            K.add(THREE, leg, new THREE.SphereGeometry(0.055, 6, 5), trimMat);
            K.add(THREE, leg, new THREE.CylinderGeometry(0.042, 0.035, 0.42, 6), chitinMat, [side * 0.18, 0.16, 0], [0, 0, -side * 0.72]);
            K.add(THREE, leg, new THREE.SphereGeometry(0.045, 6, 5), trimMat, [side * 0.34, 0.3, 0]);
            K.add(THREE, leg, new THREE.CylinderGeometry(0.034, 0.015, 0.62, 6), chitinMat, [side * 0.48, -0.04, 0], [0, 0, side * 0.42]);
            K.add(THREE, leg, new THREE.ConeGeometry(0.022, 0.12, 4), eyeMat, [side * 0.61, -0.36, 0], [Math.PI, 0, -side * 0.35]);
            legs.push(leg);
          }
        }

        const parts = { rig };
        root.userData.animations = K.ENEMY_ANIMATIONS;
        root.userData.animate = K.createEnemyAnimator(parts, { archetype: 'spider', legs });
        return root;
      }
    },

    // ================================================================
    // 8. BONE GOLIATH WARLORD
    // ================================================================
    {
      id: 'gg-enemy-bone-goliath',
      name: 'Bone Goliath Warlord',
      game: 'GraveGain 3D / 2D',
      category: 'Enemies',
      tags: ['goliath', 'boss', 'skeleton', 'warlord', 'greatsword', 'animated'],
      description: 'Colossal floor-boss ossuary warlord with horned skull crown, massive ribcage framing a pulsing Marrow Heart, skull-trophy pauldrons, and Ossuary Greatsword (6 animations).',
      build: function createBoneGoliathWarlord(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const boneMat = K.mat(THREE, { color: 0xe7e5e4, accent: 0xa8a29e, texKind: 'bone', bumpKind: 'bone', roughness: 0.68 });
        const trimMat = K.mat(THREE, { color: 0x7f1d1d, accent: 0xfbbf24, texKind: 'armor', roughness: 0.45, metalness: 0.62 });
        const marrowMat = K.mat(THREE, { color: 0xff2244, emissive: 0xdc2626, emissiveIntensity: 1.25 });
        const darkMat = K.mat(THREE, { color: 0x1c1917, roughness: 0.9 });

        // Ossuary Pelvis + Heavy Legs
        K.add(THREE, rig, new THREE.BoxGeometry(0.56, 0.2, 0.34), boneMat, [0, 0.9, 0]);
        K.add(THREE, rig, new THREE.BoxGeometry(0.6, 0.09, 0.38), trimMat, [0, 0.96, 0]);

        const torso = K.joint(THREE, rig, 0, 1.38, 0);
        addRibcage(THREE, torso, boneMat, darkMat, marrowMat, 1.55);

        // Horned Warlord Skull
        const head = K.joint(THREE, torso, 0, 0.56, 0.04);
        const skull = K.makeSkull(THREE, boneMat, darkMat, marrowMat, { scale: 1.45 });
        head.add(skull);
        K.add(THREE, head, new THREE.CylinderGeometry(0.24, 0.22, 0.14, 8), trimMat, [0, 0.24, 0]);
        [-1, 1].forEach(s => {
          const horn = K.tube(THREE, [[s * 0.2, 0.2, 0], [s * 0.38, 0.32, 0.05], [s * 0.34, 0.52, 0.14]], 0.042, 12, 6, boneMat);
          head.add(horn);
        });

        const limbs = addBoneLimbs(THREE, rig, torso, boneMat, trimMat, { scale: 1.32, armY: 0.3, hipY: 0.86, width: 0.48, claws: true });
        [-1, 1].forEach(s => {
          const arm = s === -1 ? limbs.leftArm : limbs.rightArm;
          arm.add(K.makePauldron(THREE, boneMat, trimMat, { side: s, scale: 1.45, spikes: true }));
          const trophy = K.makeSkull(THREE, boneMat, darkMat, marrowMat, { scale: 0.48 });
          trophy.position.set(s * 0.06, 0.24, 0.05);
          arm.add(trophy);
        });

        // Massive Ossuary Greatsword
        const sword = K.joint(THREE, limbs.rightArm, 0, -0.78, 0.14);
        sword.rotation.x = Math.PI / 2.2;
        K.add(THREE, sword, new THREE.CylinderGeometry(0.036, 0.042, 0.45, 7), trimMat, [0, -0.1, 0]);
        K.add(THREE, sword, new THREE.BoxGeometry(0.46, 0.08, 0.1), boneMat, [0, 0.14, 0]);
        const blade = K.extrude(THREE, [[-0.08, 0.18], [0.08, 0.18], [0.1, 1.28], [0, 1.54], [-0.1, 1.28]], 0.04, 0.01, boneMat);
        sword.add(blade);
        K.add(THREE, sword, new THREE.BoxGeometry(0.04, 1.05, 0.055), marrowMat, [0, 0.78, 0]);

        const parts = { rig, torso, head, leftArm: limbs.leftArm, rightArm: limbs.rightArm, leftLeg: limbs.leftLeg, rightLeg: limbs.rightLeg };
        root.userData.animations = K.ENEMY_ANIMATIONS;
        root.userData.animate = K.createEnemyAnimator(parts, { archetype: 'humanoid', jaw: skull.userData.jaw });
        return root;
      }
    },

    // ================================================================
    // 9. NECRO-ARRAY TITAN
    // ================================================================
    {
      id: 'gg-enemy-necro-titan',
      name: 'Necro-Array Titan',
      game: 'GraveGain 3D / 2D',
      category: 'Enemies',
      tags: ['titan', 'boss', 'array', 'pylons', 'mech', 'void', 'animated'],
      description: 'Corrupted LuckyStarShip maintenance titan wreathed in 4 orbiting Necro-Array Pylons, glowing reactor core, Void Siege Cannon, and Energy Glaive (6 animations).',
      build: function createNecroArrayTitan(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const chassisMat = K.mat(THREE, { color: 0x1e1b4b, accent: 0x6366f1, texKind: 'armor', bumpKind: 'metal', roughness: 0.35, metalness: 0.78 });
        const trimMat = K.mat(THREE, { color: 0x4c1d95, accent: 0xc084fc, texKind: 'metal', roughness: 0.3, metalness: 0.8 });
        const voidMat = K.mat(THREE, { color: 0xc084fc, emissive: 0x9333ea, emissiveIntensity: 1.2 });

        // Stabilizer Legs
        K.add(THREE, rig, new THREE.CylinderGeometry(0.42, 0.34, 0.28, 8), chassisMat, [0, 0.9, 0]);
        const leftLeg = K.joint(THREE, rig, -0.26, 0.84, 0);
        const rightLeg = K.joint(THREE, rig, 0.26, 0.84, 0);
        [leftLeg, rightLeg].forEach(leg => {
          K.add(THREE, leg, new THREE.BoxGeometry(0.22, 0.44, 0.26), chassisMat, [0, -0.22, 0]);
          K.add(THREE, leg, new THREE.CylinderGeometry(0.14, 0.18, 0.42, 8), trimMat, [0, -0.62, 0]);
          leg.add(K.makeBoot(THREE, chassisMat, voidMat, trimMat, 1.25)).position.set(0, -0.84, 0);
        });

        // Torso + Reactor Core + Head
        const torso = K.joint(THREE, rig, 0, 1.44, 0);
        K.add(THREE, torso, new THREE.CylinderGeometry(0.54, 0.38, 0.78, 8), chassisMat);
        K.add(THREE, torso, new THREE.OctahedronGeometry(0.18, 0), voidMat, [0, 0.08, 0.42]);
        K.add(THREE, torso, new THREE.TorusGeometry(0.24, 0.025, 6, 12), trimMat, [0, 0.08, 0.42]);

        const head = K.joint(THREE, torso, 0, 0.56, 0);
        K.add(THREE, head, new THREE.CylinderGeometry(0.2, 0.24, 0.32, 6), chassisMat);
        K.add(THREE, head, new THREE.BoxGeometry(0.26, 0.07, 0.08), voidMat, [0, 0.04, 0.22]);
        K.add(THREE, head, new THREE.ConeGeometry(0.16, 0.28, 6), trimMat, [0, 0.28, 0]);

        // 4 Orbiting Necro-Array Pylons around torso
        const pylons = [];
        [[-0.78, 0.25], [0.78, 0.25], [-0.55, -0.55], [0.55, -0.55]].forEach(([px, pz]) => {
          const p = K.joint(THREE, torso, px, 0.12, pz);
          K.add(THREE, p, new THREE.BoxGeometry(0.14, 0.85, 0.14), chassisMat);
          K.add(THREE, p, new THREE.OctahedronGeometry(0.1, 0), voidMat, [0, 0.52, 0]);
          K.add(THREE, p, new THREE.OctahedronGeometry(0.08, 0), voidMat, [0, -0.5, 0]);
          pylons.push(p);
        });

        // Void Glaive & Void Siege Cannon Arms
        const leftArm = K.joint(THREE, torso, -0.62, 0.24, 0);
        leftArm.add(K.makePauldron(THREE, chassisMat, voidMat, { side: -1, scale: 1.35, spikes: true }));
        K.add(THREE, leftArm, new THREE.BoxGeometry(0.18, 0.54, 0.2), chassisMat, [0, -0.3, 0]);
        const glaive = K.extrude(THREE, [[-0.04, 0], [0.06, 0], [0.1, -0.55], [0, -0.78], [-0.05, -0.45]], 0.03, 0.008, voidMat);
        glaive.position.set(0, -0.56, 0.12);
        leftArm.add(glaive);

        const rightArm = K.joint(THREE, torso, 0.62, 0.24, 0);
        rightArm.add(K.makePauldron(THREE, chassisMat, voidMat, { side: 1, scale: 1.35, spikes: true }));
        K.add(THREE, rightArm, new THREE.CylinderGeometry(0.14, 0.16, 0.62, 8), chassisMat, [0, -0.32, 0]);
        K.add(THREE, rightArm, new THREE.CylinderGeometry(0.11, 0.11, 0.45, 8), voidMat, [0, -0.64, 0.16], [Math.PI / 2, 0, 0]);

        const parts = { rig, torso, head, leftArm, rightArm, leftLeg, rightLeg };
        root.userData.animations = K.ENEMY_ANIMATIONS;
        root.userData.animate = K.createEnemyAnimator(parts, { archetype: 'humanoid', pylons });
        return root;
      }
    },

    // ================================================================
    // 10. LUCIFER HADES (CONSCIOUSNESS OVERLORD)
    // ================================================================
    {
      id: 'gg-enemy-lucifer-hades',
      name: 'Lucifer Hades (Overlord)',
      game: 'GraveGain 3D / 2D',
      category: 'Enemies',
      tags: ['lucifer', 'hades', 'final-boss', 'overlord', 'wings', 'halo', 'animated'],
      description: 'Final boss Consciousness Overlord in ivory-and-void sovereign armor with obsidian crown, 3 counter-rotating halo rings, multi-feathered Dark-Light Wings, and Singularity Scepter (6 animations).',
      build: function createLuciferHades(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0.22, 0);

        const ivoryMat = K.mat(THREE, { color: 0xede9fe, accent: 0xc4b5fd, texKind: 'armor', bumpKind: 'armor', roughness: 0.28, metalness: 0.45 });
        const voidMat = K.mat(THREE, { color: 0x1e1b4b, accent: 0x7c3aed, texKind: 'metal', roughness: 0.32, metalness: 0.82 });
        const energyMat = K.mat(THREE, { color: 0xe879f9, emissive: 0xa855f7, emissiveIntensity: 1.3 });
        const whiteGlow = K.mat(THREE, { color: 0xffffff, emissive: 0xddd6fe, emissiveIntensity: 1.4 });

        // Regal Armored Silhouette
        const leftLeg = K.joint(THREE, rig, -0.16, 0.86, 0);
        const rightLeg = K.joint(THREE, rig, 0.16, 0.86, 0);
        [leftLeg, rightLeg].forEach(leg => {
          K.add(THREE, leg, new THREE.CylinderGeometry(0.1, 0.08, 0.42, 9), voidMat, [0, -0.21, 0]);
          K.add(THREE, leg, new THREE.CylinderGeometry(0.09, 0.07, 0.4, 9), ivoryMat, [0, -0.6, 0]);
          leg.add(K.makeBoot(THREE, ivoryMat, voidMat, voidMat, 1.05)).position.set(0, -0.82, 0);
        });

        const torso = K.joint(THREE, rig, 0, 1.32, 0);
        K.add(THREE, torso, new THREE.CylinderGeometry(0.32, 0.22, 0.72, 10), ivoryMat);
        K.add(THREE, torso, new THREE.OctahedronGeometry(0.11, 0), energyMat, [0, 0.14, 0.28]);
        // High Sovereign Collar
        K.add(THREE, torso, new THREE.CylinderGeometry(0.28, 0.22, 0.24, 10, 1, true, Math.PI * 0.65, Math.PI * 1.7), voidMat, [0, 0.42, -0.02]);

        // Sovereign Head + Crown + 3 Counter-Rotating Consciousness Halos
        const head = K.joint(THREE, torso, 0, 0.56, 0);
        K.add(THREE, head, new THREE.SphereGeometry(0.21, 14, 12), ivoryMat);
        [-1, 1].forEach(s => {
          K.add(THREE, head, new THREE.SphereGeometry(0.028, 8, 6), whiteGlow, [s * 0.075, 0.02, 0.185]);
        });
        K.add(THREE, head, new THREE.CylinderGeometry(0.22, 0.19, 0.12, 8), voidMat, [0, 0.16, 0]);
        for (let c = 0; c < 6; c++) {
          const a = (c / 6) * Math.PI * 2;
          K.add(THREE, head, new THREE.ConeGeometry(0.032, 0.18, 4), energyMat, [Math.cos(a) * 0.19, 0.28, Math.sin(a) * 0.19]);
        }

        const halos = [];
        [0.44, 0.62, 0.8].forEach((hr, idx) => {
          const h = K.add(THREE, torso, new THREE.TorusGeometry(hr, 0.016, 6, 24), idx % 2 === 0 ? energyMat : voidMat, [0, 0.48, -0.18]);
          halos.push(h);
        });

        // Twin Articulated Multi-Feathered Dark-Light Wings
        const wings = [];
        [-1, 1].forEach(s => {
          const wing = K.joint(THREE, torso, s * 0.2, 0.24, -0.2);
          for (let f = 0; f < 6; f++) {
            const feather = K.extrude(THREE, [[0, 0], [0.16, 0.18], [0.1, 0.86 - f * 0.07], [0, 0.96 - f * 0.08], [-0.06, 0.2]], 0.025, 0.005, f % 2 === 0 ? ivoryMat : voidMat);
            feather.position.set(s * (0.2 + f * 0.14), 0.15 - f * 0.08, 0);
            feather.rotation.z = -s * (0.45 + f * 0.22);
            wing.add(feather);
          }
          wings.push(wing);
        });

        // Arms + Singularity Scepter
        const leftArm = K.joint(THREE, torso, -0.4, 0.24, 0);
        leftArm.add(K.makePauldron(THREE, voidMat, energyMat, { side: -1, scale: 1.15, spikes: true }));
        K.add(THREE, leftArm, new THREE.CylinderGeometry(0.08, 0.07, 0.56, 8), ivoryMat, [0, -0.3, 0]);
        leftArm.add(K.makeHand(THREE, voidMat, energyMat, -1, { scale: 1.05, claws: true })).position.set(0, -0.62, 0);

        const rightArm = K.joint(THREE, torso, 0.4, 0.24, 0);
        rightArm.add(K.makePauldron(THREE, voidMat, energyMat, { side: 1, scale: 1.15, spikes: true }));
        K.add(THREE, rightArm, new THREE.CylinderGeometry(0.08, 0.07, 0.56, 8), ivoryMat, [0, -0.3, 0]);
        rightArm.add(K.makeHand(THREE, voidMat, energyMat, 1, { scale: 1.05, claws: true })).position.set(0, -0.62, 0);
        const scepter = K.joint(THREE, rightArm, 0, -0.6, 0.1);
        scepter.rotation.x = Math.PI / 2.3;
        K.add(THREE, scepter, new THREE.CylinderGeometry(0.025, 0.03, 1.55, 8), voidMat, [0, 0.35, 0]);
        K.add(THREE, scepter, new THREE.TorusKnotGeometry(0.11, 0.022, 32, 6), energyMat, [0, 1.24, 0]);
        K.add(THREE, scepter, new THREE.SphereGeometry(0.06, 8, 8), whiteGlow, [0, 1.24, 0]);

        const parts = { rig, torso, head, leftArm, rightArm, leftLeg, rightLeg };
        root.userData.animations = K.ENEMY_ANIMATIONS;
        root.userData.animate = K.createEnemyAnimator(parts, { archetype: 'winged_boss', wings, halos });
        return root;
      }
    }
  );
})();
