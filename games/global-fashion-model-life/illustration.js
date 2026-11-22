"use strict";

function createStudio(canvas) {
  const T = window.THREE;
  const renderer = new T.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true, powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(640,760,false);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.physicallyCorrectLights = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x1f141e, 0.042);

  // Procedural studio environment map for realistic satin, metallic, and eye reflections
  const envCanvas = document.createElement("canvas");
  envCanvas.width = 256;
  envCanvas.height = 128;
  const ectx = envCanvas.getContext("2d");
  const envGrad = ectx.createLinearGradient(0, 0, 0, 128);
  envGrad.addColorStop(0, "#3a2838");
  envGrad.addColorStop(0.45, "#231722");
  envGrad.addColorStop(1, "#0f0a0f");
  ectx.fillStyle = envGrad;
  ectx.fillRect(0, 0, 256, 128);
  ectx.fillStyle = "rgba(255, 236, 224, 0.9)";
  ectx.fillRect(150, 18, 48, 36); // warm key softbox
  ectx.fillStyle = "rgba(180, 205, 255, 0.55)";
  ectx.fillRect(24, 28, 36, 42);  // cool fill strip
  ectx.fillStyle = "rgba(245, 175, 218, 0.7)";
  ectx.fillRect(96, 10, 28, 20);  // top rim light
  const envTex = new T.CanvasTexture(envCanvas);
  envTex.mapping = T.EquirectangularReflectionMapping;
  envTex.encoding = T.sRGBEncoding;
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose();
  pmrem.dispose();

  const camera = new T.PerspectiveCamera(32,640/760,.05,100);
  const world = new T.Group();
  const model = new T.Group();
  scene.add(world, model, new T.HemisphereLight(0xffe8ed,0x6e5682,.85));
  function light(color, strength, pos, cast=false) {
    const lamp = new T.DirectionalLight(color,strength);
    lamp.position.set(...pos);
    if (cast) {
      lamp.castShadow = true;
      lamp.shadow.mapSize.set(2048, 2048);
      lamp.shadow.radius = 2.5;
      lamp.shadow.bias = -0.0004;
      lamp.shadow.camera.near = 0.5;
      lamp.shadow.camera.far = 15;
      lamp.shadow.camera.left = -1.6;
      lamp.shadow.camera.right = 1.6;
      lamp.shadow.camera.top = 2.6;
      lamp.shadow.camera.bottom = -0.4;
    }
    scene.add(lamp);
  }
  light(0xffe7d6,3.4,[3,4,5],true);
  light(0xf5abda,1.9,[-3,3,-3]);
  light(0xb4c9ff,1.2,[-4,1,3]);

  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = textureCanvas.height = 768;
  const paint = textureCanvas.getContext("2d");
  const texture = new T.CanvasTexture(textureCanvas);
  texture.encoding = T.sRGBEncoding;
  texture.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const palette = (key,index) => colors[key][index][1];
  const variants = (n,extent) => ((n-50)/50)*extent;
  const smooth = (n) => n*n*(3-2*n);
  const gaussian = (x,y,sx,sy) => Math.exp(-(x*x/(sx*sx)+y*y/(sy*sy)));
  const clamp = (v) => Math.max(0,Math.min(1,v));

  function material(color, roughness=.67, metalness=0, map=null) {
    const clearcoat = roughness < 0.45 ? (0.45 - roughness) * 1.4 : 0.04;
    return new T.MeshPhysicalMaterial({color:new T.Color(color).convertSRGBToLinear(),roughness,metalness,map,clearcoat,clearcoatRoughness:0.32,envMapIntensity:1.15,side:T.DoubleSide});
  }

  function add(group, geometry, surface, position=[0,0,0], scale=[1,1,1]) {
    const mesh = new T.Mesh(geometry,surface);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  function oval(group,surface,x,y,z,rx,ry,rz) {
    return add(group,new T.SphereGeometry(1,28,20),surface,[x,y,z],[rx,ry,rz]);
  }

  function limb(group,surface,start,end,radii) {
    const a = new T.Vector3(...start);
    const b = new T.Vector3(...end);
    const mid = a.clone().lerp(b,.5);
    const length = a.distanceTo(b);
    const mesh = rings(group,surface,radii.map(([fraction,r,depth])=>[(fraction-.5)*length,r,depth,0]));
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());
  }

  function rings(group,surface,profile,shape=()=>0,segments=64,subdivisions=5) {
    const vertex=[],uv=[],tri=[];
    const rows=(profile.length-1)*subdivisions;
    for(let j=0;j<=rows;j++){
      const row=Math.min(profile.length-2,Math.floor(j/subdivisions));
      const t=j/subdivisions-row;
      const values=profile[row].map((v,i)=>{
        const next=profile[row+1][i];
        const prior=profile[Math.max(0,row-1)][i];
        const after=profile[Math.min(profile.length-1,row+2)][i];
        return v+(next-v)*smooth(t)+.5*((next-prior)*t*(1-t)*(1-t)-(after-v)*t*t*(1-t));
      });
      const [y,rx,rz,z]=values;
      for(let i=0;i<=segments;i++){
        const a=(i/segments-.5)*Math.PI*2;
        const x=Math.sin(a)*Math.max(.0001,rx);
        vertex.push(x,y,Math.cos(a)*Math.max(.0001,rz)+z+shape(a,x,y));
        uv.push(i/segments,(y-profile[0][0])/(profile.at(-1)[0]-profile[0][0]));
        if(i<segments&&j<rows){
          const first=j*(segments+1)+i;
          tri.push(first,first+1,first+segments+1,first+1,first+segments+2,first+segments+1);
        }
      }
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute("position",new T.Float32BufferAttribute(vertex,3));
    geometry.setAttribute("uv",new T.Float32BufferAttribute(uv,2));
    geometry.setIndex(tri);
    geometry.computeVertexNormals();
    return add(group,geometry,surface);
  }

  function curve(group,surface,coords,thickness, tubular=32) {
    const points=coords.map(p=>new T.Vector3(...p));
    return add(group,new T.TubeGeometry(new T.CatmullRomCurve3(points),tubular,thickness,7,false),surface);
  }

  function clean(group) {
    const disposed=new Set();
    group.traverse(item=>{
      item.geometry?.dispose();
      if(item.material&&!disposed.has(item.material)){
        item.material.dispose();
        disposed.add(item.material);
      }
    });
    group.clear();
  }

  function faceGeometry(a) {
    return {
      width:.181+variants(a.faceWidth,.023),
      jaw:.119+variants(a.jawWidth,.028),
      chin:.003+variants(a.chin,.037),
      cheek:variants(a.cheek,.032),
      eyeY:.275+variants(a.eyeHeight,.024),
      eyePhi:.46+variants(a.eyeSpacing,.12),
      eyeWidth:.214+variants(a.eyeSize,.065),
      eyeTilt:variants(a.eyeTilt,.018),
      brow:.332+variants(a.browHeight,.023),
      arch:.012+variants(a.browArch,.01),
      noseY:.186-variants(a.noseLength,.027),
      noseWidth:.112+variants(a.noseWidth,.05),
      lipY:.116,
      lipWidth:.385+variants(a.lipWidth,.10),
      lipHeight:.029+variants(a.lipFullness,.012)
    };
  }

  function paintFace(a,f) {
    const S=768;
    const bottom=-.035;
    const top=.505;
    const X=(phi)=>S*(.5+phi/(2*Math.PI));
    const Y=(y)=>S*(top-y)/(top-bottom);
    const w=(phi)=>S*phi/(2*Math.PI);
    const h=(y)=>S*y/(top-bottom);
    const skin=palette("skin",a.skin);
    paint.fillStyle=skin;
    paint.fillRect(0,0,S,S);
    const layer=(color,alpha,fn)=>{
      paint.save();
      paint.globalAlpha=clamp(alpha);
      paint.fillStyle=paint.strokeStyle=color;
      fn();
      paint.restore();
    };
    function haze(phi,y,rx,ry,color,alpha) {
      paint.save();
      paint.translate(X(phi),Y(y));
      paint.scale(w(rx),h(ry));
      const blend=paint.createRadialGradient(0,0,0,0,0,1);
      blend.addColorStop(0,color);
      blend.addColorStop(1,color+"00");
      paint.globalAlpha=clamp(alpha);
      paint.fillStyle=blend;
      paint.fillRect(-1,-1,2,2);
      paint.restore();
    }
    function ellipse(phi,y,rx,ry) {
      paint.beginPath();
      paint.ellipse(X(phi),Y(y),w(rx),h(ry),0,0,Math.PI*2);
      paint.fill();
    }
    function line(points,width) {
      paint.beginPath();
      paint.moveTo(X(points[0][0]),Y(points[0][1]));
      points.slice(1).forEach(([x,y])=>paint.lineTo(X(x),Y(y)));
      paint.lineWidth=width;
      paint.lineJoin=paint.lineCap="round";
      paint.stroke();
    }
    function eyePath(center,side) {
      const left=center-f.eyeWidth, right=center+f.eyeWidth;
      const tilt=f.eyeTilt*side;
      const y=f.eyeY;
      paint.beginPath();
      paint.moveTo(X(left),Y(y-tilt));
      paint.bezierCurveTo(X(center-.12),Y(y+.025),X(center+.09),Y(y+.031),X(right),Y(y+tilt));
      paint.bezierCurveTo(X(center+.10),Y(y-.019),X(center-.11),Y(y-.022),X(left),Y(y-tilt));
      paint.closePath();
    }
    const blushColor=a.customBlush||palette("blush",a.blush);
    const shadowColor=a.customShadow||palette("shadow",a.shadow);
    const lipColor=a.customLip||palette("lip",a.lip);
    for (const side of [-1,1]) {
      const phi=f.eyePhi*side;
      // Under-eye brightener
      haze(phi,.244,.22,.024,"#fff1e4",(a.undereye||0)/230);
      // Contour sculpting (cheekbone hollow & jaw)
      haze(.72*side,.175,.34,.034,"#4a2a22",(a.contour||0)/175);
      haze(.68*side,.085,.32,.028,"#4a2a22",(a.contour||0)/220);
      // Warm bronzer (temple & perimeter)
      haze(.86*side,.325,.36,.048,"#8c5234",(a.bronzer||0)/190);
      // Blush placement
      if (a.blushPlacement==="draped") {
        haze(.74*side,.238,.36,.038,blushColor,a.blushIntensity/105);
      } else if (a.blushPlacement==="sunkissed") {
        haze(.52*side,.205,.35,.04,blushColor,a.blushIntensity/110);
        haze(0,.205,.24,.025,blushColor,a.blushIntensity/165);
      } else {
        haze(.61*side,.205,.38,.043,blushColor,a.blushIntensity/110);
      }
      haze(.54*side,.228,.25,.024,"#ffd9ba",a.highlight/224);
      const shadow=palette("shadow",a.shadow);
      if(a.shadowShape==="halo"){
        haze(phi-side*.16,f.eyeY+.025,.16,.045,shadow,a.shadowIntensity/105);
        haze(phi+side*.16,f.eyeY+.026,.20,.046,shadow,a.shadowIntensity/100);
        haze(phi,f.eyeY+.039,.095,.029,"#f2c4ad",a.shadowIntensity/175);
      }else if(a.shadowShape==="smoke"){
        haze(phi+side*.11,f.eyeY+.025,.36,.054,shadow,a.shadowIntensity/93);
        haze(phi,f.eyeY-.008,.27,.023,shadow,a.shadowIntensity/235);
      }else{
        haze(phi,f.eyeY+.027,.29,.049,shadow,a.shadowIntensity/105);
      }
      haze(.93*side,.137,.32,.08,"#673449",.16);
      layer("#49303a",.78,()=>{eyePath(phi,side);paint.fill();});
      paint.save();
      eyePath(phi,side);
      paint.clip();
      layer("#fff2e7",1,()=>ellipse(phi,f.eyeY+.001,.32,.05));
      layer(palette("iris",a.iris),1,()=>ellipse(phi,f.eyeY+.002,.100,.023));
      layer("#261824",.9,()=>ellipse(phi,f.eyeY+.002,.047,.012));
      layer("#ffffff",.95,()=>ellipse(phi-.026,f.eyeY+.013,.025,.006));
      paint.restore();
      const edge=phi+side*f.eyeWidth;
      layer("#281b25",.38+a.liner/170,()=>{
        paint.beginPath();
        paint.moveTo(X(phi-side*f.eyeWidth),Y(f.eyeY-f.eyeTilt));
        paint.bezierCurveTo(X(phi-side*.12),Y(f.eyeY+.025),X(phi+side*.09),Y(f.eyeY+.031),X(edge),Y(f.eyeY+f.eyeTilt));
        paint.quadraticCurveTo(X(edge+side*a.liner*.00066),Y(f.eyeY+f.eyeTilt+.003),X(edge+side*a.liner*.00105),Y(f.eyeY+f.eyeTilt+a.liner*.00019));
        paint.lineWidth=1.7+a.liner*.057;
        paint.lineCap="round";
        paint.stroke();
        for(let i=0;i<7;i++){
          const t=.22+i*.115;
          const angle=phi+side*(t*2-1)*f.eyeWidth;
          const base=f.eyeY+Math.sin(t*Math.PI)*.020+f.eyeTilt*(t*2-1);
          line([[angle,base],[angle+side*(i+2)*.006,base+.004+a.lashes*.00013]],.7+a.lashes*.015);
        }
      });
      layer(palette("hairColor",a.hairColor),0.55+(a.browFill||45)/120,()=>{
        const points=[];
        for(let i=0;i<14;i++){
          const t=i/13;
          points.push([phi+side*(t-.5)*.52,f.brow+Math.sin(t*Math.PI)*f.arch-t*.007]);
        }
        line(points,3.2);
      });
      layer("#502837",.67,()=>ellipse(side*f.noseWidth*.67,f.noseY-.014,f.noseWidth*.24,.005));
    }
    haze(0,.242,.087,.084,"#ffdbc2",.12+a.highlight/400);
    haze(0,.156,.17,.030,"#8f4e4b",.13);
    haze(0,.071,.32,.031,"#ffcaa7",a.highlight/420);
    const center=f.lipY;
    const size=f.lipHeight;
    layer(lipColor,.30+a.lipIntensity*.0068,()=>{
      paint.beginPath();
      paint.moveTo(X(-f.lipWidth),Y(center));
      paint.bezierCurveTo(X(-f.lipWidth*.5),Y(center+size),X(-.076),Y(center+size*.85),X(0),Y(center+size*.53));
      paint.bezierCurveTo(X(.076),Y(center+size*.85),X(f.lipWidth*.5),Y(center+size),X(f.lipWidth),Y(center));
      paint.bezierCurveTo(X(f.lipWidth*.49),Y(center-size),X(-f.lipWidth*.49),Y(center-size),X(-f.lipWidth),Y(center));
      paint.fill();
      if((a.lipLiner||0)>5){
        paint.strokeStyle="#471d29";
        paint.lineWidth=1.2+(a.lipLiner||0)/45;
        paint.stroke();
      }
    });
    layer("#5a2e3b",.76,()=>line([[-f.lipWidth,center],[-f.lipWidth*.48,center-.002],[0,center-.006],[f.lipWidth*.48,center-.002],[f.lipWidth,center]],2.1));
    haze(-.08,center-size*.46,.19,.007,"#ffcfca",a.finish==="gloss"?.76:a.finish==="satin"?.28:.08);
    layer("#6d3b32",(1-a.coverage*.007)*.65,()=>{
      for(let i=0;i<a.freckles;i++){
        const phi=Math.sin(i*23.12)*.89;
        const y=.204+Math.cos(i*12.17)*.026+(1-Math.abs(phi))*.023;
        ellipse(phi,y,.005+i%4*.003,.001+i%3*.0008);
      }
    });
    texture.needsUpdate=true;
  }

  function head(group,a,skin,neckTop,pose) {
    const f=faceGeometry(a);
    paintFace(a,f);
    const pivot=new T.Group();
    pivot.position.y=neckTop-.013;
    pivot.rotation.y=pose==="turn"?-.37:pose==="angle"?-.2:0;
    pivot.rotation.z=pose==="angle"?-.085:pose==="hip"?.05:0;
    group.add(pivot);
    const profile=[[-.035,.027,.039,.026],[f.chin+.037,f.jaw*.74,.106,.006],[.107,f.jaw,.133,0],
      [.165,f.width*.86+f.cheek,.142,0],[.23,f.width+f.cheek*.6,.155,-.005],[.30,f.width,.153,0],
      [.367,f.width*.98,.158,-.013],[.426,f.width*.86,.147,-.025],[.479,f.width*.57,.107,-.029],[.505,.003,.006,-.032]];
    rings(pivot,material("#ffffff",.52,0,texture),profile,(angle,x,y)=>{
      const forward=Math.pow(Math.max(0,Math.cos(angle)),4);
      const eye=gaussian(Math.abs(angle)-f.eyePhi,y-f.eyeY,.26,.034);
      return forward*(.034*gaussian(angle,y-f.noseY,f.noseWidth*1.15,.034)
        +.022*gaussian(angle,y-f.noseY-.036,f.noseWidth*.85,.072)
        -.020*eye+.026*gaussian(angle,y-f.lipY,.33,.029)
        +.024*gaussian(Math.abs(angle)-.52,y-.217,.30,.047));
    },96,8);
    for(const side of [-1,1]){
      oval(pivot,skin,side*f.width*.973,.193,-.024,.034,.062,.026);
      if(a.jewelry!=="none"){
        const gold=material(a.jewelry==="pearl"?"#eac9be":"#e0ad66",.29,.63);
        if(a.jewelry==="hoops"){
          add(pivot,new T.TorusGeometry(.031,.004,10,30),gold,[side*(f.width+.009),.124,-.002]);
        }else{
          oval(pivot,gold,side*(f.width+.012),.156,.003,.014,.016,.013);
          if(a.jewelry==="drop") oval(pivot,gold,side*(f.width+.012),.123,.003,.01,.026,.01);
        }
      }
    }
    makeHair(pivot,a,f.width);
  }

  function makeHair(group,a,width) {
    const color=new T.Color(palette("hairColor",a.hairColor));
    const sideColor=material(color.clone().multiplyScalar(.82),.43);
    const shine=material(color.clone().lerp(new T.Color("#ba8873"),.18),.36);
    const x=width*1.16;
    const crown=.263;
    const hairDepth=.221;
    const cut=a.hair;
    const cap=new T.BufferGeometry();
    const coords=[],indices=[];
    const rows=30,cols=72;
    for(let row=0;row<=rows;row++){
      for(let col=0;col<=cols;col++){
        const phi=(col/cols-.5)*Math.PI*2;
        const front=Math.max(0,Math.cos(phi));
        const edge=1.17+(1-front)*.99+Math.sin(phi*2)*front*.19;
        const t=Math.max(.003,row/rows)*edge;
        coords.push(x*Math.sin(phi)*Math.sin(t),.29+crown*Math.cos(t),-.022+hairDepth*Math.cos(phi)*Math.sin(t));
        if(row<rows&&col<cols){
          const i=row*(cols+1)+col;
          indices.push(i,i+cols+1,i+1,i+1,i+cols+1,i+cols+2);
        }
      }
    }
    cap.setAttribute("position",new T.Float32BufferAttribute(coords,3));
    cap.setIndex(indices);
    cap.computeVertexNormals();
    add(group,cap,sideColor);
    if(cut==="bun"||cut==="pony"){
      oval(group,sideColor,0,.435,-.214,.132,.117,.105);
      if(cut==="pony"){
        for(let i=0;i<15;i++){
          const offset=(i-7)*.012;
          curve(group,i%5===0?shine:sideColor,[[offset,.44,-.225],[offset+.09,.36,-.26],[offset+.11,.16,-.31],[offset+.07,-.12,-.29]],.022);
        }
      }
    }
    if(cut==="waves"||cut==="bob"||cut==="braids"||cut==="coils"){
      for(const side of [-1,1]){
        for(let i=0;i<12;i++){
          const offset=i*.012;
          const end=cut==="bob"?.066:cut==="coils"?.055:-.15-(i%4)*.032;
          const z=-.12+offset*.88;
          if(cut==="coils"){
            for(let j=0;j<6;j++){
              oval(group,(i+j)%5===0?shine:sideColor,side*(x*.73+Math.sin(i*4+j)*.026+Math.sin(j*.43)*.052),.35-j*.051,z,.044,.046,.041);
            }
          }else{
            const thickness=cut==="braids"?.016:.026;
            curve(group,i%4===0?shine:sideColor,[[side*(x*.65-offset*.35),.435,z-.02],[side*(x+offset*.14),.299,z],[side*(x*.94+offset*.34),.10,z+.027],[side*(x*1.13+offset*.40),end,z+.04]],thickness);
            if(cut==="braids"){
              for(let j=0;j<12;j++){
                const t=j/12;
                oval(group,j%3===0?shine:sideColor,side*(x*(.95+t*.22)+offset*.26+Math.sin(j*2.4)*.014),.279+(end-.279)*t,z+.018+.03*t,.016,.026,.018);
              }
            }
          }
        }
      }
    }
    for(let i=0;i<28;i++){
      const phi=-2.6+i*.19;
      const points=[];
      for(let j=0;j<11;j++){
        const t=.09+j*.098;
        const twist=phi+.18*(1-t);
        points.push([(x+.001)*Math.sin(twist)*Math.sin(t),.291+(crown+.001)*Math.cos(t),-.021+(hairDepth+.002)*Math.cos(twist)*Math.sin(t)]);
      }
      curve(group,i%3===0?shine:sideColor,points,cut==="pixie"?.0045:.0025,16);
    }
  }

  function outfit(group,a,pose,walk) {
    const skin=material(palette("skin",a.skin),.72);
    const color=new T.Color(palette("fabricColor",a.fabricColor));
    const fabric=material(color,a.fabric==="satin"?.29:a.fabric==="metallic"?.32:.74,a.fabric==="metallic"?.62:a.fabric==="satin"?.17:0);
    const trim=material(color.clone().lerp(new T.Color("#eec9bd"),.31),.5,.19);
    const shade=material(color.clone().multiplyScalar(.60),.65);
    const shoe=material(a.shoes==="nude"?"#b17f70":a.shoes==="silver"?"#b7a7bf":"#2c2231",.31,.30);
    const id=a.garment;
    const pants=["suit","casual","coat","street","woven","resort","y2k","barong","tux","vest","blazer","pleat_pant","wrap_suit","hoodie","varsity","crochet","denim_set","track","monochrome","tunic","batik","embroidered","cyber","sculpt","vinyl"].includes(id);
    const sleeves=["suit","coat","street","casual","barong","bomber","cape","tux","trench","blazer","wrap_suit","hoodie","varsity","denim_set","knit","track","tunic","poplin","kimona","vinyl"].includes(id);
    const hipY=1.33+variants(a.height,.15)-variants(a.torso,.10);
    const waistY=hipY+.22;
    const shoulderY=1.995+variants(a.height,.20)+variants(a.torso,.075);
    const bustY=shoulderY-.21;
    const neckTop=shoulderY+.164+variants(a.neck,.061);
    const shoulders=.277+variants(a.shoulders,.065);
    const hips=.224+variants(a.hips,.065);
    const waist=.167+variants(a.waist,.061);
    const bust=.155+variants(a.bust,.047);
    const arm=.064+variants(a.arm,.022);
    const leg=.105+variants(a.leg,.036);
    const calf=.076+variants(a.calf,.027);

    rings(group,skin,[[shoulderY-.14,.197,.121,0],[shoulderY-.045,shoulders,.123,0],[shoulderY+.012,.20,.101,0],[shoulderY+.063,.088,.079,0],[neckTop+.038,.085,.081,0]]);
    const bodiceTop=sleeves?shoulderY-.006:id==="terno"?shoulderY-.078:id==="column"?shoulderY-.21:shoulderY-.135;
    const skirtBottom={slip:.22,column:.68,terno:.10,petal:.14,flare:.23,gala:.12,bomber:.76,sequin:.14,mermaid:.10,tulle:.12,cape:.18,halter:.16,corset:.11,cocktail:.56,trench:.52,pencil:.58,sundress:.48,knit:.44,sheath:.46,asym:.36,poplin:.54,tube:.18,piña:.24,inabel:.42,linen_wrap:.46,metallic_mini:.74,mesh:.14,feather:.50,drape_asym:.26}[id]??hipY-.06;
    const skirtWidth={slip:.235,column:.215,terno:.46,petal:.39,flare:.49,gala:.44,bomber:.23,sequin:.23,mermaid:.38,tulle:.50,cape:.30,halter:.27,corset:.48,cocktail:.25,trench:.26,pencil:.21,sundress:.32,knit:.22,sheath:.215,asym:.26,poplin:.28,tube:.22,piña:.34,inabel:.28,linen_wrap:.30,metallic_mini:.22,mesh:.42,feather:.29,drape_asym:.36}[id]??hips+.025;
    const profile=id==="coat"?[[hipY-.40,hips+.065,.169,0],[hipY-.08,hips+.046,.164,0],[hipY+.035,hips+.025,.158,0]]:
      id==="street"?[[hipY-.09,hips+.065,.178,0],[hipY+.035,hips+.059,.167,0]]:
      pants?[[hipY-.13,hips+.013,.145,0],[hipY+.035,hips+.021,.155,0]]:[
      [skirtBottom,skirtWidth,skirtWidth*.55,0],[(skirtBottom+hipY)*.5,(skirtWidth+hips)*.51,skirtWidth*.24+.075,0],
      [hipY-.09,hips+.026,.155,0],[hipY+.065,hips+.012,.157,0]];
    profile.push([waistY,waist+(id==="street"?.092:id==="coat"?.039:.012),id==="street"?.149:.112,0],
      [bustY,shoulders*.76,bust,0],[bodiceTop,sleeves?shoulders+.009:shoulders*.69,.119,0]);
    const folds=(p,x,y)=>{
      const skirt=Math.max(0,Math.min(1,(hipY-y)/.7));
      const gather=(id==="flare"||id==="tulle"||id==="corset")?0.042:(id==="petal"||id==="feather")?0.058:(id==="terno"||id==="gala"||id==="mermaid"||id==="mesh"||id==="drape_asym")?0.026:0.012;
      return Math.cos(p)*(Math.sin(p*(id==="flare"?24:9)+y*2)*gather*skirt +.010*Math.sin(p*7)*(1-skirt));
    };
    rings(group,fabric,profile,folds);
    if(id==="slip"||id==="flare"){
      for(const s of [-1,1]){
        curve(group,trim,[[s*shoulders*.65,bustY+.011,bust*.89],[s*shoulders*.68,shoulderY-.012,.092],[s*shoulders*.64,shoulderY,.002],[s*shoulders*.66,bodiceTop-.04,-.103]],.008);
      }
    }
    if(sleeves){
      for(const s of [-1,1]){
        const lapel= id==="suit"||id==="coat";
        curve(group,trim,lapel?[[s*.087,shoulderY-.017,.103],[s*.152,bustY+.05,.126],[s*.107,bustY-.01,bust*.94],[s*.031,waistY+.06,.125]]:
          [[s*.115,shoulderY-.014,.10],[s*.08,shoulderY-.048,.115],[0,shoulderY-.058,.126]],lapel?.016:.009);
      }
      if(id==="coat"||id==="suit"||id==="barong"){
        for(let i=0;i<4;i++) oval(group,trim,0,waistY+.08-i*.082,.15,.017,.017,.007);
      }
    }
    if(["terno","woven","petal","flare"].includes(id)){
      for(const side of [-1,1]){
        if(id==="terno"||id==="petal"){
          const sleeve=oval(group,fabric,side*(shoulders+.04),shoulderY-.05,.007,id==="terno"?.105:.19,id==="terno"?.19:.106,.123);
          sleeve.rotation.z=side*-.32;
          for(let i=0;i<5;i++){
            const x=side*(shoulders-.036+i*.034);
            curve(group,trim,[[x,shoulderY-.165,.075],[x+side*.025,shoulderY-.036,.129],[x+side*.021,shoulderY+.069,.083]],.004);
          }
        }
      }
      if(id==="woven"||id==="terno"){
        for(let i=0;i<9;i++){
          const y=skirtBottom+.055+i*(id==="woven"?.035:.057);
          if(y>=hipY+.05) break;
          const ring=[];
          for(let j=0;j<=50;j++){
            const p=j/50*Math.PI*2;
            const r=id==="woven"?hips+.018:skirtWidth+(hips-skirtWidth)*(y-skirtBottom)/(hipY-skirtBottom);
            ring.push([Math.sin(p)*r,y+Math.sin(p*20)*.005,Math.cos(p)*(id==="woven"?.153:r*.57+.008)]);
          }
          if(id==="woven") curve(group,trim,ring,.005,64);
        }
      }
    }

    if(a.belt!=="none"){
      const belt=material(a.belt==="chain"?"#deaf76":"#302232",.43,a.belt==="chain"?.65:0);
      rings(group,belt,[[waistY-.015,waist+.023,.133,0],[waistY+.021,waist+.026,.131,0]]);
      oval(group,trim,0,waistY,.137,.033,.022,.009);
    }
    const rig=[];
    for(const side of [-1,1]){
      const shoulder=[side*(shoulders-.025),shoulderY-.064,0];
      const akimbo=(pose==="hip"&&side===1)||(pose==="turn"&&side===-1);
      const elbow=[side*(shoulders+(akimbo?.25:.073)),shoulderY-.40,akimbo?.065:-walk*.09*side];
      const hand=[side*(akimbo?waist+.041:hips+.105),akimbo?waistY+.034:hipY-.08,akimbo?.123:.012+walk*.15*side];
      const sleeveMat=sleeves?fabric:skin;
      const armPivot=new T.Group();
      const armParts=new T.Group();
      armPivot.position.set(...shoulder);
      armParts.position.copy(armPivot.position).negate();
      armPivot.add(armParts);
      group.add(armPivot);
      limb(armParts,sleeveMat,elbow,shoulder,[[0,arm*.68,arm*.65],[.35,arm*.86,arm*.86],[.79,arm*1.04,arm],[1,arm*.78,arm*.84]]);
      limb(armParts,sleeves&&id!=="casual"?fabric:skin,hand,elbow,[[0,arm*.43,arm*.40],[.35,arm*.56,arm*.59],[.78,arm*.75,arm*.70],[1,arm*.70,arm*.66]]);
      oval(armParts,sleeves&&id!=="casual"?fabric:skin,...elbow,arm*.68,arm*.70,arm*.67);
      const palm=oval(armParts,skin,...hand,.040,.064,.028);
      palm.rotation.z=side*.045;
      oval(armParts,skin,hand[0]-side*.033,hand[1]-.012,hand[2]+.01,.012,.036,.016).rotation.z=-side*.31;
      const step=(pose==="stride"?.22:pose==="angle"?.08:0)+walk*.28;
      const thigh=[side*hips*.55,hipY+.10,0];
      const knee=[side*hips*.51,hipY*.55,step*side*.60+.012];
      const ankle=[side*hips*.58,.109,step*side];
      const legMat=pants?fabric:skin;
      const legPivot=new T.Group();
      const legParts=new T.Group();
      legPivot.position.set(...thigh);
      legParts.position.copy(legPivot.position).negate();
      legPivot.add(legParts);
      group.add(legPivot);
      rig.push({side,armPivot,legPivot,pants});
      limb(legParts,legMat,knee,thigh,[[0,leg*.65,leg*.62],[.36,leg*.82,leg*.83],[.72,leg,leg*.95],[1,leg*.98,leg*.92]]);
      limb(legParts,legMat,ankle,knee,[[0,pants?calf*.79:calf*.48,calf*.56],[.34,calf*.76,calf*.71],[.71,calf,calf*.84],[1,leg*.66,leg*.63]]);
      oval(legParts,shoe,ankle[0],.06,ankle[2]+.057,.057,.053,a.shoes==="boots"?.126:.109);
      oval(legParts,legMat,...knee,leg*.62,leg*.61,leg*.60);
      if(a.shoes==="boots") oval(legParts,shoe,ankle[0],.16,ankle[2],calf*.74,.132,.063);
      if(a.nails!=="bare"){
        const nails=material(a.nails==="red"?"#a9264f":"#e6c2bd",.23);
        for(let i=0;i<4;i++){
          oval(armParts,nails,hand[0]+(i-1.5)*.014,hand[1]-.046,hand[2]+.026,.005,.014,.004);
        }
      }
    }
    head(group,a,skin,neckTop,pose);
    return {neckTop,rig};
  }

  function backdrop(kind,hub) {
    clean(world);
    const tone={studio:hub.color,runway:"#39233e",shoot:"#574357",press:"#51384d",hotel:"#6e4859",dinner:"#593444",party:"#392349",flight:"#414967"}[kind]??hub.color;
    scene.background=new T.Color(tone);
    scene.fog=new T.FogExp2(tone,.093);
    const floor=material(kind==="runway"?"#49354d":"#61485e",.51,.16);
    const disc=add(world,new T.CircleGeometry(12,64),floor,[0,-.028,0]);
    disc.rotation.x=-Math.PI/2;
    const groundShadow=document.createElement("canvas");
    groundShadow.width=groundShadow.height=128;
    const c=groundShadow.getContext("2d");
    const fade=c.createRadialGradient(64,64,4,64,64,63);
    fade.addColorStop(0,"#231520a6");
    fade.addColorStop(1,"#23152000");
    c.fillStyle=fade;
    c.fillRect(0,0,128,128);
    const shadowTexture=new T.CanvasTexture(groundShadow);
    const shadow=add(world,new T.PlaneGeometry(1.9,1.5),new T.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}),[0,-.01,0]);
    shadow.rotation.x=-Math.PI/2;
    shadow.geometry.addEventListener("dispose",()=>shadowTexture.dispose());
    const wall=material(tone);
    const glow=new T.MeshBasicMaterial({color:kind==="flight"?0xc9d7ff:0xf5bbd4});
    if(kind==="flight"||kind==="hotel"){
      if(kind==="hotel"){
        const linen=material("#e0c5cc");
        const headboard=material("#6b394e");
        add(world,new T.BoxGeometry(1.49,.30,1.41),headboard,[-.97,.16,-1.10]);
        add(world,new T.BoxGeometry(1.45,.14,1.38),linen,[-.97,.37,-1.10]);
        add(world,new T.BoxGeometry(1.49,.88,.12),headboard,[-.97,.61,-1.82]);
        for(const side of [-1,1]) oval(world,linen,-.97+side*.33,.47,-1.57,.29,.07,.22);
      }
      for(let i=-2;i<=2;i++){
        const x=i*1.37;
        add(world,new T.BoxGeometry(1.19,2.2,.1),wall,[x,1.51,-1.82]);
        const portal=oval(world,glow,x,1.82,-1.75,.43,.68,.055);
        if(kind==="hotel") portal.scale.set(.47,.76,.05);
        if(kind==="flight"){
          const seat=material("#635274");
          add(world,new T.BoxGeometry(.47,.14,.49),seat,[x,.47,-1.32]);
          const seatBack=add(world,new T.BoxGeometry(.48,.81,.12),seat,[x,.865,-1.56]);
          seatBack.rotation.x=.15;
          add(world,new T.BoxGeometry(.56,.06,.07),wall,[x,.43,-1.12]);
        }else if(i>0){
          add(world,new T.BoxGeometry(.49,.41,.47),material("#51354a"),[x,.21,-1.23]);
          oval(world,glow,x,.65,-1.23,.149,.12,.15);
        }
      }
    }else if(kind==="runway"){
      add(world,new T.BoxGeometry(1.65,.05,12),material("#87667f",.3,.32),[0,0,0]);
      for(let i=0;i<8;i++){
        for(const side of [-1,1]){
          add(world,new T.BoxGeometry(.035,.027,.45),glow,[side*.78,.037,-3+i*.75]);
          oval(world,wall,side*(1.19+i%2*.28),.8,-3+i*.72,.16,.40,.14);
          oval(world,wall,side*(1.19+i%2*.28),1.22,-3+i*.72,.10,.14,.1);
        }
      }
    }else{
      for(let i=-3;i<=3;i++){
        add(world,new T.BoxGeometry(.026,4,.05),i%3===0?glow:wall,[i*.83,2,-1.86]);
      }
      if(kind==="dinner"||kind==="party"){
        for(const side of [-1,1]){
          oval(world,material("#a37186"),side*1.27,.70,-1.28,.47,.046,.32);
          add(world,new T.CylinderGeometry(.045,.09,.69,14),wall,[side*1.27,.35,-1.28]);
          for(let i=0;i<4;i++) oval(world,glow,side*1.27+i*.1-.15,.81,-1.27,.026,.069,.027);
        }
      }
    }
  }

  let cachedAvatar, cachedScene, character, shift=0;
  function draw(a, options) {
    const {frame="full",pose="front",hub,kind="studio",walking=0,travel=0}=options;
    const sceneKey=kind+hub.city;
    if(sceneKey!==cachedScene){
      backdrop(kind,hub);
      cachedScene=sceneKey;
    }
    const key=JSON.stringify([a,pose]);
    if(key!==cachedAvatar){
      clean(model);
      character=outfit(model,a,pose,0);
      cachedAvatar=key;
    }
    const {neckTop:neck,rig}=character;
    for(const {side,armPivot,legPivot,pants} of rig){
      const stride=kind==="runway"?Math.sin(walking*Math.PI*8)*side:0;
      legPivot.rotation.x=stride*(pants?.23:.085);
      armPivot.rotation.x=-stride*.14;
    }
    const angle={front:0,hip:-.20,turn:1.02,stride:-.31,angle:.38}[pose];
    model.rotation.y=angle+shift+Math.sin(walking*10)*.16;
    model.rotation.z=Math.sin(walking*20)*.026;
    model.position.set(0,.035+Math.abs(Math.sin(walking*18))*.022,walking*.5);
    const eye=frame==="beauty"?neck+.25:frame==="mid"?neck-.16:1.33;
    camera.position.set(0,eye+.07,frame==="beauty"?1.32:frame==="mid"?2.84:5.62);
    camera.lookAt(0,eye,0);
    if(kind==="flight") world.position.x=Math.sin(travel*Math.PI)*.24;
    else world.position.x=0;
    renderer.render(scene,camera);
  }

  return {draw,rotate(degrees){shift+=degrees*Math.PI/180;},resetRotation(){shift=0;}};
}
