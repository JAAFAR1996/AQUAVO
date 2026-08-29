import { describe, expect, it } from "vitest";

import {
  EDITORIAL_TEAM_PROFILE_PATH,
  articleAuthorEntity,
  authorProfilePath,
  isTeamAuthor,
} from "../../shared/editorial-author";
import { AQUAVO_BASE_URL, PUBLIC_INDEXABLE_PATHS } from "../../shared/seo-contract";
import { displayAuthorName } from "../../shared/author-name";

// 70 of the 81 published posts are authored "AQUAVO Team", and every surface
// emitted that as schema.org/Person — a named human being who does not exist.
// The eleven guides already had this right: they carry
// {"@type":"Organization","name":"AQUAVO"}. These tests hold the blog to the
// same standard, and pin that the visible byline and the schema name the same
// entity rather than drifting apart.

describe("team authorship is an Organization, not a Person", () => {
  it("recognises the team identities the corpus actually uses", () => {
    for (const name of ["AQUAVO Team", "AQUAVO Editorial Team", "AQUAVO", "aquavo team", "  AQUAVO Team  "]) {
      expect(isTeamAuthor(name), `${name} should be the team`).toBe(true);
    }
  });

  it("does not claim a real byline is the team", () => {
    for (const name of ["Jane Doe", "أحمد الربيعي"]) {
      expect(isTeamAuthor(name), `${name} should not be the team`).toBe(false);
    }
  });

  // شريمب is the storefront's AI chat assistant, cast in its system prompt as
  // an aquarium specialist of fifteen years' experience. Eleven published posts
  // carried it as a byline and reached Google as a Person. It is AQUAVO
  // editorial content, and resolving it to the team is what makes that true.
  it("treats the assistant persona as the team, not as a person", () => {
    for (const name of ["شريمب", "شريمب 🦐", "  شريمب  "]) {
      expect(isTeamAuthor(name), `${name} should resolve to the team`).toBe(true);
      expect(articleAuthorEntity(name)["@type"]).toBe("Organization");
    }
  });

  it("emits Organization for the team, pointing at the site organization entity", () => {
    const author = articleAuthorEntity("AQUAVO Team");
    expect(author["@type"]).toBe("Organization");
    expect(author["@id"]).toBe(`${AQUAVO_BASE_URL}/#organization`);
    expect(author.url).toBe(`${AQUAVO_BASE_URL}${EDITORIAL_TEAM_PROFILE_PATH}`);
    expect(author.name).toBe("AQUAVO");
  });

  it("still emits Person for a byline that names someone", () => {
    const author = articleAuthorEntity("Jane Doe 🦐");
    expect(author["@type"]).toBe("Person");
    // The emoji strip that already existed must survive untouched.
    expect(author.name).toBe(displayAuthorName("Jane Doe 🦐"));
    expect(author["@id"]).toBeUndefined();
  });

  it("invents nothing: no biography, no credential, no job title", () => {
    const team = articleAuthorEntity("AQUAVO Team") as Record<string, unknown>;
    for (const invented of ["description", "jobTitle", "knowsAbout", "award", "alumniOf", "sameAs", "image"]) {
      expect(team[invented], `${invented} was invented`).toBeUndefined();
    }
  });

  it("points the visible byline at the same page the schema url names", () => {
    expect(authorProfilePath("AQUAVO Team")).toBe(EDITORIAL_TEAM_PROFILE_PATH);
    // A named author has no profile page, so the byline stays plain text
    // rather than linking somewhere that does not describe them.
    expect(authorProfilePath("Jane Doe")).toBeUndefined();
  });

  it("uses a page that already exists and is already indexable", () => {
    expect(PUBLIC_INDEXABLE_PATHS).toContain(EDITORIAL_TEAM_PROFILE_PATH);
  });
});
