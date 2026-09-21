import { ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackToTopProps {
    showAfter?: number;
    className?: string;
}

export function BackToTop({ showAfter = 400, className }: BackToTopProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            setIsVisible(window.scrollY > showAfter);
        };

        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, [showAfter]);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    if (!isVisible) return null;

    return (
        <Button
            onClick={scrollToTop}
            size="icon"
            className={cn(
                "fixed bottom-24 left-6 z-40",
                "bg-primary/90 hover:bg-primary",
                "shadow-lg hover:shadow-primary/25",
                "transition-all duration-300",
                "animate-in fade-in slide-in-from-bottom-4",
                className
            )}
            aria-label="العودة للأعلى"
        >
            <ChevronUp className="w-5 h-5" />
        </Button>
    );
}
