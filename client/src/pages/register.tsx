import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
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
    Sparkles,
    Gift
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { PasswordStrength, isPasswordStrong } from "@/components/auth/password-strength";
import { useTranslation } from "react-i18next";

export default function Register() {
  const { t } = useTranslation("account");
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

    // Referral code support
    const searchString = useSearch();
    const [referralCode, setReferralCode] = useState<string | null>(null);
    const [referralValid, setReferralValid] = useState<boolean | null>(null);

    // Extract and validate referral code from URL
    useEffect(() => {
        const params = new URLSearchParams(searchString);
        const ref = params.get('ref');
        if (ref) {
            setReferralCode(ref);
            // Validate the referral code
            fetch(`/api/referral/validate/${ref}`)
                .then(res => res.json())
                .then(data => {
                    setReferralValid(data.valid);
                })
                .catch(() => setReferralValid(false));
        }
    }, [searchString]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError(t("register.s1"));
            return;
        }

        if (!isPasswordStrong(formData.password)) {
            setError(t("register.s2"));
            return;
        }

        if (!acceptTerms) {
            setError(t("register.s3"));
            return;
        }

        setIsLoading(true);

        try {
            await register(formData.name, formData.email, formData.password, formData.phone, referralCode || undefined);
            toast({
                title: t("register.s4"),
                description: t("register.s5"),
            });
            setLocation("/");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : t("register.s6");
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const benefits = [
        t("register.s7"),
        t("register.s8"),
        t("register.s9"),
        t("register.s10"),
    ];

    return (
        <div className="flex-1 flex flex-col bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
            <main id="main-content" className="flex-1 flex items-center justify-center py-12 px-4">
                <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
                    {/* Benefits Section */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="hidden md:flex flex-col justify-center"
                    >
                        <h2 className="text-3xl font-bold mb-6">
                            {t("register.s11")} <span className="text-primary">{t("register.s12")}</span>
                        </h2>
                        <p className="text-muted-foreground mb-8 text-lg">
                            {t("register.s13")}
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
                                {t("register.s14")} <strong>{t("register.s15")}</strong> {t("register.s16")}
                            </AlertDescription>
                        </Alert>

                        {/* Referral Badge */}
                        {referralCode && referralValid && (
                            <Alert className="mt-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                                <Gift className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-sm text-green-700 dark:text-green-300">
                                    {t("register.s17")} <strong>{t("register.s18")}</strong> {t("register.s19")}
                                </AlertDescription>
                            </Alert>
                        )}
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
                                <CardTitle className="text-2xl">{t("register.s20")}</CardTitle>
                                <CardDescription>
                                    {t("register.s21")}
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
                                        <Label htmlFor="name">{t("register.s22")}</Label>
                                        <div className="relative">
                                            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <Input
                                                id="name"
                                                name="name"
                                                placeholder={t("register.s23")}
                                                className="pr-10"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">{t("register.s24")}</Label>
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
                                        <Label htmlFor="phone">{t("register.s25")}</Label>
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

                                    {/* Referral Code Input */}
                                    <div className="space-y-2">
                                        <Label htmlFor="referralCodeInput">{t("register.s26")}</Label>
                                        <div className="relative">
                                            <Gift className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <Input
                                                id="referralCodeInput"
                                                placeholder={t("register.s27")}
                                                className="pr-10"
                                                value={referralCode || ""}
                                                onChange={(e) => setReferralCode(e.target.value.toUpperCase() || null)}
                                                dir="ltr"
                                            />
                                        </div>
                                        {referralCode && referralValid === true && (
                                            <p className="text-sm text-green-600 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                {t("register.s28")}
                                            </p>
                                        )}
                                        {referralCode && referralValid === false && (
                                            <p className="text-sm text-red-500 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {t("register.s29")}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="password">{t("register.s30")}</Label>
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
                                            <Label htmlFor="confirmPassword">{t("register.s31")}</Label>
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
                                            {t("register.s1")}
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
                                            {t("register.s32")}{" "}
                                            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{t("register.s33")}</a>{" "}
                                            {t("register.s34")}{" "}
                                            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{t("register.s35")}</a>
                                        </Label>
                                    </div>

                                    <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
                                        {isLoading ? (
                                            <span className="flex items-center gap-2">
                                                <span className="animate-spin">◌</span>
                                                {t("register.s36")}
                                            </span>
                                        ) : (
                                            t("register.s37")
                                        )}
                                    </Button>
                                </form>

                                <div className="relative">
                                    <Separator />
                                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-sm text-muted-foreground">
                                        {t("register.s38")}
                                    </span>
                                </div>

                                <p className="text-center text-sm text-muted-foreground">
                                    {t("register.s39")}{" "}
                                    <Link href="/login">
                                        <span className="text-primary font-semibold hover:underline cursor-pointer">
                                            {t("register.s40")}
                                        </span>
                                    </Link>
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
