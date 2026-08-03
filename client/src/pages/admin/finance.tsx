import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinanceAccountingRegisterV2 } from "@/components/admin/finance-accounting-register-v2";
import { FinanceReturnEvents } from "@/components/admin/finance-return-events";
import { FinanceAuditTrail } from "@/components/admin/finance-audit-trail";
import { PackagingSection } from "@/components/admin/packaging";

export default function FinancePage() {
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#0B1E28", padding: "20px 16px" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>
          مركز المالية — AQUAVO
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 12, margin: "5px 0 0" }}>
          النظام المحاسبي الرسمي من 1 آب 2026 — للإدارة فقط
        </p>
      </div>

      <Tabs defaultValue="accounting-register" dir="rtl">
        <TabsList style={{
          background: "#0d1f3c",
          border: "1px solid #1e3a5f",
          padding: "6px 8px",
          borderRadius: 10,
          marginBottom: 20,
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}>
          <TabsTrigger value="accounting-register">السجل المحاسبي والإغلاق الشهري</TabsTrigger>
          <TabsTrigger value="packaging" data-testid="tab-packaging">التغليف والكراتين</TabsTrigger>
          <TabsTrigger value="return-events">الراجعات والخسائر</TabsTrigger>
          <TabsTrigger value="audit-trail">سجل التدقيق</TabsTrigger>
        </TabsList>

        <TabsContent value="accounting-register">
          <FinanceAccountingRegisterV2 />
        </TabsContent>
        <TabsContent value="packaging">
          <PackagingSection />
        </TabsContent>
        <TabsContent value="return-events">
          <FinanceReturnEvents />
        </TabsContent>
        <TabsContent value="audit-trail">
          <FinanceAuditTrail />
        </TabsContent>
      </Tabs>
    </div>
  );
}
