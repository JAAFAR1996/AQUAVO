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
 */
const TEAM_AUTHOR_NAMES: readonly string[] = [
  "aquavo",
  "aquavo team",
  "aquavo editorial team",
  "فريق aquavo",
  "فريق تحرير aquavo",
  "فريق أكوافو",
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
