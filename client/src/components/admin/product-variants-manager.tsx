/**
 * Product Variants Manager Component
 * Allows admin to add, edit, and delete product variants with images
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Image as ImageIcon, Save, X } from "lucide-react";
import type { ProductVariant } from "@/types";
import { ImageSelector } from "@/components/admin/image-selector";
import { cn } from "@/lib/utils";

interface ProductVariantsManagerProps {
  productId: string;
  productName: string;
  variants: ProductVariant[] | null;
  hasVariants: boolean;
  onUpdate: () => void;
}

export function ProductVariantsManager({
  productId,
  productName,
  variants: initialVariants,
  hasVariants: initialHasVariants,
  onUpdate,
}: ProductVariantsManagerProps) {
  const { toast } = useToast();
  const [variants, setVariants] = useState<ProductVariant[]>(initialVariants || []);
  const [hasVariants, setHasVariants] = useState(initialHasVariants);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);

  // Drag & Drop state
  const [draggedImage, setDraggedImage] = useState<string | null>(null);
  const [dropTargetVariantId, setDropTargetVariantId] = useState<string | null>(null);

  // Inline editing state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);

  // Form state for variant editor
  const [formData, setFormData] = useState<Partial<ProductVariant>>({
    id: "",
    label: "",
    price: 0,
    originalPrice: undefined,
    stock: 0,
    isDefault: false,
    image: "",
    specifications: {},
  });

  // Fetch product images when component mounts
  useEffect(() => {
    const fetchProductImages = async () => {
      try {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) throw new Error("Failed to fetch product");
        const product = await response.json();
        setProductImages(product.images || []);
      } catch (error) {
        console.error("Error fetching product images:", error);
      }
    };

    if (productId) {
      fetchProductImages();
    }
  }, [productId]);

  const handleAddVariant = () => {
    setEditingVariant(null);
    setFormData({
      id: "",
      label: "",
      price: 0,
      originalPrice: undefined,
      stock: 0,
      isDefault: false,
      image: "",
      specifications: {},
    });
    setIsDialogOpen(true);
  };

  const handleEditVariant = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData(variant);
    setIsDialogOpen(true);
  };

  const handleDeleteVariant = (variantId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الخيار؟")) return;

    const newVariants = variants.filter((v) => v.id !== variantId);
    setVariants(newVariants);
  };

  const handleSaveVariant = () => {
    if (!formData.id || !formData.label || !formData.price) {
      toast({
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const newVariant: ProductVariant = {
      id: formData.id,
      label: formData.label,
      price: Number(formData.price),
      originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
      stock: Number(formData.stock || 0),
      isDefault: formData.isDefault || false,
      image: formData.image,
      specifications: formData.specifications || {},
    };

    if (editingVariant) {
      // Update existing variant
      const newVariants = variants.map((v) =>
        v.id === editingVariant.id ? newVariant : v
      );
      setVariants(newVariants);
    } else {
      // Add new variant
      setVariants([...variants, newVariant]);
    }

    setIsDialogOpen(false);
    toast({
      title: "نجح",
      description: editingVariant ? "تم تحديث الخيار" : "تم إضافة الخيار",
    });
  };

  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}/variants`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hasVariants: variants.length > 0,
          variants: variants.length > 0 ? variants : null,
        }),
      });

      if (!response.ok) throw new Error("فشل في حفظ الخيارات");

      toast({
        title: "نجح! ✅",
        description: "تم حفظ الخيارات بنجاح",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في حفظ الخيارات",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVariants = () => {
    if (hasVariants && variants.length > 0) {
      if (!confirm("هل أنت متأكد من تعطيل جميع الخيارات؟")) return;
      setVariants([]);
    }
    setHasVariants(!hasVariants);
  };

  // Drag & Drop handlers
  const handleImageDragStart = (imageUrl: string) => {
    setDraggedImage(imageUrl);
  };

  const handleImageDragEnd = () => {
    setDraggedImage(null);
    setDropTargetVariantId(null);
  };

  const handleVariantDragOver = (e: React.DragEvent, variantId: string) => {
    e.preventDefault();
    setDropTargetVariantId(variantId);
  };

  const handleVariantDragLeave = () => {
    setDropTargetVariantId(null);
  };

  const handleVariantDrop = (e: React.DragEvent, variantId: string) => {
    e.preventDefault();
    if (draggedImage) {
      // Update variant image
      const newVariants = variants.map((v) =>
        v.id === variantId ? { ...v, image: draggedImage } : v
      );
      setVariants(newVariants);

      toast({
        title: "تم! 🎨",
        description: "تم ربط الصورة بالمتغير",
      });
    }
    setDraggedImage(null);
    setDropTargetVariantId(null);
  };

  // Inline editing handlers
  const handlePriceClick = (variant: ProductVariant) => {
    setEditingPriceId(variant.id);
    setTempPrice(variant.price);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setTempPrice(value);
    }
  };

  const handlePriceSave = (variantId: string) => {
    const newVariants = variants.map((v) =>
      v.id === variantId ? { ...v, price: tempPrice } : v
    );
    setVariants(newVariants);
    setEditingPriceId(null);

    toast({
      title: "تم! ✅",
      description: "تم تحديث السعر",
    });
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent, variantId: string) => {
    if (e.key === "Enter") {
      handlePriceSave(variantId);
    } else if (e.key === "Escape") {
      setEditingPriceId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>خيارات المنتج (Variants)</CardTitle>
            <CardDescription>
              {productName} - إدارة الأحجام والألوان والخيارات المختلفة
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={hasVariants}
              onCheckedChange={handleToggleVariants}
              id="has-variants"
            />
            <Label htmlFor="has-variants" className="cursor-pointer">
              تفعيل الخيارات
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasVariants && (
          <>
            <div className="flex justify-between items-center mb-4">
              <Button onClick={handleAddVariant} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                إضافة خيار جديد
              </Button>
              <Button
                onClick={handleSaveToDatabase}
                disabled={isSaving}
                variant="default"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </div>

            {variants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا توجد خيارات بعد. اضغط "إضافة خيار جديد" للبدء.</p>
              </div>
            ) : (
              <>
                {/* معرض الصور للسحب والإفلات */}
                {productImages.length > 0 && (
                  <div className="mb-6 p-4 bg-muted/30 rounded-lg border-2 border-dashed">
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="w-4 h-4 text-primary" />
                      <Label className="text-sm font-medium">
                        اسحب الصور وأفلتها على المتغيرات:
                      </Label>
                    </div>
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                      {productImages.map((img) => (
                        <div
                          key={img}
                          draggable
                          onDragStart={() => handleImageDragStart(img)}
                          onDragEnd={handleImageDragEnd}
                          className={cn(
                            "relative cursor-move rounded border-2 overflow-hidden transition-all",
                            "hover:border-primary hover:scale-105",
                            draggedImage === img && "opacity-50 scale-95"
                          )}
                          title="اسحب لتعيين الصورة"
                        >
                          <img
                            src={img}
                            alt="صورة المنتج"
                            className="w-full h-16 object-cover"
                            draggable={false}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 نصيحة: اسحب الصورة وأفلتها على اسم المتغير لتعيينها
                    </p>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>المنتج</TableHead>
                      <TableHead>السعر</TableHead>
                      <TableHead>المخزون</TableHead>
                      <TableHead>افتراضي</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {variant.id}
                          </code>
                        </TableCell>
                        <TableCell
                          onDragOver={(e) => handleVariantDragOver(e, variant.id)}
                          onDragLeave={handleVariantDragLeave}
                          onDrop={(e) => handleVariantDrop(e, variant.id)}
                          className={cn(
                            "transition-colors",
                            dropTargetVariantId === variant.id && "bg-primary/10 ring-2 ring-primary"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {variant.image ? (
                              <img
                                src={variant.image}
                                alt={variant.label}
                                className="w-12 h-12 object-cover rounded border"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="font-medium">{variant.label}</span>
                              {variant.image && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" />
                                  صورة مخصصة
                                </span>
                              )}
                              {dropTargetVariantId === variant.id && (
                                <span className="text-xs text-primary font-medium animate-pulse">
                                  📸 إفلات الصورة هنا
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {editingPriceId === variant.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={tempPrice}
                                onChange={handlePriceChange}
                                onKeyDown={(e) => handlePriceKeyDown(e, variant.id)}
                                onBlur={() => handlePriceSave(variant.id)}
                                className="w-32"
                                autoFocus
                              />
                              <span className="text-xs text-muted-foreground">د.ع</span>
                            </div>
                          ) : (
                            <div
                              className="cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                              onClick={() => handlePriceClick(variant)}
                              title="اضغط للتعديل"
                            >
                              {Number(variant.price).toLocaleString('en-US')} د.ع
                              {variant.originalPrice && (
                                <span className="text-xs text-muted-foreground line-through mr-2">
                                  {variant.originalPrice.toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={variant.stock > 0 ? "default" : "destructive"}>
                            {variant.stock} قطعة
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {variant.isDefault && (
                            <Badge variant="secondary">افتراضي</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditVariant(variant)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteVariant(variant.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}

            {!hasVariants && (
              <div className="text-center py-8 text-muted-foreground">
                <p>الخيارات معطلة. فعّل الخيارات لإضافة أحجام وألوان مختلفة.</p>
              </div>
            )}

            {/* Variant Editor Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingVariant ? "تعديل الخيار" : "إضافة خيار جديد"}
                  </DialogTitle>
                  <DialogDescription>
                    أدخل تفاصيل الخيار (مثل: الحجم، اللون، القدرة)
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4" dir="rtl">
                  {/* ID */}
                  <div>
                    <Label htmlFor="variant-id">
                      ID الخيار <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="variant-id"
                      value={formData.id}
                      onChange={(e) =>
                        setFormData({ ...formData, id: e.target.value })
                      }
                      placeholder="مثال: 5g-green, M, 18W"
                      disabled={!!editingVariant}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      معرف فريد للخيار (بالإنجليزية فقط)
                    </p>
                  </div>

                  {/* Label */}
                  <div>
                    <Label htmlFor="variant-label">
                      التسمية (العرض) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="variant-label"
                      value={formData.label}
                      onChange={(e) =>
                        setFormData({ ...formData, label: e.target.value })
                      }
                      placeholder="مثال: 5 جرام - أخضر"
                    />
                  </div>

                  {/* Price */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="variant-price">
                        السعر (د.ع) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="variant-price"
                        type="number"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="variant-original-price">
                        السعر الأصلي (اختياري)
                      </Label>
                      <Input
                        id="variant-original-price"
                        type="number"
                        value={formData.originalPrice || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            originalPrice: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Stock */}
                  <div>
                    <Label htmlFor="variant-stock">المخزون</Label>
                    <Input
                      id="variant-stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({ ...formData, stock: Number(e.target.value) })
                      }
                    />
                  </div>

                  {/* Image Selector */}
                  <div>
                    <ImageSelector
                      images={productImages}
                      selectedImage={formData.image || ""}
                      onSelect={(imageUrl) =>
                        setFormData({ ...formData, image: imageUrl })
                      }
                      onImageDragStart={handleImageDragStart}
                      onImageDragEnd={handleImageDragEnd}
                      label="اختر صورة المتغير (اختياري)"
                    />
                  </div>

                  {/* Is Default */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="variant-default"
                      checked={formData.isDefault}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isDefault: !!checked })
                      }
                    />
                    <Label htmlFor="variant-default" className="cursor-pointer">
                      جعل هذا الخيار افتراضياً (الأكثر شعبية)
                    </Label>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    <X className="w-4 h-4 mr-2" />
                    إلغاء
                  </Button>
                  <Button onClick={handleSaveVariant}>
                    <Save className="w-4 h-4 mr-2" />
                    حفظ الخيار
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}
