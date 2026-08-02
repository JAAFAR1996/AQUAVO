import { readFileSync, writeFileSync } from "node:fs";

function read(path) { return readFileSync(path, "utf8"); }
function write(path, content) { writeFileSync(path, content, "utf8"); }
function replaceOnce(path, pattern, replacement, label) {
  const source = read(path);
  const matches = typeof pattern === "string"
    ? source.split(pattern).length - 1
    : Array.from(source.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"))).length;
  if (matches !== 1) throw new Error(`${label}: expected exactly one match in ${path}, found ${matches}`);
  write(path, source.replace(pattern, replacement));
}

// ── Single finance surface + legacy redirect ────────────────────────────────
const dashboard = "client/src/pages/admin-dashboard.tsx";
replaceOnce(dashboard, 'import AccountingPanel from "@/components/admin/accounting-panel";\n', "", "remove old accounting panel import");
replaceOnce(
  dashboard,
  '  "coupons", "orders", "invoices", "accounting", "customers", "reviews",',
  '  "coupons", "orders", "invoices", "customers", "reviews",',
  "remove accounting from admin sections",
);
replaceOnce(
  dashboard,
  '  const [activeSection, setActiveSection] = useState<string>(readSectionFromUrl);\n',
  `  const [activeSection, setActiveSection] = useState<string>(readSectionFromUrl);\n\n  useEffect(() => {\n    if (new URLSearchParams(window.location.search).get("section") === "accounting") {\n      setLocation("/admin/finance");\n    }\n  }, [setLocation]);\n`,
  "add legacy accounting redirect",
);
replaceOnce(
  dashboard,
  /\n\s*<Button\n\s*variant="outline"\n\s*className="gap-2 border-green-300 text-green-700 hover:bg-green-50"\n\s*onClick=\{\(\) => setLocation\('\/admin\/finance'\)\}\n\s*>\n\s*<Calculator className="w-4 h-4" \/>\n\s*الدخول إلى المحاسب\n\s*<\/Button>/,
  "",
  "remove duplicate finance header link",
);
replaceOnce(
  dashboard,
  '            <TabsTrigger value="accounting" className="min-h-[44px]">💰 المحاسب</TabsTrigger>',
  `            <Button\n              type="button"\n              variant="ghost"\n              className="min-h-[44px] h-auto px-3 py-1.5 text-sm font-medium"\n              onClick={() => setLocation("/admin/finance")}\n              data-testid="link-finance-center"\n            >\n              <Calculator className="ml-2 h-4 w-4" />\n              <span>مركز المالية</span>\n            </Button>`,
  "replace old accounting tab with finance link",
);
replaceOnce(
  dashboard,
  /\n\s*<TabsContent value="accounting" className="space-y-4">\n\s*<AccountingPanel \/>\n\s*<\/TabsContent>\n/,
  "\n",
  "remove old accounting content",
);

const finance = "client/src/pages/admin/finance.tsx";
replaceOnce(finance, '<TabsTrigger value="audit">تدقيق محاسبي</TabsTrigger>', '<TabsTrigger value="audit">المراجع الآلي</TabsTrigger>', "rename automated reviewer");
replaceOnce(
  finance,
  `        <TabsContent value="audit">\n          <FinanceAudit />\n        </TabsContent>`,
  `        <TabsContent value="audit">\n          <div style={{ display: "grid", gap: 12 }}>\n            <p style={{ color: "#94a3b8", fontSize: 12, margin: 0 }}>\n              قراءة فقط — يفحص الأرقام ولا يعدّلها\n            </p>\n            <FinanceAudit />\n          </div>\n        </TabsContent>`,
  "add reviewer read-only copy",
);

// ── Client API contract ──────────────────────────────────────────────────────
const hooks = "client/src/hooks/use-packaging.ts";
replaceOnce(
  hooks,
  `export interface MissingPackingRow {\n  productId: string;\n  productName: string;\n  variantId: string | null;\n  missing: string[];\n}`,
  `export interface MissingPackingRow {\n  productId: string;\n  productName: string;\n  variantId: string | null;\n  missing: string[];\n  complete: boolean;\n  manualReview: boolean;\n}\n\nexport interface MissingPackingSummary {\n  withoutHeight: number;\n  withoutWidth: number;\n  withoutDepth: number;\n  withoutWeight: number;\n  complete: number;\n  manualReview: number;\n  affectedUnique: number;\n  total: number;\n}`,
  "extend missing packing response",
);
replaceOnce(
  hooks,
  `export function useMissingPackingData() {\n  return useQuery<{ items: MissingPackingRow[] }>({ queryKey: [\`${BASE}/packing/missing\`] });\n}`,
  `export function useMissingPackingData() {\n  return useQuery<{ items: MissingPackingRow[]; summary: MissingPackingSummary }>({\n    queryKey: [\`${BASE}/packing/missing\`],\n  });\n}`,
  "type missing packing summary",
);
const createCartonHook = `export function useCreateCarton() {\n  const qc = useQueryClient();\n  return useMutation({\n    mutationFn: async (input: CartonInput) => {\n      const res = await apiRequest("POST", \`${BASE}/cartons\`, {\n        ...input,\n        idempotencyKey: newIdempotencyKey("carton"),\n      });\n      return res.json();\n    },\n    onSuccess: () => void qc.invalidateQueries({ queryKey: [\`${BASE}/cartons\`] }),\n  });\n}`;
replaceOnce(
  hooks,
  createCartonHook,
  createCartonHook + `\n\nexport interface CartonSetupInput {\n  name: string;\n  sku: string;\n  notes?: string;\n  internalLengthCm: number;\n  internalWidthCm: number;\n  internalHeightCm: number;\n  maxWeightKg: number;\n  lowStockThreshold: number;\n  openingQuantity: number;\n  unitCostIqd: number;\n  costEffectiveDate: string;\n  costSource: string;\n  idempotencyKey: string;\n}\n\nexport function useSetupCarton() {\n  const qc = useQueryClient();\n  return useMutation({\n    mutationFn: async (input: CartonSetupInput) => {\n      const res = await apiRequest("POST", \`${BASE}/cartons/setup\`, input);\n      return res.json();\n    },\n    onSuccess: () => {\n      void qc.invalidateQueries({ queryKey: [\`${BASE}/cartons\`] });\n      void qc.invalidateQueries({ queryKey: [\`${BASE}/alerts\`] });\n    },\n  });\n}`,
  "add unified carton setup hook",
);

// ── Advanced views stay available, but cannot be the primary create path ─────
const panels = "client/src/components/admin/packaging/packaging-panels.tsx";
replaceOnce(panels, "  AddCartonForm,\n", "", "remove legacy carton form import");
replaceOnce(
  panels,
  `        <div className="pt-2">\n          <AddCartonForm />\n        </div>\n`,
  "",
  "remove legacy split carton create form",
);

// Existing cartons may pre-date dimensions; do not print null×null×null.
const onboarding = "client/src/components/admin/packaging/carton-onboarding.tsx";
replaceOnce(
  onboarding,
  `  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {\n    return crypto.randomUUID();\n  }\n  const bytes = new Uint8Array(24);\n  crypto.getRandomValues(bytes);`,
  `  const secureCrypto = globalThis.crypto;\n  if (secureCrypto && typeof secureCrypto.randomUUID === "function") {\n    return secureCrypto.randomUUID();\n  }\n  if (!secureCrypto) throw new Error("Secure random generator unavailable");\n  const bytes = new Uint8Array(24);\n  secureCrypto.getRandomValues(bytes);`,
  "harden idempotency key generation",
);
replaceOnce(
  onboarding,
  `<Value label="القياسات الداخلية" value={carton.internalLengthCm + " × " + carton.internalWidthCm + " × " + carton.internalHeightCm + " سم"} />`,
  `<Value\n                    label="القياسات الداخلية"\n                    value={\n                      carton.internalLengthCm != null && carton.internalWidthCm != null && carton.internalHeightCm != null\n                        ? \`${carton.internalLengthCm} × ${carton.internalWidthCm} × ${carton.internalHeightCm} سم\`\n                        : "غير مكتمل"\n                    }\n                  />`,
  "guard old incomplete carton dimensions",
);

// ── Required packing-data summary from planner-required fields only ─────────
const route = "server/routes/packaging-admin.ts";
replaceOnce(
  route,
  `} from "../services/packing-import-service.js";\n`,
  `} from "../services/packing-import-service.js";\nimport { summarisePackingCompleteness } from "../services/packing-data-summary.js";\n`,
  "import packing summary service",
);
replaceOnce(
  route,
  /router\.get\(\n  "\/packing\/missing",[\s\S]*?\n\);\n\n\/\/ ═+\n\/\/ EXCEL IMPORT/,
  `router.get(\n  "/packing/missing",\n  readLimiter,\n  wrap(async (_req, res) => {\n    const rows = await db().execute(sql\`\n      SELECT p.id AS product_id, p.name AS product_name,\n             d.variant_id, d.packed_height_cm, d.packed_width_cm,\n             d.packed_depth_cm, d.packed_weight_kg,\n             EXISTS (\n               SELECT 1\n                 FROM packing_import_draft_lines line\n                 JOIN packing_import_drafts draft ON draft.id = line.draft_id\n                WHERE line.matched_product_id = p.id\n                  AND line.match_confidence = 'probable'\n                  AND draft.state = 'reviewing'\n             ) AS manual_review\n        FROM products p\n        LEFT JOIN LATERAL (\n          SELECT packing.variant_id, packing.packed_height_cm, packing.packed_width_cm,\n                 packing.packed_depth_cm, packing.packed_weight_kg\n            FROM product_packing_data packing\n           WHERE packing.product_id = p.id\n           ORDER BY (packing.variant_id IS NULL) DESC, packing.updated_at DESC\n           LIMIT 1\n        ) d ON true\n       WHERE p.deleted_at IS NULL\n       ORDER BY p.name\n       LIMIT 5000\n    \`);\n    const list = (Array.isArray(rows) ? rows : ((rows as { rows?: unknown[] }).rows ?? [])) as Record<string, unknown>[];\n    const result = summarisePackingCompleteness(list.map((row) => ({\n      productId: String(row.product_id),\n      productName: String(row.product_name),\n      variantId: row.variant_id == null ? null : String(row.variant_id),\n      packedHeightCm: row.packed_height_cm,\n      packedWidthCm: row.packed_width_cm,\n      packedDepthCm: row.packed_depth_cm,\n      packedWeightKg: row.packed_weight_kg,\n      manualReview: row.manual_review === true,\n    })));\n    res.json(result);\n  }),\n);\n\n// ═════════════════════════════════════════════════════════════════════════════\n// EXCEL IMPORT`,
  "replace generic missing-data route",
);

console.log("Applied finance and packaging fix patches.");
