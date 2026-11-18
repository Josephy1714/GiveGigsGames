/* Semester Survival — student phone and academic portal data runtime.
 * Reads the life engine and authored world as sources of truth; never invents grades or messages.
 */
(function(root){
  'use strict';
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function create(options){
    options=options||{};
    const life=options.lifeEngine, world=options.world||root.SemesterWorldContent;
    const input=options.inputManager||null, services=options.universityServices||null, onEvent=typeof options.onEvent==='function'?options.onEvent:function(){};
    if(!life||typeof life.getState!=='function'||!world||!world.districts)throw new Error('Student phone requires the life engine and authored world.');
    let open=false, section='home', destroyed=false;
    const sections=['home','timetable','courses','academics','assignments','assessments','finances','messages','map'];
    function snapshot(){
      const s=life.getState(), district=world.districts[s.location];
      const people=Object.keys(s.relationships||{}).map(key=>{
        const person=s.relationships[key];
        return {key,name:person.name,affinity:person.affinity,trust:person.trust,history:(person.history||[]).slice(-3)};
      });
      return clone({
        open,section,player:s.player,campaign:s.campaign,calendar:s.calendar,location:s.location,
        condition:s.condition,finances:s.finances,academics:s.academics,
        timetable:life.getTimetable(),relationships:people,
        district:district?{id:s.location,title:district.title,exits:district.exits,places:district.places.map(p=>({id:p.id,name:p.name,actions:p.actions}))}:null,
        journal:(s.journal||[]).slice(-12),university:services?services.getSnapshot():null
      });
    }
    function setOpen(value){
      if(destroyed)return snapshot();
      open=!!value;
      if(input&&typeof input.setContext==='function')input.setContext({phoneOpen:open});
      if(open)onEvent(Object.freeze({type:'phone:opened',section:section}));
      else onEvent(Object.freeze({type:'phone:closed'}));
      return snapshot();
    }
    function toggle(){return setOpen(!open);}
    function navigate(next){
      if(!sections.includes(next))throw new Error('Unknown phone section: '+next);
      section=next;
      if(open&&(next==='academics'||next==='courses'||next==='assessments'))onEvent(Object.freeze({type:'academics:reviewed',section:next,semester:life.getState().campaign.semester}));
      if(open&&next==='finances')onEvent(Object.freeze({type:'budget:reviewed',cash:life.getState().finances.cash}));
      return snapshot();
    }
    function receiveEvent(event){if(services)services.receive(event);onEvent(event);return snapshot();}
    function submitAssignment(id,score){if(!services)throw new Error('University services are not connected.');return services.submitAssignment(id,score);}
    function registerCourses(ids){if(!services)throw new Error('University services are not connected.');return services.registerCourses(ids);}
    function markRead(id,kind){if(!services)throw new Error('University services are not connected.');return services.markRead(id,kind);}
    function reply(id,message){if(!services)throw new Error('University services are not connected.');return services.reply(id,message);}
    function handleIntent(intent){
      if(!intent)return snapshot();
      if(intent.phonePressed)toggle();
      if(intent.pausePressed&&open)setOpen(false);
      return snapshot();
    }
    function destroy(){if(destroyed)return;setOpen(false);destroyed=true;}
    return Object.freeze({getSnapshot:snapshot,setOpen:setOpen,toggle:toggle,navigate:navigate,handleIntent:handleIntent,receiveEvent:receiveEvent,submitAssignment:submitAssignment,registerCourses:registerCourses,markRead:markRead,reply:reply,destroy:destroy,sections:sections.slice()});
  }
  root.SemesterStudentPhone=Object.freeze({create:create});
})(typeof window!=='undefined'?window:globalThis);
