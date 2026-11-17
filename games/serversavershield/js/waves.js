// Wave Management
var waveTimer = 0;
var waveDuration = 750;
var WAVE_LIMIT = 10;

function hasCompletedFinalWave() {
    return wave >= WAVE_LIMIT && waveTimer >= waveDuration;
}

function updateWaves() {
    waveTimer++;
    if (waveTimer >= waveDuration) {
        if (wave >= WAVE_LIMIT) {
            wave = WAVE_LIMIT;
            waveTimer = waveDuration;
            return;
        }
        waveTimer = 0;
        wave++;
        waveDuration = 750 + (wave - 1) * 40;
        score += wave * 50;
        addText(CANVAS_WIDTH / 2, 50, 'WAVE ' + wave, '#10b981', 24);
    }
}

function getWave() {
    return wave;
}

function getWaveTimer() {
    return waveTimer;
}

function getWaveDuration() {
    return waveDuration;
}

function resetWaves() {
    wave = 1;
    waveTimer = 0;
    waveDuration = 750;
}
