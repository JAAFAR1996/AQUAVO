import { CATEGORY_CHECKS_HEADING, categoryContent } from "@shared/category-content";
import { categoryFaqHeading, categorySearch } from "@shared/category-search";
import { FAQSchema } from "@/components/seo/meta-tags";
import { useLocale } from "@/i18n/locale-context";

/**
 * What a buyer needs to know about a category before choosing.
 *
 * Same shared modules the crawler-visible markup in api/_seo-preview-shell.tsx
 * reads, so a reader and Googlebot are shown the same words. Renders nothing
 * when the category is not one of the eleven: filler written for some other
 * category is worse than none.
 *
 * The intro paragraphs and checks exist in Arabic only; the three questions
 * exist in all three languages, so an English or Kurdish reader is shown the
 * questions and nothing in a language they did not ask for.
 */
export function CategoryIntro({ category }: { category?: string | null }) {
  const { locale } = useLocale();
  const content = locale === "ar" ? categoryContent(category) : undefined;
  const search = categorySearch(category, locale);
  if (!content && !search) return null;

  return (
    <section className="mt-8 rounded-xl border border-border bg-card/50 p-5 sm:p-6" aria-labelledby={content ? "category-checks-title" : "category-faq-title"}>
      {content && (
        <>
          <div className="space-y-3 text-start text-sm leading-7 text-muted-foreground sm:text-base">
            {content.intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <h2 id="category-checks-title" className="mt-6 mb-3 text-start text-lg font-semibold text-foreground">
            {CATEGORY_CHECKS_HEADING}
          </h2>
          <ul className="space-y-2 text-start text-sm leading-7 text-muted-foreground">
            {content.checks.map((check) => (
              <li key={check} className="flex gap-2">
                <span aria-hidden="true" className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {search && (
        <>
          {/* The three questions are visible here, which is what makes the
              FAQPage markup below legitimate. See shared/category-search.ts. */}
          <h2 id="category-faq-title" className={`${content ? "mt-8" : ""} mb-3 text-start text-lg font-semibold text-foreground`}>
            {categoryFaqHeading(locale)}
          </h2>
          <dl className="space-y-4 text-start">
            {search.faq.map((item) => (
              <div key={item.question}>
                <dt className="text-sm font-semibold text-foreground sm:text-base">{item.question}</dt>
                <dd className="mt-1 text-sm leading-7 text-muted-foreground">{item.answer}</dd>
              </div>
            ))}
          </dl>
          <FAQSchema questions={search.faq.map((item) => ({ question: item.question, answer: item.answer }))} />
        </>
      )}
    </section>
  );
}
