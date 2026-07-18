import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingActionButton() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    // Instant jump — no smooth-scroll animation.
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  if (!showScrollTop) return null;

  return (
    <div className="fixed bottom-8 left-8 flex flex-col gap-3 z-40" dir="ltr">
      {/* Scroll to Top Button (appears instantly, no motion) */}
      <Button
        size="icon"
        className={cn("h-12 w-12 rounded-full shadow-lg")}
        onClick={scrollToTop}
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  );
}
