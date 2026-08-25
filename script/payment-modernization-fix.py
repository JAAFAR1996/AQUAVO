from pathlib import Path

p = Path("client/src/components/cart/checkout/confirmation-view.tsx")
text = p.read_text()
marker = '    return (\n        <div className="space-y-4">\n'
doubled = marker + marker
if doubled not in text:
    raise SystemExit("expected duplicated checkout return marker not found")
p.write_text(text.replace(doubled, marker, 1))
print("fixed duplicated checkout return marker")
