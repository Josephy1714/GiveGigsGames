const test=require('node:test');
const assert=require('node:assert/strict');
require('../games/semester-survival/life-systems.js');
require('../games/semester-survival/university-services.js');
function storage(){const data=new Map();return{getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
function setup(){
 const store=storage(),life=global.SemesterLifeSystems.createEngine(store),events=[];
 const services=global.SemesterUniversityServices.create({lifeEngine:life,storage:store,onEvent:e=>events.push(e)});
 return{life,services,events,store};
}
test('course registration enforces unique selection, credit limits and a single add-drop action',()=>{
 const {life,services,events}=setup(),catalog=life.getState().academics.catalog;
 const ids=[catalog[0].id,catalog[1].id,catalog[2].id,catalog[3].id,catalog[5].id];
 assert.throws(()=>services.registerCourses([ids[0],ids[0],ids[1]]),/twice/);
 assert.throws(()=>services.registerCourses(ids.slice(0,4)),/five courses/);
 services.registerCourses(ids);assert.equal(life.getState().academics.courses.length,3);
 assert.equal(services.getSnapshot().credits,15);assert.ok(events.some(e=>e.type==='courses:registered'));
 assert.throws(()=>life.registerCourses(ids),/locked/);
});
test('assignment deadlines persist and submissions update academic records',()=>{
 const {life,services,store,events}=setup(),first=services.getSnapshot().assignments[0];
 const submitted=services.submitAssignment(first.id);
 assert.equal(submitted.assignment.status,'submitted');
 assert.ok(life.getState().academics.courses.find(c=>c.id===first.courseId).assignmentPoints>0);
 const reloaded=global.SemesterLifeSystems.createEngine(store);assert.ok(reloaded.getState().academics.courses.find(c=>c.id===first.courseId).assignmentPoints>0);
 assert.ok(events.some(e=>e.type==='assignment:submitted'));
 const restored=global.SemesterUniversityServices.create({lifeEngine:life,storage:store});
 assert.equal(restored.getSnapshot().assignments.find(a=>a.id===first.id).status,'submitted');
 assert.throws(()=>restored.submitAssignment(first.id),/already been submitted/);
});
test('deadline reminders and late submission penalties are driven by simulation time',()=>{
 const {life,services,events}=setup(),assignment=services.getSnapshot().assignments[0];
 for(let i=0;i<25;i++)life.perform('sleep');
 assert.equal(services.getSnapshot().assignments.find(a=>a.id===assignment.id).status,'overdue');
 const result=services.submitAssignment(assignment.id);
 assert.equal(result.assignment.status,'submitted-late');
 assert.ok(result.assignment.score<=85);
 assert.ok(events.some(e=>e.type==='assignment:overdue'));
});
test('finance ledger records real spending and earnings',()=>{
 const {life}=setup();life.travel('township');life.perform('eat');life.perform('work');
 const ledger=life.getState().finances.transactions;
 assert.equal(ledger.length,2);assert.equal(ledger[0].type,'expense');assert.equal(ledger[1].type,'income');
 assert.equal(ledger[0].balance,2380);assert.equal(ledger[1].balance,2830);
});
test('dialogue and assessment events create authored inbox messages',()=>{
 const {services}=setup();
 services.receive({type:'dialogue:opened',characterId:'amina'});
 services.receive({type:'dialogue:opened',characterId:'amina'});
 assert.equal(services.getSnapshot().messages.length,1);
 services.receive({type:'assessment:submitted',assessment:'cat'});
 assert.equal(services.getSnapshot().messages.length,2);
});
test('message replies and read state are persisted',()=>{
 const {services,store}=setup();
 services.receive({type:'dialogue:opened',characterId:'brian'});
 const message=services.getSnapshot().messages[0];
 services.markRead(message.id,'message');
 services.reply(message.id,'Thanks, I will check the timetable.');
 const restored=global.SemesterUniversityServices.create({lifeEngine:servicesLife(store),storage:store});
 assert.equal(restored.getSnapshot().messages.length,2);
 assert.equal(restored.getSnapshot().messages[0].read,true);
});
function servicesLife(store){return global.SemesterLifeSystems.createEngine(store);}
