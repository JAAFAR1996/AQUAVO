import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { i18next } from "@/i18n";
import { JourneyTankVisualizer } from "../journey-experience";
import { AquascapeStyles } from "../aquascape-styles";
import { normalizeWizardData } from "../utils";

describe("journey interactive explanations", () => {
    it("opens the relevant lesson without inventing equipment, water or fish in the plan", () => {
        const onExploreStep = vi.fn();
        const data = normalizeWizardData({});
        const { container } = render(<JourneyTankVisualizer data={data} currentStep={0} total={9} onExploreStep={onExploreStep} />);
        const disclosure = screen.getByText("اكتشف شلون يشتغل حوضك").closest("details")!;
        disclosure.open = true;
        fireEvent(disclosure, new Event("toggle"));
        fireEvent.click(within(disclosure).getByRole("button", { name: "الماي" }));
        expect(container.querySelector("[data-explore='water']")).toBeInTheDocument();
        expect(screen.getByTestId("journey-aquarium")).toHaveAttribute("data-has-water", "false");
        expect(container.querySelectorAll("[data-species-id], [data-equipment]")).toHaveLength(0);
        fireEvent.click(screen.getByRole("button", { name: "افتح شرح الماي وخياراته" }));
        expect(onExploreStep).toHaveBeenCalledWith(4);
        expect(data.waterSource).toBe("");
        expect(data.cyclingMethod).toBe("");
    });

    it("lets visitors explore a style composition without altering their selected substrate and decor", () => {
        const updateData = vi.fn();
        render(<AquascapeStyles data={normalizeWizardData({ substrateType: "sand", decorations: ["rocks", "background"] })} updateData={updateData} />);
        const disclosure = screen.getByText("افهم ترتيب هالشكل خطوة بخطوة").closest("details")!;
        disclosure.open = true;
        fireEvent.click(within(disclosure).getByRole("button", { name: "المساحة المفتوحة" }));
        expect(within(disclosure).getByRole("button", { name: "المساحة المفتوحة" })).toHaveAttribute("aria-pressed", "true");
        expect(within(disclosure).getByRole("img")).toHaveAccessibleName(/المنطقة المظللة مثال لمساحة مفتوحة/);
        expect(updateData).not.toHaveBeenCalled();
    });

    it("keeps the selected lighting explanation when its link opens equipment", () => {
        const onExploreStep = vi.fn();
        const data = normalizeWizardData({ lightingType: "basic-led" });
        const { rerender } = render(<JourneyTankVisualizer data={data} currentStep={0} total={9} onExploreStep={onExploreStep} />);
        const disclosure = screen.getByText("اكتشف شلون يشتغل حوضك").closest("details")!;
        disclosure.open = true;
        fireEvent(disclosure, new Event("toggle"));
        fireEvent.click(within(disclosure).getByRole("button", { name: "الإنارة" }));
        fireEvent.click(screen.getByRole("button", { name: "افتح شرح الإنارة وخياراته" }));
        expect(onExploreStep).toHaveBeenCalledWith(2);
        rerender(<JourneyTankVisualizer data={data} currentStep={2} total={9} onExploreStep={onExploreStep} />);
        expect(within(disclosure).getByRole("button", { name: "الإنارة" })).toHaveAttribute("aria-pressed", "true");
        expect(within(disclosure).getByRole("button", { name: "الفلترة" })).toHaveAttribute("aria-pressed", "false");
    });

    it("compares room light directly beneath a fitted aquarium while its explorer is closed, and resets when the fixture is removed", () => {
        const none = normalizeWizardData({ lightingType: "none" });
        const withLight = normalizeWizardData({ lightingType: "basic-led" });
        const originalPlan = JSON.stringify(withLight);
        const { container, rerender } = render(<JourneyTankVisualizer data={none} currentStep={2} total={9} />);
        const disclosure = screen.getByText("اكتشف شلون يشتغل حوضك").closest("details")!;
        expect(disclosure).not.toHaveAttribute("open");
        expect(screen.queryByRole("radio")).not.toBeInTheDocument();
        expect(container.querySelector("[data-room-light], [data-equipment]")).toBeNull();

        rerender(<JourneyTankVisualizer data={withLight} currentStep={2} total={9} />);
        const lightControls = screen.getByRole("group", { name: "ضوء الغرفة بالمعاينة" });
        expect(disclosure).not.toContainElement(lightControls);
        expect(lightControls).toHaveAccessibleDescription(i18next.t("tools:journey-view-light.note"));
        expect(screen.getAllByRole("radio")).toHaveLength(2);
        expect(within(lightControls).getByRole("radio", { name: "ضوء النهار" })).toBeChecked();
        fireEvent.click(within(lightControls).getByRole("radio", { name: "ضوء الغروب" }));
        expect(within(lightControls).getByRole("radio", { name: "ضوء الغروب" })).toBeChecked();
        expect(disclosure).not.toHaveAttribute("open");
        expect(container.querySelector('[data-room-light="dusk"]')).toContainElement(screen.getByTestId("journey-aquarium"));
        expect(screen.getByTestId("journey-aquarium")).toHaveAttribute("data-has-water", "false");
        expect(container.querySelectorAll("[data-species-id], [data-decoration]")).toHaveLength(0);
        expect(container.querySelectorAll("[data-equipment]")).toHaveLength(1);
        expect(JSON.stringify(withLight)).toBe(originalPlan);

        rerender(<JourneyTankVisualizer data={none} currentStep={2} total={9} />);
        expect(container.querySelector("[data-room-light], [data-equipment]")).toBeNull();
        rerender(<JourneyTankVisualizer data={withLight} currentStep={2} total={9} />);
        expect(screen.getByRole("radio", { name: "ضوء النهار" })).toBeChecked();
    });
});
