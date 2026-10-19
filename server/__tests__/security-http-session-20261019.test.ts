import { beforeAll,afterAll,describe,it,expect,vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync } from "node:fs";
import { createHash,randomBytes } from "node:crypto";
import express from "express";
import session from "express-session";
import request from "supertest";
const state=vi.hoisted(()=>({db:null as any}));
vi.mock("../db.js",()=>({getDb:()=>state.db}));
import { DrizzleSessionStore } from "../session-store.js";
import { establishAuthenticatedSession } from "../services/authenticated-session.js";
import { isOAuthGrantActive } from "../services/oauth-grant-store.js";
let pg:PGlite,app:express.Express,store:DrizzleSessionStore,verifyToken:any;
const password="synthetic-owner-password",verifier="x".repeat(43);
const challenge=createHash("sha256").update(verifier).digest("base64url");
beforeAll(async()=>{
 pg=new PGlite();await pg.waitReady;state.db=drizzle(pg);
 await pg.exec(`CREATE TABLE users(id text primary key,password_hash text,role text,deleted_at timestamptz);
 CREATE TABLE sessions(sid text primary key,sess jsonb,expire timestamptz);
 CREATE TABLE orders(id text primary key);
 CREATE TABLE schema_migrations(version text primary key,checksum text,notes text,applied_at timestamptz default now(),rolled_back_at timestamptz);`);
 const source=readFileSync("migrations/0101_security_auth_and_checkout_boundaries.sql","utf8");
 await pg.query("SELECT set_config('aquavo.migration_checksum',$1,false)",[createHash("sha256").update(source).digest("hex")]);await pg.exec(source);
 await pg.exec("INSERT INTO users(id,password_hash,role) VALUES('owner','original','admin')");
 vi.stubEnv("AQUAVO_MCP_SECRET",randomBytes(32).toString("hex"));vi.stubEnv("AQUAVO_MCP_ADMIN_PASSWORD",password);
 const oauth=await import("../routes/oauth.js");verifyToken=oauth.verifyMcpToken;
 app=express();app.use(express.json());app.use(express.urlencoded({extended:false}));app.use(oauth.createOAuthRouter());
 store=new DrizzleSessionStore();
 app.use(session({store,secret:randomBytes(32).toString("hex"),resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"strict",maxAge:3600000}}));
 app.get("/test/guest",(req,res)=>{req.session.checkoutStarted=true;res.json({sid:req.sessionID});});
 app.post("/test/login",async(req,res,next)=>{try{await establishAuthenticatedSession(req,{id:"owner",authVersion:0});res.json({sid:req.sessionID});}catch(e){next(e);}});
 app.get("/test/private",(req,res)=>{res.status(req.session.userId?200:401).json({authorized:Boolean(req.session.userId)});});
});
afterAll(async()=>{vi.unstubAllEnvs();await pg?.close();});
describe("Real HTTP OAuth grant exchange",()=>{
 it("exchanges and refreshes read permission without privilege escalation",async()=>{
  const registered=await request(app).post("/oauth/register").send({redirect_uris:["https://client.example/callback"],client_name:"Synthetic integration test"});expect(registered.status).toBe(201);
  const client_id=registered.body.client_id;
  const authorized=await request(app).post("/oauth/authorize").type("form").send({client_id,redirect_uri:"https://client.example/callback",scope:"mcp:read",code_challenge:challenge,code_challenge_method:"S256",password});expect(authorized.status).toBe(303);
  const code=new URL(authorized.headers.location).searchParams.get("code");
  const token=await request(app).post("/oauth/token").send({grant_type:"authorization_code",client_id,redirect_uri:"https://client.example/callback",code,code_verifier:verifier});expect(token.status).toBe(200);expect(token.body.scope).toBe("mcp:read");
  const refreshed=await request(app).post("/oauth/token").send({grant_type:"refresh_token",client_id,refresh_token:token.body.refresh_token});expect(refreshed.status).toBe(200);expect(refreshed.body.scope).toBe("mcp:read");
  const claims=verifyToken(refreshed.body.access_token);expect(claims.scope).toBe("mcp:read");expect(await isOAuthGrantActive(claims.grantId,claims.clientId,"mcp:write",state.db)).toBe(false);
  expect(verifyToken(refreshed.body.access_token+"x")).toBeNull();
  const revoke=await request(app).post("/oauth/revoke").send({client_id,token:refreshed.body.refresh_token});expect(revoke.status).toBe(200);expect(await isOAuthGrantActive(claims.grantId,claims.clientId,"mcp:read",state.db)).toBe(false);
 });
 it("refuses plain PKCE and unrecognized scopes before granting access",async()=>{
  expect((await request(app).post("/oauth/authorize").send({client_id:"not-valid",code_challenge:"plain",code_challenge_method:"plain",scope:"mcp:read",password})).status).toBe(400);
  expect((await request(app).post("/oauth/authorize").send({client_id:"not-valid",code_challenge:challenge,scope:"mcp:admin",password})).status).toBe(400);
 });
});
describe("Persistent production session store",()=>{
 it("rotates the SID on login and rejects it after a password change",async()=>{
  const agent=request.agent(app);const guest=await agent.get("/test/guest");const logged=await agent.post("/test/login");expect(logged.status).toBe(200);expect(logged.body.sid).not.toBe(guest.body.sid);expect((await agent.get("/test/private")).status).toBe(200);
  await pg.exec("UPDATE users SET password_hash='replacement' WHERE id='owner'");expect((await agent.get("/test/private")).status).toBe(401);
 });
 it("rejects a resurrected stale version and pre-upgrade sessions",async()=>{
  await pg.query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 hour')",["resurrected",JSON.stringify({userId:"owner",authVersion:0,cookie:{maxAge:3600000}})]);
  const value=await new Promise((resolve,reject)=>store.get("resurrected",(err,data)=>err?reject(err):resolve(data)));expect(value).toBeNull();
  await pg.query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 hour')",["legacy",JSON.stringify({userId:"owner",cookie:{maxAge:3600000}})]);
  expect(await new Promise((resolve,reject)=>store.get("legacy",(err,data)=>err?reject(err):resolve(data)))).toBeNull();
 });
});
