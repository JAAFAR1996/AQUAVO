import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { i18next } from "@/i18n";
import { MaintenanceWalkthrough, SpeciesCareLesson, WaterChangeLesson, waterChangeLiters } from "../care-lessons";
import { getSpeciesById } from "../fish-species-data";
import { FishSelection } from "../fish-selection";
import { JourneySummary } from "../journey-summary";
import { normalizeWizardData } from "../utils";

vi.mock("../tank-fit", () => ({ TankFit: () => null }));
vi.mock("../journey-support", () => ({ JourneySupport: () => null }));

const label = (key: string, values: Record<string, unknown> = {}) => i18next.t(`tools:journey-care.${key}`, { ...values, defaultValue: key });

describe("journey care explanations", () => {
    it("calculates from the supplied water volume and rejects invalid amounts", () => {
        expect(waterChangeLiters(100, 25)).toBe(25);
        expect(waterChangeLiters(35.5, 20)).toBe(7.1);
        expect(waterChangeLiters(83.5, 25)).toBe(20.88);
        expect(waterChangeLiters(0, 25)).toBeNull();
        expect(waterChangeLiters(Number.NaN, 25)).toBeNull();
        expect(waterChangeLiters(100, 101)).toBeNull();
        expect(waterChangeLiters(2001, 25)).toBeNull();
    });

    it("uses a separately entered actual volume without changing the recorded tank capacity", () => {
        render(<WaterChangeLesson tankLiters={100} />);
        expect(screen.getByRole("status")).toHaveTextContent(label("change.amount", { value: "25" }));
        fireEvent.change(screen.getByRole("slider"), { target: { value: "40" } });
        expect(screen.getByRole("status")).toHaveTextContent(label("change.amount", { value: "40" }));
        fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "80" } });
        expect(screen.getByRole("status")).toHaveTextContent(label("change.amount", { value: "32" }));
        expect(screen.getByText(label("change.actualNote"))).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: label("change.refill") }));
        expect(screen.getByRole("status")).toHaveTextContent(label("change.result.refill", { volume: "80", amount: "32", percentage: 40 }));
        fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "" } });
        expect(screen.getByRole("status")).toHaveTextContent(label("change.amount", { value: "40" }));
    });

    it("provides a meaningful water profile without asserting that volume guarantees suitability", () => {
        const species = getSpeciesById(["guppy"])[0];
        render(<SpeciesCareLesson species={species} tankLiters={100} />);
        expect(screen.getByText(label("species.volumeNeedsReview", { value: 100, guide: species.tankMinLiters }))).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: label("topics.water") }));
        expect(screen.getByText(species.temperatureRange)).toBeInTheDocument();
        expect(screen.getByText(label("species.waterNote"))).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: label("topics.food") }));
        expect(screen.getByText(label("species.foodNote"))).toBeInTheDocument();
    });

    it("lets a learner revisit tasks without treating the checklist as a readiness assessment", () => {
        render(<MaintenanceWalkthrough />);
        const checkbox = screen.getByRole("checkbox", { name: label("walkthrough.understood") });
        fireEvent.click(checkbox);
        expect(screen.getByRole("status")).toHaveTextContent(label("walkthrough.progress", { value: 1, total: 5 }));
        fireEvent.click(screen.getByRole("button", { name: label("walkthrough.next") }));
        expect(screen.getByRole("heading", { name: label("tasks.power.title") })).toBeInTheDocument();
        expect(checkbox).not.toBeChecked();
        fireEvent.click(screen.getByRole("button", { name: label("walkthrough.previous") }));
        expect(checkbox).toBeChecked();
        expect(screen.getByText(label("walkthrough.scope"))).toBeInTheDocument();
    });

    it("preserves previously saved manual fish groups while changing a species", () => {
        const update = vi.fn();
        render(<FishSelection wizardData={normalizeWizardData({ tankLiters: 80, fishTypes: ["goldfish"] })} updateData={update} />);
        fireEvent.click(screen.getByRole("button", { name: /أسماك المجتمع/ }));
        fireEvent.click(screen.getByRole("button", { name: /جوبي Guppy/ }));
        expect(update).toHaveBeenCalledWith("selectedSpecies", ["guppy"]);
        expect(update).not.toHaveBeenCalledWith("fishTypes", expect.anything());
    });

    it("routes unresolved summary decisions back to the matching step", () => {
        const edit = vi.fn();
        render(<JourneySummary wizardData={normalizeWizardData({})} onEditStep={edit} />);
        fireEvent.click(screen.getByRole("button", { name: label("review.editWater") }));
        expect(edit).toHaveBeenLastCalledWith(4);
        fireEvent.click(screen.getByRole("button", { name: label("review.editCare") }));
        expect(edit).toHaveBeenLastCalledWith(7);
        fireEvent.click(screen.getByRole("button", { name: label("review.nextMissing") }));
        expect(edit).toHaveBeenLastCalledWith(0);
    });
});
