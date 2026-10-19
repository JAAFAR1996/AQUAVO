import { describe,it,expect } from "vitest";
import { createHash } from "node:crypto";
import { normalizeOAuthScope,scopeIsSubset,verifyS256 } from "../services/oauth-policy.js";
import { assertCheckoutReplay,checkoutRequestHash,normalizeCheckoutLines,sessionHash } from "../services/checkout-security.js";
import { toPublicOrder } from "../../shared/public-order.js";
import { couponBenefit } from "../services/coupon-policy.js";
import { buildProductCostSnapshot } from "../services/product-cost-snapshot.js";

const input={items:[{productId:"p1",quantity:2,variantId:"small"}],customerInfo:{name:"Test Customer",phone:"07000000000",address:"Synthetic test address"}};
const requestHash=checkoutRequestHash(input);
describe("OAuth privilege boundaries",()=>{
 it("defaults and normalizes without implicit writes",()=>{expect(normalizeOAuthScope("mcp:read")).toBe("mcp:read");expect(normalizeOAuthScope("mcp:admin")).toBeNull();expect(normalizeOAuthScope("")).toBeNull();});
 it("never allows widening a read grant during refresh",()=>{expect(scopeIsSubset("mcp:write","mcp:read")).toBe(false);expect(scopeIsSubset("mcp","mcp:read")).toBe(false);expect(scopeIsSubset("mcp:read","mcp")).toBe(true);});
 it("requires S256 verifier syntax and exact digest",()=>{const verifier="v".repeat(43);const challenge=createHash("sha256").update(verifier).digest("base64url");expect(verifyS256(verifier,challenge)).toBe(true);expect(verifyS256("w".repeat(43),challenge)).toBe(false);expect(verifyS256("short",challenge)).toBe(false);});
});
describe("Checkout replay ownership",()=>{
 it("permits the same logged-in account and original body",()=>{expect(()=>assertCheckoutReplay({userId:"u1",checkoutRequestHash:requestHash},{userId:"u1",sessionId:"changed-login-session",requestHash})).not.toThrow();});
 it("rejects another account even when it knows the order ID and body",()=>{expect(()=>assertCheckoutReplay({userId:"u1",checkoutRequestHash:requestHash},{userId:"u2",sessionId:"s",requestHash})).toThrow();});
 it("requires the original server-issued guest session",()=>{const order={userId:null,checkoutSessionHash:sessionHash("original"),checkoutRequestHash:requestHash};expect(()=>assertCheckoutReplay(order,{sessionId:"original",requestHash})).not.toThrow();expect(()=>assertCheckoutReplay(order,{sessionId:"different",requestHash})).toThrow();});
 it("fails closed for legacy or changed-body replays",()=>{expect(()=>assertCheckoutReplay({userId:"u1"},{userId:"u1",sessionId:"s",requestHash})).toThrow();expect(()=>assertCheckoutReplay({userId:"u1",checkoutRequestHash:requestHash},{userId:"u1",sessionId:"s",requestHash:checkoutRequestHash({...input,items:[{productId:"p1",quantity:3}]})})).toThrow();});
 it("canonicalizes lines and rejects an aggregated over-limit",()=>{expect(normalizeCheckoutLines([{productId:"z",quantity:1},{productId:"a",quantity:1},{productId:"z",quantity:2}])).toEqual([{productId:"a",quantity:1},{productId:"z",quantity:3}]);expect(()=>normalizeCheckoutLines([{productId:"a",quantity:60},{productId:"a",quantity:60}])).toThrow();});
 it("returns an allowlisted payload, not a serialized private row",()=>{const safe=toPublicOrder({id:"order",customerName:"Test",checkoutSessionHash:"secret",checkoutRequestHash:"secret",clientIp:"private",futureSecret:"private",items:[{productId:"p1",quantity:1,priceAtPurchase:5000,costPrice:1000,costStatus:"exact",costSource:"private"}]});expect(safe.id).toBe("order");expect(safe.items[0].productId).toBe("p1");expect(JSON.stringify(safe)).not.toMatch(/secret|private|costPrice|costStatus|clientIp/);});
});
describe("Discount and variant-cost integrity",()=>{
 it("caps fixed discounts at product subtotal",()=>{expect(couponBenefit({type:"fixed",value:"50000"},10000,5000)).toEqual({discount:10000,shipping:5000});});
 it("rejects invalid percentages and keeps free delivery explicit",()=>{expect(()=>couponBenefit({type:"percentage",value:"101"},10000,5000)).toThrow();expect(couponBenefit({type:"free_shipping",value:"0"},10000,5000)).toEqual({discount:0,shipping:0});});
 it("freezes selected-option cost instead of a different parent cost",()=>{const p={costPrice:436,costPriceResolution:"known",packagingCost:0,packagingCostResolution:"verified_zero",insertCost:0,insertCostResolution:"verified_zero",variants:[{id:"small",costPrice:50,costStatus:"verified_derived"}]};expect(buildProductCostSnapshot(p,new Date(),"small").costPrice).toBe(50);expect(buildProductCostSnapshot(p,new Date(),"small").costStatus).toBe("exact");expect(buildProductCostSnapshot(p,new Date(),"unknown").costStatus).toBe("incomplete");});
});
