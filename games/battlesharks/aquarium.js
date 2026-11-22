/**
 * BattleSharks Interactive Tamagotchi Aquarium & Shop
 */
(function (global) {
    const AQUARIUM_SHOP_ITEMS = [
        // Backgrounds
        { id: 'tropical_reef', name: 'Tropical Reef', category: 'Backgrounds', price: 0, currency: 'coins', icon: '🐠' },
        { id: 'shipwreck', name: 'Shipwreck Cove', category: 'Backgrounds', price: 150, currency: 'coins', icon: '⛵' },
        { id: 'volcanic_trench', name: 'Volcanic Trench', category: 'Backgrounds', price: 10, currency: 'treasure', icon: '🌋' },
        // Lighting
        { id: 'neon_blue', name: 'Neon Blue Glow', category: 'Lighting', price: 0, currency: 'coins', icon: '💙' },
        { id: 'purple', name: 'Abyssal Purple', category: 'Lighting', price: 120, currency: 'coins', icon: '💜' },
        { id: 'golden', name: 'Golden Sunbeams', category: 'Lighting', price: 180, currency: 'coins', icon: '💛' },
        { id: 'bioluminescent', name: 'Bioluminescent', category: 'Lighting', price: 12, currency: 'treasure', icon: '✨' },
        // Effects
        { id: 'bubbles', name: 'Bubble Stream', category: 'Effects', price: 0, currency: 'coins', icon: '🫧' },
        { id: 'glowing_water', name: 'Glowing Water', category: 'Effects', price: 140, currency: 'coins', icon: '🌊' },
        { id: 'underwater_fog', name: 'Underwater Fog', category: 'Effects', price: 8, currency: 'treasure', icon: '🌫️' },
        // Structures
        { id: 'scottish_castle', name: 'Scottish Castle', category: 'Structures', price: 220, currency: 'coins', icon: '🏰' },
        { id: 'atlantis_ruins', name: 'Atlantis Ruins', category: 'Structures', price: 300, currency: 'coins', icon: '🏛️' },
        { id: 'sunken_temple', name: 'Sunken Temple', category: 'Structures', price: 15, currency: 'treasure', icon: '⛩️' },
        // Pirate Decorations
        { id: 'skeleton_rum', name: 'Skeleton w/ Rum', category: 'Pirate', price: 160, currency: 'coins', icon: '☠️' },
        { id: 'treasure_chest', name: 'Treasure Chest', category: 'Pirate', price: 100, currency: 'coins', icon: '🧰' },
        { id: 'cannons', name: 'Pirate Cannons', category: 'Pirate', price: 180, currency: 'coins', icon: '💣' },
        // Marine Life
        { id: 'jellyfish', name: 'Jellyfish', category: 'Marine Life', price: 130, currency: 'coins', icon: '🪼' },
        { id: 'seahorses', name: 'Seahorses', category: 'Marine Life', price: 110, currency: 'coins', icon: '🐡' },
        { id: 'ornamental_fish', name: 'Ornamental Fish', category: 'Marine Life', price: 80, currency: 'coins', icon: '🐟' },
        // Interactive Toys
        { id: 'floating_ball', name: 'Floating Ball', category: 'Toys', price: 90, currency: 'coins', icon: '⚽' },
        { id: 'hoops', name: 'Swim Hoop', category: 'Toys', price: 140, currency: 'coins', icon: '⭕' },
        { id: 'feeding_station', name: 'Feeding Station', category: 'Toys', price: 12, currency: 'treasure', icon: '🍖' },
        // Rare Ornaments
        { id: 'mini_kraken', name: 'Mini Kraken', category: 'Rare Ornaments', price: 25, currency: 'treasure', icon: '🐙' },
        { id: 'leviathan_statue', name: 'Leviathan Statue', category: 'Rare Ornaments', price: 35, currency: 'treasure', icon: '🐉' },
        { id: 'blackwake_figurehead', name: 'Blackwake Figurehead', category: 'Rare Ornaments', price: 30, currency: 'treasure', icon: '🧜' }
    ];

    let animId = null;
    let particles = [];
    let foodPellets = [];
    let ripples = [];
    let hearts = [];
    let sharkPos = { x: 260, y: 140, vx: 1.4, vy: 0.3, dir: 1, targetX: null, targetY: null };

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function applyGentleDecay(shark) {
        const now = Date.now();
        const elapsedHours = Math.max(0, (now - (shark.lastUpdated || now)) / 3600000);
        if (elapsedHours > 0.05) {
            // Gentle decay: never kills or deletes the pet!
            shark.hunger = clamp(Math.round(shark.hunger - elapsedHours * 2.5), 15, 100);
            shark.cleanliness = clamp(Math.round(shark.cleanliness - elapsedHours * 1.8), 20, 100);
            shark.happiness = clamp(Math.round(shark.happiness - elapsedHours * 2.0), 25, 100);
            shark.energy = clamp(Math.round(shark.energy + (shark.sleeping ? elapsedHours * 15 : -elapsedHours * 1.5)), 15, 100);
            shark.lastUpdated = now;
            BSState.save();
        }
    }

    function openAquarium() {
        const modal = document.getElementById('aquariumModal');
        if (!modal) return;
        modal.classList.remove('hidden');
        const shark = BSState.getActiveShark();
        applyGentleDecay(shark);
        renderAquariumUI();
        startTankAnimation();
    }

    function closeAquarium() {
        const modal = document.getElementById('aquariumModal');
        if (modal) modal.classList.add('hidden');
        if (animId) {
            cancelAnimationFrame(animId);
            animId = null;
        }
    }

    function renderAquariumUI() {
        const state = BSState.data;
        const shark = BSState.getActiveShark();
        const sp = BSState.SHARK_SPECIES[shark.species] || BSState.SHARK_SPECIES.reef;

        document.getElementById('aqCoins').textContent = state.coins;
        document.getElementById('aqTreasure').textContent = state.treasureCoins;
        document.getElementById('aqSharkName').value = shark.name;
        document.getElementById('aqSharkSpecies').textContent = `${sp.name} (${sp.rarity})`;
        document.getElementById('aqSharkPersonality').textContent = shark.personality;
        document.getElementById('aqTankSize').textContent = state.aquarium.tankSize.toUpperCase();

        // Needs bars
        const needs = [
            { id: 'Hunger', val: shark.hunger },
            { id: 'Cleanliness', val: shark.cleanliness },
            { id: 'Happiness', val: shark.happiness },
            { id: 'Health', val: shark.health },
            { id: 'Energy', val: shark.energy }
        ];
        needs.forEach(n => {
            const bar = document.getElementById('aqBar' + n.id);
            const txt = document.getElementById('aqVal' + n.id);
            if (bar) bar.style.width = n.val + '%';
            if (txt) txt.textContent = Math.round(n.val) + '%';
        });

        // Shark selector
        const sel = document.getElementById('aqSharkSelect');
        if (sel) {
            sel.innerHTML = state.sharks.map(s =>
                `<option value="${s.uid}" ${s.uid === shark.uid ? 'selected' : ''}>${s.name} (${(BSState.SHARK_SPECIES[s.species] || {}).name || s.species})</option>`
            ).join('');
        }

        // Sleep button text
        const btnRest = document.getElementById('btnAqRest');
        if (btnRest) {
            btnRest.textContent = shark.sleeping ? '☀️ Wake Up' : '😴 Rest';
        }
    }

    function startTankAnimation() {
        const canvas = document.getElementById('aquariumCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (animId) cancelAnimationFrame(animId);

        function draw() {
            const w = canvas.width;
            const h = canvas.height;
            const state = BSState.data;
            const shark = BSState.getActiveShark();
            const sp = BSState.SHARK_SPECIES[shark.species] || BSState.SHARK_SPECIES.reef;

            // Background gradient
            const bg = state.aquarium.background;
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            if (bg === 'volcanic_trench') {
                grad.addColorStop(0, '#1e1b4b');
                grad.addColorStop(1, '#450a0a');
            } else if (bg === 'shipwreck') {
                grad.addColorStop(0, '#0f172a');
                grad.addColorStop(1, '#1e3a5f');
            } else {
                grad.addColorStop(0, '#0284c7');
                grad.addColorStop(1, '#082f49');
            }
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // Lighting overlay
            const light = state.aquarium.lighting;
            if (light === 'purple') {
                ctx.fillStyle = 'rgba(147, 51, 234, 0.16)';
                ctx.fillRect(0, 0, w, h);
            } else if (light === 'golden') {
                ctx.fillStyle = 'rgba(234, 179, 8, 0.14)';
                ctx.fillRect(0, 0, w, h);
            } else if (light === 'bioluminescent') {
                ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
                ctx.fillRect(0, 0, w, h);
            }

            // Sand floor
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, h - 28, w, 28);

            // Placed decorations
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            (state.aquarium.placedItems || []).forEach(p => {
                const item = AQUARIUM_SHOP_ITEMS.find(i => i.id === p.id);
                if (item) {
                    ctx.fillText(item.icon, (p.x / 100) * w, (p.y / 100) * h);
                }
            });

            // Bubbles
            if (Math.random() < 0.15) {
                particles.push({ x: Math.random() * w, y: h - 20, r: 2 + Math.random() * 4, vy: 0.8 + Math.random() * 1.2 });
            }
            ctx.strokeStyle = 'rgba(186, 230, 253, 0.6)';
            particles = particles.filter(p => p.y > -10);
            particles.forEach(p => {
                p.y -= p.vy;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.stroke();
            });

            // Food pellets
            foodPellets = foodPellets.filter(f => f.y < h - 24);
            foodPellets.forEach(f => {
                f.y += 0.9;
                ctx.fillStyle = '#f97316';
                ctx.beginPath();
                ctx.arc(f.x, f.y, 4, 0, Math.PI * 2);
                ctx.fill();

                const dx = f.x - sharkPos.x;
                const dy = f.y - sharkPos.y;
                if (Math.hypot(dx, dy) < 28) {
                    f.y = h + 100; // eaten
                    hearts.push({ x: sharkPos.x, y: sharkPos.y - 20, life: 40 });
                }
            });

            // Shark movement
            if (!shark.sleeping) {
                if (foodPellets.length > 0) {
                    const target = foodPellets[0];
                    sharkPos.targetX = target.x;
                    sharkPos.targetY = target.y;
                }
                if (sharkPos.targetX !== null) {
                    const dx = sharkPos.targetX - sharkPos.x;
                    const dy = sharkPos.targetY - sharkPos.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 10) {
                        sharkPos.targetX = null;
                        sharkPos.targetY = null;
                    } else {
                        sharkPos.x += (dx / dist) * 2.6;
                        sharkPos.y += (dy / dist) * 2.6;
                        sharkPos.dir = dx >= 0 ? 1 : -1;
                    }
                } else {
                    sharkPos.x += sharkPos.vx * sharkPos.dir;
                    sharkPos.y += Math.sin(Date.now() * 0.003) * 0.35;
                    if (sharkPos.x > w - 60) sharkPos.dir = -1;
                    if (sharkPos.x < 60) sharkPos.dir = 1;
                }
            }

            // Draw Shark
            ctx.save();
            ctx.translate(sharkPos.x, sharkPos.y);
            ctx.scale(sharkPos.dir, 1);
            // Body
            ctx.fillStyle = sp.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, 38, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            // Belly
            ctx.fillStyle = sp.belly;
            ctx.beginPath();
            ctx.ellipse(2, 6, 26, 8, 0, 0, Math.PI);
            ctx.fill();
            // Dorsal Fin
            ctx.fillStyle = sp.color;
            ctx.beginPath();
            ctx.moveTo(-6, -14);
            ctx.lineTo(4, -32);
            ctx.lineTo(14, -13);
            ctx.closePath();
            ctx.fill();
            // Tail
            ctx.beginPath();
            ctx.moveTo(-34, 0);
            ctx.lineTo(-52, -14);
            ctx.lineTo(-46, 0);
            ctx.lineTo(-52, 14);
            ctx.closePath();
            ctx.fill();
            // Eye
            ctx.fillStyle = shark.sleeping ? '#94a3b8' : (shark.customisation?.eyeColor || '#22d3ee');
            ctx.beginPath();
            ctx.arc(22, -4, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            if (shark.sleeping) {
                ctx.fillStyle = '#e0f2fe';
                ctx.font = 'bold 16px sans-serif';
                ctx.fillText('Zzz...', sharkPos.x + 25, sharkPos.y - 25);
            }

            // Ripples
            ripples = ripples.filter(r => r.r < 32);
            ripples.forEach(r => {
                r.r += 1.4;
                ctx.strokeStyle = `rgba(125, 211, 252, ${1 - r.r / 32})`;
                ctx.beginPath();
                ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
                ctx.stroke();
            });

            // Hearts
            hearts = hearts.filter(ht => ht.life > 0);
            hearts.forEach(ht => {
                ht.y -= 0.8;
                ht.life -= 1;
                ctx.font = '16px sans-serif';
                ctx.fillText('❤️', ht.x, ht.y);
            });

            animId = requestAnimationFrame(draw);
        }
        animId = requestAnimationFrame(draw);
    }

    function bindAquariumEvents() {
        const canvas = document.getElementById('aquariumCanvas');
        if (canvas) {
            canvas.addEventListener('click', (e) => {
                const rect = canvas.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
                const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
                ripples.push({ x, y, r: 4 });
                sharkPos.targetX = x;
                sharkPos.targetY = y;
                const shark = BSState.getActiveShark();
                if (Math.hypot(x - sharkPos.x, y - sharkPos.y) < 45) {
                    hearts.push({ x, y: y - 10, life: 45 });
                    shark.happiness = clamp(shark.happiness + 4, 0, 100);
                    BSState.save();
                    renderAquariumUI();
                }
            });
        }

        document.getElementById('btnAqFeed')?.addEventListener('click', () => {
            const shark = BSState.getActiveShark();
            shark.sleeping = false;
            shark.hunger = clamp(shark.hunger + 18, 0, 100);
            shark.happiness = clamp(shark.happiness + 5, 0, 100);
            BSState.addSharkXP(15);
            for (let i = 0; i < 4; i++) {
                foodPellets.push({ x: 80 + Math.random() * 360, y: 15 + Math.random() * 20 });
            }
            renderAquariumUI();
        });

        document.getElementById('btnAqClean')?.addEventListener('click', () => {
            const shark = BSState.getActiveShark();
            shark.cleanliness = clamp(shark.cleanliness + 25, 0, 100);
            shark.happiness = clamp(shark.happiness + 6, 0, 100);
            BSState.addCoins(10);
            BSState.save();
            renderAquariumUI();
        });

        document.getElementById('btnAqPlay')?.addEventListener('click', () => {
            const shark = BSState.getActiveShark();
            shark.sleeping = false;
            shark.happiness = clamp(shark.happiness + 20, 0, 100);
            shark.energy = clamp(shark.energy - 8, 0, 100);
            hearts.push({ x: sharkPos.x, y: sharkPos.y - 20, life: 50 });
            BSState.addSharkXP(20);
            renderAquariumUI();
        });

        document.getElementById('btnAqRest')?.addEventListener('click', () => {
            const shark = BSState.getActiveShark();
            shark.sleeping = !shark.sleeping;
            if (shark.sleeping) {
                shark.energy = clamp(shark.energy + 20, 0, 100);
            }
            BSState.save();
            renderAquariumUI();
        });

        document.getElementById('btnAqHeal')?.addEventListener('click', () => {
            const shark = BSState.getActiveShark();
            shark.health = 100;
            BSState.save();
            renderAquariumUI();
        });

        document.getElementById('aqSharkName')?.addEventListener('change', (e) => {
            const shark = BSState.getActiveShark();
            shark.name = e.target.value.trim() || 'Reef';
            BSState.save();
            renderAquariumUI();
        });

        document.getElementById('aqSharkSelect')?.addEventListener('change', (e) => {
            BSState.data.activeSharkUid = e.target.value;
            BSState.save();
            renderAquariumUI();
        });

        document.getElementById('btnAqWatchAd')?.addEventListener('click', () => {
            BSState.addTreasureCoins(10);
            BSState.addCoins(100);
            alert('🎁 Reward Claimed: +10 Treasure Coins & +100 Gold Coins!');
            renderAquariumUI();
        });

        document.getElementById('btnAqExpand')?.addEventListener('click', () => {
            const aq = BSState.data.aquarium;
            if (aq.tankSize === 'small') {
                if (BSState.data.coins >= 200) {
                    BSState.addCoins(-200);
                    aq.tankSize = 'medium';
                    BSState.save();
                } else {
                    alert('Need 200 Gold Coins to expand to Medium Reef!');
                }
            } else if (aq.tankSize === 'medium') {
                if (BSState.data.treasureCoins >= 15) {
                    BSState.addTreasureCoins(-15);
                    aq.tankSize = 'enormous';
                    BSState.save();
                } else {
                    alert('Need 15 Treasure Coins to expand to Enormous Oceanarium!');
                }
            } else {
                alert('Your Aquarium is already at maximum Enormous Oceanarium size!');
            }
            renderAquariumUI();
        });

        document.getElementById('btnAqDecorate')?.addEventListener('click', () => {
            openAquariumShop();
        });

        document.getElementById('btnCloseAq')?.addEventListener('click', closeAquarium);
        document.getElementById('btnCloseAqShop')?.addEventListener('click', () => {
            document.getElementById('aquariumShopModal')?.classList.add('hidden');
        });
    }

    function openAquariumShop() {
        const modal = document.getElementById('aquariumShopModal');
        const grid = document.getElementById('aqShopGrid');
        if (!modal || !grid) return;
        modal.classList.remove('hidden');

        const state = BSState.data;
        grid.innerHTML = AQUARIUM_SHOP_ITEMS.map(item => {
            const unlocked = state.aquarium.unlockedItems.includes(item.id);
            const priceLabel = item.price === 0 ? 'FREE' : `${item.price} ${item.currency === 'treasure' ? '💎' : '🪙'}`;
            return `
                <div class="upgrade-card">
                    <div class="upg-head"><span>${item.icon} ${item.name}</span><span class="upg-lvl">${item.category}</span></div>
                    <div class="upg-actions">
                        <button class="primary-btn small-btn aq-shop-btn" data-id="${item.id}">
                            ${unlocked ? 'Equip / Place' : 'Buy (' + priceLabel + ')'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.aq-shop-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = AQUARIUM_SHOP_ITEMS.find(i => i.id === btn.dataset.id);
                if (!item) return;
                const unlocked = state.aquarium.unlockedItems.includes(item.id);
                if (!unlocked) {
                    if (item.currency === 'treasure') {
                        if (state.treasureCoins < item.price) return alert('Not enough Treasure Coins!');
                        BSState.addTreasureCoins(-item.price);
                    } else {
                        if (state.coins < item.price) return alert('Not enough Gold Coins!');
                        BSState.addCoins(-item.price);
                    }
                    state.aquarium.unlockedItems.push(item.id);
                }
                if (item.category === 'Backgrounds') state.aquarium.background = item.id;
                else if (item.category === 'Lighting') state.aquarium.lighting = item.id;
                else if (item.category === 'Effects') state.aquarium.effect = item.id;
                else {
                    state.aquarium.placedItems.push({
                        id: item.id,
                        x: 15 + Math.random() * 70,
                        y: item.category === 'Marine Life' || item.category === 'Toys' ? 30 + Math.random() * 35 : 74 + Math.random() * 12
                    });
                }
                BSState.save();
                openAquariumShop();
                renderAquariumUI();
            });
        });
    }

    global.BSAquarium = {
        open: openAquarium,
        close: closeAquarium,
        bindEvents: bindAquariumEvents
    };
})(window);
