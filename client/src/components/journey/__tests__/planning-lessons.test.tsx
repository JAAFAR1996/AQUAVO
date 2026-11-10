import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18next } from "@/i18n";
import englishTools from "@/locales/en/tools.json";
import { EquipmentSelection } from "../equipment-selection";
import { LocationSetup } from "../location-setup";
import { TankSelection } from "../tank-selection";
import { TankSizeLesson, TankTypeLesson } from "../planning-lessons";
import { normalizeWizardData } from "../utils";

// Catalogue matching has its own integration tests. These lessons do not need a network query.
vi.mock("../tank-fit", () => ({ TankFit: () => null }));

describe("journey planning lessons", () => {
    beforeAll(() => { i18next.addResourceBundle("en", "tools", englishTools, true, true); });
    beforeEach(async () => { await i18next.changeLanguage("en"); });
    afterAll(async () => { await i18next.changeLanguage("ar"); });

    it("links the water-depth demo to real dimensions without changing the recorded tank", () => {
        const updateData = vi.fn();
        render(<TankSelection wizardData={normalizeWizardData({
            tankSize: "medium", tankLiters: 84, tankLengthCm: 60, tankWidthCm: 35, tankHeightCm: 40,
        })} updateData={updateData} />);

        fireEvent.change(screen.getByRole("slider", { name: /Explore water depth/ }), { target: { value: "50" } });
        expect(screen.getByText("Filled space before decoration: about 42 litres")).toBeInTheDocument();
        expect(screen.getByLabelText(i18next.t("tools:tank-selection.s3"))).toHaveValue(84);
        expect(updateData).not.toHaveBeenCalled();
    });

    it("uses the selected capacity when dimensions are absent and keeps an unanswered example labelled", () => {
        const { rerender } = render(<TankSizeLesson data={normalizeWizardData({ tankSize: "small", tankLiters: 40 })} />);
        fireEvent.change(screen.getByRole("slider", { name: /Explore fill proportion/ }), { target: { value: "50" } });
        expect(screen.getByText("Filled space before decoration: about 20 litres")).toBeInTheDocument();

        rerender(<TankSizeLesson data={normalizeWizardData({ tankSize: "large", tankLiters: 200 })} />);
        expect(screen.getByText("Filled space before decoration: about 100 litres")).toBeInTheDocument();
        rerender(<TankSizeLesson data={normalizeWizardData({})} />);
        expect(screen.getByText("Learning example: 60 × 35 × 40 cm")).toBeInTheDocument();
    });

    it("leaves size unanswered when the volume is cleared", () => {
        const updateData = vi.fn();
        render(<TankSelection wizardData={normalizeWizardData({ tankSize: "medium", tankLiters: 100 })} updateData={updateData} />);
        fireEvent.change(screen.getByLabelText(i18next.t("tools:tank-selection.s3")), { target: { value: "" } });
        expect(updateData).toHaveBeenCalledWith("tankLiters", 0);
        expect(updateData).toHaveBeenCalledWith("tankSize", "");
        expect(updateData).not.toHaveBeenCalledWith("tankSize", "xlarge");
    });

    it("explains and previews a location condition without recording it as checked", () => {
        const updateData = vi.fn();
        render(<LocationSetup wizardData={normalizeWizardData({ tankLiters: 100 })} updateData={updateData} />);
        const label = i18next.t("tools:location-setup.s8");
        fireEvent.click(screen.getByRole("button", { name: `Explain: ${label}` }));
        expect(screen.getByRole("heading", { name: "Nearby power with a water-conscious cable route" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "After improvement" }));
        expect(screen.getByRole("img", { name: /A loop drops below the socket/ })).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText(/Empty aquarium, decoration and equipment weight/), { target: { value: "25" } });
        expect(screen.getByText("Approximate total of your inputs: 125 kg")).toBeInTheDocument();
        expect(updateData).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(label) }));
        expect(updateData).toHaveBeenCalledExactlyOnceWith("location", ["near-power"]);
    });

    it("lets someone follow filter media stages while preserving the actual filter choice", () => {
        const updateData = vi.fn();
        const data = normalizeWizardData({ filterType: "hob" });
        const { rerender } = render(<EquipmentSelection wizardData={data} updateData={updateData} />);
        expect(screen.getByRole("img", { name: /A hang-on-back filter on the aquarium rim/ })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Follow water to the next stage" }));
        expect(screen.getByText(/Mechanical filtration: foam or floss traps/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "3. Biological media" }));
        expect(screen.getByText(/New media needs maturation and testing/)).toBeInTheDocument();
        expect(updateData).not.toHaveBeenCalled();

        rerender(<EquipmentSelection wizardData={{ ...data, filterType: "sponge" }} updateData={updateData} />);
        expect(screen.getByRole("img", { name: /An air-driven sponge filter/ })).toBeInTheDocument();
    });

    it("explains a hot room without replacing a recorded heater wattage", () => {
        const updateData = vi.fn();
        render(<EquipmentSelection wizardData={normalizeWizardData({ heaterWattage: 100 })} updateData={updateData} />);
        fireEvent.change(screen.getByRole("slider", { name: /Demo room temperature/ }), { target: { value: "30" } });
        expect(screen.getByText(/The room is warmer than the target: a heater cannot cool/)).toBeInTheDocument();
        expect(screen.getByLabelText(i18next.t("tools:equipment-selection.knownWattage"))).toHaveValue(100);
        expect(updateData).not.toHaveBeenCalled();
    });

    it("previews lighting duration and darkness without saving a fictitious device program", () => {
        const updateData = vi.fn();
        const data = normalizeWizardData({ lightingType: "rgb-smart" });
        const { rerender } = render(<EquipmentSelection wizardData={data} updateData={updateData} />);
        fireEvent.change(screen.getByRole("slider", { name: /Demo display intensity/ }), { target: { value: "90" } });
        fireEvent.change(screen.getByRole("slider", { name: /Explore light duration/ }), { target: { value: "6" } });
        expect(screen.getByText(/6 hours of light and 18 hours with the fixture off/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Example night" }));
        expect(screen.getByRole("img", { name: "Learning preview with the lighting fixture switched off" })).toBeInTheDocument();
        expect(updateData).not.toHaveBeenCalled();

        rerender(<EquipmentSelection wizardData={{ ...data, lightingType: "none" }} updateData={updateData} />);
        expect(screen.getByRole("slider", { name: /Demo display intensity/ })).toBeDisabled();
        expect(screen.getByText(/No fixture is selected for intensity adjustment/)).toBeInTheDocument();
    });

    it("changes the highlighted layout lesson when exploring plant and shelter space", () => {
        render(<TankTypeLesson tankType="planted" />);
        fireEvent.click(screen.getByRole("button", { name: "Planting space" }));
        expect(screen.getByRole("img", { name: "Diagram highlighting plants at the aquarium sides" })).toBeInTheDocument();
        expect(screen.getByText(/Allow for mature plant size and access for trimming/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Shelter" }));
        expect(screen.getByRole("img", { name: "Diagram highlighting shelter beside the swimming space" })).toBeInTheDocument();
    });
});
