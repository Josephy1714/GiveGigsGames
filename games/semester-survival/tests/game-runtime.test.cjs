const test=require('node:test');
const assert=require('node:assert/strict');
require('../life-systems.js');
require('../world-content.js');
require('../input-manager.js');
require('../character-controller.js');
require('../character-animation.js');
require('../character-runtime.js');
require('../scene-assets.js');
require('../scene-renderer.js');
require('../environment-runtime.js');
require('../interaction-runtime.js');
require('../interaction-ui.js');
require('../campaign-runtime.js');
require('../campaign-ui.js');
require('../university-services.js');
require('../student-phone-runtime.js');
require('../student-phone-ui.js');
require('../weather-runtime.js');
require('../npc-schedule-runtime.js');
require('../game-runtime.js');

class ElementMock{
 constructor(tag,doc){this.tagName=String(tag).toUpperCase();this.ownerDocument=doc;this.children=[];this.listeners={};this.attributes={};this.style={};this.hidden=false;this.disabled=false;this.value='';this.checked=false;this.textContent='';this.parentNode=null;this.width=0;this.height=0;this.className='';this.classList={add:()=>{},remove:()=>{},toggle:()=>{}};}
 get firstChild(){return this.children[0]||null;}
 appendChild(node){node.parentNode=this;this.children.push(node);return node;}
 append(...nodes){nodes.forEach(node=>this.appendChild(node));}
 removeChild(node){const i=this.children.indexOf(node);if(i>=0)this.children.splice(i,1);node.parentNode=null;return node;}
 replaceChildren(...nodes){this.children.slice().forEach(node=>this.removeChild(node));nodes.forEach(node=>this.appendChild(node));}
 setAttribute(key,value){this.attributes[key]=String(value);}
 getAttribute(key){return this.attributes[key]||null;}
 addEventListener(type,fn){this.listeners[type]=fn;}
 removeEventListener(type){delete this.listeners[type];}
 remove(){if(this.parentNode)this.parentNode.removeChild(this);}
 focus(){}
 getBoundingClientRect(){return{width:960,height:540};}
 getContext(){return this.context||(this.context={globalAlpha:1,setTransform(){},clearRect(){},save(){},restore(){},translate(){},scale(){},drawImage(){},beginPath(){},rect(){},clip(){},fillRect(){},moveTo(){},lineTo(){},stroke(){}});}
}
function makeDocument(){return{hidden:false,listeners:{},createElement(tag){return new ElementMock(tag,this);},addEventListener(type,fn){this.listeners[type]=fn;},removeEventListener(type){delete this.listeners[type];}};}
function fixture(){
 const world=global.SemesterWorldContent,assetScenes={},sceneManifest={};
 Object.keys(world.districts).forEach(district=>{
  const backgroundId='background-'+district;
  const assets=[{id:backgroundId,src:'assets/'+district+'.png',role:'background',width:640,height:360,maxBytes:2048,credit:{author:'Test fixture',license:'Test-only'}}];
  if(district==='residence')assets.push({id:'character-atlas',src:'assets/character-atlas.png',role:'character-atlas',width:64,height:64,maxBytes:2048,credit:{author:'Test fixture',license:'Test-only'}});
  assetScenes[district]={assets};
  const interactables={},hotspots={};
  world.districts[district].places.forEach((place,index)=>{
   const anchor=district+'-'+place.id;interactables[place.id]={anchor};
   hotspots[anchor]={x:place.id==='matatu-stage'?520:(index===0?100:500+index*5),y:(index===0||place.id==='matatu-stage')?0:250,width:40,height:40};
  });
  sceneManifest[district]={sceneId:'fixture-'+district,requiredAssetIds:[backgroundId],spawnPoints:{default:{x:120,depth:0},stage:{x:540,depth:0}},interactables:interactables,npcAnchors:[],render:{width:640,height:360,layers:[{id:'background',assetId:backgroundId,x:0,y:0,width:640,height:360,parallax:0}],hotspots:hotspots}};
 });
 const clips={};global.SemesterCharacterRuntime.requiredClips.forEach(name=>{clips[name]={fps:8,playback:'loop',frames:[{x:0,y:0,width:16,height:16,pivotX:8,pivotY:16}]};});
 return{world,assetManifest:{version:1,scenes:assetScenes},sceneManifest,characterAtlas:{assetId:'character-atlas',manifest:{clips}}};
}
function memoryStorage(){const map=new Map();return{getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};}

test('central runtime composes, starts, routes events, travels and tears down',async()=>{
 const doc=makeDocument(),host=new ElementMock('main',doc),events=[],storage=memoryStorage(),assets=fixture();
 const runtime=global.SemesterAdventureRuntime.create({...assets,host,document:doc,storage,autoLoop:false,loadImage:async(src,asset)=>({width:asset.width,height:asset.height,naturalWidth:asset.width,naturalHeight:asset.height})});
 const unsubscribe=runtime.subscribe(event=>events.push(event));
 const started=await runtime.start();
 assert.equal(started.lifecycle,'running');assert.equal(started.district,'residence');assert.equal(started.atlasReady,true);
 assert.equal(runtime.getDiagnostics().environment.length,4);
 runtime.interact({interactPressed:true});
 assert.ok(events.some(event=>event.type==='interaction:completed'&&event.activity==='sleep'));
 runtime.receiveEvent({type:'dialogue:opened',characterId:'amina'});
 assert.equal(runtime.getState().university.messages.length,1);
 const course=runtime.getState().life.academics.courses[0],assignment=runtime.getState().university.assignments.find(item=>item.courseId===course.id);
 runtime.workOnAssignment(course.id);runtime.workOnAssignment(course.id);
 const submission=runtime.submitAssignment(assignment.id);
 assert.equal(submission.assignment.status,'submitted');
 assert.ok(runtime.getState().university.messages.some(message=>message.from==='Wanjiku'));
 runtime.openPhone();assert.equal(runtime.getState().phone.open,true);
 runtime.navigatePhone('assignments');assert.equal(runtime.getState().phone.section,'assignments');
 runtime.closePhone();assert.equal(runtime.getState().phone.open,false);
 await runtime.travelTo('township',{spawn:'stage'});assert.equal(runtime.getState().district,'township');assert.equal(runtime.getState().life.location,'township');
 await runtime.interact({interaction:'travel-campus'});assert.equal(runtime.getState().district,'campus');assert.equal(runtime.getState().life.location,'campus');
 runtime.pause();assert.equal(runtime.getState().lifecycle,'paused');runtime.resume();assert.equal(runtime.getState().lifecycle,'running');
 unsubscribe();runtime.destroy();assert.equal(runtime.getState().lifecycle,'disposed');
});

test('runtime fails closed without real authored art configuration',()=>{
 const doc=makeDocument(),host=new ElementMock('main',doc);
 assert.throws(()=>global.SemesterAdventureRuntime.create({host,document:doc}),/credited local scene assets/);
});

test('coursework interface contains no file picker or external document upload',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../student-phone-ui.js'),'utf8');
 assert.doesNotMatch(source,/type\s*=\s*['"]file['"]/i);
 assert.doesNotMatch(source,/\.files\b|FormData\s*\(/);
 assert.match(source,/No PDF, document or external file upload is required/);
});

test('central runtime exposes live weather and a three-day forecast',async()=>{
 const doc=makeDocument(),host=new ElementMock('main',doc),assets=fixture();
 const runtime=global.SemesterAdventureRuntime.create({...assets,host,document:doc,storage:memoryStorage(),autoLoop:false,loadImage:async(src,asset)=>({width:asset.width,height:asset.height,naturalWidth:asset.width,naturalHeight:asset.height})});
 await runtime.start();
 assert.ok(runtime.getState().weather);
 assert.equal(runtime.getState().weather.district,'residence');
 assert.equal(runtime.getState().npcs.length,5);
 assert.ok(runtime.getState().npcs.every(npc=>npc.visualReady===false&&npc.movementReady===false));
 assert.equal(runtime.getWeatherForecast().length,3);
 await runtime.travelTo('township');
 assert.equal(runtime.getState().weather.district,'township');
 runtime.destroy();
});
