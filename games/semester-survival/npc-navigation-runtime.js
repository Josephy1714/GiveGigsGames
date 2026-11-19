/* Semester Survival — NPC authored-anchor path planner.
 * Computes routes only through designer-authored navigation nodes and edges.
 * It never invents positions, draws characters or moves actors.
 */
(function(root){
 'use strict';
 function fail(message){throw new Error(message);}
 function create(options){
  options=options||{};
  const world=options.world||root.SemesterWorldContent;
  const schedules=options.scheduleRuntime;
  const environment=options.environment;
  const renderer=options.renderer;
  const getManifest=typeof options.getSceneManifest==='function'?options.getSceneManifest:function(){return options.sceneManifest||{};};
  const onEvent=typeof options.onEvent==='function'?options.onEvent:function(){};
  if(!world||!schedules||!environment||!renderer||typeof renderer.getHotspotBounds!=='function')fail('NPC navigation requires world, schedules, environment and scene renderer.');
  let routes=Object.freeze([]),signature='',disposed=false;
  function update(){
   if(disposed)fail('NPC navigation runtime has been disposed.');
   const active=environment.getState().district;
   const manifest=getManifest();
   const scene=active&&manifest[active];
   const npcStates=schedules.getState();
   const next=npcStates.map(function(npc){
    if(npc.presence!=='in-active-district'||npc.targetDistrict!==active)return Object.freeze({characterId:npc.characterId,district:npc.targetDistrict,status:'offscreen',waypoints:Object.freeze([]),distance:0});
    const source=(scene&&scene.npcAnchors||[]).find(function(anchor){return anchor.characterId===npc.characterId;});
    const target=(environment.getPlaces()||[]).find(function(place){return place.id===npc.targetPlaceId&&place.available;});
    if(!source||!target)return Object.freeze({characterId:npc.characterId,district:active,status:'missing-authored-anchor',reason:!source?'NPC start anchor is not authored for this scene.':'Destination interaction anchor is not authored for this scene.',waypoints:Object.freeze([]),distance:0});
    const graph=scene&&scene.navigation;
    if(!graph||!Array.isArray(graph.nodes)||!Array.isArray(graph.edges))return Object.freeze({characterId:npc.characterId,district:active,status:'navigation-not-authored',reason:'Scene navigation graph has not been authored.',waypoints:Object.freeze([]),distance:0});
    const sourceNode=graph.nodes.find(function(node){return node.anchor===source.anchor;});
    const targetNode=graph.nodes.find(function(node){return node.anchor===target.anchor;});
    if(!sourceNode||!targetNode)return Object.freeze({characterId:npc.characterId,district:active,status:'anchor-not-in-navigation-graph',reason:'NPC start or destination anchor is not connected to the authored navigation graph.',waypoints:Object.freeze([]),distance:0});
    const adjacency=new Map(graph.nodes.map(function(node){return [node.id,[]];}));
    graph.edges.forEach(function(edge){
     if(adjacency.has(edge.from)&&adjacency.has(edge.to)){adjacency.get(edge.from).push(edge.to);if(edge.bidirectional!==false)adjacency.get(edge.to).push(edge.from);}
    });
    const queue=[sourceNode.id],previous=new Map([[sourceNode.id,null]]);
    while(queue.length){
     const current=queue.shift();if(current===targetNode.id)break;
     (adjacency.get(current)||[]).forEach(function(nextId){if(!previous.has(nextId)){previous.set(nextId,current);queue.push(nextId);}});
    }
    if(!previous.has(targetNode.id))return Object.freeze({characterId:npc.characterId,district:active,status:'no-authored-route',reason:'No connected authored path joins the NPC and destination anchors.',waypoints:Object.freeze([]),distance:0});
    const ids=[];let cursor=targetNode.id;while(cursor!==null){ids.push(cursor);cursor=previous.get(cursor);}ids.reverse();
    const points=ids.map(function(id){
     const node=graph.nodes.find(function(item){return item.id===id;});
     const bounds=renderer.getHotspotBounds(node.anchor);
     if(!bounds)return null;
     return Object.freeze({nodeId:id,anchor:node.anchor,x:bounds.centerX,y:bounds.centerY});
    });
    if(points.some(function(point){return !point;}))return Object.freeze({characterId:npc.characterId,district:active,status:'missing-render-hotspot',reason:'A navigation waypoint has no mounted authored hotspot.',waypoints:Object.freeze([]),distance:0});
    let distance=0;for(let i=1;i<points.length;i++)distance+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
    return Object.freeze({characterId:npc.characterId,district:active,status:'route-ready',sourceAnchor:source.anchor,targetAnchor:target.anchor,waypoints:Object.freeze(points),distance:distance,visualReady:false,movementReady:false});
   });
   const nextSignature=next.map(function(route){return [route.characterId,route.district,route.status,route.targetAnchor||'',route.waypoints.map(function(point){return point.nodeId;}).join(',')].join(':');}).join('|');
   if(nextSignature!==signature){signature=nextSignature;onEvent(Object.freeze({type:'npc:navigation-updated',routes:Object.freeze(next.map(function(route){return Object.freeze({characterId:route.characterId,status:route.status,district:route.district,waypointCount:route.waypoints.length});}))}));}
   routes=Object.freeze(next);return routes;
  }
  function getState(){return routes;}
  function getDiagnostics(){return Object.freeze({routes:routes.length,ready:routes.filter(function(route){return route.status==='route-ready';}).length,movingActors:0,artPolicy:'authored-assets-only'});}
  function destroy(){disposed=true;routes=Object.freeze([]);signature='';}
  return Object.freeze({update:update,getState:getState,getDiagnostics:getDiagnostics,destroy:destroy});
 }
 root.SemesterNpcNavigationRuntime=Object.freeze({create:create});
})(typeof window!=='undefined'?window:globalThis);
