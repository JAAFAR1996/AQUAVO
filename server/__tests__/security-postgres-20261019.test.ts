import { beforeAll,afterAll,describe,it,expect,vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync } from "node:fs";
import { createHash,randomUUID } from "node:crypto";
vi.mock("../db.js",()=>({getDb:()=>null}));
import { issueAuthorizationCode,exchangeAuthorizationCode,rotateRefreshToken,isOAuthGrantActive } from "../services/oauth-grant-store.js";
import { eligibleCoupon } from "../services/coupon-policy.js";
let pg:PGlite,db:any;
const verifier="a".repeat(43),challenge=createHash("sha256").update(verifier).digest("base64url");
beforeAll(async()=>{
 pg=new PGlite();await pg.waitReady;db=drizzle(pg);
 await pg.exec(`CREATE TABLE users(id text primary key,password_hash text,role text,deleted_at timestamptz);
 CREATE TABLE sessions(sid text primary key,sess jsonb,expire timestamptz);
 CREATE TABLE orders(id text primary key,user_id text,coupon_id text,status text,payment_status text,is_test boolean default false);
 CREATE TABLE payments(id text primary key,order_id text,method text,status text);
 CREATE TABLE payment_events(order_id text,method text,event_type text,status text);
 CREATE TABLE schema_migrations(version text primary key,checksum text,notes text,applied_at timestamptz default now(),rolled_back_at timestamptz);
 CREATE TABLE coupons(id text primary key,code text,discount_type text,discount_value numeric,min_order_amount numeric,max_uses int,used_count int default 0,max_uses_per_user int,start_date timestamptz,end_date timestamptz,is_active boolean default true,description text,user_id text,created_at timestamptz default now());`);
 for(const file of ["0101_security_auth_and_checkout_boundaries","0102_wayl_monotonic_payment_guards"]){
   const source=readFileSync(`migrations/${file}.sql`,"utf8");
   const sha=createHash("sha256").update(source).digest("hex");
   await pg.query("SELECT set_config('aquavo.migration_checksum',$1,false)",[sha]);await pg.exec(source);
 }
});
afterAll(async()=>{await pg?.close();});
async function grant(scope="mcp:read"){
 const clientId=randomUUID();const code=await issueAuthorizationCode({clientId,redirectUri:"https://client.example/callback",codeChallenge:challenge,scope},db);
 const exchanged=await exchangeAuthorizationCode({code,clientId,redirectUri:"https://client.example/callback",verifier},db);
 expect(exchanged).not.toBeNull();return exchanged!;
}
describe("Persisted OAuth authorization with PostgreSQL transactions",()=>{
 it("binds one-time codes to client, redirect and PKCE",async()=>{
  const clientId=randomUUID(),redirectUri="https://client.example/callback";
  const code=await issueAuthorizationCode({clientId,redirectUri,codeChallenge:challenge,scope:"mcp:read"},db);
  expect(await exchangeAuthorizationCode({code,clientId:"other",redirectUri,verifier},db)).toBeNull();
  expect(await exchangeAuthorizationCode({code,clientId,redirectUri,verifier:"z".repeat(43)},db)).toBeNull();
  expect(await exchangeAuthorizationCode({code,clientId,redirectUri,verifier},db)).not.toBeNull();
  expect(await exchangeAuthorizationCode({code,clientId,redirectUri,verifier},db)).toBeNull();
 });
 it("refreshes read-only without widening and denies explicit escalation",async()=>{
  const g=await grant();
  expect(await rotateRefreshToken({refreshToken:g.refreshToken,clientId:g.clientId,scope:"mcp:write"},db)).toBeNull();
  const next=await rotateRefreshToken({refreshToken:g.refreshToken,clientId:g.clientId},db);
  expect(next?.scope).toBe("mcp:read");expect(await isOAuthGrantActive(g.grantId,g.clientId,"mcp:write",db)).toBe(false);
 });
 it("revokes the family on consumed refresh-token replay",async()=>{
  const g=await grant();const next=await rotateRefreshToken({refreshToken:g.refreshToken,clientId:g.clientId},db);
  expect(await isOAuthGrantActive(g.grantId,g.clientId,g.scope,db)).toBe(true);
  expect(await rotateRefreshToken({refreshToken:g.refreshToken,clientId:g.clientId},db)).toBeNull();
  expect(await isOAuthGrantActive(g.grantId,g.clientId,g.scope,db)).toBe(false);
  expect(await rotateRefreshToken({refreshToken:next!.refreshToken,clientId:g.clientId},db)).toBeNull();
 });
 it("does not let a wrong client consume or revoke a refresh token",async()=>{
  const g=await grant();expect(await rotateRefreshToken({refreshToken:g.refreshToken,clientId:"wrong"},db)).toBeNull();
  expect(await isOAuthGrantActive(g.grantId,g.clientId,g.scope,db)).toBe(true);
 });
 it("narrows future grants without silently re-expanding",async()=>{
  const g=await grant("mcp");const next=await rotateRefreshToken({refreshToken:g.refreshToken,clientId:g.clientId,scope:"mcp:read"},db);
  expect(next?.scope).toBe("mcp:read");expect(await isOAuthGrantActive(g.grantId,g.clientId,"mcp:write",db)).toBe(false);
 });
});
describe("Session revocation is tied atomically to identity changes",()=>{
 it("revokes only the affected identity and increments its epoch",async()=>{
  await pg.exec(`INSERT INTO users(id,password_hash,role) VALUES('u1','old','admin'),('u2','other','user');
    INSERT INTO sessions VALUES('s1','{"userId":"u1","authVersion":0}',now()+interval '1 hour'),('s2','{"userId":"u2","authVersion":0}',now()+interval '1 hour');
    UPDATE users SET password_hash='new' WHERE id='u1';`);
  expect((await pg.query<any>("SELECT auth_version FROM users WHERE id='u1'")).rows[0].auth_version).toBe(1);
  expect((await pg.query<any>("SELECT sid FROM sessions ORDER BY sid")).rows).toEqual([{sid:"s2"}]);
 });
 it("revokes on privilege/deletion changes, not an unchanged identity",async()=>{
  await pg.exec("UPDATE users SET role='admin' WHERE id='u1'");
  expect((await pg.query<any>("SELECT auth_version FROM users WHERE id='u1'")).rows[0].auth_version).toBe(1);
  await pg.exec("UPDATE users SET role='user' WHERE id='u1'");
  expect((await pg.query<any>("SELECT auth_version FROM users WHERE id='u1'")).rows[0].auth_version).toBe(2);
 });
});
describe("Paid state cannot regress on stale provider results",()=>{
 it("blocks stale updates in both payment and order records",async()=>{
  await pg.exec("INSERT INTO orders(id,payment_status) VALUES('paid','paid'); INSERT INTO payments VALUES('p','paid','wayl','completed'); INSERT INTO payment_events VALUES('paid','wayl','capture','completed');");
  await expect(pg.exec("UPDATE payments SET status='pending' WHERE id='p'")).rejects.toThrow(/MONOTONIC/);
  await expect(pg.exec("UPDATE orders SET payment_status='pending' WHERE id='paid'")).rejects.toThrow(/MONOTONIC/);
 });
 it("does not turn refund transitions into an unpaid transition",async()=>{
  await expect(pg.exec("UPDATE orders SET payment_status='refunded' WHERE id='paid'")).resolves.toBeDefined();
 });
});
describe("Coupon eligibility is enforced at the transaction boundary",()=>{
 it("rejects use by another account and checks per-account limits",async()=>{
  await pg.exec("INSERT INTO coupons(id,code,discount_type,discount_value,user_id,max_uses,max_uses_per_user) VALUES('c1','PERSONAL','percentage',3,'u1',10,1)");
  await expect(db.transaction((tx:any)=>eligibleCoupon(tx,'PERSONAL',{userId:'u2',subtotal:10000}))).rejects.toThrow();
  await expect(db.transaction((tx:any)=>eligibleCoupon(tx,'PERSONAL',{userId:'u1',subtotal:10000}))).resolves.toMatchObject({id:'c1'});
  await pg.exec("INSERT INTO orders(id,user_id,coupon_id,status,payment_status) VALUES('used','u1','c1','pending','pending')");
  await expect(db.transaction((tx:any)=>eligibleCoupon(tx,'PERSONAL',{userId:'u1',subtotal:10000}))).rejects.toThrow();
 });
 it("reserves global capacity while an online quote is payable",async()=>{
  await pg.exec("INSERT INTO coupons(id,code,discount_type,discount_value,max_uses,max_uses_per_user) VALUES('c2','ONE','percentage',3,1,NULL); INSERT INTO orders(id,coupon_id,status,payment_status) VALUES('hold','c2','pending_payment','pending')");
  await expect(db.transaction((tx:any)=>eligibleCoupon(tx,'ONE',{userId:null,subtotal:10000}))).rejects.toThrow();
  await pg.exec("UPDATE orders SET payment_status='failed' WHERE id='hold'");
  await expect(db.transaction((tx:any)=>eligibleCoupon(tx,'ONE',{userId:null,subtotal:10000}))).resolves.toMatchObject({id:'c2'});
 });
});
