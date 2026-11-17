(function (root) {
    'use strict';

    var SLUG = 'gravegain2dA';
    var SAVE_BYTES_MAX = 200 * 1024;
    var autosaveEnabled = true;

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
            if (!k || k.indexOf('fourweird-v2-cloud-save:') === 0) continue;
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

    function handleHostLoad(data) {
        if (!data || !data.data || !data.data.keys) return 0;
        var keysObj = data.data.keys;
        var restored = 0;
        for (var k in keysObj) {
            if (Object.prototype.hasOwnProperty.call(keysObj, k)) {
                var val = keysObj[k];
                if (typeof val === 'string' && k.length + val.length <= SAVE_BYTES_MAX) {
                    try {
                        localStorage.setItem(k, val);
                        restored += 1;
                    } catch (_) {}
                }
            }
        }
        if (typeof window !== 'undefined') {
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
            var d = ev && ev.data;
            if (!d || d.version !== 1) return;
            if (d.type === 'load') {
                handleHostLoad(d);
            }
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
