import { beforeEach,describe,it,expect,vi } from "vitest";
import { getTableName } from "drizzle-orm";
const state=vi.hoisted(()=>({db:null as any,provider:vi.fn()}));
vi.mock("../db.js",()=>({getDb:()=>state.db}));
vi.mock("../storage/loyalty-storage.js",()=>({loyaltyStorage:{}}));
vi.mock("../services/order-notifications.js",()=>({sendTelegramMessage:vi.fn(async()=>{})}));
vi.mock("../services/payment-maintenance.js",()=>({enqueuePaidOrderOutbox:vi.fn(),processPaymentOutboxForOrder:vi.fn(async()=>{})}));
vi.mock("../services/wayl-client.js",()=>({createWaylLink:vi.fn(),getWaylLinkByReferenceId:(...args:any[])=>state.provider(...args)}));
import { verifyAndSyncWaylPayment } from "../services/wayl-order-payment.js";
let order:any,payment:any,writes:any[];
function copy(v:any){return structuredClone(v);}
beforeEach(()=>{
 order={id:"synthetic",orderNumber:"SYNTHETIC",status:"pending_payment",paymentStatus:"pending",total:"10000",roundedTotal:"10000",items:[]};
 payment={id:"payment",orderId:order.id,method:"wayl",status:"pending",amount:"10000",currency:"IQD",transactionId:order.id,providerResponse:{attempts:[{referenceId:order.id,status:"Pending"}]}};
 writes=[];state.provider.mockReset();
 const db:any={
  select:()=>({from:(table:any)=>({where:()=>({limit:async()=>[copy(getTableName(table)==="orders"?order:payment)]})})}),
  execute:async()=>({rows:[]}),
  update:(table:any)=>({set:(values:any)=>({where:()=>{writes.push({table:getTableName(table),values});const target=getTableName(table)==="orders"?order:payment;Object.assign(target,values);return {then:(fn:any)=>Promise.resolve(fn([copy(target)])),returning:async()=>[copy(target)]};}})}),
  transaction:async(fn:any)=>fn(db),
 };state.db=db;
});
describe("Provider I/O interleaving executes the real verification service",()=>{
 it("does not apply a stale Pending result after another verifier committed payment",async()=>{
  let release!:(v:any)=>void;let started!:()=>void;const barrier=new Promise<void>(resolve=>{started=resolve;});
  state.provider.mockImplementation(()=>{started();return new Promise(resolve=>{release=resolve;});});
  const pending=verifyAndSyncWaylPayment("synthetic");await barrier;
  order.paymentStatus="paid";order.status="pending";payment.status="completed";
  release({referenceId:"synthetic",total:10000,currency:"IQD",status:"Pending"});
  const result=await pending;expect(result.paymentStatus).toBe("paid");expect(order.paymentStatus).toBe("paid");expect(payment.status).toBe("completed");expect(writes).toHaveLength(0);
 });
 it("does not update an old attempt once a new current attempt was committed",async()=>{
  state.provider.mockImplementation(async()=>{payment.transactionId="synthetic#r1";return {referenceId:"synthetic",total:10000,currency:"IQD",status:"Rejected"};});
  const result=await verifyAndSyncWaylPayment("synthetic");expect(result.paymentStatus).toBe("pending");expect(payment.transactionId).toBe("synthetic#r1");expect(writes).toHaveLength(0);
 });
 it("still records a current, verified non-paid terminal result",async()=>{
  state.provider.mockResolvedValue({referenceId:"synthetic",total:10000,currency:"IQD",status:"Rejected"});
  const result=await verifyAndSyncWaylPayment("synthetic");expect(result.paymentStatus).toBe("failed");expect(order.paymentStatus).toBe("failed");expect(writes.map(x=>x.table)).toEqual(["payments","orders"]);
 });
});
