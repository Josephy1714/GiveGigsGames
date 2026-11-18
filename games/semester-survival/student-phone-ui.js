/* Student phone UI — accessible, data-driven DOM view. */
(function(root){
  'use strict';
  const LABELS={home:'Overview',timetable:'Timetable',courses:'Courses',academics:'Academic record',assignments:'Coursework',assessments:'CATs & exams',finances:'Wallet',messages:'People',map:'District map'};
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
        const q=panel('Quick access');q.append(el('p','', 'Your phone brings together the records and tools available in this semester.')); 
      }else if(s.section==='timetable'){
        const p=panel('Weekly teaching schedule');s.timetable.forEach(item=>{const row=el('article','student-phone__item');row.append(el('strong','',item.day),el('span','',item.start+'–'+item.end+' · '+item.course),el('small','',item.location));p.appendChild(row);});
      }else if(s.section==='courses'){
        const p=panel('Registered semester courses');s.academics.courses.forEach(c=>{const row=el('article','student-phone__item');row.append(el('strong','',c.id+' · '+c.name),el('span','',c.credits+' credits'));p.appendChild(row);});
        p.append(el('p','student-phone__note','Course registration is read-only in this build; no unverified enrolment changes are offered.'));
      }else if(s.section==='academics'){
        const p=panel('Academic standing');line(p,'Cumulative GPA',Number(s.academics.cumulativeGpa).toFixed(2));line(p,'Transcript entries',s.academics.transcript.length);line(p,'Semester',s.campaign.semester);s.academics.transcript.forEach(c=>{const row=el('article','student-phone__item');row.append(el('strong','',c.name),el('span','',c.score+'% · grade point '+c.gradePoint));p.appendChild(row);});
      }else if(s.section==='assignments'){
        const p=panel('Coursework progress');s.academics.courses.forEach(c=>{const row=el('article','student-phone__item');row.append(el('strong','',c.name),el('span','', 'Work progress '+c.assignmentPoints+' / 100'));p.appendChild(row);});
        p.append(el('p','student-phone__note','Only recorded coursework progress is shown. Individual deadlines will appear when authored assignment records are added.'));
      }else if(s.section==='assessments'){
        const p=panel('Recorded assessments');s.academics.courses.forEach(c=>{const row=el('article','student-phone__item');row.append(el('strong','',c.name),el('span','', 'CAT: '+(c.catScore===null?'Not recorded':c.catScore+'%')+' · Exam: '+(c.examScore===null?'Not recorded':c.examScore+'%')));p.appendChild(row);});
      }else if(s.section==='finances'){
        const p=panel('Student wallet');line(p,'Available cash','KSh '+s.finances.cash.toLocaleString());line(p,'Debt','KSh '+s.finances.debt.toLocaleString());line(p,'Lifetime earned','KSh '+s.finances.lifetimeEarned.toLocaleString());line(p,'Lifetime spent','KSh '+s.finances.lifetimeSpent.toLocaleString());
      }else if(s.section==='messages'){
        const p=panel('People in your life');s.relationships.forEach(person=>{const row=el('article','student-phone__item');row.append(el('strong','',person.name),el('span','', 'Affinity '+person.affinity+' · Trust '+person.trust));person.history.forEach(h=>row.appendChild(el('small','',h.day+' · '+h.event)));p.appendChild(row);});
        p.append(el('p','student-phone__note','This view reflects relationship history; it does not invent incoming messages.'));
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
