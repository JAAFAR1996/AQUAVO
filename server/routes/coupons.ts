import { Router, type Router as RouterType, type Request,type Response } from "express";
import { getDb } from "../db.js";
import { getSession } from "../middleware/auth.js";
import { apiLimiter } from "../middleware/rate-limit.js";
import { eligibleCoupon,CouponPolicyError } from "../services/coupon-policy.js";
export function createCouponRouter():RouterType {
  const router=Router();
  router.post("/validate",apiLimiter,async(req:Request,res:Response):Promise<void>=>{
    res.setHeader("Cache-Control","no-store");
    const code=req.body?.code,subtotal=Number(req.body?.totalAmount);
    if (typeof code!=="string" || !Number.isFinite(subtotal) || subtotal<0) { res.status(400).json({message:"بيانات الكوبون غير صالحة."}); return; }
    const db=getDb();if (!db) {res.status(503).json({message:"تعذر التحقق من الكوبون حاليا."});return;}
    try {
      const c=await db.transaction(tx=>eligibleCoupon(tx,code,{userId:getSession(req)?.userId ?? null,subtotal}));
      // No customer identity or internal coupon metadata is exposed.
      res.json({id:c.id,code:c.code,type:c.type,value:c.value,minOrderAmount:c.minOrderAmount,
        maxUses:c.maxUses,usedCount:c.usedCount,isActive:c.isActive,startDate:c.startDate,endDate:c.endDate});
    } catch(error) {res.status(error instanceof CouponPolicyError?error.status:503).json({message:error instanceof CouponPolicyError?error.message:"تعذر التحقق من الكوبون حاليا."});}
  });
  return router;
}
