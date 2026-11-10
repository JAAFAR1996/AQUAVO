import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import toolsArabic from "@/locales/ar/tools.json";
import { DecorationExplorer, SubstrateLesson, WaterReadinessChecklist, WaterSourceLesson } from "../environment-lessons";

const copy = toolsArabic["journey-environment"];

describe("journey environmental lessons", () => {
  it("keeps absent, invalid and partial readings distinct from a measured zero", () => {
    render(<WaterReadinessChecklist />);
    const ammonia = screen.getByRole("spinbutton", { name: copy.reading_ammonia });
    const nitrite = screen.getByRole("spinbutton", { name: copy.reading_nitrite });
    const status = screen.getByRole("status");

    expect(ammonia).toHaveValue(null);
    expect(nitrite).toHaveValue(null);
    expect(status).toHaveTextContent(copy.readings_missing);

    fireEvent.change(ammonia, { target: { value: "-1" } });
    fireEvent.change(nitrite, { target: { value: "0" } });
    expect(ammonia).toHaveAttribute("aria-invalid", "true");
    expect(status).toHaveTextContent(copy.readings_missing);

    // Number inputs normalise non-finite text to an empty field, not to zero.
    fireEvent.change(ammonia, { target: { value: "Infinity" } });
    expect(status).toHaveTextContent(copy.readings_missing);

    fireEvent.change(ammonia, { target: { value: "0.25" } });
    fireEvent.change(nitrite, { target: { value: "" } });
    expect(status).toHaveTextContent(copy.readings_detected);
  });

  it("does not certify or save readiness even with zero readings and all reminders checked", () => {
    const savedPlan = JSON.stringify({ tankLiters: 60, waterSource: "tap" });
    localStorage.setItem("wizardData", savedPlan);
    const { unmount } = render(<WaterReadinessChecklist />);
    fireEvent.change(screen.getByRole("spinbutton", { name: copy.reading_ammonia }), { target: { value: "0" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: copy.reading_nitrite }), { target: { value: "0" } });
    for (const checkbox of screen.getAllByRole("checkbox")) fireEvent.click(checkbox);

    expect(screen.getByRole("status")).toHaveTextContent(copy.readings_review);
    expect(screen.getByText(copy.reviewScope, { exact: false })).toBeInTheDocument();
    expect(localStorage.getItem("wizardData")).toBe(savedPlan);

    unmount();
    render(<WaterReadinessChecklist />);
    expect(screen.getByRole("spinbutton", { name: copy.reading_ammonia })).toHaveValue(null);
    expect(screen.getByRole("spinbutton", { name: copy.reading_nitrite })).toHaveValue(null);
    for (const checkbox of screen.getAllByRole("checkbox")) expect(checkbox).not.toBeChecked();
    localStorage.removeItem("wizardData");
  });

  it("changes the preparation lesson to match each selected water source", () => {
    const { rerender } = render(<WaterSourceLesson key="tap" source="tap" />);
    fireEvent.click(screen.getByRole("button", { name: copy.waterStepPrepare }));
    expect(screen.getByText(copy.water_tap_prepare)).toBeInTheDocument();

    rerender(<WaterSourceLesson key="ro" source="ro" />);
    expect(screen.getByRole("button", { name: copy.waterStepCheck })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: copy.waterStepPrepare }));
    expect(screen.getByText(copy.water_ro_prepare)).toBeInTheDocument();

    rerender(<WaterSourceLesson key="well" source="well" />);
    fireEvent.click(screen.getByRole("button", { name: copy.waterStepPrepare }));
    expect(screen.getByText(copy.water_well_prepare)).toBeInTheDocument();
    rerender(<WaterSourceLesson source="" />);
    expect(screen.queryByRole("button", { name: copy.waterStepPrepare })).not.toBeInTheDocument();
  });

  it("exposes every selected decoration and preserves access after the active choice is removed", () => {
    const change = vi.fn();
    const allDecorations = ["live-plants", "driftwood", "rocks", "caves", "artificial-plants", "background"];
    const { rerender } = render(<DecorationExplorer decorations={allDecorations} activeId="rocks" onActiveChange={change} />);
    const choices = screen.getByRole("group", { name: copy.selectedDecorations });
    expect(within(choices).getAllByRole("button")).toHaveLength(6);
    fireEvent.click(within(choices).getByRole("button", { name: copy.decor_driftwood_title }));
    expect(change).toHaveBeenCalledWith("driftwood");

    rerender(<DecorationExplorer decorations={["caves"]} activeId="rocks" onActiveChange={change} />);
    expect(screen.getByRole("button", { name: copy.decor_caves_title })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img")).toHaveAccessibleName(copy.decor_caves_place);
    fireEvent.click(screen.getByRole("button", { name: copy.topView }));
    expect(screen.getByRole("button", { name: copy.topView })).toHaveAttribute("aria-pressed", "true");

    rerender(<DecorationExplorer decorations={[]} activeId="rocks" onActiveChange={change} />);
    expect(screen.queryByRole("group", { name: copy.selectedDecorations })).not.toBeInTheDocument();
  });

  it("uses a different cleaning explanation for fine sand and gravel", () => {
    const { rerender } = render(<SubstrateLesson key="sand" type="sand" />);
    fireEvent.click(screen.getByRole("button", { name: copy.cleaning }));
    expect(screen.getByText(copy.substrate_sand_clean, { selector: "p" })).toBeInTheDocument();
    rerender(<SubstrateLesson key="gravel" type="gravel" />);
    fireEvent.click(screen.getByRole("button", { name: copy.cleaning }));
    expect(screen.getByText(copy.substrate_gravel_clean, { selector: "p" })).toBeInTheDocument();
  });
});
