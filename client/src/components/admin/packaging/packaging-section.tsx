import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CartonWorkspace } from "./carton-onboarding";
import {
  CartonCatalogPanel,
  PreparationCostsPanel,
  StockAlertsPanel,
} from "./packaging-panels";
import { PackingImportPanel } from "./packing-import-panel";

export function PackagingSection() {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedTab, setAdvancedTab] = useState("preparation");

  function openImport() {
    setAdvancedTab("packing");
    setAdvancedOpen(true);
    window.setTimeout(() => {
      document.getElementById("advanced-packaging")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  return (
    <div dir="rtl" className="space-y-5" data-testid="section-packaging">
      <Alert>
        <AlertDescription className="text-sm">
          كل الكلف هنا <strong>داخلية</strong>: تنقص من ربح الطلب وما تغيّر المبلغ
          المستحق على الزبون. الكلفة المجهولة تظهر «غير معروف» وما تنحسب صفر.
        </AlertDescription>
      </Alert>

      <CartonWorkspace onOpenImport={openImport} />

      <details
        id="advanced-packaging"
        open={advancedOpen}
        onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
        className="rounded-lg border bg-card"
      >
        <summary className="cursor-pointer select-none px-4 py-3 font-semibold" data-testid="advanced-packaging-toggle">
          إدارة متقدمة
        </summary>
        <div className="border-t p-4">
          <Tabs value={advancedTab} onValueChange={setAdvancedTab} dir="rtl">
            <TabsList className="flex h-auto flex-wrap gap-1" data-testid="packaging-tabs">
              <TabsTrigger value="preparation" data-testid="tab-preparation">مواد تجهيز الطلب</TabsTrigger>
              <TabsTrigger value="cartons" data-testid="tab-cartons">تفاصيل الكراتين</TabsTrigger>
              <TabsTrigger value="packing" data-testid="tab-packing">بيانات تغليف المنتجات</TabsTrigger>
              <TabsTrigger value="stock" data-testid="tab-stock">تنبيهات المخزون</TabsTrigger>
            </TabsList>

            <TabsContent value="preparation" className="mt-4"><PreparationCostsPanel /></TabsContent>
            <TabsContent value="cartons" className="mt-4"><CartonCatalogPanel /></TabsContent>
            <TabsContent value="packing" className="mt-4"><PackingImportPanel /></TabsContent>
            <TabsContent value="stock" className="mt-4"><StockAlertsPanel /></TabsContent>
          </Tabs>
        </div>
      </details>
    </div>
  );
}
