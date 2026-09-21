import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ImageZoomProps {
    src: string;
    alt: string;
    className?: string;
    zoomScale?: number;
}

/**
 * صورة مع تكبير عند تحريك الماوس
 * 
 * @example
 * <ImageZoom 
 *   src="/products/aquarium.jpg" 
 *   alt="حوض سمك" 
 *   zoomScale={2.5}
 * />
 */
export function ImageZoom({
    src,
    alt,
    className,
    zoomScale = 2
}: ImageZoomProps) {
    const [isZooming, setIsZooming] = useState(false);
    const [position, setPosition] = useState({ x: 50, y: 50 });
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setPosition({ x, y });
    }, []);

    const handleMouseEnter = useCallback(() => {
        setIsZooming(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsZooming(false);
        setPosition({ x: 50, y: 50 });
    }, []);

    // للأجهزة اللمسية
    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;

        const touch = e.touches[0];
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / rect.width) * 100;
        const y = ((touch.clientY - rect.top) / rect.height) * 100;

        setPosition({
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y))
        });
    }, []);

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative overflow-hidden cursor-zoom-in rounded-lg",
                className
            )}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleMouseEnter}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseLeave}
        >
            {/* الصورة الأصلية */}
            <img
                src={src}
                alt={alt}
                className={cn(
                    "w-full h-full object-contain transition-opacity duration-200",
                    isZooming && "opacity-0"
                )}
                loading="lazy"
            />

            {/* الصورة المكبرة */}
            <div
                className={cn(
                    "absolute inset-0 transition-opacity duration-200",
                    isZooming ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                style={{
                    backgroundImage: `url(${src})`,
                    backgroundPosition: `${position.x}% ${position.y}%`,
                    backgroundSize: `${zoomScale * 100}%`,
                    backgroundRepeat: "no-repeat",
                }}
                aria-hidden="true"
            />

            {/* مؤشر التكبير */}
            {!isZooming && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 pointer-events-none">
                    <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                        />
                    </svg>
                    <span>حرّك للتكبير</span>
                </div>
            )}
        </div>
    );
}

interface ImageZoomModalProps {
    src: string;
    alt: string;
    isOpen: boolean;
    onClose: () => void;
}

/**
 * نافذة منبثقة لعرض الصورة المكبرة بالكامل
 */
export function ImageZoomModal({ src, alt, isOpen, onClose }: ImageZoomModalProps) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const lastPosition = useRef({ x: 0, y: 0 });

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(prev => Math.max(0.5, Math.min(5, prev + delta)));
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (scale > 1) {
            setIsDragging(true);
            lastPosition.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        }
    }, [scale, position]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - lastPosition.current.x,
                y: e.clientY - lastPosition.current.y,
            });
        }
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const resetZoom = useCallback(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, []);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={onClose}
        >
            {/* أزرار التحكم */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(5, s + 0.5)); }}
                    className="p-2 bg-card/20 hover:bg-white/30 rounded-full transition-colors"
                    aria-label="تكبير"
                >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(0.5, s - 0.5)); }}
                    className="p-2 bg-card/20 hover:bg-white/30 rounded-full transition-colors"
                    aria-label="تصغير"
                >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                    </svg>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); resetZoom(); }}
                    className="p-2 bg-card/20 hover:bg-white/30 rounded-full transition-colors"
                    aria-label="إعادة تعيين"
                >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
                <button
                    onClick={onClose}
                    className="p-2 bg-card/20 hover:bg-white/30 rounded-full transition-colors"
                    aria-label="إغلاق"
                >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* الصورة */}
            <img
                src={src}
                alt={alt}
                onClick={(e) => e.stopPropagation()}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={cn(
                    "max-w-[90vw] max-h-[90vh] object-contain transition-transform",
                    isDragging ? "cursor-grabbing" : scale > 1 ? "cursor-grab" : "cursor-zoom-in"
                )}
                style={{
                    transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                }}
                draggable={false}
            />

            {/* مؤشر النسبة */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                {Math.round(scale * 100)}%
            </div>
        </div>
    );
}
