import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@google/model-viewer", () => ({}));

import { Product3DViewer } from "../product-3d-viewer";

describe("Product3DViewer", () => {
  it("waits for customer activation before creating the 3D viewer", async () => {
    const { container } = render(
      <Product3DViewer
        src="/models/filter.glb"
        poster="/images/filter.webp"
        productName="فلتر اختبار"
      />,
    );

    expect(screen.getByRole("button", { name: "شغّل العرض ثلاثي الأبعاد" })).toBeInTheDocument();
    expect(screen.queryByText("جاري تحميل المجسم...")).not.toBeInTheDocument();
    expect(container.querySelector("model-viewer")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "شغّل العرض ثلاثي الأبعاد" }));

    await waitFor(() => {
      expect(container.querySelector("model-viewer")).not.toBeNull();
    });

    const viewer = container.querySelector("model-viewer");
    expect(viewer).toHaveAttribute("camera-controls");
    expect(viewer).toHaveAttribute("touch-action", "pan-y");
    expect(screen.getByRole("button", { name: "رجّع العرض للبداية" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "قرّب العرض" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "بعّد العرض" })).toBeInTheDocument();
    expect(screen.getByText(/النموذج توضيحي/)).toBeInTheDocument();
  });
});
