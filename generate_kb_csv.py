import csv
import os

target_dir = r"c:\Users\jaafa\Desktop\upload\FishWebClean\knowledge_base_pdfs"
csv_file = os.path.join(target_dir, "AQUAVO_Fish_Disease_Knowledge_Base.csv")

# Data structure: Disease Name, Category, Symptoms, Causes, Treatment Plan, Betta Specifics
knowledge_data = [
    # Bacterial Diseases
    ["Columnaris (Cotton Wool Disease)", "Bacterial (Flavobacterium columnare)", 
     "White/gray fuzzy patches on mouth, gills, or body. Ulcers. Rapid breathing.", 
     "Poor water quality, high temperature, stress, overcrowding.", 
     "1. Isolate fish. 2. Lower temp slightly. 3. Treat with Kanamycin (Kanaplex) + Nitrofurazone (Furan-2) combination. 4. Improve aeration and water changes.", 
     "Often mistaken for fungus in Bettas. Highly lethal; requires immediate antibiotic treatment."],
    
    ["Fin and Tail Rot", "Bacterial (Aeromonas, Pseudomonas)", 
     "Edges of fins turning white, black, or red. Fins fraying or melting away.", 
     "Ammonia/Nitrite spikes, poor hygiene, nipping from tank mates.", 
     "1. Check water parameters (Ammonia must be 0). 2. 50% water change. 3. Treat with Erythromycin or Maracyn. 4. Add aquarium salt (1 tbsp per 3 gallons) if freshwater.", 
     "Extremely common in Bettas kept in unfiltered bowls. Clean water is the primary cure."],
    
    ["Dropsy (Pinecone Scale)", "Bacterial (Internal Infection / Kidney Failure)", 
     "Severe bloating, scales protruding outward like a pinecone, lethargy.", 
     "Advanced internal bacterial infection, prolonged stress, poor diet.", 
     "1. Immediate isolation. 2. Epsom salt baths (1 tbsp per gallon for 15 mins) to draw out fluids. 3. Strong antibiotics in food (Kanaplex + Focus). 4. Prognosis is generally poor.", 
     "Bettas are highly susceptible. Often fatal by the time pineconing appears."],

    # Parasitic Diseases
    ["Ich (White Spot Disease)", "Parasitic (Ichthyophthirius multifiliis)", 
     "Small white spots resembling salt grains on body and fins. Flashing (scratching against objects).", 
     "Introduction of new infected fish/plants, temperature drops suppressing immune system.", 
     "1. Raise temperature to 86°F (30°C) gradually. 2. Add Aquarium Salt. 3. Treat with Copper-based meds or Formalin/Malachite Green (e.g., Seachem ParaGuard or Ich-X). 4. Treat entire tank.", 
     "Bettas tolerate heat well; raising temp above 84F accelerates parasite life cycle to be killed by meds."],
    
    ["Velvet (Gold Rust Disease)", "Parasitic (Oodinium pillularis)", 
     "Dusty, yellowish-gold film on body. Clamped fins, heavy breathing, scratching.", 
     "Stress, poor water conditions, newly introduced fish. Parasite uses photosynthesis.", 
     "1. Turn off all aquarium lights (blackout). 2. Raise temperature slightly. 3. Treat with Copper sulfate or Malachite Green. 4. Add Aquarium salt.", 
     "Very common in Bettas. Use a flashlight in a dark room to see the gold dust on the Betta's body."],
    
    ["Gill Flukes and Skin Flukes", "Parasitic (Flatworms: Dactylogyrus & Gyrodactylus)", 
     "Gasping at surface, red/swollen gills, excessive slime coat, scratching.", 
     "Overcrowding, poor water quality, transmitted from unquarantined fish.", 
     "1. Treat with Praziquantel (PraziPro). 2. Treat the entire display tank. 3. Do a second treatment 5-7 days later to kill hatching eggs.", 
     "Can quickly suffocate Bettas. Praziquantel is highly effective and safe for them."],

    # Fungal Infections
    ["True Fungal Infection (Saprolegnia)", "Fungal", 
     "Actual fluffy cotton-like growths on body, usually growing out of a wound or dead tissue.", 
     "Secondary infection on an open wound, ulcer, or due to extreme temperature drops.", 
     "1. Isolate fish. 2. Treat with Methylene Blue baths or Malachite Green. 3. Maintain pristine water quality to let wound heal.", 
     "Bettas attacking each other often get fungal infections on the bite wounds."],

    # Water Quality & Environmental
    ["Ammonia Poisoning", "Environmental", 
     "Red/purple gills, gasping for air at surface, lethargy, red streaks on fins/body.", 
     "Uncycled tank, broken nitrogen cycle, overfeeding, dead fish decomposing.", 
     "1. IMMEDIATE 50-75% water change. 2. Dose Seachem Prime to detoxify remaining ammonia. 3. Stop feeding for 3 days. 4. Add beneficial bacteria.", 
     "The #1 killer of Bettas in uncycled bowls. Not a disease, but an environmental crisis."],
    
    ["Nitrite Poisoning (Brown Blood Disease)", "Environmental", 
     "Gasping at surface, rapid gill movement, brown gills.", 
     "New tank syndrome, cycling crash.", 
     "1. 50% water change. 2. Add aquarium salt (chloride protects gills from nitrite). 3. Dose Seachem Prime.", 
     "Salt is the specific antidote for nitrite toxicity in freshwater fish."],

    # Specific Organisms / Others
    ["Hole in the Head (HITH / Milled)", "Parasitic (Hexamita) / Nutritional", 
     "Pitting or small holes forming on the head and lateral line. White stringy feces.", 
     "Poor diet, poor water quality, carbon dust, flagellate parasite.", 
     "1. Improve diet (high-quality varied foods). 2. Treat with Metronidazole (Metroplex) in food. 3. Large water changes.", 
     "More common in Cichlids, but can affect Bettas if diet is extremely poor."]
]

with open(csv_file, mode='w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(["Disease Name", "Category", "Symptoms", "Causes", "Treatment Plan", "Betta / Extra Notes"])
    for row in knowledge_data:
        writer.writerow(row)

print(f"Successfully generated structured knowledge base at: {csv_file}")
print("This file contains the core medical data found in top tier books, formatted perfectly for an AI agent's tabular knowledge.")
