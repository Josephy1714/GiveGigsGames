(function () {
    'use strict';
    function giveSand(g, amount) {
        if (!g || !g.state) return;
        var state = g.state, fold = g.timefold;
        if (fold) {
            if (typeof fold.maxSand !== 'number') fold.maxSand = Number(state.maxChronoSand) || 100;
            fold.maxSand += amount;
            var sand = typeof fold.sand === 'number' ? fold.sand : (Number(state.chronoSand) || 0);
            if (typeof fold.addSand === 'function') sand = fold.addSand(amount);
            else { fold.sand = Math.min(fold.maxSand, sand + amount); sand = fold.sand; }
            state.maxChronoSand = fold.maxSand;
            state.chronoSand = sand;
        } else {
            state.maxChronoSand = (Number(state.maxChronoSand) || 100) + amount;
            state.chronoSand = Math.min(state.maxChronoSand, (Number(state.chronoSand) || 0) + amount);
        }
    }
    var decks = {
        gravegain1dA: [
            ['Moonrock Biscuit', 'Restore 6 health.', function (g) { g.run.hp = Math.min(g.run.maxHp, g.run.hp + 6); }],
            ['Ley-Line Chalk', 'Reveal the nearest threat.', function (g) { var s=g.run, f=s.enemies.filter(function(e){return e.hp>0;}).sort(function(a,b){return Math.abs(a.x-s.x)-Math.abs(b.x-s.x);})[0]; s.gigglesHint=f ? f.name+' · '+Math.abs(f.x-s.x)+' steps away' : 'No nearby danger. The line is clear.'; }],
            ['Brass Buckler', 'Gain 1 defense.', function (g) { g.run.def += 1; }],
            ['Lucky Thread', 'Gain 8 gold.', function (g) { g.run.gold += 8; }],
            ['Extra Tonic', 'Add a potion charge for a future rough patch.', function (g) { g.run.potions=Math.min(5,(g.run.potions||0)+1); }],
            ['Basilisk Buckle', 'Permanently gain 1 defense this run.', function (g) { g.run.def += 1; }],
            ['Trail Rations', 'Recover 4 health and gain 5 gold.', function (g) { g.run.hp=Math.min(g.run.maxHp,g.run.hp+4);g.run.gold+=5; }]
        ],
        gravegain2dA: [
            ['Lantern Oil', 'Restore 25 health.', function (g) { if(g.player)g.player.hp=Math.min(g.player.maxHp,g.player.hp+25); }],
            ['Repair Roll', 'Restore 30 stamina.', function (g) { if(g.player)g.player.stamina=Math.min(g.player.maxStamina,g.player.stamina+30); }],
            ['Room Sketch', 'Reveal the rooms on this floor.', function (g) { var rooms=g.dungeon&&g.dungeon.rooms||[];rooms.forEach(function(r){r.gigglesRevealed=true;});g.gigglesHint='Giggles’ map: '+rooms.length+' rooms marked, including the next safe room.'; }],
            ['Snack for the Road', 'Gain 20 gold.', function (g) { g.gold=(g.gold||0)+20; }],
            ['Shield Bubble', 'Restore your personal shield buffer.', function (g) { if(g.player){g.player.shieldBubble=Math.min(20,(g.player.shieldBubble||0)+12);g.player.shieldCooldown=0;} }],
            ['Basilisk Study', 'Gain experience toward your next level.', function (g) { if(g.player&&g.player.gainXp)g.player.gainXp(25); }],
            ['Emergency Dodge', 'Restore stamina and refresh your dodge.', function (g) { if(g.player){g.player.stamina=Math.min(g.player.maxStamina,g.player.stamina+25);g.player.dodgeTime=0;} }]
        ],
        gravegain2dB_RPG: [
            ['Lantern Oil', 'Restore 25 health.', function (g) { if(g.player)g.player.hp=Math.min(g.player.maxHp,g.player.hp+25); }],
            ['Repair Roll', 'Restore 30 stamina.', function (g) { if(g.player)g.player.stamina=Math.min(g.player.maxStamina,g.player.stamina+30); }],
            ['Room Sketch', 'Reveal the rooms on this floor.', function (g) { var rooms=g.dungeon&&g.dungeon.rooms||[];rooms.forEach(function(r){r.gigglesRevealed=true;});g.gigglesHint='Giggles’ map: '+rooms.length+' rooms marked, including the next safe room.'; }],
            ['Snack for the Road', 'Gain 20 gold.', function (g) { g.gold=(g.gold||0)+20; }]
        ],
        gravegain3dA: [
            ['Field Dressing', 'Restore 22 health.', function (g) { if(g.player)g.player.hp=Math.min(g.player.maxHp,g.player.hp+22); }],
            ['Stamina Chews', 'Restore 35 stamina.', function (g) { if(g.player)g.player.stamina=Math.min(g.player.maxStamina,g.player.stamina+35); }],
            ['Quick Repair', 'Restore a potion charge.', function (g) { if(g.player)g.player.potions=Math.min(5,(g.player.potions||0)+1); }],
            ['Pocket Change', 'Gain 25 gold.', function (g) { g.gold=(g.gold||0)+25; }],
            ['Basilisk Drill', 'Gain experience toward your next level.', function (g) { if(g.player&&g.player.addXp)g.player.addXp(30); }],
            ['Extra Field Tonic', 'Add a potion charge for a future fight.', function (g) { if(g.player)g.player.potions=Math.min(5,(g.player.potions||0)+1); }],
            ['Stamina Chews Plus', 'Recover 20 stamina and 5 health.', function (g) { if(g.player){g.player.stamina=Math.min(g.player.maxStamina,g.player.stamina+20);g.player.hp=Math.min(g.player.maxHp,g.player.hp+5);} }]
        ],
        gravegain3dB: [
            ['Field Dressing', 'Restore 22 health.', function (g) { if(g.player)g.player.hp=Math.min(g.player.maxHp,g.player.hp+22); }],
            ['Stamina Chews', 'Restore 35 stamina.', function (g) { if(g.player)g.player.stamina=Math.min(g.player.maxStamina,g.player.stamina+35); }],
            ['Quick Repair', 'Restore a potion charge.', function (g) { if(g.player)g.player.potions=Math.min(5,(g.player.potions||0)+1); }],
            ['Pocket Change', 'Gain 25 gold.', function (g) { g.gold=(g.gold||0)+25; }]
        ],
        gravegain4dA: [
            ['Chrono-Sand Pinch', 'Increase your rewind reserve and add 20 sand.', function (g) { giveSand(g,20); }],
            ['Safe Slice', 'Center the W-axis and steady your next shot.', function (g) { if(g.putt){if(g.putt.ball){g.putt.ball.w=0;if(g.state)g.state.w=0;}g.putt.gigglesAimUntil=Date.now()+15000;}else if(g.state)g.state.w=0; }],
            ['Gentle Launch', 'Boost your next putt’s launch power by 12%.', function (g) { if(g.putt)g.putt.gigglesPowerBonus=Math.min(0.5,(g.putt.gigglesPowerBonus||0)+0.12); }],
            ['Careful Aim', 'Steady the W-axis on your next putt.', function (g) { if(g.putt)g.putt.gigglesAimUntil=Date.now()+30000; }],
            ['Chrono-Sand Flask', 'Expand your rewind reserve and add 8 sand.', function (g) { giveSand(g,8); }],
            ['Timefold Reserve', 'Expand your rewind reserve and add 12 sand.', function (g) { giveSand(g,12); }],
            ['Soft Landing', 'Center the W-axis, steady your aim, and strengthen your next putt.', function (g) { if(g.putt){if(g.putt.ball){g.putt.ball.w=0;if(g.state)g.state.w=0;}g.putt.gigglesAimUntil=Date.now()+15000;g.putt.gigglesPowerBonus=Math.min(0.5,(g.putt.gigglesPowerBonus||0)+0.05);}else if(g.state)g.state.w=0; }]
        ],
        gravegain4dB: [
            ['Chrono-Sand Pinch', 'Increase your rewind reserve and add 20 sand.', function (g) { giveSand(g,20); }],
            ['Safe Slice', 'Center the W-axis and steady your next shot.', function (g) { if(g.putt){if(g.putt.ball){g.putt.ball.w=0;if(g.state)g.state.w=0;}g.putt.gigglesAimUntil=Date.now()+15000;}else if(g.state)g.state.w=0; }],
            ['Gentle Launch', 'Boost your next putt’s launch power by 12%.', function (g) { if(g.putt)g.putt.gigglesPowerBonus=Math.min(0.5,(g.putt.gigglesPowerBonus||0)+0.12); }],
            ['Careful Aim', 'Steady the W-axis on your next putt.', function (g) { if(g.putt)g.putt.gigglesAimUntil=Date.now()+30000; }],
            ['Chrono-Sand Flask', 'Expand your rewind reserve and add 8 sand.', function (g) { giveSand(g,8); }],
            ['Timefold Reserve', 'Expand your rewind reserve and add 12 sand.', function (g) { giveSand(g,12); }],
            ['Soft Landing', 'Center the W-axis, steady your aim, and strengthen your next putt.', function (g) { if(g.putt){if(g.putt.ball){g.putt.ball.w=0;if(g.state)g.state.w=0;}g.putt.gigglesAimUntil=Date.now()+15000;g.putt.gigglesPowerBonus=Math.min(0.5,(g.putt.gigglesPowerBonus||0)+0.05);}else if(g.state)g.state.w=0; }]
        ],
        gravegain5dA: [
            ['Paradox Picnic', 'Reduce paradox by 20.', function (g) { g.run.paradox=Math.max(0,g.run.paradox-20); }],
            ['Pocket Hourglass', 'Clear the collapse clock.', function (g) { g.run.doom=0; }],
            ['Moonrock Biscuit', 'Restore 8 health.', function (g) { g.run.hp=Math.min(g.run.maxHp,g.run.hp+8); }],
            ['Lucky Thread', 'Gain 15 gold.', function (g) { g.run.gold+=15; }],
            ['Stable Footing', 'Reduce paradox by another 10.', function (g) { g.run.paradox=Math.max(0,g.run.paradox-10); }],
            ['Basilisk Ward', 'Gain a one-turn ward that softens the next hit.', function (g) { g.run.ward=(g.run.ward||0)+2; }],
            ['Emergency Rations', 'Recover 5 health and gain 8 gold.', function (g) { g.run.hp=Math.min(g.run.maxHp,g.run.hp+5);g.run.gold+=8; }]
        ],
        gravegain5dB: [
            ['Paradox Picnic', 'Reduce paradox by 20.', function (g) { g.run.paradox=Math.max(0,g.run.paradox-20); }],
            ['Pocket Hourglass', 'Clear the collapse clock.', function (g) { g.run.doom=0; }],
            ['Moonrock Biscuit', 'Restore 8 health.', function (g) { g.run.hp=Math.min(g.run.maxHp,g.run.hp+8); }],
            ['Lucky Thread', 'Gain 15 gold.', function (g) { g.run.gold+=15; }]
        ],
        gravegain2dB: [
            ['Patch Kit', 'Restore 22 health.', function (g) { var p=g.run.player;p.hp=Math.min(p.maxHp,p.hp+22); }],
            ['Breach Battery', 'Refill alt ammo and ability.', function (g) { var p=g.run.player;p.altAmmo=Math.min(5,(p.altAmmo||0)+2);p.abilityCd=0; }],
            ['Steady Nerves', 'Clear screen shake and gain brief invulnerability.', function (g) { var p=g.run.player;p.iframes=Math.max(p.iframes||0,0.8);g.run.shake=0; }],
            ['Snack for the Road', 'Gain a bonus rescue life.', function (g) { g.run.lifeQueue.push(g.run.buildId); }],
            ['Blast Padding', 'Gain additional protection from the next hit.', function (g) { g.run.player.iframes=Math.max(g.run.player.iframes||0,1.5); }],
            ['Ammo Parcel', 'Refill alt ammo and recover health.', function (g) { var p=g.run.player;p.altAmmo=Math.min(5,(p.altAmmo||0)+1);p.hp=Math.min(p.maxHp,p.hp+10); }],
            ['Rescue Rations', 'Gain 12 gold and restore one ability charge.', function (g) { g.run.gold=(g.run.gold||0)+12;g.run.player.abilityCd=0; }]
        ],
        gravegain2dB_legacy: [
            ['Medkit', 'Restore 40 health.', function (g) { var p=g.world.players[g.pid];p.hp=Math.min(p.maxHp,p.hp+40); }],
            ['Basilisk Ward', 'Gain two seconds of protection.', function (g) { var p=g.world.players[g.pid];p.shieldUntil=g.world.tick+120; }],
            ['Fresh Magazines', 'Reset weapon and dash cooldowns.', function (g) { var p=g.world.players[g.pid];Object.keys(p.cooldowns).forEach(function(k){p.cooldowns[k]=0;}); }],
            ['Quick Reprieve', 'Recover 10 health and gain a brief protective shield.', function (g) { var p=g.world.players[g.pid];p.hp=Math.min(p.maxHp,p.hp+10);p.shieldUntil=Math.max(p.shieldUntil||0,g.world.tick)+60; }],
            ['Shield Battery', 'Extend your personal shield by two seconds.', function (g) { var p=g.world.players[g.pid];p.shieldUntil=Math.max(p.shieldUntil||0,g.world.tick)+120; }],
            ['Dash Magazine', 'Refresh your dash and alt-fire immediately.', function (g) { var p=g.world.players[g.pid];p.cooldowns.dash=0;p.cooldowns.alt=0; }]
        ]
    };
    // Historical runtime names use the same expanded deck as their catalog game.
    decks.gravegain2dB_RPG = decks.gravegain2dA;
    decks.gravegain3dB = decks.gravegain3dA;
    decks.gravegain4dB = decks.gravegain4dA;
    decks.gravegain5dB = decks.gravegain5dA;
    function pauseForDraft(game) {
        if (game && game.loop && typeof game.loop.stop === 'function' && typeof game.loop.start === 'function') {
            var loop = game.loop, wasPaused = !!loop.isPaused;
            if (!wasPaused) loop.stop();
            return function () { if (!wasPaused) loop.start(); };
        }
        if (game && typeof game.pause === 'function' && typeof game.resume === 'function') {
            var wasMethodPaused = !!game.paused;
            if (!wasMethodPaused) game.pause();
            return function () { if (!wasMethodPaused) game.resume(); };
        }
        if (game && typeof game.isPaused === 'boolean') {
            var wasIsPaused = game.isPaused;
            game.isPaused = true;
            return function () { game.isPaused = wasIsPaused; };
        }
        if (game && typeof game.paused === 'boolean') {
            var wasPausedFlag = game.paused;
            game.paused = true;
            return function () { game.paused = wasPausedFlag; };
        }
        return function () {};
    }
    function present(slug, game, onChoose, newRun) {
        if (!game) return;
        var deck=decks[slug];
        if (!deck) { console.warn('Giggles has no help deck for this GraveGain runtime:',slug); return; }
        if (newRun || !Number.isFinite(game.gigglesHelpUses)) game.gigglesHelpUses = 3;
        if (game.gigglesHelpUses <= 0) return;
        var pool=deck.slice(), options=[];
        while(options.length<3&&pool.length) options.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
        var old=document.getElementById('gigglesHelpDraft');if(old){if(old._releaseGame)old._releaseGame();old.remove();}
        var prior=document.getElementById('gigglesHelpReopen');if(prior)prior.remove();
        var releaseGame=pauseForDraft(game), inputGuard=function(e){if(e.key==='Tab')return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();later.click();return;}e.stopImmediatePropagation();};
        var panel=document.createElement('div');panel.id='gigglesHelpDraft';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
        panel._releaseGame=function(){window.removeEventListener('keydown',inputGuard,true);releaseGame();};
        panel.style.cssText='position:fixed;inset:0;z-index:100000;display:grid;place-items:center;background:rgba(3,5,13,.82);padding:16px;font:15px system-ui,sans-serif;color:#fff';
        var box=document.createElement('section');box.style.cssText='width:min(760px,100%);padding:22px;border:2px solid #cba55c;border-radius:16px;background:linear-gradient(145deg,#211b15,#101522);box-shadow:0 20px 80px #000';
        var heading=document.createElement('h2');heading.textContent='▰ GG · Giggles’ Help Case';box.appendChild(heading);
        var greetings={
            gravegain1dA:'I can read the Ley-Line a few steps ahead. Let’s take the next stretch together.',
            gravegain2dA:'I marked this floor’s rooms. Pick what would make this delve easier for you.',
            gravegain2dB_RPG:'I marked this floor’s rooms. Pick what would make this delve easier for you.',
            gravegain3dA:'I’m keeping watch on your field kit. Choose what you need for this floor.',
            gravegain3dB:'I’m keeping watch on your field kit. Choose what you need for this floor.',
            gravegain4dA:'I can steady the W-axis or bring back a little chrono-sand. Your call.',
            gravegain4dB:'I can steady the W-axis or bring back a little chrono-sand. Your call.',
            gravegain5dA:'The Arroyos are pulling apart. I found a little room to breathe.',
            gravegain5dB:'The Arroyos are pulling apart. I found a little room to breathe.',
            gravegain2dB:'I packed a rescue kit for this breach. Take whichever tool helps most.',
            gravegain2dB_legacy:'I brought backup for this breach. Take whichever tool helps most.'
        };
        var companion=document.createElement('div');companion.style.cssText='display:flex;align-items:center;gap:12px;margin:12px 0;padding:12px;border:1px solid rgba(203,165,92,.55);border-radius:12px;background:rgba(14,26,21,.72)';
        var avatar=document.createElement('div');avatar.setAttribute('role','img');avatar.setAttribute('aria-label','Giggles the Basilisk');avatar.textContent='🐍';avatar.style.cssText='display:grid;place-items:center;flex:0 0 54px;width:54px;height:54px;border:2px solid #8ccf8c;border-radius:50%;background:#18372b;font-size:32px;box-shadow:0 0 18px rgba(117,209,131,.25)';companion.appendChild(avatar);
        var speech=document.createElement('p');speech.textContent=greetings[slug]||'I brought a few useful things. Pick what would help you most.';speech.style.cssText='margin:0;color:#e4f3dd;line-height:1.5';companion.appendChild(speech);box.appendChild(companion);
        var intro=document.createElement('p');intro.textContent='Three useful things turned up in the briefcase. Choose one; you can pick up to three times this run. There is no cost and no obligation.';box.appendChild(intro);
        var list=document.createElement('div');list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px';
        options.forEach(function(choice){var b=document.createElement('button');b.type='button';b.style.cssText='min-height:112px;padding:14px;border:1px solid #cba55c;border-radius:10px;background:#2a251e;color:#ffe3a1;text-align:left;cursor:pointer';var title=document.createElement('strong');title.textContent=choice[0];b.appendChild(title);var desc=document.createElement('div');desc.textContent=choice[1];desc.style.cssText='margin-top:8px;color:#e7e2d8';b.appendChild(desc);b.addEventListener('click',function(){try{choice[2](game);}catch(e){console.warn('Giggles help could not be applied:',e);return;}game.gigglesHelpUses-=1;panel._releaseGame();panel.remove();var priorToast=document.getElementById('gigglesHelpToast');if(priorToast)priorToast.remove();var notice=document.createElement('div');notice.id='gigglesHelpToast';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');notice.textContent='▰ GG · '+choice[0]+' — Giggles is glad to help.';notice.style.cssText='position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:100001;max-width:min(92vw,560px);padding:10px 15px;border:1px solid #cba55c;border-radius:10px;background:rgba(28,22,15,.96);color:#ffe3a1;font:600 14px system-ui;text-align:center;box-shadow:0 8px 30px #000';document.body.appendChild(notice);setTimeout(function(){notice.remove();},4200);if(game.gigglesHelpUses>0){var reopen=document.createElement('button');reopen.id='gigglesHelpReopen';reopen.type='button';reopen.textContent='▰ GG · HELP ('+game.gigglesHelpUses+' left)';reopen.style.cssText='position:fixed;right:12px;bottom:12px;z-index:99999;padding:9px 13px;border:2px solid #cba55c;border-radius:9px;background:#241d14;color:#f3d487;font-weight:bold;cursor:pointer';reopen.addEventListener('click',function(){present(slug,game,onChoose);});document.body.appendChild(reopen);}if(onChoose)onChoose(choice[0]);if(game.player&&game.updateHUD)game.updateHUD();if(game.combatText&&game.combatText.showBanner)game.combatText.showBanner('▰ GG · '+choice[0]+' — Giggles is glad to help.');if(game.hud&&game.hud.popup)game.hud.popup('▰ GG · '+choice[0]+' chosen','info');if(game.run&&game.run.hp!==undefined){game.run.gigglesHint=choice[0]+' added to your kit';}});list.appendChild(b);});
        var later=document.createElement('button');later.type='button';later.textContent='Maybe later';later.style.cssText='margin-top:12px;padding:8px 12px;border:1px solid #8f8a7e;border-radius:8px;background:#171a20;color:#e7e2d8;cursor:pointer';later.addEventListener('click',function(){panel._releaseGame();panel.remove();if(game.gigglesHelpUses>0&&!document.getElementById('gigglesHelpReopen')){var reopen=document.createElement('button');reopen.id='gigglesHelpReopen';reopen.type='button';reopen.textContent='▰ GG · HELP ('+game.gigglesHelpUses+' left)';reopen.style.cssText='position:fixed;right:12px;bottom:12px;z-index:99999;padding:9px 13px;border:2px solid #cba55c;border-radius:9px;background:#241d14;color:#f3d487;font-weight:bold;cursor:pointer';reopen.addEventListener('click',function(){present(slug,game,onChoose);});document.body.appendChild(reopen);}});box.appendChild(later);
        box.appendChild(list);panel.appendChild(box);document.body.appendChild(panel);window.addEventListener('keydown',inputGuard,true);
    }
    window.GigglesHelpDraft={present:present};
})();
