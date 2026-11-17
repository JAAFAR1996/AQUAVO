import { beforeEach, describe, expect, it, vi } from "vitest";
import { products } from "../../shared/schema.js";
import { getDb } from "../db.js";
import { PricingEngine } from "../services/pricing-engine.js";

vi.mock("../db.js", () => ({ getDb: vi.fn() }));

type Observation = { price: string; salesVelocity: string | null; demandScore: string | null };
const row = (salesVelocity: string | null, demandScore: string | null, price = "100"): Observation =>
  ({ price, salesVelocity, demandScore });
function setup(stock: number, history: Observation[]) {
  const db = { select: () => ({ from: (table: unknown) => ({ where: () => ({
    limit: async () => table === products ? [{ id: "p", price: "10000", stock, category: "food" }] : [],
    orderBy: () => Object.assign(Promise.resolve(history), { limit: async () => history.slice(-30).reverse() }),
  }) }) }) };
  vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
  return new PricingEngine();
}

describe("pricing recommendations use observed numeric values", () => {
  beforeEach(() => vi.clearAllMocks());
  it("averages PostgreSQL strings instead of concatenating them", async () => {
    const engine = setup(5, Array(5).fill(row("1.25", "80.0")));
    expect(await engine.suggestOptimalPrice("p")).toMatchObject({ reasonType: "increase", suggestedPrice: 11300 });
  });

  it("keeps measured zero sales and ignores absent measurements in the denominator", async () => {
    const engine = setup(60, [...Array(5).fill(row("0", null)), row(null, "80")]);
    expect(await engine.suggestOptimalPrice("p")).toMatchObject({ reasonType: "decrease", suggestedPrice: 8400 });
    const normal = setup(60, [...Array(5).fill(row("2", null)), ...Array(10).fill(row(null, "40"))]);
    expect(await normal.suggestOptimalPrice("p")).toMatchObject({ reasonType: "maintain", suggestedPrice: 10000 });
  });

  it("does not infer slow sales or high demand from missing values or too few measurements", async () => {
    const history = [row(null, "90"), ...Array(4).fill(row("1", null)), row("NaN", "Infinity"), row(null, null)];
    for (const stock of [5, 60]) {
      expect((await setup(stock, history).getBulkPriceSuggestions(["p"])).size).toBe(0);
    }
  });

  it("requires ten usable price/velocity pairs and includes a real drop to zero", async () => {
    const history = [
      ...Array(5).fill(row("3.0", null, "100")), row(null, null, "999"),
      ...Array(5).fill(row("0", null, "125")),
    ];
    expect(await setup(20, history).calculateDemandElasticity("p")).toBe(-4);
    expect(await setup(20, history.slice(1)).calculateDemandElasticity("p")).toBeNull();
  });

  it("averages each half of an odd-sized series numerically", async () => {
    const history = [...Array(5).fill(row("2", null, "100")), ...Array(6).fill(row("1", null, "125"))];
    expect(await setup(20, history).calculateDemandElasticity("p")).toBe(-2);
  });
});
