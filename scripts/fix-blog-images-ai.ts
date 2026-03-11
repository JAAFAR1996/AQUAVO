import "dotenv/config";
import { db } from "../server/db.js";
import { blogPosts } from "../shared/schema.js";
import { eq } from "drizzle-orm";

const imageMap: Record<string, string> = {
  // GOLDFISH
  "goldfish-5-deadly-mistakes-beginners": "/blog-images/goldfish.png",
  "goldfish-bowl-myth": "/blog-images/goldfish.png",

  // BETTA
  "betta-fish-bowl-truth-iraq": "/blog-images/betta.png",
  "betta-compatible-tank-mates": "/blog-images/betta.png",
  "fish-that-live-without-filter": "/blog-images/betta.png",

  // DISCUS
  "discus-fish-care-guide": "/blog-images/discus.png",

  // OSCAR
  "oscar-fish-care-guide-water-dog": "/blog-images/oscar.png",

  // AROWANA
  "arowana-fish-care-guide-prices": "/blog-images/arowana.png",

  // GUPPY / LIVEBEARERS
  "guppy-fish-care-breeding-guide": "/blog-images/guppy.png",
  "molly-platy-breeding-save-fry": "/blog-images/guppy.png",

  // NEON TETRA
  "neon-tetra-color-care-guide": "/blog-images/neon-tetra.png",
  "can-fish-see-recognize-owners-science": "/blog-images/neon-tetra.png",

  // CICHLIDS
  "african-cichlids-best-types-colors": "/blog-images/cichlid.png",
  "american-vs-african-cichlids-differences": "/blog-images/cichlid.png",
  "flowerhorn-breeding-nuchal-hump-secrets": "/blog-images/cichlid.png",

  // KOI
  "koi-fish-outdoor-pond-building-tips": "/blog-images/koi.png",

  // TURTLE
  "turtles-with-aquarium-fish": "/blog-images/turtle.png",

  // COMMUNITY TANK
  "tank-mates-compatibility": "/blog-images/community.png",
  "5-hardy-fish-for-beginners": "/blog-images/community.png",
  "best-aquarium-cleaner-fish-pleco-corydoras": "/blog-images/community.png",
  "corydoras-types-best-cleaner-fish": "/blog-images/community.png",
  "feeding-fish-vegetables-cucumber-peas": "/blog-images/community.png",
  "freshwater-pufferfish-care-guide": "/blog-images/community.png",
  "iraqi-summer-aquarium-cooling": "/blog-images/community.png",
  "ornamental-fish-import-middle-east-origins": "/blog-images/community.png",

  // PLANTED / AQUASCAPE
  "budget-aquascaping": "/blog-images/planted.png",
  "real-vs-fake-plants": "/blog-images/planted.png",
  "real-vs-fake-plants-iraq": "/blog-images/planted.png",
  "iwagumi-aquascape-step-by-step": "/blog-images/planted.png",
  "best-low-tech-aquarium-plants-beginners": "/blog-images/planted.png",
  "amazon-sword-plant-care-propagation": "/blog-images/planted.png",
  "aquarium-soil-volcanic-substrate-secrets": "/blog-images/planted.png",
  "hardscape-rock-arrangement-visual-depth": "/blog-images/planted.png",
  "co2-system-planted-aquarium-guide": "/blog-images/planted.png",
  "aquarium-planted-led-lighting-guide": "/blog-images/planted.png",
  "aquarium-photography-mobile-tips": "/blog-images/planted.png",
  "aquarium-bedroom-feng-shui-sound-effect": "/blog-images/planted.png",
  "fish-keeping-stress-relief-mental-health": "/blog-images/planted.png",
  "future-of-fish-keeping-iraq-2026-aquavo": "/blog-images/planted.png",

  // DRIFTWOOD / BIOTOPE
  "driftwood-preparation-yellow-water-fix": "/blog-images/driftwood.png",
  "amazon-biotope-aquarium-setup": "/blog-images/driftwood.png",
  "blackwater-extract-filter-bacteria-guide": "/blog-images/driftwood.png",
  "diy-3d-aquarium-background": "/blog-images/driftwood.png",

  // EQUIPMENT
  "filter-types-guide": "/blog-images/equipment.png",
  "best-aquarium-filters-iraq": "/blog-images/equipment.png",
  "aquarium-heaters-cheap-vs-premium": "/blog-images/equipment.png",
  "aquarium-heater-winter-iraq": "/blog-images/equipment.png",
  "calculate-aquarium-capacity-liters": "/blog-images/equipment.png",
  "filter-media-ceramic-rings-bioballs": "/blog-images/equipment.png",
  "activated-carbon-aquarium-when-to-use": "/blog-images/equipment.png",
  "sump-vs-canister-filter-comparison": "/blog-images/equipment.png",
  "air-pumps-decoration-or-necessity": "/blog-images/equipment.png",
  "power-outage-emergency-aquarium-tools": "/blog-images/equipment.png",
  "how-to-choose-aquarium-tank": "/blog-images/equipment.png",
  "tetra-food-vs-budget-brands-comparison": "/blog-images/equipment.png",

  // WATER TESTING / SCIENCE
  "nitrogen-cycle-simple": "/blog-images/water-testing.png",
  "nitrogen-cycle-simple-arabic-explained": "/blog-images/water-testing.png",
  "ph-level-iraqi-tap-water-fish": "/blog-images/water-testing.png",
  "ammonia-spike-emergency-treatment": "/blog-images/water-testing.png",
  "ro-water-vs-tap-water-aquarium": "/blog-images/water-testing.png",
  "how-to-treat-tap-water-for-fish-iraq": "/blog-images/water-testing.png",
  "how-to-clean-aquarium-properly": "/blog-images/water-testing.png",

  // SICK FISH / PROBLEMS
  "top-5-mistakes": "/blog-images/sick-fish.png",
  "cloudy-water-fix": "/blog-images/sick-fish.png",
  "cloudy-aquarium-water-causes-fix": "/blog-images/sick-fish.png",
  "algae-war-guide": "/blog-images/sick-fish.png",
  "how-to-get-rid-of-green-algae": "/blog-images/sick-fish.png",
  "common-fish-diseases-white-spot": "/blog-images/sick-fish.png",
  "why-fish-die-suddenly-rescue-guide": "/blog-images/sick-fish.png",
  "fin-rot-treatment-guide": "/blog-images/sick-fish.png",
  "black-beard-algae-removal-steps": "/blog-images/sick-fish.png",
  "aquatic-plant-root-rot-treatment": "/blog-images/sick-fish.png",
  "human-medicine-dangers-for-fish": "/blog-images/sick-fish.png",
  "protect-fish-iraqi-summer-50-degrees": "/blog-images/sick-fish.png",

  // CORAL REEF / SALTWATER
  "saltwater-vs-freshwater-aquarium-beginners": "/blog-images/coral-reef.png",

  // SHOPPING / AQUAVO
  "best-aquarium-store-iraq-2026": "/blog-images/goldfish.png",
  "aquarium-fish-prices-iraq-2026": "/blog-images/guppy.png",
  "aquavo-vs-local-stores-baghdad": "/blog-images/community.png",
  "avoid-fake-fish-stores-instagram-scams": "/blog-images/oscar.png",
  "ghazal-market-baghdad-fish-buying-tips": "/blog-images/koi.png",
};

async function run() {
  console.log("Switching to AI-generated local images...");
  const posts = await db.query.blogPosts.findMany();
  let updated = 0;
  let notMapped = 0;

  for (const post of posts) {
    const newImage = imageMap[post.slug];
    if (newImage) {
      await db.update(blogPosts)
        .set({ imageUrl: newImage })
        .where(eq(blogPosts.id, post.id));
      updated++;
    } else {
      notMapped++;
      console.log(`⚠️ No mapping: ${post.slug}`);
    }
  }

  console.log(`\n🎉 Updated ${updated} posts!`);
  if (notMapped > 0) console.log(`⚠️ ${notMapped} posts without mapping`);
  process.exit(0);
}

run();
