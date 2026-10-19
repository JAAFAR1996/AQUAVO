import { beforeAll,beforeEach,describe,it,expect,vi } from "vitest";
import { randomUUID,randomBytes } from "node:crypto";
import express from "express";
import session from "express-session";
import request from "supertest";
const state=vi.hoisted(()=>({orders:new Map<string,any>(),create:vi.fn(),audit:vi.fn(),get:vi.fn()}));
vi.mock("../db.js",()=>({getDb:()=>null,db:null}));
vi.mock("../storage/index.js",()=>({storage:{getOrder:(id:string)=>state.get(id),createOrderSecure:(...args:any[])=>state.create(...args),createAuditLog:(...args:any[])=>state.audit(...args)}}));
vi.mock("../middleware/rate-limit.js",()=>({orderLimiter:(_q:any,_s:any,next:any)=>next(),orderTrackingLimiter:(_q:any,_s:any,next:any)=>next()}));
vi.mock("../middleware/auth.js",()=>({getSession:(req:any)=>req.session,requireAuth:(req:any,res:any,next:any)=>req.session?.userId?next():res.sendStatus(401)}));
vi.mock("@sentry/node",()=>({setTag:vi.fn()}));
vi.mock("../services/analytics-tracker.js",()=>({analyticsTracker:{trackSessionStatus:vi.fn(),trackPurchase:vi.fn()}}));
vi.mock("../storage/loyalty-storage.js",()=>({loyaltyStorage:{}}));
vi.mock("../storage/referral-storage.js",()=>({ReferralStorage:class {markFirstPurchase=vi.fn();}}));
vi.mock("../services/loyalty-notifications.js",()=>({loyaltyNotifications:{sendPostPurchaseNotifications:vi.fn()}}));
vi.mock("../services/order-notifications.js",()=>({sendOrderNotification:vi.fn(async()=>true)}));
vi.mock("../services/payment-maintenance.js",()=>({buildMerchantNotificationFromStoredOrder:vi.fn(),enqueueMerchantNotificationOutbox:vi.fn(async()=>{}),processPaymentOutboxForOrder:vi.fn(async()=>{})}));
vi.mock("../services/whatsapp-lifecycle.js",()=>({recordCheckoutWhatsAppMarketingOptIn:vi.fn(async()=>({ok:true}))}));
import { createOrderRouter } from "../routes/orders.js";
import { checkoutRequestHash,sessionHash } from "../services/checkout-security.js";
const input={items:[{productId:"synthetic-product",quantity:1}],customerInfo:{name:"Synthetic Customer",phone:"07000000000",address:"Synthetic address for isolated test"}};
let app:express.Express;
beforeAll(()=>{
 app=express();app.use(express.json());app.use(session({secret:randomBytes(32).toString("hex"),resave:false,saveUninitialized:false,cookie:{httpOnly:true}}));
 app.post("/fixture-login",(req,res)=>{req.session.userId=req.body.userId;res.sendStatus(204);});
 app.use("/api/orders",createOrderRouter());
 app.use((err:any,_req:any,res:any,_next:any)=>res.status(err.status ?? 500).json({message:"Controlled failure"}));
});
beforeEach(()=>{
 state.orders.clear();state.get.mockReset();state.audit.mockReset();state.create.mockReset();
 state.get.mockImplementation(async(id:string)=>state.orders.get(id));
 state.audit.mockResolvedValue(undefined);
 state.create.mockImplementation(async(userId:string|null,items:any[],customer:any,_coupon:any,_loyalty:any,id:string,context:any)=>{
  const order={id,userId,orderNumber:"SYNTHETIC",status:"pending",paymentStatus:"pending",total:"10000",roundedTotal:"10000",customerName:customer.name,
    customerPhone:customer.phone,shippingAddress:customer.address,clientIp:"PRIVATE-IP",checkoutSessionHash:sessionHash(context.ownerSessionId),checkoutRequestHash:context.requestHash,
    items:items.map(item=>({...item,productName:"Synthetic",priceAtPurchase:5000,costPrice:123,costStatus:"exact",costSource:"private"}))};
  state.orders.set(id,order);return order;
 });
});
describe("Real order HTTP response and replay authorization",()=>{
 it("creates once, redacts private fields, and replays only for the original guest session",async()=>{
  const agent=request.agent(app),key=randomUUID();
  const created=await agent.post("/api/orders").set("Idempotency-Key",key).send(input);
  expect(created.status).toBe(201);expect(created.body.id).toBe(key);expect(JSON.stringify(created.body)).not.toMatch(/costPrice|costStatus|checkoutSessionHash|checkoutRequestHash|PRIVATE-IP/);
  const replay=await agent.post("/api/orders").set("Idempotency-Key",key).send(input);
  expect(replay.status).toBe(200);expect(replay.body.id).toBe(key);expect(state.create).toHaveBeenCalledTimes(1);
  const stranger=await request(app).post("/api/orders").set("Idempotency-Key",key).send(input);
  expect(stranger.status).toBe(409);expect(JSON.stringify(stranger.body)).not.toContain(input.customerInfo.phone);
 });
 it("rejects a changed payload rather than returning a different order silently",async()=>{
  const agent=request.agent(app),key=randomUUID();await agent.post("/api/orders").set("Idempotency-Key",key).send(input);
  const replay=await agent.post("/api/orders").set("Idempotency-Key",key).send({...input,items:[{productId:"different",quantity:1}]});
  expect(replay.status).toBe(409);expect(state.create).toHaveBeenCalledTimes(1);
 });
 it("rejects another account even on the create-error fallback path",async()=>{
  const key=randomUUID(),owner={id:key,userId:"owner",checkoutRequestHash:checkoutRequestHash(input),customerPhone:"PRIVATE",items:[]};
  state.get.mockResolvedValueOnce(undefined).mockResolvedValueOnce(owner);
  state.create.mockRejectedValueOnce(new Error("Simulated concurrent unique conflict"));
  const stranger=request.agent(app);await stranger.post("/fixture-login").send({userId:"not-owner"});
  const result=await stranger.post("/api/orders").set("Idempotency-Key",key).send(input);
  expect(result.status).toBe(409);expect(JSON.stringify(result.body)).not.toContain("PRIVATE");
 });
 it("allows a same-account concurrent retry while still filtering its private row",async()=>{
  const key=randomUUID(),owner={id:key,userId:"owner",checkoutRequestHash:checkoutRequestHash(input),clientIp:"PRIVATE",items:[{productId:"p",quantity:1,costPrice:123}]};
  state.get.mockResolvedValueOnce(undefined).mockResolvedValueOnce(owner);
  state.create.mockRejectedValueOnce(new Error("Simulated concurrent unique conflict"));
  const agent=request.agent(app);await agent.post("/fixture-login").send({userId:"owner"});
  const result=await agent.post("/api/orders").set("Idempotency-Key",key).send(input);
  expect(result.status).toBe(200);expect(result.body.id).toBe(key);expect(JSON.stringify(result.body)).not.toMatch(/PRIVATE|costPrice|checkoutRequestHash/);
 });
});
