import "dotenv/config";
import { db } from "../server/db.js";
import { blogPosts } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const BLOG_IMAGES_DIR = path.resolve("public/blog-images");

// Upload a single image to Cloudinary
async function uploadImage(filename: string): Promise<string> {
  const filePath = path.join(BLOG_IMAGES_DIR, filename);
  const result = await cloudinary.uploader.upload(filePath, {
    folder: "aquavo/blog",
    public_id: filename.replace(".png", ""),
    resource_type: "image",
    overwrite: true,
  });
  return result.secure_url;
}

// Map of slugs to their image filenames
const slugToImage: Record<string, string> = {
  "goldfish-5-deadly-mistakes-beginners": "goldfish.png",
  "goldfish-bowl-myth": "goldfish.png",
  "betta-fish-bowl-truth-iraq": "betta.png",
  "betta-compatible-tank-mates": "betta.png",
  "fish-that-live-without-filter": "betta.png",
  "discus-fish-care-guide": "discus.png",
  "oscar-fish-care-guide-water-dog": "oscar.png",
  "arowana-fish-care-guide-prices": "arowana.png",
  "guppy-fish-care-breeding-guide": "guppy.png",
  "molly-platy-breeding-save-fry": "guppy.png",
  "neon-tetra-color-care-guide": "neon-tetra.png",
  "can-fish-see-recognize-owners-science": "neon-tetra.png",
  "african-cichlids-best-types-colors": "cichlid.png",
  "american-vs-african-cichlids-differences": "cichlid.png",
  "flowerhorn-breeding-nuchal-hump-secrets": "cichlid.png",
  "koi-fish-outdoor-pond-building-tips": "koi.png",
  "turtles-with-aquarium-fish": "turtle.png",
  "tank-mates-compatibility": "community.png",
  "5-hardy-fish-for-beginners": "community.png",
  "best-aquarium-cleaner-fish-pleco-corydoras": "community.png",
  "corydoras-types-best-cleaner-fish": "community.png",
  "feeding-fish-vegetables-cucumber-peas": "community.png",
  "freshwater-pufferfish-care-guide": "community.png",
  "iraqi-summer-aquarium-cooling": "community.png",
  "ornamental-fish-import-middle-east-origins": "community.png",
  "budget-aquascaping": "planted.png",
  "real-vs-fake-plants": "planted.png",
  "real-vs-fake-plants-iraq": "planted.png",
  "iwagumi-aquascape-step-by-step": "planted.png",
  "best-low-tech-aquarium-plants-beginners": "planted.png",
  "amazon-sword-plant-care-propagation": "planted.png",
  "aquarium-soil-volcanic-substrate-secrets": "planted.png",
  "hardscape-rock-arrangement-visual-depth": "planted.png",
  "co2-system-planted-aquarium-guide": "planted.png",
  "aquarium-planted-led-lighting-guide": "planted.png",
  "aquarium-photography-mobile-tips": "planted.png",
  "aquarium-bedroom-feng-shui-sound-effect": "planted.png",
  "fish-keeping-stress-relief-mental-health": "planted.png",
  "future-of-fish-keeping-iraq-2026-aquavo": "planted.png",
  "driftwood-preparation-yellow-water-fix": "driftwood.png",
  "amazon-biotope-aquarium-setup": "driftwood.png",
  "blackwater-extract-filter-bacteria-guide": "driftwood.png",
  "diy-3d-aquarium-background": "driftwood.png",
  "filter-types-guide": "equipment.png",
  "best-aquarium-filters-iraq": "equipment.png",
  "aquarium-heaters-cheap-vs-premium": "equipment.png",
  "aquarium-heater-winter-iraq": "equipment.png",
  "calculate-aquarium-capacity-liters": "equipment.png",
  "filter-media-ceramic-rings-bioballs": "equipment.png",
  "activated-carbon-aquarium-when-to-use": "equipment.png",
  "sump-vs-canister-filter-comparison": "equipment.png",
  "air-pumps-decoration-or-necessity": "equipment.png",
  "power-outage-emergency-aquarium-tools": "equipment.png",
  "how-to-choose-aquarium-tank": "equipment.png",
  "tetra-food-vs-budget-brands-comparison": "equipment.png",
  "nitrogen-cycle-simple": "water-testing.png",
  "nitrogen-cycle-simple-arabic-explained": "water-testing.png",
  "ph-level-iraqi-tap-water-fish": "water-testing.png",
  "ammonia-spike-emergency-treatment": "water-testing.png",
  "ro-water-vs-tap-water-aquarium": "water-testing.png",
  "how-to-treat-tap-water-for-fish-iraq": "water-testing.png",
  "how-to-clean-aquarium-properly": "water-testing.png",
  "top-5-mistakes": "sick-fish.png",
  "cloudy-water-fix": "sick-fish.png",
  "cloudy-aquarium-water-causes-fix": "sick-fish.png",
  "algae-war-guide": "sick-fish.png",
  "how-to-get-rid-of-green-algae": "sick-fish.png",
  "common-fish-diseases-white-spot": "sick-fish.png",
  "why-fish-die-suddenly-rescue-guide": "sick-fish.png",
  "fin-rot-treatment-guide": "sick-fish.png",
  "black-beard-algae-removal-steps": "sick-fish.png",
  "aquatic-plant-root-rot-treatment": "sick-fish.png",
  "human-medicine-dangers-for-fish": "sick-fish.png",
  "protect-fish-iraqi-summer-50-degrees": "sick-fish.png",
  "saltwater-vs-freshwater-aquarium-beginners": "coral-reef.png",
  "best-aquarium-store-iraq-2026": "goldfish.png",
  "aquarium-fish-prices-iraq-2026": "guppy.png",
  "aquavo-vs-local-stores-baghdad": "community.png",
  "avoid-fake-fish-stores-instagram-scams": "oscar.png",
  "ghazal-market-baghdad-fish-buying-tips": "koi.png",
};

async function run() {
  // Step 1: Upload all unique images to Cloudinary
  const uniqueImages = [...new Set(Object.values(slugToImage))];
  const cloudinaryUrls: Record<string, string> = {};

  console.log(`Uploading ${uniqueImages.length} images to Cloudinary...`);

  for (const img of uniqueImages) {
    try {
      const url = await uploadImage(img);
      cloudinaryUrls[img] = url;
      console.log(`✅ Uploaded: ${img} -> ${url}`);
    } catch (err: any) {
      console.error(`❌ Failed: ${img} - ${err.message}`);
    }
  }

  // Step 2: Update database with Cloudinary URLs
  console.log("\nUpdating database...");
  const posts = await db.query.blogPosts.findMany();
  let updated = 0;

  for (const post of posts) {
    const imageFile = slugToImage[post.slug];
    if (imageFile && cloudinaryUrls[imageFile]) {
      await db.update(blogPosts)
        .set({ imageUrl: cloudinaryUrls[imageFile] })
        .where(eq(blogPosts.id, post.id));
      updated++;
    }
  }

  console.log(`\n🎉 Uploaded ${Object.keys(cloudinaryUrls).length} images to Cloudinary`);
  console.log(`🎉 Updated ${updated} posts with Cloudinary URLs`);
  process.exit(0);
}

run();
