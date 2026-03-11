import "dotenv/config";
import { db } from "../server/db.js";
import { blogPosts } from "../shared/schema.js";
import { eq } from "drizzle-orm";

// Using verified Pexels CDN URLs (free, no auth needed, instant loading)
const IMAGES = {
  goldfish: "https://images.pexels.com/photos/45910/goldfish-carassius-fish-golden-45910.jpeg?auto=compress&cs=tinysrgb&w=800",
  betta: "https://images.pexels.com/photos/325044/pexels-photo-325044.jpeg?auto=compress&cs=tinysrgb&w=800",
  discus: "https://images.pexels.com/photos/3923387/pexels-photo-3923387.jpeg?auto=compress&cs=tinysrgb&w=800",
  oscar: "https://images.pexels.com/photos/2156311/pexels-photo-2156311.jpeg?auto=compress&cs=tinysrgb&w=800",
  guppy: "https://images.pexels.com/photos/2168831/pexels-photo-2168831.jpeg?auto=compress&cs=tinysrgb&w=800",
  neonTetra: "https://images.pexels.com/photos/128756/pexels-photo-128756.jpeg?auto=compress&cs=tinysrgb&w=800",
  cichlid: "https://images.pexels.com/photos/1145274/pexels-photo-1145274.jpeg?auto=compress&cs=tinysrgb&w=800",
  koi: "https://images.pexels.com/photos/213399/pexels-photo-213399.jpeg?auto=compress&cs=tinysrgb&w=800",
  community: "https://images.pexels.com/photos/2846814/pexels-photo-2846814.jpeg?auto=compress&cs=tinysrgb&w=800",
  planted: "https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=800",
  equipment: "https://images.pexels.com/photos/3225529/pexels-photo-3225529.jpeg?auto=compress&cs=tinysrgb&w=800",
  sickFish: "https://images.pexels.com/photos/3662102/pexels-photo-3662102.jpeg?auto=compress&cs=tinysrgb&w=800",
  coralReef: "https://images.pexels.com/photos/847393/pexels-photo-847393.jpeg?auto=compress&cs=tinysrgb&w=800",
  waterTest: "https://images.pexels.com/photos/3825368/pexels-photo-3825368.jpeg?auto=compress&cs=tinysrgb&w=800",
  driftwood: "https://images.pexels.com/photos/1828875/pexels-photo-1828875.jpeg?auto=compress&cs=tinysrgb&w=800",
  shopping: "https://images.pexels.com/photos/3225530/pexels-photo-3225530.jpeg?auto=compress&cs=tinysrgb&w=800",
};

const imageMap: Record<string, string> = {
  "goldfish-5-deadly-mistakes-beginners": IMAGES.goldfish,
  "goldfish-bowl-myth": IMAGES.goldfish,
  "betta-fish-bowl-truth-iraq": IMAGES.betta,
  "betta-compatible-tank-mates": IMAGES.betta,
  "fish-that-live-without-filter": IMAGES.betta,
  "discus-fish-care-guide": IMAGES.discus,
  "oscar-fish-care-guide-water-dog": IMAGES.oscar,
  "guppy-fish-care-breeding-guide": IMAGES.guppy,
  "molly-platy-breeding-save-fry": IMAGES.guppy,
  "neon-tetra-color-care-guide": IMAGES.neonTetra,
  "african-cichlids-best-types-colors": IMAGES.cichlid,
  "american-vs-african-cichlids-differences": IMAGES.cichlid,
  "flowerhorn-breeding-nuchal-hump-secrets": IMAGES.cichlid,
  "koi-fish-outdoor-pond-building-tips": IMAGES.koi,
  "tank-mates-compatibility": IMAGES.community,
  "5-hardy-fish-for-beginners": IMAGES.community,
  "best-aquarium-cleaner-fish-pleco-corydoras": IMAGES.community,
  "corydoras-types-best-cleaner-fish": IMAGES.community,
  "arowana-fish-care-guide-prices": IMAGES.oscar,
  "feeding-fish-vegetables-cucumber-peas": IMAGES.community,
  "can-fish-see-recognize-owners-science": IMAGES.neonTetra,
  "freshwater-pufferfish-care-guide": IMAGES.community,
  "turtles-with-aquarium-fish": IMAGES.community,
  "budget-aquascaping": IMAGES.planted,
  "real-vs-fake-plants": IMAGES.planted,
  "real-vs-fake-plants-iraq": IMAGES.planted,
  "iwagumi-aquascape-step-by-step": IMAGES.planted,
  "best-low-tech-aquarium-plants-beginners": IMAGES.planted,
  "amazon-sword-plant-care-propagation": IMAGES.planted,
  "aquarium-soil-volcanic-substrate-secrets": IMAGES.planted,
  "hardscape-rock-arrangement-visual-depth": IMAGES.planted,
  "co2-system-planted-aquarium-guide": IMAGES.planted,
  "aquarium-planted-led-lighting-guide": IMAGES.planted,
  "aquarium-photography-mobile-tips": IMAGES.planted,
  "driftwood-preparation-yellow-water-fix": IMAGES.driftwood,
  "amazon-biotope-aquarium-setup": IMAGES.driftwood,
  "blackwater-extract-filter-bacteria-guide": IMAGES.driftwood,
  "diy-3d-aquarium-background": IMAGES.driftwood,
  "filter-types-guide": IMAGES.equipment,
  "best-aquarium-filters-iraq": IMAGES.equipment,
  "aquarium-heaters-cheap-vs-premium": IMAGES.equipment,
  "aquarium-heater-winter-iraq": IMAGES.equipment,
  "calculate-aquarium-capacity-liters": IMAGES.equipment,
  "filter-media-ceramic-rings-bioballs": IMAGES.equipment,
  "activated-carbon-aquarium-when-to-use": IMAGES.equipment,
  "sump-vs-canister-filter-comparison": IMAGES.equipment,
  "air-pumps-decoration-or-necessity": IMAGES.equipment,
  "power-outage-emergency-aquarium-tools": IMAGES.equipment,
  "how-to-choose-aquarium-tank": IMAGES.equipment,
  "nitrogen-cycle-simple": IMAGES.waterTest,
  "nitrogen-cycle-simple-arabic-explained": IMAGES.waterTest,
  "ph-level-iraqi-tap-water-fish": IMAGES.waterTest,
  "ammonia-spike-emergency-treatment": IMAGES.waterTest,
  "ro-water-vs-tap-water-aquarium": IMAGES.waterTest,
  "how-to-treat-tap-water-for-fish-iraq": IMAGES.waterTest,
  "how-to-clean-aquarium-properly": IMAGES.waterTest,
  "aquarium-bedroom-feng-shui-sound-effect": IMAGES.planted,
  "top-5-mistakes": IMAGES.sickFish,
  "cloudy-water-fix": IMAGES.sickFish,
  "cloudy-aquarium-water-causes-fix": IMAGES.sickFish,
  "algae-war-guide": IMAGES.sickFish,
  "how-to-get-rid-of-green-algae": IMAGES.sickFish,
  "common-fish-diseases-white-spot": IMAGES.sickFish,
  "why-fish-die-suddenly-rescue-guide": IMAGES.sickFish,
  "fin-rot-treatment-guide": IMAGES.sickFish,
  "black-beard-algae-removal-steps": IMAGES.sickFish,
  "aquatic-plant-root-rot-treatment": IMAGES.sickFish,
  "human-medicine-dangers-for-fish": IMAGES.sickFish,
  "protect-fish-iraqi-summer-50-degrees": IMAGES.sickFish,
  "iraqi-summer-aquarium-cooling": IMAGES.community,
  "saltwater-vs-freshwater-aquarium-beginners": IMAGES.coralReef,
  "best-aquarium-store-iraq-2026": IMAGES.shopping,
  "aquarium-fish-prices-iraq-2026": IMAGES.shopping,
  "aquavo-vs-local-stores-baghdad": IMAGES.shopping,
  "tetra-food-vs-budget-brands-comparison": IMAGES.equipment,
  "avoid-fake-fish-stores-instagram-scams": IMAGES.shopping,
  "ghazal-market-baghdad-fish-buying-tips": IMAGES.shopping,
  "fish-keeping-stress-relief-mental-health": IMAGES.planted,
  "ornamental-fish-import-middle-east-origins": IMAGES.community,
  "future-of-fish-keeping-iraq-2026-aquavo": IMAGES.planted,
};

async function run() {
  console.log("Updating to Pexels CDN URLs...");
  const posts = await db.query.blogPosts.findMany();
  let updated = 0;

  for (const post of posts) {
    const newImage = imageMap[post.slug];
    if (newImage) {
      await db.update(blogPosts)
        .set({ imageUrl: newImage })
        .where(eq(blogPosts.id, post.id));
      updated++;
    }
  }

  console.log(`\n🎉 Updated ${updated} posts with Pexels CDN images!`);
  process.exit(0);
}

run();
