/* Accessible cinematic district-transition overlay. No fabricated percentage progress. */
(function(root){
 'use strict';
 function create(options){
  options=options||{};const doc=options.document||root.document,host=options.host;
  if(!doc||!host)throw new Error('District transition UI requires a document and host.');
  const overlay=doc.createElement('div');overlay.className='ss-district-transition';overlay.hidden=true;
  overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');overlay.setAttribute('aria-atomic','true');
  const backdrop=doc.createElement('div');backdrop.className='ss-district-transition__backdrop';backdrop.setAttribute('aria-hidden','true');
  const content=doc.createElement('div');content.className='ss-district-transition__content';
  const eyebrow=doc.createElement('p');eyebrow.className='ss-district-transition__eyebrow';eyebrow.textContent='SEMESTER SURVIVAL · WORLD TRAVEL';
  const title=doc.createElement('h2');title.className='ss-district-transition__title';title.textContent='Preparing destination';
  const district=doc.createElement('p');district.className='ss-district-transition__district';district.textContent='';
  const line=doc.createElement('div');line.className='ss-district-transition__track';line.setAttribute('aria-hidden','true');
  const bar=doc.createElement('span');bar.className='ss-district-transition__bar';line.appendChild(bar);
  const detail=doc.createElement('p');detail.className='ss-district-transition__detail';detail.textContent='Loading the next district…';
  content.append(eyebrow,title,district,line,detail);overlay.append(backdrop,content);host.appendChild(overlay);
  let visible=false;
  function show(name){
   district.textContent=String(name||'New destination');title.textContent='Preparing destination';
   detail.textContent='Loading the next district…';overlay.hidden=false;
   overlay.classList.remove('is-entering');overlay.classList.add('is-visible');visible=true;
  }
  function setPhase(phase,message){
   if(!visible)return;
   title.textContent=String(phase||'Preparing destination');
   if(message!==undefined)detail.textContent=String(message);
  }
  function hide(){
   if(!visible)return;
   overlay.classList.remove('is-visible');overlay.classList.add('is-entering');
   overlay.hidden=true;visible=false;
  }
  function destroy(){overlay.remove();visible=false;}
  return Object.freeze({show:show,setPhase:setPhase,hide:hide,destroy:destroy,isVisible:()=>visible});
 }
 root.SemesterDistrictTransitionUI=Object.freeze({create:create});
})(typeof window!=='undefined'?window:globalThis);
