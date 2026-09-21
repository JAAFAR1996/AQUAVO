import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Copy, Check, Gift, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface WinningSubmission {
    id: string;
    tankSize: string;
    winnerMonth: string;
    prize: string;
    couponCode: string;
    hasSeenCelebration: boolean;
}

export function WinnerNotificationBanner() {
    const { toast } = useToast();
    const [isDismissed, setIsDismissed] = useState(false);
    const [copied, setCopied] = useState(false);

    // Check localStorage for dismissed state
    useEffect(() => {
        const dismissedId = localStorage.getItem("winner-banner-dismissed");
        if (dismissedId) {
            setIsDismissed(true);
        }
    }, []);

    // Check for winning submission (only after celebration was seen)
    const { data: winningSubmission } = useQuery<WinningSubmission | null>({
        queryKey: ["/api/gallery/my-winning-submission-banner"],
        queryFn: async () => {
            const res = await fetch("/api/gallery/my-winning-submission");
            if (!res.ok) return null;
            const data = await res.json();
            // Only show banner if they've seen the celebration modal
            // The banner serves as a reminder after the initial celebration
            return data?.hasSeenCelebration ? data : null;
        },
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const copyCode = () => {
        if (winningSubmission?.couponCode) {
            navigator.clipboard.writeText(winningSubmission.couponCode);
            setCopied(true);
            toast({
                title: "✅ تم نسخ الرمز!",
                description: "استخدم هذا الرمز عند الدفع",
            });
            setTimeout(() => setCopied(false), 3000);
        }
    };

    const handleDismiss = () => {
        if (winningSubmission?.id) {
            localStorage.setItem("winner-banner-dismissed", winningSubmission.id);
        }
        setIsDismissed(true);
    };

    // Don't show if dismissed or no winning submission
    if (isDismissed || !winningSubmission) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-white shadow-lg"
            >
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        {/* Message Section */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 bg-card/20 rounded-full flex items-center justify-center">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-sm md:text-base truncate">
                                    🎉 مبروك! فزت في ألبوم العائلة!
                                </p>
                                <p className="text-xs md:text-sm text-white/90 truncate">
                                    شكراً لمشاركتك الرائعة - جائزتك: {winningSubmission.prize}
                                </p>
                            </div>
                        </div>

                        {/* Coupon Code Section */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex items-center gap-2 bg-card/20 rounded-lg px-3 py-1.5">
                                <Gift className="w-4 h-4 flex-shrink-0" />
                                <code className="font-mono font-bold text-sm tracking-wide">
                                    {winningSubmission.couponCode}
                                </code>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={copyCode}
                                    className="h-7 w-7 hover:bg-white/20 text-white"
                                >
                                    {copied ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>

                            {/* Dismiss Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDismiss}
                                className="h-8 w-8 hover:bg-white/20 text-white flex-shrink-0"
                                title="إخفاء"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
