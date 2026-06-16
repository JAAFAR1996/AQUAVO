const { neon } = require("@neondatabase/serverless");
const fs = require("fs");
const path = require("path");

const sql = neon("postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require");
const HOUYI_DIR = "./client/public/images/products/houyi";

// Manual mapping based on actual inspection
const MAP = [
  { num:1,  name:"Koi Fish Net",                db:"houyi-koi-fish-net",            img:"houyi-koi-fish-net" },
  { num:2,  name:"Nylon Fishing Net (small)",    db:"houyi-nylon-fishing-net",        img:"houyi-nylon-fishing-net" },
  { num:3,  name:"Telescopic Fishnet",           db:"houyi-telescopic-fishnet",       img:"houyi-telescopic-fishnet" },
  { num:4,  name:"5-in-1 Cleaning Tool",         db:"houyi-5-in-1-cleaning-tool",     img:"houyi-5-in-1-cleaning-tool" },
  { num:5,  name:"Water Changer Siphon 3-in-1",  db:"houyi-water-changer-siphon",     img:"houyi-water-changer-siphon" },
  { num:6,  name:"Chubby Thermometer",           db:"houyi-chubby-thermometer",       img:"houyi-chubby-thermometer" },
  { num:7,  name:"Suction Cup Thermometer",      db:"houyi-suction-thermometer",      img:"houyi-suction-thermometer" },
  { num:8,  name:"DoPhin Electric Skimmer",      db:"houyi-dophin-electric-skimmer",  img:"houyi-dophin-electric-skimmer" },
  { num:9,  name:"LED Thermometer (屏显)",        db:"houyi-thermostat",               img:"led屏显温度计" },
  { num:10, name:"Rhododendron 40-45cm",         db:null,                              img:null },
  { num:11, name:"Rhododendron 50-55cm",         db:null,                              img:null },
  { num:12, name:"Rhododendron 30-35cm",         db:null,                              img:null },
  { num:13, name:"Rhododendron Root 30-45cm",    db:null,                              img:null },
  { num:14, name:"Rhododendron Root + Base",     db:null,                              img:null },
  { num:15, name:"Moss Tree",                    db:"houyi-moss-tree",                img:"houyi-moss-tree" },
  { num:16, name:"Polished Driftwood 5-8cm",     db:"houyi-polished-driftwood",       img:"houyi-polished-driftwood" },
  { num:17, name:"Polished Driftwood 8-10cm",    db:"houyi-polished-driftwood",       img:"houyi-polished-driftwood" },
  { num:18, name:"Polished Driftwood 10-15cm",   db:"houyi-polished-driftwood",       img:"houyi-polished-driftwood" },
  { num:19, name:"Polished Driftwood 15-20cm",   db:"houyi-polished-driftwood",       img:"houyi-polished-driftwood" },
  { num:20, name:"Mountain Wood",                db:"houyi-mountain-wood",            img:"houyi-mountain-wood" },
  { num:21, name:"Large Selected Sinking Wood",  db:"houyi-sinking-wood-large",       img:"houyi-sinking-wood" },
  { num:22, name:"Thai Branches Peeled",         db:"houyi-thai-branches",            img:"houyi-thai-branch-peeled" },
  { num:23, name:"Pumice",                       db:"houyi-pumice",                   img:"houyi-pumice" },
  { num:24, name:"Base Fertilizer",              db:"houyi-base-fertilizer",          img:"houyi-base-fertilizer" },
  { num:25, name:"River Sand",                   db:"houyi-river-sand",               img:"houyi-river-sand" },
  { num:26, name:"Stream Sand",                  db:"houyi-stream-sand",              img:"houyi-stream-sand" },
  { num:27, name:"South American Sand",          db:"houyi-south-american-sand",      img:"houyi-south-american-sand" },
  { num:28, name:"White Sand",                   db:"houyi-white-sand",               img:"houyi-white-sand" },
  { num:29, name:"Dutch Sand",                   db:"houyi-dutch-sand",               img:"houyi-dutch-sand" },
  { num:30, name:"Blue Dragon Stone",            db:"houyi-blue-dragon-stone",        img:"houyi-blue-dragon-stone" },
  { num:31, name:"Volcanic Black 3-5cm",         db:"houyi-volcanic-stone",           img:"houyi-volcanic-stone" },
  { num:32, name:"Volcanic RED 3-5cm",           db:"houyi-volcanic-stone",           img:"houyi-volcanic-stone" },
  { num:33, name:"Planting Ring 52x26mm",        db:"houyi-planting-ring",            img:"houyi-planting-ring" },
  { num:34, name:"Moss Glue 5g",                 db:null,                              img:"houyi-moss-glue" },
  { num:35, name:"Moss Glue 20g",                db:null,                              img:"houyi-moss-glue" },
  { num:36, name:"Instant Glue 50g",             db:null,                              img:"houyi-instant-glue-50g" },
  { num:37, name:"Silicone 121",                 db:"houyi-silicone-121",             img:"houyi-silicone-121" },
  { num:38, name:"Ceramic Ring",                 db:"houyi-ceramic-ring",             img:"houyi-ceramic-ring" },
  { num:39, name:"Breathing Ring White",         db:null,                              img:"houyi-breathing-ring-white" },
  { num:40, name:"Activated Carbon",             db:"houyi-activated-carbon",         img:"houyi-activated-carbon" },
  { num:41, name:"White Cotton 30x50",           db:"houyi-white-cotton",             img:"houyi-white-cotton" },
  { num:42, name:"Terminalia Leaves",            db:"houyi-terminalia-leaves",        img:"houyi-terminalia-leaves" },
  { num:43, name:"Foam Glue",                    db:null,                              img:"houyi-foam-glue" },
  { num:44, name:"Medium Cotton Brown 50g",      db:"houyi-medium-cotton",            img:"houyi-medium-cotton" },
  { num:45, name:"Medium Cotton Grey 50g",       db:"houyi-medium-cotton",            img:"houyi-medium-cotton" },
  { num:46, name:"Check Valve",                  db:"houyi-check-valve",              img:"houyi-check-valve" },
  { num:47, name:"Control Valve 4mm",            db:"houyi-control-valve-4mm",        img:"houyi-control-valve-4mm" },
  { num:48, name:"4mm T Connector",              db:"houyi-connectors-4mm",           img:"houyi-connectors-4mm" },
  { num:49, name:"4mm I Connector",              db:"houyi-connectors-4mm",           img:"houyi-connectors-4mm" },
  { num:50, name:"4mm Y Connector",              db:"houyi-connectors-4mm",           img:"houyi-connectors-4mm" },
  { num:51, name:"4 Port Blue Distributor",      db:"houyi-air-distributor",          img:"houyi-air-distributor" },
  { num:52, name:"6 Port Blue Distributor",      db:"houyi-air-distributor",          img:"houyi-air-distributor" },
  { num:53, name:"Stainless Shunt 4-port",       db:"houyi-stainless-shunt",          img:"houyi-stainless-steel-shunt" },
  { num:54, name:"Stainless Shunt 6-port",       db:"houyi-stainless-shunt",          img:"houyi-stainless-steel-shunt" },
  { num:55, name:"Tracheal Suction Cup",         db:null,                              img:"houyi-tracheal-suction-cup" },
  { num:56, name:"Hose Brush 1.55m",             db:"houyi-hose-brush",               img:"houyi-hose-brush" },
  { num:57, name:"Mesh 8x8cm",                   db:"houyi-mesh",                     img:"houyi-mesh" },
  { num:58, name:"Net Bag (6 sizes)",            db:"houyi-net-bag",                  img:null },
];

const imageFolders = new Set(
  fs.readdirSync(HOUYI_DIR)
    .filter(f => { try { return fs.statSync(path.join(HOUYI_DIR, f)).isDirectory(); } catch { return false; } })
    .map(f => f.toLowerCase())
);

async function run() {
  const dbRows = await sql`SELECT slug FROM products WHERE slug LIKE 'houyi-%'`;
  const dbSlugs = new Set(dbRows.map(r => r.slug));

  let okBoth = 0;
  const missingDB = [];
  const missingImg = [];
  const missingBoth = [];

  for (const m of MAP) {
    const inDB = m.db ? dbSlugs.has(m.db) : false;
    const hasImg = m.img ? imageFolders.has(m.img.toLowerCase()) : false;

    if (inDB && hasImg)        { okBoth++; continue; }
    if (!inDB && !hasImg)      { missingBoth.push(m); continue; }
    if (!inDB && hasImg)       { missingDB.push(m); }
    if (inDB && !hasImg)       { missingImg.push(m); }
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log(" مقارنة Excel vs قاعدة البيانات vs مجلد الصور");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(" Excel (unique entries): " + MAP.length);
  console.log(" DB (houyi products):    " + dbSlugs.size);
  console.log(" Image folders:          " + imageFolders.size);
  console.log("───────────────────────────────────────────────────────────");
  console.log(" ✅ موجود في DB + صورته:  " + okBoth);
  console.log(" ❌ صورة موجودة، DB غائب: " + missingDB.length);
  console.log(" 🖼️  DB موجود، صورة غائبة: " + missingImg.length);
  console.log(" 💀 غائب من DB والصور:    " + missingBoth.length);
  console.log("═══════════════════════════════════════════════════════════");

  if (missingBoth.length > 0) {
    console.log("\n💀 غائب تماماً من DB ومن مجلد الصور:");
    missingBoth.forEach(p => console.log("  #" + p.num + " " + p.name));
  }

  if (missingDB.length > 0) {
    console.log("\n❌ الصورة موجودة لكن المنتج مفقود من DB:");
    missingDB.forEach(p => console.log("  #" + p.num + " " + p.name + "  (folder: " + p.img + ")"));
  }

  if (missingImg.length > 0) {
    console.log("\n🖼️  المنتج موجود في DB لكن لا صورة له:");
    missingImg.forEach(p => console.log("  #" + p.num + " " + p.name + "  (slug: " + p.db + ")"));
  }

  process.exit(0);
}

run().catch(e => { console.error("Error:", e.message); process.exit(1); });
