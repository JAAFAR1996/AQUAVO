import { describe, expect, it } from "vitest";
import {
  PUBLIC_REVIEW_FIELDS,
  findForbiddenFieldPaths,
  toPublicReview,
  toPublicReviews,
} from "../../shared/public-product";

/**
 * `GET /api/reviews/:productId` is public and unauthenticated.
 *
 * It returned `{ ...review }` — the raw database row — so every approved review
 * published the reviewer's `ipAddress` and `userId` to anyone who asked.
 * Verified live before the fix on an ordinary product review:
 *
 *   "ipAddress": "162.158.210.203", "userId": "6c420beb-…", "status": "approved"
 *
 * An IP address is personal data on its own; paired with a named author it
 * deanonymises the reviewer. This is the same class of mistake, in the same
 * shape, as the unprojected product SELECT that published the cost basis — and
 * it is fixed the same way, with an allowlist that fails closed.
 */

const REVIEW_ROW = {
  id: "39ae1ddb-415a-40b4-858a-898ab36edb80",
  productId: "yee-c4-1123-1a",
  userId: "6c420beb-e905-4a00-9989-efedc0e0f163",
  rating: 5,
  title: null,
  comment: "جيدة جدا و تساعد على متابعة كيمياء الحوض",
  images: [],
  videoUrl: null,
  status: "approved",
  ipAddress: "162.158.210.203",
  helpfulCount: 0,
  verifiedPurchase: false,
  createdAt: "2026-06-05T16:18:46.742Z",
  updatedAt: "2026-06-05T16:18:46.742Z",
  author: "زهراء تحسين",
  authorTier: "bronze",
};

describe("the public review boundary", () => {
  it("drops the reviewer's IP address", () => {
    expect(toPublicReview(REVIEW_ROW)).not.toHaveProperty("ipAddress");
  });

  it("drops the reviewer's user id", () => {
    expect(toPublicReview(REVIEW_ROW)).not.toHaveProperty("userId");
  });

  it("drops the moderation status, which tells a visitor nothing", () => {
    // Only approved reviews are ever returned, so the field carries no
    // information — it only advertises that a moderation state exists.
    expect(toPublicReview(REVIEW_ROW)).not.toHaveProperty("status");
  });

  it("keeps everything the storefront actually renders", () => {
    const publicReview = toPublicReview(REVIEW_ROW);
    expect(publicReview.rating).toBe(5);
    expect(publicReview.comment).toBe(REVIEW_ROW.comment);
    expect(publicReview.author).toBe("زهراء تحسين");
    expect(publicReview.authorTier).toBe("bronze");
    expect(publicReview.createdAt).toBe(REVIEW_ROW.createdAt);
    expect(publicReview.verifiedPurchase).toBe(false);
  });

  it("fails closed: a column added by a future migration is not published", () => {
    const withNewColumn = { ...REVIEW_ROW, moderatorNote: "leave it", reviewerEmail: "a@b.c" };
    const publicReview = toPublicReview(withNewColumn);
    expect(publicReview).not.toHaveProperty("moderatorNote");
    expect(publicReview).not.toHaveProperty("reviewerEmail");
    // Only ever the named keys.
    for (const key of Object.keys(publicReview)) {
      expect(PUBLIC_REVIEW_FIELDS as readonly string[]).toContain(key);
    }
  });

  it("adds no undefined padding for keys the row does not have", () => {
    const sparse = { id: "r1", rating: 4, comment: "زين" };
    expect(Object.keys(toPublicReview(sparse)).sort()).toEqual(["comment", "id", "rating"]);
  });

  it("trips no forbidden-field tripwire", () => {
    expect(findForbiddenFieldPaths(toPublicReview(REVIEW_ROW))).toEqual([]);
  });

  it("converts a list and drops non-objects rather than passing them through", () => {
    const list = toPublicReviews([REVIEW_ROW, null, "nope", 7, { ...REVIEW_ROW, id: "r2" }]);
    expect(list).toHaveLength(2);
    for (const review of list) {
      expect(review).not.toHaveProperty("ipAddress");
      expect(review).not.toHaveProperty("userId");
    }
  });

  it("returns an empty list for a non-array", () => {
    expect(toPublicReviews(null)).toEqual([]);
    expect(toPublicReviews(undefined)).toEqual([]);
    expect(toPublicReviews({})).toEqual([]);
  });
});

describe("the route itself goes through the boundary", () => {
  it("never spreads a review row into the response", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(resolve(process.cwd(), "server/routes/reviews.ts"), "utf8");

    expect(source).toContain("toPublicReview(");
    // The exact shape that leaked: a bare spread straight into the response.
    expect(source).not.toMatch(/return\s*\{\s*\n\s*\.\.\.review,/);
  });
});
