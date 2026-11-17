(function (root) {
    'use strict';

    var SLUG = 'gravegain2dC';
    var LEGACY_SAVE_KEY = 'GraveGain2D_Save';
    var MAIN_SAVE_KEY = 'GraveGain2DC_Save';
    var MATERIAL_DEVICE_ID_KEY = 'GraveGain2DC_MaterialDeviceId_v1';
    var SAVE_BYTES_MAX = 200 * 1024;
    var autosaveEnabled = true;
    var SAVE_KEY_PREFIXES = ['GraveGain2DC_', 'gravegain_shared_story_progress_v1', 'gravegain_campaign_codex_v1'];

    function isGameSaveKey(key) {
        return typeof key === 'string' && key !== MATERIAL_DEVICE_ID_KEY && (key === LEGACY_SAVE_KEY || SAVE_KEY_PREFIXES.some(function (prefix) { return key.indexOf(prefix) === 0; }));
    }

    function postToHost(msg) {
        if (typeof window === 'undefined') return false;
        var parentWin = window.parent;
        if (!parentWin || parentWin === window) return false;
        try {
            parentWin.postMessage(Object.assign({ version: 1, slug: SLUG }, msg), '*');
            return true;
        } catch (_) {
            return false;
        }
    }

    function snapshotStorage() {
        if (typeof localStorage === 'undefined') return null;
        var keys = {};
        var bytes = 0;
        var count = 0;
        for (var i = 0; i < localStorage.length; i += 1) {
            var k = localStorage.key(i);
            if (!isGameSaveKey(k) || k === LEGACY_SAVE_KEY) continue;
            var v = localStorage.getItem(k);
            if (typeof v !== 'string') continue;
            var entryBytes = k.length + v.length;
            if (bytes + entryBytes > SAVE_BYTES_MAX) continue;
            keys[k] = v;
            bytes += entryBytes;
            count += 1;
        }
        return count > 0 ? { namespace: SLUG, keys: keys, bytes: bytes } : null;
    }

    function requestSave(reason, opts) {
        opts = opts || {};
        reason = reason || 'manual';
        if (opts.kind === 'auto' && !autosaveEnabled) return false;
        var snap = snapshotStorage();
        if (!snap) return false;
        return postToHost({
            type: 'save',
            slot: 0,
            schema_version: 1,
            data: { namespace: snap.namespace, keys: snap.keys },
            reason: reason,
            kind: opts.kind
        });
    }

    function mergeStorageKey(key, cloudRaw) {
        if (!isGameSaveKey(key) || !cloudRaw || typeof cloudRaw !== 'string') return;
        if (key === LEGACY_SAVE_KEY) key = MAIN_SAVE_KEY;
        var localRaw = null;
        try { localRaw = localStorage.getItem(key); } catch (_) {}
        if (!localRaw) {
            if (key !== 'GraveGain2DC_AAA_Tutorial') {
                try { JSON.parse(cloudRaw); } catch (_) { return; }
            }
            try { localStorage.setItem(key, cloudRaw); } catch (_) {}
            return;
        }

        // These settings are device preferences rather than career progress.
        if (key === 'GraveGain2DC_autoTarget' || key === 'GraveGain2DC_tapMove' || key === 'GraveGain2DC_StartingWeapon_v1') return;

        var cloudVal;
        try { cloudVal = JSON.parse(cloudRaw); } catch (_) { return; }
        var localVal;
        try { localVal = JSON.parse(localRaw); }
        catch (_) {
            try { localStorage.setItem(key, cloudRaw); } catch (e) {}
            return;
        }

        try {
            if (key === MAIN_SAVE_KEY) {
                var localSavedAt = Number(localVal.updatedAt) || 0;
                var cloudSavedAt = Number(cloudVal.updatedAt) || 0;
                // Prefer the newer whole save so balances, claimed rewards,
                // and crops stay from one consistent snapshot. Keep device
                // preferences from this device when adopting cloud progress.
                // Equal or missing timestamps have unknown ordering, so keep
                // the local snapshot instead of risking a progress overwrite.
                if (localSavedAt >= cloudSavedAt && (localSavedAt > 0 || cloudSavedAt === 0)) return;
                var mergedSave = Object.assign({}, localVal, cloudVal, {
                    settings: Object.assign({}, cloudVal.settings || {}, localVal.settings || {})
                });
                localStorage.setItem(key, JSON.stringify(mergedSave));
                return;
            }

            if (key === 'gravegain_shared_story_progress_v1') {
                var mergedCompletions = Array.from(new Set((Array.isArray(localVal.completedMissions) ? localVal.completedMissions : [])
                    .concat(Array.isArray(cloudVal.completedMissions) ? cloudVal.completedMissions : [])
                    .map(Number).filter(function (id) { return id >= 1 && id <= 10; }))).sort(function (a, b) { return a - b; });
                var mergedStars = Object.assign({}, cloudVal.stars || {});
                Object.keys(localVal.stars || {}).forEach(function (id) {
                    mergedStars[id] = Math.max(Number(mergedStars[id]) || 0, Number(localVal.stars[id]) || 0);
                });
                localStorage.setItem(key, JSON.stringify(Object.assign({}, cloudVal, localVal, {
                    completedMissions: mergedCompletions,
                    stars: mergedStars,
                    totalStoryKills: Math.max(Number(localVal.totalStoryKills) || 0, Number(cloudVal.totalStoryKills) || 0)
                })));
                return;
            }

            if (key === 'gravegain_campaign_codex_v1') {
                var mergedLore = Array.from(new Set((Array.isArray(localVal.unlocked) ? localVal.unlocked : [])
                    .concat(Array.isArray(cloudVal.unlocked) ? cloudVal.unlocked : [])
                    .filter(function (id) { return typeof id === 'string' && id.length <= 64; })));
                localStorage.setItem(key, JSON.stringify({ unlocked: mergedLore }));
                return;
            }

            if (key === 'GraveGain2DC_AccountStash_v1') {
                var mergedItems = (localVal.items || []).slice();
                var existingItemIds = new Set(mergedItems.map(function (i) { return i.id; }));
                (cloudVal.items || []).forEach(function (ci) {
                    if (!existingItemIds.has(ci.id)) {
                        mergedItems.push(ci);
                        existingItemIds.add(ci.id);
                    }
                });

                function cleanBalances(input) {
                    var output = {};
                    if (!input || typeof input !== 'object') return output;
                    Object.keys(input).forEach(function (id) {
                        if (/^[a-z0-9_-]{1,40}$/i.test(id)) output[id] = Math.min(1000000000, Math.max(0, Math.floor(Number(input[id]) || 0)));
                    });
                    return output;
                }
                function cleanCounters(input) {
                    var output = {};
                    if (!input || typeof input !== 'object') return output;
                    Object.keys(input).forEach(function (materialId) {
                        if (!/^[a-z0-9_-]{1,40}$/i.test(materialId) || !input[materialId] || typeof input[materialId] !== 'object') return;
                        var perDevice = {};
                        Object.keys(input[materialId]).forEach(function (deviceId) {
                            if (/^[a-z0-9_-]{8,64}$/i.test(deviceId)) perDevice[deviceId] = Math.min(1000000000, Math.max(0, Math.floor(Number(input[materialId][deviceId]) || 0)));
                        });
                        if (Object.keys(perDevice).length) output[materialId] = perDevice;
                    });
                    return output;
                }
                function mergeCounters(localCounters, cloudCounters) {
                    var merged = {};
                    var materialIds = Array.from(new Set(Object.keys(localCounters).concat(Object.keys(cloudCounters))));
                    materialIds.forEach(function (materialId) {
                        var perDevice = {};
                        var deviceIds = Array.from(new Set(Object.keys(localCounters[materialId] || {}).concat(Object.keys(cloudCounters[materialId] || {}))));
                        deviceIds.forEach(function (deviceId) {
                            perDevice[deviceId] = Math.max(Number(localCounters[materialId] && localCounters[materialId][deviceId]) || 0, Number(cloudCounters[materialId] && cloudCounters[materialId][deviceId]) || 0);
                        });
                        if (deviceIds.length) merged[materialId] = perDevice;
                    });
                    return merged;
                }
                var localMaterials = cleanBalances(localVal.materials);
                var cloudMaterials = cleanBalances(cloudVal.materials);
                var localBase = localVal.materialLedgerVersion === 1 ? cleanBalances(localVal.materialBase) : localMaterials;
                var cloudBase = cloudVal.materialLedgerVersion === 1 ? cleanBalances(cloudVal.materialBase) : cloudMaterials;
                var materialBase = {};
                Array.from(new Set(Object.keys(localBase).concat(Object.keys(cloudBase)))).forEach(function (id) {
                    materialBase[id] = Math.max(Number(localBase[id]) || 0, Number(cloudBase[id]) || 0);
                });
                var materialEarned = mergeCounters(cleanCounters(localVal.materialEarned), cleanCounters(cloudVal.materialEarned));
                var materialSpent = mergeCounters(cleanCounters(localVal.materialSpent), cleanCounters(cloudVal.materialSpent));
                var mergedMaterials = {};
                Array.from(new Set(Object.keys(materialBase).concat(Object.keys(materialEarned), Object.keys(materialSpent)))).forEach(function (id) {
                    var earned = Object.keys(materialEarned[id] || {}).reduce(function (sum, deviceId) { return sum + materialEarned[id][deviceId]; }, 0);
                    var spent = Object.keys(materialSpent[id] || {}).reduce(function (sum, deviceId) { return sum + materialSpent[id][deviceId]; }, 0);
                    mergedMaterials[id] = Math.min(1000000000, Math.max(0, (Number(materialBase[id]) || 0) + earned - spent));
                });

                var consumedShards = Array.from(new Set((localVal.consumedShards || []).concat(cloudVal.consumedShards || [])));
                var spentShardSet = new Set(consumedShards);
                var mergedShards = Array.from(new Set((localVal.shards || []).concat(cloudVal.shards || []))).filter(function (id) { return !spentShardSet.has(id); });
                var finalStash = {
                    items: mergedItems,
                    materials: mergedMaterials,
                    materialLedgerVersion: 1,
                    materialBase: materialBase,
                    materialEarned: materialEarned,
                    materialSpent: materialSpent,
                    shards: mergedShards,
                    consumedShards: consumedShards
                };
                localStorage.setItem(key, JSON.stringify(finalStash));
                return;
            }

            if (key === 'GraveGain2DC_LoadoutPresets_v1') {
                var deletedPresetIds = Array.from(new Set((localVal.deletedPresetIds || []).concat(cloudVal.deletedPresetIds || [])));
                var deletedPresetSet = new Set(deletedPresetIds);
                var mergedPresets = (localVal.presets || []).filter(function (p) { return p && !deletedPresetSet.has(p.id); }).slice();
                var existingPresetIds = new Set(mergedPresets.map(function (p) { return p.id; }));
                (cloudVal.presets || []).forEach(function (cp) {
                    if (cp && !deletedPresetSet.has(cp.id) && !existingPresetIds.has(cp.id)) {
                        mergedPresets.push(cp);
                        existingPresetIds.add(cp.id);
                    }
                });
                var activePresetId = [localVal.activePresetId, cloudVal.activePresetId].find(function (id) { return id && !deletedPresetSet.has(id) && existingPresetIds.has(id); });
                var finalPresets = {
                    activePresetId: activePresetId || (mergedPresets[0] ? mergedPresets[0].id : null),
                    presets: mergedPresets,
                    deletedPresetIds: deletedPresetIds
                };
                localStorage.setItem(key, JSON.stringify(finalPresets));
                return;
            }

            if (key === 'GraveGain2DC_Progression_v1') {
                var finalLevel = Math.max(Number(localVal.level) || 1, Number(cloudVal.level) || 1);
                var finalXp = Math.max(Number(localVal.xp) || 0, Number(cloudVal.xp) || 0);
                var finalSubSpec = cloudVal.subSpecId || localVal.subSpecId;
                var finalClass = cloudVal.classId || localVal.classId;
                var mergedNodes = Array.from(new Set((localVal.passiveNodes || []).concat(cloudVal.passiveNodes || [])));
                var mergedPerks = Array.from(new Set((localVal.equippedPerks || []).concat(cloudVal.equippedPerks || [])));
                var mergedBlueprints = Array.from(new Set((localVal.unlockedBlueprints || []).concat(cloudVal.unlockedBlueprints || [])));
                var mergedAlignment = {
                    puritan: Math.max((localVal.alignment && localVal.alignment.puritan) || 0, (cloudVal.alignment && cloudVal.alignment.puritan) || 0),
                    radical: Math.max((localVal.alignment && localVal.alignment.radical) || 0, (cloudVal.alignment && cloudVal.alignment.radical) || 0)
                };
                var localMastery = localVal.weaponMastery && typeof localVal.weaponMastery === 'object' ? localVal.weaponMastery : {};
                var cloudMastery = cloudVal.weaponMastery && typeof cloudVal.weaponMastery === 'object' ? cloudVal.weaponMastery : {};
                var mergedMastery = {
                    melee: Math.max(0, Math.floor(Number(localMastery.melee) || 0), Math.floor(Number(cloudMastery.melee) || 0)),
                    ranged: Math.max(0, Math.floor(Number(localMastery.ranged) || 0), Math.floor(Number(cloudMastery.ranged) || 0)),
                    ability: Math.max(0, Math.floor(Number(localMastery.ability) || 0), Math.floor(Number(cloudMastery.ability) || 0))
                };

                var finalProg = Object.assign({}, localVal, cloudVal, {
                    level: finalLevel,
                    xp: finalXp,
                    paragonLevel: mergedNodes.length,
                    paragonPoints: Math.max(0, finalLevel - 1 - mergedNodes.length),
                    classId: finalClass,
                    subSpecId: finalSubSpec,
                    alignment: mergedAlignment,
                    weaponMastery: mergedMastery,
                    passiveNodes: mergedNodes,
                    equippedPerks: mergedPerks,
                    unlockedBlueprints: mergedBlueprints
                });
                localStorage.setItem(key, JSON.stringify(finalProg));
                return;
            }

            if (key === 'GraveGain2DC_Speedrun_v1') {
                var localRuns = localVal && typeof localVal === 'object' ? localVal : {};
                var cloudRuns = cloudVal && typeof cloudVal === 'object' ? cloudVal : {};
                var mergedRuns = {};
                Array.from(new Set(Object.keys(localRuns).concat(Object.keys(cloudRuns)))).slice(0, 600).forEach(function (runKey) {
                    if (!/^[a-z0-9_-]{1,100}$/i.test(runKey)) return;
                    var localRun = localRuns[runKey];
                    var cloudRun = cloudRuns[runKey];
                    var localTime = localRun && Number(localRun.timeMs);
                    var cloudTime = cloudRun && Number(cloudRun.timeMs);
                    var best = isFinite(localTime) && localTime > 0 && localTime < 86400000 ? localRun : null;
                    if (isFinite(cloudTime) && cloudTime > 0 && cloudTime < 86400000 && (!best || cloudTime < best.timeMs)) best = cloudRun;
                    if (best) mergedRuns[runKey] = best;
                });
                localStorage.setItem(key, JSON.stringify(mergedRuns));
                return;
            }

            if (key === 'GraveGain2DC_Career_v1') {
                var localCareerStats = localVal.stats && typeof localVal.stats === 'object' ? localVal.stats : {};
                var cloudCareerStats = cloudVal.stats && typeof cloudVal.stats === 'object' ? cloudVal.stats : {};
                var numericCareerStats = ['kills', 'bossKills', 'relics', 'bonusObjectives', 'bestFloor', 'victories'];
                var mergedCareerStats = {};
                numericCareerStats.forEach(function (name) {
                    var floor = name === 'bestFloor' ? 1 : 0;
                    var localCount = Number(localCareerStats[name]);
                    var cloudCount = Number(cloudCareerStats[name]);
                    if (!isFinite(localCount)) localCount = floor;
                    if (!isFinite(cloudCount)) cloudCount = floor;
                    mergedCareerStats[name] = Math.max(floor, Math.floor(localCount), Math.floor(cloudCount));
                });
                mergedCareerStats.weapons = Array.from(new Set((Array.isArray(localCareerStats.weapons) ? localCareerStats.weapons : [])
                    .concat(Array.isArray(cloudCareerStats.weapons) ? cloudCareerStats.weapons : [])
                    .filter(function (id) { return typeof id === 'string' && id.length > 0 && id.length <= 64; }))).slice(0, 20);
                mergedCareerStats.campaignMissions = Array.from(new Set((Array.isArray(localCareerStats.campaignMissions) ? localCareerStats.campaignMissions : [])
                    .concat(Array.isArray(cloudCareerStats.campaignMissions) ? cloudCareerStats.campaignMissions : [])
                    .map(Number).filter(function (id) { return id >= 1 && id <= 10; }))).sort(function (a, b) { return a - b; });
                var mergedCareer = Object.assign({}, localVal, cloudVal, {
                    stats: mergedCareerStats,
                    unlocked: Array.from(new Set((Array.isArray(localVal.unlocked) ? localVal.unlocked : [])
                        .concat(Array.isArray(cloudVal.unlocked) ? cloudVal.unlocked : [])
                        .filter(function (id) { return typeof id === 'string' && id.length <= 64; })))
                });
                localStorage.setItem(key, JSON.stringify(mergedCareer));
                return;
            }

            localStorage.setItem(key, cloudRaw);
        } catch (_) {
            // If a merge fails, preserve the local snapshot that parsed above.
        }
    }

    function handleHostLoad(data, dispatchLoadEvent) {
        if (!data || !data.data || !data.data.keys) return 0;
        var keysObj = data.data.keys;
        var restored = 0;
        for (var k in keysObj) {
            if (Object.prototype.hasOwnProperty.call(keysObj, k) && isGameSaveKey(k)) {
                var val = keysObj[k];
                if (typeof val === 'string' && k.length + val.length <= SAVE_BYTES_MAX) {
                    mergeStorageKey(k, val);
                    restored += 1;
                }
            }
        }
        if (dispatchLoadEvent !== false && typeof window !== 'undefined') {
            try {
                window.dispatchEvent(new CustomEvent('fourweird-cloud-load', { detail: data }));
            } catch (_) {}
        }
        return restored;
    }

    if (typeof window !== 'undefined') {
        window.__fourweirdRequestSave = function (reason) {
            return requestSave(reason || 'manual');
        };

        window.__fourweirdAutosave = {
            setEnabled: function (val) { autosaveEnabled = !!val; },
            isEnabled: function () { return autosaveEnabled; },
            requestSave: function (reason) { return requestSave(reason || 'explicit'); }
        };

        window.addEventListener('fourweird-request-save', function (ev) {
            requestSave(ev && ev.detail && ev.detail.reason ? ev.detail.reason : 'event');
        });

        window.addEventListener('message', function (ev) {
            if (!ev || window.parent === window || ev.source !== window.parent) return;
            var d = ev && ev.data;
            if (!d || d.version !== 1 || (d.slug && d.slug !== SLUG)) return;
            if (d.type === 'load') {
                handleHostLoad(d);
            }
        });

        // runtime-bridge.js applies missing cloud keys and emits this event.
        // Merge our game-specific keys before the game reacts and reloads its
        // live state; suppress re-emitting to avoid an event loop.
        window.addEventListener('fourweird-cloud-load', function (ev) {
            var detail = ev && ev.detail;
            if (!detail || detail.slug !== SLUG || !detail.data || detail.data.namespace !== SLUG) return;
            handleHostLoad({ data: detail.data }, false);
        });

        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') {
                requestSave('visibilitychange', { kind: 'auto' });
            }
        });

        window.addEventListener('pagehide', function () {
            requestSave('pagehide', { kind: 'auto' });
        });

        // Handshake: send ready
        if (window.parent && window.parent !== window) {
            postToHost({ type: 'ready' });
        }
    }

    var SaveBridge = {
        id: 'net_save',
        snapshotStorage: snapshotStorage,
        requestSave: requestSave,
        postToHost: postToHost
    };

    var ns = root.GraveGainNet = root.GraveGainNet || {};
    ns.SaveBridge = SaveBridge;
    if (typeof module !== 'undefined' && module.exports) module.exports = SaveBridge;
})(typeof globalThis !== 'undefined' ? globalThis : window);
