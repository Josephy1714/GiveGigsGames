(function (root) {
    'use strict';

    var ns = root.GraveGainStubs = root.GraveGainStubs || {};
    var VERSION = 9;
    var DIFFICULTIES = ['easy', 'normal', 'hard', 'nightmare'];
    var MODES = ['realtime', 'chrono', 'turnbased'];
    var SPEEDS = [0.5, 1, 1.5, 2];
    var MAX_EPOCH_SECONDS = 4102444800;
    var MAX_EPOCH_MILLISECONDS = MAX_EPOCH_SECONDS * 1000;

    function finite(value, fallback, min, max) {
        var number = Number(value);
        if (!isFinite(number)) number = fallback;
        return Math.max(min, Math.min(max, number));
    }

    function cleanText(value, maxLength) {
        return String(value == null ? '' : value).replace(/[<>\u0000-\u001f]/g, '').slice(0, maxLength);
    }

    function createDefaultState() {
        return {
            schemaVersion: VERSION,
            gold: 0,
            goldInterestCarry: 0,
            goldInterestElapsedMs: 0,
            uusd: 200,
            quartersLevel: 1,
            prestige: 0,
            botanyCrops: [],
            dailyChallengeDate: null,
            dailyChallenges: null,
            settings: {
                difficulty: 'normal', volume: 0.8, pickupRange: 100,
                cameraShake: true, cameraLead: true, cameraPunch: true, muted: false,
                controlMode: 'realtime', gameSpeed: 1, speedrunMode: false
            }
        };
    }

    function normalize(raw) {
        var input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
        var defaults = createDefaultState();
        var savedSettings = input.settings && typeof input.settings === 'object' ? input.settings : {};
        var difficulty = DIFFICULTIES.indexOf(savedSettings.difficulty) >= 0 ? savedSettings.difficulty : defaults.settings.difficulty;
        var controlMode = MODES.indexOf(savedSettings.controlMode) >= 0 ? savedSettings.controlMode : defaults.settings.controlMode;
        var gameSpeed = Number(savedSettings.gameSpeed);
        if (SPEEDS.indexOf(gameSpeed) < 0) gameSpeed = defaults.settings.gameSpeed;

        var crops = Array.isArray(input.botanyCrops) ? input.botanyCrops.slice(0, 12).map(function (crop) {
            crop = crop && typeof crop === 'object' ? crop : {};
            var seedId = typeof crop.seedId === 'string' ? cleanText(crop.seedId, 48) : null;
            return {
                seedId: seedId || null,
                startTime: Math.floor(finite(crop.startTime, 0, 0, 4102444800)),
                growthTime: finite(crop.growthTime, 0, 0, 2592000),
                capacity: finite(crop.capacity, 0, 0, 1000)
            };
        }) : [];

        var challenges = Array.isArray(input.dailyChallenges) ? input.dailyChallenges.slice(0, 3).map(function (challenge, index) {
            challenge = challenge && typeof challenge === 'object' ? challenge : {};
            var challengeId = Math.floor(finite(challenge.id, index + 1, 1, 3));
            var challengeTypes = ['slay', 'gold', 'depth', 'damage', 'streak'];
            var legacyChallengeTypes = { 1: 'slay', 2: 'gold', 3: 'depth' };
            var challengeType = challengeTypes.indexOf(challenge.type) >= 0 ? challenge.type : (legacyChallengeTypes[challengeId] || 'slay');
            var target = Math.floor(finite(challenge.target, 0, 0, 1000000));
            return {
                id: challengeId,
                type: challengeType,
                desc: cleanText(challenge.desc, 180),
                target: target,
                current: Math.floor(finite(challenge.current, 0, 0, target || 1000000)),
                carry: finite(challenge.carry, 0, 0, 0.999999),
                done: !!challenge.done,
                claimed: !!challenge.claimed,
                rewardGold: Math.floor(finite(challenge.rewardGold, 0, 0, 100000000)),
                rewardUusd: Math.floor(finite(challenge.rewardUusd, 0, 0, 100000000))
            };
        }) : null;

        var updatedAt = Math.floor(finite(input.updatedAt, 0, 0, MAX_EPOCH_MILLISECONDS));
        // Schema v3 accidentally clamped millisecond save timestamps to the
        // seconds-scale year-2100 bound. Treat that sentinel as unknown so it
        // cannot make an old local snapshot appear newer than cloud saves.
        if (updatedAt === MAX_EPOCH_SECONDS) updatedAt = 0;

        return {
            schemaVersion: VERSION,
            updatedAt: updatedAt,
            gold: Math.floor(finite(input.gold, defaults.gold, 0, 1000000000000)),
            goldInterestCarry: finite(input.goldInterestCarry, defaults.goldInterestCarry, 0, 0.999999),
            goldInterestElapsedMs: Math.floor(finite(input.goldInterestElapsedMs, defaults.goldInterestElapsedMs, 0, 29999)),
            uusd: Math.floor(finite(input.uusd, defaults.uusd, 0, 1000000000000)),
            quartersLevel: Math.floor(finite(input.quartersLevel, defaults.quartersLevel, 1, 20)),
            prestige: Math.floor(finite(input.prestige, defaults.prestige, 0, 5)),
            botanyCrops: crops,
            dailyChallengeDate: typeof input.dailyChallengeDate === 'string' ? cleanText(input.dailyChallengeDate, 48) : null,
            dailyChallenges: challenges && challenges.length === 3 ? challenges : null,
            settings: {
                difficulty: difficulty,
                volume: finite(savedSettings.volume, defaults.settings.volume, 0, 1),
                pickupRange: finite(savedSettings.pickupRange, defaults.settings.pickupRange, 30, 250),
                cameraShake: savedSettings.cameraShake !== false,
                cameraLead: savedSettings.cameraLead !== false,
                cameraPunch: savedSettings.cameraPunch !== false,
                muted: savedSettings.muted === true,
                controlMode: controlMode,
                gameSpeed: gameSpeed,
                speedrunMode: savedSettings.speedrunMode === true
            }
        };
    }

    ns.stateSchema = {
        version: VERSION,
        createDefaultState: createDefaultState,
        normalize: normalize
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = ns.stateSchema;
})(typeof globalThis !== 'undefined' ? globalThis : window);
