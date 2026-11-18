const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../student-phone-runtime.js'), 'utf8');
function fixture(){
  const state={player:{displayName:'Student'},campaign:{semester:1},calendar:{dayIndex:0,week:1},location:'residence',condition:{energy:90,hunger:70,stress:10},finances:{cash:2500,debt:0,lifetimeEarned:0,lifetimeSpent:0},academics:{cumulativeGpa:0,courses:[{id:'S1-U1',name:'Maths',credits:3,assignmentPoints:0,catScore:null,examScore:null}],transcript:[]},relationships:{roommate:{name:'Brian',affinity:20,trust:10,history:[]}},journal:[]};
  const life={getState:()=>JSON.parse(JSON.stringify(state)),getTimetable:()=>[{day:'Monday',start:'09:00',end:'11:00',course:'Maths',location:'Hall'}]};
  const world={districts:{residence:{title:'Residence',exits:['township'],places:[{id:'room',name:'Room',actions:['sleep']}]},township:{title:'Township',exits:['residence'],places:[]}}};
  return {state,life,world};
}
function load(){
 const context={globalThis:{},SemesterWorldContent:null};
 vm.runInNewContext(source,context);
 return context.globalThis.SemesterStudentPhone;
}
test('phone reads authoritative life and world data without mutating it',()=>{
 const f=fixture(),phone=load().create({lifeEngine:f.life,world:f.world});
 const snap=phone.getSnapshot();
 assert.equal(snap.academics.courses[0].name,'Maths');
 assert.equal(snap.district.title,'Residence');
 assert.equal(snap.timetable[0].course,'Maths');
 assert.equal(f.state.finances.cash,2500);
});
test('phone section navigation emits review events only when open',()=>{
 const f=fixture(),events=[],phone=load().create({lifeEngine:f.life,world:f.world,onEvent:e=>events.push(e)});
 phone.navigate('finances');
 assert.equal(events.length,0);
 phone.setOpen(true);phone.navigate('finances');phone.navigate('academics');
 assert.deepEqual(events.map(e=>e.type),['phone:opened','budget:reviewed','academics:reviewed']);
 assert.throws(()=>phone.navigate('fake'),/Unknown phone section/);
});
test('Tab intent toggles phone and pause closes it',()=>{
 const f=fixture(),phone=load().create({lifeEngine:f.life,world:f.world});
 phone.handleIntent({phonePressed:true});assert.equal(phone.getSnapshot().open,true);
 phone.handleIntent({pausePressed:true});assert.equal(phone.getSnapshot().open,false);
});
test('destroy closes the phone and ignores later state changes',()=>{
 const f=fixture(),phone=load().create({lifeEngine:f.life,world:f.world});
 phone.setOpen(true);phone.destroy();assert.equal(phone.getSnapshot().open,false);
});
