(() => {
  const routes = [
    { name: 'Crypt balconies', steps: [[0, 104, 55], [123, 94, 116], [234, 114, 180], [375, 105, 250], [502, 124, 314], [653, 115, 222], [791, 112, 124]] },
    { name: 'Lantern bridge', steps: [[0, 112, 62], [129, 112, 124], [259, 168, 195], [452, 180, 252], [655, 108, 165], [787, 107, 88]] },
    { name: 'Broken cloister', steps: [[0, 104, 73], [123, 94, 138], [234, 104, 208], [354, 94, 276], [469, 134, 329], [621, 103, 217], [743, 119, 133]] },
    { name: 'Watchtower stairs', steps: [[0, 110, 54], [128, 90, 117], [236, 87, 190], [343, 88, 260], [448, 142, 323], [609, 104, 251], [734, 142, 156]] }
  ];

  routes.push(
    { name: 'Hollowroot cave', theme: 'cave', steps: [[0,110,52],[138,128,112],[302,107,167],[442,140,228],[618,115,154],[762,130,86]] },
    { name: 'Castle of the waning moon', theme: 'castle', steps: [[0,104,59],[133,110,119],[275,113,196],[417,110,267],[556,126,337],[709,160,275],[893,117,181]] }
  );

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
  const routeVariants = routes.flatMap(route => [0, 1, 2, 3].map(variant => ({
    ...route,
    name: route.name + ['', ' · broken stair', ' · long bridge', ' · summit'][variant],
    steps: route.steps.map(([x, span, height], index) => [
      x + index * [0, 10, 5, 9][variant],
      span + [0, -12, 10, -7][variant],
      height + (index === 0 ? 0 : [0, (index % 2) * 14, -12, 18][variant])
    ])
  })));

  function createRun() {
    let routeIndex = 16 + Math.floor(Math.random() * 8);
    let contractIndex = Math.floor(Math.random() * objectiveTypes.length);
    let progress = 0;
    let completed = 0;
    let nextFork = 65;
    let platforms = [];
    let supported = null;

    return {
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
      advance(distance, movement, width, ground, loot, obstacles) {
        if (distance >= nextFork) {
          const route = routeVariants[routeIndex];
          routeIndex = (routeIndex + 7) % routeVariants.length;
          nextFork = distance + 1430;
          const addLedge = (offset, span, height, label = '', tier = 'main') => {
            const x = width + offset;
            const y = ground - height;
            platforms.push({ x, y, span, theme: route.theme, label, tier, visited: false });
            loot.push({ x: x + span / 2, y: y - 34, cell: tier === 'summit' ? 4 : 3 });
          };
          const summitIndex = route.steps.reduce((best, step, i) => step[2] > route.steps[best][2] ? i : best, 0);
          route.steps.forEach(([offset, span, height], i) => {
            addLedge(offset, span, height, i === 0 ? route.name : '');
            if (i >= 1 && i <= summitIndex + 1) {
              addLedge(offset + 35, Math.max(85, span - 6), Math.max(42, height - 112), '', 'shelf');
            }
          });
          const [forkX, forkSpan, forkHeight] = route.steps[summitIndex];
          addLedge(forkX + forkSpan - 20, 127, forkHeight + 76, 'High route', 'summit');
          addLedge(forkX + forkSpan + 112, 119, forkHeight + 158, '', 'summit');
          addLedge(forkX + forkSpan + 238, 106, forkHeight + 239, '', 'summit');
          addLedge(forkX + forkSpan + 355, 138, forkHeight + 324, 'Summit cache', 'summit');
          addLedge(forkX + forkSpan + 506, 125, forkHeight + 249, '', 'summit');
          addLedge(forkX + forkSpan + 642, 122, forkHeight + 157, '', 'summit');
          addLedge(forkX + forkSpan + 772, 140, forkHeight + 79, '', 'summit');
          addLedge(forkX + forkSpan + 910, 170, Math.max(85, forkHeight - 45), 'Return to road', 'shelf');
          for (let i = 0; i < 3; i++) {
            loot.push({ x: width + forkX + forkSpan + 380 + i * 28, y: ground - forkHeight - 360, cell: 3 });
          }
          if (route.theme) {
            obstacles.push({ type: 'climbwall', x: width + 340, w: 36, h: route.theme === 'castle' ? 166 : 130 });
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
          ctx.fillStyle = '#85946a';
          ctx.fillRect(x, y, span, 3);
          ctx.fillStyle = '#202b26';
          for (let joint = x + 18; joint < x + span; joint += 21) ctx.fillRect(joint, y + 4, 2, 9);
          if (label) {
            ctx.font = 'bold 12px system-ui';
            const text = `↑ ${label}`;
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
