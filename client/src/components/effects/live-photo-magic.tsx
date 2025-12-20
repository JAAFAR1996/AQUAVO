import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Bubble {
    id: number;
    x: number;
    y: number;
    size: number;
    delay: number;
}

interface LivePhotoMagicProps {
    src: string;
    alt: string;
    className?: string;
    /** CSS classes to apply directly to the img element (e.g., object-contain) */
    imageClassName?: string;
    bubbleCount?: number;
    enableRipple?: boolean;
    enableFloat?: boolean;
    /** If true, load image eagerly (for above-fold content) */
    priority?: boolean;
}

export function LivePhotoMagic({
    src,
    alt,
    className,
    imageClassName,
    bubbleCount = 6,
    enableRipple = true,
    enableFloat = true,
    priority = false,
}: LivePhotoMagicProps) {
    // Generate WebP URL from source
    const getWebPUrl = (url: string): string | undefined => {
        const ext = url.match(/\.(png|jpg|jpeg)$/i);
        if (ext) {
            return url.replace(/\.(png|jpg|jpeg)$/i, '.webp');
        }
        return undefined;
    };
    const webpSrc = getWebPUrl(src);
    const [isHovered, setIsHovered] = useState(false);
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const bubbleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Generate bubbles on hover
    useEffect(() => {
        // Clear any pending timeouts from previous render
        timeoutIdsRef.current.forEach(clearTimeout);
        timeoutIdsRef.current = [];

        if (isHovered) {
            const createBubble = () => {
                const newBubble: Bubble = {
                    id: Date.now() + Math.random(),
                    x: 10 + Math.random() * 80,
                    y: 100,
                    size: 4 + Math.random() * 8,
                    delay: Math.random() * 0.3,
                };
                setBubbles(prev => [...prev.slice(-bubbleCount * 2), newBubble]);
            };

            // Track all initial timeouts
            for (let i = 0; i < bubbleCount; i++) {
                const timeoutId = setTimeout(createBubble, i * 150);
                timeoutIdsRef.current.push(timeoutId);
            }

            bubbleIntervalRef.current = setInterval(createBubble, 400);

            return () => {
                // Clear all tracked timeouts
                timeoutIdsRef.current.forEach(clearTimeout);
                timeoutIdsRef.current = [];

                if (bubbleIntervalRef.current) {
                    clearInterval(bubbleIntervalRef.current);
                }
            };
        } else {
            setBubbles([]);
        }
    }, [isHovered, bubbleCount]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!enableRipple || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        if (Math.random() > 0.85) {
            setRipples(prev => [...prev.slice(-3), { id: Date.now(), x, y }]);
        }
    };

    return (
        <div
            ref={containerRef}
            className={cn("relative overflow-hidden rounded-xl", className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseMove={handleMouseMove}
        >
            {/* Water Glow Background */}
            <motion.div
                className="absolute inset-0 pointer-events-none z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.5 }}
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(6, 182, 212, 0.15) 0%, rgba(14, 165, 233, 0.1) 40%, transparent 70%)',
                }}
            />

            {/* Animated Bubbles */}
            <AnimatePresence>
                {bubbles.map(bubble => (
                    <motion.div
                        key={bubble.id}
                        className="absolute rounded-full pointer-events-none z-20"
                        initial={{
                            opacity: 0,
                            left: `${bubble.x}%`,
                            bottom: '0%',
                            scale: 0,
                        }}
                        animate={{
                            opacity: [0, 0.8, 0.6, 0],
                            bottom: ['0%', '30%', '60%', '100%'],
                            left: [
                                `${bubble.x}%`,
                                `${bubble.x + (Math.random() * 10 - 5)}%`,
                                `${bubble.x + (Math.random() * 15 - 7.5)}%`,
                                `${bubble.x + (Math.random() * 20 - 10)}%`,
                            ],
                            scale: [0, 1, 1.1, 0.8],
                        }}
                        transition={{
                            duration: 2 + Math.random(),
                            delay: bubble.delay,
                            ease: 'easeOut',
                        }}
                        style={{
                            width: bubble.size,
                            height: bubble.size,
                            background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9), rgba(6, 182, 212, 0.6))',
                            border: '1px solid rgba(255, 255, 255, 0.5)',
                            boxShadow: '0 0 8px rgba(6, 182, 212, 0.5), inset 0 0 4px rgba(255, 255, 255, 0.8)',
                        }}
                        onAnimationComplete={() => {
                            setBubbles(prev => prev.filter(b => b.id !== bubble.id));
                        }}
                    />
                ))}
            </AnimatePresence>

            {/* Ripple Effects */}
            <AnimatePresence>
                {ripples.map(ripple => (
                    <motion.div
                        key={ripple.id}
                        className="absolute rounded-full pointer-events-none"
                        style={{ zIndex: 15 }}
                        initial={{
                            opacity: 0.6,
                            scale: 0,
                            left: `${ripple.x}%`,
                            top: `${ripple.y}%`,
                            x: '-50%',
                            y: '-50%',
                            width: 40,
                            height: 40,
                            border: '2px solid rgba(6, 182, 212, 0.4)',
                            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)',
                        }}
                        animate={{
                            opacity: 0,
                            scale: 3,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        onAnimationComplete={() => {
                            setRipples(prev => prev.filter(r => r.id !== ripple.id));
                        }}
                    />
                ))}
            </AnimatePresence>

            {/* Main Image with Float Effect - Using picture element for WebP support */}
            <motion.picture
                animate={
                    enableFloat && isHovered
                        ? {
                            y: [0, -3, 0, 3, 0],
                            scale: 1.05,
                        }
                        : {
                            y: 0,
                            scale: 1,
                        }
                }
                transition={{
                    y: {
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    },
                    scale: {
                        duration: 0.5,
                    },
                }}
                className={cn(
                    'block w-full h-full transition-all duration-700'
                )}
            >
                {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
                <img
                    src={src || '/placeholder-product.svg'}
                    alt={alt}
                    loading={priority ? 'eager' : 'lazy'}
                    decoding="async"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-product.svg';
                    }}
                    className={cn("w-full h-full", imageClassName)}
                />
            </motion.picture>

            {/* Water Surface Shimmer */}
            <motion.div
                className="absolute inset-0 pointer-events-none z-30"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                style={{
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, transparent 20%, transparent 80%, rgba(6, 182, 212, 0.1) 100%)',
                }}
            />

            {/* Subtle Wave Animation Overlay */}
            <motion.div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{ zIndex: 25 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 0.3 : 0 }}
                transition={{ duration: 0.5 }}
            >
                <motion.div
                    className="absolute inset-0"
                    animate={{
                        backgroundPosition: ['0% 0%', '100% 100%'],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                    style={{
                        background: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(6, 182, 212, 0.05) 10px,
              rgba(6, 182, 212, 0.05) 20px
            )`,
                        backgroundSize: '200% 200%',
                    }}
                />
            </motion.div>

            {/* Border Glow */}
            <motion.div
                className="absolute inset-0 pointer-events-none rounded-xl z-40"
                animate={{
                    boxShadow: isHovered
                        ? 'inset 0 0 20px rgba(6, 182, 212, 0.3), 0 0 30px rgba(6, 182, 212, 0.2)'
                        : 'inset 0 0 0px transparent, 0 0 0px transparent',
                }}
                transition={{ duration: 0.5 }}
            />
        </div>
    );
}
