/* CountryGeneralizer — 36 Generalization Dimensions, Sets, Decks & Offline Vector Map */
(function (root) {
  "use strict";

  const CG = (root.CountryGeneralizerData = root.CountryGeneralizerData || {});

  CG.CATEGORIES = [
    { id: "food", name: "Food & Diet", icon: "🍲", color: "#f59e0b" },
    { id: "fauna", name: "Animal Life", icon: "🦁", color: "#ec4899" },
    { id: "flora", name: "Plants & Biomes", icon: "🌿", color: "#10b981" },
    { id: "economy", name: "Trade & Economy", icon: "📦", color: "#38bdf8" },
    { id: "demographics", name: "Demographics", icon: "👥", color: "#a78bfa" },
    { id: "infra", name: "Society & Geo", icon: "🧭", color: "#f97316" }
  ];

  // 36 distinct generalization dimensions (6 per category)
  // tier: 1 = broad evocative opener, 2 = medium specificity, 3 = sharper late clue
  CG.DIMENSIONS = [
    // Category 1: Food & Diet (6)
    { id: "staple_diet", cat: "food", label: "Staple Diet & Caloric Base", icon: "🌾", tier: 1 },
    { id: "signature_food", cat: "food", label: "Cuisine & Consumption Leader", icon: "🍽️", tier: 2 },
    { id: "meat_dairy", cat: "food", label: "Meat, Seafood & Dairy Intake", icon: "🥩", tier: 2 },
    { id: "beverages", cat: "food", label: "Beverages & Stimulants", icon: "☕", tier: 2 },
    { id: "spices_oils", cat: "food", label: "Fats, Sweeteners & Spices", icon: "🌶️", tier: 1 },
    { id: "nutrition_profile", cat: "food", label: "Caloric & Nutrition Profile", icon: "⚖️", tier: 3 },

    // Category 2: Animal Life (6)
    { id: "livestock", cat: "fauna", label: "Livestock & Domestic Herds", icon: "🐄", tier: 1 },
    { id: "wild_mammals", cat: "fauna", label: "Wild Mammals & Predators", icon: "🐆", tier: 2 },
    { id: "birds_marine", cat: "fauna", label: "Avian & Marine Life", icon: "🦅", tier: 2 },
    { id: "endemic_fauna", cat: "fauna", label: "Signature & Endemic Fauna", icon: "🦎", tier: 3 },
    { id: "fisheries_pets", cat: "fauna", label: "Fisheries & Working Animals", icon: "🐟", tier: 2 },
    { id: "biodiversity_rank", cat: "fauna", label: "Wildlife Protection & Richness", icon: "🦋", tier: 3 },

    // Category 3: Plants & Biomes (6)
    { id: "biomes", cat: "flora", label: "Dominant Biomes & Land Cover", icon: "🗺️", tier: 1 },
    { id: "top_crops", cat: "flora", label: "Leading Crops by Tonnage", icon: "🌽", tier: 1 },
    { id: "forests_timber", cat: "flora", label: "Forest Canopy & Timber Mix", icon: "🌲", tier: 2 },
    { id: "signature_flora", cat: "flora", label: "Native Plants & Cash Flora", icon: "🌺", tier: 2 },
    { id: "ag_land_water", cat: "flora", label: "Arable Land & Irrigation", icon: "💧", tier: 3 },
    { id: "climate_seasons", cat: "flora", label: "Climate & Seasonality", icon: "🌦️", tier: 1 },

    // Category 4: Trade & Economy (6)
    { id: "exports_portfolio", cat: "economy", label: "Top Export Portfolio (Tradle)", icon: "🚢", tier: 1, visual: "exports" },
    { id: "imports_profile", cat: "economy", label: "Key Import Dependencies", icon: "📥", tier: 2 },
    { id: "energy_mix", cat: "economy", label: "Electricity & Energy Mix", icon: "⚡", tier: 2 },
    { id: "gdp_income", cat: "economy", label: "GDP Per Capita & Income Tier", icon: "💰", tier: 2 },
    { id: "labor_sectors", cat: "economy", label: "Workforce & Sector Split", icon: "🏭", tier: 3 },
    { id: "minerals_resources", cat: "economy", label: "Minerals & Natural Wealth", icon: "⛏️", tier: 2 },

    // Category 5: Demographics (6)
    { id: "pop_density", cat: "demographics", label: "Population Scale & Density", icon: "🏙️", tier: 3 },
    { id: "age_median", cat: "demographics", label: "Age Structure & Median Age", icon: "👶", tier: 2 },
    { id: "urbanization", cat: "demographics", label: "Urbanization & Settlement", icon: "🏘️", tier: 2 },
    { id: "languages", cat: "demographics", label: "Linguistic Family & Tongues", icon: "🗣️", tier: 3 },
    { id: "religion_culture", cat: "demographics", label: "Religious & Belief Makeup", icon: "🕊️", tier: 3 },
    { id: "education_health", cat: "demographics", label: "Literacy & Life Expectancy", icon: "🎓", tier: 3 },

    // Category 6: Society & Geo (6)
    { id: "transport_drive", cat: "infra", label: "Roads, Rail & Driving Side", icon: "🚆", tier: 2 },
    { id: "currency_time", cat: "infra", label: "Currency, Timezones & Units", icon: "🕒", tier: 3 },
    { id: "housing_life", cat: "infra", label: "Housing & Vernacular Style", icon: "🏠", tier: 2 },
    { id: "sports_leisure", cat: "infra", label: "Sports & National Pastimes", icon: "⚽", tier: 2 },
    { id: "tech_media", cat: "infra", label: "Connectivity & Tech Footprint", icon: "📡", tier: 3 },
    { id: "geo_borders", cat: "infra", label: "Borders, Terrain & Coastline", icon: "⛰️", tier: 3 }
  ];

  CG.DIMENSION_MAP = Object.fromEntries(CG.DIMENSIONS.map((d) => [d.id, d]));

  CG.COUNTRY_SETS = [
    { id: "top100", name: "Top 100 Population", desc: "Full ranked pool of the 100 most populous countries.", badge: "Official" },
    { id: "top30", name: "Top 30 Giants", desc: "Focus on the 30 largest nations (50M+ population).", badge: "Accessible" },
    { id: "ranks31_100", name: "Challenger 31–100", desc: "Mid-sized and under-guessed nations from rank 31 to 100.", badge: "Hard" },
    { id: "americas", name: "Americas Set", desc: "North, Central & South American nations in the Top 100.", badge: "Region" },
    { id: "europe", name: "Europe Set", desc: "European nations in the Top 100.", badge: "Region" },
    { id: "asia_pacific", name: "Asia-Pacific Set", desc: "East, South, Southeast, Central Asia & Oceania.", badge: "Region" },
    { id: "africa_mena", name: "Africa & Middle East", desc: "African and Middle Eastern nations in the Top 100.", badge: "Region" }
  ];

  CG.DIMENSION_DECKS = [
    {
      id: "balanced",
      name: "Balanced Generalizer (All 36)",
      desc: "Curated progression from Tradle exports, food & biomes to fauna, demographics & geo.",
      multiplier: 1.0,
      cats: ["food", "fauna", "flora", "economy", "demographics", "infra"]
    },
    {
      id: "tradle",
      name: "Tradle Trade & Economy",
      desc: "Heavy focus on export portfolios, imports, energy, minerals, GDP & workforce.",
      multiplier: 1.05,
      cats: ["economy", "infra", "demographics"],
      preferred: ["exports_portfolio", "imports_profile", "minerals_resources", "energy_mix", "gdp_income", "labor_sectors", "top_crops", "transport_drive", "currency_time", "pop_density"]
    },
    {
      id: "bio_atlas",
      name: "Bio-Atlas: Flora & Fauna",
      desc: "Deduce the country purely from wild animals, livestock, plants, forests & climate.",
      multiplier: 1.15,
      cats: ["fauna", "flora"],
      preferred: ["biomes", "wild_mammals", "top_crops", "livestock", "signature_flora", "endemic_fauna", "birds_marine", "forests_timber", "climate_seasons", "biodiversity_rank"]
    },
    {
      id: "culture_table",
      name: "Food & Demographics",
      desc: "Staple diets, meat/dairy, drinks, age pyramids, languages, beliefs & sports.",
      multiplier: 1.1,
      cats: ["food", "demographics", "infra"],
      preferred: ["staple_diet", "beverages", "spices_oils", "signature_food", "meat_dairy", "age_median", "languages", "religion_culture", "sports_leisure", "housing_life"]
    },
    {
      id: "hardcore_blind",
      name: "Mystery Blind (Hardcore)",
      desc: "Starts with 1 obscure ecological or demographic clue only. +25% score bonus!",
      multiplier: 1.25,
      starterCount: 1,
      cats: ["fauna", "flora", "demographics", "food", "infra", "economy"]
    }
  ];

  // Lightweight offline vector coastlines (lon, lat pairs in degrees)
  // Designed for clean rendering in Equirectangular / Plate Carree projection
  CG.WORLD_LAND_POLYGONS = [
    // North America
    [[-168,66],[-161,70],[-140,70],[-125,70],[-110,72],[-95,70],[-82,64],[-78,53],[-64,60],[-55,52],[-60,46],[-67,45],[-70,42],[-75,38],[-81,31],[-80,25],[-83,29],[-89,30],[-97,26],[-96,19],[-90,21],[-87,21],[-88,16],[-83,15],[-83,10],[-78,8],[-80,7],[-85,10],[-92,14],[-105,19],[-110,24],[-117,32],[-122,38],[-124,48],[-132,55],[-145,60],[-155,57],[-166,60],[-168,66]],
    // Greenland
    [[-52,60],[-43,60],[-34,68],[-20,74],[-18,81],[-35,83],[-55,82],[-70,77],[-58,69],[-52,60]],
    // Cuba & Hispaniola
    [[-85,22],[-79,23],[-74,20],[-78,20],[-85,22]],
    [[-74,19],[-69,19],[-68,18],[-72,18],[-74,19]],
    // South America
    [[-78,9],[-72,12],[-62,10],[-50,1],[-41,-3],[-35,-6],[-39,-15],[-41,-22],[-48,-27],[-53,-34],[-58,-38],[-65,-43],[-68,-52],[-67,-55],[-74,-53],[-75,-46],[-72,-35],[-70,-20],[-77,-12],[-81,-5],[-78,2],[-78,9]],
    // Africa
    [[-17,15],[-13,28],[-6,36],[10,37],[11,33],[25,32],[33,31],[39,20],[43,12],[51,12],[45,2],[40,-5],[40,-15],[35,-24],[28,-33],[18,-35],[15,-26],[12,-15],[12,-5],[9,4],[2,6],[-8,5],[-15,11],[-17,15]],
    // Madagascar
    [[49,-12],[50,-18],[47,-25],[44,-25],[44,-17],[49,-12]],
    // Europe + Eurasia main landmass (contiguous Europe + Asia)
    [[-9,37],[-9,43],[-2,43],[-5,48],[2,51],[8,54],[8,58],[5,61],[14,68],[28,71],[42,68],[58,69],[72,73],[104,77],[135,72],[168,67],[178,65],[162,59],[156,51],[141,53],[135,44],[129,40],[126,35],[129,35],[124,40],[118,39],[122,37],[120,32],[121,24],[114,22],[108,21],[109,12],[104,10],[100,13],[104,2],[100,5],[97,16],[90,22],[85,19],[80,13],[77,8],[72,20],[68,23],[61,25],[56,26],[50,29],[56,24],[59,22],[53,16],[44,13],[39,21],[34,29],[36,36],[27,37],[26,40],[23,37],[20,39],[14,45],[18,40],[15,38],[10,44],[5,43],[0,39],[-5,36],[-9,37]],
    // UK & Ireland
    [[-6,50],[-3,51],[-5,55],[-6,58],[-2,58],[1,53],[1,51],[-6,50]],
    [[-10,52],[-6,52],[-6,55],[-9,54],[-10,52]],
    // Iceland
    [[-24,65],[-14,66],[-14,64],[-22,64],[-24,65]],
    // Sri Lanka
    [[80,9],[82,7],[81,6],[80,7],[80,9]],
    // Japan (Honshu/Hokkaido/Kyushu generalized)
    [[130,32],[135,34],[141,36],[141,41],[145,44],[140,42],[137,37],[131,34],[130,32]],
    // Taiwan
    [[120,22],[122,25],[121,22],[120,22]],
    // Philippines
    [[120,18],[123,14],[126,7],[122,7],[120,14],[120,18]],
    // Sumatra, Java, Borneo, Sulawesi
    [[95,5],[100,1],[106,-6],[102,-4],[95,5]],
    [[106,-6],[114,-8],[114,-7],[106,-6]],
    [[109,2],[118,6],[118,-3],[110,-3],[109,2]],
    [[119,1],[125,1],[122,-5],[119,-5],[119,1]],
    // New Guinea
    [[132,-2],[141,-3],[150,-10],[142,-9],[135,-5],[132,-2]],
    // Australia
    [[114,-22],[122,-17],[131,-12],[136,-12],[142,-11],[149,-20],[153,-28],[150,-37],[141,-38],[135,-34],[125,-34],[115,-34],[113,-26],[114,-22]],
    // Tasmania
    [[145,-41],[148,-41],[147,-43],[145,-43],[145,-41]],
    // New Zealand
    [[173,-35],[178,-38],[175,-41],[172,-39],[173,-35]],
    [[167,-46],[172,-43],[174,-41],[168,-44],[167,-46]]
  ];
})(typeof window !== "undefined" ? window : globalThis);
