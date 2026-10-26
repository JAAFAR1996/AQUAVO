import {describe,it,expect} from "vitest";
import {variantDimensionLabel,variantDisplayValue} from "../variant-display";
describe("variant display localization",()=>{
 it("translates dimension titles without changing identity",()=>{
   expect(variantDimensionLabel("القدرة","en")).toBe("Power");
   expect(variantDimensionLabel("القدرة","ckb")).toBe("هێز");
   expect(variantDimensionLabel("القدرة","ar")).toBe("القدرة");
 });
 it("translates watt labels and preserves measurements",()=>{
   expect(variantDisplayValue("100 واط","en")).toBe("100 W");
   expect(variantDisplayValue("100 واط","ckb")).toBe("100 وات");
   expect(variantDisplayValue("50×27×30 سم","en")).toBe("50×27×30 cm");
   expect(variantDisplayValue("صغير","en")).toBe("Small");
 });
});
