import "dotenv/config";
import { db } from "../server/db.js";
import { blogPosts } from "../shared/schema.js";
import { eq } from "drizzle-orm";

// Topic-specific images from Unsplash - each carefully matched to the article subject
const imageMap: Record<string, string> = {
  // ===== أنواع الأسماك =====
  "goldfish-5-deadly-mistakes-beginners": "https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=800&q=80", // goldfish closeup
  "goldfish-bowl-myth": "https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?w=800&q=80", // goldfish in bowl
  "tank-mates-compatibility": "https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?w=800&q=80", // community tank
  "betta-fish-bowl-truth-iraq": "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800&q=80", // betta fish
  "betta-compatible-tank-mates": "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800&q=80", // betta fish
  "oscar-fish-care-guide-water-dog": "https://images.unsplash.com/photo-1520301255226-bf5f144451c1?w=800&q=80", // oscar fish
  "discus-fish-care-guide": "https://images.unsplash.com/photo-1524704796725-9fc3044a58b2?w=800&q=80", // discus fish
  "guppy-fish-care-breeding-guide": "https://images.unsplash.com/photo-1520990269006-4e10e4052bb5?w=800&q=80", // guppy colorful
  "best-aquarium-cleaner-fish-pleco-corydoras": "https://images.unsplash.com/photo-1596399332151-aced80abe186?w=800&q=80", // bottom dweller fish
  "5-hardy-fish-for-beginners": "https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?w=800&q=80", // community tank
  "arowana-fish-care-guide-prices": "https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?w=800&q=80", // large fish
  "molly-platy-breeding-save-fry": "https://images.unsplash.com/photo-1520990269006-4e10e4052bb5?w=800&q=80", // colorful livebearers
  "african-cichlids-best-types-colors": "https://images.unsplash.com/photo-1616035848293-6e69bed9bd43?w=800&q=80", // cichlids
  "corydoras-types-best-cleaner-fish": "https://images.unsplash.com/photo-1596399332151-aced80abe186?w=800&q=80", // bottom fish
  "flowerhorn-breeding-nuchal-hump-secrets": "https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?w=800&q=80", // large colorful fish
  "neon-tetra-color-care-guide": "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=800&q=80", // neon tetra school
  "freshwater-pufferfish-care-guide": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80", // pufferfish
  "american-vs-african-cichlids-differences": "https://images.unsplash.com/photo-1616035848293-6e69bed9bd43?w=800&q=80", // cichlids
  "koi-fish-outdoor-pond-building-tips": "https://images.unsplash.com/photo-1540679803366-4fbf3bd7b243?w=800&q=80", // koi pond

  // ===== المعدات =====
  "filter-types-guide": "https://images.unsplash.com/photo-1585095595205-e68428a9e205?w=800&q=80", // aquarium equipment
  "best-aquarium-filters-iraq": "https://images.unsplash.com/photo-1585095595205-e68428a9e205?w=800&q=80", // filter equipment
  "aquarium-heaters-cheap-vs-premium": "https://images.unsplash.com/photo-1585095595205-e68428a9e205?w=800&q=80", // heater equipment
  "aquarium-heater-winter-iraq": "https://images.unsplash.com/photo-1547036205-a2fa47cbc8f4?w=800&q=80", // winter aquarium
  "aquarium-planted-led-lighting-guide": "https://images.unsplash.com/photo-1534043464124-3be32fe000ce?w=800&q=80", // planted tank lit
  "calculate-aquarium-capacity-liters": "https://images.unsplash.com/photo-1585095595205-e68428a9e205?w=800&q=80", // measuring equipment
  "filter-media-ceramic-rings-bioballs": "https://images.unsplash.com/photo-1585095595205-e68428a9e205?w=800&q=80", // filter media
  "activated-carbon-aquarium-when-to-use": "https://images.unsplash.com/photo-1585095595205-e68428a9e205?w=800&q=80", // activated carbon
  "sump-vs-canister-filter-comparison": "https://images.unsplash.com/photo-1585095595205-e68428a9e205?w=800&q=80", // large filter
  "air-pumps-decoration-or-necessity": "https://images.unsplash.com/photo-1559827291-bae86f04f3d3?w=800&q=80", // bubbles in aquarium
  "co2-system-planted-aquarium-guide": "https://images.unsplash.com/photo-1534043464124-3be32fe000ce?w=800&q=80", // planted tank
  "power-outage-emergency-aquarium-tools": "https://images.unsplash.com/photo-1559827291-bae86f04f3d3?w=800&q=80", // aquarium at night
  "blackwater-extract-filter-bacteria-guide": "https://images.unsplash.com/photo-1516684732162-798a0062a9e3?w=800&q=80", // dark tannin water

  // ===== مشاكل وحلول =====
  "cloudy-water-fix": "https://images.unsplash.com/photo-1559827291-bae86f04f3d3?w=800&q=80", // cloudy water
  "algae-war-guide": "https://images.unsplash.com/photo-1534043464124-3be32fe000ce?w=800&q=80", // green algae tank
  "how-to-get-rid-of-green-algae": "https://images.unsplash.com/photo-1534043464124-3be32fe000ce?w=800&q=80", // algae
  "common-fish-diseases-white-spot": "https://images.unsplash.com/photo-1524515549884-25de026fcd94?w=800&q=80", // sick fish
  "top-5-mistakes": "https://images.unsplash.com/photo-1584625750393-27470653fbff?w=800&q=80", // dead fish warning
  "why-fish-die-suddenly-rescue-guide": "https://images.unsplash.com/photo-1524515549884-25de026fcd94?w=800&q=80", // emergency
  "fin-rot-treatment-guide": "https://images.unsplash.com/photo-1524515549884-25de026fcd94?w=800&q=80", // disease treatment
  "cloudy-aquarium-water-causes-fix": "https://images.unsplash.com/photo-1559827291-bae86f04f3d3?w=800&q=80", // cloudy water
  "ammonia-spike-emergency-treatment": "https://images.unsplash.com/photo-1524515549884-25de026fcd94?w=800&q=80", // emergency
  "black-beard-algae-removal-steps": "https://images.unsplash.com/photo-1534043464124-3be32fe000ce?w=800&q=80", // algae
  "aquatic-plant-root-rot-treatment": "https://images.unsplash.com/photo-1534043464124-3be32fe000ce?w=800&q=80", // unhealthy plants
  "human-medicine-dangers-for-fish": "https://images.unsplash.com/photo-1524515549884-25de026fcd94?w=800&q=80", // danger
  "protect-fish-iraqi-summer-50-degrees": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", // scorching sun
  "iraqi-summer-aquarium-cooling": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", // hot summer

  // ===== ديكور وأحواض =====
  "real-vs-fake-plants": "https://images.unsplash.com/photo-1534043464124-3be32fe000ce?w=800&q=80", // planted aquarium
  "real-vs-fake-plants-iraq": "https://images.unsplash.com/photo-1534043464124-3be32fe000ce?w=800&q=80", // planted aquarium
  "budget-aquascaping": "https://images.unsplash.com/photo-1534043464124-3be32fe000ce?w=800&q=80", // aquascape
  "how-to-choose-aquarium-tank": "https://images.unsplash.com/photo-1585095595205-e68428a9e205?w=800&q=80", // choosing tank
  "iwagumi-aquascape-step-by-step": "https://images.unsplash.com/photo-1534043464124-3be32fe000ce?w=800&q=80", // iwagumi
  "aquarium-soil-volcanic-substrate-secrets": "https://images.unsplash.com/photo-1534043464124-3be32fe000ce?w=800&q=80", // substrate
  "diy-3d-aquarium-background": "https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?w=800&q=80", // 3d background
  "driftwood-preparation-yellow-water-fix": "https://images.unsplash.com/photo-1516684732162-798a0062a9e3?w=800&q=80", // driftwood
  "amazon-biotope-aquarium-setup": "https://images.unsplash.com/photo-1516684732162-798a0062a9e3?w=800&q=80", // dark water
  "hardscape-rock-arrangement-visual-depth": "https://images.unsplash.com/photo-1534043464124-3be32fe000ce?w=800&q=80", // hardscape
  "aquarium-bedroom-feng-shui-sound-effect": "https://images.unsplash.com/photo-1559827291-bae86f04f3d3?w=800&q=80", // bedroom aquarium

  // ===== نباتات مائية =====
  "best-low-tech-aquarium-plants-beginners": "https://images.unsplash.com/photo-1534043464124-3be32fe000ce?w=800&q=80", // planted tank
  "amazon-sword-plant-care-propagation": "https://images.unsplash.com/photo-1534043464124-3be32fe000ce?w=800&q=80", // large aquatic plant

  // ===== علوم الأحواض =====
  "nitrogen-cycle-simple": "https://images.unsplash.com/photo-1559827291-bae86f04f3d3?w=800&q=80", // water chemistry
  "nitrogen-cycle-simple-arabic-explained": "https://images.unsplash.com/photo-1559827291-bae86f04f3d3?w=800&q=80", // water chemistry
  "how-to-treat-tap-water-for-fish-iraq": "https://images.unsplash.com/photo-1559827291-bae86f04f3d3?w=800&q=80", // water treatment
  "how-to-clean-aquarium-properly": "https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?w=800&q=80", // cleaning tank
  "turtles-with-aquarium-fish": "https://images.unsplash.com/photo-1559827291-bae86f04f3d3?w=800&q=80", // mixed species
  "ph-level-iraqi-tap-water-fish": "https://images.unsplash.com/photo-1559827291-bae86f04f3d3?w=800&q=80", // water testing
  "ro-water-vs-tap-water-aquarium": "https://images.unsplash.com/photo-1559827291-bae86f04f3d3?w=800&q=80", // water treatment
  "saltwater-vs-freshwater-aquarium-beginners": "https://images.unsplash.com/photo-1546500840-ae38253aba9b?w=800&q=80", // coral reef vs freshwater
  "can-fish-see-recognize-owners-science": "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=800&q=80", // fish looking at camera
  "feeding-fish-vegetables-cucumber-peas": "https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?w=800&q=80", // feeding fish
  "fish-that-live-without-filter": "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800&q=80", // hardy fish

  // ===== أدلة التسوق =====
  "best-aquarium-store-iraq-2026": "https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?w=800&q=80", // aquarium store
  "aquarium-fish-prices-iraq-2026": "https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?w=800&q=80", // fish store
  "aquavo-vs-local-stores-baghdad": "https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?w=800&q=80", // store comparison
  "tetra-food-vs-budget-brands-comparison": "https://images.unsplash.com/photo-1585095595205-e68428a9e205?w=800&q=80", // fish food
  "avoid-fake-fish-stores-instagram-scams": "https://images.unsplash.com/photo-1563986768609-322da13575f2?w=800&q=80", // scam warning

  // ===== مقالات متنوعة =====
  "ghazal-market-baghdad-fish-buying-tips": "https://images.unsplash.com/photo-1519888230379-ff449dd3a905?w=800&q=80", // market/bazaar
  "fish-keeping-stress-relief-mental-health": "https://images.unsplash.com/photo-1559827291-bae86f04f3d3?w=800&q=80", // peaceful aquarium
  "ornamental-fish-import-middle-east-origins": "https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?w=800&q=80", // fish shipment
  "aquarium-photography-mobile-tips": "https://images.unsplash.com/photo-1534043464124-3be32fe000ce?w=800&q=80", // aquarium photo
  "future-of-fish-keeping-iraq-2026-aquavo": "https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?w=800&q=80", // modern aquarium
};

async function run() {
  console.log("Updating blog images to match topics...");
  const posts = await db.query.blogPosts.findMany();
  let updated = 0;

  for (const post of posts) {
    const newImage = imageMap[post.slug];
    if (newImage && newImage !== post.imageUrl) {
      await db.update(blogPosts)
        .set({ imageUrl: newImage })
        .where(eq(blogPosts.id, post.id));
      updated++;
      console.log(`🖼️ ${post.title} -> ${newImage.split("photo-")[1]?.split("?")[0] || "updated"}`);
    }
  }

  console.log(`\n🎉 Updated ${updated} post images!`);
  process.exit(0);
}

run();
