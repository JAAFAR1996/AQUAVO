/**
 * ProductImageGallery accessibility + RTL behavior tests.
 *
 * This app reads right-to-left, so "next" must be mirrored to the left and
 * "previous" to the right (matching the ChevronRight=previous / ChevronLeft=next
 * convention used elsewhere in the app, e.g. customers-management.tsx pagination).
 * Arrow keys should mirror the on-screen position of the buttons they trigger.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductImageGallery } from "../product-image-gallery";

const images = ["/images/a.jpg", "/images/b.jpg", "/images/c.jpg"];

describe("ProductImageGallery", () => {
    it("gives the gallery region an accessible name and role", () => {
        render(<ProductImageGallery images={images} productName="فلتر اختبار" />);
        expect(screen.getByRole("group", { name: /استخدم مفاتيح الأسهم/ })).toBeInTheDocument();
    });

    it("labels the previous/next controls in Arabic with a discernible name", () => {
        render(<ProductImageGallery images={images} productName="فلتر اختبار" />);
        expect(screen.getByRole("button", { name: "الصورة السابقة" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "الصورة التالية" })).toBeInTheDocument();
    });

    it("positions previous on the right and next on the left (RTL mirroring)", () => {
        render(<ProductImageGallery images={images} productName="فلتر اختبار" />);
        const previous = screen.getByRole("button", { name: "الصورة السابقة" });
        const next = screen.getByRole("button", { name: "الصورة التالية" });
        expect(previous.className).toMatch(/right-2/);
        expect(next.className).toMatch(/left-2/);
    });

    it("moves to the next image when the next control is clicked", async () => {
        const user = userEvent.setup();
        render(<ProductImageGallery images={images} productName="فلتر اختبار" />);
        expect(screen.getByText("1 / 3")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "الصورة التالية" }));
        expect(screen.getByText("2 / 3")).toBeInTheDocument();
    });

    it("ArrowLeft (visually next) advances and ArrowRight (visually previous) goes back", () => {
        render(<ProductImageGallery images={images} productName="فلتر اختبار" />);
        const region = screen.getByRole("group", { name: /استخدم مفاتيح الأسهم/ });

        fireEvent.keyDown(region, { key: "ArrowLeft" });
        expect(screen.getByText("2 / 3")).toBeInTheDocument();

        fireEvent.keyDown(region, { key: "ArrowRight" });
        expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });

    it("opens the lightbox with Enter on the gallery region (keyboard-only access)", () => {
        render(<ProductImageGallery images={images} productName="فلتر اختبار" />);
        const region = screen.getByRole("group", { name: /استخدم مفاتيح الأسهم/ });
        fireEvent.keyDown(region, { key: "Enter" });
        expect(screen.getByRole("button", { name: "إغلاق معرض الصور" })).toBeInTheDocument();
    });

    it("marks the current thumbnail as pressed for screen readers", async () => {
        const user = userEvent.setup();
        render(<ProductImageGallery images={images} productName="فلتر اختبار" />);
        const firstThumb = screen.getByRole("button", { name: "عرض الصورة 1" });
        const secondThumb = screen.getByRole("button", { name: "عرض الصورة 2" });
        expect(firstThumb).toHaveAttribute("aria-pressed", "true");
        expect(secondThumb).toHaveAttribute("aria-pressed", "false");

        await user.click(secondThumb);
        expect(secondThumb).toHaveAttribute("aria-pressed", "true");
    });

    it("gives every main-image alt text a meaningful, product-specific description", () => {
        render(<ProductImageGallery images={images} productName="فلتر اختبار" />);
        expect(screen.getByRole("img", { name: "فلتر اختبار - صورة 1" })).toBeInTheDocument();
    });

    // WCAG 44x44 touch-target regression: the shared `size="icon"` Button
    // variant collapses to 36x36 at the md breakpoint unless an explicit
    // md: override is added (tailwind-merge treats md: as a separate merge
    // group). These assertions pin each control's intended size at desktop
    // so the collapse can't silently reappear.
    it("keeps the main-image previous/next controls at 44x44 at desktop (md:)", () => {
        render(<ProductImageGallery images={images} productName="فلتر اختبار" />);
        const previous = screen.getByRole("button", { name: "الصورة السابقة" });
        const next = screen.getByRole("button", { name: "الصورة التالية" });
        expect(previous).toHaveClass("h-11", "w-11", "md:h-11", "md:w-11");
        expect(next).toHaveClass("h-11", "w-11", "md:h-11", "md:w-11");
    });

    it("keeps the lightbox close control at 44x44 at desktop (md:)", () => {
        render(<ProductImageGallery images={images} productName="فلتر اختبار" />);
        fireEvent.click(screen.getAllByRole("img", { name: /فلتر اختبار/ })[0]);
        const close = screen.getByRole("button", { name: "إغلاق معرض الصور" });
        expect(close).toHaveClass("h-11", "w-11", "md:h-11", "md:w-11");
    });

    it("keeps the lightbox previous/next controls at 48x48 (not collapsed to 44/36) at desktop", () => {
        render(<ProductImageGallery images={images} productName="فلتر اختبار" />);
        fireEvent.click(screen.getAllByRole("img", { name: /فلتر اختبار/ })[0]);
        const buttons = screen.getAllByRole("button", { name: "الصورة السابقة" });
        const previous = buttons[buttons.length - 1];
        const nextButtons = screen.getAllByRole("button", { name: "الصورة التالية" });
        const next = nextButtons[nextButtons.length - 1];
        expect(previous).toHaveClass("w-12", "h-12", "md:h-12", "md:w-12");
        expect(next).toHaveClass("w-12", "h-12", "md:h-12", "md:w-12");
    });

    it("navigates within the lightbox using the previous/next controls", () => {
        render(<ProductImageGallery images={images} productName="فلتر اختبار" />);
        fireEvent.click(screen.getAllByRole("img", { name: /فلتر اختبار/ })[0]);
        const nextButtons = screen.getAllByRole("button", { name: "الصورة التالية" });
        const lightboxNext = nextButtons[nextButtons.length - 1];
        fireEvent.click(lightboxNext);
        expect(screen.getByRole("img", { name: "فلتر اختبار" })).toBeInTheDocument();
    });

    it("marks decorative chevron/close icons as aria-hidden", () => {
        const { container } = render(<ProductImageGallery images={images} productName="فلتر اختبار" />);
        fireEvent.click(screen.getAllByRole("img", { name: /فلتر اختبار/ })[0]);
        const hiddenIcons = container.querySelectorAll('svg[aria-hidden="true"]');
        expect(hiddenIcons.length).toBeGreaterThan(0);
        hiddenIcons.forEach((icon) => {
            expect(icon).toHaveAttribute("aria-hidden", "true");
        });
    });

    /**
     * Repeated image URLs.
     *
     * The gallery previously used `key={image}` and derived every piece of
     * thumbnail state from `galleryImages.indexOf(image)`. With a product whose
     * `images` array repeats a URL that produced two real defects: React logged
     * duplicate-key warnings, and `indexOf` always resolved to the FIRST match,
     * so activating the third thumbnail selected the first image. Both are now
     * positional. Order is preserved and duplicates are NOT removed — a product
     * may legitimately list the same asset twice.
     */
    describe("repeated image URLs", () => {
        const repeated = ["/images/a.jpg", "/images/a.jpg", "/images/b.jpg", "/images/a.jpg"];

        it("renders one thumbnail per entry without deduplicating or reordering", () => {
            render(<ProductImageGallery images={repeated} productName="فلتر اختبار" />);
            for (let i = 1; i <= repeated.length; i += 1) {
                expect(screen.getByRole("button", { name: `عرض الصورة ${i}` })).toBeInTheDocument();
            }
            expect(screen.getByText(`1 / ${repeated.length}`)).toBeInTheDocument();
        });

        it("logs no React duplicate-key warning", () => {
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            render(<ProductImageGallery images={repeated} productName="فلتر اختبار" />);
            const duplicateKeyWarnings = errorSpy.mock.calls.filter((args) =>
                args.some((a) => typeof a === "string" && /same key/i.test(a)),
            );
            expect(duplicateKeyWarnings).toEqual([]);
            errorSpy.mockRestore();
        });

        it("selects the clicked position, not the first matching URL", async () => {
            const user = userEvent.setup();
            render(<ProductImageGallery images={repeated} productName="فلتر اختبار" />);
            // Thumbnail 4 repeats thumbnail 1's URL; selecting it must land on 4.
            await user.click(screen.getByRole("button", { name: "عرض الصورة 4" }));
            expect(screen.getByText(`4 / ${repeated.length}`)).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "عرض الصورة 4" })).toHaveAttribute("aria-pressed", "true");
            expect(screen.getByRole("button", { name: "عرض الصورة 1" })).toHaveAttribute("aria-pressed", "false");
        });
    });

});
