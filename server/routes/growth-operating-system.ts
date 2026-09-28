import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { apiLimiter } from "../middleware/rate-limit.js";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";
import {
  captureBusinessExpense,
  getAttributionHealth,
  getBundles,
  getCustomerAquariumProfiles,
  getExpenseCompleteness,
  getGrowthOverview,
  getInventoryIntelligence,
  getLifecycleOverview,
  markLifecycleJobCompleted,
  recordPurchaseMeasurementReceipt,
  refreshGrowthOs,
  seedDefaultBundles,
  suppressLifecycleJob,
  updateCustomerAquariumProfile,
} from "../services/growth-operating-system.js";

const daySchema=z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])-([012]\d|3[01])$/);
const receiptSchema=z.object({
  orderId:z.string().trim().min(1).max(200),
  provider:z.enum(["google_tag","meta_pixel","tiktok","posthog"]),
  eventKey:z.string().trim().min(1).max(200),
  status:z.enum(["emitted","blocked","failed"]),
  clientValueIqd:z.number().nonnegative().nullable().optional(),
  details:z.record(z.unknown()).optional(),
}).strict();

const profileSchema=z.object({
  tankVolumeLiters:z.number().positive().max(100000).nullable().optional(),
  tankDimensions:z.record(z.unknown()).optional(),
  livestock:z.array(z.unknown()).optional(),
  plants:z.array(z.unknown()).optional(),
  filterSetup:z.record(z.unknown()).optional(),
  heaterSetup:z.record(z.unknown()).optional(),
  waterProfile:z.record(z.unknown()).optional(),
  goals:z.array(z.unknown()).optional(),
  notes:z.string().max(2000).nullable().optional(),
  source:z.enum(["admin","customer","import","conversation"]).optional(),
}).strict();

const expenseSchema=z.object({
  fingerprint:z.string().trim().min(3).max(300),
  expenseDate:daySchema,
  category:z.string().trim().min(2).max(100),
  amountIqd:z.number().nonnegative(),
  originalAmount:z.number().nonnegative().nullable().optional(),
  currency:z.string().trim().min(3).max(8).optional(),
  vendor:z.string().trim().max(200).nullable().optional(),
  description:z.string().trim().max(1000).nullable().optional(),
  source:z.string().trim().min(2).max(100),
  evidence:z.record(z.unknown()).optional(),
}).strict();

export function createGrowthPublicRouter(){
  const router=Router();

  router.get("/bundles",apiLimiter,async(_req:Request,res:Response,next:NextFunction)=>{
    try{
      res.setHeader("Cache-Control","public, max-age=60, stale-while-revalidate=300");
      res.json(await getBundles(true));
    }catch(error){next(error);}
  });

  router.post("/purchase-receipt",apiLimiter,async(req:Request,res:Response,next:NextFunction)=>{
    try{
      const parsed=receiptSchema.safeParse(req.body);
      if(!parsed.success){
        res.status(400).json({message:"Invalid measurement receipt"});
        return;
      }
      // Always return 204 after a valid shape. This endpoint is diagnostic only
      // and must not become an order-existence oracle.
      await recordPurchaseMeasurementReceipt({
        publicOrderId:parsed.data.orderId,
        provider:parsed.data.provider,
        eventKey:parsed.data.eventKey,
        status:parsed.data.status,
        clientValueIqd:parsed.data.clientValueIqd,
        details:parsed.data.details,
      });
      res.status(204).end();
    }catch(error){next(error);}
  });

  return router;
}

export function createGrowthAdminRouter(){
  const router=Router();
  router.use(requireAccountingAdmin);
  router.use((_req,res,next)=>{
    res.setHeader("Cache-Control","no-store");
    next();
  });

  router.get("/overview",async(_req,res,next)=>{
    try{res.json(await getGrowthOverview());}catch(error){next(error);}
  });
  router.get("/attribution",async(_req,res,next)=>{
    try{res.json(await getAttributionHealth());}catch(error){next(error);}
  });
  router.get("/inventory",async(req,res,next)=>{
    try{
      const day=typeof req.query.day==="string"?req.query.day:undefined;
      res.json(await getInventoryIntelligence(Number(req.query.limit ?? 50),day));
    }catch(error){next(error);}
  });
  router.get("/lifecycle",async(req,res,next)=>{
    try{res.json(await getLifecycleOverview(Number(req.query.limit ?? 50)));}catch(error){next(error);}
  });
  router.post("/lifecycle/:id/complete",async(req,res,next)=>{
    try{
      const result=await markLifecycleJobCompleted(req.params.id);
      if(!result.ok){res.status(404).json(result);return;}
      res.json(result);
    }catch(error){next(error);}
  });
  router.post("/lifecycle/:id/suppress",async(req,res,next)=>{
    try{
      const parsed=z.object({reason:z.string().trim().min(2).max(500)}).strict().safeParse(req.body);
      if(!parsed.success){res.status(400).json({message:"Invalid suppression reason",issues:parsed.error.issues});return;}
      const result=await suppressLifecycleJob(req.params.id,parsed.data.reason);
      if(!result.ok){res.status(404).json(result);return;}
      res.json(result);
    }catch(error){next(error);}
  });

  router.get("/profiles",async(req,res,next)=>{
    try{res.json(await getCustomerAquariumProfiles(Number(req.query.limit ?? 50)));}catch(error){next(error);}
  });
  router.put("/profiles/:id",async(req,res,next)=>{
    try{
      const id=Number(req.params.id);
      const parsed=profileSchema.safeParse(req.body);
      if(!Number.isInteger(id)||id<=0||!parsed.success){
        res.status(400).json({message:"Invalid aquarium profile",issues:parsed.success?[]:parsed.error.issues});
        return;
      }
      const result=await updateCustomerAquariumProfile({id,...parsed.data});
      if(!result.ok){res.status(404).json(result);return;}
      res.json(result);
    }catch(error){next(error);}
  });

  router.get("/bundles",async(_req,res,next)=>{
    try{res.json(await getBundles(false));}catch(error){next(error);}
  });
  router.post("/bundles/seed",async(_req,res,next)=>{
    try{res.json(await seedDefaultBundles());}catch(error){next(error);}
  });
  router.get("/expenses/completeness",async(_req,res,next)=>{
    try{res.json(await getExpenseCompleteness());}catch(error){next(error);}
  });
  router.post("/expenses",async(req,res,next)=>{
    try{
      const parsed=expenseSchema.safeParse(req.body);
      if(!parsed.success){res.status(400).json({message:"Invalid expense payload",issues:parsed.error.issues});return;}
      res.json(await captureBusinessExpense(parsed.data));
    }catch(error){next(error);}
  });
  router.post("/refresh",async(req,res,next)=>{
    try{
      const parsed=z.object({day:daySchema.optional()}).strict().safeParse(req.body ?? {});
      if(!parsed.success){res.status(400).json({message:"Invalid day",issues:parsed.error.issues});return;}
      res.json(await refreshGrowthOs(parsed.data.day));
    }catch(error){next(error);}
  });

  return router;
}
