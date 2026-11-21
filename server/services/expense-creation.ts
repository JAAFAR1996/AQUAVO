import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { ExpenseInput } from "../../shared/accounting.js";
import { expenses, mutationReceipts } from "../../shared/schema.js";
import { getDb } from "../db.js";
import { recordFinancialChange } from "./accountingAuditTrail.js";
import { OperationalError } from "../middleware/error-handler.js";

type Db = NonNullable<ReturnType<typeof getDb>>;

export class ExpenseReplayConflict extends OperationalError {
  constructor() { super("معرف الحفظ مستخدم لمصروف مختلف. حدّث القائمة وراجع المصروف قبل المحاولة.", 409); }
}

export async function createExpenseOnce(
  db: Db,
  input: ExpenseInput,
  actor: { id: string; name: string | null },
  idempotencyKey: string,
): Promise<{ expense: typeof expenses.$inferSelect; replayed: boolean }> {
  const values = {
    category: input.category,
    amount: String(input.amount),
    description: input.description ?? null,
    expenseDate: new Date(input.expenseDate),
    isRecurring: input.isRecurring ?? false,
    recurringPeriod: input.recurringPeriod ?? null,
  };
  const key = createHash("sha256").update(`expense:${actor.id}:${idempotencyKey}`).digest("hex");
  const requestHash = createHash("sha256").update(JSON.stringify(values)).digest("hex");

  return db.transaction(async (tx) => {
    const resourceId = randomUUID();
    const claimed = await tx.insert(mutationReceipts).values({key, requestHash, resourceId})
      .onConflictDoNothing().returning({ key: mutationReceipts.key });
    if (claimed.length === 0) {
      // The conflicting insert waits for the first transaction to commit; a
      // rolled-back attempt leaves no receipt and can be retried safely.
      const [receipt] = await tx.select().from(mutationReceipts).where(eq(mutationReceipts.key, key));
      if (!receipt || receipt.requestHash !== requestHash) throw new ExpenseReplayConflict();
      const [expense] = await tx.select().from(expenses).where(eq(expenses.id, receipt.resourceId));
      if (!expense) throw new ExpenseReplayConflict();
      return {expense, replayed:true};
    }
    const [expense] = await tx.insert(expenses).values({id:resourceId, ...values}).returning();
    if (!expense) throw new Error("Expense insert returned no record");
    await recordFinancialChange(tx, {
      entityType:"expense", entityId:expense.id, action:"create",
      fieldName:null, oldValue:null,
      newValue:{category:input.category,amount:input.amount,description:input.description ?? null,expenseDate:input.expenseDate},
      reason:null,performedBy:actor.id,performedByName:actor.name,
    });
    return {expense,replayed:false};
  });
}
