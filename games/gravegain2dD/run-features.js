(() => {
  // Each ledge is [offset, span, height, kind, sign]. Overlaps let
  // players climb on a jump or drop to a parallel route at different speeds.
  const routes = [
    {
      theme: 'castle',
      ledges: [
        [0, 170, 54, 'shelf', 'Watchtower stairs'],
        [130, 178, 110, 'main'], [273, 170, 173, 'launch'],
        [402, 215, 224, 'main'], [592, 202, 248, 'main'],
        [746, 230, 175, 'main'], [938, 230, 110, 'shelf', '↓ Road'],
        [403, 319, 354, 'summit'], [658, 232, 414, 'summit'],
        [875, 192, 476, 'summit', 'Watchtower cache'],
        [1032, 205, 349, 'summit'], [1204, 184, 194, 'main'],
        [427, 202, 105, 'shelf'], [610, 215, 68, 'shelf']
      ]
    },
    {
      theme: 'cave',
      ledges: [
        [0, 172, 58, 'shelf', 'Hollowroot cavern'],
        [134, 181, 120, 'main'], [274, 181, 182, 'main'],
        [414, 200, 247, 'launch'], [577, 195, 293, 'main'],
        [737, 239, 249, 'main'], [935, 236, 162, 'main'],
        [560, 339, 429, 'summit'], [874, 215, 480, 'summit', 'Hollowroot cache'],
        [1056, 176, 343, 'summit'], [1194, 179, 230, 'main'],
        [306, 241, 66, 'shelf'], [522, 196, 110, 'shelf', '↓ Lower tunnel'],
        [694, 248, 139, 'shelf'], [901, 224, 62, 'shelf']
      ]
    },
    {
      theme: 'castle',
      ledges: [
        [0, 164, 66, 'shelf', 'Broken cloister'],
        [133, 178, 130, 'launch'], [273, 215, 185, 'main'],
        [444, 168, 127, 'shelf'], [591, 188, 69, 'shelf', '↓ Road'],
        [250, 260, 312, 'summit'], [474, 241, 374, 'summit'],
        [684, 215, 435, 'summit'], [868, 216, 494, 'summit', 'Cloister cache'],
        [1048, 172, 370, 'summit'], [1185, 180, 224, 'main'],
        [529, 193, 247, 'main'], [678, 202, 303, 'main'],
        [841, 191, 238, 'main'], [998, 206, 126, 'shelf']
      ]
    }
  ];

  const objectiveTypes = [
    { label: 'Gather moonshards', event: 'collect', target: 6 },
    { label: 'Land on upper platforms', event: 'platform', target: 4 },
    { label: 'Vault obstacles', event: 'vault', target: 3 },
    { label: 'Clear enemies untouched', event: 'enemy', target: 4 }
  ];

  const objectives = Array.from({ length: 8 }, (_, tier) => objectiveTypes.map(objective => ({
    ...objective,
    target: objective.target + tier
  }))).flat();
  function createRun() {
    let routeIndex = Math.floor(Math.random() * routes.length);
    let contractIndex = Math.floor(Math.random() * objectiveTypes.length);
    let progress = 0;
    let completed = 0;
    let nextFork = 85;
    let platforms = [];
    let supported = null;

    return {
      get onLaunchLedge() { return supported?.tier === 'launch'; },
      get completed() { return completed; },
      get objective() {
        const { label, target } = objectives[contractIndex];
        return `${label} · ${progress}/${target} · ${completed} complete`;
      },
      record(event) {
        const objective = objectives[contractIndex];
        if (event !== objective.event) return false;
        if (++progress < objective.target) return false;
        completed++;
        progress = 0;
        contractIndex = (contractIndex + 1) % objectives.length;
        return true;
      },
      advance(world, movement, width, ground, loot) {
        if (world >= nextFork) {
          const route = routes[routeIndex];
          routeIndex = (routeIndex + 1) % routes.length;
          const origin = width + nextFork - world + movement;
          nextFork += 1510;
          for (const [offset, span, height, tier, sign = ''] of route.ledges) {
            const x = origin + offset;
            const y = ground - height;
            const label = tier === 'launch' ? '↑ Launch ledge' : sign;
            platforms.push({ x, y, span, theme: route.theme, label, tier, visited: false });
            const shards = sign.endsWith('cache') ? 5 : 2;
            for (let i = 0; i < shards; i++) {
              loot.push({ x: x + span / 2 + (i - (shards - 1) / 2) * 26, y: y - 34, cell: tier === 'summit' ? 4 : 3 });
            }
          }
        }
        for (const platform of platforms) platform.x -= movement;
        platforms = platforms.filter(platform => platform.x + platform.span > -20);
      },
      leavePlatform() { supported = null; },
      surface(previousY, nextY, feetX, ground) {
        if (nextY < previousY) return { y: ground, visited: false };
        const landing = platforms.filter(platform =>
          feetX >= platform.x && feetX <= platform.x + platform.span &&
          ((previousY <= platform.y && nextY >= platform.y) || platform === supported)).sort((a, b) => a.y - b.y)[0];
        supported = landing || null;
        if (!landing) return { y: ground, visited: false };
        const visited = !landing.visited;
        landing.visited = true;
        return { y: landing.y, visited };
      },
      draw(ctx) {
        for (const { x, y, span, label, theme, tier } of platforms) {
          const stone = ctx.createLinearGradient(0, y, 0, y + 25);
          stone.addColorStop(0, tier === 'summit' ? '#6d6683' : theme === 'castle' ? '#66647b' : '#56665b');
          stone.addColorStop(1, '#263138');
          ctx.fillStyle = stone;
          ctx.fillRect(x, y, span, 21);
          ctx.fillStyle = '#212a2c';
          ctx.fillRect(x + 4, y + 20, span - 8, 3);
          for (let block = x + 12; block < x + span - 8; block += 29) {
            ctx.fillRect(block, y + 12, 2, 8);
          }
          ctx.fillStyle = tier === 'summit' ? '#d6c382' : tier === 'shelf' ? '#77988e' : '#9aa37c';
          ctx.fillRect(x, y, span, 2);
          if (theme === 'castle') {
            for (let pier = x + 5; pier < x + span - 10; pier += 35) {
              ctx.fillRect(pier, y - 8, 11, 9);
              ctx.fillRect(pier, y + 13, 6, 13);
            }
          }
          if (theme === 'cave') {
            for (let tooth = x + 8; tooth < x + span - 12; tooth += 17) {
              ctx.beginPath();
              ctx.moveTo(tooth, y + 12);
              ctx.lineTo(tooth + 6, y + 24);
              ctx.lineTo(tooth + 12, y + 12);
              ctx.fill();
            }
          }
          if (tier === 'launch') {
            ctx.fillStyle = '#82d8bb';
            ctx.fillRect(x, y, span, 4);
            for (let mark = x + 12; mark < x + span - 10; mark += 22) {
              ctx.beginPath();
              ctx.moveTo(mark, y + 12);
              ctx.lineTo(mark + 5, y + 7);
              ctx.lineTo(mark + 10, y + 12);
              ctx.strokeStyle = '#82d8bb';
              ctx.stroke();
            }
          }
          ctx.fillStyle = '#202b26';
          for (let joint = x + 18; joint < x + span; joint += 21) ctx.fillRect(joint, y + 4, 2, 9);
          if (label) {
            ctx.font = 'bold 12px system-ui';
            const text = label;
            const width = ctx.measureText(text).width + 18;
            ctx.fillStyle = '#101c28';
            ctx.fillRect(x, y - 70, width, 22);
            ctx.fillStyle = '#f4e7a5';
            ctx.fillText(text, x + 9, y - 55);
          }
        }
      }
    };
  }

  function enemyMotion(enemy, time, heroX) {
    const range = enemy.x - heroX;
    if (enemy.hitAt !== undefined) return { speed: 0, lift: 0, tell: false };
    if (range > 210 || range < -70) return { speed: 0, lift: 0, tell: false };
    enemy.alertAt ??= time;
    const phase = (time - enemy.alertAt) % 1.45;
    if (enemy.type === 'skeleton') {
      const tell = phase < .34;
      return { speed: tell ? -30 : phase < .60 ? 100 : 12, lift: 0, tell };
    }
    const hop = Math.max(0, Math.min(1, (phase - .3) / .66));
    return { speed: hop > 0 && hop < 1 ? 46 : 0, lift: 38 * 4 * hop * (1 - hop), tell: phase < .3 };
  }

  window.GraveGainRun = { createRun, enemyMotion };
})();
