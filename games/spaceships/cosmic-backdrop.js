// Procedural deep-space panorama. One texture and a few lightweight sprites keep
// the sky vivid without adding hundreds of transparent WebGL draw calls.
const THREE = window.THREE;

function random(seed) {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function glow(ctx, x, y, radius, hue, strength = 1) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `hsla(${hue}, 100%, 82%, ${0.28 * strength})`);
  gradient.addColorStop(0.15, `hsla(${hue}, 95%, 61%, ${0.19 * strength})`);
  gradient.addColorStop(0.5, `hsla(${hue}, 90%, 48%, ${0.08 * strength})`);
  gradient.addColorStop(1, `hsla(${hue}, 90%, 30%, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function galaxy(ctx, rng, cx, cy, scale, hue) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rng() * 0.8 - 0.4);
  ctx.scale(1, 0.44);
  glow(ctx, 0, 0, scale * 1.5, hue, 1.6);
  for (let arm = 0; arm < 3; arm++) {
    for (let i = 0; i < 240; i++) {
      const distance = Math.sqrt(rng()) * scale;
      const angle = arm * Math.PI * 2 / 3 + distance / scale * 4.3 + (rng() - 0.5) * 0.28;
      const x = Math.cos(angle) * distance + (rng() - 0.5) * 7;
      const y = Math.sin(angle) * distance + (rng() - 0.5) * 7;
      const alpha = (1 - distance / scale) * (0.22 + rng() * 0.5);
      ctx.fillStyle = `hsla(${hue + (rng() - 0.5) * 80},100%,${65 + rng() * 30}%,${alpha})`;
      const size = 0.6 + rng() * 1.8;
      ctx.fillRect(x, y, size, size);
    }
  }
  glow(ctx, 0, 0, scale * 0.17, hue + 25, 1.8);
  ctx.restore();
}

function makeSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const rng = random(817204);
  const w = canvas.width;
  const h = canvas.height;

  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#030b20');
  base.addColorStop(0.42, '#101344');
  base.addColorStop(0.65, '#170d31');
  base.addColorStop(1, '#020916');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Several broad cloud banks make the background read as a nebula even when
  // the camera turns away from the bright central galaxy.
  const cloudBands = [
    { x: 280, y: 455, hue: 194, r: 350 },
    { x: 760, y: 580, hue: 281, r: 430 },
    { x: 1340, y: 345, hue: 320, r: 390 },
    { x: 1830, y: 590, hue: 173, r: 340 },
    { x: 450, y: 790, hue: 227, r: 260 },
    { x: 1500, y: 820, hue: 259, r: 320 }
  ];
  cloudBands.forEach(cloud => {
    for (let i = 0; i < 55; i++) {
      const angle = rng() * Math.PI * 2;
      const distance = Math.sqrt(rng()) * cloud.r;
      glow(ctx, cloud.x + Math.cos(angle) * distance, cloud.y + Math.sin(angle) * distance * 0.55,
        38 + rng() * 110, cloud.hue + (rng() - 0.5) * 36, 0.3 + rng() * 0.45);
    }
  });

  galaxy(ctx, rng, 520, 435, 225, 204);
  galaxy(ctx, rng, 1540, 605, 175, 300);
  galaxy(ctx, rng, 1120, 290, 100, 44);

  // A visible Milky Way band, with small bright knots and dark rifts.
  for (let i = 0; i < 5000; i++) {
    const x = rng() * w;
    const mid = 485 + Math.sin(x / 180) * 110;
    const y = mid + (rng() + rng() + rng() - 1.5) * 230;
    const opacity = 0.03 + rng() * 0.24;
    const hue = rng() < 0.52 ? 196 : 275;
    ctx.fillStyle = `hsla(${hue},100%,82%,${opacity})`;
    ctx.fillRect(x, y, 0.5 + rng() * 1.4, 0.5 + rng() * 1.4);
  }

  for (let i = 0; i < 3200; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const bright = rng() > 0.985;
    const size = bright ? 1.8 + rng() * 2 : 0.3 + rng() * 1.1;
    ctx.fillStyle = `hsla(${rng() < 0.75 ? 205 : 35},100%,${75 + rng() * 25}%,${0.32 + rng() * 0.68})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    if (bright) {
      glow(ctx, x, y, 12 + rng() * 20, 205, 0.65);
      ctx.strokeStyle = 'rgba(220,245,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(x - size * 4, y);
      ctx.lineTo(x + size * 4, y);
      ctx.moveTo(x, y - size * 4);
      ctx.lineTo(x, y + size * 4);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
  return texture;
}

export function createCosmicBackdrop(scene, camera) {
  const texture = makeSkyTexture();
  const geometry = new THREE.SphereGeometry(90000, 64, 32);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false
  });
  const dome = new THREE.Mesh(geometry, material);
  dome.renderOrder = -100;
  scene.add(dome);

  return {
    update(elapsed) {
      dome.position.copy(camera.position);
      dome.rotation.y = elapsed * 0.0003;
    },
    dispose() {
      scene.remove(dome);
      geometry.dispose();
      material.dispose();
      texture.dispose();
    }
  };
}
