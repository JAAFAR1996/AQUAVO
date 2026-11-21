import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => { vi.resetModules(); delete window.ttq; localStorage.clear(); });
function pixel() {
  return {track:vi.fn(),page:vi.fn(),identify:vi.fn(),instance:vi.fn(),load:vi.fn()};
}
describe("deferred TikTok event delivery", () => {
  it("keeps early product/cart events and collapses the initial page view", async () => {
    const events = await import("../tiktok-pixel");
    events.ttqPage(); events.ttqPage();
    events.ttqViewContent({id:"product",name:"Fixture",price:2500});
    events.ttqAddToCart({id:"product",name:"Fixture",price:2500,quantity:2});
    const sdk = pixel(); window.ttq = sdk;
    expect(events.flushPendingTiktokEvents()).toBe(true);
    expect(sdk.page).toHaveBeenCalledTimes(1);
    expect(sdk.track.mock.calls.map(call=>call[0])).toEqual(["ViewContent","AddToCart"]);
    events.flushPendingTiktokEvents();
    expect(sdk.track).toHaveBeenCalledTimes(2);
  });
  it("queues one Purchase per real order before the SDK loads", async () => {
    const events = await import("../tiktok-pixel");
    const order = {orderId:"synthetic-order",items:[{id:"p",name:"Fixture",price:2500,quantity:1}],totalValue:2500};
    events.ttqPurchase(order); events.ttqPurchase(order);
    const sdk = pixel(); window.ttq = sdk; events.flushPendingTiktokEvents();
    expect(sdk.track).toHaveBeenCalledTimes(1);
    expect(sdk.track).toHaveBeenCalledWith("Purchase",expect.objectContaining({value:2500,currency:"IQD"}));
  });
  it("does not permanently deduplicate an event rejected by a full queue", async () => {
    const events = await import("../tiktok-pixel");
    for(let n=0;n<100;n++) events.ttqSearch(`query-${n}`);
    const order = {orderId:"rejected",items:[],totalValue:100};
    events.ttqPurchase(order);
    expect(localStorage.getItem("ttq_px_rejected")).toBeNull();
    const sdk = pixel(); window.ttq = sdk; events.flushPendingTiktokEvents();
    events.ttqPurchase(order);
    expect(sdk.track).toHaveBeenLastCalledWith("Purchase",expect.any(Object));
  });
});
