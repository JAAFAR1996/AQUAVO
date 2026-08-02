import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PackingImportPanel } from "../packing-import-panel";

const mocks = vi.hoisted(() => ({
  uploadMutate: vi.fn(),
  confirmMutate: vi.fn(),
}));

vi.mock("@/hooks/use-packaging", () => ({
  MATCH_CONFIDENCE_LABEL: { exact: "مطابقة أكيدة", probable: "مطابقة محتملة", ambiguous: "غير محسومة" },
  MISSING_FIELD_LABEL: {
    packed_height_cm: "الارتفاع بعد التغليف",
    packed_width_cm: "العرض بعد التغليف",
    packed_depth_cm: "السماكة/العمق بعد التغليف",
    packed_weight_kg: "الوزن بعد التغليف",
  },
  UNKNOWN_LABEL: "غير معروف",
  useUploadPackingImport: () => ({ mutate: mocks.uploadMutate, isPending: false, error: null }),
  useConfirmPackingImport: () => ({ mutate: mocks.confirmMutate, isPending: false, error: null, isSuccess: false }),
  useMissingPackingData: () => ({
    data: {
      items: [],
      summary: { withoutHeight: 0, withoutWidth: 0, withoutDepth: 0, withoutWeight: 0, complete: 0, manualReview: 0, affectedUnique: 0, total: 0 },
    },
    isLoading: false,
  }),
}));

vi.mock("../packaging-forms", () => ({ translateError: () => "خطأ" }));

describe("CSV preview-first flow", () => {
  it("does not call the upload endpoint merely because a file was selected", async () => {
    mocks.uploadMutate.mockReset();
    render(<PackingImportPanel />);

    const file = new File([
      "اسم المنتج,عدد القطع,طول المنتج مع كارتونة,عرض المنتج مع كارتونة,هل قابل للطي\nفلتر داخلي,12,20,10,لا",
    ], "packing.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", {
      value: async () => "اسم المنتج,عدد القطع,طول المنتج مع كارتونة,عرض المنتج مع كارتونة,هل قابل للطي\nفلتر داخلي,12,20,10,لا",
    });

    fireEvent.change(screen.getByTestId("input-import-file"), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByTestId("local-csv-preview")).toBeInTheDocument());
    expect(mocks.uploadMutate).not.toHaveBeenCalled();
    expect(screen.getByText(/عدد القطع.*للمعلومة فقط/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("button-analyze-import"));
    expect(mocks.uploadMutate).toHaveBeenCalledTimes(1);
  });
});
