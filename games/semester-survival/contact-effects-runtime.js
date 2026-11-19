/* Semester Survival — authored surface-contact resolver.
 * Converts animation frame markers into material-aware contact metadata only.
 * It does not synthesize particles, footsteps, sounds, or un-authored surfaces.
 */
(function(root){
 'use strict';
 const MATERIALS=new Set(['stone','concrete','wood','metal','glass','grass','gravel','water','soft']);
 const EFFECTS=new Set(['dust','spark','splash','debris','none']);
 function fail(message){throw new Error(message);}
 function create(options){
  options=options||{};
  let surfaces=Object.freeze([]),district=null,disposed=false;
  const onEvent=typeof options.onEvent==='function'?options.onEvent:function(){};
  function validate(list){
   if(!Array.isArray(list))fail('Contact surfaces must be an authored array.');
   const ids=new Set();
   return Object.freeze(list.map(function(surface){
    if(!surface||typeof surface.id!=='string'||!surface.id.trim()||ids.has(surface.id))fail('Every contact surface requires a unique authored id.');
    ids.add(surface.id);
    if(!MATERIALS.has(surface.material))fail('Contact surface "'+surface.id+'" has an unsupported material.');
    const effect=surface.effect===undefined?'none':surface.effect;
    if(!EFFECTS.has(effect))fail('Contact surface "'+surface.id+'" has an unsupported effect tag.');
    if(surface.type==='aabb'){
     if(![surface.minX,surface.maxX,surface.minDepth,surface.maxDepth].every(Number.isFinite)||surface.minX>=surface.maxX||surface.minDepth>=surface.maxDepth)fail('Contact surface "'+surface.id+'" has invalid bounds.');
    }else if(surface.type==='circle'){
     if(![surface.x,surface.depth,surface.radius].every(Number.isFinite)||surface.radius<=0)fail('Contact surface "'+surface.id+'" has invalid circle geometry.');
    }else fail('Contact surface "'+surface.id+'" has an unsupported shape.');
    const priority=surface.priority===undefined?0:surface.priority;
    if(!Number.isFinite(priority))fail('Contact surface priority must be finite.');
    const area=surface.type==='circle'?Math.PI*surface.radius*surface.radius:(surface.maxX-surface.minX)*(surface.maxDepth-surface.minDepth);
    return Object.freeze({id:surface.id,type:surface.type,material:surface.material,effect:effect,priority:priority,area:area,minX:surface.minX,maxX:surface.maxX,minDepth:surface.minDepth,maxDepth:surface.maxDepth,x:surface.x,depth:surface.depth,radius:surface.radius});
   })).sort(function(a,b){return b.priority-a.priority||a.area-b.area||a.id.localeCompare(b.id);});
  }
  function setSurfaces(nextDistrict,list){
   if(disposed)fail('Contact effects runtime is disposed.');
   district=String(nextDistrict||'');
   surfaces=validate(list||[]);
   return getDiagnostics();
  }
  function contains(surface,position){
   if(surface.type==='circle')return Math.hypot(position.x-surface.x,position.depth-surface.depth)<=surface.radius;
   return position.x>=surface.minX&&position.x<=surface.maxX&&position.depth>=surface.minDepth&&position.depth<=surface.maxDepth;
  }
  function resolve(marker,position,characterId,facing){
   if(disposed)fail('Contact effects runtime is disposed.');
   if(!marker||typeof marker.event!=='string'||!position||!Number.isFinite(position.x)||!Number.isFinite(position.depth))return null;
   const foot=marker.event==='left-foot-contact'?'left':marker.event==='right-foot-contact'?'right':null;
   const landing=marker.event==='landing-impact';
   if(!foot&&!landing)return null;
   const direction=facing===-1?-1:1;
   const contactPosition={x:position.x+(Number.isFinite(marker.offsetX)?marker.offsetX*direction:0),depth:position.depth+(Number.isFinite(marker.offsetDepth)?marker.offsetDepth:0)};
   const surface=surfaces.find(function(item){return contains(item,contactPosition);});
   if(!surface)return null;
   const event=Object.freeze({
    type:'character:surface-contact',characterId:String(characterId||'jay'),district:district,
    action:landing?'landing':'footstep',foot:foot,clip:marker.clip||null,frameIndex:Number.isInteger(marker.frameIndex)?marker.frameIndex:null,
    surfaceId:surface.id,material:surface.material,effect:surface.effect,
    position:Object.freeze(contactPosition),anchorPosition:Object.freeze({x:position.x,depth:position.depth}),facing:direction
   });
   onEvent(event);
   return event;
  }
  function getDiagnostics(){return Object.freeze({district:district,surfaces:surfaces.length,materials:Object.freeze(Array.from(new Set(surfaces.map(function(item){return item.material;})))),policy:'authored-contact-surfaces-only'});}
  function destroy(){disposed=true;surfaces=Object.freeze([]);district=null;}
  return Object.freeze({setSurfaces:setSurfaces,resolve:resolve,getDiagnostics:getDiagnostics,destroy:destroy});
 }
 root.SemesterContactEffectsRuntime=Object.freeze({create:create});
})(typeof window!=='undefined'?window:globalThis);
