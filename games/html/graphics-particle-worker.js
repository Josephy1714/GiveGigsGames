'use strict';

const capacity = 512;
const batchLimit = 64;
const circle = Math.PI * 2;
const x = new Float32Array(capacity);
const y = new Float32Array(capacity);
const vx = new Float32Array(capacity);
const vy = new Float32Array(capacity);
const life = new Float32Array(capacity);
const colors = new Array(capacity);
const workerRAF = typeof self.requestAnimationFrame === 'function'
    && typeof self.cancelAnimationFrame === 'function';

let canvas;
let ctx;
let width = 1;
let height = 1;
let scaleX = 1;
let scaleY = 1;
let count = 0;
let active = true;
let pending = null;
let lastTime;
let left = Infinity;
let top = Infinity;
let right = -Infinity;
let bottom = -Infinity;

function resetBounds() {
    left = top = Infinity;
    right = bottom = -Infinity;
}

function clearPreviousFrame() {
    if (left === Infinity) return;
    const x0 = Math.max(0, Math.floor(left * scaleX));
    const y0 = Math.max(0, Math.floor(top * scaleY));
    const x1 = Math.min(canvas.width, Math.ceil(right * scaleX));
    const y1 = Math.min(canvas.height, Math.ceil(bottom * scaleY));
    ctx.resetTransform();
    ctx.clearRect(x0, y0, x1 - x0, y1 - y0);
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    resetBounds();
}

function resize(nextWidth, nextHeight, ratio) {
    const pixelsWide = Math.max(1, Math.floor(nextWidth * ratio));
    const pixelsHigh = Math.max(1, Math.floor(nextHeight * ratio));
    const changed = canvas.width !== pixelsWide || canvas.height !== pixelsHigh;
    if (!changed && width === nextWidth && height === nextHeight) return;
    if (changed) {
        if (canvas.width !== pixelsWide) canvas.width = pixelsWide;
        if (canvas.height !== pixelsHigh) canvas.height = pixelsHigh;
        resetBounds();
    } else {
        clearPreviousFrame();
    }
    width = nextWidth;
    height = nextHeight;
    scaleX = pixelsWide / width;
    scaleY = pixelsHigh / height;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
}

function burst(originX, originY, color, strength) {
    const end = Math.min(capacity, count + Math.min(18, Math.max(5, Math.round(strength * 9))));
    for (; count < end; count++) {
        const angle = Math.random() * circle;
        const speed = 35 + Math.random() * 95 * strength;
        x[count] = originX;
        y[count] = originY;
        vx[count] = Math.cos(angle) * speed;
        vy[count] = Math.sin(angle) * speed;
        life[count] = 0.55 + Math.random() * 0.25;
        colors[count] = color;
    }
}

function schedule() {
    if (pending !== null || !count) return;
    pending = workerRAF ? self.requestAnimationFrame(frame) : setTimeout(() => frame(performance.now()), 16);
}

function frame(time) {
    pending = null;
    const dt = lastTime === undefined ? 0 : Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    const drag = Math.pow(0.94, dt * 60);
    clearPreviousFrame();
    let lastColor;

    // Compact survivors in place so additive draws keep the original back-to-front order.
    let alive = 0;
    for (let i = 0; i < count; i++) {
        const remaining = life[i] - dt;
        if (remaining <= 0) continue;
        life[alive] = remaining;
        x[alive] = x[i] + vx[i] * dt;
        y[alive] = y[i] + vy[i] * dt;
        vx[alive] = vx[i] * drag;
        vy[alive] = vy[i] * drag;
        colors[alive] = colors[i];
        alive++;
    }
    count = alive;
    for (let i = count - 1; i >= 0; i--) {
        const alpha = life[i] / 0.8;
        const radius = 1.5 + alpha * 3;
        const margin = radius + 2;
        if (x[i] + margin < 0 || y[i] + margin < 0 ||
            x[i] - margin > width || y[i] - margin > height) continue;
        left = Math.min(left, x[i] - margin);
        top = Math.min(top, y[i] - margin);
        right = Math.max(right, x[i] + margin);
        bottom = Math.max(bottom, y[i] + margin);
        ctx.globalAlpha = alpha;
        if (colors[i] !== lastColor) {
            lastColor = colors[i];
            ctx.fillStyle = lastColor;
        }
        ctx.beginPath();
        ctx.arc(x[i], y[i], radius, 0, circle);
        ctx.fill();
    }
    if (count) schedule();
    else lastTime = undefined;
}

function setActive(next) {
    active = next;
    if (active) return;
    if (pending !== null) {
        if (workerRAF) self.cancelAnimationFrame(pending);
        else clearTimeout(pending);
        pending = null;
    }
    count = 0;
    lastTime = undefined;
    clearPreviousFrame();
}

self.onmessage = ({ data }) => {
    if (data.type === 'init') {
        canvas = data.canvas;
        ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
        self.postMessage({ type: ctx ? 'ready' : 'unavailable' });
    } else if (ctx && data.type === 'resize') {
        resize(data.width, data.height, data.pixelRatio);
    } else if (ctx && data.type === 'active') {
        setActive(data.active);
    } else if (ctx && data.type === 'bursts') {
        if (active) {
            for (let i = 0; i < Math.min(data.bursts.length, batchLimit) && count < capacity; i++) {
                burst(...data.bursts[i]);
            }
            schedule();
        }
        self.postMessage({ type: 'received' });
    }
};
