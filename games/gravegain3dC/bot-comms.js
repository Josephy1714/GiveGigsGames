import { CALLOUT_CLIPS } from './callout-clips.js';

const VOICE_KEY = 'gravegain3dc_voice_v1';

export function createBotComms(audio, camera, enabled) {
    try { enabled.checked = localStorage.getItem(VOICE_KEY) !== 'off'; } catch { /* Storage unavailable. */ }

    let buffer;
    let loading;
    let active;
    let lastSpoken = -Infinity;
    const previous = new Map();
    // Babylon's forward axis is +Z. Web Audio uses a right-handed coordinate system.
    const place = (node, point) => {
        node.positionX.value = point.x;
        node.positionY.value = point.y;
        node.positionZ.value = -point.z;
    };

    function reset() {
        const call = active;
        active = null;
        call?.source.stop();
        lastSpoken = -Infinity;
    }

    enabled.addEventListener('change', () => {
        try { localStorage.setItem(VOICE_KEY, enabled.checked ? 'on' : 'off'); } catch { /* Storage unavailable. */ }
        if (!enabled.checked) reset();
    });

    return {
        prepare() {
            if (!audio || !enabled.checked) return;
            audio.resume().catch(() => {});
            loading ??= fetch(new URL('./teammate-callouts.mp3', import.meta.url))
                .then(response => {
                    if (!response.ok) throw new Error('Callouts unavailable');
                    return response.arrayBuffer();
                })
                .then(bytes => audio.decodeAudioData(bytes))
                .then(decoded => { buffer = decoded; })
                .catch(() => { loading = null; });
        },
        update() {
            if (!active) return;
            place(active.panner, active.bot.mesh.position);
            place(audio.listener, camera.position);
            const forward = camera.getDirection({ x: 0, y: 0, z: 1 });
            const up = camera.getDirection({ x: 0, y: 1, z: 0 });
            audio.listener.setOrientation(forward.x, forward.y, -forward.z, up.x, up.y, -up.z);
        },
        say(event, bot, voiceIndex) {
            const now = performance.now();
            if (!enabled.checked || !buffer || audio.state !== 'running' || !bot || active ||
                now - lastSpoken < 2500) return;
            const point = bot.mesh.position;
            if (Math.hypot(point.x - camera.position.x, point.y - camera.position.y, point.z - camera.position.z) > 35) return;
            const clips = CALLOUT_CLIPS[event];
            const last = previous.get(event);
            let index = Math.floor(Math.random() * (clips.length - (last === undefined ? 0 : 1)));
            if (last !== undefined && index >= last) index++;
            previous.set(event, index);
            const [offset, duration] = clips[index];
            const source = audio.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = voiceIndex === 0 ? .88 : 1.06;
            const panner = audio.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = 6;
            const gain = audio.createGain();
            gain.gain.value = .68;
            source.connect(panner).connect(gain).connect(audio.destination);
            source.onended = () => {
                source.disconnect();
                panner.disconnect();
                gain.disconnect();
                if (active?.source === source) active = null;
            };
            active = { source, panner, bot };
            this.update();
            lastSpoken = now;
            source.start(0, offset, duration);
        },
        reset
    };
}
