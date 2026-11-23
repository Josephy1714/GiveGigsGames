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
    },
    {
      theme: 'castle',
      ledges: [
        [0, 170, 58, 'shelf', 'Bell tower'],
        [135, 172, 124, 'main'], [274, 162, 206, 'main'],
        [399, 157, 274, 'launch'], [526, 193, 340, 'main'],
        [530, 280, 434, 'summit'], [771, 178, 510, 'summit', 'Belfry cache'],
        [910, 180, 389, 'summit'], [1053, 199, 268, 'main'],
        [1204, 190, 150, 'shelf', '↓ Road'],
        [352, 222, 70, 'shelf', '↓ Bell passage'], [535, 222, 111, 'shelf'],
        [717, 212, 160, 'launch'], [892, 222, 224, 'main']
      ]
    },
    {
      theme: 'cave',
      ledges: [
        [0, 188, 60, 'shelf', 'Split crypt'],
        [155, 160, 137, 'launch'], [274, 221, 320, 'summit'],
        [455, 165, 399, 'summit'], [581, 180, 474, 'summit', 'Crypt cache'],
        [722, 195, 392, 'summit'], [879, 181, 302, 'main'],
        [1021, 172, 220, 'main'], [1158, 209, 111, 'shelf', '↓ Road'],
        [260, 176, 100, 'shelf'], [403, 176, 164, 'main'],
        [549, 175, 112, 'shelf', '↓ Ossuary'], [695, 175, 70, 'shelf'],
        [847, 193, 131, 'launch']
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
      hasLowPlatformAt(x, w, ground) {
        return platforms.some(platform =>
          x - 24 < platform.x + platform.span &&
          x + w + 24 > platform.x &&
          (ground - platform.y) < 115
        );
      },
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
      draw(ctx, time = 0) {
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
            for (let offset = 8, idx = 0; offset < span - 14; offset += 22, idx++) {
              const tooth = x + offset;
              const width = 9 + (idx % 3) * 4;
              const depth = 6 + ((idx * 5) % 7);
              ctx.fillStyle = idx % 2 === 0 ? '#202e29' : '#18221e';
              ctx.beginPath();
              ctx.moveTo(tooth, y + 21);
              ctx.lineTo(tooth + width * 0.48, y + 21 + depth);
              ctx.lineTo(tooth + width, y + 21);
              ctx.fill();
            }
          }
          if (tier === 'launch') {
            const pulse = 0.58 + 0.42 * Math.sin(time * 5.2 + x * 0.02);
            ctx.fillStyle = '#82d8bb';
            ctx.fillRect(x, y, span, 4);
            ctx.save();
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#9ef7d7';
            ctx.fillRect(x, y, span, 2);
            ctx.restore();
            const lift = ((time * 16) % 4);
            ctx.strokeStyle = '#9ef7d7';
            ctx.lineWidth = 1.6;
            for (let mark = x + 12; mark < x + span - 10; mark += 22) {
              ctx.beginPath();
              ctx.moveTo(mark, y + 13 - lift);
              ctx.lineTo(mark + 5, y + 8 - lift);
              ctx.lineTo(mark + 10, y + 13 - lift);
              ctx.stroke();
            }
          }
          ctx.fillStyle = '#202b26';
          for (let joint = x + 18; joint < x + span; joint += 21) ctx.fillRect(joint, y + 4, 2, 9);
          if (label) {
            ctx.save();
            ctx.font = 'bold 12px system-ui';
            const text = label;
            const width = ctx.measureText(text).width + 18;
            const boxX = x;
            const boxY = y - 64;
            const boxH = 22;
            ctx.fillStyle = '#0c1722e8';
            ctx.strokeStyle = tier === 'launch' ? '#9ef7d777' : '#8df0cf44';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(boxX, boxY, width, boxH, 6);
            else ctx.rect(boxX, boxY, width, boxH);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = tier === 'launch' ? '#a6f9dc' : '#f4e7a5';
            ctx.fillText(text, boxX + 9, boxY + 15);
            ctx.restore();
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
