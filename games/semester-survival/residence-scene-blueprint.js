/* Student residence scene blueprint — layout contract, not finished artwork. */
(function(root){
 'use strict';
 const blueprint={
  version:1,district:'residence',sceneId:'residence-shared-block',
  approval:{status:'layout-review-required',artworkSupplied:false,runtimeReady:false},
  design:{
   camera:'2.5D side-on exploration with independent depth movement',
   viewport:{width:960,height:540},world:{width:1920,height:1080},
   groundY:840,depthScale:0.58,depthBounds:{min:-140,max:140},
   playerBounds:{minX:70,maxX:1850},
   cameraBounds:{minX:0,minY:0,maxX:960,maxY:540},
   composition:[
    {id:'residence-block-and-distant-neighbourhood',artSlot:'background',parallax:0.14,fullWorld:true},
    {id:'corridor-courtyard-and-stairwell',artSlot:'midground',parallax:0.48,fullWorld:true},
    {id:'room-furniture-plants-and-nearby-details',artSlot:'foreground',parallax:1,fullWorld:true}
   ],
   lightingVariants:['early-morning','daylight','late-afternoon','night'],
   mood:'A believable, lived-in Nairobi student residence: warm, safe, modestly furnished, personal and recognisably Kenyan.',
   weatherTreatment:'Interior remains dry and stable; courtyard and sheltered laundry respond to authored weather exposure.'
  },
  places:{
   room:{anchor:'place-shared-room',x:220,y:500,width:380,height:340,focus:'Jay and Brian shared room: two distinct beds, desks, storage, personal belongings and phone charging.'},
   courtyard:{anchor:'place-courtyard',x:900,y:540,width:390,height:300,focus:'Shared outdoor courtyard with seating, planted edges and the main residence circulation route.'},
   laundry:{anchor:'place-laundry',x:1450,y:500,width:340,height:340,focus:'Sheltered laundry corner with washing basins, drying rails and organised supplies.'}
  },
  npcs:[{characterId:'brian',anchor:'npc-brian',x:480,y:620,radius:94}],
  navigation:{
   nodes:[{id:'room',anchor:'place-shared-room'},{id:'courtyard',anchor:'place-courtyard'},{id:'laundry',anchor:'place-laundry'},{id:'brian',anchor:'npc-brian'}],
   edges:[['room','courtyard'],['courtyard','laundry'],['room','brian']].map(([from,to])=>({from,to,bidirectional:true}))
  },
  collision:[
   {id:'north-room-wall',type:'aabb',minX:80,maxX:1840,minDepth:-138,maxDepth:-116,material:'concrete',effect:'none'},
   {id:'courtyard-planter-edge',type:'segment',x1:680,depth1:118,x2:1330,depth2:118,radius:12,material:'stone',effect:'none'},
   {id:'laundry-wall',type:'aabb',minX:1420,maxX:1810,minDepth:-100,maxDepth:-78,material:'concrete',effect:'none'}
  ],
  gameplayZones:[
   {id:'residence-indoor-rest-zone',type:'aabb',minX:180,maxX:620,minDepth:-90,maxDepth:90,effect:'water-break'},
   {id:'courtyard-clear-path',type:'aabb',minX:700,maxX:1320,minDepth:-90,maxDepth:90,effect:'campus-track'}
  ],
  spawnPoints:{default:{x:350,depth:0},fromTownship:{x:1770,depth:0},fromCampus:{x:1650,depth:0}},
  artDelivery:{
   requiredLayers:['background','midground','foreground'],
   interactiveProps:['jay-bed','brian-bed','two-study-desks','wardrobe','room-door','phone-charger','courtyard-benches','courtyard-plants','laundry-basins','drying-rails'],
   privacyRule:'The shared room is a private interior; keep windows, doors and camera framing respectful.',
   noInventedAssets:true,artistMustReviewWalkableDepthPlane:true,allHotspotsMustBeAlignedToFinalPaintover:true
  }
 };
 function validate(world){
  if(!world||!world.districts||!world.districts.residence)throw new Error('Residence blueprint requires canonical world content.');
  const places=new Set(world.districts.residence.places.map(p=>p.id));
  Object.keys(blueprint.places).forEach(id=>{if(!places.has(id))throw new Error('Residence blueprint references unknown place: '+id);});
  blueprint.npcs.forEach(n=>{if(!world.characters[n.characterId])throw new Error('Residence blueprint references unknown character: '+n.characterId);});
  const anchors=new Set(Object.values(blueprint.places).map(p=>p.anchor));blueprint.npcs.forEach(n=>anchors.add(n.anchor));
  const ids=new Set();blueprint.navigation.nodes.forEach(n=>{if(!anchors.has(n.anchor)||ids.has(n.id))throw new Error('Residence navigation has invalid or duplicate node.');ids.add(n.id);});
  blueprint.navigation.edges.forEach(e=>{if(!ids.has(e.from)||!ids.has(e.to)||e.from===e.to)throw new Error('Residence navigation edge is invalid.');});
  Object.values(blueprint.spawnPoints).forEach(p=>{if(p.x<blueprint.design.playerBounds.minX||p.x>blueprint.design.playerBounds.maxX||p.depth<blueprint.design.depthBounds.min||p.depth>blueprint.design.depthBounds.max)throw new Error('Residence spawn point is outside authored bounds.');});
  return Object.freeze({district:'residence',placeCount:3,npcCount:1,navigationNodeCount:4,artworkReady:false,runtimeReady:false});
 }
 root.SemesterResidenceBlueprint=Object.freeze({getBlueprint:()=>blueprint,validate});
})(typeof window!=='undefined'?window:globalThis);
