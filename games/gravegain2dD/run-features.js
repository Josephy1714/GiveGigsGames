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
          nextFork = distance + 720;
          route.steps.forEach(([offset, span, height], i) => {
            const x = width + offset;
            const y = ground - height;
            platforms.push({ x, y, span, theme: route.theme, label: i === 0 ? route.name : '', visited: false });
            loot.push({ x: x + span / 2, y: y - 40, cell: 3 });
          });
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
        const landing = platforms.find(platform =>
          feetX >= platform.x && feetX <= platform.x + platform.span &&
          ((previousY <= platform.y && nextY >= platform.y) || platform === supported));
        supported = landing || null;
        if (!landing) return { y: ground, visited: false };
        const visited = !landing.visited;
        landing.visited = true;
        return { y: landing.y, visited };
      },
      draw(ctx) {
        for (const { x, y, span, label, theme } of platforms) {
          ctx.fillStyle = theme === 'castle' ? '#545369' : theme === 'cave' ? '#3f4d45' : '#35443e';
          ctx.fillRect(x, y, span, 13);
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
            ctx.fillStyle = '#fff1a8';
            ctx.font = 'bold 15px system-ui';
            ctx.fillText(`↑ ${label}`, x, y - 55);
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
