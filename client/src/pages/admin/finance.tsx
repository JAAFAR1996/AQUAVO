import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinanceOverview } from "@/components/admin/finance-overview";
import { FinanceExpenses } from "@/components/admin/finance-expenses";
import { FinanceCostChanges } from "@/components/admin/finance-cost-changes";
import { FinanceScenarioCalculator } from "@/components/admin/finance-scenario-calculator";

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
    <div dir="rtl" style={{ minHeight: "100vh", background: "#010611", padding: "20px 16px" }}>
      {/* Header */}
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
                background: period === p.value ? "#199bb8" : "#0d1f3c",
                border: period === p.value ? "1.5px solid #199bb8" : "1.5px solid #1e3a5f",
                color: period === p.value ? "#fff" : "#94a3b8",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs defaultValue="overview" dir="rtl">
        <TabsList style={{
          background: "#0d1f3c", borderBottom: "1px solid #1e3a5f",
          padding: "4px 8px", borderRadius: 10, marginBottom: 20,
          display: "flex", gap: 4, flexWrap: "wrap",
        }}>
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="expenses">المصاريف</TabsTrigger>
          <TabsTrigger value="reports">تقارير</TabsTrigger>
          <TabsTrigger value="products">ربحية المنتجات</TabsTrigger>
          <TabsTrigger value="recommendations">توصيات</TabsTrigger>
          <TabsTrigger value="cost-changes">تغييرات الكلف</TabsTrigger>
          <TabsTrigger value="simulator">حاسبة السيناريوهات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <FinanceOverview period={period} />
        </TabsContent>

        <TabsContent value="expenses">
          <FinanceExpenses period={period} />
        </TabsContent>

        <TabsContent value="reports">
          <div style={{ color: "#94a3b8", fontSize: 13, padding: 24, textAlign: "center" }}>
            التقارير — قيد البناء
          </div>
        </TabsContent>

        <TabsContent value="products">
          <div style={{ color: "#94a3b8", fontSize: 13, padding: 24, textAlign: "center" }}>
            ربحية المنتجات — قيد البناء
          </div>
        </TabsContent>

        <TabsContent value="recommendations">
          <div style={{ color: "#94a3b8", fontSize: 13, padding: 24, textAlign: "center" }}>
            التوصيات — قيد البناء
          </div>
        </TabsContent>

        <TabsContent value="cost-changes">
          <FinanceCostChanges />
        </TabsContent>

        <TabsContent value="simulator">
          <FinanceScenarioCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
