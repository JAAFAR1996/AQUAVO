import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Lock,
    Fish,
    AlertCircle,
    CheckCircle,
    Eye,
    EyeOff,
    Loader2,
    ArrowRight
} from "lucide-react";
import { WhatsAppWidget } from "@/components/whatsapp-widget";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { PasswordStrength, isPasswordStrong } from "@/components/auth/password-strength";
import { addCsrfHeader } from "@/lib/csrf";

export default function ResetPassword() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [token, setToken] = useState("");
    const [isValidToken, setIsValidToken] = useState(true);

    useEffect(() => {
        // Extract token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get("token");
        if (tokenFromUrl) {
            setToken(tokenFromUrl);
        } else {
            setIsValidToken(false);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validations
        if (password !== confirmPassword) {
            setError("كلمتا المرور غير متطابقتين");
            return;
        }

        if (!isPasswordStrong(password)) {
            setError("كلمة المرور ضعيفة. يرجى اختيار كلمة مرور أقوى");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: addCsrfHeader({ "Content-Type": "application/json" }),
                credentials: "include",
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "حدث خطأ ما");
            }

            setIsSuccess(true);
            toast({
                title: "تم إعادة تعيين كلمة المرور",
                description: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة",
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "فشل إعادة تعيين كلمة المرور. الرابط قد يكون منتهي الصلاحية.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800" dir="rtl">
            <Navbar />

            <main id="main-content" className="flex-1 flex items-center justify-center py-12 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <Card className="border-0 shadow-2xl">
                        <CardHeader className="text-center pb-2">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <Fish className="w-8 h-8 text-white" />
                            </div>
                            <CardTitle className="text-2xl">
                                {isSuccess ? "تم بنجاح!" : "إعادة تعيين كلمة المرور"}
                            </CardTitle>
                            <CardDescription>
                                {isSuccess
                                    ? "تم تغيير كلمة المرور بنجاح"
                                    : "أدخل كلمة المرور الجديدة"
                                }
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {!isValidToken ? (
                                <div className="text-center space-y-6">
                                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                                        <AlertCircle className="w-10 h-10 text-red-600" />
                                    </div>

                                    <div className="space-y-2">
                                        <p className="font-semibold text-lg">رابط غير صالح</p>
                                        <p className="text-muted-foreground">
                                            الرابط الذي استخدمته غير صالح أو منتهي الصلاحية
                                        </p>
                                    </div>

                                    <Link href="/forgot-password">
                                        <Button className="w-full">
                                            طلب رابط جديد
                                        </Button>
                                    </Link>
                                </div>
                            ) : isSuccess ? (
                                <div className="text-center space-y-6">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                        <CheckCircle className="w-10 h-10 text-green-600" />
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-muted-foreground">
                                            تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.
                                        </p>
                                    </div>

                                    <Link href="/login">
                                        <Button className="w-full gap-2">
                                            <ArrowRight className="w-4 h-4" />
                                            تسجيل الدخول
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    {error && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="password">كلمة المرور الجديدة</Label>
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

                                        <PasswordStrength password={password} />

                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                                            <div className="relative">
                                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                                <Input
                                                    id="confirmPassword"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    className="pr-10"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    required
                                                    dir="ltr"
                                                />
                                            </div>
                                            {confirmPassword && password !== confirmPassword && (
                                                <p className="text-sm text-red-500 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    كلمتا المرور غير متطابقتين
                                                </p>
                                            )}
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full h-12 text-lg"
                                            disabled={isLoading || password !== confirmPassword}
                                        >
                                            {isLoading ? (
                                                <span className="flex items-center gap-2">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    جاري الحفظ...
                                                </span>
                                            ) : (
                                                "تغيير كلمة المرور"
                                            )}
                                        </Button>
                                    </form>

                                    <div className="text-center">
                                        <Link href="/login">
                                            <span className="text-primary font-semibold hover:underline cursor-pointer flex items-center justify-center gap-2">
                                                <ArrowRight className="w-4 h-4" />
                                                العودة لتسجيل الدخول
                                            </span>
                                        </Link>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </main>

            <WhatsAppWidget />
            <Footer />
        </div>
    );
}
