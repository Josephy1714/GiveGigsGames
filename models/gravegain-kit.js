// Shared Procedural Craftsmanship, Texture & Animation Kit for GraveGain 3D Models
// Vanilla JS for Three.js r128 — 100% offline, zero external assets or imports.
(function () {
  'use strict';

  const RACE_ANIMATIONS = [
    'idle',
    'walk',
    'run',
    'jump',
    'attack_melee',
    'attack_heavy',
    'attack_ranged',
    'cast_spell',
    'block',
    'dodge',
    'hurt',
    'victory'
  ];

  const ENEMY_ANIMATIONS = [
    'idle',
    'move',
    'attack',
    'special',
    'hurt',
    'death'
  ];

  const texCache = new Map();

  function hexToRgb(hex) {
    const n = typeof hex === 'number' ? hex : parseInt(String(hex || '888888').replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbStr(c, delta, alpha) {
    const r = Math.max(0, Math.min(255, Math.round(c.r + (delta || 0))));
    const g = Math.max(0, Math.min(255, Math.round(c.g + (delta || 0))));
    const b = Math.max(0, Math.min(255, Math.round(c.b + (delta || 0))));
    return alpha !== undefined ? `rgba(${r},${g},${b},${alpha})` : `rgb(${r},${g},${b})`;
  }

  function seeded(seed) {
    let a = seed | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function tex(THREE, kind, baseHex, accentHex) {
    if (typeof document === 'undefined' || !document.createElement) return null;
    const key = `${kind}:${baseHex}:${accentHex || 0}`;
    if (texCache.has(key)) return texCache.get(key);

    let canvas;
    let ctx;
    try {
      canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      ctx = canvas.getContext('2d');
    } catch (_) {
      return null;
    }
    if (!ctx) return null;

    const base = hexToRgb(baseHex !== undefined ? baseHex : 0x64748b);
    const acc = hexToRgb(accentHex !== undefined ? accentHex : 0xcbd5e1);
    const rnd = seeded(key.length * 997 + (base.r << 8) + base.g);

    ctx.fillStyle = rgbStr(base, 0);
    ctx.fillRect(0, 0, 128, 128);

    if (kind === 'metal' || kind === 'armor') {
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = rgbStr(base, (rnd() - 0.5) * 28, 0.35);
        ctx.fillRect(0, rnd() * 128, 128, 1 + rnd() * 1.5);
      }
      ctx.strokeStyle = rgbStr(base, -45, 0.7);
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, 120, 120);
      ctx.strokeStyle = rgbStr(acc, 20, 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 64);
      ctx.lineTo(128, 64);
      ctx.stroke();
      if (kind === 'armor') {
        [[10, 10], [118, 10], [10, 118], [118, 118], [64, 10], [64, 118]].forEach(([rx, ry]) => {
          ctx.fillStyle = rgbStr(acc, 35);
          ctx.beginPath();
          ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
        for (let s = 0; s < 5; s++) {
          ctx.strokeStyle = rgbStr(acc, 40, 0.28);
          ctx.beginPath();
          const sx = rnd() * 100 + 10, sy = rnd() * 100 + 10;
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + (rnd() - 0.5) * 26, sy + (rnd() - 0.5) * 18);
          ctx.stroke();
        }
      }
    } else if (kind === 'wood') {
      for (let y = 0; y < 128; y += 32) {
        ctx.fillStyle = rgbStr(base, (rnd() - 0.5) * 18);
        ctx.fillRect(0, y, 128, 32);
        ctx.fillStyle = rgbStr(base, -45);
        ctx.fillRect(0, y, 128, 2);
      }
      for (let i = 0; i < 65; i++) {
        ctx.strokeStyle = rgbStr(base, (rnd() - 0.5) * 32, 0.45);
        ctx.beginPath();
        const py = rnd() * 128;
        ctx.moveTo(0, py);
        ctx.bezierCurveTo(42, py + (rnd() - 0.5) * 6, 86, py + (rnd() - 0.5) * 6, 128, py);
        ctx.stroke();
      }
    } else if (kind === 'stone') {
      const rowH = 32;
      for (let row = 0; row < 4; row++) {
        const offset = (row % 2) * 32;
        for (let col = -1; col < 3; col++) {
          ctx.fillStyle = rgbStr(base, (rnd() - 0.5) * 26);
          ctx.fillRect(col * 64 + offset + 2, row * rowH + 2, 60, rowH - 4);
        }
      }
      for (let i = 0; i < 140; i++) {
        ctx.fillStyle = rgbStr(acc, (rnd() - 0.5) * 35, 0.25);
        ctx.fillRect(rnd() * 128, rnd() * 128, 2, 2);
      }
    } else if (kind === 'bone') {
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = rgbStr(base, (rnd() - 0.5) * 24, 0.4);
        ctx.fillRect(rnd() * 128, rnd() * 128, 1.5, 6 + rnd() * 10);
      }
      for (let c = 0; c < 6; c++) {
        ctx.strokeStyle = rgbStr(base, -55, 0.5);
        ctx.beginPath();
        let x = rnd() * 128, y = rnd() * 128;
        ctx.moveTo(x, y);
        for (let k = 0; k < 3; k++) {
          x += (rnd() - 0.5) * 20;
          y += rnd() * 16;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    } else if (kind === 'leather') {
      for (let i = 0; i < 220; i++) {
        ctx.fillStyle = rgbStr(base, (rnd() - 0.5) * 24, 0.5);
        ctx.beginPath();
        ctx.arc(rnd() * 128, rnd() * 128, 1.4 + rnd() * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = rgbStr(acc, 40, 0.75);
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(8, 8, 112, 112);
      ctx.setLineDash([]);
    } else if (kind === 'cloth') {
      for (let i = 0; i < 128; i += 4) {
        ctx.fillStyle = rgbStr(base, 14, 0.28);
        ctx.fillRect(i, 0, 1, 128);
        ctx.fillRect(0, i, 128, 1);
      }
      ctx.fillStyle = rgbStr(acc, 10, 0.6);
      ctx.fillRect(0, 114, 128, 6);
    } else if (kind === 'rune') {
      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = rgbStr(acc, 35, 0.95);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(64, 64, 42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(64, 14); ctx.lineTo(106, 64); ctx.lineTo(64, 114); ctx.lineTo(22, 64); ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(64, 64, 14, 0, Math.PI * 2);
      ctx.stroke();
    } else if (kind === 'sludge') {
      for (let i = 0; i < 45; i++) {
        ctx.fillStyle = rgbStr(acc, (rnd() - 0.3) * 40, 0.55);
        ctx.beginPath();
        ctx.arc(rnd() * 128, rnd() * 128, 3 + rnd() * 9, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'skin') {
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = rgbStr(base, (rnd() - 0.5) * 22, 0.35);
        ctx.beginPath();
        ctx.arc(rnd() * 128, rnd() * 128, 2 + rnd() * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = rgbStr(acc, -15, 0.35);
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 4; s++) {
        ctx.beginPath();
        const x = 20 + rnd() * 88, y = 20 + rnd() * 88;
        ctx.moveTo(x, y);
        ctx.lineTo(x + 14, y + (rnd() - 0.5) * 10);
        ctx.stroke();
      }
    }

    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    texCache.set(key, t);
    return t;
  }

  function bumpTex(THREE, kind) {
    return tex(THREE, kind, 0x808080, 0xd4d4d4);
  }

  function mat(THREE, opts) {
    const o = opts || {};
    const params = {
      color: o.color !== undefined ? o.color : 0x94a3b8,
      roughness: o.roughness !== undefined ? o.roughness : 0.55,
      metalness: o.metalness !== undefined ? o.metalness : 0.25
    };
    if (o.texKind) {
      const map = tex(THREE, o.texKind, params.color, o.accent !== undefined ? o.accent : 0xe2e8f0);
      if (map) params.map = map;
    }
    if (o.bumpKind) {
      const b = bumpTex(THREE, o.bumpKind);
      if (b) {
        params.bumpMap = b;
        params.bumpScale = o.bumpScale !== undefined ? o.bumpScale : 0.025;
      }
    }
    if (o.emissive !== undefined) {
      params.emissive = o.emissive;
      params.emissiveIntensity = o.emissiveIntensity !== undefined ? o.emissiveIntensity : 0.8;
    }
    if (o.transparent) {
      params.transparent = true;
      params.opacity = o.opacity !== undefined ? o.opacity : 0.7;
    }
    if (o.side !== undefined) params.side = o.side;
    if (o.flatShading) params.flatShading = true;
    return new THREE.MeshStandardMaterial(params);
  }

  function add(THREE, parent, geo, material, pos, rot, scale) {
    const m = new THREE.Mesh(geo, material);
    if (pos) m.position.set(pos[0] || 0, pos[1] || 0, pos[2] || 0);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    if (scale) m.scale.set(scale[0] || 1, scale[1] || 1, scale[2] || 1);
    parent.add(m);
    return m;
  }

  function joint(THREE, parent, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x || 0, y || 0, z || 0);
    if (parent) parent.add(g);
    return g;
  }

  function tube(THREE, ptsArray, radius, tubularSegs, radialSegs, material) {
    const pts = ptsArray.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, tubularSegs || 16, radius || 0.04, radialSegs || 7, false);
    return new THREE.Mesh(geo, material);
  }

  function lathe(THREE, pts2D, segs, material) {
    const pts = pts2D.map(p => new THREE.Vector2(p[0], p[1]));
    const geo = new THREE.LatheGeometry(pts, segs || 14);
    return new THREE.Mesh(geo, material);
  }

  function extrude(THREE, pts2D, depth, bevelSize, material) {
    const shape = new THREE.Shape();
    shape.moveTo(pts2D[0][0], pts2D[0][1]);
    for (let i = 1; i < pts2D.length; i++) shape.lineTo(pts2D[i][0], pts2D[i][1]);
    shape.closePath();
    const d = depth || 0.08;
    const b = bevelSize !== undefined ? bevelSize : 0.015;
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: d,
      bevelEnabled: b > 0,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: 2
    });
    geo.translate(0, 0, -d * 0.5);
    return new THREE.Mesh(geo, material);
  }

  function rivetRing(THREE, parent, radius, count, rivetRadius, material, y, axis) {
    const g = new THREE.SphereGeometry(rivetRadius || 0.02, 6, 5);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const m = new THREE.Mesh(g, material);
      if (axis === 'z') {
        m.position.set(Math.cos(a) * radius, Math.sin(a) * radius, y || 0);
      } else {
        m.position.set(Math.cos(a) * radius, y || 0, Math.sin(a) * radius);
      }
      parent.add(m);
    }
  }

  function makePauldron(THREE, baseMat, trimMat, opts) {
    const o = opts || {};
    const side = o.side || 1;
    const sc = o.scale || 1;
    const g = new THREE.Group();
    const capGeo = new THREE.SphereGeometry(0.18 * sc, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const tier1 = new THREE.Mesh(capGeo, baseMat);
    tier1.scale.set(1.15, 0.9, 1.25);
    tier1.rotation.z = -side * 0.35;
    g.add(tier1);

    const tier2 = new THREE.Mesh(capGeo, trimMat);
    tier2.scale.set(1.22, 0.45, 1.32);
    tier2.position.set(side * 0.04 * sc, -0.05 * sc, 0);
    tier2.rotation.z = -side * 0.45;
    g.add(tier2);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17 * sc, 0.018 * sc, 6, 14, Math.PI), trimMat);
    rim.rotation.set(Math.PI / 2, 0, -side * 0.4);
    rim.position.y = -0.02 * sc;
    g.add(rim);

    rivetRing(THREE, g, 0.16 * sc, 5, 0.015 * sc, trimMat, 0.02 * sc, 'y');

    if (o.spikes) {
      const spGeo = new THREE.ConeGeometry(0.032 * sc, 0.14 * sc, 6);
      [-0.08, 0, 0.08].forEach((zp, idx) => {
        const sp = new THREE.Mesh(spGeo, trimMat);
        sp.position.set(side * (0.08 + (idx === 1 ? 0.04 : 0)) * sc, 0.14 * sc, zp * sc);
        sp.rotation.z = -side * 0.55;
        g.add(sp);
      });
    }
    return g;
  }

  function makeHand(THREE, baseMat, trimMat, side, opts) {
    const o = opts || {};
    const sc = o.scale || 1;
    const g = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.09 * sc, 0.1 * sc, 0.06 * sc), baseMat);
    g.add(palm);

    const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.095 * sc, 0.032 * sc, 0.07 * sc), trimMat);
    knuckle.position.set(0, -0.02 * sc, 0.005 * sc);
    g.add(knuckle);

    for (let f = 0; f < 4; f++) {
      const fx = (-0.033 + f * 0.022) * sc;
      const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.009 * sc, 0.008 * sc, 0.065 * sc, 5), baseMat);
      fin.position.set(fx, -0.07 * sc, 0.015 * sc);
      fin.rotation.x = 0.35;
      g.add(fin);
      if (o.claws) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.008 * sc, 0.035 * sc, 4), trimMat);
        claw.position.set(fx, -0.105 * sc, 0.025 * sc);
        claw.rotation.x = Math.PI - 0.35;
        g.add(claw);
      }
    }
    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.011 * sc, 0.01 * sc, 0.055 * sc, 5), baseMat);
    thumb.position.set(-side * 0.05 * sc, -0.035 * sc, 0.035 * sc);
    thumb.rotation.set(0.4, 0, side * 0.55);
    g.add(thumb);
    return g;
  }

  function makeBoot(THREE, upperMat, trimMat, soleMat, scale) {
    const sc = scale || 1;
    const g = new THREE.Group();
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.14 * sc, 0.04 * sc, 0.24 * sc), soleMat);
    sole.position.set(0, -0.04 * sc, 0.035 * sc);
    g.add(sole);

    const heel = new THREE.Mesh(new THREE.BoxGeometry(0.13 * sc, 0.05 * sc, 0.1 * sc), soleMat);
    heel.position.set(0, -0.02 * sc, -0.04 * sc);
    g.add(heel);

    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.125 * sc, 0.09 * sc, 0.18 * sc), upperMat);
    upper.position.set(0, 0.015 * sc, 0.02 * sc);
    g.add(upper);

    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.065 * sc, 8, 6), trimMat);
    toe.scale.set(1, 0.72, 1.15);
    toe.position.set(0, 0.005 * sc, 0.115 * sc);
    g.add(toe);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.072 * sc, 0.076 * sc, 0.06 * sc, 8), trimMat);
    collar.position.set(0, 0.07 * sc, -0.01 * sc);
    g.add(collar);
    return g;
  }

  function makeSkull(THREE, boneMat, darkMat, eyeMat, opts) {
    const o = opts || {};
    const sc = o.scale || 1;
    const g = new THREE.Group();

    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.17 * sc, 12, 10), boneMat);
    cranium.scale.set(0.95, 1.05, 1.1);
    cranium.position.y = 0.04 * sc;
    g.add(cranium);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.24 * sc, 0.045 * sc, 0.09 * sc), boneMat);
    brow.position.set(0, 0.065 * sc, 0.135 * sc);
    g.add(brow);

    [-1, 1].forEach(s => {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.075 * sc, 0.06 * sc, 0.09 * sc), boneMat);
      cheek.position.set(s * 0.09 * sc, -0.02 * sc, 0.12 * sc);
      g.add(cheek);

      const socket = new THREE.Mesh(new THREE.SphereGeometry(0.042 * sc, 8, 6), darkMat);
      socket.position.set(s * 0.062 * sc, 0.025 * sc, 0.145 * sc);
      g.add(socket);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026 * sc, 8, 6), eyeMat);
      eye.position.set(s * 0.062 * sc, 0.025 * sc, 0.168 * sc);
      g.add(eye);
    });

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.024 * sc, 0.05 * sc, 4), darkMat);
    nose.position.set(0, -0.015 * sc, 0.17 * sc);
    g.add(nose);

    const upperJaw = new THREE.Mesh(new THREE.BoxGeometry(0.15 * sc, 0.055 * sc, 0.11 * sc), boneMat);
    upperJaw.position.set(0, -0.07 * sc, 0.11 * sc);
    g.add(upperJaw);

    for (let t = -2; t <= 2; t++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.018 * sc, 0.028 * sc, 0.018 * sc), boneMat);
      tooth.position.set(t * 0.024 * sc, -0.105 * sc, 0.158 * sc);
      g.add(tooth);
    }

    const jaw = new THREE.Group();
    jaw.position.set(0, -0.09 * sc, 0.02 * sc);
    const chin = new THREE.Mesh(new THREE.BoxGeometry(0.14 * sc, 0.048 * sc, 0.13 * sc), boneMat);
    chin.position.set(0, -0.045 * sc, 0.075 * sc);
    jaw.add(chin);
    for (let t = -2; t <= 2; t++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.016 * sc, 0.022 * sc, 0.016 * sc), boneMat);
      tooth.position.set(t * 0.022 * sc, -0.015 * sc, 0.13 * sc);
      jaw.add(tooth);
    }
    g.add(jaw);
    g.userData.jaw = jaw;
    return g;
  }

  function makeFlameCluster(THREE, outerHex, innerHex, scale) {
    const sc = scale || 1;
    const g = new THREE.Group();
    const outerMat = new THREE.MeshBasicMaterial({
      color: outerHex !== undefined ? outerHex : 0xf97316,
      transparent: true,
      opacity: 0.78
    });
    const innerMat = new THREE.MeshBasicMaterial({
      color: innerHex !== undefined ? innerHex : 0xfef08a,
      transparent: true,
      opacity: 0.92
    });
    const main = new THREE.Mesh(new THREE.ConeGeometry(0.11 * sc, 0.36 * sc, 7), outerMat);
    main.position.y = 0.18 * sc;
    g.add(main);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.06 * sc, 0.24 * sc, 6), innerMat);
    core.position.y = 0.13 * sc;
    g.add(core);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const tongue = new THREE.Mesh(new THREE.ConeGeometry(0.055 * sc, 0.22 * sc, 5), outerMat);
      tongue.position.set(Math.cos(a) * 0.055 * sc, 0.12 * sc, Math.sin(a) * 0.055 * sc);
      tongue.rotation.set(Math.sin(a) * 0.28, 0, -Math.cos(a) * 0.28);
      g.add(tongue);
    }
    g.userData.flameCore = core;
    return g;
  }

  function saveDefaults(obj) {
    if (!obj) return;
    obj.userData._defPos = obj.position.clone();
    obj.userData._defRot = obj.rotation.clone();
    obj.userData._defScale = obj.scale.clone();
  }

  function restoreDefaults(obj) {
    if (!obj || !obj.userData._defPos) return;
    obj.position.copy(obj.userData._defPos);
    obj.rotation.copy(obj.userData._defRot);
    obj.scale.copy(obj.userData._defScale);
  }

  function createHumanoidAnimator(parts, opts) {
    const o = Object.assign({
      armSwing: 0.72,
      legSwing: 0.68,
      heavyLean: 0.25,
      jetpackFlames: null,
      shieldDome: null,
      orbitOrbs: null,
      auraRings: null,
      cape: null,
      tassets: null,
      beard: null,
      braids: null,
      jaw: null
    }, opts || {});

    const tracked = [
      parts.rig, parts.pelvis, parts.torso, parts.chest, parts.neck, parts.head,
      parts.leftArm, parts.leftForearm, parts.rightArm, parts.rightForearm,
      parts.leftLeg, parts.leftShin, parts.leftFoot,
      parts.rightLeg, parts.rightShin, parts.rightFoot,
      o.cape, o.beard, o.shieldDome, o.jaw
    ];
    if (Array.isArray(o.tassets)) o.tassets.forEach(t => tracked.push(t));
    if (Array.isArray(o.braids)) o.braids.forEach(b => tracked.push(b));
    if (Array.isArray(o.jetpackFlames)) o.jetpackFlames.forEach(f => tracked.push(f));
    if (Array.isArray(o.orbitOrbs)) o.orbitOrbs.forEach(orb => tracked.push(orb));
    if (Array.isArray(o.auraRings)) o.auraRings.forEach(r => tracked.push(r));
    tracked.forEach(saveDefaults);

    function resetAll() {
      tracked.forEach(restoreDefaults);
    }

    return function animate(t, animName) {
      resetAll();
      const s = Math.sin(t * 2.4);
      const c = Math.cos(t * 2.4);
      const rig = parts.rig;
      const torso = parts.torso || rig;
      const pelvis = parts.pelvis || rig;
      const head = parts.head;

      if (o.shieldDome) o.shieldDome.scale.setScalar(0.001);
      if (Array.isArray(o.jetpackFlames)) {
        o.jetpackFlames.forEach((f, idx) => {
          const flick = 0.28 + 0.08 * Math.sin(t * 22 + idx);
          f.scale.set(0.65, flick, 0.65);
        });
      }
      if (Array.isArray(o.orbitOrbs)) {
        o.orbitOrbs.forEach((orb, idx) => {
          const a = t * 1.8 + (idx / o.orbitOrbs.length) * Math.PI * 2;
          orb.position.set(Math.cos(a) * 0.52, 1.35 + Math.sin(t * 3 + idx) * 0.09, Math.sin(a) * 0.52);
          orb.rotation.y = t * 2.2;
        });
      }
      if (Array.isArray(o.auraRings)) {
        o.auraRings.forEach((ring, idx) => {
          ring.rotation.z = t * (idx % 2 === 0 ? 1.8 : -2.2);
        });
      }

      switch (animName) {
        case 'walk': {
          const w = t * 5.8;
          rig.position.y += Math.abs(Math.sin(w)) * 0.045;
          pelvis.rotation.y = Math.sin(w) * 0.07;
          torso.rotation.y = -Math.sin(w) * 0.1;
          torso.rotation.x = 0.07;
          if (head) head.rotation.y = Math.sin(w) * 0.05;
          parts.leftLeg.rotation.x = Math.sin(w) * o.legSwing;
          parts.rightLeg.rotation.x = -Math.sin(w) * o.legSwing;
          if (parts.leftShin) parts.leftShin.rotation.x = Math.max(0, -Math.cos(w) * 0.62);
          if (parts.rightShin) parts.rightShin.rotation.x = Math.max(0, Math.cos(w) * 0.62);
          if (parts.leftFoot) parts.leftFoot.rotation.x = Math.sin(w) * 0.22;
          if (parts.rightFoot) parts.rightFoot.rotation.x = -Math.sin(w) * 0.22;
          parts.leftArm.rotation.x = -Math.sin(w) * o.armSwing;
          parts.rightArm.rotation.x = Math.sin(w) * o.armSwing;
          if (parts.leftForearm) parts.leftForearm.rotation.x = -0.35 - Math.max(0, Math.sin(w)) * 0.3;
          if (parts.rightForearm) parts.rightForearm.rotation.x = -0.35 - Math.max(0, -Math.sin(w)) * 0.3;
          if (o.cape) o.cape.rotation.x = 0.18 + Math.abs(Math.sin(w)) * 0.12;
          break;
        }
        case 'run': {
          const r = t * 10.0;
          rig.position.y += Math.abs(Math.sin(r)) * 0.095;
          torso.rotation.x = 0.26;
          torso.rotation.y = -Math.sin(r) * 0.16;
          pelvis.rotation.y = Math.sin(r) * 0.12;
          if (head) head.rotation.x = -0.18;
          parts.leftLeg.rotation.x = Math.sin(r) * (o.legSwing * 1.38);
          parts.rightLeg.rotation.x = -Math.sin(r) * (o.legSwing * 1.38);
          if (parts.leftShin) parts.leftShin.rotation.x = Math.max(0, -Math.cos(r) * 1.05);
          if (parts.rightShin) parts.rightShin.rotation.x = Math.max(0, Math.cos(r) * 1.05);
          parts.leftArm.rotation.x = -Math.sin(r) * (o.armSwing * 1.32);
          parts.rightArm.rotation.x = Math.sin(r) * (o.armSwing * 1.32);
          if (parts.leftForearm) parts.leftForearm.rotation.x = -0.95;
          if (parts.rightForearm) parts.rightForearm.rotation.x = -0.95;
          if (o.cape) o.cape.rotation.x = 0.48 + Math.sin(r * 2) * 0.12;
          if (Array.isArray(o.jetpackFlames)) {
            o.jetpackFlames.forEach((f, idx) => f.scale.set(0.95, 0.7 + 0.18 * Math.sin(t * 28 + idx), 0.95));
          }
          break;
        }
        case 'jump': {
          const phase = (t * 1.5) % 1;
          const arc = Math.sin(phase * Math.PI);
          rig.position.y += arc * 0.42;
          torso.rotation.x = -0.1 + arc * 0.22;
          parts.leftLeg.rotation.x = -0.52 * arc;
          parts.rightLeg.rotation.x = 0.32 * arc;
          if (parts.leftShin) parts.leftShin.rotation.x = 0.92 * arc;
          if (parts.rightShin) parts.rightShin.rotation.x = 0.42 * arc;
          parts.leftArm.rotation.z += 0.45 + arc * 0.55;
          parts.rightArm.rotation.z -= 0.45 + arc * 0.55;
          if (Array.isArray(o.jetpackFlames)) {
            o.jetpackFlames.forEach((f, idx) => f.scale.set(1.25, 1.05 + arc * 0.95 + Math.sin(t * 32 + idx) * 0.2, 1.25));
          }
          break;
        }
        case 'attack_melee': {
          const a = (t * 2.6) % 1;
          const swing = Math.sin(a * Math.PI * 2);
          torso.rotation.y = -0.35 + swing * 0.85;
          torso.rotation.x = 0.16;
          parts.rightArm.rotation.x = -1.25 + swing * 1.45;
          parts.rightArm.rotation.z -= 0.38;
          if (parts.rightForearm) parts.rightForearm.rotation.x = -0.55;
          parts.leftArm.rotation.x = -0.55 - swing * 0.3;
          parts.leftLeg.rotation.x = -0.25;
          parts.rightLeg.rotation.x = 0.28;
          break;
        }
        case 'attack_heavy': {
          const h = (t * 1.75) % 1;
          const wind = h < 0.45 ? -h * 3.1 : Math.sin((h - 0.45) * Math.PI * 1.8) * 1.65;
          torso.rotation.x = o.heavyLean + wind * 0.38;
          parts.rightArm.rotation.x = -2.25 + wind * 1.45;
          parts.leftArm.rotation.x = -1.95 + wind * 1.25;
          if (parts.rightForearm) parts.rightForearm.rotation.x = -0.45;
          rig.position.y += h < 0.45 ? 0.08 : -0.06;
          parts.leftLeg.rotation.x = -0.28;
          parts.rightLeg.rotation.x = 0.32;
          break;
        }
        case 'attack_ranged': {
          const recoil = Math.max(0, Math.sin(t * 8)) * 0.14;
          torso.rotation.y = 0.4;
          parts.rightArm.rotation.x = -1.48 + recoil;
          parts.rightArm.rotation.z -= 0.05;
          if (parts.rightForearm) parts.rightForearm.rotation.x = -0.25;
          parts.leftArm.rotation.x = -1.25 + recoil * 0.5;
          parts.leftArm.rotation.z += 0.3;
          if (head) head.rotation.y = -0.32;
          parts.leftLeg.rotation.x = -0.22;
          parts.rightLeg.rotation.x = 0.25;
          break;
        }
        case 'cast_spell': {
          const pulse = Math.sin(t * 5.2);
          rig.position.y += 0.08 + pulse * 0.045;
          torso.rotation.x = -0.14;
          parts.leftArm.rotation.x = -1.55 + pulse * 0.22;
          parts.rightArm.rotation.x = -1.55 - pulse * 0.22;
          parts.leftArm.rotation.z += 0.45;
          parts.rightArm.rotation.z -= 0.45;
          if (Array.isArray(o.orbitOrbs)) {
            o.orbitOrbs.forEach((orb, idx) => {
              const a = t * 4.5 + (idx / o.orbitOrbs.length) * Math.PI * 2;
              orb.position.set(Math.cos(a) * 0.68, 1.48 + Math.sin(t * 6 + idx) * 0.14, Math.sin(a) * 0.68);
              orb.scale.setScalar(1.35 + pulse * 0.2);
            });
          }
          if (Array.isArray(o.auraRings)) {
            o.auraRings.forEach((ring, idx) => {
              ring.scale.setScalar(1.35 + Math.sin(t * 6 + idx) * 0.2);
            });
          }
          break;
        }
        case 'block': {
          const brace = Math.sin(t * 3.2) * 0.025;
          torso.rotation.y = -0.34;
          torso.rotation.x = 0.16 + brace;
          parts.leftArm.rotation.x = -1.18 + brace;
          parts.leftArm.rotation.z -= 0.32;
          if (parts.leftForearm) parts.leftForearm.rotation.x = -0.65;
          parts.rightArm.rotation.x = -0.75 - brace;
          parts.leftLeg.rotation.x = -0.32;
          parts.rightLeg.rotation.x = 0.32;
          if (parts.leftShin) parts.leftShin.rotation.x = 0.38;
          if (o.shieldDome) o.shieldDome.scale.setScalar(1.0 + Math.sin(t * 6) * 0.04);
          break;
        }
        case 'dodge': {
          const d = t * 4.6;
          rig.position.x += Math.sin(d) * 0.26;
          rig.position.y -= Math.abs(Math.cos(d)) * 0.14;
          torso.rotation.z = -Math.sin(d) * 0.38;
          torso.rotation.x = 0.38;
          parts.leftArm.rotation.x = -0.9;
          parts.rightArm.rotation.x = -0.9;
          parts.leftLeg.rotation.x = -0.45;
          parts.rightLeg.rotation.x = 0.35;
          break;
        }
        case 'hurt': {
          const flinch = Math.abs(Math.sin(t * 5.5));
          torso.rotation.x = -0.36 * flinch;
          if (head) head.rotation.x = -0.32 * flinch;
          parts.leftArm.rotation.z += 0.48 * flinch;
          parts.rightArm.rotation.z -= 0.48 * flinch;
          rig.position.z -= 0.12 * flinch;
          break;
        }
        case 'victory': {
          const cheer = Math.sin(t * 4.2);
          rig.position.y += Math.abs(cheer) * 0.1;
          parts.rightArm.rotation.x = -2.55 + cheer * 0.22;
          parts.leftArm.rotation.x = -2.35 - cheer * 0.18;
          parts.leftArm.rotation.z += 0.32;
          parts.rightArm.rotation.z -= 0.32;
          torso.rotation.x = -0.12;
          if (head) head.rotation.x = -0.18;
          break;
        }
        case 'idle':
        default: {
          rig.position.y += s * 0.018;
          torso.rotation.x = s * 0.032;
          if (head) head.rotation.y = c * 0.065;
          parts.leftArm.rotation.x = s * 0.055;
          parts.rightArm.rotation.x = -s * 0.055;
          if (o.cape) o.cape.rotation.x = 0.08 + s * 0.04;
          if (o.beard) o.beard.rotation.x = s * 0.04;
          if (Array.isArray(o.braids)) o.braids.forEach((b, i) => { b.rotation.z += Math.sin(t * 2 + i) * 0.05; });
          if (Array.isArray(o.tassets)) o.tassets.forEach((ta, i) => { ta.rotation.x += s * 0.04 * (i % 2 === 0 ? 1 : -1); });
          break;
        }
      }
    };
  }

  function createEnemyAnimator(parts, opts) {
    const o = Object.assign({
      archetype: 'humanoid',
      legs: null,
      wings: null,
      rotor: null,
      jaw: null,
      pylons: null,
      halos: null,
      orbs: null,
      flame: null
    }, opts || {});

    const tracked = [
      parts.rig, parts.torso, parts.head,
      parts.leftArm, parts.rightArm, parts.leftLeg, parts.rightLeg,
      o.rotor, o.jaw, o.flame
    ];
    if (Array.isArray(o.legs)) o.legs.forEach(l => tracked.push(l));
    if (Array.isArray(o.wings)) o.wings.forEach(w => tracked.push(w));
    if (Array.isArray(o.pylons)) o.pylons.forEach(p => tracked.push(p));
    if (Array.isArray(o.halos)) o.halos.forEach(h => tracked.push(h));
    if (Array.isArray(o.orbs)) o.orbs.forEach(orb => tracked.push(orb));
    tracked.forEach(saveDefaults);

    return function animate(t, animName) {
      tracked.forEach(restoreDefaults);
      const s = Math.sin(t * 2.8);
      const rig = parts.rig;

      if (o.rotor) o.rotor.rotation.y = t * 14.0;
      if (o.flame && o.flame.userData.flameCore) {
        const sc = 0.9 + Math.sin(t * 19) * 0.16;
        o.flame.scale.set(sc, 0.95 + Math.cos(t * 23) * 0.2, sc);
      }
      if (o.jaw) o.jaw.rotation.x = 0.08 + Math.abs(Math.sin(t * 4.5)) * 0.16;
      if (Array.isArray(o.halos)) {
        o.halos.forEach((h, i) => { h.rotation.z = t * (i % 2 === 0 ? 1.3 : -1.7); });
      }
      if (Array.isArray(o.pylons)) {
        o.pylons.forEach((p, i) => {
          p.position.y += Math.sin(t * 3 + i * 1.4) * 0.06;
          p.rotation.y = t * 0.9 + i;
        });
      }
      if (Array.isArray(o.orbs)) {
        o.orbs.forEach((orb, i) => {
          const a = t * 2.2 + (i / o.orbs.length) * Math.PI * 2;
          orb.position.set(Math.cos(a) * 0.45, orb.userData._defPos.y + Math.sin(t * 4 + i) * 0.06, Math.sin(a) * 0.45);
        });
      }

      if (o.archetype === 'spider' && Array.isArray(o.legs)) {
        const speed = animName === 'move' ? 9.5 : animName === 'attack' ? 12 : 3.2;
        if (animName === 'death') {
          rig.rotation.x = Math.PI;
          rig.position.y += 0.25;
          o.legs.forEach((l, i) => { l.rotation.z *= 0.4; l.rotation.x += 0.65 + Math.sin(t * 3.5 + i) * 0.04; });
          return;
        }
        if (animName === 'hurt') {
          rig.rotation.x = -0.35 * Math.abs(Math.sin(t * 6));
        } else if (animName === 'attack') {
          const lunge = Math.sin(t * 5);
          rig.position.z += Math.max(0, lunge) * 0.24;
          rig.rotation.x = -0.25 * Math.max(0, lunge);
        } else if (animName === 'special') {
          rig.rotation.x = -0.32;
          rig.position.y += 0.1 + Math.abs(Math.sin(t * 6)) * 0.08;
        }
        o.legs.forEach((leg, i) => {
          const phase = (i % 2 === 0 ? 1 : -1) * (i < 4 ? 1 : -1);
          leg.rotation.y += Math.sin(t * speed + i) * 0.24 * phase;
          leg.rotation.z += Math.cos(t * speed + i) * 0.18;
        });
        return;
      }

      if (o.archetype === 'floating') {
        rig.position.y += Math.sin(t * 3.0) * 0.1;
        if (animName === 'move') rig.rotation.x = 0.22;
        else if (animName === 'attack') {
          const p = Math.sin(t * 6);
          rig.position.z += p * 0.22;
          rig.rotation.x = 0.25;
          if (o.jaw) o.jaw.rotation.x = 0.45;
        } else if (animName === 'special') {
          rig.rotation.y = t * 4.5;
          rig.position.y += 0.16;
        } else if (animName === 'hurt') {
          rig.rotation.z = Math.sin(t * 14) * 0.3;
        } else if (animName === 'death') {
          rig.position.y -= 0.45;
          rig.rotation.x = 1.25;
          if (o.rotor) o.rotor.rotation.y = 0;
        }
        return;
      }

      // Humanoid & Winged Boss
      if (Array.isArray(o.wings)) {
        const flapFreq = animName === 'special' ? 7 : 2.6;
        const flapAmp = animName === 'special' ? 0.45 : 0.18;
        o.wings.forEach((w, idx) => {
          w.rotation.y += (idx === 0 ? 1 : -1) * Math.sin(t * flapFreq) * flapAmp;
        });
      }

      switch (animName) {
        case 'move': {
          const w = t * 5.8;
          rig.position.y += Math.abs(Math.sin(w)) * 0.06;
          if (parts.torso) parts.torso.rotation.x = 0.12;
          if (parts.leftLeg) parts.leftLeg.rotation.x = Math.sin(w) * 0.62;
          if (parts.rightLeg) parts.rightLeg.rotation.x = -Math.sin(w) * 0.62;
          if (parts.leftArm) parts.leftArm.rotation.x = -Math.sin(w) * 0.6;
          if (parts.rightArm) parts.rightArm.rotation.x = Math.sin(w) * 0.6;
          break;
        }
        case 'attack': {
          const sw = Math.sin(t * 5.2);
          if (parts.torso) parts.torso.rotation.y = sw * 0.6;
          if (parts.rightArm) parts.rightArm.rotation.x = -1.35 + sw * 1.3;
          if (parts.leftArm) parts.leftArm.rotation.x = -0.8 - sw * 0.5;
          break;
        }
        case 'special': {
          const sp = Math.sin(t * 5);
          rig.position.y += 0.12 + sp * 0.06;
          if (parts.leftArm) { parts.leftArm.rotation.x = -2.1 + sp * 0.12; parts.leftArm.rotation.z += 0.35; }
          if (parts.rightArm) { parts.rightArm.rotation.x = -2.1 - sp * 0.12; parts.rightArm.rotation.z -= 0.35; }
          if (parts.torso) parts.torso.rotation.x = -0.18;
          break;
        }
        case 'hurt': {
          const fl = Math.abs(Math.sin(t * 6));
          if (parts.torso) parts.torso.rotation.x = -0.35 * fl;
          if (parts.head) parts.head.rotation.x = -0.3 * fl;
          rig.position.z -= 0.12 * fl;
          break;
        }
        case 'death': {
          const settle = Math.sin(t * 2.5) * 0.025;
          rig.rotation.x = -Math.PI * 0.48 + settle;
          rig.position.y -= 0.38;
          if (parts.leftArm) parts.leftArm.rotation.z += 0.6 + settle;
          if (parts.rightArm) parts.rightArm.rotation.z -= 0.6 + settle;
          break;
        }
        case 'idle':
        default: {
          rig.position.y += s * 0.02;
          if (parts.torso) parts.torso.rotation.x = s * 0.035;
          if (parts.head) parts.head.rotation.y = Math.cos(t * 1.9) * 0.08;
          if (parts.leftArm) parts.leftArm.rotation.x = s * 0.06;
          if (parts.rightArm) parts.rightArm.rotation.x = -s * 0.06;
          break;
        }
      }
    };
  }

  function createPropAnimator(root, animList, updateFn) {
    root.userData.animations = animList.slice();
    root.userData.animate = function (t, animName) {
      updateFn(t, animName || animList[0]);
    };
    return root;
  }

  window.GGG_GRAVEGAIN_KIT = {
    RACE_ANIMATIONS,
    ENEMY_ANIMATIONS,
    tex,
    bumpTex,
    mat,
    add,
    joint,
    tube,
    lathe,
    extrude,
    rivetRing,
    makePauldron,
    makeHand,
    makeBoot,
    makeSkull,
    makeFlameCluster,
    saveDefaults,
    restoreDefaults,
    createHumanoidAnimator,
    createEnemyAnimator,
    createPropAnimator
  };
})();
