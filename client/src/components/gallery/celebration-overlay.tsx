import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { Copy, PartyPopper, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export function CelebrationOverlay() {
    const { toast } = useToast();
    const [showCelebration, setShowCelebration] = useState(false);

    // Check for winning submission
    const { data: winningSubmission } = useQuery({
        queryKey: ["/api/gallery/my-winning-submission"],
        queryFn: async () => {
            const res = await fetch("/api/gallery/my-winning-submission");
            if (!res.ok) return null;
            return res.json();
        }
    });

    // Acknowledge mutation
    const ackMutation = useMutation({
        mutationFn: async (id: string) => {
            await fetch(`/api/gallery/ack-celebration/${id}`, {
                method: "POST"
            });
        },
        onSuccess: () => {
            setShowCelebration(false);
        }
    });

    useEffect(() => {
        if (winningSubmission && !ackMutation.isPending && !ackMutation.isSuccess) {
            setShowCelebration(true);
            triggerCelebration();
        }
    }, [winningSubmission]);

    const triggerCelebration = () => {
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            // since particles fall down, start a bit higher than random
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    const copyCode = () => {
        if (winningSubmission?.couponCode) {
            navigator.clipboard.writeText(winningSubmission.couponCode);
            toast({
                title: "تم نسخ الرمز!",
                description: "استخدم هذا الرمز عند الدفع للحصول على جائزتك.",
            });
        }
    };

    const handleClose = () => {
        if (winningSubmission?.id) {
            ackMutation.mutate(winningSubmission.id);
        } else {
            setShowCelebration(false);
        }
    };

    if (!showCelebration || !winningSubmission) return null;

    return (
        <>
            <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
                {/* CSS Balloons Animation */}
                {Array.from({ length: 15 }).map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ y: "120vh", x: Math.random() * 100 + "vw", opacity: 0 }}
                        animate={{
                            y: "-20vh",
                            opacity: [0, 1, 1, 0],
                            x: (Math.random() - 0.5) * 20 + "vw" // drift
                        }}
                        transition={{
                            duration: Math.random() * 5 + 5,
                            delay: Math.random() * 2,
                            ease: "linear",
                            repeat: Infinity
                        }}
                        className="absolute text-6xl"
                    >
                        🎈
                    </motion.div>
                ))}
                {Array.from({ length: 10 }).map((_, i) => (
                    <motion.div
                        key={`ribbon-${i}`}
                        initial={{ y: "120vh", x: Math.random() * 100 + "vw", opacity: 0, rotate: 0 }}
                        animate={{
                            y: "-20vh",
                            opacity: [0, 1, 1, 0],
                            rotate: 360
                        }}
                        transition={{
                            duration: Math.random() * 4 + 4,
                            delay: Math.random() * 2,
                            ease: "linear",
                            repeat: Infinity
                        }}
                        className="absolute text-5xl"
                    >
                        🎉
                    </motion.div>
                ))}
            </div>

            <Dialog open={showCelebration} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className="sm:max-w-md bg-gradient-to-br from-background to-primary/5 border-2 border-primary/20 shadow-2xl z-[9999]">
                    <DialogHeader className="text-center space-y-4">
                        <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-bounce">
                            <TrophyIcon className="w-12 h-12 text-primary drop-shadow-md" />
                        </div>
                        <DialogTitle className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 animate-pulse">
                            ألف مبروك الفوز!
                        </DialogTitle>
                        <DialogDescription className="text-lg text-foreground/80">
                            لقد فازت مشاركتك "<span className="font-bold text-primary">{winningSubmission.tankSize}</span>" في ألبوم العائلة لشهر <span className="font-bold">{winningSubmission.winnerMonth}</span>!
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center gap-4 py-6">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">جائزتك هي:</p>
                            <div className="text-xl font-bold text-accent">{winningSubmission.prize}</div>
                        </div>

                        <div className="w-full bg-muted p-4 rounded-xl border border-dashed border-primary/50 relative group">
                            <p className="text-xs text-center text-muted-foreground mb-2">رمز الكوبون الخاص بك</p>
                            <div className="flex items-center justify-center gap-3">
                                <code className="text-2xl font-mono font-black tracking-widest text-primary">
                                    {winningSubmission.couponCode || "CODE-ERROR"}
                                </code>
                                <Button variant="ghost" size="icon" onClick={copyCode} className="hover:bg-primary/10">
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="absolute -top-3 -right-3 rotate-12">
                                <Gift className="w-8 h-8 text-pink-500 fill-pink-200 animate-pulse" />
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground text-center alert alert-info">
                            * يرجى الاحتفاظ بهذا الرمز، يمكنك استخدامه مرة واحدة فقط عند الدفع.
                        </p>
                    </div>

                    <DialogFooter className="sm:justify-center">
                        <Button onClick={handleClose} size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-opacity font-bold">
                            <PartyPopper className="w-4 h-4 mr-2" />
                            استلام الجائزة
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function TrophyIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    )
}
