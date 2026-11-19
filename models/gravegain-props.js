// GraveGain 3D & 2D Detailed Dungeon, Biome, Hub & Loot Prop Models (12 Props)
// Requires /models/gravegain-kit.js (window.GGG_GRAVEGAIN_KIT)
// Every model uses outer `root` + inner `rig` and exposes 3+ procedural animations.

(function () {
  'use strict';

  const K = window.GGG_GRAVEGAIN_KIT;
  if (!K) return;

  window.GGG_MODEL_CATALOG = window.GGG_MODEL_CATALOG || [];

  window.GGG_MODEL_CATALOG.push(
    // ================================================================
    // 1. RUNIC DUNGEON TREASURE CHEST
    // ================================================================
    {
      id: 'gg-prop-treasure-chest',
      name: 'Runic Dungeon Treasure Chest',
      game: 'GraveGain 3D / 2D',
      category: 'Props',
      tags: ['chest', 'loot', 'treasure', 'gold', 'dungeon', 'animated'],
      description: 'Iron-banded oak treasure chest with rivet rows, ornate skull-rune lockplate, hinged barrel lid, and overflowing gold coins & gems (3 animations).',
      build: function createRunicTreasureChest(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const woodMat = K.mat(THREE, { color: 0x78350f, accent: 0x451a03, texKind: 'wood', bumpKind: 'wood', roughness: 0.78 });
        const ironMat = K.mat(THREE, { color: 0x334155, accent: 0x94a3b8, texKind: 'metal', roughness: 0.38, metalness: 0.75 });
        const goldMat = K.mat(THREE, { color: 0xfbbf24, accent: 0xfef08a, texKind: 'metal', roughness: 0.22, metalness: 0.88 });
        const gemMat = K.mat(THREE, { color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 1.0 });

        // Base Chest Planks + Corner Iron Straps + Rivets
        K.add(THREE, rig, new THREE.BoxGeometry(1.18, 0.56, 0.8), woodMat, [0, 0.28, 0]);
        K.add(THREE, rig, new THREE.BoxGeometry(1.24, 0.08, 0.86), ironMat, [0, 0.04, 0]);
        K.add(THREE, rig, new THREE.BoxGeometry(1.24, 0.08, 0.86), ironMat, [0, 0.54, 0]);
        [-0.56, -0.2, 0.2, 0.56].forEach(bx => {
          K.add(THREE, rig, new THREE.BoxGeometry(0.08, 0.58, 0.85), ironMat, [bx, 0.29, 0]);
          K.add(THREE, rig, new THREE.SphereGeometry(0.022, 6, 5), goldMat, [bx, 0.18, 0.43]);
          K.add(THREE, rig, new THREE.SphereGeometry(0.022, 6, 5), goldMat, [bx, 0.42, 0.43]);
        });
        // Side carrying rings
        [-1, 1].forEach(s => {
          K.add(THREE, rig, new THREE.TorusGeometry(0.09, 0.018, 6, 12), goldMat, [s * 0.62, 0.3, 0], [0, Math.PI / 2, 0]);
        });

        // Interior Gold Hoard + Cut Gems
        const coinGroup = K.joint(THREE, rig, 0, 0.52, 0);
        for (let c = 0; c < 14; c++) {
          const cx = ((c % 5) - 2) * 0.18;
          const cz = (Math.floor(c / 5) - 1) * 0.18;
          K.add(THREE, coinGroup, new THREE.CylinderGeometry(0.08, 0.08, 0.05 + (c % 3) * 0.02, 8), goldMat, [cx, 0.03, cz]);
        }
        [[-0.22, 0.09, 0.05], [0.18, 0.1, -0.06], [0, 0.12, 0.02]].forEach(p => {
          K.add(THREE, coinGroup, new THREE.OctahedronGeometry(0.075, 0), gemMat, p);
        });

        // Hinged Arched Barrel Lid + Lockplate
        const lid = K.joint(THREE, rig, 0, 0.56, -0.4);
        const barrel = K.add(THREE, lid, new THREE.CylinderGeometry(0.4, 0.4, 1.18, 12, 1, false, 0, Math.PI), woodMat, [0, 0, 0.4], [0, Math.PI / 2, Math.PI / 2]);
        void barrel;
        [-0.56, -0.2, 0.2, 0.56].forEach(bx => {
          K.add(THREE, lid, new THREE.CylinderGeometry(0.425, 0.425, 0.075, 12, 1, false, 0, Math.PI), ironMat, [bx, 0, 0.4], [0, Math.PI / 2, Math.PI / 2]);
        });
        K.add(THREE, lid, new THREE.BoxGeometry(0.18, 0.24, 0.06), goldMat, [0, -0.02, 0.82]);
        K.add(THREE, lid, new THREE.OctahedronGeometry(0.055, 0), gemMat, [0, -0.02, 0.86]);

        K.createPropAnimator(root, ['open', 'closed', 'glow_pulse'], (t, anim) => {
          lid.rotation.x = 0;
          rig.position.y = 0;
          coinGroup.position.y = 0.52;
          if (anim === 'open') {
            lid.rotation.x = -0.78 + Math.sin(t * 2) * 0.05;
            coinGroup.position.y = 0.54 + Math.sin(t * 3) * 0.015;
          } else if (anim === 'glow_pulse') {
            const p = (Math.sin(t * 3.5) + 1) * 0.5;
            lid.rotation.x = -0.35 - p * 0.4;
            rig.position.y = p * 0.04;
          } else {
            lid.rotation.x = -0.02 + Math.sin(t * 2.2) * 0.02;
          }
        });
        return root;
      }
    },

    // ================================================================
    // 2. REINFORCED MOONROCK SUPPLY CRATE
    // ================================================================
    {
      id: 'gg-prop-supply-crate',
      name: 'Reinforced MoonRock Supply Crate',
      game: 'GraveGain 3D / 2D',
      category: 'Props',
      tags: ['crate', 'prop', 'supply', 'destructible', 'animated'],
      description: 'Recessed cargo crate with diagonal wood cross-bracing, riveted steel corner bumpers, hazard latches, and glowing cyan LuckyStarShip cargo badge (3 animations).',
      build: function createSupplyCrate(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const woodMat = K.mat(THREE, { color: 0x92400e, accent: 0x451a03, texKind: 'wood', bumpKind: 'wood', roughness: 0.8 });
        const steelMat = K.mat(THREE, { color: 0x475569, accent: 0x94a3b8, texKind: 'metal', roughness: 0.4, metalness: 0.72 });
        const cyanMat = K.mat(THREE, { color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.9 });

        K.add(THREE, rig, new THREE.BoxGeometry(0.92, 0.92, 0.92), woodMat, [0, 0.5, 0]);
        // 12 Steel Frame Edges + Corner Bumpers
        const pos = [-0.46, 0.46];
        pos.forEach(x => {
          pos.forEach(z => {
            K.add(THREE, rig, new THREE.BoxGeometry(0.12, 0.98, 0.12), steelMat, [x, 0.5, z]);
            K.add(THREE, rig, new THREE.BoxGeometry(0.16, 0.14, 0.16), steelMat, [x, 0.06, z]);
            K.add(THREE, rig, new THREE.BoxGeometry(0.16, 0.14, 0.16), steelMat, [x, 0.94, z]);
          });
        });
        // Diagonal Cross-Braces & Glowing Cargo Badges on 4 Sides
        for (let f = 0; f < 4; f++) {
          const face = K.joint(THREE, rig, 0, 0.5, 0);
          face.rotation.y = (f / 4) * Math.PI * 2;
          K.add(THREE, face, new THREE.BoxGeometry(0.96, 0.08, 0.05), woodMat, [0, 0, 0.46], [0, 0, 0.78]);
          K.add(THREE, face, new THREE.BoxGeometry(0.96, 0.08, 0.05), woodMat, [0, 0, 0.46], [0, 0, -0.78]);
          K.add(THREE, face, new THREE.BoxGeometry(0.24, 0.14, 0.06), steelMat, [0, 0, 0.48]);
          K.add(THREE, face, new THREE.BoxGeometry(0.14, 0.06, 0.07), cyanMat, [0, 0, 0.485]);
        }
        // Top Lid Latch
        const lid = K.joint(THREE, rig, 0, 0.98, 0);
        K.add(THREE, lid, new THREE.BoxGeometry(0.98, 0.08, 0.98), steelMat);
        K.add(THREE, lid, new THREE.BoxGeometry(0.68, 0.1, 0.68), woodMat);

        K.createPropAnimator(root, ['intact', 'rattle', 'cracked'], (t, anim) => {
          rig.rotation.set(0, 0, 0);
          lid.position.y = 0.98;
          lid.rotation.set(0, 0, 0);
          if (anim === 'rattle') {
            rig.rotation.z = Math.sin(t * 24) * 0.06;
            lid.position.y = 0.98 + Math.abs(Math.sin(t * 18)) * 0.04;
          } else if (anim === 'cracked') {
            lid.rotation.set(0.18, 0.22, -0.14);
            lid.position.y = 1.04 + Math.sin(t * 2.5) * 0.015;
          } else {
            lid.position.y = 0.98 + Math.sin(t * 2.4) * 0.012;
          }
        });
        return root;
      }
    },

    // ================================================================
    // 3. HAUNTED MOONROCK GRAVESTONE & CAIRN
    // ================================================================
    {
      id: 'gg-prop-colonial-gravestone',
      name: 'Haunted MoonRock Gravestone & Cairn',
      game: 'GraveGain 3D / 2D',
      category: 'Props',
      tags: ['grave', 'gravestone', 'tomb', 'cemetery', 'wisp', 'animated'],
      description: 'Extruded cracked granite headstone with colonial EVA helmet memorial, creeping roots, glowing moonblossoms, iron fence posts with chains, and rising ghostly soul-wisps (3 animations).',
      build: function createColonialGravestone(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const stoneMat = K.mat(THREE, { color: 0x64748b, accent: 0x334155, texKind: 'stone', bumpKind: 'stone', roughness: 0.9 });
        const dirtMat = K.mat(THREE, { color: 0x3f2e21, texKind: 'stone', roughness: 0.95 });
        const ironMat = K.mat(THREE, { color: 0x1e293b, texKind: 'metal', roughness: 0.5, metalness: 0.7 });
        const wispMat = K.mat(THREE, { color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 1.2, transparent: true, opacity: 0.8 });
        const flowerMat = K.mat(THREE, { color: 0xa7f3d0, emissive: 0x10b981, emissiveIntensity: 0.9 });
        const helmMat = K.mat(THREE, { color: 0xcbd5e1, texKind: 'armor', roughness: 0.5, metalness: 0.5 });

        // Soil Mound + Stepped Stone Base
        K.add(THREE, rig, new THREE.CylinderGeometry(0.68, 0.85, 0.18, 12), dirtMat, [0, 0.09, 0.14]);
        K.add(THREE, rig, new THREE.BoxGeometry(0.86, 0.18, 0.42), stoneMat, [0, 0.16, -0.25]);

        // Extruded Gothic Headstone + Engraved Plaque + Skull Relief
        const slab = K.extrude(THREE, [[-0.36, 0], [0.36, 0], [0.36, 0.88], [0.22, 1.12], [0, 1.24], [-0.22, 1.12], [-0.36, 0.88]], 0.16, 0.02, stoneMat);
        slab.position.set(0, 0.24, -0.25);
        slab.rotation.z = 0.04;
        rig.add(slab);
        K.add(THREE, rig, new THREE.BoxGeometry(0.46, 0.42, 0.04), ironMat, [0, 0.78, -0.15]);
        K.add(THREE, rig, new THREE.TorusGeometry(0.11, 0.018, 6, 12), wispMat, [0, 1.15, -0.15]);

        // Fallen Sealed Colonial EVA Helmet resting on mound
        K.add(THREE, rig, new THREE.SphereGeometry(0.17, 12, 10), helmMat, [0.24, 0.24, 0.24], [0.3, -0.4, 0.2]);
        K.add(THREE, rig, new THREE.BoxGeometry(0.18, 0.08, 0.08), wispMat, [0.22, 0.24, 0.37], [0.3, -0.4, 0.2]);

        // Iron Fence Posts + Hanging Chains + Creeping Roots + Moonblossoms
        [[-0.65, 0.32], [0.65, 0.32], [-0.65, -0.45], [0.65, -0.45]].forEach(([fx, fz]) => {
          K.add(THREE, rig, new THREE.CylinderGeometry(0.032, 0.038, 0.58, 6), ironMat, [fx, 0.29, fz]);
          K.add(THREE, rig, new THREE.ConeGeometry(0.048, 0.1, 4), ironMat, [fx, 0.62, fz]);
          K.add(THREE, rig, new THREE.BoxGeometry(0.1, 0.06, 0.1), stoneMat, [fx, 0.03, fz]);
        });
        rig.add(K.tube(THREE, [[-0.65, 0.42, 0.32], [0, 0.3, 0.38], [0.65, 0.42, 0.32]], 0.018, 12, 5, ironMat));
        rig.add(K.tube(THREE, [[-0.65, 0.42, -0.45], [-0.65, 0.32, -0.05], [-0.65, 0.42, 0.32]], 0.016, 10, 5, ironMat));
        rig.add(K.tube(THREE, [[0.65, 0.42, -0.45], [0.65, 0.32, -0.05], [0.65, 0.42, 0.32]], 0.016, 10, 5, ironMat));
        rig.add(K.tube(THREE, [[-0.45, 0.12, -0.1], [-0.25, 0.2, 0.2], [0.1, 0.14, 0.45]], 0.028, 10, 5, dirtMat));
        [[-0.24, 0.2, 0.25], [-0.12, 0.22, 0.38], [0.02, 0.2, 0.32], [-0.34, 0.18, 0.16], [0.14, 0.18, 0.18]].forEach(fp => {
          K.add(THREE, rig, new THREE.CylinderGeometry(0.01, 0.012, 0.09, 5), dirtMat, [fp[0], fp[1] - 0.05, fp[2]]);
          K.add(THREE, rig, new THREE.OctahedronGeometry(0.045, 0), flowerMat, fp);
        });

        // 3 Ghostly Rising Soul-Wisps
        const wisps = [];
        for (let i = 0; i < 3; i++) {
          const w = K.add(THREE, rig, new THREE.OctahedronGeometry(0.06, 0), wispMat, [-0.2 + i * 0.2, 0.55 + i * 0.2, 0.15]);
          wisps.push(w);
        }

        K.createPropAnimator(root, ['haunted', 'rest', 'rising'], (t, anim) => {
          wisps.forEach((w, idx) => {
            const a = t * (anim === 'rising' ? 3.2 : 1.5) + idx * 2.1;
            const rise = anim === 'rest' ? 0.35 : anim === 'rising' ? 0.85 + ((t * 0.6 + idx * 0.33) % 1) * 0.7 : 0.65;
            w.position.set(Math.cos(a) * 0.35, rise + Math.sin(a * 2) * 0.12, Math.sin(a) * 0.25 + 0.1);
            w.rotation.y = t * 2.5;
            w.scale.setScalar(anim === 'rest' ? 0.01 : 0.9 + Math.sin(t * 4 + idx) * 0.25);
          });
        });
        return root;
      }
    },

    // ================================================================
    // 4. IRON SKULL BRAZIER
    // ================================================================
    {
      id: 'gg-prop-dungeon-brazier',
      name: 'Iron Skull Brazier',
      game: 'GraveGain 3D / 2D',
      category: 'Props',
      tags: ['brazier', 'torch', 'fire', 'light', 'dungeon', 'animated'],
      description: 'Stepped dungeon stone plinth supporting a tripod iron fire-bowl ringed with relief skulls, glowing ember coals, multi-tongue flames, and rising spark motes (3 animations).',
      build: function createIronSkullBrazier(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const stoneMat = K.mat(THREE, { color: 0x475569, accent: 0x1e293b, texKind: 'stone', bumpKind: 'stone', roughness: 0.9 });
        const ironMat = K.mat(THREE, { color: 0x1e293b, accent: 0x64748b, texKind: 'metal', roughness: 0.42, metalness: 0.78 });
        const boneMat = K.mat(THREE, { color: 0xd6d3d1, texKind: 'bone', roughness: 0.7 });
        const coalMat = K.mat(THREE, { color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 1.1 });
        const darkMat = K.mat(THREE, { color: 0x090d16, roughness: 0.9 });

        // Stepped Plinth + Tripod Curved Legs
        K.add(THREE, rig, new THREE.CylinderGeometry(0.55, 0.65, 0.16, 8), stoneMat, [0, 0.08, 0]);
        K.add(THREE, rig, new THREE.CylinderGeometry(0.42, 0.5, 0.14, 8), stoneMat, [0, 0.22, 0]);
        for (let l = 0; l < 3; l++) {
          const a = (l / 3) * Math.PI * 2;
          const leg = K.tube(THREE, [
            [Math.cos(a) * 0.42, 0.26, Math.sin(a) * 0.42],
            [Math.cos(a) * 0.26, 0.6, Math.sin(a) * 0.26],
            [Math.cos(a) * 0.36, 0.96, Math.sin(a) * 0.36]
          ], 0.045, 10, 6, ironMat);
          rig.add(leg);
        }
        K.add(THREE, rig, new THREE.TorusGeometry(0.28, 0.028, 6, 16), ironMat, [0, 0.58, 0], [Math.PI / 2, 0, 0]);

        // Lathe Fire-Bowl + 4 Relief Skulls
        const bowl = K.lathe(THREE, [[0, 0.88], [0.28, 0.92], [0.46, 1.12], [0.5, 1.24], [0.44, 1.24], [0.22, 0.98], [0, 0.96]], 14, ironMat);
        rig.add(bowl);
        for (let s = 0; s < 4; s++) {
          const a = (s / 4) * Math.PI * 2;
          const sk = K.makeSkull(THREE, boneMat, darkMat, coalMat, { scale: 0.5 });
          sk.position.set(Math.cos(a) * 0.47, 1.12, Math.sin(a) * 0.47);
          sk.rotation.y = -a + Math.PI / 2;
          rig.add(sk);
        }

        // Ember Coal Mound + Multi-Tongue Flame Cluster + Rising Sparks
        K.add(THREE, rig, new THREE.DodecahedronGeometry(0.32, 1), coalMat, [0, 1.06, 0], [0, 0, 0], [1, 0.5, 1]);
        const flames = K.makeFlameCluster(THREE, 0xf97316, 0xfef08a, 1.8);
        flames.position.set(0, 1.12, 0);
        rig.add(flames);

        const sparks = [];
        for (let sp = 0; sp < 5; sp++) {
          sparks.push(K.add(THREE, rig, new THREE.OctahedronGeometry(0.032, 0), coalMat, [0, 1.5, 0]));
        }

        K.createPropAnimator(root, ['burning', 'flare', 'smoldering'], (t, anim) => {
          const mul = anim === 'flare' ? 1.5 : anim === 'smoldering' ? 0.35 : 1.0;
          flames.scale.set(mul * (0.95 + Math.sin(t * 14) * 0.12), mul * (0.95 + Math.cos(t * 19) * 0.22), mul * (0.95 + Math.sin(t * 16) * 0.12));
          flames.rotation.y = t * 1.4;
          sparks.forEach((s, i) => {
            const cyc = (t * 0.9 + i * 0.2) % 1;
            const a = t * 2 + i * 1.3;
            s.position.set(Math.cos(a) * 0.22 * (1 - cyc * 0.4), 1.25 + cyc * 0.85 * mul, Math.sin(a) * 0.22 * (1 - cyc * 0.4));
            s.scale.setScalar((1 - cyc) * mul);
          });
        });
        return root;
      }
    },

    // ================================================================
    // 5. SAFESPACE EXTRACTION PORTAL
    // ================================================================
    {
      id: 'gg-prop-safespace-portal',
      name: 'SafeSpace Extraction Portal',
      game: 'GraveGain 3D / 2D',
      category: 'Props',
      tags: ['portal', 'safespace', 'gate', 'extraction', 'vortex', 'animated'],
      description: 'Monumental MoonRock SafeSpace archway with stepped stone dais, twin floating crystal conduit pylons, inlaid rune arch, and multi-ring swirling vortex field (3 animations).',
      build: function createSafeSpacePortal(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const stoneMat = K.mat(THREE, { color: 0x334155, accent: 0x64748b, texKind: 'stone', bumpKind: 'stone', roughness: 0.85 });
        const trimMat = K.mat(THREE, { color: 0x94a3b8, texKind: 'metal', roughness: 0.35, metalness: 0.72 });
        const runeMat = K.mat(THREE, { color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.1 });
        const vortexMat = K.mat(THREE, { color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 0.95, transparent: true, opacity: 0.48, side: THREE.DoubleSide });

        // Stepped Dais
        K.add(THREE, rig, new THREE.CylinderGeometry(1.15, 1.28, 0.14, 12), stoneMat, [0, 0.07, 0]);
        K.add(THREE, rig, new THREE.CylinderGeometry(0.95, 1.05, 0.12, 12), stoneMat, [0, 0.18, 0]);

        // Archway Pillars + Keystone Arch + Power Conduits
        [-1, 1].forEach(s => {
          K.add(THREE, rig, new THREE.BoxGeometry(0.28, 1.45, 0.34), stoneMat, [s * 0.72, 0.92, 0]);
          K.add(THREE, rig, new THREE.BoxGeometry(0.32, 0.14, 0.38), trimMat, [s * 0.72, 0.28, 0]);
          K.add(THREE, rig, new THREE.BoxGeometry(0.32, 0.14, 0.38), trimMat, [s * 0.72, 1.56, 0]);
          K.add(THREE, rig, new THREE.BoxGeometry(0.06, 1.1, 0.36), runeMat, [s * 0.72, 0.92, 0]);
          // Flanking Conduit Pylons + Levitating Crystals + Power Tubes
          K.add(THREE, rig, new THREE.CylinderGeometry(0.14, 0.18, 0.72, 6), stoneMat, [s * 1.05, 0.46, 0.28]);
          K.add(THREE, rig, new THREE.TorusGeometry(0.16, 0.022, 5, 12), trimMat, [s * 1.05, 0.82, 0.28], [Math.PI / 2, 0, 0]);
          K.add(THREE, rig, new THREE.OctahedronGeometry(0.12, 0), runeMat, [s * 1.05, 1.05, 0.28]);
          rig.add(K.tube(THREE, [[s * 1.05, 0.22, 0.28], [s * 0.9, 0.22, 0.12], [s * 0.72, 0.35, 0]], 0.026, 8, 6, trimMat));
        });
        K.add(THREE, rig, new THREE.TorusGeometry(0.72, 0.14, 8, 18, Math.PI), stoneMat, [0, 1.56, 0]);
        for (let kb = 0; kb < 7; kb++) {
          const ka = (kb / 6) * Math.PI;
          K.add(THREE, rig, new THREE.BoxGeometry(0.14, 0.18, 0.36), trimMat, [Math.cos(ka) * 0.72, 1.56 + Math.sin(ka) * 0.72, 0], [0, 0, ka - Math.PI / 2]);
        }
        K.add(THREE, rig, new THREE.BoxGeometry(0.28, 0.32, 0.36), trimMat, [0, 2.32, 0]);
        K.add(THREE, rig, new THREE.OctahedronGeometry(0.11, 0), runeMat, [0, 2.32, 0.18]);

        // Swirling Multi-Ring Vortex Energy Field
        const vDisc = K.add(THREE, rig, new THREE.CircleGeometry(0.66, 20), vortexMat, [0, 1.25, 0]);
        const ring1 = K.add(THREE, rig, new THREE.TorusGeometry(0.64, 0.025, 6, 24), runeMat, [0, 1.25, 0]);
        const ring2 = K.add(THREE, rig, new THREE.TorusGeometry(0.46, 0.02, 6, 20), runeMat, [0, 1.25, 0]);
        const ring3 = K.add(THREE, rig, new THREE.TorusGeometry(0.28, 0.018, 6, 16), runeMat, [0, 1.25, 0]);

        K.createPropAnimator(root, ['idle', 'active_surge', 'overcharge'], (t, anim) => {
          const sp = anim === 'overcharge' ? 5.5 : anim === 'active_surge' ? 3.0 : 1.2;
          ring1.rotation.z = t * sp;
          ring2.rotation.z = -t * sp * 1.4;
          ring3.rotation.z = t * sp * 2.1;
          ring2.rotation.x = Math.sin(t * sp * 0.5) * 0.35;
          vDisc.scale.setScalar(0.95 + Math.sin(t * sp * 2) * 0.06);
        });
        return root;
      }
    },

    // ================================================================
    // 6. SPARKITE & MOONSTONE ORE CLUSTER
    // ================================================================
    {
      id: 'gg-prop-sparkite-crystal',
      name: 'Sparkite & Moonstone Ore Cluster',
      game: 'GraveGain 3D / 2D',
      category: 'Props',
      tags: ['crystal', 'sparkite', 'moonstone', 'ore', 'mining', 'animated'],
      description: 'Basalt mineral outcrop bursting with 9 angled faceted Sparkite and Moonstone crystal spires, embedded gold ore veins, and orbiting electric energy motes (3 animations).',
      build: function createSparkiteCrystalCluster(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const rockMat = K.mat(THREE, { color: 0x334155, accent: 0x1e293b, texKind: 'stone', flatShading: true, roughness: 0.92 });
        const sparkMat = K.mat(THREE, { color: 0xfb7185, emissive: 0xf43f5e, emissiveIntensity: 0.95, roughness: 0.15, metalness: 0.3 });
        const moonMat = K.mat(THREE, { color: 0x2dd4bf, emissive: 0x0d9488, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.3 });
        const goldMat = K.mat(THREE, { color: 0xfbbf24, roughness: 0.25, metalness: 0.88 });

        // Craggy Basalt Base + Gold Veins
        [[-0.25, 0.16, 0.1, 0.42], [0.22, 0.14, -0.1, 0.38], [0, 0.22, 0, 0.52], [-0.1, 0.12, -0.28, 0.32]].forEach(([rx, ry, rz, r]) => {
          K.add(THREE, rig, new THREE.DodecahedronGeometry(r, 0), rockMat, [rx, ry, rz], [rx, ry, rz], [1.2, 0.7, 1.1]);
        });
        [[-0.3, 0.2, 0.22], [0.28, 0.18, 0.16], [0.08, 0.25, -0.28]].forEach(gp => {
          K.add(THREE, rig, new THREE.OctahedronGeometry(0.11, 0), goldMat, gp);
        });

        // 9 Angled Faceted Crystal Spires
        const spires = [];
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          const dist = i === 0 ? 0 : 0.22 + (i % 3) * 0.1;
          const h = i === 0 ? 1.18 : 0.55 + (i % 3) * 0.22;
          const rad = i === 0 ? 0.17 : 0.09 + (i % 2) * 0.03;
          const sp = K.joint(THREE, rig, Math.cos(a) * dist, 0.22, Math.sin(a) * dist);
          sp.rotation.set(Math.sin(a) * (i === 0 ? 0.08 : 0.38), a, -Math.cos(a) * (i === 0 ? 0.08 : 0.38));
          const cMat = i % 3 === 0 ? moonMat : sparkMat;
          K.add(THREE, sp, new THREE.CylinderGeometry(rad * 0.72, rad, h * 0.75, 6), cMat, [0, h * 0.37, 0]);
          K.add(THREE, sp, new THREE.ConeGeometry(rad * 0.72, h * 0.32, 6), cMat, [0, h * 0.75 + h * 0.16, 0]);
          spires.push(sp);
        }

        // Orbiting Energy Motes
        const motes = [];
        for (let m = 0; m < 4; m++) {
          motes.push(K.add(THREE, rig, new THREE.OctahedronGeometry(0.045, 0), m % 2 === 0 ? sparkMat : moonMat, [0, 0.9, 0]));
        }

        K.createPropAnimator(root, ['idle', 'charged', 'discharge'], (t, anim) => {
          const spd = anim === 'discharge' ? 5.2 : anim === 'charged' ? 2.6 : 1.1;
          motes.forEach((m, i) => {
            const a = t * spd + (i / 4) * Math.PI * 2;
            const r = anim === 'discharge' ? 0.68 : 0.48;
            m.position.set(Math.cos(a) * r, 0.75 + Math.sin(t * 3 + i) * 0.22, Math.sin(a) * r);
            m.rotation.y = t * 4;
          });
          spires.forEach((sp, i) => {
            sp.scale.y = 1 + (anim === 'discharge' ? 0.12 : 0.04) * Math.sin(t * spd * 1.5 + i);
          });
        });
        return root;
      }
    },

    // ================================================================
    // 7. BIOLUMINESCENT ELVEN GROVE TREE
    // ================================================================
    {
      id: 'gg-prop-biolum-tree',
      name: 'Bioluminescent Elven Grove Tree',
      game: 'GraveGain 3D / 2D',
      category: 'Props',
      tags: ['tree', 'elf', 'grove', 'bioluminescent', 'nature', 'animated'],
      description: 'Gnarled Northern Grove spirit tree with arched roots, glowing bark runes, 4-tier bioluminescent teal-emerald canopies, hanging luminous tendrils, and orbiting Light Spirit fireflies (3 animations).',
      build: function createBiolumTree(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const barkMat = K.mat(THREE, { color: 0x3f2e21, accent: 0x1e1b18, texKind: 'wood', bumpKind: 'wood', roughness: 0.88 });
        const leafMat = K.mat(THREE, { color: 0x14b8a6, emissive: 0x0f766e, emissiveIntensity: 0.6, roughness: 0.5 });
        const glowMat = K.mat(THREE, { color: 0x67e8f9, emissive: 0x2dd4bf, emissiveIntensity: 1.15 });

        // Arched Roots & Twisted Trunk + Secondary Branches
        for (let r = 0; r < 6; r++) {
          const a = (r / 6) * Math.PI * 2 + 0.3;
          rig.add(K.tube(THREE, [[Math.cos(a) * 0.62, 0.02, Math.sin(a) * 0.62], [Math.cos(a) * 0.3, 0.25, Math.sin(a) * 0.3], [0, 0.55, 0]], 0.075, 10, 6, barkMat));
        }
        rig.add(K.tube(THREE, [[0, 0.1, 0], [0.06, 0.65, -0.04], [-0.04, 1.25, 0.05], [0, 1.65, 0]], 0.15, 14, 8, barkMat));
        for (let br = 0; br < 4; br++) {
          const ba = (br / 4) * Math.PI * 2 + 0.5;
          rig.add(K.tube(THREE, [[0, 1.25, 0], [Math.cos(ba) * 0.25, 1.42, Math.sin(ba) * 0.25], [Math.cos(ba) * 0.45, 1.55, Math.sin(ba) * 0.45]], 0.055, 8, 5, barkMat));
        }
        // Bark Spirit Runes
        [0.45, 0.72, 0.98].forEach((ry, ri) => {
          K.add(THREE, rig, new THREE.OctahedronGeometry(0.065, 0), glowMat, [0.03, ry, 0.14 - ri * 0.01]);
        });

        // Multi-Tier Glowing Foliage Canopies + Hanging Luminous Lantern Pods
        const crown = K.joint(THREE, rig, 0, 1.55, 0);
        [[0, 0.1, 0, 0.72, 0.36], [-0.36, -0.05, 0.22, 0.48, 0.28], [0.38, 0.0, -0.18, 0.5, 0.3], [0, 0.38, 0, 0.48, 0.32], [0.18, 0.24, 0.28, 0.38, 0.24]].forEach(([cx, cy, cz, rx, ry]) => {
          const puff = K.add(THREE, crown, new THREE.IcosahedronGeometry(rx, 1), leafMat, [cx, cy, cz]);
          puff.scale.y = ry / rx;
        });
        for (let t = 0; t < 8; t++) {
          const a = (t / 8) * Math.PI * 2;
          K.add(THREE, crown, new THREE.CylinderGeometry(0.014, 0.008, 0.44, 5), glowMat, [Math.cos(a) * 0.52, -0.25, Math.sin(a) * 0.52]);
          K.add(THREE, crown, new THREE.OctahedronGeometry(0.038, 0), glowMat, [Math.cos(a) * 0.52, -0.48, Math.sin(a) * 0.52]);
        }

        // Orbiting Light Spirit Fireflies
        const flies = [];
        for (let f = 0; f < 5; f++) {
          flies.push(K.add(THREE, rig, new THREE.SphereGeometry(0.038, 6, 6), glowMat, [0, 1.4, 0]));
        }

        K.createPropAnimator(root, ['sway', 'bloom_pulse', 'spirit_burst'], (t, anim) => {
          crown.rotation.z = Math.sin(t * 1.4) * 0.04;
          crown.rotation.x = Math.cos(t * 1.1) * 0.03;
          const sc = anim === 'bloom_pulse' ? 1.06 + Math.sin(t * 4) * 0.08 : 1.0;
          crown.scale.setScalar(sc);
          flies.forEach((f, i) => {
            const sp = anim === 'spirit_burst' ? 3.5 : 1.3;
            const rad = anim === 'spirit_burst' ? 0.95 : 0.72;
            const a = t * sp + (i / 5) * Math.PI * 2;
            f.position.set(Math.cos(a) * rad, 1.15 + Math.sin(t * 2.5 + i) * 0.35, Math.sin(a) * rad);
          });
        });
        return root;
      }
    },

    // ================================================================
    // 8. QUARTERS HYDROPONIC BOTANY POD
    // ================================================================
    {
      id: 'gg-prop-botany-pod',
      name: 'Quarters Hydroponic Botany Pod',
      game: 'GraveGain 3D / 2D',
      category: 'Props',
      tags: ['botany', 'hydroponic', 'mushroom', 'rose', 'quarters', 'animated'],
      description: 'Hub Quarters UV grow-pod containing sculpted Magic Mushrooms, Blood Rose, and Sparkite Sprouts fed by a side nutrient tank and curved feed tube (3 animations).',
      build: function createBotanyPod(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const metalMat = K.mat(THREE, { color: 0x334155, accent: 0x94a3b8, texKind: 'metal', roughness: 0.38, metalness: 0.75 });
        const soilMat = K.mat(THREE, { color: 0x3f2e21, texKind: 'stone', roughness: 0.95 });
        const uvMat = K.mat(THREE, { color: 0xe879f9, emissive: 0xa855f7, emissiveIntensity: 1.0 });
        const mushMat = K.mat(THREE, { color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 0.9 });
        const roseMat = K.mat(THREE, { color: 0xf43f5e, emissive: 0xbe123c, emissiveIntensity: 0.7 });
        const greenMat = K.mat(THREE, { color: 0x4ade80, roughness: 0.55 });

        // Planter Basin, Rim, Feet & Soil
        K.add(THREE, rig, new THREE.CylinderGeometry(0.68, 0.56, 0.38, 8), metalMat, [0, 0.19, 0]);
        K.add(THREE, rig, new THREE.TorusGeometry(0.67, 0.028, 6, 16), metalMat, [0, 0.38, 0], [Math.PI / 2, 0, 0]);
        K.add(THREE, rig, new THREE.CylinderGeometry(0.6, 0.6, 0.08, 8), soilMat, [0, 0.36, 0]);
        for (let ft = 0; ft < 4; ft++) {
          const fa = (ft / 4) * Math.PI * 2 + 0.4;
          K.add(THREE, rig, new THREE.BoxGeometry(0.14, 0.12, 0.14), metalMat, [Math.cos(fa) * 0.54, 0.06, Math.sin(fa) * 0.54]);
        }
        // Side Nutrient Reservoir + Gauge Bars + Curved Tube
        K.add(THREE, rig, new THREE.CylinderGeometry(0.14, 0.14, 0.56, 10), mushMat, [0.76, 0.3, 0]);
        K.add(THREE, rig, new THREE.CylinderGeometry(0.15, 0.15, 0.06, 10), metalMat, [0.76, 0.58, 0]);
        K.add(THREE, rig, new THREE.CylinderGeometry(0.15, 0.15, 0.06, 10), metalMat, [0.76, 0.06, 0]);
        K.add(THREE, rig, new THREE.BoxGeometry(0.04, 0.24, 0.04), uvMat, [0.76, 0.3, 0.14]);
        rig.add(K.tube(THREE, [[0.76, 0.58, 0], [0.62, 0.72, 0], [0.42, 0.42, 0]], 0.025, 10, 6, greenMat));

        // UV Grow-Light Arch Canopy + Emitter Bulbs
        rig.add(K.tube(THREE, [[-0.64, 0.34, 0], [-0.58, 1.15, 0], [0, 1.38, 0], [0.58, 1.15, 0], [0.64, 0.34, 0]], 0.036, 16, 6, metalMat));
        K.add(THREE, rig, new THREE.BoxGeometry(0.54, 0.06, 0.24), metalMat, [0, 1.32, 0]);
        K.add(THREE, rig, new THREE.BoxGeometry(0.46, 0.03, 0.18), uvMat, [0, 1.29, 0]);
        [-0.16, 0, 0.16].forEach(bx => {
          K.add(THREE, rig, new THREE.SphereGeometry(0.035, 6, 6), uvMat, [bx, 1.26, 0]);
        });

        // Crops: Magic Mushrooms (Lathe), Blood Rose, Sparkite Sprout, Soil Pebbles
        const crops = K.joint(THREE, rig, 0, 0.38, 0);
        [[-0.24, 0.12, 1.0], [-0.14, -0.18, 0.72], [-0.36, -0.06, 0.55]].forEach(([mx, mz, sc]) => {
          const m = K.lathe(THREE, [[0, 0], [0.03, 0], [0.03, 0.22 * sc], [0.16 * sc, 0.25 * sc], [0.12 * sc, 0.34 * sc], [0, 0.38 * sc]], 12, mushMat);
          m.position.set(mx, 0, mz);
          crops.add(m);
        });
        // Blood Rose + Leaves
        K.add(THREE, crops, new THREE.CylinderGeometry(0.018, 0.022, 0.42, 6), greenMat, [0.22, 0.21, 0.1]);
        [-1, 1].forEach(ls => {
          K.add(THREE, crops, new THREE.BoxGeometry(0.11, 0.015, 0.05), greenMat, [0.22 + ls * 0.06, 0.22, 0.1], [0, 0, ls * 0.4]);
        });
        for (let p = 0; p < 6; p++) {
          const a = (p / 6) * Math.PI * 2;
          K.add(THREE, crops, new THREE.SphereGeometry(0.06, 7, 6), roseMat, [0.22 + Math.cos(a) * 0.045, 0.44, 0.1 + Math.sin(a) * 0.045]);
        }
        // Sparkite Sprout + Soil Pebbles
        K.add(THREE, crops, new THREE.CylinderGeometry(0.02, 0.025, 0.28, 6), greenMat, [0.04, 0.14, -0.22]);
        K.add(THREE, crops, new THREE.OctahedronGeometry(0.075, 0), uvMat, [0.04, 0.32, -0.22]);
        [[-0.02, 0.02, 0.28], [0.35, 0.02, -0.12], [-0.28, 0.02, 0.32]].forEach(pp => {
          K.add(THREE, crops, new THREE.DodecahedronGeometry(0.045, 0), soilMat, pp);
        });

        K.createPropAnimator(root, ['bloom', 'sprout', 'harvest_pulse'], (t, anim) => {
          const sc = anim === 'sprout' ? 0.55 + Math.abs(Math.sin(t * 2)) * 0.45 : anim === 'harvest_pulse' ? 1.08 + Math.sin(t * 5) * 0.08 : 1.0 + Math.sin(t * 2) * 0.03;
          crops.scale.set(1, sc, 1);
          crops.rotation.y = Math.sin(t * 1.1) * 0.06;
        });
        return root;
      }
    },

    // ================================================================
    // 9. DWARVEN FORGE ANVIL & POTION STATION
    // ================================================================
    {
      id: 'gg-prop-alchemical-table',
      name: 'Dwarven Forge Anvil & Potion Station',
      game: 'GraveGain 3D / 2D',
      category: 'Props',
      tags: ['anvil', 'forge', 'dwarf', 'potion', 'alchemy', 'animated'],
      description: 'Dwarven iron horn anvil mounted on a banded oak stump alongside a wrought-iron potion rack holding 3 Lathe-sculpted glowing Nanite Flasks, forged hammer, and glowing embers (3 animations).',
      build: function createAlchemicalForgeStation(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const woodMat = K.mat(THREE, { color: 0x78350f, accent: 0x451a03, texKind: 'wood', bumpKind: 'wood', roughness: 0.85 });
        const ironMat = K.mat(THREE, { color: 0x334155, accent: 0x94a3b8, texKind: 'metal', bumpKind: 'metal', roughness: 0.38, metalness: 0.82 });
        const bronzeMat = K.mat(THREE, { color: 0xd97706, texKind: 'metal', roughness: 0.3, metalness: 0.85 });
        const hpMat = K.mat(THREE, { color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 });
        const mpMat = K.mat(THREE, { color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 });
        const toxMat = K.mat(THREE, { color: 0x4ade80, emissive: 0x16a34a, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 });

        // Banded Oak Stump + Forged Horn Anvil + Forge Coal Pan + Tongs
        K.add(THREE, rig, new THREE.CylinderGeometry(0.36, 0.42, 0.54, 10), woodMat, [-0.28, 0.27, 0]);
        K.add(THREE, rig, new THREE.TorusGeometry(0.37, 0.024, 6, 14), ironMat, [-0.28, 0.45, 0], [Math.PI / 2, 0, 0]);
        K.add(THREE, rig, new THREE.TorusGeometry(0.4, 0.024, 6, 14), ironMat, [-0.28, 0.12, 0], [Math.PI / 2, 0, 0]);
        K.add(THREE, rig, new THREE.BoxGeometry(0.46, 0.1, 0.32), ironMat, [-0.28, 0.59, 0]);
        K.add(THREE, rig, new THREE.BoxGeometry(0.24, 0.2, 0.2), ironMat, [-0.28, 0.72, 0]);
        K.add(THREE, rig, new THREE.BoxGeometry(0.56, 0.14, 0.28), ironMat, [-0.28, 0.86, 0]);
        K.add(THREE, rig, new THREE.ConeGeometry(0.11, 0.34, 8), ironMat, [-0.66, 0.86, 0], [0, 0, Math.PI / 2]); // anvil horn
        // Hammer resting on anvil + Forge Coal Pan
        const hammer = K.joint(THREE, rig, -0.24, 0.97, 0.04);
        hammer.rotation.y = 0.4;
        K.add(THREE, hammer, new THREE.CylinderGeometry(0.022, 0.024, 0.42, 6), woodMat, [0, 0, 0], [Math.PI / 2, 0, 0]);
        K.add(THREE, hammer, new THREE.BoxGeometry(0.14, 0.09, 0.09), bronzeMat, [0, 0.02, 0.2]);
        K.add(THREE, rig, new THREE.BoxGeometry(0.36, 0.08, 0.36), ironMat, [0.42, 0.04, 0.12]);
        [[-0.08, 0.04], [0.06, -0.04], [0, 0.07]].forEach(([cx, cz]) => {
          K.add(THREE, rig, new THREE.DodecahedronGeometry(0.06, 0), hpMat, [0.42 + cx, 0.1, 0.12 + cz]);
        });

        // Side Potion Table + Braces + 3 Lathe Sculpted Glowing Flasks with Collars
        K.add(THREE, rig, new THREE.BoxGeometry(0.58, 0.08, 0.44), woodMat, [0.42, 0.64, 0]);
        K.add(THREE, rig, new THREE.BoxGeometry(0.54, 0.05, 0.4), ironMat, [0.42, 0.24, 0]);
        [[0.2, 0.14], [0.64, 0.14], [0.2, -0.14], [0.64, -0.14]].forEach(([lx, lz]) => {
          K.add(THREE, rig, new THREE.CylinderGeometry(0.032, 0.032, 0.62, 6), ironMat, [lx, 0.31, lz]);
        });
        const flasks = [];
        [[0.26, hpMat], [0.42, mpMat], [0.58, toxMat]].forEach(([fx, fMat], idx) => {
          const fl = K.lathe(THREE, [[0, 0], [0.068, 0.01], [0.075, 0.08], [0.028, 0.14], [0.036, 0.18]], 10, fMat);
          fl.position.set(fx, 0.68, idx === 1 ? -0.04 : 0.04);
          rig.add(fl);
          K.add(THREE, fl, new THREE.TorusGeometry(0.034, 0.008, 5, 10), bronzeMat, [0, 0.15, 0], [Math.PI / 2, 0, 0]);
          K.add(THREE, fl, new THREE.CylinderGeometry(0.024, 0.02, 0.04, 6), woodMat, [0, 0.19, 0]);
          flasks.push(fl);
        });

        K.createPropAnimator(root, ['idle', 'forge_glow', 'brew_bubble'], (t, anim) => {
          hammer.position.y = anim === 'forge_glow' ? 0.97 + Math.abs(Math.sin(t * 7)) * 0.14 : 0.97 + Math.sin(t * 2) * 0.008;
          flasks.forEach((fl, i) => {
            fl.position.y = anim === 'brew_bubble' ? 0.68 + Math.abs(Math.sin(t * 6 + i)) * 0.05 : 0.68 + Math.sin(t * 2.5 + i) * 0.01;
          });
        });
        return root;
      }
    },

    // ================================================================
    // 10. CURSED CRYPT SARCOPHAGUS
    // ================================================================
    {
      id: 'gg-prop-sarcophagus',
      name: 'Cursed Crypt Sarcophagus',
      game: 'GraveGain 3D / 2D',
      category: 'Props',
      tags: ['sarcophagus', 'crypt', 'tomb', 'skeleton', 'cursed', 'animated'],
      description: 'Stepped granite tomb dais with gold-trimmed sarcophagus box, heavy sliding stone lid, glowing purple seal rune, and rising skeletal hands inside (3 animations).',
      build: function createCursedSarcophagus(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const stoneMat = K.mat(THREE, { color: 0x475569, accent: 0x1e293b, texKind: 'stone', bumpKind: 'stone', roughness: 0.88 });
        const goldMat = K.mat(THREE, { color: 0xd97706, accent: 0xfef08a, texKind: 'metal', roughness: 0.3, metalness: 0.82 });
        const boneMat = K.mat(THREE, { color: 0xe7e5e4, texKind: 'bone', roughness: 0.7 });
        const darkMat = K.mat(THREE, { color: 0x0f172a, roughness: 0.95 });
        const curseMat = K.mat(THREE, { color: 0xc084fc, emissive: 0x9333ea, emissiveIntensity: 1.1 });

        // Stepped Dais & Hollow Sarcophagus Box
        K.add(THREE, rig, new THREE.BoxGeometry(1.12, 0.14, 1.92), stoneMat, [0, 0.07, 0]);
        K.add(THREE, rig, new THREE.BoxGeometry(0.84, 0.42, 1.62), stoneMat, [0, 0.35, 0]);
        K.add(THREE, rig, new THREE.BoxGeometry(0.88, 0.08, 1.66), goldMat, [0, 0.52, 0]);
        K.add(THREE, rig, new THREE.BoxGeometry(0.62, 0.08, 1.38), curseMat, [0, 0.54, 0]);

        // Rising Skeletal Hands + Skull inside
        const hands = K.joint(THREE, rig, 0, 0.42, 0);
        [-0.18, 0.18].forEach((hx, i) => {
          hands.add(K.makeHand(THREE, boneMat, darkMat, i === 0 ? -1 : 1, { scale: 1.2, claws: true })).position.set(hx, 0.15, i === 0 ? 0.22 : -0.18);
        });

        // Sliding Articulated Lid + Carved Effigy + Skull Relief
        const lid = K.joint(THREE, rig, 0, 0.62, 0);
        K.add(THREE, lid, new THREE.BoxGeometry(0.86, 0.14, 1.64), stoneMat);
        K.add(THREE, lid, new THREE.BoxGeometry(0.68, 0.08, 1.36), goldMat, [0, 0.08, 0]);
        const sk = K.makeSkull(THREE, goldMat, darkMat, curseMat, { scale: 0.8 });
        sk.rotation.x = -Math.PI / 2;
        sk.position.set(0, 0.16, -0.36);
        lid.add(sk);
        K.add(THREE, lid, new THREE.OctahedronGeometry(0.11, 0), curseMat, [0, 0.16, 0.18]);

        K.createPropAnimator(root, ['opening', 'sealed', 'cursed_rise'], (t, anim) => {
          lid.position.set(0, 0.62, 0);
          lid.rotation.set(0, 0, 0);
          hands.position.y = 0.42;
          if (anim === 'opening') {
            lid.position.x = 0.36;
            lid.rotation.y = 0.25;
            hands.position.y = 0.46 + Math.sin(t * 3) * 0.08;
          } else if (anim === 'cursed_rise') {
            lid.position.x = 0.54;
            lid.rotation.y = 0.42;
            hands.position.y = 0.68 + Math.sin(t * 4) * 0.12;
          } else {
            lid.position.y = 0.62 + Math.sin(t * 2.2) * 0.008;
          }
        });
        return root;
      }
    },

    // ================================================================
    // 11. CORRUPTED NECRO-ARRAY OBELISK
    // ================================================================
    {
      id: 'gg-prop-necro-pylon',
      name: 'Corrupted Necro-Array Obelisk',
      game: 'GraveGain 3D / 2D',
      category: 'Props',
      tags: ['obelisk', 'pylon', 'necro', 'array', 'void', 'animated'],
      description: 'Tiered hexagonal obsidian obelisk with levitating segmented dark-metal shards, glowing violet beam core, and counter-rotating energy containment rings (3 animations).',
      build: function createNecroPylon(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const obsMat = K.mat(THREE, { color: 0x1e1b4b, accent: 0x4c1d95, texKind: 'armor', roughness: 0.35, metalness: 0.72 });
        const trimMat = K.mat(THREE, { color: 0x6366f1, texKind: 'metal', roughness: 0.3, metalness: 0.85 });
        const voidMat = K.mat(THREE, { color: 0xd946ef, emissive: 0x9333ea, emissiveIntensity: 1.25 });

        K.add(THREE, rig, new THREE.CylinderGeometry(0.62, 0.74, 0.18, 6), obsMat, [0, 0.09, 0]);
        K.add(THREE, rig, new THREE.CylinderGeometry(0.42, 0.52, 0.16, 6), trimMat, [0, 0.24, 0]);
        K.add(THREE, rig, new THREE.CylinderGeometry(0.06, 0.08, 1.85, 8), voidMat, [0, 1.18, 0]);
        K.rivetRing(THREE, rig, 0.56, 6, 0.035, voidMat, 0.18, 'y');

        // 4 Diagonal Buttress Fins & Conduit Tubes + Vertical Energy Rails
        for (let b = 0; b < 4; b++) {
          const ba = (b / 4) * Math.PI * 2 + Math.PI / 4;
          K.add(THREE, rig, new THREE.BoxGeometry(0.12, 0.48, 0.24), obsMat, [Math.cos(ba) * 0.46, 0.36, Math.sin(ba) * 0.46], [0, -ba, 0]);
          K.add(THREE, rig, new THREE.BoxGeometry(0.05, 1.25, 0.05), trimMat, [Math.cos(ba) * 0.38, 1.1, Math.sin(ba) * 0.38]);
          K.add(THREE, rig, new THREE.OctahedronGeometry(0.065, 0), voidMat, [Math.cos(ba) * 0.38, 1.76, Math.sin(ba) * 0.38]);
        }

        // Floating Obelisk Shards
        const shards = [];
        for (let i = 0; i < 4; i++) {
          const y = 0.58 + i * 0.36;
          const r = 0.28 - i * 0.04;
          const sh = K.add(THREE, rig, new THREE.CylinderGeometry(r * 0.82, r, 0.24, 6), obsMat, [0, y, 0]);
          shards.push(sh);
        }
        const tip = K.add(THREE, rig, new THREE.ConeGeometry(0.18, 0.42, 6), obsMat, [0, 2.02, 0]);
        shards.push(tip);

        const ring1 = K.add(THREE, rig, new THREE.TorusGeometry(0.46, 0.024, 6, 18), voidMat, [0, 1.15, 0], [Math.PI / 2, 0, 0]);
        const ring2 = K.add(THREE, rig, new THREE.TorusGeometry(0.36, 0.02, 6, 16), trimMat, [0, 1.5, 0], [Math.PI / 3, 0, 0]);

        K.createPropAnimator(root, ['idle', 'charging', 'overload'], (t, anim) => {
          const spd = anim === 'overload' ? 5.5 : anim === 'charging' ? 2.8 : 1.2;
          ring1.rotation.z = t * spd;
          ring2.rotation.y = -t * spd * 1.4;
          ring2.rotation.x = Math.PI / 3 + Math.sin(t * spd) * 0.4;
          shards.forEach((sh, i) => {
            sh.rotation.y = t * (i % 2 === 0 ? 0.8 : -0.8);
            sh.position.y = (i === 4 ? 2.02 : 0.58 + i * 0.36) + Math.sin(t * spd + i) * 0.04;
          });
        });
        return root;
      }
    },

    // ================================================================
    // 12. DUNGEON LOOT CACHE (GOLD, POTIONS & SCROLL)
    // ================================================================
    {
      id: 'gg-prop-loot-hoard',
      name: 'Dungeon Loot Cache (Gold, Potions & Scroll)',
      game: 'GraveGain 3D / 2D',
      category: 'Props',
      tags: ['loot', 'gold', 'potion', 'scroll', 'pickup', 'animated'],
      description: 'Collectible loot cache featuring stacked gold coins, twin glowing Lathe-sculpted HP & Mana flasks with corks, wax-sealed lore scroll, and hovering golden rarity prism (3 animations).',
      build: function createLootCache(THREE) {
        const root = new THREE.Group();
        const rig = K.joint(THREE, root, 0, 0, 0);

        const stoneMat = K.mat(THREE, { color: 0x334155, texKind: 'stone', roughness: 0.9 });
        const goldMat = K.mat(THREE, { color: 0xfbbf24, accent: 0xfef08a, texKind: 'metal', roughness: 0.2, metalness: 0.9 });
        const hpMat = K.mat(THREE, { color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 0.95, transparent: true, opacity: 0.88 });
        const mpMat = K.mat(THREE, { color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.95, transparent: true, opacity: 0.88 });
        const paperMat = K.mat(THREE, { color: 0xfef3c7, texKind: 'cloth', roughness: 0.8 });
        const woodMat = K.mat(THREE, { color: 0x78350f, roughness: 0.8 });

        K.add(THREE, rig, new THREE.CylinderGeometry(0.68, 0.74, 0.08, 12), stoneMat, [0, 0.04, 0]);
        K.add(THREE, rig, new THREE.TorusGeometry(0.7, 0.025, 6, 18), goldMat, [0, 0.08, 0], [Math.PI / 2, 0, 0]);
        // Gold Coin Stacks
        [[-0.3, 0.16, 0.18, 5], [-0.14, 0.12, 0.28, 4], [-0.36, 0.12, -0.06, 4], [-0.04, 0.1, 0.36, 3]].forEach(([cx, h, cz, cnt]) => {
          for (let i = 0; i < cnt; i++) {
            K.add(THREE, rig, new THREE.CylinderGeometry(0.085, 0.085, 0.032, 10), goldMat, [cx, 0.095 + i * 0.036, cz]);
          }
        });
        // Twin Potion Flasks with Brass Collars
        [[0.26, 0.08, hpMat], [0.06, -0.24, mpMat]].forEach(([fx, fz, fMat]) => {
          const fl = K.lathe(THREE, [[0, 0], [0.09, 0.01], [0.1, 0.11], [0.035, 0.19], [0.045, 0.24]], 12, fMat);
          fl.position.set(fx, 0.08, fz);
          rig.add(fl);
          K.add(THREE, fl, new THREE.TorusGeometry(0.042, 0.009, 5, 10), goldMat, [0, 0.2, 0], [Math.PI / 2, 0, 0]);
          K.add(THREE, fl, new THREE.CylinderGeometry(0.03, 0.025, 0.05, 7), woodMat, [0, 0.25, 0]);
        });
        // Wax-Sealed Lore Scroll with End Caps
        const scroll = K.joint(THREE, rig, -0.05, 0.14, -0.05);
        scroll.rotation.set(0, 0.45, Math.PI / 2);
        K.add(THREE, scroll, new THREE.CylinderGeometry(0.065, 0.065, 0.44, 10), paperMat);
        K.add(THREE, scroll, new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10), hpMat);
        K.add(THREE, scroll, new THREE.SphereGeometry(0.055, 6, 5), goldMat, [0, 0.23, 0]);
        K.add(THREE, scroll, new THREE.SphereGeometry(0.055, 6, 5), goldMat, [0, -0.23, 0]);

        // Hovering Rarity Prism + Halo + Orbiting Sparkle Motes
        const prism = K.add(THREE, rig, new THREE.OctahedronGeometry(0.14, 0), goldMat, [0, 0.72, 0]);
        const halo = K.add(THREE, rig, new THREE.TorusGeometry(0.24, 0.015, 6, 18), mpMat, [0, 0.72, 0], [Math.PI / 2, 0, 0]);
        for (let m = 0; m < 4; m++) {
          const ma = (m / 4) * Math.PI * 2;
          K.add(THREE, halo, new THREE.OctahedronGeometry(0.04, 0), goldMat, [Math.cos(ma) * 0.24, Math.sin(ma) * 0.24, 0]);
        }

        K.createPropAnimator(root, ['idle', 'sparkle', 'magnet_pull'], (t, anim) => {
          prism.rotation.y = t * (anim === 'magnet_pull' ? 5.5 : 2.2);
          prism.position.y = 0.72 + Math.sin(t * 3.2) * 0.08;
          halo.rotation.z = -t * 2.5;
          halo.position.y = prism.position.y;
          rig.position.y = anim === 'magnet_pull' ? Math.abs(Math.sin(t * 4)) * 0.14 : 0;
        });
        return root;
      }
    }
  );
})();
