(function (root) {
    'use strict';

    var ns = root.GraveGainStubs = root.GraveGainStubs || {};
    var FIELD_NOTES = {
        'Goblin Skeleton': ['Hidden skirmisher', 'It stays concealed until you get close or strike it. Packs of nearby enemies hit harder, so break the group before it surrounds you.'],
        'Elven Skeleton': ['Forest dead', 'Faster than its goblin kin. Use a quick shot or ability before it reaches melee range.'],
        'Goblin Zed': ['Crypt crawler', 'It hides until approached or hit, then chases relentlessly. Nearby allies make its attacks more dangerous.'],
        'Small Orc Zed': ['Orc bruiser', 'A hard-hitting melee threat. Block its approach, then punish during your counter window.'],
        'Flying Elf Skull': ['Volatile spirit', 'It hides until approached or hit, then rushes into a three meter detonation. Reveal it from range and keep clear of its blast.'],
        'Vault Stalker': ['Cache guardian', 'A concealed elite that waits in the corridors around a dead-end reward cache. Reveal it early, dodge its fast approach, then claim the gold and Gravefire boost.'],
        'Medium Orc Zed': ['Elite bruiser', 'It marks the ground before a heavy slam. Dodge the orange warning, then use its recovery to land your biggest hits.'],
        'Dwarven Zed': ['Armored elite', 'Its shielded front reduces weapon damage. Flank it or use a race ability, and dodge the blue warning before its shield bash.'],
        'Siege-Ram Zed': ['Siege breaker', 'Its armored front shrugs off direct fire and it follows with a blue shield bash. Circle around it, then use the recovery window.'],
        'Human Zed': ['Ranged warden', 'Fires aimed necrotic bolts after a visible wind-up. Break line of sight or dodge as the warning resolves.'],
        'Huge Orc Zed': ['Siege warden', 'Marks the ground before a heavy slam and enrages below 30% health. Leave the warning circle, then punish its recovery before its faster attacks overwhelm you.'],
        'Elven Necromancer': ['Grave cantor', 'Keeps distance and summons skeletons. Pressure it quickly and thin its escorts before the room fills.']
    };
    var STORY_BOSS_STATS = {
        'Goblin Zed': { hp: 320, dmg: 16 },
        'Dwarven Zed': { hp: 600, dmg: 30 },
        'Huge Orc Zed': { hp: 800, dmg: 40 },
        'Human Zed': { hp: 500, dmg: 25 },
        'Elven Necromancer': { hp: 400, dmg: 15 }
    };

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    function profileTags(enemy) {
        var tags = [enemy.type === 'boss' ? 'BOSS' : (enemy.type === 'elite' ? 'ELITE' : (enemy.type === 'exploding' ? 'VOLATILE' : 'STANDARD'))];
        if (enemy.ranged) tags.push('RANGED');
        if (enemy.summoner) tags.push('SUMMONER');
        if (enemy.armored) tags.push('ARMORED');
        if (enemy.ambusher || enemy.ambushHidden) tags.push('AMBUSHER');
        if (enemy.isEnraged) tags.push('ENRAGED');
        return tags;
    }

    function campaignBosses(catalog) {
        var story = root.GraveGainStoryEngine;
        if (!story || typeof story.getAllMissions !== 'function') return [];
        var missions = story.getAllMissions() || [];
        var bosses = [];
        missions.forEach(function (mission) {
            if (!mission || !mission.bossType) return;
            var name = String(mission.bossType);
            if (catalog.some(function (enemy) { return enemy.name.toLowerCase() === name.toLowerCase(); })) return;
            var key = name.toLowerCase();
            var source = key.indexOf('necro') >= 0 || key.indexOf('lucifer') >= 0 ? 'Elven Necromancer' :
                (key.indexOf('dwarf') >= 0 || key.indexOf('thane') >= 0 ? 'Dwarven Zed' :
                    (key.indexOf('goblin') >= 0 ? 'Goblin Zed' :
                        (key.indexOf('orc') >= 0 || key.indexOf('goliath') >= 0 || key.indexOf('berserker') >= 0 || key.indexOf('golem') >= 0 || key.indexOf('titan') >= 0 ? 'Huge Orc Zed' : 'Human Zed')));
            var template = catalog.find(function (enemy) { return enemy.name === source; });
            if (!template) return;
            var boss = Object.assign({}, template, {
                name: name,
                type: 'boss',
                missionId: mission.id,
                profileSource: source,
                missionTitle: mission.title || ('Mission ' + mission.id)
            });
            var storyStats = STORY_BOSS_STATS[source];
            if (storyStats) {
                boss.hp = storyStats.hp;
                boss.maxHp = storyStats.hp;
                boss.dmg = storyStats.dmg;
            }
            var campaign = root.GraveGainCampaign;
            var missionExtra = campaign && typeof campaign.getExtra === 'function' ? campaign.getExtra(mission.id) : null;
            var hpMultiplier = Number(missionExtra && missionExtra.bossHpMult);
            if (isFinite(hpMultiplier) && hpMultiplier > 0) {
                boss.hp = Math.round(boss.hp * hpMultiplier);
                boss.maxHp = boss.hp;
            }
            bosses.push(boss);
        });
        return bosses;
    }

    function init(engine, button) {
        if (!engine || typeof document === 'undefined') return null;
        var catalog = typeof engine.getEnemyCatalog === 'function' ? engine.getEnemyCatalog() : [];
        if (!catalog.length) return null;
        catalog = catalog.concat(campaignBosses(catalog));

        var overlay = document.createElement('div');
        overlay.className = 'gg-codex hidden';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'ggCodexTitle');
        overlay.innerHTML = '<section class="gg-codex-panel"><header class="gg-codex-header"><div><span>FIELD ARCHIVE · THREAT INDEX</span><h2 id="ggCodexTitle">Bestiary</h2></div><button type="button" class="gg-codex-close" aria-label="Close bestiary">×</button></header>' +
            '<p class="gg-codex-intro">Enemy statistics are base values before floor scaling. Boss attacks announce their target before they land.</p>' +
            '<div class="gg-codex-layout"><nav class="gg-codex-list" aria-label="Enemy roster"></nav><article class="gg-codex-detail" aria-live="polite"></article></div></section>';
        document.body.appendChild(overlay);

        var list = overlay.querySelector('.gg-codex-list');
        var detail = overlay.querySelector('.gg-codex-detail');
        catalog.forEach(function (enemy, index) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'gg-codex-entry' + (index === 0 ? ' active' : '');
            btn.dataset.index = String(index);
            btn.innerHTML = '<span class="gg-codex-icon" aria-hidden="true">' + escapeHtml(enemy.emoji || '☠️') + '</span><span><strong>' + escapeHtml(enemy.name) + '</strong><small>' + profileTags(enemy).join(' · ') + '</small></span>';
            btn.addEventListener('click', function () { select(index); });
            list.appendChild(btn);
        });

        function select(index) {
            var enemy = catalog[index];
            if (!enemy) return;
            list.querySelectorAll('.gg-codex-entry').forEach(function (entry) { entry.classList.toggle('active', Number(entry.dataset.index) === index); });
            var notes = Number(enemy.missionId) === 10
                ? ['Array Overlord', 'At each health threshold, the Array shields Lucifer while guardians arrive. The cyan conduits are exposed during the shift: move close and press E to overload them.']
                : (enemy.missionId && enemy.profileSource === 'Goblin Zed'
                    ? ['Goblin warden', 'This fast warden marks the floor before a heavy slam. Leave the warning circle, then press your attack during its recovery.']
                    : (FIELD_NOTES[enemy.name] || FIELD_NOTES[enemy.profileSource] || ['Crypt dweller', 'Watch its approach and use the space around you to avoid taking repeated hits.']));
            var kicker = enemy.missionId ? 'CAMPAIGN WARDEN · MISSION ' + String(enemy.missionId).padStart(2, '0') : notes[0];
            var tags = profileTags(enemy).map(function (tag) { return '<span>' + escapeHtml(tag) + '</span>'; }).join('');
            detail.innerHTML = '<div class="gg-codex-portrait">' + escapeHtml(enemy.emoji || '☠️') + '</div>' +
                '<div class="gg-codex-kicker">' + escapeHtml(kicker) + '</div><h3>' + escapeHtml(enemy.name) + '</h3>' +
                '<div class="gg-codex-tags">' + tags + '</div>' +
                '<div class="gg-codex-stats"><div><strong>' + Math.round(enemy.hp) + '</strong><small>BASE HP</small></div><div><strong>' + Math.round(enemy.dmg) + '</strong><small>BASE DAMAGE</small></div><div><strong>' + Number(enemy.speed).toFixed(1) + '</strong><small>MOVE SPEED</small></div></div>' +
                '<p>' + escapeHtml(notes[1]) + '</p>';
        }

        function close() {
            overlay.classList.add('hidden');
            if (button) button.focus();
        }
        overlay.querySelector('.gg-codex-close').addEventListener('click', close);
        overlay.addEventListener('click', function (event) { if (event.target === overlay) close(); });
        overlay.addEventListener('keydown', function (event) { if (event.key === 'Escape') { event.stopPropagation(); close(); } });
        if (button) button.addEventListener('click', function () {
            select(0);
            overlay.classList.remove('hidden');
            overlay.querySelector('.gg-codex-close').focus();
        });
        select(0);

        return { open: function () { if (button) button.click(); }, close: close, catalog: catalog };
    }

    ns.codexBestiary = { init: init };
    if (typeof module !== 'undefined' && module.exports) module.exports = ns.codexBestiary;
})(typeof globalThis !== 'undefined' ? globalThis : window);
