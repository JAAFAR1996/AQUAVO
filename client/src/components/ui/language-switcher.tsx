import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, SUPPORTED_LOCALES, type Locale } from "@shared/i18n/locales";
import { LOCALE_PREVIEW_COOKIE, isLocaleReleased } from "@shared/i18n/release";
import { useLocale } from "@/i18n/locale-context";

/**
 * Locales offered to this visitor: Arabic plus released locales, plus the
 * current one (a direct /en URL must still be able to switch back). QA and
 * previews see all three with VITE_I18N_PREVIEW_LOCALES=1 or the preview cookie.
 */
function offeredLocales(current: Locale): Locale[] {
  const preview = import.meta.env.VITE_I18N_PREVIEW_LOCALES === "1" || (typeof document !== "undefined" && document.cookie.split(";").some((c) => c.trim() === `${LOCALE_PREVIEW_COOKIE}=1`));
  if (preview) return [...SUPPORTED_LOCALES];
  return SUPPORTED_LOCALES.filter((l) => l === current || isLocaleReleased(l));
}

const LOCALE_SHORT_LABELS: Readonly<Record<Locale, string>> = Object.freeze({
  ar: "ع",
  en: "EN",
  ckb: "KU",
});

interface LanguageSwitcherProps {
  /** "compact" is the short-code mobile control; other variants keep the same short-code trigger with more spacing. */
  variant?: "icon" | "full" | "compact";
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
  const offered = offeredLocales(locale);
  const compact = variant === "compact";
  // Nothing to switch to: no control at all rather than a one-item menu.
  if (offered.length < 2) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : variant === "icon" ? "sm" : "default"}
          className={compact
            ? `h-11 w-11 shrink-0 rounded-full border border-primary/25 bg-primary/5 p-0 text-primary hover:border-primary/45 hover:bg-primary/10 ${className}`
            : `gap-2 rounded-full border-2 border-primary/20 bg-primary/5 px-3 hover:border-primary/40 hover:bg-primary/10 ${className}`}
          aria-label={t("language.change", { current: current.nativeName })}
          data-testid="language-switcher"
          data-variant={variant}
        >
          <span
            lang={locale}
            dir="ltr"
            className={compact ? "text-sm font-bold leading-none" : "text-sm font-semibold leading-none"}
            aria-hidden="true"
          >
            {LOCALE_SHORT_LABELS[locale]}
          </span>
          {!compact && <span aria-hidden="true" className="text-xs opacity-70">▾</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        dir="ltr"
        className="grid min-w-[168px] grid-cols-3 gap-1 p-1"
        aria-label={t("language.menuLabel")}
      >
        {offered.map((code: Locale) => {
          const def = LOCALES[code];
          const active = code === locale;
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => setLocale(code)}
              className={`relative min-h-10 min-w-0 cursor-pointer justify-center rounded-md px-2 text-center ${active ? "bg-primary/10 text-primary" : ""}`}
              aria-current={active ? "true" : undefined}
              aria-label={def.nativeName}
              title={def.nativeName}
              data-testid={`language-option-${code}`}
              lang={code}
              dir="ltr"
            >
              <span className="text-sm font-semibold leading-none">{LOCALE_SHORT_LABELS[code]}</span>
              {active && <Check className="absolute end-1 top-1 h-3 w-3 text-primary" aria-hidden="true" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
