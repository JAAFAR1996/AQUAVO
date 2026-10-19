from pathlib import Path
import json
r=Path('.')
def edit(path,before,after,n=1):
 p=r/path;s=p.read_text();assert s.count(before)==n,(path,s.count(before),before[:70]);p.write_text(s.replace(before,after))
edit('server/services/accounting-engine.ts','export interface RelationalLineSnapshot {\n  orderId: string;\n  productId: string;', 'export interface RelationalLineSnapshot {\n  orderId: string;\n  productId: string;\n  variantId?: string;')
edit('server/services/accounting-engine.ts','      productId: r.productId,\n      quantity: Number(r.quantity)', '''      productId: r.productId,
      variantId: typeof (r.metadata as Record<string, unknown> | null)?.variantId === "string"
        ? String((r.metadata as Record<string, unknown>).variantId) : undefined,
      quantity: Number(r.quantity)''')
p=r/'server/services/accounting-engine.ts';s=p.read_text();a=s.index('  const jsonbPairs = jsonbItems',s.index('export function reconcileOrderLines('));b=s.index('    // A relational row that asserts NOTHING',a)
s=s[:a]+'''  // Match immutable line identity, never the nth occurrence of a product.
  const lineKey = (product: unknown, variant: unknown, quantity: unknown, price: unknown) =>
    JSON.stringify([product, variant || null, Number(quantity), Number(price)]);
  const queues = new Map<string, RelationalLineSnapshot[]>();
  for (const row of relational) {
    const key = lineKey(row.productId, row.variantId, row.quantity, row.priceAtPurchase);
    queues.set(key, [...(queues.get(key) ?? []), row]);
  }
  const matches = jsonbItems.map((item) => !item.productId ? undefined
    : queues.get(lineKey(item.productId, (item as { variantId?: string }).variantId,
      lineQuantity(item), item.priceAtPurchase))?.shift());
  if (relational.length !== jsonbItems.length || matches.some((row) => !row)) {
    return { items: jsonbItems, sourceOfTruth: "jsonb", reconciled: false };
  }
  const merged = jsonbItems.map((item, index) => {
    const rel = matches[index]!;
''' + s[b:];p.write_text(s)
edit('client/src/components/ui/dynamic-button.tsx','        {...props}\n        ref={buttonRef}','        {...props}\n        aria-label={props["aria-label"] ?? children}\n        ref={buttonRef}')
edit('api/ssr-meta.ts','`/upload/f_auto,q_auto:good,w_${width},h_${width},c_limit/`','`/upload/f_auto,q_auto:best,w_${width},h_${width},c_limit/`')
edit('api/ssr-meta.ts','// quality auto:good, format auto, crop limit)', '// quality auto:best, format auto, crop limit)')
p=r/'client/src/components/products/product-image-gallery.tsx';s=p.read_text().replace('useState, useRef, useCallback','useState, useRef, useCallback, useEffect')
s=s.replace('    const galleryImages = buildGalleryImages(images, productName);','''    const galleryImages = buildGalleryImages(images, productName);
    const failedSources = useRef(new Set<string>());
    const galleryIdentity = JSON.stringify(galleryImages);
    useEffect(() => {
        failedSources.current.clear();
        setImageFailed(false);
        setSelectedIndex(0);
    }, [galleryIdentity]);''')
s=s.replace('                                src={mainImageSrc}','                                key={currentImage}\n                                src={mainImageSrc}',1)
s=s.replace('                                        target.src = currentImage;','                                        target.removeAttribute("srcset");\n                                        target.removeAttribute("sizes");\n                                        target.src = currentImage;',1)
a=s.index('                                    } else if (galleryImages.length > 1) {',s.index('key={currentImage}'));b=s.index('                                    }\n                                }}',a)
s=s[:a]+'''                                    } else {
                                        failedSources.current.add(currentImage);
                                        const next = galleryImages.findIndex((image) => !failedSources.current.has(image));
                                        if (next >= 0) setSelectedIndex(next);
                                        else setImageFailed(true);
''' + s[b:];p.write_text(s)
edit('server/services/financeAuditStorage.ts','    triggeredBy: string = "scheduled"\n  ): Promise<string>','    triggeredBy: string = "scheduled",\n    usedModel?: string,\n  ): Promise<string>')
edit('server/services/financeAuditStorage.ts','    const model = process.env.FINANCE_GROQ_MODEL || "llama-3.1-8b-instant";','    const model = usedModel ?? (result.error ? "unavailable" : (process.env.FINANCE_GROQ_MODEL || "llama-3.1-8b-instant"));')
edit('server/services/groq-finance-audit-resilient.ts','      usedModel ? `${triggeredBy}:${usedModel}` : triggeredBy,','      triggeredBy,\n      usedModel,')
p=r/'server/services/smart-notifications.ts';s=p.read_text();s=s.replace('    skippedFrequencyCap: number;','    skippedFrequencyCap: number;\n    skippedReason?: "no_active_subscriptions";')
s=s.replace('      const candidates: Array<{','''      const subscribers = await db.selectDistinct({ userId: pushSubscriptions.userId })
        .from(pushSubscriptions).where(eq(pushSubscriptions.isActive, true));
      const eligible = new Set(subscribers.map((row) => row.userId).filter((id): id is string => Boolean(id)));
      if (eligible.size === 0) return { ...results, skippedReason: "no_active_subscriptions" };

      const candidates: Array<{''',1)
for name in ['Replenishment','Churn','Welcome','CartAbandonment','NewProduct','SeasonalTip']:
 s=s.replace(f'this.gather{name}Candidates()',f'this.gather{name}Candidates(eligible)')
 s=s.replace(f'private async gather{name}Candidates()',f'private async gather{name}Candidates(eligible: ReadonlySet<string>)')
s=s.replace('      for (const [userId, pred] of byUser) {','      for (const [userId, pred] of byUser) {\n        if (!eligible.has(userId)) continue;')
for expression in ['user.userId','user.id','item.userId','sub.userId']:
 s=s.replace(f'if (!{expression}) continue;',f'if (!{expression} || !eligible.has({expression})) continue;')
p.write_text(s)
p=r/'server/routes/oauth.ts';s=p.read_text();s=s.replace('''      <div class="scope-item">قراءة وتعديل المنتجات والمخزون</div>
      <div class="scope-item">قراءة وتحديث حالة الطلبات</div>
      <div class="scope-item">قراءة بيانات الزبائن والتقارير</div>
      <div class="scope-item">إدارة الكوبونات والمصاريف</div>
      <div class="scope-item">الإحصائيات والتحليلات</div>''','''      ${scopeItems.map((item) => `<div class="scope-item">${esc(item === "mcp:read" ? "قراءة بيانات المتجر والزبائن والتقارير" : item === "mcp:write" ? "تعديل المنتجات والمخزون والطلبات والكوبونات والمصاريف" : "قراءة الكتالوج العام فقط")}</div>`).join("")}''');p.write_text(s)
p=r/'.github/workflows/ci.yml';s=p.read_text().replace('NODE_VERSION: 20.19.0','NODE_VERSION: "24.x"');p.write_text(s)
p=r/'vercel.json';s=json.loads(p.read_text());assert s['buildCommand']=='pnpm run build';s['buildCommand']='node scripts/require-production-ci.mjs && pnpm run build';p.write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n')
