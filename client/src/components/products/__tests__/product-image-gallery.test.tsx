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
});
