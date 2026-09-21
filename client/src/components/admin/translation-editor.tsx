import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LOCALES, TRANSLATION_TARGET_LOCALES, type Locale } from "@shared/i18n/locales";

type EntityType = "product" | "blog_post" | "category" | "blog_category";
type Coverage = "complete" | "machine" | "outdated" | "partial" | "missing";

const ENTITY_LABELS: Record<EntityType, string> = {
  product: "المنتجات",
  blog_post: "المقالات",
  category: "فئات المنتجات",
  blog_category: "فئات المدونة",
};

/** Linguistic fields per entity. Stock, price, SKU, images and codes are never here. */
const FIELDS: Record<EntityType, Array<{ key: string; label: string; multiline?: boolean; list?: boolean }>> = {
  product: [
    { key: "name", label: "الاسم" },
    { key: "description", label: "الوصف", multiline: true },
    { key: "subcategory", label: "الفئة الفرعية" },
    { key: "seoTitle", label: "عنوان SEO" },
    { key: "seoDescription", label: "وصف SEO", multiline: true },
    { key: "specifications.benefits", label: "الفوائد (سطر لكل بند)", multiline: true, list: true },
    { key: "specifications.usageInstructions", label: "طريقة الاستخدام (سطر لكل خطوة)", multiline: true, list: true },
    { key: "specifications.safetyWarnings", label: "تحذيرات الأمان (سطر لكل بند)", multiline: true, list: true },
    { key: "specifications.__cardBenefit", label: "ميزة البطاقة" },
  ],
  blog_post: [
    { key: "title", label: "العنوان" },
    { key: "excerpt", label: "المقتطف", multiline: true },
    { key: "content", label: "المحتوى (HTML)", multiline: true },
    { key: "category", label: "الفئة" },
    { key: "seoTitle", label: "عنوان SEO" },
    { key: "seoDescription", label: "وصف SEO", multiline: true },
  ],
  category: [
    { key: "displayName", label: "الاسم المعروض" },
    { key: "description", label: "الوصف", multiline: true },
  ],
  blog_category: [
    { key: "name", label: "الاسم" },
    { key: "description", label: "الوصف", multiline: true },
  ],
};

const SOURCE_FIELD_MAP: Record<EntityType, Record<string, string>> = {
  product: { name: "name", description: "description", subcategory: "subcategory", "specifications.benefits": "benefits", "specifications.usageInstructions": "usageInstructions", "specifications.safetyWarnings": "safetyWarnings", "specifications.__cardBenefit": "cardBenefit" },
  blog_post: { title: "title", excerpt: "excerpt", content: "content", category: "category" },
  category: { displayName: "displayName", description: "description" },
  blog_category: { name: "name", description: "description" },
};

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), obj);
}
function setPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.split(".");
  const out = { ...obj };
  let cur: Record<string, unknown> = out;
  parts.slice(0, -1).forEach((p) => {
    cur[p] = { ...((cur[p] as Record<string, unknown>) ?? {}) };
    cur = cur[p] as Record<string, unknown>;
  });
  cur[parts[parts.length - 1]] = value;
  return out;
}

function StatusBadge({ status }: { status: Coverage }) {
  const map: Record<Coverage, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
    complete: { label: "مكتملة", className: "bg-emerald-100 text-emerald-800", Icon: CheckCircle2 },
    machine: { label: "آلية — تحتاج مراجعة", className: "bg-amber-100 text-amber-800", Icon: Clock3 },
    outdated: { label: "قديمة — المصدر تغيّر", className: "bg-orange-100 text-orange-800", Icon: AlertTriangle },
    partial: { label: "ناقصة — حقول مطلوبة فارغة", className: "bg-rose-100 text-rose-800", Icon: AlertTriangle },
    missing: { label: "مفقودة", className: "bg-red-100 text-red-800", Icon: XCircle },
  };
  const { label, className, Icon } = map[status];
  return (
    <Badge className={`gap-1 ${className}`} variant="outline">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}

interface EntityRow { id: string; label: string; slug?: string | null; published: boolean; status: Record<string, Coverage> }
interface EntityDetail {
  id: string;
  label: string;
  source: Record<string, unknown>;
  translations: Record<string, { status: Coverage; record: { data: Record<string, unknown>; status: string; translatedBy: string | null; updatedAt: string } | null }>;
}

export function TranslationEditor() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [type, setType] = useState<EntityType>("product");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const coverage = useQuery({
    queryKey: ["admin", "translations", "coverage"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/translations/coverage")).json() as Promise<Record<EntityType, Record<Locale, Record<Coverage, number> & { total: number }>>>,
  });
  const list = useQuery({
    queryKey: ["admin", "translations", type, q],
    queryFn: async () => (await apiRequest("GET", `/api/admin/translations/${type}?q=${encodeURIComponent(q)}`)).json() as Promise<EntityRow[]>,
  });
  const detail = useQuery({
    queryKey: ["admin", "translations", type, "detail", selectedId],
    enabled: !!selectedId,
    queryFn: async () => (await apiRequest("GET", `/api/admin/translations/${type}/${selectedId}`)).json() as Promise<EntityDetail>,
  });

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>حالة الترجمة</CardTitle>
        </CardHeader>
        <CardContent>
          {coverage.data ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-start py-1">الكيان</th>
                  {TRANSLATION_TARGET_LOCALES.map((l) => (
                    <th key={l} className="text-start py-1">{LOCALES[l].nativeName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(ENTITY_LABELS) as EntityType[]).map((t) => (
                  <tr key={t} className="border-t">
                    <td className="py-2 font-medium">{ENTITY_LABELS[t]}</td>
                    {TRANSLATION_TARGET_LOCALES.map((l) => {
                      const c = coverage.data?.[t]?.[l];
                      if (!c) return <td key={l}>—</td>;
                      const done = c.complete + c.machine;
                      return (
                        <td key={l} className="py-2">
                          <span className={done === c.total && c.outdated === 0 ? "text-emerald-700" : "text-amber-700"}>{done}/{c.total}</span>
                          <span className="text-xs text-muted-foreground"> (مكتملة {c.complete}، آلية {c.machine}، قديمة {c.outdated}، ناقصة {c.partial ?? 0}، مفقودة {c.missing})</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Loader2 className="h-5 w-5 animate-spin" />
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            أي منتج أو مقال جديد يظهر هنا كـ "مفقودة" حتى تُضاف ترجمته. الصفحة الإنكليزية/الكوردية لكيان مفقود الترجمة تُعرض بالعربية ولا تُفهرس.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader className="space-y-2">
            <Tabs value={type} onValueChange={(v) => { setType(v as EntityType); setSelectedId(null); }}>
              <TabsList className="grid grid-cols-2">
                {(Object.keys(ENTITY_LABELS) as EntityType[]).map((t) => (
                  <TabsTrigger key={t} value={t} className="text-xs">{ENTITY_LABELS[t]}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الرابط..." />
          </CardHeader>
          <CardContent className="max-h-[560px] space-y-1 overflow-y-auto">
            {list.data?.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedId(row.id)}
                className={`w-full rounded-md border px-3 py-2 text-start text-sm hover:bg-muted ${selectedId === row.id ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="truncate font-medium">{row.label}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {TRANSLATION_TARGET_LOCALES.map((l) => (
                    <span key={l} className="text-[10px]">
                      {LOCALES[l].nativeName}: <StatusBadge status={row.status[l]} />
                    </span>
                  ))}
                </div>
              </button>
            ))}
            {list.data?.length === 0 && <p className="text-sm text-muted-foreground">لا نتائج</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {!selectedId && <p className="text-sm text-muted-foreground">اختر كياناً من القائمة لتحرير ترجماته.</p>}
            {selectedId && detail.data && (
              <EntityForm
                key={selectedId}
                type={type}
                detail={detail.data}
                onSaved={() => {
                  void qc.invalidateQueries({ queryKey: ["admin", "translations"] });
                  toast({ title: "تم حفظ الترجمة" });
                }}
              />
            )}
            {selectedId && detail.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EntityForm({ type, detail, onSaved }: { type: EntityType; detail: EntityDetail; onSaved: () => void }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>({});
  useEffect(() => {
    const next: Record<string, Record<string, unknown>> = {};
    for (const l of TRANSLATION_TARGET_LOCALES) next[l] = { ...(detail.translations[l]?.record?.data ?? {}) };
    setDrafts(next);
  }, [detail]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/admin/translations/${type}/${detail.id}/${locale}`, { data: drafts[locale], status: "reviewed" });
      return res.json();
    },
    onSuccess: onSaved,
  });

  const fields = FIELDS[type];
  const draft = drafts[locale] ?? {};
  const status = detail.translations[locale]?.status ?? "missing";
  const sourceValue = (key: string): string => {
    const v = getPath(detail.source, SOURCE_FIELD_MAP[type][key] ?? key);
    return Array.isArray(v) ? v.join("\n") : v == null ? "" : String(v);
  };
  const draftValue = (key: string): string => {
    const v = getPath(draft, key);
    return Array.isArray(v) ? v.join("\n") : v == null ? "" : String(v);
  };
  const missingPrimary = useMemo(() => !String(getPath(draft, fields[0].key) ?? "").trim(), [draft, fields]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold">{detail.label}</h3>
        <Tabs value={locale} onValueChange={(v) => setLocale(v as Locale)}>
          <TabsList>
            <TabsTrigger value="ar" disabled>العربية (المصدر)</TabsTrigger>
            {TRANSLATION_TARGET_LOCALES.map((l) => (
              <TabsTrigger key={l} value={l}>{LOCALES[l].nativeName}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <StatusBadge status={status} />
        {detail.translations[locale]?.record?.translatedBy && (
          <span className="text-xs text-muted-foreground">آخر مصدر: {detail.translations[locale].record?.translatedBy}</span>
        )}
      </div>
      {status === "outdated" && (
        <p className="rounded-md border border-orange-300 bg-orange-50 p-2 text-sm text-orange-900">
          النص العربي تغيّر بعد هذه الترجمة. راجع الحقول وأعد الحفظ حتى تُعتبر محدثة.
        </p>
      )}
      {fields.map((f) => (
        <div key={f.key} className="grid gap-2 md:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">{f.label} — العربية</label>
            <Textarea readOnly value={sourceValue(f.key)} className="min-h-[60px] bg-muted/40 text-sm" dir="rtl" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{f.label} — {LOCALES[locale].nativeName}</label>
            {f.multiline ? (
              <Textarea
                value={draftValue(f.key)}
                dir={LOCALES[locale].dir}
                lang={locale}
                className="min-h-[60px] text-sm"
                onChange={(e) => setDrafts((d) => ({ ...d, [locale]: setPath(d[locale] ?? {}, f.key, f.list ? e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) : e.target.value) }))}
              />
            ) : (
              <Input
                value={draftValue(f.key)}
                dir={LOCALES[locale].dir}
                lang={locale}
                onChange={(e) => setDrafts((d) => ({ ...d, [locale]: setPath(d[locale] ?? {}, f.key, e.target.value) }))}
              />
            )}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button onClick={() => save.mutate()} disabled={save.isPending || missingPrimary} className="gap-2">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ كمراجَعة
        </Button>
        {missingPrimary && <span className="text-xs text-destructive">الحقل الأول إلزامي حتى لا تُنشر لغة فارغة.</span>}
      </div>
    </div>
  );
}
