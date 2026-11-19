/* Semester Survival — audio-clock-driven phoneme/viseme synchronization.
 * Voice recordings and manually aligned viseme cues are authored production assets.
 * This module never synthesizes speech or guesses mouth shapes from dialogue text.
 */
(function(root){
 'use strict';
 function fail(message){throw new Error(message);}
 function safePath(path){return typeof path==='string'&&path.length>0&&!/^(?:[a-z]+:)?\/\//i.test(path)&&!path.startsWith('/')&&!path.split('/').includes('..')&&!/[?#]/.test(path);}
 function validateTrack(track,animator){
  if(!track||!safePath(track.src))fail('Voice track requires a safe relative audio path.');
  if(animator&&typeof animator.hasClip==='function'&&!animator.hasClip('mouth-neutral'))fail('The approved mouth atlas must include mouth-neutral.');
  if(!Array.isArray(track.cues)||!track.cues.length)fail('Voice track requires authored viseme cues.');
  let previous=-1;
  track.cues.forEach(function(cue,index){
   if(!cue||!Number.isFinite(cue.time)||cue.time<0||cue.time<previous)fail('Viseme cue '+index+' has an invalid or unordered timestamp.');
   if(typeof cue.viseme!=='string'||!cue.viseme.trim())fail('Viseme cue '+index+' requires a clip name.');
   if(animator&&typeof animator.hasClip==='function'&&!animator.hasClip(cue.viseme))fail('Missing authored mouth viseme clip: '+cue.viseme);
   previous=cue.time;
  });
  return true;
 }
 function create(options){
  options=options||{};
  const audio=options.audio||null;let animator=options.animator||null;
  let cues=[],trackId=null,index=-1,status='idle',error=null;
  function requireReady(){if(!audio||typeof audio.play!=='function'||!animator||typeof animator.play!=='function'||typeof animator.render!=='function')fail('Lip-sync requires an audio player and an authored mouth animator.');}
  function setAnimator(value){
   if(status==='speaking'||status==='loading')fail('Cannot replace the mouth animator while a voice track is active.');
   if(!value||typeof value.play!=='function'||typeof value.render!=='function'||typeof value.hasClip!=='function'||!value.hasClip('mouth-neutral'))fail('Mouth animator must expose render, play and an authored mouth-neutral clip.');
   animator=value;return getState();
  }
  function start(track){
   requireReady();validateTrack(track,animator);
   stop();cues=track.cues.map(function(cue){return Object.freeze({time:cue.time,viseme:cue.viseme});});
   trackId=track.id||track.src;index=-1;error=null;
   audio.pause();audio.src=track.src;audio.currentTime=0;
   if(typeof audio.load==='function')audio.load();
   status='loading';
   const result=audio.play();
   if(result&&typeof result.then==='function')return result.then(function(){status='speaking';return getState();}).catch(function(err){status='error';error=err&&err.message?err.message:String(err);throw err;});
   status='speaking';return Promise.resolve(getState());
  }
  function update(){
   if(status!=='speaking'&&status!=='loading')return getState();
   if(audio.ended){status='ended';animator.play('mouth-neutral');return getState();}
   if(audio.paused)return getState();
   const time=Math.max(0,Number(audio.currentTime)||0);
   let next=-1;
   for(let i=0;i<cues.length&&cues[i].time<=time;i++)next=i;
   if(next!==index){
    index=next;
    const viseme=index<0?'mouth-neutral':cues[index].viseme;
    const result=animator.play(viseme);
    if(result&&result.ok===false){status='error';error='Missing authored viseme clip: '+viseme;return getState();}
   }
   return getState();
  }
  function pause(){if(audio&&typeof audio.pause==='function')audio.pause();if(status==='speaking')status='paused';return getState();}
  function resume(){if(!audio||!audio.src)fail('No voice track is loaded.');const result=audio.play();status='speaking';return result&&typeof result.then==='function'?result.then(getState):getState();}
  function stop(){
   if(audio&&typeof audio.pause==='function'){audio.pause();try{audio.currentTime=0;}catch(e){}}
   if(animator&&typeof animator.play==='function')animator.play('mouth-neutral');
   cues=[];trackId=null;index=-1;status='idle';error=null;return getState();
  }
  function render(context,x,y,scale){if(status!=='speaking'&&status!=='paused'&&status!=='ended')return {drawn:false,reason:'not-speaking'};return animator.render(context,x,y,scale);}
  function getState(){return Object.freeze({status:status,trackId:trackId,viseme:index<0?'mouth-neutral':cues[index]&&cues[index].viseme||'mouth-neutral',cueIndex:index,error:error,clock:audio&&Number.isFinite(audio.currentTime)?audio.currentTime:0,available:Boolean(audio&&animator)});}
  return Object.freeze({start:start,update:update,pause:pause,resume:resume,stop:stop,render:render,getState:getState,setAnimator:setAnimator,validateTrack:function(track){return validateTrack(track,animator);}});
 }
 root.SemesterLipSyncRuntime=Object.freeze({create:create,validateTrack:validateTrack});
})(typeof window!=='undefined'?window:globalThis);
