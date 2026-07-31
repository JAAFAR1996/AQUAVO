// التغليف والكراتين — the accountant-facing section, mounted inside the existing
// finance centre rather than as a separate dashboard.
//
// Four panels, matching how the owner actually thinks about the problem:
//
//   تكاليف تجهيز الطلب   what every order costs to prepare, regardless of size
//   أنواع الكراتين        the boxes themselves: measurements, price, stock
//   أبعاد تغليف المنتجات   the product data the planner needs, and what is missing
//   مخزون وتنبيهات        what is on the shelf and what is running out
//
// Every figure here is a server figure. Nothing on this screen computes a cost,
// and nothing renders an unknown as zero.
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CartonCatalogPanel,
  PreparationCostsPanel,
  StockAlertsPanel,
} from "./packaging-panels";
import { PackingImportPanel } from "./packing-import-panel";

export function PackagingSection() {
  return (
    <div dir="rtl" className="space-y-4" data-testid="section-packaging">
      <Alert>
        <AlertDescription className="text-sm">
          كل الكلف هنا <strong>داخلية</strong>: تنقص من ربح الطلب وما تغيّر المبلغ
          المستحق على الزبون. الكلفة المجهولة تظهر «غير معروف» وما تنحسب صفر.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="preparation" dir="rtl">
        <TabsList
          className="flex flex-wrap gap-1"
          data-testid="packaging-tabs"
        >
          <TabsTrigger value="preparation" data-testid="tab-preparation">تكاليف تجهيز الطلب</TabsTrigger>
          <TabsTrigger value="cartons" data-testid="tab-cartons">أنواع الكراتين</TabsTrigger>
          <TabsTrigger value="packing" data-testid="tab-packing">أبعاد تغليف المنتجات</TabsTrigger>
          <TabsTrigger value="stock" data-testid="tab-stock">مخزون وتنبيهات الكراتين</TabsTrigger>
        </TabsList>

        <TabsContent value="preparation" className="mt-4">
          <PreparationCostsPanel />
        </TabsContent>

        <TabsContent value="cartons" className="mt-4">
          <CartonCatalogPanel />
        </TabsContent>

        <TabsContent value="packing" className="mt-4">
          <PackingImportPanel />
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <StockAlertsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
