import { useMemo } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    validatePasswordPolicy,
} from "@shared/password-policy";

interface PasswordStrengthProps {
    password: string;
    showRequirements?: boolean;
}

export function PasswordStrength({ password, showRequirements = true }: PasswordStrengthProps) {
    const { score, label, color, bgColor } = useMemo(() => {
        if (!password) {
            return { score: 0, label: "", color: "bg-muted", bgColor: "bg-muted" };
        }

        const ratio = Math.min(1, password.length / PASSWORD_MIN_LENGTH);
        const score = Math.round(ratio * 100);
        if (score < 50) return { score, label: "قصيرة", color: "bg-red-500", bgColor: "bg-red-100" };
        if (score < 100) return { score, label: "تحتاج طول أكثر", color: "bg-yellow-500", bgColor: "bg-yellow-100" };
        return { score, label: "طول مناسب", color: "bg-green-500", bgColor: "bg-green-100" };
    }, [password]);

    if (!password) return null;

    const policy = validatePasswordPolicy(password);
    const longEnough = password.length >= PASSWORD_MIN_LENGTH;
    const withinMaximum = password.length <= PASSWORD_MAX_LENGTH;
    const notCommon = policy.reason !== "common";

    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">قوة كلمة المرور:</span>
                    <span className={cn(
                        "font-medium px-2 py-0.5 rounded-full text-xs",
                        bgColor,
                        score < 50 ? "text-red-700" : score < 100 ? "text-yellow-700" : "text-green-700"
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

            {showRequirements && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        متطلبات كلمة المرور:
                    </p>
                    <ul className="grid grid-cols-1 gap-1">
                        <Requirement ok={longEnough} text={`${PASSWORD_MIN_LENGTH} حرف على الأقل — العبارات الطويلة أفضل`} />
                        <Requirement ok={withinMaximum} text={`بحد أقصى ${PASSWORD_MAX_LENGTH} حرف`} />
                        <Requirement ok={notCommon} text="مو كلمة مرور شائعة أو سهلة التخمين" />
                    </ul>
                    <p className="text-[11px] leading-5 text-muted-foreground">
                        تكدر تستخدم مسافات وعربي وإنكليزي ورموز. ما نفرض خلط أنواع أحرف بشكل مصطنع.
                    </p>
                </div>
            )}
        </div>
    );
}

function Requirement({ ok, text }: { ok: boolean; text: string }) {
    return (
        <li className={cn("flex items-center gap-2 text-xs", ok ? "text-green-600" : "text-muted-foreground")}>
            {ok ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-muted-foreground" />}
            {text}
        </li>
    );
}

export function getPasswordStrengthScore(password: string): number {
    if (!password) return 0;
    return Math.min(100, Math.round((password.length / PASSWORD_MIN_LENGTH) * 100));
}

export function isPasswordStrong(password: string): boolean {
    return validatePasswordPolicy(password).valid;
}
