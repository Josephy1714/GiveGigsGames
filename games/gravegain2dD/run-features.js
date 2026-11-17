(() => {
  const routes = [
    { name: 'Crypt balconies', steps: [[0, 78, 52], [104, 108, 90], [240, 118, 148], [382, 98, 82]] },
    { name: 'Lantern bridge', steps: [[0, 68, 46], [88, 104, 100], [214, 192, 139], [430, 88, 75]] },
    { name: 'Broken cloister', steps: [[0, 100, 64], [128, 84, 125], [238, 90, 177], [350, 148, 119]] },
    { name: 'Watchtower stairs', steps: [[0, 80, 40], [103, 90, 91], [213, 105, 138], [340, 165, 192]] }
  ];

  const objectives = [
    { label: 'Gather moonshards', event: 'collect', target: 6 },
    { label: 'Land on upper platforms', event: 'platform', target: 4 },
    { label: 'Vault obstacles', event: 'vault', target: 3 },
    { label: 'Clear enemies untouched', event: 'enemy', target: 4 }
  ];

  function createRun() {
    let routeIndex = Math.floor(Math.random() * routes.length);
    let contractIndex = Math.floor(Math.random() * objectives.length);
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
      advance(distance, movement, width, ground, loot) {
        if (distance >= nextFork) {
          const route = routes[routeIndex];
          routeIndex = (routeIndex + 1) % routes.length;
          nextFork = distance + 530;
          route.steps.forEach(([offset, span, height], i) => {
            const x = width + offset;
            const y = ground - height;
            platforms.push({ x, y, span, label: i === 0 ? route.name : '', visited: false });
            loot.push({ x: x + span / 2, y: y - 40, cell: 3 });
          });
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
        for (const { x, y, span, label } of platforms) {
          ctx.fillStyle = '#35443e';
          ctx.fillRect(x, y, span, 13);
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
