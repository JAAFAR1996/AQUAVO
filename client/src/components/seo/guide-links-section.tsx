import { useLocale } from "@/i18n/locale-context";
import { Link } from "wouter";
import { BookOpen } from "lucide-react";
import { guideLinksHeading, guidesForCategory } from "@shared/guide-links";

/**
 * The guides that belong to a product category, shown to a reader.
 *
 * Same map as the crawler-visible markup in api/_seo-preview-shell.tsx, so the
 * two never disagree about which guides a category has. Renders nothing when
 * the category is unknown rather than falling back to a default list: guides
 * picked for some other category are worse than none.
 */
export function GuideLinksSection({ category }: { category?: string | null }) {
  const { locale, dir } = useLocale();
  const links = guidesForCategory(category, locale);
  if (links.length === 0) return null;

  return (
    <section dir={dir} className="mt-10" aria-labelledby="guide-links-title">
      <h2 id="guide-links-title" className="mb-4 flex items-center gap-2 text-start text-xl font-semibold">
        <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
        {guideLinksHeading(locale)}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded-lg border border-border bg-card p-4 text-start text-sm leading-relaxed text-foreground transition-colors hover:border-primary hover:bg-accent"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
