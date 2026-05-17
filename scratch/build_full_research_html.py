from __future__ import annotations

import csv
import html
import re
from collections import Counter
from pathlib import Path
from urllib.parse import quote


ROOT = Path(__file__).resolve().parents[1]
REPORT_ROOT = ROOT / "AQUAVO_Product_Research_Complete"
SUMMARY_CSV = REPORT_ROOT / "00_Final_Summary_Table.csv"
OUT_FILE = REPORT_ROOT / "AQUAVO_Full_Product_Research_Report.html"


IMAGE_GROUPS = [
    ("01_Original_Alibaba_Image", "الصورة الأصلية من Alibaba / Excel", "original"),
    ("02_Matched_Product_Images", "صور المنتج المطابقة", "matched"),
    ("03_Package_Images", "صور التغليف والملصق", "package"),
    ("04_Open_Box_Images", "صور فتح العلبة", "openbox"),
    ("05_Usage_Images", "صور أثناء الاستخدام", "usage"),
    ("Possible_Matches_Not_Confirmed", "صور محتملة غير مؤكدة", "possible"),
]


def read_summary() -> list[dict[str, str]]:
    with SUMMARY_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def rel_url(path: Path) -> str:
    rel = path.relative_to(REPORT_ROOT).as_posix()
    return quote(rel, safe="/._-()")


def linkify(line: str) -> str:
    escaped = html.escape(line)
    return re.sub(
        r"(https?://[^\s<]+)",
        lambda m: f'<a href="{html.escape(m.group(1))}" target="_blank" rel="noreferrer">{html.escape(m.group(1))}</a>',
        escaped,
    )


def get_section(report: str, section_number: int) -> str:
    pattern = rf"\n{section_number}\.\s.*?:\n(.*?)(?=\n{section_number + 1}\.\s|\n=+\s*$)"
    match = re.search(pattern, report, flags=re.S)
    if not match:
        return ""
    return match.group(1).strip()


def compact_section(text: str, max_chars: int = 1600) -> str:
    text = text.strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "\n..."


def image_cards(folder: Path) -> tuple[str, int]:
    groups_html: list[str] = []
    total = 0
    for subdir, label, css_class in IMAGE_GROUPS:
        directory = folder / subdir
        images = []
        if directory.exists():
            images = sorted(
                [
                    p
                    for p in directory.iterdir()
                    if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
                ],
                key=lambda p: p.name,
            )
        total += len(images)
        cards = []
        for image in images:
            confidence = "unconfirmed" if subdir == "Possible_Matches_Not_Confirmed" else "confirmed"
            image_key = f"image::{folder.name}::{subdir}::{image.name}"
            cards.append(
                f"""
                <figure class="image-card review-item {css_class}" data-review-key="{html.escape(image_key)}" data-confidence="{confidence}">
                  <a href="{rel_url(image)}" target="_blank">
                    <img src="{rel_url(image)}" alt="{html.escape(image.name)}" loading="lazy">
                  </a>
                  <figcaption>{html.escape(image.name)}</figcaption>
                  <div class="item-controls">
                    <button type="button" data-action="keep">تأكيد</button>
                    <button type="button" data-action="remove">حذف من العرض</button>
                  </div>
                </figure>
                """
            )
        empty = '<p class="empty">لا توجد صور في هذا القسم.</p>' if not images else ""
        groups_html.append(
            f"""
            <section class="image-group">
              <div class="group-title">
                <h4>{label}</h4>
                <span>{len(images)}</span>
              </div>
              <div class="image-grid">{''.join(cards)}{empty}</div>
            </section>
            """
        )
    return "\n".join(groups_html), total


def sources_html(folder: Path) -> str:
    links_file = folder / "06_Source_Links.txt"
    if not links_file.exists():
        return '<p class="empty">لا يوجد ملف مصادر.</p>'
    lines = [line.strip() for line in links_file.read_text(encoding="utf-8-sig").splitlines() if line.strip()]
    items = []
    for line in lines:
        cls = "source-line has-link" if "http://" in line or "https://" in line else "source-line"
        items.append(f'<li class="{cls}">{linkify(line)}</li>')
    return f"<ul class=\"sources-list\">{''.join(items)}</ul>"


def is_uncertain_line(text: str) -> bool:
    tokens = [
        "غير مؤكد",
        "غير متوفر",
        "تعارض",
        "تحقق",
        "لا تنشر",
        "محتمل",
        "محتملة",
        "Possible",
        "possible",
        "unconfirmed",
        "not confirmed",
        "not visible",
        "not found",
    ]
    return any(token in text for token in tokens)


def review_panel(title: str, text: str, key: str, extra_class: str = "") -> str:
    uncertain = "uncertain-info" if is_uncertain_line(text) else ""
    content = html.escape(text or "غير متوفر في التقرير.")
    return f"""
    <div class="panel review-item {uncertain} {extra_class}" data-review-key="{html.escape(key)}">
      <div class="panel-title">
        <h3>{html.escape(title)}</h3>
        <div class="item-controls">
          <button type="button" data-action="keep">تأكيد</button>
          <button type="button" data-action="remove">حذف من العرض</button>
        </div>
      </div>
      <pre>{content}</pre>
    </div>
    """


def review_lines(title: str, text: str, key_prefix: str) -> str:
    lines = [line for line in (text or "غير متوفر في التقرير.").splitlines() if line.strip()]
    rows = []
    for index, line in enumerate(lines, start=1):
        uncertain = "uncertain-info" if is_uncertain_line(line) else ""
        rows.append(
            f"""
            <li class="review-line review-item {uncertain}" data-review-key="{html.escape(key_prefix)}::line::{index}">
              <span>{html.escape(line)}</span>
              <div class="item-controls">
                <button type="button" data-action="keep">تأكيد</button>
                <button type="button" data-action="remove">حذف</button>
              </div>
            </li>
            """
        )
    return f"""
    <div class="panel specs-panel">
      <h3>{html.escape(title)}</h3>
      <ul class="review-lines">{''.join(rows)}</ul>
    </div>
    """


def product_html(row: dict[str, str]) -> str:
    folder = Path(row["folder"])
    report_file = folder / "07_Product_Research_Report.txt"
    report = report_file.read_text(encoding="utf-8-sig") if report_file.exists() else ""
    specs = compact_section(get_section(report, 6), 2200)
    reason = compact_section(get_section(report, 5), 1200)
    recommendation = compact_section(get_section(report, 10), 1000)
    images, image_count = image_cards(folder)

    status = row["match_status"]
    status_class = {
        "تطابق مؤكد 100%": "ok",
        "تطابق قوي جدًا": "strong",
        "تطابق محتمل": "maybe",
        "غير مؤكد": "warn",
    }.get(status, "warn")
    ready_class = "ready" if row["aquavo_ready"] == "جاهز بحذر" else "needs"

    return f"""
    <article id="{html.escape(row['product_number'])}" class="product-card" data-status="{html.escape(status)}" data-ready="{html.escape(row['aquavo_ready'])}">
      <header class="product-header">
        <div>
          <p class="product-kicker">{html.escape(row['product_number'])} · {html.escape(row['product_id'])}</p>
          <h2>{html.escape(row['product_code'])}</h2>
          <p class="product-name">{html.escape(row['product_name'])}</p>
        </div>
        <div class="badges">
          <span class="badge {status_class}">{html.escape(status)}</span>
          <span class="badge {ready_class}">{html.escape(row['aquavo_ready'])}</span>
        </div>
      </header>

      <div class="facts">
        <div><span>عدد المصادر</span><strong>{html.escape(row['source_count'])}</strong></div>
        <div><span>صور إضافية</span><strong>{html.escape(row['additional_images_found'])}</strong></div>
        <div><span>موديل مؤكد</span><strong>{html.escape(row['confirmed_model_found'])}</strong></div>
        <div><span>إجمالي الصور هنا</span><strong>{image_count}</strong></div>
      </div>

      <section class="info-grid">
        {review_panel("سبب التقييم", reason, row['product_number'] + "::reason")}
        {review_lines("المواصفات الموجودة", specs, row['product_number'] + "::specs")}
        {review_panel("توصية AQUAVO", recommendation, row['product_number'] + "::recommendation")}
      </section>

      <section class="images-wrap">
        <h3>الصور</h3>
        {images}
      </section>

      <details class="details-block">
        <summary>عرض كل روابط المصادر</summary>
        {sources_html(folder)}
      </details>

      <details class="details-block">
        <summary>عرض التقرير النصي الكامل</summary>
        <pre>{html.escape(report or "لا يوجد تقرير نصي.")}</pre>
      </details>
    </article>
    """


def build_html(rows: list[dict[str, str]]) -> str:
    status_counts = Counter(row["match_status"] for row in rows)
    ready_counts = Counter(row["aquavo_ready"] for row in rows)
    total_images = sum(
        1
        for p in REPORT_ROOT.rglob("*")
        if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )
    product_sections = "\n".join(product_html(row) for row in rows)

    table_rows = "\n".join(
        f"""
        <tr data-status="{html.escape(row['match_status'])}">
          <td><a href="#{html.escape(row['product_number'])}">{html.escape(row['product_number'])}</a></td>
          <td>{html.escape(row['product_code'])}</td>
          <td>{html.escape(row['product_name'])}</td>
          <td>{html.escape(row['match_status'])}</td>
          <td>{html.escape(row['source_count'])}</td>
          <td>{html.escape(row['additional_images_found'])}</td>
          <td>{html.escape(row['confirmed_model_found'])}</td>
          <td>{html.escape(row['aquavo_ready'])}</td>
        </tr>
        """
        for row in rows
    )

    cards = [
        ("إجمالي المنتجات", str(len(rows))),
        ("إجمالي الصور", str(total_images)),
        ("تطابق مؤكد 100%", str(status_counts.get("تطابق مؤكد 100%", 0))),
        ("تطابق قوي جدًا", str(status_counts.get("تطابق قوي جدًا", 0))),
        ("تطابق محتمل", str(status_counts.get("تطابق محتمل", 0))),
        ("غير مؤكد", str(status_counts.get("غير مؤكد", 0))),
        ("جاهز بحذر", str(ready_counts.get("جاهز بحذر", 0))),
        ("يحتاج تأكيد", str(ready_counts.get("يحتاج تأكيد", 0))),
    ]
    stat_cards = "\n".join(f"<div class=\"stat\"><span>{label}</span><strong>{value}</strong></div>" for label, value in cards)

    return f"""<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AQUAVO Full Product Research Report</title>
  <style>
    :root {{
      --bg: #f4f7fb;
      --panel: #ffffff;
      --text: #111827;
      --muted: #667085;
      --line: #d9e2ec;
      --blue: #0f5fa8;
      --green: #166534;
      --yellow: #854d0e;
      --red: #991b1b;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; font-family: Tahoma, Arial, sans-serif; background: var(--bg); color: var(--text); }}
    a {{ color: var(--blue); text-decoration: none; font-weight: 700; }}
    a:hover {{ text-decoration: underline; }}
    main {{ max-width: 1440px; margin: 0 auto; padding: 28px 18px 52px; }}
    .topbar {{ display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 18px; }}
    h1 {{ margin: 0 0 8px; font-size: 30px; }}
    .subtitle {{ margin: 0; color: var(--muted); line-height: 1.7; }}
    .actions {{ display: flex; gap: 8px; flex-wrap: wrap; direction: ltr; }}
    .actions a, .filter-btn {{ background: #fff; border: 1px solid var(--line); border-radius: 7px; padding: 9px 11px; color: #1f2937; cursor: pointer; font-weight: 700; }}
    .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 10px; margin: 18px 0; }}
    .stat {{ background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 13px; }}
    .stat span {{ display: block; color: var(--muted); font-size: 13px; margin-bottom: 8px; }}
    .stat strong {{ font-size: 24px; }}
    .toolbar {{ display: flex; gap: 10px; flex-wrap: wrap; align-items: center; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px; margin-bottom: 14px; }}
    #search {{ flex: 1 1 280px; border: 1px solid var(--line); border-radius: 7px; padding: 10px 12px; font-size: 15px; }}
    .summary-table {{ overflow: auto; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; margin-bottom: 22px; max-height: 420px; }}
    table {{ width: 100%; border-collapse: collapse; min-width: 920px; }}
    th, td {{ border-bottom: 1px solid #e7edf3; padding: 10px; text-align: right; font-size: 14px; vertical-align: top; }}
    th {{ background: #eef3f8; position: sticky; top: 0; z-index: 1; }}
    .product-card {{ background: var(--panel); border: 1px solid var(--line); border-radius: 8px; margin: 18px 0; overflow: hidden; }}
    .product-header {{ display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; padding: 18px; border-bottom: 1px solid var(--line); background: #fbfdff; }}
    .product-kicker {{ margin: 0 0 6px; color: var(--muted); direction: ltr; text-align: left; }}
    h2 {{ margin: 0; font-size: 24px; direction: ltr; text-align: left; }}
    .product-name {{ margin: 8px 0 0; color: #344054; direction: ltr; text-align: left; }}
    .badges {{ display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }}
    .badge {{ border-radius: 7px; padding: 7px 9px; font-weight: 800; white-space: nowrap; }}
    .ok {{ background: #dcfce7; color: var(--green); }}
    .strong {{ background: #e0f2fe; color: #075985; }}
    .maybe {{ background: #fef9c3; color: var(--yellow); }}
    .warn {{ background: #fee2e2; color: var(--red); }}
    .ready {{ background: #e7f7ef; color: var(--green); }}
    .needs {{ background: #fff1f2; color: var(--red); }}
    .facts {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1px; background: var(--line); }}
    .facts div {{ background: #fff; padding: 13px 16px; }}
    .facts span {{ display: block; color: var(--muted); font-size: 13px; margin-bottom: 6px; }}
    .facts strong {{ font-size: 17px; }}
    .info-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 12px; padding: 16px; }}
    .panel {{ border: 1px solid var(--line); border-radius: 8px; padding: 13px; background: #fff; }}
    .panel-title {{ display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; margin-bottom: 10px; }}
    h3 {{ margin: 0 0 11px; font-size: 18px; }}
    .panel-title h3 {{ margin: 0; }}
    h4 {{ margin: 0; font-size: 15px; }}
    pre {{ white-space: pre-wrap; word-break: break-word; margin: 0; font-family: Tahoma, Arial, sans-serif; font-size: 14px; line-height: 1.7; color: #1f2937; }}
    .review-lines {{ list-style: none; padding: 0; margin: 0; }}
    .review-line {{ display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; border: 1px solid #edf1f5; border-radius: 7px; padding: 8px; margin-bottom: 7px; line-height: 1.6; }}
    .review-line span {{ flex: 1; white-space: pre-wrap; word-break: break-word; }}
    .uncertain-info {{ background: #fffbeb; border-color: #fbbf24 !important; }}
    .kept-item {{ outline: 2px solid #16a34a; outline-offset: 2px; }}
    .removed-item {{ display: none !important; }}
    .item-controls {{ display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }}
    .item-controls button {{ border: 1px solid var(--line); background: #fff; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 12px; font-weight: 700; color: #1f2937; }}
    .item-controls button[data-action="keep"] {{ border-color: #86efac; color: var(--green); }}
    .item-controls button[data-action="remove"] {{ border-color: #fecaca; color: var(--red); }}
    .images-wrap {{ padding: 16px; border-top: 1px solid var(--line); }}
    .image-group {{ margin: 12px 0 18px; }}
    .group-title {{ display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 9px 11px; background: #eef3f8; border: 1px solid var(--line); border-radius: 8px 8px 0 0; }}
    .group-title span {{ background: white; border: 1px solid var(--line); border-radius: 999px; min-width: 34px; text-align: center; padding: 3px 8px; font-weight: 800; direction: ltr; }}
    .image-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; border: 1px solid var(--line); border-top: 0; padding: 10px; border-radius: 0 0 8px 8px; }}
    .image-card {{ margin: 0; border: 1px solid #e5eaf0; border-radius: 8px; background: #fff; overflow: hidden; }}
    .image-card img {{ width: 100%; height: 150px; object-fit: contain; background: #f8fafc; display: block; }}
    .image-card figcaption {{ direction: ltr; text-align: left; font-size: 11px; color: var(--muted); padding: 7px; min-height: 42px; overflow-wrap: anywhere; }}
    .image-card .item-controls {{ padding: 0 7px 8px; }}
    .possible {{ border-color: #fbbf24; }}
    .details-block {{ border-top: 1px solid var(--line); padding: 13px 16px; }}
    summary {{ cursor: pointer; font-weight: 800; }}
    .sources-list {{ margin: 12px 0 0; padding: 0 20px 0 0; }}
    .source-line {{ margin-bottom: 7px; color: #344054; direction: ltr; text-align: left; overflow-wrap: anywhere; }}
    .empty {{ color: var(--muted); margin: 0; padding: 10px; }}
    .hidden {{ display: none !important; }}
    @media (max-width: 720px) {{
      main {{ padding: 18px 10px 40px; }}
      .topbar, .product-header {{ display: block; }}
      .actions {{ margin-top: 12px; }}
      h1 {{ font-size: 24px; }}
      h2 {{ font-size: 20px; }}
      .info-grid {{ grid-template-columns: 1fr; padding: 10px; }}
      .images-wrap {{ padding: 10px; }}
      .image-grid {{ grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }}
    }}
  </style>
</head>
<body>
  <main>
    <section class="topbar">
      <div>
        <h1>تقرير بحث منتجات AQUAVO الكامل</h1>
        <p class="subtitle">ملف واحد يجمع جدول النتائج، الصور الأصلية، الصور المطابقة، الصور المحتملة غير المؤكدة، سبب التقييم، المواصفات، توصية الاستخدام، وروابط المصادر لكل منتج.</p>
      </div>
      <div class="actions">
        <a href="00_Final_Summary_Table.csv">CSV</a>
        <a href="00_Final_Summary_Table.md">Markdown</a>
        <a href="index.html">Index</a>
      </div>
    </section>

    <section class="stats">{stat_cards}</section>

    <section class="toolbar">
      <input id="search" type="search" placeholder="ابحث باسم المنتج أو الكود...">
      <button class="filter-btn" data-filter="all">الكل</button>
      <button class="filter-btn" data-filter="تطابق مؤكد 100%">تطابق مؤكد</button>
      <button class="filter-btn" data-filter="تطابق قوي جدًا">قوي جدًا</button>
      <button class="filter-btn" data-filter="تطابق محتمل">محتمل</button>
      <button class="filter-btn" data-filter="غير مؤكد">غير مؤكد</button>
      <button id="removePossibleImages" class="filter-btn" type="button">حذف الصور غير المؤكدة</button>
      <button id="removeUncertainInfo" class="filter-btn" type="button">حذف المعلومات غير المؤكدة</button>
      <button id="resetReview" class="filter-btn" type="button">إظهار الكل</button>
      <button id="exportReview" class="filter-btn" type="button">تصدير قراراتي</button>
    </section>

    <section class="summary-table">
      <table>
        <thead>
          <tr>
            <th>رقم المنتج</th>
            <th>الكود</th>
            <th>الاسم</th>
            <th>حالة التطابق</th>
            <th>مصادر</th>
            <th>صور إضافية</th>
            <th>موديل مؤكد</th>
            <th>جاهزية AQUAVO</th>
          </tr>
        </thead>
        <tbody>{table_rows}</tbody>
      </table>
    </section>

    <section id="products">{product_sections}</section>
  </main>

  <script>
    (() => {{
      const STORAGE_KEY = 'aquavoResearchReviewState.v2';
      let activeFilter = 'all';

      function emptyState() {{
        return {{ kept: {{}}, removed: {{}} }};
      }}

      function normalizeState(state) {{
        return {{
          kept: state && state.kept && typeof state.kept === 'object' ? state.kept : {{}},
          removed: state && state.removed && typeof state.removed === 'object' ? state.removed : {{}}
        }};
      }}

      function loadState() {{
        try {{
          return normalizeState(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{{"kept":{{}},"removed":{{}}}}'));
        }} catch (error) {{
          return emptyState();
        }}
      }}

      let reviewState = loadState();

      function saveState() {{
        try {{
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reviewState));
        }} catch (error) {{
          // The buttons still work during the current page session if localStorage is blocked.
        }}
      }}

      function reviewItems() {{
        return Array.from(document.querySelectorAll('.review-item'));
      }}

      function productCards() {{
        return Array.from(document.querySelectorAll('.product-card'));
      }}

      function applyReviewState() {{
        reviewItems().forEach(item => {{
          const key = item.getAttribute('data-review-key');
          const kept = Boolean(reviewState.kept[key]);
          const removed = Boolean(reviewState.removed[key]);
          item.classList.toggle('kept-item', kept);
          item.classList.toggle('removed-item', removed);
          item.style.display = removed ? 'none' : '';
        }});
      }}

      function applyFilters() {{
        const search = document.getElementById('search');
        const term = search ? search.value.trim().toLowerCase() : '';
        productCards().forEach(card => {{
          const text = card.innerText.toLowerCase();
          const status = card.getAttribute('data-status') || '';
          const matchesSearch = !term || text.includes(term);
          const matchesFilter = activeFilter === 'all' || status === activeFilter;
          card.classList.toggle('hidden', !(matchesSearch && matchesFilter));
        }});
      }}

      function setDecision(item, action, skipApply) {{
        if (!item) return;
        const key = item.getAttribute('data-review-key');
        if (!key) return;
        delete reviewState.kept[key];
        delete reviewState.removed[key];
        if (action === 'keep') reviewState.kept[key] = true;
        if (action === 'remove') reviewState.removed[key] = true;
        if (!skipApply) {{
          saveState();
          applyReviewState();
          applyFilters();
        }}
      }}

      function bindControls() {{
        const search = document.getElementById('search');
        if (search) search.addEventListener('input', applyFilters);

        document.querySelectorAll('.filter-btn[data-filter]').forEach(button => {{
          button.addEventListener('click', () => {{
            activeFilter = button.getAttribute('data-filter') || 'all';
            applyFilters();
          }});
        }});

        document.addEventListener('click', event => {{
          const target = event.target;
          if (!target || !target.closest) return;
          const button = target.closest('button[data-action]');
          if (!button) return;
          const item = button.closest('.review-item');
          setDecision(item, button.getAttribute('data-action'));
        }});

        const removePossibleImages = document.getElementById('removePossibleImages');
        if (removePossibleImages) {{
          removePossibleImages.addEventListener('click', () => {{
            reviewItems()
              .filter(item => item.getAttribute('data-confidence') === 'unconfirmed')
              .forEach(item => setDecision(item, 'remove', true));
            saveState();
            applyReviewState();
            applyFilters();
          }});
        }}

        const removeUncertainInfo = document.getElementById('removeUncertainInfo');
        if (removeUncertainInfo) {{
          removeUncertainInfo.addEventListener('click', () => {{
            reviewItems()
              .filter(item => item.classList.contains('uncertain-info'))
              .forEach(item => setDecision(item, 'remove', true));
            saveState();
            applyReviewState();
            applyFilters();
          }});
        }}

        const resetReview = document.getElementById('resetReview');
        if (resetReview) {{
          resetReview.addEventListener('click', () => {{
            reviewState = emptyState();
            saveState();
            applyReviewState();
            applyFilters();
          }});
        }}

        const exportReview = document.getElementById('exportReview');
        if (exportReview) {{
          exportReview.addEventListener('click', () => {{
            const blob = new Blob([JSON.stringify(reviewState, null, 2)], {{ type: 'application/json' }});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'aquavo-review-decisions.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          }});
        }}
      }}

      bindControls();
      applyReviewState();
      applyFilters();
    }})();
  </script>
</body>
</html>
"""


def main() -> None:
    rows = read_summary()
    OUT_FILE.write_text(build_html(rows), encoding="utf-8-sig")
    print(OUT_FILE)


if __name__ == "__main__":
    main()
