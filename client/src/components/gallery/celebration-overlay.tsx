import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { Copy, PartyPopper, Gift, Sparkles, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { addCsrfHeader } from "@/lib/csrf";

export function CelebrationOverlay() {
    const { toast } = useToast();
    const [showCelebration, setShowCelebration] = useState(false);
    const [copied, setCopied] = useState(false);

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
                method: "POST",
                headers: addCsrfHeader(),
                credentials: "include"
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

    // EPIC celebration with fireworks and explosions!
    const triggerCelebration = () => {
        const goldColors = ["#FFD700", "#FFA500", "#FFDF00", "#F4C430", "#DAA520"];
        const confettiColors = ["#22c55e", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#FFD700"];

        // ===== PHASE 1: Massive initial explosion from center =====
        confetti({
            particleCount: 150,
            spread: 360,
            origin: { x: 0.5, y: 0.5 },
            colors: goldColors,
            startVelocity: 45,
            ticks: 200,
            zIndex: 9999,
            shapes: ['circle', 'square'],
            scalar: 1.2
        });

        // ===== PHASE 2: Fireworks from corners =====
        setTimeout(() => {
            // Bottom left firework
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { x: 0, y: 1 },
                colors: confettiColors,
                startVelocity: 55,
                ticks: 200,
                zIndex: 9999
            });
            // Bottom right firework
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { x: 1, y: 1 },
                colors: confettiColors,
                startVelocity: 55,
                ticks: 200,
                zIndex: 9999
            });
        }, 300);

        // ===== PHASE 3: Star-shaped fireworks =====
        setTimeout(() => {
            const starPositions = [
                { x: 0.2, y: 0.3 },
                { x: 0.8, y: 0.3 },
                { x: 0.5, y: 0.2 },
            ];
            starPositions.forEach((pos, i) => {
                setTimeout(() => {
                    confetti({
                        particleCount: 80,
                        spread: 360,
                        origin: pos,
                        colors: goldColors,
                        startVelocity: 35,
                        ticks: 150,
                        zIndex: 9999,
                        shapes: ['star'],
                        scalar: 1.5
                    });
                }, i * 200);
            });
        }, 700);

        // ===== PHASE 4: Continuous golden rain =====
        setTimeout(() => {
            const duration = 4000;
            const animationEnd = Date.now() + duration;

            const interval = setInterval(() => {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                // Golden rain from top
                confetti({
                    particleCount: 8,
                    spread: 100,
                    origin: { x: Math.random(), y: -0.1 },
                    colors: goldColors,
                    startVelocity: 25,
                    ticks: 150,
                    zIndex: 9999,
                    gravity: 0.6,
                    scalar: 1.2
                });
            }, 100);
        }, 1000);

        // ===== PHASE 5: Side cannons =====
        setTimeout(() => {
            // Left cannon
            confetti({
                particleCount: 80,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.65 },
                colors: confettiColors,
                startVelocity: 50,
                ticks: 200,
                zIndex: 9999
            });
            // Right cannon
            confetti({
                particleCount: 80,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.65 },
                colors: confettiColors,
                startVelocity: 50,
                ticks: 200,
                zIndex: 9999
            });
        }, 1500);

        // ===== PHASE 6: Grand finale - Multiple explosions =====
        setTimeout(() => {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    confetti({
                        particleCount: 100,
                        spread: 360,
                        origin: { x: 0.2 + Math.random() * 0.6, y: 0.3 + Math.random() * 0.4 },
                        colors: [...goldColors, ...confettiColors],
                        startVelocity: 40 + Math.random() * 20,
                        ticks: 180,
                        zIndex: 9999,
                        shapes: ['circle', 'square', 'star']
                    });
                }, i * 150);
            }
        }, 2500);

        // ===== PHASE 7: Final mega burst =====
        setTimeout(() => {
            confetti({
                particleCount: 250,
                spread: 360,
                origin: { x: 0.5, y: 0.4 },
                colors: goldColors,
                startVelocity: 60,
                ticks: 300,
                zIndex: 9999,
                shapes: ['star', 'circle'],
                scalar: 1.5
            });
        }, 3500);
    };

    const copyCode = () => {
        if (winningSubmission?.couponCode) {
            navigator.clipboard.writeText(winningSubmission.couponCode);
            setCopied(true);
            toast({
                title: "✅ تم نسخ الرمز!",
                description: "استخدم هذا الرمز عند الدفع للحصول على جائزتك.",
            });
            setTimeout(() => setCopied(false), 3000);
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
            {/* EPIC Floating celebration elements */}
            <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
                {/* Colorful balloons - MORE of them! */}
                {Array.from({ length: 20 }).map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ y: "120vh", x: `${5 + Math.random() * 90}vw`, opacity: 0 }}
                        animate={{
                            y: "-20vh",
                            opacity: [0, 1, 1, 0.8, 0],
                        }}
                        transition={{
                            duration: Math.random() * 5 + 4,
                            delay: Math.random() * 3,
                            ease: "easeOut",
                            repeat: 0
                        }}
                        className="absolute"
                        style={{ fontSize: `${2 + Math.random() * 2}rem` }}
                    >
                        {['🎈', '🎈', '🎈', '🎊', '🎉'][Math.floor(Math.random() * 5)]}
                    </motion.div>
                ))}

                {/* Fireworks emojis */}
                {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div
                        key={`firework-${i}`}
                        initial={{
                            x: `${10 + Math.random() * 80}vw`,
                            y: `${10 + Math.random() * 60}vh`,
                            scale: 0,
                            opacity: 0
                        }}
                        animate={{
                            scale: [0, 1.5, 1, 0],
                            opacity: [0, 1, 1, 0],
                            rotate: [0, 180]
                        }}
                        transition={{
                            duration: 1.5,
                            delay: Math.random() * 4,
                            repeat: 2,
                            repeatDelay: 2
                        }}
                        className="absolute"
                        style={{ fontSize: `${2 + Math.random() * 2}rem` }}
                    >
                        {['🎆', '🎇', '✨', '💫', '⭐'][Math.floor(Math.random() * 5)]}
                    </motion.div>
                ))}

                {/* Trophy and crown floating */}
                {Array.from({ length: 6 }).map((_, i) => (
                    <motion.div
                        key={`trophy-${i}`}
                        initial={{
                            x: `${15 + Math.random() * 70}vw`,
                            y: `${20 + Math.random() * 60}vh`,
                            scale: 0,
                            opacity: 0
                        }}
                        animate={{
                            scale: [0, 1.2, 1, 1.2, 0],
                            opacity: [0, 1, 1, 1, 0],
                            y: [`${20 + Math.random() * 60}vh`, `${10 + Math.random() * 30}vh`]
                        }}
                        transition={{
                            duration: 3,
                            delay: i * 0.8 + Math.random(),
                            repeat: 1,
                            repeatDelay: 2
                        }}
                        className="absolute text-4xl"
                    >
                        {['🏆', '👑', '🥇', '🎖️'][i % 4]}
                    </motion.div>
                ))}

                {/* Sparkles everywhere */}
                {Array.from({ length: 15 }).map((_, i) => (
                    <motion.div
                        key={`sparkle-${i}`}
                        initial={{
                            x: `${Math.random() * 100}vw`,
                            y: `${Math.random() * 100}vh`,
                            scale: 0,
                            opacity: 0
                        }}
                        animate={{
                            scale: [0, 1.5, 0],
                            opacity: [0, 1, 0],
                        }}
                        transition={{
                            duration: 1,
                            delay: Math.random() * 5,
                            repeat: 4,
                            repeatDelay: Math.random() * 2
                        }}
                        className="absolute text-3xl"
                    >
                        ✨
                    </motion.div>
                ))}

                {/* Confetti ribbons */}
                {Array.from({ length: 10 }).map((_, i) => (
                    <motion.div
                        key={`ribbon-${i}`}
                        initial={{ y: "-10vh", x: `${Math.random() * 100}vw`, rotate: 0, opacity: 0 }}
                        animate={{
                            y: "110vh",
                            rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
                            opacity: [0, 1, 1, 0.5, 0],
                        }}
                        transition={{
                            duration: Math.random() * 5 + 5,
                            delay: Math.random() * 2,
                            ease: "linear",
                            repeat: 0
                        }}
                        className="absolute text-2xl"
                    >
                        {['🎀', '🎗️', '🎐'][Math.floor(Math.random() * 3)]}
                    </motion.div>
                ))}
            </div>

            <Dialog open={showCelebration} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className="sm:max-w-md bg-gradient-to-br from-background via-background to-primary/5 border-2 border-primary/20 shadow-2xl z-[9999]">
                    <DialogHeader className="text-center space-y-4">
                        {/* Trophy with gentle animation */}
                        <motion.div
                            className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-400/20 to-amber-500/20 rounded-full flex items-center justify-center"
                            animate={{
                                scale: [1, 1.05, 1],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <TrophyIcon className="w-10 h-10 text-yellow-500 drop-shadow-md" />
                        </motion.div>

                        <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500">
                            🎉 ألف مبروك!
                        </DialogTitle>

                        <DialogDescription className="text-base text-foreground/80">
                            لقد فازت مشاركتك "<span className="font-bold text-primary">{winningSubmission.tankSize}</span>"
                            في ألبوم العائلة لشهر <span className="font-bold">{winningSubmission.winnerMonth}</span>!
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center gap-4 py-4">
                        {/* Prize display */}
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-1">جائزتك:</p>
                            <div className="flex items-center gap-2 justify-center">
                                <Gift className="w-5 h-5 text-pink-500" />
                                <span className="text-lg font-bold text-accent">{winningSubmission.prize}</span>
                            </div>
                        </div>

                        {/* Coupon code box */}
                        <div className="w-full bg-gradient-to-r from-primary/5 to-primary/10 p-4 rounded-xl border border-primary/20 relative">
                            <p className="text-xs text-center text-muted-foreground mb-2">رمز الكوبون الخاص بك (استخدام واحد فقط)</p>
                            <div className="flex items-center justify-center gap-3">
                                <code className="text-xl font-mono font-black tracking-widest text-primary bg-background/50 px-3 py-1 rounded-lg">
                                    {winningSubmission.couponCode || "CODE-ERROR"}
                                </code>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={copyCode}
                                    className="hover:bg-primary/10 transition-colors"
                                >
                                    {copied ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>

                            {/* Decorative sparkle */}
                            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400" />
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                            💡 احتفظ بهذا الرمز واستخدمه عند الدفع للحصول على خصمك!
                        </p>
                    </div>

                    <DialogFooter className="sm:justify-center">
                        <Button
                            onClick={handleClose}
                            size="lg"
                            className="w-full sm:w-auto bg-gradient-to-r from-primary to-emerald-600 hover:opacity-90 transition-opacity font-bold"
                        >
                            <PartyPopper className="w-4 h-4 ml-2" />
                            شكراً! استلمت الجائزة
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function TrophyIcon(props: React.SVGProps<SVGSVGElement>) {
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
