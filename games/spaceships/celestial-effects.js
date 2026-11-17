const THREE = window.THREE;

function seeded(seed) {
  let state = seed >>> 0;
  return () => ((state = (1664525 * state + 1013904223) >>> 0) / 4294967296);
}

export function makePlanetTexture(colors, seed = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const rng = seeded(seed);
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  colors.forEach((color, index) => gradient.addColorStop(index / (colors.length - 1), color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 110; i++) {
    const y = rng() * canvas.height;
    const height = 1 + rng() * 10;
    ctx.fillStyle = `rgba(255,255,255,${rng() * 0.14})`;
    ctx.fillRect(0, y, canvas.width, height);
  }
  for (let i = 0; i < 35; i++) {
    const x = rng() * canvas.width;
    const y = rng() * canvas.height;
    const radius = 4 + rng() * 28;
    const cloud = ctx.createRadialGradient(x, y, 0, x, y, radius);
    cloud.addColorStop(0, `rgba(255,255,255,${0.05 + rng() * 0.17})`);
    cloud.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cloud;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
  return texture;
}

export function addAtmosphere(planet, radius, color) {
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.12, 32, 24),
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.19,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  planet.add(glow);
  return glow;
}

export function createStarCorona() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const halo = ctx.createRadialGradient(128, 128, 6, 128, 128, 128);
  halo.addColorStop(0, 'rgba(255,255,255,1)');
  halo.addColorStop(0.17, 'rgba(255,247,174,0.96)');
  halo.addColorStop(0.35, 'rgba(255,177,60,0.65)');
  halo.addColorStop(0.7, 'rgba(255,103,25,0.17)');
  halo.addColorStop(1, 'rgba(255,62,8,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  }));
  sprite.scale.set(250, 250, 1);
  return sprite;
}

export function addAlienAccents(ship, color) {
  const group = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0x15132f, metalness: 0.75, roughness: 0.22 });
  const energy = new THREE.MeshBasicMaterial({ color, blending: THREE.AdditiveBlending });
  const wing = new THREE.ConeGeometry(1, 5, 3);
  for (const side of [-1, 1]) {
    const blade = new THREE.Mesh(wing, shell);
    blade.position.set(side * 5.3, 0, 1);
    blade.rotation.z = side * 0.62;
    blade.rotation.x = Math.PI / 2;
    group.add(blade);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 5.5), energy);
    edge.position.set(side * 6.4, 0.3, 0.2);
    edge.rotation.y = side * 0.18;
    group.add(edge);
  }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), energy);
  eye.position.set(0, 1.4, -2.8);
  group.add(eye);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.15, 6, 30), energy);
  halo.rotation.x = Math.PI / 2;
  halo.position.z = 2.5;
  group.add(halo);
  ship.add(group);
  return group;
}
