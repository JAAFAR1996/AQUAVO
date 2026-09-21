import { AlertCircle, RefreshCw, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

interface ErrorStateProps {
    title?: string;
    description?: string;
    showRetry?: boolean;
    showHome?: boolean;
    onRetry?: () => void;
    children?: React.ReactNode;
}

export function ErrorState({
    title,
    description,
    showRetry = true,
    showHome = true,
    onRetry,
    children,
}: ErrorStateProps) {
    const { t } = useTranslation("errors");
    title ??= t("state.title");
    description ??= t("state.description");
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
                            {t("state.retry")}
                        </Button>
                    )}
                    {showHome && (
                        <Link href="/">
                            <Button variant="outline" className="gap-2">
                                <Home className="w-4 h-4" />
                                {t("state.home")}
                            </Button>
                        </Link>
                    )}
                </div>

                {children}
            </CardContent>
        </Card>
    );
}

// Specific error messages, resolved in the language on screen. Getters keep
// the historical `errorMessages.notFound.title` call shape used across pages.
const ERROR_KEYS = ["network", "notFound", "productNotFound", "orderNotFound", "server", "unauthorized", "payment", "emptyCart", "outOfStock"] as const;
type ErrorKey = (typeof ERROR_KEYS)[number];
type ErrorMessage = { readonly title: string; readonly description: string };
export const errorMessages: Record<ErrorKey, ErrorMessage> = Object.fromEntries(
    ERROR_KEYS.map((key) => [
        key,
        {
            get title() {
                return i18next.t(`errors:${key}.title`);
            },
            get description() {
                return i18next.t(`errors:${key}.description`);
            },
        },
    ]),
) as Record<ErrorKey, ErrorMessage>;

// Hook for handling errors
export function useErrorMessage(errorType: keyof typeof errorMessages) {
    return errorMessages[errorType];
}
