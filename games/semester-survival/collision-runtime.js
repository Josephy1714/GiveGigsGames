/* Semester Survival — authored collision world.
 * Uses designer-authored 2D X/depth colliders; no guessed geometry or visual effects.
 */
(function(root){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function fail(m){throw new Error(m);}
 function create(options){
  options=options||{};const onEvent=typeof options.onEvent==='function'?options.onEvent:function(){};
  const allowed=new Set(['stone','concrete','wood','metal','glass','grass','gravel','water','soft']);
  const effects=new Set(['dust','spark','splash','debris','none']);
  let colliders=[],active=new Map(),disposed=false,revision=0;
  function validate(list){
   if(!Array.isArray(list))fail('Collision geometry must be an array of authored colliders.');
   const ids=new Set();
   return Object.freeze(list.map(function(c){
    if(!c||typeof c.id!=='string'||!c.id.trim()||ids.has(c.id))fail('Every collider requires a unique authored id.');
    ids.add(c.id);
    const type=c.type;
    if(type==='aabb'){
     if(![c.minX,c.minDepth,c.maxX,c.maxDepth].every(Number.isFinite)||c.minX>=c.maxX||c.minDepth>=c.maxDepth)fail('AABB collider "'+c.id+'" has invalid bounds.');
    }else if(type==='circle'){
     if(![c.x,c.depth,c.radius].every(Number.isFinite)||c.radius<=0)fail('Circle collider "'+c.id+'" has invalid geometry.');
    }else if(type==='segment'){
     if(![c.x1,c.depth1,c.x2,c.depth2,c.radius].every(Number.isFinite)||c.radius<=0||Math.hypot(c.x2-c.x1,c.depth2-c.depth1)<1e-6)fail('Segment collider "'+c.id+'" has invalid geometry.');
    }else fail('Collider "'+c.id+'" uses unsupported geometry type.');
    const material=c.material||'concrete',effect=c.effect||'none';
    if(!allowed.has(material)||!effects.has(effect))fail('Collider "'+c.id+'" has an unsupported material or contact effect.');
    const restitution=c.restitution===undefined?0: c.restitution,friction=c.friction===undefined?0.82:c.friction;
    if(!Number.isFinite(restitution)||restitution<0||restitution>0.35||!Number.isFinite(friction)||friction<0||friction>1)fail('Collider response values are outside safe ranges.');
    return Object.freeze(Object.assign({},c,{material,effect,restitution,friction}));
   }));
  }
  function setColliders(list){if(disposed)fail('Collision world is disposed.');colliders=validate(list);active.clear();revision++;return getDiagnostics();}
  function closestOnSegment(px,pz,c){const dx=c.x2-c.x1,dz=c.depth2-c.depth1,t=clamp(((px-c.x1)*dx+(pz-c.depth1)*dz)/(dx*dx+dz*dz),0,1);return {x:c.x1+t*dx,depth:c.depth1+t*dz};}
  function contactAt(x,z,r,c){
   if(c.type==='aabb'){
    const qx=clamp(x,c.minX,c.maxX),qz=clamp(z,c.minDepth,c.maxDepth),dx=x-qx,dz=z-qz,d=Math.hypot(dx,dz);
    if(d>=r)return null;
    if(d>1e-8)return {nx:dx/d,nz:dz/d,penetration:r-d};
    const faces=[{d:x-c.minX,nx:-1,nz:0},{d:c.maxX-x,nx:1,nz:0},{d:z-c.minDepth,nx:0,nz:-1},{d:c.maxDepth-z,nx:0,nz:1}].sort((a,b)=>a.d-b.d);
    return {nx:faces[0].nx,nz:faces[0].nz,penetration:r+Math.max(0,faces[0].d)};
   }
   let q;
   if(c.type==='circle')q={x:c.x,depth:c.depth};else q=closestOnSegment(x,z,c);
   let dx=x-q.x,dz=z-q.depth,d=Math.hypot(dx,dz),sum=r+(c.type==='circle'?c.radius:c.radius);
   if(d>=sum)return null;
   if(d<1e-8){dx=1;dz=0;d=1;}
   return {nx:dx/d,nz:dz/d,penetration:sum-d};
  }
  function moveCircle(position,delta,radius,actorId){
   if(disposed)fail('Collision world is disposed.');
   if(!position||!delta||![position.x,position.depth,delta.x,delta.depth,radius].every(Number.isFinite)||radius<=0)fail('Actor collision movement requires finite position, displacement and positive radius.');
   actorId=String(actorId||'actor');const maxStep=Math.max(0.05,radius*0.45),steps=Math.max(1,Math.min(24,Math.ceil(Math.hypot(delta.x,delta.depth)/maxStep)));
   let x=position.x,z=position.depth,blockedX=false,blockedDepth=false;const touched=new Map();
   for(let s=0;s<steps;s++){
    x+=delta.x/steps;z+=delta.depth/steps;
    for(let pass=0;pass<4;pass++){
     let changed=false;
     for(const c of colliders){
      const hit=contactAt(x,z,radius,c);if(!hit)continue;
      touched.set(c.id,{collider:c,normal:{x:hit.nx,depth:hit.nz},penetration:hit.penetration});
      x+=hit.nx*(hit.penetration+1e-4);z+=hit.nz*(hit.penetration+1e-4);
      const into=(delta.x*hit.nx+delta.depth*hit.nz);
      if(into<0){if(Math.abs(hit.nx)>0.01)blockedX=true;if(Math.abs(hit.nz)>0.01)blockedDepth=true;}
      changed=true;
     }
     if(!changed)break;
    }
   }
   const previous=active.get(actorId)||new Set(),current=new Set(touched.keys());
   touched.forEach(function(item,id){
    const c=item.collider,enter=!previous.has(id),normal=item.normal;
    const impact=Math.max(0,-(delta.x*normal.x+delta.depth*normal.depth));
    if(enter)onEvent(Object.freeze({type:'collision:enter',actorId,colliderId:id,material:c.material,effect:c.effect,normal}));
    if(impact>0.15)onEvent(Object.freeze({type:'collision:impact',actorId,colliderId:id,material:c.material,effect:c.effect,intensity:clamp(impact/5,0,1),position:Object.freeze({x:x,depth:z}),normal}));
   });
   previous.forEach(function(id){if(!current.has(id))onEvent(Object.freeze({type:'collision:exit',actorId,colliderId:id}));});
   if(current.size)active.set(actorId,current);else active.delete(actorId);
   return Object.freeze({x:x,depth:z,blockedX,blockedDepth,contacts:Object.freeze(Array.from(touched.values()).map(function(v){return Object.freeze({colliderId:v.collider.id,material:v.collider.material,effect:v.collider.effect,normal:Object.freeze(v.normal),penetration:v.penetration});}))});
  }
  function getDiagnostics(){return Object.freeze({authored:colliders.length>0,colliders:colliders.length,activeActors:active.size,revision,geometryPolicy:'authored-only'});}
  function destroy(){disposed=true;colliders=[];active.clear();}
  if(options.colliders!==undefined)setColliders(options.colliders);
  return Object.freeze({setColliders:setColliders,moveCircle:moveCircle,getDiagnostics:getDiagnostics,destroy:destroy});
 }
 root.SemesterCollisionRuntime=Object.freeze({create:create});
})(typeof window!=='undefined'?window:globalThis);
