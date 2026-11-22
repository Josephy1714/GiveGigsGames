/* 4weird shared worker pool (v2-native, every game).
 *
 * Served at /games/html/fourweird-workers.js and injected into EVERY
 * canonical bundle by scripts/sync-game-bundles.mjs (alongside
 * runtime-bridge.js). Parity sources untouched.
 *
 * What it does: tiny FIFO pool (<=2 workers) over an inline Blob worker
 * that runs PURE-MATH tasks off the main thread: seeded RNG streams,
 * steering batches, particle integration, timing aggregation. Same
 * run(task, payload) -> Promise API with a synchronous fallback registry,
 * so callers can use the same API on hosted and offline pages.
 *
 * Shared workers use structured clone, bounded FIFO scheduling and a
 * synchronous fallback when a job cannot use a worker. Exposes window.FourWeirdWorkers = { supported(), run(),
 * probe(), version }.
 */
(function () {
    'use strict';
    if (window.FourWeirdWorkers) return;

    var VERSION = '2.0.0';
    var MAX_WORKERS = 2;
    var DEFAULT_TIMEOUT_MS = 1500;
    var MAX_QUEUED = 32;
    var IDLE_TIMEOUT_MS = 15000;

    // Inline worker source: pure math only. No Math.random (seeded
    // mulberry32), no DOM, no importScripts, no eval.
    var WORKER_SRC = [
        "'use strict';",
        'function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}',
        'function rngStream(seed,n){var r=mulberry32(seed>>>0);var o=new Array(n);for(var i=0;i<n;i++)o[i]=r();return o;}',
        'function steerBatch(p){var out=[];try{var es=p.enemies||[];var px=+p.px||0,py=+p.py||0;for(var i=0;i<es.length;i++){var e=es[i];var dx=px-(+e.x||0),dy=py-(+e.y||0);var d=Math.sqrt(dx*dx+dy*dy)||1;out.push({i:i,nx:dx/d,ny:dy/d,d:d});}}catch(e){}return out;}',
        'function integrate(p){var out=[];try{var ps=p.parts||[];var dt=Math.min(Math.max(+p.dt||0.016,0),0.05);for(var i=0;i<ps.length;i++){var q=ps[i];var x=(+q.x||0)+(+q.vx||0)*dt;var y=(+q.y||0)+(+q.vy||0)*dt;var vx=(+q.vx||0)*0.94,vy=(+q.vy||0)*0.94;var life=(+q.life||0)-dt;out.push({x:x,y:y,vx:vx,vy:vy,life:life});}}catch(e){}return out;}',
        'function aggregate(p){try{var s=p.samples||[];if(!s.length)return{avg:-1,n:0};var a=0;for(var i=0;i<s.length;i++)a+=+s[i]||0;a/=s.length;var pr=a>28?"potato":a>20?"balanced":a>13?"high":"ultra";return{avg:a,n:s.length,preset:pr};}catch(e){return{avg:-1,n:0};}}',
        'self.onmessage=function(ev){var m=ev.data||{};var id=m.id;var task=String(m.task||"");var payload=m.payload||{};var result=null;try{if(task==="rng-stream"){result=rngStream(payload.seed|0,Math.min(Math.max(payload.n|0,0),100000));}else if(task==="ai-steer"){result=steerBatch(payload);}else if(task==="particle-integrate"){result=integrate(payload);}else if(task==="timing-aggregate"){result=aggregate(payload);}else{result={error:"unknown-task:"+task};}self.postMessage({id:id,ok:true,result:result});}catch(err){try{self.postMessage({id:id,ok:false,error:String((err&&err.message)||err)});}catch(e){}}};'
    ].join('\n');

    // Synchronous fallback registry: identical semantics, main thread.
    function mulberry32(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    var FALLBACK = {
        'rng-stream': function (p) {
            var r = mulberry32((p.seed | 0) >>> 0);
            var n = Math.min(Math.max(p.n | 0, 0), 100000);
            var o = new Array(n);
            for (var i = 0; i < n; i++) o[i] = r();
            return o;
        },
        'ai-steer': function (p) {
            var out = [];
            var es = p.enemies || [];
            var px = +p.px || 0, py = +p.py || 0;
            for (var i = 0; i < es.length; i++) {
                var dx = px - (+es[i].x || 0), dy = py - (+es[i].y || 0);
                var d = Math.sqrt(dx * dx + dy * dy) || 1;
                out.push({ i: i, nx: dx / d, ny: dy / d, d: d });
            }
            return out;
        },
        'particle-integrate': function (p) {
            var out = [];
            var ps = p.parts || [];
            var dt = Math.min(Math.max(+p.dt || 0.016, 0), 0.05);
            for (var i = 0; i < ps.length; i++) {
                var q = ps[i];
                out.push({
                    x: (+q.x || 0) + (+q.vx || 0) * dt,
                    y: (+q.y || 0) + (+q.vy || 0) * dt,
                    vx: (+q.vx || 0) * 0.94,
                    vy: (+q.vy || 0) * 0.94,
                    life: (+q.life || 0) - dt
                });
            }
            return out;
        },
        'timing-aggregate': function (p) {
            var s = p.samples || [];
            if (!s.length) return { avg: -1, n: 0 };
            var a = 0;
            for (var i = 0; i < s.length; i++) a += +s[i] || 0;
            a /= s.length;
            return { avg: a, n: s.length, preset: a > 28 ? 'potato' : a > 20 ? 'balanced' : a > 13 ? 'high' : 'ultra' };
        }
    };

    const pool = new Set();
    const queue = [];
    let nextId = 0;
    let workerOK;
    const workerLimit = (navigator.hardwareConcurrency || 1) >= 4 ? MAX_WORKERS : 1;

    function detectSupport() {
        if (workerOK === undefined) {
            workerOK = typeof Worker === 'function' && typeof Blob === 'function'
                && typeof URL.createObjectURL === 'function'
                && location.protocol !== 'file:'
                && new URLSearchParams(location.search).get('workers') !== '0';
        }
        return workerOK;
    }

    function fallbackRun(task, payload) {
        return Promise.resolve().then(() => {
            if (!Object.prototype.hasOwnProperty.call(FALLBACK, task)) {
                throw new Error('unknown-task:' + task);
            }
            return FALLBACK[task](payload);
        });
    }

    function fallbackJob(job) {
        clearTimeout(job.timer);
        fallbackRun(job.task, job.payload).then(job.resolve, job.reject);
    }

    function retire(slot) {
        clearTimeout(slot.idleTimer);
        slot.worker.terminate();
        pool.delete(slot);
        const job = slot.job;
        slot.job = null;
        if (job) {
            job.slot = null;
            fallbackJob(job);
        }
    }

    function disableWorkers() {
        workerOK = false;
        for (const slot of pool) retire(slot);
        for (const job of queue.splice(0)) fallbackJob(job);
    }

    function makeWorker() {
        const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
        let worker;
        try {
            worker = new Worker(url);
        } finally {
            URL.revokeObjectURL(url);
        }
        const slot = { worker, job: null, idleTimer: null };
        pool.add(slot);
        worker.onmessage = ({ data }) => {
            const job = slot.job;
            if (!job || job.id !== data.id) return;
            slot.job = null;
            job.slot = null;
            if (data.ok) {
                clearTimeout(job.timer);
                job.resolve(data.result);
            } else {
                fallbackJob(job);
            }
            slot.idleTimer = setTimeout(() => retire(slot), IDLE_TIMEOUT_MS);
            pump();
        };
        worker.onerror = (event) => {
            event.preventDefault();
            disableWorkers();
        };
        worker.onmessageerror = () => disableWorkers();
        return slot;
    }

    function pump() {
        while (queue.length && detectSupport()) {
            let slot;
            for (const candidate of pool) {
                if (!candidate.job) {
                    slot = candidate;
                    break;
                }
            }
            if (!slot) {
                if (pool.size >= workerLimit) return;
                try {
                    slot = makeWorker();
                } catch (_) {
                    disableWorkers();
                    return;
                }
            }

            clearTimeout(slot.idleTimer);
            const job = queue.shift();
            slot.job = job;
            job.slot = slot;
            try {
                slot.worker.postMessage({ id: job.id, task: job.task, payload: job.payload });
            } catch (_) {
                slot.job = null;
                job.slot = null;
                fallbackJob(job);
                slot.idleTimer = setTimeout(() => retire(slot), IDLE_TIMEOUT_MS);
            }
        }
    }

    function run(task, payload, opts) {
        task = String(task || '');
        payload = payload || {};
        if (!Object.prototype.hasOwnProperty.call(FALLBACK, task) || !detectSupport() || queue.length >= MAX_QUEUED) {
            return fallbackRun(task, payload);
        }
        const timeout = Number.isFinite(opts?.timeout)
            ? Math.min(Math.max(opts.timeout, 100), 10000)
            : DEFAULT_TIMEOUT_MS;
        return new Promise((resolve, reject) => {
            const job = { id: ++nextId, task, payload, resolve, reject, slot: null, timer: null };
            job.timer = setTimeout(() => {
                if (job.slot) {
                    retire(job.slot);
                } else {
                    const index = queue.indexOf(job);
                    if (index < 0) return;
                    queue.splice(index, 1);
                    fallbackJob(job);
                }
                pump();
            }, timeout);
            queue.push(job);
            pump();
        });
    }

    // Measure a short frame window. Summing eleven samples locally avoids
    // starting a worker just to report the average.
    function probe() {
        return new Promise(resolve => {
            const samples = [];
            let frame;
            let previous;
            const raf = window.requestAnimationFrame?.bind(window)
                || (callback => setTimeout(() => callback(performance.now()), 16));
            const cancel = window.cancelAnimationFrame?.bind(window) || clearTimeout;
            const finish = () => {
                clearTimeout(timer);
                cancel(frame);
                resolve({
                    supported: detectSupport(),
                    frames: previous === undefined ? 0 : samples.length + 1,
                    agg: FALLBACK['timing-aggregate']({ samples })
                });
            };
            const timer = setTimeout(finish, DEFAULT_TIMEOUT_MS);
            function tick(now) {
                if (previous !== undefined) samples.push(Math.min(Math.max(now - previous, 0), 100));
                previous = now;
                if (samples.length >= 11) finish();
                else frame = raf(tick);
            }
            frame = raf(tick);
        });
    }

    try {
        window.FourWeirdWorkers = {
            version: VERSION,
            supported: detectSupport,
            run: run,
            probe: probe
        };
    } catch (e) { /* window unwritable */ }
})();
