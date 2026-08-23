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
    /**
     * Preview prototype only: unique view-transition-name for the main hero
     * image, so a card → PDP shared-image transition can target it. Inert
     * (undefined) in the normal experience.
     */
    heroTransitionName?: string;
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

    // Ensure we have at least one image
    const galleryImages = images && images.length > 0 ? images.filter(img => img && img.length > 0) : [];
    const currentImage = galleryImages[selectedIndex] || "";

    const handlePrevious = useCallback(() => {
        setImageFailed(false);
        setSelectedIndex((prev) =>
            prev === 0 ? galleryImages.length - 1 : prev - 1
        );
    }, [galleryImages.length]);

    const handleNext = useCallback(() => {
        setImageFailed(false);
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

    // RTL note: this UI reads right-to-left, so "next" (forward in reading
    // direction) is mirrored to the left and "previous" to the right — matching
    // the ChevronRight=previous / ChevronLeft=next convention used elsewhere in
    // this app (see customers-management.tsx pagination). Arrow keys mirror the
    // on-screen position: Left key = next (visually left), Right key = previous.
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
            {/* Keep the image useful on mobile without letting it consume the whole
                first viewport. From sm upward the original square gallery remains. */}
            <div className="relative group" data-protected="true">
                <div
                    ref={imageRef}
                    className="relative mx-auto h-[72vw] min-h-[260px] max-h-[320px] max-w-lg cursor-zoom-in overflow-hidden sm:aspect-square sm:h-auto sm:min-h-0 sm:max-h-none"
                    onMouseMove={handleMouseMove}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => {
                        if (galleryImages.length > 0 && !imageFailed) {
                            setLightboxOpen(true);
                        }
                    }}
                >
                    {/* Main Image */}
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
                                    // Preview prototype: unique per-product name so
                                    // native View Transitions morph card → PDP hero.
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
                                    // First retry: try raw URL without cloudinary transform
                                    if (!target.dataset.retried && target.src !== currentImage) {
                                        target.dataset.retried = "1";
                                        target.src = currentImage;
                                    } else {
                                        setImageFailed(true);
                                    }
                                }}
                            />

                            {/* Zoom Icon Indicator */}
                            <div className={cn(
                                "absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-black/60 text-foreground dark:text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-opacity",
                                isZoomed ? "opacity-0" : "opacity-100"
                            )}>
                                <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>اضغط للتكبير</span>
                            </div>
                        </>
                    )}

                    {/* Navigation Arrows — always visible on touch devices (no hover
                        state to reveal them), fade in on hover for mouse users. RTL:
                        previous sits on the right (ChevronRight), next on the left
                        (ChevronLeft), matching this app's RTL pagination convention. */}
                    {galleryImages.length > 1 && !imageFailed && (
                        <>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg h-11 w-11 md:h-11 md:w-11"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrevious();
                                }}
                                aria-label="الصورة السابقة"
                            >
                                <ChevronRight className="w-5 h-5" aria-hidden="true" />
                            </Button>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg h-11 w-11 md:h-11 md:w-11"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNext();
                                }}
                                aria-label="الصورة التالية"
                            >
                                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                            </Button>
                        </>
                    )}

                    {/* Image Counter */}
                    {galleryImages.length > 1 && !imageFailed && (
                        <div
                            className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-black/60 text-foreground dark:text-white px-2 py-1 rounded-full text-xs"
                            aria-live="polite"
                        >
                            {selectedIndex + 1} / {galleryImages.length}
                        </div>
                    )}
                </div>
            </div>

            {/* Thumbnails */}
            {galleryImages.length > 1 && (
                <div
                    className="flex gap-2 overflow-x-auto pb-1 sm:pb-2 scrollbar-thin"
                    role="group"
                    aria-label={`صور مصغرة لـ ${productName}`}
                >
                    {galleryImages.map((image) => (
                        <button
                            key={image}
                            type="button"
                            onClick={() => {
                                setImageFailed(false);
                                setSelectedIndex(galleryImages.indexOf(image));
                            }}
                            aria-pressed={selectedIndex === galleryImages.indexOf(image)}
                            aria-label={`عرض الصورة ${galleryImages.indexOf(image) + 1}`}
                            className={cn(
                                "relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                selectedIndex === galleryImages.indexOf(image)
                                    ? "border-primary ring-2 ring-primary/30"
                                    : "border-transparent hover:border-muted-foreground/30"
                            )}
                        >
                            <img
                                src={thumbImage(image)}
                                alt={`${productName} - صورة مصغرة ${galleryImages.indexOf(image) + 1}`}
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
                            {selectedIndex === galleryImages.indexOf(image) && (
                                <div className="absolute inset-0 bg-primary/10" />
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Lightbox Modal */}
            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
                    {/* Visually hidden — Radix requires a title/description for
                        screen reader users; the visible UI conveys this via the
                        close button and image alt text instead. */}
                    <DialogTitle className="sr-only">{`صورة ${productName}`}</DialogTitle>
                    <DialogDescription className="sr-only">
                        عرض مكبّر لصور {productName}، استخدم الأسهم للتنقل بين الصور و Escape للإغلاق
                    </DialogDescription>
                    <div className="relative w-full h-full min-h-[70vh] flex items-center justify-center">
                        {/* Close Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 z-50 text-foreground dark:text-white hover:bg-white/20 h-11 w-11 md:h-11 md:w-11"
                            onClick={() => setLightboxOpen(false)}
                            aria-label="إغلاق معرض الصور"
                        >
                            <X className="w-6 h-6" aria-hidden="true" />
                        </Button>

                        {/* Main Image */}
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

                        {/* Navigation in Lightbox — RTL: previous on the right
                            (ChevronRight), next on the left (ChevronLeft). */}
                        {galleryImages.length > 1 && !imageFailed && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground dark:text-white hover:bg-white/20 w-12 h-12 md:h-12 md:w-12"
                                    onClick={handlePrevious}
                                    aria-label="الصورة السابقة"
                                >
                                    <ChevronRight className="w-8 h-8" aria-hidden="true" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground dark:text-white hover:bg-white/20 w-12 h-12 md:h-12 md:w-12"
                                    onClick={handleNext}
                                    aria-label="الصورة التالية"
                                >
                                    <ChevronLeft className="w-8 h-8" aria-hidden="true" />
                                </Button>
                            </>
                        )}

                        {/* Thumbnails in Lightbox */}
                        {galleryImages.length > 1 && (
                            <div
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-lg"
                                role="group"
                                aria-label={`صور مصغرة لـ ${productName}`}
                            >
                                {galleryImages.map((image) => (
                                    <button
                                        key={image}
                                        type="button"
                                        onClick={() => {
                                            setImageFailed(false);
                                            setSelectedIndex(galleryImages.indexOf(image));
                                        }}
                                        aria-pressed={selectedIndex === galleryImages.indexOf(image)}
                                        aria-label={`عرض الصورة ${galleryImages.indexOf(image) + 1}`}
                                        className={cn(
                                            "w-12 h-12 rounded overflow-hidden border-2 transition-all",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                                            selectedIndex === galleryImages.indexOf(image)
                                                ? "border-white"
                                                : "border-transparent opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        <img
                                            src={thumbImage(image)}
                                            alt={`صورة ${galleryImages.indexOf(image) + 1}`}
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