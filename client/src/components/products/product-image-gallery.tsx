import { lazy, Suspense, useState, useRef, useCallback, useEffect, type CSSProperties } from "react";
import type { UseEmblaCarouselType } from "embla-carousel-react";
import { useLocale } from "@/i18n/locale-context";
import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { detailImage, detailImageSrcSet, thumbImage, lightboxImage } from "@/lib/cloudinary";
import { useTranslation } from "react-i18next";

const GalleryCarouselController = lazy(() => import("./gallery-carousel-controller").catch(() => ({ default: () => null })));

interface ProductImageGalleryProps {
    images: string[];
    productName: string;
    className?: string;
    heroTransitionName?: string;
}

function isHouyiBlueDragonStoneProduct(productName: string): boolean {
    return (
        productName.includes("حجر التنين الأزرق") ||
        productName.includes("دراقون ستون") ||
        productName.includes("دراجون ستون")
    );
}

function buildGalleryImages(images: string[]): string[] {
    const sourceImages = images && images.length > 0
        ? images.filter((image) => image && image.length > 0)
        : [];

    // Respect curated per-option order; do not rotate by product name.
    return sourceImages;
}

export function ProductImageGallery({
    images,
    productName,
    className,
    heroTransitionName,
}: ProductImageGalleryProps) {
    const { t } = useTranslation("product");
    const { dir } = useLocale();
    const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
    const [carousel, setCarousel] = useState<UseEmblaCarouselType[1]>();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
    const [isZoomed, setIsZoomed] = useState(false);
    const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const imageRef = useRef<HTMLDivElement>(null);

    const galleryImages = buildGalleryImages(images);
    const galleryKey = galleryImages.join("\u0000");
    useEffect(() => {
        setFailedImages(new Set());
        setSelectedIndex(0);
        setIsZoomed(false);
        setLightboxOpen(false);
    }, [galleryKey]);

    useEffect(() => { carousel?.scrollTo(0, true); }, [galleryKey]);

    // Preserve a button/keyboard choice made before the enhancement finishes loading.
    useEffect(() => { carousel?.scrollTo(selectedIndex, true); }, [carousel]);

    useEffect(() => {
        if (!carousel) return;
        const sync = () => {
            setSelectedIndex(carousel.selectedScrollSnap());
            setIsZoomed(false);
        };
        carousel.on("select", sync);
        return () => { carousel.off("select", sync); };
    }, [carousel]);

    const selectImage = useCallback((index: number) => {
        setIsZoomed(false);
        setSelectedIndex(index);
        carousel?.scrollTo(index);
    }, [carousel]);
    const currentImage = galleryImages[selectedIndex] || "";
    const imageFailed = failedImages.has(currentImage);
    const preserveOriginalQuality = isHouyiBlueDragonStoneProduct(productName);
    const fullImageSrc = preserveOriginalQuality ? currentImage : lightboxImage(currentImage);

    useEffect(() => {
        if (!imageFailed) return;
        const next = galleryImages.findIndex(image => !failedImages.has(image));
        if (next >= 0) selectImage(next);
    }, [imageFailed, failedImages, galleryKey, selectImage]);

    const handlePrevious = useCallback(() => {
        if (galleryImages.length) selectImage((selectedIndex - 1 + galleryImages.length) % galleryImages.length);
    }, [galleryImages.length, selectedIndex, selectImage]);

    const handleNext = useCallback(() => {
        if (galleryImages.length) selectImage((selectedIndex + 1) % galleryImages.length);
    }, [galleryImages.length, selectedIndex, selectImage]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!imageRef.current || !isZoomed) return;
        const rect = imageRef.current.getBoundingClientRect();
        setZoomPosition({
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
        });
    }, [isZoomed]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const next = dir === "rtl" ? e.key === "ArrowLeft" : e.key === "ArrowRight";
            if (next) handleNext(); else handlePrevious();
        }
        // Native child buttons keep their own Enter/Space behavior.
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            if (galleryImages.length > 0 && !imageFailed) {
                e.preventDefault();
                setLightboxOpen(true);
            }
        }
        if (e.key === "Escape") setLightboxOpen(false);
    }, [handlePrevious, handleNext, galleryImages.length, imageFailed, dir]);

    return (
        <div
            className={cn("space-y-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:space-y-4", className)}
            dir={dir}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="group"
            aria-roledescription={t("gallery.roleDescription")}
            aria-label={t("gallery.label", { name: productName })}
        >
            <div className="relative group" data-protected="true">
                <div
                    ref={imageRef}
                    className="relative mx-auto h-[72vw] min-h-[260px] max-h-[320px] max-w-lg cursor-zoom-in overflow-hidden sm:aspect-square sm:h-auto sm:min-h-0 sm:max-h-none"
                    onMouseMove={handleMouseMove}
                    onMouseEnter={() => setIsZoomed(window.matchMedia("(hover: hover) and (pointer: fine)").matches)}
                    onMouseLeave={() => setIsZoomed(false)}
                    onClick={() => {
                        if (galleryImages.length > 0 && !imageFailed) setLightboxOpen(true);
                    }}
                >
                    {galleryImages.length === 0 ? (
                        <div className="w-full h-full min-h-[260px] sm:min-h-[350px] flex flex-col items-center justify-center bg-card dark:bg-[#0B1E28]/40 border border-white/5 rounded-lg p-6 text-center select-none">
                            <span className="text-sm text-muted-foreground/80 font-medium font-cairo">{t("gallery.unavailable")}</span>
                        </div>
                    ) : (
                        <>
                            <div ref={setViewport} className="h-full overflow-hidden" data-testid="product-gallery-viewport" data-swipe-ready={Boolean(carousel)}>
                              <div className={cn("flex h-full touch-pan-y touch-pinch-zoom", !carousel && "[transform:translateX(var(--gallery-offset))]")}
                                style={{ "--gallery-offset": `${(dir === "rtl" ? 1 : -1) * selectedIndex * 100}%` } as CSSProperties}>
                                {galleryImages.map((image, index) => (
                                  <div key={`${image}-${index}`} className="min-w-0 flex-[0_0_100%]" aria-hidden={index !== selectedIndex}>
                            {failedImages.has(image) ? (
                                <div className="flex h-full items-center justify-center bg-card p-6 text-center text-sm text-muted-foreground">{t("gallery.unavailable")}</div>
                            ) : <img
                                key={image}
                                src={index === 0 || Math.abs(index - selectedIndex) <= 1 ? (preserveOriginalQuality ? image : detailImage(image)) : undefined}
                                srcSet={!preserveOriginalQuality && (index === 0 || Math.abs(index - selectedIndex) <= 1) ? detailImageSrcSet(image) : undefined}
                                sizes="(max-width: 512px) 100vw, 512px"
                                alt={t("gallery.imageAlt", { name: productName, index: index + 1 })}
                                className={cn(
                                    "w-full h-full object-contain transition-transform duration-300 motion-reduce:transition-none p-3 sm:p-4 select-none",
                                    isZoomed && index === selectedIndex && "scale-110 motion-reduce:scale-100"
                                )}
                                data-aqv-hero={index === 0 && selectedIndex === 0 ? heroTransitionName || undefined : undefined}
                                style={{
                                    viewTransitionName: index === 0 && selectedIndex === 0 ? heroTransitionName : undefined,
                                    ...(isZoomed && index === selectedIndex ? { transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` } : {}),
                                }}
                                loading={index === 0 ? "eager" : "lazy"}
                                decoding="async"
                                fetchPriority={index === 0 ? "high" : "auto"}
                                draggable={false}
                                onContextMenu={(e) => e.preventDefault()}
                                onDragStart={(e) => e.preventDefault()}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (!target.dataset.retried && target.src !== image) {
                                        target.dataset.retried = "1";
                                        target.removeAttribute("srcset");
                                        target.src = image;
                                    } else {
                                        setFailedImages(previous => new Set(previous).add(image));
                                    }
                                }}
                            />}
                                  </div>
                                ))}
                              </div>
                            </div>
                            {!imageFailed && <div className={cn(
                                "absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-opacity",
                                isZoomed ? "opacity-0" : "opacity-100"
                            )}>
                                <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t("gallery.zoom")}</span>
                            </div>}
                        </>
                    )}

                    {galleryImages.length > 1 && !imageFailed && (
                        <>
                            <Button
                                variant="secondary"
                                size="icon"
                                className={cn("absolute top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 transition-opacity motion-reduce:transition-none shadow-lg h-11 w-11", dir === "rtl" ? "right-2" : "left-2")}
                                onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                                aria-label={t("gallery.prev")}
                            >
                                <ChevronRight className={cn("w-5 h-5", dir === "ltr" && "rotate-180")} aria-hidden="true" />
                            </Button>
                            <Button
                                variant="secondary"
                                size="icon"
                                className={cn("absolute top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 transition-opacity motion-reduce:transition-none shadow-lg h-11 w-11", dir === "rtl" ? "left-2" : "right-2")}
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                aria-label={t("gallery.next")}
                            >
                                <ChevronLeft className={cn("w-5 h-5", dir === "ltr" && "rotate-180")} aria-hidden="true" />
                            </Button>
                            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-black/60 text-white px-2 py-1 rounded-full text-xs" aria-live="polite">
                                {selectedIndex + 1} / {galleryImages.length}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {galleryImages.length > 1 && viewport && (
                <Suspense fallback={null}>
                    <GalleryCarouselController viewport={viewport} dir={dir} initialIndex={selectedIndex} onReady={setCarousel} />
                </Suspense>
            )}

            {galleryImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-2 scrollbar-thin" role="group" aria-label={t("gallery.thumbs", { name: productName })}>
                    {galleryImages.map((image, index) => (
                        <button
                            key={`${image}-${index}`}
                            type="button"
                            onClick={() => selectImage(index)}
                            aria-pressed={selectedIndex === index}
                            aria-label={t("gallery.showImage", { index: index + 1 })}
                            className={cn(
                                "relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                selectedIndex === index ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"
                            )}
                        >
                            <img
                                src={thumbImage(image)}
                                alt={t("gallery.thumbAlt", { name: productName, index: index + 1 })}
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
                <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none [&>button]:hidden">
                    <DialogTitle className="sr-only">{t("gallery.dialogTitle", { name: productName })}</DialogTitle>
                    <DialogDescription className="sr-only">
                        {t("gallery.dialogDescription", { name: productName })}
                    </DialogDescription>
                    <div className="relative w-full h-full min-h-[70vh] flex items-center justify-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 z-50 text-white hover:text-white hover:bg-white/20 h-11 w-11"
                            onClick={() => setLightboxOpen(false)}
                            aria-label={t("gallery.close")}
                        >
                            <X className="w-6 h-6" aria-hidden="true" />
                        </Button>

                        {imageFailed || galleryImages.length === 0 ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none text-white">
                                <span className="text-lg font-medium font-cairo">{t("gallery.unavailable")}</span>
                            </div>
                        ) : (
                            <img
                                src={fullImageSrc}
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
                                    className={cn("absolute top-1/2 -translate-y-1/2 text-white hover:text-white hover:bg-white/20 w-12 h-12", dir === "rtl" ? "right-4" : "left-4")}
                                    onClick={handlePrevious}
                                    aria-label={t("gallery.prev")}
                                >
                                    <ChevronRight className={cn("w-8 h-8", dir === "ltr" && "rotate-180")} aria-hidden="true" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn("absolute top-1/2 -translate-y-1/2 text-white hover:text-white hover:bg-white/20 w-12 h-12", dir === "rtl" ? "left-4" : "right-4")}
                                    onClick={handleNext}
                                    aria-label={t("gallery.next")}
                                >
                                    <ChevronLeft className={cn("w-8 h-8", dir === "ltr" && "rotate-180")} aria-hidden="true" />
                                </Button>
                            </>
                        )}

                        {galleryImages.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-lg max-w-[80vw] overflow-x-auto" role="group" aria-label={t("gallery.thumbnailsFor", { name: productName })}>
                                {galleryImages.map((image, index) => (
                                    <button
                                        key={`lightbox-${image}-${index}`}
                                        type="button"
                                        onClick={() => selectImage(index)}
                                        aria-pressed={selectedIndex === index}
                                        aria-label={t("gallery.showImage", { index: index + 1 })}
                                        className={cn(
                                            "w-12 h-12 flex-shrink-0 rounded overflow-hidden border-2 transition-all",
                                            selectedIndex === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        <img
                                            src={thumbImage(image)}
                                            alt={t("gallery.plainAlt", { index: index + 1 })}
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
