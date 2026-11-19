/* Township scene blueprint — authored 2.5D layout contract, not production artwork. */
(function(root){
 'use strict';
 const blueprint={
  version:1,district:'township',sceneId:'township-student-street',
  approval:{status:'layout-review-required',artworkSupplied:false,runtimeReady:false},
  design:{
   camera:'2.5D side-on exploration with independent depth movement',
   viewport:{width:960,height:540},world:{width:3840,height:1080},
   groundY:850,depthScale:0.58,depthBounds:{min:-170,max:170},
   playerBounds:{minX:70,maxX:3770},
   cameraBounds:{minX:0,minY:0,maxX:2880,maxY:540},
   mood:'A lively, believable Nairobi student neighbourhood: compact mixed-use storefronts, practical street furniture, warm shop interiors and an active but readable pedestrian street.',
   composition:[
    {id:'neighbourhood-roofline-and-distant-street',artSlot:'background',parallax:0.12,fullWorld:true},
    {id:'shopfronts-kiosk-and-matatu-stage',artSlot:'midground',parallax:0.48,fullWorld:true},
    {id:'pavement-street-furniture-and-planting',artSlot:'foreground',parallax:1,fullWorld:true}
   ],
   lightingVariants:['early-morning','midday','late-afternoon','night'],
   weatherTreatment:'Rain and sunlight affect atmosphere and exposed pavement only; keep storefront identity, signage and walkable route consistent.'
  },
  places:{
   'mama-njeri-kiosk':{anchor:'place-mama-njeri-kiosk',x:260,y:520,width:330,height:320,focus:'Mama Njeri food kiosk, legible menu board, serving counter and sheltered customer standing area.'},
   'print-hub':{anchor:'place-print-hub',x:850,y:490,width:330,height:350,focus:'Cyber and print hub frontage with visible computers through the window, print counter and clear entrance.'},
   'barber':{anchor:'place-barber',x:1450,y:500,width:300,height:340,focus:'Distinct barber storefront, mirror and chair visible through the entrance, waiting bench outside.'},
   'mini-mart':{anchor:'place-mini-mart',x:2050,y:500,width:320,height:340,focus:'Corner mini-mart with stocked shelves visible through glazing, branded but fictional signage and delivery crates.'},
   'matatu-stage':{anchor:'place-matatu-stage',x:2750,y:540,width:360,height:300,focus:'Clearly marked transport stage, sheltered waiting bay and safe pedestrian boarding edge.'},
   'study-cafe':{anchor:'place-study-cafe',x:3370,y:490,width:340,height:350,focus:'Small student study café with warm interior lighting, tables and a readable entrance.'}
  },
  npcs:[{characterId:'njeri',anchor:'npc-njeri',x:390,y:630,radius:96}],
  navigation:{
   nodes:[
    {id:'kiosk',anchor:'place-mama-njeri-kiosk'},{id:'print',anchor:'place-print-hub'},
    {id:'barber',anchor:'place-barber'},{id:'mart',anchor:'place-mini-mart'},
    {id:'stage',anchor:'place-matatu-stage'},{id:'cafe',anchor:'place-study-cafe'},
    {id:'njeri',anchor:'npc-njeri'}
   ],
   edges:[
    ['kiosk','print'],['print','barber'],['barber','mart'],['mart','stage'],['stage','cafe'],['kiosk','njeri']
   ].map(([from,to])=>({from,to,bidirectional:true}))
  },
  collision:[
   {id:'north-storefront-wall',type:'aabb',minX:120,maxX:3710,minDepth:-165,maxDepth:-140,material:'concrete',effect:'none'},
   {id:'kiosk-counter-barrier',type:'aabb',minX:265,maxX:570,minDepth:-12,maxDepth:12,material:'wood',effect:'none'},
   {id:'stage-kerb',type:'segment',x1:2700,depth1:132,x2:3160,depth2:132,radius:10,material:'concrete',effect:'none'}
  ],
  gameplayZones:[
   {id:'township-busy-shopfronts',type:'aabb',minX:720,maxX:2380,minDepth:-115,maxDepth:115,effect:'crowded-corridor'},
   {id:'rain-exposed-stage-pavement',type:'aabb',minX:2700,maxX:3190,minDepth:-118,maxDepth:118,effect:'wet-floor'}
  ],
  spawnPoints:{
   default:{x:180,depth:0},fromResidence:{x:180,depth:0},
   fromCampus:{x:3680,depth:0},fromCity:{x:3050,depth:0}
  },
  artDelivery:{
   requiredLayers:['background','midground','foreground'],
   interactiveProps:[
    'kiosk-menu-board','kiosk-serving-counter','kiosk-seating','print-hub-signage','computer-workstations',
    'printer-and-paper-stack','barber-pole-or-sign','barber-chair-and-mirror','mini-mart-shelves',
    'transport-stage-signage','waiting-bench','study-cafe-tables'
   ],
   localIdentity:'Use locally grounded shopfront construction, pavement, utility details, transport signage and street furniture; avoid generic foreign storefronts or caricatured poverty.',
   signageRule:'Use original, approved fictional business marks and legible English/Kiswahili labels; do not reproduce unlicensed real brands.',
   pedestrianSafety:'Keep a continuous walkable pedestrian route and safe distance from any road or vehicle art.',
   noInventedAssets:true,artistMustReviewWalkableDepthPlane:true,allHotspotsMustBeAlignedToFinalPaintover:true
  }
 };
 function validate(world){
  if(!world||!world.districts||!world.districts.township)throw new Error('Township blueprint requires canonical world content.');
  const places=new Set(world.districts.township.places.map(p=>p.id));
  Object.keys(blueprint.places).forEach(id=>{if(!places.has(id))throw new Error('Township blueprint references unknown place: '+id);});
  blueprint.npcs.forEach(n=>{if(!world.characters[n.characterId])throw new Error('Township blueprint references unknown character: '+n.characterId);});
  const anchors=new Set(Object.values(blueprint.places).map(p=>p.anchor));blueprint.npcs.forEach(n=>anchors.add(n.anchor));
  const ids=new Set();blueprint.navigation.nodes.forEach(n=>{if(!anchors.has(n.anchor)||ids.has(n.id))throw new Error('Township navigation has invalid or duplicate node.');ids.add(n.id);});
  blueprint.navigation.edges.forEach(e=>{if(!ids.has(e.from)||!ids.has(e.to)||e.from===e.to)throw new Error('Township navigation edge is invalid.');});
  Object.values(blueprint.spawnPoints).forEach(p=>{if(p.x<blueprint.design.playerBounds.minX||p.x>blueprint.design.playerBounds.maxX||p.depth<blueprint.design.depthBounds.min||p.depth>blueprint.design.depthBounds.max)throw new Error('Township spawn point is outside authored bounds.');});
  return Object.freeze({district:'township',placeCount:Object.keys(blueprint.places).length,npcCount:blueprint.npcs.length,navigationNodeCount:blueprint.navigation.nodes.length,artworkReady:false,runtimeReady:false});
 }
 root.SemesterTownshipBlueprint=Object.freeze({getBlueprint:()=>blueprint,validate});
})(typeof window!=='undefined'?window:globalThis);
