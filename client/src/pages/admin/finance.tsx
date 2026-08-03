import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinanceOverview } from "@/components/admin/finance-overview";
import { FinanceExpenses } from "@/components/admin/finance-expenses";
import { FinanceCostChanges } from "@/components/admin/finance-cost-changes";
import { FinanceScenarioCalculator } from "@/components/admin/finance-scenario-calculator";
import { FinanceProductProfitability } from "@/components/admin/finance-product-profitability";
import { FinanceCostAudit } from "@/components/admin/finance-cost-audit";
import { FinanceReturnEvents } from "@/components/admin/finance-return-events";
import { FinanceReport } from "@/components/admin/finance-report";
import { FinanceRecommendations } from "@/components/admin/finance-recommendations";
import { FinanceAudit } from "@/components/admin/finance-audit";
import { FinanceManualCorrections } from "@/components/admin/finance-manual-corrections";
import { FinanceAuditTrail } from "@/components/admin/finance-audit-trail";
import { FinanceCharts } from "@/components/admin/finance-charts";
import { FinancePeriodClose } from "@/components/admin/finance-period-close";
import { FinanceLedger } from "@/components/admin/finance-ledger";
import { FinanceAccountingRegisterV2 } from "@/components/admin/finance-accounting-register-v2";
import { PackagingSection } from "@/components/admin/packaging";

type Period = "day" | "week" | "month" | "year";

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "اليوم" },
  { value: "week", label: "الأسبوع" },
  { value: "month", label: "الشهر" },
  { value: "year", label: "السنة" },
];

export default function FinancePage() {
  const [period, setPeriod] = useState<Period>("month");

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#0B1E28", padding: "20px 16px" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>
            مركز المالية — AQUAVO
          </h1>
          <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0" }}>
            لوحة تحكم مالية داخلية — للإدارة فقط
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: "pointer",
                background: period === p.value ? "#0B93A6" : "#0d1f3c",
                border: period === p.value ? "1.5px solid #0B93A6" : "1.5px solid #1e3a5f",
                color: period === p.value ? "#fff" : "#94a3b8",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="accounting-register" dir="rtl">
        <TabsList style={{
          background: "#0d1f3c", borderBottom: "1px solid #1e3a5f",
          padding: "4px 8px", borderRadius: 10, marginBottom: 20,
          display: "flex", gap: 4, flexWrap: "wrap",
        }}>
          <TabsTrigger value="accounting-register">السجل المحاسبي وملف المحاسب</TabsTrigger>
          <TabsTrigger value="charts">الرسوم البيانية</TabsTrigger>
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="ledger">دفتر الأستاذ القديم</TabsTrigger>
          <TabsTrigger value="expenses">المصاريف</TabsTrigger>
          <TabsTrigger value="reports">تقارير قديمة</TabsTrigger>
          <TabsTrigger value="products">ربحية المنتجات</TabsTrigger>
          <TabsTrigger value="recommendations">توصيات</TabsTrigger>
          <TabsTrigger value="cost-changes">تغييرات الكلف</TabsTrigger>
          <TabsTrigger value="simulator">حاسبة السيناريوهات</TabsTrigger>
          <TabsTrigger value="cost-audit">تدقيق سجل الكلف</TabsTrigger>
          <TabsTrigger value="packaging" data-testid="tab-packaging">التغليف والكراتين</TabsTrigger>
          <TabsTrigger value="return-events">الراجعات والخسائر</TabsTrigger>
          <TabsTrigger value="audit">المراجع الآلي</TabsTrigger>
          <TabsTrigger value="manual-corrections">التصحيح اليدوي</TabsTrigger>
          <TabsTrigger value="audit-trail">سجل التدقيق</TabsTrigger>
          <TabsTrigger value="period-close">إغلاق الفترات القديم</TabsTrigger>
        </TabsList>

        <TabsContent value="accounting-register">
          <FinanceAccountingRegisterV2 />
        </TabsContent>
        <TabsContent value="charts"><FinanceCharts period={period} /></TabsContent>
        <TabsContent value="overview"><FinanceOverview period={period} /></TabsContent>
        <TabsContent value="ledger"><FinanceLedger period={period} /></TabsContent>
        <TabsContent value="expenses"><FinanceExpenses period={period} /></TabsContent>
        <TabsContent value="reports"><FinanceReport period={period} /></TabsContent>
        <TabsContent value="products"><FinanceProductProfitability period={period} /></TabsContent>
        <TabsContent value="recommendations"><FinanceRecommendations period={period} /></TabsContent>
        <TabsContent value="cost-changes"><FinanceCostChanges /></TabsContent>
        <TabsContent value="simulator"><FinanceScenarioCalculator /></TabsContent>
        <TabsContent value="cost-audit"><FinanceCostAudit /></TabsContent>
        <TabsContent value="packaging"><PackagingSection /></TabsContent>
        <TabsContent value="return-events"><FinanceReturnEvents /></TabsContent>
        <TabsContent value="audit">
          <div style={{ display: "grid", gap: 12 }}>
            <p style={{ color: "#94a3b8", fontSize: 12, margin: 0 }}>
              قراءة فقط — يفحص الأرقام ولا يعدّلها
            </p>
            <FinanceAudit />
          </div>
        </TabsContent>
        <TabsContent value="manual-corrections"><FinanceManualCorrections /></TabsContent>
        <TabsContent value="audit-trail"><FinanceAuditTrail /></TabsContent>
        <TabsContent value="period-close"><FinancePeriodClose /></TabsContent>
      </Tabs>
    </div>
  );
}
