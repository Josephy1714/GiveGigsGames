/* Semester Survival — mobile-first start and input controls. */
(function(root){
 'use strict';
 function boot(){
  const runtime=root.SemesterAdventureRuntimeInstance;
  const config=root.SEMESTER_SURVIVAL_ADVENTURE||{};
  const host=root.document.getElementById(config.mountId||'semester-survival-adventure');
  const shell=host&&host.querySelector('.ss-adventure-shell');
  if(!runtime||!shell||shell.dataset.mobileUiReady==='true')return;
  shell.dataset.mobileUiReady='true';
  const doc=root.document;
  const style=doc.createElement('style');
  style.textContent='.ss-adventure-shell{position:relative;touch-action:none}.ss-game-menu button,.ss-game-fullscreen,.ss-game-touch-btn{font-family:Inter,system-ui,sans-serif}';
  doc.head.appendChild(style);
  const make=(tag,cls,parent)=>{const el=doc.createElement(tag);el.className=cls;if(parent)parent.appendChild(el);return el;};
  const menu=make('section','ss-game-menu',shell);
  menu.setAttribute('aria-label','Start Jay’s University Adventure');
  const panel=make('div','ss-game-menu__panel',menu);
  const eyebrow=make('div','ss-game-menu__eyebrow',panel);eyebrow.textContent='GIVEGIGS ORIGINAL · 2.5D ADVENTURE';
  const heading=make('h1','',panel);heading.textContent='JAY’S UNIVERSITY ADVENTURE';
  const intro=make('p','',panel);intro.textContent='Your university journey starts here. Explore the residence, township, campus and city, meet people and build your story.';
  const play=make('button','ss-game-menu__play',panel);play.type='button';play.dataset.ssPlay='true';play.textContent='START ADVENTURE';
  const hint=make('p','ss-game-menu__hint',panel);hint.textContent='MOVE: hold ◀ / ▶  ·  SPRINT: hold RUN  ·  JUMP: tap ▲  ·  INTERACT: tap E';
  const fullscreen=make('button','ss-game-fullscreen',shell);fullscreen.type='button';fullscreen.dataset.ssFullscreen='true';fullscreen.setAttribute('aria-label','Enter fullscreen');fullscreen.textContent='⛶ FULLSCREEN';
  const controls=make('div','ss-game-touch-controls',shell);controls.setAttribute('aria-label','Touch gameplay controls');
  const leftGroup=make('div','ss-game-touch-group',controls);
  const rightGroup=make('div','ss-game-touch-group',controls);
  function control(parent,action,label,glyph,extra){
   const b=make('button','ss-game-touch-btn'+(extra?' ss-game-touch-btn--action':''),parent);
   b.type='button';b.dataset.ssAction=action;b.setAttribute('aria-label',label);
   b.innerHTML=glyph+(extra?'<small>'+label+'</small>':'');
   const down=e=>{e.preventDefault();b.classList.add('is-pressed');try{b.setPointerCapture(e.pointerId);}catch(_){}runtime.setVirtualInput(action,true);};
   const up=e=>{e.preventDefault();b.classList.remove('is-pressed');runtime.setVirtualInput(action,false);};
   b.addEventListener('pointerdown',down,{passive:false});
   b.addEventListener('pointerup',up,{passive:false});
   b.addEventListener('pointercancel',up,{passive:false});
   b.addEventListener('lostpointercapture',()=>{b.classList.remove('is-pressed');runtime.setVirtualInput(action,false);});
   return b;
  }
  control(leftGroup,'left','Move left','◀',false);
  control(leftGroup,'right','Move right','▶',false);
  control(rightGroup,'sprint','Run','⚡',true);
  control(rightGroup,'jump','Jump','▲',true);
  control(rightGroup,'interact','Interact','E',true);
  async function enterFullscreen(){
   try{
    if(shell.requestFullscreen){await shell.requestFullscreen({navigationUI:'hide'});}
    else throw new Error('Fullscreen API unavailable');
    if(root.screen&&root.screen.orientation&&root.screen.orientation.lock){
     try{await root.screen.orientation.lock('landscape');}catch(_){}
    }
    host.classList.remove('ss-game-immersive-fallback');
    return true;
   }catch(_){
    host.classList.add('ss-game-immersive-fallback');
    return false;
   }
  }
  async function toggleFullscreen(){
   if(doc.fullscreenElement){try{await doc.exitFullscreen();}catch(_){}}
   else if(host.classList.contains('ss-game-immersive-fallback'))host.classList.remove('ss-game-immersive-fallback');
   else await enterFullscreen();
  }
  play.addEventListener('click',async()=>{
   await enterFullscreen();
   menu.classList.add('is-hidden');
  });
  fullscreen.addEventListener('click',toggleFullscreen);
  doc.addEventListener('fullscreenchange',()=>{
   const active=doc.fullscreenElement===shell;
   fullscreen.textContent=active?'⤢ EXIT FULLSCREEN':'⛶ FULLSCREEN';
   fullscreen.setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');
   if(!active&&root.screen&&root.screen.orientation&&root.screen.orientation.unlock){
    try{root.screen.orientation.unlock();}catch(_){}
   }
  });
  doc.addEventListener('keydown',e=>{
   if((e.key==='f'||e.key==='F')&&!e.repeat){e.preventDefault();toggleFullscreen();}
  });
 }
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
})(window);
