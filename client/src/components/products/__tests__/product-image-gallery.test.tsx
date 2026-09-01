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

    // WCAG 2.5.5 touch-target regression guard.
    //
    // These pin each control's *effective* rendered size rather than the literal
    // utility classes it is built from. An earlier version required duplicate
    // `md:h-11 md:w-11` overrides, which guarded a shared Button whose `icon`
    // size once collapsed to 36x36 at the md breakpoint. That Button is now
    // mobile-first (`icon: "h-11 w-11 p-0"`), so the duplicates became no-ops
    // and a later cleanup dropped them — breaking the test while the rendered
    // size never changed. Checking the effective size keeps the real guarantee
    // (never below the target at any breakpoint) across such refactors.
    const expectTouchTarget = (element: HTMLElement, minPx: number) => {
        const sizeClass = /^(?:(.+):)?(?:min-)?([hw])-(\d+)$/;
        const seen = { h: false, w: false };

        for (const className of element.className.split(/\s+/)) {
            const match = sizeClass.exec(className);
            if (!match) continue;

            const [, breakpoint, axis, steps] = match;
            // Tailwind's spacing scale is 0.25rem per step at a 16px root.
            const px = Number(steps) * 4;

            expect(
                `${axis}=${px}px${breakpoint ? ` at ${breakpoint}` : ""}`,
            ).toBe(`${axis}=${Math.max(px, minPx)}px${breakpoint ? ` at ${breakpoint}` : ""}`);

            if (!breakpoint) seen[axis as "h" | "w"] = true;
        }

        expect({ hasHeight: seen.h, hasWidth: seen.w }).toEqual({
            hasHeight: true,
            hasWidth: true,
        });
    };

    it("keeps the main-image previous/next controls at least 44x44 at every breakpoint", () => {
        render(<ProductImageGallery images={images} productName="فلتر اختبار" />);
        expectTouchTarget(screen.getByRole("button", { name: "الصورة السابقة" }), 44);
        expectTouchTarget(screen.getByRole("button", { name: "الصورة التالية" }), 44);
    });

    it("keeps the lightbox close control at least 44x44 at every breakpoint", () => {
        render(<ProductImageGallery images={images} productName="فلتر اختبار" />);
        fireEvent.click(screen.getAllByRole("img", { name: /فلتر اختبار/ })[0]);
        expectTouchTarget(screen.getByRole("button", { name: "إغلاق معرض الصور" }), 44);
    });

    it("keeps the lightbox previous/next controls at 48x48 at every breakpoint", () => {
        render(<ProductImageGallery images={images} productName="فلتر اختبار" />);
        fireEvent.click(screen.getAllByRole("img", { name: /فلتر اختبار/ })[0]);
        const previous = screen.getAllByRole("button", { name: "الصورة السابقة" });
        const next = screen.getAllByRole("button", { name: "الصورة التالية" });
        expectTouchTarget(previous[previous.length - 1], 48);
        expectTouchTarget(next[next.length - 1], 48);
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
});
