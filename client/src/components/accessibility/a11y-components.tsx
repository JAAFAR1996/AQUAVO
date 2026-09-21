import React, { useRef, useCallback, KeyboardEvent, cloneElement } from "react";
import { cn } from "@/lib/utils";

// Skip to main content link
export function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
    const handleClick = () => {
        const target = document.getElementById(targetId);
        if (target) {
            target.focus();
            target.scrollIntoView();
        }
    };

    return (
        <a
            href={`#${targetId}`}
            onClick={handleClick}
            className={cn(
                "sr-only focus:not-sr-only",
                "fixed top-4 right-4 z-[100]",
                "bg-primary text-primary-foreground",
                "px-4 py-2 rounded-lg",
                "font-medium text-sm",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "transition-all"
            )}
        >
            انتقل إلى المحتوى الرئيسي
        </a>
    );
}

// Accessible announcement for screen readers
export function LiveRegion({
    message,
    priority = "polite"
}: {
    message: string;
    priority?: "polite" | "assertive"
}) {
    return (
        <div
            role="status"
            aria-live={priority}
            aria-atomic="true"
            className="sr-only"
        >
            {message}
        </div>
    );
}

// Focus trap for modals and dialogs
export function useFocusTrap(isActive: boolean) {
    const containerRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!isActive || !containerRef.current) return;
            if (e.key !== "Tab") return;

            const focusableElements = containerRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement?.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement?.focus();
            }
        },
        [isActive]
    );

    return { containerRef, handleKeyDown };
}

// Keyboard navigation hook
export function useKeyboardNavigation<T extends HTMLElement>(
    items: T[],
    options: {
        orientation?: "horizontal" | "vertical";
        loop?: boolean;
        onSelect?: (index: number) => void;
    } = {}
) {
    const { orientation = "vertical", loop = true, onSelect } = options;
    const currentIndex = useRef(0);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            const prevKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
            const nextKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";

            if (e.key === prevKey) {
                e.preventDefault();
                if (loop || currentIndex.current < items.length - 1) {
                    currentIndex.current = (currentIndex.current + 1) % items.length;
                    items[currentIndex.current]?.focus();
                }
            } else if (e.key === nextKey) {
                e.preventDefault();
                if (loop || currentIndex.current > 0) {
                    currentIndex.current = (currentIndex.current - 1 + items.length) % items.length;
                    items[currentIndex.current]?.focus();
                }
            } else if (e.key === "Home") {
                e.preventDefault();
                currentIndex.current = 0;
                items[0]?.focus();
            } else if (e.key === "End") {
                e.preventDefault();
                currentIndex.current = items.length - 1;
                items[items.length - 1]?.focus();
            } else if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.(currentIndex.current);
            }
        },
        [items, orientation, loop, onSelect]
    );

    return { handleKeyDown, currentIndex };
}

// Reduced motion hook
export function usePrefersReducedMotion(): boolean {
    if (typeof window === "undefined") return false;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    return mediaQuery.matches;
}

// High contrast mode hook
export function usePrefersHighContrast(): boolean {
    if (typeof window === "undefined") return false;

    const mediaQuery = window.matchMedia("(prefers-contrast: more)");
    return mediaQuery.matches;
}

// Accessible image component
interface AccessibleImageProps {
    src: string;
    alt: string;
    decorative?: boolean;
    className?: string;
    loading?: "lazy" | "eager";
}

export function AccessibleImage({
    src,
    alt,
    decorative = false,
    className,
    loading = "lazy",
}: AccessibleImageProps) {
    return (
        <img
            src={src}
            alt={decorative ? "" : alt}
            role={decorative ? "presentation" : undefined}
            aria-hidden={decorative}
            className={className}
            loading={loading}
            decoding="async"
        />
    );
}

// Accessible button with loading state
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    loadingText?: string;
    children: React.ReactNode;
}

export function AccessibleButton({
    isLoading,
    loadingText = "جاري التحميل...",
    children,
    disabled,
    ...props
}: AccessibleButtonProps) {
    return (
        <button
            {...props}
            disabled={disabled || isLoading}
            aria-busy={isLoading}
            aria-disabled={disabled || isLoading}
        >
            {isLoading ? (
                <>
                    <span className="sr-only">{loadingText}</span>
                    <span aria-hidden="true">{children}</span>
                </>
            ) : (
                children
            )}
        </button>
    );
}

// Form field with accessible error messages
interface AccessibleFieldProps {
    id: string;
    label: string;
    error?: string;
    required?: boolean;
    description?: string;
    children: React.ReactElement;
}

export function AccessibleField({
    id,
    label,
    error,
    required,
    description,
    children,
}: AccessibleFieldProps) {
    const errorId = `${id}-error`;
    const descriptionId = `${id}-description`;
    const hasDescription = !!description;
    const hasError = !!error;

    const describedBy = [
        hasError ? errorId : null,
        hasDescription ? descriptionId : null,
    ].filter(Boolean).join(" ") || undefined;

    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-sm font-medium">
                {label}
                {required && (
                    <span className="text-destructive mr-1" aria-hidden="true">
                        *
                    </span>
                )}
                {required && <span className="sr-only">(مطلوب)</span>}
            </label>

            {hasDescription && (
                <p id={descriptionId} className="text-sm text-muted-foreground">
                    {description}
                </p>
            )}

            {/* Clone child with accessibility attributes */}
            {cloneElement(children as React.ReactElement<any>, {
                id,
                "aria-invalid": hasError ? "true" : undefined,
                "aria-describedby": describedBy,
                "aria-required": required ? "true" : undefined,
            })}

            {hasError && (
                <p id={errorId} className="text-sm text-destructive" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

// Color contrast checker utility
export function checkColorContrast(
    foreground: string,
    background: string
): { ratio: number; passesAA: boolean; passesAAA: boolean } {
    const getLuminance = (color: string) => {
        // Simple hex to luminance (simplified)
        const hex = color.replace("#", "");
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;

        const adjust = (c: number) =>
            c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

        return 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b);
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    return {
        ratio: Math.round(ratio * 100) / 100,
        passesAA: ratio >= 4.5,
        passesAAA: ratio >= 7,
    };
}
