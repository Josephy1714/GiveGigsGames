const test=require('node:test');
const assert=require('node:assert/strict');
require('../world-content.js');
require('../weather-runtime.js');
require('../npc-schedule-runtime.js');

test('authored schedules cover every named NPC and reference real world places',()=>{
 const world=global.SemesterWorldContent;
 const schedules=global.SemesterNpcScheduleRuntime.routines;
 assert.deepEqual(Object.keys(schedules).sort(),['amina','brian','einstein','ernest','mwangi','njeri','sumeya','wanjiku'].sort());
 for(const [characterId,slots] of Object.entries(schedules)){
  assert.ok(world.characters[characterId]);
  assert.ok(slots.length>=4);
  for(const slot of slots){
   assert.ok(world.districts[slot.district].places.some(place=>place.id===slot.placeId),characterId+'/'+slot.placeId);
  }
 }
});

test('routine decisions follow in-game time and expose offscreen presence honestly',()=>{
 const weather=global.SemesterWeatherRuntime.create();
 const runtime=global.SemesterNpcScheduleRuntime.create({world:global.SemesterWorldContent,weatherRuntime:weather});
 const morning=runtime.update({week:1,dayIndex:1,minuteOfDay:8*60},'residence');
 const brian=morning.find(npc=>npc.characterId==='brian');
 const amina=morning.find(npc=>npc.characterId==='amina');
 assert.equal(brian.targetPlaceId,'student-commons');
 assert.equal(brian.presence,'offscreen');
 assert.equal(amina.targetPlaceId,'main-gate');
 assert.equal(amina.presence,'offscreen');
 assert.equal(amina.visualReady,false);
 assert.equal(amina.movementReady,false);
 const later=runtime.update({week:1,dayIndex:1,minuteOfDay:14*60},'campus');
 assert.equal(later.find(npc=>npc.characterId==='amina').targetPlaceId,'library');
 assert.equal(later.find(npc=>npc.characterId==='amina').presence,'in-active-district');
 runtime.destroy();weather.destroy();
});

test('heavy rain redirects exposed NPC routines to authored shelter places',()=>{
 const weather=global.SemesterWeatherRuntime.create();
 const runtime=global.SemesterNpcScheduleRuntime.create({world:global.SemesterWorldContent,weatherRuntime:weather});
 let result=null;
 for(let week=10;week<=18&&!result;week++)for(let day=0;day<7&&!result;day++){
  const state=runtime.update({week,dayIndex:day,minuteOfDay:8*60},'campus');
  const amina=state.find(npc=>npc.characterId==='amina');
  if(amina.weather==='storm'||amina.weather==='rain')result=amina;
 }
 assert.ok(result,'Expected deterministic heavy-rain sample in long-rains season');
 assert.equal(result.scheduledPlaceId,'main-gate');
 assert.equal(result.targetPlaceId,'library');
 assert.equal(result.behaviour,'seeking-shelter');
 assert.equal(global.SemesterWorldContent.districts.campus.places.find(place=>place.id===result.targetPlaceId).exposure,'indoor');
 runtime.destroy();weather.destroy();
});

test('routine-change events are emitted only when schedule or weather decisions change',()=>{
 const events=[];
 const weather=global.SemesterWeatherRuntime.create();
 const runtime=global.SemesterNpcScheduleRuntime.create({world:global.SemesterWorldContent,weatherRuntime:weather,onEvent:event=>events.push(event)});
 runtime.update({week:1,dayIndex:0,minuteOfDay:8*60},'campus');
 runtime.update({week:1,dayIndex:0,minuteOfDay:8*60+1},'campus');
 assert.equal(events.length,1);
 assert.equal(events[0].type,'npc:routines-changed');
 assert.equal(runtime.getDiagnostics().visualActorsReady,0);
 assert.equal(runtime.getDiagnostics().artPolicy,'authored-assets-only');
 runtime.destroy();weather.destroy();
});
