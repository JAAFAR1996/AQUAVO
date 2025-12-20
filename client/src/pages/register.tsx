import { useState } from "react";
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
    User,
    Phone,
    CheckCircle,
    AlertCircle,
    Sparkles
} from "lucide-react";
import { WhatsAppWidget } from "@/components/whatsapp-widget";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { PasswordStrength, isPasswordStrong } from "@/components/auth/password-strength";

export default function Register() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { register } = useAuth();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError("كلمتا المرور غير متطابقتين");
            return;
        }

        if (!isPasswordStrong(formData.password)) {
            setError("كلمة المرور ضعيفة جداً. يرجى اختيار كلمة مرور أقوى تتضمن حروف كبيرة وصغيرة وأرقام ورموز");
            return;
        }

        if (!acceptTerms) {
            setError("يرجى الموافقة على الشروط والأحكام");
            return;
        }

        setIsLoading(true);

        try {
            await register(formData.name, formData.email, formData.password, formData.phone);
            toast({
                title: "تم إنشاء الحساب بنجاح! 🎉",
                description: "مرحباً بك في عائلة AQUAVO.",
            });
            setLocation("/");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const benefits = [
        "تتبع طلباتك بسهولة",
        "حفظ عناوين التوصيل",
        "عروض حصرية للأعضاء",
        "جمع نقاط الولاء",
    ];

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
            <Navbar />

            <main className="flex-1 flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
                    {/* Benefits Section */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="hidden md:flex flex-col justify-center"
                    >
                        <h2 className="text-3xl font-bold mb-6">
                            انضم إلى <span className="text-primary">عائلة AQUAVO</span>
                        </h2>
                        <p className="text-muted-foreground mb-8 text-lg">
                            أنشئ حساباً واستمتع بمزايا حصرية
                        </p>

                        <div className="space-y-4">
                            {benefits.map((benefit, index) => (
                                <motion.div
                                    key={benefit}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center gap-3"
                                >
                                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    </div>
                                    <span className="text-lg">{benefit}</span>
                                </motion.div>
                            ))}
                        </div>

                        <Alert className="mt-8 bg-primary/5 border-primary/20">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <AlertDescription className="text-sm">
                                احصل على <strong>خصم 3%</strong> على طلبك الأول عند التسجيل!
                            </AlertDescription>
                        </Alert>
                    </motion.div>

                    {/* Registration Form */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className="border-0 shadow-2xl">
                            <CardHeader className="text-center pb-2">
                                <div className="w-16 h-16 bg-gradient-to-br from-primary to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <Fish className="w-8 h-8 text-white" />
                                </div>
                                <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
                                <CardDescription>
                                    أدخل بياناتك للتسجيل
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">الاسم الكامل</Label>
                                        <div className="relative">
                                            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <Input
                                                id="name"
                                                name="name"
                                                placeholder="أحمد محمد"
                                                className="pr-10"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">البريد الإلكتروني</Label>
                                        <div className="relative">
                                            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                placeholder="example@email.com"
                                                className="pr-10"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                                dir="ltr"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">رقم الهاتف</Label>
                                        <div className="relative">
                                            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <Input
                                                id="phone"
                                                name="phone"
                                                type="tel"
                                                placeholder="07XX XXX XXXX"
                                                className="pr-10"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                required
                                                dir="ltr"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="password">كلمة المرور</Label>
                                            <div className="relative">
                                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                                <Input
                                                    id="password"
                                                    name="password"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••"
                                                    className="pr-10"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    required
                                                    dir="ltr"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                                            <div className="relative">
                                                <Input
                                                    id="confirmPassword"
                                                    name="confirmPassword"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••"
                                                    value={formData.confirmPassword}
                                                    onChange={handleChange}
                                                    required
                                                    dir="ltr"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Password Strength Indicator */}
                                    <PasswordStrength password={formData.password} showRequirements={true} />

                                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                        <p className="text-sm text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            كلمتا المرور غير متطابقتين
                                        </p>
                                    )}

                                    <div className="flex items-start gap-2">
                                        <Checkbox
                                            id="terms"
                                            checked={acceptTerms}
                                            onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                                            className="mt-1"
                                        />
                                        <Label htmlFor="terms" className="text-sm font-normal cursor-pointer leading-relaxed">
                                            أوافق على{" "}
                                            <Link href="/terms">
                                                <span className="text-primary hover:underline">الشروط والأحكام</span>
                                            </Link>{" "}
                                            و{" "}
                                            <Link href="/privacy-policy">
                                                <span className="text-primary hover:underline">سياسة الخصوصية</span>
                                            </Link>
                                        </Label>
                                    </div>

                                    <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
                                        {isLoading ? (
                                            <span className="flex items-center gap-2">
                                                <span className="animate-spin">◌</span>
                                                جاري إنشاء الحساب...
                                            </span>
                                        ) : (
                                            "إنشاء الحساب"
                                        )}
                                    </Button>
                                </form>

                                <div className="relative">
                                    <Separator />
                                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-sm text-muted-foreground">
                                        أو
                                    </span>
                                </div>

                                <p className="text-center text-sm text-muted-foreground">
                                    لديك حساب بالفعل؟{" "}
                                    <Link href="/login">
                                        <span className="text-primary font-semibold hover:underline cursor-pointer">
                                            تسجيل الدخول
                                        </span>
                                    </Link>
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </main>

            <WhatsAppWidget />
            <Footer />
        </div>
    );
}
