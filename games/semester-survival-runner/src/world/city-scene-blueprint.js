/* Nairobi City scene blueprint — authored 2.5D layout contract, not production artwork. */
(function(root){
 'use strict';
 const blueprint={
  version:1,district:'city',sceneId:'nairobi-opportunity-district',
  approval:{status:'layout-review-required',artworkSupplied:false,runtimeReady:false},
  design:{
   camera:'2.5D side-on exploration with independent depth movement',
   viewport:{width:960,height:540},world:{width:3840,height:1080},
   groundY:850,depthScale:0.58,depthBounds:{min:-180,max:180},
   playerBounds:{minX:70,maxX:3770},cameraBounds:{minX:0,minY:0,maxX:2880,maxY:540},
   mood:'A contemporary Nairobi urban district with layered commercial architecture, pedestrian plazas, office frontage, public transport edges and a distinct innovation quarter. Busy, ambitious and full of opportunity, but legible and safe to navigate.',
   composition:[
    {id:'nairobi-skyline-and-distant-urban-layers',artSlot:'background',parallax:0.1,fullWorld:true},
    {id:'commercial-frontage-and-public-plaza',artSlot:'midground',parallax:0.46,fullWorld:true},
    {id:'pavement-planters-street-furniture-and-near-props',artSlot:'foreground',parallax:1,fullWorld:true}
   ],
   lightingVariants:['early-morning','midday','late-afternoon','night'],
   weatherTreatment:'Keep buildings, destinations and pedestrian routes consistent; apply weather atmosphere to exposed surfaces and outdoor spaces.'
  },
  places:{
   'career-centre':{anchor:'place-career-centre',x:250,y:490,width:390,height:350,focus:'Career guidance reception, opportunity display and consultation seating.'},
   'interview-suite':{anchor:'place-interview-suite',x:1120,y:470,width:390,height:370,focus:'Professional interview reception, waiting chairs and clearly marked interview-room doors.'},
   'bookshop':{anchor:'place-bookshop',x:2100,y:490,width:370,height:350,focus:'Bookshop arcade frontage, shelves visible through glazing and a welcoming entrance.'},
   'innovation-hub':{anchor:'place-innovation-hub',x:3150,y:450,width:470,height:390,focus:'Contemporary innovation hub with collaborative tables, glass meeting rooms and a project showcase wall.'}
  },
  navigation:{
   nodes:[
    {id:'career',anchor:'place-career-centre'},{id:'interviews',anchor:'place-interview-suite'},
    {id:'bookshop',anchor:'place-bookshop'},{id:'innovation',anchor:'place-innovation-hub'}
   ],
   edges:[['career','interviews'],['interviews','bookshop'],['bookshop','innovation']]
    .map(([from,to])=>({from,to,bidirectional:true}))
  },
  collision:[
   {id:'office-block-north-wall',type:'aabb',minX:120,maxX:3700,minDepth:-175,maxDepth:-148,material:'concrete',effect:'none'},
   {id:'plaza-planter-edge',type:'segment',x1:650,depth1:145,x2:3100,depth2:145,radius:11,material:'stone',effect:'none'}
  ],
  gameplayZones:[
   {id:'career-district-pedestrian-plaza',type:'aabb',minX:180,maxX:1650,minDepth:-120,maxDepth:120,effect:'crowded-corridor'},
   {id:'innovation-hub-rain-exposed-walkway',type:'aabb',minX:2900,maxX:3720,minDepth:-120,maxDepth:120,effect:'wet-floor'}
  ],
  spawnPoints:{
   default:{x:180,depth:0},fromTownship:{x:180,depth:0},
   fromCampus:{x:3670,depth:0},fromResidence:{x:300,depth:0}
  },
  artDelivery:{
   requiredLayers:['background','midground','foreground'],
   interactiveProps:[
    'career-opportunity-display','career-reception-desk','consultation-seating',
    'interview-reception-signage','waiting-chairs','interview-room-signage',
    'bookshop-window-display','bookshelves','innovation-project-showcase',
    'collaboration-tables','glass-meeting-room-doors','public-wayfinding-signage'
   ],
   architecture:'Use a distinct contemporary Nairobi commercial and institutional identity; avoid generic glass-city shorthand. Establish credible building scale, materials, street furniture and public space.',
   localIdentity:'Use locally grounded urban details and original fictional signage. Do not reproduce real company logos or invent real job openings.',
   safety:'Maintain continuous pedestrian routes, visible entrances and safe separation from road and vehicle art.',
   noInventedAssets:true,artistMustReviewWalkableDepthPlane:true,allHotspotsMustBeAlignedToFinalPaintover:true
  }
 };
 function validate(world){
  if(!world||!world.districts||!world.districts.city)throw new Error('City blueprint requires canonical world content.');
  const places=new Set(world.districts.city.places.map(p=>p.id));
  Object.keys(blueprint.places).forEach(id=>{if(!places.has(id))throw new Error('City blueprint references unknown place: '+id);});
  const anchors=new Set(Object.values(blueprint.places).map(p=>p.anchor)),ids=new Set();
  blueprint.navigation.nodes.forEach(n=>{if(!anchors.has(n.anchor)||ids.has(n.id))throw new Error('City navigation has invalid or duplicate node.');ids.add(n.id);});
  blueprint.navigation.edges.forEach(e=>{if(!ids.has(e.from)||!ids.has(e.to)||e.from===e.to)throw new Error('City navigation edge is invalid.');});
  Object.values(blueprint.spawnPoints).forEach(p=>{if(p.x<blueprint.design.playerBounds.minX||p.x>blueprint.design.playerBounds.maxX||p.depth<blueprint.design.depthBounds.min||p.depth>blueprint.design.depthBounds.max)throw new Error('City spawn point is outside authored bounds.');});
  return Object.freeze({district:'city',placeCount:Object.keys(blueprint.places).length,npcCount:0,navigationNodeCount:blueprint.navigation.nodes.length,artworkReady:false,runtimeReady:false});
 }
 root.SemesterCityBlueprint=Object.freeze({getBlueprint:()=>blueprint,validate});
})(typeof window!=='undefined'?window:globalThis);
