/**
 * Early Access Landing Page - صفحة الحجز المبكر
 * 
 * صفحة بسيطة لجمع أرقام واتساب العملاء المحتملين
 * مع عداد الأماكن المتبقية وتصميم جذاب
 */

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Fish,
    Sparkles,
    Check,
    Phone,
    Gift,
    Percent,
    Users,
    ArrowLeft,
    Crown,
    Star,
    Waves
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Maximum spots and initial display
const MAX_SPOTS = 30;
const INITIAL_DISPLAY_SPOTS = 24; // يبدأ عند 24 لإيحاء أن هناك من سجل قبلك

interface RegistrationResponse {
    success: boolean;
    message: string;
    spotsRemaining: number;
    couponCode?: string;
}

export default function EarlyAccessPage() {
    const [phone, setPhone] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [spotsRemaining, setSpotsRemaining] = useState(INITIAL_DISPLAY_SPOTS);
    const [couponCode, setCouponCode] = useState<string | null>(null);
    const { toast } = useToast();

    // Set page title
    useEffect(() => {
        document.title = 'احجز مكانك | AQUAVO - أول متجر أحواض سمك في العراق';
    }, []);

    // Fetch current spots count
    const { data: spotsData } = useQuery({
        queryKey: ['/api/early-access/spots'],
        queryFn: async () => {
            try {
                const response = await fetch('/api/early-access/spots');
                if (!response.ok) return { spotsRemaining: INITIAL_DISPLAY_SPOTS };
                return response.json();
            } catch {
                return { spotsRemaining: INITIAL_DISPLAY_SPOTS };
            }
        },
    });

    useEffect(() => {
        if (spotsData?.spotsRemaining !== undefined) {
            setSpotsRemaining(Math.max(0, Math.min(spotsData.spotsRemaining, MAX_SPOTS)));
        }
    }, [spotsData]);

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: async (phoneNumber: string) => {
            const response = await apiRequest('POST', '/api/early-access/register', {
                phone: phoneNumber,
            });
            return response.json() as Promise<RegistrationResponse>;
        },
        onSuccess: (data) => {
            if (data.success) {
                setIsSubmitted(true);
                setSpotsRemaining(data.spotsRemaining);
                if (data.couponCode) {
                    setCouponCode(data.couponCode);
                }
            } else {
                toast({
                    title: 'خطأ',
                    description: data.message || 'حدث خطأ، يرجى المحاولة مرة أخرى',
                    variant: 'destructive',
                });
            }
        },
        onError: (error: any) => {
            toast({
                title: 'خطأ',
                description: error?.message || 'حدث خطأ في الاتصال بالخادم',
                variant: 'destructive',
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate phone
        const cleanPhone = phone.replace(/\s/g, '');
        if (cleanPhone.length < 10) {
            toast({
                title: 'رقم غير صحيح',
                description: 'يرجى إدخال رقم واتساب صحيح',
                variant: 'destructive',
            });
            return;
        }

        submitMutation.mutate(cleanPhone);
    };

    const spotsPercentage = (spotsRemaining / MAX_SPOTS) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950 overflow-hidden relative">
            {/* Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Floating bubbles */}
                {[...Array(15)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full bg-cyan-400/10"
                        style={{
                            width: Math.random() * 100 + 20,
                            height: Math.random() * 100 + 20,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            y: [0, -30, 0],
                            opacity: [0.1, 0.3, 0.1],
                        }}
                        transition={{
                            duration: Math.random() * 4 + 3,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                        }}
                    />
                ))}

                {/* Gradient orbs */}
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                            <Fish className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                            AQUAVO
                        </span>
                    </div>
                </motion.div>

                {/* Main Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="w-full max-w-lg"
                >
                    <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/10 overflow-hidden">
                        <AnimatePresence mode="wait">
                            {!isSubmitted ? (
                                <motion.div
                                    key="form"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    className="p-8 md:p-10"
                                >
                                    {/* Header */}
                                    <div className="text-center mb-8">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.2, type: 'spring' }}
                                            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 px-4 py-2 rounded-full text-sm font-medium mb-4"
                                        >
                                            <Crown className="w-4 h-4" />
                                            <span>عرض حصري للأوائل</span>
                                            <Sparkles className="w-4 h-4" />
                                        </motion.div>

                                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-relaxed">
                                            AQUAVO قادمة لتغيير
                                            <br />
                                            <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                                                عالم الأحواض في العراق
                                            </span>
                                            <span className="ml-2">🇮🇶</span>
                                        </h1>

                                        <p className="text-slate-300 text-lg leading-relaxed">
                                            كن من أول <span className="text-cyan-400 font-bold">30</span> شخص
                                            <br />
                                            واحصل على <span className="text-amber-400 font-bold">خصم 20%</span>
                                            <br />
                                            على طلبك الأول!
                                        </p>
                                    </div>

                                    {/* Benefits */}
                                    <div className="flex justify-center mb-8">
                                        <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-amber-500/30 to-orange-500/30 rounded-xl flex items-center justify-center">
                                                <Percent className="w-6 h-6 text-amber-400" />
                                            </div>
                                            <div>
                                                <span className="text-white font-bold text-lg">خصم 20%</span>
                                                <p className="text-slate-400 text-sm">على طلبك الأول</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Spots Counter */}
                                    <div className="mb-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-slate-400" />
                                                <span className="text-slate-400 text-sm">الأماكن المتبقية</span>
                                            </div>
                                            <span className="text-white font-bold">
                                                {spotsRemaining} / {MAX_SPOTS}
                                            </span>
                                        </div>
                                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${spotsPercentage}%` }}
                                                transition={{ delay: 0.5, duration: 1 }}
                                                className={`h-full rounded-full ${spotsRemaining <= 5
                                                    ? 'bg-gradient-to-r from-red-500 to-orange-500'
                                                    : spotsRemaining <= 10
                                                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                                                        : 'bg-gradient-to-r from-cyan-500 to-teal-500'
                                                    }`}
                                            />
                                        </div>
                                        {spotsRemaining <= 10 && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-amber-400 text-sm mt-2 text-center"
                                            >
                                                ⚡ الأماكن تنفذ بسرعة!
                                            </motion.p>
                                        )}
                                    </div>

                                    {/* Form */}
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="relative">
                                            <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="رقم الواتساب (مثال: 07701234567)"
                                                className="w-full bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl py-4 pr-12 pl-4 text-lg focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                                dir="ltr"
                                                disabled={submitMutation.isPending}
                                            />
                                        </div>

                                        <motion.button
                                            type="submit"
                                            disabled={submitMutation.isPending || spotsRemaining <= 0}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-bold py-4 px-6 rounded-xl text-lg shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                                        >
                                            {submitMutation.isPending ? (
                                                <>
                                                    <motion.div
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                                    />
                                                    <span>جاري الحجز...</span>
                                                </>
                                            ) : spotsRemaining <= 0 ? (
                                                <span>نفذت الأماكن 😔</span>
                                            ) : (
                                                <>
                                                    <span>احجز مكاني الآن</span>
                                                    <ArrowLeft className="w-5 h-5" />
                                                </>
                                            )}
                                        </motion.button>
                                    </form>

                                    {/* Trust badges */}
                                    <div className="mt-6 flex items-center justify-center gap-4 text-slate-500 text-xs">
                                        <div className="flex items-center gap-1">
                                            <Check className="w-3 h-3" />
                                            <span>بياناتك آمنة</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Check className="w-3 h-3" />
                                            <span>بدون التزام</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-8 md:p-10 text-center"
                                >
                                    {/* Success Animation */}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', duration: 0.5 }}
                                        className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30"
                                    >
                                        <Check className="w-12 h-12 text-white" />
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <h2 className="text-2xl font-bold text-white mb-4">
                                            🎉 مبروك!
                                        </h2>
                                        <p className="text-slate-300 text-lg leading-relaxed mb-6">
                                            تم تسجيلك بنجاح!
                                        </p>

                                        {/* Coupon Code Display */}
                                        {couponCode && (
                                            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-5 mb-6">
                                                <p className="text-amber-400 text-sm mb-2">كود الخصم الخاص بك:</p>
                                                <div className="bg-slate-900/80 rounded-lg p-3 flex items-center justify-center gap-3">
                                                    <span className="text-2xl font-mono font-bold text-white tracking-wider">{couponCode}</span>
                                                </div>
                                                <p className="text-slate-400 text-xs mt-3">⚠️ هذا الكود صالح لمرة واحدة فقط</p>
                                            </div>
                                        )}

                                        <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                                            <div className="flex items-center justify-center gap-3 text-amber-400">
                                                <Star className="w-5 h-5 fill-amber-400" />
                                                <span className="font-medium">أنت ضمن الـ {MAX_SPOTS - spotsRemaining + 1} الأوائل!</span>
                                                <Star className="w-5 h-5 fill-amber-400" />
                                            </div>
                                        </div>

                                        {/* WhatsApp Button */}
                                        {couponCode && (
                                            <motion.a
                                                href={`https://wa.me/9647872257008?text=${encodeURIComponent(
                                                    `مرحباً! 👋\n\nسجلت للحصول على خصم الحجز المبكر من AQUAVO 🎉\n\nكود الخصم الخاص بي: ${couponCode}\n\nأرغب بتفعيل الكود والاستفسار عن المنتجات المتوفرة.`
                                                )}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold py-4 px-6 rounded-xl text-lg shadow-lg shadow-green-500/30 flex items-center justify-center gap-3 mb-4"
                                            >
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                </svg>
                                                <span>تواصل معنا عبر واتساب</span>
                                            </motion.a>
                                        )}

                                        <p className="text-slate-500 text-sm">
                                            أو انتظر وسنتواصل معك قريباً
                                        </p>
                                    </motion.div>

                                    {/* Confetti effect */}
                                    {[...Array(20)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="absolute w-2 h-2 rounded-full"
                                            style={{
                                                background: ['#06b6d4', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'][i % 5],
                                                left: `${Math.random() * 100}%`,
                                                top: `${Math.random() * 100}%`,
                                            }}
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{
                                                opacity: [0, 1, 0],
                                                scale: [0, 1, 0],
                                                y: [0, -100],
                                            }}
                                            transition={{
                                                duration: 1.5,
                                                delay: i * 0.05,
                                                ease: 'easeOut',
                                            }}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-8 text-center"
                >
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                        <Waves className="w-4 h-4" />
                        <span>AQUAVO - أول متجر أحواض سمك متخصص في العراق</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
