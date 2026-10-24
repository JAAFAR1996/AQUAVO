import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ConceptLookbook, CONCEPT_LOOKBOOK_COPY_AR as copy, CONCEPT_SCENES } from "../concept-lookbook";
import { SHOP_CATEGORY_LINKS } from "@/lib/product-category-links";

describe("AI illustrative lookbook", () => {
  it("shows three distinct honest concepts with visible disclosure, never fake projects or commerce controls", () => {
    const { container } = render(<ConceptLookbook />);
    expect(screen.getAllByRole("figure")).toHaveLength(3);
    for (const disclosure of screen.getAllByText(copy.disclosure)) expect(disclosure).toBeVisible();
    expect(screen.getByText(copy.navigationNote)).toBeVisible();
    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(new Set(CONCEPT_SCENES.map(scene => scene.src)).size).toBe(3);
    for (const image of screen.getAllByRole("img")) expect(image.getAttribute("alt")).toContain("الذكاء الاصطناعي");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/IQD|د\.ع|السعر|أضف للسلة|باقة متكاملة|مشروع زبون حقيقي/);
    for (const key of ["decor", "lighting", "filters"] as const) {
      expect(screen.getByText(copy.categories[key].title)).toBeVisible();
    }
  });

  it("only navigates to existing category pages and the existing journey", () => {
    render(<ConceptLookbook />);
    expect(screen.getAllByRole("link").map(link => link.getAttribute("href"))).toEqual([
      SHOP_CATEGORY_LINKS.decor, SHOP_CATEGORY_LINKS.lighting, SHOP_CATEGORY_LINKS.filters, "/journey",
    ]);
  });

  it("keeps every navigation link keyboard reachable without hover or an overlay", async () => {
    const user = userEvent.setup();
    render(<ConceptLookbook />);
    for (const link of screen.getAllByRole("link")) {
      await user.tab();
      expect(link).toHaveFocus();
      expect(link).toHaveClass("focus-visible:ring-2");
    }
  });

  it("preserves the disclosure and navigation after image failure", () => {
    render(<ConceptLookbook />);
    fireEvent.error(screen.getAllByRole("img")[0]);
    expect(screen.getByText(copy.imageUnavailable)).toBeVisible();
    for (const disclosure of screen.getAllByText(copy.disclosure)) expect(disclosure).toBeVisible();
    expect(screen.getAllByRole("link")).toHaveLength(4);
  });

  it("supports future distinct assets as normal-flow figures, with disclosure on each", () => {
    render(<ConceptLookbook scenes={[CONCEPT_SCENES[0], { ...CONCEPT_SCENES[0], id: "future-test-fixture", src: "/test-only.webp" }]} />);
    expect(screen.getAllByRole("figure")).toHaveLength(2);
    expect(screen.getAllByText(copy.disclosure)).toHaveLength(2);
  });

  it("retains disclosure and navigation if no images are supplied", () => {
    render(<ConceptLookbook scenes={[]} dir="ltr" />);
    for (const disclosure of screen.getAllByText(copy.disclosure)) expect(disclosure).toBeVisible();
    expect(screen.getAllByRole("link")).toHaveLength(4);
  });
});
