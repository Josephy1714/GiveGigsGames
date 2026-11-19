/* Semester Survival — unified desktop/touch input intent layer.
 * Resolves modal priority before world movement and exposes intent, not DOM events.
 */
(function(root){
  'use strict';
  const EDITABLE = new Set(['INPUT','TEXTAREA','SELECT']);
  const KEY = Object.freeze({
    left:['ArrowLeft','a','A'], right:['ArrowRight','d','D'],
    jump:['Space','ArrowUp','w','W'], slide:['ArrowDown','s','S'],
    sprint:['Shift'], depthForward:['i','I'], depthBack:['k','K'], interact:['e','E','Enter'], phone:['Tab'], pause:['Escape']
  });
  function createInputManager(target, options){
    options=options||{};
    const pressed=new Set(), justPressed=new Set();
    let context={modalOpen:false,dialogueOpen:false,phoneOpen:false,paused:false};
    let pointer=null, touchAxis=0, touchAxisFrames=0, tapTarget=null, destroyed=false;
    const listeners=[];
    const bind=(node,event,fn,opts)=>{node.addEventListener(event,fn,opts);listeners.push(()=>node.removeEventListener(event,fn,opts));};
    function isUiBlocked(){return context.modalOpen||context.dialogueOpen||context.phoneOpen||context.paused||context.transitioning;}
    function isEditable(event){const el=event.target;return el&&((EDITABLE.has(el.tagName))||el.isContentEditable);}
    function onKeyDown(e){
      if(destroyed||isEditable(e))return;
      const key=e.code==='Space'?'Space':e.key;
      if(Object.values(KEY).some(keys=>keys.includes(key))){e.preventDefault();}
      if(!pressed.has(key))justPressed.add(key);
      pressed.add(key);
    }
    function onKeyUp(e){pressed.delete(e.code==='Space'?'Space':e.key);}
    function onBlur(){pressed.clear();justPressed.clear();pointer=null;touchAxis=0;touchAxisFrames=0;}
    function onPointerDown(e){
      if(destroyed||e.pointerType==='mouse')return;
      pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,time:Date.now()};
      tapTarget=e.target&&e.target.closest?e.target.closest('[data-game-interaction]'):null;
    }
    function onPointerUp(e){
      if(!pointer||pointer.id!==e.pointerId)return;
      const dx=e.clientX-pointer.startX,dy=e.clientY-pointer.startY;
      const distance=Math.hypot(dx,dy);
      if(distance>28){
        if(Math.abs(dx)>Math.abs(dy)){touchAxis=dx<0?-1:1;touchAxisFrames=22;}
        else if(dy<0)justPressed.add('Space');
        else justPressed.add('ArrowDown');
      }else if(tapTarget&&!isUiBlocked()){
        const action=tapTarget.getAttribute('data-game-interaction');
        if(action)justPressed.add('interaction:'+action);
      }
      pointer=null;tapTarget=null;
    }
    if(target){
      bind(target,'keydown',onKeyDown);
      bind(target,'keyup',onKeyUp);
      bind(target,'pointerdown',onPointerDown,{passive:true});
      bind(target,'pointerup',onPointerUp,{passive:true});
      bind(target,'pointercancel',()=>{pointer=null;});
    }
    if(root.addEventListener){bind(root,'blur',onBlur);bind(root,'pagehide',onBlur);}
    function setContext(next){context=Object.assign({},context,next||{});}
    function consume(){
      const blocked=isUiBlocked();
      const has=action=>KEY[action].some(k=>pressed.has(k));
      const just=action=>KEY[action].some(k=>justPressed.has(k));
      const result={
        moveX:blocked?0:((touchAxisFrames>0?touchAxis:0)||((has('right')?1:0)-(has('left')?1:0))),
        moveY:blocked?0:((pressed.has('i')||pressed.has('I')?1:0)-(pressed.has('k')||pressed.has('K')?1:0)),
        sprint:!blocked&&has('sprint'),
        jumpPressed:!blocked&&just('jump'),
        slidePressed:!blocked&&just('slide'),
        interactPressed:!blocked&&just('interact'),
        phonePressed:!context.transitioning&&just('phone'),
        pausePressed:!context.transitioning&&just('pause'),
        interaction:!blocked?Array.from(justPressed).find(k=>k.startsWith('interaction:'))?.slice(12)||null:null
      };
      justPressed.clear();if(touchAxisFrames>0){touchAxisFrames-=1;if(touchAxisFrames===0)touchAxis=0;}
      return result;
    }
    function setVirtualInput(action,down){const keys=KEY[action];if(!keys||destroyed)return false;const key=keys[0];if(down){if(!pressed.has(key))justPressed.add(key);pressed.add(key);}else pressed.delete(key);return true;}
    function reset(){onBlur();}
    function destroy(){destroyed=true;listeners.splice(0).forEach(fn=>fn());onBlur();}
    return Object.freeze({consume,setContext,reset,destroy,setVirtualInput});
  }
  root.SemesterInputManager=Object.freeze({createInputManager});
})(typeof window!=='undefined'?window:globalThis);
