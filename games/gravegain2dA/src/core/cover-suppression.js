(function (root) {
    'use strict';
    var ns = root.GraveGainStubs = root.GraveGainStubs || {};
    ns.coverSuppression = {
        id: 'cover',
        stub: true,
        init: function () {},
        resetRun: function () {},
        update: function () {},
        applySuppression: function () { return 0; },
        snapToNearestCover: function () { return false; },
        dashToCover: function () { return false; },
        triggerExecution: function () { return false; },
        toggleHoldPosition: function () { return false; },
        armOverwatch: function () { return false; }
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = ns.coverSuppression;
})(typeof globalThis !== 'undefined' ? globalThis : window);
