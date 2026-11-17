(function (root) {
    'use strict';
    var ns = root.GraveGainStubs = root.GraveGainStubs || {};
    ns.soundDirector = {
        id: 'audio',
        stub: true,
        init: function () {},
        update: function () {},
        play: function () {},
        setMuted: function () {}
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = ns.soundDirector;
})(typeof globalThis !== 'undefined' ? globalThis : window);
