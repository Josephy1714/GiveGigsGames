"use strict";
const avatarDefault = {
  shadowShape:"wash",blushPlacement:"apples",linerStyle:"classic",
  customLip:"",customShadow:"",customBlush:"",
  undereye:35,contour:28,bronzer:22,browFill:45,lipLiner:25,
  skin:2,hair:"waves",hairColor:1,iris:1,garment:"slip",fabricColor:0,fabric:"satin",jewelry:"drop",belt:"none",shoes:"ink",nails:"red",
  faceWidth:49,jawWidth:40,cheek:46,chin:43,eyeSize:57,eyeSpacing:49,eyeTilt:56,eyeHeight:50,browHeight:48,browArch:60,
  noseWidth:48,noseLength:50,lipWidth:51,lipFullness:58,freckles:16,
  height:52,shoulders:48,neck:48,arm:44,bust:49,waist:46,hips:53,torso:49,leg:47,calf:48,
  ...presets[1][1]
};
const saveKey="global-fashion-model-life-v1";
const makeupKeys=new Set([
  "customLip","customShadow","customBlush",
  ...presets.flatMap(([,settings])=>Object.keys(settings)),
  ...sliderGroups.Makeup.map(([key])=>key)
]);
const initial = {
  home:null,city:"nyc",name:"Ari Chen",day:1,cash:480,fame:0,contacts:0,energy:100,avatar:avatarDefault,
  owned:garments.filter(g=>g.cost===0).map(g=>g.id), looks:[],photos:[],record:{},challengeScores:{},log:[],
  visited:["nyc"],milestones:[]
};
const stylesList=["Minimal","Casual","Tailored","Evening","Craft","Editorial"];
const dailyTrend=()=>stylesList[(state.day-1)%stylesList.length];
const milestoneDefs=[
  ["first_job","First Call Time","Complete your first booking"],
  ["perfectionist","Cover Ready","Earn an S-Rank (92%+) on a booking"],
  ["wardrobe_5","Curated Closet","Own 7 or more garments"],
  ["portfolio_4","Contact Sheet","Save 4 or more portfolio photos"],
  ["jetsetter","Jetsetter","Visit 3 different fashion cities"],
  ["networker","Inner Circle","Reach 12 industry contacts"],
  ["working_model","Working Model","Reach 45 reputation"],
  ["headliner","Headliner","Reach 230 reputation"]
];
const $=(id)=>document.getElementById(id);
const panel=$("panel");
const canvas=$("portrait");
const money=(n)=>"$"+n.toLocaleString("en-US");
const esc=(value)=>String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const styleOf=()=>garments.find(g=>g.id===state.avatar.garment)?.style;
const sceneNames={studio:"Fitting mirror",shoot:"Capture set",runway:"Runway lights",flight:"In flight",hotel:"Hotel suite",press:"Press room",dinner:"Private dining",party:"After hours"};
const pages={
  Studio:["The Studio","Sculpt your model, mix a beauty look and dress for the next call time."],
  Bookings:["The Call Sheet","Build your portfolio and get invited to bigger shows."],
  Challenges:["Style Challenges","Dress to a theme, get scored on your styling, and earn cash and reputation."],
  Camera:["Photo Studio","Frame a pose, choose the light and build a portfolio of your looks."],
  Passport:["The Passport","Fly to new fashion markets as your reputation grows."],
  Lifestyle:["After the Show","Rest between bookings or meet the people behind the collections."],
  Career:["Career Book","Review bookings, industry contacts and the milestones you’ve earned."]
};
function load(){
  try{
    const saved=JSON.parse(localStorage.getItem(saveKey));
    if(saved?.version===1&&hubs[saved.city]) return {...structuredClone(initial),...saved,avatar:{...avatarDefault,...saved.avatar}};
  }catch{}
  return structuredClone(initial);
}
let state=load();
let page="Studio", tab="Makeup", frame="full", pose="front", scene="studio", session=null, wrap=null, animation=0, photoLight="studio", flashTimer=0;
const bookingKinds=["Casting","Shoot","Fitting","Runway","Press"];
const photoLimit=12;
let bookingKind="", availableOnly=false;
const localEvents=()=>({...events,["market:"+state.city]:marketEvents[state.city]});
let renderer;
try{ renderer=createStudio(canvas); }
catch { canvas.hidden=true; $("notice").textContent="The avatar preview requires WebGL. Career and styling controls are still available."; }

function save(){
  try{
    localStorage.setItem(saveKey,JSON.stringify({...state,version:1}));
    return true;
  }catch{return false;}
}
function say(message){
  $("notice").textContent=message;
}
function persist(message){
  const stored=save();
  if(message||!stored) say((message||"")+(stored?"":" Progress could not be saved on this device."));
}
function draw(walking=0,travel=0){
  renderer?.draw(state.avatar,{frame,pose,hub:hubs[state.city],kind:page==="Camera"?photoLight:scene,walking,travel});
}
function btn(label,action,value="",selected=null,extra=""){
  return '<button type="button" data-action="'+action+'" data-value="'+esc(value)+'"'+(selected===null?"":' aria-pressed="'+selected+'"')+' '+extra+'>'+esc(label)+'</button>';
}
const primary=(label,action,value="",disabled=false)=>btn(label,action,value,null,'class="action"'+(disabled?" disabled":""));
function choices(label,action,options,current){
  return '<div class="field"><span>'+label+'</span><div class="buttons">'+options.map(([name,id])=>btn(name,action,id,current===id)).join("")+'</div></div>';
}
function swatch(key,label){
  return '<fieldset class="palette"><legend>'+label+'</legend><div class="swatches">'+colors[key].map(([name,color],i)=>btn("", "swatch",key+":"+i,state.avatar[key]===i,'class="swatch" style="--swatch:'+color+'" aria-label="'+name+'" title="'+name+'"')).join("")+'</div></fieldset>';
}
function select(key,label,options){
  return '<label class="field"><span>'+label+'</span><select data-avatar="'+key+'">'+options.map(([name,value])=>'<option value="'+value+'"'+(state.avatar[key]===value?" selected":"")+'>'+name+'</option>').join("")+'</select></label>';
}
function sliders(group){
  return '<div class="slider-grid">'+sliderGroups[group].map(([key,label])=>'<label class="field"><span class="slider-title">'+label+'<output>'+state.avatar[key]+'</output></span><input aria-label="'+label+'" type="range" min="0" max="100" value="'+state.avatar[key]+'" data-avatar="'+key+'"></label>').join("")+'</div>';
}
function renderChrome(){
  const metrics=[[money(state.cash),"USD"],[state.fame,"Reputation"],[state.energy+"%","Energy"],["Day "+state.day,"Schedule"]];
  const muteLabel=(typeof soundFX!=="undefined"&&soundFX.isMuted())?"🔇 Muted":"🔊 Sound";
  $("stats").innerHTML=metrics.map(([value,label])=>'<span><strong>'+value+'</strong><small>'+label+'</small></span>').join("")+'<button type="button" class="mute-btn" data-action="mute">'+muteLabel+'</button>';
  $("navigation").innerHTML=Object.keys(pages).map(name=>btn(name,"nav",name,name===page,!state.home||session||wrap?"disabled":"")).join("");
  $("edition").textContent=state.home?hubs[state.city].city+" / "+hubs[state.city].country:"Choose your first market";
  $("page-title").textContent=state.home?pages[page][0]:"Global Fashion Model Life";
  $("subtitle").textContent=state.home?pages[page][1]:"Begin in the United States or the Philippines. Your first market shapes the jobs, collaborators and shows that launch your career.";
  $("model-name").textContent=state.name;
  $("scene-label").textContent=page==="Camera"?"Live 3D view":sceneNames[scene];
  $("camera").innerHTML=[["Full","full"],["Half","mid"],["Beauty","beauty"]].map(([label,id])=>btn(label,"frame",id,frame===id)).join("");
}
function studioPanel(){
  const tabs=["Makeup","Wardrobe","Face","Body","Looks"];
  let controls="";
  if(tab==="Makeup"){
    const lipHex=state.avatar.customLip||colors.lip[state.avatar.lip][1];
    const shadowHex=state.avatar.customShadow||colors.shadow[state.avatar.shadow][1];
    const blushHex=state.avatar.customBlush||colors.blush[state.avatar.blush][1];
    controls=choices("Makeup presets","preset",presets.map(([n],i)=>[n,i]),-1)+
      swatch("lip","Lip color")+swatch("shadow","Eyeshadow")+swatch("blush","Blush")+
      '<div class="slider-grid">'+
      '<label class="field"><span>Custom lip pigment</span><input type="color" data-custom="customLip" value="'+lipHex+'"></label>'+
      '<label class="field"><span>Custom shadow pigment</span><input type="color" data-custom="customShadow" value="'+shadowHex+'"></label>'+
      '<label class="field"><span>Custom blush pigment</span><input type="color" data-custom="customBlush" value="'+blushHex+'"></label>'+
      select("shadowShape","Eyeshadow placement",[["Soft wash","wash"],["Halo eye","halo"],["Smoky wing","smoke"]])+
      select("linerStyle","Eyeliner style",[["Classic wing","classic"],["Graphic","graphic"],["Soft tightline","tight"]])+
      select("blushPlacement","Blush placement",[["Cheeks","apples"],["Draped temple","draped"],["Sun-kissed","sunkissed"]])+
      select("finish","Lip finish",[["Matte","matte"],["Satin","satin"],["Gloss","gloss"]])+
      '</div>'+sliders("Makeup");
  }else if(tab==="Face"){
    controls=swatch("skin","Skin tone")+swatch("iris","Iris color")+swatch("hairColor","Hair color")+select("hair","Hair styling",hair)+sliders("Face");
  }else if(tab==="Body"){
    controls='<p class="muted">Shape your own proportions. Bookings judge your styling, timing and response to the brief.</p>'+sliders("Body");
  }else if(tab==="Wardrobe"){
    controls='<div class="choice-grid">'+garments.map(g=>{
      const owned=state.owned.includes(g.id);
      return '<button type="button" class="look-card" style="--tone:'+g.tone+'" data-action="garment" data-value="'+g.id+'" aria-pressed="'+(state.avatar.garment===g.id)+'"><strong>'+g.name+'</strong><small>'+g.style+(owned?"":" · "+money(g.cost))+'</small></button>';
    }).join("")+'</div>'+swatch("fabricColor","Garment dye")+
      '<div class="slider-grid">'+select("fabric","Fabric finish",[["Satin","satin"],["Matte weave","matte"],["Metallic","metallic"]])+select("jewelry","Earrings",[["Gold drops","drop"],["Gold hoops","hoops"],["Pearl studs","pearl"],["None","none"]])+select("belt","Waist accessory",[["None","none"],["Chain belt","chain"],["Leather belt","leather"]])+select("shoes","Footwear",[["Ink pumps","ink"],["Nude pumps","nude"],["Silver heels","silver"],["Ankle boots","boots"]])+select("nails","Manicure",[["Bare","bare"],["Rose red","red"],["Pearl pink","pearl"]])+'</div>';
  }else{
    controls='<label class="field"><span>Model name</span><input type="text" id="name-input" maxlength="28" value="'+esc(state.name)+'"></label>'+primary("Save current look","look-save","",state.looks.length>=12)+
      (state.looks.length?state.looks.map((look,i)=>'<article class="card"><h3>'+esc(look.name)+'</h3><div class="buttons">'+btn("Apply","look-load",i)+btn("Remove","look-delete",i)+'</div></article>').join(""):'<p class="muted">Save a look to reuse its styling and avatar settings.</p>');
  }
  panel.innerHTML='<div class="strip">'+tabs.map(name=>btn(name,"tab",name,tab===name)).join("")+'</div><div class="fields">'+controls+
    '</div><div class="strip" style="margin-top:20px;margin-bottom:0;padding-bottom:0;border:0">'+btn("Rotate left","rotate",-30)+btn("Face forward","rotate",0)+btn("Rotate right","rotate",30)+btn("🎲 Randomize","randomize","")+'</div>';
}
function bookingPanel(){
  const curStyle=styleOf();
  const trend=dailyTrend();
  const entries=jobs[state.city].map((job,index)=>({job,index,status:bookingStatus(job,index)}))
    .filter(({job,status})=>(!bookingKind||job[1]===bookingKind)&&(!availableOnly||!status));
  panel.innerHTML='<div class="fields"><div><p class="eyebrow">Local market · Daily trend: '+trend+' (+20%)</p><h2>'+hubs[state.city].city+'</h2><p class="muted">'+hubs[state.city].note+'</p><p class="muted">Current look: <strong>'+curStyle+'</strong></p></div>'+
    '<div class="buttons booking-filters"><label class="field">Booking type <select id="booking-kind"><option value="">All types</option>'+
      bookingKinds.map(kind=>'<option'+(bookingKind===kind?' selected':'')+'>'+kind+'</option>').join("")+
    '</select></label><label class="booking-availability"><input id="booking-available" type="checkbox"'+(availableOnly?' checked':'')+'> Available today</label></div>'+
    '<p class="muted" role="status">'+entries.length+' of '+jobs[state.city].length+' bookings</p>'+
    (entries.length?entries.map(({job,index:i,status})=>{
      const [name,kind,style,brief,,fee]=job;
      const record=state.record[state.city+":"+i];
      const matchBadge=curStyle===style?'<span class="badge match">✓ Look matches brief</span>':'<span class="badge warn">Brief: '+style+'</span>';
      const trendBadge=style===trend?' <span class="badge trend">★ Trend +20%</span>':"";
      const actions=status?primary(status,"job",i,true):'<div class="buttons">'+primary("Take booking","job",i)+(curStyle!==style?btn("Style in Studio","go-studio",""):"")+'</div>';
      return '<article class="card"><p class="eyebrow">'+kind+' · '+style+'</p><h3>'+name+'</h3><div>'+matchBadge+trendBadge+'</div><p>'+brief+'</p><small>'+money(fee)+' base fee'+(record?" · Personal best "+record.best+"%":"")+'</small>'+actions+'</article>';
    }).join(""):'<p>No bookings match these filters. Change the type or show unavailable bookings.</p>')+'</div>';
}
function bookingStatus(job,index){
  if(state.fame<job[4])return "Unlocks at "+job[4]+" reputation";
  if(state.record[state.city+":"+index]?.day===state.day)return "Return tomorrow";
  return state.energy<19?"Requires 19% energy":"";
}
function photoPanel(){
  panel.innerHTML='<div class="fields"><h2>Contact Sheet</h2>'+choices("Pose","pose",poses,pose)+
    choices("Set","photo-light",[["Fitting mirror","studio"],["Softbox","shoot"],["Runway","runway"],["After dark","party"]],photoLight)+
    '<div class="buttons">'+primary("Take photograph","photo","",!renderer||state.photos.length>=photoLimit)+btn("Rotate left","rotate",-30)+btn("Rotate right","rotate",30)+'</div>'+
    '<p class="muted">'+state.photos.length+' / '+photoLimit+' saved'+(state.photos.length>=photoLimit?' · Download and remove a photo to make room.':'')+'</p>'+
    (state.photos.length?'<div class="choice-grid">'+state.photos.map((photo,i)=>'<article class="card"><img src="'+esc(photo.url)+'" alt="'+esc(photo.caption)+'"><small>'+esc(photo.caption)+'</small><a href="'+esc(photo.url)+'" download="fashion-look-'+(i+1)+'.jpg">Download photo</a>'+btn("Remove","photo-delete",i)+'</article>').join("")+'</div>':'<p class="muted">Captured portraits appear here and can be downloaded.</p>')+'</div>';
}
function passportPanel(){
  panel.innerHTML='<div class="fields"><h2>Departures</h2>'+Object.entries(hubs).map(([id,hub])=>{
    const current=id===state.city;
    const status=current?"You’re here":state.fame<hub.gate?"Unlocks at "+hub.gate+" reputation":state.cash<hub.fare?"Insufficient funds":state.energy<12?"Requires 12% energy":"";
    return '<article class="card"><p class="eyebrow">'+hub.airport+' / '+hub.country+'</p><h3>'+hub.city+'</h3><p>'+hub.note+'</p>'+primary(status||"Board flight · "+money(hub.fare),"flight",id,Boolean(status))+'</article>';
  }).join("")+'</div>';
}
function lifestylePanel(){
  panel.innerHTML='<div class="fields"><article class="card"><p class="eyebrow">Overnight</p><h2>The Hotel</h2><p>Rest in your room for free or book a suite with late checkout. Both advance the calendar and reopen completed jobs.</p><div class="buttons">'+btn("Standard room · +57% energy","rest",0)+primary("Suite · full energy · $110","rest",110,state.cash<110)+'</div></article>'+
    Object.entries(localEvents()).map(([id,event])=>{
      const status=state.energy<event.energy?"Low energy":state.cash<event.cost?"Insufficient funds":state.record["social:"+id]?.day===state.day?"Already attended today":"";
      return '<article class="card"><p class="eyebrow">'+event.style+' dress brief</p><h2>'+event.name+'</h2><p>'+event.prompt+'</p><small>Invitation costs '+money(event.cost)+' and '+event.energy+'% energy</small>'+primary(status||"Attend","social",id,Boolean(status))+'</article>';
    }).join("")+'</div>';
}
function careerPanel(){
  const ranks=[[0,"New face"],[14,"Working model"],[45,"Fashion week regular"],[105,"International talent"],[230,"International headliner"]];
  const next=ranks.findIndex(([gate])=>state.fame<gate);
  const [floor,rank]=ranks[next<0?ranks.length-1:next-1];
  const unlocked=state.milestones||[];
  panel.innerHTML='<div class="fields"><div><p class="eyebrow">Professional standing</p><h2>'+rank+'</h2><p class="muted">'+hubs[state.home].city+' debut · '+state.contacts+' industry contacts · '+state.photos.length+' portfolio photos</p></div>'+
    (next<0?'<p class="muted">Highest career rank reached.</p>':'<label class="field">Next rank: '+ranks[next][1]+' · '+(ranks[next][0]-state.fame)+' reputation to go<progress max="'+(ranks[next][0]-floor)+'" value="'+(state.fame-floor)+'"></progress></label>')+
    '<h3>Career Milestones ('+unlocked.length+'/'+milestoneDefs.length+')</h3><div class="milestone-grid">'+
    milestoneDefs.map(([id,title,desc])=>'<div class="milestone'+(unlocked.includes(id)?' unlocked':'')+'"><strong>'+(unlocked.includes(id)?'✦ ':'')+title+'</strong><small>'+desc+'</small></div>').join("")+
    '</div><h3>Career journal</h3>'+(state.log.length?state.log.map(x=>'<article class="card"><small>Day '+x.day+'</small><p>'+esc(x.text)+'</p></article>').join(""):'<p class="muted">Your first booking will appear here.</p>')+
    '<div style="margin-top:8px">'+btn("Start New Career","reset-career","")+'</div></div>';
}
function homePanel(){
  panel.innerHTML='<div class="fields"><h2>Where will you debut?</h2><label class="field"><span>Model name</span><input type="text" id="name-input" maxlength="28" value="'+esc(state.name)+'"></label>'+
    ["nyc","mnl"].map(id=>'<article class="card"><p class="eyebrow">'+hubs[id].country+'</p><h3>'+hubs[id].city+'</h3><p>'+hubs[id].note+'</p>'+primary("Start in "+hubs[id].city,"home",id)+'</article>').join("")+'</div>';
}
function wrapPanel(){
  const w=wrap;
  panel.innerHTML='<div class="fields"><p class="eyebrow">Call Sheet Wrap</p><div class="grade-row"><div class="grade-pill">'+w.grade+'</div><div><h2>'+esc(w.name)+'</h2><p class="muted">Final Score: <strong>'+w.score+'%</strong> · '+(w.styleMatch?'Brief matched ('+w.style+')':'Brief was '+w.style)+'</p></div></div>'+
    '<article class="card"><div class="slider-grid"><div><small>Payout</small><strong>'+money(w.fee)+'</strong>'+(w.trendBonus?'<small class="combo-tag"> (incl. +20% Trend)</small>':'')+'</div><div><small>Reputation</small><strong>+'+w.gain+'</strong></div><div><small>Contacts</small><strong>+'+w.contactsGained+'</strong></div><div><small>Energy Used</small><strong>-19%</strong></div></div></article>'+
    (w.unlockedMilestones.length?'<article class="card"><p class="eyebrow">Milestone Unlocked</p>'+w.unlockedMilestones.map(m=>'<strong>✦ '+esc(m)+'</strong>').join("")+'</article>':'')+
    primary("Back to Call Sheet","wrap-done","")+'</div>';
}
let lastChallengeResult=null;
function evaluateChallenge(ch){
  const a=state.avatar;
  const g=garments.find(item=>item.id===a.garment);
  const c=ch.criteria;
  let score=0;
  const feedback=[];
  if(c.garments.includes(a.garment)){
    score+=40;
    feedback.push("✓ Perfect garment choice ("+g.name+")");
  }else if(c.styles.includes(g?.style)){
    score+=24;
    feedback.push("✓ Garment style ("+g.style+") fits the theme");
  }else{
    score+=6;
    feedback.push("△ Try a "+c.styles.join(" or ")+" garment in the Studio");
  }
  if(c.fabrics.includes(a.fabric)){
    score+=13;
    feedback.push("✓ Fabric finish ("+a.fabric+") suits the brief");
  }else{
    score+=4;
    feedback.push("△ Switch fabric finish to "+c.fabrics.join(" or "));
  }
  if(c.colors.includes(a.fabricColor)){
    score+=12;
    feedback.push("✓ Garment dye matches the mood");
  }else{
    score+=4;
    feedback.push("△ Experiment with a theme-matched garment dye");
  }
  if(c.jewelry.includes(a.jewelry)){
    score+=10;
    feedback.push("✓ Jewelry complements the look");
  }else{
    score+=3;
    feedback.push("△ Try "+c.jewelry.join(" or ")+" earrings");
  }
  if(c.shoes.includes(a.shoes)){
    score+=8;
    feedback.push("✓ Footwear matches the theme");
  }else{
    score+=2;
    feedback.push("△ Pair with "+c.shoes.join(" or ")+" footwear");
  }
  if(c.belt.includes(a.belt)){
    score+=7;
    feedback.push("✓ Waist styling on point");
  }else{
    score+=2;
    feedback.push("△ Consider "+c.belt.join(" or ")+" waist accessory");
  }
  if(c.hair.includes(a.hair)){
    score+=5;
  }else{
    score+=2;
  }
  const m=c.makeup||{};
  let makeupOk=false;
  if((!m.minLip||a.lipIntensity>=m.minLip)&&(!m.maxLip||a.lipIntensity<=m.maxLip)&&(!m.finish||m.finish.includes(a.finish))&&(!m.linerStyle||m.linerStyle.includes(a.linerStyle))&&(!m.blushPlacement||m.blushPlacement.includes(a.blushPlacement))&&(!m.minLiner||a.liner>=m.minLiner)){
    makeupOk=true;
  }
  score+=makeupOk?5:1;
  if(makeupOk) feedback.push("✓ Beauty & hair styling elevate the theme");
  else feedback.push("△ Tweak makeup finish or liner in the Studio for a beauty bonus");

  const tier=score>=90?"S — Runway Icon":score>=75?"A — Editorial Standout":score>=55?"B — On Theme":"C — Needs Styling";
  const prev=state.challengeScores?.[ch.id]||0;
  let cash=0,fame=0;
  if(score>=55){
    if(prev<55){
      const mult=Math.max(0.6,score/100);
      cash=Math.round(ch.rewardCash*mult);
      fame=Math.max(1,Math.round(ch.rewardFame*mult));
    }else if(score>prev){
      cash=Math.round((score-prev)*3);
      fame=Math.max(1,Math.round((score-prev)/5));
    }else{
      cash=25;
      fame=1;
    }
  }else{
    cash=15;
  }
  state.challengeScores=state.challengeScores||{};
  if(score>prev) state.challengeScores[ch.id]=score;
  state.cash+=cash;
  state.fame+=fame;
  return {id:ch.id,name:ch.name,score,tier,feedback,cash,fame,isNewBest:score>prev};
}
function challengesPanel(){
  const resHtml=lastChallengeResult?'<article class="card" style="border-color:var(--accent);margin-bottom:16px"><h3>'+esc(lastChallengeResult.name)+' — '+lastChallengeResult.score+'/100 ('+lastChallengeResult.tier+')</h3><p class="muted">Earned '+money(lastChallengeResult.cash)+(lastChallengeResult.fame?' · +'+lastChallengeResult.fame+' Reputation':'')+(lastChallengeResult.isNewBest?' · New Best!':'')+'</p><ul style="margin:8px 0 0 18px;padding:0;font-size:0.9rem">'+lastChallengeResult.feedback.map(f=>'<li>'+esc(f)+'</li>').join("")+'</ul></article>':"";
  panel.innerHTML=resHtml+'<p class="muted">Style your model in the Studio, then submit your look to a themed challenge to earn cash and reputation.</p><div class="stack">'+
    challenges.map(ch=>{
      const best=state.challengeScores?.[ch.id];
      return '<article class="card"><div class="card-head"><h3>'+esc(ch.name)+'</h3>'+(best?'<span class="badge">Best: '+best+'/100</span>':'<span class="badge">New</span>')+'</div><p>'+esc(ch.brief)+'</p><p class="muted">'+ch.tags.join(" · ")+' · Up to '+money(ch.rewardCash)+' & +'+ch.rewardFame+' Rep</p><div class="buttons">'+primary("Submit Current Look","challenge-submit",ch.id)+btn("Style in Studio","nav","Studio")+'</div></article>';
    }).join("")+'</div>';
}
function render(){
  renderChrome();
  if(session) sessionPanel();
  else if(wrap) wrapPanel();
  else if(!state.home) homePanel();
  else ({Studio:studioPanel,Bookings:bookingPanel,Camera:photoPanel,Passport:passportPanel,Lifestyle:lifestylePanel,Challenges:challengesPanel,Career:careerPanel})[page]();
  draw();
}
function addLog(text){
  state.log.unshift({day:state.day,text});
  state.log=state.log.slice(0,24);
}

const fittingSteps=[
  ["The dresser asks how the sample feels at the shoulder.",["Explain exactly where it pulls","Say it feels fine and move on","Try pinning it yourself"],0],
  ["The designer asks to see the garment in motion.",["Hold completely still","Walk, turn and let the fabric settle","Tug the fabric flat"],1],
  ["One adjustment is still unfinished before the buyer preview.",["Post a fitting photo immediately","Leave without checking back","Confirm the alteration and next call time"],2]
];
const manilaFitting=[
  ["The atelier is checking a terno before the fitting photos.",["Pull the butterfly sleeves flat","Show how the sleeve holds its shape while you move","Change the sleeves without consulting the designer"],1],
  ["A stylist asks how to describe the woven fabric in the credits.",["Describe it as generic print","Guess the weaving community","Check the fabric name and maker credit with the designer"],2],
  ["The call time moves up and the team is split across Metro Manila.",["Confirm the updated times and tell the dresser your arrival estimate","Wait for someone to notice you are late","Ask the photographer to skip the fitting"],0]
];
const fittingForCity=()=>expandedBookings[state.city].includes(session.job)?marketFittings[state.city]:state.city==="mnl"?manilaFitting:fittingSteps;
const pressSteps={
  lax:[
    ["The interviewer asks what you do differently for a commercial campaign.",["Describe hitting repeatable marks while keeping the movement natural","Say each take should surprise the product team","Say the crew can fix every pose in editing"],0],
    ["A publicist asks you to hold a few frames on the carpet.",["Rush past before the photographers are ready","Take the agreed marks and keep the garment and sponsor visible","Block the next guest until you get a perfect frame"],1],
    ["A reporter asks about an unreleased campaign.",["Name the brand and the release date","Describe the entire brief","Stick to the approved talking points and credit this team"],2]
  ],
  nyc:[
    ["What helped you get from casting rooms to the runway?",["Describe a specific collaboration and what you learned","Say you made it entirely on your own","List other models you’d like to beat"],0],
    ["An editor asks about a collection you haven’t seen.",["Pretend you worked on it","Speak to your own experience and offer to connect them with the label","Repeat a rumor from backstage"],1],
    ["A photographer wants a quick extra portrait before your next booking.",["Depart without a word","Promise all afternoon","Check the call time and agree on a short window"],2]
  ],
  mnl:[
    ["The editor asks which material the atelier featured.",["Call it a print and change the subject","Use the material name the designer gave you and credit the makers","Assume all regional weaves have the same origin"],1],
    ["The editor asks whether a contemporary terno can feel personal.",["Describe how the butterfly sleeves framed your movement on the runway","Say there’s only one right way to style it","Guess at its history instead of discussing the garment"],0],
    ["The team wants a photo for the designer’s social account.",["Post a backstage image of an unreleased piece","Speak for the entire team","Confirm the credits and let the label clear the image"],2]
  ]
};
const sequences={
  Casting:[["front","beauty"],["angle","mid"],["front","full"]],
  Shoot:[["angle","mid"],["hip","full"],["stride","full"]]
};
const frameLabel=(id)=>({full:"Full",mid:"Half",beauty:"Beauty"})[id]||id;
const poseLabel=(id)=>poses.find(([,value])=>value===id)[0];

function startJob(index){
  const job=jobs[state.city][index];
  if(!job||bookingStatus(job,index))return;
  session={type:"job",job,index,step:0,points:0,combo:0,last:"",phase:0,started:performance.now()};
  const kind=job[1];
  scene={Casting:"shoot",Shoot:"shoot",Fitting:"studio",Press:"press",Runway:"runway"}[kind];
  frame=kind==="Casting"||kind==="Shoot"?"beauty":kind==="Press"?"mid":"full";
  pose="front";
  renderer?.resetRotation();
  render();
  if(kind==="Runway") kickAnimation();
}
function sessionPanel(){
  if(session.type==="flight"){
    panel.innerHTML='<div class="fields"><p class="eyebrow">Boarding pass</p><h2>'+hubs[state.city].airport+' / '+hubs[session.destination].airport+'</h2><p class="muted">Arriving in '+hubs[session.destination].city+'</p><progress id="flight-progress" max="100" value="0">In flight</progress></div>';
    return;
  }
  if(session.type==="social"){
    const event=localEvents()[session.id];
    panel.innerHTML='<div class="fields"><h2>'+event.name+'</h2><p class="muted">'+(session.id==="dinner"&&state.city==="mnl"?"At a Makati dinner serving contemporary Filipino food, the designer asks how the collection felt on the runway.":event.prompt)+'</p>'+
      event.options.map(([label],i)=>btn(label,"social-answer",i)).join("")+btn("Return to hotel","cancel")+'</div>';
    return;
  }
  const [name,kind,style,brief]=session.job;
  const totalSteps=kind==="Runway"?4:3;
  let body="";
  if(kind==="Runway"){
    const center=[.25,.48,.72,.86][session.step];
    const comboText=session.combo>=2?' <span class="combo-tag">· '+session.combo+'x Streak!</span>':"";
    body='<p>Hit the marked cue as the needle enters the highlighted zone. Use Space or tap the button.'+comboText+'</p><div class="timing" aria-hidden="true"><i class="timing-zone" style="left:'+(center-0.105)*100+'%;width:21%"></i><i class="timing-needle" id="needle"></i></div>'+primary(["Step onto the runway","Hit mid-runway mark","Turn at the end","Hold your finale pose"][session.step],"beat");
  }else if(kind==="Casting"||kind==="Shoot"){
    const [reqPose,reqFrame]=sequences[kind][session.step];
    body='<p>Photographer’s cue: <strong>'+poseLabel(reqPose)+'</strong> · Framing: <strong>'+frameLabel(reqFrame)+'</strong></p>'+choices("Set your pose","pose",poses,pose)+primary("Release shutter","shot");
  }else{
    const entries=kind==="Fitting"?fittingForCity():pressSteps[state.city]||pressSteps.nyc;
    const [prompt,answers]=entries[session.step];
    body='<h3>'+prompt+'</h3>'+answers.map((answer,i)=>btn(answer,"answer",i)).join("");
  }
  panel.innerHTML='<div class="fields"><p class="eyebrow">'+kind+' · '+style+' brief · '+(session.step+1)+' of '+totalSteps+'</p><h2>'+name+'</h2><p class="muted">'+brief+'</p>'+body+
    '<p class="muted">'+(session.last||"Your look is "+styleOf()+".")+'</p>'+btn("Leave booking","cancel")+'</div>';
}
function evaluate(points,message){
  session.points+=points;
  session.last=message;
  session.step++;
  const totalSteps=session.job?.[1]==="Runway"?4:3;
  if(session.step===totalSteps){
    finishJob(totalSteps);
    return;
  }
  session.started=performance.now();
  session.phase=0;
  sessionPanel();
  draw();
}
function checkMilestones(){
  const newly=[];
  const unlock=(id)=>{
    if(!state.milestones)state.milestones=[];
    if(!state.milestones.includes(id)){
      state.milestones.push(id);
      const def=milestoneDefs.find(m=>m[0]===id);
      if(def)newly.push(def[1]);
    }
  };
  if(Object.keys(state.record).some(k=>!k.startsWith("social:"))) unlock("first_job");
  if(Object.values(state.record).some(r=>r.best>=92)) unlock("perfectionist");
  if(state.owned.length>=7) unlock("wardrobe_5");
  if(state.photos.length>=4) unlock("portfolio_4");
  if((state.visited||[]).length>=3) unlock("jetsetter");
  if(state.contacts>=12) unlock("networker");
  if(state.fame>=45) unlock("working_model");
  if(state.fame>=230) unlock("headliner");
  return newly;
}
function finishJob(totalSteps=3){
  cancelAnimationFrame(animation);
  const [name,,style,,,base,baseFame]=session.job;
  const styleMatch=styleOf()===style;
  const trendBonus=style===dailyTrend();
  const score=Math.min(100,Math.round(25+(styleMatch?18:3)+session.points*57/totalSteps));
  const grade=score>=92?"S":score>=80?"A":score>=65?"B":"C";
  const id=state.city+":"+session.index;
  const previous=state.record[id];
  const fee=Math.round(base*(.48+score*.006)*(trendBonus?1.2:1));
  const gain=Math.round(baseFame*(.24+score*.008)*(previous?.best>=score?.54:1));
  const contactsGained=score>=85?2:1;
  state.cash+=fee;
  state.fame+=gain;
  state.contacts+=contactsGained;
  state.energy=Math.max(0,state.energy-19);
  state.record[id]={day:state.day,best:Math.max(previous?.best||0,score)};
  const unlockedMilestones=checkMilestones();
  const details=name+" · "+grade+" ("+score+"%) · "+money(fee)+" · +"+gain+" reputation";
  addLog(details);
  wrap={name,score,grade,fee,trendBonus,gain,contactsGained,styleMatch,style,unlockedMilestones};
  session=null;
  scene="studio";
  frame="full";
  pose="front";
  if(typeof soundFX!=="undefined"){
    if(grade==="S"||unlockedMilestones.length) soundFX.fanfare();
    else soundFX.cash();
  }
  render();
  persist(details);
}
function kickAnimation(){
  cancelAnimationFrame(animation);
  animation=requestAnimationFrame(tick);
}
function tick(now){
  if(!session) return;
  if(session.type==="flight"){
    const t=Math.min(1,(now-session.started)/3200);
    if(t>=1){
      const dest=hubs[session.destination];
      const from=state.city;
      state.city=session.destination;
      if(!state.visited)state.visited=[from];
      if(!state.visited.includes(session.destination))state.visited.push(session.destination);
      state.cash-=dest.fare;
      state.energy-=12;
      state.day+=dest.country===hubs[from].country?0:1;
      addLog("Landed in "+dest.city+".");
      checkMilestones();
      session=null;
      scene="hotel";
      if(typeof soundFX!=="undefined")soundFX.flight();
      render();
      persist("Welcome to "+dest.city+". Local jobs are now on the call sheet.");
      return;
    }
    const bar=$("flight-progress");
    if(bar)bar.value=t*100;
    draw(0,t);
  }else if(session.job?.[1]==="Runway"){
    const cycle=((now-session.started)/[1500,1280,1100,960][session.step])%2;
    session.phase=cycle<=1?cycle:2-cycle;
    const needle=$("needle");
    if(needle)needle.style.left="calc("+session.phase*100+"% - 2px)";
    draw(session.phase);
  }else return;
  animation=requestAnimationFrame(tick);
}
function takePhoto(){
  if(!renderer||state.photos.length>=photoLimit)return;
  if(typeof soundFX!=="undefined")soundFX.shutter();
  flash();
  const snapshot=document.createElement("canvas");
  snapshot.width=480;
  snapshot.height=570;
  snapshot.getContext("2d").drawImage(canvas,0,0,480,570);
  state.photos.unshift({url:snapshot.toDataURL("image/jpeg",.83),caption:state.name+" · "+hubs[state.city].city+" · "+poseLabel(pose)});
  checkMilestones();
  persist("Photograph added to your contact sheet.");
  photoPanel();
}
function flash(){
  clearTimeout(flashTimer);
  canvas.classList.add("flash");
  flashTimer=setTimeout(()=>canvas.classList.remove("flash"),105);
}

function handle(action,value){
  if(action==="mute"){
    if(typeof soundFX!=="undefined")soundFX.toggle();
    renderChrome();
    return;
  }
  if(action==="wrap-done"){
    wrap=null;
    render();
    return;
  }
  if(action==="go-studio"){
    page="Studio";
    tab="Wardrobe";
    scene="studio";
    frame="full";
    render();
    return;
  }
  if(action==="reset-career"){
    if(!confirm("Start a new career? Your current progress will be reset."))return;
    state=structuredClone(initial);
    bookingKind="";availableOnly=false;
    page="Studio";tab="Makeup";frame="full";pose="front";scene="studio";session=null;wrap=null;
    persist("Started a fresh career.");
    render();
    return;
  }
  if(action==="frame"){
    frame=value;
    renderChrome();
    draw();
    return;
  }
  if(action==="home"){
    if(state.home||!["nyc","mnl"].includes(value))return;
    state.home=state.city=value;
    state.visited=[value];
    state.name=$("name-input").value.trim()||"Ari Chen";
    state.avatar.garment="column";
    addLog("Started modeling in "+hubs[value].city+".");
    render();
    persist("Welcome to "+hubs[value].city+". Visit Bookings for your first call sheet.");
    return;
  }
  if(!state.home)return;
  if(action==="cancel"){
    cancelAnimationFrame(animation);
    session=null;
    scene="studio";
    pose="front";
    frame="full";
    render();
    say("Returned to the schedule.");
    return;
  }
  if(action==="pose"){
    pose=value;
    if(session)sessionPanel();
    else photoPanel();
    draw();
    return;
  }
  if(session){
    if(action==="beat"){
      const distance=Math.abs(session.phase-[.25,.48,.72,.86][session.step]);
      const tier=distance<=.055?"perfect":distance<=.116?"good":"miss";
      session.combo=tier==="miss"?0:session.combo+1;
      if(typeof soundFX!=="undefined")soundFX.beat(tier);
      const msg=tier==="perfect"?("Perfect cue!"+(session.combo>=2?" ("+session.combo+"x streak)":"")):tier==="good"?"Good timing.":"Off the mark. Keep moving.";
      evaluate(tier==="perfect"?1:tier==="good"?.72:.26,msg);
    }
    if(action==="shot"){
      const [reqPose,reqFrame]=sequences[session.job[1]][session.step];
      const poseOk=pose===reqPose;
      const frameOk=frame===reqFrame;
      if(typeof soundFX!=="undefined")soundFX.shutter();
      flash();
      const pts=(poseOk&&frameOk)?1:(poseOk||frameOk)?.65:.3;
      const msg=(poseOk&&frameOk)?"The photographer marked the frame as a keeper.":poseOk?"Pose matched, but framing was "+frameLabel(frame)+" (wanted "+frameLabel(reqFrame)+").":frameOk?"Framing matched, but the pose missed the cue.":"Both pose and framing missed the cue.";
      evaluate(pts,msg);
    }
    if(action==="answer"){
      const items=session.job[1]==="Fitting"?fittingForCity():pressSteps[state.city]||pressSteps.nyc;
      const success=items[session.step][2]===Number(value);
      if(typeof soundFX!=="undefined")soundFX.tap();
      evaluate(success?1:.35,success?"The team appreciated the response.":"The conversation moved on.");
    }
    if(action==="social-answer"){
      const {id}=session;
      const event=localEvents()[id];
      const [,rep,network]=event.options[Number(value)];
      const bonus=styleOf()===event.style?5:0;
      state.cash-=event.cost;
      state.energy-=event.energy;
      state.fame+=rep+bonus;
      state.contacts+=Math.floor(network/8);
      state.record["social:"+id]={day:state.day};
      const result=event.name+" · +"+(rep+bonus)+" reputation · +"+Math.floor(network/8)+" contacts";
      addLog(result);
      session=null;
      scene="hotel";
      checkMilestones();
      render();
      persist(result);
    }
    return;
  }
  if(action==="challenge-submit"){const ch=challenges.find(c=>c.id===value);if(ch){lastChallengeResult=evaluateChallenge(ch);save();addLog("Submitted "+ch.name+" ("+lastChallengeResult.score+"/100).");notice("Scored "+lastChallengeResult.score+"/100 on "+ch.name+"!");render();}return;}
  if(action==="nav"){
    page=value;
    scene=page==="Lifestyle"?"hotel":"studio";
    pose="front";
    frame="full";
    renderer?.resetRotation();
    render();
    return;
  }
  if(action==="rotate"){
    if(Number(value))renderer?.rotate(Number(value));
    else renderer?.resetRotation();
    draw();
    return;
  }
  if(action==="tab"){
    tab=value;
    if(value==="Face"||value==="Makeup")frame="beauty";
    if(value==="Body"||value==="Wardrobe")frame="full";
    render();
    return;
  }
  if(action==="randomize"){
    const pick=(arr)=>arr[Math.floor(Math.random()*arr.length)];
    const rand=(min,max)=>Math.floor(min+Math.random()*(max-min+1));
    Object.keys(colors).forEach(k=>{ state.avatar[k]=Math.floor(Math.random()*colors[k].length); });
    state.avatar.hair=pick(hair)[1];
    state.avatar.shadowShape=pick(["wash","halo","smoke"]);
    state.avatar.finish=pick(["matte","satin","gloss"]);
    state.avatar.fabric=pick(["satin","matte","metallic"]);
    state.avatar.jewelry=pick(["drop","hoops","pearl","none"]);
    state.avatar.belt=pick(["none","chain","leather"]);
    state.avatar.shoes=pick(["ink","nude","silver","boots"]);
    state.avatar.nails=pick(["bare","red","pearl"]);
    if(state.owned.length) state.avatar.garment=pick(state.owned);
    Object.values(sliderGroups).flat().forEach(([k])=>{ state.avatar[k]=rand(25,75); });
    if(typeof soundFX!=="undefined")soundFX.tap();
    say("Randomized look.");
  }
  if(action==="preset"){
    for(const key of makeupKeys)state.avatar[key]=avatarDefault[key];
    Object.assign(state.avatar,presets[Number(value)][1]);
  }
  if(action==="swatch"){
    const [key,index]=value.split(":");
    state.avatar[key]=Number(index);
    if(key==="lip")state.avatar.customLip="";
    if(key==="shadow")state.avatar.customShadow="";
    if(key==="blush")state.avatar.customBlush="";
  }
  if(action==="garment"){
    const garment=garments.find(item=>item.id===value);
    if(!state.owned.includes(value)){
      if(state.cash<garment.cost){say("You need "+money(garment.cost)+" to buy this piece.");return;}
      state.cash-=garment.cost;
      state.owned.push(value);
      checkMilestones();
      addLog("Added "+garment.name+" to the wardrobe.");
      say("Purchased "+garment.name+" for "+money(garment.cost)+".");
    }
    state.avatar.garment=value;
  }
  if(action==="look-save"&&state.looks.length<12){
    state.name=$("name-input").value.trim()||state.name;
    const title=garments.find(item=>item.id===state.avatar.garment).name;
    state.looks.unshift({name:title+" · Day "+state.day,avatar:{...state.avatar}});
    say("Look saved.");
  }
  if(action==="look-load") state.avatar={...state.looks[Number(value)].avatar};
  if(action==="look-delete") state.looks.splice(Number(value),1);
  if(action==="photo-light") photoLight=value;
  if(action==="photo"){takePhoto();return;}
  if(action==="photo-delete") state.photos.splice(Number(value),1);
  if(action==="job"){startJob(Number(value));return;}
  if(action==="flight"){
    const dest=hubs[value];
    if(value===state.city||state.fame<dest.gate||state.cash<dest.fare||state.energy<12)return;
    session={type:"flight",destination:value,started:performance.now()};
    scene="flight";
    frame="mid";
    render();
    kickAnimation();
    return;
  }
  if(action==="rest"){
    const cost=Number(value);
    if(state.cash<cost)return;
    state.cash-=cost;
    state.energy=cost?100:Math.min(100,state.energy+57);
    state.day++;
    scene="hotel";
    addLog(cost?"Spent the night in a hotel suite.":"Rested at the hotel.");
    say("Checked out rested. Your call sheet has reopened.");
  }
  if(action==="social"){
    const event=localEvents()[value];
    if(state.cash<event.cost||state.energy<event.energy||state.record["social:"+value]?.day===state.day)return;
    session={type:"social",id:value};
    scene=value==="dinner"?"dinner":"party";
    frame="full";
  }
  persist();
  render();
}

document.addEventListener("click",e=>{
  const button=e.target.closest("button[data-action]");
  if(!button||button.disabled)return;
  handle(button.dataset.action,button.dataset.value);
  if(!button.isConnected){
    const replacement=Array.from(document.querySelectorAll("button[data-action]")).find(candidate=>
      candidate.dataset.action===button.dataset.action&&candidate.dataset.value===button.dataset.value&&!candidate.disabled);
    replacement?.focus({preventScroll:true});
  }
});
panel.addEventListener("input",e=>{
  if(e.target.dataset.custom){
    state.avatar[e.target.dataset.custom]=e.target.value;
    draw();
    return;
  }
  const key=e.target.dataset.avatar;
  if(!key||e.target.type!=="range")return;
  state.avatar[key]=Number(e.target.value);
  e.target.previousElementSibling.querySelector("output").value=e.target.value;
  draw();
});
panel.addEventListener("change",e=>{
  if(e.target.id==="booking-kind"||e.target.id==="booking-available"){
    const id=e.target.id;
    bookingKind=$("booking-kind").value;
    availableOnly=$("booking-available").checked;
    bookingPanel();
    $(id).focus({preventScroll:true});
    return;
  }
  if(e.target.dataset.custom){
    persist();
    return;
  }
  const key=e.target.dataset.avatar;
  if(e.target.id==="name-input"){
    state.name=e.target.value.trim()||state.name;
    $("model-name").textContent=state.name;
    persist();
  }
  if(!key)return;
  if(e.target.type!=="range"){
    state.avatar[key]=e.target.value;
    draw();
  }
  persist();
});
document.addEventListener("keydown",e=>{
  if(e.code!=="Space"||e.repeat||e.target.closest("input,select,button,textarea,a"))return;
  if(session?.job?.[1]==="Runway"){e.preventDefault();handle("beat","");}
});
let drag;
canvas.addEventListener("pointerdown",e=>{
  drag=e.clientX;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove",e=>{
  if(drag===undefined)return;
  renderer?.rotate((e.clientX-drag)*.47);
  drag=e.clientX;
  draw();
});
canvas.addEventListener("lostpointercapture",()=>{drag=undefined;});
render();
