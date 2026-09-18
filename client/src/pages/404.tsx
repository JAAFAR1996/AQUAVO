import { useLocation } from "wouter";
import { ErrorState, errorMessages } from "@/components/ui/error-state";
import { MetaTags } from "@/components/seo/meta-tags";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/locale-context";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation("errors");
  const { t: tc } = useTranslation("common");
  const { dir } = useLocale();

  return (
    <div className="flex-1 flex flex-col bg-background">
      <MetaTags
        title={tc("notFound.metaTitle")}
        description={tc("notFound.description")}
        noIndex
        notFound
      />
      <main id="main-content" className="flex-1 container mx-auto px-4 py-20 flex items-center justify-center">
        <div className="max-w-2xl mx-auto w-full">
          <ErrorState
            title={errorMessages.notFound.title}
            description={errorMessages.notFound.description}
            showRetry={false}
          >
            <div className="pt-12 space-y-4" dir={dir}>
              <p className="text-sm text-muted-foreground text-center">{t("page404.suggestions")}</p>
              <div className="flex flex-wrap gap-3 justify-center">
                {[
                  { label: t("page404.encyclopedia"), path: "/fish-encyclopedia" },
                  { label: t("page404.journey"), path: "/journey" },
                  { label: t("page404.home"), path: "/" },
                  { label: t("page404.products"), path: "/products" },
                ].map((link) => (
                  <button
                    key={link.path}
                    onClick={() => setLocation(link.path)}
                    className="px-4 py-2 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Animated 404 */}
            <div className="relative mt-8 flex flex-col items-center justify-center space-y-4">
              <h1 className="text-9xl font-black text-center select-none text-primary/20">404</h1>
              <p className="text-lg font-medium text-muted-foreground">{t("page404.hint")}</p>
            </div>
          </ErrorState>
        </div>
      </main>
    </div>
  );
}
