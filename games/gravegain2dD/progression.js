(() => {
  const cards = [
  {
    "name": "Leap · Initiate",
    "stat": "jump",
    "amount": 20,
    "detail": "+20 higher jump impulse"
  },
  {
    "name": "Leap · Adept",
    "stat": "jump",
    "amount": 32,
    "detail": "+32 higher jump impulse"
  },
  {
    "name": "Leap · Expert",
    "stat": "jump",
    "amount": 46,
    "detail": "+46 higher jump impulse"
  },
  {
    "name": "Leap · Master",
    "stat": "jump",
    "amount": 64,
    "detail": "+64 higher jump impulse"
  },
  {
    "name": "Climb · Initiate",
    "stat": "wall",
    "amount": 24,
    "detail": "+24 more wall jump impulse"
  },
  {
    "name": "Climb · Adept",
    "stat": "wall",
    "amount": 38,
    "detail": "+38 more wall jump impulse"
  },
  {
    "name": "Climb · Expert",
    "stat": "wall",
    "amount": 56,
    "detail": "+56 more wall jump impulse"
  },
  {
    "name": "Climb · Master",
    "stat": "wall",
    "amount": 76,
    "detail": "+76 more wall jump impulse"
  },
  {
    "name": "Reach · Initiate",
    "stat": "magnet",
    "amount": 8,
    "detail": "+8 larger moonshard pickup radius"
  },
  {
    "name": "Reach · Adept",
    "stat": "magnet",
    "amount": 13,
    "detail": "+13 larger moonshard pickup radius"
  },
  {
    "name": "Reach · Expert",
    "stat": "magnet",
    "amount": 19,
    "detail": "+19 larger moonshard pickup radius"
  },
  {
    "name": "Reach · Master",
    "stat": "magnet",
    "amount": 26,
    "detail": "+26 larger moonshard pickup radius"
  },
  {
    "name": "Ward · Initiate",
    "stat": "armor",
    "amount": 1,
    "detail": "Block the next 1 hit"
  },
  {
    "name": "Ward · Adept",
    "stat": "armor",
    "amount": 1,
    "detail": "Block the next 1 hit"
  },
  {
    "name": "Ward · Expert",
    "stat": "armor",
    "amount": 2,
    "detail": "Block the next 2 hits"
  },
  {
    "name": "Ward · Master",
    "stat": "armor",
    "amount": 2,
    "detail": "Block the next 2 hits"
  },
  {
    "name": "Sprint · Initiate",
    "stat": "sprint",
    "amount": 15,
    "detail": "+15 higher top speed"
  },
  {
    "name": "Sprint · Adept",
    "stat": "sprint",
    "amount": 24,
    "detail": "+24 higher top speed"
  },
  {
    "name": "Sprint · Expert",
    "stat": "sprint",
    "amount": 34,
    "detail": "+34 higher top speed"
  },
  {
    "name": "Sprint · Master",
    "stat": "sprint",
    "amount": 48,
    "detail": "+48 higher top speed"
  },
  {
    "name": "Vault · Initiate",
    "stat": "vault",
    "amount": 18,
    "detail": "+18 more vault impulse"
  },
  {
    "name": "Vault · Adept",
    "stat": "vault",
    "amount": 28,
    "detail": "+28 more vault impulse"
  },
  {
    "name": "Vault · Expert",
    "stat": "vault",
    "amount": 40,
    "detail": "+40 more vault impulse"
  },
  {
    "name": "Vault · Master",
    "stat": "vault",
    "amount": 56,
    "detail": "+56 more vault impulse"
  },
  {
    "name": "Recovery · Initiate",
    "stat": "grace",
    "amount": 0.18,
    "detail": "+0.18 seconds of extra recovery after a hit"
  },
  {
    "name": "Recovery · Adept",
    "stat": "grace",
    "amount": 0.29,
    "detail": "+0.29 seconds of extra recovery after a hit"
  },
  {
    "name": "Recovery · Expert",
    "stat": "grace",
    "amount": 0.42,
    "detail": "+0.42 seconds of extra recovery after a hit"
  },
  {
    "name": "Recovery · Master",
    "stat": "grace",
    "amount": 0.6,
    "detail": "+0.6 seconds of extra recovery after a hit"
  },
  {
    "name": "Control · Initiate",
    "stat": "brake",
    "amount": 2,
    "detail": "+2 faster speed changes"
  },
  {
    "name": "Control · Adept",
    "stat": "brake",
    "amount": 3,
    "detail": "+3 faster speed changes"
  },
  {
    "name": "Control · Expert",
    "stat": "brake",
    "amount": 5,
    "detail": "+5 faster speed changes"
  },
  {
    "name": "Control · Master",
    "stat": "brake",
    "amount": 7,
    "detail": "+7 faster speed changes"
  }
];
  const shop = [
  [
    "Moonwell",
    "armor",
    1,
    12,
    "Start each run with a ward"
  ],
  [
    "Tailwind",
    "sprint",
    15,
    12,
    "Gain 15 sprint speed"
  ],
  [
    "Fleetstep",
    "brake",
    3,
    10,
    "Change pace faster"
  ],
  [
    "Silver Thread",
    "magnet",
    8,
    10,
    "Widen pickup reach by 8"
  ],
  [
    "Owl Feather",
    "jump",
    24,
    14,
    "Gain 24 jump impulse"
  ],
  [
    "Climber’s Knot",
    "wall",
    32,
    14,
    "Gain 32 wall jump impulse"
  ],
  [
    "Vaulting Pin",
    "vault",
    24,
    14,
    "Gain 24 vault impulse"
  ],
  [
    "Last Light",
    "grace",
    0.25,
    14,
    "Gain 0.25 seconds of recovery after hits"
  ],
  [
    "First Pick",
    "draft",
    1,
    16,
    "Draft an upgrade at the start"
  ],
  [
    "Grave Tithe",
    "payout",
    2,
    16,
    "Earn 2 extra sigils per completed contract"
  ],
  [
    "Second Heart",
    "health",
    1,
    20,
    "Start with one extra heart"
  ],
  [
    "Moon Dial",
    "experience",
    1,
    18,
    "Reach each draft one moonshard sooner"
  ]
];
  const key = 'gravegain2dD-progression-v1';
  let profile = { sigils: 0, owned: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && Number.isSafeInteger(saved.sigils) && saved.sigils >= 0 && Array.isArray(saved.owned)) {
      profile = { sigils: saved.sigils, owned: [...new Set(saved.owned.filter(id => shop.some(item => item[1] === id)))] };
    }
  } catch {}
  function save() {
    try { localStorage.setItem(key, JSON.stringify(profile)); } catch {}
  }
  function createBuild() {
    const build = {};
    for (const [, stat, amount] of shop) {
      if (profile.owned.includes(stat)) build[stat] = amount;
    }
    return build;
  }
  function draft(build) {
    const available = [...cards];
    const choices = [];
    while (choices.length < 3) {
      const index = Math.floor(Math.random() * available.length);
      const [card] = available.splice(index, 1);
      if (choices.some(choice => choice.stat === card.stat)) continue;
      choices.push(card);
    }
    return choices.map(card => ({
      ...card,
      apply() { build[card.stat] = (build[card.stat] || 0) + card.amount; }
    }));
  }
  function award(distance, contracts, build) {
    const reward = Math.floor(distance / 230) + contracts * (3 + (build.payout || 0));
    profile.sigils += reward;
    save();
    return reward;
  }
  function renderShop(container) {
    container.replaceChildren();
    const heading = document.createElement('h2');
    heading.textContent = `Permanent upgrades · ${profile.sigils} sigils`;
    container.append(heading);
    for (const [name, stat, , cost, detail] of shop) {
      const button = document.createElement('button');
      const owned = profile.owned.includes(stat);
      button.disabled = owned || profile.sigils < cost;
      button.textContent = `${name} · ${owned ? 'Owned' : cost + ' sigils'}`;
      button.title = detail;
      button.setAttribute('aria-label', `${button.textContent}. ${detail}`);
      button.addEventListener('click', () => {
        if (profile.sigils < cost || profile.owned.includes(stat)) return;
        profile.sigils -= cost;
        profile.owned.push(stat);
        save();
        renderShop(container);
      });
      const row = document.createElement('div');
      const description = document.createElement('span');
      description.textContent = detail;
      row.append(button, description);
      container.append(row);
    }
  }
  window.GraveGainProgression = { createBuild, draft, award, renderShop };
})();
