(function (root) {
    'use strict';
    var ns = root.GraveGainStubs = root.GraveGainStubs || {};
    ns.aiDirector = {
        id: 'ai',
        stub: true,
        init: function () {},
        resetRun: function () {},
        update: function () {}
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = ns.aiDirector;
})(typeof globalThis !== 'undefined' ? globalThis : window);
