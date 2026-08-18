import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { addCsrfHeader } from "@/lib/csrf";

type CustomerMessageJob = {
  id: string;
  order_id: string;
  job_type: string;
  status: "pending" | "sending" | "completed" | "failed" | "cancelled" | string;
  due_at: string;
  attempt_count: number;
  provider_message_id?: string | null;
  provider_status?: string | null;
  provider_status_at?: string | null;
  last_error_code?: string | null;
  last_error_at?: string | null;
  accepted_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
  manualRetryAllowed?: boolean;
};

type JobsResponse = {
  success?: boolean;
  jobs?: CustomerMessageJob[];
  code?: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار الإرسال",
  sending: "جاري الإرسال",
  completed: "قبلتها WhatsApp",
  failed: "فشل الإرسال",
  cancelled: "ملغاة",
};

const PROVIDER_LABELS: Record<string, string> = {
  accepted: "قبلتها Meta",
  sent: "أُرسلت",
  delivered: "وصلت للزبون",
  read: "قراها الزبون",
  failed: "فشلت لدى WhatsApp",
};

function errorLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  if (code === "INVALID_IRAQI_MOBILE") return "رقم الزبون غير صالح لواتساب";
  if (code === "INVALID_CUSTOMER_NAME") return "اسم الزبون غير صالح لقالب الرسالة";
  if (code === "ORDER_NOT_DELIVERED_OR_MISSING") return "الطلب غير موجود أو لم يعد بحالة مستلم";
  if (code.startsWith("WHATSAPP_PROVIDER_FAILED_")) return `WhatsApp رفض توصيل الرسالة (${code.replace("WHATSAPP_PROVIDER_FAILED_", "")})`;
  if (code.includes("AMBIGUOUS") || code.startsWith("AMBIGUOUS_")) {
    return "حالة إرسال غير مؤكدة؛ الإعادة محظورة حتى لا تتكرر الرسالة على الزبون";
  }
  if (code.startsWith("WHATSAPP_HTTP_")) return `رفض من WhatsApp (${code})`;
  return code;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  if (status === "pending" || status === "sending") return "secondary";
  return "outline";
}

export function CustomerMessagingPanel({ orderId }: { orderId: string }) {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<CustomerMessageJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    if (!orderId) return;
    try {
      const response = await fetch(`/api/admin/customer-messaging/jobs?orderId=${encodeURIComponent(orderId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("فشل تحميل سجل واتساب");
      const body = await response.json() as JobsResponse;
      setJobs(Array.isArray(body.jobs) ? body.jobs : []);
    } catch {
      // Messaging history is operational support UI. A temporary read failure
      // must not break the rest of the order/fulfillment view.
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    setLoading(true);
    void loadJobs();
  }, [loadJobs]);

  const retryJob = async (job: CustomerMessageJob) => {
    setRetryingJobId(job.id);
    try {
      const response = await fetch(`/api/admin/customer-messaging/jobs/${encodeURIComponent(job.id)}/retry`, {
        method: "POST",
        credentials: "include",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        body: JSON.stringify({}),
      });
      const body = await response.json().catch(() => ({})) as {
        code?: string;
        status?: string;
        errorCode?: string;
      };

      if (!response.ok) {
        const message = body.code === "MESSAGE_JOB_RETRY_UNSAFE"
          ? "ما نكدر نعيد هذه الرسالة بأمان لأن احتمال تكون وصلت سابقاً موجود."
          : "تعذرت إعادة محاولة رسالة واتساب.";
        throw new Error(message);
      }

      if (body.status === "sent") {
        toast({ title: "واتساب", description: "تم إرسال رسالة ما بعد الاستلام" });
      } else if (body.status === "retry_scheduled") {
        toast({ title: "واتساب", description: "فشل مؤقت؛ انحفظت محاولة تلقائية جديدة" });
      } else if (body.status === "disabled") {
        toast({ title: "واتساب", description: "رجعت الرسالة للطابور، لكن إرسال WhatsApp حالياً غير مفعّل" });
      } else {
        toast({ title: "واتساب", description: "تم تجهيز الرسالة لإعادة المحاولة" });
      }

      await loadJobs();
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذرت إعادة المحاولة";
      toast({ title: "لم تتم إعادة الإرسال", description: message, variant: "destructive" });
      await loadJobs();
    } finally {
      setRetryingJobId(null);
    }
  };

  if (!loading && jobs.length === 0) return null;

  return (
    <div className="rounded-lg border p-3 print:hidden" data-testid="customer-messaging-panel">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-600" />
          <div>
            <p className="text-sm font-semibold">متابعة WhatsApp</p>
            <p className="text-xs text-muted-foreground">سجل رسالة ما بعد استلام الطلب</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => void loadJobs()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">جاري تحميل حالة الرسالة...</p>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => {
            const error = errorLabel(job.last_error_code);
            const ambiguous = Boolean(job.last_error_code?.includes("AMBIGUOUS") || job.last_error_code?.startsWith("AMBIGUOUS_"));
            return (
              <div key={job.id} className="rounded-md border bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(job.status)}>{STATUS_LABELS[job.status] ?? job.status}</Badge>
                      {job.provider_status && (
                        <span className="text-xs text-muted-foreground">
                          {PROVIDER_LABELS[job.provider_status] ?? job.provider_status}
                          {job.provider_status_at ? ` · ${new Date(job.provider_status_at).toLocaleString("ar-IQ")}` : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      المحاولات: {Number(job.attempt_count ?? 0)}
                      {job.updated_at ? ` · آخر تحديث ${new Date(job.updated_at).toLocaleString("ar-IQ")}` : ""}
                    </p>
                    {job.provider_message_id && (
                      <p className="max-w-full truncate font-mono text-[11px] text-muted-foreground" dir="ltr" title={job.provider_message_id}>
                        {job.provider_message_id}
                      </p>
                    )}
                    {error && (
                      <p className={`text-xs leading-5 ${ambiguous ? "text-amber-700 dark:text-amber-400" : "text-red-600"}`}>
                        {ambiguous && <AlertTriangle className="ml-1 inline h-3.5 w-3.5" />}
                        {error}
                      </p>
                    )}
                  </div>

                  {job.manualRetryAllowed && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={retryingJobId === job.id}
                      onClick={() => void retryJob(job)}
                    >
                      <RefreshCw className={`ml-1 h-3.5 w-3.5 ${retryingJobId === job.id ? "animate-spin" : ""}`} />
                      {retryingJobId === job.id ? "جاري..." : "إعادة المحاولة"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
