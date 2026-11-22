(function () {
    'use strict';

    const RACES = [
        { id: 'human', name: 'Human', skin: 0xd6bfa9, scale: 1.0, hpBonus: 10 },
        { id: 'elf',   name: 'Elf',   skin: 0xe6d5c3, scale: 0.96, hpBonus: 0 },
        { id: 'dwarf', name: 'Dwarf', skin: 0xc9a88d, scale: 0.85, hpBonus: 30 },
        { id: 'orc',   name: 'Orc',   skin: 0x5c7a4e, scale: 1.12, hpBonus: 40 }
    ];

    const CLASSES = [
        { id: 'dps',     name: 'DPS',     color: 0xef4444, hp: 115, dmg: 26, cd: 0.65, range: 55 },
        { id: 'tank',    name: 'Tank',    color: 0x3b82f6, hp: 175, dmg: 16, cd: 0.90, range: 52 },
        { id: 'support', name: 'Support', color: 0x22c55e, hp: 130, dmg: 15, cd: 0.80, range: 55 },
        { id: 'mage',    name: 'Mage',    color: 0xa855f7, hp: 105, dmg: 28, cd: 0.95, range: 140 }
    ];

    const SUBCLASS_TITLES = {
        human: { dps: 'Soldier',   tank: 'Warden',   support: 'Medic',  mage: 'Engineer' },
        elf:   { dps: 'Assassin',  tank: 'Guardian', support: 'Druid',  mage: 'Witch' },
        dwarf: { dps: 'Slayer',    tank: 'Paladin',  support: 'Brewer', mage: 'Tinkerer' },
        orc:   { dps: 'Berserker', tank: 'Brute',    support: 'Shaman', mage: 'Warlock' }
    };

    /**
     * SquadAllies: 1 choosable AI companion from 4 Races x 4 Classes (16 subclasses)
     * with role-specific combat synergies in GraveGain 3DA.
     */
    const SquadAllies = {
        allies: [],
        panelEl: null,
        scene: null,
        player: null,
        mapMeshes: null,
        selectedRace: (typeof localStorage !== 'undefined' && localStorage.getItem('gg3da_comp_race')) || 'human',
        selectedClass: (typeof localStorage !== 'undefined' && localStorage.getItem('gg3da_comp_class')) || 'dps',

        init(scene, player, mapMeshes) {
            this.scene = scene;
            this.player = player;
            this.mapMeshes = mapMeshes;
            this.spawnSelected();
        },

        spawnSelected() {
            this.clear(this.scene);
            this.ensurePanel();
            if (!this.scene || !this.player) return;

            const race = RACES.find(r => r.id === this.selectedRace) || RACES[0];
            const cls = CLASSES.find(c => c.id === this.selectedClass) || CLASSES[0];
            const subName = (SUBCLASS_TITLES[race.id] && SUBCLASS_TITLES[race.id][cls.id]) || cls.name;
            const maxHp = cls.hp + race.hpBonus;

            const group = new THREE.Group();
            const torso = new THREE.Mesh(
                new THREE.CylinderGeometry(8 * race.scale, 10 * race.scale, 26 * race.scale, 8),
                new THREE.MeshStandardMaterial({ color: cls.color, roughness: 0.7 })
            );
            torso.position.y = 16 * race.scale;
            group.add(torso);

            const head = new THREE.Mesh(
                new THREE.SphereGeometry(5.5 * race.scale, 8, 6),
                new THREE.MeshStandardMaterial({ color: race.skin, roughness: 0.8 })
            );
            head.position.y = 33 * race.scale;
            group.add(head);

            group.position.set(this.player.x - 48, 0, this.player.y + 32);
            this.scene.add(group);
            if (this.mapMeshes) this.mapMeshes.push(group);

            this.allies.push({
                name: `${race.name} ${subName}`,
                classId: cls.id,
                hp: maxHp,
                maxHp,
                dmg: cls.dmg,
                atkCd: cls.cd,
                range: cls.range,
                cd: 0,
                healCd: 0,
                mesh: group
            });

            this.renderPanel();
        },

        ensurePanel() {
            if (this.panelEl) return;
            const el = document.createElement('div');
            el.id = 'gg-squad-panel';
            el.style.cssText = [
                'position:fixed', 'left:14px', 'top:88px', 'display:flex',
                'flex-direction:column', 'gap:6px', 'z-index:15'
            ].join(';');
            document.body.appendChild(el);
            this.panelEl = el;
        },

        renderPanel() {
            if (!this.panelEl || !this.allies.length) return;
            const a = this.allies[0];
            const raceOpts = RACES.map(r => `<option value="${r.id}" ${r.id === this.selectedRace ? 'selected' : ''}>${r.name}</option>`).join('');
            const classOpts = CLASSES.map(c => `<option value="${c.id}" ${c.id === this.selectedClass ? 'selected' : ''}>${c.name}</option>`).join('');

            this.panelEl.innerHTML = `
                <div style="width:205px;background:linear-gradient(90deg,rgba(14,12,18,0.9),rgba(14,12,18,0.55));
                    border:1px solid #4a3f31;border-left:3px solid #d97706;padding:6px 8px;
                    font-family:Georgia,serif;color:#e5dfd3;box-shadow:0 3px 10px rgba(0,0,0,0.6);">
                    <div style="font-size:11px;margin-bottom:4px;font-weight:bold;">${a.name}</div>
                    <div style="width:100%;height:6px;background:#1a161b;border:1px solid #3a3028;margin-bottom:6px;">
                        <div id="gg-ally-hp-0" style="height:100%;width:100%;background:linear-gradient(90deg,#7f1d1d,#dc2626);"></div>
                    </div>
                    <div style="display:flex;gap:4px;">
                        <select id="gg-comp-race" style="flex:1;background:#1a161b;color:#e5dfd3;border:1px solid #4a3f31;font-size:10px;padding:2px;">${raceOpts}</select>
                        <select id="gg-comp-class" style="flex:1;background:#1a161b;color:#e5dfd3;border:1px solid #4a3f31;font-size:10px;padding:2px;">${classOpts}</select>
                    </div>
                </div>
            `;

            document.getElementById('gg-comp-race').onchange = (e) => {
                this.selectedRace = e.target.value;
                try { localStorage.setItem('gg3da_comp_race', this.selectedRace); } catch (_) {}
                this.spawnSelected();
            };
            document.getElementById('gg-comp-class').onchange = (e) => {
                this.selectedClass = e.target.value;
                try { localStorage.setItem('gg3da_comp_class', this.selectedClass); } catch (_) {}
                this.spawnSelected();
            };
        },

        update(dt, player, enemies) {
            if (!this.allies.length || !player) return;
            const a = this.allies[0];
            if (a.cd > 0) a.cd -= dt;
            if (a.healCd > 0) a.healCd -= dt;
            const ax = a.mesh.position.x;
            const az = a.mesh.position.z;

            // Support synergy: grant +8 Temp HP every 5s when nearby
            if (a.classId === 'support' && a.healCd <= 0 && Math.hypot(player.x - ax, player.y - az) < 160) {
                a.healCd = 5.0;
                if (typeof player.addTempHp === 'function') player.addTempHp(8);
            }

            let target = null;
            let bestD = 280;
            if (enemies && enemies.length) {
                for (let i = 0; i < enemies.length; i++) {
                    const en = enemies[i];
                    if (!en || en.hp <= 0) continue;
                    const d = Math.hypot(en.x - ax, en.y - az);
                    if (d < bestD) { bestD = d; target = en; }
                }
            }

            const destX = target ? target.x : (player.x - 48);
            const destZ = target ? target.y : (player.y + 32);
            const dx = destX - ax;
            const dz = destZ - az;
            const dist = Math.hypot(dx, dz);

            if (dist > Math.max(34, a.range * 0.7)) {
                const spd = 128 * dt;
                a.mesh.position.x += (dx / dist) * spd;
                a.mesh.position.z += (dz / dist) * spd;
                a.mesh.rotation.y = Math.atan2(dx, dz);
            }

            if (target && bestD <= a.range && a.cd <= 0) {
                a.cd = a.atkCd;
                target.hp -= a.dmg;
                if (typeof target.applyStatus === 'function') {
                    if (a.classId === 'dps') target.applyStatus('bleeding', 3.0);
                    else if (a.classId === 'tank') target.applyStatus('staggered', 0.8);
                    else if (a.classId === 'mage') target.applyStatus(Math.random() < 0.5 ? 'flaming' : 'confused', 3.0);
                }
            }

            const bar = document.getElementById('gg-ally-hp-0');
            if (bar) bar.style.width = `${Math.max(0, (a.hp / a.maxHp) * 100)}%`;
        },

        clear(scene) {
            this.allies.forEach((a) => {
                if (a.mesh && scene) scene.remove(a.mesh);
            });
            this.allies = [];
        }
    };

    window.SquadAllies = SquadAllies;
})();
