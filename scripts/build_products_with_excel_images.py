import csv
import html
import json
import re
import sys
from collections import defaultdict
from pathlib import Path


def read_csv(path):
    with Path(path).open("r", encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def cell_value(row_text, col):
    match = re.search(rf"(?:^|[|;]\s*){re.escape(col)}=([^|;]+)", row_text or "")
    return match.group(1).strip() if match else ""


def build_image_maps(manifest_rows):
    by_item = defaultdict(list)
    by_product = defaultdict(list)
    for image in manifest_rows:
        anchor = image.get("anchor_row_text", "")
        item_code = cell_value(anchor, "C")
        product_code = cell_value(anchor, "D")
        if item_code:
            by_item[item_code].append(image)
        if product_code:
            by_product[product_code].append(image)
    return by_item, by_product


def safe_join(values):
    return " | ".join(v for v in values if v)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    root = Path(__file__).resolve().parents[1]
    official_csv = root / "products_company_official" / "products_official_descriptions.csv"
    manifest_csv = root / "صور_الاكسل_الصحيحة" / "manifest.csv"
    output_dir = root / "المنتجات_صور_الاكسل_والشرح"
    output_dir.mkdir(parents=True, exist_ok=True)

    products = read_csv(official_csv)
    images = read_csv(manifest_csv)
    by_item, by_product = build_image_maps(images)

    out_rows = []
    cards = []
    for idx, product in enumerate(products, start=1):
        item_code = product.get("item_code", "")
        product_code = product.get("product_code", "")
        matched = list(by_item.get(item_code, []))
        if not matched:
            matched = list(by_product.get(product_code, []))

        image_files = [m["image_file"] for m in matched]
        out_rows.append({
            "page": product.get("page", ""),
            "item_code": item_code,
            "product_code": product_code,
            "requested_product_name": product.get("requested_product_name", ""),
            "verification_status": product.get("verification_status", ""),
            "official_source_url": product.get("official_source_url", ""),
            "official_product_title": product.get("official_product_title", ""),
            "excel_image_count": len(image_files),
            "excel_image_files": "; ".join(image_files),
        })

        badge_class = "missing" if product.get("verification_status") == "not_found_on_official_site" else "family"
        image_html = []
        for image in matched:
            rel = "../صور_الاكسل_الصحيحة/" + image["image_file"].replace("\\", "/")
            image_html.append(f"""
              <a class="imgbox" href="{html.escape(rel)}">
                <img src="{html.escape(rel)}" alt="{html.escape(product_code)} image">
                <span>#{html.escape(image.get('number', ''))} - {html.escape(image.get('from_cell', ''))}</span>
              </a>
""")
        if not image_html:
            image_html.append('<div class="no-image">لا توجد صورة مطابقة لهذا المنتج داخل صور الإكسل المستخرجة.</div>')

        source = product.get("official_source_url", "")
        source_html = f'<a href="{html.escape(source)}">فتح المصدر الرسمي</a>' if source else "غير موجود في موقع الشركة"
        record = {
            "item_code": item_code,
            "product_code": product_code,
            "requested_product_name": product.get("requested_product_name", ""),
            "excel_image_files": image_files,
        }
        cards.append(f"""
      <article class="card {badge_class}" data-key="{html.escape(item_code + '|' + product_code)}" data-status="unset">
        <div class="top">
          <div>
            <div class="page">{html.escape(product.get("page", ""))}</div>
            <h2>{html.escape(product_code)}</h2>
            <p class="requested">{html.escape(product.get("requested_product_name", ""))}</p>
          </div>
          <span class="badge">{html.escape(product.get("verification_status_label", ""))}</span>
        </div>
        <div class="images">
          {''.join(image_html)}
        </div>
        <dl>
          <dt>Row code</dt><dd>{html.escape(item_code)}</dd>
          <dt>Official title</dt><dd>{html.escape(product.get("official_product_title", ""))}</dd>
          <dt>Source</dt><dd>{source_html}</dd>
          <dt>Verification note</dt><dd>{html.escape(product.get("verification_note", ""))}</dd>
          <dt>Official company text</dt><dd class="official">{product.get("official_text_from_company_site", "").replace(chr(10), "<br>")}</dd>
        </dl>
        <div class="actions">
          <button type="button" class="ok" data-action="correct">صحيح</button>
          <button type="button" class="bad" data-action="wrong">غير صحيح</button>
          <button type="button" data-action="unset">إلغاء</button>
        </div>
        <script type="application/json" class="record-json">{html.escape(json.dumps(record, ensure_ascii=False))}</script>
      </article>
""")

    out_csv = output_dir / "products_with_excel_images.csv"
    with out_csv.open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(out_rows[0].keys()))
        writer.writeheader()
        writer.writerows(out_rows)

    matched_count = sum(1 for row in out_rows if int(row["excel_image_count"]) > 0)
    html_doc = f"""<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>المنتجات - صور الإكسل والشرح الرسمي</title>
  <style>
    body {{ margin:0; font-family: Tahoma, Arial, sans-serif; background:#f5f7fb; color:#172033; }}
    main {{ max-width:1440px; margin:0 auto; padding:24px; }}
    h1 {{ margin:0 0 8px; font-size:28px; }}
    p {{ color:#475569; line-height:1.7; }}
    .toolbar {{ position:sticky; top:0; z-index:10; display:flex; gap:8px; flex-wrap:wrap; align-items:center; padding:12px; margin:16px 0; background:#fff; border:1px solid #d9e1ee; border-radius:8px; }}
    button, .download {{ border:1px solid #cbd5e1; background:#fff; color:#111827; border-radius:6px; padding:8px 10px; cursor:pointer; font:inherit; font-size:13px; text-decoration:none; }}
    button.active {{ border-color:#185abc; color:#185abc; background:#eff6ff; }}
    .count {{ margin-inline-start:auto; color:#475569; font-size:13px; }}
    .grid {{ display:grid; grid-template-columns:repeat(auto-fit, minmax(380px, 1fr)); gap:14px; }}
    .card {{ background:#fff; border:1px solid #d9e1ee; border-top:4px solid #2563eb; border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:12px; }}
    .card.missing {{ border-top-color:#b42318; }}
    .card[data-status="correct"] {{ outline:2px solid #16a34a; }}
    .card[data-status="wrong"] {{ opacity:.55; outline:2px solid #dc2626; }}
    .top {{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }}
    .page {{ color:#64748b; font-size:12px; }}
    h2 {{ font-size:18px; margin:3px 0 6px; direction:ltr; text-align:left; }}
    .requested {{ margin:0; color:#334155; font-size:14px; line-height:1.5; }}
    .badge {{ max-width:190px; font-size:12px; line-height:1.45; border-radius:6px; padding:7px 8px; background:#eff6ff; color:#1d4ed8; }}
    .missing .badge {{ background:#fef2f2; color:#991b1b; }}
    .images {{ display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:8px; }}
    .imgbox {{ min-height:150px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:6px; color:#334155; font-size:11px; text-decoration:none; }}
    .imgbox img {{ max-width:100%; max-height:145px; object-fit:contain; display:block; }}
    .no-image {{ color:#9a3412; background:#fff7ed; border:1px solid #fed7aa; border-radius:6px; padding:12px; }}
    dl {{ margin:0; display:grid; grid-template-columns:120px 1fr; gap:8px 12px; }}
    dt {{ color:#64748b; font-size:12px; }}
    dd {{ margin:0; font-size:13px; line-height:1.65; overflow-wrap:anywhere; }}
    dd.official {{ background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:9px; max-height:220px; overflow:auto; direction:ltr; text-align:left; }}
    a {{ color:#185abc; }}
    .actions {{ display:flex; gap:8px; }}
    .actions button {{ flex:1; }}
    .actions .ok {{ border-color:#86efac; }}
    .actions .bad {{ border-color:#fecaca; }}
    .hidden {{ display:none !important; }}
  </style>
</head>
<body>
<main>
  <h1>المنتجات - صور الإكسل والشرح الرسمي</h1>
  <p>الصور هنا من ملف الإكسل فقط. الشرح بقي من موقع الشركة الرسمي فقط. المنتجات التي لم نجد لها شرحًا رسميًا بقيت معلّمة كما هي.</p>
  <p>عدد المنتجات: <strong>{len(products)}</strong> | منتجات لها صورة إكسل مطابقة: <strong>{matched_count}</strong> | كل صور الإكسل المستخرجة موجودة في <a href="../صور_الاكسل_الصحيحة/index.html">معرض الصور الكامل</a>.</p>
  <div class="toolbar">
    <button type="button" data-filter="all" class="active">عرض الكل</button>
    <button type="button" data-filter="correct">عرض الصحيح فقط</button>
    <button type="button" data-filter="hide-wrong">إخفاء غير الصحيح</button>
    <button type="button" id="export">تصدير اختياراتي CSV</button>
    <button type="button" id="reset">مسح الاختيارات</button>
    <a class="download" href="products_with_excel_images.csv">products_with_excel_images.csv</a>
    <span class="count" id="count"></span>
  </div>
  <section class="grid">
    {''.join(cards)}
  </section>
</main>
<script>
  const storageKey = 'excel-products-review-v1';
  const state = JSON.parse(localStorage.getItem(storageKey) || '{{}}');
  const cards = [...document.querySelectorAll('.card')];
  const count = document.getElementById('count');
  let activeFilter = 'all';

  function save() {{ localStorage.setItem(storageKey, JSON.stringify(state)); }}
  function applyState() {{
    let correct = 0, wrong = 0, unset = 0, visible = 0;
    for (const card of cards) {{
      const key = card.dataset.key;
      const status = state[key] || 'unset';
      card.dataset.status = status;
      correct += status === 'correct' ? 1 : 0;
      wrong += status === 'wrong' ? 1 : 0;
      unset += status === 'unset' ? 1 : 0;
      const hide = (activeFilter === 'correct' && status !== 'correct') || (activeFilter === 'hide-wrong' && status === 'wrong');
      card.classList.toggle('hidden', hide);
      visible += hide ? 0 : 1;
      card.querySelectorAll('button[data-action]').forEach(button => button.classList.toggle('active', button.dataset.action === status));
    }}
    count.textContent = `المعروض: ${{visible}} | صحيح: ${{correct}} | غير صحيح: ${{wrong}} | غير محدد: ${{unset}}`;
  }}

  document.addEventListener('click', event => {{
    const actionButton = event.target.closest('button[data-action]');
    if (actionButton) {{
      const card = actionButton.closest('.card');
      const key = card.dataset.key;
      const action = actionButton.dataset.action;
      if (action === 'unset') delete state[key];
      else state[key] = action;
      save();
      applyState();
      return;
    }}
    const filterButton = event.target.closest('button[data-filter]');
    if (filterButton) {{
      activeFilter = filterButton.dataset.filter;
      document.querySelectorAll('button[data-filter]').forEach(button => button.classList.toggle('active', button === filterButton));
      applyState();
    }}
  }});

  document.getElementById('reset').addEventListener('click', () => {{
    if (!confirm('تمسح كل اختيارات صحيح/غير صحيح؟')) return;
    for (const key of Object.keys(state)) delete state[key];
    save();
    applyState();
  }});

  document.getElementById('export').addEventListener('click', () => {{
    const rows = [['status','item_code','product_code','requested_product_name','excel_image_files']];
    for (const card of cards) {{
      const record = JSON.parse(card.querySelector('.record-json').textContent);
      rows.push([state[card.dataset.key] || 'unset', record.item_code, record.product_code, record.requested_product_name, record.excel_image_files.join('; ')]);
    }}
    const csv = rows.map(row => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(',')).join('\\n');
    const blob = new Blob([csv], {{ type: 'text/csv;charset=utf-8' }});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product_review_choices.csv';
    link.click();
    URL.revokeObjectURL(url);
  }});

  applyState();
</script>
</body>
</html>
"""
    (output_dir / "index.html").write_text(html_doc, encoding="utf-8")
    print(json.dumps({"output": str(output_dir), "products": len(products), "matched_products": matched_count}, ensure_ascii=False))


if __name__ == "__main__":
    main()
