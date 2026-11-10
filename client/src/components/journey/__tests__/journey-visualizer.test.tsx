import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JourneyTankVisualizer } from "../journey-experience";
import { normalizeWizardData } from "../utils";

const TOTAL_STEPS = 9;

function renderedSpecies(container: HTMLElement): string[] {
    return Array.from(container.querySelectorAll("[data-species-id]"))
        .map((element) => element.getAttribute("data-species-id") ?? "")
        .sort();
}

describe("journey aquarium preview", () => {
    it("starts with an accessible empty tank instead of inventing water, fish or decoration", () => {
        const { container } = render(
            <JourneyTankVisualizer data={normalizeWizardData({})} currentStep={0} total={TOTAL_STEPS} />,
        );

        const aquarium = screen.getByTestId("journey-aquarium");
        expect(aquarium).toHaveAttribute("role", "img");
        expect(aquarium).toHaveAccessibleName();
        expect(aquarium).toHaveAttribute("data-has-water", "false");
        expect(renderedSpecies(container)).toEqual([]);
        expect(container.querySelectorAll("[data-decoration]")).toHaveLength(0);
    });

    it("keeps the picture tied to recorded choices when someone jumps to the summary", () => {
        const unanswered = normalizeWizardData({ cyclingMethod: "with-hardy-fish" });
        const { container, rerender } = render(
            <JourneyTankVisualizer data={unanswered} currentStep={0} total={TOTAL_STEPS} />,
        );

        rerender(<JourneyTankVisualizer data={unanswered} currentStep={8} total={TOTAL_STEPS} />);
        expect(screen.getByTestId("journey-aquarium")).toHaveAttribute("data-has-water", "false");
        expect(renderedSpecies(container)).toEqual([]);

        // A water choice changes the picture. Navigation alone cannot fill or empty it.
        const waterChosen = normalizeWizardData({ waterSource: "tap" });
        rerender(<JourneyTankVisualizer data={waterChosen} currentStep={8} total={TOTAL_STEPS} />);
        expect(screen.getByTestId("journey-aquarium")).toHaveAttribute("data-has-water", "true");
        rerender(<JourneyTankVisualizer data={waterChosen} currentStep={0} total={TOTAL_STEPS} />);
        expect(screen.getByTestId("journey-aquarium")).toHaveAttribute("data-has-water", "true");
        expect(renderedSpecies(container)).toEqual([]);
    });

    it("shows selected species once and removes them when the choice changes", () => {
        const data = normalizeWizardData({
            waterSource: "tap", selectedSpecies: ["guppy", "corydoras", "guppy"], stockingLevel: "light",
        });
        const { container, rerender } = render(
            <JourneyTankVisualizer data={data} currentStep={6} total={TOTAL_STEPS} />,
        );
        expect(renderedSpecies(container)).toEqual(["corydoras", "guppy"]);

        // A visual preference is not a stocking recommendation or a quantity input.
        rerender(<JourneyTankVisualizer data={{ ...data, stockingLevel: "heavy" }} currentStep={6} total={TOTAL_STEPS} />);
        expect(renderedSpecies(container)).toEqual(["corydoras", "guppy"]);

        rerender(<JourneyTankVisualizer data={{ ...data, selectedSpecies: ["corydoras"] }} currentStep={6} total={TOTAL_STEPS} />);
        expect(renderedSpecies(container)).toEqual(["corydoras"]);
        rerender(<JourneyTankVisualizer data={{ ...data, selectedSpecies: ["corydoras"], waterSource: "" }} currentStep={6} total={TOTAL_STEPS} />);
        expect(renderedSpecies(container)).toEqual([]);
        expect(screen.getByTestId("journey-aquarium")).toHaveAttribute("data-has-water", "false");
        rerender(<JourneyTankVisualizer data={{ ...data, selectedSpecies: [] }} currentStep={6} total={TOTAL_STEPS} />);
        expect(renderedSpecies(container)).toEqual([]);
    });

    it("updates the hardscape when decoration choices are added and removed", () => {
        const data = normalizeWizardData({ decorations: ["rocks", "live-plants"] });
        const { container, rerender } = render(
            <JourneyTankVisualizer data={data} currentStep={3} total={TOTAL_STEPS} />,
        );
        expect(container.querySelector('[data-decoration="rocks"]')).toBeInTheDocument();
        expect(container.querySelector('[data-decoration="live-plants"]')).toBeInTheDocument();
        expect(container.querySelector('[data-decoration="driftwood"]')).toBeNull();

        rerender(<JourneyTankVisualizer data={{ ...data, decorations: ["driftwood"] }} currentStep={3} total={TOTAL_STEPS} />);
        expect(container.querySelector('[data-decoration="rocks"]')).toBeNull();
        expect(container.querySelector('[data-decoration="live-plants"]')).toBeNull();
        expect(container.querySelector('[data-decoration="driftwood"]')).toBeInTheDocument();
    });

    it("reflects tank proportions while keeping incomplete dimension input renderable", () => {
        const cube = normalizeWizardData({ tankLengthCm: 40, tankWidthCm: 40, tankHeightCm: 40 });
        const { rerender } = render(
            <JourneyTankVisualizer data={cube} currentStep={0} total={TOTAL_STEPS} />,
        );
        const cubeRatio = Number(screen.getByTestId("journey-aquarium").getAttribute("data-tank-ratio"));
        expect(cubeRatio).toBeGreaterThan(0);

        const wide = normalizeWizardData({ tankLengthCm: 60, tankWidthCm: 30, tankHeightCm: 30 });
        rerender(<JourneyTankVisualizer data={wide} currentStep={0} total={TOTAL_STEPS} />);
        const wideRatio = Number(screen.getByTestId("journey-aquarium").getAttribute("data-tank-ratio"));
        expect(wideRatio).toBeGreaterThan(cubeRatio);

        const incomplete = normalizeWizardData({ tankLengthCm: 60, tankHeightCm: 0 });
        rerender(<JourneyTankVisualizer data={incomplete} currentStep={0} total={TOTAL_STEPS} />);
        const fallbackRatio = Number(screen.getByTestId("journey-aquarium").getAttribute("data-tank-ratio"));
        expect(Number.isFinite(fallbackRatio)).toBe(true);
        expect(fallbackRatio).toBeGreaterThan(0);
    });

    it("scopes every gradient, clip and accessible label to its own preview instance", () => {
        const decorated = normalizeWizardData({
            waterSource: "tap", substrateType: "sand", decorations: ["rocks", "live-plants"],
            lightingType: "rgb-smart", selectedSpecies: ["guppy"],
        });
        render(
            <>
                <JourneyTankVisualizer data={decorated} currentStep={3} total={TOTAL_STEPS} />
                <JourneyTankVisualizer data={decorated} currentStep={8} total={TOTAL_STEPS} />
            </>,
        );

        const aquariums = screen.getAllByTestId("journey-aquarium");
        expect(aquariums).toHaveLength(2);
        const allIds = aquariums.flatMap((aquarium) =>
            Array.from(aquarium.querySelectorAll("[id]")).map((element) => element.id),
        );
        expect(allIds.length).toBeGreaterThan(0);
        expect(new Set(allIds).size).toBe(allIds.length);

        for (const aquarium of aquariums) {
            expect(aquarium).toHaveAccessibleName();
            const ownIds = new Set(Array.from(aquarium.querySelectorAll("[id]")).map((element) => element.id));
            const references = (aquarium.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter(Boolean);
            for (const element of [aquarium, ...aquarium.querySelectorAll("*")]) {
                for (const attribute of Array.from(element.attributes)) {
                    for (const match of attribute.value.matchAll(/url\(#([^\)]+)\)/g)) references.push(match[1]);
                }
            }
            expect(references.length).toBeGreaterThan(0);
            for (const reference of references) expect(ownIds.has(reference)).toBe(true);
        }
    });
});
