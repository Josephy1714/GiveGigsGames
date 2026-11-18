(() => {
  const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d'),$=s=>document.querySelector(s);
  const atlas = new Image();
  const props = new Image();
  const enemies = new Image();
  enemies.src = "assets/crypt-enemies.webp";
  atlas.src = 'assets/lira-motion.webp';
  props.src = 'assets/moonlit-props.webp';
  const groundTiles = Array.from({ length: 30 }, (_, index) => {
    const tile = new Image();
    tile.src = `assets/ground/ground-${String(index + 1).padStart(2, '0')}.svg`;
    tile.addEventListener('load', renderIntro);
    return tile;
  });
  const terrainOverlays = ['crack', 'grass'].flatMap(kind =>
    Array.from({ length: 20 }, (_, i) => {
      const overlay = new Image();
      overlay.src = `assets/terrain-overlays/${kind}-${String(i + 1).padStart(2, '0')}.svg`;
      return overlay;
    })
  );
  let wallGrip = null;
  let wallJumpLock = 0;
  const VAULT_SECONDS = .5;
  let stride = 0;
  let landing = 0;
  let sliding = false;
  let jumpBuffer = 0;
  let coyote = 0;
  let cameraLift = 0;
  let jumpHeld = false;
  let fireballs = [];
  const W=960,H=540,ground=432;
  let running=false,last=0,time=0,distance=0,gems=0,hearts=3,world=0,spawn=0,shake=0,particles=[];
  let player={x:238,y:ground,vy:0,speed:220,jump:false,pose:0,invuln:0};
  let obstacles=[],loot=[],input={x:0,y:0},pointer=null;
  const $score=$('#score'),$gems=$('#gems'),$hearts=$('#hearts'),$overlay=$('#overlay'),$stick=$('#stick');
  function resize(){const c=canvas,r=c.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);ctx.setTransform(c.width/W,0,0,c.height/H,0,0);if(!running)renderIntro()}
  addEventListener('resize',resize);resize();
  const bestNode=$('#best');let best=0;try{best=Number(localStorage.getItem('gravegain2dD-best')||0)}catch{}bestNode.textContent=best;
  const objectiveHud = $('#objective');
  const draftPanel = $('#draft-panel');
  const shop = $('#permanent-upgrades');
  let run = GraveGainRun.createRun();
  let build = {};
  let nextDraft = 0;
  let drafts = 0;

  function showDraft() {
    if (!running || !draftPanel.hidden) return;
    drafts++;
    draftPanel.hidden = false;
    const choices = $('#draft-choices');
    choices.replaceChildren();
    const options = GraveGainProgression.draft(build);
    options.forEach((card, index) => {
      const button = document.createElement('button');
      const detail = document.createElement('small');
      button.type = 'button';
      button.textContent = `${index + 1}. ${card.name}`;
      detail.textContent = card.detail;
      button.append(detail);
      button.addEventListener('click', () => {
        if (draftPanel.hidden || !running) return;
        card.apply();
        updateObjectiveHud();
        draftPanel.hidden = true;
      });
      choices.append(button);
    });
    choices.firstElementChild?.focus();
  }

  function record(event) {
    const complete = run.record(event);
    if (complete && hearts < 3 + (build.health || 0)) {
      hearts++;
      $hearts.textContent = '♥'.repeat(hearts);
    }
    if (complete || gems >= nextDraft) {
      if (gems >= nextDraft) nextDraft += 5 + Math.min(drafts, 5) - (build.experience || 0);
      showDraft();
    }
    updateObjectiveHud();
  }
  function updateObjectiveHud() {
    objectiveHud.textContent = `${run.objective} · Draft at ${nextDraft} shards · Wards ${build.armor || 0}`;
  }
  GraveGainProgression.renderShop(shop);

  function start(){build=GraveGainProgression.createBuild();drafts=0;nextDraft=5-(build.experience||0);draftPanel.hidden=true;wallGrip=null;wallJumpLock=0;jumpBuffer=coyote=cameraLift=0;jumpHeld=false;sliding=false;fireballs=[];run=GraveGainRun.createRun();updateObjectiveHud();stride=landing=0;running=true;last=performance.now();time=distance=gems=world=spawn=0;hearts=3+(build.health||0);obstacles=[];loot=[];particles=[];player={x:238,y:ground,vy:0,speed:220,jump:false,pose:0,invuln:0,vault:0};$score.textContent='0';$gems.textContent='0';$hearts.textContent=hearts;$('#title').innerHTML='MOONLIT<br>RUN';$('#start').textContent='BEGIN RUN';$overlay.classList.add('hidden');if(build.draft)showDraft();requestAnimationFrame(loop)}
  $('#start').addEventListener('click',start);
  function joy(e){const r=$('#stickZone').getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=(e.clientX-cx)/(r.width*.35),dy=(e.clientY-cy)/(r.height*.35),mag=Math.hypot(dx,dy);const m=mag>1?1/mag:1;input={x:dx*m,y:dy*m};$stick.style.transform=`translate(${input.x*30}px,${input.y*30}px)`}
  const zone=$('#stickZone');zone.addEventListener('pointerdown',e=>{e.preventDefault();pointer=e.pointerId;zone.setPointerCapture(pointer);joy(e)});zone.addEventListener('pointermove',e=>{if(e.pointerId===pointer)joy(e)});function release(e){if(e.pointerId===pointer){pointer=null;applyKeyboard();$stick.style.transform='translate(0,0)'}}zone.addEventListener('pointerup',release);zone.addEventListener('pointercancel',release);
  const heldKeys = new Set();
  const controls = new Map([
    ['KeyA', 'left'], ['ArrowLeft', 'left'],
    ['KeyD', 'right'], ['ArrowRight', 'right'],
    ['KeyW', 'up'], ['ArrowUp', 'up'], ['Space', 'up'],
    ['KeyS', 'down'], ['ArrowDown', 'down']
  ]);

  function applyKeyboard() {
    const active = new Set([...heldKeys].map(code => controls.get(code)));
    input.x = Number(active.has('right')) - Number(active.has('left'));
    input.y = Number(active.has('down')) - Number(active.has('up'));
  }

  addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (!draftPanel.hidden) {
      const index = ['Digit1', 'Digit2', 'Digit3'].indexOf(event.code);
      if (index >= 0) {
        event.preventDefault();
        $('#draft-choices').children[index]?.click();
      }
      return;
    }
    if (!running && event.target instanceof HTMLElement && event.target.closest('button, summary')) return;
    if (event.code === 'Enter' || event.code === 'Space') {
      if (!running && !event.repeat) {
        event.preventDefault();
        start();
        return;
      }
    }
    if (!controls.has(event.code)) return;
    event.preventDefault();
    heldKeys.add(event.code);
    if (pointer === null) applyKeyboard();
  });

  addEventListener('keyup', event => {
    if (!heldKeys.delete(event.code)) return;
    if (pointer === null) applyKeyboard();
  });

  function terrainHash(index) {
    const mixed = Math.imul(index ^ 0x49a7, 0x45d9f3b);
    return (mixed ^ (mixed >>> 16)) >>> 0;
  }

  function groundTileAt(index) {
    // Change materials in uneven stretches. A fixed hash keeps tiles stable as they scroll.
    const region = Math.floor(index / 9);
    const local = index % 9;
    const boundary = 2 + terrainHash(region) % 5;
    const material = terrainHash(region + (local >= boundary ? 1 : 0)) % 6;
    const variant = terrainHash(index + 700) % 5;
    return groundTiles[material * 5 + variant];
  }

  function drawGravePlots() {
    const spacing = 295;
    const scroll = world * .39;
    const first = Math.floor(scroll / spacing);
    ctx.save();
    for (let i = -1; i <= Math.ceil(W / spacing); i++) {
      const plot = first + i;
      const seed = terrainHash(plot + 2200);
      const center = i * spacing - scroll % spacing + 112;
      const lean = seed % 52 - 26;
      const base = ground - 12 - seed % 15;
      const hillHeight = 19 + seed % 15;

      // Depth 0 is the far edge. The plot gets wider toward the camera.
      function project(u, depth) {
        const mound = Math.sin(Math.PI * u);
        return {
          x: center + lean * (1 - depth) + (u - .5) * (123 + 100 * depth),
          y: base - 80 * (1 - depth) - mound * hillHeight * (.65 + depth * .35),
          height: 15 + depth * 15
        };
      }

      function fence(fromU, fromDepth, toU, toDepth, count) {
        const posts = Array.from({ length: count + 1 }, (_, j) => {
          const t = j / count;
          return project(fromU + (toU - fromU) * t, fromDepth + (toDepth - fromDepth) * t);
        });
        const near = (fromDepth + toDepth) / 2;
        ctx.lineWidth = 1 + near;
        ctx.strokeStyle = near > .6 ? '#233333' : '#324448';
        for (const rail of [.23, .76]) {
          ctx.beginPath();
          posts.forEach(({ x, y, height }, j) => {
            if (j) ctx.lineTo(x, y - height * rail);
            else ctx.moveTo(x, y - height * rail);
          });
          ctx.stroke();
        }
        for (const [j, { x, y, height }] of posts.entries()) {
          ctx.fillStyle = j % 4 === 0 ? '#263637' : '#304044';
          const width = (j % 4 === 0 ? 3 : 1.4) + near;
          ctx.fillRect(x - width / 2, y - height, width, height);
          ctx.fillStyle = '#627579';
          ctx.fillRect(x - width / 2, y - height - 1, width, 2);
        }
      }

      const hill = ctx.createLinearGradient(0, base - 112, 0, ground);
      hill.addColorStop(0, '#435756');
      hill.addColorStop(1, '#293d37');
      ctx.fillStyle = hill;
      ctx.beginPath();
      ctx.moveTo(center - 147, ground);
      ctx.bezierCurveTo(center - 92, base - 45, center - 103 + lean, base - 106, center + lean, base - 111);
      ctx.bezierCurveTo(center + 103 + lean, base - 106, center + 91, base - 42, center + 146, ground);
      ctx.fill();

      fence(0, 0, 1, 0, 12);
      fence(0, 0, 0, 1, 8);
      fence(1, 0, 1, 1, 8);
      for (let row = 0; row < 3; row++) {
        const depth = .18 + row * .25;
        for (let stone = 0; stone < 4; stone++) {
          const variation = terrainHash(seed % 10000 + row * 13 + stone);
          if (variation % 5 === 0) continue;
          const u = .17 + stone * .21 + (variation % 9 - 4) * .01;
          const point = project(u, depth);
          const size = 17 + 21 * depth + variation % 6;
          ctx.globalAlpha = .52 + depth * .24;
          atlasDraw(variation % 2 ? 1 : 10, point.x - size / 2, point.y - size, size, size, props);
        }
      }
      ctx.globalAlpha = 1;
      fence(0, 1, 1, 1, 19);
    }
    ctx.restore();
  }

  function drawBg(dt, velocity = 0, lift = 0){
    world += dt * velocity;
    const sky = ctx.createLinearGradient(0, 0, 0, ground);
    sky.addColorStop(0, '#090f23');
    sky.addColorStop(.52, '#1b3041');
    sky.addColorStop(1, '#465952');
    ctx.fillStyle = sky;
    ctx.fillRect(0, -lift, W, H + lift);

    for (let i = 0; i < 90; i++) {
      const seed = terrainHash(i + 901);
      const x = ((seed % W) - world * .025 % W + W) % W;
      const y = 15 + ((seed >>> 10) % 360) - lift;
      ctx.fillStyle = i % 9 ? '#b9d7da65' : '#e6f7e4b0';
      ctx.fillRect(Math.floor(x), y, i % 9 ? 1 : 2, i % 9 ? 1 : 2);
    }
    const moonY = 120 - lift * .92;
    const halo = ctx.createRadialGradient(745, moonY, 19, 745, moonY, 144);
    halo.addColorStop(0, '#d5f9cd61');
    halo.addColorStop(1, '#d5f9cd00');
    ctx.fillStyle = halo;
    ctx.fillRect(600, moonY - 144, 290, 288);
    ctx.fillStyle = '#dce9c8';
    ctx.beginPath();
    ctx.arc(745, moonY, 41, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#536c621f';
    for (const [dx, dy, radius] of [[-13, -14, 11], [18, -1, 9], [-4, 18, 12]]) {
      ctx.beginPath();
      ctx.arc(745 + dx, moonY + dy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let layer = 0; layer < 3; layer++) {
      const width = 100 - layer * 19;
      const speed = .09 + layer * .12;
      const scroll = world * speed;
      const start = Math.floor(scroll / width);
      ctx.fillStyle = ['#304652', '#293e47', '#20353c'][layer];
      for (let i = -1; i <= Math.ceil(W / width); i++) {
        const seed = terrainHash(start + i + 300 * layer);
        const x = i * width - scroll % width;
        const y = ground - (layer === 0 ? 168 : 100) - seed % 100;
        ctx.beginPath();
        ctx.moveTo(x - 25, ground);
        ctx.lineTo(x + width * .52, y);
        ctx.lineTo(x + width + 25, ground);
        ctx.fill();
        if (layer === 1 && seed % 3 === 0) {
          ctx.fillRect(x + 16, y + 25, 19, ground - y - 25);
          for (let tooth = 0; tooth < 3; tooth++) ctx.fillRect(x + 16 + tooth * 7, y + 20, 5, 5);
        }
      }
    }
    const mist = ctx.createLinearGradient(0, ground - 160, 0, ground);
    mist.addColorStop(0, '#a3d3be00');
    mist.addColorStop(.62, '#a3d3be29');
    mist.addColorStop(1, '#a3d3be00');
    ctx.fillStyle = mist;
    ctx.fillRect(0, ground - 160, W, 160);
    drawGravePlots();
    ctx.fillStyle='#17201b';ctx.fillRect(0,ground,W,H-ground);
    ctx.fillStyle = '#526448';
    ctx.fillRect(0, ground, W, 3);
    const tileSize = 48;
    const firstTile = Math.floor(world / tileSize);
    const offset = world % tileSize;
    for (let i = 0; i <= Math.ceil(W / tileSize); i++) {
      const tile = groundTileAt(firstTile + i);
      if (tile.complete && tile.naturalWidth) {
        const x = i * tileSize - Math.floor(offset);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tile, x, ground, tileSize, tileSize);
        const seed = terrainHash(firstTile + i + 440);
        const overlay = terrainOverlays[seed % terrainOverlays.length];
        if (seed % 5 !== 0 && overlay.complete && overlay.naturalWidth) {
          ctx.drawImage(overlay, x, ground, tileSize, tileSize);
        }
        // Continue the buried masonry without repeating the surface lip.
        ctx.drawImage(tile, 0, 3, 32, 29, x, ground + tileSize, tileSize, tileSize);
      }
    }
    const soilShade = ctx.createLinearGradient(0, ground + 8, 0, H);
    soilShade.addColorStop(0, '#0a111600');
    soilShade.addColorStop(1, '#0a1116c0');
    ctx.fillStyle = soilShade;
    ctx.fillRect(0, ground + 8, W, H - ground - 8);
    ctx.fillStyle='#74805a';for(let i=0;i<45;i++){let x=((i*37-world)%1000+1000)%1000;ctx.fillRect(x,ground+10+(i*17%70),2,2)}
  }
  function atlasDraw(cell, x, y, w, h, sheet = atlas, columns = 6) {
    if (!sheet.complete || !sheet.naturalWidth) {
      if (sheet === atlas) fallbackElf(x, y, w, h);
      return;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, (cell % columns) * 32, Math.floor(cell / columns) * 32, 32, 32, x, y, w, h);
  }

  function heroFrame() {
    if (player.vault > 0) return 12 + Math.min(5, Math.floor(6 * (1 - player.vault / VAULT_SECONDS)));
    if (player.jump) {
      if (player.vy < -350) return 6;
      if (player.vy < -90) return 7;
      if (player.vy < 110) return 8;
      return 9;
    }
    if (landing > 0) return landing > .045 ? 10 : 11;
    return Math.floor(stride) % 6;
  }

  function fallbackElf(x,y,w,h){ctx.save();ctx.translate(x,y);ctx.fillStyle='#a26045';ctx.fillRect(w*.34,h*.12,w*.32,h*.24);ctx.fillStyle='#43624d';ctx.fillRect(w*.28,h*.34,w*.46,h*.38);ctx.fillStyle='#ddb786';ctx.fillRect(w*.36,h*.19,w*.29,h*.16);ctx.fillStyle='#563a31';ctx.fillRect(w*.27,h*.68,w*.18,h*.28);ctx.fillRect(w*.57,h*.68,w*.18,h*.28);ctx.fillStyle='#b7d29a';ctx.beginPath();ctx.moveTo(w*.34,h*.26);ctx.lineTo(w*.14,h*.17);ctx.lineTo(w*.32,h*.32);ctx.fill();ctx.restore()}
  const enemyTypes = {
    skeleton: { width: 53, height: 65, motion: 0, reaction: 10, fps: 13, effect: 40, color: '#e1d7b4' },
    slime: { width: 54, height: 34, motion: 20, reaction: 30, fps: 10, effect: 42, color: '#a6e884' }
  };

  function drawEnemy(enemy) {
    const type = enemyTypes[enemy.type];
    const reacting = enemy.hitAt !== undefined;
    const frame = reacting
      ? type.reaction + Math.min(9, Math.floor((time - enemy.hitAt) * 18))
      : type.motion + Math.floor(time * type.fps) % 10;
    if (enemy.tell) {
      ctx.fillStyle = '#f6d48c';
      ctx.font = 'bold 19px system-ui';
      ctx.fillText('!', enemy.x + enemy.w / 2, ground - enemy.h - 8);
    }
    if (enemies.naturalWidth) {
      atlasDraw(frame, enemy.x, ground - enemy.h - (enemy.lift || 0), enemy.w, enemy.h, enemies, 10);
    } else {
      ctx.fillStyle = type.color;
      ctx.fillRect(enemy.x + 7, ground - enemy.h - (enemy.lift || 0) + 8, enemy.w - 14, enemy.h - 8);
    }
  }

  function updateTurret(turret) {
    const range = turret.x - player.x;
    if (turret.chargeAt === undefined && range < 510 && range > 350) turret.chargeAt = time;
    if (turret.fired || turret.chargeAt === undefined || time - turret.chargeAt < .48) return;
    turret.fired = true;
    fireballs.push({ x: turret.x, y: ground - 43 });
  }

  function drawTurret(turret) {
    const x = turret.x + 12;
    const y = ground - 43;
    const charging = turret.chargeAt !== undefined && !turret.fired;
    ctx.fillStyle = '#37354b';
    ctx.fillRect(x - 9, y + 8, 18, 35);
    ctx.fillStyle = '#9383a9';
    ctx.fillRect(x - 11, y + 9, 22, 4);
    ctx.shadowColor = '#ff5eaa';
    ctx.shadowBlur = charging ? 25 : 9;
    ctx.fillStyle = charging ? '#fff5b1' : '#e681ba';
    ctx.beginPath();
    ctx.arc(x, y, charging ? 8 + Math.sin(time * 30) * 2 : 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function updateFireballs(dt, velocity) {
    const heroX = player.x + 20;
    const head = player.y - (sliding ? 22 : 53);
    fireballs = fireballs.filter(ball => {
      ball.x -= (velocity + 240) * dt;
      if (ball.x < -16) return false;
      if (Math.abs(ball.x - heroX) < 21 && ball.y + 7 > head && ball.y - 7 < player.y) {
        emit(ball.x, ball.y, '#fa8fbc', 10);
        crash();
        return false;
      }
      return true;
    });
  }

  function drawFireballs() {
    ctx.save();
    for (const { x, y } of fireballs) {
      ctx.shadowColor = '#ff5eaa';
      ctx.shadowBlur = 17;
      ctx.fillStyle = '#ef76b5';
      ctx.beginPath();
      ctx.ellipse(x + 8, y, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff1b4';
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function spawnHazard(){const r=Math.random(),x=W+50;let o;if(r<.38)o={type:'stump',x,w:54,h:43};else if(r<.68)o={type:'bramble',x,w:61,h:60};else if(r<.86)o={type:'wall',x,w:38,h:72};else o={type:'gap',x,w:76,h:0};
    if (distance > 100 && Math.random() < .20) {
      o = { type: 'turret', x, w: 30, h: 51 };
    } else if (distance > 140 && Math.random() < .32) {
      const type = Math.random() < .5 ? 'skeleton' : 'slime';
      o = { type, x, w: enemyTypes[type].width, h: enemyTypes[type].height };
    }
    obstacles.push(o);if(Math.random()<.78)loot.push({x:x+34,y:ground-92-Math.random()*35,r:9,cell:Math.random()<.55?3:4});}
  function drawObstacle(o){
    if (o.type === 'climbwall') {
      const y = ground - o.h;
      ctx.fillStyle = '#3e4555';
      ctx.fillRect(o.x, y, o.w, o.h);
      ctx.fillStyle = '#9da684';
      ctx.fillRect(o.x - 3, y, o.w + 6, 4);
      for (let offset = 14; offset < o.h; offset += 14) {
        ctx.fillStyle = '#272e37';
        ctx.fillRect(o.x, y + offset, o.w, 2);
        ctx.fillStyle = '#89977f';
        ctx.fillRect(o.x + 2, y + offset - 5, 6, 3);
      }
      if (wallGrip === o) {
        ctx.fillStyle = '#fff1a8';
        ctx.font = 'bold 14px system-ui';
        ctx.fillText('↑ WALL JUMP', o.x - 85, y - 10);
      }
      return;
    }
    if (o.type === 'turret') { drawTurret(o); return; }if (enemyTypes[o.type]) { drawEnemy(o); return; }if(o.type==='gap'){const pit=ctx.createLinearGradient(0,ground,0,H);pit.addColorStop(0,'#101922');pit.addColorStop(1,'#050910');ctx.fillStyle=pit;ctx.fillRect(o.x,ground,o.w,H-ground+200);ctx.fillStyle='#829071';ctx.fillRect(o.x,ground,3,12);ctx.fillRect(o.x+o.w-3,ground,3,12);return}const cell={stump:7,bramble:6,wall:8}[o.type];atlasDraw(cell,o.x,ground-o.h,o.w,o.h,props);if(!props.complete||!props.naturalWidth){ctx.fillStyle=o.type==='bramble'?'#59613c':'#6d6554';ctx.fillRect(o.x,ground-o.h,o.w,o.h)}}
  function emit(x,y,color,n=8,sparkle=false){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*150,vy:-Math.random()*120,life:.45,size:2+Math.random()*3,color,sparkle:sparkle&&i===0})}
  function crash(){
    if (!running || player.invuln > 0) return;
    if (build.armor > 0) {
      build.armor--;
      player.invuln = .55;
      emit(player.x + 18, player.y - 30, '#8ff5ed', 14);
      record('ward');
      return;
    }
    hearts--;player.invuln=1.3+(build.grace||0);player.speed *= .72;shake=.25;emit(player.x+18,player.y-30,'#e6b47d',14);$hearts.textContent='♥'.repeat(hearts)||'0';if(hearts<=0)end()}
  function end(){running=false;draftPanel.hidden=true;
    const reward=GraveGainProgression.award(distance,run.completed,build);
    GraveGainProgression.renderShop(shop);best=Math.max(best,Math.floor(distance));bestNode.textContent=best;try{localStorage.setItem('gravegain2dD-best',String(best))}catch{}$('#title').innerHTML='THE ROAD<br>CLAIMS YOU';$('#copy').innerHTML=`You ran ${Math.floor(distance)}m and gathered ${gems} moonshards.<br>Your best run is ${best}m. Objectives completed: ${run.completed}.<br>Earned ${reward} sigils for permanent upgrades.`;$('#start').textContent='RUN AGAIN';$overlay.classList.remove('hidden')}
  function renderIntro(){if(running)return;ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);drawBg(0);atlasDraw(0,player.x-18,ground-77,76,77)}
  atlas.addEventListener('load',renderIntro);
  props.addEventListener('load',renderIntro);
  addEventListener('blur',()=>{heldKeys.clear();input={x:0,y:0};pointer=null;$stick.style.transform='translate(0,0)'});
  function loop(now){if(!running)return;
    if (!draftPanel.hidden) {
      last = now;
      requestAnimationFrame(loop);
      return;
    }
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);const dt=Math.min((now-last)/1000,.04);last=now;time+=dt;const targetSpeed = input.x > 0 ? 220 + (135 + (build.sprint || 0)) * input.x : 220 + 95 * input.x;
    player.speed += (targetSpeed - player.speed) * (1 - Math.exp(-dt * (13 + (build.brake || 0))));
    const velocity = wallGrip ? 0 : player.speed;
    wallJumpLock = Math.max(0, wallJumpLock - dt);
    distance += dt * velocity * .7;
    stride += dt * (5 + velocity * .048);
    landing = Math.max(0, landing - dt);
    if (!wallGrip) player.x += (238 + input.x * 35 - player.x) * (1 - Math.exp(-dt * 9));
    player.vault = Math.max(0, player.vault - dt);

    const wantsJump = input.y < -.33;
    if (wantsJump && !jumpHeld) jumpBuffer = .16;
    jumpHeld = wantsJump;
    if (!player.jump && player.y <= ground) coyote = .105;
    if (wallGrip && jumpBuffer > 0) {
      wallGrip = null;
      wallJumpLock = .62;
      player.vy = -755 - (build.wall || 0);
      run.leavePlatform();
      player.jump = true;
      jumpBuffer = coyote = 0;
    } else if ((wantsJump || jumpBuffer > 0) && coyote > 0 && !wallGrip) {
      run.leavePlatform();
      player.vy = -575 - (build.jump || 0);
      player.jump = true;
      jumpBuffer = coyote = 0;
    }
    jumpBuffer = Math.max(0, jumpBuffer - dt);
    coyote = Math.max(0, coyote - dt);
    const previousY = player.y;
    if (input.y > .36 && player.jump && player.vault === 0) player.vy = Math.max(player.vy, 380);
    player.vy += (player.vy < 0 ? 1130 : 1350) * dt;
    if (wallGrip) player.vy = Math.min(105, Math.max(0, player.vy));
    player.y += player.vy * dt;
    run.advance(distance, velocity * dt, W, ground, loot, obstacles);
    const feetX = player.x + 20;
    const floor = run.surface(previousY, player.y, feetX, ground);
    const overPit = obstacles.some(o => o.type === 'gap' && feetX > o.x + 4 && feetX < o.x + o.w - 4);
    if (overPit && floor.y === ground) floor.y = ground + 100;
    if (player.y > ground + 72) {
      crash();
      player.y = ground - 88;
      player.vy = -255;
      player.jump = true;
    }
    const wallTop = obstacles.find(o => o.type === 'climbwall' && feetX >= o.x &&
      feetX <= o.x + o.w && previousY <= ground - o.h && player.y >= ground - o.h);
    if (wallTop && floor.y > ground - wallTop.h) floor.y = ground - wallTop.h;
    if (player.y >= floor.y && player.vy >= 0) {
      if (player.jump) landing = .09;
      player.y = floor.y;
      player.vy = 0;
      player.jump = false;
      if (floor.visited) record('platform');
    } else {
      player.jump = true;
    }player.invuln=Math.max(0,player.invuln-dt);spawn-=dt;if(spawn<=0){spawnHazard();spawn=1.15+Math.random()*1.05-Math.min(distance/18000,.3)}
    sliding = input.y > .36 && !player.jump;
    for (const o of obstacles) {
      if (o.type === 'turret') updateTurret(o);
      const enemy = enemyTypes[o.type];
      if (!enemy) {
        o.x -= velocity * dt;
        continue;
      }
      const motion = GraveGainRun.enemyMotion(o, time, player.x);
      o.x -= (velocity + motion.speed) * dt;
      o.lift = motion.lift;
      o.tell = motion.tell;
      if (!o.passed && o.x + o.w <= player.x + 12) {
        o.passed = true;
        if (o.hitAt === undefined) record('enemy');
      }
    }obstacles=obstacles.filter(o=>o.x+o.w>-20);for(const c of loot)c.x-=velocity*dt;for(let i=loot.length-1;i>=0;i--){const c=loot[i];if(Math.abs(c.x-player.x)<34+(build.magnet||0)&&Math.abs(c.y-(player.y-32))<46+(build.magnet||0)){gems++;record('collect');$gems.textContent=gems;emit(c.x,c.y,'#efd87d',9,true);loot.splice(i,1)}else if(c.x<-20)loot.splice(i,1)}
    if (!wallGrip && wallJumpLock === 0) {
      wallGrip = obstacles.find(o => o.type === 'climbwall' && player.y > ground - o.h + 3 &&
        player.x + 38 >= o.x && player.x + 12 < o.x + o.w) || null;
    }
    if (wallGrip) {
      player.x = wallGrip.x - 37;
      player.jump = true;
    }
    updateFireballs(dt, velocity);
    const px=player.x+12;for(const o of obstacles){if(o.type==='turret'||o.type==='climbwall'||o.vaulted||px+26<=o.x||px>=o.x+o.w)continue;
      const enemy = enemyTypes[o.type];
      if (enemy) {
        if (o.hitAt === undefined && player.y > ground - o.h - o.lift + 12 && player.y - 48 < ground - o.lift) {
          o.hitAt = time;
          for (let i = 0; i < 2; i++) {
            particles.push({x:o.x+o.w/2,y:ground-o.h/2,vx:(i-.5)*75,vy:-60,life:.45,size:3,color:enemy.color,cell:enemy.effect+i});
          }
          crash();
        }
        continue;
      }
      if(o.type==='gap')continue;else if(player.y>ground-o.h+16){if(input.y<-.15&&player.vault<=0){player.vy=-350-(build.vault||0);player.jump=true;player.vault=VAULT_SECONDS;o.vaulted=true;record('vault');emit(player.x+24,ground,'#d9c780',7);$('#toast').classList.add('on');setTimeout(()=>$('#toast').classList.remove('on'),350)}else crash()}}
    const desiredLift = Math.max(0, 196 - player.y);
    cameraLift += (desiredLift - cameraLift) * (1 - Math.exp(-dt * 10));
    ctx.save();
    ctx.translate(0, cameraLift);
    drawBg(dt, velocity, cameraLift);
    ctx.save();
    if (shake > 0) {
      shake = Math.max(0, shake - dt);
      ctx.translate(Math.sin(time * 96) * shake * 9, 0);
    }
    run.draw(ctx);
    drawFireballs();
    for (const o of obstacles) {
      ctx.save();
      if (o.type !== 'gap') {
        ctx.shadowColor = '#f5b8688c';
        ctx.shadowBlur = 10;
      }
      drawObstacle(o);
      ctx.restore();
    }for(const c of loot){ctx.shadowColor='#ffe3a0';ctx.shadowBlur=10;atlasDraw(c.cell,c.x-12,c.y-12+Math.sin(time*6+c.x*.03)*3,24,24,props);ctx.shadowBlur=0}
    ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(player.x+18,ground+2,25,6,0,0,Math.PI*2);ctx.fill();const charCell=wallGrip ? 13 : heroFrame();ctx.save();ctx.shadowColor='#a7e8d492';ctx.shadowBlur=12;if(!(player.invuln>0&&Math.floor(time*14)%2))atlasDraw(sliding ? 16 : charCell, player.x - 18, player.y - (sliding ? 38 : 77), 76, sliding ? 38 : 77);ctx.restore();for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;ctx.globalAlpha=Math.max(p.life*2,0);ctx.fillStyle=p.color;if(p.cell!==undefined)atlasDraw(p.cell,p.x-8,p.y-8,16,16,enemies,10);else if(p.sparkle)atlasDraw(5,p.x-12,p.y-12,24,24,props);else ctx.fillRect(p.x,p.y,p.size,p.size);ctx.globalAlpha=1;if(p.life<=0)particles.splice(i,1)}$score.textContent=Math.floor(distance);ctx.restore();ctx.restore();requestAnimationFrame(loop)}
  renderIntro();
})();
