'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../interaction-runtime.js');

function harness(extra) {
  extra = extra || {};
  const events = [], focused = [], context = [], relationships = [];
  const world = {
    districts: { township: { places: [
      { id: 'mama-njeri-kiosk', name: 'Mama Njeri’s Food Kiosk', actions: ['buy-meal', 'talk-vendor'], exposure: 'outdoor' }
    ] } },
    characters: {
      njeri: { name: 'Mama Njeri', introduction: 'Karibu! What are you having today?', topics: { budget: ['Plan your meals for the week.'] } },
      brian: { name: 'Brian', introduction: 'Top bunk is mine.', topics: { study: ['The library is quiet after lunch.'] } }
    }
  };
  const environment = {
    getState() { return { district: 'township' }; },
    getPlaces() { return [{ id: 'mama-njeri-kiosk', name: 'Mama Njeri’s Food Kiosk', actions: ['buy-meal', 'talk-vendor'], exposure: 'outdoor', anchor: 'kiosk-hotspot', available: true }]; }
  };
  const renderer = {
    getHotspotBounds(id) { return id === 'kiosk-hotspot' ? { x: 100, y: 100, width: 40, height: 40, centerX: 120, centerY: 120 } : { x: 180, y: 100, width: 40, height: 40, centerX: 200, centerY: 120 }; },
    focusInteractable(id) { focused.push(id); }
  };
  const state = { location: 'township' };
  const life = {
    getState() { return state; },
    perform(activity) { events.push({ type: 'activity', activity }); return { result: { activity } }; },
    recordRelationship(key, changes, event) { relationships.push({ key, changes, event }); }
  };
  const input = { setContext(value) { context.push(value); } };
  const weatherRuntime = { assessExposure(exposure) { return { exposure, advisory: 'Heavy rain: take shelter.', shelterRecommended: true, precipitation: 1 }; } };
  const runtime = globalThis.SemesterInteractionRuntime.create({
    world, environment, renderer, lifeEngine: life, inputManager: input, weatherRuntime,
    npcAnchors: { township: [{ characterId: 'njeri', anchor: 'njeri-hotspot', radius: 72 }] },
    speechRuntime: extra.speechRuntime, voiceTracks: extra.voiceTracks
  });
  return { runtime, events, focused, context, relationships };
}

test('proximity prompt appears only inside authored hotspot radius', () => {
  const h = harness();
  assert.equal(h.runtime.refresh({ x: 10, y: 10 }), null);
  const nearby = h.runtime.refresh({ x: 120, y: 120 });
  assert.equal(nearby.id, 'mama-njeri-kiosk');
  assert.equal(nearby.type, 'place');
  assert.match(nearby.prompt, /Mama Njeri/);
});

test('interacting with a nearby place runs its mapped life activity and focuses hotspot', () => {
  const h = harness();
  const result = h.runtime.interact({ x: 120, y: 120 }, { interactPressed: true });
  assert.equal(result.type, 'interaction:completed');
  assert.equal(result.activity, 'eat');
  assert.deepEqual(h.focused, ['kiosk-hotspot']);
  assert.deepEqual(h.events[0], { type: 'activity', activity: 'eat' });
});

test('talk action opens authored NPC dialogue and applies relationship consequences', () => {
  const h = harness();
  const opened = h.runtime.interact({ x: 120, y: 120 }, { interaction: 'talk-vendor' });
  assert.equal(opened.type, 'dialogue:state');
  assert.match(opened.dialogue.line, /Karibu/);
  assert.deepEqual(h.context.at(-1), { dialogueOpen: true });
  const next = h.runtime.interact({ x: 120, y: 120 }, { topic: 'budget' });
  assert.match(next.dialogue.line, /Plan your meals/);
  assert.equal(h.relationships.at(-1).key, 'vendor');
  assert.deepEqual(h.relationships.at(-1).changes, { affinity: 1, trust: 1 });
});

test('dialogue closes and releases the input context lock', () => {
  const h = harness();
  h.runtime.openDialogue('njeri');
  assert.equal(h.runtime.closeDialogue(), true);
  assert.equal(h.runtime.getDialogue(), null);
  assert.equal(h.runtime.getNearby(), null);
  assert.deepEqual(h.context.at(-1), { dialogueOpen: false });
});

test('NPC proximity uses its own authored hotspot and opens conversation', () => {
  const h = harness();
  const nearby = h.runtime.refresh({ x: 200, y: 120 });
  assert.equal(nearby.type, 'character');
  const result = h.runtime.interact({ x: 200, y: 120 }, { interactPressed: true });
  assert.equal(result.dialogue.characterId, 'njeri');
});

test('unknown topics and missing position fail explicitly', () => {
  const h = harness();
  assert.throws(() => h.runtime.refresh(null), /finite world/);
  h.runtime.openDialogue('njeri');
  assert.throws(() => h.runtime.chooseTopic('gossip'), /not available/);
});

test('outdoor activities surface clear weather advice without secretly blocking the activity',()=>{
 const h=harness();
 const result=h.runtime.interact({x:120,y:120},{interaction:'buy-meal'});
 assert.equal(result.type,'interaction:completed');
 assert.equal(result.weather.shelterRecommended,true);
 assert.ok(h.events.some(event=>event.type==='weather:activity-advisory'&&event.message==='Heavy rain: take shelter.'));
 assert.ok(h.events.some(event=>event.type==='activity'&&event.activity==='eat'));
});

test('dialogue starts the matching authored voice track and stops it when conversation closes',()=>{
 const calls=[];
 const speechRuntime={start(track){calls.push(['start',track.id]);return Promise.resolve();},stop(){calls.push(['stop']);},getState(){return {status:'speaking',viseme:'viseme-A'};}};
 const voiceTracks={njeri:{introduction:{id:'njeri-intro'},topics:{budget:{id:'njeri-budget'}}}};
 const h=harness({speechRuntime,voiceTracks});
 const opened=h.runtime.openDialogue('njeri');
 assert.equal(calls[0][0],'start');assert.equal(calls[0][1],'njeri-intro');
 assert.equal(opened.speech.status,'speaking');
 h.runtime.chooseTopic('budget');
 assert.deepEqual(calls[1],['start','njeri-budget']);
 h.runtime.closeDialogue();
 assert.deepEqual(calls[2],['stop']);
});

test('text dialogue remains usable when voice playback or approved mouth art is unavailable',()=>{
 const speechRuntime={start(){throw new Error('No approved mouth atlas.');},stop(){},getState(){return {status:'idle',available:false};}};
 const h=harness({speechRuntime,voiceTracks:{njeri:{introduction:{id:'unavailable'}}}});
 const dialogue=h.runtime.openDialogue('njeri');
 assert.match(dialogue.line,/Karibu/);
 assert.ok(h.events.some(event=>event.type==='dialogue:voice-unavailable'));
 assert.equal(dialogue.speech.available,false);
});


test('authored conversation choices carry relationship gates, speaker turns and per-choice effects',()=>{
 const world={districts:{township:{places:[]}},characters:{amina:{name:'Amina',introduction:'Hello.',topics:{study:['Legacy topic response.']},conversationChoices:[{id:'open-up',label:'Share a concern',response:'That sounds difficult. We can work through it together.',expression:'empathetic',effects:{affinity:3,trust:4}},{id:'locked',label:'Ask a personal question',response:'I trust you with that.',requires:{affinity:30},effects:{affinity:1,trust:2}}]}}};
 const events=[], relationships=[];const life={getState(){return {location:'township',relationships:{coursemate:{affinity:15,trust:8}}};},perform(){},recordRelationship(key,changes,event){relationships.push({key,changes,event});}};
 const env={getState(){return {district:'township'};},getPlaces(){return [];}};const renderer={getHotspotBounds(){return null;},focusInteractable(){}};
 const rt=globalThis.SemesterInteractionRuntime.create({world,environment:env,renderer,lifeEngine:life,onEvent:e=>events.push(e)});
 const opened=rt.openDialogue('amina');assert.deepEqual(opened.choices.map(c=>c.id),['open-up']);
 assert.equal(opened.historyEntries[0].speakerName,'Amina');
 const next=rt.chooseTopic('open-up');assert.equal(next.historyEntries.at(-1).expression,'empathetic');
 assert.deepEqual(relationships[0].changes,{affinity:3,trust:4});
 assert.throws(()=>rt.chooseTopic('open-up'),/not currently available/);
 assert.throws(()=>rt.chooseTopic('locked'),/not currently available/);
});

test('opening dialogue respects persisted relationship gates while retaining legacy topics',()=>{
 const world={districts:{township:{places:[]}},characters:{amina:{name:'Amina',introduction:'Hello.',topics:{study:['Legacy study response.']},conversationChoices:[{id:'unlocked',label:'Say hello',response:'Hello back.'},{id:'locked',label:'Ask something personal',response:'I trust you.',requires:{affinity:30}}]}}};
 const state={location:'township',relationships:{coursemate:{affinity:15,trust:8}}};
 const life={getState(){return state;},perform(){},recordRelationship(){}};
 const rt=globalThis.SemesterInteractionRuntime.create({world,environment:{getState(){return {district:'township'};},getPlaces(){return []; }},renderer:{getHotspotBounds(){return null;},focusInteractable(){}},lifeEngine:life});
 const d=rt.openDialogue('amina');assert.deepEqual(d.choices.map(c=>c.id),['unlocked','study']);
 assert.ok(!d.choices.some(c=>c.id==='locked'));
});

test('authored group scene opens only when every scheduled participant is present and records group turns',()=>{
 const world={districts:{campus:{places:[{id:'student-commons',name:'Student Commons',actions:['join-study-circle']}] }},characters:{amina:{name:'Amina'},sumeya:{name:'Sumeya'}},socialScenes:[{id:'circle',title:'Study Circle',district:'campus',placeId:'student-commons',from:780,to:960,minParticipants:2,participants:['amina','sumeya'],opening:[{speakerId:'amina',text:'Let us begin.'},{speakerId:'sumeya',text:'I am ready.'}],choices:[{id:'plan',label:'Make a revision plan',turns:[{speakerId:'amina',text:'I will prepare examples.'},{speakerId:'sumeya',text:'I will make a summary.'}],effects:{amina:{affinity:2,trust:2},sumeya:{affinity:2,trust:2}}}]}]};
 const state={location:'campus',calendar:{minuteOfDay:800},relationships:{coursemate:{affinity:10,trust:5},sumeya:{affinity:10,trust:5}}};const recorded=[];
 const life={getState(){return state;},perform(){},recordRelationship(k,e,t){recorded.push({k,e,t});}};
 const schedules={getState(){return ['amina','sumeya'].map(id=>({characterId:id,presence:'in-active-district',targetDistrict:'campus',targetPlaceId:'student-commons'}));}};
 const env={getState(){return {district:'campus'};},getPlaces(){return [{id:'student-commons',available:true,anchor:'commons'}];}};
 const renderer={getHotspotBounds(){return {x:0,y:0,width:50,height:50};},focusInteractable(){}};
 const rt=globalThis.SemesterInteractionRuntime.create({world,environment:env,renderer,lifeEngine:life,npcScheduleRuntime:schedules});
 const opened=rt.openGroupDialogue('circle');assert.equal(opened.groupScene,true);assert.equal(opened.participants.length,2);
 const next=rt.chooseTopic('plan');assert.deepEqual(next.historyEntries.slice(-3).map(x=>x.speakerName),['Jay','Amina','Sumeya']);assert.equal(recorded.length,2);assert.equal(next.choices.length,0);assert.throws(()=>rt.chooseTopic('plan'),/not available/);
});

test('study-circle gathering is reachable through the authored student-commons interaction action',()=>{
 const world={districts:{campus:{places:[{id:'student-commons',name:'Student Commons',actions:['join-study-circle']}] }},characters:{amina:{name:'Amina'},sumeya:{name:'Sumeya'}},socialScenes:[{id:'circle',title:'Study Circle',district:'campus',placeId:'student-commons',from:780,to:960,minParticipants:2,participants:['amina','sumeya'],opening:[{speakerId:'amina',text:'Let us begin.'}],choices:[{id:'plan',label:'Make a revision plan',turns:[{speakerId:'amina',text:'I will prepare examples.'}],effects:{amina:{affinity:2,trust:2}}}]}]};
 const state={location:'campus',calendar:{minuteOfDay:800},relationships:{coursemate:{affinity:10,trust:5}}};const life={getState(){return state;},perform(){},recordRelationship(){}};
 const schedules={getState(){return ['amina','sumeya'].map(id=>({characterId:id,presence:'in-active-district',targetDistrict:'campus',targetPlaceId:'student-commons'}));}};
 const env={getState(){return {district:'campus'};},getPlaces(){return [{id:'student-commons',name:'Student Commons',available:true,anchor:'commons',actions:['join-study-circle']}];}};
 const renderer={getHotspotBounds(){return {x:0,y:0,width:50,height:50};},focusInteractable(){}};
 const rt=globalThis.SemesterInteractionRuntime.create({world,environment:env,renderer,lifeEngine:life,npcScheduleRuntime:schedules});
 const result=rt.interact({x:10,y:10},{interaction:'join-study-circle'});assert.equal(result.type,'dialogue:group-state');assert.equal(result.dialogue.groupScene,true);
});

test('group scene fails closed when a required participant is not scheduled at the gathering place',()=>{
 const world={districts:{campus:{places:[{id:'student-commons',name:'Student Commons',actions:['join-study-circle']}] }},characters:{amina:{name:'Amina'},sumeya:{name:'Sumeya'}},socialScenes:[{id:'circle',title:'Study Circle',district:'campus',placeId:'student-commons',from:780,to:960,minParticipants:2,participants:['amina','sumeya'],opening:[{speakerId:'amina',text:'Let us begin.'}],choices:[{id:'plan',label:'Make a revision plan',turns:[{speakerId:'amina',text:'I will prepare examples.'}]}]}]};
 const life={getState(){return {location:'campus',calendar:{minuteOfDay:800},relationships:{}};},perform(){}};
 const env={getState(){return {district:'campus'};},getPlaces(){return [{id:'student-commons',available:true,anchor:'commons'}];}};
 const renderer={getHotspotBounds(){return {x:0,y:0,width:50,height:50};},focusInteractable(){}};
 const schedules={getState(){return [{characterId:'amina',presence:'in-active-district',targetDistrict:'campus',targetPlaceId:'student-commons'}];}};
 const rt=globalThis.SemesterInteractionRuntime.create({world,environment:env,renderer,lifeEngine:life,npcScheduleRuntime:schedules});
 assert.throws(()=>rt.openGroupDialogue('circle'),/full study circle has not assembled/);
});
