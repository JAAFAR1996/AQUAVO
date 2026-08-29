import { CATEGORY_CHECKS_HEADING, categoryContent } from "@shared/category-content";

/**
 * What a buyer needs to know about a category before choosing.
 *
 * Same shared module the crawler-visible markup in api/_seo-preview-shell.tsx
 * reads, so a reader and Googlebot are shown the same words. Renders nothing
 * when the category is not one of the eleven: filler written for some other
 * category is worse than none.
 */
export function CategoryIntro({ category }: { category?: string | null }) {
  const content = categoryContent(category);
  if (!content) return null;

  return (
    <section className="mt-8 rounded-xl border border-border bg-card/50 p-5 sm:p-6" aria-labelledby="category-checks-title">
      <div className="space-y-3 text-right text-sm leading-7 text-muted-foreground sm:text-base">
        {content.intro.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <h2 id="category-checks-title" className="mt-6 mb-3 text-right text-lg font-semibold text-foreground">
        {CATEGORY_CHECKS_HEADING}
      </h2>
      <ul className="space-y-2 text-right text-sm leading-7 text-muted-foreground">
        {content.checks.map((check) => (
          <li key={check} className="flex gap-2">
            <span aria-hidden="true" className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{check}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
