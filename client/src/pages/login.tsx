import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    Fish,
    Sparkles,
    AlertCircle,
    Loader2
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";

export default function Login() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { login, isLoading: authLoading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [blockCountdown, setBlockCountdown] = useState<number | null>(null);

    // Countdown timer effect
    useEffect(() => {
        if (blockCountdown && blockCountdown > 0) {
            const timer = setInterval(() => {
                setBlockCountdown(prev => {
                    if (prev && prev > 1) return prev - 1;
                    setError(""); // Clear error when countdown ends
                    return null;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [blockCountdown]);

    // Format seconds to MM:SS
    const formatCountdown = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            await login(email, password, rememberMe);
            toast({
                title: "تم تسجيل الدخول بنجاح!",
                description: "مرحباً بك في AQUAVO",
            });
            setLocation("/");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "فشل تسجيل الدخول. يرجى التحقق من البيانات.";
            setError(message);
            // Check for IP blocking countdown
            if (err && typeof err === 'object' && 'retryAfter' in err) {
                setBlockCountdown((err as any).retryAfter);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Show loading if auth is still checking
    if (authLoading) {
        return (
            <div className="min-h-screen flex flex-col bg-background" dir="rtl">
                <Navbar />
                <main className="flex-1 flex items-center justify-center py-12 px-4">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        <p className="text-muted-foreground">جاري التحميل...</p>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-background" dir="rtl">
            <Navbar />

            <main id="main-content" className="flex-1 flex items-center justify-center py-12 px-4">
                <motion.div
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <Card className="border-0 shadow-2xl">
                        <CardHeader className="text-center pb-2">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <Fish className="w-8 h-8 text-white" />
                            </div>
                            <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
                            <CardDescription className="text-lg text-primary/80 font-medium mt-2">
                                أهلاً بك في عائلتك الثانية! اشتقنا لرؤيتك 💙
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        {error}
                                        {blockCountdown && blockCountdown > 0 && (
                                            <div className="mt-2 font-bold text-lg">
                                                ⏳ يمكنك المحاولة مرة أخرى خلال {formatCountdown(blockCountdown)}
                                            </div>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">البريد الإلكتروني</Label>
                                    <div className="relative">
                                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="example@email.com"
                                            className="pr-10"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            dir="ltr"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password">كلمة المرور</Label>
                                        <Link href="/forgot-password">
                                            <span className="text-sm text-primary hover:underline cursor-pointer">
                                                نسيت كلمة المرور؟
                                            </span>
                                        </Link>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="pr-10 pl-10"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            dir="ltr"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="remember"
                                        checked={rememberMe}
                                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                    />
                                    <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                                        تذكرني
                                    </Label>
                                </div>

                                <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading || (blockCountdown !== null && blockCountdown > 0)}>
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            جاري تسجيل الدخول...
                                        </span>
                                    ) : (
                                        "تسجيل الدخول"
                                    )}
                                </Button>
                            </form>

                            <div className="relative">
                                <Separator />
                                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-sm text-muted-foreground">
                                    أو
                                </span>
                            </div>

                            <div className="text-center space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    ليس لديك حساب؟{" "}
                                    <Link href="/register">
                                        <span className="text-primary font-semibold hover:underline cursor-pointer">
                                            إنشاء حساب جديد
                                        </span>
                                    </Link>
                                </p>

                                <Alert className="bg-primary/5 border-primary/20">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <AlertDescription className="text-sm">
                                        أنشئ حساباً واحصل على <strong>خصم 3%</strong> على طلبك الأول!
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </main>


            <Footer />
        </div>
    );
}
