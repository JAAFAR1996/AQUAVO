/**
 * Final expansion phase — complete freshwater domain map vs the live corpus.
 *
 *   npx tsx docs/knowledge-center/final/domain-map.mjs
 *
 * Every concept in the map is matched against the full text of every published
 * article. A concept is:
 *   OWNED    — some article's TITLE carries it (an article exists for it)
 *   MENTION  — it appears in bodies but no title owns it
 *   ABSENT   — it appears nowhere
 *
 * Arabic matching caution, learned the hard way across cycles 10-12: short roots
 * match inside unrelated words. `قط` matched inside `انقطاع` (outage) and
 * inflated "catfish" to 84 articles; `بيض` matches `أبيض` (white); `رام` matches
 * inside ordinary words. Every pattern here is multi-character and distinctive,
 * and anything surprising is re-checked by hand before it reaches the roadmap.
 */
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const CACHE = process.argv[2];
if (!CACHE) { console.error("usage: domain-map.mjs <cache-dir>"); process.exit(2); }

const posts = (b => Array.isArray(b) ? b : b.posts)(JSON.parse(fs.readFileSync(path.join(CACHE, "corpus.json"), "utf8")));
const doc = {}, titles = {};
for (const p of posts) {
  const f = path.join(CACHE, p.slug.replace(/[^a-zA-Z0-9؀-ۿ-]/g, "_") + ".json");
  const r = (j => j.post || j)(JSON.parse(fs.readFileSync(f, "utf8")));
  doc[p.slug] = (r.content || "").replace(/<[^>]+>/g, " ");
  titles[p.slug] = r.title || "";
}

// area -> concept -> distinctive Arabic/Latin pattern
const MAP = {
  "fish care": {
    "species: betta": "بيتا|الفايتر", "species: goldfish": "الجولدفش|جولدفش",
    "species: guppy": "الجوبي|جوبي", "species: molly/platy": "المولي|البلاتي",
    "species: swordtail": "سوردتيل|سوروتيل", "species: neon tetra": "النيون تيترا",
    "species: cardinal tetra": "كاردينال", "species: rasbora": "رازبورا|راسبورا",
    "species: danio": "دانيو", "species: barb": "البارب|بارب",
    "species: angelfish": "الأنجل", "species: discus": "الديسكس",
    "species: oscar": "الأوسكار", "species: flowerhorn": "الفلورهورن",
    "species: african cichlid": "السيكلد الإفريقي|السيكلد الأفريقي",
    "species: dwarf cichlid": "السيكلد القزم|راميريزي|أبيستوغراما",
    "species: gourami": "الغورامي", "species: pleco": "البليكو|بليكوستوموس",
    "species: corydoras": "كوريدوراس", "species: otocinclus": "أوتوسينكلس",
    "species: loach": "اللوتش|كلاون لوتش", "species: arowana": "الأروانا",
    "species: koi": "الكوي", "species: pufferfish": "البفر فيش",
    "species: rainbowfish": "الرينبو|قوس قزح",
    "species: killifish": "كيلي فيش|كيليفيش",
    "species: catfish (synodontis/pangasius)": "سينودونتس|بانجاسيوس|قرش المياه العذبة",
    "species: shark-type sold small": "تكبر أكثر مما تتوقع|تنباع صغيرة",
    "fish lifespan / commitment": "متوسط عمر السمكة|كم تعيش السمكة",
    "sexing fish": "تمييز الذكر|الذكر من الأنثى",
    "schooling minimums": "الأسماك السربية|سربية",
    "aggression / territoriality": "العدوانية|المطاردة",
    "tank mates compatibility": "التوافق|جيران السكن",
    "turtles with fish": "السلاحف",
  },
  "diseases": {
    "diagnosis hub": "تشخيص أعراض|العرض ← الاحتمال",
    "ich / white spot": "النقط البيضاء",
    "fin rot": "تعفن الزعانف",
    "fungus vs columnaris": "كولومناريس|الزغب الأبيض",
    "dropsy / buoyancy": "الاستسقاء|كيس السباحة",
    "popeye / eye problems": "جحوظ|انتفاخ العين|عتامة العين",
    "cloudy eye": "العين الغائمة|عين غائمة",
    "mouth fungus": "فطر الفم",
    "wasting / skinny disease": "الهزال|هزال",
    "tumors / lumps": "أورام|زوائد غريبة",
    "gas bubble disease": "فقاعات الغاز",
    "ammonia burn": "حرق الأمونيا|احتراق الخياشيم",
    "temperature shock": "صدمة حرارية",
    "fish TB / zoonosis": "السل السمكي|مايكوباكتيريا|ينتقل للإنسان",
    "hospital tank / how to medicate": "حوض العلاج|الجرعة والمدة",
    "medication safety for scaleless": "عديمة الحراشف",
    "water change during illness": "تبديل الماء أثناء العلاج",
  },
  "parasites": {
    "external parasite hub": "طفيليات خارجية",
    "velvet": "المخمل",
    "flukes": "ديدان الخياشيم|ديدان الجلد",
    "anchor worm": "دودة المرساة",
    "fish lice": "قمل السمك",
    "internal worms": "الطفيليات الداخلية|ديدان داخلية",
    "hexamita / hole in head": "ثقب الرأس|هيكسامينا",
  },
  "water chemistry": {
    "nitrogen cycle": "الدورة البيولوجية",
    "ammonia spike": "ارتفاع الأمونيا",
    "nitrite spike": "ارتفاع النتريت",
    "nitrate reduction": "خفض النترات|النترات المرتفعة",
    "pH meaning": "درجة الحموضة|الحموضة pH",
    "GH / KH / TDS": "القساوة GH|GH و KH",
    "adjust water vs choose fish": "تعدّل الماء أم|هل تعدل الماء",
    "remineralisation / RO mixing": "خلط RO|إعادة التمعدن|مياه RO",
    "chlorine / chloramine": "الكلور|الكلورامين",
    "phosphate": "الفوسفات",
    "dissolved oxygen": "الأوكسجين الذائب",
    "CO2": "ثاني أكسيد الكربون",
    "buffering / stability": "الثبات|تذبذب",
    "test kit reading": "قراءة اختبارات|قراءة الفحص",
    "test frequency": "كم مرة تفحص",
  },
  "filtration": {
    "filter types": "أي فلتر يناسب|أنواع الفلاتر",
    "filter media": "ميديا الفلتر|السيراميك رينغز",
    "activated carbon": "الفحم النشط",
    "sump vs canister": "السامب",
    "sponge filter": "فلتر إسفنجي",
    "filter maintenance / cleaning media": "تنظيف الميديا|غسل الميديا",
    "beneficial bacteria products": "البكتيريا النافعة|سائل البكتيريا",
    "tank without a filter": "حوض بلا فلتر",
  },
  "equipment": {
    "heater choice": "السخان",
    "air pump / aeration": "مضخة الهواء",
    "water flow / current": "التيار وحركة الماء",
    "lighting for plants": "إضاءة الأحواض المزروعة",
    "photoperiod": "المدة قبل الشدة|ساعات الإضاءة",
    "electrical safety": "السلامة الكهربائية|حلقة التنقيط",
    "power outage kit": "انقطاع الكهرباء",
    "tank placement / stand / weight": "أين تضع الحوض|وزن الحوض",
    "choosing a tank": "كيف تختار حوض",
    "capacity calculation": "حساب سعة",
    "UV steriliser": "معقم فوق البنفسجي",
    "auto feeder": "موزع علف|مغذي أوتوماتيكي",
    "pump noise / vibration": "ضجيج المضخة|صوت المضخة",
    "leaks / silicone failure": "تسريب الحوض|فشل السيليكون",
    "running cost / electricity": "كلفة التشغيل|استهلاك الكهرباء",
  },
  "plants": {
    "low-tech plants": "نباتات منخفضة الاحتياج|Low Tech",
    "fertiliser": "تسميد النباتات",
    "substrate / soil": "التربة البركانية|الركيزة",
    "trimming / propagation": "تقليم النباتات",
    "plant problems (yellowing/holes)": "اصفرار وثقوب|مشاكل النباتات",
    "amazon sword": "الأمازون سورد",
    "real vs fake plants": "طبيعية أم صناعية",
    "new plant acclimation / melt": "ذوبان النبات|أقلمة النبات",
    "plants for hard water": "نباتات تتحمل القساوة",
  },
  "shrimp/snails": {
    "shrimp & snail basics": "الروبيان والحلزون",
    "copper danger": "النحاس يقتل",
    "snail population control": "تكاثر الحلزون",
    "shrimp breeding / colony": "تفريخ الروبيان|مستعمرة الروبيان",
    "shrimp moulting / GH": "انسلاخ الروبيان",
  },
  "breeding": {
    "breeding as a decision": "التفريخ كقرار",
    "livebearers": "الأسماك الولودة",
    "egg-layer strategies": "حاضنات الفم|ناثرات البيض",
    "fry rearing / grow-out": "تربية الصغار",
    "fry first foods": "ارتيميا|إنفوزوريا",
    "culling / rehoming fry": "إيجاد بيت|التخلص من الصغار",
  },
  "feeding": {
    "feeding guide": "تغذية أسماك الزينة|دليل التغذية",
    "overfeeding": "الإفراط بالعلف",
    "vegetables": "إطعام الخضراوات",
    "food brands comparison": "مقارنة الأعلاف",
    "live food": "علف حي|دود الدم",
    "frozen food handling": "العلف المجمد",
    "fasting days": "يوم صيام|الصيام الأسبوعي",
    "holiday / travel feeding": "السفر وترك الحوض",
  },
  "emergencies": {
    "sudden death rescue": "موت أسماك الزينة فجأة",
    "cloudy water": "ماء الحوض معكّر",
    "green water bloom": "الماء الأخضر",
    "airborne toxins": "سموم الهواء",
    "jumping / lids": "تقفز الأسماك",
    "summer heat": "حرارة الصيف|صيف العراق",
    "winter heating": "السخان ضروري بالشتاء",
    "what to do when a fish dies": "السمكة الميتة|إذا ماتت سمكة",
  },
  "buying decisions": {
    "how to pick a healthy fish": "اختيار سمكة سليمة|علامات السمكة السليمة",
    "avoiding scam sellers": "المتاجر الوهمية",
    "prices": "أسعار أسماك الزينة",
    "store guide": "أفضل متجر",
    "import origins": "استيراد أسماك الزينة",
    "hardy beginner fish": "أسماك لا تموت بسرعة|أقوى الأسماك للمبتدئين",
    "saltwater vs freshwater": "العذب والمالح|الزينة البحرية",
  },
  "safety": {
    "electrical / drip loop": "حلقة التنقيط",
    "human hygiene / handwashing": "غسل اليدين|جرح باليد",
    "human medicine danger": "الأدوية البشرية",
    "structural load deferral": "مختص بناء",
    "children and the tank": "الأطفال",
  },
  "aquascaping": {
    "hardscape arrangement": "ترتيب صخور|Hardscape",
    "iwagumi": "إيواغومي",
    "budget aquascaping": "ديكور مذهل بميزانية|أسرار الأكواسكيب",
    "3D background": "خلفيات ثلاثية الأبعاد",
    "biotope": "بيوتوب",
    "safe rocks and wood": "اختبار الخل|هذا الحجر أو الخشب آمن",
    "driftwood prep / tannins": "الأخشاب المتحجرة|اصفرار الماء",
    "composition rules": "قاعدة الأثلاث|النسبة الذهبية|نقطة التركيز",
    "substrate & decor選 guide": "تربة وديكور",
  },
  "maintenance": {
    "water change": "تغيير ماء الحوض",
    "cleaning without killing bacteria": "تنظيف الحوض بلا قتل",
    "algae guide": "دليل الطحالب",
    "black beard algae": "طحالب اللحية السوداء",
    "hair / thread algae": "طحالب خيطية|طحالب الشعر",
    "surface film": "الغشاء السطحي|طبقة زيتية",
    "quarantine": "الحجر الصحي",
    "acclimation": "أقلمة السمكة",
    "stocking order": "ترتيب إدخال الأسماك",
    "stocking limits": "كم سمكة يتحمل",
    "transport / moving": "نقل الأسماك ونقل الحوض",
    "tank teardown / restart": "تفكيك الحوض|إعادة تشغيل الحوض",
    "aquarium photography": "تصوير الحوض|تصوير حوض",
  },
};

const rows = [];
for (const [area, concepts] of Object.entries(MAP)) {
  for (const [concept, pattern] of Object.entries(concepts)) {
    const re = new RegExp(pattern, "i");
    const gre = new RegExp(pattern, "gi");
    let owner = null; const mentions = [];
    for (const s of Object.keys(doc)) {
      if (re.test(titles[s])) owner = owner || s;
      const m = (titles[s] + " " + doc[s]).match(gre);
      if (m) mentions.push([m.length, s]);
    }
    mentions.sort((a, b) => b[0] - a[0]);
    rows.push({ area, concept, status: owner ? "OWNED" : mentions.length ? "MENTION" : "ABSENT",
                owner, arts: mentions.length, top: mentions.slice(0, 3).map(m => `${m[0]}x ${m[1]}`) });
  }
}

const order = { ABSENT: 0, MENTION: 1, OWNED: 2 };
rows.sort((a, b) => order[a.status] - order[b.status] || a.area.localeCompare(b.area));

const counts = rows.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {});
console.log(`concepts mapped: ${rows.length}`);
console.log(`  OWNED   : ${counts.OWNED || 0}`);
console.log(`  MENTION : ${counts.MENTION || 0}  (appears in bodies, no article owns it)`);
console.log(`  ABSENT  : ${counts.ABSENT || 0}\n`);

for (const st of ["ABSENT", "MENTION"]) {
  console.log(`===== ${st} =====`);
  for (const r of rows.filter(x => x.status === st)) {
    console.log(`  [${r.area}] ${r.concept}`.padEnd(62) + (r.status === "MENTION" ? `arts=${r.arts}  ${r.top.join(" | ")}` : ""));
  }
  console.log();
}
fs.writeFileSync(path.join(HERE, "domain-map-result.json"), JSON.stringify(rows, null, 1));
console.log(`OWNED concepts: ${rows.filter(r => r.status === "OWNED").length} (full list in domain-map-result.json)`);
