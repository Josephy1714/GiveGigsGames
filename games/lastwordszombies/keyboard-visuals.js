/* Shared keyboard geometry, with map-specific finishes applied by GameApp. */
function addKeyboardLegends(group, keys) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.font = 'bold 39px monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#fff8dd';

  const atlas = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: atlas, color: 0xffffff, transparent: true, depthWrite: false, fog: false, toneMapped: false
  });
  Object.entries(keys).forEach(([letter, key], index) => {
    const column = index % 8;
    const row = Math.floor(index / 8);
    context.fillText(letter.toUpperCase(), column * 64 + 32, row * 64 + 33);
    const geometry = new THREE.PlaneGeometry(0.016, 0.016);
    geometry.rotateX(-Math.PI / 2);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (column + uv.getX(i)) / 8, (3 - row + uv.getY(i)) / 4);
    }
    const legend = new THREE.Mesh(geometry, material);
    legend.position.y = 0.0032;
    key.add(legend);
  });

  const railMaterial = new THREE.MeshBasicMaterial({ color: 0x00efff, fog: false });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.258, 0.002, 0.003), railMaterial);
  rail.position.set(0, 0.008, -0.054);
  group.add(rail);
  return railMaterial;
}

function createKeyboardSigil() {
  const sigil = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: 0xffcc62, side: THREE.DoubleSide, transparent: true,
    opacity: 0.78, depthWrite: false, fog: false, toneMapped: false
  });
  for (const radius of [0.059, 0.069]) {
    sigil.add(new THREE.Mesh(new THREE.RingGeometry(radius, radius + 0.0014, 48), material));
  }
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const rune = new THREE.Mesh(new THREE.RingGeometry(0.003, 0.0048, 4), material);
    rune.position.set(Math.cos(angle) * 0.079, Math.sin(angle) * 0.079, 0);
    rune.rotation.z = angle;
    sigil.add(rune);
  }
  sigil.position.set(0, -0.172, -0.56);
  sigil.visible = false;
  return sigil;
}
