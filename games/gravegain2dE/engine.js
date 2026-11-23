/* GraveGain2DE: Smash Slash Bash Mash — Platform Fighter Physics, Combat & AI Engine */
(function () {
  'use strict';

  const TEAM_COLORS = ['#38bdf8', '#f43f5e', '#facc15', '#a855f7'];
  const GRAVITY = 1550;
  const FAST_FALL_MULT = 1.48;
  const MAX_FALL = 880;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function createMatch(config) {
    const stage = window.GG2DE_STAGES.get(config.stageId);
    const slots = config.slots || [];
    const stocks = config.stocks || 3;
    const mode = config.mode || 'stock'; // 'stock' | 'timed' | 'training'
    const timeLimit = mode === 'timed' ? (config.timeLimit || 120) : 0;

    const fighters = slots.map((slot, idx) => {
      const def = window.GG2DE_ROSTER.get(slot.charId);
      const sp = stage.spawns[idx % stage.spawns.length];
      return {
        index: idx,
        tag: slot.isCpu ? `CPU${idx + 1}` : `P${slot.playerNum || (idx + 1)}`,
        isCpu: !!slot.isCpu,
        cpuLevel: slot.cpuLevel || 'veteran',
        playerNum: slot.playerNum || (idx + 1),
        team: slot.team !== undefined ? slot.team : idx,
        color: TEAM_COLORS[idx % TEAM_COLORS.length],
        def,
        x: sp[0],
        y: sp[1],
        vx: 0,
        vy: 0,
        face: sp[0] >= 0 ? -1 : 1,
        pct: 0,
        stocks: mode === 'training' ? 99 : stocks,
        kos: 0,
        falls: 0,
        damageDealt: 0,
        eliminated: false,
        onGround: false,
        standingPlat: null,
        crouching: false,
        dropTimer: 0,
        jumpsLeft: 2,
        upBUsed: false,
        airDodgeUsed: false,
        onLedge: null,
        ledgeCooldown: 0,
        invuln: 1.0,
        respawnTimer: 0,
        shielding: false,
        shieldHp: 100,
        dizzyTimer: 0,
        dodgeTimer: 0,
        hitstun: 0,
        tumbleAngle: 0,
        attackTimer: 0,
        attackDur: 0,
        activeHitbox: null,
        hitTargets: new Set(),
        chargeTime: 0,
        chargeDir: 0,
        dashAttackTimer: 0,
        dashAttackMove: null,
        counterTimer: 0,
        counterMove: null,
        reflectTimer: 0,
        superArmor: false,
        specialCd: 0,
        healCd: 0,
        hasUltimate: false,
        ultTimer: 0,
        lastHitBy: -1,
        lastHitAt: 0,
        prevJump: false,
        prevAttack: false,
        prevSpecial: false,
        prevSmash: false,
        prevShield: false,
        aiTimer: 0,
        aiInput: { x: 0, y: 0, jump: false, attack: false, special: false, shield: false, smash: false }
      };
    });

    return {
      stage,
      mode,
      itemsEnabled: config.itemsEnabled !== false,
      time: 0,
      countdown: mode === 'training' ? 0 : 2.1,
      lastCountNum: 4,
      matchTimeLeft: timeLimit,
      suddenDeath: false,
      over: false,
      winner: null,
      fighters,
      platforms: window.GG2DE_STAGES.getPlatformsAt(stage, 0),
      projectiles: [],
      turrets: [],
      items: [],
      leyCore: null,
      leyCoreTimer: 16,
      itemTimer: 8,
      particles: [],
      popups: [],
      koBeams: [],
      hitStop: 0,
      shake: 0,
      bannerText: mode === 'training' ? 'TRAINING ARENA' : 'READY...',
      bannerTimer: mode === 'training' ? 1.4 : 2.1,
      cam: { x: 0, y: 10, scale: 1.0 }
    };
  }

  function spawnParticles(m, x, y, color, count, speed, life) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.3 + Math.random() * 0.7) * (speed || 180);
      m.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30,
        r: 2 + Math.random() * 3.5,
        color,
        life: (life || 0.35) * (0.6 + Math.random() * 0.6),
        maxLife: life || 0.35
      });
    }
  }

  function addPopup(m, text, x, y, color) {
    m.popups.push({ text, x, y, color: color || '#fef08a', life: 0.9 });
  }

  function applyHit(m, attacker, target, hit, hitX, hitY) {
    if (target.eliminated || target.respawnTimer > 0) return false;
    if (target.invuln > 0) return false;

    // Counter check!
    if (target.counterTimer > 0 && target.counterMove) {
      target.counterTimer = 0;
      target.invuln = 0.35;
      window.GG2DE_AUDIO?.play('counter');
      addPopup(m, 'COUNTER!', target.x, target.y - 68, '#fde047');
      spawnParticles(m, target.x, target.y - 24, '#fde047', 16, 260, 0.4);
      target.face = attacker.x >= target.x ? 1 : -1;
      target.attackDur = 0.24;
      target.attackTimer = 0.24;
      target.hitTargets.clear();
      target.activeHitbox = {
        ox: target.face * 34, oy: -24, r: 48,
        dmg: Math.max(target.counterMove.dmg, Math.round(hit.dmg * 1.35)),
        kb: target.counterMove.kb,
        kbg: target.counterMove.kbg,
        angle: 38,
        smash: true
      };
      return true;
    }

    // Shield block check
    if (target.shielding) {
      target.shieldHp = Math.max(0, target.shieldHp - hit.dmg * 2.1);
      window.GG2DE_AUDIO?.play('shield');
      spawnParticles(m, hitX, hitY, target.color, 8, 150, 0.25);
      target.vx += Math.sign(target.x - (attacker ? attacker.x : hitX)) * 120;
      if (target.shieldHp <= 0) {
        target.shielding = false;
        target.dizzyTimer = 2.6;
        target.vy = -520;
        window.GG2DE_AUDIO?.play('shieldbreak');
        addPopup(m, 'SHIELD BREAK!', target.x, target.y - 72, '#f87171');
      }
      return true;
    }

    // Orc Berserkonin Rage bonus: up to +25% dmg/kb at 120%+
    let rageMult = 1;
    if (attacker && attacker.def.race === 'orc') {
      rageMult = 1 + Math.min(0.25, attacker.pct / 480);
    }

    const dmg = Math.round(hit.dmg * rageMult * 10) / 10;
    target.pct = Math.min(999, target.pct + dmg);
    target.damageDealt = target.damageDealt || 0;
    if (attacker) {
      attacker.damageDealt += dmg;
      target.lastHitBy = attacker.index;
      target.lastHitAt = m.time;
    }

    // Heal-on-hit specials (e.g., Bat Swarm / Soul Tether)
    if (attacker && hit.healOnHit) {
      attacker.pct = Math.max(0, attacker.pct - hit.healOnHit);
      addPopup(m, `-${hit.healOnHit}%`, attacker.x, attacker.y - 60, '#4ade80');
    }

    // Knockback calculation
    const weightFactor = 100 / target.def.stats.weight;
    const rawKb = (hit.kb + target.pct * 3.15 * (hit.kbg || 1.0)) * weightFactor * rageMult;

    if (!target.superArmor) {
      let deg = hit.angle !== undefined ? hit.angle : 36;
      const dir = hit.dir !== undefined ? hit.dir : (attacker ? Math.sign(target.x - attacker.x) || attacker.face : 1);
      const rad = (deg * Math.PI) / 180;
      target.vx = Math.cos(rad) * rawKb * dir;
      target.vy = -Math.sin(rad) * rawKb;
      // Meteor spike downward if angle is negative or > 180? Wait: use negative deg for spikes!
      if (deg < 0) {
        target.vy = Math.sin((-deg * Math.PI) / 180) * rawKb;
      }
      target.onGround = false;
      target.onLedge = null;
      target.chargeTime = 0;
      target.dashAttackTimer = 0;
      target.hitstun = clamp(rawKb / 1050, 0.14, 0.92);
    }

    const heavy = rawKb > 390 || hit.smash;
    m.hitStop = Math.max(m.hitStop, heavy ? 0.085 : 0.032);
    m.shake = Math.max(m.shake, heavy ? 11 : 4);
    window.GG2DE_AUDIO?.play(heavy ? 'smash' : 'hit', clamp(rawKb / 400, 0.8, 1.5));
    spawnParticles(m, hitX, hitY, heavy ? '#fde047' : '#ffffff', heavy ? 16 : 8, heavy ? 300 : 180, 0.35);
    addPopup(m, `${Math.round(dmg)}%`, target.x, target.y - 52, heavy ? '#fb923c' : '#f8fafc');
    return true;
  }

  function startAttack(m, f, inp, isSmashBtn) {
    if (f.attackTimer > 0 || f.dizzyTimer > 0 || f.hitstun > 0 || f.dodgeTimer > 0) return;

    // Ledge-getup attack
    if (f.onLedge) {
      const plat = f.onLedge.plat;
      f.x = f.onLedge.side < 0 ? plat.x + 22 : plat.x + plat.w - 22;
      f.y = plat.y;
      f.onLedge = null;
      f.onGround = true;
      f.invuln = 0.25;
      f.attackDur = 0.28;
      f.attackTimer = 0.28;
      f.hitTargets.clear();
      f.activeHitbox = { ox: f.face * 30, oy: -20, r: 40, dmg: 8, kb: 260, kbg: 0.9, angle: 35 };
      window.GG2DE_AUDIO?.play('swing');
      return;
    }

    const pwr = f.def.stats.power;
    const rch = f.def.stats.reach;

    if (!f.onGround) {
      // Aerials
      f.attackDur = 0.26;
      f.attackTimer = 0.26;
      f.hitTargets.clear();
      window.GG2DE_AUDIO?.play('swing');
      if (inp.y > 0.45) {
        // Down Air (Meteor Spike!)
        f.activeHitbox = { ox: 0, oy: 6, r: 34 * rch, dmg: 13 * pwr, kb: 290, kbg: 1.05, angle: -75, smash: true };
      } else if (inp.y < -0.45) {
        // Up Air
        f.activeHitbox = { ox: 0, oy: -52, r: 36 * rch, dmg: 11 * pwr, kb: 290, kbg: 1.0, angle: 82 };
      } else if (inp.x * f.face < -0.35) {
        // Back Air
        f.activeHitbox = { ox: -f.face * 28, oy: -24, r: 35 * rch, dmg: 13 * pwr, kb: 330, kbg: 1.06, angle: 34, dir: -f.face };
      } else if (Math.abs(inp.x) > 0.35) {
        // Forward Air
        f.activeHitbox = { ox: f.face * 30, oy: -24, r: 35 * rch, dmg: 12 * pwr, kb: 300, kbg: 1.02, angle: 36 };
      } else {
        // Neutral Air
        f.activeHitbox = { ox: 0, oy: -24, r: 38 * rch, dmg: 9 * pwr, kb: 240, kbg: 0.9, angle: 42 };
      }
      return;
    }

    // Grounded attacks
    if (isSmashBtn) {
      f.chargeTime = 0.01;
      f.chargeDir = inp.y < -0.45 ? 'up' : inp.y > 0.45 ? 'down' : 'side';
      if (Math.abs(inp.x) > 0.25) f.face = Math.sign(inp.x);
      return;
    }

    if (inp.y < -0.45) {
      // Up Strike
      f.attackDur = 0.3;
      f.attackTimer = 0.3;
      f.hitTargets.clear();
      f.activeHitbox = { ox: f.face * 10, oy: -50, r: 38 * rch, dmg: 13 * pwr, kb: 320, kbg: 1.08, angle: 85, smash: true };
      window.GG2DE_AUDIO?.play('swing');
    } else if (inp.y > 0.45) {
      // Down Sweep
      f.attackDur = 0.28;
      f.attackTimer = 0.28;
      f.hitTargets.clear();
      f.activeHitbox = { ox: 0, oy: -12, r: 44 * rch, dmg: 11 * pwr, kb: 290, kbg: 1.0, angle: 28, smash: true };
      window.GG2DE_AUDIO?.play('swing');
    } else if (Math.abs(inp.x) > 0.45) {
      // Forward Strike
      f.face = Math.sign(inp.x);
      f.attackDur = 0.28;
      f.attackTimer = 0.28;
      f.hitTargets.clear();
      f.activeHitbox = { ox: f.face * 34, oy: -24, r: 38 * rch, dmg: 13 * pwr, kb: 330, kbg: 1.06, angle: 36, smash: true };
      window.GG2DE_AUDIO?.play('swing');
    } else {
      // Quick Jab
      f.attackDur = 0.18;
      f.attackTimer = 0.18;
      f.hitTargets.clear();
      f.activeHitbox = { ox: f.face * 26, oy: -24, r: 30 * rch, dmg: 5.5 * pwr, kb: 165, kbg: 0.68, angle: 45 };
      window.GG2DE_AUDIO?.play('swing');
    }
  }

  function releaseSmash(m, f) {
    if (f.chargeTime <= 0) return;
    const mult = 1 + Math.min(0.48, f.chargeTime * 0.6);
    const pwr = f.def.stats.power * mult;
    const rch = f.def.stats.reach;
    f.chargeTime = 0;
    f.attackDur = 0.34;
    f.attackTimer = 0.34;
    f.hitTargets.clear();
    window.GG2DE_AUDIO?.play('swing');
    if (f.chargeDir === 'up') {
      f.activeHitbox = { ox: 0, oy: -52, r: 44 * rch, dmg: 16 * pwr, kb: 370 * mult, kbg: 1.18, angle: 86, smash: true };
    } else if (f.chargeDir === 'down') {
      f.activeHitbox = { ox: 0, oy: -12, r: 52 * rch, dmg: 14 * pwr, kb: 340 * mult, kbg: 1.12, angle: 25, smash: true };
    } else {
      f.activeHitbox = { ox: f.face * 38, oy: -25, r: 44 * rch, dmg: 17 * pwr, kb: 385 * mult, kbg: 1.2, angle: 36, smash: true };
    }
  }

  function triggerUltimate(m, f) {
    f.hasUltimate = false;
    f.ultTimer = 0.6;
    f.invuln = 0.85;
    m.hitStop = 0.16;
    m.shake = 16;
    window.GG2DE_AUDIO?.play('ultimate');
    addPopup(m, f.def.ultimateName.toUpperCase() + '!', f.x, f.y - 82, '#fde047');

    const race = f.def.race;
    if (race === 'human') {
      // Orbital SafeSpace Strike: huge forward + vertical plasma beam projectiles
      for (let i = 0; i < 5; i++) {
        m.projectiles.push({
          owner: f.index, team: f.team, kind: 'lance',
          x: f.x + f.face * (40 + i * 48), y: f.y - 26,
          vx: f.face * 860, vy: 0, r: 22,
          dmg: 22, kb: 520, kbg: 1.35, angle: 34, smash: true,
          life: 0.9, color: '#38bdf8'
        });
      }
      spawnParticles(m, f.x + f.face * 40, f.y - 26, '#38bdf8', 32, 380, 0.5);
    } else if (race === 'elf') {
      // Mother Tree Tempest: 6 homing Light Spirits + AoE burst
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        m.projectiles.push({
          owner: f.index, team: f.team, kind: 'homing',
          x: f.x + Math.cos(a) * 32, y: f.y - 28 + Math.sin(a) * 32,
          vx: Math.cos(a) * 440, vy: Math.sin(a) * 440, r: 14,
          dmg: 14, kb: 440, kbg: 1.28, angle: 58, smash: true,
          life: 2.0, color: '#34d399', homing: true
        });
      }
      spawnParticles(m, f.x, f.y - 26, '#34d399', 36, 360, 0.55);
    } else if (race === 'dwarf') {
      // Sparkite Magma Eruption: massive AoE + 4 erupting magma boulders
      for (let i = -2; i <= 2; i++) {
        if (i === 0) continue;
        m.projectiles.push({
          owner: f.index, team: f.team, kind: 'fireball',
          x: f.x + i * 32, y: f.y - 24,
          vx: i * 160, vy: -520, r: 20, gravity: 950,
          dmg: 24, kb: 510, kbg: 1.32, angle: 65, smash: true,
          life: 1.4, color: '#fbbf24'
        });
      }
      f.attackDur = 0.35;
      f.attackTimer = 0.35;
      f.hitTargets.clear();
      f.activeHitbox = { ox: 0, oy: -24, r: 145, dmg: 26, kb: 540, kbg: 1.35, angle: 68, smash: true };
      spawnParticles(m, f.x, f.y - 16, '#f97316', 40, 420, 0.6);
    } else {
      // First Orc Cataclysm: colossal crimson shockwave
      f.attackDur = 0.4;
      f.attackTimer = 0.4;
      f.hitTargets.clear();
      f.activeHitbox = { ox: 0, oy: -28, r: 165, dmg: 30, kb: 580, kbg: 1.4, angle: 44, smash: true };
      spawnParticles(m, f.x, f.y - 26, '#ef4444', 44, 460, 0.6);
    }
  }

  function startSpecial(m, f, inp) {
    if (f.dizzyTimer > 0 || f.hitstun > 0 || f.dodgeTimer > 0 || f.attackTimer > 0) return;

    const moves = f.def.moves;
    let dirKey = 'neutral';
    if (inp.y < -0.5) dirKey = 'up';
    else if (inp.y > 0.5) dirKey = 'down';
    else if (Math.abs(inp.x) > 0.45) {
      dirKey = 'side';
      f.face = Math.sign(inp.x);
    }

    if (dirKey === 'neutral' && f.hasUltimate) {
      triggerUltimate(m, f);
      return;
    }

    const mv = moves[dirKey];
    if (!mv) return;

    if (dirKey === 'up' && f.upBUsed) return;
    if ((mv.kind === 'proj' || mv.kind === 'toss') && f.specialCd > 0) return;
    if ((mv.kind === 'heal' || mv.kind === 'turret') && f.healCd > 0) return;

    f.onLedge = null;
    const pwr = f.def.stats.power;

    if (mv.kind === 'recover') {
      f.upBUsed = true;
      f.onGround = false;
      f.vy = mv.vy || -750;
      f.vx = f.face * (mv.vxBoost || 220) + inp.x * 130;
      f.attackDur = 0.34;
      f.attackTimer = 0.34;
      f.hitTargets.clear();
      f.activeHitbox = { ox: 0, oy: -28, r: 42, dmg: mv.dmg * pwr, kb: mv.kb, kbg: mv.kbg, angle: 72 };
      window.GG2DE_AUDIO?.play('doublejump');
      spawnParticles(m, f.x, f.y - 12, f.def.palette.glow, 14, 210, 0.35);
    } else if (mv.kind === 'dash') {
      f.dashAttackTimer = mv.dur || 0.24;
      f.dashAttackMove = mv;
      f.superArmor = !!mv.armor;
      f.vy = Math.min(f.vy, -40);
      f.vx = f.face * (mv.dashVx || 620);
      f.attackDur = mv.dur || 0.24;
      f.attackTimer = mv.dur || 0.24;
      f.hitTargets.clear();
      f.activeHitbox = {
        ox: f.face * 22, oy: -24, r: 36,
        dmg: mv.dmg * pwr, kb: mv.kb, kbg: mv.kbg, angle: 38,
        healOnHit: mv.healOnHit || 0, smash: true
      };
      window.GG2DE_AUDIO?.play('dash');
      spawnParticles(m, f.x, f.y - 20, f.def.palette.glow, 10, 180, 0.3);
    } else if (mv.kind === 'proj') {
      f.specialCd = mv.cd || 0.38;
      f.attackDur = 0.2;
      f.attackTimer = 0.2;
      m.projectiles.push({
        owner: f.index, team: f.team, kind: mv.projType || 'pulse',
        x: f.x + f.face * 24, y: f.y - 26,
        vx: f.face * (mv.speed || 700), vy: mv.projType === 'hatchet' ? -130 : 0,
        gravity: mv.projType === 'hatchet' ? 540 : 0,
        r: mv.projType === 'fireball' || mv.projType === 'wave' ? 14 : 9,
        dmg: mv.dmg * pwr, kb: mv.kb, kbg: mv.kbg, angle: 40,
        life: 1.5, color: f.def.palette.glow, homing: mv.projType === 'homing'
      });
      window.GG2DE_AUDIO?.play('proj');
    } else if (mv.kind === 'toss') {
      f.specialCd = mv.cd || 0.5;
      f.attackDur = 0.22;
      f.attackTimer = 0.22;
      m.projectiles.push({
        owner: f.index, team: f.team, kind: mv.projType || 'grenade',
        x: f.x + f.face * 20, y: f.y - 32,
        vx: f.face * 420, vy: -340, gravity: 1050,
        r: mv.projType === 'boulder' ? 16 : 11,
        dmg: mv.dmg * pwr, kb: mv.kb, kbg: mv.kbg, angle: 45,
        life: 1.6, color: f.def.palette.glow, explode: true
      });
      window.GG2DE_AUDIO?.play('proj');
    } else if (mv.kind === 'burst') {
      f.attackDur = 0.32;
      f.attackTimer = 0.32;
      f.hitTargets.clear();
      f.activeHitbox = { ox: 0, oy: -22, r: mv.range || 88, dmg: mv.dmg * pwr, kb: mv.kb, kbg: mv.kbg, angle: 50, smash: true };
      window.GG2DE_AUDIO?.play('smash');
      spawnParticles(m, f.x, f.y - 20, f.def.palette.glow, 20, 280, 0.38);
    } else if (mv.kind === 'counter') {
      f.counterTimer = mv.dur || 0.45;
      f.counterMove = mv;
      f.attackDur = mv.dur || 0.45;
      f.attackTimer = mv.dur || 0.45;
      window.GG2DE_AUDIO?.play('shield');
    } else if (mv.kind === 'reflect') {
      f.reflectTimer = mv.dur || 0.46;
      f.attackDur = 0.3;
      f.attackTimer = 0.3;
      f.hitTargets.clear();
      f.activeHitbox = { ox: 0, oy: -24, r: 58, dmg: mv.dmg * pwr, kb: mv.kb, kbg: mv.kbg, angle: 45 };
      window.GG2DE_AUDIO?.play('shield');
    } else if (mv.kind === 'heal') {
      f.healCd = mv.cd || 3.6;
      f.pct = Math.max(0, f.pct - (mv.heal || 12));
      f.attackDur = 0.28;
      f.attackTimer = 0.28;
      f.hitTargets.clear();
      f.activeHitbox = { ox: 0, oy: -22, r: 64, dmg: mv.dmg * pwr, kb: mv.kb, kbg: mv.kbg, angle: 48 };
      window.GG2DE_AUDIO?.play('heal');
      addPopup(m, `-${mv.heal || 12}%`, f.x, f.y - 62, '#4ade80');
      spawnParticles(m, f.x, f.y - 24, '#4ade80', 16, 200, 0.4);
    } else if (mv.kind === 'turret') {
      f.healCd = mv.cd || 4.0;
      f.attackDur = 0.25;
      f.attackTimer = 0.25;
      // Keep max 1 active turret per engineer
      m.turrets = m.turrets.filter((tr) => tr.owner !== f.index);
      m.turrets.push({
        owner: f.index, team: f.team, x: f.x + f.face * 24, y: f.y,
        face: f.face, cd: 0.5, life: 9.0, color: f.def.palette.glow
      });
      window.GG2DE_AUDIO?.play('select');
      addPopup(m, 'TURRET DEPLOYED', f.x, f.y - 56, '#fde047');
    }
  }

  function updateAI(m, f, dt) {
    f.aiTimer -= dt;
    if (f.aiTimer > 0) return f.aiInput;

    const diff = f.cpuLevel;
    f.aiTimer = diff === 'legend' ? 0.06 : diff === 'veteran' ? 0.11 : 0.2;

    const inp = { x: 0, y: 0, jump: false, attack: false, special: false, shield: false, smash: false };
    const mainPlat = m.platforms.find((p) => p.solid) || m.platforms[0];
    const stageCenterX = mainPlat ? mainPlat.x + mainPlat.w * 0.5 : 0;
    const stageTopY = mainPlat ? mainPlat.y : 120;

    // 1. Recovery logic if offstage or near lava/void
    const overVoid = !m.platforms.some((p) => f.x >= p.x - 10 && f.x <= p.x + p.w + 10 && f.y <= p.y + 40);
    if (overVoid || f.y > stageTopY + 36) {
      inp.x = f.x < stageCenterX ? 1 : -1;
      if (f.onLedge) {
        inp.jump = true;
      } else if (f.vy > 30 && f.jumpsLeft > 0) {
        inp.jump = true;
      } else if (f.vy > 60 && !f.upBUsed && f.y > stageTopY - 20) {
        inp.y = -1;
        inp.special = true;
      }
      f.aiInput = inp;
      return inp;
    }

    // 2. Target selection (Ley Core if close & high-skill, or nearest opponent)
    let target = null;
    let bestDist = Infinity;
    for (const o of m.fighters) {
      if (o.index === f.index || o.team === f.team || o.eliminated || o.respawnTimer > 0) continue;
      const d = Math.hypot(o.x - f.x, o.y - f.y);
      if (d < bestDist) { bestDist = d; target = o; }
    }

    if (m.leyCore && diff !== 'rookie') {
      const ld = Math.hypot(m.leyCore.x - f.x, m.leyCore.y - f.y);
      if (ld < 260) target = { x: m.leyCore.x, y: m.leyCore.y + 24, pct: 0, isOrb: true };
    }

    if (!target) { f.aiInput = inp; return inp; }

    const dx = target.x - f.x;
    const dy = target.y - f.y;

    // Use Ultimate immediately when facing an enemy!
    if (f.hasUltimate && Math.abs(dx) < 280 && Math.abs(dy) < 120) {
      inp.x = 0; inp.y = 0; inp.special = true;
      f.aiInput = inp;
      return inp;
    }

    // Heal if Support and hurt
    if (f.def.moves.down?.kind === 'heal' && f.healCd <= 0 && f.pct > 45 && bestDist > 130) {
      inp.y = 1; inp.special = true;
      f.aiInput = inp;
      return inp;
    }

    // Move toward target
    if (Math.abs(dx) > 42) inp.x = Math.sign(dx);
    if (dy < -70 && f.onGround) inp.jump = true;
    if (dy < -110 && !f.onGround && f.vy > 0 && f.jumpsLeft > 0) inp.jump = true;

    // Combat actions
    if (Math.abs(dx) < 62 && Math.abs(dy) < 55) {
      const roll = Math.random();
      if (diff !== 'rookie' && target.attackTimer > 0.1 && roll < 0.25) {
        inp.shield = true;
      } else if (!f.onGround && dy > 22) {
        inp.y = 1; inp.attack = true; // Meteor spike!
      } else if ((target.pct || 0) > 80 && f.onGround && roll < 0.45) {
        inp.x = Math.sign(dx) || f.face;
        inp.smash = true;
      } else if (roll < 0.72) {
        inp.attack = true;
      } else {
        inp.x = Math.sign(dx) || f.face;
        inp.special = true;
      }
    } else if (Math.abs(dx) < 260 && Math.abs(dy) < 60 && Math.random() < (diff === 'legend' ? 0.32 : 0.16)) {
      inp.x = 0; inp.y = 0;
      if (Math.sign(dx)) f.face = Math.sign(dx);
      inp.special = true;
    }

    f.aiInput = inp;
    return inp;
  }

  function handleKO(m, f) {
    const b = m.stage.bounds;
    let koDir = null;
    if (f.x < b.left) koDir = { x: b.left + 20, y: clamp(f.y, b.top + 60, b.bottom - 60), ang: 0 };
    else if (f.x > b.right) koDir = { x: b.right - 20, y: clamp(f.y, b.top + 60, b.bottom - 60), ang: Math.PI };
    else if (f.y < b.top) koDir = { x: clamp(f.x, b.left + 60, b.right - 60), y: b.top + 20, ang: Math.PI * 0.5 };
    else if (f.y > b.bottom) koDir = { x: clamp(f.x, b.left + 60, b.right - 60), y: b.bottom - 20, ang: -Math.PI * 0.5 };

    if (!koDir) return;

    m.koBeams.push({ x: koDir.x, y: koDir.y, ang: koDir.ang, color: f.color, life: 0.6 });
    m.shake = 18;
    window.GG2DE_AUDIO?.play('ko');
    spawnParticles(m, koDir.x, koDir.y, f.color, 34, 420, 0.55);

    f.falls += 1;
    if (f.lastHitBy >= 0 && m.time - f.lastHitAt < 6.0 && m.fighters[f.lastHitBy]) {
      m.fighters[f.lastHitBy].kos += 1;
    }

    if (m.mode === 'stock') {
      f.stocks = Math.max(0, f.stocks - 1);
      if (f.stocks <= 0) {
        f.eliminated = true;
        addPopup(m, `${f.tag} ELIMINATED!`, 0, -40, f.color);
        checkMatchEnd(m);
        return;
      }
    }

    // Respawn
    f.pct = m.suddenDeath ? 300 : 0;
    f.vx = 0; f.vy = 0;
    f.hitstun = 0;
    f.dizzyTimer = 0;
    f.shieldHp = 100;
    f.hasUltimate = false;
    f.onLedge = null;
    f.lastHitBy = -1;
    f.respawnTimer = 0.85;
    const sp = m.stage.spawns[f.index % m.stage.spawns.length];
    f.x = sp[0];
    f.y = sp[1] - 110;
    f.invuln = 2.0;
  }

  function checkMatchEnd(m) {
    if (m.over || m.mode === 'training') return;
    if (m.mode === 'stock') {
      const aliveTeams = new Set(m.fighters.filter((f) => !f.eliminated).map((f) => f.team));
      if (aliveTeams.size <= 1) {
        m.over = true;
        const alive = m.fighters.filter((f) => !f.eliminated);
        m.winner = alive[0] || m.fighters[0];
        m.bannerText = `${m.winner.tag} WINS!`;
        m.bannerTimer = 4.0;
        window.GG2DE_AUDIO?.play('win');
      }
    }
  }

  function stepFighter(m, f, inp, dt) {
    if (f.eliminated) return;
    if (f.respawnTimer > 0) {
      f.respawnTimer -= dt;
      return;
    }

    f.invuln = Math.max(0, f.invuln - dt);
    f.ledgeCooldown = Math.max(0, f.ledgeCooldown - dt);
    f.dropTimer = Math.max(0, f.dropTimer - dt);
    f.specialCd = Math.max(0, f.specialCd - dt);
    f.healCd = Math.max(0, f.healCd - dt);
    f.counterTimer = Math.max(0, f.counterTimer - dt);
    f.reflectTimer = Math.max(0, f.reflectTimer - dt);
    f.ultTimer = Math.max(0, f.ultTimer - dt);

    if (f.dizzyTimer > 0) {
      f.dizzyTimer -= dt;
      f.vx *= Math.pow(0.08, dt);
      f.vy = Math.min(MAX_FALL, f.vy + GRAVITY * dt);
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      resolvePlatforms(m, f, false);
      handleKO(m, f);
      return;
    }

    const jumpPressed = inp.jump && !f.prevJump;
    const attackPressed = inp.attack && !f.prevAttack;
    const specialPressed = inp.special && !f.prevSpecial;
    const smashPressed = inp.smash && !f.prevSmash;
    const shieldPressed = inp.shield && !f.prevShield;
    f.prevJump = !!inp.jump;
    f.prevAttack = !!inp.attack;
    f.prevSpecial = !!inp.special;
    f.prevSmash = !!inp.smash;
    f.prevShield = !!inp.shield;

    if (f.dodgeTimer > 0) {
      f.dodgeTimer -= dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (!f.onGround) f.vy = Math.min(MAX_FALL, f.vy + GRAVITY * 0.55 * dt);
      resolvePlatforms(m, f, false);
      handleKO(m, f);
      return;
    }

    // Attack / Dash-special active window
    if (f.attackTimer > 0) {
      f.attackTimer = Math.max(0, f.attackTimer - dt);
      if (f.attackTimer <= 0) {
        f.activeHitbox = null;
        f.superArmor = false;
      }
    }

    if (f.dashAttackTimer > 0) {
      f.dashAttackTimer -= dt;
      if (f.dashAttackTimer <= 0) f.superArmor = false;
    }

    // Charging smash release
    if (f.chargeTime > 0) {
      if (inp.smash && f.chargeTime < 0.85) {
        f.chargeTime += dt;
        f.vx *= 0.8;
        return;
      } else {
        releaseSmash(m, f);
      }
    }

    if (f.hitstun > 0) {
      f.hitstun -= dt;
      f.tumbleAngle += dt * 14 * Math.sign(f.vx || 1);
      // Directional Influence (DI)
      f.vx += inp.x * 160 * dt;
      f.vy = Math.min(MAX_FALL, f.vy + GRAVITY * dt);
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (m.time % 0.08 < dt) spawnParticles(m, f.x, f.y - 20, 'rgba(226,232,240,0.6)', 1, 20, 0.25);
      resolvePlatforms(m, f, false);
      handleKO(m, f);
      return;
    }

    // Ledge Hang State
    if (f.onLedge) {
      const plat = f.onLedge.plat;
      f.x = f.onLedge.side < 0 ? plat.x - 10 : plat.x + plat.w + 10;
      f.y = plat.y + 26;
      f.vx = 0; f.vy = 0;
      f.face = f.onLedge.side < 0 ? 1 : -1;
      if (jumpPressed) {
        f.onLedge = null;
        f.vy = -f.def.stats.jump;
        f.vx = f.face * 170;
        f.ledgeCooldown = 0.35;
        window.GG2DE_AUDIO?.play('jump');
      } else if (attackPressed) {
        startAttack(m, f, inp, false);
      } else if (inp.y > 0.5) {
        f.onLedge = null;
        f.ledgeCooldown = 0.4;
      } else if (inp.x * f.face > 0.5) {
        f.x = f.onLedge.side < 0 ? plat.x + 22 : plat.x + plat.w - 22;
        f.y = plat.y;
        f.onLedge = null;
        f.onGround = true;
      }
      return;
    }

    // Shielding / Dodge
    if (f.onGround && inp.shield && f.attackTimer <= 0) {
      f.shielding = true;
      f.shieldHp = Math.max(0, f.shieldHp - 18 * dt);
      f.vx *= 0.8;
      if (Math.abs(inp.x) > 0.55) {
        // Roll Dodge
        f.shielding = false;
        f.dodgeTimer = 0.22;
        f.invuln = 0.22;
        f.vx = Math.sign(inp.x) * 520;
        f.face = -Math.sign(inp.x);
        window.GG2DE_AUDIO?.play('dash');
        return;
      } else if (inp.y > 0.55) {
        // Spot Dodge
        f.shielding = false;
        f.dodgeTimer = 0.2;
        f.invuln = 0.2;
        return;
      }
      if (f.shieldHp <= 0) {
        f.shielding = false;
        f.dizzyTimer = 2.6;
        f.vy = -520;
        window.GG2DE_AUDIO?.play('shieldbreak');
      }
      return;
    } else {
      f.shielding = false;
      f.shieldHp = Math.min(100, f.shieldHp + 16 * dt);
    }

    // Air Dodge
    if (!f.onGround && shieldPressed && !f.airDodgeUsed && f.attackTimer <= 0) {
      f.airDodgeUsed = true;
      f.dodgeTimer = 0.24;
      f.invuln = 0.22;
      f.vx = inp.x * 360;
      f.vy = inp.y * 280 - 60;
      window.GG2DE_AUDIO?.play('dash');
      spawnParticles(m, f.x, f.y - 20, '#e2e8f0', 6, 120, 0.22);
      return;
    }

    // Specials & Attacks
    if (specialPressed) {
      startSpecial(m, f, inp);
    } else if (attackPressed || smashPressed) {
      startAttack(m, f, inp, smashPressed);
    }

    // Horizontal Movement
    const st = f.def.stats;
    if (f.dashAttackTimer <= 0) {
      const targetVx = inp.x * (f.onGround ? st.speed : st.airSpeed);
      const accel = f.onGround ? 2400 : 1450;
      const diff = targetVx - f.vx;
      const step = clamp(diff, -accel * dt, accel * dt);
      if (f.onGround && f.attackTimer > 0) {
        f.vx *= Math.pow(0.05, dt);
      } else {
        f.vx += step;
      }
      if (f.onGround && Math.abs(inp.x) > 0.2 && f.attackTimer <= 0) {
        f.face = Math.sign(inp.x);
      }
    }

    // Crouch / Drop through semi-solid platform
    f.crouching = f.onGround && inp.y > 0.55;
    if (f.crouching && f.standingPlat && !f.standingPlat.solid) {
      f.dropTimer = 0.22;
      f.onGround = false;
      f.standingPlat = null;
      f.y += 4;
    }

    // Jumping & Double Jump
    if (jumpPressed) {
      if (f.onGround) {
        f.vy = -st.jump;
        f.onGround = false;
        f.jumpsLeft = 1;
        window.GG2DE_AUDIO?.play('jump');
        spawnParticles(m, f.x, f.y, '#cbd5e1', 5, 90, 0.22);
      } else if (f.jumpsLeft > 0) {
        f.vy = -st.jump * 0.94;
        f.jumpsLeft -= 1;
        window.GG2DE_AUDIO?.play('doublejump');
        spawnParticles(m, f.x, f.y, f.def.palette.glow, 8, 120, 0.25);
      }
    }

    // Variable jump height (short hop!)
    if (!inp.jump && f.vy < -220 && f.dashAttackTimer <= 0 && !f.upBUsed) {
      f.vy += GRAVITY * 1.4 * dt;
    }

    // Gravity + Fast-Fall
    const fastFall = !f.onGround && inp.y > 0.6 && f.vy > 0;
    const grav = GRAVITY * (fastFall ? FAST_FALL_MULT : 1);
    f.vy = Math.min(MAX_FALL * (fastFall ? 1.2 : 1), f.vy + grav * dt);

    const prevY = f.y;
    f.x += f.vx * dt;
    f.y += f.vy * dt;

    resolvePlatforms(m, f, inp.y > 0.5, prevY);

    // Forge lava hazard check
    if (m.stage.lavaY !== undefined && f.y >= m.stage.lavaY) {
      applyHit(m, null, f, { dmg: 14, kb: 440, kbg: 1.05, angle: 82, dir: 1, smash: true }, f.x, m.stage.lavaY);
    }

    handleKO(m, f);
  }

  function resolvePlatforms(m, f, holdingDown, prevY) {
    const pyBefore = prevY !== undefined ? prevY : f.y;
    f.onGround = false;
    f.standingPlat = null;

    for (const p of m.platforms) {
      const withinX = f.x >= p.x - 8 && f.x <= p.x + p.w + 8;
      if (!p.solid && (f.dropTimer > 0 || holdingDown)) continue;

      if (withinX && f.vy >= 0 && pyBefore <= p.y + 8 && f.y >= p.y) {
        f.y = p.y;
        f.vy = 0;
        f.onGround = true;
        f.standingPlat = p;
        f.jumpsLeft = 2;
        f.upBUsed = false;
        f.airDodgeUsed = false;
        break;
      }

      // Ledge grab detection
      if (p.ledges && f.ledgeCooldown <= 0 && !holdingDown && !f.onGround && f.vy > -60 && f.hitstun <= 0) {
        if (Math.abs(f.x - p.x) < 22 && Math.abs(f.y - (p.y + 18)) < 26) {
          f.onLedge = { plat: p, side: -1 };
          f.jumpsLeft = 1;
          f.upBUsed = false;
          f.airDodgeUsed = false;
          f.invuln = Math.max(f.invuln, 0.85);
          window.GG2DE_AUDIO?.play('ledge');
          return;
        }
        if (Math.abs(f.x - (p.x + p.w)) < 22 && Math.abs(f.y - (p.y + 18)) < 26) {
          f.onLedge = { plat: p, side: 1 };
          f.jumpsLeft = 1;
          f.upBUsed = false;
          f.airDodgeUsed = false;
          f.invuln = Math.max(f.invuln, 0.85);
          window.GG2DE_AUDIO?.play('ledge');
          return;
        }
      }
    }
  }

  function stepMatch(m, inputsByPlayer, dt) {
    if (m.over) {
      m.bannerTimer = Math.max(0, m.bannerTimer - dt);
      return;
    }

    if (m.hitStop > 0) {
      m.hitStop = Math.max(0, m.hitStop - dt);
      m.shake = Math.max(0, m.shake - dt * 40);
      return;
    }

    m.time += dt;
    m.shake = Math.max(0, m.shake - dt * 32);
    m.platforms = window.GG2DE_STAGES.getPlatformsAt(m.stage, m.time);

    if (m.countdown > 0) {
      m.countdown -= dt;
      const n = Math.ceil(m.countdown);
      if (n !== m.lastCountNum && n >= 1 && n <= 3) {
        m.lastCountNum = n;
        m.bannerText = String(n);
        window.GG2DE_AUDIO?.play('tick');
      }
      if (m.countdown <= 0) {
        m.bannerText = 'MASH!';
        m.bannerTimer = 0.85;
        window.GG2DE_AUDIO?.play('go');
      }
      updateCamera(m, dt);
      return;
    }

    if (m.bannerTimer > 0) m.bannerTimer = Math.max(0, m.bannerTimer - dt);

    // Timed mode clock & Sudden Death
    if (m.mode === 'timed' && !m.suddenDeath) {
      m.matchTimeLeft -= dt;
      if (m.matchTimeLeft <= 0) {
        m.matchTimeLeft = 0;
        const ranked = [...m.fighters].sort((a, b) => (b.kos - b.falls) - (a.kos - a.falls));
        const topScore = ranked[0].kos - ranked[0].falls;
        const tied = ranked.filter((x) => (x.kos - x.falls) === topScore);
        if (tied.length > 1) {
          m.suddenDeath = true;
          m.bannerText = 'SUDDEN DEATH! 300%';
          m.bannerTimer = 2.0;
          window.GG2DE_AUDIO?.play('ultimate');
          for (const f of m.fighters) {
            if (tied.includes(f)) {
              f.pct = 300;
              f.stocks = 1;
              const sp = m.stage.spawns[f.index % m.stage.spawns.length];
              f.x = sp[0]; f.y = sp[1]; f.vx = 0; f.vy = 0;
            } else {
              f.eliminated = true;
            }
          }
          m.mode = 'stock';
        } else {
          m.over = true;
          m.winner = ranked[0];
          m.bannerText = `${m.winner.tag} WINS!`;
          m.bannerTimer = 4.0;
          window.GG2DE_AUDIO?.play('win');
        }
      }
    }

    // Step Fighters
    for (const f of m.fighters) {
      const inp = f.isCpu ? updateAI(m, f, dt) : (inputsByPlayer[f.playerNum] || { x: 0, y: 0 });
      stepFighter(m, f, inp, dt);
    }

    // Active Melee Hitboxes vs Fighters / Ley Core / Crates
    for (const f of m.fighters) {
      if (!f.activeHitbox || f.eliminated || f.respawnTimer > 0) continue;
      const hb = f.activeHitbox;
      const hx = f.x + hb.ox;
      const hy = f.y + hb.oy;

      for (const t of m.fighters) {
        if (t.index === f.index || t.team === f.team || f.hitTargets.has(t.index)) continue;
        if (t.eliminated || t.respawnTimer > 0) continue;
        if (Math.hypot(t.x - hx, (t.y - 24) - hy) <= hb.r + 18) {
          f.hitTargets.add(t.index);
          applyHit(m, f, t, hb, hx, hy);
        }
      }

      if (m.leyCore && Math.hypot(m.leyCore.x - hx, m.leyCore.y - hy) <= hb.r + 22) {
        damageLeyCore(m, f, hb.dmg);
      }

      for (let i = m.items.length - 1; i >= 0; i--) {
        const it = m.items[i];
        if (it.kind === 'crate' && Math.hypot(it.x - hx, (it.y - 16) - hy) <= hb.r + 20) {
          breakCrate(m, i);
        }
      }
    }

    // Step Projectiles
    for (let i = m.projectiles.length - 1; i >= 0; i--) {
      const p = m.projectiles[i];
      p.life -= dt;
      if (p.gravity) p.vy += p.gravity * dt;

      if (p.homing) {
        const tgt = m.fighters.find((x) => x.team !== p.team && !x.eliminated && x.respawnTimer <= 0);
        if (tgt) {
          const ang = Math.atan2((tgt.y - 24) - p.y, tgt.x - p.x);
          p.vx += Math.cos(ang) * 480 * dt;
          p.vy += Math.sin(ang) * 480 * dt;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      let hit = false;
      for (const t of m.fighters) {
        if (t.team === p.team || t.eliminated || t.respawnTimer > 0) continue;
        if (Math.hypot(t.x - p.x, (t.y - 24) - p.y) <= p.r + 18) {
          if (t.reflectTimer > 0) {
            p.team = t.team;
            p.owner = t.index;
            p.vx = -p.vx * 1.3;
            p.vy = -p.vy * 1.3;
            p.dmg *= 1.35;
            window.GG2DE_AUDIO?.play('counter');
            addPopup(m, 'REFLECT!', t.x, t.y - 60, '#38bdf8');
          } else {
            const owner = m.fighters[p.owner] || null;
            applyHit(m, owner, t, { dmg: p.dmg, kb: p.kb, kbg: p.kbg, angle: p.angle, dir: Math.sign(p.vx) || 1, smash: p.smash }, p.x, p.y);
            hit = true;
          }
          break;
        }
      }

      if (!hit && m.leyCore && Math.hypot(m.leyCore.x - p.x, m.leyCore.y - p.y) <= p.r + 22) {
        damageLeyCore(m, m.fighters[p.owner], p.dmg);
        hit = true;
      }

      if (hit || p.life <= 0) {
        if (p.explode) spawnParticles(m, p.x, p.y, p.color, 14, 240, 0.35);
        m.projectiles.splice(i, 1);
      }
    }

    // Step Engineer Turrets
    for (let i = m.turrets.length - 1; i >= 0; i--) {
      const tr = m.turrets[i];
      tr.life -= dt;
      tr.cd -= dt;
      if (tr.cd <= 0) {
        const tgt = m.fighters.find((x) => x.team !== tr.team && !x.eliminated && x.respawnTimer <= 0 && Math.hypot(x.x - tr.x, x.y - tr.y) < 340);
        if (tgt) {
          tr.face = tgt.x >= tr.x ? 1 : -1;
          tr.cd = 1.05;
          m.projectiles.push({
            owner: tr.owner, team: tr.team, kind: 'pulse',
            x: tr.x + tr.face * 16, y: tr.y - 10,
            vx: tr.face * 620, vy: 0, r: 6,
            dmg: 4.5, kb: 140, kbg: 0.65, angle: 35, life: 0.8, color: tr.color
          });
          window.GG2DE_AUDIO?.play('proj');
        }
      }
      if (tr.life <= 0) m.turrets.splice(i, 1);
    }

    // Items & Ley Core spawning
    if (m.itemsEnabled && m.mode !== 'training') {
      m.leyCoreTimer -= dt;
      if (!m.leyCore && m.leyCoreTimer <= 0) {
        m.leyCoreTimer = 24;
        m.leyCore = { x: -340, y: -70, vx: 110, hp: 28, hitCd: 0 };
        addPopup(m, 'LEY CORE APPEARED!', 0, -140, '#fde047');
      }

      m.itemTimer -= dt;
      if (m.itemTimer <= 0 && m.items.length < 3) {
        m.itemTimer = 11;
        const kinds = ['crate', 'ale', 'bomb'];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        m.items.push({ kind, x: (Math.random() - 0.5) * 320, y: -180, vy: 0 });
      }
    }

    if (m.leyCore) {
      const o = m.leyCore;
      o.hitCd = Math.max(0, o.hitCd - dt);
      o.x += o.vx * dt;
      o.y = -65 + Math.sin(m.time * 2.4) * 42;
      if (o.x > 340 || o.x < -340) o.vx = -o.vx;
    }

    // Step Items
    for (let i = m.items.length - 1; i >= 0; i--) {
      const it = m.items[i];
      it.vy = Math.min(500, it.vy + 900 * dt);
      const py = it.y;
      it.y += it.vy * dt;
      for (const p of m.platforms) {
        if (it.x >= p.x && it.x <= p.x + p.w && it.vy >= 0 && py <= p.y + 6 && it.y >= p.y) {
          it.y = p.y;
          it.vy = 0;
          break;
        }
      }
      if (it.kind !== 'crate') {
        for (const f of m.fighters) {
          if (f.eliminated || f.respawnTimer > 0) continue;
          if (Math.hypot(f.x - it.x, (f.y - 20) - it.y) < 30) {
            if (it.kind === 'ale') {
              f.pct = Math.max(0, f.pct - 25);
              window.GG2DE_AUDIO?.play('heal');
              addPopup(m, 'FORGE ALE -25%', f.x, f.y - 60, '#4ade80');
            } else if (it.kind === 'bomb') {
              applyHit(m, null, f, { dmg: 18, kb: 430, kbg: 1.15, angle: 65, dir: 1, smash: true }, it.x, it.y);
            } else {
              f.hasUltimate = true;
              window.GG2DE_AUDIO?.play('orb');
              addPopup(m, 'SURGE CHARGED!', f.x, f.y - 60, '#fde047');
            }
            m.items.splice(i, 1);
            break;
          }
        }
      }
      if (it && it.y > m.stage.bounds.bottom) m.items.splice(i, 1);
    }

    // Step Particles / Popups / KO Beams
    for (let i = m.particles.length - 1; i >= 0; i--) {
      const p = m.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) m.particles.splice(i, 1);
    }
    for (let i = m.popups.length - 1; i >= 0; i--) {
      m.popups[i].life -= dt;
      m.popups[i].y -= 28 * dt;
      if (m.popups[i].life <= 0) m.popups.splice(i, 1);
    }
    for (let i = m.koBeams.length - 1; i >= 0; i--) {
      m.koBeams[i].life -= dt;
      if (m.koBeams[i].life <= 0) m.koBeams.splice(i, 1);
    }

    updateCamera(m, dt);
  }

  function damageLeyCore(m, attacker, dmg) {
    if (!m.leyCore || m.leyCore.hitCd > 0) return;
    m.leyCore.hitCd = 0.12;
    m.leyCore.hp -= dmg;
    spawnParticles(m, m.leyCore.x, m.leyCore.y, '#fde047', 10, 220, 0.3);
    if (m.leyCore.hp <= 0 && attacker) {
      attacker.hasUltimate = true;
      window.GG2DE_AUDIO?.play('orb');
      addPopup(m, 'ULTIMATE READY! (PRESS SPECIAL)', attacker.x, attacker.y - 74, '#fde047');
      spawnParticles(m, m.leyCore.x, m.leyCore.y, '#a855f7', 28, 340, 0.5);
      m.leyCore = null;
    }
  }

  function breakCrate(m, idx) {
    const c = m.items[idx];
    m.items.splice(idx, 1);
    window.GG2DE_AUDIO?.play('hit');
    spawnParticles(m, c.x, c.y - 16, '#d97706', 14, 220, 0.35);
    const drop = Math.random() < 0.55 ? 'ale' : (Math.random() < 0.7 ? 'bomb' : 'surge');
    m.items.push({ kind: drop, x: c.x, y: c.y - 16, vy: -180 });
  }

  function updateCamera(m, dt) {
    const active = m.fighters.filter((f) => !f.eliminated && f.respawnTimer <= 0);
    if (!active.length) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const f of active) {
      minX = Math.min(minX, f.x);
      maxX = Math.max(maxX, f.x);
      minY = Math.min(minY, f.y - 30);
      maxY = Math.max(maxY, f.y - 30);
    }
    const tx = clamp((minX + maxX) * 0.5, -240, 240);
    const ty = clamp((minY + maxY) * 0.5 - 10, -140, 80);
    const span = Math.max(maxX - minX + 260, (maxY - minY + 200) * 1.78, 520);
    const ts = clamp(960 / span, 0.74, 1.32);

    const k = 1 - Math.exp(-6 * dt);
    m.cam.x += (tx - m.cam.x) * k;
    m.cam.y += (ty - m.cam.y) * k;
    m.cam.scale += (ts - m.cam.scale) * k;
  }

  window.GG2DE_ENGINE = {
    createMatch,
    stepMatch,
    TEAM_COLORS
  };
})();
