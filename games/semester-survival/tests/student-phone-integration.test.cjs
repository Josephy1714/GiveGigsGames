const test=require('node:test');
const assert=require('node:assert/strict');
require('../life-systems.js');
require('../world-content.js');
require('../university-services.js');
require('../student-phone-runtime.js');
function memory(){const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};}
test('phone connects live coursework, inbox, course catalogue and finance records',()=>{
 const storage=memory(),life=global.SemesterLifeSystems.createEngine(storage),events=[];
 const services=global.SemesterUniversityServices.create({lifeEngine:life,storage,onEvent:e=>events.push(e)});
 const phone=global.SemesterStudentPhone.create({lifeEngine:life,world:global.SemesterWorldContent,universityServices:services,onEvent:e=>events.push(e)});
 const snapshot=phone.getSnapshot();
 assert.equal(snapshot.university.catalog.length,7);
 assert.equal(snapshot.university.assignments.length,10);
 phone.receiveEvent({type:'dialogue:opened',characterId:'brian'});
 assert.equal(phone.getSnapshot().university.messages.length,1);
 const first=snapshot.university.assignments[0];
 phone.submitAssignment(first.id);
 assert.equal(phone.getSnapshot().university.assignments.find(a=>a.id===first.id).status,'submitted');
 assert.ok(events.some(e=>e.type==='assignment:submitted'));
 phone.destroy();services.destroy();
});
