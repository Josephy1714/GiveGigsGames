import { paintCosmicSky } from './cosmic-sky.js';

const canvas = new OffscreenCanvas(1, 1);
paintCosmicSky(canvas);
const bitmap = canvas.transferToImageBitmap();
self.postMessage(bitmap, [bitmap]);
