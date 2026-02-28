import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Mail,
  Image,
  Share2,
  Loader2,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ContentItem {
  id: string;
  contentType: string;
  productId: string | null;
  generatedText: string;
  metadata: any;
  status: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  price: string;
  category: string;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "مسودة", variant: "secondary" },
  approved: { label: "معتمد", variant: "default" },
  published: { label: "منشور", variant: "default" },
  rejected: { label: "مرفوض", variant: "destructive" },
  archived: { label: "مؤرشف", variant: "outline" },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

// ==================== Product Descriptions Tab ====================

function DescriptionsTab() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [generating, setGenerating] = useState(false);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products?limit=500", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || data || []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ contentType: "description", page: String(page), limit: "10" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/ai-advanced/content?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.data || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchContent(); }, [fetchContent]);

  const generate = async () => {
    if (!selectedProduct) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/ai-advanced/content/product-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId: selectedProduct }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "تم توليد الوصف بنجاح" });
        fetchContent();
      } else {
        toast({ title: "خطأ", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }
    setGenerating(false);
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/ai-advanced/content/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast({ title: "تم تحديث الحالة" });
        fetchContent();
      }
    } catch { /* ignore */ }
  };

  const deleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/ai-advanced/content/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "تم الحذف" });
        fetchContent();
      }
    } catch { /* ignore */ }
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-4">
      {/* Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            توليد وصف منتج
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger>
              <SelectValue placeholder="اختر منتج..." />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={generate} disabled={!selectedProduct || generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
            ولّد وصف
          </Button>
        </CardContent>
      </Card>

      {/* Filter + List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>الأوصاف المولدة ({total})</CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="approved">معتمد</SelectItem>
                  <SelectItem value="published">منشور</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={fetchContent}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا يوجد محتوى</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const meta = item.metadata as any;
                const productName = products.find((p) => p.id === item.productId)?.name;
                return (
                  <Card key={item.id} className="border">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {productName && <span className="font-semibold">{productName}</span>}
                          <Badge variant={STATUS_MAP[item.status]?.variant || "secondary"}>
                            {STATUS_MAP[item.status]?.label || item.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("ar-IQ")}
                        </span>
                      </div>

                      {meta?.shortDescription && (
                        <div className="bg-muted/50 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground">وصف قصير</span>
                            <CopyButton text={meta.shortDescription} />
                          </div>
                          <p className="text-sm">{meta.shortDescription}</p>
                        </div>
                      )}

                      {meta?.longDescription && (
                        <div className="bg-muted/50 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground">وصف طويل</span>
                            <CopyButton text={meta.longDescription} />
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{meta.longDescription}</p>
                        </div>
                      )}

                      {meta?.seoTitle && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-blue-600">SEO Title</span>
                            <CopyButton text={meta.seoTitle} />
                          </div>
                          <p className="text-sm">{meta.seoTitle}</p>
                        </div>
                      )}

                      {meta?.seoDescription && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-blue-600">SEO Description</span>
                            <CopyButton text={meta.seoDescription} />
                          </div>
                          <p className="text-sm">{meta.seoDescription}</p>
                        </div>
                      )}

                      {meta?.keywords && (
                        <div className="flex flex-wrap gap-1">
                          {meta.keywords.map((kw: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {item.status === "draft" && (
                          <Button size="sm" onClick={() => updateStatus(item.id, "approved")}>
                            اعتمد
                          </Button>
                        )}
                        {item.status === "draft" && (
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(item.id, "rejected")}>
                            ارفض
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{page} / {totalPages}</span>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Emails Tab ====================

function EmailsTab() {
  const { toast } = useToast();
  const [emailType, setEmailType] = useState("");
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ contentType: "email", page: String(page), limit: "10" });
      const res = await fetch(`/api/ai-advanced/content?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.data || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const generate = async () => {
    if (!emailType) return;
    setGenerating(true);
    try {
      let parsedContext = {};
      if (context.trim()) {
        try { parsedContext = JSON.parse(context); } catch { parsedContext = { note: context }; }
      }
      const res = await fetch("/api/ai-advanced/content/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: emailType, context: parsedContext }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "تم توليد الإيميل بنجاح" });
        fetchContent();
      } else {
        toast({ title: "خطأ", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }
    setGenerating(false);
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/ai-advanced/content/${id}`, { method: "DELETE", credentials: "include" });
      toast({ title: "تم الحذف" });
      fetchContent();
    } catch { /* ignore */ }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/ai-advanced/content/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      toast({ title: "تم تحديث الحالة" });
      fetchContent();
    } catch { /* ignore */ }
  };

  const EMAIL_TYPES = [
    { value: "welcome", label: "ترحيبي" },
    { value: "promotional", label: "ترويجي" },
    { value: "cart_reminder", label: "تذكير سلة" },
    { value: "re_engagement", label: "إعادة تفعيل" },
  ];

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            توليد إيميل تسويقي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={emailType} onValueChange={setEmailType}>
            <SelectTrigger>
              <SelectValue placeholder="نوع الإيميل..." />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="سياق إضافي (اختياري)... مثل: اسم العرض، نسبة الخصم، المنتجات المشمولة"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
          />
          <Button onClick={generate} disabled={!emailType || generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
            ولّد إيميل
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>الإيميلات المولدة ({total})</CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchContent}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا يوجد إيميلات</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const meta = item.metadata as any;
                return (
                  <Card key={item.id} className="border">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{meta?.type || "email"}</Badge>
                          <Badge variant={STATUS_MAP[item.status]?.variant || "secondary"}>
                            {STATUS_MAP[item.status]?.label || item.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("ar-IQ")}
                        </span>
                      </div>

                      {meta?.subject && (
                        <div className="bg-muted/50 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground">العنوان (Subject)</span>
                            <CopyButton text={meta.subject} />
                          </div>
                          <p className="text-sm font-semibold">{meta.subject}</p>
                        </div>
                      )}

                      {meta?.preheader && (
                        <div className="bg-muted/50 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground">Preheader</span>
                            <CopyButton text={meta.preheader} />
                          </div>
                          <p className="text-sm">{meta.preheader}</p>
                        </div>
                      )}

                      <div className="bg-muted/50 rounded p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground">نص الإيميل</span>
                          <CopyButton text={item.generatedText} />
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{item.generatedText}</p>
                      </div>

                      {meta?.ctaText && (
                        <div className="bg-green-50 dark:bg-green-950/30 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-green-600">زر CTA</span>
                            <CopyButton text={meta.ctaText} />
                          </div>
                          <p className="text-sm font-semibold">{meta.ctaText}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {item.status === "draft" && (
                          <Button size="sm" onClick={() => updateStatus(item.id, "approved")}>اعتمد</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{page} / {totalPages}</span>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Banners Tab ====================

function BannersTab() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [occasion, setOccasion] = useState("");
  const [offerType, setOfferType] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products?limit=500", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || data || []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ contentType: "banner", page: String(page), limit: "10" });
      const res = await fetch(`/api/ai-advanced/content?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.data || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchContent(); }, [fetchContent]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai-advanced/content/banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          occasion: occasion || undefined,
          offerType: offerType || undefined,
          productIds: selectedProducts.length > 0 ? selectedProducts : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "تم توليد البانر بنجاح" });
        fetchContent();
      } else {
        toast({ title: "خطأ", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }
    setGenerating(false);
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/ai-advanced/content/${id}`, { method: "DELETE", credentials: "include" });
      toast({ title: "تم الحذف" });
      fetchContent();
    } catch { /* ignore */ }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/ai-advanced/content/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      toast({ title: "تم تحديث الحالة" });
      fetchContent();
    } catch { /* ignore */ }
  };

  const OCCASIONS = [
    { value: "عيد", label: "عيد" },
    { value: "رمضان", label: "رمضان" },
    { value: "تخفيضات صيف", label: "تخفيضات صيف" },
    { value: "تخفيضات شتاء", label: "تخفيضات شتاء" },
    { value: "منتجات جديدة", label: "منتجات جديدة" },
    { value: "عام", label: "عام" },
  ];

  const OFFER_TYPES = [
    { value: "خصم", label: "خصم" },
    { value: "شحن مجاني", label: "شحن مجاني" },
    { value: "اشتري 1 احصل 1", label: "اشتري 1 احصل 1" },
    { value: "هدية مجانية", label: "هدية مجانية" },
    { value: "عرض خاص", label: "عرض خاص" },
  ];

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            توليد بانر / عرض
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select value={occasion} onValueChange={setOccasion}>
              <SelectTrigger>
                <SelectValue placeholder="المناسبة (اختياري)..." />
              </SelectTrigger>
              <SelectContent>
                {OCCASIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={offerType} onValueChange={setOfferType}>
              <SelectTrigger>
                <SelectValue placeholder="نوع العرض (اختياري)..." />
              </SelectTrigger>
              <SelectContent>
                {OFFER_TYPES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select
            value={selectedProducts[0] || ""}
            onValueChange={(v) => setSelectedProducts(v ? [v] : [])}
          >
            <SelectTrigger>
              <SelectValue placeholder="منتج مميز (اختياري)..." />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
            ولّد بانر
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>البانرات المولدة ({total})</CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchContent}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا يوجد بانرات</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const meta = item.metadata as any;
                return (
                  <Card key={item.id} className="border">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {meta?.occasion && <Badge variant="outline">{meta.occasion}</Badge>}
                          {meta?.offerType && <Badge variant="outline">{meta.offerType}</Badge>}
                          <Badge variant={STATUS_MAP[item.status]?.variant || "secondary"}>
                            {STATUS_MAP[item.status]?.label || item.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("ar-IQ")}
                        </span>
                      </div>

                      {meta?.headline && (
                        <div className="bg-gradient-to-l from-primary/10 to-primary/5 rounded p-4 text-center">
                          <div className="flex justify-end"><CopyButton text={meta.headline} /></div>
                          <p className="text-xl font-bold">{meta.headline}</p>
                          {meta?.subheadline && <p className="text-sm mt-1 text-muted-foreground">{meta.subheadline}</p>}
                          {meta?.ctaText && (
                            <div className="mt-3">
                              <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium">
                                {meta.ctaText}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {meta?.description && (
                        <div className="bg-muted/50 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground">وصف العرض</span>
                            <CopyButton text={meta.description} />
                          </div>
                          <p className="text-sm">{meta.description}</p>
                        </div>
                      )}

                      {/* Copy all at once */}
                      <div className="bg-muted/50 rounded p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground">نسخ الكل</span>
                          <CopyButton text={`${meta?.headline || ""}\n${meta?.subheadline || ""}\n${meta?.description || ""}\n${meta?.ctaText || ""}`} />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        {item.status === "draft" && (
                          <Button size="sm" onClick={() => updateStatus(item.id, "approved")}>اعتمد</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{page} / {totalPages}</span>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Social Posts Tab ====================

function SocialPostsTab() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [platform, setPlatform] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products?limit=500", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || data || []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ contentType: "social_post", page: String(page), limit: "10" });
      const res = await fetch(`/api/ai-advanced/content?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.data || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchContent(); }, [fetchContent]);

  const generate = async () => {
    if (!selectedProduct || !platform) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/ai-advanced/content/social-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId: selectedProduct, platform }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "تم توليد المنشور بنجاح" });
        fetchContent();
      } else {
        toast({ title: "خطأ", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }
    setGenerating(false);
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/ai-advanced/content/${id}`, { method: "DELETE", credentials: "include" });
      toast({ title: "تم الحذف" });
      fetchContent();
    } catch { /* ignore */ }
  };

  const PLATFORMS = [
    { value: "instagram", label: "Instagram" },
    { value: "facebook", label: "Facebook" },
    { value: "twitter", label: "Twitter / X" },
  ];

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            توليد منشور سوشيال ميديا
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="اختر منتج..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="المنصة..." />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={generate} disabled={!selectedProduct || !platform || generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
            ولّد منشور
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>المنشورات المولدة ({total})</CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchContent}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا يوجد منشورات</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const meta = item.metadata as any;
                const productName = products.find((p) => p.id === item.productId)?.name;
                return (
                  <Card key={item.id} className="border">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {meta?.platform && <Badge variant="outline">{meta.platform}</Badge>}
                          {productName && <span className="text-sm text-muted-foreground">{productName}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("ar-IQ")}
                        </span>
                      </div>

                      <div className="bg-muted/50 rounded p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground">نص المنشور</span>
                          <CopyButton text={item.generatedText} />
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{item.generatedText}</p>
                      </div>

                      {meta?.hashtags && meta.hashtags.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-blue-600">هاشتاقات</span>
                            <CopyButton text={meta.hashtags.map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ")} />
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {meta.hashtags.map((h: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {h.startsWith("#") ? h : `#${h}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {meta?.callToAction && (
                        <div className="bg-green-50 dark:bg-green-950/30 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-green-600">Call to Action</span>
                            <CopyButton text={meta.callToAction} />
                          </div>
                          <p className="text-sm font-semibold">{meta.callToAction}</p>
                        </div>
                      )}

                      {/* Copy all */}
                      <div className="bg-muted/50 rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">نسخ الكل</span>
                          <CopyButton text={`${item.generatedText}\n\n${meta?.hashtags?.map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ") || ""}\n\n${meta?.callToAction || ""}`} />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{page} / {totalPages}</span>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Main Component ====================

export function AiContentHub() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="descriptions" dir="rtl">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="descriptions">وصف المنتجات</TabsTrigger>
          <TabsTrigger value="emails">إيميلات تسويقية</TabsTrigger>
          <TabsTrigger value="banners">بانرات وعروض</TabsTrigger>
          <TabsTrigger value="social">منشورات سوشيال</TabsTrigger>
        </TabsList>

        <TabsContent value="descriptions">
          <DescriptionsTab />
        </TabsContent>

        <TabsContent value="emails">
          <EmailsTab />
        </TabsContent>

        <TabsContent value="banners">
          <BannersTab />
        </TabsContent>

        <TabsContent value="social">
          <SocialPostsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
