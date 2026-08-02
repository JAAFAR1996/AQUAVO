import { readFileSync, writeFileSync } from "node:fs";
const BASE = "${BASE}";

function replaceOnce(path, pattern, replacement, label) {
  const source = readFileSync(path, "utf8");
  const matches = typeof pattern === "string"
    ? source.split(pattern).length - 1
    : Array.from(source.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"))).length;
  if (matches !== 1) throw new Error(`${label}: expected one match in ${path}, found ${matches}`);
  writeFileSync(path, source.replace(pattern, replacement), "utf8");
}

const testPath = "client/src/components/admin/packaging/__tests__/packaging-section.test.tsx";

replaceOnce(
  testPath,
  `  it("renders the four owner-facing panels as RTL tabs", async () => {\n    const { PackagingSection } = await import("../packaging-section");\n    renderWithClient(<PackagingSection />);\n\n    const section = screen.getByTestId("section-packaging");\n    expect(section).toHaveAttribute("dir", "rtl");\n\n    expect(screen.getByTestId("tab-preparation")).toHaveTextContent("تكاليف تجهيز الطلب");\n    expect(screen.getByTestId("tab-cartons")).toHaveTextContent("أنواع الكراتين");\n    expect(screen.getByTestId("tab-packing")).toHaveTextContent("أبعاد تغليف المنتجات");\n    expect(screen.getByTestId("tab-stock")).toHaveTextContent("مخزون وتنبيهات الكراتين");\n  });`,
  `  it("renders the primary carton workspace and keeps detailed panels under advanced management", async () => {\n    const { PackagingSection } = await import("../packaging-section");\n    renderWithClient(<PackagingSection />);\n\n    const section = screen.getByTestId("section-packaging");\n    expect(section).toHaveAttribute("dir", "rtl");\n    expect(screen.getByTestId("button-add-carton-primary")).toHaveTextContent("إضافة كارتونة جديدة");\n    expect(screen.getByTestId("advanced-packaging-toggle")).toHaveTextContent("إدارة متقدمة");\n    expect(screen.getByTestId("tab-preparation")).toHaveTextContent("مواد تجهيز الطلب");\n    expect(screen.getByTestId("tab-cartons")).toHaveTextContent("تفاصيل الكراتين");\n    expect(screen.getByTestId("tab-packing")).toHaveTextContent("بيانات تغليف المنتجات");\n    expect(screen.getByTestId("tab-stock")).toHaveTextContent("تنبيهات المخزون");\n  });`,
  "replace old tab contract",
);

replaceOnce(
  testPath,
  /describe\("carton data entry", \(\) => \{[\s\S]*?\n\}\);\n\ndescribe\("packing import"/,
  `describe("carton data entry", () => {\n  it("shows the required no-cartons state and unified add action", async () => {\n    const { CartonWorkspace } = await import("../carton-onboarding");\n    renderWithClient(<CartonWorkspace onOpenImport={() => undefined} />, [[\`${BASE}/cartons\`, { items: [] }]]);\n\n    expect(screen.getByTestId("empty-cartons-state")).toHaveTextContent("ماكو كراتين مسجلة بعد");\n    expect(screen.getByTestId("empty-cartons-state")).toHaveTextContent("أضف أول نوع كارتونة");\n    expect(screen.getByTestId("button-add-carton-primary")).toBeInTheDocument();\n  });\n\n  it("collects carton identity, measurements, safety, stock and cost before review", async () => {\n    const user = userEvent.setup();\n    const { CartonWorkspace } = await import("../carton-onboarding");\n    renderWithClient(<CartonWorkspace onOpenImport={() => undefined} />, [[\`${BASE}/cartons\`, { items: [] }]]);\n\n    await user.click(screen.getByTestId("button-add-carton-primary"));\n    await user.click(screen.getByTestId("button-review-carton"));\n    expect(screen.queryByTestId("carton-onboarding-review")).not.toBeInTheDocument();\n\n    await user.type(screen.getByTestId("carton-name"), "كارتونة وسط");\n    await user.type(screen.getByTestId("carton-sku"), "BOX-M");\n    await user.type(screen.getByTestId("carton-length"), "27");\n    await user.type(screen.getByTestId("carton-width"), "20");\n    await user.type(screen.getByTestId("carton-height"), "14");\n    await user.type(screen.getByTestId("carton-max-weight"), "8");\n    await user.clear(screen.getByTestId("carton-threshold"));\n    await user.type(screen.getByTestId("carton-threshold"), "5");\n    await user.clear(screen.getByTestId("carton-opening-quantity"));\n    await user.type(screen.getByTestId("carton-opening-quantity"), "20");\n    await user.type(screen.getByTestId("carton-unit-cost"), "1000");\n    await user.type(screen.getByLabelText("ملاحظة أو مصدر الكلفة"), "فاتورة المورد");\n    await user.click(screen.getByTestId("button-review-carton"));\n\n    const review = screen.getByTestId("carton-onboarding-review");\n    expect(review).toHaveTextContent("BOX-M");\n    expect(review).toHaveTextContent("27 × 20 × 14 سم");\n    expect(review).toHaveTextContent("20");\n    expect(review).toHaveTextContent("1,000 د.ع");\n  });\n\n  it("tells the owner that carton measurements are internal", async () => {\n    const user = userEvent.setup();\n    const { CartonWorkspace } = await import("../carton-onboarding");\n    renderWithClient(<CartonWorkspace onOpenImport={() => undefined} />, [[\`${BASE}/cartons\`, { items: [] }]]);\n    await user.click(screen.getByTestId("button-add-carton-primary"));\n    expect(screen.getByTestId("carton-onboarding-form")).toHaveTextContent("القياسات الداخلية");\n  });\n});\n\ndescribe("packing import"`,
  "replace split carton form tests",
);

const importPanel = "client/src/components/admin/packaging/packing-import-panel.tsx";
replaceOnce(
  importPanel,
  "«عدد القطع» للمعلومة فقط، ولا يغيّر مخزون المنتجات أو الكراتين أو عدد الوحدات. النظام لا يخمّن الوزن أو العمق أو أي قياس ناقص.",
  "«عدد القطع» للمعلومة فقط وما يمس مخزون المنتجات أو الكراتين أو عدد الوحدات. النظام لا يخمّن الوزن أو السماكة/العمق أو أي قياس ناقص.",
  "clarify informational piece count and missing measurements",
);

console.log("Aligned packaging contract tests with the unified onboarding flow.");
