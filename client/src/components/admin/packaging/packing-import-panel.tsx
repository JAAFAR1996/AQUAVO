import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertTriangle, FileSpreadsheet, Ruler, Upload } from "lucide-react";
import {
  MATCH_CONFIDENCE_LABEL,
  MISSING_FIELD_LABEL,
  UNKNOWN_LABEL,
  useConfirmPackingImport,
  useMissingPackingData,
  useUploadPackingImport,
  type ImportRawRow,
  type ImportRowView,
  type ImportSummaryView,
  type MissingPackingRow,
} from "@/hooks/use-packaging";
import { translateError } from "./packaging-forms";

const HEADERS = {
  productName: ["اسم المنتج"],
  pieceCount: ["عدد القطع"],
  packedHeight: ["طول المنتج مع كارتونة"],
  packedWidth: ["عرض المنتج مع كارتونتة", "عرض المنتج مع كارتونة"],
  foldable: ["هل قابل للطي"],
} as const;

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function findColumn(header: string[], names: readonly string[]): number {
  const norm = (value: string) => value.replace(/\s+/g, " ").trim();
  return header.findIndex((cell) => names.some((name) => norm(cell) === norm(name)));
}

export interface MappedSheet {
  rows: ImportRawRow[];
  missingHeaders: string[];
}

export function mapSheet(grid: string[][]): MappedSheet {
  if (!grid.length) return { rows: [], missingHeaders: [HEADERS.productName[0]] };
  const header = grid[0]!;
  const indexes = {
    productName: findColumn(header, HEADERS.productName),
    pieceCount: findColumn(header, HEADERS.pieceCount),
    packedHeight: findColumn(header, HEADERS.packedHeight),
    packedWidth: findColumn(header, HEADERS.packedWidth),
    foldable: findColumn(header, HEADERS.foldable),
  };
  const missingHeaders = indexes.productName < 0 ? [HEADERS.productName[0]] : [];
  const rows: ImportRawRow[] = [];

  for (let rowIndex = 1; rowIndex < grid.length; rowIndex++) {
    const line = grid[rowIndex]!;
    const at = (index: number) => index >= 0 && line[index]?.trim() ? line[index]!.trim() : null;
    const productName = at(indexes.productName);
    if (!productName) continue;
    rows.push({
      rowNumber: rowIndex + 1,
      productName,
      pieceCount: at(indexes.pieceCount),
      packedHeight: at(indexes.packedHeight),
      packedWidth: at(indexes.packedWidth),
      foldable: at(indexes.foldable),
    });
  }
  return { rows, missingHeaders };
}

function SummaryChips({ summary }: { summary: ImportSummaryView }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs" data-testid="import-summary">
      <Badge variant="outline">الكل {summary.total}</Badge>
      <Badge variant="outline">مطابقة أكيدة {summary.exact}</Badge>
      <Badge variant="outline">مطابقة محتملة {summary.probable}</Badge>
      <Badge variant={summary.ambiguous > 0 ? "destructive" : "outline"}>غير مطابقة أو غامضة {summary.ambiguous}</Badge>
      {summary.warnings > 0 && <Badge variant="destructive">قيم تحتاج تدقيق {summary.warnings}</Badge>}
    </div>
  );
}

function LocalPreview({ rows }: { rows: ImportRawRow[] }) {
  return (
    <div className="space-y-2" data-testid="local-csv-preview">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-sm">معاينة الصفوف قبل المطابقة</strong>
        <Badge variant="outline">{rows.length} صف</Badge>
      </div>
      <div className="max-h-72 overflow-auto rounded-md border">
        <table className="w-full min-w-[620px] text-xs">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="p-2 text-right">الصف</th>
              <th className="p-2 text-right">اسم المنتج</th>
              <th className="p-2 text-right">عدد القطع</th>
              <th className="p-2 text-right">الارتفاع</th>
              <th className="p-2 text-right">العرض</th>
              <th className="p-2 text-right">قابل للطي</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((row) => (
              <tr key={String(row.rowNumber)} className="border-b last:border-0">
                <td className="p-2">{String(row.rowNumber ?? "")}</td>
                <td className="p-2 font-medium">{String(row.productName ?? "")}</td>
                <td className="p-2">{String(row.pieceCount ?? "—")}</td>
                <td className="p-2">{String(row.packedHeight ?? "—")}</td>
                <td className="p-2">{String(row.packedWidth ?? "—")}</td>
                <td className="p-2">{String(row.foldable ?? "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 50 && <p className="text-xs text-muted-foreground">تظهر أول 50 صف بالمعاينة، وكل الصفوف تُحلل عند المطابقة.</p>}
    </div>
  );
}

function MatchedRows({ rows, confirmed, setConfirmed }: {
  rows: ImportRowView[];
  confirmed: Set<number>;
  setConfirmed: (next: Set<number>) => void;
}) {
  return (
    <div className="max-h-[420px] space-y-2 overflow-auto rounded-md border p-2" data-testid="matched-import-rows">
      {rows.map((row) => {
        const probable = row.matchConfidence === "probable";
        const ambiguous = row.matchConfidence === "ambiguous";
        return (
          <div key={row.rowNumber} className="space-y-1 rounded-md border p-2 text-xs" data-testid={`import-row-${row.rowNumber}`}>
            <div className="flex flex-wrap items-center gap-2">
              {probable && (
                <input
                  type="checkbox"
                  checked={confirmed.has(row.rowNumber)}
                  onChange={(event) => {
                    const next = new Set(confirmed);
                    if (event.target.checked) next.add(row.rowNumber); else next.delete(row.rowNumber);
                    setConfirmed(next);
                  }}
                  aria-label={`تأكيد الصف ${row.rowNumber}`}
                />
              )}
              <strong>{row.rawProductName}</strong>
              <Badge variant={ambiguous ? "destructive" : "outline"}>{MATCH_CONFIDENCE_LABEL[row.matchConfidence]}</Badge>
              <span className="text-muted-foreground">← {row.matchCandidates[0]?.name ?? "لا توجد مطابقة"}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-muted-foreground">
              <span>الارتفاع: {row.packedHeightCm ?? UNKNOWN_LABEL}</span>
              <span>العرض: {row.packedWidthCm ?? UNKNOWN_LABEL}</span>
            </div>
            {row.parseWarnings.length > 0 && <p className="text-destructive">{row.parseWarnings.join("، ")}</p>}
            {ambiguous && <p className="text-destructive">هذا الصف لن يُطبّق. صحّح الاسم في الملف ثم أعد الاستيراد.</p>}
          </div>
        );
      })}
    </div>
  );
}

export function PackingImportPanel() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<ImportRawRow[]>([]);
  const [preview, setPreview] = useState<{ draftId: string; summary: ImportSummaryView; rows: ImportRowView[] } | null>(null);
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set());
  const [reason, setReason] = useState("");
  const [readError, setReadError] = useState<string | null>(null);
  const upload = useUploadPackingImport();
  const confirm = useConfirmPackingImport(preview?.draftId ?? "");

  async function onFile(file: File) {
    setReadError(null);
    setPreview(null);
    setConfirmed(new Set());
    setFileName(file.name);
    const mapped = mapSheet(parseCsv(await file.text()));
    if (mapped.missingHeaders.length) {
      setSelectedRows([]);
      setReadError(`ما لكيت العمود المطلوب: ${mapped.missingHeaders.join("، ")}`);
      return;
    }
    if (!mapped.rows.length) {
      setSelectedRows([]);
      setReadError("الملف ماكو بيه أسطر فيها اسم منتج.");
      return;
    }
    // اختيار الملف ومعاينته محلي فقط. لا يتم إنشاء مسودة ولا كتابة أي شيء هنا.
    setSelectedRows(mapped.rows);
  }

  function analyzeAndMatch() {
    if (!fileName || selectedRows.length === 0) return;
    upload.mutate(
      { fileName, rows: selectedRows },
      { onSuccess: (data) => { setPreview(data); setConfirmed(new Set()); } },
    );
  }

  const canConfirm = Boolean(preview) && reason.trim().length >= 3 && !confirm.isPending;

  return (
    <Card dir="rtl" data-testid="panel-packing-import">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Ruler className="h-5 w-5" />بيانات تغليف المنتجات</CardTitle>
        <p className="text-sm text-muted-foreground">اختيار الملف لا يكتب بيانات. راجع الصفوف، طابق المنتجات، ثم وافق صراحة قبل التطبيق.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-4" aria-label="مراحل الاستيراد">
          {["1. اختيار الملف", "2. معاينة الصفوف", "3. مطابقة وتحقق", "4. موافقة وتطبيق"].map((label) => (
            <div key={label} className="rounded-md border p-2 text-center text-xs font-medium">{label}</div>
          ))}
        </div>

        <Alert>
          <FileSpreadsheet className="h-4 w-4" />
          <AlertDescription className="text-xs">
            استخدم CSV UTF-8. «عدد القطع» للمعلومة فقط، ولا يغيّر مخزون المنتجات أو الكراتين أو عدد الوحدات. النظام لا يخمّن الوزن أو العمق أو أي قياس ناقص.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              data-testid="input-import-file"
              onChange={(event) => { const file = event.target.files?.[0]; if (file) void onFile(file); }}
            />
            <Button asChild variant="outline" size="sm"><span className="cursor-pointer"><Upload className="ml-2 h-4 w-4" />اختيار ملف CSV</span></Button>
          </label>
          {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
        </div>

        {readError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{readError}</AlertDescription></Alert>}

        {selectedRows.length > 0 && !preview && (
          <div className="space-y-3">
            <LocalPreview rows={selectedRows} />
            <Button onClick={analyzeAndMatch} disabled={upload.isPending} data-testid="button-analyze-import">
              {upload.isPending ? "جاري التحليل والمطابقة…" : "تحليل ومطابقة المنتجات"}
            </Button>
          </div>
        )}

        {upload.error && <Alert variant="destructive"><AlertDescription>{translateError(upload.error instanceof Error ? upload.error.message : String(upload.error))}</AlertDescription></Alert>}

        {preview && (
          <div className="space-y-3" data-testid="import-preview">
            <SummaryChips summary={preview.summary} />
            <MatchedRows rows={preview.rows} confirmed={confirmed} setConfirmed={setConfirmed} />
            <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="سبب الاستيراد (إجباري)" data-testid="input-import-reason" />
            {confirm.error && <Alert variant="destructive"><AlertDescription>{translateError(confirm.error instanceof Error ? confirm.error.message : String(confirm.error))}</AlertDescription></Alert>}
            {confirm.isSuccess && <Alert data-testid="import-done"><AlertDescription>تم تطبيق الصفوف المقبولة فقط. لم يتغير أي مخزون.</AlertDescription></Alert>}
            <Button
              disabled={!canConfirm}
              onClick={() => confirm.mutate({ confirmedRowNumbers: Array.from(confirmed), reason: reason.trim() })}
              data-testid="button-confirm-import"
            >
              {confirm.isPending ? "جاري التطبيق…" : "موافقة صريحة وتطبيق البيانات"}
            </Button>
            <p className="text-xs text-muted-foreground">المطابقات الأكيدة تُقبل، المحتملة تحتاج تأشيرك، والغامضة لا تُطبّق أبداً.</p>
          </div>
        )}

        <MissingDataQueue />
      </CardContent>
    </Card>
  );
}

type MissingFilter = "all" | "complete" | "incomplete" | "no-weight" | "no-depth" | "review";

function matchesFilter(row: MissingPackingRow, filter: MissingFilter): boolean {
  if (filter === "complete") return row.complete;
  if (filter === "incomplete") return !row.complete;
  if (filter === "no-weight") return row.missing.includes("packed_weight_kg");
  if (filter === "no-depth") return row.missing.includes("packed_depth_cm");
  if (filter === "review") return row.manualReview;
  return true;
}

function MissingDataQueue() {
  const { data, isLoading } = useMissingPackingData();
  const [filter, setFilter] = useState<MissingFilter>("all");
  const items = data?.items ?? [];
  const summary = data?.summary;
  const filtered = useMemo(() => items.filter((item) => matchesFilter(item, filter)), [items, filter]);
  const filters: Array<[MissingFilter, string]> = [
    ["all", "الكل"],
    ["complete", "مكتملة"],
    ["incomplete", "ناقصة"],
    ["no-weight", "بدون وزن"],
    ["no-depth", "بدون عمق"],
    ["review", "تحتاج مراجعة"],
  ];

  return (
    <div className="space-y-4 border-t pt-4" data-testid="missing-data-queue">
      <div>
        <h3 className="font-semibold">حالة بيانات التغليف</h3>
        <p className="text-xs text-muted-foreground">نقص بيانات منتج يمنع التخطيط التلقائي لهذا المنتج فقط، ولا يوقف المتجر بالكامل.</p>
      </div>

      {summary && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Counter label="بدون ارتفاع بعد التغليف" value={summary.withoutHeight} />
          <Counter label="بدون عرض بعد التغليف" value={summary.withoutWidth} />
          <Counter label="بدون عمق بعد التغليف" value={summary.withoutDepth} />
          <Counter label="بدون وزن بعد التغليف" value={summary.withoutWeight} />
          <Counter label="بيانات مكتملة" value={summary.complete} />
          <Counter label="تحتاج مراجعة يدوية" value={summary.manualReview} />
          <Counter label="إجمالي المنتجات المتأثرة بشكل فريد" value={summary.affectedUnique} />
          <Counter label="إجمالي المنتجات المفحوصة" value={summary.total} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {filters.map(([value, label]) => (
          <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} onClick={() => setFilter(value)}>{label}</Button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">جاري التحميل…</p>}
      {!isLoading && filtered.length === 0 && <p className="text-sm text-muted-foreground">ماكو منتجات ضمن هذا الفلتر.</p>}
      <ul className="max-h-[420px] space-y-1 overflow-auto">
        {filtered.map((item) => (
          <li key={`${item.productId}-${item.variantId ?? ""}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-xs" data-testid={`missing-row-${item.productId}`}>
            <span className="font-medium">{item.productName}</span>
            <div className="flex flex-wrap items-center gap-2">
              {item.complete ? <Badge variant="outline">مكتملة</Badge> : <span className="text-muted-foreground">ناقص: {item.missing.map((field) => MISSING_FIELD_LABEL[field] ?? field).join("، ")}</span>}
              {item.manualReview && <Badge variant="secondary">تحتاج مراجعة</Badge>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-xl font-bold">{value}</div></div>;
}
