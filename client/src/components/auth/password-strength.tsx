import { useMemo } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
    password: string;
    showRequirements?: boolean;
}

interface PasswordRequirement {
    label: string;
    test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
    { label: "12 حرفاً على الأقل", test: (p) => p.length >= 12 },
    { label: "حرف كبير واحد على الأقل", test: (p) => /[A-Z]/.test(p) },
    { label: "حرف صغير واحد على الأقل", test: (p) => /[a-z]/.test(p) },
    { label: "رقم واحد على الأقل", test: (p) => /[0-9]/.test(p) },
    { label: "رمز خاص واحد على الأقل (!@#$%)", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export function PasswordStrength({ password, showRequirements = true }: PasswordStrengthProps) {
    const { score, label, color, bgColor } = useMemo(() => {
        if (!password) {
            return { score: 0, label: "", color: "bg-muted", bgColor: "bg-muted" };
        }

        const passedTests = requirements.filter((req) => req.test(password)).length;
        const percentage = (passedTests / requirements.length) * 100;

        if (percentage <= 20) {
            return { score: percentage, label: "ضعيفة جداً", color: "bg-red-500", bgColor: "bg-red-100" };
        } else if (percentage <= 40) {
            return { score: percentage, label: "ضعيفة", color: "bg-orange-500", bgColor: "bg-orange-100" };
        } else if (percentage <= 60) {
            return { score: percentage, label: "متوسطة", color: "bg-yellow-500", bgColor: "bg-yellow-100" };
        } else if (percentage <= 80) {
            return { score: percentage, label: "جيدة", color: "bg-lime-500", bgColor: "bg-lime-100" };
        } else {
            return { score: percentage, label: "قوية", color: "bg-green-500", bgColor: "bg-green-100" };
        }
    }, [password]);

    if (!password) {
        return null;
    }

    return (
        <div className="space-y-3">
            {/* Strength Bar */}
            <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">قوة كلمة المرور:</span>
                    <span className={cn(
                        "font-medium px-2 py-0.5 rounded-full text-xs",
                        bgColor,
                        score <= 40 ? "text-red-700" : score <= 60 ? "text-yellow-700" : "text-green-700"
                    )}>
                        {label}
                    </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                        className={cn("h-full transition-all duration-300", color)}
                        style={{ width: `${score}%` }}
                    />
                </div>
            </div>

            {/* Requirements List */}
            {showRequirements && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        متطلبات كلمة المرور:
                    </p>
                    <ul className="grid grid-cols-1 gap-1">
                        {requirements.map((req, index) => {
                            const passed = req.test(password);
                            return (
                                <li
                                    key={index}
                                    className={cn(
                                        "flex items-center gap-2 text-xs transition-colors",
                                        passed ? "text-green-600" : "text-muted-foreground"
                                    )}
                                >
                                    {passed ? (
                                        <Check className="w-3 h-3 text-green-500" />
                                    ) : (
                                        <X className="w-3 h-3 text-muted-foreground" />
                                    )}
                                    {req.label}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}

export function getPasswordStrengthScore(password: string): number {
    if (!password) return 0;
    const passedTests = requirements.filter((req) => req.test(password)).length;
    return (passedTests / requirements.length) * 100;
}

export function isPasswordStrong(password: string): boolean {
    return getPasswordStrengthScore(password) >= 60;
}
