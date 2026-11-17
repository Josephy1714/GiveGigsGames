// Fridge Simulator - Full Game Engine
// Manage fridges across countries, feed families, balance nutrition

// ===== STARFIELD BACKGROUND =====
(function initStarfield() {
    const canvas = document.getElementById('TEMPLATE-4weird-starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let stars = [];
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        stars = [];
        const count = Math.floor((canvas.width * canvas.height) / 4000);
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.8 + 0.2,
                twinkleSpeed: Math.random() * 0.02 + 0.01,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }
    }
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(s => {
            s.twinklePhase += s.twinkleSpeed;
            const alpha = s.opacity * (Math.sin(s.twinklePhase) * 0.3 + 0.7);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.fill();
        });
        const g = ctx.createRadialGradient(canvas.width*0.3, canvas.height*0.3, 0, canvas.width*0.3, canvas.height*0.3, canvas.width*0.6);
        g.addColorStop(0, 'rgba(139,92,246,0.08)');
        g.addColorStop(0.5, 'rgba(16,185,129,0.05)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(draw);
    }
    window.addEventListener('resize', resize, { passive: true });
    resize();
    draw();
})();

// Food categorizations are defined directly in FOOD_STATS

const HUMAN_EMOJIS = [
    '👶', '🧒', '👦', '👧', '🧑', '👨', '👩', '🧓', '👴', '👵',
    '👨‍🦰', '👩‍🦰', '👨‍🦱', '👩‍🦱', '👨‍🦲', '👩‍🦲', '👨‍🦳', '👩‍🦳',
    '👨🏻', '👩🏻', '👨🏼', '👩🏼', '👨🏽', '👩🏽', '👨🏾', '👩🏾', '👨🏿', '👩🏿',
    '👮', '👨‍🌾', '👩‍🍳', '👨‍⚕️', '👩‍⚕️', '🧑‍🏫', '👷', '👨‍💻', '👩‍💻', '🕵️',
    '🧕', '👳', '🧔', '👲', '🙍', '🙎', '🤰', '🤱', '🧑‍🤝‍🧑', '👨‍👩‍👧‍👦'
];

const COUNTRIES = {
    usa: {
        name: 'USA 🇺🇸',
        familySize: 4,
        budget: 300,
        preferences: ['🍔', '🍕', '🌭', '🍟', '🍩'],
        unlockDay: 1
    },
    japan: {
        name: 'Japan 🇯🇵',
        familySize: 3,
        budget: 250,
        preferences: ['🍣', '🍜', '🍚', '🍡', '🍱'],
        unlockDay: 3
    },
    india: {
        name: 'India 🇮🇳',
        familySize: 5,
        budget: 200,
        preferences: ['🍛', '🫓', '🥟', '🫘', '🍵'],
        unlockDay: 5
    },
    mexico: {
        name: 'Mexico 🇲🇽',
        familySize: 4,
        budget: 280,
        preferences: ['🌮', '🌯', '🫔', '🌶️', '🥑'],
        unlockDay: 7
    },
    italy: {
        name: 'Italy 🇮🇹',
        familySize: 3,
        budget: 320,
        preferences: ['🍝', '🍕', '🧀', '🍷', '🫒'],
        unlockDay: 9
    }
};

const SHOPS = {
    grocery: { name: '🏪 Grocery Store', multiplier: 1.0, stock: 'all', reliability: 1.0 },
    pantry: { name: '🥫 Food Pantry', multiplier: 0.5, stock: 'random', reliability: 0.7 },
    charity: { name: '🎗️ Charity', multiplier: 0.0, stock: 'random', reliability: 0.4 },
    dumpster: { name: '🗑️ Dumpster', multiplier: 0.0, stock: 'random', reliability: 0.3, spoilage: 0.5 },
    wholesale: { name: '📦 Wholesaler', multiplier: 0.7, stock: 'all', reliability: 0.8, bulk: true }
};

const FOOD_PRICES = {
    '🍗': 3, '🥩': 4, '🍖': 3.5, '🐟': 5, '🥚': 2, '🫘': 1.5, '🧀': 3, '🥜': 2,
    '🍞': 2, '🍚': 1.5, '🍝': 2, '🥔': 1, '🌽': 1.5, '🥖': 2.5, '🥯': 2,
    '🍎': 1, '🍌': 0.8, '🍇': 2, '🍓': 2.5, '🍊': 1.2, '🍉': 3, '🍑': 1.5,
    '🥦': 1.5, '🥕': 1, '🥬': 1.5, '🍅': 1.2, '🥒': 1, '🧅': 0.8, '🧄': 0.5,
    '🥛': 2, '🧈': 3, '🥥': 2, '🫒': 4, '🥑': 1.5,
    // DS-FRIDGE-01: full emoji pantry, appended inline (existing lines untouched).
    '🍈': 3, '🍋': 1, '🍍': 2.5, '🥭': 2, '🍏': 1, '🍐': 1.2,
    '🍒': 2.5, '🫐': 3, '🥝': 1.5, '🍄': 1.5, '🍆': 1.5, '🌶': 1,
    '🌶️': 1, '🫑': 1.2, '🌰': 2, '🫚': 1.5, '🫛': 1.2, '🫜': 1,
    '🥐': 2.5, '🫓': 2, '🥨': 2, '🥞': 3, '🧇': 3, '🥓': 3.5,
    '🍔': 5, '🍟': 2.5, '🍕': 4, '🌭': 3.5, '🥪': 3.5, '🌮': 3.5,
    '🌯': 4.5, '🫔': 3, '🥙': 4, '🧆': 3, '🍳': 2.5, '🥘': 6,
    '🍲': 5, '🫕': 5, '🥣': 3, '🥗': 3.5, '🍿': 2, '🧂': 0.5,
    '🥫': 2, '🍱': 6, '🍘': 1.5, '🍙': 2, '🍛': 4, '🍜': 4.5,
    '🍠': 2, '🍢': 3.5, '🍣': 5, '🍤': 4, '🍥': 3, '🥮': 3.5,
    '🍡': 2.5, '🥟': 3, '🥠': 1.5, '🥡': 4.5, '🦀': 6, '🦞': 8,
    '🦐': 5, '🦑': 5, '🦪': 4, '🍦': 2.5, '🍧': 2, '🍨': 3,
    '🍩': 2.5, '🍪': 2, '🎂': 8, '🍰': 4, '🧁': 3, '🥧': 3.5,
    '🍫': 2.5, '🍬': 1.5, '🍭': 1.5, '🍮': 3, '🍯': 3, '🍼': 2,
    '☕': 2, '🫖': 3, '🍵': 1.5, '🍶': 4, '🍾': 10, '🍷': 5,
    '🍸': 5, '🍹': 4.5, '🍺': 3.5, '🍻': 6, '🥂': 7, '🥃': 5,
    '🥤': 2, '🧋': 3.5, '🧃': 1.5, '🧉': 2.5,
    '🐙': 5, '🫙': 2.5, '🐡': 7, '🧊': 0.5
};

// ASCII-safe aliases: bare vs VS16 pepper and bare vs ZWJ mushroom are one food.
FOOD_PRICES['\u{1F336}'] = FOOD_PRICES['\u{1F336}\uFE0F'] || FOOD_PRICES['\u{1F336}'] || 1;

FOOD_PRICES['\u{1F336}\uFE0F'] = FOOD_PRICES['\u{1F336}'];

FOOD_PRICES['\u{1F344}\u200D'] = FOOD_PRICES['\u{1F344}'];

const CATEGORY_COLORS = ['#ef4444', '#f59e0b', '#10b981'];

const CATEGORY_LABELS = ['Pro', 'Carb', 'Vit'];

const FOOD_STATS = {
    // Proteins
    '🍗': { name: 'Chicken', hunger: 50, nutrition: [50, 0, 0] },
    '🥩': { name: 'Steak', hunger: 70, nutrition: [60, 0, 0] },
    '🍖': { name: 'Ribs', hunger: 60, nutrition: [50, 0, 0] },
    '🐟': { name: 'Fish', hunger: 45, nutrition: [50, 0, 0] },
    '🥚': { name: 'Egg', hunger: 30, nutrition: [30, 0, 0] },
    '🫘': { name: 'Beans', hunger: 40, nutrition: [30, 20, 0] },
    '🧀': { name: 'Cheese', hunger: 35, nutrition: [40, 0, 0] },
    '🥜': { name: 'Peanuts', hunger: 25, nutrition: [25, 10, 0] },

    // Carbs
    '🍞': { name: 'Bread', hunger: 40, nutrition: [10, 50, 0] },
    '🍚': { name: 'Rice', hunger: 35, nutrition: [0, 50, 0] },
    '🍝': { name: 'Pasta', hunger: 55, nutrition: [10, 60, 0] },
    '🥔': { name: 'Potato', hunger: 40, nutrition: [0, 30, 15] },
    '🌽': { name: 'Corn', hunger: 30, nutrition: [0, 30, 15] },
    '🥖': { name: 'Baguette', hunger: 45, nutrition: [10, 50, 0] },
    '🥯': { name: 'Bagel', hunger: 40, nutrition: [10, 50, 0] },

    // Fruits
    '🍎': { name: 'Apple', hunger: 20, nutrition: [0, 10, 40] },
    '🍌': { name: 'Banana', hunger: 30, nutrition: [0, 20, 40] },
    '🍇': { name: 'Grapes', hunger: 20, nutrition: [0, 10, 40] },
    '🍓': { name: 'Strawberry', hunger: 15, nutrition: [0, 5, 40] },
    '🍊': { name: 'Orange', hunger: 20, nutrition: [0, 5, 45] },
    '🍉': { name: 'Watermelon', hunger: 25, nutrition: [0, 5, 30] },
    '🍑': { name: 'Peach', hunger: 20, nutrition: [0, 10, 40] },

    // Vegetables
    '🥦': { name: 'Broccoli', hunger: 20, nutrition: [10, 0, 45] },
    '🥕': { name: 'Carrot', hunger: 15, nutrition: [0, 10, 40] },
    '🥬': { name: 'Lettuce', hunger: 10, nutrition: [0, 0, 30] },
    '🍅': { name: 'Tomato', hunger: 15, nutrition: [0, 5, 35] },
    '🥒': { name: 'Cucumber', hunger: 10, nutrition: [0, 0, 30] },
    '🧅': { name: 'Onion', hunger: 10, nutrition: [0, 5, 25] },
    '🧄': { name: 'Garlic', hunger: 5, nutrition: [0, 0, 20] },

    // Dairy / Fats
    '🥛': { name: 'Milk', hunger: 25, nutrition: [20, 0, 30] },
    '🧈': { name: 'Butter', hunger: 20, nutrition: [15, 0, 15] },
    '🥥': { name: 'Coconut', hunger: 30, nutrition: [10, 10, 30] },
    '🫒': { name: 'Olive', hunger: 15, nutrition: [0, 0, 30] },
    '🥑': { name: 'Avocado', hunger: 25, nutrition: [10, 0, 40] },

    // DS-FRIDGE-01: full emoji pantry, appended inline (existing lines untouched).
    // Fruits
    '🍈': { name: 'Melon', hunger: 30, nutrition: [0, 10, 40] },
    '🍋': { name: 'Lemon', hunger: 10, nutrition: [0, 0, 35] },
    '🍍': { name: 'Pineapple', hunger: 25, nutrition: [0, 10, 40] },
    '🥭': { name: 'Mango', hunger: 25, nutrition: [0, 10, 40] },
    '🍏': { name: 'Green Apple', hunger: 20, nutrition: [0, 10, 40] },
    '🍐': { name: 'Pear', hunger: 20, nutrition: [0, 10, 40] },
    '🍒': { name: 'Cherries', hunger: 15, nutrition: [0, 5, 40] },
    '🫐': { name: 'Blueberries', hunger: 15, nutrition: [0, 5, 45] },
    '🥝': { name: 'Kiwi', hunger: 15, nutrition: [0, 5, 40] },
    // Vegetables / fungi / legumes
    '🍄': { name: 'Mushroom', hunger: 15, nutrition: [5, 0, 30] },
    '🍆': { name: 'Eggplant', hunger: 15, nutrition: [0, 5, 30] },
    '🌶': { name: 'Hot Pepper', hunger: 10, nutrition: [0, 0, 35] },
    '🌶️': { name: 'Hot Pepper', hunger: 10, nutrition: [0, 0, 35] },
    '🫑': { name: 'Bell Pepper', hunger: 15, nutrition: [0, 5, 35] },
    '🌰': { name: 'Chestnut', hunger: 20, nutrition: [5, 20, 10] },
    '🫚': { name: 'Ginger', hunger: 5, nutrition: [0, 0, 25] },
    '🫛': { name: 'Pea Pod', hunger: 15, nutrition: [5, 10, 25] },
    '🫜': { name: 'Root Vegetable', hunger: 25, nutrition: [0, 20, 20] },
    // Bakery
    '🥐': { name: 'Croissant', hunger: 40, nutrition: [10, 45, 0] },
    '🫓': { name: 'Flatbread', hunger: 40, nutrition: [10, 50, 0] },
    '🥨': { name: 'Pretzel', hunger: 30, nutrition: [5, 40, 0] },
    '🥞': { name: 'Pancakes', hunger: 50, nutrition: [10, 55, 0] },
    '🧇': { name: 'Waffle', hunger: 50, nutrition: [10, 55, 0] },
    // Meats / fast food
    '🥓': { name: 'Bacon', hunger: 45, nutrition: [45, 0, 0] },
    '🍔': { name: 'Hamburger', hunger: 70, nutrition: [30, 40, 0] },
    '🍟': { name: 'Fries', hunger: 45, nutrition: [5, 50, 0] },
    '🍕': { name: 'Pizza', hunger: 65, nutrition: [20, 45, 0] },
    '🌭': { name: 'Hot Dog', hunger: 55, nutrition: [25, 40, 0] },
    '🥪': { name: 'Sandwich', hunger: 55, nutrition: [25, 40, 5] },
    '🌮': { name: 'Taco', hunger: 55, nutrition: [25, 35, 10] },
    '🌯': { name: 'Burrito', hunger: 65, nutrition: [25, 45, 5] },
    '🫔': { name: 'Tamale', hunger: 50, nutrition: [15, 45, 5] },
    '🥙': { name: 'Stuffed Flatbread', hunger: 55, nutrition: [20, 40, 10] },
    '🧆': { name: 'Falafel', hunger: 40, nutrition: [20, 30, 10] },
    // Cooked dishes / pantry
    '🍳': { name: 'Fried Egg', hunger: 35, nutrition: [30, 0, 5] },
    '🥘': { name: 'Paella', hunger: 70, nutrition: [30, 40, 10] },
    '🍲': { name: 'Stew Pot', hunger: 65, nutrition: [30, 30, 15] },
    '🫕': { name: 'Fondue', hunger: 50, nutrition: [35, 20, 5] },
    '🥣': { name: 'Soup Bowl', hunger: 40, nutrition: [15, 25, 15] },
    '🥗': { name: 'Green Salad', hunger: 25, nutrition: [5, 5, 50] },
    '🍿': { name: 'Popcorn', hunger: 25, nutrition: [5, 35, 0] },
    '🧂': { name: 'Salt', hunger: 5, nutrition: [0, 0, 5] },
    '🥫': { name: 'Canned Food', hunger: 40, nutrition: [20, 25, 10] },
    '🍱': { name: 'Bento Box', hunger: 70, nutrition: [30, 35, 20] },
    '🍘': { name: 'Rice Cracker', hunger: 20, nutrition: [0, 30, 5] },
    '🍙': { name: 'Rice Ball', hunger: 35, nutrition: [5, 45, 0] },
    '🍛': { name: 'Curry Rice', hunger: 60, nutrition: [15, 50, 10] },
    '🍜': { name: 'Ramen', hunger: 60, nutrition: [20, 45, 10] },
    '🍠': { name: 'Sweet Potato', hunger: 40, nutrition: [0, 30, 25] },
    '🍢': { name: 'Oden Skewers', hunger: 45, nutrition: [30, 15, 10] },
    '🍣': { name: 'Sushi', hunger: 50, nutrition: [35, 25, 10] },
    '🍤': { name: 'Fried Shrimp', hunger: 45, nutrition: [35, 20, 5] },
    '🍥': { name: 'Fish Cake', hunger: 35, nutrition: [30, 20, 5] },
    '🥮': { name: 'Moon Cake', hunger: 40, nutrition: [10, 45, 5] },
    '🍡': { name: 'Dango', hunger: 30, nutrition: [5, 40, 5] },
    '🥟': { name: 'Dumpling', hunger: 45, nutrition: [20, 35, 5] },
    '🥠': { name: 'Fortune Cookie', hunger: 20, nutrition: [5, 30, 0] },
    '🥡': { name: 'Takeout Box', hunger: 60, nutrition: [25, 40, 10] },
    // Seafood
    '🦀': { name: 'Crab', hunger: 55, nutrition: [50, 0, 10] },
    '🦞': { name: 'Lobster', hunger: 60, nutrition: [55, 0, 10] },
    '🦐': { name: 'Shrimp', hunger: 45, nutrition: [45, 5, 5] },
    '🦑': { name: 'Squid', hunger: 45, nutrition: [45, 5, 5] },
    '🦪': { name: 'Oyster', hunger: 30, nutrition: [35, 5, 15] },
    // Sweets
    '🍦': { name: 'Soft Ice Cream', hunger: 30, nutrition: [5, 35, 5] },
    '🍧': { name: 'Shaved Ice', hunger: 20, nutrition: [0, 25, 10] },
    '🍨': { name: 'Ice Cream', hunger: 35, nutrition: [5, 40, 5] },
    '🍩': { name: 'Doughnut', hunger: 40, nutrition: [5, 50, 0] },
    '🍪': { name: 'Cookie', hunger: 30, nutrition: [5, 40, 0] },
    '🎂': { name: 'Birthday Cake', hunger: 70, nutrition: [10, 60, 5] },
    '🍰': { name: 'Shortcake', hunger: 45, nutrition: [5, 50, 5] },
    '🧁': { name: 'Cupcake', hunger: 40, nutrition: [5, 50, 0] },
    '🥧': { name: 'Pie', hunger: 50, nutrition: [5, 50, 5] },
    '🍫': { name: 'Chocolate', hunger: 35, nutrition: [5, 40, 10] },
    '🍬': { name: 'Candy', hunger: 20, nutrition: [0, 35, 0] },
    '🍭': { name: 'Lollipop', hunger: 20, nutrition: [0, 35, 0] },
    '🍮': { name: 'Custard', hunger: 35, nutrition: [10, 35, 10] },
    '🍯': { name: 'Honey', hunger: 30, nutrition: [0, 40, 5] },
    // Drinks
    '🍼': { name: 'Baby Bottle', hunger: 25, nutrition: [15, 15, 15] },
    '☕': { name: 'Coffee', hunger: 10, nutrition: [0, 5, 5] },
    '🫖': { name: 'Teapot', hunger: 10, nutrition: [0, 0, 20] },
    '🍵': { name: 'Tea', hunger: 10, nutrition: [0, 0, 25] },
    '🍶': { name: 'Sake', hunger: 10, nutrition: [0, 10, 0] },
    '🍾': { name: 'Champagne', hunger: 10, nutrition: [0, 10, 5] },
    '🍷': { name: 'Wine', hunger: 10, nutrition: [0, 5, 10] },
    '🍸': { name: 'Cocktail', hunger: 15, nutrition: [0, 15, 5] },
    '🍹': { name: 'Tropical Drink', hunger: 20, nutrition: [0, 20, 15] },
    '🍺': { name: 'Beer', hunger: 15, nutrition: [0, 15, 0] },
    '🍻': { name: 'Beers', hunger: 25, nutrition: [0, 25, 0] },
    '🥂': { name: 'Champagne Toast', hunger: 15, nutrition: [0, 15, 5] },
    '🥃': { name: 'Whisky', hunger: 10, nutrition: [0, 5, 0] },
    '🥤': { name: 'Soda Cup', hunger: 15, nutrition: [0, 30, 0] },
    '🧋': { name: 'Bubble Tea', hunger: 25, nutrition: [5, 35, 5] },
    '🧃': { name: 'Juice Box', hunger: 15, nutrition: [0, 20, 20] },
    '🧉': { name: 'Mate', hunger: 10, nutrition: [0, 0, 20] },
    // DS-FRIDGE-01: verifier-catalog extras (verify-fridge.mjs inline list).
    '🐙': { name: 'Octopus', hunger: 50, nutrition: [50, 0, 10] },
    '🫙': { name: 'Preserves Jar', hunger: 30, nutrition: [5, 20, 20] },
    '🐡': { name: 'Blowfish', hunger: 55, nutrition: [50, 0, 15] },
    '🧊': { name: 'Ice', hunger: 5, nutrition: [0, 0, 5] }
};

// ASCII-safe aliases: bare vs VS16 pepper and bare vs ZWJ mushroom are one food.
FOOD_STATS['\u{1F336}'] = FOOD_STATS['\u{1F336}\uFE0F'] || FOOD_STATS['\u{1F336}'];

FOOD_STATS['\u{1F336}\uFE0F'] = FOOD_STATS['\u{1F336}'];

FOOD_STATS['\u{1F344}\u200D'] = FOOD_STATS['\u{1F344}'];

let gameRunning = false;

let gamePaused = false;

let day = 1;

let money = 1000;

let deaths = 0;

let maxCombo = 0;

let feedStreak = 0;

let lastTime = 0;

// DS-FRIDGE-01: localStorage autosave slot (server/cloud panel reads via FridgeCloudSave).
const FRIDGE_SAVE_KEY = 'fridge-sim-save';

let inventory = {};

let countries = {};

let currentShop = 'grocery';

let selectedFood = null;

let selectedSlot = null;
 // { countryKey, slot } — picked-up fridge item for tap-to-move
let shopStocks = {};

let mobileView = 'fridges';

let shelfIndex = 0;

// Cloud-save hooks for the v2 panel (DS-FRIDGE-02 mounts): serialize() hands the
// panel plain JSON, load(data) resumes it. No network calls from this bundle.
window.FridgeCloudSave = {
    serialize() { return collectSaveData(); },
    load(data) {
        const ok = restoreSaveData(data);
        if (!ok) return false;
        gameRunning = true;
        gamePaused = false;
        selectedFood = null;
        generateShopStocks();
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('victoryScreen').classList.add('hidden');
        render();
        persistSave();
        return true;
    }
};

let audioCtx = null;

let soundMuted = false;

window.addEventListener('pointerdown', () => { if (!soundMuted) initAudio(); }, { once: true });

window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SET_GAME_SPEED') {
        const spd = parseFloat(e.data.speed);
        if (!isNaN(spd) && spd > 0) window.gameSpeedMultiplier = spd;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnStart').addEventListener('click', startGame);
    document.getElementById('btnNextDay').addEventListener('click', nextDay);
    document.getElementById('btnRestart').addEventListener('click', startGame);
    document.getElementById('btnPlayAgain').addEventListener('click', startGame);

    const soundBtn = document.getElementById('btnSoundToggle');
    if (soundBtn) {
        soundBtn.addEventListener('click', toggleSound);
    }

    const quickStockBtn = document.getElementById('btnQuickStock');
    if (quickStockBtn) {
        quickStockBtn.addEventListener('click', autoStockFridges);
    }

    const pauseBtn = document.getElementById('btnPause');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', togglePause);
    }

    document.addEventListener('keydown', (e) => {
        if (e.repeat || e.target.closest?.('button,input,select,textarea,[role="button"]')) return;
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            if (gameRunning) togglePause();
        }
        if (e.key === 'm' || e.key === 'M') {
            toggleSound();
        }
        // Next Day keyboard shortcuts
        if ((e.key === ' ' || e.key === 'n' || e.key === 'N') && gameRunning && !gamePaused) {
            if (e.key === ' ') e.preventDefault();
            nextDay();
        }
    });

    document.querySelectorAll('.shop-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentShop = e.target.dataset.source;
            if (gameRunning) render();
        });
    });

    initMobileControls();

    // DS-FRIDGE-01: autoload — resume the autosave on start (fresh start screen if none).
    try {
        const raw = localStorage.getItem(FRIDGE_SAVE_KEY);
        if (raw && window.FridgeCloudSave.load(JSON.parse(raw))) {
            showToast('💾 Save resumed — welcome back, chef!', '#00f2fe');
        }
    } catch (e) { /* no usable save — stay on the start screen */ }
});

// ===== DEVELOPER DEBUGGING API =====
window.gameDebug = {
    name: "Fridge Simulator",
    getScore: () => money,
    setScore: (m) => { money = m; render(); },
    getHealth: () => deaths,
    setHealth: (d) => { deaths = d; render(); },
    win: () => {
        day = 30;
        Object.values(countries).forEach(c => {
            c.family = c.family.map(() => HUMAN_EMOJIS[0]);
            c.hunger = c.hunger.map(() => 100);
            c.nutrition = c.nutrition.map(() => [100, 100, 100]);
        });
        nextDay();
    },
    lose: () => {
        Object.values(countries).forEach(c => {
            c.family = c.family.map(() => '💀');
            c.hunger = c.hunger.map(() => 0);
        });
        nextDay();
    },
    godMode: false,
    toggleGodMode: function() {
        this.godMode = !this.godMode;
        return this.godMode;
    }
};


