// أبعاد تغليف المنتجات — استيراد ومراجعة قبل التطبيق.
//
// WHY CSV AND NOT .xlsx
// The repo has no spreadsheet parser, and the npm `xlsx` package is no longer
// maintained upstream. Adding an unmaintained binary-format parser to a
// production accounting system to read a file the owner can export as CSV in two
// clicks is a bad trade. The Arabic headers below survive that export unchanged,
// so the locked column meanings are preserved exactly.
//
// WHAT THIS DELIBERATELY DOES NOT DO
//   * it never writes product stock — «عدد القطع» is read and shown, and goes
//     nowhere near inventory;
//   * it never applies an `ambiguous` row, confirmed or not;
//   * it never invents depth or weight. The sheet does not carry them, so every
//     imported product stays incomplete for planning until the owner supplies
//     them, and the planner keeps failing closed. That is the intended outcome,
//     not a gap in the import.
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Ruler, Upload, AlertTriangle } from "lucide-react";
import {
  MATCH_CONFIDENCE_LABEL,
  UNKNOWN_LABEL,
  useConfirmPackingImport,
  useMissingPackingData,
  useUploadPackingImport,
  MISSING_FIELD_LABEL,
  type ImportRawRow,
  type ImportRowView,
  type ImportSummaryView,
} from "@/hooks/use-packaging";
import { translateError } from "./packaging-forms";

/** Header text exactly as the owner's sheet carries it, typo included. */
const HEADERS = {
  productName: ["اسم المنتج"],
  pieceCount: ["عدد القطع"],
  // Both spellings accepted: the sheet has the typo, the spec writes it correctly.
  packedHeight: ["طول المنتج مع كارتونة"],
  packedWidth: ["عرض المنتج مع كارتونتة", "عرض المنتج مع كارتونة"],
  foldable: ["هل قابل للطي"],
} as const;

/**
 * Minimal RFC4180-ish CSV reader: quoted fields, escaped quotes, CRLF, BOM.
 * Enough for a spreadsheet export and nothing more.
 */
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
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  return header.findIndex((h) => names.some((n) => norm(h) === norm(n)));
}

export interface MappedSheet {
  rows: ImportRawRow[];
  missingHeaders: string[];
}

/** Map a CSV grid onto the upload contract. Row numbers are 1-based sheet rows. */
export function mapSheet(grid: string[][]): MappedSheet {
  if (!grid.length) return { rows: [], missingHeaders: Object.keys(HEADERS) };
  const header = grid[0]!;
  const idx = {
    productName: findColumn(header, HEADERS.productName),
    pieceCount: findColumn(header, HEADERS.pieceCount),
    packedHeight: findColumn(header, HEADERS.packedHeight),
    packedWidth: findColumn(header, HEADERS.packedWidth),
    foldable: findColumn(header, HEADERS.foldable),
  };
  // Only the product name is structurally required; the rest may be absent and
  // simply stay unresolved rather than blocking the whole import.
  const missingHeaders = idx.productName < 0 ? [HEADERS.productName[0]] : [];

  const rows: ImportRawRow[] = [];
  for (let r = 1; r < grid.length; r++) {
    const line = grid[r]!;
    const at = (i: number) => (i >= 0 && line[i] != null && line[i]!.trim() !== "" ? line[i]!.trim() : null);
    const name = at(idx.productName);
    if (!name) continue;
    rows.push({
      rowNumber: r + 1,
      productName: name,
      pieceCount: at(idx.pieceCount),
      packedHeight: at(idx.packedHeight),
      packedWidth: at(idx.packedWidth),
      foldable: at(idx.foldable),
    } as ImportRawRow);
  }
  return { rows, missingHeaders };
}

function SummaryChips({ s }: { s: ImportSummaryView }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs" data-testid="import-summary">
      <Badge variant="outline">الكل {s.total}</Badge>
      <Badge variant="outline">مطابقة أكيدة {s.exact}</Badge>
      <Badge variant="outline">محتملة {s.probable}</Badge>
      <Badge variant={s.ambiguous > 0 ? "destructive" : "outline"}>غير محسومة {s.ambiguous}</Badge>
      <Badge variant="outline">عندها طول {s.withHeight}</Badge>
      <Badge variant="outline">عندها عرض {s.withWidth}</Badge>
      {s.warnings > 0 && <Badge variant="destructive">تنبيهات {s.warnings}</Badge>}
    </div>
  );
}

export function PackingImportPanel() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    draftId: string; summary: ImportSummaryView; rows: ImportRowView[];
  } | null>(null);
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set());
  const [reason, setReason] = useState("");
  const [readError, setReadError] = useState<string | null>(null);

  const upload = useUploadPackingImport();
  const confirm = useConfirmPackingImport(preview?.draftId ?? "");

  async function onFile(file: File) {
    setReadError(null); setPreview(null); setConfirmed(new Set());
    setFileName(file.name);
    const text = await file.text();
    const { rows, missingHeaders } = mapSheet(parseCsv(text));
    if (missingHeaders.length) {
      setReadError(`ما لكيت العمود المطلوب: ${missingHeaders.join("، ")}`);
      return;
    }
    if (!rows.length) {
      setReadError("الملف ماكو بيه أسطر فيها اسم منتج.");
      return;
    }
    upload.mutate(
      { fileName: file.name, rows },
      { onSuccess: (d) => setPreview(d) },
    );
  }

  const probable = preview?.rows.filter((r) => r.matchConfidence === "probable") ?? [];
  const ambiguous = preview?.rows.filter((r) => r.matchConfidence === "ambiguous") ?? [];
  const canConfirm = Boolean(preview) && reason.trim().length >= 3 && !confirm.isPending;

  return (
    <Card dir="rtl" data-testid="panel-packing-import">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Ruler className="h-5 w-5" />
          أبعاد تغليف المنتجات
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          استورد ملف القياسات، شوف المعاينة، وبعدين طبّق. ما ينطبق شي قبل ما تأكد.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription className="text-xs">
            صدّر الشيت من Excel بصيغة <strong>CSV UTF-8</strong>. العناوين المطلوبة:
            «اسم المنتج»، «عدد القطع»، «طول المنتج مع كارتونة»، «عرض المنتج مع كارتونتة»،
            «هل قابل للطي».
            <br />
            «عدد القطع» للمعلومة فقط — ما يمس مخزون المنتجات إطلاقاً.
            <br />
            الشيت ما يحتوي <strong>السماكة</strong> ولا <strong>الوزن</strong>، فهذولا يبقون
            ناقصين بعد الاستيراد والمخطط التلقائي يبقى متوقف للمنتجات هاي.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex">
            <input
              type="file" accept=".csv,text/csv" className="hidden"
              data-testid="input-import-file"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
            />
            <Button asChild variant="outline" size="sm">
              <span className="cursor-pointer">
                <Upload className="ml-2 h-4 w-4" />
                اختيار ملف CSV
              </span>
            </Button>
          </label>
          {fileName && <span className="text-muted-foreground text-xs">{fileName}</span>}
          {upload.isPending && <span className="text-muted-foreground text-xs">جاري التحليل…</span>}
        </div>

        {readError && (
          <Alert variant="destructive" data-testid="import-read-error">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{readError}</AlertDescription>
          </Alert>
        )}
        {upload.error != null && (
          <Alert variant="destructive" data-testid="import-upload-error">
            <AlertDescription className="text-xs">
              {translateError(upload.error instanceof Error ? upload.error.message : String(upload.error))}
            </AlertDescription>
          </Alert>
        )}

        {preview && (
          <div className="space-y-3" data-testid="import-preview">
            <SummaryChips s={preview.summary} />

            {ambiguous.length > 0 && (
              <Alert variant="destructive" data-testid="ambiguous-notice">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {ambiguous.length} سطر ما انحسم اسم منتجه. هذولا <strong>ما راح ينطبقون</strong>،
                  حتى لو أشّرتهم — اختيار منتج بالحزر يخرب البيانات. صلّح الأسماء بالشيت وأعد الاستيراد.
                </AlertDescription>
              </Alert>
            )}

            {probable.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold">
                  مطابقات محتملة — أشّر اللي تريد تأكيده ({confirmed.size}/{probable.length})
                </div>
                {probable.map((r) => (
                  <label
                    key={r.rowNumber}
                    className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-xs"
                    data-testid={`import-row-${r.rowNumber}`}
                  >
                    <input
                      type="checkbox"
                      checked={confirmed.has(r.rowNumber)}
                      onChange={(e) => setConfirmed((p) => {
                        const n = new Set(p);
                        if (e.target.checked) n.add(r.rowNumber); else n.delete(r.rowNumber);
                        return n;
                      })}
                      data-testid={`checkbox-row-${r.rowNumber}`}
                    />
                    <span className="font-medium">{r.rawProductName}</span>
                    <span className="text-muted-foreground">
                      {r.matchCandidates[0]?.name ?? UNKNOWN_LABEL}
                    </span>
                    <Badge variant="outline">{MATCH_CONFIDENCE_LABEL[r.matchConfidence]}</Badge>
                  </label>
                ))}
              </div>
            )}

            <Input
              value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="سبب الاستيراد (إجباري)" data-testid="input-import-reason"
            />

            {confirm.error != null && (
              <Alert variant="destructive" data-testid="import-confirm-error">
                <AlertDescription className="text-xs">
                  {translateError(confirm.error instanceof Error ? confirm.error.message : String(confirm.error))}
                </AlertDescription>
              </Alert>
            )}

            {confirm.isSuccess && (
              <Alert data-testid="import-done">
                <AlertDescription className="text-xs">
                  انطبّق الاستيراد. السماكة والوزن لسه ناقصين — راجع «بيانات تغليف ناقصة».
                </AlertDescription>
              </Alert>
            )}

            <Button
              size="sm"
              disabled={!canConfirm}
              onClick={() => confirm.mutate({
                // Array.from, not spread: the tsconfig target predates
                // downlevelIteration and spreading a Set fails to compile.
                confirmedRowNumbers: Array.from(confirmed),
                reason: reason.trim(),
              })}
              data-testid="button-confirm-import"
            >
              {confirm.isPending ? "جاري التطبيق…" : "تطبيق الاستيراد"}
            </Button>
            <p className="text-muted-foreground text-xs">
              المطابقات الأكيدة تنطبق تلقائياً. المحتملة تنطبق فقط إذا أشّرتها. غير المحسومة ما تنطبق أبداً.
            </p>
          </div>
        )}

        <MissingDataQueue />
      </CardContent>
    </Card>
  );
}

/** Current state of the catalogue: who still cannot be planned, and why. */
function MissingDataQueue() {
  const { data, isLoading } = useMissingPackingData();
  const items = data?.items ?? [];

  return (
    <div className="space-y-2 border-t pt-3" data-testid="missing-data-queue">
      <div className="flex items-center gap-2 text-sm font-semibold">
        بيانات تغليف ناقصة
        {items.length > 0 && <Badge variant="destructive">{items.length}</Badge>}
      </div>
      {isLoading && <p className="text-muted-foreground text-sm">جاري التحميل…</p>}
      {!isLoading && items.length === 0 && (
        <p className="text-sm">كل المنتجات عندها بيانات تغليف كاملة.</p>
      )}
      <ul className="space-y-1">
        {items.map((m) => (
          <li
            key={`${m.productId}-${m.variantId ?? ""}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-xs"
            data-testid={`missing-row-${m.productId}`}
          >
            <span className="font-medium">{m.productName}</span>
            <span className="text-muted-foreground">
              ناقص: {m.missing.map((f) => MISSING_FIELD_LABEL[f] ?? f).join("، ")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
