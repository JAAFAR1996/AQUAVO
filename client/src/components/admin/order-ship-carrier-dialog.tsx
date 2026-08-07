import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";

interface DeliveryCompany {
  id: string;
  name: string;
  default_fee: number;
  active: boolean;
}

interface OrderShipCarrierDialogProps {
  orderId: string;
  onShipped: () => void | Promise<void>;
}

export function OrderShipCarrierDialog({ orderId, onShipped }: OrderShipCarrierDialogProps) {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadCompanies = async () => {
    setLoading(true);
    setLoadError(null);
    setSelectedCompanyId("");
    try {
      const response = await fetch("/api/admin/accounting/v2/delivery-companies?active=true", {
        credentials: "include",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "فشل تحميل شركات التوصيل");
      }
      const payload = await response.json() as { items?: DeliveryCompany[] };
      setCompanies((payload.items ?? []).filter((company) => company.active === true));
    } catch (error) {
      const message = error instanceof Error ? error.message : "فشل تحميل شركات التوصيل";
      setCompanies([]);
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (submitting) return;
    setOpen(nextOpen);
    if (nextOpen) void loadCompanies();
  };

  const handleConfirm = async () => {
    if (!selectedCompanyId) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          status: "shipped",
          deliveryCompanyId: selectedCompanyId,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "فشل تسليم الطلب لشركة النقل");
      }

      const selected = companies.find((company) => company.id === selectedCompanyId);
      setOpen(false);
      setSelectedCompanyId("");
      toast({
        title: "تم التحديث",
        description: selected
          ? `تم تسليم الطلب إلى ${selected.name}`
          : "تم تسليم الطلب لشركة النقل",
      });
      await onShipped();
    } catch (error) {
      const message = error instanceof Error ? error.message : "فشل تسليم الطلب لشركة النقل";
      toast({ title: "خطأ", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        size="sm"
        className="bg-orange-500 hover:bg-orange-600 text-white"
        onClick={() => handleOpenChange(true)}
      >
        تسليم للنقل 🚚
      </Button>

      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>اختر شركة التوصيل</DialogTitle>
          <DialogDescription>
            يجب تحديد الشركة التي استلمت الطلب قبل تغيير حالته إلى «عند شركة النقل».
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Select
            value={selectedCompanyId}
            onValueChange={setSelectedCompanyId}
            disabled={loading || submitting || companies.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={loading ? "جاري تحميل الشركات..." : "اختر شركة التوصيل"} />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name} — {Number(company.default_fee).toLocaleString("en-US")} د.ع
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {loadError && <p className="text-sm text-destructive">{loadError}</p>}
          {!loading && !loadError && companies.length === 0 && (
            <p className="text-sm text-muted-foreground">
              لا توجد شركات توصيل فعّالة. فعّل أو أضف شركة من المحاسب أولاً.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            إلغاء
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedCompanyId || loading || submitting}>
            {submitting ? "جاري الحفظ..." : "تأكيد وتسليم للنقل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
