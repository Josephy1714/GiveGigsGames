
    'use strict';

// -------------------------------------------------------------
    // 1. STATE & CONSTANTS DEFINITIONS
    // -------------------------------------------------------------
    
    const TRACKS = ['lead', 'bass', 'chords', 'drums'];

    const NUM_STEPS = 16;

    const NUM_ROWS = 8;

// Pitch lists for tracks
    // Lead Pentatonic: C5, A4, G4, E4, D4, C4, A3, G3
    const LEAD_PITCHES = [523.25, 440.00, 392.00, 329.63, 293.66, 261.63, 220.00, 196.00];

// Bass notes (lower register): C3, Bb2, Ab2, G2, F2, Eb2, D2, C2
    const BASS_PITCHES = [130.81, 116.54, 103.83, 98.00, 87.31, 77.78, 73.42, 65.41];

// Chords definition (each row triggers polyphonic set of pitches)
    const CHORD_PITCHES = [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7 (C4, E4, G4, B4)
        [220.00, 261.63, 329.63, 392.00], // Am7 (A3, C4, E4, G4)
        [174.61, 220.00, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
        [196.00, 246.94, 293.66, 349.23], // G7 (G3, B3, D4, F4)
        [146.83, 174.61, 220.00, 261.63], // Dm7 (D3, F3, A3, C4)
        [164.81, 196.00, 246.94, 293.66], // Em7 (E3, G3, B3, D4)
        [233.08, 293.66, 349.23, 440.00], // Bbmaj7 (Bb3, D4, F4, A4)
        [207.65, 261.63, 311.13, 392.00]  // Abmaj7 (Ab3, C4, Eb4, G4)
    ];

const CHORD_NAMES = [
        'Cmaj7', 'Am7', 'Fmaj7', 'G7', 'Dm7', 'Em7', 'Bbmaj7', 'Abmaj7'
    ];

const DRUM_NAMES = [
        'KICK', 'SNARE', 'CLOSED HAT', 'OPEN HAT', 'CLAP', 'RIMSHOT', 'PERC 1', 'PERC 2'
    ];

// Global Sequencer state
    const state = {
        isPlaying: false,
        bpm: 120,
        activeTrack: 'lead', // currently edited track
        currentStep: -1,
        grids: {
            lead: Array(NUM_ROWS).fill(null).map(() => Array(NUM_STEPS).fill(false)),
            bass: Array(NUM_ROWS).fill(null).map(() => Array(NUM_STEPS).fill(false)),
            chords: Array(NUM_ROWS).fill(null).map(() => Array(NUM_STEPS).fill(false)),
            drums: Array(NUM_ROWS).fill(null).map(() => Array(NUM_STEPS).fill(false))
        },
        // Per-step velocity (0.15..1). Tap = toggle at last velocity; drag = paint velocity.
        vel: {
            lead: Array(NUM_ROWS).fill(null).map(() => Array(NUM_STEPS).fill(1)),
            bass: Array(NUM_ROWS).fill(null).map(() => Array(NUM_STEPS).fill(1)),
            chords: Array(NUM_ROWS).fill(null).map(() => Array(NUM_STEPS).fill(1)),
            drums: Array(NUM_ROWS).fill(null).map(() => Array(NUM_STEPS).fill(1))
        },
        settings: {
            // Track volumes & panning
            vol: { lead: 0.7, bass: 0.7, chords: 0.6, drums: 0.8 },
            pan: { lead: 0, bass: 0, chords: 0, drums: 0 },
            // Synth parameters
            cutoff: 2000,
            resonance: 2.0,
            decay: 0.3,
            waveform: 'sawtooth',
            delayGain: 0.2,
            delayFeedback: 0.4,
            delayTime: 0.3,
            reverbGain: 0.15
        }
    };

// -------------------------------------------------------------
    // 2. PRESET SONGS DATA
    // -------------------------------------------------------------
    const PRESETS = {
        'neon-synthwave': {
            bpm: 110,
            settings: {
                cutoff: 1800, resonance: 3, decay: 0.35, waveform: 'sawtooth',
                delayGain: 0.3, delayFeedback: 0.5, delayTime: 0.33, reverbGain: 0.3,
                vol: { lead: 0.75, bass: 0.85, chords: 0.65, drums: 0.85 },
                pan: { lead: -0.15, bass: 0, chords: 0.2, drums: 0 }
            },
            grids: {
                lead: [
                    [1,0,0,0, 1,0,0,0, 1,0,0,0, 0,0,1,0], // C5
                    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,1,0,0], // A4
                    [0,0,0,0, 0,0,0,0, 0,0,0,1, 1,0,0,0], // G4
                    [0,1,0,0, 0,1,0,0, 0,1,0,0, 0,0,0,0], // E4
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                bass: [
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [1,0,1,0, 1,0,1,0, 0,0,0,0, 0,0,0,0], // D2
                    [0,0,0,0, 0,0,0,0, 1,0,1,0, 1,0,1,1]  // C2
                ],
                chords: [
                    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // Cmaj7
                    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], // Am7
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0], // Dm7
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0], // Em7
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                drums: [
                    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], // Kick
                    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // Snare
                    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], // Closed hat
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1], // Open hat
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0], // Rimshot
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ]
            }
        },
        'techno-pulse': {
            bpm: 128,
            settings: {
                cutoff: 1200, resonance: 8, decay: 0.2, waveform: 'square',
                delayGain: 0.25, delayFeedback: 0.6, delayTime: 0.25, reverbGain: 0.2,
                vol: { lead: 0.7, bass: 0.9, chords: 0.5, drums: 0.9 },
                pan: { lead: 0.3, bass: 0, chords: -0.3, drums: 0 }
            },
            grids: {
                lead: [
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,1,0, 0,1,0,0, 0,0,1,0, 0,1,0,0],
                    [0,0,0,1, 0,0,1,0, 0,0,0,1, 0,0,1,0],
                    [1,0,0,0, 1,0,0,1, 1,0,0,0, 1,0,0,1],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                bass: [
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]
                ],
                chords: [
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                drums: [
                    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
                    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
                    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ]
            }
        },
        'ambient-dreams': {
            bpm: 80,
            settings: {
                cutoff: 900, resonance: 1.5, decay: 1.2, waveform: 'sine',
                delayGain: 0.45, delayFeedback: 0.7, delayTime: 0.6, reverbGain: 0.5,
                vol: { lead: 0.6, bass: 0.7, chords: 0.8, drums: 0.2 },
                pan: { lead: -0.4, bass: 0, chords: 0.4, drums: -0.1 }
            },
            grids: {
                lead: [
                    [0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0],
                    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                bass: [
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                chords: [
                    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                drums: [
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ]
            }
        },
        'chiptune-groove': {
            bpm: 135,
            settings: {
                cutoff: 3500, resonance: 6, decay: 0.18, waveform: 'square',
                delayGain: 0.35, delayFeedback: 0.45, delayTime: 0.18, reverbGain: 0.1,
                vol: { lead: 0.8, bass: 0.8, chords: 0.5, drums: 0.75 },
                pan: { lead: -0.2, bass: 0, chords: 0.2, drums: 0 }
            },
            grids: {
                lead: [
                    [1,0,0,1, 0,1,0,0, 1,0,0,1, 0,1,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,1,0,0, 1,0,0,0, 0,1,0,0, 1,0,0,0],
                    [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0],
                    [0,0,1,0, 0,0,0,1, 0,0,1,0, 0,0,0,1],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                bass: [
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [1,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 1,0,0,0, 1,0,0,0],
                    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
                    [0,0,0,1, 0,0,0,1, 0,0,0,1, 0,0,0,1]
                ],
                chords: [
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ],
                drums: [
                    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
                    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
                    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
                    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
                ]
            }
        }
    };

// -------------------------------------------------------------
    // 3. AUDIO ENGINE & SYNTHESIS SETUP
    // -------------------------------------------------------------
    let audioCtx = null;

    // Live-mute flag per AUDIO SPEC: applied straight to masterGain so
    // output silences immediately, even for already-ringing notes.
    let isMuted = false;

// Exposed for hub/menu integration (additive; note-trigger shapes unchanged).
    window.SoundPainter2Audio = { setMuted, toggleMute, get muted() { return isMuted; } };

// Master Nodes
    let masterGain = null;

    let masterAnalyser = null;

    let mainFilter = null;

// Effects nodes
    let delayNode = null;

    let delayFeedbackNode = null;

    let delayFilter = null;

    let delayGainNode = null;

let reverbNode = null;

    let reverbGainNode = null;

// Track Mixer Channels
    const channels = {
        lead: { gain: null, panner: null },
        bass: { gain: null, panner: null },
        chords: { gain: null, panner: null },
        drums: { gain: null, panner: null }
    };

let noiseBuffer = null;

// -------------------------------------------------------------
    // 6. SCHEDULER & PLAYHEAD TIMER LOOP
    // -------------------------------------------------------------
    let nextNoteTime = 0.0;

    let schedulerTimer = null;

// Lookahead (25ms) and schedule window (100ms)
    const LOOKAHEAD_MS = 25.0;

    const SCHEDULE_AHEAD_TIME = 0.1;

// -------------------------------------------------------------
    // 8. REAL-TIME CANVAS VISUALIZER
    // -------------------------------------------------------------
    let canvas, ctx;

// -------------------------------------------------------------
    // 11. INITIALIZATION ON PAGE LOAD
    // -------------------------------------------------------------
    initVisualizer();

    setupEventListeners();

    populateCredits();

// Try loading URL parameters if present
    loadFromUrlParameters();

// Build the grid interface (Lead track active by default)
    buildSequencerUI();

    syncPocketFX();

    syncPocketBpm();

    syncTransportUI();

// Keep the exposed state in sync with the sequencer state object. The
    // previous bare identifiers were never declared and stopped startup.
    window.gameState = { title: "Sound Painter 2", activeTrack: state.activeTrack, bpm: state.bpm, isPlaying: state.isPlaying };

    window.game = window.gameState;


