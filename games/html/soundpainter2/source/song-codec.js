// Versioned composition links. Decode into a candidate before touching live audio state.
const SONG_RANGES = {
    cutoff: [100, 10000], resonance: [0, 15], decay: [0.05, 2],
    delayGain: [0, 0.8], delayFeedback: [0, 0.9], delayTime: [0.1, 1],
    reverbGain: [0, 0.8]
};
const SONG_WAVES = ['sawtooth', 'square', 'triangle', 'sine'];

function validateSongNumber(value, min, max) {
    if (!Number.isFinite(value) || value < min || value > max) throw new Error('Invalid song value');
    return value;
}

function validateSong(candidate) {
    validateSongNumber(candidate.bpm, 60, 200);
    if (!SONG_WAVES.includes(candidate.settings.waveform)) throw new Error('Invalid waveform');
    for (const [key, range] of Object.entries(SONG_RANGES)) {
        validateSongNumber(candidate.settings[key], ...range);
    }
    for (const track of TRACKS) {
        validateSongNumber(candidate.settings.vol[track], 0, 1);
        validateSongNumber(candidate.settings.pan[track], -1, 1);
        for (const key of ['grids', 'vel']) {
            const rows = candidate[key][track];
            if (!Array.isArray(rows) || rows.length !== NUM_ROWS) throw new Error('Invalid rows');
            for (const row of rows) {
                if (!Array.isArray(row) || row.length !== NUM_STEPS) throw new Error('Invalid steps');
                for (const value of row) {
                    if (key === 'grids') {
                        if (typeof value !== 'boolean') throw new Error('Invalid note');
                    } else validateSongNumber(value, 0.15, 1);
                }
            }
        }
    }
    return candidate;
}

function encodeSong(song) {
    validateSong(song);
    // Flatten each track: zero is silent; nonzero stores the note's exact velocity.
    const notes = TRACKS.map(track => song.grids[track].flatMap((row, r) =>
        row.map((on, c) => on ? song.vel[track][r][c] : 0)));
    const payload = JSON.stringify({ v: 2, bpm: song.bpm, settings: song.settings, notes });
    return 'v2.' + btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeSong(encoded, defaults) {
    if (typeof encoded !== 'string' || encoded.length > 16000) throw new Error('Invalid link size');
    const modern = encoded.startsWith('v2.');
    const raw = modern ? encoded.slice(3) : encoded;
    if (!/^[A-Za-z0-9_-]+$/.test(raw)) throw new Error('Invalid link encoding');
    const binary = atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
    const candidate = JSON.parse(JSON.stringify(defaults));
    if (modern) {
        const data = JSON.parse(binary);
        if (data.v !== 2 || !Array.isArray(data.notes) || data.notes.length !== TRACKS.length) {
            throw new Error('Unsupported song format');
        }
        candidate.bpm = data.bpm;
        candidate.settings = data.settings;
        TRACKS.forEach((track, t) => {
            const notes = data.notes[t];
            if (!Array.isArray(notes) || notes.length !== NUM_ROWS * NUM_STEPS) throw new Error('Invalid notes');
            candidate.grids[track] = [];
            candidate.vel[track] = [];
            for (let row = 0; row < NUM_ROWS; row++) {
                const values = notes.slice(row * NUM_STEPS, (row + 1) * NUM_STEPS);
                values.forEach(value => { if (value !== 0) validateSongNumber(value, 0.15, 1); });
                candidate.grids[track].push(values.map(value => value !== 0));
                candidate.vel[track].push(values.map(value => value || 1));
            }
        });
    } else {
        // Original links contain 64 note bytes and optionally all nine synth bytes.
        if (binary.length !== 64 && binary.length !== 73) throw new Error('Truncated legacy song');
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        let offset = 0;
        for (const track of TRACKS) {
            for (let row = 0; row < NUM_ROWS; row++) {
                const word = bytes[offset++] | (bytes[offset++] << 8);
                candidate.grids[track][row] = Array.from({ length: NUM_STEPS }, (_, c) => !!(word & (1 << c)));
                candidate.vel[track][row].fill(1);
            }
        }
        if (bytes.length === 73) {
            candidate.bpm = bytes[offset++];
            // Old cutoff quantization rounded 100 Hz down to 80 Hz.
            candidate.settings.cutoff = Math.max(100, bytes[offset++] * 40);
            candidate.settings.resonance = bytes[offset++] / 15;
            candidate.settings.decay = bytes[offset++] / 100;
            candidate.settings.waveform = SONG_WAVES[bytes[offset++]];
            for (const key of ['delayGain', 'delayFeedback', 'delayTime', 'reverbGain']) {
                candidate.settings[key] = bytes[offset++] / 100;
            }
        }
    }
    return validateSong(candidate);
}
