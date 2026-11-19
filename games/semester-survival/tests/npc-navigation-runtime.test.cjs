const test=require('node:test');
const assert=require('node:assert/strict');
require('../world-content.js');
require('../weather-runtime.js');
require('../npc-schedule-runtime.js');
require('../npc-navigation-runtime.js');

function setup(graph){
 const world=global.SemesterWorldContent;
 const weather=global.SemesterWeatherRuntime.create();
 const schedules=global.SemesterNpcScheduleRuntime.create({world,weatherRuntime:weather});
 schedules.update({week:1,dayIndex:1,minuteOfDay:8*60},'campus');
 const sceneManifest={campus:{
  npcAnchors:[{characterId:'brian',anchor:'brian-start'}],
  navigation:graph
 }};
 const environment={
  getState:()=>({district:'campus'}),
  getPlaces:()=>[{id:'student-commons',available:true,anchor:'commons-destination'}]
 };
 const coordinates={
  'brian-start':{x:10,y:20,width:20,height:20,centerX:20,centerY:30},
  'corridor-node':{x:100,y:20,width:20,height:20,centerX:110,centerY:30},
  'commons-destination':{x:200,y:20,width:20,height:20,centerX:210,centerY:30}
 };
 const renderer={getHotspotBounds:anchor=>coordinates[anchor]||null};
 const runtime=global.SemesterNpcNavigationRuntime.create({world,scheduleRuntime:schedules,environment,renderer,sceneManifest});
 return {runtime,schedules,weather};
}
test('plans the shortest route using authored hotspot nodes and edges only',()=>{
 const {runtime,schedules,weather}=setup({nodes:[{id:'start',anchor:'brian-start'},{id:'hall',anchor:'corridor-node'},{id:'destination',anchor:'commons-destination'}],edges:[{from:'start',to:'hall'},{from:'hall',to:'destination'},{from:'start',to:'destination'}]});
 const routes=runtime.update();
 const brian=routes.find(route=>route.characterId==='brian');
 assert.equal(brian.status,'route-ready');
 assert.deepEqual(brian.waypoints.map(point=>point.nodeId),['start','destination']);
 assert.equal(brian.distance,190);
 assert.equal(brian.visualReady,false);
 assert.equal(brian.movementReady,false);
 runtime.destroy();schedules.destroy();weather.destroy();
});
test('reports disconnected authored graph instead of inventing a shortcut',()=>{
 const {runtime,schedules,weather}=setup({nodes:[{id:'start',anchor:'brian-start'},{id:'destination',anchor:'commons-destination'}],edges:[]});
 const brian=runtime.update().find(route=>route.characterId==='brian');
 assert.equal(brian.status,'no-authored-route');
 assert.equal(brian.waypoints.length,0);
 runtime.destroy();schedules.destroy();weather.destroy();
});
test('reports missing scene graph as unavailable and never creates coordinates',()=>{
 const {runtime,schedules,weather}=setup(null);
 const brian=runtime.update().find(route=>route.characterId==='brian');
 assert.equal(brian.status,'navigation-not-authored');
 assert.equal(brian.waypoints.length,0);
 runtime.destroy();schedules.destroy();weather.destroy();
});
test('offscreen NPCs are not given local routes or fabricated screen positions',()=>{
 const {runtime,schedules,weather}=setup({nodes:[{id:'start',anchor:'brian-start'},{id:'destination',anchor:'commons-destination'}],edges:[{from:'start',to:'destination'}]});
 const routes=runtime.update();
 assert.ok(routes.filter(route=>route.status==='offscreen').every(route=>route.waypoints.length===0));
 runtime.destroy();schedules.destroy();weather.destroy();
});
