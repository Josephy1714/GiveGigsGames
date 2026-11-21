import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { loadJayCharacter } from "./jay-character.js";
import { createAtlasAnimationPlayer, resolveRunnerAnimationState } from "../animation/three-character-animation.js";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), laneX=[-3.05,0,3.05];
const mat=(c,r=.82,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
function box(p,w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
function signTexture(label){
 const c=document.createElement("canvas");c.width=512;c.height=128;const x=c.getContext("2d");
 x.fillStyle="#183b39";x.fillRect(0,0,512,128);x.strokeStyle="#e3d5b7";x.lineWidth=6;x.strokeRect(4,4,504,120);
 x.fillStyle="#f6edda";x.font="800 34px system-ui";x.textAlign="center";x.textBaseline="middle";x.fillText(label,256,64,460);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:t,roughness:.75});
}
function building(scene,side,z,i,m){
 const g=new THREE.Group();g.position.set(side*(13.2+i%2*.7),0,z);scene.add(g);
 const w=8+i%3*1.1,h=7.5+i%3*1.8,d=9+i%2*2,wall=[m.warm,m.stone,m.sand][i%3];
 box(g,w,h,d,wall,0,h/2,0);box(g,w+.45,.28,d+.45,m.trim,0,h+.12,0);box(g,w+.7,.18,d+.6,m.dark,0,h+.35,0);
 const floors=Math.round(h/2.7);
 for(let f=0;f<floors;f++){const y=1.4+f*2.3;for(let n=0;n<4;n++){const x=-w/2+1.1+n*(w-2.2)/3;box(g,1.15,1.35,.1,m.glass,x,y,d/2+.08);box(g,.08,1.44,.14,m.trim,x-.61,y,d/2+.1);box(g,.08,1.44,.14,m.trim,x+.61,y,d/2+.1);}}
 box(g,w*.5,.22,1.5,m.dark,0,1.8,d/2+.72);
 const plaque=new THREE.Mesh(new THREE.PlaneGeometry(w*.52,.42),signTexture(["SCHOOL OF SCIENCE","STUDENT CENTRE","LECTURE THEATRE","UNIVERSITY LIBRARY"][i%4]));
 plaque.position.set(0,h-.85,d/2+.12);g.add(plaque);
 const tank=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,1,12),m.tank);tank.position.set(w*.27,h+.7,-d*.15);g.add(tank);
}
function tree(scene,x,z,m){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.16,.24,2.1,8),m.bark);trunk.position.y=1.05;g.add(trunk);
 for(const [y,r] of [[2.15,1],[2.9,.82],[3.55,.58]]){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),m.leaves);crown.position.y=y;crown.scale.y=.9;g.add(crown);}
 const pot=new THREE.Mesh(new THREE.CylinderGeometry(.7,.78,.28,12),m.concrete);pot.position.y=.14;g.add(pot);
}
function lamp(scene,x,z,m){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.08,5.4,8),m.dark);pole.position.y=2.7;g.add(pole);box(g,.85,.08,.08,m.dark,x<0?.35:-.35,5.35,0);box(g,.42,.12,.3,m.lamp,x<0?.7:-.7,5.3,0);}
function car(scene,x,z,color,m){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);const paint=mat(color,.35,.25);
 box(g,1.9,.62,3.8,paint,0,.65,0);box(g,1.55,.65,1.8,m.glass,0,1.22,-.1);
 for(const s of [-1,1])for(const zz of [-1.2,1.2]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.18,12),m.tire);w.rotation.z=Math.PI/2;w.position.set(s*.98,.34,zz);g.add(w);}
 for(const s of [-1,1]){box(g,.3,.14,.06,m.lamp,s*.65,.72,1.92);box(g,.28,.12,.06,m.red,s*.65,.72,-1.92);}
 return g;
}
async function jayFrames(){
 const [manifest,img]=await Promise.all([
  fetch(new URL("../../assets/processed/jay-runtime/jay-atlas.json",import.meta.url)).then(r=>{if(!r.ok)throw Error("Jay atlas manifest missing");return r.json();}),
  new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error("Jay atlas image missing"));i.src=new URL("../../assets/processed/jay-runtime/jay-atlas.png",import.meta.url).href;})
 ]);
 if(!manifest.clips?.jog?.frames?.length)throw Error("Jay runtime atlas has no jog cycle");
 return {manifest,image:img};
}
export async function createRunnerRenderer({mount}={}){
 if(!mount)throw new TypeError("Three.js mount missing");
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x9db8c0);scene.fog=new THREE.FogExp2(0x9db8c0,.0085);
 const camera=new THREE.PerspectiveCamera(61,1,.1,320);camera.position.set(0,5.2,10.8);camera.lookAt(0,1.1,-13);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(mount.clientWidth||innerWidth,mount.clientHeight||innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;mount.appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xe5f1ff,0x56634c,2));const sun=new THREE.DirectionalLight(0xffe2be,2.7);sun.position.set(-18,28,12);scene.add(sun);
 const m={asphalt:mat(0x303b41,.96),grass:mat(0x536e4d),concrete:mat(0xbab8aa),curb:mat(0xe2dac8),warm:mat(0xcbb99a),stone:mat(0x9b9c91),sand:mat(0xd6c9ad),trim:mat(0xe4dac5),dark:mat(0x26373c),glass:mat(0x294b5a,.25,.2),tank:mat(0x6d8581),bark:mat(0x69503a),leaves:mat(0x557c54),lamp:mat(0xffe3a8,.3),tire:mat(0x171b1e),red:mat(0x9d3c34),white:mat(0xf3ecd9),gold:mat(0xf4c95d,.2,.65),obstacle:mat(0x805a45),warning:mat(0xe5b957),bonus:new THREE.MeshStandardMaterial({color:0x8ce6c5,emissive:0x164c40,metalness:.3,roughness:.25})};
 const world=new THREE.Group();scene.add(world);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(190,300),m.grass);ground.rotation.x=-Math.PI/2;ground.position.set(0,-.16,-112);world.add(ground);
 const road=new THREE.Mesh(new THREE.PlaneGeometry(14,300),m.asphalt);road.rotation.x=-Math.PI/2;road.position.set(0,0,-112);world.add(road);
 for(const s of [-1,1]){const walk=new THREE.Mesh(new THREE.PlaneGeometry(3,300),m.concrete);walk.rotation.x=-Math.PI/2;walk.position.set(s*8.5,.025,-112);world.add(walk);box(world,.2,.22,300,m.curb,s*7.05,.11,-112);box(world,.14,.18,300,m.curb,s*10.05,.09,-112);}
 for(let z=-4;z>-292;z-=9)for(const x of [-2.34,2.34])box(world,.11,.018,4.1,m.white,x,.02,z);
 for(const z of [-24,-86,-148,-210,-272])for(let i=0;i<8;i++)box(world,1,.025,1.65,m.white,-5.4+i*1.54,.026,z);
 for(let i=0;i<6;i++){building(scene,-1,-14-i*38,i,m);building(scene,1,-30-i*38,(i+1)%4,m);}
 for(let i=0;i<10;i++){lamp(scene,-7.8,-8-i*27,m);lamp(scene,7.8,-20-i*27,m);}
 for(let i=0;i<16;i++){tree(scene,-10.8,-12-i*17,m);tree(scene,10.8,-20-i*17,m);}
 const traffic=[car(scene,-5.25,-38,0x315b7a,m),car(scene,5.25,-91,0x9a4c39,m),car(scene,-5.25,-146,0x777d78,m),car(scene,5.25,-198,0xc1a65e,m)];
 const gate=new THREE.Group();gate.position.z=-14;world.add(gate);box(gate,.65,5.6,.8,m.stone,-7.5,2.8,0);box(gate,.65,5.6,.8,m.stone,7.5,2.8,0);box(gate,15.6,.7,1,m.dark,0,5.35,0);const board=new THREE.Mesh(new THREE.PlaneGeometry(8.6,.52),signTexture("CHIROMO CAMPUS"));board.position.set(0,5.38,.53);gate.add(board);
 for(let i=0;i<5;i++){const z=-32-i*48,s=i%2?1:-1,x=s*9.15;const bench=new THREE.Group();bench.position.set(x,0,z);world.add(bench);box(bench,1.55,.12,.42,m.warm,0,.56,0);box(bench,1.55,.12,.42,m.warm,0,.82,-.12);for(const dx of [-.58,.58])box(bench,.1,.58,.1,m.dark,dx,.3,0);const bin=new THREE.Mesh(new THREE.CylinderGeometry(.26,.3,.75,10),m.dark);bin.position.set(x+s*.75,.38,z);world.add(bin);}
 const makeJaySprite=(order)=>{const material=new THREE.SpriteMaterial({transparent:true,depthWrite:false,opacity:0});const sprite=new THREE.Sprite(material);sprite.renderOrder=order;sprite.position.set(0,.04,2);scene.add(sprite);return sprite;};
 const jay=makeJaySprite(7),jayPrevious=makeJaySprite(6);
 let atlas=null,atlasTexture=null,atlasPlayer=null,jayRig=null,rigBaseY=0,rigBaseScaleY=1,lastGameT=0,playerX=0;
 const targetJayHeight=2.08;
 function applyAtlasFrame(sprite,frame,opacity){
  if(!frame||!atlasTexture){sprite.visible=false;return;}
  const map=sprite.material.map;
  map.offset.set(frame.x/atlas.image.width,1-(frame.y+frame.height)/atlas.image.height);
  map.repeat.set(frame.width/atlas.image.width,frame.height/atlas.image.height);
  sprite.center.set((frame.pivotX??frame.width/2)/frame.width,1-(frame.pivotY??frame.height)/frame.height);
  sprite.scale.set(targetJayHeight*frame.width/frame.height,targetJayHeight,1);
  sprite.material.opacity=opacity;sprite.visible=opacity>.015;
 }
 try{
  jayRig=await loadJayCharacter({url:"./assets/3d/jay/jay.glb",scene,targetHeight:1.78,strictClips:false});
  rigBaseY=jayRig.root.position.y;rigBaseScaleY=jayRig.root.scale.y;jay.visible=false;jayPrevious.visible=false;
  console.info("Jay production 3D rig loaded",jayRig.availableClips);
 }catch(e){
  console.info("Jay GLB not installed yet; using the complete authored Jay animation atlas in the 3D scene.",e);
  try{
   atlas=await jayFrames();atlasTexture=new THREE.Texture(atlas.image);atlasTexture.colorSpace=THREE.SRGBColorSpace;atlasTexture.needsUpdate=true;
   atlasPlayer=createAtlasAnimationPlayer(atlas.manifest,{transitionSeconds:.12});atlasPlayer.play("jog");
   jay.material.map=atlasTexture.clone();jayPrevious.material.map=atlasTexture.clone();
   jay.material.map.colorSpace=THREE.SRGBColorSpace;jayPrevious.material.map.colorSpace=THREE.SRGBColorSpace;
   jay.material.needsUpdate=true;jayPrevious.material.needsUpdate=true;
   jay.visible=true;
  }catch(atlasError){console.warn("Jay runtime atlas unavailable; character remains hidden until a valid asset is added.",atlasError);jay.visible=false;}
 }
 const obstacles=Array.from({length:18},()=>{const g=new THREE.Group();box(g,1.75,.9,.95,m.obstacle,0,.55,0);box(g,1.78,.12,1,m.warning,0,1.02,0);box(g,1.4,.12,.08,m.white,0,.73,.51);scene.add(g);g.visible=false;return g;});
 const coins=Array.from({length:36},()=>{const o=new THREE.Mesh(new THREE.TorusGeometry(.34,.105,10,20),m.gold);o.rotation.x=Math.PI/2;scene.add(o);o.visible=false;return o;});
 const bonuses=Array.from({length:16},()=>{const o=new THREE.Mesh(new THREE.OctahedronGeometry(.48,1),m.bonus);scene.add(o);o.visible=false;return o;});
 function resize(){const w=mount.clientWidth||innerWidth,h=mount.clientHeight||innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}
 const ro=typeof ResizeObserver!=="undefined"?new ResizeObserver(resize):null;if(ro)ro.observe(mount);else addEventListener("resize",resize);
 function render(g){
  if(!g)return;world.position.z=(g.d*.14)%54;
  traffic.forEach((v,i)=>{v.position.z=-112+((g.d*.22+i*47)%112);});
  const dt=clamp(g.t-lastGameT,0,.05);lastGameT=g.t;
  const jumpY=g.jump>0?Math.sin((1-g.jump)*Math.PI)*1.12:0;
  playerX=THREE.MathUtils.damp(playerX,laneX[g.lane??1],13,dt);
  const animationState=resolveRunnerAnimationState(g);
  if(jayRig){
   jayRig.root.position.x=playerX;jayRig.root.position.y=rigBaseY+jumpY;jayRig.root.position.z=2;
   const rigState=animationState==="slide-start"?"slideStart":animationState==="slide-loop"?"slideLoop":animationState==="slide-recover"?"slideRecover":animationState==="jump-running"?"jump":animationState==="fall-accidental"?"fall":animationState;
   const chosen=jayRig.availableClips.includes(rigState)?rigState:(rigState==="slideStart"||rigState==="slideLoop"||rigState==="slideRecover"?"slide":jayRig.availableClips.includes("run")?"run":"idle");
   jayRig.root.scale.y=rigBaseScaleY*(animationState.startsWith("slide-")?.94:1);
   jayRig.play(chosen,{timeScale:animationState==="sprint"?1.12:1});jayRig.update(dt);
  }else if(atlasPlayer&&atlasTexture){
   atlasPlayer.play(animationState);const pose=atlasPlayer.update(dt);
   jay.position.set(playerX,.04+jumpY,2);
   if(pose.from){applyAtlasFrame(jayPrevious,pose.from.frame,pose.from.alpha);jayPrevious.position.x=playerX;jayPrevious.position.y=.04+jumpY;jayPrevious.position.z=2;}
   else jayPrevious.visible=false;
   applyAtlasFrame(jay,pose.frame,pose.alpha);
   const flicker=g.inv>0&&Math.floor(g.t*16)%2;
   jay.material.opacity*=flicker?.42:1;
  }
  let n=0;for(const o of g.obs||[]){if(n>=obstacles.length)break;const v=obstacles[n++];v.visible=true;v.position.set(laneX[o.lane??1],0,-42+clamp(o.z,0,1.12)*46);const s=o.boss?1.65:1;v.scale.set(s,o.action==="slide" ? .8 : o.action==="jump" ? .7 : 1,s);}for(let i=n;i<obstacles.length;i++)obstacles[i].visible=false;
  n=0;for(const p of g.pick||[]){if(n>=coins.length)break;const v=coins[n++];v.visible=true;v.position.set(laneX[p.lane??1],1.15,-42+clamp(p.z,0,1.1)*46);v.rotation.y=g.t*1.8;}for(let i=n;i<coins.length;i++)coins[i].visible=false;
  n=0;for(const p of g.bonus||[]){if(n>=bonuses.length)break;const v=bonuses[n++];v.visible=true;v.position.set(laneX[p.lane??1],1.35,-42+clamp(p.z,0,1.1)*46);v.rotation.set(g.t*.8,g.t*1.5,0);}for(let i=n;i<bonuses.length;i++)bonuses[i].visible=false;
  renderer.render(scene,camera);
 }
 return {render,resize,dispose(){ro?.disconnect();removeEventListener("resize",resize);renderer.dispose();mount.replaceChildren();}};
}