(function () {
    'use strict';

    const RARITIES = [
        { id: 'common',    name: 'Common',    color: '#e2e8f0', hex: 0xe2e8f0, weight: 46, dmgMin: 1.02, dmgMax: 1.16, affixes: 0 },
        { id: 'uncommon',  name: 'Uncommon',  color: '#22c55e', hex: 0x22c55e, weight: 28, dmgMin: 1.18, dmgMax: 1.36, affixes: 1 },
        { id: 'rare',      name: 'Rare',      color: '#3b82f6', hex: 0x3b82f6, weight: 15, dmgMin: 1.38, dmgMax: 1.62, affixes: 1 },
        { id: 'epic',      name: 'Epic',      color: '#a855f7', hex: 0xa855f7, weight: 8,  dmgMin: 1.65, dmgMax: 1.98, affixes: 2 },
        { id: 'legendary', name: 'Legendary', color: '#f97316', hex: 0xf97316, weight: 3,  dmgMin: 2.05, dmgMax: 2.55, affixes: 2 }
    ];

    const ARCHETYPES = [
        { id: 'katana',     name: 'Katana',       kind: 'melee',  dmgMult: 0.95, speedMult: 1.25, rangeMult: 1.05, critBonus: 0.14, color: 0xe2e8f0 },
        { id: 'greatsword', name: 'Greatsword',   kind: 'melee',  dmgMult: 1.30, speedMult: 0.80, rangeMult: 1.30, critBonus: 0.06, color: 0x94a3b8 },
        { id: 'battleaxe',  name: 'Battleaxe',    kind: 'melee',  dmgMult: 1.35, speedMult: 0.78, rangeMult: 1.15, critBonus: 0.10, color: 0x64748b },
        { id: 'scythe',     name: 'Soul Scythe',  kind: 'melee',  dmgMult: 1.18, speedMult: 0.95, rangeMult: 1.35, critBonus: 0.12, color: 0xa855f7 },
        { id: 'twinblade',  name: 'Twinblade',    kind: 'melee',  dmgMult: 0.90, speedMult: 1.38, rangeMult: 1.10, critBonus: 0.10, color: 0x38bdf8 },
        { id: 'warhammer',  name: 'Titan Maul',   kind: 'melee',  dmgMult: 1.42, speedMult: 0.72, rangeMult: 1.12, critBonus: 0.05, color: 0x475569 },
        { id: 'dagger',     name: 'Shadow Fang',  kind: 'melee',  dmgMult: 0.82, speedMult: 1.50, rangeMult: 0.85, critBonus: 0.22, color: 0x1e293b },
        { id: 'halberd',    name: 'Halberd',      kind: 'melee',  dmgMult: 1.15, speedMult: 0.92, rangeMult: 1.45, critBonus: 0.08, color: 0xcbd5e1 },
        { id: 'flail',      name: 'Infernal Mace',kind: 'melee',  dmgMult: 1.25, speedMult: 0.88, rangeMult: 1.05, critBonus: 0.09, color: 0xf59e0b },
        { id: 'wand',       name: 'Arcane Wand',  kind: 'ranged', dmgMult: 0.92, speedMult: 1.30, rangeMult: 1.20, critBonus: 0.12, color: 0xc084fc },
        { id: 'staff',      name: 'Void Staff',   kind: 'ranged', dmgMult: 1.24, speedMult: 0.90, rangeMult: 1.35, critBonus: 0.10, color: 0x7e22ce },
        { id: 'railgun',    name: 'Rail-Carbine', kind: 'ranged', dmgMult: 1.18, speedMult: 1.12, rangeMult: 1.40, critBonus: 0.16, color: 0x06b6d4 },
        { id: 'claymore',   name: 'Star Claymore',kind: 'melee',  dmgMult: 1.34, speedMult: 0.82, rangeMult: 1.32, critBonus: 0.08, color: 0x38bdf8 },
        { id: 'rapier',     name: 'Duelist Rapier',kind:'melee',  dmgMult: 0.88, speedMult: 1.45, rangeMult: 1.15, critBonus: 0.20, color: 0xfef08a },
        { id: 'spear',      name: 'Valkyrie Spear',kind:'melee',  dmgMult: 1.12, speedMult: 1.05, rangeMult: 1.50, critBonus: 0.11, color: 0xfde047 },
        { id: 'glaive',     name: 'Crescent Glaive',kind:'melee', dmgMult: 1.20, speedMult: 0.96, rangeMult: 1.38, critBonus: 0.12, color: 0x2dd4bf },
        { id: 'crossbow',   name: 'Auto-Crossbow',kind: 'ranged', dmgMult: 1.08, speedMult: 1.22, rangeMult: 1.35, critBonus: 0.15, color: 0x94a3b8 },
        { id: 'chakram',    name: 'Solar Chakram',kind: 'ranged', dmgMult: 0.96, speedMult: 1.35, rangeMult: 1.25, critBonus: 0.14, color: 0xfb923c },
        { id: 'trident',    name: 'Abyss Trident',kind: 'melee',  dmgMult: 1.26, speedMult: 0.90, rangeMult: 1.42, critBonus: 0.10, color: 0x0ea5e9 },
        { id: 'grimoire',   name: 'Runed Grimoire',kind:'ranged', dmgMult: 1.22, speedMult: 1.00, rangeMult: 1.30, critBonus: 0.18, color: 0xc084fc }
    ];

    const PREFIXES = [
        { name: 'Blazing',       tint: 0xf97316, dmgAdd: 0.12, speedAdd: 0.0,  critAdd: 0.02, lifesteal: 0.0,  tag: 'Fire' },
        { name: 'Frostbite',     tint: 0x38bdf8, dmgAdd: 0.06, speedAdd: 0.05, critAdd: 0.08, lifesteal: 0.0,  tag: 'Frost' },
        { name: 'Vampiric',      tint: 0xef4444, dmgAdd: 0.05, speedAdd: 0.0,  critAdd: 0.0,  lifesteal: 0.08, tag: 'Lifesteal' },
        { name: 'Overclocked',   tint: 0x22d3ee, dmgAdd: 0.0,  speedAdd: 0.22, critAdd: 0.04, lifesteal: 0.0,  tag: 'Rapid' },
        { name: 'Executioner\'s',tint: 0xfacc15, dmgAdd: 0.10, speedAdd: 0.0,  critAdd: 0.14, lifesteal: 0.0,  tag: 'Crit' },
        { name: 'Void-Touched',  tint: 0xa855f7, dmgAdd: 0.16, speedAdd: 0.06, critAdd: 0.05, lifesteal: 0.0,  tag: 'Void' }
    ];

    let nextWeaponId = 1;

    function rollRarity(isBoss, isElite, floor) {
        if (isBoss) {
            return Math.random() < 0.45 ? RARITIES[4] : RARITIES[3];
        }
        const floorBonus = Math.min(20, (floor || 1) * 1.5) + (isElite ? 18 : 0);
        const roll = Math.random() * 100;
        let acc = 0;
        // Shift weight toward rarer tiers on higher floors/elites
        for (let i = RARITIES.length - 1; i >= 0; i--) {
            const r = RARITIES[i];
            const bonus = i >= 2 ? floorBonus * (i * 0.22) : 0;
            acc += r.weight + bonus;
            if (roll <= acc) return r;
        }
        return RARITIES[0];
    }

    function generateWeapon(opts = {}) {
        const rarity = opts.rarity || rollRarity(!!opts.isBoss, !!opts.isElite, opts.floor || 1);
        const arch = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
        const rarityRoll = rarity.dmgMin + Math.random() * (rarity.dmgMax - rarity.dmgMin);

        let prefix = null;
        if (rarity.affixes >= 1) {
            prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
        }

        const dmgMult = Number((arch.dmgMult * rarityRoll + (prefix ? prefix.dmgAdd : 0)).toFixed(2));
        const speedMult = Number((arch.speedMult + (prefix ? prefix.speedAdd : 0) + (rarity.affixes >= 2 ? 0.08 : 0)).toFixed(2));
        const rangeMult = Number((arch.rangeMult + (rarity.id === 'legendary' ? 0.15 : 0)).toFixed(2));
        const critBonus = Number((arch.critBonus + (prefix ? prefix.critAdd : 0) + (rarity.affixes >= 2 ? 0.05 : 0)).toFixed(2));
        const lifesteal = prefix ? prefix.lifesteal : 0;

        const displayName = prefix ? `${prefix.name} ${arch.name}` : arch.name;

        return {
            id: `wpn_${nextWeaponId++}`,
            name: displayName,
            archetype: arch.id,
            kind: arch.kind,
            rarity: rarity.id,
            rarityName: rarity.name,
            rarityColor: rarity.color,
            rarityHex: rarity.hex,
            tintHex: prefix ? prefix.tint : arch.color,
            dmgMult,
            speedMult,
            rangeMult,
            critBonus,
            lifesteal,
            tag: prefix ? prefix.tag : null
        };
    }

    function buildDropMesh(weaponData) {
        const root = new THREE.Group();

        // Borderlands-style vertical loot beam
        const beamGeo = new THREE.CylinderGeometry(1.1, 1.8, 52, 10, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
            color: weaponData.rarityHex,
            transparent: true,
            opacity: weaponData.rarity === 'legendary' ? 0.55 : 0.36,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = 26;
        root.add(beam);

        // Floor glow ring
        const ringGeo = new THREE.RingGeometry(4.5, 6.2, 20);
        const ringMat = new THREE.MeshBasicMaterial({
            color: weaponData.rarityHex,
            transparent: true,
            opacity: 0.75,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.6;
        root.add(ring);

        // Floating weapon icon/mesh
        const wpnMesh = window.GraveGainWeaponFactory?.buildLootWeapon
            ? window.GraveGainWeaponFactory.buildLootWeapon(weaponData)
            : new THREE.Mesh(
                new THREE.BoxGeometry(2.5, 9, 1.2),
                new THREE.MeshStandardMaterial({ color: weaponData.rarityHex, emissive: weaponData.rarityHex, emissiveIntensity: 0.45 })
            );
        wpnMesh.scale.set(0.65, 0.65, 0.65);
        wpnMesh.position.y = 10;
        root.add(wpnMesh);
        root.wpnMesh = wpnMesh;
        root.ring = ring;
        root.beam = beam;

        return root;
    }

    class WeaponLootManager {
        constructor() {
            this.drops = [];
            this.nearbyDrop = null;
        }

        clear(scene) {
            for (const d of this.drops) {
                if (scene && d.mesh) scene.remove(d.mesh);
            }
            this.drops = [];
            this.nearbyDrop = null;
            this._hidePrompt();
        }

        spawnDrop(scene, x, z, weaponData) {
            if (!scene || !weaponData) return null;
            const mesh = buildDropMesh(weaponData);
            mesh.position.set(x, 0, z);
            scene.add(mesh);
            const drop = {
                id: weaponData.id,
                x,
                z,
                weapon: weaponData,
                mesh,
                age: 0
            };
            this.drops.push(drop);
            return drop;
        }

        maybeDropFromEnemy(scene, enemy, floor) {
            if (!scene || !enemy) return null;
            const isBoss = !!enemy.isBoss;
            const isElite = !!enemy.isElite || (enemy.maxHp && enemy.maxHp >= 140);
            const dropChance = isBoss ? 1.0 : (isElite ? 0.55 : 0.28);
            if (Math.random() > dropChance) return null;

            const weapon = generateWeapon({ isBoss, isElite, floor });
            const offsetX = (Math.random() - 0.5) * 14;
            const offsetZ = (Math.random() - 0.5) * 14;
            return this.spawnDrop(scene, enemy.x + offsetX, enemy.y + offsetZ, weapon);
        }

        update(dt, player, scene) {
            if (!player) return;
            let closest = null;
            let closestDist = 36;

            for (const d of this.drops) {
                d.age += dt;
                if (d.mesh && d.mesh.wpnMesh) {
                    d.mesh.wpnMesh.rotation.y += dt * 2.2;
                    d.mesh.wpnMesh.position.y = 10 + Math.sin(d.age * 3.2) * 1.6;
                }
                if (d.mesh && d.mesh.ring) {
                    const s = 1 + Math.sin(d.age * 4) * 0.08;
                    d.mesh.ring.scale.set(s, s, 1);
                }
                const dist = Math.hypot(d.x - player.x, d.z - player.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = d;
                }
            }

            this.nearbyDrop = closest;
            if (closest) {
                this._showPrompt(closest.weapon);
            } else {
                this._hidePrompt();
            }
        }

        pickupNearby(game) {
            if (!this.nearbyDrop || !game || !game.player) return false;
            const drop = this.nearbyDrop;
            const idx = this.drops.indexOf(drop);
            if (idx !== -1) this.drops.splice(idx, 1);
            if (game.scene && drop.mesh) game.scene.remove(drop.mesh);

            const replaced = game.equipLootedWeapon(drop.weapon);
            if (replaced) {
                // Drop the replaced weapon back onto the floor like Borderlands!
                this.spawnDrop(game.scene, game.player.x + 8, game.player.y + 8, replaced);
            }

            this.nearbyDrop = null;
            this._hidePrompt();
            return true;
        }

        _showPrompt(w) {
            let el = document.getElementById('weaponPickupPrompt');
            if (!el) {
                el = document.createElement('div');
                el.id = 'weaponPickupPrompt';
                el.style.cssText = 'position:fixed;bottom:108px;left:50%;transform:translateX(-50%);z-index:120;background:rgba(8,6,18,0.92);border:2px solid #fff;border-radius:10px;padding:8px 16px;font-family:Orbitron,sans-serif;font-size:0.8rem;color:#f8fafc;pointer-events:auto;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,0.65);text-align:center;';
                el.addEventListener('click', () => {
                    if (window.GraveGainGame && window.GraveGainGame.weaponLoot) {
                        window.GraveGainGame.weaponLoot.pickupNearby(window.GraveGainGame);
                    }
                });
                document.body.appendChild(el);
            }
            const critPct = Math.round((w.critBonus || 0) * 100);
            const lsText = w.lifesteal ? ` · +${Math.round(w.lifesteal * 100)}% Lifesteal` : '';
            el.style.borderColor = w.rarityColor;
            el.innerHTML = `<span style="color:${w.rarityColor};font-weight:800;">[E] ${w.rarityName.toUpperCase()} ${w.name}</span><div style="font-size:0.7rem;opacity:0.85;margin-top:2px;">DMG x${w.dmgMult} · SPD x${w.speedMult} · +${critPct}% Crit${lsText}</div>`;
            el.classList.remove('hidden');
            el.style.display = 'block';
        }

        _hidePrompt() {
            const el = document.getElementById('weaponPickupPrompt');
            if (el) el.style.display = 'none';
        }
    }

    const WEAPON_ATTACK_PROFILES = {
        katana:     { kind: 'melee',  animStyle: 'slash',  reach: 58, arcCos: 0.45, hits: 1, lunge: 8,  vfxColor: '#e2e8f0', sfx: 'swing' },
        greatsword: { kind: 'melee',  animStyle: 'slash',  reach: 74, arcCos: 0.20, hits: 1, lunge: 4,  vfxColor: '#fbbf24', sfx: 'swing' },
        battleaxe:  { kind: 'melee',  animStyle: 'smash',  reach: 66, arcCos: 0.25, hits: 1, lunge: 5,  vfxColor: '#ef4444', sfx: 'swing' },
        scythe:     { kind: 'melee',  animStyle: 'slash',  reach: 76, arcCos: 0.15, hits: 1, lunge: 6,  vfxColor: '#a855f7', sfx: 'swing' },
        twinblade:  { kind: 'melee',  animStyle: 'spin',   reach: 56, arcCos: 0.40, hits: 2, lunge: 10, vfxColor: '#38bdf8', sfx: 'swing' },
        warhammer:  { kind: 'melee',  animStyle: 'smash',  reach: 62, arcCos: 0.30, hits: 1, lunge: 3,  vfxColor: '#f97316', sfx: 'hit'   },
        dagger:     { kind: 'melee',  animStyle: 'flurry', reach: 46, arcCos: 0.55, hits: 2, lunge: 12, vfxColor: '#94a3b8', sfx: 'swing' },
        halberd:    { kind: 'melee',  animStyle: 'thrust', reach: 84, arcCos: 0.50, hits: 1, lunge: 8,  vfxColor: '#cbd5e1', sfx: 'swing' },
        flail:      { kind: 'melee',  animStyle: 'smash',  reach: 64, arcCos: 0.22, hits: 1, lunge: 4,  vfxColor: '#f59e0b', sfx: 'hit'   },
        claymore:   { kind: 'melee',  animStyle: 'slash',  reach: 76, arcCos: 0.22, hits: 1, lunge: 6,  vfxColor: '#38bdf8', sfx: 'swing' },
        rapier:     { kind: 'melee',  animStyle: 'thrust', reach: 66, arcCos: 0.72, hits: 1, lunge: 16, vfxColor: '#fef08a', sfx: 'swing' },
        spear:      { kind: 'melee',  animStyle: 'thrust', reach: 86, arcCos: 0.70, hits: 1, lunge: 14, vfxColor: '#fde047', sfx: 'swing' },
        glaive:     { kind: 'melee',  animStyle: 'slash',  reach: 78, arcCos: 0.28, hits: 1, lunge: 8,  vfxColor: '#2dd4bf', sfx: 'swing' },
        trident:    { kind: 'melee',  animStyle: 'thrust', reach: 80, arcCos: 0.45, hits: 1, lunge: 10, vfxColor: '#0ea5e9', sfx: 'swing' },
        wand:       { kind: 'ranged', animStyle: 'cast',   projCount: 1, projSpeed: 520, spread: 0.0,  projColor: 0xc084fc, sfx: 'spell' },
        staff:      { kind: 'ranged', animStyle: 'cast',   projCount: 1, projSpeed: 400, spread: 0.0,  projColor: 0x7e22ce, sfx: 'spell' },
        railgun:    { kind: 'ranged', animStyle: 'recoil', projCount: 1, projSpeed: 760, spread: 0.0,  projColor: 0x06b6d4, sfx: 'spell' },
        crossbow:   { kind: 'ranged', animStyle: 'recoil', projCount: 3, projSpeed: 560, spread: 0.14, projColor: 0x94a3b8, sfx: 'swing' },
        chakram:    { kind: 'ranged', animStyle: 'spin',   projCount: 2, projSpeed: 480, spread: 0.18, projColor: 0xfb923c, sfx: 'swing' },
        grimoire:   { kind: 'ranged', animStyle: 'cast',   projCount: 3, projSpeed: 390, spread: 0.22, projColor: 0xc084fc, sfx: 'spell' }
    };

    function getAttackProfile(archetype) {
        return WEAPON_ATTACK_PROFILES[archetype] || WEAPON_ATTACK_PROFILES.katana;
    }

    window.GraveGainWeaponLoot = {
        RARITIES,
        ARCHETYPES,
        WEAPON_ATTACK_PROFILES,
        getAttackProfile,
        generateWeapon,
        WeaponLootManager
    };
})();
