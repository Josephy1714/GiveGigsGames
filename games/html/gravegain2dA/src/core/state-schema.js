(function (root) {
    'use strict';
    var ns = root.GraveGainStubs = root.GraveGainStubs || {};
    ns.stateSchema = {
        version: 1,
        stub: true,
        createDefaultState: function () { return { schemaVersion: 1 }; }
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = ns.stateSchema;
})(typeof globalThis !== 'undefined' ? globalThis : window);
