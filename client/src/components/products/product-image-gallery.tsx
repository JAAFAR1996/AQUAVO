import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { detailImage, detailImageSrcSet, thumbImage, lightboxImage } from "@/lib/cloudinary";

interface ProductImageGalleryProps {
    images: string[];
    productName: string;
    className?: string;
    heroTransitionName?: string;
}

function buildGalleryImages(images: string[], productName: string): string[] {
    const sourceImages = images && images.length > 0
        ? images.filter((image) => image && image.length > 0)
        : [];

    const isHouyiBlueDragonStone =
        productName.includes("حجر التنين الأزرق") ||
        productName.includes("دراقون ستون") ||
        productName.includes("دراجون ستون");

    if (!isHouyiBlueDragonStone || sourceImages.length < 2) return sourceImages;

    // The first supplier image is the scale/ruler shot. Keep only the real
    // product photos and move that scale image to the end so the gallery opens
    // with a cleaner product view, then shows the remaining angle, then scale.
    return [...sourceImages.slice(1), sourceImages[0]];
}

export function ProductImageGallery({
    images,
    productName,
    className,
    heroTransitionName,
}: ProductImageGalleryProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [imageFailed, setImageFailed] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);
    const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const imageRef = useRef<HTMLDivElement>(null);

    const galleryImages = buildGalleryImages(images, productName);
    const currentImage = galleryImages[selectedIndex] || "";

    const handlePrevious = useCallback(() => {
        setImageFailed(false);
        setSelectedIndex((prev) => prev === 0 ? galleryImages.length - 1 : prev - 1);
    }, [galleryImages.length]);

    const handleNext = useCallback(() => {
        setImageFailed(false);
        setSelectedIndex((prev) => prev === galleryImages.length - 1 ? 0 : prev + 1);
    }, [galleryImages.length]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!imageRef.current || !isZoomed) return;
        const rect = imageRef.current.getBoundingClientRect();
        setZoomPosition({
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
        });
    }, [isZoomed]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft") handleNext();
        if (e.key === "ArrowRight") handlePrevious();
        if (e.key === "Enter" || e.key === " ") {
            if (galleryImages.length > 0 && !imageFailed) {
                e.preventDefault();
                setLightboxOpen(true);
            }
        }
        if (e.key === "Escape") setLightboxOpen(false);
    }, [handlePrevious, handleNext, galleryImages.length, imageFailed]);

    return (
        <div
            className={cn("space-y-2 sm:space-y-4", className)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="group"
            aria-roledescription="معرض صور"
            aria-label={`معرض صور ${productName} — استخدم مفاتيح الأسهم للتنقل و Enter للتكبير`}
        >
            <div className="relative group" data-protected="true">
                <div
                    ref={imageRef}
                    className="relative mx-auto h-[72vw] min-h-[260px] max-h-[320px] max-w-lg cursor-zoom-in overflow-hidden sm:aspect-square sm:h-auto sm:min-h-0 sm:max-h-none"
                    onMouseMove={handleMouseMove}
                    onMouseEnter={() => setIsZoomed(true)}
                    onMouseLeave={() => setIsZoomed(false)}
                    onClick={() => {
                        if (galleryImages.length > 0 && !imageFailed) setLightboxOpen(true);
                    }}
                >
                    {galleryImages.length === 0 || imageFailed ? (
                        <div className="w-full h-full min-h-[260px] sm:min-h-[350px] flex flex-col items-center justify-center bg-card dark:bg-[#0B1E28]/40 border border-white/5 rounded-lg p-6 text-center select-none">
                            <span className="text-sm text-muted-foreground/80 font-medium font-cairo">الصورة غير متوفرة</span>
                        </div>
                    ) : (
                        <>
                            <img
                                src={detailImage(currentImage)}
                                srcSet={detailImageSrcSet(currentImage)}
                                sizes="(max-width: 512px) 100vw, 512px"
                                alt={`${productName} - صورة ${selectedIndex + 1}`}
                                className={cn(
                                    "w-full h-full object-contain transition-transform duration-300 p-3 sm:p-4 select-none",
                                    isZoomed && "scale-110"
                                )}
                                data-aqv-hero={selectedIndex === 0 ? heroTransitionName || undefined : undefined}
                                style={{
                                    viewTransitionName: selectedIndex === 0 ? heroTransitionName : undefined,
                                    ...(isZoomed ? { transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` } : {}),
                                }}
                                loading="eager"
                                decoding="async"
                                fetchPriority="high"
                                draggable={false}
                                onContextMenu={(e) => e.preventDefault()}
                                onDragStart={(e) => e.preventDefault()}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (!target.dataset.retried && target.src !== currentImage) {
                                        target.dataset.retried = "1";
                                        target.src = currentImage;
                                    } else {
                                        setImageFailed(true);
                                    }
                                }}
                            />
                            <div className={cn(
                                "absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-black/60 text-foreground dark:text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-opacity",
                                isZoomed ? "opacity-0" : "opacity-100"
                            )}>
                                <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>اضغط للتكبير</span>
                            </div>
                        </>
                    )}

                    {galleryImages.length > 1 && !imageFailed && (
                        <>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg h-11 w-11"
                                onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                                aria-label="الصورة السابقة"
                            >
                                <ChevronRight className="w-5 h-5" aria-hidden="true" />
                            </Button>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg h-11 w-11"
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                aria-label="الصورة التالية"
                            >
                                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                            </Button>
                            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-black/60 text-foreground dark:text-white px-2 py-1 rounded-full text-xs" aria-live="polite">
                                {selectedIndex + 1} / {galleryImages.length}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {galleryImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-2 scrollbar-thin" role="group" aria-label={`صور مصغرة لـ ${productName}`}>
                    {galleryImages.map((image, index) => (
                        <button
                            key={`${image}-${index}`}
                            type="button"
                            onClick={() => { setImageFailed(false); setSelectedIndex(index); }}
                            aria-pressed={selectedIndex === index}
                            aria-label={`عرض الصورة ${index + 1}`}
                            className={cn(
                                "relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                selectedIndex === index ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"
                            )}
                        >
                            <img
                                src={thumbImage(image)}
                                alt={`${productName} - صورة مصغرة ${index + 1}`}
                                className="w-full h-full object-contain bg-transparent p-1"
                                loading="lazy"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (!target.dataset.retried && target.src !== image) {
                                        target.dataset.retried = "1";
                                        target.src = image;
                                    } else {
                                        target.style.display = "none";
                                    }
                                }}
                            />
                            {selectedIndex === index && <div className="absolute inset-0 bg-primary/10" />}
                        </button>
                    ))}
                </div>
            )}

            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
                    <DialogTitle className="sr-only">{`صورة ${productName}`}</DialogTitle>
                    <DialogDescription className="sr-only">
                        عرض مكبّر لصور {productName}، استخدم الأسهم للتنقل بين الصور و Escape للإغلاق
                    </DialogDescription>
                    <div className="relative w-full h-full min-h-[70vh] flex items-center justify-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 z-50 text-foreground dark:text-white hover:bg-white/20 h-11 w-11"
                            onClick={() => setLightboxOpen(false)}
                            aria-label="إغلاق معرض الصور"
                        >
                            <X className="w-6 h-6" aria-hidden="true" />
                        </Button>

                        {imageFailed || galleryImages.length === 0 ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none text-foreground dark:text-white">
                                <span className="text-lg font-medium font-cairo">الصورة غير متوفرة</span>
                            </div>
                        ) : (
                            <img
                                src={lightboxImage(currentImage)}
                                alt={productName}
                                className="max-w-full max-h-[85vh] object-contain select-none"
                                draggable={false}
                                onContextMenu={(e) => e.preventDefault()}
                                onDragStart={(e) => e.preventDefault()}
                            />
                        )}

                        {galleryImages.length > 1 && !imageFailed && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground dark:text-white hover:bg-white/20 w-12 h-12"
                                    onClick={handlePrevious}
                                    aria-label="الصورة السابقة"
                                >
                                    <ChevronRight className="w-8 h-8" aria-hidden="true" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground dark:text-white hover:bg-white/20 w-12 h-12"
                                    onClick={handleNext}
                                    aria-label="الصورة التالية"
                                >
                                    <ChevronLeft className="w-8 h-8" aria-hidden="true" />
                                </Button>
                            </>
                        )}

                        {galleryImages.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-lg max-w-[80vw] overflow-x-auto" role="group" aria-label={`صور مصغرة لـ ${productName}`}>
                                {galleryImages.map((image, index) => (
                                    <button
                                        key={`lightbox-${image}-${index}`}
                                        type="button"
                                        onClick={() => { setImageFailed(false); setSelectedIndex(index); }}
                                        aria-pressed={selectedIndex === index}
                                        aria-label={`عرض الصورة ${index + 1}`}
                                        className={cn(
                                            "w-12 h-12 flex-shrink-0 rounded overflow-hidden border-2 transition-all",
                                            selectedIndex === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        <img
                                            src={thumbImage(image)}
                                            alt={`صورة ${index + 1}`}
                                            className="w-full h-full object-contain bg-transparent"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                if (!target.dataset.retried && target.src !== image) {
                                                    target.dataset.retried = "1";
                                                    target.src = image;
                                                } else {
                                                    target.style.display = "none";
                                                }
                                            }}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
