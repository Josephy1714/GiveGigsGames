// Original, sample-free arcade score for Semester Survival 3D.
// Afro-futurist arcade energy: warm log-drum-inspired bass, bright mallet plucks,
// crisp syncopated percussion and wide cinematic synth chords.
const BPM=122,BEAT=60/BPM,BAR=BEAT*4,LOOP_BARS=8,LOOP_SECONDS=BAR*LOOP_BARS;
const PROGRESSION=[[50,53,57,60],[46,50,53,57],[41,45,48,52],[48,52,55,58]];
const LEAD=[0,3,5,7,10,7,5,3, 0,3,5,10,7,5,3,0];
const MIDI=m=>440*Math.pow(2,(m-69)/12);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const PROCEDURAL_SCORE={bpm:BPM,bars:LOOP_BARS,loopSeconds:LOOP_SECONDS,style:"original-afro-futurist-arcade"};
export function createProceduralScore(context,output){
 let timer=null,playing=false,level=1,nextStart=0,noise=null,active=new Set();
 const master=context.createGain();master.gain.value=0;
 const compressor=context.createDynamicsCompressor();compressor.threshold.value=-18;compressor.knee.value=18;compressor.ratio.value=3;compressor.attack.value=.008;compressor.release.value=.22;
 master.connect(compressor);compressor.connect(output);
 function noiseBuffer(){
  if(noise)return noise;
  noise=context.createBuffer(1,Math.floor(context.sampleRate*.25),context.sampleRate);
  const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,.35);
  return noise;
 }
 function track(node){active.add(node);node.addEventListener?.("ended",()=>active.delete(node));return node}
 function envelope(gain,at,duration,peak,attack=.008){
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),at+attack);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
 }
 function synth(freq,at,duration,{type="sine",peak=.05,detune=0,filter=9000,attack=.008,release=null,pan=0}={}){
  if(!playing)return;
  const osc=context.createOscillator(),filterNode=context.createBiquadFilter(),gain=context.createGain(),panner=context.createStereoPanner();
  osc.type=type;osc.frequency.setValueAtTime(freq,at);osc.detune.value=detune;
  filterNode.type="lowpass";filterNode.frequency.setValueAtTime(filter,at);filterNode.Q.value=.65;
  envelope(gain,at,duration,peak*level,attack);
  panner.pan.value=pan;osc.connect(filterNode);filterNode.connect(gain);gain.connect(panner);panner.connect(master);
  track(osc);osc.start(at);osc.stop(at+duration+(release||.025));
 }
 function kick(at,velocity=1){
  if(!playing)return;
  const osc=context.createOscillator(),gain=context.createGain();osc.type="sine";
  osc.frequency.setValueAtTime(125,at);osc.frequency.exponentialRampToValueAtTime(43,at+.16);
  envelope(gain,at,.2,.24*level*velocity,.004);osc.connect(gain);gain.connect(master);track(osc);osc.start(at);osc.stop(at+.23);
 }
 function noiseHit(at,duration,peak,cutoff,pan=0){
  if(!playing)return;
  const src=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain(),p=context.createStereoPanner();
  src.buffer=noiseBuffer();filter.type="highpass";filter.frequency.value=cutoff;
  envelope(gain,at,duration,peak*level,.003);p.pan.value=pan;
  src.connect(filter);filter.connect(gain);gain.connect(p);p.connect(master);track(src);src.start(at);src.stop(at+duration+.02);
 }
 function bass(note,at,duration,accent=1){
  synth(MIDI(note),at,duration,{type:"triangle",peak:.15*accent,filter:520,attack:.012,pan:-.08});
  synth(MIDI(note-12),at,duration*.72,{type:"sine",peak:.09*accent,filter:180,attack:.01,pan:-.08});
 }
 function pluck(note,at,accent=1,pan=0){
  synth(MIDI(note),at,.22,{type:"triangle",peak:.105*accent,filter:4200,attack:.003,pan});
  synth(MIDI(note+12),at,.12,{type:"sine",peak:.025*accent,filter:7000,attack:.003,pan});
 }
 function pad(chord,at,duration){
  chord.forEach((note,i)=>synth(MIDI(note),at,duration,{type:"sawtooth",peak:.018,filter:1250,attack:.32,pan:(i-1.5)*.24}));
  chord.slice(0,2).forEach((note,i)=>synth(MIDI(note+12),at,duration*.88,{type:"sine",peak:.014,filter:2600,attack:.4,pan:i? .32:-.32}));
 }
 function scheduleLoop(start){
  if(!playing)return;
  for(let bar=0;bar<LOOP_BARS;bar++){
   const barAt=start+bar*BAR,chord=PROGRESSION[Math.floor(bar/2)];
   pad(chord.map((n,i)=>n+(i===3?12:0)),barAt,BAR*1.92);
   for(let beat=0;beat<4;beat++){
    const at=barAt+beat*BEAT;
    if(beat===0||beat===2)kick(at,beat===0?1:.82);
    if(beat===1||beat===3){noiseHit(at,.13,.11,1700,beat===1?-.18:.18);synth(185,at,.12,{type:"triangle",peak:.018,filter:600,pan:.1})}
    // Shaker ticks with a few deliberate gaps keep the groove breathing.
    for(let eighth=0;eighth<2;eighth++){
     if(!(beat===3&&eighth===1))noiseHit(at+eighth*BEAT/2,.035,eighth?.022:.032,6800,(eighth?1:-1)*.35);
    }
    // Syncopated low drum accents: original rhythm, not a sampled loop.
    if((bar+beat)%4===2)noiseHit(at+BEAT*.72,.075,.055,420,-.25);
   }
   const root=chord[0];
   [0,3,6,7,10,12,14].forEach((step,i)=>{
    const at=barAt+step*BEAT/4;
    const note=root-12+[0,0,7,12,7,3,10][i];
    bass(note,at,BEAT*(i===0?.72:.38),i===0?1:.72);
   });
   // A changing eight-bar hook built from the same original pentatonic motif.
   for(let step=0;step<8;step++){
    const motif=LEAD[(step+(bar%2?3:0))%LEAD.length];
    if((bar+step)%5===4)continue;
    const note=chord[0]+24+motif;
    pluck(note,barAt+step*BEAT/2,(step%4===0?1:.72),Math.sin((bar*8+step)*.7)*.58);
   }
   if(bar===3||bar===7){
    synth(MIDI(chord[2]+24),barAt+BAR*.72,.34,{type:"sine",peak:.045,filter:6000,pan:.45});
    noiseHit(barAt+BAR*.94,.22,.12,3500,0);
   }
  }
 }
 function schedule(){
  if(!playing)return;
  const start=Math.max(nextStart,context.currentTime+.08);
  scheduleLoop(start);nextStart=start+LOOP_SECONDS;
  timer=setTimeout(schedule,Math.max(250,(nextStart-context.currentTime-.3)*1000));
 }
 function start(){
  if(playing)return;
  playing=true;nextStart=context.currentTime+.12;
  master.gain.cancelScheduledValues(context.currentTime);master.gain.setTargetAtTime(.72,context.currentTime,.45);
  schedule();
 }
 function stop(){
  if(!playing)return;playing=false;if(timer!==null)clearTimeout(timer);timer=null;
  const now=context.currentTime;master.gain.cancelScheduledValues(now);master.gain.setTargetAtTime(0,now,.18);
  active.forEach(node=>{try{node.stop(now+.65)}catch{}});active.clear();
 }
 function setIntensity(value){level=clamp(Number(value)||0,.25,1.25)}
 function destroy(){stop();try{master.disconnect();compressor.disconnect()}catch{}}
 return {start,stop,setIntensity,destroy};
}
