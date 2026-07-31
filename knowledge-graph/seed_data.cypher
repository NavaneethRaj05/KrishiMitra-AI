// ── KrishiMind Knowledge Graph Seed Data ──
// Global agricultural data — applicable to farmers worldwide

// ── Crops ──
CREATE (tomato:Crop  {name:"Tomato",    season:"Kharif,Rabi", duration_days:90,  min_temp:20, max_temp:32, water_req:"Medium"})
CREATE (ragi:Crop    {name:"Ragi",      season:"Kharif",      duration_days:120, min_temp:15, max_temp:30, water_req:"Low"})
CREATE (rice:Crop    {name:"Rice",      season:"Kharif",      duration_days:150, min_temp:22, max_temp:35, water_req:"High"})
CREATE (maize:Crop   {name:"Maize",     season:"Kharif,Rabi", duration_days:100, min_temp:18, max_temp:35, water_req:"Medium"})
CREATE (cotton:Crop  {name:"Cotton",    season:"Kharif",      duration_days:180, min_temp:20, max_temp:40, water_req:"Low"})
CREATE (potato:Crop  {name:"Potato",    season:"Rabi",        duration_days:90,  min_temp:15, max_temp:25, water_req:"Medium"})
CREATE (wheat:Crop   {name:"Wheat",     season:"Rabi",        duration_days:120, min_temp:10, max_temp:25, water_req:"Low"})
CREATE (coconut:Crop {name:"Coconut",   season:"Perennial",   duration_days:365, min_temp:20, max_temp:35, water_req:"Medium"})
CREATE (soybean:Crop {name:"Soybean",   season:"Kharif",      duration_days:100, min_temp:20, max_temp:35, water_req:"Medium"})
CREATE (banana:Crop  {name:"Banana",    season:"Perennial",   duration_days:270, min_temp:22, max_temp:38, water_req:"High"})

// ── Soil Types ──
CREATE (red:SoilType     {name:"Red Soil",     ph_min:5.5, ph_max:7.0, n_content:"Low",    p_content:"Medium", k_content:"Medium"})
CREATE (black:SoilType   {name:"Black Soil",   ph_min:7.0, ph_max:8.5, n_content:"Medium", p_content:"Low",    k_content:"High"})
CREATE (alluvial:SoilType{name:"Alluvial Soil", ph_min:6.0, ph_max:8.0, n_content:"High",   p_content:"High",   k_content:"High"})
CREATE (laterite:SoilType{name:"Laterite Soil", ph_min:4.5, ph_max:6.0, n_content:"Low",    p_content:"Low",    k_content:"Low"})
CREATE (sandy:SoilType   {name:"Sandy Soil",   ph_min:5.5, ph_max:7.5, n_content:"Low",    p_content:"Low",    k_content:"Low"})
CREATE (loamy:SoilType   {name:"Loamy Soil",   ph_min:6.0, ph_max:7.5, n_content:"High",   p_content:"Medium", k_content:"Medium"})

// ── Diseases ──
CREATE (blight:Disease  {name:"Early Blight",    type:"Fungal",   severity:"High",   cause:"Alternaria solani",      affected_crop:"Tomato"})
CREATE (lblight:Disease {name:"Late Blight",     type:"Fungal",   severity:"High",   cause:"Phytophthora infestans",  affected_crop:"Tomato,Potato"})
CREATE (wilt:Disease    {name:"Fusarium Wilt",   type:"Fungal",   severity:"High",   cause:"Fusarium oxysporum",      affected_crop:"Tomato,Cotton"})
CREATE (mosaic:Disease  {name:"Leaf Mosaic",     type:"Viral",    severity:"Medium", cause:"Tobacco Mosaic Virus",    affected_crop:"Tomato"})
CREATE (blast:Disease   {name:"Rice Blast",      type:"Fungal",   severity:"High",   cause:"Magnaporthe oryzae",      affected_crop:"Rice"})
CREATE (borer:Disease   {name:"Stem Borer",      type:"Pest",     severity:"High",   cause:"Chilo suppressalis",      affected_crop:"Rice,Maize"})
CREATE (rust:Disease    {name:"Wheat Rust",      type:"Fungal",   severity:"Medium", cause:"Puccinia striiformis",    affected_crop:"Wheat"})
CREATE (grub:Disease    {name:"White Grub",      type:"Pest",     severity:"Medium", cause:"Holotrichia serrata",     affected_crop:"Ragi,Cotton"})
CREATE (faw:Disease     {name:"Fall Armyworm",   type:"Pest",     severity:"High",   cause:"Spodoptera frugiperda",   affected_crop:"Maize,Sorghum"})

// ── Pesticides / Treatments ──
CREATE (mancozeb:Pesticide  {name:"Mancozeb 75% WP",   type:"Fungicide", dosage:"2g/L water",   target:"Blight, Mildew"})
CREATE (carbend:Pesticide   {name:"Carbendazim 50% WP", type:"Fungicide", dosage:"1g/L water",   target:"Wilt, Blast"})
CREATE (imidacloprid:Pesticide {name:"Imidacloprid 70%", type:"Insecticide", dosage:"5ml/15L", target:"Aphids, Whitefly"})
CREATE (neem:Pesticide      {name:"Neem Oil 1500 PPM", type:"Biopesticide", dosage:"5ml/L water", target:"Broad spectrum"})
CREATE (emamectin:Pesticide {name:"Emamectin Benzoate 5%", type:"Insecticide", dosage:"0.4g/L", target:"Fall Armyworm, Borer"})

// ── Fertilizers ──
CREATE (urea:Fertilizer     {name:"Urea",  N:46, P:0,  K:0,  dosage:"120 kg/ha", crops:"Most crops"})
CREATE (dap:Fertilizer      {name:"DAP",   N:18, P:46, K:0,  dosage:"50 kg/ha",  crops:"Most crops"})
CREATE (mop:Fertilizer      {name:"MOP",   N:0,  P:0,  K:60, dosage:"50 kg/ha",  crops:"Potato, Cotton"})
CREATE (vermi:Fertilizer    {name:"Vermicompost", N:1.5, P:0.6, K:0.8, dosage:"2-4 t/ha", crops:"Vegetables"})

// ── Agro-Climatic Regions (Global) ──
CREATE (tropical_humid:Region    {name:"Tropical Humid",      rainfall_mm:2500, climate:"Tropical",    major_crops:"Rice,Coconut,Banana,Coffee"})
CREATE (tropical_semiarid:Region {name:"Tropical Semi-Arid",  rainfall_mm:750,  climate:"Semi-Arid",   major_crops:"Sorghum,Pearl Millet,Cotton,Groundnut"})
CREATE (subtropical:Region       {name:"Sub-Tropical",        rainfall_mm:1200, climate:"Sub-Tropical", major_crops:"Wheat,Rice,Sugarcane,Maize"})
CREATE (temperate:Region         {name:"Temperate",           rainfall_mm:700,  climate:"Temperate",   major_crops:"Wheat,Barley,Potato,Oats"})
CREATE (mediterranean:Region     {name:"Mediterranean",       rainfall_mm:500,  climate:"Mediterranean",major_crops:"Wheat,Barley,Olives,Grapes"})
CREATE (equatorial:Region        {name:"Equatorial",          rainfall_mm:3000, climate:"Equatorial",  major_crops:"Cacao,Rubber,Oil Palm,Cassava"})

// ── Relationships: Crop <-> Soil ──
CREATE (tomato)-[:GROWS_IN {suitability:"High"}]->(red)
CREATE (tomato)-[:GROWS_IN {suitability:"Medium"}]->(black)
CREATE (tomato)-[:GROWS_IN {suitability:"High"}]->(loamy)
CREATE (ragi)-[:GROWS_IN   {suitability:"High"}]->(red)
CREATE (ragi)-[:GROWS_IN   {suitability:"Medium"}]->(laterite)
CREATE (rice)-[:GROWS_IN   {suitability:"High"}]->(alluvial)
CREATE (rice)-[:GROWS_IN   {suitability:"High"}]->(black)
CREATE (cotton)-[:GROWS_IN {suitability:"High"}]->(black)
CREATE (potato)-[:GROWS_IN {suitability:"High"}]->(alluvial)
CREATE (potato)-[:GROWS_IN {suitability:"High"}]->(loamy)
CREATE (wheat)-[:GROWS_IN  {suitability:"High"}]->(alluvial)
CREATE (wheat)-[:GROWS_IN  {suitability:"Medium"}]->(black)
CREATE (maize)-[:GROWS_IN  {suitability:"High"}]->(red)
CREATE (maize)-[:GROWS_IN  {suitability:"Medium"}]->(alluvial)
CREATE (coconut)-[:GROWS_IN {suitability:"High"}]->(laterite)
CREATE (coconut)-[:GROWS_IN {suitability:"Medium"}]->(alluvial)
CREATE (soybean)-[:GROWS_IN {suitability:"High"}]->(alluvial)
CREATE (soybean)-[:GROWS_IN {suitability:"Medium"}]->(loamy)
CREATE (banana)-[:GROWS_IN  {suitability:"High"}]->(alluvial)
CREATE (banana)-[:GROWS_IN  {suitability:"Medium"}]->(loamy)

// ── Relationships: Crop <-> Disease ──
CREATE (tomato)-[:VULNERABLE_TO {frequency:"High"}]->(blight)
CREATE (tomato)-[:VULNERABLE_TO {frequency:"Medium"}]->(wilt)
CREATE (tomato)-[:VULNERABLE_TO {frequency:"Medium"}]->(mosaic)
CREATE (tomato)-[:VULNERABLE_TO {frequency:"High"}]->(lblight)
CREATE (potato)-[:VULNERABLE_TO {frequency:"High"}]->(lblight)
CREATE (rice)-[:VULNERABLE_TO   {frequency:"High"}]->(blast)
CREATE (rice)-[:VULNERABLE_TO   {frequency:"Medium"}]->(borer)
CREATE (maize)-[:VULNERABLE_TO  {frequency:"High"}]->(borer)
CREATE (maize)-[:VULNERABLE_TO  {frequency:"High"}]->(faw)
CREATE (wheat)-[:VULNERABLE_TO  {frequency:"Medium"}]->(rust)
CREATE (ragi)-[:VULNERABLE_TO   {frequency:"Low"}]->(grub)
CREATE (cotton)-[:VULNERABLE_TO {frequency:"Medium"}]->(wilt)
CREATE (cotton)-[:VULNERABLE_TO {frequency:"High"}]->(grub)

// ── Relationships: Disease <-> Treatment ──
CREATE (blight)-[:TREATED_BY  {stage:"Early"}]->(mancozeb)
CREATE (lblight)-[:TREATED_BY {stage:"Early"}]->(mancozeb)
CREATE (wilt)-[:TREATED_BY    {stage:"Preventive"}]->(carbend)
CREATE (blast)-[:TREATED_BY   {stage:"Early"}]->(carbend)
CREATE (borer)-[:TREATED_BY   {stage:"Active"}]->(imidacloprid)
CREATE (faw)-[:TREATED_BY     {stage:"Active"}]->(emamectin)
CREATE (mosaic)-[:TREATED_BY  {stage:"Prevention"}]->(neem)

// ── Relationships: Region <-> Crop ──
CREATE (tropical_humid)-[:HISTORICALLY_GROWS]->(rice)
CREATE (tropical_humid)-[:HISTORICALLY_GROWS]->(coconut)
CREATE (tropical_humid)-[:HISTORICALLY_GROWS]->(banana)
CREATE (tropical_semiarid)-[:HISTORICALLY_GROWS]->(cotton)
CREATE (tropical_semiarid)-[:HISTORICALLY_GROWS]->(maize)
CREATE (subtropical)-[:HISTORICALLY_GROWS]->(wheat)
CREATE (subtropical)-[:HISTORICALLY_GROWS]->(rice)
CREATE (temperate)-[:HISTORICALLY_GROWS]->(wheat)
CREATE (temperate)-[:HISTORICALLY_GROWS]->(potato)
CREATE (equatorial)-[:HISTORICALLY_GROWS]->(banana)

// ── Relationships: Crop <-> Fertilizer ──
CREATE (tomato)-[:NEEDS {timing:"Basal"}]->(dap)
CREATE (tomato)-[:NEEDS {timing:"Top-dress"}]->(urea)
CREATE (rice)-[:NEEDS   {timing:"Basal"}]->(dap)
CREATE (rice)-[:NEEDS   {timing:"Top-dress"}]->(urea)
CREATE (potato)-[:NEEDS {timing:"Basal"}]->(mop)
CREATE (cotton)-[:NEEDS {timing:"Top-dress"}]->(urea)
CREATE (ragi)-[:NEEDS   {timing:"Basal"}]->(vermi)
CREATE (soybean)-[:NEEDS {timing:"Basal"}]->(dap)

// ── Schemes (Global / India National) ──
CREATE (pmkisan:Scheme {id:"pm_kisan", name:"PM-KISAN", benefit:"INR 6,000/year", land_holding_max_acres:5})
CREATE (pmfby:Scheme {id:"pmfby", name:"PM Fasal Bima Yojana", benefit:"Crop Loss Insurance"})
CREATE (tomato)-[:COVERED_BY]->(pmfby)
CREATE (rice)-[:COVERED_BY]->(pmfby)

// ── Generic Market Node ──
CREATE (local_mandi:Mandi {id:"local_mandi", name:"Local APMC / Mandi", district:"User's Region"})
CREATE (tomato)-[:TRADED_AT]->(local_mandi)
CREATE (rice)-[:TRADED_AT]->(local_mandi)

// ── Generic Agri Input Dealer ──
CREATE (dealer1:InputDealer {id:"dealer_1", name:"Local Agri Inputs", district:"User's Region"})
CREATE (mancozeb)-[:AVAILABLE_AT]->(dealer1)
CREATE (neem)-[:AVAILABLE_AT]->(dealer1)

// ── Community Peer Practices ──
CREATE (practice1:LocalPractice {id:"lp_1", description:"Using diluted buttermilk spray for mild blight"})
CREATE (practice1)-[:EFFECTIVE_AGAINST]->(blight)
CREATE (practice2:LocalPractice {id:"lp_2", description:"Using neem cake at 250 kg/ha at sowing for soil-borne pests"})
CREATE (practice2)-[:EFFECTIVE_AGAINST]->(grub)
