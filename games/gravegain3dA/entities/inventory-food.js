(function () {
    'use strict';

    const FOOD_ITEMS = [
        { id: 'meat',    name: 'Red Meat',    icon: '🍖', hp: 180, digestTime: 120, hpPerSec: 1.5,  staminaBoost: 0.05, stamina: 10, value: 18, desc: '+1.5 Real HP/s (120s)' },
        { id: 'cheese',  name: 'Aged Cheese', icon: '🧀', hp: 144, digestTime: 180, hpPerSec: 0.8,  staminaBoost: 0.20, stamina: 20, value: 16, desc: '+0.8 HP/s & +20% Stam Regen' },
        { id: 'fruit',   name: 'Sun Fruit',   icon: '🍎', hp: 30,  digestTime: 30,  hpPerSec: 1.0,  staminaBoost: 0.15, stamina: 25, value: 10, desc: '+1.0 HP/s (30s) & +15% Stam' },
        { id: 'white',   name: 'White Meat',  icon: '🍗', hp: 90,  digestTime: 90,  hpPerSec: 1.0,  staminaBoost: 0.10, stamina: 15, value: 14, desc: '+1.0 Real HP/s (90s)' },
        { id: 'bread',   name: 'Hearth Bread',icon: '🍞', hp: 45,  digestTime: 60,  hpPerSec: 0.75, staminaBoost: 0.05, stamina: 15, value: 9,  desc: '+0.75 Real HP/s (60s)' },
        { id: 'fish',    name: 'River Fish',  icon: '🐟', hp: 100, digestTime: 80,  hpPerSec: 1.25, staminaBoost: 0.12, stamina: 20, value: 16, desc: '+1.25 Real HP/s (80s)' },
        { id: 'berry',   name: 'Void Berries',icon: '🫐', hp: 32,  digestTime: 40,  hpPerSec: 0.8,  staminaBoost: 0.18, stamina: 35, value: 15, desc: '+0.8 HP/s & +18% Stam' },
        { id: 'stew',    name: 'Hearty Stew', icon: '🍲', hp: 180, digestTime: 150, hpPerSec: 1.2,  staminaBoost: 0.16, stamina: 25, value: 26, desc: '+1.2 Real HP/s (150s)' },
        { id: 'honey',   name: 'Golden Honey',icon: '🍯', hp: 42,  digestTime: 35,  hpPerSec: 1.2,  staminaBoost: 0.19, stamina: 20, value: 24, desc: '+1.2 HP/s & +19% Stam' },
        { id: 'jerky',   name: 'Dried Jerky', icon: '🥩', hp: 182, digestTime: 130, hpPerSec: 1.4,  staminaBoost: 0.04, stamina: 10, value: 22, desc: '+1.4 Real HP/s (130s)' },
        { id: 'shroom',  name: 'Mushrooms',   icon: '🍄', hp: 49,  digestTime: 55,  hpPerSec: 0.9,  staminaBoost: 0.09, stamina: 40, value: 18, desc: '+0.9 Real HP/s (55s)' },
        { id: 'soup',    name: 'Moon Soup',   icon: '🥣', hp: 110, digestTime: 110, hpPerSec: 1.0,  staminaBoost: 0.14, stamina: 20, value: 20, desc: '+1.0 Real HP/s (110s)' }
    ];

    class InventoryManager {
        constructor() {
            this.foods = {}; // { foodId: count }
            this.weapons = []; // spare weapons in backpack (max 12)
            this.digesting = []; // active stomach digestion slots (max 3)
            this.maxWeapons = 12;
            this.isOpen = false;
            this._injectToggleButton();
        }

        reset() {
            this.foods = { bread: 2, fruit: 1 };
            this.weapons = [];
            this.digesting = [];
            this.isOpen = false;
            this._renderModal();
        }

        addFood(foodId, count = 1) {
            this.foods[foodId] = (this.foods[foodId] || 0) + count;
            if (this.isOpen) this._renderModal();
        }

        maybeDropFoodFromEnemy(enemy, game) {
            if (!enemy || !game) return null;
            const chance = enemy.isBoss ? 1.0 : 0.35;
            if (Math.random() > chance) return null;
            const item = FOOD_ITEMS[Math.floor(Math.random() * FOOD_ITEMS.length)];
            this.addFood(item.id, enemy.isBoss ? 2 : 1);
            if (game.combatText) {
                game.combatText.spawnText(enemy.x, 24, enemy.y, `+${item.icon} ${item.name}`, 'heal');
            }
            return item;
        }

        addWeapon(weapon) {
            if (!weapon) return false;
            if (this.weapons.length >= this.maxWeapons) return false;
            this.weapons.push(weapon);
            if (this.isOpen) this._renderModal();
            return true;
        }

        eatFood(foodId, game) {
            if (!this.foods[foodId] || this.foods[foodId] <= 0 || !game || !game.player) return false;
            const def = FOOD_ITEMS.find(f => f.id === foodId);
            if (!def) return false;

            if (this.digesting.length >= 3) {
                if (game.combatText) {
                    game.combatText.spawnText(game.player.x, 22, game.player.y, 'STOMACH FULL (3/3)!', 'damage');
                }
                return false;
            }

            this.foods[foodId] -= 1;
            if (this.foods[foodId] <= 0) delete this.foods[foodId];

            this.digesting.push({
                name: def.name,
                remaining: def.digestTime || 45,
                hpPerSec: def.hpPerSec || 1.0,
                staminaBoost: def.staminaBoost || 0.1
            });
            if (def.stamina > 0 && typeof game.player.stamina === 'number') {
                game.player.stamina = Math.min(game.player.maxStamina || 100, game.player.stamina + def.stamina);
            }
            game.audio?.playSfx('heal');
            if (game.combatText) {
                game.combatText.spawnText(game.player.x, 22, game.player.y, `${def.icon} Digesting ${def.name}`, 'heal');
            }
            if (this.isOpen) this._renderModal();
            return true;
        }

        updateDigestion(dt, player) {
            if (!player || player.isDead || !this.digesting.length) return;
            for (let i = this.digesting.length - 1; i >= 0; i--) {
                const slot = this.digesting[i];
                slot.remaining -= dt;
                const cap = player.wounded ? player.maxHp * 0.75 : player.maxHp;
                if (player.hp < cap) {
                    player.hp = Math.min(cap, player.hp + slot.hpPerSec * dt);
                }
                if (typeof player.stamina === 'number') {
                    player.stamina = Math.min(player.maxStamina || 100, player.stamina + (18 * slot.staminaBoost) * dt);
                }
                if (slot.remaining <= 0) this.digesting.splice(i, 1);
            }
        }

        quickEatBest(game) {
            for (const f of FOOD_ITEMS) {
                if ((this.foods[f.id] || 0) > 0) {
                    return this.eatFood(f.id, game);
                }
            }
            return false;
        }

        toggle(forceState) {
            this.isOpen = typeof forceState === 'boolean' ? forceState : !this.isOpen;
            this._renderModal();
        }

        _injectToggleButton() {
            if (document.getElementById('btnInventoryToggle')) return;
            const btn = document.createElement('button');
            btn.id = 'btnInventoryToggle';
            btn.type = 'button';
            btn.textContent = '🎒 Bag [I]';
            btn.style.cssText = 'position:fixed;bottom:68px;left:16px;z-index:90;padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.28);background:rgba(12,10,24,0.88);color:#f8fafc;font-family:Orbitron,sans-serif;font-size:0.74rem;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.5);';
            btn.addEventListener('click', () => this.toggle());
            document.body.appendChild(btn);
        }

        _renderModal() {
            let modal = document.getElementById('inventoryModal');
            if (!this.isOpen) {
                if (modal) modal.style.display = 'none';
                return;
            }
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'inventoryModal';
                modal.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(4,3,10,0.78);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;';
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) this.toggle(false);
                });
                document.body.appendChild(modal);
            }
            modal.style.display = 'flex';

            const game = window.GraveGainGame;
            const foodHtml = FOOD_ITEMS.map(f => {
                const count = this.foods[f.id] || 0;
                if (count <= 0) return '';
                return `<button type="button" data-eat="${f.id}" style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:8px 12px;border-radius:8px;border:1px solid rgba(34,197,94,0.4);background:rgba(15,23,42,0.85);color:#f8fafc;cursor:pointer;text-align:left;">
                    <span><strong>${f.icon} ${f.name}</strong> <small style="opacity:0.75;display:block;">${f.desc}</small></span>
                    <span style="background:#16a34a;padding:2px 8px;border-radius:999px;font-size:0.72rem;font-weight:800;">x${count} · EAT</span>
                </button>`;
            }).join('') || '<div style="opacity:0.6;font-size:0.8rem;">No food in bag. Defeat enemies to find food!</div>';

            const wpnHtml = this.weapons.map((w, idx) => {
                return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:8px;border:1px solid ${w.rarityColor};background:rgba(15,23,42,0.85);color:#f8fafc;">
                    <div>
                        <div style="color:${w.rarityColor};font-weight:800;font-size:0.8rem;">${w.rarityName.toUpperCase()} ${w.name}</div>
                        <div style="font-size:0.7rem;opacity:0.75;">DMG x${w.dmgMult} · SPD x${w.speedMult} · +${Math.round((w.critBonus || 0) * 100)}% Crit</div>
                    </div>
                    <div style="display:flex;gap:6px;">
                        <button type="button" data-equip-idx="${idx}" style="padding:4px 10px;border-radius:6px;border:1px solid #38bdf8;background:#0284c7;color:#fff;font-size:0.7rem;cursor:pointer;">Equip</button>
                        <button type="button" data-sell-idx="${idx}" style="padding:4px 10px;border-radius:6px;border:1px solid #eab308;background:#a16207;color:#fff;font-size:0.7rem;cursor:pointer;">Sell</button>
                    </div>
                </div>`;
            }).join('') || '<div style="opacity:0.6;font-size:0.8rem;">No spare weapons in backpack.</div>';

            modal.innerHTML = `<div style="width:min(680px,96vw);max-height:85vh;overflow-y:auto;background:#0b0918;border:1px solid rgba(148,163,184,0.35);border-radius:14px;padding:20px;color:#f8fafc;font-family:Orbitron,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,0.8);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <h3 style="margin:0;color:#fbbf24;font-size:1.1rem;">🎒 ADVENTURER INVENTORY</h3>
                    <button type="button" id="btnCloseInv" style="padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.25);background:transparent;color:#f8fafc;cursor:pointer;">✕ Close [I]</button>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;">
                    <div>
                        <div style="font-size:0.78rem;color:#4ade80;margin-bottom:8px;font-weight:700;">🍖 FOOD & CONSUMABLES (Click to Eat)</div>
                        <div style="display:flex;flex-direction:column;gap:8px;">${foodHtml}</div>
                    </div>
                    <div>
                        <div style="font-size:0.78rem;color:#60a5fa;margin-bottom:8px;font-weight:700;">⚔️ WEAPON BACKPACK (${this.weapons.length}/${this.maxWeapons})</div>
                        <div style="display:flex;flex-direction:column;gap:8px;">${wpnHtml}</div>
                    </div>
                </div>
            </div>`;

            modal.querySelector('#btnCloseInv')?.addEventListener('click', () => this.toggle(false));
            modal.querySelectorAll('[data-eat]').forEach(btn => {
                btn.addEventListener('click', () => this.eatFood(btn.dataset.eat, game));
            });
            modal.querySelectorAll('[data-equip-idx]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = Number(btn.dataset.equipIdx);
                    const w = this.weapons.splice(idx, 1)[0];
                    if (w && game) {
                        const swapped = game.equipLootedWeapon(w);
                        if (swapped) this.weapons.push(swapped);
                        this._renderModal();
                    }
                });
            });
            modal.querySelectorAll('[data-sell-idx]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = Number(btn.dataset.sellIdx);
                    const w = this.weapons.splice(idx, 1)[0];
                    if (w && game) {
                        const gold = Math.round(15 * (w.dmgMult || 1));
                        game.gold = (game.gold || 0) + gold;
                        game.audio?.playSfx('pickup');
                        this._renderModal();
                    }
                });
            });
        }
    }

    window.GraveGainInventory = {
        FOOD_ITEMS,
        InventoryManager
    };
})();
