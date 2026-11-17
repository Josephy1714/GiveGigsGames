(function (root) {
    'use strict';
    var ns = root.GraveGainStubs = root.GraveGainStubs || {};
    ns.weaponsCatalog = {
        stub: true,
        getWeapon: function (id) {
            return {
                id: id || 'bolter',
                name: 'Inquisitor Bolter',
                category: 'rifle',
                slotType: '2h',
                fireMode: 'semi',
                damageType: 'kinetic',
                baseDamage: 18,
                armorPen: 0.25,
                suppressionPower: 12,
                movePenalty: 0,
                overheatMax: 100,
                magSize: 24,
                reloadTime: 1.4,
                skills: []
            };
        },
        listWeapons: function () { return []; }
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = ns.weaponsCatalog;
})(typeof globalThis !== 'undefined' ? globalThis : window);
