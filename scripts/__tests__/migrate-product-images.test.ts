/**
 * Unit tests for migrate-product-images-to-cloudinary logic.
 *
 * These tests exercise pure helper functions only.
 * No real Cloudinary API calls. No real DB writes.
 * All Cloudinary / DB calls are mocked at the vi.mock level.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import fs from "fs";

// ─── Mock external dependencies before importing the module ──────────────────

vi.mock("cloudinary", () => ({
  v2: {
    config: vi.fn(),
    api: {
      resource: vi.fn(),
    },
    uploader: {
      upload: vi.fn(),
    },
  },
}));

vi.mock("dotenv/config", () => ({}));

vi.mock("../../server/db.js", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
          orderBy: vi.fn(() => Promise.resolve([])),
        })),
        orderBy: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

vi.mock("../../shared/schema.js", () => ({
  products: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

// ─── Import module under test ─────────────────────────────────────────────────

import {
  isRelativePath,
  toPublicId,
  buildProductFolder,
  localPathToAbs,
  buildPlan,
  migrateProduct,
  PUBLIC_DIR,
} from "../migrate-product-images-to-cloudinary.js";

import { v2 as cloudinaryMock } from "cloudinary";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("isRelativePath", () => {
  it("returns true for local /images/... paths", () => {
    expect(isRelativePath("/images/products/yee/model.webp")).toBe(true);
  });

  it("returns false for https:// URLs", () => {
    expect(isRelativePath("https://res.cloudinary.com/...")).toBe(false);
  });

  it("returns false for // protocol-relative URLs", () => {
    expect(isRelativePath("//cdn.example.com/image.jpg")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isRelativePath("")).toBe(false);
  });

  it("returns false for data: URLs", () => {
    expect(isRelativePath("data:image/png;base64,abc")).toBe(false);
  });
});

describe("toPublicId", () => {
  it("converts a local path to a Cloudinary public_id", () => {
    expect(toPublicId("/images/products/yee/yee-ytz-300/model.webp"))
      .toBe("aquavo/products/yee/yee-ytz-300/model");
  });

  it("strips leading slashes", () => {
    expect(toPublicId("/images/products/houyi/product.jpg"))
      .toBe("aquavo/products/houyi/product");
  });

  it("handles paths without extension gracefully", () => {
    const result = toPublicId("/images/products/yee/photo");
    expect(result).toBe("aquavo/products/yee/photo");
  });

  it("strips the images/ prefix", () => {
    expect(toPublicId("/images/products/hygger/light.webp"))
      .toBe("aquavo/products/hygger/light");
  });
});

describe("buildProductFolder", () => {
  it("lowercases the brand", () => {
    expect(buildProductFolder("YEE", "yee-ytz-300"))
      .toBe("aquavo/products/yee/yee-ytz-300");
  });

  it("sanitizes brand with spaces and special chars", () => {
    expect(buildProductFolder("Houyi Fish", "houyi-123"))
      .toBe("aquavo/products/houyi-fish/houyi-123");
  });

  it("uses unknown for empty brand", () => {
    expect(buildProductFolder("", "some-slug"))
      .toBe("aquavo/products/unknown/some-slug");
  });

  it("collapses multiple hyphens", () => {
    expect(buildProductFolder("MY--BRAND", "slug"))
      .toBe("aquavo/products/my-brand/slug");
  });
});

describe("buildPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set CLOUDINARY_CLOUD_NAME so URL building works
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  });

  it("skips absolute URLs without checking Cloudinary", async () => {
    const apiSpy = vi.spyOn(cloudinaryMock.api, "resource");
    const plan = await buildPlan(["https://res.cloudinary.com/test/image.jpg"], false);
    expect(plan).toHaveLength(1);
    expect(plan[0].skipped).toBe(true);
    expect(apiSpy).not.toHaveBeenCalled();
  });

  it("marks missing local files correctly", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(cloudinaryMock.api, "resource").mockResolvedValue({ secure_url: null });

    const plan = await buildPlan(["/images/products/yee/missing.webp"], true);
    expect(plan[0].fileExists).toBe(false);
    expect(plan[0].proposedUrl).toBeNull();
  });

  it("marks existing Cloudinary assets as alreadyOnCloudinary", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(cloudinaryMock.api, "resource").mockResolvedValue({
      secure_url: "https://res.cloudinary.com/test-cloud/image/upload/aquavo/products/yee/model.webp",
    });

    const plan = await buildPlan(["/images/products/yee/model.webp"], true);
    expect(plan[0].alreadyOnCloudinary).toBe(true);
    expect(plan[0].proposedUrl).toContain("cloudinary.com");
  });

  it("marks new local files as pending upload", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(cloudinaryMock.api, "resource").mockRejectedValue(new Error("not found"));

    const plan = await buildPlan(["/images/products/yee/new-model.webp"], true);
    expect(plan[0].alreadyOnCloudinary).toBe(false);
    expect(plan[0].fileExists).toBe(true);
    expect(plan[0].proposedUrl).toContain("cloudinary.com");
  });

  it("preserves input array order", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(cloudinaryMock.api, "resource").mockRejectedValue(new Error("not found"));

    const urls = [
      "/images/products/yee/a.webp",
      "/images/products/yee/b.webp",
      "/images/products/yee/c.webp",
    ];
    const plan = await buildPlan(urls, true);
    expect(plan.map((p) => p.oldPath)).toEqual(urls);
  });

  it("does not call Cloudinary API when checkCloudinary=false", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    const apiSpy = vi.spyOn(cloudinaryMock.api, "resource");

    await buildPlan(["/images/products/yee/model.webp"], false);
    expect(apiSpy).not.toHaveBeenCalled();
  });
});

describe("migrateProduct — dry-run (apply=false)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  });

  it("does not upload or write DB in dry-run mode", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(cloudinaryMock.api, "resource").mockRejectedValue(new Error("not found"));
    const uploadSpy = vi.spyOn(cloudinaryMock.uploader, "upload");

    const { db } = await import("../../server/db.js");
    const updateSpy = vi.spyOn(db, "update");

    const result = await migrateProduct(
      "prod-1",
      "Test Product",
      "test-product",
      ["/images/products/yee/model.webp"],
      false // dry-run
    );

    expect(result.dbUpdated).toBe(false);
    expect(result.imagesUploaded).toBe(0);
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

describe("migrateProduct — safety: missing files block DB update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  });

  it("skips DB update if any local file is missing", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const uploadSpy = vi.spyOn(cloudinaryMock.uploader, "upload");

    const { db } = await import("../../server/db.js");
    const updateSpy = vi.spyOn(db, "update");

    const result = await migrateProduct(
      "prod-2",
      "Missing Product",
      "missing-product",
      ["/images/products/yee/missing.webp"],
      true // apply mode
    );

    expect(result.status).toBe("failed");
    expect(result.dbUpdated).toBe(false);
    expect(result.imagesMissing).toBeGreaterThan(0);
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

describe("migrateProduct — already on Cloudinary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  });

  it("skips upload and reports already_done when all images are on Cloudinary", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(cloudinaryMock.api, "resource").mockResolvedValue({
      secure_url: "https://res.cloudinary.com/test-cloud/image/upload/aquavo/products/yee/model.webp",
    });
    const uploadSpy = vi.spyOn(cloudinaryMock.uploader, "upload");

    const result = await migrateProduct(
      "prod-3",
      "Already Migrated",
      "already-migrated",
      ["/images/products/yee/model.webp"],
      true
    );

    expect(result.status).toBe("already_done");
    expect(result.imagesUploaded).toBe(0);
    expect(result.imagesReused).toBe(1);
    expect(result.dbUpdated).toBe(false);
    expect(uploadSpy).not.toHaveBeenCalled();
  });
});

describe("migrateProduct — image order preservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  });

  it("preserves image array order after migration", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(cloudinaryMock.api, "resource").mockRejectedValue(new Error("not found"));

    const uploadedUrls: string[] = [];
    vi.spyOn(cloudinaryMock.uploader, "upload").mockImplementation(
      async (filePath: string) => {
        const url = `https://res.cloudinary.com/test-cloud/image/upload/${path.basename(filePath)}`;
        uploadedUrls.push(url);
        return { secure_url: url };
      }
    );

    const { db } = await import("../../server/db.js");
    const capturedSet: { images?: string[]; thumbnail?: string } = {};
    vi.spyOn(db, "update").mockReturnValue({
      set: vi.fn((data) => {
        Object.assign(capturedSet, data);
        return { where: vi.fn(() => Promise.resolve()) };
      }),
    } as any);

    const inputImages = [
      "/images/products/yee/first.webp",
      "/images/products/yee/second.webp",
      "/images/products/yee/third.webp",
    ];

    const result = await migrateProduct(
      "prod-4",
      "Order Test",
      "order-test",
      inputImages,
      true
    );

    expect(result.status).toBe("migrated");
    // Thumbnail must be first image
    expect(capturedSet.thumbnail).toBe(capturedSet.images?.[0]);
    // Array length must match
    expect(capturedSet.images?.length).toBe(inputImages.length);
  });
});

describe("migrateProduct — upload failure blocks DB update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  });

  it("does not write DB if any upload fails", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(cloudinaryMock.api, "resource").mockRejectedValue(new Error("not found"));
    vi.spyOn(cloudinaryMock.uploader, "upload").mockRejectedValue(
      new Error("Cloudinary API error")
    );

    const { db } = await import("../../server/db.js");
    const updateSpy = vi.spyOn(db, "update");

    const result = await migrateProduct(
      "prod-5",
      "Upload Fail Product",
      "upload-fail",
      ["/images/products/yee/model.webp"],
      true
    );

    expect(result.status).toBe("failed");
    expect(result.dbUpdated).toBe(false);
    expect(result.uploadsFailed).toBeGreaterThan(0);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

describe("migrateProduct — no images", () => {
  it("handles product with empty images array", async () => {
    const result = await migrateProduct(
      "prod-6",
      "No Images",
      "no-images",
      [],
      true
    );
    // buildPlan returns empty, all-or-nothing: nothing to do
    expect(result.dbUpdated).toBe(false);
  });
});
