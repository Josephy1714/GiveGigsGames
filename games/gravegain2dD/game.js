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
  const VAULT_SECONDS = .5;
  let stride = 0;
  let landing = 0;
  const W=960,H=540,ground=432;
  let running=false,last=0,time=0,distance=0,gems=0,hearts=3,world=0,spawn=0,shake=0,particles=[];
  let player={x:238,y:ground,vy:0,speed:0,jump:false,pose:0,invuln:0};
  let obstacles=[],loot=[],input={x:0,y:0},pointer=null;
  const $score=$('#score'),$gems=$('#gems'),$hearts=$('#hearts'),$overlay=$('#overlay'),$stick=$('#stick');
  function resize(){const c=canvas,r=c.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);ctx.setTransform(c.width/W,0,0,c.height/H,0,0);if(!running)renderIntro()}
  addEventListener('resize',resize);resize();
  const bestNode=$('#best');let best=0;try{best=Number(localStorage.getItem('gravegain2dD-best')||0)}catch{}bestNode.textContent=best;
  const objectiveHud = $('#objective');
  let run = GraveGainRun.createRun();
  function record(event) {
    if (run.record(event) && hearts < 3) {
      hearts++;
      $hearts.textContent = '♥'.repeat(hearts);
    }
    objectiveHud.textContent = run.objective;
  }

  function start(){run=GraveGainRun.createRun();objectiveHud.textContent=run.objective;stride=landing=0;running=true;last=performance.now();time=distance=gems=world=spawn=0;hearts=3;obstacles=[];loot=[];particles=[];player={x:238,y:ground,vy:0,speed:0,jump:false,pose:0,invuln:0,vault:0};$score.textContent='0';$gems.textContent='0';$hearts.textContent='3';$('#title').innerHTML='MOONLIT<br>RUN';$('#copy').innerHTML='One finger guides Lira through the forgotten grave road.<br>Push right to sprint, pull left to slow down, push up to leap or vault.';$('#start').textContent='BEGIN RUN';$overlay.classList.add('hidden');requestAnimationFrame(loop)}
  $('#start').addEventListener('click',start);
  function joy(e){const r=$('#stickZone').getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=(e.clientX-cx)/(r.width*.35),dy=(e.clientY-cy)/(r.height*.35),mag=Math.hypot(dx,dy);const m=mag>1?1/mag:1;input={x:dx*m,y:dy*m};$stick.style.transform=`translate(${input.x*30}px,${input.y*30}px)`}
  const zone=$('#stickZone');zone.addEventListener('pointerdown',e=>{e.preventDefault();pointer=e.pointerId;zone.setPointerCapture(pointer);joy(e)});zone.addEventListener('pointermove',e=>{if(e.pointerId===pointer)joy(e)});function release(e){if(e.pointerId===pointer){pointer=null;input={x:0,y:0};$stick.style.transform='translate(0,0)'}}zone.addEventListener('pointerup',release);zone.addEventListener('pointercancel',release);
  addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp',' ','ArrowDown'].includes(e.key))e.preventDefault();if(e.key==='ArrowRight'||e.key==='d')input.x=1;if(e.key==='ArrowLeft'||e.key==='a')input.x=-1;if(e.key==='ArrowUp'||e.key===' '||e.key==='w')input.y=-1;if(!running&&(e.key==='Enter'||e.key===' '))start()});addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight','a','d'].includes(e.key))input.x=0;if(['ArrowUp',' ','w'].includes(e.key))input.y=0});
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

  function drawBg(dt){
    world+=dt*(90+player.speed*80);
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#142421');sky.addColorStop(.65,'#26382d');sky.addColorStop(1,'#293329');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#d8dcb7';ctx.globalAlpha=.78;ctx.beginPath();ctx.arc(765,100,43,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.fillStyle='#293a32';for(let i=0;i<10;i++){const x=((i*137-world*.13)%1200+1200)%1200-100,h=80+(i*53%130);ctx.beginPath();ctx.moveTo(x,ground);ctx.lineTo(x+28,ground-h);ctx.lineTo(x+57,ground);ctx.fill()}
    for(let i=0;i<6;i++){const x=((i*211-world*.36)%1200+1200)%1200-120;atlasDraw(i%2 ? 0 : 9,x,ground-82,76,82,props);if(i%2===0)atlasDraw(i%4 ? 1 : 10,x+94,ground-53,38,53,props);if(i%3===1)atlasDraw(i%2 ? 2 : 11,x+128,ground-91,34,50,props)}
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
        // Continue the buried masonry without repeating the surface lip.
        ctx.drawImage(tile, 0, 3, 32, 29, x, ground + tileSize, tileSize, tileSize);
      }
    }
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

  function spawnHazard(){const r=Math.random(),x=W+50;let o;if(r<.38)o={type:'stump',x,w:54,h:43};else if(r<.68)o={type:'bramble',x,w:61,h:60};else if(r<.86)o={type:'wall',x,w:38,h:72};else o={type:'gap',x,w:76,h:0};
    if (distance > 140 && Math.random() < .32) {
      const type = Math.random() < .5 ? 'skeleton' : 'slime';
      o = { type, x, w: enemyTypes[type].width, h: enemyTypes[type].height };
    }
    obstacles.push(o);if(Math.random()<.78)loot.push({x:x+34,y:ground-92-Math.random()*35,r:9,cell:Math.random()<.55?3:4});}
  function drawObstacle(o){if (enemyTypes[o.type]) { drawEnemy(o); return; }if(o.type==='gap'){ctx.fillStyle='#080e0c';ctx.fillRect(o.x,ground,o.w,32);ctx.fillStyle='#44513d';ctx.fillRect(o.x,ground,o.w,4);return}const cell={stump:7,bramble:6,wall:8}[o.type];atlasDraw(cell,o.x,ground-o.h,o.w,o.h,props);if(!props.complete||!props.naturalWidth){ctx.fillStyle=o.type==='bramble'?'#59613c':'#6d6554';ctx.fillRect(o.x,ground-o.h,o.w,o.h)}}
  function emit(x,y,color,n=8,sparkle=false){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*150,vy:-Math.random()*120,life:.45,size:2+Math.random()*3,color,sparkle:sparkle&&i===0})}
  function crash(){if(player.invuln>0)return;hearts--;player.invuln=1.3;player.speed=Math.max(.25,player.speed*.55);shake=.25;emit(player.x+18,player.y-30,'#e6b47d',14);$hearts.textContent='♥'.repeat(hearts)||'0';if(hearts<=0)end()}
  function end(){running=false;best=Math.max(best,Math.floor(distance));bestNode.textContent=best;try{localStorage.setItem('gravegain2dD-best',String(best))}catch{}$('#title').innerHTML='THE ROAD<br>CLAIMS YOU';$('#copy').innerHTML=`You ran ${Math.floor(distance)}m and gathered ${gems} moonshards.<br>Your best run is ${best}m. Objectives completed: ${run.completed}.`;$('#start').textContent='RUN AGAIN';$overlay.classList.remove('hidden')}
  function renderIntro(){if(running)return;ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);drawBg(0);atlasDraw(0,player.x-18,ground-77,76,77)}
  atlas.addEventListener('load',renderIntro);
  props.addEventListener('load',renderIntro);
  addEventListener('blur',()=>{input={x:0,y:0};pointer=null;$stick.style.transform='translate(0,0)'});
  function loop(now){if(!running)return;ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);const dt=Math.min((now-last)/1000,.04);last=now;time+=dt;distance+=dt*(100+player.speed*135);player.speed+=(Math.max(-.72,Math.min(1,input.x))*.95-player.speed*.36)*dt;player.speed=Math.max(-.72,Math.min(1,player.speed));const velocity=145+player.speed*105;stride+=dt*(6+velocity*.045);landing=Math.max(0,landing-dt);player.x=Math.max(148,Math.min(360,player.x+input.x*55*dt));player.vault=Math.max(0,player.vault-dt);if(input.y<-.33&&!player.jump){run.leavePlatform();player.vy=-440;player.jump=true;player.pose=1}const previousY = player.y;
    player.vy += 980 * dt;
    player.y += player.vy * dt;
    run.advance(distance, velocity * dt, W, ground, loot);
    const floor = run.surface(previousY, player.y, player.x + 20, ground);
    if (player.y >= floor.y && player.vy >= 0) {
      if (player.jump) landing = .09;
      player.y = floor.y;
      player.vy = 0;
      player.jump = false;
      if (floor.visited) record('platform');
    } else {
      player.jump = true;
    }player.invuln=Math.max(0,player.invuln-dt);spawn-=dt;if(spawn<=0){spawnHazard();spawn=1.15+Math.random()*1.05-Math.min(distance/18000,.3)}
    for (const o of obstacles) {
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
    }obstacles=obstacles.filter(o=>o.x+o.w>-20);for(const c of loot)c.x-=velocity*dt;for(let i=loot.length-1;i>=0;i--){const c=loot[i];if(Math.abs(c.x-player.x)<34&&Math.abs(c.y-(player.y-32))<46){gems++;record('collect');$gems.textContent=gems;emit(c.x,c.y,'#efd87d',9,true);loot.splice(i,1)}else if(c.x<-20)loot.splice(i,1)}
    const px=player.x+12;for(const o of obstacles){if(o.vaulted||px+26<=o.x||px>=o.x+o.w)continue;
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
      if(o.type==='gap'){if(player.y>ground-18)crash()}else if(player.y>ground-o.h+16){if(input.y<-.15&&player.vault<=0){player.vy=-350;player.jump=true;player.vault=VAULT_SECONDS;o.vaulted=true;record('vault');emit(player.x+24,ground,'#d9c780',7);$('#toast').classList.add('on');setTimeout(()=>$('#toast').classList.remove('on'),350)}else crash()}}
    drawBg(dt);run.draw(ctx);for(const o of obstacles)drawObstacle(o);for(const c of loot){ctx.shadowColor='#ffe3a0';ctx.shadowBlur=10;atlasDraw(c.cell,c.x-12,c.y-12+Math.sin(time*6+c.x*.03)*3,24,24,props);ctx.shadowBlur=0}
    ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(player.x+18,ground+2,25,6,0,0,Math.PI*2);ctx.fill();const charCell=heroFrame();if(!(player.invuln>0&&Math.floor(time*14)%2))atlasDraw(charCell,player.x-18,player.y-77,76,77);for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;ctx.globalAlpha=Math.max(p.life*2,0);ctx.fillStyle=p.color;if(p.cell!==undefined)atlasDraw(p.cell,p.x-8,p.y-8,16,16,enemies,10);else if(p.sparkle)atlasDraw(5,p.x-12,p.y-12,24,24,props);else ctx.fillRect(p.x,p.y,p.size,p.size);ctx.globalAlpha=1;if(p.life<=0)particles.splice(i,1)}$score.textContent=Math.floor(distance);if(shake>0){shake-=dt;ctx.translate((Math.random()-.5)*7,(Math.random()-.5)*5)}requestAnimationFrame(loop)}
  renderIntro();
})();
