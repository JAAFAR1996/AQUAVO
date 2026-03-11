/**
 * Veterinary Knowledge Base for Fish Disease RAG
 * 
 * مكتبة المعرفة البيطرية - مبنية على:
 * - "Fish Disease: Diagnosis and Treatment" — Dr. Edward J. Noga
 * - "Handbook of Fish Diseases" — Dieter Untergasser
 * - Merck Veterinary Manual — Aquatic Section
 * - "Fish Medicine" — Dr. Michael K. Stoskopf
 */

export interface KnowledgeChunk {
  id: string;
  title: string;
  category: 'parasitic' | 'bacterial' | 'fungal' | 'viral' | 'environmental' | 'nutritional' | 'diagnostic' | 'treatment' | 'pharmacology';
  content: string;
  keywords: string[];
}

/**
 * Comprehensive veterinary knowledge chunks for RAG retrieval
 * Each chunk focuses on a specific clinical topic
 */
export const VET_KNOWLEDGE_CHUNKS: KnowledgeChunk[] = [
  // ═══════════ PARASITIC DISEASES ═══════════
  {
    id: "ich-advanced",
    title: "Ichthyophthirius multifiliis — Advanced Diagnostics",
    category: "parasitic",
    content: `Ich (White Spot Disease) is caused by the ciliated protozoan Ichthyophthirius multifiliis. Life cycle: trophont (feeding stage on fish, 3-7 days) → tomont (reproductive cyst, up to 28 days at low temps) → theront (free-swimming infective stage, survives 48-96h). CRITICAL: Only the theront stage is susceptible to treatment. Treatment must last 2 full life cycles (10-14 days at 25°C) to ensure all stages are killed. Dosing: Malachite Green 0.05-0.1 mg/L continuously, or Copper sulfate 0.15-0.25 mg/L (monitor with test kit). Combine with heat (30°C) to accelerate life cycle. Formalin 25 ppm as short bath. WARNING: Scaleless fish (loaches, catfish) — use half dose of malachite green. Salt (NaCl) 2-3 ppt can prevent theront attachment.`,
    keywords: ["ich", "white spot", "بقع بيضاء", "نقط بيضاء", "احتكاك", "ملح", "malachite", "copper", "protozoan"]
  },
  {
    id: "velvet-advanced",
    title: "Oodinium/Piscinoodinium — Velvet Disease Clinical Guide",
    category: "parasitic",
    content: `Velvet disease is caused by dinoflagellate parasites: Piscinoodinium pillulare (freshwater) and Amyloodinium ocellatum (marine). Unlike Ich, Velvet parasites are photosynthetic — they contain chloroplasts. DIAGNOSTIC: Use oblique flashlight in dark room; affected fish show gold/rusty dust appearance. Often missed until advanced stage because spots are much finer than Ich. Life cycle is 10-14 days. Treatment: Copper sulfate 0.15-0.25 mg/L for 21 days (marine: therapeutic copper level = 0.15-0.20 ppm free copper). Freshwater alternative: Chloroquine phosphate 10 mg/L for 21 days. CRITICAL: Complete darkness accelerates treatment (parasite depends on photosynthesis). Raise temperature to 28-30°C to speed up life cycle. Salt 2-3 ppt adjunct. Marine fish: copper is standard treatment. Remove invertebrates before copper treatment.`,
    keywords: ["velvet", "مخملية", "oodinium", "golden dust", "غبار ذهبي", "ذهبي", "copper", "chloroquine", "photosynthetic"]
  },
  {
    id: "hexamita-hith",
    title: "Hexamita/Spironucleus — Hole in the Head Disease",
    category: "parasitic",
    content: `HITH (Hole in the Head / Lateral Line Erosion) has multifactorial etiology. Primary: Hexamita/Spironucleus diplomonad flagellates (gut parasites). Contributing: poor diet (lack of vitamin C & D), activated carbon filtration (removes trace elements), high nitrate levels (>40 ppm), stress. Most common in Cichlids (Discus, Oscars, Angels) and marine tangs/surgeonfish. DIAGNOSTIC: Pitting/erosion on head and lateral line, white stringy feces, loss of appetite, darkening coloration. Treatment protocol: Metronidazole 250mg/10 gallons in water OR 50mg/kg in medicated food for 5-10 days. Remove activated carbon during treatment. Supplement with vitamins (spirulina, fresh veggies). Lower nitrates below 20 ppm. Marine HLLE: discontinue carbon filtration, add trace elements, improve diet with nori/spirulina.`,
    keywords: ["hexamita", "hole in head", "ثقب الرأس", "lateral line", "خط جانبي", "hith", "hlle", "cichlid", "discus", "metronidazole", "براز ابيض"]
  },
  {
    id: "gill-skin-flukes",
    title: "Monogenean Trematodes — Gill & Skin Flukes",
    category: "parasitic",
    content: `Gill flukes (Dactylogyrus spp.) are oviparous (egg-laying) — requires repeated treatments. Skin flukes (Gyrodactylus spp.) are viviparous (live-bearing). DIAGNOSTIC: Gill flukes: rapid opercula movement, gasping at surface, clamped fins, gill hyperplasia (thickened gills). Confirm with gill biopsy under microscope (10-40x). Skin flukes: excess mucus, bluish-gray skin, flashing/scratching. Treatment: Praziquantel (PraziPro) 2.5 mg/L as single 24h bath — most effective and safest. For resistant cases: Formalin 25 ppm for 1 hour bath. Repeat praziquantel at day 7 for Dactylogyrus (eggs are drug-resistant). Single treatment usually sufficient for Gyrodactylus (no egg stage). Organophosphates (Trichlorfon) only as last resort — toxic.`,
    keywords: ["gill flukes", "skin flukes", "ديدان الخياشيم", "ديدان الجلد", "dactylogyrus", "gyrodactylus", "praziquantel", "لهث", "خياشيم", "مخاط"]
  },
  // ═══════════ BACTERIAL DISEASES ═══════════
  {
    id: "columnaris-clinical",
    title: "Columnaris (Flavobacterium columnare) — Clinical Protocol",
    category: "bacterial",
    content: `Columnaris is caused by Flavobacterium columnare (Gram-negative rod). Can kill within 24-48 hours in acute form. DIAGNOSTIC: Saddleback lesion (white patch on dorsum behind dorsal fin is pathognomonic), mouth fungus (white cotton-like growth NOT fungal), ragged fins with white edge, gill necrosis. Differentiating from true fungus: Columnaris patches are denser and more structured, true fungus is fluffy/hairy. CRITICAL: Columnaris thrives in warm water (>20°C) — LOWER temperature to 20-22°C (opposite of Ich treatment!). Treatment: Kanamycin 50mg/L + Nitrofurazone 38mg/L (synergistic combination). Alternative: Oxytetracycline 10-50mg/L. External: Potassium permanganate 2-4 mg/L dip. Prevention: avoid overcrowding, reduce organic load, maintain temperature below 26°C in vulnerable species.`,
    keywords: ["columnaris", "قطنية", "cotton mouth", "saddleback", "flavobacterium", "kanamycin", "بقع بيضاء", "فم", "mouth"]
  },
  {
    id: "dropsy-clinical",
    title: "Dropsy (Ascites) — Pathology and Management",
    category: "bacterial",
    content: `Dropsy is NOT a disease but a SYMPTOM of organ failure (usually kidney). The characteristic pinecone scale appearance (lepidorthosis) indicates fluid accumulation in the body cavity (ascites). Etiology: Aeromonas hydrophila infection, kidney failure, liver disease, viral (Spring Viremia of Carp). PROGNOSIS: Very poor (mortality >80%). By the time scales are raised, there is significant internal organ damage. TREATMENT PROTOCOL (attempt only in early stages): 1) Isolate immediately in hospital tank. 2) Epsom salt (MgSO4) 1 tablespoon/5 gallons — acts as osmotic diuretic. 3) Kanamycin 50mg/L or Enrofloxacin if available. 4) Fast for 2-3 days, then offer medicated food. 5) Daily 25% water changes. 6) Monitor for 14 days. IMPORTANT: If pinecone appearance is bilateral and severe, euthanasia should be considered humanely.`,
    keywords: ["dropsy", "استسقاء", "pinecone", "صنوبرة", "bloat", "انتفاخ", "قشور منتفخة", "kidney", "aeromonas", "ascites"]
  },
  {
    id: "fin-rot-progression",
    title: "Fin Rot — Stages and Progressive Treatment",
    category: "bacterial",
    content: `Fin rot is caused by opportunistic Gram-negative bacteria (Pseudomonas, Aeromonas, Flavobacterium) that take advantage of stress/injury. STAGES: Stage 1 (Mild): White/transparent edges on fins. Treatment: 50% water change + aquarium salt 1 tsp/gallon + stress coat. Stage 2 (Moderate): Ragged fins with red/inflamed base, visible tissue loss. Treatment: Erythromycin 200mg/10 gallons for 5 days OR Kanamycin 250mg/5 gallons. Stage 3 (Severe/Body Rot): Rot reached fin base, possible body involvement. Treatment: Combination therapy Kanamycin + Nitrofurazone. Hospital tank mandatory. If untreated, progresses to septicemia (system infection) which is often fatal. Key: Address root cause (water quality, aggression, stress) or reinfection is inevitable. Fin regrowth takes 4-8 weeks in optimal conditions.`,
    keywords: ["fin rot", "tail rot", "تعفن الزعانف", "زعانف ممزقة", "erythromycin", "kanamycin", "حواف بيضاء", "احمرار"]
  },
  {
    id: "fish-tuberculosis",
    title: "Mycobacteriosis (Fish TB) — Zoonotic Risk",
    category: "bacterial",
    content: `ZOONOTIC WARNING: Mycobacterium marinum can infect humans through open wounds! Always wear waterproof gloves. Fish TB (Mycobacteriosis) is caused by Mycobacterium marinum, M. fortuitum, M. chelonae. Chronic, slowly progressive disease. DIAGNOSTIC: Chronic weight loss (wasting) despite eating, spinal curvature (kyphosis/scoliosis), skin ulcers that don't heal, exophthalmia (pop-eye), granulomas in internal organs. Most common in livebearers, gouramis, bettas, tetras. NO EFFECTIVE TREATMENT: Antibiotics (Rifampicin, Isoniazid) are rarely effective and can develop resistance. MANAGEMENT: Euthanize confirmed cases. Disinfect tank with bleach (1:10) for 1 hour. Quarantine all tankmates for 6 months. Do NOT breed from affected stock. Consider full tank restart in severe cases. HUMAN INFECTION: Fish handler's disease — granulomatous skin lesion on hands/arms. Seek medical attention and inform doctor about fish exposure.`,
    keywords: ["tuberculosis", "سل سمكي", "mycobacterium", "wasting", "هزال", "قرح", "spinal curve", "انحناء", "zoonotic", "granuloma"]
  },
  // ═══════════ ENVIRONMENTAL ═══════════
  {
    id: "nitrogen-cycle-toxicity",
    title: "Nitrogen Cycle Toxicity — Ammonia, Nitrite, Nitrate",
    category: "environmental",
    content: `AMMONIA (NH3/NH4+): Toxic at >0.02 ppm (un-ionized NH3). Higher pH = more toxic (pH 7.0: 1% toxic NH3; pH 8.0: 10% toxic NH3). Symptoms: red/inflamed gills, gasping at surface, lethargy, chemical burns, rapid death. EMERGENCY: 75% water change + double dose Seachem Prime (binds ammonia for 48h) + add established filter media. NITRITE (NO2-): Toxic at >0.1 ppm. Binds hemoglobin → methemoglobin (Brown Blood Disease). Symptoms: brown/chocolate colored gills, lethargy, gasping. Treatment: 50% water change + NaCl 1-3 g/L (chloride ions competitively inhibit nitrite uptake at gills) + Seachem Prime. NITRATE (NO3-): Chronic toxicity >40 ppm (>20 ppm in sensitive species). Weakens immune system gradually. Symptoms: loss of color, poor growth, infertility, susceptibility to disease. Treatment: Regular water changes to maintain <20 ppm. Live plants help absorb nitrate.`,
    keywords: ["ammonia", "أمونيا", "nitrite", "نيتريت", "nitrate", "نيترات", "nitrogen cycle", "دورة نيتروجين", "خياشيم حمراء", "لهث", "brown blood", "prime"]
  },
  {
    id: "ph-shock-comprehensive",
    title: "pH Crash and Shock — Prevention and Emergency Response",
    category: "environmental",
    content: `pH shock occurs when fish are exposed to rapid pH changes (>0.3 units/day). Common causes: large water change without matching pH, CO2 system malfunction (planted tanks), KH depletion (pH crash), adding unbuffered RO water. SYMPTOMS: Immediate: erratic swimming, jumping, gasping, loss of equilibrium. If survived: clamped fins, pale/darkened color, excess mucus, secondary infections. EMERGENCY PROTOCOL: 1) STOP any water change in progress. 2) Match new water pH to tank water pH before adding. 3) Adjust pH by maximum 0.3 units per day. 4) Acidic crash (pH <6): Add sodium bicarbonate (baking soda) 1 tsp/10 gallons, check KH. 5) Alkaline spike (pH >8.5): Partial water change with matched, slightly acidic water. 6) Add StressCoat/StressGuard for slime coat protection. PREVENTION: Monitor KH (maintain >4 dKH), test pH before and after water changes, use pH buffers in soft water tanks.`,
    keywords: ["ph", "shock", "صدمة", "ph crash", "أس هيدروجيني", "kh", "buffer", "قفز", "سباحة غير طبيعية", "baking soda"]
  },
  // ═══════════ PHARMACOLOGY ═══════════
  {
    id: "medication-contraindications",
    title: "Fish Medication Contraindications and Interactions",
    category: "pharmacology",
    content: `COPPER-BASED MEDICATIONS: Contraindicated in: ALL invertebrates (shrimp, snails, crabs), loaches, scaleless catfish (Corydoras, Pleco, Otocinclus), stingrays, elephant nose fish, African butterfly fish. Copper accumulates in substrate — can leach for months. MALACHITE GREEN: Half dose for scaleless fish. Teratogenic and possibly carcinogenic — wear gloves. Never use in food fish. FORMALIN: Highly oxygen-depleting — always provide maximum aeration during treatment. Never use above 29°C. Toxic in soft, acidic water. METRONIDAZOLE: May damage beneficial filter bacteria. Remove activated carbon, but keep biological filter running. Safe for invertebrates. ERYTHROMYCIN: Destroys nitrifying bacteria — monitor ammonia/nitrite spikes during and after treatment. Dose: 200mg/10 gallons every 24h for 5 days. POTASSIUM PERMANGANATE: Extremely narrow therapeutic index. Never exceed 4 mg/L. Neutralize with hydrogen peroxide if overdosed. Stains everything purple. ANTIBIOTIC COMBINATIONS: Kanamycin + Nitrofurazone = synergistic (good). Do NOT combine Erythromycin + Kanamycin (antagonistic).`,
    keywords: ["copper", "نحاس", "malachite", "formalin", "metronidazole", "erythromycin", "medication", "دواء", "تحذير", "contraindication", "scaleless", "invertebrate", "corydoras", "pleco", "snail"]
  },
  {
    id: "salt-therapy",
    title: "Aquarium Salt (NaCl) Therapy — Comprehensive Guide",
    category: "treatment",
    content: `Aquarium salt (NaCl) is one of the safest and most effective treatments. MECHANISM: Creates osmotic pressure that helps fish maintain internal fluids against parasites, reduces nitrite toxicity by competing at gill chloride cells, promotes slime coat production, kills many freshwater parasites. DOSAGE LEVELS: Level 1 (preventive/stress): 1 tablespoon/5 gallons (1 g/L). Level 2 (mild parasites, fin rot): 1 tablespoon/3 gallons (3 g/L). Level 3 (ich, velvet, external parasites): 1 tablespoon/gallon (5 g/L). Salt dip (extreme cases): 1 tablespoon/quart for 30 seconds to 5 minutes — watch fish closely, remove if distressed. CONTRAINDICATED: Plants (most will die above 1 g/L). Scaleless fish (use half dose). Corydoras (sensitive). IMPORTANT: Salt does NOT evaporate — only remove via water changes. Dissolve completely before adding to tank. Use only pure NaCl (no iodine, no anti-caking agents).`,
    keywords: ["salt", "ملح", "nacl", "osmotic", "ملح مائي", "احتكاك", "slime coat", "parasite", "nitrite", "therapeutic"]
  },
  // ═══════════ DIAGNOSTIC TECHNIQUES ═══════════
  {
    id: "visual-diagnosis-guide",
    title: "Visual Diagnosis Key — Symptom-to-Disease Mapping",
    category: "diagnostic",
    content: `VISUAL SYMPTOM MAPPING: White spots (salt-like): Ich (most common), Epistylis (on dead tissue), Lymphocystis (cauliflower-like, larger). Gold/rusty dust: Velvet (Oodinium) — shine flashlight at angle. White cotton/fluff on body: TRUE FUNGUS (Saprolegnia) if fluffy/hairy; COLUMNARIS if flat/saddleback. Red streaks in fins: Bacterial septicemia (Aeromonas), fin rot (secondary). Pinecone scales: Dropsy (kidney failure) — CRITICAL. Bloated belly (no pinecone): Internal parasites, egg-bound, constipation, internal tumor. Protruding eye(s): Pop-eye — one eye = trauma; both eyes = systemic infection. Faded/lost color: Stress, Neon Tetra Disease (tetras), background adaptation, illness, old age. White stringy feces: Hexamita, internal parasites, bacterial enteritis. Black spots: Black spot disease (Neascus), healing ammonia burns, melanophore response to injury. Raised scales in patches: Bacterial infection (not dropsy if localized). Spine curvature: TB (chronic), Lightning Strike Disease (acute), vitamin deficiency, old age. Film over eyes: Bacterial infection, nutritional deficiency, Chlorine damage, flukes.`,
    keywords: ["diagnosis", "symptom", "أعراض", "بقع", "لون", "عيون", "زعانف", "انتفاخ", "احمرار", "mapping", "visual", "تشخيص بصري"]
  },
  {
    id: "species-disease-susceptibility",
    title: "Species-Specific Disease Susceptibility Guide",
    category: "diagnostic",
    content: `BETTAS (Siamese Fighting Fish): Most susceptible to fin rot (long fins trap bacteria), velvet (kept in unfiltered bowls), swim bladder disorder, constipation. GOLDFISH/KOI: Ich (temperature fluctuations), swim bladder disorder (fancy varieties), dropsy, fungal infections, anchor worms (outdoor ponds), KHV (koi). DISCUS: Hexamita/HITH (most common), gill flukes, bacterial infections (very sensitive to water quality), Discus plague (unknown etiology). TETRAS/RASBORAS: Neon Tetra Disease (Pleistophora — no cure), columnaris, ich. CICHLIDS (African): Malawi bloat (overeating, wrong diet — treat with Metronidazole), HITH, aggression injuries. GUPPIES/LIVEBEARERS: Columnaris (Guppy disease), internal parasites (Camallanus worms — treat with Levamisole), fin rot. CORYDORAS: Very sensitive to medications (use half dose of everything), vulnerable to bacterial infections from gravel injuries. PLECOS: Starvation (often underfed), ich, sensitive to copper and malachite green. MARINE CLOWNFISH: Brooklynella (clownfish disease — freshwater dip + Formalin), Velvet (Amyloodinium — copper).`,
    keywords: ["species", "betta", "goldfish", "discus", "tetra", "cichlid", "guppy", "corydoras", "pleco", "clownfish", "susceptible", "vulnerable", "نوع", "سلالة"]
  },
  {
    id: "water-quality-disease-link",
    title: "Water Quality Parameters and Disease Correlation",
    category: "environmental",
    content: `DISEASE-WATER MATRIX: High ammonia (>0.5 ppm): Triggers bacterial infections (fin rot, ulcers), gill damage → susceptibility to parasites. High nitrite (>0.25 ppm): Brown blood disease, immune suppression → fungal/bacterial secondary infections. High nitrate (>40 ppm): HITH in cichlids, immune suppression, stunted growth, reproductive issues. Low pH (<6.0): Acidosis — excess mucus, gill damage, stress. Most medications less effective. High pH (>8.5): Alkalosis — gill damage, increased ammonia toxicity (un-ionized NH3 increases with pH). Low oxygen (<5 mg/L): Gasping, susceptibility to all diseases, reduced medication effectiveness. High temperature (>30°C): Accelerates bacterial growth, reduces dissolved oxygen, speeds up parasite life cycles. Low temperature (<18°C): Slows immune response, increases susceptibility to spring viremia, Saprolegnia. OPTIMAL RANGES (tropical community): Temperature 24-27°C, pH 6.5-7.5, Ammonia 0, Nitrite 0, Nitrate <20 ppm, GH 4-12 dGH, KH 3-8 dKH, Dissolved oxygen >6 mg/L.`,
    keywords: ["water quality", "جودة الماء", "parameter", "ammonia", "nitrite", "nitrate", "ph", "temperature", "حرارة", "oxygen", "أكسجين", "correlation", "matrix"]
  },
  // ═══════════ TREATMENT PROTOCOLS ═══════════
  {
    id: "hospital-tank-setup",
    title: "Hospital/Quarantine Tank Setup and Protocol",
    category: "treatment",
    content: `HOSPITAL TANK ESSENTIALS: Minimum 10 gallons (40L) for most fish. Sponge filter (pre-seeded from main tank if possible). Heater with guard. No substrate (bare bottom for cleanliness). PVC pipes or flower pots for hiding (reduce stress). Air stone for oxygenation. Thermometer. SETUP: Fill with main tank water (50%) + dechlorinated new water (50%). Match temperature ±1°C. Transfer fish with net (don't pour main tank water in). QUARANTINE PROTOCOL (new fish): 14-30 days observation. Prophylactic treatment: Praziquantel (day 1-3 for parasites) + General Cure (day 5-7 if symptoms). Feed minimally. TREATMENT PROTOCOL (sick fish): Identify disease → dose medication → 25% daily water changes → re-dose after water change → observe 7-14 days → gradual return to main tank. IMPORTANT: No carbon filtration during medication. Keep lights dim to reduce stress. Monitor ammonia daily (no cycled filter in hospital tank).`,
    keywords: ["hospital tank", "quarantine", "حجر صحي", "عزل", "حوض العزل", "treatment", "setup", "sponge filter", "medication"]
  },
  {
    id: "medicated-food-preparation",
    title: "Medicated Food Preparation Guide",
    category: "treatment",
    content: `WHEN TO USE: Internal parasites, systemic bacterial infections, Hexamita, when fish is still eating. METHOD 1 (Gelatin binding): Mix medication powder with unflavored gelatin (1 packet/cup water). Add fish food (ground pellets). Spread thin on wax paper, refrigerate. Cut into feeding-size pieces. METHOD 2 (Focus/garlic binding): Soak pellets in Seachem Focus + medication + Garlic Guard. Let dry 30 minutes. Feed immediately, discard uneaten after 5 minutes. COMMON MEDICATED FOODS: Metronidazole (anti-protozoal): 1% by weight of food (10mg per gram of food). Kanamycin (antibacterial): 1% by weight. Levamisole (anti-nematode): 10mg per gram of food. Oxolinic acid (anti-bacterial): 5mg per gram of food. DOSING RULE: Feed medicated food exclusively for 7-10 days, 2-3 times daily, only what fish eat in 2 minutes. Fast for 1 day before starting medicated food to increase appetite.`,
    keywords: ["medicated food", "طعام مدعم", "oral", "gelatin", "focus", "garlic", "internal", "باطني", "طفيلي داخلي", "levamisole"]
  },
  {
    id: "swim-bladder-comprehensive",
    title: "Swim Bladder Disorders — Comprehensive Management",
    category: "nutritional",
    content: `TYPES: Type 1 (positive buoyancy): Fish floats/stuck at surface — most common, often diet-related. Type 2 (negative buoyancy): Fish sinks to bottom — often infection or congenital. CAUSES: Constipation/overfeeding (most common in goldfish, bettas), bacterial infection of swim bladder, physical trauma, congenital defect (fancy goldfish breeds), rapid pressure changes (deep water fish). TREATMENT PROTOCOL: Step 1: Fast for 3 days (NO food). Step 2: Day 4 — feed 1-2 blanched, deshelled peas (fiber laxative). Step 3: Epsom salt bath (1 tablespoon/5 gallons) — reduces swelling. Step 4: If still floating after 5 days → suspect infection → Kanamycin or Maracyn-Two. Step 5: For chronic/congenital (fancy goldfish): lower water level, hand-feed sinking pellets, consider permanent low-water setup. PREVENTION: Soak pellets before feeding (prevents air swallowing), feed gel food instead of flakes, don't overfeed, include blanched vegetables weekly, avoid freeze-dried food (absorbs water and expands). DIET CHANGE: Switch from flakes to sinking pellets + frozen food + vegetables.`,
    keywords: ["swim bladder", "مثانة هوائية", "floating", "sinking", "طفو", "مقلوب", "peas", "بازلاء", "constipation", "إمساك", "goldfish", "betta", "buoyancy"]
  },
];

/**
 * Get all knowledge chunk IDs for a specific category
 */
export function getChunksByCategory(category: string): KnowledgeChunk[] {
  return VET_KNOWLEDGE_CHUNKS.filter(chunk => chunk.category === category);
}

/**
 * Get a specific chunk by ID
 */
export function getChunkById(id: string): KnowledgeChunk | undefined {
  return VET_KNOWLEDGE_CHUNKS.find(chunk => chunk.id === id);
}
