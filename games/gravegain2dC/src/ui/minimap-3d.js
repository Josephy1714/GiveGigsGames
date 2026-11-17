(function (root) {
    'use strict';

    var ns = root.GraveGainStubs = root.GraveGainStubs || {};
    var TILE_COLORS = {
        floor: '#273345', wall: '#101722', breachable: '#684338', door: '#f3b84b',
        chasm: '#070a12', ramp: '#38566a'
    };

    function init(engine, container) {
        if (!engine || !container || typeof document === 'undefined') return null;
        var old = container.querySelector('.gg-minimap');
        if (old) old.remove();

        var panel = document.createElement('aside');
        panel.className = 'gg-minimap';
        panel.setAttribute('aria-label', 'Dungeon map');
        panel.innerHTML = '<div class="gg-minimap-head"><span>✦ DUNGEON MAP</span><button type="button" aria-label="Collapse map" aria-expanded="true">−</button></div>' +
            '<canvas width="192" height="192" aria-label="Explored dungeon rooms, player, enemies, and loot"></canvas>' +
            '<div class="gg-minimap-foot"><span>◆ YOU</span><span>● FOE</span><span>◇ LOOT</span></div>';
        container.appendChild(panel);

        var canvas = panel.querySelector('canvas');
        var ctx = canvas.getContext('2d');
        var toggle = panel.querySelector('button');
        toggle.addEventListener('click', function () {
            var collapsed = panel.classList.toggle('collapsed');
            toggle.textContent = collapsed ? '+' : '−';
            toggle.setAttribute('aria-expanded', String(!collapsed));
            toggle.setAttribute('aria-label', collapsed ? 'Expand map' : 'Collapse map');
        });

        var elapsed = 0;
        var api = {
            panel: panel,
            update: function (dt) {
                elapsed += Math.max(0, Number(dt) || 0);
                if (elapsed < 0.16) return;
                elapsed = 0;
                if (!ctx || panel.classList.contains('collapsed')) return;

                var terrain = engine.getTerrain();
                var state = engine.getState();
                if (!terrain || !terrain.cells || !state || !state.player) return;
                var size = canvas.width;
                var scaleX = size / terrain.width;
                var scaleY = size / terrain.height;
                ctx.clearRect(0, 0, size, size);
                ctx.fillStyle = '#070b12';
                ctx.fillRect(0, 0, size, size);

                for (var i = 0; i < terrain.cells.length; i++) {
                    var cell = terrain.cells[i];
                    if (!cell || !cell.explored) continue;
                    if (cell.secretRoom) {
                        var roomCache = (terrain.secretCaches || []).find(function (cache) { return cache.id === cell.secretCacheId; });
                        if (!roomCache || !roomCache.opened) continue;
                    }
                    var px = cell.gx * scaleX;
                    var py = cell.gz * scaleY;
                    ctx.fillStyle = TILE_COLORS[cell.type] || TILE_COLORS.floor;
                    if (cell.secretRoom) ctx.fillStyle = '#57346f';
                    if (cell.secretWall && cell.secretDiscovered) ctx.fillStyle = '#c084fc';
                    if (cell.treasureRoom) ctx.fillStyle = '#8a642f';
                    if (cell.type === 'wall' && cell.roomId < 0) continue;
                    ctx.fillRect(px, py, Math.ceil(scaleX), Math.ceil(scaleY));
                    if (cell.hazard) {
                        ctx.fillStyle = cell.hazard === 'fire' ? '#fb6846' : (cell.hazard === 'poison' ? '#a3e635' : '#67e8f9');
                        ctx.fillRect(px + scaleX * 0.3, py + scaleY * 0.3, Math.max(1, scaleX * 0.4), Math.max(1, scaleY * 0.4));
                    }
                }

                (state.loot || []).forEach(function (loot) {
                    if (!loot || loot.picked) return;
                    if (loot.secretCacheId) {
                        var secretCache = (terrain.secretCaches || []).find(function (cache) { return cache.id === loot.secretCacheId; });
                        if (!secretCache || !secretCache.opened) return;
                    }
                    var g = terrain.worldToGrid(loot.x, loot.z);
                    var cell = terrain.getCell(g.gx, g.gz);
                    if (!cell || !cell.visible) return;
                    var lootColors = {
                        anchor: '#c084fc', forge_cache: '#fbbf24', toxic_vent: '#a3e635', memorial_beacon: '#fef08a', laser_designator: '#fb7185',
                        health_orb: '#4ade80', speed_boost: '#22d3ee', damage_boost: '#f97316', shield_pickup: '#60a5fa',
                        rage_potion: '#ef4444', gold_multiplier: '#facc15', xp_multiplier: '#c084fc',
                        soul_fountain: '#34d399', blood_altar: '#fb7185'
                    };
                    ctx.fillStyle = lootColors[loot.type] || (loot.type === 'weapon' || loot.type === 'conduit' ? '#67e8f9' : '#facc15');
                    ctx.beginPath();
                    ctx.arc((g.gx + 0.5) * scaleX, (g.gz + 0.5) * scaleY, loot.objectiveId ? 2.7 : (loot.type === 'weapon' || loot.type === 'conduit' || lootColors[loot.type] ? 2.4 : 1.7), 0, Math.PI * 2);
                    ctx.fill();
                });

                (state.enemies || []).forEach(function (enemy) {
                    if (!enemy || enemy.isDead || enemy.hp <= 0 || enemy.ambushHidden) return;
                    var g = terrain.worldToGrid(enemy.x, enemy.z);
                    var cell = terrain.getCell(g.gx, g.gz);
                    if (!cell || !cell.visible) return;
                    ctx.fillStyle = enemy.type === 'boss' ? '#f0abfc' : '#fb7185';
                    ctx.beginPath();
                    ctx.arc((g.gx + 0.5) * scaleX, (g.gz + 0.5) * scaleY, enemy.type === 'boss' ? 3.4 : 2.1, 0, Math.PI * 2);
                    ctx.fill();
                });

                var playerGrid = terrain.worldToGrid(state.player.x, state.player.z);
                var playerX = (playerGrid.gx + 0.5) * scaleX;
                var playerY = (playerGrid.gz + 0.5) * scaleY;
                ctx.save();
                ctx.translate(playerX, playerY);
                ctx.rotate(state.player.angle || 0);
                ctx.fillStyle = '#86efac';
                ctx.shadowColor = '#4ade80';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(0, -5);
                ctx.lineTo(3.4, 3.2);
                ctx.lineTo(0, 1.5);
                ctx.lineTo(-3.4, 3.2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                var biome = String(terrain.biome || 'CRYPT').replace(/_/g, ' ').toUpperCase();
                panel.querySelector('.gg-minimap-head span').textContent = '✦ ' + biome + ' · MAP';
            }
        };
        return api;
    }

    ns.minimap3d = { id: 'minimap', init: init };
    if (typeof module !== 'undefined' && module.exports) module.exports = ns.minimap3d;
})(typeof globalThis !== 'undefined' ? globalThis : window);
