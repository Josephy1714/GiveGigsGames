/* University-life traversal zones: authored slowdowns, boosts and recovery pickups. */
(function(root){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function fail(m){throw new Error(m);}
 const EFFECTS=Object.freeze({
  'muddy-ground':{label:'Muddy ground',speedMultiplier:0.68,accelerationMultiplier:0.72,staminaDrainMultiplier:1.35,staminaRecoveryMultiplier:0.8,duration:0},
  'crowded-corridor':{label:'Crowded corridor',speedMultiplier:0.76,accelerationMultiplier:0.8,staminaDrainMultiplier:1.05,staminaRecoveryMultiplier:1,duration:0},
  'wet-floor':{label:'Wet floor',speedMultiplier:0.82,accelerationMultiplier:0.68,staminaDrainMultiplier:1.15,staminaRecoveryMultiplier:1,duration:0},
  'heavy-backpack':{label:'Heavy backpack',speedMultiplier:0.88,accelerationMultiplier:0.86,staminaDrainMultiplier:1.3,staminaRecoveryMultiplier:0.8,duration:0},
  'campus-track':{label:'Clear running track',speedMultiplier:1.14,accelerationMultiplier:1.12,staminaDrainMultiplier:0.82,staminaRecoveryMultiplier:1,duration:0},
  'coffee-boost':{label:'Coffee boost',speedMultiplier:1.12,accelerationMultiplier:1.08,staminaDrainMultiplier:0.88,staminaRecoveryMultiplier:1.12,duration:24},
  'water-break':{label:'Water break',speedMultiplier:1,accelerationMultiplier:1,staminaDrainMultiplier:1,staminaRecoveryMultiplier:2.5,duration:12}
 });
 function create(options){
  options=options||{};const onEvent=typeof options.onEvent==='function'?options.onEvent:function(){};
  let zones=[],district='',effects=new Map(),inside=new Set(),cooldowns=new Map(),elapsed=0,disposed=false;
  function validate(list){
   if(!Array.isArray(list))fail('Gameplay zones must be an authored array.');
   const ids=new Set();
   return Object.freeze(list.map(z=>{
    if(!z||typeof z.id!=='string'||!z.id.trim()||ids.has(z.id))fail('Every gameplay zone needs a unique id.');ids.add(z.id);
    if(!EFFECTS[z.effect])fail('Unsupported university-life gameplay effect: '+z.effect);
    if(z.type==='aabb'){if(![z.minX,z.maxX,z.minDepth,z.maxDepth].every(Number.isFinite)||z.minX>=z.maxX||z.minDepth>=z.maxDepth)fail('Invalid zone bounds: '+z.id);}
    else if(z.type==='circle'){if(![z.x,z.depth,z.radius].every(Number.isFinite)||z.radius<=0)fail('Invalid zone circle: '+z.id);}
    else fail('Unsupported gameplay zone shape: '+z.id);
    return Object.freeze(Object.assign({},z,{trigger:!!z.trigger,cooldown:Number.isFinite(z.cooldown)?clamp(z.cooldown,0,3600):30}));
   }));
  }
  function setDistrict(id,list){district=id;zones=validate(list||[]);inside.clear();effects.clear();cooldowns.clear();return getState();}
  function contains(z,x,d){if(z.type==='circle')return Math.hypot(x-z.x,d-z.depth)<=z.radius;return x>=z.minX&&x<=z.maxX&&d>=z.minDepth&&d<=z.maxDepth;}
  function update(position,dt){
   if(disposed)fail('Gameplay zone runtime is disposed.');
   dt=clamp(Number(dt)||0,0,0.05);elapsed+=dt;
   for(const [id,e] of effects){if(e.remaining>0){e.remaining=Math.max(0,e.remaining-dt);if(e.remaining===0){effects.delete(id);onEvent({type:'gameplay-effect:ended',effect:e.effect,label:e.label});}}}
   for(const [id,t] of cooldowns){const n=Math.max(0,t-dt);if(n===0)cooldowns.delete(id);else cooldowns.set(id,n);}
   const next=new Set();
   for(const z of zones){
    const active=!!position&&contains(z,position.x,position.depth);
    if(active){
     next.add(z.id);
     if(!inside.has(z.id)&&!cooldowns.has(z.id)){
      const def=EFFECTS[z.effect];onEvent({type:'gameplay-zone:entered',zoneId:z.id,effect:z.effect,label:def.label,trigger:z.trigger});
      if(z.trigger){const key=z.effect+'@'+z.id;effects.set(key,{effect:z.effect,label:def.label,remaining:Number.isFinite(z.duration)?clamp(z.duration,1,180):def.duration});cooldowns.set(z.id,z.cooldown);onEvent({type:'gameplay-effect:started',zoneId:z.id,effect:z.effect,label:def.label,duration:effects.get(key).remaining});}
     }
    }else if(inside.has(z.id))onEvent({type:'gameplay-zone:exited',zoneId:z.id,effect:z.effect});
   }
   inside=next;
   const activeDefs=[];
   for(const z of zones)if(inside.has(z.id)&&!z.trigger)activeDefs.push(EFFECTS[z.effect]);
   for(const e of effects.values())activeDefs.push(EFFECTS[e.effect]);
   const mods=activeDefs.reduce((a,e)=>({speedMultiplier:a.speedMultiplier*e.speedMultiplier,accelerationMultiplier:a.accelerationMultiplier*e.accelerationMultiplier,staminaDrainMultiplier:a.staminaDrainMultiplier*e.staminaDrainMultiplier,staminaRecoveryMultiplier:a.staminaRecoveryMultiplier*e.staminaRecoveryMultiplier}),{speedMultiplier:1,accelerationMultiplier:1,staminaDrainMultiplier:1,staminaRecoveryMultiplier:1});
   mods.speedMultiplier=clamp(mods.speedMultiplier,0.45,1.3);mods.accelerationMultiplier=clamp(mods.accelerationMultiplier,0.5,1.25);mods.staminaDrainMultiplier=clamp(mods.staminaDrainMultiplier,0.5,2);mods.staminaRecoveryMultiplier=clamp(mods.staminaRecoveryMultiplier,0.5,3);
   return Object.freeze({district,modifiers:Object.freeze(mods),activeZones:Object.freeze(Array.from(inside)),activeEffects:Object.freeze(Array.from(effects.values()).map(e=>Object.freeze(Object.assign({},e)))),elapsed});
  }
  function getState(){return Object.freeze({district,zones:zones.length,activeZones:Array.from(inside),activeEffects:Array.from(effects.values()).map(e=>Object.assign({},e)),cooldowns:cooldowns.size});}
  function destroy(){disposed=true;zones=[];inside.clear();effects.clear();cooldowns.clear();}
  return Object.freeze({setDistrict,update,getState,destroy});
 }
 root.SemesterGameplayZones=Object.freeze({create,definitions:EFFECTS});
})(typeof window!=='undefined'?window:globalThis);
