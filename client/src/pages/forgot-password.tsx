import { useState } from "react";
import { Link } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Mail,
    Fish,
    AlertCircle,
    CheckCircle,
    ArrowRight,
    Loader2
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { addCsrfHeader } from "@/lib/csrf";

export default function ForgotPassword() {
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: addCsrfHeader({ "Content-Type": "application/json" }),
                credentials: "include",
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "حدث خطأ ما");
            }

            setIsSubmitted(true);
            toast({
                title: "تم إرسال الرابط",
                description: "تحقق من بريدك الإلكتروني",
            });
        } catch (err: unknown) {
            // For security, always show success even if email doesn't exist
            setIsSubmitted(true);
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
                                {isSubmitted ? "تحقق من بريدك" : "نسيت كلمة المرور؟"}
                            </CardTitle>
                            <CardDescription>
                                {isSubmitted
                                    ? "إذا كان البريد الإلكتروني مسجلاً، ستصلك رسالة تحتوي على رابط إعادة التعيين"
                                    : "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين"
                                }
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {isSubmitted ? (
                                <div className="text-center space-y-6">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                        <CheckCircle className="w-10 h-10 text-green-600" />
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-muted-foreground">
                                            أرسلنا رابط إعادة تعيين كلمة المرور إلى:
                                        </p>
                                        <p className="font-semibold text-primary" dir="ltr">
                                            {email}
                                        </p>
                                    </div>

                                    <Alert className="bg-primary/5 border-primary/20">
                                        <AlertCircle className="h-4 w-4 text-primary" />
                                        <AlertDescription className="text-sm">
                                            لم تستلم الرسالة؟ تحقق من مجلد الرسائل غير المرغوب فيها (Spam)
                                        </AlertDescription>
                                    </Alert>

                                    <div className="space-y-3">
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => {
                                                setIsSubmitted(false);
                                                setEmail("");
                                            }}
                                        >
                                            إرسال مرة أخرى
                                        </Button>

                                        <Link href="/login">
                                            <Button className="w-full gap-2">
                                                <ArrowRight className="w-4 h-4" />
                                                العودة لتسجيل الدخول
                                            </Button>
                                        </Link>
                                    </div>
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

                                        <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
                                            {isLoading ? (
                                                <span className="flex items-center gap-2">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    جاري الإرسال...
                                                </span>
                                            ) : (
                                                "إرسال رابط إعادة التعيين"
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


            <Footer />
        </div>
    );
}
