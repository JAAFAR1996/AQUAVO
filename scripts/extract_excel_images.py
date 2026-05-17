import argparse
import csv
import html
import json
import posixpath
import re
import shutil
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "office_rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
}


def read_xml(zf, name):
    with zf.open(name) as fh:
        return ET.fromstring(fh.read())


def norm_part(base, target):
    if target.startswith("/"):
        target = target.lstrip("/")
    else:
        target = posixpath.normpath(posixpath.join(posixpath.dirname(base), target))
    return target


def rels_for(zf, part_name):
    rels_name = posixpath.join(
        posixpath.dirname(part_name),
        "_rels",
        posixpath.basename(part_name) + ".rels",
    )
    rels = {}
    if rels_name not in zf.namelist():
        return rels
    root = read_xml(zf, rels_name)
    for rel in root.findall("rel:Relationship", NS):
        rid = rel.attrib.get("Id", "")
        target = rel.attrib.get("Target", "")
        rels[rid] = {
            "target": norm_part(part_name, target),
            "type": rel.attrib.get("Type", ""),
        }
    return rels


def col_index_from_ref(ref):
    match = re.match(r"([A-Z]+)", ref or "")
    if not match:
        return 0
    value = 0
    for char in match.group(1):
        value = value * 26 + (ord(char) - ord("A") + 1)
    return value


def col_letters(index):
    if index <= 0:
        return ""
    letters = []
    while index:
        index, rem = divmod(index - 1, 26)
        letters.append(chr(ord("A") + rem))
    return "".join(reversed(letters))


def load_shared_strings(zf):
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []
    root = read_xml(zf, "xl/sharedStrings.xml")
    strings = []
    for si in root.findall("main:si", NS):
        texts = [t.text or "" for t in si.findall(".//main:t", NS)]
        strings.append("".join(texts))
    return strings


def load_sheet_values(zf, sheet_part, shared_strings):
    rows = {}
    root = read_xml(zf, sheet_part)
    for row in root.findall(".//main:sheetData/main:row", NS):
        row_num = int(row.attrib.get("r", "0") or 0)
        values = {}
        for cell in row.findall("main:c", NS):
            ref = cell.attrib.get("r", "")
            col = col_index_from_ref(ref)
            cell_type = cell.attrib.get("t", "")
            text = ""
            if cell_type == "inlineStr":
                text = "".join(t.text or "" for t in cell.findall(".//main:t", NS))
            else:
                v = cell.find("main:v", NS)
                if v is not None and v.text is not None:
                    if cell_type == "s":
                        try:
                            text = shared_strings[int(v.text)]
                        except (ValueError, IndexError):
                            text = v.text
                    else:
                        text = v.text
            if text.strip():
                values[col] = text.strip()
        if values:
            rows[row_num] = values
    return rows


def row_summary(rows, row_num, radius=1):
    chunks = []
    for rn in range(max(1, row_num - radius), row_num + radius + 1):
        values = rows.get(rn, {})
        if not values:
            continue
        cells = []
        for col in sorted(values):
            value = " ".join(values[col].split())
            if value:
                cells.append(f"{col_letters(col)}={value}")
        if cells:
            chunks.append(f"Row {rn}: " + " | ".join(cells))
    return " ; ".join(chunks)


def workbook_sheets(zf):
    workbook = read_xml(zf, "xl/workbook.xml")
    workbook_rels = rels_for(zf, "xl/workbook.xml")
    sheets = []
    for sheet in workbook.findall(".//main:sheets/main:sheet", NS):
        rid = sheet.attrib.get(f"{{{NS['r']}}}id", "")
        rel = workbook_rels.get(rid, {})
        target = rel.get("target", "")
        if target and not target.startswith("xl/"):
            target = "xl/" + target
        sheets.append({
            "name": sheet.attrib.get("name", "Sheet"),
            "sheet_id": sheet.attrib.get("sheetId", ""),
            "part": target,
        })
    return sheets


def safe_name(value):
    value = re.sub(r"[^A-Za-z0-9_.-]+", "_", value)
    value = value.strip("._")
    return value or "file"


def anchor_position(anchor):
    from_el = anchor.find("xdr:from", NS)
    to_el = anchor.find("xdr:to", NS)

    def read_marker(marker):
        if marker is None:
            return {"col": "", "row": "", "cell": ""}
        col = int(marker.findtext("xdr:col", "0", NS)) + 1
        row = int(marker.findtext("xdr:row", "0", NS)) + 1
        return {"col": col, "row": row, "cell": f"{col_letters(col)}{row}"}

    return read_marker(from_el), read_marker(to_el)


def extract_images(workbook_path, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    images_dir = output_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    records = []
    with zipfile.ZipFile(workbook_path) as zf:
        shared_strings = load_shared_strings(zf)
        sheets = workbook_sheets(zf)
        media_parts = {name for name in zf.namelist() if name.startswith("xl/media/")}
        used_media = set()
        sequence = 1

        for sheet in sheets:
            if not sheet["part"] or sheet["part"] not in zf.namelist():
                continue
            rows = load_sheet_values(zf, sheet["part"], shared_strings)
            sheet_rels = rels_for(zf, sheet["part"])
            drawing_parts = [
                rel["target"]
                for rel in sheet_rels.values()
                if rel.get("type", "").endswith("/drawing") and rel.get("target") in zf.namelist()
            ]
            for drawing_part in drawing_parts:
                drawing = read_xml(zf, drawing_part)
                drawing_rels = rels_for(zf, drawing_part)
                anchors = list(drawing.findall("xdr:twoCellAnchor", NS))
                anchors += list(drawing.findall("xdr:oneCellAnchor", NS))
                anchors += list(drawing.findall("xdr:absoluteAnchor", NS))
                for anchor in anchors:
                    pic = anchor.find("xdr:pic", NS)
                    if pic is None:
                        continue
                    c_nv_pr = pic.find(".//xdr:cNvPr", NS)
                    pic_name = c_nv_pr.attrib.get("name", "") if c_nv_pr is not None else ""
                    descr = c_nv_pr.attrib.get("descr", "") if c_nv_pr is not None else ""
                    blip = pic.find(".//a:blip", NS)
                    if blip is None:
                        continue
                    rid = blip.attrib.get(f"{{{NS['r']}}}embed", "")
                    rel = drawing_rels.get(rid, {})
                    media_part = rel.get("target", "")
                    if not media_part or media_part not in zf.namelist():
                        continue
                    used_media.add(media_part)
                    ext = Path(media_part).suffix.lower() or ".bin"
                    from_pos, to_pos = anchor_position(anchor)
                    row_num = from_pos["row"] or ""
                    anchor_text = row_summary(rows, int(row_num), radius=0) if row_num else ""
                    row_text = row_summary(rows, int(row_num), radius=1) if row_num else ""
                    out_name = f"{sequence:03d}_{safe_name(sheet['name'])}_{from_pos['cell'] or 'unanchored'}_{Path(media_part).stem}{ext}"
                    out_path = images_dir / out_name
                    source_size = zf.getinfo(media_part).file_size
                    if not out_path.exists() or out_path.stat().st_size != source_size:
                        tmp_path = out_path.with_suffix(out_path.suffix + ".tmp")
                        with zf.open(media_part) as src, tmp_path.open("wb") as dst:
                            shutil.copyfileobj(src, dst)
                        tmp_path.replace(out_path)
                    records.append({
                        "number": sequence,
                        "image_file": f"images/{out_name}",
                        "sheet": sheet["name"],
                        "from_cell": from_pos["cell"],
                        "to_cell": to_pos["cell"],
                        "from_row": from_pos["row"],
                        "from_col": from_pos["col"],
                        "to_row": to_pos["row"],
                        "to_col": to_pos["col"],
                        "drawing": drawing_part,
                        "source_media": media_part,
                        "picture_name": pic_name,
                        "description": descr,
                        "anchor_row_text": anchor_text,
                        "nearby_row_text": row_text,
                    })
                    sequence += 1

        for media_part in sorted(media_parts - used_media):
            ext = Path(media_part).suffix.lower() or ".bin"
            out_name = f"{sequence:03d}_unanchored_{Path(media_part).stem}{ext}"
            out_path = images_dir / out_name
            source_size = zf.getinfo(media_part).file_size
            if not out_path.exists() or out_path.stat().st_size != source_size:
                tmp_path = out_path.with_suffix(out_path.suffix + ".tmp")
                with zf.open(media_part) as src, tmp_path.open("wb") as dst:
                    shutil.copyfileobj(src, dst)
                tmp_path.replace(out_path)
            records.append({
                "number": sequence,
                "image_file": f"images/{out_name}",
                "sheet": "",
                "from_cell": "",
                "to_cell": "",
                "from_row": "",
                "from_col": "",
                "to_row": "",
                "to_col": "",
                "drawing": "",
                "source_media": media_part,
                "picture_name": "",
                "description": "",
                "anchor_row_text": "",
                "nearby_row_text": "",
            })
            sequence += 1

    write_manifest(output_dir, workbook_path, records)
    return records


def write_manifest(output_dir, workbook_path, records):
    fieldnames = [
        "number", "image_file", "sheet", "from_cell", "to_cell", "from_row", "from_col",
        "to_row", "to_col", "drawing", "source_media", "picture_name", "description",
        "anchor_row_text", "nearby_row_text",
    ]
    csv_path = output_dir / "manifest.csv"
    with csv_path.open("w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    json_path = output_dir / "manifest.json"
    json_path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")

    cards = []
    for record in records:
        meta = {
            "number": record["number"],
            "image_file": record["image_file"],
            "sheet": record["sheet"],
            "from_cell": record["from_cell"],
            "source_media": record["source_media"],
            "anchor_row_text": record["anchor_row_text"],
            "nearby_row_text": record["nearby_row_text"],
        }
        cards.append(f"""
        <article class="card" data-key="{html.escape(record['image_file'])}" data-status="unset">
          <div class="image-wrap">
            <a href="{html.escape(record['image_file'])}"><img src="{html.escape(record['image_file'])}" alt="Excel image {record['number']}"></a>
          </div>
          <div class="card-body">
            <div class="card-title">#{record['number']:03d}</div>
            <div class="meta">Sheet: {html.escape(str(record['sheet']))}</div>
            <div class="meta">Cell: {html.escape(str(record['from_cell']))}</div>
            <div class="meta">Media: {html.escape(str(record['source_media']))}</div>
            <details>
              <summary>نص الصف القريب</summary>
              <p>{html.escape(record['anchor_row_text'] or record['nearby_row_text'] or 'لا يوجد نص قريب محفوظ داخل الخلايا')}</p>
            </details>
            <div class="actions">
              <button type="button" class="ok" data-action="correct">صحيح</button>
              <button type="button" class="bad" data-action="wrong">غير صحيح</button>
              <button type="button" data-action="unset">إلغاء</button>
            </div>
          </div>
          <script type="application/json" class="record-json">{html.escape(json.dumps(meta, ensure_ascii=False))}</script>
        </article>
""")

    html_doc = f"""<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>صور الإكسل - المنتجات</title>
  <style>
    :root {{ color-scheme: light; }}
    body {{ margin:0; font-family: Tahoma, Arial, sans-serif; background:#f5f7fb; color:#111827; }}
    main {{ max-width:1440px; margin:0 auto; padding:22px; }}
    h1 {{ margin:0 0 8px; font-size:28px; }}
    p {{ color:#475569; line-height:1.7; }}
    .toolbar {{ position:sticky; top:0; z-index:10; display:flex; gap:8px; flex-wrap:wrap; align-items:center; padding:12px; margin:16px 0; background:#fff; border:1px solid #d9e1ee; border-radius:8px; }}
    .count {{ margin-inline-start:auto; color:#475569; font-size:13px; }}
    button, .download {{ border:1px solid #cbd5e1; background:#fff; color:#111827; border-radius:6px; padding:8px 10px; cursor:pointer; font:inherit; font-size:13px; text-decoration:none; }}
    button:hover, .download:hover {{ background:#f8fafc; }}
    button.active {{ border-color:#185abc; color:#185abc; background:#eff6ff; }}
    .grid {{ display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:14px; }}
    .card {{ background:#fff; border:1px solid #d9e1ee; border-top:4px solid #94a3b8; border-radius:8px; overflow:hidden; display:flex; flex-direction:column; min-height:360px; }}
    .card[data-status="correct"] {{ border-top-color:#15803d; }}
    .card[data-status="wrong"] {{ border-top-color:#b42318; opacity:.55; }}
    .image-wrap {{ height:220px; display:flex; align-items:center; justify-content:center; background:#fff; border-bottom:1px solid #e5e7eb; }}
    img {{ max-width:100%; max-height:220px; object-fit:contain; display:block; }}
    .card-body {{ padding:12px; display:flex; flex-direction:column; gap:7px; }}
    .card-title {{ direction:ltr; text-align:left; font-weight:700; }}
    .meta {{ direction:ltr; text-align:left; color:#64748b; font-size:12px; overflow-wrap:anywhere; }}
    details {{ border:1px solid #e5e7eb; border-radius:6px; padding:8px; font-size:12px; color:#334155; }}
    details p {{ margin:8px 0 0; direction:ltr; text-align:left; color:#334155; overflow-wrap:anywhere; }}
    .actions {{ display:flex; gap:6px; margin-top:4px; }}
    .actions button {{ flex:1; }}
    .actions .ok {{ border-color:#86efac; }}
    .actions .bad {{ border-color:#fecaca; }}
    .hidden {{ display:none !important; }}
  </style>
</head>
<body>
  <main>
    <h1>صور المنتجات المستخرجة من ملف الإكسل</h1>
    <p>المصدر الوحيد هنا هو ملف الإكسل: <span dir="ltr">{html.escape(str(workbook_path))}</span>. عدد الصور المستخرجة: <strong>{len(records)}</strong>.</p>
    <div class="toolbar">
      <button type="button" data-filter="all" class="active">عرض الكل</button>
      <button type="button" data-filter="correct">عرض الصحيح فقط</button>
      <button type="button" data-filter="hide-wrong">إخفاء غير الصحيح</button>
      <button type="button" id="export">تصدير اختياراتي CSV</button>
      <button type="button" id="reset">مسح الاختيارات</button>
      <a class="download" href="manifest.csv">manifest.csv</a>
      <span class="count" id="count"></span>
    </div>
    <section class="grid" id="grid">
      {''.join(cards)}
    </section>
  </main>
  <script>
    const storageKey = 'excel-product-image-review-v1';
    const state = JSON.parse(localStorage.getItem(storageKey) || '{{}}');
    const cards = [...document.querySelectorAll('.card')];
    const count = document.getElementById('count');
    let activeFilter = 'all';

    function save() {{
      localStorage.setItem(storageKey, JSON.stringify(state));
    }}

    function applyState() {{
      let correct = 0, wrong = 0, unset = 0, visible = 0;
      for (const card of cards) {{
        const key = card.dataset.key;
        const status = state[key] || 'unset';
        card.dataset.status = status;
        correct += status === 'correct' ? 1 : 0;
        wrong += status === 'wrong' ? 1 : 0;
        unset += status === 'unset' ? 1 : 0;
        const hide =
          (activeFilter === 'correct' && status !== 'correct') ||
          (activeFilter === 'hide-wrong' && status === 'wrong');
        card.classList.toggle('hidden', hide);
        visible += hide ? 0 : 1;
        for (const button of card.querySelectorAll('button[data-action]')) {{
          button.classList.toggle('active', button.dataset.action === status);
        }}
      }}
      count.textContent = `المعروض: ${{visible}} | صحيح: ${{correct}} | غير صحيح: ${{wrong}} | غير محدد: ${{unset}}`;
    }}

    document.addEventListener('click', (event) => {{
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
    const rows = [['number','status','image_file','sheet','from_cell','source_media','anchor_row_text','nearby_row_text']];
      for (const card of cards) {{
        const record = JSON.parse(card.querySelector('.record-json').textContent);
        rows.push([
          record.number,
          state[record.image_file] || 'unset',
          record.image_file,
          record.sheet || '',
          record.from_cell || '',
          record.source_media || '',
          record.anchor_row_text || '',
          record.nearby_row_text || ''
        ]);
      }}
      const csv = rows.map(row => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(',')).join('\\n');
      const blob = new Blob([csv], {{ type: 'text/csv;charset=utf-8' }});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'excel_image_review_choices.csv';
      link.click();
      URL.revokeObjectURL(url);
    }});

    applyState();
  </script>
</body>
</html>
"""
    (output_dir / "index.html").write_text(html_doc, encoding="utf-8")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--workbook", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    workbook_path = Path(args.workbook).resolve()
    output_dir = Path(args.output).resolve()
    if not workbook_path.exists():
        raise FileNotFoundError(workbook_path)
    records = extract_images(workbook_path, output_dir)
    print(json.dumps({
        "workbook": str(workbook_path),
        "output": str(output_dir),
        "images": len(records),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
