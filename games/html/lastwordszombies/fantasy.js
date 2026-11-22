/* Live scenery for the Fantasy map. The center lane stays clear for word targets. */
function buildFantasyMap(game) {
  const ground = -1.77;
  let seed = 37;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const stone = color => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95 });
  const glow = color => new THREE.MeshBasicMaterial({ color, fog: false });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const rock = new THREE.DodecahedronGeometry(1, 0);
  const cone = new THREE.ConeGeometry(1, 1, 5);
  const wood = stone(0x472b38);
  const iron = stone(0x232943);
  const grass = stone(0x385948);
  const masonry = [0x505d85, 0x444d75, 0x727795, 0x53516c].map(stone);
  const paving = [0x586780, 0x485571, 0x676d83, 0x535873].map(stone);
  const flame = glow(0xff9c31);
  const flameCore = glow(0xffe8a0);

  function mesh(geometry, material, x, y, z, sx, sy, sz) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.scale.set(sx, sy, sz);
    return game.addLevelMesh(object);
  }

  function cross(x, y, z, size, material) {
    mesh(box, material, x, y, z, 0.17 * size, size, 0.15 * size);
    mesh(box, material, x, y + size * 0.15, z, 0.63 * size, 0.16 * size, 0.16 * size);
  }

  mesh(box, stone(0x28394e), 0, ground - 0.16, -27, 95, 0.3, 84).receiveShadow = true;
  // Batch the cobbles by material to keep the path inexpensive on mobile.
  const cobble = new THREE.Object3D();
  paving.forEach((material, shade) => {
    const tiles = new THREE.InstancedMesh(box, material, 63);
    for (let i = 0; i < tiles.count; i++) {
      const index = shade + i * paving.length;
      const row = Math.floor(index / 7);
      const column = index % 7;
      cobble.position.set((column - 3) * 0.79 + (row % 2 ? 0.2 : -0.2), ground, 4.7 - row * 0.82);
      cobble.scale.set(0.72 + random() * 0.05, 0.07, 0.7 + random() * 0.08);
      cobble.rotation.y = (random() - 0.5) * 0.18;
      cobble.updateMatrix();
      tiles.setMatrixAt(i, cobble.matrix);
    }
    tiles.receiveShadow = true;
    game.addLevelMesh(tiles);
  });

  for (const side of [-1, 1]) {
    for (let i = 0; i < 13; i++) {
      const x = side * (3 + random() * 4);
      const z = 2 - i * 2.4;
      const height = 0.54 + random() * 0.72;
      const material = masonry[i % masonry.length];
      const grave = mesh(rock, material, x, ground + height * 0.46, z, 0.38, height * 0.62, 0.17);
      grave.rotation.set(0.12, side * 0.27, side * (random() - 0.55) * 0.35);
      mesh(box, material, x, ground + 0.09, z, 0.9, 0.18, 0.53);
      if (i % 4 === 1) cross(x, ground + height + 0.16, z, 0.53, material);
      for (let blade = 0; blade < 3; blade++) {
        mesh(cone, grass, x + (blade - 1) * 0.14, ground + 0.16, z + 0.48,
          0.08, 0.31 + random() * 0.23, 0.07).rotation.z = (blade - 1) * 0.32;
      }
    }

    for (let i = 0; i < 15; i++) {
      const x = side * (2.55 + i * 0.63);
      mesh(box, iron, x, ground + 0.72, -20, 0.055, 1.45, 0.06);
      mesh(cone, iron, x, ground + 1.49, -20, 0.11, 0.27, 0.10);
    }
    for (const y of [0.42, 1.12]) {
      mesh(box, iron, side * 7, ground + y, -20, 9, 0.07, 0.08);
    }
  }

  // Segmented stone arch, framing the lane and the distant spawn.
  for (const x of [-1.93, 1.93]) {
    for (let row = 0; row < 5; row++) {
      mesh(box, masonry[row % 4], x, ground + 0.23 + row * 0.47, -20, 0.56, 0.45, 0.78);
    }
  }
  for (let i = 0; i <= 10; i++) {
    const angle = i * Math.PI / 10;
    const block = mesh(box, masonry[i % 4], 1.93 * Math.cos(angle),
      ground + 2.2 + 1.8 * Math.sin(angle), -20, 0.55, 0.60, 0.8);
    block.rotation.z = angle;
  }
  cross(0, ground + 4.65, -20, 0.95, masonry[2]);

  function brazier(x, z) {
    mesh(box, iron, x, ground + 0.58, z, 0.13, 1.16, 0.13);
    mesh(rock, iron, x, ground + 1.17, z, 0.35, 0.18, 0.35);
    const tip = mesh(cone, flame, x, ground + 1.46, z, 0.23, 0.60, 0.23);
    tip.rotation.z = 0.2;
    mesh(rock, flameCore, x, ground + 1.35, z + 0.07, 0.14, 0.21, 0.14);
    const light = game.addLevelMesh(new THREE.PointLight(0xff9c45, 10, 10, 2));
    light.position.set(x, ground + 1.55, z);
    game.lights.push({ bulb: tip, light, baseIntensity: 10, zOffset: z, torch: true });
  }
  brazier(-2.75, -18.9);
  brazier(2.75, -18.9);
  brazier(-2.85, -2.2);
  brazier(2.95, 0.35);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, '#0c153b');
  sky.addColorStop(0.52, '#193767');
  sky.addColorStop(1, '#557da6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 100; i++) {
    ctx.fillStyle = i % 6 ? '#7795bb' : '#c5e4ff';
    ctx.fillRect(random() * 512, random() * 155, 1, 1);
  }
  for (let i = 0; i < 36; i++) {
    const x = random() * 512;
    const y = 132 + random() * 91;
    ctx.fillStyle = i % 2 ? '#294a7544' : '#5784aa32';
    ctx.beginPath();
    ctx.ellipse(x, y, 20 + random() * 55, 3 + random() * 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const halo = ctx.createRadialGradient(308, 91, 10, 308, 91, 55);
  halo.addColorStop(0, '#c7f5ff');
  halo.addColorStop(0.42, '#76c8ff6b');
  halo.addColorStop(1, '#76c8ff00');
  ctx.fillStyle = halo;
  ctx.fillRect(253, 36, 110, 110);
  ctx.beginPath();
  ctx.arc(308, 91, 17, 0, Math.PI * 2);
  ctx.fillStyle = '#c3efff';
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 22; i++) {
    const x = 291 + random() * 34;
    const y = 74 + random() * 34;
    ctx.fillStyle = i % 2 ? '#71b5e94d' : '#ffffff55';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 8, y + 3);
    ctx.lineTo(x + 2, y + 10);
    ctx.fill();
  }
  ctx.restore();

  const skyTexture = new THREE.CanvasTexture(canvas);
  skyTexture.encoding = THREE.sRGBEncoding;
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(173, 86.5),
    new THREE.MeshBasicMaterial({ map: skyTexture, toneMapped: false, fog: false })
  );
  backdrop.position.set(0, 17, -76);
  game.addLevelMesh(backdrop);

  function branch(start, end, radius) {
    const direction = end.clone().sub(start);
    const middle = start.clone().addScaledVector(direction, 0.5);
    const limb = mesh(cone, wood, middle.x, middle.y, middle.z, radius, direction.length() + 0.14, radius);
    limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  }
  for (const [x, z, side] of [[-4.2, -3.5, -1], [5.1, -7, 1], [-7.7, -15, -1], [8, -23, 1]]) {
    const point = (dx, dy, dz = 0) => new THREE.Vector3(x + dx * side, ground + dy, z + dz);
    branch(point(0, 0), point(-0.3, 3.5), 0.55);
    branch(point(-0.22, 2), point(-1.4, 4.6), 0.25);
    branch(point(-1, 3.7), point(-2.3, 4.8, 0.3), 0.13);
    branch(point(-0.2, 2.4), point(1.4, 4.1, -0.5), 0.32);
    branch(point(0.85, 3.5, -0.38), point(2, 3.8, -0.2), 0.14);
    branch(point(0.75, 3.4, -0.33), point(1.22, 4.85, -0.6), 0.13);
  }

  const canvasCloth = stone(0x9b6172);
  const tent = mesh(new THREE.ConeGeometry(1, 1, 4), canvasCloth, -5.5, ground + 1.38, -6, 2.45, 2.75, 2.05);
  tent.rotation.y = Math.PI / 4;
  mesh(box, wood, -5.5, ground + 1.55, -4.56, 0.075, 3.1, 0.075);
  mesh(box, stone(0x713554), -5.5, ground + 1.95, -4.47, 0.54, 0.84, 0.038);
  cross(-5.5, ground + 1.97, -4.42, 0.55, flameCore);

  game.addLevelMesh(new THREE.HemisphereLight(0xa4c7ff, 0x68526b, 1.25));
  const moonlight = game.addLevelMesh(new THREE.DirectionalLight(0x88bcff, 1.95));
  moonlight.position.set(4, 8, -7);
  const fill = game.addLevelMesh(new THREE.DirectionalLight(0xffc796, 0.65));
  fill.position.set(-5, 3, 6);
}
