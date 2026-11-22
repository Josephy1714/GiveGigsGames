(function () {
    'use strict';

    const workerURL = new URL('graphics-worker.js', document.currentScript.src);
    const batchLimit = 64;

    class GraphicsBridge {
        constructor(canvas, container) {
            this.canvas = canvas;
            this.container = container;
            this.worker = null;
            this.resizeObserver = null;
            this.ready = false;
            this.active = false;
            this.failed = false;
            this.frame = null;
            this.inFlight = false;
            this.queue = [];
            this.width = 0;
            this.height = 0;
            this.pixelRatio = 0;
        }

        start() {
            const canvas = this.canvas;
            if (this.failed || location.protocol === 'file:' || !window.Worker || !canvas?.transferControlToOffscreen) return;

            try {
                this.worker = new Worker(workerURL);
                this.worker.onmessage = ({ data }) => {
                    if (data.type === 'ready') this.ready = true;
                    if (data.type === 'unavailable') this.destroy();
                    if (data.type === 'received') {
                        this.inFlight = false;
                        this.schedule();
                    }
                };
                this.worker.onerror = (event) => {
                    event.preventDefault();
                    this.destroy();
                };
                this.worker.onmessageerror = () => this.destroy();
                const offscreen = canvas.transferControlToOffscreen();
                this.worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);
                this.resize();
                if (typeof ResizeObserver === 'function') {
                    this.resizeObserver = new ResizeObserver(() => this.resize());
                    this.resizeObserver.observe(this.container);
                }
            } catch {
                this.destroy();
            }
        }

        get enabled() {
            return this.ready && this.active;
        }

        resize() {
            if (!this.worker) return;
            const rect = this.container.getBoundingClientRect();
            const width = Math.max(1, rect.width);
            const height = Math.max(1, rect.height);
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(4_194_304 / (width * height)));
            if (width === this.width && height === this.height && pixelRatio === this.pixelRatio) return;
            this.width = width;
            this.height = height;
            this.pixelRatio = pixelRatio;
            this.worker.postMessage({ type: 'resize', width, height, pixelRatio });
        }

        burst(x, y, color = '#ffcc4c', strength = 1) {
            if (!this.enabled || this.queue.length >= batchLimit ||
                !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(strength)) return;
            this.queue.push([x, y, color, strength]);
            this.schedule();
        }

        schedule() {
            if (!this.enabled || this.inFlight || this.frame !== null || !this.queue.length) return;
            this.frame = requestAnimationFrame(() => {
                this.frame = null;
                const bursts = this.queue;
                this.queue = [];
                this.inFlight = true;
                this.worker.postMessage({ type: 'bursts', bursts });
            });
        }

        cancelBatch() {
            if (this.frame !== null) cancelAnimationFrame(this.frame);
            this.frame = null;
            this.queue.length = 0;
        }

        setActive(active) {
            if (this.active === active) return;
            this.active = active;
            if (active && !this.worker) {
                this.start();
                return;
            }
            if (!active) this.cancelBatch();
            this.worker?.postMessage({ type: 'active', active });
        }

        destroy() {
            this.failed = true;
            this.cancelBatch();
            this.resizeObserver?.disconnect();
            this.resizeObserver = null;
            this.worker?.terminate();
            this.worker = null;
            this.ready = false;
            this.inFlight = false;
        }
    }

    window.GraveGainGraphicsBridge = GraphicsBridge;
})();
