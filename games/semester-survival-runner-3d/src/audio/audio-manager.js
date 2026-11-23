const STORAGE_KEY="semester-survival-audio-v1";
const DEFAULTS={volumes:{master:.8,music:.35,sfx:.75,ambience:.2,ui:.45},muted:{master:false,music:false,sfx:false}};
const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
export function createAudioManager({musicUrl,legacySfxEnabled=()=>true}={}){
 let settings=loadSettings(),context=null,music=null,musicGain=null,musicSource=null,ambienceGain=null,ambienceSource=null,noiseBuffer=null,runActive=false,runPaused=false,tabSuspended=false,unlocked=false,duckTimer=null,voices=0,currentBus="sfx";
 let effectBuses={};
 const activeEffects=new Set();
 function loadSettings(){try{const raw=JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY)||"null");return {volumes:{...DEFAULTS.volumes,...raw?.volumes},muted:{...DEFAULTS.muted,...raw?.muted}}}catch{return {volumes:{...DEFAULTS.volumes},muted:{...DEFAULTS.muted}}}}
 function persist(){try{globalThis.localStorage?.setItem(STORAGE_KEY,JSON.stringify(settings))}catch{}}
 function masterLevel(){return settings.muted.master?0:settings.volumes.master}
 function effective(channel){
  if(!masterLevel())return 0;
  if(channel==="sfx"&&!legacySfxEnabled())return 0;
  if(settings.muted[channel])return 0;
  return clamp(masterLevel()*settings.volumes[channel]);
 }
 function ensureContext(){
  if(context)return context;
  const Ctor=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!Ctor)return null;
  try{context=new Ctor();return context}catch{return null}
 }
 function setParam(param,value,time=.16){
  if(!param||!context)return;
  const now=context.currentTime;
  try{param.cancelScheduledValues(now);param.setTargetAtTime(value,now,Math.max(.015,time/3))}catch{}
 }
 function ensureBus(channel){
  const ctx=ensureContext();if(!ctx)return null;
  if(!effectBuses[channel]){
   const gain=ctx.createGain();gain.gain.value=effective(channel);gain.connect(ctx.destination);effectBuses[channel]=gain;
  }
  return effectBuses[channel];
 }
 function makeNoise(){
  if(noiseBuffer||!context)return noiseBuffer;
  noiseBuffer=context.createBuffer(1,Math.floor(context.sampleRate*.5),context.sampleRate);
  const data=noiseBuffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  return noiseBuffer;
 }
 function ensureMusic(){
  if(music||!musicUrl)return;
  try{
   music=new Audio(musicUrl);music.preload="auto";music.loop=true;music.playsInline=true;
   const ctx=ensureContext();
   if(ctx){musicSource=ctx.createMediaElementSource(music);musicGain=ctx.createGain();musicSource.connect(musicGain);musicGain.connect(ctx.destination)}
   music.addEventListener("error",()=>music.pause());
   music.addEventListener("ended",()=>{if(runActive&&!runPaused&&!tabSuspended){try{music.currentTime=0;music.play().catch(()=>{})}catch{}}});
   applyVolumes();
  }catch{music=null;musicGain=null;musicSource=null}
 }
 function applyVolumes(){
  if(musicGain)setParam(musicGain.gain,settings.muted.music?0:effective("music"));
  else if(music)music.volume=effective("music");
  Object.entries(effectBuses).forEach(([channel,gain])=>setParam(gain.gain,effective(channel)));
  if(ambienceGain)setParam(ambienceGain.gain,runActive&&!runPaused&&!tabSuspended?effective("ambience")*.22:0);
 }
 function unlock(){
  const ctx=ensureContext();
  if(ctx&&ctx.state==="suspended")ctx.resume().catch(()=>{});
  unlocked=true;ensureMusic();ensureBus("sfx");ensureBus("ui");
 }
 function startAmbience(){
  const ctx=ensureContext();if(!ctx||ambienceSource)return;
  try{
   const source=ctx.createBufferSource();source.buffer=makeNoise();source.loop=true;
   const filter=ctx.createBiquadFilter();filter.type="lowpass";filter.frequency.value=520;
   const gain=ctx.createGain();gain.gain.value=0;
   source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start();
   ambienceSource=source;ambienceGain=gain;applyVolumes();
  }catch{}
 }
 function stopAmbience(){if(ambienceSource){try{ambienceSource.stop();ambienceSource.disconnect()}catch{}ambienceSource=null}if(ambienceGain){try{ambienceGain.disconnect()}catch{}ambienceGain=null}}
 function startRun(){
  runActive=true;runPaused=false;tabSuspended=false;unlock();startAmbience();applyVolumes();
  if(music){try{if(Number.isFinite(music.duration)&&music.currentTime>=music.duration-.08)music.currentTime=0;if(musicGain&&context){musicGain.gain.cancelScheduledValues(context.currentTime);musicGain.gain.setValueAtTime(0,context.currentTime)}music.play().then(()=>{if(musicGain&&context&&runActive)setParam(musicGain.gain,effective("music"),.65)}).catch(()=>{})}catch{}}
 }
 function pauseRun(){if(!runActive)return;runPaused=true;if(music)music.pause();applyVolumes()}
 function resumeRun(){if(!runActive)return;runPaused=false;unlock();applyVolumes();if(music)music.play().catch(()=>{})}
 function endRun(){
  runActive=false;runPaused=false;
  if(music&&!music.paused){
   try{const ctx=ensureContext();if(musicGain&&ctx){const now=ctx.currentTime;musicGain.gain.cancelScheduledValues(now);musicGain.gain.setTargetAtTime(0,now,.12);setTimeout(()=>{if(!runActive&&music){music.pause();try{music.currentTime=0}catch{}applyVolumes()}},420)}else{music.pause();music.currentTime=0}}catch{music.pause()}
  }else if(music){try{music.currentTime=0}catch{}}
  stopAmbience();
 }
 function suspendForTab(){tabSuspended=true;if(music)music.pause();applyVolumes()}
 function resumeAfterTab(){if(!runActive||runPaused)return;tabSuspended=false;unlock();applyVolumes();if(music)music.play().catch(()=>{})}
 function tone(frequency,start,duration,type="sine",peak=.12,slide=0){
  if(!context)return;
  const osc=context.createOscillator(),gain=context.createGain(),now=context.currentTime;
  osc.type=type;osc.frequency.setValueAtTime(Math.max(30,frequency),now+start);
  if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(30,frequency+slide),now+start+duration);
  gain.gain.setValueAtTime(.0001,now+start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),now+start+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+start+duration);
  osc.connect(gain);gain.connect(ensureBus(currentBus)||context.destination);osc.start(now+start);osc.stop(now+start+duration+.025);
  activeEffects.add(osc);osc.addEventListener("ended",()=>activeEffects.delete(osc));
 }
 function noiseBurst(start,duration,peak=.08,filterType="highpass",cutoff=900){
  if(!context)return;
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain(),now=context.currentTime;
  source.buffer=makeNoise();source.loop=true;filter.type=filterType;filter.frequency.value=cutoff;
  gain.gain.setValueAtTime(.0001,now+start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),now+start+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+start+duration);
  source.connect(filter);filter.connect(gain);gain.connect(ensureBus(currentBus)||context.destination);source.start(now+start);source.stop(now+start+duration+.025);
  activeEffects.add(source);source.addEventListener("ended",()=>activeEffects.delete(source));
 }
 const recipes={
  jump:()=>{tone(190,0,.16,"sine",.09,240);noiseBurst(0,.11,.035,"highpass",1300)},
  slide:()=>{noiseBurst(0,.28,.075,"bandpass",1100);tone(145,.02,.24,"sine",.035,-55)},
  whoosh:()=>{noiseBurst(0,.18,.055,"bandpass",1700);tone(420,0,.16,"sine",.025,260)},
  landing:()=>{tone(105,0,.13,"triangle",.09,-35);noiseBurst(0,.08,.045,"lowpass",500)},
  collision:()=>{noiseBurst(0,.34,.16,"lowpass",760);tone(78,0,.28,"sine",.19,-38);tone(48,.035,.2,"triangle",.08,-15)},
  coin:()=>{tone(880,0,.09,"sine",.07,220);tone(1320,.075,.14,"sine",.055,160)},
  powerup:()=>{tone(420,0,.24,"sine",.075,620);tone(630,.09,.25,"triangle",.055,560)},
  passby:()=>{noiseBurst(0,.3,.02,"bandpass",850);tone(280,0,.28,"sine",.012,-180)},
  gameover:()=>{tone(310,0,.25,"triangle",.08,-120);tone(190,.18,.42,"sine",.055,-75)},
  ui:()=>{tone(720,0,.045,"sine",.035,-90)}
 };
 const cooldowns=new Map();
 function play(name,{priority=3,duckMusic=false}={}){
  if(!runActive&&name!=="ui")return false;
  if(name==="ui"&&!unlocked)return false;
  const group=name==="ui"?"ui":"sfx";
  if(effective(group)<=0||!context)return false;
  const now=Date.now(),last=cooldowns.get(name)||0,minimum=name==="coin"?75:100;
  if(now-last<minimum)return false;
  if(voices>=8&&priority<8)return false;
  cooldowns.set(name,now);voices++;currentBus=group;
  try{recipes[name]?.()}catch{}
  setTimeout(()=>{voices=Math.max(0,voices-1)},name==="collision"?420:320);
  if(duckMusic&&musicGain&&context){
   const target=effective("music"),t=context.currentTime;
   musicGain.gain.cancelScheduledValues(t);musicGain.gain.setTargetAtTime(target*.58,t,.025);
   clearTimeout(duckTimer);duckTimer=setTimeout(()=>{if(musicGain&&context&&runActive){const at=context.currentTime;musicGain.gain.cancelScheduledValues(at);musicGain.gain.setTargetAtTime(effective("music"),at,.22)}},380);
  }
  return true;
 }
 function setVolume(channel,value){if(!(channel in settings.volumes))return;settings.volumes[channel]=clamp(value);persist();applyVolumes()}
 function setMuted(channel,value){if(!(channel in settings.muted))return;settings.muted[channel]=!!value;persist();applyVolumes()}
 function setLegacySfxEnabled(){applyVolumes()}
 function getSettings(){return {volumes:{...settings.volumes},muted:{...settings.muted}}}
 function destroy(){endRun();activeEffects.forEach(effect=>{try{effect.stop()}catch{}});activeEffects.clear();Object.values(effectBuses).forEach(bus=>{try{bus.disconnect()}catch{}});effectBuses={};if(context)context.close().catch(()=>{});context=null}
 return {startRun,pauseRun,resumeRun,endRun,suspendForTab,resumeAfterTab,play,setVolume,setMuted,setLegacySfxEnabled,getSettings,destroy};
}
