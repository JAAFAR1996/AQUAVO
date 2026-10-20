/**
 * AQUAVO treasury cashbook: a location-of-funds subledger, NOT revenue recognition.
 *
 * - The posted GL remains the source of truth for accounting balances and P&L.
 * - Physical accounts start as UNKNOWN until the owner confirms a timestamped opening.
 * - Bank cards are aliases of their bank/wallet funding account (no duplicate asset).
 * - Wayl capture is not a bank deposit; only a documented payout credits cashbook.
 * - Manual movements here do not post a second GL journal or recognize a sale.
 */
import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db.js";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";

const id = z.string().min(1).max(100);
const timestamp = z.string().datetime({ offset: true });
// Reject blank/null amounts instead of coercing them to zero.
const inputMoney = z.union([z.number().finite(), z.string().trim().min(1)]).transform(Number);
const money = inputMoney.pipe(z.number().finite().int().min(-1_000_000_000_000).max(1_000_000_000_000));
const positiveAmount = inputMoney.pipe(z.number().finite().int().positive().max(1_000_000_000_000));
const nonnegativeAmount = inputMoney.pipe(z.number().finite().int().min(0).max(1_000_000_000_000));
const note = z.string().trim().min(5).max(1000);
const accountInput = z.object({
  name: z.string().trim().min(2).max(120),
  kind: z.enum(["cash", "bank", "wallet", "card"]),
  linkedAccountId: id.optional(),
  lastFour: z.string().regex(/^\d{4}$/).optional(),
  openingBalance: money.optional(),
  openingAt: timestamp.optional(),
  openingNote: note.optional(),
}).strict().superRefine((v, ctx) => {
  const hasOpening = v.openingBalance !== undefined || v.openingAt !== undefined || v.openingNote !== undefined;
  if (v.kind === "card") {
    if (!v.linkedAccountId || hasOpening) {
      ctx.addIssue({ code: "custom", message: "البطاقة تحتاج حساباً مرتبطاً، وليس رصيداً مستقلاً" });
    }
  } else if (v.linkedAccountId || (hasOpening &&
      (v.openingBalance === undefined || !v.openingAt || !v.openingNote))) {
    ctx.addIssue({ code: "custom", message: "الرصيد الافتتاحي يحتاج مبلغاً وتاريخاً وإثباتاً معاً" });
  }
});
const openingInput = z.object({
  openingBalance: money, openingAt: timestamp, openingNote: note,
}).strict();
const movementInput = z.object({
  kind: z.enum(["deposit","withdrawal","transfer"]),
  fromAccountId: id.optional(),
  toAccountId: id.optional(),
  amount: positiveAmount,
  occurredAt: timestamp,
  reference: z.string().trim().max(150).optional(),
  note,
  evidenceNote: note,
}).strict();
const reconciliationInput = z.object({
  accountId: id,
  statementAt: timestamp,
  statementBalance: money,
  evidenceNote: note,
}).strict();
const gatewayInput = z.object({
  paymentId: id,
  toAccountId: id,
  feeAmount: nonnegativeAmount,
  occurredAt: timestamp,
  reference: z.string().trim().min(3).max(150),
  evidenceNote: note,
}).strict();

type Row = Record<string, any>;
function rows(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const data = (result as { rows?: Row[] } | null)?.rows;
  return Array.isArray(data) ? data : [];
}
function bad(message: string, statusCode = 400): Error {
  return Object.assign(new Error(message), { statusCode });
}
function numberOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) throw bad("الرصيد المالي غير صالح", 500);
  return n;
}
function normalize(r: Row): Row {
  const fields = ["opening_balance","tracked_balance","amount","statement_balance",
    "difference","gross_amount","fee_amount","net_amount","balance","total"];
  return Object.fromEntries(Object.entries(r).map(([k,v]) =>
    [k, fields.includes(k) ? numberOrNull(v) : v]));
}
function checkDate(value: string) {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || ms > Date.now() + 300_000) throw bad("لا يمكن تسجيل حركة بتاريخ مستقبلي");
}
function actor(req: Request) {
  return (req as Request & {user?: {id?: string}}).user?.id ?? req.session?.userId ?? "admin";
}
async function assertSchema(db: NonNullable<ReturnType<typeof getDb>>) {
  const result = rows(await db.execute(sql`
    SELECT to_regclass('public.treasury_accounts') IS NOT NULL AS accounts,
           to_regclass('public.treasury_movements') IS NOT NULL AS movements,
           to_regclass('public.treasury_reconciliations') IS NOT NULL AS reconciliations,
           to_regclass('public.treasury_gateway_allocations') IS NOT NULL AS allocations
  `))[0];
  if (!result || Object.values(result).some((v) => v !== true)) {
    throw bad("TREASURY_MIGRATION_0103_REQUIRED", 503);
  }
}
type Tx = any;
async function resolveAccount(tx: Tx, requestedId: string): Promise<{ id: string; kind: string; opening_at: string }> {
  const first = rows(await tx.execute(sql`
    SELECT id,kind,linked_account_id,opening_at,active FROM public.treasury_accounts
    WHERE id=${requestedId} FOR UPDATE`))[0];
  if (!first || first.active !== true) throw bad("الحساب غير موجود أو غير فعال", 404);
  const account = first.kind === "card"
    ? rows(await tx.execute(sql`
        SELECT id,kind,opening_at,active FROM public.treasury_accounts
        WHERE id=${first.linked_account_id} FOR UPDATE`))[0]
    : first;
  if (!account || account.active !== true || account.kind === "card") throw bad("الحساب المرتبط بالبطاقة غير صالح", 409);
  if (!account.opening_at) throw bad("ثبّت الرصيد الافتتاحي للحساب أولاً، حتى لا نعرض رصيداً وهمياً", 409);
  return { id: String(account.id), kind: String(account.kind), opening_at: String(account.opening_at) };
}
async function guardMovementTime(tx: Tx, account: {id:string; opening_at:string}, occurredAt: string) {
  if (Date.parse(occurredAt) < Date.parse(account.opening_at)) throw bad("الحركة أقدم من الرصيد الافتتاحي", 409);
  const latest = rows(await tx.execute(sql`
    SELECT max(statement_at) AS last_at FROM public.treasury_reconciliations
    WHERE account_id=${account.id}`))[0]?.last_at;
  if (latest && Date.parse(occurredAt) <= Date.parse(String(latest))) {
    throw bad("الحركة بتاريخ مشمول بمطابقة سابقة؛ تحتاج معالجة محاسبية للمطابقة أولاً", 409);
  }
}
async function trackedAt(tx: Tx, accountId: string, at: string): Promise<number> {
  const found = rows(await tx.execute(sql`
    SELECT a.opening_balance + COALESCE((
      SELECT sum(CASE WHEN m.to_account_id=a.id THEN m.amount ELSE -m.amount END)
      FROM public.treasury_movements m
      WHERE (m.to_account_id=a.id OR m.from_account_id=a.id)
        AND m.occurred_at >= a.opening_at AND m.occurred_at <= ${at}::timestamptz
    ),0) AS total
    FROM public.treasury_accounts a WHERE a.id=${accountId}`))[0];
  const value = numberOrNull(found?.total);
  if (value === null) throw bad("الحساب ليس له رصيد افتتاحي مؤكد", 409);
  return value;
}

export function createTreasuryV1Router() {
  const router = Router();
  router.use(requireAccountingAdmin);
  router.use((_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); });

  router.get("/v2/treasury", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getDb(); if (!db) throw bad("قاعدة البيانات غير متوفرة",503);
      await assertSchema(db);
      const result = await db.transaction(async tx => {
        await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`);
        const accountResult = await tx.execute(sql`
          SELECT a.id,a.name,a.kind,a.linked_account_id,a.last_four,
                 a.opening_balance,a.opening_at,a.opening_note,a.active,
                 CASE WHEN a.kind='card' OR a.opening_balance IS NULL THEN NULL
                      ELSE a.opening_balance + COALESCE((
                        SELECT sum(CASE WHEN m.to_account_id=a.id THEN m.amount ELSE -m.amount END)
                        FROM public.treasury_movements m
                        WHERE (m.from_account_id=a.id OR m.to_account_id=a.id)
                          AND m.occurred_at >= a.opening_at
                      ),0) END AS tracked_balance,
                 (SELECT jsonb_build_object('statementAt',r.statement_at,
                      'statementBalance',r.statement_balance,'trackedBalance',r.tracked_balance,
                      'difference',r.difference,'evidenceNote',r.evidence_note)
                  FROM public.treasury_reconciliations r WHERE r.account_id=a.id
                  ORDER BY r.statement_at DESC,r.created_at DESC LIMIT 1) AS latest_reconciliation
          FROM public.treasury_accounts a ORDER BY a.created_at,a.name`);
        const glResult = await tx.execute(sql`
          SELECT code,name_ar,balance FROM public.v_accounting_live_balances
          WHERE code IN ('1000','1010','1100') ORDER BY code`);
        const movementResult = await tx.execute(sql`
          SELECT m.id,m.kind,m.from_account_id,m.to_account_id,m.instrument_id,
                 m.amount,m.occurred_at,m.external_reference,m.note,m.evidence_note,m.created_at,
                 fa.name AS from_name,ta.name AS to_name,ca.name AS instrument_name
          FROM public.treasury_movements m
          LEFT JOIN public.treasury_accounts fa ON fa.id=m.from_account_id
          LEFT JOIN public.treasury_accounts ta ON ta.id=m.to_account_id
          LEFT JOIN public.treasury_accounts ca ON ca.id=m.instrument_id
          ORDER BY m.occurred_at DESC,m.created_at DESC LIMIT 60`);
        const gatewayResult = await tx.execute(sql`
          SELECT p.id AS payment_id,p.order_id,o.order_number,p.amount,p.currency,p.method,
                 o.status AS order_status,p.created_at AS payment_created_at
          FROM public.payments p JOIN public.orders o ON o.id=p.order_id
          LEFT JOIN public.treasury_gateway_allocations ga ON ga.payment_id=p.id
          WHERE p.status='completed' AND p.method IN ('wayl','alqaseh')
            AND o.is_test IS DISTINCT FROM true AND o.archived_at IS NULL
            AND ga.payment_id IS NULL
          ORDER BY p.created_at DESC LIMIT 80`);
        const gatewayTotal = await tx.execute(sql`
          SELECT count(*) AS count,COALESCE(sum(p.amount),0) AS total
          FROM public.payments p JOIN public.orders o ON o.id=p.order_id
          LEFT JOIN public.treasury_gateway_allocations ga ON ga.payment_id=p.id
          WHERE p.status='completed' AND p.method IN ('wayl','alqaseh')
            AND o.is_test IS DISTINCT FROM true AND o.archived_at IS NULL
            AND ga.payment_id IS NULL`);
        const fees = await tx.execute(sql`
          SELECT COALESCE(sum(fee_amount),0) AS fee_amount
          FROM public.treasury_gateway_allocations`);
        return {
          accounts: rows(accountResult).map(normalize),
          ledgerReference: rows(glResult).map(normalize),
          movements: rows(movementResult).map(normalize),
          gatewayUnmatched: rows(gatewayResult).map(normalize),
          gatewayUnmatchedCount: Number(rows(gatewayTotal)[0]?.count ?? 0),
          gatewayUnmatchedGross: numberOrNull(rows(gatewayTotal)[0]?.total),
          gatewayFeesRecorded: numberOrNull(rows(fees)[0]?.fee_amount),
          note: "treasury_subledger_not_posted_general_ledger",
        };
      });
      res.json(result);
    } catch (error) { next(error); }
  });

  router.post("/v2/treasury/accounts", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const v = accountInput.parse(req.body);
      if (v.openingAt) checkDate(v.openingAt);
      const db = getDb(); if (!db) throw bad("قاعدة البيانات غير متوفرة",503);
      await assertSchema(db);
      const result = await db.transaction(async tx => {
        if (v.kind === "card") {
          const linked = rows(await tx.execute(sql`
            SELECT id,kind,active FROM public.treasury_accounts WHERE id=${v.linkedAccountId} FOR SHARE`))[0];
          if (!linked || !["bank","wallet"].includes(String(linked.kind)) || linked.active !== true) {
            throw bad("البطاقة لازم ترتبط بحساب بنكي أو محفظة فعالة",409);
          }
        }
        const inserted = rows(await tx.execute(sql`
          INSERT INTO public.treasury_accounts
            (name,kind,linked_account_id,last_four,opening_balance,opening_at,opening_note,created_by,
             opening_confirmed_by,opening_confirmed_at)
          VALUES (${v.name},${v.kind},${v.linkedAccountId ?? null},${v.lastFour ?? null},
                  ${v.openingBalance ?? null},${v.openingAt ?? null}::timestamptz,
                  ${v.openingNote ?? null},${actor(req)},
                  ${v.openingBalance !== undefined ? actor(req) : null},
                  ${v.openingBalance !== undefined ? new Date().toISOString() : null}::timestamptz)
          RETURNING id,name,kind,linked_account_id,opening_balance,opening_at`));
        return inserted[0];
      });
      res.status(201).json(normalize(result ?? {}));
    } catch (error) { next(error); }
  });

  // One-time owner confirmation. Existing posted entries are never backfilled.
  router.post("/v2/treasury/accounts/:id/opening", async (req:Request,res:Response,next:NextFunction) => {
    try {
      const v=openingInput.parse(req.body); checkDate(v.openingAt);
      const db=getDb();if(!db)throw bad("قاعدة البيانات غير متوفرة",503);
      await assertSchema(db);
      const result=await db.transaction(async tx=>{
        const account=rows(await tx.execute(sql`
          SELECT id,kind,opening_balance FROM public.treasury_accounts
          WHERE id=${req.params.id} AND active=true FOR UPDATE`))[0];
        if(!account || account.kind==="card" || account.opening_balance!==null)
          throw bad("الحساب غير مؤهل لتثبيت افتتاحي جديد",409);
        const used=rows(await tx.execute(sql`
          SELECT EXISTS(SELECT 1 FROM public.treasury_movements
            WHERE from_account_id=${req.params.id} OR to_account_id=${req.params.id}) AS used`))[0];
        if(used?.used)throw bad("الحساب عليه حركات، يمنع تغيير نقطة البداية",409);
        return rows(await tx.execute(sql`
          UPDATE public.treasury_accounts SET
            opening_balance=${v.openingBalance},opening_at=${v.openingAt}::timestamptz,
            opening_note=${v.openingNote},opening_confirmed_by=${actor(req)},
            opening_confirmed_at=clock_timestamp()
          WHERE id=${req.params.id} AND opening_balance IS NULL
          RETURNING id,opening_balance,opening_at`))[0];
      });
      res.status(201).json(normalize(result??{}));
    }catch(error){next(error);}
  });

  router.post("/v2/treasury/movements", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const v = movementInput.parse(req.body); checkDate(v.occurredAt);
      if (v.kind === "deposit" && (!v.toAccountId || v.fromAccountId) ||
          v.kind === "withdrawal" && (!v.fromAccountId || v.toAccountId) ||
          v.kind === "transfer" && (!v.fromAccountId || !v.toAccountId)) {
        throw bad("حدد حساب المصدر والوجهة حسب نوع الحركة");
      }
      const db = getDb(); if (!db) throw bad("قاعدة البيانات غير متوفرة",503);
      await assertSchema(db);
      const result = await db.transaction(async tx => {
        const from = v.fromAccountId ? await resolveAccount(tx,v.fromAccountId) : null;
        const to = v.toAccountId ? await resolveAccount(tx,v.toAccountId) : null;
        if (from && to && from.id === to.id) throw bad("التحويل بين بطاقتين لنفس الحساب ليس حركة أموال",409);
        if (from) await guardMovementTime(tx,from,v.occurredAt);
        if (to) await guardMovementTime(tx,to,v.occurredAt);
        const instrument = v.fromAccountId && from && from.id !== v.fromAccountId ? v.fromAccountId
          : v.toAccountId && to && to.id !== v.toAccountId ? v.toAccountId : null;
        const inserted = rows(await tx.execute(sql`
          INSERT INTO public.treasury_movements
            (kind,from_account_id,to_account_id,instrument_id,amount,occurred_at,
             external_reference,note,evidence_note,recorded_by)
          VALUES (${v.kind},${from?.id ?? null},${to?.id ?? null},${instrument},
                  ${v.amount},${v.occurredAt}::timestamptz,${v.reference || null},
                  ${v.note},${v.evidenceNote},${actor(req)})
          RETURNING id,kind,amount,occurred_at`));
        return inserted[0];
      });
      res.status(201).json(normalize(result ?? {}));
    } catch (error) { next(error); }
  });

  router.post("/v2/treasury/reconciliations", async (req: Request,res: Response,next: NextFunction) => {
    try {
      const v=reconciliationInput.parse(req.body); checkDate(v.statementAt);
      const db=getDb(); if(!db) throw bad("قاعدة البيانات غير متوفرة",503);
      await assertSchema(db);
      const result=await db.transaction(async tx => {
        const account=await resolveAccount(tx,v.accountId);
        if (account.id !== v.accountId) throw bad("طابق الحساب الأصلي للبطاقة، مو البطاقة نفسها",409);
        if(Date.parse(v.statementAt) < Date.parse(account.opening_at)) throw bad("تاريخ كشف الحساب أقدم من افتتاحه",409);
        const last=rows(await tx.execute(sql`
          SELECT max(statement_at) AS last_at FROM public.treasury_reconciliations
          WHERE account_id=${account.id}`))[0]?.last_at;
        if(last && Date.parse(v.statementAt) <= Date.parse(String(last))) throw bad("تاريخ المطابقة لازم يكون أحدث من السابقة",409);
        const tracked=await trackedAt(tx,account.id,v.statementAt);
        const difference=Math.round((v.statementBalance-tracked)*100)/100;
        const inserted=rows(await tx.execute(sql`
          INSERT INTO public.treasury_reconciliations
            (account_id,statement_at,statement_balance,tracked_balance,difference,evidence_note,recorded_by)
          VALUES(${account.id},${v.statementAt}::timestamptz,${v.statementBalance},
                 ${tracked},${difference},${v.evidenceNote},${actor(req)})
          RETURNING id,statement_at,statement_balance,tracked_balance,difference`));
        return inserted[0];
      });
      res.status(201).json(normalize(result ?? {}));
    } catch(error){next(error);}
  });

  router.post("/v2/treasury/gateway-settlements", async(req:Request,res:Response,next:NextFunction)=>{
    try{
      const v=gatewayInput.parse(req.body);checkDate(v.occurredAt);
      const db=getDb();if(!db) throw bad("قاعدة البيانات غير متوفرة",503);
      await assertSchema(db);
      const result=await db.transaction(async tx=>{
        const payment=rows(await tx.execute(sql`
          SELECT p.id,p.amount,p.currency,p.method,p.status,o.is_test,o.archived_at
          FROM public.payments p JOIN public.orders o ON o.id=p.order_id
          WHERE p.id=${v.paymentId} FOR UPDATE OF p`))[0];
        if(!payment || payment.status!=="completed" || !["wayl","alqaseh"].includes(String(payment.method))
           || payment.is_test===true || payment.archived_at || payment.currency!=="IQD"){
          throw bad("الدفعة غير مؤهلة للتسوية المالية",409);
        }
        const existing=rows(await tx.execute(sql`
          SELECT payment_id FROM public.treasury_gateway_allocations WHERE payment_id=${v.paymentId}`))[0];
        if(existing) throw bad("هذه الدفعة تمت مطابقتها سابقا ولا يمكن تكرارها",409);
        const account=await resolveAccount(tx,v.toAccountId);
        if(!["bank","wallet"].includes(account.kind)) throw bad("تسوية Wayl تحتاج حساب بنكي أو محفظة",409);
        await guardMovementTime(tx,account,v.occurredAt);
        const gross=numberOrNull(payment.amount);
        if(gross===null || gross<=0 || v.feeAmount>=gross) throw bad("عمولة بوابة الدفع غير صحيحة",409);
        const net=Math.round((gross-v.feeAmount)*100)/100;
        const instrument=account.id===v.toAccountId ? null : v.toAccountId;
        const created=rows(await tx.execute(sql`
          INSERT INTO public.treasury_movements
            (kind,to_account_id,instrument_id,amount,occurred_at,external_reference,note,evidence_note,recorded_by)
          VALUES ('gateway_payout',${account.id},${instrument},${net},
                  ${v.occurredAt}::timestamptz,${v.reference},
                  'تحويل بوابة الدفع المحقق إلى حساب المشروع',${v.evidenceNote},${actor(req)})
          RETURNING id`))[0];
        await tx.execute(sql`
          INSERT INTO public.treasury_gateway_allocations
            (payment_id,movement_id,gross_amount,fee_amount,net_amount)
          VALUES(${v.paymentId},${created.id},${gross},${v.feeAmount},${net})`);
        return { paymentId:v.paymentId,movementId:created.id,gross,fee:v.feeAmount,net };
      });
      res.status(201).json(result);
    }catch(error){next(error);}
  });

  return router;
}
