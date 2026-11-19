"use strict";
const hair = [["Silk blowout","waves"],["Sculpted bob","bob"],["Sleek bun","bun"],["Natural coils","coils"],["High ponytail","pony"],["Box braids","braids"],["Pixie","pixie"]];
const colors = {
  skin: [["Alabaster","#fae2d8"],["Porcelain","#f6d5c5"],["Warm ivory","#eac1a5"],["Golden beige","#dba477"],["Warm olive","#cca177"],["Honey","#bd805b"],["Amber","#a9694b"],["Umber","#895339"],["Mahogany","#683f35"],["Espresso","#473031"]],
  hairColor: [["Soft black","#271b24"],["Espresso","#42262a"],["Chestnut","#784636"],["Auburn","#8f382e"],["Copper","#a45036"],["Honey blonde","#c69458"],["Platinum","#ded0af"],["Silver mist","#b8bcc6"],["Rose gold","#c98d8b"],["Orchid","#795279"],["Midnight blue","#2a3656"]],
  iris: [["Espresso","#372120"],["Amber","#a86b32"],["Hazel","#8b663d"],["Green","#57705b"],["Blue","#577886"],["Ice blue","#8ab3c9"],["Grey","#81868c"],["Violet","#6d588a"]],
  lip: [["Rosewood","#a44760"],["Ballet","#d48091"],["Coral","#de6a5a"],["Cocoa","#784349"],["Cherry","#ae244c"],["Oxblood","#68243c"],["Plum berry","#752a54"],["Peach","#d16f65"],["Espresso","#522b29"],["Bare","#ad6a63"]],
  shadow: [["Mauve","#93587c"],["Bronze","#9f694d"],["Gold leaf","#c99e52"],["Pearl","#e7c7b6"],["Graphite","#4d3d54"],["Jade","#528674"],["Emerald","#336b57"],["Cobalt","#5267b9"],["Copper","#bc6354"],["Burgundy","#7a3144"]],
  blush: [["Rose","#d36a83"],["Terracotta","#b45953"],["Apricot","#ea977a"],["Plum","#a44869"],["Petal","#e295a8"]],
  fabricColor: [["Wild orchid","#bc718f"],["Ink","#2c2838"],["Obsidian","#17141d"],["Champagne","#cfab7d"],["Jade","#418477"],["Emerald","#276956"],["Cobalt","#516ca5"],["Pearl","#e6d6d1"],["Rose quartz","#d89eb0"],["Saffron","#d29454"],["Crimson","#a73857"],["Lilac","#a597c5"]]
};
const sliderGroups = {
  Face: [["faceWidth","Face width"],["jawWidth","Jaw width"],["cheek","Cheek fullness"],["chin","Chin length"],["eyeSize","Eye size"],["eyeSpacing","Eye spacing"],["eyeTilt","Eye tilt"],["eyeHeight","Eye height"],["browHeight","Brow height"],["browArch","Brow arch"],["noseWidth","Nose width"],["noseLength","Nose length"],["lipWidth","Mouth width"],["lipFullness","Lip fullness"],["freckles","Freckles"]],
  Body: [["height","Stature"],["shoulders","Shoulder breadth"],["neck","Neck length"],["arm","Arm fullness"],["bust","Chest contour"],["waist","Waist breadth"],["hips","Hip breadth"],["torso","Torso length"],["leg","Leg fullness"],["calf","Calf fullness"]],
  Makeup: [
    ["coverage","Complexion coverage"],
    ["undereye","Under-eye brightener"],
    ["contour","Contour sculpting"],
    ["bronzer","Warm bronzer"],
    ["blushIntensity","Blush intensity"],
    ["highlight","Highlighter"],
    ["browFill","Brow definition"],
    ["shadowIntensity","Eyeshadow intensity"],
    ["liner","Eyeliner wing"],
    ["lashes","Lash volume"],
    ["lipLiner","Lip liner"],
    ["lipIntensity","Lip pigment"]
  ]
};
const garments = [
  {id:"slip",name:"Bias-cut satin",style:"Evening",tone:"#bd7896",cost:0},
  {id:"suit",name:"Studio tailoring",style:"Tailored",tone:"#706581",cost:0},
  {id:"casual",name:"Off-duty denim",style:"Casual",tone:"#6481aa",cost:0},
  {id:"column",name:"Gallery column",style:"Minimal",tone:"#c39278",cost:0},
  {id:"terno",name:"Terno evening gown",style:"Craft",tone:"#b89a67",cost:0},
  {id:"petal",name:"Sculpted petal gown",style:"Editorial",tone:"#af6294",cost:260},
  {id:"coat",name:"Architectural coat",style:"Tailored",tone:"#90576b",cost:180},
  {id:"flare",name:"Pleated organza",style:"Evening",tone:"#8974a4",cost:230},
  {id:"woven",name:"Woven co-ord",style:"Craft",tone:"#658678",cost:160},
  {id:"street",name:"Oversized streetwear",style:"Casual",tone:"#7a7ba3",cost:140}
];
const poses = [["Straight on","front"],["Hand on hip","hip"],["Over the shoulder","turn"],["Mid-stride","stride"],["Soft angle","angle"]];
const presets = [
  ["Clean casting",{coverage:25,shadowIntensity:9,liner:6,lashes:30,blushIntensity:20,highlight:20,lipIntensity:27,lip:9,shadow:3,blush:2,finish:"satin"}],
  ["Rose editorial",{coverage:56,shadowIntensity:66,liner:57,lashes:65,blushIntensity:57,highlight:53,lipIntensity:74,lip:0,shadow:0,blush:0,finish:"gloss"}],
  ["Midnight wing",{coverage:67,shadowIntensity:80,liner:91,lashes:79,blushIntensity:29,highlight:60,lipIntensity:85,lip:5,shadow:4,blush:3,finish:"matte"}],
  ["Copper light",{coverage:39,shadowIntensity:76,liner:29,lashes:54,blushIntensity:51,highlight:79,lipIntensity:66,lip:7,shadow:8,blush:2,finish:"gloss"}],
  ["Runway gold",{coverage:60,shadowIntensity:84,liner:64,lashes:72,blushIntensity:44,highlight:88,lipIntensity:58,lip:3,shadow:2,blush:1,finish:"satin"}],
  ["Berry velvet",{coverage:52,shadowIntensity:58,liner:42,lashes:68,blushIntensity:62,highlight:46,lipIntensity:92,lip:6,shadow:9,blush:3,finish:"matte"}]
];
const hubs = {
  nyc:{city:"New York",airport:"JFK",country:"United States",fare:420,gate:0,color:"#634e6f",note:"Build a book with agency digitals, showroom work and casting calls. Paid commercial work can finance your editorial portfolio."},
  mnl:{city:"Metro Manila",airport:"MNL",country:"Philippines",fare:430,gate:0,color:"#69526c",note:"Start with beauty and retail work in Makati, build relationships with independent creatives and model collections that bring local textiles into contemporary fashion."},
  lax:{city:"Los Angeles",airport:"LAX",country:"United States",fare:350,gate:30,color:"#805875",note:"Commercial castings, lifestyle campaigns and red-carpet editorial work."},
  par:{city:"Paris",airport:"CDG",country:"France",fare:620,gate:150,color:"#69536e",note:"Showroom appointments, atelier fittings and couture presentations."},
  mil:{city:"Milan",airport:"MXP",country:"Italy",fare:570,gate:105,color:"#6e534d",note:"House fittings, sharp tailoring and collection presentations."},
  tyo:{city:"Tokyo",airport:"HND",country:"Japan",fare:540,gate:75,color:"#4b5275",note:"Street-style editorials and designer presentations."},
  ldn:{city:"London",airport:"LHR",country:"United Kingdom",fare:530,gate:65,color:"#48596e",note:"Independent labels, experimental styling and fashion press."},
  sin:{city:"Singapore",airport:"SIN",country:"Singapore",fare:360,gate:42,color:"#446566",note:"Regional beauty, resort and luxury retail campaigns."}
};
const jobs = {
  nyc:[
    ["Agency digitals","Casting","Minimal","A casting assistant wants current, natural-light headshots and a plain silhouette. Follow the shot list.",0,180,14],
    ["SoHo lookbook","Shoot","Casual","A downtown label needs movement and consistency for its online storefront.",10,320,19],
    ["Garment District showroom","Fitting","Tailored","A sample fitting comes before a buyer presentation. Work through the garment notes with the dresser.",25,430,24],
    ["New York fashion week","Runway","Tailored","An independent American label is showing a precisely tailored collection. Walk the lighting marks.",45,710,36],
    ["Cover profile","Press","Editorial","A magazine wants to know how you built your book between castings and paid jobs.",72,790,42]
  ],
  mnl:[
    ["Makati beauty campaign","Shoot","Minimal","A local beauty team wants clean close-ups with skin texture visible and consistent posing.",0,190,14],
    ["Quezon City retail lookbook","Shoot","Casual","A local ready-to-wear label is photographing everyday pieces for a retail campaign.",10,310,19],
    ["Independent atelier fitting","Fitting","Craft","The designer is working with local handwoven fabric and wants to check the movement and drape.",25,420,25],
    ["Manila designer showcase","Runway","Craft","Walk a contemporary collection featuring a butterfly-sleeved terno and locally sourced textiles.",45,680,37],
    ["Designer and model interview","Press","Evening","A local editor asks what went into the collection and how the creative team worked together.",72,770,44]
  ],
  lax:[["Silver Lake lifestyle campaign","Shoot","Casual","A commercial team wants natural movement and clean product framing.",30,530,28],["Los Angeles premiere profile","Press","Evening","An entertainment reporter asks how you prepared for a red-carpet campaign.",60,650,32]],
  ldn:[["East London designer presentation","Runway","Editorial","An independent label wants sculptural shapes with pauses built into the walk.",65,800,42]],
  sin:[["Orchard beauty campaign","Shoot","Minimal","A regional campaign emphasizes polished close-ups and repeatable poses.",42,670,31]],
  tyo:[["Tokyo street-style story","Shoot","Casual","A magazine team is shooting a layered, movement-driven streetwear story.",75,850,45]],
  mil:[["Milan showroom collection","Runway","Tailored","A house is presenting sharply cut separates for international buyers.",105,980,52]],
  par:[["Paris atelier presentation","Runway","Evening","An eveningwear house is showing a collection of formal gowns to editors and clients.",150,1350,68]]
};
const events = {
  dinner: {name:"Designer dinner",style:"Evening",cost:65,energy:12,
    prompt:"At a seated dinner after the show, the designer asks what felt different about wearing the collection.",
    options:[["Describe how the garment moved and credit the atelier",13,18],["Ask a thoughtful question about the collection",9,12],["Swap contacts with the editor beside you",5,20]]},
  party:{name:"Fashion week after-party",style:"Editorial",cost:85,energy:24,
    prompt:"A photographer and a casting director are talking near the dance floor. How do you spend the evening?",
    options:[["Ask the photographer about an upcoming test shoot",12,27],["Join the designer for a group photo",10,19],["Make a brief appearance and leave before midnight",6,9]]}
};

