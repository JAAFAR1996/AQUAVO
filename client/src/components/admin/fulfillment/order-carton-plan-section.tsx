// خطة التغليف المقترحة — the planner's place in the real order workflow.
//
// The order screen must talk about THIS order, not show a scary global catalogue
// count. The smart planner now reuses owner-entered stocktake measurements and
// explicit product specs before it asks for manual measurements.
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PackageSearch, AlertTriangle, Sparkles } from "lucide-react";
import { useCartons } from "@/hooks/use-packaging";

export function OrderCartonPlanSection({
  orderId: _orderId,
  children,
}: {
  orderId: string;
  children: ReactNode;
}) {
  const cartons = useCartons();
  const activeCartons = (cartons.data?.items ?? []).filter((c) => c.active);
  const loading = cartons.isLoading;
  const noCartons = !loading && activeCartons.length === 0;

  return (
    <Card dir="rtl" data-testid="order-carton-plan-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PackageSearch className="h-5 w-5" />
          خطة التغليف المقترحة
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          كلفة داخلية فقط — ما تغيّر المبلغ المستحق على الزبون.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading && <p className="text-muted-foreground text-sm">جاري التحميل…</p>}

        {noCartons && (
          <Alert variant="destructive" data-testid="no-cartons-for-plan">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              ماكو ولا كارتونة مسجّلة، فالمخطط التلقائي ما يقدر يشتغل. سجّل
              كراتينك الحقيقية من «المالية ← التغليف والكراتين ← أنواع الكراتين»
              — بقياساتها الداخلية ووزنها الأقصى. النظام ما يخترع ولا قياس.
            </AlertDescription>
          </Alert>
        )}

        {!loading && !noCartons && (
          <Alert data-testid="plan-smart-data-note">
            <Sparkles className="h-4 w-4" />
            <AlertDescription className="text-xs">
              النظام يستخدم قياسات التغليف المؤكدة أولاً، وإذا ناقصة يرجع للقياسات
              اللي دخلتها بالجرد ومواصفات المنتج حتى يقترح أصغر كارتونة مناسبة.
            </AlertDescription>
          </Alert>
        )}

        {!loading && !noCartons && children}
      </CardContent>
    </Card>
  );
}
