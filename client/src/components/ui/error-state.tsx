import { AlertCircle, RefreshCw, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

interface ErrorStateProps {
    title?: string;
    description?: string;
    showRetry?: boolean;
    showHome?: boolean;
    onRetry?: () => void;
    children?: React.ReactNode;
}

export function ErrorState({
    title = "حدث خطأ غير متوقع",
    description = "نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.",
    showRetry = true,
    showHome = true,
    onRetry,
    children,
}: ErrorStateProps) {
    return (
        <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-xl font-bold mb-2">{title}</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {description}
                </p>

                <div className="flex flex-wrap gap-3 justify-center">
                    {showRetry && onRetry && (
                        <Button onClick={onRetry} className="gap-2">
                            <RefreshCw className="w-4 h-4" />
                            إعادة المحاولة
                        </Button>
                    )}
                    {showHome && (
                        <Link href="/">
                            <Button variant="outline" className="gap-2">
                                <Home className="w-4 h-4" />
                                العودة للرئيسية
                            </Button>
                        </Link>
                    )}
                </div>

                {children}
            </CardContent>
        </Card>
    );
}

// Specific error messages
export const errorMessages = {
    network: {
        title: "مشكلة في الاتصال",
        description: "تعذر الاتصال بالخادم. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.",
    },
    notFound: {
        title: "الصفحة غير موجودة",
        description: "لم نتمكن من العثور على الصفحة المطلوبة. ربما تم نقلها أو حذفها.",
    },
    productNotFound: {
        title: "المنتج غير متوفر",
        description: "لم نتمكن من العثور على هذا المنتج. ربما تم إزالته أو أن الرابط غير صحيح.",
    },
    orderNotFound: {
        title: "الطلب غير موجود",
        description: "لم نتمكن من العثور على هذا الطلب. تأكد من رقم الطلب المدخل.",
    },
    serverError: {
        title: "خطأ في الخادم",
        description: "حدث خطأ أثناء معالجة طلبك. فريقنا التقني يعمل على إصلاحه.",
    },
    unauthorized: {
        title: "غير مصرح",
        description: "يجب تسجيل الدخول للوصول إلى هذه الصفحة.",
    },
    paymentFailed: {
        title: "فشل الدفع",
        description: "لم تتم عملية الدفع. يرجى التحقق من بيانات الدفع والمحاولة مرة أخرى.",
    },
    cartEmpty: {
        title: "سلة التسوق فارغة",
        description: "أضف بعض المنتجات إلى سلتك للمتابعة.",
    },
    outOfStock: {
        title: "نفدت الكمية",
        description: "للأسف هذا المنتج غير متوفر حالياً. يمكنك الاشتراك للإشعار عند توفره.",
    },
};

// Hook for handling errors
export function useErrorMessage(errorType: keyof typeof errorMessages) {
    return errorMessages[errorType];
}
