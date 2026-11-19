/* Semester Survival — deterministic NPC route-following simulation.
 * Coordinates are consumed exclusively from the active scene's validated authored navigation graph.
 * This runtime simulates behaviour; it does not fabricate sprites or claim visual readiness.
 */
(function(root){
 'use strict';
 function fail(message){throw new Error(message);}
 function create(options){
  options=options||{};
  const schedules=options.scheduleRuntime,navigation=options.navigationRuntime;
  const world=options.world||root.SemesterWorldContent;
  const onEvent=typeof options.onEvent==='function'?options.onEvent:function(){};
  const speed=Number.isFinite(options.speed)&&options.speed>0?options.speed:76;
  if(!world||!schedules||!navigation)fail('NPC actors require world, schedule and navigation runtimes.');
  let actors=Object.freeze([]),states=new Map(),signature='',disposed=false;
  function update(delta){
   if(disposed)fail('NPC actor runtime has been disposed.');
   const dt=Math.max(0,Math.min(Number(delta)||0,0.1));
   const npcStates=schedules.getState(),routes=navigation.getState(),next=[];
   npcStates.forEach(function(npc){
    const route=routes.find(function(item){return item.characterId===npc.characterId;});
    const key=npc.characterId,prior=states.get(key);
    if(npc.presence!=='in-active-district'||!route||route.status!=='route-ready'||!route.waypoints.length){
     next.push(Object.freeze({characterId:key,name:npc.name,district:npc.targetDistrict,status:npc.presence==='offscreen'?'offscreen':route?route.status:'route-unavailable',position:null,facing:1,motion:'unavailable',visualReady:false,artPolicy:'authored-assets-only'}));
     states.delete(key);return;
    }
    const routeKey=npc.targetDistrict+'|'+route.waypoints.map(function(point){return point.nodeId;}).join('>');
    let state=prior;
    if(!state||state.routeKey!==routeKey){
     const first=route.waypoints[0];
     state={routeKey:routeKey,x:first.x,y:first.y,waypointIndex:Math.min(1,route.waypoints.length-1),facing:1,arrived:route.waypoints.length===1};
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
    states.set(key,state);
    next.push(Object.freeze({characterId:key,name:npc.name,district:npc.targetDistrict,status:state.arrived?'at-destination':'moving',position:Object.freeze({x:state.x,y:state.y}),facing:state.facing,motion:state.arrived?'idle':'walk',waypointIndex:state.waypointIndex,waypointCount:route.waypoints.length,visualReady:false,artPolicy:'authored-assets-only'}));
   });
   const frozen=Object.freeze(next);
   const nextSignature=frozen.map(function(actor){return [actor.characterId,actor.status,actor.position?Math.round(actor.position.x)+','+Math.round(actor.position.y):'',actor.motion].join(':');}).join('|');
   if(nextSignature!==signature){signature=nextSignature;onEvent(Object.freeze({type:'npc:actors-updated',actors:Object.freeze(frozen.map(function(actor){return Object.freeze({characterId:actor.characterId,status:actor.status,motion:actor.motion});}))}));}
   actors=frozen;return actors;
  }
  function getState(){return actors;}
  function getDiagnostics(){return Object.freeze({actors:actors.length,moving:actors.filter(function(actor){return actor.status==='moving';}).length,atDestination:actors.filter(function(actor){return actor.status==='at-destination';}).length,visualActorsReady:0,artPolicy:'authored-assets-only'});}
  function destroy(){disposed=true;actors=Object.freeze([]);states.clear();signature='';}
  return Object.freeze({update:update,getState:getState,getDiagnostics:getDiagnostics,destroy:destroy});
 }
 root.SemesterNpcActorRuntime=Object.freeze({create:create});
})(typeof window!=='undefined'?window:globalThis);
