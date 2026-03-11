import "dotenv/config";
import { db } from "../server/db.js";
import { blogPosts } from "../shared/schema.js";
import { eq } from "drizzle-orm";

const imagesCategorized = {
    plants: [
        "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=800&q=80",
        "https://images.unsplash.com/photo-1541480601022-23c8e0f06efa?w=800&q=80",
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80",
        "https://images.unsplash.com/photo-1628156643034-93430b0fb001?w=800&q=80",
        "https://images.unsplash.com/photo-1534043464124-3be32fe000ce?w=800&q=80",
    ],
    goldfish_koi: [
        "https://images.unsplash.com/photo-1540679803366-4fbf3bd7b243?w=800&q=80",
        "https://images.unsplash.com/photo-1525066928828-56149f874abf?w=800&q=80",
        "https://images.unsplash.com/photo-1620025997635-c3f25c27635b?w=800&q=80",
        "https://images.unsplash.com/photo-1534606622444-2396b1b5e39b?w=800&q=80",
    ],
    betta: [
        "https://images.unsplash.com/photo-1522069213448-443a614da9b6?w=800&q=80",
        "https://images.unsplash.com/photo-1616866166163-54cd92bd2e5f?w=800&q=80",
    ],
    cichlid_tropical: [
        "https://images.unsplash.com/photo-1524704796725-9fc3044a58b2?w=800&q=80",
        "https://images.unsplash.com/photo-1584625750393-27470653fbff?w=800&q=80",
        "https://images.unsplash.com/photo-1616035848293-6e69bed9bd43?w=800&q=80",
        "https://images.unsplash.com/photo-1581452140409-cf2ebaf6363a?w=800&q=80",
        "https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=800&q=80",
    ],
    saltwater: [
        "https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=800&q=80",
        "https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=800&q=80",
        "https://images.unsplash.com/photo-1516684732162-798a0062a9e3?w=800&q=80",
        "https://images.unsplash.com/photo-1586558485292-bdaba1bcbae0?w=800&q=80",
        "https://images.unsplash.com/photo-1605330364132-841cb76b886d?w=800&q=80",
    ],
    equipment: [
        "https://images.unsplash.com/photo-1519688489028-55bca7a6cbda?w=800&q=80",
        "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=800&q=80",
        "https://images.unsplash.com/photo-1612440183188-37c222e43048?w=800&q=80",
        "https://images.unsplash.com/photo-1524515549884-25de026fcd94?w=800&q=80",
    ],
    general: [
        "https://images.unsplash.com/photo-1501193393181-e234c9c148c9?w=800&q=80",
        "https://images.unsplash.com/photo-1509015053748-00fc48b816ba?w=800&q=80",
        "https://images.unsplash.com/photo-1513682121497-80211f36a790?w=800&q=80",
        "https://images.unsplash.com/photo-1533816672323-952402baacae?w=800&q=80",
        "https://images.unsplash.com/photo-1530630458144-014709e10016?w=800&q=80",
    ]
};

function getRandomImage(categoryArray: string[]): string {
    return categoryArray[Math.floor(Math.random() * categoryArray.length)];
}

async function run() {
    console.log("Fetching all blog posts...");
    const posts = await db.query.blogPosts.findMany();
    
    console.log(`Found ${posts.length} posts. Analyzing titles and updating images...`);
    
    let updatedCount = 0;

    for (const post of posts) {
        const title = post.title.toLowerCase();
        const content = post.content.toLowerCase();
        const fullText = title + " " + content;

        let selectedImage = "";

        if (fullText.match(/نباتات|طبيعي|مزروع|زرع|خضراء|طحالب|أكواسكيب|سكيب|planted|plants|aquascape/i)) {
            selectedImage = getRandomImage(imagesCategorized.plants);
        } else if (fullText.match(/مالح|بحر|بحرية|شعاب|مرجان|مهرج|saltwater|reef|coral/i)) {
            selectedImage = getRandomImage(imagesCategorized.saltwater);
        } else if (fullText.match(/سيكلد|أوسكار|ديدسكوس|أنجل|استوائي|cichlid|oscar|discus|angel/i)) {
            selectedImage = getRandomImage(imagesCategorized.cichlid_tropical);
        } else if (fullText.match(/جولد|غولد|كوي|شوبنكن|goldfish|koi/i)) {
            selectedImage = getRandomImage(imagesCategorized.goldfish_koi);
        } else if (fullText.match(/فايتر|بيتا|مقاتل|betta/i)) {
            selectedImage = getRandomImage(imagesCategorized.betta);
        } else if (fullText.match(/فلتر|إضاءة|مضخة|سخان|ديكور|صناعي|معدات|تجهيز|استعداد/i)) {
            selectedImage = getRandomImage(imagesCategorized.equipment);
        } else if (fullText.match(/مرض|علاج|نقط بيضاء|بكتيريا|فطريات|أمراض/i)) {
            selectedImage = getRandomImage(imagesCategorized.equipment); 
        } else {
            selectedImage = getRandomImage(imagesCategorized.general);
        }

        try {
            await db.update(blogPosts)
                .set({ imageUrl: selectedImage })
                .where(eq(blogPosts.id, post.id));
            updatedCount++;
            console.log(`✅ Updated: [${post.title}] -> Assigned category image`);
        } catch (e: any) {
            console.error(`❌ Error updating ${post.id}:`, e.message);
        }
    }

    console.log(`\\n🎉 Done! Updated images for ${updatedCount} posts.`);
    process.exit(0);
}

run();
