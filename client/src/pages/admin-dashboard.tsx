import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { ImageUpload } from "@/components/admin/image-upload";
import { ImageReorderManager } from "@/components/admin/image-reorder-manager";
import { MultipleImageUpload } from "@/components/admin/multiple-image-upload";
import { OrdersManagement } from "@/components/admin/orders-management";
import { GalleryManagement } from "@/components/admin/gallery-management";
import CustomersManagement from "@/components/admin/customers-management";
import ReviewsManagement from "@/components/admin/reviews-management";
import SettingsManagement from "@/components/admin/settings-management";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { CouponsManagement } from "@/components/admin/coupons-management";
import { AuditLogsTab } from "@/components/admin/audit-logs-tab";
import { NotificationLogPanel } from "@/components/admin/notification-log-panel";

import SecurityManagement from "@/components/admin/security-management";
import AnalyticsDashboard from "@/components/admin/analytics-dashboard";
import { PriceSuggestionsPanel } from "@/components/admin/price-suggestions-panel";
import { AIInsightsPanel } from "@/components/admin/ai-insights-panel";
import { AIChatPanel } from "@/components/admin/ai-chat-panel";
import { AiMonitorPanel } from "@/components/admin/ai-monitor-panel";
import { AiLearningsPanel } from "@/components/admin/ai-learnings-panel";
import { ProductVariantsManager } from "@/components/admin/product-variants-manager";
import InvoicesList from "@/components/admin/invoices-list";
import AccountingPanel from "@/components/admin/accounting-panel";
import CompetitorMonitorPanel from "@/components/admin/competitor-monitor-panel";
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  Search,
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  AlertCircle,
  Image as ImageIcon,
  Percent,
  LogOut,
  User,
  Upload,
  Wand2,
  Camera,
  Trophy,
  Check,
  X,
  Crown,
  Heart,
  Tag,
  Shield,
  Settings,
  Calculator,
} from "lucide-react";
import { addCsrfHeader } from "@/lib/csrf";

interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  subcategory: string;
  description: string;
  price: string;
  originalPrice?: string;
  currency: string;
  images: string[];
  thumbnail: string;
  rating: string;
  reviewCount: number;
  stock: number;
  lowStockThreshold: number;
  isNew: boolean;
  isBestSeller: boolean;
  isProductOfWeek: boolean;
  specifications: import("@/types").ProductSpecification;
  createdAt: string;
  updatedAt: string;
}

interface Discount {
  id: string;
  productId: string;
  type: string;
  value: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Metadata will be fetched from API
// Fallback defaults in case API fails
const DEFAULT_CATEGORIES = [
  "أحواض",
  "معدات",
  "إضاءة",
  "طعام ورعاية",
  "ديكور",
  "إكسسوارات",
];

const DEFAULT_BRANDS = [
  "Aqua",
  "Tetra",
  "Fluval",
  "Marina",
  "API",
  "Seachem",
];

const DEFAULT_SPECS = [
  "الحجم",
  "الوزن",
  "المادة",
  "السعة",
  "الأبعاد",
];

// Slugify function with Arabic support
function slugify(text: string): string {
  if (!text) return '';

  // Arabic to Latin transliteration map (comprehensive)
  const arabicToLatin: Record<string, string> = {
    'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ء': 'a',
    'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h',
    'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
    'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't',
    'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
    'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h',
    'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'h', 'ئ': 'y',
    'ؤ': 'w', 'ـ': '', ' ': '-',
    // Additional Arabic characters
    'ِ': '', 'ُ': '', 'ٓ': '', 'ٰ': '', 'ْ': '', 'ٌ': '', 'ٍ': '', 'ً': '',
    'ّ': '', 'َ': '',
  };

  // Transliterate Arabic characters
  let result = text
    .toString()
    .trim()
    .split('')
    .map(char => arabicToLatin[char] !== undefined ? arabicToLatin[char] : char)
    .join('');

  // Apply standard slugification
  return result
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')       // Remove non-word chars (except hyphens)
    .replace(/\-\-+/g, '-')         // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '');       // Remove leading/trailing hyphens
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  // Filter states
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [imageBase64, setImageBase64] = useState<string>("");
  const [customBrand, setCustomBrand] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [customSubcategory, setCustomSubcategory] = useState<string>("");
  // Variants management state
  const [isVariantsDialogOpen, setIsVariantsDialogOpen] = useState(false);
  const [variantsProduct, setVariantsProduct] = useState<Product | null>(null);
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  // Specifications editor state
  const [specKey, setSpecKey] = useState<string>("");
  const [specValue, setSpecValue] = useState<string>("");
  const [customSpecKey, setCustomSpecKey] = useState<string>("");

  // Metadata from database (categories, brands, specs)
  const [CATEGORIES, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [BRANDS, setBrands] = useState<string[]>(DEFAULT_BRANDS);
  const [COMMON_SPECS, setCommonSpecs] = useState<string[]>(DEFAULT_SPECS);

  const { toast } = useToast();
  const { user, logout } = useAuth();

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    slug: "",
    brand: "",
    category: "",
    subcategory: "",
    description: "",
    price: "0",
    originalPrice: "",
    currency: "IQD",
    images: [],
    thumbnail: "",
    stock: 0,
    lowStockThreshold: 10,
    isNew: false,
    isBestSeller: false,
    isProductOfWeek: false,
    specifications: {},
  });

  const [activeOrdersCount, setActiveOrdersCount] = useState<number>(0);

  useEffect(() => {
    fetchMetadata();
    fetch("/api/admin/orders", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const active = data.filter((o: any) => o.status !== "delivered" && o.status !== "cancelled");
        setActiveOrdersCount(active.length);
      })
      .catch(() => {});
  }, []);

  const fetchMetadata = async () => {
    try {
      const response = await fetch("/api/metadata/all", {
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          if (result.data.categories && result.data.categories.length > 0) {
            setCategories(result.data.categories);
          }
          if (result.data.brands && result.data.brands.length > 0) {
            setBrands(result.data.brands);
          }
          if (result.data.specifications && result.data.specifications.length > 0) {
            setCommonSpecs(result.data.specifications);
          }
          console.log(`[Admin] Loaded metadata: ${result.data.categories.length} categories, ${result.data.brands.length} brands, ${result.data.specifications.length} specs`);
        }
      } else {
        console.warn("[Admin] Failed to fetch metadata, using defaults");
      }
    } catch (error) {
      console.error("[Admin] Error fetching metadata:", error);
      // Continue with defaults
    }
  };

  const { data: productsData, isLoading: loading } = useQuery({
    queryKey: ["products"],
    queryFn: async (): Promise<Product[]> => {
      const response = await fetch("/api/products?limit=1000", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.products ?? [];
    },
  });

  const products: Product[] = productsData ?? [];

  const createProductMutation = useMutation({
    mutationFn: async (productPayload: Partial<Product> & { imageBase64?: string }) => {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: addCsrfHeader({
          "Content-Type": "application/json",
        }),
        credentials: "include",
        body: JSON.stringify(productPayload),
      });

      if (!response.ok) {
        const error = await response.json();
        const err = Object.assign(new Error(error.message || "فشل إضافة المنتج"), {
          status: response.status,
          code: error.error as string | undefined,
        });
        throw err;
      }

      return response.json();
    },
    onSuccess: () => {
      toast({ title: "نجح", description: "تم إضافة المنتج بنجاح" });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error & { status?: number; code?: string }) => {
      if (error.status === 401) {
        if (error.code === "NO_SESSION") {
          toast({
            title: "خطأ في إعداد الموقع",
            description: "Environment Variables غير مضافة في Vercel. يرجى مراجعة ملف URGENT_VERCEL_SETUP.md",
            variant: "destructive",
          });
        } else if (error.code === "NOT_LOGGED_IN") {
          toast({ title: "غير مسجل دخول", description: "يرجى تسجيل الدخول مرة أخرى", variant: "destructive" });
          setLocation("/admin/login");
        } else {
          toast({ title: "غير مصرح", description: error.message || "يرجى تسجيل الدخول كمدير", variant: "destructive" });
        }
      } else if (error.status === 403) {
        toast({ title: "ممنوع", description: "حسابك ليس له صلاحيات إدارة. Role: " + (error.message || "user"), variant: "destructive" });
      } else if (error instanceof TypeError && error.message.includes("fetch")) {
        toast({
          title: "خطأ في الاتصال",
          description: "لا يمكن الاتصال بالخادم. تأكد من: 1) اتصالك بالإنترنت، 2) الخادم يعمل على المنفذ الصحيح، 3) لا يوجد حاجز ناري يمنع الاتصال.",
          variant: "destructive",
        });
      } else {
        let errorMessage = error.message;
        if (errorMessage.includes("Failed to fetch")) {
          errorMessage = "فشل الاتصال بالخادم. تأكد من أن الخادم يعمل وأن عنوان API صحيح.";
        } else if (errorMessage.includes("NetworkError")) {
          errorMessage = "خطأ في الشبكة. تحقق من اتصالك بالإنترنت.";
        }
        toast({ title: "خطأ", description: errorMessage, variant: "destructive" });
      }
    },
  });

  const handleCreateProduct = () => {
    // Validate required fields
    if (!formData.name || formData.name.trim() === "") {
      toast({ title: "خطأ", description: "يرجى إدخال اسم المنتج", variant: "destructive" });
      return;
    }
    if (!formData.brand || formData.brand.trim() === "") {
      toast({ title: "خطأ", description: "يرجى اختيار أو إدخال العلامة التجارية", variant: "destructive" });
      return;
    }
    if (!formData.category || formData.category.trim() === "") {
      toast({ title: "خطأ", description: "يرجى اختيار أو إدخال الفئة", variant: "destructive" });
      return;
    }
    if (!formData.description || formData.description.trim() === "") {
      toast({ title: "خطأ", description: "يرجى إدخال وصف المنتج", variant: "destructive" });
      return;
    }

    const slug = formData.slug || slugify(formData.name ?? "");
    const productPayload = { ...formData, slug, imageBase64: imageBase64 || undefined };

    if (import.meta.env.DEV) {
      console.log("Sending product data:", { ...productPayload, imageBase64: imageBase64 ? "[IMAGE DATA]" : "none" });
    }

    createProductMutation.mutate(productPayload);
  };

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Product> & { imageBase64?: string } }) => {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: addCsrfHeader({
          "Content-Type": "application/json",
        }),
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل تحديث المنتج");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({ title: "نجح", description: "تم تحديث المنتج بنجاح" });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast({ title: "خطأ في الاتصال", description: "تأكد من اتصالك بالإنترنت وأن الخادم يعمل.", variant: "destructive" });
      } else {
        toast({ title: "خطأ", description: `حدث خطأ أثناء تحديث المنتج: ${error.message}`, variant: "destructive" });
      }
    },
  });

  const handleUpdateProduct = () => {
    if (!selectedProduct) {
      toast({ title: "خطأ", description: "لم يتم تحديد أي منتج", variant: "destructive" });
      return;
    }

    // Remove date fields that the server will regenerate
    const { createdAt, updatedAt, deletedAt, ...cleanFormData } = formData as Partial<Product> & { createdAt?: string; updatedAt?: string; deletedAt?: string };
    const payload = { ...cleanFormData, imageBase64: imageBase64 || undefined };

    updateProductMutation.mutate({ id: selectedProduct.id, payload });
  };

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      console.log("[Admin] Sending DELETE for product:", productId);
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
        headers: addCsrfHeader(),
        credentials: "include",
      });

      console.log("[Admin] DELETE response status:", response.status);

      if (!response.ok) {
        let errorMessage = `فشل حذف المنتج (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Response might not be JSON (e.g., HTML error pages)
          const text = await response.text().catch(() => "");
          console.error("[Admin] Non-JSON error response:", text.slice(0, 200));
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({ title: "نجح", description: "تم حذف المنتج بنجاح" });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: Error) => {
      console.error("Error deleting product:", error);
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء حذف المنتج", variant: "destructive" });
    },
  });

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!productToDelete) return;
    deleteProductMutation.mutate(productToDelete.id);
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const duplicateProductMutation = useMutation({
    mutationFn: async (product: Product) => {
      const { id, ...data } = product as Product & Record<string, unknown>;
      void id;
      const payload = {
        ...data,
        name: `نسخة من ${product.name}`,
        slug: `${product.slug}-copy-${Date.now()}`,
      };
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("فشل نسخ المنتج");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم النسخ", description: "تم إنشاء نسخة من المنتج بنجاح" });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: Error) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setFormData(product);
    setImageBase64("");
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      brand: "",
      category: "",
      subcategory: "",
      description: "",
      price: "0",
      originalPrice: "",
      currency: "IQD",
      images: [],
      thumbnail: "",
      stock: 0,
      lowStockThreshold: 10,
      isNew: false,
      isBestSeller: false,
      isProductOfWeek: false,
      specifications: {},
    });
    setSelectedProduct(null);
    setImageBase64("");
    setCustomBrand("");
    setCustomCategory("");
    setCustomSubcategory("");
    setSpecKey("");
    setSpecValue("");
    setCustomSpecKey("");
  };

  // Auto-generate slug when name changes
  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: slugify(name),
    });
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search filter
      const matchesSearch = searchTerm === "" ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase());

      // Brand filter
      const matchesBrand = filterBrand === "all" || product.brand === filterBrand;

      // Category filter
      const matchesCategory = filterCategory === "all" || product.category === filterCategory;

      return matchesSearch && matchesBrand && matchesCategory;
    });
  }, [products, searchTerm, filterBrand, filterCategory]);

  // Pagination calculations
  const totalFilteredProducts = filteredProducts.length;
  const totalPages = Math.ceil(totalFilteredProducts / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalFilteredProducts);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterBrand, filterCategory]);

  // Get unique brands and categories from products
  const uniqueBrands = useMemo(() => {
    const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));
    return brands.sort();
  }, [products]);

  const uniqueCategories = useMemo(() => {
    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return categories.sort();
  }, [products]);

  // Calculate statistics
  const totalProducts = products.length;
  const lowStockProducts = products.filter((p) => p.stock <= p.lowStockThreshold).length;
  
  // Calculate inventory value ONLY for available/purchasable products
  // (YEE/GENERAL brand with price > 0)
  const totalValue = products.reduce((sum, p) => {
    const isPurchasableBrand = ["YEE", "GENERAL"].includes(p.brand?.toUpperCase() || "");
    const hasPrice = isPurchasableBrand && Number(p.price || 0) > 0;
    
    // Only calculate value if it has a price and stock
    if (hasPrice && p.stock > 0) {
      return sum + Number(p.price) * p.stock;
    }
    return sum;
  }, 0);

  return (
    <div className="container mx-auto py-8 px-4" dir="rtl">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">لوحة تحكم الإدارة</h1>
          <p className="text-gray-600">إدارة شاملة للمنتجات والمخزون</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">مرحباً</p>
            <p className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              {user?.email}
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
            onClick={() => setLocation('/admin/finance')}
          >
            <Calculator className="w-4 h-4" />
            الدخول إلى المحاسب
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-cyan-300 text-cyan-700 hover:bg-cyan-50"
            onClick={() => setLocation('/admin/partners')}
          >
            <Users className="w-4 h-4" />
            شركاء المبيعات
          </Button>
          <Button variant="outline" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المنتجات</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter end={totalProducts} duration={1500} />
            </div>
            <p className="text-xs text-gray-500">المنتجات المتوفرة في النظام</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">منتجات بمخزون منخفض</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              <AnimatedCounter end={lowStockProducts} duration={1500} />
            </div>
            <p className="text-xs text-gray-500">تحتاج إلى إعادة تخزين</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">قيمة المخزون</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter end={totalValue} duration={2000} decimals={0} />
            </div>
            <p className="text-xs text-gray-500">دينار عراقي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold"><AnimatedCounter end={activeOrdersCount} duration={1000} /></div>
            <p className="text-xs text-gray-500">طلبات نشطة</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="w-full">

        <TabsList className="flex flex-wrap w-full h-auto p-1.5 gap-1.5 bg-muted/60 border border-border/50 rounded-xl justify-start">
          <TabsTrigger value="products">المنتجات</TabsTrigger>
          <TabsTrigger value="ai-insights">🤖 AI</TabsTrigger>
          <TabsTrigger value="ai-monitor">🔍 مراقبة AI</TabsTrigger>
          <TabsTrigger value="ai-learnings">🧠 تعلم AI</TabsTrigger>
          <TabsTrigger value="notifications">🔔 الإشعارات</TabsTrigger>
          <TabsTrigger value="coupons">الكوبونات</TabsTrigger>
          <TabsTrigger value="orders">الطلبات</TabsTrigger>
          <TabsTrigger value="invoices">فواتير واتساب</TabsTrigger>
          <TabsTrigger value="accounting">💰 المحاسب</TabsTrigger>
          <TabsTrigger value="competitors">🔍 المنافسون</TabsTrigger>
          <TabsTrigger value="customers">العملاء</TabsTrigger>
          <TabsTrigger value="reviews">المراجعات</TabsTrigger>
          <TabsTrigger value="gallery">المعرض</TabsTrigger>
          <TabsTrigger value="audit-logs">السجلات</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
          <TabsTrigger value="security">الأمان</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        {/* WhatsApp Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <InvoicesList />
        </TabsContent>

        <TabsContent value="accounting" className="space-y-4">
          <AccountingPanel />
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4">
          <CompetitorMonitorPanel />
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai-insights" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <AIChatPanel />
            <div className="space-y-6">
              <PriceSuggestionsPanel />
            </div>
          </div>
          <AIInsightsPanel />
        </TabsContent>

        <TabsContent value="ai-monitor" className="space-y-4">
          <AiMonitorPanel />
        </TabsContent>

        <TabsContent value="ai-learnings" className="space-y-4">
          <AiLearningsPanel />
        </TabsContent>

        {/* Notification Log Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <NotificationLogPanel />
        </TabsContent>

        <TabsContent value="coupons" className="space-y-4">
          <CouponsManagement />
        </TabsContent>

        <TabsContent value="audit-logs" className="space-y-4">
          <AuditLogsTab />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecurityManagement />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>إدارة المنتجات</CardTitle>
                  <CardDescription>إضافة، تعديل، وحذف المنتجات</CardDescription>
                </div>
                <Button onClick={openCreateDialog}>
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة منتج جديد
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filters Bar */}
              <div className="mb-6 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="ابحث عن المنتجات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Brand Filter */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">العلامة التجارية:</Label>
                    <Select value={filterBrand} onValueChange={setFilterBrand}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="الكل" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        {uniqueBrands.map((brand) => (
                          <SelectItem key={brand} value={brand}>
                            {brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Filter */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">الفئة:</Label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="الكل" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        {uniqueCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters */}
                  {(filterBrand !== "all" || filterCategory !== "all" || searchTerm) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterBrand("all");
                        setFilterCategory("all");
                        setSearchTerm("");
                      }}
                      className="text-muted-foreground"
                    >
                      <X className="h-4 w-4 ml-1" />
                      مسح الفلاتر
                    </Button>
                  )}
                </div>

                {/* Results Counter */}
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>
                    عرض {totalFilteredProducts > 0 ? startIndex + 1 : 0}-{endIndex} من {totalFilteredProducts} منتج
                    {totalFilteredProducts !== products.length && (
                      <span className="mr-2">(من إجمالي {products.length} منتج)</span>
                    )}
                  </span>
                  {totalPages > 1 && (
                    <span>صفحة {currentPage} من {totalPages}</span>
                  )}
                </div>
              </div>

              {/* Products Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الصورة</TableHead>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">العلامة التجارية</TableHead>
                      <TableHead className="text-right">الفئة</TableHead>
                      <TableHead className="text-right">السعر</TableHead>
                      <TableHead className="text-right">المخزون</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          جاري التحميل...
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          لا توجد منتجات
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="w-16 h-16 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden border border-border">
                              {product.thumbnail || product.images?.[0] ? (
                                <img
                                  src={product.thumbnail || product.images?.[0] || "/placeholder-product.svg"}
                                  alt={product.name}
                                  className="w-full h-full object-contain p-2"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "/placeholder-product.svg";
                                  }}
                                />
                              ) : (
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.brand}</TableCell>
                          <TableCell>{product.subcategory}</TableCell>
                          <TableCell>
                            {Number(product.price).toLocaleString('en-US')} {product.currency}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                product.stock <= product.lowStockThreshold
                                  ? "destructive"
                                  : "default"
                              }
                            >
                              {product.stock}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {product.isNew && (
                                <Badge variant="secondary">جديد</Badge>
                              )}
                              {product.isBestSeller && (
                                <Badge variant="default">الأكثر مبيعاً</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(product)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setVariantsProduct(product);
                                  setIsVariantsDialogOpen(true);
                                }}
                                title="إدارة الخيارات"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                title="نسخ المنتج"
                                disabled={duplicateProductMutation.isPending}
                                onClick={() => duplicateProductMutation.mutate(product)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteProduct(product)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    الأولى
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    السابق
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    التالي
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    الأخيرة
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>إدارة الطلبات</CardTitle>
              <CardDescription>عرض وإدارة طلبات العملاء وتحديث حالاتها</CardDescription>
            </CardHeader>
            <CardContent>
              <OrdersManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                إدارة معرض العملاء
              </CardTitle>
              <CardDescription>مراجعة الصور، اختيار الفائزين، وإدارة الجوائز</CardDescription>
            </CardHeader>
            <CardContent>
              <GalleryManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>إدارة العملاء</CardTitle>
              <CardDescription>عرض وإدارة حسابات المستخدمين</CardDescription>
            </CardHeader>
            <CardContent>
              <CustomersManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <ReviewsManagement />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>الإعدادات العامة</CardTitle>
              <CardDescription>تخصيص إعدادات المتجر</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          dir="rtl"
          onEscapeKeyDown={(e) => {
            if (formData.name) {
              e.preventDefault();
              if (window.confirm("هل تريد إغلاق النموذج؟ سيتم فقدان البيانات غير المحفوظة.")) {
                setIsDialogOpen(false);
                resetForm();
              }
            }
          }}
          onInteractOutside={(e) => {
            if (formData.name) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "تعديل المنتج" : "إضافة منتج جديد"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "قم بتعديل بيانات المنتج أدناه"
                : "قم بإدخال بيانات المنتج الجديد"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image Upload */}
            <ImageUpload
              value={formData.thumbnail || imageBase64}
              onChange={(base64) => setImageBase64(base64)}
              onRemove={() => setImageBase64("")}
            />

            {/* Image Reorder (only for edit mode with existing images) */}
            {isEditMode && formData.images && formData.images.length > 0 && (
              <ImageReorderManager
                images={formData.images}
                thumbnail={formData.thumbnail || formData.images[0]}
                onImagesChange={(newImages) => setFormData({ ...formData, images: newImages })}
                onThumbnailChange={(newThumbnail) => setFormData({ ...formData, thumbnail: newThumbnail })}
                onDeleteImage={(imageToDelete) => {
                  if (!formData.images) return;
                  const newImages = formData.images.filter(img => img !== imageToDelete);
                  setFormData({
                    ...formData,
                    images: newImages,
                    thumbnail: formData.thumbnail === imageToDelete
                      ? (newImages[0] || "")
                      : formData.thumbnail
                  });
                }}
              />
            )}

            {/* Multiple Image Upload */}
            <MultipleImageUpload
              images={formData.images || []}
              onImagesChange={(newImages) => setFormData({ ...formData, images: newImages })}
              maxImages={10}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  اسم المنتج *
                  <Wand2 className="w-3 h-3 text-purple-500" />
                  <span className="text-xs text-gray-500">(سيتم توليد الرابط تلقائياً)</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="أدخل اسم المنتج"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="slug">الرابط (Slug)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="سيتم توليده تلقائياً من الاسم"
                  className="font-mono text-sm"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">العلامة التجارية *</Label>
                <Select
                  value={formData.brand === "other" || (formData.brand && !BRANDS.includes(formData.brand)) ? "other" : formData.brand}
                  onValueChange={(value) => {
                    if (value === "other") {
                      setFormData({ ...formData, brand: "" });
                      setCustomBrand("");
                    } else {
                      setFormData({ ...formData, brand: value });
                      setCustomBrand("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العلامة التجارية" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANDS.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">أخرى (إضافة جديدة)</SelectItem>
                  </SelectContent>
                </Select>
                {(formData.brand === "" || formData.brand === "other" || (formData.brand && !BRANDS.includes(formData.brand))) && (
                  <Input
                    placeholder="أدخل اسم العلامة التجارية"
                    value={customBrand || formData.brand}
                    onChange={(e) => {
                      setCustomBrand(e.target.value);
                      setFormData({ ...formData, brand: e.target.value });
                    }}
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">الفئة *</Label>
                <Select
                  value={formData.category && CATEGORIES.includes(formData.category) ? formData.category : "other"}
                  onValueChange={(value) => {
                    if (value === "other") {
                      setFormData({ ...formData, category: "", subcategory: "" });
                      setCustomCategory("");
                    } else {
                      setFormData({ ...formData, category: value, subcategory: value });
                      setCustomCategory("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">أخرى (إضافة جديدة)</SelectItem>
                  </SelectContent>
                </Select>
                {(formData.category === "" || !CATEGORIES.includes(formData.category || "")) && (
                  <Input
                    placeholder="أدخل اسم الفئة"
                    value={customCategory || formData.category}
                    onChange={(e) => {
                      setCustomCategory(e.target.value);
                      setFormData({ ...formData, category: e.target.value, subcategory: e.target.value });
                    }}
                    className="mt-2"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategory">الفئة الفرعية *</Label>
              <Select
                value={formData.subcategory && CATEGORIES.includes(formData.subcategory) ? formData.subcategory : "other"}
                onValueChange={(value) => {
                  if (value === "other") {
                    setFormData({ ...formData, subcategory: "" });
                    setCustomSubcategory("");
                  } else {
                    setFormData({ ...formData, subcategory: value });
                    setCustomSubcategory("");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة الفرعية" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">أخرى (إضافة جديدة)</SelectItem>
                </SelectContent>
              </Select>
              {(formData.subcategory === "" || !CATEGORIES.includes(formData.subcategory || "")) && (
                <Input
                  placeholder="أدخل اسم الفئة الفرعية"
                  value={customSubcategory || formData.subcategory}
                  onChange={(e) => {
                    setCustomSubcategory(e.target.value);
                    setFormData({ ...formData, subcategory: e.target.value });
                  }}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">الوصف *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="أدخل وصف المنتج"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">السعر *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="originalPrice">السعر الأصلي</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  value={formData.originalPrice || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, originalPrice: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">العملة</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  placeholder="IQD"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">الكمية المتوفرة *</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: Number(e.target.value) })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">حد المخزون المنخفض</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lowStockThreshold: Number(e.target.value),
                    })
                  }
                  placeholder="10"
                />
              </div>
            </div>

            {/* Specifications Editor */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                المواصفات التقنية
              </Label>

              {/* Add new specification */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={specKey}
                    onValueChange={(value) => {
                      if (value === "other") {
                        setSpecKey("");
                        setCustomSpecKey("");
                      } else {
                        setSpecKey(value);
                        setCustomSpecKey("");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المواصفة" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_SPECS.map((spec) => (
                        <SelectItem key={spec} value={spec}>
                          {spec}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">أخرى (إدخال مخصص)</SelectItem>
                    </SelectContent>
                  </Select>
                  {specKey === "" && (
                    <Input
                      placeholder="أدخل اسم المواصفة"
                      value={customSpecKey}
                      onChange={(e) => setCustomSpecKey(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="أدخل القيمة"
                    value={specValue}
                    onChange={(e) => setSpecValue(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const key = specKey || customSpecKey;
                    if (key && specValue) {
                      setFormData({
                        ...formData,
                        specifications: {
                          ...formData.specifications,
                          [key]: specValue,
                        },
                      });
                      setSpecKey("");
                      setSpecValue("");
                      setCustomSpecKey("");
                    }
                  }}
                  disabled={!(specKey || customSpecKey) || !specValue}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Current specifications list */}
              {formData.specifications && Object.keys(formData.specifications).length > 0 && (
                <div className="border rounded-lg divide-y">
                  {Object.entries(formData.specifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">{key}</span>
                        <span className="text-sm font-semibold">{String(value)}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          const newSpecs = { ...formData.specifications };
                          delete newSpecs[key];
                          setFormData({
                            ...formData,
                            specifications: newSpecs,
                          });
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status Badges */}
            <div className="space-y-2">
              <Label>حالة المنتج</Label>
              <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.isNew}
                    onChange={(e) =>
                      setFormData({ ...formData, isNew: e.target.checked })
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Badge variant={formData.isNew ? "secondary" : "outline"}>
                    منتج جديد
                  </Badge>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.isBestSeller}
                    onChange={(e) =>
                      setFormData({ ...formData, isBestSeller: e.target.checked })
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Badge variant={formData.isBestSeller ? "default" : "outline"}>
                    الأكثر مبيعاً
                  </Badge>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:text-amber-500 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.isProductOfWeek}
                    onChange={(e) =>
                      setFormData({ ...formData, isProductOfWeek: e.target.checked })
                    }
                    className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  <Badge variant={formData.isProductOfWeek ? "default" : "outline"} className={formData.isProductOfWeek ? "bg-amber-500" : ""}>
                    منتج الأسبوع
                  </Badge>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={isEditMode ? handleUpdateProduct : handleCreateProduct}>
              {isEditMode ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Variants Management Dialog */}
      <Dialog open={isVariantsDialogOpen} onOpenChange={setIsVariantsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {variantsProduct && (
            <ProductVariantsManager
              productId={variantsProduct.id}
              productName={variantsProduct.name}
              productImages={(variantsProduct as any).images || []}
              variants={(variantsProduct as any).variants || null}
              hasVariants={(variantsProduct as any).hasVariants || false}
              onUpdate={() => {
                void queryClient.invalidateQueries({ queryKey: ["products"] });
                setIsVariantsDialogOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ========== Delete Confirmation Dialog ========== */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              تأكيد الحذف
            </DialogTitle>
            <DialogDescription className="text-right mt-2">
              هل أنت متأكد من حذف المنتج؟
              <br />
              <span className="font-semibold text-white mt-1 block">
                {productToDelete?.name}
              </span>
              <span className="text-yellow-400 text-xs block mt-1">
                ⚠️ هذا الإجراء لا يمكن التراجع عنه
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setProductToDelete(null);
              }}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteProductMutation.isPending}
              className="flex-1"
            >
              {deleteProductMutation.isPending ? "جاري الحذف..." : "حذف المنتج"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
