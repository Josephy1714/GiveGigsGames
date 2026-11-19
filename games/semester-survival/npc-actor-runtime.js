/* Semester Survival — authored NPC route following and optional atlas-backed rendering.
 * Movement uses only validated scene navigation anchors. Sprites render only when an approved
 * animator with real walk/idle clips is explicitly supplied for that character.
 */
(function(root){
 'use strict';
 function fail(message){throw new Error(message);}
 function create(options){
  options=options||{};
  const schedules=options.scheduleRuntime,navigation=options.navigationRuntime;
  const world=options.world||root.SemesterWorldContent;
  const onEvent=typeof options.onEvent==='function'?options.onEvent:function(){};
  const animators=options.animators||Object.create(null);
  const scales=options.characterScales||Object.create(null);
  const speed=Number.isFinite(options.speed)&&options.speed>0?options.speed:76;
  if(!world||!schedules||!navigation)fail('NPC actors require world, schedule and navigation runtimes.');
  let actors=Object.freeze([]),renderables=Object.freeze([]),states=new Map(),signature='',disposed=false;
  function update(delta){
   if(disposed)fail('NPC actor runtime has been disposed.');
   const dt=Math.max(0,Math.min(Number(delta)||0,0.1));
   const npcStates=schedules.getState(),routes=navigation.getState(),next=[],draw=[];
   npcStates.forEach(function(npc){
    const route=routes.find(function(item){return item.characterId===npc.characterId;});
    const key=npc.characterId,prior=states.get(key),animator=animators[key];
    if(npc.presence!=='in-active-district'||!route||route.status!=='route-ready'||!route.waypoints.length){
     next.push(Object.freeze({characterId:key,name:npc.name,district:npc.targetDistrict,status:npc.presence==='offscreen'?'offscreen':route?route.status:'route-unavailable',position:null,facing:1,motion:'unavailable',visualReady:false,artPolicy:'authored-assets-only'}));
     states.delete(key);return;
    }
    const routeKey=npc.targetDistrict+'|'+route.waypoints.map(function(point){return point.nodeId;}).join('>');
    let state=prior;
    if(!state||state.routeKey!==routeKey){
     const first=route.waypoints[0];
     state={routeKey:routeKey,x:first.x,y:first.y,waypointIndex:Math.min(1,route.waypoints.length-1),facing:1,arrived:route.waypoints.length===1,lastMotion:null,visualReady:false};
    }
    let remaining=speed*dt,guard=0;
    while(remaining>0&&!state.arrived&&guard++<route.waypoints.length+1){
     const target=route.waypoints[state.waypointIndex];
     const dx=target.x-state.x,dy=target.y-state.y,distance=Math.hypot(dx,dy);
     if(distance<0.001){state.waypointIndex++;if(state.waypointIndex>=route.waypoints.length){state.arrived=true;break;}continue;}
     state.facing=dx<0?-1:dx>0?1:state.facing;
     const step=Math.min(distance,remaining);
     state.x+=dx/distance*step;state.y+=dy/distance*step;remaining-=step;
     if(step>=distance-0.001){state.x=target.x;state.y=target.y;state.waypointIndex++;if(state.waypointIndex>=route.waypoints.length)state.arrived=true;}
    }
    const motion=state.arrived?'idle':'walk';
    let visualReady=Boolean(animator&&typeof animator.play==='function'&&typeof animator.update==='function'&&typeof animator.render==='function'&&typeof animator.hasClip==='function'&&animator.hasClip(motion));
    if(visualReady){
     if(state.lastMotion!==motion||state.lastFacing!==state.facing){
      const played=animator.play(motion,state.facing);
      if(!played||played.ok!==true)visualReady=false;
      else {state.lastMotion=motion;state.lastFacing=state.facing;}
     }
     if(visualReady)animator.update(dt);
    }
    state.visualReady=visualReady;
    states.set(key,state);
    const position=Object.freeze({x:state.x,y:state.y});
    next.push(Object.freeze({characterId:key,name:npc.name,district:npc.targetDistrict,status:state.arrived?'at-destination':'moving',position:position,facing:state.facing,motion:motion,waypointIndex:state.waypointIndex,waypointCount:route.waypoints.length,visualReady:visualReady,artPolicy:'authored-assets-only'}));
    if(visualReady)draw.push(Object.freeze({characterId:key,x:state.x,y:state.y,scale:Number(scales[key])>0?Number(scales[key]):1,animator:animator}));
   });
   const frozen=Object.freeze(next),drawFrozen=Object.freeze(draw);
   const nextSignature=frozen.map(function(item){return [item.characterId,item.status,item.position?Math.round(item.position.x)+','+Math.round(item.position.y):'',item.motion,item.visualReady].join(':');}).join('|');
   if(nextSignature!==signature){signature=nextSignature;onEvent(Object.freeze({type:'npc:actors-updated',actors:Object.freeze(frozen.map(function(item){return Object.freeze({characterId:item.characterId,status:item.status,motion:item.motion,visualReady:item.visualReady});}))}));}
   actors=frozen;renderables=drawFrozen;return actors;
  }
  function getState(){return actors;}
  function getRenderables(){return renderables;}
  function getDiagnostics(){return Object.freeze({actors:actors.length,moving:actors.filter(function(item){return item.status==='moving';}).length,atDestination:actors.filter(function(item){return item.status==='at-destination';}).length,visualActorsReady:actors.filter(function(item){return item.visualReady;}).length,artPolicy:'authored-assets-only'});}
  function destroy(){disposed=true;actors=Object.freeze([]);renderables=Object.freeze([]);states.clear();signature='';}
  return Object.freeze({update:update,getState:getState,getRenderables:getRenderables,getDiagnostics:getDiagnostics,destroy:destroy});
 }
 root.SemesterNpcActorRuntime=Object.freeze({create:create});
})(typeof window!=='undefined'?window:globalThis);
