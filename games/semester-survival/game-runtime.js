/* Semester Survival — central adventure runtime.
 * Owns the browser lifecycle, simulation frame loop, event routing and UI composition.
 * It requires credited local scene artwork and a real authored character atlas; it
 * deliberately refuses to invent substitute scenes, characters or animation clips.
 */
(function(root){
 'use strict';
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 function fail(message){throw new Error(message);}
 function create(options){
  options=options||{};
  const doc=options.document||root.document;
  const host=options.host;
  const world=options.world||root.SemesterWorldContent;
  const storage=options.storage||(function(){try{return root.localStorage||null;}catch(e){return null;}}());
  const onEvent=typeof options.onEvent==='function'?options.onEvent:function(){};
  const onError=typeof options.onError==='function'?options.onError:function(){};
  const modules={
   life:root.SemesterLifeSystems,input:root.SemesterInputManager,controller:root.SemesterCharacterController,
   animation:root.SemesterCharacterAnimation,character:root.SemesterCharacterRuntime,assets:root.SemesterSceneAssets,
   renderer:root.SemesterSceneRenderer,environment:root.SemesterEnvironmentRuntime,interaction:root.SemesterInteractionRuntime,
   interactionUI:root.SemesterInteractionUI,campaign:root.SemesterCampaignRuntime,campaignUI:root.SemesterCampaignUI,
   university:root.SemesterUniversityServices,phone:root.SemesterStudentPhone,phoneUI:root.SemesterStudentPhoneUI
  };
  if(!doc||!host||!world)fail('Adventure runtime requires a document, mount host and authored world.');
  if(Object.keys(modules).some(key=>!modules[key]))fail('Adventure runtime dependencies are incomplete. Load all Semester Survival runtime modules first.');
  if(!options.assetManifest||!options.sceneManifest||!options.characterAtlas)fail('Adventure runtime requires credited local scene assets, authored scene layouts and a real character atlas. No placeholder art will be generated.');
  let shell=options.shell||null,canvas=options.canvas||null,phoneRoot=options.phoneRoot||null,campaignRoot=options.campaignRoot||null,interactionRoot=options.interactionRoot||null;
  function make(tag,cls,parent){const el=doc.createElement(tag);if(cls)el.className=cls;if(parent)parent.appendChild(el);return el;}
  if(!shell){shell=make('section','ss-adventure-shell',host);shell.setAttribute('aria-label','Semester Survival adventure');}
  if(!canvas)canvas=make('canvas','ss-adventure-shell__canvas',shell);
  if(!campaignRoot)campaignRoot=make('div','ss-campaign-ui',shell);
  if(!interactionRoot)interactionRoot=make('div','ss-interaction-ui',shell);
  if(!phoneRoot)phoneRoot=make('div','ss-adventure-shell__phone',shell);
  const input=modules.input.createInputManager(options.inputTarget||shell,options.inputOptions||{});
  const renderer=modules.renderer.create({canvas:canvas,maxDevicePixelRatio:options.maxDevicePixelRatio||2});
  const life=modules.life.createEngine(storage);
  const assets=modules.assets.create({manifest:options.assetManifest,maxAssetBytes:options.maxAssetBytes,loadImage:options.loadImage});
  let disposed=false, lifecycle='created',frameHandle=null,lastFrameTime=0,lastError=null,resizeHandler=null;
  const subscribers=new Set();
  let services,campaign,phone,interaction,character,phoneUI,campaignUI,interactionUI,visibilityHandler,escapeHandler;
  const initialDistrict=options.initialDistrict||life.getState().location||'residence';
  const sceneManifest=options.sceneManifest;
  function getPosition(){const state=character?character.getState():null;return state?{x:state.movement.x,y:state.movement.y}:null;}
  function refreshUI(){
   if(phoneUI)phoneUI.render();
   if(campaignUI)campaignUI.render();
   if(interactionUI&&interaction)interactionUI.render(interaction.getState());
  }
  function publish(event,source){
   if(!event||typeof event.type!=='string')return event;
   if(source!=='university-services'&&services)services.receive(event);
   if(source!=='campaign'&&campaign)campaign.recordEvent(event);
   try{onEvent(event);}catch(error){onError(error);}
   subscribers.forEach(function(listener){try{listener(event);}catch(error){onError(error);}});
   refreshUI();
   return event;
  }
  services=modules.university.create({lifeEngine:life,storage:storage,onEvent:function(event){publish(event,'university-services');}});
  campaign=modules.campaign.create({world:world,lifeEngine:life,storage:storage,onEvent:function(event){publish(event,'campaign');}});
  const controller=modules.controller.createController(options.controllerOptions||{});
  const environment=modules.environment.create({world:world,renderer:renderer,assetPipeline:assets,sceneManifest:sceneManifest,onEvent:function(event){publish(event,'environment');}});
  const characterAtlas=options.characterAtlas;
  const atlasEntry=assets.manifestReport.find(function(item){return item.id===characterAtlas.assetId;});
  if(!atlasEntry||atlasEntry.role!=='character-atlas')fail('The character atlas id must reference a credited character-atlas asset in the local asset manifest.');
  const atlasDistrict=atlasEntry.district;
  let atlasReady=false;
  const phoneRuntime=modules.phone.create({lifeEngine:life,world:world,inputManager:input,universityServices:services,onEvent:function(event){publish(event,'student-phone');}});
  phone=phoneRuntime;
  interaction=modules.interaction.create({world:world,environment:environment,renderer:renderer,lifeEngine:life,inputManager:input,npcAnchors:options.npcAnchors||Object.keys(sceneManifest).reduce(function(map,id){map[id]=sceneManifest[id].npcAnchors||[];return map;},{}),onTravel:travelTo,onPhone:openPhone,onEvent:function(event){publish(event,'interaction');}});
  character=null;
  phoneUI=modules.phoneUI.mount(phoneRoot,phone);
  campaignUI=modules.campaignUI.create({root:campaignRoot,document:doc,campaignRuntime:campaign});
  interactionUI=modules.interactionUI.create({root:interactionRoot,document:doc,interactionRuntime:interaction,getPlayerPosition:getPosition});
  function resize(){
   if(disposed)return null;
   const rect=host.getBoundingClientRect?host.getBoundingClientRect():{width:host.clientWidth||canvas.clientWidth||800,height:host.clientHeight||canvas.clientHeight||600};
   const width=Math.max(1,rect.width||800),height=Math.max(1,rect.height||600);
   return renderer.resize(width,height,root.devicePixelRatio||1);
  }
  function update(delta){
   if(disposed)fail('Adventure runtime has been disposed.');
   if(lifecycle!=='running')return getState();
   const dt=clamp(Number(delta)||0,0,1/20);
   try{
    character.update(dt);
    const characterState=character.getState(),intent=characterState.input||{},position=getPosition();
    if(intent.phonePressed){phone.handleIntent(intent);refreshUI();}
    if(intent.pausePressed){
     if(interaction.getState().dialogue)interaction.interact(position,{closeDialogue:true});
     else if(phone.getSnapshot().open){phone.handleIntent({pausePressed:true});refreshUI();}
     else pause();
    }
    if(lifecycle!=='running')return getState();
    if(!phone.getSnapshot().open){
     interaction.refresh(position);
     if(intent.interactPressed||intent.interaction)interaction.interact(position,intent);
    }
    services.sync();
    character.render();
    if(interactionUI)interactionUI.render(interaction.getState());
    return getState();
   }catch(error){lastError=error&&error.message?error.message:String(error);lifecycle='failed';input.setContext({paused:true});stopFrameLoop();onError(error);return getState();}
  }
  function frame(timestamp){
   if(lifecycle!=='running'||disposed)return;
   const now=Number(timestamp)||0,delta=lastFrameTime?Math.min((now-lastFrameTime)/1000,1/20):0;
   lastFrameTime=now;update(delta);
   if(lifecycle==='running')frameHandle=(options.requestFrame||root.requestAnimationFrame)(frame);
  }
  function stopFrameLoop(){
   if(frameHandle!==null){const cancel=options.cancelFrame||root.cancelAnimationFrame;if(typeof cancel==='function')cancel(frameHandle);frameHandle=null;}
  }
  function startLoop(){
   if(typeof (options.requestFrame||root.requestAnimationFrame)!=='function')return false;
   lastFrameTime=0;frameHandle=(options.requestFrame||root.requestAnimationFrame)(frame);return true;
  }
  async function start(){
   if(disposed)fail('Adventure runtime has been disposed.');
   if(lifecycle==='running')return getState();
   if(lifecycle==='starting')fail('Adventure runtime is already starting.');
   lifecycle='starting';lastError=null;
   try{
    const atlasResult=await assets.preloadDistrict(atlasDistrict);
    if(disposed)fail('Adventure runtime was disposed while loading assets.');
    if(!atlasResult.ready)fail('Character atlas artwork failed to load: '+atlasResult.outcomes.filter(x=>x.status!=='loaded').map(x=>x.id).join(', '));
    const atlasImage=assets.getAsset(characterAtlas.assetId);atlasReady=true;
    const library=modules.animation.createClipLibrary(characterAtlas.manifest,atlasImage);
    const animator=modules.animation.createAnimator(library,options.animationOptions||{});
    character=modules.character.create({controller:controller,animator:animator,renderer:renderer,inputManager:input,clipLibrary:library,characterScale:options.characterScale||1,requiredClips:options.requiredClips});
    const prepared=await environment.enter(initialDistrict,{spawn:options.initialSpawn||'default'});
    if(disposed)fail('Adventure runtime was disposed while mounting the starting scene.');
    if(prepared.status!=='ready')fail('Starting district did not become ready.');
    const scene=sceneManifest[initialDistrict],spawn=scene.spawnPoints[options.initialSpawn||'default'];
    character.reset(spawn);
    resize();
    character.render();
    interaction.refresh(getPosition());
    lifecycle='running';input.setContext({paused:false});refreshUI();
    if(options.autoLoop!==false)startLoop();
    publish({type:'game:started',district:initialDistrict,semester:life.getState().campaign.semester},'runtime');
    return getState();
   }catch(error){if(!disposed){lastError=error&&error.message?error.message:String(error);lifecycle='failed';input.setContext({paused:true});onError(error);}throw error;}
  }
  async function travelTo(destination,travelOptions){
   if(disposed||lifecycle!=='running')fail('Travel is only available while the adventure is running.');
   if(phone.getSnapshot().open||interaction.getState().dialogue)fail('Close the phone or current conversation before travelling.');
   const previous=environment.getState().district;
   if(!previous||!world.districts[previous].exits.includes(destination))fail('No authored route connects the current district to that destination.');
   const result=await environment.enter(destination,{spawn:travelOptions&&travelOptions.spawn||'default'});
   if(disposed)fail('Adventure runtime was disposed during district travel.');
   try{const journey=life.travel(destination);services.sync();const spawn=sceneManifest[destination].spawnPoints[(travelOptions&&travelOptions.spawn)||'default'];character.reset(spawn);interaction.refresh(getPosition());publish({type:'travel',origin:previous,destination:destination,minutes:journey.minutes},'runtime');return getState();}
   catch(error){await environment.enter(previous,{spawn:'default'});const priorSpawn=sceneManifest[previous].spawnPoints.default;character.reset(priorSpawn);throw error;}
  }
  function pause(){
   if(lifecycle!=='running')return getState();
   lifecycle='paused';stopFrameLoop();input.setContext({paused:true});publish({type:'game:paused'},'runtime');return getState();
  }
  function resume(){
   if(disposed)fail('Adventure runtime has been disposed.');
   if(lifecycle!=='paused')return getState();
   lifecycle='running';input.consume();input.setContext({paused:false});lastFrameTime=0;startLoop();publish({type:'game:resumed'},'runtime');return getState();
  }
  function submitAssessment(courseIndex,type,score){
   const result=life.submitAssessment(courseIndex,type,score);
   publish({type:'assessment:submitted',assessment:type,courseIndex:courseIndex,score:score},'runtime');
   return result;
  }
  function completeSemester(){
   const result=life.completeSemester();services.sync();campaign.getState();
   publish({type:'semester:completed',semester:result.graduated?8:life.getState().campaign.semester-1,gpa:result.gpa,graduated:result.graduated,ending:result.ending},'runtime');
   return result;
  }
  function openPhone(){phone.setOpen(true);return getState();}
  function closePhone(){phone.setOpen(false);return getState();}
  function navigatePhone(section){phone.navigate(section);refreshUI();return getState();}
  function interact(intent){return interaction.interact(getPosition(),intent||{interactPressed:true});}
  function closeDialogue(){return interaction.interact(getPosition(),{closeDialogue:true});}
  function chooseDialogueTopic(topic){return interaction.interact(getPosition(),{topic:topic});}
  function receiveEvent(event){return publish(event,'runtime');}
  function workOnAssignment(courseId){return phone.workOnAssignment(courseId);}
  function submitAssignment(assignmentId){return phone.submitAssignment(assignmentId);}
  function registerCourses(courseIds){return phone.registerCourses(courseIds);}
  function markRead(id,kind){return phone.markRead(id,kind);}
  function reply(messageId,message){return phone.reply(messageId,message);}
  function getDiagnostics(){return Object.freeze({environment:environment.getDiagnostics(),assets:assets.getStatus(),scene:renderer.getState(),character:character?character.getState():null});}
  function subscribe(listener){if(typeof listener!=='function')fail('Event subscriber must be a function.');subscribers.add(listener);return function(){subscribers.delete(listener);};}
  function getState(){
   return Object.freeze({lifecycle:lifecycle,ready:lifecycle==='running'||lifecycle==='paused',paused:lifecycle==='paused',district:environment.getState().district,player:getPosition(),phone:phone.getSnapshot(),campaign:campaign.getState(),university:services.getSnapshot(),life:life.getState(),assets:assets.getStatus(),scene:renderer.getState(),error:lastError,atlasReady:atlasReady});
  }
  function destroy(){
   if(disposed)return;stopFrameLoop();lifecycle='disposed';disposed=true;
   if(resizeHandler&&root.removeEventListener)root.removeEventListener('resize',resizeHandler);
   doc.removeEventListener('keydown',escapeHandler);doc.removeEventListener('visibilitychange',visibilityHandler);
   phoneUI.destroy();campaignUI.destroy();interactionUI.destroy();phone.destroy();services.destroy();
   if(character)character.dispose();else input.destroy();
   subscribers.clear();if(options.removeShellOnDestroy!==false&&shell&&shell.parentNode)shell.parentNode.removeChild(shell);
  }
  resizeHandler=resize;if(root.addEventListener)root.addEventListener('resize',resizeHandler);
  escapeHandler=function(event){if(event.key==='Escape'&&lifecycle==='paused'){event.preventDefault();resume();}};
  visibilityHandler=function(){if(doc.hidden&&lifecycle==='running')pause();};
  doc.addEventListener('keydown',escapeHandler);doc.addEventListener('visibilitychange',visibilityHandler);
  resize();
  return Object.freeze({start:start,update:update,travelTo:travelTo,pause:pause,resume:resume,openPhone:openPhone,closePhone:closePhone,navigatePhone:navigatePhone,interact:interact,closeDialogue:closeDialogue,chooseDialogueTopic:chooseDialogueTopic,receiveEvent:receiveEvent,workOnAssignment:workOnAssignment,submitAssignment:submitAssignment,registerCourses:registerCourses,markRead:markRead,reply:reply,submitAssessment:submitAssessment,completeSemester:completeSemester,subscribe:subscribe,getState:getState,getDiagnostics:getDiagnostics,destroy:destroy,resize:resize});
 }
 root.SemesterAdventureRuntime=Object.freeze({create:create});
 if(root.document&&root.document.addEventListener){
  root.document.addEventListener('DOMContentLoaded',function(){
   const config=root.SEMESTER_SURVIVAL_ADVENTURE;
   if(!config||config.autoStart!==true)return;
   const host=root.document.getElementById(config.mountId||'semester-survival-adventure');
   if(!host)return;
   try{const runtime=create(Object.assign({},config,{host:host}));runtime.start().catch(function(error){if(root.console&&root.console.error)root.console.error('Semester Survival adventure failed to start:',error);});root.SemesterAdventureRuntimeInstance=runtime;}
   catch(error){if(root.console&&root.console.error)root.console.error('Semester Survival adventure failed to initialize:',error);}
  });
 }
})(typeof window!=='undefined'?window:globalThis);
