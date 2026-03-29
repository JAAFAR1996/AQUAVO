import { useState } from "react";
import { Product } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Heart, Star, ExternalLink, Package, Leaf, X } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { useToast } from "@/hooks/use-toast";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { Link } from "wouter";

interface QuickViewModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
}

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
    const [selectedImage, setSelectedImage] = useState(0);
    const { addItem } = useCart();
    const { toast } = useToast();

    if (!product) return null;

    const images = product.images?.length ? product.images : [product.thumbnail];

    const handleAddToCart = () => {
        addItem(product);
        toast({
            title: "تمت الإضافة للسلة ✓",
            description: `تم إضافة ${product.name} إلى سلة المشتريات`,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden">
                <DialogHeader className="sr-only">
                    <DialogTitle>{product.name}</DialogTitle>
                </DialogHeader>

                <div className="grid md:grid-cols-2 gap-0">
                    {/* Image Section */}
                    <div className="bg-muted/30 p-6 relative">
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 hover:bg-background shadow-md transition-colors"
                            aria-label="إغلاق"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        {/* Badges */}
                        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                            {product.isNew && (
                                <Badge className="bg-blue-500 hover:bg-blue-600">جديد</Badge>
                            )}
                            {product.isBestSeller && (
                                <Badge className="bg-amber-500 hover:bg-amber-600">الأكثر مبيعاً</Badge>
                            )}
                            {product.ecoFriendly && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                    <Leaf className="w-3 h-3 ml-1" />
                                    صديق للبيئة
                                </Badge>
                            )}
                        </div>

                        {/* Main Image */}
                        <div className="aspect-square flex items-center justify-center">
                            <img
                                src={images[selectedImage]}
                                alt={product.name}
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>

                        {/* Thumbnail Gallery */}
                        {images.length > 1 && (
                            <div className="flex gap-2 mt-4 justify-center">
                                {images.slice(0, 4).map((img) => (
                                    <button
                                        key={img}
                                        onClick={() => setSelectedImage(images.indexOf(img))}
                                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${selectedImage === images.indexOf(img)
                                            ? "border-primary ring-2 ring-primary/30"
                                            : "border-border hover:border-primary/50"
                                            }`}
                                    >
                                        <img
                                            src={img}
                                            alt={`${product.name} - صورة ${images.indexOf(img) + 1}`}
                                            className="w-full h-full object-contain"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Info Section */}
                    <div className="p-6 flex flex-col text-right">
                        {/* Brand */}
                        <p className="text-sm text-muted-foreground mb-1">{product.brand}</p>

                        {/* Name */}
                        <h2 className="text-2xl font-bold mb-3">{product.name}</h2>

                        {/* Rating */}
                        <div className="flex items-center gap-2 justify-end mb-4">
                            <span className="text-muted-foreground">({product.reviewCount} تقييم)</span>
                            <span className="font-medium">{product.rating}</span>
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-3 justify-end mb-4">
                            <span className="text-3xl font-bold text-purple-500">
                                قريباً جداً ✨
                            </span>
                        </div>

                        <Separator className="my-4" />

                        {/* Stock Status */}
                        <div className="flex items-center gap-2 justify-end mb-4">
                            <Package className="h-4 w-4 text-green-500" />
                            <span className={`font-medium ${product.stock && product.stock > 0 ? "text-green-600" : "text-red-500"}`}>
                                {product.stock && product.stock > 0 ? `متوفر (${product.stock})` : "غير متوفر"}
                            </span>
                        </div>

                        {/* Description Preview */}
                        {product.specs && (
                            <p className="text-muted-foreground text-sm line-clamp-3 mb-6">
                                {product.specs}
                            </p>
                        )}

                        {/* Actions */}
                        <div className="mt-auto space-y-3">
                            <Button
                                size="lg"
                                className="w-full gap-2 text-lg h-14"
                                onClick={handleAddToCart}
                                disabled={!product.stock || product.stock <= 0}
                            >
                                <ShoppingCart className="h-5 w-5" />
                                أضف للسلة
                            </Button>

                            <div className="flex gap-3">
                                <WishlistButton product={product} className="flex-1" />
                                <Link href={`/products/${product.slug}`} className="flex-1">
                                    <Button variant="outline" size="lg" className="w-full gap-2">
                                        <ExternalLink className="h-4 w-4" />
                                        التفاصيل الكاملة
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
