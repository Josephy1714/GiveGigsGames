// Procedural deep-space panorama. One texture and a few lightweight sprites keep
// the sky vivid without adding hundreds of transparent WebGL draw calls.
import { paintCosmicSky } from './cosmic-sky.js';

const THREE = window.THREE;

function createSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#030b20';
  ctx.fillRect(0, 0, 1, 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;

  let worker;
  let deadline;
  function stopWorker() {
    clearTimeout(deadline);
    worker?.terminate();
    worker = null;
  }
  function paintLocally() {
    stopWorker();
    paintCosmicSky(canvas);
    texture.needsUpdate = true;
  }

  if (location.protocol === 'file:' || typeof Worker !== 'function' ||
      typeof OffscreenCanvas !== 'function') {
    paintLocally();
  } else {
    try {
      worker = new Worker(new URL('./cosmic-sky.worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data: bitmap }) => {
        stopWorker();
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        try {
          ctx.drawImage(bitmap, 0, 0);
          texture.needsUpdate = true;
        } catch {
          paintLocally();
        } finally {
          bitmap.close();
        }
      };
      worker.onerror = (event) => {
        event.preventDefault();
        paintLocally();
      };
      worker.onmessageerror = paintLocally;
      deadline = setTimeout(paintLocally, 5000);
    } catch {
      paintLocally();
    }
  }

  return { texture, stopWorker };
}

export function createCosmicBackdrop(scene, camera) {
  const { texture, stopWorker } = createSkyTexture();
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
      stopWorker();
      texture.dispose();
    }
  };
}
