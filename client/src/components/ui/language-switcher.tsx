import { Check, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, SUPPORTED_LOCALES, type Locale } from "@shared/i18n/locales";
import { useLocale } from "@/i18n/locale-context";

interface LanguageSwitcherProps {
  /** "icon" for the compact header button, "full" for the mobile drawer row. */
  variant?: "icon" | "full";
  className?: string;
}

/**
 * Three-language selector. Names are shown in their own script, never as
 * flags (a flag names a country, not a language). The current language is
 * marked both visually and with aria-current, and each option carries `lang`
 * so screen readers switch voice per item.
 */
export function LanguageSwitcher({ variant = "icon", className = "" }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation("common");
  const current = LOCALES[locale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={variant === "icon" ? "sm" : "default"}
          className={`gap-2 rounded-full border-2 border-primary/20 bg-primary/5 px-3 hover:border-primary/40 hover:bg-primary/10 ${className}`}
          aria-label={t("language.change", { current: current.nativeName })}
          data-testid="language-switcher"
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
          <span lang={locale} className="text-sm font-medium">
            {current.nativeName}
          </span>
          <span aria-hidden="true" className="text-xs opacity-70">▾</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]" aria-label={t("language.menuLabel")}>
        {SUPPORTED_LOCALES.map((code: Locale) => {
          const def = LOCALES[code];
          const active = code === locale;
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => setLocale(code)}
              className="min-h-11 cursor-pointer justify-between gap-3"
              aria-current={active ? "true" : undefined}
              data-testid={`language-option-${code}`}
              lang={code}
              dir={def.dir}
            >
              <span className={active ? "font-semibold text-primary" : ""}>{def.nativeName}</span>
              {active && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
