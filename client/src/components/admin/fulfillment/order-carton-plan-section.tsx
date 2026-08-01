// خطة التغليف المقترحة — the planner's place in the real order workflow.
//
// This wrapper exists for one reason: with no carton catalogue and no product
// packing data, the planner fails closed on every order. That is correct
// behaviour, but rendered bare it looks like a broken feature. So the
// prerequisites are checked first and stated plainly, and the planner itself is
// only offered once it can actually produce something.
//
// It never fabricates a fallback plan. Missing data means the owner packs the
// order manually and the system says so.
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PackageSearch, AlertTriangle } from "lucide-react";
import { useCartons, useMissingPackingData } from "@/hooks/use-packaging";

export function OrderCartonPlanSection({
  orderId,
  children,
}: {
  orderId: string;
  children: ReactNode;
}) {
  const cartons = useCartons();
  const missing = useMissingPackingData();

  const activeCartons = (cartons.data?.items ?? []).filter((c) => c.active);
  const missingCount = missing.data?.items?.length ?? 0;
  const loading = cartons.isLoading || missing.isLoading;

  const noCartons = !loading && activeCartons.length === 0;

  return (
    <Card dir="rtl" data-testid="order-carton-plan-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PackageSearch className="h-5 w-5" />
          خطة التغليف المقترحة
          {missingCount > 0 && (
            <Badge variant="destructive" data-testid="plan-missing-badge">
              {missingCount} منتج بيانات تغليفه ناقصة
            </Badge>
          )}
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

        {!loading && !noCartons && missingCount > 0 && (
          <Alert data-testid="plan-missing-data-note">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              إذا بهذا الطلب منتج من الـ{missingCount} اللي بياناته ناقصة، المخطط
              راح يوقف ويطلب تغليف يدوي. هذا مقصود — ما ينحسب قياس بالحزر.
            </AlertDescription>
          </Alert>
        )}

        {/* The planner itself. Offered only when a carton exists to plan into. */}
        {!loading && !noCartons && children}
      </CardContent>
    </Card>
  );
}
