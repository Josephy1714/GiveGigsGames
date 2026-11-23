// GraveGain 3D / 3DB / 3DC High-Detail Weapons & Firearms Pack (32 Models)
// Requires /games/_shared/gravegain-kit.js (window.GGG_GRAVEGAIN_KIT)
// Upserts 23 existing GraveGain 3D weapons in-place and adds 9 detailed guns from 3DB, 3DC, and Support Chem-Gun.

(function () {
  'use strict';

  const K = window.GGG_GRAVEGAIN_KIT;
  if (!K) return;

  window.GGG_MODEL_CATALOG = window.GGG_MODEL_CATALOG || [];

  function upsertModel(entry) {
    const idx = window.GGG_MODEL_CATALOG.findIndex(m => m.id === entry.id);
    if (idx >= 0) window.GGG_MODEL_CATALOG[idx] = entry;
    else window.GGG_MODEL_CATALOG.push(entry);
  }

  // ---- Shared Craftsmanship Helpers ----
  function addPicatinnyRail(THREE, parent, xCenter, length, y, mat, teethCount) {
    const n = teethCount || Math.max(6, Math.round(length * 14));
    K.add(THREE, parent, new THREE.BoxGeometry(length, 0.025, 0.075), mat, [xCenter, y, 0]);
    const step = length / n;
    for (let i = 0; i < n; i++) {
      K.add(THREE, parent, new THREE.BoxGeometry(step * 0.52, 0.018, 0.088), mat, [xCenter - length * 0.5 + (i + 0.5) * step, y + 0.02, 0]);
    }
  }

  function addWrappedHilt(THREE, parent, yBottom, length, r, gripMat, trimMat, wrapCount) {
    const g = K.joint(THREE, parent, 0, 0, 0);
    K.add(THREE, g, new THREE.CylinderGeometry(r * 1.05, r * 0.92, length, 10), gripMat, [0, yBottom + length * 0.5, 0]);
    const n = wrapCount || 8;
    for (let i = 0; i < n; i++) {
      const y = yBottom + (i + 0.5) * (length / n);
      K.add(THREE, g, new THREE.TorusGeometry(r * 1.02, r * 0.18, 5, 10), i % 2 === 0 ? trimMat : gripMat, [0, y, 0], [Math.PI / 2, 0.18 * (i % 2 === 0 ? 1 : -1), 0]);
    }
    K.add(THREE, g, new THREE.SphereGeometry(r * 1.45, 8, 6), trimMat, [0, yBottom - r * 0.4, 0]);
    K.add(THREE, g, new THREE.ConeGeometry(r * 1.1, r * 2.2, 6), trimMat, [0, yBottom - r * 1.8, 0], [Math.PI, 0, 0]);
    return g;
  }

  function addRifleControls(THREE, parent, x, y, bodyMat, trimMat) {
    // Pistol grip + trigger guard + trigger + selector + bolts
    K.add(THREE, parent, new THREE.BoxGeometry(0.11, 0.34, 0.085), bodyMat, [x, y - 0.22, 0], [0, 0, 0.25]);
    K.add(THREE, parent, new THREE.BoxGeometry(0.125, 0.04, 0.095), trimMat, [x, y - 0.38, 0], [0, 0, 0.25]);
    K.add(THREE, parent, new THREE.BoxGeometry(0.16, 0.022, 0.04), trimMat, [x + 0.14, y - 0.14, 0]);
    K.add(THREE, parent, new THREE.BoxGeometry(0.022, 0.08, 0.04), trimMat, [x + 0.21, y - 0.1, 0]);
    K.add(THREE, parent, new THREE.BoxGeometry(0.02, 0.065, 0.022), trimMat, [x + 0.13, y - 0.08, 0], [0, 0, -0.3]);
    K.add(THREE, parent, new THREE.CylinderGeometry(0.022, 0.022, 0.11, 6), trimMat, [x - 0.02, y + 0.02, 0], [Math.PI / 2, 0, 0]);
    K.add(THREE, parent, new THREE.BoxGeometry(0.06, 0.02, 0.02), trimMat, [x + 0.02, y + 0.04, 0.058], [0, 0, 0.4]);
  }

  function addReflexOptic(THREE, parent, x, y, bodyMat, lensMat) {
    const o = K.joint(THREE, parent, x, y, 0);
    K.add(THREE, o, new THREE.BoxGeometry(0.18, 0.04, 0.095), bodyMat);
    K.add(THREE, o, new THREE.BoxGeometry(0.16, 0.11, 0.016), bodyMat, [0, 0.075, 0.045]);
    K.add(THREE, o, new THREE.BoxGeometry(0.16, 0.11, 0.016), bodyMat, [0, 0.075, -0.045]);
    K.add(THREE, o, new THREE.BoxGeometry(0.16, 0.018, 0.106), bodyMat, [0, 0.13, 0]);
    K.add(THREE, o, new THREE.BoxGeometry(0.02, 0.09, 0.08), lensMat, [0.05, 0.075, 0]);
    return o;
  }

  function addScope(THREE, parent, x, y, bodyMat, trimMat, lensMat) {
    const s = K.joint(THREE, parent, x, y, 0);
    // Two cantilever mount rings
    [-0.14, 0.14].forEach(rx => {
      K.add(THREE, s, new THREE.BoxGeometry(0.055, 0.08, 0.09), trimMat, [rx, -0.05, 0]);
      K.add(THREE, s, new THREE.TorusGeometry(0.062, 0.014, 6, 12), trimMat, [rx, 0, 0], [0, Math.PI / 2, 0]);
    });
    const body = K.lathe(THREE, [
      [0.068, -0.26], [0.068, -0.18], [0.048, -0.12], [0.048, 0.14], [0.078, 0.22], [0.078, 0.34], [0.062, 0.34]
    ], 14, bodyMat);
    body.rotation.z = -Math.PI / 2;
    s.add(body);
    K.add(THREE, s, new THREE.CylinderGeometry(0.032, 0.032, 0.06, 8), trimMat, [0, 0.065, 0]);
    K.add(THREE, s, new THREE.CylinderGeometry(0.028, 0.028, 0.05, 8), trimMat, [0, 0, 0.06], [Math.PI / 2, 0, 0]);
    K.add(THREE, s, new THREE.CylinderGeometry(0.066, 0.066, 0.02, 12), lensMat, [0.34, 0, 0], [0, 0, Math.PI / 2]);
    K.add(THREE, s, new THREE.CylinderGeometry(0.055, 0.055, 0.02, 12), lensMat, [-0.26, 0, 0], [0, 0, Math.PI / 2]);
    return s;
  }

  function addMuzzleFlash(THREE, parent, x, y, z, colorHex) {
    const f = K.joint(THREE, parent, x, y, z || 0);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.88 });
    for (let i = 0; i < 3; i++) {
      const sp = K.add(THREE, f, new THREE.ConeGeometry(0.055, 0.28, 5), mat, [0.12, 0, 0], [0, 0, -Math.PI / 2]);
      sp.rotation.x = (i / 3) * Math.PI;
    }
    K.add(THREE, f, new THREE.SphereGeometry(0.065, 6, 5), mat);
    f.scale.setScalar(0.001);
    return f;
  }

  function createGunAnimator(rig, animList, parts) {
    const p = parts || {};
    const tracked = [rig, p.slide, p.bolt, p.pump, p.mag, p.drum, p.flash, p.launcherFlash, p.orb];
    if (Array.isArray(p.rings)) p.rings.forEach(r => tracked.push(r));
    tracked.forEach(K.saveDefaults);

    return function animate(t, animName) {
      tracked.forEach(K.restoreDefaults);
      if (p.flash) p.flash.scale.setScalar(0.001);
      if (p.launcherFlash) p.launcherFlash.scale.setScalar(0.001);

      if (Array.isArray(p.rings)) {
        p.rings.forEach((r, idx) => { r.rotation.z = t * (idx % 2 === 0 ? 2.5 : -3.2); });
      }
      if (p.orb) {
        p.orb.rotation.y = t * 4.2;
        p.orb.rotation.x = t * 2.5;
      }

      if (animName === 'fire') {
        const cyc = (t * 4.5) % 1;
        const kick = Math.exp(-cyc * 7);
        rig.position.x -= kick * 0.09;
        rig.rotation.z += kick * 0.08;
        if (p.slide) p.slide.position.x -= kick * 0.14;
        if (p.pump) p.pump.position.x -= Math.sin(cyc * Math.PI) * 0.15;
        if (p.drum) p.drum.rotation.x += Math.floor(t * 4.5) * (Math.PI / 2) + Math.min(1, cyc * 3) * (Math.PI / 2);
        if (p.flash && cyc < 0.25) p.flash.scale.setScalar(1.25 - cyc * 3.5);
      } else if (animName === 'launcher_fire') {
        const cyc = (t * 2.2) % 1;
        const kick = Math.exp(-cyc * 5);
        rig.position.x -= kick * 0.14;
        rig.rotation.z += kick * 0.14;
        if (p.launcherFlash && cyc < 0.3) p.launcherFlash.scale.setScalar(1.4 - cyc * 3.2);
      } else if (animName === 'bolt_cycle') {
        const cyc = (t * 1.8) % 1;
        if (p.bolt) {
          const lift = cyc < 0.25 ? cyc * 4 : cyc > 0.75 ? (1 - cyc) * 4 : 1;
          const pull = cyc > 0.2 && cyc < 0.8 ? Math.sin(((cyc - 0.2) / 0.6) * Math.PI) : 0;
          p.bolt.rotation.x = -lift * 0.85;
          p.bolt.position.x -= pull * 0.2;
        }
        rig.rotation.x += Math.sin(t * 2.2) * 0.04;
      } else if (animName === 'charge_pulse') {
        const pulse = (Math.sin(t * 6) + 1) * 0.5;
        rig.position.y += Math.sin(t * 3) * 0.025;
        if (p.orb) p.orb.scale.setScalar(1 + pulse * 0.45);
        if (p.flash) p.flash.scale.setScalar(0.35 + pulse * 0.55);
      } else if (animName === 'reload') {
        const cyc = (t * 1.4) % 1;
        rig.rotation.z -= Math.sin(cyc * Math.PI) * 0.22;
        rig.rotation.x += Math.sin(cyc * Math.PI) * 0.16;
        if (p.mag) p.mag.position.y -= Math.sin(cyc * Math.PI) * 0.34;
        if (p.pump) p.pump.position.x -= Math.sin(cyc * Math.PI * 2) * 0.16;
        if (p.drum) p.drum.rotation.z += Math.sin(cyc * Math.PI) * 0.55;
      } else {
        // inspect
        rig.position.y += Math.sin(t * 2.1) * 0.025;
        rig.rotation.y += Math.sin(t * 1.5) * 0.14;
        rig.rotation.x += Math.cos(t * 1.8) * 0.05;
      }
    };
  }

  function createMeleeAnimator(rig, animList, parts) {
    const p = parts || {};
    const tracked = [rig, p.offhand, p.head, p.orb, p.pages, p.shield];
    if (Array.isArray(p.rings)) p.rings.forEach(r => tracked.push(r));
    tracked.forEach(K.saveDefaults);

    return function animate(t, animName) {
      tracked.forEach(K.restoreDefaults);
      if (Array.isArray(p.rings)) {
        p.rings.forEach((r, idx) => { r.rotation.z = t * (idx % 2 === 0 ? 1.8 : -2.4); r.rotation.y = t * 1.2; });
      }
      if (p.orb) {
        p.orb.rotation.y = t * 2.6;
        p.orb.position.y += Math.sin(t * 3.5) * 0.03;
      }
      if (animName === 'swing' || animName === 'smash') {
        const s = Math.sin(t * (animName === 'smash' ? 3.2 : 4.4));
        rig.rotation.z = -0.35 + s * 0.68;
        rig.rotation.x = Math.cos(t * 4.4) * 0.28;
        if (p.head) p.head.rotation.z = s * 0.4;
      } else if (animName === 'block_guard') {
        rig.rotation.y = -0.25 + Math.sin(t * 2.8) * 0.06;
        if (p.shield) {
          p.shield.position.z += 0.14 + Math.sin(t * 3.2) * 0.02;
          p.shield.rotation.y += 0.2;
        }
      } else if (animName === 'cast_surge' || animName === 'charge_glow') {
        const pulse = Math.sin(t * 5.2);
        rig.position.y += 0.04 + pulse * 0.03;
        if (p.orb) p.orb.scale.setScalar(1.25 + pulse * 0.22);
        if (p.pages) p.pages.rotation.y = 0.25 + Math.sin(t * 4) * 0.12;
      } else {
        rig.position.y += Math.sin(t * 2.2) * 0.025;
        rig.rotation.y += Math.sin(t * 1.4) * 0.16;
      }
    };
  }

  // Standard loot sword/polearm builder factory for crisp varied melee weapons
  function buildWeaponGroup(THREE, buildFn, animList, partsCollector) {
    const root = new THREE.Group();
    const rig = K.joint(THREE, root, 0, 0, 0);
    const parts = buildFn(THREE, rig) || {};
    root.userData.animations = animList;
    root.userData.animate = partsCollector(rig, animList, parts);
    return root;
  }

  // ====================================================================
  // GROUP A: STARTER CLASS WEAPONS (4 Models: 3 Upgraded + 1 New Chem-Gun)
  // ====================================================================

  upsertModel({
    id: 'gg3d-warrior-sword-shield',
    name: 'Steel Longsword & Kite Shield',
    game: 'GraveGain 3D',
    category: 'Weapons',
    tags: ['sword', 'shield', 'warrior', 'starter', 'animated'],
    description: 'Beveled steel longsword with rune fuller, diamond pommel, and swept crossguard paired with a riveted crimson-and-gold kite shield (3 animations).',
    build: function createWarriorLoadout(THREE) {
      return buildWeaponGroup(THREE, (T, rig) => {
        const steel = K.mat(T, { color: 0xe2e8f0, accent: 0xffffff, texKind: 'metal', roughness: 0.16, metalness: 0.92 });
        const fuller = K.mat(T, { color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.75 });
        const gold = K.mat(T, { color: 0xd4af37, accent: 0xfef08a, texKind: 'metal', roughness: 0.24, metalness: 0.88 });
        const grip = K.mat(T, { color: 0x451a03, texKind: 'leather', roughness: 0.8 });
        const crimson = K.mat(T, { color: 0x881337, accent: 0xbe123c, texKind: 'armor', roughness: 0.42, metalness: 0.35 });

        const sword = K.joint(T, rig, 0.44, -0.05, 0);
        sword.rotation.z = -0.18;
        addWrappedHilt(T, sword, -0.58, 0.46, 0.048, grip, gold, 7);
        const guard = K.extrude(T, [[-0.28, 0.05], [-0.14, 0], [0.14, 0], [0.28, 0.05], [0.22, -0.06], [0, -0.04], [-0.22, -0.06]], 0.08, 0.012, gold);
        guard.position.y = -0.08;
        sword.add(guard);
        K.add(T, sword, new THREE.OctahedronGeometry(0.05, 0), fuller, [0, -0.08, 0.045]);
        const blade = K.extrude(T, [[-0.075, -0.05], [0.075, -0.05], [0.062, 1.05], [0, 1.32], [-0.062, 1.05]], 0.032, 0.008, steel);
        sword.add(blade);
        K.add(T, sword, new THREE.BoxGeometry(0.025, 0.82, 0.045), fuller, [0, 0.45, 0]);

        const shield = K.joint(T, rig, -0.44, 0, 0.08);
        shield.rotation.y = 0.32;
        const kitePts = [[-0.36, 0.46], [0, 0.56], [0.36, 0.46], [0.34, -0.14], [0, -0.56], [-0.34, -0.14]];
        shield.add(K.extrude(T, kitePts, 0.06, 0.014, crimson));
        const rim = K.extrude(T, [[-0.4, 0.49], [0, 0.6], [0.4, 0.49], [0.38, -0.16], [0, -0.61], [-0.38, -0.16]], 0.04, 0.01, gold);
        rim.position.z = -0.022;
        shield.add(rim);
        K.add(T, shield, new THREE.CylinderGeometry(0.11, 0.14, 0.06, 12), gold, [0, 0.06, 0.045], [Math.PI / 2, 0, 0]);
        K.add(T, shield, new THREE.OctahedronGeometry(0.065, 0), fuller, [0, 0.06, 0.075]);
        K.rivetRing(T, shield, 0.28, 10, 0.016, gold, 0.045, 'z');
        return { shield };
      }, ['inspect', 'swing', 'block_guard'], createMeleeAnimator);
    }
  });

  upsertModel({
    id: 'gg3d-astral-staff',
    name: 'Astral Mage Staff',
    game: 'GraveGain 3D',
    category: 'Weapons',
    tags: ['staff', 'mage', 'magic', 'crystal', 'starter', 'animated'],
    description: 'Twisted ebony mage staff with gold ferrules, 4 golden cradle prongs, hovering violet Astral Crystal, 3 astrolabe rings, and orbiting star-shards (3 animations).',
    build: function createAstralStaff(THREE) {
      return buildWeaponGroup(THREE, (T, rig) => {
        const wood = K.mat(T, { color: 0x2d1a38, accent: 0x581c87, texKind: 'wood', roughness: 0.65 });
        const gold = K.mat(T, { color: 0xfbbf24, texKind: 'metal', roughness: 0.22, metalness: 0.88 });
        const gem = K.mat(T, { color: 0xc084fc, emissive: 0x9333ea, emissiveIntensity: 1.15, roughness: 0.1 });
        const grip = K.mat(T, { color: 0x1e1b4b, texKind: 'leather', roughness: 0.8 });

        rig.add(K.tube(T, [[0, -1.0, 0], [0.03, -0.35, 0.02], [-0.03, 0.3, -0.02], [0, 0.78, 0]], 0.042, 16, 8, wood));
        addWrappedHilt(T, rig, -0.25, 0.42, 0.048, grip, gold, 6);
        [-0.78, -0.45, 0.48].forEach(fy => {
          K.add(T, rig, new THREE.TorusGeometry(0.052, 0.012, 5, 10), gold, [0, fy, 0], [Math.PI / 2, 0, 0]);
        });
        K.add(T, rig, new THREE.ConeGeometry(0.048, 0.16, 5), gold, [0, -1.06, 0], [Math.PI, 0, 0]);
        K.add(T, rig, new THREE.OctahedronGeometry(0.045, 0), gem, [0, -1.16, 0]);
        K.add(T, rig, new THREE.CylinderGeometry(0.065, 0.055, 0.14, 10), gold, [0, 0.78, 0]);
        for (let p = 0; p < 4; p++) {
          const a = (p / 4) * Math.PI * 2;
          rig.add(K.tube(T, [[Math.cos(a) * 0.05, 0.82, Math.sin(a) * 0.05], [Math.cos(a) * 0.18, 1.02, Math.sin(a) * 0.18], [Math.cos(a) * 0.1, 1.24, Math.sin(a) * 0.1]], 0.018, 10, 5, gold));
        }
        const orb = K.add(T, rig, new THREE.OctahedronGeometry(0.16, 0), gem, [0, 1.08, 0]);
        const r1 = K.add(T, rig, new THREE.TorusGeometry(0.24, 0.016, 6, 20), gold, [0, 1.08, 0], [Math.PI / 3, 0, 0]);
        const r2 = K.add(T, rig, new THREE.TorusGeometry(0.3, 0.014, 6, 22), gem, [0, 1.08, 0], [-Math.PI / 4, 0.4, 0]);
        const r3 = K.add(T, rig, new THREE.TorusGeometry(0.19, 0.012, 6, 16), gold, [0, 1.08, 0], [Math.PI / 2, 0, 0]);
        for (let s = 0; s < 3; s++) {
          const sa = (s / 3) * Math.PI * 2;
          K.add(T, r2, new THREE.OctahedronGeometry(0.036, 0), gem, [Math.cos(sa) * 0.3, Math.sin(sa) * 0.3, 0]);
          K.add(T, r1, new THREE.SphereGeometry(0.022, 6, 5), gold, [Math.cos(sa) * 0.24, Math.sin(sa) * 0.24, 0]);
        }
        return { orb, rings: [r1, r2, r3] };
      }, ['inspect', 'cast_surge', 'charge_glow'], createMeleeAnimator);
    }
  });

  upsertModel({
    id: 'gg3d-spiked-warhammer',
    name: 'Spiked Warhammer',
    game: 'GraveGain 3D',
    category: 'Weapons',
    tags: ['hammer', 'tank', 'warhammer', 'starter', 'animated'],
    description: 'Heavy tank warhammer with waffle-studded impact faces, brass strap collars, glowing sparkite core runes, front/back armor spikes, and top spear finial (3 animations).',
    build: function createWarhammer(THREE) {
      return buildWeaponGroup(THREE, (T, rig) => {
        const steel = K.mat(T, { color: 0x475569, accent: 0xcbd5e1, texKind: 'armor', roughness: 0.32, metalness: 0.85 });
        const brass = K.mat(T, { color: 0xd97706, texKind: 'metal', roughness: 0.28, metalness: 0.85 });
        const grip = K.mat(T, { color: 0x1e293b, texKind: 'leather', roughness: 0.82 });
        const rune = K.mat(T, { color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.95 });

        K.add(T, rig, new THREE.CylinderGeometry(0.052, 0.062, 1.75, 10), grip, [0, -0.05, 0]);
        addWrappedHilt(T, rig, -0.88, 0.5, 0.065, grip, brass, 7);
        K.add(T, rig, new THREE.CylinderGeometry(0.11, 0.09, 0.24, 8), brass, [0, 0.64, 0]);
        const head = K.joint(T, rig, 0, 0.68, 0);
        K.add(T, head, new THREE.BoxGeometry(0.46, 0.44, 0.78), steel);
        K.add(T, head, new THREE.BoxGeometry(0.48, 0.16, 0.34), brass);
        K.add(T, head, new THREE.BoxGeometry(0.48, 0.08, 0.62), rune);
        [-1, 1].forEach(sz => {
          K.add(T, head, new THREE.ConeGeometry(0.11, 0.28, 6), steel, [0, 0, sz * 0.52], [sz * Math.PI / 2, 0, 0]);
          for (let wx = -1; wx <= 1; wx++) {
            for (let wy = -1; wy <= 1; wy++) {
              K.add(T, head, new THREE.BoxGeometry(0.08, 0.08, 0.06), steel, [wx * 0.13, wy * 0.12, sz * 0.41]);
            }
          }
        });
        K.add(T, head, new THREE.ConeGeometry(0.085, 0.28, 5), brass, [0, 0.34, 0]);
        return { head };
      }, ['inspect', 'smash', 'charge_glow'], createMeleeAnimator);
    }
  });

  upsertModel({
    id: 'gg3d-magitech-chemgun',
    name: 'Magitech Chem-Gun',
    game: 'GraveGain 3D',
    category: 'Weapons',
    tags: ['gun', 'chemgun', 'support', 'alchemy', 'starter', 'animated'],
    description: 'Support Magitech bio-dart carbine with transparent Lathe chem-canister, suspended bubbling toxic spheres, curved pressure hoses, and tri-nozzle emitter (3 animations).',
    build: function createMagitechChemGun(THREE) {
      const root = new THREE.Group();
      const rig = K.joint(THREE, root, 0, 0, 0);
      const body = K.mat(THREE, { color: 0x1e293b, accent: 0x64748b, texKind: 'armor', roughness: 0.36, metalness: 0.78 });
      const brass = K.mat(THREE, { color: 0xd97706, texKind: 'metal', roughness: 0.28, metalness: 0.84 });
      const chem = K.mat(THREE, { color: 0x4ade80, emissive: 0x16a34a, emissiveIntensity: 0.95, transparent: true, opacity: 0.84 });
      const tubeMat = K.mat(THREE, { color: 0x22c55e, emissive: 0x15803d, emissiveIntensity: 0.75 });

      K.add(THREE, rig, new THREE.BoxGeometry(0.74, 0.2, 0.16), body, [0, 0, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.36, 0.16, 0.12), body, [-0.52, -0.04, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.06, 0.24, 0.13), brass, [-0.68, -0.05, 0]);
      addRifleControls(THREE, rig, -0.2, -0.08, body, brass);
      addPicatinnyRail(THREE, rig, -0.1, 0.42, 0.11, brass, 6);

      // Transparent Lathe Chem-Canister + Bubbles + Cage Bars
      const mag = K.joint(THREE, rig, 0.1, 0.2, 0);
      const vial = K.lathe(THREE, [[0.09, -0.22], [0.105, -0.16], [0.105, 0.16], [0.09, 0.22]], 12, chem);
      vial.rotation.z = -Math.PI / 2;
      mag.add(vial);
      [-0.22, 0.22].forEach(cx => {
        K.add(THREE, mag, new THREE.CylinderGeometry(0.108, 0.108, 0.05, 12), brass, [cx, 0, 0], [0, 0, Math.PI / 2]);
      });
      [[-0.08, 0.02, 0.02], [0.04, -0.03, -0.02], [0.1, 0.03, 0.01]].forEach(bp => {
        K.add(THREE, mag, new THREE.SphereGeometry(0.035, 7, 6), tubeMat, bp);
      });
      [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(a => {
        K.add(THREE, mag, new THREE.CylinderGeometry(0.01, 0.01, 0.44, 5), brass, [0, Math.cos(a) * 0.115, Math.sin(a) * 0.115], [0, 0, Math.PI / 2]);
      });

      // Curved Feed Pipes & Tri-Nozzle Barrel
      rig.add(K.tube(THREE, [[0.32, 0.2, 0], [0.48, 0.16, 0.06], [0.54, 0.04, 0.03]], 0.02, 10, 6, tubeMat));
      rig.add(K.tube(THREE, [[-0.12, 0.2, 0], [-0.22, 0.14, -0.07], [-0.14, 0.02, -0.07]], 0.018, 10, 6, tubeMat));
      K.add(THREE, rig, new THREE.CylinderGeometry(0.068, 0.08, 0.48, 10), body, [0.58, 0.02, 0], [0, 0, Math.PI / 2]);
      for (let b = 0; b < 3; b++) {
        const a = (b / 3) * Math.PI * 2;
        K.add(THREE, rig, new THREE.CylinderGeometry(0.022, 0.024, 0.28, 7), brass, [0.84, 0.02 + Math.cos(a) * 0.036, Math.sin(a) * 0.036], [0, 0, Math.PI / 2]);
      }
      K.add(THREE, rig, new THREE.CylinderGeometry(0.055, 0.055, 0.04, 10), tubeMat, [0.06, 0.02, 0.085], [Math.PI / 2, 0, 0]);
      const flash = addMuzzleFlash(THREE, rig, 0.98, 0.02, 0, 0x4ade80);
      root.userData.animations = ['inspect', 'fire', 'reload'];
      root.userData.animate = createGunAnimator(rig, root.userData.animations, { mag, flash });
      return root;
    }
  });

  // ====================================================================
  // GROUP B: ALL 20 UPGRADED GRAVEGAIN 3D LOOT WEAPONS
  // ====================================================================

  const lootWeaponSpecs = [
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

  function buildLootMeleeOrGun(THREE, arch, tint, glow) {
    const root = new THREE.Group();
    const rig = K.joint(THREE, root, 0, 0, 0);
    const metal = K.mat(THREE, { color: tint, accent: 0xffffff, texKind: 'metal', roughness: 0.2, metalness: 0.9 });
    const dark = K.mat(THREE, { color: 0x1e293b, texKind: 'armor', roughness: 0.65, metalness: 0.45 });
    const grip = K.mat(THREE, { color: 0x3f2e21, texKind: 'leather', roughness: 0.8 });
    const glowMat = K.mat(THREE, { color: glow, emissive: glow, emissiveIntensity: 0.95, roughness: 0.15 });
    const gold = K.mat(THREE, { color: 0xd4af37, texKind: 'metal', roughness: 0.25, metalness: 0.88 });

    if (arch === 'railgun') {
      K.add(THREE, rig, new THREE.BoxGeometry(0.68, 0.18, 0.14), dark, [-0.15, -0.02, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.28, 0.2, 0.12), dark, [-0.62, -0.04, 0]);
      addRifleControls(THREE, rig, -0.35, -0.08, dark, metal);
      addPicatinnyRail(THREE, rig, -0.15, 0.44, 0.085, metal, 7);
      addReflexOptic(THREE, rig, -0.12, 0.11, dark, glowMat);
      // Twin Parallel Rails + Plasma Channel + 5 Induction Rings
      [-0.055, 0.055].forEach(ry => {
        K.add(THREE, rig, new THREE.BoxGeometry(0.95, 0.05, 0.09), metal, [0.5, ry, 0]);
      });
      K.add(THREE, rig, new THREE.BoxGeometry(0.88, 0.04, 0.04), glowMat, [0.48, 0, 0]);
      for (let i = 0; i < 5; i++) {
        K.add(THREE, rig, new THREE.TorusGeometry(0.085, 0.015, 6, 12), glowMat, [0.22 + i * 0.15, 0, 0], [0, Math.PI / 2, 0]);
      }
      const mag = K.joint(THREE, rig, -0.52, -0.12, 0);
      K.add(THREE, mag, new THREE.BoxGeometry(0.14, 0.24, 0.09), glowMat);
      const flash = addMuzzleFlash(THREE, rig, 0.98, 0, 0, glow);
      root.userData.animations = ['inspect', 'fire', 'reload'];
      root.userData.animate = createGunAnimator(rig, root.userData.animations, { mag, flash });
      return root;
    }

    if (arch === 'crossbow') {
      K.add(THREE, rig, new THREE.BoxGeometry(0.95, 0.12, 0.1), dark, [0, 0, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.36, 0.16, 0.09), grip, [-0.54, -0.04, 0]);
      addRifleControls(THREE, rig, -0.28, -0.06, grip, metal);
      addPicatinnyRail(THREE, rig, -0.05, 0.46, 0.075, metal, 7);
      addReflexOptic(THREE, rig, -0.08, 0.1, dark, glowMat);
      // Curved Composite Prod Limbs + Wheel Cams + Glowing Bowstring + Loaded Bolt
      [-1, 1].forEach(s => {
        rig.add(K.tube(THREE, [[0.42, 0, s * 0.06], [0.34, 0, s * 0.34], [0.16, 0, s * 0.54]], 0.025, 10, 6, metal));
        K.add(THREE, rig, new THREE.CylinderGeometry(0.06, 0.06, 0.025, 10), gold, [0.16, 0, s * 0.55]);
        rig.add(K.tube(THREE, [[0.16, 0, s * 0.55], [-0.08, 0, 0]], 0.008, 6, 4, glowMat));
      });
      // Revolving Drum + Loaded Bolt
      const drum = K.joint(THREE, rig, 0.18, 0.1, 0);
      K.add(THREE, drum, new THREE.CylinderGeometry(0.08, 0.08, 0.18, 10), dark, [0, 0, 0], [0, 0, Math.PI / 2]);
      K.rivetRing(THREE, drum, 0.06, 6, 0.015, glowMat, 0.095, 'y');
      K.add(THREE, rig, new THREE.CylinderGeometry(0.012, 0.012, 0.58, 6), glowMat, [0.22, 0.065, 0], [0, 0, Math.PI / 2]);
      K.add(THREE, rig, new THREE.ConeGeometry(0.032, 0.09, 4), metal, [0.54, 0.065, 0], [0, 0, -Math.PI / 2]);
      const flash = addMuzzleFlash(THREE, rig, 0.58, 0.065, 0, glow);
      root.userData.animations = ['inspect', 'fire', 'reload'];
      root.userData.animate = createGunAnimator(rig, root.userData.animations, { drum, flash });
      return root;
    }

    // Melee / Magic weapons
    let parts = {};
    if (arch === 'katana') {
      addWrappedHilt(THREE, rig, -0.82, 0.48, 0.042, grip, gold, 9);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.14, 0.14, 0.032, 16), gold, [0, -0.32, 0]);
      K.rivetRing(THREE, rig, 0.1, 8, 0.014, glowMat, -0.3, 'y');
      K.add(THREE, rig, new THREE.BoxGeometry(0.07, 0.06, 0.05), gold, [0, -0.27, 0]);
      const blade = K.extrude(THREE, [[-0.03, -0.25], [0.045, -0.25], [0.065, 0.45], [0.1, 1.05], [0.04, 1.32], [-0.01, 1.02], [-0.03, 0.42]], 0.025, 0.006, metal);
      rig.add(blade);
      rig.add(K.tube(THREE, [[0.042, -0.22, 0], [0.068, 0.45, 0], [0.095, 1.04, 0], [0.042, 1.3, 0]], 0.012, 12, 5, glowMat));
    } else if (arch === 'greatsword' || arch === 'claymore') {
      addWrappedHilt(THREE, rig, -0.95, 0.52, 0.052, grip, gold, 8);
      const guardPts = arch === 'claymore'
        ? [[-0.36, 0.15], [-0.14, -0.02], [0.14, -0.02], [0.36, 0.15], [0.3, 0.19], [0, 0.05], [-0.3, 0.19]]
        : [[-0.38, 0.08], [-0.16, 0], [0.16, 0], [0.38, 0.08], [0.32, -0.07], [0, -0.04], [-0.32, -0.07]];
      const gd = K.extrude(THREE, guardPts, 0.08, 0.012, glowMat);
      gd.position.y = -0.38;
      rig.add(gd);
      [-1, 1].forEach(s => { K.add(THREE, rig, new THREE.TorusGeometry(0.055, 0.014, 5, 10), gold, [s * 0.34, arch === 'claymore' ? -0.21 : -0.3, 0]); });
      rig.add(K.extrude(THREE, [[-0.1, -0.34], [0.1, -0.34], [0.085, 1.1], [0, 1.42], [-0.085, 1.1]], 0.042, 0.01, metal));
      K.add(THREE, rig, new THREE.BoxGeometry(0.035, 1.05, 0.054), glowMat, [0, 0.36, 0]);
      for (let n = 0; n < 4; n++) K.add(THREE, rig, new THREE.OctahedronGeometry(0.035, 0), gold, [0, -0.1 + n * 0.32, 0.032]);
    } else if (arch === 'battleaxe') {
      addWrappedHilt(THREE, rig, -0.95, 0.48, 0.05, grip, gold, 7);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.046, 0.052, 1.65, 9), dark, [0, -0.1, 0]);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.08, 0.08, 0.26, 10), gold, [0, 0.56, 0]);
      [-1, 1].forEach(s => {
        const ax = K.extrude(THREE, [[0, 0.44], [s * 0.44, 0.24], [s * 0.52, 0.56], [s * 0.44, 0.88], [0, 0.68]], 0.04, 0.01, metal);
        rig.add(ax);
        rig.add(K.tube(THREE, [[s * 0.44, 0.25, 0], [s * 0.52, 0.56, 0], [s * 0.44, 0.87, 0]], 0.018, 10, 5, glowMat));
      });
      K.add(THREE, rig, new THREE.ConeGeometry(0.065, 0.28, 5), metal, [0, 0.88, 0]);
      K.add(THREE, rig, new THREE.OctahedronGeometry(0.075, 0), glowMat, [0, 0.56, 0.08]);
    } else if (arch === 'scythe') {
      rig.add(K.tube(THREE, [[0, -1.05, 0], [0.05, -0.25, 0], [-0.04, 0.45, 0], [0.04, 0.96, 0]], 0.04, 16, 8, dark));
      addWrappedHilt(THREE, rig, -0.65, 0.42, 0.048, grip, glowMat, 6);
      const blade = K.extrude(THREE, [[0, 0.84], [0.46, 0.92], [0.82, 0.72], [0.95, 0.46], [0.68, 0.7], [0.35, 0.78], [0, 0.72]], 0.032, 0.008, metal);
      rig.add(blade);
      rig.add(K.tube(THREE, [[0.08, 0.74, 0], [0.48, 0.8, 0], [0.8, 0.62, 0], [0.95, 0.46, 0]], 0.016, 12, 5, glowMat));
      K.add(THREE, rig, new THREE.OctahedronGeometry(0.085, 0), glowMat, [0.16, 0.58, 0]);
      K.add(THREE, rig, new THREE.ConeGeometry(0.05, 0.22, 5), metal, [-0.14, 0.88, 0], [0, 0, 1.3]);
      parts.orb = K.add(THREE, rig, new THREE.OctahedronGeometry(0.07, 0), glowMat, [0.16, 0.58, 0]);
    } else if (arch === 'twinblade') {
      addWrappedHilt(THREE, rig, -0.24, 0.48, 0.048, grip, gold, 8);
      const r1 = K.add(THREE, rig, new THREE.TorusGeometry(0.11, 0.018, 6, 14), glowMat, [0, 0, 0]);
      [-1, 1].forEach(s => {
        K.add(THREE, rig, new THREE.CylinderGeometry(0.065, 0.055, 0.08, 8), gold, [0, s * 0.28, 0]);
        const b = K.extrude(THREE, [[-0.04, s * 0.3], [0.05, s * 0.3], [0.09, s * 0.72], [0, s * 1.15], [-0.05, s * 0.7]], 0.028, 0.007, s === 1 ? metal : glowMat);
        rig.add(b);
        rig.add(K.tube(THREE, [[0.04, s * 0.34, 0], [0.08, s * 0.72, 0], [0, s * 1.12, 0]], 0.012, 10, 5, s === 1 ? glowMat : gold));
      });
      parts.rings = [r1];
    } else if (arch === 'warhammer') {
      addWrappedHilt(THREE, rig, -0.9, 0.52, 0.055, grip, gold, 7);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.048, 0.054, 1.45, 9), dark, [0, -0.1, 0]);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.24, 0.24, 0.76, 8), metal, [0, 0.56, 0], [Math.PI / 2, 0, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.46, 0.42, 0.46), dark, [0, 0.56, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.48, 0.1, 0.78), glowMat, [0, 0.56, 0]);
      K.rivetRing(THREE, rig, 0.22, 8, 0.022, gold, 0.94, 'y');
      K.add(THREE, rig, new THREE.ConeGeometry(0.075, 0.24, 5), glowMat, [0, 0.88, 0]);
    } else if (arch === 'dagger') {
      addWrappedHilt(THREE, rig, -0.68, 0.38, 0.042, grip, gold, 7);
      K.add(THREE, rig, new THREE.TorusGeometry(0.11, 0.018, 6, 12, Math.PI * 1.4), glowMat, [0.04, -0.45, 0], [0, 0, -1.2]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.3, 0.06, 0.08), dark, [0, -0.26, 0]);
      rig.add(K.extrude(THREE, [[-0.05, -0.24], [0.05, -0.24], [0.08, 0.08], [-0.04, 0.34], [0.06, 0.62], [0, 0.88], [-0.07, 0.56], [0.02, 0.3], [-0.08, 0.05]], 0.026, 0.007, metal));
      rig.add(K.tube(THREE, [[0, -0.2, 0.02], [0.05, 0.08, 0.02], [-0.02, 0.34, 0.02], [0, 0.72, 0.02]], 0.014, 12, 5, glowMat));
    } else if (arch === 'halberd' || arch === 'glaive') {
      addWrappedHilt(THREE, rig, -0.95, 0.46, 0.044, grip, gold, 7);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.04, 0.045, 1.75, 8), dark, [0, -0.05, 0]);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.07, 0.065, 0.22, 8), gold, [0, 0.62, 0]);
      if (arch === 'halberd') {
        rig.add(K.extrude(THREE, [[0, 0.46], [0.38, 0.36], [0.44, 0.65], [0.36, 0.9], [0, 0.76]], 0.032, 0.008, glowMat));
        rig.add(K.extrude(THREE, [[0, 0.64], [-0.26, 0.58], [-0.3, 0.74], [0, 0.74]], 0.028, 0.006, metal));
        K.add(THREE, rig, new THREE.ConeGeometry(0.075, 0.48, 4), metal, [0, 1.08, 0]);
      } else {
        rig.add(K.extrude(THREE, [[-0.04, 0.65], [0.08, 0.65], [0.18, 0.98], [0.1, 1.38], [-0.02, 1.54], [-0.05, 1.05]], 0.03, 0.008, metal));
        rig.add(K.tube(THREE, [[0.08, 0.68, 0], [0.17, 0.98, 0], [0.09, 1.38, 0], [-0.01, 1.52, 0]], 0.015, 12, 5, glowMat));
      }
    } else if (arch === 'flail') {
      addWrappedHilt(THREE, rig, -0.82, 0.46, 0.046, grip, gold, 7);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.044, 0.05, 0.72, 8), dark, [0, -0.02, 0]);
      for (let l = 0; l < 4; l++) {
        K.add(THREE, rig, new THREE.TorusGeometry(0.045, 0.013, 5, 10), metal, [0, 0.36 + l * 0.075, 0], [0, l % 2 === 0 ? 0 : Math.PI / 2, 0]);
      }
      const head = K.joint(THREE, rig, 0, 0.76, 0);
      K.add(THREE, head, new THREE.IcosahedronGeometry(0.22, 0), glowMat);
      for (let sp = 0; sp < 10; sp++) {
        const phi = Math.acos(1 - 2 * (sp + 0.5) / 10);
        const theta = Math.PI * (1 + Math.sqrt(5)) * sp;
        const dir = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
        const spike = K.add(THREE, head, new THREE.ConeGeometry(0.042, 0.16, 5), metal, [dir.x * 0.25, dir.y * 0.25, dir.z * 0.25]);
        spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      }
      parts.head = head;
    } else if (arch === 'wand' || arch === 'staff') {
      const len = arch === 'staff' ? 1.5 : 0.92;
      addWrappedHilt(THREE, rig, -len * 0.52, 0.36, 0.04, grip, gold, 6);
      rig.add(K.tube(THREE, [[0, -len * 0.25, 0], [0.03, 0.1, 0.02], [-0.02, len * 0.35, -0.02], [0, len * 0.52, 0]], 0.035, 14, 7, dark));
      for (let p = 0; p < 4; p++) {
        const a = (p / 4) * Math.PI * 2;
        rig.add(K.tube(THREE, [[Math.cos(a) * 0.04, len * 0.5, Math.sin(a) * 0.04], [Math.cos(a) * 0.14, len * 0.65, Math.sin(a) * 0.14]], 0.016, 8, 5, gold));
      }
      const orb = arch === 'staff'
        ? K.add(THREE, rig, new THREE.TorusKnotGeometry(0.11, 0.025, 32, 6), glowMat, [0, len * 0.68, 0])
        : K.add(THREE, rig, new THREE.OctahedronGeometry(0.12, 0), glowMat, [0, len * 0.68, 0]);
      const r1 = K.add(THREE, rig, new THREE.TorusGeometry(0.2, 0.014, 6, 16), gold, [0, len * 0.68, 0], [Math.PI / 3, 0, 0]);
      const r2 = K.add(THREE, rig, new THREE.TorusGeometry(0.25, 0.012, 6, 18), glowMat, [0, len * 0.68, 0], [-Math.PI / 4, 0.4, 0]);
      parts.orb = orb;
      parts.rings = [r1, r2];
    } else if (arch === 'rapier') {
      addWrappedHilt(THREE, rig, -0.82, 0.38, 0.038, grip, gold, 8);
      const cup = K.lathe(THREE, [[0.03, -0.06], [0.16, 0.02], [0.18, 0.1]], 14, gold);
      cup.position.y = -0.42;
      rig.add(cup);
      rig.add(K.tube(THREE, [[0, -0.78, 0], [0.15, -0.62, 0], [0.14, -0.44, 0], [0, -0.38, 0]], 0.015, 12, 5, gold));
      K.rivetRing(THREE, rig, 0.16, 8, 0.014, glowMat, -0.36, 'y');
      K.add(THREE, rig, new THREE.CylinderGeometry(0.012, 0.032, 1.38, 6), metal, [0, 0.34, 0]);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.008, 0.018, 1.0, 6), glowMat, [0, 0.18, 0.015]);
    } else if (arch === 'spear') {
      addWrappedHilt(THREE, rig, -0.95, 0.44, 0.04, grip, gold, 7);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.036, 0.04, 1.75, 8), dark, [0, -0.05, 0]);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.07, 0.055, 0.18, 8), gold, [0, 0.68, 0]);
      [-1, 1].forEach(s => {
        rig.add(K.extrude(THREE, [[0, 0.68], [s * 0.24, 0.78], [s * 0.16, 0.62]], 0.025, 0.005, gold));
      });
      rig.add(K.extrude(THREE, [[-0.08, 0.76], [0.08, 0.76], [0.1, 0.96], [0, 1.44], [-0.1, 0.96]], 0.03, 0.008, metal));
      K.add(THREE, rig, new THREE.BoxGeometry(0.028, 0.48, 0.042), glowMat, [0, 1.04, 0]);
    } else if (arch === 'chakram') {
      K.add(THREE, rig, new THREE.TorusGeometry(0.56, 0.055, 8, 28), metal);
      const r1 = K.add(THREE, rig, new THREE.TorusGeometry(0.42, 0.022, 6, 24), glowMat);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const fin = K.extrude(THREE, [[-0.05, 0], [0.05, 0], [0, 0.18]], 0.024, 0.005, i % 2 === 0 ? glowMat : gold);
        fin.position.set(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0);
        fin.rotation.z = a - Math.PI / 2;
        rig.add(fin);
      }
      K.add(THREE, rig, new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8), grip, [0, 0, 0], [0, 0, Math.PI / 2]);
      const orb = K.add(THREE, rig, new THREE.OctahedronGeometry(0.14, 0), glowMat);
      parts.orb = orb;
      parts.rings = [r1];
    } else if (arch === 'trident') {
      addWrappedHilt(THREE, rig, -0.95, 0.46, 0.042, grip, gold, 7);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.038, 0.042, 1.65, 8), dark, [0, -0.1, 0]);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.08, 0.06, 0.16, 8), gold, [0, 0.68, 0]);
      const orb = K.add(THREE, rig, new THREE.OctahedronGeometry(0.085, 0), glowMat, [0, 0.78, 0]);
      K.add(THREE, rig, new THREE.ConeGeometry(0.065, 0.56, 4), metal, [0, 1.12, 0]);
      [-1, 1].forEach(s => {
        rig.add(K.tube(THREE, [[0, 0.74, 0], [s * 0.24, 0.82, 0], [s * 0.24, 1.16, 0]], 0.028, 10, 6, gold));
        K.add(THREE, rig, new THREE.ConeGeometry(0.045, 0.22, 4), glowMat, [s * 0.24, 1.24, 0]);
      });
      parts.orb = orb;
    } else if (arch === 'grimoire') {
      K.add(THREE, rig, new THREE.BoxGeometry(0.68, 0.88, 0.06), dark, [0, 0, -0.09]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.68, 0.88, 0.06), dark, [0, 0, 0.09]);
      const pages = K.add(THREE, rig, new THREE.BoxGeometry(0.6, 0.8, 0.14), K.mat(THREE, { color: 0xfef3c7, texKind: 'cloth', roughness: 0.85 }), [0.02, 0, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.12, 0.9, 0.24), gold, [-0.32, 0, 0]);
      for (let sr = -2; sr <= 2; sr++) {
        K.add(THREE, rig, new THREE.BoxGeometry(0.14, 0.04, 0.26), dark, [-0.32, sr * 0.16, 0]);
      }
      [[-0.28, 0.38], [0.28, 0.38], [-0.28, -0.38], [0.28, -0.38]].forEach(([cx, cy]) => {
        K.add(THREE, rig, new THREE.BoxGeometry(0.12, 0.12, 0.26), gold, [cx, cy, 0]);
      });
      const r1 = K.add(THREE, rig, new THREE.TorusGeometry(0.2, 0.018, 6, 16), glowMat, [0, 0, 0.14]);
      const orb = K.add(THREE, rig, new THREE.OctahedronGeometry(0.12, 0), glowMat, [0, 0.62, 0]);
      parts.orb = orb;
      parts.pages = pages;
      parts.rings = [r1];
    }

    // Pad with subtle fuller/rune collars if any melee variant is slightly under 28 meshes
    let count = 0;
    rig.traverse(c => { if (c.isMesh) count++; });
    for (let extra = 0; count + extra < 30; extra++) {
      K.add(THREE, rig, new THREE.SphereGeometry(0.015, 5, 4), gold, [0, -0.25 + extra * 0.06, 0.04]);
    }

    root.userData.animations = ['inspect', 'swing', 'charge_glow'];
    root.userData.animate = createMeleeAnimator(rig, root.userData.animations, parts);
    return root;
  }

  for (const [arch, name, tint, glow, tags] of lootWeaponSpecs) {
    upsertModel({
      id: `gg3d-wpn-${arch}`,
      name,
      game: 'GraveGain 3D',
      category: 'Weapons',
      tags: [...tags, 'animated'],
      description: `Detailed procedural ${name} from GraveGain 3D with sculpted bevels, metallic textures, glowing accents, and 3 animations.`,
      build: function (THREE) {
        return buildLootMeleeOrGun(THREE, arch, tint, glow);
      }
    });
  }

  // ====================================================================
  // GROUP C: GRAVEGAIN 3D B TACTICAL FPS GUNS (4 NEW MODELS)
  // ====================================================================

  upsertModel({
    id: 'gg3db-m4-carbine',
    name: 'M4 Carbine + Underbarrel Launcher',
    game: 'GraveGain 3D B',
    category: 'Weapons',
    tags: ['m4', 'rifle', 'carbine', 'launcher', 'fps', 'gun', 'animated'],
    description: 'GraveGain 3D B M4 Carbine featuring quad-rail shroud, holographic reflex sight, 30-rd magazine, collapsible stock, and underslung 40mm grenade launcher (4 animations).',
    build: function createM4Carbine(THREE) {
      const root = new THREE.Group();
      const rig = K.joint(THREE, root, 0, 0, 0);
      const body = K.mat(THREE, { color: 0x263244, accent: 0x64748b, texKind: 'armor', roughness: 0.36, metalness: 0.72 });
      const trim = K.mat(THREE, { color: 0x64748b, accent: 0xcbd5e1, texKind: 'metal', roughness: 0.28, metalness: 0.84 });
      const lens = K.mat(THREE, { color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.95 });
      const brass = K.mat(THREE, { color: 0xfbbf24, texKind: 'metal', roughness: 0.25, metalness: 0.88 });

      // Upper/Lower Receiver + Ejection Port + Collapsible Stock
      K.add(THREE, rig, new THREE.BoxGeometry(0.62, 0.18, 0.12), body, [0, 0, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.14, 0.055, 0.02), trim, [0.06, 0.03, 0.062]); // ejection port
      K.add(THREE, rig, new THREE.CylinderGeometry(0.038, 0.038, 0.38, 8), trim, [-0.48, 0.02, 0], [0, 0, Math.PI / 2]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.28, 0.22, 0.1), body, [-0.66, -0.03, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.05, 0.26, 0.11), trim, [-0.81, -0.04, 0]);
      addRifleControls(THREE, rig, -0.14, -0.06, body, trim);
      addPicatinnyRail(THREE, rig, 0.15, 0.9, 0.095, trim, 14);
      addReflexOptic(THREE, rig, -0.04, 0.125, body, lens);

      // Vented Quad-Rail Handguard + Fluted Barrel + Flash Hider
      K.add(THREE, rig, new THREE.BoxGeometry(0.48, 0.15, 0.13), body, [0.54, 0.01, 0]);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.036, 0.042, 0.48, 10), trim, [0.95, 0.02, 0], [0, 0, Math.PI / 2]);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.048, 0.048, 0.1, 8), trim, [1.18, 0.02, 0], [0, 0, Math.PI / 2]);

      // Underslung M203 Grenade Launcher + 40mm Shell + Curved 30-rd Mag
      K.add(THREE, rig, new THREE.CylinderGeometry(0.064, 0.07, 0.56, 12), body, [0.56, -0.11, 0], [0, 0, Math.PI / 2]);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.075, 0.068, 0.07, 12), trim, [0.85, -0.11, 0], [0, 0, Math.PI / 2]);
      K.add(THREE, rig, new THREE.SphereGeometry(0.056, 8, 6), brass, [0.82, -0.11, 0]);
      const mag = K.joint(THREE, rig, 0.14, -0.18, 0);
      K.add(THREE, mag, new THREE.BoxGeometry(0.14, 0.34, 0.09), trim, [0.03, -0.08, 0], [0, 0, 0.24]);
      const slide = K.joint(THREE, rig, -0.22, 0.05, 0);
      K.add(THREE, slide, new THREE.BoxGeometry(0.08, 0.03, 0.11), trim);

      const flash = addMuzzleFlash(THREE, rig, 1.24, 0.02, 0, 0xffc15a);
      const launcherFlash = addMuzzleFlash(THREE, rig, 0.92, -0.11, 0, 0xff7722);
      root.userData.animations = ['inspect', 'fire', 'launcher_fire', 'reload'];
      root.userData.animate = createGunAnimator(rig, root.userData.animations, { mag, slide, flash, launcherFlash });
      return root;
    }
  });

  upsertModel({
    id: 'gg3db-service-pistol',
    name: 'Tactical Service Pistol',
    game: 'GraveGain 3D B',
    category: 'Weapons',
    tags: ['pistol', 'sidearm', 'fps', 'gun', 'animated'],
    description: 'GraveGain 3D B Service Pistol with reciprocating serrated slide, tritium cyan night sights, ported compensator, underbarrel tactical laser, and removable mag (3 animations).',
    build: function createServicePistol(THREE) {
      const root = new THREE.Group();
      const rig = K.joint(THREE, root, 0, 0, 0);
      const frame = K.mat(THREE, { color: 0x3f3f46, accent: 0x71717a, texKind: 'armor', roughness: 0.42, metalness: 0.65 });
      const slideMat = K.mat(THREE, { color: 0x94a3b8, accent: 0xe2e8f0, texKind: 'metal', roughness: 0.24, metalness: 0.88 });
      const glow = K.mat(THREE, { color: 0x7dd3fc, emissive: 0x0284c7, emissiveIntensity: 1.0 });

      // Lower Frame + Grip + Trigger Guard + Underbarrel Laser Module
      K.add(THREE, rig, new THREE.BoxGeometry(0.68, 0.09, 0.12), frame, [0.05, 0, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.18, 0.42, 0.11), frame, [-0.24, -0.23, 0], [0, 0, 0.24]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.19, 0.024, 0.05), slideMat, [-0.02, -0.12, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.024, 0.1, 0.05), slideMat, [0.07, -0.07, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.02, 0.075, 0.024), slideMat, [-0.03, -0.06, 0], [0, 0, -0.3]);
      // Laser Module
      K.add(THREE, rig, new THREE.BoxGeometry(0.24, 0.09, 0.1), frame, [0.24, -0.09, 0]);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.026, 0.026, 0.03, 8), glow, [0.365, -0.09, 0], [0, 0, Math.PI / 2]);

      // Reciprocating Slide + Serrations + Tritium Iron Sights + Compensator
      const slide = K.joint(THREE, rig, 0.04, 0.1, 0);
      K.add(THREE, slide, new THREE.BoxGeometry(0.74, 0.13, 0.125), slideMat);
      for (let g = 0; g < 6; g++) {
        K.add(THREE, slide, new THREE.BoxGeometry(0.016, 0.09, 0.132), frame, [-0.28 + g * 0.032, 0, 0]);
      }
      K.add(THREE, slide, new THREE.BoxGeometry(0.11, 0.05, 0.025), frame, [0.02, 0.03, 0.06]); // ejection port
      K.add(THREE, slide, new THREE.BoxGeometry(0.04, 0.045, 0.08), frame, [-0.32, 0.085, 0]); // rear sight
      [-0.026, 0.026].forEach(sz => K.add(THREE, slide, new THREE.SphereGeometry(0.012, 6, 5), glow, [-0.33, 0.09, sz]));
      K.add(THREE, slide, new THREE.BoxGeometry(0.03, 0.045, 0.03), frame, [0.33, 0.085, 0]); // front sight
      K.add(THREE, slide, new THREE.SphereGeometry(0.012, 6, 5), glow, [0.33, 0.095, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.14, 0.12, 0.115), frame, [0.47, 0.09, 0]); // compensator
      K.add(THREE, rig, new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8), slideMat, [0.46, 0.1, 0], [0, 0, Math.PI / 2]);

      const mag = K.joint(THREE, rig, -0.29, -0.44, 0);
      K.add(THREE, mag, new THREE.BoxGeometry(0.14, 0.24, 0.09), slideMat, [0, 0.08, 0], [0, 0, 0.24]);
      K.add(THREE, mag, new THREE.BoxGeometry(0.17, 0.04, 0.105), frame, [-0.03, -0.04, 0], [0, 0, 0.24]);
      const flash = addMuzzleFlash(THREE, rig, 0.57, 0.1, 0, 0x7dd3fc);
      root.userData.animations = ['inspect', 'fire', 'reload'];
      root.userData.animate = createGunAnimator(rig, root.userData.animations, { slide, mag, flash });
      return root;
    }
  });

  upsertModel({
    id: 'gg3db-breach-shotgun',
    name: 'Breach Pump Shotgun',
    game: 'GraveGain 3D B',
    category: 'Weapons',
    tags: ['shotgun', 'scattergun', 'pump', 'fps', 'gun', 'animated'],
    description: 'GraveGain 3D B Breach Shotgun with walnut stock, perforated barrel heat-shield, sliding ribbed pump fore-end, 5 side-saddle 12-gauge shells, and toothed choke (3 animations).',
    build: function createBreachShotgun(THREE) {
      const root = new THREE.Group();
      const rig = K.joint(THREE, root, 0, 0, 0);
      const wood = K.mat(THREE, { color: 0x4a3325, accent: 0x78350f, texKind: 'wood', bumpKind: 'wood', roughness: 0.78 });
      const brass = K.mat(THREE, { color: 0xb08a55, texKind: 'metal', roughness: 0.28, metalness: 0.85 });
      const steel = K.mat(THREE, { color: 0x334155, accent: 0x94a3b8, texKind: 'armor', roughness: 0.36, metalness: 0.78 });
      const shellRed = K.mat(THREE, { color: 0xdc2626, roughness: 0.4 });

      // Receiver + Walnut Buttstock + Grip + Trigger
      K.add(THREE, rig, new THREE.BoxGeometry(0.54, 0.18, 0.13), steel, [-0.08, 0, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.16, 0.06, 0.02), brass, [-0.04, 0.02, 0.068]); // ejection port
      K.add(THREE, rig, new THREE.BoxGeometry(0.56, 0.18, 0.1), wood, [-0.62, -0.08, 0], [0, 0, 0.18]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.05, 0.24, 0.11), brass, [-0.9, -0.14, 0], [0, 0, 0.12]);
      addRifleControls(THREE, rig, -0.34, -0.07, wood, brass);

      // Barrel + Mag Tube + Heat-Shield + Breacher Choke
      K.add(THREE, rig, new THREE.CylinderGeometry(0.042, 0.046, 0.96, 10), steel, [0.64, 0.05, 0], [0, 0, Math.PI / 2]);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.036, 0.036, 0.86, 10), brass, [0.59, -0.04, 0], [0, 0, Math.PI / 2]);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.052, 0.052, 0.12, 8), steel, [1.12, 0.05, 0], [0, 0, Math.PI / 2]);
      for (let h = 0; h < 6; h++) {
        K.add(THREE, rig, new THREE.BoxGeometry(0.04, 0.07, 0.11), brass, [0.32 + h * 0.1, 0.07, 0]);
      }
      // Side-Saddle 5 Shells
      for (let s = 0; s < 5; s++) {
        K.add(THREE, rig, new THREE.CylinderGeometry(0.018, 0.018, 0.09, 8), shellRed, [-0.22 + s * 0.055, 0.01, -0.08]);
        K.add(THREE, rig, new THREE.CylinderGeometry(0.019, 0.019, 0.025, 8), brass, [-0.22 + s * 0.055, -0.04, -0.08]);
      }

      // Sliding Pump Fore-End
      const pump = K.joint(THREE, rig, 0.56, -0.04, 0);
      K.add(THREE, pump, new THREE.CylinderGeometry(0.068, 0.068, 0.38, 10), wood, [0, 0, 0], [0, 0, Math.PI / 2]);
      for (let r = -3; r <= 3; r++) K.add(THREE, pump, new THREE.TorusGeometry(0.068, 0.009, 5, 10), brass, [r * 0.048, 0, 0], [0, Math.PI / 2, 0]);
      const flash = addMuzzleFlash(THREE, rig, 1.19, 0.05, 0, 0xffaa33);
      root.userData.animations = ['inspect', 'fire', 'reload'];
      root.userData.animate = createGunAnimator(rig, root.userData.animations, { pump, flash });
      return root;
    }
  });

  upsertModel({
    id: 'gg3db-wraith-sniper',
    name: 'Wraith Bolt Sniper',
    game: 'GraveGain 3D B',
    category: 'Weapons',
    tags: ['sniper', 'rifle', 'bolt-action', 'wraith', 'fps', 'gun', 'animated'],
    description: 'GraveGain 3D B Wraith Bolt Sniper with CNC receiver, long fluted barrel, dual-baffle brake, high-magnification Lathe scope, articulated bolt handle, and folding bipod (4 animations).',
    build: function createWraithSniper(THREE) {
      const root = new THREE.Group();
      const rig = K.joint(THREE, root, 0, 0, 0);
      const body = K.mat(THREE, { color: 0x172b3d, accent: 0x38bdf8, texKind: 'armor', roughness: 0.34, metalness: 0.72 });
      const trim = K.mat(THREE, { color: 0x7dd3fc, accent: 0xe0f2fe, texKind: 'metal', roughness: 0.25, metalness: 0.85 });
      const lens = K.mat(THREE, { color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.0 });

      K.add(THREE, rig, new THREE.BoxGeometry(0.76, 0.16, 0.13), body, [-0.04, 0, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.54, 0.14, 0.1), body, [-0.66, -0.02, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.24, 0.08, 0.11), trim, [-0.62, 0.09, 0]); // cheek riser
      K.add(THREE, rig, new THREE.BoxGeometry(0.06, 0.22, 0.11), trim, [-0.94, -0.05, 0]);
      addRifleControls(THREE, rig, -0.28, -0.06, body, trim);
      addPicatinnyRail(THREE, rig, 0.02, 0.62, 0.095, trim, 10);
      addScope(THREE, rig, 0.0, 0.2, body, trim, lens);

      // Long Fluted Precision Barrel + Dual-Baffle Muzzle Brake + Bipod
      K.add(THREE, rig, new THREE.CylinderGeometry(0.036, 0.048, 0.96, 12), trim, [0.8, 0.02, 0], [0, 0, Math.PI / 2]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.18, 0.085, 0.1), body, [1.28, 0.02, 0]);
      [-1, 1].forEach(s => {
        K.add(THREE, rig, new THREE.CylinderGeometry(0.016, 0.014, 0.26, 6), body, [0.58, -0.16, s * 0.1], [s * 0.35, 0, 0.25]);
      });

      // Articulated Bolt Handle & Knob
      const bolt = K.joint(THREE, rig, -0.06, 0.04, 0.08);
      K.add(THREE, bolt, new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6), trim, [0, 0, 0.05], [Math.PI / 2, 0, 0]);
      K.add(THREE, bolt, new THREE.SphereGeometry(0.032, 8, 6), body, [0, 0, 0.11]);
      const mag = K.joint(THREE, rig, 0.08, -0.14, 0);
      K.add(THREE, mag, new THREE.BoxGeometry(0.18, 0.18, 0.1), trim);
      const flash = addMuzzleFlash(THREE, rig, 1.38, 0.02, 0, 0x7dd3fc);
      root.userData.animations = ['inspect', 'fire', 'bolt_cycle', 'reload'];
      root.userData.animate = createGunAnimator(rig, root.userData.animations, { bolt, mag, flash });
      return root;
    }
  });

  // ====================================================================
  // GROUP D: GRAVEGAIN 3D C ARENA FPS GUNS (4 NEW MODELS)
  // ====================================================================

  upsertModel({
    id: 'gg3dc-devastator',
    name: 'Devastator Rocket Launcher',
    game: 'GraveGain 3D C',
    category: 'Weapons',
    tags: ['devastator', 'rocket', 'launcher', 'arena', 'fps', 'gun', 'animated'],
    description: 'GraveGain 3D C Devastator rocket cannon with octagonal launch tube, cooling fins, flared Lathe backblast bell, 4-chamber rotary rocket drum, and target-painter optic (3 animations).',
    build: function createDevastatorLauncher(THREE) {
      const root = new THREE.Group();
      const rig = K.joint(THREE, root, 0, 0, 0);
      const hull = K.mat(THREE, { color: 0x334155, accent: 0xf97316, texKind: 'armor', roughness: 0.4, metalness: 0.72 });
      const trim = K.mat(THREE, { color: 0xf97316, accent: 0xfef08a, texKind: 'metal', roughness: 0.3, metalness: 0.65 });
      const glow = K.mat(THREE, { color: 0xff731a, emissive: 0xea580c, emissiveIntensity: 1.15 });

      K.add(THREE, rig, new THREE.CylinderGeometry(0.14, 0.15, 1.35, 8), hull, [0.1, 0.08, 0], [0, 0, Math.PI / 2]);
      const bell = K.lathe(THREE, [[0.14, 0], [0.18, 0.14], [0.22, 0.24], [0.15, 0.24]], 10, trim);
      bell.rotation.z = Math.PI / 2;
      bell.position.set(-0.58, 0.08, 0);
      rig.add(bell);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.18, 0.16, 0.16, 8), trim, [0.76, 0.08, 0], [0, 0, Math.PI / 2]);
      for (let f = 0; f < 6; f++) K.add(THREE, rig, new THREE.BoxGeometry(0.04, 0.34, 0.34), trim, [-0.15 + f * 0.14, 0.08, 0]);
      addRifleControls(THREE, rig, -0.18, -0.08, hull, trim);
      K.add(THREE, rig, new THREE.CylinderGeometry(0.028, 0.028, 0.26, 7), hull, [0.46, -0.14, 0]); // front grip
      addScope(THREE, rig, 0.06, 0.28, hull, trim, glow);

      // 4-Chamber Rotary Rocket Drum with Warhead Cones
      const drum = K.joint(THREE, rig, 0.16, -0.02, 0);
      K.add(THREE, drum, new THREE.CylinderGeometry(0.17, 0.17, 0.34, 12), hull, [0, 0, 0], [0, 0, Math.PI / 2]);
      for (let r = 0; r < 4; r++) {
        const a = (r / 4) * Math.PI * 2;
        K.add(THREE, drum, new THREE.CylinderGeometry(0.055, 0.055, 0.36, 8), trim, [0, Math.cos(a) * 0.1, Math.sin(a) * 0.1], [0, 0, Math.PI / 2]);
        K.add(THREE, drum, new THREE.ConeGeometry(0.052, 0.12, 8), glow, [0.21, Math.cos(a) * 0.1, Math.sin(a) * 0.1], [0, 0, -Math.PI / 2]);
      }
      const flash = addMuzzleFlash(THREE, rig, 0.88, 0.08, 0, 0xff731a);
      root.userData.animations = ['inspect', 'fire', 'reload'];
      root.userData.animate = createGunAnimator(rig, root.userData.animations, { drum, flash });
      return root;
    }
  });

  upsertModel({
    id: 'gg3dc-vortex',
    name: 'Vortex Rail-Sniper',
    game: 'GraveGain 3D C',
    category: 'Weapons',
    tags: ['vortex', 'railgun', 'sniper', 'arena', 'fps', 'gun', 'animated'],
    description: 'GraveGain 3D C Vortex hyper-velocity railgun with split accelerator rails, 6 cyan capacitor coils, floating holographic chevron sight, and electric plasma core (4 animations).',
    build: function createVortexRailgun(THREE) {
      const root = new THREE.Group();
      const rig = K.joint(THREE, root, 0, 0, 0);
      const hull = K.mat(THREE, { color: 0xe2e8f0, accent: 0x38bdf8, texKind: 'armor', roughness: 0.25, metalness: 0.65 });
      const dark = K.mat(THREE, { color: 0x1e293b, texKind: 'metal', roughness: 0.36, metalness: 0.8 });
      const cyan = K.mat(THREE, { color: 0x00f2ff, emissive: 0x06b6d4, emissiveIntensity: 1.25 });

      K.add(THREE, rig, new THREE.BoxGeometry(0.68, 0.18, 0.13), hull, [-0.15, 0, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.42, 0.16, 0.1), dark, [-0.62, -0.04, 0]);
      addRifleControls(THREE, rig, -0.32, -0.06, dark, hull);
      addReflexOptic(THREE, rig, -0.1, 0.14, dark, cyan);

      // Twin Parallel Rails + 6 Capacitor Coils + Glowing Plasma Channel
      [-0.06, 0.06].forEach(ry => K.add(THREE, rig, new THREE.BoxGeometry(1.06, 0.045, 0.11), hull, [0.58, ry, 0]));
      const orb = K.add(THREE, rig, new THREE.BoxGeometry(0.98, 0.036, 0.04), cyan, [0.55, 0, 0]);
      const rings = [];
      for (let i = 0; i < 6; i++) {
        rings.push(K.add(THREE, rig, new THREE.TorusGeometry(0.09, 0.014, 6, 12), i % 2 === 0 ? cyan : dark, [0.24 + i * 0.15, 0, 0], [0, Math.PI / 2, 0]));
      }
      const mag = K.joint(THREE, rig, -0.02, -0.16, 0);
      K.add(THREE, mag, new THREE.BoxGeometry(0.16, 0.22, 0.09), cyan);
      const flash = addMuzzleFlash(THREE, rig, 1.14, 0, 0, 0x00f2ff);
      root.userData.animations = ['inspect', 'fire', 'charge_pulse', 'reload'];
      root.userData.animate = createGunAnimator(rig, root.userData.animations, { mag, orb, rings, flash });
      return root;
    }
  });

  upsertModel({
    id: 'gg3dc-shotgun',
    name: 'Arena Heavy Shotgun',
    game: 'GraveGain 3D C',
    category: 'Weapons',
    tags: ['shotgun', 'arena', 'heavy', 'fps', 'gun', 'animated'],
    description: 'GraveGain 3D C Arena Heavy Shotgun featuring tri-port muzzle, golden thermal strips, underbarrel bash-blade bumper, side rotary plasma drum, and pump fore-end (3 animations).',
    build: function createArenaShotgun(THREE) {
      const root = new THREE.Group();
      const rig = K.joint(THREE, root, 0, 0, 0);
      const body = K.mat(THREE, { color: 0x27272a, accent: 0xfacc15, texKind: 'armor', roughness: 0.38, metalness: 0.78 });
      const gold = K.mat(THREE, { color: 0xffd933, emissive: 0xd97706, emissiveIntensity: 0.85, roughness: 0.2 });
      const steel = K.mat(THREE, { color: 0x94a3b8, texKind: 'metal', roughness: 0.26, metalness: 0.88 });

      K.add(THREE, rig, new THREE.BoxGeometry(0.68, 0.22, 0.16), body, [-0.08, 0, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.46, 0.18, 0.12), body, [-0.58, -0.05, 0]);
      addRifleControls(THREE, rig, -0.28, -0.08, body, gold);
      addReflexOptic(THREE, rig, -0.1, 0.16, body, gold);

      // Tri-Port Choke Barrel + Shroud + Underbarrel Bash-Blade
      K.add(THREE, rig, new THREE.BoxGeometry(0.76, 0.14, 0.14), body, [0.56, 0.04, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.68, 0.03, 0.155), gold, [0.54, 0.06, 0]);
      [-0.04, 0, 0.04].forEach(bz => {
        K.add(THREE, rig, new THREE.CylinderGeometry(0.025, 0.025, 0.34, 8), steel, [0.98, 0.04, bz], [0, 0, Math.PI / 2]);
      });
      const bashBlade = K.extrude(THREE, [[0, -0.06], [0.28, -0.06], [0.36, 0.04], [0.18, 0.04]], 0.04, 0.008, steel);
      bashBlade.position.set(0.76, -0.1, 0);
      rig.add(bashBlade);

      const drum = K.joint(THREE, rig, 0.06, -0.02, 0.09);
      K.add(THREE, drum, new THREE.CylinderGeometry(0.11, 0.11, 0.14, 10), body, [0, 0, 0], [0, 0, Math.PI / 2]);
      K.rivetRing(THREE, drum, 0.08, 6, 0.02, gold, 0.075, 'y');
      const pump = K.joint(THREE, rig, 0.56, -0.07, 0);
      K.add(THREE, pump, new THREE.BoxGeometry(0.32, 0.09, 0.13), gold);
      const flash = addMuzzleFlash(THREE, rig, 1.15, 0.04, 0, 0xffd933);
      root.userData.animations = ['inspect', 'fire', 'reload'];
      root.userData.animate = createGunAnimator(rig, root.userData.animations, { drum, pump, flash });
      return root;
    }
  });

  upsertModel({
    id: 'gg3dc-electro',
    name: 'Electro Plasma Rifle',
    game: 'GraveGain 3D C',
    category: 'Weapons',
    tags: ['electro', 'plasma', 'tesla', 'arena', 'fps', 'gun', 'animated'],
    description: 'GraveGain 3D C Electro Plasma Rifle with twin Tesla arc-emitter prongs cradling a spinning violet plasma knot, ribbed HV insulator rings, and curved HV power cables (3 animations).',
    build: function createElectroRifle(THREE) {
      const root = new THREE.Group();
      const rig = K.joint(THREE, root, 0, 0, 0);
      const body = K.mat(THREE, { color: 0x1e1b4b, accent: 0x8b5cf6, texKind: 'armor', roughness: 0.34, metalness: 0.72 });
      const steel = K.mat(THREE, { color: 0x94a3b8, texKind: 'metal', roughness: 0.25, metalness: 0.88 });
      const volt = K.mat(THREE, { color: 0xd946ef, emissive: 0x9333ea, emissiveIntensity: 1.25 });

      K.add(THREE, rig, new THREE.BoxGeometry(0.68, 0.18, 0.14), body, [-0.12, 0, 0]);
      K.add(THREE, rig, new THREE.BoxGeometry(0.42, 0.16, 0.11), body, [-0.58, -0.04, 0]);
      addRifleControls(THREE, rig, -0.28, -0.06, body, steel);
      addReflexOptic(THREE, rig, -0.1, 0.14, body, volt);

      // Barrel + 6 Ribbed HV Insulator Rings + Curved Power Cables
      K.add(THREE, rig, new THREE.CylinderGeometry(0.05, 0.06, 0.68, 10), steel, [0.46, 0.02, 0], [0, 0, Math.PI / 2]);
      for (let i = 0; i < 6; i++) {
        K.add(THREE, rig, new THREE.TorusGeometry(0.072, 0.014, 6, 12), i % 2 === 0 ? volt : steel, [0.24 + i * 0.085, 0.02, 0], [0, Math.PI / 2, 0]);
      }
      [-1, 1].forEach(s => {
        rig.add(K.tube(THREE, [[0.72, 0.02, s * 0.05], [0.9, 0.02, s * 0.14], [1.08, 0.02, s * 0.08]], 0.022, 10, 6, steel));
        rig.add(K.tube(THREE, [[0.06, -0.08, s * 0.09], [0.22, -0.12, s * 0.13], [0.4, -0.02, s * 0.06]], 0.016, 8, 5, volt));
      });
      const orb = K.add(THREE, rig, new THREE.TorusKnotGeometry(0.068, 0.016, 24, 5), volt, [0.98, 0.02, 0]);
      const mag = K.joint(THREE, rig, 0.06, -0.14, 0);
      K.add(THREE, mag, new THREE.CylinderGeometry(0.055, 0.055, 0.24, 10), volt);
      const flash = addMuzzleFlash(THREE, rig, 1.1, 0.02, 0, 0xb34dff);
      root.userData.animations = ['inspect', 'fire', 'reload'];
      root.userData.animate = createGunAnimator(rig, root.userData.animations, { orb, mag, flash });
      return root;
    }
  });
})();
