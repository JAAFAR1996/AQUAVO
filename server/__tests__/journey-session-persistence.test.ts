import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import session from "express-session";
import request from "supertest";
import journeyRouter from "../routes/journey.js";
import { storage } from "../storage/index.js";

vi.mock("../storage/index.js", () => ({storage:{getJourneyPlan:vi.fn(),createJourneyPlan:vi.fn(),updateJourneyPlan:vi.fn(),deleteJourneyPlan:vi.fn()}}));

function createApp(store = new session.MemoryStore()) {
  const app = express();
  app.use(express.json());
  app.use(session({store,secret:"isolated-journey-test-session-secret",resave:false,saveUninitialized:false}));
  app.use(journeyRouter);
  app.use((_error:Error,_req:express.Request,res:express.Response,_next:express.NextFunction) => {res.status(503).json({success:false});});
  return app;
}

beforeEach(() => {vi.clearAllMocks();});
describe("guest journey draft identity", () => {
  it("persists a session on save and reuses it for the next visit", async () => {
    vi.mocked(storage.getJourneyPlan).mockResolvedValue(undefined);
    const app = createApp(), visitor = request.agent(app);
    const read = await visitor.get("/api/journey/plans");
    expect(read.headers["set-cookie"]).toBeUndefined();
    expect(storage.getJourneyPlan).not.toHaveBeenCalled();
    const saved = await visitor.post("/api/journey/plans").send({tankSize:"60",currentStep:1});
    expect(saved.status).toBe(200);
    expect(saved.headers["set-cookie"]).toBeTruthy();
    const identity = vi.mocked(storage.createJourneyPlan).mock.calls[0][0].sessionId;
    expect(identity).toBeTruthy();
    await visitor.get("/api/journey/plans");
    expect(storage.getJourneyPlan).toHaveBeenLastCalledWith(undefined,identity);
    vi.mocked(storage.getJourneyPlan).mockClear();
    await request(app).get("/api/journey/plans");
    expect(storage.getJourneyPlan).not.toHaveBeenCalled();
  });
  it("never writes an orphaned draft if session persistence fails", async () => {
    const store = new session.MemoryStore();
    vi.spyOn(store,"set").mockImplementation((_sid,_session,callback) => callback?.(new Error("synthetic store failure")));
    expect((await request(createApp(store)).post("/api/journey/plans").send({tankSize:"60"})).status).toBe(503);
    expect(storage.createJourneyPlan).not.toHaveBeenCalled();
    expect(storage.updateJourneyPlan).not.toHaveBeenCalled();
  });
  it("rejects unbounded or invalid plan data before persistence", async () => {
    expect((await request(createApp()).post("/api/journey/plans").send({fishTypes:Array.from({length:100},()=>"x")})).status).toBe(400);
    expect(storage.createJourneyPlan).not.toHaveBeenCalled();
  });
});
