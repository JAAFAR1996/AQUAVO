import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductImageGalleryProps {
    images: string[];
    productName: string;
    className?: string;
}

export function ProductImageGallery({
    images,
    productName,
    className,
}: ProductImageGalleryProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);
    const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const imageRef = useRef<HTMLDivElement>(null);

    // Ensure we have at least one image
    const galleryImages = images && images.length > 0 && images[0] ? images.filter(img => img && img.length > 0) : ["/placeholder-product.svg"];
    const currentImage = galleryImages[selectedIndex] || "/placeholder-product.svg";

    const handlePrevious = useCallback(() => {
        setSelectedIndex((prev) =>
            prev === 0 ? galleryImages.length - 1 : prev - 1
        );
    }, [galleryImages.length]);

    const handleNext = useCallback(() => {
        setSelectedIndex((prev) =>
            prev === galleryImages.length - 1 ? 0 : prev + 1
        );
    }, [galleryImages.length]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!imageRef.current || !isZoomed) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setZoomPosition({ x, y });
    }, [isZoomed]);

    const handleMouseEnter = () => setIsZoomed(true);
    const handleMouseLeave = () => setIsZoomed(false);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft") handlePrevious();
        if (e.key === "ArrowRight") handleNext();
        if (e.key === "Escape") setLightboxOpen(false);
    }, [handlePrevious, handleNext]);

    return (
        <div className={cn("space-y-4", className)} onKeyDown={handleKeyDown} tabIndex={0}>
            {/* Main Image with Zoom */}
            <div className="relative group">
                <div
                    ref={imageRef}
                    className="relative aspect-square bg-gradient-to-br from-white/5 to-transparent rounded-2xl overflow-hidden cursor-zoom-in border border-white/10"
                    onMouseMove={handleMouseMove}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => setLightboxOpen(true)}
                >
                    {/* Main Image */}
                    <img
                        src={currentImage}
                        alt={`${productName} - صورة ${selectedIndex + 1}`}
                        className={cn(
                            "w-full h-full object-contain p-4 transition-transform duration-300",
                            isZoomed && "scale-150"
                        )}
                        style={isZoomed ? {
                            transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
                        } : undefined}
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== "/placeholder-product.svg") {
                                target.src = "/placeholder-product.svg";
                            }
                        }}
                    />

                    {/* Zoom Icon Indicator */}
                    <div className={cn(
                        "absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-opacity",
                        isZoomed ? "opacity-0" : "opacity-100"
                    )}>
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>اضغط للتكبير</span>
                    </div>

                    {/* Navigation Arrows */}
                    {galleryImages.length > 1 && (
                        <>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrevious();
                                }}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNext();
                                }}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </>
                    )}

                    {/* Image Counter */}
                    {galleryImages.length > 1 && (
                        <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded-full text-xs">
                            {selectedIndex + 1} / {galleryImages.length}
                        </div>
                    )}
                </div>
            </div>

            {/* Thumbnails */}
            {galleryImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {galleryImages.map((image, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedIndex(index)}
                            className={cn(
                                "relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all",
                                selectedIndex === index
                                    ? "border-primary ring-2 ring-primary/30"
                                    : "border-transparent hover:border-muted-foreground/30"
                            )}
                        >
                            <img
                                src={image}
                                alt={`${productName} - صورة مصغرة ${index + 1}`}
                                className="w-full h-full object-contain bg-transparent p-1"
                                loading="lazy"
                            />
                            {selectedIndex === index && (
                                <div className="absolute inset-0 bg-primary/10" />
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Lightbox Modal */}
            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
                    <div className="relative w-full h-full min-h-[70vh] flex items-center justify-center">
                        {/* Close Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
                            onClick={() => setLightboxOpen(false)}
                        >
                            <X className="w-6 h-6" />
                        </Button>

                        {/* Main Image */}
                        <img
                            src={currentImage}
                            alt={productName}
                            className="max-w-full max-h-[85vh] object-contain"
                        />

                        {/* Navigation in Lightbox */}
                        {galleryImages.length > 1 && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 w-12 h-12"
                                    onClick={handlePrevious}
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 w-12 h-12"
                                    onClick={handleNext}
                                >
                                    <ChevronRight className="w-8 h-8" />
                                </Button>
                            </>
                        )}

                        {/* Thumbnails in Lightbox */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-lg">
                            {galleryImages.map((image, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedIndex(index)}
                                    className={cn(
                                        "w-12 h-12 rounded overflow-hidden border-2 transition-all",
                                        selectedIndex === index
                                            ? "border-white"
                                            : "border-transparent opacity-60 hover:opacity-100"
                                    )}
                                >
                                    <img
                                        src={image}
                                        alt={`صورة ${index + 1}`}
                                        className="w-full h-full object-contain bg-transparent"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
