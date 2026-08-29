import { AQUAVO_BASE_URL, AQUAVO_ENTITY } from "./seo-contract.js";
import { displayAuthorName } from "./author-name.js";

/**
 * Who an article says wrote it.
 *
 * 70 of the 81 published posts carry the author "AQUAVO Team", and every
 * surface emitted that as schema.org/Person — a named human being who does not
 * exist. Google reads Person.name as a claim about an individual, and there is
 * no individual here to name. The eleven guides already had this right: they
 * emit {"@type":"Organization","name":"AQUAVO"}. This makes the blog agree.
 *
 * It resolves to Organization only for the identities the corpus actually uses
 * for the team. A post that names someone still gets a Person, because that is
 * what it is; the sanitiser in author-name.ts still strips decoration from it.
 *
 * Nothing here fabricates. There is no biography, no credential, no job title,
 * no sameAs, and no modified date — an Organization author with no verified
 * facts attached is the honest shape, and inventing an editorial persona to
 * fill it would be the same error in the other direction.
 */

/**
 * The identities that mean "the AQUAVO team", not a person. Compared
 * case-insensitively after trimming, against the sanitised name, so a stored
 * value that picked up whitespace or decoration still resolves.
 *
 * "شريمب" belongs here, and it is the reason this list is not simply the
 * AQUAVO spellings. شريمب is not a contributor. It is the storefront's AI
 * assistant persona: it introduces itself in the chat widget
 * (client/src/components/chat/ai-chat-bot.tsx) and its system prompt casts it
 * as "أخصائي أحواض أسماك بخبرة 15 سنة" — an aquarium specialist with fifteen
 * years of experience (server/services/gemini-ai.ts). No such person exists.
 *
 * Eleven published posts carry that byline, because the automatic generator
 * stamped it on everything it wrote and the column default applied it to
 * anything else, and every one of them reached Google as
 * {"@type":"Person","name":"شريمب"} — a claim that a named human with fifteen
 * years in the hobby wrote the article. That is invented authorship and
 * invented experience at once, which is the strongest version of the thing
 * this module exists to prevent.
 *
 * The honest reading is that these posts are AQUAVO editorial content, so they
 * resolve to the same Organization as the rest of it. The alternative —
 * keeping a Person and merely removing the emoji — leaves the fabricated human
 * in place with better punctuation.
 */
const TEAM_AUTHOR_NAMES: readonly string[] = [
  "aquavo",
  "aquavo team",
  "aquavo editorial team",
  "فريق aquavo",
  "فريق تحرير aquavo",
  "فريق أكوافو",
  "شريمب",
];

/**
 * The page the editorial-team identity points at.
 *
 * /about is used rather than a new page invented for the purpose. It already
 * exists, is already in PUBLIC_INDEXABLE_PATHS and the sitemap, and already
 * describes AQUAVO. A dedicated editorial-team page would need biographies,
 * credentials or an editorial process to justify its existence, and none of
 * those are facts anyone has established — writing them would be fabrication.
 */
export const EDITORIAL_TEAM_PROFILE_PATH = "/about";

/**
 * What a reader sees where the team is the author.
 *
 * The schema node stays named "AQUAVO" and keeps the site Organization's @id,
 * so a crawler resolves author and publisher to one entity. A human reading a
 * byline is better served by the Arabic phrase that says what that entity is,
 * and the stored values it replaces are inconsistent anyway — "AQUAVO Team" on
 * seventy posts, the assistant persona on eleven. Both now read the same.
 *
 * This is a label for an entity that exists, not an invented masthead: it
 * carries no editor names, no credentials and no editorial-process claims,
 * because none of those have been established.
 */
export const EDITORIAL_TEAM_BYLINE = "فريق AQUAVO التحريري";

/**
 * The value to store in `blog_posts.author` for AQUAVO editorial content,
 * including anything the automatic generator writes. It is one of the
 * identities `isTeamAuthor` recognises, so it renders as the editorial byline
 * and resolves to the Organization rather than to a person.
 */
export const EDITORIAL_TEAM_AUTHOR = "AQUAVO Editorial Team";

export function isTeamAuthor(raw: string | null | undefined): boolean {
  const name = displayAuthorName(raw).trim().toLowerCase();
  return TEAM_AUTHOR_NAMES.includes(name);
}

export type ArticleAuthorEntity = {
  "@type": "Organization" | "Person";
  name: string;
  "@id"?: string;
  url?: string;
};

/**
 * The author node for an Article or BlogPosting.
 *
 * For the team it carries the @id of the site Organization node that every
 * page already emits, so the author and the publisher are recognisably the
 * same entity rather than two organisations with the same name.
 */
export function articleAuthorEntity(raw: string | null | undefined): ArticleAuthorEntity {
  if (isTeamAuthor(raw)) {
    return {
      "@type": "Organization",
      name: AQUAVO_ENTITY.brandName,
      "@id": `${AQUAVO_BASE_URL}/#organization`,
      url: `${AQUAVO_BASE_URL}${EDITORIAL_TEAM_PROFILE_PATH}`,
    };
  }
  return { "@type": "Person", name: displayAuthorName(raw) };
}

/**
 * Where a visible byline should link, so a reader and the schema arrive at the
 * same entity. A named author has no profile page, so their byline stays plain
 * text rather than linking somewhere that does not describe them.
 */
export function authorProfilePath(raw: string | null | undefined): string | undefined {
  return isTeamAuthor(raw) ? EDITORIAL_TEAM_PROFILE_PATH : undefined;
}

/**
 * The byline text for a stored author value: the editorial-team phrase where
 * the team is responsible, and otherwise the stored name with decoration
 * stripped. It never invents a name it was not given.
 */
export function authorBylineText(raw: string | null | undefined): string {
  return isTeamAuthor(raw) ? EDITORIAL_TEAM_BYLINE : displayAuthorName(raw);
}
