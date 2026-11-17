(function (root) {
    'use strict';
    var ns = root.GraveGainStubs = root.GraveGainStubs || {};
    ns.pathfinding3d = {
        stub: true,
        findPath: function () { return []; },
        invalidate: function () {}
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = ns.pathfinding3d;
})(typeof globalThis !== 'undefined' ? globalThis : window);
