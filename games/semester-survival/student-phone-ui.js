/* Student phone UI — accessible, data-driven DOM view. */
(function(root){
  'use strict';
  const LABELS={home:'Overview',timetable:'Timetable',courses:'Courses',academics:'Academic record',assignments:'Coursework',assessments:'CATs & exams',finances:'Wallet',messages:'Inbox & people',map:'District map'};
  function mount(host,phone){
    if(!host||!phone)throw new Error('Student phone UI requires a host and phone runtime.');
    const doc=host.ownerDocument||document, shell=doc.createElement('section');
    shell.className='student-phone';shell.setAttribute('aria-label','Student phone');shell.hidden=true;
    const top=doc.createElement('header');top.className='student-phone__top';
    const brand=doc.createElement('div');brand.className='student-phone__brand';brand.textContent='CAMPUS / PERSONAL';
    const close=doc.createElement('button');close.type='button';close.className='student-phone__close';close.textContent='Close';close.setAttribute('aria-label','Close student phone');
    top.append(brand,close);
    const nav=doc.createElement('nav');nav.className='student-phone__nav';nav.setAttribute('aria-label','Phone sections');
    const body=doc.createElement('main');body.className='student-phone__body';body.setAttribute('aria-live','polite');
    shell.append(top,nav,body);host.appendChild(shell);
    function el(tag,cls,text){const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;}
    function line(parent,label,value){const row=el('div','student-phone__row');row.append(el('span','',label),el('strong','',value));parent.appendChild(row);}
    function panel(title){const p=el('section','student-phone__panel');p.appendChild(el('h3','',title));body.appendChild(p);return p;}
    function render(){
      const s=phone.getSnapshot();shell.hidden=!s.open;nav.replaceChildren();body.replaceChildren();
      phone.sections.forEach(key=>{const b=el('button','student-phone__tab',LABELS[key]);b.type='button';b.setAttribute('aria-pressed',String(s.section===key));b.addEventListener('click',()=>{phone.navigate(key);render();});nav.appendChild(b);});
      const heading=el('h2','student-phone__heading',LABELS[s.section]||'Student phone');body.appendChild(heading);
      if(s.section==='home'){
        const p=panel('Your day');line(p,'Semester',''+s.campaign.semester+' / 8');line(p,'Day',s.calendar.dayIndex+1+' · Week '+s.calendar.week);line(p,'Current district',s.district?s.district.title:s.location);line(p,'Energy',Math.round(s.condition.energy)+'%');line(p,'Hunger',Math.round(s.condition.hunger)+'%');line(p,'Stress',Math.round(s.condition.stress)+'%');
        const q=panel('Campus updates');if(s.university){line(q,'Unread messages',s.university.unreadMessages);line(q,'Unread notifications',s.university.unreadNotifications);s.university.notifications.slice().reverse().slice(0,4).forEach(n=>{const row=el('article','student-phone__item');row.append(el('strong','',n.title),el('span','',n.body));if(!n.read){const read=el('button','student-phone__action','Dismiss');read.type='button';read.addEventListener('click',()=>{phone.markRead(n.id,'notification');render();});row.appendChild(read);}q.appendChild(row);});}else q.append(el('p','', 'Your phone brings together the records and tools available in this semester.'));
      }else if(s.section==='timetable'){
        const p=panel('Weekly teaching schedule');s.timetable.forEach(item=>{const row=el('article','student-phone__item');row.append(el('strong','',item.day),el('span','',item.start+'–'+item.end+' · '+item.course),el('small','',item.location));p.appendChild(row);});
      }else if(s.section==='courses'){
        const p=panel('Course registration');const selected=new Set(s.academics.courses.map(c=>c.id));const registrationOpen=!!(s.university&&s.university.registrationOpen);
        (s.university?s.university.catalog:[]).forEach(course=>{const row=el('label','student-phone__item');const check=el('input','');check.type='checkbox';check.checked=selected.has(course.id);check.disabled=!registrationOpen;check.value=course.id;check.addEventListener('change',()=>{if(check.checked)selected.add(course.id);else selected.delete(course.id);});row.append(check,el('strong','',course.id+' · '+course.name),el('span','',course.credits+' credits'+(course.prerequisites.length?' · Prerequisite: '+course.prerequisites.join(', '):'')));p.appendChild(row);});
        const save=el('button','student-phone__action','Confirm course load');save.type='button';save.disabled=!registrationOpen;save.addEventListener('click',()=>{try{phone.registerCourses(Array.from(selected));render();}catch(error){status.textContent=error.message;}});p.appendChild(save);
        const status=el('p','student-phone__note',registrationOpen?'Select five courses. Prerequisites and the 13–15 credit load are validated.':'The add/drop window is closed for this semester.');p.appendChild(status);
      }else if(s.section==='academics'){
        const p=panel('Academic standing');line(p,'Cumulative GPA',Number(s.academics.cumulativeGpa).toFixed(2));line(p,'Transcript entries',s.academics.transcript.length);line(p,'Semester',s.campaign.semester);s.academics.transcript.forEach(c=>{const row=el('article','student-phone__item');row.append(el('strong','',c.name),el('span','',c.score+'% · grade point '+c.gradePoint));p.appendChild(row);});
      }else if(s.section==='assignments'){
        const u=s.university;if(!u){panel('Coursework unavailable').append(el('p','student-phone__note','University services are not connected to this game session.'));}else{const p=panel('Assignment deadlines');u.assignments.forEach(a=>{const course=s.academics.courses.find(c=>c.id===a.courseId);const row=el('article','student-phone__item');row.append(el('strong','',a.title),el('span','',(course?course.name:a.courseId)+' · '+a.status.toUpperCase()),el('small','', 'Due in '+Math.max(0,Math.ceil((a.dueAt-s.calendar.totalMinutes)/1440))+' day(s)'));
          if(a.status==='open'||a.status==='overdue'){const work=el('button','student-phone__action','Work on this course');work.type='button';work.addEventListener('click',()=>{try{phone.workOnAssignment(a.courseId);render();}catch(error){row.appendChild(el('small','student-phone__note',error.message));}});row.appendChild(work);const submit=el('button','student-phone__action',a.status==='overdue'?'Submit late (−15 points)':'Submit prepared work');submit.type='button';submit.disabled=!(course&&course.assignmentProgress>=30);submit.addEventListener('click',()=>{try{phone.submitAssignment(a.id);render();}catch(error){row.appendChild(el('small','student-phone__note',error.message));}});row.appendChild(submit);if(!course||course.assignmentProgress<30)row.appendChild(el('small','student-phone__note','Complete two focused work sessions before submitting.'));}
          if(a.status==='submitted'||a.status==='submitted-late')row.append(el('small','', 'Recorded score: '+a.score+'%'+(a.status==='submitted-late'?' · late penalty applied':'')));p.appendChild(row);});}
      }else if(s.section==='assessments'){
        const p=panel('Recorded assessments');s.academics.courses.forEach(c=>{const row=el('article','student-phone__item');row.append(el('strong','',c.name),el('span','', 'CAT: '+(c.catScore===null?'Not recorded':c.catScore+'%')+' · Exam: '+(c.examScore===null?'Not recorded':c.examScore+'%')));p.appendChild(row);});
      }else if(s.section==='finances'){
        const p=panel('Student wallet');line(p,'Available cash','KSh '+s.finances.cash.toLocaleString());line(p,'Debt','KSh '+s.finances.debt.toLocaleString());line(p,'Lifetime earned','KSh '+s.finances.lifetimeEarned.toLocaleString());line(p,'Lifetime spent','KSh '+s.finances.lifetimeSpent.toLocaleString());const ledger=panel('Recent transactions');(s.finances.transactions||[]).slice(-12).reverse().forEach(t=>{const row=el('article','student-phone__item');row.append(el('strong','',t.description),el('span','',(t.amount<0?'−':'+')+' KSh '+Math.abs(t.amount).toLocaleString()+' · '+t.balance.toLocaleString()+' balance'),el('small','',t.day+' · '+t.category));ledger.appendChild(row);});
      }else if(s.section==='messages'){
        const u=s.university;const p=panel('Inbox');if(u){u.messages.slice().reverse().forEach(m=>{const row=el('article','student-phone__item');row.append(el('strong','',m.from+' · '+m.role),el('span','',m.body),el('small','', 'Week '+Math.floor(m.at/10080+1)+' · '+(m.read?'Read':'Unread')));
          if(!m.read){const read=el('button','student-phone__action','Mark as read');read.type='button';read.addEventListener('click',()=>{phone.markRead(m.id,'message');render();});row.appendChild(read);}
          if(m.from!=='You'){const reply=el('button','student-phone__action','Reply');reply.type='button';reply.addEventListener('click',()=>{const field=el('textarea','student-phone__reply');field.maxLength=500;field.placeholder='Write a reply…';const send=el('button','student-phone__action','Send reply');send.type='button';send.addEventListener('click',()=>{try{phone.reply(m.id,field.value);render();}catch(error){row.appendChild(el('small','student-phone__note',error.message));}});row.append(field,send);});row.appendChild(reply);}p.appendChild(row);});}
        const rel=panel('Relationships');s.relationships.forEach(person=>{const row=el('article','student-phone__item');row.append(el('strong','',person.name),el('span','', 'Affinity '+person.affinity+' · Trust '+person.trust));person.history.forEach(h=>row.appendChild(el('small','',h.day+' · '+h.event)));rel.appendChild(row);});
      }else if(s.section==='map'){
        const p=panel(s.district?s.district.title:'Current district');line(p,'Current location',s.location);(s.district?s.district.exits:[]).forEach(exit=>{const d=el('article','student-phone__item');d.append(el('strong','',exit),el('span','', (root.SemesterWorldContent.districts[exit]||{}).title||''));p.appendChild(d);});
        (s.district?s.district.places:[]).forEach(place=>{const d=el('article','student-phone__item');d.append(el('strong','',place.name),el('small','',place.actions.join(' · ')));p.appendChild(d);});
      }
      const journal=panel('Recent journal');s.journal.slice(-4).reverse().forEach(entry=>journal.appendChild(el('p','student-phone__journal',entry.day+' '+entry.time+' — '+entry.text)));
    }
    function closePhone(){phone.setOpen(false);render();}
    close.addEventListener('click',closePhone);
    function onKey(e){if(e.key==='Escape'&&phone.getSnapshot().open){e.preventDefault();closePhone();}}
    doc.addEventListener('keydown',onKey);
    function destroy(){doc.removeEventListener('keydown',onKey);close.removeEventListener('click',closePhone);shell.remove();}
    render();
    return Object.freeze({render:render,destroy:destroy,element:shell});
  }
  root.SemesterStudentPhoneUI=Object.freeze({mount:mount});
})(typeof window!=='undefined'?window:globalThis);
