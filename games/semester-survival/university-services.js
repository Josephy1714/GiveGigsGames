/* Semester Survival — persistent university services.
 * Deadlines, course registration, inbox and notifications use local authored data and the life engine.
 */
(function(root){
 'use strict';
 const KEY='semester-survival.university.v1',VERSION=1;
 const CATALOG=[
  {code:'FOUND',name:'Foundations of the Discipline',credits:3,semester:1,prerequisites:[]},
  {code:'MATH',name:'Mathematical Methods',credits:3,semester:1,prerequisites:[]},
  {code:'PROG',name:'Programming and Problem Solving',credits:3,semester:1,prerequisites:[]},
  {code:'COMM',name:'Communication and Academic Practice',credits:3,semester:1,prerequisites:[]},
  {code:'DATA',name:'Introduction to Data and Evidence',credits:3,semester:1,prerequisites:[]},
  {code:'STAT',name:'Statistical Modelling',credits:3,semester:2,prerequisites:['MATH']},
  {code:'ALGO',name:'Algorithms and Data Structures',credits:2,semester:2,prerequisites:['PROG']}
 ];
 function clone(v){return JSON.parse(JSON.stringify(v));}
 function makeState(semester,minute,courses){
  const assignments=[];
  courses.forEach((course,index)=>{
   assignments.push({id:course.id+'-A1',courseId:course.id,title:'Coursework 1: Concepts and applications',kind:'assignment',createdAt:minute,dueAt:minute+(3+index)*1440,status:'open',score:null,submittedAt:null});
   assignments.push({id:course.id+'-P1',courseId:course.id,title:'Practical exercise and reflection',kind:'practical',createdAt:minute,dueAt:minute+(8+index)*1440,status:'open',score:null,submittedAt:null});
  });
  return {version:VERSION,semester:semester,assignments:assignments,messages:[],notifications:[],reviewed:{},sequence:0};
 }
 function create(options){
  options=options||{};const life=options.lifeEngine,storage=options.storage||(typeof localStorage!=='undefined'?localStorage:null);
  const onEvent=typeof options.onEvent==='function'?options.onEvent:function(){};
  if(!life||typeof life.getState!=='function'||typeof life.registerCourses!=='function'||typeof life.recordAssignmentSubmission!=='function')throw new Error('University services require the current life engine APIs.');
  const initial=life.getState();let state=makeState(initial.campaign.semester,initial.calendar.totalMinutes,initial.academics.courses);
  function persist(){if(!storage)return false;try{storage.setItem(KEY,JSON.stringify(state));return true;}catch(e){return false;}}
  function emit(event){onEvent(Object.freeze(clone(event)));}
  function notify(title,body,kind){
   state.sequence++;const item={id:'notice-'+state.sequence,title:String(title).slice(0,90),body:String(body).slice(0,240),kind:kind||'info',at:life.getState().calendar.totalMinutes,read:false};
   state.notifications.push(item);if(state.notifications.length>80)state.notifications.shift();emit({type:'notification:created',notification:item});return item;
  }
  function message(from,role,body,thread){
   state.sequence++;const item={id:'message-'+state.sequence,from:from,role:role,body:String(body).slice(0,500),thread:thread||'general',at:life.getState().calendar.totalMinutes,read:false};
   state.messages.push(item);if(state.messages.length>100)state.messages.shift();notify('New message from '+from,body,'message');emit({type:'message:received',message:item});return item;
  }
  function load(){
   if(!storage)return false;try{
    const saved=JSON.parse(storage.getItem(KEY)||'null');
    if(!saved||saved.version!==VERSION||!Array.isArray(saved.assignments)||!Array.isArray(saved.messages)||!Array.isArray(saved.notifications))return false;
    const current=life.getState();if(saved.semester!==current.campaign.semester)return false;
    state=saved;return true;
   }catch(e){return false;}
  }
  function sync(){
   const s=life.getState();
   if(s.campaign.semester!==state.semester){state=makeState(s.campaign.semester,s.calendar.totalMinutes,s.academics.courses);notify('New semester','Your coursework board has been refreshed for semester '+s.campaign.semester+'.','academic');persist();}
   const now=s.calendar.totalMinutes;
   state.assignments.forEach(a=>{
    if(a.status==='open'&&now>a.dueAt){a.status='overdue';notify('Deadline missed',a.title+' is now overdue. Visit the coursework board to review your options.','warning');emit({type:'assignment:overdue',assignmentId:a.id,courseId:a.courseId});}
    else if(a.status==='open'&&!a.reminderSent&&a.dueAt-now<=1440&&a.dueAt>=now){a.reminderSent=true;notify('Deadline approaching',a.title+' is due within 24 hours.','deadline');}
   });
   persist();return snapshot();
  }
  function snapshot(){
   const s=life.getState();return clone({semester:state.semester,assignments:state.assignments,messages:state.messages,notifications:state.notifications,catalog:CATALOG.filter(c=>c.semester<=s.campaign.semester).map(c=>({id:'S'+s.campaign.semester+'-'+c.code,name:c.name,credits:c.credits,prerequisites:c.prerequisites})),registered:s.academics.courses.map(c=>({id:c.id,name:c.name,credits:c.credits})),credits:s.academics.courses.reduce((n,c)=>n+c.credits,0),unreadMessages:state.messages.filter(m=>!m.read).length,unreadNotifications:state.notifications.filter(n=>!n.read).length});
  }
  function submitAssignment(id,score){
   sync();const a=state.assignments.find(x=>x.id===id);if(!a)throw new Error('Assignment not found.');
   if(a.status==='submitted')throw new Error('This assignment has already been submitted.');
   if(a.status==='overdue')throw new Error('This deadline has passed. Late submission rules must be resolved by the academic office.');
   if(!Number.isFinite(score)||score<0||score>100)throw new Error('Score must be between 0 and 100.');
   const result=life.recordAssignmentSubmission(a.courseId,a.id,score);
   a.status='submitted';a.score=score;a.submittedAt=life.getState().calendar.totalMinutes;persist();
   notify('Assignment submitted',a.title+' was submitted successfully.','success');
   emit({type:'assignment:submitted',assignmentId:a.id,courseId:a.courseId,score:score,late:false});
   return {assignment:clone(a),result:result};
  }
  function register(courseIds){
   const before=life.getState().academics.courses.map(c=>c.id);
   const result=life.registerCourses(courseIds);
   const after=life.getState().academics.courses;
   state.assignments=state.assignments.filter(a=>after.some(c=>c.id===a.courseId));
   const existing=new Set(state.assignments.map(a=>a.id));
   after.forEach((course,index)=>{
    [{suffix:'A1',days:3+index,title:'Coursework 1: Concepts and applications',kind:'assignment'},{suffix:'P1',days:8+index,title:'Practical exercise and reflection',kind:'practical'}].forEach(d=>{
     const id=course.id+'-'+d.suffix;
     if(!existing.has(id))state.assignments.push({id:id,courseId:course.id,title:d.title,kind:d.kind,createdAt:life.getState().calendar.totalMinutes,dueAt:life.getState().calendar.totalMinutes+d.days*1440,status:'open',score:null,submittedAt:null});
    });
   });
   notify('Registration updated','Your registered course load is now '+after.length+' courses.','academic');persist();
   emit({type:'courses:registered',previous:before,registered:after.map(c=>c.id),credits:result.result.credits});
   return result;
  }
  function markRead(id,kind){
   const list=kind==='notification'?state.notifications:state.messages;const item=list.find(x=>x.id===id);if(!item)throw new Error('Item not found.');
   item.read=true;persist();return clone(item);
  }
  function reply(messageId,text){
   const original=state.messages.find(m=>m.id===messageId);if(!original)throw new Error('Message not found.');
   const replyText=String(text||'').trim();if(!replyText||replyText.length>500)throw new Error('Reply must contain 1–500 characters.');
   original.read=true;const sent={id:'out-'+(++state.sequence),from:'You',role:'Sent message',body:replyText,at:life.getState().calendar.totalMinutes,read:true,thread:original.thread};
   state.messages.push(sent);persist();emit({type:'message:sent',messageId:sent.id,replyTo:messageId});return clone(sent);
  }
  function receive(event){
   if(!event||typeof event.type!=='string')return;
   const s=life.getState();
   if(event.type==='dialogue:opened'){
    const names={brian:'Brian',amina:'Amina',wanjiku:'Wanjiku',njeri:'Mama Njeri',mwangi:'Dr. Mwangi'};
    const name=names[event.characterId];if(name&&!state.messages.some(m=>m.thread==='intro-'+event.characterId))message(name,'University contact','Good to connect. Check your student phone for coursework and campus updates.','intro-'+event.characterId);
   }else if(event.type==='assignment:submitted'){
    const a=state.assignments.find(x=>x.id===event.assignmentId);if(a)message('Wanjiku','Class Representative','Your submission for '+a.title+' has been recorded. Keep an eye on upcoming deadlines.','coursework');
   }else if(event.type==='assessment:submitted'){
    message('Dr. Mwangi','Lecturer','An assessment result has been recorded in your academic record. Review your progress and ask if anything is unclear.','academics');
   }else if(event.type==='travel'&&event.destination==='campus'&&s.calendar.week===1){
    if(!state.messages.some(m=>m.thread==='welcome-campus'))message('Wanjiku','Class Representative','Welcome to campus. Check the timetable and coursework board before the week gets busy.','welcome-campus');
   }
   persist();
  }
  function destroy(){persist();}
  load();sync();
  return Object.freeze({getSnapshot:snapshot,sync:sync,submitAssignment:submitAssignment,registerCourses:register,markRead:markRead,reply:reply,receive:receive,notify:notify,destroy:destroy,saveKey:KEY});
 }
 root.SemesterUniversityServices=Object.freeze({create:create,saveKey:KEY});
})(typeof window!=='undefined'?window:globalThis);
