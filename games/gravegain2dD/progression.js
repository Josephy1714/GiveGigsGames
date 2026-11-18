(() => {
  const tiers = ['Initiate', 'Adept', 'Expert', 'Master'];
  const statDefs = [
    { stat: 'jump', title: 'Leap', amounts: [20, 32, 46, 64], unit: 'higher jump impulse' },
    { stat: 'wall', title: 'Climb', amounts: [24, 38, 56, 76], unit: 'more wall jump impulse', capstone: 'Unlocks mid-air double jump after wall grip' },
    { stat: 'magnet', title: 'Reach', amounts: [8, 13, 19, 26], unit: 'larger moonshard pickup radius', capstone: 'Pulls nearby upper-route shards automatically' },
    { stat: 'armor', title: 'Ward', amounts: [1, 1, 2, 2], unit: 'hit warded', isHits: true },
    { stat: 'sprint', title: 'Sprint', amounts: [15, 24, 34, 48], unit: 'higher top speed' },
    { stat: 'vault', title: 'Vault', amounts: [18, 28, 40, 56], unit: 'more vault impulse', capstone: 'Vaulting shatters nearby fireballs' },
    { stat: 'grace', title: 'Recovery', amounts: [0.18, 0.29, 0.42, 0.6], unit: 'seconds of extra recovery after a hit' },
    { stat: 'brake', title: 'Control', amounts: [2, 3, 5, 7], unit: 'faster speed changes' }
  ];

  const shop = [
    ['Moonwell', 'armor', 1, 12, 'Start each run with +1 ward', 3],
    ['Tailwind', 'sprint', 15, 10, 'Gain +15 sprint speed per rank', 3],
    ['Fleetstep', 'brake', 3, 10, 'Change pace faster', 3],
    ['Silver Thread', 'magnet', 8, 10, 'Widen pickup reach by +8', 3],
    ['Owl Feather', 'jump', 24, 12, 'Gain +24 jump impulse', 3],
    ['Climber’s Knot', 'wall', 32, 12, 'Gain +32 wall jump impulse', 3],
    ['Vaulting Pin', 'vault', 24, 12, 'Gain +24 vault impulse', 3],
    ['Last Light', 'grace', 0.25, 12, 'Gain +0.25s recovery after hits', 3],
    ['First Pick', 'draft', 1, 16, 'Draft an upgrade at the start', 1],
    ['Grave Tithe', 'payout', 2, 14, 'Earn +2 extra sigils per contract', 3],
    ['Second Heart', 'health', 1, 18, 'Start with +1 extra heart', 2],
    ['Moon Dial', 'experience', 1, 16, 'Reach each draft 1 moonshard sooner', 2]
  ];

  const key = 'gravegain2dD-progression-v2';
  const legacyKey = 'gravegain2dD-progression-v1';
  let profile = { sigils: 0, ranks: {} };

  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && Number.isSafeInteger(saved.sigils) && saved.sigils >= 0 && saved.ranks && typeof saved.ranks === 'object') {
      const ranks = {};
      for (const [, stat, , , , maxRank] of shop) {
        const val = Number(saved.ranks[stat]) || 0;
        if (val > 0) ranks[stat] = Math.min(maxRank, Math.floor(val));
      }
      profile = { sigils: saved.sigils, ranks };
    } else {
      const legacy = JSON.parse(localStorage.getItem(legacyKey));
      if (legacy && Number.isSafeInteger(legacy.sigils) && legacy.sigils >= 0) {
        const ranks = {};
        if (Array.isArray(legacy.owned)) {
          for (const id of legacy.owned) {
            if (shop.some(item => item[1] === id)) ranks[id] = 1;
          }
        }
        profile = { sigils: legacy.sigils, ranks };
      }
    }
  } catch {}

  function save() {
    try { localStorage.setItem(key, JSON.stringify(profile)); } catch {}
  }

  function createBuild() {
    const build = { draftRanks: {}, capstones: {} };
    for (const [, stat, amount] of shop) {
      const rank = profile.ranks[stat] || 0;
      if (rank > 0) build[stat] = amount * rank;
    }
    return build;
  }

  function draft(build) {
    build.draftRanks = build.draftRanks || {};
    build.capstones = build.capstones || {};
    const pool = [...statDefs];
    const choices = [];
    while (choices.length < 3 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      const [def] = pool.splice(idx, 1);
      const currentTier = Math.min(3, build.draftRanks[def.stat] || 0);
      const amount = def.amounts[currentTier];
      const tierName = tiers[currentTier];
      const isMaster = currentTier === 3 && def.capstone && !build.capstones[def.stat];
      const detail = def.isHits
        ? `Block the next ${amount} hit${amount > 1 ? 's' : ''}`
        : `+${amount} ${def.unit}${isMaster ? ` · Capstone: ${def.capstone}` : ''}`;

      choices.push({
        name: `${def.title} · ${tierName}`,
        stat: def.stat,
        amount,
        detail,
        apply() {
          build[def.stat] = (build[def.stat] || 0) + amount;
          build.draftRanks[def.stat] = Math.min(3, (build.draftRanks[def.stat] || 0) + 1);
          if (currentTier === 3 && def.capstone) {
            build.capstones[def.stat] = true;
          }
        }
      });
    }
    return choices;
  }

  function award(distance, contracts, build, bonusSigils = 0) {
    const reward = Math.floor(distance / 210) + contracts * (3 + (build.payout || 0)) + bonusSigils;
    profile.sigils += reward;
    save();
    return reward;
  }

  function renderShop(container) {
    container.replaceChildren();
    const heading = document.createElement('h2');
    heading.textContent = `Permanent upgrades · ${profile.sigils} sigils`;
    container.append(heading);

    for (const [name, stat, , baseCost, detail, maxRank] of shop) {
      const rank = profile.ranks[stat] || 0;
      const maxed = rank >= maxRank;
      const cost = baseCost + rank * Math.round(baseCost * 0.65);
      const button = document.createElement('button');
      button.disabled = maxed || profile.sigils < cost;
      const rankLabel = maxRank > 1 ? ` (${rank}/${maxRank})` : '';
      button.textContent = `${name}${rankLabel} · ${maxed ? 'Maxed' : cost + ' sigils'}`;
      button.title = detail;
      button.setAttribute('aria-label', `${button.textContent}. ${detail}`);
      button.addEventListener('click', () => {
        if (maxed || profile.sigils < cost) return;
        profile.sigils -= cost;
        profile.ranks[stat] = rank + 1;
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
