(function (root) {
    'use strict';
    var ns = root.GraveGainStubs = root.GraveGainStubs || {};
    ns.enemiesFactions = {
        stub: true,
        getTemplate: function () { return null; },
        listFactions: function () { return []; }
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = ns.enemiesFactions;
})(typeof globalThis !== 'undefined' ? globalThis : window);
