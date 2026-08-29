/**
 * The dates an article is allowed to claim.
 *
 * Two claims were being published that the data does not support.
 *
 * FIRST PUBLICATION. Ten posts carry a `published_at` that predates the row
 * itself. Every one of them was inserted on 2026-02-23 and stamped with a
 * date from the previous autumn, spaced at roughly weekly intervals:
 *
 *   algae-war-guide                published_at 2025-10-31, created 2026-02-23
 *   filter-types-guide             published_at 2025-11-04, created 2026-02-23
 *   budget-aquascaping             published_at 2025-11-09, created 2026-02-23
 *   … seven more, through 2025-12-27
 *
 * That is a publishing history that did not happen, and `datePublished` was
 * carrying it to Google. A page cannot have been published before the record
 * of it existed, so the earliest date this will state is the row's own
 * creation. The remaining 71 posts are unaffected: their `published_at` is at
 * or after their `created_at`, which is what a genuine publication looks like.
 *
 * LAST MODIFICATION. `updated_at` records any write to the row — an image URL
 * repair, a slug correction, a category rename. Six posts carry 2026-07-24
 * from one such pass. None of them had their article text rewritten, so
 * publishing that as `dateModified` claims a substantive revision that never
 * took place. There is no column recording when the prose last changed, so
 * there is nothing here to publish honestly, and this omits the field rather
 * than dressing a maintenance write as an update. When a real content-revision
 * timestamp exists, `dateModified` should be derived from that and from
 * nothing else.
 *
 * Both rules run at the render boundary, the same place the authorship fix
 * runs, so every surface agrees. Neither one edits the database.
 */

export type ArticleDateSource = {
  publishedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

export type ArticleDates = {
  /** ISO first-publication date, or undefined when the article has none. */
  datePublished?: string;
  /**
   * Always undefined for now. Kept as a named field so call sites read as a
   * deliberate omission rather than an oversight, and so the day a real
   * revision timestamp arrives there is one place to fill in.
   */
  dateModified?: string;
};

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * The first-publication date an article may state: its stored `published_at`,
 * unless that predates the row, in which case the row's creation is the
 * earliest defensible date.
 */
export function articleDatePublished(source: ArticleDateSource): string | undefined {
  const published = toIso(source.publishedAt);
  const created = toIso(source.createdAt);
  if (!published) return created;
  if (!created) return published;
  return published < created ? created : published;
}

/** Both dates an article may publish, with the modification claim withheld. */
export function articleDates(source: ArticleDateSource): ArticleDates {
  return { datePublished: articleDatePublished(source), dateModified: undefined };
}
