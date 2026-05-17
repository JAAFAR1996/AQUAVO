from __future__ import annotations

import csv
import html
import re
import shutil
import textwrap
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse

try:
    import requests
except Exception:  # pragma: no cover
    requests = None


ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = ROOT / "AQUAVO_Product_Research_Complete"


FIELD_ORDER = [
    "Brand",
    "Model",
    "Size",
    "Color",
    "Material",
    "Power / Watt",
    "Voltage",
    "Capacity",
    "Dimensions",
    "Weight",
    "Package contents",
    "Usage",
    "Compatibility",
]


MANUAL_SOURCES = {
    "YEE-3006": [
        {
            "label": "Elmir Ukraine - exact YSH-50 / YEE-3006 listing",
            "url": "https://elmir.ua/ua/heaters_for_aquariums/heater_yee_ysh-50_19cm_50w_yee-3006.html",
            "type": "exact",
            "notes": "Confirms YSH-50, YEE-3006, 50W, 190mm, 12-34 C, 1m cable.",
        },
        {
            "label": "Alibaba - YEE 50W/100W/200W/300W/500W heater listing",
            "url": "https://www.alibaba.com/product-detail/YEE-50W-100W-200W-300W-500W_1601027894425.html",
            "type": "family",
            "notes": "Alibaba family listing; exact current accessibility may vary by region.",
        },
    ],
    "YTZ-300": [
        {
            "label": "Damsel Dubai - exact YTZ-300 product page",
            "url": "https://damselbiz.com/products/shop-by-category/oxygen-air-pump/yee-mini-air-pump-oxygen-pump-ytz-300",
            "type": "exact",
            "notes": "Exact model name YTZ-300; brand shown as Yee Aquarium.",
        },
        {
            "label": "8Garden - exact YEE YTZ-300 air pump",
            "url": "https://8garden.com/products/aquarium-air-pump-single-nozzle-1-5l-minute-3-watt-yee-ytz-300",
            "type": "exact",
            "notes": "Confirms single nozzle, 1.5L/min, 3W, 30-60L fish tank.",
        },
        {
            "label": "Aqua-Deco Ukraine - exact YTZ-300 specs",
            "url": "https://aqua-deco.com.ua/product/kompresor-yee-dlya-akvariuma-bezshumnij-3-vt-ytz-300/",
            "type": "exact",
            "notes": "Confirms 1 output, 1.5L/min, 3W, 30-60L, 10.5 x 7.5 x 5 cm.",
        },
    ],
    "C4-1123": [
        {
            "label": "Alibaba - exact C4-1123 model listing",
            "url": "https://www.alibaba.com/product-detail/YEE-Accurate-7-in-1-Kit_11000005488940.html",
            "type": "exact",
            "notes": "Shows Model Number C4-1123 and YEE 9 in 1 test strip product, but states 35 strips in that listing.",
        },
        {
            "label": "Thai Aquarium Center - YEE 9 in 1 50 pcs",
            "url": "https://thaiaquariumcenter.tarad.com/products_detail/view/7875551",
            "type": "exact",
            "notes": "Third-party 50-piece YEE 9 in 1 retail listing.",
        },
        {
            "label": "Thai Aquarium Center - YEE 9 in 1 water test strips",
            "url": "https://thaiaquariumcenter.tarad.com/products_detail/view/7692475",
            "type": "exact",
            "notes": "Third-party listing mentions 50 strips per bottle and measured parameters.",
        },
    ],
    "YFF-049": [
        {
            "label": "YEE official - Aquarium Soil family",
            "url": "https://yeeaquarium.com/product/yee-wholesale-aquarium-soil/",
            "type": "family",
            "notes": "Official product family for YEE aquarium soil.",
        },
        {
            "label": "Ultimate Aqua SG - YEE aquatic mud / nature soil variants",
            "url": "https://ultimateaquasg.com/products/yee-aquatic-mud-fish-tank-cleaner-nature-aquatic-soils-as-water-purifier-anti-algae",
            "type": "variant",
            "notes": "Lists YEE soil variants including fine/coarse and 1.5L/3L options.",
        },
        {
            "label": "Thai Aquarium Center - YEE Amazon Nature Aqua Soil 1.5L",
            "url": "https://thaiaquariumcenter.tarad.com/products_detail/view/7876070",
            "type": "variant",
            "notes": "Third-party 1.5L YEE Amazon Nature Aqua Soil listing.",
        },
    ],
    "YYH-053": [
        {
            "label": "Daraz Bangladesh - YEE Blue Classic Methylene Blue 235ml",
            "url": "https://www.daraz.com.bd/products/yee-blue-classic-methylene-blue-for-aquarium-fish-235ml-i410393336.html",
            "type": "exact",
            "notes": "Third-party 235ml page matching the local product name.",
        }
    ],
    "YEE-3606": [
        {
            "label": "YEE official - Digital Aquarium Thermometer family",
            "url": "https://yeeaquarium.com/product/digital-aquarium-thermometer/",
            "type": "family",
            "notes": "Official digital thermometer family; exact YEE-3606 code not visible.",
        }
    ],
    "C4-1067": [
        {
            "label": "JD search/category result - YEE 3W oil film processor",
            "url": "https://www.jd.com/chanpin/652153.html",
            "type": "possible",
            "notes": "Search/category result mentions YEE 3W oil film processor; not an exact product page.",
        }
    ],
    "YSL-506": [
        {
            "label": "JD search/category result - pneumatic double-room incubator examples",
            "url": "https://www.jd.com/xinghao/6994b18b8bb30cb538f7.html",
            "type": "possible",
            "notes": "Generic incubator category result; not confirmed as YEE or exact YSL-506.",
        }
    ],
    "YKL-018": [
        {
            "label": "JD search/category result - acrylic incubator examples",
            "url": "https://www.jd.com/chanpin/2408209.html",
            "type": "possible",
            "notes": "Generic acrylic isolation/incubator category result; not confirmed as YEE or exact YKL-018.",
        }
    ],
}


OFFICIAL_FUZZY = {
    "C4-1117": [
        ("YEE official possible family - underwater/internal filter", "https://yeeaquarium.com/product/yee-underwater-filter-wholesale/"),
        ("YEE official possible family - submersible water pump", "https://yeeaquarium.com/product/fish-tank-submersible-water-pump-wholesale/"),
    ],
    "YLL-087": [
        ("YEE official possible family - aquarium filter cotton", "https://yeeaquarium.com/product/yee-wholesale-aquarium-filter-cotton/"),
        ("YEE official possible family - non-glue filter cotton", "https://yeeaquarium.com/product/yee-wholesale-aquarium-non-glue-filter-cotton/"),
    ],
    "YFF-042": [
        ("YEE official possible family - ceramic bio filter media rings", "https://yeeaquarium.com/product/yee-ceramic-bio-filter-media-rings/"),
        ("YEE official possible family - aquarium ceramic rings", "https://yeeaquarium.com/product/yee-wholesale-aquarium-ceramic-rings/"),
    ],
    "YAA-009.": [
        ("YEE official possible family - nitrifying bacteria bio bricks", "https://yeeaquarium.com/product/yee-wholesale-nitrifying-bacteria-bio-bricks/"),
    ],
    "NYH-006": [
        ("YEE official possible family - 6 in 1 filter materials", "https://yeeaquarium.com/product/yee-wholesale-6-in-1-aquarium-filter-materials/"),
    ],
    "YLC-410": [
        ("YEE official possible family - 6 in 1 filter materials", "https://yeeaquarium.com/product/yee-wholesale-6-in-1-aquarium-filter-materials/"),
    ],
    "YLC-409": [
        ("YEE official possible family - 6 in 1 filter materials", "https://yeeaquarium.com/product/yee-wholesale-6-in-1-aquarium-filter-materials/"),
    ],
    "LED-318": [
        ("YEE official possible family - mini USB aquarium clamp light", "https://yeeaquarium.com/product/mini-usb-aquarium-clamp-light/"),
        ("YEE official possible family - aquarium LED light", "https://yeeaquarium.com/product/wholesale-aquarium-led-light/"),
    ],
    "CLS-107": [
        ("YEE official family - mini magnetic aquarium cleaning brush", "https://yeeaquarium.com/product/mini-magnetic-aquarium-cleaning-brush/"),
    ],
    "YEE-3656": [
        ("YEE official family - digital aquarium thermometer", "https://yeeaquarium.com/product/digital-aquarium-thermometer/"),
    ],
}


SOURCE_PRODUCT_MAP = {
    "YEE-3006_YSH-50": {"codes": ["YEE-3006"], "certainty": "matched"},
    "C4-1432_Quartz_Heater_100W": {"codes": ["C4-1432"], "certainty": "matched"},
    "C4-1103_Black_Warrior_Heater": {"codes": ["C4-1103"], "certainty": "matched"},
    "03326_YTZ-300": {"codes": ["YTZ-300"], "certainty": "matched"},
    "07154_YGG-135_50mm_Diffuser": {"codes": ["YGG-135"], "certainty": "possible"},
    "C5-1144_1p5m_Enhanced": {"codes": ["C5-1144"], "certainty": "matched"},
    "YEE-3621_1p7m_Water_Changer": {"codes": ["YEE-3621"], "certainty": "matched"},
    "Alibaba_Official_Weifang_Yipin_YEE_Heaters": {
        "codes": ["YEE-3006", "C4-1432", "C4-1103"],
        "certainty": "possible",
    },
    "Alibaba_Official_Weifang_Yipin_Water_Changer": {
        "codes": ["C5-1144", "YEE-3621"],
        "certainty": "possible",
    },
    "Alibaba_Official_Weifang_Yipin_Nano_Air_Disc": {
        "codes": ["YGG-135"],
        "certainty": "possible",
    },
}


def find_dir_with_file(filename: str, extra_dir: str | None = None) -> Path:
    for p in ROOT.iterdir():
        if not p.is_dir():
            continue
        if extra_dir and not (p / extra_dir).exists():
            continue
        if (p / filename).exists():
            return p
    raise FileNotFoundError(filename)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def split_anchor(text: str) -> dict[str, str]:
    result: dict[str, str] = {}
    match = re.search(r"Row\s+(\d+):\s*(.*)", text)
    if match:
        result["row"] = match.group(1)
        rest = match.group(2)
    else:
        rest = text
    for part in rest.split(" | "):
        if "=" in part:
            key, value = part.split("=", 1)
            result[key.strip()] = value.strip()
    return result


def slug(text: str, max_len: int = 52) -> str:
    text = text.replace("×", "x").replace("*", "x")
    text = re.sub(r"[^\w\-\.]+", "_", text, flags=re.ASCII)
    text = re.sub(r"_+", "_", text).strip("_")
    return text[:max_len] or "Product"


def extract_specs(name: str, code: str, item_code: str) -> dict[str, str]:
    specs = {field: "غير مؤكد من المصادر المتاحة" for field in FIELD_ORDER}
    low = name.lower()

    specs["Brand"] = "YEE" if "yee" in low or code.upper().startswith(("YEE", "YYH", "YAN", "YFF", "YTZ", "YGG", "YKK", "YXL")) else "غير مؤكد"
    if "nepall" in low or code.upper().startswith("NYH"):
        specs["Brand"] = "Nepall / YEE (حسب نص الطلب والصورة الأصلية)"
    specs["Model"] = f"{code}; item code: {item_code}"

    if "heater" in low or "heating" in low:
        specs["Usage"] = "تسخين ماء حوض الأسماك"
        specs["Compatibility"] = "أحواض أسماك؛ نوع الماء غير مؤكد إلا إذا ذكر المصدر"
    elif "pump" in low or "oxygen" in low:
        specs["Usage"] = "تهوية/ضخ هواء لحوض الأسماك"
        specs["Compatibility"] = "أحواض أسماك صغيرة إلى متوسطة حسب المصدر"
    elif "diffuser" in low or "air stone" in low:
        specs["Usage"] = "توزيع فقاعات الهواء"
    elif "water change" in low or "water changer" in low:
        specs["Usage"] = "تغيير ماء وتنظيف الحوض"
    elif "filter" in low or "culture" in low or "media" in low:
        specs["Usage"] = "ترشيح/دعم البكتيريا النافعة"
    elif "food" in low or "feed" in low or "brine shrimp" in low:
        specs["Usage"] = "طعام/تغذية للكائنات المائية"
    elif "test" in low or "tester" in low:
        specs["Usage"] = "اختبار جودة ماء الحوض"
    elif "soil" in low or "mud" in low:
        specs["Usage"] = "تربة/سوبستريت للنباتات المائية"
    elif "thermometer" in low:
        specs["Usage"] = "قياس درجة حرارة الحوض"
    elif "tank" in low:
        specs["Usage"] = "حوض زجاجي"

    watts = re.findall(r"(\d+(?:\.\d+)?)\s*w", name, flags=re.I)
    if watts:
        specs["Power / Watt"] = ", ".join(f"{w}W" for w in watts)

    dims = re.findall(r"\d+(?:\.\d+)?\s*[xX×\*]\s*\d+(?:\.\d+)?(?:\s*[xX×\*]\s*\d+(?:\.\d+)?)?\s*(?:mm|cm)?", name)
    if dims:
        specs["Dimensions"] = "; ".join(dims)
        specs["Size"] = "; ".join(dims)

    caps = re.findall(r"\d+(?:\.\d+)?\s*(?:ml|g|kg|l|L|capsules|caps|pieces|pcs|条|粒)", name, flags=re.I)
    if caps:
        joined = "; ".join(caps)
        specs["Capacity"] = joined
        if re.search(r"\d", joined):
            specs["Weight"] = joined

    if "steel" in low or "stainless" in low:
        specs["Material"] = "ستانلس/فولاذ حسب اسم الطلب أو المصدر"
    elif "quartz" in low:
        specs["Material"] = "كوارتز/زجاج كوارتز حسب اسم الطلب"
    elif "glass" in low or "tank" in low:
        specs["Material"] = "زجاج حسب اسم الطلب/المصدر"
    elif "acrylic" in low:
        specs["Material"] = "أكريليك حسب اسم الطلب"
    elif "cotton" in low:
        specs["Material"] = "قطن فلتر حسب اسم الطلب"
    elif "ceramic" in low or "ring" in low:
        specs["Material"] = "ميديا خزفية/حلقات ترشيح حسب اسم الطلب"

    if "blue" in low:
        specs["Color"] = "أزرق حسب اسم الطلب/الصورة"
    elif "black" in low:
        specs["Color"] = "أسود حسب اسم الطلب/الصورة"
    elif "white" in low:
        specs["Color"] = "أبيض حسب اسم الطلب/الصورة"

    return specs


def apply_manual_specs(code: str, specs: dict[str, str]) -> None:
    if code == "YEE-3006":
        specs.update(
            {
                "Power / Watt": "50W",
                "Dimensions": "190mm length / 19cm (Elmir)",
                "Voltage": "غير مؤكد في المصدر المفتوح المستخدم؛ تحقق من الملصق قبل البيع",
                "Compatibility": "Freshwater aquariums per Elmir listing",
                "Package contents": "Heater + suction cup mounting (من وصف Elmir؛ عدد القطع غير مفصل)",
            }
        )
    elif code == "YTZ-300":
        specs.update(
            {
                "Power / Watt": "3W",
                "Capacity": "Airflow 1.5L/min (8Garden/Aqua-Deco)",
                "Dimensions": "10.5 x 7.5 x 5 cm (Aqua-Deco)",
                "Compatibility": "30-60L fish tank (8Garden/Aqua-Deco)",
                "Package contents": "غير مؤكد؛ صفحات البيع لا تؤكد كل المحتويات",
            }
        )
    elif code == "C4-1123":
        specs.update(
            {
                "Material": "شرائط اختبار ورقية/عبوة بلاستيكية حسب Alibaba",
                "Package contents": "تعارض مصادر: Alibaba يذكر 35 strips، ومصادر تايلند/صورة الطلب تذكر 50 strips",
                "Usage": "اختبار جودة ماء الحوض",
                "Compatibility": "ماء أحواض الأسماك ومياه عذبة/مالحة حسب صفحة Alibaba",
            }
        )
    elif code == "YFF-049":
        specs.update(
            {
                "Capacity": "1.5L حسب اسم الطلب والصورة؛ توجد Variants أخرى 3L في بعض المصادر",
                "Material": "تربة/طين بركاني طبيعي حسب مصادر YEE/Ultimate Aqua",
                "Usage": "تربة للنباتات المائية وتحسين جودة الماء",
            }
        )


def suggested_names(name: str, code: str) -> tuple[str, str]:
    low = name.lower()
    if "heater" in low or "heating" in low:
        ar = f"سخان حوض أسماك YEE {code}"
    elif "oxygen" in low or "air pump" in low:
        ar = f"مضخة هواء لحوض الأسماك YEE {code}"
    elif "diffuser" in low:
        ar = f"موزع فقاعات هواء YEE {code}"
    elif "water change" in low:
        ar = f"أداة تغيير ماء وتنظيف الحوض YEE {code}"
    elif "tank" in low and "descaling" not in low:
        ar = f"حوض أسماك زجاجي YEE {code}"
    elif "food" in low or "feed" in low or "brine shrimp" in low:
        ar = f"طعام أسماك/أحياء مائية YEE {code}"
    elif "methylene" in low:
        ar = f"محلول أزرق الميثيلين للأحواض YEE {code}"
    elif "white spot" in low:
        ar = f"محلول البقع البيضاء للأحواض YEE {code}"
    elif "test" in low:
        ar = f"اختبار جودة ماء الحوض YEE {code}"
    elif "soil" in low or "mud" in low:
        ar = f"تربة نباتات مائية YEE {code}"
    elif "thermometer" in low:
        ar = f"ميزان حرارة خارجي لحوض الأسماك YEE {code}"
    else:
        ar = f"منتج أحواض أسماك YEE {code}"
    en = f"YEE {name}".replace("YEE YEE", "YEE")
    return ar, en


def infer_match_status(code: str, official: dict[str, str] | None, manual: list[dict[str, str]], has_matched_images: bool) -> tuple[str, str]:
    exact_manual = any(src.get("type") == "exact" for src in manual)
    family_manual = any(src.get("type") in {"family", "variant"} for src in manual)
    if exact_manual and has_matched_images:
        return "تطابق مؤكد 100%", "تم العثور على مصدر خارجي يذكر نفس الموديل/الكود، مع صور مطابقة أو صور منتج مؤكدة."
    if exact_manual:
        return "تطابق قوي جدًا", "تم العثور على مصدر خارجي يذكر نفس الموديل/الكود، لكن لم يتم تنزيل كل زوايا المنتج المؤكدة."
    if official and official.get("official_source_url"):
        return "تطابق قوي جدًا", "تم العثور على صفحة رسمية لعائلة المنتج من YEE، لكن الكود/النسخة الدقيقة غير ظاهرة في الصفحة."
    if family_manual or code in OFFICIAL_FUZZY:
        return "تطابق محتمل", "توجد صفحة عائلة أو نتيجة مشابهة، لكن لم يظهر نفس الكود أو نفس التغليف بشكل كاف."
    return "غير مؤكد", "لم يتم العثور على تطابق مؤكد 100% أو صفحة خارجية واضحة لنفس الموديل."


def image_bucket(filename: str) -> str:
    low = filename.lower()
    if any(token in low for token in ["box", "label", "chart", "package", "params", "parameter"]):
        return "03_Package_Images"
    if "open" in low:
        return "04_Open_Box_Images"
    if any(token in low for token in ["in_use", "aquarium", "bubble", "display"]):
        return "05_Usage_Images"
    return "02_Matched_Product_Images"


def copy_file(src: Path, dest_dir: Path, new_name: str) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / new_name
    shutil.copy2(src, dest)
    return dest


def image_name(prefix: str, src_file: Path, max_len: int = 70) -> str:
    base = Path(prefix).stem
    safe = slug(base, max_len)
    suffix = src_file.suffix or Path(prefix).suffix
    if suffix and not safe.lower().endswith(suffix.lower()):
        safe += suffix
    return safe


def download_possible_image(url: str, dest_dir: Path, name_base: str) -> Path | None:
    if not requests or not url:
        return None
    try:
        resp = requests.get(url, timeout=12)
        resp.raise_for_status()
    except Exception:
        return None
    suffix = Path(urlparse(url).path).suffix
    if suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
        suffix = ".jpg"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{name_base}{suffix}"
    dest.write_bytes(resp.content)
    return dest


def main() -> None:
    excel_dir = find_dir_with_file("manifest.csv", "images")
    manifest_rows = read_csv(excel_dir / "manifest.csv")
    img_dir = excel_dir / "images"

    official_path = ROOT / "products_company_official" / "products_official_descriptions.csv"
    official_rows = read_csv(official_path) if official_path.exists() else []
    official_by_key: dict[tuple[str, str, str], dict[str, str]] = {}
    official_by_code: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in official_rows:
        official_by_key[(row["item_code"], row["product_code"], row["requested_product_name"])] = row
        official_by_code[row["product_code"]].append(row)

    internet_dir = find_dir_with_file("sources.csv")
    internet_sources = read_csv(internet_dir / "sources.csv")

    grouped: dict[tuple[str, str, str, str], dict] = {}
    for row in manifest_rows:
        parsed = split_anchor(row["anchor_row_text"])
        key = (
            parsed.get("row", row.get("from_row", "")),
            parsed.get("C", ""),
            parsed.get("D", ""),
            parsed.get("F", ""),
        )
        record = grouped.setdefault(
            key,
            {
                "row": parsed.get("row", row.get("from_row", "")),
                "order_no": parsed.get("A", ""),
                "item_code": parsed.get("C", ""),
                "product_code": parsed.get("D", ""),
                "chinese_name": parsed.get("E", ""),
                "requested_name": parsed.get("F", ""),
                "price": parsed.get("G", ""),
                "quantity": parsed.get("H", ""),
                "total": parsed.get("I", ""),
                "images": [],
                "first_number": int(row["number"]),
            },
        )
        record["images"].append(row["image_file"])

    records = sorted(grouped.values(), key=lambda r: r["first_number"])

    if OUT_ROOT.exists():
        resolved_out = OUT_ROOT.resolve()
        resolved_root = ROOT.resolve()
        if resolved_out.parent != resolved_root or resolved_out.name != "AQUAVO_Product_Research_Complete":
            raise RuntimeError(f"Refusing to clean unexpected output path: {resolved_out}")
        shutil.rmtree(resolved_out)

    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    summary_rows: list[dict[str, str]] = []

    for idx, rec in enumerate(records, start=1):
        product_id = f"AQUAVO-Research-{idx:03d}"
        code = rec["product_code"]
        item_code = rec["item_code"]
        name = rec["requested_name"]
        folder = OUT_ROOT / f"Product_{idx:03d}_{slug(code + '_' + name)}"
        subdirs = [
            "01_Original_Alibaba_Image",
            "02_Matched_Product_Images",
            "03_Package_Images",
            "04_Open_Box_Images",
            "05_Usage_Images",
            "Possible_Matches_Not_Confirmed",
        ]
        for sub in subdirs:
            (folder / sub).mkdir(parents=True, exist_ok=True)

        copied_originals = []
        for img_rel in rec["images"]:
            src = img_dir / Path(img_rel).name
            copied = copy_file(src, folder / "01_Original_Alibaba_Image", f"Product_{idx:03d}_Original_{Path(img_rel).name}")
            copied_originals.append(copied)

        official = official_by_key.get((item_code, code, name))
        if not official:
            candidates = [r for r in official_by_code.get(code, []) if r.get("requested_product_name") == name]
            official = candidates[0] if candidates else (official_by_code.get(code, [None])[0])

        manual_sources = list(MANUAL_SOURCES.get(code, []))
        for label, url in OFFICIAL_FUZZY.get(code, []):
            manual_sources.append({"label": label, "url": url, "type": "possible", "notes": "Possible family page; exact model not confirmed."})

        matched_images = []
        possible_images = []
        source_links = []

        for src_row in internet_sources:
            mapping = SOURCE_PRODUCT_MAP.get(src_row["Product"])
            if not mapping or code not in mapping["codes"]:
                continue
            src_file = internet_dir / src_row["Product"] / src_row["File"]
            if not src_file.exists():
                continue
            certainty = mapping["certainty"]
            if certainty == "matched":
                bucket = image_bucket(src_row["File"])
                copied = copy_file(src_file, folder / bucket, image_name(f"Product_{idx:03d}_{src_row['File']}", src_file, 72))
                matched_images.append(copied)
            else:
                copied = copy_file(src_file, folder / "Possible_Matches_Not_Confirmed", image_name(f"Product_{idx:03d}_Possible_{src_row['Product']}_{src_row['File']}", src_file, 78))
                possible_images.append(copied)
            if src_row.get("Page"):
                source_links.append((src_row.get("Source", src_row["Product"]), src_row["Page"], src_row.get("ImageUrl", "")))

        if official and official.get("official_image_url") and official.get("verification_status") == "official_family_only":
            downloaded = download_possible_image(
                official["official_image_url"],
                folder / "Possible_Matches_Not_Confirmed",
                f"Product_{idx:03d}_Official_Family_YEE",
            )
            if downloaded:
                possible_images.append(downloaded)

        specs = extract_specs(name, code, item_code)
        apply_manual_specs(code, specs)

        status, reason = infer_match_status(code, official, manual_sources, bool(matched_images))
        ar_name, en_name = suggested_names(name, code)

        if code in {"LED-318"} and "3.5W" in name:
            reason += " توجد ملاحظة تعارض: نص الطلب يذكر 3.5W بينما الصورة الأصلية تظهر 7W؛ يجب عدم نشر القدرة قبل تأكيد المورد."
            specs["Power / Watt"] = "تعارض: اسم الطلب 3.5W، والصورة الأصلية تظهر 7W"

        if code == "C4-1123":
            reason += " توجد اختلافات بين المصادر في عدد الشرائط: 35 في صفحة Alibaba مقابل 50 في صورة الطلب/بعض متاجر التجزئة."

        if status != "تطابق مؤكد 100%":
            not_found_line = "لم يتم العثور على تطابق مؤكد 100%."
        else:
            not_found_line = "تم العثور على تطابق خارجي مؤكد للموديل/الكود."

        links_lines = [
            f"Product ID: {product_id}",
            f"Local Excel manifest: {excel_dir / 'manifest.csv'}",
            f"Original image source folder: {img_dir}",
            "",
        ]
        for image in copied_originals:
            links_lines.append(f"Original Alibaba/Excel image copy: {image}")
        if official and official.get("official_source_url"):
            links_lines.append(f"Official YEE family source: {official['official_source_url']}")
        if official and official.get("official_image_url"):
            links_lines.append(f"Official YEE family image: {official['official_image_url']}")
        for src in manual_sources:
            links_lines.append(f"{src['label']}: {src['url']} ({src.get('type', 'source')})")
        for label, page, image_url in sorted(set(source_links)):
            links_lines.append(f"{label}: {page}")
            if image_url:
                links_lines.append(f"Image URL: {image_url}")

        (folder / "06_Source_Links.txt").write_text("\n".join(links_lines) + "\n", encoding="utf-8-sig")

        specs_lines = "\n".join(f"   - {field}: {specs[field]}" for field in FIELD_ORDER)
        image_lines = []
        image_lines.extend(f"   - Original: {p.name}" for p in copied_originals)
        image_lines.extend(f"   - Matched: {p.relative_to(folder)}" for p in matched_images)
        image_lines.extend(f"   - Possible, not confirmed: {p.relative_to(folder)}" for p in possible_images)
        if not image_lines:
            image_lines.append("   - لا توجد صور إضافية مؤكدة.")

        online_sources_text = []
        if official and official.get("official_source_url"):
            online_sources_text.append(f"   - YEE official family: {official['official_source_url']}")
        for src in manual_sources:
            online_sources_text.append(f"   - {src['label']}: {src['url']} [{src.get('type', 'source')}]")
            if src.get("notes"):
                online_sources_text.append(f"     Note: {src['notes']}")
        for label, page, image_url in sorted(set(source_links)):
            online_sources_text.append(f"   - {label}: {page}")
            if image_url:
                online_sources_text.append(f"     Image: {image_url}")
        if not online_sources_text:
            online_sources_text.append("   - لا يوجد رابط إنترنت مباشر مؤكد لهذا المنتج حتى الآن.")

        official_note = ""
        if official:
            official_note = (
                f"Official source status: {official.get('verification_status_label') or official.get('verification_status')}. "
                f"Official title: {official.get('official_product_title') or 'غير متاح'}."
            )

        product_type_note = "Brand product (YEE) على الأغلب" if specs["Brand"].startswith("YEE") else "Brand/Generic غير مؤكد"
        if status in {"غير مؤكد", "تطابق محتمل"}:
            recommendation = (
                "يحتاج وصفًا حذرًا قبل البيع. يصلح كمنتج AQUAVO فقط بعد تأكيد المورد أو تصوير المنتج محليًا، "
                "ولا يُنصح بنشر مواصفات غير ظاهرة في الصورة أو غير مدعومة برابط."
            )
        elif status == "تطابق قوي جدًا":
            recommendation = (
                "صالح مبدئيًا للإدراج مع وصف محافظ. يفضل تصوير المنتج محليًا أو طلب صور المورد لتأكيد الموديل/التغليف، "
                "خصوصًا عند وجود أكثر من variant."
            )
        else:
            recommendation = (
                "صالح للإدراج. مع ذلك يفضل تصوير المنتج محليًا قبل إطلاق صفحة AQUAVO، وذكر المواصفات المؤكدة فقط."
            )

        report = f"""================================================
AQUAVO PRODUCT RESEARCH REPORT
================================================
1. Product ID داخلي:
   {product_id}

2. اسم المنتج من Alibaba / ملف الطلب:
   {name}
   Chinese name from order: {rec['chinese_name']}
   Internal item code: {item_code}
   Product/model code: {code}
   Order quantity: {rec['quantity'] or 'غير مؤكد'}

3. الاسم المقترح لـ AQUAVO:
   - بالعربي: {ar_name}
   - بالإنجليزي: {en_name}

4. حالة التطابق:
   {status}
   {not_found_line}

5. سبب التقييم:
   {reason}
   {official_note}
   الصور الأصلية من ملف Excel/Alibaba محفوظة في 01_Original_Alibaba_Image. الصور المشابهة غير المؤكدة وُضعت منفصلة في Possible_Matches_Not_Confirmed.

6. كل المواصفات الموجودة:
{specs_lines}
   - تفاصيل أخرى من ملف الطلب: السعر={rec['price'] or 'غير مؤكد'}، الكمية={rec['quantity'] or 'غير مؤكد'}، الإجمالي={rec['total'] or 'غير مؤكد'}.

7. صور المنتج:
{chr(10).join(image_lines)}

8. روابط المصادر:
{chr(10).join(online_sources_text)}

9. ملاحظات مهمة:
   - هل المنتج Generic أم Brand؟ {product_type_note}.
   - هل يوجد أكثر من موديل مشابه؟ نعم، في أغلب منتجات YEE توجد Variants؛ لا تدمج مواصفات الأحجام/الأوزان بين variants.
   - هل الصورة من نفس المورد؟ الصورة الأصلية مصدرها ملف طلب AQUAVO/Alibaba المحلي؛ أما الصور الخارجية فمصادرها مذكورة في 06_Source_Links.txt.
   - مخاطر الوصف: لا تنشر أي قدرة كهربائية أو فولطية أو وزن أو عدد قطع غير مدعوم بمصدر واضح. إذا وجدت اختلافات فهي مذكورة في سبب التقييم أو المواصفات.
   - معلومات يجب تجنبها في موقع AQUAVO: أي claims طبية أو علاجية قوية لمنتجات المعالجة المائية، وأي مواصفات كهربائية غير مؤكدة على الملصق.

10. توصية استخدام لـ AQUAVO:
   {recommendation}
================================================
"""
        (folder / "07_Product_Research_Report.txt").write_text(report, encoding="utf-8-sig")

        summary_rows.append(
            {
                "product_number": f"Product_{idx:03d}",
                "product_id": product_id,
                "product_code": code,
                "product_name": name,
                "match_status": status,
                "source_count": str(len(set([u for _, u, _ in source_links] + [s["url"] for s in manual_sources] + ([official["official_source_url"]] if official and official.get("official_source_url") else [])))),
                "additional_images_found": "نعم" if matched_images else ("صور محتملة فقط" if possible_images else "لا"),
                "confirmed_model_found": "نعم" if status == "تطابق مؤكد 100%" else "لا",
                "aquavo_ready": "جاهز بحذر" if status in {"تطابق مؤكد 100%", "تطابق قوي جدًا"} else "يحتاج تأكيد",
                "folder": str(folder),
            }
        )

    summary_csv = OUT_ROOT / "00_Final_Summary_Table.csv"
    with summary_csv.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(summary_rows[0].keys()))
        writer.writeheader()
        writer.writerows(summary_rows)

    md_lines = [
        "# AQUAVO Final Product Research Summary",
        "",
        f"Source manifest: `{excel_dir / 'manifest.csv'}`",
        f"Generated products: {len(summary_rows)}",
        "",
        "| رقم المنتج | كود المنتج | اسم المنتج | حالة التطابق | عدد المصادر | صور إضافية | موديل مؤكد | جاهزية AQUAVO |",
        "|---|---|---|---|---:|---|---|---|",
    ]
    for row in summary_rows:
        md_lines.append(
            f"| {row['product_number']} | {row['product_code']} | {row['product_name']} | {row['match_status']} | {row['source_count']} | {row['additional_images_found']} | {row['confirmed_model_found']} | {row['aquavo_ready']} |"
        )
    (OUT_ROOT / "00_Final_Summary_Table.md").write_text("\n".join(md_lines) + "\n", encoding="utf-8-sig")

    status_class = {
        "تطابق مؤكد 100%": "ok",
        "تطابق قوي جدًا": "strong",
        "تطابق محتمل": "maybe",
        "غير مؤكد": "warn",
    }
    html_rows = []
    for row in summary_rows:
        folder_rel = Path(row["folder"]).name
        cls = status_class.get(row["match_status"], "warn")
        report_link = f"{folder_rel}/07_Product_Research_Report.txt"
        links_link = f"{folder_rel}/06_Source_Links.txt"
        html_rows.append(
            "<tr>"
            f"<td>{html.escape(row['product_number'])}</td>"
            f"<td>{html.escape(row['product_code'])}</td>"
            f"<td>{html.escape(row['product_name'])}</td>"
            f"<td><span class=\"badge {cls}\">{html.escape(row['match_status'])}</span></td>"
            f"<td>{html.escape(row['source_count'])}</td>"
            f"<td>{html.escape(row['additional_images_found'])}</td>"
            f"<td>{html.escape(row['confirmed_model_found'])}</td>"
            f"<td>{html.escape(row['aquavo_ready'])}</td>"
            f"<td><a href=\"{html.escape(report_link)}\">Report</a> | <a href=\"{html.escape(links_link)}\">Sources</a></td>"
            "</tr>"
        )

    index_html = f"""<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AQUAVO Product Research Summary</title>
  <style>
    body {{ margin:0; font-family: Tahoma, Arial, sans-serif; background:#f7f8fb; color:#111827; }}
    main {{ max-width: 1280px; margin: 0 auto; padding: 28px 18px 44px; }}
    h1 {{ margin: 0 0 8px; font-size: 28px; }}
    p {{ color:#475569; line-height:1.7; }}
    table {{ width:100%; border-collapse: collapse; background:white; border:1px solid #dbe2ea; }}
    th, td {{ border-bottom:1px solid #e5eaf0; padding:10px 9px; text-align:right; vertical-align:top; font-size:14px; }}
    th {{ background:#eef3f8; color:#1f2937; position:sticky; top:0; }}
    tr:hover {{ background:#f8fafc; }}
    a {{ color:#185abc; text-decoration:none; font-weight:700; }}
    .badge {{ display:inline-block; border-radius:6px; padding:4px 8px; font-weight:700; white-space:nowrap; }}
    .ok {{ background:#dcfce7; color:#166534; }}
    .strong {{ background:#e0f2fe; color:#075985; }}
    .maybe {{ background:#fef9c3; color:#854d0e; }}
    .warn {{ background:#fee2e2; color:#991b1b; }}
    .meta {{ direction:ltr; text-align:left; background:#fff; border:1px solid #dbe2ea; padding:10px 12px; margin:14px 0; }}
  </style>
</head>
<body>
<main>
  <h1>جدول بحث منتجات AQUAVO</h1>
  <p>تم الاعتماد على صور ملف Excel/Alibaba الأصلية، مع فصل الصور المحتملة غير المؤكدة عن الصور المطابقة.</p>
  <div class="meta">Generated products: {len(summary_rows)} | Original images: 54 | Date: 2026-05-13</div>
  <table>
    <thead>
      <tr>
        <th>رقم المنتج</th>
        <th>كود المنتج</th>
        <th>اسم المنتج</th>
        <th>حالة التطابق</th>
        <th>عدد المصادر</th>
        <th>صور إضافية</th>
        <th>موديل مؤكد</th>
        <th>جاهزية AQUAVO</th>
        <th>الملفات</th>
      </tr>
    </thead>
    <tbody>
      {''.join(html_rows)}
    </tbody>
  </table>
</main>
</body>
</html>
"""
    (OUT_ROOT / "index.html").write_text(index_html, encoding="utf-8-sig")

    print(f"Generated {len(summary_rows)} product folders at: {OUT_ROOT}")
    print(f"Summary CSV: {summary_csv}")


if __name__ == "__main__":
    main()
