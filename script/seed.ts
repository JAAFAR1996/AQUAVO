import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";
import { db } from "../server/db.js";
import { products } from "../shared/schema";

type RawProduct = {
  "#": number;
  Category: string;
  Name: string;
  "Name (Arabic)": string;
  Quantity: number;
  "Price USD": number;
  "Price IQD": number;
  "Total USD": number;
  "Total IQD": number;
  Supplier: string;
  Status: string;
  Description: string;
};

const DRY_RUN = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workbookPath = path.resolve(
  __dirname,
  "../attached_assets/aquarium-export-20251104-1762273765845_1764301726954.xlsx",
);
const localImageDir = path.resolve(__dirname, "../client/public/products");

const categoryFallback: Record<string, string> = {
  "إضاءات": "/stock_images/aquarium_canister_fi_ebe5d7af.jpg",
  "طعام الأسماك": "/stock_images/aquarium_water_condi_76f4e911.jpg",
  "الأدوية": "/stock_images/aquarium_water_condi_76f4e911.jpg",
  "معالجة المياه": "/stock_images/aquarium_water_condi_76f4e911.jpg",
  "مجموعات الاختبار": "/stock_images/aquarium_water_condi_76f4e911.jpg",
  "الملح والمعادن": "/stock_images/aquarium_water_condi_76f4e911.jpg",
  "البكتيريا النافعة": "/stock_images/aquarium_water_condi_76f4e911.jpg",
  "مكافحة الطحالب": "/stock_images/aquarium_water_condi_76f4e911.jpg",
  "فيتامينات المياه العذبة": "/stock_images/aquarium_water_condi_76f4e911.jpg",
  "مكملات غذائية": "/stock_images/aquarium_water_condi_76f4e911.jpg",
  "اكسسوارات": "/stock_images/aquarium_canister_fi_ebe5d7af.jpg",
  "اكسسوارات ": "/stock_images/aquarium_canister_fi_ebe5d7af.jpg",
  "ادوات فلتر": "/stock_images/aquarium_canister_fi_ebe5d7af.jpg",
  "أجهزة القياس والحرارة": "/stock_images/aquarium_heater_prod_b5512720.jpg",
  "سخانات": "/stock_images/aquarium_heater_prod_b5512720.jpg",
  "فلاتر ماء": "/stock_images/aquarium_canister_fi_ebe5d7af.jpg",
  "مضخات هواء": "/stock_images/aquarium_canister_fi_ebe5d7af.jpg",
  "ديكور": "/stock_images/anubias_nana_aquariu_554af5dc.jpg",
  "صخور": "/stock_images/anubias_nana_aquariu_554af5dc.jpg",
  "خلفيات أحواض": "/stock_images/anubias_nana_aquariu_554af5dc.jpg",
  "ترب نباتية": "/stock_images/anubias_nana_aquariu_554af5dc.jpg",
};

const workbook = XLSX.readFile(workbookPath, { cellDates: false });
const sheet = workbook.Sheets["Products"];
if (!sheet) throw new Error("Products sheet not found in workbook");

const rawProducts: RawProduct[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const toNumber = (value: unknown) => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
};

const deriveBrand = (row: RawProduct) => {
  const name = (row.Name || "").toString().trim();
  const supplier = (row.Supplier || "").toString().trim();
  const firstToken = name.split(/\s+/)[0]?.replace(/[^A-Za-z0-9-]/g, "");
  if (firstToken && firstToken.length >= 2) return firstToken.toUpperCase();
  if (supplier) return supplier;
  return "Generic";
};

const buildDescription = (row: RawProduct, priceIQD: number, stock: number) => {
  const arName = (row["Name (Arabic)"] || row.Name || "منتج").toString().trim();
  const enName = (row.Name || row["Name (Arabic)"] || "Product").toString().trim();
  const short = (row.Description || "").toString().trim();
  const supplier = (row.Supplier || "غير محدد").toString().trim();
  const availability = stock <= 3 ? "الكمية محدودة، احجز الآن." : "متوفر للشحن السريع.";
  const priceText = priceIQD > 0 ? priceIQD.toLocaleString("en-US") : "--";
  const benefit = short || "تحسين صحة الأسماك وجودة الماء بخامات أصلية موثوقة";
  const englishBenefit = short || "Original quality to boost fish health and water clarity";

  const arCopy = `${arName} — ${benefit}. السعر ${priceText} د.ع للقطعة؛ المتوفر ${stock} قطعة. المورد: ${supplier}. ${availability}`;
  const enCopy = `${enName} — ${englishBenefit}. Price ${priceText} IQD each; stock ${stock}. Supplier: ${supplier}. ${stock <= 3 ? "Low stock—reserve yours now." : "Fast dispatch available."}`;
  return `${arCopy} | ${enCopy}`;
};

const seedProducts = rawProducts.map((row) => {
  const priceIQD = toNumber(row["Price IQD"]);
  const priceUSD = toNumber(row["Price USD"]);
  const stock = toNumber(row.Quantity);
  const nameEn = (row.Name || "").toString().trim();
  const slugBase = slugify(nameEn || row["Name (Arabic)"] || `product-${row["#"]}`);
  const slug = slugBase ? `${slugBase}-${row["#"]}` : `product-${row["#"]}`;
  const displayName = row["Name (Arabic)"]
    ? `${row["Name (Arabic)"]} | ${nameEn || row["Name (Arabic)"]}`
    : nameEn || `Product ${row["#"]}`;
  const lowStock = Math.max(1, Math.min(5, Math.floor(stock / 3) || 2));
  const baseDesc = (row.Description || "").toString().trim();

  const imagePath = `/products/${slug}.jpg`;
  const localPath = path.join(localImageDir, `${slug}.jpg`);
  const thumbnail =
    fs.existsSync(localPath) && fs.statSync(localPath).size > 0
      ? imagePath
      : categoryFallback[row.Category] || "/stock_images/aquarium_canister_fi_ebe5d7af.jpg";

  return {
    id: `p-${row["#"]}-${slugBase || "item"}`,
    slug,
    name: displayName,
    brand: deriveBrand(row),
    category: (row.Category || "Other").toString().trim(),
    subcategory: (row.Category || "General").toString().trim(),
    description: buildDescription(row, priceIQD, stock),
    price: priceIQD
      ? priceIQD.toString()
      : priceUSD
        ? Math.round(priceUSD * 1300).toString()
        : "0",
    originalPrice: priceIQD ? Math.round(priceIQD * 1.1).toString() : undefined,
    currency: "IQD",
    images: [fs.existsSync(localPath) ? imagePath : thumbnail],
    thumbnail,
    rating: "4.8",
    reviewCount: 0,
    stock,
    lowStockThreshold: lowStock,
    isNew: true,
    isBestSeller: stock >= 15,
    specifications: {
      supplier: row.Supplier || "N/A",
      status: row.Status || "unspecified",
      baseDescription: baseDesc,
      category: row.Category,
      sheetRow: row["#"],
      quantity: stock,
      priceUSD: priceUSD || undefined,
      totalUSD: toNumber(row["Total USD"]) || undefined,
      totalIQD: toNumber(row["Total IQD"]) || undefined,
    },
  };
});

async function seed() {
  console.log("Loading products from Excel workbook...");
  console.log(`Workbook path: ${workbookPath}`);
  console.log(`Rows parsed: ${String(seedProducts.length).replace(/\n|\r/g, "")}`);

  if (DRY_RUN) {
    console.log("DRY_RUN is enabled. Previewing first 3 products:");
    seedProducts.slice(0, 3).forEach((p) => {
      console.log(`- ${p.slug} | ${p.price} IQD | stock ${p.stock}`);
    });
    console.log("Skipping database write because DRY_RUN=1");
    return;
  }

  try {
    console.log("Clearing existing product data...");
    await db.delete(products);

    for (const product of seedProducts) {
      console.log(`Inserting ${String(product.slug).replace(/\n|\r/g, "")}`);
      await db.insert(products).values(product).onConflictDoNothing();
    }

    console.log("Database seeded successfully with products from Excel.");
    console.log(`Total inserted: ${String(seedProducts.length).replace(/\n|\r/g, "")}`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
