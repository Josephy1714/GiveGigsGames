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

const expandedBookings = {
  nyc: [
    ["Brooklyn denim test","Casting","Casual","Show the casting team how the denim reads in a headshot, profile and full-body frame.",0,155,10],
    ["Chelsea gallery portrait","Shoot","Minimal","Keep the silhouette clean against the gallery’s white walls and shift your weight on cue.",14,295,16],
    ["Midtown evening salon","Fitting","Evening","Check the sample’s ease at the shoulder and how the hem falls after a turn.",28,405,21],
    ["Queens textile story","Shoot","Craft","Let the light skim the woven fabric and give the photographer a clear view of the seams.",34,475,25],
    ["Lower East Side runway","Runway","Casual","Keep your pace steady on a short runway with the audience close to both sides.",56,660,32],
    ["Independent magazine roundtable","Press","Tailored","Talk through the team’s decisions and keep embargoed collection details private.",82,820,40]
  ],
  mnl: [
    ["Makati clean casting","Casting","Minimal","An agency needs a short set of natural-light digitals before a client meeting.",0,155,10],
    ["Ortigas tailoring catalogue","Shoot","Tailored","Show the jacket closed, then give the photographer a full-length frame in motion.",14,300,16],
    ["Pasay occasionwear fitting","Fitting","Evening","Help the atelier check that the sample settles cleanly after a turn.",28,405,21],
    ["Marikina makers editorial","Shoot","Craft","Use each frame to show how the hand-finished textile changes as you move.",34,475,25],
    ["Bonifacio Global City show","Runway","Minimal","Walk long, evenly spaced marks for an understated capsule collection.",56,660,32],
    ["Manila atelier conversation","Press","Craft","Introduce the creative team and use the atelier’s approved material credits.",82,820,40]
  ],
  lax: [
    ["Culver City agency test","Casting","Minimal","Give the casting desk clear, repeatable angles for the callback file.",30,420,20],
    ["Arts District studio fitting","Fitting","Tailored","Check jacket movement before a long day of standing marks.",38,460,23],
    ["Venice boardwalk catalogue","Shoot","Casual","Keep the styling relaxed and land each stride on the still photographer’s mark.",46,545,28],
    ["Downtown gallery presentation","Runway","Editorial","Hold the closing pose until the house photographer clears the shot.",58,625,31],
    ["West Hollywood evening shoot","Shoot","Evening","Work around a fixed pool of light without hiding the neckline.",72,710,35],
    ["Pacific design interview","Press","Craft","Explain the material story in terms the design team has cleared for publication.",86,795,40]
  ],
  sin: [
    ["Tanjong Pagar casting","Casting","Minimal","Create clear digitals in neutral light before the agency’s morning review.",42,460,24],
    ["Raffles Place fitting","Fitting","Tailored","Check whether the lightweight jacket still sits flat when you turn.",50,520,26],
    ["East Coast resort images","Shoot","Casual","Use small, repeatable shifts so the resort pieces stay visible in each frame.",58,585,29],
    ["Joo Chiat textile portrait","Shoot","Craft","Give the photographer a clear look at the garment’s woven panels.",66,665,32],
    ["Marina Bay evening show","Runway","Evening","Follow the lighting cues across a presentation staged for eveningwear buyers.",84,790,38],
    ["Design district press call","Press","Editorial","Speak about your collaboration while the team prepares for the next press slot.",96,845,42]
  ],
  ldn: [
    ["Soho casting book","Casting","Minimal","The agency wants current digitals to pair with your editorial portfolio.",65,535,26],
    ["Savile Row sample fitting","Fitting","Tailored","Help the cutter see how the sample moves at the shoulder and waist.",73,630,31],
    ["Peckham daytime editorial","Shoot","Casual","Match the photographer’s cues for a story about off-duty silhouettes.",81,690,34],
    ["South Bank craft campaign","Shoot","Craft","Keep the garment edges visible so the hand finishing reads across the set.",91,750,38],
    ["Mayfair evening presentation","Runway","Evening","Hit the turning mark and let the fabric come to rest before moving on.",105,900,45],
    ["Independent fashion desk interview","Press","Editorial","Credit the makers and describe one concrete decision from the presentation.",122,970,48]
  ],
  tyo: [
    ["Aoyama agency digitals","Casting","Minimal","Work through a compact neutral shot list for a visiting casting director.",75,570,29],
    ["Daikanyama studio fitting","Fitting","Tailored","Give the fitter precise feedback so the sample can go straight to the set.",84,670,33],
    ["Kuramae textile story","Shoot","Craft","Follow an angled lighting setup that brings out the woven texture.",94,765,38],
    ["Ginza salon presentation","Runway","Evening","Time each cue on a narrow floor built for an intimate audience.",108,920,46],
    ["Harajuku layered portrait","Shoot","Editorial","Keep the silhouette readable while showing the photographer different angles.",120,975,48],
    ["Tokyo design press interview","Press","Casual","Discuss how the creative team planned the movement for the streetwear story.",136,1050,51]
  ],
  mil: [
    ["Porta Venezia casting","Casting","Minimal","Create clean agency frames before a week of showroom appointments.",105,665,34],
    ["Brera tailoring fitting","Fitting","Tailored","Show how the suit rests after a turn and flag any restricted movement.",115,760,39],
    ["Navigli collection portrait","Shoot","Casual","Give the photographer crisp full-body frames for a relaxed capsule.",126,860,43],
    ["Tortona textile presentation","Runway","Craft","Build in the marked pause so buyers have time to study the textile.",140,1040,52],
    ["Evening accessories campaign","Shoot","Evening","Keep the neckline and accessories visible across a three-frame sequence.",152,1125,55],
    ["Milan collection briefing","Press","Editorial","Describe what changed between the fitting and final presentation.",174,1250,60]
  ],
  par: [
    ["Left Bank casting","Casting","Minimal","Give a visiting casting team fresh digitals before the couture appointments.",150,820,40],
    ["Marais silhouette fitting","Fitting","Tailored","Check the sample before the studio sends it to the buyers’ presentation.",162,935,46],
    ["Canal Saint-Martin lookbook","Shoot","Casual","Use clean, unfussy poses for a daylight collection shoot.",175,1020,51],
    ["Rive Gauche textile editorial","Shoot","Craft","Let the camera see the fabric’s construction and how it hangs in motion.",188,1175,56],
    ["Palais evening salon","Runway","Evening","Keep your pace on the long opening walk and hold the finale mark.",205,1450,67],
    ["Couture week cover interview","Press","Editorial","Reflect on the week and distinguish your own fitting experience from the house’s story.",225,1575,73]
  ]
};
for (const [city, bookings] of Object.entries(expandedBookings)) jobs[city].push(...bookings);

presets.push(
  ["Peach diffusion",{coverage:31,blush:2,blushIntensity:54,shadow:3,shadowIntensity:19,liner:10,lashes:36,lip:7,lipIntensity:48,finish:"satin"}],
  ["Jade halo",{coverage:47,shadow:5,shadowShape:"halo",shadowIntensity:79,liner:24,lashes:58,lip:9,lipIntensity:34,finish:"gloss"}],
  ["Crimson lacquer",{coverage:49,blush:0,blushIntensity:23,shadow:3,shadowIntensity:21,liner:50,lashes:64,lip:4,lipIntensity:94,finish:"gloss"}],
  ["Cobalt graphic",{coverage:44,shadow:7,shadowShape:"smoke",shadowIntensity:61,liner:85,linerStyle:"graphic",lashes:57,lip:9,lipIntensity:31,finish:"satin"}],
  ["Pearl portrait",{coverage:32,shadow:3,shadowIntensity:48,highlight:76,liner:13,lashes:33,lip:1,lipIntensity:32,finish:"satin"}],
  ["Terracotta warmth",{coverage:39,bronzer:63,blush:1,blushPlacement:"sunkissed",blushIntensity:59,shadow:1,shadowIntensity:28,liner:21,lashes:44,lip:3,lipIntensity:65,finish:"matte"}],
  ["Plum drape",{coverage:54,blush:3,blushPlacement:"draped",blushIntensity:76,shadow:0,shadowIntensity:50,liner:43,lashes:56,lip:6,lipIntensity:77,finish:"satin"}],
  ["Bare softbox",{coverage:20,undereye:22,browFill:24,shadowIntensity:4,blushIntensity:9,liner:2,lashes:20,lip:9,lipIntensity:17,finish:"satin"}],
  ["Emerald smoke",{coverage:55,shadow:6,shadowShape:"smoke",shadowIntensity:83,liner:48,lashes:74,lip:3,lipIntensity:49,finish:"matte"}],
  ["Bronze tightline",{coverage:36,bronzer:43,shadow:1,shadowIntensity:64,liner:39,linerStyle:"tight",lashes:48,lip:7,lipIntensity:45,finish:"gloss"}],
  ["Oxblood velvet",{coverage:62,contour:43,shadow:9,shadowIntensity:44,liner:37,lashes:57,lip:5,lipIntensity:96,finish:"matte"}],
  ["Petal gloss",{coverage:29,blush:4,blushIntensity:65,shadow:3,shadowIntensity:31,highlight:54,liner:8,lashes:36,lip:1,lipIntensity:68,finish:"gloss"}]
);
const marketFittings = {
  nyc: [
    ["A stylist wants to check the jacket under flash.",["Try the jacket in the agreed lighting setup","Change the camera settings yourself","Assume daylight is close enough"],0],
    ["The sample hem catches on a shoe during the turn.",["Walk faster over it","Show the dresser where it catches","Trim it before the next take"],1],
    ["The showroom requests one more fit check.",["Book a full extra day","Send an unapproved fitting photo","Confirm the remaining adjustment and call time"],2]
  ],
  mnl: [
    ["An occasionwear sample feels tight with both arms raised.",["Flatten the sleeves","Show the fitter the movement that causes the pull","Change into a different sample unasked"],1],
    ["The stylist wants to use an unconfirmed credit on the fitting notes.",["Make up a short credit","Skip all credits","Ask the atelier for the approved maker credit"],2],
    ["Two fitting times are listed for the Pasay appointment.",["Confirm the current time with the dresser","Pick the later time without checking","Ask the model next to you to decide"],0]
  ],
  lax: [
    ["A wardrobe supervisor needs the jacket to match yesterday’s photos.",["Check the continuity reference with wardrobe","Style the jacket differently for variety","Skip the reference and guess"],0],
    ["The fitting room has a taped stand-in mark.",["Move it closer to the mirror","Use the mark so the team can compare angles","Leave the marked area for every check"],1],
    ["The shoot may include a long stretch of standing.",["Commit without testing the shoes","Trade shoes with another model","Test the shoes and flag comfort issues early"],2]
  ],
  sin: [
    ["A lightweight sample folds at the shoulder when you turn.",["Ask the cutter to watch that movement","Cover the fold with your hand","Pull the seam flat without checking"],0],
    ["The fitting moves from air conditioning to an outdoor mark.",["Change the styling after stepping outside","Check the fabric in both conditions with the team","Skip the outdoor check"],1],
    ["The team wants a photo of an unreleased sample.",["Share a public preview","Send it to your own contacts","Use the team’s approved private channel"],2]
  ],
  ldn: [
    ["The cutter wants to see how the sleeve hangs at rest.",["Raise both elbows","Let your arms rest naturally","Hold the cuff taut"],1],
    ["A shoulder pad shifts on the second turn.",["Ignore it until the show","Remove it yourself","Repeat the motion and show the cutter"],2],
    ["The shop asks how the button stance reads seated.",["Sit and stand on cue so they can compare","Judge it only from the hanger","Button every opening without asking"],0]
  ],
  tyo: [
    ["The fitter requests the same short turn twice.",["Repeat the same turn and tempo","Improvise a different pose","Take longer so the fitter gets more time"],0],
    ["The sample has a removable layer with an unfamiliar fastening.",["Pull until it opens","Ask the fitter to demonstrate the fastening","Hide the fastening under your hand"],1],
    ["The studio wants a reference for the return fitting.",["Keep it only on your personal phone","Write down a guessed sample number","Confirm the sample label with the studio team"],2]
  ],
  mil: [
    ["A cutter asks which side pulls during the turn.",["Say both sides are identical","Show the tighter side and repeat the turn","Ask them to remove all shaping"],1],
    ["The showroom has several similar jackets on the rack.",["Choose the closest color","Move all the tags to one rail","Check the sample number with wardrobe"],2],
    ["The fitter wants to see the trouser break in the assigned shoes.",["Change into the assigned shoes before checking","Lift the hem while they look","Judge the length barefoot"],0]
  ],
  par: [
    ["The studio is checking how the silhouette reads as you sit.",["Sit on the marked chair and report any pull","Change the chair height without telling the team","Stay standing to protect the garment"],0],
    ["An unfinished fastening needs support for the fitting photo.",["Secure it yourself","Wait for the dresser to secure it","Turn so the fastening is hidden"],1],
    ["A buyer preview follows the fitting.",["Take the sample into the hallway","Share the unfinished sample photo","Confirm which version the team is showing"],2]
  ]
};
const marketEvents = {
  nyc: {name:"Brooklyn portfolio table",style:"Casual",cost:30,energy:9,prompt:"A stylist has offered to review one sequence of contact sheets.",options:[["Ask which frame tells the clearest story",8,16],["Compare notes with other new models",4,24],["Ask about the styling credits",6,8]]},
  mnl: {name:"Makati makers reception",style:"Craft",cost:35,energy:10,prompt:"A designer is introducing collaborators from a locally made collection.",options:[["Ask how the makers want to be credited",10,16],["Meet the sample room team",5,24],["Ask how the fabrics handle under lights",7,8]]},
  lax: {name:"Studio lot wrap",style:"Tailored",cost:40,energy:10,prompt:"Wardrobe and production are winding down after a commercial shoot.",options:[["Thank wardrobe and share one continuity note",11,16],["Trade contact details with the production desk",5,24],["Ask about upcoming lifestyle castings",8,8]]},
  sin: {name:"Orchard retail preview",style:"Minimal",cost:45,energy:11,prompt:"A buyer asks how you would present a capsule collection on a small floor.",options:[["Describe a clear walk and stopping mark",12,16],["Meet the visual merchandising team",6,24],["Ask which piece anchors the collection",9,8]]},
  ldn: {name:"East London press breakfast",style:"Editorial",cost:48,energy:11,prompt:"Editors and emerging designers are sharing plans for the next season.",options:[["Ask a designer how they developed a silhouette",13,16],["Swap details with the editorial assistants",6,24],["Discuss a published look with a stylist",9,8]]},
  tyo: {name:"Aoyama studio mixer",style:"Casual",cost:48,energy:11,prompt:"A photographer is showing two edits of a street-style story.",options:[["Compare how the edits handle movement",13,16],["Meet the assistants who built the set",6,24],["Ask about the next editorial call",10,8]]},
  mil: {name:"Brera showroom reception",style:"Tailored",cost:55,energy:12,prompt:"Showroom staff are comparing the morning’s buyer presentations.",options:[["Describe where a slower turn helped show the cut",14,16],["Meet the booking and fitting team",7,24],["Ask which garments are available for tests",10,8]]},
  par: {name:"Left Bank salon reception",style:"Evening",cost:60,energy:13,prompt:"The atelier is discussing which photos capture the collection’s finish.",options:[["Explain which angle best showed the drape",15,16],["Meet the credited members of the atelier",8,24],["Ask about the next fitting calendar",11,8]]}
};
