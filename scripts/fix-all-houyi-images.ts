/**
 * يصلح صور كل منتجات houyi المكسورة
 * يستبدل المسارات القديمة/الخاطئة بالمسارات الصحيحة الحالية
 */
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

const BASE = "/images/products/houyi";

// slug → [image1, image2, ...]  (الصورة الأولى = thumbnail)
const FIXES: Record<string, string[]> = {
    "houyi-5-in-1-cleaning-tool": [
        `${BASE}/houyi-5-in-1-cleaning-tool/houyi-5-in-1-cleaning-tool-1.jpg`,
        `${BASE}/houyi-5-in-1-cleaning-tool/houyi-5-in-1-cleaning-tool-2.jpg`,
        `${BASE}/houyi-5-in-1-cleaning-tool/houyi-5-in-1-cleaning-tool-3.jpg`,
        `${BASE}/houyi-5-in-1-cleaning-tool/houyi-5-in-1-cleaning-tool-4.jpg`,
        `${BASE}/houyi-5-in-1-cleaning-tool/houyi-5-in-1-cleaning-tool-5.jpg`,
    ],
    "houyi-activated-carbon": [
        `${BASE}/houyi-activated-carbon/houyi-activated-carbon-1.png`,
        `${BASE}/houyi-activated-carbon/houyi-activated-carbon-2.png`,
        `${BASE}/houyi-activated-carbon/houyi-activated-carbon-3.png`,
    ],
    "houyi-air-distributor": [
        `${BASE}/houyi-air-distributor-4port/houyi-air-distributor-4port-1.png`,
        `${BASE}/houyi-air-distributor-4port/houyi-air-distributor-4port-2.png`,
    ],
    "houyi-base-fertilizer": [
        `${BASE}/houyi-base-fertilizer/houyi-base-fertilizer-1.png`,
        `${BASE}/houyi-base-fertilizer/houyi-base-fertilizer-2.png`,
        `${BASE}/houyi-base-fertilizer/houyi-base-fertilizer-3.png`,
    ],
    "houyi-blue-dragon-stone": [
        `${BASE}/houyi-blue-dragon-stone/houyi-blue-dragon-stone-1.png`,
        `${BASE}/houyi-blue-dragon-stone/houyi-blue-dragon-stone-2.png`,
        `${BASE}/houyi-blue-dragon-stone/houyi-blue-dragon-stone-3.png`,
    ],
    "houyi-ceramic-ring": [
        `${BASE}/houyi-ceramic-ring/houyi-ceramic-ring-1.jpg`,
        `${BASE}/houyi-ceramic-ring/houyi-ceramic-ring-2.jpg`,
        `${BASE}/houyi-ceramic-ring/houyi-ceramic-ring-3.jpg`,
    ],
    "houyi-check-valve": [
        `${BASE}/houyi-check-valve/houyi-check-valve-1.png`,
    ],
    "houyi-chubby-thermometer": [
        `${BASE}/houyi-chubby-thermometer/houyi-chubby-thermometer-1.jpg`,
        `${BASE}/houyi-chubby-thermometer/houyi-chubby-thermometer-2.jpg`,
        `${BASE}/houyi-chubby-thermometer/houyi-chubby-thermometer-3.jpg`,
        `${BASE}/houyi-chubby-thermometer/houyi-chubby-thermometer-4.jpg`,
    ],
    "houyi-connectors-4mm": [
        `${BASE}/houyi-connectors-4mm/houyi-connectors-4mm-1.png`,
        `${BASE}/houyi-connectors-4mm/houyi-connectors-4mm-2.png`,
        `${BASE}/houyi-connectors-4mm/houyi-connectors-4mm-3.png`,
    ],
    "houyi-control-valve-4mm": [
        `${BASE}/houyi-control-valve-4mm/houyi-control-valve-4mm-1.jpg`,
        `${BASE}/houyi-control-valve-4mm/houyi-control-valve-4mm-2.jpg`,
        `${BASE}/houyi-control-valve-4mm/houyi-control-valve-4mm-3.jpg`,
    ],
    "houyi-dophin-electric-skimmer": [
        `${BASE}/houyi-dophin-electric-skimmer/houyi-dophin-electric-skimmer-1.jpg`,
        `${BASE}/houyi-dophin-electric-skimmer/houyi-dophin-electric-skimmer-2.jpg`,
        `${BASE}/houyi-dophin-electric-skimmer/houyi-dophin-electric-skimmer-3.jpg`,
    ],
    "houyi-dutch-sand": [
        `${BASE}/houyi-dutch-sand/houyi-dutch-sand-1.png`,
        `${BASE}/houyi-dutch-sand/houyi-dutch-sand-2.jpg`,
    ],
    "houyi-hose-brush": [
        `${BASE}/houyi-hose-brush/houyi-hose-brush-1.jpg`,
        `${BASE}/houyi-hose-brush/houyi-hose-brush-2.jpg`,
        `${BASE}/houyi-hose-brush/houyi-hose-brush-3.jpg`,
        `${BASE}/houyi-hose-brush/houyi-hose-brush-4.jpg`,
    ],
    "houyi-medium-cotton": [
        `${BASE}/houyi-medium-cotton/houyi-medium-cotton-1.png`,
        `${BASE}/houyi-medium-cotton/houyi-medium-cotton-2.png`,
    ],
    "houyi-moss-line": [
        `${BASE}/houyi-moss-line/houyi-moss-line-1.png`,
        `${BASE}/houyi-moss-line/houyi-moss-line-2.jpg`,
        `${BASE}/houyi-moss-line/houyi-moss-line-3.jpg`,
    ],
    "houyi-moss-tree": [
        `${BASE}/houyi-moss-tree/houyi-moss-tree-1.png`,
    ],
    "houyi-mountain-wood": [
        `${BASE}/houyi-mountain-wood/houyi-mountain-wood-1.png`,
    ],
    "houyi-nylon-fishing-net": [
        `${BASE}/houyi-nylon-fishing-net/houyi-nylon-fishing-net-1.jpg`,
        `${BASE}/houyi-nylon-fishing-net/houyi-nylon-fishing-net-2.jpg`,
        `${BASE}/houyi-nylon-fishing-net/houyi-nylon-fishing-net-3.jpg`,
        `${BASE}/houyi-nylon-fishing-net/houyi-nylon-fishing-net-4.jpg`,
        `${BASE}/houyi-nylon-fishing-net/houyi-nylon-fishing-net-5.jpg`,
    ],
    "houyi-planting-ring": [
        `${BASE}/houyi-planting-ring/houyi-planting-ring-1.jpg`,
        `${BASE}/houyi-planting-ring/houyi-planting-ring-2.jpg`,
        `${BASE}/houyi-planting-ring/houyi-planting-ring-3.png`,
    ],
    "houyi-polished-driftwood": [
        `${BASE}/houyi-polished-driftwood/houyi-polished-driftwood-1.png`,
    ],
    "houyi-pumice": [
        `${BASE}/houyi-pumice/houyi-pumice-1.png`,
        `${BASE}/houyi-pumice/houyi-pumice-2.png`,
        `${BASE}/houyi-pumice/houyi-pumice-3.jpg`,
    ],
    "houyi-river-sand": [
        `${BASE}/houyi-river-sand/houyi-river-sand-1.jpg`,
        `${BASE}/houyi-river-sand/houyi-river-sand-2.jpg`,
        `${BASE}/houyi-river-sand/houyi-river-sand-3.jpg`,
    ],
    "houyi-silicone-121": [
        `${BASE}/houyi-silicone-121/houyi-silicone-121-1.png`,
    ],
    "houyi-sinking-wood-large": [
        `${BASE}/houyi-sinking-wood/houyi-sinking-wood-1.png`,
    ],
    "houyi-south-american-sand": [
        `${BASE}/houyi-south-american-sand/houyi-south-american-sand-1.jpg`,
        `${BASE}/houyi-south-american-sand/houyi-south-american-sand-2.jpg`,
        `${BASE}/houyi-south-american-sand/houyi-south-american-sand-3.png`,
        `${BASE}/houyi-south-american-sand/houyi-south-american-sand-4.jpg`,
    ],
    "houyi-stainless-shunt": [
        `${BASE}/houyi-stainless-steel-shunt/houyi-stainless-steel-shunt-1.png`,
        `${BASE}/houyi-stainless-steel-shunt/houyi-stainless-steel-shunt-2.jpg`,
        `${BASE}/houyi-stainless-steel-shunt/houyi-stainless-steel-shunt-3.jpg`,
    ],
    "houyi-stream-sand": [
        `${BASE}/houyi-stream-sand/houyi-stream-sand-1.png`,
        `${BASE}/houyi-stream-sand/houyi-stream-sand-2.png`,
        `${BASE}/houyi-stream-sand/houyi-stream-sand-3.jpg`,
    ],
    "houyi-suction-thermometer": [
        `${BASE}/houyi-suction-thermometer/houyi-suction-thermometer-1.jpg`,
        `${BASE}/houyi-suction-thermometer/houyi-suction-thermometer-2.jpg`,
        `${BASE}/houyi-suction-thermometer/houyi-suction-thermometer-3.jpg`,
        `${BASE}/houyi-suction-thermometer/houyi-suction-thermometer-4.jpg`,
    ],
    "houyi-telescopic-fishnet": [
        `${BASE}/houyi-telescopic-fishnet/houyi-telescopic-fishnet-1.png`,
        `${BASE}/houyi-telescopic-fishnet/houyi-telescopic-fishnet-2.png`,
        `${BASE}/houyi-telescopic-fishnet/houyi-telescopic-fishnet-3.png`,
    ],
    "houyi-terminalia-leaves": [
        `${BASE}/houyi-terminalia-leaves/houyi-terminalia-leaves-1.png`,
        `${BASE}/houyi-terminalia-leaves/houyi-terminalia-leaves-2.jpg`,
        `${BASE}/houyi-terminalia-leaves/houyi-terminalia-leaves-3.png`,
        `${BASE}/houyi-terminalia-leaves/houyi-terminalia-leaves-4.png`,
        `${BASE}/houyi-terminalia-leaves/houyi-terminalia-leaves-5.jpg`,
    ],
    "houyi-volcanic-stone": [
        `${BASE}/houyi-volcanic-stone/houyi-volcanic-stone-1.jpg`,
        `${BASE}/houyi-volcanic-stone/houyi-volcanic-stone-2.jpg`,
    ],
    "houyi-water-changer-siphon": [
        `${BASE}/houyi-water-changer-siphon/houyi-water-changer-siphon-1.jpg`,
        `${BASE}/houyi-water-changer-siphon/houyi-water-changer-siphon-2.jpg`,
    ],
    "houyi-white-cotton": [
        `${BASE}/houyi-white-cotton/houyi-white-cotton-1.jpg`,
        `${BASE}/houyi-white-cotton/houyi-white-cotton-2.jpg`,
        `${BASE}/houyi-white-cotton/houyi-white-cotton-3.jpg`,
        `${BASE}/houyi-white-cotton/houyi-white-cotton-4.jpg`,
    ],
    "houyi-white-sand": [
        `${BASE}/houyi-white-sand/houyi-white-sand-1.jpg`,
        `${BASE}/houyi-white-sand/houyi-white-sand-2.jpg`,
        `${BASE}/houyi-white-sand/houyi-white-sand-3.jpg`,
    ],
    // wave-pump — يستخدم صورة dophin كبديل مؤقت (لا يوجد له مجلد)
    "houyi-wave-pump": [
        `${BASE}/houyi-dophin-electric-skimmer/houyi-dophin-electric-skimmer-1.jpg`,
    ],
};

async function main() {
    console.log("🔧 بدء إصلاح صور منتجات Houyi...\n");

    let updated = 0;
    let skipped = 0;

    for (const [slug, images] of Object.entries(FIXES)) {
        const thumbnail = images[0];
        try {
            const result = await sql`
                UPDATE products
                SET
                    thumbnail = ${thumbnail},
                    images    = ${JSON.stringify(images)}::jsonb
                WHERE slug = ${slug}
                RETURNING id, name
            `;

            if (result.length > 0) {
                console.log(`✅ ${slug} → ${thumbnail.split("/").pop()}`);
                updated++;
            } else {
                console.log(`⚠️  ${slug} — لم يُوجد في DB`);
                skipped++;
            }
        } catch (e: any) {
            console.error(`❌ ${slug} — خطأ: ${e.message}`);
        }
    }

    console.log(`\n═══════════════════════════════════════════`);
    console.log(`✅ تم تحديث: ${updated} منتج`);
    console.log(`⚠️  لم يُوجد:  ${skipped} منتج`);
    console.log(`═══════════════════════════════════════════`);
    process.exit(0);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
